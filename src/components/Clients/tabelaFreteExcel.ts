import ExcelJS from 'exceljs';
import { Cliente, CustoExtraTarifa, FaixaTarifaCidade, TabelaPrecoFrete } from '../../types';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';

// Tabela de frete do cliente em Excel, no padrão JMT: as cidades agrupadas pela faixa de
// distância (o "raio" do tarifário — Capital e região, interior até 300 km...) e, dentro de
// cada faixa, em ordem de km. Uma aba por tarifário (Aéreo/padrão e Rodoviário, quando o
// cliente tem os dois) e uma aba própria para os custos extras e encargos.

const BRONZE = 'FFC48229';
const BRONZE_ESCURO = 'FF92611F';
const AREIA = 'FFF4EEE1';
const BRANCO = 'FFFFFFFF';
const CINZA = 'FF555555';
const BORDA: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
};
const MOEDA = '"R$" #,##0.00';
const COMO_COBRA: Record<string, string> = {
  'Valor fechado': 'Valor fechado por serviço',
  'Valor/KM': 'Por km rodado',
  'Serviço avulso': 'Por serviço avulso',
};

/** Faixa de km quando o tarifário não traz o "raio" escrito. */
function faixaPorKm(km?: number): string {
  if (km === undefined || km === null || Number.isNaN(km)) return 'Sem distância informada';
  if (km <= 50) return 'Até 50 km';
  if (km <= 100) return 'De 51 a 100 km';
  if (km <= 200) return 'De 101 a 200 km';
  if (km <= 300) return 'De 201 a 300 km';
  if (km <= 500) return 'De 301 a 500 km';
  return 'Acima de 500 km';
}

/** Agrupa por faixa (raio do tarifário ou, sem ele, faixa de km); faixas e cidades em ordem de km. */
export function agruparPorFaixa(tarifas: FaixaTarifaCidade[]): { faixa: string; cidades: FaixaTarifaCidade[] }[] {
  const temRaio = tarifas.some((t) => (t.raio || '').trim());
  const grupos = new Map<string, FaixaTarifaCidade[]>();
  tarifas.forEach((t) => {
    const faixa = temRaio ? (t.raio || '').trim() || 'Sem faixa informada' : faixaPorKm(t.distanciaKm);
    grupos.set(faixa, [...(grupos.get(faixa) || []), t]);
  });
  const km = (t: FaixaTarifaCidade) => (t.distanciaKm ?? Number.MAX_SAFE_INTEGER);
  return Array.from(grupos.entries())
    .map(([faixa, cidades]) => ({
      faixa,
      cidades: [...cidades].sort((a, b) => km(a) - km(b) || a.cidade.localeCompare(b.cidade)),
    }))
    .sort((a, b) => {
      const menor = (g: FaixaTarifaCidade[]) => Math.min(...g.map(km));
      return menor(a.cidades) - menor(b.cidades) || a.faixa.localeCompare(b.faixa);
    });
}

function cabecalho(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, titulo: string, cliente: Cliente) {
  const logo = workbook.addImage({ base64: JMT_LOGO_BASE64, extension: 'png' });
  sheet.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 45 } });
  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 18;
  sheet.mergeCells('C1:E1');
  const t = sheet.getCell('C1');
  t.value = titulo;
  t.font = { bold: true, size: 14, color: { argb: BRONZE_ESCURO }, name: 'Arial' };
  t.alignment = { vertical: 'middle' };
  sheet.mergeCells('C2:E2');
  const c = sheet.getCell('C2');
  c.value = cliente.nomeFantasia || cliente.razaoSocial;
  c.font = { bold: true, size: 11, color: { argb: 'FF111111' }, name: 'Arial' };
  sheet.mergeCells('C3:E3');
  const d = sheet.getCell('C3');
  d.value = `Gerada em ${new Date().toLocaleDateString('pt-BR')} — valores sujeitos ao contrato vigente`;
  d.font = { italic: true, size: 9, color: { argb: CINZA }, name: 'Arial' };
}

function linhaInfo(sheet: ExcelJS.Worksheet, linha: number, rotulo: string, valor: string | number, moeda = false) {
  const a = sheet.getCell(linha, 1);
  a.value = rotulo;
  a.font = { bold: true, size: 10, color: { argb: CINZA }, name: 'Arial' };
  sheet.mergeCells(linha, 2, linha, 3);
  const b = sheet.getCell(linha, 2);
  b.value = valor;
  b.font = { size: 10, name: 'Arial' };
  if (moeda && typeof valor === 'number') b.numFmt = MOEDA;
  b.alignment = { horizontal: 'left' };
}

