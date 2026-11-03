import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Search, X } from 'lucide-react';
import type { Colaborador } from '../../types';
import { AcessoRelato, getAcessoRelato, salvarAcessoRelato } from '../../utils/qualidadeApi';

const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());

/** Quem pode usar "Relatar ocorrência" no portal: todos os colaboradores ou só os escolhidos. */
export const AcessoRelatoModal: React.FC<{ colaboradores: Colaborador[]; usuario?: string; onClose: () => void }> = ({ colaboradores, usuario, onClose }) => {
  const [acesso, setAcesso] = useState<AcessoRelato | null>(null);
  const [busca, setBusca] = useState('');
  const [setor, setSetor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getAcessoRelato()
      .then(setAcesso)
      .catch((e) => {
        console.error(e);
        setErro('Não foi possível carregar. Rode a migração 096 no Supabase, se ainda não rodou.');
        setAcesso({ modo: 'todos', colaboradores: [] });
      });
  }, []);

  const ativos = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)), [colaboradores]);
  const setores = useMemo(() => Array.from(new Set(ativos.map((c) => c.setor).filter(Boolean) as string[])).sort(), [ativos]);
  const visiveis = ativos.filter(
    (c) => (!setor || c.setor === setor) && (!busca.trim() || `${c.nomeCompleto} ${c.funcaoCargo || ''} ${c.setor || ''}`.toLowerCase().includes(busca.trim().toLowerCase()))
  );
  const escolhidos = new Set(acesso?.colaboradores || []);
  const marcar = (ids: string[], sim: boolean) =>
    setAcesso((a) => {
      if (!a) return a;
      const s = new Set(a.colaboradores);
      ids.forEach((id) => (sim ? s.add(id) : s.delete(id)));
      return { ...a, colaboradores: Array.from(s) };
    });

  const salvar = async () => {
    if (!acesso) return;
    if (acesso.modo === 'escolhidos' && acesso.colaboradores.length === 0 && !window.confirm('Nenhum colaborador marcado: ninguém vai poder relatar ocorrência pelo portal. Salvar assim mesmo?')) return;
    setSalvando(true);
    setErro(null);
    try {
      // Só guarda quem ainda está ativo.
      const ids = acesso.colaboradores.filter((id) => ativos.some((c) => c.id === id));
      await salvarAcessoRelato({ ...acesso, colaboradores: ids }, usuario);
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2 sm:p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[95vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case">Quem pode relatar ocorrência</h2>
            <p className="text-slate-500">Área "Relatar ocorrência" no link pessoal do colaborador.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        {!acesso ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" />
          </div>
        ) : (
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['todos', 'Todos os colaboradores', 'Qualquer colaborador ativo vê a área no portal'],
                  ['escolhidos', 'Só os escolhidos', 'Apenas quem você marcar abaixo'],
                ] as const
              ).map(([m, t, d]) => (
                <button key={m} type="button" onClick={() => setAcesso((a) => a && { ...a, modo: m })} className={`text-left p-3 rounded-xl border normal-case tracking-normal ${acesso.modo === m ? 'border-[#C48229] bg-amber-50' : 'border-slate-200'}`}>
                  <span className="block text-xs font-black text-slate-900">{t}</span>
                  <span className="block text-[11px] text-slate-500">{d}</span>
                </button>
              ))}
            </div>
            {acesso.modo === 'escolhidos' && (
              <>
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, cargo ou setor..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg w-full" />
                  </div>
                  <select value={setor} onChange={(e) => setSetor(e.target.value)} className="py-2 px-2 border border-slate-200 rounded-lg bg-white">
                    <option value="">Todos os setores</option>
                    {setores.map((s) => (
                      <option key={s} value={s}>
                        {nomeBonito(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-600">
                    {acesso.colaboradores.filter((id) => ativos.some((c) => c.id === id)).length} marcado(s)
                  </span>
                  <span className="flex gap-3">
                    <button type="button" onClick={() => marcar(visiveis.map((c) => c.id), true)} className="font-bold text-[#92611F]">
                      Marcar {busca || setor ? 'os da lista' : 'todos'}
                    </button>
                    <button type="button" onClick={() => marcar(visiveis.map((c) => c.id), false)} className="font-bold text-slate-500">
                      Desmarcar {busca || setor ? 'os da lista' : 'todos'}
                    </button>
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[45vh] overflow-y-auto">
                  {visiveis.map((c) => (
                    <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-amber-50/50">
                      <input type="checkbox" checked={escolhidos.has(c.id)} onChange={(e) => marcar([c.id], e.target.checked)} className="w-4 h-4 accent-[#C48229]" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-slate-800 truncate">{nomeBonito(c.nomeCompleto)}</span>
                        <span className="block text-[10px] text-slate-500 truncate">{[nomeBonito(c.funcaoCargo), nomeBonito(c.setor)].filter(Boolean).join(' · ')}</span>
                      </span>
                    </label>
                  ))}
                  {visiveis.length === 0 && <p className="p-4 text-center text-slate-400">Ninguém encontrado.</p>}
                </div>
              </>
            )}
          </div>
        )}
        <div className="p-4 border-t border-slate-200 flex items-center gap-2">
          {erro && <p className="text-rose-700 font-semibold flex-1">{erro}</p>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
              Cancelar
            </button>
            <button type="button" onClick={salvar} disabled={salvando || !acesso} className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
