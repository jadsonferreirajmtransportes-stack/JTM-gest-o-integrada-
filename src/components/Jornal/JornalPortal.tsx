import React, { useEffect, useState } from 'react';
import { Loader2, ChevronLeft, MessageSquare, Send, Pin, Clock } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { NoticiaPortal, NoticiaPortalResumo, REACOES, TipoReacao, portalComentar, portalJornal, portalNoticia, portalReagir } from '../../utils/jornalApi';
import { CapaNoticia, CorpoNoticia, ResumoReacoes, dataNoticia } from './jornalVisual';

/** Jornal JMT dentro do portal do colaborador (mesmas credenciais do Portal de Educação). */
export const JornalPortal: React.FC<{ credenciais: CredenciaisPortal; noticiaInicial?: string; onNoticiaInicialUsada?: () => void }> = ({ credenciais, noticiaInicial, onNoticiaInicialUsada }) => {
  const [lista, setLista] = useState<NoticiaPortalResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abertaId, setAbertaId] = useState<string | null>(noticiaInicial || null);
  useEffect(() => {
    if (noticiaInicial) onNoticiaInicialUsada?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    portalJornal(credenciais)
      .then(setLista)
      .catch((err) => {
        console.error(err);
        setErro(err instanceof Error ? err.message : 'Não foi possível abrir o jornal.');
        setLista([]);
      });
  }, [credenciais]);

  const atualizarResumo = (id: string, parcial: Partial<NoticiaPortalResumo>) => setLista((prev) => (prev || []).map((n) => (n.id === id ? { ...n, ...parcial } : n)));

  if (abertaId) {
    return (
      <NoticiaAberta
        credenciais={credenciais}
        id={abertaId}
        onVoltar={() => setAbertaId(null)}
        onMudou={(p) => atualizarResumo(abertaId, p)}
      />
    );
  }

  if (lista === null) {
    return (
      <p className="text-xs text-slate-500 flex items-center gap-2 p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando notícias...
      </p>
    );
  }

  if (erro) return <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>;

  if (lista.length === 0) {
    return <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Ainda não há notícias publicadas. Volte em breve!</p>;
  }

  const [principal, ...resto] = lista;
  return (
    <div className="space-y-3 @container">
      <CartaoNoticia n={principal} grande onAbrir={() => setAbertaId(principal.id)} />
      <div className="grid @lg:grid-cols-2 gap-3">
        {resto.map((n) => (
          <CartaoNoticia key={n.id} n={n} onAbrir={() => setAbertaId(n.id)} />
        ))}
      </div>
    </div>
  );
};

const CartaoNoticia: React.FC<{ n: NoticiaPortalResumo; grande?: boolean; onAbrir: () => void }> = ({ n, grande, onAbrir }) => (
  <button type="button" onClick={onAbrir} className="w-full text-left normal-case bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-[#C48229] transition-colors">
    <div className="relative">
      <CapaNoticia titulo={n.titulo} categoria={n.categoria} capa={n.capa} tamanho={grande ? 'grande' : 'pequena'} />
      {n.destaque && (
        <span className="absolute top-2 right-2 text-[10px] font-black bg-[#C48229] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <Pin className="w-3 h-3" /> Destaque
        </span>
      )}
      {!n.lida && <span className="absolute top-2 left-2 text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">Nova</span>}
    </div>
    <div className="p-4 pt-3 space-y-1.5">
      {n.resumo && <p className={`text-slate-600 ${grande ? 'text-sm' : 'text-xs line-clamp-2'}`}>{n.resumo}</p>}
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>{dataNoticia(n.publicadaEm)}</span>
        <span className="flex items-center gap-3">
          <ResumoReacoes reacoes={n.reacoes} />
          {n.comentarios > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> {n.comentarios}
            </span>
          )}
        </span>
      </div>
    </div>
  </button>
);

