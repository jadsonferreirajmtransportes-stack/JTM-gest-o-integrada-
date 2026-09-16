import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Edit2,
  ChevronRight,
  RotateCcw,
  Send,
  ArrowLeftRight,
  Video,
} from 'lucide-react';
import {
  AtividadeGestao,
  CategoriaAtividadeGestao,
  StatusAtividadeGestao,
  PrioridadeAtividadeGestao,
} from '../../types';
import {
  CATEGORIA_CONFIG,
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  downloadIcsFile,
  exportAtividadesToCSV,
  atividadeOcorreEm,
  getAtividadeDataFim,
  isAtividadeMultiDia,
  formatAtividadeDateLabel,
  getTipoLocalEfetivo,
} from './agendaUtils';

interface AgendaListViewProps {
  atividades: AtividadeGestao[];
  onSelectAtividade: (atividade: AtividadeGestao) => void;
  onEditAtividade: (atividade: AtividadeGestao) => void;
  onDeleteAtividade: (id: string) => void;
  onStatusChange: (id: string, newStatus: StatusAtividadeGestao) => void;
  onNewAtividade: () => void;
  onOpenAlerta?: (atividade: AtividadeGestao) => void;
}

export const AgendaListView: React.FC<AgendaListViewProps> = ({
  atividades,
  onSelectAtividade,
  onEditAtividade,
  onDeleteAtividade,
  onStatusChange,
  onNewAtividade,
  onOpenAlerta,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todas');
  const [selectedPrioridade, setSelectedPrioridade] = useState<string>('todas');
  const [periodoFilter, setPeriodoFilter] = useState<'todos' | 'hoje' | '7dias' | 'mes' | 'concluidas'>(
    'todos'
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAtividades = useMemo(() => {
    return atividades
      .filter((a) => {
        // Search
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchTitle = (a.titulo || '').toLowerCase().includes(q);
          const matchResp = (a.responsavel || '').toLowerCase().includes(q);
          const matchDesc = (a.descricao || '').toLowerCase().includes(q);
          const matchLocal = (a.localOuLink || '').toLowerCase().includes(q);
          if (!matchTitle && !matchResp && !matchDesc && !matchLocal) return false;
        }

        // Categoria
        if (selectedCategoria !== 'todas' && a.categoria !== selectedCategoria) return false;

        // Status
        if (selectedStatus !== 'todas' && a.status !== selectedStatus) return false;

        // Prioridade
        if (selectedPrioridade !== 'todas' && a.prioridade !== selectedPrioridade) return false;

        // Período
        if (periodoFilter === 'hoje' && !atividadeOcorreEm(a, todayStr)) return false;
        if (periodoFilter === '7dias') {
          // Inclui atividades cujo intervalo [data, dataFim] cruza com os próximos 7 dias
          const inicio = new Date(a.data + 'T12:00:00');
          const fim = new Date(getAtividadeDataFim(a) + 'T12:00:00');
          const today = new Date();
          const next7 = new Date();
          next7.setDate(today.getDate() + 7);
          if (fim < today || inicio > next7) return false;
        }
        if (periodoFilter === 'concluidas' && a.status !== 'Concluída') return false;

        return true;
      })
      .sort((a, b) => {
        // Sort by date ascending, then time
        const dateComp = a.data.localeCompare(b.data);
        if (dateComp !== 0) return dateComp;
        return (a.horaInicio || '').localeCompare(b.horaInicio || '');
      });
  }, [
    atividades,
    searchTerm,
    selectedCategoria,
    selectedStatus,
    selectedPrioridade,
    periodoFilter,
    todayStr,
  ]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Filters Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
        {/* Search and Period buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por reunião, auditoria, responsável ou pauta..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => exportAtividadesToCSV(filteredAtividades)}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Exportar dados filtrados para planilha CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#B38F4F]" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters & Period Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-200/80">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Period tabs */}
            <div className="inline-flex bg-slate-200/60 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setPeriodoFilter('todos')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  periodoFilter === 'todos'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({atividades.length})
              </button>
              <button
                type="button"
                onClick={() => setPeriodoFilter('hoje')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  periodoFilter === 'hoje'
                    ? 'bg-white text-[#8A6A39] shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hoje ({atividades.filter((a) => atividadeOcorreEm(a, todayStr)).length})
              </button>
              <button
                type="button"
                onClick={() => setPeriodoFilter('7dias')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  periodoFilter === '7dias'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Próximos 7 dias
              </button>
              <button
                type="button"
                onClick={() => setPeriodoFilter('concluidas')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  periodoFilter === 'concluidas'
                    ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Concluídas ({atividades.filter((a) => a.status === 'Concluída').length})
              </button>
            </div>

            {/* Categoria filter */}
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
            >
              <option value="todas">Todas as Categorias</option>
              <option value="Reunião & Governança">Reunião & Governança</option>
              <option value="Auditoria & RDC 430">Auditoria & RDC 430</option>
              <option value="Operação & Frota">Operação & Frota</option>
              <option value="Gente & DP">Gente & DP</option>
              <option value="Projetos & OKRs">Projetos & OKRs</option>
              <option value="Comercial & Clientes">Comercial & Clientes</option>
              <option value="Treinamento & Capacitação">Treinamento & Capacitação</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
            >
              <option value="todas">Todos os Status</option>
              <option value="Agendada">Agendada</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
              <option value="Adiada">Adiada</option>
            </select>

            {/* Prioridade filter */}
            <select
              value={selectedPrioridade}
              onChange={(e) => setSelectedPrioridade(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
            >
              <option value="todas">Todas Prioridades</option>
              <option value="Urgente">Urgente</option>
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {filteredAtividades.length} atividades encontradas
          </span>
        </div>
      </div>

      {/* Activities List / Table */}
      <div className="divide-y divide-slate-100">
        {filteredAtividades.map((atv) => {
          const catConfig = CATEGORIA_CONFIG[atv.categoria];
          const statConfig = STATUS_CONFIG[atv.status];
          const prioConfig = PRIORIDADE_CONFIG[atv.prioridade];
          const isConcluida = atv.status === 'Concluída';
          const isToday = atividadeOcorreEm(atv, todayStr);
          const multiDia = isAtividadeMultiDia(atv);

          return (
            <div
              key={atv.id}
              className={`p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 flex-wrap ${
                isToday ? 'bg-amber-50/20' : ''
              }`}
            >
              {/* Left Details */}
              <div
                className="flex items-start gap-3 flex-1 min-w-[280px] cursor-pointer"
                onClick={() => onSelectAtividade(atv)}
              >
                {/* Date Badge */}
                <div
                  className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border relative ${
                    isToday
                      ? 'bg-[#B38F4F] text-white border-[#8A6A39] shadow-xs'
                      : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                  title={multiDia ? formatAtividadeDateLabel(atv, 'short') : undefined}
                >
                  {multiDia && (
                    <ArrowLeftRight
                      className={`w-3 h-3 absolute -top-1.5 -right-1.5 rounded-full p-0.5 ${
                        isToday ? 'bg-[#8A6A39] text-white' : 'bg-[#B38F4F] text-white'
                      }`}
                    />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {new Date(atv.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                  </span>
                  <span className="text-base font-extrabold leading-none">
                    {new Date(atv.data + 'T12:00:00').getDate()}
                  </span>
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}
                    >
                      {atv.categoria}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md border flex items-center gap-1 ${statConfig.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statConfig.dot}`} />
                      {atv.status}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-md ${prioConfig.badge}`}>
                      {atv.prioridade}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-[#8A6A39] font-bold rounded-md animate-pulse">
                        HOJE
                      </span>
                    )}
                    {multiDia && (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-50 text-[#8A6A39] border border-amber-200 font-semibold rounded-md flex items-center gap-1">
                        <ArrowLeftRight className="w-2.5 h-2.5" />
                        {formatAtividadeDateLabel(atv, 'short')}
                      </span>
                    )}
                  </div>

                  <h3
                    className={`text-xs font-bold text-slate-900 leading-snug ${
                      isConcluida ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {atv.titulo}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {atv.diaInteiro ? 'Dia Inteiro' : `${atv.horaInicio} - ${atv.horaFim}`}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Users className="w-3 h-3 text-slate-400" />
                      {atv.responsavel}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 truncate max-w-xs">
                      {getTipoLocalEfetivo(atv) === 'videoconferencia' ? (
                        <Video className="w-3 h-3 text-slate-400" />
                      ) : (
                        <MapPin className="w-3 h-3 text-slate-400" />
                      )}
                      {atv.localOuLink}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenAlerta && (
                  <button
                    type="button"
                    onClick={() => onOpenAlerta(atv)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Mandar Alerta (WhatsApp / E-mail)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => downloadIcsFile(atv)}
                  className="p-1.5 text-slate-400 hover:text-[#B38F4F] hover:bg-slate-100 rounded-lg transition-colors"
                  title="Baixar para calendário (.ics)"
                >
                  <Download className="w-4 h-4" />
                </button>

                {atv.status !== 'Concluída' ? (
                  <button
                    type="button"
                    onClick={() => onStatusChange(atv.id, 'Concluída')}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                    title="Marcar como concluída"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Concluir</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStatusChange(atv.id, 'Agendada')}
                    className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title="Reabrir atividade"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onEditAtividade(atv)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Editar Atividade"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Excluir atividade "${atv.titulo}"?`)) {
                      onDeleteAtividade(atv.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Excluir Atividade"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectAtividade(atv)}
                  className="p-1.5 text-slate-400 hover:text-[#B38F4F] hover:bg-slate-100 rounded-lg transition-colors"
                  title="Ver detalhes"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredAtividades.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma atividade encontrada com os filtros atuais</p>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou período selecionado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
