import React, { useEffect, useState } from 'react';
import { Smartphone, Bell, BellRing, X, Share, PlusSquare, Loader2, CheckCircle2 } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { ativarNotificacoes, ehIphone, notificacoesAtivas, notificacoesSuportadas, useInstalarApp } from '../../utils/appInstalavel';

/** Passo a passo do iPhone (o Safari não tem botão de instalar). */
export const InstrucoesIphone: React.FC<{ nomeApp: string; onClose: () => void }> = ({ nomeApp, onClose }) => (
  <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5 space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <h2 className="font-black text-slate-900">Instalar no iPhone</h2>
        <button type="button" onClick={onClose} className="p-1 text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ol className="space-y-2.5 text-slate-700">
        <li className="flex gap-2">
          <span className="font-black text-[#C48229]">1.</span>
          <span>
            Abra este link no <b>Safari</b> (o navegador da bússola).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-black text-[#C48229]">2.</span>
          <span className="flex flex-wrap items-center gap-1">
            Toque em <Share className="w-4 h-4 inline text-sky-600" /> <b>Compartilhar</b> (na barra de baixo).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-black text-[#C48229]">3.</span>
          <span className="flex flex-wrap items-center gap-1">
            Escolha <PlusSquare className="w-4 h-4 inline" /> <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-black text-[#C48229]">4.</span>
          <span>
            Abra o <b>{nomeApp}</b> pelo ícone novo e toque em <b>Ativar notificações</b>.
          </span>
        </li>
      </ol>
      <button type="button" onClick={onClose} className="w-full py-3 rounded-xl bg-[#C48229] text-white font-black">
        Entendi
      </button>
    </div>
  </div>
);

/** Cartão do portal: instalar o app + ativar notificações. Some quando está tudo feito. */
export const CartaoAppPortal: React.FC<{ credenciais: CredenciaisPortal }> = ({ credenciais }) => {
  const { instalado, podeInstalar, precisaInstrucoesIphone, instalar } = useInstalarApp();
  const [ativas, setAtivas] = useState<boolean | null>(null);
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [verIphone, setVerIphone] = useState(false);

  useEffect(() => {
    notificacoesAtivas().then(setAtivas).catch(() => setAtivas(false));
  }, []);

  // iPhone fora do app instalado não recebe notificação: primeiro instala.
  const podeNotificar = notificacoesSuportadas() && !(ehIphone() && !instalado);
  const mostrarInstalar = podeInstalar || precisaInstrucoesIphone;
  const mostrarNotificar = podeNotificar && ativas === false;
  if (!mostrarInstalar && !mostrarNotificar) return null;

  const ativar = async () => {
    setErro(null);
    setAtivando(true);
    try {
      await ativarNotificacoes({ tipo: 'colaborador', credenciais });
      setAtivas(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível ativar.');
    } finally {
      setAtivando(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      {mostrarInstalar && (
        <div className="flex items-center gap-3">
          <img src="/icons/portal-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900">Instale o app JMT Colaborador</p>
            <p className="text-[11px] text-slate-500 leading-snug">Ícone na tela do celular, abre direto, sem precisar do link.</p>
          </div>
          <button
            type="button"
            onClick={() => (podeInstalar ? instalar() : setVerIphone(true))}
            className="px-3 py-2 rounded-xl bg-[#C48229] text-white text-xs font-black flex items-center gap-1 shrink-0"
          >
            <Smartphone className="w-4 h-4" /> Instalar
          </button>
        </div>
      )}
      {mostrarNotificar && (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900">Receba avisos no celular</p>
            <p className="text-[11px] text-slate-500 leading-snug">Documento para assinar, comunicado e notícia nova — mesmo com o app fechado.</p>
          </div>
          <button type="button" onClick={ativar} disabled={ativando} className="px-3 py-2 rounded-xl border border-[#C48229] text-[#92611F] text-xs font-black flex items-center gap-1 shrink-0 disabled:opacity-60">
            {ativando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Ativar
          </button>
        </div>
      )}
      {erro && <p className="text-[11px] text-rose-600 font-semibold">{erro}</p>}
      {verIphone && <InstrucoesIphone nomeApp="JMT Colaborador" onClose={() => setVerIphone(false)} />}
    </section>
  );
};

/** Botões do topo do sistema interno: instalar o app JMT Gestão e ativar avisos do chat. */
export const BotoesAppGestao: React.FC<{ usuarioId?: string }> = ({ usuarioId }) => {
  const { instalado, podeInstalar, precisaInstrucoesIphone, instalar } = useInstalarApp();
  const [ativas, setAtivas] = useState<boolean | null>(null);
  const [ativando, setAtivando] = useState(false);
  const [verIphone, setVerIphone] = useState(false);

  useEffect(() => {
    notificacoesAtivas().then(setAtivas).catch(() => setAtivas(false));
  }, []);

  const podeNotificar = !!usuarioId && notificacoesSuportadas() && !(ehIphone() && !instalado);
  const ativar = async () => {
    if (!usuarioId) return;
    setAtivando(true);
    try {
      await ativarNotificacoes({ tipo: 'usuario', usuarioId });
      setAtivas(true);
      alert('Pronto! Você vai receber aviso de mensagem nova no chat, mesmo com o sistema fechado.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível ativar.');
    } finally {
      setAtivando(false);
    }
  };

  const botao = 'p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-[11px] font-bold';
  return (
    <>
      {(podeInstalar || precisaInstrucoesIphone) && (
        <button type="button" onClick={() => (podeInstalar ? instalar() : setVerIphone(true))} className={botao} title="Instalar o app JMT Gestão neste aparelho">
          <Smartphone className="w-4 h-4 text-[#C48229]" />
          <span className="hidden lg:inline">Instalar app</span>
        </button>
      )}
      {podeNotificar && ativas === false && (
        <button type="button" onClick={ativar} disabled={ativando} className={botao} title="Receber aviso de mensagem nova no chat, mesmo com o sistema fechado">
          {ativando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 text-[#C48229]" />}
          <span className="hidden lg:inline">Ativar avisos</span>
        </button>
      )}
      {podeNotificar && ativas === true && (
        <span className="p-2 text-emerald-600" title="Avisos do chat ativados neste aparelho">
          <CheckCircle2 className="w-4 h-4" />
        </span>
      )}
      {verIphone && <InstrucoesIphone nomeApp="JMT Gestão" onClose={() => setVerIphone(false)} />}
    </>
  );
};
