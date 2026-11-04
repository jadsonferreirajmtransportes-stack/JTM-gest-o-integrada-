-- 104: espaço "anexos" do Storage aceita arquivos de até 50MB (era 10MB). Necessário para mover
-- os anexos antigos grandes (documentos de projetos, dossiês) que estavam em base64 nas tabelas.
-- As telas continuam limitando os envios novos (8MB) como antes.
-- Rodar no dev e na produção ANTES de usar a ferramenta "Mover anexos antigos".

update storage.buckets set file_size_limit = 52428800 where id = 'anexos';
