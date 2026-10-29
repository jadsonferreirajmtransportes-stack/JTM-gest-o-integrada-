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

import type { ItemChecklist, BlocoDocumento } from '../../utils/documentosPadronizadosApi';
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
  /** Tabela desenhada (células já separadas, 1ª linha = cabeçalho). */
  tabela?: string[][];
  /** Quadro de uma coluna só (texto em "texto") — vira destaque. */
  caixa?: boolean;
  etapas?: string[];
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
      .map((it) => ({ str: it.str as string, x: it.transform[4] as number, y: it.transform[5] as number, w: (it.width as number) || 0, h: Math.abs(it.transform[3] as number) || (it.height as number) || 10 }))
      // Texto por cima de uma foto (OCR escondido de documento escaneado) não é conteúdo.
      .filter((it) => !dentroDeFigura(it.x, it.y));
    // Tabelas e quadros desenhados: o texto de dentro sai do fluxo e entra como tabela/destaque.
    const grades = await gradesDaPagina(pagina, pdfjs, itens).catch(() => [] as GradePdf[]);
    for (const g of grades) linhas.push({ texto: g.caixa || '', y: g.y2, altura: 0, pagina: p, tabela: g.celulas, caixa: !!g.caixa, etapas: g.etapas });
    const naGrade = (it: ItemPdf) => grades.some((g) => it.x + it.w / 2 > g.x1 && it.x + it.w / 2 < g.x2 && it.y + it.h / 3 > g.y1 && it.y + it.h / 3 < g.y2);
    for (let i = itens.length - 1; i >= 0; i--) if (naGrade(itens[i])) itens.splice(i, 1);
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
    }
    linhas.sort((a, b) => a.pagina - b.pagina || b.y - a.y);
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
    linhas.forEach((l) => !l.figura && !l.tabela && !l.etapas && contagem.set(chave(l.texto), (contagem.get(chave(l.texto)) || new Set()).add(l.pagina)));
    const repetidas = new Set(Array.from(contagem.entries()).filter(([, ps]) => ps.size > pdf.numPages / 2).map(([k]) => k));
    for (let i = linhas.length - 1; i >= 0; i--) if (!linhas[i].figura && !linhas[i].tabela && !linhas[i].etapas && repetidas.has(chave(linhas[i].texto))) linhas.splice(i, 1);
    if (repetidas.size) avisos.push('Cabeçalho e rodapé que se repetiam em todas as páginas foram retirados (o padrão JMT coloca os seus).');
  }

  const alturas = linhas.filter((l) => l.altura > 0).map((l) => l.altura).sort((a, b) => a - b);
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
  let tabelas = 0;
  let ultimaFoiTabela = false;
  let ultimaFoiEtapas = false;
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
    if (l.tabela) {
      fecharParagrafo();
      const [cabecalho, ...corpo] = l.tabela;
      const ultimo = blocos[blocos.length - 1];
      // Tabela que continua na página seguinte (mesmas colunas, logo depois da anterior):
      // junta, sem repetir o cabeçalho.
      if (ultimo?.tipo === 'tabela' && ultimaFoiTabela && ultimo.cabecalho.length === cabecalho.length) {
        const repeteCabecalho = cabecalho.every((c, i) => c === ultimo.cabecalho[i]);
        ultimo.linhas.push(...(repeteCabecalho ? corpo : l.tabela));
      } else {
        blocos.push(normalizarTabela(cabecalho, corpo));
        tabelas += 1;
      }
      ultimaFoiTabela = true;
      anterior = null;
      continue;
    }
    ultimaFoiTabela = false;
    if (l.etapas) {
      fecharParagrafo();
      const ultimo = blocos[blocos.length - 1];
      // Fluxo que continua na página seguinte entra na mesma lista.
      if (ultimo?.tipo === 'lista' && ultimo.ordenada && ultimaFoiEtapas) ultimo.itens.push(...l.etapas);
      else blocos.push({ id: novoIdBloco(), tipo: 'lista', ordenada: true, itens: [...l.etapas] });
      ultimaFoiEtapas = true;
      anterior = null;
      continue;
    }
    ultimaFoiEtapas = false;
    if (l.caixa) {
      fecharParagrafo();
      blocos.push({ id: novoIdBloco(), tipo: 'destaque', texto: l.texto });
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
  avisos.push(
    tabelas
      ? `${tabelas} tabela(s) do PDF foram reconhecidas pelas bordas — confira as células no editor. Tabelas sem borda podem vir como texto corrido.`
      : 'Em PDF, tabelas e colunas podem vir como texto corrido — confira e, se precisar, transforme em tabela no editor.'
  );
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
const multiplicar = (m1: number[], m2: number[]) => [
  m1[0] * m2[0] + m1[2] * m2[1],
  m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3],
  m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
  m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
];
const aplicar = (p: number[], m: number[]) => [p[0] * m[0] + p[1] * m[2] + m[4], p[0] * m[1] + p[1] * m[3] + m[5]];

