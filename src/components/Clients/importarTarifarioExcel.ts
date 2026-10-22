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

/** Generalidades da aba de premissas (ex.: "TDE / Por Veiculo | 102,3", "Ajudante | 102,3"). */
function lerGeneralidades(linhas: unknown[][]): CustoExtraTarifa[] {
  const saida: CustoExtraTarifa[] = [];
  let naSecao = false;
  for (const l of linhas) {
    const rotulo = String(l.find((c) => String(c).trim()) ?? '').trim();
    const n = norm(rotulo);
    if (n.startsWith('GENERALIDADES')) {
      naSecao = true;
      continue;
    }
    if (!naSecao) continue;
    if (!rotulo || n.startsWith('TIPO DE VEICULO')) break;
    const valor = l.map(numero).find((x, i) => i > l.indexOf(rotulo) && x !== undefined);
    if (valor) saida.push({ id: novoId('cex'), categoria: 'GENERALIDADES', itemDescricao: rotulo, grupoDestinatario: '', tipoCobranca: 'Valor fechado', valor });
  }
  return saida;
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
  let generalidades: CustoExtraTarifa[] = [];
  wb.SheetNames.forEach((nome) => {
    const linhas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nome], { header: 1, defval: '' });
    const iCab = linhas.findIndex((l) => {
      const n = l.map(norm);
      return n.some((x) => x === 'CIDADE') && n.some((x) => x.startsWith('ATE 10') || x.startsWith('KG EXCEDENTE'));
    });
    if (iCab >= 0) abas.push(lerAbaTabela(nome, linhas, iCab));
    else if (!generalidades.length) generalidades = lerGeneralidades(linhas);
  });
  if (generalidades.length) {
    abas.forEach((a) => {
      a.custosExtras = [...generalidades.map((g) => ({ ...g, id: novoId('cex') })), ...a.custosExtras];
    });
  }
  return abas;
}
