// ============================================================================
// Apps instaláveis (PWA): "JMT Gestão" (sistema interno) e "JMT Colaborador"
// (portal / link pessoal), mais as notificações no celular (Web Push).
//
// - configurarApp(): roda antes de abrir a tela — escolhe o manifest certo,
//   registra o service worker (public/sw.js) e guarda o link do portal no
//   aparelho (o app instalado abre em /?form=portal, sem o token na URL).
// - useInstalarApp(): botão "Instalar app" (Android/Chrome/Edge) ou as
//   instruções do iPhone (Compartilhar → Adicionar à Tela de Início).
// - ativarNotificacoes(): pede a permissão e grava a inscrição (tabela
//   push_inscricoes, migração 078). Quem envia é a função "enviar-push".
// ============================================================================

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { isRotaPublica } from './publicRoutes';
import type { CredenciaisPortal } from './educacaoApi';

const CHAVE_TOKEN_PORTAL = 'jmt-portal-token-atual';
const URL_FUNCAO_PUSH = `${(import.meta.env.VITE_SUPABASE_URL as string | undefined) || ''}/functions/v1/enviar-push`;

export const ehPortal = () => new URLSearchParams(window.location.search).get('form') === 'portal';

/** Token do portal: o da URL (e guarda no aparelho) ou o último guardado (app instalado). */
export function tokenPortal(daUrl: string | null): string {
  try {
    if (daUrl) {
      localStorage.setItem(CHAVE_TOKEN_PORTAL, daUrl);
      return daUrl;
    }
    return localStorage.getItem(CHAVE_TOKEN_PORTAL) || '';
  } catch {
    return daUrl || '';
  }
}

let eventoInstalar: any = null;
const ouvintes = new Set<() => void>();

/** Cada coisa no seu endereço — os dois apps instaláveis não podem se sobrepor:
 *   /colaborador/  portal do colaborador (app JMT Colaborador)
 *   /gestao/       sistema interno       (app JMT Gestão)
 *   /              links públicos (formulários, comunicado, ponto...), fora dos dois apps
 *  Links antigos (/?form=portal..., / do sistema) são levados para o lugar certo.
 *  Devolve true quando redirecionou (aí não monta a tela). */
export function levarParaPaginaCerta(): boolean {
  const { pathname, search, hash } = window.location;
  // Volta do login/convite do Supabase (token na URL): não mexe, senão perde a sessão.
  if (/access_token=|refresh_token=|error_description=/.test(hash) || /[?&]code=/.test(search)) return false;
  // /colaborador/ sem parâmetro (alguém digitou o endereço) também é o portal.
  if (pathname.startsWith('/colaborador') && !ehPortal()) {
    window.location.replace('/colaborador/?form=portal' + hash);
    return true;
  }
  const destino = ehPortal() ? '/colaborador/' : isRotaPublica() ? '/' : '/gestao/';
  const atual = pathname.endsWith('/') ? pathname : pathname + '/';
  if (atual === destino) return false;
  window.location.replace(destino + search + hash);
  return true;
}

export function configurarApp() {
  const params = new URLSearchParams(window.location.search);
  if (ehPortal()) {
    document.getElementById('manifest-app')?.setAttribute('href', '/manifest-portal.webmanifest');
    document.getElementById('apple-icone-app')?.setAttribute('href', '/icons/portal-apple-180.png');
    document.getElementById('cor-tema-app')?.setAttribute('content', '#C48229');
    document.getElementById('apple-titulo-app')?.setAttribute('content', 'JMT Colaborador');
    document.title = 'JMT Colaborador';
    // Com o link pessoal na URL, o app instalado já leva o link junto (no iPhone, o app da Tela
    // de Início não enxerga o que ficou guardado no Safari). Ver api/manifest-colaborador.js.
    const token = params.get('token') || '';
    if (/^[a-f0-9]{64}$/i.test(token) && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      document.getElementById('manifest-app')?.setAttribute('href', `/api/manifest-colaborador?t=${token}`);
    }
  }
  // Notificação do chat: abre o sistema direto no Chat.
  if (params.get('abrir') === 'chat') {
    try {
      localStorage.setItem('jmt_active_global_module_v1', JSON.stringify('chat'));
    } catch {
      /* sem armazenamento */
    }
    params.delete('abrir');
    const resto = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (resto ? `?${resto}` : ''));
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker não registrado:', err)));
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalar = e;
    ouvintes.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null;
    ouvintes.forEach((f) => f());
  });
}

