import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Search, X } from 'lucide-react';
import type { Colaborador } from '../../types';
import { getSolicitantesCompras, salvarSolicitantesCompras } from '../../utils/comprasApi';

/** Quem pode pedir compras pelo link pessoal (área "Compras" no portal). */
export const SolicitantesComprasModal: React.FC<{ colaboradores: Colaborador[]; onClose: () => void }> = ({ colaboradores, onClose }) => {
  const [marcados, setMarcados] = useState<Set<string> | null>(null);
  const [busca, setBusca] = useState('');
  const [soMarcados, setSoMarcados] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ativos = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)), [colaboradores]);

  useEffect(() => {
    getSolicitantesCompras()
      .then((ids) => setMarcados(new Set(ids)))
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar.');
        setMarcados(new Set());
      });
  }, []);

  const termo = busca.trim().toLowerCase();
  const lista = ativos.filter(
    (c) => (!soMarcados || marcados?.has(c.id)) && (!termo || [c.nomeCompleto, c.funcaoCargo, c.setor].some((x) => (x || '').toLowerCase().includes(termo)))
  );
  const alternar = (id: string) =>
    setMarcados((m) => {
      const n = new Set(m || []);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const salvar = async () => {
    if (!marcados) return;
    setSalvando(true);
    setErro(null);
    try {
      await salvarSolicitantesCompras([...marcados]);
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case">Quem pode pedir compras (link pessoal)</h2>
            <p className="text-slate-500">Os marcados veem "Compras" no link pessoal: fazem o pedido e acompanham a situação dos próprios pedidos. Os pedidos chegam aqui, como os demais.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 pb-2 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, cargo ou setor" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg" />
          </div>
          <label className="flex items-center gap-1.5 font-semibold text-slate-600 cursor-pointer">
            <input type="checkbox" checked={soMarcados} onChange={(e) => setSoMarcados(e.target.checked)} /> Só os marcados ({marcados?.size ?? 0})
          </label>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {marcados === null ? (
            <p className="flex items-center gap-2 text-slate-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" /> Carregando...
            </p>
          ) : lista.length === 0 ? (
            <p className="text-slate-500 py-6">Ninguém encontrado.</p>
          ) : (
            lista.map((c) => (
              <label key={c.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer ${marcados.has(c.id) ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                <input type="checkbox" checked={marcados.has(c.id)} onChange={() => alternar(c.id)} className="accent-[#C48229]" />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 block truncate">{c.nomeCompleto}</span>
                  <span className="text-[10px] text-slate-400">{[c.funcaoCargo, c.setor].filter(Boolean).join(' · ')}</span>
                </span>
              </label>
            ))
          )}
        </div>
        <div className="p-4 border-t border-slate-200 space-y-2">
          {erro && <p className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</p>}
          <button type="button" onClick={salvar} disabled={salvando || marcados === null} className="w-full py-2.5 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar ({marcados?.size ?? 0} com acesso)
          </button>
        </div>
      </div>
    </div>
  );
};
