import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, X, Send, ArrowLeft, Maximize2, Users, User } from 'lucide-react';
import { ConversaChat, MensagemChat, UsuarioLogin } from '../../types';
import { getMensagens, assinarMensagensNovas, AnexoMensagemChat } from '../../utils/chatApi';

interface FloatingChatWidgetProps {
  usuarios: UsuarioLogin[];
  currentUserId: string;
  conversas: ConversaChat[];
  ultimasLeituras: Record<string, string | null>;
  onAbrirConversa: (conversaId: string) => void;
  onEnviarMensagem: (conversaId: string, texto: string, anexo?: AnexoMensagemChat) => void;
  /** Leva pra tela cheia do Chat Interno (módulo completo) — usado pelo botão "expandir" e
   *  pra "Nova Conversa" (esse widget flutuante não duplica aquele fluxo). */
  onAbrirTelaCheia: () => void;
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

/** Janelinha de chat flutuante (canto inferior direito), visível em qualquer tela do sistema —
 *  não precisa estar dentro do módulo Chat Interno pra ver/responder uma conversa rápida. A
 *  versão completa (buscar, nova conversa, @menções, anexos) continua só no módulo Chat Interno;
 *  aqui é só o essencial (ler e responder) pra não atrapalhar quem está trabalhando em outra tela. */
export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  usuarios,
  currentUserId,
  conversas,
  ultimasLeituras,
  onAbrirConversa,
  onEnviarMensagem,
  onAbrirTelaCheia,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversaAbertaId, setConversaAbertaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [texto, setTexto] = useState('');
  const fimDaListaRef = useRef<HTMLDivElement>(null);

  const conversasOrdenadas = useMemo(
    () => [...conversas].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
    [conversas]
  );
  const totalNaoLidas = useMemo(
    () => conversas.filter((c) => temNaoLida(c, ultimasLeituras)).length,
    [conversas, ultimasLeituras]
  );
  const conversaAberta = conversas.find((c) => c.id === conversaAbertaId) || null;

  useEffect(() => {
    if (!conversaAbertaId) {
      setMensagens([]);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    getMensagens(conversaAbertaId)
      .then((lista) => {
        if (!cancelado) setMensagens(lista);
      })
      .catch((err) => console.error('Erro ao carregar mensagens (widget):', err))
      .finally(() => {
        if (!cancelado) setCarregando(false);
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

  const handleAbrir = (id: string) => {
    setConversaAbertaId(id);
    onAbrirConversa(id);
  };

  const handleEnviar = () => {
    if (!conversaAbertaId || !texto.trim()) return;
    onEnviarMensagem(conversaAbertaId, texto);
    setTexto('');
  };

  const handleFechar = () => {
    setIsOpen(false);
    setConversaAbertaId(null);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Chat Interno"
        className="fixed bottom-20 right-5 z-[60] w-13 h-13 rounded-full bg-[#B38F4F] hover:bg-[#8A6A39] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105"
        style={{ width: 52, height: 52 }}
      >
        <MessageSquare className="w-5 h-5" />
        {totalNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white">
            {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-5 z-[60] w-[340px] h-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-150">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#B38F4F] text-white flex items-center gap-2 shrink-0">
        {conversaAberta ? (
          <button type="button" onClick={() => setConversaAbertaId(null)} className="p-0.5 hover:bg-white/15 rounded-lg shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <MessageSquare className="w-4 h-4 shrink-0" />
        )}
        <span className="text-xs font-bold truncate flex-1">
          {conversaAberta ? nomeDaConversa(conversaAberta, usuarios, currentUserId) : 'Chat Interno'}
        </span>
        <button
          type="button"
          onClick={onAbrirTelaCheia}
          title="Abrir tela cheia"
          className="p-1 hover:bg-white/15 rounded-lg shrink-0"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={handleFechar} title="Fechar" className="p-1 hover:bg-white/15 rounded-lg shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!conversaAberta ? (
        /* Lista de conversas */
        <div className="flex-1 overflow-y-auto">
          {conversasOrdenadas.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2 text-slate-400">
              <MessageSquare className="w-8 h-8" />
              <p className="text-[11px]">Nenhuma conversa ainda.</p>
              <button
                type="button"
                onClick={onAbrirTelaCheia}
                className="text-[11px] font-semibold text-[#B38F4F] hover:underline"
              >
                Abrir Chat Interno
              </button>
            </div>
          )}
          {conversasOrdenadas.map((c) => {
            const nome = nomeDaConversa(c, usuarios, currentUserId);
            const naoLida = temNaoLida(c, ultimasLeituras);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleAbrir(c.id)}
                className="w-full flex items-center gap-2.5 p-2.5 border-b border-slate-50 text-left hover:bg-slate-50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                    c.tipo === 'grupo' ? 'bg-amber-100 text-[#8A6A39]' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {c.tipo === 'grupo' ? <Users className="w-3.5 h-3.5" /> : inicialAvatar(nome)}
                </div>
                <span className={`text-xs truncate flex-1 ${naoLida ? 'font-extrabold text-slate-900' : 'font-medium text-slate-700'}`}>
                  {nome}
                </span>
                {naoLida && <span className="w-2 h-2 rounded-full bg-[#B38F4F] shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : (
        /* Thread da conversa */
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
            {carregando && <p className="text-[10px] text-slate-400 text-center">Carregando...</p>}
            {!carregando && mensagens.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-4">Nenhuma mensagem ainda — diga oi!</p>
            )}
            {mensagens.map((m) => {
              const propria = m.autorId === currentUserId;
              const autor = usuarios.find((u) => u.id === m.autorId);
              return (
                <div key={m.id} className={`flex ${propria ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-[11px] ${
                      propria ? 'bg-[#B38F4F] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {!propria && conversaAberta.tipo === 'grupo' && (
                      <p className="text-[9px] font-bold text-[#8A6A39] mb-0.5">{autor?.nome || 'Alguém'}</p>
                    )}
                    {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
                    {m.anexoUrl && !m.texto && (
                      <p className="italic opacity-80">📎 {m.anexoNome || 'Anexo'}</p>
                    )}
                    <p className={`text-[8px] mt-0.5 text-right ${propria ? 'text-white/70' : 'text-slate-400'}`}>
                      {formatHora(m.criadoEm)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={fimDaListaRef} />
          </div>

          <div className="p-2 border-t border-slate-100 flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              data-no-uppercase="true"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEnviar();
                }
              }}
              placeholder="Escreva uma mensagem..."
              className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]/40"
            />
            <button
              type="button"
              onClick={handleEnviar}
              disabled={!texto.trim()}
              className="p-1.5 bg-[#B38F4F] hover:bg-[#8A6A39] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
              title="Enviar (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
