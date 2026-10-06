-- ============================================================================
-- 072 — Ponto: histórico do mês para o próprio colaborador (link pessoal).
--
-- portal_ponto_historico(token, cpf, nascimento, 'YYYY-MM') devolve SÓ os dados de
-- quem entrou no portal (mesma checagem dos documentos: CPF + nascimento ou
-- celular lembrado): batidas válidas do
-- mês (com 1 dia de folga antes/depois, por causa das jornadas que viram a
-- noite), justificativas do mês, jornada, admissão/demissão, início do
-- controle e raio padrão — o app monta o espelho e o resumo de horas com o
-- mesmo cálculo que o DP usa.
-- Não devolve latitude/longitude nem quem fez o ajuste.
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

create or replace function portal_ponto_historico(p_token text, p_cpf text, p_nascimento date, p_mes text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_colab text;
  v_ini date;
  v_fim date;
begin
  v_colab := portal__colaborador(p_token, p_cpf, p_nascimento);
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  if p_mes !~ '^\d{4}-\d{2}$' then return jsonb_build_object('erro', 'mes'); end if;
  v_ini := to_date(p_mes || '-01', 'YYYY-MM-DD');
  v_fim := (v_ini + interval '1 month' - interval '1 day')::date;

  return jsonb_build_object(
    'colaborador', (
      select jsonb_build_object('admissao', c.data_admissao, 'demissao', c.data_demissao)
      from colaboradores c where c.id = v_colab
    ),
    'jornada', (
      select to_jsonb(j) from ponto_colaborador_jornada cj
      join ponto_jornadas j on j.id = cj.jornada_id
      where cj.colaborador_id = v_colab
    ),
    'inicio_controle', (
      select (min(r.registrado_em) at time zone 'America/Fortaleza')::date
      from ponto_registros r where r.origem = 'celular'
    ),
    'raio_padrao', coalesce((select max(l.raio_m) from ponto_locais l), 300),
    'batidas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'registrado_em', r.registrado_em,
        'origem', r.origem,
        'local_nome', r.local_nome,
        'distancia_m', r.distancia_m,
        'motivo', r.motivo,
        'dia_trabalho', r.dia_trabalho
      ) order by r.registrado_em)
      from ponto_registros r
      where r.colaborador_id = v_colab
        and not r.anulado
        and r.registrado_em >= ((v_ini - 1)::timestamp at time zone 'America/Fortaleza')
        and r.registrado_em < ((v_fim + 2)::timestamp at time zone 'America/Fortaleza')
    ), '[]'::jsonb),
    'justificativas', coalesce((
      select jsonb_agg(jsonb_build_object('id', j.id, 'data', j.data, 'tipo', j.tipo, 'abona', j.abona, 'observacao', j.observacao) order by j.data)
      from ponto_justificativas j
      where j.colaborador_id = v_colab and j.data between v_ini and v_fim
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function portal_ponto_historico(text, text, date, text) from public;
grant execute on function portal_ponto_historico(text, text, date, text) to anon, authenticated;
