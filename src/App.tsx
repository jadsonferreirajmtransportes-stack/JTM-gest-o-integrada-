import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  InteracaoCliente,
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
  OrcamentoItem,
  ConversaChat,
  SupervisorPublico,
  ColaboradorPublico,
  EmpregadorPublico,
} from './types';
import {
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
  getPreAdmissoes,
  getPreAdmissaoById,
  savePreAdmissao,
  updatePreAdmissaoStatus,
  deletePreAdmissao,
  getQuinzenasValeAlimentacao,
  saveQuinzenaValeAlimentacao,
  deleteQuinzenaValeAlimentacao,
  getLancamentosValeAlimentacao,
  saveLancamentosValeAlimentacao,
  saveLancamentoValeAlimentacao,
  deleteLancamentoValeAlimentacao,
  getSupervisoresPublico,
  getColaboradoresAtivosPublico,
  getEmpregadoresPublico,
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
// Custos Operacionais, Projetos Gerenciais, Agenda da Gestão, Notas & Ideias e Instruções de
// Trabalho também já migrados para o Supabase — ver src/utils/gestaoApi.ts.
import {
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
  getOrcamentos,
  saveOrcamentoItem,
} from './utils/gestaoApi';
// Farma Rodoviário (viagens/telemetria) também já migrado para o Supabase — ver
// src/utils/viagensApi.ts.
import {
  getViagensRodoviarias,
  saveViagemRodoviaria,
  deleteViagemRodoviaria,
} from './utils/viagensApi';
import {
  calcExamStatus,
  calcDaysRemaining,
  calcQuantidadeDiariasVA,
  calcValorDisponibilizadoVA,
  calcFaltasEmPeriodo,
  calcDiasFeriasEmPeriodo,
} from './utils/formatters';
import {
  isClienteFarmaAereo,
  isClienteFarmaRodoviario,
  isColaboradorFarmaAereo,
  isColaboradorFarmaRodoviario,
  calcFinancialsSetor,
  computeFaturamentoRealAereo,
  vincularClienteAoSetor,
  vincularColaboradorAoSetor,
  gerarRelatorioGerencialSetorCSV,
  SetorModuloId,
} from './utils/sectorUtils';
import { ehModalRodoviario } from './components/FarmaAereo/faturamentoAereoUtils';
import { SectorLinkModal } from './components/Common/SectorLinkModal';

// Layout & Core Navigation
import { Sidebar, NavSection } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';

// Module 1: Clientes
import { ClientsView } from './components/Clients/ClientsView';
// Ficha cadastral do cliente, usada de forma independente do módulo Carteira de Clientes —
// ver "abrir ficha" em Empresas Atreladas (Farma Aéreo/Rodoviário) e no Dashboard Geral, pra
// quem tem acesso a essas telas mas não ao módulo inteiro de Clientes.
import { ClientDetailModal } from './components/Clients/ClientDetailModal';
import { ClientFormModal } from './components/Clients/ClientFormModal';
import { ClientInteractionModal } from './components/Clients/ClientInteractionModal';
import { PropostaComercialModal } from './components/Clients/PropostaComercialModal';

// Module 2: Farma Aéreo
import { FarmaAereoView } from './components/FarmaAereo/FarmaAereoView';

// Module 3: Farma Rodoviário
import { FarmaRodoviarioView } from './components/FarmaRodoviario/FarmaRodoviarioView';

// Module 5: Projetos Gerenciais
import { ProjetosView } from './components/Projetos/ProjetosView';
import { ControladoriaView } from './components/Controladoria/ControladoriaView';

// Module 4: Departamento Pessoal
import { EmployeeList } from './components/Employees/EmployeeList';
import { EmployeeFormModal } from './components/Employees/EmployeeFormModal';
import { AvisoAberturaModal } from './components/Common/AvisoAberturaModal';
import { EmployeeDetailModal } from './components/Employees/EmployeeDetailModal';
import { DismissalModal } from './components/Employees/DismissalModal';
import { MonthlyCostView } from './components/Cost/MonthlyCostView';
import { VacationView } from './components/Vacation/VacationView';
import { ValeAlimentacaoView } from './components/Vacation/ValeAlimentacaoView';
import { OccurrencesView } from './components/Occurrences/OccurrencesView';
import { PublicOccurrenceForm } from './components/Occurrences/PublicOccurrenceForm';
import { PublicOccurrencePortal } from './components/Occurrences/PublicOccurrencePortal';
import { PublicInstrucaoForm } from './components/Instrucoes/PublicInstrucaoForm';
import { FichaCadastralPublicView } from './components/Employees/FichaCadastralPublicView';
import { OccurrenceLinkModal } from './components/Occurrences/OccurrenceLinkModal';
import { AnvisaExamsView } from './components/Health/AnvisaExamsView';
import { OnboardingView } from './components/Onboarding/OnboardingView';
import { SettingsView } from './components/Settings/SettingsView';
import { BirthdaysView } from './components/Birthdays/BirthdaysView';
import { CandidateAdmissionPortal } from './components/Admission/CandidateAdmissionPortal';
import { AdmissionLinkModal } from './components/Admission/AdmissionLinkModal';
import { PreAdmissionsManagerView } from './components/Admission/PreAdmissionsManagerView';
import { AgendaGestaoView } from './components/Agenda/AgendaGestaoView';
import { atividadeOcorreEm, podeVerAtividade } from './components/Agenda/agendaUtils';
import {
  podeVerRegistroCompartilhado,
  podeVerSecaoDp,
  primeiraSecaoDpPermitida,
  filtrarColaboradoresDoSupervisor,
  filtrarClientesDoSupervisor,
  temAcessoGeralDp,
} from './utils/visibilidadeUtils';
import { NotasView } from './components/Notas/NotasView';
import { InstrucoesTrabalhoView } from './components/Instrucoes/InstrucoesTrabalhoView';
import { GeneralDashboard } from './components/DashboardGeral/GeneralDashboard';
import { CustoOperacionalFormModal } from './components/Cost/CustoOperacionalFormModal';

// Module 6: Logins & Acessos
import { UsuariosView } from './components/Usuarios/UsuariosView';
import { SwitchUserModal } from './components/Usuarios/SwitchUserModal';
import { UsuarioFormModal } from './components/Usuarios/UsuarioFormModal';
import { INITIAL_USERS_DATA } from './data/initialUsersData';
import {
  getUsuarios,
  saveUsuario,
  deleteUsuario,
  vincularContaAutenticadaSeNecessario,
  convidarUsuarioPorEmail,
} from './utils/usuariosApi';
import { ShieldAlert } from 'lucide-react';
import { supabase } from './utils/supabaseClient';

// Module: Chat Interno (conversas diretas e em grupo entre Logins & Acessos)
import { ChatView } from './components/Chat/ChatView';
import {
  getConversasDoUsuario,
  getUltimasLeituras,
  marcarConversaComoLida,
  obterOuCriarConversaDireta,
  criarConversaGrupo,
  enviarMensagem,
  excluirConversa,
  assinarMensagensNovas,
  AnexoMensagemChat,
} from './utils/chatApi';
import { playNotificationSound } from './utils/notificationSound';

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
    if (initialMod === 'agenda') return 'agenda_gestao';
    if (initialMod === 'controladoria') return 'controladoria';
    if (initialMod === 'chat') return 'chat';
    if (initialMod === 'notas') return 'notas';
    if (initialMod === 'instrucoes') return 'instrucoes';
    if (initialMod === 'usuarios') return 'usuarios';
    if (initialMod === 'dp') {
      // primeiraSecaoDpPermitida depende do usuário logado (secoesDpPermitidas) — nesse ponto
      // do código o state `currentUser` ainda não existe (é declarado mais abaixo), então lê
      // direto do localStorage, do mesmo jeito que o próprio initializer de currentUser faz.
      // Sem isso, alguém com DP restrito a seções sem 'dashboard' (ex.: só Ocorrências) abriria
      // o sistema numa seção que nem pode ver, e a tela ficaria em branco.
      try {
        const savedId = localStorage.getItem('jmt_current_user_id');
        const s = localStorage.getItem('jmt_usuarios_logins');
        const storedUsers: UsuarioLogin[] = s ? JSON.parse(s) : INITIAL_USERS_DATA;
        const found = savedId ? storedUsers.find((u: UsuarioLogin) => u.id === savedId) : undefined;
        return primeiraSecaoDpPermitida(found);
      } catch {
        return 'dashboard';
      }
    }
    return 'dashboard';
  });
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  // Menu lateral retrátil (só afeta telas grandes) — preferência de cada navegador/dispositivo,
  // não precisa ir pro banco: só quem usa aquele computador vê a barra recolhida ou não.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jmt_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const handleToggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('jmt_sidebar_collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

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

  // Quem REALMENTE fez login (Supabase Auth) — diferente de `currentUser`, que muda ao usar
  // "Trocar de Login" pra simular outro perfil. Um admin simulando um supervisor não pode
  // perder a capacidade de voltar a ser admin só porque currentUser.role não é mais 'admin'
  // nesse momento — os controles de "quem pode trocar" (ver onOpenSwitchUserModal abaixo)
  // checam ESTE valor, não o currentUser simulado. Preenchido só dentro de loadUsuarios.
  const [usuarioAutenticadoReal, setUsuarioAutenticadoReal] = useState<UsuarioLogin | undefined>(undefined);

  // Espelha currentUser pra loadUsuarios() poder ler o valor MAIS RECENTE de forma síncrona,
  // sem depender de quando o React decide rodar o updater de setCurrentUser(prev => ...) — essa
  // suposição (que o updater roda antes da linha seguinte) é falsa fora de um handler de evento
  // React, e causava usuarioEscolhido voltar undefined pro chamador mesmo já tendo calculado a
  // pessoa certa por dentro. Quebrava o carregamento do Chat Interno pra qualquer login que nunca
  // passa pelo caminho alternativo de "Trocar Usuário" (que recarrega o Chat por fora disso).
  const currentUserRef = useRef<UsuarioLogin | undefined>(undefined);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Logins & Acessos agora mora no Supabase (compartilhado entre navegadores/dispositivos) em
  // vez de só no localStorage deste — ver migração 012 e usuariosApi.ts. Os useState acima
  // continuam lendo do localStorage só pra ter algo pra mostrar instantaneamente antes dessa
  // busca terminar; loadUsuarios() abaixo substitui esse valor pelo dado real assim que chega.
  const loadUsuarios = useCallback(async (): Promise<UsuarioLogin | null> => {
    try {
      let lista = await getUsuarios();
      if (lista.length === 0) {
        // Primeira vez usando o Supabase pra isso — migra o que já existir neste navegador (ou
        // os dados de fábrica) uma única vez, pra não perder configuração já feita por aqui.
        let base: UsuarioLogin[] = INITIAL_USERS_DATA;
        try {
          const saved = localStorage.getItem('jmt_usuarios_logins');
          if (saved) base = JSON.parse(saved);
        } catch {
          // ignora — usa os dados de fábrica
        }
        await Promise.all(base.map((u) => saveUsuario(u)));
        lista = await getUsuarios();
      }
      // Vincula a conta autenticada (Supabase Auth) ao cadastro certo por e-mail, se ainda não
      // tiver vínculo (ver comentário na própria função).
      lista = await vincularContaAutenticadaSeNecessario(lista);
      setUsers(lista);

      // Fase 2 do login real por pessoa: quem é o currentUser TEM que ser a pessoa realmente
      // autenticada (Supabase Auth), nunca um perfil só "lembrado" neste navegador — sem isso,
      // qualquer convite aceito num navegador novo (sem jmt_current_user_id salvo ainda) caía
      // no primeiro usuário da lista (o admin mais antigo), dando acesso total a quem tinha
      // acabado de entrar com login próprio (bug real, reportado por um supervisor recém-
      // convidado). Um savedId só é usado como preferência quando NENHUM cadastro bate com a
      // sessão autenticada (ex.: ainda sem authUserId vinculado por algum motivo).
      const { data: sessionData } = await supabase.auth.getSession();
      const authUserIdReal = sessionData.session?.user?.id;
      const emailReal = (sessionData.session?.user?.email || '').trim().toLowerCase();
      const usuarioReal = authUserIdReal
        ? lista.find((u) => u.authUserId === authUserIdReal) ||
          (emailReal ? lista.find((u) => (u.email || '').trim().toLowerCase() === emailReal) : undefined)
        : undefined;
      setUsuarioAutenticadoReal(usuarioReal);

      // Calculado como valor comum (não dentro do updater de setCurrentUser) — o updater de
      // setState pode rodar depois da linha seguinte fora de um handler de evento React, então
      // ler currentUserRef.current aqui (em vez do `prev` de um setCurrentUser(prev => ...)) é o
      // que garante que o valor devolvido pra quem chamou loadUsuarios() é sempre o mesmo que
      // foi realmente aplicado como currentUser — sem isso, o Chat Interno nunca carregava pra
      // ninguém que só passa por aqui (todo mundo, exceto quem também usa "Trocar Usuário").
      let savedId: string | null = null;
      try {
        savedId = localStorage.getItem('jmt_current_user_id');
      } catch {
        // ignora
      }
      const usuarioEscolhido: UsuarioLogin =
        usuarioReal ||
        lista.find((u) => u.id === (savedId || currentUserRef.current?.id)) ||
        lista[0] ||
        (currentUserRef.current as UsuarioLogin);
      setCurrentUser(usuarioEscolhido);
      return usuarioEscolhido;
    } catch (err) {
      console.error('Erro ao carregar Logins & Acessos (Supabase):', err);
      showToast('Não foi possível carregar os logins do Supabase — usando os dados salvos neste navegador.', 'info');
      return null;
    }
  }, []);

  // Chat Interno — carrega as conversas e as últimas leituras do usuário informado. Separado de
  // loadGestaoData porque é dado POR PESSOA (muda ao trocar de usuário), não global.
  const loadChatData = useCallback(async (usuarioId: string) => {
    try {
      const [conversas, leituras] = await Promise.all([
        getConversasDoUsuario(usuarioId),
        getUltimasLeituras(usuarioId),
      ]);
      setConversasChat(conversas);
      setUltimasLeiturasChat(leituras);
    } catch (err) {
      console.error('Erro ao carregar Chat Interno (Supabase):', err);
      showToast('Não foi possível carregar as conversas do Chat Interno.', 'info');
    }
  }, []);

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
  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[]>([]);
  // Chat Interno — só as conversas do usuário atual e a última leitura de cada uma (pro badge de
  // não lidas); as mensagens de uma conversa aberta ficam no estado local do ChatView.
  const [conversasChat, setConversasChat] = useState<ConversaChat[]>([]);
  const [ultimasLeiturasChat, setUltimasLeiturasChat] = useState<Record<string, string | null>>({});
  // Item alvo de uma menção clicada no Chat (@nota/@atividade/@projeto) — a tela do módulo
  // correspondente usa isso pra abrir o item específico assim que é montada/atualizada.
  // "sinal" muda a cada clique, mesmo pro mesmo item, pra forçar reabrir o detalhe.
  const [mencaoAlvo, setMencaoAlvo] = useState<{
    tipo: 'nota' | 'atividade' | 'projeto';
    id: string;
    sinal: number;
  } | null>(null);
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
  // Dados desse formulário público — quem preenche não tem login (papel "anon" do Supabase),
  // então NÃO dá pra usar os states normais (colaboradores/supervisores/empregadores logo
  // abaixo): aquelas tabelas só liberam leitura pra usuário autenticado, e "anon" simplesmente
  // recebe 0 linhas de volta, sem erro nenhum — é por isso que o formulário carregava com os
  // campos de seleção vazios. Estas 3 listas vêm de funções públicas dedicadas (só os campos
  // não sensíveis — ver getSupervisoresPublico/getColaboradoresAtivosPublico/
  // getEmpregadoresPublico em dpApi.ts), carregadas só quando o portal é aberto.
  const [supervisoresPublico, setSupervisoresPublico] = useState<SupervisorPublico[]>([]);
  const [colaboradoresPublico, setColaboradoresPublico] = useState<ColaboradorPublico[]>([]);
  const [empregadoresPublico, setEmpregadoresPublico] = useState<EmpregadorPublico[]>([]);

  // Public work-instruction (Instrução de Trabalho) filling portal — via ?form=instrucao&id=...
  const [isInstrucaoPortalView, setIsInstrucaoPortalView] = useState<boolean>(false);
  const [instrucaoUrlParams, setInstrucaoUrlParams] = useState<{ id?: string }>({});

  // Public shared Ficha Cadastral view (read-only, sem login) — via ?form=ficha&token=...
  const [isFichaCadastralPublicaView, setIsFichaCadastralPublicaView] = useState<boolean>(false);
  const [fichaCadastralPublicaToken, setFichaCadastralPublicaToken] = useState<string | undefined>(undefined);

  // Modals State
  const [isAvisoAberturaOpen, setIsAvisoAberturaOpen] = useState<boolean>(false);
  const [dadosIniciaisCarregados, setDadosIniciaisCarregados] = useState<boolean>(false);
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState<boolean>(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [selectedColaboradorDetail, setSelectedColaboradorDetail] = useState<Colaborador | null>(null);
  // Ficha cadastral de cliente aberta de fora do módulo Carteira de Clientes (Empresas
  // Atreladas do Farma Aéreo/Rodoviário, Dashboard Geral) — quem não tem acesso ao módulo
  // 'clientes' inteiro ainda precisa conseguir ver/editar o cadastro das empresas que já
  // aparecem pra ele nessas telas. Espelha o mesmo padrão do selectedColaboradorDetail acima.
  const [fichaClienteSelecionado, setFichaClienteSelecionado] = useState<Cliente | null>(null);
  const [fichaClienteEmEdicao, setFichaClienteEmEdicao] = useState<Cliente | null>(null);
  const [fichaClienteInteracao, setFichaClienteInteracao] = useState<Cliente | null>(null);
  const [fichaClienteProposta, setFichaClienteProposta] = useState<Cliente | null>(null);
  const [dismissalTargetColaborador, setDismissalTargetColaborador] = useState<Colaborador | null>(null);
  const [isPublicOccurrenceFormOpen, setIsPublicOccurrenceFormOpen] = useState<boolean>(false);
  const [isAdmissionLinkModalOpen, setIsAdmissionLinkModalOpen] = useState<boolean>(false);
  const [isOccurrenceLinkModalOpen, setIsOccurrenceLinkModalOpen] = useState<boolean>(false);
  // Modal de "Vincular Empresas / Alocar Equipe" do Farma Aéreo e Farma Rodoviário — vive aqui
  // (em vez de local a cada painel) pra poder ser acionado tanto pelas abas internas de cada
  // setor quanto pelo atalho suspenso no menu lateral, abaixo do botão do módulo.
  const [sectorLinkModal, setSectorLinkModal] = useState<{
    setor: SetorModuloId;
    mode: 'clientes' | 'colaboradores';
  } | null>(null);
  const [isCustoOperacionalModalOpen, setIsCustoOperacionalModalOpen] = useState<boolean>(false);
  const [selectedCustoEdit, setSelectedCustoEdit] = useState<CustoOperacional | null>(null);

  // Toast message state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    // Erro fica mais tempo na tela — geralmente carrega um detalhe técnico mais longo
    // (ex.: motivo de uma falha ao salvar), e a pessoa precisa de tempo pra ler ou printar.
    setTimeout(() => setToastMessage(null), type === 'error' ? 9000 : 3500);
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
    } else if (modId === 'controladoria') {
      setActiveSection('controladoria');
    } else if (modId === 'chat') {
      setActiveSection('chat');
    } else if (modId === 'notas') {
      setActiveSection('notas');
    } else if (modId === 'instrucoes') {
      setActiveSection('instrucoes');
    } else if (modId === 'usuarios') {
      setActiveSection('usuarios');
    } else if (modId === 'dp') {
      if (
        ['visao_geral', 'clientes', 'farma_aereo', 'farma_rodoviario', 'projetos', 'agenda_gestao', 'notas', 'usuarios'].includes(
          activeSection
        )
      ) {
        // Não assume 'dashboard' fixo — quem tem DP restrito sem essa seção liberada cairia
        // numa tela em branco (ver primeiraSecaoDpPermitida).
        setActiveSection(primeiraSecaoDpPermitida(currentUser));
      }
    }
  };

  // User Session & CRUD Handlers
  const handleSelectUserSession = (user: UsuarioLogin) => {
    // Segunda trava (a primeira é escondida o botão que abre o modal, ver onOpenSwitchUserModal
    // acima) — só quem REALMENTE logou como admin pode virar outra pessoa. Checa
    // usuarioAutenticadoReal, não currentUser: um admin simulando outro perfil continua sendo
    // admin de verdade e precisa conseguir trocar de volta (ou pra um terceiro perfil) mesmo
    // com currentUser.role já não sendo 'admin' durante a simulação.
    if (usuarioAutenticadoReal?.role !== 'admin') {
      showToast('Só administradores podem trocar de usuário.', 'error');
      return;
    }
    setCurrentUser(user);
    try {
      localStorage.setItem('jmt_current_user_id', user.id);
    } catch {}

    // Check if the current module is allowed for the newly selected user
    if (!user.modulosPermitidos.includes(activeGlobalModule)) {
      const fallbackModule = user.modulosPermitidos[0] || 'visao_geral';
      handleSelectGlobalModule(fallbackModule);
    }
    // Chat Interno é dado POR PESSOA — recarrega as conversas de quem acabou de "entrar".
    loadChatData(user.id);
    showToast(`Conectado como ${user.nome} (@${user.login})`, 'success');
  };

  const handleSaveUser = async (userToSave: UsuarioLogin) => {
    try {
      await saveUsuario(userToSave);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível salvar o login no Supabase. Verifique sua conexão.', 'error');
      return;
    }
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

  // Convite por e-mail (Opção B — login real por pessoa, fase "cadastro unificado"): quem tiver
  // role: 'admin' consegue disparar um convite pra pessoa criar a própria senha, sem passar
  // pelo painel do Supabase. A checagem de admin de verdade acontece no servidor (Edge Function
  // convidar-usuario); esta função aqui só chama e mostra o resultado.
  const handleEnviarConvite = async (email: string) => {
    try {
      await convidarUsuarioPorEmail(email);
      showToast(`Convite enviado para ${email}. A pessoa vai receber um e-mail pra definir a senha.`, 'success');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
      showToast(`Não foi possível enviar o convite: ${msg}`, 'error');
    }
  };

  // ============================================================================
  // CHAT INTERNO
  // ============================================================================
  const handleAbrirConversaChat = async (conversaId: string) => {
    if (!currentUser) return;
    try {
      await marcarConversaComoLida(conversaId, currentUser.id);
      setUltimasLeiturasChat((prev) => ({ ...prev, [conversaId]: new Date().toISOString() }));
    } catch (err) {
      console.error('Erro ao marcar conversa como lida:', err);
    }
  };

  const handleEnviarMensagemChat = async (conversaId: string, texto: string, anexo?: AnexoMensagemChat) => {
    if (!currentUser) return;
    try {
      await enviarMensagem(conversaId, currentUser.id, texto, anexo);
      const agora = new Date().toISOString();
      setConversasChat((prev) => prev.map((c) => (c.id === conversaId ? { ...c, atualizadoEm: agora } : c)));
      setUltimasLeiturasChat((prev) => ({ ...prev, [conversaId]: agora }));
    } catch (err) {
      console.error(err);
      showToast('Não foi possível enviar a mensagem. Verifique sua conexão.', 'error');
    }
  };

  // Menção a Nota/Atividade/Projeto dentro de uma mensagem do Chat Interno — leva pro módulo
  // certo e pede pra tela abrir o item específico assim que estiver montada.
  const handleAbrirMencaoChat = (tipo: 'nota' | 'atividade' | 'projeto', id: string) => {
    if (tipo === 'nota') {
      setActiveGlobalModule('notas');
      setActiveSection('notas');
    } else if (tipo === 'atividade') {
      setActiveGlobalModule('agenda');
      setActiveSection('agenda_gestao');
    } else {
      setActiveGlobalModule('projetos');
      setActiveSection('projetos');
    }
    setMencaoAlvo({ tipo, id, sinal: Date.now() });
    setIsMobileMenuOpen(false);
  };

  const handleCriarConversaDiretaChat = async (outroUsuarioId: string) => {
    if (!currentUser) return;
    try {
      await obterOuCriarConversaDireta(currentUser.id, outroUsuarioId);
      await loadChatData(currentUser.id);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível iniciar a conversa.', 'error');
    }
  };

  const handleExcluirConversaChat = async (conversaId: string) => {
    try {
      await excluirConversa(conversaId);
      setConversasChat((prev) => prev.filter((c) => c.id !== conversaId));
      setUltimasLeiturasChat((prev) => {
        const { [conversaId]: _removida, ...resto } = prev;
        return resto;
      });
      showToast('Conversa excluída.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível excluir a conversa. Tente novamente.', 'error');
    }
  };

  const handleCriarConversaGrupoChat = async (nome: string, participantesIds: string[]) => {
    if (!currentUser) return;
    try {
      await criarConversaGrupo(nome, currentUser.id, participantesIds);
      await loadChatData(currentUser.id);
      showToast(`Grupo "${nome}" criado!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Não foi possível criar o grupo.', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (users.length <= 1) {
      showToast('O sistema precisa manter ao menos um login cadastrado.', 'error');
      return;
    }
    const targetUser = users.find((u) => u.id === userId);
    try {
      await deleteUsuario(userId);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível excluir o login no Supabase. Verifique sua conexão.', 'error');
      return;
    }
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

  const handleToggleUserModuleAccess = async (userId: string, moduleId: GlobalModuleId) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const hasMod = target.modulosPermitidos.includes(moduleId);
    const updated: UsuarioLogin = {
      ...target,
      modulosPermitidos: hasMod
        ? target.modulosPermitidos.filter((m) => m !== moduleId)
        : [...target.modulosPermitidos, moduleId],
    };
    try {
      await saveUsuario(updated);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível atualizar o acesso ao módulo no Supabase.', 'error');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    if (userId === currentUser.id) {
      setCurrentUser(updated);
    }
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
      } else if (formParam === 'ficha' || hash === '#ficha') {
        setIsFichaCadastralPublicaView(true);
        setFichaCadastralPublicaToken(searchParams.get('token') || undefined);
      }
    }
  }, []);

  // Carrega os dados do Formulário Público de Ocorrências (ver comentário nos states
  // supervisoresPublico/colaboradoresPublico/empregadoresPublico acima) sempre que essa tela
  // for aberta — tanto pelo link público de verdade (isOccurrencePortalView) quanto pelo botão
  // "Testar Formulário" de dentro do sistema (activeSection === 'formulario_publico').
  useEffect(() => {
    if (isOccurrencePortalView || activeSection === 'formulario_publico') {
      Promise.all([getSupervisoresPublico(), getColaboradoresAtivosPublico(), getEmpregadoresPublico()])
        .then(([sups, colabs, emps]) => {
          setSupervisoresPublico(sups);
          setColaboradoresPublico(colabs);
          setEmpregadoresPublico(emps);
        })
        .catch((err) => {
          console.error('Erro ao carregar dados públicos do Formulário de Ocorrências:', err);
        });
    }
  }, [isOccurrencePortalView, activeSection]);

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
  // Não resta mais nenhuma entidade de negócio pra recarregar aqui — o último módulo
  // (Farma Rodoviário/viagens) migrou pro Supabase junto com todo o resto. Mantida como
  // no-op só porque o recurso de Backup/Importar ainda chama isso (ver task_3a1a9699 —
  // esse recurso precisa ser refeito pra buscar do Supabase, não é só recarregar daqui).
  const loadData = useCallback(() => {}, []);

  // Custos Operacionais, Projetos Gerenciais, Agenda da Gestão, Notas & Ideias, Instruções de
  // Trabalho e Farma Rodoviário (viagens) também já moram no Supabase — buscados à parte, de
  // forma assíncrona.
  const loadGestaoData = useCallback(async () => {
    try {
      const [custos, projetos, atividades, notas, instrucoes, viagens, orcamentosCarregados] = await Promise.all([
        getCustosOperacionais(),
        getProjetosGerenciais(),
        getAtividadesGestao(),
        getNotasPaginas(),
        getInstrucoesTrabalho(),
        getViagensRodoviarias(),
        getOrcamentos(),
      ]);
      setCustosOperacionais(custos);
      setProjetos(projetos);
      setAtividadesGestao(atividades);
      setNotasPaginas(notas);
      setInstrucoesTrabalho(instrucoes);
      setViagensRodoviarias(viagens);
      setOrcamentos(orcamentosCarregados);
    } catch (err) {
      console.error('Erro ao carregar Custos/Projetos/Agenda/Notas/Instruções/Viagens/Orçamentos (Supabase):', err);
      showToast('Não foi possível carregar alguns dados de gestão. Verifique sua conexão.', 'info');
    }
  }, []);

  // Departamento Pessoal já mora no Supabase (banco em nuvem) — essas 9 entidades são buscadas
  // à parte, de forma assíncrona. Erros aqui (ex.: sem internet, sessão expirada) viram um toast
  // em vez de travar a tela em branco.
  const loadDpData = useCallback(async () => {
    try {
      const [
        colabs, emps, sups, crgs, ferds, fer, ocos, quinz, lancs, preAdm,
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
        getPreAdmissoes(),
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
      setPreAdmissoes(preAdm);
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
    // Só libera o aviso de abertura (compromissos/prazos) depois que os dados de
    // Agenda da Gestão e Projetos (e o resto) já terminaram de chegar — evita disparar
    // o aviso com as listas ainda vazias por causa da requisição em andamento.
    Promise.all([loadDpData(), loadFarmaAereoData(), loadGestaoData(), loadUsuarios()]).then(
      ([, , , usuarioAtual]) => {
        setDadosIniciaisCarregados(true);
        // Só depois de saber quem é o usuário de verdade (loadUsuarios já resolveu o vínculo
        // salvo/local) — currentUser do state ainda não teria atualizado a tempo aqui.
        if (usuarioAtual) loadChatData(usuarioAtual.id);
      }
    );

    // Listen to cross-component storage changes
    const handleStorageUpdate = () => {
      loadData();
    };
    window.addEventListener(NOTIFICATION_EVENT, handleStorageUpdate);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleStorageUpdate);
  }, [loadData, loadDpData, loadFarmaAereoData, loadGestaoData, loadUsuarios, loadChatData]);

  // Ref só pra checar (dentro da assinatura em tempo real abaixo) se uma conversa já era minha,
  // sem precisar colocar conversasChat nas dependências do efeito — isso derrubaria e recriaria
  // a assinatura a cada mensagem nova (o próprio evento que ela escuta), com risco real de
  // perder uma mensagem chegando exatamente durante essa reconexão.
  const conversasChatRef = useRef<ConversaChat[]>([]);
  useEffect(() => {
    conversasChatRef.current = conversasChat;
  }, [conversasChat]);

  // Chat Interno em tempo real: uma mensagem nova em qualquer conversa (mesmo com a tela em
  // outro módulo) atualiza a data da conversa na lista — é o que faz ela subir no topo e o selo
  // de não lida aparecer, mesmo sem a Chat estar aberta. Assina uma vez só; usa a forma funcional
  // do setState pra nunca trabalhar com uma lista de conversas desatualizada.
  useEffect(() => {
    const cancelarInscricao = assinarMensagensNovas((msg) => {
      const jaEraMinha = conversasChatRef.current.some((c) => c.id === msg.conversaId);
      setConversasChat((prev) => {
        const pertence = prev.some((c) => c.id === msg.conversaId);
        if (!pertence) {
          // Mensagem de uma conversa que este navegador ainda não tinha carregado — o caso
          // mais comum é ser a PRIMEIRA mensagem de uma conversa nova, criada por quem enviou
          // (ex.: alguém manda uma mensagem direta pra você por iniciativa própria). Sem isso,
          // a conversa simplesmente nunca aparecia pra quem recebeu, até ele trocar de usuário
          // ou recarregar a página manualmente — parecia que a mensagem "não chegou".
          if (currentUser) loadChatData(currentUser.id);
          return prev;
        }
        return prev.map((c) => (c.id === msg.conversaId ? { ...c, atualizadoEm: msg.criadoEm } : c));
      });

      // Alerta visual (toast) de mensagem nova — a assinatura escuta TODA mensagem inserida no
      // sistema (o filtro de "é uma conversa minha?" é feito aqui, não no Supabase), então só
      // alerta quando a conversa já era conhecida como minha e não fui eu que mandei. Numa
      // conversa nova (1ª mensagem recebida), o loadChatData acima já traz o selo de não lida
      // na lista — sem alerta extra pra não duplicar antes dela nem existir localmente.
      if (currentUser && jaEraMinha && msg.autorId !== currentUser.id) {
        const autor = users.find((u) => u.id === msg.autorId);
        showToast(`💬 Nova mensagem${autor ? ` de ${autor.nome}` : ''} no Chat Interno`, 'info');
        playNotificationSound();
      }
    });
    return cancelarInscricao;
  }, [currentUser, loadChatData, users]);

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
  // Escopo "própria equipe/carteira" (currentUser.escopoApenasProprioSetor) — usado só nos
  // pontos de DP e Clientes que um supervisor de campo pode ver (ver visibilidadeUtils.ts).
  // Sem essa flag ligada, as 3 listas abaixo são idênticas às originais.
  const supervisorVinculado = useMemo(
    () => supervisores.find((s) => s.id === currentUser?.supervisorId),
    [supervisores, currentUser]
  );
  const colaboradoresEquipeVisiveis = useMemo(
    () =>
      filtrarColaboradoresDoSupervisor(
        colaboradores,
        currentUser?.escopoApenasProprioSetor ? currentUser.supervisorId : undefined
      ),
    [colaboradores, currentUser]
  );
  const clientesVisiveis = useMemo(
    () =>
      filtrarClientesDoSupervisor(
        clientes,
        currentUser?.escopoApenasProprioSetor ? supervisorVinculado?.nome : undefined
      ),
    [clientes, currentUser, supervisorVinculado]
  );
  const ocorrenciasEquipeVisiveis = useMemo(() => {
    if (!currentUser?.escopoApenasProprioSetor) return ocorrencias;
    const idsEquipe = new Set(colaboradoresEquipeVisiveis.map((c) => c.id));
    return ocorrencias.filter((o) => idsEquipe.has(o.colaboradorId));
  }, [ocorrencias, colaboradoresEquipeVisiveis, currentUser]);

  // Alertas Regulatórios (sino do cabeçalho) — são dados de RH/DP (exame ASO, férias,
  // documentos pendentes). Sem NENHUM acesso ao módulo DP, não faz sentido nenhum desses
  // alertas aparecer (ex.: um supervisor só de Farma Aéreo/Rodoviário via os 32 alertas da
  // empresa inteira, incluindo colaboradores que ele nem consegue abrir o cadastro). Cada
  // categoria também respeita a seção de DP correspondente (podeVerSecaoDp) e o escopo de
  // "própria equipe" (colaboradoresEquipeVisiveis), igual ao resto do sistema.
  const alertas: AlertaItem[] = useMemo(() => {
    const list: AlertaItem[] = [];
    if (!currentUser?.modulosPermitidos.includes('dp')) return list;

    // 1. ANVISA / RDC 430 ASO Exams Alerts
    if (podeVerSecaoDp(currentUser, 'saude')) {
      colaboradoresEquipeVisiveis.forEach((c) => {
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
    }

    // 2. Critical CLT Vacation Alerts
    if (podeVerSecaoDp(currentUser, 'ferias')) {
      feriasList.forEach((f) => {
        const colab = colaboradoresEquipeVisiveis.find((c) => c.id === f.colaboradorId);
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
    }

    // 3. Pending Documents / Onboarding Alerts
    if (podeVerSecaoDp(currentUser, 'colaboradores')) {
      colaboradoresEquipeVisiveis.forEach((c) => {
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
    }

    return list;
  }, [colaboradoresEquipeVisiveis, feriasList, currentUser]);

  // Atividades da Agenda da Gestão que o login atual pode ver — liberar o módulo pra alguém não
  // significa mais dar visão de tudo; ver podeVerAtividade em agendaUtils.ts. Usado aqui (badge
  // "hoje"), no aviso de abertura e na própria tela da Agenda, pra ficar tudo consistente.
  //
  // IMPORTANTE: o papel usado aqui é currentUser.role (o perfil ATIVO/simulado agora), nunca o
  // state global `userRole` do cabeçalho — aquele nunca é trocado por ninguém (o seletor que
  // deveria mudá-lo não existe de verdade na tela) e fica sempre 'admin' desde o carregamento
  // da página, o que fazia esse "vê só o que é seu" nunca valer pra ninguém, pra nenhum módulo
  // destes — bug real reportado: um supervisor via compromissos particulares de outra pessoa.
  const atividadesVisiveis = useMemo(
    () => atividadesGestao.filter((a) => podeVerAtividade(a, currentUser, currentUser.role)),
    [atividadesGestao, currentUser]
  );

  // Mesmo raciocínio da Agenda da Gestão, agora também em Projetos Gerenciais, Notas & Ideias e
  // Instruções de Trabalho — ver visibilidadeUtils.ts. Cada um usa seus próprios campos de texto
  // livre pra manter registros antigos (de antes dessa marcação existir) visíveis por nome.
  const projetosVisiveis = useMemo(
    () =>
      projetos.filter((p) =>
        podeVerRegistroCompartilhado({
          criadoPorUserId: p.criadoPorUserId,
          usuariosMarcadosIds: p.usuariosMarcadosIds,
          nomesTextoLivre: [p.liderProjetoNome, ...(p.equipeMembros || [])],
          currentUser,
          userRole: currentUser.role,
        })
      ),
    [projetos, currentUser]
  );

  const notasVisiveis = useMemo(
    () =>
      notasPaginas.filter((n) =>
        podeVerRegistroCompartilhado({
          criadoPorUserId: n.criadoPorUserId,
          usuariosMarcadosIds: n.usuariosMarcadosIds,
          nomesTextoLivre: [n.autor],
          currentUser,
          userRole: currentUser.role,
        })
      ),
    [notasPaginas, currentUser]
  );

  const instrucoesVisiveis = useMemo(
    () =>
      instrucoesTrabalho.filter((it) =>
        podeVerRegistroCompartilhado({
          criadoPorUserId: it.criadoPorUserId,
          usuariosMarcadosIds: it.usuariosMarcadosIds,
          nomesTextoLivre: [it.autor, it.responsavel, it.aprovadoPor],
          currentUser,
          userRole: currentUser.role,
        })
      ),
    [instrucoesTrabalho, currentUser]
  );

  // Métricas gerenciais do Farma Aéreo e Farma Rodoviário — mesmo cálculo usado dentro de
  // cada painel (SectorManagerialDashboard), recalculado aqui pra alimentar tanto os badges
  // de "Vincular Empresas"/"Alocar Equipe" quanto o "Relatório Gerencial" suspensos no menu
  // lateral, abaixo do botão de cada módulo.
  const lancamentosFarmaAereo = useMemo(
    () => lancamentosFaturamentoAereo.filter((l) => !ehModalRodoviario(l.modal)),
    [lancamentosFaturamentoAereo]
  );
  const lancamentosFarmaRodoviario = useMemo(
    () => lancamentosFaturamentoAereo.filter((l) => ehModalRodoviario(l.modal)),
    [lancamentosFaturamentoAereo]
  );
  const farmaAereoMetrics = useMemo(
    () =>
      calcFinancialsSetor(
        'farma_aereo',
        clientes,
        colaboradores,
        custosOperacionais,
        computeFaturamentoRealAereo(lancamentosFarmaAereo)
      ),
    [clientes, colaboradores, custosOperacionais, lancamentosFarmaAereo]
  );
  const farmaRodoviarioMetrics = useMemo(
    () =>
      calcFinancialsSetor(
        'farma_rodoviario',
        clientes,
        colaboradores,
        custosOperacionais,
        computeFaturamentoRealAereo(lancamentosFarmaRodoviario)
      ),
    [clientes, colaboradores, custosOperacionais, lancamentosFarmaRodoviario]
  );

  const handleOpenSectorLinkModal = (setor: SetorModuloId, mode: 'clientes' | 'colaboradores') => {
    setSectorLinkModal({ setor, mode });
  };

  const handleToggleClienteLinkSetor = (cliente: Cliente, vincular: boolean) => {
    if (!sectorLinkModal) return;
    handleSaveCliente(vincularClienteAoSetor(cliente, sectorLinkModal.setor, vincular));
  };

  const handleToggleColaboradorLinkSetor = (colaborador: Colaborador, vincular: boolean) => {
    if (!sectorLinkModal) return;
    handleSaveColaborador(vincularColaboradorAoSetor(colaborador, sectorLinkModal.setor, vincular));
  };

  const handleExportSectorReport = (setor: SetorModuloId) => {
    gerarRelatorioGerencialSetorCSV(setor === 'farma_aereo' ? farmaAereoMetrics : farmaRodoviarioMetrics);
  };

  // Sidebar badge counters
  const sidebarCounts = useMemo(() => {
    // Escopo "própria equipe/carteira" (colaboradoresEquipeVisiveis/clientesVisiveis/
    // ocorrenciasEquipeVisiveis, calculados acima) — os badges do menu lateral (módulos e
    // sub-itens de DP) usam os MESMOS dados que as telas de verdade mostram pra esse login,
    // senão um supervisor restrito veria aqui o headcount/carteira da empresa inteira mesmo
    // sem conseguir abrir o cadastro de ninguém fora da própria equipe.
    const ativos = colaboradoresEquipeVisiveis.filter((c) => c.status !== 'Inativo').length;
    const examesVencendo = colaboradoresEquipeVisiveis.filter((c) => {
      if (c.status === 'Inativo') return false;
      const st = calcExamStatus(c.dataVencimentoExame);
      return st === 'Vencido' || st === 'A vencer';
    }).length;

    const idsEquipeParaFerias = new Set(colaboradoresEquipeVisiveis.map((c) => c.id));
    const feriasCriticas = feriasList.filter(
      (f) => idsEquipeParaFerias.has(f.colaboradorId) && (f.status === 'Crítico' || f.status === 'Vencido')
    ).length;

    const docsPendentes = colaboradoresEquipeVisiveis.filter((c) => {
      if (c.status === 'Inativo') return false;
      return (c.documentos || []).some((d) => d.status === 'Pendente');
    }).length;

    const ocorrenciasAbertas = ocorrenciasEquipeVisiveis.filter((o) => o.status === 'Pendente').length;

    const onboardingPendente = colaboradoresEquipeVisiveis.filter((c) => {
      if (c.status === 'Inativo') return false;
      return (c.onboarding || []).some((item) => !item.concluido);
    }).length;

    const preAdmissoesPendentes = preAdmissoes.filter(
      (p) => p.status === 'Aguardando Revisão' || p.status === 'Pendente Documentos'
    ).length;

    const clientesAtivos = clientesVisiveis.filter((cl) => cl.status === 'Ativo').length;
    const embarquesAereosAtivos = embarquesAereos.filter((e) => e.status !== 'Entregue / Concluído').length;
    const viagensRodoviariasAtivas = viagensRodoviarias.filter((v) => v.status !== 'Viagem Concluída').length;
    // Empresas vinculadas a cada setor — mesmo número mostrado como "Empresas Atreladas"
    // dentro dos próprios painéis do Aéreo/Rodoviário. Usado no badge do menu lateral em
    // vez de embarques/viagens ativas (que hoje são sempre 0, sem dado real).
    const clientesFarmaAereo = clientesVisiveis.filter(isClienteFarmaAereo).length;
    const clientesFarmaRodoviario = clientesVisiveis.filter(isClienteFarmaRodoviario).length;
    // Equipe alocada em cada setor — junto com clientesFarmaAereo/clientesFarmaRodoviario
    // acima, alimenta os atalhos "Vincular Empresas"/"Alocar Equipe" suspensos no menu
    // lateral, abaixo do botão do módulo (antes ficavam soltos no topo de cada painel).
    const headcountFarmaAereo = colaboradoresEquipeVisiveis.filter((c) => c.status !== 'Inativo' && isColaboradorFarmaAereo(c)).length;
    const headcountFarmaRodoviario = colaboradoresEquipeVisiveis.filter((c) => c.status !== 'Inativo' && isColaboradorFarmaRodoviario(c)).length;
    const projetosAtivos = projetosVisiveis.length;
    const todayIso = new Date().toISOString().split('T')[0];
    const atividadesHoje = atividadesVisiveis.filter(
      (a) => atividadeOcorreEm(a, todayIso) && a.status !== 'Concluída' && a.status !== 'Cancelada'
    ).length;

    const conversasChatNaoLidas = conversasChat.filter((c) => {
      const ultima = ultimasLeiturasChat[c.id];
      return !ultima || c.atualizadoEm > ultima;
    }).length;

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
      clientesFarmaAereo,
      clientesFarmaRodoviario,
      headcountFarmaAereo,
      headcountFarmaRodoviario,
      projetosAtivos,
      atividadesHoje,
      conversasChatNaoLidas,
      totalLogins: users.length,
      notasCount: notasVisiveis.filter((n) => !n.arquivada).length,
      instrucoesCount: instrucoesVisiveis.filter((i) => !i.arquivada).length,
    };
  }, [
    colaboradoresEquipeVisiveis,
    feriasList,
    ocorrenciasEquipeVisiveis,
    preAdmissoes,
    clientesVisiveis,
    embarquesAereos,
    viagensRodoviarias,
    projetosVisiveis,
    atividadesVisiveis,
    notasVisiveis,
    instrucoesVisiveis,
    users,
    conversasChat,
    ultimasLeiturasChat,
  ]);

  // Dados do "Aviso de Abertura" (compromissos de hoje + prazos de projetos) — mesmo critério de
  // "hoje" usado no badge da Agenda acima, e projetos ativos (não Concluído/Cancelado) vencidos ou
  // com prazo dentro dos próximos 3 dias.
  const avisoAberturaData = useMemo(() => {
    const hojeIso = new Date().toISOString().split('T')[0];
    const atividadesHoje = atividadesVisiveis.filter(
      (a) => atividadeOcorreEm(a, hojeIso) && a.status !== 'Concluída' && a.status !== 'Cancelada'
    );

    const projetosAtivos = projetosVisiveis.filter((p) => p.status !== 'Concluído' && p.status !== 'Cancelado');
    const limite = new Date();
    limite.setDate(limite.getDate() + 3);
    const limiteIso = limite.toISOString().split('T')[0];
    const projetosAtrasados = projetosAtivos.filter((p) => p.dataPrevisaoFim && p.dataPrevisaoFim < hojeIso);
    const projetosProximos = projetosAtivos.filter(
      (p) => p.dataPrevisaoFim && p.dataPrevisaoFim >= hojeIso && p.dataPrevisaoFim <= limiteIso
    );

    return { atividadesHoje, projetosAtrasados, projetosProximos };
  }, [atividadesVisiveis, projetosVisiveis]);

  // Dispara o aviso automaticamente uma vez por dia, assim que os dados terminam de carregar —
  // só o aviso dentro do sistema (sem e-mail/WhatsApp automático, por escolha explícita do usuário).
  useEffect(() => {
    if (!dadosIniciaisCarregados) return;
    const hojeIso = new Date().toISOString().split('T')[0];
    let ultimaVisualizacao: string | null = null;
    try {
      ultimaVisualizacao = localStorage.getItem('jmt_aviso_abertura_ultima_data');
    } catch {
      // localStorage indisponível — sem persistência, mostra a cada abertura.
    }
    if (ultimaVisualizacao === hojeIso) return;

    const { atividadesHoje, projetosAtrasados, projetosProximos } = avisoAberturaData;
    if (atividadesHoje.length > 0 || projetosAtrasados.length > 0 || projetosProximos.length > 0) {
      setIsAvisoAberturaOpen(true);
    }
    try {
      localStorage.setItem('jmt_aviso_abertura_ultima_data', hojeIso);
    } catch {
      // ignora — não é crítico
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dadosIniciaisCarregados]);

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
  const handleSaveProjeto = async (proj: ProjetoGerencial) => {
    // Carimba quem criou (só na primeira vez) pra podeVerRegistroCompartilhado saber quem, além
    // de admin e quem for marcado, enxerga este projeto — mesma regra da Agenda da Gestão.
    const registro: ProjetoGerencial = {
      ...proj,
      criadoPorUserId: proj.criadoPorUserId || currentUser?.id,
    };
    await saveProjetoGerencial(registro);
    await loadGestaoData();
    showToast(`Projeto "${proj.titulo}" salvo com sucesso!`, 'success');
  };

  // Salva direto no state local em vez de recarregar tudo (loadGestaoData) — evita o mesmo
  // problema já corrigido em handleSaveColaborador/handleSaveLancamentoVA: como o campo de
  // orçamento salva no onBlur (potencialmente vários seguidos ao editar linha por linha), um
  // reload no meio do caminho podia mostrar um toast de erro por cima de um salvamento que na
  // verdade deu certo.
  const handleSaveOrcamento = async (item: OrcamentoItem) => {
    try {
      await saveOrcamentoItem(item);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível salvar o orçamento. Verifique sua conexão.', 'error');
      return;
    }
    setOrcamentos((prev) =>
      prev.some((o) => o.id === item.id) ? prev.map((o) => (o.id === item.id ? item : o)) : [...prev, item]
    );
    showToast('Orçamento atualizado.', 'success');
  };

  const handleDeleteProjeto = async (id: string) => {
    await deleteProjetoGerencial(id);
    await loadGestaoData();
    showToast('Projeto removido do portfólio.', 'info');
  };

  const handleUpdateProjetoStatus = async (id: string, newStatus: StatusProjeto) => {
    await updateProjetoStatus(id, newStatus);
    await loadGestaoData();
    showToast(`Status do projeto atualizado para "${newStatus}".`, 'success');
  };

  // Agenda Gestão Handlers
  const handleSaveAtividadeGestao = async (item: AtividadeGestao) => {
    // Carimba quem criou (só na primeira vez — edições preservam o criador original) pra
    // podeVerAtividade (agendaUtils.ts) saber quem, além de admin e quem for marcado, enxerga
    // esta atividade na Agenda da Gestão.
    const registro: AtividadeGestao = {
      ...item,
      criadoPorUserId: item.criadoPorUserId || currentUser?.id,
    };
    await saveAtividadeGestao(registro);
    await loadGestaoData();
    showToast(`Atividade "${item.titulo}" salva na agenda da gestão!`, 'success');
  };

  const handleDeleteAtividadeGestao = async (id: string) => {
    await deleteAtividadeGestao(id);
    await loadGestaoData();
    showToast('Atividade removida da agenda.', 'info');
  };

  const handleUpdateAtividadeStatus = async (id: string, newStatus: StatusAtividadeGestao) => {
    await updateAtividadeStatus(id, newStatus);
    await loadGestaoData();
    showToast(`Status da atividade atualizado para "${newStatus}".`, 'success');
  };

  // Notas & Ideias Handlers
  const handleSaveNotaPagina = async (pagina: NotaPagina) => {
    // Mesma regra de visibilidade da Agenda da Gestão — ver visibilidadeUtils.ts.
    const registro: NotaPagina = {
      ...pagina,
      criadoPorUserId: pagina.criadoPorUserId || currentUser?.id,
    };
    await saveNotaPagina(registro);
    await loadGestaoData();
  };

  const handleDeleteNotaPagina = async (id: string) => {
    await deleteNotaPagina(id);
    await loadGestaoData();
    showToast('Página removida das Notas.', 'info');
  };

  // Instruções de Trabalho Handlers
  const handleSaveInstrucaoTrabalho = async (instrucao: InstrucaoTrabalho) => {
    // Mesma regra de visibilidade da Agenda da Gestão — ver visibilidadeUtils.ts.
    const registro: InstrucaoTrabalho = {
      ...instrucao,
      criadoPorUserId: instrucao.criadoPorUserId || currentUser?.id,
    };
    await saveInstrucaoTrabalho(registro);
    await loadGestaoData();
  };

  const handleDeleteInstrucaoTrabalho = async (id: string) => {
    await deleteInstrucaoTrabalho(id);
    await loadGestaoData();
    showToast('Instrução de trabalho removida.', 'info');
  };

  const handleUpdateDeliberacoes = async (id: string, deliberacoes: ItemDeliberacaoAta[]) => {
    const target = atividadesGestao.find((a) => a.id === id);
    if (target) {
      await saveAtividadeGestao({ ...target, deliberacoes });
      await loadGestaoData();
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
    } catch (err) {
      console.error(err);
      // Deixa o formulário aberto (não fecha em caso de erro) — o EmployeeFormModal
      // só fecha quando isEmployeeFormOpen vira false, o que só acontece no sucesso abaixo.
      // O motivo técnico (err.message) vai junto na mensagem — sem isso, "não foi possível
      // salvar" sozinho não dá pra saber se é payload grande demais, timeout, RLS etc.,
      // e sem acesso ao Supabase/console do usuário essa é a única forma de diagnosticar.
      const motivo = err instanceof Error ? err.message : String(err);
      showToast(
        `Não foi possível salvar o colaborador — verifique sua conexão (anexos grandes podem demorar ou falhar em conexões lentas) e tente novamente. Detalhe técnico: ${motivo}`,
        'error'
      );
      return;
    }

    // A gravação já está confirmada no banco a partir daqui — fecha o modal, avisa o
    // sucesso e atualiza SÓ este registro direto no estado local (salvar um colaborador
    // não muda nenhuma das outras 9 entidades de DP, então não há por que buscar tudo de
    // novo). Antes, um `loadDpData()` era chamado aqui: se essa busca falhasse (ex.:
    // instabilidade momentânea de rede logo após a gravação), aparecia um toast azul de
    // "não foi possível carregar" por cima do de sucesso — mesmo com o cadastro já salvo,
    // e a lista continuava com os dados antigos em memória, dando a falsa impressão de
    // que a edição tinha se perdido.
    setColaboradores((prev) =>
      prev.some((c) => c.id === colab.id) ? prev.map((c) => (c.id === colab.id ? colab : c)) : [colab, ...prev]
    );
    setIsEmployeeFormOpen(false);
    showToast(`Colaborador ${colab.nomeCompleto} salvo com sucesso!`);
  };

  const handleDeleteColaborador = async (id: string) => {
    try {
      await deleteColaborador(id);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível excluir o colaborador. Tente novamente.', 'error');
      return;
    }
    // Mesmo raciocínio do salvar (ver handleSaveColaborador): atualiza só a lista local
    // em vez de depender de um loadDpData() que busca as outras 9 entidades de DP à toa
    // e pode mascarar a confirmação de sucesso com seu próprio toast de erro de rede.
    setColaboradores((prev) => prev.filter((c) => c.id !== id));
    if (selectedColaboradorDetail?.id === id) {
      setSelectedColaboradorDetail(null);
    }
    showToast('Colaborador excluído com sucesso.');
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
        diasFerias,
        feriados
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
        // Recalcula já aqui (não só no map seguinte) — precisa entrar na comparação de "mudou
        // algo?" abaixo, senão um feriado cadastrado depois do lançamento existir nunca reflete
        // no "Sincronizar" quando faltas/diasFerias/valorDiaria continuam iguais.
        const quantidadeDiarias = calcQuantidadeDiariasVA(
          quinzena.dataInicio,
          quinzena.dataTermino,
          faltas,
          diasFerias,
          feriados
        );
        return { l, faltas, diasFerias, valorDiaria, quantidadeDiarias };
      })
      .filter(
        ({ l, faltas, diasFerias, valorDiaria, quantidadeDiarias }) =>
          faltas !== l.faltas ||
          diasFerias !== (l.diasFerias || 0) ||
          valorDiaria !== l.valorDiaria ||
          quantidadeDiarias !== l.quantidadeDiarias
      )
      .map(({ l, faltas, diasFerias, valorDiaria, quantidadeDiarias }) => {
        alterados++;
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

  // Os campos de Faltas/Dias de Férias na tela de Vale Alimentação salvam a cada tecla digitada
  // (ver handleFaltasChange/handleDiasFeriasChange em ValeAlimentacaoView.tsx) — chamar
  // loadDpData() (recarrega as 10 entidades de DP) a cada uma dessas gravações deixava a tela
  // instável: o campo controlado (value={l.faltas}) ficava sendo substituído por uma resposta
  // de rede toda hora, no meio de o usuário ainda estar digitando o número, dando a impressão de
  // "digito e não aparece". Agora atualiza só este lançamento no estado local.
  const handleSaveLancamentoVA = async (lancamento: LancamentoValeAlimentacao) => {
    try {
      await saveLancamentoValeAlimentacao(lancamento);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível salvar o lançamento. Verifique sua conexão.', 'error');
      return;
    }
    setLancamentosVA((prev) =>
      prev.some((l) => l.id === lancamento.id)
        ? prev.map((l) => (l.id === lancamento.id ? lancamento : l))
        : [...prev, lancamento]
    );
  };

  const handleDeleteLancamentoVA = async (id: string) => {
    try {
      await deleteLancamentoValeAlimentacao(id);
    } catch (err) {
      console.error(err);
      showToast('Não foi possível excluir o lançamento. Tente novamente.', 'error');
      return;
    }
    setLancamentosVA((prev) => prev.filter((l) => l.id !== id));
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
  const handleUpdatePreAdmissaoStatus = async (id: string, status: StatusPreAdmissao, motivoRecusa?: string) => {
    await updatePreAdmissaoStatus(id, status, motivoRecusa);
    await loadDpData();
    showToast(`Status da pré-admissão atualizado para: ${status}`);
  };

  const handleDeletePreAdmissao = async (id: string) => {
    await deletePreAdmissao(id);
    await loadDpData();
    showToast('Ficha de pré-admissão removida.', 'info');
  };

  const handleEfetivarAdmissao = async (preAdmissaoId: string) => {
    const pre = await getPreAdmissaoById(preAdmissaoId);
    if (!pre) return;
    try {
      const colab = await efetivarPreAdmissao(pre, {
        empregadorId: pre.empresaPredefinidaId,
        funcaoCargo: pre.cargoPredefinido,
        supervisorId: pre.supervisorPredefinidoId,
      });
      await updatePreAdmissaoStatus(preAdmissaoId, 'Aprovado', `Efetivado como ${colab.codigoMatricula} em ${new Date().toLocaleDateString('pt-BR')}`);
      const preAtualizado = await getPreAdmissaoById(preAdmissaoId);
      if (preAtualizado) {
        await savePreAdmissao({ ...preAtualizado, colaboradorEfetivadoId: colab.id });
      }
      await loadDpData();
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

  // Ficha cadastral do cliente aberta fora do módulo Carteira de Clientes — mesma lógica de
  // ClientsView.tsx (edição, interação, mudança de status, proposta comercial), só que
  // acionável a partir de Empresas Atreladas/Dashboard Geral sem precisar do módulo inteiro.
  const handleAbrirFichaCliente = (cliente: Cliente) => setFichaClienteSelecionado(cliente);

  const handleEditarFichaCliente = (cliente: Cliente) => {
    setFichaClienteSelecionado(null);
    setFichaClienteEmEdicao(cliente);
  };

  const handleGerarPropostaFicha = (cliente: Cliente) => {
    setFichaClienteSelecionado(null);
    setFichaClienteProposta(cliente);
  };

  const handleSalvarInteracaoFicha = (clienteId: string, interacao: InteracaoCliente) => {
    const target = clientes.find((c) => c.id === clienteId);
    if (!target) return;
    const updated: Cliente = {
      ...target,
      interacoes: [interacao, ...(target.interacoes || [])],
      atualizadoEm: new Date().toISOString(),
    };
    handleSaveCliente(updated);
    if (fichaClienteSelecionado?.id === clienteId) setFichaClienteSelecionado(updated);
  };

  const handleAtualizarStatusFicha = (clienteId: string, newStatus: Cliente['status']) => {
    const target = clientes.find((c) => c.id === clienteId);
    if (!target) return;
    const updated: Cliente = { ...target, status: newStatus, atualizadoEm: new Date().toISOString() };
    handleSaveCliente(updated);
    if (fichaClienteSelecionado?.id === clienteId) setFichaClienteSelecionado(updated);
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
  const handleSaveViagemRodoviaria = async (viagem: ViagemRodoviaria) => {
    try {
      await saveViagemRodoviaria(viagem);
      await loadGestaoData();
      showToast(`Viagem rodoviária placa ${viagem.veiculoPlaca} salva com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao salvar viagem rodoviária (Supabase):', err);
      showToast('Não foi possível salvar a viagem. Verifique sua conexão.', 'error');
    }
  };

  const handleDeleteViagemRodoviaria = async (id: string) => {
    try {
      await deleteViagemRodoviaria(id);
      await loadGestaoData();
      showToast('Viagem rodoviária removida.', 'info');
    } catch (err) {
      console.error('Erro ao remover viagem rodoviária (Supabase):', err);
      showToast('Não foi possível remover a viagem. Verifique sua conexão.', 'error');
    }
  };

  // Custos Operacionais Handlers
  const handleSaveCustoOperacional = async (custo: CustoOperacional) => {
    await saveCustoOperacional(custo);
    await loadGestaoData();
    showToast(`Custo operacional "${custo.descricao}" salvo com sucesso!`, 'success');
  };

  const handleDeleteCustoOperacional = async (id: string) => {
    await deleteCustoOperacional(id);
    await loadGestaoData();
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
        colaboradores={colaboradoresPublico}
        supervisores={supervisoresPublico}
        empregadores={empregadoresPublico}
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

  // IF Public shared Ficha Cadastral view is active (via direct link, terceiro externo)
  if (isFichaCadastralPublicaView) {
    return (
      <FichaCadastralPublicView
        token={fichaCadastralPublicaToken}
        onAdminBack={() => {
          setIsFichaCadastralPublicaView(false);
          setActiveGlobalModule('dp');
          setActiveSection('colaboradores');
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
          else if (sec === 'controladoria') setActiveGlobalModule('controladoria');
          else if (sec === 'chat') setActiveGlobalModule('chat');
          else if (sec === 'notas') setActiveGlobalModule('notas');
          else if (sec === 'instrucoes') setActiveGlobalModule('instrucoes');
          else if (sec === 'usuarios') setActiveGlobalModule('usuarios');
          else setActiveGlobalModule('dp');
          setIsMobileMenuOpen(false);
        }}
        currentUser={currentUser}
        // Só quem REALMENTE fez login como admin pode "virar" outra pessoa — importante checar
        // usuarioAutenticadoReal (a identidade de verdade), não currentUser: senão, um admin
        // simulando outro perfil via "Trocar" perderia o próprio botão de trocar de volta, já
        // que currentUser.role deixaria de ser 'admin' enquanto a simulação estivesse ativa.
        onOpenSwitchUserModal={usuarioAutenticadoReal?.role === 'admin' ? () => setIsSwitchUserModalOpen(true) : undefined}
        userRole={userRole}
        onChangeRole={setUserRole}
        counts={sidebarCounts}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={handleToggleSidebarCollapsed}
        onOpenAdmissionLinkModal={() => setIsAdmissionLinkModalOpen(true)}
        onOpenOccurrenceLinkModal={() => setIsOccurrenceLinkModalOpen(true)}
        onOpenSectorLinkModal={handleOpenSectorLinkModal}
        onExportSectorReport={handleExportSectorReport}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-[padding] duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-72'}`}>
        {/* Top Header */}
        <Header
          onOpenMobile={() => setIsMobileMenuOpen(true)}
          currentSection={activeSection}
          userRole={userRole}
          currentUser={currentUser}
          onOpenSwitchUserModal={usuarioAutenticadoReal?.role === 'admin' ? () => setIsSwitchUserModalOpen(true) : undefined}
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
            else if (sec === 'controladoria') setActiveGlobalModule('controladoria');
            else if (sec === 'chat') setActiveGlobalModule('chat');
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
              className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 break-words animate-in slide-in-from-bottom-4 duration-200 ${
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
              projetos={projetosVisiveis}
              atividadesGestao={atividadesGestao}
              custosOperacionais={custosOperacionais}
              feriasList={feriasList}
              ocorrencias={ocorrencias}
              preAdmissoes={preAdmissoes}
              alertas={alertas}
              userRole={userRole}
              temAcessoGeralDp={temAcessoGeralDp(currentUser)}
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
              onSelectClienteDetail={handleAbrirFichaCliente}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE 1: GESTÃO DE CLIENTES */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'clientes' || activeSection === 'clientes') && (
            <ClientsView
              clientes={clientesVisiveis}
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
              onSelectClienteDetail={handleAbrirFichaCliente}
              onSelectColaboradorDetail={(c) => setSelectedColaboradorDetail(c)}
              onOpenLinkModal={(mode) => handleOpenSectorLinkModal('farma_aereo', mode)}
              userRole={userRole}
              currentUser={currentUser}
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
              onSelectClienteDetail={handleAbrirFichaCliente}
              onSelectColaboradorDetail={(c) => setSelectedColaboradorDetail(c)}
              onOpenLinkModal={(mode) => handleOpenSectorLinkModal('farma_rodoviario', mode)}
              userRole={userRole}
              currentUser={currentUser}
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
              projetos={projetosVisiveis}
              onSaveProjeto={handleSaveProjeto}
              onDeleteProjeto={handleDeleteProjeto}
              onUpdateProjetoStatus={handleUpdateProjetoStatus}
              supervisores={supervisores}
              colaboradores={colaboradores}
              usuarios={users}
              userRole={userRole}
              abrirProjetoId={mencaoAlvo?.tipo === 'projeto' ? mencaoAlvo.id : undefined}
              abrirProjetoSinal={mencaoAlvo?.tipo === 'projeto' ? mencaoAlvo.sinal : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE: AGENDA DA GESTÃO & GOVERNANÇA */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'agenda' || activeSection === 'agenda_gestao') && (
            <AgendaGestaoView
              atividades={atividadesVisiveis}
              supervisores={supervisores}
              colaboradores={colaboradores}
              usuarios={users}
              onSaveAtividade={handleSaveAtividadeGestao}
              onDeleteAtividade={handleDeleteAtividadeGestao}
              onStatusChange={handleUpdateAtividadeStatus}
              onUpdateDeliberacoes={handleUpdateDeliberacoes}
              abrirAtividadeId={mencaoAlvo?.tipo === 'atividade' ? mencaoAlvo.id : undefined}
              abrirAtividadeSinal={mencaoAlvo?.tipo === 'atividade' ? mencaoAlvo.sinal : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE: CONTROLADORIA (DRE GERENCIAL & ORÇADO x REALIZADO) */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'controladoria' || activeSection === 'controladoria') && (
            <ControladoriaView
              custosOperacionais={custosOperacionais}
              colaboradores={colaboradores}
              lancamentosFaturamentoAereo={lancamentosFaturamentoAereo}
              projetos={projetosVisiveis}
              orcamentos={orcamentos}
              userRole={userRole}
              onSaveOrcamento={handleSaveOrcamento}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE: CHAT INTERNO */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'chat' || activeSection === 'chat') && currentUser && (
            <ChatView
              usuarios={users}
              currentUserId={currentUser.id}
              conversas={conversasChat}
              ultimasLeituras={ultimasLeiturasChat}
              onAbrirConversa={handleAbrirConversaChat}
              onEnviarMensagem={handleEnviarMensagemChat}
              onCriarConversaDireta={handleCriarConversaDiretaChat}
              onCriarConversaGrupo={handleCriarConversaGrupoChat}
              onExcluirConversa={handleExcluirConversaChat}
              notas={notasVisiveis}
              atividades={atividadesVisiveis}
              projetos={projetosVisiveis}
              onAbrirMencao={handleAbrirMencaoChat}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE: NOTAS & IDEIAS (PÁGINAS ESTILO NOTION) */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'notas' || activeSection === 'notas') && (
            <NotasView
              usuarios={users}
              paginas={notasVisiveis}
              onSavePagina={handleSaveNotaPagina}
              onDeletePagina={handleDeleteNotaPagina}
              currentUserName={currentUser?.nome}
              onNavigateModule={handleSelectGlobalModule}
              clientes={clientes}
              colaboradores={colaboradores}
              projetos={projetosVisiveis}
              embarquesAereos={embarquesAereos}
              viagensRodoviarias={viagensRodoviarias}
              ocorrencias={ocorrencias}
              abrirPaginaId={mencaoAlvo?.tipo === 'nota' ? mencaoAlvo.id : undefined}
              abrirPaginaSinal={mencaoAlvo?.tipo === 'nota' ? mencaoAlvo.sinal : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* MODULE: INSTRUÇÕES DE TRABALHO (IT) */}
          {/* ========================================================================= */}
          {(activeGlobalModule === 'instrucoes' || activeSection === 'instrucoes') && (
            <InstrucoesTrabalhoView
              usuarios={users}
              instrucoes={instrucoesVisiveis}
              onSaveInstrucao={handleSaveInstrucaoTrabalho}
              onDeleteInstrucao={handleDeleteInstrucaoTrabalho}
              currentUserName={currentUser?.nome}
              onNavigateModule={handleSelectGlobalModule}
              clientes={clientes}
              colaboradores={colaboradores}
              projetos={projetosVisiveis}
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
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              onSelectUserSession={handleSelectUserSession}
              onToggleUserModuleAccess={handleToggleUserModuleAccess}
              onEnviarConvite={handleEnviarConvite}
              supervisores={supervisores}
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
                  {usuarioAutenticadoReal?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setIsSwitchUserModalOpen(true)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Alternar Usuário
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* ========================================================================= */}
          {/* MODULE 4: DEPARTAMENTO PESSOAL (DP) */}
          {/* ========================================================================= */}
          {activeGlobalModule === 'dp' && activeSection === 'dashboard' && podeVerSecaoDp(currentUser, 'dashboard') && (
            <Dashboard
              colaboradores={colaboradores}
              ferias={feriasList}
              ocorrencias={ocorrencias}
              alertas={alertas}
              userRole={userRole}
              temAcessoGeralDp={temAcessoGeralDp(currentUser)}
              onNavigate={setActiveSection}
              onSelectColaborador={(c) => setSelectedColaboradorDetail(c)}
              onOpenNovoColaborador={handleOpenNovoColaborador}
              onOpenAdmissionLink={() => setIsAdmissionLinkModalOpen(true)}
              onOpenNovaOcorrencia={() => setIsPublicOccurrenceFormOpen(true)}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'colaboradores' && podeVerSecaoDp(currentUser, 'colaboradores') && (
            <EmployeeList
              colaboradores={colaboradoresEquipeVisiveis.filter((c) => c.status !== 'Inativo')}
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

          {activeGlobalModule === 'dp' && activeSection === 'preadmissoes' && podeVerSecaoDp(currentUser, 'preadmissoes') && (
            <PreAdmissionsManagerView
              preAdmissoes={preAdmissoes}
              empregadores={empregadores}
              cargos={cargos}
              supervisores={supervisores}
              temAcessoGeralDp={temAcessoGeralDp(currentUser)}
              onOpenLinkGenerator={() => setIsAdmissionLinkModalOpen(true)}
              onEfetivarAdmissao={handleEfetivarAdmissao}
              onUpdateStatus={handleUpdatePreAdmissaoStatus}
              onDeletePreAdmissao={handleDeletePreAdmissao}
              onSelectColaboradorDetail={(c) => setSelectedColaboradorDetail(c)}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'arquivo' && podeVerSecaoDp(currentUser, 'arquivo') && (
            <EmployeeList
              colaboradores={colaboradores.filter((c) => c.status === 'Inativo')}
              apenasInativos
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

          {activeGlobalModule === 'dp' && (activeSection === 'custos' || activeSection === 'beneficios') && (podeVerSecaoDp(currentUser, 'custos') || podeVerSecaoDp(currentUser, 'beneficios')) && (
            <MonthlyCostView
              colaboradores={colaboradores}
              empregadores={empregadores}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'vale_alimentacao' && podeVerSecaoDp(currentUser, 'vale_alimentacao') && (
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

          {activeGlobalModule === 'dp' && activeSection === 'ferias' && podeVerSecaoDp(currentUser, 'ferias') && (
            <VacationView
              colaboradores={colaboradores}
              feriasList={feriasList}
              userRole={userRole}
              onSaveFerias={handleSaveFerias}
              onUpdateStatusFerias={handleUpdateStatusFerias}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'ocorrencias' && podeVerSecaoDp(currentUser, 'ocorrencias') && (
            <OccurrencesView
              colaboradores={colaboradoresEquipeVisiveis}
              supervisores={supervisores}
              ocorrencias={ocorrenciasEquipeVisiveis}
              userRole={userRole}
              temAcessoGeralDp={temAcessoGeralDp(currentUser)}
              onSaveOcorrencia={handleSaveOcorrencia}
              onOpenPublicFormModal={() => setIsPublicOccurrenceFormOpen(true)}
              onOpenOccurrenceLinkModal={() => setIsOccurrenceLinkModalOpen(true)}
              onOpenPortalView={() => setIsOccurrencePortalView(true)}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'saude' && podeVerSecaoDp(currentUser, 'saude') && (
            <AnvisaExamsView
              colaboradores={colaboradores}
              empregadores={empregadores}
              onUpdateExame={handleUpdateExame}
            />
          )}

          {activeGlobalModule === 'dp' && activeSection === 'onboarding' && podeVerSecaoDp(currentUser, 'onboarding') && (
            <OnboardingView
              colaboradores={colaboradores}
              onUpdateOnboardingItem={handleUpdateOnboardingItem}
            />
          )}

          {activeGlobalModule === 'dp' && (activeSection === 'cargos' || activeSection === 'supervisores') && (podeVerSecaoDp(currentUser, 'cargos') || podeVerSecaoDp(currentUser, 'supervisores')) && (
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

          {activeGlobalModule === 'dp' && activeSection === 'aniversariantes' && podeVerSecaoDp(currentUser, 'aniversariantes') && (
            <BirthdaysView
              colaboradores={colaboradoresEquipeVisiveis}
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
        criadoPor={currentUser?.nome}
      />

      {/* 2b. Ficha cadastral do Cliente — abre de fora do módulo Carteira de Clientes (Empresas
          Atreladas do Farma Aéreo/Rodoviário, Dashboard Geral), pra quem tem acesso a essas
          telas mas não ao módulo 'clientes' inteiro. */}
      <ClientDetailModal
        isOpen={!!fichaClienteSelecionado}
        onClose={() => setFichaClienteSelecionado(null)}
        cliente={fichaClienteSelecionado}
        empregadores={empregadores}
        supervisores={supervisores}
        userRole={userRole}
        onEdit={handleEditarFichaCliente}
        onAddInteraction={(c) => setFichaClienteInteracao(c)}
        onUpdateStatus={handleAtualizarStatusFicha}
        onGerarProposta={handleGerarPropostaFicha}
      />
      <ClientFormModal
        isOpen={!!fichaClienteEmEdicao}
        onClose={() => setFichaClienteEmEdicao(null)}
        onSave={(c) => {
          handleSaveCliente(c);
          setFichaClienteEmEdicao(null);
        }}
        initialData={fichaClienteEmEdicao}
        empregadores={empregadores}
        supervisores={supervisores}
        existingClientsCount={clientes.length}
      />
      <ClientInteractionModal
        isOpen={!!fichaClienteInteracao}
        onClose={() => setFichaClienteInteracao(null)}
        cliente={fichaClienteInteracao}
        supervisores={supervisores}
        onSaveInteraction={handleSalvarInteracaoFicha}
      />
      <PropostaComercialModal
        isOpen={!!fichaClienteProposta}
        onClose={() => setFichaClienteProposta(null)}
        cliente={fichaClienteProposta}
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

      {/* 5b. "Vincular Empresas / Alocar Equipe" — Farma Aéreo & Farma Rodoviário. Compartilhado
          entre os dois painéis e o atalho suspenso no menu lateral, abaixo do botão do módulo. */}
      <SectorLinkModal
        isOpen={!!sectorLinkModal}
        onClose={() => setSectorLinkModal(null)}
        setor={sectorLinkModal?.setor ?? 'farma_aereo'}
        mode={sectorLinkModal?.mode ?? 'clientes'}
        allClientes={clientes}
        allColaboradores={colaboradores}
        onToggleClienteLink={handleToggleClienteLinkSetor}
        onToggleColaboradorLink={handleToggleColaboradorLinkSetor}
        onOpenNovoCliente={() => {
          setActiveGlobalModule('clientes');
          setActiveSection('clientes');
        }}
        onOpenNovoColaborador={handleOpenNovoColaborador}
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
        onSave={handleSaveUser}
        usuarioToEdit={editingUser}
        existingUsers={users}
        supervisores={supervisores}
      />

      {/* 10. Aviso de Abertura (compromissos de hoje + prazos de projetos) */}
      <AvisoAberturaModal
        isOpen={isAvisoAberturaOpen}
        onClose={() => setIsAvisoAberturaOpen(false)}
        atividadesHoje={avisoAberturaData.atividadesHoje}
        projetosAtrasados={avisoAberturaData.projetosAtrasados}
        projetosProximos={avisoAberturaData.projetosProximos}
        onIrParaAgenda={() => {
          setIsAvisoAberturaOpen(false);
          setActiveGlobalModule('agenda');
          setActiveSection('agenda_gestao');
        }}
        onIrParaProjetos={() => {
          setIsAvisoAberturaOpen(false);
          setActiveGlobalModule('projetos');
          setActiveSection('projetos');
        }}
      />
    </div>
  );
}
