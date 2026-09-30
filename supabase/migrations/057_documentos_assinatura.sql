-- ============================================================================
-- Documentos para o colaborador visualizar e ASSINAR por link (sem login) —
-- começa com Contracheques; a mesma tabela serve depois pras Férias (aviso/
-- recibo), por isso `categoria`.
--
-- Fluxo: o DP importa o PDF da folha (src/components/Contracheques), cada
-- contracheque vira um PDF próprio no Storage (bucket privado "anexos", ver
-- 056) e uma linha aqui com um token aleatório. O colaborador recebe o link
-- ?form=contracheque&token=... por WhatsApp, confirma o CPF, vê o documento e
-- assina (declaração + assinatura desenhada).
--
-- Segurança (dados de salário = dado pessoal, LGPD):
--   - "anon" NÃO tem nenhuma policy nesta tabela — não dá pra listar/varrer.
--   - Só as funções abaixo (security definer) leem/gravam pra quem não está
--     logado, e exigem o token exato (256 bits, impossível de adivinhar) E o
--     CPF do colaborador dono do documento.
--   - O PDF fica no bucket privado; o link assinado (arquivo_link) só é
--     devolvido depois de token + CPF conferidos, e vale até link_expira_em.
-- ============================================================================

create table if not exists documentos_assinatura (
  id text primary key,
  categoria text not null default 'contracheque', -- 'contracheque' | 'ferias'
  colaborador_id text not null references colaboradores(id) on delete cascade,
  colaborador_nome text not null,
  referencia text not null,          -- contracheque: competência 'YYYY-MM'
  tipo text not null default 'Mensal', -- ex.: Mensal, Adiantamento, 13º Salário
  titulo text not null,              -- texto exibido pro colaborador
  arquivo_ref text not null,         -- 'storage:<caminho>' no bucket "anexos"
  arquivo_nome text,
  arquivo_link text,                 -- link assinado do PDF, válido até link_expira_em
  token text not null unique,
  link_expira_em timestamptz not null,
  status text not null default 'Pendente', -- 'Pendente' | 'Visualizado' | 'Assinado'
  visualizado_em timestamptz,
  assinado_em timestamptz,
  assinatura_imagem text,            -- PNG (data URL) da assinatura desenhada
  declaracao text,                   -- texto exato que o colaborador declarou
  navegador text,                    -- user agent de quem assinou
  lote_id text,                      -- importação de onde veio (mesmo PDF da folha)
  criado_em timestamptz not null default now(),
  criado_por text
);
create index if not exists idx_documentos_assinatura_colaborador on documentos_assinatura(colaborador_id);
create index if not exists idx_documentos_assinatura_categoria_ref on documentos_assinatura(categoria, referencia);

alter table documentos_assinatura enable row level security;

drop policy if exists documentos_assinatura_authenticated_all on documentos_assinatura;
create policy documentos_assinatura_authenticated_all on documentos_assinatura
  for all to authenticated using (true) with check (true);

-- Abre um documento pelo link público: confere token + CPF, marca como
-- visualizado na primeira abertura e devolve só o necessário pra tela.
-- Retorna {erro: 'nao_encontrado' | 'cpf' | 'expirado'} quando não pode abrir.
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

  select regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') into cpf_cadastro
  from colaboradores c where c.id = doc.colaborador_id;
  if cpf_cadastro is null or cpf_cadastro = ''
     or cpf_cadastro <> regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g') then
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

-- Registra a assinatura: mesmas conferências de abrir_documento_assinatura, só
-- assina uma vez (não sobrescreve uma assinatura já feita) e aceita só uma
-- imagem PNG de tamanho razoável.
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

  select regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') into cpf_cadastro
  from colaboradores c where c.id = doc.colaborador_id;
  if cpf_cadastro is null or cpf_cadastro = ''
     or cpf_cadastro <> regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g') then
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
