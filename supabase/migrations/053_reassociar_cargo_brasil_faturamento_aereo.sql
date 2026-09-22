-- ============================================================================
-- Reassocia os lançamentos/faturas da Cargo Brasil já importados ao cliente
-- único do cadastro — corrige "CARGO BRASIL LTDA" aparecendo como empresa
-- separada de "Cargo Brasil Urgente" na tela de Faturamento (Farma Aéreo e
-- Rodoviário compartilham a mesma tabela, distinguidas só pela coluna modal).
--
-- Causa: relatórios que a própria Cargo Brasil manda usam a razão social
-- completa ("CARGO BRASIL LTDA"), enquanto o cadastro no sistema é o nome
-- fantasia ("Cargo Brasil Urgente") — "urgente" no MEIO do nome quebra o
-- includes() nos dois sentidos usado antes pra casar nome da planilha com
-- nome do cadastro (mapRowsToFaturamentoAereo, ver
-- src/components/FarmaAereo/faturamentoAereoUtils.ts), e a importação criava
-- "CARGO BRASIL LTDA" como cliente fantasma separado (sem cliente_id) em vez
-- de cair no cadastro certo. Já corrigido no código (mesmo raciocínio do
-- caso BOMI, migração 020); esta migração corrige só os dados que já foram
-- importados ANTES dessa correção.
--
-- Diferente da 020 (BOMI), aqui também iguala o cliente_nome ao nome do
-- cadastro — a tela de Faturamento só deixa juntar CT-es na MESMA fatura
-- quando o texto do cliente bate (ver nomesClienteSelecionados em
-- FaturamentoAereoView.tsx); só corrigir o cliente_id não seria suficiente
-- pra sumir com o aviso "selecione CT-es de um único cliente".
-- ============================================================================

do $$
declare
  v_cargo_brasil_id text;
  v_cargo_brasil_nome text;
  v_lancamentos_atualizados int;
  v_faturas_atualizadas int;
begin
  select id, coalesce(nome_fantasia, razao_social)
  into v_cargo_brasil_id, v_cargo_brasil_nome
  from clientes
  where razao_social ilike '%cargo brasil%' or nome_fantasia ilike '%cargo brasil%'
  limit 1;

  if v_cargo_brasil_id is null then
    raise notice 'Nenhum cliente com "Cargo Brasil" no nome foi encontrado — nada foi alterado. Confira o cadastro em Clientes.';
    return;
  end if;

  update lancamentos_faturamento_aereo
  set cliente_id = v_cargo_brasil_id,
      cliente_nome = v_cargo_brasil_nome
  where cliente_nome ilike '%cargo brasil%'
    and (cliente_id is distinct from v_cargo_brasil_id or cliente_nome is distinct from v_cargo_brasil_nome);
  get diagnostics v_lancamentos_atualizados = row_count;

  update faturas_aereo
  set cliente_id = v_cargo_brasil_id,
      cliente_nome = v_cargo_brasil_nome
  where cliente_nome ilike '%cargo brasil%'
    and (cliente_id is distinct from v_cargo_brasil_id or cliente_nome is distinct from v_cargo_brasil_nome);
  get diagnostics v_faturas_atualizadas = row_count;

  raise notice 'Cargo Brasil (cliente %, "%"): % lançamento(s) e % fatura(s) reassociados.',
    v_cargo_brasil_id, v_cargo_brasil_nome, v_lancamentos_atualizados, v_faturas_atualizadas;
end $$;
