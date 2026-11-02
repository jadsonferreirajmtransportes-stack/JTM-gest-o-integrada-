-- ============================================================================
-- 089 — Notas & Ideias: página do tipo QUADRO (mapa / fluxograma estilo Miro).
--
-- tipo: 'pagina' (a nota de sempre, em blocos) ou 'quadro' (quadro de desenho).
-- quadro: {"nos": [...formas...], "arestas": [...setas...]} — só preenchido nos quadros.
-- As páginas antigas continuam iguais (tipo 'pagina').
-- Rodar no SQL Editor do dev e da produção ANTES de publicar o código.
-- ============================================================================

alter table notas_paginas add column if not exists tipo text not null default 'pagina';
alter table notas_paginas add column if not exists quadro jsonb;
