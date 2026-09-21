-- ============================================================================
-- Completa o histórico de 2026 da Unimed (janeiro a junho) na tela de Faturamento
-- da Operação, a partir dos e-mails reais "UNIMED - FATURAMENTO DE [MÊS]" (confirmação
-- de valores por mailson.farias@unimednatal.com.br / thiago.lima@unimednatal.com.br,
-- com as NFs efetivamente emitidas em anexo). Julho/2026 já foi populado na migração 045.
--
-- Cada categoria de cada mês entra como 1 lançamento (mesmo padrão de NF separada por
-- categoria que a própria Unimed usa) — o rateio por tipo de dia/faixa de volume só é
-- usado a partir de agosto/2026 em diante, quando o dia a dia passa a ser registrado
-- direto na tela (Acompanhamento Operacional). Os valores batem com o "Total" que a
-- própria Unimed confirmou em cada e-mail:
--   Jan: R$ 26.500,00 | Fev: R$ 24.000,00 | Mar: R$ 28.690,00
--   Abr: R$ 32.900,00 | Mai: R$ 25.280,00 | Jun: R$ 26.140,00
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

  insert into lancamentos_faturamento_operacao (id, operacao_id, periodo, valor, descricao, criado_em)
  values
    -- Janeiro/2026 — total R$ 26.500,00
    ('lanc-op-unimed-deposito-jm-2026-01', v_operacao_id, '2026-01', 800.00,
      'Depósito JM — conciliado com a Unimed (e-mail de faturamento de janeiro/2026).', now()),
    ('lanc-op-unimed-interior-2026-01', v_operacao_id, '2026-01', 1550.00,
      'Operação Interior — conciliado com a Unimed (e-mail de faturamento de janeiro/2026).', now()),
    ('lanc-op-unimed-transp-estante-csu-2026-01', v_operacao_id, '2026-01', 200.00,
      'Operação do transporte (caminhão) da estante do CSU para o CD — conciliado com a Unimed (e-mail de janeiro/2026).', now()),
    ('lanc-op-unimed-cd-2026-01', v_operacao_id, '2026-01', 16000.00,
      'Operação CD — 20 dias × R$ 800,00, conciliado com a Unimed (e-mail de faturamento de janeiro/2026).', now()),
    ('lanc-op-unimed-extra-2026-01', v_operacao_id, '2026-01', 8000.00,
      'Operação Extra — 20 dias × R$ 400,00, conciliado com a Unimed (e-mail de faturamento de janeiro/2026).', now()),

    -- Fevereiro/2026 — total R$ 24.000,00
    ('lanc-op-unimed-deposito-jm-2026-02', v_operacao_id, '2026-02', 800.00,
      'Depósito JM — conciliado com a Unimed (e-mail de faturamento de fevereiro/2026).', now()),
    ('lanc-op-unimed-interior-2026-02', v_operacao_id, '2026-02', 1600.00,
      'Operação Interior — conciliado com a Unimed (e-mail de faturamento de fevereiro/2026).', now()),
    ('lanc-op-unimed-cd-2026-02', v_operacao_id, '2026-02', 14400.00,
      'Operação CD — 18 dias × R$ 800,00, conciliado com a Unimed (e-mail de faturamento de fevereiro/2026).', now()),
    ('lanc-op-unimed-extra-2026-02', v_operacao_id, '2026-02', 7200.00,
      'Operação Extra — 18 dias × R$ 400,00, conciliado com a Unimed (e-mail de faturamento de fevereiro/2026).', now()),

    -- Março/2026 — total R$ 28.690,00
    ('lanc-op-unimed-deposito-jm-2026-03', v_operacao_id, '2026-03', 800.00,
      'Depósito JM — conciliado com a Unimed (e-mail de faturamento de março/2026).', now()),
    ('lanc-op-unimed-interior-2026-03', v_operacao_id, '2026-03', 1490.00,
      'Operação Interior — conciliado com a Unimed (e-mail de faturamento de março/2026).', now()),
    ('lanc-op-unimed-cd-2026-03', v_operacao_id, '2026-03', 17600.00,
      'Operação CD — 22 dias × R$ 800,00, conciliado com a Unimed (e-mail de faturamento de março/2026).', now()),
    ('lanc-op-unimed-extra-2026-03', v_operacao_id, '2026-03', 8800.00,
      'Operação Extra — 22 dias × R$ 400,00, conciliado com a Unimed (e-mail de faturamento de março/2026).', now()),

    -- Abril/2026 — total R$ 32.900,00
    ('lanc-op-unimed-deposito-jm-2026-04', v_operacao_id, '2026-04', 800.00,
      'Depósito JM — conciliado com a Unimed (e-mail de faturamento de abril/2026).', now()),
    ('lanc-op-unimed-interior-2026-04', v_operacao_id, '2026-04', 1600.00,
      'Operação Interior — conciliado com a Unimed (e-mail de faturamento de abril/2026).', now()),
    ('lanc-op-unimed-cd-2026-04', v_operacao_id, '2026-04', 16000.00,
      'Operação CD — 20 dias × R$ 800,00, conciliado com a Unimed (e-mail de faturamento de abril/2026).', now()),
    ('lanc-op-unimed-extra-2026-04', v_operacao_id, '2026-04', 8000.00,
      'Operação Extra — 20 dias × R$ 400,00, conciliado com a Unimed (e-mail de faturamento de abril/2026).', now()),
    ('lanc-op-unimed-centro-avancado-mossoro-1-2026-04', v_operacao_id, '2026-04', 2500.00,
      'Operação Novo Centro Avançado Mossoró I (levar materiais do CD/Mossoró) — conciliado com a Unimed (e-mail de abril/2026).', now()),
    ('lanc-op-unimed-centro-avancado-mossoro-2-2026-04', v_operacao_id, '2026-04', 4000.00,
      'Operação Novo Centro Avançado Mossoró II (motorista e dois ajudantes) — conciliado com a Unimed (e-mail de abril/2026).', now()),

    -- Maio/2026 — total R$ 25.280,00
    ('lanc-op-unimed-cd-2026-05', v_operacao_id, '2026-05', 16000.00,
      'Operação CD — 20 dias × R$ 800,00, conciliado com a Unimed (e-mail de faturamento de maio/2026).', now()),
    ('lanc-op-unimed-extra-2026-05', v_operacao_id, '2026-05', 8000.00,
      'Operação Extra — 20 dias × R$ 400,00, conciliado com a Unimed (e-mail de faturamento de maio/2026).', now()),
    ('lanc-op-unimed-interior-2026-05', v_operacao_id, '2026-05', 1280.00,
      'Operação Interior — conciliado com a Unimed (e-mail de faturamento de maio/2026, incluindo coleta de 14/05).', now()),

    -- Junho/2026 — total R$ 26.140,00
    ('lanc-op-unimed-interior-2026-06', v_operacao_id, '2026-06', 2140.00,
      'Operação Interior — conciliado com a Unimed (e-mail de faturamento de junho/2026).', now()),
    ('lanc-op-unimed-cd-2026-06', v_operacao_id, '2026-06', 16000.00,
      'Operação CD — 20 dias × R$ 800,00, conciliado com a Unimed (e-mail de faturamento de junho/2026).', now()),
    ('lanc-op-unimed-extra-2026-06', v_operacao_id, '2026-06', 8000.00,
      'Operação Extra — 20 dias × R$ 400,00, conciliado com a Unimed (e-mail de faturamento de junho/2026).', now())
  on conflict (id) do update set
    operacao_id = excluded.operacao_id,
    periodo = excluded.periodo,
    valor = excluded.valor,
    descricao = excluded.descricao,
    atualizado_em = now();

  raise notice 'Unimed (operacao_id=%): histórico de janeiro a junho/2026 gravado/atualizado (25 lançamentos, total geral R$ 163.510,00).', v_operacao_id;
end $$;
