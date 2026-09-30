// ============================================================================
// Anexos no Supabase Storage (bucket privado "anexos" — ver migração
// 056_storage_anexos.sql).
//
// Os campos de anexo do sistema (ex.: Colaborador.asoImagemUrl,
// documentos[].arquivoUrl, anexos[].arquivoUrl) guardavam o arquivo inteiro em
// base64 ("data:..."). Agora um anexo novo vai pro Storage e o MESMO campo passa
// a guardar só uma referência curta: "storage:<caminho no bucket>". Os dois
// formatos convivem — anexos antigos em base64 continuam abrindo normalmente.
//
// Quem mostra/baixa um arquivo NUNCA usa o valor do campo direto como src/href:
// passa por obterUrlArquivo()/useArquivoUrl(), que devolvem o próprio data URL
// (formato antigo) ou um link assinado temporário (formato novo).
// ============================================================================

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const BUCKET = 'anexos';
const PREFIXO_REF = 'storage:';
/** Validade do link assinado usado pra mostrar/baixar dentro do sistema. */
const VALIDADE_LINK_SEGUNDOS = 60 * 60;
// Limite por arquivo do bucket: 10MB (file_size_limit na migração 056) — as telas checam um
// limite próprio menor (8MB) antes de enviar.

export function ehRefStorage(valor?: string | null): valor is string {
  return !!valor && valor.startsWith(PREFIXO_REF);
}

function caminhoDaRef(ref: string): string {
  return ref.slice(PREFIXO_REF.length);
}

function nomeSeguro(nome: string): string {
  const semAcento = nome.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const limpo = semAcento.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_');
  return limpo.slice(-80) || 'arquivo';
}

/** Envia o arquivo pro Storage e devolve a referência pra gravar no campo do registro.
 *  `pasta` organiza o bucket por módulo (ex.: 'dp/colaboradores'). */
export async function enviarArquivo(arquivo: File, pasta: string): Promise<string> {
  const mes = new Date().toISOString().slice(0, 7);
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const caminho = `${pasta}/${mes}/${id}-${nomeSeguro(arquivo.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: arquivo.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(`Não foi possível enviar "${arquivo.name}": ${error.message}`);
  return `${PREFIXO_REF}${caminho}`;
}

// Links assinados já gerados nesta sessão — reaproveitar o mesmo link (enquanto válido) deixa
// o navegador usar o próprio cache do arquivo em vez de baixar de novo a cada abertura.
const cacheLinks = new Map<string, { url: string; expiraEm: number }>();

/** URL pronta pra usar em <img src>, <iframe src> ou download: o próprio valor quando é um
 *  data URL/link comum (formato antigo), ou um link assinado temporário quando é "storage:". */
export async function obterUrlArquivo(valor: string): Promise<string> {
  if (!ehRefStorage(valor)) return valor;
  const emCache = cacheLinks.get(valor);
  if (emCache && emCache.expiraEm > Date.now() + 60_000) return emCache.url;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminhoDaRef(valor), VALIDADE_LINK_SEGUNDOS);
  if (error || !data?.signedUrl) throw new Error(`Arquivo não encontrado no Storage: ${error?.message ?? ''}`);
  cacheLinks.set(valor, { url: data.signedUrl, expiraEm: Date.now() + VALIDADE_LINK_SEGUNDOS * 1000 });
  return data.signedUrl;
}

/** Hook pra componentes: resolve o valor do campo de anexo numa URL exibível. */
export function useArquivoUrl(valor?: string | null): { url?: string; carregando: boolean; erro: boolean } {
  const [estado, setEstado] = useState<{ url?: string; carregando: boolean; erro: boolean }>(() =>
    valor && !ehRefStorage(valor) ? { url: valor, carregando: false, erro: false } : { carregando: !!valor, erro: false }
  );

  useEffect(() => {
    if (!valor) {
      setEstado({ carregando: false, erro: false });
      return;
    }
    if (!ehRefStorage(valor)) {
      setEstado({ url: valor, carregando: false, erro: false });
      return;
    }
    let cancelado = false;
    setEstado({ carregando: true, erro: false });
    obterUrlArquivo(valor)
      .then((url) => !cancelado && setEstado({ url, carregando: false, erro: false }))
      .catch((err) => {
        console.error(err);
        if (!cancelado) setEstado({ carregando: false, erro: true });
      });
    return () => {
      cancelado = true;
    };
  }, [valor]);

  return estado;
}

/** Pra snapshots abertos SEM login (ex.: Ficha Cadastral compartilhada): troca toda referência
 *  "storage:" dentro do objeto por um link assinado válido por `validadeSegundos` — quem abre o
 *  link público não tem permissão pra gerar link assinado sozinho (bucket privado). */
export async function trocarRefsPorLinksAssinados<T>(dados: T, validadeSegundos: number): Promise<T> {
  const refs = new Set<string>();
  const coletar = (v: unknown) => {
    if (typeof v === 'string') {
      if (ehRefStorage(v)) refs.add(v);
    } else if (Array.isArray(v)) v.forEach(coletar);
    else if (v && typeof v === 'object') Object.values(v).forEach(coletar);
  };
  coletar(dados);
  if (refs.size === 0) return dados;

  const lista = Array.from(refs);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(lista.map(caminhoDaRef), validadeSegundos);
  if (error) throw new Error(`Não foi possível preparar os anexos do link: ${error.message}`);
  const porRef = new Map<string, string>();
  (data ?? []).forEach((item, i) => {
    if (item.signedUrl) porRef.set(lista[i], item.signedUrl);
  });

  const trocar = (v: unknown): unknown => {
    if (typeof v === 'string') return ehRefStorage(v) ? porRef.get(v) ?? '' : v;
    if (Array.isArray(v)) return v.map(trocar);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, trocar(val)]));
    }
    return v;
  };
  return trocar(dados) as T;
}
