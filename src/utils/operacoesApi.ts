// ============================================================================
// Camada de acesso a dados do cadastro de Operações/Setores (ver migração
// 040_operacoes.sql) — mesmo padrão de dpApi.ts (getX/saveX/deleteX,
// snake_case no banco, camelCase na aplicação).
// ============================================================================

import { supabase } from './supabaseClient';
import {
  Operacao,
  LancamentoFaturamentoOperacao,
  TipoOperacaoDiaria,
  RegistroDiaOperacao,
  FaixaVolumeOperacao,
  ColetaOperacao,
} from '../types';

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

// ============================================================================
// ACOMPANHAMENTO POR DIA CORRIDO (ver migração 043)
// ============================================================================

function rowToTipoOperacaoDiaria(r: any): TipoOperacaoDiaria {
  return {
    id: r.id,
    operacaoId: r.operacao_id,
    nome: r.nome,
    valorDiario: Number(r.valor_diario ?? 0),
    ativo: r.ativo ?? true,
    ordem: Number(r.ordem ?? 100),
    clienteId: u(r.cliente_id),
    clienteNome: u(r.cliente_nome),
    criadoEm: u(r.criado_em),
  };
}
function tipoOperacaoDiariaToRow(t: TipoOperacaoDiaria) {
  return {
    id: t.id,
    operacao_id: t.operacaoId,
    nome: t.nome,
    valor_diario: t.valorDiario ?? 0,
    ativo: t.ativo ?? true,
    ordem: t.ordem ?? 100,
    cliente_id: n(t.clienteId),
    cliente_nome: n(t.clienteNome),
  };
}
export async function getTiposOperacaoDiaria(): Promise<TipoOperacaoDiaria[]> {
  const { data, error } = await supabase.from('tipos_operacao_diaria').select('*').order('ordem');
  assertNoError(error, 'getTiposOperacaoDiaria');
  return (data ?? []).map(rowToTipoOperacaoDiaria);
}
export async function saveTipoOperacaoDiaria(item: TipoOperacaoDiaria): Promise<void> {
  const { error } = await supabase.from('tipos_operacao_diaria').upsert(tipoOperacaoDiariaToRow(item));
  assertNoError(error, 'saveTipoOperacaoDiaria');
}
export async function deleteTipoOperacaoDiaria(id: string): Promise<void> {
  const { error } = await supabase.from('tipos_operacao_diaria').delete().eq('id', id);
  assertNoError(error, 'deleteTipoOperacaoDiaria');
}

function rowToRegistroDiaOperacao(r: any): RegistroDiaOperacao {
  return {
    id: r.id,
    operacaoId: r.operacao_id,
    tipoOperacaoId: r.tipo_operacao_id,
    data: r.data,
    criadoEm: u(r.criado_em),
  };
}
export async function getRegistrosDiaOperacao(): Promise<RegistroDiaOperacao[]> {
  const { data, error } = await supabase.from('registros_dia_operacao').select('*');
  assertNoError(error, 'getRegistrosDiaOperacao');
  return (data ?? []).map(rowToRegistroDiaOperacao);
}
/** Marca um dia como "rodou" pra um tipo — id determinístico, então marcar de novo não duplica. */
export async function marcarRegistroDiaOperacao(item: RegistroDiaOperacao): Promise<void> {
  const { error } = await supabase.from('registros_dia_operacao').upsert({
    id: item.id,
    operacao_id: item.operacaoId,
    tipo_operacao_id: item.tipoOperacaoId,
    data: item.data,
  });
  assertNoError(error, 'marcarRegistroDiaOperacao');
}
export async function desmarcarRegistroDiaOperacao(id: string): Promise<void> {
  const { error } = await supabase.from('registros_dia_operacao').delete().eq('id', id);
  assertNoError(error, 'desmarcarRegistroDiaOperacao');
}

// ============================================================================
// ACOMPANHAMENTO POR COLETA/EVENTO COM TABELA DE FAIXAS (ver migração 043)
// ============================================================================

function rowToFaixaVolumeOperacao(r: any): FaixaVolumeOperacao {
  return {
    id: r.id,
    operacaoId: r.operacao_id,
    volumeMin: Number(r.volume_min ?? 0),
    volumeMax: r.volume_max === null ? undefined : Number(r.volume_max),
    valor: Number(r.valor ?? 0),
    ordem: Number(r.ordem ?? 100),
  };
}
function faixaVolumeOperacaoToRow(f: FaixaVolumeOperacao) {
  return {
    id: f.id,
    operacao_id: f.operacaoId,
    volume_min: f.volumeMin,
    volume_max: f.volumeMax ?? null,
    valor: f.valor,
    ordem: f.ordem ?? 100,
  };
}
export async function getFaixasVolumeOperacao(): Promise<FaixaVolumeOperacao[]> {
  const { data, error } = await supabase.from('faixas_volume_operacao').select('*').order('ordem');
  assertNoError(error, 'getFaixasVolumeOperacao');
  return (data ?? []).map(rowToFaixaVolumeOperacao);
}
export async function saveFaixaVolumeOperacao(item: FaixaVolumeOperacao): Promise<void> {
  const { error } = await supabase.from('faixas_volume_operacao').upsert(faixaVolumeOperacaoToRow(item));
  assertNoError(error, 'saveFaixaVolumeOperacao');
}
export async function deleteFaixaVolumeOperacao(id: string): Promise<void> {
  const { error } = await supabase.from('faixas_volume_operacao').delete().eq('id', id);
  assertNoError(error, 'deleteFaixaVolumeOperacao');
}

function rowToColetaOperacao(r: any): ColetaOperacao {
  return {
    id: r.id,
    operacaoId: r.operacao_id,
    data: r.data,
    clienteId: u(r.cliente_id),
    clienteNome: u(r.cliente_nome),
    destinatario: u(r.destinatario),
    cidade: u(r.cidade),
    quantidadeVolumes: Number(r.quantidade_volumes ?? 1),
    numeroDocumento: u(r.numero_documento),
    valor: Number(r.valor ?? 0),
    observacao: u(r.observacao),
    criadoEm: u(r.criado_em),
  };
}
function coletaOperacaoToRow(c: ColetaOperacao) {
  return {
    id: c.id,
    operacao_id: c.operacaoId,
    data: c.data,
    cliente_id: n(c.clienteId),
    cliente_nome: n(c.clienteNome),
    destinatario: n(c.destinatario),
    cidade: n(c.cidade),
    quantidade_volumes: c.quantidadeVolumes ?? 1,
    numero_documento: n(c.numeroDocumento),
    valor: c.valor ?? 0,
    observacao: n(c.observacao),
    criado_em: c.criadoEm || new Date().toISOString(),
  };
}
export async function getColetasOperacao(): Promise<ColetaOperacao[]> {
  const { data, error } = await supabase.from('coletas_operacao').select('*').order('data', { ascending: false });
  assertNoError(error, 'getColetasOperacao');
  return (data ?? []).map(rowToColetaOperacao);
}
export async function saveColetaOperacao(item: ColetaOperacao): Promise<void> {
  const { error } = await supabase.from('coletas_operacao').upsert(coletaOperacaoToRow(item));
  assertNoError(error, 'saveColetaOperacao');
}
export async function deleteColetaOperacao(id: string): Promise<void> {
  const { error } = await supabase.from('coletas_operacao').delete().eq('id', id);
  assertNoError(error, 'deleteColetaOperacao');
}
