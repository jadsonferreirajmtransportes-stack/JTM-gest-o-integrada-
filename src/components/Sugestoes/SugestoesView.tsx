import React, { useEffect, useMemo, useState } from 'react';
import { EyeOff, FileSpreadsheet, Lightbulb, Loader2, Megaphone, Save, Search, ThumbsUp, Trash2, X } from 'lucide-react';
import type { UsuarioLogin } from '../../types';
import { AcoesTela } from '../Common/AcoesTela';
import { CATEGORIAS_SUGESTAO, PONTOS_SUGESTAO_IMPLEMENTADA, STATUS_SUGESTAO, StatusSugestao, Sugestao, atualizarSugestao, excluirSugestao, getSugestoes, statusSugestao } from '../../utils/sugestoesApi';

const dataBr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');
const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());

const Selo: React.FC<{ status: string }> = ({ status }) => {
  const s = statusSugestao(status);
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${s.cls}`}>{s.rotulo}</span>;
};

/** Sugestões de melhoria enviadas pelos colaboradores no portal. */
export const SugestoesView: React.FC<{ currentUser?: UsuarioLogin | null }> = ({ currentUser }) => {
  const [lista, setLista] = useState<Sugestao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'abertas' | 'todas' | 'mural' | StatusSugestao>('abertas');
  const [categoria, setCategoria] = useState('');
  const [busca, setBusca] = useState('');
  const [aberta, setAberta] = useState<Sugestao | null>(null);
  const admin = currentUser?.role === 'admin';

  useEffect(() => {
    getSugestoes()
      .then(setLista)
      .catch((e) => {
        console.error(e);
        setErro('Não foi possível carregar as sugestões. Rode a migração 094 no Supabase, se ainda não rodou.');
        setLista([]);
      });
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (lista || [])
      .filter((s) =>
        filtro === 'todas' ? true : filtro === 'abertas' ? s.status === 'recebida' || s.status === 'analise' || s.status === 'aprovada' : filtro === 'mural' ? s.noMural : s.status === filtro
      )
      .filter((s) => !categoria || s.categoria === categoria)
      .filter((s) => !q || [s.protocolo, s.titulo, s.descricao, s.colaboradorNome, s.setor].join(' ').toLowerCase().includes(q));
  }, [lista, filtro, categoria, busca]);

  const novas = (lista || []).filter((s) => !s.lida).length;
  const contar = (st: StatusSugestao) => (lista || []).filter((s) => s.status === st).length;

  const abrir = (s: Sugestao) => {
    setAberta({ ...s, lida: true });
    if (!s.lida) {
      atualizarSugestao(s.id, { lida: true }).catch(console.error);
      setLista((p) => (p || []).map((x) => (x.id === s.id ? { ...x, lida: true } : x)));
    }
  };

  const exportarExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sugestões');
    ws.addRow(['Nº', 'Data', 'Assunto', 'Título', 'Sugestão', 'Ganho esperado', 'Quem enviou', 'Setor', 'Situação', 'Resposta', 'No mural', 'Apoios', 'Responsável']);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92611F' } };
    filtradas.forEach((s) =>
      ws.addRow([
        s.protocolo,
        dataBr(s.criadoEm),
        s.categoria,
        s.titulo,
        s.descricao,
        s.beneficio || '',
        s.anonima ? 'Anônima' : nomeBonito(s.colaboradorNome),
        s.anonima ? '' : s.setor || '',
        statusSugestao(s.status).rotulo,
        s.resposta || '',
        s.noMural ? 'Sim' : 'Não',
        s.apoios,
        s.responsavel || '',
      ])
    );
    ws.columns.forEach((c, i) => (c.width = [14, 12, 22, 34, 60, 40, 26, 18, 16, 50, 10, 8, 20][i] || 16));
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `Sugestoes_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hidden lg:flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Sugestões de melhoria</h1>
            <p className="text-xs text-slate-500">Ideias enviadas pelos colaboradores no portal. As anônimas chegam sem nome — nem o sistema mostra quem mandou.</p>
          </div>
        </div>
      </div>
      <AcoesTela>
        <button type="button" onClick={exportarExcel} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Excel
        </button>
      </AcoesTela>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { rot: 'Novas (não lidas)', n: novas, f: 'abertas' as const },
          { rot: 'Em análise', n: contar('analise'), f: 'analise' as const },
          { rot: 'Aprovadas', n: contar('aprovada'), f: 'aprovada' as const },
          { rot: 'Implementadas', n: contar('implementada'), f: 'implementada' as const },
          { rot: 'No mural', n: (lista || []).filter((s) => s.noMural).length, f: 'mural' as const },
        ].map((c) => (
          <button key={c.rot} type="button" onClick={() => setFiltro(c.f)} className={`text-left bg-white rounded-2xl border p-3 normal-case tracking-normal ${filtro === c.f ? 'border-[#C48229]' : 'border-slate-200'}`}>
            <p className="text-[11px] font-bold text-slate-500">{c.rot}</p>
            <p className="text-xl font-black text-slate-900">{c.n}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-full bg-white" />
        </div>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as any)} className="py-2 px-2 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="abertas">Em aberto</option>
          <option value="todas">Todas</option>
          <option value="mural">No mural</option>
          {STATUS_SUGESTAO.map((s) => (
            <option key={s.id} value={s.id}>
              {s.rotulo}
            </option>
          ))}
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="py-2 px-2 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="">Todos os assuntos</option>
          {CATEGORIAS_SUGESTAO.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {lista === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : filtradas.length === 0 ? (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
          Nenhuma sugestão aqui. Os colaboradores enviam pelo link pessoal, em Mais → Sugestões.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtradas.map((s) => (
            <button key={s.id} type="button" onClick={() => abrir(s)} className="text-left bg-white rounded-2xl border border-slate-200 p-4 space-y-1.5 hover:border-[#C48229] normal-case tracking-normal">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-black text-[#92611F]">
                  {s.protocolo} · {s.categoria}
                  {!s.lida && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-600 text-white">nova</span>}
                </p>
                <Selo status={s.status} />
              </div>
              <p className="text-sm font-black text-slate-900">{s.titulo}</p>
              <p className="text-xs text-slate-600 line-clamp-2">{s.descricao}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                {s.anonima ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Anônima
                  </>
                ) : (
                  <>
                    {nomeBonito(s.colaboradorNome)}
                    {s.setor ? ` · ${nomeBonito(s.setor)}` : ''}
                  </>
                )}
                <span>· {dataBr(s.criadoEm)}</span>
                {s.noMural && (
                  <span className="ml-auto flex items-center gap-1 font-bold text-[#92611F]">
                    <Megaphone className="w-3.5 h-3.5" /> mural · <ThumbsUp className="w-3.5 h-3.5" /> {s.apoios}
                  </span>
                )}
              </p>
            </button>
          ))}
        </div>
      )}

      {aberta && (
        <SugestaoModal
          key={aberta.id}
          s={aberta}
          usuario={currentUser?.nome}
          podeExcluir={admin}
          onClose={() => setAberta(null)}
          onSalva={(n) => {
            setLista((p) => (p || []).map((x) => (x.id === n.id ? n : x)));
            setAberta(null);
          }}
          onExcluida={(id) => {
            setLista((p) => (p || []).filter((x) => x.id !== id));
            setAberta(null);
          }}
        />
      )}
    </div>
  );
};

