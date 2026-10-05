// ============================================================================
// Jornal JMT — acesso ao banco (ver migração 066_jornal.sql).
// Lado da gestão (logado): notícias, sugestões, moderação de comentários.
// Lado do colaborador (sem login): só as funções portal_* (token + CPF + data de
// nascimento), as mesmas credenciais do Portal de Educação.
// ============================================================================

import { supabase } from './supabaseClient';
import type { CredenciaisPortal, TelaIlustrada } from './educacaoApi';

export type StatusNoticia = 'rascunho' | 'sugerida' | 'publicada' | 'arquivada';
export type TipoReacao = 'curtir' | 'parabens' | 'amei' | 'apoio';

export const CATEGORIAS_NOTICIA = ['Notícias', 'Conquistas', 'Nossa equipe', 'Segurança', 'Qualidade', 'Clientes', 'Eventos', 'Aniversários', 'Dicas'] as const;

export const REACOES: { tipo: TipoReacao; emoji: string; rotulo: string }[] = [
  { tipo: 'curtir', emoji: '👍', rotulo: 'Curtir' },
  { tipo: 'parabens', emoji: '👏', rotulo: 'Parabéns' },
  { tipo: 'amei', emoji: '❤️', rotulo: 'Amei' },
  { tipo: 'apoio', emoji: '💪', rotulo: 'Apoio' },
];

export type BlocoNoticia =
  | { id: string; tipo: 'texto'; texto: string }
  | { id: string; tipo: 'imagens'; telas: TelaIlustrada[] };

export interface Noticia {
  id: string;
  titulo: string;
  resumo?: string;
  categoria: string;
  capa?: string;
  blocos: BlocoNoticia[];
  status: StatusNoticia;
  destaque: boolean;
  permiteComentarios: boolean;
  autorNome?: string;
  criadoPor?: string;
  revisadoPor?: string;
  observacaoRevisao?: string;
  autorizacaoImagem: boolean;
  publicadaEm?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface ComentarioNoticia {
  id: string;
  noticiaId: string;
  colaboradorId?: string;
  autorNome: string;
  texto: string;
  status: 'pendente' | 'aprovado' | 'oculto';
  moderadoPor?: string;
  moderadoEm?: string;
  criadoEm: string;
}

export interface EstatisticasNoticia {
  leituras: number;
  reacoes: Partial<Record<TipoReacao, number>>;
}

function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
export const novoIdJornal = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function rowToNoticia(r: any): Noticia {
  return {
    id: r.id,
    titulo: r.titulo,
    resumo: u(r.resumo),
    categoria: r.categoria || 'Notícias',
    capa: u(r.capa),
    blocos: r.blocos ?? [],
    status: r.status,
    destaque: !!r.destaque,
    permiteComentarios: r.permite_comentarios !== false,
    autorNome: u(r.autor_nome),
    criadoPor: u(r.criado_por),
    revisadoPor: u(r.revisado_por),
    observacaoRevisao: u(r.observacao_revisao),
    autorizacaoImagem: !!r.autorizacao_imagem,
    publicadaEm: u(r.publicada_em),
    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
  };
}

/** Lista sem o corpo (blocos) — o corpo vem em getNoticia, ao abrir. */
export async function getNoticias(): Promise<Noticia[]> {
  const { data, error } = await supabase
    .from('noticias')
    .select('id, titulo, resumo, categoria, capa, status, destaque, permite_comentarios, autor_nome, criado_por, revisado_por, observacao_revisao, autorizacao_imagem, publicada_em, criado_em, atualizado_em')
    .order('criado_em', { ascending: false });
  assertNoError(error, 'getNoticias');
  return (data ?? []).map((r: any) => rowToNoticia({ ...r, blocos: [] }));
}

export async function getNoticia(id: string): Promise<Noticia | null> {
  const { data, error } = await supabase.from('noticias').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'getNoticia');
  return data ? rowToNoticia(data) : null;
}

