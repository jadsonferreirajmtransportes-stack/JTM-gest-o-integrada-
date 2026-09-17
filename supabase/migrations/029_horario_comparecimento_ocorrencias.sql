-- Horário de início/fim usado no tipo "Comparecimento" (ex.: consulta médica no meio do
-- expediente) — não é falta o dia todo, então guarda o intervalo de ausência dentro do dia.
alter table ocorrencias add column if not exists hora_inicio text;
alter table ocorrencias add column if not exists hora_fim text;
