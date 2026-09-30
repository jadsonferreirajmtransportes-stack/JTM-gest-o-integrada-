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

export interface ItemTextoPdf {
  str: string;
  /** Posição em pontos, origem no canto inferior esquerdo da página (padrão do PDF). */
  x: number;
  y: number;
  /** Largura do trecho em pontos. */
  w: number;
}

export interface PaginaComPosicao {
  texto: string;
  itens: ItemTextoPdf[];
  altura: number;
}

/** Área (em pontos do PDF) onde a assinatura do colaborador deve ser desenhada. */
export interface CampoAssinatura {
  /** Página do PDF FINAL do documento (0 = primeira). */
  pagina: number;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

// "Empregado", "Assinatura do Empregado", "Funcionário", "Assinatura do Colaborador"... — o
// rótulo que fica EMBAIXO da linha onde o colaborador assina. "Empregador" e "Responsável"
// (menor de idade) ficam de fora de propósito.
const REGEX_ROTULO_ASSINATURA = /^(ASSINATURA D[OA] )?(EMPREGAD[OA]|FUNCIONARI[OA]|COLABORADOR(A)?)$/;

/** Acha as linhas "______" de assinatura do empregado numa página: uma linha de sublinhados
 *  com o rótulo do empregado logo abaixo (até ~25pt) e centralizado nela. O "Empregado :" do
 *  cabeçalho não tem linha em cima, então não conta. Devolve a área logo acima da linha. */
export function acharCamposAssinatura(itens: ItemTextoPdf[]): Omit<CampoAssinatura, 'pagina'>[] {
  const linhas = itens.filter((it) => /_{8,}/.test(it.str) && it.w > 60);
  const rotulos = itens.filter((it) => REGEX_ROTULO_ASSINATURA.test(normalizarTexto(it.str)));
  const campos: Omit<CampoAssinatura, 'pagina'>[] = [];
  rotulos.forEach((r) => {
    const centro = r.x + r.w / 2;
    const linha = linhas
      .filter((l) => l.y > r.y && l.y - r.y <= 25 && centro >= l.x && centro <= l.x + l.w)
      .sort((a, b) => a.y - b.y)[0];
    if (!linha) return;
    if (campos.some((c) => Math.abs(c.x - linha.x) < 1 && Math.abs(c.y - (linha.y + 1)) < 1)) return;
    // Altura limitada pelo texto logo acima da linha (na mesma faixa horizontal) — sem isso a
    // assinatura cobria o parágrafo de cima (caso do Recibo de Férias, com a linha colada no
    // texto). Espaço apertado demais: fica pequena e encosta de leve, como assinatura à mão.
    const textoAcima = itens
      .filter((it) => it.y > linha.y + 1 && it.str.trim() && !/_{8,}/.test(it.str) && it.x < linha.x + linha.w && it.x + it.w > linha.x)
      .sort((a, b) => a.y - b.y)[0];
    const espacoLivre = textoAcima ? textoAcima.y - linha.y - 4 : 40;
    const altura = Math.max(16, Math.min(34, espacoLivre));
    campos.push({ x: linha.x, y: linha.y + 1, largura: linha.w, altura });
  });
  return campos;
}

/** Texto de cada página com a posição vertical de cada trecho — usado pra achar quantos
 *  contracheques há numa página (a folha pode imprimir 2 por página) e onde fica cada um. */
export async function extrairPaginasComPosicao(arquivo: File): Promise<PaginaComPosicao[]> {
  const pdfjs = await carregarPdfJs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const paginas: PaginaComPosicao[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const [, y0, , y1] = pagina.view;
    const conteudo = await pagina.getTextContent();
    const [x0] = pagina.view;
    const itens = conteudo.items
      .filter((item): item is typeof item & { str: string; transform: number[]; width: number } => 'str' in item)
      .map((item) => ({ str: item.str, x: item.transform[4] - x0, y: item.transform[5] - y0, w: item.width }));
    paginas.push({ texto: itens.map((it) => it.str).join(' '), itens, altura: y1 - y0 });
  }
  await pdf.destroy();
  return paginas;
}

/** Texto de cada página do PDF, na ordem. */
export async function extrairTextoDasPaginas(arquivo: File): Promise<string[]> {
  return (await extrairPaginasComPosicao(arquivo)).map((p) => p.texto);
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

// ---------------------------------------------------------------------------
// Folha com MAIS DE UM contracheque por página (caso real: 2 por página, um em
// cima e outro embaixo). Cada contracheque vira uma "parte" da página: a página
// é dividida em faixas horizontais iguais, uma por CPF encontrado.
// ---------------------------------------------------------------------------

export interface ParteIdentificada {
  indice: number;
  /** 0 = faixa de cima. */
  parte: number;
  totalPartes: number;
  colaboradorId?: string;
  motivo?: 'cpf' | 'nome' | 'manual';
  trecho: string;
  /** Preenchido quando a página tem mais de um contracheque mas não deu pra separar com
   *  segurança — nesse caso a página NÃO é atribuída sozinha a ninguém. */
  problema?: string;
}

const REGEX_CPF = /(?<![\d./-])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\d./-])/g;

