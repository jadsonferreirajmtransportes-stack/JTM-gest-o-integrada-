// Detecta se a URL atual é uma das telas públicas do sistema — formulário de admissão de
// candidato, formulário de ocorrência, ou visualização de instrução de trabalho — acessadas
// por link direto, SEM login (candidato, motorista, fiscal etc. não têm conta no sistema).
//
// Usado em dois lugares que precisam concordar exatamente:
//  - AuthGate.tsx: decide se deixa passar sem pedir login.
//  - App.tsx: decide qual portal público renderizar (useEffect que já existia antes do login).
// Mesma lista de parâmetros/hash dos dois lados, pra nunca ficar um bloqueando o que o outro libera.
export function isRotaPublica(): boolean {
  if (typeof window === 'undefined') return false;
  const searchParams = new URLSearchParams(window.location.search);
  const formParam = searchParams.get('form') || searchParams.get('link') || searchParams.get('pagina');
  const hash = window.location.hash.toLowerCase();
  return (
    formParam === 'admissao' ||
    hash === '#admissao' ||
    formParam === 'ocorrencia' ||
    formParam === 'ocorrencias' ||
    formParam === 'publico' ||
    hash === '#ocorrencia' ||
    hash === '#ocorrencias' ||
    hash === '#formulario_publico' ||
    formParam === 'instrucao' ||
    hash === '#instrucao'
  );
}
