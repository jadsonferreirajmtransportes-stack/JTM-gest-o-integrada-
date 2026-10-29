-- ============================================================================
-- Base do colaborador no Controle de Frequência: cada colaborador pode ficar
-- atrelado a UMA base (ponto_locais). Quem tem base: a batida é medida até a base
-- DELE (bater o ponto em outra base aparece como "longe da base"). Quem não tem:
-- continua como antes — base ativa mais próxima.
-- ============================================================================

create table if not exists ponto_colaborador_local (
  colaborador_id text primary key references colaboradores(id) on delete cascade,
  local_id text not null references ponto_locais(id) on delete cascade,
  atualizado_em timestamptz not null default now()
);

alter table ponto_colaborador_local enable row level security;
drop policy if exists ponto_colaborador_local_auth on ponto_colaborador_local;
create policy ponto_colaborador_local_auth on ponto_colaborador_local for all to authenticated using (true) with check (true);

-- Mesma função da 062; só muda a escolha da base (a do colaborador, quando existir).
create or replace function ponto_registrar(p_token text, p_dispositivo text, p_latitude double precision, p_longitude double precision, p_precisao double precision, p_navegador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  v_local_nome text;
  v_distancia double precision;
  v_base text;
  v_id text := 'bat-' || replace(gen_random_uuid()::text, '-', '');
begin
  select * into v from ponto__colaborador(p_token, p_dispositivo);
  if v.colaborador_id is null then return jsonb_build_object('erro', 'dispositivo'); end if;
  if exists (
    select 1 from ponto_registros
    where colaborador_id = v.colaborador_id and not anulado and origem = 'celular' and registrado_em > now() - interval '2 minutes'
  ) then
    return jsonb_build_object('erro', 'repetida');
  end if;

  select pl.local_id into v_base from ponto_colaborador_local pl where pl.colaborador_id = v.colaborador_id;

  if p_latitude is not null and p_longitude is not null then
    select l.nome, round(ponto__distancia_m(p_latitude, p_longitude, l.latitude, l.longitude)::numeric)::double precision
      into v_local_nome, v_distancia
      from ponto_locais l
      where (v_base is not null and l.id = v_base) or (v_base is null and l.ativo)
      order by ponto__distancia_m(p_latitude, p_longitude, l.latitude, l.longitude)
      limit 1;
  end if;

  insert into ponto_registros (id, colaborador_id, registrado_em, origem, latitude, longitude, precisao_m, local_nome, distancia_m, dispositivo_id, navegador)
  values (v_id, v.colaborador_id, now(), 'celular', p_latitude, p_longitude, p_precisao, v_local_nome, v_distancia, v.dispositivo_id, left(coalesce(p_navegador, ''), 500));
  update ponto_dispositivos set ultimo_uso = now() where id = v.dispositivo_id;

  return jsonb_build_object('id', v_id, 'em', now(), 'local', v_local_nome, 'distancia', v_distancia);
end;
$$;

revoke all on function ponto_registrar(text, text, double precision, double precision, double precision, text) from public;
grant execute on function ponto_registrar(text, text, double precision, double precision, double precision, text) to anon, authenticated;
