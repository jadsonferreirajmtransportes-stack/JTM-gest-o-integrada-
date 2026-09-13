-- ============================================================================
-- Login real por pessoa — fase 1 (preparação, sem mudar nenhum comportamento
-- visível ainda). Adiciona o vínculo entre um cadastro de "Logins & Acessos"
-- (tabela usuarios) e a conta REAL do Supabase Auth de quem faz login.
--
-- O vínculo em si é feito pelo app (App.tsx), automaticamente, por e-mail:
-- quando alguém loga com uma conta cujo e-mail bate com um cadastro em
-- `usuarios` que ainda não tem auth_user_id, o app preenche essa coluna.
-- Nenhuma senha passa por aqui nem pelo app — contas reais continuam sendo
-- criadas só pelo painel do Supabase (Authentication > Users), por quem tem
-- acesso de administrador ao projeto.
--
-- Isso ainda NÃO é a trava de segurança de banco — as políticas de RLS
-- continuam "qualquer autenticado" por enquanto. É só o cadastro do vínculo,
-- pré-requisito pra fase seguinte (reescrever as políticas usando auth.uid()).
-- ============================================================================

alter table usuarios add column if not exists auth_user_id uuid unique;
