-- ============================================================================
-- Lançamentos reais de faturamento por Operação (ex.: Unimed) — cada linha é
-- um mês fechado/conciliado com o parceiro, com valor, nº da NF e anexo do
-- PDF (mesmo padrão de anexo em base64 já usado em outras tabelas do
-- projeto). Substitui o "estimado" na Visão Geral/DRE quando existir pelo
-- menos 1 lançamento — mesma lógica que já vale pra Farma Aéreo com CT-e
-- (ver computeFaturamentoRealOperacao / calcFinancialsSetor).
-- ============================================================================

create table if not exists lancamentos_faturamento_operacao (
  id text primary key,
  operacao_id text not null references operacoes(id) on delete cascade,
  cliente_id text,
  periodo text not null, -- 'YYYY-MM'
  valor numeric not null default 0,
  numero_nf text,
  descricao text,
  anexo_nome text,
  anexo_url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create index if not exists idx_lanc_fat_operacao_operacao_id
  on lancamentos_faturamento_operacao(operacao_id);

alter table lancamentos_faturamento_operacao enable row level security;
drop policy if exists lancamentos_faturamento_operacao_authenticated_all on lancamentos_faturamento_operacao;
create policy lancamentos_faturamento_operacao_authenticated_all on lancamentos_faturamento_operacao
  for all to authenticated using (true) with check (true);