const NoticiaAberta: React.FC<{
  credenciais: CredenciaisPortal;
  id: string;
  onVoltar: () => void;
  onMudou: (p: Partial<NoticiaPortalResumo>) => void;
}> = ({ credenciais, id, onVoltar, onMudou }) => {
  const [n, setN] = useState<NoticiaPortal | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [reagindo, setReagindo] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroComentario, setErroComentario] = useState<string | null>(null);

  useEffect(() => {
    portalNoticia(credenciais, id)
      .then((r) => {
        setN(r);
        onMudou({ lida: true });
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'Não foi possível abrir a notícia.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais, id]);

  const reagir = async (tipo: TipoReacao) => {
    if (!n || reagindo) return;
    setReagindo(true);
    try {
      const r = await portalReagir(credenciais, n.id, n.minhaReacao === tipo ? null : tipo);
      setN({ ...n, reacoes: r.reacoes, minhaReacao: r.minhaReacao });
      onMudou({ reacoes: r.reacoes, minhaReacao: r.minhaReacao });
    } catch (err) {
      console.error(err);
    } finally {
      setReagindo(false);
    }
  };

  const comentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n || !texto.trim()) return;
    setErroComentario(null);
    setEnviando(true);
    try {
      const c = await portalComentar(credenciais, n.id, texto);
      setN({ ...n, comentarios: [...n.comentarios, c] });
      setTexto('');
    } catch (err) {
      setErroComentario(err instanceof Error ? err.message : 'Não foi possível enviar o comentário.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={onVoltar} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Todas as notícias
      </button>
      {erro ? (
        <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>
      ) : !n ? (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Abrindo...
        </p>
      ) : (
        <>
          <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <CapaNoticia titulo={n.titulo} categoria={n.categoria} capa={n.capa} tamanho="grande" />
            <div className="p-5 space-y-4">
              <p className="text-[11px] text-slate-500">
                {n.autorNome || 'Comunicação JMT'} · {dataNoticia(n.publicadaEm)}
              </p>
              {n.resumo && <p className="text-base font-semibold text-slate-800 leading-snug">{n.resumo}</p>}
              <CorpoNoticia blocos={n.blocos} />
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {REACOES.map((r) => {
                  const ativo = n.minhaReacao === r.tipo;
                  return (
                    <button
                      key={r.tipo}
                      type="button"
                      onClick={() => reagir(r.tipo)}
                      disabled={reagindo}
                      className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        ativo ? 'bg-amber-50 border-[#C48229] text-[#7A4F17]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base leading-none">{r.emoji}</span> {r.rotulo}
                      {n.reacoes[r.tipo] ? <span className="text-slate-500 font-semibold">{n.reacoes[r.tipo]}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </article>

          {n.permiteComentarios && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#C48229]" /> Comentários
              </h2>
              {n.comentarios.length === 0 && <p className="text-xs text-slate-500">Seja o primeiro a comentar.</p>}
              {n.comentarios.map((c) => (
                <div key={c.id} className={`p-3 rounded-xl border ${c.pendente ? 'border-dashed border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}>
                  <p className="text-[11px] text-slate-500">
                    <strong className="text-slate-700">{c.meu ? 'Você' : c.autorNome}</strong> · {dataNoticia(c.criadoEm, true)}
                    {c.pendente && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[#92611F] font-semibold">
                        <Clock className="w-3 h-3" /> aguardando aprovação
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-800 whitespace-pre-line break-words">{c.texto}</p>
                </div>
              ))}
              <form onSubmit={comentar} data-texto-livre="true" className="space-y-2">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="Escreva um comentário respeitoso. Ele aparece para todos depois de aprovado."
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                />
                {erroComentario && <p className="text-xs text-rose-700 font-semibold">{erroComentario}</p>}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">{texto.length}/1000</span>
                  <button
                    type="submit"
                    disabled={!texto.trim() || enviando}
                    className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Comentar
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
};
