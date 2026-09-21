// ============================================================================
// Camada de acesso a dados via Supabase para Logins & Acessos (UsuarioLogin).
// Mesmo padrão de dpApi.ts/gestaoApi.ts. Ver a migração 012 para o porquê de
// não existir coluna de senha aqui — esse campo continua só local ao
// navegador (não faz parte do round-trip com o Supabase).
// ============================================================================

import { supabase } from './supabaseClient';
import { UsuarioLogin } from '../types';

function n(v: any): any {
  return v === '' || v === undefined ? null : v;
}
function j(v: any): any {
  return v ?? [];
}
function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}

function rowToUsuario(r: any): UsuarioLogin {
  return {
    id: r.id,
    nome: r.nome,
    login: r.login,
    email: r.email ?? '',
    senha: undefined, // não vem do Supabase — ver comentário no topo do arquivo
    cargo: u(r.cargo),
    setor: u(r.setor),
    status: r.status,
    dataCriacao: r.data_criacao,
    ultimoAcesso: u(r.ultimo_acesso),
    modulosPermitidos: j(r.modulos_permitidos),
    observacoes: u(r.observacoes),
    authUserId: u(r.auth_user_id),
    role: u(r.role),
    supervisorId: u(r.supervisor_id),
    secoesDpPermitidas: u(r.secoes_dp_permitidas),
    escopoApenasProprioSetor: r.escopo_apenas_proprio_setor ?? false,
    secoesOperacoesPermitidas: u(r.secoes_operacoes_permitidas),
    secoesOperacoesPorModulo: u(r.secoes_operacoes_por_modulo),
  };
}
function usuarioToRow(usr: UsuarioLogin) {
  return {
    id: usr.id,
    nome: usr.nome,
    login: usr.login,
    email: n(usr.email),
    cargo: n(usr.cargo),
    setor: n(usr.setor),
    status: usr.status,
    data_criacao: usr.dataCriacao || new Date().toISOString(),
    ultimo_acesso: n(usr.ultimoAcesso),
    modulos_permitidos: j(usr.modulosPermitidos),
    observacoes: n(usr.observacoes),
    atualizado_em: new Date().toISOString(),
    auth_user_id: n(usr.authUserId),
    role: usr.role || 'colaborador',
    supervisor_id: n(usr.supervisorId),
    secoes_dp_permitidas: usr.secoesDpPermitidas && usr.secoesDpPermitidas.length > 0 ? usr.secoesDpPermitidas : null,
    escopo_apenas_proprio_setor: usr.escopoApenasProprioSetor ?? false,
    secoes_operacoes_permitidas:
      usr.secoesOperacoesPermitidas && usr.secoesOperacoesPermitidas.length > 0 ? usr.secoesOperacoesPermitidas : null,
    secoes_operacoes_por_modulo:
      usr.secoesOperacoesPorModulo && Object.keys(usr.secoesOperacoesPorModulo).length > 0
        ? usr.secoesOperacoesPorModulo
        : null,
  };
}

export async function getUsuarios(): Promise<UsuarioLogin[]> {
  const { data, error } = await supabase.from('usuarios').select('*').order('data_criacao', { ascending: true });
  assertNoError(error, 'getUsuarios');
  return (data ?? []).map(rowToUsuario);
}
export async function saveUsuario(item: UsuarioLogin): Promise<void> {
  const { error } = await supabase.from('usuarios').upsert(usuarioToRow(item));
  assertNoError(error, 'saveUsuario');
}
export async function deleteUsuario(id: string): Promise<void> {
  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  assertNoError(error, 'deleteUsuario');
}

// ============================================================================
// LOGIN REAL POR PESSOA — FASE 1 (vínculo, sem mudar nenhum comportamento
// visível ainda; a troca de verdade — currentUser vir da conta real, e as
// políticas de RLS por pessoa — é uma fase futura, separada).
// ============================================================================

/** Se a conta que acabou de logar (Supabase Auth) ainda não está vinculada a nenhum cadastro
 *  de Logins & Acessos, tenta vincular automaticamente por e-mail — só em cadastros que ainda
 *  não têm vínculo, pra nunca roubar o vínculo de outra pessoa. Não mexe com senha nenhuma; só
 *  liga o cadastro já existente à conta real que autenticou. Silencioso e não-bloqueante: uma
 *  falha aqui não deve impedir o resto do app de carregar. */
export async function vincularContaAutenticadaSeNecessario(usuarios: UsuarioLogin[]): Promise<UsuarioLogin[]> {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) return usuarios;

    const authUserId = session.user.id;
    const email = (session.user.email || '').trim().toLowerCase();
    if (!email) return usuarios;

    const jaVinculado = usuarios.some((usr) => usr.authUserId === authUserId);
    if (jaVinculado) return usuarios;

    const candidato = usuarios.find(
      (usr) => !usr.authUserId && (usr.email || '').trim().toLowerCase() === email
    );
    if (!candidato) return usuarios;

    const { error } = await supabase.from('usuarios').update({ auth_user_id: authUserId }).eq('id', candidato.id);
    if (error) {
      console.error('Erro ao vincular conta autenticada:', error.message);
      return usuarios;
    }

    return usuarios.map((usr) => (usr.id === candidato.id ? { ...usr, authUserId } : usr));
  } catch (err) {
    console.error('Erro ao vincular conta autenticada:', err);
    return usuarios;
  }
}

/** Envia o convite por e-mail (Edge Function `convidar-usuario`, que roda no servidor do
 *  Supabase — nunca no navegador — e é a única peça que toca a service_role). A pessoa recebe
 *  um e-mail, clica no link, define a própria senha (DefinirSenhaScreen) e, no primeiro login,
 *  o vínculo automático (vincularContaAutenticadaSeNecessario) já liga a conta nova ao cadastro
 *  existente pelo e-mail. Só quem tiver `role: 'admin'` no próprio cadastro consegue convidar —
 *  isso é checado de novo, no servidor, então não dá pra burlar só editando a tela. */
export async function convidarUsuarioPorEmail(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('convidar-usuario', {
    body: { email, redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
  });
  if (error) {
    // Quando a função responde com status != 2xx, o SDK do Supabase só dá uma mensagem
    // genérica ("Edge Function returned a non-2xx status code") em `error.message` — o motivo
    // de verdade (ex.: "Só administradores podem convidar...") vem no corpo da resposta, em
    // `error.context` (a Response crua). Sem isso, todo erro parecia a mesma coisa na tela.
    let mensagem = error.message || 'Erro ao enviar convite.';
    try {
      const contexto = (error as { context?: Response }).context;
      if (contexto && typeof contexto.json === 'function') {
        const corpo = await contexto.json();
        if (corpo?.error) mensagem = corpo.error;
      }
    } catch {
      // mantém a mensagem genérica se não der pra ler o corpo da resposta
    }
    throw new Error(mensagem);
  }
  if (data?.error) {
    throw new Error(data.error);
  }
}
