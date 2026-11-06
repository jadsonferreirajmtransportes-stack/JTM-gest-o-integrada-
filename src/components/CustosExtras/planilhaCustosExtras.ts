// Planilha padrão JMT para a empresa validar os custos extras (enviada por e-mail).
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { CustoExtra } from '../../utils/custosExtrasApi';

const BRONZE = 'FFC48229';
const BRONZE_ESCURO = 'FF92611F';
const BRANCO = 'FFFFFFFF';
const PRETO = 'FF111111';
const CINZA = 'FF666666';
const AREIA = 'FFFAF6EE';
const borda = { top: { style: 'thin' as const, color: { argb: 'FFBFBFBF' } }, bottom: { style: 'thin' as const, color: { argb: 'FFBFBFBF' } }, left: { style: 'thin' as const, color: { argb: 'FFBFBFBF' } }, right: { style: 'thin' as const, color: { argb: 'FFBFBFBF' } } };
const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

export const nomeArquivoValidacao = (empresa: string, envioId: string) =>
  `Validacao_Custos_Extras_${empresa.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40)}_${envioId}.xlsx`;

export async function gerarPlanilhaValidacao(empresa: string, itens: CustoExtra[], envioId: string): Promise<File> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA_REGULAMENTO.razaoSocial;
  const ws = wb.addWorksheet('Custos extras', { views: [{ showGridLines: false }] });
  const colunas = [
    { t: 'DATA', w: 12 },
    { t: 'NF', w: 14 },
    { t: 'CT-E', w: 14 },
    { t: 'DESTINATÁRIO', w: 32 },
    { t: 'CIDADE', w: 18 },
    { t: 'TIPO', w: 24 },
    { t: 'DESCRIÇÃO', w: 34 },
    { t: 'VALOR (R$)', w: 14 },
    { t: 'DE ACORDO? (S/N)', w: 16 },
    { t: 'OBSERVAÇÃO DO CLIENTE', w: 32 },
  ];
  ws.columns = colunas.map((c) => ({ width: c.w }));

  const logo = wb.addImage({ base64: JMT_LOGO_BASE64.split(',')[1], extension: 'png' });
  ws.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 56 } });
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 24;

  const linhaTexto = (linha: number, texto: string, opcoes: { negrito?: boolean; tamanho?: number; cor?: string } = {}) => {
    ws.mergeCells(linha, 3, linha, colunas.length);
    const c = ws.getRow(linha).getCell(3);
    c.value = texto;
    c.font = { name: 'Arial', bold: !!opcoes.negrito, size: opcoes.tamanho || 10, color: { argb: opcoes.cor || PRETO } };
  };
  linhaTexto(1, 'VALIDAÇÃO DE CUSTOS EXTRAS', { negrito: true, tamanho: 14, cor: BRONZE_ESCURO });
  linhaTexto(2, `Empresa: ${empresa}`, { negrito: true, tamanho: 11 });
  linhaTexto(3, `Referência: ${envioId} · Emitida em ${new Date().toLocaleDateString('pt-BR')}`, { cor: CINZA });
  linhaTexto(4, 'Por favor, preencha a coluna "De acordo?" com S ou N (e a observação, se recusar) e responda este e-mail com a planilha.', { cor: CINZA });

  const cab = ws.getRow(6);
  colunas.forEach((c, i) => {
    const cel = cab.getCell(i + 1);
    cel.value = c.t;
    cel.font = { name: 'Arial', bold: true, size: 10, color: { argb: BRANCO } };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i >= 8 ? BRONZE_ESCURO : BRONZE } };
    cel.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cel.border = borda;
  });
  cab.height = 28;

  itens.forEach((x, k) => {
    const r = ws.getRow(7 + k);
    const valores = [dataBr(x.dataOcorrencia), x.notaFiscal || '', x.numeroCte || '', x.destinatario || '', x.cidade || '', x.tipo, x.descricao || '', x.valor, '', ''];
    valores.forEach((v, i) => {
      const cel = r.getCell(i + 1);
      cel.value = v;
      cel.font = { name: 'Arial', size: 10, color: { argb: PRETO } };
      cel.border = borda;
      cel.alignment = { vertical: 'middle', wrapText: i === 6 || i === 3 };
      if (i === 7) cel.numFmt = '#,##0.00';
      if (i >= 8) cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AREIA } };
    });
  });

  const lt = 7 + itens.length;
  ws.mergeCells(lt, 1, lt, 7);
  const rot = ws.getRow(lt).getCell(1);
  rot.value = 'TOTAL';
  rot.font = { name: 'Arial', bold: true, size: 11, color: { argb: BRONZE_ESCURO } };
  rot.alignment = { horizontal: 'right' };
  const tot = ws.getRow(lt).getCell(8);
  tot.value = itens.reduce((s, x) => s + x.valor, 0);
  tot.numFmt = '#,##0.00';
  tot.font = { name: 'Arial', bold: true, size: 11, color: { argb: BRONZE_ESCURO } };

  const rod = ws.getRow(lt + 2).getCell(1);
  rod.value = `${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} — ${EMPRESA_REGULAMENTO.cidadeUF}`;
  rod.font = { name: 'Arial', bold: true, size: 9, color: { argb: BRONZE_ESCURO } };

  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], nomeArquivoValidacao(empresa, envioId), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
