-- ============================================================================
-- Adiciona a coluna `modal` em faturas_aereo — faltava (lancamentos_faturamento_aereo
-- já tinha desde o início). Necessária pro Controle Financeiro do Farma Rodoviário
-- (Ad Valorem sobre NF) separar suas faturas das do Farma Aéreo, já que as duas telas
-- compartilham a mesma tabela.
-- ============================================================================
alter table faturas_aereo add column if not exists modal text;
