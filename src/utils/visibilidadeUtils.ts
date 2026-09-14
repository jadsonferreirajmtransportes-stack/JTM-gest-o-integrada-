// ============================================================================
// Regra de visibilidade compartilhada por Projetos Gerenciais, Notas & Ideias
// e Instruções de Trabalho — mesmo raciocínio já aplicado na Agenda da Gestão
// (ver podeVerAtividade em components/Agenda/agendaUtils.ts): liberar um
// módulo pra um login não significa mais dar visão de TUDO que existe nele.
//
// Regra: admin vê tudo; quem criou o registro sempre vê o próprio; quem foi
// marcado/mencionado explicitamente (usuariosMarcadosIds) vê; e, por
// compatibilidade com registros antigos (de antes dessa marcação existir),
// continua visível pra quem já está escrito em algum campo de texto livre
// relevante (responsável, autor, líder do projeto, etc. — varia por módulo,
// por isso `nomesTextoLivre` é passado por quem chama).
// ============================================================================

import { UsuarioLogin, UserRole, SecaoDp, Colaborador, Cliente } from '../types';

// ============================================================================
// Acesso por SEÇÃO dentro do módulo DP + escopo "própria equipe/carteira" —
// caso do supervisor de campo (ver UsuarioLogin.secoesDpPermitidas/escopoApenasProprioSetor/
// supervisorId). Diferente de podeVerRegistroCompartilhado abaixo: aquela função depende do
// toggle "userRole" do cabeçalho, que não é ligado ao login de verdade (default 'admin',
// só muda por um seletor manual) — aqui a checagem é sempre a partir do currentUser real.
// ============================================================================

/** Essa seção de DP está liberada pro login atual? Sem restrição cadastrada (secoesDpPermitidas
 *  ausente/vazio) = liberado, preservando o comportamento de todo login já cadastrado. */
export function podeVerSecaoDp(currentUser: UsuarioLogin | undefined, secao: SecaoDp): boolean {
  if (!currentUser?.secoesDpPermitidas || currentUser.secoesDpPermitidas.length === 0) return true;
  return currentUser.secoesDpPermitidas.includes(secao);
}

/** Só os colaboradores da equipe de um supervisor (Colaborador.supervisorId) — sem
 *  supervisorId (ex.: escopo desligado, ou login não vinculado a nenhum Supervisor), devolve
 *  a lista inteira sem filtrar. */
export function filtrarColaboradoresDoSupervisor(
  colaboradores: Colaborador[],
  supervisorId?: string
): Colaborador[] {
  if (!supervisorId) return colaboradores;
  return colaboradores.filter((c) => c.supervisorId === supervisorId);
}

/** Só os clientes sob responsabilidade de um supervisor. Cliente.gerenteContaResponsavel é
 *  texto livre (não um id, diferente de Colaborador.supervisorId) — casa pelo NOME do
 *  supervisor vinculado, acento/caixa-insensível. Limitação de dados existente (não
 *  introduzida aqui): zero clientes casando pode só significar que o nome cadastrado no
 *  cliente está digitado diferente do nome do Supervisor — ajustar lá se acontecer. */
export function filtrarClientesDoSupervisor(clientes: Cliente[], nomeSupervisor?: string): Cliente[] {
  if (!nomeSupervisor) return clientes;
  const alvo = nomeSupervisor.trim().toLowerCase();
  if (!alvo) return clientes;
  return clientes.filter((c) => (c.gerenteContaResponsavel || '').trim().toLowerCase() === alvo);
}

export function podeVerRegistroCompartilhado(params: {
  criadoPorUserId?: string;
  usuariosMarcadosIds?: string[];
  nomesTextoLivre?: (string | undefined)[];
  currentUser?: UsuarioLogin;
  userRole?: UserRole;
}): boolean {
  const { criadoPorUserId, usuariosMarcadosIds, nomesTextoLivre = [], currentUser, userRole } = params;

  if (userRole === 'admin') return true;
  if (!currentUser) return true;
  if (criadoPorUserId === currentUser.id) return true;
  if ((usuariosMarcadosIds || []).includes(currentUser.id)) return true;

  const nomeAtual = (currentUser.nome || '').trim().toLowerCase();
  if (!nomeAtual) return false;
  return nomesTextoLivre.some((n) => (n || '').trim().toLowerCase() === nomeAtual);
}
