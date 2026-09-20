import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  Plane,
  Truck,
  Users,
  FolderKanban,
  LayoutDashboard,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  KeyRound,
  User,
  Mail,
  Briefcase,
  AlertCircle,
  CalendarDays,
  NotebookPen,
  UserCog,
} from 'lucide-react';
import { UsuarioLogin, GlobalModuleId, UserRole, SecaoDp, SecaoOperacoes, Supervisor, Operacao } from '../../types';
import { MODULOS_SISTEMA, operacaoParaModuloInfo } from '../../data/initialUsersData';

// Seções de dentro do módulo DP (Departamento Pessoal) que podem ser restringidas
// individualmente — mesma lista de src/components/Sidebar.tsx (renderModuleSubNav 'dp'),
// só que sem os contadores/badges (que não fazem sentido aqui). Ver SecaoDp em types.ts.
const SECOES_DP: { id: SecaoDp; label: string }[] = [
  { id: 'dashboard', label: 'Painel DP & Indicadores' },
  { id: 'colaboradores', label: 'Colaboradores Ativos' },
  { id: 'preadmissoes', label: 'Pré-Admissões (Link)' },
  { id: 'custos', label: 'Custo Mensal por Colaborador' },
  { id: 'beneficios', label: 'Benefícios (VA & VT)' },
  { id: 'vale_alimentacao', label: 'Programação VA (Quinzenas)' },
  { id: 'ferias', label: 'Férias & Ausências CLT' },
  { id: 'saude', label: 'Exames ASO (RDC 430)' },
  { id: 'epis', label: 'Entrega de EPI' },
  { id: 'onboarding', label: 'EPI & Checklist Admissão' },
  { id: 'ocorrencias', label: 'Ocorrências & Advertências' },
  { id: 'aniversariantes', label: 'Aniversariantes do Mês' },
  { id: 'arquivo', label: 'Arquivo / Demitidos' },
  { id: 'cargos', label: 'Cargos e Salários' },
  { id: 'supervisores', label: 'Supervisores e Gestão' },
];
const TODAS_SECOES_DP = SECOES_DP.map((s) => s.id);

// Abas de dentro de Farma Aéreo/Farma Rodoviário (mesma estrutura nos dois módulos) que podem
// ser restringidas — um único recorte vale pros dois. Ver SecaoOperacoes em types.ts.
const SECOES_OPERACOES: { id: SecaoOperacoes; label: string }[] = [
  { id: 'visao_geral', label: 'Visão Geral & DRE' },
  { id: 'empresas', label: 'Empresas Atreladas' },
  { id: 'equipe', label: 'Equipe do Setor' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'controle_financeiro', label: 'Controle Financeiro (Faturas)' },
  { id: 'custos', label: 'Custos Operacionais' },
];
const TODAS_SECOES_OPERACOES = SECOES_OPERACOES.map((s) => s.id);

interface UsuarioFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (usuario: UsuarioLogin) => void;
  usuarioToEdit?: UsuarioLogin | null;
  existingUsers: UsuarioLogin[];
  supervisores: Supervisor[];
  /** Operações cadastradas além dos módulos fixos (ex.: Unimed) — cada uma vira um módulo
   *  marcável aqui igual Farma Aéreo/DP/etc. */
  operacoesExtras?: Operacao[];
}

