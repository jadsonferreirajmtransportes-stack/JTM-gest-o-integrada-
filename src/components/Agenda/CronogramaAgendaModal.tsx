import React, { useMemo, useState } from 'react';
import { X, CalendarRange, FileText, Sheet, Loader2 } from 'lucide-react';
import type { AtividadeGestao, CategoriaAtividadeGestao, StatusAtividadeGestao } from '../../types';
import { baixarBlob } from '../../utils/downloadUtils';
import { CATEGORIA_CONFIG } from './agendaUtils';
import { atividadesDoPeriodo, gerarCronogramaPdf, gerarCronogramaXlsx } from './cronogramaAgenda';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function periodo(tipo: 'semana' | 'mes' | 'proximoMes' | 'trimestre'): [string, string] {
  const hoje = new Date();
  if (tipo === 'semana') {
    const ini = new Date(hoje);
    ini.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7)); // segunda
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 6);
    return [iso(ini), iso(fim)];
  }
  if (tipo === 'mes') return [iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0))];
  if (tipo === 'proximoMes') return [iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)), iso(new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0))];
  return [iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), iso(new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0))];
}

/** Gera o cronograma da Agenda da Gestão em PDF ou Excel para um período, com filtros. */
export const CronogramaAgendaModal: React.FC<{ atividades: AtividadeGestao[]; onClose: () => void }> = ({ atividades, onClose }) => {
  const [[inicio, fim], setPeriodo] = useState<[string, string]>(periodo('mes'));
  const [titulo, setTitulo] = useState('');
  const [categorias, setCategorias] = useState<Set<CategoriaAtividadeGestao>>(new Set());
  const [responsavel, setResponsavel] = useState('');
  const [semCanceladas, setSemCanceladas] = useState(true);
  const [gerando, setGerando] = useState<'pdf' | 'xlsx' | null>(null);

  const responsaveis = useMemo(() => Array.from(new Set(atividades.map((a) => a.responsavel).filter(Boolean))).sort(), [atividades]);
  const filtradas = useMemo(
    () =>
      atividades.filter(
        (a) =>
          (!categorias.size || categorias.has(a.categoria)) &&
          (!responsavel || a.responsavel === responsavel || (a.participantes || []).includes(responsavel)) &&
          (!semCanceladas || a.status !== ('Cancelada' as StatusAtividadeGestao))
      ),
    [atividades, categorias, responsavel, semCanceladas]
  );
  const noPeriodo = inicio && fim && inicio <= fim ? atividadesDoPeriodo(filtradas, { inicio, fim }).length : 0;

  const gerar = async (formato: 'pdf' | 'xlsx') => {
    if (!inicio || !fim || inicio > fim) return;
    setGerando(formato);
    try {
      const opcoes = { inicio, fim, titulo };
      const arquivo = formato === 'pdf' ? gerarCronogramaPdf(filtradas, opcoes) : await gerarCronogramaXlsx(filtradas, opcoes);
      baixarBlob(arquivo, arquivo.name);
    } catch (e) {
      console.error(e);
      alert('Não foi possível gerar o cronograma.');
    } finally {
      setGerando(null);
    }
  };

  const campo = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800';
  const presets: [Parameters<typeof periodo>[0], string][] = [
    ['semana', 'Esta semana'],
    ['mes', 'Este mês'],
    ['proximoMes', 'Próximo mês'],
    ['trimestre', 'Próximos 3 meses'],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#C48229]" /> Gerar cronograma
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          <div>
            <p className="font-semibold text-slate-600 mb-1.5">Período</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presets.map(([k, r]) => (
                <button key={k} type="button" onClick={() => setPeriodo(periodo(k))} className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-amber-50 hover:border-amber-300 normal-case tracking-normal">
                  {r}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={inicio} onChange={(e) => setPeriodo([e.target.value, fim])} className={campo} />
              <input type="date" value={fim} onChange={(e) => setPeriodo([inicio, e.target.value])} className={campo} />
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-600 mb-1.5">Título (opcional)</p>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Cronograma de auditorias — novembro" className={campo} />
          </div>
          <div>
            <p className="font-semibold text-slate-600 mb-1.5">Categorias {categorias.size ? '' : '(todas)'}</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CATEGORIA_CONFIG) as CategoriaAtividadeGestao[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setCategorias((prev) => {
                      const n = new Set(prev);
                      if (n.has(c)) n.delete(c);
                      else n.add(c);
                      return n;
                    })
                  }
                  className={`px-2 py-1 rounded-lg border font-semibold normal-case tracking-normal ${categorias.has(c) ? `${CATEGORIA_CONFIG[c].bg} ${CATEGORIA_CONFIG[c].text} ${CATEGORIA_CONFIG[c].border}` : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {CATEGORIA_CONFIG[c].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <p className="font-semibold text-slate-600 mb-1.5">Responsável / participante</p>
              <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={campo}>
                <option value="">Todos</option>
                {responsaveis.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 font-semibold text-slate-600 cursor-pointer pb-2">
              <input type="checkbox" checked={semCanceladas} onChange={(e) => setSemCanceladas(e.target.checked)} /> Sem as canceladas
            </label>
          </div>
          <p className={`font-semibold ${noPeriodo ? 'text-emerald-700' : 'text-amber-700'}`}>
            {inicio > fim ? 'A data final está antes da inicial.' : `${noPeriodo} atividade(s) no período com esses filtros.`}
          </p>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          {(
            [
              ['pdf', 'Baixar PDF', <FileText key="p" className="w-4 h-4" />],
              ['xlsx', 'Baixar Excel', <Sheet key="x" className="w-4 h-4" />],
            ] as const
          ).map(([f, r, icone]) => (
            <button
              key={f}
              type="button"
              onClick={() => gerar(f)}
              disabled={!!gerando || !noPeriodo}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {gerando === f ? <Loader2 className="w-4 h-4 animate-spin" /> : icone} {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
