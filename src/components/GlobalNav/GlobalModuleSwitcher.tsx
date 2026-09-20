import React from 'react';
import {
  Building2,
  Plane,
  Truck,
  Users,
  ShieldCheck,
  Thermometer,
  FileText,
  Clock,
  Sparkles,
  FolderKanban,
  LayoutDashboard,
} from 'lucide-react';
import { GlobalModuleId } from '../../types';
import { JmtLogo } from '../Brand/JmtLogo';

interface GlobalModuleSwitcherProps {
  activeModule: GlobalModuleId;
  onChangeModule: (moduleId: GlobalModuleId) => void;
  counts: {
    clientesAtivos: number;
    embarquesAereosAtivos: number;
    viagensRodoviariasAtivas: number;
    colaboradoresAtivos: number;
    alertasDP: number;
    alertasAereo: number;
    alertasRodoviario: number;
    projetosAtivos?: number;
  };
}

export const GlobalModuleSwitcher: React.FC<GlobalModuleSwitcherProps> = ({
  activeModule,
  onChangeModule,
  counts,
}) => {
  const modules = [
    {
      id: 'clientes' as GlobalModuleId,
      number: '1',
      title: 'Gestão de Clientes',
      shortTitle: 'Clientes',
      description: 'Carteira, Contratos, Fretes & CRM',
      icon: Building2,
      badge: counts.clientesAtivos,
      badgeLabel: 'ativos',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      activeBorder: 'border-blue-600',
      activeBg: 'bg-blue-50/80 text-blue-900',
      activeIndicator: 'bg-blue-600',
      iconColor: 'text-blue-600',
    },
    {
      id: 'farma_aereo' as GlobalModuleId,
      number: '2',
      title: 'Farma Aéreo',
      shortTitle: 'Aéreo',
      description: 'AWB, Cargas Térmicas & TECA',
      icon: Plane,
      badge: counts.embarquesAereosAtivos,
      badgeLabel: 'em voo/TECA',
      alertBadge: counts.alertasAereo > 0 ? counts.alertasAereo : undefined,
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      activeBorder: 'border-sky-600',
      activeBg: 'bg-sky-50/80 text-sky-900',
      activeIndicator: 'bg-sky-600',
      iconColor: 'text-sky-600',
    },
    {
      id: 'farma_rodoviario' as GlobalModuleId,
      number: '3',
      title: 'Farma Rodoviário',
      shortTitle: 'Rodoviário',
      description: 'Frotas, Rotas, Telemetria & MDF-e',
      icon: Truck,
      badge: counts.viagensRodoviariasAtivas,
      badgeLabel: 'em trânsito',
      alertBadge: counts.alertasRodoviario > 0 ? counts.alertasRodoviario : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      activeBorder: 'border-emerald-600',
      activeBg: 'bg-emerald-50/80 text-emerald-900',
      activeIndicator: 'bg-emerald-600',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'dp' as GlobalModuleId,
      number: '4',
      title: 'Departamento Pessoal',
      shortTitle: 'DP & RH',
      description: 'Colaboradores, CLT, Férias & ASO',
      icon: Users,
      badge: counts.colaboradoresAtivos,
      badgeLabel: 'ativos',
      alertBadge: counts.alertasDP > 0 ? counts.alertasDP : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      activeBorder: 'border-amber-600',
      activeBg: 'bg-amber-50/80 text-amber-900',
      activeIndicator: 'bg-amber-600',
      iconColor: 'text-amber-600',
    },
    {
      id: 'projetos' as GlobalModuleId,
      number: '5',
      title: 'Projetos Gerenciais',
      shortTitle: 'Projetos & OKRs',
      description: 'Iniciativas, CAPEX, Cronograma & Riscos',
      icon: FolderKanban,
      badge: counts.projetosAtivos ?? 6,
      badgeLabel: 'projetos',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      activeBorder: 'border-purple-600',
      activeBg: 'bg-purple-50/80 text-purple-900',
      activeIndicator: 'bg-purple-600',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="bg-[#111111] border-b border-[#262626] px-4 sm:px-6 py-2.5 shadow-md rounded-xl">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Brand Label & RDC 430 Seal with Official Logo */}
        <div className="flex items-center gap-3">
          <JmtLogo variant="compact" theme="dark" iconSize={26} />
          <div className="hidden sm:block pl-3 border-l border-[#262626]">
            <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#C48229]/15 text-[#C48229] border border-[#C48229]/30">
              <ShieldCheck className="w-3 h-3" />
              RDC 430/2020 ANVISA
            </span>
          </div>
        </div>

        {/* Main Navigation: Dashboard Geral + 5 Modules */}
        <nav aria-label="Módulos Principais" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full xl:w-auto">
          {/* Executive General Dashboard */}
          <button
            id="module-btn-visao_geral"
            onClick={() => onChangeModule('visao_geral')}
            className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 border ${
              activeModule === 'visao_geral'
                ? 'bg-gradient-to-r from-[#C48229]/25 to-[#92611F]/20 border-[#C48229] text-white shadow-md ring-1 ring-[#C48229]/50 font-bold'
                : 'bg-[#161616] border-[#2a2a2a] hover:bg-[#202020] hover:border-[#383838] text-slate-300'
            }`}
            title="Torre de Controle e Indicadores Gerais de todos os Módulos"
          >
            <div className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold shrink-0 transition-colors ${
              activeModule === 'visao_geral'
                ? 'bg-[#C48229] text-white font-extrabold shadow-xs'
                : 'bg-[#262626] text-[#C48229]'
            }`}>
              ★
            </div>
            <LayoutDashboard className="w-4 h-4 shrink-0 text-[#C48229]" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs truncate text-white">Dashboard Geral</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate block">Visão Integrada</span>
            </div>
            {activeModule === 'visao_geral' && (
              <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-[#C48229] rounded-full" />
            )}
          </button>

          {modules.map((mod) => {
            const isActive = activeModule === mod.id;
            const Icon = mod.icon;

            return (
              <button
                key={mod.id}
                id={`module-btn-${mod.id}`}
                onClick={() => onChangeModule(mod.id)}
                className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 border ${
                  isActive
                    ? 'bg-[#1c1813] border-[#C48229] text-white shadow-sm ring-1 ring-[#C48229]/40'
                    : 'bg-[#161616] border-[#2a2a2a] hover:bg-[#202020] hover:border-[#383838] text-slate-300'
                }`}
                title={mod.description}
              >
                {/* Module Number badge */}
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#C48229] text-white font-extrabold shadow-xs'
                      : 'bg-[#262626] text-slate-400 group-hover:bg-[#303030] group-hover:text-slate-200'
                  }`}
                >
                  {mod.number}
                </span>

                {/* Icon */}
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#C48229]' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="font-semibold text-xs truncate">
                      {mod.title}
                    </span>
                    {mod.alertBadge && mod.alertBadge > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" title={`${mod.alertBadge} alertas`} />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {mod.badge} {mod.badgeLabel}
                  </span>
                </div>

                {/* Active Underline Glow */}
                {isActive && (
                  <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-[#C48229] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
