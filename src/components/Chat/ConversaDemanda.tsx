import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText, Loader2, MessageCircle, Paperclip, Send, X } from 'lucide-react';
import { Colaborador } from '../../types';
import { linkUnicoDe } from '../../utils/linkUnico';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';
import {
  MensagemSolicitacao,
  ROTULO_STATUS,
  SolicitacaoDp,
  StatusSolicitacao,
  atualizarStatusSolicitacao,
  getMensagensSolicitacao,
  linkAnexo,
  marcarLidaPeloDp,
  responderComoDp,
  tituloTipo,
} from '../../utils/solicitacoesApi';
import { estiloStatus, resumoDados } from '../Portal/PortalSolicitacoes';

// Uma demanda do "Fale com o DP" aberta dentro do Chat da gestão (079). Lê e grava nas
// mesmas tabelas do Fale com o DP: o que o DP escreve aqui aparece no portal do
// colaborador, e o que ele escreve lá chega aqui na hora (tempo real, via ChatView).

const nomeBonito = (n: string) => n.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
const iniciais = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const hora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const encerrada = (s: StatusSolicitacao) => s === 'concluida' || s === 'recusada';

export const ConversaDemanda: React.FC<{
  demanda: SolicitacaoDp;
  /** Nome de quem responde (vai junto da resposta, como no Fale com o DP). */
  atendente?: string;
  /** Muda quando chega mensagem nova desta demanda (tempo real) — recarrega a conversa. */
  sinalNovaMensagem: number;
  onVoltar: () => void;
  onMudou: () => void;
  onAbrirNoDp?: () => void;
  /** Cadastro do colaborador (para avisar pelo WhatsApp com o link pessoal). */
  colaborador?: Colaborador;
}> = ({ demanda: s, atendente, sinalNovaMensagem, onVoltar, onMudou, onAbrirNoDp, colaborador }) => {
  const avisarWhatsApp = async () => {
    if (!colaborador?.telefoneWhatsapp) return alert('Colaborador sem WhatsApp no cadastro.');
    const janela = window.open('', 'jmt-whatsapp');
    try {
      const link = await linkUnicoDe(colaborador.id, `solicitacao:${s.id}`);
      const url = buildWhatsAppLink(
        colaborador.telefoneWhatsapp,
        `Olá, ${nomeBonito(colaborador.nomeCompleto).split(' ')[0]}! O DP respondeu sobre "${s.assunto}" (nº ${s.protocolo}). Veja pelo seu link pessoal:\n${link}\n\nJM Transportes — Departamento Pessoal`
      );
      if (url && janela) janela.location.href = url;
      else janela?.close();
    } catch (err) {
      janela?.close();
      alert('Não foi possível montar o link pessoal agora.');
    }
  };
  const [mensagens, setMensagens] = useState<MensagemSolicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;
    getMensagensSolicitacao(s.id)
      .then((l) => !cancelado && setMensagens(l))
      .catch((err) => console.error(err))
      .finally(() => !cancelado && setCarregando(false));
    if (!s.lidaPeloDp) marcarLidaPeloDp(s.id).then(onMudou).catch(() => undefined);
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id, sinalNovaMensagem]);

  useEffect(() => {
    setMensagens([]);
    setTexto('');
    setArquivos([]);
    setErro(null);
    setCarregando(true);
  }, [s.id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  const enviar = async (concluir: boolean) => {
    if (!texto.trim() && arquivos.length === 0) return;
    setEnviando(true);
    setErro(null);
    try {
      const novoStatus: StatusSolicitacao = concluir ? 'concluida' : 'respondida';
      const msg = await responderComoDp(s, texto, arquivos, novoStatus, atendente);
      setMensagens((p) => (p.some((m) => m.id === msg.id) ? p : [...p, msg]));
      setTexto('');
      setArquivos([]);
      onMudou();
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const mudarStatus = async (status: StatusSolicitacao) => {
    try {
      await atualizarStatusSolicitacao(s.id, status, atendente);
      onMudou();
    } catch (err) {
      console.error(err);
      alert('Não foi possível mudar a situação. Tente de novo.');
    }
  };

  const abrirAnexo = async (a: { caminho?: string; url?: string }) => {
    try {
      const url = a.url || (a.caminho ? await linkAnexo(a.caminho) : '');
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível abrir o anexo.');
    }
  };

  const dados = resumoDados(s.tipo, s.dados);

  return (
    <>
      <div className="p-3 border-b border-slate-100 flex items-center gap-2.5 shrink-0">
        <button type="button" onClick={onVoltar} className="md:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Voltar para as conversas">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C48229] to-[#7A4F17] text-white flex items-center justify-center font-black text-[11px] shrink-0">
          {iniciais(s.colaboradorNome)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-slate-900 truncate">{nomeBonito(s.colaboradorNome)}</p>
          <p className="text-[10px] text-slate-500 truncate">
            <span className="font-bold text-[#92611F]">Fale com o DP</span> · {tituloTipo(s.tipo)} · {s.assunto} · nº {s.protocolo}
          </p>
            <select
              value={s.status}
              onChange={(e) => mudarStatus(e.target.value as StatusSolicitacao)}
              className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${estiloStatus(s.status)}`}
              title="Situação da demanda (o colaborador vê no portal)"
            >
              {(Object.keys(ROTULO_STATUS) as StatusSolicitacao[]).map((st) => (
                <option key={st} value={st}>
                  {ROTULO_STATUS[st]}
                </option>
              ))}
            </select>
        </div>
        {colaborador?.telefoneWhatsapp && (
          <button type="button" onClick={avisarWhatsApp} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 shrink-0" title="Avisar pelo WhatsApp (com o link pessoal abrindo esta conversa)">
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
        {onAbrirNoDp && (
          <button type="button" onClick={onAbrirNoDp} className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-[#92611F] hover:bg-amber-50" title="Abrir no Fale com o DP (ex.: criar a programação de férias)">
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
        {dados.length > 0 && (
          <div className="mx-auto max-w-md text-center text-[11px] text-slate-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{dados.join(' · ')}</div>
        )}
        {carregando && <p className="text-[11px] text-slate-400 text-center">Carregando...</p>}
        {mensagens.map((m) => {
          const doDp = m.autor === 'dp';
          return (
            <div key={m.id} className={`flex ${doDp ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-2xs ${doDp ? 'bg-[#C48229] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
                <p className={`text-[10px] font-bold mb-0.5 ${doDp ? 'text-white/80' : 'text-[#92611F]'}`}>
                  {doDp ? m.autorNome || 'Departamento Pessoal' : nomeBonito(m.autorNome || s.colaboradorNome)}
                </p>
                {m.texto && <p className="whitespace-pre-wrap break-words normal-case" data-texto-livre>{m.texto}</p>}
                {m.anexos.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => abrirAnexo(a)}
                    className={`mt-1.5 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold normal-case tracking-normal ${doDp ? 'bg-white/15' : 'bg-slate-50 border border-slate-200'}`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[180px]">{a.nome}</span>
                  </button>
                ))}
                <p className={`text-[9px] mt-1 text-right ${doDp ? 'text-white/70' : 'text-slate-400'}`}>{hora(m.criadoEm)}</p>
              </div>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>

      <div className="p-3 border-t border-slate-100 shrink-0 space-y-2">
        {encerrada(s.status) && (
          <p className="text-[10px] text-slate-500">
            Demanda {ROTULO_STATUS[s.status].toLowerCase()}: o colaborador não consegue mais responder nela. Se você escrever, ela volta para "Respondida".
          </p>
        )}
        {arquivos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {arquivos.map((a, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-semibold text-slate-600">
                <FileText className="w-3 h-3" />
                <span className="max-w-[140px] truncate">{a.name}</span>
                <button type="button" onClick={() => setArquivos((p) => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {erro && <p className="text-[11px] text-rose-600 font-semibold">{erro}</p>}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => arquivoRef.current?.click()}
            disabled={arquivos.length >= 3}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 shrink-0"
            title="Anexar foto ou PDF (até 3)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={arquivoRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const novos = Array.from(e.target.files || []);
              setArquivos((p) => [...p, ...novos].slice(0, 3));
              e.target.value = '';
            }}
          />
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviar(false);
              }
            }}
            rows={1}
            data-texto-livre
            data-no-uppercase="true"
            placeholder="Responder ao colaborador..."
            className="flex-1 min-w-0 resize-none max-h-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40"
          />
          <button
            type="button"
            onClick={() => enviar(false)}
            disabled={enviando || (!texto.trim() && arquivos.length === 0)}
            className="p-2.5 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white disabled:opacity-40 shrink-0"
            title="Enviar resposta (o colaborador vê no portal)"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400">O colaborador vê a resposta no portal (e recebe aviso no app, se ativou).</p>
          <button
            type="button"
            onClick={() => enviar(true)}
            disabled={enviando || (!texto.trim() && arquivos.length === 0)}
            className="text-[10px] font-bold text-emerald-700 hover:underline disabled:opacity-40 normal-case tracking-normal shrink-0"
          >
            Enviar e concluir
          </button>
        </div>
      </div>
    </>
  );
};
