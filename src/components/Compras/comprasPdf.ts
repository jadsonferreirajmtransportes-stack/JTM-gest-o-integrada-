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
const TEXTO: [number, number, number] = [17, 17, 17]; // #111 — títulos e negrito
const CORPO: [number, number, number] = [51, 51, 51]; // #333 — texto comum
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

  // Mesmo visual da versão impressa (ComprasListaPdfModal + reset de @media print em index.css):
  // fundo branco, texto #333, cabeçalho da tabela em negrito #111 com linha inferior mais
  // grossa, e só linhas horizontais cinza-claro (#ddd) entre os itens.
  const linhaCinza: [number, number, number] = [221, 221, 221];
  autoTable(doc, {
    startY: yMeta + 8,
    margin: { left: MARGEM, right: MARGEM, bottom: 20 },
    head: [['Item', 'Qtd.', 'Setor', 'Urgência', 'Solicitante', 'Valor Estimado']],
    body: itens.map((s) => [
      s.item,
      String(s.quantidade),
      s.setor || '—',
      s.urgencia,
      `${s.solicitanteNome}${s.criadoEm ? ` — ${formatDate(s.criadoEm.slice(0, 10))}` : ''}`,
      s.valorEstimado !== undefined ? formatCurrency(s.valorEstimado) : '—',
    ]),
    foot: [
      [
        { content: 'Total estimado', colSpan: 5, styles: { halign: 'right' } },
        { content: formatCurrency(totalEstimado), styles: { halign: 'right' } },
      ],
    ],
    showFoot: 'lastPage',
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: CORPO,
      cellPadding: { top: 2.4, bottom: 2.4, left: 1.8, right: 1.8 },
      lineColor: linhaCinza,
      lineWidth: { bottom: 0.25 },
      valign: 'middle',
    },
    headStyles: { textColor: TEXTO, fontStyle: 'bold', lineWidth: { bottom: 0.6 } },
    footStyles: { textColor: TEXTO, fontStyle: 'bold', lineWidth: 0, cellPadding: { top: 3.5, bottom: 2, left: 1.8, right: 1.8 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: TEXTO, cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 10 },
      2: { cellWidth: 31 },
      3: { cellWidth: 18 },
      4: { cellWidth: 49 },
      5: { halign: 'right', cellWidth: 26 },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index === 1) data.cell.styles.halign = 'center';
      if (data.section === 'head' && data.column.index === 5) data.cell.styles.halign = 'right';
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
    doc.line(MARGEM, altura - 12, largura - MARGEM, altura - 12);
    // Assinatura (bronze, negrito) + "Página X de Y" (cinza) na mesma linha, centralizados —
    // igual ao .jmt-print-footer da impressão.
    const assinatura = STRATEGIC_GUIDELINES.assinatura;
    const pagina = `   Página ${p} de ${totalPaginas}`;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const larguraAssinatura = doc.getTextWidth(assinatura);
    doc.setFont('helvetica', 'normal');
    const larguraPagina = doc.getTextWidth(pagina);
    const xInicio = (largura - larguraAssinatura - larguraPagina) / 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRONZE);
    doc.text(assinatura, xInicio, altura - 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CINZA);
    doc.text(pagina, xInicio + larguraAssinatura, altura - 7.5);
  }

  return doc;
}
