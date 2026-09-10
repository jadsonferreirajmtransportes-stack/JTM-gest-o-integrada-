import React, { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Colaborador, ItemOnboarding } from '../../types';
import { formatDate } from '../../utils/formatters';
import { StrategicGuidelinesBanner } from '../Common/StrategicGuidelinesBanner';

interface OnboardingViewProps {
  colaboradores: Colaborador[];
  onUpdateOnboardingItem: (
    colaboradorId: string,
    itemKey: string,
    concluido: boolean
  ) => void;
}

const DEFAULT_ONBOARDING_ITEMS = [
  { chave: 'norteadores_cultura', label: '1. Apresentação dos Norteadores Estratégicos JMT (Propósito, Missão, Visão e Valores)' },
  { chave: 'doc_entregue', label: '2. Entrega e validação de todos os documentos admissionais e contrato' },
  { chave: 'aso_admissional', label: '3. Realização e aprovação do ASO Admissional (RDC 430/ANVISA)' },
  { chave: 'acessos_email', label: '4. Criação de e-mail corporativo e acessos aos sistemas operacionais' },
  { chave: 'treinamento_rdc430', label: '5. Treinamento de Boas Práticas de Distribuição e Transporte (RDC 430 / BPAD)' },
  { chave: 'entrega_fardamento_epi', label: '6. Entrega do fardamento completo, crachá funcional e EPIs' },
  { chave: 'integracao_equipe', label: '7. Integração presencial com a equipe e alinhamento com a Supervisão' },
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  colaboradores,
  onUpdateOnboardingItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Show active employees admitted in the last 180 days (or all active)
  const onboardingList = colaboradores
    .filter((c) => c.status !== 'Inativo')
    .filter((c) => {
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      return (
        c.nomeCompleto?.toLowerCase().includes(q) ||
        c.codigoMatricula?.toLowerCase().includes(q) ||
        c.funcaoCargo?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-4">
      {/* Strategic Guidelines Banner for Onboarding */}
      <StrategicGuidelinesBanner variant="light" />

      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold uppercase">
            Integração Cultural & Boas Práticas (RDC 430/BPAD)
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Checklist de Onboarding & Integração de Novos Colaboradores
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe a trilha de integração aos Norteadores Estratégicos da JMT, treinamentos regulamentares da ANVISA RDC 430 e conformidade operacional para novos contratados.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs max-w-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar colaborador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {onboardingList.map((colab) => {
          // Calculate completion percentage
          const totalItems = DEFAULT_ONBOARDING_ITEMS.length;
          const completedItems = colab.onboarding?.filter((i) => i.concluido).length || 0;
          const percentage = Math.round((completedItems / totalItems) * 100);

          return (
            <div
              key={colab.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                      {colab.codigoMatricula}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{colab.nomeCompleto}</h3>
                    <p className="text-xs text-slate-500">
                      {colab.funcaoCargo} • Admissão: {formatDate(colab.dataAdmissao)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full ${
                        percentage === 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : percentage >= 50
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {percentage}% Concluído
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      percentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Check items */}
                <div className="mt-4 space-y-2 text-xs">
                  {DEFAULT_ONBOARDING_ITEMS.map((item) => {
                    const isDone = colab.onboarding?.some(
                      (i) => i.item === item.chave && i.concluido
                    );

                    return (
                      <label
                        key={item.chave}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                            : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!isDone}
                          onChange={(e) =>
                            onUpdateOnboardingItem(colab.id, item.chave, e.target.checked)
                          }
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 mt-0.5 shrink-0"
                        />
                        <span className={`text-[11px] leading-tight ${isDone ? 'font-medium' : ''}`}>
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Setor: {colab.setor}</span>
                <span>
                  {completedItems} de {totalItems} etapas concluídas
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
