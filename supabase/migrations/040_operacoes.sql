-- ============================================================================
-- Registro de Operações/Setores — generaliza Farma Aéreo/Farma Rodoviário para
-- permitir novas operações (ex.: Unimed) sem módulo bespoke. Cada linha
-- alimenta o Sidebar, o seletor de setor no Custo Operacional e o painel
-- gerencial genérico (OperacaoView). Seed com os 2 setores existentes pra
-- preservar 100% do comportamento/visual atual.
-- ============================================================================

create table if not exists operacoes (
  id text primary key,
  nome text not null,
  nome_curto text,
  icone text not null default 'Building2',
  cor_de text not null default 'from-slate-600',
  cor_ate text not null default 'to-slate-800',
  cor_borda text not null default 'border-slate-500',
  ordem integer not null default 100,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

alter table operacoes enable row level security;
drop policy if exists operacoes_authenticated_all on operacoes;
create policy operacoes_authenticated_all on operacoes
  for all to authenticated using (true) with check (true);

insert into operacoes (id, nome, nome_curto, icone, cor_de, cor_ate, cor_borda, ordem, ativo) values
  ('farma_aereo', 'Farma Aéreo', 'AWB & TECA', 'Plane', 'from-sky-600', 'to-blue-800', 'border-sky-500', 10, true),
  ('farma_rodoviario', 'Farma Rodoviário', 'Frota & MDF-e', 'Truck', 'from-emerald-600', 'to-teal-800', 'border-emerald-500', 20, true)
on conflict (id) do nothing;
