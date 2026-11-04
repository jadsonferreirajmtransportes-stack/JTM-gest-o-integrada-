-- 100: Performance das baixas pelo LINK PESSOAL do responsável (colaborador do escritório).
-- A gestão escolhe quem são os responsáveis (baixas_responsaveis: colaborador + nome usado nos
-- relatórios + base). Essas pessoas veem "Baixas do dia" no portal: importam a planilha do dia,
-- veem a auditoria SÓ das próprias importações e registram entrega tardia.
-- Depende da 099. Rodar no dev e na produção ANTES de publicar.

create table if not exists baixas_responsaveis (
  colaborador_id text primary key references colaboradores(id) on delete cascade,
  nome text not null,          -- como aparece nos relatórios (ex.: KELY)
  base text not null default 'Matriz',
  criado_em timestamptz not null default now()
);
alter table baixas_responsaveis enable row level security;
drop policy if exists baixas_responsaveis_auth on baixas_responsaveis;
create policy baixas_responsaveis_auth on baixas_responsaveis for all to authenticated using (true) with check (true);

alter table baixas_uploads add column if not exists colaborador_id text;
alter table baixas_uploads add column if not exists origem text not null default 'gestao';

-- Recalcula os totais de uma importação.
create or replace function baixas__recontar(p_upload text)
returns void
language sql
security definer
set search_path = public
as $$
  update baixas_uploads u set
    total = c.total, entregues = c.entregues, comprovadas = c.comprovadas, no_prazo = c.no_prazo
  from (
    select count(*) as total,
      count(*) filter (where baixas__entregue(situacao, entrega_tardia_em)) as entregues,
      count(*) filter (where upper(coalesce(status, '')) = 'COMPROVADO') as comprovadas,
      count(*) filter (where upper(coalesce(prazo, '')) = 'NO PRAZO' and entrega_tardia_em is null) as no_prazo
    from baixas_notas where upload_id = p_upload
  ) c
  where u.id = p_upload
$$;
revoke all on function baixas__recontar(text) from public;

-- Quem está acessando (responsável cadastrado) ou null.
create or replace function baixas__responsavel(p_token text, p_cpf text, p_nascimento date)
returns baixas_responsaveis
language sql
stable
security definer
set search_path = public
as $$
  select r.* from baixas_responsaveis r where r.colaborador_id = portal__colaborador(p_token, p_cpf, p_nascimento)
$$;
revoke all on function baixas__responsavel(text, text, date) from public;

-- Estado: se pode usar e as importações da pessoa (últimos 120 dias).
create or replace function portal_baixas_estado(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r baixas_responsaveis;
begin
  if portal__colaborador(p_token, p_cpf, p_nascimento) is null then return jsonb_build_object('erro', 'dados'); end if;
  r := baixas__responsavel(p_token, p_cpf, p_nascimento);
  if r.colaborador_id is null then return jsonb_build_object('permitido', false); end if;
  return jsonb_build_object(
    'permitido', true,
    'nome', r.nome,
    'base', r.base,
    'uploads', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id, 'responsavel', u.responsavel, 'base', u.base, 'dataReferencia', u.data_referencia, 'arquivoNome', u.arquivo_nome,
        'total', u.total, 'entregues', u.entregues, 'comprovadas', u.comprovadas, 'noPrazo', u.no_prazo, 'criadoEm', u.criado_em
      ) order by u.data_referencia desc)
      from baixas_uploads u
      where (u.colaborador_id = r.colaborador_id or lower(u.responsavel) = lower(r.nome))
        and u.data_referencia >= current_date - 120
    ), '[]'::jsonb)
  );
end;
$$;