export async function saveNoticia(n: Noticia): Promise<Noticia> {
  const registro = { ...n, id: n.id || novoIdJornal('not'), atualizadoEm: new Date().toISOString() };
  const { error } = await supabase.from('noticias').upsert({
    id: registro.id,
    titulo: registro.titulo,
    resumo: registro.resumo || null,
    categoria: registro.categoria,
    capa: registro.capa || null,
    blocos: registro.blocos,
    status: registro.status,
    destaque: registro.destaque,
    permite_comentarios: registro.permiteComentarios,
    autor_nome: registro.autorNome || null,
    criado_por: registro.criadoPor || null,
    revisado_por: registro.revisadoPor || null,
    observacao_revisao: registro.observacaoRevisao || null,
    autorizacao_imagem: registro.autorizacaoImagem,
    publicada_em: registro.publicadaEm || null,
    criado_em: registro.criadoEm || new Date().toISOString(),
    atualizado_em: registro.atualizadoEm,
  });
  assertNoError(error, 'saveNoticia');
  return registro;
}

/** Muda só o status (publicar, arquivar, devolver) sem reenviar o corpo. */
export async function atualizarStatusNoticia(id: string, campos: Partial<Pick<Noticia, 'status' | 'destaque' | 'revisadoPor' | 'observacaoRevisao' | 'publicadaEm'>>): Promise<void> {
  const linha: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (campos.status !== undefined) linha.status = campos.status;
  if (campos.destaque !== undefined) linha.destaque = campos.destaque;
  if (campos.revisadoPor !== undefined) linha.revisado_por = campos.revisadoPor || null;
  if (campos.observacaoRevisao !== undefined) linha.observacao_revisao = campos.observacaoRevisao || null;
  if (campos.publicadaEm !== undefined) linha.publicada_em = campos.publicadaEm || null;
  const { error } = await supabase.from('noticias').update(linha).eq('id', id);
  assertNoError(error, 'atualizarStatusNoticia');
}

export async function deleteNoticia(id: string): Promise<void> {
  const { error } = await supabase.from('noticias').delete().eq('id', id);
  assertNoError(error, 'deleteNoticia');
}

/** Envia uma imagem pro bucket público "jornal" e devolve a URL pública. */
export async function enviarImagemJornal(arquivo: File): Promise<string> {
  const nomeSeguro = arquivo.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-60);
  const caminho = `${new Date().toISOString().slice(0, 7)}/${novoIdJornal('img')}-${nomeSeguro}`;
  const { error } = await supabase.storage.from('jornal').upload(caminho, arquivo, { contentType: arquivo.type || 'image/jpeg', upsert: false });
  if (error) throw new Error(`Não foi possível enviar "${arquivo.name}": ${error.message}`);
  return supabase.storage.from('jornal').getPublicUrl(caminho).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Comentários e números
// ---------------------------------------------------------------------------

function rowToComentario(r: any): ComentarioNoticia {
  return {
    id: r.id,
    noticiaId: r.noticia_id,
    colaboradorId: u(r.colaborador_id),
    autorNome: r.autor_nome,
    texto: r.texto,
    status: r.status,
    moderadoPor: u(r.moderado_por),
    moderadoEm: u(r.moderado_em),
    criadoEm: r.criado_em,
  };
}

export async function getComentarios(noticiaId?: string): Promise<ComentarioNoticia[]> {
  let q = supabase.from('noticia_comentarios').select('*').order('criado_em', { ascending: false });
  if (noticiaId) q = q.eq('noticia_id', noticiaId);
  else q = q.eq('status', 'pendente');
  const { data, error } = await q;
  assertNoError(error, 'getComentarios');
  return (data ?? []).map(rowToComentario);
}

export async function moderarComentario(id: string, status: 'aprovado' | 'oculto', moderadoPor?: string): Promise<void> {
  const { error } = await supabase
    .from('noticia_comentarios')
    .update({ status, moderado_por: moderadoPor || null, moderado_em: new Date().toISOString() })
    .eq('id', id);
  assertNoError(error, 'moderarComentario');
}

