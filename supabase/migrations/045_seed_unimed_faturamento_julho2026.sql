-- ============================================================================
-- Popula o Acompanhamento Operacional e o Faturamento Real da Operação Unimed com
-- julho/2026, a partir do e-mail real "UNIMED - FATURAMENTO DE JULHO" (confirmação
-- de mailson.farias@unimednatal.com.br) e da planilha real "JM - julho2026.xlsx"
-- (Operação Interior):
--   1) Operação Interior: R$ 2.090,00 (soma das coletas do mês, tabela por volume)
--   2) Operação CD:       23 dias × R$ 800,00 = R$ 18.400,00
--   3) Operação Extra:    23 dias × R$ 400,00 = R$ 9.200,00
--
-- Como não temos os PDFs/planilha completa em mãos aqui pra lançar coleta a coleta
-- ou dia a dia, julho entra como 3 lançamentos de faturamento já conciliados (o que
-- já basta pra Visão Geral/DRE). Além disso, deixa configurados os tipos de operação
-- diária (CD/Extra) e a tabela de faixas de volume (Interior) pra que agosto em
-- diante possa ser registrado dia a dia / coleta a coleta na própria tela.
--
-- Idempotente: pode rodar mais de uma vez sem duplicar (ids fixos + upsert).
-- ============================================================================

do $$
declare
  v_operacao_id text;
begin
  select id into v_operacao_id from operacoes where nome ilike '%unimed%' limit 1;

  if v_operacao_id is null then
    raise exception 'Nenhuma Operação com nome contendo "Unimed" encontrada em operacoes — cadastre-a em Configurações > Operações antes de rodar este script.';
  end if;

  -- 1) Tipos de operação diária (CD / Extra)
  insert into tipos_operacao_diaria (id, operacao_id, nome, valor_diario, ativo, ordem)
  values
    ('tipo-op-unimed-cd', v_operacao_id, 'Operação CD', 800.00, true, 1),
    ('tipo-op-unimed-extra', v_operacao_id, 'Operação Extra', 400.00, true, 2)
  on conflict (id) do update set
    operacao_id = excluded.operacao_id,
    nome = excluded.nome,
    valor_diario = excluded.valor_diario,
    ativo = excluded.ativo,
    ordem = excluded.ordem;

  -- 2) Tabela de faixas de volume (Interior) — 01-03/04-06/acima de 06 volumes
  insert into faixas_volume_operacao (id, operacao_id, volume_min, volume_max, valor, ordem)
  values
    ('faixa-op-unimed-1-3', v_operacao_id, 1, 3, 50.00, 1),
    ('faixa-op-unimed-4-6', v_operacao_id, 4, 6, 80.00, 2),
    ('faixa-op-unimed-acima-6', v_operacao_id, 7, null, 120.00, 3)
  on conflict (id) do update set
    operacao_id = excluded.operacao_id,
    volume_min = excluded.volume_min,
    volume_max = excluded.volume_max,
    valor = excluded.valor,
    ordem = excluded.ordem;

  -- 3) Lançamentos de faturamento real de julho/2026 (já conciliados com a Unimed)
  insert into lancamentos_faturamento_operacao (id, operacao_id, periodo, valor, descricao, criado_em)
  values
    ('lanc-op-unimed-interior-2026-07', v_operacao_id, '2026-07', 2090.00,
      'Operação Interior — conciliado com a Unimed (e-mail de faturamento de julho/2026 + planilha JM - julho2026.xlsx, tabela por faixa de volume).', now()),
    ('lanc-op-unimed-cd-2026-07', v_operacao_id, '2026-07', 18400.00,
      'Operação CD — 23 dias × R$ 800,00, conciliado com a Unimed (e-mail de faturamento de julho/2026).', now()),
    ('lanc-op-unimed-extra-2026-07', v_operacao_id, '2026-07', 9200.00,
      'Operação Extra — 23 dias × R$ 400,00, conciliado com a Unimed (e-mail de faturamento de julho/2026).', now())
  on conflict (id) do update set
    operacao_id = excluded.operacao_id,
    periodo = excluded.periodo,
    valor = excluded.valor,
    descricao = excluded.descricao,
    atualizado_em = now();

  raise notice 'Unimed (operacao_id=%): tipos diários, faixas de volume e 3 lançamentos de julho/2026 (total R$ 29.690,00) gravados/atualizados.', v_operacao_id;
end $$;
