import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, Download, FileText, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import type { Colaborador, UsuarioLogin } from '../../types';
import type { BatidaPonto, JustificativaDia } from '../../utils/frequenciaApi';
import { ConferenciaFolha, getConferenciaFolha, salvarConferenciaFolha } from '../../utils/folhaApi';
import { baixarBlob } from '../../utils/downloadUtils';
import type { DiaEspelho } from './frequenciaCalc';
import { AjusteFolha, FolhaColaborador, calcularFolha, dependentesIrDoCadastro, IRRF_DEPENDENTE } from './folhaCalc';

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (s: string) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0;
const nomeMes = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Prévia da folha do mês (conferência com a folha da contabilidade). Só para administradores. */
export const PreviaFolhaView: React.FC<{
  colaboradores: Colaborador[];
  mes: string;
  espelhoDe: (c: Colaborador, dias: string[]) => DiaEspelho[];
  dias: string[];
  batidas: BatidaPonto[];
  justificativas: JustificativaDia[];
  feriados: Map<string, string>;
  currentUser?: UsuarioLogin | null;
  carregandoMes?: boolean;
}> = ({ colaboradores, mes, espelhoDe, dias, batidas, justificativas, feriados, currentUser, carregandoMes }) => {
  const [conferencias, setConferencias] = useState<Map<string, ConferenciaFolha>>(new Map());
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    setErro(null);
    getConferenciaFolha(mes)
      .then(setConferencias)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar a conferência.'));
  }, [mes]);

  // Quem entra: ativos e quem saiu durante o mês (admitido até o fim do mês).
  const fimMes = dias[dias.length - 1];
  const doMes = useMemo(
    () =>
      colaboradores
        .filter((c) => (!c.dataAdmissao || c.dataAdmissao <= fimMes) && (c.dataDemissao ? c.dataDemissao.slice(0, 7) >= mes : c.status !== 'Inativo'))
        .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
    [colaboradores, mes, fimMes]
  );
  const comPonto = useMemo(() => new Set([...batidas.map((b) => b.colaboradorId), ...justificativas.map((j) => j.colaboradorId)]), [batidas, justificativas]);

  const folhas = useMemo(() => {
    const m = new Map<string, FolhaColaborador>();
    doMes.forEach((c) => {
      const conf = conferencias.get(c.id);
      m.set(
        c.id,
        calcularFolha({
          colaborador: c,
          mes,
          espelho: espelhoDe(c, dias),
          feriados,
          temPonto: comPonto.has(c.id),
          dependentesIr: conf?.dependentesIr,
          ajustes: conf?.ajustes,
        })
      );
    });
    return m;
  }, [doMes, conferencias, mes, espelhoDe, dias, feriados, comPonto]);

  const visiveis = doMes.filter((c) => !busca.trim() || `${c.nomeCompleto} ${c.funcaoCargo} ${c.codigoMatricula}`.toLowerCase().includes(busca.trim().toLowerCase()));
  const soma = (f: (x: FolhaColaborador) => number) => visiveis.reduce((s, c) => s + f(folhas.get(c.id)!), 0);
  const variaveis = (f: FolhaColaborador) => f.itens.filter((i) => i.tipo === 'provento' && /^0[2-4]/.test(i.codigo) && i.codigo !== '002').reduce((s, i) => s + i.valor, 0);
  const faltasAtrasos = (f: FolhaColaborador) => f.itens.filter((i) => /^10/.test(i.codigo)).reduce((s, i) => s + i.valor, 0);

  const exportar = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Prévia da folha');
    ws.columns = [
      { header: 'Matrícula', width: 11 },
      { header: 'Colaborador', width: 34 },
      { header: 'Função', width: 22 },
      { header: 'Salário', width: 13 },
      { header: 'Extras/noturno/DSR', width: 16 },
      { header: 'Faltas/atrasos', width: 14 },
      { header: 'Bruto', width: 13 },
      { header: 'INSS', width: 12 },
      { header: 'IRRF', width: 12 },
      { header: 'Líquido (prévia)', width: 15 },
      { header: 'Líquido contabilidade', width: 18 },
      { header: 'Diferença', width: 13 },
      { header: 'Avisos', width: 50 },
    ];
    visiveis.forEach((c) => {
      const f = folhas.get(c.id)!;
      const conf = conferencias.get(c.id);
      ws.addRow([
        c.codigoMatricula,
        c.nomeCompleto,
        c.funcaoCargo,
        f.salarioContratual,
        variaveis(f),
        faltasAtrasos(f),
        f.bruto,
        f.inss,
        f.irrf.imposto,
        f.liquido,
        conf?.liquidoContabilidade ?? null,
        conf?.liquidoContabilidade !== undefined ? f.liquido - conf.liquidoContabilidade : null,
        f.avisos.join(' | '),
      ]);
    });
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC48229' } };
    [4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((i) => (ws.getColumn(i).numFmt = '#,##0.00'));
    const det = wb.addWorksheet('Detalhe');
    det.columns = [{ header: 'Colaborador', width: 34 }, { header: 'Código', width: 8 }, { header: 'Descrição', width: 40 }, { header: 'Referência', width: 16 }, { header: 'Provento', width: 13 }, { header: 'Desconto', width: 13 }];
    visiveis.forEach((c) => folhas.get(c.id)!.itens.forEach((i) => det.addRow([c.nomeCompleto, i.codigo, i.descricao, i.referencia || '', i.tipo === 'provento' ? i.valor : null, i.tipo === 'desconto' ? i.valor : null])));
    det.getRow(1).font = { bold: true };
    [5, 6].forEach((i) => (det.getColumn(i).numFmt = '#,##0.00'));
    const buf = await wb.xlsx.writeBuffer();
    baixarBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Previa_Folha_${mes}.xlsx`);
  };

  const card = (rotulo: string, valor: number, cor = 'text-slate-900') => (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase">{rotulo}</p>
      <p className={`text-lg font-black ${cor}`}>{moeda(valor)}</p>
    </div>
  );

  const abertoC = aberto ? doMes.find((c) => c.id === aberto) : undefined;

  return (
    <div className="space-y-4" data-texto-livre="true">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex gap-2">
        <Calculator className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <b>Prévia para conferência</b> de {nomeMes(mes)} — a folha oficial continua sendo a da contabilidade. Salário do cadastro + adicionais da CCT + o que a Frequência apurou
          (horas extras 50% / 100% em domingo e feriado, adicional noturno 20%, DSR, faltas e atrasos) − INSS − IRRF 2026. Informe o líquido da contabilidade para ver as diferenças.
        </p>
      </div>
      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {card('Bruto', soma((f) => f.bruto))}
        {card('INSS', soma((f) => f.inss), 'text-rose-700')}
        {card('IRRF', soma((f) => f.irrf.imposto), 'text-rose-700')}
        {card('Líquido (prévia)', soma((f) => f.liquido), 'text-emerald-700')}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white w-56" />
        </div>
        {carregandoMes && <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" />}
        <button type="button" onClick={exportar} className="ml-auto px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5">
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-2.5">Colaborador</th>
              <th className="p-2.5 text-right">Salário</th>
              <th className="p-2.5 text-right">Extras / noturno / DSR</th>
              <th className="p-2.5 text-right">Faltas / atrasos</th>
              <th className="p-2.5 text-right">Bruto</th>
              <th className="p-2.5 text-right">INSS</th>
              <th className="p-2.5 text-right">IRRF</th>
              <th className="p-2.5 text-right">Líquido</th>
              <th className="p-2.5 text-right">Contabilidade</th>
              <th className="p-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => {
              const f = folhas.get(c.id)!;
              const conf = conferencias.get(c.id);
              const dif = conf?.liquidoContabilidade !== undefined ? f.liquido - conf.liquidoContabilidade : undefined;
              return (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-amber-50/40">
                  <td className="p-2.5">
                    <button type="button" onClick={() => setAberto(c.id)} className="font-semibold text-slate-800 hover:text-[#92611F] text-left">
                      {c.nomeCompleto}
                    </button>
                    <span className="block text-[10px] text-slate-400">{c.funcaoCargo}</span>
                    {f.avisos.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-700 mt-0.5" title={f.avisos.join('\n')}>
                        <AlertTriangle className="w-3 h-3" /> {f.semPonto ? 'Sem ponto no mês' : f.avisos[0].slice(0, 48)}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">{moeda(f.salarioContratual)}</td>
                  <td className="p-2.5 text-right tabular-nums text-emerald-700">{variaveis(f) ? moeda(variaveis(f)) : '—'}</td>
                  <td className="p-2.5 text-right tabular-nums text-rose-600">{faltasAtrasos(f) ? moeda(faltasAtrasos(f)) : '—'}</td>
                  <td className="p-2.5 text-right tabular-nums font-semibold">{moeda(f.bruto)}</td>
                  <td className="p-2.5 text-right tabular-nums text-rose-700">{moeda(f.inss)}</td>
                  <td className="p-2.5 text-right tabular-nums text-rose-700">{f.irrf.imposto ? moeda(f.irrf.imposto) : '—'}</td>
                  <td className="p-2.5 text-right tabular-nums font-black text-emerald-700">{moeda(f.liquido)}</td>
                  <td className="p-2.5 text-right tabular-nums">
                    {conf?.liquidoContabilidade !== undefined ? moeda(conf.liquidoContabilidade) : <span className="text-slate-300">—</span>}
                    {dif !== undefined && Math.abs(dif) >= 0.01 && <span className={`block text-[10px] font-bold ${Math.abs(dif) > 5 ? 'text-rose-600' : 'text-amber-600'}`}>dif. {moeda(dif)}</span>}
                    {dif !== undefined && Math.abs(dif) < 0.01 && <span className="block text-[10px] font-bold text-emerald-600">confere</span>}
                  </td>
                  <td className="p-2.5 text-right">
                    <button type="button" onClick={() => setAberto(c.id)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Ver a prévia do holerite e conferir">
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  Nenhum colaborador neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {abertoC && (
        <HoleriteModal
          colaborador={abertoC}
          mes={mes}
          folha={folhas.get(abertoC.id)!}
          conferencia={conferencias.get(abertoC.id)}
          onClose={() => setAberto(null)}
          onSalvar={async (conf) => {
            await salvarConferenciaFolha(conf, currentUser?.nome);
            setConferencias((m) => new Map(m).set(conf.colaboradorId, conf));
          }}
        />
      )}
    </div>
  );
};

/** Prévia do holerite de um colaborador + conferência (dependentes do IR, lançamentos à mão, líquido da contabilidade). */
const HoleriteModal: React.FC<{
  colaborador: Colaborador;
  mes: string;
  folha: FolhaColaborador;
  conferencia?: ConferenciaFolha;
  onClose: () => void;
  onSalvar: (c: ConferenciaFolha) => Promise<void>;
}> = ({ colaborador: c, mes, folha: f, conferencia, onClose, onSalvar }) => {
  const doCadastro = dependentesIrDoCadastro(c, mes);
  const [dependentes, setDependentes] = useState(conferencia?.dependentesIr !== undefined ? String(conferencia.dependentesIr) : '');
  const [ajustes, setAjustes] = useState<AjusteFolha[]>(conferencia?.ajustes || []);
  const [liquidoCont, setLiquidoCont] = useState(conferencia?.liquidoContabilidade !== undefined ? String(conferencia.liquidoContabilidade).replace('.', ',') : '');
  const [observacao, setObservacao] = useState(conferencia?.observacao || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar({
        mes,
        colaboradorId: c.id,
        dependentesIr: dependentes.trim() === '' ? undefined : Math.max(0, Math.round(numero(dependentes))),
        ajustes: ajustes.filter((a) => a.valor > 0),
        liquidoContabilidade: liquidoCont.trim() === '' ? undefined : numero(liquidoCont),
        observacao: observacao.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  const proventos = f.itens.filter((i) => i.tipo === 'provento');
  const descontos = f.itens.filter((i) => i.tipo === 'desconto');
  const linha = (i: (typeof f.itens)[number]) => (
    <tr key={i.codigo + i.descricao} className="border-t border-slate-100">
      <td className="p-2 text-slate-400 tabular-nums">{i.codigo}</td>
      <td className="p-2 text-slate-800">{i.descricao}</td>
      <td className="p-2 text-slate-500 text-right">{i.referencia || ''}</td>
      <td className="p-2 text-right tabular-nums text-emerald-700">{i.tipo === 'provento' ? moeda(i.valor) : ''}</td>
      <td className="p-2 text-right tabular-nums text-rose-700">{i.tipo === 'desconto' ? moeda(i.valor) : ''}</td>
    </tr>
  );
  const campo = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case">{c.nomeCompleto}</h2>
            <p className="text-xs text-slate-500">
              {c.funcaoCargo} · Prévia do holerite de {nomeMes(mes)} · salário {moeda(f.salarioContratual)} · hora {moeda(f.valorHora)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {f.avisos.map((a) => (
            <p key={a} className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {a}
            </p>
          ))}
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="p-2 w-12">Cód.</th>
                <th className="p-2">Descrição</th>
                <th className="p-2 text-right">Referência</th>
                <th className="p-2 text-right">Proventos</th>
                <th className="p-2 text-right">Descontos</th>
              </tr>
            </thead>
            <tbody>
              {proventos.map(linha)}
              {descontos.map(linha)}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 font-bold">
              <tr>
                <td colSpan={3} className="p-2 text-right text-slate-600">
                  Totais
                </td>
                <td className="p-2 text-right tabular-nums text-emerald-700">{moeda(f.bruto)}</td>
                <td className="p-2 text-right tabular-nums text-rose-700">{moeda(f.totalDescontos)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-2 text-right text-slate-800">
                  Líquido (prévia)
                </td>
                <td className="p-2 text-right tabular-nums text-lg font-black text-slate-900">{moeda(f.liquido)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-[11px] text-slate-500">
            Base INSS {moeda(f.baseInss)} · IRRF: base {moeda(f.irrf.base)} ({f.irrf.simplificado ? 'desconto simplificado' : `INSS + ${f.dependentesIr} dependente(s) × ${moeda(IRRF_DEPENDENTE)}`}), imposto pela tabela{' '}
            {moeda(f.irrf.impostoTabela)}
            {f.irrf.reducaoLei15270 ? `, redução da Lei 15.270 ${moeda(f.irrf.reducaoLei15270)}` : ''}.
          </p>

          <div className="border-t border-slate-200 pt-4 grid sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-600">Dependentes para o IR</label>
              <input value={dependentes} onChange={(e) => setDependentes(e.target.value)} inputMode="numeric" placeholder={`${doCadastro} (pelo cadastro)`} className={`${campo} mt-1`} />
              <p className="text-[10px] text-slate-500 mt-0.5">Em branco = filhos/enteados até 21 anos e cônjuge do cadastro ({doCadastro}).</p>
            </div>
            <div>
              <label className="font-bold text-slate-600">Líquido na folha da contabilidade (R$)</label>
              <input value={liquidoCont} onChange={(e) => setLiquidoCont(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${campo} mt-1 text-right font-bold`} />
              {liquidoCont.trim() !== '' && (
                <p className={`text-[11px] font-bold mt-0.5 ${Math.abs(f.liquido - numero(liquidoCont)) < 0.01 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  Diferença: {moeda(f.liquido - numero(liquidoCont))}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600">Lançamentos à mão (o que o sistema não calcula: adiantamento, comissão, pensão...)</span>
              <button type="button" onClick={() => setAjustes((a) => [...a, { descricao: '', valor: 0, tipo: 'desconto' }])} className="text-[11px] font-bold text-[#92611F] flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
            <div className="mt-1 space-y-1">
              {ajustes.map((a, i) => (
                <div key={i} className="flex gap-1.5">
                  <select value={a.tipo} onChange={(e) => setAjustes((l) => l.map((x, k) => (k === i ? { ...x, tipo: e.target.value as AjusteFolha['tipo'] } : x)))} className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
                    <option value="provento">Provento</option>
                    <option value="desconto">Desconto</option>
                  </select>
                  <input value={a.descricao} onChange={(e) => setAjustes((l) => l.map((x, k) => (k === i ? { ...x, descricao: e.target.value } : x)))} placeholder="Descrição" className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg" />
                  <input
                    defaultValue={a.valor ? String(a.valor).replace('.', ',') : ''}
                    onChange={(e) => setAjustes((l) => l.map((x, k) => (k === i ? { ...x, valor: numero(e.target.value) } : x)))}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-right"
                  />
                  <button type="button" onClick={() => setAjustes((l) => l.filter((_, k) => k !== i))} className="p-1.5 text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {ajustes.length === 0 && <p className="text-[11px] text-slate-400">Nenhum.</p>}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Os lançamentos entram no cálculo do INSS e do IRRF depois de salvar.</p>
          </div>
          <div>
            <label className="font-bold text-slate-600">Observação da conferência</label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className={`${campo} mt-1`} />
          </div>
          {erro && <p className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</p>}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
            Fechar
          </button>
          <button type="button" disabled={salvando} onClick={salvar} className="px-4 py-2 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar conferência
          </button>
        </div>
      </div>
    </div>
  );
};
