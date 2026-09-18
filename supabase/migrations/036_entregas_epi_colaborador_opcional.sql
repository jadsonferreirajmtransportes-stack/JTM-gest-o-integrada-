-- ============================================================================
-- Permite registrar uma Entrega de EPI pra alguém que é colaborador de verdade
-- mas que a empresa optou por NÃO cadastrar no sistema (sem CPF/dados
-- bancários/etc. em Colaboradores) — colaborador_id passa a ser opcional, e o
-- nome digitado fica em recebedor_nome_livre nesse caso. O link de
-- compartilhamento (035_entregas_epi_compartilhadas.sql) continua exigindo um
-- colaborador_id de verdade, por depender do FK pra colaboradores.
-- ============================================================================

alter table entregas_epi alter column colaborador_id drop not null;
alter table entregas_epi add column if not exists recebedor_nome_livre text;
