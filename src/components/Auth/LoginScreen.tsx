import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { JmtLogo } from '../Brand/JmtLogo';

/** Tela de login do sistema — porta de entrada real (Supabase Auth) antes de qualquer dado
 *  aparecer na tela. Diferente do "trocar de usuário" que já existe dentro do app (isso
 *  continua existindo, é só pra saber QUEM está mexendo e quais módulos essa pessoa vê) —
 *  aqui é "essa pessoa pode abrir o sistema de jeito nenhum". Só diretores com conta criada
 *  no Supabase (Authentication > Users, no painel) conseguem entrar. */
export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // "Esqueci minha senha": o Supabase manda um e-mail com o link de redefinição; o link volta
  // pro sistema com type=recovery e o AuthGate abre a tela de definir a senha nova.
  const [recuperando, setRecuperando] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);

  const enviarLinkRecuperacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    setCarregando(false);
    if (error) {
      setErro(/rate limit|seconds/i.test(error.message) ? 'Muitos pedidos seguidos. Espere um minuto e tente de novo.' : `Não foi possível enviar o link: ${error.message}`);
      return;
    }
    setLinkEnviado(true);
  };

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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Acento dourado discreto — mesmo tratamento do cabeçalho da Torre de Controle */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C48229]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#C48229]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="pt-8 pb-6 px-6 text-center border-b border-slate-100">
          <div className="flex justify-center mb-3">
            <JmtLogo variant="icon" theme="light" iconSize={40} />
          </div>
          <h1 className="text-slate-900 text-lg">JMT Gestão Integrada</h1>
          <p className="text-slate-500 text-xs mt-1">Acesso restrito à Diretoria</p>
        </div>
        {recuperando ? (
          <form onSubmit={enviarLinkRecuperacao} className="p-6 space-y-4">
            {linkEnviado ? (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Se <b>{email.trim()}</b> tiver acesso ao sistema, chega em instantes um e-mail com o link para criar uma senha nova. Confira também a caixa de spam.
                </span>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600">Informe o e-mail que você usa para entrar. Vamos mandar um link para você criar uma senha nova.</p>
                {erro && (
                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{erro}</span>
                  </div>
                )}
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@jmtransportes.com.br"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#C48229]/40 focus:border-[#C48229] outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-2.5 bg-[#C48229] hover:bg-[#92611F] disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setRecuperando(false);
                setLinkEnviado(false);
                setErro(null);
              }}
              className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 normal-case tracking-normal"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
            </button>
          </form>
        ) : (
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
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#C48229]/40 focus:border-[#C48229] outline-hidden"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
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
          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2.5 bg-[#C48229] hover:bg-[#92611F] disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setRecuperando(true);
              setErro(null);
            }}
            className="w-full text-xs font-semibold text-[#92611F] hover:underline normal-case tracking-normal"
          >
            Esqueci minha senha
          </button>
        </form>
        )}
      </div>
    </div>
  );
};
