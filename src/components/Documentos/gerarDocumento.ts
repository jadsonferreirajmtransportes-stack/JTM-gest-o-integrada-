// ============================================================================
// Saída do documento padronizado na identidade JMT — PDF (jsPDF + autotable),
// Word (docx) e Excel (exceljs). Mesmo conteúdo (blocos), mesma estrutura:
// cabeçalho com logo + código/versão, quadro de controle do documento
// (código, versão, data, responsável, aprovação, classificação), corpo e
// rodapé com dados da empresa e "Página X de Y".
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { BlocoDocumento, DocumentoPadronizado, SETORES_DOCUMENTO } from '../../utils/documentosPadronizadosApi';

const BRONZE: [number, number, number] = [196, 130, 41];
const BRONZE_HEX = 'C48229';
const BRONZE_ESCURO_HEX = '92611F';
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [51, 51, 51];
const CINZA: [number, number, number] = [120, 120, 120];
const FUNDO_CABECALHO: [number, number, number] = [248, 240, 228];

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const nomeSetor = (sigla: string) => SETORES_DOCUMENTO.find((s) => s.sigla === sigla)?.nome || sigla;
const nomeArquivo = (d: DocumentoPadronizado, ext: string) =>
  `${d.codigo}_v${d.versao}_${d.titulo}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 110) + `.${ext}`;

function quadroControle(d: DocumentoPadronizado): [string, string][] {
  return [
    ['Código', d.codigo || '(gerado ao salvar)'],
    ['Versão', String(d.versao)],
    ['Tipo', d.tipo],
    ['Setor', nomeSetor(d.setor)],
    ['Data', dataBr(d.dataDocumento)],
    ['Classificação', d.classificacao],
    ['Responsável', d.responsavel || '—'],
    ['Aprovado por', d.aprovadoPor || '—'],
  ];
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export function gerarPdfDocumento(d: DocumentoPadronizado): File {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const MARGEM = 20;
  const larguraTexto = largura - 2 * MARGEM;
  const TOPO = 32;
  const LIMITE = altura - 24;
  let y = TOPO;

  const novaPagina = () => {
    doc.addPage();
    y = TOPO;
  };
  const espaco = (mm: number) => {
    if (y + mm > LIMITE) novaPagina();
  };
  const texto = (t: string, tamanho: number, estilo: 'normal' | 'bold' | 'italic', cor: [number, number, number], recuo = 0, prefixo?: string) => {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    const larg = larguraTexto - recuo - (prefixo ? 6 : 0);
    const linhas = doc.splitTextToSize(t, larg) as string[];
    const h = tamanho * 0.46;
    linhas.forEach((l, i) => {
      espaco(h + 1);
      if (i === 0 && prefixo) doc.text(prefixo, MARGEM + recuo, y);
      doc.text(l, MARGEM + recuo + (prefixo ? 6 : 0), y);
      y += h;
    });
  };

  // Título e quadro de controle (1ª página)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...TEXTO);
  const titulo = doc.splitTextToSize(d.titulo.toUpperCase(), larguraTexto) as string[];
  doc.text(titulo, MARGEM, y + 2);
  y += titulo.length * 7.5 + 4;
  const controle = quadroControle(d);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEM, right: MARGEM, top: TOPO, bottom: 26 },
    body: [0, 2, 4, 6].map((i) => [controle[i][0], controle[i][1], controle[i + 1][0], controle[i + 1][1]]),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.8, textColor: CORPO, lineColor: [225, 225, 225], lineWidth: 0.15 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: FUNDO_CABECALHO, cellWidth: 28 }, 2: { fontStyle: 'bold', fillColor: FUNDO_CABECALHO, cellWidth: 28 } },
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  let numeroSecao = 0;
  for (const b of d.blocos) {
    if (b.tipo === 'titulo') {
      espaco(14);
      y += b.nivel === 1 ? 3 : 1;
      if (b.nivel === 1) {
        numeroSecao += 1;
        texto(`${numeroSecao}. ${b.texto.toUpperCase()}`, 12.5, 'bold', TEXTO);
        doc.setFillColor(...BRONZE);
        doc.rect(MARGEM, y - 2.2, 18, 0.7, 'F');
        y += 3;
      } else texto(b.texto, b.nivel === 2 ? 11 : 10, 'bold', b.nivel === 2 ? TEXTO : CORPO);
      y += 1.5;
    } else if (b.tipo === 'paragrafo') {
      texto(b.texto, 10, 'normal', CORPO);
      y += 2.8;
    } else if (b.tipo === 'destaque') {
      const inicioY = y - 4;
      const pagina = doc.getNumberOfPages();
      texto(b.texto, 10, 'italic', CORPO, 5);
      if (doc.getNumberOfPages() === pagina) {
        doc.setFillColor(...BRONZE);
        doc.rect(MARGEM, inicioY, 1, y - inicioY - 2, 'F');
      }
      y += 3;
    } else if (b.tipo === 'lista') {
      b.itens.forEach((item, i) => {
        texto(item, 10, 'normal', CORPO, 3, b.ordenada ? `${i + 1}.` : '•');
        y += 1;
      });
      y += 2;
    } else if (b.tipo === 'tabela') {
      autoTable(doc, {
        startY: y,
        margin: { left: MARGEM, right: MARGEM, top: TOPO, bottom: 26 },
        head: [b.cabecalho],
        body: b.linhas,
        theme: 'grid',
        styles: { fontSize: b.cabecalho.length > 6 ? 7 : 8.5, cellPadding: 1.6, textColor: CORPO, lineColor: [225, 225, 225], lineWidth: 0.15 },
        headStyles: { fillColor: FUNDO_CABECALHO, textColor: TEXTO, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [252, 250, 247] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // Cabeçalho e rodapé em todas as páginas
  const total = doc.getNumberOfPages();
  const logoLargura = 32;
  const logoAltura = (logoLargura * 339) / 900;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 10, logoLargura, logoAltura, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXTO);
    doc.text(`${d.codigo || 'RASCUNHO'} · Versão ${d.versao}`, largura - MARGEM, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRONZE);
    const tituloCurto = d.titulo.length > 70 ? `${d.titulo.slice(0, 68)}…` : d.titulo;
    doc.text(tituloCurto, largura - MARGEM, 19.5, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, 10 + logoAltura + 2.5, larguraTexto, 0.5, 'F');

    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(MARGEM, altura - 17, largura - MARGEM, altura - 17);
    doc.setFontSize(6.8);
    doc.setTextColor(...CINZA);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} — ${EMPRESA_REGULAMENTO.cidadeUF}`, MARGEM, altura - 12.5);
    doc.text(
      d.status === 'Vigente' ? `${d.classificacao} · Documento controlado — cópia impressa não é controlada` : `${d.classificacao} · ${d.status.toUpperCase()} — não usar como versão oficial`,
      MARGEM,
      altura - 9
    );
    doc.text(`Página ${p} de ${total}`, largura - MARGEM, altura - 12.5, { align: 'right' });
  }
  return new File([doc.output('blob')], nomeArquivo(d, 'pdf'), { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------
// Word
// ---------------------------------------------------------------------------
function base64ParaBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function gerarDocxDocumento(d: DocumentoPadronizado): Promise<File> {
  const docx = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Header,
    Footer,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
    AlignmentType,
    BorderStyle,
    PageNumber,
    TabStopType,
    LevelFormat,
  } = docx;
  const FONTE = 'Arial';
  const borda = { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const celula = (t: string, cabecalho = false, largura?: number) =>
    new TableCell({
      borders: bordas,
      width: largura ? { size: largura, type: WidthType.PERCENTAGE } : undefined,
      shading: cabecalho ? { fill: 'F8F0E4', type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: cabecalho, font: FONTE, size: 18, color: cabecalho ? '111111' : '333333' })] })],
    });

  const controle = quadroControle(d);
  const filhos: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: d.titulo.toUpperCase(), bold: true, size: 34, font: FONTE, color: '111111' })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [0, 2, 4, 6].map(
        (i) => new TableRow({ children: [celula(controle[i][0], true, 18), celula(controle[i][1], false, 32), celula(controle[i + 1][0], true, 18), celula(controle[i + 1][1], false, 32)] })
      ),
    }),
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];

  let numeroSecao = 0;
  let instanciaLista = 0;
  for (const b of d.blocos) {
    if (b.tipo === 'titulo') {
      if (b.nivel === 1) numeroSecao += 1;
      filhos.push(
        new Paragraph({
          spacing: { before: b.nivel === 1 ? 320 : 220, after: 120 },
          border: b.nivel === 1 ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRONZE_HEX, space: 4 } } : undefined,
          children: [
            new TextRun({
              text: b.nivel === 1 ? `${numeroSecao}. ${b.texto.toUpperCase()}` : b.texto,
              bold: true,
              font: FONTE,
              size: b.nivel === 1 ? 26 : b.nivel === 2 ? 23 : 21,
              color: b.nivel === 3 ? '333333' : '111111',
            }),
          ],
        })
      );
    } else if (b.tipo === 'paragrafo') {
      filhos.push(new Paragraph({ spacing: { after: 140, line: 300 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: b.texto, font: FONTE, size: 21, color: '333333' })] }));
    } else if (b.tipo === 'destaque') {
      filhos.push(
        new Paragraph({
          spacing: { before: 120, after: 160 },
          indent: { left: 240 },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: BRONZE_HEX, space: 10 } },
          shading: { fill: 'FBF6EE', type: ShadingType.CLEAR, color: 'auto' },
          children: [new TextRun({ text: b.texto, italics: true, font: FONTE, size: 21, color: '333333' })],
        })
      );
    } else if (b.tipo === 'lista') {
      instanciaLista += 1;
      b.itens.forEach((item) =>
        filhos.push(
          new Paragraph({
            numbering: { reference: b.ordenada ? 'jmt-numerada' : 'jmt-marcadores', level: 0, instance: instanciaLista },
            spacing: { after: 60 },
            children: [new TextRun({ text: item, font: FONTE, size: 21, color: '333333' })],
          })
        )
      );
      filhos.push(new Paragraph({ text: '', spacing: { after: 80 } }));
    } else if (b.tipo === 'tabela') {
      filhos.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: b.cabecalho.map((c) => celula(c, true)) }),
            ...b.linhas.map((l) => new TableRow({ children: l.map((c) => celula(c)) })),
          ],
        })
      );
      filhos.push(new Paragraph({ text: '', spacing: { after: 160 } }));
    }
  }

  const logo = base64ParaBytes(JMT_LOGO_BASE64);
  const documento = new Document({
    creator: EMPRESA_REGULAMENTO.razaoSocial,
    title: d.titulo,
    numbering: {
      config: [
        { reference: 'jmt-marcadores', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 260 } } } }] },
        { reference: 'jmt-numerada', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1500, bottom: 1300, left: 1134, right: 1134 } } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRONZE_HEX, space: 6 } },
                children: [
                  new ImageRun({ type: 'png', data: logo, transformation: { width: 130, height: 49 } }),
                  new TextRun({ text: `\t${d.codigo || 'RASCUNHO'} · Versão ${d.versao}`, bold: true, font: FONTE, size: 16, color: '111111' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 } },
                children: [
                  new TextRun({ text: `${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, font: FONTE, size: 14, color: '787878' }),
                  new TextRun({ children: ['\tPágina ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], font: FONTE, size: 14, color: '787878' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: d.status === 'Vigente' ? `${d.classificacao} · Documento controlado — cópia impressa não é controlada` : `${d.classificacao} · ${d.status.toUpperCase()} — não usar como versão oficial`,
                    font: FONTE,
                    size: 14,
                    color: BRONZE_ESCURO_HEX,
                  }),
                ],
              }),
            ],
          }),
        },
        children: filhos,
      },
    ],
  });
  const blob = await Packer.toBlob(documento);
  return new File([blob], nomeArquivo(d, 'docx'), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// ---------------------------------------------------------------------------
// Excel — cada tabela vira uma aba; o texto (se houver) vai numa aba "Documento".
// ---------------------------------------------------------------------------
export async function gerarXlsxDocumento(d: DocumentoPadronizado): Promise<File> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA_REGULAMENTO.razaoSocial;
  const logoId = wb.addImage({ base64: JMT_LOGO_BASE64.split(',')[1], extension: 'png' });
  const bronze = { argb: `FF${BRONZE_HEX}` };
  const fundoCab = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF8F0E4' } };
  const bordaFina = { style: 'thin' as const, color: { argb: 'FFDDDDDD' } };

  const cabecalhoAba = (ws: any, subtitulo: string, colunas: number) => {
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 56 } });
    ws.getRow(1).height = 24;
    ws.getRow(2).height = 24;
    const ultima = Math.max(colunas, 3);
    ws.mergeCells(1, 3, 1, ultima);
    ws.getCell(1, 3).value = d.titulo.toUpperCase();
    ws.getCell(1, 3).font = { bold: true, size: 13, color: { argb: 'FF111111' } };
    ws.getCell(1, 3).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.mergeCells(2, 3, 2, ultima);
    ws.getCell(2, 3).value = `${d.codigo || 'RASCUNHO'} · Versão ${d.versao} · ${dataBr(d.dataDocumento)} · ${subtitulo}`;
    ws.getCell(2, 3).font = { size: 9, color: bronze };
    ws.getCell(2, 3).alignment = { horizontal: 'right', vertical: 'middle' };
    for (let c = 1; c <= ultima; c++) ws.getCell(3, c).border = { bottom: { style: 'medium', color: bronze } };
    ws.addRow([]);
  };

  const tabelas = d.blocos.filter((b): b is Extract<BlocoDocumento, { tipo: 'tabela' }> => b.tipo === 'tabela');
  const textos = d.blocos.filter((b) => b.tipo !== 'tabela');
  const nomes = new Set<string>();
  const nomeAba = (base: string) => {
    let n = base.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Tabela';
    let k = 2;
    while (nomes.has(n)) n = `${n.slice(0, 25)} ${k++}`;
    nomes.add(n);
    return n;
  };

  if (textos.length > 0 || tabelas.length === 0) {
    const ws = wb.addWorksheet(nomeAba('Documento'));
    ws.getColumn(1).width = 110;
    cabecalhoAba(ws, 'Texto', 3);
    quadroControle(d).forEach(([k, v]) => {
      const r = ws.addRow([`${k}: ${v}`]);
      r.getCell(1).font = { size: 9, color: { argb: 'FF555555' } };
    });
    ws.addRow([]);
    textos.forEach((b) => {
      if (b.tipo === 'titulo') {
        const r = ws.addRow([b.texto]);
        r.getCell(1).font = { bold: true, size: b.nivel === 1 ? 13 : 11, color: { argb: 'FF111111' } };
      } else if (b.tipo === 'lista') b.itens.forEach((it, i) => ws.addRow([`${b.ordenada ? `${i + 1}.` : '•'} ${it}`]).getCell(1).alignment = { wrapText: true });
      else if (b.tipo === 'paragrafo' || b.tipo === 'destaque') ws.addRow([b.texto]).getCell(1).alignment = { wrapText: true, vertical: 'top' };
    });
  }
  tabelas.forEach((t, i) => {
    // Nome da aba = título logo antes da tabela, quando houver.
    const idx = d.blocos.indexOf(t);
    const anterior = d.blocos.slice(0, idx).reverse().find((b) => b.tipo === 'titulo') as Extract<BlocoDocumento, { tipo: 'titulo' }> | undefined;
    const ws = wb.addWorksheet(nomeAba(anterior?.texto || `Tabela ${i + 1}`), { views: [{ state: 'frozen', ySplit: 5 }] });
    cabecalhoAba(ws, anterior?.texto || `Tabela ${i + 1}`, t.cabecalho.length);
    const cab = ws.addRow(t.cabecalho);
    cab.eachCell((c: any) => {
      c.font = { bold: true, color: { argb: 'FF111111' } };
      c.fill = fundoCab;
      c.border = { top: bordaFina, bottom: { style: 'medium', color: bronze }, left: bordaFina, right: bordaFina };
      c.alignment = { vertical: 'middle', wrapText: true };
    });
    t.linhas.forEach((l, k) => {
      const linha = ws.addRow(l.map((v) => (/^-?\d{1,12}(?:,\d+)?$/.test(v) && !/^0\d/.test(v) ? Number(v.replace(',', '.')) : v)));
      linha.eachCell({ includeEmpty: true }, (c: any) => {
        c.border = { top: bordaFina, bottom: bordaFina, left: bordaFina, right: bordaFina };
        if (k % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFAF7' } };
        c.alignment = { vertical: 'top', wrapText: true };
      });
    });
    t.cabecalho.forEach((c, j) => {
      const maior = Math.max(c.length, ...t.linhas.map((l) => (l[j] || '').length));
      ws.getColumn(j + 1).width = Math.min(60, Math.max(10, maior + 2));
    });
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: t.cabecalho.length } };
  });


  wb.eachSheet((ws: any) => {
    ws.headerFooter.oddFooter = `&L&8${EMPRESA_REGULAMENTO.razaoSocial} — ${d.codigo || 'RASCUNHO'} v${d.versao}&R&8Página &P de &N`;
    ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  });
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], nomeArquivo(d, 'xlsx'), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
