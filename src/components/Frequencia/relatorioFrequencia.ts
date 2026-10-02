// ============================================================================
// Relatórios de frequência em Excel (exceljs) e o resumo do mês em PDF
// (jsPDF + autotable). O espelho individual em PDF fica em espelhoPdf.ts.
//   - Espelho do colaborador (Excel): aba "Espelho" (dia a dia, como no PDF) e
//     aba "Batidas" (cada batida: origem, base, distância, ajuste/anulação com
//     motivo e autor) — trilha completa para conferência.
//   - Resumo do mês (Excel e PDF): uma linha por colaborador.
// Sem latitude/longitude nos arquivos (só a base e a distância) — minimização
// de dado pessoal (LGPD).
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { BatidaPonto, JornadaPonto } from '../../utils/frequenciaApi';
import { DiaEspelho, LIMITE_ATRASOS_MES, NOMES_DIA, ResumoFrequencia, dataLocal, diaDaSemana, formatarMinutos, horaLocal } from './frequenciaCalc';
import { nomeMes } from './espelhoPdf';

const BRONZE = 'FFC48229';
const FUNDO_CAB = 'FFF8F0E4';
const borda = { style: 'thin' as const, color: { argb: 'FFDDDDDD' } };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const nomeSeguro = (t: string) => t.replace(/[^\p{L}\p{N}]+/gu, '_');
const jornadaTexto = (j?: JornadaPonto) =>
  j ? `${j.nome} — ${j.entrada}${j.saidaIntervalo ? ` às ${j.saidaIntervalo} / ${j.voltaIntervalo}` : ''} às ${j.saida} (${j.diasSemana.map((d) => NOMES_DIA[d]).join(', ')})` : 'Não definida';

export interface ColaboradorRelatorio {
  nomeCompleto: string;
  cpf?: string;
  funcaoCargo?: string;
  codigoMatricula?: string;
}

async function novaPlanilha() {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA_REGULAMENTO.razaoSocial;
  const logo = wb.addImage({ base64: JMT_LOGO_BASE64.split(',')[1], extension: 'png' });
  return { wb, logo };
}

/** Cabeçalho JMT nas linhas 1–5; devolve a próxima linha livre. */
function cabecalho(ws: any, logo: number, titulo: string, linhas: string[], colunas: number): number {
  ws.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 56 } });
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 22;
  ws.mergeCells(1, 3, 1, colunas);
  ws.getCell(1, 3).value = titulo;
  ws.getCell(1, 3).font = { bold: true, size: 13, color: { argb: 'FF111111' } };
  ws.getCell(1, 3).alignment = { horizontal: 'right', vertical: 'middle' };
  ws.mergeCells(2, 3, 2, colunas);
  ws.getCell(2, 3).value = 'Controle interno de frequência — não substitui o registro oficial de ponto';
  ws.getCell(2, 3).font = { size: 9, color: { argb: BRONZE } };
  ws.getCell(2, 3).alignment = { horizontal: 'right', vertical: 'middle' };
  for (let c = 1; c <= colunas; c++) ws.getCell(3, c).border = { bottom: { style: 'medium', color: { argb: BRONZE } } };
  let r = 4;
  for (const l of linhas) {
    ws.mergeCells(r, 1, r, colunas);
    ws.getCell(r, 1).value = l;
    ws.getCell(r, 1).font = { size: 10, color: { argb: 'FF333333' } };
    r += 1;
  }
  return r + 1;
}

function linhaCabecalhoTabela(ws: any, linha: number, titulos: string[]) {
  const row = ws.getRow(linha);
  titulos.forEach((t, i) => {
    const c = row.getCell(i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: 'FF111111' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FUNDO_CAB } };
    c.border = { ...bordas, bottom: { style: 'medium', color: { argb: BRONZE } } };
    c.alignment = { vertical: 'middle', wrapText: true };
  });
}

function rodape(wb: any, referencia: string) {
  wb.eachSheet((ws: any) => {
    ws.headerFooter.oddFooter = `&L&8${EMPRESA_REGULAMENTO.razaoSocial} — ${referencia}&R&8Página &P de &N`;
    ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } };
  });
}

async function paraArquivo(wb: any, nome: string): Promise<File> {
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], nome, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const minutosParaDia = (min: number) => min / (24 * 60); // valor de tempo do Excel

