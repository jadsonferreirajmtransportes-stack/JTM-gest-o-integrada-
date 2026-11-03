-- 092: Módulo Qualidade (área farmacêutica — RDC 430/2020).
-- Um registro por item, com o tipo:
--   'desvio'       desvios / não conformidades (com CAPA)
--   'excursao'     excursões de temperatura (cadeia fria)
--   'qualificacao' qualificações, calibrações, mapeamentos e licenças (com validade)
--   'fornecedor'   cadastro e qualificação de fornecedores
--   'reclamacao'   reclamações de clientes
--   'auditoria'    auditorias internas/externas (achados viram ações)
-- Os campos de cada tipo ficam em "dados"; as ações CAPA em "acoes"; o histórico em "historico".
-- O colaborador pode relatar uma ocorrência pelo portal (vira um desvio "aberto", origem 'portal').
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists qualidade_registros (
  id text primary key,
  tipo text not null check (tipo in ('desvio', 'excursao', 'qualificacao', 'fornecedor', 'reclamacao', 'auditoria')),
  ano integer not null default extract(year from (now() at time zone 'America/Fortaleza'))::int,
  numero integer,
  titulo text not null default '',
  status text not null default 'aberto',
  data date,                 -- data da ocorrência / realização
  prazo date,                -- prazo de tratamento ou validade
  responsavel text,
  dados jsonb not null default '{}'::jsonb,
  acoes jsonb not null default '[]'::jsonb,      -- [{id, tipo, descricao, responsavel, prazo, status, concluidaEm, evidencia}]
  anexos jsonb not null default '[]'::jsonb,     -- [{bucket, caminho, nome, tipo, tamanho}]
  historico jsonb not null default '[]'::jsonb,  -- [{em, por, texto}]
  origem text not null default 'gestao',         -- 'gestao' | 'portal'
  colaborador_id text,                           -- quem relatou pelo portal
  colaborador_nome text,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists qualidade_registros_tipo_idx on qualidade_registros (tipo, ano, numero);
create index if not exists qualidade_registros_colab_idx on qualidade_registros (colaborador_id);

-- Número sequencial por tipo e ano (DSV-2026-001...), dado pelo banco.
create or replace function qualidade__numerar()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtext('qualidade_' || new.tipo || new.ano));
    select coalesce(max(numero), 0) + 1 into new.numero from qualidade_registros where tipo = new.tipo and ano = new.ano;
  end if;
  return new;
end;
$$;
drop trigger if exists qualidade_registros_numerar on qualidade_registros;
create trigger qualidade_registros_numerar before insert on qualidade_registros for each row execute function qualidade__numerar();

alter table qualidade_registros enable row level security;
drop policy if exists qualidade_registros_auth on qualidade_registros;
create policy qualidade_registros_auth on qualidade_registros for all to authenticated using (true) with check (true);

-- Espaço PRIVADO dos anexos da gestão (certificados, laudos, relatórios, fotos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qualidade', 'qualidade', false, 20971520, null)
on conflict (id) do update set public = false, file_size_limit = 20971520;
drop policy if exists qualidade_bucket_auth_all on storage.objects;
create policy qualidade_bucket_auth_all on storage.objects for all to authenticated
  using (bucket_id = 'qualidade') with check (bucket_id = 'qualidade');

-- ---------------------------------------------------------------------------
-- Portal (sem login): relatar ocorrência e acompanhar as próprias.
-- As fotos vão para o espaço "solicitacoes" (pasta do link), como no Fale com o DP.
-- ---------------------------------------------------------------------------
create or replace function portal_qualidade_relatar(p_token text, p_cpf text, p_nascimento date, p_dados jsonb, p_anexos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_nome text;
  v_id text := 'qld-' || replace(gen_random_uuid()::text, '-', '');
  d jsonb := case when jsonb_typeof(coalesce(p_dados, '{}'::jsonb)) = 'object' then p_dados else '{}'::jsonb end;
  v_desc text := btrim(coalesce(d->>'descricao', ''));
  v_data date;
  v_anexos jsonb;
  r qualidade_registros%rowtype;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if length(v_desc) < 5 then return jsonb_build_object('erro', 'vazia'); end if;
  if length(v_desc) > 3000 then return jsonb_build_object('erro', 'tamanho'); end if;
  if (select count(*) from qualidade_registros where colaborador_id = v_colab and criado_em > now() - interval '1 day') >= 10 then
    return jsonb_build_object('erro', 'limite');
  end if;
  begin
    v_data := nullif(d->>'data', '')::date;
  exception when others then
    v_data := null;
  end;
  select nome_completo into v_nome from colaboradores where id = v_colab;
  select coalesce(jsonb_agg(x || jsonb_build_object('bucket', 'solicitacoes')), '[]'::jsonb) into v_anexos
    from jsonb_array_elements(solicitacao__anexos_validos(p_token, p_anexos)) x;
  insert into qualidade_registros (id, tipo, titulo, status, data, dados, anexos, historico, origem, colaborador_id, colaborador_nome, criado_por)
  values (
    v_id, 'desvio',
    left(coalesce(nullif(btrim(d->>'categoria'), ''), 'Ocorrência') || ' — relatado pelo portal', 160),
    'aberto', coalesce(v_data, (now() at time zone 'America/Fortaleza')::date),
    jsonb_build_object(
      'categoria', left(coalesce(d->>'categoria', ''), 80),
      'cliente', left(coalesce(d->>'cliente', ''), 120),
      'documento', left(coalesce(d->>'documento', ''), 120),
      'local', left(coalesce(d->>'local', ''), 120),
      'descricao', v_desc,
      'acaoImediata', left(coalesce(d->>'acaoImediata', ''), 2000)
    ),
    v_anexos,
    jsonb_build_array(jsonb_build_object('em', now(), 'por', coalesce(v_nome, 'Colaborador'), 'texto', 'Relatado pelo portal do colaborador')),
    'portal', v_colab, v_nome, v_nome
  )
  returning * into r;
  return jsonb_build_object('id', r.id, 'protocolo', 'DSV-' || r.ano || '-' || lpad(r.numero::text, 3, '0'));
end;
$$;

create or replace function portal_qualidade_meus(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object('relatos', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', q.id,
      'protocolo', 'DSV-' || q.ano || '-' || lpad(q.numero::text, 3, '0'),
      'categoria', q.dados->>'categoria',
      'data', q.data,
      'status', q.status,
      'criadoEm', q.criado_em
    ) order by q.criado_em desc)
    from qualidade_registros q where q.colaborador_id = v_colab and q.origem = 'portal'
  ), '[]'::jsonb));
end;
$$;

revoke all on function portal_qualidade_relatar(text, text, date, jsonb, jsonb) from public;
revoke all on function portal_qualidade_meus(text, text, date) from public;
grant execute on function portal_qualidade_relatar(text, text, date, jsonb, jsonb) to anon, authenticated;
grant execute on function portal_qualidade_meus(text, text, date) to anon, authenticated;
