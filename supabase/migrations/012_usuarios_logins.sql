-- ============================================================================
-- Logins & Acessos (UsuarioLogin) — sai do localStorage (por navegador, cada
-- dispositivo com sua própria cópia) e passa a morar no Supabase, compartilhado
-- entre todos os dispositivos/navegadores.
--
-- Ainda NÃO é a trava de segurança de banco (RLS por pessoa) — continua com a
-- mesma política "qualquer autenticado" do resto do sistema. É só o passo de
-- consistência: editar em um lugar reflete em todos, em vez de cada navegador
-- ter sua própria versão desatualizada.
--
-- De propósito SEM coluna de senha: o campo "senha" do cadastro de usuário
-- nunca foi usado pra autenticar ninguém de verdade (quem autentica é o
-- Supabase Auth, na tela de login) — era só um campo de referência salvo no
-- navegador. Guardar isso numa tabela compartilhada e legível por qualquer
-- sessão autenticada pioraria a exposição de uma senha real sem ganhar nada
-- em funcionalidade. Continua existindo só localmente, sessão a sessão.
-- ============================================================================

create table if not exists usuarios (
  id text primary key,
  nome text not null,
  login text not null,
  email text,
  cargo text,
  setor text,
  status text not null default 'Ativo',
  data_criacao timestamptz not null default now(),
  ultimo_acesso timestamptz,
  modulos_permitidos jsonb not null default '[]',
  observacoes text,
  atualizado_em timestamptz
);
create unique index if not exists idx_usuarios_login on usuarios(login);

alter table usuarios enable row level security;
drop policy if exists usuarios_authenticated_all on usuarios;
create policy usuarios_authenticated_all on usuarios
  for all to authenticated using (true) with check (true);
