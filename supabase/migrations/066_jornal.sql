-- ============================================================================
-- Jornal JMT (2026-10-03): notícias da empresa no estilo blog, para os
-- colaboradores — decisões:
--   - leitura pelo link pessoal do portal (?form=portal&token=, aba "Jornal"),
--     com CPF + nascimento, igual ao Portal de Educação;
--   - supervisores sugerem (status 'sugerida'), o administrador revisa e publica;
--   - o colaborador reage (curtir, parabéns...) e comenta; comentário só aparece
--     para os outros depois que o administrador aprova;
--   - texto livre com imagens (blocos de texto e de imagens).
--
-- Segurança: anon não lê nenhuma tabela; o portal só passa pelas funções abaixo,
-- que conferem o link + CPF + nascimento (portal__colaborador, da 061) e devolvem
-- só notícias publicadas, contagens, comentários aprovados e o primeiro nome +
-- inicial do sobrenome de quem comentou.
-- As imagens ficam no bucket PÚBLICO "jornal" (caminho impossível de adivinhar);
-- não colocar documentos ou dado pessoal sensível nelas, e só publicar foto de
-- pessoa com autorização de uso de imagem.
-- ============================================================================

create table if not exists noticias (
  id text primary key,
  titulo text not null,
  resumo text,                       -- linha fina (aparece na lista)
  categoria text not null default 'Notícias',
  capa text,                         -- URL da imagem (bucket "jornal"); vazio = capa automática
  blocos jsonb not null default '[]'::jsonb, -- [{id, tipo:'texto', texto} | {id, tipo:'imagens', telas:[...]}]
  status text not null default 'rascunho', -- 'rascunho' | 'sugerida' | 'publicada' | 'arquivada'
  destaque boolean not null default false, -- fixada no topo
  permite_comentarios boolean not null default true,
  autor_nome text,                   -- assinatura que aparece na notícia (ex.: "Comunicação JMT")
  criado_por text,                   -- login que criou / sugeriu
  revisado_por text,
  observacao_revisao text,           -- motivo de devolução de uma sugestão
  autorizacao_imagem boolean not null default false, -- quem publicou confirmou a autorização das fotos
  publicada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_noticias_status on noticias(status, publicada_em desc);

create table if not exists noticia_reacoes (
  noticia_id text not null references noticias(id) on delete cascade,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  tipo text not null,                -- 'curtir' | 'parabens' | 'amei' | 'apoio'
  criado_em timestamptz not null default now(),
  primary key (noticia_id, colaborador_id)
);

create table if not exists noticia_comentarios (
  id text primary key,
  noticia_id text not null references noticias(id) on delete cascade,
  colaborador_id text references colaboradores(id) on delete set null,
  autor_nome text not null,          -- nome curto (primeiro nome + inicial)
  texto text not null,
  status text not null default 'pendente', -- 'pendente' | 'aprovado' | 'oculto'
  moderado_por text,
  moderado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists idx_noticia_comentarios_noticia on noticia_comentarios(noticia_id, criado_em);

create table if not exists noticia_leituras (
  noticia_id text not null references noticias(id) on delete cascade,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (noticia_id, colaborador_id)
);

alter table noticias enable row level security;
alter table noticia_reacoes enable row level security;
alter table noticia_comentarios enable row level security;
alter table noticia_leituras enable row level security;
drop policy if exists noticias_auth on noticias;
create policy noticias_auth on noticias for all to authenticated using (true) with check (true);
drop policy if exists noticia_reacoes_auth on noticia_reacoes;
create policy noticia_reacoes_auth on noticia_reacoes for all to authenticated using (true) with check (true);
drop policy if exists noticia_comentarios_auth on noticia_comentarios;
create policy noticia_comentarios_auth on noticia_comentarios for all to authenticated using (true) with check (true);
drop policy if exists noticia_leituras_auth on noticia_leituras;
create policy noticia_leituras_auth on noticia_leituras for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('jornal', 'jornal', true, 10485760) -- 10MB por imagem
on conflict (id) do update set public = true, file_size_limit = 10485760;
drop policy if exists jornal_bucket_insert on storage.objects;
create policy jornal_bucket_insert on storage.objects for insert to authenticated with check (bucket_id = 'jornal');
drop policy if exists jornal_bucket_update on storage.objects;
create policy jornal_bucket_update on storage.objects for update to authenticated using (bucket_id = 'jornal') with check (bucket_id = 'jornal');
drop policy if exists jornal_bucket_delete on storage.objects;
create policy jornal_bucket_delete on storage.objects for delete to authenticated using (bucket_id = 'jornal');

-- ---------------------------------------------------------------------------
-- Funções do portal (sem login)
-- ---------------------------------------------------------------------------

-- "Marcos Andrade Silva" -> "Marcos S."
create or replace function jornal__nome_curto(p_nome text)
returns text
language sql
immutable
as $$
  select case
    when p_nome is null or btrim(p_nome) = '' then 'Colaborador'
    when array_length(regexp_split_to_array(btrim(p_nome), '\s+'), 1) = 1 then initcap(btrim(p_nome))
    else initcap(split_part(btrim(p_nome), ' ', 1)) || ' ' ||
         upper(left((regexp_split_to_array(btrim(p_nome), '\s+'))[array_length(regexp_split_to_array(btrim(p_nome), '\s+'), 1)], 1)) || '.'
  end
$$;

-- Lista das notícias publicadas (sem o corpo — o corpo vem em portal_noticia).
create or replace function portal_jornal(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then
    return jsonb_build_object('erro', 'dados');
  end if;
  return jsonb_build_object('noticias', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id,
      'titulo', n.titulo,
      'resumo', n.resumo,
      'categoria', n.categoria,
      'capa', n.capa,
      'destaque', n.destaque,
      'autorNome', n.autor_nome,
      'publicadaEm', n.publicada_em,
      'reacoes', (select coalesce(jsonb_object_agg(r.tipo, r.qtd), '{}'::jsonb) from (select tipo, count(*) qtd from noticia_reacoes where noticia_id = n.id group by tipo) r),
      'minhaReacao', (select tipo from noticia_reacoes where noticia_id = n.id and colaborador_id = v_colab),
      'comentarios', (select count(*) from noticia_comentarios where noticia_id = n.id and status = 'aprovado'),
      'lida', exists (select 1 from noticia_leituras where noticia_id = n.id and colaborador_id = v_colab)
    ) order by n.destaque desc, n.publicada_em desc)
    from (select * from noticias where status = 'publicada' order by destaque desc, publicada_em desc limit 60) n
  ), '[]'::jsonb));
