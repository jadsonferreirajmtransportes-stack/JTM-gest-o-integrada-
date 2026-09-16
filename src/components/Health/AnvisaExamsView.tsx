import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  RefreshCw,
  X,
  Save,
  ShieldCheck,
  Eye,
  Image as ImageIcon,
  Paperclip,
  MessageCircle,
  Mail,
  Copy,
} from 'lucide-react';
import { Colaborador, Empregador, StatusExame } from '../../types';
import {
  formatDate,
  calcExamStatus,
  calcDaysRemaining,
  formatDaysCountdown,
} from '../../utils/formatters';
import { exportExamesReport } from '../../utils/exportUtils';
import { AsoImageUploader } from '../Common/AsoImageUploader';
import { ImageViewerModal } from '../Common/ImageViewerModal';
import { buildWhatsAppLink, buildMailtoLink } from '../../utils/birthdayUtils';
import {
  buildMensagemAgendamentoAso,
  buildAssuntoEmailAgendamentoAso,
  buildCorpoEmailAgendamentoAso,
} from '../../utils/asoComunicacaoUtils';

interface AnvisaExamsViewProps {
  colaboradores: Colaborador[];
  empregadores: Empregador[];
  onUpdateExame: (
    colaboradorId: string,
    dataUltimoExame: string,
    dataVencimento: string,
    clinica: string,
    asoImagemUrl?: string,
    asoNomeArquivo?: string,
    asoMedicoEmitente?: string,
    asoResultado?: 'Apto' | 'Inapto' | 'Apto com Restrições',
    clinicaLocalizacaoLink?: string,
    horaExame?: string
  ) => void;
}

