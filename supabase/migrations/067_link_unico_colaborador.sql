-- ============================================================================
-- Link único do colaborador (2026-10-03): o link pessoal do portal
-- (?form=portal&token=) passa a reunir tudo — ponto, documentos para assinar
-- (contracheque, férias, espelho, medidas), comunicados, treinamentos, jornal,
-- instruções e regulamento. Decisões do usuário:
--   - "Lembrar neste celular": a 1ª entrada pede CPF + nascimento; o aparelho
--     ganha um código secreto (o MESMO do ponto, ponto_dispositivos/062) e depois
--     o link abre direto. O DP desconecta o aparelho na tela da Frequência.
--   - toda mensagem leva o link único, que abre direto no item; os links antigos
--     (?form=contracheque/documento/comunicado/ponto) continuam funcionando.
--
-- Como funciona a entrada lembrada: as funções do portal recebem (token, cpf,
-- nascimento). Com aparelho lembrado, o portal manda p_cpf = 'disp:<código>'
-- (e nascimento nulo) e portal__colaborador confere o código pelo ponto__colaborador
-- — então TODAS as funções portal_* (061, 065, 066 e as desta migração) passam a
-- aceitar o aparelho sem mudar uma linha delas.
-- ============================================================================

create or replace function portal__colaborador(p_token text, p_cpf text, p_nascimento date)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(p_cpf, '') like 'disp:%' then (
      select x.colaborador_id from ponto__colaborador(p_token, substr(p_cpf, 6)) x limit 1
    )
    else (
      select c.id
      from portal_colaborador p
      join colaboradores c on c.id = p.colaborador_id
      where p.token = p_token
        and not p.revogado
        and coalesce(c.status, '') <> 'Inativo'
        and length(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')) = 11
        and regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') = regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')
        and c.data_nascimento = p_nascimento
    )
  end
$$;
revoke all on function portal__colaborador(text, text, date) from public;

-- ---------------------------------------------------------------------------
-- Documentos para assinar (documentos_assinatura, 057)
-- ---------------------------------------------------------------------------

-- Lista os documentos do colaborador (sem arquivo nem assinatura).
create or replace function portal_documentos(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object('documentos', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id,
      'categoria', d.categoria,
      'referencia', d.referencia,
      'tipo', d.tipo,
      'titulo', d.titulo,
      'status', d.status,
      'criadoEm', d.criado_em,
      'assinadoEm', d.assinado_em,
      'vencido', d.link_expira_em < now()
    ) order by (d.status = 'Assinado'), d.criado_em desc)
    from documentos_assinatura d
    where d.colaborador_id = v_colab
  ), '[]'::jsonb));
end;
$$;

-- Abre um documento do colaborador (mesma resposta de abrir_documento_assinatura).
create or replace function portal_abrir_documento(p_token text, p_cpf text, p_nascimento date, p_documento_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_token text;
  v_cpf text;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select d.token into v_token from documentos_assinatura d where d.id = p_documento_id and d.colaborador_id = v_colab;
  if v_token is null then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  select c.cpf into v_cpf from colaboradores c where c.id = v_colab;
  return abrir_documento_assinatura(v_token, v_cpf);
end;
$$;

-- Assina um documento do colaborador (mesmas regras de assinar_documento_assinatura).
create or replace function portal_assinar_documento(p_token text, p_cpf text, p_nascimento date, p_documento_id text, p_assinatura text, p_declaracao text, p_navegador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_token text;
  v_cpf text;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select d.token into v_token from documentos_assinatura d where d.id = p_documento_id and d.colaborador_id = v_colab;
  if v_token is null then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  select c.cpf into v_cpf from colaboradores c where c.id = v_colab;
  return assinar_documento_assinatura(v_token, v_cpf, p_assinatura, p_declaracao, p_navegador);
end;
$$;

-- ---------------------------------------------------------------------------
-- Comunicados (063) — devolve o link (token) de cada comunicado da pessoa; a tela
-- usa as mesmas comunicado_abrir/comunicado_confirmar.
-- ---------------------------------------------------------------------------
create or replace function portal_comunicados(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object('comunicados', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id,
      'token', d.token,
      'titulo', c.titulo,
      'categoria', c.categoria,
      'numero', c.numero,
      'ano', c.ano,
      'criadoEm', c.criado_em,
      'exigeCiencia', c.exige_ciencia,
      'visualizadoEm', d.visualizado_em,
      'cienteEm', d.ciente_em
    ) order by c.criado_em desc)
    from comunicado_destinatarios d
    join comunicados c on c.id = d.comunicado_id
    where d.tipo = 'colaborador' and d.ref_id = v_colab
  ), '[]'::jsonb));
end;
$$;

revoke all on function portal_documentos(text, text, date) from public;
revoke all on function portal_abrir_documento(text, text, date, text) from public;
revoke all on function portal_assinar_documento(text, text, date, text, text, text, text) from public;
revoke all on function portal_comunicados(text, text, date) from public;
grant execute on function portal_documentos(text, text, date) to anon, authenticated;
grant execute on function portal_abrir_documento(text, text, date, text) to anon, authenticated;
grant execute on function portal_assinar_documento(text, text, date, text, text, text, text) to anon, authenticated;
grant execute on function portal_comunicados(text, text, date) to anon, authenticated;
