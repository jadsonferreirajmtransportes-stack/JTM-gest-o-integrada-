// ============================================================================
// Leitura de PDF, Word (.docx) e Excel/CSV → blocos do documento (títulos,
// parágrafos, listas, tabelas). Tudo no navegador — o arquivo original não vai
// pro servidor.
//   - Word: mammoth converte para HTML (estilos de título viram h1/h2...).
//   - Excel/CSV: cada planilha vira um título + tabela (1ª linha = cabeçalho).
//   - PDF: texto com posição (pdf.js) → linhas → parágrafos; fonte maior ou
//     linha curta em maiúsculas = título; "•", "-", "1." = lista; cabeçalho e
//     rodapé que se repetem em todas as páginas são descartados.
// ============================================================================

import type { BlocoDocumento } from '../../utils/documentosPadronizadosApi';
import { novoIdBloco } from '../../utils/documentosPadronizadosApi';
import { carregarPdfJs } from '../Contracheques/contrachequePdfUtils';
import { enviarArquivo } from '../../utils/arquivosStorage';

/** Opções da importação. imagens: traz as figuras do PDF/Word como blocos de imagem (enviadas
 *  ao Storage) — a Padronização de Documentos usa; o Portal de Educação tem o próprio jeito. */
export interface OpcoesImportacao {
  imagens?: boolean;
  aoProgredir?: (msg: string) => void;
}

/** Envia uma figura (data URL ou blob) ao Storage e devolve a referência. */
async function enviarFigura(dados: string | Blob, nome: string): Promise<string> {
  const blob = typeof dados === 'string' ? await (await fetch(dados)).blob() : dados;
  const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  return enviarArquivo(new File([blob], `${nome}.${ext}`, { type: blob.type || 'image/png' }), 'documentos/imagens');
}

export interface DocumentoImportado {
  tituloSugerido: string;
  blocos: BlocoDocumento[];
  origemTipo: 'pdf' | 'docx' | 'xlsx' | 'csv';
  avisos: string[];
}

const limpar = (t: string) => t.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
const ehMarcadorLista = /^\s*(?:[•●▪◦‣∙·\-–—*]|\(?\d{1,2}[.)]|\(?[a-z][.)])\s+/i;
const tirarMarcador = (t: string) => t.replace(ehMarcadorLista, '').trim();
const ehNumerada = (t: string) => /^\s*\(?(\d{1,2}|[a-z])[.)]\s+/i.test(t);

export async function importarArquivo(arquivo: File, opcoes: OpcoesImportacao = {}): Promise<DocumentoImportado> {
  const nome = arquivo.name.toLowerCase();
  const titulo = arquivo.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  if (nome.endsWith('.docx')) return finalizar({ ...(await lerDocx(arquivo, opcoes)), origemTipo: 'docx', tituloSugerido: titulo });
  if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) return finalizar({ ...(await lerPlanilha(arquivo)), origemTipo: 'xlsx', tituloSugerido: titulo });
  if (nome.endsWith('.csv')) return finalizar({ ...(await lerPlanilha(arquivo)), origemTipo: 'csv', tituloSugerido: titulo });
  if (nome.endsWith('.pdf')) return finalizar({ ...(await lerPdf(arquivo, opcoes)), origemTipo: 'pdf', tituloSugerido: titulo });
  if (nome.endsWith('.doc')) throw new Error('Arquivo .doc (Word antigo) não é suportado. No Word, use "Salvar como" → .docx e importe de novo.');
  throw new Error('Formato não suportado. Use PDF, Word (.docx) ou Excel (.xlsx/.csv).');
}

