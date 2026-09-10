// Utilities for formatting, masking, validations, and CLT / ANVISA business rules calculations
import { StatusExame, StatusFerias, Ocorrencia, ProgramacaoFerias } from '../types';

/**
 * Format currency to BRL (R$ 1.234,56)
 */
export function formatMoney(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

export const formatCurrency = formatMoney;

/**
 * Format ISO date (YYYY-MM-DD) to Brazilian format (DD/MM/AAAA)
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

export const formatDateBR = formatDate;

/**
 * Parses Brazilian format DD/MM/AAAA to ISO YYYY-MM-DD
 */
export function parseDateToISO(brDateStr: string): string {
  if (!brDateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(brDateStr)) return brDateStr;
  const parts = brDateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return brDateStr;
}

/**
 * Mask CPF (000.000.000-00)
 */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Validate Brazilian CPF mathematically
 */
export function validateCPF(cpfRaw: string): boolean {
  const cpf = cpfRaw.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11), 10)) return false;

  return true;
}

/**
 * Mask CNPJ (00.000.000/0000-00)
 */
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Mask Phone ((00) 00000-0000)
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Mask CEP (00000-000)
 */
export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Calculate difference in days from today (positive = future, negative = past)
 */
export function calcDaysRemaining(targetDateStr?: string | null): number | null {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Rule 1: Occupational Exam Status calculation
 * - Válido: vencimento > 30 dias
 * - A vencer: vencimento entre 0 e 30 dias
 * - Vencido: vencimento < 0 dias
 * - Pendente: sem data de vencimento
 */
export function calcExamStatus(dataVencimento?: string | null): StatusExame {
  if (!dataVencimento) return 'Pendente';
  const days = calcDaysRemaining(dataVencimento);
  if (days === null) return 'Pendente';
  if (days < 0) return 'Vencido';
  if (days <= 30) return 'A vencer';
  return 'Válido';
}

/**
 * Calculate CLT Vacation Acquisition Period (Período Aquisitivo)
 * Início: data de admissão (ou último ciclo)
 * Fim: 12 meses após início
 */
export function calcPeriodoAquisitivo(dataAdmissao: string, ciclo = 0): { inicio: string; fim: string } {
  if (!dataAdmissao) return { inicio: '', fim: '' };
  const dInicio = new Date(dataAdmissao + 'T00:00:00');
  if (isNaN(dInicio.getTime())) return { inicio: '', fim: '' };

  dInicio.setFullYear(dInicio.getFullYear() + ciclo);
  
  const dFim = new Date(dInicio);
  dFim.setFullYear(dFim.getFullYear() + 1);
  dFim.setDate(dFim.getDate() - 1);

  const formatISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    inicio: formatISO(dInicio),
    fim: formatISO(dFim),
  };
}

/**
 * Calculate CLT Vacation Legal Limit (Prazo Limite Gozo - 11 meses após término do aquisitivo)
 * Art. 134 CLT: As férias devem ser concedidas nos 11 meses subsequentes à conclusão do período aquisitivo
 */
