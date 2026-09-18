-- ============================================================================
-- Entrega de EPI (Equipamento de Proteção Individual) — registro escrito da
-- entrega/troca de EPI a um colaborador, exigido pela NR-6 (Portaria 3.214/78,
-- §6.7.1). Um registro por evento de entrega (data + responsável), com a
-- lista de itens entregues (descrição, CA, quantidade, motivo) em JSONB —
-- mesmo padrão de `fracionamento` em programacao_ferias.
-- ============================================================================

create table if not exists entregas_epi (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  data date not null,
  responsavel_entrega text,
  itens jsonb not null default '[]', -- { id, descricao, ca, quantidade, motivo }[]
  observacoes text,
  comprovante_assinado_url text, -- foto/PDF do recibo escaneado já assinado pelo recebedor
  comprovante_assinado_nome_arquivo text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_entregas_epi_colaborador on entregas_epi(colaborador_id);

alter table entregas_epi enable row level security;
drop policy if exists entregas_epi_authenticated_all on entregas_epi;
create policy entregas_epi_authenticated_all on entregas_epi
  for all to authenticated using (true) with check (true);
