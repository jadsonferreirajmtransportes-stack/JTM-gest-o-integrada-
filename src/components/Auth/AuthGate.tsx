import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2, LogOut } from 'lucide-react';
import { supabase, supabaseConfigurado } from '../../utils/supabaseClient';
import { isRotaPublica } from '../../utils/publicRoutes';
import { LoginScreen } from './LoginScreen';

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
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
        className="fixed bottom-3 right-3 z-[9999] flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-semibold px-3 py-2 rounded-full shadow-lg backdrop-blur-xs"
      >
        {saindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
        Sair
      </button>
      {children}
    </div>
  );
};
