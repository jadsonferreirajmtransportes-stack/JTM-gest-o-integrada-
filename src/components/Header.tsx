import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  AlertTriangle,
  Stethoscope,
  Calendar,
  FileWarning,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { AlertaItem, UserRole, UsuarioLogin } from '../types';
import { NavSection } from './Sidebar';
import { JmtLogo } from './Brand/JmtLogo';

interface HeaderProps {
  onOpenMobile: () => void;
  currentSection: NavSection;
  userRole?: UserRole;
  currentUser?: UsuarioLogin;
  onOpenSwitchUserModal?: () => void;
  alertas: AlertaItem[];
  onOpenNovoColaborador?: () => void;
  onOpenNovaOcorrencia?: () => void;
  onOpenAdmissionLink?: () => void;
  onSelectSection: (section: NavSection) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onResetDatabase: () => void;
  atividadesHojeCount?: number;
}

const SECTION_TITLES: Record<NavSection, { title: string; subtitle: string }> = {
  visao_geral: {
    title: 'Torre de Controle — Dashboard Geral Integrado',
    subtitle: 'Segurança, rastreabilidade e pontualidade na logística da saúde • Gestão por indicadores',
  },
  dashboard: {
    title: 'Painel de Controle — Departamento Pessoal',
    subtitle: 'Processos padronizados, gestão por indicadores e conformidade ANVISA/BPAD',
  },
  colaboradores: {
    title: 'Gestão de Colaboradores',
    subtitle: 'Cadastro centralizado de dados pessoais, contratuais, bancários e EPIs',
  },
  clientes: {
    title: 'Carteira de Clientes & Contratos',
    subtitle: 'Foco no cliente e conduta íntegra • Operações farmacêuticas RDC 430 e tabelas tarifárias',
  },
  farma_aereo: {
    title: 'Operações Farma Aéreo',
    subtitle: 'AWB em tempo real, monitoramento térmico ponta a ponta e conformidade ANVISA/BPAD',
  },
  farma_rodoviario: {
    title: 'Operações Farma Rodoviário',
    subtitle: 'Frotas refrigeradas, telemetria de baú e entregas seguras, rastreáveis e pontuais',
  },
  projetos: {
    title: 'Projetos Gerenciais & OKRs',
    subtitle: 'Melhoria contínua e inovação • Iniciativas estratégicas para excelência na logística da saúde',
  },
  usuarios: {
    title: 'Gestão de Logins & Permissões de Módulos',
    subtitle: 'Controle de segurança corporativa • Definição granular de acessos aos módulos da JMT',
  },
  agenda_gestao: {
    title: 'Agenda de Atividades da Gestão',
    subtitle: 'Reuniões executivas, comitês operacionais, auditorias RDC 430, fechamentos e prazos estratégicos',
  },
  controladoria: {
    title: 'Controladoria',
    subtitle: 'DRE Gerencial, margem de contribuição, ponto de equilíbrio e Orçado x Realizado por setor',
  },
  chat: {
    title: 'Chat Interno',
    subtitle: 'Conversas diretas e em grupo entre os logins cadastrados no sistema',
  },
  notas: {
    title: 'Notas & Ideias',
    subtitle: 'Páginas livres de anotações e brainstorm, estilo Notion, com vínculo a outros módulos da JMT',
  },
  instrucoes: {
    title: 'Instruções de Trabalho',
    subtitle: 'Procedimentos operacionais padronizados por operação, com código, versão e vínculo a registros da JMT',
  },
  preadmissoes: {
    title: 'Portal de Pré-Admissões & Auto-Cadastro',
    subtitle: 'Fichas cadastrais preenchidas pelos novos colaboradores via link digital',
  },
  custos: {
    title: 'Custo Mensal por Colaborador',
    subtitle: 'Demonstrativo e consolidação financeira da folha e benefícios (2.11)',
  },
  saude: {
    title: 'Saúde do Trabalhador & ANVISA',
    subtitle: 'Rastreabilidade de ASOs, exames periódicos e conformidade RDC 430',
  },
  epis: {
    title: 'Entrega de EPI',
    subtitle: 'Registro escrito de entrega e troca de Equipamento de Proteção Individual — conformidade NR-6',
  },
  ferias: {
    title: 'Programação de Férias CLT',
    subtitle: 'Controle de períodos aquisitivos, limite de 11 meses e emissão de avisos',
  },
  beneficios: {
    title: 'Gestão de Benefícios (VA & VT)',
    subtitle: 'Programação de Vale-Alimentação e Vale-Transporte por quinzena e setor',
  },
  vale_alimentacao: {
    title: 'Programação do Vale Alimentação',
    subtitle: 'Quinzenas do ano e lançamentos por colaborador, com diárias calculadas automaticamente',
  },
  onboarding: {
    title: 'Onboarding & Checklist de Admissão',
    subtitle: 'Apresentação dos Norteadores Estratégicos JMT, treinamento RDC 430 e entrega de EPIs',
  },
  ocorrencias: {
    title: 'Registro de Ocorrências',
    subtitle: 'Gestão disciplinar, ética e transparência, advertências e elogios operacionais',
  },
  arquivo: {
    title: 'Arquivo de Ativos e Demitidos',
    subtitle: 'Histórico auditável de colaboradores desligados e motivos de rescisão',
  },
  aniversariantes: {
    title: 'Aniversariantes do Mês',
    subtitle: 'Próximos aniversários para celebração e integração corporativa',
  },
  cargos: {
    title: 'Cargos e Salários',
    subtitle: 'Tabela de referência salarial e enquadramento CBO para o setor farmacêutico',
  },
  supervisores: {
    title: 'Supervisores e Lideranças',
    subtitle: 'Autonomia com responsabilidade: lideranças responsáveis por setores e aprovações',
  },
  formulario_publico: {
    title: 'Formulário Público de Ocorrências',
    subtitle: 'Comunicação e respeito: canal direto para supervisores em campo e conformidade',
  },
  formulario_admissao: {
    title: 'Portal do Candidato — Admissão Digital',
    subtitle: 'Levar saúde com segurança, do remetente ao destino final • Jobson de Moraes Transportes',
  },
};

