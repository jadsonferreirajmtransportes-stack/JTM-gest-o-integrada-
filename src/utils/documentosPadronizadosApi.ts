// ============================================================================
// Padronização de Documentos — acesso ao banco (ver migração 064).
// ============================================================================

import { supabase } from './supabaseClient';

export type BlocoDocumento =
  | { id: string; tipo: 'titulo'; nivel: 1 | 2 | 3; texto: string }
  | { id: string; tipo: 'paragrafo'; texto: string }
  | { id: string; tipo: 'lista'; ordenada: boolean; itens: string[] }
  | { id: string; tipo: 'tabela'; cabecalho: string[]; linhas: string[][] }
  | { id: string; tipo: 'destaque'; texto: string }
  /** Imagem (arquivo no Storage "anexos" — ref "storage:<caminho>"); largura em % da página. */
  | { id: string; tipo: 'imagem'; ref: string; legenda?: string; largura?: 50 | 75 | 100 }
  /** Espaços para assinatura (linha, nome, cargo e data opcional). Nome/data em branco = preencher à mão. */
  | { id: string; tipo: 'assinaturas'; pessoas: { papel: string; nome: string; cargo?: string; data?: string }[]; comData?: boolean }
  /** Lista de verificação. Sem `opcoes`: uma caixinha por item. Com `opcoes` (ex.: Sim/Não/N/A,
   *  C/NC): uma caixinha por opção, em colunas; `resposta` guarda a opção marcada. */
  | { id: string; tipo: 'checklist'; titulo?: string; itens: ItemChecklist[]; opcoes?: string[]; comObservacao?: boolean };

export interface ItemChecklist {
  texto: string;
  marcado?: boolean;
  resposta?: string;
  obs?: string;
}

export type StatusDocumento = 'Rascunho' | 'Vigente' | 'Obsoleto';

export const TIPOS_DOCUMENTO = ['Procedimento', 'Política', 'Manual', 'Relatório', 'Formulário', 'Ata', 'Contrato', 'Proposta', 'Cotação', 'Comunicado', 'Informativo', 'Ofício', 'Carta', 'Planilha', 'Outro'];

/** Visual do documento gerado: 'padrao' = documento controlado (faixa de controle, código e
 *  versão); 'oficio' = papel timbrado da JMT, com local e data, destinatário e assunto. */
export type ModeloDocumento = 'padrao' | 'oficio' | 'informativo' | 'cotacao';
/** Dados do modelo escolhido (coluna oficio): ofício = local/destinatário/assunto;
 *  informativo = público ("JM TRANSPORTES / MOTORISTAS PARCEIROS") e subtítulo. */
export interface DadosOficio {
  local?: string;
  destinatario?: string;
  assunto?: string;
  publico?: string;
  subtitulo?: string;
  /** Cotação de frete: validade (dias) e condição de pagamento. */
  validadeDias?: number;
  pagamento?: string;
}
export { SETORES_DOCUMENTO, CLASSIFICACOES } from '../data/setoresDocumento';

