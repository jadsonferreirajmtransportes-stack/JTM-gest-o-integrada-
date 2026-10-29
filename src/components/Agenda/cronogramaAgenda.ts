// ============================================================================
// Cronograma da Agenda da Gestão — PDF (tabela por data) e Excel (aba "Cronograma"
// + aba "Linha do tempo" com as datas em colunas, pintadas por categoria).
// Atividade entra quando o intervalo [data, dataFim] encosta no período escolhido.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AtividadeGestao, CategoriaAtividadeGestao } from '../../types';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { getAtividadeDataFim } from './agendaUtils';

export const COR_CATEGORIA: Record<CategoriaAtividadeGestao, string> = {
  'Reunião & Governança': '7C3AED',
  'Auditoria & RDC 430': 'DC2626',
  'Operação & Frota': '0284C7',
  'Gente & DP': 'D97706',
  'Projetos & OKRs': '4F46E5',
  'Comercial & Clientes': '059669',
  'Treinamento & Capacitação': 'DB2777',
};
const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [110, 110, 110];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const diaSemana = (iso: string) => DIAS[new Date(`${iso}T12:00:00`).getDay()];
const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];

export interface OpcoesCronograma {
  inicio: string; // YYYY-MM-DD
  fim: string;
  titulo?: string;
}

export function atividadesDoPeriodo(atividades: AtividadeGestao[], o: OpcoesCronograma): AtividadeGestao[] {
  return atividades
    .filter((a) => a.data <= o.fim && getAtividadeDataFim(a) >= o.inicio)
    .sort((a, b) => a.data.localeCompare(b.data) || (a.diaInteiro ? '00:00' : a.horaInicio).localeCompare(b.diaInteiro ? '00:00' : b.horaInicio));
}

const quando = (a: AtividadeGestao) => {
  const fim = getAtividadeDataFim(a);
  return fim > a.data ? `${dataBr(a.data)} a ${dataBr(fim)}` : `${dataBr(a.data)} (${diaSemana(a.data)})`;
};
const horario = (a: AtividadeGestao) => (a.diaInteiro ? 'Dia inteiro' : `${a.horaInicio}–${a.horaFim}`);
const pessoas = (a: AtividadeGestao) => [a.responsavel, ...(a.participantes || [])].filter(Boolean).join(', ');
const nomeArquivo = (o: OpcoesCronograma, ext: string) => `Cronograma_${o.inicio}_a_${o.fim}.${ext}`;
const tituloDe = (o: OpcoesCronograma) => o.titulo?.trim() || 'Cronograma — Agenda da Gestão';

