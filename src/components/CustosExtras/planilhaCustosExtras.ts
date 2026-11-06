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
// usa e o sistema entende um dos dois jeitos:
// - "tabela": uma linha de títulos e um custo por linha abaixo dela;
// - "ficha": um formulário (rótulo à esquerda, valor à direita, ex.: "Data | 28/10/2026") —
//   sai uma folha por custo, copiando o formulário do cliente.
// Na hora de gerar, abre a planilha do cliente e preenche (mantendo o layout dele).
// ---------------------------------------------------------------------------
type ExcelFormula = { formula: string };
type Pasta = Awaited<ReturnType<typeof abrirPasta>>;
type Folha = Pasta['worksheets'][number];
export type LayoutModelo = 'tabela' | 'ficha';
/** Custo com dados extras do CT-e que algumas planilhas pedem. */
export type CustoParaPlanilha = CustoExtra & { volumes?: number };

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Palpite do campo pelo título/rótulo (o financeiro confere e ajusta). */
export function adivinharCampo(titulo: string): CampoPlanilha {
  const t = semAcento(titulo).replace(/:$/, '').trim();
  if (!t) return 'nada';
  if (/(de acordo|aprova|aceite|valida|resposta|observ|\bobs\b|veiculo|ajudante|paletiza|abertura|quantidade|placa|motorista)/.test(t)) return 'nada';
  if (/(ct-?e|conhecimento)/.test(t)) return 'cte';
  if (/(^nf|\bnf\b|nf-?e|nota)/.test(t)) return 'nf';
  if (/(data|\bdt\b|\bdia\b)/.test(t)) return 'data';
  if (/(volume|\bvol\b)/.test(t)) return 'volumes';
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
  layout: LayoutModelo;
  linhaCabecalho: number;
  colunas: ColunaModelo[];
}

/** Modelo salvo é "ficha" quando os campos guardam a linha de cada rótulo. */
export const layoutDoModelo = (m: Pick<ModeloPlanilhaCusto, 'colunas'>): LayoutModelo => (m.colunas.some((c) => c.linha) ? 'ficha' : 'tabela');

const textoCelula = (c: { text?: string }) => {
  try {
    return String(c.text ?? '').trim();
  } catch {
    return '';
  }
};
const ehTexto = (t: string) => !!t && Number.isNaN(Number(t.replace(/\./g, '').replace(',', '.')));

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

/** Linha com mais títulos diferentes nas primeiras 30 (célula mesclada conta uma vez só). */
function melhorLinhaTitulos(ws: Folha): { linha: number; qtd: number } {
  let melhor = { linha: 1, qtd: 0 };
  for (let r = 1; r <= Math.min(30, Math.max(ws.rowCount, 1)); r++) {
    const titulos = new Set<string>();
    ws.getRow(r).eachCell((c) => {
      if (c.isMerged && c.master !== c) return;
      const t = textoCelula(c);
      if (ehTexto(t)) titulos.add(t);
    });
    if (titulos.size > melhor.qtd) melhor = { linha: r, qtd: titulos.size };
  }
  return melhor;
}

/** Campos de uma ficha: em cada linha, o 1º texto é o rótulo e a célula logo à direita dele
 *  (depois da mesclagem do rótulo) é onde vai o valor. Linhas sem célula à direita (título,
 *  "1º") ficam de fora. */
function camposDaFicha(ws: Folha): ColunaModelo[] {
  const campos: ColunaModelo[] = [];
  const ultimaCol = Math.max(ws.columnCount || 0, 2);
  for (let r = 1; r <= Math.min(80, ws.rowCount); r++) {
    const row = ws.getRow(r);
    let rotulo: { col: number; texto: string; master: unknown } | null = null;
    for (let c = 1; c <= ultimaCol; c++) {
      const cel = row.getCell(c);
      if (cel.isMerged && cel.master !== cel) continue;
      const t = textoCelula(cel);
      if (t) {
        rotulo = ehTexto(t) ? { col: c, texto: t, master: cel } : null;
        break;
      }
    }
    if (!rotulo || /^\d+\s*[ºª°]$/.test(rotulo.texto)) continue;
    let colValor = 0;
    for (let c = rotulo.col + 1; c <= ultimaCol; c++) {
      const cel = row.getCell(c);
      if (cel.isMerged && cel.master === rotulo.master) continue;
      colValor = Number((cel.isMerged ? cel.master : cel).col);
      break;
    }
    if (!colValor) continue;
    campos.push({ coluna: colValor, linha: r, titulo: rotulo.texto.replace(/\s*:\s*$/, ''), campo: adivinharCampo(rotulo.texto) });
  }
  return campos;
}

