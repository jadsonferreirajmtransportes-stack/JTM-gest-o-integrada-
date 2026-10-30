// Quem está logado (Supabase Auth) no momento em que o AuthGate libera o sistema. O App lê isso
// de forma síncrona na primeira renderização para já abrir com o perfil CERTO (o cadastro
// guardado deste aparelho só vale se for da mesma conta) — antes ele abria com o perfil de
// administrador dos dados de fábrica até a lista de logins chegar do Supabase.

export interface SessaoAtual {
  id: string;
  email: string;
}

let sessao: SessaoAtual | undefined;

export const definirSessaoAtual = (s: SessaoAtual | undefined) => {
  sessao = s;
};

export const getSessaoAtual = () => sessao;

/** Cadastro do próprio usuário guardado neste aparelho (só o dele — não a lista de todos). */
export const CHAVE_MEU_CADASTRO = 'jmt_meu_cadastro';
