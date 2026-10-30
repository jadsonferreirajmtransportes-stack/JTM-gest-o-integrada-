import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2, Landmark } from 'lucide-react';
import { AliquotaTributo, excluirAliquota, salvarAliquota } from '../../utils/tributosApi';

const vazia = (): AliquotaTributo => ({ id: '', inicio: '', cbs: 0, ibs: 0 });
const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

/** Cadastro das alíquotas de CBS/IBS por período (reforma tributária). O Controle Financeiro usa a
 *  alíquota do período da data de emissão de cada CT-e. */
export const AliquotasTributosModal: React.FC<{
  aliquotas: AliquotaTributo[];
  criadoPor?: string;
  onClose: () => void;
  onMudou: (lista: AliquotaTributo[]) => void;
}> = ({ aliquotas, criadoPor, onClose, onMudou }) => {
  const [editando, setEditando] = useState<AliquotaTributo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campo = 'w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs';

  const salvar = async () => {
    if (!editando?.inicio) return setErro('Informe a data de início.');
    if (editando.fim && editando.fim < editando.inicio) return setErro('A data final está antes da inicial.');
    setSalvando(true);
    setErro(null);
    try {
      const salvo = await salvarAliquota(editando, criadoPor);
      onMudou([...aliquotas.filter((a) => a.id !== salvo.id), salvo].sort((a, b) => a.inicio.localeCompare(b.inicio)));
      setEditando(null);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível salvar. Confira se a migração 085 foi rodada no Supabase.');
    } finally {
      setSalvando(false);
    }
  };
  const excluir = async (a: AliquotaTributo) => {
    if (!window.confirm(`Excluir a alíquota que começa em ${dataBr(a.inicio)}?`)) return;
    try {
      await excluirAliquota(a.id);
      onMudou(aliquotas.filter((x) => x.id !== a.id));
    } catch (e) {
      console.error(e);
      setErro('Não foi possível excluir.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#C48229]" /> Alíquotas CBS / IBS (reforma tributária)
            </h2>
            <p className="text-slate-500 mt-0.5">
              Cada CT-e usa a alíquota do período em que foi emitido. O imposto é calculado <b>dentro</b> do Valor a Cobrar (o cliente paga o mesmo valor; o
              sistema mostra quanto é CBS/IBS e o líquido da JMT). Confirme as alíquotas com o contador.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-3">
          {erro && <p className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</p>}
          {aliquotas.length === 0 && !editando && <p className="text-slate-500">Nenhuma alíquota cadastrada — sem elas o Controle Financeiro não calcula imposto.</p>}
          {aliquotas.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl">
              <div className="flex-1">
                <p className="font-bold text-slate-800">
                  {dataBr(a.inicio)} {a.fim ? `a ${dataBr(a.fim)}` : 'em diante'}
                </p>
                <p className="text-slate-500">
                  CBS {a.cbs.toLocaleString('pt-BR')}% · IBS {a.ibs.toLocaleString('pt-BR')}% · total {(a.cbs + a.ibs).toLocaleString('pt-BR')}%
                  {a.observacao ? ` — ${a.observacao}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setEditando(a)} className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold normal-case tracking-normal">
                Editar
              </button>
              <button type="button" onClick={() => excluir(a)} className="p-1.5 text-slate-400 hover:text-rose-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {editando ? (
            <div className="p-3 border border-amber-200 bg-amber-50/40 rounded-xl space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="font-semibold text-slate-600">Vale a partir de</span>
                  <input type="date" value={editando.inicio} onChange={(e) => setEditando({ ...editando, inicio: e.target.value })} className={campo} />
                </label>
                <label>
                  <span className="font-semibold text-slate-600">Até (opcional)</span>
                  <input type="date" value={editando.fim || ''} onChange={(e) => setEditando({ ...editando, fim: e.target.value || undefined })} className={campo} />
                </label>
                <label>
                  <span className="font-semibold text-slate-600">CBS (%)</span>
                  <input type="number" step="0.001" value={editando.cbs} onChange={(e) => setEditando({ ...editando, cbs: Number(e.target.value) })} className={campo} />
                </label>
                <label>
                  <span className="font-semibold text-slate-600">IBS (%)</span>
                  <input type="number" step="0.001" value={editando.ibs} onChange={(e) => setEditando({ ...editando, ibs: Number(e.target.value) })} className={campo} />
                </label>
              </div>
              <input value={editando.observacao || ''} onChange={(e) => setEditando({ ...editando, observacao: e.target.value || undefined })} placeholder="Observação (ex.: ano de teste — compensável com PIS/Cofins)" className={campo} />
              <div className="flex flex-wrap gap-2 justify-between items-center">
                {!editando.id && (
                  <button
                    type="button"
                    onClick={() => setEditando({ ...editando, inicio: '2026-01-01', fim: '2026-12-31', cbs: 0.9, ibs: 0.1, observacao: 'Ano de teste da reforma (LC 214/2025) — destaque no CT-e, compensável com PIS/Cofins' })}
                    className="text-[11px] font-semibold text-[#92611F] hover:underline normal-case tracking-normal"
                  >
                    Preencher 2026 (teste): CBS 0,9% + IBS 0,1%
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={() => setEditando(null)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-semibold">
                    Cancelar
                  </button>
                  <button type="button" onClick={salvar} disabled={salvando} className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50">
                    {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setEditando(vazia())} className="px-3 py-2 border border-[#C48229] text-[#92611F] rounded-lg font-bold flex items-center gap-1.5 hover:bg-amber-50">
              <Plus className="w-3.5 h-3.5" /> Nova alíquota
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
