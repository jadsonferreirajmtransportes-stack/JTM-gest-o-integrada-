-- ============================================================================
-- Permite escolher, ao cadastrar uma Operação, quais das abas genéricas
-- (Visão Geral, Empresas, Equipe, Faturamento, Custos) ela realmente tem —
-- mesmo padrão de "marcar módulos" já usado no cadastro de login. Ausente/
-- vazio = todas ativas (comportamento de hoje, não quebra Farma Aéreo/
-- Rodoviário nem operações já cadastradas antes desta coluna existir).
-- ============================================================================

alter table operacoes add column if not exists secoes_ativas jsonb;
