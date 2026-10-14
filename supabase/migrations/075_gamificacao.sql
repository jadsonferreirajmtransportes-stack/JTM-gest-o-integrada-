-- ============================================================================
-- 075 — Gamificação do desempenho no portal do colaborador (2026-10-14).
--
-- Os pontos são calculados pelo app a partir do que já existe (ponto pelo
-- celular, treinamentos, documentos assinados, ciência de comunicados). Aqui
-- ficam só o que o DP lança:
--   gamificacao_reconhecimentos — elogio de cliente/supervisor, meta batida...
--   gamificacao_destaques       — destaque do mês publicado no Jornal
-- portal_gamificacao(token, cpf, nascimento) devolve SÓ os do próprio
-- colaborador (mesma checagem do portal). Ninguém vê a pontuação dos outros.
-- Rodar no SQL Editor do dev e da PRODUÇÃO (ref pvjdypqwkvgwhbhzsphb) ANTES de
-- publicar o código.
-- ============================================================================

create table if not exists gamificacao_reconhecimentos (
  id text primary key,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  data date not null,
  pontos integer not null default 50,
  motivo text not null,
  criado_por text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_gamif_reconhecimentos_colab on gamificacao_reconhecimentos(colaborador_id, data);

create table if not exists gamificacao_destaques (
  id text primary key,
  periodo text not null, -- 'YYYY-MM'
  colaborador_id text not null references colaboradores(id) on delete cascade,
  pontos integer not null default 0,
  noticia_id text,
  criado_por text,
  criado_em timestamptz not null default now(),
  unique (periodo, colaborador_id)
);

alter table gamificacao_reconhecimentos enable row level security;
alter table gamificacao_destaques enable row level security;
drop policy if exists gamif_reconhecimentos_auth on gamificacao_reconhecimentos;
create policy gamif_reconhecimentos_auth on gamificacao_reconhecimentos for all to authenticated using (true) with check (true);
drop policy if exists gamif_destaques_auth on gamificacao_destaques;
create policy gamif_destaques_auth on gamificacao_destaques for all to authenticated using (true) with check (true);
grant select, insert, update, delete on table gamificacao_reconhecimentos to authenticated;
grant select, insert, update, delete on table gamificacao_destaques to authenticated;

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
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function portal_gamificacao(text, text, date) from public;
grant execute on function portal_gamificacao(text, text, date) to anon, authenticated;

notify pgrst, 'reload schema';
