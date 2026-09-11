import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  LancamentoFaturamentoAereo,
  FaturaAereo,
  StatusFaturaAereo,
  Cliente,
  TipoCustoExtraFaturamentoAereo,
  TabelaPrecoFrete,
} from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';

export const TIPOS_CUSTO_EXTRA: TipoCustoExtraFaturamentoAereo[] = [
  'Dedicado por KM',
  'Dedicado Integral',
  'Dedicado Compartilhado',
  'TDE Compartilhado ou Integral + Descarga no Cliente',
  'TDE Integral',
  'TDE Compartilhado',
  'Coleta de Insumos',
  'Compra de Insumos',
  'Operação Fleury com Reversa',
  'Operação sem Reversar',
];

// ==========================================
// Config visual de status (espelha o painel "CONTROLE FINANCEIRO - AÉREO" do Coda)
// ==========================================
export const STATUS_FATURA_CONFIG: Record<
  StatusFaturaAereo,
  { label: string; badge: string; dot: string }
> = {
  Aberta: { label: 'Aberta', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  Parcial: { label: 'Parcial', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  Paga: { label: 'Paga', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'A Confirmar': { label: 'A Confirmar', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  'NF Gerada': { label: 'NF Gerada', badge: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-500' },
};

// ==========================================
// Cálculo do "Valor a Cobrar do Cliente" — réplica das fórmulas do Coda
// ==========================================

export function findClienteById(clientes: Cliente[], clienteId?: string): Cliente | undefined {
  return clienteId ? clientes.find((c) => c.id === clienteId) : undefined;
}

/**
 * Resolve qual tarifário usar para um lançamento: a maioria dos clientes só tem `tabelaFrete`
 * (serve pra qualquer modal), mas alguns — hoje só a LUFT — operam Aéreo e Rodoviário com
 * tabelas de preço DIFERENTES entre si (mesma estrutura por cidade, valores distintos; réplica
 * das tabelas "TARIFARIO - LUFT AEREO"/"TARIFARIO - LUFT RODOVIARIO" do Coda). Nesse caso,
 * `tabelaFreteRodoviario` cadastrado no cliente é usado quando o lançamento é Rodoviário; sem
 * esse campo (o caso comum), sempre cai em `tabelaFrete`, preservando o comportamento anterior.
 */
function tabelaFreteParaModal(cliente: Cliente | undefined, modal?: string): TabelaPrecoFrete | undefined {
  if (!cliente) return undefined;
  const ehRodoviario = normalizeKey(modal || '').includes('rodoviari');
  if (ehRodoviario && cliente.tabelaFreteRodoviario) return cliente.tabelaFreteRodoviario;
  return cliente.tabelaFrete;
}

function buscarTarifaCidade(cliente: Cliente | undefined, cidade?: string, modal?: string) {
  if (!cliente || !cidade) return undefined;
  const alvo = normalizeCidade(cidade);
  return tabelaFreteParaModal(cliente, modal)?.tarifasPorCidade?.find((t) => normalizeCidade(t.cidade) === alvo);
}

/** Uma "linha" do detalhamento do Valor a Cobrar — rótulo explicando de onde o valor vem
 *  (tarifa base, excedente de peso, custo extra etc.) + o valor em si. Usado tanto para
 *  mostrar o detalhamento na tela (ver `explicarValorACobrar`) quanto, internamente, para
 *  somar e chegar no total de `computeTarifaPorPeso`/`computeValorACobrar` — uma única fonte
 *  de verdade, pra detalhamento e cálculo nunca se desalinharem. */
export interface LinhaValorACobrar {
  label: string;
  valor: number;
}

/** Detalha a tarifa por peso em linhas explicáveis: tabela por cidade/faixa (Tarifa Base,
 *  separada em "até 10kg" + "excedente") ou % Ad Valorem sobre a NF/Prestação, conforme o
 *  modelo de precificação cadastrado no cliente — usa o tarifário do modal certo (ver
 *  `tabelaFreteParaModal`) quando o lançamento é Aéreo ou Rodoviário. Retorna `undefined`
 *  quando não há tarifário suficiente para calcular (sem cliente vinculado, sem tarifa da
 *  cidade, etc.). */
function detalharTarifaPorPeso(
  l: Pick<LancamentoFaturamentoAereo, 'cidadeDestino' | 'pesoKg' | 'valorPrestacao' | 'valorNF' | 'modal'>,
  cliente?: Cliente
): LinhaValorACobrar[] | undefined {
  const tabela = tabelaFreteParaModal(cliente, l.modal);
  if (!tabela) return undefined;
  const peso = l.pesoKg ?? 0;

  if (tabela.modeloPrecificacao === 'ad_valorem') {
    const percentual = tabela.percentualAdValoremNF;
    if (!percentual) return undefined;
    const base = l.valorPrestacao ?? l.valorNF ?? 0;
    const minimo = tabela.freteMinimo ?? 0;
    const semMinimo = (percentual / 100) * base;
    if (minimo > semMinimo) {
      return [{ label: `Frete mínimo (Ad Valorem ${percentual}% sobre ${formatCurrency(base)} ficaria menor)`, valor: minimo }];
    }
    return [{ label: `Ad Valorem: ${percentual}% sobre ${formatCurrency(base)}`, valor: semMinimo }];
  }

  const excedente = Math.max(0, peso - 10);
  const faixa = buscarTarifaCidade(cliente, l.cidadeDestino, l.modal);
  if (faixa) {
    const linhas: LinhaValorACobrar[] = [
      { label: `Tarifa base até 10kg (${faixa.cidade})`, valor: faixa.valorAte10Kg },
    ];
    if (excedente > 0) {
      linhas.push({
        label: `Excedente de peso (${excedente.toFixed(2)}kg × ${formatCurrency(faixa.valorKgExcedente)}/kg)`,
        valor: excedente * faixa.valorKgExcedente,
      });
    }
    return linhas;
  }

  if (tabela.valorBase) {
    const linhas: LinhaValorACobrar[] = [{ label: 'Tarifa base até 10kg', valor: tabela.valorBase }];
    if (excedente > 0 && tabela.valorKgExcedente) {
      linhas.push({
        label: `Excedente de peso (${excedente.toFixed(2)}kg × ${formatCurrency(tabela.valorKgExcedente)}/kg)`,
        valor: excedente * tabela.valorKgExcedente,
      });
    }
    return linhas;
  }

  return undefined;
}

function computeTarifaPorPeso(
  l: Pick<LancamentoFaturamentoAereo, 'cidadeDestino' | 'pesoKg' | 'valorPrestacao' | 'valorNF' | 'modal'>,
  cliente?: Cliente
): number | undefined {
  const linhas = detalharTarifaPorPeso(l, cliente);
  return linhas ? linhas.reduce((soma, linha) => soma + linha.valor, 0) : undefined;
}

/**
 * Detalha, linha a linha, de onde vem o Valor a Cobrar de um lançamento — mesma fórmula
 * (e mesma fonte de dados) do `computeValorACobrar` abaixo, só que explicando cada parcela em
 * vez de só o total. Pensado pra mostrar num tooltip/painel ao lado do valor na tela.
 */
export function explicarValorACobrar(
  l: LancamentoFaturamentoAereo,
  cliente?: Cliente
): { linhas: LinhaValorACobrar[]; total: number } {
  const tipoNorm = normalizeKey(l.tipoCustoExtra || '');
  const custoExtra = l.custoExtra ?? 0;

  if (tipoNorm.includes('dedicado') || tipoNorm.includes('fleury')) {
    const linhas: LinhaValorACobrar[] = [
      { label: `Custo Extra fechado (${l.tipoCustoExtra})`, valor: custoExtra },
    ];
    return { linhas, total: custoExtra };
  }

  const linhasTarifa = detalharTarifaPorPeso(l, cliente);
  if (!linhasTarifa) {
    const valor = l.valorACobrar ?? 0;
    return {
      linhas: [{ label: 'Valor informado (sem tarifário do cliente cadastrado para recalcular)', valor }],
      total: valor,
    };
  }

  const linhas: LinhaValorACobrar[] = [];
  if (custoExtra) linhas.push({ label: 'Custo Extra', valor: custoExtra });
  if (tipoNorm.includes('tde') && l.custoDescarga) {
    linhas.push({ label: 'Custo de Descarga', valor: l.custoDescarga });
  }
  linhas.push(...linhasTarifa);
  const total = linhas.reduce((soma, linha) => soma + linha.valor, 0);
  return { linhas, total };
}

/**
 * Réplica a fórmula "VALOR A COBRAR DO CLIENTE" das tabelas de CT-e no Coda:
 * - Tipo de Custo Extra "Dedicado..." ou "...Fleury...": cobra o Custo Extra fechado.
 * - Tipo "TDE...": Custo Extra + Custo de Descarga + tarifa por cidade/peso (ou % Ad Valorem).
 * - Demais casos: Custo Extra + tarifa por cidade/peso (ou % Ad Valorem).
 * Sem tarifário do cliente cadastrado (ou dados insuficientes), mantém o valor já registrado
 * no lançamento — nunca zera um valor herdado da importação/edição manual.
 * (Implementado em cima de `explicarValorACobrar` — cálculo e detalhamento nunca divergem.)
 */
export function computeValorACobrar(l: LancamentoFaturamentoAereo, cliente?: Cliente): number {
  return explicarValorACobrar(l, cliente).total;
}

export interface GrupoDuplicidadeCte {
  /** Critério que identificou a duplicidade: mesma NF do mesmo cliente é o mais confiável (a
   *  nota fiscal identifica uma cobrança/remessa específica); mesmo nº de CT-e do mesmo cliente
   *  é o critério reserva, só usado quando a NF não está preenchida. Um único CT-e pode cobrir
   *  legitimamente várias NFs diferentes num mesmo transporte consolidado (visto na prática em
   *  AMPLA/CARGO BRASIL/TRANS MODEL — cada NF é uma cobrança paga separadamente) — por isso CT-e
   *  sozinho NÃO é confiável como critério primário, ao contrário do que a versão anterior desta
   *  função assumia. */
  criterio: 'numeroCte' | 'notaFiscal';
  chave: string;
  lancamentos: LancamentoFaturamentoAereo[];
}

/**
 * Identifica lançamentos de CT-e possivelmente duplicados no Controle Financeiro — útil
 * após importações de planilha (mesma linha importada mais de uma vez) ou digitação manual
 * repetida. Agrupa primeiro por NF (nota fiscal) do mesmo cliente; lançamentos já contabilizados
 * nesse critério não entram no segundo agrupamento (mesmo CT-e, usado só pra pegar lançamentos
 * sem NF preenchida), evitando reportar o mesmo grupo duas vezes.
 */
/** Valores usados como "sem CT-e/NF preenchido" em importações/planilhas (traço, travessão etc.)
 *  — tratados como ausência de valor, nunca como uma chave de correspondência. Sem isso, todo
 *  lançamento sem CT-e (comum: campo vem "-" da planilha) seria erroneamente agrupado com
 *  qualquer outro lançamento sem CT-e do mesmo cliente, gerando falsos positivos de duplicidade. */
function ehPlaceholderVazio(valor: string): boolean {
  return /^[-—.\s]*$/.test(valor) || normalizeKey(valor) === 'n/a' || normalizeKey(valor) === 'na';
}

export function findLancamentosDuplicados(
  lancamentos: LancamentoFaturamentoAereo[]
): GrupoDuplicidadeCte[] {
  const grupos: GrupoDuplicidadeCte[] = [];
  const jaAgrupados = new Set<string>();

  const porNF = new Map<string, LancamentoFaturamentoAereo[]>();
  lancamentos.forEach((l) => {
    const notaFiscal = l.notaFiscal || '';
    if (ehPlaceholderVazio(notaFiscal)) return;
    const chave = `${normalizeKey(l.clienteId || l.clienteNome || '')}|${normalizeKey(notaFiscal)}`;
    const arr = porNF.get(chave) ?? [];
    arr.push(l);
    porNF.set(chave, arr);
  });
  porNF.forEach((grupo) => {
    if (grupo.length > 1) {
      grupos.push({ criterio: 'notaFiscal', chave: grupo[0].notaFiscal || '', lancamentos: grupo });
      grupo.forEach((l) => jaAgrupados.add(l.id));
    }
  });

  // CT-e só entra como critério reserva para lançamentos sem NF preenchida — não pega quem já
  // foi agrupado por NF acima, e nunca cruza lançamentos que já têm NF diferente entre si (isso
  // seria o caso legítimo de "uma NF por cobrança, várias NFs no mesmo CT-e").
  const porCte = new Map<string, LancamentoFaturamentoAereo[]>();
  lancamentos.forEach((l) => {
    if (jaAgrupados.has(l.id)) return;
    if (!ehPlaceholderVazio(l.notaFiscal || '')) return;
    const numeroCte = l.numeroCte || '';
    if (ehPlaceholderVazio(numeroCte)) return;
    const chave = `${normalizeKey(l.clienteId || l.clienteNome || '')}|${normalizeKey(numeroCte)}`;
    const arr = porCte.get(chave) ?? [];
    arr.push(l);
    porCte.set(chave, arr);
  });
  porCte.forEach((grupo) => {
    if (grupo.length > 1) {
      grupos.push({ criterio: 'numeroCte', chave: grupo[0].numeroCte || '', lancamentos: grupo });
    }
  });

  return grupos;
}

export interface ResumoFaturaAereo {
  valorTotalCobrado: number;
  valorPago: number;
  valorEmAberto: number;
  qtdCtes: number;
  qtdCtesPagos: number;
  status: StatusFaturaAereo;
  dataConfirmacaoPagamento?: string;
}

/** Réplica das colunas calculadas da tabela FATURAS no Coda. */
export function computeResumoFatura(
  faturaId: string,
  lancamentos: LancamentoFaturamentoAereo[],
  clientes: Cliente[] = []
): ResumoFaturaAereo {
  const doFatura = lancamentos.filter((l) => l.faturaId === faturaId);
  const valorTotalCobrado = doFatura.reduce(
    (sum, l) => sum + computeValorACobrar(l, findClienteById(clientes, l.clienteId)),
    0
  );
  const pagos = doFatura.filter((l) => l.confirmacaoPagamento);
  const valorPago = pagos.reduce((sum, l) => sum + (l.valorRecebido || 0), 0);
  const valorEmAberto = valorTotalCobrado - valorPago;

  let status: StatusFaturaAereo = 'Aberta';
  if (valorEmAberto <= 0 && doFatura.length > 0) status = 'Paga';
  else if (valorPago > 0) status = 'Parcial';

  const datasConclusao = pagos.map((l) => l.dataConclusao).filter(Boolean) as string[];
  const dataConfirmacaoPagamento = datasConclusao.length
    ? datasConclusao.sort().slice(-1)[0]
    : undefined;

  return {
    valorTotalCobrado,
    valorPago,
    valorEmAberto,
    qtdCtes: doFatura.length,
    qtdCtesPagos: pagos.length,
    status,
    dataConfirmacaoPagamento,
  };
}

export interface ResumoGeralFaturamentoAereo {
  totalFaturado: number;
  totalPago: number;
  totalEmAberto: number;
  totalFaturas: number;
  totalCtes: number;
  ctesPagos: number;
  ctesEmAberto: number;
}

/** Réplica do bloco "Resumo Financeiro" + "Métricas de CT-Es" do painel Coda. */
export function computeResumoGeral(
  lancamentos: LancamentoFaturamentoAereo[],
  faturas: FaturaAereo[],
  clientes: Cliente[] = []
): ResumoGeralFaturamentoAereo {
  const totalFaturado = lancamentos.reduce(
    (sum, l) => sum + computeValorACobrar(l, findClienteById(clientes, l.clienteId)),
    0
  );
  const pagos = lancamentos.filter((l) => l.confirmacaoPagamento);
  const totalPago = pagos.reduce((sum, l) => sum + (l.valorRecebido || 0), 0);

  return {
    totalFaturado,
    totalPago,
    totalEmAberto: totalFaturado - totalPago,
    totalFaturas: faturas.length,
    totalCtes: lancamentos.length,
    ctesPagos: pagos.length,
    ctesEmAberto: lancamentos.length - pagos.length,
  };
}

// ==========================================
// Exportação de fatura para Excel (mesmas colunas da tabela de CT-e no Coda)
// ==========================================

/** Remove acentos e caracteres inválidos para usar em nome de arquivo. */
function sanitizarNomeArquivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

// Paleta oficial JMT (mesmas cores da Diretriz de Documentos em PDF — ver variáveis
// --jmt-bronze/--jmt-bronze-dark em src/index.css) e extraída diretamente das faturas reais
// já emitidas para os clientes (ex.: FATURA_CARGO_BRASIL_JUNHO_2026.xlsx), garantindo que a
// planilha gerada pelo sistema saia visualmente igual ao que a JMT já envia hoje.
const COR_BRONZE = 'FFB38F4F';
const COR_BRONZE_ESCURO = 'FF8A6A39';
const COR_CINZA_TEXTO = 'FF555555';
const COR_BORDA = 'FFBFBFBF';
const COR_BRANCO = 'FFFFFFFF';
const COR_PRETO = 'FF000000';

const MESES_EXTENSO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
function formatarDataExtenso(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} de ${MESES_EXTENSO[d.getMonth()]} de ${d.getFullYear()}`;
}

const BORDA_FINA = {
  top: { style: 'thin' as const, color: { argb: COR_BORDA } },
  bottom: { style: 'thin' as const, color: { argb: COR_BORDA } },
  left: { style: 'thin' as const, color: { argb: COR_BORDA } },
  right: { style: 'thin' as const, color: { argb: COR_BORDA } },
};

interface ColunaFatura {
  header: string;
  key: string;
  width: number;
  moeda?: boolean;
}

/** Um modelo de exportação = um conjunto de colunas (nomes e ordem exatos que a empresa já
 *  recebe hoje) + a função que mapeia um lançamento do sistema para os valores dessas colunas.
 *  A formatação institucional (logo, título, cores, borda, linha de total, rodapé) é sempre a
 *  mesma — só a estrutura da tabela de dados muda por empresa. */
interface TemplateExportacaoFatura {
  id: string;
  nomeExibicao: string;
  colunas: ColunaFatura[];
  /** Chave (dentro de `colunas`) da coluna que recebe o total geral da fatura na última linha. */
  colunaTotal: string;
  montarLinha: (
    l: LancamentoFaturamentoAereo,
    cliente: Cliente | undefined,
    valorACobrar: number,
    fatura: FaturaAereo
  ) => Record<string, string | number | null>;
}

/** "Cidade/UF" combinado — formato usado nos modelos da BLS e da TRANS MODEL. */
function cidadeUf(cidade?: string, estado?: string): string {
  if (cidade && estado) return `${cidade}/${estado}`;
  return cidade || estado || '';
}

// Mesmas 29 colunas/nomes de sempre (ver HEADER_ALIASES) — o layout institucional abaixo
// (logo, título, cores) fica só nas linhas acima da tabela, então reimportar este arquivo
// continua funcionando normalmente (a detecção de cabeçalho ignora as linhas decorativas).
const COLUNAS_FATURA: ColunaFatura[] = [
  { header: 'Empresa', key: 'clienteNome', width: 26 },
  { header: 'CNPJ Remetente', key: 'cnpjRemetente', width: 18 },
  { header: 'Estado Remetente', key: 'estadoRemetente', width: 14 },
  { header: 'Cidade Remetente', key: 'cidadeRemetente', width: 18 },
  { header: 'Remetente (Lab)', key: 'remetenteLab', width: 26 },
  { header: 'Destinatário', key: 'destinatario', width: 26 },
  { header: 'CNPJ Destinatário', key: 'cnpjDestinatario', width: 18 },
  { header: 'Estado Destino', key: 'estadoDestino', width: 13 },
  { header: 'Cidade Destino', key: 'cidadeDestino', width: 18 },
  { header: 'Bairro Destino', key: 'bairroDestino', width: 16 },
  { header: 'Nota Fiscal', key: 'notaFiscal', width: 12 },
  { header: 'Valor da NF', key: 'valorNF', width: 13, moeda: true },
  { header: 'Valor da Prestação', key: 'valorPrestacao', width: 15, moeda: true },
  { header: 'Data da Emissão', key: 'dataEmissao', width: 13 },
  { header: 'CT-e', key: 'numeroCte', width: 10 },
  { header: 'CTRC', key: 'ctrc', width: 10 },
  { header: 'Modal', key: 'modal', width: 10 },
  { header: 'Peso (KG)', key: 'pesoKg', width: 10 },
  { header: 'Peso Taxado', key: 'pesoTaxado', width: 11 },
  { header: 'Volumes', key: 'volumes', width: 9 },
  { header: 'Tipo de Custo Extra', key: 'tipoCustoExtra', width: 24 },
  { header: 'Custo Extra', key: 'custoExtra', width: 12, moeda: true },
  { header: 'Custo de Descarga', key: 'custoDescarga', width: 14, moeda: true },
  { header: 'Valor a Cobrar do Cliente', key: 'valorACobrar', width: 17, moeda: true },
  { header: 'Valor Recebido na Fatura', key: 'valorRecebido', width: 16, moeda: true },
  { header: 'Confirmação de Pagamento', key: 'confirmacaoPagamento', width: 16 },
  { header: 'Data da Conclusão', key: 'dataConclusao', width: 14 },
  { header: 'NF Emitida', key: 'nfEmitida', width: 11 },
  { header: 'Fatura Atrelada', key: 'faturaAtrelada', width: 14 },
  { header: 'Observação', key: 'observacao', width: 42 },
];

/** Modelo padrão (colunas do Coda) — usado por qualquer cliente sem modelo próprio definido
 *  abaixo em `TEMPLATE_POR_CLIENTE_ID` / `TEMPLATE_POR_NOME`. */
const TEMPLATE_PADRAO: TemplateExportacaoFatura = {
  id: 'padrao',
  nomeExibicao: 'Padrão (Coda)',
  colunas: COLUNAS_FATURA,
  colunaTotal: 'valorACobrar',
  montarLinha: (l, _cliente, valorACobrar, fatura) => ({
    clienteNome: l.clienteNome,
    cnpjRemetente: l.cnpjRemetente || '',
    estadoRemetente: l.estadoRemetente || '',
    cidadeRemetente: l.cidadeRemetente || '',
    remetenteLab: l.remetenteLab || '',
    destinatario: l.destinatario || '',
    cnpjDestinatario: l.cnpjDestinatario || '',
    estadoDestino: l.estadoDestino || '',
    cidadeDestino: l.cidadeDestino || '',
    bairroDestino: l.bairroDestino || '',
    notaFiscal: l.notaFiscal || '',
    valorNF: l.valorNF ?? null,
    valorPrestacao: l.valorPrestacao ?? null,
    dataEmissao: l.dataEmissao ? formatDateBR(l.dataEmissao) : '',
    numeroCte: l.numeroCte || '',
    ctrc: l.ctrc || '',
    modal: l.modal || '',
    pesoKg: l.pesoKg ?? null,
    pesoTaxado: l.pesoTaxado ?? null,
    volumes: l.volumes ?? null,
    tipoCustoExtra: l.tipoCustoExtra || '',
    custoExtra: l.custoExtra ?? null,
    custoDescarga: l.custoDescarga ?? null,
    valorACobrar,
    valorRecebido: l.valorRecebido ?? null,
    confirmacaoPagamento: l.confirmacaoPagamento ? 'Sim' : 'Não',
    dataConclusao: l.dataConclusao ? formatDateBR(l.dataConclusao) : '',
    nfEmitida: l.nfEmitida === undefined ? '' : l.nfEmitida ? 'Sim' : 'Não',
    faturaAtrelada: fatura.numeroFatura,
    observacao: l.observacao || '',
  }),
};

/** Modelo BLS / BIOTHERMAL — mesmas colunas do arquivo real já enviado ao cliente
 *  (fatura_biothermal_mai_jun_jul_2026.xlsx). */
const TEMPLATE_BLS: TemplateExportacaoFatura = {
  id: 'bls',
  nomeExibicao: 'BLS (Biothermal)',
  colunaTotal: 'valorACobrar',
  colunas: [
    { header: 'CT-E', key: 'cte', width: 10 },
    { header: 'NF', key: 'nf', width: 12 },
    { header: 'REMETENTE (LAB)', key: 'remetente', width: 30 },
    { header: 'DESTINATÁRIO', key: 'destinatario', width: 30 },
    { header: 'CIDADE DESTINO/UF', key: 'cidadeUf', width: 20 },
    { header: 'DATA EMISSÃO', key: 'dataEmissao', width: 13 },
    { header: 'PESO (KG)', key: 'peso', width: 10 },
    { header: 'CUSTO EXTRA (R$)', key: 'custoExtra', width: 14, moeda: true },
    { header: 'VALOR A COBRAR (R$)', key: 'valorACobrar', width: 16, moeda: true },
    { header: 'OBSERVAÇÃO', key: 'observacao', width: 42 },
  ],
  montarLinha: (l, _cliente, valorACobrar) => ({
    cte: l.numeroCte || '',
    nf: l.notaFiscal || '',
    remetente: l.remetenteLab || '',
    destinatario: l.destinatario || '',
    cidadeUf: cidadeUf(l.cidadeDestino, l.estadoDestino),
    dataEmissao: l.dataEmissao ? formatDateBR(l.dataEmissao) : '',
    peso: l.pesoKg ?? null,
    custoExtra: l.custoExtra ?? null,
    valorACobrar,
    observacao: l.observacao || '',
  }),
};

/** Modelo TEMPLOG (TGT Transportes) — mesmas colunas do arquivo real já enviado ao cliente
 *  (TEMPLOG_FATURAMENTO_JULHO_2026.xlsx). "TX MINIMA" e "PRECO POR KG" vêm do tarifário
 *  cadastrado no cliente (Tarifa Base / valor por kg excedente); "TDE/DEDICADO" mostra o tipo
 *  de custo extra do lançamento quando houver. */
const TEMPLATE_TEMPLOG: TemplateExportacaoFatura = {
  id: 'templog',
  nomeExibicao: 'TEMPLOG (TGT)',
  colunaTotal: 'valorAPagar',
  colunas: [
    { header: 'CTE', key: 'cte', width: 10 },
    { header: 'EMISSAO', key: 'emissao', width: 13 },
    { header: 'N.F.', key: 'nf', width: 12 },
    { header: 'REMETENTE', key: 'remetente', width: 28 },
    { header: 'DESTINATARIO', key: 'destinatario', width: 28 },
    { header: 'CIDADE DESTINO', key: 'cidadeDestino', width: 18 },
    { header: 'DATA ENTREGA', key: 'dataEntrega', width: 13 },
    { header: 'PESO TAXADO (KG)', key: 'pesoTaxado', width: 14 },
    { header: 'VOL.', key: 'vol', width: 8 },
    { header: 'TX MINIMA', key: 'txMinima', width: 12, moeda: true },
    { header: 'PRECO POR KG', key: 'precoPorKg', width: 13, moeda: true },
    { header: 'TDE/DEDICADO', key: 'tdeDedicado', width: 24 },
    { header: 'VALOR A PAGAR', key: 'valorAPagar', width: 14, moeda: true },
    { header: 'OBS', key: 'observacao', width: 36 },
  ],
  montarLinha: (l, cliente, valorACobrar) => ({
    cte: l.numeroCte || '',
    emissao: l.dataEmissao ? formatDateBR(l.dataEmissao) : '',
    nf: l.notaFiscal || '',
    remetente: l.remetenteLab || '',
    destinatario: l.destinatario || '',
    cidadeDestino: l.cidadeDestino || '',
    dataEntrega: l.dataConclusao ? formatDateBR(l.dataConclusao) : '',
    pesoTaxado: l.pesoTaxado ?? l.pesoKg ?? null,
    vol: l.volumes ?? null,
    txMinima: cliente?.tabelaFrete?.valorBase ?? null,
    precoPorKg: cliente?.tabelaFrete?.valorKgExcedente ?? null,
    tdeDedicado: l.tipoCustoExtra || '',
    valorAPagar: valorACobrar,
    observacao: l.observacao || '',
  }),
};

/** Modelo TRANS MODEL — mesmas colunas da planilha "Trans Model Padrão" que a própria empresa
 *  usa para conferência ("TRANSMODEL - FATURAMENTO DE ABRIL 2ºQ.xlsx"). O sistema hoje não
 *  detalha GRIS/Agendamento/Outros como lançamentos separados — essas colunas saem em branco
 *  (não inventamos valor); DEDICADO/TDE saem preenchidas quando o tipo de custo extra do
 *  lançamento indica esse serviço, e o valor final sempre vai para TOTAL. */
const TEMPLATE_TRANSMODEL: TemplateExportacaoFatura = {
  id: 'transmodel',
  nomeExibicao: 'TRANS MODEL',
  colunaTotal: 'total',
  colunas: [
    { header: 'CTRC', key: 'ctrc', width: 14 },
    { header: 'Nome Remetente', key: 'nomeRemetente', width: 28 },
    { header: 'Remetente Cidade/UF', key: 'remetenteCidadeUf', width: 20 },
    { header: 'Nome Destinatario', key: 'nomeDestinatario', width: 28 },
    { header: 'Destino Cidade/UF', key: 'destinoCidadeUf', width: 20 },
    { header: 'Valor de Merc', key: 'valorMerc', width: 13, moeda: true },
    { header: 'Peso KG', key: 'pesoKg', width: 10 },
    { header: 'TX 10 KG', key: 'tx10Kg', width: 11, moeda: true },
    { header: 'TX KG EXC', key: 'txKgExc', width: 11, moeda: true },
    { header: 'TOTAL KG EXC', key: 'totalKgExc', width: 13, moeda: true },
    { header: 'GRIS', key: 'gris', width: 10, moeda: true },
    { header: 'AGENDAMENTO', key: 'agendamento', width: 14 },
    { header: 'DEDICADO', key: 'dedicado', width: 12, moeda: true },
    { header: 'TDE', key: 'tde', width: 12, moeda: true },
    { header: 'OUTROS_1', key: 'outros1', width: 11 },
    { header: 'OUTROS_2', key: 'outros2', width: 11 },
    { header: 'TOTAL', key: 'total', width: 13, moeda: true },
    { header: 'Observação', key: 'observacao', width: 40 },
  ],
  montarLinha: (l, cliente, valorACobrar) => {
    const tipo = (l.tipoCustoExtra || '').toLowerCase();
    return {
      ctrc: l.ctrc || l.numeroCte || '',
      nomeRemetente: l.remetenteLab || '',
      remetenteCidadeUf: cidadeUf(l.cidadeRemetente, l.estadoRemetente),
      nomeDestinatario: l.destinatario || '',
      destinoCidadeUf: cidadeUf(l.cidadeDestino, l.estadoDestino),
      valorMerc: l.valorNF ?? null,
      pesoKg: l.pesoKg ?? null,
      tx10Kg: cliente?.tabelaFrete?.valorBase ?? null,
      txKgExc: cliente?.tabelaFrete?.valorKgExcedente ?? null,
      totalKgExc: null,
      gris: null,
      agendamento: '',
      dedicado: tipo.includes('dedicado') ? (l.custoExtra ?? null) : null,
      tde: tipo.includes('tde') ? (l.custoExtra ?? null) : null,
      outros1: '',
      outros2: '',
      total: valorACobrar,
      observacao: l.observacao || '',
    };
  },
};

/** Modelo BIOMEDICAL / BOMI — mesmas 45 colunas da planilha real que a BOMI já usa para conferir
 *  ("BOMI - ABRIL 2026.xlsx"), que traz uma aba por região (Itapevi/Goiás/Itajaí/Rio de Janeiro)
 *  mas com a MESMA estrutura de colunas em todas — por isso um único conjunto de colunas serve
 *  às 4 regiões (ver `TEMPLATE_BOMI_ITAPEVI/_GOIAS/_ITAJAI/_RJ` abaixo e a escolha por região em
 *  `getTemplateParaFatura`). Colunas que o sistema não detalha hoje como lançamento próprio
 *  (COLETA/EXC. COLETA/ENTREGA/REDESPACHO/TX. EMERGENCIAL/TX. DG/GRIS/SEFAZ/SUFRAMA/ICMS/
 *  aeroportos/serviço/tipo de emissão/tipo de frete) saem em branco — não inventamos valor.
 *  "CAPITAL/INTERIORIZAÇÃO", "FRETE PESO" e "EXC. ENTREGA" são recalculados pelo mesmo tarifário
 *  por cidade/peso (ou % Ad Valorem) usado no "Valor a Cobrar" do sistema (`buscarTarifaCidade` /
 *  `computeTarifaPorPeso`), nunca copiados de um valor antigo da planilha. "VL. FRETE LIQUIDO"
 *  (sempre em branco na planilha original da BOMI) recebe o Valor a Cobrar recalculado — é a
 *  única coluna da estrutura cujo nome já corresponde exatamente a esse valor. */
const COLUNAS_BOMI: ColunaFatura[] = [
  { header: 'Nº FATURA', key: 'numeroFatura', width: 20 },
  { header: 'CT-E BOMI', key: 'cteBomi', width: 12 },
  { header: 'CT-E TSP', key: 'cteTsp', width: 14 },
  { header: 'REMETENTE', key: 'remetente', width: 30 },
  { header: 'CNPJ REMETENTE', key: 'cnpjRemetente', width: 18 },
  { header: 'CIDADE ORIGEM', key: 'cidadeOrigem', width: 18 },
  { header: 'UF ORIGEM', key: 'ufOrigem', width: 10 },
  { header: 'DESTINATÁRIO', key: 'destinatario', width: 30 },
  { header: 'CNPJ DESTINATÁRIO', key: 'cnpjDestinatario', width: 18 },
  { header: 'CIDADE DESTINO', key: 'cidadeDestino', width: 18 },
  { header: 'UF DESTINO', key: 'ufDestino', width: 10 },
  { header: 'NOTA FISCAL', key: 'notaFiscal', width: 12 },
  { header: 'DATA DA EMISSÃO CTE', key: 'dataEmissaoCte', width: 15 },
  { header: 'DATA DE ENTREGA', key: 'dataEntrega', width: 15 },
  { header: 'VALOR DE MERCADORIA', key: 'valorMercadoria', width: 16, moeda: true },
  { header: 'VOLUMES', key: 'volumes', width: 9 },
  { header: 'PESO REAL', key: 'pesoReal', width: 10 },
  { header: 'PESO CUBADO', key: 'pesoCubado', width: 11 },
  { header: 'PESO TAXADO', key: 'pesoTaxado', width: 11 },
  { header: 'CAPITAL/INTERIORIZAÇÃO', key: 'capitalInteriorizacao', width: 16, moeda: true },
  { header: 'TDE', key: 'tde', width: 12, moeda: true },
  { header: 'TDA', key: 'tda', width: 10 },
  { header: 'TABELA DE CALCULO', key: 'tabelaCalculo', width: 16 },
  { header: 'FRETE PESO', key: 'fretePeso', width: 13, moeda: true },
  { header: 'COLETA', key: 'coleta', width: 10 },
  { header: 'EXC. COLETA', key: 'excColeta', width: 11 },
  { header: 'ENTREGA', key: 'entrega', width: 10 },
  { header: 'EXC. ENTREGA', key: 'excEntrega', width: 12, moeda: true },
  { header: 'REDESPACHO', key: 'redespacho', width: 12 },
  { header: 'TX. EMERGENCIAL', key: 'txEmergencial', width: 14 },
  { header: 'TX. DG', key: 'txDg', width: 10 },
  { header: 'AD-VALOREM', key: 'adValorem', width: 12, moeda: true },
  { header: 'GRIS', key: 'gris', width: 10 },
  { header: 'SEFAZ', key: 'sefaz', width: 10 },
  { header: 'SUFRAMA', key: 'suframa', width: 10 },
  { header: 'CARRO DEDICADO', key: 'carroDedicado', width: 14, moeda: true },
  { header: 'ICMS', key: 'icms', width: 10 },
  { header: 'VL. FRETE LIQUIDO', key: 'vlFreteLiquido', width: 15, moeda: true },
  { header: 'OBSERVAÇÕES (comentário CTE unicargo)', key: 'observacoes', width: 40 },
  { header: 'SERVIÇO', key: 'servico', width: 12 },
  { header: 'TIPO DE EMISSÃO', key: 'tipoEmissao', width: 14 },
  { header: 'Sigla Aeroporto Destino', key: 'siglaAeroportoDestino', width: 14 },
  { header: 'Aeroporto Origem', key: 'aeroportoOrigem', width: 16 },
  { header: 'Aeroporto Destino', key: 'aeroportoDestino', width: 16 },
  { header: 'TIPO DE FRETE', key: 'tipoFrete', width: 12 },
];

function montarLinhaBomi(
  l: LancamentoFaturamentoAereo,
  cliente: Cliente | undefined,
  valorACobrar: number,
  fatura: FaturaAereo
): Record<string, string | number | null> {
  const tipoNorm = normalizeKey(l.tipoCustoExtra || '');
  const isAdValorem = cliente?.tabelaFrete?.modeloPrecificacao === 'ad_valorem';
  const faixa = isAdValorem ? undefined : buscarTarifaCidade(cliente, l.cidadeDestino, l.modal);
  const tarifaPeso = computeTarifaPorPeso(l, cliente);

  return {
    numeroFatura: fatura.numeroFatura,
    cteBomi: l.numeroCte || '',
    cteTsp: l.ctrc || '',
    remetente: l.remetenteLab || '',
    cnpjRemetente: l.cnpjRemetente || '',
    cidadeOrigem: l.cidadeRemetente || '',
    ufOrigem: l.estadoRemetente || '',
    destinatario: l.destinatario || '',
    cnpjDestinatario: l.cnpjDestinatario || '',
    cidadeDestino: l.cidadeDestino || '',
    ufDestino: l.estadoDestino || '',
    notaFiscal: l.notaFiscal || '',
    dataEmissaoCte: l.dataEmissao ? formatDateBR(l.dataEmissao) : '',
    dataEntrega: l.dataConclusao ? formatDateBR(l.dataConclusao) : '',
    valorMercadoria: l.valorNF ?? null,
    volumes: l.volumes ?? null,
    pesoReal: l.pesoKg ?? null,
    pesoCubado: null,
    pesoTaxado: l.pesoTaxado ?? null,
    capitalInteriorizacao: faixa?.valorAte10Kg ?? null,
    tde: tipoNorm.includes('tde') ? (l.custoExtra ?? 0) + (l.custoDescarga ?? 0) : null,
    tda: null,
    tabelaCalculo: '',
    fretePeso: !isAdValorem ? (tarifaPeso ?? null) : null,
    coleta: null,
    excColeta: null,
    entrega: null,
    excEntrega: faixa && tarifaPeso !== undefined ? tarifaPeso - faixa.valorAte10Kg : null,
    redespacho: null,
    txEmergencial: null,
    txDg: null,
    adValorem: isAdValorem ? (tarifaPeso ?? null) : null,
    gris: null,
    sefaz: null,
    suframa: null,
    carroDedicado: tipoNorm.includes('dedicado') || tipoNorm.includes('fleury') ? (l.custoExtra ?? 0) : null,
    icms: null,
    vlFreteLiquido: valorACobrar,
    observacoes: l.observacao || '',
    servico: '',
    tipoEmissao: '',
    siglaAeroportoDestino: '',
    aeroportoOrigem: '',
    aeroportoDestino: '',
    tipoFrete: '',
  };
}

const TEMPLATE_BOMI_ITAPEVI: TemplateExportacaoFatura = {
  id: 'bomi-itapevi',
  nomeExibicao: 'BOMI (Itapevi)',
  colunas: COLUNAS_BOMI,
  colunaTotal: 'vlFreteLiquido',
  montarLinha: montarLinhaBomi,
};

const TEMPLATE_BOMI_GOIAS: TemplateExportacaoFatura = {
  id: 'bomi-goias',
  nomeExibicao: 'BOMI (Goiás)',
  colunas: COLUNAS_BOMI,
  colunaTotal: 'vlFreteLiquido',
  montarLinha: montarLinhaBomi,
};

const TEMPLATE_BOMI_ITAJAI: TemplateExportacaoFatura = {
  id: 'bomi-itajai',
  nomeExibicao: 'BOMI (Itajaí)',
  colunas: COLUNAS_BOMI,
  colunaTotal: 'vlFreteLiquido',
  montarLinha: montarLinhaBomi,
};

const TEMPLATE_BOMI_RJ: TemplateExportacaoFatura = {
  id: 'bomi-rj',
  nomeExibicao: 'BOMI (Rio de Janeiro)',
  colunas: COLUNAS_BOMI,
  colunaTotal: 'vlFreteLiquido',
  montarLinha: montarLinhaBomi,
};

/** Resolve a região BOMI a partir do prefixo do nº da fatura — a migração já cria cada fatura
 *  com um prefixo fixo por região (`BOMI-ITAPEVI-`, `BOMI-GOIAS-`, `BOMI-ITAJAI-`, `BOMI-RJ-`),
 *  já que cada CT-e pertence a uma única filial/CNPJ da BOMI e nunca é misturado entre regiões
 *  numa mesma fatura. Sem prefixo reconhecido, retorna `undefined` (cai no modelo padrão). */
function getTemplateBomiPorNumeroFatura(numeroFatura: string): TemplateExportacaoFatura | undefined {
  const n = normalizeKey(numeroFatura || '');
  if (n.startsWith('bomi-itapevi')) return TEMPLATE_BOMI_ITAPEVI;
  if (n.startsWith('bomi-goias')) return TEMPLATE_BOMI_GOIAS;
  if (n.startsWith('bomi-itajai')) return TEMPLATE_BOMI_ITAJAI;
  if (n.startsWith('bomi-rj')) return TEMPLATE_BOMI_RJ;
  return undefined;
}

/** IDs dos clientes que já têm modelo próprio de exportação — mapeamento direto por id (mais
 *  confiável que por nome, que pode mudar). Ajuste aqui se o cadastro do cliente for recriado. */
const TEMPLATE_POR_CLIENTE_ID: Record<string, TemplateExportacaoFatura> = {
  'cli-1788620249663': TEMPLATE_BLS, // BLS (Biothermal Logistics Solutions)
  'cli-1788659058232': TEMPLATE_TEMPLOG, // TEMPLOG
  'cli-transmodel-1': TEMPLATE_TRANSMODEL, // TRANS MODEL
};

/** Fallback por nome (case/acento-insensível) — cobre o caso de o cliente ainda não estar
 *  vinculado por id (ex.: lançamento com `clienteNome` mas sem `clienteId`, ou cadastro
 *  recriado com outro id). */
function normalizarNomeCliente(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}
const TEMPLATE_POR_NOME: { teste: (nomeNormalizado: string) => boolean; template: TemplateExportacaoFatura }[] = [
  { teste: (n) => n.includes('BLS') || n.includes('BIOTHERMAL'), template: TEMPLATE_BLS },
  { teste: (n) => n.includes('TEMPLOG') || n.includes('TGT'), template: TEMPLATE_TEMPLOG },
  { teste: (n) => n.includes('TRANS MODEL') || n.includes('TRANSMODEL'), template: TEMPLATE_TRANSMODEL },
];

/** Resolve qual modelo de exportação usar para uma fatura: id do cliente cadastrado > nome do
 *  cliente/fatura > modelo padrão (Coda). */
function getTemplateParaCliente(cliente: Cliente | undefined, clienteNomeFallback: string): TemplateExportacaoFatura {
  if (cliente?.id && TEMPLATE_POR_CLIENTE_ID[cliente.id]) {
    return TEMPLATE_POR_CLIENTE_ID[cliente.id];
  }
  const nome = normalizarNomeCliente(cliente?.nomeFantasia || cliente?.razaoSocial || clienteNomeFallback || '');
  const porNome = TEMPLATE_POR_NOME.find((t) => t.teste(nome));
  return porNome ? porNome.template : TEMPLATE_PADRAO;
}

/** Resolve o modelo de exportação para uma fatura específica. A BIOMEDICAL/BOMI é a única
 *  cliente hoje com um modelo por REGIÃO em vez de um modelo único por cliente (cada uma das 4
 *  filiais — Itapevi/Goiás/Itajaí/Rio de Janeiro — tem sua própria planilha de conferência, mas
 *  todas compartilham o mesmo cadastro de Cliente no sistema) — por isso essa checagem entra
 *  antes da resolução por cliente de `getTemplateParaCliente`, que continua servindo os demais
 *  clientes (BLS/TEMPLOG/TRANS MODEL/padrão) normalmente. */
function getTemplateParaFatura(fatura: FaturaAereo, cliente: Cliente | undefined): TemplateExportacaoFatura {
  const nome = normalizarNomeCliente(cliente?.nomeFantasia || cliente?.razaoSocial || fatura.clienteNome || '');
  if (nome.includes('BIOMEDICAL') || nome.includes('BOMI')) {
    const porRegiao = getTemplateBomiPorNumeroFatura(fatura.numeroFatura);
    if (porRegiao) return porRegiao;
  }
  return getTemplateParaCliente(cliente, fatura.clienteNome);
}

/** Dispara o download de um Blob no navegador (ExcelJS gera o arquivo em memória — não tem
 *  `writeFile` como a lib `xlsx`, então o download é feito manualmente via link temporário). */
function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gera e baixa uma planilha .xlsx com todos os lançamentos de uma fatura, seguindo o mesmo
 * layout institucional já usado nas faturas reais da JMT por empresa (logo, título em
 * dourado/bronze, cabeçalho da tabela com fundo bronze e texto branco, bordas finas e
 * assinatura institucional no rodapé) — a mesma paleta da Diretriz de Documentos em PDF.
 * A ESTRUTURA da tabela (quais colunas saem, com que nome e em que ordem) muda por empresa:
 * BLS, TEMPLOG e TRANS MODEL têm modelo próprio (ver `TEMPLATE_POR_CLIENTE_ID`), replicando o
 * arquivo real que cada uma já recebe hoje; qualquer outro cliente usa o padrão (colunas do
 * Coda, ver HEADER_ALIASES — esse continua reimportável normalmente). "Valor a Cobrar"/"Valor
 * a Pagar"/"Total" sai sempre recalculado pela fórmula atual (tarifário do cliente), não o
 * valor apenas armazenado no lançamento.
 */
export async function exportarFaturaParaExcel(
  fatura: FaturaAereo,
  lancamentosDaFatura: LancamentoFaturamentoAereo[],
  cliente?: Cliente
): Promise<void> {
  // Modelo de colunas específico da empresa (BLS/TEMPLOG/TRANS MODEL), quando existir —
  // senão cai no padrão (colunas do Coda). Só a estrutura da tabela muda; o restante do
  // layout institucional (logo, cores, borda, total, rodapé) é sempre o mesmo abaixo.
  const template = getTemplateParaFatura(fatura, cliente);
  const colunas = template.colunas;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = STRATEGIC_GUIDELINES.empresa;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Fatura', { views: [{ showGridLines: false }] });
  sheet.columns = colunas.map((c) => ({ key: c.key, width: c.width }));

  // Logo institucional (mesma imagem usada nas faturas reais emitidas pela JMT)
  const imageId = workbook.addImage({ base64: JMT_LOGO_BASE64, extension: 'png' });
  sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 110, height: 41 } });

  sheet.mergeCells('C1:J1');
  sheet.getCell('C1').value = STRATEGIC_GUIDELINES.empresa.toUpperCase();
  sheet.getCell('C1').font = { bold: true, size: 14, color: { argb: COR_BRONZE_ESCURO }, name: 'Arial' };

  sheet.mergeCells('C2:N2');
  sheet.getCell('C2').value = `FATURA DE PRESTAÇÃO DE SERVIÇOS — ${(
    cliente?.razaoSocial || fatura.clienteNome || ''
  ).toUpperCase()}`;
  sheet.getCell('C2').font = { bold: true, size: 11, color: { argb: COR_BRONZE_ESCURO }, name: 'Arial' };

  sheet.mergeCells('C3:N3');
  sheet.getCell('C3').value =
    `Cliente: ${fatura.clienteNome}  |  Fatura: ${fatura.numeroFatura}  |  Período: ${fatura.periodo || '—'}`;
  sheet.getCell('C3').font = { size: 10, color: { argb: COR_CINZA_TEXTO }, name: 'Arial' };

  sheet.mergeCells('C4:N4');
  sheet.getCell('C4').value = `${STRATEGIC_GUIDELINES.empresa} | Emitido em ${formatarDataExtenso(new Date())}`;
  sheet.getCell('C4').font = { italic: true, size: 8, color: { argb: COR_BRONZE_ESCURO }, name: 'Arial' };

  sheet.getRow(1).height = 22;

  // Cabeçalho da tabela (linha 6 — fundo bronze, texto branco em negrito, borda fina)
  const linhaCabecalho = 6;
  const headerRow = sheet.getRow(linhaCabecalho);
  colunas.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, size: 10, color: { argb: COR_BRANCO }, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_BRONZE } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = BORDA_FINA;
  });
  headerRow.height = 26;

  // Linhas de dados
  lancamentosDaFatura.forEach((l, idx) => {
    const valores = template.montarLinha(l, cliente, computeValorACobrar(l, cliente), fatura);
    const row = sheet.getRow(linhaCabecalho + 1 + idx);
    colunas.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = valores[col.key];
      if (col.moeda && typeof cell.value === 'number') cell.numFmt = '#,##0.00';
      cell.font = { size: 10, name: 'Arial', color: { argb: COR_PRETO } };
      cell.border = BORDA_FINA;
    });
  });

  // Linha de TOTAL (negrito, em bronze escuro, na coluna do valor final de cada modelo)
  const linhaTotal = linhaCabecalho + 1 + lancamentosDaFatura.length;
  const colValorACobrarIdx = colunas.findIndex((c) => c.key === template.colunaTotal) + 1;
  const totalRow = sheet.getRow(linhaTotal);
  if (colValorACobrarIdx > 1) sheet.mergeCells(linhaTotal, 1, linhaTotal, colValorACobrarIdx - 1);
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = 'TOTAL DA FATURA';
  totalLabelCell.font = { bold: true, size: 11, color: { argb: COR_BRONZE_ESCURO }, name: 'Arial' };
  totalLabelCell.alignment = { horizontal: 'right' };
  const totalGeral = lancamentosDaFatura.reduce((sum, l) => sum + computeValorACobrar(l, cliente), 0);
  const totalValorCell = totalRow.getCell(colValorACobrarIdx);
  totalValorCell.value = totalGeral;
  totalValorCell.numFmt = '#,##0.00';
  totalValorCell.font = { bold: true, size: 11, color: { argb: COR_BRONZE_ESCURO }, name: 'Arial' };
  totalRow.height = 20;

  // Rodapé institucional — assinatura obrigatória da Diretriz de Documentos JMT
  const linhaRodape = linhaTotal + 2;
  sheet.mergeCells(linhaRodape, 1, linhaRodape, colunas.length);
  const rodapeCell = sheet.getCell(linhaRodape, 1);
  rodapeCell.value = STRATEGIC_GUIDELINES.assinatura;
  rodapeCell.font = { bold: true, size: 9, color: { argb: COR_BRONZE_ESCURO }, name: 'Arial' };
  rodapeCell.alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const nomeCliente = sanitizarNomeArquivo(fatura.clienteNome || 'Cliente');
  const nomeFatura = sanitizarNomeArquivo(fatura.numeroFatura || 'Fatura');
  baixarBlob(blob, `Fatura_${nomeFatura}_${nomeCliente}.xlsx`);
}

// ==========================================
// Importação de planilha (Excel/XLS/CSV)
// ==========================================

/** Cabeçalhos aceitos por campo — cobre tanto a exportação literal do Coda
 *  quanto nomes mais simples que um usuário digitaria manualmente. */
const HEADER_ALIASES: Record<string, string[]> = {
  clienteNome: ['empresa', 'cliente', 'empresa remetente', 'razao social', 'razão social'],
  remetenteLab: ['remetente (lab)', 'remetente lab', 'lab', 'laboratorio', 'laboratório'],
  destinatario: ['destinatario', 'destinatário'],
  cnpjRemetente: ['cnpj remetente'],
  cnpjDestinatario: ['cnpj destinatario', 'cnpj destinatário'],
  estadoRemetente: ['estado remetente', 'uf remetente'],
  cidadeRemetente: ['cidade remetente'],
  estadoDestino: ['estado destino', 'uf destino'],
  cidadeDestino: ['cidade destino'],
  bairroDestino: ['bairro destino'],
  notaFiscal: ['nota fiscal', 'nf', 'numero da nf', 'número da nf'],
  valorNF: ['valor da nf', 'valor nf'],
  valorPrestacao: ['valor da prestacao', 'valor da prestação', 'valor prestacao'],
  dataEmissao: ['data da emissao', 'data da emissão', 'data emissao', 'data emissão'],
  numeroCte: ['ct-e', 'cte', 'numero cte', 'número do cte', 'n do cte'],
  ctrc: ['ctrc'],
  modal: ['modal'],
  pesoKg: ['peso (kg)', 'peso kg', 'peso'],
  pesoTaxado: ['peso taxado'],
  volumes: ['volumes', 'qtd volumes', 'quantidade de volumes'],
  tipoCustoExtra: ['tipo de custo extra'],
  custoExtra: ['custo extra', 'custos extras', 'custos extras (total)', 'custo extra (total)'],
  custoDescarga: ['custo de descarga'],
  valorACobrar: ['valor a cobrar do cliente', 'valor a cobrar', 'valor cobrado', 'valor a receber'],
  valorRecebido: ['valor recebido na fatura', 'valor recebido', 'valor pago'],
  confirmacaoPagamento: ['confirmacao de pagamento', 'confirmação de pagamento', 'pago', 'confirmação pagamento'],
  dataConclusao: ['data da conclusao', 'data da conclusão', 'data de pagamento', 'data conclusao', 'data conclusão'],
  nfEmitida: ['nf emitida'],
  numeroFatura: ['fatura atrelada', 'no fatura', 'nº fatura', 'numero da fatura', 'número da fatura', 'numero fatura'],
  periodo: ['periodo', 'período'],
  observacao: ['observacao', 'observação'],
};

function normalizeKey(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Mesma normalização de `normalizeKey`, só que também trata "-"/"/" como espaço — usada
 *  especificamente para nome de CIDADE, onde variações de grafia tipo "CEARA-MIRIM" (lançamento
 *  importado) vs "CEARA MIRIM" (linha do tarifário) ou "AUGUSTO SEVERO/CAMPO GRANDE" (nome duplo
 *  numa linha só do tarifário) precisam casar. NÃO usar em `normalizeKey` genérico: ele também
 *  compara nº de fatura (ex.: prefixos "BOMI-ITAPEVI-..." em `getTemplateBomiPorNumeroFatura`,
 *  que dependem do hífen ficar intacto). */
function normalizeCidade(text: string): string {
  return normalizeKey(text).replace(/[-/]/g, ' ').replace(/\s+/g, ' ');
}

/** true quando o campo `modal` (de um lançamento OU de uma fatura) indica Farma Rodoviário —
 *  mesmo critério usado em `tabelaFreteParaModal` para escolher o tarifário certo do cliente.
 *  Usado pelas telas de Controle Financeiro pra separar os lançamentos/faturas de cada setor
 *  (aéreo e rodoviário compartilham a mesma tabela/tipo). `modal` vazio conta como Aéreo —
 *  mantém o comportamento de antes da existência do Rodoviário, quando não havia esse campo. */
export function ehModalRodoviario(modal?: string): boolean {
  return normalizeKey(modal || '').includes('rodoviari');
}

/** Constrói o mapa "coluna normalizada -> campo do sistema" a partir dos aliases. */
function buildReverseAliasMap(): Record<string, string> {
  const map: Record<string, string> = {};
  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    aliases.forEach((alias) => {
      map[normalizeKey(alias)] = field;
    });
  });
  return map;
}

function parseBooleanish(value: any): boolean {
  if (typeof value === 'boolean') return value;
  const text = normalizeKey(String(value ?? ''));
  return ['sim', 'true', '1', 'x', 'pago', 'paga', 'confirmado', 'yes'].includes(text);
}

function parseNumberish(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '') // remove separador de milhar
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

function parseDateish(value: any): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'number') {
    // Data serial do Excel
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const text = String(value).trim();
  // dd/mm/yyyy (tolera hora anexada depois, ex.: "26/08/2026 15:00")
  const brMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$)/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const isoMatch = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  return undefined;
}

/**
 * Localiza a linha de cabeçalho de verdade dentro das primeiras linhas da planilha —
 * relatórios reais (ex.: exportações de sistemas de TMS) costumam vir com 1-3 linhas de
 * título/metadados ("RELATÓRIO COMPLETO...", "Gerado em: ...") antes da linha de colunas.
 * Pontua cada linha escaneada pela quantidade de células que batem com um alias conhecido
 * e usa a de maior pontuação; sem nenhuma batida em lugar nenhum, assume a primeira linha
 * (comportamento anterior, para não quebrar planilhas simples já sem esse problema).
 */
function detectarLinhaCabecalho(rawRows: any[][], reverseAliasMap: Record<string, string>): number {
  let melhorIndice = 0;
  let melhorPontuacao = -1;
  const limite = Math.min(rawRows.length, 15);
  for (let i = 0; i < limite; i++) {
    const linha = rawRows[i] || [];
    const pontuacao = linha.reduce(
      (acc: number, celula) => acc + (reverseAliasMap[normalizeKey(String(celula ?? ''))] ? 1 : 0),
      0
    );
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorIndice = i;
    }
  }
  return melhorIndice;
}

/** Lê um arquivo .xlsx/.xls/.csv e retorna a primeira planilha como linhas objeto (cabeçalho -> valor),
 *  detectando automaticamente em qual linha está o cabeçalho real (ver `detectarLinhaCabecalho`). */
export function readSpreadsheetFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve([]);
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
        const headerRowIndex = detectarLinhaCabecalho(rawRows, buildReverseAliasMap());
        const headers = (rawRows[headerRowIndex] || []).map((h) => String(h ?? '').trim());
        const rows: Record<string, any>[] = [];
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
          const rawRow = rawRows[i] || [];
          const linhaVazia = rawRow.every((celula) => celula === '' || celula === undefined || celula === null);
          if (linhaVazia) continue;
          const obj: Record<string, any> = {};
          headers.forEach((header, colIdx) => {
            if (header) obj[header] = rawRow[colIdx] ?? '';
          });
          rows.push(obj);
        }
        resolve(rows);
      } catch (err: any) {
        reject(new Error(`Falha ao processar a planilha: ${err.message || 'formato inválido'}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export interface ImportacaoFaturamentoAereoResultado {
  lancamentos: LancamentoFaturamentoAereo[];
  faturas: FaturaAereo[];
  avisos: string[];
  totalLinhasLidas: number;
  totalLinhasIgnoradas: number;
}

/** Converte as linhas brutas da planilha em Lançamentos + Faturas prontos para importar.
 *  `modalPadrao` é usado quando a planilha não tem uma coluna "Modal" preenchida na linha —
 *  a importação do Farma Rodoviário passa 'Rodoviário' aqui pra marcar tudo corretamente
 *  mesmo sem o usuário precisar adicionar essa coluna manualmente; a do Farma Aéreo não passa
 *  nada, preservando o comportamento de sempre (modal só vem se a planilha trouxer). */
export function mapRowsToFaturamentoAereo(
  rows: Record<string, any>[],
  clientesConhecidos: Cliente[],
  modalPadrao?: string
): ImportacaoFaturamentoAereoResultado {
  const reverseAliasMap = buildReverseAliasMap();
  const avisos: string[] = [];
  const lancamentos: LancamentoFaturamentoAereo[] = [];
  // Chave "cliente|numeroFatura" -> FaturaAereo (evita duplicar faturas já criadas nesta importação)
  const faturasPorChave = new Map<string, FaturaAereo>();
  let totalLinhasIgnoradas = 0;
  const now = new Date().toISOString();

  rows.forEach((rawRow, idx) => {
    const row: Record<string, any> = {};
    Object.entries(rawRow).forEach(([header, value]) => {
      const field = reverseAliasMap[normalizeKey(header)];
      if (field) row[field] = value;
    });

    const clienteNomeBruto = String(row.clienteNome || '').trim();
    const notaFiscalBruta = String(row.notaFiscal || '').trim();
    const numeroCteBruto = String(row.numeroCte || '').trim();
    // Sem cliente OU sem nenhum documento (NF/CT-e) não é um lançamento de verdade — evita
    // ler como CT-e linhas de total/assinatura institucional que sobram abaixo da tabela em
    // planilhas exportadas pelo próprio sistema (ex.: "TOTAL DA FATURA", rodapé da JMT).
    if (!clienteNomeBruto || (!notaFiscalBruta && !numeroCteBruto)) {
      totalLinhasIgnoradas++;
      return;
    }

    const valorPrestacao = parseNumberish(row.valorPrestacao);
    const custoExtra = parseNumberish(row.custoExtra);
    const valorACobrarInformado = parseNumberish(row.valorACobrar);
    const valorACobrar =
      valorACobrarInformado ?? (valorPrestacao || 0) + (custoExtra || 0);

    if (valorACobrarInformado === undefined && !valorPrestacao && !custoExtra) {
      avisos.push(
        `Registro ${idx + 1} (${clienteNomeBruto}, NF ${row.notaFiscal || row.numeroCte || '?'}): sem "Valor a Cobrar do Cliente" nem "Valor da Prestação/Custo Extra" — lançamento importado com valor R$ 0,00.`
      );
    }

    // Tenta casar com um cliente já cadastrado no sistema (nome fantasia ou razão social)
    const clienteEncontrado = clientesConhecidos.find((c) => {
      const alvo = normalizeKey(clienteNomeBruto);
      return (
        normalizeKey(c.razaoSocial || '') === alvo ||
        normalizeKey(c.nomeFantasia || '') === alvo ||
        normalizeKey(c.razaoSocial || '').includes(alvo) ||
        alvo.includes(normalizeKey(c.nomeFantasia || ''))
      );
    });

    const numeroFatura = String(row.numeroFatura || '').trim();
    const periodo = String(row.periodo || '').trim();

    let faturaId: string | undefined;
    if (numeroFatura) {
      const chave = `${normalizeKey(clienteNomeBruto)}|${normalizeKey(numeroFatura)}`;
      let fatura = faturasPorChave.get(chave);
      if (!fatura) {
        fatura = {
          id: `fatura-aereo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          clienteId: clienteEncontrado?.id,
          clienteNome: clienteEncontrado?.nomeFantasia || clienteEncontrado?.razaoSocial || clienteNomeBruto,
          numeroFatura,
          periodo: periodo || '—',
          modal: row.modal ? String(row.modal) : modalPadrao,
          criadoEm: now,
        };
        faturasPorChave.set(chave, fatura);
      }
      faturaId = fatura.id;
    }

    const novoLancamento: LancamentoFaturamentoAereo = {
      id: `lanc-fat-aereo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      clienteId: clienteEncontrado?.id,
      clienteNome: clienteEncontrado?.nomeFantasia || clienteEncontrado?.razaoSocial || clienteNomeBruto,
      cnpjRemetente: row.cnpjRemetente ? String(row.cnpjRemetente) : undefined,
      estadoRemetente: row.estadoRemetente || undefined,
      cidadeRemetente: row.cidadeRemetente || undefined,
      remetenteLab: row.remetenteLab ? String(row.remetenteLab) : undefined,
      destinatario: row.destinatario || undefined,
      cnpjDestinatario: row.cnpjDestinatario ? String(row.cnpjDestinatario) : undefined,
      estadoDestino: row.estadoDestino || undefined,
      cidadeDestino: row.cidadeDestino || undefined,
      bairroDestino: row.bairroDestino || undefined,
      notaFiscal: row.notaFiscal ? String(row.notaFiscal) : undefined,
      valorNF: parseNumberish(row.valorNF),
      valorPrestacao,
      dataEmissao: parseDateish(row.dataEmissao),
      numeroCte: row.numeroCte ? String(row.numeroCte) : undefined,
      ctrc: row.ctrc ? String(row.ctrc) : undefined,
      modal: row.modal ? String(row.modal) : modalPadrao,
      pesoKg: parseNumberish(row.pesoKg),
      pesoTaxado: parseNumberish(row.pesoTaxado),
      volumes: parseNumberish(row.volumes),
      tipoCustoExtra: row.tipoCustoExtra || undefined,
      custoExtra,
      custoDescarga: parseNumberish(row.custoDescarga),
      valorACobrar,
      valorRecebido: parseNumberish(row.valorRecebido),
      confirmacaoPagamento: parseBooleanish(row.confirmacaoPagamento),
      dataConclusao: parseDateish(row.dataConclusao),
      nfEmitida: row.nfEmitida ? parseBooleanish(row.nfEmitida) : undefined,
      faturaId,
      observacao: row.observacao || undefined,
      criadoEm: now,
    };
    // Recalcula pelo tarifário do cliente (mesma fórmula do Controle Financeiro) quando o
    // cliente já está cadastrado no sistema — evita importar tudo com "Valor a Cobrar" R$ 0,00
    // quando o relatório de origem (ex.: exportação do TMS) não traz esse valor já calculado.
    // Sem tarifário suficiente, `computeValorACobrar` mantém o valor bruto do arquivo.
    novoLancamento.valorACobrar = computeValorACobrar(novoLancamento, clienteEncontrado);
    lancamentos.push(novoLancamento);
  });

  return {
    lancamentos,
    faturas: Array.from(faturasPorChave.values()),
    avisos,
    totalLinhasLidas: rows.length,
    totalLinhasIgnoradas,
  };
}
