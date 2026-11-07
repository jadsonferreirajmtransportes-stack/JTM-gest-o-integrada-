// ============================================================================
// Prévia da folha (CONFERÊNCIA — a folha oficial continua sendo a da contabilidade).
// Salário do cadastro + adicionais da CCT + o que o Controle de Frequência apurou no mês
// (horas extras, adicional noturno, DSR, faltas, atrasos) − INSS − IRRF = líquido.
//
// Regras usadas:
// - Divisor 220 h (44 h semanais). Mês comercial de 30 dias (falta = salário ÷ 30).
// - Hora extra 50% (CLT); domingo e feriado trabalhados 100% (CCT SETCERN x SINTROCERN).
// - Adicional noturno 20% (CLT art. 73) sobre a hora noturna já reduzida pela Frequência;
//   a hora extra noturna é paga sobre a hora com o adicional.
// - DSR sobre horas extras e adicional noturno: valor ÷ dias úteis × (domingos + feriados).
// - Falta injustificada desconta o dia e o DSR da semana (Lei 605/49, art. 6º).
// - Atrasos: só em dias completos, acima de 10 min no dia (CLT art. 58, § 1º).
// - INSS progressivo 2026 (Portaria Interministerial MPS/MF nº 13/2026).
// - IRRF 2026: tabela progressiva, dedução por dependente ou desconto simplificado (o que for
//   melhor) e a redução da Lei 15.270/2025 (isenção efetiva até R$ 5.000).
// ============================================================================

import type { Colaborador } from '../../types';
import { diaDaSemana, type DiaEspelho } from './frequenciaCalc';

export const SALARIO_MINIMO_2026 = 1621.0;
export const DIVISOR_HORAS = 220;

/** INSS 2026 — faixas (até, alíquota). Teto = última faixa. */
export const INSS_2026: [number, number][] = [
  [1621.0, 0.075],
  [2902.84, 0.09],
  [4354.27, 0.12],
  [8475.55, 0.14],
];
/** IRRF 2026 — faixas mensais (até, alíquota, parcela a deduzir). */
export const IRRF_2026: [number, number, number][] = [
  [2428.8, 0, 0],
  [2826.65, 0.075, 182.16],
  [3751.05, 0.15, 394.16],
  [4664.68, 0.225, 675.49],
  [Infinity, 0.275, 908.73],
];
export const IRRF_DEPENDENTE = 189.59;
export const IRRF_SIMPLIFICADO = 607.2;

// Arredonda centavos "meio para cima" sem o erro de ponto flutuante (121,575 → 121,58).
const r2 = (v: number) => Math.round(Number((v * 100).toFixed(6))) / 100;

/** INSS do empregado (progressivo, faixa a faixa, limitado ao teto). */
export function calcularInss(base: number): number {
  let total = 0;
  let anterior = 0;
  for (const [ate, aliq] of INSS_2026) {
    if (base <= anterior) break;
    total += r2((Math.min(base, ate) - anterior) * aliq);
    anterior = ate;
  }
  return r2(total);
}

export interface ResultadoIrrf {
  base: number;
  deducao: number;
  simplificado: boolean;
  impostoTabela: number;
  reducaoLei15270: number;
  imposto: number;
}
/** IRRF mensal: base = rendimentos − (INSS + dependentes) ou − desconto simplificado, o que for maior;
 *  depois a redução da Lei 15.270/2025, que olha os rendimentos tributáveis do mês. */
export function calcularIrrf(rendimentos: number, inss: number, dependentes: number): ResultadoIrrf {
  const legais = inss + dependentes * IRRF_DEPENDENTE;
  const simplificado = IRRF_SIMPLIFICADO > legais;
  const deducao = r2(Math.max(legais, IRRF_SIMPLIFICADO));
  const base = r2(Math.max(0, rendimentos - deducao));
  const faixa = IRRF_2026.find(([ate]) => base <= ate)!;
  const impostoTabela = r2(Math.max(0, base * faixa[1] - faixa[2]));
  let reducao = 0;
  if (rendimentos <= 5000) reducao = Math.min(impostoTabela, 312.89);
  else if (rendimentos <= 7350) reducao = Math.min(impostoTabela, Math.max(0, 978.62 - 0.133145 * rendimentos));
  reducao = r2(reducao);
  return { base, deducao, simplificado, impostoTabela, reducaoLei15270: reducao, imposto: r2(Math.max(0, impostoTabela - reducao)) };
}

