-- 121: Status da entrega vindo do relatório operacional importado (Controle Financeiro / Custos Extras).
-- Reimportar o relatório na hora de fechar a fatura atualiza o status (pendente -> entrega concluída)
-- e os demais campos dos CT-es que já existem.
-- Rodar no dev e na produção ANTES de publicar.

alter table lancamentos_faturamento_aereo add column if not exists status_entrega text;
