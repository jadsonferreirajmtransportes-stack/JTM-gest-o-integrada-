import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import { HistoricoPonto, pontoHistorico } from '../../utils/frequenciaApi';
import { DiaEspelho, NOMES_DIA, SituacaoDia, diaDaSemana, diasDoMes, formatarMinutos, hojeLocal, horaLocal, montarEspelho, resumir } from './frequenciaCalc';
import { nomeMes } from './espelhoPdf';
import type { CredenciaisPortal } from '../../utils/educacaoApi';

// ============================================================================
// "Meu histórico" no link pessoal: batidas do mês dia a dia + resumo de horas,
// com o MESMO cálculo do espelho do DP (montarEspelho/resumir). Controle interno.
// ============================================================================

const ESTILO: Record<SituacaoDia, string> = {
  OK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Atraso: 'bg-amber-50 text-[#92611F] border-amber-200',
  Falta: 'bg-rose-50 text-rose-700 border-rose-200',
  Incompleto: 'bg-orange-50 text-orange-700 border-orange-200',
  Justificado: 'bg-sky-50 text-sky-700 border-sky-200',
  Folga: 'bg-slate-50 text-slate-400 border-slate-200',
  Extra: 'bg-violet-50 text-violet-700 border-violet-200',
  Futuro: 'bg-white text-slate-300 border-slate-100',
  'Em andamento': 'bg-slate-100 text-slate-600 border-slate-200',
  'Fora do período': 'bg-white text-slate-300 border-slate-100',
};

function somarMes(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function rotuloDia(d: DiaEspelho): string {
  if (d.justificativa) return d.justificativa.tipo;
  if (d.situacao === 'Atraso') return `Atraso ${d.atrasoMin} min`;
  return d.situacao;
}

export const MeuHistoricoPonto: React.FC<{ credenciais: CredenciaisPortal }> = ({ credenciais }) => {
  const mesHoje = hojeLocal().slice(0, 7);
  const [mes, setMes] = useState(mesHoje);
  const [historico, setHistorico] = useState<HistoricoPonto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    pontoHistorico(credenciais, mes)
      .then((r) => {
        if (cancelado) return;
        if (r.erro) setErro('Não foi possível abrir o histórico. Saia e entre de novo no link.');
        else setHistorico(r.historico ?? null);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelado) setErro('Sem conexão com o sistema. Verifique sua internet.');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [credenciais, mes]);

  const espelho = useMemo(() => {
    if (!historico) return [];
    const inicio = [historico.admissao, historico.inicioControle].filter(Boolean).sort().pop() as string | undefined;
    return montarEspelho(diasDoMes(mes), historico.batidas, historico.justificativas, {
      jornada: historico.jornada,
      inicioContagem: inicio || hojeLocal(),
      fimContagem: historico.demissao,
      raioPadraoM: historico.raioPadraoM,
    });
  }, [historico, mes]);
  const resumo = useMemo(() => resumir(espelho), [espelho]);

  // Dias que interessam: com batida, justificativa ou previstos já passados (falta etc.).
  const dias = espelho.filter((d) => d.batidas.length > 0 || d.justificativa || (d.previsto && d.situacao !== 'Futuro' && d.situacao !== 'Fora do período'));

  const card = (rotulo: string, valor: string, cor = 'text-slate-900') => (
    <div className="bg-slate-50 rounded-xl px-3 py-2">
      <p className="text-[10px] font-semibold text-slate-500">{rotulo}</p>
      <p className={`text-sm font-black tabular-nums ${cor}`}>{valor}</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" /> Meu histórico
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMes(somarMes(mes, -1))} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" title="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 w-28 text-center">{nomeMes(mes)}</span>
          <button
            type="button"
            onClick={() => setMes(somarMes(mes, 1))}
            disabled={mes >= mesHoje}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="text-xs text-slate-400 flex items-center gap-2 py-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </p>
      ) : erro ? (
        <p className="text-xs text-rose-700 font-semibold">{erro}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {card('Horas normais', formatarMinutos(resumo.normaisDiurnasMin))}
            {card('Horas noturnas', formatarMinutos(resumo.normaisNoturnasMin), 'text-indigo-700')}
            {card('Extra diurna', formatarMinutos(resumo.extraDiurnaMin), 'text-emerald-700')}
            {card('Extra noturna', formatarMinutos(resumo.extraNoturnaMin), 'text-emerald-700')}
            {card('Falta / atraso', formatarMinutos(resumo.faltaAtrasoMin), resumo.faltaAtrasoMin ? 'text-rose-600' : 'text-slate-900')}
            {card('Abono', formatarMinutos(resumo.abonoMin), 'text-sky-700')}
          </div>
          <p className="text-[11px] text-slate-500">
            {resumo.diasTrabalhados} dia(s) com batida · {resumo.faltas} falta(s) · {resumo.atrasos} atraso(s) · {resumo.incompletos} incompleto(s)
          </p>

          {dias.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Nenhum registro neste mês.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dias.map((d) => (
                <li key={d.data} className="py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      {d.data.slice(8, 10)}/{d.data.slice(5, 7)} <span className="font-normal text-slate-400">{NOMES_DIA[diaDaSemana(d.data)]}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTILO[d.situacao]}`}>{rotuloDia(d)}</span>
                  </div>
                  {d.batidas.length > 0 && (
                    <p className="mt-1 text-slate-700 tabular-nums flex flex-wrap gap-x-3">
                      {d.batidas.map((b) => (
                        <span key={b.id} title={b.origem === 'ajuste' ? 'Incluída pelo DP' : b.localNome || ''}>
                          {horaLocal(b.registradoEm)}
                          {b.origem === 'ajuste' && <span className="text-[#92611F]">*</span>}
                        </span>
                      ))}
                    </p>
                  )}
                  {(d.apuracao.extraDiurnaMin + d.apuracao.extraNoturnaMin > 0 || d.apuracao.faltaAtrasoMin > 0) && (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {d.apuracao.extraDiurnaMin + d.apuracao.extraNoturnaMin > 0 && (
                        <span className="text-emerald-700">Extra {formatarMinutos(d.apuracao.extraDiurnaMin + d.apuracao.extraNoturnaMin)} </span>
                      )}
                      {d.apuracao.faltaAtrasoMin > 0 && <span className="text-rose-600">Falta/atraso {formatarMinutos(d.apuracao.faltaAtrasoMin)}</span>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-slate-400">
            * batida incluída pelo Departamento Pessoal. Horas noturnas com a hora reduzida da CLT. Controle interno — se algo estiver errado, fale com o DP pelo
            próprio link.
          </p>
        </>
      )}
    </div>
  );
};
