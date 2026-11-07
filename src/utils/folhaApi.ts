// Prévia da folha — ajustes da conferência por mês e colaborador (migração 120).
import { supabase } from './supabaseClient';
import type { AjusteFolha } from '../components/Frequencia/folhaCalc';

export interface ConferenciaFolha {
  mes: string;
  colaboradorId: string;
  dependentesIr?: number;
  ajustes: AjusteFolha[];
  liquidoContabilidade?: number;
  observacao?: string;
}

export async function getConferenciaFolha(mes: string): Promise<Map<string, ConferenciaFolha>> {
  const { data, error } = await supabase.from('folha_conferencia').select('*').eq('mes', mes);
  if (error) throw new Error(`Prévia da folha (rode a migração 120 no Supabase, se ainda não rodou): ${error.message}`);
  return new Map(
    (data ?? []).map((r: any) => [
      r.colaborador_id,
      {
        mes: r.mes,
        colaboradorId: r.colaborador_id,
        dependentesIr: r.dependentes_ir ?? undefined,
        ajustes: Array.isArray(r.ajustes) ? r.ajustes : [],
        liquidoContabilidade: r.liquido_contabilidade === null ? undefined : Number(r.liquido_contabilidade),
        observacao: r.observacao ?? undefined,
      } as ConferenciaFolha,
    ])
  );
}

export async function salvarConferenciaFolha(c: ConferenciaFolha, por?: string): Promise<void> {
  const { error } = await supabase.from('folha_conferencia').upsert({
    mes: c.mes,
    colaborador_id: c.colaboradorId,
    dependentes_ir: c.dependentesIr ?? null,
    ajustes: c.ajustes,
    liquido_contabilidade: c.liquidoContabilidade ?? null,
    observacao: c.observacao || null,
    atualizado_por: por || null,
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error(`Salvar a conferência da folha: ${error.message}`);
}
