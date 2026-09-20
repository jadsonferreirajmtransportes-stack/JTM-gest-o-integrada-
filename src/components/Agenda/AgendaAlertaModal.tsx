import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Mail,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Users,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  Video,
} from 'lucide-react';
import { AtividadeGestao, Supervisor, Colaborador } from '../../types';
import {
  CATEGORIA_CONFIG,
  resolvePessoasEnvolvidas,
  generateWhatsAppMessage,
  generateEmailContent,
  getWhatsAppDirectUrl,
  getWhatsAppShareUrl,
  getMailtoUrl,
  getGmailWebComposeUrl,
  formatPhoneForWhatsApp,
  formatAtividadeDateLabel,
  getTipoLocalEfetivo,
  TipoModeloAlerta,
  PessoaEnvolvida,
} from './agendaUtils';

interface AgendaAlertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  atividade: AtividadeGestao | null;
  supervisores: Supervisor[];
  colaboradores: Colaborador[];
  onRecordAlerta?: (atividadeId: string, canal: 'whatsapp' | 'email' | 'ambos') => void;
}

export const AgendaAlertaModal: React.FC<AgendaAlertaModalProps> = ({
  isOpen,
  onClose,
  atividade,
  supervisores,
  colaboradores,
  onRecordAlerta,
}) => {

  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>('whatsapp');
  const [tipoModelo, setTipoModelo] = useState<TipoModeloAlerta>('lembrete');
  const [observacaoCustom, setObservacaoCustom] = useState('');
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Initialize recipients from activity + database
  const initialPessoas = useMemo(() => {
    if (!atividade) return [];
    return resolvePessoasEnvolvidas(atividade, supervisores, colaboradores);
  }, [atividade, supervisores, colaboradores]);

  const [pessoas, setPessoas] = useState<PessoaEnvolvida[]>(initialPessoas);
  const [novoNome, setNovoNome] = useState('');
  const [novoTel, setNovoTel] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [showAddPessoa, setShowAddPessoa] = useState(false);

  // Filter selected recipients (needed by the previews below)
  const selectedPessoas = pessoas.filter((p) => p.selecionado);

  // Previews
  const previewWhatsAppMessage = useMemo(() => {
    if (!atividade) return '';
    return generateWhatsAppMessage(
      atividade,
      selectedPessoas.length === 1 ? selectedPessoas[0].nome : undefined,
      observacaoCustom,
      tipoModelo
    );
  }, [atividade, selectedPessoas, observacaoCustom, tipoModelo]);

  const previewEmail = useMemo(() => {
    if (!atividade) return { subject: '', body: '' };
    return generateEmailContent(atividade, observacaoCustom, tipoModelo);
  }, [atividade, observacaoCustom, tipoModelo]);

  if (!isOpen || !atividade) return null;

  const catConfig = CATEGORIA_CONFIG[atividade.categoria];

  // Formatting date for display
  const formattedDate = formatAtividadeDateLabel(atividade);

  const timeStr = atividade.diaInteiro
    ? 'Dia Inteiro'
    : `${atividade.horaInicio} às ${atividade.horaFim}`;

  // Filter selected recipients
  const selectedEmails = selectedPessoas
    .map((p) => p.email?.trim())
    .filter((e): e is string => !!e && e.includes('@'));
  const selectedPhones = selectedPessoas
    .map((p) => ({ nome: p.nome, tel: p.telefone?.trim() }))
    .filter((p) => !!p.tel && p.tel.replace(/\D/g, '').length >= 8);

  // Toggle selection
  const handleTogglePessoa = (id: string) => {
    setPessoas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selecionado: !p.selecionado } : p))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setPessoas((prev) => prev.map((p) => ({ ...p, selecionado: select })));
  };

  const handleUpdateContact = (id: string, field: 'telefone' | 'email', value: string) => {
    setPessoas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleAddCustomPessoa = () => {
    if (!novoNome.trim()) return;
    const newPerson: PessoaEnvolvida = {
      id: `custom-${Date.now()}`,
      nome: novoNome.trim(),
      tipo: 'extra',
      telefone: novoTel.trim(),
      email: novoEmail.trim(),
      selecionado: true,
    };
    setPessoas((prev) => [...prev, newPerson]);
    setNovoNome('');
    setNovoTel('');
    setNovoEmail('');
    setShowAddPessoa(false);
  };

  const handleRemovePessoa = (id: string) => {
    setPessoas((prev) => prev.filter((p) => p.id !== id));
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(label);
    setStatusFeedback(`Copiado para a área de transferência!`);
    setTimeout(() => {
      setCopiedState(null);
      setStatusFeedback(null);
    }, 2500);
  };

  // WhatsApp Actions
  const handleOpenWhatsAppDirect = (phone: string, name?: string) => {
    const personalized = generateWhatsAppMessage(atividade, name, observacaoCustom, tipoModelo);
    const url = getWhatsAppDirectUrl(phone, personalized);
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onRecordAlerta) onRecordAlerta(atividade.id, 'whatsapp');
    setStatusFeedback(`Abrindo WhatsApp para ${name || 'destinatário'}...`);
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  const handleOpenWhatsAppGeneral = () => {
    const url = getWhatsAppShareUrl(previewWhatsAppMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onRecordAlerta) onRecordAlerta(atividade.id, 'whatsapp');
    setStatusFeedback('Abrindo WhatsApp para seleção de contato ou grupo...');
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  // Email Actions
  const handleOpenMailto = () => {
    if (selectedEmails.length === 0) {
      alert('Nenhum e-mail válido selecionado. Por favor, adicione ou selecione ao menos um e-mail.');
      return;
    }
    const url = getMailtoUrl(selectedEmails, previewEmail.subject, previewEmail.body);
    window.location.href = url;
    if (onRecordAlerta) onRecordAlerta(atividade.id, 'email');
    setStatusFeedback(`Disparando cliente de e-mail padrão para ${selectedEmails.length} pessoas...`);
    setTimeout(() => setStatusFeedback(null), 3500);
  };

  const handleOpenGmailWeb = () => {
    if (selectedEmails.length === 0) {
      alert('Nenhum e-mail válido selecionado. Por favor, adicione ou selecione ao menos um e-mail.');
      return;
    }
    const url = getGmailWebComposeUrl(selectedEmails, previewEmail.subject, previewEmail.body);
    window.open(url, '_blank', 'noopener,noreferrer');
    if (onRecordAlerta) onRecordAlerta(atividade.id, 'email');
    setStatusFeedback('Abrindo rascunho de e-mail no Gmail Web...');
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-4 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C48229] text-white flex items-center justify-center shadow-md shadow-[#C48229]/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Disparar Alerta da Agenda de Gestão
                </h1>
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}
                >
                  {atividade.categoria}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Envie lembretes e notificações instantâneas aos envolvidos via WhatsApp ou E-mail
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Banner if any */}
        {statusFeedback && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusFeedback}</span>
            </div>
          </div>
        )}

        {/* Activity Summary Bar */}
        <div className="px-6 py-2.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between gap-4 flex-wrap text-xs text-[#5c4526]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold">{atividade.titulo}</span>
            <span className="text-amber-400">•</span>
            <span className="flex items-center gap-1 text-[#92611F]">
              <Calendar className="w-3.5 h-3.5 text-[#C48229]" />
              {formattedDate}
            </span>
            <span className="text-amber-400">•</span>
            <span className="flex items-center gap-1 text-[#92611F]">
              <Clock className="w-3.5 h-3.5 text-[#C48229]" />
              {timeStr}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#92611F] font-medium">
            {getTipoLocalEfetivo(atividade) === 'videoconferencia' ? (
              <Video className="w-3 h-3 text-[#C48229]" />
            ) : (
              <MapPin className="w-3 h-3 text-[#C48229]" />
            )}
            <span className="truncate max-w-[200px]">{atividade.localOuLink}</span>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Channel Selector Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Alerta via WhatsApp</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'whatsapp'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {selectedPhones.length} com número
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'email'
                  ? 'bg-[#C48229] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Alerta via E-mail</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'email'
                    ? 'bg-[#92611F] text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {selectedEmails.length} com e-mail
              </span>
            </button>
          </div>

          {/* Grid: Left Column (Pessoas & Opções) | Right Column (Preview & Disparo) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: 7 Cols */}
            <div className="lg:col-span-7 space-y-5">
              {/* Template selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tipo de Comunicado / Modelo da Mensagem:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoModelo('lembrete')}
                    className={`p-2 rounded-xl border text-left text-xs transition-all ${
                      tipoModelo === 'lembrete'
                        ? 'border-[#C48229] bg-amber-50/60 text-[#5c4526] font-bold ring-2 ring-[#C48229]/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-sm mb-0.5">🔔</span>
                    <span className="leading-tight block font-semibold">Lembrete</span>
                    <span className="text-[10px] text-slate-500 block">Padrão de Agenda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoModelo('urgente')}
                    className={`p-2 rounded-xl border text-left text-xs transition-all ${
                      tipoModelo === 'urgente'
                        ? 'border-rose-600 bg-rose-50/60 text-rose-900 font-bold ring-2 ring-rose-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-sm mb-0.5">🚨</span>
                    <span className="leading-tight block font-semibold">Urgente</span>
                    <span className="text-[10px] text-slate-500 block">Convocação</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoModelo('sala')}
                    className={`p-2 rounded-xl border text-left text-xs transition-all ${
                      tipoModelo === 'sala'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-sm mb-0.5">💻</span>
                    <span className="leading-tight block font-semibold">Link de Sala</span>
                    <span className="text-[10px] text-slate-500 block">Meet / Teams</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoModelo('ata')}
                    className={`p-2 rounded-xl border text-left text-xs transition-all ${
                      tipoModelo === 'ata'
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-sm mb-0.5">📋</span>
                    <span className="leading-tight block font-semibold">Ata & Ações</span>
                    <span className="text-[10px] text-slate-500 block">Deliberações</span>
                  </button>
                </div>
              </div>

              {/* People involved section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#C48229]" />
                    <span className="text-xs font-bold text-slate-900">
                      Pessoas Envolvidas ({selectedPessoas.length}/{pessoas.length} selecionadas)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="text-[#C48229] hover:text-[#92611F] font-medium"
                    >
                      Marcar todas
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                {/* List of People */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {pessoas.map((p) => {
                    const hasPhone = !!p.telefone && p.telefone.replace(/\D/g, '').length >= 8;
                    const hasEmail = !!p.email && p.email.includes('@');

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border transition-all ${
                          p.selecionado
                            ? 'bg-white border-slate-300 shadow-2xs'
                            : 'bg-slate-50/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={p.selecionado}
                              onChange={() => handleTogglePessoa(p.id)}
                              className="mt-0.5 rounded border-slate-300 text-[#C48229] focus:ring-[#C48229]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">
                                  {p.nome}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium ${
                                    p.tipo === 'responsavel'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : p.tipo === 'extra'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {p.tipo === 'responsavel'
                                    ? 'Responsável'
                                    : p.tipo === 'extra'
                                    ? 'Adicionado'
                                    : 'Participante'}
                                </span>
                                {p.cargo && (
                                  <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                    ({p.cargo})
                                  </span>
                                )}
                              </div>

                              {/* Editable contact lines */}
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {/* Phone / WhatsApp */}
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                  <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                    WhatsApp:
                                  </span>
                                  <input
                                    type="text"
                                    value={p.telefone || ''}
                                    onChange={(e) =>
                                      handleUpdateContact(p.id, 'telefone', e.target.value)
                                    }
                                    placeholder="(DDD) 9xxxx-xxxx"
                                    className="bg-transparent border-0 text-slate-800 text-[11px] focus:outline-hidden flex-1 font-mono"
                                  />
                                  {hasPhone && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenWhatsAppDirect(p.telefone!, p.nome)}
                                      title="Enviar WhatsApp direto para esta pessoa"
                                      className="p-1 hover:bg-emerald-100 text-emerald-600 rounded transition-colors"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {/* Email */}
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                  <span className="text-[10px] font-bold text-[#92611F] uppercase">
                                    E-mail:
                                  </span>
                                  <input
                                    type="email"
                                    value={p.email || ''}
                                    onChange={(e) =>
                                      handleUpdateContact(p.id, 'email', e.target.value)
                                    }
                                    placeholder="nome@empresa.com"
                                    className="bg-transparent border-0 text-slate-800 text-[11px] focus:outline-hidden flex-1"
                                  />
                                  {hasEmail && (
                                    <a
                                      href={`mailto:${p.email}?subject=${encodeURIComponent(
                                        previewEmail.subject
                                      )}&body=${encodeURIComponent(previewEmail.body)}`}
                                      title="Enviar e-mail individual"
                                      className="p-1 hover:bg-amber-100 text-[#C48229] rounded transition-colors"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </label>

                          {p.tipo === 'extra' && (
                            <button
                              type="button"
                              onClick={() => handleRemovePessoa(p.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                              title="Remover destinatário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add new person row toggle */}
                {!showAddPessoa ? (
                  <button
                    type="button"
                    onClick={() => setShowAddPessoa(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#C48229] hover:text-[#92611F] bg-amber-50/60 hover:bg-amber-100/60 rounded-lg border border-dashed border-amber-200 flex items-center gap-1.5 transition-colors w-full justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar outro contato / convidado externo</span>
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 space-y-2 animate-in fade-in duration-100">
                    <span className="text-xs font-bold text-slate-800 block">
                      Novo Contato para este Alerta:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        placeholder="Nome completo *"
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={novoTel}
                        onChange={(e) => setNovoTel(e.target.value)}
                        placeholder="WhatsApp (ex: 11987654321)"
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                      <input
                        type="email"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        placeholder="E-mail (opcional)"
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddPessoa(false)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200/60 rounded-md"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomPessoa}
                        disabled={!novoNome.trim()}
                        className="px-3 py-1 bg-[#C48229] hover:bg-[#92611F] disabled:opacity-50 text-white rounded-md text-xs font-semibold"
                      >
                        Salvar e Incluir
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom note to append */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nota Adicional da Coordenação (opcional):
                </label>
                <textarea
                  rows={2}
                  value={observacaoCustom}
                  onChange={(e) => setObservacaoCustom(e.target.value)}
                  placeholder="Ex: Favor levar os relatórios de temperatura impressos e ter em mãos as credenciais da Anvisa..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#C48229] focus:bg-white"
                />
              </div>
            </div>

            {/* Right Column: 5 Cols - Live Preview & Direct Actions */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Pré-visualização do Alerta
                </span>
                <span className="text-[11px] text-slate-500">
                  {activeTab === 'whatsapp' ? 'Formato WhatsApp' : 'Formato E-mail'}
                </span>
              </div>

              {/* Preview Container */}
              {activeTab === 'whatsapp' ? (
                /* WhatsApp Chat Style Bubble */
                <div className="flex-1 flex flex-col bg-[#e5ddd5] rounded-2xl border border-slate-300 p-3.5 shadow-inner min-h-[340px]">
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#d1c7bc] text-slate-700 text-[11px] font-medium">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Visualização da Mensagem (WhatsApp)</span>
                  </div>

                  <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm border border-emerald-100 flex-1 overflow-y-auto max-h-[350px]">
                    <pre className="text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed select-text">
                      {previewWhatsAppMessage}
                    </pre>
                    <div className="mt-2 text-right text-[10px] text-slate-400 font-mono">
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>
              ) : (
                /* Email Inbox Style Card */
                <div className="flex-1 flex flex-col bg-slate-50 rounded-2xl border border-slate-300 p-3.5 shadow-inner min-h-[340px]">
                  <div className="bg-white rounded-xl p-3 shadow-2xs border border-slate-200 flex-1 overflow-y-auto max-h-[350px] space-y-2">
                    <div className="border-b border-slate-100 pb-2 space-y-1">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <strong className="text-slate-700">Para:</strong>{' '}
                        {selectedEmails.length > 0
                          ? selectedEmails.join(', ')
                          : '(Nenhum e-mail selecionado)'}
                      </div>
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        <span className="text-slate-500 font-normal">Assunto: </span>
                        {previewEmail.subject}
                      </div>
                    </div>
                    <pre className="text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed select-text pt-1">
                      {previewEmail.body}
                    </pre>
                  </div>
                </div>
              )}

              {/* Action Buttons for active channel */}
              <div className="space-y-2 pt-1">
                {activeTab === 'whatsapp' ? (
                  <div className="space-y-2">
                    {/* Send to individual buttons if recipients have phone */}
                    {selectedPhones.length > 0 && (
                      <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-900 block">
                          Disparo Direto para Contato no WhatsApp:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {selectedPhones.map((sp, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleOpenWhatsAppDirect(sp.tel, sp.nome)}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{sp.nome.split(' ')[0]} ({formatPhoneForWhatsApp(sp.tel)})</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* General WhatsApp Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleOpenWhatsAppGeneral}
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                        title="Abrir WhatsApp para selecionar qualquer contato ou grupo"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Abrir WhatsApp (Grupo / Contato)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(previewWhatsAppMessage, 'msg_whatsapp')
                        }
                        className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                      >
                        {copiedState === 'msg_whatsapp' ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700">Mensagem Copiada!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-500" />
                            <span>Copiar Texto WhatsApp</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Email Action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleOpenMailto}
                        disabled={selectedEmails.length === 0}
                        className="w-full py-2.5 px-3 bg-[#C48229] hover:bg-[#92611F] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C48229]/20"
                        title="Abrir aplicativo de e-mail padrão do sistema"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Disparar E-mail ({selectedEmails.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenGmailWeb}
                        disabled={selectedEmails.length === 0}
                        className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-600/20"
                        title="Criar novo e-mail direto na interface do Gmail Web"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir no Gmail Web</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `Assunto: ${previewEmail.subject}\n\n${previewEmail.body}`,
                            'email_body'
                          )
                        }
                        className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                      >
                        {copiedState === 'email_body' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Texto Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copiar Corpo do E-mail</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(selectedEmails.join('; '), 'emails_list')
                        }
                        disabled={selectedEmails.length === 0}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                      >
                        {copiedState === 'emails_list' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Lista Copiada!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copiar E-mails ({selectedEmails.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px] flex items-center gap-2">
            <span>
              Destinatários ativos:{' '}
              <strong className="text-slate-700">{selectedPessoas.length}</strong> pessoa(s)
            </span>
            {atividade.ultimoAlertaEnviadoEm && (
              <span className="text-[#C48229] font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                Último alerta enviado em:{' '}
                {new Date(atividade.ultimoAlertaEnviadoEm).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
