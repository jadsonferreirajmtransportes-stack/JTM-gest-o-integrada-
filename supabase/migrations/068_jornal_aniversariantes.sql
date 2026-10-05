-- ============================================================================
-- Jornal JMT — notícia automática de aniversariantes (2026-10-05).
-- Decisões do usuário:
--   - uma notícia por dia, só nos dias com aniversariante(s), com todos do dia;
--   - publicada sozinha de manhã (pg_cron, 07:00 de Fortaleza = 10:00 UTC),
--     sem depender de ninguém abrir o sistema;
--   - mostra nome, cargo e setor — nunca o ano de nascimento nem a idade;
--   - quem não quiser aparecer é desmarcado no cadastro (aparecer_aniversario).
-- A notícia aceita comentários (os colegas dão parabéns), moderados como as demais.
-- ============================================================================

alter table colaboradores add column if not exists aparecer_aniversario boolean not null default true;

-- "MARIA DA SILVA" -> "Maria da Silva"
create or replace function jornal__nome_bonito(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
           initcap(lower(btrim(coalesce(p, '')))),
           '\mDa\M', 'da', 'g'), '\mDe\M', 'de', 'g'), '\mDo\M', 'do', 'g'),
           '\mDas\M', 'das', 'g'), '\mDos\M', 'dos', 'g'), '\mE\M', 'e', 'g'),
           '\s+', ' ', 'g')
$$;

-- Gera (uma vez por dia) a notícia dos aniversariantes do dia. Devolve o id da notícia,
-- ou null quando não há aniversariante. Pode ser chamada de novo sem duplicar.
create or replace function jornal_gerar_aniversarios(p_dia date default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := coalesce(p_dia, (now() at time zone 'America/Fortaleza')::date);
  v_id text := 'aniv-' || to_char(v_dia, 'YYYY-MM-DD');
  v_nomes text[];
  v_linhas text;
  v_qtd int;
  v_bissexto boolean := extract(day from (date_trunc('year', v_dia) + interval '2 months' - interval '1 day')) = 29;
  v_titulo text;
  v_texto text;
  v_dia_extenso text;
begin
  if exists (select 1 from noticias where id = v_id) then
    return v_id;
  end if;

  select
    array_agg(jornal__nome_bonito(c.nome_completo) order by c.nome_completo),
    string_agg(
      '🎂 ' || jornal__nome_bonito(c.nome_completo) ||
      case when coalesce(btrim(c.funcao_cargo), '') <> '' then ' — ' || jornal__nome_bonito(c.funcao_cargo) else '' end ||
      case when coalesce(btrim(c.setor), '') <> '' then ' (' || jornal__nome_bonito(c.setor) || ')' else '' end,
      E'\n' order by c.nome_completo),
    count(*)
  into v_nomes, v_linhas, v_qtd
  from colaboradores c
  where coalesce(c.status, '') <> 'Inativo'
    and coalesce(c.aparecer_aniversario, true)
    and c.data_nascimento is not null
    and (
      (extract(month from c.data_nascimento) = extract(month from v_dia) and extract(day from c.data_nascimento) = extract(day from v_dia))
      -- nascidos em 29/02 comemoram em 28/02 nos anos que não são bissextos
      or (not v_bissexto and extract(month from v_dia) = 2 and extract(day from v_dia) = 28
          and extract(month from c.data_nascimento) = 2 and extract(day from c.data_nascimento) = 29)
    );

  if coalesce(v_qtd, 0) = 0 then
    return null;
  end if;

  v_dia_extenso := to_char(v_dia, 'DD') || ' de ' ||
    (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[extract(month from v_dia)::int];

  if v_qtd = 1 then
    v_titulo := 'Hoje é aniversário de ' || v_nomes[1] || '! 🎉';
    v_texto := 'Hoje, ' || v_dia_extenso || ', é dia de celebrar! 🎉' || E'\n\n' || v_linhas || E'\n\n' ||
      'A JM Transportes deseja um feliz aniversário, com muita saúde, alegria e conquistas. Obrigado por fazer parte da nossa equipe!' || E'\n\n' ||
      'Deixe seus parabéns aqui nos comentários. 💛';
  else
    v_titulo := 'Hoje tem ' || v_qtd || ' aniversariantes na JMT! 🎉';
    v_texto := 'Hoje, ' || v_dia_extenso || ', é dia de celebrar em dobro! 🎉' || E'\n\n' || v_linhas || E'\n\n' ||
      'A JM Transportes deseja a todos um feliz aniversário, com muita saúde, alegria e conquistas. Obrigado por fazerem parte da nossa equipe!' || E'\n\n' ||
      'Deixe seus parabéns aqui nos comentários. 💛';
  end if;

  insert into noticias (id, titulo, resumo, categoria, capa, blocos, status, destaque, permite_comentarios, autor_nome, criado_por, autorizacao_imagem, publicada_em)
  values (
    v_id,
    v_titulo,
    case when v_qtd = 1 then 'Parabéns! Deixe sua mensagem de carinho nos comentários.' else 'Parabéns a todos! Deixe sua mensagem de carinho nos comentários.' end,
    'Aniversários',
    '/jornal/aniversario.svg',
    jsonb_build_array(jsonb_build_object('id', 'bl-' || v_id, 'tipo', 'texto', 'texto', v_texto)),
    'publicada',
    false,
    true,
    'Comunicação JMT',
    'Automação de aniversariantes',
    false,
    now()
  )
  on conflict (id) do nothing;
  return v_id;
end;
$$;
revoke all on function jornal_gerar_aniversarios(date) from public, anon, authenticated;
revoke all on function jornal__nome_bonito(text) from public;

-- Agenda: todo dia às 10:00 UTC (07:00 em Fortaleza/Natal).
create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'jornal-aniversariantes';
  perform cron.schedule('jornal-aniversariantes', '0 10 * * *', 'select public.jornal_gerar_aniversarios();');
end;
$$;