// ---------------------------------------------------------------------------
// Espelho do colaborador (Excel)
// ---------------------------------------------------------------------------
export async function gerarEspelhoXlsx(params: {
  colaborador: ColaboradorRelatorio;
  mes: string;
  jornada?: JornadaPonto;
  espelho: DiaEspelho[];
  resumo: ResumoFrequencia;
  todasBatidas: BatidaPonto[]; // inclui anuladas, do mês
}): Promise<File> {
  const { colaborador: c, mes, jornada, espelho, resumo: r, todasBatidas } = params;
  const { wb, logo } = await novaPlanilha();
  const maxBatidas = Math.max(4, ...espelho.map((d) => d.batidas.length));
  const titulosBatidas = Array.from({ length: maxBatidas }, (_, i) => `${i + 1}ª batida`);
  const titulos = ['Data', 'Dia', ...titulosBatidas, 'Trabalhado', 'Previsto', 'Atraso (min)', 'Saldo (min)', 'Situação', 'Observação'];

  const ws = wb.addWorksheet('Espelho', { views: [{ state: 'frozen', ySplit: 8 }] });
  let linha = cabecalho(
    ws,
    logo,
    `ESPELHO DE FREQUÊNCIA — ${nomeMes(mes).toUpperCase()}`,
    [
      `Colaborador(a): ${c.nomeCompleto}${c.codigoMatricula ? ` — Matrícula ${c.codigoMatricula}` : ''}${c.funcaoCargo ? ` — ${c.funcaoCargo}` : ''}`,
      `Jornada: ${jornadaTexto(jornada)}`,
      `Empregador: ${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`,
    ],
    titulos.length
  );
  linhaCabecalhoTabela(ws, linha, titulos);
  linha += 1;
  espelho.forEach((d) => {
    const horas = d.batidas.map((b) => `${horaLocal(b.registradoEm)}${b.origem === 'ajuste' ? '*' : ''}`);
    const obs = [
      d.justificativa ? `${d.justificativa.tipo}${d.justificativa.observacao ? ` — ${d.justificativa.observacao}` : ''}` : '',
      d.foraDoLocal ? 'Batida longe da base' : '',
      d.anuladas.length ? `${d.anuladas.length} batida(s) anulada(s)` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const row = ws.getRow(linha);
    row.values = [
      dataBr(d.data),
      NOMES_DIA[diaDaSemana(d.data)],
      ...Array.from({ length: maxBatidas }, (_, i) => horas[i] || ''),
      d.trabalhadoMin ? minutosParaDia(d.trabalhadoMin) : null,
      d.previstoMin ? minutosParaDia(d.previstoMin) : null,
      d.atrasoMin || null,
      d.saldoMin || null,
      d.situacao === 'Atraso' ? `Atraso ${d.atrasoMin} min` : d.situacao,
      obs,
    ];
    const base = 2 + maxBatidas;
    row.getCell(base + 1).numFmt = '[h]:mm';
    row.getCell(base + 2).numFmt = '[h]:mm';
    row.eachCell({ includeEmpty: true }, (cel: any, col: number) => {
      if (col > titulos.length) return;
      cel.border = bordas;
      if (d.situacao === 'Falta') cel.font = { color: { argb: 'FFBE1E2D' } };
      else if (['Folga', 'Futuro', 'Fora do período'].includes(d.situacao)) cel.font = { color: { argb: 'FF999999' } };
    });
    linha += 1;
  });

  // Totais
  const base = 2 + maxBatidas;
  const totais = ws.getRow(linha);
  totais.getCell(1).value = 'TOTAL DO MÊS';
  totais.getCell(base + 1).value = minutosParaDia(r.trabalhadoMin);
  totais.getCell(base + 1).numFmt = '[h]:mm';
  totais.getCell(base + 3).value = r.minutosAtraso;
  totais.getCell(base + 4).value = r.saldoMin;
  totais.eachCell((cel: any) => {
    cel.font = { bold: true };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FUNDO_CAB } };
    cel.border = bordas;
  });
  linha += 2;
  [
    `Dias previstos: ${r.diasPrevistos} · Dias com batida: ${r.diasTrabalhados} · Faltas: ${r.faltas} · Justificados: ${r.justificados} · Incompletos: ${r.incompletos}`,
    `Atrasos acima da tolerância: ${r.atrasos} (${r.minutosAtraso} min)${r.atrasos > LIMITE_ATRASOS_MES ? ' — mais de 3 no mês: o Regulamento Interno prevê advertência' : ''}`,
    `Horas trabalhadas: ${formatarMinutos(r.trabalhadoMin)} · Saldo: ${formatarMinutos(r.saldoMin, true)}`,
    '* batida incluída por ajuste do Departamento Pessoal (motivo e autor na aba "Batidas").',
  ].forEach((t) => {
    ws.mergeCells(linha, 1, linha, titulos.length);
    ws.getCell(linha, 1).value = t;
    ws.getCell(linha, 1).font = { size: 9, color: { argb: 'FF555555' } };
    linha += 1;
  });
  [12, 6, ...titulosBatidas.map(() => 10), 11, 10, 11, 10, 18, 40].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  // Aba de batidas (trilha)
  const abaBatidas = wb.addWorksheet('Batidas', { views: [{ state: 'frozen', ySplit: 6 }] });
  const tit2 = ['Data', 'Hora', 'Origem', 'Base mais próxima', 'Distância (m)', 'Ajuste: motivo', 'Ajuste: incluído por', 'Anulada', 'Anulação: motivo', 'Anulada por'];
  let l2 = cabecalho(abaBatidas, logo, `BATIDAS — ${nomeMes(mes).toUpperCase()}`, [`Colaborador(a): ${c.nomeCompleto}`], tit2.length);
  linhaCabecalhoTabela(abaBatidas, l2, tit2);
  l2 += 1;
  [...todasBatidas]
    .sort((a, b) => a.registradoEm.localeCompare(b.registradoEm))
    .forEach((b) => {
      const row = abaBatidas.getRow(l2);
      row.values = [
        dataBr(dataLocal(b.registradoEm)),
        horaLocal(b.registradoEm),
        b.origem === 'ajuste' ? 'Ajuste do DP' : 'Celular',
        b.localNome || (b.origem === 'celular' && b.latitude === undefined ? 'Sem localização' : ''),
        b.distanciaM !== undefined ? Math.round(b.distanciaM) : null,
        b.motivo || '',
        b.criadoPor || '',
        b.anulado ? 'Sim' : '',
        b.anuladoMotivo || '',
        b.anuladoPor || '',
      ];
      row.eachCell({ includeEmpty: true }, (cel: any, col: number) => {
        if (col > tit2.length) return;
        cel.border = bordas;
        if (b.anulado) cel.font = { color: { argb: 'FF999999' }, strike: true };
      });
      l2 += 1;
    });
  [12, 8, 13, 22, 12, 34, 20, 9, 30, 20].forEach((w, i) => (abaBatidas.getColumn(i + 1).width = w));

  rodape(wb, `Espelho ${nomeMes(mes)} — ${c.nomeCompleto}`);
  return paraArquivo(wb, `Espelho_${mes}_${nomeSeguro(c.nomeCompleto)}.xlsx`);
}

