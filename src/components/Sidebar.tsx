import React, { useState } from 'react';
import {
  Users,
  LayoutDashboard,
  Calendar,
  Utensils,
  Stethoscope,
  AlertTriangle,
  Archive,
  Cake,
  UserCheck,
  Briefcase,
  ShieldAlert,
  ClipboardList,
  Share2,
  DollarSign,
  ChevronRight,
  Building2,
  Plane,
  Truck,
  ShieldCheck,
  Thermometer,
  Layers,
  FileText,
  FolderKanban,
  Target,
  CalendarDays,
  Compass,
  ArrowRightLeft,
  NotebookPen,
  FileCheck2,
} from 'lucide-react';
import { UserRole, GlobalModuleId, UsuarioLogin } from '../types';
import { JmtLogo } from './Brand/JmtLogo';
import { StrategicGuidelinesModal } from './Common/StrategicGuidelinesModal';

export type NavSection =
  | 'visao_geral'
  | 'dashboard'
  | 'colaboradores'
  | 'clientes'
  | 'farma_aereo'
  | 'farma_rodoviario'
  | 'projetos'
  | 'usuarios'
  | 'agenda_gestao'
  | 'notas'
  | 'instrucoes'
  | 'preadmissoes'
  | 'custos'
  | 'ferias'
  | 'beneficios'
  | 'vale_alimentacao'
  | 'saude'
  | 'ocorrencias'
  | 'onboarding'
  | 'arquivo'
  | 'aniversariantes'
  | 'cargos'
  | 'supervisores'
  | 'formulario_publico'
  | 'formulario_admissao';

interface SidebarProps {
  activeGlobalModule: GlobalModuleId;
  onChangeGlobalModule: (module: GlobalModuleId) => void;
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  userRole?: UserRole;
  onChangeRole?: (role: UserRole) => void;
  currentUser?: UsuarioLogin;
  onOpenSwitchUserModal?: () => void;
  counts: {
    ativos: number;
    examesVencendo: number;
    feriasCriticas: number;
    docsPendentes: number;
    ocorrenciasAbertas: number;
    onboardingPendente: number;
    preAdmissoesPendentes?: number;
    clientesAtivos?: number;
    embarquesAereosAtivos?: number;
    viagensRodoviariasAtivas?: number;
    projetosAtivos?: number;
    atividadesHoje?: number;
    totalLogins?: number;
    notasCount?: number;
    instrucoesCount?: number;
  };
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAdmissionLinkModal?: () => void;
  onOpenOccurrenceLinkModal?: () => void;
}

