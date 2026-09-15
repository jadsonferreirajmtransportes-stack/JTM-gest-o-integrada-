-- ============================================================================
-- Reclassifica pra "Aéreo" os lançamentos/faturas que hoje aparecem no
-- Controle Financeiro do Farma Rodoviário (Modal = Rodoviário na linha),
-- mas cujo CLIENTE CADASTRADO é vinculado SÓ ao Farma Aéreo (não "ambos",
-- não Rodoviário) — ou seja, empresas que a JMT gerencia no Aéreo, mas cujas
-- linhas vieram com o Modal errado na planilha de origem (mesmo problema já
-- visto com a SafetyLog, migração 023 — agora resolvido de forma genérica
-- pra qualquer cliente nessa mesma situação, não só ela).
--
-- Critério de "vinculado só ao Aéreo" é o MESMO já usado em
-- isClienteFarmaAereo/isClienteFarmaRodoviario (src/utils/sectorUtils.ts):
-- setores_vinculados manda quando presente; sem isso, cai pro setor_atuacao.
--
-- NÃO mexe em:
-- - Cliente vinculado aos dois setores ("ambos") — aí o Modal da própria
--   linha continua sendo o critério certo (pode ter remessa aérea e
--   rodoviária de verdade pro mesmo cliente).
-- - Lançamento/fatura SEM cliente cadastrado vinculado (cliente_id nulo) —
--   sem outro sinal confiável pra saber de qual empresa é; usar o botão
--   "Mover pra Farma Aéreo" (filtro por Empresa) tela a tela pra esses.
-- ============================================================================

do $$
declare
  v_lancamentos_atualizados int;
  v_faturas_atualizadas int;
begin
  create temporary table clientes_so_aereo on commit drop as
  select c.id
  from clientes c
  where (
    case
      when c.setores_vinculados is not null then (c.setores_vinculados ? 'farma_aereo')
      else (c.setor_atuacao in ('farma_aereo', 'ambos'))
    end
  )
  and not (
    case
      when c.setores_vinculados is not null then (c.setores_vinculados ? 'farma_rodoviario')
      else (c.setor_atuacao in ('farma_rodoviario', 'ambos'))
    end
  );

  update lancamentos_faturamento_aereo l
  set modal = 'Aéreo'
  where l.modal ilike '%rodoviari%'
    and l.cliente_id in (select id from clientes_so_aereo);
  get diagnostics v_lancamentos_atualizados = row_count;

  update faturas_aereo f
  set modal = 'Aéreo'
  where f.modal ilike '%rodoviari%'
    and f.cliente_id in (select id from clientes_so_aereo);
  get diagnostics v_faturas_atualizadas = row_count;

  raise notice 'Clientes vinculados só ao Aéreo: % lançamento(s) e % fatura(s) reclassificados de Rodoviário pra Aéreo.',
    v_lancamentos_atualizados, v_faturas_atualizadas;
end $$;