export const UsuarioFormModal: React.FC<UsuarioFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  usuarioToEdit,
  existingUsers,
  supervisores,
  operacoesExtras = [],
}) => {
  // Módulos fixos + qualquer operação cadastrada dinamicamente que ainda não tenha entrada
  // própria na lista fixa (Farma Aéreo/Rodoviário já têm) — mesma lista usada em todo o
  // formulário no lugar de MODULOS_SISTEMA cru.
  const modulosDisponiveis = [
    ...MODULOS_SISTEMA,
    ...operacoesExtras
      .filter((op) => !MODULOS_SISTEMA.some((m) => m.id === op.id))
      .map(operacaoParaModuloInfo),
  ];
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargo, setCargo] = useState('');
  const [setor, setSetor] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo' | 'Bloqueado'>('Ativo');
  const [role, setRole] = useState<UserRole>('colaborador');
  const [modulosPermitidos, setModulosPermitidos] = useState<GlobalModuleId[]>([
    'visao_geral',
    'clientes',
  ]);
  const [observacoes, setObservacoes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // Vínculo com Supervisor + recorte fino dentro do módulo DP — ver SecaoDp/supervisorId/
  // escopoApenasProprioSetor em types.ts. Tudo marcado em secoesDpPermitidas (o padrão aqui)
  // significa "sem restrição", igual quem já estava cadastrado antes disso existir.
  const [supervisorId, setSupervisorId] = useState('');
  const [escopoApenasProprioSetor, setEscopoApenasProprioSetor] = useState(false);
  const [secoesDpPermitidas, setSecoesDpPermitidas] = useState<SecaoDp[]>(TODAS_SECOES_DP);
  const [secoesOperacoesPermitidas, setSecoesOperacoesPermitidas] = useState<SecaoOperacoes[]>(
    TODAS_SECOES_OPERACOES
  );

  useEffect(() => {
    if (usuarioToEdit) {
      setNome(usuarioToEdit.nome || '');
      setLogin(usuarioToEdit.login || '');
      setEmail(usuarioToEdit.email || '');
      setSenha(usuarioToEdit.senha || 'jmt@2026');
      setCargo(usuarioToEdit.cargo || '');
      setSetor(usuarioToEdit.setor || '');
      setStatus(usuarioToEdit.status || 'Ativo');
      setRole(usuarioToEdit.role || 'colaborador');
      setModulosPermitidos(
        usuarioToEdit.modulosPermitidos && usuarioToEdit.modulosPermitidos.length > 0
          ? [...usuarioToEdit.modulosPermitidos]
          : ['visao_geral']
      );
      setObservacoes(usuarioToEdit.observacoes || '');
      setSupervisorId(usuarioToEdit.supervisorId || '');
      setEscopoApenasProprioSetor(usuarioToEdit.escopoApenasProprioSetor || false);
      setSecoesDpPermitidas(
        usuarioToEdit.secoesDpPermitidas && usuarioToEdit.secoesDpPermitidas.length > 0
          ? [...usuarioToEdit.secoesDpPermitidas]
          : TODAS_SECOES_DP
      );
      setSecoesOperacoesPermitidas(
        usuarioToEdit.secoesOperacoesPermitidas && usuarioToEdit.secoesOperacoesPermitidas.length > 0
          ? [...usuarioToEdit.secoesOperacoesPermitidas]
          : TODAS_SECOES_OPERACOES
      );
      setErrorMsg('');
    } else {
      // Default new user
      setNome('');
      setLogin('');
      setEmail('');
      setSenha('jmt@' + Math.floor(1000 + Math.random() * 9000));
      setCargo('');
      setSetor('');
      setStatus('Ativo');
      setRole('colaborador');
      setModulosPermitidos(['visao_geral', 'clientes', 'farma_aereo']);
      setObservacoes('');
      setSupervisorId('');
      setEscopoApenasProprioSetor(false);
      setSecoesDpPermitidas(TODAS_SECOES_DP);
      setSecoesOperacoesPermitidas(TODAS_SECOES_OPERACOES);
      setErrorMsg('');
    }
  }, [usuarioToEdit, isOpen]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let generated = 'JMT@';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSenha(generated);
  };

  const handleAutoSuggestLogin = (nameValue: string) => {
    setNome(nameValue);
    if (!usuarioToEdit && !login) {
      const parts = nameValue
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, '')
        .trim()
        .split(/\s+/);
      if (parts.length >= 2) {
        setLogin(`${parts[0]}.${parts[parts.length - 1]}`);
      } else if (parts.length === 1 && parts[0].length > 0) {
        setLogin(parts[0]);
      }
    }
  };

  const toggleModule = (modId: GlobalModuleId) => {
    if (modulosPermitidos.includes(modId)) {
      setModulosPermitidos(modulosPermitidos.filter((id) => id !== modId));
    } else {
      setModulosPermitidos([...modulosPermitidos, modId]);
    }
  };

  const selectAllModules = () => {
    setModulosPermitidos(modulosDisponiveis.map((m) => m.id));
  };

  const toggleSecaoDp = (secaoId: SecaoDp) => {
    if (secoesDpPermitidas.includes(secaoId)) {
      setSecoesDpPermitidas(secoesDpPermitidas.filter((id) => id !== secaoId));
    } else {
      setSecoesDpPermitidas([...secoesDpPermitidas, secaoId]);
    }
  };

  const toggleSecaoOperacoes = (secaoId: SecaoOperacoes) => {
    if (secoesOperacoesPermitidas.includes(secaoId)) {
      setSecoesOperacoesPermitidas(secoesOperacoesPermitidas.filter((id) => id !== secaoId));
    } else {
      setSecoesOperacoesPermitidas([...secoesOperacoesPermitidas, secaoId]);
    }
  };

  const clearAllModules = () => {
    setModulosPermitidos([]);
  };

  const applyPreset = (preset: 'aereo' | 'rodoviario' | 'dp' | 'diretoria') => {
    switch (preset) {
      case 'aereo':
        setModulosPermitidos(['visao_geral', 'clientes', 'farma_aereo']);
        break;
      case 'rodoviario':
        setModulosPermitidos(['visao_geral', 'clientes', 'farma_rodoviario']);
        break;
      case 'dp':
        setModulosPermitidos(['visao_geral', 'dp', 'projetos']);
        break;
      case 'diretoria':
        setModulosPermitidos(modulosDisponiveis.map((m) => m.id));
        break;
    }
  };

  const getModuleIcon = (id: GlobalModuleId) => {
    switch (id) {
      case 'visao_geral':
        return LayoutDashboard;
      case 'clientes':
        return Building2;
      case 'farma_aereo':
        return Plane;
      case 'farma_rodoviario':
        return Truck;
      case 'dp':
        return Users;
      case 'projetos':
        return FolderKanban;
      case 'agenda':
        return CalendarDays;
      case 'notas':
        return NotebookPen;
      case 'usuarios':
        return ShieldCheck;
      default:
        return LayoutDashboard;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nome.trim()) {
      setErrorMsg('Por favor, informe o nome completo do usuário.');
      return;
    }

    const cleanLogin = login.trim().toLowerCase().replace(/\s+/g, '.');
    if (!cleanLogin) {
      setErrorMsg('Por favor, defina um nome de usuário (login).');
      return;
    }

    // Check unique login
    const duplicate = existingUsers.find(
      (u) =>
        u.login.toLowerCase() === cleanLogin &&
        (!usuarioToEdit || u.id !== usuarioToEdit.id)
    );
    if (duplicate) {
      setErrorMsg(`O login "${cleanLogin}" já está cadastrado para o colaborador ${duplicate.nome}. Escolha outro login.`);
      return;
    }

    if (!senha.trim()) {
      setErrorMsg('Por favor, defina uma senha de acesso.');
      return;
    }

    if (modulosPermitidos.length === 0) {
      setErrorMsg('Selecione pelo menos 1 (um) módulo de acesso para este login.');
      return;
    }

    if (modulosPermitidos.includes('dp') && secoesDpPermitidas.length === 0) {
      setErrorMsg('Marque pelo menos 1 (uma) seção de DP, ou desmarque o módulo DP inteiro.');
      return;
    }

    const usaOperacoes = modulosPermitidos.includes('farma_aereo') || modulosPermitidos.includes('farma_rodoviario');
    if (usaOperacoes && secoesOperacoesPermitidas.length === 0) {
      setErrorMsg('Marque pelo menos 1 (uma) aba de Operações, ou desmarque Farma Aéreo/Rodoviário.');
      return;
    }

    // Todas as seções marcadas = sem restrição (equivalente a não ter secoesDpPermitidas
    // nenhuma) — só grava a lista quando é de fato um recorte menor que o total.
    const secoesDpParaSalvar: SecaoDp[] | undefined =
      modulosPermitidos.includes('dp') && secoesDpPermitidas.length < TODAS_SECOES_DP.length
        ? secoesDpPermitidas
        : undefined;
    const secoesOperacoesParaSalvar: SecaoOperacoes[] | undefined =
      usaOperacoes && secoesOperacoesPermitidas.length < TODAS_SECOES_OPERACOES.length
        ? secoesOperacoesPermitidas
        : undefined;

    const userToSave: UsuarioLogin = {
      id: usuarioToEdit ? usuarioToEdit.id : `usr-${Date.now()}`,
      nome: nome.trim(),
      login: cleanLogin,
      email: email.trim(),
      senha: senha.trim(),
      cargo: cargo.trim() || 'Colaborador JMT',
      setor: setor.trim() || 'Operações',
      status,
      role,
      authUserId: usuarioToEdit?.authUserId,
      dataCriacao: usuarioToEdit?.dataCriacao || new Date().toISOString(),
      ultimoAcesso: usuarioToEdit?.ultimoAcesso,
      modulosPermitidos,
      observacoes: observacoes.trim(),
      supervisorId: supervisorId || undefined,
      secoesDpPermitidas: secoesDpParaSalvar,
      escopoApenasProprioSetor: supervisorId ? escopoApenasProprioSetor : false,
      secoesOperacoesPermitidas: secoesOperacoesParaSalvar,
    };

    onSave(userToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white flex items-center justify-between shrink-0 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C48229] flex items-center justify-center text-white shadow-sm shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-slate-900">
                {usuarioToEdit ? 'Editar Login & Permissões' : 'Criar Novo Login de Acesso'}
              </h3>
              <p className="text-xs text-slate-500">
                Defina as credenciais e escolha exatamente a quais módulos o usuário terá acesso
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2.5 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Dados do Usuário */}
          <div>
            <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-100">
              <User className="w-4 h-4 text-[#C48229]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Credenciais & Informações do Usuário
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Lima"
                  value={nome}
                  onChange={(e) => handleAutoSuggestLogin(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C48229] focus:border-transparent outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Login / Nome de Usuário <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">@</span>
                  <input
                    type="text"
                    required
                    placeholder="carlos.lima"
                    value={login}
                    onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                    className="w-full pl-8 pr-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C48229] focus:border-transparent outline-hidden transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Usado para entrar no sistema (sem espaços).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Senha de Acesso <span className="text-rose-500">*</span></span>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-[#C48229] hover:underline font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Gerar Segura
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Senha de acesso"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C48229] focus:border-transparent outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="carlos.lima@jmtransportes.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C48229] focus:border-transparent outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  placeholder="Ex: Supervisor Farma Rodoviário"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C48229] focus:border-transparent outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Setor / Departamento</label>
                <select
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C48229] focus:border-transparent outline-hidden transition-all"
                >
                  <option value="">Selecione um setor...</option>
                  <option value="Diretoria Executiva">Diretoria Executiva</option>
                  <option value="Farma Aéreo">Farma Aéreo</option>
                  <option value="Farma Rodoviário">Farma Rodoviário</option>
                  <option value="Departamento Pessoal">Departamento Pessoal</option>
                  <option value="Garantia da Qualidade & ANVISA">Garantia da Qualidade & ANVISA</option>
                  <option value="Comercial & SAC">Comercial & SAC</option>
                  <option value="TI & Segurança">TI & Segurança</option>
                  <option value="Controladoria & Projetos">Controladoria & Projetos</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Status da Conta</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Ativo', 'Inativo', 'Bloqueado'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        status === st
                          ? st === 'Ativo'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : st === 'Inativo'
                            ? 'bg-slate-600 border-slate-600 text-white shadow-xs'
                            : 'bg-rose-600 border-rose-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          st === 'Ativo'
                            ? 'bg-emerald-300'
                            : st === 'Inativo'
                            ? 'bg-slate-300'
                            : 'bg-rose-300'
                        }`}
                      />
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Papel (checado no servidor — controla quem pode convidar gente nova)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'supervisor', 'colaborador'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all capitalize ${
                        role === r
                          ? 'bg-[#C48229] border-[#C48229] text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Só quem tiver "admin" aqui consegue enviar convite por e-mail pra criar login novo.
                </p>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserCog className="w-3.5 h-3.5 text-[#C48229]" />
                  Vincular a um Supervisor (opcional)
                </label>
                <select
                  value={supervisorId}
                  onChange={(e) => {
                    setSupervisorId(e.target.value);
                    if (!e.target.value) setEscopoApenasProprioSetor(false);
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C48229] focus:border-transparent outline-hidden transition-all"
                >
                  <option value="">— Nenhum —</option>
                  {supervisores.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.nome} — {sup.cargo}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Identifica de qual equipe/carteira de clientes este login é responsável — usado
                  pela opção abaixo.
                </p>

                <label
                  className={`mt-2.5 flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    supervisorId ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!supervisorId}
                    checked={escopoApenasProprioSetor}
                    onChange={(e) => setEscopoApenasProprioSetor(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 accent-[#C48229]"
                  />
                  <span className="text-xs text-slate-700">
                    <strong className="font-bold">Restringir à própria equipe/carteira</strong> —
                    em Clientes, Colaboradores e Ocorrências, esse login só vê o que está sob a
                    responsabilidade do supervisor vinculado acima (não dá acesso a nada novo, só
                    filtra o que já seria visível pros módulos/seções marcados abaixo).
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: MÓDULOS PERMITIDOS */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C48229]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Módulos com Acesso Permitido ({modulosPermitidos.length} de {modulosDisponiveis.length})
                </h4>
              </div>

              {/* Quick Actions / Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={selectAllModules}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold transition-colors"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={clearAllModules}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold transition-colors"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('aereo')}
                  className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-md text-[11px] font-semibold transition-colors"
                >
                  Farma Aéreo
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('rodoviario')}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold transition-colors"
                >
                  Farma Rodoviário
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('dp')}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-[11px] font-semibold transition-colors"
                >
                  DP / RH
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Marque abaixo exatamente os módulos que este usuário poderá visualizar no menu lateral e operar no sistema.
            </p>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modulosDisponiveis.map((modulo) => {
                const isChecked = modulosPermitidos.includes(modulo.id);
                const Icon = getModuleIcon(modulo.id);

                return (
                  <div
                    key={modulo.id}
                    onClick={() => toggleModule(modulo.id)}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-150 flex items-start gap-3 select-none ${
                      isChecked
                        ? 'bg-amber-50/50 border-[#C48229] shadow-xs ring-1 ring-[#C48229]/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 opacity-80'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-[#C48229] text-white shadow-xs'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isChecked ? 'text-[#92611F]' : 'text-slate-400'
                          }`}
                        />
                        <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                          {modulo.nome}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full border ${modulo.corBadge}`}
                        >
                          {modulo.sigla}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {modulo.descricao}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recorte fino de DENTRO do módulo DP — só aparece se 'dp' estiver marcado acima.
                DP mistura telas bem diferentes em sensibilidade (Colaboradores tem CPF/dados
                bancários; Cargos tem faixa salarial; Ocorrências e Aniversariantes não), então
                marcar o módulo inteiro não devia significar acesso a tudo isso. */}
            {modulosPermitidos.includes('dp') && (
              <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCog className="w-3.5 h-3.5 text-[#C48229]" />
                    Dentro de DP, quais seções esse login vê? ({secoesDpPermitidas.length} de{' '}
                    {TODAS_SECOES_DP.length})
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSecoesDpPermitidas(TODAS_SECOES_DP)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[11px] font-semibold transition-colors"
                    >
                      Marcar Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecoesDpPermitidas(['ocorrencias', 'aniversariantes'])}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-[11px] font-semibold transition-colors"
                      title="Ocorrências + Aniversariantes, sem Colaboradores/Saúde/Cargos/etc."
                    >
                      Supervisor de Campo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SECOES_DP.map((secao) => {
                    const isChecked = secoesDpPermitidas.includes(secao.id);
                    return (
                      <label
                        key={secao.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'bg-white border-[#C48229]/40 text-slate-800'
                            : 'bg-white/60 border-slate-200 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSecaoDp(secao.id)}
                          className="w-3.5 h-3.5 accent-[#C48229]"
                        />
                        <span className="text-[11px] font-medium">{secao.label}</span>
                      </label>
                    );
                  })}
                </div>
                {secoesDpPermitidas.length === 0 && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-2">
                    Nenhuma seção marcada — esse login vai entrar em DP e não ver nada. Marque ao
                    menos uma.
                  </p>
                )}
              </div>
            )}

            {/* Mesmo recorte, agora pras abas de dentro de Farma Aéreo/Farma Rodoviário — um
                único checklist vale pros dois módulos (não dá pra restringir cada um diferente
                hoje). Só aparece se pelo menos um dos dois estiver marcado acima. */}
            {(modulosPermitidos.includes('farma_aereo') || modulosPermitidos.includes('farma_rodoviario')) && (
              <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCog className="w-3.5 h-3.5 text-[#C48229]" />
                    Dentro de Farma Aéreo/Rodoviário, quais abas esse login vê? (
                    {secoesOperacoesPermitidas.length} de {TODAS_SECOES_OPERACOES.length})
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSecoesOperacoesPermitidas(TODAS_SECOES_OPERACOES)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[11px] font-semibold transition-colors"
                    >
                      Marcar Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecoesOperacoesPermitidas(['empresas', 'equipe'])}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-[11px] font-semibold transition-colors"
                      title="Empresas Atreladas + Equipe do Setor, sem Visão Geral/Faturamento/Custos"
                    >
                      Supervisor de Campo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SECOES_OPERACOES.map((secao) => {
                    const isChecked = secoesOperacoesPermitidas.includes(secao.id);
                    return (
                      <label
                        key={secao.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'bg-white border-[#C48229]/40 text-slate-800'
                            : 'bg-white/60 border-slate-200 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSecaoOperacoes(secao.id)}
                          className="w-3.5 h-3.5 accent-[#C48229]"
                        />
                        <span className="text-[11px] font-medium">{secao.label}</span>
                      </label>
                    );
                  })}
                </div>
                {secoesOperacoesPermitidas.length === 0 && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-2">
                    Nenhuma aba marcada — esse login vai entrar em Farma Aéreo/Rodoviário e não
                    ver nada. Marque ao menos uma.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações Adicionais / Justificativa de Acesso
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Usuário responsável pelos embarques aeroportuários do TECA Recife e acompanhamento de clientes farmacêuticos."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C48229] focus:border-transparent outline-hidden transition-all custom-scrollbar"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#C48229]" />
            <span>As permissões entram em vigor imediatamente após salvar.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold text-white bg-[#C48229] hover:bg-[#967438] rounded-xl shadow-md shadow-[#C48229]/20 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{usuarioToEdit ? 'Salvar Alterações' : 'Criar Login'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