interface NavItemDef {
  id: NavSection;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
  roles: UserRole[];
  group: 'principal' | 'operacional' | 'gestao';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeGlobalModule,
  onChangeGlobalModule,
  currentSection,
  onSelectSection,
  userRole = 'admin',
  onChangeRole,
  currentUser,
  onOpenSwitchUserModal,
  counts,
  isMobileOpen,
  onCloseMobile,
  onOpenAdmissionLinkModal,
  onOpenOccurrenceLinkModal,
}) => {
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // System Modules
  const globalModules = [
    {
      id: 'clientes' as GlobalModuleId,
      number: '1',
      title: 'Gestão de Clientes',
      short: 'Clientes & CRM',
      icon: Building2,
      badge: counts.clientesAtivos,
      color: 'from-blue-600 to-blue-800',
      activeBorder: 'border-blue-500',
    },
    {
      id: 'farma_aereo' as GlobalModuleId,
      number: '2',
      title: 'Farma Aéreo',
      short: 'AWB & TECA',
      icon: Plane,
      badge: counts.embarquesAereosAtivos,
      color: 'from-sky-600 to-blue-800',
      activeBorder: 'border-sky-500',
    },
    {
      id: 'farma_rodoviario' as GlobalModuleId,
      number: '3',
      title: 'Farma Rodoviário',
      short: 'Frota & MDF-e',
      icon: Truck,
      badge: counts.viagensRodoviariasAtivas,
      color: 'from-emerald-600 to-teal-800',
      activeBorder: 'border-emerald-500',
    },
    {
      id: 'dp' as GlobalModuleId,
      number: '4',
      title: 'Departamento Pessoal',
      short: 'RH, CLT & ASO',
      icon: Users,
      badge: counts.ativos,
      color: 'from-amber-600 to-amber-800',
      activeBorder: 'border-amber-500',
    },
    {
      id: 'projetos' as GlobalModuleId,
      number: '5',
      title: 'Projetos Gerenciais',
      short: 'Projetos & OKRs',
      icon: FolderKanban,
      badge: counts.projetosAtivos ?? 6,
      color: 'from-purple-600 to-indigo-800',
      activeBorder: 'border-purple-500',
    },
    {
      id: 'agenda' as GlobalModuleId,
      number: '6',
      title: 'Agenda da Gestão',
      short: 'Governança & Comitês',
      icon: CalendarDays,
      badge: counts.atividadesHoje,
      color: 'from-indigo-600 to-indigo-900',
      activeBorder: 'border-indigo-500',
    },
    {
      id: 'notas' as GlobalModuleId,
      number: '7',
      title: 'Notas & Ideias',
      short: 'Anotações & Brainstorm',
      icon: NotebookPen,
      badge: counts.notasCount,
      color: 'from-teal-600 to-teal-900',
      activeBorder: 'border-teal-500',
    },
    {
      id: 'instrucoes' as GlobalModuleId,
      number: '8',
      title: 'Instruções de Trabalho',
      short: 'Procedimentos & Checklists',
      icon: FileCheck2,
      badge: counts.instrucoesCount,
      color: 'from-[#8A6A39] to-[#5c4526]',
      activeBorder: 'border-[#B38F4F]',
    },
    {
      id: 'usuarios' as GlobalModuleId,
      number: '9',
      title: 'Logins & Acessos',
      short: 'Usuários & Permissões',
      icon: ShieldCheck,
      badge: counts.totalLogins,
      color: 'from-rose-600 to-rose-800',
      activeBorder: 'border-rose-500',
    },
  ];

  // Filter modules based on current user's assigned permissions
  const accessibleGlobalModules = globalModules.filter(
    (mod) => !currentUser || currentUser.modulosPermitidos.includes(mod.id)
  );
  const canAccessVisaoGeral = !currentUser || currentUser.modulosPermitidos.includes('visao_geral');

  // Sub-items for Module 4 (Departamento Pessoal)
  const dpNavItems: NavItemDef[] = [
    // Grupo Principal
    {
      id: 'dashboard',
      label: 'Painel DP & Indicadores',
      icon: LayoutDashboard,
      roles: ['admin', 'supervisor', 'colaborador'],
      group: 'principal',
    },
    {
      id: 'colaboradores',
      label: 'Colaboradores Ativos',
      icon: Users,
      badge: counts.ativos,
      badgeColor: 'bg-slate-700 text-slate-300',
      roles: ['admin', 'supervisor'],
      group: 'principal',
    },
    {
      id: 'preadmissoes',
      label: 'Pré-Admissões (Link)',
      icon: UserCheck,
      badge: counts.preAdmissoesPendentes !== undefined && counts.preAdmissoesPendentes > 0 ? counts.preAdmissoesPendentes : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 animate-pulse',
      roles: ['admin', 'supervisor'],
      group: 'principal',
    },
    {
      id: 'custos',
      label: 'Custo Mensal por Colab.',
      icon: DollarSign,
      roles: ['admin'],
      group: 'principal',
    },
    {
      id: 'beneficios',
      label: 'Benefícios (VA & VT)',
      icon: Utensils,
      roles: ['admin', 'supervisor', 'colaborador'],
      group: 'principal',
    },
    {
      id: 'vale_alimentacao',
      label: 'Programação VA (Quinzenas)',
      icon: CalendarDays,
      roles: ['admin', 'supervisor'],
      group: 'principal',
    },

    // Grupo Operacional
    {
      id: 'ferias',
      label: 'Férias & Ausências CLT',
      icon: Calendar,
      badge: counts.feriasCriticas > 0 ? counts.feriasCriticas : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30',
      roles: ['admin', 'supervisor', 'colaborador'],
      group: 'operacional',
    },
    {
      id: 'saude',
      label: 'Exames ASO (RDC 430)',
      icon: Stethoscope,
      badge: counts.examesVencendo > 0 ? counts.examesVencendo : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse',
      roles: ['admin', 'supervisor'],
      group: 'operacional',
    },
    {
      id: 'onboarding',
      label: 'EPI & Checklist Admissão',
      icon: ClipboardList,
      badge: counts.onboardingPendente > 0 ? counts.onboardingPendente : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      roles: ['admin', 'supervisor'],
      group: 'operacional',
    },
    {
      id: 'ocorrencias',
      label: 'Ocorrências & Advertências',
      icon: AlertTriangle,
      badge: counts.ocorrenciasAbertas > 0 ? counts.ocorrenciasAbertas : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      roles: ['admin', 'supervisor'],
      group: 'operacional',
    },

    // Grupo Gestão
    {
      id: 'aniversariantes',
      label: 'Aniversariantes do Mês',
      icon: Cake,
      roles: ['admin', 'supervisor', 'colaborador'],
      group: 'gestao',
    },
    {
      id: 'arquivo',
      label: 'Arquivo / Demitidos',
      icon: Archive,
      roles: ['admin'],
      group: 'gestao',
    },
    {
      id: 'cargos',
      label: 'Cargos e Salários',
      icon: Briefcase,
      roles: ['admin'],
      group: 'gestao',
    },
    {
      id: 'supervisores',
      label: 'Supervisores e Gestão',
      icon: UserCheck,
      roles: ['admin', 'supervisor'],
      group: 'gestao',
    },
  ];

  const principalItems = dpNavItems.filter((i) => i.group === 'principal');
  const operacionalItems = dpNavItems.filter((i) => i.group === 'operacional');
  const gestaoItems = dpNavItems.filter((i) => i.group === 'gestao');

  const renderNavButton = (item: NavItemDef) => {
    const Icon = item.icon;
    const isActive = activeGlobalModule === 'dp' && currentSection === item.id;
    return (
      <button
        id={`nav-item-${item.id}`}
        key={item.id}
        type="button"
        onClick={() => {
          onChangeGlobalModule('dp');
          onSelectSection(item.id);
          onCloseMobile();
        }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left group ${
          isActive
            ? 'bg-[#B38F4F]/15 text-[#B38F4F] font-bold border border-[#B38F4F]/35 shadow-xs'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#B38F4F]' : 'text-slate-400 group-hover:text-slate-200'}`} />
          <span className="truncate min-w-0">{item.label}</span>
        </div>
        {item.badge !== undefined && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ml-1.5 ${
              item.badgeColor || 'bg-slate-800 text-slate-300'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="jmt-main-sidebar"
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#111111] text-slate-200 flex flex-col border-r border-[#262626] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Official JMT Logo */}
        <div className="p-4 border-b border-[#262626] bg-[#0c0c0c] relative overflow-hidden shrink-0">
          {/* Subtle brand diagonal accent light */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#B38F4F]/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <JmtLogo variant="full" theme="dark" iconSize={34} />
          </div>

          {/* Slogan & Official Strategic Signature */}
          <div className="mt-2.5 pt-2 border-t border-[#262626] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-[0.16em] text-[#B38F4F] uppercase">
                Logística da Saúde
              </span>
              <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#B38F4F]" />
                RDC 430 / BPAD
              </span>
            </div>
            <p className="text-[9.5px] text-slate-400 font-medium leading-tight">
              Segurança, Rastreabilidade e Pontualidade
            </p>
          </div>

          {/* Route accent line from brand manual */}
          <div className="mt-2 h-[2px] w-full bg-gradient-to-r from-[#B38F4F] via-[#8A6A39] to-transparent rounded-full" />
        </div>

        {/* Unified Scrollable Container: Ensures all navigation, modules, and dashboard buttons scroll smoothly without overlapping or covering text */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-dark flex flex-col min-h-0 divide-y divide-[#262626]">
          {/* PRIMARY MODULE SELECTORS + DASHBOARD GERAL */}
          <div className="p-3 bg-[#141414] space-y-2 shrink-0">
            {/* Main Integrated Dashboard Button (only if allowed) */}
            {canAccessVisaoGeral && (
              <button
                id="sidebar-module-visao_geral"
                type="button"
                onClick={() => {
                  onChangeGlobalModule('visao_geral');
                  onSelectSection('visao_geral');
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 border ${
                  activeGlobalModule === 'visao_geral' || currentSection === 'visao_geral'
                    ? 'bg-gradient-to-r from-[#B38F4F]/25 to-[#8A6A39]/20 border-[#B38F4F] text-white shadow-md ring-1 ring-[#B38F4F]/50 font-bold'
                    : 'bg-[#181818] border-[#2a2a2a] hover:bg-[#202020] hover:border-[#383838] text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-lg shrink-0 ${activeGlobalModule === 'visao_geral' ? 'bg-[#B38F4F] text-white' : 'bg-[#262626] text-[#B38F4F]'}`}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span className="leading-tight">Dashboard Geral</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#B38F4F]/25 text-[#D8B97E] border border-[#B38F4F]/40 font-extrabold uppercase shrink-0">Geral</span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">Todos os Módulos & KPIs</div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>
            )}

            <div className="flex items-center justify-between px-1 pt-1 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Módulos Permitidos
              </span>
              <span className="text-[10px] text-[#B38F4F] font-semibold">
                {accessibleGlobalModules.length} de {globalModules.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {accessibleGlobalModules.map((mod) => {
                const isModActive = activeGlobalModule === mod.id;
                const Icon = mod.icon;

                return (
                  <button
                    key={mod.id}
                    id={`sidebar-module-${mod.id}`}
                    type="button"
                    onClick={() => {
                      onChangeGlobalModule(mod.id);
                      if (mod.id === 'clientes') onSelectSection('clientes');
                      else if (mod.id === 'farma_aereo') onSelectSection('farma_aereo');
                      else if (mod.id === 'farma_rodoviario') onSelectSection('farma_rodoviario');
                      else if (mod.id === 'projetos') onSelectSection('projetos');
                      else if (mod.id === 'usuarios') onSelectSection('usuarios');
                      else if (mod.id === 'instrucoes') onSelectSection('instrucoes');
                      else if (mod.id === 'dp') {
                        onSelectSection('dashboard');
                      }
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all duration-150 border ${
                      isModActive
                        ? 'bg-[#1e1a14] border-[#B38F4F] text-white shadow-sm ring-1 ring-[#B38F4F]/40'
                        : 'bg-[#181818] border-[#2a2a2a] hover:bg-[#202020] hover:border-[#383838] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                          isModActive
                            ? 'bg-[#B38F4F] text-white shadow-xs'
                            : 'bg-[#262626] text-slate-400'
                        }`}
                      >
                        {mod.number}
                      </span>
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isModActive ? 'text-[#B38F4F]' : 'text-slate-400'
                        }`}
                      />
                      <span className="font-semibold text-xs text-slate-100 min-w-0 leading-tight">
                        {mod.title}
                      </span>
                    </div>

                    {mod.badge !== undefined && mod.badge > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ml-1.5 ${
                          isModActive
                            ? 'bg-[#B38F4F]/25 text-[#F4EEE1] border border-[#B38F4F]/40'
                            : 'bg-[#262626] text-slate-400'
                        }`}
                      >
                        {mod.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Session & Login Box (Replaces old Perfil de Acesso switcher) */}
          {currentUser && (
            <div className="px-3.5 py-2.5 bg-[#141414] border-t border-b border-[#242424] shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#B38F4F] to-[#8A6A39] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {currentUser.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">
                      {currentUser.nome}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-mono">
                      <span>@{currentUser.login}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[#B38F4F] font-sans font-semibold">
                        {currentUser.modulosPermitidos.length} mód.
                      </span>
                    </div>
                  </div>
                </div>

                {onOpenSwitchUserModal && (
                  <button
                    type="button"
                    onClick={onOpenSwitchUserModal}
                    className="px-2.5 py-1 bg-[#222222] hover:bg-[#B38F4F] hover:text-white text-slate-300 text-[10px] font-bold rounded-lg border border-[#333333] transition-all shrink-0 flex items-center gap-1"
                    title="Alternar entre contas cadastradas"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Trocar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CONTEXTUAL SUB-NAV ITEMS BASED ON ACTIVE MODULE */}
          <div className="flex-1 px-3 py-3 space-y-1 bg-[#111111]">
            {activeGlobalModule === 'visao_geral' ? (
              <div className="p-1 space-y-2.5">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold px-1">
                  <span>Torre de Controle</span>
                  <span className="text-[#B38F4F]">Visão Executiva</span>
                </div>
                <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                  Visão consolidada de DRE, receitas, frota, AWB e conformidade RDC 430 de todos os módulos.
                </p>

                <div className="space-y-1 pt-1">
                  <button
                    id="subnav-visao-geral-painel"
                    type="button"
                    onClick={() => {
                      onSelectSection('visao_geral');
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                      currentSection === 'visao_geral'
                        ? 'bg-[#B38F4F]/20 text-[#D8B97E] border border-[#B38F4F]/40 font-bold'
                        : 'bg-[#181818] text-slate-300 hover:text-white hover:bg-[#202020]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-[#B38F4F]" />
                      <span>Painel Geral Integrado</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#B38F4F]/20 text-[#D8B97E] font-bold">Ativo</span>
                  </button>

                  <button
                    id="subnav-visao-geral-agenda"
                    type="button"
                    onClick={() => {
                      onChangeGlobalModule('agenda');
                      onSelectSection('agenda_gestao');
                      onCloseMobile();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#181818] hover:bg-[#202020] text-indigo-300 border border-indigo-500/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-indigo-400" />
                      <span>Agenda da Gestão</span>
                    </div>
                    {counts.atividadesHoje && counts.atividadesHoje > 0 ? (
                      <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/30 text-indigo-200 rounded font-bold">
                        {counts.atividadesHoje} hoje
                      </span>
                    ) : null}
                  </button>
                </div>

                {/* Direct Module Panels Quick Navigation */}
                <div className="pt-2 border-t border-[#262626]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                    Acesso Direto aos Painéis
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeGlobalModule('clientes');
                        onSelectSection('clientes');
                        onCloseMobile();
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#181818] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>1. Carteira de Clientes</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeGlobalModule('farma_aereo');
                        onSelectSection('farma_aereo');
                        onCloseMobile();
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#181818] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>2. Farma Aéreo (AWB)</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeGlobalModule('farma_rodoviario');
                        onSelectSection('farma_rodoviario');
                        onCloseMobile();
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#181818] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>3. Farma Rodoviário (Frota)</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeGlobalModule('dp');
                        onSelectSection('dashboard');
                        onCloseMobile();
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#181818] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>4. Departamento Pessoal</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeGlobalModule('projetos');
                        onSelectSection('projetos');
                        onCloseMobile();
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#181818] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>5. Projetos & OKRs</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeGlobalModule('agenda');
                        onSelectSection('agenda_gestao');
                        onCloseMobile();
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#181818] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>6. Agenda da Gestão</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeGlobalModule('notas');
                        onSelectSection('notas');
                        onCloseMobile();
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#181818] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <NotebookPen className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>7. Notas & Ideias</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeGlobalModule('instrucoes');
                        onSelectSection('instrucoes');
                        onCloseMobile();
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#181818] text-left transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FileCheck2 className="w-3.5 h-3.5 text-[#B38F4F] shrink-0" />
                        <span>8. Instruções de Trabalho</span>
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>
            ) : activeGlobalModule === 'dp' ? (
            <>
              <div className="text-slate-500 text-[10px] uppercase font-bold px-2 mb-1.5">
                Principal DP
              </div>
              {principalItems.map(renderNavButton)}

              {operacionalItems.length > 0 && (
                <>
                  <div className="pt-4 text-slate-500 text-[10px] uppercase font-bold px-2 mb-1.5">
                    Operacional CLT & ANVISA
                  </div>
                  {operacionalItems.map(renderNavButton)}
                </>
              )}

              {gestaoItems.length > 0 && (
                <>
                  <div className="pt-4 text-slate-500 text-[10px] uppercase font-bold px-2 mb-1.5">
                    Gestão & Tabelas
                  </div>
                  {gestaoItems.map(renderNavButton)}
                </>
              )}

              {/* External Links */}
              <div className="pt-4 text-slate-500 text-[10px] uppercase font-bold px-2 mb-1.5">
                Links Digitais & Campo
              </div>
              <div className="space-y-1.5">
                <button
                  id="nav-item-form-publico"
                  type="button"
                  onClick={() => {
                    onSelectSection('formulario_publico');
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border ${
                    currentSection === 'formulario_publico'
                      ? 'bg-slate-800 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Share2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Ocorrência em Campo</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold">Abrir</span>
                </button>

                <button
                  id="nav-item-form-admissao"
                  type="button"
                  onClick={() => {
                    if (onOpenAdmissionLinkModal) {
                      onOpenAdmissionLinkModal();
                    } else {
                      onSelectSection('preadmissoes');
                    }
                    onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left border bg-gradient-to-r from-amber-950/40 to-slate-950/60 border-amber-500/30 text-amber-300 hover:border-amber-500/60"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Link p/ Candidato</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200 font-bold">
                    Enviar
                  </span>
                </button>
              </div>
            </>
          ) : activeGlobalModule === 'clientes' ? (
            <div className="p-2 space-y-2">
              <div className="text-slate-300 text-xs font-bold px-1">
                Carteira de Clientes
              </div>
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Gestão centralizada de parceiros comerciais, contratos farmacêuticos RDC 430, rotas e tabelas de frete.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    onSelectSection('clientes');
                    onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs"
                >
                  <Building2 className="w-4 h-4" />
                  Visualizar Todos os Clientes
                </button>
              </div>
            </div>
          ) : activeGlobalModule === 'farma_aereo' ? (
            <div className="p-2 space-y-2">
              <div className="text-slate-300 text-xs font-bold px-1">
                Operações Farma Aéreo
              </div>
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Rastreamento AWB em tempo real, monitoramento de cadeias 2°C a 8°C e gelo seco, liberação em TECA e plantão UTI 24h.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    onSelectSection('farma_aereo');
                    onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white shadow-xs"
                >
                  <Plane className="w-4 h-4" />
                  Painel de Voos & AWB
                </button>
              </div>
            </div>
          ) : activeGlobalModule === 'farma_rodoviario' ? (
            <div className="p-2 space-y-2">
              <div className="text-slate-300 text-xs font-bold px-1">
                Operações Farma Rodoviário
              </div>
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Gestão de frota com telemetria contínua do baú refrigerado, MDF-e, pontos de parada e baixa de entregas.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    onSelectSection('farma_rodoviario');
                    onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow-xs"
                >
                  <Truck className="w-4 h-4" />
                  Painel de Viagens & Frotas
                </button>
              </div>
            </div>
          ) : activeGlobalModule === 'usuarios' ? (
            <div className="p-2 space-y-2">
              <div className="flex items-center justify-between text-slate-300 text-xs font-bold px-1">
                <span>Controle de Acessos</span>
                <span className="text-[#B38F4F] text-[10px]">Segurança</span>
              </div>
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Cadastre credenciais e defina exatamente quais módulos cada login pode acessar no sistema JMT.
              </p>
              <div className="pt-2 space-y-1.5">
                <button
                  onClick={() => {
                    onSelectSection('usuarios');
                    onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Gerenciar Logins & Permissões
                </button>
                {onOpenSwitchUserModal && (
                  <button
                    onClick={() => {
                      onOpenSwitchUserModal();
                      onCloseMobile();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-[#B38F4F]" />
                      <span>Trocar Usuário Atual</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          ) : activeGlobalModule === 'agenda' ? (
            <div className="p-2 space-y-2">
              <div className="text-slate-300 text-xs font-bold px-1">
                Agenda da Gestão
              </div>
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Reuniões executivas, comitês de liderança, auditorias RDC 430, fechamentos contábeis e prazos estratégicos da governança JMT.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    onSelectSection('agenda_gestao');
                    onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    <span>Abrir Agenda Completa</span>
                  </div>
                  {counts.atividadesHoje && counts.atividadesHoje > 0 ? (
                    <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded font-bold">
                      {counts.atividadesHoje} hoje
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          ) : activeGlobalModule === 'notas' ? (
            <div className="p-2 space-y-2">
              <div className="text-slate-300 text-xs font-bold px-1">
                Notas & Ideias
              </div>
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Páginas livres de anotações e brainstorm, estilo Notion — vincule qualquer página a um cliente, projeto, colaborador ou operação.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    onSelectSection('notas');
                    onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <NotebookPen className="w-4 h-4" />
                    <span>Abrir Notas & Ideias</span>
                  </div>
                  {counts.notasCount && counts.notasCount > 0 ? (
                    <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded font-bold">
                      {counts.notasCount}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          ) : activeGlobalModule === 'instrucoes' ? (
            <div className="p-2 space-y-2">
              <div className="text-slate-300 text-xs font-bold px-1">
                Instruções de Trabalho
              </div>
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Checklists, fluxogramas e procedimentos padronizados por operação — com código, dono do processo,
                versão e vínculo a clientes, embarques ou viagens.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    onSelectSection('instrucoes');
                    onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#B38F4F] hover:bg-[#8A6A39] text-white shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4" />
                    <span>Abrir Instruções de Trabalho</span>
                  </div>
                  {counts.instrucoesCount && counts.instrucoesCount > 0 ? (
                    <span className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded font-bold">
                      {counts.instrucoesCount}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              <div className="text-slate-300 text-xs font-bold px-1">
                Projetos Gerenciais & OKRs
              </div>
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                Gestão de iniciativas estratégicas, CAPEX, roadmap de marcos, quadro Kanban e matriz de riscos RDC 430.
              </p>
              <div className="pt-2 space-y-1.5">
                <button
                  onClick={() => {
                    onSelectSection('projetos');
                    onCloseMobile();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-purple-600 text-white shadow-xs hover:bg-purple-700 transition-colors"
                >
                  <FolderKanban className="w-4 h-4" />
                  Painel de Projetos & OKRs
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Strategic Guidelines Shortcut */}
        <div className="px-3 pt-2.5 pb-1 bg-[#101010] border-t border-[#262626] shrink-0">
          <button
            id="btn-sidebar-norteadores"
            type="button"
            onClick={() => setIsGuidelinesOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] hover:border-[#B38F4F]/40 transition-colors"
            title="Ver Missão, Visão e Valores da JMT"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[#B38F4F]" />
              <span className="text-[11px] font-semibold">Norteadores Estratégicos</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#B38F4F]/20 text-[#D8B97E] font-bold">JMT</span>
          </button>
        </div>

        {/* User Profile Footer */}
        <div className="p-3.5 border-t border-[#262626] bg-[#0c0c0c] shrink-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#B38F4F]/40 flex items-center justify-center font-bold text-xs text-[#B38F4F] shadow-xs shrink-0">
                {currentUser ? currentUser.nome.substring(0, 2).toUpperCase() : 'JM'}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white font-bold leading-tight truncate">
                  {currentUser ? currentUser.nome : 'Jadson Moraes'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {currentUser ? currentUser.cargo : 'Diretoria Executiva'}
                </p>
              </div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-500/40 shrink-0" title="JMT Conectado · RDC 430/2020" />
          </div>
        </div>
      </aside>

      {/* Strategic Guidelines Modal */}
      <StrategicGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />
    </>
  );
};
