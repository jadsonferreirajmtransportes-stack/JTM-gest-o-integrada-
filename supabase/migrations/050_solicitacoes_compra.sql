-- ============================================================================
-- Módulo Compras — solicitações de itens para compra. Qualquer login interno cria
-- uma solicitação; admin/diretoria aprova ou recusa. Um link público (sem login,
-- via ?form=compras) também permite que alguém sem cadastro no sistema faça um
-- pedido — mesmo padrão de RLS já usado no Formulário Público de Admissão
-- (005_pre_admissoes.sql) e de Ocorrências (019_acesso_publico_ocorrencias.sql):
-- "authenticated" tem acesso total, "anon" só pode inserir (nunca ler/editar/apagar).
-- ============================================================================

create table if not exists solicitacoes_compra (
  id text primary key,
  item text not null,
  quantidade numeric not null default 1,
  justificativa text,
  valor_estimado numeric,
  fornecedor_sugerido text,
  urgencia text not null default 'Normal', -- 'Normal' | 'Urgente'
  prazo_necessario date,
  anexo_nome text,
  anexo_url text,
  solicitante_nome text not null,
  solicitante_login text,
  solicitante_contato text,
  status text not null default 'Pendente', -- 'Pendente' | 'Aprovado' | 'Recusado' | 'Comprado'
  aprovado_por text,
  motivo_recusa text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists idx_solicitacoes_compra_status on solicitacoes_compra(status);

alter table solicitacoes_compra enable row level security;

drop policy if exists solicitacoes_compra_authenticated_all on solicitacoes_compra;
create policy solicitacoes_compra_authenticated_all on solicitacoes_compra
  for all to authenticated using (true) with check (true);

drop policy if exists solicitacoes_compra_anon_insert on solicitacoes_compra;
create policy solicitacoes_compra_anon_insert on solicitacoes_compra
  for insert to anon with check (true);
