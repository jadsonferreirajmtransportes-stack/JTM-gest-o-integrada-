import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Send,
  Mail,
  QrCode,
  ExternalLink,
  Smartphone,
  Share2,
  Building2,
  Briefcase,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { Empregador, CargoSalario, Supervisor } from '../../types';

interface AdmissionLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  empregadores: Empregador[];
  cargos: CargoSalario[];
  supervisores: Supervisor[];
  onOpenCandidateView: () => void;
}

export const AdmissionLinkModal: React.FC<AdmissionLinkModalProps> = ({
  isOpen,
  onClose,
  empregadores,
  cargos,
  supervisores,
  onOpenCandidateView,
}) => {
  const [candidateName, setCandidateName] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(empregadores[0]?.id || '');
  const [selectedCargo, setSelectedCargo] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [copied, setCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  // Generate URL
  const generatedLink = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const params = new URLSearchParams();
    params.set('form', 'admissao');

    if (selectedEmpresaId) {
      params.set('empresa', selectedEmpresaId);
    }
    if (selectedCargo) {
      params.set('cargo', selectedCargo);
    }
    if (selectedSupervisorId) {
      params.set('supervisor', selectedSupervisorId);
    }

    return `${origin}${pathname}?${params.toString()}`;
  }, [selectedEmpresaId, selectedCargo, selectedSupervisorId]);

  // Generate WhatsApp formatted message
  const whatsappMessage = useMemo(() => {
    const empresaNome = empregadores.find((e) => e.id === selectedEmpresaId)?.razaoSocial || 'Jobson de Moraes Transportes (JMT)';
    const saudacao = candidateName ? `Olá, *${candidateName}*!` : 'Olá!';

    return `${saudacao} Seja muito bem-vindo(a) à equipe da *${empresaNome}*! 🚛💊

Para darmos início ao seu processo de admissão no Departamento Pessoal, por favor acesse o nosso link seguro abaixo para preencher os seus dados cadastrais e anexar as fotos dos seus documentos:

🔗 *Link do Formulário de Admissão:*
${generatedLink}

⏱️ *Tempo estimado:* 3 a 5 minutos.
📌 _Dica: Você pode preencher diretamente pelo seu celular e fotografar seus documentos (RG/CNH, Comprovante de Residência, Carteira de Trabalho, etc.)._

Qualquer dúvida durante o preenchimento, estamos à sua disposição no Departamento Pessoal!`;
  }, [candidateName, selectedEmpresaId, empregadores, generatedLink]);

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
    const cleanPhone = candidatePhone.replace(/\D/g, '');
    const phoneParam = cleanPhone ? `55${cleanPhone}` : '';
    const encoded = encodeURIComponent(whatsappMessage);
    const waUrl = phoneParam
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent('JMT Transportes - Formulário de Admissão e Documentação do Colaborador');
    const body = encodeURIComponent(whatsappMessage.replace(/\*/g, '').replace(/_/g, ''));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // QR Code URL (using a fast, reliable SVG renderer API)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    generatedLink
  )}&color=0f172a&bgcolor=ffffff&margin=1`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-100 p-5 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#92611F] shadow-inner">
              <Share2 className="w-5 h-5 text-[#92611F]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Link de Admissão & Auto-Cadastro</h2>
                <span className="bg-amber-50 text-[#92611F] border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  JMT Digital
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Envie para o novo colaborador preencher seus dados e fotos dos documentos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors relative z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* 1. Optional Customization */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <span className="text-xs font-bold text-[#92611F] uppercase tracking-wider block mb-3">
              Personalização do Link (Opcional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Nome do Candidato</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Ex: Gabriel Henrique"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">WhatsApp do Candidato (com DDD)</label>
                <input
                  type="text"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  placeholder="Ex: 11 98765-4321"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Empresa Contratante</label>
                <select
                  value={selectedEmpresaId}
                  onChange={(e) => setSelectedEmpresaId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                >
                  {empregadores.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Cargo Pretendido</label>
                <select
                  value={selectedCargo}
                  onChange={(e) => setSelectedCargo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                >
                  <option value="">(Deixar em aberto / Selecionar depois)</option>
                  {cargos.map((cargo) => (
                    <option key={cargo.id} value={cargo.cargo}>
                      {cargo.cargo} ({cargo.setor})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Generated Link Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#92611F]" />
                Link Direto para o Colaborador
              </span>
              <span className="text-[10px] text-slate-400">Pronto para compartilhamento</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-mono select-all focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* 3. Action Channels: WhatsApp, Email, QR Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex flex-col items-center text-center transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900">Enviar no WhatsApp</span>
              <span className="text-[10px] text-emerald-700 mt-0.5">Mensagem formatada pronta</span>
            </button>

            {/* E-mail */}
            <button
              type="button"
              onClick={handleSendEmail}
              className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl flex flex-col items-center text-center transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900">Enviar por E-mail</span>
              <span className="text-[10px] text-blue-700 mt-0.5">Com instruções formais</span>
            </button>

            {/* Test in Browser */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCandidateView();
              }}
              className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex flex-col items-center text-center transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#92611F] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <ExternalLink className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900">Testar Formulário</span>
              <span className="text-[10px] text-[#92611F] mt-0.5">Ver visão do candidato</span>
            </button>
          </div>

          {/* 4. WhatsApp Message Preview Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Mensagem que será enviada:</span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] text-[#92611F] hover:text-[#C48229] flex items-center gap-1 font-semibold"
              >
                {messageCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{messageCopied ? 'Texto copiado!' : 'Copiar texto'}</span>
              </button>
            </div>
            <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto leading-relaxed">
              {whatsappMessage}
            </pre>
          </div>

          {/* 5. QR Code */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white p-2 rounded-xl shrink-0 shadow-sm border border-slate-100">
              <img
                src={qrCodeUrl}
                alt="QR Code do Formulário de Admissão"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-1">
                <QrCode className="w-4 h-4 text-[#92611F]" />
                <span>QR Code para Escaneamento na Recepção / Entrevista</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Você pode exibir este QR Code na tela ou imprimi-lo na recepção do DP para que o candidato aponte a câmera do celular e comece a preencher seus dados imediatamente.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Jobson de Moraes Transportes • Sistema de Admissão Digital
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
