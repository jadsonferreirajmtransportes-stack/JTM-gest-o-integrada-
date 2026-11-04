import React, { useEffect, useMemo, useState } from 'react';
import { Award, CalendarDays, ChevronDown, ChevronRight, Clock, FileSpreadsheet, FileText, Loader2, Package, Search, Trash2, TriangleAlert, Upload, UserRound, X, CheckCircle2 } from 'lucide-react';
import type { UsuarioLogin } from '../../types';
import { AcoesTela } from '../Common/AcoesTela';
import {
  BaixaNota,
  BaixaUpload,
  DesempenhoResponsavel,
  PESOS_PONTOS,
  ResumoMes,
  buscarNotaBaixas,
  contar,
  desempenhoResponsavel,
  diasDeOperacao,
  excluirUploadBaixas,
  getNotasDoUpload,
  getResumoMes,
  getUploadsBaixas,
  lerPlanilhaBaixas,
  notaEntregue,
  notaNoPrazo,
  notaPendente,
  pct,
  registrarEntregaTardia,
  salvarUploadBaixas,
} from '../../utils/baixasApi';

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const dataHoraBr = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const f1 = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: n % 1 ? 1 : 0 })}%`;
const nomeMes = (ym: string) => {
  const [a, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} de ${a}`;
};
const mesAtual = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);
const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());

const Kpi: React.FC<{ titulo: string; valor: string; detalhe: string; cor: 'verde' | 'vermelho' | 'azul' | 'cinza'; icone: React.ElementType }> = ({ titulo, valor, detalhe, cor, icone: Icone }) => {
  const cls = { verde: 'border-t-emerald-600 text-emerald-700', vermelho: 'border-t-rose-600 text-rose-700', azul: 'border-t-blue-600 text-blue-700', cinza: 'border-t-slate-500 text-slate-700' }[cor];
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 border-t-4 p-4 ${cls.split(' ')[0]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{titulo}</p>
        <Icone className={`w-4 h-4 ${cls.split(' ')[1]}`} />
      </div>
      <p className="text-3xl font-black text-slate-900 mt-1">{valor}</p>
      <p className="text-[11px] text-slate-500">{detalhe}</p>
    </div>
  );
};

/** Barras horizontais: entregues (verde) e não entregues (vermelho) por motorista. */
const BarrasMotoristas: React.FC<{ linhas: { nome: string; entregues: number; total: number }[] }> = ({ linhas }) => {
  const max = Math.max(1, ...linhas.map((l) => l.total));
  return (
    <div className="space-y-2">
      {linhas.map((l) => (
        <div key={l.nome} className="flex items-center gap-2 text-[11px]">
          <span className="w-36 shrink-0 text-right text-slate-600 truncate" title={l.nome}>
            {nomeBonito(l.nome)}
          </span>
          <div className="flex-1 h-5 bg-slate-50 rounded flex overflow-hidden">
            <div className="bg-emerald-600 h-full" style={{ width: `${(l.entregues / max) * 100}%` }} />
            <div className="bg-rose-600 h-full" style={{ width: `${((l.total - l.entregues) / max) * 100}%` }} />
          </div>
          <span className="w-14 shrink-0 font-bold text-slate-700">
            {l.entregues}/{l.total}
          </span>
        </div>
      ))}
      <p className="text-[10px] text-slate-500 flex gap-3 justify-center pt-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Entregues
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Não entregues
        </span>
      </p>
    </div>
  );
};

const BarrasPercentual: React.FC<{ linhas: { nome: string; valor: number }[] }> = ({ linhas }) => (
  <div className="space-y-2">
    {linhas.map((l) => (
      <div key={l.nome} className="flex items-center gap-2 text-[11px]">
        <span className="w-36 shrink-0 text-right text-slate-600 truncate" title={l.nome}>
          {nomeBonito(l.nome)}
        </span>
        <div className="flex-1 h-5 bg-slate-50 rounded overflow-hidden">
          <div className="bg-blue-600 h-full rounded" style={{ width: `${Math.min(100, l.valor)}%` }} />
        </div>
        <span className="w-12 shrink-0 font-bold text-slate-700">{f1(l.valor)}</span>
      </div>
    ))}
  </div>
);

