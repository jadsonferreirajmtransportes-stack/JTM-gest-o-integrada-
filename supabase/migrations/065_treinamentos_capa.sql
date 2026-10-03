-- ============================================================================
-- Capa dos treinamentos (2026-10-03): imagem opcional enviada no editor (bucket
-- público "treinamentos"). Sem capa, o sistema mostra a capa automática no
-- padrão JMT. O portal do colaborador passa a receber a capa em portal_entrar.
-- ============================================================================

alter table treinamentos add column if not exists capa text;

create or replace function portal_entrar(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_resultado jsonb;
begin
  if v_colab is null then
    if not exists (select 1 from portal_colaborador where token = p_token and not revogado) then
      return jsonb_build_object('erro', 'link');
    end if;
    return jsonb_build_object('erro', 'dados');
  end if;

  select jsonb_build_object(
    'colaborador', (select jsonb_build_object('nome', c.nome_completo, 'cargo', c.funcao_cargo) from colaboradores c where c.id = v_colab),
    'treinamentos', coalesce((
      select jsonb_agg(x order by x->>'status' = 'Concluído', x->>'prazo' nulls last)
      from (
        select distinct on (a.treinamento_id)
          jsonb_build_object(
            'atribuicaoId', a.id,
            'treinamentoId', t.id,
            'titulo', t.titulo,
            'descricao', t.descricao,
            'capa', t.capa,
            'cargaHorariaMin', t.carga_horaria_min,
            'conteudos', t.conteudos,
            'prova', case when t.prova is null then null else jsonb_build_object(
              'notaMinima', t.prova->'notaMinima',
              'perguntas', (select coalesce(jsonb_agg(q - 'correta'), '[]'::jsonb) from jsonb_array_elements(t.prova->'perguntas') q)
            ) end,
            'validadeMeses', t.validade_meses,
            'prazo', a.prazo,
            'status', a.status,
            'conteudosVistos', a.conteudos_vistos,
            'tentativas', a.tentativas,
            'nota', a.nota,
            'concluidoEm', a.concluido_em,
            'validoAte', a.valido_ate
          ) as x
        from treinamento_atribuicoes a
        join treinamentos t on t.id = a.treinamento_id
        where a.colaborador_id = v_colab and t.ativo
        order by a.treinamento_id, a.atribuido_em desc
      ) s
    ), '[]'::jsonb),
    'instrucoes', coalesce((
      select jsonb_agg(to_jsonb(i) - 'usuarios_marcados_ids' - 'criado_por_user_id' order by i.codigo)
      from instrucoes_trabalho i
      where i.status = 'Vigente' and not coalesce(i.arquivada, false)
    ), '[]'::jsonb)
  ) into v_resultado;
  return v_resultado;
end;
$$;
