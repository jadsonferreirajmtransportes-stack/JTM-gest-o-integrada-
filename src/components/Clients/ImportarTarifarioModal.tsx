import React, { useState } from 'react';
import { AlertTriangle, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { TabelaPrecoFrete } from '../../types';
import { AbaTarifario, lerTarifarioExcel } from './importarTarifarioExcel';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 3 });

/** Importa a tabela por cidade (e, se quiser, custos extras, observações e tarifa padrão) de
 *  um tarifário em Excel. Só muda o formulário: o cadastro é gravado no "Salvar" do cliente. */
export const ImportarTarifarioModal: React.FC<{
  titulo: string;
  value: TabelaPrecoFrete;
  onAplicar: (nova: TabelaPrecoFrete) => void;
  onClose: () => void;
}> = ({ titulo, value, onAplicar, onClose }) => {
  const [abas, setAbas] = useState<AbaTarifario[] | null>(null);
  const [escolhida, setEscolhida] = useState(0);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [trocarExtras, setTrocarExtras] = useState(true);
  const [trocarObs, setTrocarObs] = useState(true);
  const [trocarPadrao, setTrocarPadrao] = useState(true);

  const ler = async (arquivo?: File) => {
    if (!arquivo) return;
    setLendo(true);
    setErro(null);
    try {
      const lidas = lerTarifarioExcel(await arquivo.arrayBuffer());
      if (!lidas.length) throw new Error('Não encontrei nenhuma aba com as colunas CIDADE e ATÉ 10 KG nesta planilha.');
      setAbas(lidas);
      // Sugere a aba do modal deste editor (Rodoviário x Aéreo).
      const querRodo = /rodovi/i.test(titulo);
      const i = lidas.findIndex((a) => (querRodo ? /RODO/i.test(a.nome) : /AERE|AÉRE/i.test(a.nome)));
      setEscolhida(i >= 0 ? i : 0);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a planilha.');
    } finally {
      setLendo(false);
    }
  };

  const aba = abas?.[escolhida];

  const aplicar = () => {
    if (!aba) return;
    const capital = aba.faixas[0];
    onAplicar({
      ...value,
      modeloPrecificacao: 'tarifa_base',
      tarifasPorCidade: aba.tarifas,
      ...(trocarExtras && aba.custosExtras.length ? { custosExtras: aba.custosExtras } : {}),
      ...(trocarObs && aba.observacoes.length ? { observacoesTarifa: aba.observacoes.join('\n') } : {}),
      ...(trocarPadrao && capital ? { valorBase: capital.valorAte10Kg, valorKgExcedente: capital.valorKgExcedente } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Importar tarifário do Excel
            </h2>
            <p className="text-slate-500 mt-0.5">{titulo}. A tabela por cidade é substituída pela da planilha — confira e depois clique em Salvar no cadastro.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-[#C48229] hover:bg-amber-50/40 font-semibold text-slate-600">
            {lendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {abas ? 'Trocar planilha' : 'Escolher a planilha (.xlsx)'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => ler(e.target.files?.[0])} />
          </label>
          {erro && <p className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</p>}

          {abas && abas.length > 1 && (
            <div className="space-y-1">
              <p className="font-bold text-slate-700">Qual aba vai para esta tabela?</p>
              {abas.map((a, i) => (
                <label key={a.nome} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${i === escolhida ? 'border-[#C48229] bg-amber-50' : 'border-slate-200'}`}>
                  <input type="radio" checked={i === escolhida} onChange={() => setEscolhida(i)} className="accent-[#C48229]" />
                  <span className="flex-1 font-semibold text-slate-800">{a.nome}</span>
                  <span className="text-slate-500">{a.tarifas.length} cidades</span>
                </label>
              ))}
            </div>
          )}

          {aba && (
            <>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500">
                      <th className="text-left p-2">Faixa</th>
                      <th className="text-right p-2">Cidades</th>
                      <th className="text-right p-2">Até 10 kg</th>
                      <th className="text-right p-2">Kg exc.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aba.faixas.map((f) => (
                      <tr key={f.raio}>
                        <td className="p-2 text-slate-700">{f.raio}</td>
                        <td className="p-2 text-right">{f.cidades}</td>
                        <td className="p-2 text-right font-semibold">{brl(f.valorAte10Kg)}</td>
                        <td className="p-2 text-right font-semibold">{brl(f.valorKgExcedente)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-slate-500">
                Hoje a tabela tem {value.tarifasPorCidade?.length || 0} cidade(s); vai ficar com <b>{aba.tarifas.length}</b>.
              </p>

              {aba.conflitos.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[#7A4F17] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Cidade repetida na planilha com valores diferentes
                  </p>
                  {aba.conflitos.map((c) => (
                    <p key={c}>• {c}</p>
                  ))}
                </div>
              )}

              {aba.custosExtras.length > 0 && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={trocarExtras} onChange={(e) => setTrocarExtras(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
                  <span>
                    <b>Trocar os custos extras</b> pelos {aba.custosExtras.length} da planilha (hoje: {value.custosExtras?.length || 0}):{' '}
                    <span className="text-slate-500">{aba.custosExtras.map((c) => `${c.itemDescricao} ${brl(c.valor)}${c.tipoCobranca === 'Valor/KM' ? '/km' : ''}`).join(' · ')}</span>
                  </span>
                </label>
              )}
              {aba.observacoes.length > 0 && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={trocarObs} onChange={(e) => setTrocarObs(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
                  <span>
                    <b>Trocar as observações</b> pelas {aba.observacoes.length} da planilha (prazos, autorização de TDE, coletas...)
                  </span>
                </label>
              )}
              {aba.faixas[0] && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={trocarPadrao} onChange={(e) => setTrocarPadrao(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
                  <span>
                    <b>Tarifa padrão</b> (cidade que não está na tabela) = valores de {aba.faixas[0].raio.toLowerCase()}: {brl(aba.faixas[0].valorAte10Kg)} até 10 kg + {brl(aba.faixas[0].valorKgExcedente)}/kg
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
            Cancelar
          </button>
          <button type="button" onClick={aplicar} disabled={!aba} className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold disabled:opacity-50">
            Usar esta tabela
          </button>
        </div>
      </div>
    </div>
  );
};
