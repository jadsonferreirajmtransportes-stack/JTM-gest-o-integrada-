-- 118: Controle de Frequência — jornada em escala 12x36 (trabalha um dia, folga o outro,
-- independente do dia da semana). "inicio_escala" é um dia em que a turma trabalha; a outra
-- turma é outra jornada com o dia seguinte. Rodar no dev e na produção ANTES de publicar.

alter table ponto_jornadas add column if not exists escala text not null default 'semanal';
alter table ponto_jornadas add column if not exists inicio_escala date;

notify pgrst, 'reload schema';
