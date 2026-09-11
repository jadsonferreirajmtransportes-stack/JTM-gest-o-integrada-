-- ============================================================================
-- JMT Gestão Integrada — Departamento Pessoal (1º módulo migrado para Supabase)
-- ============================================================================
-- Rode este script inteiro no SQL Editor do Supabase (painel do projeto → SQL
-- Editor → New query → cola tudo → Run). Rode nos DOIS projetos: primeiro no
-- "jmt-gestao-dev" pra testar, e só depois no "jmt-gestao-producao".
--
-- Convenções:
--  - IDs continuam como TEXT (ex.: "colab-dp-1"), iguais aos já usados no
--    localStorage — facilita migrar os dados existentes sem remapear nada.
--  - Campos que hoje são listas dentro do registro (dependentes, documentos,
--    histórico de fardamento, anotações, anexos, onboarding, fracionamento de
--    férias) viram colunas JSONB — guardam a lista inteira, sem precisar de
--    tabela própria pra cada uma.
--  - Row Level Security (RLS) habilitado em todas as tabelas: só usuário
--    autenticado (logado) consegue ler ou escrever. A chave "anon" sozinha,
--    sem login, não abre nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- EMPREGADORES
-- ---------------------------------------------------------------------------
create table if not exists empregadores (
  id text primary key,
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null,
  endereco text,
  cidade_uf text,
  telefone text,
  responsavel_legal text,
  registro_anvisa text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CARGOS E SALÁRIOS
-- ---------------------------------------------------------------------------
create table if not exists cargos_salarios (
  id text primary key,
  cargo text not null,
  setor text not null,
  faixa_salarial_minima numeric not null,
  faixa_salarial_maxima numeric not null,
  piso_convencao_coletiva numeric,
  cbo text,
  descricao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SUPERVISORES
-- ---------------------------------------------------------------------------
create table if not exists supervisores (
  id text primary key,
  nome text not null,
  setor text,
  setores jsonb, -- string[] opcional (Supervisor.setores)
  cargo text not null,
  email text,
  telefone text,
  telefone_whatsapp text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FERIADOS DA EMPRESA
-- ---------------------------------------------------------------------------
create table if not exists feriados_empresa (
  id text primary key,
  data date not null,
  descricao text not null,
  tipo text not null check (tipo in ('Nacional', 'Estadual', 'Municipal', 'Ponto Facultativo')),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- COLABORADORES
-- ---------------------------------------------------------------------------
create table if not exists colaboradores (
  id text primary key,
  codigo_matricula text not null,

  -- Dados pessoais
  nome_completo text not null,
  nome_pai text,
  nome_mae text,
  data_nascimento date,
  naturalidade text,
  nacionalidade text,
  estado_civil text not null,
  raca_cor text not null,
  grau_instrucao text not null,
  genero text not null,
  endereco_completo text,
  cidade_uf text,
  cep text,
  telefone_whatsapp text not null default '',
  email text not null default '',
  cpf text not null default '',
  rg text,
  orgao_emissor_uf text,
  portador_deficiencia boolean not null default false,
  detalhe_deficiencia text,

  -- Dados contratuais
  empregador_id text references empregadores(id) on delete set null,
  status text not null check (status in ('Ativo', 'Férias', 'Afastado', 'Inativo')),
  funcao_cargo text not null default '',
  setor text not null default '',
  setores_atuacao jsonb, -- string[] ('farma_aereo' | 'farma_rodoviario' | 'dp')
  setor_principal text,
  data_admissao date not null,
  data_demissao date,
  motivo_demissao text,
  supervisor_id text references colaboradores(id) on delete set null, -- BUG: deveria referenciar supervisores(id) — corrigido em 008_fix_colaboradores_supervisor_fkey.sql
  forma_pagamento text not null default 'Mensal',
  remuneracao numeric not null default 0,
  gratificacao numeric not null default 0,
  valor_vale_alimentacao_dia numeric not null default 0,
  jornada_trabalho text,

  -- CCT / CLT
  piso_cct_funcao numeric,
  adicional_insalubridade boolean,
  percentual_insalubridade numeric,
  adicional_periculosidade boolean,
  adicional_acumulo_funcao boolean,
  adicional_penosidade boolean,
  filiado_sintrocern boolean,
  possui_quinquenio boolean,
  numero_quinquenios integer,
  antecedentes_criminais_entregue boolean,
  cnh_pontuacao_entregue boolean,
  termo_vt_assinado boolean,
  termo_fardamento_assinado boolean,

  -- Documentos complementares
  pis_pasep text,
  ctps_numero text,
  ctps_serie text,
  ctps_uf text,
  cnh_numero text,
  cnh_categoria text,
  cnh_validade date,
  titulo_eleitor_numero text,
  reservista_numero text,

  -- Dados bancários
  banco text,
  agencia text,
  tipo_conta text,
  numero_conta text,
  tipo_chave_pix text,
  chave_pix text,

  -- Dependentes (lista)
  dependentes jsonb not null default '[]',

  -- Vale Transporte
  vt_quantidade_tarifas_dia numeric not null default 0,
  vt_valor_tarifa numeric not null default 0,
  vt_identificacao_conducao text,

  -- Saúde do trabalhador / RDC 430
  data_exame_admissional date,
  data_ultimo_exame_ocupacional date,
  data_vencimento_exame date,
  data_exame_demissional date,
  clinica_medica text,
  observacao_saude text,
  aso_imagem_url text,
  aso_nome_arquivo text,
  aso_medico_emitente text,
  aso_crm_medico text,
  aso_resultado text check (aso_resultado in ('Apto', 'Inapto', 'Apto com Restrições')),

  -- Documentação (checklist), como lista
  documentos jsonb not null default '[]',

  -- Fardamento e EPI
  tamanho_camisa text,
  numero_calca text,
  numero_calcado text,
  historico_fardamento jsonb not null default '[]',

  -- Anotações e anexos
  anotacoes jsonb not null default '[]',
  anexos jsonb not null default '[]',
  observacoes_gerais text,

  -- Onboarding
  onboarding jsonb not null default '[]',

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_colaboradores_status on colaboradores(status);
create index if not exists idx_colaboradores_empregador on colaboradores(empregador_id);

-- ---------------------------------------------------------------------------
-- OCORRÊNCIAS
-- ---------------------------------------------------------------------------
create table if not exists ocorrencias (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  colaborador_nome text,
  setor text,
  data date,
  data_ocorrencia date,
  tipo text not null,
  dias_afastamento numeric,
  descricao text not null,
  supervisor_id text references colaboradores(id) on delete set null, -- BUG: deveria referenciar supervisores(id) — corrigido em 008_fix_colaboradores_supervisor_fkey.sql
  supervisor_nome text,
  status text,
  acao_tomada text,
  comprovante_anexo text,
  registrado_por text,
  origem text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_ocorrencias_colaborador on ocorrencias(colaborador_id);

-- ---------------------------------------------------------------------------
-- PROGRAMAÇÃO DE FÉRIAS
-- ---------------------------------------------------------------------------
create table if not exists programacao_ferias (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  assunto text,
  periodo_aquisitivo_inicio date,
  periodo_aquisitivo_fim date,
  prazo_limite_gozo date,
  data_limite_legal date,
  data_admissao_referencia date,
  dias_direito numeric,
  abono_pecuniario boolean,
  vende_10_dias boolean,
  dias_abono numeric,
  dias_gozados numeric,
  total_dias numeric,
  mes_referencia text,
  data_inicio date,
  data_termino date,
  data_retorno date,
  data_fim date,
  fracionamento jsonb, -- { periodo, dataInicio, dataFim, dias }[]
  status text not null,
  email_aviso_gerado text,
  aviso_enviado_em timestamptz,
  comprovante_assinado_url text,
  comprovante_assinado_nome_arquivo text,
  observacoes text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_ferias_colaborador on programacao_ferias(colaborador_id);

-- ---------------------------------------------------------------------------
-- VALE ALIMENTAÇÃO — QUINZENAS
-- ---------------------------------------------------------------------------
create table if not exists quinzenas_va (
  id text primary key,
  identificacao text not null,
  data_inicio date not null,
  data_termino date not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- VALE ALIMENTAÇÃO — LANÇAMENTOS
-- ---------------------------------------------------------------------------
create table if not exists lancamentos_va (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  colaborador_nome text,
  quinzena_id text not null references quinzenas_va(id) on delete cascade,
  identificacao_quinzena text not null,
  data_inicio date not null,
  data_termino date not null,
  valor_diaria numeric not null default 0,
  faltas numeric not null default 0,
  dias_ferias numeric,
  quantidade_diarias numeric not null default 0,
  valor_disponibilizado numeric not null default 0,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists idx_lancva_colaborador on lancamentos_va(colaborador_id);
create index if not exists idx_lancva_quinzena on lancamentos_va(quinzena_id);

-- ============================================================================
-- ROW LEVEL SECURITY — só usuário logado (authenticated) acessa. Sem sessão
-- (só com a chave anon), nenhuma leitura ou escrita é permitida.
-- ============================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'empregadores', 'cargos_salarios', 'supervisores', 'feriados_empresa',
      'colaboradores', 'ocorrencias', 'programacao_ferias', 'quinzenas_va', 'lancamentos_va'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t || '_authenticated_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true);',
      t || '_authenticated_all', t
    );
  end loop;
end $$;
