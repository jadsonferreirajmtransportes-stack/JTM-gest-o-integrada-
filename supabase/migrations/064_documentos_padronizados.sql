-- ============================================================================
-- Padronização de Documentos (decisões de 2026-10-02): todo documento da empresa
-- passa por este módulo — importa PDF, Word ou Excel, o sistema lê o conteúdo
-- (títulos, parágrafos, listas, tabelas), o usuário revisa num editor com a
-- checagem do padrão, e o documento é refeito na identidade JMT (PDF, Word ou
-- Excel, conforme o pedido). Fica numa biblioteca com código e versão.
--
-- O conteúdo fica em `blocos` (jsonb):
--   [{ id, tipo: 'titulo', nivel: 1|2|3, texto }
--    { id, tipo: 'paragrafo', texto }
--    { id, tipo: 'lista', ordenada, itens: [..] }
--    { id, tipo: 'tabela', cabecalho: [..], linhas: [[..]] }
--    { id, tipo: 'destaque', texto }]
-- A lista da biblioteca não traz `blocos` (pesado) — só ao abrir o documento.
-- ============================================================================

create table if not exists documentos_padronizados (
  id text primary key,
  codigo text not null unique,       -- DOC-<SETOR>-001
  titulo text not null,
  tipo text not null default 'Procedimento',
  setor text not null default 'ADM', -- sigla usada no código
  versao integer not null default 1,
  status text not null default 'Rascunho', -- 'Rascunho' | 'Vigente' | 'Obsoleto'
  classificacao text not null default 'Uso interno',
  responsavel text,
  aprovado_por text,
  data_documento date,
  blocos jsonb not null default '[]',
  origem_arquivo text,               -- nome do arquivo importado
  origem_tipo text,                  -- 'pdf' | 'docx' | 'xlsx' | 'csv' | 'manual'
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

-- Cada versão publicada fica guardada (conteúdo + dados) — histórico de revisões.
create table if not exists documentos_padronizados_versoes (
  id text primary key,
  documento_id text not null references documentos_padronizados(id) on delete cascade,
  versao integer not null,
  titulo text not null,
  blocos jsonb not null,
  dados jsonb not null default '{}', -- tipo, responsável, aprovado por, data...
  nota text,                         -- o que mudou nesta versão
  criado_por text,
  criado_em timestamptz not null default now(),
  unique (documento_id, versao)
);

alter table documentos_padronizados enable row level security;
alter table documentos_padronizados_versoes enable row level security;
drop policy if exists documentos_padronizados_auth on documentos_padronizados;
create policy documentos_padronizados_auth on documentos_padronizados for all to authenticated using (true) with check (true);
drop policy if exists documentos_padronizados_versoes_auth on documentos_padronizados_versoes;
create policy documentos_padronizados_versoes_auth on documentos_padronizados_versoes for all to authenticated using (true) with check (true);
