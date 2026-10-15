-- ============================================================================
-- 076 — Gamificação: colocação do colaborador no mês (página de início do portal).
--
-- O portal de cada colaborador não pode ver os pontos dos outros, então a
-- classificação é gravada pela tela do DP (Gamificação & Destaques) sempre que
-- ela é aberta / quando há reconhecimento ou destaque. portal_gamificacao passa
-- a devolver também a colocação DO PRÓPRIO colaborador (posição, total de
-- participantes e os pontos do 10º lugar, pra mostrar "faltam X pontos para o
-- Top 10") — nunca nomes ou pontos dos colegas.
-- Rodar no SQL Editor do dev e da PRODUÇÃO (ref pvjdypqwkvgwhbhzsphb) ANTES de
-- publicar o código.
-- ============================================================================

create table if not exists gamificacao_posicoes (
  periodo text not null, -- 'YYYY-MM'
  colaborador_id text not null references colaboradores(id) on delete cascade,
  posicao integer not null,
  pontos integer not null default 0,
  participantes integer not null default 0,
  pontos_top10 integer not null default 0, -- pontos de quem está em 10º (corte do Top 10)
  atualizado_em timestamptz not null default now(),
  primary key (periodo, colaborador_id)
);

alter table gamificacao_posicoes enable row level security;
drop policy if exists gamif_posicoes_auth on gamificacao_posicoes;
create policy gamif_posicoes_auth on gamificacao_posicoes for all to authenticated using (true) with check (true);
grant select, insert, update, delete on table gamificacao_posicoes to authenticated;

create or replace function portal_gamificacao(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_colab text;
begin
  v_colab := portal__colaborador(p_token, p_cpf, p_nascimento);
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object(
    'reconhecimentos', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'data', r.data, 'pontos', r.pontos, 'motivo', r.motivo) order by r.data desc)
      from gamificacao_reconhecimentos r where r.colaborador_id = v_colab
    ), '[]'::jsonb),
    'destaques', coalesce((
      select jsonb_agg(jsonb_build_object('periodo', d.periodo, 'pontos', d.pontos) order by d.periodo desc)
      from gamificacao_destaques d where d.colaborador_id = v_colab
    ), '[]'::jsonb),
    'posicao', (
      select jsonb_build_object('periodo', p.periodo, 'posicao', p.posicao, 'pontos', p.pontos, 'participantes', p.participantes, 'pontosTop10', p.pontos_top10, 'atualizadoEm', p.atualizado_em)
      from gamificacao_posicoes p
      where p.colaborador_id = v_colab
      order by p.periodo desc
      limit 1
    )
  );
end;
$$;
revoke all on function portal_gamificacao(text, text, date) from public;
grant execute on function portal_gamificacao(text, text, date) to anon, authenticated;

notify pgrst, 'reload schema';
