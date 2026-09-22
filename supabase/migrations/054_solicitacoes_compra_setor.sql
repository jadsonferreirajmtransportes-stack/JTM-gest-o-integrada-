-- ============================================================================
-- Atrela cada solicitação de compra a um setor/destino da empresa — texto
-- livre (não uma lista fixa), só pra distinguir pra onde a compra está
-- indo (ex.: "Departamento Pessoal", "Manutenção", "Farma Aéreo"). Opcional:
-- pedidos já existentes continuam sem setor definido, sem quebrar nada.
-- ============================================================================

alter table solicitacoes_compra add column if not exists setor text;