async function caixasDeFiguras(pdf: any, pdfjs: any): Promise<Map<number, CaixaFigura[]>> {
  const { OPS } = pdfjs;
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
// Tabelas do PDF (pdf.js): as bordas e fundos das células são desenhados como retângulos e
// linhas finas. Cada conjunto de desenhos encostados vira uma região; as linhas finas
// verticais/horizontais dão as colunas e as linhas da grade, e o texto cai na célula pelo centro.
// Região de uma coluna só (ex.: quadro "PONTO DE ATENÇÃO") vira um destaque.
// ---------------------------------------------------------------------------
interface ItemPdf {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface GradePdf {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  celulas?: string[][];
  caixa?: string;
  /** Uma coluna com várias faixas (ex.: fluxo em etapas) — vira lista numerada. */
  etapas?: string[];
}
function agrupar(valores: number[], tolerancia: number): number[] {
  const ord = [...valores].sort((a, b) => a - b);
  const grupos: number[][] = [];
  for (const v of ord) {
    const g = grupos[grupos.length - 1];
    if (g && v - g[g.length - 1] <= tolerancia) g.push(v);
    else grupos.push([v]);
  }
  return grupos.map((g) => g.reduce((s, v) => s + v, 0) / g.length);
}
function textoDosItens(itens: ItemPdf[]): string {
  const ord = [...itens].sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: ItemPdf[][] = [];
  for (const it of ord) {
    const l = linhas.find((x) => Math.abs(x[0].y - it.y) < Math.max(2, it.h * 0.35));
    if (l) l.push(it);
    else linhas.push([it]);
  }
  return limpar(
    linhas
      .map((l) => l.sort((a, b) => a.x - b.x).map((i) => i.str).join(' '))
      .join(' ')
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/(\p{L})- (\p{Ll})/gu, '$1$2')
  );
}
async function gradesDaPagina(pagina: any, pdfjs: any, itens: ItemPdf[]): Promise<GradePdf[]> {
  const { OPS } = pdfjs;
  const [, , largura, altura] = pagina.view;
  const ops = await pagina.getOperatorList();
  type Caixa = { x1: number; y1: number; x2: number; y2: number };
  const desenhos: Caixa[] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const pilha: number[][] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === OPS.save) pilha.push(ctm);
    else if (fn === OPS.restore) ctm = pilha.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = multiplicar(ctm, args);
    else if (fn === OPS.constructPath && args?.[0] !== OPS.endPath && args?.[2]) {
      const m = args[2];
      const cantos = [[m[0], m[1]], [m[2], m[1]], [m[0], m[3]], [m[2], m[3]]].map((c) => aplicar(c, ctm));
      const xs = cantos.map((c) => c[0]);
      const ys = cantos.map((c) => c[1]);
      const c = { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
      // Fundo da página inteira não conta.
      if (c.x2 - c.x1 > largura * 0.95 && c.y2 - c.y1 > altura * 0.5) continue;
      desenhos.push(c);
    }
  }
  if (!desenhos.length) return [];
  // Regiões: desenhos que se encostam (tolerância de 2pt).
  const pai = desenhos.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const ordem = desenhos.map((_, i) => i).sort((a, b) => desenhos[a].x1 - desenhos[b].x1);
  for (let a = 0; a < ordem.length; a++) {
    const A = desenhos[ordem[a]];
    for (let b = a + 1; b < ordem.length; b++) {
      const B = desenhos[ordem[b]];
      if (B.x1 > A.x2 + 2) break;
      if (B.y1 <= A.y2 + 2 && B.y2 >= A.y1 - 2) pai[raiz(ordem[a])] = raiz(ordem[b]);
    }
  }
  const regioes = new Map<number, Caixa[]>();
  desenhos.forEach((d, i) => regioes.set(raiz(i), [...(regioes.get(raiz(i)) || []), d]));

  const grades: GradePdf[] = [];
  for (const partes of regioes.values()) {
    const r = { x1: Math.min(...partes.map((p) => p.x1)), y1: Math.min(...partes.map((p) => p.y1)), x2: Math.max(...partes.map((p) => p.x2)), y2: Math.max(...partes.map((p) => p.y2)) };
    if (r.x2 - r.x1 < 60 || r.y2 - r.y1 < 12) continue;
    const centro = (it: ItemPdf) => [it.x + it.w / 2, it.y + it.h / 3];
    const dentro = itens.filter((it) => {
      const [cx, cy] = centro(it);
      return cx > r.x1 && cx < r.x2 && cy > r.y1 && cy < r.y2;
    });
    if (!dentro.length) continue;
    // Separadores: linhas finas; sem elas, as bordas das caixas mais externas (as internas são enchimento).
    const verticais = partes.filter((p) => p.x2 - p.x1 < 2 && p.y2 - p.y1 > 3).map((p) => (p.x1 + p.x2) / 2);
    const horizontais = partes.filter((p) => p.y2 - p.y1 < 2 && p.x2 - p.x1 > 8).map((p) => (p.y1 + p.y2) / 2);
    const caixas = partes.filter((p) => p.x2 - p.x1 >= 8 && p.y2 - p.y1 >= 8);
    const area = (c: Caixa) => (c.x2 - c.x1) * (c.y2 - c.y1);
    const externas = caixas.filter((c) => !caixas.some((o) => o !== c && o.x1 <= c.x1 + 0.5 && o.y1 <= c.y1 + 0.5 && o.x2 >= c.x2 - 0.5 && o.y2 >= c.y2 - 0.5 && area(o) > area(c) + 1));
    let xs = agrupar([r.x1, r.x2, ...verticais], 2.5);
    if (xs.length < 3) xs = agrupar([r.x1, r.x2, ...externas.flatMap((c) => [c.x1, c.x2])], 2.5);
    let ys = agrupar([r.y1, r.y2, ...horizontais], 2.5);
    if (ys.length < 3) ys = agrupar([r.y1, r.y2, ...externas.flatMap((c) => [c.y1, c.y2])], 2.5);
    const colunas = xs.slice(1).map((x, i) => [xs[i], x]).filter(([a, b]) => b - a > 8);
    const faixas = ys.slice(1).map((y, i) => [y, ys[i]]).filter(([topo, base]) => topo - base > 6).reverse(); // de cima para baixo
    const matriz = faixas.map(([topo, base]) =>
      colunas.map(([esq, dir]) =>
        textoDosItens(
          dentro.filter((it) => {
            const [cx, cy] = centro(it);
            return cx >= esq && cx < dir && cy <= topo && cy > base;
          })
        )
      )
    );
    const usadas = colunas.map((_, c) => matriz.some((l) => l[c]));
    const celulas = matriz.map((l) => l.filter((_, c) => usadas[c])).filter((l) => l.some(Boolean));
    if (!celulas.length) continue;
    if (celulas[0].length < 2 && celulas.length > 1) grades.push({ ...r, etapas: celulas.map((l) => l.join(' ')) });
    else if (celulas[0].length < 2) grades.push({ ...r, caixa: textoDosItens(dentro) });
    else grades.push({ ...r, celulas });
  }
  return grades;
}

