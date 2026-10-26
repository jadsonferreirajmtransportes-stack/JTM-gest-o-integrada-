-- ============================================================================
-- Assinatura de documentos padronizados por quem elabora/revisa/aprova —
-- inclusive pessoas de FORA da empresa (cliente, consultor, RT terceirizada).
--
-- Reaproveita documentos_assinatura (057): cada pessoa do bloco "Assinaturas"
-- do documento vira uma linha (categoria 'padronizado', referencia =
-- '<id do documento>@v<versão>', posicao = '<id do bloco>:<índice da pessoa>').
--   - Colaborador: colaborador_id preenchido — assina pelo portal (Documentos)
--     ou pelo link avulso, como já acontece hoje.
--   - Pessoa de fora: colaborador_id vazio; o CPF dela fica em signatario_cpf e
--     é o que o link confere (mesma regra token + CPF).
--
-- Segurança: nada muda para "anon" — continua sem policy na tabela; só as
-- funções security definer abrem/assinam, exigindo token exato + CPF.
-- ============================================================================

alter table documentos_assinatura alter column colaborador_id drop not null;
alter table documentos_assinatura add column if not exists signatario_cpf text;     -- só dígitos (pessoa de fora)
alter table documentos_assinatura add column if not exists signatario_contato text; -- WhatsApp/e-mail (pessoa de fora)
alter table documentos_assinatura add column if not exists posicao text;            -- '<bloco>:<índice>' no documento

create index if not exists idx_documentos_assinatura_referencia on documentos_assinatura(referencia);

-- CPF que o link exige: o do cadastro do colaborador; para pessoa de fora, o informado no envio.
create or replace function documento_assinatura_cpf(doc documentos_assinatura)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif((select regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') from colaboradores c where c.id = doc.colaborador_id), ''),
    nullif(regexp_replace(coalesce(doc.signatario_cpf, ''), '\D', '', 'g'), '')
  );
$$;
revoke all on function documento_assinatura_cpf(documentos_assinatura) from public;

create or replace function abrir_documento_assinatura(p_token text, p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  doc documentos_assinatura;
  cpf_cadastro text;
begin
  select d.* into doc from documentos_assinatura d where d.token = p_token;
  if not found then
    return jsonb_build_object('erro', 'nao_encontrado');
  end if;

  cpf_cadastro := documento_assinatura_cpf(doc);
  if cpf_cadastro is null or cpf_cadastro <> regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g') then
    return jsonb_build_object('erro', 'cpf');
  end if;

  if doc.link_expira_em < now() then
    return jsonb_build_object('erro', 'expirado', 'status', doc.status, 'assinadoEm', doc.assinado_em);
  end if;

  if doc.visualizado_em is null then
    update documentos_assinatura
      set visualizado_em = now(),
          status = case when status = 'Pendente' then 'Visualizado' else status end
      where id = doc.id;
  end if;

  return jsonb_build_object(
    'colaboradorNome', doc.colaborador_nome,
    'categoria', doc.categoria,
    'referencia', doc.referencia,
    'tipo', doc.tipo,
    'titulo', doc.titulo,
    'arquivoNome', doc.arquivo_nome,
    'arquivoLink', doc.arquivo_link,
    'status', case when doc.status = 'Pendente' then 'Visualizado' else doc.status end,
    'assinadoEm', doc.assinado_em
  );
end;
$$;

create or replace function assinar_documento_assinatura(
  p_token text,
  p_cpf text,
  p_assinatura text,
  p_declaracao text,
  p_navegador text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  doc documentos_assinatura;
  cpf_cadastro text;
  agora timestamptz := now();
begin
  select d.* into doc from documentos_assinatura d where d.token = p_token;
  if not found then
    return jsonb_build_object('erro', 'nao_encontrado');
  end if;

  cpf_cadastro := documento_assinatura_cpf(doc);
  if cpf_cadastro is null or cpf_cadastro <> regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g') then
    return jsonb_build_object('erro', 'cpf');
  end if;

  if doc.link_expira_em < now() then
    return jsonb_build_object('erro', 'expirado');
  end if;

  if doc.status = 'Assinado' then
    return jsonb_build_object('erro', 'ja_assinado', 'assinadoEm', doc.assinado_em);
  end if;

  if p_assinatura is null
     or p_assinatura not like 'data:image/png;base64,%'
     or length(p_assinatura) > 700000 then
    return jsonb_build_object('erro', 'assinatura_invalida');
  end if;

  update documentos_assinatura
    set status = 'Assinado',
        assinado_em = agora,
        visualizado_em = coalesce(visualizado_em, agora),
        assinatura_imagem = p_assinatura,
        declaracao = left(coalesce(p_declaracao, ''), 1000),
        navegador = left(coalesce(p_navegador, ''), 500)
    where id = doc.id;

  return jsonb_build_object('ok', true, 'assinadoEm', agora);
end;
$$;

revoke all on function abrir_documento_assinatura(text, text) from public;
grant execute on function abrir_documento_assinatura(text, text) to anon, authenticated;
revoke all on function assinar_documento_assinatura(text, text, text, text, text) from public;
grant execute on function assinar_documento_assinatura(text, text, text, text, text) to anon, authenticated;
