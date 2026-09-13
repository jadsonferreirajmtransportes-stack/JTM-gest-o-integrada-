// ============================================================================
// Chat Interno — camada de acesso a dados via Supabase (ver migração 015).
// Conversas diretas (1:1) e em grupo entre usuários de Logins & Acessos.
// Mesmo padrão de gestaoApi.ts/usuariosApi.ts pras funções normais; o que
// muda aqui é o realtime (assinarMensagensNovas), usado pra mensagem nova
// aparecer sozinha em quem está com a conversa aberta.
// ============================================================================

import { supabase } from './supabaseClient';
import { ConversaChat, MensagemChat, TipoConversaChat } from '../types';

function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}

function rowToMensagem(r: any): MensagemChat {
  return {
    id: r.id,
    conversaId: r.conversa_id,
    autorId: r.autor_id,
    texto: r.texto,
    criadoEm: r.criado_em,
    anexoUrl: r.anexo_url ?? undefined,
    anexoNome: r.anexo_nome ?? undefined,
    anexoTipo: r.anexo_tipo ?? undefined,
  };
}

function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// CONVERSAS
// ============================================================================

/** Todas as conversas de que o usuário participa, com a lista de participantes de cada uma
 *  (pra montar o nome/avatar de conversas diretas na tela) — ordenadas pela mais recente. */
export async function getConversasDoUsuario(usuarioId: string): Promise<ConversaChat[]> {
  const { data: participacoes, error: errP } = await supabase
    .from('chat_participantes')
    .select('conversa_id')
    .eq('usuario_id', usuarioId);
  assertNoError(errP, 'getConversasDoUsuario (participacoes)');

  const ids = (participacoes ?? []).map((p) => p.conversa_id);
  if (ids.length === 0) return [];

  const { data: conversas, error: errC } = await supabase
    .from('chat_conversas')
    .select('*')
    .in('id', ids)
    .order('atualizado_em', { ascending: false });
  assertNoError(errC, 'getConversasDoUsuario (conversas)');

  const { data: todosParticipantes, error: errTP } = await supabase
    .from('chat_participantes')
    .select('conversa_id, usuario_id')
    .in('conversa_id', ids);
  assertNoError(errTP, 'getConversasDoUsuario (participantes)');

  const participantesPorConversa: Record<string, string[]> = {};
  (todosParticipantes ?? []).forEach((p) => {
    (participantesPorConversa[p.conversa_id] ||= []).push(p.usuario_id);
  });

  return (conversas ?? []).map((c) => ({
    id: c.id,
    tipo: c.tipo as TipoConversaChat,
    nome: c.nome ?? undefined,
    criadoPor: c.criado_por ?? undefined,
    criadoEm: c.criado_em,
    atualizadoEm: c.atualizado_em,
    participantesIds: participantesPorConversa[c.id] || [],
  }));
}

/** Timestamp da última leitura de cada conversa por este usuário (null = nunca leu) — comparado
 *  com ConversaChat.atualizadoEm pra saber quais têm mensagem não lida. */
export async function getUltimasLeituras(usuarioId: string): Promise<Record<string, string | null>> {
  const { data, error } = await supabase
    .from('chat_participantes')
    .select('conversa_id, ultima_leitura_em')
    .eq('usuario_id', usuarioId);
  assertNoError(error, 'getUltimasLeituras');
  const mapa: Record<string, string | null> = {};
  (data ?? []).forEach((r) => {
    mapa[r.conversa_id] = r.ultima_leitura_em;
  });
  return mapa;
}

export async function marcarConversaComoLida(conversaId: string, usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_participantes')
    .update({ ultima_leitura_em: new Date().toISOString() })
    .eq('conversa_id', conversaId)
    .eq('usuario_id', usuarioId);
  assertNoError(error, 'marcarConversaComoLida');
}

/** Acha a conversa direta já existente entre essas duas pessoas, ou cria uma nova — nunca
 *  duplica: sempre a mesma conversa pra esse par, não importa quem inicia. */
