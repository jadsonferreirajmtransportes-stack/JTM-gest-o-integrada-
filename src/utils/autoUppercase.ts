// Maiúsculo automático em todo o sistema (por padrão): transforma o texto digitado em
// <input>/<textarea> para CAIXA ALTA em tempo real, ANTES do React ler o valor — então o que
// fica salvo no banco (e, por consequência, aparece na ficha compartilhada, PDFs e relatórios)
// já vem em maiúsculo, sem precisar alterar cada onChange dos formulários um por um.
//
// Como funciona: o listener é registrado na fase de CAPTURA em `document`. Eventos nativos
// passam pela fase de captura (document → ... → elemento) ANTES da fase de "bubbling", que é
// onde o React normalmente escuta os eventos (delegados na raiz da aplicação). Ou seja, quando
// o onChange do componente roda, `e.target.value` já está em maiúsculo.
//
// Tipos de campo que ficam de fora (não faz sentido ou quebraria o uso): e-mail, senha, url,
// número, data/hora, cor, arquivo, faixa (range) e campos marcados manualmente com
// data-no-uppercase="true" (ex.: busca/filtro).
const TIPOS_EXCLUIDOS = new Set([
  'email',
  'password',
  'url',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'color',
  'file',
  'range',
  'checkbox',
  'radio',
  'hidden',
  'search',
]);

// Placeholders típicos de campo de busca/filtro (não são dado cadastrado, e sim um filtro de
// tela) — ficam de fora mesmo sendo type="text".
const PLACEHOLDER_BUSCA_REGEX = /buscar|pesquisar|filtrar|search/i;

const deveIgnorar = (el: HTMLInputElement | HTMLTextAreaElement): boolean => {
  if (el.dataset.noUppercase === 'true') return true;
  if (PLACEHOLDER_BUSCA_REGEX.test(el.placeholder || '')) return true;
  if (el instanceof HTMLInputElement && TIPOS_EXCLUIDOS.has(el.type)) return true;
  return false;
};

export const ativarMaiusculoAutomatico = () => {
  document.addEventListener(
    'input',
    (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;
      if (deveIgnorar(el)) return;

      const maiusculo = el.value.toUpperCase();
      if (maiusculo === el.value) return;

      // Maiúsculo não muda a quantidade de caracteres, mas setar `.value` via JS reseta o
      // cursor pro final — por isso salvamos e restauramos a posição manualmente.
      const inicio = el.selectionStart;
      const fim = el.selectionEnd;
      el.value = maiusculo;
      if (inicio !== null && fim !== null) {
        el.setSelectionRange(inicio, fim);
      }
    },
    true // fase de captura — roda antes do listener (bubbling) do React
  );
};
