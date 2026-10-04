// ============================================================================
// Documentos para o colaborador assinar por link (Contracheques, e depois Férias)
// — ver supabase/migrations/057_documentos_assinatura.sql. Mesmo padrão de
// dpApi.ts (snake_case no banco, camelCase no app).
// ============================================================================

import { supabase } from './supabaseClient';
import { enviarArquivo, obterUrlArquivo } from './arquivosStorage';

export type CategoriaDocumentoAssinatura = 'contracheque' | 'ferias' | 'disciplinar' | 'regulamento' | 'ponto' | 'vale_alimentacao';
export type StatusDocumentoAssinatura = 'Pendente' | 'Visualizado' | 'Assinado';

export interface DocumentoAssinatura {
  id: string;
  categoria: CategoriaDocumentoAssinatura;
  colaboradorId: string;
  colaboradorNome: string;
  /** Contracheque: competência 'YYYY-MM'. */
  referencia: string;
  tipo: string;
  titulo: string;
  arquivoRef: string;
  arquivoNome?: string;
  token: string;
  linkExpiraEm: string;
  status: StatusDocumentoAssinatura;
  visualizadoEm?: string;
  assinadoEm?: string;
  assinaturaImagem?: string;
  declaracao?: string;
  navegador?: string;
  loteId?: string;
  /** Onde desenhar a assinatura no PDF (linhas do empregado) — ver migração 058. */
  camposAssinatura?: CampoAssinaturaPdf[];
  /** Assinaturas anteriores substituídas por "Solicitar nova assinatura" (migração 059) — só
   *  vem no registro completo (getDocumentoAssinatura). */
  historicoAssinaturas?: AssinaturaAnterior[];
  criadoEm: string;
  criadoPor?: string;
}

export interface AssinaturaAnterior {
  assinadoEm?: string;
  visualizadoEm?: string;
  assinaturaImagem?: string;
  declaracao?: string;
  navegador?: string;
  substituidaEm: string;
  motivo?: string;
}

/** Área em pontos do PDF (origem no canto inferior esquerdo) — mesmo formato de
 *  CampoAssinatura em contrachequePdfUtils.ts. */
export interface CampoAssinaturaPdf {
  pagina: number;
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Campo "Data e Assinatura": a data da assinatura vai escrita no espaço "___/___/____"
   *  (dataX/dataLargura) quando existe, senão no começo da linha. */
  comData?: boolean;
  dataX?: number;
  dataLargura?: number;
}

/** Quanto tempo o link enviado por WhatsApp vale (e o link assinado do PDF junto). */
export const VALIDADE_LINK_DOCUMENTO_DIAS = 30;

function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}

function rowToDocumento(r: any): DocumentoAssinatura {
  return {
    id: r.id,
    categoria: r.categoria,
    colaboradorId: r.colaborador_id,
    colaboradorNome: r.colaborador_nome,
    referencia: r.referencia,
    tipo: r.tipo,
    titulo: r.titulo,
    arquivoRef: r.arquivo_ref,
    arquivoNome: u(r.arquivo_nome),
    token: r.token,
    linkExpiraEm: r.link_expira_em,
    status: r.status,
    visualizadoEm: u(r.visualizado_em),
    assinadoEm: u(r.assinado_em),
    assinaturaImagem: u(r.assinatura_imagem),
    declaracao: u(r.declaracao),
    navegador: u(r.navegador),
    loteId: u(r.lote_id),
    camposAssinatura: Array.isArray(r.campos_assinatura) ? r.campos_assinatura : undefined,
    historicoAssinaturas: Array.isArray(r.historico_assinaturas) ? r.historico_assinaturas : undefined,
    criadoEm: r.criado_em,
    criadoPor: u(r.criado_por),
  };
}

function gerarToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Lista SEM a imagem da assinatura (a coluna pesa ~dezenas de KB por linha) — o comprovante
 *  completo vem de getDocumentoAssinatura(id) ao abrir. */
