// ============================================================================
// Leitura e separação do PDF da folha (um PDF com o contracheque de todos, um
// por página): extrai o texto de cada página (pdf.js), identifica o colaborador
// pelo CPF impresso — ou pelo nome, se não achar CPF — e separa as páginas em
// um PDF por colaborador (pdf-lib). Tudo no navegador: o PDF inteiro da folha
// nunca é enviado pro servidor, só o contracheque já separado de cada um.
//
// As duas bibliotecas são carregadas sob demanda (import dinâmico) — só quem
// abre a importação baixa o código delas.
// ============================================================================

import { Colaborador } from '../../types';

export interface PaginaIdentificada {
  /** Índice da página no PDF original (0 = primeira). */
  indice: number;
  colaboradorId?: string;
  /** Como o colaborador foi identificado — 'manual' quando o usuário escolheu na prévia. */
  motivo?: 'cpf' | 'nome' | 'manual';
  /** Trecho do texto da página, pra ajudar a conferir as páginas não identificadas. */
  trecho: string;
}

function soDigitos(v: string): string {
  return (v || '').replace(/\D/g, '');
}

function normalizarTexto(v: string): string {
  return (v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function carregarPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/** Texto de cada página do PDF, na ordem. */
export async function extrairTextoDasPaginas(arquivo: File): Promise<string[]> {
  const pdfjs = await carregarPdfJs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const textos: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    textos.push(
      conteudo.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
    );
  }
  await pdf.destroy();
  return textos;
}

/** Acha o colaborador de cada página: primeiro pelo CPF (com ou sem pontuação, e nunca dentro
 *  de um número maior como o CNPJ da empresa); se não achar, pelo nome completo escrito na
 *  página. Página sem nenhum dos dois fica sem colaborador, pra escolher na prévia. */
export function identificarPaginas(textos: string[], colaboradores: Colaborador[]): PaginaIdentificada[] {
  const porCpf = new Map<string, Colaborador>();
  colaboradores.forEach((c) => {
    const d = soDigitos(c.cpf);
    if (d.length === 11) porCpf.set(d, c);
  });
  // Nomes mais longos primeiro — evita casar "JOSE SILVA" dentro de "JOSE SILVA SANTOS".
  const porNome = colaboradores
    .map((c) => ({ c, nome: normalizarTexto(c.nomeCompleto) }))
    .filter((x) => x.nome.split(' ').length >= 2)
    .sort((a, b) => b.nome.length - a.nome.length);

  return textos.map((texto, indice) => {
    const trecho = texto.replace(/\s+/g, ' ').trim().slice(0, 160);
    const cpfs = texto.match(/(?<![\d./-])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\d./-])/g) || [];
    for (const cpf of cpfs) {
      const c = porCpf.get(soDigitos(cpf));
      if (c) return { indice, colaboradorId: c.id, motivo: 'cpf' as const, trecho };
    }
    const textoNormalizado = ` ${normalizarTexto(texto)} `;
    const achadoPorNome = porNome.find((x) => textoNormalizado.includes(` ${x.nome} `));
    if (achadoPorNome) return { indice, colaboradorId: achadoPorNome.c.id, motivo: 'nome' as const, trecho };
    return { indice, trecho };
  });
}

/** Agrupa as páginas por colaborador (um contracheque pode ter mais de uma página, ex.: 2
 *  vias ou muitos lançamentos), na ordem em que aparecem no PDF. */
export function agruparPorColaborador(paginas: PaginaIdentificada[]): Map<string, number[]> {
  const grupos = new Map<string, number[]>();
  paginas.forEach((p) => {
    if (!p.colaboradorId) return;
    const lista = grupos.get(p.colaboradorId) || [];
    lista.push(p.indice);
    grupos.set(p.colaboradorId, lista);
  });
  return grupos;
}

/** Monta um PDF novo só com as páginas indicadas do PDF original. */
export async function separarPaginas(arquivo: File, indices: number[], nomeArquivo: string): Promise<File> {
  const { PDFDocument } = await import('pdf-lib');
  const original = await PDFDocument.load(await arquivo.arrayBuffer());
  const novo = await PDFDocument.create();
  const copiadas = await novo.copyPages(original, indices);
  copiadas.forEach((p) => novo.addPage(p));
  const bytes = await novo.save();
  return new File([bytes], nomeArquivo, { type: 'application/pdf' });
}

export type TipoDocumentoFerias = 'Aviso de Férias' | 'Recibo de Férias';
export const TIPOS_DOCUMENTO_FERIAS: TipoDocumentoFerias[] = ['Aviso de Férias', 'Recibo de Férias'];

/** Aviso ou Recibo, pelo título impresso no PDF da contabilidade ("AVISO PRÉVIO DE FÉRIAS" /
 *  "DEMONSTRATIVO DE FÉRIAS" + "RECIBO DE FÉRIAS"). */
export function detectarTipoFerias(texto: string): TipoDocumentoFerias | undefined {
  const t = normalizarTexto(texto);
  if (t.includes('RECIBO DE FERIAS') || t.includes('DEMONSTRATIVO DE FERIAS')) return 'Recibo de Férias';
  if (t.includes('AVISO PREVIO DE FERIAS') || t.includes('AVISO DE FERIAS')) return 'Aviso de Férias';
  return undefined;
}

/** "Período de Gozo (de) 06/04/2026 a 05/05/2026" → { inicio: '2026-04-06', fim: '2026-05-05' }. */
export function extrairPeriodoGozo(texto: string): { inicio: string; fim: string } | undefined {
  const m = texto.match(/Per[ií]odo\s+de\s+Gozo\s*(?:de\s*)?(\d{2})\/(\d{2})\/(\d{4})\s*a\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!m) return undefined;
  return { inicio: `${m[3]}-${m[2]}-${m[1]}`, fim: `${m[6]}-${m[5]}-${m[4]}` };
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. */
export function formatarDataBr(iso?: string): string {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

/** 'YYYY-MM' → 'Setembro/2026'. */
export function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return mes >= 1 && mes <= 12 ? `${nomes[mes - 1]}/${ano}` : competencia;
}
