import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import type { Colaborador } from '../../types';
import { ResponsavelBaixas, getResponsaveisBaixas, salvarResponsaveisBaixas } from '../../utils/baixasApi';

const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());

/** Quem importa as baixas pelo link pessoal (área "Baixas do dia" no portal). */
export const ResponsaveisBaixasModal: React.FC<{ colaboradores: Colaborador[]; bases: string[]; onClose: () => void }> = ({ colaboradores, bases, onClose }) => {
  const [lista, setLista] = useState<ResponsavelBaixas[] | null>(null);
  const [novo, setNovo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ativos = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)), [colaboradores]);

  useEffect(() => {
    getResponsaveisBaixas()
      .then(setLista)
      .catch(() => {
        setErro('Não foi possível carregar. Rode a migração 100 no Supabase, se ainda não rodou.');
        setLista([]);
      });
  }, []);

  const adicionar = () => {
    const c = ativos.find((x) => x.id === novo);
    if (!c || !lista || lista.some((l) => l.colaboradorId === c.id)) return;
    setLista([...lista, { colaboradorId: c.id, nome: c.nomeCompleto.split(' ')[0].toUpperCase(), base: 'Matriz' }]);
    setNovo('');
  };
  const mudar = (id: string, p: Partial<ResponsavelBaixas>) => setLista((l) => (l || []).map((x) => (x.colaboradorId === id ? { ...x, ...p } : x)));

  const salvar = async () => {
    if (!lista) return;
    if (lista.some((l) => !l.nome.trim())) return setErro('Preencha o nome de cada responsável.');
    setSalvando(true);
    setErro(null);
    try {
      await salvarResponsaveisBaixas(lista);
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case">Responsáveis pelas baixas (link pessoal)</h2>
            <p className="text-slate-500">Quem estiver aqui vê "Baixas do dia" no link pessoal: importa a planilha do dia e acompanha só as próprias importações.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          {lista === null ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229] mx-auto" />
          ) : (
            <>
              <div className="flex gap-2">
                <select value={novo} onChange={(e) => setNovo(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg bg-white">
                  <option value="">Escolha o colaborador...</option>
                  {ativos
                    .filter((c) => !lista.some((l) => l.colaboradorId === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {nomeBonito(c.nomeCompleto)}
                        {c.setor ? ` — ${nomeBonito(c.setor)}` : ''}
                      </option>
                    ))}
                </select>
                <button type="button" onClick={adicionar} disabled={!novo} className="px-3 py-2 rounded-lg bg-[#C48229] text-white font-bold flex items-center gap-1 disabled:opacity-50">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
              {lista.length === 0 && <p className="text-slate-400 text-center py-4">Ninguém ainda. Adicione os colaboradores do escritório que cuidam das baixas.</p>}
              {lista.map((l) => {
                const c = colaboradores.find((x) => x.id === l.colaboradorId);
                return (
                  <div key={l.colaboradorId} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-slate-800">{nomeBonito(c?.nomeCompleto) || 'Colaborador'}</p>
                      <button type="button" onClick={() => setLista(lista.filter((x) => x.colaboradorId !== l.colaboradorId))} className="p-1 text-slate-400 hover:text-rose-600" title="Tirar o acesso">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="font-bold text-slate-600">Nome nos relatórios</span>
                        <input value={l.nome} onChange={(e) => mudar(l.colaboradorId, { nome: e.target.value })} className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white uppercase" />
                      </label>
                      <label className="block">
                        <span className="font-bold text-slate-600">Base</span>
                        <input value={l.base} onChange={(e) => mudar(l.colaboradorId, { base: e.target.value })} list="resp-baixas-bases" className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white" />
                      </label>
                    </div>
                  </div>
                );
              })}
              <datalist id="resp-baixas-bases">
                {bases.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <p className="text-[11px] text-slate-500">
                Use no "Nome nos relatórios" o mesmo nome das importações antigas (ex.: KELY), para o histórico e o ranking continuarem juntos.
              </p>
            </>
          )}
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
            Cancelar
          </button>
          <button type="button" onClick={salvar} disabled={salvando || !lista} className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
