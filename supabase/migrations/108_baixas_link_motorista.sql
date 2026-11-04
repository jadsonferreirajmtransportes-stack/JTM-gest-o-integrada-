-- 108: Performance das baixas — link do MOTORISTA (?form=motorista&t=...).
-- Cada motorista ganha um link secreto, gerado na Performance (ranking dos motoristas), para
-- acompanhar o próprio desempenho: resumo do mês, dia a dia, pendências e posição no ranking
-- (sem ver os números dos outros). Sem login; "Gerar novo link" invalida o anterior.
-- O motorista é identificado pelo nome como vem na planilha de baixas.
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists baixas_links_motorista (
  motorista text primary key,          -- nome como na planilha, em maiúsculas
  token text not null unique,
  criado_em timestamptz not null default now(),
  criado_por text
);
alter table baixas_links_motorista enable row level security;
drop policy if exists baixas_links_motorista_auth on baixas_links_motorista;
create policy baixas_links_motorista_auth on baixas_links_motorista for all to authenticated using (true) with check (true);

create index if not exists baixas_notas_motorista_idx on baixas_notas (upper(btrim(motorista)));

-- Painel do motorista no mês (p_mes = 'AAAA-MM'; vazio = mês mais recente com notas dele).
create or replace function motorista_baixas_painel(p_token text, p_mes text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mot text;
  v_mes text := nullif(btrim(coalesce(p_mes, '')), '');
  v_regras jsonb;
  pe numeric; pp numeric; pc numeric; v_min int; v_meta numeric;
  v_res jsonb;
begin
  if coalesce(length(p_token), 0) < 16 then return jsonb_build_object('erro', 'link'); end if;
  select motorista into v_mot from baixas_links_motorista where token = p_token;
  if v_mot is null then return jsonb_build_object('erro', 'link'); end if;

  if v_mes is null then
    select to_char(max(u.data_referencia), 'YYYY-MM') into v_mes
    from baixas_notas n join baixas_uploads u on u.id = n.upload_id
    where upper(btrim(n.motorista)) = v_mot;
  end if;
  if v_mes is null then
    return jsonb_build_object('motorista', v_mot, 'mes', to_char(current_date, 'YYYY-MM'), 'meses', '[]'::jsonb, 'total', 0);
  end if;

  select regras into v_regras from baixas_config where id = 1;
  pe := coalesce((v_regras->'motorista'->>'pesoEntrega')::numeric, 100);
  pp := coalesce((v_regras->'motorista'->>'pesoPrazo')::numeric, 0);
  pc := coalesce((v_regras->'motorista'->>'pesoComprovacao')::numeric, 0);
  v_min := greatest(coalesce((v_regras->'motorista'->>'minimoNotas')::int, 1), 1);
  v_meta := coalesce((v_regras->>'metaEntrega')::numeric, 95);

  with n as (
    select n.*, u.data_referencia,
      upper(coalesce(nullif(btrim(n.motorista), ''), 'SEM MOTORISTA')) as mot,
      baixas__entregue(n.situacao, n.entrega_tardia_em) as ok,
      upper(coalesce(n.status, '')) = 'COMPROVADO' as comp,
      upper(coalesce(n.prazo, '')) = 'NO PRAZO' and n.entrega_tardia_em is null as prazo_ok
    from baixas_notas n join baixas_uploads u on u.id = n.upload_id
    where to_char(u.data_referencia, 'YYYY-MM') = v_mes and n.abono_motivo is null
  ),
  por as (
    select mot, count(*) as total, count(*) filter (where ok) as ent, count(*) filter (where prazo_ok) as pz, count(*) filter (where comp) as cp
    from n group by mot
  ),
  pts as (
    select mot, total,
      (pe * ent * 100.0 / total + pp * pz * 100.0 / total + pc * cp * 100.0 / total) / greatest(pe + pp + pc, 1) as pontos
    from por
  ),
  rk as (
    select mot, pontos, row_number() over (order by pontos desc, total desc) as pos
    from pts where total >= v_min
  ),
  meus as (select * from n where mot = v_mot)
  select jsonb_build_object(
    'motorista', v_mot,
    'mes', v_mes,
    'metaEntrega', v_meta,
    'minimoNotas', v_min,
    'total', (select count(*) from meus),
    'entregues', (select count(*) from meus where ok),
    'noPrazo', (select count(*) from meus where prazo_ok),
    'comprovadas', (select count(*) from meus where comp),
    'abonadas', (select count(*) from baixas_notas a join baixas_uploads u on u.id = a.upload_id
                 where upper(btrim(a.motorista)) = v_mot and to_char(u.data_referencia, 'YYYY-MM') = v_mes and a.abono_motivo is not null),
    'pontos', (select round(pontos, 1) from pts where mot = v_mot),
    'posicao', (select pos from rk where mot = v_mot),
    'noRanking', (select count(*) from rk),
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object('data', data_referencia, 'total', t, 'entregues', e, 'noPrazo', p, 'comprovadas', c) order by data_referencia desc)
      from (select data_referencia, count(*) t, count(*) filter (where ok) e, count(*) filter (where prazo_ok) p, count(*) filter (where comp) c
            from meus group by data_referencia) d
    ), '[]'::jsonb),
    -- Pendentes: não entregues e sem entrega dessa NF em outra planilha.
    'pendencias', coalesce((
      select jsonb_agg(jsonb_build_object('numero', m.numero, 'empresa', m.remetente, 'destinatario', m.destinatario, 'cidade', m.cidade,
               'emissao', m.data_emissao, 'dia', m.data_referencia, 'prazo', m.prazo) order by m.data_referencia, m.numero)
      from (select distinct on (baixas__nf(x.numero)) x.* from meus x
            where not x.ok
              and not exists (select 1 from baixas_notas o where baixas__nf(o.numero) = baixas__nf(x.numero)
                              and (baixas__entregue(o.situacao, o.entrega_tardia_em) or o.abono_motivo is not null))
            order by baixas__nf(x.numero), x.data_referencia desc) m
    ), '[]'::jsonb),
    'meses', coalesce((
      select jsonb_agg(m order by m desc) from (
        select distinct to_char(u.data_referencia, 'YYYY-MM') m
        from baixas_notas n2 join baixas_uploads u on u.id = n2.upload_id
        where upper(btrim(n2.motorista)) = v_mot
        order by 1 desc limit 12
      ) z
    ), '[]'::jsonb)
  ) into v_res;
  return v_res;
end;
$$;
revoke all on function motorista_baixas_painel(text, text) from public;
grant execute on function motorista_baixas_painel(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