// ---------------------------------------------------------------------------
// Word
// ---------------------------------------------------------------------------
async function lerDocx(arquivo: File, opcoes: OpcoesImportacao = {}): Promise<{ blocos: BlocoDocumento[]; avisos: string[] }> {
  const mammoth = await import('mammoth');
  const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer: await arquivo.arrayBuffer() });
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const blocos: BlocoDocumento[] = [];
  const avisos: string[] = [];
  if (doc.querySelector('img') && !opcoes.imagens) avisos.push('O arquivo tem imagens — elas não entram aqui (só o texto e as tabelas).');
  let figuras = 0;
  const imagensDe = async (el: Element) => {
    if (!opcoes.imagens) return;
    for (const img of Array.from(el.querySelectorAll('img'))) {
      const src = img.getAttribute('src') || '';
      if (!src.startsWith('data:')) continue;
      figuras += 1;
      opcoes.aoProgredir?.(`Enviando imagem ${figuras}...`);
      try {
        const ref = await enviarFigura(src, `figura-${figuras}`);
        blocos.push({ id: novoIdBloco(), tipo: 'imagem', ref, legenda: limpar(img.getAttribute('alt') || '') || undefined, largura: 100 });
      } catch (e) {
        console.error(e);
        avisos.push(`A imagem ${figuras} não pôde ser enviada.`);
      }
    }
  };
  if (messages.some((m) => m.type === 'warning')) avisos.push('Parte da formatação do Word não foi reconhecida; confira o conteúdo no editor.');

  const listaDe = (el: Element, ordenada: boolean) => {
    const itens = Array.from(el.children)
      .filter((li) => li.tagName === 'LI')
      .map((li) => limpar(li.textContent || ''))
      .filter(Boolean);
    if (itens.length) blocos.push({ id: novoIdBloco(), tipo: 'lista', ordenada, itens });
  };

  for (const el of Array.from(doc.body.children)) {
    const tag = el.tagName;
    const texto = limpar(el.textContent || '');
    if (tag !== 'TABLE') await imagensDe(el);
    if (/^H[1-6]$/.test(tag)) {
      if (texto) blocos.push({ id: novoIdBloco(), tipo: 'titulo', nivel: Math.min(3, Number(tag[1])) as 1 | 2 | 3, texto });
    } else if (tag === 'UL' || tag === 'OL') {
      listaDe(el, tag === 'OL');
    } else if (tag === 'TABLE') {
      const linhas = Array.from(el.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((td) => limpar(td.textContent || '')));
      const uteis = linhas.filter((l) => l.some(Boolean));
      // Quadro de controle de um documento JMT (Código | ... | Versão) não é conteúdo.
      const ehQuadroControle = uteis[0]?.[0] === 'Código' && uteis[0].includes('Versão');
      if (uteis.length && !ehQuadroControle) blocos.push(normalizarTabela(uteis[0], uteis.slice(1)));
    } else if (texto) {
      // Parágrafo inteiro em negrito e curto = título "feito à mão" no Word.
      const negrito = el.querySelector('strong');
      const todoNegrito = !!negrito && limpar(negrito.textContent || '') === texto;
      if (todoNegrito && texto.length <= 90 && !/[.:;]$/.test(texto)) blocos.push({ id: novoIdBloco(), tipo: 'titulo', nivel: 2, texto });
      else if (ehMarcadorLista.test(texto)) adicionarItemLista(blocos, texto);
      else blocos.push({ id: novoIdBloco(), tipo: 'paragrafo', texto });
    }
  }
  return { blocos, avisos };
}