// ---------------------------------------------------------------------------
// Resumo do mês (todos)
// ---------------------------------------------------------------------------
export interface LinhaResumo {
  colaborador: ColaboradorRelatorio;
  jornada?: JornadaPonto;
  resumo: ResumoFrequencia;
}

const TITULOS_RESUMO = ['Colaborador', 'Cargo', 'Jornada', 'Previstos', 'Com batida', 'Faltas', 'Justificados', 'Atrasos', 'Atraso (min)', 'Incompletos', 'Trabalhado', 'Saldo (min)', 'Alerta'];

export async function gerarResumoXlsx(mes: string, linhas: LinhaResumo[]): Promise<File> {
  const { wb, logo } = await novaPlanilha();
  const ws = wb.addWorksheet('Resumo do mês', { views: [{ state: 'frozen', ySplit: 6 }] });
  let linha = cabecalho(ws, logo, `RESUMO DE FREQUÊNCIA — ${nomeMes(mes).toUpperCase()}`, [`${linhas.length} colaborador(es) · ${EMPRESA_REGULAMENTO.razaoSocial}`], TITULOS_RESUMO.length);
  linhaCabecalhoTabela(ws, linha, TITULOS_RESUMO);
  const primeira = linha + 1;
  linha += 1;
  linhas.forEach(({ colaborador: c, jornada, resumo: r }) => {
    const row = ws.getRow(linha);
    row.values = [
      c.nomeCompleto,
      c.funcaoCargo || '',
      jornada?.nome || 'Sem jornada',
      r.diasPrevistos,
      r.diasTrabalhados,
      r.faltas,
      r.justificados,
      r.atrasos,
      r.minutosAtraso,
      r.incompletos,
      minutosParaDia(r.trabalhadoMin),
      r.saldoMin,
      r.atrasos > LIMITE_ATRASOS_MES ? 'Mais de 3 atrasos — advertência prevista' : r.faltas > 0 ? 'Faltas no mês' : '',
    ];
    row.getCell(11).numFmt = '[h]:mm';
    row.eachCell({ includeEmpty: true }, (cel: any, col: number) => {
      if (col > TITULOS_RESUMO.length) return;
      cel.border = bordas;
    });
    if (r.atrasos > LIMITE_ATRASOS_MES) row.getCell(8).font = { bold: true, color: { argb: 'FFBE1E2D' } };
    if (r.faltas) row.getCell(6).font = { bold: true, color: { argb: 'FFBE1E2D' } };
    linha += 1;
  });
  ws.autoFilter = { from: { row: primeira - 1, column: 1 }, to: { row: primeira - 1, column: TITULOS_RESUMO.length } };
  [34, 22, 30, 10, 11, 8, 12, 9, 12, 12, 12, 11, 34].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  rodape(wb, `Resumo de frequência ${nomeMes(mes)}`);
  return paraArquivo(wb, `Resumo_Frequencia_${mes}.xlsx`);
}

