// ============================================================================
// Módulo Disciplinar — acesso ao banco (ver migração 060_medidas_disciplinares.sql).
// Mesmo padrão de dpApi.ts: snake_case no banco, camelCase no app.
// ============================================================================

import { supabase } from './supabaseClient';
import type { StatusMedidaDisciplinar, TipoMedidaDisciplinar } from '../components/Disciplinar/disciplinarRegras';

export interface TestemunhaRecusa {
  nome: string;
  cpf?: string;
  /** Assinatura desenhada da testemunha (PNG data URL). */
  assinatura?: string;
}

export interface MedidaDisciplinar {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  tipo: TipoMedidaDisciplinar;
  etapa: number;
  dataFato: string;
  dataCienciaFato: string;
  descricaoFato: string;
  enquadramento: string[];
  enquadramentoOutro?: string;
  testemunhasFato?: string;
  justificativaEtapa?: string;
  ocorrenciasRelacionadas: string[];
  diasSuspensao?: number;
  suspensaoInicio?: string;
  status: StatusMedidaDisciplinar;
  propostoPor?: string;
  propostoEm?: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  motivoRejeicao?: string;
  documentoId?: string;
  ocorrenciaId?: string;
  recusaTestemunhas?: TestemunhaRecusa[];
  recusaRegistradaEm?: string;
  recusaRegistradaPor?: string;
  observacoes?: string;
  criadoEm?: string;
}

function n(v: any): any {
  return v === '' || v === undefined ? null : v;
}
function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}

function rowToMedida(r: any): MedidaDisciplinar {
  return {
    id: r.id,
    colaboradorId: r.colaborador_id,
    colaboradorNome: r.colaborador_nome,
    tipo: r.tipo,
    etapa: Number(r.etapa),
    dataFato: r.data_fato,
    dataCienciaFato: r.data_ciencia_fato,
    descricaoFato: r.descricao_fato,
    enquadramento: r.enquadramento ?? [],
    enquadramentoOutro: u(r.enquadramento_outro),
    testemunhasFato: u(r.testemunhas_fato),
    justificativaEtapa: u(r.justificativa_etapa),
    ocorrenciasRelacionadas: r.ocorrencias_relacionadas ?? [],
    diasSuspensao: r.dias_suspensao === null ? undefined : Number(r.dias_suspensao),
    suspensaoInicio: u(r.suspensao_inicio),
    status: r.status,
    propostoPor: u(r.proposto_por),
    propostoEm: u(r.proposto_em),
    aprovadoPor: u(r.aprovado_por),
    aprovadoEm: u(r.aprovado_em),
    motivoRejeicao: u(r.motivo_rejeicao),
    documentoId: u(r.documento_id),
    ocorrenciaId: u(r.ocorrencia_id),
    recusaTestemunhas: u(r.recusa_testemunhas),
    recusaRegistradaEm: u(r.recusa_registrada_em),
    recusaRegistradaPor: u(r.recusa_registrada_por),
    observacoes: u(r.observacoes),
    criadoEm: u(r.criado_em),
  };
}

function medidaToRow(m: MedidaDisciplinar) {
  return {
    id: m.id,
    colaborador_id: m.colaboradorId,
    colaborador_nome: m.colaboradorNome,
    tipo: m.tipo,
    etapa: m.etapa,
    data_fato: m.dataFato,
    data_ciencia_fato: m.dataCienciaFato,
    descricao_fato: m.descricaoFato,
    enquadramento: m.enquadramento ?? [],
    enquadramento_outro: n(m.enquadramentoOutro),
    testemunhas_fato: n(m.testemunhasFato),
    justificativa_etapa: n(m.justificativaEtapa),
    ocorrencias_relacionadas: m.ocorrenciasRelacionadas ?? [],
    dias_suspensao: m.diasSuspensao ?? null,
    suspensao_inicio: n(m.suspensaoInicio),
    status: m.status,
    proposto_por: n(m.propostoPor),
    proposto_em: m.propostoEm || new Date().toISOString(),
    aprovado_por: n(m.aprovadoPor),
    aprovado_em: n(m.aprovadoEm),
    motivo_rejeicao: n(m.motivoRejeicao),
    documento_id: n(m.documentoId),
    ocorrencia_id: n(m.ocorrenciaId),
    recusa_testemunhas: m.recusaTestemunhas ?? null,
    recusa_registrada_em: n(m.recusaRegistradaEm),
    recusa_registrada_por: n(m.recusaRegistradaPor),
    observacoes: n(m.observacoes),
  };
}

/** Lista sem as assinaturas das testemunhas (imagens) — vêm só no registro completo. */
export async function getMedidasDisciplinares(): Promise<MedidaDisciplinar[]> {
  const { data, error } = await supabase
    .from('medidas_disciplinares')
    .select(
      'id, colaborador_id, colaborador_nome, tipo, etapa, data_fato, data_ciencia_fato, descricao_fato, enquadramento, ' +
        'enquadramento_outro, testemunhas_fato, justificativa_etapa, ocorrencias_relacionadas, dias_suspensao, suspensao_inicio, ' +
        'status, proposto_por, proposto_em, aprovado_por, aprovado_em, motivo_rejeicao, documento_id, ocorrencia_id, ' +
        'recusa_registrada_em, recusa_registrada_por, observacoes, criado_em'
    )
    .order('data_fato', { ascending: false });
  assertNoError(error, 'getMedidasDisciplinares');
  return (data ?? []).map(rowToMedida);
}

export async function getMedidaDisciplinar(id: string): Promise<MedidaDisciplinar | null> {
  const { data, error } = await supabase.from('medidas_disciplinares').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'getMedidaDisciplinar');
  return data ? rowToMedida(data) : null;
}

/** Grava e devolve o registro como ficou. Não reenvia as assinaturas das testemunhas se o
 *  registro em memória veio da lista (sem elas) — só manda a coluna quando há testemunhas. */
export async function saveMedidaDisciplinar(m: MedidaDisciplinar): Promise<MedidaDisciplinar> {
  const registro = m.id ? m : { ...m, id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
  const row = medidaToRow(registro);
  const { recusa_testemunhas, ...resto } = row;
  const { error } = await supabase
    .from('medidas_disciplinares')
    .upsert(recusa_testemunhas ? row : resto);
  assertNoError(error, 'saveMedidaDisciplinar');
  return registro;
}

export async function deleteMedidaDisciplinar(id: string): Promise<void> {
  const { error } = await supabase.from('medidas_disciplinares').delete().eq('id', id);
  assertNoError(error, 'deleteMedidaDisciplinar');
}
