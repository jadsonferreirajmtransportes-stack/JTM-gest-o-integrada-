// ============================================================================
// Imagem do comunicado para WhatsApp (PNG 1080×1350, formato retrato 4:5) nos
// modelos prontos da identidade JMT. Desenhada direto no <canvas> — sem
// html2canvas (que quebra com as cores oklch do tema, ver comprasPdf.ts).
//
// Cada TIPO (aviso, urgente, segurança...) tem as cores e o rótulo; cada
// ESTILO (1 a 5) é um layout diferente com essas cores:
//   1 Clássico · 2 Faixa lateral · 3 Cartão · 4 Bloco no topo · 5 Pôster
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
  /** Cor de destaque legível sobre fundo branco (cartão, bloco no topo). */
  destaqueClaro: string;
  /** Bloco colorido do estilo "Bloco no topo" e texto sobre ele. */
  bloco: string | [string, string];
  blocoTexto: string;
  blocoEscuro: boolean;
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
    destaqueClaro: '#C48229',
    bloco: ['#C48229', '#92611F'],
    blocoTexto: '#FFFFFF',
    blocoEscuro: true,
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
    destaqueClaro: '#D23A2C',
    bloco: ['#E2483A', '#A92A1F'],
    blocoTexto: '#FFFFFF',
    blocoEscuro: true,
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
    destaqueClaro: '#B88900',
    bloco: '#F2B705',
    blocoTexto: '#1E1C19',
    blocoEscuro: false,
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
    destaqueClaro: '#92611F',
    bloco: ['#C48229', '#7A4F17'],
    blocoTexto: '#FFFFFF',
    blocoEscuro: true,
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
    destaqueClaro: '#92611F',
    bloco: ['#22252B', '#121316'],
    blocoTexto: '#FFFFFF',
    blocoEscuro: true,
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
    destaqueClaro: '#92611F',
    bloco: ['#2C3038', '#121316'],
    blocoTexto: '#FFFFFF',
    blocoEscuro: true,
  },
};

export const ESTILOS_IMAGEM: { id: number; nome: string; descricao: string }[] = [
  { id: 1, nome: 'Clássico', descricao: 'Logo no alto, rótulo, título grande e texto' },
  { id: 2, nome: 'Faixa lateral', descricao: 'Faixa colorida à esquerda com o rótulo na vertical' },
  { id: 3, nome: 'Cartão', descricao: 'Conteúdo num cartão branco sobre o fundo colorido' },
  { id: 4, nome: 'Bloco no topo', descricao: 'Título dentro de um bloco de cor; texto embaixo, no claro' },
  { id: 5, nome: 'Pôster', descricao: 'Tudo centralizado, com moldura' },
];

export interface DadosImagem {
  modelo: ModeloImagem;
  /** Layout 1 a 5 (ver ESTILOS_IMAGEM); sem valor = 1 (Clássico). */
  estilo?: number;
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

function preencher(ctx: CanvasRenderingContext2D, cor: string | [string, string], x: number, y: number, w: number, h: number) {
  if (Array.isArray(cor)) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, cor[0]);
    g.addColorStop(1, cor[1]);
    ctx.fillStyle = g;
  } else ctx.fillStyle = cor;
  ctx.fillRect(x, y, w, h);
}

/** Texto do comunicado sem o {nome} (a imagem é a mesma pra todo mundo). */
export function textoParaImagem(corpo: string): string {
  return corpo
    .replace(/^\s*(olá|ola|oi|prezado\(a\)|prezados?|prezadas?)\s*,?\s*\{nome\}\s*[!,.]?\s*/i, '')
    .replace(/,?\s*\{nome\}/gi, '')
    .trim();
}

