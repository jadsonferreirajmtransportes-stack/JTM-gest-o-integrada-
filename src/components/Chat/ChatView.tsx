import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquarePlus,
  Send,
  Users,
  User,
  Search,
  Paperclip,
  X,
  FileText,
  NotebookPen,
  CalendarDays,
  FolderKanban,
  FileCheck2,
  AtSign,
  Trash2,
} from 'lucide-react';
import {
  ConversaChat,
  MensagemChat,
  UsuarioLogin,
  NotaPagina,
  AtividadeGestao,
  ProjetoGerencial,
  InstrucaoTrabalho,
} from '../../types';
import { getMensagens, assinarMensagensNovas, AnexoMensagemChat } from '../../utils/chatApi';
import { NovaConversaModal } from './NovaConversaModal';
import { ImageViewerModal } from '../Common/ImageViewerModal';

interface ChatViewProps {
  usuarios: UsuarioLogin[];
  currentUserId: string;
  conversas: ConversaChat[];
  ultimasLeituras: Record<string, string | null>;
  onAbrirConversa: (conversaId: string) => void;
  onEnviarMensagem: (conversaId: string, texto: string, anexo?: AnexoMensagemChat) => void;
  onCriarConversaDireta: (outroUsuarioId: string) => void;
  onCriarConversaGrupo: (nome: string, participantesIds: string[]) => void;
  /** Exclui a conversa (e todo o histórico dela) pra todo mundo que participava. */
  onExcluirConversa: (conversaId: string) => void;
  /** Pra @mencionar Notas, Atividades da Agenda, Projetos e Instruções de Trabalho numa mensagem. */
  notas?: NotaPagina[];
  atividades?: AtividadeGestao[];
  projetos?: ProjetoGerencial[];
  instrucoes?: InstrucaoTrabalho[];
  /** Clicou numa menção dentro de uma mensagem — leva pro módulo correspondente e abre o item. */
  onAbrirMencao?: (tipo: 'nota' | 'atividade' | 'projeto' | 'instrucao', id: string) => void;
}

// Tamanho máximo de anexo — data URL (base64) direto na linha do banco, sem bucket de Storage;
// o mesmo limite já vale pro comprovante de férias e o ASO digitalizado, evita o mesmo problema
// de payload grande que já apareceu antes nesses uploads.
const TAMANHO_MAXIMO_ANEXO_MB = 5;

// Token de menção embutido no texto puro da mensagem: @{tipo:id:título}. O título vai junto (não
// só o id) pra a mensagem continuar legível mesmo se o item mencionado for renomeado ou
// arquivado depois — mesmo princípio de "snapshot no momento" que outros chats usam.
const REGEX_MENCAO = /@\{(nota|atividade|projeto|instrucao):([^:}]+):([^}]+)\}/g;

interface ItemMencionavel {
  tipo: 'nota' | 'atividade' | 'projeto' | 'instrucao';
  id: string;
  titulo: string;
  subtitulo?: string;
}

const ICONE_MENCAO: Record<ItemMencionavel['tipo'], React.ElementType> = {
  nota: NotebookPen,
  atividade: CalendarDays,
  projeto: FolderKanban,
  instrucao: FileCheck2,
};

const COR_MENCAO: Record<ItemMencionavel['tipo'], string> = {
  nota: 'bg-teal-50 text-teal-700 border-teal-200',
  atividade: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  projeto: 'bg-purple-50 text-purple-700 border-purple-200',
  instrucao: 'bg-sky-50 text-sky-700 border-sky-200',
};

