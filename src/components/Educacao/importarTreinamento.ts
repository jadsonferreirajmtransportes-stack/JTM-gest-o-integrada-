// ============================================================================
// Documento (PDF/Word) ou texto colado → rascunho de treinamento, para revisar no
// editor antes de salvar. Mesmo formato dos "Treinamentos do sistema":
//   - cada título do documento (nível 1/2) vira um conteúdo do tipo texto;
//   - listas e tabelas viram texto organizado (• item / "Coluna: valor");
//   - imagens do Word entram como "Passo a passo com imagens" logo depois do
//     texto da parte em que aparecem (enviadas ao bucket público "treinamentos");
//   - PDF: opcionalmente o próprio arquivo entra como Material (PDF), para o
//     colaborador ver o visual original.
// Sem prova: perguntas são acrescentadas no editor, se quiser.
// ============================================================================

import type { BlocoDocumento } from '../../utils/documentosPadronizadosApi';
import { ConteudoTreinamento, TelaIlustrada, Treinamento, enviarMaterialTreinamento, gerarIdCurto } from '../../utils/educacaoApi';
import { importarArquivo } from '../Documentos/importarDocumento';
import { dataUrlParaBlob } from '../../utils/downloadUtils';

interface Parte {
  titulo: string;
  linhas: string[];
  imagens: { dataUrl: string; legenda: string }[];
}

export interface ResultadoImportacao {
  treinamento: Treinamento;
  avisos: string[];
}

const LIMITE_PARTE = 3500; // caracteres por conteúdo de texto

function blocoParaLinhas(b: BlocoDocumento): string[] {
  if (b.tipo === 'paragrafo') return [b.texto];
  if (b.tipo === 'destaque') return [`Atenção: ${b.texto}`];
  if (b.tipo === 'titulo') return [b.texto.toUpperCase()];
  if (b.tipo === 'lista') return [b.itens.map((i, k) => (b.ordenada ? `${k + 1}. ${i}` : `• ${i}`)).join('\n')];
  if (b.tipo === 'tabela') {
    const linhas = b.linhas.map((l) =>
      l
        .map((v, i) => (b.cabecalho[i]?.trim() ? `${b.cabecalho[i]}: ${v}` : v))
        .filter((x) => x.replace(/^[^:]*:\s*/, '').trim())
        .join(' · ')
    );
    return [linhas.map((l) => `• ${l}`).join('\n')];
  }
  return [];
}

/** Agrupa os blocos em partes pelos títulos de nível 1 e 2 (nível 3 fica no texto, em maiúsculas). */
function agruparEmPartes(blocos: BlocoDocumento[], imagensPorBloco: Map<number, { dataUrl: string; legenda: string }[]> = new Map()): Parte[] {
  const partes: Parte[] = [];
  let atual: Parte = { titulo: 'Introdução', linhas: [], imagens: [] };
  blocos.forEach((b, i) => {
    if (b.tipo === 'titulo' && b.nivel <= 2) {
      if (atual.linhas.length || atual.imagens.length) partes.push(atual);
      atual = { titulo: b.texto, linhas: [], imagens: [] };
    } else {
      atual.linhas.push(...blocoParaLinhas(b));
    }
    atual.imagens.push(...(imagensPorBloco.get(i) || []));
  });
  if (atual.linhas.length || atual.imagens.length) partes.push(atual);
  // Partes longas demais são divididas (leitura no celular).
  return partes.flatMap((p) => {
    const texto = p.linhas.join('\n\n');
    if (texto.length <= LIMITE_PARTE) return [p];
    const pedacos: string[][] = [[]];
    let tamanho = 0;
    p.linhas.forEach((l) => {
      if (tamanho + l.length > LIMITE_PARTE && pedacos[pedacos.length - 1].length) {
        pedacos.push([]);
        tamanho = 0;
      }
      pedacos[pedacos.length - 1].push(l);
      tamanho += l.length;
    });
    return pedacos.map((linhas, k) => ({ titulo: `${p.titulo} (${k + 1}/${pedacos.length})`, linhas, imagens: k === pedacos.length - 1 ? p.imagens : [] }));
  });
}

/** Texto colado → blocos. Reconhece "# Título", linhas curtas em maiúsculas ou terminadas em
 *  ":" como títulos, e "-", "•", "*", "1." como listas. */