export function calcPrazoLimiteGozo(periodoAquisitivoFim: string): string {
  if (!periodoAquisitivoFim) return '';
  const dFim = new Date(periodoAquisitivoFim + 'T00:00:00');
  if (isNaN(dFim.getTime())) return '';

  dFim.setMonth(dFim.getMonth() + 11);
  const y = dFim.getFullYear();
  const m = String(dFim.getMonth() + 1).padStart(2, '0');
  const d = String(dFim.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Rule 2: CLT Vacation Legal Limit from Admission (Legacy helper)
 */
export function calcCltVacationDeadline(dataAdmissao: string, dataUltimoRetorno?: string): string {
  if (!dataAdmissao) return '';
  const baseDateStr = dataUltimoRetorno || dataAdmissao;
  const baseDate = new Date(baseDateStr + 'T00:00:00');
  if (isNaN(baseDate.getTime())) return '';

  const monthsToAdd = dataUltimoRetorno ? 12 : 11;
  baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
  
  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validate Vacation Start Date (Art. 134 § 3º CLT: Vedado o início das férias nos 2 dias que antecedem feriado ou repouso semanal remunerado)
 */
export function validateVacationStartDate(startDateStr: string): { valid: boolean; message?: string } {
  if (!startDateStr) return { valid: false, message: 'Data de início não informada' };
  const d = new Date(startDateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return { valid: false, message: 'Data inválida' };

  const dayOfWeek = d.getDay(); // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado

  // Se descanso é no domingo, 2 dias que antecedem são sexta-feira e sábado (dias 5 e 6)
  if (dayOfWeek === 5) {
    return {
      valid: false,
      message: 'Aviso CLT Art. 134 § 3º: É vedado iniciar férias em sextas-feiras (2 dias antes do DSR no domingo).',
    };
  }
  if (dayOfWeek === 6) {
    return {
      valid: false,
      message: 'Aviso CLT Art. 134 § 3º: É vedado iniciar férias em sábados.',
    };
  }
  if (dayOfWeek === 0) {
    return {
      valid: false,
      message: 'Aviso CLT: O início de férias não pode recair em domingo (dia de repouso).',
    };
  }

  return { valid: true };
}

/**
 * Validate Vacation Fractioning (Art. 134 § 1º CLT: Até 3 períodos, um >= 14 dias e nenhum < 5 dias)
 */
export function validateVacationFracionamento(
  fracoes: { dias: number }[]
): { valid: boolean; message?: string } {
  if (!fracoes || fracoes.length === 0) {
    return { valid: false, message: 'Nenhuma fração de férias informada.' };
  }
  if (fracoes.length > 3) {
    return { valid: false, message: 'CLT Art. 134 § 1º: As férias podem ser fracionadas em no máximo 3 períodos.' };
  }

  const hasMaiorOuIgual14 = fracoes.some((f) => f.dias >= 14);
  if (!hasMaiorOuIgual14) {
    return { valid: false, message: 'CLT Art. 134 § 1º: Pelo menos um dos períodos não pode ser inferior a 14 dias corridos.' };
  }

  const hasMenorQue5 = fracoes.some((f) => f.dias < 5);
  if (hasMenorQue5) {
    return { valid: false, message: 'CLT Art. 134 § 1º: Nenhum dos períodos pode ser inferior a 5 dias corridos.' };
  }

  return { valid: true };
}

/**
 * Calculate VT Daily Total (Rule 3)
 */
export function calcVtDia(tarifa: number, qtd: number): number {
  return Number(((tarifa || 0) * (qtd || 0)).toFixed(2));
}

/**
 * Calculate VT Monthly Total (22 workdays by default)
 */
export function calcVtMes(tarifa: number, qtd: number, diasUteis = 22): number {
  return Number((calcVtDia(tarifa, qtd) * diasUteis).toFixed(2));
}

/**
 * Calculate VA Monthly Total (22 workdays by default)
 */
export function calcVaMes(valorDia: number, diasUteis = 22): number {
  return Number(((valorDia || 0) * diasUteis).toFixed(2));
}

/**
 * Conta os dias úteis (segunda a sexta) entre duas datas, ambas inclusive — réplica da fórmula
 * da tabela "PROGRAMAÇÃO DO VALE ALIMENTAÇÃO" no Coda:
 * Sequence(0, (fim-inicio)/Days(1)).Filter(Weekday!=1).Filter(Weekday!=7).Count()
 */
export function calcDiasUteisPeriodo(dataInicio: string, dataTermino: string): number {
  const inicio = new Date(dataInicio + 'T00:00:00');
  const termino = new Date(dataTermino + 'T00:00:00');
  if (isNaN(inicio.getTime()) || isNaN(termino.getTime()) || termino < inicio) return 0;
  let count = 0;
  const cursor = new Date(inicio);
  while (cursor <= termino) {
    const dia = cursor.getDay(); // 0 = domingo, 6 = sábado
    if (dia !== 0 && dia !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Quantidade de diárias de VA a disponibilizar numa quinzena: dias úteis do período menos as
 * faltas e os dias de férias informados (nunca abaixo de zero — ausências a mais que os dias
 * úteis não geram diária negativa). Colaborador de férias não gera diária de VA no período, do
 * mesmo jeito que uma falta.
 */
export function calcQuantidadeDiariasVA(
  dataInicio: string,
  dataTermino: string,
  faltas: number,
  diasFerias = 0
): number {
  const diasUteis = calcDiasUteisPeriodo(dataInicio, dataTermino);
  return Math.max(0, diasUteis - (faltas || 0) - (diasFerias || 0));
}

/**
 * Conta quantos dias úteis de um intervalo [aInicio, aFim] caem dentro de outro
 * [bInicio, bFim] — helper compartilhado por calcFaltasEmPeriodo e calcDiasFeriasEmPeriodo.
 */
function contarDiasUteisNaIntersecao(
  aInicio: string,
  aFim: string,
  bInicio: string,
  bFim: string
): number {
  const inicio = new Date(aInicio + 'T00:00:00');
  if (isNaN(inicio.getTime())) return 0;
  const fim = new Date(aFim + 'T00:00:00');
  const fimValido = !isNaN(fim.getTime()) && fim >= inicio ? fim : inicio;
  let total = 0;
  const cursor = new Date(inicio);
  while (cursor <= fimValido) {
    const iso = cursor.toISOString().slice(0, 10);
    if (iso >= bInicio && iso <= bFim) {
      const weekday = cursor.getDay();
      if (weekday !== 0 && weekday !== 6) total++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

/** Valor a disponibilizar de VA na quinzena: diárias × valor da diária do colaborador. */
export function calcValorDisponibilizadoVA(quantidadeDiarias: number, valorDiaria: number): number {
  return Number((Math.max(0, quantidadeDiarias) * (valorDiaria || 0)).toFixed(2));
}

const TIPOS_OCORRENCIA_FALTA = new Set(['Falta', 'Falta justificada', 'Falta injustificada']);

/**
 * Conta quantos dias úteis de falta (Ocorrências do tipo Falta/Falta justificada/Falta
 * injustificada) de um colaborador caem dentro de um período — usado para puxar
 * automaticamente o campo "Faltas" da Programação do Vale Alimentação a partir do que já foi
 * registrado em Ocorrências & Advertências, em vez de digitar de novo manualmente.
 * Cada ocorrência conta 1 dia a partir de `dataOcorrencia`, ou os dias de `diasAfastamento`
 * quando informado (ex: uma falta com atestado de 3 dias) — só os dias que caem dentro do
 * período E são dias úteis entram na conta, do mesmo jeito que "QUANTIDADE DE DIÁRIAS" já só
 * considera dias úteis.
 */
export function calcFaltasEmPeriodo(
  ocorrencias: Ocorrencia[],
  colaboradorId: string,
  dataInicio: string,
  dataTermino: string
): number {
  let total = 0;
  ocorrencias
    .filter((o) => o.colaboradorId === colaboradorId && TIPOS_OCORRENCIA_FALTA.has(o.tipo))
    .forEach((o) => {
      const inicioStr = o.dataOcorrencia || o.data;
      if (!inicioStr) return;
      const inicio = new Date(inicioStr + 'T00:00:00');
      if (isNaN(inicio.getTime())) return;
      const duracao = Math.max(1, o.diasAfastamento || 1);
      for (let i = 0; i < duracao; i++) {
        const dia = new Date(inicio);
        dia.setDate(dia.getDate() + i);
        const iso = dia.toISOString().slice(0, 10);
        if (iso < dataInicio || iso > dataTermino) continue;
        const weekday = dia.getDay();
        if (weekday !== 0 && weekday !== 6) total++;
      }
    });
  return total;
}

// Só conta como férias "de fato" quando já tem data marcada — 'A programar' ainda não tem
// período definido e 'Vencida' significa que o período expirou sem ser gozado.
const STATUS_FERIAS_COM_DATA = new Set<StatusFerias>(['Programada', 'Em gozo', 'Concluída', 'Contemplada']);

/**
 * Conta quantos dias úteis de férias de um colaborador caem dentro de um período — usado para
 * puxar automaticamente o desconto de VA por férias na Programação do Vale Alimentação, do
 * mesmo jeito que calcFaltasEmPeriodo já faz para Ocorrências. Um colaborador de férias não
 * trabalha, então não gera diária de VA nesses dias.
 * Quando a férias está fracionada (`fracionamento`), soma cada etapa separadamente em vez do
 * intervalo dataInicio/dataFim cheio, que nesse caso é só o resumo agregado.
 */
export function calcDiasFeriasEmPeriodo(
  feriasList: ProgramacaoFerias[],
  colaboradorId: string,
  dataInicio: string,
  dataTermino: string
): number {
  let total = 0;
  feriasList
    .filter((f) => f.colaboradorId === colaboradorId && STATUS_FERIAS_COM_DATA.has(f.status))
    .forEach((f) => {
      if (f.fracionamento && f.fracionamento.length > 0) {
        f.fracionamento.forEach((etapa) => {
          if (!etapa.dataInicio || !etapa.dataFim) return;
          total += contarDiasUteisNaIntersecao(etapa.dataInicio, etapa.dataFim, dataInicio, dataTermino);
        });
        return;
      }
      if (!f.dataInicio || !f.dataFim) return;
      total += contarDiasUteisNaIntersecao(f.dataInicio, f.dataFim, dataInicio, dataTermino);
    });
  return total;
}

/**
 * Calculate Total Monthly Cost for an Active Employee (2.11)
 */
export function calcCustoMensalTotal(
  remuneracao: number,
  gratificacao: number,
  vtTarifa: number,
  vtQtd: number,
  vaDia: number,
  diasUteis = 22
): number {
  const vtMes = calcVtMes(vtTarifa, vtQtd, diasUteis);
  const vaMes = calcVaMes(vaDia, diasUteis);
  return Number(((remuneracao || 0) + (gratificacao || 0) + vtMes + vaMes).toFixed(2));
}

/**
 * Format Days Count for countdown badges
 */
export function formatDaysCountdown(days: number | null): { text: string; colorClass: string; bgClass: string; badge: string } {
  if (days === null) {
    return { text: 'Não informado', colorClass: 'text-slate-500', bgClass: 'bg-slate-100', badge: 'slate' };
  }
  if (days < 0) {
    const abs = Math.abs(days);
    return {
      text: `Vencido há ${abs} dia${abs === 1 ? '' : 's'}`,
      colorClass: 'text-rose-700',
      bgClass: 'bg-rose-50 border-rose-200 text-rose-700',
      badge: 'rose',
    };
  }
  if (days === 0) {
    return {
      text: 'Vence HOJE!',
      colorClass: 'text-rose-700 font-bold',
      bgClass: 'bg-rose-100 border-rose-300 text-rose-800',
      badge: 'rose',
    };
  }
  if (days <= 15) {
    return {
      text: `Crítico: ${days} dia${days === 1 ? '' : 's'}`,
      colorClass: 'text-amber-800 font-semibold',
      bgClass: 'bg-amber-100 border-amber-300 text-amber-900',
      badge: 'amber',
    };
  }
  if (days <= 30) {
    return {
      text: `Atenção: ${days} dias`,
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50 border-amber-200 text-amber-800',
      badge: 'amber',
    };
  }
  if (days <= 60) {
    return {
      text: `No radar: ${days} dias`,
      colorClass: 'text-blue-700',
      bgClass: 'bg-blue-50 border-blue-200 text-blue-700',
      badge: 'blue',
    };
  }
  return {
    text: `Em dia (${days} dias)`,
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    badge: 'emerald',
  };
}

// ==========================================
// CCT 2026/2028 (SETCERN x SINTROCERN) CALCULATIONS
// ==========================================

export const SALARIO_MINIMO_NACIONAL = 1518.00;
export const VALOR_VA_CCT_DIA = 32.00; // Cláusula 15ª
export const SUBSIDIO_SAUDE_CCT_MES = 189.50; // Cláusula 17ª
export const CUIDADO_PESSOAL_CCT_MES = 47.90; // Cláusula 19ª

/**
 * Adicional de Periculosidade (30% sobre o salário base - Cláusula 13ª CCT & Art. 193 CLT)
 */
export function calcAdicionalPericulosidade(salarioBase: number): number {
  return Number(((salarioBase || 0) * 0.30).toFixed(2));
}

/**
 * Adicional de Insalubridade (20% sobre Salário Mínimo - Cláusula 12ª CCT & NR 15)
 */
export function calcAdicionalInsalubridade(salarioMinimo = SALARIO_MINIMO_NACIONAL, percentual = 0.20): number {
  return Number((salarioMinimo * percentual).toFixed(2));
}

/**
 * Adicional de Acúmulo de Função / "Bater Carga" (15% sobre o salário base - Cláusula 27ª CCT)
 */
export function calcAdicionalAcumuloFuncao(salarioBase: number): number {
  return Number(((salarioBase || 0) * 0.15).toFixed(2));
}

/**
 * Adicional de Penosidade (15% sobre salário base para transporte em escadas >25kg - Cláusula 31ª CCT)
 */
export function calcAdicionalPenosidade(salarioBase: number): number {
  return Number(((salarioBase || 0) * 0.15).toFixed(2));
}

/**
 * Quinquênio Rodoviário (5% a cada 5 anos ininterruptos - Cláusula 11ª CCT)
 */
export function calcQuinquenio(salarioBase: number, qtdQuinquenios = 1): number {
  return Number(((salarioBase || 0) * 0.05 * Math.max(0, qtdQuinquenios)).toFixed(2));
}

/**
 * Mensalidade Associativa SINTROCERN (2% sobre o salário base para filiados - Cláusula 49ª CCT)
 */
export function calcDescontoSintrocern(salarioBase: number, filiado = false): number {
  if (!filiado) return 0;
  return Number(((salarioBase || 0) * 0.02).toFixed(2));
}

/**
 * Desconto do Vale Alimentação pelo PAT (R$ 0,01 para filiados ou até 20% para não filiados - Cláusula 15ª CCT)
 */
export function calcDescontoVaPat(valorVaMes: number, filiado = false): number {
  if (filiado) return 0.01;
  return Number((valorVaMes * 0.10).toFixed(2)); // taxa usual 10%
}

/**
 * Custo Total Patronal Detalhado CLT + CCT 2026/2028
 */
export function calcCustoPatronalCompleto(params: {
  remuneracao: number;
  gratificacao?: number;
  adicionalPericulosidade?: boolean;
  adicionalInsalubridade?: boolean;
  adicionalAcumulo?: boolean;
  adicionalPenosidade?: boolean;
  possuiQuinquenio?: boolean;
  numeroQuinquenios?: number;
  vtQtdTarifasDia?: number;
  vtValorTarifa?: number;
  vaValorDia?: number;
  filiadoSintrocern?: boolean;
  diasUteis?: number;
}): {
  salarioBase: number;
  adicionaisTotal: number;
  baseInssFgts: number;
  fgts8: number;
  provisao13o: number; // 8.33%
  provisaoFeriasTerco: number; // 11.11%
  encargosCltTotal: number;
  valeTransporteCustoEmpresa: number;
  valeAlimentacaoTotal: number;
  subsidioPlanoSaude: number;
  auxilioCuidadoPessoal: number;
  beneficiosCctTotal: number;
  custoTotalMensal: number;
} {
  const dias = params.diasUteis || 22;
  const salarioBase = params.remuneracao || 0;
  const grat = params.gratificacao || 0;

  let adicionaisTotal = 0;
  if (params.adicionalPericulosidade) {
    adicionaisTotal += calcAdicionalPericulosidade(salarioBase);
  }
  if (params.adicionalInsalubridade) {
    adicionaisTotal += calcAdicionalInsalubridade();
  }
  if (params.adicionalAcumulo) {
    adicionaisTotal += calcAdicionalAcumuloFuncao(salarioBase);
  }
  if (params.adicionalPenosidade) {
    adicionaisTotal += calcAdicionalPenosidade(salarioBase);
  }
  if (params.possuiQuinquenio) {
    adicionaisTotal += calcQuinquenio(salarioBase, params.numeroQuinquenios || 1);
  }

  const baseInssFgts = salarioBase + grat + adicionaisTotal;
  const fgts8 = Number((baseInssFgts * 0.08).toFixed(2));
  const provisao13o = Number((baseInssFgts * (1 / 12)).toFixed(2)); // ~8.33%
  const provisaoFeriasTerco = Number((baseInssFgts * (4 / 36)).toFixed(2)); // 1/12 + 1/36 = ~11.11%
  const encargosCltTotal = Number((fgts8 + provisao13o + provisaoFeriasTerco).toFixed(2));

  // Benefícios CCT
  const vtBruto = (params.vtValorTarifa || 0) * (params.vtQtdTarifasDia || 0) * dias;
  const vtDescontoColab = Math.min(salarioBase * 0.06, vtBruto);
  const valeTransporteCustoEmpresa = Number(Math.max(0, vtBruto - vtDescontoColab).toFixed(2));

  const vaValorDia = params.vaValorDia || VALOR_VA_CCT_DIA;
  const valeAlimentacaoTotal = Number((vaValorDia * dias).toFixed(2));
  const subsidioPlanoSaude = SUBSIDIO_SAUDE_CCT_MES; // Cláusula 17ª
  const auxilioCuidadoPessoal = CUIDADO_PESSOAL_CCT_MES; // Cláusula 19ª

  const beneficiosCctTotal = Number((
    valeTransporteCustoEmpresa +
    valeAlimentacaoTotal +
    subsidioPlanoSaude +
    auxilioCuidadoPessoal
  ).toFixed(2));

  const custoTotalMensal = Number((
    baseInssFgts +
    encargosCltTotal +
    beneficiosCctTotal
  ).toFixed(2));

  return {
    salarioBase,
    adicionaisTotal,
    baseInssFgts,
    fgts8,
    provisao13o,
    provisaoFeriasTerco,
    encargosCltTotal,
    valeTransporteCustoEmpresa,
    valeAlimentacaoTotal,
    subsidioPlanoSaude,
    auxilioCuidadoPessoal,
    beneficiosCctTotal,
    custoTotalMensal,
  };
}

/**
 * Generate Vacation Notice Formal CLT Email Template
 */
export function generateVacationEmailTemplate(params: {
  nomeColaborador: string;
  cargo: string;
  dataInicio: string;
  dataTermino: string;
  dataRetorno?: string;
  totalDias: number;
  vende10Dias: boolean;
  razaoSocial: string;
  supervisorNome?: string;
}): string {
  const abonoTexto = params.vende10Dias
    ? `\n- Abono Pecuniário (venda de 10 dias): Sim (10 dias de saldo convertidos em pecúnia conforme faculta o Art. 143 da CLT).`
    : `\n- Abono Pecuniário: Não (Gozo integral de ${params.totalDias} dias).`;

  return `COMUNICADO FORMAL DE PROGRAMAÇÃO DE FÉRIAS (CLT - ART. 135)

À(Ao) Colaborador(a): ${params.nomeColaborador}
Cargo/Função: ${params.cargo}
Empresa: ${params.razaoSocial}
Supervisor Direto: ${params.supervisorNome || 'Departamento Pessoal / RH'}

Prezado(a) ${params.nomeColaborador},

Vimos por meio deste comunicar-lhe formalmente que, em conformidade com o Artigo 135 da Consolidação das Leis do Trabalho (CLT), suas férias regulamentares relativas ao período aquisitivo foram programadas com antecedência legal conforme os dados abaixo:

• Início do gozo de férias: ${formatDate(params.dataInicio)}
• Término do gozo de férias: ${formatDate(params.dataTermino)}
• Data prevista de retorno ao trabalho: ${params.dataRetorno ? formatDate(params.dataRetorno) : 'Dia subsequente ao término'}
• Duração: ${params.totalDias} dias corridos${abonoTexto}

Lembramos que a remuneração relativa às férias e o adicional constitucional de 1/3 (um terço) serão creditados em sua conta bancária até 2 (dois) dias antes do início do respectivo período, nos termos do Art. 145 da CLT.

Solicitamos que compareça ao Departamento Pessoal para assinatura do respectivo Aviso e Recibo de Férias.

Atenciosamente,

Departamento Pessoal & Recursos Humanos
${params.razaoSocial}
Setor de Logística Farmacêutica e Distribuição (ANVISA / RDC 430)`;
}
