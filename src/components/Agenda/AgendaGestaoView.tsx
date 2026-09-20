import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Users,
  Layers,
  Download,
  ListFilter,
  Kanban,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AtividadeGestao,
  CategoriaAtividadeGestao,
  StatusAtividadeGestao,
  Supervisor,
  Colaborador,
  ItemDeliberacaoAta,
  UsuarioLogin,
} from '../../types';
import { AgendaMonthView } from './AgendaMonthView';
import { AgendaWeekView } from './AgendaWeekView';
import { AgendaDayView } from './AgendaDayView';
import { AgendaListView } from './AgendaListView';
import { AgendaKanbanView } from './AgendaKanbanView';
import { AgendaFormModal } from './AgendaFormModal';
import { AgendaDetailModal } from './AgendaDetailModal';
import { AgendaAlertaModal } from './AgendaAlertaModal';
import { exportAtividadesToCSV, atividadeOcorreEm } from './agendaUtils';

interface AgendaGestaoViewProps {
  atividades: AtividadeGestao[];
  supervisores: Supervisor[];
  colaboradores: Colaborador[];
  usuarios: UsuarioLogin[];
  onSaveAtividade: (atividade: AtividadeGestao) => void;
  onDeleteAtividade: (id: string) => void;
  onStatusChange: (id: string, newStatus: StatusAtividadeGestao) => void;
  onUpdateDeliberacoes: (id: string, deliberacoes: ItemDeliberacaoAta[]) => void;
  /** Id de uma atividade pra abrir automaticamente (ex.: veio de uma menção no Chat). */
  abrirAtividadeId?: string;
  /** Muda a cada clique de menção, mesmo pra mesma atividade, pra forçar reabrir. */
  abrirAtividadeSinal?: number;
}

type ViewMode = 'mes' | 'semana' | 'dia' | 'lista' | 'kanban';

