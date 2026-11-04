-- 102: Performance das baixas — ABONO de pendência (expedição, local fechado, sem recebedor...).
-- Nota abonada sai da conta: não pesa contra o motorista nem contra o responsável (fica fora do
-- total). Guarda motivo, observação, quem e quando; dá para desfazer.
-- Também no link pessoal do responsável (portal_baixas_abonar).
-- Rodar no dev e na produção ANTES de publicar.

alter table baixas_notas add column if not exists abono_motivo text;
alter table baixas_notas add column if not exists abono_obs text;
alter table baixas_notas add column if not exists abonado_em timestamptz;
alter table baixas_notas add column if not exists abonado_por text;
alter table baixas_uploads add column if not exists abonadas integer not null default 0;

-- Totais da importação sem as abonadas (e a contagem delas).
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
      count(*) filter (where abono_motivo is null and upper(coalesce(prazo, '')) = 'NO PRAZO' and entrega_tardia_em is null) as no_prazo,
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
      upper(coalesce(n.prazo, '')) = 'NO PRAZO' and n.entrega_tardia_em is null as prazo_ok
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

-- Notas da importação (agora com o abono).
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
      'dataEmissao', n.data_emissao, 'dataEntrega', n.data_entrega, 'prazo', n.prazo, 'entregaTardiaEm', n.entrega_tardia_em, 'entregaTardiaPor', n.entrega_tardia_por,
      'abonoMotivo', n.abono_motivo, 'abonoObs', n.abono_obs, 'abonadoEm', n.abonado_em, 'abonadoPor', n.abonado_por
    ) order by n.numero)
    from baixas_notas n where n.upload_id = p_upload
  ), '[]'::jsonb));
end;
$$;

-- Abona (ou desfaz, com p_motivo vazio) uma nota da própria importação.
create or replace function portal_baixas_abonar(p_token text, p_cpf text, p_nascimento date, p_nota text, p_motivo text, p_obs text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r baixas_responsaveis := baixas__responsavel(p_token, p_cpf, p_nascimento);
  v_upload text;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if r.colaborador_id is null then return jsonb_build_object('erro', 'sem_acesso'); end if;
  select n.upload_id into v_upload from baixas_notas n join baixas_uploads u on u.id = n.upload_id
    where n.id = p_nota and (u.colaborador_id = r.colaborador_id or lower(u.responsavel) = lower(r.nome));
  if v_upload is null then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  update baixas_notas set
    abono_motivo = left(v_motivo, 80),
    abono_obs = case when v_motivo is null then null else left(nullif(btrim(coalesce(p_obs, '')), ''), 500) end,
    abonado_em = case when v_motivo is null then null else now() end,
    abonado_por = case when v_motivo is null then null else r.nome end
  where id = p_nota;
  perform baixas__recontar(v_upload);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function portal_baixas_abonar(text, text, date, text, text, text) from public;
grant execute on function portal_baixas_abonar(text, text, date, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
