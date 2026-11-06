// Planilha padrão JMT para a empresa validar os custos extras (enviada por e-mail).
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { CampoPlanilha, ColunaModelo, CustoExtra, ModeloPlanilhaCusto } from '../../utils/custosExtrasApi';

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

// ---------------------------------------------------------------------------
// Planilha no formato do próprio cliente: o financeiro sobe um exemplo da planilha que a empresa
// usa, o sistema acha a linha de títulos e o que vai em cada coluna; na hora de gerar, abre a
// planilha do cliente e preenche as linhas abaixo dos títulos (mantendo o layout dele).
// ---------------------------------------------------------------------------
type ExcelFormula = { formula: string };
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Palpite do campo pelo título da coluna (o financeiro confere e ajusta). */
export function adivinharCampo(titulo: string): CampoPlanilha {
  const t = semAcento(titulo);
  if (!t) return 'nada';
  if (/(de acordo|aprova|aceite|valida|resposta|observ|\bobs\b)/.test(t)) return 'nada';
  if (/(ct-?e|conhecimento)/.test(t)) return 'cte';
  if (/(^nf|\bnf\b|nf-?e|nota)/.test(t)) return 'nf';
  if (/(data|\bdt\b|\bdia\b)/.test(t)) return 'data';
  if (/(valor|vlr|r\$|total)/.test(t)) return 'valor';
  if (/(destinat|recebedor|cliente final|consignat)/.test(t)) return 'destinatario';
  if (/(cidade|municipio|destino|local)/.test(t)) return 'cidade';
  if (/(descri|motivo|justific|detalhe|historico)/.test(t)) return 'descricao';
  if (/(tipo|ocorrencia|servico|natureza|custo|despesa|taxa)/.test(t)) return 'tipo';
  if (/(remetente|embarcador|empresa|cliente|tomador)/.test(t)) return 'cliente';
  if (/(referencia|protocolo|lote|envio)/.test(t)) return 'referencia';
  return 'nada';
}

export interface LeituraModelo {
  abas: string[];
  aba: string;
  linhaCabecalho: number;
  colunas: ColunaModelo[];
}

const textoCelula = (c: { text?: string }) => {
  try {
    return String(c.text ?? '').trim();
  } catch {
    return '';
  }
};

async function abrirPasta(buffer: ArrayBuffer) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw new Error('Não consegui abrir a planilha. Ela precisa estar no formato .xlsx (no Excel: Arquivo › Salvar como › Pasta de Trabalho do Excel).');
  }
  return wb;
}

/** Lê a planilha do cliente: abas, linha dos títulos (a que tem mais títulos nas primeiras 30) e o palpite de cada coluna.
 *  `aba`/`linha` forçam a leitura de outra aba ou linha. */
export async function lerModeloPlanilha(buffer: ArrayBuffer, aba?: string, linha?: number): Promise<LeituraModelo> {
  const wb = await abrirPasta(buffer);
  const abas = wb.worksheets.map((w) => w.name);
  const ws = (aba && wb.getWorksheet(aba)) || wb.worksheets.find((w) => w.state !== 'hidden') || wb.worksheets[0];
  if (!ws) throw new Error('A planilha não tem nenhuma aba.');
  let linhaCab = linha || 0;
  if (!linhaCab) {
    let melhor = 0;
    for (let r = 1; r <= Math.min(30, Math.max(ws.rowCount, 1)); r++) {
      // Conta títulos diferentes (célula mesclada conta uma vez só — evita pegar o título da planilha).
      const titulos = new Set<string>();
      ws.getRow(r).eachCell((c) => {
        if (c.isMerged && c.master !== c) return;
        const t = textoCelula(c);
        if (t && Number.isNaN(Number(t.replace(',', '.')))) titulos.add(t);
      });
      const n = titulos.size;
      if (n > melhor) {
        melhor = n;
        linhaCab = r;
      }
    }
    if (!linhaCab) linhaCab = 1;
  }
  const colunas: ColunaModelo[] = [];
  const row = ws.getRow(linhaCab);
  const ultima = Math.max(row.cellCount, ws.columnCount || 0);
  for (let c = 1; c <= ultima; c++) {
    const cel = row.getCell(c);
    const titulo = cel.isMerged && cel.master !== cel ? '' : textoCelula(cel);
    if (titulo) colunas.push({ coluna: c, titulo, campo: adivinharCampo(titulo) });
  }
  return { abas, aba: ws.name, linhaCabecalho: linhaCab, colunas };
}

