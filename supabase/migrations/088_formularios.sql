-- ============================================================================
-- 088 — Formulários (estilo Google Forms) dentro do sistema.
--
-- A gestão cria o formulário (perguntas em jsonb) e escolhe onde ele é respondido:
--  * no portal do colaborador (todos os ativos ou uma lista de colaboradores), uma
--    resposta por colaborador, com "quem ainda não respondeu";
--  * por link externo (sem login), anônimo ou pedindo nome / nome + contato.
-- As respostas ficam em formulario_respostas (respostas: {perguntaId: valor}).
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

create table if not exists formularios (
  id text primary key,
  titulo text not null,
  descricao text,
  perguntas jsonb not null default '[]'::jsonb,       -- [{id, tipo, titulo, ajuda?, obrigatoria, opcoes?, min?, max?}]
  status text not null default 'rascunho',             -- rascunho | aberto | encerrado
  no_portal boolean not null default true,
  destinatarios jsonb,                                  -- null = todos os ativos; senão [colaboradorId]
  link_externo boolean not null default false,
  token_externo text unique,
  identificacao_externa text not null default 'anonimo', -- anonimo | nome | nome_contato
  mensagem_final text,
  encerra_em date,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists formulario_respostas (
  id text primary key,
  formulario_id text not null references formularios(id) on delete cascade,
  origem text not null,                -- portal | externo
  colaborador_id text,
  colaborador_nome text,
  nome_externo text,
  contato_externo text,
  respostas jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_formulario_respostas_form on formulario_respostas(formulario_id, criado_em);
create unique index if not exists idx_formulario_respostas_unica_colab
  on formulario_respostas(formulario_id, colaborador_id) where colaborador_id is not null;

alter table formularios enable row level security;
alter table formulario_respostas enable row level security;
drop policy if exists formularios_auth on formularios;
create policy formularios_auth on formularios for all to authenticated using (true) with check (true);
drop policy if exists formulario_respostas_auth on formulario_respostas;
create policy formulario_respostas_auth on formulario_respostas for all to authenticated using (true) with check (true);

-- Formulário aberto agora? (status aberto e, se tiver data de encerramento, ainda dentro dela)
create or replace function formulario__aberto(f formularios)
returns boolean
language sql
stable
as $
  select f.status = 'aberto' and (f.encerra_em is null or f.encerra_em >= (now() at time zone 'America/Sao_Paulo')::date)
$$;

-- O que o portal/link externo enxerga do formulário (sem dados internos).
create or replace function formulario__publico(f formularios)
returns jsonb
language sql
stable
as $
  select jsonb_build_object(
    'id', f.id,
    'titulo', f.titulo,
    'descricao', f.descricao,
    'perguntas', f.perguntas,
    'identificacao', f.identificacao_externa,
    'mensagemFinal', f.mensagem_final,
    'encerraEm', f.encerra_em,
    'aberto', formulario__aberto(f)
  )
$$;

-- Resposta válida: objeto jsonb de tamanho razoável.
create or replace function formulario__respostas_validas(p jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(coalesce(p, 'null'::jsonb)) = 'object' and length(p::text) <= 60000
$$;

-- ---------------------------------------------------------------------------
-- Portal do colaborador (credenciais do link pessoal)
-- ---------------------------------------------------------------------------
create or replace function portal_formularios(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object('formularios', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id,
      'titulo', f.titulo,
      'descricao', f.descricao,
      'encerraEm', f.encerra_em,
      'aberto', formulario__aberto(f),
      'respondidoEm', (select r.criado_em from formulario_respostas r where r.formulario_id = f.id and r.colaborador_id = v_colab)
    ) order by f.criado_em desc)
    from formularios f
    where f.no_portal and f.status in ('aberto', 'encerrado')
      and (f.destinatarios is null or f.destinatarios ? v_colab)
  ), '[]'::jsonb));
end;
$$;

create or replace function portal_formulario(p_token text, p_cpf text, p_nascimento date, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  f formularios%rowtype;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select * into f from formularios where id = p_id and no_portal and status in ('aberto', 'encerrado')
    and (destinatarios is null or destinatarios ? v_colab);
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  return formulario__publico(f) || jsonb_build_object(
    'respondidoEm', (select r.criado_em from formulario_respostas r where r.formulario_id = f.id and r.colaborador_id = v_colab)
  );
end;
$$;

create or replace function portal_formulario_responder(p_token text, p_cpf text, p_nascimento date, p_id text, p_respostas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  f formularios%rowtype;
  v_nome text;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select * into f from formularios where id = p_id and no_portal and (destinatarios is null or destinatarios ? v_colab);
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  if not formulario__aberto(f) then return jsonb_build_object('erro', 'encerrado'); end if;
  if not formulario__respostas_validas(p_respostas) then return jsonb_build_object('erro', 'invalida'); end if;
  if exists (select 1 from formulario_respostas where formulario_id = f.id and colaborador_id = v_colab) then
    return jsonb_build_object('erro', 'ja_respondido');
  end if;
  select nome_completo into v_nome from colaboradores where id = v_colab;
  insert into formulario_respostas (id, formulario_id, origem, colaborador_id, colaborador_nome, respostas)
  values ('resp-' || replace(gen_random_uuid()::text, '-', ''), f.id, 'portal', v_colab, v_nome, p_respostas);
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Link externo (sem login): só o token do formulário
-- ---------------------------------------------------------------------------
create or replace function formulario_publico(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f formularios%rowtype;
begin
  select * into f from formularios where token_externo = p_token and link_externo and status in ('aberto', 'encerrado');
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  return formulario__publico(f);
end;
$$;

create or replace function formulario_publico_responder(p_token text, p_nome text, p_contato text, p_respostas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f formularios%rowtype;
  v_nome text := left(btrim(coalesce(p_nome, '')), 120);
  v_contato text := left(btrim(coalesce(p_contato, '')), 120);
begin
  select * into f from formularios where token_externo = p_token and link_externo;
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  if not formulario__aberto(f) then return jsonb_build_object('erro', 'encerrado'); end if;
  if not formulario__respostas_validas(p_respostas) then return jsonb_build_object('erro', 'invalida'); end if;
  if f.identificacao_externa in ('nome', 'nome_contato') and length(v_nome) = 0 then return jsonb_build_object('erro', 'nome'); end if;
  if f.identificacao_externa = 'nome_contato' and length(v_contato) = 0 then return jsonb_build_object('erro', 'contato'); end if;
  insert into formulario_respostas (id, formulario_id, origem, nome_externo, contato_externo, respostas)
  values ('resp-' || replace(gen_random_uuid()::text, '-', ''), f.id, 'externo',
          case when f.identificacao_externa = 'anonimo' then null else nullif(v_nome, '') end,
          case when f.identificacao_externa = 'nome_contato' then nullif(v_contato, '') else null end,
          p_respostas);
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function portal_formularios(text, text, date) from public;
revoke all on function portal_formulario(text, text, date, text) from public;
revoke all on function portal_formulario_responder(text, text, date, text, jsonb) from public;
revoke all on function formulario_publico(text) from public;
revoke all on function formulario_publico_responder(text, text, text, jsonb) from public;
grant execute on function portal_formularios(text, text, date) to anon, authenticated;
grant execute on function portal_formulario(text, text, date, text) to anon, authenticated;
grant execute on function portal_formulario_responder(text, text, date, text, jsonb) to anon, authenticated;
grant execute on function formulario_publico(text) to anon, authenticated;
grant execute on function formulario_publico_responder(text, text, text, jsonb) to anon, authenticated;
