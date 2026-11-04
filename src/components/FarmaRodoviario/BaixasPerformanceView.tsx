import React, { useEffect, useMemo, useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import { Award, ClipboardCheck, CalendarDays, ChevronDown, ChevronRight, Clock, FileSpreadsheet, FileText, Loader2, Package, Search, Trash2, TriangleAlert, Upload, UserRound, X, CheckCircle2 } from 'lucide-react';
import type { Cliente, Colaborador, LancamentoFaturamentoAereo, UsuarioLogin } from '../../types';
import { CruzamentoFaturamento } from './CruzamentoFaturamento';
import { ResponsaveisBaixasModal } from './ResponsaveisBaixasModal';
import { RegrasBaixasModal } from './RegrasBaixasModal';
import { SlidersHorizontal } from 'lucide-react';
import { AcoesTela } from '../Common/AcoesTela';
import {
  BaixaNota,
  BaixaUpload,
  DesempenhoResponsavel,
  REGRAS_PADRAO,
  MOTIVOS_ABONO,
  abonarNota,
  notaAbonada,
  RegrasBaixas,
  desempenhoMotoristas,
  explicarRegrasMotorista,
  explicarRegrasResponsavel,
  getRegrasBaixas,
  salvarRegrasBaixas,
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

const Kpi: React.FC<{ titulo: string; valor: string; detalhe: string; alerta?: boolean; icone: React.ElementType }> = ({ titulo, valor, detalhe, alerta, icone: Icone }) => (
  <div className={`bg-white rounded-2xl border p-4 shadow-xs ${alerta ? 'border-rose-200' : 'border-slate-200'}`}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[11px] font-bold text-slate-500">{titulo}</p>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${alerta ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-[#C48229]'}`}>
        <Icone className="w-[18px] h-[18px]" />
      </span>
    </div>
    <p className={`text-[28px] leading-tight font-black tracking-tight ${alerta ? 'text-rose-700' : 'text-slate-900'}`} style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
      {valor}
    </p>
    <p className="text-[11px] text-slate-500">{detalhe}</p>
  </div>
);

/** Título de bloco no padrão do sistema. */
const TituloBloco: React.FC<{ titulo: string; sub?: string; icone?: React.ElementType }> = ({ titulo, sub, icone: Icone }) => (
  <div className="flex items-center gap-2 mb-3">
    {Icone && (
      <span className="w-8 h-8 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
        <Icone className="w-4 h-4" />
      </span>
    )}
    <div>
      <h3 className="text-sm font-black text-slate-900 normal-case tracking-normal">{titulo}</h3>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  </div>
);

/** Barras horizontais: entregues (bronze) e não entregues (vermelho suave) por motorista. */
const BarrasMotoristas: React.FC<{ linhas: { nome: string; entregues: number; total: number }[] }> = ({ linhas }) => {
  const max = Math.max(1, ...linhas.map((l) => l.total));
  return (
    <div className="space-y-2">
      {linhas.map((l) => (
        <div key={l.nome} className="flex items-center gap-2 text-[11px]">
          <span className="w-36 shrink-0 text-right text-slate-600 truncate" title={l.nome}>
            {nomeBonito(l.nome)}
          </span>
          <div className="flex-1 h-4 bg-[#FBF6EE] rounded-full flex overflow-hidden">
            <div className="bg-[#C48229] h-full" style={{ width: `${(l.entregues / max) * 100}%` }} />
            <div className="bg-rose-400 h-full" style={{ width: `${((l.total - l.entregues) / max) * 100}%` }} />
          </div>
          <span className="w-14 shrink-0 font-bold text-slate-700">
            {l.entregues}/{l.total}
          </span>
        </div>
      ))}
      <p className="text-[10px] text-slate-500 flex gap-3 justify-center pt-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C48229]" /> Entregues
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Não entregues
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
        <div className="flex-1 h-4 bg-[#FBF6EE] rounded-full overflow-hidden">
          <div className="bg-[#92611F] h-full rounded-full" style={{ width: `${Math.min(100, l.valor)}%` }} />
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
        <circle cx="70" cy="70" r={r} fill="none" stroke="#FDA4AF" strokeWidth="20" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#C48229" strokeWidth="20" strokeLinecap="butt" strokeDasharray={`${c * p} ${c}`} />
      </svg>
      <div className="text-xs space-y-1">
        <p className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#C48229]" /> Entregue <b>{f1(p * 100)}</b>
        </p>
        <p className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-300" /> Falha <b>{f1(100 - p * 100)}</b>
        </p>
      </div>
    </div>
  );
};

const Medalha: React.FC<{ pos: number }> = ({ pos }) => (
  <span
    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
      pos === 1 ? 'bg-[#E2A64B] text-white' : pos === 2 ? 'bg-slate-400 text-white' : pos === 3 ? 'bg-[#92611F] text-white' : 'bg-[#FBF6EE] text-[#92611F] border border-amber-200'
    }`}
  >
    {pos}º
  </span>
);

/** Farma Rodoviário → Performance das baixas: importação diária do "Relatório de documentos"
 *  (baixas dos motoristas), auditoria de cada dia e o dossiê do mês (responsáveis e motoristas). */
export const BaixasPerformanceView: React.FC<{
  currentUser?: UsuarioLogin | null;
  colaboradores?: Colaborador[];
  /** Faturamento do setor (Controle Financeiro) — para o cruzamento pela NF. */
  lancamentos?: LancamentoFaturamentoAereo[];
  clientes?: Cliente[];
}> = ({ currentUser, colaboradores = [], lancamentos = [], clientes = [] }) => {
  const [responsaveisAberto, setResponsaveisAberto] = useState(false);
  const [regras, setRegras] = useState<RegrasBaixas>(REGRAS_PADRAO);
  const [regrasAberto, setRegrasAberto] = useState(false);
  useEffect(() => {
    getRegrasBaixas().then(setRegras).catch(() => undefined);
  }, []);
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
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hidden lg:flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
          <ClipboardCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight normal-case">Performance das baixas</h1>
          <p className="text-xs text-slate-500">Planilhas de baixa do dia, auditoria das notas e o resultado do mês por responsável e por motorista.</p>
        </div>
      </div>
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
        >
          <button type="button" onClick={() => setResponsaveisAberto(true)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold flex items-center gap-1.5">
            <UserRound className="w-4 h-4 text-[#C48229]" /> Responsáveis (link pessoal)
          </button>
          <button type="button" onClick={() => setRegrasAberto(true)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-[#C48229]" /> Regras de pontuação
          </button>
        </AcoesTela>
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {uploads === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : aba === 'painel' ? (
        <PainelMes bases={bases} temImportacoes={uploads.length > 0} mesInicial={uploads[0]?.dataReferencia.slice(0, 7) || mesAtual()} regras={regras} lancamentos={lancamentos} clientes={clientes} />
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
          metaEntrega={regras.metaEntrega}
          motivosAbono={regras.motivosAbono}
          onNovoMotivo={async (m) => {
            const novas = { ...regras, motivosAbono: [...regras.motivosAbono, m] };
            await salvarRegrasBaixas(novas, currentUser?.nome);
            setRegras(novas);
          }}
        />
      )}

      {regrasAberto && (
        <RegrasBaixasModal
          regras={regras}
          usuario={currentUser?.nome}
          onClose={() => setRegrasAberto(false)}
          onSalvo={(r) => {
            setRegras(r);
            setRegrasAberto(false);
          }}
        />
      )}

      {responsaveisAberto && <ResponsaveisBaixasModal colaboradores={colaboradores} bases={bases} onClose={() => setResponsaveisAberto(false)} />}

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
const PainelMes: React.FC<{ bases: string[]; temImportacoes: boolean; mesInicial: string; regras: RegrasBaixas; lancamentos: LancamentoFaturamentoAereo[]; clientes: Cliente[] }> = ({
  bases,
  temImportacoes,
  mesInicial,
  regras,
  lancamentos,
  clientes,
}) => {
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
    return resumo.responsaveis.map((r) => desempenhoResponsavel(r, dias, regras)).sort((a, b) => b.pontos - a.pontos);
  }, [resumo, regras]);
  const motoristas = useMemo(() => desempenhoMotoristas(resumo?.motoristas || [], regras), [resumo, regras]);
  const noRanking = motoristas.filter((m) => m.noRanking);
  const foraRanking = motoristas.filter((m) => !m.noRanking);
  const top5 = useMemo(() => [...(resumo?.motoristas || [])].sort((a, b) => b.total - a.total).slice(0, 5), [resumo]);

  const baixarPdf = async () => {
    if (!resumo) return;
    const { gerarDossieBaixasPdf } = await import('./dossieBaixasPdf');
    const arq = gerarDossieBaixasPdf({ mes, base, resumo, ranking, motoristas, regras });
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
            <TituloBloco icone={Award} titulo={`Pódio de excelência — ${nomeMes(mes)}`} sub={`Os 3 melhores responsáveis pelas baixas${base ? ` da base ${base}` : ''}`} />
            <div className="grid sm:grid-cols-3 gap-3">
              {ranking.slice(0, 3).map((r, i) => (
                <div key={r.responsavel} className={`flex items-center gap-3 p-3 rounded-xl border ${i === 0 ? 'border-[#E2A64B] bg-[#FBF6EE]' : 'border-slate-200 bg-white'}`}>
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
            <Kpi titulo="Sucesso geral" valor={f1(pct(resumo.entregues, resumo.total))} detalhe="notas entregues" icone={CheckCircle2} />
            <Kpi titulo="Falhas gerais" valor={f1(100 - pct(resumo.entregues, resumo.total))} detalhe={`${resumo.total - resumo.entregues} notas não entregues`} alerta={resumo.total - resumo.entregues > 0} icone={TriangleAlert} />
            <Kpi titulo="Dentro do prazo" valor={f1(pct(resumo.noPrazo, resumo.total))} detalhe="entregas no prazo" icone={Clock} />
            <Kpi titulo="Total de notas" valor={resumo.total.toLocaleString('pt-BR')} detalhe={`${pct(resumo.comprovadas, resumo.total).toFixed(1)}% comprovadas`} icone={Package} />
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <TituloBloco icone={CheckCircle2} titulo="Efetividade da operação" sub="Notas entregues × não entregues no mês" />
              <Rosca ok={resumo.entregues} total={resumo.total} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <TituloBloco icone={Package} titulo="Top 5 motoristas" sub="Os que mais tiveram notas no mês" />
              <BarrasMotoristas linhas={top5.map((m) => ({ nome: m.motorista, entregues: m.entregues, total: m.total }))} />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <TituloBloco icone={Award} titulo="Ranking dos responsáveis" sub="Quem cuida das planilhas de baixa no escritório" />
              <p className="text-[10px] text-slate-500">{explicarRegrasResponsavel(regras)}</p>
              {ranking.map((r, i) => (
                <div key={r.responsavel} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-[#FCFAF6]">
                  <Medalha pos={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">{r.responsavel.toUpperCase()}</p>
                    <p className="text-[11px] text-slate-600">
                      {r.entregues.toLocaleString('pt-BR')} / {r.total.toLocaleString('pt-BR')} OK
                    </p>
                    <p className="text-[10px] font-semibold text-[#92611F]">
                      Regularidade {f1(r.regularidade)} • comprovação {f1(r.comprovacao)} • {r.diasNoPrazo}/{r.diasEsperados} dias no prazo
                    </p>
                    {r.diasFaltantes.length > 0 && <p className="text-[10px] text-rose-700">Dias faltantes: {r.diasFaltantes.map(dataBr).join(', ')}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-[#92611F]">{r.pontos.toFixed(1)} pts</p>
                    <p className={`text-[10px] ${r.entrega < regras.metaEntrega ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>Entrega {f1(r.entrega)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <TituloBloco icone={UserRound} titulo="Ranking dos motoristas" sub="Pontos de cada motorista no mês" />
              <p className="text-[10px] text-slate-500">{explicarRegrasMotorista(regras)}</p>
              {noRanking.map((m, i) => (
                <div key={m.motorista} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-[#FCFAF6]">
                  <Medalha pos={i + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{nomeBonito(m.motorista)}</p>
                    <p className="text-[10px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 mr-1 font-bold">{m.base.toUpperCase()}</span>
                      {m.entregues} / {m.total} OK · {f1(pct(m.noPrazo, m.total))} no prazo
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-[#92611F]">{m.pontos.toFixed(1)} pts</p>
                    <p className={`text-[10px] ${m.taxa < regras.metaEntrega ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>Entrega {f1(m.taxa)}</p>
                  </div>
                </div>
              ))}
              {foraRanking.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">Abaixo do mínimo de {regras.motorista.minimoNotas} notas (sem posição)</p>
                  {foraRanking.map((m) => (
                    <p key={m.motorista} className="flex justify-between text-[11px] text-slate-500 px-3 py-1">
                      <span>{nomeBonito(m.motorista)}</span>
                      <span>
                        {m.entregues} / {m.total} OK · {f1(m.taxa)}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <CruzamentoFaturamento mes={mes} base={base} lancamentos={lancamentos} clientes={clientes} />
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
  metaEntrega: number;
  motivosAbono: string[];
  onNovoMotivo: (motivo: string) => Promise<void>;
}> = ({ uploads, aberto, onAbrir, onExcluido, onAtualizado, usuario, metaEntrega, motivosAbono, onNovoMotivo }) => {
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
              <button type="button" onClick={() => alternar(resp)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#FBF6EE] text-xs font-black text-[#92611F] normal-case tracking-normal">
                {fechados.has(resp) ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <UserRound className="w-3.5 h-3.5" /> {resp}
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
                            <span className={`text-[10px] font-bold ${pct(u.entregues, u.total) >= metaEntrega ? 'text-slate-500' : 'text-rose-700'}`}>{f1(pct(u.entregues, u.total))}</span>
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
        <DetalheUpload key={aberto.id} upload={aberto} usuario={usuario} onAtualizado={onAtualizado} motivosAbono={motivosAbono} onNovoMotivo={onNovoMotivo} />
      ) : (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">Escolha um dia na lista ao lado para ver a auditoria das notas.</p>
      )}
    </div>
  );
};

const POR_PAGINA = 50;

const pctTexto = (p: number, t: number) => `${pct(p, t).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const LIMITE_LISTA = 25;

/** Resumo do dia de um motorista, no formato do WhatsApp (*negrito*). */
export function textoResumoMotorista(upload: BaixaUpload, motorista: string, notas: BaixaNota[]): string {
  const c = contar(notas);
  const pend = notas.filter(notaPendente);
  const foraPrazo = notas.filter((n) => !notaPendente(n) && !notaNoPrazo(n));
  const linhas = [
    `*JM Transportes — Baixas de ${dataBr(upload.dataReferencia)}*`,
    `Motorista: *${nomeBonito(motorista)}*`,
    '',
    `📦 Notas: *${c.total}*`,
    `✅ Entregues: *${c.entregues}* (${pctTexto(c.entregues, c.total)})`,
    `⏱️ No prazo: *${c.noPrazo}* (${pctTexto(c.noPrazo, c.total)})`,
    `📄 Comprovadas: *${c.comprovadas}* (${pctTexto(c.comprovadas, c.total)})`,
  ];
  if (pend.length) {
    linhas.push('', `⚠️ *Pendentes (${pend.length}):*`);
    pend.slice(0, LIMITE_LISTA).forEach((n) => linhas.push(`• NF ${n.numero}${n.destinatario ? ` — ${nomeBonito(n.destinatario)}` : ''}${n.cidade ? ` (${n.cidade})` : ''}`));
    if (pend.length > LIMITE_LISTA) linhas.push(`… e mais ${pend.length - LIMITE_LISTA}`);
  } else linhas.push('', '🎉 Nenhuma pendência. Parabéns!');
  if (foraPrazo.length) {
    linhas.push('', `🕒 Entregues fora do prazo (${foraPrazo.length}):`);
    foraPrazo.slice(0, LIMITE_LISTA).forEach((n) => linhas.push(`• NF ${n.numero}`));
    if (foraPrazo.length > LIMITE_LISTA) linhas.push(`… e mais ${foraPrazo.length - LIMITE_LISTA}`);
  }
  const abonadas = notas.filter(notaAbonada);
  if (abonadas.length) {
    linhas.push('', `🟡 Abonadas (${abonadas.length}) — não contam no resultado:`);
    abonadas.slice(0, LIMITE_LISTA).forEach((n) => linhas.push(`• NF ${n.numero} — ${n.abonoMotivo}`));
  }
  linhas.push('', `Responsável: ${upload.responsavel}`);
  return linhas.join('\n');
}

/** Resumo do dia com todos os motoristas (para o grupo). */
export function textoResumoDia(upload: BaixaUpload, notas: BaixaNota[]): string {
  const c = contar(notas);
  const por = new Map<string, BaixaNota[]>();
  notas.forEach((n) => por.set(n.motorista || 'Sem motorista', [...(por.get(n.motorista || 'Sem motorista') || []), n]));
  const linhas = [
    `*JM Transportes — Baixas de ${dataBr(upload.dataReferencia)}*`,
    `Base: ${upload.base} · Responsável: ${upload.responsavel}`,
    '',
    `📦 Notas: *${c.total}* · ✅ Entregues: *${pctTexto(c.entregues, c.total)}* · ⏱️ No prazo: *${pctTexto(c.noPrazo, c.total)}*`,
    '',
    '*Por motorista:*',
  ];
  [...por.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([m, l]) => {
      const x = contar(l);
      const p = x.total - x.entregues;
      linhas.push(`• ${nomeBonito(m)}: ${x.entregues}/${x.total} (${pctTexto(x.entregues, x.total)})${p ? ` — ⚠️ ${p} pendente(s)` : ' ✅'}`);
    });
  return linhas.join('\n');
}

function enviarWhatsApp(texto: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, 'jmt-whatsapp');
}
async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    alert('Resumo copiado. É só colar no WhatsApp.');
  } catch {
    window.prompt('Copie o resumo:', texto);
  }
}

/** Auditoria de uma importação. Usado na gestão e no portal do responsável (que passa as
 *  funções do portal para carregar as notas e registrar a entrega tardia). */
export const DetalheUpload: React.FC<{
  upload: BaixaUpload;
  usuario?: string;
  onAtualizado: (u: BaixaUpload) => void;
  carregarNotas?: (uploadId: string) => Promise<BaixaNota[]>;
  marcarTardia?: (n: BaixaNota, quando: string) => Promise<BaixaNota>;
  marcarAbono?: (n: BaixaNota, motivo: string, obs: string) => Promise<BaixaNota>;
  motivosAbono?: string[];
  /** Gestão: acrescenta um motivo novo à lista (salvo nas regras). */
  onNovoMotivo?: (motivo: string) => Promise<void>;
}> = ({ upload, usuario, onAtualizado, carregarNotas, marcarTardia, marcarAbono, motivosAbono = MOTIVOS_ABONO, onNovoMotivo }) => {
  const [abonando, setAbonando] = useState<BaixaNota | null>(null);
  const [notas, setNotas] = useState<BaixaNota[] | null>(null);
  const [motorista, setMotorista] = useState('');
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    (carregarNotas || getNotasDoUpload)(upload.id)
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
        .sort((a, b) => Number(notaPendente(b)) - Number(notaPendente(a)) || Number(notaAbonada(b)) - Number(notaAbonada(a)) || a.numero.localeCompare(b.numero)),
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
      const nova = marcarTardia ? await marcarTardia(n, iso.toISOString()) : await registrarEntregaTardia(n, iso.toISOString(), usuario, notas || []);
      const novas = (notas || []).map((x) => (x.id === n.id ? nova : x));
      setNotas(novas);
      const c = contar(novas);
      onAtualizado({ ...upload, entregues: c.entregues, noPrazo: c.noPrazo });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível registrar.');
    }
  };

  /** Abona (motivo preenchido) ou desfaz o abono (motivo vazio). */
  const aplicarAbono = async (n: BaixaNota, motivo: string, obs: string) => {
    const nova = marcarAbono ? await marcarAbono(n, motivo, obs) : await abonarNota(n, motivo, obs, usuario, notas || []);
    const novas = (notas || []).map((x) => (x.id === n.id ? (motivo ? { ...nova, abonadoPor: nova.abonadoPor || usuario } : nova) : x));
    setNotas(novas);
    const c = contar(novas);
    onAtualizado({ ...upload, total: c.total, entregues: c.entregues, comprovadas: c.comprovadas, noPrazo: c.noPrazo, abonadas: c.abonadas });
  };
  const desfazerAbono = async (n: BaixaNota) => {
    if (!window.confirm(`Desfazer o abono da NF ${n.numero}? Ela volta a contar como pendente.`)) return;
    try {
      await aplicarAbono(n, '', '');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível desfazer.');
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
      {abonando && <AbonoModal nota={abonando} motivos={motivosAbono} onNovoMotivo={onNovoMotivo} onClose={() => setAbonando(null)} onConfirmar={async (motivo, obs) => {
        await aplicarAbono(abonando, motivo, obs);
        setAbonando(null);
      }} />}
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex gap-6 text-xs">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Responsável pela planilha</p>
            <p className="font-black text-slate-900 flex items-center gap-1">
              <UserRound className="w-3.5 h-3.5 text-[#C48229]" /> {upload.responsavel.toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Data referência</p>
            <p className="font-black text-slate-900 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-[#C48229]" /> {dataBr(upload.dataReferencia)}
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
            <Kpi titulo="Taxa de sucesso" valor={f1(pct(cont.entregues, cont.total))} detalhe="pedidos entregues" icone={CheckCircle2} />
            <Kpi titulo="Não entregues" valor={f1(100 - pct(cont.entregues, cont.total))} detalhe={`${cont.total - cont.entregues} com ocorrência`} alerta={cont.total - cont.entregues > 0} icone={TriangleAlert} />
            <Kpi titulo="Dentro do prazo" valor={f1(pct(cont.noPrazo, cont.total))} detalhe="entregas no prazo" icone={Clock} />
            <Kpi titulo="Total processado" valor={String(cont.total)} detalhe={`${cont.comprovadas} comprovadas${cont.abonadas ? ` · ${cont.abonadas} abonada(s)` : ''}`} icone={Package} />
          </div>

          <div className="grid xl:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <TituloBloco icone={UserRound} titulo="Entregues e não entregues" sub="Por motorista" />
              <BarrasMotoristas linhas={porMotorista.map((m) => ({ nome: m.nome, entregues: m.entregues, total: m.total }))} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <TituloBloco icone={Clock} titulo="Dentro do prazo" sub="% das notas de cada motorista entregues no prazo" />
              <BarrasPercentual linhas={porMotorista.map((m) => ({ nome: m.nome, valor: pct(m.noPrazo, m.total) }))} />
            </div>
          </div>

          <div className="envelope-cartoes bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <div className="p-4 pb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 normal-case tracking-normal">Resumo por motorista</h3>
                <p className="text-[11px] text-slate-500">Use o WhatsApp de cada linha para mandar o resumo do dia ao motorista.</p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => enviarWhatsApp(textoResumoDia(upload, notas || []))} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold flex items-center gap-1.5 normal-case tracking-normal" title="Resumo do dia com todos os motoristas">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Resumo do dia
                </button>
                <button type="button" onClick={() => copiarTexto(textoResumoDia(upload, notas || []))} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500" title="Copiar o resumo do dia">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
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
                  <th className="p-3 text-center">Enviar</th>
                </tr>
              </thead>
              <tbody>
                {porMotorista.map((m) => (
                  <tr key={m.nome} className="border-t border-slate-100">
                    <td className="p-3 font-bold text-slate-900 cartao-titulo">{nomeBonito(m.nome)}</td>
                    <td className="p-3 text-center" data-label="Total">
                      {m.total}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-900" data-label="Entregues">
                      {m.entregues}
                    </td>
                    <td className={`p-3 text-center font-bold ${m.total - m.entregues ? 'text-rose-700' : 'text-slate-400'}`} data-label="Não entregues">
                      {m.total - m.entregues}
                    </td>
                    <td className="p-3 text-center font-bold" data-label="Entrega">
                      {f1(pct(m.entregues, m.total))}
                    </td>
                    <td className="p-3 text-center font-bold text-[#92611F]" data-label="No prazo">
                      {f1(pct(m.noPrazo, m.total))}
                    </td>
                    <td className="p-3 cartao-acoes">
                      <div className="flex justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => enviarWhatsApp(textoResumoMotorista(upload, m.nome, (notas || []).filter((n) => (n.motorista || 'Sem motorista') === m.nome)))}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 normal-case tracking-normal"
                          title="Enviar o resumo do dia deste motorista pelo WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => copiarTexto(textoResumoMotorista(upload, m.nome, (notas || []).filter((n) => (n.motorista || 'Sem motorista') === m.nome)))}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500"
                          title="Copiar o resumo"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 normal-case tracking-normal">Auditoria das notas</h3>
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
              <button type="button" onClick={baixarPendencias} disabled={!(notas || []).some(notaPendente)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Baixar pendências (Excel)
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
                      <tr key={n.id} className={`border-t border-slate-100 ${pend ? 'bg-rose-50/60' : notaAbonada(n) ? 'bg-slate-50' : ''}`}>
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pend ? 'bg-rose-50 text-rose-700 border border-rose-200' : notaAbonada(n) ? 'bg-slate-100 text-slate-600 border border-slate-300' : n.entregaTardiaEm ? 'bg-amber-50 text-[#92611F] border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {notaAbonada(n) ? 'ABONADA' : n.entregaTardiaEm ? 'ENTREGA TARDIA' : n.situacao || '—'}
                          </span>
                          {pend && (
                            <span className="flex flex-col items-start gap-0.5 mt-1">
                              <button type="button" onClick={() => tardia(n)} className="text-[10px] font-bold text-[#92611F] hover:underline normal-case tracking-normal">
                                ✓ Registrar entrega tardia
                              </button>
                              <button type="button" onClick={() => setAbonando(n)} className="text-[10px] font-bold text-slate-600 hover:underline normal-case tracking-normal">
                                ⊘ Abonar
                              </button>
                            </span>
                          )}
                          {notaAbonada(n) && (
                            <span className="block mt-1 text-[10px] text-slate-600 max-w-[220px]">
                              <b>{n.abonoMotivo}</b>
                              {n.abonoObs ? ` — ${n.abonoObs}` : ''}
                              <span className="block text-slate-400">
                                {n.abonadoPor ? `por ${n.abonadoPor} ` : ''}
                                {n.abonadoEm ? `em ${dataHoraBr(n.abonadoEm)}` : ''}
                              </span>
                              <button type="button" onClick={() => desfazerAbono(n)} className="text-[10px] font-bold text-rose-700 hover:underline normal-case tracking-normal">
                                Desfazer abono
                              </button>
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap" data-label="Emissão">
                          {dataHoraBr(n.dataEmissao)}
                        </td>
                        <td className="p-3 whitespace-nowrap font-semibold" data-label="Entrega">
                          {n.entregaTardiaEm ? dataHoraBr(n.entregaTardiaEm) : n.dataEntrega ? dataHoraBr(n.dataEntrega) : notaAbonada(n) ? '— (abonada)' : 'Pendente / em rota'}
                          {!pend && !notaAbonada(n) && !notaNoPrazo(n) && <span className="block text-[10px] text-rose-700">fora do prazo</span>}
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

const AbonoModal: React.FC<{
  nota: BaixaNota;
  motivos: string[];
  onNovoMotivo?: (motivo: string) => Promise<void>;
  onClose: () => void;
  onConfirmar: (motivo: string, obs: string) => Promise<void>;
}> = ({ nota, motivos, onNovoMotivo, onClose, onConfirmar }) => {
  const [motivo, setMotivo] = useState('');
  const [lista, setLista] = useState<string[]>(motivos);
  const [novo, setNovo] = useState('');
  const [criando, setCriando] = useState(false);
  const adicionar = async () => {
    const m = novo.trim();
    if (!m || !onNovoMotivo) return;
    setCriando(true);
    setErro(null);
    try {
      if (!lista.some((x) => x.toLowerCase() === m.toLowerCase())) {
        await onNovoMotivo(m);
        setLista((l) => [...l, m]);
      }
      setMotivo(lista.find((x) => x.toLowerCase() === m.toLowerCase()) || m);
      setNovo('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível adicionar o motivo.');
    } finally {
      setCriando(false);
    }
  };
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const confirmar = async () => {
    if (!motivo) return setErro('Escolha o motivo.');
    if (/^outro/i.test(motivo) && !obs.trim()) return setErro('Explique o motivo na observação.');
    setSalvando(true);
    setErro(null);
    try {
      await onConfirmar(motivo, obs);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abonar.');
      setSalvando(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 normal-case tracking-normal">Abonar a NF {nota.numero}</h3>
            <p className="text-slate-500">
              {nomeBonito(nota.motorista)}
              {nota.destinatario ? ` · ${nomeBonito(nota.destinatario)}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[#92611F]">A nota abonada sai da conta: não pesa contra o motorista nem contra o responsável. Dá para desfazer depois.</p>
          <div className="space-y-1.5">
            {lista.map((m) => (
              <label key={m} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${motivo === m ? 'border-[#C48229] bg-amber-50' : 'border-slate-200'}`}>
                <input type="radio" name="motivo-abono" checked={motivo === m} onChange={() => setMotivo(m)} className="accent-[#C48229]" />
                <span className="font-semibold text-slate-800">{m}</span>
              </label>
            ))}
          </div>
          {onNovoMotivo && (
            <div className="flex gap-2">
              <input
                value={novo}
                onChange={(e) => setNovo(e.target.value.slice(0, 80))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionar();
                  }
                }}
                placeholder="+ Adicionar motivo à lista"
                className="flex-1 p-2 border border-dashed border-slate-300 rounded-lg text-sm"
              />
              <button type="button" onClick={adicionar} disabled={!novo.trim() || criando} className="px-3 py-2 rounded-lg border border-[#C48229] text-[#92611F] font-bold disabled:opacity-50">
                {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
              </button>
            </div>
          )}
          <label className="block">
            <span className="font-bold text-slate-700">Observação {/^outro/i.test(motivo) ? '(obrigatória)' : '(opcional)'}</span>
            <textarea value={obs} onChange={(e) => setObs(e.target.value.slice(0, 500))} rows={2} className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Ex.: farmácia fechada às 17h, reentrega amanhã." />
          </label>
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
            Cancelar
          </button>
          <button type="button" onClick={confirmar} disabled={salvando} className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Abonar
          </button>
        </div>
      </div>
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
            <p className="p-3 rounded-xl bg-[#FBF6EE] border border-amber-200 text-[#92611F] font-semibold">
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

