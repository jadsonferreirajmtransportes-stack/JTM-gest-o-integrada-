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
}

export interface ContagemBaixas {
  total: number;
  entregues: number;
  comprovadas: number;
  noPrazo: number;
}

/** Regras de contagem (as mesmas da função baixas_resumo_mes no banco). */
export const notaEntregue = (n: Pick<BaixaNota, 'situacao' | 'entregaTardiaEm'>) =>
  !!n.entregaTardiaEm || !['PENDENTE', 'DEVOLUCAO', 'DEVOLUÇÃO', ''].includes((n.situacao || '').toUpperCase());
export const notaComprovada = (n: Pick<BaixaNota, 'status'>) => (n.status || '').toUpperCase() === 'COMPROVADO';
export const notaNoPrazo = (n: Pick<BaixaNota, 'prazo' | 'entregaTardiaEm'>) => (n.prazo || '').toUpperCase() === 'NO PRAZO' && !n.entregaTardiaEm;
export const notaPendente = (n: BaixaNota) => !notaEntregue(n);

export function contar(notas: BaixaNota[]): ContagemBaixas {
  return {
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
  /** Data sugerida para a referência (do nome do arquivo ou a emissão mais comum). */
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
    destinatario: col('DESTINATARIO'),
    transportadora: col('TRANSPORTADORA'),
    cidade: col('CIDADE'),
    romaneio: col('ROMANEIO'),
    motorista: col('MOTORISTA'),
    emissao: col('DATA EMISSAO'),
    entrega: col('DATA ENTREGA'),
    prazo: col('PRAZO'),
  };
  const txt = (l: unknown[], i: number) => (i >= 0 ? String(l[i] ?? '').trim() : '') || undefined;
  const notas = linhas
    .slice(iCab + 1)
    .filter((l) => txt(l, c.numero))
    .map((l) => ({
      numero: txt(l, c.numero)!,
      status: txt(l, c.status)?.toUpperCase(),
      situacao: txt(l, c.situacao)?.toUpperCase(),
      remetente: txt(l, c.remetente),
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
  // Nome do arquivo "(30-10-2026  até  30-10-2026) Relatório de documentos.xlsx".
  const m = nomeArquivo.match(/(\d{2})-(\d{2})-(\d{4})\s*at[ée]\s*(\d{2})-(\d{2})-(\d{4})/i);
  let dataSugerida = m ? `${m[6]}-${m[5]}-${m[4]}` : undefined;
  if (!dataSugerida) {
    const cont = new Map<string, number>();
    notas.forEach((n) => n.dataEmissao && cont.set(diaLocal(n.dataEmissao), (cont.get(diaLocal(n.dataEmissao)) || 0) + 1));
    dataSugerida = [...cont.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }
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
  }));
  for (let k = 0; k < linhas.length; k += 500) {
    const { error } = await supabase.from('baixas_notas').insert(linhas.slice(k, k + 500));
    if (error) {
      await supabase.from('baixas_uploads').delete().eq('id', id);
      falhou(error, 'salvarUploadBaixas (notas)');
    }
  }
  return { id, responsavel: p.responsavel.trim(), base: p.base, dataReferencia: p.dataReferencia, arquivoNome: p.arquivoNome, ...cont, criadoPor: p.criadoPor, criadoEm: new Date().toISOString() };
}

export async function excluirUploadBaixas(id: string): Promise<void> {
  const { error } = await supabase.from('baixas_uploads').delete().eq('id', id);
  falhou(error, 'excluirUploadBaixas');
}

/** Pendente que foi entregue depois: conta como entregue, fora do prazo. Atualiza os totais da importação. */
export async function registrarEntregaTardia(nota: BaixaNota, quando: string, por: string | undefined, notasDoUpload: BaixaNota[]): Promise<BaixaNota> {
  const { error } = await supabase.from('baixas_notas').update({ entrega_tardia_em: quando, entrega_tardia_por: por || null }).eq('id', nota.id);
  falhou(error, 'registrarEntregaTardia');
  const atualizada = { ...nota, entregaTardiaEm: quando, entregaTardiaPor: por };
  const cont = contar(notasDoUpload.map((n) => (n.id === nota.id ? atualizada : n)));
  await supabase.from('baixas_uploads').update({ entregues: cont.entregues, no_prazo: cont.noPrazo }).eq('id', nota.uploadId);
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
}

export const REGRAS_PADRAO: RegrasBaixas = {
  responsavel: { pesoRegularidade: 20, pesoComprovacao: 40, pesoEntrega: 40, diasParaImportar: 1 },
  motorista: { pesoEntrega: 100, pesoPrazo: 0, pesoComprovacao: 0, minimoNotas: 1 },
  metaEntrega: 95,
};

/** Junta o salvo com o padrão (campos novos ganham o valor padrão). */
export function normalizarRegras(r?: Partial<RegrasBaixas> | null): RegrasBaixas {
  return {
    responsavel: { ...REGRAS_PADRAO.responsavel, ...(r?.responsavel || {}) },
    motorista: { ...REGRAS_PADRAO.motorista, ...(r?.motorista || {}) },
    metaEntrega: r?.metaEntrega ?? REGRAS_PADRAO.metaEntrega,
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

export async function portalBaixasEstado(c: Cred): Promise<{ permitido: boolean; nome?: string; base?: string; uploads: BaixaUpload[] }> {
  const d = await rpc('portal_baixas_estado', args(c));
  return { permitido: !!d?.permitido, nome: d?.nome, base: d?.base, uploads: d?.uploads ?? [] };
}
export async function portalBaixasImportar(c: Cred, dataReferencia: string, arquivoNome: string, notas: PlanilhaBaixas['notas']): Promise<string> {
  const d = await rpc('portal_baixas_importar', { ...args(c), p_data: dataReferencia, p_arquivo: arquivoNome, p_notas: notas });
  return d.id;
}
export async function portalBaixasNotas(c: Cred, uploadId: string): Promise<BaixaNota[]> {
  const d = await rpc('portal_baixas_notas', { ...args(c), p_upload: uploadId });
  return d?.notas ?? [];
}
export async function portalBaixasTardia(c: Cred, nota: BaixaNota, quando: string): Promise<BaixaNota> {
  await rpc('portal_baixas_tardia', { ...args(c), p_nota: nota.id, p_quando: quando });
  return { ...nota, entregaTardiaEm: quando };
}
