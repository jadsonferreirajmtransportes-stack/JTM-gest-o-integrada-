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