/** Lê a planilha do cliente e decide se é tabela ou ficha (dá para forçar `layout`, `aba` e `linha`). */
export async function lerModeloPlanilha(buffer: ArrayBuffer, aba?: string, linha?: number, layout?: LayoutModelo): Promise<LeituraModelo> {
  const wb = await abrirPasta(buffer);
  const abas = wb.worksheets.map((w) => w.name);
  const ws = (aba && wb.getWorksheet(aba)) || wb.worksheets.find((w) => w.state !== 'hidden') || wb.worksheets[0];
  if (!ws) throw new Error('A planilha não tem nenhuma aba.');
  const titulos = melhorLinhaTitulos(ws);
  const ficha = camposDaFicha(ws);
  const tipo: LayoutModelo = layout || (ficha.length >= 4 && titulos.qtd < 4 ? 'ficha' : 'tabela');
  if (tipo === 'ficha') return { abas, aba: ws.name, layout: 'ficha', linhaCabecalho: 0, colunas: ficha };

  const linhaCab = linha || titulos.linha;
  const colunas: ColunaModelo[] = [];
  const row = ws.getRow(linhaCab);
  const ultima = Math.max(row.cellCount, ws.columnCount || 0);
  for (let c = 1; c <= ultima; c++) {
    const cel = row.getCell(c);
    const titulo = cel.isMerged && cel.master !== cel ? '' : textoCelula(cel);
    if (titulo) colunas.push({ coluna: c, titulo, campo: adivinharCampo(titulo) });
  }
  return { abas, aba: ws.name, layout: 'tabela', linhaCabecalho: linhaCab, colunas };
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

const dataExcel = (iso?: string) => (iso ? new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12)) : null);
const numeroOuTexto = (v?: string) => (v && /^\d{1,15}$/.test(v) ? Number(v) : v || '');
function valorDoCampo(x: CustoParaPlanilha, campo: CampoPlanilha, empresa: string, envioId: string): string | number | Date | null {
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
      return x.descricao || x.tipo;
    case 'valor':
      return x.valor;
    case 'volumes':
      return x.volumes ?? '';
    case 'cliente':
      return empresa;
    case 'referencia':
      return envioId;
    default:
      return null;
  }
}
function escreverCampo(ws: Folha, linha: number, m: ColunaModelo, valor: string | number | Date | null) {
  const cel = ws.getRow(linha).getCell(m.coluna);
  // O Excel/exceljs pode compartilhar o mesmo estilo entre células: copia antes de mexer no formato.
  cel.style = JSON.parse(JSON.stringify(cel.style || {}));
  cel.value = valor;
  if (m.campo === 'data' && !/[dmy]/i.test(cel.numFmt || '')) cel.numFmt = 'dd/mm/yyyy';
  if (m.campo === 'valor' && (!cel.numFmt || cel.numFmt === 'General')) cel.numFmt = '#,##0.00';
}

