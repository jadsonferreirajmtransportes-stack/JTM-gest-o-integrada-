// ============================================================================
// Farma Rodoviário — Performance das baixas (ver migração 099_baixas_performance.sql).
// O escritório importa a planilha "Relatório de documentos" do dia (baixas dos
// motoristas); aqui ficam a leitura do Excel, a gravação e as contas dos painéis.
// ============================================================================

import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

export interface BaixaUpload {
  id: string;
  responsavel: string;
  base: string;
  dataReferencia: string; // YYYY-MM-DD
  arquivoNome?: string;
  total: number;
  entregues: number;
  comprovadas: number;
  noPrazo: number;
  /** Notas abonadas (fora da conta) — migração 102. */
  abonadas?: number;
  criadoPor?: string;
  criadoEm: string;
}

export interface BaixaNota {
  id: string;
  uploadId: string;
  numero: string;
  status?: string;
  situacao?: string;
  remetente?: string;
  destinatario?: string;
  cidade?: string;
  transportadora?: string;
  romaneio?: string;
  motorista?: string;
  dataEmissao?: string;
  dataEntrega?: string;
  prazo?: string;
  entregaTardiaEm?: string;
  entregaTardiaPor?: string;
  /** Entrega real registrada no dia da planilha = conta como no prazo (migração 110). */
  entregaTardiaNoPrazo?: boolean;
  cnpjRemetente?: string;
  /** Valor da nota fiscal (coluna "Valor NF" da planilha) — vai para o Controle Financeiro (migração 109). */
  valorNf?: number;
  /** Abono: pendência que não conta contra ninguém (expedição, local fechado...). */
  abonoMotivo?: string;
  abonoObs?: string;
  abonadoEm?: string;
  abonadoPor?: string;
}

export const MOTIVOS_ABONO = [
  'Pendência na expedição',
  'Local de entrega fechado',
  'Sem recebedor / cliente ausente',
  'Endereço não localizado',
  'Reagendado pelo cliente',
  'Outro',
];

export interface ContagemBaixas {
  /** Notas que contam (sem as abonadas). */
  total: number;
  entregues: number;
  comprovadas: number;
  noPrazo: number;
  abonadas?: number;
}

/** Regras de contagem (as mesmas da função baixas_resumo_mes no banco). */
export const notaEntregue = (n: Pick<BaixaNota, 'situacao' | 'entregaTardiaEm'>) =>
  !!n.entregaTardiaEm || !['PENDENTE', 'DEVOLUCAO', 'DEVOLUÇÃO', ''].includes((n.situacao || '').toUpperCase());
export const notaComprovada = (n: Pick<BaixaNota, 'status'>) => (n.status || '').toUpperCase() === 'COMPROVADO';
export const notaNoPrazo = (n: Pick<BaixaNota, 'prazo' | 'entregaTardiaEm' | 'entregaTardiaNoPrazo'>) =>
  n.entregaTardiaEm ? !!n.entregaTardiaNoPrazo : (n.prazo || '').toUpperCase() === 'NO PRAZO';
export const notaAbonada = (n: Pick<BaixaNota, 'abonoMotivo'>) => !!n.abonoMotivo;
export const notaPendente = (n: BaixaNota) => !notaAbonada(n) && !notaEntregue(n);

export function contar(todas: BaixaNota[]): ContagemBaixas {
  const notas = todas.filter((n) => !notaAbonada(n));
  return {
    abonadas: todas.length - notas.length,
    total: notas.length,
    entregues: notas.filter(notaEntregue).length,
    comprovadas: notas.filter(notaComprovada).length,
    noPrazo: notas.filter(notaNoPrazo).length,
  };
}
export const pct = (parte: number, total: number) => (total ? (parte / total) * 100 : 0);

// ---------------------------------------------------------------------------
// Leitura da planilha
// ---------------------------------------------------------------------------
const norm = (t: unknown) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();

