// Captura as telas de treinamento (ver LEIA-ME.md).
// Uso: com o `npx vite --port=3085` rodando, `node ferramentas/telas-treinamento/capturar.mjs [id...]`
// Abre cada cena no Chrome sem janela, espera o título virar "PRONTO" e salva o PNG em
// public/treinamento-sistema/<id>.png.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const saida = join(raiz, 'public', 'treinamento-sistema');
mkdirSync(saida, { recursive: true });

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:3085/ferramentas/telas-treinamento/telas.html';
const PORTA = 9333;

const ids =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : [...readFileSync(join(raiz, 'src', 'data', 'telasTreinamento.ts'), 'utf8').matchAll(/id: '([a-z]+-\d+[a-z]?)'/g)].map((m) => m[1]);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${join(tmpdir(), 'chrome-telas-cdp')}`, 'about:blank'], { stdio: 'ignore' });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrirAba() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORTA}/json/new?about:blank`, { method: 'PUT' });
      return await r.json();
    } catch {
      await esperar(250);
    }
  }
  throw new Error('Chrome não respondeu');
}

function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pendentes = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pendentes.has(msg.id)) {
      pendentes.get(msg.id)(msg);
      pendentes.delete(msg.id);
    }
  };
  const enviar = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++seq;
      pendentes.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  return new Promise((resolve) => (ws.onopen = () => resolve({ enviar, fechar: () => ws.close() })));
}

try {
  const aba = await abrirAba();
  const cdp = await conectar(aba.webSocketDebuggerUrl);
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1.25, mobile: false });
  for (const id of ids) {
    await cdp.enviar('Page.navigate', { url: `${BASE}?cena=${id}` });
    let pronto = false;
    for (let i = 0; i < 120 && !pronto; i++) {
      await esperar(500);
      const r = await cdp.enviar('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
      pronto = r.result?.result?.value === 'PRONTO';
    }
    if (!pronto) {
      console.log(`✗ ${id}: não ficou pronta`);
      continue;
    }
    await esperar(400);
    const alt = await cdp.enviar('Runtime.evaluate', { expression: 'window.__altura || 800', returnByValue: true });
    const altura = Math.round(alt.result?.result?.value || 800);
    const shot = await cdp.enviar('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1280, height: altura, scale: 1 } });
    writeFileSync(join(saida, `${id}.png`), Buffer.from(shot.result.data, 'base64'));
    console.log(`✓ ${id}`);
  }
  cdp.fechar();
} finally {
  chrome.kill();
}
