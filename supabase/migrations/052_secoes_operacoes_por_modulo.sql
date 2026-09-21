-- ============================================================================
-- Troca o recorte de abas de operações (Visão Geral/Empresas/Equipe/Faturamento/
-- Custos) de um único conjunto compartilhado entre Farma Aéreo/Rodoviário/Operações
-- dinâmicas (secoes_operacoes_permitidas) para um recorte POR MÓDULO — dá pra
-- liberar, por exemplo, Faturamento na Unimed sem liberar no Farma Aéreo pro
-- mesmo login. Coluna é um jsonb `{ "<id do módulo>": ["aba1", "aba2", ...] }`.
--
-- Não apaga nem migra a coluna antiga (secoes_operacoes_permitidas) — ela continua
-- servindo de fallback de leitura pros logins já configurados antes dessa mudança
-- (ver podeVerAbaOperacoes em src/utils/visibilidadeUtils.ts). Só passa a não ser
-- mais gravada a partir de agora.
-- ============================================================================

alter table usuarios add column if not exists secoes_operacoes_por_modulo jsonb;
