import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Newspaper, Plus, Loader2, Pencil, Trash2, Eye, MessageSquare, MessageCircle, Archive, RotateCcw, Pin, Check, EyeOff, X, Search, Users } from 'lucide-react';
import { Colaborador, UsuarioLogin } from '../../types';
import {
  ComentarioNoticia,
  EstatisticasNoticia,
  Noticia,
  atualizarStatusNoticia,
  deleteNoticia,
  getComentarios,
  getEstatisticas,
  getNoticia,
  getNoticias,
  moderarComentario,
} from '../../utils/jornalApi';
import { getTokensPortal, obterOuCriarTokenPortal } from '../../utils/educacaoApi';
import { montarLinkUnico } from '../../utils/linkUnico';
import { EnvioWhatsAppEmMassaModal, ItemEnvioWhatsApp } from '../Common/EnvioWhatsAppEmMassaModal';
import { CapaNoticia, ResumoReacoes, dataNoticia } from './jornalVisual';
import { NoticiaEditorModal, noticiaEmBranco } from './NoticiaEditorModal';
import { EngajamentoPainel, InteracoesModal } from './JornalEngajamento';

type Aba = 'publicadas' | 'aprovar' | 'rascunhos' | 'arquivadas' | 'comentarios' | 'engajamento';

const primeiroNome = (nome: string) => {
  const p = (nome || '').trim().split(/\s+/)[0] || '';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
};