export function textoParaBlocos(texto: string): BlocoDocumento[] {
  const blocos: BlocoDocumento[] = [];
  let paragrafo: string[] = [];
  const fechar = () => {
    if (paragrafo.length) blocos.push({ id: gerarIdCurto('b'), tipo: 'paragrafo', texto: paragrafo.join(' ').replace(/\s+/g, ' ').trim() });
    paragrafo = [];
  };
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    const l = bruta.trim();
    if (!l) {
      fechar();
      continue;
    }
    const md = l.match(/^(#{1,3})\s+(.+)$/);
    const lista = l.match(/^(?:[-•*–]|(\d{1,2})[.)])\s+(.+)$/);
    const caixaAlta = l.length <= 80 && l === l.toUpperCase() && /\p{Lu}{3}/u.test(l);
    const doisPontos = l.length <= 70 && /:$/.test(l) && !/[.;]/.test(l.slice(0, -1));
    if (md) {
      fechar();
      blocos.push({ id: gerarIdCurto('b'), tipo: 'titulo', nivel: Math.min(md[1].length, 3) as 1 | 2 | 3, texto: md[2].trim() });
    } else if (lista) {
      fechar();
      const ordenada = !!lista[1];
      const ultimo = blocos[blocos.length - 1];
      if (ultimo?.tipo === 'lista' && ultimo.ordenada === ordenada) ultimo.itens.push(lista[2].trim());
      else blocos.push({ id: gerarIdCurto('b'), tipo: 'lista', ordenada, itens: [lista[2].trim()] });
    } else if (caixaAlta || doisPontos) {
      fechar();
      blocos.push({ id: gerarIdCurto('b'), tipo: 'titulo', nivel: 2, texto: l.replace(/:$/, '') });
    } else {
      paragrafo.push(l);
    }
  }
  fechar();
  return blocos;
}

/** Word com imagens: lê pelo mammoth guardando a posição de cada imagem em relação aos blocos. */
async function lerDocxComImagens(arquivo: File): Promise<{ blocos: BlocoDocumento[]; imagens: Map<number, { dataUrl: string; legenda: string }[]> }> {
  const base = await importarArquivo(arquivo); // blocos já limpos (títulos, listas, tabelas)
  const mammoth = await import('mammoth');
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await arquivo.arrayBuffer() });
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const imagens = new Map<number, { dataUrl: string; legenda: string }[]>();
  // Para cada imagem, acha o bloco cujo texto vem logo antes dela no documento.
  const textos = base.blocos.map((b) => (b.tipo === 'lista' ? b.itens.join(' ') : b.tipo === 'tabela' ? b.cabecalho.join(' ') : b.texto).slice(0, 40).trim());
  let indiceAtual = -1;
  Array.from(doc.body.children).forEach((el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (t) {
      const achado = textos.findIndex((x, i) => i > indiceAtual && x && (t.startsWith(x.slice(0, 25)) || x.startsWith(t.slice(0, 25))));
      if (achado >= 0) indiceAtual = achado;
    }
    el.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (!src.startsWith('data:image')) return;
      const lista = imagens.get(Math.max(0, indiceAtual)) || [];
      lista.push({ dataUrl: src, legenda: (img.getAttribute('alt') || '').trim() });
      imagens.set(Math.max(0, indiceAtual), lista);
    });
  });
  return { blocos: base.blocos, imagens };
}

/** Figuras de um PDF: acha cada imagem desenhada nas páginas (pelo operador de desenho do
 *  pdf.js e a matriz de transformação em vigor), recorta da página renderizada e diz depois de
 *  qual bloco de texto ela aparece (pela posição na página). Logos/cabeçalhos repetidos na
 *  maioria das páginas e imagens pequenas (ícones) ficam de fora. */
