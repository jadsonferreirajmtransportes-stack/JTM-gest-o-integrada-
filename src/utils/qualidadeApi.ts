// ============================================================================
// Módulo Qualidade — acesso ao banco (ver migração 092_qualidade.sql).
// Gestão (logado): tabela qualidade_registros e o espaço privado "qualidade".
// Portal (sem login): portal_qualidade_relatar / portal_qualidade_meus.
// ============================================================================

import { supabase } from './supabaseClient';
import type { CredenciaisPortal } from './educacaoApi';
import { TipoQualidade, configQualidade } from '../data/qualidadeConfig';

export interface AnexoQualidade {
  bucket?: string; // 'qualidade' (gestão) ou 'solicitacoes' (fotos enviadas pelo portal)
  caminho: string;
  nome: string;
  tipo?: string;
  tamanho?: number;
}

export interface AcaoQualidade {
  id: string;
  tipo: string;
  descricao: string;
  responsavel?: string;
  prazo?: string;
  status: 'Pendente' | 'Em andamento' | 'Concluída' | 'Cancelada';
  concluidaEm?: string;
  evidencia?: string;
}

export interface HistoricoQualidade {
  em: string;
  por: string;
  texto: string;
}

export interface RegistroQualidade {
  id: string;
  tipo: TipoQualidade;
  ano: number;
  numero?: number;
  titulo: string;
  status: string;
  data?: string;
  prazo?: string;
  responsavel?: string;
  dados: Record<string, any>;
  acoes: AcaoQualidade[];
  anexos: AnexoQualidade[];
  historico: HistoricoQualidade[];
  origem: 'gestao' | 'portal';
  colaboradorId?: string;
  colaboradorNome?: string;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm: string;
}

function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
const u = <T,>(v: T | null | undefined) => (v === null ? undefined : v);

export const protocoloQualidade = (r: Pick<RegistroQualidade, 'tipo' | 'ano' | 'numero'>) =>
  r.numero ? `${configQualidade(r.tipo).sigla}-${r.ano}-${String(r.numero).padStart(3, '0')}` : `${configQualidade(r.tipo).sigla}-${r.ano}-novo`;

function rowToRegistro(r: any): RegistroQualidade {
  return {
    id: r.id,
    tipo: r.tipo,
    ano: r.ano,
    numero: u(r.numero),
    titulo: r.titulo || '',
    status: r.status,
    data: u(r.data),
    prazo: u(r.prazo),
    responsavel: u(r.responsavel),
    dados: r.dados || {},
    acoes: Array.isArray(r.acoes) ? r.acoes : [],
    anexos: Array.isArray(r.anexos) ? r.anexos : [],
    historico: Array.isArray(r.historico) ? r.historico : [],
    origem: r.origem === 'portal' ? 'portal' : 'gestao',
    colaboradorId: u(r.colaborador_id),
    colaboradorNome: u(r.colaborador_nome),
    criadoPor: u(r.criado_por),
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  };
}

export async function getRegistrosQualidade(): Promise<RegistroQualidade[]> {
  const { data, error } = await supabase.from('qualidade_registros').select('*').order('criado_em', { ascending: false });
  falhou(error, 'getRegistrosQualidade');
  return (data ?? []).map(rowToRegistro);
}

