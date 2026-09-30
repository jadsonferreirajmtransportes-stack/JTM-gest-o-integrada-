-- ============================================================================
-- Módulo Disciplinar do DP: registro, aprovação, ciência e progressão das
-- medidas disciplinares (advertência verbal, advertência escrita, suspensão,
-- recomendação de justa causa), de acordo com a CLT (art. 482 — faltas graves;
-- art. 474 — suspensão de no máximo 30 dias).
--
-- Regras de negócio (decididas com o DP em 2026-09-30, ver
-- src/components/Disciplinar/disciplinarRegras.ts):
--   - escada completa: verbal → escrita → 2ª escrita → suspensão 1, 3, 5 dias
--     → recomendação de justa causa (só recomendação — decisão é jurídica);
--   - reincidência considera as medidas dos últimos 12 meses;
--   - supervisor PROPÕE, administrador APROVA (status 'Proposta' → 'Aprovada');
--   - ciência do colaborador pelo mesmo fluxo de link + CPF + assinatura dos
--     contracheques (documentos_assinatura, categoria 'disciplinar'), ou
--     registro de RECUSA com 2 testemunhas.
--
-- Suspensão aprovada gera uma ocorrência "Suspensão disciplinar" (ocorrencia_id)
-- pra entrar no desconto do Vale Alimentação e no prontuário.
-- ============================================================================

create table if not exists medidas_disciplinares (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  colaborador_nome text not null,
  tipo text not null,            -- 'Advertência verbal' | 'Advertência escrita' | 'Suspensão' | 'Recomendação de justa causa'
  etapa integer not null,        -- posição na escada (1..7) no momento da aplicação
  data_fato date not null,
  data_ciencia_fato date not null, -- quando a empresa soube do fato (conta pra imediatidade)
  descricao_fato text not null,
  enquadramento text[] not null default '{}', -- alíneas do art. 482 (ex.: {'e','h'})
  enquadramento_outro text,
  testemunhas_fato text,
  justificativa_etapa text,      -- obrigatória quando pula etapas (falta grave)
  ocorrencias_relacionadas text[] not null default '{}',
  dias_suspensao integer check (dias_suspensao is null or (dias_suspensao between 1 and 30)),
  suspensao_inicio date,
  status text not null default 'Proposta', -- 'Proposta' | 'Aprovada' | 'Rejeitada' | 'Recusou-se a assinar' | 'Cancelada'
  proposto_por text,
  proposto_em timestamptz not null default now(),
  aprovado_por text,
  aprovado_em timestamptz,
  motivo_rejeicao text,
  documento_id text,             -- documentos_assinatura.id (ciência por link)
  ocorrencia_id text,            -- ocorrência criada na aprovação
  recusa_testemunhas jsonb,      -- [{ nome, cpf, assinatura (PNG data URL) }]
  recusa_registrada_em timestamptz,
  recusa_registrada_por text,
  observacoes text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_medidas_disciplinares_colaborador on medidas_disciplinares(colaborador_id);

alter table medidas_disciplinares enable row level security;

drop policy if exists medidas_disciplinares_authenticated_all on medidas_disciplinares;
create policy medidas_disciplinares_authenticated_all on medidas_disciplinares
  for all to authenticated using (true) with check (true);
