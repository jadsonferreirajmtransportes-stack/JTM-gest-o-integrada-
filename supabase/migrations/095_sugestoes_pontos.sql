-- 095: Gamificação — +50 pontos quando a gestão marca uma sugestão como "Implementada".
-- Vira um reconhecimento automático (gamificacao_reconhecimentos, id 'rec-sug-<id da sugestão>')
-- e aparece no "Meu desempenho" do colaborador. Se a situação sair de "Implementada", os
-- pontos saem também.
-- Só sugestões COM NOME: dar pontos numa anônima mostraria à gestão quem mandou.
-- Rodar no dev e na produção ANTES de publicar.

create or replace function sugestoes__pontos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'implementada' and old.status is distinct from 'implementada'
     and not new.anonima and new.colaborador_id is not null then
    insert into gamificacao_reconhecimentos (id, colaborador_id, data, pontos, motivo, criado_por)
    values ('rec-sug-' || new.id, new.colaborador_id, (now() at time zone 'America/Fortaleza')::date, 50,
            left('Sugestão implementada: ' || new.titulo, 200), 'Sugestões de melhoria')
    on conflict (id) do nothing;
  elsif old.status = 'implementada' and new.status is distinct from 'implementada' then
    delete from gamificacao_reconhecimentos where id = 'rec-sug-' || new.id;
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists sugestoes_pontos on sugestoes;
create trigger sugestoes_pontos after update of status on sugestoes for each row execute function sugestoes__pontos();
