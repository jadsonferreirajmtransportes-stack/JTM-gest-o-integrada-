-- 120: Prévia da folha (Controle de Frequência) — o que o DP ajusta na conferência de cada mês:
-- dependentes para o IR (quando diferente do cadastro), lançamentos à mão (proventos/descontos
-- que o sistema não calcula) e o líquido da folha da contabilidade, para comparar.
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists folha_conferencia (
  mes text not null,                 -- YYYY-MM
  colaborador_id text not null,
  dependentes_ir integer,            -- vazio = conta pelo cadastro
  ajustes jsonb not null default '[]'::jsonb, -- [{descricao, valor, tipo: 'provento'|'desconto'}]
  liquido_contabilidade numeric,
  observacao text,
  atualizado_por text,
  atualizado_em timestamptz not null default now(),
  primary key (mes, colaborador_id)
);
alter table folha_conferencia enable row level security;
drop policy if exists folha_conferencia_auth on folha_conferencia;
create policy folha_conferencia_auth on folha_conferencia for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