export const JornalView: React.FC<{ colaboradores: Colaborador[]; currentUser?: UsuarioLogin | null }> = ({ colaboradores, currentUser }) => {
  const ehAdmin = currentUser?.role === 'admin';
  const eu = currentUser?.nome || '';
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [stats, setStats] = useState<Map<string, EstatisticasNoticia>>(new Map());
  const [pendentes, setPendentes] = useState<ComentarioNoticia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('publicadas');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Noticia | null>(null);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const [comentariosDe, setComentariosDe] = useState<Noticia | null>(null);
  const [interacoesDe, setInteracoesDe] = useState<Noticia | null>(null);
  const [envio, setEnvio] = useState<{ titulo: string; itens: ItemEnvioWhatsApp[] } | null>(null);
  const [preparandoEnvio, setPreparandoEnvio] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [lista, est, pend] = await Promise.all([getNoticias(), getEstatisticas(), ehAdmin ? getComentarios() : Promise.resolve([])]);
      setNoticias(lista);
      setStats(est);
      setPendentes(pend);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível carregar o jornal. Se acabou de ser instalado, confira se a migração 066 foi rodada no Supabase.');
    } finally {
      setCarregando(false);
    }
  }, [ehAdmin]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Quem não é administrador vê as publicadas e só os próprios rascunhos/sugestões.
  const visiveis = useMemo(() => noticias.filter((n) => ehAdmin || n.status === 'publicada' || n.criadoPor === eu), [noticias, ehAdmin, eu]);
  const porAba: Record<Exclude<Aba, 'comentarios'>, Noticia[]> = useMemo(
    () => ({
      publicadas: visiveis.filter((n) => n.status === 'publicada').sort((a, b) => Number(b.destaque) - Number(a.destaque) || (b.publicadaEm || '').localeCompare(a.publicadaEm || '')),
      aprovar: visiveis.filter((n) => n.status === 'sugerida'),
      rascunhos: visiveis.filter((n) => n.status === 'rascunho'),
      arquivadas: visiveis.filter((n) => n.status === 'arquivada'),
    }),
    [visiveis]
  );
  const titulosPorId = useMemo(() => new Map(noticias.map((n) => [n.id, n.titulo])), [noticias]);
  const lista = aba === 'comentarios' || aba === 'engajamento' ? [] : porAba[aba].filter((n) => !busca.trim() || `${n.titulo} ${n.resumo || ''} ${n.categoria}`.toLowerCase().includes(busca.trim().toLowerCase()));

  const abrirEditor = async (n: Noticia) => {
    setAbrindoId(n.id);
    try {
      const completa = await getNoticia(n.id);
      if (completa) setEditando(completa);
    } catch (err) {
      console.error(err);
      alert('Não foi possível abrir a notícia.');
    } finally {
      setAbrindoId(null);
    }
  };

  const mudarStatus = async (n: Noticia, campos: Parameters<typeof atualizarStatusNoticia>[1], confirmacao?: string) => {
    if (confirmacao && !window.confirm(confirmacao)) return;
    try {
      await atualizarStatusNoticia(n.id, campos);
      setNoticias((prev) => prev.map((x) => (x.id === n.id ? { ...x, ...campos } : x)));
    } catch (err) {
      console.error(err);
      alert('Não foi possível atualizar a notícia.');
    }
  };

  const excluir = async (n: Noticia) => {
    if (!window.confirm(`Excluir "${n.titulo}"? As reações e os comentários também são apagados. Para só tirar do ar, use Arquivar.`)) return;
    try {
      await deleteNoticia(n.id);
      setNoticias((prev) => prev.filter((x) => x.id !== n.id));
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir.');
    }
  };

  const divulgar = async (n: Noticia) => {
    setPreparandoEnvio(n.id);
    try {
      const tokens = await getTokensPortal();
      const ativos = colaboradores.filter((c) => c.status !== 'Inativo');
      const itens: ItemEnvioWhatsApp[] = [];
      for (const c of ativos) {
        const token = await obterOuCriarTokenPortal(c.id, tokens);
        const link = montarLinkUnico(token, `jornal:${n.id}`);
        itens.push({
          id: c.id,
          nome: c.nomeCompleto,
          telefone: c.telefoneWhatsapp,
          mensagem: `Olá, ${primeiroNome(c.nomeCompleto)}! Tem notícia nova no *Jornal JMT*:\n\n*${n.titulo}*${n.resumo ? `\n${n.resumo}` : ''}\n\nLeia, reaja e comente pelo seu link pessoal (entre com CPF e data de nascimento):\n${link}`,
        });
      }
      setEnvio({ titulo: `Divulgar: ${n.titulo}`, itens });
    } catch (err) {
      console.error(err);
      alert('Não foi possível preparar os links dos colaboradores.');
    } finally {
      setPreparandoEnvio(null);
    }
  };

  // Grupo do WhatsApp: o WhatsApp não deixa o sistema escolher o grupo — abre com o texto pronto
  // e quem envia escolhe a conversa. Sem link pessoal (cada um tem o seu): a mensagem orienta a
  // abrir o próprio link na aba Jornal.
  const enviarParaGrupo = (n: Noticia) => {
    const mensagem =
      `📰 *Jornal JMT* — notícia nova!\n\n*${n.titulo}*${n.resumo ? `\n${n.resumo}` : ''}\n\n` +
      `Para ler, reagir e comentar, abra o seu link pessoal da JMT (o mesmo do ponto e dos contracheques) e toque na aba *Jornal*.\n` +
      `Ainda não tem o seu link? Fale com o Departamento Pessoal.`;
    navigator.clipboard?.writeText(mensagem).catch(() => {});
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener');
  };

  const moderar = async (c: ComentarioNoticia, status: 'aprovado' | 'oculto') => {
    try {
      await moderarComentario(c.id, status, eu);
      setPendentes((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      console.error(err);
      alert('Não foi possível moderar o comentário.');
    }
  };

  const abas: [Aba, string, number | undefined][] = [
    ['publicadas', 'Publicadas', porAba.publicadas.length],
    ['aprovar', ehAdmin ? 'Para aprovar' : 'Enviadas para aprovação', porAba.aprovar.length],
    ['rascunhos', 'Rascunhos', porAba.rascunhos.length],
    ['arquivadas', 'Arquivadas', porAba.arquivadas.length],
    ...(ehAdmin
      ? ([
          ['comentarios', 'Comentários para aprovar', pendentes.length],
          ['engajamento', 'Engajamento', undefined],
        ] as [Aba, string, number | undefined][])
      : []),
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C48229] to-[#7A4F17] text-white flex items-center justify-center">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Jornal JMT</h1>
            <p className="text-xs text-slate-500">
              Notícias da empresa para os colaboradores, no link pessoal do portal.{' '}
              {ehAdmin ? 'Supervisores sugerem, você revisa e publica.' : 'Escreva e envie para aprovação.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditando(noticiaEmBranco(eu))}
          className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {ehAdmin ? 'Nova notícia' : 'Sugerir notícia'}
        </button>
      </div>

      {ehAdmin && (porAba.aprovar.length > 0 || pendentes.length > 0) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-[#7A4F17] font-semibold flex flex-wrap gap-x-4 gap-y-1">
          {porAba.aprovar.length > 0 && (
            <button type="button" onClick={() => setAba('aprovar')} className="underline">
              {porAba.aprovar.length} notícia(s) sugerida(s) aguardando sua revisão
            </button>
          )}
          {pendentes.length > 0 && (
            <button type="button" onClick={() => setAba('comentarios')} className="underline">
              {pendentes.length} comentário(s) aguardando aprovação
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {abas.map(([id, rotulo, qtd]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={`px-3 py-2 text-xs font-bold uppercase border-b-2 -mb-px ${aba === id ? 'border-[#C48229] text-[#92611F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {rotulo}
              {qtd ? <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{qtd}</span> : null}
            </button>
          ))}
        </div>
        {aba !== 'comentarios' && aba !== 'engajamento' && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar notícia..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-56" />
          </div>
        )}
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}

      {carregando ? (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </p>
      ) : aba === 'comentarios' ? (
        <ListaComentariosPendentes comentarios={pendentes} titulos={titulosPorId} onModerar={moderar} />
      ) : aba === 'engajamento' ? (
        <EngajamentoPainel colaboradores={colaboradores} noticias={porAba.publicadas} estatisticas={stats} />
      ) : lista.length === 0 ? (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">
          {aba === 'publicadas' ? 'Nenhuma notícia publicada ainda. Clique em "Nova notícia" para escrever a primeira.' : 'Nada por aqui.'}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((n) => {
            const e = stats.get(n.id) || { leituras: 0, reacoes: {} };
            const podeEditar = ehAdmin || (n.criadoPor === eu && n.status !== 'publicada' && n.status !== 'arquivada');
            return (
              <div key={n.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
                <div className="relative">
                  <CapaNoticia titulo={n.titulo} categoria={n.categoria} capa={n.capa} />
                  {n.destaque && (
                    <span className="absolute top-2 left-2 text-[10px] font-black bg-[#C48229] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Destaque
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2 text-xs">
                  {n.resumo && <p className="text-slate-600 line-clamp-2">{n.resumo}</p>}
                  <p className="text-[11px] text-slate-500">
                    {n.status === 'publicada' ? `Publicada em ${dataNoticia(n.publicadaEm)}` : `Criada por ${n.criadoPor || '—'} em ${dataNoticia(n.criadoEm)}`}
                  </p>
                  {n.status === 'rascunho' && n.observacaoRevisao && (
                    <p className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[#7A4F17]">
                      <strong>Devolvida:</strong> {n.observacaoRevisao}
                    </p>
                  )}
                  {n.status === 'publicada' && (
                    <div className="flex items-center gap-3 text-slate-600 font-semibold">
                      <span className="flex items-center gap-1" title="Colaboradores que leram">
                        <Eye className="w-3.5 h-3.5" /> {e.leituras}
                      </span>
                      <ResumoReacoes reacoes={e.reacoes} />
                    </div>
                  )}
                  <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
                    {podeEditar && (
                      <button type="button" onClick={() => abrirEditor(n)} className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                        {abrindoId === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                        {n.status === 'sugerida' && ehAdmin ? 'Revisar' : 'Editar'}
                      </button>
                    )}
                    {n.status === 'publicada' && (
                      <>
                        <button type="button" onClick={() => setComentariosDe(n)} className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> Comentários
                        </button>
                        {ehAdmin && (
                          <button type="button" onClick={() => setInteracoesDe(n)} className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Quem interagiu
                          </button>
                        )}
                        {ehAdmin && (
                          <button
                            type="button"
                            onClick={() => divulgar(n)}
                            disabled={!!preparandoEnvio}
                            className="px-2.5 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg font-bold hover:bg-emerald-50 flex items-center gap-1 disabled:opacity-50"
                          >
                            {preparandoEnvio === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />} Divulgar
                          </button>
                        )}
                        {ehAdmin && (
                          <button
                            type="button"
                            onClick={() => enviarParaGrupo(n)}
                            title="Abre o WhatsApp com a mensagem pronta para você escolher o grupo (a mensagem também fica copiada)"
                            className="px-2.5 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg font-bold hover:bg-emerald-50 flex items-center gap-1"
                          >
                            <Users className="w-3.5 h-3.5" /> Enviar para grupo
                          </button>
                        )}
                      </>
                    )}
                    {ehAdmin && n.status === 'publicada' && (
                      <button type="button" onClick={() => mudarStatus(n, { destaque: !n.destaque })} className="p-1.5 text-slate-400 hover:text-[#92611F]" title={n.destaque ? 'Tirar do destaque' : 'Fixar no topo'}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {ehAdmin && n.status === 'publicada' && (
                      <button type="button" onClick={() => mudarStatus(n, { status: 'arquivada', destaque: false }, 'Tirar esta notícia do ar? Ela fica guardada em Arquivadas.')} className="p-1.5 text-slate-400 hover:text-slate-700" title="Arquivar (tirar do ar)">
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {ehAdmin && n.status === 'arquivada' && (
                      <button type="button" onClick={() => mudarStatus(n, { status: 'publicada' })} className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> Publicar de novo
                      </button>
                    )}
                    {(ehAdmin || (n.criadoPor === eu && n.status === 'rascunho')) && (
                      <button type="button" onClick={() => excluir(n)} className="p-1.5 text-slate-400 hover:text-rose-600 ml-auto" title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <NoticiaEditorModal
          inicial={editando}
          ehAdmin={ehAdmin}
          usuarioNome={eu}
          onClose={() => setEditando(null)}
          onSalvo={(salva) => {
            setEditando(null);
            setNoticias((prev) => [{ ...salva, blocos: [] }, ...prev.filter((x) => x.id !== salva.id)]);
            setAba(salva.status === 'publicada' ? 'publicadas' : salva.status === 'sugerida' ? 'aprovar' : 'rascunhos');
          }}
        />
      )}

      {interacoesDe && <InteracoesModal noticia={interacoesDe} colaboradores={colaboradores} onClose={() => setInteracoesDe(null)} />}

      {comentariosDe && <ComentariosModal noticia={comentariosDe} ehAdmin={ehAdmin} moderador={eu} onClose={() => setComentariosDe(null)} onMudou={carregar} />}

      {envio && <EnvioWhatsAppEmMassaModal titulo={envio.titulo} itens={envio.itens} onClose={() => setEnvio(null)} />}
    </div>
  );
};

const ListaComentariosPendentes: React.FC<{
  comentarios: ComentarioNoticia[];
  titulos: Map<string, string>;
  onModerar: (c: ComentarioNoticia, s: 'aprovado' | 'oculto') => void;
}> = ({ comentarios, titulos, onModerar }) =>
  comentarios.length === 0 ? (
    <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">Nenhum comentário aguardando aprovação.</p>
  ) : (
    <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
      {comentarios.map((c) => (
        <div key={c.id} className="p-4 flex flex-wrap items-start gap-3 text-xs">
          <div className="flex-1 min-w-[220px]">
            <p className="text-[11px] text-slate-500">
              <strong className="text-slate-700">{c.autorNome}</strong> em “{titulos.get(c.noticiaId) || 'notícia'}” · {dataNoticia(c.criadoEm, true)}
            </p>
            <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">{c.texto}</p>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onModerar(c, 'aprovado')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Aprovar
            </button>
            <button type="button" onClick={() => onModerar(c, 'oculto')} className="px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5" /> Ocultar
            </button>
          </div>
        </div>
      ))}
    </div>
  );

/** Todos os comentários de uma notícia (o administrador aprova, oculta ou reexibe). */
const ComentariosModal: React.FC<{ noticia: Noticia; ehAdmin: boolean; moderador: string; onClose: () => void; onMudou: () => void }> = ({
  noticia,
  ehAdmin,
  moderador,
  onClose,
  onMudou,
}) => {
  const [lista, setLista] = useState<ComentarioNoticia[] | null>(null);
  useEffect(() => {
    getComentarios(noticia.id)
      .then(setLista)
      .catch((err) => {
        console.error(err);
        setLista([]);
      });
  }, [noticia.id]);

  const mudar = async (c: ComentarioNoticia, status: 'aprovado' | 'oculto') => {
    try {
      await moderarComentario(c.id, status, moderador);
      setLista((prev) => (prev || []).map((x) => (x.id === c.id ? { ...x, status } : x)));
      onMudou();
    } catch (err) {
      console.error(err);
      alert('Não foi possível moderar o comentário.');
    }
  };

  const visiveis = (lista || []).filter((c) => ehAdmin || c.status === 'aprovado');
  const rotulo = { pendente: 'Aguardando', aprovado: 'Aprovado', oculto: 'Oculto' } as const;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">Comentários</h2>
            <p className="text-slate-500">{noticia.titulo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2">
          {lista === null ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : visiveis.length === 0 ? (
            <p className="text-slate-500">Nenhum comentário ainda.</p>
          ) : (
            visiveis.map((c) => (
              <div key={c.id} className="p-3 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500">
                    <strong className="text-slate-700">{c.autorNome}</strong> · {dataNoticia(c.criadoEm, true)}
                  </p>
                  {ehAdmin && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'aprovado' ? 'bg-emerald-50 text-emerald-700' : c.status === 'oculto' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-[#92611F]'}`}>
                      {rotulo[c.status]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">{c.texto}</p>
                {ehAdmin && (
                  <div className="mt-2 flex gap-1.5">
                    {c.status !== 'aprovado' && (
                      <button type="button" onClick={() => mudar(c, 'aprovado')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold">
                        Aprovar
                      </button>
                    )}
                    {c.status !== 'oculto' && (
                      <button type="button" onClick={() => mudar(c, 'oculto')} className="px-2.5 py-1 border border-slate-200 rounded-lg font-bold text-slate-600">
                        Ocultar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
