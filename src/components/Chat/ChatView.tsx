import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquarePlus, Send, Users, User, Search } from 'lucide-react';
import { ConversaChat, MensagemChat, UsuarioLogin } from '../../types';
import { getMensagens, assinarMensagensNovas } from '../../utils/chatApi';
import { NovaConversaModal } from './NovaConversaModal';

interface ChatViewProps {
  usuarios: UsuarioLogin[];
  currentUserId: string;
  conversas: ConversaChat[];
  ultimasLeituras: Record<string, string | null>;
  onAbrirConversa: (conversaId: string) => void;
  onEnviarMensagem: (conversaId: string, texto: string) => void;
  onCriarConversaDireta: (outroUsuarioId: string) => void;
  onCriarConversaGrupo: (nome: string, participantesIds: string[]) => void;
}

function nomeDaConversa(conversa: ConversaChat, usuarios: UsuarioLogin[], currentUserId: string): string {
  if (conversa.tipo === 'grupo') return conversa.nome || 'Grupo sem nome';
  const outroId = conversa.participantesIds.find((id) => id !== currentUserId);
  const outro = usuarios.find((u) => u.id === outroId);
  return outro?.nome || 'Usuário removido';
}

function inicialAvatar(nome: string): string {
  return nome.substring(0, 2).toUpperCase();
}

function temNaoLida(conversa: ConversaChat, ultimasLeituras: Record<string, string | null>): boolean {
  const ultima = ultimasLeituras[conversa.id];
  if (!ultima) return true;
  return conversa.atualizadoEm > ultima;
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const ChatView: React.FC<ChatViewProps> = ({
  usuarios,
  currentUserId,
  conversas,
  ultimasLeituras,
  onAbrirConversa,
  onEnviarMensagem,
  onCriarConversaDireta,
  onCriarConversaGrupo,
}) => {
  const [conversaAbertaId, setConversaAbertaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [textoNovo, setTextoNovo] = useState('');
  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const fimDaListaRef = useRef<HTMLDivElement>(null);

  const conversaAberta = conversas.find((c) => c.id === conversaAbertaId) || null;

  // Carrega o histórico sempre que a conversa aberta muda, e assina mensagens novas em tempo
  // real — só anexa na tela quando for da conversa que está aberta agora (o filtro de "é minha
  // conversa" mais amplo já acontece lá em cima, em App.tsx, pro contador de não lidas).
  useEffect(() => {
    if (!conversaAbertaId) {
      setMensagens([]);
      return;
    }
    let cancelado = false;
    setCarregandoMensagens(true);
    getMensagens(conversaAbertaId)
      .then((lista) => {
        if (!cancelado) setMensagens(lista);
      })
      .catch((err) => console.error('Erro ao carregar mensagens:', err))
      .finally(() => {
        if (!cancelado) setCarregandoMensagens(false);
      });

    const cancelarInscricao = assinarMensagensNovas((msg) => {
      if (msg.conversaId !== conversaAbertaId) return;
      setMensagens((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      cancelado = true;
      cancelarInscricao();
    };
  }, [conversaAbertaId]);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const handleAbrirConversa = (id: string) => {
    setConversaAbertaId(id);
    onAbrirConversa(id);
  };

  const handleEnviar = () => {
    if (!conversaAbertaId || !textoNovo.trim()) return;
    onEnviarMensagem(conversaAbertaId, textoNovo);
    setTextoNovo('');
  };

  const conversasFiltradas = useMemo(() => {
    const ordenadas = [...conversas].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    if (!busca.trim()) return ordenadas;
    const termo = busca.trim().toLowerCase();
    return ordenadas.filter((c) => nomeDaConversa(c, usuarios, currentUserId).toLowerCase().includes(termo));
  }, [conversas, busca, usuarios, currentUserId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex h-[calc(100vh-180px)] min-h-[420px]">
      {/* Lista de Conversas */}
      <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => setIsNovaConversaOpen(true)}
            className="w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <MessageSquarePlus className="w-4 h-4" /> Nova Conversa
          </button>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-no-uppercase="true"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-hidden focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 && (
            <p className="text-[11px] text-slate-400 text-center p-6">
              Nenhuma conversa ainda. Clique em "Nova Conversa" pra começar.
            </p>
          )}
          {conversasFiltradas.map((c) => {
            const nome = nomeDaConversa(c, usuarios, currentUserId);
            const naoLida = temNaoLida(c, ultimasLeituras);
            const ativa = c.id === conversaAbertaId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleAbrirConversa(c.id)}
                className={`w-full flex items-center gap-2.5 p-3 border-b border-slate-50 text-left transition-colors ${
                  ativa ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                    c.tipo === 'grupo' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {c.tipo === 'grupo' ? <Users className="w-4 h-4" /> : inicialAvatar(nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs truncate ${naoLida ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                    {nome}
                  </p>
                  <p className="text-[10px] text-slate-400">{c.tipo === 'grupo' ? `${c.participantesIds.length} participantes` : 'Conversa direta'}</p>
                </div>
                {naoLida && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread da Conversa Aberta */}
      <div className="flex-1 flex flex-col min-w-0">
        {!conversaAberta ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <User className="w-8 h-8" />
            <p className="text-xs">Selecione uma conversa pra começar</p>
          </div>
        ) : (
          <>
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-2.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                  conversaAberta.tipo === 'grupo' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {conversaAberta.tipo === 'grupo' ? <Users className="w-4 h-4" /> : inicialAvatar(nomeDaConversa(conversaAberta, usuarios, currentUserId))}
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">{nomeDaConversa(conversaAberta, usuarios, currentUserId)}</p>
                {conversaAberta.tipo === 'grupo' && (
                  <p className="text-[10px] text-slate-400">
                    {conversaAberta.participantesIds
                      .map((id) => usuarios.find((u) => u.id === id)?.nome)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
              {carregandoMensagens && <p className="text-[11px] text-slate-400 text-center">Carregando...</p>}
              {!carregandoMensagens && mensagens.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-6">Nenhuma mensagem ainda — diga oi!</p>
              )}
              {mensagens.map((m) => {
                const propria = m.autorId === currentUserId;
                const autor = usuarios.find((u) => u.id === m.autorId);
                return (
                  <div key={m.id} className={`flex ${propria ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-xs ${
                      propria ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}>
                      {!propria && conversaAberta.tipo === 'grupo' && (
                        <p className="text-[10px] font-bold text-indigo-500 mb-0.5">{autor?.nome || 'Alguém'}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                      <p className={`text-[9px] mt-1 text-right ${propria ? 'text-slate-400' : 'text-slate-400'}`}>{formatHora(m.criadoEm)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={fimDaListaRef} />
            </div>

            <div className="p-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={textoNovo}
                onChange={(e) => setTextoNovo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEnviar();
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              />
              <button
                type="button"
                onClick={handleEnviar}
                disabled={!textoNovo.trim()}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                title="Enviar (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <NovaConversaModal
        isOpen={isNovaConversaOpen}
        onClose={() => setIsNovaConversaOpen(false)}
        usuarios={usuarios}
        currentUserId={currentUserId}
        onCriarDireta={onCriarConversaDireta}
        onCriarGrupo={onCriarConversaGrupo}
      />
    </div>
  );
};
