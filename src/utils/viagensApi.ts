// ============================================================================
// Camada de acesso a dados via Supabase para Farma Rodoviário — Viagens
// (rastreamento operacional: telemetria, checklist, pontos de parada/entrega,
// ocorrências de rota). Mesmo padrão dos outros *Api.ts.
//
// Reaproveita `normalizeViagem` de storage.ts (preenche valores-padrão pra
// campos não informados, ex.: placa/motorista genéricos) — mesma função usada
// há tempos no localStorage, aplicada aqui do mesmo jeito (na leitura e na
// gravação), pra não mudar o comportamento que já existia.
// ============================================================================

import { supabase } from './supabaseClient';
import { normalizeViagem } from './storage';
import { ViagemRodoviaria } from '../types';

function n(v: any): any {
  return v === '' || v === undefined ? null : v;
}
function j(v: any): any {
  return v ?? [];
}
function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}
function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
}

function rowToViagem(r: any): ViagemRodoviaria {
  return normalizeViagem({
    id: r.id,
    codigoViagem: u(r.codigo_viagem),
    numeroMdfe: u(r.numero_mdfe),
    tituloRota: u(r.titulo_rota),
    origem: u(r.origem),
    rotaOrigem: u(r.rota_origem),
    destinoFinal: u(r.destino_final),
    rotaDestino: u(r.rota_destino),
    regioesAtendidas: u(r.regioes_atendidas),
    modalidade: r.modalidade,
    veiculoPlaca: r.veiculo_placa ?? '',
    veiculoTipo: u(r.veiculo_tipo),
    veiculoModelo: u(r.veiculo_modelo),
    motoristaId: u(r.motorista_id),
    motoristaNome: r.motorista_nome ?? '',
    motoristaCpf: u(r.motorista_cpf),
    motoristaTelefone: u(r.motorista_telefone),
    ajudanteNome: u(r.ajudante_nome),
    dataSaida: u(r.data_saida),
    dataPartida: u(r.data_partida),
    horarioSaida: u(r.horario_saida),
    horarioPartidaPrevisto: u(r.horario_partida_previsto),
    horarioPartidaReal: u(r.horario_partida_real),
    previsaoRetornoBase: u(r.previsao_retorno_base),
    previsaoChegada: u(r.previsao_chegada),
    previsaoChegadaDestino: u(r.previsao_chegada_destino),
    status: r.status,
    faixaTemperatura: u(r.faixa_temperatura),
    faixaTemperaturaExigida: u(r.faixa_temperatura_exigida),
    temperaturaAtualBau: Number(r.temperatura_atual_bau ?? 0),
    temperaturaSetPoint: r.temperatura_set_point === null ? undefined : Number(r.temperatura_set_point),
    setpointTermostato: r.setpoint_termostato === null ? undefined : Number(r.setpoint_termostato),
    temperaturaMinima: r.temperatura_minima === null ? undefined : Number(r.temperatura_minima),
    temperaturaMaxima: r.temperatura_maxima === null ? undefined : Number(r.temperatura_maxima),
    temperaturaMinPermitida: r.temperatura_min_permitida === null ? undefined : Number(r.temperatura_min_permitida),
    temperaturaMaxPermitida: r.temperatura_max_permitida === null ? undefined : Number(r.temperatura_max_permitida),
    statusRefrigerador: u(r.status_refrigerador),
    dataloggerId: u(r.datalogger_id),
    dataloggerSerial: u(r.datalogger_serial),
    termoHigienizacaoAssinado: u(r.termo_higienizacao_assinado),
    quantidadeNotasFiscais: r.quantidade_notas_fiscais === null ? undefined : Number(r.quantidade_notas_fiscais),
    totalNFs: r.total_nfs === null ? undefined : Number(r.total_nfs),
    quantidadeTotalVolumes: r.quantidade_total_volumes === null ? undefined : Number(r.quantidade_total_volumes),
    valorTotalMercadoria: r.valor_total_mercadoria === null ? undefined : Number(r.valor_total_mercadoria),
    valorTotalCarga: r.valor_total_carga === null ? undefined : Number(r.valor_total_carga),
    pesoTotalKg: Number(r.peso_total_kg ?? 0),
    kmTotalEstimado: r.km_total_estimado === null ? undefined : Number(r.km_total_estimado),
    kmInicial: r.km_inicial === null ? undefined : Number(r.km_inicial),
    kmFinal: r.km_final === null ? undefined : Number(r.km_final),
    checklistSaida: u(r.checklist_saida),
    checklistPartida: u(r.checklist_partida),
    historicoTemperatura: j(r.historico_temperatura),
    pontosParada: j(r.pontos_parada),
    pontosEntrega: j(r.pontos_entrega),
    ocorrencias: j(r.ocorrencias),
    observacoes: u(r.observacoes),
    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
  } as ViagemRodoviaria);
}

