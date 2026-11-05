// ============================================================================
// Ciência por link (migração 111): pessoas de fora do sistema (ex.: motoristas
// agregados) leem um documento padronizado pelo celular, respondem um
// questionário com resposta certa e confirmam "li e estou ciente" com nome,
// CPF e telefone. Um link só para todos (?form=ciencia&t=...).
// ============================================================================

import { supabase } from './supabaseClient';
import type { DocumentoPadronizado } from './documentosPadronizadosApi';

export interface PerguntaCiencia {
  id: string;
  texto: string;
  opcoes: string[];
  /** Índice da opção certa. */
  correta: number;
  /** Mostrada quando a pessoa erra. */
  explicacao?: string;
}

/** Formas de declarar ciência (combináveis). Nome + CPF + "li e estou ciente" valem sempre. */
export interface ConfigCiencia {
  /** Questionário com resposta certa antes de confirmar. */
  questionario: boolean;
  /** Assinatura desenhada com o dedo no celular. */
  assinatura: boolean;
  /** Só libera o "continuar" depois de rolar o documento até o fim. */
  leituraCompleta: boolean;
  /** Pede o telefone (WhatsApp). */
  pedirTelefone: boolean;
}
export const CONFIG_PADRAO: ConfigCiencia = { questionario: true, assinatura: false, leituraCompleta: false, pedirTelefone: true };
export const lerConfig = (c?: Partial<ConfigCiencia> | null): ConfigCiencia => ({ ...CONFIG_PADRAO, ...(c || {}) });

export interface LinkCiencia {
  id: string;
  documentoId: string;
  versao: number;
  token: string;
  titulo: string;
  documento: DocumentoNoLink;
  perguntas: PerguntaCiencia[];
  config: ConfigCiencia;
  ativo: boolean;
  criadoEm: string;
  criadoPor?: string;
  atualizadoEm?: string;
}

/** Cópia do documento guardada no link (o que a pessoa lê). */
export type DocumentoNoLink = Pick<DocumentoPadronizado, 'titulo' | 'tipo' | 'codigo' | 'versao' | 'dataDocumento' | 'modelo' | 'oficio' | 'blocos' | 'setor' | 'classificacao' | 'status'>;

export interface RespostaCiencia {
  id: string;
  nome: string;
  cpf: string;
  telefone?: string;
  acertos: number;
  totalPerguntas: number;
  tentativas: number;
  versao?: number;
  cienteEm: string;
  assinatura?: string;
  leuAteFim?: boolean;
  navegador?: string;
}

function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}
const novoToken = () => {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 28);
};
export const urlCiencia = (token: string) => `${window.location.origin}/?form=ciencia&t=${token}`;
export const novaPerguntaCiencia = (): PerguntaCiencia => ({ id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, texto: '', opcoes: ['', ''], correta: 0 });

const copiaDoDocumento = (d: DocumentoPadronizado): DocumentoNoLink => ({
  titulo: d.titulo,
  tipo: d.tipo,
  codigo: d.codigo,
  versao: d.versao,
  dataDocumento: d.dataDocumento,
  modelo: d.modelo,
  oficio: d.oficio,
  blocos: d.blocos,
  setor: d.setor,
  classificacao: d.classificacao,
  status: d.status,
});

const deLinha = (r: any): LinkCiencia => ({
  id: r.id,
  documentoId: r.documento_id,
  versao: r.versao,
  token: r.token,
  titulo: r.titulo,
  documento: r.documento,
  perguntas: r.perguntas || [],
  config: lerConfig(r.config),
  ativo: r.ativo,
  criadoEm: r.criado_em,
  criadoPor: r.criado_por || undefined,
  atualizadoEm: r.atualizado_em || undefined,
});

/** Link de ciência do documento (o mais recente), se houver. */
export async function getLinkCiencia(documentoId: string): Promise<LinkCiencia | null> {
  const { data, error } = await supabase.from('documentos_ciencia_link').select('*').eq('documento_id', documentoId).order('criado_em', { ascending: false }).limit(1);
  falhou(error, 'getLinkCiencia (rode a migração 111 no Supabase, se ainda não rodou)');
  return data?.[0] ? deLinha(data[0]) : null;
}

