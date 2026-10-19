-- ============================================================================
-- 078 — Notificações no celular (Web Push) dos apps JMT Gestão e JMT Colaborador.
--
-- push_inscricoes: cada aparelho que ativou os avisos (colaborador pelo portal
--   ou usuário do sistema interno).
-- push_config: chaves VAPID e o endereço da função "enviar-push" — preenchidos
--   pela própria função na primeira vez que roda (ninguém digita chave).
-- push_enviados: evita mandar o mesmo aviso duas vezes.
-- Gatilhos chamam a função (via pg_net) quando há:
--   documento novo para assinar, comunicado novo, notícia publicada no Jornal
--   e mensagem nova no chat.
-- Nada disso trava a gravação normal: se o aviso falhar, a operação segue.
-- Rodar no SQL Editor do dev e da PRODUÇÃO (ref pvjdypqwkvgwhbhzsphb).
-- ============================================================================

create extension if not exists pg_net;

create table if not exists push_config (
  id integer primary key default 1 check (id = 1),
  vapid_publica text,
  vapid_privada text,
  funcao_url text,
  atualizado_em timestamptz not null default now()
);
alter table push_config enable row level security; -- sem políticas: só a função (service role) lê

create table if not exists push_inscricoes (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  tipo text not null, -- 'colaborador' | 'usuario'
  colaborador_id text references colaboradores(id) on delete cascade,
  usuario_id text references usuarios(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_push_inscricoes_colab on push_inscricoes(colaborador_id);
create index if not exists idx_push_inscricoes_usuario on push_inscricoes(usuario_id);
alter table push_inscricoes enable row level security;
drop policy if exists push_inscricoes_auth on push_inscricoes;
create policy push_inscricoes_auth on push_inscricoes for all to authenticated using (true) with check (true);
grant select, insert, update, delete on table push_inscricoes to authenticated;

create table if not exists push_enviados (
  evento text not null,
  ref_id text not null,
  enviado_em timestamptz not null default now(),
  primary key (evento, ref_id)
);
alter table push_enviados enable row level security;

-- Portal: o colaborador ativa os avisos no próprio aparelho (mesma checagem do portal).
create or replace function portal_push_inscrever(p_token text, p_cpf text, p_nascimento date, p_endpoint text, p_p256dh text, p_auth text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text;
begin
  v_colab := portal__colaborador(p_token, p_cpf, p_nascimento);
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    return jsonb_build_object('erro', 'inscricao');
  end if;
  insert into push_inscricoes (endpoint, p256dh, auth, tipo, colaborador_id, usuario_id, atualizado_em)
  values (p_endpoint, p_p256dh, p_auth, 'colaborador', v_colab, null, now())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, tipo = 'colaborador', colaborador_id = v_colab, usuario_id = null, atualizado_em = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function portal_push_inscrever(text, text, date, text, text, text) from public;
grant execute on function portal_push_inscrever(text, text, date, text, text, text) to anon, authenticated;

-- Chama a função de envio (assíncrono, não trava a gravação).
create or replace function push__disparar(p_evento text, p_ref text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  select funcao_url into v_url from push_config where id = 1;
  if v_url is null then return; end if;
  if not exists (select 1 from push_inscricoes) then return; end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('evento', p_evento, 'id', p_ref),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  raise warning 'push__disparar(%): %', p_evento, sqlerrm;
end;
$$;
revoke all on function push__disparar(text, text) from public;

create or replace function push__gatilho()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'documentos_assinatura' then
    perform push__disparar('documento', new.id);
  elsif tg_table_name = 'comunicado_destinatarios' then
    if new.tipo = 'colaborador' then perform push__disparar('comunicado', new.id); end if;
  elsif tg_table_name = 'noticias' then
    if new.status = 'publicada' and (tg_op = 'INSERT' or coalesce(old.status, '') <> 'publicada') then
      perform push__disparar('noticia', new.id);
    end if;
  elsif tg_table_name = 'chat_mensagens' then
    perform push__disparar('chat', new.id);
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists push_documentos on documentos_assinatura;
create trigger push_documentos after insert on documentos_assinatura for each row execute function push__gatilho();
drop trigger if exists push_comunicados on comunicado_destinatarios;
create trigger push_comunicados after insert on comunicado_destinatarios for each row execute function push__gatilho();
drop trigger if exists push_noticias on noticias;
create trigger push_noticias after insert or update of status on noticias for each row execute function push__gatilho();
drop trigger if exists push_chat on chat_mensagens;
create trigger push_chat after insert on chat_mensagens for each row execute function push__gatilho();

notify pgrst, 'reload schema';
