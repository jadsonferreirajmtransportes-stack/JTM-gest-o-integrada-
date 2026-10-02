-- ============================================================================
-- Controle de Frequência (CONTROLE INTERNO — o ponto oficial da empresa continua
-- no sistema atual; decisão do DP em 2026-10-02). O colaborador bate o ponto
-- pelo celular, no link pessoal do portal (?form=ponto&token=), e o horário é
-- sempre o do servidor (now()), nunca o do aparelho. Cada batida guarda a
-- localização (GPS) e a distância até a base mais próxima.
--
-- Login: na primeira vez o colaborador confirma CPF + data de nascimento e o
-- aparelho recebe um código secreto ("dispositivo") — só o hash fica no banco.
-- Nas próximas, basta o link + o aparelho. Gerar link novo no DP (portal_colaborador
-- com outro token) desconecta todos os aparelhos daquele colaborador.
--
-- Batidas nunca são apagadas: ajuste do DP entra como batida de origem 'ajuste'
-- (com motivo e autor) e correção de batida errada é "anular" (com motivo).
-- ============================================================================

-- Jornadas (horários do Regulamento Interno). Hora de saída menor que a de entrada
-- = jornada que vira a noite (termina no dia seguinte).
create table if not exists ponto_jornadas (
  id text primary key,
  nome text not null,
  dias_semana integer[] not null default '{1,2,3,4,5}', -- 0 = domingo ... 6 = sábado
  entrada time not null,
  saida_intervalo time,
  volta_intervalo time,
  saida time not null,
  tolerancia_min integer not null default 15,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists ponto_colaborador_jornada (
  colaborador_id text primary key references colaboradores(id) on delete cascade,
  jornada_id text not null references ponto_jornadas(id) on delete cascade,
  atualizado_em timestamptz not null default now()
);

-- Bases/locais de referência pra conferir a distância da batida.
create table if not exists ponto_locais (
  id text primary key,
  nome text not null,
  latitude double precision not null,
  longitude double precision not null,
  raio_m integer not null default 300,
  ativo boolean not null default true
);

create table if not exists ponto_dispositivos (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  segredo_hash text not null unique,
  portal_token text not null, -- token do link na hora do vínculo; link novo = aparelho desconectado
  aparelho text,
  criado_em timestamptz not null default now(),
  ultimo_uso timestamptz,
  revogado boolean not null default false
);
create index if not exists idx_ponto_dispositivos_colaborador on ponto_dispositivos(colaborador_id);

create table if not exists ponto_registros (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  registrado_em timestamptz not null default now(),
  origem text not null default 'celular', -- 'celular' | 'ajuste'
  latitude double precision,
  longitude double precision,
  precisao_m double precision,
  local_nome text,
  distancia_m double precision,
  dispositivo_id text,
  navegador text,
  motivo text,          -- ajuste: por que foi incluída
  criado_por text,      -- ajuste: quem incluiu
  anulado boolean not null default false,
  anulado_motivo text,
  anulado_por text,
  anulado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists idx_ponto_registros_colab_data on ponto_registros(colaborador_id, registrado_em);

-- Justificativa/abono de um dia inteiro (atestado, falta legal, folga, falta injustificada...).
create table if not exists ponto_justificativas (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  data date not null,
  tipo text not null,
  abona boolean not null default true, -- conta como dia cumprido (não é falta)
  observacao text,
  criado_por text,
  criado_em timestamptz not null default now(),
  unique (colaborador_id, data)
);

alter table ponto_jornadas enable row level security;
alter table ponto_colaborador_jornada enable row level security;
alter table ponto_locais enable row level security;
alter table ponto_dispositivos enable row level security;
alter table ponto_registros enable row level security;
alter table ponto_justificativas enable row level security;

drop policy if exists ponto_jornadas_auth on ponto_jornadas;
create policy ponto_jornadas_auth on ponto_jornadas for all to authenticated using (true) with check (true);
drop policy if exists ponto_colaborador_jornada_auth on ponto_colaborador_jornada;
create policy ponto_colaborador_jornada_auth on ponto_colaborador_jornada for all to authenticated using (true) with check (true);
drop policy if exists ponto_locais_auth on ponto_locais;
create policy ponto_locais_auth on ponto_locais for all to authenticated using (true) with check (true);
drop policy if exists ponto_dispositivos_auth on ponto_dispositivos;
create policy ponto_dispositivos_auth on ponto_dispositivos for all to authenticated using (true) with check (true);
-- Registros: o DP lê, inclui ajuste e anula — mas não apaga (sem policy de delete).
drop policy if exists ponto_registros_select on ponto_registros;
create policy ponto_registros_select on ponto_registros for select to authenticated using (true);
drop policy if exists ponto_registros_insert on ponto_registros;
create policy ponto_registros_insert on ponto_registros for insert to authenticated with check (origem = 'ajuste');
drop policy if exists ponto_registros_update on ponto_registros;
create policy ponto_registros_update on ponto_registros for update to authenticated using (true) with check (true);
drop policy if exists ponto_justificativas_auth on ponto_justificativas;
create policy ponto_justificativas_auth on ponto_justificativas for all to authenticated using (true) with check (true);

-- Atualização de batida só pode mexer na anulação (o horário/GPS original não muda).
create or replace function ponto__proteger_registro()
returns trigger
language plpgsql
as $$
begin
  if new.registrado_em is distinct from old.registrado_em
     or new.colaborador_id is distinct from old.colaborador_id
     or new.origem is distinct from old.origem
     or new.latitude is distinct from old.latitude
     or new.longitude is distinct from old.longitude then
    raise exception 'Batida de ponto não pode ser alterada — inclua um ajuste ou anule com motivo.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_ponto_proteger_registro on ponto_registros;
create trigger trg_ponto_proteger_registro before update on ponto_registros
  for each row execute function ponto__proteger_registro();

-- Jornadas do Regulamento Interno (revisão de outubro de 2026).
insert into ponto_jornadas (id, nome, dias_semana, entrada, saida_intervalo, volta_intervalo, saida) values
  ('jor-farma-rodoviario', 'Farma Rodoviário (motoristas e ajudantes)', '{2,3,4,5,6}', '06:00', '11:00', '12:12', '16:00'),
  ('jor-farma-aereo', 'Farma Aéreo (motoristas e ajudantes)', '{1,2,3,4,5}', '08:00', '12:00', '13:12', '18:00'),
  ('jor-escritorios', 'Farma Aéreo e Rodoviário (escritórios)', '{1,2,3,4,5}', '08:00', '12:00', '13:12', '18:00'),
  ('jor-qualidade', 'Qualidade (responsável técnica)', '{1,2,3,4,5}', '08:00', '12:00', '13:12', '18:00'),
  ('jor-asg', 'ASG', '{1,2,3,4,5}', '07:00', '11:00', '12:12', '17:00'),
  ('jor-noturno', 'Recebimento e expedição (noturno)', '{1,2,3,4,5}', '20:00', '00:00', '01:12', '05:10'),
  ('jor-transbordo', 'Transbordo (Natal x Mossoró)', '{2,3,4,5}', '00:00', '04:00', '05:00', '12:00'),
  ('jor-unimed', 'Operação Unimed', '{1,2,3,4,5}', '10:00', '14:00', '15:12', '20:00')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Funções do celular (anon). Distância em metros (haversine).
-- ---------------------------------------------------------------------------
create or replace function ponto__distancia_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- Colaborador do aparelho: o segredo confere, não foi revogado, o link ainda é o mesmo
-- e o colaborador está ativo.
create or replace function ponto__colaborador(p_token text, p_dispositivo text)
returns table (colaborador_id text, dispositivo_id text)
language sql
stable
security definer
set search_path = public
as $$
  select d.colaborador_id, d.id
  from ponto_dispositivos d
  join portal_colaborador p on p.colaborador_id = d.colaborador_id and p.token = d.portal_token
  join colaboradores c on c.id = d.colaborador_id
  where d.segredo_hash = encode(sha256(convert_to(coalesce(p_dispositivo, ''), 'UTF8')), 'hex')
    and p.token = p_token
    and not p.revogado
    and not d.revogado
    and coalesce(c.status, '') <> 'Inativo'
  limit 1
$$;
revoke all on function ponto__colaborador(text, text) from public;

-- Primeiro acesso no aparelho: confere CPF + nascimento (mesma regra do portal) e
-- devolve o segredo do aparelho (só aparece desta vez).
create or replace function ponto_vincular(p_token text, p_cpf text, p_nascimento date, p_aparelho text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_segredo text;
begin
  if v_colab is null then
    if not exists (select 1 from portal_colaborador where token = p_token and not revogado) then
      return jsonb_build_object('erro', 'link');
    end if;
    return jsonb_build_object('erro', 'dados');
  end if;
  v_segredo := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into ponto_dispositivos (id, colaborador_id, segredo_hash, portal_token, aparelho)
  values ('disp-' || replace(gen_random_uuid()::text, '-', ''), v_colab,
          encode(sha256(convert_to(v_segredo, 'UTF8')), 'hex'), p_token, left(coalesce(p_aparelho, ''), 300));
  return jsonb_build_object('dispositivo', v_segredo);
end;
$$;

-- Tela do celular: nome, jornada, batidas das últimas 30h e hora do servidor.
create or replace function ponto_estado(p_token text, p_dispositivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select * into v from ponto__colaborador(p_token, p_dispositivo);
  if v.colaborador_id is null then return jsonb_build_object('erro', 'dispositivo'); end if;
  update ponto_dispositivos set ultimo_uso = now() where id = v.dispositivo_id;
  return jsonb_build_object(
    'agora', now(),
    'colaborador', (select jsonb_build_object('nome', c.nome_completo, 'cargo', c.funcao_cargo) from colaboradores c where c.id = v.colaborador_id),
    'jornada', (select to_jsonb(j) from ponto_colaborador_jornada cj join ponto_jornadas j on j.id = cj.jornada_id where cj.colaborador_id = v.colaborador_id),
    'batidas', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'em', r.registrado_em, 'local', r.local_nome, 'distancia', r.distancia_m, 'origem', r.origem) order by r.registrado_em)
      from ponto_registros r
      where r.colaborador_id = v.colaborador_id and not r.anulado and r.registrado_em > now() - interval '30 hours'
    ), '[]'::jsonb)
  );
