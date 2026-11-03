-- 091: Fale com o DP aceita o tipo 'ponto' (esqueci de bater o ponto, abonos, atestados e licenças).
-- O DP confere e lança no controle de frequência (batida de ajuste ou justificativa do dia).
-- Rodar no dev e na produção ANTES de publicar.

-- Abre uma solicitação nova. Limites: texto até 3000 caracteres, até 10 em aberto.
create or replace function portal_solicitacao_abrir(p_token text, p_cpf text, p_nascimento date, p_tipo text, p_assunto text, p_dados jsonb, p_texto text, p_anexos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_nome text;
  v_ano int := extract(year from (now() at time zone 'America/Fortaleza'))::int;
  v_numero int;
  v_id text := 'sol-' || replace(gen_random_uuid()::text, '-', '');
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if p_tipo not in ('ponto', 'contestacao', 'ferias', 'documento', 'cadastro', 'outros') then return jsonb_build_object('erro', 'tipo'); end if;
  if length(v_texto) > 3000 then return jsonb_build_object('erro', 'tamanho'); end if;
  if (select count(*) from solicitacoes_dp where colaborador_id = v_colab and status in ('aberta', 'em_analise', 'respondida')) >= 10 then
    return jsonb_build_object('erro', 'limite');
  end if;
  select nome_completo into v_nome from colaboradores where id = v_colab;
  lock table solicitacoes_dp in share row exclusive mode;
  select coalesce(max(numero), 0) + 1 into v_numero from solicitacoes_dp where ano = v_ano;
  insert into solicitacoes_dp (id, numero, ano, colaborador_id, colaborador_nome, tipo, assunto, dados, status, lida_pelo_dp, lida_pelo_colaborador)
  values (v_id, v_numero, v_ano, v_colab, v_nome, p_tipo, left(coalesce(nullif(btrim(p_assunto), ''), 'Outros assuntos'), 120),
          case when jsonb_typeof(coalesce(p_dados, '{}'::jsonb)) = 'object' then coalesce(p_dados, '{}'::jsonb) else '{}'::jsonb end,
          'aberta', false, true);
  insert into solicitacao_mensagens (id, solicitacao_id, autor, autor_nome, texto, anexos)
  values ('msg-' || replace(gen_random_uuid()::text, '-', ''), v_id, 'colaborador', v_nome, v_texto, solicitacao__anexos_validos(p_token, p_anexos));
  return jsonb_build_object('id', v_id, 'protocolo', v_ano || '-' || lpad(v_numero::text, 4, '0'));
end;
$$;
