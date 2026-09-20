// ============================================================================
// Camada de acesso a dados do cadastro de Operações/Setores (ver migração
// 040_operacoes.sql) — mesmo padrão de dpApi.ts (getX/saveX/deleteX,
// snake_case no banco, camelCase na aplicação).
// ============================================================================

import { supabase } from './supabaseClient';
import { Operacao } from '../types';

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
