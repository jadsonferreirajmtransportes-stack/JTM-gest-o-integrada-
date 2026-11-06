// Formulário padrão JMT de autorização de custo extra (enviado por e-mail para a empresa validar).
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

/** Uma nota (CT-e) do custo, com os dados do Controle Financeiro, para a tabela do formulário. */
export interface NotaDoFormulario {
  cte?: string;
  nf?: string;
  destinatario?: string;
  volumes?: number;
  pesoKg?: number;
  valorNF?: number;
}
type CustoDoFormulario = CustoExtra & { remetente?: string; uf?: string; notasDetalhe?: NotaDoFormulario[] };

const AMARELO = 'FFFFF2B3';
const VERMELHO = 'FFC00000';
const MOEDA = '"R$" #,##0.00';
const LINHAS_CUSTO = ['DEDICADO', 'REDESPACHO', 'TDE', 'AJUDANTE', 'DESCARGA', 'OUTROS'] as const;

/** Em qual linha do "Detalhamento do custo" o valor entra, pelo tipo. */
function linhaDoTipo(tipo: string): (typeof LINHAS_CUSTO)[number] {
  const t = tipo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/\btde\b/.test(t)) return 'TDE';
  if (/dedicado/.test(t)) return 'DEDICADO';
  if (/redespacho/.test(t)) return 'REDESPACHO';
  if (/ajudante/.test(t)) return 'AJUDANTE';
  if (/descarga/.test(t)) return 'DESCARGA';
  return 'OUTROS';
}

/** Formulário padrão JMT de autorização de custo extra: um por custo (uma aba cada), no modelo
 *  que os clientes já usam — total em destaque, detalhamento por tipo, detalhes, trajeto,
 *  veículo, remetente/destinatário e a tabela de CT-e/NF. Com mais de um custo, a 1ª aba é um
 *  resumo para a empresa marcar "De acordo?" em cada um. */
