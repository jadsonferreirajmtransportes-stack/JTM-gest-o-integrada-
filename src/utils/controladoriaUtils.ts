// ============================================================================
// Controladoria — cálculos da DRE Gerencial e do Orçado x Realizado.
//
// Referência conceitual: módulos "07 - Controladoria Aplicada" e "03 - Planejamento
// e Controle Orçamentário" (MBA em Gestão de Negócios, Finanças e Controladoria).
// Termos usados aqui seguem o glossário desses módulos: margem de contribuição,
// ponto de equilíbrio, custeio variável (custos fixos tratados à parte dos
// variáveis), CAPEX/OPEX, orçado x realizado.
//
// Princípio adotado: esta tela só mostra dado REAL lançado no sistema — ao
// contrário do painel de cada setor (ver calcFinancialsSetor em sectorUtils.ts),
// que usa percentuais estimados quando não há custo cadastrado, aqui um item sem
// lançamento aparece como zero, nunca como estimativa. A Controladoria existe pra
// dar confiança à informação (ver mensagem central do módulo 07); número
// inventado, mesmo que "razoável", vai contra esse propósito.
//
// Limitações conhecidas (documentadas em vez de escondidas):
//  - Folha de pagamento: não existe uma "folha histórica" mês a mês no sistema —
//    só o cadastro ATUAL de cada colaborador ativo. Por isso a Folha da DRE
//    reflete sempre o quadro/salários de HOJE, não necessariamente o que foi
//    pago exatamente na competência selecionada (relevante ao olhar meses
//    passados com admissões/desligamentos recentes).
//  - CAPEX (Projetos Gerenciais): custoRealizado é um total acumulado do projeto
//    inteiro, sem lançamento mês a mês. Por isso o CAPEX é mostrado por ANO da
//    competência (todo projeto com início nesse ano), não por mês exato.
// ============================================================================

import {
  Colaborador,
  CustoOperacional,
  CategoriaCustoOperacional,
  LancamentoFaturamentoAereo,
  ProjetoGerencial,
  SetorCustoOperacional,
  OrcamentoItem,
  TipoLinhaOrcamento,
} from '../types';
import { isColaboradorFarmaAereo, isColaboradorFarmaRodoviario } from './sectorUtils';
import { ehModalRodoviario } from '../components/FarmaAereo/faturamentoAereoUtils';

export type SetorDre = SetorCustoOperacional | 'consolidado';

/** Classificação Fixo x Variável por categoria de Custo Operacional — regra de negócio fixa,
 *  sem campo novo no banco. Critério: escala com o volume operado (combustível, pedágio,
 *  tarifas por embarque) = Variável; o resto (estrutura, regulatório, seguros, manutenção
 *  preventiva) = Fixo. Ajustável aqui se a realidade da operação mudar. */
export const CATEGORIA_CUSTO_TIPO: Record<CategoriaCustoOperacional, 'Fixo' | 'Variável'> = {
  'Combustível & Abastecimento': 'Variável',
  'Manutenção Mecânica & Peças': 'Fixo',
  'Refrigeração & Thermo King / Carrier': 'Fixo',
  'Pedágios & ConectCar / Sem Parar': 'Variável',
  'Fretes & Tarifas Aéreas (Cias)': 'Variável',
  'Embalagens Térmicas & Gelo Seco / PCM': 'Variável',
  'Qualificação Térmica & Dataloggers (RDC 430)': 'Fixo',
  'Armazenagem TECA & Câmaras Frias': 'Fixo',
  'Seguros de Carga (RCTR-C / RCF-DC)': 'Fixo',
  'Sanitização & Limpeza Técnica de Baús': 'Fixo',
  'Coletas de Urgência & Last-Mile': 'Variável',
  'EPIs & Uniformes Operacionais': 'Fixo',
  'Diárias & Alimentação de Motoristas': 'Variável',
  'Outros Custos Operacionais': 'Fixo',
};

