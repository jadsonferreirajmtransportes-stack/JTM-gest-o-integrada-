-- ============================================================================
-- Controle de Frequência — dia de trabalho da batida (2026-10-05).
-- Para lançar as folhas manuais (motoristas em viagem que vira o dia: entra às
-- 20:15 do dia 01 e sai às 16:20 do dia 02, tudo como jornada do dia 01). A
-- batida guarda em que dia de trabalho ela conta; vazio = o sistema decide
-- pela jornada, como antes.
-- ============================================================================

alter table ponto_registros add column if not exists dia_trabalho date;
