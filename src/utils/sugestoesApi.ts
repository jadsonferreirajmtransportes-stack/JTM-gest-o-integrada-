// ============================================================================
// Sugestões de melhoria — acesso ao banco (ver migração 094_sugestoes.sql).
// Gestão (logado): tabela sugestoes (sem saber quem mandou as anônimas nem quem apoiou).
// Portal (sem login): portal_sugestao_enviar / portal_sugestoes / portal_sugestao_apoiar.
// ============================================================================

import { supabase } from './supabaseClient';
import type { CredenciaisPortal } from './educacaoApi';

export const CATEGORIAS_SUGESTAO = [
  'Segurança',
  'Qualidade e Boas Práticas',
  'Processos e produtividade',
  'Atendimento ao cliente',
  'Redução de custos',
  'Ambiente de trabalho e bem-estar',
  'Tecnologia e sistema',
  'Meio ambiente',
  'Outro',
];

export type StatusSugestao = 'recebida' | 'analise' | 'aprovada' | 'implementada' | 'nao_aprovada';
export const STATUS_SUGESTAO: { id: StatusSugestao; rotulo: string; cls: string }[] = [
  { id: 'recebida', rotulo: 'Recebida', cls: 'bg-amber-50 text-[#92611F] border-amber-200' },
  { id: 'analise', rotulo: 'Em análise', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'aprovada', rotulo: 'Aprovada', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'implementada', rotulo: 'Implementada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'nao_aprovada', rotulo: 'Não aprovada', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
];
export const statusSugestao = (s: string) => STATUS_SUGESTAO.find((x) => x.id === s) || STATUS_SUGESTAO[0];

export interface Sugestao {
  id: string;
  protocolo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  beneficio?: string;
  anonima: boolean;
  colaboradorNome?: string;
  setor?: string;
  status: StatusSugestao;
  resposta?: string;
  notaInterna?: string;
  responsavel?: string;
  noMural: boolean;
  apoios: number;
  lida: boolean;
  respondidaEm?: string;
  criadoEm: string;
  atualizadoEm: string;
}

function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
const u = <T,>(v: T | null | undefined) => (v === null ? undefined : v);

function rowToSugestao(r: any): Sugestao {
  return {
    id: r.id,
    protocolo: `SUG-${r.ano}-${String(r.numero ?? 0).padStart(3, '0')}`,
    titulo: r.titulo,
    descricao: r.descricao,
    categoria: r.categoria,
    beneficio: u(r.beneficio),
    anonima: !!r.anonima,
    colaboradorNome: u(r.colaborador_nome),
    setor: u(r.setor),
    status: r.status,
    resposta: u(r.resposta),
    notaInterna: u(r.nota_interna),
    responsavel: u(r.responsavel),
    noMural: !!r.no_mural,
    apoios: Number(r.apoios_total || 0),
    lida: !!r.lida,
    respondidaEm: u(r.respondida_em),
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  };
}

export async function getSugestoes(): Promise<Sugestao[]> {
  const { data, error } = await supabase.from('sugestoes').select('*').order('criado_em', { ascending: false });
  falhou(error, 'getSugestoes');
  return (data ?? []).map(rowToSugestao);
}

/** A gestão analisa: situação, resposta, mural, responsável e nota interna. */
export async function atualizarSugestao(
  id: string,
  p: Partial<Pick<Sugestao, 'status' | 'resposta' | 'notaInterna' | 'responsavel' | 'noMural' | 'categoria' | 'lida'>>,
  respondeuAgora?: boolean
): Promise<void> {
  const linha: Record<string, any> = { atualizado_em: new Date().toISOString() };
  if (p.status !== undefined) linha.status = p.status;
  if (p.resposta !== undefined) linha.resposta = p.resposta.trim() || null;
  if (p.notaInterna !== undefined) linha.nota_interna = p.notaInterna.trim() || null;
  if (p.responsavel !== undefined) linha.responsavel = p.responsavel.trim() || null;
  if (p.noMural !== undefined) linha.no_mural = p.noMural;
  if (p.categoria !== undefined) linha.categoria = p.categoria;
  if (p.lida !== undefined) linha.lida = p.lida;
  if (respondeuAgora) linha.respondida_em = new Date().toISOString();
  const { error } = await supabase.from('sugestoes').update(linha).eq('id', id);
  falhou(error, 'atualizarSugestao');
}

export async function excluirSugestao(id: string): Promise<void> {
  const { error } = await supabase.from('sugestoes').delete().eq('id', id);
  falhou(error, 'excluirSugestao');
}

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------
export interface SugestaoPortal {
  id: string;
  protocolo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  status: StatusSugestao;
  resposta?: string;
  anonima?: boolean;
  noMural?: boolean;
  autor?: string;
  setor?: string;
  apoios: number;
  apoiei?: boolean;
  minha?: boolean;
  criadoEm: string;
}

const args = (c: CredenciaisPortal) => ({ p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });
const MENSAGENS: Record<string, string> = {
  dados: 'Não foi possível confirmar seu acesso. Saia e entre de novo.',
  vazia: 'Dê um título e explique a sua sugestão.',
  tamanho: 'O texto ficou grande demais. Resuma um pouco.',
  limite: 'Você já enviou 10 sugestões hoje. Obrigado! Envie as próximas amanhã.',
  nao_encontrada: 'Esta sugestão não está mais no mural.',
  propria: 'Não dá para apoiar a própria sugestão. 😉',
};

export async function portalEnviarSugestao(
  c: CredenciaisPortal,
  s: { titulo: string; descricao: string; categoria: string; beneficio: string; anonima: boolean }
): Promise<{ id: string; protocolo: string }> {
  const { data, error } = await supabase.rpc('portal_sugestao_enviar', {
    ...args(c),
    p_titulo: s.titulo,
    p_descricao: s.descricao,
    p_categoria: s.categoria,
    p_beneficio: s.beneficio,
    p_anonima: s.anonima,
  });
  falhou(error, 'portalEnviarSugestao');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível enviar.');
  return data;
}

export async function portalSugestoes(c: CredenciaisPortal): Promise<{ minhas: SugestaoPortal[]; mural: SugestaoPortal[] }> {
  const { data, error } = await supabase.rpc('portal_sugestoes', args(c));
  falhou(error, 'portalSugestoes');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível carregar.');
  return { minhas: data?.minhas ?? [], mural: data?.mural ?? [] };
}

export async function portalApoiarSugestao(c: CredenciaisPortal, id: string): Promise<{ apoios: number; apoiei: boolean }> {
  const { data, error } = await supabase.rpc('portal_sugestao_apoiar', { ...args(c), p_id: id });
  falhou(error, 'portalApoiarSugestao');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível apoiar.');
  return data;
}
