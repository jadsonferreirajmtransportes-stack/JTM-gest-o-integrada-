// ============================================================================
// Relatório do Controle Financeiro (mesmo recorte da tela: empresa + período pela
// conclusão da entrega). Excel: Resumo, Mês a mês, Por empresa e CT-es. PDF: resumo,
// mês a mês e por empresa.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Cliente, FaturaAereo, LancamentoFaturamentoAereo } from '../../types';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { computeValorACobrar, findClienteById, mesDaFatura } from './faturamentoAereoUtils';
import { AliquotaTributo, aliquotaEm, tributosDoValor } from '../../utils/tributosApi';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [110, 110, 110];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const nomeMes = (m: string) => (m === 'sem-data' ? 'Sem data' : `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`);
export const dataReferencia = (l: LancamentoFaturamentoAereo) => l.dataConclusao || l.dataEmissao || '';

export interface FiltroRelatorio {
  setor: string; // ex.: 'Farma Aéreo'
  empresa?: string; // nome exibido, quando filtrado
  de?: string;
  ate?: string;
}

interface Grupo {
  cobrado: number;
  pago: number;
  ctes: number;
  pagos: number;
  faturas: Set<string>;
  imposto: number; // CBS/IBS contidos no faturado
}

interface Linha {
  l: LancamentoFaturamentoAereo;
  valor: number;
  imposto: number;
  pago: number;
  empresa: string;
  mes: string;
}

/** `faturasPeriodo`: as faturas do período (pelo mês da própria fatura) — são elas que contam
 *  na coluna "Faturas", não as faturas que só têm algum CT-e no período. */
