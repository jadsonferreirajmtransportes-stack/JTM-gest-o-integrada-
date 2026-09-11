-- ============================================================================
-- Pré-Admissões (formulário público de admissão digital) — migrado para Supabase.
--
-- Diferente de toda tabela migrada até aqui: essa é preenchida por um CANDIDATO
-- sem login (link público, ?form=admissao), então a política de segurança é
-- diferente das outras — o candidato (papel "anon") só pode CRIAR um registro
-- (nunca ler ou editar), evitando que qualquer pessoa sem login consiga listar
-- ou alterar dados de outros candidatos (CPF, endereço, dados bancários etc.).
-- Só usuário autenticado (Departamento Pessoal) lê/edita/aprova/apaga.
--
-- Sem dado real hoje (0 registros em produção) — migração de infraestrutura.
-- ============================================================================

create table if not exists pre_admissoes (
  id text primary key,
  token text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz,
  status text not null default 'Pendente',
  empresa_predefinida_id text,
  cargo_predefinido text,
  supervisor_predefinido_id text,
  observacoes_dp text,
  colaborador_efetivado_id text,
  dados_pessoais jsonb not null default '{}',
  contato_endereco jsonb not null default '{}',
  dados_bancarios jsonb not null default '{}',
  transporte jsonb not null default '{}',
  filiacao_sindical jsonb,
  termos_cct jsonb,
  dependentes jsonb not null default '[]',
  fardamento jsonb not null default '{}',
  documentos_enviados jsonb not null default '[]',
  declaracao_veracidade boolean not null default false,
  aceite_lgpd boolean,
  data_envio timestamptz
);
create index if not exists idx_pre_admissoes_token on pre_admissoes(token);

alter table pre_admissoes enable row level security;

-- Departamento Pessoal (logado): acesso completo.
drop policy if exists pre_admissoes_authenticated_all on pre_admissoes;
create policy pre_admissoes_authenticated_all on pre_admissoes
  for all to authenticated using (true) with check (true);

-- Candidato (sem login, papel "anon" da chave pública): só pode CRIAR o próprio
-- registro — nunca ler, editar ou apagar nenhum (nem o próprio depois de enviado).
drop policy if exists pre_admissoes_anon_insert on pre_admissoes;
create policy pre_admissoes_anon_insert on pre_admissoes
  for insert to anon with check (true);
