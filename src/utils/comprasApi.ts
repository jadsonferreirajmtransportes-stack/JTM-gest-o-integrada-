// ============================================================================
// Camada de acesso a dados do módulo Compras (solicitações de itens para compra —
// ver migração 050_solicitacoes_compra.sql). Mesmo padrão de dpApi.ts (getX/saveX/
// deleteX, snake_case no banco, camelCase na aplicação). `saveSolicitacaoCompra`
// serve tanto o uso interno (usuário logado) quanto o Formulário Público de Compras
// (usuário "anon" do Supabase, que só tem permissão de INSERT — ver RLS na migração).
// ============================================================================

import { supabase } from './supabaseClient';
import { SolicitacaoCompra } from '../types';

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

function rowToSolicitacaoCompra(r: any): SolicitacaoCompra {
  return {
    id: r.id,
    grupoId: u(r.grupo_id),
    item: r.item,
    quantidade: Number(r.quantidade ?? 1),
    justificativa: u(r.justificativa),
    valorEstimado: r.valor_estimado === null ? undefined : Number(r.valor_estimado),
    fornecedorSugerido: u(r.fornecedor_sugerido),
    urgencia: r.urgencia ?? 'Normal',
    prazoNecessario: u(r.prazo_necessario),
    anexoNome: u(r.anexo_nome),
    anexoUrl: u(r.anexo_url),
    solicitanteNome: r.solicitante_nome,
    solicitanteLogin: u(r.solicitante_login),
    solicitanteContato: u(r.solicitante_contato),
    status: r.status ?? 'Pendente',
    aprovadoPor: u(r.aprovado_por),
    motivoRecusa: u(r.motivo_recusa),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
  };
}

function solicitacaoCompraToRow(s: SolicitacaoCompra) {
  return {
    id: s.id,
    grupo_id: n(s.grupoId),
    item: s.item,
    quantidade: s.quantidade ?? 1,
    justificativa: n(s.justificativa),
    valor_estimado: s.valorEstimado ?? null,
    fornecedor_sugerido: n(s.fornecedorSugerido),
    urgencia: s.urgencia ?? 'Normal',
    prazo_necessario: n(s.prazoNecessario),
    anexo_nome: n(s.anexoNome),
    anexo_url: n(s.anexoUrl),
    solicitante_nome: s.solicitanteNome,
    solicitante_login: n(s.solicitanteLogin),
    solicitante_contato: n(s.solicitanteContato),
    status: s.status ?? 'Pendente',
    aprovado_por: n(s.aprovadoPor),
    motivo_recusa: n(s.motivoRecusa),
    criado_em: s.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}

export async function getSolicitacoesCompra(): Promise<SolicitacaoCompra[]> {
  const { data, error } = await supabase
    .from('solicitacoes_compra')
    .select('*')
    .order('criado_em', { ascending: false });
  assertNoError(error, 'getSolicitacoesCompra');
  return (data ?? []).map(rowToSolicitacaoCompra);
}

export async function saveSolicitacaoCompra(item: SolicitacaoCompra): Promise<void> {
  const registro = item.id ? item : { ...item, id: `compra-${Date.now()}` };
  const { error } = await supabase.from('solicitacoes_compra').upsert(solicitacaoCompraToRow(registro));
  assertNoError(error, 'saveSolicitacaoCompra');
}

export async function deleteSolicitacaoCompra(id: string): Promise<void> {
  const { error } = await supabase.from('solicitacoes_compra').delete().eq('id', id);
  assertNoError(error, 'deleteSolicitacaoCompra');
}
