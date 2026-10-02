-- ============================================================================
-- Comunicados padronizados (colaboradores e clientes) — decisões de 2026-10-02:
--   - um comunicado, três formatos no padrão JMT: texto (WhatsApp/e-mail),
--     imagem (modelos prontos) e PDF numerado;
--   - e-mail: o sistema monta e abre no e-mail do usuário (sem servidor de envio);
--   - histórico + ciência: cada destinatário recebe um link próprio
--     (?form=comunicado&token=) que registra a abertura e, se o comunicado
--     pedir, a confirmação de ciência.
--
-- Segurança: anon não lê as tabelas; o link só passa pelas funções abaixo, que
-- devolvem o comunicado e o primeiro nome do destinatário — nada além.
-- A imagem gerada fica no bucket PÚBLICO "comunicados" (é feita pra circular
-- no WhatsApp; não colocar dado pessoal sensível nela).
-- ============================================================================

create table if not exists comunicados (
  id text primary key,
  numero integer not null,
  ano integer not null,
  titulo text not null,
  categoria text not null default 'Aviso',
  publico text not null default 'colaboradores', -- 'colaboradores' | 'clientes'
  corpo text not null,
  assinatura text not null default 'Departamento Pessoal',
  modelo_imagem text not null default 'aviso',
  destaque text,          -- linha curta extra da imagem (ex.: data/local do evento)
  imagem_url text,        -- PNG gerado (bucket público "comunicados")
  foto_url text,          -- foto opcional usada no modelo (bucket público "comunicados")
  exige_ciencia boolean not null default false,
  criado_por text,
  criado_em timestamptz not null default now(),
  unique (ano, numero)
);

create table if not exists comunicado_destinatarios (
  id text primary key,
  comunicado_id text not null references comunicados(id) on delete cascade,
  tipo text not null,         -- 'colaborador' | 'contato_cliente'
  ref_id text,                -- id do colaborador ou "<clienteId>:<contatoId>"
  nome text not null,
  empresa text,               -- cliente (nome fantasia) quando for contato de cliente
  telefone text,
  email text,
  token text not null unique,
  enviado_em timestamptz,     -- clicou em enviar (WhatsApp/e-mail) no sistema
  canal text,                 -- 'whatsapp' | 'email'
  visualizado_em timestamptz,
  ciente_em timestamptz,
  navegador text
);
create index if not exists idx_comunicado_destinatarios_comunicado on comunicado_destinatarios(comunicado_id);

alter table comunicados enable row level security;
alter table comunicado_destinatarios enable row level security;
drop policy if exists comunicados_auth on comunicados;
create policy comunicados_auth on comunicados for all to authenticated using (true) with check (true);
drop policy if exists comunicado_destinatarios_auth on comunicado_destinatarios;
create policy comunicado_destinatarios_auth on comunicado_destinatarios for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('comunicados', 'comunicados', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;
drop policy if exists comunicados_bucket_insert on storage.objects;
create policy comunicados_bucket_insert on storage.objects for insert to authenticated with check (bucket_id = 'comunicados');
drop policy if exists comunicados_bucket_update on storage.objects;
create policy comunicados_bucket_update on storage.objects for update to authenticated using (bucket_id = 'comunicados') with check (bucket_id = 'comunicados');
drop policy if exists comunicados_bucket_delete on storage.objects;
create policy comunicados_bucket_delete on storage.objects for delete to authenticated using (bucket_id = 'comunicados');

-- Abre o comunicado pelo link do destinatário (registra a 1ª visualização).
create or replace function comunicado_abrir(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d comunicado_destinatarios;
  c comunicados;
begin
  select * into d from comunicado_destinatarios where token = p_token;
  if not found then return jsonb_build_object('erro', 'link'); end if;
  select * into c from comunicados where id = d.comunicado_id;
  if d.visualizado_em is null then
    update comunicado_destinatarios set visualizado_em = now() where id = d.id;
  end if;
  return jsonb_build_object(
    'numero', c.numero,
    'ano', c.ano,
    'titulo', c.titulo,
    'categoria', c.categoria,
    'corpo', c.corpo,
    'assinatura', c.assinatura,
    'imagemUrl', c.imagem_url,
    'criadoEm', c.criado_em,
    'exigeCiencia', c.exige_ciencia,
    'primeiroNome', split_part(trim(d.nome), ' ', 1),
    'cienteEm', d.ciente_em
  );
end;
$$;

-- Confirma a ciência (uma vez).
create or replace function comunicado_confirmar(p_token text, p_navegador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d comunicado_destinatarios;
begin
  select * into d from comunicado_destinatarios where token = p_token;
  if not found then return jsonb_build_object('erro', 'link'); end if;
  if d.ciente_em is not null then return jsonb_build_object('cienteEm', d.ciente_em); end if;
  update comunicado_destinatarios
    set ciente_em = now(), visualizado_em = coalesce(visualizado_em, now()), navegador = left(coalesce(p_navegador, ''), 500)
    where id = d.id;
  return jsonb_build_object('cienteEm', now());
end;
$$;

revoke all on function comunicado_abrir(text) from public;
revoke all on function comunicado_confirmar(text, text) from public;
grant execute on function comunicado_abrir(text) to anon, authenticated;
grant execute on function comunicado_confirmar(text, text) to anon, authenticated;
