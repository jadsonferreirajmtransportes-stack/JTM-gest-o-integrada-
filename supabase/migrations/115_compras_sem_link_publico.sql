-- 115: desliga o link público de compras (?form=compras). Os pedidos agora são feitos só pelo
-- link pessoal de quem a gestão liberou (migração 114) ou por quem tem login no sistema.
-- Tira a permissão de "anon" (sem login) criar solicitações direto na tabela.
-- Rodar no dev e na produção (pode ser antes ou depois de publicar).

drop policy if exists solicitacoes_compra_anon_insert on solicitacoes_compra;

notify pgrst, 'reload schema';
