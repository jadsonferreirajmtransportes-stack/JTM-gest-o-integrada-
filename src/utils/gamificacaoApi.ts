// ============================================================================
// Gamificação — acesso ao banco (migração 075). Os pontos são calculados em
// gamificacaoCalc.ts; aqui só os reconhecimentos/destaques lançados pelo DP e
// as consultas leves que a tela do DP usa pra montar o mês.
// ============================================================================

import { supabase } from './supabaseClient';
import type { CredenciaisPortal } from './educacaoApi';

export interface Reconhecimento {
  id: string;
  colaboradorId: string;
  data: string;
  pontos: number;
  motivo: string;
  criadoPor?: string;
}

export interface DestaqueMes {
  id: string;
  periodo: string;
  colaboradorId: string;
  pontos: number;
  noticiaId?: string;
}

function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
const novoId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface PosicaoColaborador {
  periodo: string;
  posicao: number;
  pontos: number;
  participantes: number;
  /** Pontos de quem está em 10º — corte do Top 10. */
  pontosTop10: number;
  atualizadoEm: string;
}

// ---- Portal (só os do próprio colaborador) ----
export async function portalGamificacao(c: CredenciaisPortal): Promise<{ reconhecimentos: Reconhecimento[]; destaques: { periodo: string; pontos: number }[]; posicao?: PosicaoColaborador }> {
  const { data, error } = await supabase.rpc('portal_gamificacao', { p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });
  assertNoError(error, 'portalGamificacao');
  if (data?.erro) throw new Error('Não foi possível carregar seu desempenho.');
  return {
    reconhecimentos: (data?.reconhecimentos ?? []).map((r: any) => ({ id: r.id, colaboradorId: '', data: r.data, pontos: Number(r.pontos) || 0, motivo: r.motivo })),
    destaques: data?.destaques ?? [],
    posicao: data?.posicao ?? undefined,
  };
}

/** Grava a classificação do mês (ranking por pontos, empates na mesma posição: 1, 2, 2, 4...)
 *  — é dela que o portal tira a colocação de cada um, sem ver os pontos dos colegas. */
export async function salvarPosicoes(periodo: string, pontosPorColaborador: { colaboradorId: string; pontos: number }[]): Promise<void> {
  if (!pontosPorColaborador.length) return;
  const ordenados = [...pontosPorColaborador].sort((a, b) => b.pontos - a.pontos);
  const corte = ordenados[Math.min(9, ordenados.length - 1)].pontos;
  const agora = new Date().toISOString();
  const linhas = ordenados.map((x) => ({
    periodo,
    colaborador_id: x.colaboradorId,
    posicao: 1 + ordenados.filter((o) => o.pontos > x.pontos).length,
    pontos: x.pontos,
    participantes: ordenados.length,
    pontos_top10: corte,
    atualizado_em: agora,
  }));
  const { error } = await supabase.from('gamificacao_posicoes').upsert(linhas, { onConflict: 'periodo,colaborador_id' });
  assertNoError(error, 'salvarPosicoes');
}

// ---- DP ----
export async function getReconhecimentos(): Promise<Reconhecimento[]> {
  const { data, error } = await supabase.from('gamificacao_reconhecimentos').select('*').order('data', { ascending: false });
  assertNoError(error, 'getReconhecimentos');
  return (data ?? []).map((r: any) => ({ id: r.id, colaboradorId: r.colaborador_id, data: r.data, pontos: Number(r.pontos) || 0, motivo: r.motivo, criadoPor: r.criado_por ?? undefined }));
}

export async function salvarReconhecimento(r: Omit<Reconhecimento, 'id'>): Promise<Reconhecimento> {
  const novo = { ...r, id: novoId('rec') };
  const { error } = await supabase.from('gamificacao_reconhecimentos').insert({
    id: novo.id,
    colaborador_id: r.colaboradorId,
    data: r.data,
    pontos: r.pontos,
    motivo: r.motivo,
    criado_por: r.criadoPor ?? null,
  });
  assertNoError(error, 'salvarReconhecimento');
  return novo;
}

export async function excluirReconhecimento(id: string): Promise<void> {
  const { error } = await supabase.from('gamificacao_reconhecimentos').delete().eq('id', id);
  assertNoError(error, 'excluirReconhecimento');
}

export async function getDestaques(): Promise<DestaqueMes[]> {
  const { data, error } = await supabase.from('gamificacao_destaques').select('*').order('periodo', { ascending: false });
  assertNoError(error, 'getDestaques');
  return (data ?? []).map((d: any) => ({ id: d.id, periodo: d.periodo, colaboradorId: d.colaborador_id, pontos: Number(d.pontos) || 0, noticiaId: d.noticia_id ?? undefined }));
}

export async function salvarDestaque(d: Omit<DestaqueMes, 'id'> & { criadoPor?: string }): Promise<DestaqueMes> {
  const id = `${d.periodo}-${d.colaboradorId}`;
  const { error } = await supabase.from('gamificacao_destaques').upsert({
    id,
    periodo: d.periodo,
    colaborador_id: d.colaboradorId,
    pontos: d.pontos,
    noticia_id: d.noticiaId ?? null,
    criado_por: d.criadoPor ?? null,
  });
  assertNoError(error, 'salvarDestaque');
  return { ...d, id };
}

const limitesMes = (periodo: string) => {
  const [a, m] = periodo.split('-').map(Number);
  const ini = new Date(`${periodo}-01T00:00:00-03:00`);
  const fim = new Date(`${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01T00:00:00-03:00`);
  return { ini: ini.toISOString(), fim: fim.toISOString() };
};

/** O que cada colaborador fez no mês (só as colunas necessárias, só do período). */
export async function getAtividadesDoMes(periodo: string): Promise<{
  treinamentos: { colaboradorId: string; concluidoEm: string }[];
  documentos: { colaboradorId: string; criadoEm: string; assinadoEm: string }[];
  comunicados: { colaboradorId: string; criadoEm: string; exigeCiencia: boolean; cienteEm: string }[];
}> {
  const { ini, fim } = limitesMes(periodo);
  const [t, d, c] = await Promise.all([
    supabase.from('treinamento_atribuicoes').select('colaborador_id, concluido_em').gte('concluido_em', ini).lt('concluido_em', fim).limit(5000),
    supabase.from('documentos_assinatura').select('colaborador_id, criado_em, assinado_em').gte('assinado_em', ini).lt('assinado_em', fim).limit(5000),
    supabase.from('comunicado_destinatarios').select('ref_id, ciente_em, comunicados(criado_em, exige_ciencia)').eq('tipo', 'colaborador').gte('ciente_em', ini).lt('ciente_em', fim).limit(5000),
  ]);
  assertNoError(t.error, 'getAtividadesDoMes (treinamentos)');
  assertNoError(d.error, 'getAtividadesDoMes (documentos)');
  assertNoError(c.error, 'getAtividadesDoMes (comunicados)');
  return {
    treinamentos: (t.data ?? []).map((r: any) => ({ colaboradorId: r.colaborador_id, concluidoEm: r.concluido_em })),
    documentos: (d.data ?? []).map((r: any) => ({ colaboradorId: r.colaborador_id, criadoEm: r.criado_em, assinadoEm: r.assinado_em })),
    comunicados: (c.data ?? [])
      .filter((r: any) => r.ref_id && r.comunicados)
      .map((r: any) => ({ colaboradorId: r.ref_id, criadoEm: r.comunicados.criado_em, exigeCiencia: !!r.comunicados.exige_ciencia, cienteEm: r.ciente_em })),
  };
}