// ---- Decorações de cada tipo (zebra, confete, arcos...) ------------------------------------
function decorar(ctx: CanvasRenderingContext2D, modelo: ModeloImagem, tema: Tema, area: { x: number; y: number; w: number; h: number }, opc: { faixas?: boolean } = {}) {
  const { x, y, w, h } = area;
  if (modelo === 'aviso' && opc.faixas !== false) {
    ctx.fillStyle = tema.destaque;
    ctx.fillRect(x, y, w, 18);
    ctx.fillRect(x, y + h - 18, w, 18);
  } else if (modelo === 'seguranca' && opc.faixas !== false) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, 36);
    ctx.rect(x, y + h - 36, w, 36);
    ctx.clip();
    ctx.fillStyle = '#F2B705';
    for (let sx = x - 60; sx < x + w + 60; sx += 60) {
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + 30, y);
      ctx.lineTo(sx + 30 - A / 20, y + A);
      ctx.lineTo(sx - A / 20, y + A);
      ctx.fill();
    }
    ctx.restore();
  } else if (modelo === 'parabens') {
    const cores = ['rgba(255,255,255,0.35)', 'rgba(255,236,200,0.45)', 'rgba(255,255,255,0.2)'];
    let semente = 7;
    const aleatorio = () => ((semente = (semente * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = cores[i % cores.length];
      ctx.save();
      ctx.translate(x + aleatorio() * w, y + aleatorio() * Math.min(360, h));
      ctx.rotate(aleatorio() * Math.PI);
      ctx.fillRect(-7, -3, 14, 6 + aleatorio() * 10);
      ctx.restore();
    }
  } else if (modelo === 'evento') {
    ctx.fillStyle = '#F6EFE4';
    ctx.fillRect(x, y, w, Math.min(230, h));
  } else if (modelo === 'comercial' || modelo === 'urgente') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = tema.destaque;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 3;
    for (let r = 220; r < 900; r += 70) {
      ctx.beginPath();
      ctx.arc(x + w + 40, y - 40, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Desenha a imagem e devolve o PNG. Também diz se o texto foi cortado. */
export async function gerarImagemComunicado(d: DadosImagem): Promise<{ blob: Blob; textoCortado: boolean }> {
  await Promise.all([
    document.fonts?.load('800 80px "Bricolage Grotesque"').catch(() => undefined),
    document.fonts?.load('500 40px "Hanken Grotesk"').catch(() => undefined),
    document.fonts?.load('700 30px "Hanken Grotesk"').catch(() => undefined),
  ]);
  const tema = MODELOS_IMAGEM[d.modelo];
  const estilo = d.estilo && d.estilo >= 1 && d.estilo <= 5 ? d.estilo : 1;
  const canvas = document.createElement('canvas');
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext('2d')!;
  const fonteTitulo = (px: number) => `800 ${px}px "Bricolage Grotesque", "Hanken Grotesk", Arial, sans-serif`;
  const fonteTexto = (peso: number, px: number) => `${peso} ${px}px "Hanken Grotesk", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';

  // Paleta e área do conteúdo — mudam conforme o estilo.
  let cores = { texto: tema.texto, suave: tema.textoSuave, destaque: tema.destaque, escuro: tema.escuro, rotuloFundo: tema.rotuloFundo, rotuloTexto: tema.rotuloTexto, caixa: tema.escuro ? 'rgba(255,255,255,0.10)' : '#F6EFE4' };
  const coresClaras = { texto: '#16130F', suave: '#4A443C', destaque: tema.destaqueClaro, escuro: false, rotuloFundo: tema.rotuloFundo === '#FFFFFF' ? tema.destaqueClaro : tema.rotuloFundo, rotuloTexto: tema.rotuloFundo === '#FFFFFF' ? '#FFFFFF' : tema.rotuloTexto, caixa: '#F6EFE4' };
  let x = MARGEM;
  let largura = L - 2 * MARGEM;
  let centro = false;
  let yLogo = 92;
  let yRotulo = 290;
  let rodapeY = A - 150;
  let mostrarRotulo = true;
  let tituloNoBloco: { fim: number } | null = null;

  // ---- Fundo e moldura de cada estilo ----
  if (estilo === 1) {
    preencher(ctx, tema.fundo, 0, 0, L, A);
    decorar(ctx, d.modelo, tema, { x: 0, y: 0, w: L, h: A });
  } else if (estilo === 2) {
    preencher(ctx, tema.fundo, 0, 0, L, A);
    const faixa = 150;
    preencher(ctx, tema.rotuloFundo === '#FFFFFF' ? 'rgba(255,255,255,0.92)' : tema.rotuloFundo, 0, 0, faixa, A);
    if (d.modelo === 'seguranca') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, faixa, A);
      ctx.clip();
      ctx.fillStyle = '#1E1C19';
      for (let sy = -80; sy < A + 80; sy += 80) {
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(faixa, sy - 60);
        ctx.lineTo(faixa, sy - 20);
        ctx.lineTo(0, sy + 40);
        ctx.fill();
      }
      ctx.restore();
    }
    // Rótulo grande na vertical
    ctx.save();
    ctx.translate(faixa / 2 + 26, A - 90);
    ctx.rotate(-Math.PI / 2);
    ctx.font = fonteTitulo(84);
    ctx.fillStyle = d.modelo === 'seguranca' ? '#FFFFFF' : tema.rotuloTexto;
    if (d.modelo === 'seguranca') {
      ctx.strokeStyle = '#1E1C19';
      ctx.lineWidth = 10;
      ctx.strokeText(tema.rotulo, 0, 0);
    }
    ctx.fillText(tema.rotulo, 0, 0);
    ctx.restore();
    if (d.modelo === 'parabens') decorar(ctx, d.modelo, tema, { x: faixa, y: 0, w: L - faixa, h: A });
    if (d.modelo === 'comercial' || d.modelo === 'urgente') decorar(ctx, d.modelo, tema, { x: faixa, y: 0, w: L - faixa, h: A });
    x = faixa + 72;
    largura = L - x - MARGEM + 10;
    mostrarRotulo = false;
    yRotulo = 250;
  } else if (estilo === 3) {
    preencher(ctx, tema.escuro ? tema.fundo : tema.bloco, 0, 0, L, A);
    decorar(ctx, d.modelo, tema, { x: 0, y: 0, w: L, h: A }, { faixas: false });
    if (d.modelo === 'seguranca') decorar(ctx, d.modelo, tema, { x: 0, y: 0, w: L, h: A });
    const m = 58;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#FFFFFF';
    retanguloArredondado(ctx, m, m + 20, L - 2 * m, A - 2 * m - 40, 40);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = coresClaras.destaque;
    retanguloArredondado(ctx, m, m + 20, L - 2 * m, 14, 7);
    ctx.fill();
    cores = coresClaras;
    x = m + 64;
    largura = L - 2 * x;
    yLogo = m + 100;
    yRotulo = m + 290;
    rodapeY = A - m - 20 - 150;
  } else if (estilo === 4) {
    const H = 640;
    preencher(ctx, '#FFFFFF', 0, 0, L, A);
    preencher(ctx, tema.bloco, 0, 0, L, H);
    if (d.modelo === 'parabens') decorar(ctx, d.modelo, tema, { x: 0, y: 0, w: L, h: H });
    if (d.modelo === 'seguranca') decorar(ctx, d.modelo, tema, { x: 0, y: H, w: L, h: A - H }, {});
    if (d.modelo === 'comercial' || d.modelo === 'urgente') decorar(ctx, d.modelo, { ...tema, destaque: '#FFFFFF' }, { x: 0, y: 0, w: L, h: H });
    // Ondinha separando o bloco
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.quadraticCurveTo(L / 2, H - 70, L, H);
    ctx.lineTo(L, H + 2);
    ctx.lineTo(0, H + 2);
    ctx.fill();
    cores = {
      texto: tema.blocoTexto,
      suave: tema.blocoTexto,
      destaque: tema.blocoEscuro ? '#FFFFFF' : '#1E1C19',
      escuro: tema.blocoEscuro,
      rotuloFundo: tema.blocoEscuro ? '#FFFFFF' : '#1E1C19',
      rotuloTexto: tema.blocoEscuro ? (Array.isArray(tema.bloco) ? tema.bloco[1] : tema.bloco) : '#F2B705',
      caixa: '#F6EFE4',
    };
    tituloNoBloco = { fim: H };
  } else {
    // 5 — Pôster: centralizado, moldura
    preencher(ctx, tema.fundo, 0, 0, L, A);
    decorar(ctx, d.modelo, tema, { x: 0, y: 0, w: L, h: A }, { faixas: false });
    ctx.strokeStyle = tema.destaque;
    ctx.lineWidth = 4;
    retanguloArredondado(ctx, 36, 36, L - 72, A - 72, 30);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    retanguloArredondado(ctx, 52, 52, L - 104, A - 104, 22);
    ctx.stroke();
    ctx.globalAlpha = 1;
    centro = true;
    x = MARGEM + 20;
    largura = L - 2 * x;
    yLogo = 110;
  }

  const meio = L / 2;
  const alinhar = () => {
    ctx.textAlign = centro ? 'center' : 'left';
  };
  const xTexto = centro ? meio : x;

  // ---- Logo ----
  if (cores.escuro) {
    const icone = await carregarImagem(JMT_ICON_DARK_BASE64);
    const h = 74;
    const w = (icone.width / icone.height) * h;
    ctx.font = fonteTexto(800, 30);
    const larguraNome = ctx.measureText('JOBSON DE MORAES').width;
    const total = w + 18 + larguraNome;
    const x0 = centro ? meio - total / 2 : x;
    ctx.drawImage(icone, x0, yLogo - 6, w, h);
    ctx.textAlign = 'left';
    ctx.fillStyle = cores.texto;
    ctx.fillText('JOBSON DE MORAES', x0 + w + 18, yLogo + 34);
    ctx.font = fonteTexto(600, 17);
    ctx.fillStyle = cores.suave;
    ctx.fillText('T R A N S P O R T E S', x0 + w + 20, yLogo + 60);
  } else {
    const logo = await carregarImagem(JMT_LOGO_BASE64);
    const w = 420;
    const h = (logo.height / logo.width) * w;
    ctx.drawImage(logo, centro ? meio - w / 2 : x - 8, yLogo - 22, w, h);
  }
  if (d.numero) {
    ctx.font = fonteTexto(700, 24);
    ctx.fillStyle = cores.suave;
    ctx.textAlign = 'right';
    ctx.fillText(`Nº ${d.numero}`, centro ? L - 80 : x + largura, centro ? 96 : yLogo + 34);
    ctx.textAlign = 'left';
  }
  let y = yRotulo;

  // ---- Rótulo ----
  if (mostrarRotulo) {
    ctx.font = fonteTexto(800, 26);
    const larguraRotulo = ctx.measureText(tema.rotulo).width + 52;
    const xr = centro ? meio - larguraRotulo / 2 : x;
    ctx.fillStyle = cores.rotuloFundo;
    retanguloArredondado(ctx, xr, y - 40, larguraRotulo, 56, 28);
    ctx.fill();
    ctx.fillStyle = cores.rotuloTexto;
    ctx.textAlign = 'left';
    ctx.fillText(tema.rotulo, xr + 26, y - 3);
    y += 70;
  }

  // ---- Título (diminui a fonte se for longo) ----
  let tamanhoTitulo = 86;
  let linhasTitulo: string[] = [];
  const maxLinhasTitulo = tituloNoBloco ? 3 : 4;
  for (; tamanhoTitulo >= 52; tamanhoTitulo -= 6) {
    ctx.font = fonteTitulo(tamanhoTitulo);
    linhasTitulo = quebrar(ctx, d.titulo.trim(), largura, maxLinhasTitulo);
    if (linhasTitulo.length <= 3 && (!tituloNoBloco || y + linhasTitulo.length * tamanhoTitulo * 1.06 < tituloNoBloco.fim - 90)) break;
  }
  ctx.fillStyle = cores.texto;
  alinhar();
  linhasTitulo.forEach((l) => {
    ctx.fillText(l, xTexto, y + tamanhoTitulo * 0.8);
    y += tamanhoTitulo * 1.06;
  });
  y += 26;
  ctx.fillStyle = cores.destaque;
  ctx.fillRect(centro ? meio - 60 : x, y, 120, 8);
  y += 50;

  // A partir daqui (estilo 4) o conteúdo vai na parte clara.
  if (tituloNoBloco) {
    cores = coresClaras;
    y = Math.max(y, tituloNoBloco.fim + 40);
  }

  // ---- Bloco de destaque (data/local etc.) ----
  if (d.destaque?.trim()) {
    ctx.font = fonteTexto(700, 36);
    const linhas = quebrar(ctx, d.destaque.trim(), largura - 64, 2);
    const h = linhas.length * 46 + 44;
    ctx.fillStyle = cores.caixa;
    retanguloArredondado(ctx, x, y, largura, h, 22);
    ctx.fill();
    ctx.fillStyle = cores.destaque;
    if (!centro) ctx.fillRect(x, y, 10, h);
    ctx.fillStyle = cores.texto;
    alinhar();
    linhas.forEach((l, i) => ctx.fillText(l, centro ? meio : x + 40, y + 58 + i * 46));
    ctx.textAlign = 'left';
    y += h + 40;
  }

  // ---- Foto opcional ----
  if (d.fotoUrl) {
    try {
      const foto = await carregarImagem(d.fotoUrl);
      const w = largura;
      const h = Math.min(400, rodapeY - y - 200);
      if (h > 160) {
        ctx.save();
        retanguloArredondado(ctx, x, y, w, h, 28);
        ctx.clip();
        const escala = Math.max(w / foto.width, h / foto.height);
        const fw = foto.width * escala;
        const fh = foto.height * escala;
        ctx.drawImage(foto, x + (w - fw) / 2, y + (h - fh) / 2, fw, fh);
        ctx.restore();
        y += h + 40;
      }
    } catch {
      /* foto não carregou — segue sem ela */
    }
  }

  // ---- Texto (sem os asteriscos do negrito do WhatsApp) ----
  const textoLimpo = d.texto.replace(/\*([^*\n]+)\*/g, '$1').trim();
  let tamanhoTexto = 46;
  let linhasTexto: string[] = [];
  let cortado = false;
  for (; tamanhoTexto >= 30; tamanhoTexto -= 2) {
    ctx.font = fonteTexto(500, tamanhoTexto);
    const max = Math.max(1, Math.floor((rodapeY - 30 - y) / (tamanhoTexto * 1.4)));
    linhasTexto = quebrar(ctx, textoLimpo, largura, max);
    cortado = linhasTexto.length > 0 && linhasTexto[linhasTexto.length - 1].endsWith('…') && !textoLimpo.endsWith('…');
    if (!cortado) break;
  }
  ctx.fillStyle = cores.suave;
  alinhar();
  linhasTexto.forEach((l) => {
    ctx.fillText(l, xTexto, y + tamanhoTexto);
    y += tamanhoTexto * 1.4;
  });

  // ---- Rodapé ----
  ctx.fillStyle = cores.escuro ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)';
  ctx.fillRect(x, rodapeY, largura, 2);
  alinhar();
  ctx.font = fonteTexto(800, 30);
  ctx.fillStyle = cores.texto;
  ctx.fillText(d.assinatura, xTexto, rodapeY + 58);
  ctx.font = fonteTexto(600, 24);
  ctx.fillStyle = cores.suave;
  ctx.fillText('JM Transportes · Parnamirim/RN', xTexto, rodapeY + 96);
  ctx.textAlign = 'left';

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem.'))), 'image/png')
  );
  return { blob, textoCortado: cortado };
}