// ---------------------------------------------------------------------------
// PDF (A4 paisagem)
// ---------------------------------------------------------------------------
export function gerarCronogramaPdf(atividades: AtividadeGestao[], o: OpcoesCronograma): File {
  const lista = atividadesDoPeriodo(atividades, o);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const M = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...TEXTO);
  doc.text(tituloDe(o).toUpperCase(), M, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  doc.text(`Período: ${dataBr(o.inicio)} a ${dataBr(o.fim)} · ${lista.length} atividade(s)`, M, 40);

  // Legenda de categorias presentes
  let x = M;
  const presentes = Array.from(new Set(lista.map((a) => a.categoria)));
  doc.setFontSize(7.5);
  presentes.forEach((c) => {
    doc.setFillColor(...rgb(COR_CATEGORIA[c] || '888888'));
    doc.circle(x + 1.3, 45.2, 1.3, 'F');
    doc.setTextColor(...TEXTO);
    doc.text(c, x + 3.6, 46.2);
    x += doc.getTextWidth(c) + 9;
  });

  autoTable(doc, {
    startY: 50,
    margin: { left: M, right: M, top: 28, bottom: 16 },
    head: [['Data', 'Horário', 'Atividade', 'Categoria', 'Responsável / participantes', 'Local', 'Status']],
    body: lista.map((a) => [quando(a), horario(a), a.titulo, a.categoria, pessoas(a), a.localOuLink || '—', a.status]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: [45, 45, 45], lineColor: [220, 220, 220], lineWidth: 0.15, valign: 'top' },
    headStyles: { fillColor: [248, 240, 228], textColor: TEXTO, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 22 }, 2: { cellWidth: 70, fontStyle: 'bold' }, 3: { cellWidth: 34 }, 5: { cellWidth: 40 }, 6: { cellWidth: 22 } },
    didDrawCell: (h) => {
      // Barrinha colorida da categoria no começo da linha.
      if (h.section === 'body' && h.column.index === 0) {
        const a = lista[h.row.index];
        doc.setFillColor(...rgb(COR_CATEGORIA[a.categoria] || '888888'));
        doc.rect(h.cell.x, h.cell.y, 1, h.cell.height, 'F');
      }
    },
  });
  if (!lista.length) {
    doc.setFontSize(10);
    doc.setTextColor(...CINZA);
    doc.text('Nenhuma atividade no período.', M, 60);
  }

  const total = doc.getNumberOfPages();
  const logoL = 30;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', M, 9, logoL, (logoL * 339) / 900, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRONZE);
    doc.text('AGENDA DA GESTÃO', L - M, 14, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(M, 23, L - 2 * M, 0.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — gerado em ${new Date().toLocaleString('pt-BR')}`, M, A - 8);
    doc.text(`Página ${p} de ${total}`, L - M, A - 8, { align: 'right' });
  }
  return new File([doc.output('blob')], nomeArquivo(o, 'pdf'), { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------
// Excel — aba "Cronograma" (tabela) + aba "Linha do tempo" (datas em colunas)
// ---------------------------------------------------------------------------
export async function gerarCronogramaXlsx(atividades: AtividadeGestao[], o: OpcoesCronograma): Promise<File> {
  const lista = atividadesDoPeriodo(atividades, o);
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA_REGULAMENTO.razaoSocial;
  const bronze = { argb: 'FFC48229' };
  const borda = { style: 'thin' as const, color: { argb: 'FFDDDDDD' } };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const logoId = wb.addImage({ base64: JMT_LOGO_BASE64.split(',')[1], extension: 'png' });

  const cabecalho = (ws: any, colunas: number) => {
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 56 } });
    ws.getRow(1).height = 24;
    ws.getRow(2).height = 24;
    ws.mergeCells(1, 3, 1, Math.max(colunas, 4));
    ws.getCell(1, 3).value = tituloDe(o).toUpperCase();
    ws.getCell(1, 3).font = { bold: true, size: 13 };
    ws.mergeCells(2, 3, 2, Math.max(colunas, 4));
    ws.getCell(2, 3).value = `Período: ${dataBr(o.inicio)} a ${dataBr(o.fim)} · ${lista.length} atividade(s)`;
    ws.getCell(2, 3).font = { size: 9, color: bronze };
    for (let c = 1; c <= Math.max(colunas, 4); c++) ws.getCell(3, c).border = { bottom: { style: 'medium', color: bronze } };
    ws.addRow([]);
  };

  // Aba 1 — tabela
  const ws = wb.addWorksheet('Cronograma', { views: [{ state: 'frozen', ySplit: 5 }] });
  const colunas = ['Início', 'Fim', 'Dia', 'Horário', 'Atividade', 'Categoria', 'Responsável', 'Participantes', 'Local / link', 'Status', 'Prioridade', 'Recorrência'];
  cabecalho(ws, colunas.length);
  const cab = ws.addRow(colunas);
  cab.eachCell((c: any) => {
    c.font = { bold: true, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F0E4' } };
    c.border = bordas;
  });
  lista.forEach((a) => {
    const r = ws.addRow([
      new Date(`${a.data}T12:00:00`),
      new Date(`${getAtividadeDataFim(a)}T12:00:00`),
      diaSemana(a.data),
      horario(a),
      a.titulo,
      a.categoria,
      a.responsavel,
      (a.participantes || []).join(', '),
      a.localOuLink || '',
      a.status,
      a.prioridade,
      a.recorrencia && a.recorrencia !== 'Nenhuma' ? a.recorrencia : '',
    ]);
    r.eachCell((c: any) => {
      c.border = bordas;
      c.alignment = { vertical: 'top', wrapText: true };
    });
    r.getCell(1).numFmt = 'dd/mm/yyyy';
    r.getCell(2).numFmt = 'dd/mm/yyyy';
    r.getCell(6).font = { color: { argb: `FF${COR_CATEGORIA[a.categoria] || '888888'}` }, bold: true };
  });
  [12, 12, 6, 13, 42, 24, 22, 30, 30, 13, 11, 12].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: colunas.length } };

  // Aba 2 — linha do tempo (até 93 dias, para caber)
  const dias: string[] = [];
  for (let d = new Date(`${o.inicio}T12:00:00`); dias.length < 93; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (iso > o.fim) break;
    dias.push(iso);
  }
  const wt = wb.addWorksheet('Linha do tempo', { views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }] });
  cabecalho(wt, dias.length + 2);
  const cabT = wt.addRow(['Atividade', 'Responsável', ...dias.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}\n${diaSemana(d)}`)]);
  cabT.height = 30;
  cabT.eachCell((c: any, i: number) => {
    c.font = { bold: true, size: 9 };
    c.alignment = { horizontal: i > 2 ? 'center' : 'left', vertical: 'middle', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F0E4' } };
    c.border = bordas;
  });
  lista.forEach((a) => {
    const fim = getAtividadeDataFim(a);
    const r = wt.addRow([a.titulo, a.responsavel, ...dias.map(() => '')]);
    r.getCell(1).alignment = { wrapText: true, vertical: 'middle' };
    r.getCell(1).border = bordas;
    r.getCell(2).border = bordas;
    dias.forEach((d, i) => {
      const cel = r.getCell(i + 3);
      cel.border = bordas;
      const fds = [0, 6].includes(new Date(`${d}T12:00:00`).getDay());
      if (d >= a.data && d <= fim) {
        cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COR_CATEGORIA[a.categoria] || '888888'}` } };
        if (d === a.data && !a.diaInteiro) {
          cel.value = a.horaInicio;
          cel.font = { color: { argb: 'FFFFFFFF' }, size: 8, bold: true };
          cel.alignment = { horizontal: 'center' };
        }
      } else if (fds) cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    });
  });
  wt.getColumn(1).width = 40;
  wt.getColumn(2).width = 20;
  dias.forEach((_, i) => (wt.getColumn(i + 3).width = 6.5));
  wt.addRow([]);
  const leg = wt.addRow(['Legenda:']);
  leg.getCell(1).font = { bold: true, size: 9 };
  Object.entries(COR_CATEGORIA).forEach(([cat, cor]) => {
    const r = wt.addRow([cat]);
    r.getCell(1).font = { color: { argb: `FF${cor}` }, bold: true, size: 9 };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], nomeArquivo(o, 'xlsx'), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
