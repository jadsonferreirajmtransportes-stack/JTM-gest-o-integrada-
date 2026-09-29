// ============================================================================
// Download de arquivos guardados como data URL (base64) — anexos de Compras,
// Projetos etc. Um <a href="data:..." download> direto falha no Chrome quando o
// arquivo passa de ~2MB (limite de tamanho de data URL em navegação/download),
// o que fazia PDF de orçamento "não baixar" sem erro nenhum. Convertendo pra
// Blob + object URL não tem esse limite.
// ============================================================================

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

/** Baixa um arquivo a partir de um data URL (ou de uma URL comum, que só é repassada). */
export function baixarArquivo(url: string, nomeArquivo: string): void {
  const href = url.startsWith('data:') ? URL.createObjectURL(dataUrlParaBlob(url)) : url;
  const a = document.createElement('a');
  a.href = href;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (href !== url) setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
