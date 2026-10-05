// ============================================================================
// "Fale com o DP" — acesso ao banco (ver migração 069_fale_com_o_dp.sql).
// Portal (sem login): funções portal_solicitac* com as credenciais do portal.
// DP (logado): tabelas solicitacoes_dp / solicitacao_mensagens e o espaço
// privado "solicitacoes" dos anexos.
// ============================================================================

import { supabase } from './supabaseClient';
import type { CredenciaisPortal } from './educacaoApi';

export type TipoSolicitacao = 'contestacao' | 'ferias' | 'documento' | 'cadastro' | 'outros';
export type StatusSolicitacao = 'aberta' | 'em_analise' | 'respondida' | 'concluida' | 'recusada';

export const TIPOS_SOLICITACAO: { tipo: TipoSolicitacao; titulo: string; descricao: string; assuntos: string[] }[] = [
  {
    tipo: 'contestacao',
    titulo: 'Contestar algo',
    descricao: 'Ponto, vale-alimentação, contracheque, falta ou desconto que não confere',
    assuntos: ['Vale-alimentação', 'Contracheque', 'Ponto / frequência', 'Falta ou ocorrência', 'Férias', 'Outro'],
  },
  {
    tipo: 'ferias',
    titulo: 'Pedir férias',
    descricao: 'Escolha o mês ou a data em que gostaria de tirar férias',
    assuntos: ['Pedido de férias'],
  },
  {
    tipo: 'documento',
    titulo: 'Pedir documento',
    descricao: 'Declaração, segunda via, informe de rendimentos',
    assuntos: ['Declaração de vínculo', 'Segunda via de contracheque', 'Informe de rendimentos', 'Cópia de documento assinado', 'Outro documento'],
  },
  {
    tipo: 'cadastro',
    titulo: 'Atualizar meus dados',
    descricao: 'Endereço, telefone, conta, dependentes, estado civil',
    assuntos: ['Endereço', 'Telefone / WhatsApp', 'Conta bancária / PIX', 'Dependentes', 'Estado civil', 'Outro dado'],
  },
  {
    tipo: 'outros',
    titulo: 'Outro assunto',
    descricao: 'Dúvidas e outros pedidos ao Departamento Pessoal',
    assuntos: ['Dúvida', 'Sugestão', 'Outro assunto'],
  },
];

export const ROTULO_STATUS: Record<StatusSolicitacao, string> = {
  aberta: 'Aguardando o DP',
  em_analise: 'Em análise',
  respondida: 'Respondida',
  concluida: 'Concluída',
  recusada: 'Não atendida',
};

export const tituloTipo = (t: string) => TIPOS_SOLICITACAO.find((x) => x.tipo === t)?.titulo || 'Solicitação';

export interface AnexoSolicitacao {
  caminho?: string;
  nome: string;
  tipo?: string;
  tamanho?: number;
  /** Só nos anexos do DP: link para o colaborador baixar. */
  url?: string;
}

export interface DadosFerias {
  mes?: string; // YYYY-MM
  inicio?: string; // YYYY-MM-DD
  dias?: number;
  venderDias?: boolean;
}

export interface MensagemSolicitacao {
  id: string;
  autor: 'colaborador' | 'dp';
  autorNome?: string;
  texto: string;
  anexos: AnexoSolicitacao[];
  criadoEm: string;
}

export interface SolicitacaoResumo {
  id: string;
  protocolo: string;
  tipo: TipoSolicitacao;
  assunto: string;
  status: StatusSolicitacao;
  novaResposta?: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SolicitacaoPortal extends SolicitacaoResumo {
  dados: Record<string, any>;
  mensagens: MensagemSolicitacao[];
}

const args = (c: CredenciaisPortal) => ({ p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });
function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
const MENSAGENS: Record<string, string> = {
  dados: 'Não foi possível confirmar seu acesso. Saia e entre de novo.',
  tipo: 'Tipo de solicitação inválido.',
  tamanho: 'O texto passou de 3000 caracteres. Resuma um pouco.',
  limite: 'Você já tem 10 solicitações em aberto. Aguarde o DP responder antes de abrir outra.',
  nao_encontrada: 'Esta solicitação não foi encontrada.',
  encerrada: 'Esta solicitação foi encerrada. Se precisar, abra uma nova.',
  vazia: 'Escreva uma mensagem ou anexe um arquivo.',
};
const LIMITE_MB = 8;

/** Envia um anexo do colaborador para a pasta do link dele (espaço privado). */
export async function enviarAnexoPortal(token: string, arquivo: File): Promise<AnexoSolicitacao> {
  if (arquivo.size > LIMITE_MB * 1024 * 1024) throw new Error(`"${arquivo.name}" passa de ${LIMITE_MB}MB.`);
  if (!/^(image\/(jpeg|png|webp|heic)|application\/pdf)$/.test(arquivo.type)) throw new Error(`"${arquivo.name}": envie foto (JPG/PNG) ou PDF.`);
  const nomeSeguro = arquivo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60);
  const caminho = `${token}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nomeSeguro}`;
  const { error } = await supabase.storage.from('solicitacoes').upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (error) throw new Error(`Não foi possível enviar "${arquivo.name}". Tente de novo.`);
  return { caminho, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size };
}

export async function portalSolicitacoes(c: CredenciaisPortal): Promise<SolicitacaoResumo[]> {
  const { data, error } = await supabase.rpc('portal_solicitacoes', args(c));
  falhou(error, 'portalSolicitacoes');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível carregar.');
  return data?.solicitacoes ?? [];
}

