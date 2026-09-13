-- ============================================================================
-- Estende a visibilidade por usuário (mesmo raciocínio já aplicado na Agenda
-- da Gestão, migração 011) pra Projetos Gerenciais, Notas & Ideias e
-- Instruções de Trabalho: liberar o módulo pra um login não dá mais visão de
-- tudo — só quem criou o registro e quem for marcado nele. Ver
-- src/utils/visibilidadeUtils.ts para a regra completa (admin sempre vê tudo;
-- compatibilidade com registros antigos via nome em campo de texto livre).
-- ============================================================================

alter table projetos_gerenciais add column if not exists criado_por_user_id text;
alter table projetos_gerenciais add column if not exists usuarios_marcados_ids jsonb not null default '[]';

alter table notas_paginas add column if not exists criado_por_user_id text;
alter table notas_paginas add column if not exists usuarios_marcados_ids jsonb not null default '[]';

alter table instrucoes_trabalho add column if not exists criado_por_user_id text;
alter table instrucoes_trabalho add column if not exists usuarios_marcados_ids jsonb not null default '[]';
