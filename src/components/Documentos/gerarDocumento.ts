// ============================================================================
// Saída do documento padronizado na identidade JMT — PDF (jsPDF + autotable),
// Word (docx) e Excel (exceljs). Mesmo conteúdo (blocos), mesma estrutura:
// cabeçalho com logo + código/versão, quadro de controle do documento
// (código, versão, data, responsável, aprovação, classificação), corpo e
// rodapé com dados da empresa e "Página X de Y".
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { BlocoDocumento, DocumentoPadronizado, SETORES_DOCUMENTO } from '../../utils/documentosPadronizadosApi';
import { obterUrlArquivo } from '../../utils/arquivosStorage';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';

interface ImagemCarregada {
  dataUrl: string; // sempre JPEG (fundo branco) — leve e aceito por PDF, Word e Excel
  w: number;
  h: number;
}

/** Baixa as imagens dos blocos (Storage privado) e converte para JPEG, com o tamanho natural. */
async function carregarImagens(d: DocumentoPadronizado): Promise<Map<string, ImagemCarregada>> {
  const mapa = new Map<string, ImagemCarregada>();
  const refs = [...new Set(d.blocos.filter((b) => b.tipo === 'imagem' && b.ref).map((b) => (b as { ref: string }).ref))];
  await Promise.all(
    refs.map(async (ref) => {
      try {
        const url = ref.startsWith('data:') ? ref : await obterUrlArquivo(ref);
        const blob = await (await fetch(url)).blob();
        const bitmap = await createImageBitmap(blob);
        const escala = Math.min(1, 1800 / bitmap.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * escala);
        canvas.height = Math.round(bitmap.height * escala);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        mapa.set(ref, { dataUrl: canvas.toDataURL('image/jpeg', 0.85), w: canvas.width, h: canvas.height });
      } catch (e) {
        console.warn('Imagem do documento não carregou', e);
      }
    })
  );
  return mapa;
}

