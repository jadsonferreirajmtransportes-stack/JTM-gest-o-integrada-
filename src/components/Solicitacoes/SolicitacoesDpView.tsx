import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Loader2, Search, Paperclip, Send, MessageCircle, Palmtree, X, ExternalLink, Inbox } from 'lucide-react';
import { Colaborador, ProgramacaoFerias, UsuarioLogin } from '../../types';
import {
  MensagemSolicitacao,
  ROTULO_STATUS,
  SolicitacaoDp,
  StatusSolicitacao,
  TIPOS_SOLICITACAO,
  atualizarStatusSolicitacao,
  getMensagensSolicitacao,
  getSolicitacoesDp,
  linkAnexo,
  marcarLidaPeloDp,
  responderComoDp,
  tituloTipo,
} from '../../utils/solicitacoesApi';
import { linkUnicoDe } from '../../utils/linkUnico';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';
import { calcPeriodoAquisitivo, calcPrazoLimiteGozo } from '../../utils/formatters';
import { estiloStatus, resumoDados } from '../Portal/PortalSolicitacoes';

type Filtro = 'pendentes' | 'respondidas' | 'encerradas' | 'todas';

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** "Fale com o DP": fila das solicitações abertas pelos colaboradores no portal. Só o DP vê. */
export const SolicitacoesDpView: React.FC<{
  colaboradores: Colaborador[];
  currentUser?: UsuarioLogin | null;
  onSaveFerias?: (f: ProgramacaoFerias) => Promise<void> | void;
}> = ({ colaboradores, currentUser, onSaveFerias }) => {
  const [lista, setLista] = useState<SolicitacaoDp[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');
  const [abertaId, setAbertaId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLista(await getSolicitacoesDp());
      setErro(null);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível carregar as solicitações. Se acabou de ser instalado, confira se a migração 069 foi rodada no Supabase.');
      setLista([]);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const grupos: Record<Filtro, (s: SolicitacaoDp) => boolean> = {
    pendentes: (s) => s.status === 'aberta' || s.status === 'em_analise',
    respondidas: (s) => s.status === 'respondida',
    encerradas: (s) => s.status === 'concluida' || s.status === 'recusada',
    todas: () => true,
  };
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lista || []).filter(
      (s) => grupos[filtro](s) && (!tipo || s.tipo === tipo) && (!termo || `${s.colaboradorNome} ${s.assunto} ${s.protocolo}`.toLowerCase().includes(termo))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, filtro, tipo, busca]);
  const contar = (f: Filtro) => (lista || []).filter(grupos[f]).length;
  const naoLidas = (lista || []).filter((s) => !s.lidaPeloDp).length;
  const aberta = lista?.find((s) => s.id === abertaId) || null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C48229] to-[#7A4F17] text-white flex items-center justify-center">
          <MessageSquareText className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fale com o DP</h1>
          <p className="text-xs text-slate-500">Contestações, pedidos de férias, documentos e atualização de dados enviados pelos colaboradores no link pessoal. Só o DP vê.</p>
        </div>
        {naoLidas > 0 && <span className="px-3 py-1.5 rounded-full bg-[#C48229] text-white text-xs font-black">{naoLidas} com mensagem nova</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(
            [
              ['pendentes', 'Pendentes'],
              ['respondidas', 'Respondidas'],
              ['encerradas', 'Encerradas'],
              ['todas', 'Todas'],
            ] as [Filtro, string][]
          ).map(([id, rotulo]) => (
            <button key={id} type="button" onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filtro === id ? 'bg-[#C48229] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {rotulo} <span className="opacity-70">({contar(id)})</span>
            </button>
          ))}
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="py-2 px-2 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="">Todos os tipos</option>
          {TIPOS_SOLICITACAO.map((t) => (
            <option key={t.tipo} value={t.tipo}>
              {t.titulo}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador, assunto ou nº..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs w-64" />
        </div>
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}

      {lista === null ? (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </p>
      ) : visiveis.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">
          <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          Nenhuma solicitação aqui.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {visiveis.map((s) => (
            <button key={s.id} type="button" onClick={() => setAbertaId(s.id)} className="w-full text-left normal-case p-4 flex flex-wrap items-center gap-3 hover:bg-slate-50 text-xs">
              {!s.lidaPeloDp ? <span className="w-2.5 h-2.5 rounded-full bg-[#C48229] shrink-0" title="Mensagem nova" /> : <span className="w-2.5 h-2.5 shrink-0" />}
              <div className="flex-1 min-w-[220px]">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">
                  {tituloTipo(s.tipo)} · nº {s.protocolo}
                </p>
                <p className={`text-sm text-slate-900 ${s.lidaPeloDp ? 'font-semibold' : 'font-black'}`}>
                  {nomeBonito(s.colaboradorNome)} — {s.assunto}
                </p>
                {resumoDados(s.tipo, s.dados).length > 0 && <p className="text-[11px] text-slate-500">{resumoDados(s.tipo, s.dados).join(' · ')}</p>}
              </div>
              <span className="text-[11px] text-slate-500">{dataHora(s.atualizadoEm)}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${estiloStatus(s.status)}`}>{ROTULO_STATUS[s.status]}</span>
            </button>
          ))}
        </div>
      )}

      {aberta && (
        <SolicitacaoDpModal
          s={aberta}
          colaborador={colaboradores.find((c) => c.id === aberta.colaboradorId)}
          atendente={currentUser?.nome}
          onSaveFerias={onSaveFerias}
          onClose={() => setAbertaId(null)}
          onMudou={(parcial) => setLista((prev) => (prev || []).map((x) => (x.id === aberta.id ? { ...x, ...parcial } : x)))}
        />
      )}
    </div>
  );
};

const SolicitacaoDpModal: React.FC<{
  s: SolicitacaoDp;
  colaborador?: Colaborador;
  atendente?: string;
  onSaveFerias?: (f: ProgramacaoFerias) => Promise<void> | void;
  onClose: () => void;
  onMudou: (p: Partial<SolicitacaoDp>) => void;
}> = ({ s, colaborador, atendente, onSaveFerias, onClose, onMudou }) => {
  const [mensagens, setMensagens] = useState<MensagemSolicitacao[] | null>(null);
  const [texto, setTexto] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [novoStatus, setNovoStatus] = useState<StatusSolicitacao>('respondida');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criandoFerias, setCriandoFerias] = useState(false);

  useEffect(() => {
    getMensagensSolicitacao(s.id)
      .then(setMensagens)
      .catch((err) => {
        console.error(err);
        setMensagens([]);
      });
    if (!s.lidaPeloDp) {
      marcarLidaPeloDp(s.id).catch(console.error);
      onMudou({ lidaPeloDp: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id]);

  const abrirAnexo = async (caminho?: string, url?: string) => {
    try {
      window.open(caminho ? await linkAnexo(caminho) : url, '_blank', 'noopener');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível abrir o anexo.');
    }
  };

  const enviar = async (status: StatusSolicitacao = novoStatus) => {
    if (!texto.trim() && arquivos.length === 0) {
      setErro('Escreva a resposta ou anexe um arquivo.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const m = await responderComoDp(s, texto, arquivos, status, atendente);
      setMensagens((prev) => [...(prev || []), m]);
      setTexto('');
      setArquivos([]);
      onMudou({ status, atualizadoEm: new Date().toISOString(), lidaPeloColaborador: false, atendente });
      if (colaborador?.telefoneWhatsapp && window.confirm('Resposta enviada. Avisar o colaborador pelo WhatsApp agora?')) await avisarWhatsApp();
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar a resposta.');
    } finally {
      setEnviando(false);
    }
  };

  const mudarStatus = async (status: StatusSolicitacao) => {
    try {
      await atualizarStatusSolicitacao(s.id, status, atendente);
      onMudou({ status, atualizadoEm: new Date().toISOString() });
    } catch (err) {
      console.error(err);
      alert('Não foi possível mudar a situação.');
    }
  };

  const avisarWhatsApp = async () => {
    if (!colaborador?.telefoneWhatsapp) return alert('Colaborador sem WhatsApp no cadastro.');
    const link = await linkUnicoDe(colaborador.id, `solicitacao:${s.id}`);
    const url = buildWhatsAppLink(
      colaborador.telefoneWhatsapp,
      `Olá, ${nomeBonito(colaborador.nomeCompleto).split(' ')[0]}! O DP respondeu a sua solicitação nº ${s.protocolo} (${s.assunto}). Veja pelo seu link pessoal:\n${link}\n\nJM Transportes — Departamento Pessoal`
    );
    if (url) window.open(url, 'jmt-whatsapp');
  };

  const criarProgramacaoFerias = async () => {
    if (!colaborador || !onSaveFerias) return;
    const d = s.dados || {};
    const dias = Number(d.dias) || 30;
    const vender = !!d.venderDias;
    const aquisitivo = colaborador.dataAdmissao ? calcPeriodoAquisitivo(colaborador.dataAdmissao) : undefined;
    const inicio: string | undefined = d.inicio || undefined;
    const diasGozo = vender ? Math.max(0, dias - 10) || 20 : dias;
    if (!window.confirm(`Criar a programação de férias de ${nomeBonito(colaborador.nomeCompleto)}${inicio ? ` a partir de ${inicio.split('-').reverse().join('/')}` : ' (a programar, com a preferência do colaborador)'}? Depois ajuste em Férias, se precisar.`)) return;
    setCriandoFerias(true);
    try {
      await onSaveFerias({
        id: `ferias-${Date.now()}`,
        colaboradorId: colaborador.id,
        periodoAquisitivoInicio: aquisitivo?.inicio,
        periodoAquisitivoFim: aquisitivo?.fim,
        prazoLimiteGozo: aquisitivo ? calcPrazoLimiteGozo(aquisitivo.fim) : undefined,
        diasDireito: 30,
        abonoPecuniario: vender,
        diasAbono: vender ? 10 : 0,
        diasGozados: diasGozo,
        dataInicio: inicio,
        dataFim: inicio ? somarDias(inicio, diasGozo - 1) : undefined,
        status: inicio ? 'Programada' : 'A programar',
        observacoes: `Pedido pelo portal (nº ${s.protocolo})${d.mes ? ` — preferência: ${d.mes.split('-').reverse().join('/')}` : ''}.`,
      });
      setTexto(
        inicio
          ? `Suas férias foram programadas a partir de ${inicio.split('-').reverse().join('/')} (${diasGozo} dias${vender ? ', com venda de 10 dias' : ''}). Em breve você recebe a programação para assinar em Documentos.`
          : 'Recebemos seu pedido de férias e ele já está na nossa programação. Em breve confirmamos a data por aqui.'
      );
      setNovoStatus(inicio ? 'concluida' : 'em_analise');
    } catch (err) {
      console.error(err);
      alert('Não foi possível criar a programação de férias.');
    } finally {
      setCriandoFerias(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2 sm:p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">
              {tituloTipo(s.tipo)} · nº {s.protocolo} · aberta em {dataHora(s.criadoEm)}
            </p>
            <h2 className="text-base font-black text-slate-900">{s.assunto}</h2>
            <p className="text-slate-600">
              {nomeBonito(s.colaboradorNome)}
              {colaborador?.funcaoCargo ? ` · ${nomeBonito(colaborador.funcaoCargo)}` : ''}
              {colaborador?.setor ? ` · ${nomeBonito(colaborador.setor)}` : ''}
            </p>
            {resumoDados(s.tipo, s.dados).map((l) => (
              <p key={l} className="text-slate-600">
                • {l}
              </p>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select value={s.status} onChange={(e) => mudarStatus(e.target.value as StatusSolicitacao)} className={`py-1 px-2 rounded-lg border text-[11px] font-bold ${estiloStatus(s.status)}`}>
              {(Object.keys(ROTULO_STATUS) as StatusSolicitacao[]).map((st) => (
                <option key={st} value={st}>
                  {ROTULO_STATUS[st]}
                </option>
              ))}
            </select>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2 bg-slate-50">
          {s.tipo === 'ferias' && onSaveFerias && (
            <button
              type="button"
              onClick={criarProgramacaoFerias}
              disabled={criandoFerias || !colaborador}
              className="w-full mb-2 px-3 py-2 bg-white border border-[#C48229] text-[#92611F] rounded-xl font-bold flex items-center justify-center gap-1.5 hover:bg-amber-50 disabled:opacity-50"
            >
              {criandoFerias ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palmtree className="w-4 h-4" />}
              Aprovar e criar a programação de férias
            </button>
          )}
          {mensagens === null ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            mensagens.map((m) => {
              const doDp = m.autor === 'dp';
              return (
                <div key={m.id} className={`flex ${doDp ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs ${doDp ? 'bg-amber-50 border border-amber-200 rounded-tr-sm' : 'bg-white border border-slate-200 rounded-tl-sm'}`}>
                    <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                      {doDp ? m.autorNome || 'DP' : nomeBonito(s.colaboradorNome)} · {dataHora(m.criadoEm)}
                    </p>
                    {m.texto && <p className="text-sm text-slate-800 whitespace-pre-line break-words">{m.texto}</p>}
                    {m.anexos.map((a, i) => (
                      <button key={i} type="button" onClick={() => abrirAnexo(a.caminho, a.url)} className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#92611F] hover:underline">
                        <Paperclip className="w-3.5 h-3.5" /> {a.nome} <ExternalLink className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-200 space-y-2">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Escreva a resposta para o colaborador..." className="w-full p-2.5 border border-slate-300 rounded-xl text-sm" />
          {arquivos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {arquivos.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg">
                  <Paperclip className="w-3 h-3" /> {a.name}
                  <button type="button" onClick={() => setArquivos((p) => p.filter((_, k) => k !== i))} className="text-slate-400 hover:text-rose-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-lg font-bold text-[#92611F] cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" /> Anexar (ex.: declaração em PDF)
              <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { setArquivos((p) => [...p, ...Array.from(e.target.files || [])].slice(0, 3)); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={avisarWhatsApp} disabled={!colaborador?.telefoneWhatsapp} className="px-3 py-2 border border-emerald-200 text-emerald-700 rounded-lg font-bold flex items-center gap-1.5 hover:bg-emerald-50 disabled:opacity-40" title="Avisar o colaborador pelo WhatsApp, com o link pessoal abrindo nesta solicitação">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as StatusSolicitacao)} className="ml-auto py-2 px-2 border border-slate-200 rounded-lg bg-white">
              <option value="respondida">Responder (aguarda o colaborador)</option>
              <option value="em_analise">Responder e manter em análise</option>
              <option value="concluida">Responder e concluir</option>
              <option value="recusada">Responder como não atendida</option>
            </select>
            <button type="button" onClick={() => enviar()} disabled={enviando} className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar
            </button>
          </div>
          <p className="text-[10px] text-slate-400">Os anexos do DP ficam disponíveis para o colaborador baixar por 30 dias.</p>
        </div>
      </div>
    </div>
  );
};
