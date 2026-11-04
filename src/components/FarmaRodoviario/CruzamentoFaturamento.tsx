import React, { useState } from 'react';
import { DollarSign, FileSpreadsheet, Loader2, Receipt, TriangleAlert } from 'lucide-react';
import type { Cliente, LancamentoFaturamentoAereo } from '../../types';
import { computeValorACobrar, findClienteById } from '../FarmaAereo/faturamentoAereoUtils';
import { CruzamentoMes, getCruzamentoMes, nfNormalizada } from '../../utils/baixasApi';
import { formatCurrency } from '../../utils/formatters';

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());

async function baixarExcel(nome: string, cabecalho: string[], linhas: (string | number)[][]) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(nome.slice(0, 30));
  ws.addRow(cabecalho);
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92611F' } };
  linhas.forEach((l) => ws.addRow(l));
  ws.columns.forEach((c) => (c.width = 22));
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = `${nome.replace(/\s+/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Painel do mês → Faturamento: valor por motorista/responsável e conferência NF x CT-e. */
export const CruzamentoFaturamento: React.FC<{ mes: string; base: string; lancamentos: LancamentoFaturamentoAereo[]; clientes: Cliente[] }> = ({ mes, base, lancamentos, clientes }) => {
  const [dados, setDados] = useState<CruzamentoMes | null>(null);
  const [chave, setChave] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const atual = chave === `${mes}|${base}`;

  const cruzar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      // NFs do faturamento emitidas no mês (e na semana anterior, para pegar o que foi entregue no começo do mês).
      const [a, m] = mes.split('-').map(Number);
      const de = new Date(Date.UTC(a, m - 1, 1) - 7 * 86400000).toISOString().slice(0, 10);
      const ate = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
      const fat: Record<string, number> = {};
      lancamentos.forEach((l) => {
        const d = l.dataEmissao || l.dataConclusao || '';
        if (!d || d < de || d > ate) return;
        const valor = computeValorACobrar(l, findClienteById(clientes, l.clienteId, l.clienteNome));
        (l.notaFiscal || '')
          .split(/[^\d]+/)
          .map(nfNormalizada)
          .filter(Boolean)
          .forEach((nf, i) => (fat[nf] = (fat[nf] || 0) + (i === 0 ? valor : 0)));
      });
      setDados(await getCruzamentoMes(mes, base || undefined, fat));
      setChave(`${mes}|${base}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível cruzar com o faturamento.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900 normal-case tracking-normal">Faturamento do mês</h3>
            <p className="text-[11px] text-slate-500">Cruza as baixas com o Controle Financeiro pelo número da NF (Valor a Cobrar de cada CT-e).</p>
          </div>
        </div>
        <button type="button" onClick={cruzar} disabled={carregando} className="px-3 py-2 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
          {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} {atual ? 'Atualizar' : 'Cruzar com o faturamento'}
        </button>
      </div>
      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {dados && atual && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-bold text-slate-500">Frete das notas baixadas</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(dados.valorTotal)}</p>
              <p className="text-[11px] text-slate-500">{dados.notasComValor.toLocaleString('pt-BR')} nota(s) com CT-e lançado</p>
            </div>
            <div className={`rounded-xl border p-3 ${dados.semCteTotal ? 'border-rose-200' : 'border-slate-200'}`}>
              <p className="text-[11px] font-bold text-slate-500">Entregues sem CT-e lançado</p>
              <p className={`text-2xl font-black ${dados.semCteTotal ? 'text-rose-700' : 'text-slate-900'}`}>{dados.semCteTotal.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-slate-500">risco de não cobrar</p>
            </div>
            <div className={`rounded-xl border p-3 ${dados.semBaixaTotal ? 'border-amber-200' : 'border-slate-200'}`}>
              <p className="text-[11px] font-bold text-slate-500">CT-es sem baixa importada</p>
              <p className={`text-2xl font-black ${dados.semBaixaTotal ? 'text-[#92611F]' : 'text-slate-900'}`}>{dados.semBaixaTotal.toLocaleString('pt-BR')}</p>
              <p className="text-[11px] text-slate-500">faturados sem comprovação da entrega</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-black text-slate-800 mb-1.5">Por motorista</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {dados.motoristas.map((m) => (
                  <div key={m.motorista} className="flex items-center justify-between px-3 py-2 text-xs border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-800 truncate">{nomeBonito(m.motorista)}</span>
                    <span className="text-right shrink-0">
                      <b className="text-[#92611F]">{formatCurrency(m.valor)}</b>
                      <span className="block text-[10px] text-slate-400">
                        {m.notasComValor}/{m.notas} notas com CT-e
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 mb-1.5">Por responsável</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {dados.responsaveis.map((r) => (
                  <div key={r.responsavel} className="flex items-center justify-between px-3 py-2 text-xs border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-800">{r.responsavel.toUpperCase()}</span>
                    <span className="text-right">
                      <b className="text-[#92611F]">{formatCurrency(r.valor)}</b>
                      <span className="block text-[10px] text-slate-400">
                        {r.notasComValor}/{r.notas} notas com CT-e
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {dados.semCteTotal > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-rose-700 flex items-center gap-1">
                  <TriangleAlert className="w-4 h-4" /> Entregues sem CT-e lançado no faturamento ({dados.semCteTotal})
                </p>
                <button
                  type="button"
                  onClick={() => baixarExcel(`Entregues_sem_CTe_${mes}`, ['NF', 'Data da baixa', 'Motorista', 'Responsável', 'Destinatário', 'Cidade'], dados.semCte.map((n) => [n.numero, dataBr(n.data), n.motorista || '', n.responsavel, n.destinatario || '', n.cidade || '']))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> Excel
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl text-[11px]">
                {dados.semCte.slice(0, 100).map((n) => (
                  <p key={n.numero} className="px-3 py-1.5 border-b border-slate-100 last:border-0 flex justify-between gap-2">
                    <span>
                      <b>NF {n.numero}</b> · {nomeBonito(n.destinatario)} {n.cidade ? `(${n.cidade})` : ''}
                    </span>
                    <span className="text-slate-500 shrink-0">
                      {dataBr(n.data)} · {nomeBonito(n.motorista)}
                    </span>
                  </p>
                ))}
              </div>
              {dados.semCteTotal > dados.semCte.length && <p className="text-[10px] text-slate-400">Mostrando {dados.semCte.length} de {dados.semCteTotal}.</p>}
            </div>
          )}

          {dados.semBaixaTotal > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-[#92611F]">CT-es do período sem baixa importada ({dados.semBaixaTotal})</p>
                <button
                  type="button"
                  onClick={() => baixarExcel(`CTes_sem_baixa_${mes}`, ['NF'], dados.semBaixa.map((nf) => [nf]))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> Excel
                </button>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {dados.semBaixa.slice(0, 60).join(' · ')}
                {dados.semBaixaTotal > 60 ? ' …' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
