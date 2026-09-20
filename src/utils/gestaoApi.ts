// ============================================================================
// Camada de acesso a dados via Supabase para: Custos Operacionais, Projetos
// Gerenciais, Agenda da Gestão, Notas & Ideias e Instruções de Trabalho.
// Mesmo padrão de dpApi.ts/farmaAereoApi.ts: funções assíncronas espelhando
// as que existiam em storage.ts, lendo/gravando no banco em nuvem.
// ============================================================================

import { supabase } from './supabaseClient';
import {
  CustoOperacional,
  ProjetoGerencial,
  StatusProjeto,
  AtividadeGestao,
  StatusAtividadeGestao,
  NotaPagina,
  InstrucaoTrabalho,
  OrcamentoItem,
} from '../types';

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

// ============================================================================
// CUSTOS OPERACIONAIS
// ============================================================================
function rowToCusto(r: any): CustoOperacional {
  return {
    id: r.id,
    setor: r.setor,
    categoria: r.categoria,
    descricao: r.descricao,
    valor: Number(r.valor ?? 0),
    dataCompetencia: r.data_competencia,
    dataVencimento: u(r.data_vencimento),
    dataPagamento: u(r.data_pagamento),
    status: r.status,
    periodicidade: r.periodicidade,
    fornecedor: u(r.fornecedor),
    numeroDocumentoOuNF: u(r.numero_documento_ou_nf),
    placaVeiculo: u(r.placa_veiculo),
    conhecimentoOuAwb: u(r.conhecimento_ou_awb),
    clienteRelacionadoId: u(r.cliente_relacionado_id),
    criadoPor: u(r.criado_por),
    observacoes: u(r.observacoes),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
  };
}
function custoToRow(c: CustoOperacional) {
  return {
    id: c.id,
    setor: c.setor,
    categoria: c.categoria,
    descricao: c.descricao,
    valor: c.valor ?? 0,
    data_competencia: c.dataCompetencia,
    data_vencimento: n(c.dataVencimento),
    data_pagamento: n(c.dataPagamento),
    status: c.status,
    periodicidade: c.periodicidade,
    fornecedor: n(c.fornecedor),
    numero_documento_ou_nf: n(c.numeroDocumentoOuNF),
    placa_veiculo: n(c.placaVeiculo),
    conhecimento_ou_awb: n(c.conhecimentoOuAwb),
    cliente_relacionado_id: n(c.clienteRelacionadoId),
    criado_por: n(c.criadoPor),
    observacoes: n(c.observacoes),
    criado_em: c.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
export async function getCustosOperacionais(): Promise<CustoOperacional[]> {
  const { data, error } = await supabase.from('custos_operacionais').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getCustosOperacionais');
  return (data ?? []).map(rowToCusto);
}
export async function saveCustoOperacional(item: CustoOperacional): Promise<void> {
  const { error } = await supabase.from('custos_operacionais').upsert(custoToRow(item));
  assertNoError(error, 'saveCustoOperacional');
}
export async function deleteCustoOperacional(id: string): Promise<void> {
  const { error } = await supabase.from('custos_operacionais').delete().eq('id', id);
  assertNoError(error, 'deleteCustoOperacional');
}

// ============================================================================
// PROJETOS GERENCIAIS
// ============================================================================
function rowToProjeto(r: any): ProjetoGerencial {
  return {
    id: r.id,
    codigo: r.codigo,
    titulo: r.titulo,
    descricao: r.descricao ?? '',
    categoria: r.categoria,
    status: r.status,
    prioridade: r.prioridade,
    setorImpactado: r.setor_impactado,
    liderProjetoId: u(r.lider_projeto_id),
    liderProjetoNome: r.lider_projeto_nome ?? '',
    liderCargo: u(r.lider_cargo),
    equipeMembros: j(r.equipe_membros),
    dataInicio: r.data_inicio,
    dataPrevisaoFim: r.data_previsao_fim,
    dataConclusaoReal: u(r.data_conclusao_real),
    orcamentoPrevisto: Number(r.orcamento_previsto ?? 0),
    custoRealizado: Number(r.custo_realizado ?? 0),
    tipoInvestimento: u(r.tipo_investimento),
    roiEstimadoMeses: r.roi_estimado_meses === null ? undefined : Number(r.roi_estimado_meses),
    retornoEsperadoDescricao: u(r.retorno_esperado_descricao),
    progressoPercentual: Number(r.progresso_percentual ?? 0),
    objetivoEstrategico: u(r.objetivo_estrategico),
    alinhamentoRDC430: u(r.alinhamento_rdc430),
    marcos: j(r.marcos),
    tarefas: j(r.tarefas),
    riscos: j(r.riscos),
    kpis: j(r.kpis),
    atualizacoes: j(r.atualizacoes),
    documentos: j(r.documentos),
    observacoes: u(r.observacoes),
    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
    criadoPorUserId: u(r.criado_por_user_id),
    usuariosMarcadosIds: j(r.usuarios_marcados_ids),
    lembreteVesperaEnviadoEm: u(r.lembrete_vespera_enviado_em),
    lembreteDiaEnviadoEm: u(r.lembrete_dia_enviado_em),
  };
}
function projetoToRow(p: ProjetoGerencial) {
  return {
    id: p.id,
    codigo: p.codigo,
    titulo: p.titulo,
    descricao: p.descricao ?? '',
    categoria: p.categoria,
    status: p.status,
    prioridade: p.prioridade,
    setor_impactado: p.setorImpactado,
    lider_projeto_id: n(p.liderProjetoId),
    lider_projeto_nome: p.liderProjetoNome ?? '',
    lider_cargo: n(p.liderCargo),
    equipe_membros: j(p.equipeMembros),
    data_inicio: n(p.dataInicio),
    data_previsao_fim: n(p.dataPrevisaoFim),
    data_conclusao_real: n(p.dataConclusaoReal),
    orcamento_previsto: p.orcamentoPrevisto ?? 0,
    custo_realizado: p.custoRealizado ?? 0,
    tipo_investimento: n(p.tipoInvestimento),
    roi_estimado_meses: n(p.roiEstimadoMeses),
    retorno_esperado_descricao: n(p.retornoEsperadoDescricao),
    progresso_percentual: p.progressoPercentual ?? 0,
    objetivo_estrategico: n(p.objetivoEstrategico),
    alinhamento_rdc430: p.alinhamentoRDC430 ?? null,
    marcos: j(p.marcos),
    tarefas: j(p.tarefas),
    riscos: j(p.riscos),
    kpis: j(p.kpis),
    atualizacoes: j(p.atualizacoes),
    documentos: j(p.documentos),
    observacoes: n(p.observacoes),
    criado_em: p.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    criado_por_user_id: n(p.criadoPorUserId),
    usuarios_marcados_ids: j(p.usuariosMarcadosIds),
  };
}
export async function getProjetosGerenciais(): Promise<ProjetoGerencial[]> {
  const { data, error } = await supabase.from('projetos_gerenciais').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getProjetosGerenciais');
  return (data ?? []).map(rowToProjeto);
}
export async function saveProjetoGerencial(item: ProjetoGerencial): Promise<void> {
  const registro = item.id ? item : { ...item, id: `prj-${Date.now()}` };
  const { error } = await supabase.from('projetos_gerenciais').upsert(projetoToRow(registro));
  assertNoError(error, 'saveProjetoGerencial');
}
export async function deleteProjetoGerencial(id: string): Promise<void> {
  const { error } = await supabase.from('projetos_gerenciais').delete().eq('id', id);
  assertNoError(error, 'deleteProjetoGerencial');
}
export async function updateProjetoStatus(id: string, newStatus: StatusProjeto): Promise<void> {
  const { error } = await supabase
    .from('projetos_gerenciais')
    .update({ status: newStatus, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  assertNoError(error, 'updateProjetoStatus');
}

// ============================================================================
// AGENDA DA GESTÃO
// ============================================================================
function rowToAtividade(r: any): AtividadeGestao {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: u(r.descricao),
    categoria: r.categoria,
    status: r.status,
    prioridade: r.prioridade,
    data: r.data,
    dataFim: u(r.data_fim),
    horaInicio: r.hora_inicio ?? '',
    horaFim: r.hora_fim ?? '',
    diaInteiro: u(r.dia_inteiro),
    responsavel: r.responsavel ?? '',
    responsavelCargo: u(r.responsavel_cargo),
    participantes: j(r.participantes),
    tipoLocal: u(r.tipo_local),
    localOuLink: r.local_ou_link ?? '',
    linkLocalizacao: u(r.link_localizacao),
    pautaAta: u(r.pauta_ata),
    deliberacoes: u(r.deliberacoes),
    anexos: u(r.anexos),
    moduloRelacionado: u(r.modulo_relacionado),
    projetoRelacionadoId: u(r.projeto_relacionado_id),
    lembreteMinutos: r.lembrete_minutos === null ? undefined : Number(r.lembrete_minutos),
    recorrencia: u(r.recorrencia),
    ultimoAlertaEnviadoEm: u(r.ultimo_alerta_enviado_em),
    ultimoAlertaCanal: u(r.ultimo_alerta_canal),
    lembreteVesperaEnviadoEm: u(r.lembrete_vespera_enviado_em),
    lembreteDiaEnviadoEm: u(r.lembrete_dia_enviado_em),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
    concluidaEm: u(r.concluida_em),
    criadoPorUserId: u(r.criado_por_user_id),
    usuariosMarcadosIds: j(r.usuarios_marcados_ids),
  };
}
function atividadeToRow(a: AtividadeGestao) {
  return {
    id: a.id,
    titulo: a.titulo,
    descricao: n(a.descricao),
    categoria: a.categoria,
    status: a.status,
    prioridade: a.prioridade,
    data: a.data,
    data_fim: n(a.dataFim),
    hora_inicio: a.horaInicio ?? '',
    hora_fim: a.horaFim ?? '',
    dia_inteiro: a.diaInteiro ?? null,
    responsavel: a.responsavel ?? '',
    responsavel_cargo: n(a.responsavelCargo),
    participantes: j(a.participantes),
    tipo_local: n(a.tipoLocal),
    local_ou_link: a.localOuLink ?? '',
    link_localizacao: n(a.linkLocalizacao),
    pauta_ata: n(a.pautaAta),
    deliberacoes: a.deliberacoes ?? null,
    anexos: a.anexos ?? null,
    modulo_relacionado: n(a.moduloRelacionado),
    projeto_relacionado_id: n(a.projetoRelacionadoId),
    lembrete_minutos: n(a.lembreteMinutos),
    recorrencia: n(a.recorrencia),
    ultimo_alerta_enviado_em: n(a.ultimoAlertaEnviadoEm),
    ultimo_alerta_canal: n(a.ultimoAlertaCanal),
    criado_em: a.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    concluida_em: n(a.concluidaEm),
    criado_por_user_id: n(a.criadoPorUserId),
    usuarios_marcados_ids: j(a.usuariosMarcadosIds),
  };
}
export async function getAtividadesGestao(): Promise<AtividadeGestao[]> {
  const { data, error } = await supabase.from('atividades_gestao').select('*').order('data', { ascending: true });
  assertNoError(error, 'getAtividadesGestao');
  return (data ?? []).map(rowToAtividade);
}
export async function saveAtividadeGestao(item: AtividadeGestao): Promise<void> {
  const registro = item.id ? item : { ...item, id: `ativ-${Date.now()}` };
  const { error } = await supabase.from('atividades_gestao').upsert(atividadeToRow(registro));
  assertNoError(error, 'saveAtividadeGestao');
}
export async function deleteAtividadeGestao(id: string): Promise<void> {
  const { error } = await supabase.from('atividades_gestao').delete().eq('id', id);
  assertNoError(error, 'deleteAtividadeGestao');
}
export async function updateAtividadeStatus(id: string, newStatus: StatusAtividadeGestao): Promise<void> {
  const patch: Record<string, any> = { status: newStatus, atualizado_em: new Date().toISOString() };
  if (newStatus === 'Concluída') patch.concluida_em = new Date().toISOString();
  const { error } = await supabase.from('atividades_gestao').update(patch).eq('id', id);
  assertNoError(error, 'updateAtividadeStatus');
}

// ============================================================================
// NOTAS & IDEIAS (páginas estilo Notion)
// ============================================================================
function rowToNota(r: any): NotaPagina {
  return {
    id: r.id,
    titulo: r.titulo ?? '',
    icone: u(r.icone),
    paginaPaiId: u(r.pagina_pai_id),
    blocos: j(r.blocos),
    vinculo: u(r.vinculo),
    favorito: u(r.favorito),
    arquivada: u(r.arquivada),
    autor: u(r.autor),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
    criadoPorUserId: u(r.criado_por_user_id),
    usuariosMarcadosIds: j(r.usuarios_marcados_ids),
  };
}
function notaToRow(nt: NotaPagina) {
  return {
    id: nt.id,
    titulo: nt.titulo ?? '',
    icone: n(nt.icone),
    pagina_pai_id: n(nt.paginaPaiId),
    blocos: j(nt.blocos),
    vinculo: nt.vinculo ?? null,
    favorito: nt.favorito ?? null,
    arquivada: nt.arquivada ?? null,
    autor: n(nt.autor),
    criado_em: nt.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    criado_por_user_id: n(nt.criadoPorUserId),
    usuarios_marcados_ids: j(nt.usuariosMarcadosIds),
  };
}
export async function getNotasPaginas(): Promise<NotaPagina[]> {
  const { data, error } = await supabase.from('notas_paginas').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getNotasPaginas');
  return (data ?? []).map(rowToNota);
}
export async function saveNotaPagina(item: NotaPagina): Promise<void> {
  const registro = item.id ? item : { ...item, id: `nota-${Date.now()}` };
  const { error } = await supabase.from('notas_paginas').upsert(notaToRow(registro));
  assertNoError(error, 'saveNotaPagina');
}
export async function deleteNotaPagina(id: string): Promise<void> {
  // Remove a página e também suas sub-páginas (mesma regra de storage.ts: paginaPaiId em cadeia).
  const { data, error: getError } = await supabase.from('notas_paginas').select('id, pagina_pai_id');
  assertNoError(getError, 'deleteNotaPagina (leitura)');
  const todas = data ?? [];
  const idsToRemove = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    todas.forEach((n: any) => {
      if (n.pagina_pai_id && idsToRemove.has(n.pagina_pai_id) && !idsToRemove.has(n.id)) {
        idsToRemove.add(n.id);
        changed = true;
      }
    });
  }
  const { error } = await supabase.from('notas_paginas').delete().in('id', Array.from(idsToRemove));
  assertNoError(error, 'deleteNotaPagina');
}

// ============================================================================
// LINKS DE COMPARTILHAMENTO DE UMA PÁGINA DE NOTAS (visualização pública, sem
// login) — mesmo padrão de FichaCompartilhada em dpApi.ts, ver migração
// 031_notas_compartilhadas.sql.
// ============================================================================
export interface NotaCompartilhada {
  token: string;
  notaId: string;
  notaTitulo: string;
  dados: Record<string, any>;
  criadoEm: string;
  criadoPor?: string;
  expiraEm: string;
  revogado: boolean;
}

function gerarTokenNotaCompartilhada(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function rowToNotaCompartilhada(r: any): NotaCompartilhada {
  return {
    token: r.token,
    notaId: r.nota_id,
    notaTitulo: r.nota_titulo,
    dados: r.dados,
    criadoEm: r.criado_em,
    criadoPor: u(r.criado_por),
    expiraEm: r.expira_em,
    revogado: r.revogado,
  };
}

/** Gera um link de visualização (foto/snapshot dos blocos agora) — expira sozinho depois de
 *  `validadeDias` e pode ser revogado antes disso. */
export async function gerarLinkNotaCompartilhada(
  pagina: NotaPagina,
  criadoPor?: string,
  validadeDias = 7
): Promise<NotaCompartilhada> {
  const token = gerarTokenNotaCompartilhada();
  const dados = { titulo: pagina.titulo, icone: pagina.icone, blocos: pagina.blocos };
  const expiraEm = new Date(Date.now() + validadeDias * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('notas_compartilhadas').insert({
    token,
    nota_id: pagina.id,
    nota_titulo: pagina.titulo || 'Sem título',
    dados,
    criado_por: n(criadoPor),
    expira_em: expiraEm,
  });
  assertNoError(error, 'gerarLinkNotaCompartilhada');

  return {
    token,
    notaId: pagina.id,
    notaTitulo: pagina.titulo || 'Sem título',
    dados,
    criadoEm: new Date().toISOString(),
    criadoPor,
    expiraEm,
    revogado: false,
  };
}

/** Lista os links já gerados pra uma página (mais recente primeiro). */
export async function listarLinksNotaCompartilhada(notaId: string): Promise<NotaCompartilhada[]> {
  const { data, error } = await supabase
    .from('notas_compartilhadas')
    .select('*')
    .eq('nota_id', notaId)
    .order('criado_em', { ascending: false });
  assertNoError(error, 'listarLinksNotaCompartilhada');
  return (data ?? []).map(rowToNotaCompartilhada);
}

/** Revoga um link antes do prazo — a partir daqui, o token nunca mais é aceito. */
export async function revogarLinkNotaCompartilhada(token: string): Promise<void> {
  const { error } = await supabase.from('notas_compartilhadas').update({ revogado: true }).eq('token', token);
  assertNoError(error, 'revogarLinkNotaCompartilhada');
}

/** Usada pela tela pública (sem login, papel "anon"). Retorna null se o link for
 *  inválido/expirado/revogado — a tela decide o que mostrar. */
export async function obterNotaCompartilhadaPublica(token: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase.rpc('obter_nota_compartilhada', { p_token: token });
  assertNoError(error, 'obterNotaCompartilhadaPublica');
  return (data as Record<string, any> | null) ?? null;
}

// ============================================================================
// INSTRUÇÕES DE TRABALHO
// ============================================================================
function rowToInstrucao(r: any): InstrucaoTrabalho {
  return {
    id: r.id,
    codigo: r.codigo,
    titulo: r.titulo,
    categoria: r.categoria,
    status: r.status,
    versao: Number(r.versao ?? 1),
    responsavel: u(r.responsavel),
    aprovadoPor: u(r.aprovado_por),
    dataVigencia: u(r.data_vigencia),
    objetivo: u(r.objetivo),
    aplicacaoAbrangencia: u(r.aplicacao_abrangencia),
    definicoes: u(r.definicoes),
    responsabilidades: j(r.responsabilidades),
    sipoc: j(r.sipoc),
    fluxoProcesso: j(r.fluxo_processo),
    criteriosDecisao: u(r.criterios_decisao),
    registrosEvidencias: u(r.registros_evidencias),
    indicadores: j(r.indicadores),
    riscosControles: j(r.riscos_controles),
    planoAcao5W2H: j(r.plano_acao_5w2h),
    historicoRevisoes: j(r.historico_revisoes),
    vinculo: u(r.vinculo),
    favorito: u(r.favorito),
    arquivada: u(r.arquivada),
    autor: u(r.autor),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
    criadoPorUserId: u(r.criado_por_user_id),
    usuariosMarcadosIds: j(r.usuarios_marcados_ids),
  };
}
function instrucaoToRow(it: InstrucaoTrabalho) {
  return {
    id: it.id,
    codigo: it.codigo,
    titulo: it.titulo,
    categoria: it.categoria,
    status: it.status,
    versao: it.versao ?? 1,
    responsavel: n(it.responsavel),
    aprovado_por: n(it.aprovadoPor),
    data_vigencia: n(it.dataVigencia),
    objetivo: n(it.objetivo),
    aplicacao_abrangencia: n(it.aplicacaoAbrangencia),
    definicoes: n(it.definicoes),
    responsabilidades: j(it.responsabilidades),
    sipoc: j(it.sipoc),
    fluxo_processo: j(it.fluxoProcesso),
    criterios_decisao: n(it.criteriosDecisao),
    registros_evidencias: n(it.registrosEvidencias),
    indicadores: j(it.indicadores),
    riscos_controles: j(it.riscosControles),
    plano_acao_5w2h: j(it.planoAcao5W2H),
    historico_revisoes: j(it.historicoRevisoes),
    vinculo: it.vinculo ?? null,
    favorito: it.favorito ?? null,
    arquivada: it.arquivada ?? null,
    autor: n(it.autor),
    criado_em: it.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    criado_por_user_id: n(it.criadoPorUserId),
    usuarios_marcados_ids: j(it.usuariosMarcadosIds),
  };
}
export async function getInstrucoesTrabalho(): Promise<InstrucaoTrabalho[]> {
  const { data, error } = await supabase.from('instrucoes_trabalho').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getInstrucoesTrabalho');
  return (data ?? []).map(rowToInstrucao);
}
export async function saveInstrucaoTrabalho(item: InstrucaoTrabalho): Promise<void> {
  const registro = item.id ? item : { ...item, id: `it-${Date.now()}` };
  const { error } = await supabase.from('instrucoes_trabalho').upsert(instrucaoToRow(registro));
  assertNoError(error, 'saveInstrucaoTrabalho');
}
export async function deleteInstrucaoTrabalho(id: string): Promise<void> {
  const { error } = await supabase.from('instrucoes_trabalho').delete().eq('id', id);
  assertNoError(error, 'deleteInstrucaoTrabalho');
}

// ============================================================================
// CONTROLADORIA — ORÇAMENTO (a DRE Gerencial é calculada, não gravada; ver
// src/utils/controladoriaUtils.ts)
// ============================================================================
function rowToOrcamento(r: any): OrcamentoItem {
  return {
    id: r.id,
    setor: r.setor,
    tipoLinha: r.tipo_linha,
    competencia: r.competencia,
    valorPlanejado: Number(r.valor_planejado ?? 0),
    observacoes: u(r.observacoes),
    criadoPor: u(r.criado_por),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
  };
}
function orcamentoToRow(o: OrcamentoItem) {
  return {
    id: o.id,
    setor: o.setor,
    tipo_linha: o.tipoLinha,
    competencia: o.competencia,
    valor_planejado: o.valorPlanejado ?? 0,
    observacoes: n(o.observacoes),
    criado_por: n(o.criadoPor),
    criado_em: o.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
export async function getOrcamentos(): Promise<OrcamentoItem[]> {
  const { data, error } = await supabase.from('orcamentos_controladoria').select('*').order('competencia', { ascending: false });
  assertNoError(error, 'getOrcamentos');
  return (data ?? []).map(rowToOrcamento);
}
export async function saveOrcamentoItem(item: OrcamentoItem): Promise<void> {
  const { error } = await supabase.from('orcamentos_controladoria').upsert(orcamentoToRow(item));
  assertNoError(error, 'saveOrcamentoItem');
}
export async function deleteOrcamentoItem(id: string): Promise<void> {
  const { error } = await supabase.from('orcamentos_controladoria').delete().eq('id', id);
  assertNoError(error, 'deleteOrcamentoItem');
}
