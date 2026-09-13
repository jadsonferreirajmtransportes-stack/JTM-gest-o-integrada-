import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Download,
  AlertCircle,
  X,
  Save,
  DollarSign,
  Palmtree,
  UserCheck,
  MessageCircle,
  Mail,
  Copy,
  Printer,
  Paperclip,
} from 'lucide-react';
import {
  Colaborador,
  ProgramacaoFerias,
  StatusFerias,
  UserRole,
} from '../../types';
import { FeriasComprovanteUploader } from './FeriasComprovanteUploader';
import {
  formatDate,
  formatMoney,
  calcPeriodoAquisitivo,
  calcPrazoLimiteGozo,
  calcDaysRemaining,
  formatDaysCountdown,
  validateVacationFracionamento,
  validateVacationStartDate,
} from '../../utils/formatters';
import { exportFeriasReport } from '../../utils/exportUtils';
import { buildWhatsAppLink, buildMailtoLink } from '../../utils/birthdayUtils';
import {
  buildMensagemFerias,
  buildAssuntoEmailFerias,
  buildCorpoEmailFerias,
} from '../../utils/feriasComunicacaoUtils';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

// Períodos considerados para o relatório: dataInicio/dataFim da férias (ou cada etapa do
// fracionamento) precisam se sobrepor ao intervalo [periodoInicio, periodoFim] escolhido.
function feriasNoPeriodo(f: ProgramacaoFerias, periodoInicio: string, periodoFim: string): boolean {
  const sobrepoe = (aInicio?: string, aFim?: string) =>
    !!aInicio && !!aFim && aInicio <= periodoFim && periodoInicio <= aFim;
  if (f.fracionamento && f.fracionamento.length > 0) {
    return f.fracionamento.some((etapa) => sobrepoe(etapa.dataInicio, etapa.dataFim));
  }
  return sobrepoe(f.dataInicio, f.dataFim);
}

interface VacationViewProps {
  colaboradores: Colaborador[];
  feriasList: ProgramacaoFerias[];
  userRole: UserRole;
  onSaveFerias: (ferias: ProgramacaoFerias) => void;
  onUpdateStatusFerias: (id: string, newStatus: StatusFerias) => void;
}