export const AgendaGestaoView: React.FC<AgendaGestaoViewProps> = ({
  atividades,
  supervisores,
  colaboradores,
  usuarios,
  onSaveAtividade,
  onDeleteAtividade,
  onStatusChange,
  onUpdateDeliberacoes,
  abrirAtividadeId,
  abrirAtividadeSinal,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<AtividadeGestao | null>(null);
  const [formSelectedDate, setFormSelectedDate] = useState<string | undefined>(undefined);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailAtividade, setDetailAtividade] = useState<AtividadeGestao | null>(null);

  const [isAlertaModalOpen, setIsAlertaModalOpen] = useState(false);
  const [alertaAtividade, setAlertaAtividade] = useState<AtividadeGestao | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Navigation handlers
  const handleNavigateMonth = (direction: number) => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(next);
  };

  const handleNavigateWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(next);
  };

  const handleNavigateDay = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + direction);
    setCurrentDate(next);
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Open creation modal with preset date
  const handleNewAtividadeDate = (dateStr: string) => {
    setEditingAtividade(null);
    setFormSelectedDate(dateStr);
    setIsFormModalOpen(true);
  };

  const handleOpenNewAtividade = () => {
    setEditingAtividade(null);
    setFormSelectedDate(todayStr);
    setIsFormModalOpen(true);
  };

  const handleSelectAtividade = (atividade: AtividadeGestao) => {
    setDetailAtividade(atividade);
    setIsDetailModalOpen(true);
  };

  // Chegou uma menção do Chat pedindo pra abrir uma atividade específica.
  useEffect(() => {
    if (!abrirAtividadeId) return;
    const atividade = atividades.find((a) => a.id === abrirAtividadeId);
    if (atividade) handleSelectAtividade(atividade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirAtividadeSinal]);

  const handleEditFromDetail = (atividade: AtividadeGestao) => {
    setIsDetailModalOpen(false);
    setEditingAtividade(atividade);
    setFormSelectedDate(atividade.data);
    setIsFormModalOpen(true);
  };

  const handleOpenAlerta = (atividade: AtividadeGestao) => {
    setAlertaAtividade(atividade);
    setIsAlertaModalOpen(true);
  };

  const handleRecordAlerta = (atividadeId: string, canal: 'whatsapp' | 'email' | 'ambos') => {
    const target = atividades.find((a) => a.id === atividadeId);
    if (target) {
      const updated: AtividadeGestao = {
        ...target,
        ultimoAlertaEnviadoEm: new Date().toISOString(),
        ultimoAlertaCanal: canal,
      };
      onSaveAtividade(updated);
      if (detailAtividade && detailAtividade.id === atividadeId) {
        setDetailAtividade(updated);
      }
      if (alertaAtividade && alertaAtividade.id === atividadeId) {
        setAlertaAtividade(updated);
      }
    }
  };

  // Filtered by selected category if not 'todas'
  const visibleAtividades = useMemo(() => {
    if (selectedCategoria === 'todas') return atividades;
    return atividades.filter((a) => a.categoria === selectedCategoria);
  }, [atividades, selectedCategoria]);

  // Key KPI metrics
  const totalCount = atividades.length;
  const hojeCount = atividades.filter((a) => atividadeOcorreEm(a, todayStr)).length;
  const auditoriasCount = atividades.filter((a) => a.categoria === 'Auditoria & RDC 430').length;
  const governancaCount = atividades.filter((a) => a.categoria === 'Reunião & Governança').length;
  const concluidasCount = atividades.filter((a) => a.status === 'Concluída').length;
  const taxaConclusao = totalCount > 0 ? Math.round((concluidasCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Top Banner / Hero */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 text-[#92611F] text-xs font-semibold border border-amber-200">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Governança & Rotinas de Gestão JMT</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Agenda de Atividades da Gestão
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Painel executivo para programação e acompanhamento de comitês de liderança, auditorias RDC 430,
            fechamentos contábeis, DDS de frotas refrigeradas e reuniões estratégicas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => exportAtividadesToCSV(atividades)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Exportar todas as atividades em planilha CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewAtividade}
            className="px-4 py-2 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Programado</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-[#C48229] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Atividades na base</p>
        </div>

        {/* Hoje */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#92611F] font-semibold">Hoje</span>
            <div className="w-7 h-7 rounded-lg bg-[#C48229] text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#92611F] mt-1">{hojeCount}</p>
          <p className="text-[11px] text-[#C48229] font-medium mt-0.5">
            {hojeCount > 0 ? 'Compromissos hoje' : 'Nenhum para hoje'}
          </p>
        </div>

        {/* Auditorias RDC 430 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Auditorias RDC 430</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{auditoriasCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Qualidade & ANVISA</p>
        </div>

        {/* Governança */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Governança & Comitês</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{governancaCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Reuniões executivas</p>
        </div>

        {/* Conclusão */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Taxa de Conclusão</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-1">{taxaConclusao}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{concluidasCount} finalizadas</p>
        </div>
      </div>

      {/* Control Bar: View Switcher and Category Chips */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
        {/* View Mode Switcher */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('mes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'mes'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#C48229]" />
            <span>Mês</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('semana')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'semana'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#C48229]" />
            <span>Semana</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('dia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'dia'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-[#C48229]" />
            <span>Dia</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('lista')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'lista'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5 text-[#C48229]" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 text-[#C48229]" />
            <span>Kanban</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategoria('todas')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              selectedCategoria === 'todas'
                ? 'bg-[#C48229] text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({atividades.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoria('Reunião & Governança')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              selectedCategoria === 'Reunião & Governança'
                ? 'bg-purple-600 text-white font-semibold'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Governança ({atividades.filter((a) => a.categoria === 'Reunião & Governança').length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoria('Auditoria & RDC 430')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              selectedCategoria === 'Auditoria & RDC 430'
                ? 'bg-rose-600 text-white font-semibold'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Auditoria RDC 430 ({atividades.filter((a) => a.categoria === 'Auditoria & RDC 430').length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoria('Operação & Frota')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              selectedCategoria === 'Operação & Frota'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Operação ({atividades.filter((a) => a.categoria === 'Operação & Frota').length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoria('Gente & DP')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              selectedCategoria === 'Gente & DP'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Gente & DP ({atividades.filter((a) => a.categoria === 'Gente & DP').length})
          </button>
        </div>
      </div>

      {/* Main View Mode Content */}
      {viewMode === 'mes' && (
        <AgendaMonthView
          currentDate={currentDate}
          onNavigateMonth={handleNavigateMonth}
          onGoToday={handleGoToday}
          atividades={visibleAtividades}
          onSelectAtividade={handleSelectAtividade}
          onNewAtividadeDate={handleNewAtividadeDate}
        />
      )}

      {viewMode === 'semana' && (
        <AgendaWeekView
          currentDate={currentDate}
          onNavigateWeek={handleNavigateWeek}
          onGoToday={handleGoToday}
          atividades={visibleAtividades}
          onSelectAtividade={handleSelectAtividade}
          onNewAtividadeDate={handleNewAtividadeDate}
        />
      )}

      {viewMode === 'dia' && (
        <AgendaDayView
          currentDate={currentDate}
          onNavigateDay={handleNavigateDay}
          onGoToday={handleGoToday}
          atividades={visibleAtividades}
          onSelectAtividade={handleSelectAtividade}
          onNewAtividadeDate={handleNewAtividadeDate}
          onStatusChange={onStatusChange}
          onOpenAlerta={handleOpenAlerta}
        />
      )}

      {viewMode === 'lista' && (
        <AgendaListView
          atividades={visibleAtividades}
          onSelectAtividade={handleSelectAtividade}
          onEditAtividade={handleEditFromDetail}
          onDeleteAtividade={onDeleteAtividade}
          onStatusChange={onStatusChange}
          onNewAtividade={handleOpenNewAtividade}
          onOpenAlerta={handleOpenAlerta}
        />
      )}

      {viewMode === 'kanban' && (
        <AgendaKanbanView
          atividades={visibleAtividades}
          onSelectAtividade={handleSelectAtividade}
          onStatusChange={onStatusChange}
          onNewAtividade={handleOpenNewAtividade}
        />
      )}

      {/* Form Modal (Create / Edit) */}
      <AgendaFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={onSaveAtividade}
        initialData={editingAtividade}
        selectedDate={formSelectedDate}
        supervisores={supervisores}
        colaboradores={colaboradores}
        usuarios={usuarios}
      />

      {/* Detail Modal */}
      <AgendaDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        atividade={detailAtividade}
        onEdit={handleEditFromDetail}
        onDelete={onDeleteAtividade}
        onStatusChange={onStatusChange}
        onUpdateDeliberacoes={onUpdateDeliberacoes}
        onOpenAlerta={handleOpenAlerta}
      />

      {/* Alerta WhatsApp / E-mail Modal */}
      <AgendaAlertaModal
        isOpen={isAlertaModalOpen}
        onClose={() => setIsAlertaModalOpen(false)}
        atividade={alertaAtividade}
        supervisores={supervisores}
        colaboradores={colaboradores}
        onRecordAlerta={handleRecordAlerta}
      />
    </div>
  );
};
