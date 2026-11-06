-- 114: Compras pelo LINK PESSOAL do colaborador (no lugar do link público). A gestão escolhe quem
-- pode pedir compras (compras_solicitantes); essas pessoas veem "Compras" no portal: fazem o
-- pedido (um ou vários itens) e acompanham a situação dos próprios pedidos.
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists compras_solicitantes (
  colaborador_id text primary key references colaboradores(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table compras_solicitantes enable row level security;
drop policy if exists compras_solicitantes_auth on compras_solicitantes;
create policy compras_solicitantes_auth on compras_solicitantes for all to authenticated using (true) with check (true);

alter table solicitacoes_compra add column if not exists colaborador_id text;
create index if not exists idx_solicitacoes_compra_colab on solicitacoes_compra (colaborador_id);

-- Quem está acessando, se puder pedir compras.
create or replace function compras__solicitante(p_token text, p_cpf text, p_nascimento date)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.colaborador_id from compras_solicitantes s where s.colaborador_id = portal__colaborador(p_token, p_cpf, p_nascimento)
$$;
revoke all on function compras__solicitante(text, text, date) from public;

-- Estado: se pode pedir e os próprios pedidos (últimos 120 dias).
create or replace function portal_compras_estado(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_colab text := compras__solicitante(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('permitido', false); end if;
  return jsonb_build_object(
    'permitido', true,
    'nome', (select nome_completo from colaboradores where id = v_colab),
    'pedidos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'grupoId', s.grupo_id, 'item', s.item, 'quantidade', s.quantidade, 'urgencia', s.urgencia,
        'prazo', s.prazo_necessario, 'status', s.status, 'motivoRecusa', s.motivo_recusa, 'criadoEm', s.criado_em
      ) order by s.criado_em desc)
      from solicitacoes_compra s
      where s.colaborador_id = v_colab and s.criado_em > now() - interval '120 days'
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function portal_compras_estado(text, text, date) from public;
grant execute on function portal_compras_estado(text, text, date) to anon, authenticated;

-- Novo pedido (um ou vários itens; vários = mesmo grupo).
create or replace function portal_compras_solicitar(
  p_token text, p_cpf text, p_nascimento date,
  p_itens jsonb, p_setor text, p_justificativa text, p_fornecedor text, p_urgencia text, p_prazo date, p_contato text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := compras__solicitante(p_token, p_cpf, p_nascimento);
  v_nome text;
  v_grupo text;
  v_agora text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
  v_qtd integer;
begin
  if v_colab is null then return jsonb_build_object('erro', 'sem_acesso'); end if;
  if jsonb_typeof(p_itens) <> 'array' then return jsonb_build_object('erro', 'itens'); end if;
  select count(*) into v_qtd from jsonb_array_elements(p_itens) x where btrim(coalesce(x->>'item', '')) <> '';
  if v_qtd = 0 or v_qtd > 30 then return jsonb_build_object('erro', 'itens'); end if;
  select nome_completo into v_nome from colaboradores where id = v_colab;
  v_grupo := case when v_qtd > 1 then 'pedido-' || v_agora else null end;
  insert into solicitacoes_compra (id, grupo_id, item, quantidade, setor, justificativa, valor_estimado, fornecedor_sugerido, urgencia,
    prazo_necessario, solicitante_nome, solicitante_contato, status, colaborador_id, criado_em, atualizado_em)
  select 'compra-' || v_agora || '-' || ord, v_grupo, left(btrim(x->>'item'), 200),
    greatest(coalesce(nullif(x->>'quantidade', '')::numeric, 1), 1), left(nullif(btrim(coalesce(p_setor, '')), ''), 80),
    left(nullif(btrim(coalesce(p_justificativa, '')), ''), 1000), nullif(x->>'valorEstimado', '')::numeric,
    left(nullif(btrim(coalesce(p_fornecedor, '')), ''), 200), case when p_urgencia = 'Urgente' then 'Urgente' else 'Normal' end,
    p_prazo, coalesce(v_nome, 'Colaborador'), left(nullif(btrim(coalesce(p_contato, '')), ''), 60), 'Pendente', v_colab, now(), now()
  from jsonb_array_elements(p_itens) with ordinality as t(x, ord)
  where btrim(coalesce(x->>'item', '')) <> '';
  return jsonb_build_object('ok', true, 'protocolo', 'JMT-COMPRA-' || right(v_agora, 6));
end;
$$;
revoke all on function portal_compras_solicitar(text, text, date, jsonb, text, text, text, text, date, text) from public;
grant execute on function portal_compras_solicitar(text, text, date, jsonb, text, text, text, text, date, text) to anon, authenticated;

notify pgrst, 'reload schema';