export function registroNovo(tipo: TipoQualidade, por?: string): RegistroQualidade {
  const agora = new Date().toISOString();
  const cfg = configQualidade(tipo);
  return {
    id: `qld-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    ano: new Date().getFullYear(),
    titulo: '',
    status: cfg.status[0].id,
    data: tipo === 'auditoria' ? undefined : new Date().toLocaleDateString('sv-SE'),
    dados: {},
    acoes: [],
    anexos: [],
    historico: [],
    origem: 'gestao',
    criadoPor: por,
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

/** Grava (cria ou atualiza). Devolve o registro como ficou no banco (com o número). */
export async function salvarRegistroQualidade(r: RegistroQualidade, novo: boolean): Promise<RegistroQualidade> {
  const linha = {
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo.trim(),
    status: r.status,
    data: r.data || null,
    prazo: r.prazo || null,
    responsavel: r.responsavel?.trim() || null,
    dados: r.dados,
    acoes: r.acoes,
    anexos: r.anexos,
    historico: r.historico,
    atualizado_em: new Date().toISOString(),
    ...(novo ? { origem: r.origem, criado_por: r.criadoPor || null, ano: r.ano } : {}),
  };
  const q = novo ? supabase.from('qualidade_registros').insert(linha) : supabase.from('qualidade_registros').update(linha).eq('id', r.id);
  const { data, error } = await q.select('*').single();
  falhou(error, 'salvarRegistroQualidade');
  return rowToRegistro(data);
}

export async function excluirRegistroQualidade(id: string): Promise<void> {
  const { error } = await supabase.from('qualidade_registros').delete().eq('id', id);
  falhou(error, 'excluirRegistroQualidade');
}

const LIMITE_MB = 20;
/** Envia um anexo da gestão para o espaço privado "qualidade". */
export async function enviarAnexoQualidade(registroId: string, arquivo: File): Promise<AnexoQualidade> {
  if (arquivo.size > LIMITE_MB * 1024 * 1024) throw new Error(`"${arquivo.name}" passa de ${LIMITE_MB}MB.`);
  const nomeSeguro = arquivo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60);
  const caminho = `${registroId}/${Date.now()}-${nomeSeguro}`;
  const { error } = await supabase.storage.from('qualidade').upload(caminho, arquivo, { contentType: arquivo.type || 'application/octet-stream', upsert: false });
  if (error) throw new Error(`Não foi possível enviar "${arquivo.name}". Rode a migração 092 no Supabase, se ainda não rodou.`);
  return { bucket: 'qualidade', caminho, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size };
}

export async function linkAnexoQualidade(a: AnexoQualidade): Promise<string> {
  const { data, error } = await supabase.storage.from(a.bucket || 'qualidade').createSignedUrl(a.caminho, 60 * 10);
  if (error || !data?.signedUrl) throw new Error('Não foi possível abrir o anexo.');
  return data.signedUrl;
}

export async function apagarArquivoQualidade(a: AnexoQualidade): Promise<void> {
  if ((a.bucket || 'qualidade') !== 'qualidade') return; // foto do portal: fica no espaço do Fale com o DP
  await supabase.storage.from('qualidade').remove([a.caminho]);
}

// ---------------------------------------------------------------------------
// Vencimentos (qualificações e fornecedores)
// ---------------------------------------------------------------------------
export const hojeIso = () => new Date().toLocaleDateString('sv-SE');
export function diasAte(iso?: string): number | undefined {
  if (!iso) return undefined;
  return Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(`${hojeIso()}T12:00:00`).getTime()) / 86400000);
}

/** Registro ainda em aberto (situação não final). */
export const emAberto = (r: RegistroQualidade) => !configQualidade(r.tipo).status.find((s) => s.id === r.status)?.final;

/** Ações pendentes com prazo vencido. */
export const acoesAtrasadas = (r: RegistroQualidade) =>
  r.acoes.filter((a) => (a.status === 'Pendente' || a.status === 'Em andamento') && a.prazo && a.prazo < hojeIso());

// ---------------------------------------------------------------------------
// Portal do colaborador
// ---------------------------------------------------------------------------
export interface RelatoPortal {
  id: string;
  protocolo: string;
  categoria?: string;
  data?: string;
  status: string;
  criadoEm: string;
}

const args = (c: CredenciaisPortal) => ({ p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });
const MENSAGENS: Record<string, string> = {
  dados: 'Não foi possível confirmar seu acesso. Saia e entre de novo.',
  vazia: 'Conte o que aconteceu.',
  tamanho: 'O texto passou de 3000 caracteres. Resuma um pouco.',
  sem_acesso: 'A área de relatar ocorrência não está liberada para você. Fale com a Qualidade.',
  limite: 'Você já relatou 10 ocorrências hoje. Fale com a Qualidade se precisar de mais.',
};

export async function portalRelatarOcorrencia(
  c: CredenciaisPortal,
  dados: { categoria: string; data: string; cliente: string; documento: string; local: string; descricao: string; acaoImediata: string },
  anexos: { caminho?: string; nome: string; tipo?: string; tamanho?: number }[]
): Promise<{ id: string; protocolo: string }> {
  const { data, error } = await supabase.rpc('portal_qualidade_relatar', { ...args(c), p_dados: dados, p_anexos: anexos });
  falhou(error, 'portalRelatarOcorrencia');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível enviar.');
  return data;
}

/** Relatos da pessoa e se ela pode relatar (lista de acesso — migração 096; sem a 096, pode). */
export async function portalMeusRelatos(c: CredenciaisPortal): Promise<{ relatos: RelatoPortal[]; permitido: boolean }> {
  const { data, error } = await supabase.rpc('portal_qualidade_meus', args(c));
  falhou(error, 'portalMeusRelatos');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível carregar.');
  return { relatos: data?.relatos ?? [], permitido: data?.permitido !== false };
}

// ---------------------------------------------------------------------------
// Quem pode relatar pelo portal (qualidade_config — migração 096)
// ---------------------------------------------------------------------------
export interface AcessoRelato {
  modo: 'todos' | 'escolhidos';
  colaboradores: string[];
}

export async function getAcessoRelato(): Promise<AcessoRelato> {
  const { data, error } = await supabase.from('qualidade_config').select('relato_acesso, relato_colaboradores').eq('id', 1).maybeSingle();
  falhou(error, 'getAcessoRelato');
  return { modo: data?.relato_acesso === 'escolhidos' ? 'escolhidos' : 'todos', colaboradores: data?.relato_colaboradores ?? [] };
}

export async function salvarAcessoRelato(a: AcessoRelato, por?: string): Promise<void> {
  const { error } = await supabase.from('qualidade_config').upsert({
    id: 1,
    relato_acesso: a.modo,
    relato_colaboradores: a.colaboradores,
    atualizado_por: por || null,
    atualizado_em: new Date().toISOString(),
  });
  falhou(error, 'salvarAcessoRelato');
}
