-- ============================================================================
-- Colunas novas em `usuarios` pras permissões granulares (dentro de DP e de
-- Farma Aéreo/Rodoviário) — ver SecaoDp/SecaoOperacoes/supervisorId/
-- escopoApenasProprioSetor em src/types.ts.
--
-- Sem esta migração, salvar essas permissões no formulário (UsuarioFormModal)
-- parecia funcionar (sem erro nenhum), mas nada era gravado de verdade: as
-- colunas não existiam, e usuarioToRow em usuariosApi.ts nunca tentava
-- enviá-las — o próximo carregamento sempre voltava sem restrição nenhuma.
-- ============================================================================

alter table usuarios add column if not exists supervisor_id text;
alter table usuarios add column if not exists secoes_dp_permitidas jsonb;
alter table usuarios add column if not exists escopo_apenas_proprio_setor boolean not null default false;
alter table usuarios add column if not exists secoes_operacoes_permitidas jsonb;
