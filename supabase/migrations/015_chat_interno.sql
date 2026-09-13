-- ============================================================================
-- Chat Interno — conversas diretas (1:1) e em grupo entre usuários cadastrados
-- em Logins & Acessos (tabela `usuarios`).
--
-- Mesma política de segurança do resto do sistema até aqui (RLS "qualquer
-- autenticado", sem restrição por pessoa) — ver a conversa sobre login real
-- por pessoa / RLS por auth.uid(), ainda uma fase futura. Quem vê qual
-- conversa é decidido pela TELA (só busca as conversas de que o usuário
-- atual participa), não pelo banco.
-- ============================================================================

create table if not exists chat_conversas (
  id text primary key,
  tipo text not null, -- 'direta' | 'grupo'
  nome text, -- só usado em 'grupo' — direta usa o nome do outro participante
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now() -- carimbado a cada mensagem nova, pra ordenar a lista por "mais recente"
);

create table if not exists chat_participantes (
  conversa_id text not null references chat_conversas(id) on delete cascade,
  usuario_id text not null references usuarios(id) on delete cascade,
  entrou_em timestamptz not null default now(),
  ultima_leitura_em timestamptz, -- null = nunca leu; comparado com mensagens.criado_em pra saber o que tá não-lido
  primary key (conversa_id, usuario_id)
);
create index if not exists idx_chat_participantes_usuario on chat_participantes(usuario_id);

create table if not exists chat_mensagens (
  id text primary key,
  conversa_id text not null references chat_conversas(id) on delete cascade,
  autor_id text not null references usuarios(id),
  texto text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_chat_mensagens_conversa on chat_mensagens(conversa_id, criado_em);

do $$
declare
  t text;
begin
  for t in select unnest(array['chat_conversas', 'chat_participantes', 'chat_mensagens'])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t || '_authenticated_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true);',
      t || '_authenticated_all', t
    );
  end loop;
end $$;

-- Realtime: mensagens novas precisam chegar sozinhas em quem está com a conversa aberta.
-- Checa antes de adicionar (ao contrário do resto do arquivo, "alter publication ... add table"
-- não aceita "if not exists" e dá erro se rodar esta migração uma segunda vez sem essa checagem).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_mensagens'
  ) then
    alter publication supabase_realtime add table chat_mensagens;
  end if;
end $$;