// ---------------------------------------------------------------------------
/** Acabamento comum: tira a numeração manual dos títulos ("1. OBJETIVO" → "OBJETIVO" — o
 *  padrão JMT numera as seções sozinho) e descarta blocos vazios. */
function finalizar(r: DocumentoImportado): DocumentoImportado {
  const blocos = extrairChecklists(
    r.blocos.map((b) =>
      b.tipo === 'titulo'
        ? { ...b, texto: b.texto.replace(/^\d+(?:\.\d+)*[.)]\s+(?=\p{L})/u, '').trim() }
        : b.tipo === 'tabela'
          ? tabelaDeAssinaturas(b) || tabelaDeChecklist(b) || b
          : b
    )
  ).filter((b) => (b.tipo === 'lista' || b.tipo === 'checklist' ? b.itens.length > 0 : 'texto' in b ? b.texto.trim().length > 0 : true));
  const checklists = blocos.filter((b) => b.tipo === 'checklist').length;
  return { ...r, blocos, avisos: checklists ? [...r.avisos, `${checklists} checklist(s) reconhecido(s) — confira os itens no editor.`] : r.avisos };
}

// ---------------------------------------------------------------------------
// Checklists: linhas que começam com caixinha (☐ □ ☑ ☒ [ ] [x] ( ) (x), inclusive os
// símbolos do Wingdings que o PDF/Word trazem) e tabelas de verificação (Item | Sim | Não…).
// ---------------------------------------------------------------------------
const CAIXA = '\\[\\s?[xX✓✔]?\\s?\\]|\\(\\s?[xX✓✔]?\\s?\\)|[☐□❑▢◻⬜☑☒✅\\uF0A8\\uF06F\\uF071\\uF0A1\\uF0FE]';
const RE_INICIO_CAIXA = new RegExp(`^\\s*(?:${CAIXA})`);
const RE_CAIXAS = new RegExp(`(?:^|\\s)(${CAIXA})\\s*`, 'g');
const caixaMarcada = (c: string) => /[xX✓✔☑☒✅\uF0FE]/.test(c);

