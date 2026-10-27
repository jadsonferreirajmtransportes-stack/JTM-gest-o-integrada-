import * as XLSX from 'xlsx';
import { CustoExtraTarifa, FaixaTarifaCidade } from '../../types';

// Lê um tarifário em Excel no modelo da JMT (o mesmo da LUFT "Template RODO-AEREO"): uma aba
// por tabela com as colunas RAIO | CIDADE | UF | ATÉ 10 KG | KG EXCEDENTE | PRAZO | KM, em que
// o raio e os valores aparecem só na primeira cidade de cada faixa (células mescladas). As
// linhas de cima (veículo dedicado, km rodado) viram custos extras; as linhas "OBS" viram
// observações. Uma aba de premissas com "GENERALIDADES" (TDE, ajudante...) também é lida.

export interface AbaTarifario {
  nome: string;
  tarifas: FaixaTarifaCidade[];
  custosExtras: CustoExtraTarifa[];
  observacoes: string[];
  /** Cidades que aparecem mais de uma vez com valores diferentes (fica a primeira). */
  conflitos: string[];
  faixas: { raio: string; cidades: number; valorAte10Kg: number; valorKgExcedente: number }[];
}

const norm = (t: unknown) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

function numero(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = String(v ?? '').replace(/R\$/i, '').trim();
  if (!t || t === '-') return undefined;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) ? n : undefined;
}

let seq = 0;
const novoId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** "VEÍCULO TIPO FIORINO R$ 180,79 E VAN R$ 251,10" → [{veiculo: FIORINO, valor: 180.79}, ...] */
function valoresPorVeiculo(texto: string): { veiculo: string; valor: number }[] {
  const saida: { veiculo: string; valor: number }[] = [];
  const re = /([A-ZÀ-Ú0-9/ ]+?)\s*R\$\s*([\d.]+(?:,\d+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    const veiculo = m[1].replace(/^.*\b(TIPO|E)\b\s*/i, '').trim();
    const valor = numero(m[2]);
    if (veiculo && valor !== undefined) saida.push({ veiculo: veiculo.toUpperCase(), valor });
  }
  return saida;
}

/** Um bloco "Proposta" da aba de premissas — no modelo da LUFT há dois (Rodoviário e Aéreo),
 *  cada um com o valor da Capital (usado para saber de qual tabela ele é) e todos os custos
 *  extras: generalidades, dedicado capital, dedicado interior por km, TDE por destinatário,
 *  serviços avulsos (coletas, embarques, manutenção, reentrega...) e observações. */
interface BlocoPremissas {
  capital?: number;
  custosExtras: CustoExtraTarifa[];
  observacoes: string[];
}

function lerPremissas(linhas: unknown[][]): BlocoPremissas[] {
  const blocos: BlocoPremissas[] = [];
  let bloco: BlocoPremissas | null = null;
  let secao: { categoria: string; tipo: CustoExtraTarifa['tipoCobranca'] } | 'obs' | null = null;
  let vazias = 0;
  for (const l of linhas) {
    const celulas = l.map((c) => (typeof c === 'string' ? c.trim() : c));
    const iRot = celulas.findIndex((c) => c !== '' && c !== null && c !== undefined);
    if (iRot < 0) {
      vazias += 1;
      continue;
    }
    const rotulo = String(celulas[iRot]).trim();
    const n = norm(rotulo);
    const resto = celulas.slice(iRot + 1).filter((c) => c !== '' && c !== null && c !== undefined);
    const depoisDeVazias = vazias;
    vazias = 0;

    if (n === 'PROPOSTA' || (n === 'PREMISSA' && !bloco)) {
      bloco = { custosExtras: [], observacoes: [] };
      blocos.push(bloco);
      secao = null;
      continue;
    }
    if (!bloco) continue;
    if (n === 'CAPITAL' && bloco.capital === undefined) {
      bloco.capital = resto.map(numero).find((x) => x !== undefined && x > 1);
      continue;
    }
    if (n.startsWith('GENERALIDADES')) {
      secao = { categoria: 'GENERALIDADES', tipo: 'Valor fechado' };
      continue;
    }
    if (n.startsWith('GENERALIDADE')) {
      secao = 'obs';
      continue;
    }
    if (n.startsWith('TIPO DE VEICULO')) {
      // "TARIFAS / Valor KM" (ex.: TEMP LOG) é por km rodado mesmo na capital; "Valor Fechado" não.
      const cabecalho = resto.map(norm).join(' ');
      const porKm = /VALOR\s*(\/\s*)?KM|POR KM|KM RODADO/.test(cabecalho) || (n.includes('INTERIOR') && !/FECHADO/.test(cabecalho));
      secao = {
        categoria: n.includes('INTERIOR') ? 'DEDICADO INTERIOR (POR KM RODADO)' : porKm ? 'DEDICADO CAPITAL (POR KM RODADO)' : 'DEDICADO CAPITAL',
        tipo: porKm ? 'Valor/KM' : 'Valor fechado',
      };
      continue;
    }
    if (n.startsWith('TDE - PARA') || n.startsWith('TDE PARA')) {
      secao = { categoria: 'TDE POR DESTINATÁRIO', tipo: 'Valor fechado' };
      continue;
    }
    if (secao === 'obs') {
      const texto = rotulo.replace(/^\d+\)\s*/, '').trim();
      if (texto) bloco.observacoes.push(texto);
      continue;
    }
    // Itens depois de linhas em branco sem cabeçalho (coletas, embarques...) = serviços avulsos.
    if (secao && depoisDeVazias >= 2) secao = { categoria: 'SERVIÇOS AVULSOS', tipo: 'Serviço avulso' };
    if (!secao) continue;
    const valor = resto.map(numero).find((x) => x !== undefined);
    const texto = resto.find((c) => typeof c === 'string' && numero(c) === undefined && !/^R\$\s*-?$/.test(String(c).trim()));
    if (valor) {
      bloco.custosExtras.push({ id: novoId('cex'), categoria: secao.categoria, itemDescricao: rotulo, grupoDestinatario: '', tipoCobranca: secao.tipo, valor });
    } else if (texto) {
      // Sem valor fixo ("CONSULTAR TABELA", "TAXA DA ENTREGA"): entra com a regra na descrição.
      bloco.custosExtras.push({
        id: novoId('cex'),
        categoria: secao.categoria,
        itemDescricao: `${rotulo} — ${String(texto).toLowerCase()}`,
        grupoDestinatario: '',
        tipoCobranca: secao.tipo,
        valor: 0,
      });
    }
  }
  return blocos.filter((b) => b.custosExtras.length || b.observacoes.length);
}

