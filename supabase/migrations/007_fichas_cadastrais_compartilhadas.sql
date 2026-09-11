-- ============================================================================
-- Links de compartilhamento da Ficha Cadastral do colaborador — pra enviar a um
-- terceiro externo (contador, fiscalização, RH de outra empresa) sem essa pessoa
-- precisar de login no sistema. Cada link:
--   - tem um token único, aleatório e imprevisível (256 bits) como chave primária;
--   - guarda uma FOTO (snapshot) dos dados no momento em que o link foi gerado —
--     não muda se o cadastro for editado depois, e não expõe campos internos
--     (anotações de RH, anexos internos, histórico de fardamento);
--   - expira sozinho depois de alguns dias (padrão: 7) e pode ser revogado a
--     qualquer momento antes disso.
--
-- IMPORTANTE sobre segurança: esta tabela NÃO tem nenhuma policy de SELECT para
-- "anon" — quem não está logado não consegue listar/varrer a tabela de forma
-- alguma. O único jeito de ler um link é através da função
-- obter_ficha_compartilhada(token), que exige o token exato (impossível de
-- adivinhar) e confere validade/revogação por dentro da própria função.
-- ============================================================================

create table if not exists fichas_cadastrais_compartilhadas (
  token text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  colaborador_nome text not null,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  criado_por text,
  expira_em timestamptz not null,
  revogado boolean not null default false
);
create index if not exists idx_fichas_compartilhadas_colaborador
  on fichas_cadastrais_compartilhadas(colaborador_id);

alter table fichas_cadastrais_compartilhadas enable row level security;

-- Staff (logado) tem acesso completo: gerar link, listar os links de um
-- colaborador, revogar antes do prazo.
drop policy if exists fichas_compartilhadas_authenticated_all on fichas_cadastrais_compartilhadas;
create policy fichas_compartilhadas_authenticated_all on fichas_cadastrais_compartilhadas
  for all to authenticated using (true) with check (true);

-- Função "porteira": único jeito de ler o conteúdo de um link sem estar logado.
-- SECURITY DEFINER faz ela ignorar a RLS da tabela por dentro, mas ela mesma só
-- devolve algo se o token bater exatamente com um link válido — do lado de fora
-- (anon) continua impossível fazer um "select * from ..." e listar tudo.
create or replace function obter_ficha_compartilhada(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select dados
  from fichas_cadastrais_compartilhadas
  where token = p_token
    and not revogado
    and expira_em > now();
$$;

revoke all on function obter_ficha_compartilhada(text) from public;
grant execute on function obter_ficha_compartilhada(text) to anon, authenticated;
