-- ============================================================================
-- Evidências mais fortes na assinatura eletrônica (documentos_assinatura):
--   - arquivo_hash: SHA-256 do PDF calculado no ENVIO — o comprovante confere se
--     o arquivo assinado é exatamente o enviado (nada trocado depois);
--   - ip: endereço de onde a pessoa assinou (lido dos cabeçalhos da requisição
--     que o Supabase repassa ao banco).
-- assinar_documento_assinatura é a mesma da 081, só que grava o IP.
-- ============================================================================

alter table documentos_assinatura add column if not exists arquivo_hash text;
alter table documentos_assinatura add column if not exists ip text;

-- IP de quem chamou a função (primeiro endereço de x-forwarded-for; senão cf-connecting-ip/x-real-ip).
create or replace function ip_da_requisicao()
returns text
language sql
stable
as $$
  select left(coalesce(
    nullif(trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
    current_setting('request.headers', true)::json ->> 'cf-connecting-ip',
    current_setting('request.headers', true)::json ->> 'x-real-ip'
  ), 100);
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
        navegador = left(coalesce(p_navegador, ''), 500),
        ip = ip_da_requisicao()
    where id = doc.id;

  return jsonb_build_object('ok', true, 'assinadoEm', agora);
end;
$$;

revoke all on function assinar_documento_assinatura(text, text, text, text, text) from public;
grant execute on function assinar_documento_assinatura(text, text, text, text, text) to anon, authenticated;
