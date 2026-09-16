-- ============================================================================
-- Anexos (documentos) na Agenda da Gestão — ata assinada, pauta em PDF,
-- planilha de auditoria etc. Mesmo padrão de data URL base64 direto na
-- linha já usado em outros anexos do sistema (colaboradores, projetos),
-- sem bucket de Storage separado.
-- ============================================================================

alter table atividades_gestao add column if not exists anexos jsonb;
