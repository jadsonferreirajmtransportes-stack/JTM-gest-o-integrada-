// ============================================================================
// Link único do colaborador (migração 067): o link pessoal do portal
// (?form=portal&token=) reúne ponto, documentos, comunicados, treinamentos e
// jornal. As mensagens do DP levam esse link com "&ir=" apontando para o item.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { getTokensPortal, obterOuCriarTokenPortal, montarLinkPortal } from './educacaoApi';

/** Para onde o link abre depois de entrar. */
export type DestinoPortal =
  | 'inicio'
  | 'ponto'
  | 'documentos'
  | `documento:${string}`
  | 'comunicados'
  | `comunicado:${string}`
  | 'treinamentos'
  | 'jornal'
  | `jornal:${string}`;

export function montarLinkUnico(token: string, destino?: DestinoPortal): string {
  return destino && destino !== 'inicio' ? `${montarLinkPortal(token)}&ir=${encodeURIComponent(destino)}` : montarLinkPortal(token);
}

// Tokens já conhecidos nesta aba (evita reler a tabela a cada envio).
let cache: Map<string, string> | null = null;
let carregando: Promise<Map<string, string>> | null = null;

async function tokensConhecidos(): Promise<Map<string, string>> {
  if (cache) return cache;
  if (!carregando) carregando = getTokensPortal().then((m) => (cache = m));
  return carregando;
}

/** Garante que cada colaborador tem link pessoal (cria o que faltar) e devolve o mapa. */
export async function garantirTokensPortal(colaboradorIds: string[]): Promise<Map<string, string>> {
  const mapa = await tokensConhecidos();
  for (const id of Array.from(new Set(colaboradorIds.filter(Boolean)))) {
    if (!mapa.has(id)) await obterOuCriarTokenPortal(id, mapa);
  }
  return mapa;
}

/** Link único de um colaborador (cria o link pessoal se ainda não existir). */
export async function linkUnicoDe(colaboradorId: string, destino?: DestinoPortal): Promise<string> {
  const mapa = await garantirTokensPortal([colaboradorId]);
  return montarLinkUnico(mapa.get(colaboradorId)!, destino);
}

/** Hook: links pessoais dos colaboradores da tela. Enquanto carrega, `linkDe` devolve null
 *  (quem chama usa o link antigo como reserva, que continua funcionando). */
export function useLinksUnicos(colaboradorIds: string[]) {
  const chave = Array.from(new Set(colaboradorIds.filter(Boolean))).sort().join('|');
  const [mapa, setMapa] = useState<Map<string, string> | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!chave) return;
    garantirTokensPortal(chave.split('|'))
      .then((m) => vivo && setMapa(new Map(m)))
      .catch((err) => console.error('Links pessoais do portal:', err));
    return () => {
      vivo = false;
    };
  }, [chave]);
  return useMemo(
    () => ({
      pronto: !!mapa,
      linkDe: (colaboradorId: string, destino?: DestinoPortal): string | null => {
        const token = mapa?.get(colaboradorId);
        return token ? montarLinkUnico(token, destino) : null;
      },
    }),
    [mapa]
  );
}