export async function portalSolicitacao(c: CredenciaisPortal, id: string): Promise<SolicitacaoPortal> {
  const { data, error } = await supabase.rpc('portal_solicitacao', { ...args(c), p_id: id });
  falhou(error, 'portalSolicitacao');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível abrir.');
  return data as SolicitacaoPortal;
}

export async function portalAbrirSolicitacao(
  c: CredenciaisPortal,
  nova: { tipo: TipoSolicitacao; assunto: string; dados: Record<string, any>; texto: string; anexos: AnexoSolicitacao[] }
): Promise<{ id: string; protocolo: string }> {
  const { data, error } = await supabase.rpc('portal_solicitacao_abrir', {
    ...args(c),
    p_tipo: nova.tipo,
    p_assunto: nova.assunto,
    p_dados: nova.dados,
    p_texto: nova.texto,
    p_anexos: nova.anexos,
  });
  falhou(error, 'portalAbrirSolicitacao');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível enviar.');
  return data;
}

export async function portalResponderSolicitacao(c: CredenciaisPortal, id: string, texto: string, anexos: AnexoSolicitacao[]): Promise<void> {
  const { data, error } = await supabase.rpc('portal_solicitacao_responder', { ...args(c), p_id: id, p_texto: texto, p_anexos: anexos });
  falhou(error, 'portalResponderSolicitacao');
  if (data?.erro) throw new Error(MENSAGENS[data.erro] || 'Não foi possível enviar.');
}

// ---------------------------------------------------------------------------
// Lado do DP (logado)
// ---------------------------------------------------------------------------

export interface SolicitacaoDp extends SolicitacaoResumo {
  colaboradorId: string;
  colaboradorNome: string;
  dados: Record<string, any>;
  lidaPeloDp: boolean;
  lidaPeloColaborador: boolean;
  atendente?: string;
}

function rowToSolicitacao(r: any): SolicitacaoDp {
  return {
    id: r.id,
    protocolo: `${r.ano}-${String(r.numero).padStart(4, '0')}`,
    tipo: r.tipo,
    assunto: r.assunto,
    status: r.status,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
    colaboradorId: r.colaborador_id,
    colaboradorNome: r.colaborador_nome,
    dados: r.dados || {},
    lidaPeloDp: !!r.lida_pelo_dp,
    lidaPeloColaborador: !!r.lida_pelo_colaborador,
    atendente: r.atendente || undefined,
  };
}

export async function getSolicitacoesDp(): Promise<SolicitacaoDp[]> {
  const { data, error } = await supabase.from('solicitacoes_dp').select('*').order('atualizado_em', { ascending: false });
  falhou(error, 'getSolicitacoesDp');
  return (data ?? []).map(rowToSolicitacao);
}

export async function getMensagensSolicitacao(id: string): Promise<MensagemSolicitacao[]> {
  const { data, error } = await supabase.from('solicitacao_mensagens').select('*').eq('solicitacao_id', id).order('criado_em');
  falhou(error, 'getMensagensSolicitacao');
  return (data ?? []).map((m: any) => ({ id: m.id, autor: m.autor, autorNome: m.autor_nome || undefined, texto: m.texto, anexos: m.anexos || [], criadoEm: m.criado_em }));
}

export async function marcarLidaPeloDp(id: string): Promise<void> {
  const { error } = await supabase.from('solicitacoes_dp').update({ lida_pelo_dp: true }).eq('id', id);
  falhou(error, 'marcarLidaPeloDp');
}

export async function atualizarStatusSolicitacao(id: string, status: StatusSolicitacao, atendente?: string): Promise<void> {
  const { error } = await supabase
    .from('solicitacoes_dp')
    .update({ status, atendente: atendente || null, atualizado_em: new Date().toISOString(), lida_pelo_colaborador: false })
    .eq('id', id);
  falhou(error, 'atualizarStatusSolicitacao');
}

/** Link temporário para o DP abrir um anexo do colaborador. */
export async function linkAnexo(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage.from('solicitacoes').createSignedUrl(caminho, 60 * 10);
  if (error || !data?.signedUrl) throw new Error('Não foi possível abrir o anexo.');
  return data.signedUrl;
}

/** Resposta do DP (com anexos opcionais — ficam disponíveis ao colaborador por 30 dias). */
export async function responderComoDp(
  s: SolicitacaoDp,
  texto: string,
  arquivos: File[],
  novoStatus: StatusSolicitacao,
  atendente?: string
): Promise<MensagemSolicitacao> {
  const anexos: AnexoSolicitacao[] = [];
  for (const arq of arquivos.slice(0, 3)) {
    const nomeSeguro = arq.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60);
    const caminho = `dp/${s.id}/${Date.now()}-${nomeSeguro}`;
    const { error } = await supabase.storage.from('solicitacoes').upload(caminho, arq, { contentType: arq.type || 'application/pdf', upsert: false });
    if (error) throw new Error(`Não foi possível enviar "${arq.name}": ${error.message}`);
    const { data } = await supabase.storage.from('solicitacoes').createSignedUrl(caminho, 60 * 60 * 24 * 30);
    anexos.push({ caminho, nome: arq.name, tipo: arq.type, tamanho: arq.size, url: data?.signedUrl });
  }
  const msg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    solicitacao_id: s.id,
    autor: 'dp',
    autor_nome: atendente || 'Departamento Pessoal',
    texto: texto.trim(),
    anexos,
    criado_em: new Date().toISOString(),
  };
  const { error } = await supabase.from('solicitacao_mensagens').insert(msg);
  falhou(error, 'responderComoDp');
  await atualizarStatusSolicitacao(s.id, novoStatus, atendente);
  return { id: msg.id, autor: 'dp', autorNome: msg.autor_nome, texto: msg.texto, anexos, criadoEm: msg.criado_em };
}
