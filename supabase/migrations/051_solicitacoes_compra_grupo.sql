-- ============================================================================
-- Permite pedir mais de um item na mesma solicitação de compra — cada item continua
-- sendo seu próprio registro (status/aprovação independentes), só ganham um grupo_id
-- em comum pra aparecerem juntos na lista quando pedidos na mesma submissão do
-- formulário (interno ou público). Ver types.ts SolicitacaoCompra.grupoId.
-- ============================================================================

alter table solicitacoes_compra add column if not exists grupo_id text;
create index if not exists idx_solicitacoes_compra_grupo on solicitacoes_compra(grupo_id);
