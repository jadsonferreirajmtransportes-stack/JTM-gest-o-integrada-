// ============================================================================
// Portal de Educação — acesso ao banco (ver migração 061_portal_educacao.sql).
// Lado do DP (logado): treinamentos, atribuições, link pessoal do portal.
// Lado do colaborador (sem login): só as funções portal_* (token + CPF + data
// de nascimento), que corrigem a prova no servidor.
// ============================================================================

import { supabase } from './supabaseClient';
import { Colaborador } from '../types';

export type TipoConteudoTreinamento = 'video' | 'pdf' | 'instrucao' | 'texto' | 'telas';

/** Uma tela ilustrada: imagem com números marcados + a explicação de cada número. */
export interface TelaIlustrada {
  titulo: string;
  /** Caminho da imagem (ex.: /treinamento-sistema/com-1.png, servida pelo próprio site). */
  imagem: string;
  marcas: string[];
}

export interface ConteudoTreinamento {
  id: string;
  tipo: TipoConteudoTreinamento;
  titulo: string;
  /** Vídeo: link do YouTube/Vimeo. PDF: URL pública do material (bucket "treinamentos"). */
  url?: string;
  instrucaoId?: string;
  texto?: string;
  /** Tipo 'telas': passo a passo com imagens da tela (gerado pelo pacote do sistema). */
  telas?: TelaIlustrada[];
}

export interface PerguntaProva {
  id: string;
  enunciado: string;
  alternativas: string[];
  /** Índice da alternativa certa — só existe no lado do DP; o portal nunca recebe. */
  correta?: number;
}

export interface ProvaTreinamento {
  notaMinima: number;
  perguntas: PerguntaProva[];
}

