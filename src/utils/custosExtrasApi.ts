// ============================================================================
// Módulo Custos Extras (migração 117): custo extra atrelado a uma nota (CT-e do
// Controle Financeiro), enviado à empresa para validação e, quando aprovado,
// lançado no "Custo extra" do CT-e.
// ============================================================================

import { supabase } from './supabaseClient';

export type StatusCustoExtra = 'Pendente' | 'Enviado' | 'Aprovado' | 'Recusado';
export const STATUS_CUSTO_EXTRA: StatusCustoExtra[] = ['Pendente', 'Enviado', 'Aprovado', 'Recusado'];

export interface CustoExtra {
  id: string;
  lancamentoId?: string;
  clienteId?: string;
  clienteNome: string;
  notaFiscal?: string;
  numeroCte?: string;
  destinatario?: string;
  cidade?: string;
  dataOcorrencia?: string;
  tipo: string;
  descricao?: string;
  valor: number;
  status: StatusCustoExtra;
  envioId?: string;
  enviadoEm?: string;
  validadoEm?: string;
  validadoPor?: string;
  motivoRecusa?: string;
  /** O valor já foi somado ao "Custo extra" do CT-e (evita somar duas vezes). */
  lancadoNoCte: boolean;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

const u = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);
const n = (v: unknown) => (v === '' || v === undefined ? null : v);
function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

const deLinha = (r: any): CustoExtra => ({
  id: r.id,
  lancamentoId: u(r.lancamento_id),
  clienteId: u(r.cliente_id),
  clienteNome: r.cliente_nome,
  notaFiscal: u(r.nota_fiscal),
  numeroCte: u(r.numero_cte),
  destinatario: u(r.destinatario),
  cidade: u(r.cidade),
  dataOcorrencia: u(r.data_ocorrencia),
  tipo: r.tipo,
  descricao: u(r.descricao),
  valor: Number(r.valor) || 0,
  status: r.status,
  envioId: u(r.envio_id),
  enviadoEm: u(r.enviado_em),
  validadoEm: u(r.validado_em),
  validadoPor: u(r.validado_por),
  motivoRecusa: u(r.motivo_recusa),
  lancadoNoCte: !!r.lancado_no_cte,
  criadoPor: u(r.criado_por),
  criadoEm: r.criado_em,
  atualizadoEm: u(r.atualizado_em),
});
const paraLinha = (c: CustoExtra) => ({
  id: c.id,
  lancamento_id: n(c.lancamentoId),
  cliente_id: n(c.clienteId),
  cliente_nome: c.clienteNome,
  nota_fiscal: n(c.notaFiscal),
  numero_cte: n(c.numeroCte),
  destinatario: n(c.destinatario),
  cidade: n(c.cidade),
  data_ocorrencia: n(c.dataOcorrencia),
  tipo: c.tipo,
  descricao: n(c.descricao),
  valor: c.valor,
  status: c.status,
  envio_id: n(c.envioId),
  enviado_em: n(c.enviadoEm),
  validado_em: n(c.validadoEm),
  validado_por: n(c.validadoPor),
  motivo_recusa: n(c.motivoRecusa),
  lancado_no_cte: c.lancadoNoCte,
  criado_por: n(c.criadoPor),
  criado_em: c.criadoEm,
  atualizado_em: new Date().toISOString(),
});

export const novoIdCustoExtra = () => `cex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export async function getCustosExtras(): Promise<CustoExtra[]> {
  const { data, error } = await supabase.from('custos_extras').select('*').order('criado_em', { ascending: false });
  falhou(error, 'Custos extras (rode a migração 117 no Supabase, se ainda não rodou)');
  return (data ?? []).map(deLinha);
}
export async function salvarCustosExtras(itens: CustoExtra[]): Promise<void> {
  if (!itens.length) return;
  const { error } = await supabase.from('custos_extras').upsert(itens.map(paraLinha));
  falhou(error, 'Salvar custos extras');
}
export async function excluirCustoExtra(id: string): Promise<void> {
  const { error } = await supabase.from('custos_extras').delete().eq('id', id);
  falhou(error, 'Excluir custo extra');
}

// ---------------------------------------------------------------------------
// Formato da planilha por empresa (a planilha do próprio cliente como modelo)
// ---------------------------------------------------------------------------
export type CampoPlanilha =
  | 'data'
  | 'nf'
  | 'cte'
  | 'destinatario'
  | 'cidade'
  | 'tipo'
  | 'descricao'
  | 'valor'
  | 'volumes'
  | 'cliente'
  | 'referencia'
  | 'nada';
export const CAMPOS_PLANILHA: { campo: CampoPlanilha; rotulo: string }[] = [
  { campo: 'nada', rotulo: 'Deixar em branco' },
  { campo: 'data', rotulo: 'Data' },
  { campo: 'nf', rotulo: 'Nota fiscal (NF)' },
  { campo: 'cte', rotulo: 'CT-e' },
  { campo: 'destinatario', rotulo: 'Destinatário' },
  { campo: 'cidade', rotulo: 'Cidade' },
  { campo: 'tipo', rotulo: 'Tipo do custo' },
  { campo: 'descricao', rotulo: 'Descrição / motivo' },
  { campo: 'valor', rotulo: 'Valor (R$)' },
  { campo: 'volumes', rotulo: 'Volumes (do CT-e)' },
  { campo: 'cliente', rotulo: 'Nome da empresa' },
  { campo: 'referencia', rotulo: 'Referência do envio' },
];
export interface ColunaModelo {
  coluna: number; // 1 = coluna A
  /** Só no formato "ficha" (formulário): linha do rótulo/valor. */
  linha?: number;
  titulo: string;
  campo: CampoPlanilha;
}
export interface ModeloPlanilhaCusto {
  clienteChave: string;
  clienteNome: string;
  arquivoRef: string;
  arquivoNome?: string;
  aba?: string;
  linhaCabecalho: number;
  colunas: ColunaModelo[];
  atualizadoEm?: string;
}

export async function getModelosPlanilha(): Promise<ModeloPlanilhaCusto[]> {
  const { data, error } = await supabase.from('custos_extras_modelos').select('*');
  falhou(error, 'Modelos de planilha');
  return (data ?? []).map((r: any) => ({
    clienteChave: r.cliente_chave,
    clienteNome: r.cliente_nome,
    arquivoRef: r.arquivo_ref,
    arquivoNome: u(r.arquivo_nome),
    aba: u(r.aba),
    linhaCabecalho: r.linha_cabecalho,
    colunas: r.colunas || [],
    atualizadoEm: u(r.atualizado_em),
  }));
}
export async function salvarModeloPlanilha(m: ModeloPlanilhaCusto, por?: string): Promise<void> {
  const { error } = await supabase.from('custos_extras_modelos').upsert({
    cliente_chave: m.clienteChave,
    cliente_nome: m.clienteNome,
    arquivo_ref: m.arquivoRef,
    arquivo_nome: m.arquivoNome || null,
    aba: m.aba || null,
    linha_cabecalho: m.linhaCabecalho,
    colunas: m.colunas,
    atualizado_em: new Date().toISOString(),
    atualizado_por: por || null,
  });
  falhou(error, 'Salvar modelo de planilha');
}
export async function excluirModeloPlanilha(chave: string): Promise<void> {
  const { error } = await supabase.from('custos_extras_modelos').delete().eq('cliente_chave', chave);
  falhou(error, 'Excluir modelo de planilha');
}
