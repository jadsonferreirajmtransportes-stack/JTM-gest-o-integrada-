-- 110: Performance das baixas — entrega registrada pelo responsável NO DIA DA PLANILHA conta como
-- "no prazo" (o motorista entregou, só a baixa ficou para depois). Se a data escolhida for depois
-- do dia da planilha, continua contando como entregue fora do prazo.
-- Rodar no dev e na produção ANTES de publicar.

alter table baixas_notas add column if not exists entrega_tardia_no_prazo boolean;

-- Marca sozinho ao registrar (gestão ou link pessoal): data da entrega <= dia da planilha.
create or replace function baixas__marcar_no_prazo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entrega_tardia_em is null then
    new.entrega_tardia_no_prazo := null;
  else
    new.entrega_tardia_no_prazo := (new.entrega_tardia_em at time zone 'America/Fortaleza')::date
      <= (select u.data_referencia from baixas_uploads u where u.id = new.upload_id);
  end if;
  return new;
end;
$$;
drop trigger if exists baixas_notas_marcar_no_prazo on baixas_notas;
create trigger baixas_notas_marcar_no_prazo
  before insert or update of entrega_tardia_em on baixas_notas
  for each row execute function baixas__marcar_no_prazo();

-- Notas já registradas.
update baixas_notas n set entrega_tardia_no_prazo = (n.entrega_tardia_em at time zone 'America/Fortaleza')::date <= u.data_referencia
from baixas_uploads u
where u.id = n.upload_id and n.entrega_tardia_em is not null;

-- No prazo: sem registro manual, vale o "Prazo" da planilha; com registro, vale a data escolhida.
create or replace function baixas__no_prazo(prazo text, tardia timestamptz, tardia_no_prazo boolean)
returns boolean language sql immutable as $f$
  select case when tardia is null then upper(coalesce(prazo, '')) = 'NO PRAZO' else coalesce(tardia_no_prazo, false) end
$f$;

create or replace function baixas__recontar(p_upload text)
returns void
language sql
security definer
set search_path = public
as $$
  update baixas_uploads u set
    total = c.total, entregues = c.entregues, comprovadas = c.comprovadas, no_prazo = c.no_prazo, abonadas = c.abonadas
  from (
    select count(*) filter (where abono_motivo is null) as total,
      count(*) filter (where abono_motivo is null and baixas__entregue(situacao, entrega_tardia_em)) as entregues,
      count(*) filter (where abono_motivo is null and upper(coalesce(status, '')) = 'COMPROVADO') as comprovadas,
      count(*) filter (where abono_motivo is null and baixas__no_prazo(prazo, entrega_tardia_em, entrega_tardia_no_prazo)) as no_prazo,
      count(*) filter (where abono_motivo is not null) as abonadas
    from baixas_notas where upload_id = p_upload
  ) c
  where u.id = p_upload
$$;
revoke all on function baixas__recontar(text) from public;

create or replace function baixas_resumo_mes(p_mes text, p_base text default null)
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
    select n.*, u.responsavel, u.base,
      baixas__entregue(n.situacao, n.entrega_tardia_em) as ok,
      upper(coalesce(n.status, '')) = 'COMPROVADO' as comp,
      baixas__no_prazo(n.prazo, n.entrega_tardia_em, n.entrega_tardia_no_prazo) as prazo_ok
    from baixas_notas n join u on u.id = n.upload_id
    where n.abono_motivo is null
  )
  select jsonb_build_object(
    'total', (select count(*) from n),
    'abonadas', (select count(*) from baixas_notas a join u on u.id = a.upload_id where a.abono_motivo is not null),
    'entregues', (select count(*) from n where ok),
    'comprovadas', (select count(*) from n where comp),
    'noPrazo', (select count(*) from n where prazo_ok),
    'motoristas', coalesce((
      select jsonb_agg(m order by m->>'total' desc) from (
        select jsonb_build_object(
          'motorista', coalesce(nullif(btrim(motorista), ''), 'Sem motorista'),
          'base', min(base),
          'total', count(*),
          'entregues', count(*) filter (where ok),
          'comprovadas', count(*) filter (where comp),
          'noPrazo', count(*) filter (where prazo_ok)
        ) m
        from n group by coalesce(nullif(btrim(motorista), ''), 'Sem motorista')
      ) x
    ), '[]'::jsonb),
    'responsaveis', coalesce((
      select jsonb_agg(r) from (
        select jsonb_build_object(
          'responsavel', min(n.responsavel),
          'base', min(n.base),
          'total', count(*),
          'entregues', count(*) filter (where ok),
          'comprovadas', count(*) filter (where comp),
          'noPrazo', count(*) filter (where prazo_ok),
          'dias', (select jsonb_agg(jsonb_build_object('data', u2.data_referencia, 'importadoEm', u2.criado_em) order by u2.data_referencia)
                   from u u2 where lower(u2.responsavel) = lower(min(n.responsavel)))
        ) r
        from n group by lower(n.responsavel)
      ) y
    ), '[]'::jsonb)
  )
$$;
grant execute on function baixas_resumo_mes(text, text) to authenticated;

create or replace function portal_baixas_notas(p_token text, p_cpf text, p_nascimento date, p_upload text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r baixas_responsaveis := baixas__responsavel(p_token, p_cpf, p_nascimento);
begin
  if r.colaborador_id is null then return jsonb_build_object('erro', 'sem_acesso'); end if;
  if not exists (select 1 from baixas_uploads u where u.id = p_upload and (u.colaborador_id = r.colaborador_id or lower(u.responsavel) = lower(r.nome))) then
    return jsonb_build_object('erro', 'nao_encontrada');
  end if;
  return jsonb_build_object('notas', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id, 'uploadId', n.upload_id, 'numero', n.numero, 'status', n.status, 'situacao', n.situacao, 'remetente', n.remetente,
      'destinatario', n.destinatario, 'cidade', n.cidade, 'transportadora', n.transportadora, 'romaneio', n.romaneio, 'motorista', n.motorista,
      'dataEmissao', n.data_emissao, 'dataEntrega', n.data_entrega, 'prazo', n.prazo, 'entregaTardiaEm', n.entrega_tardia_em, 'entregaTardiaPor', n.entrega_tardia_por, 'entregaTardiaNoPrazo', n.entrega_tardia_no_prazo,
      'abonoMotivo', n.abono_motivo, 'abonoObs', n.abono_obs, 'abonadoEm', n.abonado_em, 'abonadoPor', n.abonado_por
    ) order by n.numero)
    from baixas_notas n where n.upload_id = p_upload
  ), '[]'::jsonb));
end;
$$;

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
      baixas__no_prazo(n.prazo, n.entrega_tardia_em, n.entrega_tardia_no_prazo) as prazo_ok
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

-- Refaz os totais das importações.
do $$
declare
  x record;
begin
  for x in select id from baixas_uploads loop
    perform baixas__recontar(x.id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