export async function getDocumentosAssinatura(categoria: CategoriaDocumentoAssinatura): Promise<DocumentoAssinatura[]> {
  const { data, error } = await supabase
    .from('documentos_assinatura')
    .select(
      'id, categoria, colaborador_id, colaborador_nome, referencia, tipo, titulo, arquivo_ref, arquivo_nome, token, ' +
        'link_expira_em, status, visualizado_em, assinado_em, lote_id, criado_em, criado_por'
    )
    .eq('categoria', categoria)
    .order('referencia', { ascending: false })
    .order('colaborador_nome');
  assertNoError(error, 'getDocumentosAssinatura');
  return (data ?? []).map(rowToDocumento);
}

export async function getDocumentoAssinatura(id: string): Promise<DocumentoAssinatura | null> {
  const { data, error } = await supabase.from('documentos_assinatura').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'getDocumentoAssinatura');
  return data ? rowToDocumento(data) : null;
}

export interface NovoDocumentoAssinatura {
  categoria: CategoriaDocumentoAssinatura;
  colaboradorId: string;
  colaboradorNome: string;
  referencia: string;
  tipo: string;
  titulo: string;
  arquivo: File;
  camposAssinatura?: CampoAssinaturaPdf[];
  loteId?: string;
  criadoPor?: string;
}

