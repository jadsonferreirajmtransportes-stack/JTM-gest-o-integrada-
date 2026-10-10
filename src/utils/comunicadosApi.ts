// ============================================================================
// Comunicados — acesso ao banco (ver migração 063_comunicados.sql).
// ============================================================================

import { supabase } from './supabaseClient';

export type PublicoComunicado = 'colaboradores' | 'clientes';
export type ModeloImagem = 'aviso' | 'urgente' | 'seguranca' | 'parabens' | 'evento' | 'comercial';

/** "aviso" (estilo 1) ou "aviso:3" — o estilo vai no mesmo campo, sem mudar o banco. */
export const gravarModeloImagem = (modelo: ModeloImagem, estilo?: number) => (estilo && estilo > 1 ? `${modelo}:${estilo}` : modelo);

export const CATEGORIAS_COMUNICADO = ['Aviso', 'Informativo', 'Urgente', 'Segurança', 'Parabéns', 'Evento', 'Comercial'] as const;

export interface Comunicado {
  id: string;
  numero: number;
  ano: number;
  titulo: string;
  categoria: string;
  publico: PublicoComunicado;
  corpo: string;
  assinatura: string;
  modeloImagem: ModeloImagem;
  /** Layout da imagem (1 a 5) — guardado junto em modelo_imagem como "aviso:3". */
  estiloImagem?: number;
  destaque?: string;
  imagemUrl?: string;
  fotoUrl?: string;
  exigeCiencia: boolean;
  criadoPor?: string;
  criadoEm: string;
}

export interface DestinatarioComunicado {
  id: string;
  comunicadoId: string;
  tipo: 'colaborador' | 'contato_cliente';
  refId?: string;
  nome: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  token: string;
  enviadoEm?: string;
  canal?: 'whatsapp' | 'email';
  visualizadoEm?: string;
  cienteEm?: string;
}

function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
function gerarToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
const novoId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function rowToComunicado(r: any): Comunicado {
  return {
    id: r.id,
    numero: r.numero,
    ano: r.ano,
    titulo: r.titulo,
    categoria: r.categoria,
    publico: r.publico,
    corpo: r.corpo,
    assinatura: r.assinatura,
    modeloImagem: String(r.modelo_imagem || 'aviso').split(':')[0] as ModeloImagem,
    estiloImagem: Number(String(r.modelo_imagem || '').split(':')[1]) || 1,
    destaque: u(r.destaque),
    imagemUrl: u(r.imagem_url),
    fotoUrl: u(r.foto_url),
    exigeCiencia: !!r.exige_ciencia,
    criadoPor: u(r.criado_por),
    criadoEm: r.criado_em,
  };
}
function rowToDestinatario(r: any): DestinatarioComunicado {
  return {
    id: r.id,
    comunicadoId: r.comunicado_id,
    tipo: r.tipo,
    refId: u(r.ref_id),
    nome: r.nome,
    empresa: u(r.empresa),
    telefone: u(r.telefone),
    email: u(r.email),
    token: r.token,
    enviadoEm: u(r.enviado_em),
    canal: u(r.canal),
    visualizadoEm: u(r.visualizado_em),
    cienteEm: u(r.ciente_em),
  };
}

export async function getComunicados(): Promise<Comunicado[]> {
  const { data, error } = await supabase.from('comunicados').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getComunicados');
  return (data ?? []).map(rowToComunicado);
}

export async function getDestinatarios(comunicadoId?: string): Promise<DestinatarioComunicado[]> {
  let q = supabase
    .from('comunicado_destinatarios')
    .select('id, comunicado_id, tipo, ref_id, nome, empresa, telefone, email, token, enviado_em, canal, visualizado_em, ciente_em');
  if (comunicadoId) q = q.eq('comunicado_id', comunicadoId);
  const { data, error } = await q.order('nome').limit(5000);
  assertNoError(error, 'getDestinatarios');
  return (data ?? []).map(rowToDestinatario);
}

/** Próximo número do ano (Comunicado nº 001/2026, 002/2026...). */
async function proximoNumero(ano: number): Promise<number> {
  const { data, error } = await supabase.from('comunicados').select('numero').eq('ano', ano).order('numero', { ascending: false }).limit(1);
  assertNoError(error, 'proximoNumero');
  return ((data?.[0]?.numero as number | undefined) ?? 0) + 1;
}

export async function enviarArquivoComunicado(arquivo: Blob, nome: string): Promise<string> {
  const caminho = `${new Date().toISOString().slice(0, 7)}/${novoId('arq')}-${nome.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60)}`;
  const { error } = await supabase.storage.from('comunicados').upload(caminho, arquivo, { contentType: arquivo.type || 'image/png', upsert: false });
  if (error) throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
  return supabase.storage.from('comunicados').getPublicUrl(caminho).data.publicUrl;
}

export type NovoComunicado = Omit<Comunicado, 'id' | 'numero' | 'ano' | 'criadoEm'>;
export type NovoDestinatario = Pick<DestinatarioComunicado, 'tipo' | 'refId' | 'nome' | 'empresa' | 'telefone' | 'email'>;