const BRONZE: [number, number, number] = [196, 130, 41];
const BRONZE_HEX = 'C48229';
const BRONZE_ESCURO_HEX = '92611F';
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [51, 51, 51];
const CINZA: [number, number, number] = [120, 120, 120];
const FUNDO_CABECALHO: [number, number, number] = [248, 240, 228];
/** Fundo da faixa de informações do documento (areia bem clara). */
const AREIA: [number, number, number] = [250, 246, 238];

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const nomeSetor = (sigla: string) => SETORES_DOCUMENTO.find((s) => s.sigla === sigla)?.nome || sigla;
const nomeArquivo = (d: DocumentoPadronizado, ext: string) =>
  `${d.codigo}_v${d.versao}_${d.titulo}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 110) + `.${ext}`;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
/** "Parnamirim/RN, 4 de novembro de 2026." */
function localEData(d: DocumentoPadronizado): string {
  const iso = d.dataDocumento || new Date().toLocaleDateString('sv-SE');
  const dia = Number(iso.slice(8, 10));
  return `${d.oficio?.local?.trim() || EMPRESA_REGULAMENTO.cidadeUF}, ${dia} de ${MESES[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}.`;
}
const linhasDestinatario = (d: DocumentoPadronizado) => (d.oficio?.destinatario || '').split('\n').map((l) => l.trim()).filter(Boolean);
const assuntoOficio = (d: DocumentoPadronizado) => d.oficio?.assunto?.trim() || d.titulo;

// ---- Cotação de frete ----
const moedaBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
/** "R$ 1.234,50" | "1234.5" → número (ou undefined). */
function numeroBR(t: string): number | undefined {
  let s = (t || '').replace(/[^\d.,-]/g, '');
  if (!s) return undefined;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return isFinite(n) ? n : undefined;
}
/** Linha de total da tabela da cotação (última coluna = valor). */
function linhaTotalCotacao(cabecalho: string[], linhas: string[][]): string[] | undefined {
  const k = cabecalho.length - 1;
  if (k < 1 || !/valor|total|frete/i.test(cabecalho[k] || '')) return undefined;
  const valores = linhas.map((l) => numeroBR(l[k] || '')).filter((v): v is number => v !== undefined);
  if (!valores.length) return undefined;
  return cabecalho.map((_, i) => (i === 0 ? 'Total' : i === k ? moedaBR(valores.reduce((s, v) => s + v, 0)) : ''));
}
function quadroCotacao(d: DocumentoPadronizado): [string, string][] {
  const [cliente, ...contato] = linhasDestinatario(d);
  const dias = d.oficio?.validadeDias || 15;
  const base = d.dataDocumento || new Date().toLocaleDateString('sv-SE');
  const ate = new Date(`${base}T12:00:00`);
  ate.setDate(ate.getDate() + dias);
  return [
    ['Cliente', cliente || '—'],
    ['Contato', contato.join(' · ') || '—'],
    ['Cotação nº', d.codigo || '(gerado ao salvar)'],
    ['Data', dataBr(base)],
    ['Validade', `${dias} dias (até ${ate.toLocaleDateString('pt-BR')})`],
    ['Pagamento', d.oficio?.pagamento?.trim() || 'A combinar'],
  ];
}
const referenciaOficio = (d: DocumentoPadronizado) => (d.tipo === 'Ofício' ? `Ofício nº ${d.codigo || '(gerado ao salvar)'}` : d.codigo ? `Ref.: ${d.codigo}` : '');
const enderecoEmpresa = () => `${EMPRESA_REGULAMENTO.endereco} — CEP ${EMPRESA_REGULAMENTO.cep} — ${EMPRESA_REGULAMENTO.cidadeUF}`;

// ---- Informativo (orientações para a equipe) ----
// Identidade JMT: títulos quase pretos, dourado nos destaques, caixas em areia com barra dourada;
// caixa de atenção em laranja queimado.
const NAVY = TEXTO;
const AZUL = BRONZE;
const TEXTO_INFO: [number, number, number] = [45, 45, 45];
const CINZA_INFO: [number, number, number] = [115, 115, 115];
const CAIXA_AZUL = AREIA;
const BORDA_AZUL = BRONZE;
const CAIXA_LARANJA: [number, number, number] = [253, 240, 230];
const BORDA_LARANJA: [number, number, number] = [194, 86, 23];
const MESES_CAP = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesAno = (d: DocumentoPadronizado) => {
  const iso = d.dataDocumento || new Date().toLocaleDateString('sv-SE');
  return `${MESES_CAP[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`;
};
const etiquetaInfo = (resto?: string) => `JM TRANSPORTES${resto?.trim() ? ` / ${resto.trim().toUpperCase()}` : ''}`;
/** "ROTINA DE COLETA / Devoluções sem dúvida" → etiqueta + título. */
function parteInfo(texto: string, d: DocumentoPadronizado): { etiqueta: string; titulo: string } {
  const i = texto.indexOf(' / ');
  return i > 0 ? { etiqueta: etiquetaInfo(texto.slice(0, i)), titulo: texto.slice(i + 3).trim() } : { etiqueta: etiquetaInfo(d.oficio?.publico), titulo: texto };
}
/** Título da caixa colado no texto (vem assim de PDF importado): "O MAIS IMPORTANTE NA ROTADê baixa..." */
function separarTituloCaixa(texto: string): string {
  if (texto.includes('\n')) return texto;
  const m = texto.match(/^((?:[A-ZÀ-Ý0-9?!,]+\s+)+[A-ZÀ-Ý0-9?!,]*?[A-ZÀ-Ý?!])\s*([A-ZÀ-Ý][a-zà-ÿ][\s\S]*)$/);
  return m && m[1].replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 6 ? `${m[1].trim()}\n${m[2]}` : texto;
}
/**
 * Arruma os blocos do informativo (sobretudo os importados de PDF, que chegam quebrados):
 * "JM TRANSPORTES / X" vira a etiqueta do título grande seguinte; títulos grandes seguidos se
 * juntam ("Informativo aos" + "motoristas parceiros"); número já escrito na seção ("01 ...") sai
 * (o sistema numera); parágrafo entre duas listas é continuação do item anterior; título da caixa
 * de destaque colado no texto é separado.
 */
function normalizarInformativo(blocos: BlocoDocumento[]): BlocoDocumento[] {
  const saida: BlocoDocumento[] = [];
  let etiqueta: string | undefined;
  let tituloAberto = false; // último bloco é um título grande que ainda pode receber continuação
  blocos.forEach((b, i) => {
    if (b.tipo === 'titulo') {
      const m = b.texto.trim().replace(/^\d{1,2}[.)-]?\s+/, '').match(/^J\s*M\s+TRANSPORTES\s*\/\s*(.+)$/i);
      if (m) {
        etiqueta = m[1].trim();
        tituloAberto = false;
        return;
      }
      if (b.nivel === 1) {
        const anterior = saida[saida.length - 1];
        if (tituloAberto && anterior?.tipo === 'titulo') {
          anterior.texto = `${anterior.texto} ${b.texto.trim()}`;
          return;
        }
        saida.push({ ...b, texto: etiqueta ? `${etiqueta} / ${b.texto.trim()}` : b.texto.trim() });
        etiqueta = undefined;
        tituloAberto = true;
        return;
      }
      tituloAberto = false;
      saida.push({ ...b, texto: b.texto.replace(/^\s*\d{1,2}[.)-]?\s+(?=\S)/, '') });
      return;
    }
    tituloAberto = false;
    const anterior = saida[saida.length - 1];
    const proximo = blocos[i + 1];
    if (b.tipo === 'paragrafo' && anterior?.tipo === 'lista' && proximo?.tipo === 'lista' && anterior.itens.length) {
      anterior.itens = [...anterior.itens.slice(0, -1), `${anterior.itens[anterior.itens.length - 1]} ${b.texto.trim()}`];
      return;
    }
    if (b.tipo === 'destaque') {
      saida.push({ ...b, texto: separarTituloCaixa(b.texto.trim()) });
      return;
    }
    saida.push(b.tipo === 'lista' ? { ...b, itens: [...b.itens] } : b);
  });
  return saida;
}
const subtituloCapa = (d: DocumentoPadronizado) => {
  const sub = d.oficio?.subtitulo?.trim();
  return sub && /\b(19|20)\d{2}\b/.test(sub) ? sub : [sub, mesAno(d)].filter(Boolean).join(' • ');
};
/** Capa do documento só quando o conteúdo não começa por uma parte (título grande). */
const temCapaPropria = (blocos: BlocoDocumento[]) => blocos[0]?.tipo === 'titulo' && blocos[0].nivel === 1;

/** Caixa do destaque: 1ª linha = título (se houver mais de uma linha). */
function caixaInfo(texto: string): { titulo?: string; corpo: string; laranja: boolean } {
  const [primeira, ...resto] = texto.split('\n');
  const titulo = resto.length ? primeira.trim() : undefined;
  return { titulo, corpo: (resto.length ? resto.join('\n') : texto).trim(), laranja: /aten[cç][aã]o|cuidado|importante!/i.test(titulo || '') };
}
interface Trecho {
  t: string;
  b: boolean;
}
/** **negrito** no texto; nas listas, o rótulo antes dos dois-pontos sai em negrito. */
function trechos(texto: string, rotuloNegrito = false): Trecho[] {
  if (!texto.includes('**') && rotuloNegrito) {
    const m = texto.match(/^([^:\n]{2,45}):\s/);
    if (m) return [{ t: `${m[1]}:`, b: true }, { t: texto.slice(m[1].length + 1), b: false }];
  }
  return texto
    .split(/\*\*(.+?)\*\*/g)
    .map((t, i) => ({ t, b: i % 2 === 1 }))
    .filter((x) => x.t);
}

function quadroControle(d: DocumentoPadronizado): [string, string][] {
  return [
    ['Código', d.codigo || '(gerado ao salvar)'],
    ['Versão', String(d.versao)],
    ['Tipo', d.tipo],
    ['Setor', nomeSetor(d.setor)],
    ['Data', dataBr(d.dataDocumento)],
    ['Classificação', d.classificacao],
    ['Responsável', d.responsavel || '—'],
    ['Aprovado por', d.aprovadoPor || '—'],
  ];
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
/** Assinatura já feita (link/portal) a desenhar no espaço da pessoa no bloco Assinaturas. */
export interface AssinaturaNoDocumento {
  imagem: string; // PNG (data URL)
  em: string; // ISO
}
const MM_PARA_PT = 72 / 25.4;

export interface EvidenciaAssinatura {
  papel: string;
  nome: string;
  cpfMascarado: string;
  externo: boolean;
  assinadoEm: string;
  ip?: string;
  navegador?: string;
  declaracao?: string;
  hashConfere?: boolean;
  id: string;
}

export async function gerarPdfDocumento(
  d: DocumentoPadronizado,
  opcoes: {
    /** posição ('<bloco>:<índice>') → assinatura feita. */
    assinaturas?: Record<string, AssinaturaNoDocumento>;
    /** Recebe a área (em pontos do PDF) de cada espaço de assinatura — usado no envio, para o
     *  comprovante de quem assina mostrar a assinatura no lugar certo. */
    campos?: Record<string, CampoAssinaturaPdf>;
    /** Página final com o registro de cada assinatura eletrônica (quem, quando, IP, aparelho). */
    evidencias?: EvidenciaAssinatura[];
  } = {}
): Promise<File> {
  const imagens = await carregarImagens(d);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const MARGEM = 20;
  const larguraTexto = largura - 2 * MARGEM;
  const cotacao = d.modelo === 'cotacao';
  const oficio = d.modelo === 'oficio' || cotacao;
  const info = d.modelo === 'informativo';
  const TOPO = oficio ? 36 : 32;
  const blocos = info ? normalizarInformativo(d.blocos) : d.blocos;
  const LIMITE = altura - 24;
  let y = TOPO;

  const novaPagina = () => {
    doc.addPage();
    y = TOPO;
  };
  const espaco = (mm: number) => {
    if (y + mm > LIMITE) novaPagina();
  };
  const texto = (t: string, tamanho: number, estilo: 'normal' | 'bold' | 'italic', cor: [number, number, number], recuo = 0, prefixo?: string) => {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    const larg = larguraTexto - recuo - (prefixo ? 6 : 0);
    const linhas = doc.splitTextToSize(t, larg) as string[];
    const h = tamanho * 0.46;
    linhas.forEach((l, i) => {
      espaco(h + 1);
      if (i === 0 && prefixo) doc.text(prefixo, MARGEM + recuo, y);
      doc.text(l, MARGEM + recuo + (prefixo ? 6 : 0), y);
      y += h;
    });
  };

  const quebrarRico = (partes: Trecho[], larg: number, tamanho: number) => {
    doc.setFontSize(tamanho);
    const linhas: { t: string; b: boolean; x: number }[][] = [[]];
    let x = 0;
    partes.forEach((p) => {
      doc.setFont('helvetica', p.b ? 'bold' : 'normal');
      p.t.split(/(\n|\s+)/).forEach((pal) => {
        if (!pal) return;
        if (pal === '\n') {
          linhas.push([]);
          x = 0;
          return;
        }
        const espacoBranco = /^\s+$/.test(pal);
        if (espacoBranco && x === 0) return;
        const w = doc.getTextWidth(espacoBranco ? ' ' : pal);
        if (!espacoBranco && x + w > larg && x > 0) {
          linhas.push([]);
          x = 0;
        }
        linhas[linhas.length - 1].push({ t: espacoBranco ? ' ' : pal, b: p.b, x });
        x += w;
      });
    });
    return linhas;
  };
  const desenharRico = (linhas: { t: string; b: boolean; x: number }[][], x0: number, tamanho: number, cor: [number, number, number], entre: number) => {
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    linhas.forEach((l) => {
      espaco(entre);
      l.forEach((p) => {
        doc.setFont('helvetica', p.b ? 'bold' : 'normal');
        doc.text(p.t, x0 + p.x, y);
      });
      y += entre;
    });
  };
  const capaInfo = (etiqueta: string, titulo: string, sub: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...AZUL);
    doc.text(etiqueta, MARGEM + 2, y);
    y += 11;
    doc.setFontSize(24);
    doc.setTextColor(...NAVY);
    const tl = doc.splitTextToSize(titulo, larguraTexto * 0.7) as string[];
    tl.forEach((l) => {
      doc.text(l, MARGEM + 2, y);
      y += 10;
    });
    y -= 3;
    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...CINZA_INFO);
      (doc.splitTextToSize(sub, larguraTexto) as string[]).forEach((l) => {
        doc.text(l, MARGEM + 2, y);
        y += 5.5;
      });
    }
    y += 7;
  };
  const caixaPdf = (texto: string) => {
    const c = caixaInfo(texto);
    const linhas = quebrarRico(trechos(c.corpo), larguraTexto - 10, 10.5);
    const h = (c.titulo ? 7 : 0) + linhas.length * 5.4 + 8;
    espaco(h + 2);
    doc.setFillColor(...(c.laranja ? CAIXA_LARANJA : CAIXA_AZUL));
    doc.setDrawColor(...(c.laranja ? BORDA_LARANJA : BORDA_AZUL));
    doc.setLineWidth(0.25);
    doc.rect(MARGEM, y, larguraTexto, h, 'F');
    doc.setFillColor(...(c.laranja ? BORDA_LARANJA : BORDA_AZUL));
    doc.rect(MARGEM, y, 1.2, h, 'F');
    let yy = y + 7;
    if (c.titulo) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...(c.laranja ? BORDA_LARANJA : AZUL));
      doc.text(c.titulo.toUpperCase(), MARGEM + 5, yy);
      yy += 7;
    }
    const salvo = y;
    y = yy;
    desenharRico(linhas, MARGEM + 5, 10.5, TEXTO_INFO, 5.4);
    y = salvo + h + 6;
  };

  if (info) {
    if (!temCapaPropria(blocos)) capaInfo(etiquetaInfo(d.oficio?.publico), d.titulo, subtituloCapa(d));
  } else if (cotacao) {
    // Cotação: título, número e quadro (cliente, contato, data, validade, pagamento).
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...TEXTO);
    doc.text('COTAÇÃO DE FRETE', MARGEM, y + 2);
    doc.setFontSize(10);
    doc.setTextColor(...BRONZE);
    doc.text(`Nº ${d.codigo || 'RASCUNHO'}`, largura - MARGEM, y + 2, { align: 'right' });
    y += 6;
    if (d.titulo.trim() && !/^cota[cç][aã]o de frete$/i.test(d.titulo.trim())) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...CINZA);
      doc.text(d.titulo, MARGEM, y + 2, { maxWidth: larguraTexto });
      y += 6;
    }
    y += 3;
    const quadro = quadroCotacao(d);
    const alturaLinha = 10.5;
    const alturaFaixa = 4 + alturaLinha * 2 + 1;
    doc.setFillColor(...AREIA);
    doc.rect(MARGEM, y, larguraTexto, alturaFaixa, 'F');
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, y, 1.2, alturaFaixa, 'F');
    const larguraColuna = (larguraTexto - 8) / 3;
    quadro.forEach(([rotulo, valor], i) => {
      const x = MARGEM + 6 + (i % 3) * larguraColuna;
      const yLinha = y + 6 + Math.floor(i / 3) * alturaLinha;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...BRONZE);
      doc.text(rotulo.toUpperCase(), x, yLinha);
      doc.setFontSize(9);
      doc.setTextColor(...TEXTO);
      const v = doc.splitTextToSize(valor, larguraColuna - 3) as string[];
      doc.text(v.length > 1 ? `${v[0].replace(/\s+\S*$/, '')}…` : v[0] || '—', x, yLinha + 4.2);
    });
    y += alturaFaixa + 9;
  } else if (oficio) {
    // Ofício / carta: referência e local/data, destinatário e assunto.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...TEXTO);
    const ref = referenciaOficio(d);
    if (ref) doc.text(ref, MARGEM, y);
    doc.setFont('helvetica', 'normal');
    doc.text(localEData(d), largura - MARGEM, y, { align: 'right' });
    y += 14;
    const dest = linhasDestinatario(d);
    if (dest.length) {
      dest.forEach((l) => texto(l, 10.5, 'normal', TEXTO));
      y += 7;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXTO);
    const assunto = doc.splitTextToSize(`Assunto: ${assuntoOficio(d)}`, larguraTexto) as string[];
    assunto.forEach((l) => {
      doc.text(l, MARGEM, y);
      y += 5;
    });
    y += 8;
  } else {
  // Título e quadro de controle (1ª página)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...TEXTO);
  const titulo = doc.splitTextToSize(d.titulo.toUpperCase(), larguraTexto) as string[];
  doc.text(titulo, MARGEM, y + 2);
  y += titulo.length * 7.5 + 4;
  // Faixa de informações do documento (sem grade): fundo areia, barra dourada à esquerda e
  // 4 colunas com o rótulo pequeno em dourado e o valor embaixo.
  const controle = quadroControle(d);
  const alturaLinha = 10.5;
  const alturaFaixa = 4 + alturaLinha * 2 + 1;
  doc.setFillColor(...AREIA);
  doc.rect(MARGEM, y, larguraTexto, alturaFaixa, 'F');
  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, y, 1.2, alturaFaixa, 'F');
  const larguraColuna = (larguraTexto - 8) / 4;
  controle.forEach(([rotulo, valor], i) => {
    const x = MARGEM + 6 + (i % 4) * larguraColuna;
    const yLinha = y + 6 + Math.floor(i / 4) * alturaLinha;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...BRONZE);
    doc.text(rotulo.toUpperCase(), x, yLinha);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXTO);
    const v = doc.splitTextToSize(valor, larguraColuna - 3) as string[];
    doc.text(v.length > 1 ? `${v[0].replace(/\s+\S*$/, '')}…` : v[0] || '—', x, yLinha + 4.2);
  });
  y += alturaFaixa + 9;
  }

  let numeroSecao = 0;
  for (let ib = 0; ib < blocos.length; ib++) {
    const b = blocos[ib];
    if (info && b.tipo === 'titulo') {
      if (b.nivel === 1) {
        // Nova parte: página nova (se a atual já tem conteúdo), etiqueta, título grande e frase cinza.
        if (y > TOPO + 1) novaPagina();
        const parte = parteInfo(b.texto, d);
        const seguinte = blocos[ib + 1];
        const sub = seguinte?.tipo === 'paragrafo' && seguinte.texto.length < 220 ? seguinte.texto : '';
        if (sub) ib += 1;
        capaInfo(parte.etiqueta, parte.titulo, sub || (ib === 0 ? subtituloCapa(d) : ''));
      } else {
        espaco(16);
        y += 3;
        if (b.nivel === 2) numeroSecao += 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(b.nivel === 2 ? 15 : 12);
        doc.setTextColor(...NAVY);
        const num = b.nivel === 2 ? `${String(numeroSecao).padStart(2, '0')}` : '';
        let xTitulo = MARGEM + 2;
        if (num) {
          doc.setTextColor(...BRONZE);
          doc.text(num, xTitulo, y);
          xTitulo += doc.getTextWidth(num) + 3;
          doc.setTextColor(...NAVY);
        }
        (doc.splitTextToSize(b.texto, larguraTexto - (xTitulo - MARGEM)) as string[]).forEach((l) => {
          doc.text(l, xTitulo, y);
          y += b.nivel === 2 ? 7 : 6;
        });
        y += 1;
      }
      continue;
    }
    if (info && b.tipo === 'paragrafo') {
      desenharRico(quebrarRico(trechos(b.texto), larguraTexto - 4, 10.5), MARGEM + 2, 10.5, TEXTO_INFO, 5.4);
      y += 3;
      continue;
    }
    if (info && b.tipo === 'lista') {
      b.itens.forEach((item, i) => {
        const marca = b.ordenada ? `${i + 1}.` : '•';
        const linhas = quebrarRico(trechos(item, true), larguraTexto - 12, 10.5);
        espaco(5.4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(...TEXTO_INFO);
        doc.text(marca, MARGEM + 4, y);
        desenharRico(linhas, MARGEM + 8, 10.5, TEXTO_INFO, 5.4);
        y += 1.6;
      });
      y += 1.5;
      continue;
    }
    if (info && b.tipo === 'destaque') {
      caixaPdf(b.texto);
      continue;
    }
    if (b.tipo === 'titulo') {
      espaco(14);
      y += b.nivel === 1 ? 3 : 1;
      if (oficio) texto(b.texto, b.nivel === 1 ? 11.5 : 10.5, 'bold', TEXTO);
      else if (b.nivel === 1) {
        numeroSecao += 1;
        texto(`${numeroSecao}. ${b.texto.toUpperCase()}`, 12.5, 'bold', TEXTO);
        doc.setFillColor(...BRONZE);
        doc.rect(MARGEM, y - 2.2, 18, 0.7, 'F');
        y += 3;
      } else texto(b.texto, b.nivel === 2 ? 11 : 10, 'bold', b.nivel === 2 ? TEXTO : CORPO);
      y += 1.5;
    } else if (b.tipo === 'paragrafo') {
      texto(b.texto, oficio ? 10.5 : 10, 'normal', oficio ? TEXTO : CORPO);
      y += oficio ? 3.5 : 2.8;
    } else if (b.tipo === 'destaque') {
      const inicioY = y - 4;
      const pagina = doc.getNumberOfPages();
      texto(b.texto, 10, 'italic', CORPO, 5);
      if (doc.getNumberOfPages() === pagina) {
        doc.setFillColor(...BRONZE);
        doc.rect(MARGEM, inicioY, 1, y - inicioY - 2, 'F');
      }
      y += 3;
    } else if (b.tipo === 'lista') {
      b.itens.forEach((item, i) => {
        texto(item, 10, 'normal', CORPO, 3, b.ordenada ? `${i + 1}.` : '•');
        y += 1;
      });
      y += 2;
    } else if (b.tipo === 'tabela') {
      autoTable(doc, {
        startY: y,
        margin: { left: MARGEM, right: MARGEM, top: TOPO, bottom: 26 },
        head: [b.cabecalho],
        body: b.linhas,
        ...(cotacao && linhaTotalCotacao(b.cabecalho, b.linhas)
          ? { foot: [linhaTotalCotacao(b.cabecalho, b.linhas)!], footStyles: { fillColor: FUNDO_CABECALHO, textColor: TEXTO, fontStyle: 'bold' as const }, showFoot: 'lastPage' as const }
          : {}),
        theme: 'grid',
        styles: { fontSize: b.cabecalho.length > 6 ? 7 : 8.5, cellPadding: 1.6, textColor: CORPO, lineColor: [225, 225, 225], lineWidth: 0.15 },
        headStyles: { fillColor: FUNDO_CABECALHO, textColor: TEXTO, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [252, 250, 247] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    } else if (b.tipo === 'checklist' && b.itens.length) {
      if (b.titulo) {
        espaco(10);
        texto(b.titulo, 10, 'bold', TEXTO);
        y += 1;
      }
      const caixa = (x: number, yTopo: number, marcada: boolean, lado = 3.4) => {
        doc.setDrawColor(...CORPO);
        doc.setLineWidth(0.3);
        doc.rect(x, yTopo, lado, lado);
        if (marcada) {
          doc.setDrawColor(...BRONZE);
          doc.setLineWidth(0.6);
          doc.line(x + 0.6, yTopo + lado * 0.55, x + lado * 0.42, yTopo + lado - 0.6);
          doc.line(x + lado * 0.42, yTopo + lado - 0.6, x + lado - 0.4, yTopo + 0.5);
        }
      };
      if (b.opcoes?.length) {
        const opcoes = b.opcoes;
        autoTable(doc, {
          startY: y - 3,
          margin: { left: MARGEM, right: MARGEM, top: TOPO, bottom: 26 },
          head: [['Item', ...opcoes, ...(b.comObservacao ? ['Observação'] : [])]],
          body: b.itens.map((it) => [it.texto, ...opcoes.map(() => ''), ...(b.comObservacao ? [it.obs || ''] : [])]),
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 1.8, textColor: CORPO, lineColor: [225, 225, 225], lineWidth: 0.15, valign: 'middle' },
          headStyles: { fillColor: FUNDO_CABECALHO, textColor: TEXTO, fontStyle: 'bold', halign: 'center' },
          columnStyles: Object.fromEntries([[0, { halign: 'left' }], ...opcoes.map((_, i) => [i + 1, { cellWidth: 14 }]), ...(b.comObservacao ? [[opcoes.length + 1, { cellWidth: 45 }]] : [])]),
          didDrawCell: (h) => {
            if (h.section !== 'body' || h.column.index < 1 || h.column.index > opcoes.length) return;
            const it = b.itens[h.row.index];
            caixa(h.cell.x + h.cell.width / 2 - 1.7, h.cell.y + h.cell.height / 2 - 1.7, it?.resposta === opcoes[h.column.index - 1]);
          },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      } else {
        b.itens.forEach((it) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const linhas = doc.splitTextToSize(it.texto, larguraTexto - 8) as string[];
          espaco(linhas.length * 4.6 + 1.5);
          caixa(MARGEM + 1, y - 3.1, !!it.marcado);
          doc.setTextColor(...CORPO);
          linhas.forEach((l, k) => doc.text(l, MARGEM + 7, y + k * 4.6));
          y += linhas.length * 4.6 + 1.8;
        });
        y += 2;
      }
    } else if (b.tipo === 'imagem') {
      const img = imagens.get(b.ref);
      if (!img) continue;
      let w = (larguraTexto * (b.largura || 100)) / 100;
      let h = (w * img.h) / img.w;
      const alturaMax = LIMITE - TOPO - (b.legenda ? 8 : 2);
      if (h > alturaMax) {
        w = (w * alturaMax) / h;
        h = alturaMax;
      }
      espaco(h + (b.legenda ? 8 : 2));
      const x = MARGEM + (larguraTexto - w) / 2;
      doc.addImage(img.dataUrl, 'JPEG', x, y, w, h, undefined, 'FAST');
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.2);
      doc.rect(x, y, w, h);
      y += h + 4;
      if (b.legenda) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(...CINZA);
        doc.text(b.legenda, largura / 2, y, { align: 'center', maxWidth: larguraTexto });
        y += 5;
      }
      y += 3;
    } else if (b.tipo === 'assinaturas' && b.pessoas.length) {
      // Até 3 por linha (4 = 2 + 2); cada espaço: papel, área para assinar, linha, nome, cargo e data.
      const porLinha = b.pessoas.length === 4 ? 2 : Math.min(3, b.pessoas.length);
      const vao = 10;
      // Uma pessoa só: linha de 85mm centralizada (não a largura toda).
      const larg = porLinha === 1 ? 85 : (larguraTexto - vao * (porLinha - 1)) / porLinha;
      const inicioX = porLinha === 1 ? (largura - larg) / 2 : MARGEM;
      const alturaEspaco = 34 + (b.comData ? 6 : 0);
      y += 4;
      for (let i = 0; i < b.pessoas.length; i += porLinha) {
        espaco(alturaEspaco);
        b.pessoas.slice(i, i + porLinha).forEach((pessoa, k) => {
          const x = inicioX + k * (larg + vao);
          const meio = x + larg / 2;
          const posicao = `${b.id}:${i + k}`;
          const assinada = opcoes.assinaturas?.[posicao];
          if (opcoes.campos)
            opcoes.campos[posicao] = {
              pagina: doc.getNumberOfPages() - 1,
              x: (x + 2) * MM_PARA_PT,
              y: (altura - (y + 16)) * MM_PARA_PT + 1,
              largura: (larg - 4) * MM_PARA_PT,
              altura: 34,
            };
          if (assinada) {
            try {
              const prop = doc.getImageProperties(assinada.imagem);
              const maxW = larg - 8;
              const maxH = 11;
              const escala = Math.min(maxW / prop.width, maxH / prop.height);
              const w = prop.width * escala;
              const h = prop.height * escala;
              doc.addImage(assinada.imagem, 'PNG', meio - w / 2, y + 15.5 - h, w, h);
            } catch (e) {
              console.warn('Assinatura não pôde ser desenhada', e);
            }
          }
          if (pessoa.papel) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...BRONZE);
            doc.text(pessoa.papel.toUpperCase(), meio, y, { align: 'center', maxWidth: larg });
          }
          doc.setDrawColor(...TEXTO);
          doc.setLineWidth(0.3);
          doc.line(x + 2, y + 16, x + larg - 2, y + 16);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(...TEXTO);
          doc.text(pessoa.nome || 'Nome: ________________', meio, y + 20.5, { align: 'center', maxWidth: larg });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...CINZA);
          if (pessoa.cargo) doc.text(pessoa.cargo, meio, y + 24.5, { align: 'center', maxWidth: larg });
          const dataAssinatura = assinada ? new Date(assinada.em).toLocaleDateString('pt-BR') : undefined;
          if (b.comData) doc.text(`Data: ${dataAssinatura || pessoa.data || '____/____/________'}`, meio, y + (pessoa.cargo ? 29.5 : 25.5), { align: 'center' });
          if (assinada) {
            doc.setFontSize(6);
            doc.text(
              `Assinado eletronicamente em ${new Date(assinada.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`,
              meio,
              y + (pessoa.cargo ? 29.5 : 25.5) + (b.comData ? 3.5 : 0),
              { align: 'center' }
            );
          }
        });
        y += alturaEspaco;
      }
    }
  }

  // Registro das assinaturas eletrônicas (evidências) — página própria no fim.
  if (opcoes.evidencias?.length) {
    novaPagina();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...TEXTO);
    doc.text('REGISTRO DAS ASSINATURAS ELETRÔNICAS', MARGEM, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...CINZA);
    (doc.splitTextToSize(
      'Cada pessoa recebeu um link individual e, antes de abrir o documento, informou o CPF, conferido com o cadastro (colaborador) ou com o CPF registrado no envio (pessoa de fora). Assinatura desenhada na tela, com data, hora, IP e aparelho registrados.',
      larguraTexto
    ) as string[]).forEach((l) => {
      doc.text(l, MARGEM, y);
      y += 4;
    });
    y += 4;
    opcoes.evidencias.forEach((e) => {
      const linhas: [string, string][] = [
        [e.papel || 'Assinatura', `${e.nome} — CPF ${e.cpfMascarado}${e.externo ? ' (pessoa de fora da empresa)' : ''}`],
        ['Assinado em', new Date(e.assinadoEm).toLocaleString('pt-BR')],
        ...(e.ip ? ([['IP', e.ip]] as [string, string][]) : []),
        ...(e.navegador ? ([['Aparelho', e.navegador]] as [string, string][]) : []),
        ...(e.declaracao ? ([['Declaração', `"${e.declaracao}"`]] as [string, string][]) : []),
        ...(e.hashConfere !== undefined ? ([['Integridade', e.hashConfere ? 'Documento idêntico ao enviado (SHA-256 confere).' : 'ATENÇÃO: código do arquivo diferente do registrado no envio.']] as [string, string][]) : []),
        ['Registro', e.id],
      ];
      const altura = linhas.reduce((s, [, v]) => s + (doc.splitTextToSize(v, larguraTexto - 32) as string[]).length * 3.8 + 1, 0) + 6;
      espaco(altura);
      doc.setFillColor(...AREIA);
      doc.rect(MARGEM, y - 3.5, larguraTexto, altura, 'F');
      doc.setFillColor(...BRONZE);
      doc.rect(MARGEM, y - 3.5, 1, altura, 'F');
      linhas.forEach(([rotulo, valor], i) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(i === 0 ? 8 : 7.5);
        doc.setTextColor(...(i === 0 ? BRONZE : CINZA));
        doc.text(rotulo.toUpperCase(), MARGEM + 4, y);
        doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
        doc.setFontSize(i === 0 ? 9 : 8);
        doc.setTextColor(...TEXTO);
        const v = doc.splitTextToSize(valor, larguraTexto - 32) as string[];
        doc.text(v, MARGEM + 30, y);
        y += v.length * 3.8 + 1;
      });
      y += 7;
    });
  }

  // Cabeçalho e rodapé em todas as páginas
  const total = doc.getNumberOfPages();
  const logoLargura = 32;
  const logoAltura = (logoLargura * 339) / 900;
  for (let p = 1; p <= total && oficio; p++) {
    // Papel timbrado: logo + razão social/CNPJ no topo; endereço no rodapé.
    doc.setPage(p);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 10, 36, (36 * 339) / 900, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXTO);
    doc.text(EMPRESA_REGULAMENTO.razaoSocial, largura - MARGEM, 15.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA);
    doc.text(`CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, largura - MARGEM, 19.5, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, 10 + (36 * 339) / 900 + 3, larguraTexto, 0.6, 'F');
    doc.rect(MARGEM, altura - 17, larguraTexto, 0.4, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(enderecoEmpresa(), largura / 2, altura - 12, { align: 'center', maxWidth: larguraTexto });
    if (total > 1) doc.text(`Página ${p} de ${total}`, largura - MARGEM, altura - 8, { align: 'right' });
  }
  for (let p = 1; p <= total && info; p++) {
    doc.setPage(p);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 10, logoLargura, logoAltura, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXTO);
    doc.text(d.tipo === 'Comunicado' ? 'COMUNICADO' : 'INFORMATIVO', largura - MARGEM, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRONZE);
    doc.text(mesAno(d), largura - MARGEM, 19.5, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, 10 + logoAltura + 2.5, larguraTexto, 0.5, 'F');
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(MARGEM, altura - 17, largura - MARGEM, altura - 17);
    doc.setFontSize(6.8);
    doc.setTextColor(...CINZA);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} — ${EMPRESA_REGULAMENTO.cidadeUF}`, MARGEM, altura - 12.5);
    doc.text(`Página ${p} de ${total}`, largura - MARGEM, altura - 12.5, { align: 'right' });
  }
  for (let p = 1; p <= total && !oficio && !info; p++) {
    doc.setPage(p);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 10, logoLargura, logoAltura, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXTO);
    doc.text(`${d.codigo || 'RASCUNHO'} · Versão ${d.versao}`, largura - MARGEM, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRONZE);
    const tituloCurto = d.titulo.length > 70 ? `${d.titulo.slice(0, 68)}…` : d.titulo;
    doc.text(tituloCurto, largura - MARGEM, 19.5, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, 10 + logoAltura + 2.5, larguraTexto, 0.5, 'F');

    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(MARGEM, altura - 17, largura - MARGEM, altura - 17);
    doc.setFontSize(6.8);
    doc.setTextColor(...CINZA);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} — ${EMPRESA_REGULAMENTO.cidadeUF}`, MARGEM, altura - 12.5);
    doc.text(
      d.status === 'Vigente' ? `${d.classificacao} · Documento controlado — cópia impressa não é controlada` : `${d.classificacao} · ${d.status.toUpperCase()} — não usar como versão oficial`,
      MARGEM,
      altura - 9
    );
    doc.text(`Página ${p} de ${total}`, largura - MARGEM, altura - 12.5, { align: 'right' });
  }
  return new File([doc.output('blob')], nomeArquivo(d, 'pdf'), { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------
// Word
// ---------------------------------------------------------------------------
function base64ParaBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function gerarDocxDocumento(d: DocumentoPadronizado): Promise<File> {
  const imagens = await carregarImagens(d);
  const docx = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Header,
    Footer,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
    AlignmentType,
    BorderStyle,
    PageNumber,
    TabStopType,
    LevelFormat,
  } = docx;
  const FONTE = 'Arial';
  const borda = { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const celula = (t: string, cabecalho = false, largura?: number) =>
    new TableCell({
      borders: bordas,
      width: largura ? { size: largura, type: WidthType.PERCENTAGE } : undefined,
      shading: cabecalho ? { fill: 'F8F0E4', type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: cabecalho, font: FONTE, size: 18, color: cabecalho ? '111111' : '333333' })] })],
    });

  const cotacao = d.modelo === 'cotacao';
  const oficio = d.modelo === 'oficio' || cotacao;
  const info = d.modelo === 'informativo';
  const NAVY_HEX = '111111';
  const AZUL_HEX = BRONZE_HEX;
  const blocos = info ? normalizarInformativo(d.blocos) : d.blocos;
  const corridos = (partes: Trecho[], tamanho = 21) => partes.map((p) => new TextRun({ text: p.t, bold: p.b, font: FONTE, size: tamanho, color: '2D2D2D' }));
  const capaWord = (etiqueta: string, titulo: string, sub: string, novaPagina: boolean) => [
    new Paragraph({ pageBreakBefore: novaPagina, spacing: { after: 160 }, children: [new TextRun({ text: etiqueta, bold: true, font: FONTE, size: 17, color: AZUL_HEX })] }),
    new Paragraph({ spacing: { after: 80, line: 260 }, children: [new TextRun({ text: titulo, bold: true, font: FONTE, size: 48, color: NAVY_HEX })] }),
    ...(sub ? [new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: sub, font: FONTE, size: 22, color: '737373' })] })] : []),
  ];
  const caixaWord = (texto: string) => {
    const c = caixaInfo(texto);
    const nada = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const barra = { style: BorderStyle.SINGLE, size: 24, color: c.laranja ? 'C25617' : BRONZE_HEX };
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: nada, bottom: nada, left: barra, right: nada },
              shading: { fill: c.laranja ? 'FDF0E6' : 'FAF6EE', type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 160, bottom: 160, left: 220, right: 220 },
              children: [
                ...(c.titulo ? [new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: c.titulo.toUpperCase(), bold: true, font: FONTE, size: 17, color: c.laranja ? 'C25617' : AZUL_HEX })] })] : []),
                new Paragraph({ spacing: { line: 300 }, children: corridos(trechos(c.corpo)) }),
              ],
            }),
          ],
        }),
      ],
    });
  };
  const controle = quadroControle(d);
  const filhos: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = info
    ? temCapaPropria(blocos)
      ? []
      : capaWord(etiquetaInfo(d.oficio?.publico), d.titulo, subtituloCapa(d), false)
    : cotacao
    ? [
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
          spacing: { after: 160 },
          children: [
            new TextRun({ text: 'COTAÇÃO DE FRETE', bold: true, font: FONTE, size: 34, color: '111111' }),
            new TextRun({ text: `\tNº ${d.codigo || 'RASCUNHO'}`, bold: true, font: FONTE, size: 20, color: BRONZE_HEX }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: { style: BorderStyle.SINGLE, size: 24, color: BRONZE_HEX },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          },
          rows: [0, 3].map(
            (inicio) =>
              new TableRow({
                children: quadroCotacao(d)
                  .slice(inicio, inicio + 3)
                  .map(
                    ([rotulo, valor]) =>
                      new TableCell({
                        width: { size: 33, type: WidthType.PERCENTAGE },
                        shading: { fill: 'FAF6EE', type: ShadingType.CLEAR, color: 'auto' },
                        margins: { top: 90, bottom: 90, left: 160, right: 80 },
                        children: [
                          new Paragraph({ children: [new TextRun({ text: rotulo.toUpperCase(), bold: true, font: FONTE, size: 13, color: BRONZE_HEX })] }),
                          new Paragraph({ spacing: { before: 30 }, children: [new TextRun({ text: valor, bold: true, font: FONTE, size: 18, color: '111111' })] }),
                        ],
                      })
                  ),
              })
          ),
        }),
        new Paragraph({ text: '', spacing: { after: 200 } }),
      ]
    : oficio
    ? [
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
          spacing: { after: 360 },
          children: [
            new TextRun({ text: referenciaOficio(d), bold: true, font: FONTE, size: 20, color: '111111' }),
            new TextRun({ text: `\t${localEData(d)}`, font: FONTE, size: 20, color: '111111' }),
          ],
        }),
        ...linhasDestinatario(d).map((l, i, a) => new Paragraph({ spacing: { after: i === a.length - 1 ? 300 : 0 }, children: [new TextRun({ text: l, font: FONTE, size: 21, color: '111111' })] })),
        new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: `Assunto: ${assuntoOficio(d)}`, bold: true, font: FONTE, size: 21, color: '111111' })] }),
      ]
    : [
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: d.titulo.toUpperCase(), bold: true, size: 34, font: FONTE, color: '111111' })],
    }),
    // Faixa de informações (sem grade): fundo areia, barra dourada à esquerda, rótulo pequeno
    // em dourado e o valor embaixo, em 4 colunas.
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.SINGLE, size: 24, color: BRONZE_HEX },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [0, 4].map(
        (inicio) =>
          new TableRow({
            children: controle.slice(inicio, inicio + 4).map(
              ([rotulo, valor]) =>
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  shading: { fill: 'FAF6EE', type: ShadingType.CLEAR, color: 'auto' },
                  margins: { top: 90, bottom: 90, left: 160, right: 80 },
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  },
                  children: [
                    new Paragraph({ children: [new TextRun({ text: rotulo.toUpperCase(), bold: true, font: FONTE, size: 13, color: BRONZE_HEX })] }),
                    new Paragraph({ spacing: { before: 30 }, children: [new TextRun({ text: valor, bold: true, font: FONTE, size: 18, color: '111111' })] }),
                  ],
                })
            ),
          })
      ),
    }),
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];

  let numeroSecao = 0;
  let instanciaLista = 0;
  for (let ib = 0; ib < blocos.length; ib++) {
    const b = blocos[ib];
    if (info && b.tipo === 'titulo') {
      if (b.nivel === 1) {
        const parte = parteInfo(b.texto, d);
        const seguinte = blocos[ib + 1];
        const sub = seguinte?.tipo === 'paragrafo' && seguinte.texto.length < 220 ? seguinte.texto : '';
        if (sub) ib += 1;
        filhos.push(...capaWord(parte.etiqueta, parte.titulo, sub, filhos.length > 0));
      } else {
        if (b.nivel === 2) numeroSecao += 1;
        filhos.push(
          new Paragraph({
            spacing: { before: 280, after: 120 },
            children: [
              ...(b.nivel === 2 ? [new TextRun({ text: `${String(numeroSecao).padStart(2, '0')}  `, bold: true, font: FONTE, size: 30, color: BRONZE_HEX })] : []),
              new TextRun({ text: b.texto, bold: true, font: FONTE, size: b.nivel === 2 ? 30 : 24, color: NAVY_HEX }),
            ],
          })
        );
      }
      continue;
    }
    if (info && b.tipo === 'paragrafo') {
      filhos.push(new Paragraph({ spacing: { after: 140, line: 300 }, children: corridos(trechos(b.texto)) }));
      continue;
    }
    if (info && b.tipo === 'lista') {
      instanciaLista += 1;
      b.itens.forEach((item) =>
        filhos.push(
          new Paragraph({
            numbering: { reference: b.ordenada ? 'jmt-numerada' : 'jmt-marcadores', level: 0, instance: instanciaLista },
            spacing: { after: 100, line: 300 },
            children: corridos(trechos(item, true)),
          })
        )
      );
      filhos.push(new Paragraph({ text: '', spacing: { after: 60 } }));
      continue;
    }
    if (info && b.tipo === 'destaque') {
      filhos.push(caixaWord(b.texto));
      filhos.push(new Paragraph({ text: '', spacing: { after: 160 } }));
      continue;
    }
    if (b.tipo === 'titulo') {
      if (b.nivel === 1) numeroSecao += 1;
      filhos.push(
        new Paragraph({
          spacing: { before: b.nivel === 1 ? 320 : 220, after: 120 },
          border: b.nivel === 1 && !oficio ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRONZE_HEX, space: 4 } } : undefined,
          children: [
            new TextRun({
              text: oficio ? b.texto : b.nivel === 1 ? `${numeroSecao}. ${b.texto.toUpperCase()}` : b.texto,
              bold: true,
              font: FONTE,
              size: b.nivel === 1 ? 26 : b.nivel === 2 ? 23 : 21,
              color: b.nivel === 3 ? '333333' : '111111',
            }),
          ],
        })
      );
    } else if (b.tipo === 'paragrafo') {
      filhos.push(new Paragraph({ spacing: { after: 140, line: 300 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: b.texto, font: FONTE, size: oficio ? 22 : 21, color: oficio ? '111111' : '333333' })] }));
    } else if (b.tipo === 'destaque') {
      filhos.push(
        new Paragraph({
          spacing: { before: 120, after: 160 },
          indent: { left: 240 },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: BRONZE_HEX, space: 10 } },
          shading: { fill: 'FBF6EE', type: ShadingType.CLEAR, color: 'auto' },
          children: [new TextRun({ text: b.texto, italics: true, font: FONTE, size: 21, color: '333333' })],
        })
      );
    } else if (b.tipo === 'lista') {
      instanciaLista += 1;
      b.itens.forEach((item) =>
        filhos.push(
          new Paragraph({
            numbering: { reference: b.ordenada ? 'jmt-numerada' : 'jmt-marcadores', level: 0, instance: instanciaLista },
            spacing: { after: 60 },
            children: [new TextRun({ text: item, font: FONTE, size: 21, color: '333333' })],
          })
        )
      );
      filhos.push(new Paragraph({ text: '', spacing: { after: 80 } }));
    } else if (b.tipo === 'tabela') {
      filhos.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: b.cabecalho.map((c) => celula(c, true)) }),
            ...b.linhas.map((l) => new TableRow({ children: l.map((c) => celula(c)) })),
            ...(cotacao && linhaTotalCotacao(b.cabecalho, b.linhas) ? [new TableRow({ children: linhaTotalCotacao(b.cabecalho, b.linhas)!.map((c) => celula(c, true)) })] : []),
          ],
        })
      );
      filhos.push(new Paragraph({ text: '', spacing: { after: 160 } }));
    } else if (b.tipo === 'checklist' && b.itens.length) {
      if (b.titulo) filhos.push(new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: b.titulo, bold: true, font: FONTE, size: 21, color: '111111' })] }));
      if (b.opcoes?.length) {
        const opcoes = b.opcoes;
        filhos.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ tableHeader: true, children: ['Item', ...opcoes, ...(b.comObservacao ? ['Observação'] : [])].map((c) => celula(c, true)) }),
              ...b.itens.map(
                (it) =>
                  new TableRow({
                    children: [celula(it.texto), ...opcoes.map((o) => celula(it.resposta === o ? '☒' : '☐')), ...(b.comObservacao ? [celula(it.obs || '')] : [])],
                  })
              ),
            ],
          })
        );
      } else {
        b.itens.forEach((it) =>
          filhos.push(new Paragraph({ spacing: { after: 60 }, indent: { left: 240 }, children: [new TextRun({ text: `${it.marcado ? '☒' : '☐'}  ${it.texto}`, font: FONTE, size: 21, color: '333333' })] }))
        );
      }
      filhos.push(new Paragraph({ text: '', spacing: { after: 160 } }));
    } else if (b.tipo === 'imagem') {
      const img = imagens.get(b.ref);
      if (!img) continue;
      // Largura útil da página A4 com margens ≈ 600 px
      let w = (600 * (b.largura || 100)) / 100;
      let h = (w * img.h) / img.w;
      if (h > 820) {
        w = (w * 820) / h;
        h = 820;
      }
      filhos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: b.legenda ? 60 : 200 },
          children: [new ImageRun({ type: 'jpg', data: base64ParaBytes(img.dataUrl), transformation: { width: Math.round(w), height: Math.round(h) } })],
        })
      );
      if (b.legenda)
        filhos.push(
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: b.legenda, italics: true, font: FONTE, size: 17, color: '777777' })] })
        );
    } else if (b.tipo === 'assinaturas' && b.pessoas.length) {
      const porLinha = b.pessoas.length === 4 ? 2 : Math.min(3, b.pessoas.length);
      const nada = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
      const centro = (children: InstanceType<typeof TextRun>[], extra: Record<string, unknown> = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children, ...extra });
      const linhasTabela: InstanceType<typeof TableRow>[] = [];
      for (let i = 0; i < b.pessoas.length; i += porLinha) {
        const grupo = b.pessoas.slice(i, i + porLinha);
        linhasTabela.push(
          new TableRow({
            cantSplit: true,
            children: Array.from({ length: porLinha }, (_, k) => {
              const pessoa = grupo[k];
              const filhosCelula = pessoa
                ? [
                    centro([new TextRun({ text: (pessoa.papel || ' ').toUpperCase(), bold: true, font: FONTE, size: 14, color: BRONZE_HEX })]),
                    new Paragraph({ text: '', spacing: { before: 480, after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '111111', space: 1 } } }),
                    centro([new TextRun({ text: pessoa.nome || 'Nome: ________________', bold: true, font: FONTE, size: 18, color: '111111' })], { spacing: { before: 60, after: 20 } }),
                    ...(pessoa.cargo ? [centro([new TextRun({ text: pessoa.cargo, font: FONTE, size: 16, color: '777777' })])] : []),
                    ...(b.comData ? [centro([new TextRun({ text: `Data: ${pessoa.data || '____/____/________'}`, font: FONTE, size: 16, color: '777777' })])] : []),
                  ]
                : [new Paragraph({ text: '' })];
              return new TableCell({
                width: { size: Math.floor(100 / porLinha), type: WidthType.PERCENTAGE },
                borders: { top: nada, bottom: nada, left: nada, right: nada },
                margins: { top: 120, bottom: 200, left: 240, right: 240 },
                children: filhosCelula,
              });
            }),
          })
        );
      }
      filhos.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      filhos.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: nada, bottom: nada, left: nada, right: nada, insideHorizontal: nada, insideVertical: nada },
          rows: linhasTabela,
        })
      );
      filhos.push(new Paragraph({ text: '', spacing: { after: 160 } }));
    }
  }

  const logo = base64ParaBytes(JMT_LOGO_BASE64);
  const documento = new Document({
    creator: EMPRESA_REGULAMENTO.razaoSocial,
    title: d.titulo,
    numbering: {
      config: [
        { reference: 'jmt-marcadores', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 260 } } } }] },
        { reference: 'jmt-numerada', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1500, bottom: 1300, left: 1134, right: 1134 } } },
        headers: {
          default: new Header({
            children: info
              ? [
                  new Paragraph({
                    tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRONZE_HEX, space: 6 } },
                    children: [
                      new ImageRun({ type: 'png', data: logo, transformation: { width: 130, height: 49 } }),
                      new TextRun({ text: `\t${d.tipo === 'Comunicado' ? 'COMUNICADO' : 'INFORMATIVO'} · ${mesAno(d)}`, bold: true, font: FONTE, size: 16, color: '111111' }),
                    ],
                  }),
                ]
              : oficio
              ? [
                  new Paragraph({
                    tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                    children: [
                      new ImageRun({ type: 'png', data: logo, transformation: { width: 140, height: 53 } }),
                      new TextRun({ text: `\t${EMPRESA_REGULAMENTO.razaoSocial}`, bold: true, font: FONTE, size: 17, color: '111111' }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRONZE_HEX, space: 6 } },
                    children: [new TextRun({ text: `CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, font: FONTE, size: 15, color: '787878' })],
                  }),
                ]
              : [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRONZE_HEX, space: 6 } },
                children: [
                  new ImageRun({ type: 'png', data: logo, transformation: { width: 130, height: 49 } }),
                  new TextRun({ text: `\t${d.codigo || 'RASCUNHO'} · Versão ${d.versao}`, bold: true, font: FONTE, size: 16, color: '111111' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: info
              ? [
                  new Paragraph({
                    tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 } },
                    children: [
                      new TextRun({ text: `${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, font: FONTE, size: 14, color: '787878' }),
                      new TextRun({ children: ['\tPágina ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], font: FONTE, size: 14, color: '787878' }),
                    ],
                  }),
                ]
              : oficio
              ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    border: { top: { style: BorderStyle.SINGLE, size: 6, color: BRONZE_HEX, space: 4 } },
                    children: [new TextRun({ text: enderecoEmpresa(), font: FONTE, size: 14, color: '787878' })],
                  }),
                ]
              : [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 } },
                children: [
                  new TextRun({ text: `${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, font: FONTE, size: 14, color: '787878' }),
                  new TextRun({ children: ['\tPágina ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], font: FONTE, size: 14, color: '787878' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: d.status === 'Vigente' ? `${d.classificacao} · Documento controlado — cópia impressa não é controlada` : `${d.classificacao} · ${d.status.toUpperCase()} — não usar como versão oficial`,
                    font: FONTE,
                    size: 14,
                    color: BRONZE_ESCURO_HEX,
                  }),
                ],
              }),
            ],
          }),
        },
        children: filhos,
      },
    ],
  });
  const blob = await Packer.toBlob(documento);
  return new File([blob], nomeArquivo(d, 'docx'), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// ---------------------------------------------------------------------------
// Excel — cada tabela vira uma aba; o texto (se houver) vai numa aba "Documento".
// ---------------------------------------------------------------------------
export async function gerarXlsxDocumento(d: DocumentoPadronizado): Promise<File> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA_REGULAMENTO.razaoSocial;
  const logoId = wb.addImage({ base64: JMT_LOGO_BASE64.split(',')[1], extension: 'png' });
  const bronze = { argb: `FF${BRONZE_HEX}` };
  const fundoCab = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF8F0E4' } };
  const bordaFina = { style: 'thin' as const, color: { argb: 'FFDDDDDD' } };

  const cabecalhoAba = (ws: any, subtitulo: string, colunas: number) => {
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 56 } });
    ws.getRow(1).height = 24;
    ws.getRow(2).height = 24;
    const ultima = Math.max(colunas, 3);
    ws.mergeCells(1, 3, 1, ultima);
    ws.getCell(1, 3).value = d.titulo.toUpperCase();
    ws.getCell(1, 3).font = { bold: true, size: 13, color: { argb: 'FF111111' } };
    ws.getCell(1, 3).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.mergeCells(2, 3, 2, ultima);
    ws.getCell(2, 3).value = `${d.codigo || 'RASCUNHO'} · Versão ${d.versao} · ${dataBr(d.dataDocumento)} · ${subtitulo}`;
    ws.getCell(2, 3).font = { size: 9, color: bronze };
    ws.getCell(2, 3).alignment = { horizontal: 'right', vertical: 'middle' };
    for (let c = 1; c <= ultima; c++) ws.getCell(3, c).border = { bottom: { style: 'medium', color: bronze } };
    ws.addRow([]);
  };

  const tabelas = d.blocos.filter((b): b is Extract<BlocoDocumento, { tipo: 'tabela' }> => b.tipo === 'tabela');
  const textos = d.blocos.filter((b) => b.tipo !== 'tabela');
  const nomes = new Set<string>();
  const nomeAba = (base: string) => {
    let n = base.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Tabela';
    let k = 2;
    while (nomes.has(n)) n = `${n.slice(0, 25)} ${k++}`;
    nomes.add(n);
    return n;
  };

  if (textos.length > 0 || tabelas.length === 0) {
    const ws = wb.addWorksheet(nomeAba('Documento'));
    ws.getColumn(1).width = 110;
    cabecalhoAba(ws, 'Texto', 3);
    quadroControle(d).forEach(([k, v]) => {
      const r = ws.addRow([`${k}: ${v}`]);
      r.getCell(1).font = { size: 9, color: { argb: 'FF555555' } };
    });
    ws.addRow([]);
    textos.forEach((b) => {
      if (b.tipo === 'titulo') {
        const r = ws.addRow([b.texto]);
        r.getCell(1).font = { bold: true, size: b.nivel === 1 ? 13 : 11, color: { argb: 'FF111111' } };
      } else if (b.tipo === 'lista') b.itens.forEach((it, i) => ws.addRow([`${b.ordenada ? `${i + 1}.` : '•'} ${it}`]).getCell(1).alignment = { wrapText: true });
      else if (b.tipo === 'paragrafo' || b.tipo === 'destaque') ws.addRow([b.texto]).getCell(1).alignment = { wrapText: true, vertical: 'top' };
      else if (b.tipo === 'assinaturas')
        b.pessoas.forEach((p) => {
          ws.addRow([]);
          ws.addRow([`${p.papel ? `${p.papel}: ` : ''}______________________________   ${[p.nome, p.cargo].filter(Boolean).join(' — ')}${b.comData ? `   Data: ${p.data || '____/____/________'}` : ''}`]);
        });
      else if (b.tipo === 'checklist') {
        if (b.titulo) ws.addRow([b.titulo]).getCell(1).font = { bold: true, size: 11 };
        b.itens.forEach((it) =>
          ws.addRow([b.opcoes?.length ? `${it.texto}   ${b.opcoes.map((o) => `${it.resposta === o ? '☒' : '☐'} ${o}`).join('   ')}${it.obs ? `   Obs.: ${it.obs}` : ''}` : `${it.marcado ? '☒' : '☐'} ${it.texto}`]).getCell(1).alignment = { wrapText: true }
        );
      } else if (b.tipo === 'imagem') ws.addRow([`[Imagem${b.legenda ? `: ${b.legenda}` : ''} — veja no PDF ou Word]`]).getCell(1).font = { italic: true, size: 9, color: { argb: 'FF777777' } };
    });
  }
  tabelas.forEach((t, i) => {
    // Nome da aba = título logo antes da tabela, quando houver.
    const idx = d.blocos.indexOf(t);
    const anterior = d.blocos.slice(0, idx).reverse().find((b) => b.tipo === 'titulo') as Extract<BlocoDocumento, { tipo: 'titulo' }> | undefined;
    const ws = wb.addWorksheet(nomeAba(anterior?.texto || `Tabela ${i + 1}`), { views: [{ state: 'frozen', ySplit: 5 }] });
    cabecalhoAba(ws, anterior?.texto || `Tabela ${i + 1}`, t.cabecalho.length);
    const cab = ws.addRow(t.cabecalho);
    cab.eachCell((c: any) => {
      c.font = { bold: true, color: { argb: 'FF111111' } };
      c.fill = fundoCab;
      c.border = { top: bordaFina, bottom: { style: 'medium', color: bronze }, left: bordaFina, right: bordaFina };
      c.alignment = { vertical: 'middle', wrapText: true };
    });
    t.linhas.forEach((l, k) => {
      const linha = ws.addRow(l.map((v) => (/^-?\d{1,12}(?:,\d+)?$/.test(v) && !/^0\d/.test(v) ? Number(v.replace(',', '.')) : v)));
      linha.eachCell({ includeEmpty: true }, (c: any) => {
        c.border = { top: bordaFina, bottom: bordaFina, left: bordaFina, right: bordaFina };
        if (k % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFAF7' } };
        c.alignment = { vertical: 'top', wrapText: true };
      });
    });
    t.cabecalho.forEach((c, j) => {
      const maior = Math.max(c.length, ...t.linhas.map((l) => (l[j] || '').length));
      ws.getColumn(j + 1).width = Math.min(60, Math.max(10, maior + 2));
    });
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: t.cabecalho.length } };
  });


  wb.eachSheet((ws: any) => {
    ws.headerFooter.oddFooter = `&L&8${EMPRESA_REGULAMENTO.razaoSocial} — ${d.codigo || 'RASCUNHO'} v${d.versao}&R&8Página &P de &N`;
    ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  });
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], nomeArquivo(d, 'xlsx'), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
