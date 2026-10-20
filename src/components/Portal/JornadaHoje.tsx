import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Fingerprint, Loader2 } from 'lucide-react';
import { HistoricoPonto, pontoHistorico } from '../../utils/frequenciaApi';
import { diasDoMes, formatarMinutos, hojeLocal, horaLocal, montarEspelho, resumir, NOMES_DIA } from '../Frequencia/frequenciaCalc';
import type { CredenciaisPortal } from '../../utils/educacaoApi';

// Início do portal: a jornada de hoje (Entrada / Intervalo / Retorno / Saída), horas
// trabalhadas hoje, saldo do mês e aviso de dia com batida faltando. Usa o mesmo cálculo do
// "Meu histórico" (portal_ponto_historico, migração 072) — mostra o mesmo que o DP vê.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const CartaoJornadaHoje: React.FC<{
  credenciais: CredenciaisPortal;
  onBater: () => void;
  onHistorico: () => void;
}> = ({ credenciais, onBater, onHistorico }) => {
  const hoje = hojeLocal();
  const mes = hoje.slice(0, 7);
  const [historico, setHistorico] = useState<HistoricoPonto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    let cancelado = false;
    pontoHistorico(credenciais, mes)
      .then((r) => !cancelado && setHistorico(r.historico ?? null))
      .catch(() => undefined)
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [credenciais, mes]);

  // "Trabalhado hoje" anda sozinho enquanto o expediente está aberto.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const { dia, resumo } = useMemo(() => {
    if (!historico) return { dia: undefined, resumo: undefined };
    const inicio = [historico.admissao, historico.inicioControle].filter(Boolean).sort().pop() as string | undefined;
    const espelho = montarEspelho(diasDoMes(mes), historico.batidas, historico.justificativas, {
      jornada: historico.jornada,
      inicioContagem: inicio || hoje,
      fimContagem: historico.demissao,
      raioPadraoM: historico.raioPadraoM,
    });
    return { dia: espelho.find((d) => d.data === hoje), resumo: resumir(espelho.filter((d) => d.data < hoje)) };
  }, [historico, mes, hoje]);

  const jornada = historico?.jornada;
  const temIntervalo = !!(jornada?.saidaIntervalo && jornada?.voltaIntervalo);
  const slots: { rotulo: string; previsto?: string }[] = temIntervalo
    ? [
        { rotulo: 'Entrada', previsto: jornada?.entrada },
        { rotulo: 'Intervalo', previsto: jornada?.saidaIntervalo },
        { rotulo: 'Retorno', previsto: jornada?.voltaIntervalo },
        { rotulo: 'Saída', previsto: jornada?.saida },
      ]
    : [
        { rotulo: 'Entrada', previsto: jornada?.entrada },
        { rotulo: 'Saída', previsto: jornada?.saida },
      ];
  const batidas = dia?.batidas ?? [];
  const proxima = batidas.length < slots.length ? batidas.length : -1;
  const folga = !!jornada && dia && !dia.previsto;

  // Trabalhado hoje: pares fechados + o trecho aberto (entrou e ainda não saiu).
  let trabalhadoHoje = 0;
  for (let i = 0; i + 1 < batidas.length; i += 2) trabalhadoHoje += (Date.parse(batidas[i + 1].registradoEm) - Date.parse(batidas[i].registradoEm)) / 60000;
  if (batidas.length % 2 === 1) trabalhadoHoje += Math.max(0, (agora - Date.parse(batidas[batidas.length - 1].registradoEm)) / 60000);

  const [, m, d] = hoje.split('-').map(Number);
  const dataExtenso = `${NOMES_DIA[new Date(`${hoje}T12:00:00Z`).getUTCDay()]} · ${d} de ${MESES[m - 1]}`;
  const incompletos = resumo?.incompletos ?? 0;
  const faltas = resumo?.faltas ?? 0;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_8px_30px_rgba(22,19,15,0.08)] overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">Jornada de hoje</p>
          <p className="text-base font-black text-slate-900 leading-tight">{dataExtenso}</p>
        </div>
        {jornada && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border truncate max-w-[45%] ${folga ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {folga ? 'Folga hoje' : jornada.nome}
          </span>
        )}
      </div>

      {carregando ? (
        <p className="px-4 pb-5 text-xs text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando sua jornada...
        </p>
      ) : (
        <>
          <div className={`px-4 grid gap-2.5 ${slots.length === 4 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {slots.map((s, i) => {
              const feita = batidas[i];
              const ehProxima = i === proxima && !folga;
              if (ehProxima) {
                return (
                  <button
                    key={s.rotulo}
                    type="button"
                    onClick={onBater}
                    className="relative text-left normal-case tracking-normal rounded-2xl p-3 bg-[#16130F] text-white shadow-md active:scale-[0.98] transition-transform"
                  >
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-wide bg-[#C48229] text-white px-1.5 py-0.5 rounded-md">Próxima</span>
                    <span className="w-8 h-8 rounded-full bg-[#C48229] flex items-center justify-center">
                      <Fingerprint className="w-4.5 h-4.5" />
                    </span>
                    <p className="mt-2 text-sm font-black">{s.rotulo}</p>
                    <p className="text-[11px] text-[#E8C48E] font-semibold flex items-center gap-1">
                      Bater agora{s.previsto ? ` · ${s.previsto}` : ''}
                    </p>
                  </button>
                );
              }
              return (
                <div
                  key={s.rotulo}
                  className={`rounded-2xl p-3 border ${feita ? 'border-emerald-200 bg-emerald-50/50' : 'border-dashed border-slate-200 bg-slate-50/60'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${feita ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-300'}`}>
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </span>
                    <span className={`text-lg font-black tabular-nums ${feita ? 'text-slate-900' : 'text-slate-300'}`}>
                      {feita ? horaLocal(feita.registradoEm) : s.previsto || '--:--'}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm font-black ${feita ? 'text-slate-900' : 'text-slate-400'}`}>{s.rotulo}</p>
                  <p className={`text-[11px] font-semibold ${feita ? 'text-emerald-700' : 'text-slate-400'}`}>{feita ? 'Registrado' : 'Previsto'}</p>
                </div>
              );
            })}
          </div>
          {batidas.length > slots.length && (
            <p className="px-4 pt-2 text-[11px] text-slate-500">+ {batidas.length - slots.length} batida(s) a mais hoje — veja em Meu histórico.</p>
          )}
          {proxima === -1 && batidas.length > 0 && !folga && (
            <button type="button" onClick={onBater} className="mx-4 mt-2.5 w-[calc(100%-2rem)] py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 normal-case tracking-normal">
              <Fingerprint className="w-4 h-4 text-[#C48229]" /> Bater ponto
            </button>
          )}
          {folga && (
            <button type="button" onClick={onBater} className="mx-4 mt-2.5 w-[calc(100%-2rem)] py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 normal-case tracking-normal">
              <Fingerprint className="w-4 h-4 text-[#C48229]" /> Bater ponto mesmo assim
            </button>
          )}

          <div className="mt-3 mx-4 grid grid-cols-2 border-t border-slate-100">
            <div className="py-3 pr-3">
              <p className="text-[11px] font-semibold text-slate-500">Trabalhado hoje</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{formatarMinutos(trabalhadoHoje)}</p>
            </div>
            <button type="button" onClick={onHistorico} className="py-3 pl-3 border-l border-slate-100 text-left normal-case tracking-normal">
              <p className="text-[11px] font-semibold text-slate-500">Saldo de {MESES[m - 1]}</p>
              <p className={`text-xl font-black tabular-nums ${(resumo?.saldoMin ?? 0) < 0 ? 'text-rose-600' : (resumo?.saldoMin ?? 0) > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                {formatarMinutos(resumo?.saldoMin ?? 0, true)}
              </p>
            </button>
          </div>

          {(incompletos > 0 || faltas > 0) && (
            <button
              type="button"
              onClick={onHistorico}
              className="w-full px-4 py-3 bg-amber-50 border-t border-amber-200 flex items-center gap-2.5 text-left normal-case tracking-normal"
            >
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="flex-1 text-xs font-bold text-amber-900">
                {[incompletos > 0 && `${incompletos} dia(s) com batida faltando`, faltas > 0 && `${faltas} falta(s)`].filter(Boolean).join(' e ')} em {MESES[m - 1]}
              </span>
              <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />
            </button>
          )}
        </>
      )}
    </section>
  );
};
