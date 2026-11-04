-- 106: ao apagar uma importação da Performance das baixas, os lançamentos que ela criou no
-- Controle Financeiro do Farma Rodoviário (origem = 'baixas') também saem — desde que:
--   • a NF não esteja em nenhuma outra importação que continua no sistema;
--   • o lançamento não esteja numa fatura e ainda não tenha CT-e (esses ficam, para não perder trabalho).
-- Também limpa agora os lançamentos que sobraram de importações já apagadas.
-- Rodar no dev e na produção (não precisa publicar nada).

create or replace function baixas__limpar_financeiro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from lancamentos_faturamento_aereo l
  using (select distinct baixas__nf(numero) as nf from velhas where baixas__nf(numero) is not null) v
  where l.origem = 'baixas'
    and baixas__nf(l.nota_fiscal) = v.nf
    and l.fatura_id is null
    and coalesce(btrim(l.numero_cte), '') = ''
    and not exists (select 1 from baixas_notas n where baixas__nf(n.numero) = v.nf);
  return null;
end;
$$;

drop trigger if exists baixas_notas_limpar_financeiro on baixas_notas;
create trigger baixas_notas_limpar_financeiro
  after delete on baixas_notas
  referencing old table as velhas
  for each statement execute function baixas__limpar_financeiro();

-- Limpeza do que já ficou para trás.
delete from lancamentos_faturamento_aereo l
where l.origem = 'baixas'
  and l.fatura_id is null
  and coalesce(btrim(l.numero_cte), '') = ''
  and not exists (select 1 from baixas_notas n where baixas__nf(n.numero) = baixas__nf(l.nota_fiscal));

notify pgrst, 'reload schema';
