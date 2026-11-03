-- 094: Sugestões de melhoria (portal do colaborador → gestão).
-- - O colaborador envia a sugestão identificado OU anônimo (ele escolhe).
-- - Anônima: o nome não fica na sugestão. Quem enviou fica só em sugestao_autoria, que
--   nenhum login do sistema consegue ler (só as funções do portal, para a pessoa acompanhar
--   as próprias sugestões).
-- - A gestão analisa, responde e escolhe quais vão para o mural do portal, onde os colegas
--   podem apoiar (👍). Quem apoiou também não aparece para a gestão (só o total).
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists sugestoes (
  id text primary key,
  ano integer not null default extract(year from (now() at time zone 'America/Fortaleza'))::int,
  numero integer,
  titulo text not null,
  descricao text not null,
  categoria text not null default 'Outro',
  beneficio text,                  -- que ganho a pessoa espera
  anonima boolean not null default false,
  colaborador_id text,             -- só quando identificada
  colaborador_nome text,
  setor text,                      -- setor de quem enviou (só quando identificada)
  status text not null default 'recebida', -- recebida | analise | aprovada | implementada | nao_aprovada
  resposta text,                   -- resposta da gestão (o autor vê; no mural, todos)
  nota_interna text,               -- só a gestão vê
  responsavel text,
  no_mural boolean not null default false,
  apoios_total integer not null default 0,
  lida boolean not null default false,
  respondida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists sugestoes_mural_idx on sugestoes (no_mural, criado_em desc);

create or replace function sugestoes__numerar()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtext('sugestoes_' || new.ano));
    select coalesce(max(numero), 0) + 1 into new.numero from sugestoes where ano = new.ano;
  end if;
  return new;
end;
$$;
drop trigger if exists sugestoes_numerar on sugestoes;
create trigger sugestoes_numerar before insert on sugestoes for each row execute function sugestoes__numerar();

-- Quem enviou (todas, inclusive as anônimas) — SEM acesso para os logins do sistema.
create table if not exists sugestao_autoria (
  sugestao_id text primary key references sugestoes(id) on delete cascade,
  colaborador_id text not null
);
create index if not exists sugestao_autoria_colab_idx on sugestao_autoria (colaborador_id);

-- Apoios do mural (quem apoiou também fica fora do alcance da gestão).
create table if not exists sugestao_apoios (
  sugestao_id text not null references sugestoes(id) on delete cascade,
  colaborador_id text not null,
  criado_em timestamptz not null default now(),
  primary key (sugestao_id, colaborador_id)
);

alter table sugestoes enable row level security;
alter table sugestao_autoria enable row level security;
alter table sugestao_apoios enable row level security;
drop policy if exists sugestoes_auth on sugestoes;
create policy sugestoes_auth on sugestoes for all to authenticated using (true) with check (true);
-- sugestao_autoria e sugestao_apoios: sem política nenhuma = ninguém lê nem grava direto.

