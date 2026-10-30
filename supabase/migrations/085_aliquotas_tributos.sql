-- ============================================================================
-- 085 — Alíquotas da reforma tributária (CBS e IBS) por período.
--
-- O Controle Financeiro calcula, em cada CT-e, quanto do Valor a Cobrar é CBS/IBS
-- e o líquido da JMT (split payment). A alíquota usada é a do período em que a
-- data de emissão do CT-e cai. Como as alíquotas mudam na transição (2026 teste,
-- 2027 CBS cheia, 2029–2032 IBS subindo), cada período é uma linha.
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

create table if not exists aliquotas_tributos (
  id text primary key,
  inicio date not null,            -- vale a partir desta data (inclusive)
  fim date,                        -- até esta data (inclusive); vazio = sem fim
  cbs numeric(6,3) not null default 0,  -- % (ex.: 0.9)
  ibs numeric(6,3) not null default 0,  -- % (ex.: 0.1)
  observacao text,
  criado_em timestamptz not null default now(),
  criado_por text
);
create index if not exists idx_aliquotas_tributos_inicio on aliquotas_tributos(inicio);

alter table aliquotas_tributos enable row level security;
drop policy if exists aliquotas_tributos_auth on aliquotas_tributos;
create policy aliquotas_tributos_auth on aliquotas_tributos for all to authenticated using (true) with check (true);