export function gerarResumoPdf(mes: string, linhas: LinhaResumo[]): File {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const MARGEM = 12;
  autoTable(doc, {
    startY: 30,
    margin: { left: MARGEM, right: MARGEM, top: 30, bottom: 16 },
    head: [TITULOS_RESUMO.filter((t) => t !== 'Atraso (min)')],
    body: linhas.map(({ colaborador: c, jornada, resumo: r }) => [
      c.nomeCompleto,
      c.funcaoCargo || '',
      jornada?.nome || 'Sem jornada',
      r.diasPrevistos,
      r.diasTrabalhados,
      r.faltas,
      r.justificados,
      `${r.atrasos}${r.minutosAtraso ? ` (${r.minutosAtraso} min)` : ''}`,
      r.incompletos,
      formatarMinutos(r.trabalhadoMin),
      formatarMinutos(r.saldoMin, true),
      r.atrasos > LIMITE_ATRASOS_MES ? 'Advertência prevista' : r.faltas > 0 ? 'Faltas' : '',
    ]),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.4, textColor: [40, 40, 40], lineColor: [225, 225, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [248, 240, 228], textColor: [17, 17, 17], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 250, 247] },
    columnStyles: { 0: { cellWidth: 52 }, 2: { cellWidth: 46 } },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const r = linhas[d.row.index].resumo;
      if ((d.column.index === 7 && r.atrasos > LIMITE_ATRASOS_MES) || (d.column.index === 5 && r.faltas > 0) || d.column.index === 11) {
        if (d.cell.raw) d.cell.styles.textColor = [190, 30, 45];
      }
    },
    didDrawPage: () => {
      const logoLargura = 30;
      doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 9, logoLargura, (logoLargura * 339) / 900, 'jmt-logo', 'FAST');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(17, 17, 17);
      doc.text('RESUMO DE FREQUÊNCIA', largura - MARGEM, 14, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(196, 130, 41);
      doc.text(`${nomeMes(mes)} · ${linhas.length} colaborador(es)`, largura - MARGEM, 19, { align: 'right' });
      doc.setFillColor(196, 130, 41);
      doc.rect(MARGEM, 23, largura - 2 * MARGEM, 0.5, 'F');
    },
  });
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${EMPRESA_REGULAMENTO.razaoSocial} — Controle interno de frequência, não substitui o registro oficial de ponto. Emitido em ${new Date().toLocaleDateString('pt-BR')}. Página ${p} de ${total}.`,
      largura / 2,
      altura - 7,
      { align: 'center' }
    );
  }
  return new File([doc.output('blob')], `Resumo_Frequencia_${mes}.pdf`, { type: 'application/pdf' });
}
