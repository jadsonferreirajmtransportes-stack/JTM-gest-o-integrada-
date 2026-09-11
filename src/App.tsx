import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Colaborador,
  Empregador,
  Supervisor,
  CargoSalario,
  FeriadoEmpresa,
  ProgramacaoFerias,
  Ocorrencia,
  AlertaItem,
  UserRole,
  MotivoDemissao,
  StatusFerias,
  PreAdmissao,
  StatusPreAdmissao,
  Cliente,
  GlobalModuleId,
  EmbarqueAereo,
  ViagemRodoviaria,
  ProjetoGerencial,
  StatusProjeto,
  AtividadeGestao,
  StatusAtividadeGestao,
  ItemDeliberacaoAta,
  CustoOperacional,
  UsuarioLogin,
  NotaPagina,
  InstrucaoTrabalho,
  LancamentoFaturamentoAereo,
  FaturaAereo,
  QuinzenaValeAlimentacao,
  LancamentoValeAlimentacao,
} from './types';
import {
  getPreAdmissoes,
  getPreAdmissaoById,
  savePreAdmissao,
  updatePreAdmissaoStatus,
  deletePreAdmissao,
  getViagensRodoviarias,
  saveViagemRodoviaria,
  deleteViagemRodoviaria,
  getCustosOperacionais,
  saveCustoOperacional,
  deleteCustoOperacional,
  getProjetosGerenciais,
  saveProjetoGerencial,
  deleteProjetoGerencial,
  updateProjetoStatus,
  getAtividadesGestao,
  saveAtividadeGestao,
  deleteAtividadeGestao,
  updateAtividadeStatus,
  getNotasPaginas,
  saveNotaPagina,
  deleteNotaPagina,
  getInstrucoesTrabalho,
  saveInstrucaoTrabalho,
  deleteInstrucaoTrabalho,
  getStoredGlobalModule,
  saveStoredGlobalModule,
  exportDatabaseJSON,
  importDatabaseJSON,
  resetDatabaseToDefault,
  NOTIFICATION_EVENT,
} from './utils/storage';
// Departamento Pessoal já migrado para o Supabase (banco em nuvem) — estas 9 entidades não
// vêm mais do localStorage. Ver src/utils/dpApi.ts.
import {
  getColaboradores,
  saveColaborador,
  deleteColaborador,
  inativarColaborador,
  getEmpregadores,
  saveEmpregador,
  getSupervisores,
  saveSupervisor,
  getCargos,
  saveCargo,
  getFeriados,
  saveFeriado,
  getFerias,
  saveFerias,
  updateStatusFerias,
  getOcorrencias,
  saveOcorrencia,
  updateOnboardingItem,
  renovarExameASO,
  efetivarPreAdmissao,
  getQuinzenasValeAlimentacao,
  saveQuinzenaValeAlimentacao,
  deleteQuinzenaValeAlimentacao,
  getLancamentosValeAlimentacao,
  saveLancamentosValeAlimentacao,
  saveLancamentoValeAlimentacao,
  deleteLancamentoValeAlimentacao,
} from './utils/dpApi';
// Carteira de Clientes + Farma Aéreo também já migrados para o Supabase — ver
// src/utils/farmaAereoApi.ts.
import {
  getClientes,
  saveCliente,
  deleteCliente,
  getEmbarquesAereos,
  saveEmbarqueAereo,
  deleteEmbarqueAereo,
  getLancamentosFaturamentoAereo,
  saveLancamentoFaturamentoAereo,
  deleteLancamentoFaturamentoAereo,
  importLancamentosFaturamentoAereo,
  getFaturasAereo,
  saveFaturaAereo,
  deleteFaturaAereo,
  importFaturasAereo,
} from './utils/farmaAereoApi';
import {
  calcExamStatus,
  calcDaysRemaining,
  calcQuantidadeDiariasVA,
  calcValorDisponibilizadoVA,
  calcFaltasEmPeriodo,
  calcDiasFeriasEmPeriodo,
} from './utils/formatters';

// Layout & Core Navigation
import { Sidebar, NavSection } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';

// Module 1: Clientes
import { ClientsView } from './components/Clients/ClientsView';

// Module 2: Farma Aéreo
import { FarmaAereoView } from './components/FarmaAereo/FarmaAereoView';

// Module 3: Farma Rodoviário
import { FarmaRodoviarioView } from './components/FarmaRodoviario/FarmaRodoviarioView';

// Module 5: Projetos Gerenciais
import { ProjetosView } from './components/Projetos/ProjetosView';

// Module 4: Departamento Pessoal
import { EmployeeList } from './components/Employees/EmployeeList';
import { EmployeeFormModal } from './components/Employees/EmployeeFormModal';
import { EmployeeDetailModal } from './components/Employees/EmployeeDetailModal';
import { DismissalModal } from './components/Employees/DismissalModal';
import { MonthlyCostView } from './components/Cost/MonthlyCostView';
import { VacationView } from './components/Vacation/VacationView';
import { ValeAlimentacaoView } from './components/Vacation/ValeAlimentacaoView';
import { OccurrencesView } from './components/Occurrences/OccurrencesView';
import { PublicOccurrenceForm } from './components/Occurrences/PublicOccurrenceForm';
import { PublicOccurrencePortal } from './components/Occurrences/PublicOccurrencePortal';
import { PublicInstrucaoForm } from './components/Instrucoes/PublicInstrucaoForm';
import { OccurrenceLinkModal } from './components/Occurrences/OccurrenceLinkModal';
import { AnvisaExamsView } from './components/Health/AnvisaExamsView';
import { OnboardingView } from './components/Onboarding/OnboardingView';
import { SettingsView } from './components/Settings/SettingsView';
import { BirthdaysView } from './components/Birthdays/BirthdaysView';
import { CandidateAdmissionPortal } from './components/Admission/CandidateAdmissionPortal';
import { AdmissionLinkModal } from './components/Admission/AdmissionLinkModal';
import { PreAdmissionsManagerView } from './components/Admission/PreAdmissionsManagerView';
import { AgendaGestaoView } from './components/Agenda/AgendaGestaoView';
import { atividadeOcorreEm } from './components/Agenda/agendaUtils';
import { NotasView } from './components/Notas/NotasView';
import { InstrucoesTrabalhoView } from './components/Instrucoes/InstrucoesTrabalhoView';
import { GeneralDashboard } from './components/DashboardGeral/GeneralDashboard';
import { CustoOperacionalFormModal } from './components/Cost/CustoOperacionalFormModal';

