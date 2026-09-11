-- ============================================================================
-- Farma Rodoviário — Viagens (rastreamento operacional: telemetria de
-- temperatura, checklist de saída, pontos de parada/entrega, ocorrências de
-- rota). Sem dado real hoje (0 registros) — migração de infraestrutura.
-- Não confundir com o Controle Financeiro do Rodoviário (já migrado antes,
-- tabelas lancamentos_faturamento_aereo/faturas_aereo compartilhadas com o
-- Aéreo, separadas pelo campo `modal`).
-- ============================================================================

create table if not exists viagens_rodoviarias (
  id text primary key,
  codigo_viagem text,
  numero_mdfe text,
  titulo_rota text,
  origem text,
  rota_origem text,
  destino_final text,
  rota_destino text,
  regioes_atendidas jsonb,
  modalidade text not null,

  veiculo_placa text not null default '',
  veiculo_tipo text,
  veiculo_modelo text,
  motorista_id text,
  motorista_nome text not null default '',
  motorista_cpf text,
  motorista_telefone text,
  ajudante_nome text,

  data_saida date,
  data_partida date,
  horario_saida text,
  horario_partida_previsto text,
  horario_partida_real text,
  previsao_retorno_base text,
  previsao_chegada text,
  previsao_chegada_destino text,
  status text not null,

  faixa_temperatura text,
  faixa_temperatura_exigida text,
  temperatura_atual_bau numeric not null default 0,
  temperatura_set_point numeric,
  setpoint_termostato numeric,
  temperatura_minima numeric,
  temperatura_maxima numeric,
  temperatura_min_permitida numeric,
  temperatura_max_permitida numeric,
  status_refrigerador text,
  datalogger_id text,
  datalogger_serial text,
  termo_higienizacao_assinado boolean,

  quantidade_notas_fiscais numeric,
  total_nfs numeric,
  quantidade_total_volumes numeric,
  valor_total_mercadoria numeric,
  valor_total_carga numeric,
  peso_total_kg numeric not null default 0,
  km_total_estimado numeric,
  km_inicial numeric,
  km_final numeric,

  checklist_saida jsonb,
  checklist_partida jsonb,
  historico_temperatura jsonb not null default '[]',
  pontos_parada jsonb not null default '[]',
  pontos_entrega jsonb not null default '[]',
  ocorrencias jsonb not null default '[]',
  observacoes text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists idx_viagens_status on viagens_rodoviarias(status);
create index if not exists idx_viagens_data_saida on viagens_rodoviarias(data_saida);

alter table viagens_rodoviarias enable row level security;
drop policy if exists viagens_rodoviarias_authenticated_all on viagens_rodoviarias;
create policy viagens_rodoviarias_authenticated_all on viagens_rodoviarias
  for all to authenticated using (true) with check (true);