/** "☐ Item 1 ☐ Item 2" → itens. Só quando o texto COMEÇA com caixinha. */
function itensDeCaixas(texto: string): ItemChecklist[] | null {
  if (!RE_INICIO_CAIXA.test(texto)) return null;
  const partes: ItemChecklist[] = [];
  const marcas = Array.from(texto.matchAll(RE_CAIXAS));
  marcas.forEach((m, i) => {
    const inicio = (m.index ?? 0) + m[0].length;
    const fim = i + 1 < marcas.length ? marcas[i + 1].index ?? texto.length : texto.length;
    const t = limpar(texto.slice(inicio, fim));
    if (t) partes.push({ texto: t, marcado: caixaMarcada(m[1]) || undefined });
  });
  return partes.length ? partes : null;
}

function extrairChecklists(blocos: BlocoDocumento[]): BlocoDocumento[] {
  const saida: BlocoDocumento[] = [];
  for (const b of blocos) {
    const itens =
      b.tipo === 'paragrafo' || b.tipo === 'destaque'
        ? itensDeCaixas(b.texto)
        : b.tipo === 'lista' && b.itens.every((i) => RE_INICIO_CAIXA.test(i))
          ? b.itens.flatMap((i) => itensDeCaixas(i) || [])
          : null;
    if (!itens) {
      saida.push(b);
      continue;
    }
    const anterior = saida[saida.length - 1];
    if (anterior?.tipo === 'checklist' && !anterior.opcoes) anterior.itens.push(...itens);
    else saida.push({ id: novoIdBloco(), tipo: 'checklist', itens });
  }
  return saida;
}

