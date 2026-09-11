-- ============================================================================
-- JMT Gestão Integrada — Carteira de Clientes + Farma Aéreo (2º módulo migrado)
-- ============================================================================
-- Rode este script inteiro no SQL Editor do Supabase, nos DOIS projetos
-- (primeiro "jmt-gestao-dev" pra testar, depois "jmt-gestao-producao").
--
-- Inclui Clientes junto porque Embarques/Lançamentos/Faturas do Farma Aéreo
-- referenciam clienteId — sem a carteira de clientes migrada junto, ficaria
-- um "FK" pra uma tabela que só existe no localStorage. cliente_id aqui NÃO
-- tem "references clientes(id)" (fica solto, só indexado) porque a mesma
-- carteira também é usada pelo Farma Rodoviário, que ainda não foi migrado —
-- assim nenhum dos dois lados quebra por causa do outro ainda não existir.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CARTEIRA DE CLIENTES
-- ---------------------------------------------------------------------------
create table if not exists clientes (
  id text primary key,
  codigo_cliente text not null,
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null,
  inscricao_estadual text,
  segmento text not null,
  status text not null,
  setores_vinculados jsonb,
  setor_atuacao text,
  empresa_faturamento_id text,
  gerente_conta_responsavel text not null default '',
  endereco_completo text not null default '',
  cidade_uf text not null default '',
  cep text,
  telefone_principal text not null default '',
  email_principal text not null default '',
  website text,

  tipos_operacao jsonb not null default '[]',
  faixa_temperatura text not null,
  exige_rdc430 boolean not null default false,
  exige_registro_anvisa boolean not null default false,
  numero_licenca_sanitaria text,
  validade_licenca_sanitaria date,
  restricoes_horario_carga text,

  numero_contrato text,
  data_inicio_contrato date,
  data_renovacao_contrato date,
  faturamento_mensal_estimado numeric not null default 0,
  volume_entregas_mes_estimado numeric not null default 0,
  tabela_frete jsonb not null default '{}',
  tabela_frete_rodoviario jsonb,

  veiculos_alocados text,
  motoristas_alocados_ids jsonb,

  contatos jsonb not null default '[]',
  regioes_atendidas jsonb not null default '[]',
  interacoes jsonb not null default '[]',
  observacoes_operacionais text,
  satisfacao_nps numeric,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- EMBARQUES AÉREOS (rastreamento operacional — hoje sem dados reais, mas o
-- schema já entra pronto pra quando o recurso for usado)
-- ---------------------------------------------------------------------------
create table if not exists embarques_aereo (
  id text primary key,
  codigo_awb text not null default '',
  numero_awb text,
  numero_cte_aereo text,
  cliente_id text,
  cliente_nome text not null default '',
  remetente_nome text not null default '',
  remetente_cidade_uf text not null default '',
  destinatario_nome text not null default '',
  destinatario_endereco text not null default '',
  destinatario_cidade_uf text not null default '',
  tipo_carga text not null,
  faixa_temperatura text not null,
  tipo_embalagem text not null default '',
  companhia_aerea text not null,
  numero_voo text not null default '',
  aeroporto_origem text not null default '',
  aeroporto_destino text not null default '',
  data_embarque date,
  horario_previsto_decolagem text,
  horario_previsto_pouso text,
  previsao_entrega_destino text,
  status text not null,

  temperatura_atual numeric not null default 0,
  temperatura_minima numeric not null default 0,
  temperatura_maxima numeric not null default 0,
  datalogger_serial text,
  datalogger_modelo text,
  termograma_validado boolean not null default false,

  peso_bruto_kg numeric not null default 0,
  quantidade_volumes numeric not null default 0,
  valor_mercadoria numeric not null default 0,
  valor_frete_aereo numeric not null default 0,
  urgencia text not null default 'Normal',
  numero_nota_fiscal text not null default '',
  responsavel_liberacao_teca text,
  motorista_coleta_id text,
  motorista_entrega_id text,
  observacoes text,
  comprovante_entrega_url text,

  historico jsonb not null default '[]',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_embarques_aereo_cliente on embarques_aereo(cliente_id);

-- ---------------------------------------------------------------------------
-- FATURAS (agrupam lançamentos de um cliente/período)
-- ---------------------------------------------------------------------------
create table if not exists faturas_aereo (
  id text primary key,
  cliente_id text,
  cliente_nome text not null default '',
  periodo text not null default '',
  numero_fatura text not null default '',
  data_envio date,
  numero_nf text,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists idx_faturas_aereo_cliente on faturas_aereo(cliente_id);

-- ---------------------------------------------------------------------------
-- LANÇAMENTOS DE FATURAMENTO (CT-e/NF por cliente) — tabela principal, com
-- volume real de dados (milhares de linhas)
-- ---------------------------------------------------------------------------
create table if not exists lancamentos_faturamento_aereo (
  id text primary key,
  cliente_id text,
  cliente_nome text not null default '',
  cnpj_remetente text,
  estado_remetente text,
  cidade_remetente text,
  remetente_lab text,
  destinatario text,
  cnpj_destinatario text,
  estado_destino text,
  cidade_destino text,
  bairro_destino text,
  nota_fiscal text,
  valor_nf numeric,
  valor_prestacao numeric,
  data_emissao date,
  numero_cte text,
  ctrc text,
  modal text,
  peso_kg numeric,
  peso_taxado numeric,
  volumes numeric,
  tipo_custo_extra text,
  custo_extra numeric,
  custo_descarga numeric,
  valor_a_cobrar numeric not null default 0,
  valor_recebido numeric,
  confirmacao_pagamento boolean not null default false,
  data_conclusao date,
  nf_emitida boolean,
  fatura_id text references faturas_aereo(id) on delete set null,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists idx_lanc_fat_aereo_cliente on lancamentos_faturamento_aereo(cliente_id);
create index if not exists idx_lanc_fat_aereo_fatura on lancamentos_faturamento_aereo(fatura_id);
create index if not exists idx_lanc_fat_aereo_nf on lancamentos_faturamento_aereo(nota_fiscal);
create index if not exists idx_lanc_fat_aereo_cte on lancamentos_faturamento_aereo(numero_cte);

-- ============================================================================
-- ROW LEVEL SECURITY — só usuário logado (authenticated) acessa.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array['clientes', 'embarques_aereo', 'faturas_aereo', 'lancamentos_faturamento_aereo'])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t || '_authenticated_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true);',
      t || '_authenticated_all', t
    );
  end loop;
end $$;