/** "30/10/2026 00:00" (ou Date do Excel) → ISO com fuso de Natal. */
function dataHora(v: unknown): string | undefined {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(`${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}T${String(d.H).padStart(2, '0')}:${String(d.M).padStart(2, '0')}:00-03:00`).toISOString();
  }
  const m = String(v ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return undefined;
  return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4] || '00'}:${m[5] || '00'}:00-03:00`).toISOString();
}
export const diaLocal = (iso?: string) => (iso ? new Date(Date.parse(iso) - 3 * 3600 * 1000).toISOString().slice(0, 10) : '');

export interface PlanilhaBaixas {
  notas: Omit<BaixaNota, 'id' | 'uploadId'>[];
  /** Data sugerida para a referência: o dia da entrega mais comum (sem entregas: nome do arquivo ou emissão). */
  dataSugerida?: string;
}

export function lerPlanilhaBaixas(dados: ArrayBuffer, nomeArquivo: string): PlanilhaBaixas {
  const wb = XLSX.read(dados, { type: 'array' });
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  const iCab = linhas.findIndex((l) => l.map(norm).includes('NUMERO') && l.map(norm).includes('MOTORISTA'));
  if (iCab < 0) throw new Error('Não achei as colunas "Numero" e "Motorista". Use a planilha "Relatório de documentos" exportada do sistema de baixas.');
  const cab = linhas[iCab].map(norm);
  const col = (nome: string) => cab.indexOf(nome);
  const c = {
    numero: col('NUMERO'),
    status: col('STATUS'),
    situacao: col('SITUACAO'),
    remetente: col('REMETENTE'),
    cnpjRemetente: col('CNPJ REMETENTE'),
    destinatario: col('DESTINATARIO'),
    transportadora: col('TRANSPORTADORA'),
    cidade: col('CIDADE'),
    romaneio: col('ROMANEIO'),
    motorista: col('MOTORISTA'),
    emissao: col('DATA EMISSAO'),
    entrega: col('DATA ENTREGA'),
    prazo: col('PRAZO'),
    // Valor da nota: "VALOR NF", "VALOR NOTA", "VALOR DA NOTA FISCAL"... (ou "VALOR MERCADORIA"/"VALOR").
    valorNf: (() => {
      const achar = (teste: (h: string) => boolean) => cab.findIndex((h) => typeof h === 'string' && teste(h));
      const i = achar((h) => /^(VALOR|VLR)/.test(h) && /\b(NF|NFE|NOTA)\b/.test(h));
      if (i >= 0) return i;
      const j = achar((h) => /^(VALOR|VLR)/.test(h) && /MERCADORIA|PRODUTO/.test(h));
      return j >= 0 ? j : achar((h) => h === 'VALOR' || h === 'VALOR TOTAL');
    })(),
  };
  const txt = (l: unknown[], i: number) => (i >= 0 ? String(l[i] ?? '').trim() : '') || undefined;
  /** 1234.5 | "1.234,50" | "R$ 1.234,50" → número. */
  const valor = (l: unknown[], i: number): number | undefined => {
    if (i < 0) return undefined;
    const v = l[i];
    if (typeof v === 'number') return isFinite(v) && v > 0 ? v : undefined;
    let s = String(v ?? '').replace(/[^\d.,-]/g, '');
    if (!s) return undefined;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return isFinite(n) && n > 0 ? n : undefined;
  };
  const notas = linhas
    .slice(iCab + 1)
    .filter((l) => txt(l, c.numero))
    .map((l) => ({
      numero: txt(l, c.numero)!,
      status: txt(l, c.status)?.toUpperCase(),
      situacao: txt(l, c.situacao)?.toUpperCase(),
      remetente: txt(l, c.remetente),
      cnpjRemetente: txt(l, c.cnpjRemetente),
      valorNf: valor(l, c.valorNf),
      destinatario: txt(l, c.destinatario),
      cidade: txt(l, c.cidade),
      transportadora: txt(l, c.transportadora),
      romaneio: txt(l, c.romaneio),
      motorista: txt(l, c.motorista),
      dataEmissao: dataHora(c.emissao >= 0 ? l[c.emissao] : ''),
      dataEntrega: dataHora(c.entrega >= 0 ? l[c.entrega] : ''),
      prazo: txt(l, c.prazo)?.toUpperCase(),
    }));
  if (!notas.length) throw new Error('A planilha não tem nenhuma nota.');
  // Data de referência = o DIA DA ENTREGA (a data mais comum nas entregas da planilha). Sem
  // nenhuma entrega, vale o fim do período do nome do arquivo ("(30-10-2026 até 30-10-2026)
  // Relatório de documentos.xlsx", que é o filtro de emissão) e, por último, a emissão mais comum.
  const maisComum = (datas: (string | undefined)[]) => {
    const cont = new Map<string, number>();
    datas.forEach((d) => d && cont.set(diaLocal(d), (cont.get(diaLocal(d)) || 0) + 1));
    return [...cont.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0];
  };
  const m = nomeArquivo.match(/(\d{2})-(\d{2})-(\d{4})\s*at[ée]\s*(\d{2})-(\d{2})-(\d{4})/i);
  const dataSugerida = maisComum(notas.map((n) => n.dataEntrega)) || (m ? `${m[6]}-${m[5]}-${m[4]}` : undefined) || maisComum(notas.map((n) => n.dataEmissao));
  return { notas, dataSugerida };
}

// ---------------------------------------------------------------------------
// Banco
// ---------------------------------------------------------------------------
function falhou(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
const u = <T,>(v: T | null | undefined) => (v === null ? undefined : v);
const novoId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const rowToUpload = (r: any): BaixaUpload => ({
  id: r.id,
  responsavel: r.responsavel,
  base: r.base,
  dataReferencia: r.data_referencia,
  arquivoNome: u(r.arquivo_nome),
  total: r.total,
  entregues: r.entregues,
  comprovadas: r.comprovadas,
  noPrazo: r.no_prazo,
  abonadas: r.abonadas ?? 0,
  criadoPor: u(r.criado_por),
  criadoEm: r.criado_em,
});
const rowToNota = (r: any): BaixaNota => ({
  id: r.id,
  uploadId: r.upload_id,
  numero: r.numero,
  status: u(r.status),
  situacao: u(r.situacao),
  remetente: u(r.remetente),
  destinatario: u(r.destinatario),
  cidade: u(r.cidade),
  transportadora: u(r.transportadora),
  romaneio: u(r.romaneio),
  motorista: u(r.motorista),
  dataEmissao: u(r.data_emissao),
  dataEntrega: u(r.data_entrega),
  prazo: u(r.prazo),
  entregaTardiaEm: u(r.entrega_tardia_em),
  entregaTardiaPor: u(r.entrega_tardia_por),
  entregaTardiaNoPrazo: r.entrega_tardia_no_prazo ?? undefined,
  abonoMotivo: u(r.abono_motivo),
  abonoObs: u(r.abono_obs),
  abonadoEm: u(r.abonado_em),
  abonadoPor: u(r.abonado_por),
});

export async function getUploadsBaixas(): Promise<BaixaUpload[]> {
  const { data, error } = await supabase.from('baixas_uploads').select('*').order('data_referencia', { ascending: false });
  falhou(error, 'getUploadsBaixas');
  return (data ?? []).map(rowToUpload);
}

export async function getNotasDoUpload(uploadId: string): Promise<BaixaNota[]> {
  const todas: BaixaNota[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from('baixas_notas').select('*').eq('upload_id', uploadId).order('numero').range(de, de + 999);
    falhou(error, 'getNotasDoUpload');
    todas.push(...(data ?? []).map(rowToNota));
    if (!data || data.length < 1000) break;
  }
  return todas;
}

/** Busca uma nota fiscal em todas as importações (até 50). */
export async function buscarNotaBaixas(numero: string): Promise<BaixaNota[]> {
  const { data, error } = await supabase.from('baixas_notas').select('*').ilike('numero', `%${numero.trim()}%`).limit(50);
  falhou(error, 'buscarNotaBaixas');
  return (data ?? []).map(rowToNota);
}

/** Grava uma importação. Se já existe a do mesmo responsável, dia e base, ela é substituída. */
export async function salvarUploadBaixas(p: {
  responsavel: string;
  base: string;
  dataReferencia: string;
  arquivoNome?: string;
  notas: Omit<BaixaNota, 'id' | 'uploadId'>[];
  criadoPor?: string;
}): Promise<BaixaUpload> {
  const { data: existente, error: e1 } = await supabase
    .from('baixas_uploads')
    .select('id')
    .ilike('responsavel', p.responsavel.trim())
    .eq('data_referencia', p.dataReferencia)
    .eq('base', p.base);
  falhou(e1, 'salvarUploadBaixas (procurar)');
  for (const x of existente ?? []) {
    const { error } = await supabase.from('baixas_uploads').delete().eq('id', x.id);
    falhou(error, 'salvarUploadBaixas (substituir)');
  }
  const id = novoId('bxu');
  const cont = contar(p.notas as BaixaNota[]);
  const { error: e2 } = await supabase.from('baixas_uploads').insert({
    id,
    responsavel: p.responsavel.trim(),
    base: p.base,
    data_referencia: p.dataReferencia,
    arquivo_nome: p.arquivoNome || null,
    total: cont.total,
    entregues: cont.entregues,
    comprovadas: cont.comprovadas,
    no_prazo: cont.noPrazo,
    criado_por: p.criadoPor || null,
  });
  falhou(e2, 'salvarUploadBaixas');
  const linhas = p.notas.map((n) => ({
    id: novoId('bxn'),
    upload_id: id,
    numero: n.numero,
    status: n.status ?? null,
    situacao: n.situacao ?? null,
    remetente: n.remetente ?? null,
    destinatario: n.destinatario ?? null,
    cidade: n.cidade ?? null,
    transportadora: n.transportadora ?? null,
    romaneio: n.romaneio ?? null,
    motorista: n.motorista ?? null,
    data_emissao: n.dataEmissao ?? null,
    data_entrega: n.dataEntrega ?? null,
    prazo: n.prazo ?? null,
    cnpj_remetente: n.cnpjRemetente ?? null,
    valor_nf: n.valorNf ?? null,
  }));
  for (let k = 0; k < linhas.length; k += 500) {
    const { error } = await supabase.from('baixas_notas').insert(linhas.slice(k, k + 500));
    if (error) {
      await supabase.from('baixas_uploads').delete().eq('id', id);
      falhou(error, 'salvarUploadBaixas (notas)');
    }
  }
  // Notas do dia viram lançamentos no Controle Financeiro do Farma Rodoviário (migração 105).
  await supabase.rpc('baixas__lancar_financeiro', { p_upload: id }).then(({ error }) => error && console.warn('Lançar no financeiro:', error.message));
  return { id, responsavel: p.responsavel.trim(), base: p.base, dataReferencia: p.dataReferencia, arquivoNome: p.arquivoNome, ...cont, criadoPor: p.criadoPor, criadoEm: new Date().toISOString() };
}

export async function excluirUploadBaixas(id: string): Promise<void> {
  const { error } = await supabase.from('baixas_uploads').delete().eq('id', id);
  falhou(error, 'excluirUploadBaixas');
}

/** Pendente que foi entregue depois: conta como entregue, fora do prazo. Atualiza os totais da importação. */
export async function registrarEntregaTardia(nota: BaixaNota, quando: string, por: string | undefined, notasDoUpload: BaixaNota[], diaPlanilha?: string): Promise<BaixaNota> {
  const { error } = await supabase.from('baixas_notas').update({ entrega_tardia_em: quando, entrega_tardia_por: por || null }).eq('id', nota.id);
  falhou(error, 'registrarEntregaTardia');
  const atualizada = { ...nota, entregaTardiaEm: quando, entregaTardiaPor: por, entregaTardiaNoPrazo: diaPlanilha ? new Date(quando).toLocaleDateString('sv-SE', { timeZone: 'America/Fortaleza' }) <= diaPlanilha : false };
  const cont = contar(notasDoUpload.map((n) => (n.id === nota.id ? atualizada : n)));
  await supabase.from('baixas_uploads').update({ entregues: cont.entregues, no_prazo: cont.noPrazo }).eq('id', nota.uploadId);
  return atualizada;
}

/** Abona uma pendência (ou desfaz, com motivo vazio). Atualiza os totais da importação. */
export async function abonarNota(nota: BaixaNota, motivo: string, obs: string, por: string | undefined, notasDoUpload: BaixaNota[]): Promise<BaixaNota> {
  const limpar = !motivo;
  const dados = {
    abono_motivo: limpar ? null : motivo,
    abono_obs: limpar ? null : obs.trim() || null,
    abonado_em: limpar ? null : new Date().toISOString(),
    abonado_por: limpar ? null : por || null,
  };
  const { error } = await supabase.from('baixas_notas').update(dados).eq('id', nota.id);
  falhou(error, 'abonarNota (rode a migração 102 no Supabase, se ainda não rodou)');
  const atualizada: BaixaNota = { ...nota, abonoMotivo: dados.abono_motivo || undefined, abonoObs: dados.abono_obs || undefined, abonadoEm: dados.abonado_em || undefined, abonadoPor: dados.abonado_por || undefined };
  const cont = contar(notasDoUpload.map((n) => (n.id === nota.id ? atualizada : n)));
  await supabase
    .from('baixas_uploads')
    .update({ total: cont.total, entregues: cont.entregues, comprovadas: cont.comprovadas, no_prazo: cont.noPrazo, abonadas: cont.abonadas ?? 0 })
    .eq('id', nota.uploadId);
  return atualizada;
}

// ---------------------------------------------------------------------------
// Painel do mês
// ---------------------------------------------------------------------------
export interface ResumoMotorista extends ContagemBaixas {
  motorista: string;
  base: string;
}
export interface ResumoResponsavel extends ContagemBaixas {
  responsavel: string;
  base: string;
  dias: { data: string; importadoEm: string }[];
}
export interface ResumoMes extends ContagemBaixas {
  motoristas: ResumoMotorista[];
  responsaveis: ResumoResponsavel[];
}

export async function getResumoMes(mes: string, base?: string): Promise<ResumoMes> {
  const { data, error } = await supabase.rpc('baixas_resumo_mes', { p_mes: mes, p_base: base || null });
  falhou(error, 'getResumoMes');
  return data as ResumoMes;
}

// ---------------------------------------------------------------------------
// Regras de pontuação — editáveis no sistema (baixas_config, migração 101)
// ---------------------------------------------------------------------------
export interface RegrasBaixas {
  responsavel: {
    /** Pesos em % (somam 100). */
    pesoRegularidade: number;
    pesoComprovacao: number;
    pesoEntrega: number;
    /** A planilha do dia vale "no prazo" se importada até N dias úteis depois (0 = no mesmo dia). */
    diasParaImportar: number;
  };
  motorista: {
    pesoEntrega: number;
    pesoPrazo: number;
    pesoComprovacao: number;
    /** Mínimo de notas no mês para entrar no ranking. */
    minimoNotas: number;
  };
  /** Meta de entrega (%): abaixo dela, o número aparece em vermelho. */
  metaEntrega: number;
  /** Motivos que aparecem na hora de abonar uma pendência. */
  motivosAbono: string[];
}

export const REGRAS_PADRAO: RegrasBaixas = {
  responsavel: { pesoRegularidade: 20, pesoComprovacao: 40, pesoEntrega: 40, diasParaImportar: 1 },
  motorista: { pesoEntrega: 100, pesoPrazo: 0, pesoComprovacao: 0, minimoNotas: 1 },
  metaEntrega: 95,
  motivosAbono: MOTIVOS_ABONO,
};

/** Junta o salvo com o padrão (campos novos ganham o valor padrão). */
export function normalizarRegras(r?: Partial<RegrasBaixas> | null): RegrasBaixas {
  return {
    responsavel: { ...REGRAS_PADRAO.responsavel, ...(r?.responsavel || {}) },
    motorista: { ...REGRAS_PADRAO.motorista, ...(r?.motorista || {}) },
    metaEntrega: r?.metaEntrega ?? REGRAS_PADRAO.metaEntrega,
    motivosAbono: Array.isArray(r?.motivosAbono) && r!.motivosAbono.length ? r!.motivosAbono : MOTIVOS_ABONO,
  };
}

export async function getRegrasBaixas(): Promise<RegrasBaixas> {
  const { data, error } = await supabase.from('baixas_config').select('regras').eq('id', 1).maybeSingle();
  if (error) return REGRAS_PADRAO; // antes da migração 101: regras padrão
  return normalizarRegras(data?.regras);
}

export async function salvarRegrasBaixas(r: RegrasBaixas, por?: string): Promise<void> {
  const { error } = await supabase.from('baixas_config').upsert({ id: 1, regras: r, atualizado_por: por || null, atualizado_em: new Date().toISOString() });
  falhou(error, 'salvarRegrasBaixas (rode a migração 101 no Supabase, se ainda não rodou)');
}

/** Texto curto da fórmula (painel e dossiê). */
export function explicarRegrasResponsavel(r: RegrasBaixas): string {
  const prazo = r.responsavel.diasParaImportar === 0 ? 'no mesmo dia' : `até ${r.responsavel.diasParaImportar} dia(s) útil(eis) depois`;
  return `Pontos = ${r.responsavel.pesoRegularidade}% regularidade (planilha do dia importada ${prazo} ÷ dias de operação) + ${r.responsavel.pesoComprovacao}% comprovação + ${r.responsavel.pesoEntrega}% entrega.`;
}
export function explicarRegrasMotorista(r: RegrasBaixas): string {
  const p = r.motorista;
  const partes = [p.pesoEntrega && `${p.pesoEntrega}% entrega`, p.pesoPrazo && `${p.pesoPrazo}% no prazo`, p.pesoComprovacao && `${p.pesoComprovacao}% comprovação`].filter(Boolean);
  return `Pontos = ${partes.join(' + ')}${p.minimoNotas > 1 ? ` · mínimo de ${p.minimoNotas} notas no mês para entrar no ranking` : ''}.`;
}

/** Dias de operação do mês: os dias em que pelo menos um responsável (da base) importou.
 *  Assim sábados trabalhados e feriados se resolvem sozinhos. */
export function diasDeOperacao(r: ResumoResponsavel[]): string[] {
  return Array.from(new Set(r.flatMap((x) => (x.dias || []).map((d) => d.data)))).sort();
}

/** N dias úteis depois de uma data (prazo para importar a planilha do dia). 0 = a própria data. */
export function diasUteisDepois(iso: string, n: number, feriados: Set<string> = new Set()): string {
  const dt = new Date(`${iso}T12:00:00Z`);
  for (let i = 0; i < n; i++) {
    do dt.setUTCDate(dt.getUTCDate() + 1);
    while (dt.getUTCDay() === 0 || dt.getUTCDay() === 6 || feriados.has(dt.toISOString().slice(0, 10)));
  }
  return dt.toISOString().slice(0, 10);
}

export interface DesempenhoResponsavel extends ResumoResponsavel {
  pontos: number;
  regularidade: number;
  comprovacao: number;
  entrega: number;
  diasNoPrazo: number;
  diasEsperados: number;
  diasFaltantes: string[];
}

export function desempenhoResponsavel(r: ResumoResponsavel, diasOperacao: string[], regras: RegrasBaixas = REGRAS_PADRAO, feriados: Set<string> = new Set()): DesempenhoResponsavel {
  const importados = new Map((r.dias || []).map((d) => [d.data, d.importadoEm]));
  const diasFaltantes = diasOperacao.filter((d) => !importados.has(d));
  const diasNoPrazo = [...importados.entries()].filter(([d, em]) => diaLocal(em) <= diasUteisDepois(d, regras.responsavel.diasParaImportar, feriados)).length;
  const diasEsperados = Math.max(diasOperacao.length, importados.size);
  const regularidade = diasEsperados ? Math.min(100, pct(diasNoPrazo, diasEsperados)) : 100;
  const comprovacao = pct(r.comprovadas, r.total);
  const entrega = pct(r.entregues, r.total);
  const p = regras.responsavel;
  const soma = p.pesoRegularidade + p.pesoComprovacao + p.pesoEntrega || 1;
  const pontos = (p.pesoRegularidade * regularidade + p.pesoComprovacao * comprovacao + p.pesoEntrega * entrega) / soma;
  return { ...r, pontos, regularidade, comprovacao, entrega, diasNoPrazo, diasEsperados, diasFaltantes };
}

export interface DesempenhoMotorista extends ResumoMotorista {
  pontos: number;
  taxa: number; // % de entrega
  noRanking: boolean; // atingiu o mínimo de notas
}

export function desempenhoMotoristas(lista: ResumoMotorista[], regras: RegrasBaixas = REGRAS_PADRAO): DesempenhoMotorista[] {
  const p = regras.motorista;
  const soma = p.pesoEntrega + p.pesoPrazo + p.pesoComprovacao || 1;
  return lista
    .map((m) => {
      const taxa = pct(m.entregues, m.total);
      const pontos = (p.pesoEntrega * taxa + p.pesoPrazo * pct(m.noPrazo, m.total) + p.pesoComprovacao * pct(m.comprovadas, m.total)) / soma;
      return { ...m, taxa, pontos, noRanking: m.total >= (p.minimoNotas || 1) };
    })
    .sort((a, b) => Number(b.noRanking) - Number(a.noRanking) || b.pontos - a.pontos || b.total - a.total);
}

// ---------------------------------------------------------------------------
// Responsáveis que importam pelo link pessoal (migração 100)
// ---------------------------------------------------------------------------
export interface ResponsavelBaixas {
  colaboradorId: string;
  nome: string;
  base: string;
}

export async function getResponsaveisBaixas(): Promise<ResponsavelBaixas[]> {
  const { data, error } = await supabase.from('baixas_responsaveis').select('*').order('nome');
  falhou(error, 'getResponsaveisBaixas');
  return (data ?? []).map((r: any) => ({ colaboradorId: r.colaborador_id, nome: r.nome, base: r.base }));
}

/** Troca a lista inteira (quem sai perde o acesso pelo portal; o histórico fica). */
export async function salvarResponsaveisBaixas(lista: ResponsavelBaixas[]): Promise<void> {
  const atuais = await getResponsaveisBaixas();
  const sair = atuais.filter((a) => !lista.some((l) => l.colaboradorId === a.colaboradorId)).map((a) => a.colaboradorId);
  if (sair.length) {
    const { error } = await supabase.from('baixas_responsaveis').delete().in('colaborador_id', sair);
    falhou(error, 'salvarResponsaveisBaixas (remover)');
  }
  if (lista.length) {
    const { error } = await supabase
      .from('baixas_responsaveis')
      .upsert(lista.map((l) => ({ colaborador_id: l.colaboradorId, nome: l.nome.trim().toUpperCase(), base: l.base.trim() || 'Matriz' })));
    falhou(error, 'salvarResponsaveisBaixas');
  }
}

// Portal (sem login): funções portal_baixas_* com as credenciais do link pessoal.
type Cred = { token: string; cpf: string; nascimento: string };
const args = (c: Cred) => ({ p_token: c.token, p_cpf: c.cpf, p_nascimento: c.nascimento });
const MSG: Record<string, string> = {
  dados: 'Não foi possível confirmar seu acesso. Saia e entre de novo.',
  sem_acesso: 'Esta área não está liberada para você.',
  data: 'Data de referência inválida.',
  notas: 'A planilha não tem notas (ou tem mais de 5.000).',
  nao_encontrada: 'Importação não encontrada.',
};
const rpc = async (nome: string, corpo: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(nome, corpo);
  falhou(error, nome);
  if (data?.erro) throw new Error(MSG[data.erro] || 'Não foi possível concluir.');
  return data;
};

export async function portalBaixasEstado(c: Cred): Promise<{ permitido: boolean; nome?: string; base?: string; uploads: BaixaUpload[]; motivosAbono: string[] }> {
  const d = await rpc('portal_baixas_estado', args(c));
  const motivos = Array.isArray(d?.motivosAbono) && d.motivosAbono.length ? d.motivosAbono : MOTIVOS_ABONO;
  return { permitido: !!d?.permitido, nome: d?.nome, base: d?.base, uploads: d?.uploads ?? [], motivosAbono: motivos };
}
export async function portalBaixasImportar(c: Cred, dataReferencia: string, arquivoNome: string, notas: PlanilhaBaixas['notas']): Promise<string> {
  const d = await rpc('portal_baixas_importar', { ...args(c), p_data: dataReferencia, p_arquivo: arquivoNome, p_notas: notas });
  return d.id;
}
export async function portalBaixasNotas(c: Cred, uploadId: string): Promise<BaixaNota[]> {
  const d = await rpc('portal_baixas_notas', { ...args(c), p_upload: uploadId });
  return d?.notas ?? [];
}
export async function portalBaixasAbonar(c: Cred, nota: BaixaNota, motivo: string, obs: string): Promise<BaixaNota> {
  await rpc('portal_baixas_abonar', { ...args(c), p_nota: nota.id, p_motivo: motivo, p_obs: obs });
  return motivo
    ? { ...nota, abonoMotivo: motivo, abonoObs: obs.trim() || undefined, abonadoEm: new Date().toISOString() }
    : { ...nota, abonoMotivo: undefined, abonoObs: undefined, abonadoEm: undefined, abonadoPor: undefined };
}
export async function portalBaixasTardia(c: Cred, nota: BaixaNota, quando: string): Promise<BaixaNota> {
  await rpc('portal_baixas_tardia', { ...args(c), p_nota: nota.id, p_quando: quando });
  return { ...nota, entregaTardiaEm: quando };
}

// ---------------------------------------------------------------------------
// Ligação com o faturamento pelo número da NF (migração 103)
// ---------------------------------------------------------------------------
/** NF só com os dígitos, sem zeros à esquerda (igual à função baixas__nf do banco). */
export const nfNormalizada = (nf?: string) => (nf || '').replace(/\D/g, '').replace(/^0+/, '');

/** C entregue e comprovada · E entregue sem comprovação · T entrega tardia · A abonada · P pendente */
export type SituacaoEntregaNF = 'C' | 'E' | 'T' | 'A' | 'P';
export const ROTULO_SITUACAO_NF: Record<SituacaoEntregaNF, { rotulo: string; cls: string }> = {
  C: { rotulo: 'Entregue', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  E: { rotulo: 'Entregue s/ comprovante', cls: 'bg-amber-50 text-[#92611F] border-amber-200' },
  T: { rotulo: 'Entrega tardia', cls: 'bg-amber-50 text-[#92611F] border-amber-200' },
  A: { rotulo: 'Abonada', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  P: { rotulo: 'Pendente', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

/** Situação da entrega de cada NF importada desde a data (mapa NF normalizada → código). */
export async function getSituacoesBaixas(desde: string): Promise<Map<string, SituacaoEntregaNF>> {
  const { data, error } = await supabase.rpc('baixas_situacoes_desde', { p_desde: desde });
  falhou(error, 'getSituacoesBaixas');
  return new Map(Object.entries((data || {}) as Record<string, SituacaoEntregaNF>));
}

export interface DetalheBaixaNF {
  numero: string;
  status?: string;
  situacao?: string;
  motorista?: string;
  responsavel: string;
  base: string;
  dataReferencia: string;
  dataEntrega?: string;
  prazo?: string;
  entregaTardiaEm?: string;
  abonoMotivo?: string;
  abonoObs?: string;
  destinatario?: string;
  cidade?: string;
}
export async function getDetalheBaixaNF(nf: string): Promise<DetalheBaixaNF[]> {
  const { data, error } = await supabase.rpc('baixas_detalhe_nf', { p_nf: nf });
  falhou(error, 'getDetalheBaixaNF');
  return (data ?? []) as DetalheBaixaNF[];
}

export interface CruzamentoMes {
  valorTotal: number;
  notasComValor: number;
  motoristas: { motorista: string; valor: number; notas: number; notasComValor: number }[];
  responsaveis: { responsavel: string; valor: number; notas: number; notasComValor: number }[];
  semCteTotal: number;
  semCte: { numero: string; motorista?: string; responsavel: string; data: string; destinatario?: string; cidade?: string }[];
  semBaixaTotal: number;
  semBaixa: string[];
}
/** fat = { NF normalizada: Valor a Cobrar } das NFs do faturamento do período. */
export async function getCruzamentoMes(mes: string, base: string | undefined, fat: Record<string, number>): Promise<CruzamentoMes> {
  const { data, error } = await supabase.rpc('baixas_cruzamento_mes', { p_mes: mes, p_base: base || null, p_fat: fat });
  falhou(error, 'getCruzamentoMes (rode a migração 103 no Supabase, se ainda não rodou)');
  return data as CruzamentoMes;
}

// ---------------------------------------------------------------------------
// Link do motorista (migração 108): cada motorista acompanha o próprio desempenho
// ---------------------------------------------------------------------------
const chaveMotorista = (nome: string) => nome.trim().toUpperCase();
const novoTokenMotorista = () => {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 28);
};
export const urlLinkMotorista = (token: string) => `${window.location.origin}/?form=motorista&t=${token}`;

/** Link do motorista (cria na primeira vez). novo = true troca o link (o anterior para de funcionar). */
export async function obterLinkMotorista(motorista: string, por?: string, novo = false): Promise<string> {
  const chave = chaveMotorista(motorista);
  if (!novo) {
    const { data, error } = await supabase.from('baixas_links_motorista').select('token').eq('motorista', chave).maybeSingle();
    falhou(error, 'obterLinkMotorista (rode a migração 108 no Supabase, se ainda não rodou)');
    if (data?.token) return data.token as string;
  }
  const token = novoTokenMotorista();
  const { error } = await supabase.from('baixas_links_motorista').upsert({ motorista: chave, token, criado_em: new Date().toISOString(), criado_por: por || null });
  falhou(error, 'obterLinkMotorista');
  return token;
}

export interface PainelMotorista {
  erro?: string;
  motorista: string;
  mes: string;
  meses: string[];
  metaEntrega?: number;
  minimoNotas?: number;
  total: number;
  entregues?: number;
  noPrazo?: number;
  comprovadas?: number;
  abonadas?: number;
  pontos?: number | null;
  posicao?: number | null;
  noRanking?: number;
  dias?: { data: string; total: number; entregues: number; noPrazo: number; comprovadas: number }[];
  pendencias?: { numero: string; empresa?: string; destinatario?: string; cidade?: string; emissao?: string; dia: string; prazo?: string }[];
}
export async function getPainelMotorista(token: string, mes?: string): Promise<PainelMotorista> {
  const { data, error } = await supabase.rpc('motorista_baixas_painel', { p_token: token, p_mes: mes || null });
  falhou(error, 'getPainelMotorista');
  return data as PainelMotorista;
}
