-- 096: Qualidade — escolher quais colaboradores podem "Relatar ocorrência" no portal.
-- qualidade_config (uma linha): acesso 'todos' (padrão) ou 'escolhidos' + a lista.
-- Quem não tem acesso não vê a área no portal e o banco recusa o envio.
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists qualidade_config (
  id integer primary key default 1 check (id = 1),
  relato_acesso text not null default 'todos' check (relato_acesso in ('todos', 'escolhidos')),
  relato_colaboradores text[] not null default '{}',
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);
insert into qualidade_config (id) values (1) on conflict (id) do nothing;
alter table qualidade_config enable row level security;
drop policy if exists qualidade_config_auth on qualidade_config;
create policy qualidade_config_auth on qualidade_config for all to authenticated using (true) with check (true);

create or replace function qualidade__pode_relatar(p_colab text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select relato_acesso = 'todos' or p_colab = any(relato_colaboradores) from qualidade_config where id = 1), true)
$$;
revoke all on function qualidade__pode_relatar(text) from public;

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
  if not qualidade__pode_relatar(v_colab) then return jsonb_build_object('erro', 'sem_acesso'); end if;
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
  return jsonb_build_object('permitido', qualidade__pode_relatar(v_colab), 'relatos', coalesce((
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


notify pgrst, 'reload schema';