function abaTarifario(workbook: ExcelJS.Workbook, nomeAba: string, titulo: string, tabela: TabelaPrecoFrete, cliente: Cliente, extras: CustoExtraTarifa[], nomeAbaExtras: string) {
  const sheet = workbook.addWorksheet(nomeAba, { views: [{ state: 'frozen', ySplit: 0 }], pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sheet.columns = [
    { key: 'cidade', width: 34 },
    { key: 'km', width: 10 },
    { key: 'ate10', width: 16 },
    { key: 'exc', width: 18 },
    { key: 'obs', width: 14 },
  ];
  cabecalho(workbook, sheet, titulo, cliente);

  let linha = 5;
  if (tabela.freteMinimo) linhaInfo(sheet, linha++, 'Frete mínimo', tabela.freteMinimo, true);
  if (tabela.taxaDescargaAjudante) linhaInfo(sheet, linha++, 'Descarga / ajudante', tabela.taxaDescargaAjudante, true);
  if (tabela.percentualGrisPedagio) linhaInfo(sheet, linha++, 'GRIS / pedágio', `${tabela.percentualGrisPedagio}%`);
  if (tabela.percentualAdValoremNF) linhaInfo(sheet, linha++, 'Ad valorem sobre a NF', `${tabela.percentualAdValoremNF}%`);
  if (tabela.condicaoPagamento) linhaInfo(sheet, linha++, 'Condição de pagamento', tabela.condicaoPagamento);
  linha += 1;
  if (extras.length) {
    sheet.mergeCells(linha, 1, linha, 5);
    const aviso = sheet.getCell(linha, 1);
    aviso.value = `Atenção: este cliente tem ${extras.length} custo(s) extra(s) / encargo(s), cobrados além do frete — veja a aba "${nomeAbaExtras}".`;
    aviso.font = { bold: true, size: 10, color: { argb: BRONZE_ESCURO }, name: 'Arial' };
    aviso.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AREIA } };
    aviso.border = BORDA;
    aviso.alignment = { vertical: 'middle', wrapText: true };
    sheet.getRow(linha).height = 20;
    linha += 2;
  }

  const tarifas = tabela.tarifasPorCidade || [];
  if (tarifas.length === 0) {
    // Sem tabela por cidade: tarifa única.
    linhaInfo(sheet, linha++, 'Tarifa base (até 10 kg)', tabela.valorBase || 0, true);
    linhaInfo(sheet, linha++, 'Kg excedente', tabela.valorKgExcedente || 0, true);
  }

  agruparPorFaixa(tarifas).forEach(({ faixa, cidades }) => {
    // Título da faixa
    sheet.mergeCells(linha, 1, linha, 5);
    const tf = sheet.getCell(linha, 1);
    tf.value = `${faixa.toUpperCase()}  —  ${cidades.length} cidade(s)`;
    tf.font = { bold: true, size: 11, color: { argb: BRANCO }, name: 'Arial' };
    tf.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRONZE_ESCURO } };
    tf.alignment = { vertical: 'middle' };
    sheet.getRow(linha).height = 20;
    linha += 1;
    // Cabeçalho das colunas
    ['Cidade', 'Km', 'Até 10 kg', 'Kg excedente', 'Prazo'].forEach((h, i) => {
      const cell = sheet.getCell(linha, i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: BRANCO }, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRONZE } };
      cell.border = BORDA;
      cell.alignment = { horizontal: i === 0 || i === 4 ? 'left' : 'right' };
    });
    linha += 1;
    cidades.forEach((t, idx) => {
      const valores = [t.cidade, t.distanciaKm ?? '', t.valorAte10Kg ?? 0, t.valorKgExcedente ?? 0, t.prazo || ''];
      valores.forEach((v, i) => {
        const cell = sheet.getCell(linha, i + 1);
        cell.value = v as any;
        cell.font = { size: 10, name: 'Arial', color: { argb: i === 4 ? CINZA : 'FF111111' } };
        cell.border = BORDA;
        if (i === 2 || i === 3) cell.numFmt = MOEDA;
        if (i === 1) cell.alignment = { horizontal: 'right' };
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AREIA } };
      });
      linha += 1;
    });
    linha += 1;
  });

  if (tabela.observacoesTarifa) {
    sheet.mergeCells(linha, 1, linha, 5);
    const o = sheet.getCell(linha, 1);
    o.value = `Observações: ${tabela.observacoesTarifa}`;
    o.font = { italic: true, size: 9, color: { argb: CINZA }, name: 'Arial' };
    o.alignment = { wrapText: true };
    sheet.getRow(linha).height = 30;
    linha += 2;
  }

  sheet.mergeCells(linha, 1, linha, 5);
  const r = sheet.getCell(linha, 1);
  r.value = STRATEGIC_GUIDELINES.assinatura;
  r.font = { bold: true, size: 9, color: { argb: BRONZE_ESCURO }, name: 'Arial' };
  r.alignment = { horizontal: 'center' };
}

/** Aba "Custos extras": mesma identidade das abas de tarifa (logo, cabeçalho, faixas bronze,
 *  linhas zebradas em areia, assinatura), itens separados por categoria. */
