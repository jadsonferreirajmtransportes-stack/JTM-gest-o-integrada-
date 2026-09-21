-- ============================================================================
-- Acompanhamento operacional de uma Operação genérica (ex.: Unimed), pros dois
-- jeitos de cobrança recorrente encontrados na prática:
--
-- 1) POR DIA CORRIDO (ex.: "Operação CD: 23 dias × R$ 800,00") — tipos_operacao_
--    diaria (cadastro do tipo + valor diário) + registros_dia_operacao (calendário
--    de quais dias cada tipo rodou).
--
-- 2) POR COLETA/EVENTO com tabela de faixas de volume (ex.: "Operação Interior":
--    01-03 volumes R$ 50, 04-06 volumes R$ 80, acima de 06 volumes R$ 120) —
--    faixas_volume_operacao (tabela de preço) + coletas_operacao (cada coleta
--    registrada, com o valor já calculado e congelado no momento do registro).
-- ============================================================================

create table if not exists tipos_operacao_diaria (
  id text primary key,
  operacao_id text not null references operacoes(id) on delete cascade,
  nome text not null,
  valor_diario numeric not null default 0,
  ativo boolean not null default true,
  ordem integer not null default 100,
  criado_em timestamptz not null default now()
);
create index if not exists idx_tipos_operacao_diaria_operacao on tipos_operacao_diaria(operacao_id);

create table if not exists registros_dia_operacao (
  id text primary key,
  operacao_id text not null references operacoes(id) on delete cascade,
  tipo_operacao_id text not null references tipos_operacao_diaria(id) on delete cascade,
  data date not null,
  criado_em timestamptz not null default now(),
  unique (tipo_operacao_id, data)
);
create index if not exists idx_registros_dia_operacao_operacao on registros_dia_operacao(operacao_id);
create index if not exists idx_registros_dia_operacao_data on registros_dia_operacao(data);

create table if not exists faixas_volume_operacao (
  id text primary key,
  operacao_id text not null references operacoes(id) on delete cascade,
  volume_min integer not null,
  volume_max integer, -- null = "acima de volume_min"
  valor numeric not null,
  ordem integer not null default 100
);
create index if not exists idx_faixas_volume_operacao_operacao on faixas_volume_operacao(operacao_id);

create table if not exists coletas_operacao (
  id text primary key,
  operacao_id text not null references operacoes(id) on delete cascade,
  data date not null,
  destinatario text,
  cidade text,
  quantidade_volumes integer not null default 1,
  numero_documento text,
  valor numeric not null default 0,
  observacao text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_coletas_operacao_operacao on coletas_operacao(operacao_id);
create index if not exists idx_coletas_operacao_data on coletas_operacao(data);

alter table tipos_operacao_diaria enable row level security;
drop policy if exists tipos_operacao_diaria_authenticated_all on tipos_operacao_diaria;
create policy tipos_operacao_diaria_authenticated_all on tipos_operacao_diaria
  for all to authenticated using (true) with check (true);

alter table registros_dia_operacao enable row level security;
drop policy if exists registros_dia_operacao_authenticated_all on registros_dia_operacao;
create policy registros_dia_operacao_authenticated_all on registros_dia_operacao
  for all to authenticated using (true) with check (true);

alter table faixas_volume_operacao enable row level security;
drop policy if exists faixas_volume_operacao_authenticated_all on faixas_volume_operacao;
create policy faixas_volume_operacao_authenticated_all on faixas_volume_operacao
  for all to authenticated using (true) with check (true);

alter table coletas_operacao enable row level security;
drop policy if exists coletas_operacao_authenticated_all on coletas_operacao;
create policy coletas_operacao_authenticated_all on coletas_operacao
  for all to authenticated using (true) with check (true);
