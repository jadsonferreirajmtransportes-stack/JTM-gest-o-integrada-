import React, { useMemo, useState } from 'react';
import { X, Upload, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import type { AtividadeGestao, CategoriaAtividadeGestao } from '../../types';
import { CATEGORIA_CONFIG } from './agendaUtils';
import { LinhaCronograma, chaveCompromisso, lerCronogramaExcel, paraAtividade } from './importarCronograma';

const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Importa um cronograma em Excel para a Agenda da Gestão: lê, mostra a prévia (com o que já
 *  existe desmarcado) e salva só os compromissos escolhidos. */
export const ImportarCronogramaModal: React.FC<{
  atividades: AtividadeGestao[];
  onImportar: (novas: AtividadeGestao[]) => Promise<void>;
  onClose: () => void;
}> = ({ atividades, onImportar, onClose }) => {
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [linhas, setLinhas] = useState<LinhaCronograma[]>([]);
  const [ignoradas, setIgnoradas] = useState<string[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [categorias, setCategorias] = useState<Record<number, CategoriaAtividadeGestao>>({});
  const [categoriaPadrao, setCategoriaPadrao] = useState<CategoriaAtividadeGestao>('Reunião & Governança');

  const existentes = useMemo(() => new Set(atividades.map((a) => chaveCompromisso(a.data, a.titulo))), [atividades]);
  const jaExiste = (l: LinhaCronograma) => existentes.has(chaveCompromisso(l.data, l.titulo));

  const ler = async (arquivo?: File) => {
    if (!arquivo) return;
    setLendo(true);
    setErro(null);
    setNomeArquivo(arquivo.name);
    try {
      const r = await lerCronogramaExcel(arquivo);
      if (!r.linhas.length) {
        setLinhas([]);
        setErro('Não achei compromissos nessa planilha. Ela precisa ter uma linha de cabeçalho com pelo menos uma coluna de Data e uma de Título/Atividade.');
        return;
      }
      const ordenadas = [...r.linhas].sort((a, b) => a.data.localeCompare(b.data) || (a.horaInicio || '').localeCompare(b.horaInicio || ''));
      setLinhas(ordenadas);
      setIgnoradas(r.ignoradas);
      setColunas(r.colunas);
      setCategorias({});
      // Já existe (mesma data e mesmo título) vem desmarcado.
      setMarcadas(new Set(ordenadas.map((l, i) => (jaExiste(l) ? -1 : i)).filter((i) => i >= 0)));
    } catch (e) {
      console.error(e);
      setErro('Não foi possível ler a planilha. Confira se é um arquivo Excel (.xlsx/.xls) ou .csv.');
    } finally {
      setLendo(false);
    }
  };

  const alternar = (i: number) =>
    setMarcadas((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const importar = async () => {
    const escolhidas = linhas
      .map((l, i) => ({ l, i }))
      .filter(({ i }) => marcadas.has(i))
      .map(({ l, i }) => paraAtividade({ ...l, categoria: categorias[i] || l.categoria }, categoriaPadrao, i));
    if (!escolhidas.length) return;
    setSalvando(true);
    setErro(null);
    try {
      await onImportar(escolhidas);
      onClose();
    } catch (e) {
      console.error(e);
      setErro('Não foi possível salvar todos os compromissos. Os que já foram salvos aparecem na agenda; tente de novo com o restante.');
    } finally {
      setSalvando(false);
    }
  };

  const nDuplicadas = linhas.filter(jaExiste).length;
  const semCategoria = linhas.some((l, i) => !l.categoria && !categorias[i]);
  const campo = 'bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px]';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#C48229]" /> Importar cronograma (Excel)
            </h2>
            <p className="text-slate-500 mt-0.5">
              Uma linha por compromisso, com pelo menos as colunas <b>Data</b> e <b>Título/Atividade</b>. Horário, responsável, participantes, local, categoria e
              observações entram quando existirem.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-amber-200 rounded-xl text-[#92611F] font-semibold cursor-pointer hover:bg-amber-50">
            {lendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {nomeArquivo ? `Trocar planilha (${nomeArquivo})` : 'Escolher a planilha do cronograma'}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => ler(e.target.files?.[0])} />
          </label>

          {erro && <p className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</p>}

          {linhas.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                <span>
                  <b>{linhas.length}</b> compromisso(s) lido(s) · colunas usadas: {colunas.join(', ')}
                </span>
                {nDuplicadas > 0 && <span className="text-amber-700 font-semibold">{nDuplicadas} já existe(m) na agenda (desmarcado)</span>}
              </div>
              {ignoradas.length > 0 && (
                <p className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {ignoradas.length} linha(s) sem data ou sem título não entram: {ignoradas.slice(0, 6).join('; ')}
                    {ignoradas.length > 6 ? '…' : ''}
                  </span>
                </p>
              )}
              {semCategoria && (
                <label className="flex items-center gap-2 text-slate-600">
                  <span className="font-semibold">Categoria para os que vieram sem categoria:</span>
                  <select value={categoriaPadrao} onChange={(e) => setCategoriaPadrao(e.target.value as CategoriaAtividadeGestao)} className={campo}>
                    {(Object.keys(CATEGORIA_CONFIG) as CategoriaAtividadeGestao[]).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIA_CONFIG[c].label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setMarcadas(new Set(linhas.map((_, i) => i)))} className="text-[11px] font-semibold text-[#92611F] hover:underline normal-case tracking-normal">
                  Marcar todos
                </button>
                <button type="button" onClick={() => setMarcadas(new Set())} className="text-[11px] font-semibold text-slate-500 hover:underline normal-case tracking-normal">
                  Desmarcar todos
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr className="text-left">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Data</th>
                      <th className="p-2">Horário</th>
                      <th className="p-2">Compromisso</th>
                      <th className="p-2">Responsável</th>
                      <th className="p-2">Categoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhas.map((l, i) => {
                      const marcado = marcadas.has(i);
                      const existe = jaExiste(l);
                      return (
                        <tr key={i} className={marcado ? '' : 'opacity-50'}>
                          <td className="p-2">
                            <input type="checkbox" checked={marcado} onChange={() => alternar(i)} className="w-4 h-4 accent-[#C48229]" />
                          </td>
                          <td className="p-2 whitespace-nowrap font-semibold text-slate-700 tabular-nums">
                            {dataBr(l.data)}
                            {l.dataFim ? ` a ${dataBr(l.dataFim)}` : ''}
                          </td>
                          <td className="p-2 whitespace-nowrap text-slate-600">{l.horaInicio ? `${l.horaInicio}${l.horaFim ? `–${l.horaFim}` : ''}` : 'Dia inteiro'}</td>
                          <td className="p-2">
                            <span className="font-semibold text-slate-800">{l.titulo}</span>
                            {existe && <span className="ml-1.5 text-[10px] font-bold text-amber-700">já na agenda</span>}
                            {l.local && <span className="block text-[10.5px] text-slate-500">{l.local}</span>}
                          </td>
                          <td className="p-2 text-slate-600">{[l.responsavel, ...l.participantes].filter(Boolean).join(', ') || '—'}</td>
                          <td className="p-2">
                            <select
                              value={categorias[i] || l.categoria || categoriaPadrao}
                              onChange={(e) => setCategorias((prev) => ({ ...prev, [i]: e.target.value as CategoriaAtividadeGestao }))}
                              className={campo}
                            >
                              {(Object.keys(CATEGORIA_CONFIG) as CategoriaAtividadeGestao[]).map((c) => (
                                <option key={c} value={c}>
                                  {CATEGORIA_CONFIG[c].label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-slate-500">{linhas.length ? `${marcadas.size} de ${linhas.length} selecionado(s)` : ''}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg font-semibold">
              Cancelar
            </button>
            <button
              type="button"
              onClick={importar}
              disabled={!marcadas.size || salvando}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Importar {marcadas.size || ''} para a agenda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