// ---------------------------------------------------------------------------
// Excel / CSV
// ---------------------------------------------------------------------------
async function lerPlanilha(arquivo: File): Promise<{ blocos: BlocoDocumento[]; avisos: string[] }> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true });
  const blocos: BlocoDocumento[] = [];
  const avisos: string[] = [];
  for (const nomeAba of wb.SheetNames) {
    const linhasBrutas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, raw: false, defval: '' }) as unknown[][];
    let linhas = linhasBrutas.map((l) => l.map((c) => limpar(String(c ?? '')))).filter((l) => l.some(Boolean));
    if (linhas.length === 0) continue;
    // Tira colunas totalmente vazias.
    const largura = Math.max(...linhas.map((l) => l.length));
    const colunasUsadas = Array.from({ length: largura }, (_, i) => i).filter((i) => linhas.some((l) => l[i]));
    linhas = linhas.map((l) => colunasUsadas.map((i) => l[i] || ''));
    if (linhas.length > 2000) {
      avisos.push(`A aba "${nomeAba}" tem ${linhas.length} linhas — foram importadas as primeiras 2000.`);
      linhas = linhas.slice(0, 2001);
    }
    if (wb.SheetNames.length > 1) blocos.push({ id: novoIdBloco(), tipo: 'titulo', nivel: 2, texto: nomeAba });
    // Aba de uma coluna só = texto (cada linha um parágrafo/título), não tabela.
    const inicioTabela = linhas.findIndex((l) => l.filter(Boolean).length >= Math.max(2, Math.ceil(colunasUsadas.length / 2)));
    if (colunasUsadas.length === 1 || inicioTabela < 0) {
      linhas.forEach((l) => {
        const t = l.filter(Boolean).join(" — ");
        if (!t) return;
        if (ehMarcadorLista.test(t)) adicionarItemLista(blocos, t);
        else if (t.length <= 80 && t === t.toUpperCase() && /\p{Lu}{3}/u.test(t)) blocos.push({ id: novoIdBloco(), tipo: 'titulo', nivel: 2, texto: t });
        else blocos.push({ id: novoIdBloco(), tipo: 'paragrafo', texto: t });
      });
      continue;
    }
    // Linhas de título no topo da planilha (só 1–2 células preenchidas) não são o cabeçalho
    // da tabela: o cabeçalho é a primeira linha com pelo menos metade das colunas.
    const inicio = inicioTabela;
    linhas.slice(0, Math.max(0, inicio)).forEach((l) => {
      const t = l.filter(Boolean).join(' — ');
      if (t) blocos.push({ id: novoIdBloco(), tipo: 'paragrafo', texto: t });
    });
    const tabela = linhas.slice(Math.max(0, inicio));
    blocos.push(normalizarTabela(tabela[0], tabela.slice(1)));
  }
  return { blocos, avisos };
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
interface LinhaPdf {
  texto: string;
  y: number;
  altura: number;
  pagina: number;
  /** Quando a "linha" é uma figura recortada da página. */
  figura?: { dataUrl: string; largura: 50 | 75 | 100 };
}

