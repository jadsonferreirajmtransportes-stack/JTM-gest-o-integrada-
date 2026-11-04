import React, { useEffect, useState } from 'react';
import { AlertTriangle, Award, CalendarDays, CheckCircle2, Clock, FileCheck2, Loader2, Package, Truck } from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { PainelMotorista, getPainelMotorista, pct } from '../../utils/baixasApi';

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const f1 = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const nomeMes = (ym: string) => {
  const [a, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} de ${a}`;
};
const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());

/** Link do motorista (?form=motorista&t=...): o próprio desempenho nas baixas, sem login. */
export const MotoristaBaixasView: React.FC<{ token?: string }> = ({ token }) => {
  const [mes, setMes] = useState('');
  const [painel, setPainel] = useState<PainelMotorista | null>(null);
  const [carregando, setCarregando] = useState(!!token);
  const [erro, setErro] = useState<string | null>(token ? null : 'Este link não é válido.');

  useEffect(() => {
    if (!token) return;
    setCarregando(true);
    getPainelMotorista(token, mes || undefined)
      .then((p) => {
        if (p.erro) setErro('Este link não é válido ou foi trocado. Peça o link novo ao escritório.');
        else {
          setPainel(p);
          setErro(null);
        }
      })
      .catch((e) => {
        console.error(e);
        setErro('Não foi possível abrir agora. Verifique sua internet e tente de novo.');
      })
      .finally(() => setCarregando(false));
  }, [token, mes]);

  const meta = painel?.metaEntrega ?? 95;
  const total = painel?.total || 0;
  const taxa = pct(painel?.entregues || 0, total);
  const ultimoDia = painel?.dias?.[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <JmtLogo variant="compact" theme="light" iconSize={28} />
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Truck className="w-4 h-4 text-[#C48229]" /> Meu desempenho
        </span>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-4">
        {carregando && !painel ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
          </div>
        ) : erro || !painel ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center text-sm text-rose-700 flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6" /> {erro}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#C48229]">Motorista</p>
                <p className="text-lg font-black text-slate-900">{nomeBonito(painel.motorista)}</p>
              </div>
              <select
                value={painel.mes}
                onChange={(e) => setMes(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
              >
                {(painel.meses.length ? painel.meses : [painel.mes]).map((m) => (
                  <option key={m} value={m}>
                    {nomeMes(m)}
                  </option>
                ))}
              </select>
            </div>

            {total === 0 ? (
              <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Ainda não há baixas suas neste mês.</p>
            ) : (
              <>
                {painel.posicao ? (
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-[#C48229] to-[#92611F] text-white flex items-center gap-3">
                    <Award className="w-9 h-9 shrink-0" />
                    <div>
                      <p className="text-2xl font-black leading-none">{painel.posicao}º lugar</p>
                      <p className="text-xs opacity-90 mt-1">
                        entre {painel.noRanking} motoristas no ranking de {nomeMes(painel.mes).toLowerCase()}
                        {painel.pontos != null ? ` · ${painel.pontos.toLocaleString('pt-BR')} pontos` : ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl p-3 bg-[#FBF6EE] border border-amber-200 text-xs text-[#7A4F17]">
                    Você entra no ranking a partir de {painel.minimoNotas} notas no mês.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Cartao icone={CheckCircle2} titulo="Entregues" valor={f1(taxa)} detalhe={`${painel.entregues} de ${total} notas · meta ${meta}%`} alerta={taxa < meta} />
                  <Cartao icone={Clock} titulo="No prazo" valor={f1(pct(painel.noPrazo || 0, total))} detalhe={`${painel.noPrazo} notas`} />
                  <Cartao icone={FileCheck2} titulo="Comprovadas" valor={f1(pct(painel.comprovadas || 0, total))} detalhe={`${painel.comprovadas} notas`} />
                  <Cartao icone={Package} titulo="Notas no mês" valor={total.toLocaleString('pt-BR')} detalhe={painel.abonadas ? `${painel.abonadas} abonada(s) fora da conta` : 'todas as suas notas'} />
                </div>

                {ultimoDia && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Último dia — {dataBr(ultimoDia.data)}</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {ultimoDia.entregues} de {ultimoDia.total} entregues ({f1(pct(ultimoDia.entregues, ultimoDia.total))}) · {ultimoDia.noPrazo} no prazo
                    </p>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Pendências ({painel.pendencias?.length || 0})
                  </h2>
                  {!painel.pendencias?.length ? (
                    <p className="text-xs text-emerald-700 font-semibold">Nenhuma pendência. Parabéns!</p>
                  ) : (
                    <>
                      <p className="text-[11px] text-slate-500">Notas ainda sem entrega. Resolva e avise o escritório.</p>
                      {painel.pendencias.map((n) => (
                        <div key={`${n.numero}-${n.dia}`} className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/50 text-xs">
                          <p className="font-black text-slate-900">
                            NF {n.numero}
                            {n.prazo === 'FORA PRAZO' && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 text-[9px] font-bold">Prazo vencido</span>}
                          </p>
                          {n.empresa && <p className="text-slate-600">{nomeBonito(n.empresa)}</p>}
                          <p className="text-slate-500">
                            {[n.destinatario && nomeBonito(n.destinatario), n.cidade].filter(Boolean).join(' — ')}
                          </p>
                          <p className="text-[10px] text-slate-400">Na planilha de {dataBr(n.dia)}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-[#C48229]" /> Dia a dia
                  </h2>
                  {(painel.dias || []).map((d) => {
                    const t = pct(d.entregues, d.total);
                    return (
                      <div key={d.data} className="text-xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-700">{dataBr(d.data)}</span>
                          <span className={t < meta ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                            {d.entregues}/{d.total} · {f1(t)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                          <div className={`h-full ${t < meta ? 'bg-rose-400' : 'bg-[#C48229]'}`} style={{ width: `${t}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <p className="text-center text-[10px] text-slate-400">Os números vêm das planilhas de baixa importadas pelo escritório. Dúvidas, fale com o escritório.</p>
          </>
        )}
      </main>
    </div>
  );
};

const Cartao: React.FC<{ icone: React.ElementType; titulo: string; valor: string; detalhe: string; alerta?: boolean }> = ({ icone: Icone, titulo, valor, detalhe, alerta }) => (
  <div className={`bg-white rounded-2xl border p-3 ${alerta ? 'border-rose-200' : 'border-slate-200'}`}>
    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 flex items-center gap-1">
      <Icone className="w-3.5 h-3.5 text-[#C48229]" /> {titulo}
    </p>
    <p className={`text-xl font-black mt-1 ${alerta ? 'text-rose-700' : 'text-slate-900'}`}>{valor}</p>
    <p className="text-[10px] text-slate-500">{detalhe}</p>
  </div>
);
