// ============================================================================
// Formulários (estilo Google Forms) — ver migração 088_formularios.sql.
// Gestão (logado): tabelas formularios / formulario_respostas.
// Portal (credenciais do link pessoal) e link externo (token do formulário):
// funções portal_formulario* e formulario_publico*.
// ============================================================================

import { supabase } from './supabaseClient';
import type { CredenciaisPortal } from './educacaoApi';

export type TipoPergunta = 'texto' | 'paragrafo' | 'multipla' | 'caixas' | 'lista' | 'escala' | 'data' | 'numero' | 'simnao';

export const TIPOS_PERGUNTA: { tipo: TipoPergunta; rotulo: string; temOpcoes?: boolean }[] = [
  { tipo: 'texto', rotulo: 'Resposta curta' },
  { tipo: 'paragrafo', rotulo: 'Parágrafo' },
  { tipo: 'multipla', rotulo: 'Múltipla escolha (uma)', temOpcoes: true },
  { tipo: 'caixas', rotulo: 'Caixas de seleção (várias)', temOpcoes: true },
  { tipo: 'lista', rotulo: 'Lista suspensa', temOpcoes: true },
  { tipo: 'escala', rotulo: 'Escala (nota)' },
  { tipo: 'simnao', rotulo: 'Sim / Não' },
  { tipo: 'data', rotulo: 'Data' },
  { tipo: 'numero', rotulo: 'Número' },
];

export interface Pergunta {
  id: string;
  tipo: TipoPergunta;
  titulo: string;
  ajuda?: string;
  obrigatoria: boolean;
  opcoes?: string[];
  /** Escala: de min a max (padrão 1 a 5). */
  min?: number;
  max?: number;
}

export type StatusFormulario = 'rascunho' | 'aberto' | 'encerrado';
export type IdentificacaoExterna = 'anonimo' | 'nome' | 'nome_contato';

export interface Formulario {
  id: string;
  titulo: string;
  descricao?: string;
  /** Imagem de capa (URL pública, espaço "formularios" — migração 090). */
  capaUrl?: string;
  perguntas: Pergunta[];
  status: StatusFormulario;
  noPortal: boolean;
  /** undefined = todos os colaboradores ativos. */
  destinatarios?: string[];
  linkExterno: boolean;
  tokenExterno?: string;
  identificacaoExterna: IdentificacaoExterna;
  mensagemFinal?: string;
  encerraEm?: string;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm: string;
}

/** Valor de uma resposta: texto, número, data, lista de opções (caixas) ou sim/não. */
export type ValorResposta = string | number | string[] | boolean | null;

export interface RespostaFormulario {
  id: string;
  formularioId: string;
  origem: 'portal' | 'externo';
  colaboradorId?: string;
  colaboradorNome?: string;
  nomeExterno?: string;
  contatoExterno?: string;
  respostas: Record<string, ValorResposta>;
  criadoEm: string;
}

/** O que o portal / link externo recebe do formulário. */
export interface FormularioPublico {
  id: string;
  titulo: string;
  descricao?: string;
  capa?: string;
  perguntas: Pergunta[];
  identificacao: IdentificacaoExterna;
  mensagemFinal?: string;
  encerraEm?: string;
  aberto: boolean;
  respondidoEm?: string;
}

export interface FormularioPortalResumo {
  id: string;
  titulo: string;
  descricao?: string;
  capa?: string;
  encerraEm?: string;
  aberto: boolean;
  respondidoEm?: string;
}

function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
const MENSAGENS: Record<string, string> = {
  dados: 'Não foi possível confirmar seu acesso. Saia e entre de novo.',
  nao_encontrado: 'Este formulário não foi encontrado ou não está mais disponível.',
  encerrado: 'Este formulário já foi encerrado e não recebe mais respostas.',
  invalida: 'Não foi possível enviar as respostas. Confira e tente de novo.',
  ja_respondido: 'Você já respondeu este formulário.',
  nome: 'Informe o seu nome.',
  contato: 'Informe um telefone ou e-mail para contato.',
};

const novoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const novaPergunta = (tipo: TipoPergunta = 'multipla'): Pergunta => ({
  id: novoId('perg'),
  tipo,
  titulo: '',
  obrigatoria: false,
  ...(TIPOS_PERGUNTA.find((t) => t.tipo === tipo)?.temOpcoes ? { opcoes: ['Opção 1'] } : {}),
  ...(tipo === 'escala' ? { min: 1, max: 5 } : {}),
});

export const formularioNovo = (criadoPor?: string): Formulario => ({
  id: '',
  titulo: '',
  perguntas: [novaPergunta('multipla')],
  status: 'rascunho',
  noPortal: true,
  linkExterno: false,
  identificacaoExterna: 'anonimo',
  criadoPor,
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
});

function rowToFormulario(r: any): Formulario {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: r.descricao || undefined,
    capaUrl: r.capa_url || undefined,
    perguntas: Array.isArray(r.perguntas) ? r.perguntas : [],
    status: r.status,
    noPortal: !!r.no_portal,
    destinatarios: Array.isArray(r.destinatarios) ? r.destinatarios : undefined,
    linkExterno: !!r.link_externo,
    tokenExterno: r.token_externo || undefined,
    identificacaoExterna: r.identificacao_externa || 'anonimo',
    mensagemFinal: r.mensagem_final || undefined,
    encerraEm: r.encerra_em || undefined,
    criadoPor: r.criado_por || undefined,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  };
}

// ---------------------------------------------------------------------------
// Gestão
// ---------------------------------------------------------------------------
export async function getFormularios(): Promise<Formulario[]> {
  const { data, error } = await supabase.from('formularios').select('*').order('criado_em', { ascending: false });
  falhou(error, 'getFormularios');
  return (data ?? []).map(rowToFormulario);
}

