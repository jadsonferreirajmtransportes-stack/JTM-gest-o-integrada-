// ============================================================================
// Telas carregadas sob demanda (code splitting). Antes o sistema inteiro vinha num arquivo
// só (~5,7 MB) que o celular precisava baixar e processar antes de mostrar qualquer coisa;
// agora cada tela vem quando é aberta, e o resto é pré-carregado aos poucos, com o aparelho
// ocioso, para a navegação continuar instantânea.
// ============================================================================

import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const CHAVE_RECARGA = 'jmt_recarga_por_versao_nova';

/** Depois de uma publicação nova os arquivos da versão antiga deixam de existir: quem estava com
 *  o sistema aberto recarrega a página (uma vez) em vez de ver a tela quebrar. */
function importarComRecarga<T>(carregar: () => Promise<T>): Promise<T> {
  return carregar().catch((erro) => {
    let ultima = 0;
    try {
      ultima = Number(sessionStorage.getItem(CHAVE_RECARGA)) || 0;
    } catch {
      // ignora
    }
    if (Date.now() - ultima > 30_000) {
      try {
        sessionStorage.setItem(CHAVE_RECARGA, String(Date.now()));
      } catch {
        // ignora
      }
      window.location.reload();
      return new Promise<T>(() => {});
    }
    throw erro;
  });
}

const carregadores: (() => Promise<unknown>)[] = [];

const Carregando = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 text-[#C48229] animate-spin" />
  </div>
);

/** Componente (export nomeado `nome` do módulo) carregado só quando aparece na tela. Cada um tem a
 *  própria "espera": telas mostram o indicador de carregando; janelas (`semIndicador`) nada. */
export function sobDemanda(carregar: () => Promise<any>, nome: string, semIndicador = false): React.FC<any> {
  carregadores.push(carregar); // pré-carga em segundo plano nunca recarrega a página
  const Componente = lazy(() => importarComRecarga(carregar).then((m: any) => ({ default: m[nome] })));
  const ComEspera: React.FC<any> = (props: any) => (
    <Suspense fallback={semIndicador ? null : <Carregando />}>
      <Componente {...props} />
    </Suspense>
  );
  ComEspera.displayName = `SobDemanda(${nome})`;
  return ComEspera;
}

/** Pré-carrega todas as telas aos poucos, com o aparelho ocioso (chamar depois que os dados
 *  iniciais chegaram), para que abrir qualquer tela depois seja imediato. */
export function preCarregarTelas() {
  const fila = Array.from(new Set(carregadores));
  const ocioso = (fn: () => void) =>
    'requestIdleCallback' in window ? (window as any).requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 200);
  const proximo = () => {
    const c = fila.shift();
    if (!c) return;
    c()
      .catch(() => undefined)
      .finally(() => ocioso(proximo));
  };
  ocioso(proximo);
}
