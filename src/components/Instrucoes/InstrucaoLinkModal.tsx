import React, { useMemo, useState } from 'react';
import {
  X,
  Copy,
  Check,
  Send,
  Mail,
  QrCode,
  ExternalLink,
  Smartphone,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import { InstrucaoTrabalho } from '../../types';

interface InstrucaoLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrucao: InstrucaoTrabalho;
}

/** Gera e compartilha o link público de preenchimento de UMA Instrução de Trabalho — mesmo
 *  padrão do link de Ocorrências/Admissão (sem necessidade de login no sistema). */
export const InstrucaoLinkModal: React.FC<InstrucaoLinkModalProps> = ({ isOpen, onClose, instrucao }) => {
  const [copied, setCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [destinatarioTelefone, setDestinatarioTelefone] = useState('');

  const generatedLink = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const params = new URLSearchParams();
    params.set('form', 'instrucao');
    params.set('id', instrucao.id);
    return `${origin}${pathname}?${params.toString()}`;
  }, [instrucao.id]);

  const whatsappMessage = useMemo(() => {
    return `Olá! Peço que preencha a Instrução de Trabalho *${instrucao.codigo} — ${instrucao.titulo || 'sem título'}* pelo link abaixo, direto pelo celular ou computador, sem precisar de login: 📋

🔗 *Link do Formulário:*
${generatedLink}

📌 Preencha cada etapa (objetivo, fluxo do processo, responsabilidades, indicadores...) e clique em *Concluir Preenchimento* ao final.

Qualquer dúvida, me chame!

*Jobson de Moraes Transportes (JMT)*`;
  }, [generatedLink, instrucao.codigo, instrucao.titulo]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = destinatarioTelefone.replace(/\D/g, '');
    const phoneParam = cleanPhone ? `55${cleanPhone}` : '';
    const encoded = encodeURIComponent(whatsappMessage);
    const waUrl = phoneParam
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`JMT — Preenchimento da Instrução de Trabalho ${instrucao.codigo}`);
    const body = encodeURIComponent(whatsappMessage.replace(/\*/g, ''));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    generatedLink
  )}&color=0f172a&bgcolor=ffffff&margin=1`;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C48229] via-[#92611F] to-[#5c4526] p-6 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center text-white shadow-inner shrink-0">
              <FileCheck2 className="w-6 h-6 text-amber-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold truncate">Link de Preenchimento da IT</h2>
                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0">
                  Sem login
                </span>
              </div>
              <p className="text-xs text-amber-100 truncate">
                {instrucao.codigo} — {instrucao.titulo || 'Instrução sem título'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-amber-100 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-slate-700">
          <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Quem abrir este link vê o mesmo formulário por etapas, com as notas de "Como preencher?", e pode editar
              todos os campos do processo — sem excluir a instrução, favoritar ou alterar o vínculo com outros módulos.
            </span>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#92611F] uppercase tracking-wider">
              Link Direto de Preenchimento
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs text-emerald-700 break-all select-all flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{generatedLink}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Share Channels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 mb-1">
                  <Send className="w-4 h-4" />
                  <span>Enviar pelo WhatsApp</span>
                </div>
                <p className="text-[11px] text-slate-500">Informe o número com DDD ou clique para abrir a conversa</p>
                <input
                  type="text"
                  placeholder="(84) 99999-0000"
                  value={destinatarioTelefone}
                  onChange={(e) => setDestinatarioTelefone(e.target.value)}
                  className="w-full mt-2 p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Abrir WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  title="Copiar mensagem formatada"
                  className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors"
                >
                  {messageCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
              <div className="bg-white p-2 rounded-xl shadow-md shrink-0 border border-slate-100">
                <img src={qrCodeUrl} alt="QR Code do formulário da instrução" className="w-24 h-24 object-contain" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <QrCode className="w-4 h-4 text-[#92611F]" />
                  <span>QR Code</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  O colaborador pode escanear direto no pátio, no armazém ou na TECA.
                </p>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 pt-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>Enviar por E-mail</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
            Fechar
          </button>
          <button
            type="button"
            onClick={() => window.open(generatedLink, '_blank')}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-[#92611F] rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Testar / Abrir Formulário Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