const tokenNovo = () => `f${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

export async function salvarFormulario(f: Formulario): Promise<Formulario> {
  const item: Formulario = {
    ...f,
    id: f.id || novoId('form'),
    // O link externo só ganha um endereço quando for ligado (e mantém o mesmo depois).
    tokenExterno: f.tokenExterno || (f.linkExterno ? tokenNovo() : undefined),
    atualizadoEm: new Date().toISOString(),
  };
  const { error } = await supabase.from('formularios').upsert({
    id: item.id,
    titulo: item.titulo.trim() || 'Formulário sem título',
    descricao: item.descricao?.trim() || null,
    // Só manda a capa quando tem (formulário sem capa salva mesmo antes da migração 090).
    ...(item.capaUrl !== undefined ? { capa_url: item.capaUrl || null } : {}),
    perguntas: item.perguntas,
    status: item.status,
    no_portal: item.noPortal,
    destinatarios: item.destinatarios && item.destinatarios.length ? item.destinatarios : null,
    link_externo: item.linkExterno,
    token_externo: item.tokenExterno || null,
    identificacao_externa: item.identificacaoExterna,
    mensagem_final: item.mensagemFinal?.trim() || null,
    encerra_em: item.encerraEm || null,
    criado_por: item.criadoPor || null,
    atualizado_em: item.atualizadoEm,
  });
  falhou(error, 'salvarFormulario');
  return item;
}

/** Envia a imagem de capa para o espaço público "formularios" e devolve a URL. */
export async function enviarCapaFormulario(arquivo: File): Promise<string> {
  if (arquivo.size > 5 * 1024 * 1024) throw new Error('A imagem passa de 5MB. Use uma menor.');
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error('Use uma imagem JPG, PNG ou WEBP.');
  const nomeSeguro = arquivo.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60);
  const caminho = `${new Date().toISOString().slice(0, 7)}/${novoId('capa')}-${nomeSeguro}`;
  const { error } = await supabase.storage.from('formularios').upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (error) throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
  return supabase.storage.from('formularios').getPublicUrl(caminho).data.publicUrl;
}

export async function excluirFormulario(id: string): Promise<void> {
  const { error } = await supabase.from('formularios').delete().eq('id', id);
  falhou(error, 'excluirFormulario');
}

export async function getRespostas(formularioId: string): Promise<RespostaFormulario[]> {
  const { data, error } = await supabase.from('formulario_respostas').select('*').eq('formulario_id', formularioId).order('criado_em');
  falhou(error, 'getRespostas');
  return (data ?? []).map((r: any) => ({
    id: r.id,
    formularioId: r.formulario_id,
    origem: r.origem,
    colaboradorId: r.colaborador_id || undefined,
    colaboradorNome: r.colaborador_nome || undefined,
    nomeExterno: r.nome_externo || undefined,
    contatoExterno: r.contato_externo || undefined,
    respostas: r.respostas || {},
    criadoEm: r.criado_em,
  }));
}

/** Quantas respostas cada formulário tem (para a lista). */
export async function contarRespostas(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('formulario_respostas').select('formulario_id');
  falhou(error, 'contarRespostas');
  const mapa: Record<string, number> = {};
  (data ?? []).forEach((r: any) => (mapa[r.formulario_id] = (mapa[r.formulario_id] || 0) + 1));
  return mapa;
}

export async function excluirResposta(id: string): Promise<void> {
  const { error } = await supabase.from('formulario_respostas').delete().eq('id', id);
  falhou(error, 'excluirResposta');
}

export const linkExternoDe = (f: Pick<Formulario, 'tokenExterno'>) =>
  f.tokenExterno ? `${window.location.origin}/?form=formulario&t=${encodeURIComponent(f.tokenExterno)}` : '';

// ---------------------------------------------------------------------------
// Portal do colaborador
// ---------------------------------------------------------------------------
const args = (c: CredenciaisPortal) => ({ p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });

export async function portalFormularios(c: CredenciaisPortal): Promise<FormularioPortalResumo[]> {
  const { data, error } = await supabase.rpc('portal_formularios', args(c));
  falhou(error, 'portalFormularios');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível carregar.');
  return data?.formularios ?? [];
}

export async function portalFormulario(c: CredenciaisPortal, id: string): Promise<FormularioPublico> {
  const { data, error } = await supabase.rpc('portal_formulario', { ...args(c), p_id: id });
  falhou(error, 'portalFormulario');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível abrir.');
  return data as FormularioPublico;
}

export async function portalResponderFormulario(c: CredenciaisPortal, id: string, respostas: Record<string, ValorResposta>): Promise<void> {
  const { data, error } = await supabase.rpc('portal_formulario_responder', { ...args(c), p_id: id, p_respostas: respostas });
  falhou(error, 'portalResponderFormulario');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível enviar.');
}

// ---------------------------------------------------------------------------
// Link externo
// ---------------------------------------------------------------------------
export async function formularioPublico(token: string): Promise<FormularioPublico> {
  const { data, error } = await supabase.rpc('formulario_publico', { p_token: token });
  falhou(error, 'formularioPublico');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível abrir.');
  return data as FormularioPublico;
}

export async function responderFormularioPublico(token: string, nome: string, contato: string, respostas: Record<string, ValorResposta>): Promise<void> {
  const { data, error } = await supabase.rpc('formulario_publico_responder', { p_token: token, p_nome: nome, p_contato: contato, p_respostas: respostas });
  falhou(error, 'responderFormularioPublico');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível enviar.');
}

/** Pergunta obrigatória sem resposta? */
export function faltando(p: Pergunta, v: ValorResposta | undefined): boolean {
  if (!p.obrigatoria) return false;
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return !v.trim();
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Texto de uma resposta (para lista, Excel e resumo). */
export function textoResposta(v: ValorResposta | undefined): string {
  if (v === undefined || v === null || v === '') return '';
  if (Array.isArray(v)) return v.join('; ');
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}