function lerAbaTabela(nome: string, linhas: unknown[][], iCab: number): AbaTarifario {
  const cab = linhas[iCab].map(norm);
  const col = (...nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c.startsWith(n)));
  const c = {
    raio: col('RAIO', 'FAIXA'),
    cidade: col('CIDADE'),
    uf: col('UF'),
    ate10: col('ATE 10', 'ATE10', 'VALOR'),
    exc: col('KG EXCEDENTE', 'EXCEDENTE'),
    prazo: col('PRAZO'),
    km: col('KM'),
  };

  // Custos extras: linhas de cima com "R$" (veículo dedicado / km rodado).
  const custosExtras: CustoExtraTarifa[] = [];
  const observacoes: string[] = [];
  for (const l of linhas.slice(0, iCab)) {
    const rotulo = String(l[0] ?? '').trim();
    const texto = l.slice(1).map((x) => String(x ?? '')).join(' ').trim();
    if (/somente com autoriza/i.test(rotulo) || /autoriza/i.test(texto)) {
      observacoes.push(`${rotulo.replace(/^\*/, '')} ${texto}`.trim());
      continue;
    }
    if (!/R\$/.test(texto)) continue;
    const porKm = /KM RODADO/i.test(norm(rotulo));
    valoresPorVeiculo(texto).forEach(({ veiculo, valor }) =>
      custosExtras.push({
        id: novoId('cex'),
        categoria: porKm ? 'KM RODADO (DEDICADO)' : 'VEÍCULO DEDICADO / TDE / EXPRESSO / EMERGENCIAL (CAPITAL E RM)',
        itemDescricao: veiculo,
        grupoDestinatario: '',
        tipoCobranca: porKm ? 'Valor/KM' : 'Valor fechado',
        valor,
      })
    );
  }

  const tarifas: FaixaTarifaCidade[] = [];
  let raio = '';
  let ate10: number | undefined;
  let exc: number | undefined;
  for (const l of linhas.slice(iCab + 1)) {
    const primeira = norm(l[0]);
    if (primeira.startsWith('OBS')) {
      observacoes.push(String(l[0]).replace(/^OBS\s*:?\s*/i, '').trim());
      continue;
    }
    const cidade = String(l[c.cidade] ?? '').trim();
    const uf = c.uf >= 0 ? String(l[c.uf] ?? '').trim() : '';
    // Linha de cidade de verdade: tem cidade e UF de 2 letras (pula avisos no meio da tabela).
    if (!cidade || (c.uf >= 0 && !/^[A-Za-z]{2}$/.test(uf))) continue;
    const raioLinha = c.raio >= 0 ? String(l[c.raio] ?? '').replace(/\s+/g, ' ').trim() : '';
    if (raioLinha) raio = raioLinha;
    const v10 = numero(l[c.ate10]);
    const vExc = numero(l[c.exc]);
    if (v10 !== undefined) ate10 = v10;
    if (vExc !== undefined) exc = vExc;
    if (ate10 === undefined) continue;
    const km = c.km >= 0 ? numero(l[c.km]) : undefined;
    tarifas.push({
      id: novoId('tar'),
      cidade: cidade.toUpperCase(),
      uf: uf.toUpperCase() || undefined,
      raio,
      valorAte10Kg: ate10,
      valorKgExcedente: exc ?? 0,
      distanciaKm: km,
      prazo: c.prazo >= 0 ? String(l[c.prazo] ?? '').trim() || undefined : undefined,
    });
  }

  // Cidade repetida: igual (mesmo preço) sai; com preço diferente, fica a primeira e avisa.
  const chave = (t: FaixaTarifaCidade) => norm(t.cidade);
  const unicas: FaixaTarifaCidade[] = [];
  const conflitos: string[] = [];
  tarifas.forEach((t) => {
    const ja = unicas.find((u) => chave(u) === chave(t));
    if (!ja) {
      unicas.push(t);
      return;
    }
    if (ja.valorAte10Kg !== t.valorAte10Kg || ja.valorKgExcedente !== t.valorKgExcedente)
      conflitos.push(`${t.cidade}: ficou ${ja.raio} (${ja.distanciaKm ?? '?'} km); ignorada a linha de ${t.raio} (${t.distanciaKm ?? '?'} km)`);
  });
  tarifas.length = 0;
  tarifas.push(...unicas);

  const faixas: AbaTarifario['faixas'] = [];
  tarifas.forEach((t) => {
    const f = faixas.find((x) => x.raio === t.raio);
    if (f) f.cidades += 1;
    else faixas.push({ raio: t.raio, cidades: 1, valorAte10Kg: t.valorAte10Kg, valorKgExcedente: t.valorKgExcedente });
  });
  return { nome, tarifas, custosExtras, observacoes, conflitos, faixas };
}

