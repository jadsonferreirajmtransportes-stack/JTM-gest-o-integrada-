-- ============================================================================
-- Portal de Educação do colaborador (treinamentos com vídeo, material, prova,
-- assinatura e certificado; reciclagem por validade; Instruções de Trabalho
-- vigentes pra consulta). Decisões do DP (2026-10-01):
--   - acesso por LINK PESSOAL fixo (portal_colaborador.token) + CPF + data de
--     nascimento — sem senha;
--   - treinamento atribuído automaticamente por cargo/setor/"todos" e também
--     manualmente;
--   - validade (reciclagem) por treinamento.
--
-- Segurança: anon não tem policy em nenhuma tabela daqui; o portal só usa as
-- funções security definer abaixo, que exigem token + CPF + data de nascimento
-- do colaborador (ativo). A prova é corrigida AQUI — o gabarito ("correta")
-- nunca vai pro navegador.
--
-- Materiais (PDF/apostila) ficam num bucket PÚBLICO "treinamentos" — conteúdo
-- de treinamento não é dado pessoal, e o portal sem login precisa abrir.
-- ============================================================================

create table if not exists treinamentos (
  id text primary key,
  titulo text not null,
  descricao text,
  carga_horaria_min integer not null default 60,
  -- [{ id, tipo: 'video'|'pdf'|'instrucao'|'texto', titulo, url?, instrucaoId?, texto? }]
  conteudos jsonb not null default '[]',
  -- { notaMinima: 70, perguntas: [{ id, enunciado, alternativas: [..], correta: 0 }] } ou null
  prova jsonb,
  obrigatorio_todos boolean not null default false,
  obrigatorio_cargos text[] not null default '{}',
  obrigatorio_setores text[] not null default '{}',
  validade_meses integer check (validade_meses is null or validade_meses between 1 and 120),
  prazo_dias integer check (prazo_dias is null or prazo_dias between 1 and 365),
  ativo boolean not null default true,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists treinamento_atribuicoes (
  id text primary key,
  treinamento_id text not null references treinamentos(id) on delete cascade,
  colaborador_id text not null references colaboradores(id) on delete cascade,
  origem text not null default 'manual', -- 'regra' | 'manual' | 'reciclagem'
  atribuido_em timestamptz not null default now(),
  prazo date,
  status text not null default 'Pendente', -- 'Pendente' | 'Em andamento' | 'Concluído'
  conteudos_vistos text[] not null default '{}',
  tentativas jsonb not null default '[]', -- [{ em, nota, aprovado }]
  nota numeric,
  concluido_em timestamptz,
  valido_ate date,
  assinatura_imagem text,
  declaracao text,
  navegador text
);
create index if not exists idx_treinamento_atribuicoes_colaborador on treinamento_atribuicoes(colaborador_id);
create index if not exists idx_treinamento_atribuicoes_treinamento on treinamento_atribuicoes(treinamento_id);

create table if not exists portal_colaborador (
  colaborador_id text primary key references colaboradores(id) on delete cascade,
  token text not null unique,
  revogado boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table treinamentos enable row level security;
alter table treinamento_atribuicoes enable row level security;
alter table portal_colaborador enable row level security;

drop policy if exists treinamentos_authenticated_all on treinamentos;
create policy treinamentos_authenticated_all on treinamentos for all to authenticated using (true) with check (true);
drop policy if exists treinamento_atribuicoes_authenticated_all on treinamento_atribuicoes;
create policy treinamento_atribuicoes_authenticated_all on treinamento_atribuicoes for all to authenticated using (true) with check (true);
drop policy if exists portal_colaborador_authenticated_all on portal_colaborador;
create policy portal_colaborador_authenticated_all on portal_colaborador for all to authenticated using (true) with check (true);

-- Bucket público dos materiais de treinamento (leitura pública; só logado envia/altera).
insert into storage.buckets (id, name, public, file_size_limit)
values ('treinamentos', 'treinamentos', true, 20971520) -- 20MB por arquivo
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

drop policy if exists treinamentos_bucket_authenticated_insert on storage.objects;
create policy treinamentos_bucket_authenticated_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'treinamentos');
drop policy if exists treinamentos_bucket_authenticated_update on storage.objects;
create policy treinamentos_bucket_authenticated_update on storage.objects
  for update to authenticated using (bucket_id = 'treinamentos') with check (bucket_id = 'treinamentos');
drop policy if exists treinamentos_bucket_authenticated_delete on storage.objects;
create policy treinamentos_bucket_authenticated_delete on storage.objects
  for delete to authenticated using (bucket_id = 'treinamentos');

-- ---------------------------------------------------------------------------
-- Funções do portal (sem login)
-- ---------------------------------------------------------------------------

-- Quem é o colaborador do link (token + CPF + nascimento conferidos; ativo). Interna.
create or replace function portal__colaborador(p_token text, p_cpf text, p_nascimento date)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from portal_colaborador p
  join colaboradores c on c.id = p.colaborador_id
  where p.token = p_token
    and not p.revogado
    and coalesce(c.status, '') <> 'Inativo'
    and length(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')) = 11
    and regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') = regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')
    and c.data_nascimento = p_nascimento
$$;
revoke all on function portal__colaborador(text, text, date) from public;

-- Entrada no portal: dados do colaborador, treinamentos atuais (sem o gabarito) e as
-- Instruções de Trabalho vigentes.
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

-- Marca um conteúdo (vídeo/material/instrução) como visto.
create or replace function portal_marcar_visto(p_token text, p_cpf text, p_nascimento date, p_atribuicao_id text, p_conteudo_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return false; end if;
  update treinamento_atribuicoes
    set conteudos_vistos = (select array(select distinct unnest(conteudos_vistos || array[left(p_conteudo_id, 80)]))),
        status = case when status = 'Pendente' then 'Em andamento' else status end
    where id = p_atribuicao_id and colaborador_id = v_colab and status <> 'Concluído';
  return found;
end;
$$;

-- Corrige a prova no servidor. p_respostas = { "<perguntaId>": <índice da alternativa> }.
create or replace function portal_enviar_prova(p_token text, p_cpf text, p_nascimento date, p_atribuicao_id text, p_respostas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  v_prova jsonb;
  v_total integer;
  v_acertos integer;
  v_nota numeric;
  v_minima numeric;
  v_aprovado boolean;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select t.prova into v_prova
    from treinamento_atribuicoes a join treinamentos t on t.id = a.treinamento_id
    where a.id = p_atribuicao_id and a.colaborador_id = v_colab and a.status <> 'Concluído';
  if v_prova is null then return jsonb_build_object('erro', 'prova'); end if;

  select count(*), count(*) filter (where (p_respostas ->> (q->>'id')) = (q->>'correta'))
    into v_total, v_acertos
    from jsonb_array_elements(v_prova->'perguntas') q;
  if v_total = 0 then return jsonb_build_object('erro', 'prova'); end if;

  v_nota := round(v_acertos * 100.0 / v_total);
  v_minima := coalesce((v_prova->>'notaMinima')::numeric, 70);
  v_aprovado := v_nota >= v_minima;

  update treinamento_atribuicoes
    set tentativas = tentativas || jsonb_build_array(jsonb_build_object('em', now(), 'nota', v_nota, 'aprovado', v_aprovado)),
        nota = case when v_aprovado then greatest(coalesce(nota, 0), v_nota) else nota end,
        status = case when status = 'Pendente' then 'Em andamento' else status end
    where id = p_atribuicao_id;

  return jsonb_build_object('nota', v_nota, 'aprovado', v_aprovado, 'notaMinima', v_minima, 'acertos', v_acertos, 'total', v_total);
end;
$$;

-- Conclui o treinamento: exige todos os conteúdos vistos e prova aprovada (se houver);
-- grava assinatura/declaração e calcula a validade.
create or replace function portal_concluir(p_token text, p_cpf text, p_nascimento date, p_atribuicao_id text, p_assinatura text, p_declaracao text, p_navegador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
  a treinamento_atribuicoes;
  t treinamentos;
  v_faltando integer;
  v_valido date;
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  select * into a from treinamento_atribuicoes where id = p_atribuicao_id and colaborador_id = v_colab;
  if not found then return jsonb_build_object('erro', 'dados'); end if;
  if a.status = 'Concluído' then return jsonb_build_object('erro', 'concluido'); end if;
  select * into t from treinamentos where id = a.treinamento_id;

  select count(*) into v_faltando
    from jsonb_array_elements(t.conteudos) c
    where not ((c->>'id') = any(a.conteudos_vistos));
  if v_faltando > 0 then return jsonb_build_object('erro', 'conteudos'); end if;

  if t.prova is not null and not exists (
    select 1 from jsonb_array_elements(a.tentativas) x where (x->>'aprovado')::boolean
  ) then
    return jsonb_build_object('erro', 'prova');
  end if;

  if p_assinatura is null or p_assinatura not like 'data:image/png;base64,%' or length(p_assinatura) > 700000 then
    return jsonb_build_object('erro', 'assinatura');
  end if;

  v_valido := case when t.validade_meses is null then null else (current_date + make_interval(months => t.validade_meses))::date end;
  update treinamento_atribuicoes
    set status = 'Concluído',
        concluido_em = now(),
        valido_ate = v_valido,
        assinatura_imagem = p_assinatura,
        declaracao = left(coalesce(p_declaracao, ''), 1000),
        navegador = left(coalesce(p_navegador, ''), 500)
    where id = a.id;
  return jsonb_build_object('ok', true, 'concluidoEm', now(), 'validoAte', v_valido);
end;
$$;

revoke all on function portal_entrar(text, text, date) from public;
revoke all on function portal_marcar_visto(text, text, date, text, text) from public;
revoke all on function portal_enviar_prova(text, text, date, text, jsonb) from public;
revoke all on function portal_concluir(text, text, date, text, text, text, text) from public;
grant execute on function portal_entrar(text, text, date) to anon, authenticated;
grant execute on function portal_marcar_visto(text, text, date, text, text) to anon, authenticated;
grant execute on function portal_enviar_prova(text, text, date, text, jsonb) to anon, authenticated;
grant execute on function portal_concluir(text, text, date, text, text, text, text) to anon, authenticated;