export function chaveParte(p: { indice: number; parte: number }): string {
  return `${p.indice}:${p.parte}`;
}

/** Quantos contracheques há em cada página (= quantos CPFs diferentes aparecem nela) e de quem
 *  é cada faixa. Se os CPFs não caírem um em cada faixa igual da página, não arrisca separar:
 *  marca a página com `problema` pra revisão manual — atribuir uma página com 2 pessoas a uma
 *  só mandaria o salário de um colaborador pro outro. */
export function identificarPartes(paginas: PaginaComPosicao[], colaboradores: Colaborador[]): ParteIdentificada[] {
  const porCpf = new Map<string, Colaborador>();
  colaboradores.forEach((c) => {
    const d = soDigitos(c.cpf);
    if (d.length === 11) porCpf.set(d, c);
  });
  const porNome = colaboradores
    .map((c) => ({ c, nome: normalizarTexto(c.nomeCompleto) }))
    .filter((x) => x.nome.split(' ').length >= 2)
    .sort((a, b) => b.nome.length - a.nome.length);
  const acharPorNome = (texto: string) => {
    const t = ` ${normalizarTexto(texto)} `;
    return porNome.find((x) => t.includes(` ${x.nome} `))?.c;
  };

  const resultado: ParteIdentificada[] = [];
  paginas.forEach((pagina, indice) => {
    // CPF de cada trecho de texto, com a altura — o mesmo CPF repetido conta uma vez só (fica
    // a posição mais alta, que é o cabeçalho do contracheque).
    const cpfs = new Map<string, number>();
    pagina.itens.forEach((it) => {
      (it.str.match(REGEX_CPF) || []).forEach((cpf) => {
        const d = soDigitos(cpf);
        cpfs.set(d, Math.max(cpfs.get(d) ?? -Infinity, it.y));
      });
    });
    const blocos = Array.from(cpfs.entries())
      .map(([digitos, y]) => ({ digitos, y }))
      .sort((a, b) => b.y - a.y);

    if (blocos.length <= 1) {
      const trecho = pagina.texto.replace(/\s+/g, ' ').trim().slice(0, 160);
      const porCpfUnico = blocos[0] ? porCpf.get(blocos[0].digitos) : undefined;
      const colaborador = porCpfUnico || acharPorNome(pagina.texto);
      resultado.push({
        indice,
        parte: 0,
        totalPartes: 1,
        colaboradorId: colaborador?.id,
        motivo: colaborador ? (porCpfUnico ? 'cpf' : 'nome') : undefined,
        trecho,
      });
      return;
    }

    const total = blocos.length;
    const faixa = pagina.altura / total;
    const cadaUmNaSuaFaixa = blocos.every((b, k) => b.y <= pagina.altura - k * faixa && b.y > pagina.altura - (k + 1) * faixa);
    if (!cadaUmNaSuaFaixa) {
      resultado.push({
        indice,
        parte: 0,
        totalPartes: 1,
        trecho: pagina.texto.replace(/\s+/g, ' ').trim().slice(0, 160),
        problema: `Página com ${total} contracheques que não foi possível separar automaticamente`,
      });
      return;
    }

    blocos.forEach((b, k) => {
      const topo = pagina.altura - k * faixa;
      const base = topo - faixa;
      const textoFaixa = pagina.itens
        .filter((it) => it.y <= topo && it.y > base)
        .map((it) => it.str)
        .join(' ');
      const porCpfDaFaixa = porCpf.get(b.digitos);
      const colaborador = porCpfDaFaixa || acharPorNome(textoFaixa);
      resultado.push({
        indice,
        parte: k,
        totalPartes: total,
        colaboradorId: colaborador?.id,
        motivo: colaborador ? (porCpfDaFaixa ? 'cpf' : 'nome') : undefined,
        trecho: textoFaixa.replace(/\s+/g, ' ').trim().slice(0, 160),
      });
    });
  });
  return resultado;
}

