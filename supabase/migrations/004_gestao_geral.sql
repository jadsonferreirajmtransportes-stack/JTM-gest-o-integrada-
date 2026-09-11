-- ============================================================================
-- Custos Operacionais, Projetos Gerenciais, Agenda da Gestão, Notas & Ideias e
-- Instruções de Trabalho — módulos migrados para Supabase.
-- Nenhum desses tinha dado real em produção até agora (só Notas e Instruções
-- tinham 3 registros cada) — migração de infraestrutura, não de dado sensível.
-- ============================================================================

create table if not exists custos_operacionais (
  id text primary key,
  setor text not null,
  categoria text not null,
  descricao text not null,
  valor numeric not null default 0,
  data_competencia text not null, -- 'YYYY-MM' ou 'YYYY-MM-DD' (granularidade livre, por isso texto)
  data_vencimento date,
  data_pagamento date,
  status text not null,
  periodicidade text not null,
  fornecedor text,
  numero_documento_ou_nf text,
  placa_veiculo text,
  conhecimento_ou_awb text,
  cliente_relacionado_id text,
  criado_por text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists idx_custos_setor on custos_operacionais(setor);

create table if not exists projetos_gerenciais (
  id text primary key,
  codigo text not null,
  titulo text not null,
  descricao text not null default '',
  categoria text not null,
  status text not null,
  prioridade text not null,
  setor_impactado text not null,
  lider_projeto_id text,
  lider_projeto_nome text not null default '',
  lider_cargo text,
  equipe_membros jsonb not null default '[]',
  data_inicio date,
  data_previsao_fim date,
  data_conclusao_real date,
  orcamento_previsto numeric not null default 0,
  custo_realizado numeric not null default 0,
  tipo_investimento text,
  roi_estimado_meses numeric,
  retorno_esperado_descricao text,
  progresso_percentual numeric not null default 0,
  objetivo_estrategico text,
  alinhamento_rdc430 boolean,
  marcos jsonb not null default '[]',
  tarefas jsonb not null default '[]',
  riscos jsonb not null default '[]',
  kpis jsonb not null default '[]',
  atualizacoes jsonb not null default '[]',
  documentos jsonb not null default '[]',
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists atividades_gestao (
  id text primary key,
  titulo text not null,
  descricao text,
  categoria text not null,
  status text not null,
  prioridade text not null,
  data date not null,
  data_fim date,
  hora_inicio text not null default '',
  hora_fim text not null default '',
  dia_inteiro boolean,
  responsavel text not null default '',
  responsavel_cargo text,
  participantes jsonb not null default '[]',
  tipo_local text,
  local_ou_link text not null default '',
  link_localizacao text,
  pauta_ata text,
  deliberacoes jsonb,
  modulo_relacionado text,
  projeto_relacionado_id text,
  lembrete_minutos numeric,
  recorrencia text,
  ultimo_alerta_enviado_em timestamptz,
  ultimo_alerta_canal text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz,
  concluida_em timestamptz
);
create index if not exists idx_atividades_data on atividades_gestao(data);

create table if not exists notas_paginas (
  id text primary key,
  titulo text not null default '',
  icone text,
  pagina_pai_id text,
  blocos jsonb not null default '[]',
  vinculo jsonb,
  favorito boolean,
  arquivada boolean,
  autor text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists instrucoes_trabalho (
  id text primary key,
  codigo text not null,
  titulo text not null,
  categoria text not null,
  status text not null,
  versao numeric not null default 1,
  responsavel text,
  aprovado_por text,
  data_vigencia date,
  objetivo text,
  aplicacao_abrangencia text,
  definicoes text,
  responsabilidades jsonb not null default '[]',
  sipoc jsonb not null default '[]',
  fluxo_processo jsonb not null default '[]',
  criterios_decisao text,
  registros_evidencias text,
  indicadores jsonb not null default '[]',
  riscos_controles jsonb not null default '[]',
  plano_acao_5w2h jsonb not null default '[]',
  historico_revisoes jsonb not null default '[]',
  vinculo jsonb,
  favorito boolean,
  arquivada boolean,
  autor text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'custos_operacionais', 'projetos_gerenciais', 'atividades_gestao', 'notas_paginas', 'instrucoes_trabalho'
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