async function extrairImagensPdf(
  arquivo: File,
  blocos: BlocoDocumento[],
  aoProgredir?: (msg: string) => void
): Promise<{ imagens: Map<number, { dataUrl: string; legenda: string }[]>; total: number }> {
  const { carregarPdfJs } = await import('../Contracheques/contrachequePdfUtils');
  const pdfjs: any = await carregarPdfJs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const { OPS } = pdfjs;
  // Matrizes 2D do PDF [a, b, c, d, e, f] (contas próprias — o Util do pdf.js mudou entre versões).
  const multiplicar = (m1: number[], m2: number[]) => [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
  const aplicar = (p: number[], m: number[]) => [p[0] * m[0] + p[1] * m[2] + m[4], p[0] * m[1] + p[1] * m[3] + m[5]];
  const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();

  // 1) Caixas das imagens em cada página (coordenadas do PDF).
  type Caixa = { pagina: number; x1: number; y1: number; x2: number; y2: number };
  const caixas: Caixa[] = [];
  const linhasPorPagina: { pagina: number; y: number; texto: string }[] = [];
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
        const cantos = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map((c) => aplicar(c, ctm));
        const xs = cantos.map((c: number[]) => c[0]);
        const ys = cantos.map((c: number[]) => c[1]);
        const caixa = { pagina: p, x1: Math.max(0, Math.min(...xs)), y1: Math.max(0, Math.min(...ys)), x2: Math.min(largura, Math.max(...xs)), y2: Math.min(altura, Math.max(...ys)) };
        const w = caixa.x2 - caixa.x1;
        const h = caixa.y2 - caixa.y1;
        // Ícones e enfeites pequenos ficam de fora (menos de ~4% da página ou 60pt de lado).
        if (w >= 60 && h >= 40 && w * h >= largura * altura * 0.04) caixas.push(caixa);
      }
    }
    const conteudo = await pagina.getTextContent();
    (conteudo.items as any[]).forEach((it) => {
      if (typeof it.str === 'string' && it.str.trim()) linhasPorPagina.push({ pagina: p, y: it.transform[5], texto: it.str });
    });
  }

  // 2) Tira as que se repetem na maioria das páginas (logo do cabeçalho, marca d'água).
  const chave = (c: Caixa) => `${Math.round(c.x1 / 10)}-${Math.round(c.y1 / 10)}-${Math.round((c.x2 - c.x1) / 10)}-${Math.round((c.y2 - c.y1) / 10)}`;
  const contagem = new Map<string, Set<number>>();
  caixas.forEach((c) => contagem.set(chave(c), (contagem.get(chave(c)) || new Set()).add(c.pagina)));
  const figuras = caixas.filter((c) => pdf.numPages < 3 || (contagem.get(chave(c))?.size || 0) <= pdf.numPages / 2);

  // 3) Onde cada bloco de texto começa (página e altura), pra encaixar a figura depois dele.
  const posicoes = blocos.map(() => ({ pagina: 0, y: 0 }));
  let cursor = 0;
  blocos.forEach((b, i) => {
    const inicio = normalizar(b.tipo === 'lista' ? b.itens[0] || '' : b.tipo === 'tabela' ? b.cabecalho.join('') : b.texto).slice(0, 18);
    if (!inicio) return;
    for (let k = cursor; k < linhasPorPagina.length; k++) {
      const linha = normalizar(linhasPorPagina[k].texto);
      if (linha && (linha.includes(inicio.slice(0, Math.min(12, inicio.length))) || inicio.startsWith(linha.slice(0, 12)))) {
        posicoes[i] = { pagina: linhasPorPagina[k].pagina, y: linhasPorPagina[k].y };
        cursor = k;
        break;
      }
    }
  });

  // 4) Recorta cada figura da página renderizada.
  const imagens = new Map<number, { dataUrl: string; legenda: string }[]>();
  let feitas = 0;
  for (const p of Array.from(new Set(figuras.map((f) => f.pagina)))) {
    const pagina = await pdf.getPage(p);
    const viewport = pagina.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // intent 'print': desenha de uma vez, sem depender de requestAnimationFrame.
    await pagina.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise;
    for (const f of figuras.filter((x) => x.pagina === p)) {
      feitas += 1;
      aoProgredir?.(`Recortando figura ${feitas} de ${figuras.length}...`);
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
      // Depois do último bloco que começa antes da figura (página anterior, ou mais acima na mesma página).
      let indice = 0;
      posicoes.forEach((pos, i) => {
        if (pos.pagina && (pos.pagina < p || (pos.pagina === p && pos.y >= f.y2 - 2))) indice = i;
      });
      const lista = imagens.get(indice) || [];
      lista.push({ dataUrl: recorte.toDataURL('image/jpeg', 0.88), legenda: `Figura da página ${p}` });
      imagens.set(indice, lista);
    }
  }
  return { imagens, total: feitas };
}

function estimarMinutos(partes: Parte[]): number {
  const palavras = partes.reduce((s, p) => s + p.linhas.join(' ').split(/\s+/).length, 0);
  const imagens = partes.reduce((s, p) => s + p.imagens.length, 0);
  const min = Math.ceil(palavras / 150) + imagens; // ~150 palavras/min + 1 min por imagem
  return Math.max(5, Math.ceil(min / 5) * 5);
}

