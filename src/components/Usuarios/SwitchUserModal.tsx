import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Search,
  Check,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { UsuarioLogin, GlobalModuleId } from '../../types';
import { MODULOS_SISTEMA } from '../../data/initialUsersData';

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UsuarioLogin[];
  currentUser: UsuarioLogin;
  onSelectUser: (user: UsuarioLogin) => void;
  onOpenNewUserModal: () => void;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onOpenNewUserModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.setor && u.setor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getModuleName = (id: GlobalModuleId) => {
    const found = MODULOS_SISTEMA.find((m) => m.id === id);
    return found ? found.sigla : id;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B38F4F] flex items-center justify-center text-white shrink-0 shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-slate-900">
                Trocar de Login / Simular Sessão
              </h3>
              <p className="text-xs text-slate-500">
                Selecione um usuário cadastrado para operar o sistema com suas permissões específicas
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

        {/* Current Active User Banner */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#B38F4F] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
              {currentUser.nome.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                Conectado como: {currentUser.nome}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                @{currentUser.login} • {currentUser.cargo}
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 shrink-0">
            Sessão Atual
          </span>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, login, cargo ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#B38F4F] focus:border-transparent outline-hidden"
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 custom-scrollbar">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nenhum login encontrado para os critérios informados.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isCurrent = u.id === currentUser.id;
              const isBlocked = u.status === 'Bloqueado';

              return (
                <div
                  key={u.id}
                  onClick={() => {
                    if (!isBlocked) {
                      onSelectUser(u);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-amber-50/80 border-[#B38F4F] shadow-xs ring-1 ring-[#B38F4F]/30'
                      : isBlocked
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-[#B38F4F]/60 hover:bg-slate-50/80 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCurrent
                          ? 'bg-[#B38F4F] text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {u.nome.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{u.nome}</span>
                        <span className="font-mono text-[11px] text-slate-500 font-medium">
                          @{u.login}
                        </span>
                        {isBlocked && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">
                            Bloqueado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {u.cargo} {u.setor ? `• ${u.setor}` : ''}
                      </div>

                      {/* Modules preview */}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">
                          Acesso:
                        </span>
                        {u.modulosPermitidos.map((modId) => (
                          <span
                            key={modId}
                            className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200"
                          >
                            {getModuleName(modId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#B38F4F]">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Ativo</span>
                      </span>
                    ) : isBlocked ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Bloqueado
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-[#B38F4F] hover:text-white text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span>Entrar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewUserModal();
            }}
            className="text-xs font-bold text-[#8A6A39] hover:text-[#B38F4F] hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Criar outro login agora</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