/** Cria o comunicado (com número do ano) e um link próprio por destinatário. Se dois
 *  comunicados forem criados no mesmo instante e o número colidir, tenta o próximo. */
export async function criarComunicado(
  novo: NovoComunicado,
  destinatarios: NovoDestinatario[]
): Promise<{ comunicado: Comunicado; destinatarios: DestinatarioComunicado[] }> {
  const ano = new Date().getFullYear();
  const id = novoId('com');
  let numero = await proximoNumero(ano);
  for (let tentativa = 0; ; tentativa++) {
    const { error } = await supabase.from('comunicados').insert({
      id,
      numero,
      ano,
      titulo: novo.titulo,
      categoria: novo.categoria,
      publico: novo.publico,
      corpo: novo.corpo,
      assinatura: novo.assinatura,
      modelo_imagem: gravarModeloImagem(novo.modeloImagem, novo.estiloImagem),
      destaque: novo.destaque || null,
      imagem_url: novo.imagemUrl || null,
      foto_url: novo.fotoUrl || null,
      exige_ciencia: novo.exigeCiencia,
      criado_por: novo.criadoPor || null,
    });
    if (!error) break;
    if (tentativa < 3 && /duplicate|unique/i.test(error.message)) {
      numero += 1;
      continue;
    }
    assertNoError(error, 'criarComunicado');
  }
  const linhas = destinatarios.map((d) => ({
    id: novoId('dest'),
    comunicado_id: id,
    tipo: d.tipo,
    ref_id: d.refId || null,
    nome: d.nome,
    empresa: d.empresa || null,
    telefone: d.telefone || null,
    email: d.email || null,
    token: gerarToken(),
  }));
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from('comunicado_destinatarios').insert(linhas.slice(i, i + 500));
    assertNoError(error, 'criarComunicado (destinatários)');
  }
  return {
    comunicado: rowToComunicado({
      id,
      numero,
      ano,
      ...{
        titulo: novo.titulo,
        categoria: novo.categoria,
        publico: novo.publico,
        corpo: novo.corpo,
        assinatura: novo.assinatura,
        modelo_imagem: gravarModeloImagem(novo.modeloImagem, novo.estiloImagem),
        destaque: novo.destaque ?? null,
        imagem_url: novo.imagemUrl ?? null,
        foto_url: novo.fotoUrl ?? null,
        exige_ciencia: novo.exigeCiencia,
        criado_por: novo.criadoPor ?? null,
      },
      criado_em: new Date().toISOString(),
    }),
    destinatarios: linhas.map(rowToDestinatario),
  };
}

export async function atualizarImagemComunicado(id: string, imagemUrl: string): Promise<void> {
  const { error } = await supabase.from('comunicados').update({ imagem_url: imagemUrl }).eq('id', id);
  assertNoError(error, 'atualizarImagemComunicado');
}

export async function marcarEnviado(ids: string[], canal: 'whatsapp' | 'email'): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('comunicado_destinatarios').update({ enviado_em: new Date().toISOString(), canal }).in('id', ids);
  assertNoError(error, 'marcarEnviado');
}

export async function excluirComunicado(id: string): Promise<void> {
  const { error } = await supabase.from('comunicados').delete().eq('id', id);
  assertNoError(error, 'excluirComunicado');
}

export function montarLinkComunicado(token: string): string {
  return `${window.location.origin}${window.location.pathname}?form=comunicado&token=${token}`;
}

export function numeroFormatado(c: Pick<Comunicado, 'numero' | 'ano'>): string {
  return `${String(c.numero).padStart(3, '0')}/${c.ano}`;
}

/** {nome} → primeiro nome (com inicial maiúscula). */
export function personalizar(texto: string, nome: string): string {
  const p = (nome || '').trim().split(/\s+/)[0] || '';
  return texto.replace(/\{nome\}/gi, p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
}

// ---- Público (sem login) ----
export interface ComunicadoPublico {
  numero: number;
  ano: number;
  titulo: string;
  categoria: string;
  corpo: string;
  assinatura: string;
  imagemUrl?: string | null;
  criadoEm: string;
  exigeCiencia: boolean;
  primeiroNome: string;
  cienteEm?: string | null;
}

export async function abrirComunicadoPublico(token: string): Promise<{ comunicado?: ComunicadoPublico; erro?: 'link' }> {
  const { data, error } = await supabase.rpc('comunicado_abrir', { p_token: token });
  assertNoError(error, 'abrirComunicadoPublico');
  const r = (data ?? {}) as any;
  if (r.erro) return { erro: r.erro };
  return { comunicado: r as ComunicadoPublico };
}

export async function confirmarCienciaComunicado(token: string): Promise<{ cienteEm?: string; erro?: 'link' }> {
  const { data, error } = await supabase.rpc('comunicado_confirmar', { p_token: token, p_navegador: navigator.userAgent });
  assertNoError(error, 'confirmarCienciaComunicado');
  return (data ?? {}) as any;
}
