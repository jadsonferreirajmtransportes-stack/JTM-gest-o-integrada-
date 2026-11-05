-- 112: Performance das baixas — TROCAR O DIA de uma importação já feita (ex.: ficou com a data da
-- emissão em vez do dia das entregas). Recalcula o "no prazo" das entregas registradas à mão
-- (que depende do dia) e os totais. Não deixa ficar dois dias iguais do mesmo responsável/base.
-- Gestão (baixas_trocar_dia) e link pessoal do responsável (portal_baixas_trocar_dia).
-- Rodar no dev e na produção ANTES de publicar.

create or replace function baixas__trocar_dia(p_upload text, p_data date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u baixas_uploads;
begin
  select * into u from baixas_uploads where id = p_upload;
  if u.id is null then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  if p_data is null or p_data > current_date + 1 or p_data < current_date - 400 then return jsonb_build_object('erro', 'data'); end if;
  if exists (select 1 from baixas_uploads o where o.id <> u.id and lower(o.responsavel) = lower(u.responsavel) and o.base = u.base and o.data_referencia = p_data) then
    return jsonb_build_object('erro', 'ja_existe');
  end if;
  update baixas_uploads set data_referencia = p_data where id = u.id;
  update baixas_notas set entrega_tardia_no_prazo = (entrega_tardia_em at time zone 'America/Fortaleza')::date <= p_data
  where upload_id = u.id and entrega_tardia_em is not null;
  perform baixas__recontar(u.id);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function baixas__trocar_dia(text, date) from public;

create or replace function baixas_trocar_dia(p_upload text, p_data date)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select baixas__trocar_dia(p_upload, p_data)
$$;
revoke all on function baixas_trocar_dia(text, date) from public;
grant execute on function baixas_trocar_dia(text, date) to authenticated;

create or replace function portal_baixas_trocar_dia(p_token text, p_cpf text, p_nascimento date, p_upload text, p_data date)
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
  return baixas__trocar_dia(p_upload, p_data);
end;
$$;
revoke all on function portal_baixas_trocar_dia(text, text, date, text, date) from public;
grant execute on function portal_baixas_trocar_dia(text, text, date, text, date) to anon, authenticated;

notify pgrst, 'reload schema';
