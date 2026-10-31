-- ============================================================================
-- 087 — Fale com o DP: reagir às mensagens com emoji (como no Chat), dos dois lados.
--
-- reacoes: {"👍": ["usr-1", "colab:colab-9"]} — emoji → quem reagiu. Quem é do DP entra
-- com o id do login (Logins & Acessos); o colaborador entra como "colab:<id>".
-- O portal recebe só a contagem por emoji e quais são do próprio colaborador (não vê
-- os ids dos logins da gestão).
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

alter table solicitacao_mensagens add column if not exists reacoes jsonb not null default '{}'::jsonb;

-- Liga/desliga a reação de alguém num emoji, de forma atômica (uso interno).
create or replace function solicitacao__alternar_reacao(p_mensagem text, p_quem text, p_emoji text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  atual jsonb;
  lista jsonb;
begin
  if p_emoji is null or length(p_emoji) = 0 or length(p_emoji) > 16 then
    raise exception 'Emoji inválido';
  end if;
  select coalesce(reacoes, '{}'::jsonb) into atual from solicitacao_mensagens where id = p_mensagem for update;
  if not found then return null; end if;
  lista := coalesce(atual -> p_emoji, '[]'::jsonb);
  if lista ? p_quem then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into lista from jsonb_array_elements_text(lista) as x where x <> p_quem;
  else
    lista := lista || to_jsonb(p_quem);
  end if;
  if jsonb_array_length(lista) = 0 then
    atual := atual - p_emoji;
  else
    atual := jsonb_set(atual, array[p_emoji], lista);
  end if;
  update solicitacao_mensagens set reacoes = atual where id = p_mensagem;
  return atual;
end;
$$;
revoke all on function solicitacao__alternar_reacao(text, text, text) from public;

-- DP (logado) reage.
create or replace function solicitacao_reagir(p_mensagem text, p_usuario text, p_emoji text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select solicitacao__alternar_reacao(p_mensagem, p_usuario, p_emoji)
$$;
revoke all on function solicitacao_reagir(text, text, text) from public;
grant execute on function solicitacao_reagir(text, text, text) to authenticated;

-- Colaborador (portal, sem login) reage — só em mensagens das próprias solicitações.
create or replace function portal_solicitacao_reagir(p_token text, p_cpf text, p_nascimento date, p_mensagem text, p_emoji text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if not exists (
    select 1 from solicitacao_mensagens m join solicitacoes_dp s on s.id = m.solicitacao_id
    where m.id = p_mensagem and s.colaborador_id = v_colab and not m.apagada
  ) then
    return jsonb_build_object('erro', 'nao_encontrada');
  end if;
  perform solicitacao__alternar_reacao(p_mensagem, 'colab:' || v_colab, p_emoji);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function portal_solicitacao_reagir(text, text, date, text, text) from public;
grant execute on function portal_solicitacao_reagir(text, text, date, text, text) to anon, authenticated;

-- Portal: a conversa passa a trazer as reações (contagem por emoji + as do colaborador).
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
        'anexos', case when m.apagada then '[]'::jsonb
                       when m.autor = 'dp' then m.anexos
                       else coalesce((select jsonb_agg(x - 'caminho') from jsonb_array_elements(m.anexos) x), '[]'::jsonb) end,
        'criadoEm', m.criado_em,
        'editadoEm', m.editado_em,
        'apagada', m.apagada,
        'reacoesContagem', (select coalesce(jsonb_object_agg(e.key, jsonb_array_length(e.value)), '{}'::jsonb) from jsonb_each(m.reacoes) e),
        'minhasReacoes', (select coalesce(jsonb_agg(e.key), '[]'::jsonb) from jsonb_each(m.reacoes) e where e.value ? ('colab:' || v_colab))
      ) order by m.criado_em)
      from solicitacao_mensagens m where m.solicitacao_id = s.id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function portal_solicitacao(text, text, date, text) from public;
grant execute on function portal_solicitacao(text, text, date, text) to anon, authenticated;