// Remove acentos pra buscar "reuniao" e achar "Reunião" (mesmo padrão de normalizeKey em
// faturamentoAereoUtils.ts) — sem isso, o filtro de @menção rejeitava qualquer busca cujos
// acentos não batessem exatamente com o título salvo, fazendo itens existentes "nunca aparecerem".
function normalizarBuscaMencao(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function nomeDaConversa(conversa: ConversaChat, usuarios: UsuarioLogin[], currentUserId: string): string {
  if (conversa.tipo === 'grupo') return conversa.nome || 'Grupo sem nome';
  const outroId = conversa.participantesIds.find((id) => id !== currentUserId);
  const outro = usuarios.find((u) => u.id === outroId);
  return outro?.nome || 'Usuário removido';
}

function inicialAvatar(nome: string): string {
  return nome.substring(0, 2).toUpperCase();
}

function temNaoLida(conversa: ConversaChat, ultimasLeituras: Record<string, string | null>): boolean {
  const ultima = ultimasLeituras[conversa.id];
  if (!ultima) return true;
  return conversa.atualizadoEm > ultima;
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Renderiza o texto de uma mensagem trocando cada token @{tipo:id:título} por um chip clicável,
 *  e deixando o resto como texto normal. */
function renderTextoComMencoes(
  texto: string,
  propria: boolean,
  onAbrirMencao?: (tipo: ItemMencionavel['tipo'], id: string) => void
): React.ReactNode[] {
  const partes: React.ReactNode[] = [];
  let ultimoIndice = 0;
  let match: RegExpExecArray | null;
  REGEX_MENCAO.lastIndex = 0;
  let chave = 0;

  while ((match = REGEX_MENCAO.exec(texto)) !== null) {
    if (match.index > ultimoIndice) {
      partes.push(texto.slice(ultimoIndice, match.index));
    }
    const [, tipo, id, titulo] = match;
    const Icone = ICONE_MENCAO[tipo as ItemMencionavel['tipo']];
    partes.push(
      <button
        key={`mencao-${chave++}`}
        type="button"
        onClick={() => onAbrirMencao?.(tipo as ItemMencionavel['tipo'], id)}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-semibold align-middle border transition-colors ${
          propria
            ? 'bg-white/15 text-white border-white/25 hover:bg-white/25'
            : `${COR_MENCAO[tipo as ItemMencionavel['tipo']]} hover:brightness-95`
        }`}
      >
        <Icone className="w-3 h-3" />
        <span>{titulo}</span>
      </button>
    );
    ultimoIndice = match.index + match[0].length;
  }
  if (ultimoIndice < texto.length) {
    partes.push(texto.slice(ultimoIndice));
  }
  return partes;
}

export const ChatView: React.FC<ChatViewProps> = ({
  usuarios,
  currentUserId,
  conversas,
  ultimasLeituras,
  onAbrirConversa,
  onEnviarMensagem,
  onCriarConversaDireta,
  onCriarConversaGrupo,
  onExcluirConversa,
  notas = [],
  atividades = [],
  projetos = [],
  instrucoes = [],
  onAbrirMencao,
}) => {
  const [conversaAbertaId, setConversaAbertaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [textoNovo, setTextoNovo] = useState('');
  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [anexoPendente, setAnexoPendente] = useState<AnexoMensagemChat | null>(null);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const [anexoVisualizando, setAnexoVisualizando] = useState<{ url: string; nome: string; tipo: string } | null>(null);
  const [mencaoQuery, setMencaoQuery] = useState<string | null>(null);
  const [mencaoIndiceArroba, setMencaoIndiceArroba] = useState(0);
  const fimDaListaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversaAberta = conversas.find((c) => c.id === conversaAbertaId) || null;

  // Carrega o histórico sempre que a conversa aberta muda, e assina mensagens novas em tempo
  // real — só anexa na tela quando for da conversa que está aberta agora (o filtro de "é minha
  // conversa" mais amplo já acontece lá em cima, em App.tsx, pro contador de não lidas).
  useEffect(() => {
    if (!conversaAbertaId) {
      setMensagens([]);
      return;
    }
    let cancelado = false;
    setCarregandoMensagens(true);
    getMensagens(conversaAbertaId)
      .then((lista) => {
        if (!cancelado) setMensagens(lista);
      })
      .catch((err) => console.error('Erro ao carregar mensagens:', err))
      .finally(() => {
        if (!cancelado) setCarregandoMensagens(false);
      });

    const cancelarInscricao = assinarMensagensNovas((msg) => {
      if (msg.conversaId !== conversaAbertaId) return;
      setMensagens((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    return () => {
      cancelado = true;
      cancelarInscricao();
    };
  }, [conversaAbertaId]);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const handleAbrirConversa = (id: string) => {
    setConversaAbertaId(id);
    onAbrirConversa(id);
  };

  const handleExcluirConversa = (conversa: ConversaChat, e: React.MouseEvent) => {
    e.stopPropagation();
    const nome = nomeDaConversa(conversa, usuarios, currentUserId);
    const confirmado = window.confirm(
      `Excluir a conversa com "${nome}"?\n\nApaga todo o histórico de mensagens pra todo mundo que participava — não tem como desfazer.`
    );
    if (!confirmado) return;
    if (conversaAbertaId === conversa.id) setConversaAbertaId(null);
    onExcluirConversa(conversa.id);
  };

  const handleEnviar = () => {
    if (!conversaAbertaId) return;
    if (!textoNovo.trim() && !anexoPendente) return;
    onEnviarMensagem(conversaAbertaId, textoNovo, anexoPendente || undefined);
    setTextoNovo('');
    setAnexoPendente(null);
    setErroAnexo(null);
    setMencaoQuery(null);
  };

  const handleSelecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ehImagem = file.type.startsWith('image/');
    const ehPdf = file.type === 'application/pdf';
    const ehWord =
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!ehImagem && !ehPdf && !ehWord) {
      setErroAnexo('Só é possível anexar imagens, PDF ou documentos Word (.doc/.docx).');
      return;
    }
    if (file.size > TAMANHO_MAXIMO_ANEXO_MB * 1024 * 1024) {
      setErroAnexo(`Arquivo muito grande — o limite é ${TAMANHO_MAXIMO_ANEXO_MB}MB.`);
      return;
    }

    setErroAnexo(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAnexoPendente({ url: reader.result as string, nome: file.name, tipo: file.type });
    };
    reader.readAsDataURL(file);
  };

  // ------------------------------------------------------------------
  // Menções (@Notas, @Agenda, @Projetos, @Instruções de Trabalho)
  // ------------------------------------------------------------------
  const itensMencionaveis = useMemo<ItemMencionavel[]>(() => {
    const deNotas: ItemMencionavel[] = notas
      .filter((n) => !n.arquivada)
      .map((n) => ({ tipo: 'nota' as const, id: n.id, titulo: n.titulo || 'Sem título' }));
    const deAtividades: ItemMencionavel[] = atividades.map((a) => ({
      tipo: 'atividade' as const,
      id: a.id,
      titulo: a.titulo,
      subtitulo: a.data,
    }));
    const deProjetos: ItemMencionavel[] = projetos.map((p) => ({
      tipo: 'projeto' as const,
      id: p.id,
      titulo: p.titulo,
      subtitulo: p.codigo,
    }));
    const deInstrucoes: ItemMencionavel[] = instrucoes
      .filter((i) => !i.arquivada)
      .map((i) => ({ tipo: 'instrucao' as const, id: i.id, titulo: i.titulo, subtitulo: i.codigo }));
    return [...deNotas, ...deAtividades, ...deProjetos, ...deInstrucoes];
  }, [notas, atividades, projetos, instrucoes]);

  const resultadosMencao = useMemo(() => {
    if (mencaoQuery === null) return [];
    const termo = normalizarBuscaMencao(mencaoQuery);
    const filtrados = termo
      ? itensMencionaveis.filter((i) => normalizarBuscaMencao(i.titulo).includes(termo))
      : itensMencionaveis;
    return filtrados.slice(0, 6);
  }, [mencaoQuery, itensMencionaveis]);

  const handleTextoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setTextoNovo(valor);

    const posicaoCursor = e.target.selectionStart ?? valor.length;
    const trechoAtePosicao = valor.slice(0, posicaoCursor);
    const indiceArroba = trechoAtePosicao.lastIndexOf('@');

    if (indiceArroba === -1) {
      setMencaoQuery(null);
      return;
    }
    const termoAposArroba = trechoAtePosicao.slice(indiceArroba + 1);
    // Cancela o gatilho se tiver quebra de linha ou se o @ fizer parte de um token já inserido
    // (contém "{"), ou se o termo já ficou longo demais sem achar nada (o usuário desistiu de
    // mencionar e seguiu escrevendo a frase normal). Importante: espaço NÃO cancela — a imensa
    // maioria dos títulos de Nota/Agenda/Projeto/Instrução tem várias palavras ("REUNIÃO COM A
    // F&F"), e cancelar no primeiro espaço impedia buscar por qualquer coisa além da 1ª palavra,
    // fazendo itens que existem "nunca aparecerem" pra quem tentava digitar o título completo.
    if (/[\n{]/.test(termoAposArroba) || termoAposArroba.length > 60) {
      setMencaoQuery(null);
      return;
    }
    setMencaoIndiceArroba(indiceArroba);
    setMencaoQuery(termoAposArroba);
  };

  const handleSelecionarMencao = (item: ItemMencionavel) => {
    const antesDoArroba = textoNovo.slice(0, mencaoIndiceArroba);
    const depoisDoTermo = textoNovo.slice(mencaoIndiceArroba + 1 + (mencaoQuery?.length || 0));
    const token = `@{${item.tipo}:${item.id}:${item.titulo}}`;
    const novoTexto = `${antesDoArroba}${token} ${depoisDoTermo}`;
    setTextoNovo(novoTexto);
    setMencaoQuery(null);
    inputRef.current?.focus();
  };

  const conversasFiltradas = useMemo(() => {
    const ordenadas = [...conversas].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    if (!busca.trim()) return ordenadas;
    const termo = busca.trim().toLowerCase();
    return ordenadas.filter((c) => nomeDaConversa(c, usuarios, currentUserId).toLowerCase().includes(termo));
  }, [conversas, busca, usuarios, currentUserId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex h-[calc(100vh-180px)] min-h-[420px]">
      {/* Lista de Conversas */}
      <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => setIsNovaConversaOpen(true)}
            className="w-full px-3 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <MessageSquarePlus className="w-4 h-4" /> Nova Conversa
          </button>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-no-uppercase="true"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:outline-hidden focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 && (
            <div className="text-center p-6">
              <p className="text-[11px] text-slate-400">
                Nenhuma conversa ainda. Clique em "Nova Conversa" pra começar.
              </p>
              {/* Linha técnica pra suporte — se alguém acha que já teve conversa e não aparece
                  mais, esse ID é o que confirma se a conta logada é mesmo quem deveria. */}
              <p className="text-[10px] text-slate-300 mt-2">ID da conta: {currentUserId}</p>
            </div>
          )}
          {conversasFiltradas.map((c) => {
            const nome = nomeDaConversa(c, usuarios, currentUserId);
            const naoLida = temNaoLida(c, ultimasLeituras);
            const ativa = c.id === conversaAbertaId;
            return (
              <div
                key={c.id}
                className={`group relative flex items-center border-b border-slate-50 transition-colors ${
                  ativa ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleAbrirConversa(c.id)}
                  className="flex-1 min-w-0 flex items-center gap-2.5 p-3 text-left"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                      c.tipo === 'grupo' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {c.tipo === 'grupo' ? <Users className="w-4 h-4" /> : inicialAvatar(nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs truncate ${naoLida ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {nome}
                    </p>
                    <p className="text-[10px] text-slate-400">{c.tipo === 'grupo' ? `${c.participantesIds.length} participantes` : 'Conversa direta'}</p>
                  </div>
                  {naoLida && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleExcluirConversa(c, e)}
                  title="Excluir conversa"
                  className="shrink-0 mr-2 p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thread da Conversa Aberta */}
      <div className="flex-1 flex flex-col min-w-0">
        {!conversaAberta ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <User className="w-8 h-8" />
            <p className="text-xs">Selecione uma conversa pra começar</p>
          </div>
        ) : (
          <>
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-2.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                  conversaAberta.tipo === 'grupo' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {conversaAberta.tipo === 'grupo' ? <Users className="w-4 h-4" /> : inicialAvatar(nomeDaConversa(conversaAberta, usuarios, currentUserId))}
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">{nomeDaConversa(conversaAberta, usuarios, currentUserId)}</p>
                {conversaAberta.tipo === 'grupo' && (
                  <p className="text-[10px] text-slate-400">
                    {conversaAberta.participantesIds
                      .map((id) => usuarios.find((u) => u.id === id)?.nome)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
              {carregandoMensagens && <p className="text-[11px] text-slate-400 text-center">Carregando...</p>}
              {!carregandoMensagens && mensagens.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-6">Nenhuma mensagem ainda — diga oi!</p>
              )}
              {mensagens.map((m) => {
                const propria = m.autorId === currentUserId;
                const autor = usuarios.find((u) => u.id === m.autorId);
                const ehImagem = m.anexoTipo?.startsWith('image/');
                return (
                  <div key={m.id} className={`flex ${propria ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-xs ${
                      propria ? 'bg-[#C48229] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}>
                      {!propria && conversaAberta.tipo === 'grupo' && (
                        <p className="text-[10px] font-bold text-[#C48229] mb-0.5">{autor?.nome || 'Alguém'}</p>
                      )}

                      {m.anexoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setAnexoVisualizando({ url: m.anexoUrl!, nome: m.anexoNome || 'Anexo', tipo: m.anexoTipo || '' })
                          }
                          className="block mb-1.5 rounded-lg overflow-hidden"
                        >
                          {ehImagem ? (
                            <img
                              src={m.anexoUrl}
                              alt={m.anexoNome || 'Imagem anexada'}
                              className="max-w-full max-h-48 rounded-lg object-cover"
                            />
                          ) : (
                            <span
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold ${
                                propria ? 'bg-white/15 text-white' : 'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate">{m.anexoNome || 'Documento'}</span>
                            </span>
                          )}
                        </button>
                      )}

                      {m.texto && (
                        <p className="whitespace-pre-wrap break-words">
                          {renderTextoComMencoes(m.texto, propria, onAbrirMencao)}
                        </p>
                      )}
                      <p className={`text-[9px] mt-1 text-right ${propria ? 'text-white/70' : 'text-slate-400'}`}>{formatHora(m.criadoEm)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={fimDaListaRef} />
            </div>

            {/* Sugestões de menção — Notas, Agenda, Projetos */}
            {mencaoQuery !== null && resultadosMencao.length > 0 && (
              <div className="mx-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {resultadosMencao.map((item) => {
                  const Icone = ICONE_MENCAO[item.tipo];
                  return (
                    <button
                      key={`${item.tipo}-${item.id}`}
                      type="button"
                      onClick={() => handleSelecionarMencao(item)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                    >
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${COR_MENCAO[item.tipo]}`}>
                        <Icone className="w-3.5 h-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-slate-800 truncate">{item.titulo}</span>
                        {item.subtitulo && <span className="block text-[10px] text-slate-400 truncate">{item.subtitulo}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Prévia do anexo selecionado, antes de enviar */}
            {anexoPendente && (
              <div className="mx-3 mb-1 flex items-center gap-2 px-2.5 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                {anexoPendente.tipo.startsWith('image/') ? (
                  <img src={anexoPendente.url} alt={anexoPendente.nome} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-amber-700 shrink-0" />
                )}
                <span className="text-[11px] text-amber-800 font-medium truncate flex-1">{anexoPendente.nome}</span>
                <button
                  type="button"
                  onClick={() => setAnexoPendente(null)}
                  className="p-1 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded transition-colors shrink-0"
                  title="Remover anexo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {erroAnexo && (
              <p className="mx-3 mb-1 text-[11px] text-rose-600 font-medium">{erroAnexo}</p>
            )}

            <div className="p-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleSelecionarArquivo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-400 hover:text-[#C48229] hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                title="Anexar imagem ou PDF"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  data-no-uppercase="true"
                  value={textoNovo}
                  onChange={handleTextoChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && mencaoQuery !== null) {
                      setMencaoQuery(null);
                      return;
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEnviar();
                    }
                  }}
                  placeholder="Escreva uma mensagem... (@ pra mencionar Nota, Agenda, Projeto ou Instrução)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400"
                />
                <AtSign className="w-3.5 h-3.5 text-slate-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={handleEnviar}
                disabled={!textoNovo.trim() && !anexoPendente}
                className="p-2.5 bg-[#C48229] hover:bg-[#92611F] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
                title="Enviar (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <NovaConversaModal
        isOpen={isNovaConversaOpen}
        onClose={() => setIsNovaConversaOpen(false)}
        usuarios={usuarios}
        currentUserId={currentUserId}
        onCriarDireta={onCriarConversaDireta}
        onCriarGrupo={onCriarConversaGrupo}
      />

      <ImageViewerModal
        isOpen={!!anexoVisualizando}
        onClose={() => setAnexoVisualizando(null)}
        imageUrl={anexoVisualizando?.url}
        title={anexoVisualizando?.nome}
        fileName={anexoVisualizando?.nome}
      />
    </div>
  );
};
