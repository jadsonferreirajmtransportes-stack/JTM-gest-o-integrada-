-- ============================================================================
-- Chat Interno — suporte a anexos (imagem/PDF) nas mensagens.
--
-- Segue o mesmo padrão já usado no resto do sistema (ASO digitalizado,
-- comprovante de férias etc.): o arquivo vira uma data URL (base64) e fica
-- direto na linha, sem bucket de Storage separado. Menções a Notas, Agenda
-- e Projetos NÃO precisam de coluna própria — ficam embutidas no próprio
-- texto da mensagem como um token `@{tipo:id:título}`, resolvido/desenhado
-- na tela (ver src/components/Chat/ChatView.tsx).
-- ============================================================================

alter table chat_mensagens add column if not exists anexo_url text;   -- data URL (imagem/PDF); null = sem anexo
alter table chat_mensagens add column if not exists anexo_nome text;  -- nome original do arquivo
alter table chat_mensagens add column if not exists anexo_tipo text;  -- mime type (ex.: image/png, application/pdf)
