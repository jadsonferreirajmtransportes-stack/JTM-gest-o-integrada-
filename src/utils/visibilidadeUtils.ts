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

import { UsuarioLogin, UserRole } from '../types';

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
