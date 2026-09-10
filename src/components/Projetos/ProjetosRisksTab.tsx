import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  FolderKanban,
} from 'lucide-react';
import { ProjetoGerencial, RiscoProjeto } from '../../types';

interface ProjetosRisksTabProps {
  projetos: ProjetoGerencial[];
  onSelectProjeto: (p: ProjetoGerencial) => void;
}

export const ProjetosRisksTab: React.FC<ProjetosRisksTabProps> = ({
  projetos,
  onSelectProjeto,
}) => {
  const [filterImpacto, setFilterImpacto] = useState<string>('todos');

  // Flatten all risks
  const allRiscos = projetos.flatMap((p) =>
    (p.riscos || []).map((r) => ({
      ...r,
      projetoCodigo: p.codigo,
      projetoTitulo: p.titulo,
      projetoObj: p,
    }))
  );

  const filteredRiscos = allRiscos.filter((r) => {
    return filterImpacto === 'todos' || r.impacto === filterImpacto;
  });

  const altosCount = allRiscos.filter((r) => r.impacto === 'Alto').length;
  const mediosCount = allRiscos.filter((r) => r.impacto === 'Médio').length;
  const baixosCount = allRiscos.filter((r) => r.impacto === 'Baixo').length;

  return (
    <div className="space-y-6">
      {/* 3 Top Risk Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-800 uppercase">Riscos de Alto Impacto</span>
            <p className="text-2xl font-black text-rose-700 font-mono mt-0.5">{altosCount}</p>
            <span className="text-[11px] text-rose-600">Requerem plano de ação imediato</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase">Riscos de Médio Impacto</span>
            <p className="text-2xl font-black text-amber-700 font-mono mt-0.5">{mediosCount}</p>
            <span className="text-[11px] text-amber-600">Sob monitoramento preventivo</span>
          </div>
          <Clock className="w-8 h-8 text-amber-500 shrink-0" />
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-800 uppercase">Riscos de Baixo Impacto</span>
            <p className="text-2xl font-black text-blue-700 font-mono mt-0.5">{baixosCount}</p>
            <span className="text-[11px] text-blue-600">Mitigações operacionais padrão</span>
          </div>
          <ShieldCheck className="w-8 h-8 text-blue-500 shrink-0" />
        </div>
      </div>

      {/* RDC 430 Quality Assurance Notice */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-emerald-950">
            Controle de Riscos Regulatórios RDC 430/2020 & ISO 9001
          </h4>
          <p className="text-[11px] text-emerald-800">
            Todos os riscos identificados possuem rastreabilidade com a Garantia da Qualidade, planos de contingência técnica (Data Loggers redundantes, geradores para baús e protocolos ANVISA).
          </p>
        </div>
      </div>

      {/* List of Risks with Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            Matriz de Riscos & Planos de Mitigação Cadastrados ({filteredRiscos.length})
          </h3>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterImpacto}
              onChange={(e) => setFilterImpacto(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="todos">Todos os Níveis de Impacto</option>
              <option value="Alto">Apenas Alto Impacto</option>
              <option value="Médio">Apenas Médio Impacto</option>
              <option value="Baixo">Apenas Baixo Impacto</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredRiscos.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">Nenhum risco encontrado para este filtro.</p>
          ) : (
            filteredRiscos.map((risco) => (
              <div
                key={risco.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectProjeto(risco.projetoObj)}
                      className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200 hover:bg-purple-100 transition-colors"
                    >
                      {risco.projetoCodigo}
                    </button>
                    <span className="font-bold text-slate-900">{risco.descricao}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        risco.probabilidade === 'Alta'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Probabilidade: {risco.probabilidade}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        risco.impacto === 'Alto'
                          ? 'bg-rose-600 text-white'
                          : risco.impacto === 'Médio'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      Impacto: {risco.impacto}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 space-y-1">
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-slate-900">Plano de Mitigação & Contingência:</strong>{' '}
                    {risco.planoMitigacao}
                  </p>
                  {risco.responsavel && (
                    <p className="text-[10px] text-slate-500">
                      Responsável pelo Monitoramento: <strong>{risco.responsavel}</strong>
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
