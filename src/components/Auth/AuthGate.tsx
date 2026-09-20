import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2, LogOut } from 'lucide-react';
import { supabase, supabaseConfigurado } from '../../utils/supabaseClient';
import { isRotaPublica } from '../../utils/publicRoutes';
import { LoginScreen } from './LoginScreen';
import { DefinirSenhaScreen } from './DefinirSenhaScreen';

/** Link de convite/redefinição de senha vem com `#...&type=invite` (ou `type=recovery`) na URL
 *  — o Supabase já consome esse hash e cria a sessão sozinho antes daqui, então só precisamos
 *  checar se é esse o motivo da sessão existir, pra decidir se mostra a tela de "definir senha"
 *  antes de deixar entrar no sistema de verdade. */
function ehLinkDeConviteOuRecuperacao(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const tipo = hash.get('type');
  return tipo === 'invite' || tipo === 'recovery';
}

/** Porta de entrada do sistema: só renderiza o app (children) quando existe uma sessão válida
 *  do Supabase Auth. Sem sessão, mostra a tela de login; enquanto verifica se já existe uma
 *  sessão salva (ex.: usuário fechou e reabriu o navegador), mostra um loading rápido.
 *
 *  Isso é independente do "trocar de usuário" que já existe dentro do app (currentUser/
 *  userRole em App.tsx) — aquilo continua controlando o que cada pessoa vê DEPOIS de entrar;
 *  isso aqui controla se a pessoa entra ou não.
 *
 *  Exceção: os formulários públicos (link de admissão de candidato, de ocorrência, ou de
 *  instrução de trabalho) passam direto, sem pedir login — quem preenche esses formulários
 *  (candidato a vaga, motorista, fiscal) nunca tem conta no sistema. O App.tsx já sabia
 *  renderizar só esse formulário isolado nesses casos; aqui só deixamos ele chegar até lá. */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = ainda carregando
  const [saindo, setSaindo] = useState(false);
  const [precisaDefinirSenha, setPrecisaDefinirSenha] = useState(ehLinkDeConviteOuRecuperacao);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSession(novaSessao);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  if (isRotaPublica()) {
    return <>{children}</>;
  }

  if (!supabaseConfigurado) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-rose-200 rounded-xl p-5 text-sm text-rose-800">
          <p className="font-bold mb-1">Supabase não configurado</p>
          <p>
            Faltam as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{' '}
            (veja <code>.env.example</code>). Sem isso o sistema não consegue verificar login nenhum.
          </p>
        </div>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#C48229] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (precisaDefinirSenha) {
    return (
      <DefinirSenhaScreen
        onConcluido={() => {
          setPrecisaDefinirSenha(false);
          // Limpa o #access_token=...&type=invite da URL — sem isso, um F5 nessa página
          // reabriria a tela de definir senha de novo.
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }}
      />
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={async () => {
          setSaindo(true);
          await supabase.auth.signOut();
          setSaindo(false);
        }}
        disabled={saindo}
        title={`Sair (${session.user.email})`}
        className="fixed bottom-3 right-3 z-[9999] flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-semibold px-3 py-2 rounded-full shadow-lg"
      >
        {saindo ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C48229]" /> : <LogOut className="w-3.5 h-3.5 text-slate-500" />}
        Sair
      </button>
      {children}
    </div>
  );
};