function viagemToRow(v: ViagemRodoviaria) {
  return {
    id: v.id,
    codigo_viagem: n(v.codigoViagem),
    numero_mdfe: n(v.numeroMdfe),
    titulo_rota: n(v.tituloRota),
    origem: n(v.origem),
    rota_origem: n(v.rotaOrigem),
    destino_final: n(v.destinoFinal),
    rota_destino: n(v.rotaDestino),
    regioes_atendidas: v.regioesAtendidas ?? null,
    modalidade: v.modalidade,
    veiculo_placa: v.veiculoPlaca ?? '',
    veiculo_tipo: n(v.veiculoTipo),
    veiculo_modelo: n(v.veiculoModelo),
    motorista_id: n(v.motoristaId),
    motorista_nome: v.motoristaNome ?? '',
    motorista_cpf: n(v.motoristaCpf),
    motorista_telefone: n(v.motoristaTelefone),
    ajudante_nome: n(v.ajudanteNome),
    data_saida: n(v.dataSaida),
    data_partida: n(v.dataPartida),
    horario_saida: n(v.horarioSaida),
    horario_partida_previsto: n(v.horarioPartidaPrevisto),
    horario_partida_real: n(v.horarioPartidaReal),
    previsao_retorno_base: n(v.previsaoRetornoBase),
    previsao_chegada: n(v.previsaoChegada),
    previsao_chegada_destino: n(v.previsaoChegadaDestino),
    status: v.status,
    faixa_temperatura: n(v.faixaTemperatura),
    faixa_temperatura_exigida: n(v.faixaTemperaturaExigida),
    temperatura_atual_bau: v.temperaturaAtualBau ?? 0,
    temperatura_set_point: n(v.temperaturaSetPoint),
    setpoint_termostato: n(v.setpointTermostato),
    temperatura_minima: n(v.temperaturaMinima),
    temperatura_maxima: n(v.temperaturaMaxima),
    temperatura_min_permitida: n(v.temperaturaMinPermitida),
    temperatura_max_permitida: n(v.temperaturaMaxPermitida),
    status_refrigerador: n(v.statusRefrigerador),
    datalogger_id: n(v.dataloggerId),
    datalogger_serial: n(v.dataloggerSerial),
    termo_higienizacao_assinado: v.termoHigienizacaoAssinado ?? null,
    quantidade_notas_fiscais: n(v.quantidadeNotasFiscais),
    total_nfs: n(v.totalNFs),
    quantidade_total_volumes: n(v.quantidadeTotalVolumes),
    valor_total_mercadoria: n(v.valorTotalMercadoria),
    valor_total_carga: n(v.valorTotalCarga),
    peso_total_kg: v.pesoTotalKg ?? 0,
    km_total_estimado: n(v.kmTotalEstimado),
    km_inicial: n(v.kmInicial),
    km_final: n(v.kmFinal),
    checklist_saida: v.checklistSaida ?? null,
    checklist_partida: v.checklistPartida ?? null,
    historico_temperatura: j(v.historicoTemperatura),
    pontos_parada: j(v.pontosParada),
    pontos_entrega: j(v.pontosEntrega),
    ocorrencias: j(v.ocorrencias),
    observacoes: n(v.observacoes),
    criado_em: v.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}

export async function getViagensRodoviarias(): Promise<ViagemRodoviaria[]> {
  const { data, error } = await supabase
    .from('viagens_rodoviarias')
    .select('*')
    .order('criado_em', { ascending: false });
  assertNoError(error, 'getViagensRodoviarias');
  return (data ?? []).map(rowToViagem);
}
export async function saveViagemRodoviaria(item: ViagemRodoviaria): Promise<void> {
  const normalizado = normalizeViagem({ ...item, id: item.id || `viag-rod-${Date.now()}` });
  const { error } = await supabase.from('viagens_rodoviarias').upsert(viagemToRow(normalizado));
  assertNoError(error, 'saveViagemRodoviaria');
}
export async function deleteViagemRodoviaria(id: string): Promise<void> {
  const { error } = await supabase.from('viagens_rodoviarias').delete().eq('id', id);
  assertNoError(error, 'deleteViagemRodoviaria');
}
