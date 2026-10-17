-- ============================================================================
-- 077 — Módulo Disciplinar: assinatura de quem aprova + testemunhas à distância.
--
-- assinatura_aprovador: assinatura desenhada (PNG) de quem aprovou a medida,
--   impressa na linha "Empregador" do documento.
-- recusa_remota: quando o colaborador se recusa a assinar e as testemunhas
--   (colaboradores) assinam o termo pelo próprio link pessoal:
--   { dataRecusa, solicitadaPor, solicitadaEm,
--     testemunhas: [{ colaboradorId, nome, cpf, documentoId }] }
--   Quando as duas assinam, a recusa é concluída com as assinaturas delas.
-- Rodar no SQL Editor do dev e da PRODUÇÃO (ref pvjdypqwkvgwhbhzsphb) ANTES de
-- publicar o código.
-- ============================================================================

alter table medidas_disciplinares add column if not exists assinatura_aprovador text;
alter table medidas_disciplinares add column if not exists recusa_remota jsonb;
notify pgrst, 'reload schema';