/** Cria o link ou atualiza perguntas/documento (atualizarDocumento = copia a versão atual). */
export async function salvarLinkCiencia(
  d: DocumentoPadronizado,
  perguntas: PerguntaCiencia[],
  config: ConfigCiencia,
  atual: LinkCiencia | null,
  opcoes: { atualizarDocumento?: boolean; ativo?: boolean; por?: string } = {}
): Promise<LinkCiencia> {
  if (!d.id) throw new Error('Salve o documento antes de criar o link.');
  const agora = new Date().toISOString();
  const linha: Record<string, unknown> = atual
    ? {
        perguntas,
        config,
        titulo: d.titulo,
        ativo: opcoes.ativo ?? atual.ativo,
        atualizado_em: agora,
        ...(opcoes.atualizarDocumento ? { documento: copiaDoDocumento(d), versao: d.versao } : {}),
      }
    : {
        id: `cie-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        documento_id: d.id,
        versao: d.versao,
        token: novoToken(),
        titulo: d.titulo,
        documento: copiaDoDocumento(d),
        perguntas,
        config,
        ativo: true,
        criado_em: agora,
        criado_por: opcoes.por || null,
      };
  const q = atual ? supabase.from('documentos_ciencia_link').update(linha).eq('id', atual.id).select('*').single() : supabase.from('documentos_ciencia_link').insert(linha).select('*').single();
  const { data, error } = await q;
  falhou(error, 'salvarLinkCiencia (rode a migração 111 no Supabase, se ainda não rodou)');
  return deLinha(data);
}

export async function getRespostasCiencia(linkId: string): Promise<RespostaCiencia[]> {
  const { data, error } = await supabase.from('documentos_ciencia_respostas').select('*').eq('link_id', linkId).order('ciente_em', { ascending: false });
  falhou(error, 'getRespostasCiencia');
  return (data ?? []).map((r: any) => ({
    id: r.id,
    nome: r.nome,
    cpf: r.cpf,
    telefone: r.telefone || undefined,
    acertos: r.acertos,
    totalPerguntas: r.total_perguntas,
    tentativas: r.tentativas,
    versao: r.versao ?? undefined,
    cienteEm: r.ciente_em,
    assinatura: r.assinatura || undefined,
    leuAteFim: r.leu_ate_fim ?? undefined,
    navegador: r.navegador || undefined,
  }));
}

// ---- Página pública (sem login) ----
export interface CienciaPublica {
  erro?: string;
  titulo: string;
  documento: DocumentoNoLink;
  perguntas: PerguntaCiencia[];
  versao: number;
  config?: Partial<ConfigCiencia>;
}
export async function abrirCiencia(token: string): Promise<CienciaPublica> {
  const { data, error } = await supabase.rpc('ciencia_link_abrir', { p_token: token });
  falhou(error, 'abrirCiencia');
  return data as CienciaPublica;
}
export async function responderCiencia(p: { token: string; nome: string; cpf: string; telefone: string; respostas: number[]; tentativas: number; assinatura?: string | null; leuAteFim?: boolean }): Promise<{ ok?: boolean; erro?: string; cienteEm?: string }> {
  const { data, error } = await supabase.rpc('ciencia_link_responder', {
    p_token: p.token,
    p_nome: p.nome,
    p_cpf: p.cpf,
    p_telefone: p.telefone,
    p_respostas: p.respostas.map(String),
    p_tentativas: p.tentativas,
    p_navegador: navigator.userAgent.slice(0, 300),
    p_assinatura: p.assinatura || null,
    p_leu_ate_fim: p.leuAteFim ?? null,
  });
  falhou(error, 'responderCiencia');
  return data as { ok?: boolean; erro?: string; cienteEm?: string };
}
