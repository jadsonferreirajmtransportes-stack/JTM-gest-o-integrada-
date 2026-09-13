-- ============================================================================
-- Coluna de papel/permissão (role) em usuarios — necessária pro convite por
-- e-mail (Edge Function convidar-usuario): só quem tiver role = 'admin' pode
-- convidar gente nova. É verificada no SERVIDOR (a função usa a service_role,
-- que só existe lá — nunca no navegador), então é uma checagem de verdade,
-- diferente do seletor de "papel" que já existe hoje na tela (esse é só uma
-- troca de visual, sem checagem nenhuma por trás).
--
-- Todo mundo nasce 'colaborador' por padrão — depois de rodar esta migração,
-- promova manualmente quem já é administrador de fato, por exemplo:
--   update usuarios set role = 'admin' where login = 'jadson.ferreira';
-- ============================================================================

alter table usuarios add column if not exists role text not null default 'colaborador';