async function lerPdf(arquivo: File, opcoes: OpcoesImportacao = {}): Promise<{ blocos: BlocoDocumento[]; avisos: string[] }> {
  const pdfjs = await carregarPdfJs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const linhas: LinhaPdf[] = [];
  const figurasPorPagina = opcoes.imagens ? await caixasDeFiguras(pdf, pdfjs) : new Map<number, CaixaFigura[]>();
  for (let p = 1; p <= pdf.numPages; p++) {
    const pagina = await pdf.getPage(p);
    const conteudo = await pagina.getTextContent();
    const figuras = figurasPorPagina.get(p) || [];
    const dentroDeFigura = (x: number, y: number) => figuras.some((f) => x >= f.x1 - 2 && x <= f.x2 + 2 && y >= f.y1 - 2 && y <= f.y2 + 2);
    const itens = (conteudo.items as any[])
      .filter((it) => typeof it.str === 'string' && it.str.trim())
      .map((it) => ({ str: it.str as string, x: it.transform[4] as number, y: it.transform[5] as number, h: Math.abs(it.transform[3] as number) || (it.height as number) || 10 }))
      // Texto por cima de uma foto (OCR escondido de documento escaneado) não é conteúdo.
      .filter((it) => !dentroDeFigura(it.x, it.y));
    // Agrupa por linha (mesmo y, com tolerância).
    itens.sort((a, b) => b.y - a.y || a.x - b.x);
    const grupos: (typeof itens)[] = [];
    for (const it of itens) {
      const g = grupos.find((x) => Math.abs(x[0].y - it.y) < Math.max(2, it.h * 0.35));
      if (g) g.push(it);
      else grupos.push([it]);
    }
    for (const g of grupos) {
      g.sort((a, b) => a.x - b.x);
      const texto = limpar(g.map((i) => i.str).join(' ').replace(/\s+([,.;:])/g, '$1'));
      if (texto) linhas.push({ texto, y: g[0].y, altura: Math.max(...g.map((i) => i.h)), pagina: p });
    }
    // A figura entra na sequência pela altura do topo dela (recortada da página renderizada).
    if (figuras.length) {
      const viewport = pagina.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pagina.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise;
      for (const f of figuras) {
        const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle([f.x1, f.y1, f.x2, f.y2]);
        const x = Math.max(0, Math.floor(Math.min(vx1, vx2)));
        const y = Math.max(0, Math.floor(Math.min(vy1, vy2)));
        const w = Math.min(canvas.width - x, Math.ceil(Math.abs(vx2 - vx1)));
        const h = Math.min(canvas.height - y, Math.ceil(Math.abs(vy2 - vy1)));
        if (w < 20 || h < 20) continue;
        const recorte = document.createElement('canvas');
        recorte.width = w;
        recorte.height = h;
        recorte.getContext('2d')!.drawImage(canvas, x, y, w, h, 0, 0, w, h);
        const largura = (f.x2 - f.x1) / (pagina.view[2] || 595);
        linhas.push({ texto: '', y: f.y2, altura: 0, pagina: p, figura: { dataUrl: recorte.toDataURL('image/jpeg', 0.88), largura: largura > 0.8 ? 100 : largura > 0.55 ? 75 : 50 } });
      }
      linhas.sort((a, b) => a.pagina - b.pagina || b.y - a.y);
    }
  }
  const totalFiguras = linhas.filter((l) => l.figura).length;
  const avisos: string[] = [];
  if (linhas.filter((l) => !l.figura).length === 0 && totalFiguras === 0) {
    return { blocos: [], avisos: ['Não foi encontrado texto no PDF — ele parece ser uma imagem escaneada. Digite o conteúdo no editor ou importe a versão em Word.'] };
  }

  // Cabeçalho/rodapé repetido: mesmo texto (sem números) em mais da metade das páginas.
  if (pdf.numPages >= 3) {
    const chave = (t: string) => t.replace(/\d+/g, '#');
    const contagem = new Map<string, Set<number>>();
    linhas.forEach((l) => !l.figura && contagem.set(chave(l.texto), (contagem.get(chave(l.texto)) || new Set()).add(l.pagina)));
    const repetidas = new Set(Array.from(contagem.entries()).filter(([, ps]) => ps.size > pdf.numPages / 2).map(([k]) => k));
    for (let i = linhas.length - 1; i >= 0; i--) if (!linhas[i].figura && repetidas.has(chave(linhas[i].texto))) linhas.splice(i, 1);
    if (repetidas.size) avisos.push('Cabeçalho e rodapé que se repetiam em todas as páginas foram retirados (o padrão JMT coloca os seus).');
  }

  const alturas = linhas.filter((l) => !l.figura).map((l) => l.altura).sort((a, b) => a - b);
  const alturaTexto = alturas[Math.floor(alturas.length / 2)] || 10;
  const blocos: BlocoDocumento[] = [];
  let paragrafo: string[] = [];
  let anterior: LinhaPdf | null = null;
  const fecharParagrafo = () => {
    if (paragrafo.length) {
      const texto = limpar(paragrafo.join(' ').replace(/(\p{L})- (\p{Ll})/gu, '$1$2'));
      if (texto) blocos.push({ id: novoIdBloco(), tipo: 'paragrafo', texto });
    }
    paragrafo = [];
  };

  let alturaUltimoTitulo = 0;
  let enviadas = 0;
  for (const l of linhas) {
    if (l.figura) {
      fecharParagrafo();
      enviadas += 1;
      opcoes.aoProgredir?.(`Enviando imagem ${enviadas} de ${totalFiguras}...`);
      try {
        const ref = await enviarFigura(l.figura.dataUrl, `figura-${enviadas}`);
        blocos.push({ id: novoIdBloco(), tipo: 'imagem', ref, largura: l.figura.largura });
      } catch (e) {
        console.error(e);
        avisos.push(`A imagem ${enviadas} não pôde ser enviada.`);
      }
      anterior = null;
      continue;
    }
    const semMarcador = tirarMarcador(l.texto);
    const caixaAlta = (t: string) => t.length <= 80 && t === t.toUpperCase() && /\p{Lu}{3}/u.test(t);
    // "EMPRESA: Fulano" (rótulo: valor) e linhas de preencher "_____" não são título.
    const rotuloValor = /^[^:]{2,60}:\s+\S/.test(l.texto);
    const campoPreencher = /_{4,}/.test(l.texto);
    const maiusculas = caixaAlta(l.texto) && !rotuloValor && !campoPreencher;
    const maior = l.altura > alturaTexto * 1.18 && !campoPreencher;
    const espaco = anterior && anterior.pagina === l.pagina ? anterior.y - l.y : Infinity;
    const quebra = espaco > alturaTexto * 1.9;
    // "1. OBJETIVO:" = seção numerada (título), não item de lista.
    const secaoNumerada = ehNumerada(l.texto) && caixaAlta(semMarcador) && semMarcador.length <= 80;
    if (secaoNumerada || ((maior || maiusculas) && l.texto.length <= 120 && !ehMarcadorLista.test(l.texto))) {
      fecharParagrafo();
      const texto = (secaoNumerada ? semMarcador : l.texto).replace(/[.:]$/, '');
      const ultimo = blocos[blocos.length - 1];
      // Título que continua na linha de baixo (mesmo tamanho de letra, logo abaixo).
      if (!secaoNumerada && ultimo?.tipo === 'titulo' && anterior && espaco < alturaTexto * 2.2 && anterior.pagina === l.pagina && Math.abs(l.altura - alturaUltimoTitulo) < 0.6)
        ultimo.texto = `${ultimo.texto} ${texto}`;
      else blocos.push({ id: novoIdBloco(), tipo: 'titulo', nivel: secaoNumerada || l.altura > alturaTexto * 1.5 ? 1 : 2, texto });
      alturaUltimoTitulo = l.altura;
    } else if (ehMarcadorLista.test(l.texto)) {
      fecharParagrafo();
      adicionarItemLista(blocos, l.texto);
    } else {
      const ultimo = blocos[blocos.length - 1];
      // Linha que continua um item de lista.
      if (paragrafo.length === 0 && ultimo?.tipo === 'lista' && !quebra && anterior && /[^.;:]$/.test(ultimo.itens[ultimo.itens.length - 1])) {
        ultimo.itens[ultimo.itens.length - 1] = limpar(`${ultimo.itens[ultimo.itens.length - 1]} ${l.texto}`);
      } else {
        // Linha "Rótulo: valor" (ex.: horários por operação) começa um parágrafo próprio.
        if (quebra || rotuloValor) fecharParagrafo();
        paragrafo.push(l.texto);
        // Linha que termina com ponto e é bem mais curta = fim de parágrafo.
        if (/[.!?:]$/.test(l.texto) && l.texto.length < 60) fecharParagrafo();
      }
    }
    anterior = l;
  }
  fecharParagrafo();
  avisos.push('Em PDF, tabelas e colunas podem vir como texto corrido — confira e, se precisar, transforme em tabela no editor.');
  if (totalFiguras) avisos.push(`${totalFiguras} imagem(ns) do PDF entraram como blocos de imagem — confira a posição e a legenda no editor.`);
  return { blocos, avisos };
}