export const VacationView: React.FC<VacationViewProps> = ({
  colaboradores,
  feriasList,
  userRole,
  onSaveFerias,
  onUpdateStatusFerias,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFerias, setEditingFerias] = useState<ProgramacaoFerias | null>(null);

  // Form State for modal
  const [selectedColabId, setSelectedColabId] = useState('');
  const [periodoAquisitivoInicio, setPeriodoAquisitivoInicio] = useState('');
  const [periodoAquisitivoFim, setPeriodoAquisitivoFim] = useState('');
  const [prazoLimiteGozo, setPrazoLimiteGozo] = useState('');
  const [abonoPecuniario, setAbonoPecuniario] = useState(false);
  const [diasAbono, setDiasAbono] = useState(10);
  const [diasGozados, setDiasGozados] = useState(30);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState<StatusFerias>('A programar');
  const [observacoes, setObservacoes] = useState('');

  // Fracionamento periods
  const [isFracionado, setIsFracionado] = useState(false);
  const [fracionamentos, setFracionamentos] = useState<
    { periodo: number; dataInicio: string; dataFim: string; dias: number }[]
  >([
    { periodo: 1, dataInicio: '', dataFim: '', dias: 14 },
    { periodo: 2, dataInicio: '', dataFim: '', dias: 16 },
  ]);

  const activeEmployees = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo'),
    [colaboradores]
  );

  // Filtered Ferias
  const filteredFerias = useMemo(() => {
    return feriasList.filter((f) => {
      if (selectedStatus !== 'todos' && f.status !== selectedStatus) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const colab = colaboradores.find((c) => c.id === f.colaboradorId);
        const matchName = colab?.nomeCompleto?.toLowerCase().includes(q);
        const matchMatricula = colab?.codigoMatricula?.toLowerCase().includes(q);
        if (!matchName && !matchMatricula) return false;
      }
      return true;
    });
  }, [feriasList, colaboradores, selectedStatus, searchQuery]);

  // Open Modal for New Vacation
  const handleOpenNew = (presetColabId?: string) => {
    const colab = presetColabId
      ? colaboradores.find((c) => c.id === presetColabId)
      : activeEmployees[0];

    const cId = colab ? colab.id : '';
    setSelectedColabId(cId);

    if (colab) {
      const aquisitivo = calcPeriodoAquisitivo(colab.dataAdmissao);
      setPeriodoAquisitivoInicio(aquisitivo.inicio);
      setPeriodoAquisitivoFim(aquisitivo.fim);
      setPrazoLimiteGozo(calcPrazoLimiteGozo(aquisitivo.fim));
    }

    setEditingFerias(null);
    setAbonoPecuniario(false);
    setDiasAbono(10);
    setDiasGozados(30);
    setDataInicio('');
    setDataFim('');
    setStatus('A programar');
    setObservacoes('');
    setIsFracionado(false);
    setIsModalOpen(true);
  };

  // When selected employee changes in modal
  const handleColabChange = (cId: string) => {
    setSelectedColabId(cId);
    const colab = colaboradores.find((c) => c.id === cId);
    if (colab) {
      const aquisitivo = calcPeriodoAquisitivo(colab.dataAdmissao);
      setPeriodoAquisitivoInicio(aquisitivo.inicio);
      setPeriodoAquisitivoFim(aquisitivo.fim);
      setPrazoLimiteGozo(calcPrazoLimiteGozo(aquisitivo.fim));
    }
  };

  // Save Vacation
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColabId) {
      alert('Selecione um colaborador.');
      return;
    }

    // Validate Start Date according to CLT
    if (dataInicio && !validateVacationStartDate(dataInicio)) {
      if (
        !window.confirm(
          'Aviso CLT: A data de início selecionada cai em quinta, sexta ou véspera de feriado/DSR. Deseja prosseguir mesmo assim?'
        )
      ) {
        return;
      }
    }

    const payload: ProgramacaoFerias = {
      id: editingFerias ? editingFerias.id : `ferias-${Date.now()}`,
      colaboradorId: selectedColabId,
      periodoAquisitivoInicio,
      periodoAquisitivoFim,
      prazoLimiteGozo,
      diasDireito: 30,
      abonoPecuniario,
      diasAbono: abonoPecuniario ? diasAbono : 0,
      diasGozados: abonoPecuniario ? 30 - diasAbono : diasGozados,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      fracionamento: isFracionado ? fracionamentos : undefined,
      status,
      observacoes: observacoes || undefined,
    };

    onSaveFerias(payload);
    setIsModalOpen(false);
  };

  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal dedicado para anexar/visualizar o comprovante de férias assinado pelo colaborador.
  const [comprovanteFerias, setComprovanteFerias] = useState<ProgramacaoFerias | null>(null);

  // Abre o WhatsApp/e-mail com a mensagem já preenchida — quem efetivamente envia é o usuário,
  // clicando em "Enviar" na própria janela do WhatsApp/cliente de e-mail (mesmo padrão já usado
  // em Aniversariantes e na Programação do Vale Alimentação).
  const handleEnviarWhatsApp = (f: ProgramacaoFerias, colaborador?: Colaborador) => {
    if (!colaborador?.telefoneWhatsapp) return;
    const url = buildWhatsAppLink(colaborador.telefoneWhatsapp, buildMensagemFerias(f, colaborador.nomeCompleto));
    if (url) window.open(url, '_blank');
  };

  const handleEnviarEmail = (f: ProgramacaoFerias, colaborador?: Colaborador) => {
    if (!colaborador?.email) return;
    const url = buildMailtoLink(
      colaborador.email,
      buildAssuntoEmailFerias(f),
      buildCorpoEmailFerias(f, colaborador.nomeCompleto)
    );
    // mailto: precisa ir por window.location.href (não window.open) — é assim que o resto do
    // app já abre o cliente de e-mail (ver BirthdayCelebrationModal) sem navegar a SPA para fora.
    if (url) window.location.href = url;
  };

  const handleCopiarMensagem = async (f: ProgramacaoFerias, colaborador?: Colaborador) => {
    try {
      await navigator.clipboard.writeText(buildMensagemFerias(f, colaborador?.nomeCompleto));
      setCopiadoId(f.id);
      setTimeout(() => setCopiadoId((atual) => (atual === f.id ? null : atual)), 2000);
    } catch {
      // Clipboard indisponível — sem tratamento adicional, WhatsApp/E-mail continuam funcionando.
    }
  };

  // Relatório em PDF por período
  const [isRelatorioAberto, setIsRelatorioAberto] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);
  const [relatorioInicio, setRelatorioInicio] = useState(hoje.slice(0, 8) + '01'); // 1º dia do mês atual
  const [relatorioFim, setRelatorioFim] = useState(hoje);

  const feriasDoRelatorio = useMemo(
    () => feriasList.filter((f) => feriasNoPeriodo(f, relatorioInicio, relatorioFim)),
    [feriasList, relatorioInicio, relatorioFim]
  );

  const contagemPorStatus = useMemo(() => {
    const mapa: Record<string, number> = {};
    feriasDoRelatorio.forEach((f) => {
      mapa[f.status] = (mapa[f.status] || 0) + 1;
    });
    return mapa;
  }, [feriasDoRelatorio]);

  const handleImprimirRelatorio = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold uppercase">
            Gestão CLT & Auditoria JMT
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Programação e Controle de Férias CLT
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento de períodos aquisitivos, prazos limites de gozo (para evitar pagamento em dobro), fracionamentos e abonos pecuniários.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportFeriasReport(feriasList, colaboradores, 'xlsx')}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRelatorioAberto((v) => !v)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Relatório PDF por Período</span>
          </button>

          {userRole !== 'colaborador' && (
            <button
              type="button"
              onClick={() => handleOpenNew()}
              className="px-3.5 py-1.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Férias</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Search & Status Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="todos">Todos os Status</option>
            <option value="A programar">A Programar</option>
            <option value="Programada">Programada</option>
            <option value="Em gozo">Em Gozo</option>
            <option value="Concluída">Concluída</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          <strong>{filteredFerias.length}</strong> registro(s) de férias
        </div>
      </div>

      {/* Relatório em PDF por período — seletor de datas */}
      {isRelatorioAberto && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-amber-900">De</label>
            <input
              type="date"
              value={relatorioInicio}
              onChange={(e) => setRelatorioInicio(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-amber-900">Até</label>
            <input
              type="date"
              value={relatorioFim}
              onChange={(e) => setRelatorioFim(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <span className="text-[11px] text-amber-800">
            {feriasDoRelatorio.length} registro(s) no período selecionado
            {Object.keys(contagemPorStatus).length > 0 &&
              ` (${Object.entries(contagemPorStatus)
                .map(([status, qtd]) => `${status}: ${qtd}`)
                .join(' • ')})`}
          </span>
          <button
            type="button"
            onClick={handleImprimirRelatorio}
            disabled={feriasDoRelatorio.length === 0}
            className="ml-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Gerar PDF
          </button>
          <button
            type="button"
            onClick={() => setIsRelatorioAberto(false)}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Fechar
          </button>
        </div>
      )}

      {/* Vacation Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-3">Período Aquisitivo</th>
                <th className="py-3 px-3">Prazo Limite Gozo (CLT)</th>
                <th className="py-3 px-3">Período Marcado</th>
                <th className="py-3 px-3">Dias / Abono</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Comunicar</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFerias.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma programação de férias encontrada.
                  </td>
                </tr>
              ) : (
                filteredFerias.map((item) => {
                  const colab = colaboradores.find((c) => c.id === item.colaboradorId);
                  const daysToLimit = calcDaysRemaining(item.prazoLimiteGozo);
                  const countdown = formatDaysCountdown(daysToLimit);
                  const isUrgent = daysToLimit <= 60 && item.status !== 'Concluída';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isUrgent ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Colaborador */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {colab?.nomeCompleto || 'Colaborador não encontrado'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-mono">{colab?.codigoMatricula}</span> • {colab?.funcaoCargo}
                        </div>
                      </td>

                      {/* Período Aquisitivo */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">
                          {formatDate(item.periodoAquisitivoInicio)} até{' '}
                          {formatDate(item.periodoAquisitivoFim)}
                        </div>
                        <div className="text-[10px] text-slate-400">12 meses completados</div>
                      </td>

                      {/* Prazo Limite */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">
                          {formatDate(item.prazoLimiteGozo)}
                        </div>
                        <span
                          className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${countdown.bgClass}`}
                        >
                          {countdown.text}
                        </span>
                      </td>

                      {/* Período Marcado */}
                      <td className="py-3 px-3">
                        {item.dataInicio && item.dataFim ? (
                          <div>
                            <div className="font-semibold text-blue-950">
                              {formatDate(item.dataInicio)} a {formatDate(item.dataFim)}
                            </div>
                            {item.fracionamento && (
                              <div className="text-[10px] text-purple-700">
                                Fracionada em {item.fracionamento.length} etapas
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não agendada</span>
                        )}
                      </td>

                      {/* Dias / Abono */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{item.diasGozados} dias</div>
                        {item.abonoPecuniario && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            + {item.diasAbono}d Abono (venda 1/3)
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <select
                          value={item.status}
                          disabled={userRole === 'colaborador'}
                          onChange={(e) =>
                            onUpdateStatusFerias(item.id, e.target.value as StatusFerias)
                          }
                          className={`p-1 rounded-lg border text-[11px] font-bold ${
                            item.status === 'Concluída'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : item.status === 'Em gozo'
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : item.status === 'Programada'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="A programar">A programar</option>
                          <option value="Programada">Programada</option>
                          <option value="Em gozo">Em gozo</option>
                          <option value="Concluída">Concluída</option>
                        </select>
                      </td>

                      {/* Comunicar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEnviarWhatsApp(item, colab)}
                            disabled={!colab?.telefoneWhatsapp || !item.dataInicio}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:text-slate-300 disabled:cursor-not-allowed"
                            title={
                              !item.dataInicio
                                ? 'Férias ainda não têm período marcado'
                                : colab?.telefoneWhatsapp
                                ? `Enviar aviso de férias por WhatsApp para ${colab.nomeCompleto}`
                                : 'Colaborador sem WhatsApp cadastrado'
                            }
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEnviarEmail(item, colab)}
                            disabled={!colab?.email || !item.dataInicio}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:text-slate-300 disabled:cursor-not-allowed"
                            title={
                              !item.dataInicio
                                ? 'Férias ainda não têm período marcado'
                                : colab?.email
                                ? `Enviar aviso de férias por e-mail para ${colab.nomeCompleto}`
                                : 'Colaborador sem e-mail cadastrado'
                            }
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopiarMensagem(item, colab)}
                            disabled={!item.dataInicio}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed"
                            title="Copiar mensagem (para colar em outro app)"
                          >
                            {copiadoId === item.id ? (
                              <span className="text-[10px] font-bold text-emerald-600">Copiado!</span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setComprovanteFerias(item)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 mr-1 ${
                            item.comprovanteAssinadoUrl
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-slate-500 hover:bg-slate-100'
                          }`}
                          title={
                            item.comprovanteAssinadoUrl
                              ? 'Ver comprovante de férias assinado'
                              : 'Anexar comprovante de férias assinado pelo colaborador'
                          }
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">
                            {item.comprovanteAssinadoUrl ? 'Comprovante' : 'Anexar'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFerias(item);
                            setSelectedColabId(item.colaboradorId);
                            setPeriodoAquisitivoInicio(item.periodoAquisitivoInicio);
                            setPeriodoAquisitivoFim(item.periodoAquisitivoFim);
                            setPrazoLimiteGozo(item.prazoLimiteGozo);
                            setAbonoPecuniario(!!item.abonoPecuniario);
                            setDiasAbono(item.diasAbono || 10);
                            setDiasGozados(item.diasGozados);
                            setDataInicio(item.dataInicio || '');
                            setDataFim(item.dataFim || '');
                            setStatus(item.status);
                            setObservacoes(item.observacoes || '');
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Schedule / Edit Vacation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palmtree className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {editingFerias ? 'Editar Programação de Férias' : 'Nova Programação de Férias'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveModal} className="p-5 space-y-4 text-xs">
              {/* Employee Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Colaborador *</label>
                <select
                  required
                  value={selectedColabId}
                  onChange={(e) => handleColabChange(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="">Selecione o Colaborador</option>
                  {activeEmployees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeCompleto} ({c.funcaoCargo} — {c.setor})
                    </option>
                  ))}
                </select>
              </div>

              {/* Período Aquisitivo & Prazo Limite Gozo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                    Início Aquisitivo
                  </label>
                  <input
                    type="date"
                    required
                    value={periodoAquisitivoInicio}
                    onChange={(e) => setPeriodoAquisitivoInicio(e.target.value)}
                    className="w-full p-1.5 border border-slate-200 rounded-md bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                    Fim Aquisitivo
                  </label>
                  <input
                    type="date"
                    required
                    value={periodoAquisitivoFim}
                    onChange={(e) => setPeriodoAquisitivoFim(e.target.value)}
                    className="w-full p-1.5 border border-slate-200 rounded-md bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-rose-700 font-bold block mb-0.5">
                    Prazo Limite Gozo (CLT)
                  </label>
                  <input
                    type="date"
                    required
                    value={prazoLimiteGozo}
                    onChange={(e) => setPrazoLimiteGozo(e.target.value)}
                    className="w-full p-1.5 border border-rose-300 rounded-md bg-white text-xs font-bold text-rose-900"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Data de Início das Férias
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Data de Retorno / Término
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-bold"
                  />
                </div>
              </div>

              {/* Abono Pecuniário & Dias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    id="abonoCheck"
                    checked={abonoPecuniario}
                    onChange={(e) => setAbonoPecuniario(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <label htmlFor="abonoCheck" className="text-xs font-bold text-amber-900 cursor-pointer">
                    Vender 1/3 (Abono Pecuniário de 10 dias)
                  </label>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusFerias)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="A programar">A programar</option>
                    <option value="Programada">Programada</option>
                    <option value="Em gozo">Em gozo</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais sobre cobertura de posto durante as férias..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Programação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Comprovante de Férias Assinado */}
      {comprovanteFerias && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">Comprovante de Férias Assinado</h2>
                  <p className="text-[11px] text-slate-500 truncate">
                    {colaboradores.find((c) => c.id === comprovanteFerias.colaboradorId)?.nomeCompleto ||
                      'Colaborador não encontrado'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComprovanteFerias(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-500">
                Anexe a foto ou o PDF do recibo/aviso de férias assinado pelo colaborador, confirmando
                sua ciência do período programado.
              </p>
              <FeriasComprovanteUploader
                comprovanteUrl={comprovanteFerias.comprovanteAssinadoUrl}
                nomeArquivo={comprovanteFerias.comprovanteAssinadoNomeArquivo}
                onUpload={(dataUrl, fileName) => {
                  const atualizado: ProgramacaoFerias = {
                    ...comprovanteFerias,
                    comprovanteAssinadoUrl: dataUrl,
                    comprovanteAssinadoNomeArquivo: fileName,
                  };
                  onSaveFerias(atualizado);
                  setComprovanteFerias(atualizado);
                }}
                onRemove={() => {
                  const atualizado: ProgramacaoFerias = {
                    ...comprovanteFerias,
                    comprovanteAssinadoUrl: undefined,
                    comprovanteAssinadoNomeArquivo: undefined,
                  };
                  onSaveFerias(atualizado);
                  setComprovanteFerias(atualizado);
                }}
                readOnly={userRole === 'colaborador'}
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setComprovanteFerias(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relatório imprimível (PDF via window.print()) — só o período selecionado no painel
          acima, seguindo a Diretriz de Elaboração de Documentos em PDF (cabeçalho/rodapé
          institucional, cores neutras). Fica invisível na tela, só aparece ao imprimir. */}
      <div className="hidden print:block jmt-print-doc">
        <PrintDocumentHeader
          titulo="RELATÓRIO DE PROGRAMAÇÃO DE FÉRIAS"
          subtitulo={`Período: ${formatDate(relatorioInicio)} a ${formatDate(relatorioFim)}`}
          metadados={
            Object.keys(contagemPorStatus).length > 0
              ? Object.entries(contagemPorStatus)
                  .map(([status, qtd]) => `${status}: ${qtd}`)
                  .join(' • ')
              : undefined
          }
        />
        <table className="w-full text-[11px] border-collapse mt-3">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="text-left py-1.5 pr-2">Colaborador</th>
              <th className="text-left py-1.5 px-2">Cargo / Setor</th>
              <th className="text-left py-1.5 px-2">Período</th>
              <th className="text-right py-1.5 px-2">Dias</th>
              <th className="text-left py-1.5 pl-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {feriasDoRelatorio
              .slice()
              .sort((a, b) => (a.dataInicio || '').localeCompare(b.dataInicio || ''))
              .map((f) => {
                const colab = colaboradores.find((c) => c.id === f.colaboradorId);
                return (
                  <tr key={f.id} className="border-b border-slate-300">
                    <td className="py-1.5 pr-2">{colab?.nomeCompleto || 'Colaborador não encontrado'}</td>
                    <td className="py-1.5 px-2">
                      {colab?.funcaoCargo} — {colab?.setor}
                    </td>
                    <td className="py-1.5 px-2">
                      {f.fracionamento && f.fracionamento.length > 0
                        ? f.fracionamento
                            .map((e) => `${formatDate(e.dataInicio)} a ${formatDate(e.dataFim)}`)
                            .join(' + ')
                        : f.dataInicio && f.dataFim
                        ? `${formatDate(f.dataInicio)} a ${formatDate(f.dataFim)}`
                        : 'Não agendada'}
                    </td>
                    <td className="text-right py-1.5 px-2">{f.diasGozados}</td>
                    <td className="py-1.5 pl-2 font-bold">{f.status}</td>
                  </tr>
                );
              })}
            {feriasDoRelatorio.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center">
                  Nenhuma programação de férias no período selecionado.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 font-bold">
              <td className="py-2" colSpan={5}>
                Total: {feriasDoRelatorio.length} registro(s)
              </td>
            </tr>
          </tfoot>
        </table>
        <PrintDocumentFooter />
      </div>
    </div>
  );
};
