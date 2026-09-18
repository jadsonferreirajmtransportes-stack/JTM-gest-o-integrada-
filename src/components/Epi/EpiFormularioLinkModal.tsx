import React, { useMemo, useState } from 'react';
import { X, Copy, Check, Send, Mail, QrCode, ExternalLink, Smartphone, CheckCircle2, HardHat } from 'lucide-react';

interface EpiFormularioLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPortalView: () => void;
}

/** Link do Formulário Público de Entrega de EPI — GENÉRICO (mesmo link pra qualquer entrega,
 *  sem pré-seleção de supervisor/empresa, ver PublicEpiEntregaView.tsx), mesmo padrão de
 *  compartilhamento já usado em OccurrenceLinkModal.tsx (copiar, WhatsApp, QR Code, e-mail). */
export const EpiFormularioLinkModal: React.FC<EpiFormularioLinkModalProps> = ({ isOpen, onClose, onOpenPortalView }) => {
  const [copied, setCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [telefone, setTelefone] = useState('');

  const link = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?form=epi_entrega`;
  }, []);

  const mensagemWhatsapp = useMemo(
    () => `Olá! Segue o link oficial do *Departamento Pessoal da Jobson de Moraes Transportes (JMT)* para registrar a entrega de EPI (Equipamento de Proteção Individual) de um colaborador da sua equipe: 🦺📋

🔗 *Link do Formulário de Entrega de EPI:*
${link}

📌 *Instruções de Uso:*
1️⃣ Acesse pelo celular ou computador.
2️⃣ Informe seu nome como responsável pela entrega.
3️⃣ Selecione o colaborador (ou digite o nome, se ele não estiver cadastrado).
4️⃣ Liste os EPIs entregues (descrição, CA, quantidade).
5️⃣ Peça pro colaborador assinar na tela e envie.

✅ O registro é integrado imediatamente no sistema, com a assinatura já anexada.

Qualquer dúvida, entre em contato com o Departamento Pessoal!`,
    [link]
  );

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(mensagemWhatsapp);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = telefone.replace(/\D/g, '');
    const phoneParam = cleanPhone ? `55${cleanPhone}` : '';
    const encoded = encodeURIComponent(mensagemWhatsapp);
    const waUrl = phoneParam
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent('JMT Transportes - Link do Formulário de Entrega de EPI');
    const body = encodeURIComponent(mensagemWhatsapp.replace(/\*/g, '').replace(/_/g, ''));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}&color=0f172a&bgcolor=ffffff&margin=1`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8A6A39] via-[#B38F4F] to-[#8A6A39] p-6 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <HardHat className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Link do Formulário de Entrega de EPI</h2>
              <p className="text-xs text-amber-100">Compartilhe pra supervisores registrarem a entrega sem login</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-amber-100 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-slate-700">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#8A6A39] uppercase tracking-wider">Link Seguro de Acesso Direto</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs text-emerald-700 break-all select-all flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{link}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-[#B38F4F] hover:bg-[#8A6A39] text-white shadow-xs'
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
            <p className="text-[11px] text-slate-400">
              Link único e fixo — o mesmo serve pra qualquer entrega, não precisa gerar um link por colaborador.
            </p>
          </div>

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
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
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
                <img src={qrCodeUrl} alt="QR Code do Formulário de Entrega de EPI" className="w-24 h-24 object-contain" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <QrCode className="w-4 h-4 text-[#8A6A39]" />
                  <span>QR Code de Campo</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">O supervisor pode escanear direto no depósito de EPI.</p>
                <button type="button" onClick={handleSendEmail} className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 pt-1">
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
            onClick={() => {
              onClose();
              onOpenPortalView();
            }}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-[#8A6A39] rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Testar / Abrir Formulário Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