function tipoDaCategoria(categoria: string): 'Fixo' | 'Variável' {
  return CATEGORIA_CUSTO_TIPO[categoria as CategoriaCustoOperacional] || 'Fixo';
}

/** Mesmo percentual de encargos CLT patronais (FGTS 8% + 13º 8,33% + Férias 11,11% + INSS
 *  Patronal ~8%) já usado em calcFinancialsSetor (sectorUtils.ts) — repetido aqui em vez de
 *  importado porque calcFinancialsSetor também mistura estimativas de custo operacional
 *  (%-do-faturamento) que a Controladoria propositalmente não usa. */
const ENCARGOS_CLT_PERCENTUAL = 0.3544;
const VA_DIA_PADRAO = 35.0;
const DIAS_UTEIS_MES = 22;

export interface FolhaPagamentoDetalhe {
  headcount: number;
  salarios: number;
  gratificacoes: number;
  beneficios: number;
  encargos: number;
  total: number;
}

function colaboradorNoSetor(c: Colaborador, setor: SetorDre): boolean {
  if (setor === 'consolidado') return true;
  if (setor === 'farma_aereo') return isColaboradorFarmaAereo(c);
  if (setor === 'farma_rodoviario') return isColaboradorFarmaRodoviario(c);
  // 'geral' = administrativo — quem não está vinculado a nenhum dos dois setores operacionais.
  return !isColaboradorFarmaAereo(c) && !isColaboradorFarmaRodoviario(c);
}

export function calcFolhaPagamentoSetor(colaboradores: Colaborador[], setor: SetorDre): FolhaPagamentoDetalhe {
  const ativos = (colaboradores || []).filter((c) => c.status !== 'Inativo' && colaboradorNoSetor(c, setor));
  let salarios = 0;
  let gratificacoes = 0;
  let beneficios = 0;
  let encargos = 0;
  ativos.forEach((c) => {
    const sal = Number(c.remuneracao) || 0;
    const grat = Number(c.gratificacao) || 0;
    const vtMes = (Number(c.vtValorTarifa) || 0) * (Number(c.vtQuantidadeTarifasDia) || 0) * DIAS_UTEIS_MES;
    const vaMes = (Number(c.valorValeAlimentacaoDia) || VA_DIA_PADRAO) * DIAS_UTEIS_MES;
    salarios += sal;
    gratificacoes += grat;
    beneficios += vtMes + vaMes;
    encargos += (sal + grat) * ENCARGOS_CLT_PERCENTUAL;
  });
  return {
    headcount: ativos.length,
    salarios,
    gratificacoes,
    beneficios,
    encargos,
    total: salarios + gratificacoes + beneficios + encargos,
  };
}

/** Receita realizada (faturado) de um setor numa competência — a partir do Controle Financeiro
 *  (mesma tabela de lançamentos compartilhada entre Farma Aéreo e Rodoviário, separada pelo
 *  campo `modal`; ver ehModalRodoviario). 'geral' não fatura nada diretamente. */
export function calcReceitaRealizada(
  lancamentos: LancamentoFaturamentoAereo[],
  setor: SetorDre,
  competencia: string
): number {
  if (setor === 'geral') return 0;
  return (lancamentos || [])
    .filter((l) => {
      const rodoviario = ehModalRodoviario(l.modal);
      const setorOk =
        setor === 'consolidado' ? true : setor === 'farma_rodoviario' ? rodoviario : !rodoviario;
      const dataOk = (l.dataEmissao || '').slice(0, 7) === competencia;
      return setorOk && dataOk;
    })
    .reduce((soma, l) => soma + (Number(l.valorACobrar) || 0), 0);
}

export interface ItemCustoAgrupado {
  categoria: string;
  valor: number;
}

export interface CustosPorTipo {
  fixos: number;
  variaveis: number;
  itensFixos: ItemCustoAgrupado[];
  itensVariaveis: ItemCustoAgrupado[];
}

