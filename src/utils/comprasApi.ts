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
    setor: u(r.setor),
    justificativa: u(r.justificativa),
    valorEstimado: r.valor_estimado === null ? undefined : Number(r.valor_estimado),
    fornecedorSugerido: u(r.fornecedor_sugerido),
    urgencia: r.urgencia ?? 'Normal',
    prazoNecessario: u(r.prazo_necessario),
    anexoNome: u(r.anexo_nome),
    anexoUrl: u(r.anexo_url),
    temAnexo: !!(r.anexo_url || r.anexo_nome),
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
  // A lista vem sem o arquivo (ver getSolicitacoesCompra), então "sem conteúdo" NÃO quer dizer
  // "sem anexo" — anexo_url só entra no upsert quando há um arquivo novo; fora isso fica de fora
  // e o arquivo já gravado no banco é preservado (upsert só atualiza as colunas enviadas). O
  // formulário não tem "remover anexo", só trocar o arquivo.
  const anexoIntocado = !s.anexoUrl;
  const { anexo_url, ...row } = {
    id: s.id,
    grupo_id: n(s.grupoId),
    item: s.item,
    quantidade: s.quantidade ?? 1,
    setor: n(s.setor),
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
  return anexoIntocado ? row : { ...row, anexo_url };
}

/** Lista SEM o conteúdo dos anexos (anexo_url fica de fora) — cada solicitação pode ter um
 *  arquivo em base64, repetido em cada item de um pedido com vários itens, e a lista inteira
 *  vem em toda abertura do sistema. `temAnexo` indica quem tem arquivo; o conteúdo vem de
 *  getAnexoSolicitacaoCompra(id) na hora de baixar. */
export async function getSolicitacoesCompra(): Promise<SolicitacaoCompra[]> {
  const { data, error } = await supabase
    .from('solicitacoes_compra')
    .select(
      'id, grupo_id, item, quantidade, setor, justificativa, valor_estimado, fornecedor_sugerido, urgencia, ' +
        'prazo_necessario, anexo_nome, solicitante_nome, solicitante_login, solicitante_contato, status, ' +
        'aprovado_por, motivo_recusa, criado_em, atualizado_em'
    )
    .order('criado_em', { ascending: false });
  assertNoError(error, 'getSolicitacoesCompra');
  return (data ?? []).map(rowToSolicitacaoCompra);
}

/** Conteúdo (data URL) do anexo de UMA solicitação. */
export async function getAnexoSolicitacaoCompra(id: string): Promise<string | null> {
  const { data, error } = await supabase.from('solicitacoes_compra').select('anexo_url').eq('id', id).maybeSingle();
  assertNoError(error, 'getAnexoSolicitacaoCompra');
  return data?.anexo_url ?? null;
}

/** Devolve o registro exatamente como foi gravado (id gerado, datas) — quem chama atualiza o
 *  item no estado local em vez de baixar a lista inteira de novo (cada item pode ter um anexo
 *  em base64, então recarregar tudo a cada aprovação/recusa pesava no Egress do Supabase). */
export async function saveSolicitacaoCompra(item: SolicitacaoCompra): Promise<SolicitacaoCompra> {
  const registro = item.id ? item : { ...item, id: `compra-${Date.now()}` };
  const row = solicitacaoCompraToRow(registro);
  const { error } = await supabase.from('solicitacoes_compra').upsert(row);
  assertNoError(error, 'saveSolicitacaoCompra');
  return rowToSolicitacaoCompra(row);
}

/** Só pro Formulário Público de Compras (papel "anon"). `upsert` (usado em saveSolicitacaoCompra
 *  acima) gera um `INSERT ... ON CONFLICT DO UPDATE`, e o Postgres exige permissão de UPDATE na
 *  tabela pra esse comando ser válido mesmo quando nenhum conflito realmente acontece — e o
 *  "anon" só tem policy de INSERT (de propósito: ninguém sem login pode editar pedido alheio).
 *  Por isso aqui é sempre um INSERT puro, nunca upsert. */
export async function criarSolicitacaoCompraPublica(item: SolicitacaoCompra): Promise<void> {
  const { error } = await supabase.from('solicitacoes_compra').insert(solicitacaoCompraToRow(item));
  assertNoError(error, 'criarSolicitacaoCompraPublica');
}

export async function deleteSolicitacaoCompra(id: string): Promise<void> {
  const { error } = await supabase.from('solicitacoes_compra').delete().eq('id', id);
  assertNoError(error, 'deleteSolicitacaoCompra');
}
