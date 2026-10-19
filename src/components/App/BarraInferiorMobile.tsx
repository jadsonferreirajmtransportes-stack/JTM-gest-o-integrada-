import React from 'react';
import { CalendarDays, Menu, MessageSquare, NotebookPen, ShoppingCart } from 'lucide-react';

/** Atalho da barra de baixo: módulo global + seção que ele abre. */
interface Atalho {
  modulo: string;
  secao: string;
  rotulo: string;
  icone: React.ElementType;
  badge?: number;
}

interface Props {
  moduloAtivo: string;
  modulosPermitidos?: string[];
  menuAberto: boolean;
  badges: { chat?: number; agenda?: number; compras?: number };
  onIr: (modulo: string, secao: string) => void;
  onAbrirMenu: () => void;
}

/**
 * Barra fixa embaixo da tela, só no celular/tablet (some no computador, onde o menu lateral
 * fica sempre aberto). Atalhos escolhidos pelo usuário: Chat, Agenda, Notas e Compras — cada
 * um só aparece se o login tiver o módulo liberado. "Mais" abre o menu completo.
 */
export const BarraInferiorMobile: React.FC<Props> = ({ moduloAtivo, modulosPermitidos, menuAberto, badges, onIr, onAbrirMenu }) => {
  const atalhos: Atalho[] = [
    { modulo: 'chat', secao: 'chat', rotulo: 'Chat', icone: MessageSquare, badge: badges.chat },
    { modulo: 'agenda', secao: 'agenda_gestao', rotulo: 'Agenda', icone: CalendarDays, badge: badges.agenda },
    { modulo: 'notas', secao: 'notas', rotulo: 'Notas', icone: NotebookPen },
    { modulo: 'compras', secao: 'compras', rotulo: 'Compras', icone: ShoppingCart, badge: badges.compras },
  ].filter((a) => !modulosPermitidos || modulosPermitidos.includes(a.modulo));

  const item = (ativo: boolean) =>
    `relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[10px] font-bold normal-case tracking-normal transition-colors ${
      ativo ? 'text-[#92611F]' : 'text-slate-500 active:text-slate-800'
    }`;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Atalhos"
    >
      {atalhos.map((a) => {
        const ativo = !menuAberto && moduloAtivo === a.modulo;
        const Icone = a.icone;
        return (
          <button key={a.modulo} type="button" onClick={() => onIr(a.modulo, a.secao)} className={item(ativo)} aria-current={ativo ? 'page' : undefined}>
            {ativo && <span className="absolute top-0 inset-x-5 h-0.5 rounded-full bg-[#C48229]" />}
            <span className="relative">
              <Icone className="w-[22px] h-[22px]" strokeWidth={ativo ? 2.4 : 2} />
              {!!a.badge && a.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center leading-none border-2 border-white">
                  {a.badge > 99 ? '99+' : a.badge}
                </span>
              )}
            </span>
            <span className="truncate max-w-full">{a.rotulo}</span>
          </button>
        );
      })}
      <button type="button" onClick={onAbrirMenu} className={item(menuAberto)}>
        <Menu className="w-[22px] h-[22px]" />
        <span>Mais</span>
      </button>
    </nav>
  );
};
