// ============================================================================
// Controle de Frequência — acesso ao banco (ver migração 062_controle_frequencia.sql).
// CONTROLE INTERNO: o ponto oficial da empresa continua no sistema atual.
// Lado do DP (logado): jornadas, bases, batidas (ajuste/anulação), justificativas.
// Lado do celular (sem login): ponto_vincular / ponto_estado / ponto_registrar.
// ============================================================================

import { supabase } from './supabaseClient';

export interface JornadaPonto {
  id: string;
  nome: string;
  /** 0 = domingo ... 6 = sábado */
  diasSemana: number[];
  entrada: string; // HH:MM
  saidaIntervalo?: string;
  voltaIntervalo?: string;
  saida: string;
  toleranciaMin: number;
  ativo: boolean;
}

export interface LocalPonto {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  raioM: number;
  ativo: boolean;
}

export interface BatidaPonto {
  id: string;
  colaboradorId: string;
  registradoEm: string; // ISO (UTC)
  origem: 'celular' | 'ajuste';
  latitude?: number;
  longitude?: number;
  precisaoM?: number;
  localNome?: string;
  distanciaM?: number;
  motivo?: string;
  criadoPor?: string;
  anulado: boolean;
  anuladoMotivo?: string;
  anuladoPor?: string;
  anuladoEm?: string;
}

export interface JustificativaDia {
  id: string;
  colaboradorId: string;
  data: string; // YYYY-MM-DD
  tipo: string;
  abona: boolean;
  observacao?: string;
  criadoPor?: string;
}

export const TIPOS_JUSTIFICATIVA: { tipo: string; abona: boolean }[] = [
  { tipo: 'Atestado médico', abona: true },
  { tipo: 'Falta legal (CLT art. 473)', abona: true },
  { tipo: 'Folga / compensação', abona: true },
  { tipo: 'Serviço externo / viagem', abona: true },
  { tipo: 'Férias', abona: true },
  { tipo: 'Afastamento', abona: true },
  { tipo: 'Suspensão disciplinar', abona: false },
  { tipo: 'Falta injustificada', abona: false },
];