export function calcCustosOperacionaisPorTipo(
  custos: CustoOperacional[],
  setor: SetorDre,
  competencia: string
): CustosPorTipo {
  const fixosPorCategoria: Record<string, number> = {};
  const variaveisPorCategoria: Record<string, number> = {};

  (custos || []).forEach((c) => {
    const setorOk = setor === 'consolidado' ? true : c.setor === setor;
    if (!setorOk) return;
    if ((c.dataCompetencia || '').slice(0, 7) !== competencia) return;
    const valor = Number(c.valor) || 0;
    const categoria = c.categoria || 'Outros Custos Operacionais';
    if (tipoDaCategoria(categoria) === 'Variável') {
      variaveisPorCategoria[categoria] = (variaveisPorCategoria[categoria] || 0) + valor;
    } else {
      fixosPorCategoria[categoria] = (fixosPorCategoria[categoria] || 0) + valor;
    }
  });

  const toItens = (rec: Record<string, number>): ItemCustoAgrupado[] =>
    Object.entries(rec)
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);

  const itensFixos = toItens(fixosPorCategoria);
  const itensVariaveis = toItens(variaveisPorCategoria);

  return {
    fixos: itensFixos.reduce((s, i) => s + i.valor, 0),
    variaveis: itensVariaveis.reduce((s, i) => s + i.valor, 0),
    itensFixos,
    itensVariaveis,
  };
}

function setorImpactadoParaSetorDre(setorImpactado: string): SetorCustoOperacional {
  if (setorImpactado === 'Farma Aéreo') return 'farma_aereo';
  if (setorImpactado === 'Farma Rodoviário') return 'farma_rodoviario';
  return 'geral';
}

/** CAPEX do ANO da competência (ver limitação no cabeçalho do arquivo) — soma o custoRealizado
 *  de projetos com investimento (Capex ou Misto) cujo início é no mesmo ano. */
export function calcCapexDoAno(projetos: ProjetoGerencial[], setor: SetorDre, competencia: string): number {
  const ano = (competencia || '').slice(0, 4);
  return (projetos || [])
    .filter((p) => {
      if (p.tipoInvestimento !== 'Capex' && p.tipoInvestimento !== 'Misto') return false;
      if ((p.dataInicio || '').slice(0, 4) !== ano) return false;
      if (setor === 'consolidado') return true;
      return setorImpactadoParaSetorDre(p.setorImpactado) === setor;
    })
    .reduce((soma, p) => soma + (Number(p.custoRealizado) || 0), 0);
}

export interface DreGerencialResultado {
  setor: SetorDre;
  competencia: string;
  receita: number;
  custosVariaveis: number;
  itensCustosVariaveis: ItemCustoAgrupado[];
  margemContribuicao: number;
  margemContribuicaoPercentual: number;
  custosFixosOperacionais: number;
  itensCustosFixos: ItemCustoAgrupado[];
  folha: FolhaPagamentoDetalhe;
  custosFixosTotal: number;
  resultadoOperacional: number;
  capexDoAno: number;
  resultadoPeriodo: number;
  /** Receita necessária pra empatar (custos fixos ÷ margem de contribuição %). null quando a
   *  margem de contribuição percentual é zero ou negativa (não dá pra calcular). */
  pontoEquilibrioReceita: number | null;
}

