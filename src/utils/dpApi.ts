// ============================================================================
// Camada de acesso a dados do Departamento Pessoal via Supabase.
//
// Espelha, propositalmente, a mesma "forma" das funções que já existiam em
// storage.ts (getX / saveX / deleteX) para o mesmo conjunto de entidades —
// a diferença é que aqui os dados vêm/vão para o banco (Supabase), não mais
// do localStorage do navegador, e por isso todas as funções são assíncronas
// (retornam Promise).
//
// Cada tabela tem Row Level Security exigindo usuário autenticado (ver
// supabase/migrations/001_departamento_pessoal.sql) — só funciona depois de
// login feito (AuthGate). Colunas do tipo lista (dependentes, documentos,
// histórico de fardamento, anotações, anexos, onboarding, fracionamento de
// férias, setores) são gravadas como JSONB, mantendo as mesmas chaves em
// camelCase que a aplicação já usa — o Postgres não se importa com a
// caixa das chaves dentro de um JSONB, só as colunas de verdade viram
// snake_case.
// ============================================================================

import { supabase } from './supabaseClient';
import { buildColaboradorFromPreAdmissao } from './storage';
import {
  Empregador,
  Supervisor,
  CargoSalario,
  FeriadoEmpresa,
  Colaborador,
  ProgramacaoFerias,
  EntregaEpi,
  Ocorrencia,
  QuinzenaValeAlimentacao,
  LancamentoValeAlimentacao,
  StatusFerias,
  MotivoDemissao,
  PreAdmissao,
  StatusPreAdmissao,
  SupervisorPublico,
  ColaboradorPublico,
  EmpregadorPublico,
  AnexoColaborador,
} from '../types';

/** '' e undefined viram null — colunas de data/numéricas do Postgres rejeitam string vazia. */
function n(v: any): any {
  return v === '' || v === undefined ? null : v;
}
/** Para campos JSONB de lista: nunca manda null, manda a lista (vazia se não houver). */
function j(v: any): any {
  return v ?? [];
}
/** null vindo do banco vira undefined, pra bater com os tipos opcionais (?) da aplicação. */
function u<T>(v: T | null): T | undefined {
  return v === null ? undefined : v;
}

function assertNoError(error: { message: string } | null, contexto: string) {
  if (error) {
    throw new Error(`Erro no Supabase (${contexto}): ${error.message}`);
  }
}

// ============================================================================
// ACESSO PÚBLICO (formulários sem login — ver PublicOccurrencePortal.tsx)
//
// supervisores/colaboradores/empregadores exigem usuário autenticado (RLS, ver
// comentário no topo do arquivo) — quem preenche um formulário público (papel
// "anon" do Supabase) não consegue ler NADA dessas tabelas: a query roda sem
// erro, só devolve 0 linhas, e o formulário fica com os campos de seleção
// vazios sem nenhum aviso. As 3 funções abaixo chamam funções do banco
// ("security definer", ver migração 019_acesso_publico_ocorrencias.sql) que
// devolvem só os campos mínimos e não sensíveis de cada tabela — nunca a
// tabela inteira (colaboradores guarda CPF, endereço, dados bancários e de
// saúde, que nunca podem ficar acessíveis por "anon").
// ============================================================================
export async function getSupervisoresPublico(): Promise<SupervisorPublico[]> {
  const { data, error } = await supabase.rpc('obter_supervisores_publico');
  assertNoError(error, 'getSupervisoresPublico');
  return (data ?? []).map((r: any) => ({
    id: r.id,
    nome: r.nome,
    cargo: r.cargo,
    setor: u(r.setor),
  }));
}
/** "Ativos" = não Inativo (mesmo critério que o formulário já usava antes) — inclui quem
 *  está de Férias ou Afastado, só exclui quem já foi desligado. */
export async function getColaboradoresAtivosPublico(): Promise<ColaboradorPublico[]> {
  const { data, error } = await supabase.rpc('obter_colaboradores_ativos_publico');
  assertNoError(error, 'getColaboradoresAtivosPublico');
  return (data ?? []).map((r: any) => ({
    id: r.id,
    nomeCompleto: r.nome_completo,
    funcaoCargo: r.funcao_cargo,
    codigoMatricula: r.codigo_matricula,
    setor: u(r.setor),
    empregadorId: u(r.empregador_id),
    dataAdmissao: u(r.data_admissao),
  }));
}
export async function getEmpregadoresPublico(): Promise<EmpregadorPublico[]> {
  const { data, error } = await supabase.rpc('obter_empregadores_publico');
  assertNoError(error, 'getEmpregadoresPublico');
  return (data ?? []).map((r: any) => ({ id: r.id, razaoSocial: r.razao_social }));
}

// ============================================================================
// EMPREGADORES
// ============================================================================
function rowToEmpregador(r: any): Empregador {
  return {
    id: r.id,
    razaoSocial: r.razao_social,
    nomeFantasia: u(r.nome_fantasia),
    cnpj: r.cnpj,
    endereco: u(r.endereco),
    cidadeUF: u(r.cidade_uf),
    telefone: u(r.telefone),
    responsavelLegal: u(r.responsavel_legal),
    registroAnvisa: u(r.registro_anvisa),
  };
}
export function empregadorToRow(e: Empregador) {
  return {
    id: e.id,
    razao_social: e.razaoSocial,
    nome_fantasia: n(e.nomeFantasia),
    cnpj: e.cnpj,
    endereco: n(e.endereco),
    cidade_uf: n(e.cidadeUF),
    telefone: n(e.telefone),
    responsavel_legal: n(e.responsavelLegal),
    registro_anvisa: n(e.registroAnvisa),
  };
}
export async function getEmpregadores(): Promise<Empregador[]> {
  const { data, error } = await supabase.from('empregadores').select('*').order('razao_social');
  assertNoError(error, 'getEmpregadores');
  return (data ?? []).map(rowToEmpregador);
}
export async function saveEmpregador(item: Empregador): Promise<void> {
  const { error } = await supabase.from('empregadores').upsert(empregadorToRow(item));
  assertNoError(error, 'saveEmpregador');
}

// ============================================================================
// SUPERVISORES
// ============================================================================
function rowToSupervisor(r: any): Supervisor {
  return {
    id: r.id,
    nome: r.nome,
    setor: u(r.setor),
    setores: u(r.setores),
    cargo: r.cargo,
    email: u(r.email),
    telefone: u(r.telefone),
    telefoneWhatsapp: u(r.telefone_whatsapp),
    ativo: u(r.ativo),
  };
}
export function supervisorToRow(s: Supervisor) {
  return {
    id: s.id,
    nome: s.nome,
    setor: n(s.setor),
    setores: s.setores && s.setores.length > 0 ? s.setores : null,
    cargo: s.cargo,
    email: n(s.email),
    telefone: n(s.telefone),
    telefone_whatsapp: n(s.telefoneWhatsapp),
    ativo: s.ativo ?? true,
  };
}
export async function getSupervisores(): Promise<Supervisor[]> {
  const { data, error } = await supabase.from('supervisores').select('*').order('nome');
  assertNoError(error, 'getSupervisores');
  return (data ?? []).map(rowToSupervisor);
}
export async function saveSupervisor(item: Supervisor): Promise<void> {
  const { error } = await supabase.from('supervisores').upsert(supervisorToRow(item));
  assertNoError(error, 'saveSupervisor');
}

