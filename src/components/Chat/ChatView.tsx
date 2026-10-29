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
  ArrowLeft,
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
import { getMensagens, getAnexoMensagem, assinarMensagensNovas, AnexoMensagemChat, editarMensagem, apagarMensagem, reagirMensagem } from '../../utils/chatApi';
import { AcoesMensagemChat, BarraRespondendo, CitacaoMensagem, EditorMensagemChat, MensagemApagada, ReacoesMensagem } from './MensagemChatAcoes';
import { AudioDaMensagem, GravadorAudio, nomeAudio } from './AudioChat';
import { enviarArquivo } from '../../utils/arquivosStorage';
import { podeVerRegistroCompartilhado } from '../../utils/visibilidadeUtils';
import { podeVerAtividade } from '../Agenda/agendaUtils';
import { NovaConversaModal } from './NovaConversaModal';
import { ImageViewerModal } from '../Common/ImageViewerModal';
import { ConversaDemanda } from './ConversaDemanda';
import { NovaMensagemColaboradorModal } from './NovaMensagemColaboradorModal';
import { Colaborador } from '../../types';
import { ROTULO_STATUS, SolicitacaoDp } from '../../utils/solicitacoesApi';
import { estiloStatus } from '../Portal/PortalSolicitacoes';

interface ChatViewProps {
  usuarios: UsuarioLogin[];
  currentUserId: string;
  conversas: ConversaChat[];
  ultimasLeituras: Record<string, string | null>;
  onAbrirConversa: (conversaId: string) => void;
  onEnviarMensagem: (conversaId: string, texto: string, anexo?: AnexoMensagemChat, respostaA?: string) => void;
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
  /** Demandas do "Fale com o DP" (079) — só para quem tem acesso; undefined = não mostra. */
  demandas?: SolicitacaoDp[];
  /** Última mensagem nova de demanda que chegou em tempo real (recarrega a conversa aberta). */
  sinalDemanda?: { id: string; n: number };
  onDemandasMudaram?: () => void;
  onAbrirDemandaNoDp?: (id: string) => void;
  /** Nome de quem responde as demandas. */
  atendente?: string;
  /** Para o DP começar uma conversa com um colaborador (vira "Mensagem do DP" no portal). */
  colaboradores?: Colaborador[];
}

