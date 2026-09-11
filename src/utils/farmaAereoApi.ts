// ============================================================================
// Camada de acesso a dados de Clientes (carteira) + Farma Aéreo via Supabase.
// Mesmo padrão de src/utils/dpApi.ts: funções assíncronas espelhando as que
// existiam em storage.ts, mas lendo/gravando no banco em nuvem.
//
// A tabela de lançamentos de faturamento tem volume real alto (milhares de
// linhas) — por isso os upserts em lote (`importLancamentosFaturamentoAereo`)
// são feitos em pedaços (chunks) em vez de um upsert gigante só.
// ============================================================================

import { supabase } from './supabaseClient';
import { Cliente, EmbarqueAereo, LancamentoFaturamentoAereo, FaturaAereo } from '../types';

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
/** Divide um array em pedaços — usado pros upserts em lote não mandarem uma
 *  requisição só gigante com milhares de linhas de uma vez. */
function chunk<T>(arr: T[], tamanho: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += tamanho) out.push(arr.slice(i, i + tamanho));
  return out;
}

// ============================================================================
// CLIENTES (carteira)
// ============================================================================
export function rowToCliente(r: any): Cliente {
  return {
    id: r.id,
    codigoCliente: r.codigo_cliente,
    razaoSocial: r.razao_social,
    nomeFantasia: r.nome_fantasia,
    cnpj: r.cnpj,
    inscricaoEstadual: u(r.inscricao_estadual),
    segmento: r.segmento,
    status: r.status,
    setoresVinculados: u(r.setores_vinculados),
    setorAtuacao: u(r.setor_atuacao),
    empresaFaturamentoId: u(r.empresa_faturamento_id),
    gerenteContaResponsavel: r.gerente_conta_responsavel ?? '',
    enderecoCompleto: r.endereco_completo ?? '',
    cidadeUF: r.cidade_uf ?? '',
    cep: u(r.cep),
    telefonePrincipal: r.telefone_principal ?? '',
    emailPrincipal: r.email_principal ?? '',
    website: u(r.website),
    tiposOperacao: j(r.tipos_operacao),
    faixaTemperatura: r.faixa_temperatura,
    exigeRDC430: r.exige_rdc430 ?? false,
    exigeRegistroAnvisa: r.exige_registro_anvisa ?? false,
    numeroLicencaSanitaria: u(r.numero_licenca_sanitaria),
    validadeLicencaSanitaria: u(r.validade_licenca_sanitaria),
    restricoesHorarioCarga: u(r.restricoes_horario_carga),
    numeroContrato: u(r.numero_contrato),
    dataInicioContrato: u(r.data_inicio_contrato),
    dataRenovacaoContrato: u(r.data_renovacao_contrato),
    faturamentoMensalEstimado: Number(r.faturamento_mensal_estimado ?? 0),
    volumeEntregasMesEstimado: Number(r.volume_entregas_mes_estimado ?? 0),
    tabelaFrete: r.tabela_frete ?? {},
    tabelaFreteRodoviario: u(r.tabela_frete_rodoviario),
    veiculosAlocados: u(r.veiculos_alocados),
    motoristasAlocadosIds: u(r.motoristas_alocados_ids),
    contatos: j(r.contatos),
    regioesAtendidas: j(r.regioes_atendidas),
    interacoes: j(r.interacoes),
    observacoesOperacionais: u(r.observacoes_operacionais),
    satisfacaoNPS: r.satisfacao_nps === null ? undefined : Number(r.satisfacao_nps),
    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
  };
}
export function clienteToRow(c: Cliente) {
  return {
    id: c.id,
    codigo_cliente: c.codigoCliente,
    razao_social: c.razaoSocial,
    nome_fantasia: c.nomeFantasia,
    cnpj: c.cnpj,
    inscricao_estadual: n(c.inscricaoEstadual),
    segmento: c.segmento,
    status: c.status,
    setores_vinculados: c.setoresVinculados && c.setoresVinculados.length ? c.setoresVinculados : null,
    setor_atuacao: n(c.setorAtuacao),
    empresa_faturamento_id: n(c.empresaFaturamentoId),
    gerente_conta_responsavel: c.gerenteContaResponsavel ?? '',
    endereco_completo: c.enderecoCompleto ?? '',
    cidade_uf: c.cidadeUF ?? '',
    cep: n(c.cep),
    telefone_principal: c.telefonePrincipal ?? '',
    email_principal: c.emailPrincipal ?? '',
    website: n(c.website),
    tipos_operacao: j(c.tiposOperacao),
    faixa_temperatura: c.faixaTemperatura,
    exige_rdc430: c.exigeRDC430 ?? false,
    exige_registro_anvisa: c.exigeRegistroAnvisa ?? false,
    numero_licenca_sanitaria: n(c.numeroLicencaSanitaria),
    validade_licenca_sanitaria: n(c.validadeLicencaSanitaria),
    restricoes_horario_carga: n(c.restricoesHorarioCarga),
    numero_contrato: n(c.numeroContrato),
    data_inicio_contrato: n(c.dataInicioContrato),
    data_renovacao_contrato: n(c.dataRenovacaoContrato),
    faturamento_mensal_estimado: c.faturamentoMensalEstimado ?? 0,
    volume_entregas_mes_estimado: c.volumeEntregasMesEstimado ?? 0,
    tabela_frete: c.tabelaFrete ?? {},
    tabela_frete_rodoviario: c.tabelaFreteRodoviario ?? null,
    veiculos_alocados: n(c.veiculosAlocados),
    motoristas_alocados_ids: c.motoristasAlocadosIds && c.motoristasAlocadosIds.length ? c.motoristasAlocadosIds : null,
    contatos: j(c.contatos),
    regioes_atendidas: j(c.regioesAtendidas),
    interacoes: j(c.interacoes),
    observacoes_operacionais: n(c.observacoesOperacionais),
    satisfacao_nps: n(c.satisfacaoNPS),
    criado_em: c.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase.from('clientes').select('*').order('razao_social');
  assertNoError(error, 'getClientes');
  return (data ?? []).map(rowToCliente);
}
export async function saveCliente(cliente: Cliente): Promise<void> {
  const item = cliente.id ? cliente : { ...cliente, id: `cli-${Date.now()}` };
  const { error } = await supabase.from('clientes').upsert(clienteToRow(item));
  assertNoError(error, 'saveCliente');
}
export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  assertNoError(error, 'deleteCliente');
}

