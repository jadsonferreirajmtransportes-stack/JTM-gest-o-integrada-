import React, { useState, useEffect } from 'react';
import {
  X,
  Cake,
  Send,
  Copy,
  Check,
  Mail,
  Sparkles,
  MessageSquare,
  Eye,
  Edit3,
  Phone,
  Share2,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { Colaborador } from '../../types';
import {
  BIRTHDAY_TEMPLATES,
  BirthdayTemplate,
  compileBirthdayMessage,
  parseBirthdayInfo,
  buildWhatsAppLink,
  buildMailtoLink,
} from '../../utils/birthdayUtils';
import { VirtualBirthdayCard } from './VirtualBirthdayCard';

interface BirthdayCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaborador: Colaborador | null;
  empresaNome?: string;
  onNotifySuccess?: (msg: string) => void;
}

export const BirthdayCelebrationModal: React.FC<BirthdayCelebrationModalProps> = ({
  isOpen,
  onClose,
  colaborador,
  empresaNome = 'Jobson de Moraes Transportes (JMT)',
  onNotifySuccess,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('institucional');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [phoneOverride, setPhoneOverride] = useState<string>('');
  const [emailOverride, setEmailOverride] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

  const birthdayInfo = colaborador ? parseBirthdayInfo(colaborador.dataNascimento) : null;

  // Initialize or reset when employee changes
  useEffect(() => {
    if (colaborador) {
      setPhoneOverride(colaborador.telefoneWhatsapp || '');
      setEmailOverride(colaborador.email || '');

      const initialTemplate =
        BIRTHDAY_TEMPLATES.find((t) => t.id === selectedTemplateId) || BIRTHDAY_TEMPLATES[0];

      const compiled = compileBirthdayMessage(initialTemplate.texto, {
        nome: colaborador.nomeCompleto,
        cargo: colaborador.funcaoCargo,
        empresa: empresaNome,
        idade: birthdayInfo?.idadeCompletando,
      });

      setCustomMessage(compiled);
    }
  }, [colaborador, selectedTemplateId, empresaNome]);

  if (!isOpen || !colaborador || !birthdayInfo) return null;

  const handleSelectTemplate = (template: BirthdayTemplate) => {
    setSelectedTemplateId(template.id);
    const compiled = compileBirthdayMessage(template.texto, {
      nome: colaborador.nomeCompleto,
      cargo: colaborador.funcaoCargo,
      empresa: empresaNome,
      idade: birthdayInfo.idadeCompletando,
    });
    setCustomMessage(compiled);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopied(true);
      if (onNotifySuccess) {
        onNotifySuccess('Mensagem de aniversário copiada para a área de transferência!');
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar texto', err);
    }
  };

  const handleSendWhatsApp = () => {
    const targetPhone = phoneOverride || colaborador.telefoneWhatsapp;
    if (!targetPhone) {
      alert('Por favor, informe um número de telefone com DDD para envio via WhatsApp.');
      return;
    }
    const url = buildWhatsAppLink(targetPhone, customMessage);
    window.open(url, '_blank');
    if (onNotifySuccess) {
      onNotifySuccess(`Abrindo WhatsApp para felicitar ${colaborador.nomeCompleto.split(' ')[0]}...`);
    }
  };

  const handleSendEmail = () => {
    const targetEmail = emailOverride || colaborador.email;
    if (!targetEmail) {
      alert('Por favor, informe um e-mail válido para envio.');
      return;
    }
    const subject = `🎉 Feliz Aniversário, ${colaborador.nomeCompleto.split(' ')[0]}! - Homenagem JMT`;
    const url = buildMailtoLink(targetEmail, subject, customMessage);
    window.location.href = url;
    if (onNotifySuccess) {
      onNotifySuccess('Abrindo cliente de e-mail corporativo...');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">
                  Central de Felicitações & Homenagem
                </h2>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  {birthdayInfo.dataFormatada}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Parabenize <span className="text-amber-700 font-bold">{colaborador.nomeCompleto}</span> ({colaborador.funcaoCargo})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Celebrant Profile Summary Card */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500 text-white font-black text-base flex items-center justify-center shadow-md border-2 border-white shrink-0">
                {colaborador.nomeCompleto.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>{colaborador.nomeCompleto}</span>
                  {birthdayInfo.isHoje && (
                    <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-full animate-bounce">
                      É HOJE! 🎂
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600">
                  {colaborador.funcaoCargo} • Setor: {colaborador.setor || 'Geral'}
                </div>
                <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
                  🎂 {birthdayInfo.dataFormatada} • {birthdayInfo.idadeCompletando ? `Completando ${birthdayInfo.idadeCompletando} anos` : ''} • {birthdayInfo.signo}
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-amber-300 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'editor'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor de Mensagem</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'preview'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Cartão Virtual</span>
              </button>
            </div>
          </div>

          {viewMode === 'preview' ? (
            /* Virtual Card Preview */
            <div className="space-y-4">
              <div className="max-w-2xl mx-auto">
                <VirtualBirthdayCard
                  nome={colaborador.nomeCompleto}
                  cargo={colaborador.funcaoCargo}
                  empresaNome={empresaNome}
                  birthdayInfo={birthdayInfo}
                  mensagem={customMessage}
                />
              </div>

              <p className="text-center text-xs text-slate-500">
                Você pode enviar este texto diretamente pelo WhatsApp, E-mail ou copiar para os murais corporativos.
              </p>
            </div>
          ) : (
            /* Message Editor & Template Picker */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Template Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    1. Modelos Prontos
                  </label>
                  <span className="text-[10px] text-slate-400">Clique para aplicar</span>
                </div>

                <div className="space-y-2">
                  {BIRTHDAY_TEMPLATES.map((template) => {
                    const isSelected = selectedTemplateId === template.id;
                    return (
                      <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-slate-800'}`}>
                            {template.titulo}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {template.descricao}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Recipient Contact Overrides */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Destinatário & Contato
                  </label>

                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>WhatsApp / Telefone</span>
                    </span>
                    <input
                      type="text"
                      value={phoneOverride}
                      onChange={(e) => setPhoneOverride(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span>E-mail Corporativo / Pessoal</span>
                    </span>
                    <input
                      type="email"
                      value={emailOverride}
                      onChange={(e) => setEmailOverride(e.target.value)}
                      placeholder="colaborador@empresa.com.br"
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Right 2 Columns: Message Composer */}
              <div className="lg:col-span-2 space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    2. Personalizar Texto da Homenagem
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {customMessage.length} caracteres
                  </span>
                </div>

                <div className="relative flex-1">
                  <textarea
                    rows={12}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-4 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-sans leading-relaxed resize-y bg-slate-50/50"
                    placeholder="Escreva sua mensagem de parabéns personalizada..."
                  />
                </div>

                {/* Quick Variable Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Atalhos rápidos:</span>
                  <button
                    type="button"
                    onClick={() => setCustomMessage((prev) => prev + `\n\n🎉 Parabéns de toda a equipe JMT!`)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    + Assinatura JMT
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomMessage((prev) => prev + ` 🎂🎈✨`)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    + Emojis Festivos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const template = BIRTHDAY_TEMPLATES.find((t) => t.id === selectedTemplateId);
                      if (template) handleSelectTemplate(template);
                    }}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 flex items-center gap-1 transition-colors ml-auto"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Restaurar Padrão</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyMessage}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copiado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            {emailOverride && (
              <button
                type="button"
                onClick={handleSendEmail}
                className="w-full sm:w-auto px-4 py-2.5 bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Enviar por E-mail</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-800 text-xs font-semibold"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>Mandar Parabéns via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
