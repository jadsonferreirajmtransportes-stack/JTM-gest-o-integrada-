// Peças das ações na mensagem do chat (ChatView e FloatingChatWidget): responder (citação),
// editar e apagar a própria mensagem.
import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, Ban, Reply, X } from 'lucide-react';
import type { MensagemChat } from '../../types';

/** Botões que aparecem ao passar o mouse na mensagem (no celular ficam sempre visíveis).
 *  Responder vale pra qualquer mensagem; editar/apagar só pra própria. */
export const AcoesMensagemChat: React.FC<{
  podeEditar?: boolean;
  onEditar?: () => void;
  onApagar?: () => void;
  onResponder?: () => void;
  compacto?: boolean;
}> = ({ podeEditar, onEditar, onApagar, onResponder, compacto }) => {
  const tam = compacto ? 11 : 13;
  const botao = `${compacto ? 'p-0.5' : 'p-1'} rounded-md text-slate-400 hover:bg-slate-100`;
  return (
    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      {onResponder && (
        <button type="button" onClick={onResponder} title="Responder" className={`${botao} hover:text-[#C48229]`}>
          <Reply size={tam} />
        </button>
      )}
      {podeEditar && onEditar && (
        <button type="button" onClick={onEditar} title="Editar mensagem" className={`${botao} hover:text-[#C48229]`}>
          <Pencil size={tam} />
        </button>
      )}
      {onApagar && (
        <button type="button" onClick={onApagar} title="Apagar mensagem" className={`${botao} hover:text-rose-600`}>
          <Trash2 size={tam} />
        </button>
      )}
    </div>
  );
};

const resumoMensagem = (m: MensagemChat) =>
  m.apagada ? 'Mensagem apagada' : m.texto?.trim() ? m.texto.replace(/\s+/g, ' ').slice(0, 140) : m.anexoNome ? `📎 ${m.anexoNome}` : 'Anexo';

/** Leva até a mensagem original e pisca ela por um instante. */
export function irParaMensagem(id: string, prefixo = 'msg-') {
  const el = document.getElementById(`${prefixo}${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('bg-amber-100');
  setTimeout(() => el.classList.remove('bg-amber-100'), 1400);
}

/** Citação dentro do balão da resposta (autor + trecho); clicar leva até a original. */
export const CitacaoMensagem: React.FC<{
  original?: MensagemChat;
  usuarios: { id: string; nome: string }[];
  propria: boolean;
  compacto?: boolean;
  prefixoId?: string;
}> = ({ original, usuarios, propria, compacto, prefixoId = 'msg-' }) => {
  const autor = original ? usuarios.find((u) => u.id === original.autorId)?.nome || 'Alguém' : '';
  return (
    <button
      type="button"
      onClick={() => original && irParaMensagem(original.id, prefixoId)}
      className={`block w-full text-left normal-case tracking-normal rounded-lg border-l-4 px-2 py-1 mb-1 ${compacto ? 'text-[10px]' : 'text-[11px]'} ${
        propria ? 'bg-white/20 border-white/70 text-white' : 'bg-amber-50 border-[#C48229] text-slate-700'
      }`}
      title={original ? 'Ir para a mensagem original' : ''}
    >
      {original ? (
        <>
          <span className={`block font-bold ${propria ? 'text-white' : 'text-[#92611F]'}`}>{autor}</span>
          <span className="block truncate opacity-90">{resumoMensagem(original)}</span>
        </>
      ) : (
        <span className="italic opacity-80">Mensagem original indisponível</span>
      )}
    </button>
  );
};

/** Faixa acima da caixa de texto: "Respondendo a Fulano: ..." com o X pra cancelar. */
export const BarraRespondendo: React.FC<{
  mensagem: MensagemChat;
  usuarios: { id: string; nome: string }[];
  onCancelar: () => void;
  compacto?: boolean;
}> = ({ mensagem, usuarios, onCancelar, compacto }) => (
  <div className={`${compacto ? 'mx-2 mb-1' : 'mx-3 mb-1'} flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border-l-4 border-[#C48229] rounded-lg`}>
    <Reply className="w-3.5 h-3.5 text-[#C48229] shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold text-[#92611F]">Respondendo a {usuarios.find((u) => u.id === mensagem.autorId)?.nome || 'mensagem'}</p>
      <p className="text-[11px] text-slate-600 truncate">{resumoMensagem(mensagem)}</p>
    </div>
    <button type="button" onClick={onCancelar} className="p-1 text-slate-400 hover:text-slate-700 shrink-0" title="Cancelar resposta">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);

/** Caixa de edição dentro do balão — Enter salva, Shift+Enter quebra linha, Esc cancela. */
export const EditorMensagemChat: React.FC<{
  textoInicial: string;
  onSalvar: (texto: string) => void | Promise<void>;
  onCancelar: () => void;
}> = ({ textoInicial, onSalvar, onCancelar }) => {
  const [texto, setTexto] = useState(textoInicial);
  const [salvando, setSalvando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const salvar = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      await onSalvar(texto);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <textarea
        ref={ref}
        value={texto}
        data-no-uppercase="true"
        data-texto-livre="true"
        rows={Math.min(6, Math.max(2, texto.split('\n').length))}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            salvar();
          } else if (e.key === 'Escape') {
            onCancelar();
          }
        }}
        className="w-full rounded-lg bg-white text-slate-800 border border-slate-200 px-2 py-1.5 outline-none focus:ring-2 focus:ring-white/60 resize-none"
      />
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={onCancelar} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 hover:bg-white/30">
          Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || !texto.trim()}
          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-[#92611F] hover:bg-white/90 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
};

export const MensagemApagada: React.FC = () => (
  <p className="italic opacity-75 flex items-center gap-1">
    <Ban size={11} /> Mensagem apagada
  </p>
);