function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}
const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : undefined);
const novoId = (prefixo: string) => `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ---- Jornadas ----
function rowToJornada(r: any): JornadaPonto {
  return {
    id: r.id,
    nome: r.nome,
    diasSemana: r.dias_semana ?? [],
    entrada: hhmm(r.entrada)!,
    saidaIntervalo: hhmm(r.saida_intervalo),
    voltaIntervalo: hhmm(r.volta_intervalo),
    saida: hhmm(r.saida)!,
    toleranciaMin: Number(r.tolerancia_min ?? 15),
    ativo: r.ativo !== false,
  };
}
export async function getJornadas(): Promise<JornadaPonto[]> {
  const { data, error } = await supabase.from('ponto_jornadas').select('*').order('nome');
  assertNoError(error, 'getJornadas');
  return (data ?? []).map(rowToJornada);
}
export async function saveJornada(j: JornadaPonto): Promise<JornadaPonto> {
  const registro = j.id ? j : { ...j, id: novoId('jor') };
  const { error } = await supabase.from('ponto_jornadas').upsert({
    id: registro.id,
    nome: registro.nome,
    dias_semana: registro.diasSemana,
    entrada: registro.entrada,
    saida_intervalo: registro.saidaIntervalo || null,
    volta_intervalo: registro.voltaIntervalo || null,
    saida: registro.saida,
    tolerancia_min: registro.toleranciaMin,
    ativo: registro.ativo,
  });
  assertNoError(error, 'saveJornada');
  return registro;
}
export async function deleteJornada(id: string): Promise<void> {
  const { error } = await supabase.from('ponto_jornadas').delete().eq('id', id);
  assertNoError(error, 'deleteJornada');
}

/** colaboradorId → jornadaId */
export async function getJornadasColaboradores(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('ponto_colaborador_jornada').select('colaborador_id, jornada_id');
  assertNoError(error, 'getJornadasColaboradores');
  return new Map((data ?? []).map((r: any) => [r.colaborador_id, r.jornada_id]));
}
export async function definirJornadaColaboradores(colaboradorIds: string[], jornadaId: string | null): Promise<void> {
  if (colaboradorIds.length === 0) return;
  if (!jornadaId) {
    const { error } = await supabase.from('ponto_colaborador_jornada').delete().in('colaborador_id', colaboradorIds);
    assertNoError(error, 'definirJornadaColaboradores');
    return;
  }
  const { error } = await supabase
    .from('ponto_colaborador_jornada')
    .upsert(colaboradorIds.map((id) => ({ colaborador_id: id, jornada_id: jornadaId, atualizado_em: new Date().toISOString() })));
  assertNoError(error, 'definirJornadaColaboradores');
}

// ---- Locais ----
function rowToLocal(r: any): LocalPonto {
  return { id: r.id, nome: r.nome, latitude: Number(r.latitude), longitude: Number(r.longitude), raioM: Number(r.raio_m ?? 300), ativo: r.ativo !== false };
}
export async function getLocais(): Promise<LocalPonto[]> {
  const { data, error } = await supabase.from('ponto_locais').select('*').order('nome');
  assertNoError(error, 'getLocais');
  return (data ?? []).map(rowToLocal);
}
export async function saveLocal(l: LocalPonto): Promise<LocalPonto> {
  const registro = l.id ? l : { ...l, id: novoId('loc') };
  const { error } = await supabase.from('ponto_locais').upsert({
    id: registro.id,
    nome: registro.nome,
    latitude: registro.latitude,
    longitude: registro.longitude,
    raio_m: registro.raioM,
    ativo: registro.ativo,
  });
  assertNoError(error, 'saveLocal');
  return registro;
}
export async function deleteLocal(id: string): Promise<void> {
  const { error } = await supabase.from('ponto_locais').delete().eq('id', id);
  assertNoError(error, 'deleteLocal');
}

// ---- Batidas ----
function rowToBatida(r: any): BatidaPonto {
  return {
    id: r.id,
    colaboradorId: r.colaborador_id,
    registradoEm: r.registrado_em,
    origem: r.origem,
    latitude: u(r.latitude),
    longitude: u(r.longitude),
    precisaoM: u(r.precisao_m),
    localNome: u(r.local_nome),
    distanciaM: u(r.distancia_m),
    motivo: u(r.motivo),
    criadoPor: u(r.criado_por),
    anulado: !!r.anulado,
    anuladoMotivo: u(r.anulado_motivo),
    anuladoPor: u(r.anulado_por),
    anuladoEm: u(r.anulado_em),
  };
}

/** Batidas entre duas datas (inclusive), com 1 dia de folga antes/depois por causa das
 *  jornadas que viram a noite. */
export async function getBatidas(deData: string, ateData: string, colaboradorIds?: string[]): Promise<BatidaPonto[]> {
  const inicio = new Date(`${deData}T00:00:00-03:00`);
  inicio.setDate(inicio.getDate() - 1);
  const fim = new Date(`${ateData}T23:59:59-03:00`);
  fim.setDate(fim.getDate() + 1);
  // O Supabase devolve no máximo 1000 linhas por consulta — um mês da empresa toda passa
  // disso (≈ 40 pessoas × 4 batidas × 22 dias), então busca em páginas.
  const PAGINA = 1000;
  const todas: BatidaPonto[] = [];
  for (let de = 0; ; de += PAGINA) {
    let q = supabase
      .from('ponto_registros')
      .select('id, colaborador_id, registrado_em, origem, latitude, longitude, precisao_m, local_nome, distancia_m, motivo, criado_por, anulado, anulado_motivo, anulado_por, anulado_em')
      .gte('registrado_em', inicio.toISOString())
      .lte('registrado_em', fim.toISOString())
      .order('registrado_em')
      .order('id')
      .range(de, de + PAGINA - 1);
    if (colaboradorIds && colaboradorIds.length > 0 && colaboradorIds.length <= 200) q = q.in('colaborador_id', colaboradorIds);
    const { data, error } = await q;
    assertNoError(error, 'getBatidas');
    todas.push(...(data ?? []).map(rowToBatida));
    if (!data || data.length < PAGINA) break;
  }
  return todas;
}

/** Data (local) da primeira batida pelo celular de toda a empresa — antes dela o controle
 *  ainda não existia, então dia sem batida não é falta. */
export async function getInicioControle(): Promise<string | null> {
  const { data, error } = await supabase
    .from('ponto_registros')
    .select('registrado_em')
    .eq('origem', 'celular')
    .order('registrado_em')
    .limit(1);
  assertNoError(error, 'getInicioControle');
  const iso = data?.[0]?.registrado_em as string | undefined;
  return iso ? new Date(Date.parse(iso) - 3 * 3600 * 1000).toISOString().slice(0, 10) : null;
}

/** Ajuste do DP: inclui uma batida (horário local do dia informado) com motivo. */
export async function incluirBatidaAjuste(colaboradorId: string, dataHoraLocal: string, motivo: string, criadoPor?: string): Promise<BatidaPonto> {
  const registro = {
    id: novoId('bat-aj'),
    colaborador_id: colaboradorId,
    registrado_em: new Date(`${dataHoraLocal}:00-03:00`).toISOString(),
    origem: 'ajuste',
    motivo,
    criado_por: criadoPor ?? null,
  };
  const { error } = await supabase.from('ponto_registros').insert(registro);
  assertNoError(error, 'incluirBatidaAjuste');
  return rowToBatida({ ...registro, anulado: false });
}

export async function anularBatida(id: string, motivo: string, anuladoPor?: string): Promise<void> {
  const { error } = await supabase
    .from('ponto_registros')
    .update({ anulado: true, anulado_motivo: motivo, anulado_por: anuladoPor ?? null, anulado_em: new Date().toISOString() })
    .eq('id', id);
  assertNoError(error, 'anularBatida');
}

// ---- Justificativas ----
function rowToJustificativa(r: any): JustificativaDia {
  return { id: r.id, colaboradorId: r.colaborador_id, data: r.data, tipo: r.tipo, abona: !!r.abona, observacao: u(r.observacao), criadoPor: u(r.criado_por) };
}
export async function getJustificativas(deData: string, ateData: string): Promise<JustificativaDia[]> {
  const { data, error } = await supabase.from('ponto_justificativas').select('*').gte('data', deData).lte('data', ateData);
  assertNoError(error, 'getJustificativas');
  return (data ?? []).map(rowToJustificativa);
}
export async function salvarJustificativa(j: Omit<JustificativaDia, 'id'> & { id?: string }): Promise<JustificativaDia> {
  const registro = { ...j, id: j.id || novoId('just') };
  const { error } = await supabase.from('ponto_justificativas').upsert(
    {
      id: registro.id,
      colaborador_id: registro.colaboradorId,
      data: registro.data,
      tipo: registro.tipo,
      abona: registro.abona,
      observacao: registro.observacao || null,
      criado_por: registro.criadoPor || null,
    },
    { onConflict: 'colaborador_id,data' }
  );
  assertNoError(error, 'salvarJustificativa');
  return registro as JustificativaDia;
}
export async function excluirJustificativa(colaboradorId: string, data: string): Promise<void> {
  const { error } = await supabase.from('ponto_justificativas').delete().eq('colaborador_id', colaboradorId).eq('data', data);
  assertNoError(error, 'excluirJustificativa');
}

// ---- Aparelhos ----
export async function desconectarAparelhos(colaboradorId: string): Promise<void> {
  const { error } = await supabase.from('ponto_dispositivos').update({ revogado: true }).eq('colaborador_id', colaboradorId);
  assertNoError(error, 'desconectarAparelhos');
}

export function montarLinkPonto(token: string): string {
  return `${window.location.origin}${window.location.pathname}?form=ponto&token=${token}`;
}

// ---------------------------------------------------------------------------
// Celular (sem login)
// ---------------------------------------------------------------------------
export interface EstadoPonto {
  agora: string;
  colaborador: { nome: string; cargo?: string };
  jornada: any | null;
  batidas: { id: string; em: string; local?: string | null; distancia?: number | null; origem: string }[];
}

export async function pontoVincular(token: string, cpf: string, nascimento: string): Promise<{ dispositivo?: string; erro?: 'link' | 'dados' }> {
  const { data, error } = await supabase.rpc('ponto_vincular', {
    p_token: token,
    p_cpf: cpf,
    p_nascimento: nascimento,
    p_aparelho: navigator.userAgent,
  });
  assertNoError(error, 'pontoVincular');
  return (data ?? {}) as any;
}

export async function pontoEstado(token: string, dispositivo: string): Promise<{ estado?: EstadoPonto; erro?: 'dispositivo' }> {
  const { data, error } = await supabase.rpc('ponto_estado', { p_token: token, p_dispositivo: dispositivo });
  assertNoError(error, 'pontoEstado');
  const r = (data ?? {}) as any;
  if (r.erro) return { erro: r.erro };
  return { estado: r as EstadoPonto };
}

export async function pontoRegistrar(
  token: string,
  dispositivo: string,
  posicao: { latitude: number; longitude: number; precisao: number } | null
): Promise<{ id?: string; em?: string; local?: string | null; distancia?: number | null; erro?: 'dispositivo' | 'repetida' }> {
  const { data, error } = await supabase.rpc('ponto_registrar', {
    p_token: token,
    p_dispositivo: dispositivo,
    p_latitude: posicao?.latitude ?? null,
    p_longitude: posicao?.longitude ?? null,
    p_precisao: posicao?.precisao ?? null,
    p_navegador: navigator.userAgent,
  });
  assertNoError(error, 'pontoRegistrar');
  return (data ?? {}) as any;
}
