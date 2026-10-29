-- ============================================================================
-- 084 — Chat interno: reagir às mensagens com emoji.
--
-- reacoes: {"👍": ["usr-1", "usr-2"], "❤️": ["usr-3"]} — emoji → quem reagiu.
-- chat_reagir liga/desliga a reação de uma pessoa num emoji de forma atômica
-- (duas pessoas reagindo ao mesmo tempo não se atropelam). A tela recebe a
-- mudança pelo realtime de chat_mensagens (evento UPDATE, já publicado na 015).
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

alter table chat_mensagens add column if not exists reacoes jsonb not null default '{}'::jsonb;

create or replace function chat_reagir(p_mensagem text, p_usuario text, p_emoji text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  atual jsonb;
  lista jsonb;
begin
  if p_emoji is null or length(p_emoji) = 0 or length(p_emoji) > 16 then
    raise exception 'Emoji inválido';
  end if;
  select coalesce(reacoes, '{}'::jsonb) into atual from chat_mensagens where id = p_mensagem for update;
  if not found then
    return null;
  end if;
  lista := coalesce(atual -> p_emoji, '[]'::jsonb);
  if lista ? p_usuario then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into lista from jsonb_array_elements_text(lista) as x where x <> p_usuario;
  else
    lista := lista || to_jsonb(p_usuario);
  end if;
  if jsonb_array_length(lista) = 0 then
    atual := atual - p_emoji;
  else
    atual := jsonb_set(atual, array[p_emoji], lista);
  end if;
  update chat_mensagens set reacoes = atual where id = p_mensagem;
  return atual;
end;
$$;

revoke all on function chat_reagir(text, text, text) from public;
grant execute on function chat_reagir(text, text, text) to authenticated;
