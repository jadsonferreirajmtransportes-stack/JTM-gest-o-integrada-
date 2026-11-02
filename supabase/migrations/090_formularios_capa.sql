-- ============================================================================
-- 090 — Formulários: imagem de CAPA (aparece no topo, no portal e no link externo).
-- A imagem fica no espaço público "formularios" (como as fotos do Jornal).
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

alter table formularios add column if not exists capa_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('formularios', 'formularios', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists formularios_bucket_insert on storage.objects;
create policy formularios_bucket_insert on storage.objects for insert to authenticated with check (bucket_id = 'formularios');
drop policy if exists formularios_bucket_update on storage.objects;
create policy formularios_bucket_update on storage.objects for update to authenticated using (bucket_id = 'formularios') with check (bucket_id = 'formularios');
drop policy if exists formularios_bucket_delete on storage.objects;
create policy formularios_bucket_delete on storage.objects for delete to authenticated using (bucket_id = 'formularios');

-- O que o portal / link externo recebe passa a trazer a capa.
create or replace function formulario__publico(f formularios)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', f.id,
    'titulo', f.titulo,
    'descricao', f.descricao,
    'capa', f.capa_url,
    'perguntas', f.perguntas,
    'identificacao', f.identificacao_externa,
    'mensagemFinal', f.mensagem_final,
    'encerraEm', f.encerra_em,
    'aberto', formulario__aberto(f)
  )
$$;

-- Lista do portal com a capa (miniatura).
create or replace function portal_formularios(p_token text, p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colab text := portal__colaborador(p_token, p_cpf, p_nascimento);
begin
  if v_colab is null then return jsonb_build_object('erro', 'dados'); end if;
  return jsonb_build_object('formularios', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id,
      'titulo', f.titulo,
      'descricao', f.descricao,
      'capa', f.capa_url,
      'encerraEm', f.encerra_em,
      'aberto', formulario__aberto(f),
      'respondidoEm', (select r.criado_em from formulario_respostas r where r.formulario_id = f.id and r.colaborador_id = v_colab)
    ) order by f.criado_em desc)
    from formularios f
    where f.no_portal and f.status in ('aberto', 'encerrado')
      and (f.destinatarios is null or f.destinatarios ? v_colab)
  ), '[]'::jsonb));
end;
$$;
revoke all on function portal_formularios(text, text, date) from public;
grant execute on function portal_formularios(text, text, date) to anon, authenticated;
