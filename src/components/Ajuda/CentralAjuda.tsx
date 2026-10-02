import React, { useEffect, useState } from 'react';
import { HelpCircle, PlayCircle, X } from 'lucide-react';
import { TopicoManual, topicoDaSecao } from '../../data/manualSistema';
import { AjudaPainel } from './AjudaPainel';
import { TourGuiado } from './TourGuiado';

// Tour já visto (ou dispensado) por login e por tela — só neste navegador.
const chaveTour = (usuarioId: string, secao: string) => `jmt-tour-visto:${usuarioId}:${secao}`;
function tourJaVisto(usuarioId: string, secao: string): boolean {
  try {
    return localStorage.getItem(chaveTour(usuarioId, secao)) === '1';
  } catch {
    return true; // sem armazenamento: não fica oferecendo o tour toda hora
  }
}
function marcarTourVisto(usuarioId: string, secao: string) {
  try {
    localStorage.setItem(chaveTour(usuarioId, secao), '1');
  } catch {
    /* ignora */
  }
}

/** Botão "?" do cabeçalho + painel de ajuda (F1) + tour guiado. Na primeira vez que o login
 *  abre uma tela que tem tour, aparece um convite discreto no canto (não abre sozinho). */
export const CentralAjuda: React.FC<{ secaoAtual: string; usuarioId?: string }> = ({ secaoAtual, usuarioId = 'anonimo' }) => {
  const [painel, setPainel] = useState(false);
  const [tour, setTour] = useState<TopicoManual | null>(null);
  const [convite, setConvite] = useState<TopicoManual | null>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setPainel(true);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  // Convite de tour na primeira visita (espera a tela montar).
  useEffect(() => {
    setConvite(null);
    const topico = topicoDaSecao(secaoAtual);
    if (!topico?.tour || tourJaVisto(usuarioId, secaoAtual)) return;
    const id = setTimeout(() => setConvite(topico), 1200);
    return () => clearTimeout(id);
  }, [secaoAtual, usuarioId]);

  const iniciarTour = (t: TopicoManual) => {
    setPainel(false);
    setConvite(null);
    marcarTourVisto(usuarioId, t.id);
    // Espera o painel fechar antes de medir os elementos da tela.
    setTimeout(() => setTour(t), 150);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setPainel(true)}
        className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
        title="Ajuda desta tela (F1)"
        aria-label="Ajuda"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {painel && <AjudaPainel secaoAtual={secaoAtual} onClose={() => setPainel(false)} onIniciarTour={iniciarTour} />}

      {tour?.tour && <TourGuiado titulo={tour.titulo} passos={tour.tour} onFim={() => setTour(null)} />}

      {convite && !tour && !painel && (
        <div data-ajuda-ui className="fixed bottom-4 right-4 z-[70] w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-black text-slate-900">Primeira vez em {convite.titulo}?</p>
            <button
              type="button"
              onClick={() => {
                marcarTourVisto(usuarioId, convite.id);
                setConvite(null);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-700"
              aria-label="Dispensar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-600">Um tour rápido mostra onde ficam as principais funções desta tela.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => iniciarTour(convite)} className="flex-1 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center justify-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5" /> Fazer o tour
            </button>
            <button
              type="button"
              onClick={() => {
                marcarTourVisto(usuarioId, convite.id);
                setConvite(null);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-600"
            >
              Agora não
            </button>
          </div>
          <p className="text-[10px] text-slate-400">A ajuda fica sempre no botão "?" lá em cima (ou F1).</p>
        </div>
      )}
    </>
  );
};
