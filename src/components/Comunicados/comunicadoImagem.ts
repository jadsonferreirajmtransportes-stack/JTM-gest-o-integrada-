// ============================================================================
// Imagem do comunicado para WhatsApp (PNG 1080×1350, formato retrato 4:5) nos
// modelos prontos da identidade JMT. Desenhada direto no <canvas> — sem
// html2canvas (que quebra com as cores oklch do tema, ver comprasPdf.ts).
// ============================================================================

import { JMT_LOGO_BASE64, JMT_ICON_DARK_BASE64 } from '../../data/jmtLogoBase64';
import type { ModeloImagem } from '../../utils/comunicadosApi';

const L = 1080;
const A = 1350;
const MARGEM = 84;

interface Tema {
  rotulo: string;
  fundo: string | [string, string];
  texto: string;
  textoSuave: string;
  destaque: string;
  rotuloFundo: string;
  rotuloTexto: string;
  escuro: boolean;
}

export const MODELOS_IMAGEM: Record<ModeloImagem, Tema & { nome: string; descricao: string }> = {
  aviso: {
    nome: 'Aviso',
    descricao: 'Claro, faixa bronze — avisos do dia a dia',
    rotulo: 'AVISO',
    fundo: '#FBF8F3',
    texto: '#16130F',
    textoSuave: '#4A443C',
    destaque: '#C48229',
    rotuloFundo: '#C48229',
    rotuloTexto: '#FFFFFF',
    escuro: false,
  },
  urgente: {
    nome: 'Urgente',
    descricao: 'Escuro com vermelho — comunicados urgentes',
    rotulo: 'URGENTE',
    fundo: '#17151A',
    texto: '#FFFFFF',
    textoSuave: '#D9D4CC',
    destaque: '#E2483A',
    rotuloFundo: '#E2483A',
    rotuloTexto: '#FFFFFF',
    escuro: true,
  },
  seguranca: {
    nome: 'Segurança',
    descricao: 'Faixa zebrada — segurança, EPI, trânsito',
    rotulo: 'SEGURANÇA',
    fundo: '#1E1C19',
    texto: '#FFFFFF',
    textoSuave: '#E5DFD4',
    destaque: '#F2B705',
    rotuloFundo: '#F2B705',
    rotuloTexto: '#1E1C19',
    escuro: true,
  },
  parabens: {
    nome: 'Parabéns',
    descricao: 'Bronze com confete — reconhecimento, aniversário, metas',
    rotulo: 'PARABÉNS',
    fundo: ['#C48229', '#7A4F17'],
    texto: '#FFFFFF',
    textoSuave: '#FBEFDD',
    destaque: '#FFFFFF',
    rotuloFundo: '#FFFFFF',
    rotuloTexto: '#7A4F17',
    escuro: true,
  },
  evento: {
    nome: 'Evento',
    descricao: 'Claro com bloco de data/local — reuniões, treinamentos, eventos',
    rotulo: 'EVENTO',
    fundo: '#FFFFFF',
    texto: '#16130F',
    textoSuave: '#4A443C',
    destaque: '#92611F',
    rotuloFundo: '#16130F',
    rotuloTexto: '#FFFFFF',
    escuro: false,
  },
  comercial: {
    nome: 'Comercial',
    descricao: 'Grafite e bronze — comunicados a clientes',
    rotulo: 'COMUNICADO',
    fundo: ['#22252B', '#121316'],
    texto: '#FFFFFF',
    textoSuave: '#D5D7DC',
    destaque: '#D9A35B',
    rotuloFundo: '#D9A35B',
    rotuloTexto: '#121316',
    escuro: true,
  },
};

export interface DadosImagem {
  modelo: ModeloImagem;
  titulo: string;
  texto: string;
  destaque?: string;
  assinatura: string;
  numero?: string;
  fotoUrl?: string;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
    img.src = src;
  });
}

/** Quebra o texto em linhas que cabem na largura; corta com "…" se passar de maxLinhas. */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split(/\n/)) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (palavras.length === 0) {
      if (linhas.length && linhas[linhas.length - 1] !== '') linhas.push('');
      continue;
    }
    let atual = '';
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(teste).width <= largura) atual = teste;
      else {
        if (atual) linhas.push(atual);
        atual = p;
      }
    }
    if (atual) linhas.push(atual);
  }
  while (linhas.length && linhas[linhas.length - 1] === '') linhas.pop();
  if (linhas.length > maxLinhas) {
    const cortadas = linhas.slice(0, maxLinhas);
    let ultima = cortadas[maxLinhas - 1];
    while (ultima && ctx.measureText(`${ultima}…`).width > largura) ultima = ultima.slice(0, -1);
    cortadas[maxLinhas - 1] = `${ultima.trimEnd()}…`;
    return cortadas;
  }
  return linhas;
}

function retanguloArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Texto do comunicado sem o {nome} (a imagem é a mesma pra todo mundo). */
export function textoParaImagem(corpo: string): string {
  return corpo
    .replace(/^\s*(olá|ola|oi|prezado\(a\)|prezados?|prezadas?)\s*,?\s*\{nome\}\s*[!,.]?\s*/i, '')
    .replace(/,?\s*\{nome\}/gi, '')
    .trim();
}

/** Desenha a imagem e devolve o PNG. Também diz se o texto foi cortado. */
export async function gerarImagemComunicado(d: DadosImagem): Promise<{ blob: Blob; textoCortado: boolean }> {
  await Promise.all([
    document.fonts?.load('800 80px "Bricolage Grotesque"').catch(() => undefined),
    document.fonts?.load('500 40px "Hanken Grotesk"').catch(() => undefined),
    document.fonts?.load('700 30px "Hanken Grotesk"').catch(() => undefined),
  ]);
  const tema = MODELOS_IMAGEM[d.modelo];
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext('2d')!;
  const fonteTitulo = (px: number) => `800 ${px}px "Bricolage Grotesque", "Hanken Grotesk", Arial, sans-serif`;
  const fonteTexto = (peso: number, px: number) => `${peso} ${px}px "Hanken Grotesk", Arial, sans-serif`;

  // Fundo
  if (Array.isArray(tema.fundo)) {
    const g = ctx.createLinearGradient(0, 0, L, A);
    g.addColorStop(0, tema.fundo[0]);
    g.addColorStop(1, tema.fundo[1]);
    ctx.fillStyle = g;
  } else ctx.fillStyle = tema.fundo;
  ctx.fillRect(0, 0, L, A);

  // Detalhes de cada modelo
  if (d.modelo === 'aviso') {
    ctx.fillStyle = tema.destaque;
    ctx.fillRect(0, 0, L, 18);
    ctx.fillRect(0, A - 18, L, 18);
  } else if (d.modelo === 'seguranca') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, L, 36);
    ctx.rect(0, A - 36, L, 36);
    ctx.clip();
    for (let x = -60; x < L + 60; x += 60) {
      ctx.fillStyle = tema.destaque;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 30 - A / 20, A);
      ctx.lineTo(x - A / 20, A);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = tema.fundo as string;
  } else if (d.modelo === 'parabens') {
    const cores = ['rgba(255,255,255,0.35)', 'rgba(255,236,200,0.45)', 'rgba(255,255,255,0.2)'];
    let semente = 7;
    const aleatorio = () => ((semente = (semente * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = cores[i % cores.length];
      const x = aleatorio() * L;
      const y = aleatorio() * 360;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(aleatorio() * Math.PI);
      ctx.fillRect(-7, -3, 14, 6 + aleatorio() * 10);
      ctx.restore();
    }
  } else if (d.modelo === 'evento') {
    ctx.fillStyle = '#F6EFE4';
    ctx.fillRect(0, 0, L, 230);
  } else if (d.modelo === 'comercial' || d.modelo === 'urgente') {
    ctx.strokeStyle = tema.destaque;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 3;
    for (let r = 220; r < 900; r += 70) {
      ctx.beginPath();
      ctx.arc(L + 40, -40, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Logo
  let y = 92;
  if (tema.escuro) {
    const icone = await carregarImagem(JMT_ICON_DARK_BASE64);
    const h = 74;
    const w = (icone.width / icone.height) * h;
    ctx.drawImage(icone, MARGEM, y - 6, w, h);
    ctx.fillStyle = tema.texto;
    ctx.font = fonteTexto(800, 30);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('JOBSON DE MORAES', MARGEM + w + 18, y + 34);
    ctx.font = fonteTexto(600, 17);
    ctx.fillStyle = tema.textoSuave;
    ctx.fillText('T R A N S P O R T E S', MARGEM + w + 20, y + 60);
  } else {
    const logo = await carregarImagem(JMT_LOGO_BASE64);
    const w = 420;
    ctx.drawImage(logo, MARGEM - 8, y - 22, w, (logo.height / logo.width) * w);
  }
  if (d.numero) {
    ctx.font = fonteTexto(700, 24);
    ctx.fillStyle = tema.textoSuave;
    ctx.textAlign = 'right';
    ctx.fillText(`Nº ${d.numero}`, L - MARGEM, y + 34);
    ctx.textAlign = 'left';
  }
  y = 290;

  // Rótulo
  ctx.font = fonteTexto(800, 26);
  const larguraRotulo = ctx.measureText(tema.rotulo).width + 52;
  ctx.fillStyle = tema.rotuloFundo;
  retanguloArredondado(ctx, MARGEM, y - 40, larguraRotulo, 56, 28);
  ctx.fill();
  ctx.fillStyle = tema.rotuloTexto;
  ctx.fillText(tema.rotulo, MARGEM + 26, y - 3);
  y += 70;

  // Título (diminui a fonte se for longo)
  let tamanhoTitulo = 86;
  let linhasTitulo: string[] = [];
  for (; tamanhoTitulo >= 56; tamanhoTitulo -= 6) {
    ctx.font = fonteTitulo(tamanhoTitulo);
    linhasTitulo = quebrar(ctx, d.titulo.trim(), L - 2 * MARGEM, 4);
    if (linhasTitulo.length <= 3) break;
  }
  ctx.fillStyle = tema.texto;
  linhasTitulo.forEach((l) => {
    ctx.fillText(l, MARGEM, y + tamanhoTitulo * 0.8);
    y += tamanhoTitulo * 1.06;
  });
  y += 26;
  ctx.fillStyle = tema.destaque;
  ctx.fillRect(MARGEM, y, 120, 8);
  y += 50;

  const rodapeY = A - 150;

  // Bloco de destaque (data/local etc.)
  if (d.destaque?.trim()) {
    ctx.font = fonteTexto(700, 36);
    const linhas = quebrar(ctx, d.destaque.trim(), L - 2 * MARGEM - 64, 2);
    const h = linhas.length * 46 + 44;
    ctx.fillStyle = tema.escuro ? 'rgba(255,255,255,0.10)' : '#F6EFE4';
    retanguloArredondado(ctx, MARGEM, y, L - 2 * MARGEM, h, 22);
    ctx.fill();
    ctx.fillStyle = tema.destaque;
    ctx.fillRect(MARGEM, y, 10, h);
    ctx.fillStyle = tema.texto;
    linhas.forEach((l, i) => ctx.fillText(l, MARGEM + 40, y + 58 + i * 46));
    y += h + 40;
  }

  // Foto opcional
  if (d.fotoUrl) {
    try {
      const foto = await carregarImagem(d.fotoUrl);
      const w = L - 2 * MARGEM;
      const h = Math.min(400, rodapeY - y - 200);
      if (h > 160) {
        ctx.save();
        retanguloArredondado(ctx, MARGEM, y, w, h, 28);
        ctx.clip();
        const escala = Math.max(w / foto.width, h / foto.height);
        const fw = foto.width * escala;
        const fh = foto.height * escala;
        ctx.drawImage(foto, MARGEM + (w - fw) / 2, y + (h - fh) / 2, fw, fh);
        ctx.restore();
        y += h + 40;
      }
    } catch {
      /* foto não carregou — segue sem ela */
    }
  }

  // Texto (sem os asteriscos do negrito do WhatsApp)
  const textoLimpo = d.texto.replace(/\*([^*\n]+)\*/g, '$1').trim();
  let tamanhoTexto = 46;
  let linhasTexto: string[] = [];
  let cortado = false;
  for (; tamanhoTexto >= 30; tamanhoTexto -= 2) {
    ctx.font = fonteTexto(500, tamanhoTexto);
    const max = Math.max(1, Math.floor((rodapeY - 30 - y) / (tamanhoTexto * 1.4)));
    linhasTexto = quebrar(ctx, textoLimpo, L - 2 * MARGEM, max);
    cortado = linhasTexto.length > 0 && linhasTexto[linhasTexto.length - 1].endsWith('…') && !textoLimpo.endsWith('…');
    if (!cortado) break;
  }
  ctx.fillStyle = tema.textoSuave;
  linhasTexto.forEach((l) => {
    ctx.fillText(l, MARGEM, y + tamanhoTexto);
    y += tamanhoTexto * 1.4;
  });

  // Rodapé
  ctx.fillStyle = tema.escuro ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)';
  ctx.fillRect(MARGEM, rodapeY, L - 2 * MARGEM, 2);
  ctx.font = fonteTexto(800, 30);
  ctx.fillStyle = tema.texto;
  ctx.fillText(d.assinatura, MARGEM, rodapeY + 58);
  ctx.font = fonteTexto(600, 24);
  ctx.fillStyle = tema.textoSuave;
  ctx.fillText('JM Transportes · Parnamirim/RN', MARGEM, rodapeY + 96);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem.'))), 'image/png')
  );
  return { blob, textoCortado: cortado };
}
