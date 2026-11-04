-- 101: Performance das baixas — regras de pontuação editáveis no sistema
-- (pesos dos responsáveis e dos motoristas, prazo para importar, mínimo de notas, meta de entrega).
-- Sem esta tabela o sistema usa as regras padrão. Rodar no dev e na produção ANTES de publicar.

create table if not exists baixas_config (
  id integer primary key default 1 check (id = 1),
  regras jsonb not null default '{}'::jsonb,
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);
insert into baixas_config (id) values (1) on conflict (id) do nothing;
alter table baixas_config enable row level security;
drop policy if exists baixas_config_auth on baixas_config;
create policy baixas_config_auth on baixas_config for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
