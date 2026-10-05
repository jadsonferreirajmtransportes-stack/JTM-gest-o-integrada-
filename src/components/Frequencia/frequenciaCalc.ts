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
  // Mais de uma jornada possível (ex.: viagem 20:00→16:00 do dia seguinte: a saída das 16:20
  // está logo depois do fim da jornada de ontem E 4h antes do início da de hoje): fica com a
  // jornada mais próxima do horário; empate → dia previsto na escala.
  const distancia = (d: string) => {
    const { inicio, fim } = janelaPrevista(j, d);
    return t < inicio ? inicio - t : t > fim ? t - fim : 0;
  };
  const ordenados = [...dentro].sort(
    (a, b) => distancia(a) - distancia(b) || Number(j.diasSemana.includes(diaDaSemana(b))) - Number(j.diasSemana.includes(diaDaSemana(a)))
  );
  return ordenados[0] || data;
}

export type SituacaoDia = 'OK' | 'Atraso' | 'Falta' | 'Incompleto' | 'Justificado' | 'Folga' | 'Extra' | 'Futuro' | 'Em andamento' | 'Fora do período';

/** Apuração do dia, em horas COMPUTADAS (hora noturna reduzida: 52min30s = 1h, CLT art. 73).
 *  Sem banco de horas (decisão de 2026-10-05): o que passa da jornada é extra; o que falta é
 *  falta/atraso — abonado quando o dia tem justificativa que abona. */
export interface ApuracaoDia {
  normaisDiurnasMin: number;
  normaisNoturnasMin: number;
  extraDiurnaMin: number;
  extraNoturnaMin: number;
  faltaAtrasoMin: number;
  abonoMin: number;
  /** Minutos de relógio no horário noturno (22h–5h e prorrogação), antes da redução. */
  noturnoRelogioMin: number;
}

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
  apuracao: ApuracaoDia;
}

export interface OpcoesEspelho {
  jornada?: JornadaPonto;
  /** Dias antes disto não contam (admissão ou início do controle no sistema). */
  inicioContagem?: string;
  /** Dias depois disto não contam (demissão). */
  fimContagem?: string;
  raioPadraoM?: number;
}

// ---- Hora noturna (CLT art. 73 e Súmula 60 do TST) ----
const NOITE_INICIO = 22 * 60;
const NOITE_FIM = 5 * 60;
/** Fator da hora noturna reduzida: 60 / 52,5. */
const FATOR_NOTURNO = 60 / 52.5;

/** Divide trechos [início, fim] (minutos locais absolutos) em minutos diurnos e noturnos de
 *  relógio. Prorrogação (Súmula 60): se o trecho noturno da jornada foi cumprido (6h ou mais
 *  entre 22h e 5h), o que for trabalhado depois das 5h, na mesma jornada, também é noturno. */
export function dividirDiurnoNoturno(trechos: [number, number][]): { diurno: number; noturno: number } {
  let total = 0;
  let noturno = 0;
  let fimDaNoite: number | null = null;
  let maiorNoite = 0;
  const noites = new Map<number, number>();
  for (const [a, b] of trechos) {
    if (b <= a) continue;
    total += b - a;
    const diaA = Math.floor(a / MIN_DIA);
    const diaB = Math.floor(b / MIN_DIA);
    for (let d = diaA - 1; d <= diaB; d++) {
      const ini = d * MIN_DIA + NOITE_INICIO;
      const fim = (d + 1) * MIN_DIA + NOITE_FIM;
      const sobra = Math.max(0, Math.min(b, fim) - Math.max(a, ini));
      if (sobra > 0) {
        noturno += sobra;
        noites.set(fim, (noites.get(fim) || 0) + sobra);
      }
    }
  }
  noites.forEach((min, fim) => {
    if (min > maiorNoite) {
      maiorNoite = min;
      fimDaNoite = fim;
    }
  });
  if (fimDaNoite !== null && maiorNoite >= 6 * 60) {
    const limite = fimDaNoite as number;
    for (const [a, b] of trechos) if (b > limite) noturno += b - Math.max(a, limite);
  }
  noturno = Math.min(noturno, total);
  return { diurno: total - noturno, noturno };
}

