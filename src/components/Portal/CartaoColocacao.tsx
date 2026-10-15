import React, { useEffect, useState } from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { PosicaoColaborador, portalGamificacao } from '../../utils/gamificacaoApi';
import { nomeMes } from '../Frequencia/espelhoPdf';

/** Colocação do próprio colaborador no mês (Top 10 com a posição exata; os demais veem quanto
 *  falta pra entrar). Vem da classificação gravada pelo DP — nunca mostra os colegas. */
export const CartaoColocacao: React.FC<{ credenciais: CredenciaisPortal; onAbrir: () => void }> = ({ credenciais, onAbrir }) => {
  const [p, setP] = useState<PosicaoColaborador | null>(null);

  useEffect(() => {
    let cancelado = false;
    portalGamificacao(credenciais)
      .then((r) => !cancelado && setP(r.posicao ?? null))
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [credenciais]);

  if (!p) return null;
  const top10 = p.pontos > 0 && p.posicao <= 10;
  // Empatar com o 10º já põe no Top 10 (empate divide a posição).
  const faltam = Math.max(1, p.pontosTop10 - p.pontos);
  const atualizado = new Date(p.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const medalha = p.posicao === 1 ? '🥇' : p.posicao === 2 ? '🥈' : p.posicao === 3 ? '🥉' : '🏅';

  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`w-full text-left normal-case tracking-normal rounded-2xl border p-4 shadow-xs flex items-center gap-3 ${
        top10 ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' : 'bg-white border-slate-200'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl ${top10 ? 'bg-white shadow-sm' : 'bg-amber-50 text-[#C48229]'}`}>
        {top10 ? medalha : <Trophy className="w-6 h-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">Meu desempenho · {nomeMes(p.periodo)}</p>
        {top10 ? (
          <p className="text-sm font-black text-slate-900 leading-snug">
            Você está em {p.posicao}º lugar! <span className="font-semibold text-slate-600">· {p.pontos} pts</span>
          </p>
        ) : p.pontos > 0 ? (
          <p className="text-sm font-black text-slate-900 leading-snug">
            {p.pontos} pts — faltam {faltam} para entrar no Top 10
          </p>
        ) : (
          <p className="text-sm font-black text-slate-900 leading-snug">Comece a pontuar: veja suas missões do mês</p>
        )}
        <p className="text-[10px] text-slate-400">Atualizado em {atualizado}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
    </button>
  );
};
