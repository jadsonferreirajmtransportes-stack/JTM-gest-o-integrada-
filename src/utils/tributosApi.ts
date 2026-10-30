// ============================================================================
// Reforma tributária — alíquotas de CBS/IBS por período (migração 085) e o cálculo
// do imposto contido no valor cobrado (split payment).
// ============================================================================

import { supabase } from './supabaseClient';

export interface AliquotaTributo {
  id: string;
  inicio: string; // YYYY-MM-DD
  fim?: string;
  cbs: number; // %
  ibs: number; // %
  observacao?: string;
}

export interface TributosDoValor {
  cbs: number;
  ibs: number;
  total: number;
  liquido: number;
  aliquota?: AliquotaTributo;
}

function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}

export async function getAliquotas(): Promise<AliquotaTributo[]> {
  const { data, error } = await supabase.from('aliquotas_tributos').select('*').order('inicio');
  if (error) {
    // Sem a migração 085 o resto da tela continua funcionando (só sem o cálculo de imposto).
    console.warn('Alíquotas CBS/IBS indisponíveis (migração 085 rodada?):', error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    inicio: r.inicio,
    fim: r.fim ?? undefined,
    cbs: Number(r.cbs) || 0,
    ibs: Number(r.ibs) || 0,
    observacao: r.observacao ?? undefined,
  }));
}

export async function salvarAliquota(a: AliquotaTributo, criadoPor?: string): Promise<AliquotaTributo> {
  const item = { ...a, id: a.id || `aliq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  const { error } = await supabase.from('aliquotas_tributos').upsert({
    id: item.id,
    inicio: item.inicio,
    fim: item.fim || null,
    cbs: item.cbs,
    ibs: item.ibs,
    observacao: item.observacao || null,
    criado_por: criadoPor ?? null,
  });
  assertNoError(error, 'salvarAliquota');
  return item;
}

export async function excluirAliquota(id: string): Promise<void> {
  const { error } = await supabase.from('aliquotas_tributos').delete().eq('id', id);
  assertNoError(error, 'excluirAliquota');
}

/** Alíquota vigente numa data (a de início mais recente que ainda não terminou). */
export function aliquotaEm(aliquotas: AliquotaTributo[], data?: string): AliquotaTributo | undefined {
  if (!data) return undefined;
  return [...aliquotas]
    .filter((a) => a.inicio <= data && (!a.fim || a.fim >= data))
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
}

/** Imposto CONTIDO no valor cobrado: CBS/IBS são "por fora" (não entram na própria base), então
 *  base = valor ÷ (1 + alíquota) e imposto = valor − base. Líquido = o que fica para a JMT. */
export function tributosDoValor(valor: number, aliquota?: AliquotaTributo): TributosDoValor {
  if (!aliquota || !valor) return { cbs: 0, ibs: 0, total: 0, liquido: valor, aliquota };
  const t = (aliquota.cbs + aliquota.ibs) / 100;
  const base = valor / (1 + t);
  const cbs = (base * aliquota.cbs) / 100;
  const ibs = (base * aliquota.ibs) / 100;
  return { cbs, ibs, total: cbs + ibs, liquido: valor - cbs - ibs, aliquota };
}

export const rotuloAliquota = (a?: AliquotaTributo) =>
  a ? `CBS ${a.cbs.toLocaleString('pt-BR')}% + IBS ${a.ibs.toLocaleString('pt-BR')}%` : 'sem alíquota cadastrada';
