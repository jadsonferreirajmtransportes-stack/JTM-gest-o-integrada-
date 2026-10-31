import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, X } from 'lucide-react';

/** Hook: true quando a tela é de celular/tablet (onde o app usa o layout do app do colaborador). */
export function useCelular(): boolean {
  const consulta = '(max-width: 1023px)';
  const [celular, setCelular] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(consulta).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const mudou = () => setCelular(mq.matches);
    mq.addEventListener('change', mudou);
    return () => mq.removeEventListener('change', mudou);
  }, []);
  return celular;
}

interface Props {
  /** Ação principal da tela (ex.: "Novo POP"). No celular vira o botão dourado fixo no canto. */
  principal?: React.ReactNode;
  /** Demais ações (Excel, PDF, Importar...). No celular ficam no menu "⋯" do topo escuro. */
  children?: React.ReactNode;
  /** Classes do grupo de botões no computador (fica igual ao que era). */
  className?: string;
  /** false = no celular não mostra o botão flutuante agora (ex.: com um item aberto em tela cheia). */
  flutuante?: boolean;
  /** true = fica sempre no lugar, como no computador (ex.: tela embutida dentro de outra). */
  noLugar?: boolean;
}

/**
 * Botões de ação de uma tela, no padrão do app: no computador ficam onde sempre estiveram; no
 * celular a ação principal vira o botão dourado flutuante (acima da barra de baixo) e as outras
 * entram no menu "⋯" do topo escuro. Os mesmos botões (mesmo onClick) são usados nos dois.
 */
export const AcoesTela: React.FC<Props> = ({ principal, children, className = 'flex flex-wrap items-center gap-2', flutuante = true, noLugar = false }) => {
  const celular = useCelular();
  const [menuAberto, setMenuAberto] = useState(false);
  const [alvoTopo, setAlvoTopo] = useState<HTMLElement | null>(null);
  const temSecundarias = React.Children.toArray(children).filter(Boolean).length > 0;

  useEffect(() => {
    if (celular) setAlvoTopo(document.getElementById('acoes-tela-topo'));
  }, [celular]);

  if (!celular || noLugar) {
    return (
      <div className={className}>
        {children}
        {principal}
      </div>
    );
  }

  return (
    <>
      {principal && flutuante && createPortal(<div className="fab-principal">{principal}</div>, document.body)}
      {temSecundarias &&
        alvoTopo &&
        createPortal(
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            title="Mais ações desta tela"
            aria-label="Mais ações desta tela"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>,
          alvoTopo
        )}
      {/* Fica sempre montado (só escondido) — assim um campo de arquivo dentro do menu não some
          enquanto a janela de escolher arquivo está aberta. */}
      {temSecundarias &&
        createPortal(
          <div className={`fixed inset-0 z-[60] bg-slate-900/50 items-end ${menuAberto ? 'flex' : 'hidden'}`} onClick={() => setMenuAberto(false)}>
            <div
              className="folha-acoes w-full bg-white rounded-t-3xl p-4 space-y-1.5 max-h-[80vh] overflow-y-auto"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
              onClick={(e) => e.stopPropagation()}
              // Qualquer ação escolhida fecha o menu (o clique chega no botão antes).
              onClickCapture={(e) => {
                if ((e.target as HTMLElement).closest('button, a, label')) setTimeout(() => setMenuAberto(false), 0);
              }}
            >
              <div className="flex items-center justify-between pb-1">
                <span className="w-10 h-1 rounded-full bg-slate-200 mx-auto absolute left-1/2 -translate-x-1/2 -mt-2" />
                <p className="text-sm font-black text-slate-900">Ações</p>
                <button type="button" onClick={() => setMenuAberto(false)} className="p-1.5 text-slate-400" aria-label="Fechar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {children}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