-- Importa a planilha do dia (as notas já lidas no celular/computador). Substitui a do mesmo dia.
create or replace function portal_baixas_importar(p_token text, p_cpf text, p_nascimento date, p_data date, p_arquivo text, p_notas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r baixas_responsaveis;
  v_id text := 'bxu-' || replace(gen_random_uuid()::text, '-', '');
  v_nome text;
begin
  if portal__colaborador(p_token, p_cpf, p_nascimento) is null then return jsonb_build_object('erro', 'dados'); end if;
  r := baixas__responsavel(p_token, p_cpf, p_nascimento);
  if r.colaborador_id is null then return jsonb_build_object('erro', 'sem_acesso'); end if;
  if p_data is null or p_data > current_date + 1 or p_data < current_date - 60 then return jsonb_build_object('erro', 'data'); end if;
  if jsonb_typeof(p_notas) <> 'array' or jsonb_array_length(p_notas) = 0 or jsonb_array_length(p_notas) > 5000 then return jsonb_build_object('erro', 'notas'); end if;
  select nome_completo into v_nome from colaboradores where id = r.colaborador_id;
  delete from baixas_uploads where lower(responsavel) = lower(r.nome) and data_referencia = p_data and base = r.base;
  insert into baixas_uploads (id, responsavel, base, data_referencia, arquivo_nome, criado_por, colaborador_id, origem)
  values (v_id, r.nome, r.base, p_data, left(p_arquivo, 200), coalesce(v_nome, r.nome), r.colaborador_id, 'portal');
  insert into baixas_notas (id, upload_id, numero, status, situacao, remetente, destinatario, cidade, transportadora, romaneio, motorista, data_emissao, data_entrega, prazo)
  select 'bxn-' || replace(gen_random_uuid()::text, '-', ''), v_id,
    left(n->>'numero', 40), left(n->>'status', 40), left(n->>'situacao', 40), left(n->>'remetente', 200), left(n->>'destinatario', 200),
    left(n->>'cidade', 100), left(n->>'transportadora', 200), left(n->>'romaneio', 60), left(n->>'motorista', 120),
    nullif(n->>'dataEmissao', '')::timestamptz, nullif(n->>'dataEntrega', '')::timestamptz, left(n->>'prazo', 20)
  from jsonb_array_elements(p_notas) n
  where coalesce(n->>'numero', '') <> '';
  perform baixas__recontar(v_id);
  return jsonb_build_object('id', v_id);
end;
$$;

-- Notas de uma importação da própria pessoa.
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
      'dataEmissao', n.data_emissao, 'dataEntrega', n.data_entrega, 'prazo', n.prazo, 'entregaTardiaEm', n.entrega_tardia_em, 'entregaTardiaPor', n.entrega_tardia_por
    ) order by n.numero)
    from baixas_notas n where n.upload_id = p_upload
  ), '[]'::jsonb));
end;
$$;

-- Registra a entrega tardia de um pendente (da própria importação).
create or replace function portal_baixas_tardia(p_token text, p_cpf text, p_nascimento date, p_nota text, p_quando timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r baixas_responsaveis := baixas__responsavel(p_token, p_cpf, p_nascimento);
  v_upload text;
begin
  if r.colaborador_id is null then return jsonb_build_object('erro', 'sem_acesso'); end if;
  select n.upload_id into v_upload from baixas_notas n join baixas_uploads u on u.id = n.upload_id
    where n.id = p_nota and (u.colaborador_id = r.colaborador_id or lower(u.responsavel) = lower(r.nome));
  if v_upload is null then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  if p_quando is null or p_quando > now() + interval '1 hour' then return jsonb_build_object('erro', 'data'); end if;
  update baixas_notas set entrega_tardia_em = p_quando, entrega_tardia_por = r.nome where id = p_nota;
  perform baixas__recontar(v_upload);
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function portal_baixas_estado(text, text, date) from public;
revoke all on function portal_baixas_importar(text, text, date, date, text, jsonb) from public;
revoke all on function portal_baixas_notas(text, text, date, text) from public;
revoke all on function portal_baixas_tardia(text, text, date, text, timestamptz) from public;
grant execute on function portal_baixas_estado(text, text, date) to anon, authenticated;
grant execute on function portal_baixas_importar(text, text, date, date, text, jsonb) to anon, authenticated;
grant execute on function portal_baixas_notas(text, text, date, text) to anon, authenticated;
grant execute on function portal_baixas_tardia(text, text, date, text, timestamptz) to anon, authenticated;

notify pgrst, 'reload schema';
