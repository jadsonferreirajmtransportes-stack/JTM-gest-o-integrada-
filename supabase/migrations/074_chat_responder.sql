-- ============================================================================
-- 074 — Chat interno: responder a uma mensagem (citação, como no WhatsApp).
-- resposta_a = id da mensagem respondida; se ela for excluída junto com a
-- conversa, a resposta fica sem a citação.
-- Rodar no SQL Editor do dev e da PRODUÇÃO (ref pvjdypqwkvgwhbhzsphb) ANTES de
-- publicar o código.
-- ============================================================================

alter table chat_mensagens add column if not exists resposta_a text references chat_mensagens(id) on delete set null;
notify pgrst, 'reload schema';
