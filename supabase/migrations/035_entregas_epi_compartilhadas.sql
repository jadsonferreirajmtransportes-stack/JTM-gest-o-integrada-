-- ============================================================================
-- Links de compartilhamento da Ficha de EPI de um colaborador — pra enviar por
-- WhatsApp/e-mail sem quem recebe precisar de login no sistema. Mesmo padrão já
-- usado nas Fichas Cadastrais (007_fichas_cadastrais_compartilhadas.sql) e nas
-- Notas (031_notas_compartilhadas.sql). Cada link:
--   - tem um token único, aleatório e imprevisível (256 bits) como chave primária;
--   - guarda uma FOTO (snapshot) da ficha (colaboradorNome/funcaoCargo/linhas de
--     entrega) no momento em que o link foi gerado — não reflete entregas futuras;
--   - expira sozinho depois de alguns dias (padrão: 7) e pode ser revogado a
--     qualquer momento antes disso.
--
-- IMPORTANTE sobre segurança: esta tabela NÃO tem nenhuma policy de SELECT para
-- "anon" — quem não está logado não consegue listar/varrer a tabela de forma
-- alguma. O único jeito de ler um link é através da função
-- obter_entrega_epi_compartilhada(token), que exige o token exato (impossível
-- de adivinhar) e confere validade/revogação por dentro da própria função.
-- ============================================================================

create table if not exists entregas_epi_compartilhadas (
  token text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  colaborador_nome text not null,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  criado_por text,
  expira_em timestamptz not null,
  revogado boolean not null default false
);
create index if not exists idx_entregas_epi_compartilhadas_colaborador
  on entregas_epi_compartilhadas(colaborador_id);

alter table entregas_epi_compartilhadas enable row level security;

drop policy if exists entregas_epi_compartilhadas_authenticated_all on entregas_epi_compartilhadas;
create policy entregas_epi_compartilhadas_authenticated_all on entregas_epi_compartilhadas
  for all to authenticated using (true) with check (true);

create or replace function obter_entrega_epi_compartilhada(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select dados
  from entregas_epi_compartilhadas
  where token = p_token
    and not revogado
    and expira_em > now();
$$;

revoke all on function obter_entrega_epi_compartilhada(text) from public;
grant execute on function obter_entrega_epi_compartilhada(text) to anon, authenticated;
