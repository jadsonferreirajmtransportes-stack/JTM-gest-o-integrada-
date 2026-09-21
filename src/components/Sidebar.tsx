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
  ChevronLeft,
  Building2,
  Plane,
  Truck,
  ShieldCheck,
  HardHat,
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
  ShoppingCart,
  Calculator,
  MessageSquare,
  Download,
} from 'lucide-react';
import { UserRole, GlobalModuleId, UsuarioLogin, SecaoDp, Operacao } from '../types';
import { resolveOperacaoIcon } from '../utils/iconResolver';
import { podeVerSecaoDp, primeiraSecaoDpPermitida, temAcessoGeralDp } from '../utils/visibilidadeUtils';
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
  | 'controladoria'
  | 'chat'
  | 'notas'
  | 'instrucoes'
  | 'preadmissoes'
  | 'custos'
  | 'ferias'
  | 'beneficios'
  | 'vale_alimentacao'
  | 'saude'
  | 'epis'
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
    clientesFarmaAereo?: number;
    clientesFarmaRodoviario?: number;
    /** Contagem genérica por id de operação — só usada pra operações além das 2 originais
     *  (que continuam com os campos dedicados acima). */
    clientesPorOperacao?: Record<string, number>;
    headcountFarmaAereo?: number;
    headcountFarmaRodoviario?: number;
    projetosAtivos?: number;
    atividadesHoje?: number;
    totalLogins?: number;
    notasCount?: number;
    instrucoesCount?: number;
    conversasChatNaoLidas?: number;
    comprasPendentesCount?: number;
  };
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  /** Estado retraído do menu (só afeta telas grandes — no mobile a barra é sempre exibida por
   *  inteiro, já que ali funciona como uma gaveta que abre/fecha, não uma coluna fixa). */
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  onOpenAdmissionLinkModal?: () => void;
  onOpenOccurrenceLinkModal?: () => void;
  /** Abre o modal de "Vincular Empresas"/"Alocar Equipe" do Farma Aéreo ou Farma Rodoviário —
   *  atalho suspenso abaixo do botão do módulo, o modal em si vive no App.tsx. */
  onOpenSectorLinkModal?: (setor: 'farma_aereo' | 'farma_rodoviario', mode: 'clientes' | 'colaboradores') => void;
  /** Baixa o CSV do relatório gerencial do setor — mesmo atalho suspenso abaixo do botão do módulo. */
  onExportSectorReport?: (setor: 'farma_aereo' | 'farma_rodoviario') => void;
  /** Cadastro de Operações (Farma Aéreo/Rodoviário + qualquer nova, ex.: Unimed) — define os
   *  módulos de operação exibidos aqui. */
  operacoes?: Operacao[];
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
  isCollapsed = false,
  onToggleCollapsed,
  onOpenAdmissionLinkModal,
  onOpenOccurrenceLinkModal,
  onOpenSectorLinkModal,
  onExportSectorReport,
  operacoes = [],
}) => {
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  // No mobile a barra é uma gaveta que abre por cima do conteúdo — nunca deve aparecer
  // "retraída" ali, então o recolhimento só vale de fato quando a gaveta não está aberta
  // (equivale, na prática, a "estamos em tela grande").
  const collapsed = isCollapsed && !isMobileOpen;

  // Módulos de Operação (Farma Aéreo, Farma Rodoviário, e qualquer outra cadastrada em
  // Configurações > Operações, ex.: Unimed) — gerados a partir do cadastro em vez de
  // hardcoded, pra uma operação nova aparecer aqui sozinha assim que for cadastrada e
  // ativada. As 2 originais preservam exatamente o ícone/cor/badge de sempre; qualquer
  // outra usa o que estiver no cadastro (ícone resolvido por nome, cor Tailwind salva).
  const operacoesAtivas = (operacoes || []).filter((o) => o.ativo).sort((a, b) => a.ordem - b.ordem);
  const modulosOperacoes = operacoesAtivas.map((op) => {
    if (op.id === 'farma_aereo') {
      return {
        id: 'farma_aereo' as GlobalModuleId,
        title: 'Farma Aéreo',
        short: 'AWB & TECA',
        icon: Plane,
        badge: counts.clientesFarmaAereo,
        color: 'from-sky-600 to-blue-800',
        activeBorder: 'border-sky-500',
      };
    }
    if (op.id === 'farma_rodoviario') {
      return {
        id: 'farma_rodoviario' as GlobalModuleId,
        title: 'Farma Rodoviário',
        short: 'Frota & MDF-e',
        icon: Truck,
        badge: counts.clientesFarmaRodoviario,
        color: 'from-emerald-600 to-teal-800',
        activeBorder: 'border-emerald-500',
      };
    }
    return {
      id: op.id as GlobalModuleId,
      title: op.nome,
      short: op.nomeCurto || op.nome,
      icon: resolveOperacaoIcon(op.icone),
      badge: counts.clientesPorOperacao?.[op.id] ?? 0,
      color: `${op.corDe} ${op.corAte}`,
      activeBorder: op.corBorda,
    };
  });

  // System Modules
  const globalModulesSemNumero = [
    {
      id: 'clientes' as GlobalModuleId,
      title: 'Gestão de Clientes',
      short: 'Clientes & CRM',
      icon: Building2,
      badge: counts.clientesAtivos,
      color: 'from-blue-600 to-blue-800',
      activeBorder: 'border-blue-500',
    },
    ...modulosOperacoes,
    {
      id: 'dp' as GlobalModuleId,
      title: 'Departamento Pessoal',
      short: 'RH, CLT & ASO',
      icon: Users,
      badge: counts.ativos,
      color: 'from-amber-600 to-amber-800',
      activeBorder: 'border-amber-500',
    },
    {
      id: 'projetos' as GlobalModuleId,
      title: 'Projetos Gerenciais',
      short: 'Projetos & OKRs',
      icon: FolderKanban,
      badge: counts.projetosAtivos ?? 6,
      color: 'from-purple-600 to-[#92611F]',
      activeBorder: 'border-purple-500',
    },
    {
      id: 'agenda' as GlobalModuleId,
      title: 'Agenda da Gestão',
      short: 'Governança & Comitês',
      icon: CalendarDays,
      badge: counts.atividadesHoje,
      color: 'from-[#C48229] to-[#5c4526]',
      activeBorder: 'border-[#C48229]',
    },
    {
      id: 'controladoria' as GlobalModuleId,
      title: 'Controladoria',
      short: 'DRE & Orçado x Realizado',
      icon: Calculator,
      badge: undefined,
      color: 'from-slate-700 to-slate-900',
      activeBorder: 'border-slate-500',
    },
    {
      id: 'chat' as GlobalModuleId,
      title: 'Chat Interno',
      short: 'Conversas Diretas & Grupos',
      icon: MessageSquare,
      badge: counts.conversasChatNaoLidas,
      color: 'from-sky-600 to-sky-900',
      activeBorder: 'border-sky-500',
    },
    {
      id: 'notas' as GlobalModuleId,
      title: 'Notas & Ideias',
      short: 'Anotações & Brainstorm',
      icon: NotebookPen,
      badge: counts.notasCount,
      color: 'from-teal-600 to-teal-900',
      activeBorder: 'border-teal-500',
    },
    {
      id: 'instrucoes' as GlobalModuleId,
      title: 'Instruções de Trabalho',
      short: 'Procedimentos & Checklists',
      icon: FileCheck2,
      badge: counts.instrucoesCount,
      color: 'from-[#92611F] to-[#5c4526]',
      activeBorder: 'border-[#C48229]',
    },
    {
      id: 'compras' as GlobalModuleId,
      title: 'Compras',
      short: 'Solicitações de Itens',
      icon: ShoppingCart,
      badge: counts.comprasPendentesCount,
      color: 'from-orange-600 to-orange-800',
      activeBorder: 'border-orange-500',
    },
    {
      id: 'usuarios' as GlobalModuleId,
      title: 'Logins & Acessos',
      short: 'Usuários & Permissões',
      icon: ShieldCheck,
      badge: counts.totalLogins,
      color: 'from-rose-600 to-rose-800',
      activeBorder: 'border-rose-500',
    },
  ];
  // Numeração é só cosmética (não é armazenada em lugar nenhum) — segue a ordem final da
  // lista, então uma operação nova cadastrada entra na numeração sem precisar renumerar
  // os módulos fixos à mão.
  const globalModules = globalModulesSemNumero.map((mod, idx) => ({ ...mod, number: String(idx + 1) }));

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
      badgeColor: 'bg-slate-100 text-slate-600',
      roles: ['admin', 'supervisor'],
      group: 'principal',
    },
    {
      id: 'preadmissoes',
      label: 'Pré-Admissões (Link)',
      icon: UserCheck,
      badge: counts.preAdmissoesPendentes !== undefined && counts.preAdmissoesPendentes > 0 ? counts.preAdmissoesPendentes : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 font-bold border border-amber-300 animate-pulse',
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
      badgeColor: 'bg-amber-100 text-amber-800 font-bold border border-amber-300',
      roles: ['admin', 'supervisor', 'colaborador'],
      group: 'operacional',
    },
    {
      id: 'saude',
      label: 'Exames ASO (RDC 430)',
      icon: Stethoscope,
      badge: counts.examesVencendo > 0 ? counts.examesVencendo : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 font-bold border border-rose-300 animate-pulse',
      roles: ['admin', 'supervisor'],
      group: 'operacional',
    },
    {
      id: 'epis',
      label: 'Entrega de EPI',
      icon: HardHat,
      roles: ['admin', 'supervisor'],
      group: 'operacional',
    },
    {
      id: 'onboarding',
      label: 'EPI & Checklist Admissão',
      icon: ClipboardList,
      badge: counts.onboardingPendente > 0 ? counts.onboardingPendente : undefined,
      badgeColor: 'bg-blue-100 text-blue-700 border border-blue-300',
      roles: ['admin', 'supervisor'],
      group: 'operacional',
    },
    {
      id: 'ocorrencias',
      label: 'Ocorrências & Advertências',
      icon: AlertTriangle,
      badge: counts.ocorrenciasAbertas > 0 ? counts.ocorrenciasAbertas : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300',
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

  // Restringe pelas seções de DP liberadas pro login atual (ver UsuarioLogin.secoesDpPermitidas
  // / podeVerSecaoDp) — sem restrição cadastrada, mostra tudo (comportamento de sempre).
  const dpNavItemsPermitidos = dpNavItems.filter((i) => podeVerSecaoDp(currentUser, i.id as SecaoDp));
  const principalItems = dpNavItemsPermitidos.filter((i) => i.group === 'principal');
  const operacionalItems = dpNavItemsPermitidos.filter((i) => i.group === 'operacional');
  const gestaoItems = dpNavItemsPermitidos.filter((i) => i.group === 'gestao');

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
            ? 'bg-[#C48229]/15 text-[#C48229] font-bold border border-[#C48229]/35 shadow-xs'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#C48229]' : 'text-slate-400 group-hover:text-slate-600'}`} />
          <span className="truncate min-w-0">{item.label}</span>
        </div>
        {item.badge !== undefined && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ml-1.5 ${
              item.badgeColor || 'bg-slate-100 text-slate-600'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  // Conteúdo específico de cada módulo, mostrado suspenso logo abaixo do próprio botão dele na
  // lista "Módulos Permitidos" (accordion) — antes ficava num painel à parte, mais abaixo na
  // tela, sem nenhuma ligação visual com o módulo clicado.
  const renderModuleSubNav = (moduleId: GlobalModuleId): React.ReactNode => {
    if (moduleId === 'visao_geral') {
      return (
        <div className="p-1 space-y-2.5">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold px-1">
            <span>Torre de Controle</span>
            <span className="text-[#C48229]">Visão Executiva</span>
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
                  ? 'bg-[#C48229]/15 text-[#92611F] border border-[#C48229]/40 font-bold'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-[#C48229]" />
                <span>Painel Geral Integrado</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C48229]/15 text-[#92611F] font-bold">Ativo</span>
            </button>

            <button
              id="subnav-visao-geral-agenda"
              type="button"
              onClick={() => {
                onChangeGlobalModule('agenda');
                onSelectSection('agenda_gestao');
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-[#92611F] border border-amber-200 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-400" />
                <span>Agenda da Gestão</span>
              </div>
              {counts.atividadesHoje && counts.atividadesHoje > 0 ? (
                <span className="px-1.5 py-0.5 text-[10px] bg-[#C48229]/30 text-amber-200 rounded font-bold">
                  {counts.atividadesHoje} hoje
                </span>
              ) : null}
            </button>
          </div>
        </div>
      );
    }

    if (moduleId === 'dp') {
      return (
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
            {/* Mesma restrição do botão "Formulário de Campo" dentro da tela de Ocorrências —
                acesso GERAL ao DP, não pra quem só tem a seção de Ocorrências liberada. */}
            {temAcessoGeralDp(currentUser) && (
              <button
                id="nav-item-form-publico"
                type="button"
                onClick={() => {
                  onSelectSection('formulario_publico');
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border ${
                  currentSection === 'formulario_publico'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Share2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Ocorrência em Campo</span>
                </div>
                <span className="text-[10px] text-amber-400 font-semibold">Abrir</span>
              </button>
            )}

            {temAcessoGeralDp(currentUser) && (
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left border bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Link p/ Candidato</span>
                </div>
                <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-bold">
                  Enviar
                </span>
              </button>
            )}
          </div>
        </>
      );
    }

    if (moduleId === 'clientes') {
      return (
        <div className="p-2 space-y-2">
          <div className="text-slate-700 text-xs font-bold px-1">
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
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Visualizar Todos os Clientes
            </button>
          </div>
        </div>
      );
    }

    if (moduleId === 'farma_aereo') {
      return (
        <div className="p-2 space-y-2">
          <div className="text-slate-700 text-xs font-bold px-1">
            Farma Aéreo — Gestão Executiva
          </div>
          <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
            Visão Geral & DRE, empresas atreladas, equipe do setor, faturamento e custos operacionais (Cias Aéreas, TECA e RDC 430).
          </p>
          <div className="pt-2 space-y-1.5">
            <button
              onClick={() => {
                onSelectSection('farma_aereo');
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs transition-colors"
            >
              <Plane className="w-4 h-4" />
              Abrir Painel Gerencial
            </button>
            {onOpenSectorLinkModal && (
              <button
                onClick={() => {
                  onOpenSectorLinkModal('farma_aereo', 'clientes');
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C48229]" />
                  <span>Vincular Empresas</span>
                </div>
                {counts.clientesFarmaAereo !== undefined && (
                  <span className="text-[10px] text-slate-400 font-bold">{counts.clientesFarmaAereo}</span>
                )}
              </button>
            )}
            {onOpenSectorLinkModal && (
              <button
                onClick={() => {
                  onOpenSectorLinkModal('farma_aereo', 'colaboradores');
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C48229]" />
                  <span>Alocar Equipe</span>
                </div>
                {counts.headcountFarmaAereo !== undefined && (
                  <span className="text-[10px] text-slate-400 font-bold">{counts.headcountFarmaAereo}</span>
                )}
              </button>
            )}
            {onExportSectorReport && (
              <button
                onClick={() => {
                  onExportSectorReport('farma_aereo');
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4 text-[#C48229]" />
                <span>Relatório Gerencial</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    if (moduleId === 'farma_rodoviario') {
      return (
        <div className="p-2 space-y-2">
          <div className="text-slate-700 text-xs font-bold px-1">
            Farma Rodoviário — Gestão Executiva
          </div>
          <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
            Visão Geral & DRE, empresas atreladas, equipe do setor, faturamento e custos operacionais (Diesel S10, manutenção de refrigeração e pedágios).
          </p>
          <div className="pt-2 space-y-1.5">
            <button
              onClick={() => {
                onSelectSection('farma_rodoviario');
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs transition-colors"
            >
              <Truck className="w-4 h-4" />
              Abrir Painel Gerencial
            </button>
            {onOpenSectorLinkModal && (
              <button
                onClick={() => {
                  onOpenSectorLinkModal('farma_rodoviario', 'clientes');
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C48229]" />
                  <span>Vincular Empresas</span>
                </div>
                {counts.clientesFarmaRodoviario !== undefined && (
                  <span className="text-[10px] text-slate-400 font-bold">{counts.clientesFarmaRodoviario}</span>
                )}
              </button>
            )}
            {onOpenSectorLinkModal && (
              <button
                onClick={() => {
                  onOpenSectorLinkModal('farma_rodoviario', 'colaboradores');
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C48229]" />
                  <span>Alocar Equipe</span>
                </div>
                {counts.headcountFarmaRodoviario !== undefined && (
                  <span className="text-[10px] text-slate-400 font-bold">{counts.headcountFarmaRodoviario}</span>
                )}
              </button>
            )}
            {onExportSectorReport && (
              <button
                onClick={() => {
                  onExportSectorReport('farma_rodoviario');
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4 text-[#C48229]" />
                <span>Relatório Gerencial</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    if (moduleId === 'usuarios') {
      return (
        <div className="p-2 space-y-2">
          <div className="flex items-center justify-between text-slate-700 text-xs font-bold px-1">
            <span>Controle de Acessos</span>
            <span className="text-[#C48229] text-[10px]">Segurança</span>
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
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs transition-colors"
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-[#C48229]" />
                  <span>Trocar Usuário Atual</span>
                </div>
              </button>
            )}
          </div>
        </div>
      );
    }

    if (moduleId === 'agenda') {
      return (
        <div className="p-2 space-y-2">
          <div className="text-slate-700 text-xs font-bold px-1">
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
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs transition-colors"
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
      );
    }

    if (moduleId === 'notas') {
      return (
        <div className="p-2 space-y-2">
          <div className="text-slate-700 text-xs font-bold px-1">
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
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs transition-colors"
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
      );
    }

    if (moduleId === 'instrucoes') {
      return (
        <div className="p-2 space-y-2">
          <div className="text-slate-700 text-xs font-bold px-1">
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
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs transition-colors"
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
      );
    }

    if (moduleId === 'projetos') {
      return (
        <div className="p-2 space-y-2">
          <div className="text-slate-700 text-xs font-bold px-1">
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
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C48229] text-white shadow-xs hover:bg-[#92611F] transition-colors"
            >
              <FolderKanban className="w-4 h-4" />
              Painel de Projetos & OKRs
            </button>
          </div>
        </div>
      );
    }

    // Módulos sem sub-navegação própria (ex.: Controladoria, Chat Interno) — o botão já leva
    // direto pra tela, não precisa de suspenso.
    return null;
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
        className={`fixed top-0 left-0 bottom-0 z-50 bg-white text-slate-700 flex flex-col border-r border-slate-200 transition-[transform,width] duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-72 lg:w-[76px]' : 'w-72'}`}
      >
        {/* Botão de recolher/expandir — só em telas grandes; no mobile a gaveta some pelo
            próprio backdrop/hambúrguer, não precisa desse controle. */}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden lg:flex absolute -right-3 top-7 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md items-center justify-center text-slate-400 hover:text-[#C48229] hover:border-[#C48229]/50 transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Brand Header with Official JMT Logo */}
        <div className="p-4 border-b border-slate-100 bg-white relative overflow-hidden shrink-0">
          {/* Subtle brand diagonal accent light */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#C48229]/5 rounded-full blur-2xl pointer-events-none" />

          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {collapsed ? (
              <JmtLogo variant="icon" theme="light" iconSize={30} />
            ) : (
              <JmtLogo variant="full" theme="light" iconSize={48} />
            )}
          </div>

          {!collapsed && (
            <>
              {/* Slogan & Official Strategic Signature */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold tracking-[0.16em] text-[#C48229] uppercase">
                    Logística da Saúde
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#C48229]" />
                    RDC 430 / BPAD
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 font-medium leading-tight">
                  Segurança, Rastreabilidade e Pontualidade
                </p>
              </div>

              {/* Route accent line from brand manual */}
              <div className="mt-2 h-[2px] w-full bg-gradient-to-r from-[#C48229] via-[#92611F] to-transparent rounded-full" />
            </>
          )}
        </div>

        {/* Unified Scrollable Container: Ensures all navigation, modules, and dashboard buttons scroll smoothly without overlapping or covering text */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 divide-y divide-slate-100">
          {/* PRIMARY MODULE SELECTORS + DASHBOARD GERAL */}
          <div className={`p-3 bg-slate-50 space-y-2 shrink-0 ${collapsed ? 'px-2' : ''}`}>
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
                title={collapsed ? 'Dashboard Geral' : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-150 border ${
                  collapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2.5 text-left'
                } ${
                  activeGlobalModule === 'visao_geral' || currentSection === 'visao_geral'
                    ? 'bg-amber-50 border-[#C48229] shadow-sm ring-1 ring-[#C48229]/40 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                }`}
              >
                {collapsed ? (
                  <div className={`p-1.5 rounded-lg shrink-0 ${activeGlobalModule === 'visao_geral' ? 'bg-[#C48229] text-white' : 'bg-slate-100 text-[#C48229]'}`}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`p-1.5 rounded-lg shrink-0 ${activeGlobalModule === 'visao_geral' ? 'bg-[#C48229] text-white' : 'bg-slate-100 text-[#C48229]'}`}>
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="leading-tight">Dashboard Geral</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#C48229]/15 text-[#92611F] border border-[#C48229]/40 font-extrabold uppercase shrink-0">Geral</span>
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">Todos os Módulos & KPIs</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                  </>
                )}
              </button>
            )}
            {!collapsed && canAccessVisaoGeral && (activeGlobalModule === 'visao_geral' || currentSection === 'visao_geral') && (
              <div className="pl-3 ml-3 border-l-2 border-[#C48229]/30 space-y-1">
                {renderModuleSubNav('visao_geral')}
              </div>
            )}

            {!collapsed && (
              <div className="flex items-center justify-between px-1 pt-1 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Módulos Permitidos
                </span>
                <span className="text-[10px] text-[#C48229] font-semibold">
                  {accessibleGlobalModules.length} de {globalModules.length}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-1.5">
              {accessibleGlobalModules.map((mod) => {
                const isModActive = activeGlobalModule === mod.id;
                const Icon = mod.icon;

                return (
                  <React.Fragment key={mod.id}>
                  <button
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
                        // Não assume 'dashboard' fixo — quem tem DP restrito sem essa seção
                        // liberada cairia numa tela em branco (ver primeiraSecaoDpPermitida).
                        onSelectSection(primeiraSecaoDpPermitida(currentUser));
                      }
                      onCloseMobile();
                    }}
                    title={collapsed ? mod.title : undefined}
                    className={`w-full flex items-center rounded-xl transition-all duration-150 border ${
                      collapsed ? 'justify-center py-2' : 'justify-between px-2.5 py-2 text-left'
                    } ${
                      isModActive
                        ? 'bg-amber-50 border-[#C48229] text-amber-900 shadow-sm ring-1 ring-[#C48229]/40'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {collapsed ? (
                      <div className="relative">
                        <Icon className={`w-5 h-5 ${isModActive ? 'text-[#C48229]' : 'text-slate-400'}`} />
                        {mod.badge !== undefined && mod.badge > 0 && (
                          <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#C48229] text-white text-[8px] font-extrabold flex items-center justify-center leading-none shadow-xs">
                            {mod.badge > 9 ? '9+' : mod.badge}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                              isModActive
                                ? 'bg-[#C48229] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {mod.number}
                          </span>
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isModActive ? 'text-[#C48229]' : 'text-slate-400'
                            }`}
                          />
                          <span className="font-semibold text-xs text-slate-900 min-w-0 leading-tight">
                            {mod.title}
                          </span>
                        </div>

                        {mod.badge !== undefined && mod.badge > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ml-1.5 ${
                              isModActive
                                ? 'bg-[#C48229]/15 text-[#92611F] border border-[#C48229]/40'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {mod.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                  {!collapsed && isModActive && (
                    <div className="pl-3 ml-3 border-l-2 border-[#C48229]/30 space-y-1 mt-1">
                      {renderModuleSubNav(mod.id)}
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* User Session & Login Box (Replaces old Perfil de Acesso switcher) — escondida
              quando recolhido, não cabe nesse espaço; o rodapé abaixo já mostra quem está
              logado, mesmo retraído. */}
          {!collapsed && currentUser && (
            <div className="px-3.5 py-2.5 bg-slate-50 border-t border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C48229] to-[#92611F] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {currentUser.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.nome}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-mono">
                      <span>@{currentUser.login}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[#C48229] font-sans font-semibold">
                        {currentUser.modulosPermitidos.length} mód.
                      </span>
                    </div>
                  </div>
                </div>

                {onOpenSwitchUserModal && (
                  <button
                    type="button"
                    onClick={onOpenSwitchUserModal}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-[#C48229] hover:text-white text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 transition-all shrink-0 flex items-center gap-1"
                    title="Alternar entre contas cadastradas"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Trocar</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Strategic Guidelines Shortcut */}
        {!collapsed && (
          <div className="px-3 pt-2.5 pb-1 bg-slate-50 border-t border-slate-100 shrink-0">
            <button
              id="btn-sidebar-norteadores"
              type="button"
              onClick={() => setIsGuidelinesOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#C48229]/40 transition-colors"
              title="Ver Missão, Visão e Valores da JMT"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[#C48229]" />
                <span className="text-[11px] font-semibold">Norteadores Estratégicos</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#C48229]/15 text-[#92611F] font-bold">JMT</span>
            </button>
          </div>
        )}

        {/* User Profile Footer */}
        <div className={`border-t border-slate-100 bg-white shrink-0 ${collapsed ? 'p-2.5' : 'p-3.5'}`}>
          <div className={`flex items-center px-1 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {collapsed ? (
              <div
                className="relative w-8 h-8 rounded-lg bg-amber-50 border border-[#C48229]/40 flex items-center justify-center font-bold text-xs text-[#C48229] shadow-xs shrink-0"
                title={currentUser ? `${currentUser.nome} · ${currentUser.cargo}` : 'Jadson Moraes · Diretoria Executiva'}
              >
                {currentUser ? currentUser.nome.substring(0, 2).toUpperCase() : 'JM'}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-[#C48229]/40 flex items-center justify-center font-bold text-xs text-[#C48229] shadow-xs shrink-0">
                    {currentUser ? currentUser.nome.substring(0, 2).toUpperCase() : 'JM'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-900 font-bold leading-tight truncate">
                      {currentUser ? currentUser.nome : 'Jadson Moraes'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {currentUser ? currentUser.cargo : 'Diretoria Executiva'}
                    </p>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-500/40 shrink-0" title="JMT Conectado · RDC 430/2020" />
              </>
            )}
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
