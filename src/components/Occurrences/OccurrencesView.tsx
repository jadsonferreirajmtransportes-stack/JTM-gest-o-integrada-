import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Calendar,
  FileText,
  Paperclip,
  CheckCircle2,
  X,
  Save,
  Share2,
  ExternalLink,
  Upload,
} from 'lucide-react';
import {
  Colaborador,
  Ocorrencia,
  TipoOcorrencia,
  Supervisor,
  UserRole,
} from '../../types';
import { formatDate } from '../../utils/formatters';
import { exportOcorrenciasReport } from '../../utils/exportUtils';

interface OccurrencesViewProps {
  colaboradores: Colaborador[];
  supervisores: Supervisor[];
  ocorrencias: Ocorrencia[];
  userRole: UserRole;
  onSaveOcorrencia: (ocorrencia: Ocorrencia) => void;
  onOpenPublicFormModal: () => void;
  onOpenOccurrenceLinkModal?: () => void;
  onOpenPortalView?: () => void;
}

export const OccurrencesView: React.FC<OccurrencesViewProps> = ({
  colaboradores,
  supervisores,
  ocorrencias,
  userRole,
  onSaveOcorrencia,
  onOpenPublicFormModal,
  onOpenOccurrenceLinkModal,
  onOpenPortalView,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal Form State
  const [selectedColabId, setSelectedColabId] = useState('');
  const [tipo, setTipo] = useState<TipoOcorrencia>('Atestado médico');
  const [dataOcorrencia, setDataOcorrencia] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [diasAfastamento, setDiasAfastamento] = useState(1);
  const [descricao, setDescricao] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [arquivoNome, setArquivoNome] = useState('');

  const activeEmployees = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo'),
    [colaboradores]
  );

  const filtered = useMemo(() => {
    return ocorrencias.filter((o) => {
      if (selectedTipo !== 'todos' && o.tipo !== selectedTipo) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const colab = colaboradores.find((c) => c.id === o.colaboradorId);
        const matchName = colab?.nomeCompleto?.toLowerCase().includes(q);
        const matchDesc = o.descricao?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [ocorrencias, colaboradores, selectedTipo, searchQuery]);

  const handleOpenNew = (presetColabId?: string) => {
    setSelectedColabId(presetColabId || activeEmployees[0]?.id || '');
    setTipo('Atestado médico');
    setDataOcorrencia(new Date().toISOString().slice(0, 10));
    setDiasAfastamento(1);
    setDescricao('');
    setSupervisorId(supervisores[0]?.id || '');
    setArquivoNome('');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColabId) {
      alert('Selecione um colaborador.');
      return;
    }

    const payload: Ocorrencia = {
      id: `ocorr-${Date.now()}`,
      colaboradorId: selectedColabId,
      tipo,
      dataOcorrencia,
      diasAfastamento: diasAfastamento > 0 ? diasAfastamento : undefined,
      descricao,
      comprovanteAnexo: arquivoNome || undefined,
      registradoPor: supervisorId ? supervisores.find((s) => s.id === supervisorId)?.nome : 'DP / RH JMT',
      criadoEm: new Date().toISOString(),
    };

    onSaveOcorrencia(payload);
    setIsModalOpen(false);
  };

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoNome(file.name);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold uppercase">
            Registro & Supervisão Disciplinar
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Registro Centralizado de Ocorrências
          </h2>
          <p className="text-xs text-slate-500">
            Atestados médicos (RDC 430), faltas, atrasos, advertências, suspensões e CAT com rastreabilidade de anexos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Occurrence Link Generator & WhatsApp Sender */}
          {onOpenOccurrenceLinkModal && (
            <button
              id="generate-occurrence-link-btn"
              type="button"
              onClick={onOpenOccurrenceLinkModal}
              className="px-3 py-1.5 bg-[#F4EEE1] hover:bg-[#B38F4F]/20 text-[#111111] border border-[#B38F4F]/40 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
              title="Gerar link de ocorrência com QR Code e envio pelo WhatsApp para supervisores"
            >
              <Share2 className="w-3.5 h-3.5 text-[#B38F4F]" />
              <span>Gerar Link / WhatsApp</span>
            </button>
          )}

            {/* Public Form Button (Portal or Modal) */}
            <button
              type="button"
              onClick={onOpenPortalView || onOpenPublicFormModal}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Abrir Formulário de Campo dos Supervisores (Regra 2.14)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Formulário de Campo</span>
            </button>

            <button
              type="button"
              onClick={() => exportOcorrenciasReport(ocorrencias, colaboradores, 'xlsx')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>

            {userRole !== 'colaborador' && (
              <button
                type="button"
                onClick={() => handleOpenNew()}
                className="px-3.5 py-1.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Ocorrência</span>
              </button>
            )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por colaborador ou motivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="Atestado médico">Atestado médico</option>
            <option value="Falta justificada">Falta justificada</option>
            <option value="Falta injustificada">Falta injustificada</option>
            <option value="Atraso">Atraso</option>
            <option value="Advertência escrita">Advertência escrita</option>
            <option value="Suspensão disciplinar">Suspensão disciplinar</option>
            <option value="Elogio">Elogio</option>
            <option value="Acidente de trabalho (CAT)">Acidente de trabalho (CAT)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          <strong>{filtered.length}</strong> ocorrência(s) registrada(s)
        </div>
      </div>

      {/* Occurrences List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-3">Colaborador</th>
                <th className="py-3 px-3">Tipo da Ocorrência</th>
                <th className="py-3 px-3">Afastamento</th>
                <th className="py-3 px-3">Descrição / Detalhes</th>
                <th className="py-3 px-3">Anexo / Comprovante</th>
                <th className="py-3 px-4">Registrado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhuma ocorrência encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const colab = colaboradores.find((c) => c.id === item.colaboradorId);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {formatDate(item.dataOcorrencia)}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{colab?.nomeCompleto || '-'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {colab?.codigoMatricula} • {colab?.setor}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.tipo === 'Atestado médico'
                              ? 'bg-blue-100 text-blue-800'
                              : item.tipo === 'Falta injustificada' || item.tipo === 'Suspensão disciplinar'
                              ? 'bg-rose-100 text-rose-800'
                              : item.tipo === 'Advertência escrita'
                              ? 'bg-amber-100 text-amber-800'
                              : item.tipo === 'Elogio'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.tipo}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {item.diasAfastamento ? (
                          <span className="font-bold text-slate-800">
                            {item.diasAfastamento} dia{item.diasAfastamento > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 max-w-xs text-slate-700 truncate" title={item.descricao}>
                        {item.descricao}
                      </td>

                      <td className="py-3 px-3">
                        {item.comprovanteAnexo ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-mono border border-blue-200">
                            <Paperclip className="w-3 h-3" />
                            {item.comprovanteAnexo}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sem anexo</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {item.registradoPor || 'Departamento Pessoal'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Occurrence */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">Registrar Nova Ocorrência</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Colaborador *</label>
                <select
                  required
                  value={selectedColabId}
                  onChange={(e) => setSelectedColabId(e.target.value)}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo de Ocorrência *</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoOcorrencia)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="Atestado médico">Atestado médico</option>
                    <option value="Falta justificada">Falta justificada</option>
                    <option value="Falta injustificada">Falta injustificada</option>
                    <option value="Atraso">Atraso</option>
                    <option value="Saída antecipada">Saída antecipada</option>
                    <option value="Comparecimento">Comparecimento</option>
                    <option value="Advertência escrita">Advertência escrita</option>
                    <option value="Suspensão disciplinar">Suspensão disciplinar</option>
                    <option value="Elogio">Elogio</option>
                    <option value="Acidente de trabalho (CAT)">Acidente de trabalho (CAT)</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data da Ocorrência *</label>
                  <input
                    type="date"
                    required
                    value={dataOcorrencia}
                    onChange={(e) => setDataOcorrencia(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              {tipo === 'Atestado médico' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Dias de Afastamento (segundo atestado)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={diasAfastamento}
                    onChange={(e) => setDiasAfastamento(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Supervisor Responsável / Solicitante
                </label>
                <select
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Departamento Pessoal (Direto)</option>
                  {supervisores.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.nome} ({sup.cargo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descrição / Justificativa *</label>
                <textarea
                  required
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o motivo, detalhes do atestado (com ou sem CID) ou relato do supervisor..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Anexar Comprovante / Atestado Digitalizado
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 text-xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Selecionar Arquivo</span>
                    <input type="file" className="hidden" onChange={handleSimulateUpload} />
                  </label>
                  {arquivoNome ? (
                    <span className="font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded text-[11px] truncate">
                      {arquivoNome}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Nenhum arquivo anexado</span>
                  )}
                </div>
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Registrar Ocorrência</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
