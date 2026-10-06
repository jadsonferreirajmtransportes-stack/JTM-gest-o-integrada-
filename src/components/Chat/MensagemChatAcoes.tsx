// Peças pra editar/apagar a própria mensagem no chat (ChatView e FloatingChatWidget).
import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, Ban } from 'lucide-react';

/** Botões que aparecem ao passar o mouse na própria mensagem (no celular ficam sempre visíveis). */
export const AcoesMensagemChat: React.FC<{
  podeEditar: boolean;
  onEditar: () => void;
  onApagar: () => void;
  compacto?: boolean;
}> = ({ podeEditar, onEditar, onApagar, compacto }) => {
  const tam = compacto ? 11 : 13;
  const botao = `${compacto ? 'p-0.5' : 'p-1'} rounded-md text-slate-400 hover:bg-slate-100`;
  return (
    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      {podeEditar && (
        <button type="button" onClick={onEditar} title="Editar mensagem" className={`${botao} hover:text-[#C48229]`}>
          <Pencil size={tam} />
        </button>
      )}
      <button type="button" onClick={onApagar} title="Apagar mensagem" className={`${botao} hover:text-rose-600`}>
        <Trash2 size={tam} />
      </button>
    </div>
  );
};

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