// Anexo de uma mensagem — o histórico vem sem o conteúdo do arquivo (ver getMensagens). Imagem
// busca sozinha ao aparecer (pra miniatura), documento só quando clicado; os dois ficam em cache
// na sessão (getAnexoMensagem), então reabrir a conversa não baixa de novo.
const AnexoDaMensagem: React.FC<{
  mensagem: MensagemChat;
  ehImagem: boolean;
  propria: boolean;
  onAbrir: (url: string) => void;
}> = ({ mensagem, ehImagem, propria, onAbrir }) => {
  const [url, setUrl] = useState<string | undefined>(mensagem.anexoUrl);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const buscar = async (): Promise<string | undefined> => {
    if (url) return url;
    setCarregando(true);
    setFalhou(false);
    try {
      const encontrado = (await getAnexoMensagem(mensagem.id)) || undefined;
      setUrl(encontrado);
      if (!encontrado) setFalhou(true);
      return encontrado;
    } catch (err) {
      console.error('Erro ao carregar anexo da mensagem:', err);
      setFalhou(true);
      return undefined;
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (ehImagem && !url) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem.id]);

  const handleClick = async () => {
    const encontrado = await buscar();
    if (encontrado) onAbrir(encontrado);
  };

  return (
    <button type="button" onClick={handleClick} className="block mb-1.5 rounded-lg overflow-hidden">
      {ehImagem && url ? (
        <img
          src={url}
          alt={mensagem.anexoNome || 'Imagem anexada'}
          className="max-w-full max-h-48 rounded-lg object-cover"
        />
      ) : (
        <span
          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold ${
            propria ? 'bg-white/15 text-white' : 'bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {carregando
              ? 'Carregando anexo...'
              : falhou
                ? 'Não foi possível carregar — clique pra tentar de novo'
                : mensagem.anexoNome || (ehImagem ? 'Imagem' : 'Documento')}
          </span>
        </span>
      )}
    </button>
  );
};

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
  demandas,
  sinalDemanda,
  onDemandasMudaram,
  onAbrirDemandaNoDp,
  atendente,
  colaboradores,
}) => {
  const [novaMensagemColab, setNovaMensagemColab] = useState(false);
  const [conversaAbertaId, setConversaAbertaId] = useState<string | null>(null);
  const [demandaAbertaId, setDemandaAbertaId] = useState<string | null>(null);
  const [verEncerradas, setVerEncerradas] = useState(false);
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
  const demandaAberta = demandas?.find((d) => d.id === demandaAbertaId) || null;
  const algoAberto = !!conversaAberta || !!demandaAberta;

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

    const cancelarInscricao = assinarMensagensNovas(
      (msg) => {
        if (msg.conversaId !== conversaAbertaId) return;
        setMensagens((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      },
      (msg) => {
        if (msg.conversaId !== conversaAbertaId) return;
        // Edição/remoção feita por quem enviou — mantém o anexo que já estava na tela (se não foi apagada).
        setMensagens((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, ...msg, anexoUrl: msg.apagada ? undefined : msg.anexoUrl ?? m.anexoUrl } : m))
        );
      }
    );

    return () => {
      cancelado = true;
      cancelarInscricao();
    };
  }, [conversaAbertaId]);

  // Só desce pro fim quando chega mensagem nova — editar/apagar não mexe na rolagem.
  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState<MensagemChat | null>(null);
  const [gravandoAudio, setGravandoAudio] = useState(false);
  useEffect(() => setRespondendo(null), [conversaAbertaId]);

  const salvarEdicao = async (m: MensagemChat, novoTexto: string) => {
    const t = novoTexto.trim();
    if (!t || t === m.texto) {
      setEditandoId(null);
      return;
    }
    try {
      const editadoEm = await editarMensagem(m.id, t);
      setMensagens((prev) => prev.map((x) => (x.id === m.id ? { ...x, texto: t, editadoEm } : x)));
      setEditandoId(null);
    } catch (err) {
      console.error('Erro ao editar mensagem:', err);
      alert('Não foi possível editar a mensagem. Tente de novo.');
    }
  };

  // Reação: muda na tela na hora e confirma com o banco (o realtime atualiza os outros).
  const handleReagir = async (m: MensagemChat, emoji: string) => {
    const atual = { ...(m.reacoes || {}) };
    const ids = atual[emoji] || [];
    atual[emoji] = ids.includes(currentUserId) ? ids.filter((i) => i !== currentUserId) : [...ids, currentUserId];
    if (!atual[emoji].length) delete atual[emoji];
    setMensagens((prev) => prev.map((x) => (x.id === m.id ? { ...x, reacoes: atual } : x)));
    try {
      const salvas = await reagirMensagem(m.id, currentUserId, emoji);
      setMensagens((prev) => prev.map((x) => (x.id === m.id ? { ...x, reacoes: salvas } : x)));
    } catch (err) {
      console.error('Erro ao reagir:', err);
      setMensagens((prev) => prev.map((x) => (x.id === m.id ? { ...x, reacoes: m.reacoes } : x)));
    }
  };

  const handleApagarMensagem = async (m: MensagemChat) => {
    if (!window.confirm('Apagar esta mensagem? Ela some para todos da conversa.')) return;
    try {
      await apagarMensagem(m.id);
      setMensagens((prev) =>
        prev.map((x) =>
          x.id === m.id
            ? { ...x, apagada: true, texto: '', anexoUrl: undefined, anexoNome: undefined, anexoTipo: undefined, temAnexo: false }
            : x
        )
      );
    } catch (err) {
      console.error('Erro ao apagar mensagem:', err);
      alert('Não foi possível apagar a mensagem. Tente de novo.');
    }
  };

  const handleAbrirConversa = (id: string) => {
    setDemandaAbertaId(null);
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
    onEnviarMensagem(conversaAbertaId, textoNovo, anexoPendente || undefined, respondendo?.id);
    setRespondendo(null);
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

  // Só os outros participantes da conversa aberta agora (exclui eu mesmo) — usado pra restringir
  // o que dá pra @mencionar ao que eu JÁ compartilhei com quem está do outro lado da conversa,
  // e não a tudo que eu vejo. Numa conversa em grupo, exige visível pra TODOS os outros membros
  // (mencionar precisa significar "todo mundo aqui consegue abrir", não só "eu consigo").
  const outrosParticipantesDaConversa = useMemo<UsuarioLogin[]>(() => {
    if (!conversaAberta) return [];
    return conversaAberta.participantesIds
      .filter((id) => id !== currentUserId)
      .map((id) => usuarios.find((u) => u.id === id))
      .filter((u): u is UsuarioLogin => !!u);
  }, [conversaAberta, usuarios, currentUserId]);

  const itensMencionaveis = useMemo<ItemMencionavel[]>(() => {
    // Sem conversa aberta ainda, ou sem conseguir resolver quem é o outro participante (não
    // deveria acontecer numa conversa de verdade) — não restringe além do que já veio filtrado
    // de App.tsx pro usuário atual.
    const compartilhadoComTodosOsOutros = (podeVerPara: (outro: UsuarioLogin) => boolean): boolean =>
      outrosParticipantesDaConversa.length === 0 || outrosParticipantesDaConversa.every(podeVerPara);

    const deNotas: ItemMencionavel[] = notas
      .filter((n) => !n.arquivada)
      .filter((n) =>
        compartilhadoComTodosOsOutros((outro) =>
          podeVerRegistroCompartilhado({
            criadoPorUserId: n.criadoPorUserId,
            usuariosMarcadosIds: n.usuariosMarcadosIds,
            nomesTextoLivre: [n.autor],
            currentUser: outro,
            userRole: outro.role,
          })
        )
      )
      .map((n) => ({ tipo: 'nota' as const, id: n.id, titulo: n.titulo || 'Sem título' }));
    const deAtividades: ItemMencionavel[] = atividades
      .filter((a) => compartilhadoComTodosOsOutros((outro) => podeVerAtividade(a, outro, outro.role)))
      .map((a) => ({ tipo: 'atividade' as const, id: a.id, titulo: a.titulo, subtitulo: a.data }));
    const deProjetos: ItemMencionavel[] = projetos
      .filter((p) =>
        compartilhadoComTodosOsOutros((outro) =>
          podeVerRegistroCompartilhado({
            criadoPorUserId: p.criadoPorUserId,
            usuariosMarcadosIds: p.usuariosMarcadosIds,
            nomesTextoLivre: [p.liderProjetoNome, ...(p.equipeMembros || [])],
            currentUser: outro,
            userRole: outro.role,
          })
        )
      )
      .map((p) => ({ tipo: 'projeto' as const, id: p.id, titulo: p.titulo, subtitulo: p.codigo }));
    const deInstrucoes: ItemMencionavel[] = instrucoes
      .filter((i) => !i.arquivada)
      .filter((i) =>
        compartilhadoComTodosOsOutros((outro) =>
          podeVerRegistroCompartilhado({
            criadoPorUserId: i.criadoPorUserId,
            usuariosMarcadosIds: i.usuariosMarcadosIds,
            nomesTextoLivre: [i.autor, i.responsavel, i.aprovadoPor],
            currentUser: outro,
            userRole: outro.role,
          })
        )
      )
      .map((i) => ({ tipo: 'instrucao' as const, id: i.id, titulo: i.titulo, subtitulo: i.codigo }));
    return [...deNotas, ...deAtividades, ...deProjetos, ...deInstrucoes];
  }, [notas, atividades, projetos, instrucoes, outrosParticipantesDaConversa]);

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

  // Demandas do Fale com o DP: em andamento sempre; encerradas só se pedir. Busca por nome,
  // assunto ou protocolo.
  const demandasFiltradas = useMemo(() => {
    if (!demandas) return [];
    const termo = busca.trim().toLowerCase();
    return demandas
      .filter((d) => verEncerradas || (d.status !== 'concluida' && d.status !== 'recusada') || d.id === demandaAbertaId)
      .filter((d) => !termo || `${d.colaboradorNome} ${d.assunto} ${d.protocolo}`.toLowerCase().includes(termo))
      .sort((a, b) => Number(a.lidaPeloDp) - Number(b.lidaPeloDp) || b.atualizadoEm.localeCompare(a.atualizadoEm));
  }, [demandas, busca, verEncerradas, demandaAbertaId]);
  const encerradasQtd = demandas?.filter((d) => d.status === 'concluida' || d.status === 'recusada').length ?? 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex h-[calc(100dvh-150px)] md:h-[calc(100vh-180px)] min-h-[420px]">
      {/* Lista de Conversas */}
      {/* No celular: lista OU conversa (tela cheia, com voltar); no computador, lado a lado. */}
      <div className={`${algoAberto ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 md:border-r border-slate-200 flex-col`}>
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
          {demandas && (
            <div className="border-b border-slate-100">
              <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">Fale com o DP</span>
                {encerradasQtd > 0 && (
                  <button type="button" onClick={() => setVerEncerradas((v) => !v)} className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 normal-case tracking-normal">
                    {verEncerradas ? 'Esconder encerradas' : `Ver encerradas (${encerradasQtd})`}
                  </button>
                )}
              </div>
              {colaboradores && (
                <div className="px-3 pb-2">
                  <button
                    type="button"
                    onClick={() => setNovaMensagemColab(true)}
                    className="w-full py-1.5 rounded-lg border border-dashed border-[#C48229]/50 text-[11px] font-bold text-[#92611F] hover:bg-amber-50 normal-case tracking-normal"
                    title="Mandar uma mensagem para um colaborador (ele responde pelo portal)"
                  >
                    + Falar com um colaborador
                  </button>
                </div>
              )}
              {demandasFiltradas.length === 0 && <p className="px-3 pb-2.5 text-[10px] text-slate-400">Nenhuma demanda em andamento.</p>}
              {demandasFiltradas.map((d) => {
                const ativa = d.id === demandaAbertaId;
                const nome = d.colaboradorNome.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setConversaAbertaId(null);
                      setDemandaAbertaId(d.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-t border-slate-50 transition-colors ${ativa ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C48229] to-[#7A4F17] text-white flex items-center justify-center font-black text-[11px] shrink-0">
                      {inicialAvatar(d.colaboradorNome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join(''))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs truncate ${!d.lidaPeloDp ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>{nome}</p>
                      <p className="text-[10px] text-slate-500 truncate">{d.assunto} · nº {d.protocolo}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${estiloStatus(d.status)}`}>{ROTULO_STATUS[d.status]}</span>
                    {!d.lidaPeloDp && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                  </button>
                );
              })}
              <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400 border-t border-slate-100">Conversas</p>
            </div>
          )}
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
      <div className={`${algoAberto ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {demandaAberta ? (
          <ConversaDemanda
            demanda={demandaAberta}
            atendente={atendente}
            sinalNovaMensagem={sinalDemanda?.id === demandaAberta.id ? sinalDemanda.n : 0}
            onVoltar={() => setDemandaAbertaId(null)}
            onMudou={() => onDemandasMudaram?.()}
            onAbrirNoDp={onAbrirDemandaNoDp ? () => onAbrirDemandaNoDp(demandaAberta.id) : undefined}
            colaborador={colaboradores?.find((c) => c.id === demandaAberta.colaboradorId)}
          />
        ) : !conversaAberta ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <User className="w-8 h-8" />
            <p className="text-xs">Selecione uma conversa pra começar</p>
          </div>
        ) : (
          <>
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-2.5 shrink-0">
              <button type="button" onClick={() => setConversaAbertaId(null)} className="md:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Voltar para as conversas">
                <ArrowLeft className="w-5 h-5" />
              </button>
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
                const editando = editandoId === m.id;
                return (
                  <div key={m.id} id={`msg-${m.id}`} className={`group flex items-center gap-1 rounded-xl transition-colors ${propria ? 'justify-end' : 'justify-start'}`}>
                    {propria && !m.apagada && !editando && (
                      <AcoesMensagemChat
                        podeEditar={!!m.texto}
                        onEditar={() => setEditandoId(m.id)}
                        onApagar={() => handleApagarMensagem(m)}
                        onResponder={() => setRespondendo(m)}
                        onReagir={(e) => handleReagir(m, e)}
                      />
                    )}
                    <div className={`${editando ? 'w-[70%]' : 'max-w-[70%]'} rounded-2xl px-3.5 py-2 text-xs ${
                      propria ? 'bg-[#C48229] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}>
                      {!propria && conversaAberta.tipo === 'grupo' && (
                        <p className="text-[10px] font-bold text-[#C48229] mb-0.5">{autor?.nome || 'Alguém'}</p>
                      )}

                      {m.respostaA && !m.apagada && (
                        <CitacaoMensagem original={mensagens.find((x) => x.id === m.respostaA)} usuarios={usuarios} propria={propria} />
                      )}

                      {m.apagada && <MensagemApagada />}

                      {!m.apagada && m.anexoTipo?.startsWith('audio/') && <AudioDaMensagem mensagem={m} propria={propria} />}

                      {!m.apagada && !m.anexoTipo?.startsWith('audio/') && (m.anexoUrl || m.temAnexo) && (
                        <AnexoDaMensagem
                          mensagem={m}
                          ehImagem={!!ehImagem}
                          propria={propria}
                          onAbrir={(url) =>
                            setAnexoVisualizando({ url, nome: m.anexoNome || 'Anexo', tipo: m.anexoTipo || '' })
                          }
                        />
                      )}

                      {editando ? (
                        <EditorMensagemChat
                          textoInicial={m.texto}
                          onSalvar={(t) => salvarEdicao(m, t)}
                          onCancelar={() => setEditandoId(null)}
                        />
                      ) : (
                        m.texto && (
                          <p className="whitespace-pre-wrap break-words">
                            {renderTextoComMencoes(m.texto, propria, onAbrirMencao)}
                          </p>
                        )
                      )}
                      {!m.apagada && (
                        <ReacoesMensagem reacoes={m.reacoes} currentUserId={currentUserId} usuarios={usuarios} propria={propria} onReagir={(e) => handleReagir(m, e)} />
                      )}
                      <p className={`text-[9px] mt-1 text-right ${propria ? 'text-white/70' : 'text-slate-400'}`}>
                        {m.editadoEm && !m.apagada && <span className="italic mr-1">editada ·</span>}
                        {formatHora(m.criadoEm)}
                      </p>
                    </div>
                    {!propria && !m.apagada && <AcoesMensagemChat onResponder={() => setRespondendo(m)} onReagir={(e) => handleReagir(m, e)} />}
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

            {respondendo && <BarraRespondendo mensagem={respondendo} usuarios={usuarios} onCancelar={() => setRespondendo(null)} />}

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
              <GravadorAudio
                onAtivo={setGravandoAudio}
                onEnviar={async (arquivo, duracao) => {
                  if (!conversaAbertaId) return;
                  const ref = await enviarArquivo(arquivo, 'chat/audios');
                  onEnviarMensagem(conversaAbertaId, '', { url: ref, nome: nomeAudio(duracao), tipo: arquivo.type }, respondendo?.id);
                  setRespondendo(null);
                }}
              />
              {!gravandoAudio && <div className="relative flex-1">
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
              </div>}
              {!gravandoAudio && <button
                type="button"
                onClick={handleEnviar}
                disabled={!textoNovo.trim() && !anexoPendente}
                className="p-2.5 bg-[#C48229] hover:bg-[#92611F] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
                title="Enviar (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>}
            </div>
          </>
        )}
      </div>

      {novaMensagemColab && colaboradores && (
        <NovaMensagemColaboradorModal
          colaboradores={colaboradores}
          atendente={atendente}
          onClose={() => setNovaMensagemColab(false)}
          onCriada={(id) => {
            setNovaMensagemColab(false);
            setConversaAbertaId(null);
            setDemandaAbertaId(id);
            onDemandasMudaram?.();
          }}
        />
      )}
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
