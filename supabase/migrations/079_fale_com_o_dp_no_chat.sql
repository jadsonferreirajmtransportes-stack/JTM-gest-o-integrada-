-- ============================================================================
-- "Fale com o DP" dentro do Chat da gestão (pedido de 2026-10-20).
--   - Cada demanda vira uma conversa no Chat, para quem tem acesso ao Fale com o DP
--     (módulo DP + seção "Fale com o DP"). As mensagens continuam nas mesmas tabelas
--     da 069 (solicitacoes_dp / solicitacao_mensagens): o que o DP responde no chat
--     aparece no portal do colaborador, e o que ele escreve aparece no chat na hora.
--   - Tempo real: as duas tabelas entram na publicação supabase_realtime.
--   - Avisos no celular nos dois sentidos: mensagem nova numa demanda dispara a
--     função "enviar-push" (evento 'solicitacao'), que avisa a gestão (mensagem do
--     colaborador) ou o colaborador (resposta do DP).
-- Depende da 069 (Fale com o DP) e da 078 (notificações push).
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'solicitacoes_dp') then
    alter publication supabase_realtime add table solicitacoes_dp;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'solicitacao_mensagens') then
    alter publication supabase_realtime add table solicitacao_mensagens;
  end if;
end $$;

-- Mesmo gatilho da 078, agora também para as mensagens das demandas.
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
  elsif tg_table_name = 'solicitacao_mensagens' then
    perform push__disparar('solicitacao', new.id);
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists push_solicitacoes on solicitacao_mensagens;
create trigger push_solicitacoes after insert on solicitacao_mensagens for each row execute function push__gatilho();

notify pgrst, 'reload schema';
