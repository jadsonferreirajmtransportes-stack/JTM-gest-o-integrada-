// ============================================================================
// Download de arquivos guardados como data URL (base64) — anexos de Compras,
// Projetos etc. Um <a href="data:..." download> direto falha no Chrome quando o
// arquivo passa de ~2MB (limite de tamanho de data URL em navegação/download),
// o que fazia PDF de orçamento "não baixar" sem erro nenhum. Convertendo pra
// Blob + object URL não tem esse limite.
// ============================================================================

import { ehRefStorage, obterUrlArquivo } from './arquivosStorage';

export function dataUrlParaBlob(dataUrl: string): Blob {
  const virgula = dataUrl.indexOf(',');
  const cabecalho = dataUrl.slice(0, virgula);
  const conteudo = dataUrl.slice(virgula + 1);
  const mime = cabecalho.match(/^data:([^;,]+)/)?.[1] || 'application/octet-stream';
  if (!cabecalho.includes(';base64')) {
    return new Blob([decodeURIComponent(conteudo)], { type: mime });
  }
  const binario = atob(conteudo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Baixa um arquivo a partir de um data URL, de uma referência "storage:" (ver
 *  arquivosStorage.ts) ou de uma URL comum. */
export async function baixarArquivo(valor: string, nomeArquivo: string): Promise<void> {
  const url = valor;
  if (ehRefStorage(valor)) {
    // Link assinado é de outro domínio (Supabase) — o atributo `download` é ignorado nesse caso
    // e o navegador só abriria o arquivo; buscando como Blob o nome do arquivo é respeitado.
    const resposta = await fetch(await obterUrlArquivo(valor));
    if (!resposta.ok) throw new Error(`Falha ao baixar "${nomeArquivo}" (${resposta.status})`);
    baixarBlob(await resposta.blob(), nomeArquivo);
    return;
  }
  if (url.startsWith('data:')) {
    baixarBlob(dataUrlParaBlob(url), nomeArquivo);
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
