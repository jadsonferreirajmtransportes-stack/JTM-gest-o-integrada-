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