/** Campos de assinatura do PDF que `montar(partes)` gera: mesma ordem de páginas, e em faixa de
 *  página (2+ contracheques por página) a posição é trazida pra dentro da faixa — a página nova
 *  tem só a altura da faixa. */
export function camposDasPartes(
  paginas: PaginaComPosicao[],
  partes: { indice: number; parte: number; totalPartes: number }[]
): CampoAssinatura[] {
  const campos: CampoAssinatura[] = [];
  partes.forEach((p, paginaFinal) => {
    const pagina = paginas[p.indice];
    if (!pagina) return;
    if (p.totalPartes <= 1) {
      acharCamposAssinatura(pagina.itens).forEach((c) => campos.push({ ...c, pagina: paginaFinal }));
      return;
    }
    const faixa = pagina.altura / p.totalPartes;
    const topo = pagina.altura - p.parte * faixa;
    const base = topo - faixa;
    const itensDaFaixa = pagina.itens.filter((it) => it.y <= topo && it.y > base).map((it) => ({ ...it, y: it.y - base }));
    acharCamposAssinatura(itensDaFaixa).forEach((c) =>
      campos.push({ ...c, pagina: paginaFinal, altura: Math.max(10, Math.min(c.altura, faixa - c.y - 2)) })
    );
  });
  return campos;
}

/** Monta o PDF de cada colaborador a partir das partes dele. Página inteira é copiada como está
 *  (texto continua selecionável); FAIXA de página (quando há 2+ contracheques na mesma página) é
 *  desenhada como imagem — recortar só a área visível deixaria o texto do outro colaborador
 *  escondido dentro do arquivo, dava pra copiar. Reaproveita o PDF aberto e as páginas já
 *  desenhadas entre um colaborador e outro (`fechar()` no fim). */
export async function criarSeparadorDePdf(arquivo: File) {
  const { PDFDocument } = await import('pdf-lib');
  const pdfjs = await carregarPdfJs();
  const bytesOriginais = await arquivo.arrayBuffer();
  const original = await PDFDocument.load(bytesOriginais);
  const pdfRender = await pdfjs.getDocument({ data: new Uint8Array(bytesOriginais.slice(0)) }).promise;
  const ESCALA = 2.5; // ~180 dpi — legível no celular e na impressão
  const canvasPorPagina = new Map<number, { canvas: HTMLCanvasElement; larguraPt: number; alturaPt: number }>();

  const desenharPagina = async (indice: number) => {
    const pronto = canvasPorPagina.get(indice);
    if (pronto) return pronto;
    const pagina = await pdfRender.getPage(indice + 1);
    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: ESCALA });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // intent 'print': no modo padrão ('display') o pdf.js desenha em etapas via
    // requestAnimationFrame, que o navegador PAUSA quando a aba não está visível — trocar de aba
    // no meio da importação deixava a separação parada.
    await pagina.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise;
    const item = { canvas, larguraPt: base.width, alturaPt: base.height };
    canvasPorPagina.set(indice, item);
    return item;
  };

  return {
    async montar(partes: { indice: number; parte: number; totalPartes: number }[], nomeArquivo: string): Promise<File> {
      const novo = await PDFDocument.create();
      for (const p of partes) {
        if (p.totalPartes <= 1) {
          const [copiada] = await novo.copyPages(original, [p.indice]);
          novo.addPage(copiada);
          continue;
        }
        const { canvas, larguraPt, alturaPt } = await desenharPagina(p.indice);
        const alturaFaixaPx = canvas.height / p.totalPartes;
        const recorte = document.createElement('canvas');
        recorte.width = canvas.width;
        recorte.height = Math.round(alturaFaixaPx);
        recorte
          .getContext('2d')!
          .drawImage(canvas, 0, Math.round(p.parte * alturaFaixaPx), canvas.width, recorte.height, 0, 0, canvas.width, recorte.height);
        const png = await new Promise<Blob>((resolve, reject) =>
          recorte.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem da página'))), 'image/png')
        );
        const imagem = await novo.embedPng(await png.arrayBuffer());
        const alturaFaixaPt = alturaPt / p.totalPartes;
        const pagina = novo.addPage([larguraPt, alturaFaixaPt]);
        pagina.drawImage(imagem, { x: 0, y: 0, width: larguraPt, height: alturaFaixaPt });
      }
      const bytes = await novo.save();
      return new File([bytes], nomeArquivo, { type: 'application/pdf' });
    },
    async fechar() {
      canvasPorPagina.clear();
      await pdfRender.destroy();
    },
  };
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
