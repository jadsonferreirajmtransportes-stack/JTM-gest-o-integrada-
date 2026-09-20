// ============================================================================
// Camada de acesso a dados do cadastro de Operações/Setores (ver migração
// 040_operacoes.sql) — mesmo padrão de dpApi.ts (getX/saveX/deleteX,
// snake_case no banco, camelCase na aplicação).
// ============================================================================

import { supabase } from './supabaseClient';
import { Operacao, LancamentoFaturamentoOperacao } from '../types';

function n(v: any): any {
  return v === '' || v === undefined ? null : v;
}
function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) {
    throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
  }
}

function rowToOperacao(r: any): Operacao {
  return {
    id: r.id,
    nome: r.nome,
    nomeCurto: u(r.nome_curto),
    icone: r.icone,
    corDe: r.cor_de,
    corAte: r.cor_ate,
    corBorda: r.cor_borda,
    ordem: Number(r.ordem ?? 100),
    ativo: r.ativo ?? true,
    secoesAtivas: u(r.secoes_ativas),
    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
  };
}

function operacaoToRow(o: Operacao) {
  return {
    id: o.id,
    nome: o.nome,
    nome_curto: n(o.nomeCurto),
    icone: o.icone,
    cor_de: o.corDe,
    cor_ate: o.corAte,
    cor_borda: o.corBorda,
    ordem: o.ordem ?? 100,
    ativo: o.ativo ?? true,
    secoes_ativas: o.secoesAtivas && o.secoesAtivas.length > 0 ? o.secoesAtivas : null,
    atualizado_em: new Date().toISOString(),
  };
}

export async function getOperacoes(): Promise<Operacao[]> {
  const { data, error } = await supabase.from('operacoes').select('*').order('ordem');
  assertNoError(error, 'getOperacoes');
  return (data ?? []).map(rowToOperacao);
}

export async function saveOperacao(item: Operacao): Promise<void> {
  const { error } = await supabase.from('operacoes').upsert(operacaoToRow(item));
  assertNoError(error, 'saveOperacao');
}

export async function deleteOperacao(id: string): Promise<void> {
  const { error } = await supabase.from('operacoes').delete().eq('id', id);
  assertNoError(error, 'deleteOperacao');
}

// ============================================================================
// LANÇAMENTOS DE FATURAMENTO POR OPERAÇÃO (ver migração 042)
// ============================================================================

function rowToLancamentoFaturamentoOperacao(r: any): LancamentoFaturamentoOperacao {
  return {
    id: r.id,
    operacaoId: r.operacao_id,
    clienteId: u(r.cliente_id),
    clienteNome: u(r.cliente_nome),
    periodo: r.periodo,
    valor: Number(r.valor ?? 0),
    numeroNF: u(r.numero_nf),
    descricao: u(r.descricao),
    anexoNome: u(r.anexo_nome),
    anexoUrl: u(r.anexo_url),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
  };
}

function lancamentoFaturamentoOperacaoToRow(l: LancamentoFaturamentoOperacao) {
  return {
    id: l.id,
    operacao_id: l.operacaoId,
    cliente_id: n(l.clienteId),
    cliente_nome: n(l.clienteNome),
    periodo: l.periodo,
    valor: l.valor ?? 0,
    numero_nf: n(l.numeroNF),
    descricao: n(l.descricao),
    anexo_nome: n(l.anexoNome),
    anexo_url: n(l.anexoUrl),
    criado_em: l.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}

export async function getLancamentosFaturamentoOperacao(): Promise<LancamentoFaturamentoOperacao[]> {
  const { data, error } = await supabase
    .from('lancamentos_faturamento_operacao')
    .select('*')
    .order('periodo', { ascending: false });
  assertNoError(error, 'getLancamentosFaturamentoOperacao');
  return (data ?? []).map(rowToLancamentoFaturamentoOperacao);
}

export async function saveLancamentoFaturamentoOperacao(item: LancamentoFaturamentoOperacao): Promise<void> {
  const { error } = await supabase
    .from('lancamentos_faturamento_operacao')
    .upsert(lancamentoFaturamentoOperacaoToRow(item));
  assertNoError(error, 'saveLancamentoFaturamentoOperacao');
}

export async function deleteLancamentoFaturamentoOperacao(id: string): Promise<void> {
  const { error } = await supabase.from('lancamentos_faturamento_operacao').delete().eq('id', id);
  assertNoError(error, 'deleteLancamentoFaturamentoOperacao');
}
