-- ============================================================================
-- Envio automático de lembrete por e-mail (Agenda de Gestão + Projetos
-- Gerenciais), 1 dia antes e no dia do compromisso/prazo — ver Edge Function
-- `lembretes-diarios`. Essas colunas marcam quando cada lembrete já foi
-- disparado, pra a função (que roda todo dia) não reenviar o mesmo lembrete.
-- ============================================================================

alter table atividades_gestao add column if not exists lembrete_vespera_enviado_em timestamptz;
alter table atividades_gestao add column if not exists lembrete_dia_enviado_em timestamptz;

alter table projetos_gerenciais add column if not exists lembrete_vespera_enviado_em timestamptz;
alter table projetos_gerenciais add column if not exists lembrete_dia_enviado_em timestamptz;