end;
$$;

-- Bate o ponto. Horário = now() do servidor. Recusa batida repetida em menos de 2 minutos.
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

  if p_latitude is not null and p_longitude is not null then
    select l.nome, round(ponto__distancia_m(p_latitude, p_longitude, l.latitude, l.longitude)::numeric)::double precision
      into v_local_nome, v_distancia
      from ponto_locais l where l.ativo
      order by ponto__distancia_m(p_latitude, p_longitude, l.latitude, l.longitude)
      limit 1;
  end if;

  insert into ponto_registros (id, colaborador_id, registrado_em, origem, latitude, longitude, precisao_m, local_nome, distancia_m, dispositivo_id, navegador)
  values (v_id, v.colaborador_id, now(), 'celular', p_latitude, p_longitude, p_precisao, v_local_nome, v_distancia, v.dispositivo_id, left(coalesce(p_navegador, ''), 500));
  update ponto_dispositivos set ultimo_uso = now() where id = v.dispositivo_id;

  return jsonb_build_object('id', v_id, 'em', now(), 'local', v_local_nome, 'distancia', v_distancia);
end;
$$;

revoke all on function ponto_vincular(text, text, date, text) from public;
revoke all on function ponto_estado(text, text) from public;
revoke all on function ponto_registrar(text, text, double precision, double precision, double precision, text) from public;
grant execute on function ponto_vincular(text, text, date, text) to anon, authenticated;
grant execute on function ponto_estado(text, text) to anon, authenticated;
grant execute on function ponto_registrar(text, text, double precision, double precision, double precision, text) to anon, authenticated;
