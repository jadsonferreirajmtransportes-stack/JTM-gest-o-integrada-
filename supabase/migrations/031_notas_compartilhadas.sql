-- ============================================================================
-- Links de compartilhamento de uma página de Notas & Ideias — pra mandar por
-- WhatsApp/e-mail um link de VISUALIZAÇÃO (em vez de só o texto colado),
-- mesmo padrão já usado na Ficha Cadastral (ver
-- 007_fichas_cadastrais_compartilhadas.sql). Cada link:
--   - tem um token único, aleatório e imprevisível (256 bits) como chave primária;
--   - guarda uma FOTO (snapshot) dos blocos no momento em que o link foi gerado —
--     não muda se a página for editada depois;
--   - expira sozinho depois de alguns dias (padrão: 7) e pode ser revogado a
--     qualquer momento antes disso.
--
-- IMPORTANTE sobre segurança: esta tabela NÃO tem nenhuma policy de SELECT para
-- "anon" — quem não está logado não consegue listar/varrer a tabela de forma
-- alguma. O único jeito de ler um link é através da função
-- obter_nota_compartilhada(token), que exige o token exato (impossível de
-- adivinhar) e confere validade/revogação por dentro da própria função.
-- ============================================================================

create table if not exists notas_compartilhadas (
  token text primary key,
  nota_id text not null references notas_paginas(id) on delete cascade,
  nota_titulo text not null,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  criado_por text,
  expira_em timestamptz not null,
  revogado boolean not null default false
);
create index if not exists idx_notas_compartilhadas_nota
  on notas_compartilhadas(nota_id);

alter table notas_compartilhadas enable row level security;

-- Staff (logado) tem acesso completo: gerar link, listar os links de uma
-- página, revogar antes do prazo.
drop policy if exists notas_compartilhadas_authenticated_all on notas_compartilhadas;
create policy notas_compartilhadas_authenticated_all on notas_compartilhadas
  for all to authenticated using (true) with check (true);

-- Função "porteira": único jeito de ler o conteúdo de um link sem estar logado.
create or replace function obter_nota_compartilhada(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select dados
  from notas_compartilhadas
  where token = p_token
    and not revogado
    and expira_em > now();
$$;

revoke all on function obter_nota_compartilhada(text) from public;
grant execute on function obter_nota_compartilhada(text) to anon, authenticated;
