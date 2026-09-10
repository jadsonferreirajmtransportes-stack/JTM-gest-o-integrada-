import React from 'react';
import {
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { AtividadeGestao, StatusAtividadeGestao } from '../../types';
import {
  CATEGORIA_CONFIG,
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  formatAtividadeDateLabel,
} from './agendaUtils';

interface AgendaKanbanViewProps {
  atividades: AtividadeGestao[];
  onSelectAtividade: (atividade: AtividadeGestao) => void;
  onStatusChange: (id: string, newStatus: StatusAtividadeGestao) => void;
  onNewAtividade: () => void;
}

const KANBAN_COLUMNS: Array<{
  status: StatusAtividadeGestao;
  title: string;
  badgeBg: string;
  badgeText: string;
}> = [
  {
    status: 'Agendada',
    title: 'A Fazer / Agendadas',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
  },
  {
    status: 'Em Andamento',
    title: 'Em Andamento',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
  },
  {
    status: 'Concluída',
    title: 'Concluídas',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
  },
  {
    status: 'Adiada',
    title: 'Adiadas / Canceladas',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
  },
];

export const AgendaKanbanView: React.FC<AgendaKanbanViewProps> = ({
  atividades,
  onSelectAtividade,
  onStatusChange,
  onNewAtividade,
}) => {
  const getNextStatus = (current: StatusAtividadeGestao): StatusAtividadeGestao | null => {
    if (current === 'Agendada') return 'Em Andamento';
    if (current === 'Em Andamento') return 'Concluída';
    return null;
  };

  const getPrevStatus = (current: StatusAtividadeGestao): StatusAtividadeGestao | null => {
    if (current === 'Concluída') return 'Em Andamento';
    if (current === 'Em Andamento') return 'Agendada';
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {KANBAN_COLUMNS.map((col) => {
        const colAtividades = atividades.filter((a) => {
          if (col.status === 'Adiada') {
            return a.status === 'Adiada' || a.status === 'Cancelada';
          }
          return a.status === col.status;
        });

        return (
          <div
            key={col.status}
            className="bg-slate-50/70 rounded-2xl border border-slate-200 p-3 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${col.badgeBg} ${col.badgeText}`}>
                  {colAtividades.length}
                </span>
                <h3 className="text-xs font-bold text-slate-800">{col.title}</h3>
              </div>

              {col.status === 'Agendada' && (
                <button
                  type="button"
                  onClick={onNewAtividade}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition-colors"
                  title="Nova Atividade"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Cards List */}
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {colAtividades.map((atv) => {
                const catConfig = CATEGORIA_CONFIG[atv.categoria];
                const prioConfig = PRIORIDADE_CONFIG[atv.prioridade];
                const prev = getPrevStatus(atv.status);
                const next = getNextStatus(atv.status);

                return (
                  <div
                    key={atv.id}
                    className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:shadow-md transition-all group"
                  >
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}
                      >
                        {atv.categoria}
                      </span>
                      <span className={`px-1.5 py-0.2 text-[9px] rounded-sm ${prioConfig.badge}`}>
                        {atv.prioridade}
                      </span>
                    </div>

                    {/* Title */}
                    <h4
                      onClick={() => onSelectAtividade(atv)}
                      className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer leading-snug line-clamp-2"
                    >
                      {atv.titulo}
                    </h4>

                    {/* Details */}
                    <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {formatAtividadeDateLabel(atv, 'short')} ({atv.diaInteiro ? 'Dia Todo' : `${atv.horaInicio} - ${atv.horaFim}`})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{atv.responsavel}</span>
                      </div>
                    </div>

                    {/* Deliberations progress */}
                    {atv.deliberacoes && atv.deliberacoes.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-indigo-600 font-semibold">
                        <span>Deliberações</span>
                        <span>
                          {atv.deliberacoes.filter((d) => d.concluido).length}/{atv.deliberacoes.length} OK
                        </span>
                      </div>
                    )}

                    {/* Action footer: move status */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div>
                        {prev && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(atv.id, prev)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors text-[10px] flex items-center gap-0.5"
                            title={`Mover para ${prev}`}
                          >
                            <ChevronLeft className="w-3 h-3" />
                            <span>Voltar</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectAtividade(atv)}
                        className="text-[10px] font-semibold text-indigo-600 hover:underline"
                      >
                        Detalhes
                      </button>

                      <div>
                        {next && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(atv.id, next)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors text-[10px] font-semibold flex items-center gap-0.5"
                            title={`Avançar para ${next}`}
                          >
                            <span>Avançar</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {colAtividades.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  Nenhuma atividade nesta etapa
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