// ---------------------------------------------------------------------------
// Figuras do PDF (pdf.js): posição de cada imagem desenhada na página. Ícones pequenos e o
// logo que se repete no topo/rodapé das páginas ficam de fora.
// ---------------------------------------------------------------------------
interface CaixaFigura {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
async function caixasDeFiguras(pdf: any, pdfjs: any): Promise<Map<number, CaixaFigura[]>> {
  const { OPS } = pdfjs;
  const multiplicar = (m1: number[], m2: number[]) => [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
  const aplicar = (p: number[], m: number[]) => [p[0] * m[0] + p[1] * m[2] + m[4], p[0] * m[1] + p[1] * m[3] + m[5]];
  const todas: (CaixaFigura & { pagina: number; area: number; largura: number; altura: number })[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const pagina = await pdf.getPage(p);
    const [, , largura, altura] = pagina.view;
    const ops = await pagina.getOperatorList();
    let ctm = [1, 0, 0, 1, 0, 0];
    const pilha: number[][] = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];
      if (fn === OPS.save) pilha.push(ctm);
      else if (fn === OPS.restore) ctm = pilha.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = multiplicar(ctm, args);
      else if (fn === OPS.paintFormXObjectBegin) {
        pilha.push(ctm);
        if (args?.[0] && args[0].length === 6) ctm = multiplicar(ctm, Array.from(args[0]));
      } else if (fn === OPS.paintFormXObjectEnd) ctm = pilha.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageXObjectRepeat) {
        const cantos = [[0, 0], [1, 0], [0, 1], [1, 1]].map((c) => aplicar(c, ctm));
        const xs = cantos.map((c) => c[0]);
        const ys = cantos.map((c) => c[1]);
        const c = { x1: Math.max(0, Math.min(...xs)), y1: Math.max(0, Math.min(...ys)), x2: Math.min(largura, Math.max(...xs)), y2: Math.min(altura, Math.max(...ys)) };
        const w = c.x2 - c.x1;
        const h = c.y2 - c.y1;
        if (w >= 60 && h >= 40 && w * h >= largura * altura * 0.03) todas.push({ ...c, pagina: p, area: (w * h) / (largura * altura), largura, altura });
      }
    }
  }
  // Logo/selo repetido: pequeno, perto do topo ou do rodapé e na maioria das páginas.
  const chave = (c: CaixaFigura) => `${Math.round(c.x1 / 10)}-${Math.round(c.y1 / 10)}-${Math.round((c.x2 - c.x1) / 10)}-${Math.round((c.y2 - c.y1) / 10)}`;
  const paginas = new Map<string, Set<number>>();
  todas.forEach((c) => paginas.set(chave(c), (paginas.get(chave(c)) || new Set()).add(c.pagina)));
  const mapa = new Map<number, CaixaFigura[]>();
  todas.forEach((c) => {
    const nasBordas = c.y1 > c.altura * 0.8 || c.y2 < c.altura * 0.15;
    const repetida = pdf.numPages >= 3 && (paginas.get(chave(c))?.size || 0) > pdf.numPages / 2;
    if (repetida && nasBordas && c.area < 0.1) return;
    mapa.set(c.pagina, [...(mapa.get(c.pagina) || []), { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 }]);
  });
  return mapa;
}