end;
$$;

-- Uma notícia completa: corpo, comentários aprovados (+ os meus pendentes). Registra a leitura.
create or replace function portal_noticia(p_token text, p_cpf text, p_nascimento date, p_noticia_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  n noticias%rowtype;
begin
  if v_colab is null then
    return jsonb_build_object('erro', 'dados');
  end if;
  select * into n from noticias where id = p_noticia_id and status = 'publicada';
  if not found then
    return jsonb_build_object('erro', 'noticia');
  end if;
  insert into noticia_leituras (noticia_id, colaborador_id) values (n.id, v_colab) on conflict do nothing;
  return jsonb_build_object(
    'id', n.id,
    'titulo', n.titulo,
    'resumo', n.resumo,
    'categoria', n.categoria,
    'capa', n.capa,
    'blocos', n.blocos,
    'autorNome', n.autor_nome,
    'publicadaEm', n.publicada_em,
    'permiteComentarios', n.permite_comentarios,
    'reacoes', (select coalesce(jsonb_object_agg(r.tipo, r.qtd), '{}'::jsonb) from (select tipo, count(*) qtd from noticia_reacoes where noticia_id = n.id group by tipo) r),
    'minhaReacao', (select tipo from noticia_reacoes where noticia_id = n.id and colaborador_id = v_colab),
    'comentarios', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'autorNome', c.autor_nome, 'texto', c.texto, 'criadoEm', c.criado_em, 'pendente', c.status = 'pendente', 'meu', c.colaborador_id = v_colab) order by c.criado_em)
      from noticia_comentarios c
      where c.noticia_id = n.id and (c.status = 'aprovado' or (c.status = 'pendente' and c.colaborador_id = v_colab))
    ), '[]'::jsonb)
  );