export const Header: React.FC<HeaderProps> = ({
  onOpenMobile,
  currentSection,
  userRole,
  currentUser,
  onOpenSwitchUserModal,
  alertas,
  onSelectSection,
  searchQuery,
  onSearchChange,
  onExportBackup,
  onImportBackup,
  onResetDatabase,
}) => {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);
  const dbMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setIsAlertsOpen(false);
      }
      if (dbMenuRef.current && !dbMenuRef.current.contains(event.target as Node)) {
        setIsDbMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentInfo = SECTION_TITLES[currentSection] || {
    title: 'Painel de Controle — Departamento Pessoal',
    subtitle: 'Levar saúde com segurança, do remetente ao destino final • JMT',
  };

  const urgentCount = alertas.filter((a) => a.nivel === 'urgente').length;
  const totalAlertCount = alertas.length;

  return (
    <header
      id="jmt-main-header"
      className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0"
    >
      {/* Left Section: Mobile toggle & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="mobile-menu-toggle-btn"
          type="button"
          onClick={onOpenMobile}
          className="p-1.5 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-hidden"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile-only brand badge */}
        <div className="lg:hidden shrink-0 flex items-center pr-1 border-r border-slate-200">
          <JmtLogo variant="icon" iconSize={26} />
        </div>

        <div className="truncate">
          <h1 className="text-base sm:text-lg font-bold text-[#111111] leading-tight truncate tracking-tight">
            {currentInfo.title}
          </h1>
          <p className="hidden md:block text-[11px] text-[#6E6A62] truncate">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center/Right Section: Search & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Search */}
        <div className="relative hidden md:flex items-center bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200 w-56 lg:w-72">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            id="global-search-input"
            type="text"
            data-no-uppercase="true"
            placeholder="Buscar colaborador..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden"
          />
          <kbd className="text-[10px] bg-white border border-slate-200 px-1 py-0.2 rounded font-mono text-slate-400 shrink-0 ml-1 shadow-2xs">
            ⌘K
          </kbd>
        </div>

        {/* Database Actions Dropdown */}
        <div className="relative" ref={dbMenuRef}>
          <button
            id="database-menu-btn"
            type="button"
            onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
            className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Opções de Backup e Dados"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline text-slate-700">Backup</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isDbMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 font-semibold text-slate-700">
                Gerenciamento da Base (JMT)
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDbMenuOpen(false);
                  onExportBackup();
                }}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-[#B38F4F]" />
                <span>Exportar Backup (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDbMenuOpen(false);
                  onImportBackup();
                }}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4 text-[#28464E]" />
                <span>Importar Backup (JSON)</span>
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                type="button"
                onClick={() => {
                  setIsDbMenuOpen(false);
                  onResetDatabase();
                }}
                className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Restaurar Base Padrão</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications / Alerts Tray */}
        <div className="relative" ref={alertsRef}>
          <button
            id="alerts-tray-btn"
            type="button"
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className={`relative p-2 rounded-lg border transition-colors ${
              urgentCount > 0
                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
            title="Alertas Regulatórios e Prazos"
          >
            <Bell className="w-4 h-4" />
            {totalAlertCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white ${
                  urgentCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-[#B38F4F]'
                }`}
              >
                {totalAlertCount}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="font-bold text-[#111111] text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#B38F4F]" />
                  <span>Alertas Regulatórios ({totalAlertCount})</span>
                </div>
                {urgentCount > 0 && (
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                    {urgentCount} Crítico{urgentCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {alertas.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    Todos os exames, prazos de férias e documentos estão em dia!
                  </div>
                ) : (
                  alertas.map((alerta) => (
                    <div
                      key={alerta.id}
                      className={`p-3 text-xs hover:bg-slate-50 transition-colors flex gap-2.5 ${
                        alerta.nivel === 'urgente' ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {alerta.tipo === 'exame' && (
                          <Stethoscope className="w-4 h-4 text-rose-600" />
                        )}
                        {alerta.tipo === 'ferias' && (
                          <Calendar className="w-4 h-4 text-[#B38F4F]" />
                        )}
                        {alerta.tipo === 'documento' && (
                          <FileWarning className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span className="truncate">{alerta.titulo}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                              alerta.nivel === 'urgente'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-[#F4EEE1] text-[#8A6A39] border border-[#B38F4F]/30'
                            }`}
                          >
                            {alerta.diasRestantes !== undefined
                              ? alerta.diasRestantes < 0
                                ? 'Vencido'
                                : `${alerta.diasRestantes}d`
                              : '!'}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5 leading-snug">{alerta.descricao}</p>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          Colaborador: {alerta.colaboradorNome}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsAlertsOpen(false);
                    onSelectSection('saude');
                  }}
                  className="text-xs font-semibold text-[#8A6A39] hover:text-[#B38F4F]"
                >
                  Ver Relatório Completo de Conformidade RDC 430 &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Session Quick Badge & Fast Switcher */}
        {currentUser && (
          <button
            type="button"
            onClick={onOpenSwitchUserModal}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#B38F4F]/60 transition-all text-left shadow-2xs group"
            title="Clique para alternar o usuário conectado ou gerenciar logins"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#B38F4F] to-[#8A6A39] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {currentUser.nome.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser.nome.split(' ')[0]}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight font-mono">
                @{currentUser.login}
              </div>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
