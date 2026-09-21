-- ============================================================================
-- Popula as 21 coletas reais de agosto/2026 da Operação Interior (Unimed) no
-- Acompanhamento Operacional, a partir do arquivo real "PLANILHA CUSTO - UNIMED INT
-- (AGOSTO.26).xlsx" — primeiro mês registrado coleta a coleta em vez de lançamento único
-- por mês (ver migrações 045/046 para julho e para trás).
--
-- ATENÇÃO — divergência encontrada na planilha original: a célula "VALOR TOTAL" da
-- planilha mostra R$ 710,00, mas esse valor está ERRADO. 8 das 21 linhas têm o custo
-- digitado como TEXTO (ex.: "R$ 120,00") em vez de número — a fórmula SOMA do Excel
-- ignora silenciosamente células de texto, então essas 8 linhas (R$ 640,00 no total)
-- nunca entraram na soma exibida. Cada valor individual bate certinho com a tabela de
-- faixas (01-03 vol=R$50, 04-06 vol=R$80, acima de 06=R$120) — o problema é só de TIPO
-- de dado na célula, não de valor errado. O total real de agosto é R$ 1.350,00 (21
-- coletas), não R$ 710,00. Os valores abaixo já usam o total correto.
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

  insert into coletas_operacao (id, operacao_id, data, destinatario, cidade, quantidade_volumes, numero_documento, valor, observacao, criado_em)
  values
    ('coleta-unimed-2026-08-01', v_operacao_id, '2026-08-03', 'CENTRO AVAÇADO', 'MOSSORÓ', 3, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-02', v_operacao_id, '2026-08-06', 'CENTRAL DE ATENDIMENTO', 'MOSSORÓ', 5, 'N/A', 80.00, null, now()),
    ('coleta-unimed-2026-08-03', v_operacao_id, '2026-08-06', 'CENTRAL DE ATENDIMENTO', 'MOSSORÓ', 2, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-04', v_operacao_id, '2026-08-06', 'CENTRAL DE ATENDIMENTO', 'CAICÓ', 2, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-05', v_operacao_id, '2026-08-06', 'CENTRAL DE ATENDIMENTO', 'PAU DOS FERROS', 2, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-06', v_operacao_id, '2026-08-07', 'CENTRO AVAÇADO', 'MOSSORÓ', 19, 'N/A', 120.00,
      'Valor corrigido: célula original vinha como texto "R$ 120,00" e não entrava na soma da planilha.', now()),
    ('coleta-unimed-2026-08-07', v_operacao_id, '2026-08-10', 'CENTRO AVAÇADO', 'MOSSORÓ', 3, 'N/A', 50.00,
      'Valor corrigido: célula original vinha como texto "R$ 50,00" e não entrava na soma da planilha.', now()),
    ('coleta-unimed-2026-08-08', v_operacao_id, '2026-08-13', 'CENTRO AVAÇADO', 'MOSSORÓ', 7, 'N/A', 120.00,
      'Valor corrigido: célula original vinha como texto "R$ 120,00" e não entrava na soma da planilha.', now()),
    ('coleta-unimed-2026-08-09', v_operacao_id, '2026-08-13', 'CENTRAL DE ATENDIMENTO', 'MOSSORÓ', 1, 'N/A', 50.00,
      'Valor corrigido: célula original vinha como texto "R$ 50,00" e não entrava na soma da planilha.', now()),
    ('coleta-unimed-2026-08-10', v_operacao_id, '2026-08-13', 'CENTRAL DE ATENDIMENTO', 'PAU DOS FERROS', 1, 'N/A', 50.00,
      'Valor corrigido: célula original vinha como texto "R$ 50,00" e não entrava na soma da planilha.', now()),
    ('coleta-unimed-2026-08-11', v_operacao_id, '2026-08-13', 'CENTRAL DE ATENDIMENTO', 'CAICÓ', 4, 'N/A', 80.00,
      'Valor corrigido: célula original vinha como texto "R$ 80,00" e não entrava na soma da planilha.', now()),
    ('coleta-unimed-2026-08-12', v_operacao_id, '2026-08-13', 'CENTRAL DE ATENDIMENTO', 'CURRAIS NOVOS', 2, 'N/A', 50.00,
      'Valor corrigido: célula original vinha como texto "R$ 50,00" e não entrava na soma da planilha.', now()),
    ('coleta-unimed-2026-08-13', v_operacao_id, '2026-08-20', 'CENTRO AVAÇADO', 'MOSSORÓ', 7, 'N/A', 120.00,
      'Valor corrigido: célula original vinha como texto "R$ 120,00" e não entrava na soma da planilha.', now()),
    ('coleta-unimed-2026-08-14', v_operacao_id, '2026-08-20', 'CENTRAL DE ATENDIMENTO', 'MOSSORÓ', 1, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-15', v_operacao_id, '2026-08-20', 'CENTRAL DE ATENDIMENTO', 'CAICÓ', 2, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-16', v_operacao_id, '2026-08-20', 'CENTRAL DE ATENDIMENTO', 'PAU DOS FERROS', 1, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-17', v_operacao_id, '2026-08-20', 'CENTRAL DE ATENDIMENTO', 'CURRAIS NOVOS', 1, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-18', v_operacao_id, '2026-08-24', 'CENTRO AVAÇADO', 'MOSSORÓ', 3, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-19', v_operacao_id, '2026-08-27', 'CENTRAL DE ATENDIMENTO', 'CAICÓ', 5, 'N/A', 80.00, null, now()),
    ('coleta-unimed-2026-08-20', v_operacao_id, '2026-08-27', 'CENTRAL DE ATENDIMENTO', 'PAU DOS FERROS', 2, 'N/A', 50.00, null, now()),
    ('coleta-unimed-2026-08-21', v_operacao_id, '2026-08-27', 'CENTRO AVAÇADO', 'MOSSORÓ', 3, 'N/A', 50.00, null, now())
  on conflict (id) do update set
    operacao_id = excluded.operacao_id,
    data = excluded.data,
    destinatario = excluded.destinatario,
    cidade = excluded.cidade,
    quantidade_volumes = excluded.quantidade_volumes,
    numero_documento = excluded.numero_documento,
    valor = excluded.valor,
    observacao = excluded.observacao;

  raise notice 'Unimed (operacao_id=%): 21 coletas de agosto/2026 gravadas/atualizadas (total real R$ 1.350,00 — planilha original mostrava R$ 710,00 por erro de digitação).', v_operacao_id;
end $$;