/** Lê todas as abas de tarifa do arquivo (as que têm o cabeçalho CIDADE + ATÉ 10 KG). As
 *  generalidades de uma aba de premissas entram nos custos extras de cada tabela. */
export function lerTarifarioExcel(dados: ArrayBuffer): AbaTarifario[] {
  const wb = XLSX.read(dados, { type: 'array' });
  const abas: AbaTarifario[] = [];
  const blocos: BlocoPremissas[] = [];
  wb.SheetNames.forEach((nome) => {
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nome], { header: 1, defval: '' });
    const iCab = linhas.findIndex((l) => {
      const n = l.map(norm);
      return n.some((x) => x === 'CIDADE') && n.some((x) => x.startsWith('ATE 10') || x.startsWith('KG EXCEDENTE'));
    });
    if (iCab >= 0) abas.push(lerAbaTabela(nome, linhas, iCab));
    else blocos.push(...lerPremissas(linhas));
  });
  // Cada bloco de premissas vai para a tabela cuja Capital tem o mesmo valor (ex.: R$ 40,18 =
  // Rodoviário, R$ 43,20 = Aéreo). Achou: os custos extras do bloco (completos) substituem os
  // lidos do topo da aba; as observações do bloco somam às da aba.
  const usados = new Set<BlocoPremissas>();
  abas.forEach((a) => {
    const cap = a.faixas[0]?.valorAte10Kg;
    if (cap === undefined) return;
    const candidatos = blocos.filter((b) => b.capital !== undefined && !usados.has(b) && Math.abs((b.capital as number) - cap) <= 0.5);
    const bloco = candidatos.sort((x, y) => Math.abs((x.capital as number) - cap) - Math.abs((y.capital as number) - cap))[0];
    if (!bloco) return;
    usados.add(bloco);
    if (bloco.custosExtras.length) a.custosExtras = bloco.custosExtras.map((c) => ({ ...c, id: novoId('cex') }));
    a.observacoes = [...a.observacoes, ...bloco.observacoes];
  });
  return abas;
}
