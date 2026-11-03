-- 093: aviso no celular (push) quando um colaborador relata uma ocorrência à Qualidade pelo portal.
-- Avisa quem tem o módulo Qualidade liberado (e os administradores).
-- Depois de rodar: publicar de novo a Edge Function "enviar-push" (nova versão do arquivo), nos 2 projetos.
-- Rodar no dev e na produção ANTES de publicar.

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
  elsif tg_table_name = 'qualidade_registros' then
    if new.origem = 'portal' then perform push__disparar('qualidade', new.id); end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists push_qualidade on qualidade_registros;
create trigger push_qualidade after insert on qualidade_registros for each row execute function push__gatilho();

notify pgrst, 'reload schema';