-- ---------------------------------------------------------------------------
-- Portal (sem login)
-- ---------------------------------------------------------------------------
create or replace function portal_sugestao_enviar(p_token text, p_cpf text, p_nascimento date, p_titulo text, p_descricao text, p_categoria text, p_beneficio text, p_anonima boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_nome text;
  v_setor text;
  v_id text := 'sug-' || replace(gen_random_uuid()::text, '-', '');
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_desc text := btrim(coalesce(p_descricao, ''));
  v_anon boolean := coalesce(p_anonima, false);
  s sugestoes%rowtype;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if length(v_titulo) < 3 or length(v_desc) < 5 then return jsonb_build_object('erro', 'vazia'); end if;
  if length(v_titulo) > 120 or length(v_desc) > 3000 or length(coalesce(p_beneficio, '')) > 1500 then return jsonb_build_object('erro', 'tamanho'); end if;
  if (select count(*) from sugestao_autoria a join sugestoes x on x.id = a.sugestao_id
      where a.colaborador_id = v_colab and x.criado_em > now() - interval '1 day') >= 10 then
    return jsonb_build_object('erro', 'limite');
  end if;
  select nome_completo, setor into v_nome, v_setor from colaboradores where id = v_colab;
  insert into sugestoes (id, titulo, descricao, categoria, beneficio, anonima, colaborador_id, colaborador_nome, setor)
  values (v_id, v_titulo, v_desc, left(coalesce(nullif(btrim(p_categoria), ''), 'Outro'), 60), nullif(btrim(coalesce(p_beneficio, '')), ''),
          v_anon,
          case when v_anon then null else v_colab end,
          case when v_anon then null else v_nome end,
          case when v_anon then null else v_setor end)
  returning * into s;
  insert into sugestao_autoria (sugestao_id, colaborador_id) values (s.id, v_colab);
  return jsonb_build_object('id', s.id, 'protocolo', 'SUG-' || s.ano || '-' || lpad(s.numero::text, 3, '0'));
end;
$$;

-- Minhas sugestões + mural (publicadas pela gestão).
create or replace function portal_sugestoes(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object(
    'minhas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'protocolo', 'SUG-' || s.ano || '-' || lpad(s.numero::text, 3, '0'),
        'titulo', s.titulo,
        'descricao', s.descricao,
        'categoria', s.categoria,
        'anonima', s.anonima,
        'status', s.status,
        'resposta', s.resposta,
        'noMural', s.no_mural,
        'apoios', s.apoios_total,
        'criadoEm', s.criado_em
      ) order by s.criado_em desc)
      from sugestoes s join sugestao_autoria a on a.sugestao_id = s.id
      where a.colaborador_id = v_colab
    ), '[]'::jsonb),
    'mural', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'protocolo', 'SUG-' || s.ano || '-' || lpad(s.numero::text, 3, '0'),
        'titulo', s.titulo,
        'descricao', s.descricao,
        'categoria', s.categoria,
        'status', s.status,
        'resposta', s.resposta,
        'autor', case when s.anonima or s.colaborador_nome is null then null else split_part(initcap(s.colaborador_nome), ' ', 1) end,
        'setor', case when s.anonima then null else s.setor end,
        'apoios', s.apoios_total,
        'apoiei', exists (select 1 from sugestao_apoios p where p.sugestao_id = s.id and p.colaborador_id = v_colab),
        'minha', exists (select 1 from sugestao_autoria a where a.sugestao_id = s.id and a.colaborador_id = v_colab),
        'criadoEm', s.criado_em
      ) order by s.apoios_total desc, s.criado_em desc)
      from sugestoes s where s.no_mural
    ), '[]'::jsonb)
  );
end;
$$;

-- Apoiar / tirar o apoio (só no mural; não vale apoiar a própria).
create or replace function portal_sugestao_apoiar(p_token text, p_cpf text, p_nascimento date, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_total int;
  v_apoiou boolean;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if not exists (select 1 from sugestoes where id = p_id and no_mural) then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  if exists (select 1 from sugestao_autoria where sugestao_id = p_id and colaborador_id = v_colab) then return jsonb_build_object('erro', 'propria'); end if;
  if exists (select 1 from sugestao_apoios where sugestao_id = p_id and colaborador_id = v_colab) then
    delete from sugestao_apoios where sugestao_id = p_id and colaborador_id = v_colab;
    v_apoiou := false;
  else
    insert into sugestao_apoios (sugestao_id, colaborador_id) values (p_id, v_colab);
    v_apoiou := true;
  end if;
  select count(*) into v_total from sugestao_apoios where sugestao_id = p_id;
  update sugestoes set apoios_total = v_total where id = p_id;
  return jsonb_build_object('apoios', v_total, 'apoiei', v_apoiou);
end;
$$;

revoke all on function portal_sugestao_enviar(text, text, date, text, text, text, text, boolean) from public;
revoke all on function portal_sugestoes(text, text, date) from public;
revoke all on function portal_sugestao_apoiar(text, text, date, text) from public;
grant execute on function portal_sugestao_enviar(text, text, date, text, text, text, text, boolean) to anon, authenticated;
grant execute on function portal_sugestoes(text, text, date) to anon, authenticated;
grant execute on function portal_sugestao_apoiar(text, text, date, text) to anon, authenticated;

notify pgrst, 'reload schema';
