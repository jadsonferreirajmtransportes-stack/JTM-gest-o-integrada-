-- ============================================================================
-- 073 — POPs (Procedimento Operacional Padrão) no modelo ABNT (2026-10-10).
--
-- Estrutura do documento: NBR 6024 (numeração progressiva das seções), NBR 6023
-- (referências), NBR 14724 (formatação: margens 3/2 cm, fonte 12, entrelinha
-- 1,5) e controle de documento da ABNT NBR ISO 9001 (código, versão,
-- elaboração/revisão/aprovação, histórico de revisões).
--
-- Cada VERSÃO de um POP é uma linha: o código (POP-SETOR-001) se repete e a
-- versão sobe. Fluxo: Rascunho → Em revisão → Em aprovação → Vigente; quem
-- revisa/aprova pode Devolver (volta pra quem elaborou com a observação). Ao
-- aprovar uma nova versão, a anterior vira Obsoleto.
--
-- O conteúdo das seções fica em `conteudo` (jsonb):
--   { objetivo, aplicacao, referencias: [..], definicoes: [{termo, definicao}],
--     responsabilidades: [{funcao, atribuicao}], materiais: [..],
--     etapas: [{id, titulo, descricao, responsavel}], desvios,
--     registros: [{registro, responsavel, guarda}], anexos: [..] }
--
-- Ciência dos colaboradores: documentos_assinatura (057) com categoria 'pop' e
-- referencia = id da versão do POP — aparece no link pessoal em Documentos.
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

create table if not exists pops (
  id text primary key,
  codigo text not null,                 -- POP-QUA-001 (igual em todas as versões)
  versao integer not null default 1,
  titulo text not null,
  setor text not null default 'OPE',    -- sigla (mesmas da Padronização de Documentos)
  classificacao text not null default 'Uso interno',
  status text not null default 'Rascunho', -- Rascunho | Em revisão | Em aprovação | Vigente | Obsoleto
  conteudo jsonb not null default '{}'::jsonb,
  motivo_revisao text,                  -- o que mudou nesta versão (histórico de revisões)
  elaborado_por text,
  elaborado_cargo text,
  elaborado_em timestamptz,
  revisado_por text,
  revisado_cargo text,
  revisado_em timestamptz,
  aprovado_por text,
  aprovado_cargo text,
  aprovado_em timestamptz,
  vigencia_inicio date,
  proxima_revisao date,
  devolucao_observacao text,            -- motivo da última devolução
  devolvido_por text,
  devolvido_em timestamptz,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (codigo, versao)
);
create index if not exists idx_pops_codigo on pops(codigo, versao desc);
create index if not exists idx_pops_status on pops(status);

alter table pops enable row level security;
drop policy if exists pops_auth on pops;
create policy pops_auth on pops for all to authenticated using (true) with check (true);