// Module 6: Logins & Acessos
import { UsuariosView } from './components/Usuarios/UsuariosView';
import { SwitchUserModal } from './components/Usuarios/SwitchUserModal';
import { UsuarioFormModal } from './components/Usuarios/UsuarioFormModal';
import { INITIAL_USERS_DATA } from './data/initialUsersData';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  // Primary Pages / Modules State
  const [activeGlobalModule, setActiveGlobalModule] = useState<GlobalModuleId>(() => getStoredGlobalModule());

  // Navigation Sub-Section State
  const [activeSection, setActiveSection] = useState<NavSection>(() => {
    const initialMod = getStoredGlobalModule();
    if (initialMod === 'visao_geral') return 'visao_geral';
    if (initialMod === 'clientes') return 'clientes';
    if (initialMod === 'farma_aereo') return 'farma_aereo';
    if (initialMod === 'farma_rodoviario') return 'farma_rodoviario';
    if (initialMod === 'projetos') return 'projetos';
    if (initialMod === 'usuarios') return 'usuarios';
    return 'dashboard';
  });
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Users & Permissions Management (Replaces old fixed role system)
  const [users, setUsers] = useState<UsuarioLogin[]>(() => {
    try {
      const saved = localStorage.getItem('jmt_usuarios_logins');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading users from storage', e);
    }
    return INITIAL_USERS_DATA;
  });

  const [currentUser, setCurrentUser] = useState<UsuarioLogin>(() => {
    try {
      const savedId = localStorage.getItem('jmt_current_user_id');
      const storedUsers = (() => {
        try {
          const s = localStorage.getItem('jmt_usuarios_logins');
          return s ? JSON.parse(s) : INITIAL_USERS_DATA;
        } catch {
          return INITIAL_USERS_DATA;
        }
      })();
      if (savedId) {
        const found = storedUsers.find((u: UsuarioLogin) => u.id === savedId);
        if (found) return found;
      }
      return storedUsers[0] || INITIAL_USERS_DATA[0];
    } catch (e) {
      console.error('Error loading active user session', e);
    }
    return INITIAL_USERS_DATA[0];
  });

  // Sync users to persistent storage
  useEffect(() => {
    try {
      localStorage.setItem('jmt_usuarios_logins', JSON.stringify(users));
    } catch (e) {
      console.error('Failed to persist users', e);
    }
  }, [users]);

  // User Modals State
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState<boolean>(false);
  const [isUserFormModalOpen, setIsUserFormModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UsuarioLogin | null>(null);

  // Entities Data State
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [empregadores, setEmpregadores] = useState<Empregador[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [cargos, setCargos] = useState<CargoSalario[]>([]);
  const [feriados, setFeriados] = useState<FeriadoEmpresa[]>([]);
  const [feriasList, setFeriasList] = useState<ProgramacaoFerias[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [quinzenasVA, setQuinzenasVA] = useState<QuinzenaValeAlimentacao[]>([]);
  const [lancamentosVA, setLancamentosVA] = useState<LancamentoValeAlimentacao[]>([]);
  const [preAdmissoes, setPreAdmissoes] = useState<PreAdmissao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [embarquesAereos, setEmbarquesAereos] = useState<EmbarqueAereo[]>([]);
  const [lancamentosFaturamentoAereo, setLancamentosFaturamentoAereo] = useState<LancamentoFaturamentoAereo[]>([]);
  const [faturasAereo, setFaturasAereo] = useState<FaturaAereo[]>([]);
  const [viagensRodoviarias, setViagensRodoviarias] = useState<ViagemRodoviaria[]>([]);
  const [projetos, setProjetos] = useState<ProjetoGerencial[]>([]);
  const [atividadesGestao, setAtividadesGestao] = useState<AtividadeGestao[]>([]);
  const [notasPaginas, setNotasPaginas] = useState<NotaPagina[]>([]);
  const [instrucoesTrabalho, setInstrucoesTrabalho] = useState<InstrucaoTrabalho[]>([]);
  const [custosOperacionais, setCustosOperacionais] = useState<CustoOperacional[]>([]);

  // Public candidate self-service mode (via ?form=admissao or direct testing)
  const [isCandidatePortalView, setIsCandidatePortalView] = useState<boolean>(false);
  const [candidateUrlParams, setCandidateUrlParams] = useState<{
    empresa?: string;
    cargo?: string;
    token?: string;
  }>({});

  // Public supervisor occurrence portal mode (via ?form=ocorrencia or direct testing)
  const [isOccurrencePortalView, setIsOccurrencePortalView] = useState<boolean>(false);
  const [occurrenceUrlParams, setOccurrenceUrlParams] = useState<{
    empresa?: string;
    supervisor?: string;
  }>({});

  // Public work-instruction (Instrução de Trabalho) filling portal — via ?form=instrucao&id=...
  const [isInstrucaoPortalView, setIsInstrucaoPortalView] = useState<boolean>(false);
  const [instrucaoUrlParams, setInstrucaoUrlParams] = useState<{ id?: string }>({});

  // Modals State
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState<boolean>(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [selectedColaboradorDetail, setSelectedColaboradorDetail] = useState<Colaborador | null>(null);
  const [dismissalTargetColaborador, setDismissalTargetColaborador] = useState<Colaborador | null>(null);
  const [isPublicOccurrenceFormOpen, setIsPublicOccurrenceFormOpen] = useState<boolean>(false);
  const [isAdmissionLinkModalOpen, setIsAdmissionLinkModalOpen] = useState<boolean>(false);
  const [isOccurrenceLinkModalOpen, setIsOccurrenceLinkModalOpen] = useState<boolean>(false);
  const [isCustoOperacionalModalOpen, setIsCustoOperacionalModalOpen] = useState<boolean>(false);
  const [selectedCustoEdit, setSelectedCustoEdit] = useState<CustoOperacional | null>(null);

  // Toast message state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch Global Module
  const handleSelectGlobalModule = (modId: GlobalModuleId) => {
    setActiveGlobalModule(modId);
    saveStoredGlobalModule(modId);

    if (modId === 'visao_geral') {
      setActiveSection('visao_geral');
    } else if (modId === 'clientes') {
      setActiveSection('clientes');
    } else if (modId === 'farma_aereo') {
      setActiveSection('farma_aereo');
    } else if (modId === 'farma_rodoviario') {
      setActiveSection('farma_rodoviario');
    } else if (modId === 'projetos') {
      setActiveSection('projetos');
    } else if (modId === 'agenda') {
      setActiveSection('agenda_gestao');
    } else if (modId === 'notas') {
      setActiveSection('notas');
    } else if (modId === 'usuarios') {
      setActiveSection('usuarios');
    } else if (modId === 'dp') {
      if (
        ['visao_geral', 'clientes', 'farma_aereo', 'farma_rodoviario', 'projetos', 'agenda_gestao', 'notas', 'usuarios'].includes(
          activeSection
        )
      ) {
        setActiveSection('dashboard');
      }
    }
  };

  // User Session & CRUD Handlers
  const handleSelectUserSession = (user: UsuarioLogin) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('jmt_current_user_id', user.id);
    } catch {}

    // Check if the current module is allowed for the newly selected user
    if (!user.modulosPermitidos.includes(activeGlobalModule)) {
      const fallbackModule = user.modulosPermitidos[0] || 'visao_geral';
      handleSelectGlobalModule(fallbackModule);
    }
    showToast(`Conectado como ${user.nome} (@${user.login})`, 'success');
  };

  const handleSaveUser = (userToSave: UsuarioLogin) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === userToSave.id);
      if (exists) {
        return prev.map((u) => (u.id === userToSave.id ? userToSave : u));
      }
      return [userToSave, ...prev];
    });

    if (userToSave.id === currentUser.id) {
      setCurrentUser(userToSave);
    }
    showToast(`Usuário @${userToSave.login} salvo com sucesso!`, 'success');
  };

  const handleDeleteUser = (userId: string) => {
    if (users.length <= 1) {
      showToast('O sistema precisa manter ao menos um login cadastrado.', 'error');
      return;
    }
    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    if (currentUser.id === userId) {
      const fallback = users.find((u) => u.id !== userId) || INITIAL_USERS_DATA[0];
      setCurrentUser(fallback);
      try {
        localStorage.setItem('jmt_current_user_id', fallback.id);
      } catch {}
    }
    showToast(`Usuário @${targetUser?.login || userId} excluído.`, 'info');
  };

  const handleToggleUserModuleAccess = (userId: string, moduleId: GlobalModuleId) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const hasMod = u.modulosPermitidos.includes(moduleId);
        const newMods = hasMod
          ? u.modulosPermitidos.filter((m) => m !== moduleId)
          : [...u.modulosPermitidos, moduleId];
        const updated = { ...u, modulosPermitidos: newMods };
        if (u.id === currentUser.id) {
          setCurrentUser(updated);
        }
        return updated;
      })
    );
    showToast('Permissão de módulo atualizada com sucesso!', 'success');
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setIsUserFormModalOpen(true);
  };

  const handleOpenEditUser = (user: UsuarioLogin) => {
    setEditingUser(user);
    setIsUserFormModalOpen(true);
  };

  // Keyboard shortcut listener for fast 0, 1, 2, 3, 4, 5, 6 page navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid overriding inside form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === '0' || e.key === 'g' || e.key === 'G') {
        handleSelectGlobalModule('visao_geral');
      } else if (e.key === '1') {
        handleSelectGlobalModule('clientes');
      } else if (e.key === '2') {
        handleSelectGlobalModule('farma_aereo');
      } else if (e.key === '3') {
        handleSelectGlobalModule('farma_rodoviario');
      } else if (e.key === '4') {
        handleSelectGlobalModule('dp');
      } else if (e.key === '5') {
        handleSelectGlobalModule('projetos');
      } else if (e.key === '6') {
        handleSelectGlobalModule('agenda');
      } else if (e.key === '7') {
        handleSelectGlobalModule('notas');
      } else if (e.key === '8') {
        handleSelectGlobalModule('usuarios');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  // Detect URL query parameter for public admission portal or public occurrence form
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const formParam = searchParams.get('form') || searchParams.get('link') || searchParams.get('pagina');
      const hash = window.location.hash.toLowerCase();

      if (formParam === 'admissao' || hash === '#admissao') {
        setIsCandidatePortalView(true);
        setCandidateUrlParams({
          empresa: searchParams.get('empresa') || undefined,
          cargo: searchParams.get('cargo') || undefined,
          token: searchParams.get('token') || undefined,
        });
      } else if (
        formParam === 'ocorrencia' ||
        formParam === 'ocorrencias' ||
        formParam === 'publico' ||
        hash === '#ocorrencia' ||
        hash === '#ocorrencias' ||
        hash === '#formulario_publico'
      ) {
        setIsOccurrencePortalView(true);
        setOccurrenceUrlParams({
          empresa: searchParams.get('empresa') || undefined,
          supervisor: searchParams.get('supervisor') || undefined,
        });
      } else if (formParam === 'instrucao' || hash === '#instrucao') {
        setIsInstrucaoPortalView(true);
        setInstrucaoUrlParams({
          id: searchParams.get('id') || undefined,
        });
      }
    }
  }, []);

  // A Agenda da Gestão é um módulo próprio: qualquer atalho que selecione a
  // seção 'agenda_gestao' (dashboard geral, painel DP...) deve refletir
  // 'agenda' como módulo global ativo, para destacar o item correto na
  // navegação e aplicar a permissão de módulo correta.
  useEffect(() => {
    if (activeSection === 'agenda_gestao' && activeGlobalModule !== 'agenda') {
      setActiveGlobalModule('agenda');
    }
  }, [activeSection, activeGlobalModule]);

  // Load all initial data (tudo que ainda vem do localStorage)
  const loadData = useCallback(() => {
    setPreAdmissoes(getPreAdmissoes());
    setViagensRodoviarias(getViagensRodoviarias());
    setProjetos(getProjetosGerenciais());
    setAtividadesGestao(getAtividadesGestao());
    setNotasPaginas(getNotasPaginas());
    setInstrucoesTrabalho(getInstrucoesTrabalho());
    setCustosOperacionais(getCustosOperacionais());
  }, []);

  // Departamento Pessoal já mora no Supabase (banco em nuvem) — essas 9 entidades são buscadas
  // à parte, de forma assíncrona. Erros aqui (ex.: sem internet, sessão expirada) viram um toast
  // em vez de travar a tela em branco.
  const loadDpData = useCallback(async () => {
    try {
      const [
        colabs, emps, sups, crgs, ferds, fer, ocos, quinz, lancs,
      ] = await Promise.all([
        getColaboradores(),
        getEmpregadores(),
        getSupervisores(),
        getCargos(),
        getFeriados(),
        getFerias(),
        getOcorrencias(),
        getQuinzenasValeAlimentacao(),
        getLancamentosValeAlimentacao(),
      ]);
      setColaboradores(colabs);
      setEmpregadores(emps);
      setSupervisores(sups);
      setCargos(crgs);
      setFeriados(ferds);
      setFeriasList(fer);
      setOcorrencias(ocos);
      setQuinzenasVA(quinz);
      setLancamentosVA(lancs);
    } catch (err) {
      console.error('Erro ao carregar dados do Departamento Pessoal (Supabase):', err);
      showToast('Não foi possível carregar os dados do Departamento Pessoal. Verifique sua conexão.', 'info');
    }
  }, []);

  // Clientes (carteira) + Farma Aéreo também já moram no Supabase. A tabela de lançamentos
  // tem milhares de linhas — por isso as ações do dia a dia (editar/excluir 1 lançamento,
  // cadastrar 1 cliente etc.) atualizam só o item certo no estado local em vez de chamar esta
  // função de novo; ela é usada no carregamento inicial e depois de uma importação em lote.
  const loadFarmaAereoData = useCallback(async () => {
    try {
      const [clis, embs, lancs, faturas] = await Promise.all([
        getClientes(), getEmbarquesAereos(), getLancamentosFaturamentoAereo(), getFaturasAereo(),
      ]);
      setClientes(clis);
      setEmbarquesAereos(embs);
      setLancamentosFaturamentoAereo(lancs);
      setFaturasAereo(faturas);
    } catch (err) {
      console.error('Erro ao carregar dados de Clientes/Farma Aéreo (Supabase):', err);
      showToast('Não foi possível carregar os dados de Clientes/Farma Aéreo. Verifique sua conexão.', 'info');
    }
  }, []);

  useEffect(() => {
    loadData();
    loadDpData();
    loadFarmaAereoData();

    // Listen to cross-component storage changes
    const handleStorageUpdate = () => {
      loadData();
    };
    window.addEventListener(NOTIFICATION_EVENT, handleStorageUpdate);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleStorageUpdate);
  }, [loadData, loadDpData, loadFarmaAereoData]);

  // Keep detail view synchronized with updated store
  useEffect(() => {
    if (selectedColaboradorDetail) {
      const refreshed = colaboradores.find((c) => c.id === selectedColaboradorDetail.id);
      if (refreshed) {
        setSelectedColaboradorDetail(refreshed);
      }
    }
  }, [colaboradores]);

  // Dynamic calculation of System Alerts
  const alertas: AlertaItem[] = useMemo(() => {
    const list: AlertaItem[] = [];

    // 1. ANVISA / RDC 430 ASO Exams Alerts
    colaboradores.forEach((c) => {
      if (c.status === 'Inativo') return;
      const status = calcExamStatus(c.dataVencimentoExame);
      const days = calcDaysRemaining(c.dataVencimentoExame);

      if (status === 'Vencido') {
        list.push({
          id: `alerta-exam-${c.id}`,
          tipo: 'exame',
          nivel: 'urgente',
          colaboradorId: c.id,
          colaboradorNome: c.nomeCompleto,
          titulo: `Exame ASO Vencido (${c.nomeCompleto})`,
          descricao: `Exame ocupacional venceu há ${Math.abs(days || 0)} dias. Risco de auto de infração ANVISA RDC 430.`,
          diasRestantes: days || 0,
          dataLimite: c.dataVencimentoExame,
        });
      } else if (status === 'A vencer') {
        list.push({
          id: `alerta-exam-${c.id}`,
          tipo: 'exame',
          nivel: 'atencao',
          colaboradorId: c.id,
          colaboradorNome: c.nomeCompleto,
          titulo: `Exame ASO Vence em Breve (${c.nomeCompleto})`,
          descricao: `Exame periódico vence em ${days} dias (${c.dataVencimentoExame}). Agendar com clínica conveniada.`,
          diasRestantes: days || 0,
          dataLimite: c.dataVencimentoExame,
        });
      }
    });

    // 2. Critical CLT Vacation Alerts
    feriasList.forEach((f) => {
      const colab = colaboradores.find((c) => c.id === f.colaboradorId);
      if (!colab || colab.status === 'Inativo') return;

      if (f.status === 'Crítico' || f.status === 'Vencido') {
        const days = calcDaysRemaining(f.limiteConcessivo);
        list.push({
          id: `alerta-ferias-${f.id}`,
          tipo: 'ferias',
          nivel: 'urgente',
          colaboradorId: f.colaboradorId,
          colaboradorNome: f.colaboradorNome,
          titulo: `Férias no Limite Concessivo (${f.colaboradorNome})`,
          descricao: `Limite concessivo (11 meses) em ${f.limiteConcessivo}. Risco de pagamento de férias em dobro (Art. 137 CLT).`,
          diasRestantes: days || 0,
          dataLimite: f.limiteConcessivo,
        });
      }
    });

    // 3. Pending Documents / Onboarding Alerts
    colaboradores.forEach((c) => {
      if (c.status === 'Inativo') return;
      const docsFaltando = (c.documentos || []).filter((d) => d.status === 'Pendente');

      if (docsFaltando.length > 0) {
        list.push({
          id: `alerta-doc-${c.id}`,
          tipo: 'documento',
          nivel: 'info',
          colaboradorId: c.id,
          colaboradorNome: c.nomeCompleto,
          titulo: `Documentos Pendentes (${c.nomeCompleto})`,
          descricao: `Faltam ${docsFaltando.length} documento(s): ${docsFaltando.map((d) => d.tipo).join(', ')}.`,
          diasRestantes: 0,
        });
      }
    });

    return list;
  }, [colaboradores, feriasList]);

  // Sidebar badge counters
  const sidebarCounts = useMemo(() => {
    const ativos = colaboradores.filter((c) => c.status !== 'Inativo').length;
    const examesVencendo = colaboradores.filter((c) => {
      if (c.status === 'Inativo') return false;
      const st = calcExamStatus(c.dataVencimentoExame);
      return st === 'Vencido' || st === 'A vencer';
    }).length;

    const feriasCriticas = feriasList.filter(
      (f) => f.status === 'Crítico' || f.status === 'Vencido'
    ).length;

    const docsPendentes = colaboradores.filter((c) => {
      if (c.status === 'Inativo') return false;
      return (c.documentos || []).some((d) => d.status === 'Pendente');
    }).length;

    const ocorrenciasAbertas = ocorrencias.filter((o) => o.status === 'Pendente').length;

    const onboardingPendente = colaboradores.filter((c) => {
      if (c.status === 'Inativo') return false;
      return (c.onboarding || []).some((item) => !item.concluido);
    }).length;

    const preAdmissoesPendentes = preAdmissoes.filter(
      (p) => p.status === 'Aguardando Revisão' || p.status === 'Pendente Documentos'
    ).length;

    const clientesAtivos = clientes.filter((cl) => cl.status === 'Ativo').length;
    const embarquesAereosAtivos = embarquesAereos.filter((e) => e.status !== 'Entregue / Concluído').length;
    const viagensRodoviariasAtivas = viagensRodoviarias.filter((v) => v.status !== 'Viagem Concluída').length;
    const projetosAtivos = projetos.length;
    const todayIso = new Date().toISOString().split('T')[0];
    const atividadesHoje = atividadesGestao.filter(
      (a) => atividadeOcorreEm(a, todayIso) && a.status !== 'Concluída' && a.status !== 'Cancelada'
    ).length;

    return {
      ativos,
      examesVencendo,
      feriasCriticas,
      docsPendentes,
      ocorrenciasAbertas,
      onboardingPendente,
      preAdmissoesPendentes,
      clientesAtivos,
      embarquesAereosAtivos,
      viagensRodoviariasAtivas,
      projetosAtivos,
      atividadesHoje,
      totalLogins: users.length,
      notasCount: notasPaginas.filter((n) => !n.arquivada).length,
      instrucoesCount: instrucoesTrabalho.filter((i) => !i.arquivada).length,
    };
  }, [
    colaboradores,
    feriasList,
    ocorrencias,
    preAdmissoes,
    clientes,
    embarquesAereos,
    viagensRodoviarias,
    projetos,
    atividadesGestao,
    notasPaginas,
    instrucoesTrabalho,
    users,
  ]);

  // Global Counts for Switcher
  const moduleCounts = useMemo(() => {
    return {
      clientesAtivos: sidebarCounts.clientesAtivos || 0,
      embarquesAereosAtivos: sidebarCounts.embarquesAereosAtivos || 0,
      viagensRodoviariasAtivas: sidebarCounts.viagensRodoviariasAtivas || 0,
      colaboradoresAtivos: sidebarCounts.ativos || 0,
      alertasDP: alertas.length,
      alertasAereo: 0,
      alertasRodoviario: 0,
      projetosAtivos: sidebarCounts.projetosAtivos || 0,
    };
  }, [sidebarCounts, alertas]);

  // HANDLERS FOR ENTITY OPERATIONS
  const handleSaveProjeto = (proj: ProjetoGerencial) => {
    saveProjetoGerencial(proj);
    loadData();
    showToast(`Projeto "${proj.titulo}" salvo com sucesso!`, 'success');
  };

  const handleDeleteProjeto = (id: string) => {
    deleteProjetoGerencial(id);
    loadData();
    showToast('Projeto removido do portfólio.', 'info');
  };

  const handleUpdateProjetoStatus = (id: string, newStatus: StatusProjeto) => {
    updateProjetoStatus(id, newStatus);
    loadData();
    showToast(`Status do projeto atualizado para "${newStatus}".`, 'success');
  };

  // Agenda Gestão Handlers
  const handleSaveAtividadeGestao = (item: AtividadeGestao) => {
    saveAtividadeGestao(item);
    loadData();
    showToast(`Atividade "${item.titulo}" salva na agenda da gestão!`, 'success');
  };

  const handleDeleteAtividadeGestao = (id: string) => {
    deleteAtividadeGestao(id);
    loadData();
    showToast('Atividade removida da agenda.', 'info');
  };

  const handleUpdateAtividadeStatus = (id: string, newStatus: StatusAtividadeGestao) => {
    updateAtividadeStatus(id, newStatus);
    loadData();
    showToast(`Status da atividade atualizado para "${newStatus}".`, 'success');
  };

  // Notas & Ideias Handlers
  const handleSaveNotaPagina = (pagina: NotaPagina) => {
    saveNotaPagina(pagina);
    loadData();
  };

  const handleDeleteNotaPagina = (id: string) => {
    deleteNotaPagina(id);
    loadData();
    showToast('Página removida das Notas.', 'info');
  };

  // Instruções de Trabalho Handlers
  const handleSaveInstrucaoTrabalho = (instrucao: InstrucaoTrabalho) => {
    saveInstrucaoTrabalho(instrucao);
    loadData();
  };

  const handleDeleteInstrucaoTrabalho = (id: string) => {
    deleteInstrucaoTrabalho(id);
    loadData();
    showToast('Instrução de trabalho removida.', 'info');
  };

  const handleUpdateDeliberacoes = (id: string, deliberacoes: ItemDeliberacaoAta[]) => {
    const list = getAtividadesGestao();
    const target = list.find((a) => a.id === id);
    if (target) {
      target.deliberacoes = deliberacoes;
      saveAtividadeGestao(target);
      loadData();
      showToast('Deliberações e ata da reunião atualizadas com sucesso!', 'success');
    }
  };

  const handleOpenNovoColaborador = () => {
    setEditingColaborador(null);
    setIsEmployeeFormOpen(true);
  };

  const handleEditColaborador = (colab: Colaborador) => {
    setEditingColaborador(colab);
    setIsEmployeeFormOpen(true);
  };

  const handleSaveColaborador = async (colab: Colaborador) => {
    try {
      await saveColaborador(colab);
      await loadDpData();
      setIsEmployeeFormOpen(false);
      showToast(`Colaborador ${colab.nomeCompleto} salvo com sucesso!`);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível salvar o colaborador. Tente novamente.', 'info');
    }
  };

  const handleDeleteColaborador = async (id: string) => {
    try {
      await deleteColaborador(id);
      await loadDpData();
      if (selectedColaboradorDetail?.id === id) {
        setSelectedColaboradorDetail(null);
      }
      showToast('Colaborador excluído com sucesso.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível excluir o colaborador. Tente novamente.', 'info');
    }
  };

  const handleConfirmDismissal = async (
    colaboradorId: string,
    motivo: MotivoDemissao,
    observacoes?: string
  ) => {
    try {
      await inativarColaborador(colaboradorId, motivo, observacoes);
      await loadDpData();
      setDismissalTargetColaborador(null);
      if (selectedColaboradorDetail?.id === colaboradorId) {
        setSelectedColaboradorDetail(null);
      }
      showToast('Colaborador desligado e transferido para o arquivo inativo.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível concluir o desligamento. Tente novamente.', 'info');
    }
  };

  const handleSaveFerias = async (ferias: ProgramacaoFerias) => {
    await saveFerias(ferias);
    await loadDpData();
    showToast('Programação de férias atualizada com sucesso!');
  };

  const handleUpdateStatusFerias = async (feriasId: string, novoStatus: StatusFerias) => {
    await updateStatusFerias(feriasId, novoStatus);
    await loadDpData();
    showToast(`Status das férias alterado para ${novoStatus}!`);
  };

  const handleSaveOcorrencia = async (ocorrencia: Ocorrencia) => {
    await saveOcorrencia(ocorrencia);
    await loadDpData();
    setIsPublicOccurrenceFormOpen(false);
    showToast('Ocorrência registrada com sucesso no prontuário do colaborador!');
  };

  const handleSaveQuinzenaVA = async (quinzena: QuinzenaValeAlimentacao) => {
    await saveQuinzenaValeAlimentacao(quinzena);
    await loadDpData();
    showToast('Quinzena de Vale Alimentação salva com sucesso!');
  };

  const handleDeleteQuinzenaVA = async (id: string) => {
    // Remove a quinzena e também os lançamentos que dependiam dela — não faz sentido manter
    // uma movimentação "órfã" sem período de referência.
    await deleteQuinzenaValeAlimentacao(id);
    const restantes = lancamentosVA.filter((l) => l.quinzenaId !== id);
    await saveLancamentosValeAlimentacao(restantes);
    await loadDpData();
    showToast('Quinzena excluída.', 'info');
  };

  const handleGerarLancamentosVA = async (quinzenaId: string) => {
    const quinzena = quinzenasVA.find((q) => q.id === quinzenaId);
    if (!quinzena) return;
    const jaLancados = new Set(
      lancamentosVA.filter((l) => l.quinzenaId === quinzenaId).map((l) => l.colaboradorId)
    );
    const ativos = colaboradores.filter((c) => c.status !== 'Inativo' && !jaLancados.has(c.id));
    if (ativos.length === 0) {
      showToast('Todos os colaboradores ativos já têm lançamento nesta quinzena.', 'info');
      return;
    }
    const novos: LancamentoValeAlimentacao[] = ativos.map((c, idx) => {
      // Puxa automaticamente das Ocorrências (Falta / Falta justificada / Falta injustificada) e
      // da Programação de Férias o que já cai dentro do período da quinzena — evita digitar de
      // novo o que já foi registrado em outra tela. Continua editável manualmente depois.
      const faltas = calcFaltasEmPeriodo(ocorrencias, c.id, quinzena.dataInicio, quinzena.dataTermino);
      const diasFerias = calcDiasFeriasEmPeriodo(feriasList, c.id, quinzena.dataInicio, quinzena.dataTermino);
      const quantidadeDiarias = calcQuantidadeDiariasVA(
        quinzena.dataInicio,
        quinzena.dataTermino,
        faltas,
        diasFerias
      );
      const valorDiaria = c.valorValeAlimentacaoDia || 0;
      return {
        id: `lanc-va-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        colaboradorId: c.id,
        colaboradorNome: c.nomeCompleto,
        quinzenaId: quinzena.id,
        identificacaoQuinzena: quinzena.identificacao,
        dataInicio: quinzena.dataInicio,
        dataTermino: quinzena.dataTermino,
        valorDiaria,
        faltas,
        diasFerias,
        quantidadeDiarias,
        valorDisponibilizado: calcValorDisponibilizadoVA(quantidadeDiarias, valorDiaria),
        criadoEm: new Date().toISOString(),
      };
    });
    await saveLancamentosValeAlimentacao(novos);
    await loadDpData();
    showToast(`${novos.length} lançamento(s) de Vale Alimentação gerado(s)!`);
  };

  const handleSincronizarFaltasVA = async (quinzenaId: string) => {
    const quinzena = quinzenasVA.find((q) => q.id === quinzenaId);
    if (!quinzena) return;
    let alterados = 0;
    const atualizados = lancamentosVA
      .filter((l) => l.quinzenaId === quinzenaId)
      .map((l) => {
        const faltas = calcFaltasEmPeriodo(ocorrencias, l.colaboradorId, quinzena.dataInicio, quinzena.dataTermino);
        const diasFerias = calcDiasFeriasEmPeriodo(
          feriasList,
          l.colaboradorId,
          quinzena.dataInicio,
          quinzena.dataTermino
        );
        // O valor da diária vem "congelado" do cadastro do colaborador no momento em que o
        // lançamento foi gerado — se a cota foi editada depois, sincronizar aqui também traz
        // o valor atual, em vez de deixar o lançamento preso no valor antigo pra sempre.
        const colaborador = colaboradores.find((c) => c.id === l.colaboradorId);
        const valorDiaria = colaborador?.valorValeAlimentacaoDia ?? l.valorDiaria;
        return { l, faltas, diasFerias, valorDiaria };
      })
      .filter(
        ({ l, faltas, diasFerias, valorDiaria }) =>
          faltas !== l.faltas || diasFerias !== (l.diasFerias || 0) || valorDiaria !== l.valorDiaria
      )
      .map(({ l, faltas, diasFerias, valorDiaria }) => {
        alterados++;
        const quantidadeDiarias = calcQuantidadeDiariasVA(
          quinzena.dataInicio,
          quinzena.dataTermino,
          faltas,
          diasFerias
        );
        return {
          ...l,
          faltas,
          diasFerias,
          valorDiaria,
          quantidadeDiarias,
          valorDisponibilizado: calcValorDisponibilizadoVA(quantidadeDiarias, valorDiaria),
          atualizadoEm: new Date().toISOString(),
        };
      });
    if (alterados > 0) {
      await saveLancamentosValeAlimentacao(atualizados);
      await loadDpData();
    }
    showToast(
      alterados > 0
        ? `${alterados} lançamento(s) atualizado(s) com faltas, férias e/ou valor da cota registrados no sistema.`
        : 'Nenhuma mudança — os dados já batem com Ocorrências, Férias e o cadastro do colaborador.',
      alterados > 0 ? 'success' : 'info'
    );
  };

  const handleSaveLancamentoVA = async (lancamento: LancamentoValeAlimentacao) => {
    await saveLancamentoValeAlimentacao(lancamento);
    await loadDpData();
  };

  const handleDeleteLancamentoVA = async (id: string) => {
    await deleteLancamentoValeAlimentacao(id);
    await loadDpData();
    showToast('Lançamento de Vale Alimentação excluído.', 'info');
  };

  const handleUpdateOnboardingItem = async (
    colaboradorId: string,
    itemKey: string,
    checked: boolean
  ) => {
    await updateOnboardingItem(colaboradorId, itemKey, checked);
    await loadDpData();
    showToast('Item de Onboarding / EPI atualizado.');
  };

  const handleUpdateExame = async (
    colaboradorId: string,
    dataUltimoExame: string,
    novoVencimento: string,
    clinica?: string,
    asoImagemUrl?: string,
    asoNomeArquivo?: string,
    asoMedicoEmitente?: string,
    asoResultado?: 'Apto' | 'Inapto' | 'Apto com Restrições'
  ) => {
    await renovarExameASO(
      colaboradorId,
      dataUltimoExame,
      novoVencimento,
      clinica,
      asoImagemUrl,
      asoNomeArquivo,
      asoMedicoEmitente,
      asoResultado
    );
    await loadDpData();
    showToast('Exame ASO RDC 430 renovado com sucesso!');
  };

  // Pre-admission handlers
  const handleUpdatePreAdmissaoStatus = (id: string, status: StatusPreAdmissao, motivoRecusa?: string) => {
    updatePreAdmissaoStatus(id, status, motivoRecusa);
    loadData();
    showToast(`Status da pré-admissão atualizado para: ${status}`);
  };

  const handleDeletePreAdmissao = (id: string) => {
    deletePreAdmissao(id);
    loadData();
    showToast('Ficha de pré-admissão removida.', 'info');
  };

  const handleEfetivarAdmissao = async (preAdmissaoId: string) => {
    const pre = getPreAdmissaoById(preAdmissaoId);
    if (!pre) return;
    try {
      const colab = await efetivarPreAdmissao(pre, {
        empregadorId: pre.empresaPredefinidaId,
        funcaoCargo: pre.cargoPredefinido,
        supervisorId: pre.supervisorPredefinidoId,
      });
      // A pré-admissão em si continua no localStorage — só o colaborador foi para o Supabase.
      updatePreAdmissaoStatus(preAdmissaoId, 'Aprovado', `Efetivado como ${colab.codigoMatricula} em ${new Date().toLocaleDateString('pt-BR')}`);
      const preAtualizado = getPreAdmissaoById(preAdmissaoId);
      if (preAtualizado) {
        savePreAdmissao({ ...preAtualizado, colaboradorEfetivadoId: colab.id });
      }
      await loadDpData();
      loadData();
      showToast(`Admissão de ${colab.nomeCompleto} efetivada com sucesso no quadro de ativos!`, 'success');
      setSelectedColaboradorDetail(colab);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível efetivar a admissão. Tente novamente.', 'info');
    }
  };

  // Clientes Handlers (Module 1) — atualiza só o item certo no estado local (sem recarregar
  // tudo de novo) já que a tabela de lançamentos aqui do lado é grande.
  const handleSaveCliente = async (cliente: Cliente) => {
    try {
      const item = cliente.id ? cliente : { ...cliente, id: `cli-${Date.now()}` };
      await saveCliente(item);
      setClientes((prev) => {
        const idx = prev.findIndex((c) => c.id === item.id);
        return idx >= 0 ? prev.map((c) => (c.id === item.id ? item : c)) : [item, ...prev];
      });
      showToast(`Cliente ${cliente.razaoSocial} salvo com sucesso!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível salvar o cliente. Tente novamente.', 'info');
    }
  };

  const handleDeleteCliente = async (id: string) => {
    try {
      await deleteCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      showToast('Cliente removido com sucesso.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível remover o cliente. Tente novamente.', 'info');
    }
  };

  // Farma Aéreo Handlers (Module 2)
  const handleSaveEmbarqueAereo = async (embarque: EmbarqueAereo) => {
    try {
      const item = embarque.id ? embarque : { ...embarque, id: `emb-air-${Date.now()}` };
      await saveEmbarqueAereo(item);
      setEmbarquesAereos((prev) => {
        const idx = prev.findIndex((e) => e.id === item.id);
        return idx >= 0 ? prev.map((e) => (e.id === item.id ? item : e)) : [item, ...prev];
      });
      showToast(`Embarque Aéreo AWB ${embarque.codigoAWB || embarque.numeroAwb} salvo com sucesso!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível salvar o embarque. Tente novamente.', 'info');
    }
  };

  const handleDeleteEmbarqueAereo = async (id: string) => {
    try {
      await deleteEmbarqueAereo(id);
      setEmbarquesAereos((prev) => prev.filter((e) => e.id !== id));
      showToast('Embarque aéreo removido.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível remover o embarque. Tente novamente.', 'info');
    }
  };

  // Controle Financeiro — Faturamento Farma Aéreo
  const handleImportFaturamentoAereo = async (
    lancamentos: LancamentoFaturamentoAereo[],
    faturas: FaturaAereo[]
  ) => {
    try {
      await importFaturasAereo(faturas);
      await importLancamentosFaturamentoAereo(lancamentos);
      await loadFarmaAereoData();
      showToast(
        `Importação concluída: ${lancamentos.length} lançamento(s) e ${faturas.length} fatura(s) novas.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Não foi possível concluir a importação. Tente novamente.', 'info');
    }
  };

  const handleCreateFaturaAereo = async (fatura: FaturaAereo) => {
    try {
      const item = fatura.id ? fatura : { ...fatura, id: `fatura-aereo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
      await saveFaturaAereo(item);
      setFaturasAereo((prev) => [item, ...prev]);
      showToast(`Fatura ${fatura.numeroFatura} criada com sucesso!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível criar a fatura. Tente novamente.', 'info');
    }
  };

  const handleUpdateFaturaAereo = async (fatura: FaturaAereo) => {
    try {
      await saveFaturaAereo(fatura);
      setFaturasAereo((prev) => prev.map((f) => (f.id === fatura.id ? fatura : f)));
    } catch (err) {
      console.error(err);
      showToast('Não foi possível atualizar a fatura. Tente novamente.', 'info');
    }
  };

  const handleDeleteFaturaAereo = async (id: string) => {
    try {
      await deleteFaturaAereo(id);
      setFaturasAereo((prev) => prev.filter((f) => f.id !== id));
      // O banco já desvincula (fatura_id -> null) os lançamentos que apontavam pra essa fatura —
      // reflete a mesma coisa aqui no estado local, sem precisar recarregar tudo.
      setLancamentosFaturamentoAereo((prev) =>
        prev.map((l) => (l.faturaId === id ? { ...l, faturaId: undefined } : l))
      );
      showToast('Fatura removida.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível remover a fatura. Tente novamente.', 'info');
    }
  };

  const handleUpdateLancamentoFaturamentoAereo = async (lancamento: LancamentoFaturamentoAereo) => {
    try {
      await saveLancamentoFaturamentoAereo(lancamento);
      setLancamentosFaturamentoAereo((prev) => prev.map((l) => (l.id === lancamento.id ? lancamento : l)));
    } catch (err) {
      console.error(err);
      showToast('Não foi possível salvar o lançamento. Tente novamente.', 'info');
    }
  };

  const handleDeleteLancamentoFaturamentoAereo = async (id: string) => {
    try {
      await deleteLancamentoFaturamentoAereo(id);
      setLancamentosFaturamentoAereo((prev) => prev.filter((l) => l.id !== id));
      showToast('Lançamento removido.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível remover o lançamento. Tente novamente.', 'info');
    }
  };

  // Farma Rodoviário Handlers (Module 3)
  const handleSaveViagemRodoviaria = (viagem: ViagemRodoviaria) => {
    saveViagemRodoviaria(viagem);
    loadData();
    showToast(`Viagem rodoviária placa ${viagem.veiculoPlaca} salva com sucesso!`, 'success');
  };

  const handleDeleteViagemRodoviaria = (id: string) => {
    deleteViagemRodoviaria(id);
    loadData();
    showToast('Viagem rodoviária removida.', 'info');
  };

  // Custos Operacionais Handlers
  const handleSaveCustoOperacional = (custo: CustoOperacional) => {
    saveCustoOperacional(custo);
    loadData();
    showToast(`Custo operacional "${custo.descricao}" salvo com sucesso!`, 'success');
  };

  const handleDeleteCustoOperacional = (id: string) => {
    deleteCustoOperacional(id);
    loadData();
    showToast('Custo operacional removido com sucesso.', 'info');
  };

  // Settings Handlers
  const handleAddEmpregador = async (emp: Empregador) => {
    await saveEmpregador(emp);
    await loadDpData();
    showToast(`Empresa ${emp.razaoSocial} cadastrada!`);
  };

  const handleAddCargo = async (cargo: CargoSalario) => {
    await saveCargo(cargo);
    await loadDpData();
    showToast(`Cargo ${cargo.cargo} cadastrado!`);
  };

  const handleAddSupervisor = async (sup: Supervisor) => {
    await saveSupervisor(sup);
    await loadDpData();
    showToast(`Supervisor ${sup.nome} cadastrado!`);
  };

  const handleAddFeriado = async (feriado: FeriadoEmpresa) => {
    await saveFeriado(feriado);
    await loadDpData();
    showToast(`Feriado ${feriado.descricao} adicionado!`);
  };

  // Database Backup Handlers
  const handleExportBackup = () => {
    exportDatabaseJSON();
    showToast('Backup completo do banco de dados exportado com sucesso!');
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const result = importDatabaseJSON(content);
          if (result.success) {
            loadData();
            showToast(result.message, 'success');
          } else {
            showToast(result.message, 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleResetDatabase = () => {
    if (window.confirm('Atenção: Deseja restaurar a base de dados padrão da JMT? Todas as modificações locais serão reiniciadas com o modelo oficial.')) {
      resetDatabaseToDefault();
      loadData();
      showToast('Base de dados restaurada com sucesso!', 'info');
    }
  };

  // IF Candidate Portal View is active (via direct link or test button)
  if (isCandidatePortalView || activeSection === 'formulario_admissao') {
    return (
      <CandidateAdmissionPortal
        initialToken={candidateUrlParams.token}
        preselectedEmpresaId={candidateUrlParams.empresa}
        preselectedCargo={candidateUrlParams.cargo}
        empregadores={empregadores}
        cargos={cargos}
        onAdminBack={() => {
          setIsCandidatePortalView(false);
          setActiveGlobalModule('dp');
          setActiveSection('preadmissoes');
        }}
      />
    );
  }

  // IF Supervisor Occurrence Portal View is active (via direct link or sidebar/button)
  if (isOccurrencePortalView || activeSection === 'formulario_publico') {
    return (
      <PublicOccurrencePortal
        colaboradores={colaboradores}
        supervisores={supervisores}
        empregadores={empregadores}
        preselectedSupervisorId={occurrenceUrlParams.supervisor}
        preselectedEmpresaId={occurrenceUrlParams.empresa}
        onSuccessSubmit={(ocorr) => {
          handleSaveOcorrencia(ocorr);
          showToast('Ocorrência de campo registrada com sucesso!');
        }}
        onAdminBack={() => {
          setIsOccurrencePortalView(false);
          setActiveGlobalModule('dp');
          setActiveSection('ocorrencias');
        }}
      />
    );
  }

  // IF Public Instrução de Trabalho filling portal is active (via direct link)
  if (isInstrucaoPortalView) {
    return (
      <PublicInstrucaoForm
        instrucoes={instrucoesTrabalho}
        instrucaoId={instrucaoUrlParams.id}
        onSaveInstrucao={handleSaveInstrucaoTrabalho}
        onAdminBack={() => {
          setIsInstrucaoPortalView(false);
          setActiveGlobalModule('instrucoes');
          setActiveSection('instrucoes');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeGlobalModule={activeGlobalModule}
        onChangeGlobalModule={handleSelectGlobalModule}
        currentSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          if (sec === 'visao_geral') setActiveGlobalModule('visao_geral');
          else if (sec === 'clientes') setActiveGlobalModule('clientes');
          else if (sec === 'farma_aereo') setActiveGlobalModule('farma_aereo');
          else if (sec === 'farma_rodoviario') setActiveGlobalModule('farma_rodoviario');
          else if (sec === 'projetos') setActiveGlobalModule('projetos');
          else if (sec === 'agenda_gestao') setActiveGlobalModule('agenda');
          else if (sec === 'notas') setActiveGlobalModule('notas');
          else if (sec === 'usuarios') setActiveGlobalModule('usuarios');
          else setActiveGlobalModule('dp');
          setIsMobileMenuOpen(false);
        }}
        currentUser={currentUser}
        onOpenSwitchUserModal={() => setIsSwitchUserModalOpen(true)}
        userRole={userRole}
        onChangeRole={setUserRole}
        counts={sidebarCounts}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenAdmissionLinkModal={() => setIsAdmissionLinkModalOpen(true)}
        onOpenOccurrenceLinkModal={() => setIsOccurrenceLinkModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-72">
        {/* Top Header */}
        <Header
          onOpenMobile={() => setIsMobileMenuOpen(true)}
          currentSection={activeSection}
          userRole={userRole}
          currentUser={currentUser}
          onOpenSwitchUserModal={() => setIsSwitchUserModalOpen(true)}
          alertas={alertas}
          atividadesHojeCount={sidebarCounts.atividadesHoje}
          onOpenNovoColaborador={handleOpenNovoColaborador}
          onOpenNovaOcorrencia={() => setIsPublicOccurrenceFormOpen(true)}
          onOpenAdmissionLink={() => setIsAdmissionLinkModalOpen(true)}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            if (sec === 'visao_geral') setActiveGlobalModule('visao_geral');
            else if (sec === 'clientes') setActiveGlobalModule('clientes');
            else if (sec === 'farma_aereo') setActiveGlobalModule('farma_aereo');
            else if (sec === 'farma_rodoviario') setActiveGlobalModule('farma_rodoviario');
            else if (sec === 'projetos') setActiveGlobalModule('projetos');
            else if (sec === 'agenda_gestao') setActiveGlobalModule('agenda');
            else if (sec === 'notas') setActiveGlobalModule('notas');
            else if (sec === 'usuarios') setActiveGlobalModule('usuarios');
            else setActiveGlobalModule('dp');
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onResetDatabase={handleResetDatabase}
        />

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-6 custom-scrollbar">
          {/* TOAST NOTIFICATION */}
          {toastMessage && (
            <div
              className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200 ${
                toastMessage.type === 'error'
                  ? 'bg-rose-600'
                  : toastMessage.type === 'info'
                  ? 'bg-blue-600'
                  : 'bg-emerald-600'
              }`}
            >
              <span>{toastMessage.text}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODULE 0: TORRE DE CONTROLE & DASHBOARD GERAL CONSOLIDADO                  */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'visao_geral' || activeSection === 'visao_geral') && (
            <GeneralDashboard
              clientes={clientes}
              embarquesAereos={embarquesAereos}
              viagensRodoviarias={viagensRodoviarias}
              colaboradores={colaboradores}
              projetos={projetos}
              atividadesGestao={atividadesGestao}
              custosOperacionais={custosOperacionais}
              feriasList={feriasList}
              ocorrencias={ocorrencias}
              preAdmissoes={preAdmissoes}
              alertas={alertas}
              userRole={userRole}
              onNavigateModule={handleSelectGlobalModule}
              onNavigateSection={setActiveSection}
              onOpenNovoColaborador={handleOpenNovoColaborador}
              onOpenNovaOcorrencia={() => setIsPublicOccurrenceFormOpen(true)}
              onOpenAdmissionLink={() => setIsAdmissionLinkModalOpen(true)}
              onOpenNovoCliente={() => {
                setActiveGlobalModule('clientes');
                setActiveSection('clientes');
              }}
              onOpenNovoCustoOperacional={() => {
                setSelectedCustoEdit(null);
                setIsCustoOperacionalModalOpen(true);
              }}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetDatabase={handleResetDatabase}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectColaboradorDetail={(c) => setSelectedColaboradorDetail(c)}
              onSelectClienteDetail={() => {
                setActiveGlobalModule('clientes');
                setActiveSection('clientes');
              }}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE 1: GESTÃO DE CLIENTES */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'clientes' || activeSection === 'clientes') && (
            <ClientsView
              clientes={clientes}
              onSaveCliente={handleSaveCliente}
              onDeleteCliente={handleDeleteCliente}
              empregadores={empregadores}
              supervisores={supervisores}
              userRole={userRole}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE 2: FARMA AÉREO */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'farma_aereo' || activeSection === 'farma_aereo') && (
            <FarmaAereoView
              embarques={embarquesAereos}
              onSaveEmbarque={handleSaveEmbarqueAereo}
              onDeleteEmbarque={handleDeleteEmbarqueAereo}
              clientes={clientes}
              colaboradores={colaboradores}
              custosOperacionais={custosOperacionais}
              onSaveCliente={handleSaveCliente}
              onSaveColaborador={handleSaveColaborador}
              onSaveCusto={handleSaveCustoOperacional}
              onDeleteCusto={handleDeleteCustoOperacional}
              onOpenNovoCliente={() => {
                setActiveGlobalModule('clientes');
                setActiveSection('clientes');
              }}
              onOpenNovoColaborador={handleOpenNovoColaborador}
              onSelectClienteDetail={() => {
                setActiveGlobalModule('clientes');
                setActiveSection('clientes');
              }}
              onSelectColaboradorDetail={(c) => setSelectedColaboradorDetail(c)}
              userRole={userRole}
              lancamentosFaturamentoAereo={lancamentosFaturamentoAereo}
              faturasAereo={faturasAereo}
              onImportFaturamentoAereo={handleImportFaturamentoAereo}
              onCreateFaturaAereo={handleCreateFaturaAereo}
              onUpdateFaturaAereo={handleUpdateFaturaAereo}
              onDeleteFaturaAereo={handleDeleteFaturaAereo}
              onUpdateLancamentoFaturamentoAereo={handleUpdateLancamentoFaturamentoAereo}
              onDeleteLancamentoFaturamentoAereo={handleDeleteLancamentoFaturamentoAereo}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE 3: FARMA RODOVIÁRIO */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'farma_rodoviario' || activeSection === 'farma_rodoviario') && (
            <FarmaRodoviarioView
              viagens={viagensRodoviarias}
              onSaveViagem={handleSaveViagemRodoviaria}
              onDeleteViagem={handleDeleteViagemRodoviaria}
              clientes={clientes}
              colaboradores={colaboradores}
              custosOperacionais={custosOperacionais}
              onSaveCliente={handleSaveCliente}
              onSaveColaborador={handleSaveColaborador}
              onSaveCusto={handleSaveCustoOperacional}
              onDeleteCusto={handleDeleteCustoOperacional}
              onOpenNovoCliente={() => {
                setActiveGlobalModule('clientes');
                setActiveSection('clientes');
              }}
              onOpenNovoColaborador={handleOpenNovoColaborador}
              onSelectClienteDetail={() => {
                setActiveGlobalModule('clientes');
                setActiveSection('clientes');
              }}
              onSelectColaboradorDetail={(c) => setSelectedColaboradorDetail(c)}
              userRole={userRole}
              lancamentosFaturamentoAereo={lancamentosFaturamentoAereo}
              faturasAereo={faturasAereo}
              onImportFaturamentoAereo={handleImportFaturamentoAereo}
              onCreateFaturaAereo={handleCreateFaturaAereo}
              onUpdateFaturaAereo={handleUpdateFaturaAereo}
              onDeleteFaturaAereo={handleDeleteFaturaAereo}
              onUpdateLancamentoFaturamentoAereo={handleUpdateLancamentoFaturamentoAereo}
              onDeleteLancamentoFaturamentoAereo={handleDeleteLancamentoFaturamentoAereo}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE 5: PROJETOS GERENCIAIS & OKRs */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'projetos' || activeSection === 'projetos') && (
            <ProjetosView
              projetos={projetos}
              onSaveProjeto={handleSaveProjeto}
              onDeleteProjeto={handleDeleteProjeto}
              onUpdateProjetoStatus={handleUpdateProjetoStatus}
              supervisores={supervisores}
              colaboradores={colaboradores}
              userRole={userRole}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE: AGENDA DA GESTÃO & GOVERNANÇA */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'agenda' || activeSection === 'agenda_gestao') && (
            <AgendaGestaoView
              atividades={atividadesGestao}
              supervisores={supervisores}
              colaboradores={colaboradores}
              onSaveAtividade={handleSaveAtividadeGestao}
              onDeleteAtividade={handleDeleteAtividadeGestao}
              onStatusChange={handleUpdateAtividadeStatus}
              onUpdateDeliberacoes={handleUpdateDeliberacoes}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE: NOTAS & IDEIAS (PÁGINAS ESTILO NOTION) */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'notas' || activeSection === 'notas') && (
            <NotasView
              paginas={notasPaginas}
              onSavePagina={handleSaveNotaPagina}
              onDeletePagina={handleDeleteNotaPagina}
              currentUserName={currentUser?.nome}
              onNavigateModule={handleSelectGlobalModule}
              clientes={clientes}
              colaboradores={colaboradores}
              projetos={projetos}
              embarquesAereos={embarquesAereos}
              viagensRodoviarias={viagensRodoviarias}
              ocorrencias={ocorrencias}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE: INSTRUÇÕES DE TRABALHO (IT) */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'instrucoes' || activeSection === 'instrucoes') && (
            <InstrucoesTrabalhoView
              instrucoes={instrucoesTrabalho}
              onSaveInstrucao={handleSaveInstrucaoTrabalho}
              onDeleteInstrucao={handleDeleteInstrucaoTrabalho}
              currentUserName={currentUser?.nome}
              onNavigateModule={handleSelectGlobalModule}
              clientes={clientes}
              colaboradores={colaboradores}
              projetos={projetos}
              embarquesAereos={embarquesAereos}
              viagensRodoviarias={viagensRodoviarias}
              ocorrencias={ocorrencias}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE 6: LOGINS & ACESSOS (USUÁRIOS) */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'usuarios' || activeSection === 'usuarios') && (
            <UsuariosView
              users={users}
              currentUser={currentUser}
              onOpenCreateUser={handleOpenCreateUser}
              onOpenEditUser={handleOpenEditUser}
              onDeleteUser={handleDeleteUser}
              onToggleModuleAccess={handleToggleUserModuleAccess}
              onSwitchSessionUser={handleSelectUserSession}
            />
          )}

          {/* Module Access Restriction Guard */}
          {activeSection !== 'usuarios' &&
            activeGlobalModule !== 'usuarios' &&
            !currentUser.modulosPermitidos.includes(activeGlobalModule) && (
              <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-sm text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-inner">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Acesso Não Autorizado a Este Módulo
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  O seu login atual (<strong className="text-slate-800 font-mono">@{currentUser.login}</strong> — {currentUser.cargo}) não tem permissão atribuída para acessar o módulo selecionado.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const firstAllowed = currentUser.modulosPermitidos[0] || 'visao_geral';
                      handleSelectGlobalModule(firstAllowed);
                    }}
                    className="px-4 py-2 bg-[#B38F4F] hover:bg-[#8A6A39] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Ir para Módulo Autorizado
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSwitchUserModalOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Alternar Usuário
                  </button>
                </div>
              </div>
            )}

          {/* ========================================================================= */}
          {/* MODULE 4: DEPARTAMENTO PESSOAL (DP) */}
          {/* ========================================================================= */}
          {activeGlobalModule === 'dp' && activeSection === 'dashboard' && (
            <Dashboard
              colaboradores={colaboradores}
              ferias={feriasList}
              ocorrencias={ocorrencias}
              alertas={alertas}
              userRole={userRole}
              onNavigate={setActiveSection}
              onSelectColaborador={(c) => setSelectedColaboradorDetail(c)}
              onOpenNovoColaborador={handleOpenNovoColaborador}
              onOpenAdmissionLink={() => setIsAdmissionLinkModalOpen(true)}
              onOpenNovaOcorrencia={() => setIsPublicOccurrenceFormOpen(true)}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'colaboradores' && (
            <EmployeeList
              colaboradores={colaboradores.filter((c) => c.status !== 'Inativo')}
              empregadores={empregadores}
              supervisores={supervisores}
              userRole={userRole}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenNovo={handleOpenNovoColaborador}
              onSelectColaborador={(c) => setSelectedColaboradorDetail(c)}
              onEditColaborador={handleEditColaborador}
              onDeleteColaborador={handleDeleteColaborador}
              onOpenDemissaoModal={(c) => setDismissalTargetColaborador(c)}
              onOpenProgramarFerias={(c) => setActiveSection('ferias')}
              onOpenRegistrarOcorrencia={(c) => setActiveSection('ocorrencias')}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'preadmissoes' && (
            <PreAdmissionsManagerView
              preAdmissoes={preAdmissoes}
              empregadores={empregadores}
              cargos={cargos}
              supervisores={supervisores}
              onOpenLinkGenerator={() => setIsAdmissionLinkModalOpen(true)}
              onEfetivarAdmissao={handleEfetivarAdmissao}
              onUpdateStatus={handleUpdatePreAdmissaoStatus}
              onDeletePreAdmissao={handleDeletePreAdmissao}
              onSelectColaboradorDetail={(c) => setSelectedColaboradorDetail(c)}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'arquivo' && (
            <EmployeeList
              colaboradores={colaboradores.filter((c) => c.status === 'Inativo')}
              empregadores={empregadores}
              supervisores={supervisores}
              userRole={userRole}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenNovo={handleOpenNovoColaborador}
              onSelectColaborador={(c) => setSelectedColaboradorDetail(c)}
              onEditColaborador={handleEditColaborador}
              onDeleteColaborador={handleDeleteColaborador}
              onOpenDemissaoModal={(c) => setDismissalTargetColaborador(c)}
              onOpenProgramarFerias={(c) => setActiveSection('ferias')}
              onOpenRegistrarOcorrencia={(c) => setActiveSection('ocorrencias')}
            />
          )}

          {activeGlobalModule === 'dp' && (activeSection === 'custos' || activeSection === 'beneficios') && (
            <MonthlyCostView
              colaboradores={colaboradores}
              empregadores={empregadores}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'vale_alimentacao' && (
            <ValeAlimentacaoView
              colaboradores={colaboradores}
              ocorrencias={ocorrencias}
              feriasList={feriasList}
              quinzenas={quinzenasVA}
              lancamentos={lancamentosVA}
              onSaveQuinzena={handleSaveQuinzenaVA}
              onDeleteQuinzena={handleDeleteQuinzenaVA}
              onGerarLancamentos={handleGerarLancamentosVA}
              onSincronizarFaltas={handleSincronizarFaltasVA}
              onSaveLancamento={handleSaveLancamentoVA}
              onDeleteLancamento={handleDeleteLancamentoVA}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'ferias' && (
            <VacationView
              colaboradores={colaboradores}
              feriasList={feriasList}
              userRole={userRole}
              onSaveFerias={handleSaveFerias}
              onUpdateStatusFerias={handleUpdateStatusFerias}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'ocorrencias' && (
            <OccurrencesView
              colaboradores={colaboradores}
              supervisores={supervisores}
              ocorrencias={ocorrencias}
              userRole={userRole}
              onSaveOcorrencia={handleSaveOcorrencia}
              onOpenPublicFormModal={() => setIsPublicOccurrenceFormOpen(true)}
              onOpenOccurrenceLinkModal={() => setIsOccurrenceLinkModalOpen(true)}
              onOpenPortalView={() => setIsOccurrencePortalView(true)}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'saude' && (
            <AnvisaExamsView
              colaboradores={colaboradores}
              empregadores={empregadores}
              onUpdateExame={handleUpdateExame}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'onboarding' && (
            <OnboardingView
              colaboradores={colaboradores}
              onUpdateOnboardingItem={handleUpdateOnboardingItem}
            />
          )}

          {activeGlobalModule === 'dp' && (activeSection === 'cargos' || activeSection === 'supervisores') && (
            <SettingsView
              empregadores={empregadores}
              cargos={cargos}
              supervisores={supervisores}
              feriados={feriados}
              userRole={userRole}
              onAddEmpregador={handleAddEmpregador}
              onAddCargo={handleAddCargo}
              onAddSupervisor={handleAddSupervisor}
              onAddFeriado={handleAddFeriado}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'aniversariantes' && (
            <BirthdaysView
              colaboradores={colaboradores}
              empregadores={empregadores}
              onSelectColaborador={(c) => setSelectedColaboradorDetail(c)}
              onNotifySuccess={(msg) => showToast(msg, 'success')}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Employee Form Modal (8 Tabs) */}
      <EmployeeFormModal
        isOpen={isEmployeeFormOpen}
        onClose={() => setIsEmployeeFormOpen(false)}
        onSave={handleSaveColaborador}
        initialData={editingColaborador}
        empregadores={empregadores}
        supervisores={supervisores}
        cargos={cargos}
      />

      {/* 2. Employee Detail Modal with Print Sheet */}
      <EmployeeDetailModal
        isOpen={!!selectedColaboradorDetail}
        onClose={() => setSelectedColaboradorDetail(null)}
        colaborador={selectedColaboradorDetail}
        empregadores={empregadores}
        supervisores={supervisores}
        userRole={userRole}
        lancamentosValeAlimentacao={
          selectedColaboradorDetail
            ? lancamentosVA.filter((l) => l.colaboradorId === selectedColaboradorDetail.id)
            : []
        }
        onUpdateColaborador={(c) => {
          handleSaveColaborador(c);
          setSelectedColaboradorDetail(c);
        }}
        onEdit={(c) => {
          setSelectedColaboradorDetail(null);
          handleEditColaborador(c);
        }}
        onProgramarFerias={(c) => {
          setSelectedColaboradorDetail(null);
          setActiveGlobalModule('dp');
          setActiveSection('ferias');
        }}
        onRegistrarOcorrencia={(c) => {
          setSelectedColaboradorDetail(null);
          setActiveGlobalModule('dp');
          setActiveSection('ocorrencias');
        }}
        onDemitir={(c) => {
          setSelectedColaboradorDetail(null);
          setDismissalTargetColaborador(c);
        }}
      />

      {/* 3. Dismissal / Inactivation Modal */}
      <DismissalModal
        isOpen={!!dismissalTargetColaborador}
        onClose={() => setDismissalTargetColaborador(null)}
        colaborador={dismissalTargetColaborador}
        onConfirmDismissal={handleConfirmDismissal}
      />

      {/* 4. Supervisor Public Occurrence Form Modal */}
      <PublicOccurrenceForm
        isOpen={isPublicOccurrenceFormOpen}
        onClose={() => setIsPublicOccurrenceFormOpen(false)}
        colaboradores={colaboradores}
        supervisores={supervisores}
        onSuccessSubmit={(ocorr) => {
          handleSaveOcorrencia(ocorr);
          showToast('Ocorrência de campo registrada pelo supervisor com sucesso!');
        }}
      />

      {/* 5. Admission Link Generator & WhatsApp Sender Modal */}
      <AdmissionLinkModal
        isOpen={isAdmissionLinkModalOpen}
        onClose={() => setIsAdmissionLinkModalOpen(false)}
        empregadores={empregadores}
        cargos={cargos}
        supervisores={supervisores}
        onOpenCandidateView={() => setIsCandidatePortalView(true)}
      />

      {/* 6. Occurrence Link Generator & WhatsApp Sender Modal */}
      <OccurrenceLinkModal
        isOpen={isOccurrenceLinkModalOpen}
        onClose={() => setIsOccurrenceLinkModalOpen(false)}
        supervisores={supervisores}
        empregadores={empregadores}
        onOpenPortalView={() => setIsOccurrencePortalView(true)}
      />

      {/* 7. Custo Operacional Form Modal (Torre de Controle & Gestão Geral) */}
      {isCustoOperacionalModalOpen && (
        <CustoOperacionalFormModal
          isOpen={isCustoOperacionalModalOpen}
          onClose={() => {
            setIsCustoOperacionalModalOpen(false);
            setSelectedCustoEdit(null);
          }}
          onSave={(custo) => {
            handleSaveCustoOperacional(custo);
            setIsCustoOperacionalModalOpen(false);
            setSelectedCustoEdit(null);
          }}
          initialData={selectedCustoEdit}
          defaultSetor="geral"
        />
      )}

      {/* 8. User Session Switcher Modal */}
      <SwitchUserModal
        isOpen={isSwitchUserModalOpen}
        onClose={() => setIsSwitchUserModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onSelectUser={handleSelectUserSession}
        onOpenCreateUser={() => {
          setIsSwitchUserModalOpen(false);
          handleOpenCreateUser();
        }}
      />

      {/* 9. User Login & Permissions Form Modal */}
      <UsuarioFormModal
        isOpen={isUserFormModalOpen}
        onClose={() => {
          setIsUserFormModalOpen(false);
          setEditingUser(null);
        }}
        onSaveUser={handleSaveUser}
        existingUser={editingUser}
        allUsers={users}
      />
    </div>
  );
}
