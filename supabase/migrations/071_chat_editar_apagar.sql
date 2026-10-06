-- ============================================================================
-- 071 — Chat interno: editar e apagar mensagem enviada.
--
-- editado_em: quando o autor corrigiu o texto (a tela mostra "editada").
-- apagada:    o autor apagou — a linha fica (pra conversa não "pular"), mas o
--             texto e o anexo são limpos de verdade; a tela mostra
--             "Mensagem apagada".
--
-- O realtime de chat_mensagens já está publicado (015), então quem está com a
-- conversa aberta recebe a edição/remoção na hora (evento UPDATE).
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

alter table chat_mensagens add column if not exists editado_em timestamptz;
alter table chat_mensagens add column if not exists apagada boolean not null default false;