end;
$$;

-- Reage (ou tira a reação, com p_tipo nulo/vazio). Devolve as contagens novas.
create or replace function portal_reagir(p_token text, p_cpf text, p_nascimento date, p_noticia_id text, p_tipo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then
    return jsonb_build_object('erro', 'dados');
  end if;
  if not exists (select 1 from noticias where id = p_noticia_id and status = 'publicada') then
    return jsonb_build_object('erro', 'noticia');
  end if;
  if coalesce(p_tipo, '') = '' then
    delete from noticia_reacoes where noticia_id = p_noticia_id and colaborador_id = v_colab;
  elsif p_tipo in ('curtir', 'parabens', 'amei', 'apoio') then
    insert into noticia_reacoes (noticia_id, colaborador_id, tipo) values (p_noticia_id, v_colab, p_tipo)
    on conflict (noticia_id, colaborador_id) do update set tipo = excluded.tipo, criado_em = now();
  else
    return jsonb_build_object('erro', 'tipo');
  end if;
  return jsonb_build_object(
    'reacoes', (select coalesce(jsonb_object_agg(r.tipo, r.qtd), '{}'::jsonb) from (select tipo, count(*) qtd from noticia_reacoes where noticia_id = p_noticia_id group by tipo) r),
    'minhaReacao', (select tipo from noticia_reacoes where noticia_id = p_noticia_id and colaborador_id = v_colab)
  );
end;
$$;

-- Comenta (fica pendente até o administrador aprovar). Limites contra abuso:
-- 1 a 1000 caracteres e no máximo 3 comentários pendentes por pessoa na notícia.
create or replace function portal_comentar(p_token text, p_cpf text, p_nascimento date, p_noticia_id text, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_texto text := btrim(coalesce(p_texto, ''));
  v_id text;
  v_nome text;
begin
  if v_colab is null then
    return jsonb_build_object('erro', 'dados');
  end if;
  if not exists (select 1 from noticias where id = p_noticia_id and status = 'publicada' and permite_comentarios) then
    return jsonb_build_object('erro', 'noticia');
  end if;
  if length(v_texto) < 1 or length(v_texto) > 1000 then
    return jsonb_build_object('erro', 'tamanho');
  end if;
  if (select count(*) from noticia_comentarios where noticia_id = p_noticia_id and colaborador_id = v_colab and status = 'pendente') >= 3 then
    return jsonb_build_object('erro', 'limite');
  end if;
  select jornal__nome_curto(nome_completo) into v_nome from colaboradores where id = v_colab;
  v_id := 'com-' || replace(gen_random_uuid()::text, '-', '');
  insert into noticia_comentarios (id, noticia_id, colaborador_id, autor_nome, texto)
  values (v_id, p_noticia_id, v_colab, v_nome, v_texto);
  return jsonb_build_object('id', v_id, 'autorNome', v_nome, 'texto', v_texto, 'criadoEm', now(), 'pendente', true, 'meu', true);
end;
$$;

revoke all on function jornal__nome_curto(text) from public;
revoke all on function portal_jornal(text, text, date) from public;
revoke all on function portal_noticia(text, text, date, text) from public;
revoke all on function portal_reagir(text, text, date, text, text) from public;
revoke all on function portal_comentar(text, text, date, text, text) from public;
grant execute on function portal_jornal(text, text, date) to anon, authenticated;
grant execute on function portal_noticia(text, text, date, text) to anon, authenticated;
grant execute on function portal_reagir(text, text, date, text, text) to anon, authenticated;
grant execute on function portal_comentar(text, text, date, text, text) to anon, authenticated;