export const letraColuna = (n: number) => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/** Gera a planilha no formato do cliente: preenche as linhas abaixo dos títulos (apagando os exemplos que estavam lá). */
export async function gerarPlanilhaPeloModelo(
  modelo: Pick<ModeloPlanilhaCusto, 'aba' | 'linhaCabecalho' | 'colunas'>,
  buffer: ArrayBuffer,
  empresa: string,
  itens: CustoExtra[],
  envioId: string
): Promise<File> {
  const wb = await abrirPasta(buffer);
  const ws = (modelo.aba && wb.getWorksheet(modelo.aba)) || wb.worksheets[0];
  if (!ws) throw new Error('A aba do modelo não existe mais na planilha.');
  const mapeadas = modelo.colunas.filter((c) => c.campo !== 'nada');
  if (!mapeadas.length) throw new Error('Nenhuma coluna do modelo está ligada a um campo — confira o modelo da planilha.');
  const todas = modelo.colunas.map((c) => c.coluna);
  const ultimaCol = Math.max(...todas, ws.columnCount || 0);
  const inicio = modelo.linhaCabecalho + 1;

  // Estilo de cada coluna: o da primeira linha abaixo dos títulos (se o cliente formatou).
  const estilos = new Map<number, string>();
  const linhaEstilo = ws.getRow(inicio);
  for (let c = 1; c <= ultimaCol; c++) {
    const st = linhaEstilo.getCell(c).style;
    if (st && Object.keys(st).length) estilos.set(c, JSON.stringify(st));
  }
  const alturaLinha = linhaEstilo.height;

  // Linhas de exemplo já preenchidas logo abaixo dos títulos (param na primeira linha vazia).
  let exemplos = 0;
  for (let r = inicio; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!todas.some((c) => textoCelula(row.getCell(c)))) break;
    exemplos++;
  }
  for (let k = 0; k < exemplos; k++) {
    const row = ws.getRow(inicio + k);
    todas.forEach((c) => {
      row.getCell(c).value = null;
    });
  }
  // Mais itens do que linhas de exemplo: abre espaço empurrando o que estiver embaixo (total, rodapé).
  const ocupadas = Math.max(exemplos, 1);
  const faltam = itens.length - ocupadas;
  if (faltam > 0 && ws.rowCount >= inicio + ocupadas) {
    ws.spliceRows(inicio + ocupadas, 0, ...Array.from({ length: faltam }, () => [] as unknown[]));
    // Fórmulas embaixo (ex.: TOTAL = SOMA(F4:F6)) passam a cobrir as linhas novas.
    const ultimaDados = inicio + itens.length - 1;
    for (let r = inicio + itens.length; r <= ws.rowCount; r++) {
      ws.getRow(r).eachCell((cel) => {
        const v = cel.value as { formula?: string; sharedFormula?: string; result?: unknown } | null;
        if (!v || typeof v !== 'object' || !v.formula) return;
        const formula = v.formula.replace(/(\$?[A-Z]{1,3}\$?)(\d+):(\$?[A-Z]{1,3}\$?)(\d+)/g, (m, c1, l1, c2, l2) =>
          +l1 >= modelo.linhaCabecalho && +l1 <= inicio && +l2 >= +l1 ? `${c1}${l1}:${c2}${Math.max(+l2 + faltam, ultimaDados)}` : m
        );
        cel.value = { formula } as ExcelFormula;
      });
    }
  }

  const dataExcel = (iso?: string) => (iso ? new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12)) : null);
  const numeroOuTexto = (v?: string) => (v && /^\d{1,15}$/.test(v) ? Number(v) : v || '');
  const valorDe = (x: CustoExtra, campo: CampoPlanilha): string | number | Date | null => {
    switch (campo) {
      case 'data':
        return dataExcel(x.dataOcorrencia);
      case 'nf':
        return numeroOuTexto(x.notaFiscal);
      case 'cte':
        return numeroOuTexto(x.numeroCte);
      case 'destinatario':
        return x.destinatario || '';
      case 'cidade':
        return x.cidade || '';
      case 'tipo':
        return x.tipo;
      case 'descricao':
        return x.descricao || '';
      case 'valor':
        return x.valor;
      case 'cliente':
        return empresa;
      case 'referencia':
        return envioId;
      default:
        return null;
    }
  };

  itens.forEach((x, k) => {
    const row = ws.getRow(inicio + k);
    if (alturaLinha) row.height = alturaLinha;
    estilos.forEach((st, c) => {
      row.getCell(c).style = JSON.parse(st);
    });
    mapeadas.forEach((m) => {
      const cel = row.getCell(m.coluna);
      cel.value = valorDe(x, m.campo);
      if (m.campo === 'data' && !/[dmy]/i.test(cel.numFmt || '')) cel.numFmt = 'dd/mm/yyyy';
      if (m.campo === 'valor' && (!cel.numFmt || cel.numFmt === 'General')) cel.numFmt = '#,##0.00';
    });
    row.commit();
  });

  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], nomeArquivoValidacao(empresa, envioId), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