function montar(lancamentos: LancamentoFaturamentoAereo[], clientes: Cliente[], faturasPeriodo: FaturaAereo[], mesUltimoCte: Map<string, string> = new Map(), aliquotas: AliquotaTributo[] = []) {
  const linhas: Linha[] = lancamentos.map((l) => {
    const c = findClienteById(clientes, l.clienteId, l.clienteNome);
    const valor = computeValorACobrar(l, c);
    return {
      l,
      valor,
      imposto: tributosDoValor(valor, aliquotaEm(aliquotas, l.dataEmissao || l.dataConclusao)).total,
      pago: l.confirmacaoPagamento ? l.valorRecebido || 0 : 0,
      empresa: c?.nomeFantasia || c?.razaoSocial || l.clienteNome || '—',
      mes: dataReferencia(l).slice(0, 7) || 'sem-data',
    };
  });
  const agrupar = (chave: (x: Linha) => string) => {
    const m = new Map<string, Grupo>();
    linhas.forEach((x) => {
      const k = chave(x);
      const g = m.get(k) || { cobrado: 0, pago: 0, ctes: 0, pagos: 0, faturas: new Set<string>(), imposto: 0 };
      g.cobrado += x.valor;
      g.imposto += x.imposto;
      g.pago += x.pago;
      g.ctes += 1;
      if (x.l.confirmacaoPagamento) g.pagos += 1;
      m.set(k, g);
    });
    return m;
  };
  const empresaDaFatura = (f: FaturaAereo) => {
    const c = findClienteById(clientes, f.clienteId, f.clienteNome);
    return c?.nomeFantasia || c?.razaoSocial || f.clienteNome || '—';
  };
  const contarFaturas = (m: Map<string, Grupo>, chave: (f: FaturaAereo) => string) => {
    faturasPeriodo.forEach((f) => {
      const k = chave(f);
      const g = m.get(k) || { cobrado: 0, pago: 0, ctes: 0, pagos: 0, faturas: new Set<string>(), imposto: 0 };
      g.faturas.add(f.id);
      m.set(k, g);
    });
    return m;
  };
  const porMes = Array.from(contarFaturas(agrupar((x) => x.mes), (f) => mesDaFatura(f, mesUltimoCte.get(f.id)) || 'sem-data').entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const porEmpresa = Array.from(contarFaturas(agrupar((x) => x.empresa), empresaDaFatura).entries()).sort((a, b) => b[1].cobrado - a[1].cobrado);
  const total = linhas.reduce(
    (s, x) => ({ cobrado: s.cobrado + x.valor, pago: s.pago + x.pago, ctes: s.ctes + 1, pagos: s.pagos + (x.l.confirmacaoPagamento ? 1 : 0), imposto: s.imposto + x.imposto }),
    { cobrado: 0, pago: 0, ctes: 0, pagos: 0, imposto: 0 }
  );
  const faturas = faturasPeriodo.length;
  return { linhas, porMes, porEmpresa, total, faturas };
}

const descricaoFiltro = (f: FiltroRelatorio) =>
  [f.setor, f.empresa || 'Todas as empresas', f.de || f.ate ? `Conclusão da entrega: ${f.de ? dataBr(f.de) : 'início'} a ${f.ate ? dataBr(f.ate) : 'hoje'}` : 'Todo o período'].join(' · ');
const nomeArquivo = (f: FiltroRelatorio, ext: string) =>
  `Relatorio_financeiro_${f.setor}_${f.de || 'inicio'}_${f.ate || 'hoje'}${f.empresa ? `_${f.empresa}` : ''}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 110) + `.${ext}`;

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------
export async function gerarRelatorioFinanceiroXlsx(
  lancamentos: LancamentoFaturamentoAereo[],
  faturas: FaturaAereo[],
  clientes: Cliente[],
  filtro: FiltroRelatorio,
  faturasPeriodo: FaturaAereo[] = faturas,
  mesUltimoCte: Map<string, string> = new Map(),
  aliquotas: AliquotaTributo[] = []
): Promise<File> {
  const r = montar(lancamentos, clientes, faturasPeriodo, mesUltimoCte, aliquotas);
  const comImposto = aliquotas.length > 0;
  const numeroFatura = new Map(faturas.map((f) => [f.id, f.numeroFatura]));
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA_REGULAMENTO.razaoSocial;
  const logoId = wb.addImage({ base64: JMT_LOGO_BASE64.split(',')[1], extension: 'png' });
  const borda = { style: 'thin' as const, color: { argb: 'FFDDDDDD' } };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const fmtMoeda = '"R$" #,##0.00';

  const aba = (nome: string, colunas: { titulo: string; largura: number; moeda?: boolean }[], linhas: (string | number | Date)[][], totais?: (string | number)[]) => {
    const ws = wb.addWorksheet(nome, { views: [{ state: 'frozen', ySplit: 5 }] });
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 56 } });
    ws.getRow(1).height = 24;
    ws.getRow(2).height = 24;
    const ult = Math.max(colunas.length, 4);
    ws.mergeCells(1, 3, 1, ult);
    ws.getCell(1, 3).value = `RELATÓRIO FINANCEIRO — ${nome.toUpperCase()}`;
    ws.getCell(1, 3).font = { bold: true, size: 13 };
    ws.mergeCells(2, 3, 2, ult);
    ws.getCell(2, 3).value = descricaoFiltro(filtro);
    ws.getCell(2, 3).font = { size: 9, color: { argb: 'FFC48229' } };
    for (let c = 1; c <= ult; c++) ws.getCell(3, c).border = { bottom: { style: 'medium', color: { argb: 'FFC48229' } } };
    ws.addRow([]);
    const cab = ws.addRow(colunas.map((c) => c.titulo));
    cab.eachCell((c: any) => {
      c.font = { bold: true, size: 10 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F0E4' } };
      c.border = bordas;
    });
    linhas.forEach((l) => {
      const row = ws.addRow(l);
      row.eachCell((c: any, i: number) => {
        c.border = bordas;
        if (colunas[i - 1]?.moeda) c.numFmt = fmtMoeda;
        if (c.value instanceof Date) c.numFmt = 'dd/mm/yyyy';
      });
    });
    if (totais) {
      const row = ws.addRow(totais);
      row.eachCell((c: any, i: number) => {
        c.font = { bold: true };
        c.border = bordas;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F0E4' } };
        if (colunas[i - 1]?.moeda) c.numFmt = fmtMoeda;
      });
    }
    colunas.forEach((c, i) => (ws.getColumn(i + 1).width = c.largura));
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: colunas.length } };
    return ws;
  };

  const colGrupo = (primeira: string) => [
    { titulo: primeira, largura: 28 },
    { titulo: 'Faturado', largura: 16, moeda: true },
    { titulo: 'Pago', largura: 16, moeda: true },
    { titulo: 'Em aberto', largura: 16, moeda: true },
    { titulo: 'CT-es', largura: 9 },
    { titulo: 'CT-es pagos', largura: 11 },
    { titulo: 'Faturas do período', largura: 12 },
    ...(comImposto
      ? [
          { titulo: 'CBS/IBS', largura: 14, moeda: true },
          { titulo: 'Líquido JMT', largura: 16, moeda: true },
        ]
      : []),
  ];
  const linhaGrupo = (nome: string, g: Grupo) => [
    nome,
    g.cobrado,
    g.pago,
    g.cobrado - g.pago,
    g.ctes,
    g.pagos,
    g.faturas.size,
    ...(comImposto ? [g.imposto, g.cobrado - g.imposto] : []),
  ];
  const totalGrupo = [
    'Total',
    r.total.cobrado,
    r.total.pago,
    r.total.cobrado - r.total.pago,
    r.total.ctes,
    r.total.pagos,
    r.faturas,
    ...(comImposto ? [r.total.imposto, r.total.cobrado - r.total.imposto] : []),
  ];

  // Resumo primeiro (primeira aba)
  const resumo = aba(
    'Resumo',
    [
      { titulo: 'Indicador', largura: 26 },
      { titulo: 'Valor', largura: 18 },
    ],
    [
      ['Total faturado', r.total.cobrado],
      ['Total pago', r.total.pago],
      ['Total em aberto', r.total.cobrado - r.total.pago],
      ['CT-es', r.total.ctes],
      ['CT-es pagos', r.total.pagos],
      ['CT-es em aberto', r.total.ctes - r.total.pagos],
      ['Faturas', r.faturas],
      ...(comImposto
        ? [
            ['CBS/IBS no faturado', r.total.imposto] as [string, number],
            ['Líquido JMT (faturado − CBS/IBS)', r.total.cobrado - r.total.imposto] as [string, number],
          ]
        : []),
    ]
  );
  [6, 7, 8, ...(comImposto ? [13, 14] : [])].forEach((row) => (resumo.getCell(row, 2).numFmt = fmtMoeda));
  aba('Mês a mês', colGrupo('Mês (conclusão da entrega)'), r.porMes.map(([m, g]) => linhaGrupo(nomeMes(m), g)), totalGrupo);
  aba('Por empresa', colGrupo('Empresa'), r.porEmpresa.map(([e, g]) => linhaGrupo(e, g)), totalGrupo);
  aba(
    'CT-es',
    [
      { titulo: 'Conclusão', largura: 12 },
      { titulo: 'Emissão', largura: 12 },
      { titulo: 'Empresa', largura: 24 },
      { titulo: 'CT-e', largura: 11 },
      { titulo: 'NF', largura: 12 },
      { titulo: 'Destinatário', largura: 30 },
      { titulo: 'Cidade', largura: 18 },
      { titulo: 'Peso (kg)', largura: 10 },
      { titulo: 'Valor a cobrar', largura: 15, moeda: true },
      ...(comImposto
        ? [
            { titulo: 'CBS/IBS', largura: 12, moeda: true },
            { titulo: 'Líquido JMT', largura: 15, moeda: true },
          ]
        : []),
      { titulo: 'Pago', largura: 7 },
      { titulo: 'Valor recebido', largura: 15, moeda: true },
      { titulo: 'Fatura', largura: 20 },
    ],
    [...r.linhas]
      .sort((a, b) => dataReferencia(a.l).localeCompare(dataReferencia(b.l)))
      .map((x) => [
        x.l.dataConclusao ? new Date(`${x.l.dataConclusao}T12:00:00`) : '',
        x.l.dataEmissao ? new Date(`${x.l.dataEmissao}T12:00:00`) : '',
        x.empresa,
        x.l.numeroCte || '',
        x.l.notaFiscal || '',
        x.l.destinatario || '',
        x.l.cidadeDestino || '',
        x.l.pesoKg ?? '',
        x.valor,
        ...(comImposto ? [x.imposto, x.valor - x.imposto] : []),
        x.l.confirmacaoPagamento ? 'Sim' : 'Não',
        x.pago || '',
        x.l.faturaId ? numeroFatura.get(x.l.faturaId) || '' : 'Sem fatura',
      ]),
    ['', '', 'Total', '', '', '', '', '', r.total.cobrado, ...(comImposto ? [r.total.imposto, r.total.cobrado - r.total.imposto] : []), '', r.total.pago, '']
  );

  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], nomeArquivo(filtro, 'xlsx'), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export function gerarRelatorioFinanceiroPdf(lancamentos: LancamentoFaturamentoAereo[], clientes: Cliente[], filtro: FiltroRelatorio, faturasPeriodo: FaturaAereo[] = [], mesUltimoCte: Map<string, string> = new Map(), aliquotas: AliquotaTributo[] = []): File {
  const r = montar(lancamentos, clientes, faturasPeriodo, mesUltimoCte, aliquotas);
  const comImposto = aliquotas.length > 0;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const M = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...TEXTO);
  doc.text('RELATÓRIO FINANCEIRO', M, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text(doc.splitTextToSize(descricaoFiltro(filtro), L - 2 * M) as string[], M, 37.5);

  // Cartões
  const cartoes: [string, string, [number, number, number]][] = [
    ['Faturado', moeda(r.total.cobrado), TEXTO],
    ['Pago', moeda(r.total.pago), [4, 120, 87]],
    ['Em aberto', moeda(r.total.cobrado - r.total.pago), [190, 18, 60]],
    ['CT-es / faturas', `${r.total.ctes} / ${r.faturas}`, TEXTO],
  ];
  const wc = (L - 2 * M - 9) / 4;
  cartoes.forEach(([rot, val, cor], i) => {
    const x = M + i * (wc + 3);
    doc.setFillColor(250, 246, 238);
    doc.rect(x, 44, wc, 15, 'F');
    doc.setFillColor(...BRONZE);
    doc.rect(x, 44, 0.9, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BRONZE);
    doc.text(rot.toUpperCase(), x + 3.5, 49);
    doc.setFontSize(11);
    doc.setTextColor(...cor);
    doc.text(val, x + 3.5, 55.5);
  });
  if (comImposto) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXTO);
    doc.text(
      `CBS/IBS contidos no faturado: ${moeda(r.total.imposto)}  ·  Líquido JMT: ${moeda(r.total.cobrado - r.total.imposto)}  (alíquota pela emissão do CT-e)`,
      M,
      64
    );
  }

  const tabela = (titulo: string, primeira: string, grupos: [string, Grupo][], startY: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXTO);
    doc.text(titulo, M, startY);
    autoTable(doc, {
      startY: startY + 2.5,
      margin: { left: M, right: M, top: 22, bottom: 16 },
      head: [[primeira, 'Faturado', 'Pago', 'Em aberto', 'CT-es', 'Pagos', 'Faturas do período', ...(comImposto ? ['CBS/IBS', 'Líquido JMT'] : [])]],
      body: grupos.map(([n, g]) => [
        n,
        moeda(g.cobrado),
        moeda(g.pago),
        moeda(g.cobrado - g.pago),
        g.ctes,
        g.pagos,
        g.faturas.size,
        ...(comImposto ? [moeda(g.imposto), moeda(g.cobrado - g.imposto)] : []),
      ]),
      foot: [
        [
          'Total',
          moeda(r.total.cobrado),
          moeda(r.total.pago),
          moeda(r.total.cobrado - r.total.pago),
          r.total.ctes,
          r.total.pagos,
          r.faturas,
          ...(comImposto ? [moeda(r.total.imposto), moeda(r.total.cobrado - r.total.imposto)] : []),
        ],
      ],
      theme: 'grid',
      styles: { fontSize: comImposto ? 7 : 8, cellPadding: 1.6, textColor: [51, 51, 51], lineColor: [225, 225, 225], lineWidth: 0.15 },
      headStyles: { fillColor: [248, 240, 228], textColor: TEXTO, fontStyle: 'bold' },
      footStyles: { fillColor: [248, 240, 228], textColor: TEXTO, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
    });
    return (doc as any).lastAutoTable.finalY + 9;
  };
  let y = tabela('Mês a mês (conclusão da entrega)', 'Mês', r.porMes.map(([m, g]) => [nomeMes(m), g] as [string, Grupo]), comImposto ? 74 : 68);
  if (y > A - 50) {
    doc.addPage();
    y = 30;
  }
  tabela('Por empresa', 'Empresa', r.porEmpresa, y);

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', M, 9, 34, (34 * 339) / 900, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRONZE);
    doc.text('CONTROLE FINANCEIRO', L - M, 14, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(M, 23, L - 2 * M, 0.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — gerado em ${new Date().toLocaleString('pt-BR')}`, M, A - 8);
    doc.text(`Página ${p} de ${total}`, L - M, A - 8, { align: 'right' });
  }
  return new File([doc.output('blob')], nomeArquivo(filtro, 'pdf'), { type: 'application/pdf' });
}
