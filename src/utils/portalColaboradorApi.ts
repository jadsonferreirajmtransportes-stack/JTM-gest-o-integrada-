// ============================================================================
// Portal do colaborador — documentos e comunicados pelo link único (migração 067).
// Mesmas credenciais do Portal de Educação (CPF + nascimento, ou o aparelho lembrado).
// ============================================================================

import { supabase } from './supabaseClient';
import type { CredenciaisPortal } from './educacaoApi';
import type { DocumentoPublico, ErroDocumentoPublico } from './documentosAssinaturaApi';

export interface DocumentoPortal {
  id: string;
  categoria: string;
  referencia: string;
  tipo: string;
  titulo: string;
  status: 'Pendente' | 'Visualizado' | 'Assinado';
  criadoEm: string;
  assinadoEm?: string | null;
  vencido: boolean;
}

export interface ComunicadoPortal {
  id: string;
  token: string;
  titulo: string;
  categoria: string;
  numero: number;
  ano: number;
  criadoEm: string;
  exigeCiencia: boolean;
  visualizadoEm?: string | null;
  cienteEm?: string | null;
}

const args = (c: CredenciaisPortal) => ({ p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });

function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}

export async function portalDocumentos(c: CredenciaisPortal): Promise<DocumentoPortal[]> {
  const { data, error } = await supabase.rpc('portal_documentos', args(c));
  falhou(error, 'portalDocumentos');
  if (data?.erro) throw new Error('Não foi possível carregar seus documentos.');
  return data?.documentos ?? [];
}

const erroDoc = (e: string): ErroDocumentoPublico => (e === 'dados' ? 'nao_encontrado' : (e as ErroDocumentoPublico));

export async function portalAbrirDocumento(c: CredenciaisPortal, documentoId: string): Promise<{ documento?: DocumentoPublico; erro?: ErroDocumentoPublico }> {
  const { data, error } = await supabase.rpc('portal_abrir_documento', { ...args(c), p_documento_id: documentoId });
  falhou(error, 'portalAbrirDocumento');
  if (data?.erro) return { erro: erroDoc(data.erro) };
  return { documento: data as DocumentoPublico };
}

export async function portalAssinarDocumento(
  c: CredenciaisPortal,
  documentoId: string,
  assinatura: string,
  declaracao: string
): Promise<{ assinadoEm?: string; erro?: ErroDocumentoPublico }> {
  const { data, error } = await supabase.rpc('portal_assinar_documento', {
    ...args(c),
    p_documento_id: documentoId,
    p_assinatura: assinatura,
    p_declaracao: declaracao,
    p_navegador: navigator.userAgent,
  });
  falhou(error, 'portalAssinarDocumento');
  if (data?.erro) return { erro: erroDoc(data.erro), assinadoEm: data.assinadoEm };
  return { assinadoEm: data?.assinadoEm };
}

export async function portalComunicados(c: CredenciaisPortal): Promise<ComunicadoPortal[]> {
  const { data, error } = await supabase.rpc('portal_comunicados', args(c));
  falhou(error, 'portalComunicados');
  if (data?.erro) throw new Error('Não foi possível carregar seus comunicados.');
  return data?.comunicados ?? [];
}
