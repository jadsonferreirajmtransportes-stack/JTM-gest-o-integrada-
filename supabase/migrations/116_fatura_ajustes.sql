-- 116: Controle Financeiro — acréscimos e descontos na FATURA, sem mexer nas linhas dos CT-es
-- (ex.: desconto negociado, taxa avulsa, diferença de tarifa). Lista [{id, descricao, valor}],
-- valor positivo acrescenta e negativo desconta; entra no total, no valor em aberto e no Excel.
-- Rodar no dev e na produção ANTES de publicar.

alter table faturas_aereo add column if not exists ajustes jsonb;

notify pgrst, 'reload schema';