export interface Treinamento {
  id: string;
  titulo: string;
  descricao?: string;
  cargaHorariaMin: number;
  conteudos: ConteudoTreinamento[];
  prova?: ProvaTreinamento;
  obrigatorioTodos: boolean;
  obrigatorioCargos: string[];
  obrigatorioSetores: string[];
  validadeMeses?: number;
  prazoDias?: number;
  ativo: boolean;
  criadoPor?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export type StatusAtribuicao = 'Pendente' | 'Em andamento' | 'Concluído';

export interface TentativaProva {
  em: string;
  nota: number;
  aprovado: boolean;
}

export interface AtribuicaoTreinamento {
  id: string;
  treinamentoId: string;
  colaboradorId: string;
  origem: 'regra' | 'manual' | 'reciclagem';
  atribuidoEm: string;
  prazo?: string;
  status: StatusAtribuicao;
  conteudosVistos: string[];
  tentativas: TentativaProva[];
  nota?: number;
  concluidoEm?: string;
  validoAte?: string;
  assinaturaImagem?: string;
  declaracao?: string;
  navegador?: string;
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
export function gerarIdCurto(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Treinamentos
// ---------------------------------------------------------------------------

function rowToTreinamento(r: any): Treinamento {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: u(r.descricao),
    cargaHorariaMin: Number(r.carga_horaria_min ?? 60),
    conteudos: r.conteudos ?? [],
    prova: u(r.prova),
    obrigatorioTodos: !!r.obrigatorio_todos,
    obrigatorioCargos: r.obrigatorio_cargos ?? [],
    obrigatorioSetores: r.obrigatorio_setores ?? [],
    validadeMeses: r.validade_meses === null ? undefined : Number(r.validade_meses),
    prazoDias: r.prazo_dias === null ? undefined : Number(r.prazo_dias),
    ativo: r.ativo !== false,
    criadoPor: u(r.criado_por),
    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
  };
}

export async function getTreinamentos(): Promise<Treinamento[]> {
  const { data, error } = await supabase.from('treinamentos').select('*').order('titulo');
  assertNoError(error, 'getTreinamentos');
  return (data ?? []).map(rowToTreinamento);
}

export async function saveTreinamento(t: Treinamento): Promise<Treinamento> {
  const registro = t.id ? t : { ...t, id: gerarIdCurto('trein') };
  const { error } = await supabase.from('treinamentos').upsert({
    id: registro.id,
    titulo: registro.titulo,
    descricao: n(registro.descricao),
    carga_horaria_min: registro.cargaHorariaMin,
    conteudos: registro.conteudos,
    prova: registro.prova && registro.prova.perguntas.length > 0 ? registro.prova : null,
    obrigatorio_todos: registro.obrigatorioTodos,
    obrigatorio_cargos: registro.obrigatorioCargos,
    obrigatorio_setores: registro.obrigatorioSetores,
    validade_meses: registro.validadeMeses ?? null,
    prazo_dias: registro.prazoDias ?? null,
    ativo: registro.ativo,
    criado_por: n(registro.criadoPor),
    criado_em: registro.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });
  assertNoError(error, 'saveTreinamento');
  return registro;
}

export async function deleteTreinamento(id: string): Promise<void> {
  const { error } = await supabase.from('treinamentos').delete().eq('id', id);
  assertNoError(error, 'deleteTreinamento');
}

/** Envia um material (PDF) pro bucket público "treinamentos" e devolve a URL pública. */
export async function enviarMaterialTreinamento(arquivo: File): Promise<string> {
  const nomeSeguro = arquivo.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-80);
  const caminho = `materiais/${new Date().toISOString().slice(0, 7)}/${gerarIdCurto('mat')}-${nomeSeguro}`;
  const { error } = await supabase.storage.from('treinamentos').upload(caminho, arquivo, {
    contentType: arquivo.type || 'application/pdf',
    upsert: false,
  });
  if (error) throw new Error(`Não foi possível enviar "${arquivo.name}": ${error.message}`);
  return supabase.storage.from('treinamentos').getPublicUrl(caminho).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Atribuições
// ---------------------------------------------------------------------------

function rowToAtribuicao(r: any): AtribuicaoTreinamento {
  return {
    id: r.id,
    treinamentoId: r.treinamento_id,
    colaboradorId: r.colaborador_id,
    origem: r.origem,
    atribuidoEm: r.atribuido_em,
    prazo: u(r.prazo),
    status: r.status,
    conteudosVistos: r.conteudos_vistos ?? [],
    tentativas: r.tentativas ?? [],
    nota: r.nota === null || r.nota === undefined ? undefined : Number(r.nota),
    concluidoEm: u(r.concluido_em),
    validoAte: u(r.valido_ate),
    assinaturaImagem: u(r.assinatura_imagem),
    declaracao: u(r.declaracao),
    navegador: u(r.navegador),
  };
}

/** Lista sem a imagem da assinatura (pesada) — o registro completo vem de getAtribuicao. */
export async function getAtribuicoes(): Promise<AtribuicaoTreinamento[]> {
  const { data, error } = await supabase
    .from('treinamento_atribuicoes')
    .select('id, treinamento_id, colaborador_id, origem, atribuido_em, prazo, status, conteudos_vistos, tentativas, nota, concluido_em, valido_ate, declaracao, navegador')
    .order('atribuido_em', { ascending: false });
  assertNoError(error, 'getAtribuicoes');
  return (data ?? []).map(rowToAtribuicao);
}

export async function getAtribuicao(id: string): Promise<AtribuicaoTreinamento | null> {
  const { data, error } = await supabase.from('treinamento_atribuicoes').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'getAtribuicao');
  return data ? rowToAtribuicao(data) : null;
}

async function inserirAtribuicoes(novas: AtribuicaoTreinamento[]): Promise<void> {
  if (novas.length === 0) return;
  const { error } = await supabase.from('treinamento_atribuicoes').insert(
    novas.map((a) => ({
      id: a.id,
      treinamento_id: a.treinamentoId,
      colaborador_id: a.colaboradorId,
      origem: a.origem,
      atribuido_em: a.atribuidoEm,
      prazo: a.prazo ?? null,
      status: a.status,
    }))
  );
  assertNoError(error, 'inserirAtribuicoes');
}

export async function excluirAtribuicao(id: string): Promise<void> {
  const { error } = await supabase.from('treinamento_atribuicoes').delete().eq('id', id);
  assertNoError(error, 'excluirAtribuicao');
}

const hojeIso = () => new Date().toISOString().slice(0, 10);

function prazoPara(t: Treinamento): string | undefined {
  if (!t.prazoDias) return undefined;
  const d = new Date();
  d.setDate(d.getDate() + t.prazoDias);
  return d.toISOString().slice(0, 10);
}

function normalizar(v?: string): string {
  return (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
}

/** O treinamento é obrigatório pra este colaborador pela regra (todos / cargo / setor)? */
export function obrigatorioPara(t: Treinamento, c: Colaborador): boolean {
  if (!t.ativo) return false;
  if (t.obrigatorioTodos) return true;
  if (t.obrigatorioCargos.some((cargo) => normalizar(cargo) === normalizar(c.funcaoCargo))) return true;
  if (t.obrigatorioSetores.some((setor) => normalizar(setor) === normalizar(c.setor))) return true;
  return false;
}

/** Atribuição "da vez" de cada colaborador × treinamento (a mais recente). */
export function atribuicaoAtual(
  atribuicoes: AtribuicaoTreinamento[],
  treinamentoId: string,
  colaboradorId: string
): AtribuicaoTreinamento | undefined {
  return atribuicoes
    .filter((a) => a.treinamentoId === treinamentoId && a.colaboradorId === colaboradorId)
    .sort((a, b) => b.atribuidoEm.localeCompare(a.atribuidoEm))[0];
}

export function estaVencida(a?: AtribuicaoTreinamento): boolean {
  return !!a && a.status === 'Concluído' && !!a.validoAte && a.validoAte < hojeIso();
}

/** Cria as atribuições que faltam: (1) pela regra de obrigatoriedade, pra quem ainda não tem;
 *  (2) reciclagem, pra quem concluiu e a validade venceu. Idempotente — rodar de novo não
 *  duplica. Devolve as que criou. */
export async function sincronizarAtribuicoes(
  treinamentos: Treinamento[],
  colaboradores: Colaborador[],
  atribuicoes: AtribuicaoTreinamento[]
): Promise<AtribuicaoTreinamento[]> {
  const novas: AtribuicaoTreinamento[] = [];
  const agora = new Date().toISOString();
  for (const t of treinamentos.filter((x) => x.ativo)) {
    for (const c of colaboradores.filter((x) => x.status !== 'Inativo')) {
      const atual = atribuicaoAtual(atribuicoes, t.id, c.id);
      const obrigatorio = obrigatorioPara(t, c);
      if (!atual && obrigatorio) {
        novas.push({ id: gerarIdCurto('atr'), treinamentoId: t.id, colaboradorId: c.id, origem: 'regra', atribuidoEm: agora, prazo: prazoPara(t), status: 'Pendente', conteudosVistos: [], tentativas: [] });
      } else if (atual && estaVencida(atual)) {
        novas.push({ id: gerarIdCurto('atr'), treinamentoId: t.id, colaboradorId: c.id, origem: 'reciclagem', atribuidoEm: agora, prazo: prazoPara(t), status: 'Pendente', conteudosVistos: [], tentativas: [] });
      }
    }
  }
  await inserirAtribuicoes(novas);
  return novas;
}

/** Atribuição manual pra uma lista de colaboradores (pula quem já tem uma em aberto). */
export async function atribuirManualmente(
  t: Treinamento,
  colaboradorIds: string[],
  atribuicoes: AtribuicaoTreinamento[]
): Promise<AtribuicaoTreinamento[]> {
  const agora = new Date().toISOString();
  const novas = colaboradorIds
    .filter((cid) => {
      const atual = atribuicaoAtual(atribuicoes, t.id, cid);
      return !atual || atual.status === 'Concluído';
    })
    .map((cid) => ({
      id: gerarIdCurto('atr'),
      treinamentoId: t.id,
      colaboradorId: cid,
      origem: 'manual' as const,
      atribuidoEm: agora,
      prazo: prazoPara(t),
      status: 'Pendente' as const,
      conteudosVistos: [],
      tentativas: [],
    }));
  await inserirAtribuicoes(novas);
  return novas;
}

// ---------------------------------------------------------------------------
// Link pessoal do portal
// ---------------------------------------------------------------------------

function gerarToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getTokensPortal(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('portal_colaborador').select('colaborador_id, token, revogado');
  assertNoError(error, 'getTokensPortal');
  return new Map((data ?? []).filter((r: any) => !r.revogado).map((r: any) => [r.colaborador_id, r.token]));
}

/** Link fixo do portal do colaborador — cria na primeira vez. */
export async function obterOuCriarTokenPortal(colaboradorId: string, existentes: Map<string, string>): Promise<string> {
  const atual = existentes.get(colaboradorId);
  if (atual) return atual;
  const token = gerarToken();
  const { error } = await supabase.from('portal_colaborador').upsert({ colaborador_id: colaboradorId, token, revogado: false });
  assertNoError(error, 'obterOuCriarTokenPortal');
  existentes.set(colaboradorId, token);
  return token;
}

/** Gera um link novo (o antigo para de funcionar) — ex.: link vazou ou celular trocado. */
export async function regenerarTokenPortal(colaboradorId: string): Promise<string> {
  const token = gerarToken();
  const { error } = await supabase.from('portal_colaborador').upsert({ colaborador_id: colaboradorId, token, revogado: false });
  assertNoError(error, 'regenerarTokenPortal');
  return token;
}

export function montarLinkPortal(token: string): string {
  return `${window.location.origin}${window.location.pathname}?form=portal&token=${token}`;
}

// ---------------------------------------------------------------------------
// Portal (sem login)
// ---------------------------------------------------------------------------

export interface TreinamentoPortal {
  atribuicaoId: string;
  treinamentoId: string;
  titulo: string;
  descricao?: string;
  cargaHorariaMin: number;
  conteudos: ConteudoTreinamento[];
  prova?: ProvaTreinamento | null;
  validadeMeses?: number | null;
  prazo?: string | null;
  status: StatusAtribuicao;
  conteudosVistos: string[];
  tentativas: TentativaProva[];
  nota?: number | null;
  concluidoEm?: string | null;
  validoAte?: string | null;
}

export interface DadosPortal {
  colaborador: { nome: string; cargo?: string };
  treinamentos: TreinamentoPortal[];
  /** Linhas cruas de instrucoes_trabalho (vigentes) — converter com rowToInstrucao. */
  instrucoes: any[];
}

export interface CredenciaisPortal {
  token: string;
  cpf: string;
  nascimento: string; // YYYY-MM-DD
}

export async function portalEntrar(c: CredenciaisPortal): Promise<{ dados?: DadosPortal; erro?: 'link' | 'dados' }> {
  const { data, error } = await supabase.rpc('portal_entrar', { p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });
  assertNoError(error, 'portalEntrar');
  const r = (data ?? {}) as any;
  if (r.erro) return { erro: r.erro };
  return { dados: r as DadosPortal };
}

export async function portalMarcarVisto(c: CredenciaisPortal, atribuicaoId: string, conteudoId: string): Promise<void> {
  const { error } = await supabase.rpc('portal_marcar_visto', {
    p_token: c.token,
    p_cpf: c.cpf,
    p_nascimento: c.nascimento,
    p_atribuicao_id: atribuicaoId,
    p_conteudo_id: conteudoId,
  });
  assertNoError(error, 'portalMarcarVisto');
}

export async function portalEnviarProva(
  c: CredenciaisPortal,
  atribuicaoId: string,
  respostas: Record<string, number>
): Promise<{ nota?: number; aprovado?: boolean; notaMinima?: number; acertos?: number; total?: number; erro?: string }> {
  const { data, error } = await supabase.rpc('portal_enviar_prova', {
    p_token: c.token,
    p_cpf: c.cpf,
    p_nascimento: c.nascimento,
    p_atribuicao_id: atribuicaoId,
    p_respostas: respostas,
  });
  assertNoError(error, 'portalEnviarProva');
  return (data ?? {}) as any;
}

export async function portalConcluir(
  c: CredenciaisPortal,
  atribuicaoId: string,
  assinatura: string,
  declaracao: string
): Promise<{ ok?: boolean; concluidoEm?: string; validoAte?: string | null; erro?: string }> {
  const { data, error } = await supabase.rpc('portal_concluir', {
    p_token: c.token,
    p_cpf: c.cpf,
    p_nascimento: c.nascimento,
    p_atribuicao_id: atribuicaoId,
    p_assinatura: assinatura,
    p_declaracao: declaracao,
    p_navegador: navigator.userAgent,
  });
  assertNoError(error, 'portalConcluir');
  return (data ?? {}) as any;
}
