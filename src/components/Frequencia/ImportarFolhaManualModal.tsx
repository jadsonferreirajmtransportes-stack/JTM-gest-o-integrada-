import React, { useMemo, useState } from 'react';
import { X, Upload, Loader2, AlertTriangle, FileImage, Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { Colaborador } from '../../types';
import { BatidaPonto, JustificativaDia, TIPOS_JUSTIFICATIVA, incluirBatidasLote, salvarJustificativa } from '../../utils/frequenciaApi';
import { NOMES_DIA, dataLocal, diaDaSemana, diasDoMes, formatarMinutos } from './frequenciaCalc';
import { nomeMes } from './espelhoPdf';
import { PdfEmTela } from '../Contracheques/ContrachequePublicView';

// ============================================================================
// Folha de frequência preenchida à mão → batidas do sistema (ajuste do DP).
// Cada linha é uma jornada que começa no dia da linha: horários menores que o
// anterior viram o dia seguinte (viagem/noturno: 20:15 → 04:00 → 05:01 → 16:20
// = tudo jornada do dia de início). Dia em branco = folga da escala.
// A transcrição pode vir de um arquivo .json (feito a partir das folhas
// digitalizadas) e SEMPRE é conferida aqui, contra a imagem da folha, antes de
// lançar. A imagem/PDF da folha só é aberta no navegador — não é enviada.
// ============================================================================

interface LinhaFolha {
  dia: number;
  e1: string;
  s1: string;
  e2: string;
  s2: string;
  justificativa: string;
  duvida?: string;
}

interface Folha {
  nomeNaFolha: string;
  colaboradorId: string;
  linhas: LinhaFolha[];
  imagem?: { url: string; pdf: boolean };
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function acharColaborador(nome: string, colaboradores: Colaborador[]): string {
  const alvo = normalizar(nome);
  const exato = colaboradores.find((c) => normalizar(c.nomeCompleto) === alvo);
  if (exato) return exato.id;
  const partes = alvo.split(' ');
  const parcial = colaboradores.filter((c) => {
    const n = normalizar(c.nomeCompleto);
    return partes.every((p) => n.includes(p));
  });
  return parcial.length === 1 ? parcial[0].id : '';
}

const somarDias = (iso: string, d: number) => {
  const x = new Date(`${iso}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};
const hm = (t: string) => {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const valido = (t: string) => !t || (/^\d{1,2}:\d{2}$/.test(t) && hm(t) < 24 * 60 && Number(t.split(':')[1]) < 60);
const normalizarHora = (t: string) => {
  const v = t.trim().replace(/[hH.]/, ':');
  if (/^\d{3,4}$/.test(v)) return `${v.slice(0, -2).padStart(2, '0')}:${v.slice(-2)}`;
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : v;
};

/** Horários da linha → batidas com data/hora e o dia de trabalho (o dia da linha). */
function batidasDaLinha(mes: string, l: LinhaFolha): { dataHora: string; diaSeguinte: boolean }[] {
  const dia = `${mes}-${String(l.dia).padStart(2, '0')}`;
  const horas = [l.e1, l.s1, l.e2, l.s2].filter((t) => t && valido(t));
  let deslocamento = 0;
  let anterior = -1;
  return horas.map((t) => {
    const m = hm(t);
    if (anterior >= 0 && m < anterior) deslocamento += 1;
    anterior = m;
    return { dataHora: `${somarDias(dia, deslocamento)}T${t}`, diaSeguinte: deslocamento > 0 };
  });
}

function minutosTrabalhados(mes: string, l: LinhaFolha): number {
  const b = batidasDaLinha(mes, l).map((x) => Date.parse(`${x.dataHora}:00-03:00`));
  let total = 0;
  for (let i = 0; i + 1 < b.length; i += 2) total += Math.max(0, (b[i + 1] - b[i]) / 60000);
  return Math.round(total);
}

function linhasVazias(mes: string): LinhaFolha[] {
  return diasDoMes(mes).map((d) => ({ dia: Number(d.slice(8, 10)), e1: '', s1: '', e2: '', s2: '', justificativa: '' }));
}

export const ImportarFolhaManualModal: React.FC<{
  colaboradores: Colaborador[];
  mesInicial: string;
  batidasExistentes: BatidaPonto[];
  justificativasExistentes: JustificativaDia[];
  criadoPor?: string;
  onClose: () => void;
  /** A transcrição é de outro mês: a tela de fora troca o mês (para conferir o que já existe). */
  onTrocarMes?: (mes: string) => void;
  onLancado: (batidas: BatidaPonto[], justificativas: JustificativaDia[]) => void;
}> = ({ colaboradores, mesInicial, batidasExistentes, justificativasExistentes, criadoPor, onClose, onTrocarMes, onLancado }) => {
  const [mes, setMes] = useState(mesInicial);
  const [folhas, setFolhas] = useState<Folha[]>([]);
  const [sel, setSel] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [lancando, setLancando] = useState(false);
  const [conferidas, setConferidas] = useState<Set<number>>(new Set());

  const folha = folhas[sel];
  const porId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);

  const carregarArquivo = async (arq?: File) => {
    if (!arq) return;
    setErro(null);
    try {
      const json = JSON.parse(await arq.text());
      if (json?.tipo !== 'jmt-folha-manual' || !/^\d{4}-\d{2}$/.test(json.mes) || !Array.isArray(json.folhas)) throw new Error('formato');
      const m: string = json.mes;
      setMes(m);
      if (m !== mesInicial) onTrocarMes?.(m);
      const novas: Folha[] = json.folhas.map((f: any) => {
        const linhas = linhasVazias(m);
        (f.linhas || []).forEach((l: any) => {
          const i = linhas.findIndex((x) => x.dia === Number(l.dia));
          if (i >= 0) linhas[i] = { ...linhas[i], e1: l.e1 || '', s1: l.s1 || '', e2: l.e2 || '', s2: l.s2 || '', duvida: l.duvida || undefined };
        });
        (f.justificativas || []).forEach((j: any) => {
          const i = linhas.findIndex((x) => x.dia === Number(j.dia));
          if (i >= 0) linhas[i] = { ...linhas[i], justificativa: j.tipo || '', duvida: j.obs ? [linhas[i].duvida, j.obs].filter(Boolean).join(' · ') : linhas[i].duvida };
        });
        return { nomeNaFolha: f.nome || '', colaboradorId: acharColaborador(f.nome || '', colaboradores), linhas };
      });
      setFolhas(novas);
      setSel(0);
      setConferidas(new Set());
    } catch {
      setErro('Arquivo inválido. Use o arquivo de transcrição (.json) gerado para as folhas.');
    }
  };

  const adicionarEmBranco = () => {
    setFolhas((p) => [...p, { nomeNaFolha: '', colaboradorId: '', linhas: linhasVazias(mes) }]);
    setSel(folhas.length);
  };

  const atualizarFolha = (i: number, parcial: Partial<Folha>) => setFolhas((p) => p.map((f, k) => (k === i ? { ...f, ...parcial } : f)));
  const atualizarLinha = (dia: number, campo: keyof LinhaFolha, valor: string) =>
    atualizarFolha(sel, { linhas: folha.linhas.map((l) => (l.dia === dia ? { ...l, [campo]: valor } : l)) });

  // Dias que já têm batida ou justificativa no sistema — não são lançados de novo.
  const jaNoSistema = (colaboradorId: string, data: string) => ({
    batida: batidasExistentes.some((b) => b.colaboradorId === colaboradorId && !b.anulado && (b.diaTrabalho || dataLocal(b.registradoEm)) === data),
    justificativa: justificativasExistentes.some((j) => j.colaboradorId === colaboradorId && j.data === data),
  });

  const planejar = (f: Folha) => {
    const batidas: { colaboradorId: string; dataHoraLocal: string; diaTrabalho: string }[] = [];
    const justs: Omit<JustificativaDia, 'id'>[] = [];
    let pulados = 0;
    let invalidas = 0;
    if (!f.colaboradorId) return { batidas, justs, pulados, invalidas };
    f.linhas.forEach((l) => {
      const data = `${mes}-${String(l.dia).padStart(2, '0')}`;
      const horas = [l.e1, l.s1, l.e2, l.s2].filter(Boolean);
      if (horas.some((t) => !valido(t))) invalidas += 1;
      const existe = jaNoSistema(f.colaboradorId, data);
      if (horas.length) {
        if (existe.batida) pulados += 1;
        else batidasDaLinha(mes, l).forEach((b) => batidas.push({ colaboradorId: f.colaboradorId, dataHoraLocal: b.dataHora, diaTrabalho: data }));
      }
      if (l.justificativa && !existe.justificativa) {
        const t = TIPOS_JUSTIFICATIVA.find((x) => x.tipo === l.justificativa);
        justs.push({ colaboradorId: f.colaboradorId, data, tipo: l.justificativa, abona: t?.abona ?? true, observacao: `Folha manual ${nomeMes(mes)}${l.duvida ? ` — ${l.duvida}` : ''}`, criadoPor });
      }
    });
    return { batidas, justs, pulados, invalidas };
  };

  const planos = folhas.map(planejar);
  const totalBatidas = planos.reduce((s, p) => s + p.batidas.length, 0);
  const totalJust = planos.reduce((s, p) => s + p.justs.length, 0);
  const semColaborador = folhas.filter((f) => !f.colaboradorId).length;
  const comInvalida = planos.some((p) => p.invalidas > 0);
  const todasConferidas = folhas.length > 0 && folhas.every((_, i) => conferidas.has(i));

  const lancar = async () => {
    if (!window.confirm(`Lançar ${totalBatidas} batida(s) e ${totalJust} justificativa(s) de ${folhas.length} folha(s) de ${nomeMes(mes)}? Tudo entra como ajuste do DP, com o motivo "folha manual".`)) return;
    setLancando(true);
    setErro(null);
    try {
      const todas = planos.flatMap((p) => p.batidas);
      const novas = await incluirBatidasLote(todas, `Folha manual de ${nomeMes(mes)} (lançada pelo DP a partir da folha assinada)`, criadoPor);
      const justsSalvas: JustificativaDia[] = [];
      for (const j of planos.flatMap((p) => p.justs)) justsSalvas.push(await salvarJustificativa(j));
      onLancado(novas, justsSalvas);
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível lançar. Nada foi perdido: confira e tente de novo.');
    } finally {
      setLancando(false);
    }
  };

  const abrirImagem = (arq?: File) => {
    if (!arq || !folha) return;
    if (folha.imagem) URL.revokeObjectURL(folha.imagem.url);
    atualizarFolha(sel, { imagem: { url: URL.createObjectURL(arq), pdf: arq.type === 'application/pdf' } });
  };

  const plano = folha ? planos[sel] : null;
  const colabSel = folha ? porId.get(folha.colaboradorId) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-2" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[1400px] h-[96vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Importar folha de frequência manual — {nomeMes(mes)}</h2>
            <p className="text-slate-500 max-w-3xl">
              Cada linha é uma jornada que começa no dia da linha. Horário menor que o anterior passa para o dia seguinte (viagem / noturno). Dia em branco = folga da
              escala. <strong>Confira cada folha contra o papel antes de lançar.</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Carregar transcrição (.json)
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { carregarArquivo(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={adicionarEmBranco} className="px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Folha em branco
            </button>
            <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {folhas.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 p-10 text-center">
            Carregue o arquivo de transcrição das folhas ou comece uma folha em branco para digitar.
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            {/* Lista de folhas */}
            <div className="lg:w-56 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto p-2 space-y-1">
              {folhas.map((f, i) => (
                <div key={i} className={`rounded-lg border ${sel === i ? 'border-[#C48229] bg-amber-50' : 'border-slate-200'}`}>
                  <button type="button" onClick={() => setSel(i)} className="w-full text-left normal-case p-2">
                    <p className="font-bold text-slate-800 truncate">{f.nomeNaFolha || porId.get(f.colaboradorId)?.nomeCompleto || 'Folha em branco'}</p>
                    <p className="text-[10px] text-slate-500">
                      {planos[i].batidas.length} batidas · {planos[i].justs.length} justif.
                      {planos[i].pulados ? ` · ${planos[i].pulados} já no sistema` : ''}
                    </p>
                    <p className={`text-[10px] font-bold ${!f.colaboradorId ? 'text-rose-600' : conferidas.has(i) ? 'text-emerald-700' : 'text-[#92611F]'}`}>
                      {!f.colaboradorId ? 'Escolha o colaborador' : conferidas.has(i) ? '✓ Conferida' : 'A conferir'}
                    </p>
                  </button>
                </div>
              ))}
            </div>

            {/* Grade da folha */}
            {folha && (
              <div className="flex-1 min-w-0 overflow-y-auto p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select value={folha.colaboradorId} onChange={(e) => atualizarFolha(sel, { colaboradorId: e.target.value })} className={`p-2 border rounded-lg bg-white font-semibold min-w-[260px] ${folha.colaboradorId ? 'border-slate-300' : 'border-rose-400'}`}>
                    <option value="">Escolha o colaborador...</option>
                    {colaboradores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nomeCompleto}
                      </option>
                    ))}
                  </select>
                  {colabSel && <span className="text-slate-500">{[colabSel.funcaoCargo, colabSel.setor].filter(Boolean).join(' · ')}</span>}
                  <button type="button" onClick={() => { setFolhas((p) => p.filter((_, k) => k !== sel)); setSel(0); }} className="ml-auto p-1.5 text-slate-400 hover:text-rose-600" title="Tirar esta folha da importação">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                    <tr>
                      <th className="px-1.5 py-1.5 text-left">Dia</th>
                      <th className="px-1 py-1.5">E1</th>
                      <th className="px-1 py-1.5">S1</th>
                      <th className="px-1 py-1.5">E2</th>
                      <th className="px-1 py-1.5">S2</th>
                      <th className="px-1 py-1.5">Horas</th>
                      <th className="px-1 py-1.5 text-left">Justificativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {folha.linhas.map((l) => {
                      const data = `${mes}-${String(l.dia).padStart(2, '0')}`;
                      const sem = diaDaSemana(data);
                      const existe = folha.colaboradorId ? jaNoSistema(folha.colaboradorId, data) : { batida: false, justificativa: false };
                      const bs = batidasDaLinha(mes, l);
                      const qtd = [l.e1, l.s1, l.e2, l.s2].filter(Boolean).length;
                      const min = minutosTrabalhados(mes, l);
                      const avisos = [
                        existe.batida && qtd > 0 ? 'Já tem batida no sistema neste dia — não será lançado' : '',
                        existe.justificativa && l.justificativa ? 'Já tem justificativa no sistema neste dia' : '',
                        l.duvida || '',
                      ].filter(Boolean);
                      return (
                        <React.Fragment key={l.dia}>
                        <tr className={sem === 0 || sem === 6 ? 'bg-amber-50/40' : ''}>
                          <td className="px-1.5 py-1 font-bold text-slate-700 whitespace-nowrap">
                            {String(l.dia).padStart(2, '0')} <span className="font-normal text-slate-400">{NOMES_DIA[sem]}</span>
                          </td>
                          {(['e1', 's1', 'e2', 's2'] as const).map((campo, k) => {
                            const v = l[campo];
                            const idx = [l.e1, l.s1, l.e2, l.s2].slice(0, k + 1).filter(Boolean).length - 1;
                            const diaSeg = v && bs[idx]?.diaSeguinte;
                            return (
                              <td key={campo} className="px-1 py-1">
                                <div className="relative">
                                  <input
                                    value={v}
                                    onChange={(e) => atualizarLinha(l.dia, campo, e.target.value)}
                                    onBlur={(e) => atualizarLinha(l.dia, campo, normalizarHora(e.target.value))}
                                    placeholder="--:--"
                                    inputMode="numeric"
                                    data-no-uppercase="true"
                                    className={`w-[68px] p-1 border rounded text-center tabular-nums ${!valido(v) ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}
                                  />
                                  {diaSeg && <span className="absolute -top-1.5 -right-1 text-[9px] font-black text-[#92611F]" title="Dia seguinte">+1</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-1 py-1 text-center tabular-nums text-slate-600">
                            {qtd ? (qtd % 2 ? <span className="text-rose-600 font-bold" title="Número ímpar de batidas">incompleto</span> : formatarMinutos(min)) : ''}
                          </td>
                          <td className="px-1 py-1">
                            <select value={l.justificativa} onChange={(e) => atualizarLinha(l.dia, 'justificativa', e.target.value)} className="p-1 border border-slate-200 rounded bg-white w-[150px]">
                              <option value="">—</option>
                              {TIPOS_JUSTIFICATIVA.map((t) => (
                                <option key={t.tipo} value={t.tipo}>
                                  {t.tipo}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        {avisos.length > 0 && (
                          <tr className="border-t-0">
                            <td />
                            <td colSpan={6} className="px-1 pb-1.5 -mt-1">
                              {avisos.map((a) => (
                                <p key={a} className="text-[10px] text-[#92611F] font-semibold flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0 mt-px" /> {a}
                                </p>
                              ))}
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <label className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer font-semibold text-emerald-800">
                  <input
                    type="checkbox"
                    checked={conferidas.has(sel)}
                    onChange={(e) =>
                      setConferidas((p) => {
                        const n = new Set(p);
                        if (e.target.checked) n.add(sel);
                        else n.delete(sel);
                        return n;
                      })
                    }
                    className="w-4 h-4 accent-emerald-600"
                  />
                  Conferi esta folha linha por linha com o papel
                </label>
                {plano && plano.invalidas > 0 && <p className="text-rose-700 font-semibold">Há horário inválido (em vermelho). Corrija no formato 08:00.</p>}
              </div>
            )}

            {/* Folha digitalizada (só no navegador) */}
            {folha && (
              <div className="lg:w-[36%] border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col min-h-[240px]">
                <div className="p-2 border-b border-slate-200 flex items-center gap-2">
                  <label className="px-3 py-1.5 border border-dashed border-slate-300 rounded-lg font-bold text-[#92611F] cursor-pointer flex items-center gap-1.5">
                    <FileImage className="w-3.5 h-3.5" /> {folha.imagem ? 'Trocar a folha digitalizada' : 'Abrir a folha digitalizada (foto ou PDF)'}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { abrirImagem(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  <span className="text-[10px] text-slate-400">Fica só neste computador.</span>
                </div>
                <div className="flex-1 overflow-auto p-2 bg-slate-100">
                  {folha.imagem ? (
                    folha.imagem.pdf ? <PdfEmTela url={folha.imagem.url} /> : <img src={folha.imagem.url} alt="Folha digitalizada" className="w-full" />
                  ) : (
                    <p className="text-slate-400 text-center p-6">Abra a foto/PDF da folha para conferir lado a lado.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
          {erro && <p className="mr-auto text-rose-700 font-semibold">{erro}</p>}
          {folhas.length > 0 && (
            <p className="mr-auto text-slate-600">
              {totalBatidas} batida(s) e {totalJust} justificativa(s) a lançar{semColaborador ? ` · ${semColaborador} folha(s) sem colaborador` : ''}
              {!todasConferidas ? ' · marque "Conferi" em todas as folhas' : ''}
            </p>
          )}
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
            Cancelar
          </button>
          <button
            type="button"
            onClick={lancar}
            disabled={lancando || !todasConferidas || semColaborador > 0 || comInvalida || totalBatidas + totalJust === 0}
            className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {lancando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Lançar no controle de frequência
          </button>
        </div>
      </div>
    </div>
  );
};
