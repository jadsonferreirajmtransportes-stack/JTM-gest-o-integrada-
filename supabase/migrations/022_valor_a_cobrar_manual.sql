-- ============================================================================
-- Permite editar manualmente o "Valor a Cobrar" de um lançamento de
-- Faturamento (Farma Aéreo/Rodoviário) — hoje esse valor é sempre recalculado
-- ao vivo pelo tarifário do cliente (cidade/peso/% Ad Valorem), sem nenhum
-- jeito de corrigir na tela quando o cálculo vem errado (cidade sem tarifa
-- cadastrada, peso ausente etc.).
--
-- valor_a_cobrar_manual, quando preenchido, sobrepõe o cálculo automático
-- pra aquele lançamento específico (ver explicarValorACobrar em
-- faturamentoAereoUtils.ts) — nulo = continua calculando normalmente.
-- ============================================================================

alter table lancamentos_faturamento_aereo add column if not exists valor_a_cobrar_manual numeric;
