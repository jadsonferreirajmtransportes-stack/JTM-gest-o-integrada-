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
  FolderKanban,
  Target,
  DollarSign,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { ProjetoGerencial, Supervisor, Colaborador } from '../../types';
import {
  resolvePessoasEnvolvidasProjeto,
  generateProjetoWhatsAppMessage,
  generateProjetoEmailContent,
  getWhatsAppDirectUrl,
  getWhatsAppShareUrl,
  getMailtoUrl,
  getGmailWebComposeUrl,
  formatPhoneForWhatsApp,
  TipoModeloResumoProjeto,
  PessoaEnvolvidaProjeto,
} from './projetoUtils';

interface ProjetoResumoModalProps {
  isOpen: boolean;
  onClose: () => void;
  projeto: ProjetoGerencial | null;
  supervisores?: Supervisor[];
  colaboradores?: Colaborador[];
}

export const ProjetoResumoModal: React.FC<ProjetoResumoModalProps> = ({
  isOpen,
  onClose,
  projeto,
  supervisores = [],
  colaboradores = [],
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>('whatsapp');
  const [tipoModelo, setTipoModelo] = useState<TipoModeloResumoProjeto>('resumo_executivo');
  const [observacaoCustom, setObservacaoCustom] = useState('');
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Inicializar destinatários cruzando com a base de líderes e equipe
  const initialPessoas = useMemo(() => {
    if (!projeto) return [];
    return resolvePessoasEnvolvidasProjeto(projeto, supervisores, colaboradores);
  }, [projeto, supervisores, colaboradores]);

  const [pessoas, setPessoas] = useState<PessoaEnvolvidaProjeto[]>(initialPessoas);
  const [novoNome, setNovoNome] = useState('');
  const [novoTel, setNovoTel] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [showAddPessoa, setShowAddPessoa] = useState(false);

  // Destinatários selecionados (usado pelas prévias abaixo)
  const selectedPessoas = pessoas.filter((p) => p.selecionado);

  // Previews
  const previewWhatsAppMessage = useMemo(() => {
    if (!projeto) return '';
    return generateProjetoWhatsAppMessage(
      projeto,
      selectedPessoas.length === 1 ? selectedPessoas[0].nome : undefined,
      observacaoCustom,
      tipoModelo
    );
  }, [projeto, selectedPessoas, observacaoCustom, tipoModelo]);

  const previewEmail = useMemo(() => {
    if (!projeto) return { subject: '', body: '' };
    return generateProjetoEmailContent(projeto, observacaoCustom, tipoModelo);
  }, [projeto, observacaoCustom, tipoModelo]);

  if (!isOpen || !projeto) return null;

  const selectedEmails = selectedPessoas
    .map((p) => p.email?.trim())
    .filter((e): e is string => !!e && e.includes('@'));
  const selectedPhones = selectedPessoas
    .map((p) => ({ nome: p.nome, tel: p.telefone?.trim() }))
    .filter((p) => !!p.tel && p.tel.replace(/\D/g, '').length >= 8);

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
    const newPerson: PessoaEnvolvidaProjeto = {
      id: `custom-${Date.now()}`,
      nome: novoNome.trim(),
      papel: 'extra',
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

  // Copiar para área de transferência
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(label);
    setStatusFeedback('Copiado para a área de transferência com sucesso!');
    setTimeout(() => {
      setCopiedState(null);
      setStatusFeedback(null);
    }, 2500);
  };

  // Disparo direto WhatsApp
  const handleOpenWhatsAppDirect = (phone: string, name?: string) => {
    const personalized = generateProjetoWhatsAppMessage(
      projeto,
      name,
      observacaoCustom,
      tipoModelo
    );
    const url = getWhatsAppDirectUrl(phone, personalized);
    window.open(url, '_blank', 'noopener,noreferrer');
    setStatusFeedback(`Abrindo WhatsApp para ${name || 'destinatário'}...`);
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  // Compartilhamento geral WhatsApp
  const handleOpenWhatsAppGeneral = () => {
    const url = getWhatsAppShareUrl(previewWhatsAppMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
    setStatusFeedback('Abrindo WhatsApp para seleção de contato ou grupo...');
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  // E-mail Actions
  const handleOpenMailto = () => {
    if (selectedEmails.length === 0) {
      alert('Nenhum e-mail válido selecionado. Por favor, marque ou insira ao menos um e-mail.');
      return;
    }
    const url = getMailtoUrl(selectedEmails, previewEmail.subject, previewEmail.body);
    window.location.href = url;
    setStatusFeedback('Abrindo cliente de e-mail padrão...');
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  const handleOpenGmailWeb = () => {
    if (selectedEmails.length === 0) {
      alert('Nenhum e-mail válido selecionado. Por favor, marque ou insira ao menos um e-mail.');
      return;
    }
    const url = getGmailWebComposeUrl(selectedEmails, previewEmail.subject, previewEmail.body);
    window.open(url, '_blank', 'noopener,noreferrer');
    setStatusFeedback('Abrindo composição do Gmail...');
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Superior */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-purple-700 border border-slate-200">
                  {projeto.codigo}
                </span>
                <span className="text-xs text-slate-500">Progresso: <strong>{projeto.progressoPercentual}%</strong></span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5 truncate max-w-lg">
                Enviar Resumo do Projeto: {projeto.titulo}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {statusFeedback && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusFeedback}</span>
          </div>
        )}

        {/* Tabs Principais: WhatsApp vs E-mail */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Disparo via WhatsApp</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold">
              Instantâneo
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Disparo via E-mail Corporativo</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold">
              Gmail / Outlook
            </span>
          </button>
        </div>

        {/* Corpo do Modal (2 Colunas no Desktop) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seletor de Modelo de Mensagem */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Selecione o Modelo de Resumo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTipoModelo('resumo_executivo')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tipoModelo === 'resumo_executivo'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FolderKanban className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-bold">Resumo Executivo</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Síntese completa com status, marcos, finanças e RDC 430.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTipoModelo('status_report')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tipoModelo === 'status_report'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold">Status Report</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Foco em entregas semanais, tarefas ativas e riscos.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTipoModelo('marcos_prazos')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tipoModelo === 'marcos_prazos'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-bold">Marcos & Prazos</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Alinhamento cronológico de entregas e deadlines.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTipoModelo('orcamento_custos')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  tipoModelo === 'orcamento_custos'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold">Orçamento & Finanças</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Balanço Capex/Opex, realizados, saldo e ROI.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Destinatários e Observações */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">
                      Destinatários ({selectedPessoas.length}/{pessoas.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="text-purple-600 hover:underline font-semibold"
                    >
                      Todos
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="text-slate-500 hover:underline"
                    >
                      Nenhum
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {pessoas.map((p) => {
                    const isPhoneOk = !!p.telefone && p.telefone.replace(/\D/g, '').length >= 8;

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border text-xs transition-all ${
                          p.selecionado
                            ? 'bg-white border-purple-200 shadow-xs'
                            : 'bg-slate-100/70 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={p.selecionado}
                              onChange={() => handleTogglePessoa(p.id)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                            />
                            <div className="min-w-0 truncate">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="truncate">{p.nome}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    p.papel === 'lider'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {p.papel === 'lider' ? 'Líder' : 'Equipe'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {p.cargo || 'Membro do Projeto'}
                              </span>
                            </div>
                          </label>

                          {p.papel === 'extra' && (
                            <button
                              type="button"
                              onClick={() => handleRemovePessoa(p.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Campos editáveis rápidos */}
                        {p.selecionado && (
                          <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[11px]">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={p.telefone || ''}
                                onChange={(e) => handleUpdateContact(p.id, 'telefone', e.target.value)}
                                placeholder="WhatsApp (ex: 11987654321)"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono"
                              />
                              {isPhoneOk && activeTab === 'whatsapp' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsAppDirect(p.telefone!, p.nome)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded shrink-0"
                                  title={`Enviar direto para ${p.nome}`}
                                >
                                  <Send className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div>
                              <input
                                type="email"
                                value={p.email || ''}
                                onChange={(e) => handleUpdateContact(p.id, 'email', e.target.value)}
                                placeholder="E-mail"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Adicionar Destinatário Avulso */}
                {showAddPessoa ? (
                  <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 text-[11px]">Adicionar Destinatário Extra</span>
                    <input
                      type="text"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Nome completo..."
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={novoTel}
                        onChange={(e) => setNovoTel(e.target.value)}
                        placeholder="WhatsApp (ex: 11987654321)"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                      <input
                        type="email"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        placeholder="E-mail corporativo"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddPessoa(false)}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomPessoa}
                        className="px-3 py-1 bg-purple-600 text-white font-bold rounded-lg text-xs"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddPessoa(true)}
                    className="w-full py-1.5 bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Outro Contato</span>
                  </button>
                )}
              </div>

              {/* Mensagem / Observação Adicional da Gestão */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Mensagem Adicional da Gestão (Opcional)
                </label>
                <textarea
                  value={observacaoCustom}
                  onChange={(e) => setObservacaoCustom(e.target.value)}
                  rows={3}
                  placeholder="Insira aqui orientações específicas, próximos passos ou recados para a diretoria/equipe..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Coluna Direita: Visualização Prévia ao Vivo */}
            <div className="lg:col-span-7 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  {activeTab === 'whatsapp' ? (
                    <>
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Visualização da Mensagem (Formato WhatsApp)</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Visualização do E-mail Corporativo</span>
                    </>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      activeTab === 'whatsapp' ? previewWhatsAppMessage : previewEmail.body,
                      'preview_text'
                    )
                  }
                  className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1"
                >
                  {copiedState === 'preview_text' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>

              {activeTab === 'whatsapp' ? (
                /* WhatsApp Style Bubble */
                <div className="flex-1 bg-[#efeae2] p-4 rounded-2xl border border-slate-200 shadow-inner flex flex-col justify-between min-h-[300px]">
                  <div className="bg-white rounded-xl rounded-tl-xs p-4 shadow-sm border border-slate-200/80 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed max-h-[340px] overflow-y-auto">
                    {previewWhatsAppMessage}
                  </div>
                  <div className="text-[10px] text-slate-500 text-right pt-2">
                    Visualização formatada para WhatsApp com marcações em negrito e listas.
                  </div>
                </div>
              ) : (
                /* Email Format View */
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col min-h-[300px]">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="text-slate-400 font-semibold text-[10px] uppercase">Assunto:</div>
                    <div className="font-bold text-slate-900">{previewEmail.subject}</div>
                  </div>
                  <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[260px] overflow-y-auto">
                    {previewEmail.body}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé de Ações Instantâneas */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {activeTab === 'whatsapp' ? (
              <span>
                {selectedPhones.length > 0 ? (
                  <><strong>{selectedPhones.length}</strong> contatos com número identificados</>
                ) : (
                  <>Selecione ou adicione ao menos um número de WhatsApp</>
                )}
              </span>
            ) : (
              <span>
                {selectedEmails.length > 0 ? (
                  <><strong>{selectedEmails.length}</strong> e-mails selecionados</>
                ) : (
                  <>Selecione ou insira ao menos um e-mail válido</>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {activeTab === 'whatsapp' ? (
              <>
                <button
                  type="button"
                  onClick={() => copyToClipboard(previewWhatsAppMessage, 'btn_copy_wa')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedState === 'btn_copy_wa' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-600">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Texto WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenWhatsAppGeneral}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                  title="Abrir WhatsApp para escolher qualquer contato ou grupo"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Abrir WhatsApp (Grupo / Contato)</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedEmails.join(', '), 'btn_copy_emails')}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedState === 'btn_copy_emails' ? (
                    <span className="text-emerald-600">E-mails Copiados!</span>
                  ) : (
                    <span>Copiar E-mails ({selectedEmails.length})</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(previewEmail.body, 'btn_copy_email_body')}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedState === 'btn_copy_email_body' ? (
                    <span className="text-emerald-600">Corpo Copiado!</span>
                  ) : (
                    <span>Copiar Corpo</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenMailto}
                  className="px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  title="Abrir no cliente de e-mail padrão do computador"
                >
                  <Mail className="w-4 h-4" />
                  <span>App de E-mail</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenGmailWeb}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                  title="Abrir no Gmail Web"
                >
                  <Send className="w-4 h-4" />
                  <span>Abrir no Gmail Web</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
