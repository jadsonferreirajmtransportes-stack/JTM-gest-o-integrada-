// Funções de apoio do estúdio de telas (ver cenas.tsx): banco simulado, localizar
// elementos, digitar/clicar e desenhar os números. Importar ANTES de qualquer módulo do
// sistema — o banco simulado precisa estar no lugar quando o cliente do Supabase carrega.
import React from 'react';

export const tabelas: Record<string, any[]> = {};
/** Funções do banco simuladas (supabase.rpc): nome -> resposta a partir do corpo enviado. */
export const rpcs: Record<string, (corpo: any) => unknown> = {};
const fetchOriginal = window.fetch.bind(window);
window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  if (!/supabase\.co/.test(url)) return fetchOriginal(entrada as any, init);
  const resposta = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const rpc = url.match(/\/rest\/v1\/rpc\/([a-z_]+)/);
  if (rpc) return resposta(rpcs[rpc[1]] ? rpcs[rpc[1]](JSON.parse(String(init?.body || '{}'))) : {});
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?.*)?$/);
  if (!m || m[1] === 'rpc') return resposta({});
  if (init?.method && init.method !== 'GET' && init.method !== 'HEAD') return resposta([]);
  let linhas = [...(tabelas[m[1]] || [])];
  new URLSearchParams(m[2] || '').forEach((valor, chave) => {
    if (valor.startsWith('eq.')) linhas = linhas.filter((l) => String(l[chave]) === valor.slice(3));
  });
  const cabecalhos = new Headers(init?.headers);
  if ((cabecalhos.get('Accept') || '').includes('pgrst.object')) return resposta(linhas[0] ?? null);
  return resposta(linhas);
};

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Acha o elemento visível cujo texto/placeholder/título contém `alvo` (o menor deles). */
export function achar(alvo: string): HTMLElement | null {
  const procurado = normalizar(alvo);
  const lista = Array.from(document.querySelectorAll<HTMLElement>('button, a, h1, h2, h3, label, th, span, p, input, select, textarea, li, td, div, img'))
    .filter((el) => {
      if (el.closest('[data-marcas]')) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.top < 0 || r.bottom > window.innerHeight + 1) return false;
      const textos = [el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.placeholder : el.textContent || '', el.getAttribute('title') || '', el.getAttribute('aria-label') || '', el.getAttribute('alt') || ''];
      return textos.some((t) => normalizar(t).includes(procurado));
    })
    .sort((a, b) => {
      const area = (e: HTMLElement) => { const r = e.getBoundingClientRect(); return r.width * r.height; };
      // Quem tem o texto visível vem antes de quem só tem no title/placeholder.
      const peloTexto = (e: HTMLElement) => (normalizar(e.textContent || '').includes(procurado) ? 0 : 1);
      return peloTexto(a) - peloTexto(b) || (a.textContent || '').length - (b.textContent || '').length || area(a) - area(b);
    });
  // Texto dentro de botão/link: marca o botão inteiro.
  const el = lista[0] || null;
  return (el?.closest('button, a, select') as HTMLElement | null) || el;
}

export async function digitar(placeholderOuRotulo: string, valor: string) {
  const el = achar(placeholderOuRotulo) as HTMLInputElement | null;
  const campo = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el : (el.parentElement?.querySelector('input, textarea') as HTMLInputElement | null));
  if (!campo) return console.warn('campo não achado:', placeholderOuRotulo);
  const proto = campo.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(campo, valor);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  await esperar(80);
}
export async function clicar(alvo: string) {
  const el = achar(alvo);
  const clicavel = (el?.closest('button, a, label, li, [role="button"]') as HTMLElement | null) || el;
  if (!clicavel) return console.warn('clique não achado:', alvo);
  clicavel.click();
  await esperar(400);
}

/** Números marcados na tela (círculo bronze + contorno). */
export function desenharMarcas(alvos: string[]) {
  const camada = document.createElement('div');
  camada.setAttribute('data-marcas', '1');
  camada.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999';
  alvos.forEach((alvo, i) => {
    const el = achar(alvo);
    if (!el) return console.warn('marca não achada:', alvo);
    const r = el.getBoundingClientRect();
    const contorno = document.createElement('div');
    contorno.style.cssText = `position:absolute;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border:3px solid #C48229;border-radius:10px;box-shadow:0 0 0 3px rgba(196,130,41,.18)`;
    const bola = document.createElement('div');
    const x = Math.max(4, r.left - 26);
    const y = Math.max(4, r.top - 22);
    bola.textContent = String(i + 1);
    bola.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:30px;height:30px;border-radius:50%;background:#C48229;color:#fff;font:800 16px "Hanken Grotesk",Arial;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff`;
    camada.append(contorno, bola);
  });
  document.body.appendChild(camada);
}


export const moldura = (filho: React.ReactNode) => <div style={{ padding: 24, background: '#F8FAFC' }}>{filho}</div>;

export type Cena = { montar: () => Promise<React.ReactNode>; acoes?: () => Promise<void> };
