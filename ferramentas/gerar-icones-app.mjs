// Gera os ícones dos apps instaláveis (PWA) a partir do símbolo da JMT:
//   public/icons/gestao-*.png   — JMT Gestão (fundo grafite)
//   public/icons/portal-*.png   — JMT Colaborador (fundo bronze)
// Uso: node ferramentas/gerar-icones-app.mjs
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const fonte = fs.readFileSync('src/data/jmtLogoBase64.ts', 'utf8');
const icone = fonte.match(/export const JMT_ICON_DARK_BASE64 = "([^"]+)"/)[1];
const img = await loadImage(Buffer.from(icone.split(',')[1], 'base64'));

const TEMAS = {
  gestao: { fundo: ['#2B2620', '#16130F'], faixa: '#C48229', branco: false },
  portal: { fundo: ['#C48229', '#7A4F17'], faixa: '#FFFFFF', branco: true },
};

function desenhar(tema, tamanho, mascaravel) {
  const c = createCanvas(tamanho, tamanho);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, tamanho, tamanho);
  g.addColorStop(0, tema.fundo[0]);
  g.addColorStop(1, tema.fundo[1]);
  ctx.fillStyle = g;
  if (mascaravel) ctx.fillRect(0, 0, tamanho, tamanho);
  else {
    const r = tamanho * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(tamanho, 0, tamanho, tamanho, r);
    ctx.arcTo(tamanho, tamanho, 0, tamanho, r);
    ctx.arcTo(0, tamanho, 0, 0, r);
    ctx.arcTo(0, 0, tamanho, 0, r);
    ctx.closePath();
    ctx.fill();
  }
  // Símbolo centralizado (área segura de 60% no ícone mascarável).
  const area = tamanho * (mascaravel ? 0.52 : 0.62);
  const escala = Math.min(area / img.width, area / img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  let simbolo = img;
  if (tema.branco) {
    // No fundo bronze, o traço bronze do símbolo sumiria: pinta o símbolo todo de branco.
    const t = createCanvas(img.width, img.height);
    const tc = t.getContext('2d');
    tc.drawImage(img, 0, 0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = '#FFFFFF';
    tc.fillRect(0, 0, img.width, img.height);
    simbolo = t;
  }
  ctx.drawImage(simbolo, (tamanho - w) / 2, (tamanho - h) / 2 - tamanho * 0.03, w, h);
  // Faixa de assinatura embaixo.
  ctx.fillStyle = tema.faixa;
  const fw = tamanho * 0.34;
  ctx.fillRect((tamanho - fw) / 2, tamanho * (mascaravel ? 0.74 : 0.8), fw, Math.max(2, tamanho * 0.025));
  return c.toBuffer('image/png');
}

fs.mkdirSync('public/icons', { recursive: true });
for (const [nome, tema] of Object.entries(TEMAS)) {
  for (const t of [192, 512]) fs.writeFileSync(path.join('public/icons', `${nome}-${t}.png`), desenhar(tema, t, false));
  fs.writeFileSync(path.join('public/icons', `${nome}-mascaravel-512.png`), desenhar(tema, 512, true));
  fs.writeFileSync(path.join('public/icons', `${nome}-apple-180.png`), desenhar(tema, 180, true));
}
console.log('ícones gerados em public/icons');
