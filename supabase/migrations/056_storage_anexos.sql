-- ============================================================================
-- Supabase Storage para os anexos do sistema (fotos, PDFs, comprovantes).
--
-- Até aqui todo anexo era gravado em base64 DENTRO das linhas do banco (ASO e
-- documentos de colaborador, anexos de projeto, chat, compras...), o que fez o
-- banco crescer (219MB de 500MB do plano em set/2026 — só `colaboradores` tinha
-- ~80MB) e deixava cada gravação lenta (limite combinado de 20MB por
-- colaborador pra não estourar statement_timeout, ver migração 018).
--
-- A partir desta migração, anexos novos vão pra um bucket PRIVADO "anexos": o
-- banco guarda só a referência "storage:<caminho>" no mesmo campo onde antes
-- ficava o base64 (ver src/utils/arquivosStorage.ts). Arquivos antigos em
-- base64 continuam funcionando normalmente — as telas aceitam os dois formatos.
--
-- Privado de propósito (LGPD): documento de colaborador tem CPF, laudo médico,
-- etc. Ninguém abre um arquivo por URL pública; o app gera um link assinado
-- temporário (1h) na hora de mostrar. Mesmo padrão de acesso das tabelas
-- internas: usuário logado (authenticated) lê/grava; "anon" não tem acesso
-- nenhum por enquanto (formulários públicos continuam gravando em base64 até
-- ganharem política própria, só de envio, numa próxima etapa).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('anexos', 'anexos', false, 10485760) -- 10MB por arquivo
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

drop policy if exists anexos_authenticated_select on storage.objects;
create policy anexos_authenticated_select on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos');

drop policy if exists anexos_authenticated_insert on storage.objects;
create policy anexos_authenticated_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos');

drop policy if exists anexos_authenticated_update on storage.objects;
create policy anexos_authenticated_update on storage.objects
  for update to authenticated
  using (bucket_id = 'anexos')
  with check (bucket_id = 'anexos');

drop policy if exists anexos_authenticated_delete on storage.objects;
create policy anexos_authenticated_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos');
