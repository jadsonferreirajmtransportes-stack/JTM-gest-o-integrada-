import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Calendar,
  Send,
  Video,
} from 'lucide-react';
import { AtividadeGestao } from '../../types';
import {
  CATEGORIA_CONFIG,
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  downloadIcsFile,
  atividadeOcorreEm,
  isAtividadeMultiDia,
  formatAtividadeDateLabel,
  getTipoLocalEfetivo,
} from './agendaUtils';

interface AgendaDayViewProps {
  currentDate: Date;
  onNavigateDay: (direction: number) => void;
  onGoToday: () => void;
  atividades: AtividadeGestao[];
  onSelectAtividade: (atividade: AtividadeGestao) => void;
  onNewAtividadeDate: (dateStr: string) => void;
  onStatusChange: (id: string, newStatus: any) => void;
  onOpenAlerta?: (atividade: AtividadeGestao) => void;
}

const HOURS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

export const AgendaDayView: React.FC<AgendaDayViewProps> = ({
  currentDate,
  onNavigateDay,
  onGoToday,
  atividades,
  onSelectAtividade,
  onNewAtividadeDate,
  onStatusChange,
  onOpenAlerta,
}) => {
  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(currentDate.getDate()).padStart(2, '0')}`;

  const dayAtividades = atividades
    .filter((a) => atividadeOcorreEm(a, dateStr))
    .sort((a, b) => (a.horaInicio || '00:00').localeCompare(b.horaInicio || '00:00'));

  const formattedDate = currentDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const concluidasCount = dayAtividades.filter((a) => a.status === 'Concluída').length;
  const pendentesCount = dayAtividades.length - concluidasCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Day Header Toolbar */}
      <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onNavigateDay(-1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateDay(1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-800 capitalize flex items-center gap-2">
              <span>{formattedDate}</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{dayAtividades.length} atividades programadas</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">{concluidasCount} concluídas</span>
              <span>•</span>
              <span className="text-amber-600 font-semibold">{pendentesCount} pendentes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToday}
            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg shadow-2xs transition-colors"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => onNewAtividadeDate(dateStr)}
            className="px-3 py-1.5 text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>

      {/* Day Content Timeline */}
      <div className="p-4 sm:p-6 space-y-4">
        {dayAtividades.length > 0 ? (
          <div className="space-y-3">
            {dayAtividades.map((atv) => {
              const catConfig = CATEGORIA_CONFIG[atv.categoria];
              const statConfig = STATUS_CONFIG[atv.status];
              const prioConfig = PRIORIDADE_CONFIG[atv.prioridade];
              const isConcluida = atv.status === 'Concluída';

              return (
                <div
                  key={atv.id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                    isConcluida
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-white border-slate-200 border-l-4'
                  }`}
                  style={{ borderLeftColor: isConcluida ? '#94a3b8' : undefined }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    {/* Time & Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#C48229]" />
                        {atv.diaInteiro ? 'Dia Inteiro' : `${atv.horaInicio} às ${atv.horaFim}`}
                      </span>

                      {isAtividadeMultiDia(atv) && (
                        <span className="px-2.5 py-1 bg-amber-50 text-[#92611F] border border-amber-200 font-bold text-xs rounded-lg flex items-center gap-1.5">
                          {formatAtividadeDateLabel(atv, 'short')}
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}
                      >
                        {atv.categoria}
                      </span>

                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-md border flex items-center gap-1 ${statConfig.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statConfig.dot}`} />
                        {atv.status}
                      </span>

                      <span className={`px-2 py-0.5 text-xs rounded-md ${prioConfig.badge}`}>
                        {atv.prioridade}
                      </span>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadIcsFile(atv)}
                        className="p-1.5 text-slate-400 hover:text-[#C48229] hover:bg-slate-100 rounded-lg transition-colors"
                        title="Baixar para calendário (.ics)"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {atv.status !== 'Concluída' ? (
                        <button
                          type="button"
                          onClick={() => onStatusChange(atv.id, 'Concluída')}
                          className="px-2.5 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Concluir</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStatusChange(atv.id, 'Agendada')}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        >
                          <span>Reabrir</span>
                        </button>
                      )}

                      {onOpenAlerta && (
                        <button
                          type="button"
                          onClick={() => onOpenAlerta(atv)}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                          title="Mandar Alerta WhatsApp / E-mail"
                        >
                          <Send className="w-3 h-3 text-emerald-600" />
                          <span className="hidden sm:inline">Alerta</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectAtividade(atv)}
                        className="px-3 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-[#92611F] rounded-lg transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-2.5 cursor-pointer" onClick={() => onSelectAtividade(atv)}>
                    <h3
                      className={`text-sm font-bold text-slate-900 ${
                        isConcluida ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {atv.titulo}
                    </h3>
                    {atv.descricao && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{atv.descricao}</p>
                    )}
                  </div>

                  {/* Footer details */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {atv.responsavel}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {getTipoLocalEfetivo(atv) === 'videoconferencia' ? (
                          <Video className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {atv.localOuLink}
                      </span>
                    </div>

                    {atv.deliberacoes && atv.deliberacoes.length > 0 && (
                      <span className="text-[#C48229] font-semibold text-[11px]">
                        {atv.deliberacoes.filter((d) => d.concluido).length}/
                        {atv.deliberacoes.length} deliberações concluídas
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">Nenhum compromisso marcado para este dia</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Aproveite para organizar alinhamentos de frota, reuniões de diretoria, DDS ou inspeções de qualidade.
            </p>
            <button
              type="button"
              onClick={() => onNewAtividadeDate(dateStr)}
              className="px-4 py-2 text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg shadow-xs inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Nova Atividade</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