export async function gerarPlanilhaValidacao(empresa: string, itens: CustoDoFormulario[], envioId: string): Promise<File> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA_REGULAMENTO.razaoSocial;
  const logo = wb.addImage({ base64: JMT_LOGO_BASE64.split(',')[1], extension: 'png' });
  type Folha = ReturnType<typeof wb.addWorksheet>;

  const fonte = (negrito = false, tamanho = 10, cor = PRETO) => ({ name: 'Arial', bold: negrito, size: tamanho, color: { argb: cor } });
  const preencher = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

  if (itens.length > 1) resumo(wb.addWorksheet('Resumo', { views: [{ showGridLines: false }] }));
  itens.forEach((x, k) => {
    const nf = (x.notaFiscal || '').split(/[\s/,]+/).filter(Boolean)[0];
    const nome = itens.length > 1 ? `Custo ${k + 1}${nf ? ` - NF ${nf}` : ''}` : 'Formulário';
    formulario(wb.addWorksheet(nome.slice(0, 31), { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 } }), x, k);
  });

  function cabecalho(ws: Folha, titulo: string, ultimaCol: number) {
    ws.addImage(logo, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 56 } });
    ws.getRow(1).height = 22;
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 14;
    const pres = ws.getCell(1, ultimaCol - 1);
    pres.value = 'Prestador:';
    pres.font = fonte(true, 10);
    pres.alignment = { horizontal: 'right' };
    const nomePres = ws.getCell(1, ultimaCol);
    nomePres.value = EMPRESA_REGULAMENTO.razaoSocial;
    nomePres.font = fonte(true, 10, BRONZE_ESCURO);
    const cnpj = ws.getCell(2, ultimaCol);
    cnpj.value = `CNPJ ${EMPRESA_REGULAMENTO.cnpj}`;
    cnpj.font = fonte(false, 9, CINZA);
    ws.mergeCells(4, 1, 4, ultimaCol);
    const t = ws.getCell(4, 1);
    t.value = titulo;
    t.font = fonte(true, 16, BRONZE_ESCURO);
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(4).height = 28;
    ws.mergeCells(5, 1, 5, ultimaCol);
    const s = ws.getCell(5, 1);
    s.value = `Cliente: ${empresa} · Referência: ${envioId} · Emitido em ${new Date().toLocaleDateString('pt-BR')}`;
    s.font = fonte(false, 9, CINZA);
    s.alignment = { horizontal: 'center' };
  }

  function formulario(ws: Folha, x: CustoDoFormulario, k: number) {
    ws.columns = [{ width: 36 }, { width: 24 }, { width: 22 }, { width: 14 }, { width: 24 }];
    cabecalho(ws, 'FORMULÁRIO PARA AUTORIZAÇÃO DE CUSTO EXTRA', 5);
    let r = 7;
    const rotulo = (linha: number, texto: string, cor = PRETO) => {
      const c = ws.getCell(linha, 1);
      c.value = texto;
      c.font = fonte(true, 10, cor);
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    };
    const valor = (linha: number, col: number, v: string | number | Date | null, opcoes: { moeda?: boolean; data?: boolean; negrito?: boolean; aPreencher?: boolean; ate?: number } = {}) => {
      if (opcoes.ate && opcoes.ate > col) ws.mergeCells(linha, col, linha, opcoes.ate);
      const c = ws.getCell(linha, col);
      c.value = v;
      c.font = fonte(!!opcoes.negrito, 10);
      c.border = borda;
      c.alignment = { vertical: 'middle', wrapText: true };
      if (opcoes.moeda) c.numFmt = MOEDA;
      if (opcoes.data) c.numFmt = 'dd/mm/yyyy';
      if (opcoes.aPreencher) c.fill = preencher(AREIA);
    };

    // Total em destaque
    rotulo(r, 'TOTAL CUSTO DA OPERAÇÃO:');
    ws.getCell(r, 1).font = fonte(true, 13);
    valor(r, 2, x.valor, { moeda: true, negrito: true });
    ws.getCell(r, 2).font = fonte(true, 13);
    ws.getCell(r, 2).fill = preencher('FFFFE066');
    ws.getRow(r).height = 22;
    r += 2;
    rotulo(r, 'DATA:');
    valor(r, 2, x.dataOcorrencia ? new Date(Date.UTC(+x.dataOcorrencia.slice(0, 4), +x.dataOcorrencia.slice(5, 7) - 1, +x.dataOcorrencia.slice(8, 10), 12)) : null, { data: true });
    ws.getCell(r, 4).value = 'Nº';
    ws.getCell(r, 4).font = fonte(true, 10);
    ws.getCell(r, 4).alignment = { horizontal: 'right' };
    valor(r, 5, `${envioId}${itens.length > 1 ? `-${k + 1}` : ''}`);
    r += 1;
    rotulo(r, 'NEGOCIAÇÃO EM TABELA?');
    valor(r, 2, /tabela do cliente|tarif/i.test(`${x.descricao || ''} ${x.tipo}`) ? 'SIM' : '', { aPreencher: true });
    r += 1;
    rotulo(r, 'CIDADE DENTRO DA ROTA ACORDADA?');
    valor(r, 2, '', { aPreencher: true });
    r += 2;

    // Detalhamento do custo
    const cab = (linha: number, col: number, texto: string, ate?: number) => {
      if (ate && ate > col) ws.mergeCells(linha, col, linha, ate);
      const c = ws.getCell(linha, col);
      c.value = texto;
      c.font = fonte(true, 10, BRANCO);
      c.fill = preencher(BRONZE);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = borda;
    };
    cab(r, 1, 'DETALHAMENTO DO CUSTO');
    cab(r, 2, 'VALOR');
    r += 1;
    const linhaCusto = linhaDoTipo(x.tipo);
    const primeira = r;
    LINHAS_CUSTO.forEach((nome) => {
      const c = ws.getCell(r, 1);
      c.value = nome === 'OUTROS' && linhaCusto === 'OUTROS' ? `OUTROS — ${x.tipo}` : nome;
      c.font = fonte(nome === linhaCusto, 10);
      c.border = borda;
      valor(r, 2, nome === linhaCusto ? x.valor : null, { moeda: true, negrito: nome === linhaCusto });
      r += 1;
    });
    const tot = ws.getCell(r, 1);
    tot.value = 'TOTAL';
    tot.font = fonte(true, 10, BRONZE_ESCURO);
    tot.alignment = { horizontal: 'right' };
    valor(r, 2, { formula: `SUM(B${primeira}:B${r - 1})`, result: x.valor } as never, { moeda: true, negrito: true });
    r += 2;

    // Detalhes
    ws.mergeCells(r, 1, r, 5);
    const aviso = ws.getCell(r, 1);
    aviso.value = 'DETALHES DO CUSTO SOLICITADO (o que aconteceu, quando e por quê):';
    aviso.font = fonte(true, 9, VERMELHO);
    r += 1;
    ws.mergeCells(r, 1, r + 2, 5);
    const det = ws.getCell(r, 1);
    det.value = [x.tipo, x.descricao].filter(Boolean).join(' — ');
    det.font = fonte(false, 10);
    det.alignment = { vertical: 'top', wrapText: true };
    det.border = borda;
    r += 4;

    // Trajeto, carga e veículo (o que o sistema não sabe fica para preencher)
    cab(r, 2, 'KM IDA');
    cab(r, 3, 'KM VOLTA');
    r += 1;
    rotulo(r, 'TRAJETO — EM KM:');
    valor(r, 2, '', { aPreencher: true });
    valor(r, 3, '', { aPreencher: true });
    r += 2;
    rotulo(r, 'TIPO DE CARGA:');
    valor(r, 2, '', { aPreencher: true, ate: 3 });
    r += 2;
    cab(r, 1, 'TIPO DE VEÍCULO');
    cab(r, 2, 'MOTORISTA', 3);
    cab(r, 4, 'PLACA', 5);
    r += 1;
    valor(r, 1, '', { aPreencher: true });
    valor(r, 2, '', { aPreencher: true, ate: 3 });
    valor(r, 4, '', { aPreencher: true, ate: 5 });
    r += 2;

    // Remetente / destino
    rotulo(r, 'REMETENTE:');
    valor(r, 2, x.remetente || '', { ate: 5 });
    r += 1;
    rotulo(r, 'DESTINATÁRIO:');
    valor(r, 2, x.destinatario || '', { ate: 5 });
    r += 1;
    rotulo(r, 'CIDADE DE DESTINO:');
    valor(r, 2, [x.cidade, x.uf].filter(Boolean).join(' - '), { ate: 5 });
    r += 2;

    // Notas
    ['CT-E', 'NF', 'VOLUMES', 'PESO (KG)', 'VALOR DA NOTA FISCAL'].forEach((t, i) => cab(r, i + 1, t));
    r += 1;
    const notas: NotaDoFormulario[] = x.notasDetalhe?.length ? x.notasDetalhe : [{ cte: x.numeroCte, nf: x.notaFiscal }];
    notas.forEach((n) => {
      valor(r, 1, n.cte || '');
      valor(r, 2, n.nf || '');
      valor(r, 3, n.volumes ?? '');
      valor(r, 4, n.pesoKg ?? '');
      valor(r, 5, n.valorNF ?? '', { moeda: n.valorNF !== undefined });
      [1, 2, 3, 4].forEach((c) => (ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle' }));
      if (n.pesoKg !== undefined) ws.getCell(r, 4).numFmt = '#,##0.00';
      r += 1;
    });
    r += 1;

    // Aprovação do cliente
    ws.mergeCells(r, 1, r, 5);
    const ap = ws.getCell(r, 1);
    ap.value = 'APROVAÇÃO DO CLIENTE';
    ap.font = fonte(true, 11, BRANCO);
    ap.fill = preencher(BRONZE_ESCURO);
    ap.alignment = { horizontal: 'center' };
    r += 1;
    rotulo(r, 'DE ACORDO? (S/N):');
    valor(r, 2, '', { aPreencher: true });
    ws.getCell(r, 2).fill = preencher(AMARELO);
    r += 1;
    rotulo(r, 'APROVADOR (NOME):');
    valor(r, 2, '', { aPreencher: true, ate: 5 });
    r += 1;
    rotulo(r, 'OBSERVAÇÃO:');
    valor(r, 2, '', { aPreencher: true, ate: 5 });
    ws.getRow(r).height = 30;
    r += 2;
    ws.mergeCells(r, 1, r, 5);
    const rod = ws.getCell(r, 1);
    rod.value = `${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} — ${EMPRESA_REGULAMENTO.cidadeUF}. Responda o e-mail com este formulário preenchido.`;
    rod.font = fonte(false, 8, CINZA);
    rod.alignment = { horizontal: 'center', wrapText: true };
  }

  /** Resumo na vertical (como o formulário da UNICARGO): rótulos na coluna A e um custo por coluna. */
  function resumo(ws: Folha) {
    const n = itens.length;
    const ultima = n + 1;
    ws.columns = [{ width: 34 }, ...itens.map(() => ({ width: 30 }))];
    cabecalho(ws, 'RESUMO DOS CUSTOS EXTRAS PARA AUTORIZAÇÃO', Math.max(ultima, 3));

    // Total geral em destaque
    const rt = ws.getCell(7, 1);
    rt.value = 'TOTAL DOS CUSTOS:';
    rt.font = fonte(true, 13);
    rt.alignment = { horizontal: 'right', vertical: 'middle' };
    const vt = ws.getCell(7, 2);
    vt.value = itens.reduce((s, x) => s + x.valor, 0);
    vt.numFmt = MOEDA;
    vt.font = fonte(true, 13);
    vt.fill = preencher('FFFFE066');
    vt.border = borda;
    ws.getRow(7).height = 22;

    const linhas: [string, (x: CustoDoFormulario) => string | number | Date | null, { moeda?: boolean; data?: boolean; preencher?: boolean; alto?: boolean }?][] = [
      ['DATA:', (x) => (x.dataOcorrencia ? new Date(Date.UTC(+x.dataOcorrencia.slice(0, 4), +x.dataOcorrencia.slice(5, 7) - 1, +x.dataOcorrencia.slice(8, 10), 12)) : null), { data: true }],
      ['Nº DO CT-E:', (x) => x.numeroCte || ''],
      ['Nº DA NOTA FISCAL:', (x) => x.notaFiscal || ''],
      ['DESTINATÁRIO:', (x) => x.destinatario || ''],
      ['CIDADE:', (x) => x.cidade || ''],
      ['UF:', (x) => x.uf || ''],
      ['TIPO DO CUSTO:', (x) => x.tipo],
      ['MOTIVO / DETALHES:', (x) => x.descricao || '', { alto: true }],
      ['VALOR:', (x) => x.valor, { moeda: true }],
      ['DE ACORDO? (S/N):', () => '', { preencher: true }],
      ['OBSERVAÇÃO DO CLIENTE:', () => '', { preencher: true, alto: true }],
    ];

    // Cabeçalho das colunas: Custo 1, Custo 2...
    let r = 9;
    const vazio = ws.getCell(r, 1);
    vazio.border = borda;
    itens.forEach((_, k) => {
      const c = ws.getCell(r, k + 2);
      c.value = `CUSTO ${k + 1}`;
      c.font = fonte(true, 10, BRANCO);
      c.fill = preencher(BRONZE);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = borda;
    });
    ws.getRow(r).height = 20;
    r += 1;
    linhas.forEach(([rotulo, valor, op = {}]) => {
      const l = ws.getCell(r, 1);
      l.value = rotulo;
      l.font = fonte(true, 10, rotulo.startsWith('DE ACORDO') || rotulo.startsWith('OBSERV') ? BRONZE_ESCURO : PRETO);
      l.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      l.border = borda;
      itens.forEach((x, k) => {
        const c = ws.getCell(r, k + 2);
        c.value = valor(x);
        c.font = fonte(rotulo === 'VALOR:', 10);
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = borda;
        if (op.moeda) c.numFmt = MOEDA;
        if (op.data) c.numFmt = 'dd/mm/yyyy';
        if (op.preencher) c.fill = preencher(rotulo.startsWith('DE ACORDO') ? AMARELO : AREIA);
      });
      if (op.alto) ws.getRow(r).height = 45;
      r += 1;
    });
    r += 1;
    ws.mergeCells(r, 1, r, Math.max(ultima, 3));
    const obs = ws.getCell(r, 1);
    obs.value = 'Cada custo tem o seu formulário completo nas abas seguintes. Responda o e-mail com a planilha preenchida.';
    obs.font = fonte(false, 9, CINZA);
  }

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
export type CustoParaPlanilha = CustoExtra & { volumes?: number; uf?: string; remetente?: string; notasDetalhe?: NotaDoFormulario[] };

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Palpite do campo pelo título/rótulo (o financeiro confere e ajusta). */
export function adivinharCampo(titulo: string): CampoPlanilha {
  const t = semAcento(titulo).replace(/:$/, '').trim();
  // Rótulo comprido é texto de instrução/rodapé, não campo.
  if (!t || t.length > 50) return 'nada';
  if (/(de acordo|aprova|aceite|valida|resposta|observ|\bobs\b|veiculo|ajudante|paletiza|abertura|quantidade|placa|motorista|representante|sigla)/.test(t)) return 'nada';
  if (/^uf$|\buf\b|^estado/.test(t)) return 'uf';
  if (/(remetente|embarcador|laboratorio)/.test(t)) return 'remetente';
  if (/(descri|motivo|justific|detalhe|historico)/.test(t)) return 'descricao';
  if (/(ct-?e|conhecimento)/.test(t)) return 'cte';
  if (/(^nf|\bnf\b|nf-?e|nota)/.test(t)) return 'nf';
  if (/(data|\bdt\b|\bdia\b)/.test(t)) return 'data';
  if (/(volume|\bvol\b)/.test(t)) return 'volumes';
  if (/(valor|vlr|r\$|total)/.test(t)) return 'valor';
  if (/(destinat|recebedor|cliente final|consignat)/.test(t)) return 'destinatario';
  if (/(cidade|municipio|destino|local)/.test(t)) return 'cidade';
  if (/(tipo|ocorrencia|servico|natureza|\bcusto\b|despesa|taxa)/.test(t)) return 'tipo';
  if (/(empresa|cliente|tomador)/.test(t)) return 'cliente';
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
    // Numeração ("1º") e textos longos de instrução/rodapé não são campos — nunca mexer neles.
    if (!rotulo || /^\d+\s*[ºª°]$/.test(rotulo.texto) || rotulo.texto.length > 60) continue;
    let colValor = 0;
    for (let c = rotulo.col + 1; c <= ultimaCol; c++) {
      const cel = row.getCell(c);
      if (cel.isMerged && cel.master === rotulo.master) continue;
      colValor = Number((cel.isMerged ? cel.master : cel).col);
      break;
    }
    if (!colValor) continue;
    const operacao = /^opera[cç][aã]o\b/i.test(rotulo.texto);
    campos.push({
      coluna: colValor,
      linha: r,
      colunaRotulo: rotulo.col,
      titulo: rotulo.texto.replace(/\s*:\s*$/, ''),
      campo: operacao ? 'destinatario' : adivinharCampo(rotulo.texto),
      noRotulo: operacao || undefined,
    });
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
function valorDoCampo(x: CustoParaPlanilha, campo: CampoPlanilha, empresa: string, envioId: string, texto?: string): string | number | Date | null {
  switch (campo) {
    case 'texto':
      return texto || '';
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
    case 'uf':
      return x.uf || '';
    case 'remetente':
      return x.remetente || '';
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
  const cel = ws.getRow(linha).getCell(m.noRotulo && m.colunaRotulo ? m.colunaRotulo : m.coluna);
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
        if (!m.linha) return;
        // "No lugar do rótulo" sem dado: deixa o rótulo como está.
        if (m.noRotulo && m.campo === 'nada') return;
        escreverCampo(folha, m.linha, m, m.campo === 'nada' ? null : valorDoCampo(x, m.campo, empresa, envioId, m.texto));
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
    mapeadas.forEach((m) => escreverCampo(ws, inicio + k, { ...m, noRotulo: false }, valorDoCampo(x, m.campo, empresa, envioId, m.texto)));
    row.commit();
  });

  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], nomeArquivoValidacao(empresa, envioId), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