// ---------------------------------------------------------------------------
// Quem interagiu (só a gestão/administrador vê — tabelas fechadas para o portal)
// ---------------------------------------------------------------------------

export interface InteracoesNoticia {
  leituras: { colaboradorId: string; lidoEm: string }[];
  reacoes: { colaboradorId: string; tipo: TipoReacao; criadoEm: string }[];
  comentarios: ComentarioNoticia[];
}

/** Quem leu, reagiu e comentou uma notícia. */
export async function getInteracoesNoticia(noticiaId: string): Promise<InteracoesNoticia> {
  const [leituras, reacoes, comentarios] = await Promise.all([
    supabase.from('noticia_leituras').select('colaborador_id, lido_em').eq('noticia_id', noticiaId),
    supabase.from('noticia_reacoes').select('colaborador_id, tipo, criado_em').eq('noticia_id', noticiaId),
    getComentarios(noticiaId),
  ]);
  assertNoError(leituras.error, 'getInteracoesNoticia/leituras');
  assertNoError(reacoes.error, 'getInteracoesNoticia/reacoes');
  return {
    leituras: (leituras.data ?? []).map((r: any) => ({ colaboradorId: r.colaborador_id, lidoEm: r.lido_em })),
    reacoes: (reacoes.data ?? []).map((r: any) => ({ colaboradorId: r.colaborador_id, tipo: r.tipo, criadoEm: r.criado_em })),
    comentarios,
  };
}

export interface EngajamentoColaborador {
  colaboradorId: string;
  leituras: number;
  reacoes: number;
  comentarios: number;
  ultimaInteracao?: string;
}

/** Resumo por colaborador de todas as notícias (leituras, reações e comentários). */
export async function getEngajamentoPorColaborador(): Promise<Map<string, EngajamentoColaborador>> {
  const [leituras, reacoes, comentarios] = await Promise.all([
    supabase.from('noticia_leituras').select('colaborador_id, lido_em'),
    supabase.from('noticia_reacoes').select('colaborador_id, criado_em'),
    supabase.from('noticia_comentarios').select('colaborador_id, criado_em'),
  ]);
  assertNoError(leituras.error, 'getEngajamento/leituras');
  assertNoError(reacoes.error, 'getEngajamento/reacoes');
  assertNoError(comentarios.error, 'getEngajamento/comentarios');
  const mapa = new Map<string, EngajamentoColaborador>();
  const somar = (lista: any[] | null, campo: 'leituras' | 'reacoes' | 'comentarios', data: string) =>
    (lista ?? []).forEach((r: any) => {
      if (!r.colaborador_id) return;
      const e: EngajamentoColaborador = mapa.get(r.colaborador_id) || { colaboradorId: r.colaborador_id, leituras: 0, reacoes: 0, comentarios: 0 };
      e[campo] += 1;
      const quando = r[data];
      if (quando && (!e.ultimaInteracao || quando > e.ultimaInteracao)) e.ultimaInteracao = quando;
      mapa.set(r.colaborador_id, e);
    });
  somar(leituras.data, 'leituras', 'lido_em');
  somar(reacoes.data, 'reacoes', 'criado_em');
  somar(comentarios.data, 'comentarios', 'criado_em');
  return mapa;
}

/** Comentários por notícia (todos os status), para o painel de engajamento. */
export async function getContagemComentarios(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('noticia_comentarios').select('noticia_id');
  assertNoError(error, 'getContagemComentarios');
  const mapa = new Map<string, number>();
  (data ?? []).forEach((r: any) => mapa.set(r.noticia_id, (mapa.get(r.noticia_id) || 0) + 1));
  return mapa;
}

