-- 103: Performance das baixas x Faturamento (ligação pelo número da NF).
--   baixas_situacoes_desde(data)  → situação da entrega de cada NF (para o Controle Financeiro e
--                                    para o aviso ao montar a fatura). Resposta compacta.
--   baixas_cruzamento_mes(...)    → recebe o Valor a Cobrar de cada NF do faturamento (calculado
--                                    no app) e devolve o valor por motorista e por responsável, as
--                                    entregues sem CT-e lançado e os CT-es sem baixa.
-- NF comparada só pelos dígitos, sem zeros à esquerda (000123 = 123).
-- Rodar no dev e na produção ANTES de publicar.

create or replace function baixas__nf(p text)
returns text language sql immutable as $$
  select nullif(ltrim(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '0'), '')
$$;

create index if not exists baixas_notas_nf_idx on baixas_notas (baixas__nf(numero));

-- Situação de cada NF (a importação mais recente vale). Códigos:
--   C = entregue e comprovada · E = entregue sem comprovação · T = entrega tardia
--   A = abonada · P = pendente
create or replace function baixas_situacoes_desde(p_desde date)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_object_agg(nf, cod), '{}'::jsonb) from (
    select distinct on (baixas__nf(n.numero)) baixas__nf(n.numero) as nf,
      case
        when n.abono_motivo is not null then 'A'
        when n.entrega_tardia_em is not null then 'T'
        when not baixas__entregue(n.situacao, n.entrega_tardia_em) then 'P'
        when upper(coalesce(n.status, '')) = 'COMPROVADO' then 'C'
        else 'E'
      end as cod
    from baixas_notas n join baixas_uploads u on u.id = n.upload_id
    where u.data_referencia >= p_desde and baixas__nf(n.numero) is not null
    order by baixas__nf(n.numero), u.data_referencia desc, u.criado_em desc
  ) x
$$;
grant execute on function baixas_situacoes_desde(date) to authenticated;

-- Detalhe da baixa de uma NF (ao clicar na situação, no Controle Financeiro).
create or replace function baixas_detalhe_nf(p_nf text)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'numero', n.numero, 'status', n.status, 'situacao', n.situacao, 'motorista', n.motorista,
    'responsavel', u.responsavel, 'base', u.base, 'dataReferencia', u.data_referencia,
    'dataEntrega', n.data_entrega, 'prazo', n.prazo, 'entregaTardiaEm', n.entrega_tardia_em,
    'abonoMotivo', n.abono_motivo, 'abonoObs', n.abono_obs, 'destinatario', n.destinatario, 'cidade', n.cidade
  ) order by u.data_referencia desc), '[]'::jsonb)
  from baixas_notas n join baixas_uploads u on u.id = n.upload_id
  where baixas__nf(n.numero) = baixas__nf(p_nf)
$$;
grant execute on function baixas_detalhe_nf(text) to authenticated;

-- Cruzamento do mês: p_fat = { "nf": valor, ... } (NFs do faturamento do período, com o Valor a
-- Cobrar). Devolve valor por motorista/responsável e as divergências (até 500 de cada).
create or replace function baixas_cruzamento_mes(p_mes text, p_base text, p_fat jsonb)
returns jsonb
language sql
stable
set search_path = public
as $$
  with u as (
    select * from baixas_uploads
    where to_char(data_referencia, 'YYYY-MM') = p_mes and (p_base is null or base = p_base)
  ),
  n as (
    select distinct on (baixas__nf(n.numero)) baixas__nf(n.numero) as nf, n.numero, n.motorista, n.destinatario, n.cidade,
      u.responsavel, u.data_referencia,
      n.abono_motivo is null and baixas__entregue(n.situacao, n.entrega_tardia_em) as ok
    from baixas_notas n join u on u.id = n.upload_id
    where baixas__nf(n.numero) is not null
    order by baixas__nf(n.numero), u.data_referencia desc
  ),
  f as (select key as nf, (value #>> '{}')::numeric as valor from jsonb_each(coalesce(p_fat, '{}'::jsonb))),
  j as (select n.*, f.valor from n left join f on f.nf = n.nf)
  select jsonb_build_object(
    'valorTotal', coalesce((select sum(valor) from j), 0),
    'notasComValor', (select count(*) from j where valor is not null),
    'motoristas', coalesce((
      select jsonb_agg(x order by (x->>'valor')::numeric desc) from (
        select jsonb_build_object('motorista', coalesce(nullif(btrim(motorista), ''), 'Sem motorista'), 'valor', coalesce(sum(valor), 0),
          'notas', count(*), 'notasComValor', count(valor)) x
        from j group by coalesce(nullif(btrim(motorista), ''), 'Sem motorista')
      ) a
    ), '[]'::jsonb),
    'responsaveis', coalesce((
      select jsonb_agg(x order by (x->>'valor')::numeric desc) from (
        select jsonb_build_object('responsavel', min(responsavel), 'valor', coalesce(sum(valor), 0), 'notas', count(*), 'notasComValor', count(valor)) x
        from j group by lower(responsavel)
      ) b
    ), '[]'::jsonb),
    'semCteTotal', (select count(*) from j where ok and valor is null),
    'semCte', coalesce((
      select jsonb_agg(jsonb_build_object('numero', numero, 'motorista', motorista, 'responsavel', responsavel, 'data', data_referencia, 'destinatario', destinatario, 'cidade', cidade) order by data_referencia, numero)
      from (select * from j where ok and valor is null order by data_referencia, numero limit 500) s
    ), '[]'::jsonb),
    'semBaixaTotal', (select count(*) from f where not exists (select 1 from baixas_notas b where baixas__nf(b.numero) = f.nf)),
    'semBaixa', coalesce((
      select jsonb_agg(f.nf order by f.nf)
      from (select f.nf from f where not exists (select 1 from baixas_notas b where baixas__nf(b.numero) = f.nf) order by f.nf limit 500) f
    ), '[]'::jsonb)
  )
$$;
grant execute on function baixas_cruzamento_mes(text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