export interface DocumentoPadronizado {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  setor: string;
  versao: number;
  status: StatusDocumento;
  classificacao: string;
  responsavel?: string;
  aprovadoPor?: string;
  dataDocumento?: string;
  modelo?: ModeloDocumento;
  oficio?: DadosOficio;
  blocos: BlocoDocumento[];
  origemArquivo?: string;
  origemTipo?: string;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface VersaoDocumento {
  id: string;
  versao: number;
  titulo: string;
  blocos: BlocoDocumento[];
  dados: Record<string, any>;
  nota?: string;
  criadoPor?: string;
  criadoEm: string;
}

function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
export const novoIdBloco = () => `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const novoId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function rowToDocumento(r: any): DocumentoPadronizado {
  return {
    id: r.id,
    codigo: r.codigo,
    titulo: r.titulo,
    tipo: r.tipo,
    setor: r.setor,
    versao: r.versao,
    status: r.status,
    classificacao: r.classificacao,
    responsavel: u(r.responsavel),
    aprovadoPor: u(r.aprovado_por),
    dataDocumento: u(r.data_documento),
    modelo: ['oficio', 'informativo', 'cotacao'].includes(r.modelo) ? r.modelo : undefined,
    oficio: u(r.oficio) ?? undefined,
    blocos: r.blocos ?? [],
    origemArquivo: u(r.origem_arquivo),
    origemTipo: u(r.origem_tipo),
    criadoPor: u(r.criado_por),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
  };
}

const COLUNAS_LISTA = 'id, codigo, titulo, tipo, setor, versao, status, classificacao, responsavel, aprovado_por, data_documento, modelo, origem_arquivo, origem_tipo, criado_por, criado_em, atualizado_em';

/** Biblioteca (sem o conteúdo — ver getDocumento). */
export async function getDocumentos(): Promise<DocumentoPadronizado[]> {
  const { data, error } = await supabase.from('documentos_padronizados').select(COLUNAS_LISTA).order('codigo');
  assertNoError(error, 'getDocumentos');
  return (data ?? []).map((r) => rowToDocumento({ ...r, blocos: [] }));
}

export async function getDocumento(id: string): Promise<DocumentoPadronizado | null> {
  const { data, error } = await supabase.from('documentos_padronizados').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'getDocumento');
  return data ? rowToDocumento(data) : null;
}

/** Próximo código do setor: DOC-DP-001, DOC-DP-002... */
async function proximoCodigo(setor: string): Promise<string> {
  const prefixo = `DOC-${setor}-`;
  const { data, error } = await supabase.from('documentos_padronizados').select('codigo').like('codigo', `${prefixo}%`);
  assertNoError(error, 'proximoCodigo');
  const maior = (data ?? []).reduce((m: number, r: any) => Math.max(m, Number(String(r.codigo).slice(prefixo.length)) || 0), 0);
  return `${prefixo}${String(maior + 1).padStart(3, '0')}`;
}

function paraLinha(d: DocumentoPadronizado) {
  return {
    id: d.id,
    codigo: d.codigo,
    titulo: d.titulo,
    tipo: d.tipo,
    setor: d.setor,
    versao: d.versao,
    status: d.status,
    classificacao: d.classificacao,
    responsavel: d.responsavel || null,
    aprovado_por: d.aprovadoPor || null,
    data_documento: d.dataDocumento || null,
    modelo: d.modelo && d.modelo !== 'padrao' ? d.modelo : null,
    oficio: d.modelo && d.modelo !== 'padrao' ? d.oficio ?? {} : null,
    blocos: d.blocos,
    origem_arquivo: d.origemArquivo || null,
    origem_tipo: d.origemTipo || null,
    criado_por: d.criadoPor || null,
    criado_em: d.criadoEm,
    atualizado_em: new Date().toISOString(),
  };
}

/** Salva (cria com código novo na primeira vez). Mudou de setor num rascunho novo = código novo. */
export async function salvarDocumento(d: DocumentoPadronizado): Promise<DocumentoPadronizado> {
  let registro = d;
  if (!d.id) {
    registro = { ...d, id: novoId('doc'), codigo: await proximoCodigo(d.setor), criadoEm: new Date().toISOString() };
    for (let tentativa = 0; ; tentativa++) {
      const { error } = await supabase.from('documentos_padronizados').insert(paraLinha(registro));
      if (!error) break;
      if (tentativa < 3 && /duplicate|unique/i.test(error.message)) {
        registro = { ...registro, codigo: await proximoCodigo(d.setor) };
        continue;
      }
      assertNoError(error, 'salvarDocumento');
    }
    return registro;
  }
  const { error } = await supabase.from('documentos_padronizados').update(paraLinha(registro)).eq('id', registro.id);
  assertNoError(error, 'salvarDocumento');
  return registro;
}

/** Publica a versão atual (status Vigente) e guarda uma cópia no histórico. */
export async function publicarVersao(d: DocumentoPadronizado, nota: string, por?: string): Promise<DocumentoPadronizado> {
  const salvo = await salvarDocumento({ ...d, status: 'Vigente' });
  const { error } = await supabase.from('documentos_padronizados_versoes').upsert(
    {
      id: `${salvo.id}-v${salvo.versao}`,
      documento_id: salvo.id,
      versao: salvo.versao,
      titulo: salvo.titulo,
      blocos: salvo.blocos,
      dados: {
        codigo: salvo.codigo,
        tipo: salvo.tipo,
        setor: salvo.setor,
        classificacao: salvo.classificacao,
        responsavel: salvo.responsavel,
        aprovadoPor: salvo.aprovadoPor,
        dataDocumento: salvo.dataDocumento,
        modelo: salvo.modelo,
        oficio: salvo.oficio,
      },
      nota: nota || null,
      criado_por: por || null,
    },
    { onConflict: 'documento_id,versao' }
  );
  assertNoError(error, 'publicarVersao');
  return salvo;
}

/** Abre a próxima revisão (versão + 1, volta para Rascunho). */
export async function novaRevisao(d: DocumentoPadronizado): Promise<DocumentoPadronizado> {
  return salvarDocumento({ ...d, versao: d.versao + 1, status: 'Rascunho' });
}

export async function getVersoes(documentoId: string): Promise<VersaoDocumento[]> {
  const { data, error } = await supabase
    .from('documentos_padronizados_versoes')
    .select('*')
    .eq('documento_id', documentoId)
    .order('versao', { ascending: false });
  assertNoError(error, 'getVersoes');
  return (data ?? []).map((r: any) => ({
    id: r.id,
    versao: r.versao,
    titulo: r.titulo,
    blocos: r.blocos ?? [],
    dados: r.dados ?? {},
    nota: u(r.nota),
    criadoPor: u(r.criado_por),
    criadoEm: r.criado_em,
  }));
}

export async function excluirDocumento(id: string): Promise<void> {
  const { error } = await supabase.from('documentos_padronizados').delete().eq('id', id);
  assertNoError(error, 'excluirDocumento');
}

export async function marcarObsoleto(d: DocumentoPadronizado): Promise<DocumentoPadronizado> {
  return salvarDocumento({ ...d, status: 'Obsoleto' });
}
