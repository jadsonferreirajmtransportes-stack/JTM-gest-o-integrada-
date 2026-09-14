-- ============================================================================
-- Formulário Público de Ocorrências (link compartilhável, ?form=ocorrencia)
-- — corrige o formulário carregando com os campos de Supervisor e Colaborador
-- vazios (sem nenhum erro visível).
--
-- Causa: quem preenche esse link nunca faz login (é o próprio ponto do link —
-- supervisor de campo, sem conta no sistema), então o Supabase trata essa
-- pessoa como papel "anon". supervisores, colaboradores e empregadores só
-- permitem leitura para "authenticated" (ver 001_departamento_pessoal.sql) —
-- RLS não gera erro quando bloqueia, só devolve 0 linhas, então o formulário
-- carregava normal, só com as listas de seleção sempre vazias.
--
-- A correção NÃO abre essas tabelas pra leitura geral por "anon" — colaboradores
-- guarda CPF, endereço, dados bancários e de saúde, e isso exporia tudo isso a
-- qualquer visitante da internet que tenha a chave anon (pública, embutida no
-- app). Em vez disso, 3 funções "security definer" (mesmo padrão já usado em
-- obter_ficha_compartilhada, ver 007_fichas_cadastrais_compartilhadas.sql)
-- devolvem só os campos não sensíveis que esse formulário realmente usa.
--
-- O envio da ocorrência em si (INSERT em ocorrencias) também precisa de uma
-- política própria pra "anon" — mesmo padrão já usado em pre_admissoes: só
-- criar, nunca ler, editar ou apagar nenhuma ocorrência (nem a própria depois
-- de enviada).
-- ============================================================================

create or replace function obter_supervisores_publico()
returns table (id text, nome text, cargo text, setor text)
language sql
security definer
set search_path = public
as $$
  select id, nome, cargo, setor
  from supervisores
  where ativo is distinct from false
  order by nome;
$$;
revoke all on function obter_supervisores_publico() from public;
grant execute on function obter_supervisores_publico() to anon, authenticated;

-- "Ativos" aqui é no sentido do formulário original (que só excluía status = 'Inativo'):
-- inclui quem está de Férias ou Afastado também — só quem já foi desligado é que não faz
-- sentido aparecer pra um supervisor registrar uma ocorrência nova.
create or replace function obter_colaboradores_ativos_publico()
returns table (
  id text,
  nome_completo text,
  funcao_cargo text,
  codigo_matricula text,
  setor text,
  empregador_id text,
  data_admissao date
)
language sql
security definer
set search_path = public
as $$
  select id, nome_completo, funcao_cargo, codigo_matricula, setor, empregador_id, data_admissao
  from colaboradores
  where status is distinct from 'Inativo'
  order by nome_completo;
$$;
revoke all on function obter_colaboradores_ativos_publico() from public;
grant execute on function obter_colaboradores_ativos_publico() to anon, authenticated;

create or replace function obter_empregadores_publico()
returns table (id text, razao_social text)
language sql
security definer
set search_path = public
as $$
  select id, razao_social from empregadores order by razao_social;
$$;
revoke all on function obter_empregadores_publico() from public;
grant execute on function obter_empregadores_publico() to anon, authenticated;

-- Supervisor de campo (anon) só pode CRIAR a ocorrência — nunca ler, editar
-- ou apagar (mesmo raciocínio de pre_admissoes_anon_insert, ver 005_pre_admissoes.sql).
drop policy if exists ocorrencias_anon_insert on ocorrencias;
create policy ocorrencias_anon_insert on ocorrencias
  for insert to anon with check (true);