/** Dependentes para o IR pelo cadastro: filhos/enteados até 21 anos (24 se a pessoa informar) e cônjuge. */
export function dependentesIrDoCadastro(c: Colaborador, mes: string): number {
  const ref = new Date(`${mes}-01T12:00:00Z`);
  return (c.dependentes || []).filter((d) => {
    if (d.parentesco === 'Cônjuge') return true;
    if (d.parentesco !== 'Filho(a)' && d.parentesco !== 'Enteado(a)') return false;
    if (!d.dataNascimento) return true;
    const nasc = new Date(`${d.dataNascimento.slice(0, 10)}T12:00:00Z`);
    let idade = ref.getUTCFullYear() - nasc.getUTCFullYear();
    if (ref.getUTCMonth() < nasc.getUTCMonth() || (ref.getUTCMonth() === nasc.getUTCMonth() && ref.getUTCDate() < nasc.getUTCDate())) idade--;
    return idade < 21;
  }).length;
}

export interface ItemFolha {
  codigo: string;
  descricao: string;
  /** Referência mostrada no holerite (ex.: "12:30 h", "2 dias", "7,5%"). */
  referencia?: string;
  valor: number;
  tipo: 'provento' | 'desconto';
}
export interface AjusteFolha {
  descricao: string;
  valor: number;
  tipo: 'provento' | 'desconto';
}
export interface FolhaColaborador {
  colaboradorId: string;
  salarioContratual: number;
  valorHora: number;
  diasNoMes: number;
  itens: ItemFolha[];
  bruto: number;
  totalDescontos: number;
  liquido: number;
  baseInss: number;
  inss: number;
  irrf: ResultadoIrrf;
  dependentesIr: number;
  semPonto: boolean;
  diasIncompletos: number;
  avisos: string[];
}

