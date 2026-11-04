// ============================================================================
// Dossiê analítico mensal das baixas (Farma Rodoviário → Performance das baixas):
// indicadores, pódio e ranking dos responsáveis e ranking dos motoristas. A4 retrato.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { DesempenhoResponsavel, PESOS_PONTOS, ResumoMes, ResumoMotorista, pct } from '../../utils/baixasApi';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [110, 110, 110];
const CREME: [number, number, number] = [248, 240, 228];
const VERDE: [number, number, number] = [4, 120, 87];
const VERMELHO: [number, number, number] = [190, 18, 60];
const AZUL: [number, number, number] = [29, 78, 216];

const p1 = (n: number) => `${n.toFixed(1).replace('.', ',')}%`;
const nomeBonito = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (m) => m.toLowerCase());
const nomeMes = (ym: string) => {
  const [a, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} de ${a}`;
};
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function gerarDossieBaixasPdf(p: { mes: string; base: string; resumo: ResumoMes; ranking: DesempenhoResponsavel[]; motoristas: (ResumoMotorista & { taxa: number })[] }): File {
  const { mes, base, resumo, ranking, motoristas } = p;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const M = 14;
  const larg = L - 2 * M;
  let y = 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...TEXTO);
  doc.text('DOSSIÊ ANALÍTICO MENSAL — BAIXAS', M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  doc.text(`Referência: ${nomeMes(mes)} · Base: ${base || 'todas'} · Farma Rodoviário`, M, y);
  y += 8;

  // Indicadores
  const cartoes: [string, string, [number, number, number]][] = [
    ['SUCESSO GERAL', p1(pct(resumo.entregues, resumo.total)), VERDE],
    ['FALHAS GERAIS', p1(100 - pct(resumo.entregues, resumo.total)), VERMELHO],
    ['DENTRO DO PRAZO', p1(pct(resumo.noPrazo, resumo.total)), AZUL],
    ['TOTAL DE NOTAS', resumo.total.toLocaleString('pt-BR'), TEXTO],
  ];
  const lc = (larg - 9) / 4;
  cartoes.forEach(([rot, val, cor], i) => {
    const x = M + i * (lc + 3);
    doc.setFillColor(250, 247, 242);
    doc.setDrawColor(230, 220, 205);
    doc.roundedRect(x, y, lc, 20, 2, 2, 'FD');
    doc.setFillColor(...cor);
    doc.rect(x, y, lc, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA);
    doc.text(rot, x + 3, y + 6.5);
    doc.setFontSize(16);
    doc.setTextColor(...cor);
    doc.text(val, x + 3, y + 15.5);
  });
  y += 27;

  // Pódio
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXTO);
  doc.text('PÓDIO DE EXCELÊNCIA DO MÊS', M, y);
  y += 3;
  const lp = (larg - 6) / 3;
  const coresPodio: [number, number, number][] = [
    [234, 179, 8],
    [148, 163, 184],
    [196, 130, 41],
  ];
  ranking.slice(0, 3).forEach((r, i) => {
    const x = M + i * (lp + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...coresPodio[i]);
    doc.roundedRect(x, y, lp, 17, 2, 2, 'FD');
    doc.setFillColor(...coresPodio[i]);
    doc.circle(x + 7, y + 8.5, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`${i + 1}º`, x + 7, y + 10, { align: 'center' });
    doc.setTextColor(...TEXTO);
    doc.setFontSize(10);
    doc.text(r.responsavel.toUpperCase().slice(0, 22), x + 14, y + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...CINZA);
    doc.text(`${r.pontos.toFixed(1).replace('.', ',')} pontos · ${r.base}`, x + 14, y + 12.5);
    doc.setFont('helvetica', 'bold');
  });
  y += 24;

  const tabela = (titulo: string, opcoes: Parameters<typeof autoTable>[1]) => {
    if (y > A - 40) {
      doc.addPage();
      y = 32;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...TEXTO);
    doc.text(titulo, M, y);
    autoTable(doc, {
      startY: y + 2,
      margin: { left: M, right: M, top: 30, bottom: 18 },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: [45, 45, 45], lineColor: [225, 225, 225], lineWidth: 0.15, valign: 'middle' },
      headStyles: { fillColor: CREME, textColor: TEXTO, fontStyle: 'bold' },
      ...opcoes,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  };

  tabela('RANKING DOS RESPONSÁVEIS', {
    head: [['#', 'Responsável', 'Notas OK', 'Regularidade', 'Comprovação', 'Dias no prazo', 'Entrega', 'Pontos']],
    body: ranking.map((r, i) => [
      `${i + 1}º`,
      r.responsavel.toUpperCase() + (r.diasFaltantes.length ? `\nDias faltantes: ${r.diasFaltantes.map(dataBr).join(', ')}` : ''),
      `${r.entregues} / ${r.total}`,
      p1(r.regularidade),
      p1(r.comprovacao),
      `${r.diasNoPrazo}/${r.diasEsperados}`,
      p1(r.entrega),
      r.pontos.toFixed(1).replace('.', ','),
    ]),
    columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 48 }, 7: { fontStyle: 'bold', textColor: VERDE, halign: 'right' } },
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA);
  doc.text(
    `Pontos = ${PESOS_PONTOS.regularidade * 100}% regularidade (dias importados até o dia útil seguinte ÷ dias de operação) + ${PESOS_PONTOS.comprovacao * 100}% comprovação + ${PESOS_PONTOS.entrega * 100}% entrega.`,
    M,
    y - 5
  );

  tabela('RANKING DOS MOTORISTAS', {
    head: [['#', 'Motorista', 'Base', 'Notas OK', 'No prazo', 'Entrega']],
    body: motoristas.map((m, i) => [`${i + 1}º`, nomeBonito(m.motorista), m.base, `${m.entregues} / ${m.total}`, p1(pct(m.noPrazo, m.total)), p1(m.taxa)]),
    columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 5: { fontStyle: 'bold', halign: 'right' } },
    didParseCell: (h) => {
      if (h.section === 'body' && h.column.index === 5) {
        const t = motoristas[h.row.index]?.taxa ?? 0;
        h.cell.styles.textColor = t >= 97 ? VERDE : t >= 93 ? [146, 97, 31] : VERMELHO;
      }
    },
  });

  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', M, 9, 30, (30 * 339) / 900, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRONZE);
    doc.text('FARMA RODOVIÁRIO · PERFORMANCE DAS BAIXAS', L - M, 14, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(M, 22, larg, 0.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — gerado em ${new Date().toLocaleString('pt-BR')}`, M, A - 8);
    doc.text(`Página ${pg} de ${total}`, L - M, A - 8, { align: 'right' });
  }
  return new File([doc.output('blob')], `Dossie_Baixas_${mes}${base ? `_${base}` : ''}.pdf`, { type: 'application/pdf' });
}
