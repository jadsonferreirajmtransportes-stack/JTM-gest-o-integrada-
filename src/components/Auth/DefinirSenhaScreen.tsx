import React, { useState } from 'react';
import { Lock, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { JmtLogo } from '../Brand/JmtLogo';

/** Tela mostrada quando a pessoa chega pelo link de um convite (ou de redefinição de senha) —
 *  ela já tem uma sessão válida nesse ponto (o Supabase estabelece isso sozinho ao abrir o
 *  link), mas ainda não tem senha própria definida. Só depois de definir aqui é que ela entra
 *  de fato no sistema. Ver AuthGate.tsx (detecta type=invite/recovery na URL) e a Edge Function
 *  convidar-usuario (dispara o e-mail com esse link). */
export const DefinirSenhaScreen: React.FC<{ onConcluido: () => void }> = ({ onConcluido }) => {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas digitadas não são iguais.');
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);

    if (error) {
      setErro(`Não foi possível definir a senha: ${error.message}`);
      return;
    }
    onConcluido();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Acento dourado discreto — mesmo tratamento do cabeçalho da Torre de Controle */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C48229]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#C48229]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="pt-8 pb-6 px-6 text-center border-b border-slate-100">
          <div className="flex justify-center mb-3">
            <JmtLogo variant="icon" theme="light" iconSize={40} />
          </div>
          <h1 className="text-slate-900 text-lg">Bem-vindo(a) à JMT Gestão Integrada</h1>
          <p className="text-slate-500 text-xs mt-1">Defina sua senha de acesso pra continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nova senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#C48229]/40 focus:border-[#C48229] outline-hidden"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Confirme a senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="Digite novamente"
                className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#C48229]/40 focus:border-[#C48229] outline-hidden"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2.5 bg-[#C48229] hover:bg-[#92611F] disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {carregando ? 'Salvando...' : 'Definir Senha e Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
