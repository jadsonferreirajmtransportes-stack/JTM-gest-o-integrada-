-- ============================================================================
-- Módulo Controladoria — Orçado x Realizado.
-- A DRE Gerencial (a outra metade do módulo) não guarda dado próprio: é
-- calculada em tempo real a partir de custos_operacionais, colaboradores,
-- lancamentos_faturamento_aereo e projetos_gerenciais (ver src/utils/
-- controladoriaUtils.ts). Só o orçamento (planejado) é dado novo de verdade.
-- Mesmo padrão de RLS das outras tabelas de gestão (004_gestao_geral.sql):
-- authenticated liberado, sem policy pra anon.
-- ============================================================================

create table if not exists orcamentos_controladoria (
  id text primary key,
  setor text not null,
  tipo_linha text not null,
  competencia text not null, -- 'YYYY-MM'
  valor_planejado numeric not null default 0,
  observacoes text,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create unique index if not exists idx_orcamentos_setor_linha_competencia
  on orcamentos_controladoria(setor, tipo_linha, competencia);

alter table orcamentos_controladoria enable row level security;
drop policy if exists orcamentos_controladoria_authenticated_all on orcamentos_controladoria;
create policy orcamentos_controladoria_authenticated_all on orcamentos_controladoria
  for all to authenticated using (true) with check (true);