/** Leituras e reações de todas as notícias (só as colunas pequenas). */
export async function getEstatisticas(): Promise<Map<string, EstatisticasNoticia>> {
  const [leituras, reacoes] = await Promise.all([
    supabase.from('noticia_leituras').select('noticia_id'),
    supabase.from('noticia_reacoes').select('noticia_id, tipo'),
  ]);
  assertNoError(leituras.error, 'getEstatisticas/leituras');
  assertNoError(reacoes.error, 'getEstatisticas/reacoes');
  const mapa = new Map<string, EstatisticasNoticia>();
  const de = (id: string) => {
    if (!mapa.has(id)) mapa.set(id, { leituras: 0, reacoes: {} });
    return mapa.get(id)!;
  };
  (leituras.data ?? []).forEach((r: any) => (de(r.noticia_id).leituras += 1));
  (reacoes.data ?? []).forEach((r: any) => {
    const e = de(r.noticia_id);
    e.reacoes[r.tipo as TipoReacao] = (e.reacoes[r.tipo as TipoReacao] || 0) + 1;
  });
  return mapa;
}

// ---------------------------------------------------------------------------
// Portal (sem login)
// ---------------------------------------------------------------------------

export interface NoticiaPortalResumo {
  id: string;
  titulo: string;
  resumo?: string | null;
  categoria: string;
  capa?: string | null;
  destaque: boolean;
  autorNome?: string | null;
  publicadaEm: string;
  reacoes: Partial<Record<TipoReacao, number>>;
  minhaReacao?: TipoReacao | null;
  comentarios: number;
  lida: boolean;
}

export interface ComentarioPortal {
  id: string;
  autorNome: string;
  texto: string;
  criadoEm: string;
  pendente: boolean;
  meu: boolean;
}

export interface NoticiaPortal extends Omit<NoticiaPortalResumo, 'comentarios' | 'lida' | 'destaque'> {
  blocos: BlocoNoticia[];
  permiteComentarios: boolean;
  comentarios: ComentarioPortal[];
}

const args = (c: CredenciaisPortal) => ({ p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });

export async function portalJornal(c: CredenciaisPortal): Promise<NoticiaPortalResumo[]> {
  const { data, error } = await supabase.rpc('portal_jornal', args(c));
  assertNoError(error, 'portalJornal');
  if (data?.erro) throw new Error('Não foi possível abrir o jornal. Saia e entre de novo.');
  return data?.noticias ?? [];
}

export async function portalNoticia(c: CredenciaisPortal, noticiaId: string): Promise<NoticiaPortal> {
  const { data, error } = await supabase.rpc('portal_noticia', { ...args(c), p_noticia_id: noticiaId });
  assertNoError(error, 'portalNoticia');
  if (data?.erro) throw new Error(data.erro === 'noticia' ? 'Esta notícia não está mais disponível.' : 'Não foi possível abrir a notícia.');
  return data as NoticiaPortal;
}

export async function portalReagir(c: CredenciaisPortal, noticiaId: string, tipo: TipoReacao | null): Promise<{ reacoes: Partial<Record<TipoReacao, number>>; minhaReacao?: TipoReacao | null }> {
  const { data, error } = await supabase.rpc('portal_reagir', { ...args(c), p_noticia_id: noticiaId, p_tipo: tipo || '' });
  assertNoError(error, 'portalReagir');
  if (data?.erro) throw new Error('Não foi possível registrar a reação.');
  return data;
}

export async function portalComentar(c: CredenciaisPortal, noticiaId: string, texto: string): Promise<ComentarioPortal> {
  const { data, error } = await supabase.rpc('portal_comentar', { ...args(c), p_noticia_id: noticiaId, p_texto: texto });
  assertNoError(error, 'portalComentar');
  if (data?.erro) {
    const msg: Record<string, string> = {
      tamanho: 'O comentário precisa ter entre 1 e 1000 caracteres.',
      limite: 'Você já tem comentários aguardando aprovação nesta notícia. Aguarde a aprovação para comentar de novo.',
      noticia: 'Esta notícia não aceita comentários.',
    };
    throw new Error(msg[data.erro] || 'Não foi possível enviar o comentário.');
  }
  return data;
}
