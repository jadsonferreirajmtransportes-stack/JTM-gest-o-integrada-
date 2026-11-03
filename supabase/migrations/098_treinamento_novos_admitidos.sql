-- 098: treinamento obrigatório só para os NOVOS colaboradores (admitidos a partir de uma data).
-- Usado pelo treinamento de boas-vindas (norteadores + Regulamento Interno), mas vale para
-- qualquer treinamento: "Quem precisa fazer" → "Só os novos colaboradores, admitidos a partir de".
-- Rodar no dev e na produção ANTES de publicar.

alter table treinamentos add column if not exists admitidos_desde date;

notify pgrst, 'reload schema';