export function calcularDreGerencial(params: {
  setor: SetorDre;
  competencia: string; // 'YYYY-MM'
  custosOperacionais: CustoOperacional[];
  colaboradores: Colaborador[];
  lancamentosFaturamentoAereo: LancamentoFaturamentoAereo[];
  projetos: ProjetoGerencial[];
}): DreGerencialResultado {
  const { setor, competencia, custosOperacionais, colaboradores, lancamentosFaturamentoAereo, projetos } = params;

  const receita = calcReceitaRealizada(lancamentosFaturamentoAereo, setor, competencia);
  const custos = calcCustosOperacionaisPorTipo(custosOperacionais, setor, competencia);
  const folha = calcFolhaPagamentoSetor(colaboradores, setor);
  const capexDoAno = calcCapexDoAno(projetos, setor, competencia);

  const margemContribuicao = receita - custos.variaveis;
  const margemContribuicaoPercentual = receita > 0 ? (margemContribuicao / receita) * 100 : 0;
  const custosFixosTotal = custos.fixos + folha.total;
  const resultadoOperacional = margemContribuicao - custosFixosTotal;
  const resultadoPeriodo = resultadoOperacional - capexDoAno;
  const pontoEquilibrioReceita =
    margemContribuicaoPercentual > 0 ? custosFixosTotal / (margemContribuicaoPercentual / 100) : null;

  return {
    setor,
    competencia,
    receita,
    custosVariaveis: custos.variaveis,
    itensCustosVariaveis: custos.itensVariaveis,
    margemContribuicao,
    margemContribuicaoPercentual,
    custosFixosOperacionais: custos.fixos,
    itensCustosFixos: custos.itensFixos,
    folha,
    custosFixosTotal,
    resultadoOperacional,
    capexDoAno,
    resultadoPeriodo,
    pontoEquilibrioReceita,
  };
}

// ============================================================================
// ORÇADO x REALIZADO
// ============================================================================

export const TIPOS_LINHA_ORCAMENTO: TipoLinhaOrcamento[] = [
  'Receita',
  'Custos Variáveis',
  'Custos Fixos',
  'Folha de Pagamento',
  'Investimentos (CAPEX)',
];

export interface LinhaOrcadoRealizado {
  tipoLinha: TipoLinhaOrcamento;
  planejado: number;
  realizado: number;
  desvio: number; // realizado - planejado
  desvioPercentual: number | null; // desvio ÷ planejado, null quando planejado = 0
  /** Receita: realizado maior que o planejado é favorável. Custos/Folha/CAPEX: realizado menor
   *  que o planejado é favorável. */
  favoravel: boolean | null; // null quando não há orçamento lançado pra comparar
}

/** Valor "realizado" de uma linha do orçamento, a partir do mesmo cálculo da DRE Gerencial. */
export function realizadoDaLinha(tipoLinha: TipoLinhaOrcamento, dre: DreGerencialResultado): number {
  switch (tipoLinha) {
    case 'Receita':
      return dre.receita;
    case 'Custos Variáveis':
      return dre.custosVariaveis;
    case 'Custos Fixos':
      return dre.custosFixosOperacionais;
    case 'Folha de Pagamento':
      return dre.folha.total;
    case 'Investimentos (CAPEX)':
      return dre.capexDoAno;
    default:
      return 0;
  }
}

export function calcularOrcadoRealizado(
  orcamentos: OrcamentoItem[],
  setor: SetorDre,
  competencia: string,
  dre: DreGerencialResultado
): LinhaOrcadoRealizado[] {
  return TIPOS_LINHA_ORCAMENTO.map((tipoLinha) => {
    const item = (orcamentos || []).find(
      (o) => o.tipoLinha === tipoLinha && o.competencia === competencia && (setor === 'consolidado' || o.setor === setor)
    );
    // No consolidado, soma todos os setores que tenham orçamento lançado nessa linha/mês.
    const planejado =
      setor === 'consolidado'
        ? (orcamentos || [])
            .filter((o) => o.tipoLinha === tipoLinha && o.competencia === competencia)
            .reduce((s, o) => s + (Number(o.valorPlanejado) || 0), 0)
        : Number(item?.valorPlanejado) || 0;
    const temOrcamento = setor === 'consolidado' ? planejado > 0 : !!item;
    const realizado = realizadoDaLinha(tipoLinha, dre);
    const desvio = realizado - planejado;
    const desvioPercentual = planejado !== 0 ? (desvio / planejado) * 100 : null;
    const ehReceita = tipoLinha === 'Receita';
    const favoravel = !temOrcamento ? null : ehReceita ? desvio >= 0 : desvio <= 0;
    return { tipoLinha, planejado, realizado, desvio, desvioPercentual, favoravel };
  });
}
