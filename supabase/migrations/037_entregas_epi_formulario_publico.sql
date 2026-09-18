-- ============================================================================
-- Formulário Público de Entrega de EPI (link compartilhável, ?form=epi_entrega)
-- — link GENÉRICO (o mesmo link serve pra qualquer entrega), preenchido por um
-- supervisor/responsável em nome do colaborador, com assinatura digital
-- (desenhada na tela) em vez de exigir assinatura no papel depois.
--
-- Mesmo raciocínio já documentado em 019_acesso_publico_ocorrencias.sql: quem
-- preenche esse link nunca faz login (roda como "anon"), então precisa de uma
-- política própria de INSERT — nunca abrir a tabela pra leitura por "anon".
-- A leitura da lista de colaboradores pro <select> já está resolvida (mesma
-- função obter_colaboradores_ativos_publico() de 019, reaproveitada aqui).
-- ============================================================================

alter table entregas_epi add column if not exists assinatura_digital_url text;

drop policy if exists entregas_epi_anon_insert on entregas_epi;
create policy entregas_epi_anon_insert on entregas_epi
  for insert to anon with check (true);
