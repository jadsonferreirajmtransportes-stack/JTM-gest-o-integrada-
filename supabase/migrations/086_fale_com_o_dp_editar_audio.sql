-- ============================================================================
-- 086 — Fale com o DP com os recursos do Chat: o DP pode EDITAR e APAGAR as próprias
-- mensagens e mandar ÁUDIO (gravado no Chat da gestão). O colaborador vê no portal o texto
-- novo com "(editada)", "Mensagem apagada" e um player para ouvir o áudio.
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

alter table solicitacao_mensagens add column if not exists editado_em timestamptz;
alter table solicitacao_mensagens add column if not exists apagada boolean not null default false;

-- Espaço dos anexos passa a aceitar áudio (os formatos que o celular/computador gravam).
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'
]
where id = 'solicitacoes';

-- Portal: a conversa passa a trazer "editadoEm" e "apagada" (mensagem apagada não mostra
-- mais o texto nem os anexos).
create or replace function portal_solicitacao(p_token text, p_cpf text, p_nascimento date, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  s solicitacoes_dp%rowtype;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select * into s from solicitacoes_dp where id = p_id and colaborador_id = v_colab;
  if not found then return jsonb_build_object('erro', 'nao_encontrada'); end if;
  update solicitacoes_dp set lida_pelo_colaborador = true where id = s.id and not lida_pelo_colaborador;
  return jsonb_build_object(
    'id', s.id,
    'protocolo', s.ano || '-' || lpad(s.numero::text, 4, '0'),
    'tipo', s.tipo,
    'assunto', s.assunto,
    'dados', s.dados,
    'status', s.status,
    'criadoEm', s.criado_em,
    'mensagens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'autor', m.autor,
        'autorNome', case when m.autor = 'dp' then 'Departamento Pessoal' else m.autor_nome end,
        'texto', case when m.apagada then '' else m.texto end,
        -- Do colaborador: só nome do arquivo (o espaço é privado). Do DP: com o link para baixar.
        'anexos', case when m.apagada then '[]'::jsonb
                       when m.autor = 'dp' then m.anexos
                       else coalesce((select jsonb_agg(x - 'caminho') from jsonb_array_elements(m.anexos) x), '[]'::jsonb) end,
        'criadoEm', m.criado_em,
        'editadoEm', m.editado_em,
        'apagada', m.apagada
      ) order by m.criado_em)
      from solicitacao_mensagens m where m.solicitacao_id = s.id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function portal_solicitacao(text, text, date, text) from public;
grant execute on function portal_solicitacao(text, text, date, text) to anon, authenticated;
