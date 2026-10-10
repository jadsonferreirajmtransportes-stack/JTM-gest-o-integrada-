// ============================================================================
// POPs — Procedimento Operacional Padrão (ver migração 073). Cada versão é uma
// linha; o código (POP-SETOR-001) se repete entre versões.
// Fluxo: Rascunho → Em revisão → Em aprovação → Vigente (a anterior vira
// Obsoleto). Revisão/aprovação podem devolver para Rascunho com observação.
// ============================================================================

import { supabase } from './supabaseClient';

import { ConteudoPop, Pop, StatusPop, normalizarConteudo, novoIdPop } from './popsModelo';
export * from './popsModelo';

function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
const u = <T,>(v: T | null | undefined): T | undefined => (v === null || v === undefined ? undefined : v);

function rowToPop(r: any): Pop {
  return {
    id: r.id,
    codigo: r.codigo,
    versao: r.versao,
    titulo: r.titulo,
    setor: r.setor,
    classificacao: r.classificacao,
    status: r.status,
    conteudo: normalizarConteudo(r.conteudo),
    motivoRevisao: u(r.motivo_revisao),
    elaboradoPor: u(r.elaborado_por),
    elaboradoCargo: u(r.elaborado_cargo),
    elaboradoEm: u(r.elaborado_em),
    revisadoPor: u(r.revisado_por),
    revisadoCargo: u(r.revisado_cargo),
    revisadoEm: u(r.revisado_em),
    aprovadoPor: u(r.aprovado_por),
    aprovadoCargo: u(r.aprovado_cargo),
    aprovadoEm: u(r.aprovado_em),
    vigenciaInicio: u(r.vigencia_inicio),
    proximaRevisao: u(r.proxima_revisao),
    devolucaoObservacao: u(r.devolucao_observacao),
    devolvidoPor: u(r.devolvido_por),
    devolvidoEm: u(r.devolvido_em),
    criadoPor: u(r.criado_por),
    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
  };
}

function popToRow(p: Pop) {
  return {
    id: p.id,
    codigo: p.codigo,
    versao: p.versao,
    titulo: p.titulo.trim(),
    setor: p.setor,
    classificacao: p.classificacao,
    status: p.status,
    conteudo: p.conteudo,
    motivo_revisao: p.motivoRevisao ?? null,
    elaborado_por: p.elaboradoPor ?? null,
    elaborado_cargo: p.elaboradoCargo ?? null,
    elaborado_em: p.elaboradoEm ?? null,
    revisado_por: p.revisadoPor ?? null,
    revisado_cargo: p.revisadoCargo ?? null,
    revisado_em: p.revisadoEm ?? null,
    aprovado_por: p.aprovadoPor ?? null,
    aprovado_cargo: p.aprovadoCargo ?? null,
    aprovado_em: p.aprovadoEm ?? null,
    vigencia_inicio: p.vigenciaInicio ?? null,
    proxima_revisao: p.proximaRevisao ?? null,
    devolucao_observacao: p.devolucaoObservacao ?? null,
    devolvido_por: p.devolvidoPor ?? null,
    devolvido_em: p.devolvidoEm ?? null,
    criado_por: p.criadoPor ?? null,
    atualizado_em: new Date().toISOString(),
  };
}

export async function getPops(): Promise<Pop[]> {
  const { data, error } = await supabase.from('pops').select('*').order('codigo').order('versao', { ascending: false });
  assertNoError(error, 'getPops');
  return (data ?? []).map(rowToPop);
}

/** Próximo código livre do setor: POP-QUA-001, POP-QUA-002... */
export async function proximoCodigoPop(setor: string): Promise<string> {
  const { data, error } = await supabase.from('pops').select('codigo').like('codigo', `POP-${setor}-%`);
  assertNoError(error, 'proximoCodigoPop');
  const maior = (data ?? []).reduce((m, r: any) => Math.max(m, Number(String(r.codigo).split('-').pop()) || 0), 0);
  return `POP-${setor}-${String(maior + 1).padStart(3, '0')}`;
}

export async function salvarPop(p: Pop): Promise<Pop> {
  let registro = p;
  if (!registro.codigo) registro = { ...registro, codigo: await proximoCodigoPop(registro.setor) };
  if (!registro.id) registro = { ...registro, id: novoIdPop() };
  const { error } = await supabase.from('pops').upsert(popToRow(registro));
  assertNoError(error, 'salvarPop');
  return registro;
}

export async function excluirPop(id: string): Promise<void> {
  const { error } = await supabase.from('pops').delete().eq('id', id);
  assertNoError(error, 'excluirPop');
}

/** Aprova: esta versão vira Vigente e as outras vigentes do mesmo código viram Obsoleto. */
export async function aprovarPop(p: Pop): Promise<Pop> {
  const salvo = await salvarPop({ ...p, status: 'Vigente' });
  const { error } = await supabase.from('pops').update({ status: 'Obsoleto', atualizado_em: new Date().toISOString() }).eq('codigo', salvo.codigo).eq('status', 'Vigente').neq('id', salvo.id);
  assertNoError(error, 'aprovarPop (obsoletos)');
  return salvo;
}

