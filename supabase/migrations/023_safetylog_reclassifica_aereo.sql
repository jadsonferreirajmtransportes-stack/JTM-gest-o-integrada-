-- ============================================================================
-- Reclassifica pra "Aéreo" TODO o histórico de lançamentos/faturas da
-- SAFETYLOG marcados como "Rodoviário" — pedido explícito do usuário: mesmo
-- vindo com Modal = "RODOVIARIO" na planilha de origem (ex.: relatório
-- "Safy.xlsx" — 31 das 34 linhas vieram assim), esses lançamentos devem
-- contar como operação aérea nos relatórios, indicadores e Controle
-- Financeiro da JMT a partir de agora.
--
-- Isso muda a classificação real desses registros (não é só cosmético) —
-- rodada só porque o usuário confirmou que é esse o resultado esperado.
-- ============================================================================

do $$
declare
  v_lancamentos_atualizados int;
  v_faturas_atualizadas int;
begin
  update lancamentos_faturamento_aereo
  set modal = 'Aéreo'
  where modal ilike '%rodoviari%'
    and (
      cliente_nome ilike '%safetylog%'
      or cliente_id in (
        select id from clientes
        where razao_social ilike '%safetylog%' or nome_fantasia ilike '%safetylog%'
      )
    );
  get diagnostics v_lancamentos_atualizados = row_count;

  update faturas_aereo
  set modal = 'Aéreo'
  where modal ilike '%rodoviari%'
    and (
      cliente_nome ilike '%safetylog%'
      or cliente_id in (
        select id from clientes
        where razao_social ilike '%safetylog%' or nome_fantasia ilike '%safetylog%'
      )
    );
  get diagnostics v_faturas_atualizadas = row_count;

  raise notice 'SAFETYLOG: % lançamento(s) e % fatura(s) reclassificados de Rodoviário pra Aéreo.',
    v_lancamentos_atualizados, v_faturas_atualizadas;
end $$;
