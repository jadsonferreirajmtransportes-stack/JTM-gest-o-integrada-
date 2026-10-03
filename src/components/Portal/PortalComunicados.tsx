import React, { useEffect, useState } from 'react';
import { Loader2, ChevronLeft, Megaphone, CheckCircle2 } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { ComunicadoPortal, portalComunicados } from '../../utils/portalColaboradorApi';
import { ComunicadoPublicView } from '../Comunicados/ComunicadoPublicView';

/** Comunicados enviados ao colaborador (abre pela mesma tela do link do comunicado). */
export const PortalComunicados: React.FC<{ credenciais: CredenciaisPortal; comunicadoInicial?: string; onMudou?: (pendentes: number) => void }> = ({
  credenciais,
  comunicadoInicial,
  onMudou,
}) => {
  const [lista, setLista] = useState<ComunicadoPortal[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(comunicadoInicial || null);

  const carregar = () =>
    portalComunicados(credenciais)
      .then((l) => {
        setLista(l);
        onMudou?.(l.filter((c) => !c.visualizadoEm || (c.exigeCiencia && !c.cienteEm)).length);
      })
      .catch((err) => {
        console.error(err);
        setErro(err instanceof Error ? err.message : 'Não foi possível carregar os comunicados.');
        setLista([]);
      });

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais]);

  if (abertoId) {
    const c = lista?.find((x) => x.id === abertoId);
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setAbertoId(null);
            carregar();
          }}
          className="text-xs font-bold text-[#92611F] flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Todos os comunicados
        </button>
        {c ? (
          <ComunicadoPublicView key={c.token} token={c.token} embutido onCiente={carregar} />
        ) : lista === null ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : (
          <p className="text-xs text-slate-500">Este comunicado não está mais disponível.</p>
        )}
      </div>
    );
  }

  if (lista === null) {
    return (
      <p className="text-xs text-slate-500 flex items-center gap-2 p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
      </p>
    );
  }
  if (erro) return <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>;
  if (lista.length === 0) {
    return <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Nenhum comunicado para você por enquanto.</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
      {lista.map((c) => {
        const falta = c.exigeCiencia && !c.cienteEm;
        const novo = !c.visualizadoEm;
        return (
          <button key={c.id} type="button" onClick={() => setAbertoId(c.id)} className="w-full text-left normal-case p-4 flex items-center gap-3 hover:bg-slate-50">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">
                {c.categoria} · nº {String(c.numero).padStart(3, '0')}/{c.ano}
              </p>
              <p className={`text-sm text-slate-900 truncate ${novo ? 'font-black' : 'font-semibold'}`}>{c.titulo}</p>
              <p className="text-[11px] text-slate-500">{new Date(c.criadoEm).toLocaleDateString('pt-BR')}</p>
            </div>
            {falta ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-[#92611F] border border-amber-200 shrink-0">Confirmar leitura</span>
            ) : novo ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">Novo</span>
            ) : c.cienteEm ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
