import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Baixa um elemento já renderizado na tela (ex.: a ficha de EPI em `.jmt-print-doc`) como um
 * arquivo .pdf de verdade — diferente de "Imprimir" (window.print()), que abre a janela de
 * impressão do navegador e depende da pessoa escolher "Salvar como PDF" manualmente.
 *
 * Sem servidor pra gerar PDF (app 100% client-side): captura o elemento como imagem
 * (html2canvas) e embute essa imagem num documento jsPDF tamanho A4, recortando em várias
 * páginas quando o conteúdo é mais alto que uma página — mesmo recurso pra fichas com muitas
 * linhas de entrega acumuladas.
 */
export async function exportarElementoComoPdf(elementId: string, nomeArquivo: string): Promise<void> {
  const elemento = document.getElementById(elementId);
  if (!elemento) throw new Error(`Elemento "${elementId}" não encontrado para exportar em PDF.`);

  const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff', useCORS: true });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const larguraPagina = pdf.internal.pageSize.getWidth();
  const alturaPagina = pdf.internal.pageSize.getHeight();

  // Quantos pixels do canvas original cabem numa página A4, na escala em que a imagem
  // preenche a largura inteira da página.
  const pxPorPagina = Math.floor((alturaPagina * canvas.width) / larguraPagina);

  let offsetPx = 0;
  let primeiraPagina = true;
  while (offsetPx < canvas.height) {
    const alturaFatia = Math.min(pxPorPagina, canvas.height - offsetPx);
    const fatia = document.createElement('canvas');
    fatia.width = canvas.width;
    fatia.height = alturaFatia;
    const ctx = fatia.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, offsetPx, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia);
    }
    const imgData = fatia.toDataURL('image/png');
    const alturaFatiaNaPagina = (alturaFatia * larguraPagina) / canvas.width;

    if (!primeiraPagina) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, larguraPagina, alturaFatiaNaPagina);

    offsetPx += alturaFatia;
    primeiraPagina = false;
  }

  pdf.save(nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`);
}
