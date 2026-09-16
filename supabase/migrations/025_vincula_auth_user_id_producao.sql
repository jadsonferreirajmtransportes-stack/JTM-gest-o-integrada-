-- ============================================================================
-- Vincula diretamente cada cadastro em `usuarios` ao UID real dele no Supabase
-- Auth (Authentication > Users), em vez de depender do casamento por e-mail
-- (vincularContaAutenticadaSeNecessario, em usuariosApi.ts).
--
-- Motivo: o cadastro do Jobson (usr-1789304947233) tem o e-mail
-- "jobsonmoraes.log@gmail.com", mas ele realmente loga com
-- "jobsondemoraes@hotmail.com" — e-mails diferentes, então o casamento
-- automático por e-mail nunca vinculava a conta dele, e ele sempre caía no
-- login de fallback (o mais antigo da lista). Isso fazia o Chat Interno (e
-- qualquer outra tela que dependa de "quem é você de verdade") mostrar dados
-- de outra pessoa, ou aparecer vazio.
--
-- Específico do projeto jmt-gestao-producao — os UIDs abaixo são os que
-- aparecem em Authentication > Users desse projeto (não rodar em dev com
-- estes mesmos valores; lá os UIDs são outros).
-- ============================================================================

update usuarios set auth_user_id = '88b7430d-07b6-418b-9997-80911292912a' where id = 'usr-1';
update usuarios set auth_user_id = '27de9fc3-7998-4608-9920-34a302b14cd0' where id = 'usr-1789304947233';
update usuarios set auth_user_id = '3e1aee71-1af0-4979-8ea7-bc04591f6e7e' where id = 'usr-1789415095045';

-- Corrige também o e-mail cadastrado do Jobson pra bater com o que ele usa de
-- verdade pra logar — evita a mesma confusão de novo em qualquer lugar do
-- sistema que mostre/use esse e-mail (ex.: reenvio de convite).
update usuarios set email = 'jobsondemoraes@hotmail.com' where id = 'usr-1789304947233';