/** Trechos trabalhados (pares de batidas). */
function trechosDasBatidas(batidas: BatidaPonto[]): [number, number][] {
  const t: [number, number][] = [];
  for (let i = 0; i + 1 < batidas.length; i += 2) t.push([minutosLocais(batidas[i].registradoEm), minutosLocais(batidas[i + 1].registradoEm)]);
  return t;
}

/** Trechos previstos pela jornada no dia (vira a noite quando o horário é menor que o anterior). */
function trechosDaJornada(j: JornadaPonto, data: string): [number, number][] {
  const horas = [j.entrada, ...(j.saidaIntervalo && j.voltaIntervalo ? [j.saidaIntervalo, j.voltaIntervalo] : []), j.saida];
  const base = minutosDoDia(data, '00:00');
  let anterior = -1;
  let dia = 0;
  const abs = horas.map((h) => {
    const m = hm(h);
    if (anterior >= 0 && m <= anterior) dia += 1;
    anterior = m;
    return base + dia * MIN_DIA + m;
  });
  const t: [number, number][] = [];
  for (let i = 0; i + 1 < abs.length; i += 2) t.push([abs[i], abs[i + 1]]);
  return t;
}

const computado = (p: { diurno: number; noturno: number }) => ({ diurno: p.diurno, noturno: p.noturno * FATOR_NOTURNO });

