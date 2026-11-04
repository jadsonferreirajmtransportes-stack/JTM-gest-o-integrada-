-- 107: Padronização de documentos — segundo modelo de visual: "Ofício / carta timbrada"
-- (papel timbrado da JMT, local e data, destinatário, assunto e assinatura no final).
-- modelo: null/'padrao' = documento controlado de hoje; 'oficio' = carta timbrada.
-- oficio: { local, destinatario, assunto }.
-- Rodar no dev e na produção ANTES de publicar.

alter table documentos_padronizados add column if not exists modelo text;
alter table documentos_padronizados add column if not exists oficio jsonb;

notify pgrst, 'reload schema';
