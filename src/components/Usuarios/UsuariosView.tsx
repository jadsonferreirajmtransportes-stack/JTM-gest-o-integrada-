import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  KeyRound,
  UserCheck,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  Plane,
  Truck,
  Users,
  FolderKanban,
  LayoutDashboard,
  Check,
  X,
  Sparkles,
  ArrowRightLeft,
  Shield,
  Filter,
  Layers,
  FileCheck,
  CalendarDays,
  NotebookPen,
} from 'lucide-react';
import { UsuarioLogin, GlobalModuleId } from '../../types';
import { MODULOS_SISTEMA } from '../../data/initialUsersData';
import { UsuarioFormModal } from './UsuarioFormModal';
import { SwitchUserModal } from './SwitchUserModal';
import { StrategicGuidelinesBanner } from '../Common/StrategicGuidelinesBanner';

interface UsuariosViewProps {
  users: UsuarioLogin[];
  currentUser: UsuarioLogin;
  onSaveUser: (user: UsuarioLogin) => void;
  onDeleteUser: (userId: string) => void;
  onSelectUserSession: (user: UsuarioLogin) => void;
  onToggleUserModuleAccess: (userId: string, moduleId: GlobalModuleId) => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onSelectUserSession,
  onToggleUserModuleAccess,
}) => {
  const [activeTab, setActiveTab] = useState<'lista' | 'matriz' | 'seguranca'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo' | 'Bloqueado'>('Todos');
  const [moduleFilter, setModuleFilter] = useState<string>('todos');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioLogin | null>(null);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [userToDelete, setUserToDelete] = useState<UsuarioLogin | null>(null);

  // Toggle show password for a specific user
  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.setor && user.setor.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'Todos' || user.status === statusFilter;

    const matchesModule =
      moduleFilter === 'todos' ||
      user.modulosPermitidos.includes(moduleFilter as GlobalModuleId);

    return matchesSearch && matchesStatus && matchesModule;
  });

  const activeUsersCount = users.filter((u) => u.status === 'Ativo').length;

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (u: UsuarioLogin) => {
    setEditingUser(u);
    setIsFormModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      if (users.length <= 1) {
        alert('Não é possível excluir o único usuário do sistema.');
        setUserToDelete(null);
        return;
      }
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-[#111111] flex items-center justify-center text-[#B38F4F] shadow-md border border-[#B38F4F]/30 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#B38F4F]/15 text-[#8A6A39] border border-[#B38F4F]/30">
                Gestão de Acessos & Logins
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {users.length} Logins • {activeUsersCount} Ativos
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Controle de Logins & Acessos por Módulo
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie logins personalizados e defina exatamente a quais módulos operacionais e executivos cada colaborador tem acesso.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsSwitchModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Alternar entre usuários cadastrados"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#B38F4F]" />
            <span>Trocar de Login</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#B38F4F] hover:bg-[#967438] text-white rounded-xl text-xs font-bold shadow-md shadow-[#B38F4F]/20 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Login de Acesso</span>
          </button>
        </div>
      </div>

      {/* Strategic Institutional Banner */}
      <StrategicGuidelinesBanner variant="light" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total de Logins
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{users.length}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {activeUsersCount} usuários com status ativo
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Modules Managed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Módulos do Sistema
            </span>
            <div className="text-2xl font-black text-[#B38F4F] mt-0.5">{MODULOS_SISTEMA.length}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Controle individual por usuário
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#B38F4F]">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Current User Session */}
        <div className="bg-gradient-to-br from-slate-900 to-[#111111] p-4 rounded-2xl border border-slate-800 text-white shadow-xs flex items-center justify-between sm:col-span-2">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#B38F4F]/20 text-[#D8B97E] border border-[#B38F4F]/40">
                Sua Sessão Ativa
              </span>
              <span className="text-[10px] text-slate-400 font-mono">@{currentUser.login}</span>
            </div>
            <div className="text-base font-extrabold text-white mt-1 truncate">
              {currentUser.nome}
            </div>
            <div className="text-xs text-slate-300 truncate">
              {currentUser.cargo} • {currentUser.modulosPermitidos.length} módulos liberados
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSwitchModalOpen(true)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#B38F4F]" />
            <span>Alternar</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('lista')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'lista'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Lista de Logins & Permissões</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matriz')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'matriz'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Matriz de Acesso Rápido</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seguranca')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'seguranca'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Boas Práticas & Segurança RDC 430</span>
        </button>
      </div>

      {/* TAB 1: LISTA DE LOGINS */}
      {activeTab === 'lista' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, login, e-mail, cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#B38F4F] focus:border-transparent outline-hidden transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs">
                {(['Todos', 'Ativo', 'Inativo', 'Bloqueado'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Module Filter */}
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
              >
                <option value="todos">Todos os Módulos</option>
                {MODULOS_SISTEMA.map((m) => (
                  <option key={m.id} value={m.id}>
                    Liberados para: {m.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards List */}
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Nenhum login encontrado</h3>
              <p className="text-xs text-slate-400 mt-1">
                Tente ajustar os filtros de busca ou crie um novo login de acesso.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-4 px-4 py-2 bg-[#B38F4F] text-white text-xs font-bold rounded-xl inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Novo Login</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((user) => {
                const isCurrent = user.id === currentUser.id;
                const isRevealed = !!revealedPasswords[user.id];

                return (
                  <div
                    key={user.id}
                    className={`bg-white rounded-2xl border transition-all duration-150 p-5 flex flex-col justify-between shadow-xs ${
                      isCurrent
                        ? 'border-[#B38F4F] ring-1 ring-[#B38F4F]/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Card Top: Avatar, Name, Status, Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                              isCurrent
                                ? 'bg-gradient-to-br from-[#B38F4F] to-[#8A6A39] text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {user.nome.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-extrabold text-sm text-slate-900 truncate">
                                {user.nome}
                              </h3>
                              {isCurrent && (
                                <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold uppercase">
                                  Você Conectado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                              <span className="font-bold text-slate-700">@{user.login}</span>
                              {user.email && <span>• {user.email}</span>}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {user.cargo} {user.setor ? `• ${user.setor}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 border ${
                            user.status === 'Ativo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : user.status === 'Inativo'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {user.status}
                        </span>
                      </div>

                      {/* Password Info Box */}
                      <div className="mt-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <KeyRound className="w-3.5 h-3.5 text-[#B38F4F] shrink-0" />
                          <span className="text-[11px] text-slate-500 font-medium">Senha:</span>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {isRevealed ? user.senha || 'Não cadastrada' : '••••••••'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleRevealPassword(user.id)}
                          className="text-[11px] font-bold text-[#8A6A39] hover:text-[#B38F4F] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white"
                        >
                          {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{isRevealed ? 'Ocultar' : 'Ver'}</span>
                        </button>
                      </div>

                      {/* Assigned Modules */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-2">
                          <span className="text-slate-600 uppercase tracking-wider">
                            Módulos com Acesso Liberado:
                          </span>
                          <span className="text-[#8A6A39]">
                            {user.modulosPermitidos.length} de {MODULOS_SISTEMA.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {MODULOS_SISTEMA.map((modulo) => {
                            const hasAccess = user.modulosPermitidos.includes(modulo.id);
                            const Icon = getModuleIcon(modulo.id);

                            return (
                              <button
                                key={modulo.id}
                                type="button"
                                onClick={() => onToggleUserModuleAccess(user.id, modulo.id)}
                                title={`${hasAccess ? 'Revogar' : 'Conceder'} acesso ao módulo ${modulo.nome}`}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                  hasAccess
                                    ? 'bg-amber-50 text-[#8A6A39] border-[#B38F4F]/40 shadow-2xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 opacity-60'
                                }`}
                              >
                                <Icon className="w-3 h-3 shrink-0" />
                                <span>{modulo.sigla}</span>
                                {hasAccess ? (
                                  <Check className="w-2.5 h-2.5 stroke-[3] text-emerald-600" />
                                ) : (
                                  <X className="w-2.5 h-2.5 text-slate-300" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => onSelectUserSession(user)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-[#B38F4F] hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                            title="Entrar imediatamente no sistema com a conta deste usuário"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Entrar como este Login</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-extrabold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sessão Atual</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 text-slate-500 hover:text-[#B38F4F] hover:bg-amber-50 rounded-lg transition-colors"
                          title="Editar dados e permissões"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setUserToDelete(user)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir este login"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MATRIZ DE ACESSO RÁPIDO */}
      {activeTab === 'matriz' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Matriz de Permissões Interativa
              </h3>
              <p className="text-xs text-slate-500">
                Clique nas caixas de seleção diretamente para conceder ou revogar o acesso a qualquer módulo com apenas 1 clique.
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#8A6A39] bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 shrink-0">
              Salvo em tempo real no sistema
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 min-w-[220px]">Colaborador / Login</th>
                  <th className="py-3 px-3 min-w-[140px]">Cargo / Setor</th>
                  {MODULOS_SISTEMA.map((m) => {
                    const Icon = getModuleIcon(m.id);
                    return (
                      <th key={m.id} className="py-3 px-3 text-center min-w-[110px]">
                        <div className="flex flex-col items-center gap-1">
                          <Icon className="w-3.5 h-3.5 text-[#B38F4F]" />
                          <span>{m.sigla}</span>
                          <span className="text-[9px] font-medium text-slate-400 normal-case">
                            {m.nome}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-3 text-center min-w-[90px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrent ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                            {u.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{u.nome}</span>
                              {isCurrent && (
                                <span className="text-[8px] font-bold px-1.5 py-0.2 bg-[#B38F4F] text-white rounded">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              @{u.login}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-800 font-medium text-xs truncate max-w-[150px]">
                          {u.cargo}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {u.setor || 'Geral'}
                        </div>
                      </td>

                      {/* Checkbox columns for each module */}
                      {MODULOS_SISTEMA.map((modulo) => {
                        const hasAccess = u.modulosPermitidos.includes(modulo.id);

                        return (
                          <td key={modulo.id} className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => onToggleUserModuleAccess(u.id, modulo.id)}
                              className={`w-6 h-6 rounded-lg mx-auto flex items-center justify-center transition-all ${
                                hasAccess
                                  ? 'bg-[#B38F4F] text-white shadow-2xs hover:bg-[#8A6A39]'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-300 border border-slate-200'
                              }`}
                              title={`${hasAccess ? 'Revogar' : 'Conceder'} ${modulo.nome} para ${u.nome}`}
                            >
                              {hasAccess ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : (
                                <X className="w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          </td>
                        );
                      })}

                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(u)}
                          className="px-2 py-1 text-[11px] font-bold text-[#8A6A39] hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BOAS PRÁTICAS & SEGURANÇA RDC 430 */}
      {activeTab === 'seguranca' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#B38F4F] flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Diretrizes de Acesso & Rastreabilidade ANVISA RDC 430/2020
              </h3>
              <p className="text-xs text-slate-500">
                Padrões operacionais para controle individual de contas na cadeia logística farmacêutica
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#B38F4F]" />
                Individualidade das Credenciais
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cada colaborador que manipula dados de temperatura, despachos aéreos (AWB), manifestos rodoviários (MDF-e) ou registros de DP deve possuir seu próprio login. É expressamente vedado o uso compartilhado de senhas.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                Princípio do Menor Privilégio
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Conceda aos logins apenas os módulos estritamente necessários para a execução de suas rotinas. Por exemplo, operadores rodoviários não necessitam de acesso ao DP ou à Gestão de Logins.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-700" />
                Desligamento e Revogação Imediata
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Em caso de rescisão ou afastamento de colaborador, altere o status do login para <strong>Bloqueado</strong> ou <strong>Inativo</strong> imediatamente para resguardar os dados operacionais e de clientes da JMT.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Rigor Operacional & Auditorias
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Todas as operações no sistema deixam rastro de auditoria. Em inspeções regulatórias da ANVISA ou clientes farmacêuticos, a demonstração de acessos por módulo comprova a governança e integridade da empresa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar / Editar Usuário */}
      <UsuarioFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={onSaveUser}
        usuarioToEdit={editingUser}
        existingUsers={users}
      />

      {/* Modal: Trocar de Login / Simular Sessão */}
      <SwitchUserModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onSelectUser={onSelectUserSession}
        onOpenNewUserModal={() => {
          setIsSwitchModalOpen(false);
          handleOpenCreateModal();
        }}
      />

      {/* Modal de Confirmação de Exclusão */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-extrabold text-base text-slate-900">
                Excluir Login de Acesso?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tem certeza que deseja remover permanentemente o login de{' '}
                <strong className="text-slate-900">{userToDelete.nome}</strong> (
                <span className="font-mono">@{userToDelete.login}</span>)? Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex items-center gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md shadow-rose-600/20"
              >
                Sim, Excluir Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
