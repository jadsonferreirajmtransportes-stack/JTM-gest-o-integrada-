-- ============================================================================
-- "Solicitar nova assinatura" em um documento JÁ assinado (contracheque, aviso/
-- recibo de férias) sem precisar excluir e importar o arquivo de novo.
--
-- A assinatura anterior NÃO é apagada: vai pra historico_assinaturas (data,
-- hora, imagem, declaração, dispositivo, quando foi substituída e o motivo) —
-- prova do que foi assinado antes, se um dia precisar. O documento volta pra
-- "Pendente" com um token NOVO (o link antigo para de funcionar) e um link do
-- PDF renovado.
--
-- security invoker: roda com a permissão de quem chama (authenticated, que já
-- tem acesso total à tabela pela policy da 057) — anon não chega aqui.
-- ============================================================================

alter table documentos_assinatura
  add column if not exists historico_assinaturas jsonb not null default '[]';

create or replace function reabrir_documento_assinatura(
  p_id text,
  p_motivo text,
  p_novo_token text,
  p_novo_link text,
  p_expira_em timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update documentos_assinatura
    set historico_assinaturas = coalesce(historico_assinaturas, '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'assinadoEm', assinado_em,
            'visualizadoEm', visualizado_em,
            'assinaturaImagem', assinatura_imagem,
            'declaracao', declaracao,
            'navegador', navegador,
            'substituidaEm', now(),
            'motivo', left(coalesce(p_motivo, ''), 500)
          )
        ),
        status = 'Pendente',
        assinado_em = null,
        visualizado_em = null,
        assinatura_imagem = null,
        declaracao = null,
        navegador = null,
        token = p_novo_token,
        arquivo_link = p_novo_link,
        link_expira_em = p_expira_em
    where id = p_id
      and status = 'Assinado';
  return found;
end;
$$;

revoke all on function reabrir_documento_assinatura(text, text, text, text, timestamptz) from public;
grant execute on function reabrir_documento_assinatura(text, text, text, text, timestamptz) to authenticated;
