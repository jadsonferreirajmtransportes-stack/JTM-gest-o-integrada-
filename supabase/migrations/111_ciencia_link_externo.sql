-- 111: Padronização de documentos — CIÊNCIA POR LINK para pessoas de fora do sistema (ex.:
-- motoristas agregados). Um link só (?form=ciencia&t=...): a pessoa lê o documento no celular,
-- responde o questionário (perguntas com resposta certa; se errar, vê a explicação e refaz) e
-- confirma "li e estou ciente" com nome, CPF e telefone. A gestão vê quem confirmou.
-- O documento fica "congelado" no link (cópia da versão do momento) — editar o documento depois
-- não muda o que as pessoas leem, até clicar em "Atualizar o documento do link".
-- Rodar no dev e na produção ANTES de publicar.

create table if not exists documentos_ciencia_link (
  id text primary key,
  documento_id text not null,
  versao integer not null default 1,
  token text not null unique,
  titulo text not null,
  documento jsonb not null,          -- cópia: titulo, tipo, codigo, versao, dataDocumento, modelo, oficio, blocos
  perguntas jsonb not null default '[]'::jsonb, -- [{id, texto, opcoes[], correta, explicacao}]
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por text,
  atualizado_em timestamptz
);
create index if not exists documentos_ciencia_link_doc on documentos_ciencia_link (documento_id);
alter table documentos_ciencia_link enable row level security;
drop policy if exists documentos_ciencia_link_auth on documentos_ciencia_link;
create policy documentos_ciencia_link_auth on documentos_ciencia_link for all to authenticated using (true) with check (true);

create table if not exists documentos_ciencia_respostas (
  id text primary key,
  link_id text not null references documentos_ciencia_link(id) on delete cascade,
  nome text not null,
  cpf text not null,                 -- só dígitos; aparece mascarado na gestão
  telefone text,
  respostas jsonb not null default '[]'::jsonb,
  acertos integer not null default 0,
  total_perguntas integer not null default 0,
  tentativas integer not null default 1,
  versao integer,
  ciente_em timestamptz not null default now(),
  navegador text,
  unique (link_id, cpf)
);
alter table documentos_ciencia_respostas enable row level security;
drop policy if exists documentos_ciencia_respostas_auth on documentos_ciencia_respostas;
create policy documentos_ciencia_respostas_auth on documentos_ciencia_respostas for all to authenticated using (true) with check (true);

-- Abre o link (sem login): documento e perguntas.
create or replace function ciencia_link_abrir(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when l.id is null then jsonb_build_object('erro', 'link')
    else jsonb_build_object('titulo', l.titulo, 'documento', l.documento, 'perguntas', l.perguntas, 'versao', l.versao) end
  from (select 1) x
  left join documentos_ciencia_link l on l.token = p_token and l.ativo and length(coalesce(p_token, '')) >= 16
$$;
revoke all on function ciencia_link_abrir(text) from public;
grant execute on function ciencia_link_abrir(text) to anon, authenticated;

-- Confirma a ciência. Confere as respostas (todas precisam estar certas). Uma por CPF: quem
-- confirmar de novo (ex.: documento atualizado) substitui a anterior.
create or replace function ciencia_link_responder(p_token text, p_nome text, p_cpf text, p_telefone text, p_respostas jsonb, p_tentativas integer, p_navegador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l documentos_ciencia_link;
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_total integer;
  v_acertos integer := 0;
  v_em timestamptz := now();
  i integer;
begin
  select * into l from documentos_ciencia_link where token = p_token and ativo;
  if l.id is null or length(coalesce(p_token, '')) < 16 then return jsonb_build_object('erro', 'link'); end if;
  if length(btrim(coalesce(p_nome, ''))) < 3 then return jsonb_build_object('erro', 'nome'); end if;
  if length(v_cpf) <> 11 then return jsonb_build_object('erro', 'cpf'); end if;
  v_total := jsonb_array_length(l.perguntas);
  if v_total > 0 then
    if jsonb_typeof(p_respostas) <> 'array' or jsonb_array_length(p_respostas) <> v_total then return jsonb_build_object('erro', 'respostas'); end if;
    for i in 0 .. v_total - 1 loop
      if (p_respostas->>i) = (l.perguntas->i->>'correta') then v_acertos := v_acertos + 1; end if;
    end loop;
    if v_acertos < v_total then return jsonb_build_object('erro', 'respostas'); end if;
  end if;
  insert into documentos_ciencia_respostas (id, link_id, nome, cpf, telefone, respostas, acertos, total_perguntas, tentativas, versao, ciente_em, navegador)
  values ('cie-' || replace(gen_random_uuid()::text, '-', ''), l.id, left(btrim(p_nome), 120), v_cpf, left(nullif(btrim(coalesce(p_telefone, '')), ''), 30),
    coalesce(p_respostas, '[]'::jsonb), v_acertos, v_total, greatest(coalesce(p_tentativas, 1), 1), l.versao, v_em, left(p_navegador, 300))
  on conflict (link_id, cpf) do update set
    nome = excluded.nome, telefone = excluded.telefone, respostas = excluded.respostas, acertos = excluded.acertos,
    total_perguntas = excluded.total_perguntas, tentativas = excluded.tentativas, versao = excluded.versao,
    ciente_em = excluded.ciente_em, navegador = excluded.navegador;
  return jsonb_build_object('ok', true, 'cienteEm', v_em);
end;
$$;
revoke all on function ciencia_link_responder(text, text, text, text, jsonb, integer, text) from public;
grant execute on function ciencia_link_responder(text, text, text, text, jsonb, integer, text) to anon, authenticated;

notify pgrst, 'reload schema';
