-- ============================================================================
-- Reassocia os lançamentos/faturas da BOMI já importados aos cliente único
-- "BOMI Brasil" no cadastro — corrige empresas "fantasma" na tela de
-- Faturamento Farma Aéreo (Biomedical Distribution (Goiás)/(Itajaí)/
-- (Itapevi)/(Rio de Janeiro) apareciam como empresas separadas, sem estar
-- vinculadas ao cadastro real da BOMI).
--
-- Causa: a planilha de conferência que a própria BOMI usa lista o nome do
-- CLIENTE FINAL dela por região ("Biomedical Distribution (Itapevi)" etc.)
-- em vez do nome da própria BOMI — a importação (mapRowsToFaturamentoAereo,
-- ver src/components/FarmaAereo/faturamentoAereoUtils.ts) não reconhecia essa
-- variação e criava cada lançamento/fatura sem cliente_id, caindo no nome
-- bruto da planilha como um cliente separado no filtro por empresa. Já
-- corrigido no código (mesmo reconhecimento — nome contém BIOMEDICAL ou
-- BOMI — que já existia em getTemplateParaFatura pra escolher o modelo de
-- exportação certo por região); esta migração corrige só os dados que já
-- foram importados ANTES dessa correção.
-- ============================================================================

do $$
declare
  v_bomi_id text;
  v_lancamentos_atualizados int;
  v_faturas_atualizadas int;
begin
  select id into v_bomi_id
  from clientes
  where razao_social ilike '%bomi%' or nome_fantasia ilike '%bomi%'
     or razao_social ilike '%biomedical%' or nome_fantasia ilike '%biomedical%'
  limit 1;

  if v_bomi_id is null then
    raise notice 'Nenhum cliente com "BOMI" ou "Biomedical" no nome foi encontrado — nada foi alterado. Confira o cadastro em Clientes.';
    return;
  end if;

  update lancamentos_faturamento_aereo
  set cliente_id = v_bomi_id
  where cliente_id is distinct from v_bomi_id
    and (cliente_nome ilike '%biomedical%' or cliente_nome ilike '%bomi%');
  get diagnostics v_lancamentos_atualizados = row_count;

  update faturas_aereo
  set cliente_id = v_bomi_id
  where cliente_id is distinct from v_bomi_id
    and (cliente_nome ilike '%biomedical%' or cliente_nome ilike '%bomi%');
  get diagnostics v_faturas_atualizadas = row_count;

  raise notice 'BOMI (cliente %): % lançamento(s) e % fatura(s) reassociados.',
    v_bomi_id, v_lancamentos_atualizados, v_faturas_atualizadas;
end $$;
