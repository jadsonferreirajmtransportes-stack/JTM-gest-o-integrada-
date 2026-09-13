-- ============================================================================
-- Agenda da Gestão — visibilidade por usuário.
-- Até aqui, todo login com acesso ao módulo "Agenda da Gestão" via
-- modulosPermitidos enxergava TODAS as atividades, de todo mundo. Essas duas
-- colunas novas permitem restringir: quem criou a atividade sempre vê a
-- própria, e quem for marcado/mencionado nela também passa a ver — os demais
-- (exceto admin, que sempre vê tudo) não. Ver src/components/Agenda/agendaUtils.ts
-- (função podeVerAtividade) para a regra completa.
-- ============================================================================

alter table atividades_gestao add column if not exists criado_por_user_id text;
alter table atividades_gestao add column if not exists usuarios_marcados_ids jsonb not null default '[]';
