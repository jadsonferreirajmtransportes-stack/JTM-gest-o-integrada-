import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Eye, MessageSquare, EyeOff, Search, Download } from 'lucide-react';
import { Colaborador } from '../../types';
import {
  EngajamentoColaborador,
  EstatisticasNoticia,
  InteracoesNoticia,
  Noticia,
  REACOES,
  getContagemComentarios,
  getEngajamentoPorColaborador,
  getInteracoesNoticia,
} from '../../utils/jornalApi';
import { CapaNoticia, ResumoReacoes, dataNoticia } from './jornalVisual';
import { baixarBlob } from '../../utils/downloadUtils';

type AbaInteracao = 'leram' | 'reagiram' | 'comentaram' | 'naoLeram';

const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());

/** Quem leu, reagiu e comentou uma notícia — e quem ainda não leu (só administrador). */
export const InteracoesModal: React.FC<{ noticia: Noticia; colaboradores: Colaborador[]; onClose: () => void }> = ({ noticia, colaboradores, onClose }) => {
  const [dados, setDados] = useState<InteracoesNoticia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<AbaInteracao>('leram');

  useEffect(() => {
    getInteracoesNoticia(noticia.id)
      .then(setDados)
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar as interações.');
      });
  }, [noticia.id]);

  const porId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);
  const ativos = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo'), [colaboradores]);
  const nome = (id?: string) => nomeBonito(porId.get(id || '')?.nomeCompleto) || 'Ex-colaborador';
  const setor = (id?: string) => porId.get(id || '')?.setor || porId.get(id || '')?.funcaoCargo || '';

  const leram = useMemo(() => [...(dados?.leituras ?? [])].sort((a, b) => b.lidoEm.localeCompare(a.lidoEm)), [dados]);
  const naoLeram = useMemo(() => {
    const ids = new Set((dados?.leituras ?? []).map((l) => l.colaboradorId));
    return ativos.filter((c) => !ids.has(c.id)).sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
  }, [dados, ativos]);
  const comentarios = dados?.comentarios ?? [];
  const emoji = (tipo: string) => REACOES.find((r) => r.tipo === tipo);

  const abas: [AbaInteracao, string, number][] = [
    ['leram', 'Leram', leram.length],
    ['reagiram', 'Reagiram', dados?.reacoes.length ?? 0],
    ['comentaram', 'Comentaram', comentarios.length],
    ['naoLeram', 'Ainda não leram', naoLeram.length],
  ];

  const Linha: React.FC<{ id?: string; nomeFixo?: string; direita?: React.ReactNode; abaixo?: React.ReactNode }> = ({ id, nomeFixo, direita, abaixo }) => (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{nomeFixo || nome(id)}</p>
          {setor(id) && <p className="text-[11px] text-slate-500 truncate">{nomeBonito(setor(id))}</p>}
        </div>
        <div className="shrink-0 text-[11px] text-slate-500">{direita}</div>
      </div>
      {abaixo}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">Quem interagiu</h2>
            <p className="text-slate-500 line-clamp-1">{noticia.titulo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-3 pt-2 flex gap-1 border-b border-slate-200 overflow-x-auto">
          {abas.map(([id, rotulo, qtd]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={`shrink-0 px-3 py-2 font-bold border-b-2 -mb-px ${aba === id ? 'border-[#C48229] text-[#92611F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {rotulo} <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{qtd}</span>
            </button>
          ))}
        </div>
        <div className="overflow-y-auto divide-y divide-slate-100">
          {erro ? (
            <p className="p-4 text-rose-700 font-semibold">{erro}</p>
          ) : !dados ? (
            <p className="p-4 text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </p>
          ) : aba === 'leram' ? (
            leram.length ? (
              leram.map((l) => <Linha key={l.colaboradorId} id={l.colaboradorId} direita={dataNoticia(l.lidoEm, true)} />)
            ) : (
              <p className="p-4 text-slate-500">Ninguém leu ainda.</p>
            )
          ) : aba === 'reagiram' ? (
            dados.reacoes.length ? (
              [...dados.reacoes]
                .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
                .map((r) => (
                  <Linha
                    key={r.colaboradorId}
                    id={r.colaboradorId}
                    direita={
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <span className="text-base leading-none">{emoji(r.tipo)?.emoji}</span> {emoji(r.tipo)?.rotulo}
                      </span>
                    }
                  />
                ))
            ) : (
              <p className="p-4 text-slate-500">Ninguém reagiu ainda.</p>
            )
          ) : aba === 'comentaram' ? (
            comentarios.length ? (
              comentarios.map((c) => (
                <Linha
                  key={c.id}
                  id={c.colaboradorId}
                  nomeFixo={c.colaboradorId ? undefined : c.autorNome}
                  direita={
                    <span className={c.status === 'aprovado' ? 'text-emerald-700 font-semibold' : c.status === 'oculto' ? 'text-slate-400' : 'text-[#92611F] font-semibold'}>
                      {c.status === 'aprovado' ? 'Aprovado' : c.status === 'oculto' ? 'Oculto' : 'Aguardando'}
                    </span>
                  }
                  abaixo={<p className="mt-1 text-[13px] text-slate-700 whitespace-pre-line">{c.texto}</p>}
                />
              ))
            ) : (
              <p className="p-4 text-slate-500">Ninguém comentou ainda.</p>
            )
          ) : naoLeram.length ? (
            naoLeram.map((c) => <Linha key={c.id} id={c.id} />)
          ) : (
            <p className="p-4 text-slate-500">Todos os colaboradores ativos já leram. 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Aba Engajamento: comparação por notícia ou por colaborador. */
export const EngajamentoPainel: React.FC<{ colaboradores: Colaborador[]; noticias: Noticia[]; estatisticas: Map<string, EstatisticasNoticia> }> = ({
  colaboradores,
  noticias,
  estatisticas,
}) => {
  const [visao, setVisao] = useState<'noticia' | 'colaborador'>('noticia');
  return (
    <div className="space-y-3">
      <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1">
        {(
          [
            ['noticia', 'Por notícia'],
            ['colaborador', 'Por colaborador'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setVisao(id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold ${visao === id ? 'bg-[#C48229] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {visao === 'noticia' ? (
        <EngajamentoPorNoticia colaboradores={colaboradores} noticias={noticias} estatisticas={estatisticas} />
      ) : (
        <EngajamentoPorColaborador colaboradores={colaboradores} totalPublicadas={noticias.length} />
      )}
    </div>
  );
};

/** Uma linha por notícia publicada: leitura (em relação aos ativos), reações e comentários. */
const EngajamentoPorNoticia: React.FC<{ colaboradores: Colaborador[]; noticias: Noticia[]; estatisticas: Map<string, EstatisticasNoticia> }> = ({
  colaboradores,
  noticias,
  estatisticas,
}) => {
  const [comentarios, setComentarios] = useState<Map<string, number> | null>(null);
  const [ordem, setOrdem] = useState<'recentes' | 'mais' | 'menos'>('recentes');
  const [aberta, setAberta] = useState<Noticia | null>(null);
  const ativos = colaboradores.filter((c) => c.status !== 'Inativo').length || 1;

  useEffect(() => {
    getContagemComentarios()
      .then(setComentarios)
      .catch((err) => {
        console.error(err);
        setComentarios(new Map());
      });
  }, []);

  const linhas = useMemo(() => {
    const lista = noticias.map((n) => {
      const e = estatisticas.get(n.id) || { leituras: 0, reacoes: {} };
      const reacoes = (Object.values(e.reacoes) as number[]).reduce((s, v) => s + (v || 0), 0);
      return { n, e, reacoes, comentarios: comentarios?.get(n.id) || 0, alcance: Math.round((e.leituras / ativos) * 100) };
    });
    return lista.sort((a, b) =>
      ordem === 'recentes' ? (b.n.publicadaEm || '').localeCompare(a.n.publicadaEm || '') : ordem === 'mais' ? b.alcance - a.alcance || b.reacoes - a.reacoes : a.alcance - b.alcance
    );
  }, [noticias, estatisticas, comentarios, ativos, ordem]);

  const exportar = () => {
    const cab = 'Notícia;Editoria;Publicada em;Leram;Ativos;Alcance (%);Reações;Comentários';
    const corpo = linhas.map(({ n, e, reacoes, comentarios: qc, alcance }) =>
      [`"${n.titulo.replace(/"/g, '""')}"`, n.categoria, n.publicadaEm ? new Date(n.publicadaEm).toLocaleDateString('pt-BR') : '', e.leituras, ativos, alcance, reacoes, qc].join(';')
    );
    baixarBlob(new Blob(['\ufeff' + [cab, ...corpo].join('\n')], { type: 'text/csv;charset=utf-8' }), `Engajamento_por_noticia_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (noticias.length === 0) return <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">Nenhuma notícia publicada ainda.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} className="py-2 px-2 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="recentes">Mais recentes primeiro</option>
          <option value="mais">Maior alcance primeiro</option>
          <option value="menos">Menor alcance primeiro</option>
        </select>
        <button type="button" onClick={exportar} className="ml-auto px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Excel (CSV)
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {linhas.map(({ n, e, comentarios: qc, alcance }) => (
          <div key={n.id} className="p-3 sm:p-4 flex flex-wrap items-center gap-3 text-xs">
            <div className="w-28 shrink-0 rounded-lg overflow-hidden">
              <CapaNoticia titulo="" categoria={n.categoria} capa={n.capa} className="[&_h3]:hidden [&_p]:hidden [&_span]:hidden [&_svg]:hidden" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">{n.categoria}</p>
              <p className="text-sm font-bold text-slate-900 leading-snug">{n.titulo}</p>
              <p className="text-[11px] text-slate-500">Publicada em {dataNoticia(n.publicadaEm)}</p>
            </div>
            <div className="w-40">
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {e.leituras} de {ativos}
                </span>
                <span>{alcance}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[#C48229]" style={{ width: `${Math.min(100, alcance)}%` }} />
              </div>
            </div>
            <div className="w-28 text-[11px] text-slate-600 font-semibold space-y-0.5">
              <div>{Object.values(e.reacoes).some(Boolean) ? <ResumoReacoes reacoes={e.reacoes} /> : <span className="text-slate-400 font-normal">sem reações</span>}</div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> {qc} comentário(s)
              </div>
            </div>
            <button type="button" onClick={() => setAberta(n)} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50">
              Ver quem
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400">Alcance = colaboradores ativos que abriram a notícia. Visível só para administradores.</p>
      {aberta && <InteracoesModal noticia={aberta} colaboradores={colaboradores} onClose={() => setAberta(null)} />}
    </div>
  );
};

/** Resumo por colaborador: quantas notícias leu, quantas reações e comentários. */
const EngajamentoPorColaborador: React.FC<{ colaboradores: Colaborador[]; totalPublicadas: number }> = ({ colaboradores, totalPublicadas }) => {
  const [mapa, setMapa] = useState<Map<string, EngajamentoColaborador> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<'mais' | 'menos' | 'nome'>('mais');

  useEffect(() => {
    getEngajamentoPorColaborador()
      .then(setMapa)
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar o engajamento.');
      });
  }, []);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = colaboradores
      .filter((c) => c.status !== 'Inativo')
      .filter((c) => !termo || `${c.nomeCompleto} ${c.setor || ''} ${c.funcaoCargo || ''}`.toLowerCase().includes(termo))
      .map((c) => ({ c, e: mapa?.get(c.id) || { colaboradorId: c.id, leituras: 0, reacoes: 0, comentarios: 0 } }));
    const pontos = (e: EngajamentoColaborador) => e.leituras + e.reacoes * 2 + e.comentarios * 3;
    return lista.sort((a, b) =>
      ordem === 'nome' ? a.c.nomeCompleto.localeCompare(b.c.nomeCompleto) : ordem === 'mais' ? pontos(b.e) - pontos(a.e) : pontos(a.e) - pontos(b.e)
    );
  }, [colaboradores, mapa, busca, ordem]);

  const nuncaLeram = linhas.filter((l) => l.e.leituras === 0).length;

  const exportar = () => {
    const cab = 'Colaborador;Setor;Notícias lidas;Reações;Comentários;Última interação';
    const corpo = linhas.map(({ c, e }) => [nomeBonito(c.nomeCompleto), c.setor || '', e.leituras, e.reacoes, e.comentarios, e.ultimaInteracao ? new Date(e.ultimaInteracao).toLocaleDateString('pt-BR') : ''].join(';'));
    baixarBlob(new Blob(['﻿' + [cab, ...corpo].join('\n')], { type: 'text/csv;charset=utf-8' }), `Engajamento_Jornal_JMT_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (erro) return <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>;
  if (!mapa)
    return (
      <p className="text-xs text-slate-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
      </p>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador ou setor..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-64" />
        </div>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} className="py-2 px-2 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="mais">Mais participativos primeiro</option>
          <option value="menos">Menos participativos primeiro</option>
          <option value="nome">Nome (A–Z)</option>
        </select>
        <button type="button" onClick={exportar} className="ml-auto px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Excel (CSV)
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        {totalPublicadas} notícia(s) publicada(s). {nuncaLeram > 0 ? `${nuncaLeram} colaborador(es) ativo(s) ainda não leram nenhuma — vale reforçar o link pessoal com eles.` : 'Todos já leram pelo menos uma notícia.'}
      </p>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Colaborador</th>
              <th className="text-center px-2 py-2.5">
                <Eye className="w-3.5 h-3.5 inline" /> Lidas
              </th>
              <th className="text-center px-2 py-2.5">Reações</th>
              <th className="text-center px-2 py-2.5">
                <MessageSquare className="w-3.5 h-3.5 inline" /> Comentários
              </th>
              <th className="text-right px-4 py-2.5">Última interação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {linhas.map(({ c, e }) => (
              <tr key={c.id} className={e.leituras === 0 ? 'bg-amber-50/40' : ''}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-slate-800">{nomeBonito(c.nomeCompleto)}</p>
                  {(c.setor || c.funcaoCargo) && <p className="text-[11px] text-slate-500">{nomeBonito(c.setor || c.funcaoCargo)}</p>}
                </td>
                <td className="text-center px-2 py-2.5 font-semibold">
                  {e.leituras}
                  {totalPublicadas > 0 && <span className="text-slate-400 font-normal">/{totalPublicadas}</span>}
                </td>
                <td className="text-center px-2 py-2.5 font-semibold">{e.reacoes}</td>
                <td className="text-center px-2 py-2.5 font-semibold">{e.comentarios}</td>
                <td className="text-right px-4 py-2.5 text-slate-500">
                  {e.ultimaInteracao ? (
                    dataNoticia(e.ultimaInteracao)
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#92611F]">
                      <EyeOff className="w-3 h-3" /> nunca
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400">
        Visível só para administradores. Use para incentivar a participação — não como avaliação de desempenho.
      </p>
    </div>
  );
};
