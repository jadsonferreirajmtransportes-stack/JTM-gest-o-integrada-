import React, { useEffect, useState } from 'react';
import { Loader2, ChevronLeft, Plus, Send, Paperclip, X, MessageSquareText, CheckCircle2, Clock, FileText, Download } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import {
  AnexoSolicitacao,
  ROTULO_STATUS,
  SolicitacaoPortal,
  SolicitacaoResumo,
  StatusSolicitacao,
  TIPOS_SOLICITACAO,
  TipoSolicitacao,
  enviarAnexoPortal,
  portalAbrirSolicitacao,
  portalResponderSolicitacao,
  portalSolicitacao,
  portalSolicitacoes,
  tituloTipo,
} from '../../utils/solicitacoesApi';
import { DocumentoPortal, portalDocumentos } from '../../utils/portalColaboradorApi';

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const mesExtenso = (ym?: string) => {
  if (!ym) return '';
  const [a, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${n}/${a}`;
};

export const estiloStatus = (s: StatusSolicitacao) =>
  s === 'concluida'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'respondida'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : s === 'recusada'
        ? 'bg-slate-100 text-slate-500 border-slate-200'
        : 'bg-amber-50 text-[#92611F] border-amber-200';

/** Resumo dos campos do tipo (ex.: férias: mês, dias, venda). */
export function resumoDados(tipo: string, d: Record<string, any>): string[] {
  const linhas: string[] = [];
  if (tipo === 'ferias') {
    if (d.inicio) linhas.push(`Início desejado: ${dataBr(d.inicio)}`);
    else if (d.mes) linhas.push(`Mês desejado: ${mesExtenso(d.mes)}`);
    if (d.dias) linhas.push(`Dias de férias: ${d.dias}`);
    if (d.venderDias) linhas.push('Quer vender 10 dias (abono)');
  }
  if (d.documentoTitulo) linhas.push(`Documento: ${d.documentoTitulo}`);
  return linhas;
}

/** "Fale com o DP" no portal do colaborador. */
export const PortalSolicitacoes: React.FC<{ credenciais: CredenciaisPortal; solicitacaoInicial?: string; onMudou?: (novas: number) => void }> = ({
  credenciais,
  solicitacaoInicial,
  onMudou,
}) => {
  const [lista, setLista] = useState<SolicitacaoResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abertaId, setAbertaId] = useState<string | null>(solicitacaoInicial || null);
  const [nova, setNova] = useState(false);

  const carregar = () =>
    portalSolicitacoes(credenciais)
      .then((l) => {
        setLista(l);
        onMudou?.(l.filter((s) => s.novaResposta).length);
      })
      .catch((err) => {
        console.error(err);
        setErro(err instanceof Error ? err.message : 'Não foi possível carregar.');
        setLista([]);
      });

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais]);

  if (nova) {
    return (
      <NovaSolicitacao
        credenciais={credenciais}
        onVoltar={() => setNova(false)}
        onCriada={(id) => {
          setNova(false);
          carregar();
          setAbertaId(id);
        }}
      />
    );
  }

  if (abertaId) {
    return (
      <SolicitacaoAberta
        credenciais={credenciais}
        id={abertaId}
        onVoltar={() => {
          setAbertaId(null);
          carregar();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
          <MessageSquareText className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-black text-slate-900">Fale com o DP</h2>
          <p className="text-xs text-slate-500">Conteste um valor, peça férias, um documento ou atualize seus dados. Só o Departamento Pessoal vê.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setNova(true)}
        className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Nova solicitação
      </button>
      {lista === null ? (
        <p className="text-xs text-slate-500 flex items-center gap-2 p-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </p>
      ) : erro ? (
        <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>
      ) : lista.length === 0 ? (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Você ainda não abriu nenhuma solicitação.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
          {lista.map((s) => (
            <button key={s.id} type="button" onClick={() => setAbertaId(s.id)} className="w-full text-left normal-case p-4 flex items-center gap-3 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">
                  {tituloTipo(s.tipo)} · nº {s.protocolo}
                </p>
                <p className={`text-sm text-slate-900 truncate ${s.novaResposta ? 'font-black' : 'font-semibold'}`}>{s.assunto}</p>
                <p className="text-[11px] text-slate-500">Atualizada em {dataHora(s.atualizadoEm)}</p>
              </div>
              {s.novaResposta ? (
                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0">Nova resposta</span>
              ) : (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${estiloStatus(s.status)}`}>{ROTULO_STATUS[s.status]}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Escolhe arquivos e envia para a pasta do link (até 3). */
const SeletorAnexos: React.FC<{ token: string; anexos: AnexoSolicitacao[]; onChange: (a: AnexoSolicitacao[]) => void }> = ({ token, anexos, onChange }) => {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const escolher = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setErro(null);
    setEnviando(true);
    const novos: AnexoSolicitacao[] = [];
    for (const arq of Array.from(lista).slice(0, 3 - anexos.length)) {
      try {
        novos.push(await enviarAnexoPortal(token, arq));
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.');
      }
    }
    setEnviando(false);
    if (novos.length) onChange([...anexos, ...novos]);
  };
  return (
    <div className="space-y-1.5">
      {anexos.map((a, i) => (
        <div key={a.caminho || i} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span className="flex-1 truncate">{a.nome}</span>
          <button type="button" onClick={() => onChange(anexos.filter((_, k) => k !== i))} className="p-0.5 text-slate-400 hover:text-rose-600" title="Tirar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {anexos.length < 3 && (
        <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-[#92611F] bg-white ${enviando ? 'opacity-60' : 'cursor-pointer'}`}>
          {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          {enviando ? 'Enviando...' : 'Anexar foto ou PDF'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" multiple className="hidden" disabled={enviando} onChange={(e) => { escolher(e.target.files); e.target.value = ''; }} />
        </label>
      )}
      {erro && <p className="text-[11px] text-rose-700 font-semibold">{erro}</p>}
    </div>
  );
};

const NovaSolicitacao: React.FC<{ credenciais: CredenciaisPortal; onVoltar: () => void; onCriada: (id: string) => void }> = ({ credenciais, onVoltar, onCriada }) => {
  const [tipo, setTipo] = useState<TipoSolicitacao | null>(null);
  const [assunto, setAssunto] = useState('');
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState<AnexoSolicitacao[]>([]);
  const [ferias, setFerias] = useState<{ modo: 'mes' | 'data'; mes: string; inicio: string; dias: number; venderDias: boolean }>({ modo: 'mes', mes: '', inicio: '', dias: 30, venderDias: false });
  const [documentos, setDocumentos] = useState<DocumentoPortal[]>([]);
  const [documentoId, setDocumentoId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const def = TIPOS_SOLICITACAO.find((t) => t.tipo === tipo);

  useEffect(() => {
    if (tipo === 'contestacao') portalDocumentos(credenciais).then(setDocumentos).catch(() => setDocumentos([]));
  }, [tipo, credenciais]);

  const escolherTipo = (t: TipoSolicitacao) => {
    setTipo(t);
    const d = TIPOS_SOLICITACAO.find((x) => x.tipo === t)!;
    setAssunto(d.assuntos.length === 1 ? d.assuntos[0] : '');
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo) return;
    setErro(null);
    if (!assunto) return setErro('Escolha o assunto.');
    if (tipo === 'ferias' && (ferias.modo === 'mes' ? !ferias.mes : !ferias.inicio)) return setErro('Informe o mês ou a data em que gostaria de sair de férias.');
    if (tipo !== 'ferias' && !texto.trim()) return setErro('Conte o que aconteceu ou o que você precisa.');
    const doc = documentos.find((d) => d.id === documentoId);
    const dados: Record<string, any> =
      tipo === 'ferias'
        ? { ...(ferias.modo === 'mes' ? { mes: ferias.mes } : { inicio: ferias.inicio }), dias: ferias.dias, venderDias: ferias.venderDias }
        : doc
          ? { documentoId: doc.id, documentoTitulo: doc.titulo }
          : {};
    setEnviando(true);
    try {
      const r = await portalAbrirSolicitacao(credenciais, { tipo, assunto, dados, texto, anexos });
      onCriada(r.id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3" data-texto-livre="true">
      <button type="button" onClick={tipo ? () => setTipo(null) : onVoltar} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> {tipo ? 'Escolher outro tipo' : 'Minhas solicitações'}
      </button>
      {!tipo ? (
        <div className="space-y-2">
          <p className="text-sm font-black text-slate-900">O que você precisa?</p>
          {TIPOS_SOLICITACAO.map((t) => (
            <button key={t.tipo} type="button" onClick={() => escolherTipo(t.tipo)} className="w-full text-left normal-case bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-[#C48229]">
              <p className="text-sm font-black text-slate-900">{t.titulo}</p>
              <p className="text-[11px] text-slate-500">{t.descricao}</p>
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={enviar} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs text-xs">
          <p className="text-sm font-black text-slate-900">{def?.titulo}</p>
          {def && def.assuntos.length > 1 && (
            <label className="block">
              <span className="font-bold text-slate-700">Assunto</span>
              <select value={assunto} onChange={(e) => setAssunto(e.target.value)} className="mt-1 w-full p-3 border border-slate-300 rounded-xl bg-white text-sm">
                <option value="">Escolha...</option>
                {def.assuntos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          )}

          {tipo === 'ferias' && (
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
                {(
                  [
                    ['mes', 'Escolher o mês'],
                    ['data', 'Escolher a data'],
                  ] as const
                ).map(([m, r]) => (
                  <button key={m} type="button" onClick={() => setFerias((f) => ({ ...f, modo: m }))} className={`flex-1 py-1.5 rounded-md font-bold ${ferias.modo === m ? 'bg-[#C48229] text-white' : 'text-slate-600'}`}>
                    {r}
                  </button>
                ))}
              </div>
              {ferias.modo === 'mes' ? (
                <label className="block">
                  <span className="font-bold text-slate-700">Mês desejado</span>
                  <input type="month" value={ferias.mes} onChange={(e) => setFerias((f) => ({ ...f, mes: e.target.value }))} className="mt-1 w-full p-3 border border-slate-300 rounded-xl bg-white text-sm" />
                </label>
              ) : (
                <label className="block">
                  <span className="font-bold text-slate-700">Dia em que gostaria de começar</span>
                  <input type="date" value={ferias.inicio} onChange={(e) => setFerias((f) => ({ ...f, inicio: e.target.value }))} className="mt-1 w-full p-3 border border-slate-300 rounded-xl bg-white text-sm" />
                </label>
              )}
              <label className="block">
                <span className="font-bold text-slate-700">Quantos dias</span>
                <select value={ferias.dias} onChange={(e) => setFerias((f) => ({ ...f, dias: Number(e.target.value) }))} className="mt-1 w-full p-3 border border-slate-300 rounded-xl bg-white text-sm">
                  {[30, 20, 15, 14, 10, 5].map((d) => (
                    <option key={d} value={d}>
                      {d} dias
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ferias.venderDias} onChange={(e) => setFerias((f) => ({ ...f, venderDias: e.target.checked }))} className="w-4 h-4 accent-[#C48229]" />
                Quero vender 10 dias (abono pecuniário)
              </label>
              <p className="text-[11px] text-slate-500">O DP confere o seu período aquisitivo e a escala da equipe e responde por aqui.</p>
            </div>
          )}

          {tipo === 'contestacao' && documentos.length > 0 && (
            <label className="block">
              <span className="font-bold text-slate-700">Sobre qual documento? (opcional)</span>
              <select value={documentoId} onChange={(e) => setDocumentoId(e.target.value)} className="mt-1 w-full p-3 border border-slate-300 rounded-xl bg-white text-sm">
                <option value="">Nenhum em especial</option>
                {documentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titulo}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="font-bold text-slate-700">{tipo === 'ferias' ? 'Observação (opcional)' : tipo === 'contestacao' ? 'O que não confere?' : 'Conte o que você precisa'}</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, 3000))}
              rows={5}
              placeholder={
                tipo === 'contestacao'
                  ? 'Ex.: no VA da 1ª quinzena de outubro aparece 1 falta no dia 03/10, mas eu trabalhei nesse dia.'
                  : tipo === 'cadastro'
                    ? 'Informe o dado novo. Ex.: novo endereço completo com CEP.'
                    : 'Escreva aqui.'
              }
              className="mt-1 w-full p-3 border border-slate-300 rounded-xl text-sm"
            />
          </label>
          <SeletorAnexos token={credenciais.token} anexos={anexos} onChange={setAnexos} />
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
          <button type="submit" disabled={enviando} className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar ao DP
          </button>
          <p className="text-[10px] text-slate-400 text-center">Só o Departamento Pessoal vê esta solicitação e os arquivos anexados.</p>
        </form>
      )}
    </div>
  );
};

const SolicitacaoAberta: React.FC<{ credenciais: CredenciaisPortal; id: string; onVoltar: () => void }> = ({ credenciais, id, onVoltar }) => {
  const [s, setS] = useState<SolicitacaoPortal | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState<AnexoSolicitacao[]>([]);
  const [enviando, setEnviando] = useState(false);

  const carregar = () =>
    portalSolicitacao(credenciais, id)
      .then(setS)
      .catch((err) => setErro(err instanceof Error ? err.message : 'Não foi possível abrir.'));

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, credenciais]);

  const responder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() && anexos.length === 0) return;
    setEnviando(true);
    setErro(null);
    try {
      await portalResponderSolicitacao(credenciais, id, texto, anexos);
      setTexto('');
      setAnexos([]);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  };

  const encerrada = s && (s.status === 'concluida' || s.status === 'recusada');

  return (
    <div className="space-y-3" data-texto-livre="true">
      <button type="button" onClick={onVoltar} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Minhas solicitações
      </button>
      {erro && !s ? (
        <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>
      ) : !s ? (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Abrindo...
        </p>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">
                  {tituloTipo(s.tipo)} · nº {s.protocolo}
                </p>
                <h2 className="text-base font-black text-slate-900">{s.assunto}</h2>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${estiloStatus(s.status)}`}>{ROTULO_STATUS[s.status]}</span>
            </div>
            {resumoDados(s.tipo, s.dados).map((l) => (
              <p key={l} className="text-xs text-slate-600">
                • {l}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            {s.mensagens.map((m) => {
              const doDp = m.autor === 'dp';
              return (
                <div key={m.id} className={`flex ${doDp ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs ${doDp ? 'bg-white border border-slate-200 rounded-tl-sm' : 'bg-amber-50 border border-amber-200 rounded-tr-sm'}`}>
                    <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                      {doDp ? 'Departamento Pessoal' : 'Você'} · {dataHora(m.criadoEm)}
                    </p>
                    {m.texto && <p className="text-slate-800 whitespace-pre-line break-words">{m.texto}</p>}
                    {m.anexos.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {m.anexos.map((a, i) =>
                          a.url ? (
                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-[#92611F]">
                              <Download className="w-3.5 h-3.5" /> {a.nome}
                            </a>
                          ) : (
                            <p key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Paperclip className="w-3.5 h-3.5" /> {a.nome}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {encerrada ? (
            <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Esta solicitação foi encerrada. Se precisar, abra uma nova.
            </p>
          ) : (
            <form onSubmit={responder} className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 shadow-xs">
              <textarea value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 3000))} rows={3} placeholder="Escreva uma mensagem para o DP..." className="w-full p-3 border border-slate-300 rounded-xl text-sm" />
              <SeletorAnexos token={credenciais.token} anexos={anexos} onChange={setAnexos} />
              {erro && <p className="text-xs text-rose-700 font-semibold">{erro}</p>}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> O DP responde por aqui.
                </span>
                <button type="submit" disabled={enviando || (!texto.trim() && anexos.length === 0)} className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
};
