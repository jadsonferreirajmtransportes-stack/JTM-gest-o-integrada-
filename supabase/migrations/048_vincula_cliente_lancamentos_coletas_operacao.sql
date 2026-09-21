-- ============================================================================
-- Permite identificar de qual empresa atrelada veio cada lançamento/coleta/tipo de
-- operação diária de uma Operação genérica (ex.: Unimed) — hoje só
-- `lancamentos_faturamento_operacao` tem cliente_id/cliente_nome (migração 042).
-- `coletas_operacao` e `tipos_operacao_diaria` ainda não têm. Sem essas colunas, o Real
-- Conciliado por empresa (usado no ranking "Principais Contratos" da Visão Geral/DRE —
-- ver faturamentoRealPorClienteChave em sectorUtils.ts) nunca batia com nenhuma empresa
-- específica, mesmo a Operação tendo só 1 empresa vinculada. O tipo de operação diária
-- (ex.: "Operação CD") vincula por si só — cada dia marcado herda o cliente do tipo, sem
-- precisar escolher empresa a cada clique no calendário.
--
-- Também faz o backfill: todo lançamento/coleta/tipo já cadastrado da Unimed passa a
-- apontar pro cadastro da Unimed na Carteira de Clientes (hoje é a única empresa
-- atrelada à Operação) — sem isso, o histórico que já populamos (jan-ago/2026)
-- continuaria "solto".
--
-- Idempotente: pode rodar mais de uma vez sem duplicar/alterar nada além do necessário.
-- ============================================================================

alter table coletas_operacao add column if not exists cliente_id text;
alter table coletas_operacao add column if not exists cliente_nome text;
alter table tipos_operacao_diaria add column if not exists cliente_id text;
alter table tipos_operacao_diaria add column if not exists cliente_nome text;

do $$
declare
  v_operacao_id text;
  v_cliente_id text;
  v_cliente_nome text;
  v_lancamentos_atualizados int;
  v_coletas_atualizadas int;
  v_tipos_atualizados int;
begin
  select id into v_operacao_id from operacoes where nome ilike '%unimed%' limit 1;
  if v_operacao_id is null then
    raise notice 'Nenhuma Operação com nome contendo "Unimed" encontrada — nada pra vincular.';
    return;
  end if;

  select id, coalesce(nome_fantasia, razao_social) into v_cliente_id, v_cliente_nome
  from clientes
  where nome_fantasia ilike '%unimed%' or razao_social ilike '%unimed%'
  limit 1;

  if v_cliente_id is null then
    raise notice 'Nenhum cliente com "Unimed" no nome encontrado na Carteira de Clientes — cadastre-o e rode este script de novo.';
    return;
  end if;

  update lancamentos_faturamento_operacao
  set cliente_id = v_cliente_id, cliente_nome = v_cliente_nome, atualizado_em = now()
  where operacao_id = v_operacao_id and cliente_id is null;
  get diagnostics v_lancamentos_atualizados = row_count;

  update coletas_operacao
  set cliente_id = v_cliente_id, cliente_nome = v_cliente_nome
  where operacao_id = v_operacao_id and cliente_id is null;
  get diagnostics v_coletas_atualizadas = row_count;

  update tipos_operacao_diaria
  set cliente_id = v_cliente_id, cliente_nome = v_cliente_nome
  where operacao_id = v_operacao_id and cliente_id is null;
  get diagnostics v_tipos_atualizados = row_count;

  raise notice 'Vinculados ao cliente % (id=%): % lançamento(s), % coleta(s) e % tipo(s) de operação diária.',
    v_cliente_nome, v_cliente_id, v_lancamentos_atualizados, v_coletas_atualizadas, v_tipos_atualizados;
end $$;
