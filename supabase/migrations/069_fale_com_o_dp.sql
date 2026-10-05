-- ============================================================================
-- "Fale com o DP" (2026-10-05): o colaborador abre solicitações pelo link único
-- (portal) e conversa com o DP. Decisões do usuário:
--   - tipos: contestação (ponto, VA, contracheque...), pedido de férias,
--     documentos/declarações, atualização de cadastro e outros assuntos;
--   - só o DP responde (seção própria no DP; supervisor não vê);
--   - anexos (foto/PDF) num espaço PRIVADO; só o DP abre;
--   - resposta aparece no portal e o DP avisa pelo WhatsApp com o link pessoal.
--
-- Segurança: anon não lê as tabelas; o portal só passa pelas funções abaixo, que
-- conferem o link + CPF + nascimento (ou o celular lembrado — portal__colaborador,
-- 061/067) e só mostram as solicitações da própria pessoa. O colaborador envia
-- arquivo só para a pasta do próprio link (<token>/...) e não consegue ler nada
-- do espaço "solicitacoes".
-- ============================================================================

create table if not exists solicitacoes_dp (
  id text primary key,
  numero integer not null,
  ano integer not null,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  colaborador_nome text not null,
  tipo text not null,          -- 'contestacao' | 'ferias' | 'documento' | 'cadastro' | 'outros'
  assunto text not null,       -- subtipo escolhido (ex.: 'Vale-alimentação', 'Declaração de vínculo')
  dados jsonb not null default '{}'::jsonb, -- campos do tipo (ex.: férias: mês/início/dias/vender 10 dias)
  status text not null default 'aberta', -- 'aberta' | 'em_analise' | 'respondida' | 'concluida' | 'recusada'
  lida_pelo_dp boolean not null default false,
  lida_pelo_colaborador boolean not null default true,
  atendente text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (ano, numero)
);
create index if not exists idx_solicitacoes_dp_colaborador on solicitacoes_dp(colaborador_id, criado_em desc);
create index if not exists idx_solicitacoes_dp_status on solicitacoes_dp(status, atualizado_em desc);

create table if not exists solicitacao_mensagens (
  id text primary key,
  solicitacao_id text not null references solicitacoes_dp(id) on delete cascade,
  autor text not null,         -- 'colaborador' | 'dp'
  autor_nome text,
  texto text not null default '',
  anexos jsonb not null default '[]'::jsonb, -- [{caminho, nome, tipo, tamanho, url?}]
  criado_em timestamptz not null default now()
);
create index if not exists idx_solicitacao_mensagens_solicitacao on solicitacao_mensagens(solicitacao_id, criado_em);

alter table solicitacoes_dp enable row level security;
alter table solicitacao_mensagens enable row level security;
drop policy if exists solicitacoes_dp_auth on solicitacoes_dp;
create policy solicitacoes_dp_auth on solicitacoes_dp for all to authenticated using (true) with check (true);
drop policy if exists solicitacao_mensagens_auth on solicitacao_mensagens;
create policy solicitacao_mensagens_auth on solicitacao_mensagens for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Espaço PRIVADO dos anexos ("solicitacoes"): o colaborador (anon) só envia para
-- a pasta do próprio link; só quem está logado no sistema lê.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('solicitacoes', 'solicitacoes', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = excluded.allowed_mime_types;

create or replace function solicitacao__link_valido(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from portal_colaborador where token = p_token and not revogado)
$$;
revoke all on function solicitacao__link_valido(text) from public;
grant execute on function solicitacao__link_valido(text) to anon, authenticated;

drop policy if exists solicitacoes_bucket_anon_insert on storage.objects;
create policy solicitacoes_bucket_anon_insert on storage.objects for insert to anon
  with check (bucket_id = 'solicitacoes' and solicitacao__link_valido((storage.foldername(name))[1]));
drop policy if exists solicitacoes_bucket_auth_all on storage.objects;
create policy solicitacoes_bucket_auth_all on storage.objects for all to authenticated
  using (bucket_id = 'solicitacoes') with check (bucket_id = 'solicitacoes');

-- ---------------------------------------------------------------------------
-- Funções do portal (sem login)
-- ---------------------------------------------------------------------------

-- Anexos enviados pelo colaborador: só da pasta do próprio link, no máximo 3.
create or replace function solicitacao__anexos_validos(p_token text, p_anexos jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v jsonb := coalesce(p_anexos, '[]'::jsonb);
  a jsonb;
  saida jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(v) <> 'array' then return '[]'::jsonb; end if;
  for a in select * from jsonb_array_elements(v) loop
    exit when jsonb_array_length(saida) >= 3;
    if coalesce(a->>'caminho', '') like p_token || '/%' then
      saida := saida || jsonb_build_array(jsonb_build_object(
        'caminho', a->>'caminho',
        'nome', left(coalesce(a->>'nome', 'arquivo'), 120),
        'tipo', left(coalesce(a->>'tipo', ''), 60),
        'tamanho', case when coalesce(a->>'tamanho', '') ~ '^[0-9]{1,12}$' then (a->>'tamanho')::bigint else 0 end));
    end if;
  end loop;
  return saida;
end;
$$;

-- Lista das solicitações da pessoa (mais recentes primeiro).
create or replace function portal_solicitacoes(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object('solicitacoes', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'protocolo', s.ano || '-' || lpad(s.numero::text, 4, '0'),
      'tipo', s.tipo,
      'assunto', s.assunto,
      'status', s.status,
      'novaResposta', not s.lida_pelo_colaborador,
      'criadoEm', s.criado_em,
      'atualizadoEm', s.atualizado_em
    ) order by s.atualizado_em desc)
    from solicitacoes_dp s where s.colaborador_id = v_colab
  ), '[]'::jsonb));
