// ============================================================================
// Cálculo do espelho de frequência (controle interno). Tudo no horário de
// Natal/RN (UTC−3, sem horário de verão).
//
// - Cada batida é atribuída a um "dia de trabalho": numa jornada que vira a noite
//   (ex.: 20h00–05h10) a saída da madrugada conta para o dia em que entrou.
// - Batidas em pares: 1ª–2ª e 3ª–4ª (entrada/saída do intervalo/volta/saída).
// - Atraso = 1ª batida depois do horário de entrada; acima da tolerância conta
//   para a regra do Regulamento (mais de 3 atrasos no mês → advertência).
// - Falta = dia previsto na jornada, já passado, sem batida e sem justificativa
//   que abone.
// ============================================================================

import type { BatidaPonto, JornadaPonto, JustificativaDia } from '../../utils/frequenciaApi';

const OFFSET_MIN = -180; // UTC−3
const MIN_DIA = 24 * 60;

/** Minutos desde a época, no relógio local. */
export function minutosLocais(iso: string): number {
  return Math.floor(Date.parse(iso) / 60000) + OFFSET_MIN;
}
export function dataLocal(iso: string): string {
  return new Date((minutosLocais(iso)) * 60000).toISOString().slice(0, 10);
}
export function horaLocal(iso: string): string {
  return new Date((minutosLocais(iso)) * 60000).toISOString().slice(11, 16);
}
export function hojeLocal(): string {
  return dataLocal(new Date().toISOString());
}
function minutosDoDia(data: string, hora: string): number {
  return Math.floor(Date.parse(`${data}T${hora}:00Z`) / 60000);
}
function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
export function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}
export function diasDoMes(mes: string): string[] {
  const [a, m] = mes.split('-').map(Number);
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
}
const hm = (h: string) => {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
};

/** Início e fim previstos (minutos locais) da jornada no dia. */
function janelaPrevista(j: JornadaPonto, data: string): { inicio: number; fim: number } {
  const inicio = minutosDoDia(data, j.entrada);
  let fim = minutosDoDia(data, j.saida);
  if (fim <= inicio) fim += MIN_DIA;
  return { inicio, fim };
}

export function minutosPrevistos(j: JornadaPonto): number {
  const total = (hm(j.saida) - hm(j.entrada) + MIN_DIA) % MIN_DIA || MIN_DIA;
  if (j.saidaIntervalo && j.voltaIntervalo) {
    const intervalo = (hm(j.voltaIntervalo) - hm(j.saidaIntervalo) + MIN_DIA) % MIN_DIA;
    return total - intervalo;
  }
  return total;
}

/** Dia de trabalho de uma batida. Sem jornada = data do relógio. */
export function diaDeTrabalho(iso: string, j?: JornadaPonto): string {
  const data = dataLocal(iso);
  if (!j) return data;
  const t = minutosLocais(iso);
  const candidatos = [data, somarDias(data, -1), somarDias(data, 1)];
  const dentro = candidatos.filter((d) => {
    const { inicio, fim } = janelaPrevista(j, d);
    return t >= inicio - 4 * 60 && t <= fim + 6 * 60;
  });
  return dentro.find((d) => j.diasSemana.includes(diaDaSemana(d))) || dentro[0] || data;
}

export type SituacaoDia = 'OK' | 'Atraso' | 'Falta' | 'Incompleto' | 'Justificado' | 'Folga' | 'Extra' | 'Futuro' | 'Em andamento' | 'Fora do período';

export interface DiaEspelho {
  data: string;
  previsto: boolean;
  batidas: BatidaPonto[]; // válidas, em ordem
  anuladas: BatidaPonto[];
  justificativa?: JustificativaDia;
  trabalhadoMin: number;
  previstoMin: number;
  atrasoMin: number;
  saldoMin: number;
  situacao: SituacaoDia;
  /** Alguma batida longe da base (fora do raio). */
  foraDoLocal: boolean;
}

export interface OpcoesEspelho {
  jornada?: JornadaPonto;
  /** Dias antes disto não contam (admissão ou início do controle no sistema). */
  inicioContagem?: string;
  /** Dias depois disto não contam (demissão). */
  fimContagem?: string;
  raioPadraoM?: number;
}