export async function obterOuCriarConversaDireta(usuarioAId: string, usuarioBId: string): Promise<string> {
  const { data: participacoesA, error: errPA } = await supabase
    .from('chat_participantes')
    .select('conversa_id')
    .eq('usuario_id', usuarioAId);
  assertNoError(errPA, 'obterOuCriarConversaDireta (participacoes A)');

  const idsA = (participacoesA ?? []).map((p) => p.conversa_id);
  if (idsA.length > 0) {
    const { data: candidatas, error: errCand } = await supabase
      .from('chat_conversas')
      .select('id')
      .in('id', idsA)
      .eq('tipo', 'direta');
    assertNoError(errCand, 'obterOuCriarConversaDireta (candidatas)');

    const idsCandidatas = (candidatas ?? []).map((c) => c.id);
    if (idsCandidatas.length > 0) {
      const { data: participacaoB, error: errPB } = await supabase
        .from('chat_participantes')
        .select('conversa_id')
        .eq('usuario_id', usuarioBId)
        .in('conversa_id', idsCandidatas)
        .limit(1)
        .maybeSingle();
      assertNoError(errPB, 'obterOuCriarConversaDireta (participacao B)');
      if (participacaoB) return participacaoB.conversa_id;
    }
  }

  // Não existe ainda — cria a conversa e os dois participantes.
  const novaId = gerarId('conv');
  const agora = new Date().toISOString();
  const { error: errConv } = await supabase
    .from('chat_conversas')
    .insert({ id: novaId, tipo: 'direta', criado_por: usuarioAId, criado_em: agora, atualizado_em: agora });
  assertNoError(errConv, 'obterOuCriarConversaDireta (criar conversa)');

  const { error: errPart } = await supabase.from('chat_participantes').insert([
    { conversa_id: novaId, usuario_id: usuarioAId },
    { conversa_id: novaId, usuario_id: usuarioBId },
  ]);
  assertNoError(errPart, 'obterOuCriarConversaDireta (criar participantes)');

  return novaId;
}

/** Cria uma sala em grupo com nome e uma lista de participantes — quem cria sempre entra
 *  automaticamente, mesmo que não esteja na lista passada. */
export async function criarConversaGrupo(
  nome: string,
  criadoPorId: string,
  participantesIds: string[]
): Promise<string> {
  const id = gerarId('conv');
  const agora = new Date().toISOString();

  const { error: errConv } = await supabase
    .from('chat_conversas')
    .insert({ id, tipo: 'grupo', nome: nome.trim(), criado_por: criadoPorId, criado_em: agora, atualizado_em: agora });
  assertNoError(errConv, 'criarConversaGrupo (criar conversa)');

  const todosIds = Array.from(new Set([criadoPorId, ...participantesIds]));
  const { error: errPart } = await supabase
    .from('chat_participantes')
    .insert(todosIds.map((usuario_id) => ({ conversa_id: id, usuario_id })));
  assertNoError(errPart, 'criarConversaGrupo (criar participantes)');

  return id;
}

// ============================================================================
// MENSAGENS
// ============================================================================

export async function getMensagens(conversaId: string): Promise<MensagemChat[]> {
  const { data, error } = await supabase
    .from('chat_mensagens')
    .select('*')
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: true });
  assertNoError(error, 'getMensagens');
  return (data ?? []).map(rowToMensagem);
}

export interface AnexoMensagemChat {
  url: string; // data URL (base64)
  nome: string;
  tipo: string; // mime type
}

export async function enviarMensagem(
  conversaId: string,
  autorId: string,
  texto: string,
  anexo?: AnexoMensagemChat
): Promise<void> {
  const textoLimpo = texto.trim();
  // Precisa de texto OU anexo — uma imagem/PDF sozinho, sem legenda, também é uma mensagem válida.
  if (!textoLimpo && !anexo) return;
  const id = gerarId('msg');
  const agora = new Date().toISOString();

  const { error } = await supabase.from('chat_mensagens').insert({
    id,
    conversa_id: conversaId,
    autor_id: autorId,
    texto: textoLimpo,
    criado_em: agora,
    anexo_url: anexo?.url ?? null,
    anexo_nome: anexo?.nome ?? null,
    anexo_tipo: anexo?.tipo ?? null,
  });
  assertNoError(error, 'enviarMensagem');

  // Carimba a conversa como "mexida agora", pra ela subir no topo da lista de conversas.
  await supabase.from('chat_conversas').update({ atualizado_em: agora }).eq('id', conversaId);
}

/** Assina mensagens novas em TEMPO REAL (Supabase Realtime) — chama `onNovaMensagem` pra toda
 *  mensagem inserida em qualquer conversa (o filtro de "é uma conversa minha?" é feito por quem
 *  chama, já que uma inscrição por conversa ficaria complexa demais pra um chat desse tamanho).
 *  Retorna uma função pra cancelar a inscrição — sempre chamar ao desmontar/trocar de tela. */
export function assinarMensagensNovas(onNovaMensagem: (msg: MensagemChat) => void): () => void {
  const canal = supabase
    .channel(`chat_mensagens_realtime_${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_mensagens' },
      (payload) => onNovaMensagem(rowToMensagem(payload.new))
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}