const COLUNA_VERIFICACAO = /^(sim|n[ãa]o|n\/?a|ok|c|nc|conforme|n[ãa]o conforme|feito|realizado|verificado|check|✓|✔|x|s|n|bom|regular|ruim|atende|n[ãa]o atende)$/i;
const COLUNA_OBS = /^(obs|observa[çc][ãa]o|observa[çc][õo]es|coment[áa]rio|coment[áa]rios)/i;
const CELULA_DE_MARCA = /^(|x|✓|✔|☑|☒|☐|□|sim|n[ãa]o|ok)$/i;

/** Tabela "Item | Sim | Não | N/A | Observação" (ou "Item | OK") vira checklist. */
function tabelaDeChecklist(b: Extract<BlocoDocumento, { tipo: 'tabela' }>): BlocoDocumento | null {
  const cab = b.cabecalho.map((c) => limpar(c));
  if (cab.length < 2 || !b.linhas.length) return null;
  const colsMarca = cab.map((c, i) => (i > 0 && COLUNA_VERIFICACAO.test(c) ? i : -1)).filter((i) => i > 0);
  const colObs = cab.findIndex((c, i) => i > 0 && COLUNA_OBS.test(c));
  if (!colsMarca.length) return null;
  // Toda coluna além do item tem que ser de marcação ou a de observação.
  if (cab.some((_, i) => i > 0 && !colsMarca.includes(i) && i !== colObs)) return null;
  if (!b.linhas.every((l) => colsMarca.every((i) => CELULA_DE_MARCA.test(limpar(l[i] || ''))))) return null;
  const marcada = (v: string) => !!limpar(v) && !/^[☐□]$/.test(limpar(v));
  const itens: ItemChecklist[] = b.linhas
    .filter((l) => limpar(l[0] || ''))
    .map((l) => {
      const resposta = colsMarca.length > 1 ? cab[colsMarca.find((i) => marcada(l[i] || '')) ?? -1] : undefined;
      return {
        texto: limpar(l[0]),
        marcado: colsMarca.length === 1 ? marcada(l[colsMarca[0]] || '') || undefined : undefined,
        resposta: resposta || undefined,
        obs: colObs > 0 ? limpar(l[colObs] || '') || undefined : undefined,
      };
    });
  if (!itens.length) return null;
  return {
    id: b.id,
    tipo: 'checklist',
    titulo: cab[0] && !/^(item|itens|descri[çc][ãa]o|verifica[çc][ãa]o|atividade)$/i.test(cab[0]) ? cab[0] : undefined,
    itens,
    opcoes: colsMarca.length > 1 ? colsMarca.map((i) => cab[i]) : undefined,
    comObservacao: colObs > 0 || undefined,
  };
}

/** Tabela que é, na verdade, o quadro de assinaturas ("Elaborado | Revisado | Aprovado" com
 *  "Nome: … Assinatura: … Data: …" embaixo) vira o bloco de assinaturas. */
function tabelaDeAssinaturas(b: Extract<BlocoDocumento, { tipo: 'tabela' }>): BlocoDocumento | null {
  const n = b.cabecalho.length;
  if (n < 1 || n > 6 || b.linhas.length > 4) return null;
  const corpo = b.linhas.map((l) => l.join(' ')).join(' ');
  if (!/assinatura/i.test(corpo) && !/assinatura/i.test(b.cabecalho.join(' '))) return null;
  const pegar = (t: string, rotulo: string) =>
    limpar(t.match(new RegExp(`${rotulo}\\s*:\\s*(.*?)(?=\\s*\\b(?:Nome|Cargo|Função|Assinatura|Data)\\s*:|$)`, 'i'))?.[1] || '').replace(/^[:\s]+/, '').replace(/^[_\s/.-]+$/, '');
  const pessoas = b.cabecalho.map((papel, i) => {
    const texto = b.linhas.map((l) => l[i] || '').join(' ');
    return { papel: limpar(papel), nome: pegar(texto, 'Nome'), cargo: pegar(texto, '(?:Cargo|Função)') || undefined, data: pegar(texto, 'Data') || undefined };
  });
  if (!pessoas.some((p) => p.papel || p.nome)) return null;
  return { id: b.id, tipo: 'assinaturas', comData: /data/i.test(corpo), pessoas };
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
