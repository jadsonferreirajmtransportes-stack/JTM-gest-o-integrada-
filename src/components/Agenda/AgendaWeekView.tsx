import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, CheckCircle2, ArrowLeftRight, Video } from 'lucide-react';
import { AtividadeGestao } from '../../types';
import {
  CATEGORIA_CONFIG,
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  atividadeOcorreEm,
  isAtividadeMultiDia,
  formatAtividadeDateLabel,
  getTipoLocalEfetivo,
} from './agendaUtils';

interface AgendaWeekViewProps {
  currentDate: Date;
  onNavigateWeek: (direction: number) => void;
  onGoToday: () => void;
  atividades: AtividadeGestao[];
  onSelectAtividade: (atividade: AtividadeGestao) => void;
  onNewAtividadeDate: (dateStr: string) => void;
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const AgendaWeekView: React.FC<AgendaWeekViewProps> = ({
  currentDate,
  onNavigateWeek,
  onGoToday,
  atividades,
  onSelectAtividade,
  onNewAtividadeDate,
}) => {
  const currentDayOfWeek = currentDate.getDay(); // 0 = Sun
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);

  const weekDays: Array<{ date: Date; dateStr: string; isToday: boolean }> = [];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    weekDays.push({
      date: d,
      dateStr,
      isToday: dateStr === todayStr,
    });
  }

  const startFormatted = weekDays[0].date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const endFormatted = weekDays[6].date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Week Navigation Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">
            Semana: {startFormatted} — {endFormatted}
          </h2>
          <button
            type="button"
            onClick={onGoToday}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg shadow-2xs transition-colors"
          >
            Hoje
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigateWeek(-1)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateWeek(1)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
            title="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[480px]">
        {weekDays.map((day, idx) => {
          const dayAtividades = atividades
            .filter((a) => atividadeOcorreEm(a, day.dateStr))
            .sort((a, b) => (a.horaInicio || '00:00').localeCompare(b.horaInicio || '00:00'));

          return (
            <div
              key={idx}
              className={`p-3 flex flex-col group transition-colors ${
                day.isToday ? 'bg-indigo-50/20' : 'bg-white'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block">
                    {WEEKDAYS[idx]}
                  </span>
                  <span
                    className={`text-sm font-bold inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
                      day.isToday ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNewAtividadeDate(day.dateStr)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                  title={`Nova atividade em ${day.dateStr}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Activities in this day */}
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[520px]">
                {dayAtividades.map((atv) => {
                  const catConfig = CATEGORIA_CONFIG[atv.categoria];
                  const prioConfig = PRIORIDADE_CONFIG[atv.prioridade];
                  const isConcluida = atv.status === 'Concluída';
                  const multiDia = isAtividadeMultiDia(atv);

                  return (
                    <div
                      key={atv.id}
                      onClick={() => onSelectAtividade(atv)}
                      title={multiDia ? formatAtividadeDateLabel(atv, 'short') : undefined}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
                        isConcluida
                          ? 'bg-slate-50 border-slate-200 text-slate-500 opacity-75'
                          : `${catConfig.lightBg} ${catConfig.border} border-l-4`
                      }`}
                      style={{ borderLeftColor: isConcluida ? '#94a3b8' : undefined }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {atv.diaInteiro ? 'Dia Todo' : `${atv.horaInicio} - ${atv.horaFim}`}
                        </span>
                        {multiDia && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-indigo-100 text-indigo-800 font-bold rounded-sm flex items-center gap-0.5">
                            <ArrowLeftRight className="w-2.5 h-2.5" />
                            {formatAtividadeDateLabel(atv, 'short')}
                          </span>
                        )}
                        {atv.prioridade === 'Urgente' && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-rose-600 text-white font-bold rounded-sm">
                            URGENTE
                          </span>
                        )}
                        {isConcluida && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-emerald-100 text-emerald-800 font-bold rounded-sm">
                            OK
                          </span>
                        )}
                      </div>

                      <h4
                        className={`font-semibold text-xs leading-snug line-clamp-2 ${
                          isConcluida ? 'line-through text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {atv.titulo}
                      </h4>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 flex flex-col gap-1 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1 truncate font-medium text-slate-700">
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{atv.responsavel}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate text-slate-500">
                          {getTipoLocalEfetivo(atv) === 'videoconferencia' ? (
                            <Video className="w-3 h-3 text-slate-400 shrink-0" />
                          ) : (
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{atv.localOuLink}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {dayAtividades.length === 0 && (
                  <div className="h-28 flex flex-col items-center justify-center text-center p-3 text-slate-300">
                    <span className="text-xs">Sem atividades</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
