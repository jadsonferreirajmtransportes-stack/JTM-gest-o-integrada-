import React, { useState } from 'react';
import { X, User, Users, MessageSquarePlus, Check } from 'lucide-react';
import { UsuarioLogin } from '../../types';

interface NovaConversaModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarios: UsuarioLogin[];
  currentUserId: string;
  onCriarDireta: (outroUsuarioId: string) => void;
  onCriarGrupo: (nome: string, participantesIds: string[]) => void;
}

export const NovaConversaModal: React.FC<NovaConversaModalProps> = ({
  isOpen,
  onClose,
  usuarios,
  currentUserId,
  onCriarDireta,
  onCriarGrupo,
}) => {
  const [modo, setModo] = useState<'direta' | 'grupo'>('direta');
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);

  if (!isOpen) return null;

  const outrosUsuarios = usuarios.filter((u) => u.id !== currentUserId && u.status === 'Ativo');

  const handleFechar = () => {
    setModo('direta');
    setNomeGrupo('');
    setSelecionados([]);
    onClose();
  };

  const handleToggleSelecionado = (id: string) => {
    if (modo === 'direta') {
      setSelecionados([id]);
      return;
    }
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleConfirmar = () => {
    if (modo === 'direta') {
      if (selecionados.length !== 1) return;
      onCriarDireta(selecionados[0]);
    } else {
      if (!nomeGrupo.trim() || selecionados.length === 0) return;
      onCriarGrupo(nomeGrupo.trim(), selecionados);
    }
    handleFechar();
  };

  const podeConfirmar = modo === 'direta' ? selecionados.length === 1 : nomeGrupo.trim() && selecionados.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        <div className="bg-white border-b border-slate-100 p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#92611F]">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Nova Conversa</h2>
          </div>
          <button type="button" onClick={handleFechar} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => {
                setModo('direta');
                setSelecionados([]);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${
                modo === 'direta' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Direta
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('grupo');
                setSelecionados([]);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${
                modo === 'grupo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Grupo
            </button>
          </div>

          {modo === 'grupo' && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nome do Grupo</label>
              <input
                type="text"
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
                placeholder="Ex: Farma Rodoviário, Diretoria..."
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              />
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              {modo === 'direta' ? 'Com quem você quer conversar?' : 'Participantes do grupo'}
            </label>
            <div className="space-y-1 max-h-56 overflow-y-auto border border-slate-100 rounded-lg p-1.5">
              {outrosUsuarios.length === 0 && (
                <p className="text-slate-400 text-center py-4">Nenhum outro login ativo cadastrado ainda.</p>
              )}
              {outrosUsuarios.map((u) => {
                const marcado = selecionados.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleToggleSelecionado(u.id)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                      marcado ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                        marcado ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{u.nome}</p>
                      <p className={`truncate ${marcado ? 'text-slate-300' : 'text-slate-400'}`}>{u.cargo}</p>
                    </div>
                    {marcado && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button type="button" onClick={handleFechar} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!podeConfirmar}
            className="px-5 py-2 bg-[#C48229] hover:bg-[#92611F] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm"
          >
            {modo === 'direta' ? 'Iniciar Conversa' : 'Criar Grupo'}
          </button>
        </div>
      </div>
    </div>
  );
};