// ============================================================================
// CARGOS E SALÁRIOS
// ============================================================================
function rowToCargo(r: any): CargoSalario {
  return {
    id: r.id,
    cargo: r.cargo,
    setor: r.setor,
    faixaSalarialMinima: Number(r.faixa_salarial_minima),
    faixaSalarialMaxima: Number(r.faixa_salarial_maxima),
    pisoConvencaoColetiva: r.piso_convencao_coletiva === null ? undefined : Number(r.piso_convencao_coletiva),
    cbo: u(r.cbo),
    descricao: u(r.descricao),
  };
}
export function cargoToRow(c: CargoSalario) {
  return {
    id: c.id,
    cargo: c.cargo,
    setor: c.setor,
    faixa_salarial_minima: c.faixaSalarialMinima,
    faixa_salarial_maxima: c.faixaSalarialMaxima,
    piso_convencao_coletiva: n(c.pisoConvencaoColetiva),
    cbo: n(c.cbo),
    descricao: n(c.descricao),
  };
}
export async function getCargos(): Promise<CargoSalario[]> {
  const { data, error } = await supabase.from('cargos_salarios').select('*').order('cargo');
  assertNoError(error, 'getCargos');
  return (data ?? []).map(rowToCargo);
}
export async function saveCargo(item: CargoSalario): Promise<void> {
  const { error } = await supabase.from('cargos_salarios').upsert(cargoToRow(item));
  assertNoError(error, 'saveCargo');
}

// ============================================================================
// FERIADOS DA EMPRESA
// ============================================================================
function rowToFeriado(r: any): FeriadoEmpresa {
  return { id: r.id, data: r.data, descricao: r.descricao, tipo: r.tipo };
}
export function feriadoToRow(f: FeriadoEmpresa) {
  return { id: f.id, data: f.data, descricao: f.descricao, tipo: f.tipo };
}
export async function getFeriados(): Promise<FeriadoEmpresa[]> {
  const { data, error } = await supabase.from('feriados_empresa').select('*').order('data');
  assertNoError(error, 'getFeriados');
  return (data ?? []).map(rowToFeriado);
}
export async function saveFeriado(item: FeriadoEmpresa): Promise<void> {
  const { error } = await supabase.from('feriados_empresa').upsert(feriadoToRow(item));
  assertNoError(error, 'saveFeriado');
}