// ---------------------------------------------------------------------------
/** Acabamento comum: tira a numeração manual dos títulos ("1. OBJETIVO" → "OBJETIVO" — o
 *  padrão JMT numera as seções sozinho) e descarta blocos vazios. */
function finalizar(r: DocumentoImportado): DocumentoImportado {
  const blocos = r.blocos
    .map((b) => (b.tipo === 'titulo' ? { ...b, texto: b.texto.replace(/^\d+(?:\.\d+)*[.)]\s+(?=\p{L})/u, '').trim() } : b))
    .filter((b) => (b.tipo === 'lista' ? b.itens.length > 0 : b.tipo === 'tabela' || b.tipo === 'imagem' ? true : b.texto.trim().length > 0));
  return { ...r, blocos };
}

function adicionarItemLista(blocos: BlocoDocumento[], texto: string) {
  const ultimo = blocos[blocos.length - 1];
  const ordenada = ehNumerada(texto);
  const item = tirarMarcador(texto);
  if (!item) return;
  if (ultimo?.tipo === 'lista' && ultimo.ordenada === ordenada) ultimo.itens.push(item);
  else blocos.push({ id: novoIdBloco(), tipo: 'lista', ordenada, itens: [item] });
}

export function normalizarTabela(cabecalho: string[], linhas: string[][]): BlocoDocumento {
  const n = Math.max(cabecalho.length, ...linhas.map((l) => l.length), 1);
  const ajustar = (l: string[]) => Array.from({ length: n }, (_, i) => l[i] ?? '');
  return { id: novoIdBloco(), tipo: 'tabela', cabecalho: ajustar(cabecalho), linhas: linhas.map(ajustar) };
}
