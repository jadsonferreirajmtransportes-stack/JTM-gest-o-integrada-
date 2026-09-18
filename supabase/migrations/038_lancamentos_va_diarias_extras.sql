-- ============================================================================
-- Permite somar diárias extras manualmente num lançamento de Vale Alimentação
-- (ex.: dia trabalhado num sábado/feriado, correção pontual) — diferente de
-- faltas/dias_ferias, esse valor nunca é recalculado automaticamente por
-- "Gerar Lançamentos" nem "Sincronizar", só editado direto na tela.
-- ============================================================================

alter table lancamentos_va add column if not exists diarias_extras numeric;
