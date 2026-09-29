// ============================================================================
// PDF da Lista de Compras gerado direto com jsPDF + jspdf-autotable (texto e
// tabela de verdade), em vez de "foto" da tela via html2canvas: fica nítido,
// com texto selecionável, arquivo de poucos KB (a versão por imagem chegava a
// ~9MB por página) e sem depender de como o CSS da tela é capturado. Segue a
// identidade dos documentos impressos (PrintDocumentChrome / index.css):
// logo + título, subtítulo em bronze, linha de metadados, régua bronze e
// assinatura institucional no rodapé.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SolicitacaoCompra } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';

const BRONZE: [number, number, number] = [196, 130, 41]; // #c48229
const BRONZE_CLARO: [number, number, number] = [250, 246, 236]; // #faf6ec
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [85, 85, 85];
const MARGEM = 14; // mm

export function gerarPdfListaCompras(itens: SolicitacaoCompra[], filtroLabel: string, nomeArquivo: string): void {
  montarPdfListaCompras(itens, filtroLabel).save(nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`);
}

export function montarPdfListaCompras(itens: SolicitacaoCompra[], filtroLabel: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();

  // ---- Cabeçalho (só na 1ª página) ----
  const logoLargura = 42;
  const logoAltura = (logoLargura * 339) / 900; // proporção do PNG do logo
  // 'FAST' = compressão da imagem dentro do PDF — sem ela o logo sozinho deixa o arquivo com ~1,2MB.
  doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, MARGEM, logoLargura, logoAltura, 'jmt-logo', 'FAST');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...TEXTO);
  doc.text('LISTA DE COMPRAS', largura - MARGEM, MARGEM + 6, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(...BRONZE);
  doc.text(filtroLabel, largura - MARGEM, MARGEM + 11.5, { align: 'right' });

  const linhaMeta = [
    STRATEGIC_GUIDELINES.empresa,
    `${itens.length} ite${itens.length === 1 ? 'm' : 'ns'}`,
    `Emitido em ${new Date().toLocaleDateString('pt-BR')}`,
  ].join(' | ');
  const yMeta = MARGEM + logoAltura + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text(linhaMeta, largura - MARGEM, yMeta, { align: 'right' });

  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, yMeta + 2.5, largura - 2 * MARGEM, 0.7, 'F');

  // ---- Tabela ----
  const totalEstimado = itens.reduce((soma, s) => soma + (s.valorEstimado || 0), 0);

  autoTable(doc, {
    startY: yMeta + 7,
    margin: { left: MARGEM, right: MARGEM, bottom: 20 },
    head: [['Item', 'Qtd.', 'Setor', 'Urgência', 'Solicitante', 'Data', 'Valor Estimado']],
    body: itens.map((s) => [
      s.item,
      String(s.quantidade),
      s.setor || '—',
      s.urgencia,
      s.solicitanteNome,
      s.criadoEm ? formatDate(s.criadoEm.slice(0, 10)) : '—',
      s.valorEstimado !== undefined ? formatCurrency(s.valorEstimado) : '—',
    ]),
    foot: [
      [
        { content: 'Total estimado', colSpan: 6, styles: { halign: 'right' } },
        { content: formatCurrency(totalEstimado), styles: { halign: 'right' } },
      ],
    ],
    showFoot: 'lastPage',
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: TEXTO,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: { fillColor: BRONZE, textColor: [255, 255, 255], fontStyle: 'bold', lineColor: BRONZE },
    footStyles: { fillColor: [255, 255, 255], textColor: TEXTO, fontStyle: 'bold', lineColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: BRONZE_CLARO },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 12 },
      2: { cellWidth: 30 },
      3: { cellWidth: 19 },
      4: { cellWidth: 34 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 26 },
    },
    didParseCell: (data) => {
      // Destaca pedidos urgentes (em vermelho) — é a primeira coisa que quem vai comprar procura.
      if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'Urgente') {
        data.cell.styles.textColor = [190, 18, 60];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  if (itens.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...CINZA);
    doc.text('Nenhum item nesta lista.', largura / 2, yMeta + 25, { align: 'center' });
  }

  // ---- Rodapé em todas as páginas: assinatura institucional + numeração ----
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(MARGEM, altura - 13, largura - MARGEM, altura - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRONZE);
    doc.text(STRATEGIC_GUIDELINES.assinatura, largura / 2, altura - 9, { align: 'center' });
    doc.setTextColor(...CINZA);
    doc.text(`Página ${p} de ${totalPaginas}`, largura - MARGEM, altura - 5, { align: 'right' });
  }

  return doc;
}