/** Copia uma folha (valores, estilos, mesclagens, larguras, alturas e imagens) para uma folha nova. */
function copiarFolha(wb: Pasta, origem: Folha, nome: string): Folha {
  const nova = wb.addWorksheet(nome, { views: origem.views, pageSetup: origem.pageSetup, properties: origem.properties });
  origem.columns?.forEach((col, i) => {
    if (col?.width) nova.getColumn(i + 1).width = col.width;
  });
  origem.eachRow({ includeEmpty: true }, (row, r) => {
    const destino = nova.getRow(r);
    if (row.height) destino.height = row.height;
    row.eachCell({ includeEmpty: true }, (cel, c) => {
      const d = destino.getCell(c);
      if (!(cel.isMerged && cel.master !== cel)) d.value = cel.value;
      d.style = JSON.parse(JSON.stringify(cel.style || {}));
    });
  });
  const merges: string[] = ((origem.model as unknown as { merges?: string[] }).merges) || [];
  merges.forEach((intervalo) => {
    try {
      nova.mergeCells(intervalo);
    } catch {
      /* mesclagem repetida */
    }
  });
  try {
    origem.getImages().forEach((img) => nova.addImage(Number(img.imageId), img.range as never));
  } catch {
    /* imagem que o exceljs não consegue copiar fica de fora */
  }
  return nova;
}

/** Gera a planilha no formato do cliente.
 *  Tabela: preenche as linhas abaixo dos títulos (apagando os exemplos). Ficha: uma folha por custo. */
export async function gerarPlanilhaPeloModelo(
  modelo: Pick<ModeloPlanilhaCusto, 'aba' | 'linhaCabecalho' | 'colunas'>,
  buffer: ArrayBuffer,
  empresa: string,
  itens: CustoParaPlanilha[],
  envioId: string
): Promise<File> {
  const wb = await abrirPasta(buffer);
  const ws = (modelo.aba && wb.getWorksheet(modelo.aba)) || wb.worksheets[0];
  if (!ws) throw new Error('A aba do modelo não existe mais na planilha.');
  const mapeadas = modelo.colunas.filter((c) => c.campo !== 'nada');
  if (!mapeadas.length) throw new Error('Nenhum campo do modelo está ligado a um dado — confira o formato da planilha.');

  if (layoutDoModelo(modelo) === 'ficha') {
    // As outras abas do arquivo do cliente (exemplos antigos) saem; fica uma ficha por custo.
    wb.worksheets.filter((w) => w.id !== ws.id).forEach((w) => wb.removeWorksheet(w.id));
    const base = ws.name;
    const folhas = [ws, ...itens.slice(1).map((_, k) => copiarFolha(wb, ws, `${base} ${k + 2}`.slice(0, 31)))];
    if (itens.length > 1) ws.name = `${base} 1`.slice(0, 31);
    itens.forEach((x, k) => {
      const folha = folhas[k];
      // Campos sem dado ficam em branco (apaga o exemplo); numeração "1º" no topo acompanha.
      modelo.colunas.forEach((m) => {
        if (m.linha) escreverCampo(folha, m.linha, m, m.campo === 'nada' ? null : valorDoCampo(x, m.campo, empresa, envioId));
      });
      for (let r = 1; r <= Math.min(5, folha.rowCount); r++) {
        folha.getRow(r).eachCell((cel) => {
          if (/^\d+\s*[ºª°]$/.test(textoCelula(cel))) cel.value = `${k + 1}º`;
        });
      }
    });
    const buf = await wb.xlsx.writeBuffer();
    return new File([buf], nomeArquivoValidacao(empresa, envioId), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

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
        const v = cel.value as { formula?: string } | null;
        if (!v || typeof v !== 'object' || !v.formula) return;
        const formula = v.formula.replace(/(\$?[A-Z]{1,3}\$?)(\d+):(\$?[A-Z]{1,3}\$?)(\d+)/g, (m, c1, l1, c2, l2) =>
          +l1 >= modelo.linhaCabecalho && +l1 <= inicio && +l2 >= +l1 ? `${c1}${l1}:${c2}${Math.max(+l2 + faltam, ultimaDados)}` : m
        );
        cel.value = { formula } as ExcelFormula;
      });
    }
  }

  itens.forEach((x, k) => {
    const row = ws.getRow(inicio + k);
    if (alturaLinha) row.height = alturaLinha;
    estilos.forEach((st, c) => {
      row.getCell(c).style = JSON.parse(st);
    });
    mapeadas.forEach((m) => escreverCampo(ws, inicio + k, m, valorDoCampo(x, m.campo, empresa, envioId)));
    row.commit();
  });

  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], nomeArquivoValidacao(empresa, envioId), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