// ============================================================================
// COLABORADORES
// ============================================================================
function rowToColaborador(r: any): Colaborador {
  return {
    id: r.id,
    codigoMatricula: r.codigo_matricula,
    nomeCompleto: r.nome_completo,
    nomePai: u(r.nome_pai),
    nomeMae: u(r.nome_mae),
    dataNascimento: u(r.data_nascimento),
    naturalidade: u(r.naturalidade),
    nacionalidade: u(r.nacionalidade),
    estadoCivil: r.estado_civil,
    racaCor: r.raca_cor,
    grauInstrucao: r.grau_instrucao,
    genero: r.genero,
    enderecoCompleto: u(r.endereco_completo),
    cidadeUF: u(r.cidade_uf),
    cep: u(r.cep),
    telefoneWhatsapp: r.telefone_whatsapp ?? '',
    email: r.email ?? '',
    cpf: r.cpf ?? '',
    rg: u(r.rg),
    orgaoEmissorUF: u(r.orgao_emissor_uf),
    portadorDeficiencia: r.portador_deficiencia ?? false,
    detalheDeficiencia: u(r.detalhe_deficiencia),

    empregadorId: r.empregador_id,
    status: r.status,
    funcaoCargo: r.funcao_cargo ?? '',
    setor: r.setor ?? '',
    setoresAtuacao: u(r.setores_atuacao),
    setorPrincipal: u(r.setor_principal),
    dataAdmissao: r.data_admissao,
    dataDemissao: u(r.data_demissao),
    motivoDemissao: u(r.motivo_demissao),
    supervisorId: u(r.supervisor_id),
    formaPagamento: r.forma_pagamento,
    remuneracao: Number(r.remuneracao ?? 0),
    gratificacao: Number(r.gratificacao ?? 0),
    valorValeAlimentacaoDia: Number(r.valor_vale_alimentacao_dia ?? 0),
    jornadaTrabalho: r.jornada_trabalho ?? '',

    pisoCctFuncao: r.piso_cct_funcao === null ? undefined : Number(r.piso_cct_funcao),
    adicionalInsalubridade: u(r.adicional_insalubridade),
    percentualInsalubridade: r.percentual_insalubridade === null ? undefined : Number(r.percentual_insalubridade),
    adicionalPericulosidade: u(r.adicional_periculosidade),
    adicionalAcumuloFuncao: u(r.adicional_acumulo_funcao),
    adicionalPenosidade: u(r.adicional_penosidade),
    filiadoSintrocern: u(r.filiado_sintrocern),
    possuiQuinquenio: u(r.possui_quinquenio),
    numeroQuinquenios: r.numero_quinquenios === null ? undefined : Number(r.numero_quinquenios),
    antecedentesCriminaisEntregue: u(r.antecedentes_criminais_entregue),
    cnhPontuacaoEntregue: u(r.cnh_pontuacao_entregue),
    termoVtAssinado: u(r.termo_vt_assinado),
    termoFardamentoAssinado: u(r.termo_fardamento_assinado),

    pisPasep: u(r.pis_pasep),
    ctpsNumero: u(r.ctps_numero),
    ctpsSerie: u(r.ctps_serie),
    ctpsUF: u(r.ctps_uf),
    cnhNumero: u(r.cnh_numero),
    cnhCategoria: u(r.cnh_categoria),
    cnhValidade: u(r.cnh_validade),
    tituloEleitorNumero: u(r.titulo_eleitor_numero),
    reservistaNumero: u(r.reservista_numero),

    banco: u(r.banco),
    agencia: u(r.agencia),
    tipoConta: u(r.tipo_conta),
    numeroConta: u(r.numero_conta),
    tipoChavePix: u(r.tipo_chave_pix),
    chavePix: u(r.chave_pix),

    dependentes: j(r.dependentes),

    vtQuantidadeTarifasDia: Number(r.vt_quantidade_tarifas_dia ?? 0),
    vtValorTarifa: Number(r.vt_valor_tarifa ?? 0),
    vtIdentificacaoConducao: u(r.vt_identificacao_conducao),

    dataExameAdmissional: u(r.data_exame_admissional),
    dataUltimoExameOcupacional: u(r.data_ultimo_exame_ocupacional),
    horaUltimoExameOcupacional: u(r.hora_ultimo_exame_ocupacional),
    dataVencimentoExame: u(r.data_vencimento_exame),
    dataExameDemissional: u(r.data_exame_demissional),
    clinicaMedica: u(r.clinica_medica),
    clinicaLocalizacaoLink: u(r.clinica_localizacao_link),
    observacaoSaude: u(r.observacao_saude),
    asoImagemUrl: u(r.aso_imagem_url),
    asoNomeArquivo: u(r.aso_nome_arquivo),
    asoMedicoEmitente: u(r.aso_medico_emitente),
    asoCrmMedico: u(r.aso_crm_medico),
    asoResultado: u(r.aso_resultado),

    documentos: j(r.documentos),

    tamanhoCamisa: r.tamanho_camisa ?? '',
    numeroCalca: r.numero_calca ?? '',
    numeroCalcado: r.numero_calcado ?? '',
    historicoFardamento: j(r.historico_fardamento),

    anotacoes: j(r.anotacoes),
    anexos: j(r.anexos),
    observacoesGerais: u(r.observacoes_gerais),

    onboarding: j(r.onboarding),

    criadoEm: u(r.criado_em),
    atualizadoEm: u(r.atualizado_em),
  };
}
export function colaboradorToRow(c: Colaborador) {
  return {
    id: c.id,
    codigo_matricula: c.codigoMatricula,
    nome_completo: c.nomeCompleto,
    nome_pai: n(c.nomePai),
    nome_mae: n(c.nomeMae),
    data_nascimento: n(c.dataNascimento),
    naturalidade: n(c.naturalidade),
    nacionalidade: n(c.nacionalidade),
    estado_civil: c.estadoCivil,
    raca_cor: c.racaCor,
    grau_instrucao: c.grauInstrucao,
    genero: c.genero,
    endereco_completo: n(c.enderecoCompleto),
    cidade_uf: n(c.cidadeUF),
    cep: n(c.cep),
    telefone_whatsapp: c.telefoneWhatsapp ?? '',
    email: c.email ?? '',
    cpf: c.cpf ?? '',
    rg: n(c.rg),
    orgao_emissor_uf: n(c.orgaoEmissorUF),
    portador_deficiencia: c.portadorDeficiencia ?? false,
    detalhe_deficiencia: n(c.detalheDeficiencia),

    empregador_id: n(c.empregadorId),
    status: c.status,
    funcao_cargo: c.funcaoCargo ?? '',
    setor: c.setor ?? '',
    setores_atuacao: j(c.setoresAtuacao),
    setor_principal: n(c.setorPrincipal),
    data_admissao: n(c.dataAdmissao),
    data_demissao: n(c.dataDemissao),
    motivo_demissao: n(c.motivoDemissao),
    supervisor_id: n(c.supervisorId),
    forma_pagamento: c.formaPagamento,
    remuneracao: c.remuneracao ?? 0,
    gratificacao: c.gratificacao ?? 0,
    valor_vale_alimentacao_dia: c.valorValeAlimentacaoDia ?? 0,
    jornada_trabalho: n(c.jornadaTrabalho),

    piso_cct_funcao: n(c.pisoCctFuncao),
    adicional_insalubridade: c.adicionalInsalubridade ?? null,
    percentual_insalubridade: n(c.percentualInsalubridade),
    adicional_periculosidade: c.adicionalPericulosidade ?? null,
    adicional_acumulo_funcao: c.adicionalAcumuloFuncao ?? null,
    adicional_penosidade: c.adicionalPenosidade ?? null,
    filiado_sintrocern: c.filiadoSintrocern ?? null,
    possui_quinquenio: c.possuiQuinquenio ?? null,
    numero_quinquenios: n(c.numeroQuinquenios),
    antecedentes_criminais_entregue: c.antecedentesCriminaisEntregue ?? null,
    cnh_pontuacao_entregue: c.cnhPontuacaoEntregue ?? null,
    termo_vt_assinado: c.termoVtAssinado ?? null,
    termo_fardamento_assinado: c.termoFardamentoAssinado ?? null,

    pis_pasep: n(c.pisPasep),
    ctps_numero: n(c.ctpsNumero),
    ctps_serie: n(c.ctpsSerie),
    ctps_uf: n(c.ctpsUF),
    cnh_numero: n(c.cnhNumero),
    cnh_categoria: n(c.cnhCategoria),
    cnh_validade: n(c.cnhValidade),
    titulo_eleitor_numero: n(c.tituloEleitorNumero),
    reservista_numero: n(c.reservistaNumero),

    banco: n(c.banco),
    agencia: n(c.agencia),
    tipo_conta: n(c.tipoConta),
    numero_conta: n(c.numeroConta),
    tipo_chave_pix: n(c.tipoChavePix),
    chave_pix: n(c.chavePix),

    dependentes: j(c.dependentes),

    vt_quantidade_tarifas_dia: c.vtQuantidadeTarifasDia ?? 0,
    vt_valor_tarifa: c.vtValorTarifa ?? 0,
    vt_identificacao_conducao: n(c.vtIdentificacaoConducao),

    data_exame_admissional: n(c.dataExameAdmissional),
    data_ultimo_exame_ocupacional: n(c.dataUltimoExameOcupacional),
    hora_ultimo_exame_ocupacional: n(c.horaUltimoExameOcupacional),
    data_vencimento_exame: n(c.dataVencimentoExame),
    data_exame_demissional: n(c.dataExameDemissional),
    clinica_medica: n(c.clinicaMedica),
    clinica_localizacao_link: n(c.clinicaLocalizacaoLink),
    observacao_saude: n(c.observacaoSaude),
    aso_imagem_url: n(c.asoImagemUrl),
    aso_nome_arquivo: n(c.asoNomeArquivo),
    aso_medico_emitente: n(c.asoMedicoEmitente),
    aso_crm_medico: n(c.asoCrmMedico),
    aso_resultado: n(c.asoResultado),

    documentos: j(c.documentos),

    tamanho_camisa: c.tamanhoCamisa ?? '',
    numero_calca: c.numeroCalca ?? '',
    numero_calcado: c.numeroCalcado ?? '',
    historico_fardamento: j(c.historicoFardamento),

    anotacoes: j(c.anotacoes),
    anexos: j(c.anexos),
    observacoes_gerais: n(c.observacoesGerais),

    onboarding: j(c.onboarding),

    criado_em: c.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
export async function getColaboradores(): Promise<Colaborador[]> {
  const { data, error } = await supabase.from('colaboradores').select('*').order('nome_completo');
  assertNoError(error, 'getColaboradores');
  return (data ?? []).map(rowToColaborador);
}

/** Mesma lista de sempre, mas sem os arquivos em base64 embutidos (foto/PDF do ASO e o
 *  conteúdo de cada documento/anexo) — só o essencial pra tabelas, dropdowns e badges. Evita
 *  baixar dezenas/centenas de MB toda vez que o módulo de DP carrega; ver migração
 *  030_colaboradores_resumo_leve.sql. Quem precisa do arquivo de verdade usa
 *  getColaboradorCompleto(id) na hora de abrir a ficha/edição/renovação. */
export async function getColaboradoresResumo(): Promise<Colaborador[]> {
  const { data, error } = await supabase.rpc('obter_colaboradores_resumo');
  assertNoError(error, 'getColaboradoresResumo');
  return (data ?? []).map(rowToColaborador);
}

/** Registro completo de UM colaborador, com os arquivos de verdade (foto/PDF do ASO,
 *  documentos, anexos do dossiê) — usar só ao abrir a ficha, editar o cadastro ou renovar o
 *  ASO; nunca pra montar listas (ver getColaboradoresResumo). */
export async function getColaboradorCompleto(id: string): Promise<Colaborador | null> {
  const { data, error } = await supabase.from('colaboradores').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'getColaboradorCompleto');
  return data ? rowToColaborador(data) : null;
}
export async function saveColaborador(colaborador: Colaborador): Promise<void> {
  const isNovo = !colaborador.id;
  const item: Colaborador = isNovo
    ? { ...colaborador, id: `colab-${Date.now()}` }
    : colaborador;
  if (!item.codigoMatricula) {
    const { count } = await supabase.from('colaboradores').select('*', { count: 'exact', head: true });
    item.codigoMatricula = `JMT-${String((count ?? 0) + 101).padStart(4, '0')}`;
  }
  const { error } = await supabase.from('colaboradores').upsert(colaboradorToRow(item));
  assertNoError(error, 'saveColaborador');
}
export async function deleteColaborador(id: string): Promise<void> {
  const { error } = await supabase.from('colaboradores').delete().eq('id', id);
  assertNoError(error, 'deleteColaborador');
}
export async function inativarColaborador(
  id: string,
  dataDemissao: string,
  motivoDemissao: MotivoDemissao | string,
  dataExameDemissional?: string,
  observacao?: string
): Promise<void> {
  const patch: Record<string, any> = {
    status: 'Inativo',
    data_demissao: dataDemissao,
    motivo_demissao: motivoDemissao,
    atualizado_em: new Date().toISOString(),
  };
  if (dataExameDemissional) patch.data_exame_demissional = dataExameDemissional;
  if (observacao) patch.observacao_saude = observacao;
  const { error } = await supabase.from('colaboradores').update(patch).eq('id', id);
  assertNoError(error, 'inativarColaborador');
}

// ============================================================================
// PROGRAMAÇÃO DE FÉRIAS
// ============================================================================
function rowToFerias(r: any): ProgramacaoFerias {
  return {
    id: r.id,
    colaboradorId: r.colaborador_id,
    assunto: u(r.assunto),
    periodoAquisitivoInicio: u(r.periodo_aquisitivo_inicio),
    periodoAquisitivoFim: u(r.periodo_aquisitivo_fim),
    prazoLimiteGozo: u(r.prazo_limite_gozo),
    dataLimiteLegal: u(r.data_limite_legal),
    dataAdmissaoReferencia: u(r.data_admissao_referencia),
    diasDireito: r.dias_direito === null ? undefined : Number(r.dias_direito),
    abonoPecuniario: u(r.abono_pecuniario),
    vende10Dias: u(r.vende_10_dias),
    diasAbono: r.dias_abono === null ? undefined : Number(r.dias_abono),
    diasGozados: r.dias_gozados === null ? undefined : Number(r.dias_gozados),
    totalDias: r.total_dias === null ? undefined : Number(r.total_dias),
    mesReferencia: u(r.mes_referencia),
    dataInicio: u(r.data_inicio),
    dataTermino: u(r.data_termino),
    dataRetorno: u(r.data_retorno),
    dataFim: u(r.data_fim),
    fracionamento: u(r.fracionamento),
    status: r.status,
    emailAvisoGerado: u(r.email_aviso_gerado),
    avisoEnviadoEm: u(r.aviso_enviado_em),
    comprovanteAssinadoUrl: u(r.comprovante_assinado_url),
    comprovanteAssinadoNomeArquivo: u(r.comprovante_assinado_nome_arquivo),
    observacoes: u(r.observacoes),
  };
}
export function feriasToRow(f: ProgramacaoFerias) {
  return {
    id: f.id,
    colaborador_id: f.colaboradorId,
    assunto: n(f.assunto),
    periodo_aquisitivo_inicio: n(f.periodoAquisitivoInicio),
    periodo_aquisitivo_fim: n(f.periodoAquisitivoFim),
    prazo_limite_gozo: n(f.prazoLimiteGozo),
    data_limite_legal: n(f.dataLimiteLegal),
    data_admissao_referencia: n(f.dataAdmissaoReferencia),
    dias_direito: n(f.diasDireito),
    abono_pecuniario: f.abonoPecuniario ?? null,
    vende_10_dias: f.vende10Dias ?? null,
    dias_abono: n(f.diasAbono),
    dias_gozados: n(f.diasGozados),
    total_dias: n(f.totalDias),
    mes_referencia: n(f.mesReferencia),
    data_inicio: n(f.dataInicio),
    data_termino: n(f.dataTermino),
    data_retorno: n(f.dataRetorno),
    data_fim: n(f.dataFim),
    fracionamento: f.fracionamento ?? null,
    status: f.status,
    email_aviso_gerado: n(f.emailAvisoGerado),
    aviso_enviado_em: n(f.avisoEnviadoEm),
    comprovante_assinado_url: n(f.comprovanteAssinadoUrl),
    comprovante_assinado_nome_arquivo: n(f.comprovanteAssinadoNomeArquivo),
    observacoes: n(f.observacoes),
  };
}
export async function getFerias(): Promise<ProgramacaoFerias[]> {
  const { data, error } = await supabase.from('programacao_ferias').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getFerias');
  return (data ?? []).map(rowToFerias);
}
export async function saveFerias(feriasItem: ProgramacaoFerias): Promise<void> {
  const item = feriasItem.id ? feriasItem : { ...feriasItem, id: `fer-${Date.now()}` };
  const { error } = await supabase.from('programacao_ferias').upsert(feriasToRow(item));
  assertNoError(error, 'saveFerias');
}
export async function updateStatusFerias(id: string, newStatus: StatusFerias): Promise<void> {
  const { error } = await supabase.from('programacao_ferias').update({ status: newStatus }).eq('id', id);
  assertNoError(error, 'updateStatusFerias');
}
export async function deleteFerias(id: string): Promise<void> {
  const { error } = await supabase.from('programacao_ferias').delete().eq('id', id);
  assertNoError(error, 'deleteFerias');
}

// ============================================================================
// ENTREGA DE EPI
// ============================================================================
function rowToEntregaEpi(r: any): EntregaEpi {
  return {
    id: r.id,
    colaboradorId: u(r.colaborador_id),
    recebedorNomeLivre: u(r.recebedor_nome_livre),
    data: r.data,
    responsavelEntrega: u(r.responsavel_entrega),
    itens: j(r.itens),
    observacoes: u(r.observacoes),
    comprovanteAssinadoUrl: u(r.comprovante_assinado_url),
    comprovanteAssinadoNomeArquivo: u(r.comprovante_assinado_nome_arquivo),
    assinaturaDigitalUrl: u(r.assinatura_digital_url),
    criadoEm: u(r.criado_em),
  };
}
export function entregaEpiToRow(e: EntregaEpi) {
  return {
    id: e.id,
    colaborador_id: n(e.colaboradorId),
    recebedor_nome_livre: n(e.recebedorNomeLivre),
    data: e.data,
    responsavel_entrega: n(e.responsavelEntrega),
    itens: j(e.itens),
    observacoes: n(e.observacoes),
    comprovante_assinado_url: n(e.comprovanteAssinadoUrl),
    comprovante_assinado_nome_arquivo: n(e.comprovanteAssinadoNomeArquivo),
    assinatura_digital_url: n(e.assinaturaDigitalUrl),
  };
}
export async function getEntregasEpi(): Promise<EntregaEpi[]> {
  const { data, error } = await supabase.from('entregas_epi').select('*').order('data', { ascending: false });
  assertNoError(error, 'getEntregasEpi');
  return (data ?? []).map(rowToEntregaEpi);
}
export async function saveEntregaEpi(entrega: EntregaEpi): Promise<void> {
  const item = entrega.id ? entrega : { ...entrega, id: `epi-${Date.now()}` };
  const { error } = await supabase.from('entregas_epi').upsert(entregaEpiToRow(item));
  assertNoError(error, 'saveEntregaEpi');
}
export async function deleteEntregaEpi(id: string): Promise<void> {
  const { error } = await supabase.from('entregas_epi').delete().eq('id', id);
  assertNoError(error, 'deleteEntregaEpi');
}

// ============================================================================
// OCORRÊNCIAS
// ============================================================================
function rowToOcorrencia(r: any): Ocorrencia {
  return {
    id: r.id,
    colaboradorId: r.colaborador_id,
    colaboradorNome: u(r.colaborador_nome),
    setor: u(r.setor),
    data: u(r.data),
    dataOcorrencia: u(r.data_ocorrencia),
    tipo: r.tipo,
    diasAfastamento: r.dias_afastamento === null ? undefined : Number(r.dias_afastamento),
    horaInicio: u(r.hora_inicio),
    horaFim: u(r.hora_fim),
    descricao: r.descricao,
    supervisorId: u(r.supervisor_id),
    supervisorNome: u(r.supervisor_nome),
    status: u(r.status),
    acaoTomada: u(r.acao_tomada),
    comprovanteAnexo: u(r.comprovante_anexo),
    comprovanteArquivoUrl: u(r.comprovante_arquivo_url),
    registradoPor: u(r.registrado_por),
    origem: u(r.origem),
    criadoEm: u(r.criado_em),
  };
}
export function ocorrenciaToRow(o: Ocorrencia) {
  return {
    id: o.id,
    colaborador_id: o.colaboradorId,
    colaborador_nome: n(o.colaboradorNome),
    setor: n(o.setor),
    data: n(o.data),
    data_ocorrencia: n(o.dataOcorrencia),
    tipo: o.tipo,
    dias_afastamento: n(o.diasAfastamento),
    hora_inicio: n(o.horaInicio),
    hora_fim: n(o.horaFim),
    descricao: o.descricao,
    supervisor_id: n(o.supervisorId),
    supervisor_nome: n(o.supervisorNome),
    status: n(o.status),
    acao_tomada: n(o.acaoTomada),
    comprovante_anexo: n(o.comprovanteAnexo),
    comprovante_arquivo_url: n(o.comprovanteArquivoUrl),
    registrado_por: n(o.registradoPor),
    origem: n(o.origem),
    criado_em: o.criadoEm || new Date().toISOString(),
  };
}
export async function getOcorrencias(): Promise<Ocorrencia[]> {
  const { data, error } = await supabase.from('ocorrencias').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getOcorrencias');
  return (data ?? []).map(rowToOcorrencia);
}
export async function saveOcorrencia(item: Ocorrencia): Promise<void> {
  const registro = item.id ? item : { ...item, id: `oco-${Date.now()}` };
  const { error } = await supabase.from('ocorrencias').upsert(ocorrenciaToRow(registro));
  assertNoError(error, 'saveOcorrencia');
}
export async function deleteOcorrencia(id: string): Promise<void> {
  const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
  assertNoError(error, 'deleteOcorrencia');
}

// ============================================================================
// VALE ALIMENTAÇÃO — QUINZENAS
// ============================================================================
function rowToQuinzena(r: any): QuinzenaValeAlimentacao {
  return { id: r.id, identificacao: r.identificacao, dataInicio: r.data_inicio, dataTermino: r.data_termino };
}
export function quinzenaToRow(q: QuinzenaValeAlimentacao) {
  return { id: q.id, identificacao: q.identificacao, data_inicio: q.dataInicio, data_termino: q.dataTermino };
}
export async function getQuinzenasValeAlimentacao(): Promise<QuinzenaValeAlimentacao[]> {
  const { data, error } = await supabase.from('quinzenas_va').select('*').order('data_inicio');
  assertNoError(error, 'getQuinzenasValeAlimentacao');
  return (data ?? []).map(rowToQuinzena);
}
export async function saveQuinzenaValeAlimentacao(item: QuinzenaValeAlimentacao): Promise<void> {
  const registro = item.id ? item : { ...item, id: `quinz-va-${Date.now()}` };
  const { error } = await supabase.from('quinzenas_va').upsert(quinzenaToRow(registro));
  assertNoError(error, 'saveQuinzenaValeAlimentacao');
}
export async function deleteQuinzenaValeAlimentacao(id: string): Promise<void> {
  const { error } = await supabase.from('quinzenas_va').delete().eq('id', id);
  assertNoError(error, 'deleteQuinzenaValeAlimentacao');
}

// ============================================================================
// VALE ALIMENTAÇÃO — LANÇAMENTOS
// ============================================================================
function rowToLancamentoVA(r: any): LancamentoValeAlimentacao {
  return {
    id: r.id,
    colaboradorId: r.colaborador_id,
    colaboradorNome: u(r.colaborador_nome),
    quinzenaId: r.quinzena_id,
    identificacaoQuinzena: r.identificacao_quinzena,
    dataInicio: r.data_inicio,
    dataTermino: r.data_termino,
    valorDiaria: Number(r.valor_diaria ?? 0),
    faltas: Number(r.faltas ?? 0),
    diasFerias: r.dias_ferias === null ? undefined : Number(r.dias_ferias),
    quantidadeDiarias: Number(r.quantidade_diarias ?? 0),
    valorDisponibilizado: Number(r.valor_disponibilizado ?? 0),
    observacoes: u(r.observacoes),
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
  };
}
export function lancamentoVAToRow(l: LancamentoValeAlimentacao) {
  return {
    id: l.id,
    colaborador_id: l.colaboradorId,
    colaborador_nome: n(l.colaboradorNome),
    quinzena_id: l.quinzenaId,
    identificacao_quinzena: l.identificacaoQuinzena,
    data_inicio: l.dataInicio,
    data_termino: l.dataTermino,
    valor_diaria: l.valorDiaria ?? 0,
    faltas: l.faltas ?? 0,
    dias_ferias: n(l.diasFerias),
    quantidade_diarias: l.quantidadeDiarias ?? 0,
    valor_disponibilizado: l.valorDisponibilizado ?? 0,
    observacoes: n(l.observacoes),
    criado_em: l.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
}
export async function getLancamentosValeAlimentacao(): Promise<LancamentoValeAlimentacao[]> {
  const { data, error } = await supabase.from('lancamentos_va').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getLancamentosValeAlimentacao');
  return (data ?? []).map(rowToLancamentoVA);
}
/** Grava uma lista inteira de lançamentos de uma vez (upsert em lote) — usado ao gerar/sincronizar
 *  todos os lançamentos de uma quinzena de uma só vez. */
export async function saveLancamentosValeAlimentacao(items: LancamentoValeAlimentacao[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('lancamentos_va').upsert(items.map(lancamentoVAToRow));
  assertNoError(error, 'saveLancamentosValeAlimentacao');
}
export async function saveLancamentoValeAlimentacao(item: LancamentoValeAlimentacao): Promise<void> {
  const registro = item.id ? item : { ...item, id: `lanc-va-${Date.now()}` };
  const { error } = await supabase.from('lancamentos_va').upsert(lancamentoVAToRow(registro));
  assertNoError(error, 'saveLancamentoValeAlimentacao');
}
export async function deleteLancamentoValeAlimentacao(id: string): Promise<void> {
  const { error } = await supabase.from('lancamentos_va').delete().eq('id', id);
  assertNoError(error, 'deleteLancamentoValeAlimentacao');
}

// ============================================================================
// OUTRAS OPERAÇÕES SOBRE COLABORADOR (renovação de ASO, onboarding, efetivação
// de pré-admissão) — equivalentes às de storage.ts, só que gravando no Supabase.
// ============================================================================
export async function renovarExameASO(
  colaboradorId: string,
  dataUltimoExame: string,
  dataVencimento: string,
  clinica?: string,
  asoImagemUrl?: string,
  asoNomeArquivo?: string,
  asoMedicoEmitente?: string,
  asoResultado?: 'Apto' | 'Inapto' | 'Apto com Restrições',
  clinicaLocalizacaoLink?: string,
  horaExame?: string,
  anexoAsoAntigoParaArquivar?: AnexoColaborador
): Promise<void> {
  const patch: Record<string, any> = {
    data_ultimo_exame_ocupacional: dataUltimoExame,
    data_vencimento_exame: dataVencimento,
    atualizado_em: new Date().toISOString(),
  };
  if (clinica !== undefined) patch.clinica_medica = clinica;
  if (clinicaLocalizacaoLink !== undefined) patch.clinica_localizacao_link = clinicaLocalizacaoLink;
  if (horaExame !== undefined) patch.hora_ultimo_exame_ocupacional = horaExame;
  if (asoImagemUrl !== undefined) patch.aso_imagem_url = asoImagemUrl;
  if (asoNomeArquivo !== undefined) patch.aso_nome_arquivo = asoNomeArquivo;
  if (asoMedicoEmitente !== undefined) patch.aso_medico_emitente = asoMedicoEmitente;
  if (asoResultado !== undefined) patch.aso_resultado = asoResultado;

  // Ao substituir o comprovante do ASO, o antigo vai pro Dossiê de Anexos do colaborador em
  // vez de simplesmente ser perdido — lê a lista atual e regrava com o item novo na frente
  // (mesmo padrão de leitura-antes-de-regravar já usado em updateOnboardingItem).
  if (anexoAsoAntigoParaArquivar) {
    const { data, error: getError } = await supabase
      .from('colaboradores')
      .select('anexos')
      .eq('id', colaboradorId)
      .single();
    assertNoError(getError, 'renovarExameASO (leitura anexos)');
    const anexosAtuais: AnexoColaborador[] = Array.isArray(data?.anexos) ? data.anexos : [];
    patch.anexos = [anexoAsoAntigoParaArquivar, ...anexosAtuais];
  }

  const { error } = await supabase.from('colaboradores').update(patch).eq('id', colaboradorId);
  assertNoError(error, 'renovarExameASO');
}

/** Só registra o AGENDAMENTO de um exame ASO futuro (data/hora marcada, clínica, link de
 *  localização) — usado quando o exame ainda VAI acontecer, não quando já aconteceu. Ao
 *  contrário de `renovarExameASO`, NUNCA mexe em `data_vencimento_exame`/`aso_resultado`/
 *  comprovante: o colaborador continua "Vencido"/"A Vencer" normalmente até a renovação de
 *  verdade (com o exame já realizado) ser salva depois. */
export async function agendarExameASO(
  colaboradorId: string,
  dataAgendada: string,
  clinica?: string,
  clinicaLocalizacaoLink?: string,
  horaAgendada?: string
): Promise<void> {
  const patch: Record<string, any> = {
    data_ultimo_exame_ocupacional: dataAgendada,
    atualizado_em: new Date().toISOString(),
  };
  if (clinica !== undefined) patch.clinica_medica = clinica;
  if (clinicaLocalizacaoLink !== undefined) patch.clinica_localizacao_link = clinicaLocalizacaoLink;
  if (horaAgendada !== undefined) patch.hora_ultimo_exame_ocupacional = horaAgendada;
  const { error } = await supabase.from('colaboradores').update(patch).eq('id', colaboradorId);
  assertNoError(error, 'agendarExameASO');
}

/** Lê o onboarding atual do colaborador, marca/desmarca o item pelo nome da etapa e regrava —
 *  o Supabase não faz "patch parcial de um item dentro de um JSONB" sozinho, por isso o
 *  read-modify-write aqui. */
export async function updateOnboardingItem(
  colaboradorId: string,
  itemKey: string,
  concluido: boolean
): Promise<void> {
  const { data, error: getError } = await supabase
    .from('colaboradores')
    .select('onboarding')
    .eq('id', colaboradorId)
    .single();
  assertNoError(getError, 'updateOnboardingItem (leitura)');
  const list: any[] = Array.isArray(data?.onboarding) ? [...data.onboarding] : [];
  const hoje = new Date().toISOString().slice(0, 10);
  const itemIdx = list.findIndex((i) => i.item === itemKey);
  if (itemIdx >= 0) {
    list[itemIdx] = { ...list[itemIdx], concluido, dataConclusao: concluido ? hoje : undefined };
  } else {
    list.push({ item: itemKey, concluido, dataConclusao: concluido ? hoje : undefined });
  }
  const { error } = await supabase
    .from('colaboradores')
    .update({ onboarding: list, atualizado_em: new Date().toISOString() })
    .eq('id', colaboradorId);
  assertNoError(error, 'updateOnboardingItem (escrita)');
}

/** Efetiva uma pré-admissão como Colaborador ativo, gravando direto no Supabase. Quem chama
 *  esta função cuida de atualizar o status/vínculo da pré-admissão em si separadamente
 *  (ver App.tsx e updatePreAdmissaoStatus/savePreAdmissao abaixo). */
export async function efetivarPreAdmissao(
  pre: PreAdmissao,
  config: {
    empregadorId?: string;
    funcaoCargo?: string;
    setor?: string;
    dataAdmissao?: string;
    remuneracao?: number;
    gratificacao?: number;
    valorValeAlimentacaoDia?: number;
    jornadaTrabalho?: string;
    supervisorId?: string;
  } | undefined
): Promise<Colaborador> {
  const { count } = await supabase.from('colaboradores').select('*', { count: 'exact', head: true });
  const novoColaborador = buildColaboradorFromPreAdmissao(pre, config, count ?? 0);
  const { error } = await supabase.from('colaboradores').upsert(colaboradorToRow(novoColaborador));
  assertNoError(error, 'efetivarPreAdmissao');
  return novoColaborador;
}

// ============================================================================
// PRÉ-ADMISSÕES (formulário público de admissão digital)
// ============================================================================
// Tabela com RLS diferente de todas as outras: o candidato preenche o formulário
// SEM login (papel "anon" da chave pública), então só pode INSERIR o próprio
// registro — nunca ler, editar ou apagar (ver supabase/migrations/005_pre_admissoes.sql).
// Só o Departamento Pessoal (logado, "authenticated") lê/edita/aprova/apaga.
function rowToPreAdmissao(r: any): PreAdmissao {
  return {
    id: r.id,
    token: r.token,
    criadoEm: r.criado_em,
    atualizadoEm: u(r.atualizado_em),
    status: r.status,
    empresaPredefinidaId: u(r.empresa_predefinida_id),
    cargoPredefinido: u(r.cargo_predefinido),
    supervisorPredefinidoId: u(r.supervisor_predefinido_id),
    observacoesDP: u(r.observacoes_dp),
    colaboradorEfetivadoId: u(r.colaborador_efetivado_id),
    dadosPessoais: r.dados_pessoais ?? {},
    contatoEndereco: r.contato_endereco ?? {},
    dadosBancarios: r.dados_bancarios ?? {},
    transporte: r.transporte ?? {},
    filiacaoSindical: u(r.filiacao_sindical),
    termosCCT: u(r.termos_cct),
    dependentes: j(r.dependentes),
    fardamento: r.fardamento ?? {},
    documentosEnviados: j(r.documentos_enviados),
    declaracaoVeracidade: r.declaracao_veracidade ?? false,
    aceiteLgpd: u(r.aceite_lgpd),
    dataEnvio: u(r.data_envio),
  };
}
function preAdmissaoToRow(p: PreAdmissao) {
  return {
    id: p.id,
    token: p.token,
    criado_em: p.criadoEm || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    status: p.status,
    empresa_predefinida_id: n(p.empresaPredefinidaId),
    cargo_predefinido: n(p.cargoPredefinido),
    supervisor_predefinido_id: n(p.supervisorPredefinidoId),
    observacoes_dp: n(p.observacoesDP),
    colaborador_efetivado_id: n(p.colaboradorEfetivadoId),
    dados_pessoais: p.dadosPessoais ?? {},
    contato_endereco: p.contatoEndereco ?? {},
    dados_bancarios: p.dadosBancarios ?? {},
    transporte: p.transporte ?? {},
    filiacao_sindical: p.filiacaoSindical ?? null,
    termos_cct: p.termosCCT ?? null,
    dependentes: j(p.dependentes),
    fardamento: p.fardamento ?? {},
    documentos_enviados: j(p.documentosEnviados),
    declaracao_veracidade: p.declaracaoVeracidade ?? false,
    aceite_lgpd: p.aceiteLgpd ?? null,
    data_envio: n(p.dataEnvio),
  };
}
export async function getPreAdmissoes(): Promise<PreAdmissao[]> {
  const { data, error } = await supabase.from('pre_admissoes').select('*').order('criado_em', { ascending: false });
  assertNoError(error, 'getPreAdmissoes');
  return (data ?? []).map(rowToPreAdmissao);
}
export async function getPreAdmissaoById(id: string): Promise<PreAdmissao | undefined> {
  const { data, error } = await supabase.from('pre_admissoes').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'getPreAdmissaoById');
  return data ? rowToPreAdmissao(data) : undefined;
}
/** Cria a pré-admissão (usado pelo formulário público — candidato sem login, papel "anon"). O
 *  candidato nunca faz upsert por token (não tem permissão de leitura): cada envio gera um
 *  registro novo, com um id sempre novo mesmo que reutilize um token de convite já existente. */
export async function savePreAdmissao(item: PreAdmissao): Promise<void> {
  const registro = item.id ? item : { ...item, id: `preadm-${Date.now()}` };
  const { error } = await supabase.from('pre_admissoes').upsert(preAdmissaoToRow(registro));
  assertNoError(error, 'savePreAdmissao');
}
export async function updatePreAdmissaoStatus(
  id: string,
  status: StatusPreAdmissao,
  observacoesDP?: string
): Promise<void> {
  const patch: Record<string, any> = { status, atualizado_em: new Date().toISOString() };
  if (observacoesDP !== undefined) patch.observacoes_dp = observacoesDP;
  const { error } = await supabase.from('pre_admissoes').update(patch).eq('id', id);
  assertNoError(error, 'updatePreAdmissaoStatus');
}
export async function deletePreAdmissao(id: string): Promise<void> {
  const { error } = await supabase.from('pre_admissoes').delete().eq('id', id);
  assertNoError(error, 'deletePreAdmissao');
}

// ============================================================================
// LINKS DE COMPARTILHAMENTO DA FICHA CADASTRAL (pra terceiro externo: contador,
// fiscalização, RH de outra empresa — sem login). Ver
// supabase/migrations/007_fichas_cadastrais_compartilhadas.sql.
// ============================================================================

export interface FichaCompartilhada {
  token: string;
  colaboradorId: string;
  colaboradorNome: string;
  dados: Record<string, any>;
  criadoEm: string;
  criadoPor?: string;
  expiraEm: string;
  revogado: boolean;
}

/** Campos do Colaborador que NUNCA entram no link — são anotações de uso interno do RH
 *  (texto livre, não documentos) e não fazem parte do que se chama de "ficha cadastral"
 *  pra fins externos. `anexos` (o Dossiê de Anexos — arquivos de verdade, não notas) fica
 *  DE FORA dessa lista de propósito: o usuário pediu que os arquivos anexados também
 *  fiquem disponíveis pra baixar no link, junto com o ASO e o checklist de documentos. */
const CAMPOS_INTERNOS_EXCLUIDOS_DA_FICHA = [
  'anotacoes',
  'observacoesGerais',
  'historicoFardamento',
];

/** Token de 256 bits (32 bytes aleatórios em hex) — imprevisível, funciona como
 *  a própria "senha" de acesso ao link. */
function gerarTokenFichaCompartilhada(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function rowToFichaCompartilhada(r: any): FichaCompartilhada {
  return {
    token: r.token,
    colaboradorId: r.colaborador_id,
    colaboradorNome: r.colaborador_nome,
    dados: r.dados,
    criadoEm: r.criado_em,
    criadoPor: u(r.criado_por),
    expiraEm: r.expira_em,
    revogado: !!r.revogado,
  };
}

/** Gera um novo link de compartilhamento da ficha cadastral do colaborador — tira
 *  uma "foto" dos dados agora (não reflete edições futuras no cadastro) e expira
 *  em `validadeDias` dias (padrão 7). Retorna o registro já com o token pra montar
 *  a URL. */
export async function gerarLinkFichaCompartilhada(
  colaborador: Colaborador,
  criadoPor?: string,
  validadeDias = 7
): Promise<FichaCompartilhada> {
  const token = gerarTokenFichaCompartilhada();
  const dados = Object.fromEntries(
    Object.entries(colaborador).filter(([campo]) => !CAMPOS_INTERNOS_EXCLUIDOS_DA_FICHA.includes(campo))
  );
  const expiraEm = new Date(Date.now() + validadeDias * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('fichas_cadastrais_compartilhadas').insert({
    token,
    colaborador_id: colaborador.id,
    colaborador_nome: colaborador.nomeCompleto,
    dados,
    criado_por: n(criadoPor),
    expira_em: expiraEm,
  });
  assertNoError(error, 'gerarLinkFichaCompartilhada');

  return {
    token,
    colaboradorId: colaborador.id,
    colaboradorNome: colaborador.nomeCompleto,
    dados,
    criadoEm: new Date().toISOString(),
    criadoPor,
    expiraEm,
    revogado: false,
  };
}

/** Lista os links já gerados pra um colaborador (mais recente primeiro) — usado
 *  pra mostrar/gerenciar/revogar os links ativos na tela de RH. */
export async function listarLinksFichaCompartilhada(colaboradorId: string): Promise<FichaCompartilhada[]> {
  const { data, error } = await supabase
    .from('fichas_cadastrais_compartilhadas')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('criado_em', { ascending: false });
  assertNoError(error, 'listarLinksFichaCompartilhada');
  return (data ?? []).map(rowToFichaCompartilhada);
}

/** Revoga um link antes do prazo — a partir daqui, o token nunca mais é aceito. */
export async function revogarLinkFichaCompartilhada(token: string): Promise<void> {
  const { error } = await supabase
    .from('fichas_cadastrais_compartilhadas')
    .update({ revogado: true })
    .eq('token', token);
  assertNoError(error, 'revogarLinkFichaCompartilhada');
}

/** Usada pela tela pública (sem login, papel "anon"): chama a função do banco
 *  obter_ficha_compartilhada, que só devolve algo se o token bater exatamente
 *  com um link válido, não revogado e ainda não expirado. Retorna null se o
 *  link for inválido/expirado/revogado — a tela decide o que mostrar. */
export async function obterFichaCompartilhadaPublica(token: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase.rpc('obter_ficha_compartilhada', { p_token: token });
  assertNoError(error, 'obterFichaCompartilhadaPublica');
  return (data as Record<string, any> | null) ?? null;
}

// ============================================================================
// LINKS DE COMPARTILHAMENTO DA FICHA DE EPI (mesmo raciocínio da Ficha Cadastral
// acima — token de 256 bits, snapshot no momento da geração, expira em 7 dias,
// revogável). Ver supabase/migrations/035_entregas_epi_compartilhadas.sql.
// ============================================================================

export interface EpiCompartilhada {
  token: string;
  colaboradorId: string;
  colaboradorNome: string;
  dados: Record<string, any>;
  criadoEm: string;
  criadoPor?: string;
  expiraEm: string;
  revogado: boolean;
}

function rowToEpiCompartilhada(r: any): EpiCompartilhada {
  return {
    token: r.token,
    colaboradorId: r.colaborador_id,
    colaboradorNome: r.colaborador_nome,
    dados: r.dados,
    criadoEm: r.criado_em,
    criadoPor: u(r.criado_por),
    expiraEm: r.expira_em,
    revogado: !!r.revogado,
  };
}

/** Gera um novo link de compartilhamento da ficha de EPI de um colaborador — `dados` já vem
 *  achatado pela tela (colaboradorNome/funcaoCargo/linhas, mesma forma que EpiFichaDocumento
 *  espera) porque é só uma "foto" do que existe agora, não reflete entregas futuras. */
export async function gerarLinkEpiCompartilhado(
  colaboradorId: string,
  colaboradorNome: string,
  dados: Record<string, any>,
  criadoPor?: string,
  validadeDias = 7
): Promise<EpiCompartilhada> {
  const token = gerarTokenFichaCompartilhada();
  const expiraEm = new Date(Date.now() + validadeDias * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('entregas_epi_compartilhadas').insert({
    token,
    colaborador_id: colaboradorId,
    colaborador_nome: colaboradorNome,
    dados,
    criado_por: n(criadoPor),
    expira_em: expiraEm,
  });
  assertNoError(error, 'gerarLinkEpiCompartilhado');

  return { token, colaboradorId, colaboradorNome, dados, criadoEm: new Date().toISOString(), criadoPor, expiraEm, revogado: false };
}

export async function listarLinksEpiCompartilhado(colaboradorId: string): Promise<EpiCompartilhada[]> {
  const { data, error } = await supabase
    .from('entregas_epi_compartilhadas')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('criado_em', { ascending: false });
  assertNoError(error, 'listarLinksEpiCompartilhado');
  return (data ?? []).map(rowToEpiCompartilhada);
}

export async function revogarLinkEpiCompartilhado(token: string): Promise<void> {
  const { error } = await supabase.from('entregas_epi_compartilhadas').update({ revogado: true }).eq('token', token);
  assertNoError(error, 'revogarLinkEpiCompartilhado');
}

/** Usada pela tela pública (sem login): só devolve algo se o token bater com um link válido,
 *  não revogado e ainda não expirado — ver obter_entrega_epi_compartilhada no banco. */
export async function obterEpiCompartilhadaPublica(token: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase.rpc('obter_entrega_epi_compartilhada', { p_token: token });
  assertNoError(error, 'obterEpiCompartilhadaPublica');
  return (data as Record<string, any> | null) ?? null;
}
