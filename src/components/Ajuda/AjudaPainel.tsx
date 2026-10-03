import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, PlayCircle, ChevronLeft, Lightbulb, BookOpen, HelpCircle } from 'lucide-react';
import { MANUAL, TopicoManual, buscarNoManual, topicoDaSecao } from '../../data/manualSistema';
import { telasDaSecao } from '../../data/telasTreinamento';
import { TelasIlustradas } from '../Educacao/TelasIlustradas';

interface AjudaPainelProps {
  secaoAtual: string;
  onClose: () => void;
  onIniciarTour: (t: TopicoManual) => void;
}

const GRUPOS: TopicoManual['grupo'][] = ['Começando', 'Gestão', 'Operações', 'Departamento Pessoal', 'Corporativo'];

/** Ajuda lateral: abre no tópico da tela atual, busca no manual todo e inicia o tour guiado. */
export const AjudaPainel: React.FC<AjudaPainelProps> = ({ secaoAtual, onClose, onIniciarTour }) => {
  const daTela = topicoDaSecao(secaoAtual);
  const [aberto, setAberto] = useState<TopicoManual | null>(daTela || topicoDaSecao('primeiros_passos') || null);
  const [busca, setBusca] = useState('');
  const [vendoIndice, setVendoIndice] = useState(false);
  const corpoRef = useRef<HTMLDivElement>(null);
  const resultados = useMemo(() => (busca.trim() ? buscarNoManual(busca) : []), [busca]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onClose]);

  const abrir = (t: TopicoManual) => {
    setAberto(t);
    setBusca('');
    setVendoIndice(false);
    corpoRef.current?.scrollTo({ top: 0 });
  };

  const mostrandoLista = busca.trim().length > 0 || vendoIndice || !aberto;

  return (
    <div data-ajuda-ui className="fixed inset-0 z-[80] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30" />
      <aside
        className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        aria-label="Ajuda do sistema"
      >
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#C48229]" /> Ajuda do sistema
            </h2>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Fechar ajuda">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder='Buscar no manual (ex.: "assinatura", "ponto", "férias")'
              className="w-full pl-8 p-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div ref={corpoRef} className="flex-1 overflow-y-auto p-4 text-xs">
          {mostrandoLista ? (
            busca.trim() ? (
              resultados.length === 0 ? (
                <p className="text-slate-500">Nada encontrado para "{busca}". Tente outra palavra.</p>
              ) : (
                <ul className="space-y-2">
                  {resultados.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => abrir(t)} className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-[#C48229]">
                        <p className="text-[10px] font-bold text-[#92611F]">{t.grupo}</p>
                        <p className="font-bold text-slate-900">{t.titulo}</p>
                        <p className="text-slate-500 line-clamp-2">{t.resumo}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="space-y-4">
                {GRUPOS.map((g) => (
                  <section key={g}>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{g}</h3>
                    <ul className="space-y-0.5">
                      {MANUAL.filter((t) => t.grupo === g).map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => abrir(t)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 font-semibold ${t.id === secaoAtual ? 'text-[#92611F]' : 'text-slate-700'}`}
                          >
                            {t.titulo}
                            {t.id === secaoAtual && <span className="text-[10px] font-normal text-slate-400"> · tela atual</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )
          ) : (
            aberto && (
              <article className="space-y-4">
                <button type="button" onClick={() => setVendoIndice(true)} className="text-[11px] font-bold text-[#92611F] flex items-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" /> Todos os assuntos
                </button>
                <div>
                  <p className="text-[10px] font-bold text-[#92611F]">
                    {aberto.grupo}
                    {aberto.id === secaoAtual && ' · você está nesta tela'}
                  </p>
                  <h3 className="text-base font-black text-slate-900">{aberto.titulo}</h3>
                  <p className="text-slate-600 mt-1 leading-relaxed">{aberto.resumo}</p>
                </div>
                {aberto.tour && aberto.id === secaoAtual && (
                  <button
                    type="button"
                    onClick={() => onIniciarTour(aberto)}
                    className="w-full py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" /> Fazer o tour desta tela
                  </button>
                )}
                <ol className="space-y-3">
                  {aberto.passos.map((p, k) => (
                    <li key={k} className="flex gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-50 text-[#92611F] text-[11px] font-black flex items-center justify-center shrink-0">{k + 1}</span>
                      <div>
                        <p className="font-bold text-slate-800">{p.titulo}</p>
                        <p className="text-slate-600 leading-relaxed">{p.texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {telasDaSecao(aberto.id).length > 0 && (
                  <section className="space-y-2">
                    <p className="font-black text-slate-700 uppercase tracking-wide text-[11px]">Veja nas telas</p>
                    <TelasIlustradas
                      compacto
                      telas={telasDaSecao(aberto.id).map((t) => ({ titulo: t.titulo, imagem: `/treinamento-sistema/${t.id}.png`, marcas: t.marcas.map((m) => m.texto) }))}
                    />
                  </section>
                )}
                {aberto.dicas && aberto.dicas.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                    <p className="font-bold text-[#7A4F17] flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" /> Dicas
                    </p>
                    {aberto.dicas.map((d) => (
                      <p key={d} className="text-[#7A4F17] leading-relaxed">
                        • {d}
                      </p>
                    ))}
                  </div>
                )}
                {aberto.id !== 'primeiros_passos' && (
                  <button type="button" onClick={() => abrir(topicoDaSecao('primeiros_passos')!)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Primeiros passos no sistema
                  </button>
                )}
              </article>
            )
          )}
        </div>
        <p className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">Atalho: F1 abre a ajuda · Esc fecha</p>
      </aside>
    </div>
  );
};