// ============================================================================
// EMBARQUES AÉREOS
// ============================================================================
function rowToEmbarque(r: any): EmbarqueAereo {
  return {
    id: r.id,
    codigoAWB: r.codigo_awb,
    numeroAwb: u(r.numero_awb),
    numeroCteAereo: u(r.numero_cte_aereo),
    clienteId: r.cliente_id,
    clienteNome: r.cliente_nome,
    remetenteNome: r.remetente_nome,
    remetenteCidadeUF: r.remetente_cidade_uf,
    destinatarioNome: r.destinatario_nome,
    destinatarioEndereco: r.destinatario_endereco,
    destinatarioCidadeUF: r.destinatario_cidade_uf,
    tipoCarga: r.tipo_carga,
    faixaTemperatura: r.faixa_temperatura,
    tipoEmbalagem: r.tipo_embalagem,
    companhiaAerea: r.companhia_aerea,
    numeroVoo: r.numero_voo,
    aeroportoOrigem: r.aeroporto_origem,
    aeroportoDestino: r.aeroporto_destino,
    dataEmbarque: r.data_embarque,
    horarioPrevistoDecolagem: u(r.horario_previsto_decolagem),
    horarioPrevistoPouso: u(r.horario_previsto_pouso),
    previsaoEntregaDestino: r.previsao_entrega_destino,
    status: r.status,
    temperaturaAtual: Number(r.temperatura_atual ?? 0),
    temperaturaMinima: Number(r.temperatura_minima ?? 0),
    temperaturaMaxima: Number(r.temperatura_maxima ?? 0),
    dataloggerSerial: u(r.datalogger_serial),
    dataloggerModelo: u(r.datalogger_modelo),
    termogramaValidado: r.termograma_validado ?? false,
    pesoBrutoKg: Number(r.peso_bruto_kg ?? 0),
    quantidadeVolumes: Number(r.quantidade_volumes ?? 0),
    valorMercadoria: Number(r.valor_mercadoria ?? 0),
    valorFreteAereo: Number(r.valor_frete_aereo ?? 0),
    urgencia: r.urgencia,
    numeroNotaFiscal: r.numero_nota_fiscal ?? '',
    responsavelLiberacaoTeca: u(r.responsavel_liberacao_teca),
    motoristaColetaId: u(r.motorista_coleta_id),
    motoristaEntregaId: u(r.motorista_entrega_id),
    observacoes: u(r.observacoes),
    comprovanteEntregaUrl: u(r.comprovante_entrega_url),
    historico: j(r.historico),
    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
  };
}
function embarqueToRow(e: EmbarqueAereo) {
  return {
    id: e.id,
    codigo_awb: e.codigoAWB ?? '',
    numero_awb: n(e.numeroAwb),
    numero_cte_aereo: n(e.numeroCteAereo),
    cliente_id: n(e.clienteId),
    cliente_nome: e.clienteNome ?? '',
    remetente_nome: e.remetenteNome ?? '',
    remetente_cidade_uf: e.remetenteCidadeUF ?? '',
    destinatario_nome: e.destinatarioNome ?? '',
    destinatario_endereco: e.destinatarioEndereco ?? '',
    destinatario_cidade_uf: e.destinatarioCidadeUF ?? '',
    tipo_carga: e.tipoCarga,
    faixa_temperatura: e.faixaTemperatura,
    tipo_embalagem: e.tipoEmbalagem ?? '',
    companhia_aerea: e.companhiaAerea,
    numero_voo: e.numeroVoo ?? '',
    aeroporto_origem: e.aeroportoOrigem ?? '',
    aeroporto_destino: e.aeroportoDestino ?? '',
    data_embarque: n(e.dataEmbarque),
    horario_previsto_decolagem: n(e.horarioPrevistoDecolagem),
    horario_previsto_pouso: n(e.horarioPrevistoPouso),
    previsao_entrega_destino: n(e.previsaoEntregaDestino),
    status: e.status,
    temperatura_atual: e.temperaturaAtual ?? 0,
    temperatura_minima: e.temperaturaMinima ?? 0,
    temperatura_maxima: e.temperaturaMaxima ?? 0,
    datalogger_serial: n(e.dataloggerSerial),
    datalogger_modelo: n(e.dataloggerModelo),
    termograma_validado: e.termogramaValidado ?? false,
    peso_bruto_kg: e.pesoBrutoKg ?? 0,
    quantidade_volumes: e.quantidadeVolumes ?? 0,
    valor_mercadoria: e.valorMercadoria ?? 0,
    valor_frete_aereo: e.valorFreteAereo ?? 0,
    urgencia: e.urgencia ?? 'Normal',
    numero_nota_fiscal: e.numeroNotaFiscal ?? '',
    responsavel_liberacao_teca: n(e.responsavelLiberacaoTeca),
    motorista_coleta_id: n(e.motoristaColetaId),
    motorista_entrega_id: n(e.motoristaEntregaId),
    observacoes: n(e.observacoes),
    comprovante_entrega_url: n(e.comprovanteEntregaUrl),
    historico: j(e.historico),
    criado_em: e.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
export async function getEmbarquesAereos(): Promise<EmbarqueAereo[]> {
  const { data, error } = await supabase.from('embarques_aereo').select('*').order('data_embarque', { ascending: false });
  assertNoError(error, 'getEmbarquesAereos');
  return (data ?? []).map(rowToEmbarque);
}
export async function saveEmbarqueAereo(item: EmbarqueAereo): Promise<void> {
  const registro = item.id ? item : { ...item, id: `emb-air-${Date.now()}` };
  const { error } = await supabase.from('embarques_aereo').upsert(embarqueToRow(registro));
  assertNoError(error, 'saveEmbarqueAereo');
}
export async function deleteEmbarqueAereo(id: string): Promise<void> {
  const { error } = await supabase.from('embarques_aereo').delete().eq('id', id);
  assertNoError(error, 'deleteEmbarqueAereo');
}

// ============================================================================
// FATURAS AÉREO
// ============================================================================
function rowToFatura(r: any): FaturaAereo {
  return {
    id: r.id,
    clienteId: u(r.cliente_id),
    clienteNome: r.cliente_nome,
    periodo: r.periodo,
    numeroFatura: r.numero_fatura,
    dataEnvio: u(r.data_envio),
    numeroNF: u(r.numero_nf),
    observacao: u(r.observacao),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
  };
}
export function faturaToRow(f: FaturaAereo) {
  return {
    id: f.id,
    cliente_id: n(f.clienteId),
    cliente_nome: f.clienteNome ?? '',
    periodo: f.periodo ?? '',
    numero_fatura: f.numeroFatura ?? '',
    data_envio: n(f.dataEnvio),
    numero_nf: n(f.numeroNF),
    observacao: n(f.observacao),
    criado_em: f.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
export async function getFaturasAereo(): Promise<FaturaAereo[]> {
  const { data, error } = await supabase.from('faturas_aereo').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getFaturasAereo');
  return (data ?? []).map(rowToFatura);
}
export async function saveFaturaAereo(item: FaturaAereo): Promise<void> {
  const registro = item.id ? item : { ...item, id: `fatura-aereo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  const { error } = await supabase.from('faturas_aereo').upsert(faturaToRow(registro));
  assertNoError(error, 'saveFaturaAereo');
}
export async function deleteFaturaAereo(id: string): Promise<void> {
  const { error } = await supabase.from('faturas_aereo').delete().eq('id', id);
  assertNoError(error, 'deleteFaturaAereo');
}
/** Insere/atualiza em lote — usado pela importação de planilha. */
export async function importFaturasAereo(items: FaturaAereo[]): Promise<void> {
  for (const lote of chunk(items, 500)) {
    const { error } = await supabase.from('faturas_aereo').upsert(lote.map(faturaToRow));
    assertNoError(error, 'importFaturasAereo');
  }
}

// ============================================================================
// LANÇAMENTOS DE FATURAMENTO AÉREO
// ============================================================================
function rowToLancamento(r: any): LancamentoFaturamentoAereo {
  return {
    id: r.id,
    clienteId: u(r.cliente_id),
    clienteNome: r.cliente_nome,
    cnpjRemetente: u(r.cnpj_remetente),
    estadoRemetente: u(r.estado_remetente),
    cidadeRemetente: u(r.cidade_remetente),
    remetenteLab: u(r.remetente_lab),
    destinatario: u(r.destinatario),
    cnpjDestinatario: u(r.cnpj_destinatario),
    estadoDestino: u(r.estado_destino),
    cidadeDestino: u(r.cidade_destino),
    bairroDestino: u(r.bairro_destino),
    notaFiscal: u(r.nota_fiscal),
    valorNF: r.valor_nf === null ? undefined : Number(r.valor_nf),
    valorPrestacao: r.valor_prestacao === null ? undefined : Number(r.valor_prestacao),
    dataEmissao: u(r.data_emissao),
    numeroCte: u(r.numero_cte),
    ctrc: u(r.ctrc),
    modal: u(r.modal),
    pesoKg: r.peso_kg === null ? undefined : Number(r.peso_kg),
    pesoTaxado: r.peso_taxado === null ? undefined : Number(r.peso_taxado),
    volumes: r.volumes === null ? undefined : Number(r.volumes),
    tipoCustoExtra: u(r.tipo_custo_extra),
    custoExtra: r.custo_extra === null ? undefined : Number(r.custo_extra),
    custoDescarga: r.custo_descarga === null ? undefined : Number(r.custo_descarga),
    valorACobrar: Number(r.valor_a_cobrar ?? 0),
    valorRecebido: r.valor_recebido === null ? undefined : Number(r.valor_recebido),
    confirmacaoPagamento: r.confirmacao_pagamento ?? false,
    dataConclusao: u(r.data_conclusao),
    nfEmitida: u(r.nf_emitida),
    faturaId: u(r.fatura_id),
    observacao: u(r.observacao),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
  };
}
export function lancamentoToRow(l: LancamentoFaturamentoAereo) {
  return {
    id: l.id,
    cliente_id: n(l.clienteId),
    cliente_nome: l.clienteNome ?? '',
    cnpj_remetente: n(l.cnpjRemetente),
    estado_remetente: n(l.estadoRemetente),
    cidade_remetente: n(l.cidadeRemetente),
    remetente_lab: n(l.remetenteLab),
    destinatario: n(l.destinatario),
    cnpj_destinatario: n(l.cnpjDestinatario),
    estado_destino: n(l.estadoDestino),
    cidade_destino: n(l.cidadeDestino),
    bairro_destino: n(l.bairroDestino),
    nota_fiscal: n(l.notaFiscal),
    valor_nf: n(l.valorNF),
    valor_prestacao: n(l.valorPrestacao),
    data_emissao: n(l.dataEmissao),
    numero_cte: n(l.numeroCte),
    ctrc: n(l.ctrc),
    modal: n(l.modal),
    peso_kg: n(l.pesoKg),
    peso_taxado: n(l.pesoTaxado),
    volumes: n(l.volumes),
    tipo_custo_extra: n(l.tipoCustoExtra),
    custo_extra: n(l.custoExtra),
    custo_descarga: n(l.custoDescarga),
    valor_a_cobrar: l.valorACobrar ?? 0,
    valor_recebido: n(l.valorRecebido),
    confirmacao_pagamento: l.confirmacaoPagamento ?? false,
    data_conclusao: n(l.dataConclusao),
    nf_emitida: l.nfEmitida ?? null,
    fatura_id: n(l.faturaId),
    observacao: n(l.observacao),
    criado_em: l.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
export async function getLancamentosFaturamentoAereo(): Promise<LancamentoFaturamentoAereo[]> {
  // Tabela grande (milhares de linhas) — busca em páginas de 1000 até acabar,
  // porque o Supabase limita a 1000 linhas por resposta por padrão.
  const pageSize = 1000;
  let pagina = 0;
  let tudo: any[] = [];
  while (true) {
    const { data, error } = await supabase
      .from('lancamentos_faturamento_aereo')
      .select('*')
      .order('criado_em', { ascending: false })
      .range(pagina * pageSize, pagina * pageSize + pageSize - 1);
    assertNoError(error, 'getLancamentosFaturamentoAereo');
    tudo = tudo.concat(data ?? []);
    if (!data || data.length < pageSize) break;
    pagina++;
  }
  return tudo.map(rowToLancamento);
}
export async function saveLancamentoFaturamentoAereo(item: LancamentoFaturamentoAereo): Promise<void> {
  const registro = item.id ? item : { ...item, id: `lanc-fat-aereo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  const { error } = await supabase.from('lancamentos_faturamento_aereo').upsert(lancamentoToRow(registro));
  assertNoError(error, 'saveLancamentoFaturamentoAereo');
}
export async function deleteLancamentoFaturamentoAereo(id: string): Promise<void> {
  const { error } = await supabase.from('lancamentos_faturamento_aereo').delete().eq('id', id);
  assertNoError(error, 'deleteLancamentoFaturamentoAereo');
}
/** Insere/atualiza em lote — usado pela importação de planilha (pode ser centenas/milhares
 *  de linhas de uma vez, por isso os upserts saem em pedaços de 500). */
export async function importLancamentosFaturamentoAereo(items: LancamentoFaturamentoAereo[]): Promise<void> {
  for (const lote of chunk(items, 500)) {
    const { error } = await supabase.from('lancamentos_faturamento_aereo').upsert(lote.map(lancamentoToRow));
    assertNoError(error, 'importLancamentosFaturamentoAereo');
  }
}