const horas = (min: number) => {
  const m = Math.round(min);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`;
};

/** Calcula a prévia da folha de um colaborador no mês. */
export function calcularFolha(params: {
  colaborador: Colaborador;
  mes: string; // YYYY-MM
  espelho: DiaEspelho[];
  feriados: Map<string, string>;
  /** O colaborador bateu ponto ou teve justificativa no mês? Sem isso, não entra nada da frequência. */
  temPonto: boolean;
  dependentesIr?: number;
  ajustes?: AjusteFolha[];
}): FolhaColaborador {
  const { colaborador: c, mes, espelho, feriados, temPonto } = params;
  const avisos: string[] = [];
  const salarioContratual = r2(c.remuneracao || c.pisoCctFuncao || 0);
  if (!salarioContratual) avisos.push('Sem salário no cadastro (Remuneração).');
  const valorHora = salarioContratual / DIVISOR_HORAS;
  const diaValor = salarioContratual / 30;

  // Dias do contrato no mês (admissão/desligamento no meio do mês = proporcional, mês de 30 dias).
  const ultimoDia = Number(new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate());
  const ini = c.dataAdmissao && c.dataAdmissao.slice(0, 7) === mes ? Number(c.dataAdmissao.slice(8, 10)) : 1;
  const fim = c.dataDemissao && c.dataDemissao.slice(0, 7) === mes ? Number(c.dataDemissao.slice(8, 10)) : ultimoDia;
  const diasNoMes = ini === 1 && fim === ultimoDia ? 30 : Math.max(0, Math.min(30, fim - ini + 1));
  const fator = diasNoMes / 30;

  const itens: ItemFolha[] = [];
  const prov = (codigo: string, descricao: string, valor: number, referencia?: string) => {
    if (r2(valor) > 0) itens.push({ codigo, descricao, referencia, valor: r2(valor), tipo: 'provento' });
  };
  const desc = (codigo: string, descricao: string, valor: number, referencia?: string) => {
    if (r2(valor) > 0) itens.push({ codigo, descricao, referencia, valor: r2(valor), tipo: 'desconto' });
  };

  prov('001', 'Salário', salarioContratual * fator, `${diasNoMes} dias`);
  if (c.gratificacao) prov('002', 'Gratificação', c.gratificacao * fator);
  // Adicionais da CCT marcados no cadastro
  if (c.adicionalPericulosidade) prov('010', 'Adicional de periculosidade', salarioContratual * 0.3 * fator, '30%');
  if (c.adicionalInsalubridade) {
    const pct = (c.percentualInsalubridade || 20) / 100;
    prov('011', 'Adicional de insalubridade', SALARIO_MINIMO_2026 * pct * fator, `${Math.round(pct * 100)}% do s. mínimo`);
  }
  if (c.adicionalAcumuloFuncao) prov('012', 'Acúmulo de função', salarioContratual * 0.15 * fator, '15%');
  if (c.adicionalPenosidade) prov('013', 'Adicional de penosidade', salarioContratual * 0.15 * fator, '15%');
  if (c.possuiQuinquenio) {
    const n = Math.max(1, c.numeroQuinquenios || 1);
    prov('014', 'Quinquênio', salarioContratual * 0.05 * n * fator, `${n} × 5%`);
  }

  // ---- Frequência do mês ----
  let diasIncompletos = 0;
  if (!temPonto) {
    avisos.push('Sem ponto no mês: horas extras, adicional noturno, faltas e atrasos não entraram.');
  } else {
    let he50 = 0;
    let he100 = 0;
    let heNot50 = 0;
    let heNot100 = 0;
    let noturnoNormal = 0;
    let diasFalta = 0;
    let atrasoMin = 0;
    const semanasComFalta = new Set<string>();
    espelho.forEach((d) => {
      const a = d.apuracao;
      const cem = diaDaSemana(d.data) === 0 || feriados.has(d.data);
      if (cem) {
        he100 += a.extraDiurnaMin;
        heNot100 += a.extraNoturnaMin;
      } else {
        he50 += a.extraDiurnaMin;
        heNot50 += a.extraNoturnaMin;
      }
      noturnoNormal += a.normaisNoturnasMin;
      if (d.situacao === 'Falta') {
        diasFalta++;
        // semana (domingo a sábado) da falta → perde o DSR dela
        const dt = new Date(`${d.data}T12:00:00Z`);
        dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay());
        semanasComFalta.add(dt.toISOString().slice(0, 10));
      } else if ((d.situacao === 'OK' || d.situacao === 'Atraso') && a.faltaAtrasoMin > 10) {
        atrasoMin += a.faltaAtrasoMin;
      }
      if (d.situacao === 'Incompleto') diasIncompletos++;
    });
    const vHe50 = (he50 / 60) * valorHora * 1.5;
    const vHe100 = (he100 / 60) * valorHora * 2;
    const vHeNot50 = (heNot50 / 60) * valorHora * 1.2 * 1.5;
    const vHeNot100 = (heNot100 / 60) * valorHora * 1.2 * 2;
    const vNoturno = (noturnoNormal / 60) * valorHora * 0.2;
    prov('020', 'Horas extras 50%', vHe50, horas(he50));
    prov('021', 'Horas extras 100% (domingo/feriado)', vHe100, horas(he100));
    prov('022', 'Horas extras noturnas 50%', vHeNot50, horas(heNot50));
    prov('023', 'Horas extras noturnas 100%', vHeNot100, horas(heNot100));
    prov('030', 'Adicional noturno 20%', vNoturno, horas(noturnoNormal));
    // DSR sobre variáveis
    const dias = Array.from({ length: ultimoDia }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
    const descansos = dias.filter((d) => diaDaSemana(d) === 0 || feriados.has(d)).length;
    const uteis = dias.length - descansos;
    const variaveis = vHe50 + vHe100 + vHeNot50 + vHeNot100 + vNoturno;
    if (variaveis > 0 && uteis > 0) prov('040', 'DSR sobre horas extras e adicional noturno', (variaveis / uteis) * descansos, `${descansos}/${uteis}`);
    desc('101', 'Faltas', diasFalta * diaValor, `${diasFalta} ${diasFalta === 1 ? 'dia' : 'dias'}`);
    desc('102', 'DSR das semanas com falta', semanasComFalta.size * diaValor, `${semanasComFalta.size} ${semanasComFalta.size === 1 ? 'dia' : 'dias'}`);
    desc('103', 'Atrasos', (atrasoMin / 60) * valorHora, horas(atrasoMin));
    if (diasIncompletos) avisos.push(`${diasIncompletos} dia(s) com batida faltando no ponto (Incompleto) — não foram descontados; acerte no espelho.`);
  }

  // Ajustes lançados à mão na conferência
  (params.ajustes || []).forEach((aj, i) => {
    if (aj.tipo === 'provento') prov(`09${i}`, aj.descricao || 'Outro provento', aj.valor);
    else desc(`19${i}`, aj.descricao || 'Outro desconto', aj.valor);
  });

  // ---- Encargos do empregado ----
  const proventos = itens.filter((i) => i.tipo === 'provento').reduce((s, i) => s + i.valor, 0);
  const descontosFolha = itens.filter((i) => i.tipo === 'desconto').reduce((s, i) => s + i.valor, 0);
  const baseInss = r2(Math.max(0, proventos - descontosFolha));
  const inss = calcularInss(baseInss);
  desc('201', 'INSS', inss, baseInss > INSS_2026[INSS_2026.length - 1][0] ? 'teto' : `${((inss / (baseInss || 1)) * 100).toFixed(2).replace('.', ',')}% efetivo`);
  const dependentesIr = params.dependentesIr ?? dependentesIrDoCadastro(c, mes);
  const irrf = calcularIrrf(baseInss, inss, dependentesIr);
  desc('202', 'IRRF', irrf.imposto, irrf.imposto ? `base ${irrf.base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined);

  const bruto = r2(proventos);
  const totalDescontos = r2(itens.filter((i) => i.tipo === 'desconto').reduce((s, i) => s + i.valor, 0));
  return {
    colaboradorId: c.id,
    salarioContratual,
    valorHora: r2(valorHora),
    diasNoMes,
    itens,
    bruto,
    totalDescontos,
    liquido: r2(bruto - totalDescontos),
    baseInss,
    inss,
    irrf,
    dependentesIr,
    semPonto: !temPonto,
    diasIncompletos,
    avisos,
  };
}