export async function documentoParaTreinamento(
  origem: { arquivo: File; anexarPdf: boolean } | { texto: string },
  opcoes: { titulo: string; criadoPor?: string; aoProgredir?: (msg: string) => void }
): Promise<ResultadoImportacao> {
  const avisos: string[] = [];
  let blocos: BlocoDocumento[];
  let imagens = new Map<number, { dataUrl: string; legenda: string }[]>();
  let pdfUrl: string | undefined;

  if ('texto' in origem) {
    blocos = textoParaBlocos(origem.texto);
  } else {
    const nome = origem.arquivo.name.toLowerCase();
    opcoes.aoProgredir?.('Lendo o arquivo...');
    if (nome.endsWith('.docx')) {
      const r = await lerDocxComImagens(origem.arquivo);
      blocos = r.blocos;
      imagens = r.imagens;
    } else if (nome.endsWith('.pdf')) {
      const r = await importarArquivo(origem.arquivo);
      blocos = r.blocos;
      avisos.push(...r.avisos.filter((a) => !/padrão JMT coloca|transforme em tabela/.test(a)));
      opcoes.aoProgredir?.('Procurando as figuras do PDF...');
      try {
        const figuras = await extrairImagensPdf(origem.arquivo, blocos, opcoes.aoProgredir);
        imagens = figuras.imagens;
        if (figuras.total === 0) avisos.push('Não encontrei figuras no PDF (só texto, ou imagens muito pequenas / repetidas em todas as páginas, como o logo).');
      } catch (err) {
        console.error(err);
        avisos.push('Não foi possível tirar as figuras deste PDF — elas continuam visíveis no PDF original, se ele for incluído como material.');
      }
      avisos.push(origem.anexarPdf ? 'Em PDF, tabelas e colunas podem vir como texto corrido — confira no editor. O PDF original vai junto como material, com o visual original.' : 'Em PDF, tabelas e colunas podem vir como texto corrido — confira no editor.');
      if (origem.anexarPdf) {
        opcoes.aoProgredir?.('Enviando o PDF original...');
        pdfUrl = await enviarMaterialTreinamento(origem.arquivo);
      }
    } else {
      throw new Error('Use um arquivo PDF ou Word (.docx), ou cole o texto.');
    }
  }

  const partes = agruparEmPartes(blocos, imagens);
  if (partes.length === 0 && !pdfUrl) throw new Error('Não encontrei conteúdo para montar o treinamento.');

  // Envia as imagens do Word para o espaço público dos treinamentos.
  const totalImagens = partes.reduce((s, p) => s + p.imagens.length, 0);
  let enviadas = 0;
  const conteudos: ConteudoTreinamento[] = [];
  for (const p of partes) {
    if (p.linhas.length) conteudos.push({ id: gerarIdCurto('cont'), tipo: 'texto', titulo: p.titulo, texto: p.linhas.join('\n\n') });
    if (p.imagens.length) {
      const telas: TelaIlustrada[] = [];
      for (const [k, img] of p.imagens.entries()) {
        enviadas += 1;
        opcoes.aoProgredir?.(`Enviando imagem ${enviadas} de ${totalImagens}...`);
        try {
          const blob = dataUrlParaBlob(img.dataUrl);
          const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
          const url = await enviarMaterialTreinamento(new File([blob], `figura-${enviadas}.${ext}`, { type: blob.type }));
          telas.push({ titulo: img.legenda || `${p.titulo} — figura ${k + 1}`, imagem: url, marcas: [] });
        } catch (err) {
          console.error(err);
          avisos.push(`Uma imagem da parte "${p.titulo}" não pôde ser enviada.`);
        }
      }
      if (telas.length) conteudos.push({ id: gerarIdCurto('cont'), tipo: 'telas', titulo: `${p.titulo} — imagens`, telas });
    }
  }
  if (pdfUrl) conteudos.push({ id: gerarIdCurto('cont'), tipo: 'pdf', titulo: 'Material completo (PDF original)', url: pdfUrl });

  if (blocos.length && !blocos.some((b) => b.tipo === 'titulo')) avisos.push('O texto não tinha títulos — ficou numa parte só. Você pode dividir no editor.');

  return {
    treinamento: {
      id: '',
      titulo: opcoes.titulo.trim(),
      descricao: '',
      cargaHorariaMin: estimarMinutos(partes),
      conteudos,
      prova: { notaMinima: 70, perguntas: [] },
      obrigatorioTodos: false,
      obrigatorioCargos: [],
      obrigatorioSetores: [],
      validadeMeses: undefined,
      prazoDias: 15,
      ativo: true,
      criadoPor: opcoes.criadoPor,
    },
    avisos,
  };
}
