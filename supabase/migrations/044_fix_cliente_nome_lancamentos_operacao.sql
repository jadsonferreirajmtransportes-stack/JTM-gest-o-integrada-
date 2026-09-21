-- ============================================================================
-- Corrige bug: operacoesApi.ts (getLancamentosFaturamentoOperacao/save...) já lê e
-- grava a coluna `cliente_nome` desde a migração 042, mas a tabela nunca ganhou essa
-- coluna — qualquer tentativa de salvar um Lançamento de Faturamento por Operação
-- (aba Faturamento de uma Operação genérica, ex.: Unimed) falhava com erro do
-- PostgREST ("column cliente_nome does not exist"). O formulário da tela ainda não
-- coleta um cliente vinculado ao lançamento, então a coluna fica nula por enquanto —
-- só destrava o salvamento, sem mudar nenhum dado existente.
-- ============================================================================

alter table lancamentos_faturamento_operacao add column if not exists cliente_nome text;
