-- ============================================================================
-- Onde fica a linha de assinatura do EMPREGADO dentro do PDF de cada documento
-- (ver 057_documentos_assinatura.sql) — o "Baixar assinado" desenha a
-- assinatura do colaborador em cima de cada uma dessas linhas.
--
-- Calculado na importação, a partir do texto do PDF (linha "_____" com
-- "Empregado"/"Assinatura do Empregado"/"Funcionário" logo abaixo). Precisa
-- ser guardado porque o contracheque de folha com 2 por página é gravado como
-- imagem (sem texto) — depois não dá mais pra achar a linha no arquivo.
--
-- Formato: [{ "pagina": 0, "x": 64, "y": 520, "largura": 219, "altura": 32 }]
-- (pontos do PDF, origem no canto inferior esquerdo da página).
-- ============================================================================

alter table documentos_assinatura add column if not exists campos_assinatura jsonb;