end;
$$;

-- Uma solicitação com as mensagens (marca a resposta como vista).
create or replace function portal_solicitacao(p_token text, p_cpf text, p_nascimento date, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  s solicitacoes_dp%rowtype;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select * into s from solicitacoes_dp where id = p_id and colaborador_id = v_colab;
  if not found then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  update solicitacoes_dp set lida_pelo_colaborador = true where id = s.id and not lida_pelo_colaborador;
  return jsonb_build_object(
    'id', s.id,
    'protocolo', s.ano || '-' || lpad(s.numero::text, 4, '0'),
    'tipo', s.tipo,
    'assunto', s.assunto,
    'dados', s.dados,
    'status', s.status,
    'criadoEm', s.criado_em,
    'mensagens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'autor', m.autor,
        'autorNome', case when m.autor = 'dp' then 'Departamento Pessoal' else m.autor_nome end,
        'texto', m.texto,
        -- Do colaborador: só nome do arquivo (o espaço é privado). Do DP: com o link para baixar.
        'anexos', case when m.autor = 'dp' then m.anexos
                       else coalesce((select jsonb_agg(x - 'caminho') from jsonb_array_elements(m.anexos) x), '[]'::jsonb) end,
        'criadoEm', m.criado_em
      ) order by m.criado_em)
      from solicitacao_mensagens m where m.solicitacao_id = s.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Abre uma solicitação nova. Limites: texto até 3000 caracteres, até 10 em aberto.
