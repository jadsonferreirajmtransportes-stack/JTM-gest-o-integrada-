import React, { useMemo, useState } from 'react';
import { X, Save, Calculator, RotateCcw } from 'lucide-react';
import { Cliente, LancamentoFaturamentoAereo } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { TIPOS_CUSTO_EXTRA, explicarValorACobrar } from './faturamentoAereoUtils';

type Campo =
  | { k: keyof LancamentoFaturamentoAereo; rotulo: string; tipo: 'texto' | 'numero' | 'data' | 'dinheiro'; largo?: boolean }
  | { k: keyof LancamentoFaturamentoAereo; rotulo: string; tipo: 'sim_nao' }
  | { k: keyof LancamentoFaturamentoAereo; rotulo: string; tipo: 'opcoes'; opcoes: string[] };

const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: 'Documento',
    campos: [
      { k: 'notaFiscal', rotulo: 'Nota fiscal', tipo: 'texto' },
      { k: 'valorNF', rotulo: 'Valor da NF', tipo: 'dinheiro' },
      { k: 'numeroCte', rotulo: 'Nº do CT-e', tipo: 'texto' },
      { k: 'ctrc', rotulo: 'CTRC', tipo: 'texto' },
      { k: 'dataEmissao', rotulo: 'Data de emissão', tipo: 'data' },
      { k: 'dataConclusao', rotulo: 'Data de conclusão', tipo: 'data' },
      { k: 'modal', rotulo: 'Modal', tipo: 'opcoes', opcoes: ['Aéreo', 'Rodoviário'] },
    ],
  },
  {
    titulo: 'Remetente',
    campos: [
      { k: 'remetenteLab', rotulo: 'Remetente / laboratório', tipo: 'texto', largo: true },
      { k: 'cnpjRemetente', rotulo: 'CNPJ do remetente', tipo: 'texto' },
      { k: 'cidadeRemetente', rotulo: 'Cidade', tipo: 'texto' },
      { k: 'estadoRemetente', rotulo: 'UF', tipo: 'texto' },
    ],
  },
  {
    titulo: 'Destinatário',
    campos: [
      { k: 'destinatario', rotulo: 'Destinatário', tipo: 'texto', largo: true },
      { k: 'cnpjDestinatario', rotulo: 'CNPJ do destinatário', tipo: 'texto' },
      { k: 'cidadeDestino', rotulo: 'Cidade', tipo: 'texto' },
      { k: 'bairroDestino', rotulo: 'Bairro', tipo: 'texto' },
      { k: 'estadoDestino', rotulo: 'UF', tipo: 'texto' },
    ],
  },
  {
    titulo: 'Carga',
    campos: [
      { k: 'pesoKg', rotulo: 'Peso (kg)', tipo: 'numero' },
      { k: 'pesoTaxado', rotulo: 'Peso taxado (kg)', tipo: 'numero' },
      { k: 'volumes', rotulo: 'Volumes', tipo: 'numero' },
    ],
  },
  {
    titulo: 'Cobrança',
    campos: [
      { k: 'valorPrestacao', rotulo: 'Valor da prestação (CT-e)', tipo: 'dinheiro' },
      { k: 'tipoCustoExtra', rotulo: 'Tipo de custo extra', tipo: 'opcoes', opcoes: ['', ...TIPOS_CUSTO_EXTRA] },
      { k: 'custoExtra', rotulo: 'Custo extra', tipo: 'dinheiro' },
      { k: 'custoDescarga', rotulo: 'Custo de descarga', tipo: 'dinheiro' },
      { k: 'valorRecebido', rotulo: 'Valor recebido', tipo: 'dinheiro' },
      { k: 'confirmacaoPagamento', rotulo: 'Pagamento confirmado', tipo: 'sim_nao' },
      { k: 'nfEmitida', rotulo: 'NF emitida', tipo: 'sim_nao' },
    ],
  },
];

/** Todos os campos de um lançamento (CT-e) para conferir e editar — inclusive os que não cabem
 *  na linha da tabela. Salva tudo de uma vez; o Valor a Cobrar é recalculado ao vivo. */