function abaCustosExtras(workbook: ExcelJS.Workbook, nomeAba: string, titulo: string, cliente: Cliente, extras: CustoExtraTarifa[]) {
  const sheet = workbook.addWorksheet(nomeAba, { pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sheet.columns = [{ width: 36 }, { width: 26 }, { width: 24 }, { width: 18 }];
  cabecalho(workbook, sheet, titulo, cliente);

  let linha = 5;
  sheet.mergeCells(linha, 1, linha, 4);
  const intro = sheet.getCell(linha, 1);
  intro.value = 'Valores cobrados além do frete, somente quando o serviço é utilizado.';
  intro.font = { italic: true, size: 10, color: { argb: CINZA }, name: 'Arial' };
  linha += 2;

  const categorias = new Map<string, CustoExtraTarifa[]>();
  extras.forEach((c) => {
    const cat = (c.categoria || 'Outros').trim() || 'Outros';
    categorias.set(cat, [...(categorias.get(cat) || []), c]);
  });

  categorias.forEach((itens, cat) => {
    sheet.mergeCells(linha, 1, linha, 4);
    const tc = sheet.getCell(linha, 1);
    tc.value = `${cat.toUpperCase()}  —  ${itens.length} item(ns)`;
    tc.font = { bold: true, size: 11, color: { argb: BRANCO }, name: 'Arial' };
    tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRONZE_ESCURO } };
    tc.alignment = { vertical: 'middle' };
    sheet.getRow(linha).height = 20;
    linha += 1;
    ['Item / descrição', 'Grupo / destinatário', 'Como é cobrado', 'Valor'].forEach((h, i) => {
      const cell = sheet.getCell(linha, i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: BRANCO }, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRONZE } };
      cell.border = BORDA;
      cell.alignment = { horizontal: i === 3 ? 'right' : 'left' };
    });
    linha += 1;
    itens.forEach((c, idx) => {
      const valores: (string | number)[] = [c.itemDescricao || c.categoria || '—', c.grupoDestinatario || 'Todos', COMO_COBRA[c.tipoCobranca] || c.tipoCobranca, c.valor || 0];
      valores.forEach((v, i) => {
        const cell = sheet.getCell(linha, i + 1);
        cell.value = v;
        cell.font = { size: 10, name: 'Arial', bold: i === 3, color: { argb: i === 3 ? BRONZE_ESCURO : 'FF111111' } };
        cell.border = BORDA;
        cell.alignment = { wrapText: true, vertical: 'middle', horizontal: i === 3 ? 'right' : 'left' };
        if (i === 3) cell.numFmt = c.tipoCobranca === 'Valor/KM' ? '"R$" #,##0.00" /km"' : MOEDA;
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AREIA } };
      });
      linha += 1;
    });
    linha += 1;
  });

  sheet.mergeCells(linha, 1, linha, 4);
  const rod = sheet.getCell(linha, 1);
  rod.value = STRATEGIC_GUIDELINES.assinatura;
  rod.font = { bold: true, size: 9, color: { argb: BRONZE_ESCURO }, name: 'Arial' };
  rod.alignment = { horizontal: 'center' };
}

/** Monta a planilha (separado do download para poder testar). */
export function montarTabelaFreteWorkbook(cliente: Cliente): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = STRATEGIC_GUIDELINES.empresa;
  workbook.created = new Date();
  const temRodoviario = !!cliente.tabelaFreteRodoviario;
  const extrasPadrao = cliente.tabelaFrete?.custosExtras || [];
  // Rodoviário com custos extras próprios ganha a aba dele; sem eles, valem os do cliente.
  const extrasRodProprios = cliente.tabelaFreteRodoviario?.custosExtras || [];
  const abaExtrasRod = extrasRodProprios.length ? 'Custos extras — Rodoviário' : 'Custos extras';
  abaTarifario(workbook, temRodoviario ? 'Aéreo' : 'Tabela de frete', temRodoviario ? 'Tabela de frete — Aéreo' : 'Tabela de frete', cliente.tabelaFrete, cliente, extrasPadrao, 'Custos extras');
  if (cliente.tabelaFreteRodoviario) {
    abaTarifario(workbook, 'Rodoviário', 'Tabela de frete — Rodoviário', cliente.tabelaFreteRodoviario, cliente, extrasRodProprios.length ? extrasRodProprios : extrasPadrao, abaExtrasRod);
  }
  if (extrasPadrao.length) abaCustosExtras(workbook, 'Custos extras', 'Custos extras e encargos', cliente, extrasPadrao);
  if (extrasRodProprios.length) abaCustosExtras(workbook, 'Custos extras — Rodoviário', 'Custos extras e encargos — Rodoviário', cliente, extrasRodProprios);
  return workbook;
}

/** Gera e baixa a tabela de frete do cliente (.xlsx). */
export async function baixarTabelaFreteExcel(cliente: Cliente): Promise<void> {
  const workbook = montarTabelaFreteWorkbook(cliente);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const nome = (cliente.nomeFantasia || cliente.razaoSocial || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tabela_de_frete_${nome}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