create or replace function portal_solicitacao_abrir(p_token text, p_cpf text, p_nascimento date, p_tipo text, p_assunto text, p_dados jsonb, p_texto text, p_anexos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_nome text;
  v_ano int := extract(year from (now() at time zone 'America/Fortaleza'))::int;
  v_numero int;
  v_id text := 'sol-' || replace(gen_random_uuid()::text, '-', '');
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if p_tipo not in ('contestacao', 'ferias', 'documento', 'cadastro', 'outros') then return jsonb_build_object('erro', 'tipo'); end if;
  if length(v_texto) > 3000 then return jsonb_build_object('erro', 'tamanho'); end if;
  if (select count(*) from solicitacoes_dp where colaborador_id = v_colab and status in ('aberta', 'em_analise', 'respondida')) >= 10 then
    return jsonb_build_object('erro', 'limite');
  end if;
  select nome_completo into v_nome from colaboradores where id = v_colab;
  lock table solicitacoes_dp in share row exclusive mode;
  select coalesce(max(numero), 0) + 1 into v_numero from solicitacoes_dp where ano = v_ano;
  insert into solicitacoes_dp (id, numero, ano, colaborador_id, colaborador_nome, tipo, assunto, dados, status, lida_pelo_dp, lida_pelo_colaborador)
  values (v_id, v_numero, v_ano, v_colab, v_nome, p_tipo, left(coalesce(nullif(btrim(p_assunto), ''), 'Outros assuntos'), 120),
          case when jsonb_typeof(coalesce(p_dados, '{}'::jsonb)) = 'object' then coalesce(p_dados, '{}'::jsonb) else '{}'::jsonb end,
          'aberta', false, true);
  insert into solicitacao_mensagens (id, solicitacao_id, autor, autor_nome, texto, anexos)
  values ('msg-' || replace(gen_random_uuid()::text, '-', ''), v_id, 'colaborador', v_nome, v_texto, solicitacao__anexos_validos(p_token, p_anexos));
  return jsonb_build_object('id', v_id, 'protocolo', v_ano || '-' || lpad(v_numero::text, 4, '0'));
end;
$$;

-- Responde dentro de uma solicitação (não vale para concluída/recusada — abra outra).
create or replace function portal_solicitacao_responder(p_token text, p_cpf text, p_nascimento date, p_id text, p_texto text, p_anexos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  s solicitacoes_dp%rowtype;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_anexos jsonb;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select * into s from solicitacoes_dp where id = p_id and colaborador_id = v_colab;
  if not found then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  if s.status in ('concluida', 'recusada') then return jsonb_build_object('erro', 'encerrada'); end if;
  v_anexos := solicitacao__anexos_validos(p_token, p_anexos);
  if length(v_texto) = 0 and jsonb_array_length(v_anexos) = 0 then return jsonb_build_object('erro', 'vazia'); end if;
  if length(v_texto) > 3000 then return jsonb_build_object('erro', 'tamanho'); end if;
  insert into solicitacao_mensagens (id, solicitacao_id, autor, autor_nome, texto, anexos)
  values ('msg-' || replace(gen_random_uuid()::text, '-', ''), s.id, 'colaborador', s.colaborador_nome, v_texto, v_anexos);
  update solicitacoes_dp
    set lida_pelo_dp = false, atualizado_em = now(), status = case when status = 'respondida' then 'aberta' else status end
    where id = s.id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function solicitacao__anexos_validos(text, jsonb) from public;
revoke all on function portal_solicitacoes(text, text, date) from public;
revoke all on function portal_solicitacao(text, text, date, text) from public;
revoke all on function portal_solicitacao_abrir(text, text, date, text, text, jsonb, text, jsonb) from public;
revoke all on function portal_solicitacao_responder(text, text, date, text, text, jsonb) from public;
grant execute on function portal_solicitacoes(text, text, date) to anon, authenticated;
grant execute on function portal_solicitacao(text, text, date, text) to anon, authenticated;
grant execute on function portal_solicitacao_abrir(text, text, date, text, text, jsonb, text, jsonb) to anon, authenticated;
grant execute on function portal_solicitacao_responder(text, text, date, text, text, jsonb) to anon, authenticated;
 then (a->>'tamanho')::bigint else 0 end));
    end if;
  end loop;
  return saida;
end;
$$;

-- Lista das solicitações da pessoa (mais recentes primeiro).
create or replace function portal_solicitacoes(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object('solicitacoes', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'protocolo', s.ano || '-' || lpad(s.numero::text, 4, '0'),
      'tipo', s.tipo,
      'assunto', s.assunto,
      'status', s.status,
      'novaResposta', not s.lida_pelo_colaborador,
      'criadoEm', s.criado_em,
      'atualizadoEm', s.atualizado_em
    ) order by s.atualizado_em desc)
    from solicitacoes_dp s where s.colaborador_id = v_colab
  ), '[]'::jsonb));
end;
$$;

-- Uma solicitação com as mensagens (marca a resposta como vista).
create or replace function portal_solicitacao(p_token text, p_cpf text, p_nascimento date, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  s solicitacoes_dp%rowtype;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select * into s from solicitacoes_dp where id = p_id and colaborador_id = v_colab;
  if not found then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  update solicitacoes_dp set lida_pelo_colaborador = true where id = s.id and not lida_pelo_colaborador;
  return jsonb_build_object(
    'id', s.id,
    'protocolo', s.ano || '-' || lpad(s.numero::text, 4, '0'),
    'tipo', s.tipo,
    'assunto', s.assunto,
    'dados', s.dados,
    'status', s.status,
    'criadoEm', s.criado_em,
    'mensagens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'autor', m.autor,
        'autorNome', case when m.autor = 'dp' then 'Departamento Pessoal' else m.autor_nome end,
        'texto', m.texto,
        -- Do colaborador: só nome do arquivo (o espaço é privado). Do DP: com o link para baixar.
        'anexos', case when m.autor = 'dp' then m.anexos
                       else coalesce((select jsonb_agg(x - 'caminho') from jsonb_array_elements(m.anexos) x), '[]'::jsonb) end,
        'criadoEm', m.criado_em
      ) order by m.criado_em)
      from solicitacao_mensagens m where m.solicitacao_id = s.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Abre uma solicitação nova. Limites: texto até 3000 caracteres, até 10 em aberto.
