-- ============================================================================
-- Documentos no cadastro do cliente (pedido de 2026-10-23): contrato, aditivos,
-- proposta assinada, licenças (AFE/LS), alvará, cartão CNPJ, tabela assinada...
-- Os arquivos ficam no bucket privado "anexos" (056); a coluna guarda só a lista
-- (tipo, descrição, validade e a referência "storage:<caminho>"), nada de base64.
-- ============================================================================

alter table clientes add column if not exists documentos jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
