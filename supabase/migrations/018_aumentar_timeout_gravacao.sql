-- ============================================================================
-- Aumenta o tempo limite de execução de instruções SQL (statement_timeout)
-- pros papéis usados pelo app (authenticated e anon).
--
-- Motivo: colaboradores com vários documentos/anexos/ASO digitalizados (tudo
-- gravado como base64 direto no próprio registro, sem bucket de Storage —
-- mesmo padrão usado no resto do sistema) formam um registro grande. Ao
-- salvar, o Postgres estava cancelando a gravação com:
--   "canceling statement due to statement timeout"
-- porque o tempo padrão configurado pra esses papéis (geralmente ~8s no
-- Supabase) não é suficiente pra gravar um registro assim tão grande.
--
-- Isso NÃO substitui os limites de tamanho já existentes no app (client-side,
-- ver EmployeeFormModal.tsx/EmployeeDossierSection.tsx/AsoImageUploader.tsx —
-- limite combinado de 20MB por colaborador, somando documentos + dossiê de
-- anexos + ASO): aquilo evita que NOVOS colaboradores cheguem a esse ponto.
-- Esta migração aqui é o que desbloqueia registros que já passaram do limite
-- antes desses controles existirem.
-- ============================================================================

alter role authenticated set statement_timeout = '30s';
alter role anon set statement_timeout = '30s';
