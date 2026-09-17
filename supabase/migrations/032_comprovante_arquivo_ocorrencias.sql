-- O comprovante de uma ocorrência (atestado, etc.) só guardava o NOME do arquivo, nunca o
-- conteúdo — não tinha como baixar de verdade. Mesmo padrão de anexo em base64 já usado em
-- colaboradores/ASO/admissão.
alter table ocorrencias add column if not exists comprovante_arquivo_url text;