export const AnvisaExamsView: React.FC<AnvisaExamsViewProps> = ({
  colaboradores,
  empregadores,
  onUpdateExame,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);

  // Form State for renew
  const [dataUltimoExame, setDataUltimoExame] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dataVencimento, setDataVencimento] = useState('');
  const [horaExame, setHoraExame] = useState('');
  const [clinicaMedica, setClinicaMedica] = useState('MedSeg Medicina do Trabalho');
  const [clinicaLocalizacaoLink, setClinicaLocalizacaoLink] = useState('');
  const [asoImagemUrl, setAsoImagemUrl] = useState<string | undefined>(undefined);
  const [asoNomeArquivo, setAsoNomeArquivo] = useState<string | undefined>(undefined);
  const [asoMedicoEmitente, setAsoMedicoEmitente] = useState('');
  const [asoResultado, setAsoResultado] = useState<'Apto' | 'Inapto' | 'Apto com Restrições'>('Apto');

  // Lightbox
  const [viewingAso, setViewingAso] = useState<{ url: string; name: string; colabName: string } | null>(null);

  // Comunicar agendamento do exame (WhatsApp/e-mail) — mesmo padrão já usado em Férias.
  const [agendamentoCopiado, setAgendamentoCopiado] = useState(false);

  const ativos = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo'),
    [colaboradores]
  );

  const setores = useMemo(() => {
    const s = new Set<string>();
    ativos.forEach((c) => {
      if (c.setor) s.add(c.setor);
    });
    return Array.from(s).sort();
  }, [ativos]);

  const filtered = useMemo(() => {
    return ativos.filter((c) => {
      const status = calcExamStatus(c.dataVencimentoExame);
      if (selectedStatus !== 'todos' && status !== selectedStatus) return false;
      if (selectedSetor !== 'todos' && c.setor !== selectedSetor) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = c.nomeCompleto?.toLowerCase().includes(q);
        const matchMatricula = c.codigoMatricula?.toLowerCase().includes(q);
        const matchCargo = c.funcaoCargo?.toLowerCase().includes(q);
        if (!matchName && !matchMatricula && !matchCargo) return false;
      }
      return true;
    });
  }, [ativos, selectedStatus, selectedSetor, searchQuery]);

  // Counts
  const countVencidos = useMemo(
    () => ativos.filter((c) => calcExamStatus(c.dataVencimentoExame) === 'Vencido').length,
    [ativos]
  );
  const countAVencer = useMemo(
    () => ativos.filter((c) => calcExamStatus(c.dataVencimentoExame) === 'A vencer').length,
    [ativos]
  );
  const countValidos = useMemo(
    () => ativos.filter((c) => calcExamStatus(c.dataVencimentoExame) === 'Válido').length,
    [ativos]
  );

  const handleOpenRenew = (colab: Colaborador) => {
    setSelectedColab(colab);
    const today = new Date().toISOString().slice(0, 10);
    setDataUltimoExame(today);

    // Default +1 year for standard periodic
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setDataVencimento(nextYear.toISOString().slice(0, 10));

    setHoraExame(colab.horaUltimoExameOcupacional || '');
    setClinicaMedica(colab.clinicaMedica || 'MedSeg Medicina do Trabalho');
    setClinicaLocalizacaoLink(colab.clinicaLocalizacaoLink || '');
    setAsoImagemUrl(colab.asoImagemUrl);
    setAsoNomeArquivo(colab.asoNomeArquivo);
    setAsoMedicoEmitente(colab.asoMedicoEmitente || '');
    setAsoResultado(colab.asoResultado || 'Apto');
    setIsModalOpen(true);
  };

  const handleSaveRenew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColab || !dataVencimento) return;

    onUpdateExame(
      selectedColab.id,
      dataUltimoExame,
      dataVencimento,
      clinicaMedica,
      asoImagemUrl,
      asoNomeArquivo,
      asoMedicoEmitente,
      asoResultado,
      clinicaLocalizacaoLink.trim() || undefined,
      horaExame.trim() || undefined
    );
    setIsModalOpen(false);
  };

  const handleEnviarWhatsAppAgendamento = () => {
    if (!selectedColab?.telefoneWhatsapp || !dataUltimoExame) return;
    const url = buildWhatsAppLink(
      selectedColab.telefoneWhatsapp,
      buildMensagemAgendamentoAso(selectedColab.nomeCompleto, dataUltimoExame, clinicaMedica, clinicaLocalizacaoLink, horaExame)
    );
    if (url) window.open(url, '_blank');
  };

  const handleEnviarEmailAgendamento = () => {
    if (!selectedColab?.email || !dataUltimoExame) return;
    const url = buildMailtoLink(
      selectedColab.email,
      buildAssuntoEmailAgendamentoAso(),
      buildCorpoEmailAgendamentoAso(selectedColab.nomeCompleto, dataUltimoExame, clinicaMedica, clinicaLocalizacaoLink, horaExame)
    );
    // mailto: precisa ir por window.location.href (não window.open) — mesmo padrão do resto do app.
    if (url) window.location.href = url;
  };

  const handleCopiarMensagemAgendamento = async () => {
    if (!selectedColab || !dataUltimoExame) return;
    try {
      await navigator.clipboard.writeText(
        buildMensagemAgendamentoAso(selectedColab.nomeCompleto, dataUltimoExame, clinicaMedica, clinicaLocalizacaoLink, horaExame)
      );
      setAgendamentoCopiado(true);
      setTimeout(() => setAgendamentoCopiado(false), 2000);
    } catch {
      // Clipboard indisponível — sem tratamento adicional, WhatsApp/E-mail continuam funcionando.
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold uppercase">
              Rastreabilidade ANVISA RDC 430 & NR-7
            </span>
            <span className="text-[10px] font-bold text-slate-500">Controle ASO</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Saúde Ocupacional & Exames Médicos Periódicos (ASO)
          </h2>
          <p className="text-xs text-slate-500">
            Controle de validade dos Atestados de Saúde Ocupacional para motoristas, ajudantes e operadores de medicamentos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportExamesReport(filtered, 'xlsx')}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Relatório ANVISA</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Válidos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Exames Válidos</span>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{countValidos}</div>
            <span className="text-[10px] text-slate-400">Em conformidade sanitária</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        {/* A Vencer */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">A Vencer (em &le; 30 dias)</span>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{countAVencer}</div>
            <span className="text-[10px] text-slate-400">Agendar renovação periódica</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Vencidos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Exames Vencidos</span>
            <div className="text-2xl font-black text-rose-600 mt-0.5">{countVencidos}</div>
            <span className="text-[10px] text-rose-600 font-bold">Risco de não conformidade</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por colaborador ou cargo..."
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
          <option value="Válido">Válidos</option>
          <option value="A vencer">A Vencer (&le; 30 dias)</option>
          <option value="Vencido">Vencidos</option>
        </select>

        <select
          value={selectedSetor}
          onChange={(e) => setSelectedSetor(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
        >
          <option value="todos">Todos os Setores</option>
          {setores.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-3">Cargo / Setor</th>
                <th className="py-3 px-3">Exame Admissional</th>
                <th className="py-3 px-3">Último Periódico</th>
                <th className="py-3 px-3">Data de Vencimento</th>
                <th className="py-3 px-3">Status ANVISA</th>
                <th className="py-3 px-3">Comprovante ASO</th>
                <th className="py-3 px-3">Clínica / Médico</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhum colaborador encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const status = calcExamStatus(c.dataVencimentoExame);
                  const days = calcDaysRemaining(c.dataVencimentoExame);
                  const countdown = formatDaysCountdown(days);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        status === 'Vencido' ? 'bg-rose-50/30' : status === 'A vencer' ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{c.nomeCompleto}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {c.codigoMatricula} • CPF: {c.cpf}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{c.funcaoCargo}</div>
                        <div className="text-[11px] text-slate-500">{c.setor}</div>
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {formatDate(c.dataExameAdmissional)}
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {formatDate(c.dataUltimoExameOcupacional)}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {formatDate(c.dataVencimentoExame)}
                        </div>
                        <span
                          className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${countdown.bgClass}`}
                        >
                          {countdown.text}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'Válido'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'A vencer'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {c.asoImagemUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingAso({
                                url: c.asoImagemUrl!,
                                name: c.asoNomeArquivo || 'ASO_Digitalizado.png',
                                colabName: c.nomeCompleto,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold text-[10px] transition-colors"
                          >
                            <Eye className="w-3 h-3 text-amber-700" />
                            <span>Ver ASO</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Sem anexo</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {c.clinicaMedica || 'MedSeg Medicina do Trabalho'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenRenew(c)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <RefreshCw className="w-3 h-3 text-amber-700" />
                          <span>Renovar ASO</span>
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

      {/* Modal: Renew ASO */}
      {isModalOpen && selectedColab && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Renovar Exame ASO Periódico</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRenew} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900">{selectedColab.nomeCompleto}</div>
                <div className="text-slate-500">
                  Matrícula: {selectedColab.codigoMatricula} • Cargo: {selectedColab.funcaoCargo}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Data da Realização do Novo Exame *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      required
                      value={dataUltimoExame}
                      onChange={(e) => setDataUltimoExame(e.target.value)}
                      className="flex-1 min-w-0 p-2 border border-slate-200 rounded-lg text-slate-800 font-bold"
                    />
                    <input
                      type="time"
                      value={horaExame}
                      onChange={(e) => setHoraExame(e.target.value)}
                      title="Horário do exame — opcional"
                      className="w-24 p-2 border border-slate-200 rounded-lg text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nova Data de Vencimento (+12m) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Resultado da Avaliação Médica
                  </label>
                  <select
                    value={asoResultado}
                    onChange={(e) => setAsoResultado(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="Apto">Apto para a Função</option>
                    <option value="Apto com Restrições">Apto com Restrições</option>
                    <option value="Inapto">Inapto</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Médico Emitente / CRM
                  </label>
                  <input
                    type="text"
                    value={asoMedicoEmitente}
                    onChange={(e) => setAsoMedicoEmitente(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: Dra. Juliana Costa - CRM 142.330/SP"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Clínica Médica Conveniada
                </label>
                <input
                  type="text"
                  value={clinicaMedica}
                  onChange={(e) => setClinicaMedica(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  placeholder="Nome da clínica conveniada"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Link de Localização da Clínica (Google Maps){' '}
                  <span className="text-slate-400 font-normal">— opcional</span>
                </label>
                <input
                  type="text"
                  data-no-uppercase="true"
                  value={clinicaLocalizacaoLink}
                  onChange={(e) => setClinicaLocalizacaoLink(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              {/* Comunicar agendamento ao colaborador */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-[#8A6A39]" />
                  Comunicar Agendamento ao Colaborador
                </span>
                <p className="text-[11px] text-slate-500">
                  Avisa {selectedColab.nomeCompleto.split(' ')[0]} sobre a data e a clínica do exame agendado.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEnviarWhatsAppAgendamento}
                    disabled={!selectedColab.telefoneWhatsapp || !dataUltimoExame}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:text-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title={
                      selectedColab.telefoneWhatsapp
                        ? `Enviar por WhatsApp para ${selectedColab.nomeCompleto}`
                        : 'Colaborador sem WhatsApp cadastrado'
                    }
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEnviarEmailAgendamento}
                    disabled={!selectedColab.email || !dataUltimoExame}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-blue-700 hover:bg-blue-50 disabled:text-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title={
                      selectedColab.email
                        ? `Enviar por e-mail para ${selectedColab.nomeCompleto}`
                        : 'Colaborador sem e-mail cadastrado'
                    }
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>E-mail</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopiarMensagemAgendamento}
                    disabled={!dataUltimoExame}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Copiar mensagem (para colar em outro app)"
                  >
                    {agendamentoCopiado ? (
                      <span className="text-emerald-600">Copiado!</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ASO Image / PDF Uploader */}
              <div className="pt-2 border-t border-slate-100">
                <AsoImageUploader
                  asoImagemUrl={asoImagemUrl}
                  asoNomeArquivo={asoNomeArquivo}
                  onImageChange={(url, name) => {
                    setAsoImagemUrl(url);
                    setAsoNomeArquivo(name);
                  }}
                  tamanhoOutrosCamposMB={
                    ((selectedColab.documentos || []).reduce((soma, d) => soma + (d.arquivoUrl?.length || 0), 0) +
                      (selectedColab.anexos || []).reduce((soma, a) => soma + (a.arquivoUrl?.length || 0), 0)) /
                    (1024 * 1024)
                  }
                />
              </div>

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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Renovação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {viewingAso && (
        <ImageViewerModal
          isOpen={!!viewingAso}
          onClose={() => setViewingAso(null)}
          imageUrl={viewingAso.url}
          title="Atestado de Saúde Ocupacional (ASO) — Digitalizado"
          subtitle={`Colaborador: ${viewingAso.colabName}`}
          fileName={viewingAso.name}
        />
      )}
    </div>
  );
};
