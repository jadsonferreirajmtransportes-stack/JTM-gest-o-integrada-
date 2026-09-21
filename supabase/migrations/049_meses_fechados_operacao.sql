-- ============================================================================
-- Permite marcar um mês do Acompanhamento Operacional (dias corridos / coletas) como
-- fechado/conciliado com o parceiro — trava novos dias marcados/coletas registradas e a
-- edição/exclusão dos já existentes naquele mês, pra não mudar sem querer um número já
-- conferido com o parceiro (ex.: depois que a Unimed confirma o valor de um mês por
-- e-mail). "Reabrir" só remove essa trava, não apaga nenhum dado.
-- ============================================================================

create table if not exists meses_fechados_operacao (
  id text primary key, -- `${operacao_id}_${periodo}`
  operacao_id text not null references operacoes(id) on delete cascade,
  periodo text not null, -- 'YYYY-MM'
  fechado_em timestamptz not null default now(),
  unique (operacao_id, periodo)
);
create index if not exists idx_meses_fechados_operacao_operacao on meses_fechados_operacao(operacao_id);

alter table meses_fechados_operacao enable row level security;
drop policy if exists meses_fechados_operacao_authenticated_all on meses_fechados_operacao;
create policy meses_fechados_operacao_authenticated_all on meses_fechados_operacao
  for all to authenticated using (true) with check (true);