/** Envia o PDF pro Storage, gera o link assinado (válido pelo prazo do link) e cria o registro. */
export async function criarDocumentoAssinatura(novo: NovoDocumentoAssinatura): Promise<DocumentoAssinatura> {
  const pasta = novo.categoria === 'contracheque' ? `dp/contracheques/${novo.referencia}` : `dp/${novo.categoria}`;
  const arquivoRef = await enviarArquivo(novo.arquivo, pasta);
  const { arquivoLink, expiraEm } = await gerarLinkArquivo(arquivoRef);

  const row = {
    id: `docass-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    categoria: novo.categoria,
    colaborador_id: novo.colaboradorId,
    colaborador_nome: novo.colaboradorNome,
    referencia: novo.referencia,
    tipo: novo.tipo,
    titulo: novo.titulo,
    arquivo_ref: arquivoRef,
    arquivo_nome: novo.arquivo.name,
    arquivo_link: arquivoLink,
    token: gerarToken(),
    link_expira_em: expiraEm,
    status: 'Pendente',
    lote_id: novo.loteId ?? null,
    // Só envia a coluna quando há campos — assim a importação continua funcionando mesmo antes
    // de a migração 058 rodar (documento sem campos = assinatura só na página de comprovante).
    ...(novo.camposAssinatura && novo.camposAssinatura.length > 0 ? { campos_assinatura: novo.camposAssinatura } : {}),
    criado_por: novo.criadoPor ?? null,
    criado_em: new Date().toISOString(),
  };
  const { error } = await supabase.from('documentos_assinatura').insert(row);
  assertNoError(error, 'criarDocumentoAssinatura');
  return rowToDocumento(row);
}

async function gerarLinkArquivo(arquivoRef: string): Promise<{ arquivoLink: string; expiraEm: string }> {
  const segundos = VALIDADE_LINK_DOCUMENTO_DIAS * 24 * 60 * 60;
  const caminho = arquivoRef.replace(/^storage:/, '');
  const { data, error } = await supabase.storage.from('anexos').createSignedUrl(caminho, segundos);
  if (error || !data?.signedUrl) throw new Error(`Não foi possível gerar o link do arquivo: ${error?.message ?? ''}`);
  return { arquivoLink: data.signedUrl, expiraEm: new Date(Date.now() + segundos * 1000).toISOString() };
}

/** Link vencido (ou quase): renova o prazo e o link do PDF — o link enviado continua o mesmo
 *  (mesmo token), então quem já recebeu por WhatsApp não precisa de um link novo. */
export async function renovarLinkDocumento(doc: DocumentoAssinatura): Promise<DocumentoAssinatura> {
  const { arquivoLink, expiraEm } = await gerarLinkArquivo(doc.arquivoRef);
  const { error } = await supabase
    .from('documentos_assinatura')
    .update({ arquivo_link: arquivoLink, link_expira_em: expiraEm })
    .eq('id', doc.id);
  assertNoError(error, 'renovarLinkDocumento');
  return { ...doc, linkExpiraEm: expiraEm };
}

/** Documento já assinado precisa ser assinado de novo (ex.: assinatura ilegível, documento
 *  corrigido): guarda a assinatura atual no histórico, volta pra "Pendente" com um link NOVO (o
 *  antigo para de funcionar) — sem excluir nem reimportar o arquivo. Ver migração 059. */
export async function solicitarNovaAssinatura(doc: DocumentoAssinatura, motivo: string): Promise<DocumentoAssinatura> {
  const { arquivoLink, expiraEm } = await gerarLinkArquivo(doc.arquivoRef);
  const novoToken = gerarToken();
  const { data, error } = await supabase.rpc('reabrir_documento_assinatura', {
    p_id: doc.id,
    p_motivo: motivo,
    p_novo_token: novoToken,
    p_novo_link: arquivoLink,
    p_expira_em: expiraEm,
  });
  assertNoError(error, 'solicitarNovaAssinatura');
  if (!data) throw new Error('O documento não está mais como assinado — atualize a página.');
  return {
    ...doc,
    token: novoToken,
    linkExpiraEm: expiraEm,
    status: 'Pendente',
    assinadoEm: undefined,
    visualizadoEm: undefined,
    assinaturaImagem: undefined,
    declaracao: undefined,
    navegador: undefined,
  };
}

export async function excluirDocumentoAssinatura(doc: DocumentoAssinatura): Promise<void> {
  const { error } = await supabase.from('documentos_assinatura').delete().eq('id', doc.id);
  assertNoError(error, 'excluirDocumentoAssinatura');
  // Remove o PDF do Storage também — se falhar, o registro já saiu; o arquivo só fica órfão.
  await supabase.storage.from('anexos').remove([doc.arquivoRef.replace(/^storage:/, '')]);
}

/** Link público do documento. Contracheque continua em ?form=contracheque (links já enviados
 *  usam esse); os demais (Férias) usam ?form=documento — as duas rotas abrem a mesma tela. */
export function montarLinkDocumento(token: string, categoria: CategoriaDocumentoAssinatura = 'contracheque'): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?form=${categoria === 'contracheque' ? 'contracheque' : 'documento'}&token=${token}`;
}

/** URL do PDF pra quem está logado (DP) visualizar — link assinado curto, gerado na hora. */
export function obterUrlPdfDocumento(doc: DocumentoAssinatura): Promise<string> {
  return obterUrlArquivo(doc.arquivoRef);
}

// ---------------------------------------------------------------------------
// Tela pública (sem login) — só pelas funções security definer da migração 057.
// ---------------------------------------------------------------------------

export interface DocumentoPublico {
  colaboradorNome: string;
  categoria: CategoriaDocumentoAssinatura;
  referencia: string;
  tipo: string;
  titulo: string;
  arquivoNome?: string;
  arquivoLink?: string;
  status: StatusDocumentoAssinatura;
  assinadoEm?: string;
}

export type ErroDocumentoPublico = 'nao_encontrado' | 'cpf' | 'expirado' | 'ja_assinado' | 'assinatura_invalida';

export async function abrirDocumentoPublico(
  token: string,
  cpf: string
): Promise<{ documento?: DocumentoPublico; erro?: ErroDocumentoPublico }> {
  const { data, error } = await supabase.rpc('abrir_documento_assinatura', { p_token: token, p_cpf: cpf });
  assertNoError(error, 'abrirDocumentoPublico');
  const resultado = (data ?? {}) as Record<string, any>;
  if (resultado.erro) return { erro: resultado.erro };
  return { documento: resultado as DocumentoPublico };
}

export async function assinarDocumentoPublico(
  token: string,
  cpf: string,
  assinatura: string,
  declaracao: string
): Promise<{ assinadoEm?: string; erro?: ErroDocumentoPublico }> {
  const { data, error } = await supabase.rpc('assinar_documento_assinatura', {
    p_token: token,
    p_cpf: cpf,
    p_assinatura: assinatura,
    p_declaracao: declaracao,
    p_navegador: navigator.userAgent,
  });
  assertNoError(error, 'assinarDocumentoPublico');
  const resultado = (data ?? {}) as Record<string, any>;
  if (resultado.erro) return { erro: resultado.erro, assinadoEm: resultado.assinadoEm };
  return { assinadoEm: resultado.assinadoEm };
}
