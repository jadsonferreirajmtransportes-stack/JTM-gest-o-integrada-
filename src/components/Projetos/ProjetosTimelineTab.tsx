import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Flag,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ProjetoGerencial } from '../../types';

interface ProjetosTimelineTabProps {
  projetos: ProjetoGerencial[];
  onSelectProjeto: (p: ProjetoGerencial) => void;
}

export const ProjetosTimelineTab: React.FC<ProjetosTimelineTabProps> = ({
  projetos,
  onSelectProjeto,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  const filteredProjetos = projetos.filter((p) => {
    return selectedCategory === 'todos' || p.categoria === selectedCategory;
  });

  // Calculate timeline bounds (e.g., 2026 months Jan-Dec)
  const months = [
    { label: 'Jan/26', num: 1 },
    { label: 'Fev/26', num: 2 },
    { label: 'Mar/26', num: 3 },
    { label: 'Abr/26', num: 4 },
    { label: 'Mai/26', num: 5 },
    { label: 'Jun/26', num: 6 },
    { label: 'Jul/26', num: 7 },
    { label: 'Ago/26', num: 8 },
    { label: 'Set/26', num: 9 },
    { label: 'Out/26', num: 10 },
    { label: 'Nov/26', num: 11 },
    { label: 'Dez/26', num: 12 },
  ];

  const getPositionPercent = (dateStr: string) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const month = d.getMonth(); // 0 to 11
    const day = d.getDate(); // 1 to 31
    const percent = ((month + day / 30) / 12) * 100;
    return Math.min(Math.max(percent, 0), 100);
  };

  return (
    <div className="space-y-6">
      {/* Header filter */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#B38F4F]" />
            Cronograma Estratégico & Roadmap de Entregas 2026
          </h3>
          <p className="text-xs text-slate-500">
            Acompanhamento temporal de janelas de execução, auditorias e marcos críticos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
          >
            <option value="todos">Todas as Categorias</option>
            <option value="Expansão & Novos Hubs">Expansão & Novos Hubs</option>
            <option value="Regulatório & Qualidade RDC 430">Regulatório & RDC 430</option>
            <option value="Inovação & Tecnologia">Inovação & Tecnologia</option>
            <option value="Frota & Sustentabilidade">Frota & Sustentabilidade</option>
            <option value="Comercial & Novos Clientes">Comercial & Clientes</option>
            <option value="Eficiência Operacional & Custos">Eficiência Operacional</option>
          </select>
        </div>
      </div>

      {/* Gantt Timeline View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 overflow-x-auto">
        <div className="min-w-[760px] space-y-4">
          {/* Months Header Bar */}
          <div className="grid grid-cols-12 gap-1 border-b border-slate-200 pb-2 text-center text-[11px] font-bold text-slate-500 uppercase">
            {months.map((m) => (
              <div key={m.label} className="p-1 bg-slate-50 rounded">
                {m.label}
              </div>
            ))}
          </div>

          {/* Project Timeline Rows */}
          <div className="space-y-6 pt-2">
            {filteredProjetos.map((p) => {
              const startPct = getPositionPercent(p.dataInicio);
              const endPct = getPositionPercent(p.dataPrevisaoFim);
              const widthPct = Math.max(endPct - startPct, 8);

              return (
                <div key={p.id} className="space-y-2 group">
                  {/* Row Top: Project info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-[#8A6A39] border border-amber-200">
                        {p.codigo}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectProjeto(p)}
                        className="font-bold text-slate-900 hover:text-[#8A6A39] transition-colors text-left"
                      >
                        {p.titulo}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                      <span>{p.dataInicio} até {p.dataPrevisaoFim}</span>
                      <span className="font-mono font-bold text-[#8A6A39]">{p.progressoPercentual}%</span>
                    </div>
                  </div>

                  {/* Visual Gantt Bar */}
                  <div className="relative h-7 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    {/* Background Month Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-12 divide-x divide-slate-200/70 pointer-events-none" />

                    {/* Active Project Span Bar */}
                    <div
                      className="absolute top-1 bottom-1 bg-gradient-to-r from-[#B38F4F] to-[#B38F4F] rounded-md shadow-xs flex items-center justify-between px-2 text-white text-[10px] font-bold transition-all duration-300 group-hover:brightness-110"
                      style={{
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      <span className="truncate">{p.categoria}</span>
                      <span className="font-mono">{p.progressoPercentual}%</span>
                    </div>

                    {/* Milestones flags overlay */}
                    {(p.marcos || []).map((m) => {
                      const mPct = getPositionPercent(m.dataLimite);
                      return (
                        <div
                          key={m.id}
                          className="absolute top-0 bottom-0 flex items-center justify-center -translate-x-1/2 z-10 cursor-pointer"
                          style={{ left: `${mPct}%` }}
                          title={`Marco: ${m.titulo} (${m.dataLimite}) - ${m.concluido ? 'Concluído' : 'Pendente'}`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                              m.concluido ? 'bg-emerald-500' : 'bg-amber-500 ring-2 ring-amber-300'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Milestones chips */}
                  <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                    {(p.marcos || []).map((m) => (
                      <span
                        key={m.id}
                        className={`px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          m.concluido
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <Flag className="w-2.5 h-2.5" />
                        {m.titulo} ({m.dataLimite})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
