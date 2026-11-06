-- 117: módulo CUSTOS EXTRAS — o financeiro atrela um custo extra a uma nota (CT-e do Controle
-- Financeiro), gera a planilha padrão de cada empresa para validação por e-mail e registra a
-- resposta. Aprovado = o valor entra no "Custo extra" do CT-e (e no Valor a Cobrar/fatura).
-- Situações: Pendente → Enviado (para validação) → Aprovado | Recusado.
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists custos_extras (
  id text primary key,
  lancamento_id text references lancamentos_faturamento_aereo(id) on delete set null,
  cliente_id text,
  cliente_nome text not null,
  nota_fiscal text,
  numero_cte text,
  destinatario text,
  cidade text,
  data_ocorrencia date,
  tipo text not null,
  descricao text,
  valor numeric not null default 0,
  status text not null default 'Pendente',
  envio_id text,
  enviado_em timestamptz,
  validado_em timestamptz,
  validado_por text,
  motivo_recusa text,
  lancado_no_cte boolean not null default false,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists custos_extras_cliente on custos_extras (cliente_id, status);
create index if not exists custos_extras_lanc on custos_extras (lancamento_id);
alter table custos_extras enable row level security;
drop policy if exists custos_extras_auth on custos_extras;
create policy custos_extras_auth on custos_extras for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