const SugestaoModal: React.FC<{
  s: Sugestao;
  usuario?: string;
  podeExcluir?: boolean;
  onClose: () => void;
  onSalva: (s: Sugestao) => void;
  onExcluida: (id: string) => void;
}> = ({ s, usuario, podeExcluir, onClose, onSalva, onExcluida }) => {
  const [f, setF] = useState({ status: s.status, resposta: s.resposta || '', notaInterna: s.notaInterna || '', responsavel: s.responsavel || usuario || '', noMural: s.noMural, categoria: s.categoria });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campoCls = 'mt-1 w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm';

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      const respondeuAgora = f.resposta.trim() !== (s.resposta || '').trim() && !!f.resposta.trim();
      await atualizarSugestao(s.id, f, respondeuAgora);
      onSalva({ ...s, ...f, resposta: f.resposta.trim() || undefined, notaInterna: f.notaInterna.trim() || undefined, respondidaEm: respondeuAgora ? new Date().toISOString() : s.respondidaEm });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };
  const excluir = async () => {
    if (!window.confirm(`Excluir a sugestão ${s.protocolo}? Ela some também do portal de quem mandou.`)) return;
    try {
      await excluirSugestao(s.id);
      onExcluida(s.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2 sm:p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">
              Sugestão {s.protocolo} · {dataBr(s.criadoEm)}
            </p>
            <h2 className="text-base font-black text-slate-900 normal-case">{s.titulo}</h2>
            <p className="text-slate-500 flex items-center gap-1">
              {s.anonima ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Enviada sem identificação
                </>
              ) : (
                <>
                  {nomeBonito(s.colaboradorNome)}
                  {s.setor ? ` · ${nomeBonito(s.setor)}` : ''}
                </>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="text-slate-800 whitespace-pre-line">{s.descricao}</p>
            {s.beneficio && (
              <p className="text-slate-600 whitespace-pre-line">
                <span className="font-bold">Ganho esperado: </span>
                {s.beneficio}
              </p>
            )}
            {s.noMural && (
              <p className="text-[#92611F] font-bold flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5" /> {s.apoios} apoio(s) no mural
              </p>
            )}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="font-bold text-slate-700">Situação</span>
              <select value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value as StatusSugestao }))} className={campoCls}>
                {STATUS_SUGESTAO.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-bold text-slate-700">Assunto</span>
              <select value={f.categoria} onChange={(e) => setF((x) => ({ ...x, categoria: e.target.value }))} className={campoCls}>
                {CATEGORIAS_SUGESTAO.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-bold text-slate-700">Responsável</span>
              <input value={f.responsavel} onChange={(e) => setF((x) => ({ ...x, responsavel: e.target.value }))} maxLength={120} className={campoCls} />
            </label>
          </div>
          {f.status === 'implementada' && (
            <p className={`p-2.5 rounded-xl border font-semibold ${s.anonima ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              {s.anonima
                ? 'Sugestão anônima: não gera pontos na gamificação (daria para saber quem mandou).'
                : s.status === 'implementada'
                  ? `🏅 ${nomeBonito(s.colaboradorNome).split(' ')[0]} já recebeu +${PONTOS_SUGESTAO_IMPLEMENTADA} pontos no Meu desempenho por esta sugestão.`
                  : `🏅 Ao salvar, ${nomeBonito(s.colaboradorNome).split(' ')[0]} ganha +${PONTOS_SUGESTAO_IMPLEMENTADA} pontos no Meu desempenho (Gamificação).`}
            </p>
          )}
          <label className="block">
            <span className="font-bold text-slate-700">Resposta ao colaborador</span>
            <textarea value={f.resposta} onChange={(e) => setF((x) => ({ ...x, resposta: e.target.value }))} rows={4} placeholder="Ex.: Obrigado pela ideia! Vamos testar na expedição a partir de segunda." className={campoCls} />
            <span className="block text-[10px] text-slate-500 mt-0.5">Quem enviou vê a resposta em "Minhas" (inclusive se mandou anônima). Se for para o mural, todos veem.</span>
          </label>
          <label className="block">
            <span className="font-bold text-slate-700">Anotação interna (só a gestão vê)</span>
            <textarea value={f.notaInterna} onChange={(e) => setF((x) => ({ ...x, notaInterna: e.target.value }))} rows={2} className={campoCls} />
          </label>
          <label className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer">
            <input type="checkbox" checked={f.noMural} onChange={(e) => setF((x) => ({ ...x, noMural: e.target.checked }))} className="w-4 h-4 mt-0.5 accent-[#C48229]" />
            <span>
              <span className="font-black text-slate-900">Publicar no mural do portal</span>
              <span className="block text-slate-600">Todos os colaboradores veem a sugestão{f.resposta.trim() ? ' e a resposta' : ''} e podem apoiar. {s.anonima ? 'Ela continua sem nome.' : 'Aparece o primeiro nome e o setor de quem mandou.'}</span>
            </span>
          </label>
        </div>
        <div className="p-4 border-t border-slate-200 flex items-center gap-2">
          {podeExcluir && (
            <button type="button" onClick={excluir} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5 hover:bg-rose-50">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          )}
          {erro && <p className="text-rose-700 font-semibold flex-1">{erro}</p>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
              Cancelar
            </button>
            <button type="button" onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
