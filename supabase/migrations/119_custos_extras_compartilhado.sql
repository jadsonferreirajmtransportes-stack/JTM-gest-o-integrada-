-- 119: Custos Extras — custo compartilhado entre várias notas (ex.: um dedicado que levou 3 NFs).
-- "notas" guarda cada nota e a parte do valor dela; "rateio" é como o valor foi dividido
-- (igual, peso, valor da NF ou manual). Rodar no dev e na produção ANTES de publicar.

alter table custos_extras add column if not exists notas jsonb;
alter table custos_extras add column if not exists rateio text;

notify pgrst, 'reload schema';
