import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, ArrowLeftRight } from 'lucide-react';
import { AtividadeGestao } from '../../types';
import { CATEGORIA_CONFIG, STATUS_CONFIG, atividadeOcorreEm, isAtividadeMultiDia, formatAtividadeDateLabel } from './agendaUtils';

interface AgendaMonthViewProps {
  currentDate: Date;
  onNavigateMonth: (direction: number) => void;
  onGoToday: () => void;
  atividades: AtividadeGestao[];
  onSelectAtividade: (atividade: AtividadeGestao) => void;
  onNewAtividadeDate: (dateStr: string) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const AgendaMonthView: React.FC<AgendaMonthViewProps> = ({
  currentDate,
  onNavigateMonth,
  onGoToday,
  atividades,
  onSelectAtividade,
  onNewAtividadeDate,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  // Build calendar matrix
  const calendarCells: Array<{
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }> = [];

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remaining = 35 - calendarCells.length > 0 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Month Navigation Toolbar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800 capitalize">{monthName}</h2>
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
            onClick={() => onNavigateMonth(-1)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateMonth(1)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center text-xs font-bold text-slate-600">
        {WEEKDAYS.map((w, idx) => (
          <div key={idx} className="py-2">
            {w}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
        {calendarCells.map((cell, idx) => {
          const dayAtividades = atividades.filter((a) => atividadeOcorreEm(a, cell.dateStr));

          return (
            <div
              key={idx}
              className={`min-h-[110px] p-1.5 sm:p-2 transition-colors flex flex-col group relative ${
                cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/60 text-slate-400'
              } ${cell.isToday ? 'bg-amber-50/30' : ''}`}
            >
              {/* Day Number header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    cell.isToday
                      ? 'bg-[#C48229] text-white shadow-xs'
                      : cell.isCurrentMonth
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                <button
                  type="button"
                  onClick={() => onNewAtividadeDate(cell.dateStr)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#C48229] hover:bg-slate-100 rounded-md transition-opacity"
                  title="Adicionar atividade neste dia"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Day Activities Badges */}
              <div className="space-y-1 overflow-y-auto max-h-[85px] flex-1">
                {dayAtividades.slice(0, 3).map((atv) => {
                  const catConfig = CATEGORIA_CONFIG[atv.categoria];
                  const isConcluida = atv.status === 'Concluída';
                  const multiDia = isAtividadeMultiDia(atv);

                  return (
                    <div
                      key={atv.id}
                      onClick={() => onSelectAtividade(atv)}
                      className={`text-[11px] p-1 rounded-md border cursor-pointer transition-all hover:shadow-xs hover:scale-[1.01] ${
                        isConcluida
                          ? 'bg-slate-100 border-slate-200 text-slate-500 line-through opacity-80'
                          : `${catConfig.lightBg} ${catConfig.border} ${catConfig.text}`
                      }`}
                      title={`${atv.titulo} (${multiDia ? formatAtividadeDateLabel(atv, 'short') : atv.horaInicio} - ${atv.responsavel})`}
                    >
                      <div className="flex items-center gap-1 font-semibold truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${catConfig.dot}`} />
                        {multiDia && <ArrowLeftRight className="w-2.5 h-2.5 shrink-0 opacity-70" />}
                        <span className="truncate">{atv.titulo}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>{atv.diaInteiro ? 'Dia todo' : atv.horaInicio}</span>
                        <span className="truncate max-w-[80px]">{atv.responsavel.split(' ')[0]}</span>
                      </div>
                    </div>
                  );
                })}

                {dayAtividades.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onSelectAtividade(dayAtividades[3])}
                    className="w-full text-center text-[10px] text-[#C48229] font-semibold hover:underline"
                  >
                    +{dayAtividades.length - 3} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