export const DetalheLancamentoModal: React.FC<{
  lancamento: LancamentoFaturamentoAereo;
  cliente?: Cliente;
  onClose: () => void;
  onSalvar: (patch: Partial<LancamentoFaturamentoAereo>) => void;
}> = ({ lancamento, cliente, onClose, onSalvar }) => {
  const [rascunho, setRascunho] = useState<LancamentoFaturamentoAereo>(lancamento);
  const { linhas, total } = useMemo(() => explicarValorACobrar(rascunho, cliente), [rascunho, cliente]);
  const set = (k: keyof LancamentoFaturamentoAereo, v: any) => setRascunho((r) => ({ ...r, [k]: v }));
  const mudou = JSON.stringify(rascunho) !== JSON.stringify(lancamento);

  const fechar = () => {
    if (mudou && !window.confirm('Descartar as alterações deste CT-e?')) return;
    onClose();
  };

  const salvar = () => {
    const patch: Partial<LancamentoFaturamentoAereo> = {};
    (Object.keys(rascunho) as (keyof LancamentoFaturamentoAereo)[]).forEach((k) => {
      if (rascunho[k] !== lancamento[k]) (patch as any)[k] = rascunho[k];
    });
    if ('valorACobrarManual' in rascunho && rascunho.valorACobrarManual === undefined && lancamento.valorACobrarManual !== undefined) patch.valorACobrarManual = undefined;
    onSalvar(patch);
    onClose();
  };

  const input = 'w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500/30 outline-none';

  const renderCampo = (c: Campo) => {
    const v = rascunho[c.k] as any;
    if (c.tipo === 'sim_nao')
      return (
        <label className="flex items-center gap-2 h-[34px] font-semibold text-slate-700">
          <input type="checkbox" checked={!!v} onChange={(e) => set(c.k, e.target.checked)} /> Sim
        </label>
      );
    if (c.tipo === 'opcoes')
      return (
        <select value={v || ''} onChange={(e) => set(c.k, e.target.value || undefined)} className={input}>
          {c.opcoes.map((o) => (
            <option key={o} value={o}>
              {o || 'Padrão (tarifa)'}
            </option>
          ))}
        </select>
      );
    if (c.tipo === 'numero' || c.tipo === 'dinheiro')
      return (
        <input
          type="number"
          step={c.tipo === 'dinheiro' ? '0.01' : '0.001'}
          value={v ?? ''}
          onChange={(e) => set(c.k, e.target.value === '' ? undefined : parseFloat(e.target.value))}
          className={`${input} text-right`}
        />
      );
    return <input type={c.tipo === 'data' ? 'date' : 'text'} value={v || ''} onChange={(e) => set(c.k, e.target.value || undefined)} className={input} />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3" data-texto-livre="true" onClick={fechar}>
      <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-4xl max-h-[94vh] flex flex-col text-xs" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 bg-white rounded-t-2xl border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">{lancamento.clienteNome}</p>
            <h2 className="text-sm font-black text-slate-900">
              NF {lancamento.notaFiscal || '—'} {lancamento.numeroCte ? `· CT-e ${lancamento.numeroCte}` : ''}
            </h2>
          </div>
          <button type="button" onClick={fechar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {GRUPOS.map((g) => (
            <section key={g.titulo} className="bg-white rounded-xl border border-slate-200 p-3">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-2">{g.titulo}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2">
                {g.campos.map((c) => (
                  <label key={c.k} className={`flex flex-col gap-1 ${'largo' in c && c.largo ? 'col-span-2' : ''}`}>
                    <span className="text-[11px] font-semibold text-slate-600">{c.rotulo}</span>
                    {renderCampo(c)}
                  </label>
                ))}
              </div>
            </section>
          ))}

          <section className="bg-white rounded-xl border border-emerald-200 p-3 space-y-2">
            <h3 className="text-[11px] font-black text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Valor a cobrar
            </h3>
            <ul className="space-y-0.5 text-slate-600">
              {linhas.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{l.label}</span>
                  <span className="tabular-nums">{formatCurrency(l.valor)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-sm font-black text-slate-900">Total: {formatCurrency(total)}</span>
              {rascunho.valorACobrarManual !== undefined ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">Valor manual</span>
                  <input
                    type="number"
                    step="0.01"
                    value={rascunho.valorACobrarManual}
                    onChange={(e) => set('valorACobrarManual', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className={`${input} w-28 text-right`}
                  />
                  <button type="button" onClick={() => set('valorACobrarManual', undefined)} className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Voltar ao cálculo
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => set('valorACobrarManual', total)} className="text-[11px] font-bold text-slate-500 hover:text-slate-800">
                  Digitar um valor manual
                </button>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Observação</span>
              <textarea value={rascunho.observacao || ''} onChange={(e) => set('observacao', e.target.value || undefined)} rows={2} className={input} />
            </label>
          </section>
        </div>

        <div className="p-4 bg-white rounded-b-2xl border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={fechar} className="px-3 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50">
            Cancelar
          </button>
          <button type="button" onClick={salvar} disabled={!mudou} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
};