export const appInstalado = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
export const ehIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Estado do botão "Instalar app". */
export function useInstalarApp() {
  const [, forcar] = useState(0);
  useEffect(() => {
    const f = () => forcar((n) => n + 1);
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);
  const instalado = appInstalado();
  return {
    instalado,
    /** Android/Chrome/Edge: o navegador oferece instalar com um toque. */
    podeInstalar: !instalado && !!eventoInstalar,
    /** iPhone: só pelo menu Compartilhar do Safari. */
    precisaInstrucoesIphone: !instalado && !eventoInstalar && ehIphone(),
    instalar: async () => {
      if (!eventoInstalar) return false;
      eventoInstalar.prompt();
      const r = await eventoInstalar.userChoice.catch(() => null);
      eventoInstalar = null;
      ouvintes.forEach((f) => f());
      return r?.outcome === 'accepted';
    },
  };
}

// ---------------------------------------------------------------------------
// Notificações (Web Push)
// ---------------------------------------------------------------------------
export const notificacoesSuportadas = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const permissaoNotificacoes = (): NotificationPermission | 'indisponivel' => (notificacoesSuportadas() ? Notification.permission : 'indisponivel');

function base64ParaBytes(b64: string) {
  const p = '='.repeat((4 - (b64.length % 4)) % 4);
  const bruto = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

async function chavePublica(): Promise<string> {
  const r = await fetch(URL_FUNCAO_PUSH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: 'chave' }) });
  if (!r.ok) throw new Error('A função de notificações ainda não está ativa no Supabase.');
  const j = await r.json();
  if (!j.chave) throw new Error('Chave das notificações indisponível.');
  return j.chave;
}

/** Já tem inscrição ativa neste aparelho? */
export async function notificacoesAtivas(): Promise<boolean> {
  if (!notificacoesSuportadas() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

/** Pede a permissão (precisa vir de um toque do usuário) e grava a inscrição deste aparelho. */
export async function ativarNotificacoes(destino: { tipo: 'colaborador'; credenciais: CredenciaisPortal } | { tipo: 'usuario'; usuarioId: string }): Promise<void> {
  if (!notificacoesSuportadas()) {
    throw new Error(ehIphone() ? 'No iPhone, instale o app na tela de início primeiro (Compartilhar → Adicionar à Tela de Início) e ative por ele.' : 'Este navegador não recebe notificações.');
  }
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('As notificações foram bloqueadas. Libere nas configurações do navegador para este site.');
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  let inscricao = await reg.pushManager.getSubscription();
  if (!inscricao) inscricao = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(await chavePublica()) });
  const j = inscricao.toJSON() as any;
  if (destino.tipo === 'colaborador') {
    const { data, error } = await supabase.rpc('portal_push_inscrever', {
      p_token: destino.credenciais.token,
      p_cpf: destino.credenciais.cpf,
      p_nascimento: destino.credenciais.nascimento,
      p_endpoint: j.endpoint,
      p_p256dh: j.keys?.p256dh,
      p_auth: j.keys?.auth,
    });
    if (error || (data as any)?.erro) throw new Error('Não foi possível ativar as notificações agora.');
  } else {
    const { error } = await supabase.from('push_inscricoes').upsert(
      { endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, tipo: 'usuario', usuario_id: destino.usuarioId, colaborador_id: null, atualizado_em: new Date().toISOString() },
      { onConflict: 'endpoint' }
    );
    if (error) throw new Error('Não foi possível ativar as notificações agora.');
  }
}