create or replace function portal_solicitacao_abrir(p_token text, p_cpf text, p_nascimento date, p_tipo text, p_assunto text, p_dados jsonb, p_texto text, p_anexos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_nome text;
  v_ano int := extract(year from (now() at time zone 'America/Fortaleza'))::int;
  v_numero int;
  v_id text := 'sol-' || replace(gen_random_uuid()::text, '-', '');
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if p_tipo not in ('contestacao', 'ferias', 'documento', 'cadastro', 'outros') then return jsonb_build_object('erro', 'tipo'); end if;
  if length(v_texto) > 3000 then return jsonb_build_object('erro', 'tamanho'); end if;
  if (select count(*) from solicitacoes_dp where colaborador_id = v_colab and status in ('aberta', 'em_analise', 'respondida')) >= 10 then
    return jsonb_build_object('erro', 'limite');
  end if;
  select nome_completo into v_nome from colaboradores where id = v_colab;
  lock table solicitacoes_dp in share row exclusive mode;
  select coalesce(max(numero), 0) + 1 into v_numero from solicitacoes_dp where ano = v_ano;
  insert into solicitacoes_dp (id, numero, ano, colaborador_id, colaborador_nome, tipo, assunto, dados, status, lida_pelo_dp, lida_pelo_colaborador)
  values (v_id, v_numero, v_ano, v_colab, v_nome, p_tipo, left(coalesce(nullif(btrim(p_assunto), ''), 'Outros assuntos'), 120),
          case when jsonb_typeof(coalesce(p_dados, '{}'::jsonb)) = 'object' then coalesce(p_dados, '{}'::jsonb) else '{}'::jsonb end,
          'aberta', false, true);
  insert into solicitacao_mensagens (id, solicitacao_id, autor, autor_nome, texto, anexos)
  values ('msg-' || replace(gen_random_uuid()::text, '-', ''), v_id, 'colaborador', v_nome, v_texto, solicitacao__anexos_validos(p_token, p_anexos));
  return jsonb_build_object('id', v_id, 'protocolo', v_ano || '-' || lpad(v_numero::text, 4, '0'));
end;
$$;

-- Responde dentro de uma solicitação (não vale para concluída/recusada — abra outra).
create or replace function portal_solicitacao_responder(p_token text, p_cpf text, p_nascimento date, p_id text, p_texto text, p_anexos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  s solicitacoes_dp%rowtype;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_anexos jsonb;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select * into s from solicitacoes_dp where id = p_id and colaborador_id = v_colab;
  if not found then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  if s.status in ('concluida', 'recusada') then return jsonb_build_object('erro', 'encerrada'); end if;
  v_anexos := solicitacao__anexos_validos(p_token, p_anexos);
  if length(v_texto) = 0 and jsonb_array_length(v_anexos) = 0 then return jsonb_build_object('erro', 'vazia'); end if;
  if length(v_texto) > 3000 then return jsonb_build_object('erro', 'tamanho'); end if;
  insert into solicitacao_mensagens (id, solicitacao_id, autor, autor_nome, texto, anexos)
  values ('msg-' || replace(gen_random_uuid()::text, '-', ''), s.id, 'colaborador', s.colaborador_nome, v_texto, v_anexos);
  update solicitacoes_dp
    set lida_pelo_dp = false, atualizado_em = now(), status = case when status = 'respondida' then 'aberta' else status end
    where id = s.id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function solicitacao__anexos_validos(text, jsonb) from public;
revoke all on function portal_solicitacoes(text, text, date) from public;
revoke all on function portal_solicitacao(text, text, date, text) from public;
revoke all on function portal_solicitacao_abrir(text, text, date, text, text, jsonb, text, jsonb) from public;
revoke all on function portal_solicitacao_responder(text, text, date, text, text, jsonb) from public;
grant execute on function portal_solicitacoes(text, text, date) to anon, authenticated;
grant execute on function portal_solicitacao(text, text, date, text) to anon, authenticated;
grant execute on function portal_solicitacao_abrir(text, text, date, text, text, jsonb, text, jsonb) to anon, authenticated;
grant execute on function portal_solicitacao_responder(text, text, date, text, text, jsonb) to anon, authenticated;
