// "Lembrar neste celular" (migrações 062 e 067): o aparelho guarda só um código secreto
// (nunca CPF/nascimento). O MESMO código serve para o ponto e para o portal — quem vinculou
// o celular no ponto já entra direto no portal, e vice-versa.
import type { CredenciaisPortal } from './educacaoApi';

const chaveAparelho = (token: string) => `jmt-ponto-${token.slice(0, 16)}`;

export function lerAparelho(token: string): string | null {
  try {
    return localStorage.getItem(chaveAparelho(token));
  } catch {
    return null;
  }
}

export function gravarAparelho(token: string, valor: string | null) {
  try {
    if (valor) localStorage.setItem(chaveAparelho(token), valor);
    else localStorage.removeItem(chaveAparelho(token));
  } catch {
    /* navegador sem armazenamento — vai pedir CPF de novo da próxima vez */
  }
}

/** Credenciais do portal a partir do aparelho lembrado (o banco reconhece o prefixo "disp:";
 *  a data é ignorada nesse caso). */
export function credenciaisDoAparelho(token: string, segredo: string): CredenciaisPortal {
  return { token, cpf: `disp:${segredo}`, nascimento: '1900-01-01' };
}

export const entrouPeloAparelho = (c: CredenciaisPortal) => c.cpf.startsWith('disp:');
