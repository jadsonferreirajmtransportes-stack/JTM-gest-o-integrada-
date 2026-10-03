// Lista, para cada cena, os textos de botões/títulos/campos e os erros do console — usado
// pra escolher os alvos das marcas. Uso: node inspecionar.mjs id1 id2 ...
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3085/ferramentas/telas-treinamento/telas.html';
const PORTA = 9334;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${join(tmpdir(), 'chrome-telas-insp')}`, 'about:blank'], { stdio: 'ignore' });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let aba;
for (let i = 0; i < 40 && !aba; i++) { try { aba = await (await fetch(`http://127.0.0.1:${PORTA}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { await esperar(250); } }
const ws = new WebSocket(aba.webSocketDebuggerUrl);
let seq = 0; const pend = new Map(); const erros = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]); if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) erros.push(m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200)); };
const enviar = (method, params = {}) => new Promise((r) => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await new Promise((r) => (ws.onopen = r));
await enviar('Runtime.enable');
await enviar('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
const expr = `(() => { const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; }; const t = (sel) => [...new Set([...document.querySelectorAll(sel)].filter(vis).map((e) => (e.placeholder || e.getAttribute('title') || e.textContent || '').replace(/\s+/g, ' ').trim()).filter((x) => x && x.length < 60))]; return JSON.stringify({ botoes: t('button').slice(0, 45), titulos: t('h1,h2,h3,th,label').slice(0, 30), campos: t('input[placeholder],select').slice(0, 10) }); })()`;
for (const id of process.argv.slice(2)) {
  erros.length = 0;
  await enviar('Page.navigate', { url: `${BASE}?cena=${id}` });
  let ok = false;
  for (let i = 0; i < 60 && !ok; i++) { await esperar(500); const r = await enviar('Runtime.evaluate', { expression: 'document.title', returnByValue: true }); ok = r.result?.result?.value === 'PRONTO'; }
  const r = await enviar('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (process.env.SO_MARCAS) { const f = erros.filter((e) => /marca não achada/.test(e || '')); if (f.length) console.log(id, f.join(' | ')); erros.length = 0; continue; }
  console.log(`\n### ${id} ${ok ? '' : '(NÃO FICOU PRONTA)'}\n${r.result?.result?.value}\n${erros.filter(Boolean).filter((e) => !/marca não achada|React DevTools|vite/.test(e)).slice(0, 4).join('\n')}`);
}
ws.close(); chrome.kill();
