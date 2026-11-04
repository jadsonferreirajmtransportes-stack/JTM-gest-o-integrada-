-- 099: Farma Rodoviário — Performance das baixas.
-- O escritório importa, todo dia, a planilha "Relatório de documentos" (baixas dos motoristas).
-- Cada importação = um responsável + uma data de referência + uma base; as notas ficam em
-- baixas_notas. Os painéis mensais (pódio, rankings) são calculados no banco
-- (baixas_resumo_mes), para não baixar dezenas de milhares de notas no navegador.
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists baixas_uploads (
  id text primary key,
  responsavel text not null,
  base text not null default 'Matriz',
  data_referencia date not null,
  arquivo_nome text,
  total integer not null default 0,
  entregues integer not null default 0,
  comprovadas integer not null default 0,
  no_prazo integer not null default 0,
  criado_por text,
  criado_em timestamptz not null default now()
);
create unique index if not exists baixas_uploads_resp_dia on baixas_uploads (lower(responsavel), data_referencia, base);
create index if not exists baixas_uploads_data on baixas_uploads (data_referencia);

create table if not exists baixas_notas (
  id text primary key,
  upload_id text not null references baixas_uploads(id) on delete cascade,
  numero text not null,
  status text,           -- COMPROVADO | ROTA | AUDITORIA ...
  situacao text,         -- ENTREGA_NORMAL | PENDENTE | DEVOLUCAO ...
  remetente text,
  destinatario text,
  cidade text,
  transportadora text,
  romaneio text,
  motorista text,
  data_emissao timestamptz,
  data_entrega timestamptz,
  prazo text,            -- NO PRAZO | FORA PRAZO
  entrega_tardia_em timestamptz,  -- pendente que o escritório registrou como entregue depois
  entrega_tardia_por text
);
create index if not exists baixas_notas_upload on baixas_notas (upload_id);
create index if not exists baixas_notas_numero on baixas_notas (numero);

alter table baixas_uploads enable row level security;
alter table baixas_notas enable row level security;
drop policy if exists baixas_uploads_auth on baixas_uploads;
create policy baixas_uploads_auth on baixas_uploads for all to authenticated using (true) with check (true);
drop policy if exists baixas_notas_auth on baixas_notas;
create policy baixas_notas_auth on baixas_notas for all to authenticated using (true) with check (true);

-- Regras de contagem (iguais às do app):
--   entregue    = situação diferente de PENDENTE e DEVOLUÇÃO, ou entrega tardia registrada
--   comprovada  = status COMPROVADO
--   no prazo    = prazo 'NO PRAZO' (entrega tardia conta como fora do prazo)
create or replace function baixas__entregue(situacao text, tardia timestamptz)
returns boolean language sql immutable as $$
  select tardia is not null or upper(coalesce(situacao, '')) not in ('PENDENTE', 'DEVOLUCAO', 'DEVOLUÇÃO', '')
$$;

-- Resumo do mês (e base): totais, por motorista e por responsável (com os dias importados).
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
  )
  select jsonb_build_object(
    'total', (select count(*) from n),
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

notify pgrst, 'reload schema';
