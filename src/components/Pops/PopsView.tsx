import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Loader2, Search, AlertTriangle } from 'lucide-react';
import { Colaborador, UsuarioLogin } from '../../types';
import { SETORES_DOCUMENTO } from '../../data/setoresDocumento';
import { Pop, StatusPop, SITUACAO_ESTILO, conteudoEmBranco, getPops } from '../../utils/popsApi';
import { DocumentosAssinaturaView } from '../Contracheques/DocumentosAssinaturaView';
import { PopEditor } from './PopEditor';
import { dataBr, nomeSetorPop } from './popPdf';

// ============================================================================
// POPs — Procedimento Operacional Padrão no modelo ABNT (migração 073).
// Lista (com filtros e alerta de revisão vencida), editor por seções com o
// fluxo Elaborado → Revisado → Aprovado, e a ciência dos colaboradores.
// ============================================================================

const hoje = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const FILTROS: (StatusPop | 'Em andamento' | 'Todos')[] = ['Todos', 'Vigente', 'Em andamento', 'Rascunho', 'Obsoleto'];

export const PopsView: React.FC<{ colaboradores: Colaborador[]; currentUser?: UsuarioLogin }> = ({ colaboradores, currentUser }) => {
  const [pops, setPops] = useState<Pop[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<'pops' | 'ciencia'>('pops');
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Todos');
  const [setor, setSetor] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<Pop | null>(null);

  useEffect(() => {
    getPops()
      .then(setPops)
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar os POPs. Se for a primeira vez, confirme que a migração 073 foi rodada no Supabase.');
      })
      .finally(() => setCarregando(false));
  }, []);

  const novo = () =>
    setAberto({
      id: '',
      codigo: '',
      versao: 1,
      titulo: '',
      setor: 'OPE',
      classificacao: 'Uso interno',
      status: 'Rascunho',
      conteudo: conteudoEmBranco(),
      elaboradoPor: currentUser?.nome,
      elaboradoCargo: currentUser?.cargo,
      criadoPor: currentUser?.nome,
    });

  const atualizar = (p: Pop) => setPops((prev) => [...prev.filter((x) => x.id !== p.id), p].sort((a, b) => a.codigo.localeCompare(b.codigo) || b.versao - a.versao));

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pops.filter((p) => {
      if (filtro === 'Todos' && p.status === 'Obsoleto') return false;
      if (filtro === 'Em andamento' && p.status !== 'Em revisão' && p.status !== 'Em aprovação') return false;
      if (filtro !== 'Todos' && filtro !== 'Em andamento' && p.status !== filtro) return false;
      if (setor && p.setor !== setor) return false;
      return !termo || p.titulo.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo);
    });
  }, [pops, filtro, setor, busca]);

  const vigentes = pops.filter((p) => p.status === 'Vigente');
  const vencidos = vigentes.filter((p) => p.proximaRevisao && p.proximaRevisao < hoje());
  const andamento = pops.filter((p) => p.status === 'Em revisão' || p.status === 'Em aprovação');
  const rascunhos = pops.filter((p) => p.status === 'Rascunho');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">POPs — Procedimentos Operacionais Padrão</h1>
            <p className="text-xs text-slate-500 mt-0.5">Modelo ABNT (NBR 6024, 6023 e 14724) com controle de versão, aprovação e ciência dos colaboradores.</p>
          </div>
        </div>
        <button type="button" onClick={novo} className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo POP
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ['pops', 'POPs'],
            ['ciencia', 'Ciência dos colaboradores'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px ${aba === id ? 'border-[#C48229] text-[#92611F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      {aba === 'pops' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { rotulo: 'Vigentes', valor: vigentes.length, classe: 'text-emerald-700' },
              { rotulo: 'Em revisão / aprovação', valor: andamento.length, classe: 'text-[#92611F]' },
              { rotulo: 'Rascunhos', valor: rascunhos.length, classe: 'text-slate-700' },
              { rotulo: 'Revisão vencida', valor: vencidos.length, classe: vencidos.length ? 'text-rose-600' : 'text-slate-700' },
            ].map((t) => (
              <div key={t.rotulo} className="bg-white p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold">{t.rotulo}</p>
                <p className={`text-2xl font-black ${t.classe}`}>{t.valor}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTROS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${filtro === f ? 'bg-[#C48229] text-white border-[#C48229]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {f === 'Todos' ? 'Todos (sem obsoletos)' : f}
              </button>
            ))}
            <select value={setor} onChange={(e) => setSetor(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="">Todos os setores</option>
              {SETORES_DOCUMENTO.map((s) => (
                <option key={s.sigla} value={s.sigla}>
                  {s.nome}
                </option>
              ))}
            </select>
            <div className="relative ml-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título ou código" className="border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-xs w-60" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            {carregando ? (
              <p className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" /> Carregando...
              </p>
            ) : visiveis.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">
                {pops.length === 0 ? 'Nenhum POP ainda. Clique em "Novo POP" para criar o primeiro.' : 'Nenhum POP com estes filtros.'}
              </p>
            ) : (
              <table className="w-full text-xs min-w-[760px]">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Código</th>
                    <th className="px-3 py-2.5">Título</th>
                    <th className="px-3 py-2.5">Setor</th>
                    <th className="px-3 py-2.5">Versão</th>
                    <th className="px-3 py-2.5">Situação</th>
                    <th className="px-3 py-2.5">Vigência</th>
                    <th className="px-3 py-2.5">Próxima revisão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiveis.map((p) => {
                    const vencido = p.status === 'Vigente' && p.proximaRevisao && p.proximaRevisao < hoje();
                    return (
                      <tr key={p.id} onClick={() => setAberto(p)} className="hover:bg-amber-50/40 cursor-pointer">
                        <td className="px-4 py-2.5 font-bold text-[#92611F] whitespace-nowrap">{p.codigo}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{p.titulo}</td>
                        <td className="px-3 py-2.5 text-slate-600">{nomeSetorPop(p.setor)}</td>
                        <td className="px-3 py-2.5 text-slate-600">{String(p.versao).padStart(2, '0')}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SITUACAO_ESTILO[p.status]}`}>{p.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{dataBr(p.vigenciaInicio)}</td>
                        <td className={`px-3 py-2.5 ${vencido ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          {vencido && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {dataBr(p.proximaRevisao)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {aba === 'ciencia' && <DocumentosAssinaturaView categoria="pop" colaboradores={colaboradores} currentUser={currentUser} compacto />}

      {aberto && (
        <PopEditor
          key={aberto.id || 'novo'}
          pop={aberto}
          todos={pops}
          colaboradores={colaboradores}
          currentUser={currentUser}
          onClose={() => setAberto(null)}
          onSalvo={atualizar}
          onExcluido={(id) => setPops((prev) => prev.filter((x) => x.id !== id))}
          onAbrir={(p) => setAberto(p)}
        />
      )}
    </div>
  );
};