export function montarEspelho(
  dias: string[],
  batidasDoColaborador: BatidaPonto[],
  justificativas: JustificativaDia[],
  opcoes: OpcoesEspelho
): DiaEspelho[] {
  const { jornada, inicioContagem, fimContagem, raioPadraoM = 300 } = opcoes;
  const hoje = hojeLocal();
  const porDia = new Map<string, BatidaPonto[]>();
  batidasDoColaborador.forEach((b) => {
    const d = b.diaTrabalho || diaDeTrabalho(b.registradoEm, jornada);
    porDia.set(d, [...(porDia.get(d) || []), b]);
  });
  const justPorDia = new Map(justificativas.map((j) => [j.data, j]));

  return dias.map((data) => {
    const todas = (porDia.get(data) || []).sort((a, b) => a.registradoEm.localeCompare(b.registradoEm));
    const batidas = todas.filter((b) => !b.anulado);
    const anuladas = todas.filter((b) => b.anulado);
    const justificativa = justPorDia.get(data);
    const foraDoPeriodo = (!!inicioContagem && data < inicioContagem) || (!!fimContagem && data > fimContagem);
    const previsto = !!jornada && jornada.diasSemana.includes(diaDaSemana(data)) && !foraDoPeriodo;
    const previstoMin = previsto && jornada ? minutosPrevistos(jornada) : 0;

    let trabalhadoMin = 0;
    for (let i = 0; i + 1 < batidas.length; i += 2) {
      trabalhadoMin += Math.max(0, minutosLocais(batidas[i + 1].registradoEm) - minutosLocais(batidas[i].registradoEm));
    }
    let atrasoMin = 0;
    if (previsto && jornada && batidas.length > 0) {
      atrasoMin = Math.max(0, minutosLocais(batidas[0].registradoEm) - janelaPrevista(jornada, data).inicio);
    }
    const completo = batidas.length > 0 && batidas.length % 2 === 0;
    const abonado = !!justificativa?.abona;
    const saldoMin = completo ? trabalhadoMin - previstoMin : abonado || !previsto ? 0 : batidas.length === 0 && data < hoje ? -previstoMin : 0;
    const foraDoLocal = batidas.some((b) => b.distanciaM !== undefined && b.distanciaM > raioPadraoM);

    let situacao: SituacaoDia;
    if (foraDoPeriodo && batidas.length === 0) situacao = 'Fora do período';
    else if (justificativa) situacao = justificativa.abona ? 'Justificado' : 'Falta';
    else if (data > hoje) situacao = 'Futuro';
    else if (batidas.length === 0) situacao = previsto && data < hoje ? 'Falta' : previsto ? 'Em andamento' : 'Folga';
    else if (!completo) situacao = data === hoje ? 'Em andamento' : 'Incompleto';
    else if (!previsto) situacao = 'Extra';
    else if (jornada && atrasoMin > jornada.toleranciaMin) situacao = 'Atraso';
    else situacao = 'OK';

    return { data, previsto, batidas, anuladas, justificativa, trabalhadoMin, previstoMin, atrasoMin, saldoMin, situacao, foraDoLocal };
  });
}

export interface ResumoFrequencia {
  diasPrevistos: number;
  diasTrabalhados: number;
  faltas: number;
  justificados: number;
  atrasos: number; // acima da tolerância
  minutosAtraso: number;
  incompletos: number;
  trabalhadoMin: number;
  saldoMin: number;
  foraDoLocal: number;
}

export function resumir(espelho: DiaEspelho[]): ResumoFrequencia {
  return espelho.reduce<ResumoFrequencia>(
    (r, d) => ({
      diasPrevistos: r.diasPrevistos + (d.previsto && d.situacao !== 'Futuro' ? 1 : 0),
      diasTrabalhados: r.diasTrabalhados + (d.batidas.length > 0 ? 1 : 0),
      faltas: r.faltas + (d.situacao === 'Falta' ? 1 : 0),
      justificados: r.justificados + (d.situacao === 'Justificado' ? 1 : 0),
      atrasos: r.atrasos + (d.situacao === 'Atraso' ? 1 : 0),
      minutosAtraso: r.minutosAtraso + (d.situacao === 'Atraso' ? d.atrasoMin : 0),
      incompletos: r.incompletos + (d.situacao === 'Incompleto' ? 1 : 0),
      trabalhadoMin: r.trabalhadoMin + d.trabalhadoMin,
      saldoMin: r.saldoMin + d.saldoMin,
      foraDoLocal: r.foraDoLocal + (d.foraDoLocal ? 1 : 0),
    }),
    { diasPrevistos: 0, diasTrabalhados: 0, faltas: 0, justificados: 0, atrasos: 0, minutosAtraso: 0, incompletos: 0, trabalhadoMin: 0, saldoMin: 0, foraDoLocal: 0 }
  );
}

export function formatarMinutos(min: number, comSinal = false): string {
  const sinal = min < 0 ? '−' : comSinal && min > 0 ? '+' : '';
  const a = Math.abs(Math.round(min));
  return `${sinal}${Math.floor(a / 60)}h${String(a % 60).padStart(2, '0')}`;
}

export const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Regra do Regulamento Interno: mais de 3 atrasos acima da tolerância no mês → advertência. */
export const LIMITE_ATRASOS_MES = 3;
