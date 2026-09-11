import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

/** Tela de login do sistema — porta de entrada real (Supabase Auth) antes de qualquer dado
 *  aparecer na tela. Diferente do "trocar de usuário" que já existe dentro do app (isso
 *  continua existindo, é só pra saber QUEM está mexendo e quais módulos essa pessoa vê) —
 *  aqui é "essa pessoa pode abrir o sistema de jeito nenhum". Só diretores com conta criada
 *  no Supabase (Authentication > Users, no painel) conseguem entrar. */
export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) {
      setErro(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : `Não foi possível entrar: ${error.message}`
      );
    }
    // Sucesso: o listener de onAuthStateChange (em AuthGate) já troca a tela sozinho.
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 text-center">
          <h1 className="text-white font-black text-lg">JMT Gestão Integrada</h1>
          <p className="text-slate-400 text-xs mt-1">Acesso restrito à Diretoria</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@jmtransportes.com.br"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-hidden"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-hidden"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
