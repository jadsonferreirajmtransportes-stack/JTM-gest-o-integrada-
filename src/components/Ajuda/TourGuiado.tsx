import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { PassoTour } from '../../data/manualSistema';

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Acha na tela o elemento visível cujo texto (ou placeholder) contém `alvo` — o menor deles,
 *  pra destacar o botão e não o painel inteiro que o contém. */
export function acharAlvo(alvo?: string): HTMLElement | null {
  if (!alvo) return null;
  const procurado = normalizar(alvo);
  const candidatos = Array.from(
    document.querySelectorAll<HTMLElement>('main button, main a, main h1, main h2, main h3, main th, main label, main input[placeholder], button, input[placeholder]')
  ).filter((el) => {
    if (el.closest('[data-ajuda-ui]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const texto = el instanceof HTMLInputElement ? el.placeholder : el.textContent || '';
    return normalizar(texto).includes(procurado);
  });
  // Prefere o conteúdo da tela (<main>) ao menu lateral/cabeçalho; depois, o elemento com
  // menos texto (o botão em si, não o card inteiro que o contém).
  const peso = (el: HTMLElement) => (el.closest('main') ? 0 : 100000) + (el.textContent || '').length;
  candidatos.sort((a, b) => peso(a) - peso(b));
  return candidatos[0] || null;
}

interface Caixa {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Tour guiado: escurece a tela, destaca o elemento do passo e mostra o balão explicativo. */
export const TourGuiado: React.FC<{ titulo: string; passos: PassoTour[]; onFim: () => void }> = ({ titulo, passos, onFim }) => {
  const [i, setI] = useState(0);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const passo = passos[i];

  const medir = useCallback(() => {
    const el = acharAlvo(passo?.alvo);
    if (!el) {
      setCaixa(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setCaixa({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
  }, [passo]);

  useLayoutEffect(() => {
    const el = acharAlvo(passo?.alvo);
    el?.scrollIntoView({ block: 'center', inline: 'nearest' });
    const id = setTimeout(medir, 60);
    return () => clearTimeout(id);
  }, [passo, medir]);

  useEffect(() => {
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFim();
      if (e.key === 'ArrowRight') setI((v) => Math.min(passos.length - 1, v + 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('keydown', tecla);
    };
  }, [medir, onFim, passos.length]);

  if (!passo) return null;
  const ultimo = i === passos.length - 1;

  // Balão abaixo do elemento; se não couber, acima; sem elemento, no centro.
  const largura = Math.min(340, window.innerWidth - 24);
  let estiloBalao: React.CSSProperties;
  if (caixa) {
    const abaixo = caixa.top + caixa.height + 12;
    const cabeAbaixo = abaixo + 190 < window.innerHeight;
    estiloBalao = {
      width: largura,
      left: Math.max(12, Math.min(window.innerWidth - largura - 12, caixa.left + caixa.width / 2 - largura / 2)),
      top: cabeAbaixo ? abaixo : Math.max(12, caixa.top - 12 - 190),
    };
  } else {
    estiloBalao = { width: largura, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }

  return (
    <div data-ajuda-ui className="fixed inset-0 z-[90]" role="dialog" aria-label={`Tour: ${titulo}`}>
      {caixa ? (
        <div
          className="absolute rounded-xl ring-2 ring-[#C48229] transition-all duration-200 pointer-events-none"
          style={{ ...caixa, boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/55" />
      )}
      <div className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 text-xs space-y-2" style={estiloBalao}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold text-[#92611F] uppercase tracking-wide">
              {titulo} · {i + 1} de {passos.length}
            </p>
            <p className="text-sm font-black text-slate-900">{passo.titulo}</p>
          </div>
          <button type="button" onClick={onFim} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Fechar tour">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-slate-600 leading-relaxed">{passo.texto}</p>
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={onFim} className="text-slate-400 hover:text-slate-700 font-semibold">
            Pular
          </button>
          <div className="flex gap-1.5">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700">
                Anterior
              </button>
            )}
            <button type="button" onClick={() => (ultimo ? onFim() : setI(i + 1))} className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold">
              {ultimo ? 'Concluir' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
