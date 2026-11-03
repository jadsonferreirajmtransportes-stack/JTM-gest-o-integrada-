-- 097: aviso no celular do colaborador para bater o ponto.
-- A cada 5 minutos o banco chama a Edge Function "enviar-push" (evento 'ponto_lembrete'),
-- que manda, pela jornada de cada um:
--   • 5 minutos antes de cada marcação: "⏰ Hora de bater o ponto";
--   • passada a tolerância sem a batida: "⚠️ Ponto não registrado".
-- Não avisa em folga, feriado, dia com justificativa nem para quem está de férias/afastado.
-- Só chega para quem ativou os avisos no app JMT Colaborador.
-- Depois de rodar: publicar de novo a Edge Function "enviar-push" (nova versão), nos 2 projetos.
-- Rodar no dev e na produção ANTES de publicar.

create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'ponto-lembrete';
  perform cron.schedule('ponto-lembrete', '*/5 * * * *', $cmd$select public.push__disparar('ponto_lembrete', to_char(now(), 'YYYYMMDDHH24MI'));$cmd$);
end;
$$;