const Rosca: React.FC<{ ok: number; total: number }> = ({ ok, total }) => {
  const p = total ? ok / total : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center justify-center gap-6">
      <svg viewBox="0 0 140 140" className="w-40 h-40 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#dc2626" strokeWidth="22" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#047857" strokeWidth="22" strokeDasharray={`${c * p} ${c}`} />
      </svg>
      <div className="text-xs space-y-1">
        <p className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-700" /> Entregue <b>{f1(p * 100)}</b>
        </p>
        <p className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-600" /> Falha <b>{f1(100 - p * 100)}</b>
        </p>
      </div>
    </div>
  );
};

const Medalha: React.FC<{ pos: number }> = ({ pos }) => (
  <span
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
      pos === 1 ? 'bg-amber-400 text-white' : pos === 2 ? 'bg-slate-300 text-white' : pos === 3 ? 'bg-[#C48229] text-white' : 'bg-slate-100 text-slate-500'
    }`}
  >
    {pos}º
  </span>
);

/** Farma Rodoviário → Performance das baixas: importação diária do "Relatório de documentos"
 *  (baixas dos motoristas), auditoria de cada dia e o dossiê do mês (responsáveis e motoristas). */
export const BaixasPerformanceView: React.FC<{ currentUser?: UsuarioLogin | null }> = ({ currentUser }) => {
  const [uploads, setUploads] = useState<BaixaUpload[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<'painel' | 'importacoes'>('painel');
  const [importando, setImportando] = useState(false);
  const [aberto, setAberto] = useState<BaixaUpload | null>(null);

  const recarregar = () =>
    getUploadsBaixas()
      .then(setUploads)
      .catch((e) => {
        console.error(e);
        setErro('Não foi possível carregar as baixas. Rode a migração 099 no Supabase, se ainda não rodou.');
        setUploads([]);
      });
  useEffect(() => {
    recarregar();
  }, []);

  const bases = useMemo(() => Array.from(new Set(['Matriz', ...(uploads || []).map((u) => u.base)])).sort(), [uploads]);
  const responsaveis = useMemo(() => Array.from(new Set((uploads || []).map((u) => u.responsavel))).sort(), [uploads]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(
            [
              ['painel', 'Painel do mês'],
              ['importacoes', 'Importações do dia'],
            ] as const
          ).map(([id, rot]) => (
            <button key={id} type="button" onClick={() => setAba(id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold normal-case tracking-normal ${aba === id ? 'bg-[#C48229] text-white' : 'text-slate-600'}`}>
              {rot}
            </button>
          ))}
        </div>
        <AcoesTela
          principal={
            <button type="button" onClick={() => setImportando(true)} className="px-4 py-2 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-xs font-bold flex items-center gap-1.5">
              <Upload className="w-4 h-4" /> Importar baixas do dia
            </button>
          }
        />
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {uploads === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : aba === 'painel' ? (
        <PainelMes bases={bases} temImportacoes={uploads.length > 0} mesInicial={uploads[0]?.dataReferencia.slice(0, 7) || mesAtual()} />
      ) : (
        <Importacoes
          uploads={uploads}
          aberto={aberto}
          onAbrir={setAberto}
          onExcluido={(id) => {
            setUploads((p) => (p || []).filter((x) => x.id !== id));
            if (aberto?.id === id) setAberto(null);
          }}
          onAtualizado={(u) => setUploads((p) => (p || []).map((x) => (x.id === u.id ? u : x)))}
          usuario={currentUser?.nome}
        />
      )}

      {importando && (
        <ImportarBaixasModal
          responsaveis={responsaveis}
          bases={bases}
          usuario={currentUser?.nome}
          onClose={() => setImportando(false)}
          onSalvo={(u) => {
            setImportando(false);
            recarregar();
            setAba('importacoes');
            setAberto(u);
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Painel do mês (dossiê)
// ---------------------------------------------------------------------------
const PainelMes: React.FC<{ bases: string[]; temImportacoes: boolean; mesInicial: string }> = ({ bases, temImportacoes, mesInicial }) => {
  const [mes, setMes] = useState(mesInicial);
  const [base, setBase] = useState('');
  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    getResumoMes(mes, base || undefined)
      .then(setResumo)
      .catch((e) => {
        console.error(e);
        setErro('Não foi possível montar o painel. Rode a migração 099 no Supabase, se ainda não rodou.');
        setResumo(null);
      })
      .finally(() => setCarregando(false));
  }, [mes, base]);

  const ranking: DesempenhoResponsavel[] = useMemo(() => {
    if (!resumo) return [];
    const dias = diasDeOperacao(resumo.responsaveis);
    return resumo.responsaveis.map((r) => desempenhoResponsavel(r, dias)).sort((a, b) => b.pontos - a.pontos);
  }, [resumo]);
  const motoristas = useMemo(
    () => (resumo?.motoristas || []).map((m) => ({ ...m, taxa: pct(m.entregues, m.total) })).sort((a, b) => b.taxa - a.taxa || b.total - a.total),
    [resumo]
  );
  const top5 = useMemo(() => [...(resumo?.motoristas || [])].sort((a, b) => b.total - a.total).slice(0, 5), [resumo]);

  const baixarPdf = async () => {
    if (!resumo) return;
    const { gerarDossieBaixasPdf } = await import('./dossieBaixasPdf');
    const arq = gerarDossieBaixasPdf({ mes, base, resumo, ranking, motoristas });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(arq);
    a.download = arq.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white" />
        <select value={base} onChange={(e) => setBase(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="">Todas as bases</option>
          {bases.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <button type="button" onClick={baixarPdf} disabled={!resumo?.total} className="ml-auto px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
          <FileText className="w-4 h-4 text-[#C48229]" /> Dossiê do mês (PDF)
        </button>
      </div>
      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {carregando || !resumo ? (
        !erro && (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Montando o painel...
          </div>
        )
      ) : resumo.total === 0 ? (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
          Nenhuma baixa importada em {nomeMes(mes).toLowerCase()}
          {base ? ` na base ${base}` : ''}. {temImportacoes ? '' : 'Comece em "Importar baixas do dia".'}
        </p>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-[#C48229]" />
              <div>
                <h3 className="text-sm font-black text-slate-900 normal-case">Pódio de excelência — {nomeMes(mes)}</h3>
                <p className="text-[11px] text-slate-500">Os 3 melhores responsáveis pelas baixas{base ? ` da base ${base}` : ''}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {ranking.slice(0, 3).map((r, i) => (
                <div key={r.responsavel} className={`flex items-center gap-3 p-3 rounded-xl border ${i === 0 ? 'border-amber-300 bg-amber-50/50' : i === 2 ? 'border-[#E8C48E] bg-orange-50/30' : 'border-slate-200 bg-slate-50'}`}>
                  <Medalha pos={i + 1} />
                  <div>
                    <p className="text-sm font-black text-slate-900">{r.responsavel.toUpperCase()}</p>
                    <p className="text-[10px] font-bold text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 mr-1">{r.base.toUpperCase()}</span> {r.pontos.toFixed(1)} pontos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi titulo="Sucesso geral" valor={f1(pct(resumo.entregues, resumo.total))} detalhe="notas entregues" cor="verde" icone={CheckCircle2} />
            <Kpi titulo="Falhas gerais" valor={f1(100 - pct(resumo.entregues, resumo.total))} detalhe={`${resumo.total - resumo.entregues} notas não entregues`} cor="vermelho" icone={TriangleAlert} />
            <Kpi titulo="Dentro do prazo" valor={f1(pct(resumo.noPrazo, resumo.total))} detalhe="entregas no prazo" cor="azul" icone={Clock} />
            <Kpi titulo="Total de notas" valor={resumo.total.toLocaleString('pt-BR')} detalhe={`${pct(resumo.comprovadas, resumo.total).toFixed(1)}% comprovadas`} cor="cinza" icone={Package} />
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide text-center mb-3">Taxa de efetividade da operação</h3>
              <Rosca ok={resumo.entregues} total={resumo.total} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide text-center mb-3">Top 5 motoristas (volume)</h3>
              <BarrasMotoristas linhas={top5.map((m) => ({ nome: m.motorista, entregues: m.entregues, total: m.total }))} />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <h3 className="text-sm font-black text-slate-900 normal-case">🏆 Ranking dos responsáveis</h3>
              <p className="text-[10px] text-slate-500">
                Pontos = {PESOS_PONTOS.regularidade * 100}% regularidade (dias importados até o dia útil seguinte) + {PESOS_PONTOS.comprovacao * 100}% comprovação + {PESOS_PONTOS.entrega * 100}% entrega.
              </p>
              {ranking.map((r, i) => (
                <div key={r.responsavel} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <Medalha pos={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">{r.responsavel.toUpperCase()}</p>
                    <p className="text-[11px] text-slate-600">
                      {r.entregues.toLocaleString('pt-BR')} / {r.total.toLocaleString('pt-BR')} OK
                    </p>
                    <p className="text-[10px] font-semibold text-rose-700">
                      Regularidade {f1(r.regularidade)} • comprovação {f1(r.comprovacao)} • {r.diasNoPrazo}/{r.diasEsperados} dias no prazo
                    </p>
                    {r.diasFaltantes.length > 0 && <p className="text-[10px] text-slate-500">Dias faltantes: {r.diasFaltantes.map(dataBr).join(', ')}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-emerald-700">{r.pontos.toFixed(1)} pts</p>
                    <p className="text-[10px] text-slate-500">Entrega {f1(r.entrega)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <h3 className="text-sm font-black text-slate-900 normal-case">🚚 Ranking dos motoristas</h3>
              <p className="text-[10px] text-slate-500">Ordem pela taxa de entrega (entregues ÷ notas do motorista).</p>
              {motoristas.map((m, i) => (
                <div key={m.motorista} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Medalha pos={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{nomeBonito(m.motorista)}</p>
                    <p className="text-[10px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 mr-1 font-bold">{m.base.toUpperCase()}</span>
                      {m.entregues} / {m.total} OK · {f1(pct(m.noPrazo, m.total))} no prazo
                    </p>
                  </div>
                  <p className={`text-base font-black ${m.taxa >= 97 ? 'text-emerald-700' : m.taxa >= 93 ? 'text-[#92611F]' : 'text-rose-700'}`}>{f1(m.taxa)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Importações do dia (histórico + auditoria)
// ---------------------------------------------------------------------------
const Importacoes: React.FC<{
  uploads: BaixaUpload[];
  aberto: BaixaUpload | null;
  onAbrir: (u: BaixaUpload | null) => void;
  onExcluido: (id: string) => void;
  onAtualizado: (u: BaixaUpload) => void;
  usuario?: string;
}> = ({ uploads, aberto, onAbrir, onExcluido, onAtualizado, usuario }) => {
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState<BaixaNota[] | null>(null);
  const [fechados, setFechados] = useState<Set<string>>(new Set());

  const arvore = useMemo(() => {
    const m = new Map<string, Map<string, BaixaUpload[]>>();
    uploads.forEach((u) => {
      const r = u.responsavel.toUpperCase();
      if (!m.has(r)) m.set(r, new Map());
      const meses = m.get(r)!;
      const mes = u.dataReferencia.slice(0, 7);
      meses.set(mes, [...(meses.get(mes) || []), u]);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [uploads]);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busca.trim().length < 3) return setResultado(null);
    setResultado(await buscarNotaBaixas(busca).catch(() => []));
  };
  const alternar = (k: string) =>
    setFechados((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const excluir = async (u: BaixaUpload) => {
    if (!window.confirm(`Excluir a importação de ${u.responsavel} do dia ${dataBr(u.dataReferencia)} (${u.total} notas)?`)) return;
    try {
      await excluirUploadBaixas(u.id);
      onExcluido(u.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
      <aside className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3 lg:sticky lg:top-4">
        <form onSubmit={buscar} className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nota fiscal" className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-full" />
        </form>
        {resultado && (
          <div className="space-y-1 text-[11px]">
            <p className="font-bold text-slate-600 flex justify-between">
              {resultado.length} resultado(s)
              <button type="button" onClick={() => setResultado(null)} className="text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </p>
            {resultado.map((n) => {
              const u = uploads.find((x) => x.id === n.uploadId);
              return (
                <button key={n.id} type="button" onClick={() => u && onAbrir(u)} className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-amber-50 normal-case tracking-normal">
                  <b>NF {n.numero}</b> · {nomeBonito(n.motorista)}
                  <br />
                  <span className="text-slate-500">
                    {u ? `${u.responsavel} · ${dataBr(u.dataReferencia)}` : ''} · {notaEntregue(n) ? 'entregue' : 'pendente'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Relatórios por responsável</p>
        {arvore.length === 0 && <p className="text-[11px] text-slate-400">Nenhuma importação ainda.</p>}
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {arvore.map(([resp, meses]) => (
            <div key={resp}>
              <button type="button" onClick={() => alternar(resp)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-50 text-xs font-black text-slate-800 normal-case tracking-normal">
                {fechados.has(resp) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <UserRound className="w-3.5 h-3.5 text-blue-700" /> {resp}
              </button>
              {!fechados.has(resp) &&
                [...meses.entries()]
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([mes, lista]) => (
                    <div key={mes} className="ml-3 mt-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 px-1">
                        <CalendarDays className="w-3 h-3" /> {nomeMes(mes)}
                      </p>
                      {lista
                        .sort((a, b) => b.dataReferencia.localeCompare(a.dataReferencia))
                        .map((u) => (
                          <div key={u.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${aberto?.id === u.id ? 'bg-amber-100 font-bold' : 'hover:bg-slate-50'}`}>
                            <button type="button" onClick={() => onAbrir(u)} className="flex-1 text-left normal-case tracking-normal">
                              {dataBr(u.dataReferencia)}
                              {u.base !== 'Matriz' && <span className="text-[10px] text-slate-500"> · {u.base}</span>}
                            </button>
                            <span className={`text-[10px] font-bold ${pct(u.entregues, u.total) >= 97 ? 'text-emerald-700' : 'text-rose-700'}`}>{f1(pct(u.entregues, u.total))}</span>
                            <button type="button" onClick={() => excluir(u)} className="p-0.5 text-slate-300 hover:text-rose-600" title="Excluir importação">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  ))}
            </div>
          ))}
        </div>
      </aside>
      {aberto ? (
        <DetalheUpload key={aberto.id} upload={aberto} usuario={usuario} onAtualizado={onAtualizado} />
      ) : (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">Escolha um dia na lista ao lado para ver a auditoria das notas.</p>
      )}
    </div>
  );
};

const POR_PAGINA = 50;

const DetalheUpload: React.FC<{ upload: BaixaUpload; usuario?: string; onAtualizado: (u: BaixaUpload) => void }> = ({ upload, usuario, onAtualizado }) => {
  const [notas, setNotas] = useState<BaixaNota[] | null>(null);
  const [motorista, setMotorista] = useState('');
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    getNotasDoUpload(upload.id)
      .then(setNotas)
      .catch(() => setNotas([]));
  }, [upload.id]);

  const porMotorista = useMemo(() => {
    const m = new Map<string, BaixaNota[]>();
    (notas || []).forEach((n) => {
      const k = n.motorista || 'Sem motorista';
      m.set(k, [...(m.get(k) || []), n]);
    });
    return [...m.entries()].map(([nome, l]) => ({ nome, ...contar(l) })).sort((a, b) => b.total - a.total);
  }, [notas]);
  const cont = useMemo(() => contar(notas || []), [notas]);
  const lista = useMemo(
    () =>
      (notas || [])
        .filter((n) => !motorista || (n.motorista || 'Sem motorista') === motorista)
        .sort((a, b) => Number(notaPendente(b)) - Number(notaPendente(a)) || a.numero.localeCompare(b.numero)),
    [notas, motorista]
  );
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));

  const tardia = async (n: BaixaNota) => {
    const padrao = new Date().toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T');
    const v = window.prompt(`Registrar a entrega tardia da NF ${n.numero}.\nData e hora da entrega (AAAA-MM-DD HH:MM):`, padrao.replace('T', ' '));
    if (!v) return;
    const iso = new Date(`${v.trim().replace(' ', 'T')}:00-03:00`);
    if (isNaN(iso.getTime())) return alert('Data inválida. Use o formato AAAA-MM-DD HH:MM.');
    try {
      const nova = await registrarEntregaTardia(n, iso.toISOString(), usuario, notas || []);
      const novas = (notas || []).map((x) => (x.id === n.id ? nova : x));
      setNotas(novas);
      const c = contar(novas);
      onAtualizado({ ...upload, entregues: c.entregues, noPrazo: c.noPrazo });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível registrar.');
    }
  };

  const baixarPendencias = async () => {
    const pend = (notas || []).filter(notaPendente);
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Pendências');
    ws.addRow(['Nota', 'Status', 'Situação', 'Remetente', 'Destinatário', 'Cidade', 'Motorista', 'Romaneio', 'Emissão', 'Prazo']);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92611F' } };
    pend.forEach((n) => ws.addRow([n.numero, n.status || '', n.situacao || '', n.remetente || '', n.destinatario || '', n.cidade || '', n.motorista || '', n.romaneio || '', dataHoraBr(n.dataEmissao), n.prazo || '']));
    ws.columns.forEach((c, i) => (c.width = [10, 12, 16, 32, 36, 16, 28, 14, 18, 12][i] || 14));
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `Pendencias_${upload.responsavel}_${upload.dataReferencia}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex gap-6 text-xs">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Responsável pela planilha</p>
            <p className="font-black text-slate-900 flex items-center gap-1">
              <UserRound className="w-3.5 h-3.5 text-blue-700" /> {upload.responsavel.toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Data referência</p>
            <p className="font-black text-slate-900 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-blue-700" /> {dataBr(upload.dataReferencia)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Base</p>
            <p className="font-black text-slate-900">{upload.base}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400">Importado em {dataHoraBr(upload.criadoEm)}{upload.criadoPor ? ` por ${upload.criadoPor}` : ''}</p>
      </div>
      {notas === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando as notas...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Kpi titulo="Taxa de sucesso" valor={f1(pct(cont.entregues, cont.total))} detalhe="pedidos entregues" cor="verde" icone={CheckCircle2} />
            <Kpi titulo="Não entregues" valor={f1(100 - pct(cont.entregues, cont.total))} detalhe={`${cont.total - cont.entregues} com ocorrência`} cor="vermelho" icone={TriangleAlert} />
            <Kpi titulo="Dentro do prazo" valor={f1(pct(cont.noPrazo, cont.total))} detalhe="entregas no prazo" cor="azul" icone={Clock} />
            <Kpi titulo="Total processado" valor={String(cont.total)} detalhe={`${cont.comprovadas} comprovadas`} cor="cinza" icone={Package} />
          </div>

          <div className="grid xl:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xs font-black text-slate-800 mb-3 normal-case">Entregues e não entregues</h3>
              <BarrasMotoristas linhas={porMotorista.map((m) => ({ nome: m.nome, entregues: m.entregues, total: m.total }))} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xs font-black text-slate-800 mb-3 normal-case">Eficiência dentro do prazo</h3>
              <BarrasPercentual linhas={porMotorista.map((m) => ({ nome: m.nome, valor: pct(m.noPrazo, m.total) }))} />
            </div>
          </div>

          <div className="envelope-cartoes bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <div className="p-4 pb-2">
              <h3 className="text-sm font-black text-slate-900 normal-case">Resumo consolidado</h3>
              <p className="text-[11px] text-slate-500">Resultado por motorista nesta importação.</p>
            </div>
            <table className="tabela-cartoes w-full text-xs min-w-[640px]">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3">Motorista</th>
                  <th className="p-3 text-center">Total</th>
                  <th className="p-3 text-center">Entregues</th>
                  <th className="p-3 text-center">Não entregues</th>
                  <th className="p-3 text-center">Entrega</th>
                  <th className="p-3 text-center">No prazo</th>
                </tr>
              </thead>
              <tbody>
                {porMotorista.map((m) => (
                  <tr key={m.nome} className="border-t border-slate-100">
                    <td className="p-3 font-bold text-slate-900 cartao-titulo">{nomeBonito(m.nome)}</td>
                    <td className="p-3 text-center" data-label="Total">
                      {m.total}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700" data-label="Entregues">
                      {m.entregues}
                    </td>
                    <td className="p-3 text-center font-bold text-rose-700" data-label="Não entregues">
                      {m.total - m.entregues}
                    </td>
                    <td className="p-3 text-center font-bold" data-label="Entrega">
                      {f1(pct(m.entregues, m.total))}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-700" data-label="No prazo">
                      {f1(pct(m.noPrazo, m.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 normal-case">Auditoria detalhada das notas</h3>
                <label className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                  Motorista
                  <select
                    value={motorista}
                    onChange={(e) => {
                      setMotorista(e.target.value);
                      setPagina(0);
                    }}
                    className="px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                  >
                    <option value="">Todos</option>
                    {porMotorista.map((m) => (
                      <option key={m.nome} value={m.nome}>
                        {nomeBonito(m.nome)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="button" onClick={baixarPendencias} disabled={!(notas || []).some(notaPendente)} className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                <FileSpreadsheet className="w-4 h-4" /> Baixar pendências (Excel)
              </button>
            </div>
            <div className="envelope-cartoes bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="tabela-cartoes w-full text-xs min-w-[900px]">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="p-3">Nota</th>
                    <th className="p-3">Remetente</th>
                    <th className="p-3">Destinatário</th>
                    <th className="p-3">Cidade</th>
                    <th className="p-3">Motorista</th>
                    <th className="p-3">Situação</th>
                    <th className="p-3">Emissão</th>
                    <th className="p-3">Entrega</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA).map((n) => {
                    const pend = notaPendente(n);
                    return (
                      <tr key={n.id} className={`border-t border-slate-100 ${pend ? 'bg-rose-50' : ''}`}>
                        <td className="p-3 cartao-titulo">
                          <p className="font-black text-slate-900">{n.numero}</p>
                          {pend && n.prazo === 'FORA PRAZO' && <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 text-[9px] font-bold">Prazo vencido</span>}
                        </td>
                        <td className="p-3 max-w-[160px] truncate" data-label="Remetente" title={n.remetente}>
                          {n.remetente}
                        </td>
                        <td className="p-3 max-w-[180px] truncate" data-label="Destinatário" title={n.destinatario}>
                          {n.destinatario}
                        </td>
                        <td className="p-3" data-label="Cidade">
                          {n.cidade}
                        </td>
                        <td className="p-3 max-w-[150px] truncate" data-label="Motorista">
                          {nomeBonito(n.motorista)}
                        </td>
                        <td className="p-3" data-label="Situação">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pend ? 'bg-rose-100 text-rose-800' : n.entregaTardiaEm ? 'bg-amber-100 text-[#92611F]' : 'bg-emerald-100 text-emerald-800'}`}>
                            {n.entregaTardiaEm ? 'ENTREGA TARDIA' : n.situacao || '—'}
                          </span>
                          {pend && (
                            <button type="button" onClick={() => tardia(n)} className="block mt-1 text-[10px] font-bold text-emerald-700 hover:underline normal-case tracking-normal">
                              ✓ Registrar entrega tardia
                            </button>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap" data-label="Emissão">
                          {dataHoraBr(n.dataEmissao)}
                        </td>
                        <td className="p-3 whitespace-nowrap font-semibold" data-label="Entrega">
                          {n.entregaTardiaEm ? dataHoraBr(n.entregaTardiaEm) : n.dataEntrega ? dataHoraBr(n.dataEntrega) : 'Pendente / em rota'}
                          {!pend && !notaNoPrazo(n) && <span className="block text-[10px] text-rose-700">fora do prazo</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Página {pagina + 1} de {paginas} ({lista.length} notas)
              </span>
              <span className="flex gap-2">
                <button type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40">
                  Anterior
                </button>
                <button type="button" disabled={pagina >= paginas - 1} onClick={() => setPagina((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold disabled:opacity-40">
                  Próxima
                </button>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Importar
// ---------------------------------------------------------------------------
const ImportarBaixasModal: React.FC<{
  responsaveis: string[];
  bases: string[];
  usuario?: string;
  onClose: () => void;
  onSalvo: (u: BaixaUpload) => void;
}> = ({ responsaveis, bases, usuario, onClose, onSalvo }) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lido, setLido] = useState<ReturnType<typeof lerPlanilhaBaixas> | null>(null);
  const [responsavel, setResponsavel] = useState((usuario || '').split(' ')[0]);
  const [data, setData] = useState('');
  const [base, setBase] = useState('Matriz');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const escolher = async (f?: File) => {
    if (!f) return;
    setErro(null);
    setArquivo(f);
    try {
      const r = lerPlanilhaBaixas(await f.arrayBuffer(), f.name);
      setLido(r);
      if (r.dataSugerida) setData(r.dataSugerida);
    } catch (e) {
      setLido(null);
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a planilha.');
    }
  };
  const cont = lido ? contar(lido.notas as BaixaNota[]) : null;
  const motoristas = lido ? new Set(lido.notas.map((n) => n.motorista || '')).size : 0;

  const salvar = async () => {
    if (!lido) return setErro('Escolha a planilha.');
    if (!responsavel.trim()) return setErro('Informe o responsável pela planilha.');
    if (!data) return setErro('Informe a data de referência.');
    setSalvando(true);
    setErro(null);
    try {
      const u = await salvarUploadBaixas({ responsavel, base: base.trim() || 'Matriz', dataReferencia: data, arquivoNome: arquivo?.name, notas: lido.notas, criadoPor: usuario });
      onSalvo(u);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case">Importar baixas do dia</h2>
            <p className="text-slate-500">Planilha "Relatório de documentos" exportada do sistema de baixas.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="flex items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-bold cursor-pointer hover:bg-amber-50 hover:border-amber-300">
            <Upload className="w-4 h-4" /> {arquivo ? arquivo.name : 'Escolher a planilha (.xlsx)'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
          </label>
          {cont && (
            <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
              {cont.total} notas · {motoristas} motorista(s) · {cont.entregues} entregues · {cont.total - cont.entregues} pendentes · {cont.comprovadas} comprovadas
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block col-span-2">
              <span className="font-bold text-slate-700">Responsável pela planilha</span>
              <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} list="baixas-responsaveis" className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              <datalist id="baixas-responsaveis">
                {responsaveis.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="font-bold text-slate-700">Data de referência</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
            </label>
            <label className="block">
              <span className="font-bold text-slate-700">Base</span>
              <input value={base} onChange={(e) => setBase(e.target.value)} list="baixas-bases" className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
              <datalist id="baixas-bases">
                {bases.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </label>
          </div>
          <p className="text-[11px] text-slate-500">Se já existir a importação do mesmo responsável, dia e base, ela é substituída por esta.</p>
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
            Cancelar
          </button>
          <button type="button" onClick={salvar} disabled={salvando || !lido} className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar
          </button>
        </div>
      </div>
    </div>
  );
};