export function montarEspelho(
  dias: string[],
  batidasDoColaborador: BatidaPonto[],
  justificativas: JustificativaDia[],
  opcoes: OpcoesEspelho
): DiaEspelho[] {
  const { jornada, inicioContagem, fimContagem, raioPadraoM = 300 } = opcoes;
  const hoje = hojeLocal();
  const porDia = new Map<string, BatidaPonto[]>();
  const adicionar = (d: string, b: BatidaPonto) => porDia.set(d, [...(porDia.get(d) || []), b]);
  // Batidas válidas em ordem: a SAÍDA de um par (2ª, 4ª, 6ª… do dia) fica no mesmo dia da
  // entrada, se vier até 16h depois — assim a viagem/plantão que passa do horário previsto
  // (ex.: entra 22:00, sai 18:56 do dia seguinte) não se divide em dois dias. Entradas usam a
  // jornada (diaDeTrabalho) ou, na folha manual, o dia gravado.
  const LIMITE_PAR_MS = 16 * 3600 * 1000;
  let diaAtual: string | null = null;
  let ultimaMs = 0;
  [...batidasDoColaborador]
    .filter((b) => !b.anulado)
    .sort((a, b) => a.registradoEm.localeCompare(b.registradoEm))
    .forEach((b) => {
      const ms = Date.parse(b.registradoEm);
      const qtdDia = diaAtual !== null ? porDia.get(diaAtual)?.length || 0 : 0;
      const esperandoSaida = diaAtual !== null && qtdDia % 2 === 1 && ms - ultimaMs <= LIMITE_PAR_MS;
      // Sem jornada (não há horário para comparar): a volta de um intervalo de até 3h, num dia
      // que ainda não fechou as 4 batidas, continua no mesmo dia (ex.: noturno 00:00 → 01:00).
      const voltaDoIntervalo = !jornada && diaAtual !== null && qtdDia % 2 === 0 && qtdDia < 4 && ms - ultimaMs <= 3 * 3600 * 1000;
      const d = b.diaTrabalho || (esperandoSaida || voltaDoIntervalo ? (diaAtual as string) : diaDeTrabalho(b.registradoEm, jornada));
      adicionar(d, b);
      diaAtual = d;
      ultimaMs = ms;
    });
  batidasDoColaborador.filter((b) => b.anulado).forEach((b) => adicionar(b.diaTrabalho || diaDeTrabalho(b.registradoEm, jornada), b));
  const justPorDia = new Map(justificativas.map((j) => [j.data, j]));

  return dias.map((data) => {
    const todas = (porDia.get(data) || []).sort((a, b) => a.registradoEm.localeCompare(b.registradoEm));
    const batidas = todas.filter((b) => !b.anulado);
    const anuladas = todas.filter((b) => b.anulado);
    const justificativa = justPorDia.get(data);
    const foraDoPeriodo = (!!inicioContagem && data < inicioContagem) || (!!fimContagem && data > fimContagem);
    // Antes do início do controle (ou da admissão) um dia SEM registro não conta — mas um dia
    // com batida (ex.: folha manual lançada) ou justificativa segue a jornada normalmente.
    const temRegistro = batidas.length > 0 || !!justificativa;
    const previsto = !!jornada && jornada.diasSemana.includes(diaDaSemana(data)) && (!foraDoPeriodo || temRegistro);
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

    // Apuração em horas computadas (noturno reduzido), sem banco de horas.
    const real = dividirDiurnoNoturno(trechosDasBatidas(batidas));
    const feito = computado(real);
    const plano = previsto && jornada ? computado(dividirDiurnoNoturno(trechosDaJornada(jornada, data))) : { diurno: 0, noturno: 0 };
    const totalFeito = feito.diurno + feito.noturno;
    const totalPlano = plano.diurno + plano.noturno;
    const apurar = situacao !== 'Futuro' && situacao !== 'Em andamento' && situacao !== 'Fora do período';
    const extra = apurar ? Math.max(0, totalFeito - totalPlano) : 0;
    const extraNoturna = Math.min(extra, Math.max(0, feito.noturno - plano.noturno));
    const extraDiurna = extra - extraNoturna;
    const faltando = apurar && previsto ? Math.max(0, totalPlano - totalFeito) : 0;
    const apuracao: ApuracaoDia = {
      normaisDiurnasMin: Math.round(feito.diurno - extraDiurna),
      normaisNoturnasMin: Math.round(feito.noturno - extraNoturna),
      extraDiurnaMin: Math.round(extraDiurna),
      extraNoturnaMin: Math.round(extraNoturna),
      faltaAtrasoMin: abonado ? 0 : Math.round(faltando),
      abonoMin: abonado ? Math.round(faltando) : 0,
      noturnoRelogioMin: Math.round(real.noturno),
    };

    return { data, previsto, batidas, anuladas, justificativa, trabalhadoMin, previstoMin, atrasoMin, saldoMin, situacao, foraDoLocal, apuracao };
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
  normaisDiurnasMin: number;
  normaisNoturnasMin: number;
  extraDiurnaMin: number;
  extraNoturnaMin: number;
  faltaAtrasoMin: number;
  abonoMin: number;
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
      normaisDiurnasMin: r.normaisDiurnasMin + d.apuracao.normaisDiurnasMin,
      normaisNoturnasMin: r.normaisNoturnasMin + d.apuracao.normaisNoturnasMin,
      extraDiurnaMin: r.extraDiurnaMin + d.apuracao.extraDiurnaMin,
      extraNoturnaMin: r.extraNoturnaMin + d.apuracao.extraNoturnaMin,
      faltaAtrasoMin: r.faltaAtrasoMin + d.apuracao.faltaAtrasoMin,
      abonoMin: r.abonoMin + d.apuracao.abonoMin,
    }),
    { diasPrevistos: 0, diasTrabalhados: 0, faltas: 0, justificados: 0, atrasos: 0, minutosAtraso: 0, incompletos: 0, trabalhadoMin: 0, saldoMin: 0, foraDoLocal: 0, normaisDiurnasMin: 0, normaisNoturnasMin: 0, extraDiurnaMin: 0, extraNoturnaMin: 0, faltaAtrasoMin: 0, abonoMin: 0 }
  );
}

/** Soma os resumos de vários colaboradores (linha "Total" do Resumo do mês). */
export function somarResumos(lista: ResumoFrequencia[]): ResumoFrequencia {
  const zero = resumir([]);
  return lista.reduce((t, r) => {
    const soma = { ...t };
    (Object.keys(zero) as (keyof ResumoFrequencia)[]).forEach((k) => {
      soma[k] = (t[k] as number) + (r[k] as number);
    });
    return soma;
  }, zero);
}

export function formatarMinutos(min: number, comSinal = false): string {
  const sinal = min < 0 ? '−' : comSinal && min > 0 ? '+' : '';
  const a = Math.abs(Math.round(min));
  return `${sinal}${Math.floor(a / 60)}h${String(a % 60).padStart(2, '0')}`;
}

export const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Regra do Regulamento Interno: mais de 3 atrasos acima da tolerância no mês → advertência. */
export const LIMITE_ATRASOS_MES = 3;
