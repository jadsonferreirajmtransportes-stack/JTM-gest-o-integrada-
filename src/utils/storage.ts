import {
  Colaborador,
  Empregador,
  Supervisor,
  CargoSalario,
  FeriadoEmpresa,
  ProgramacaoFerias,
  Ocorrencia,
  StatusFerias,
  MotivoDemissao,
  PreAdmissao,
  StatusPreAdmissao,
  DocumentoItem,
  Cliente,
  EmbarqueAereo,
  ViagemRodoviaria,
  GlobalModuleId,
  ProjetoGerencial,
  StatusProjeto,
  AtividadeGestao,
  StatusAtividadeGestao,
  CustoOperacional,
  NotaPagina,
  LancamentoFaturamentoAereo,
  FaturaAereo,
  QuinzenaValeAlimentacao,
  LancamentoValeAlimentacao,
  InstrucaoTrabalho,
} from '../types';
import {
  INITIAL_EMPREGADORES,
  INITIAL_SUPERVISORES,
  INITIAL_CARGOS,
  INITIAL_COLABORADORES,
  INITIAL_FERIAS,
  INITIAL_OCORRENCIAS,
  INITIAL_FERIADOS,
  INITIAL_PRE_ADMISSOES,
  INITIAL_CLIENTES,
  INITIAL_EMBARQUES_AEREOS,
  INITIAL_VIAGENS_RODOVIARIAS,
  INITIAL_CUSTOS_OPERACIONAIS,
} from '../data/initialData';
import { INITIAL_PROJETOS_GERENCIAIS } from '../data/initialProjectsData';
import { INITIAL_ATIVIDADES_GESTAO } from '../data/initialAgendaData';
import { INITIAL_NOTAS_PAGINAS } from '../data/initialNotasData';
import { INITIAL_INSTRUCOES_TRABALHO } from '../data/initialInstrucoesData';

const STORAGE_KEYS = {
  EMPREGADORES: 'jmt_dp_empregadores_v1',
  SUPERVISORES: 'jmt_dp_supervisores_v1',
  CARGOS: 'jmt_dp_cargos_v1',
  FERIADOS: 'jmt_dp_feriados_v1',
  COLABORADORES: 'jmt_dp_colaboradores_v1',
  FERIAS: 'jmt_dp_ferias_v1',
  OCORRENCIAS: 'jmt_dp_ocorrencias_v1',
  PRE_ADMISSOES: 'jmt_dp_pre_admissoes_v1',
  CLIENTES: 'jmt_clientes_carteira_v1',
  EMBARQUES_AEREOS: 'jmt_farma_aereo_v1',
  VIAGENS_RODOVIARIAS: 'jmt_farma_rodoviario_v1',
  PROJETOS_GERENCIAIS: 'jmt_projetos_gerenciais_v1',
  ATIVIDADES_GESTAO: 'jmt_atividades_gestao_v1',
  NOTAS_PAGINAS: 'jmt_notas_paginas_v1',
  INSTRUCOES_TRABALHO: 'jmt_instrucoes_trabalho_v1',
  CUSTOS_OPERACIONAIS: 'jmt_custos_operacionais_v1',
  LANCAMENTOS_FATURAMENTO_AEREO: 'jmt_lancamentos_faturamento_aereo_v1',
  FATURAS_AEREO: 'jmt_faturas_aereo_v1',
  QUINZENAS_VALE_ALIMENTACAO: 'jmt_dp_quinzenas_va_v1',
  LANCAMENTOS_VALE_ALIMENTACAO: 'jmt_dp_lancamentos_va_v1',
  ACTIVE_GLOBAL_MODULE: 'jmt_active_global_module_v1',
  USER_ROLE: 'jmt_dp_current_role_v1',
  ACTIVE_SUPERVISOR_ID: 'jmt_dp_active_supervisor_id_v1',
};



export const NOTIFICATION_EVENT = 'jmt_dp_data_updated';

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
  }
}

// Generic Storage Helpers
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyChange();
  } catch (err) {
    console.error(`Error saving ${key} to localStorage`, err);
  }
}

// Empregadores
export function getEmpregadores(): Empregador[] {
  return getItem<Empregador[]>(STORAGE_KEYS.EMPREGADORES, INITIAL_EMPREGADORES);
}
export function saveEmpregadores(items: Empregador[]) {
  setItem(STORAGE_KEYS.EMPREGADORES, items);
}
export function saveEmpregador(item: Empregador) {
  const current = getEmpregadores();
  const idx = current.findIndex((e) => e.id === item.id);
  if (idx >= 0) {
    current[idx] = item;
  } else {
    current.push(item);
  }
  setItem(STORAGE_KEYS.EMPREGADORES, current);
}

// Supervisores
export function getSupervisores(): Supervisor[] {
  return getItem<Supervisor[]>(STORAGE_KEYS.SUPERVISORES, INITIAL_SUPERVISORES);
}
export function saveSupervisores(items: Supervisor[]) {
  setItem(STORAGE_KEYS.SUPERVISORES, items);
}
export function saveSupervisor(item: Supervisor) {
  const current = getSupervisores();
  const idx = current.findIndex((s) => s.id === item.id);
  if (idx >= 0) {
    current[idx] = item;
  } else {
    current.push(item);
  }
  setItem(STORAGE_KEYS.SUPERVISORES, current);
}

// Cargos
export function getCargos(): CargoSalario[] {
  return getItem<CargoSalario[]>(STORAGE_KEYS.CARGOS, INITIAL_CARGOS);
}
export function saveCargos(items: CargoSalario[]) {
  setItem(STORAGE_KEYS.CARGOS, items);
}
export function saveCargo(item: CargoSalario) {
  const current = getCargos();
  const idx = current.findIndex((c) => c.id === item.id);
  if (idx >= 0) {
    current[idx] = item;
  } else {
    current.push(item);
  }
  setItem(STORAGE_KEYS.CARGOS, current);
}

// Feriados da Empresa
export function getFeriados(): FeriadoEmpresa[] {
  return getItem<FeriadoEmpresa[]>(STORAGE_KEYS.FERIADOS, INITIAL_FERIADOS);
}
export function saveFeriados(items: FeriadoEmpresa[]) {
  setItem(STORAGE_KEYS.FERIADOS, items);
}
export function saveFeriado(item: FeriadoEmpresa) {
  const current = getFeriados();
  const idx = current.findIndex((f) => f.id === item.id);
  if (idx >= 0) {
    current[idx] = item;
  } else {
    current.push(item);
  }
  setItem(STORAGE_KEYS.FERIADOS, current);
}

// Colaboradores
export function getColaboradores(): Colaborador[] {
  return getItem<Colaborador[]>(STORAGE_KEYS.COLABORADORES, INITIAL_COLABORADORES);
}

export function getColaboradorById(id: string): Colaborador | undefined {
  return getColaboradores().find((c) => c.id === id);
}

export function saveColaborador(colaborador: Colaborador): void {
  const current = getColaboradores();
  const index = current.findIndex((c) => c.id === colaborador.id);
  const now = new Date().toISOString();
  
  if (index >= 0) {
    current[index] = { ...colaborador, atualizadoEm: now };
  } else {
    current.unshift({
      ...colaborador,
      id: colaborador.id || `colab-${Date.now()}`,
      codigoMatricula: colaborador.codigoMatricula || `JMT-${String(current.length + 101).padStart(4, '0')}`,
      criadoEm: colaborador.criadoEm || now,
      atualizadoEm: now,
    });
  }
  setItem(STORAGE_KEYS.COLABORADORES, current);
}

export function deleteColaborador(id: string): void {
  const current = getColaboradores().filter((c) => c.id !== id);
  setItem(STORAGE_KEYS.COLABORADORES, current);
}

/**
 * Inativar Colaborador (Rule 4 Dismissal)
 */
export function inativarColaborador(
  id: string,
  dataDemissao: string,
  motivoDemissao: MotivoDemissao | string,
  dataExameDemissional?: string,
  observacao?: string
): void {
  const current = getColaboradores();
  const index = current.findIndex((c) => c.id === id);
  if (index >= 0) {
    current[index] = {
      ...current[index],
      status: 'Inativo',
      dataDemissao,
      motivoDemissao,
      dataExameDemissional: dataExameDemissional || current[index].dataExameDemissional,
      observacaoSaude: observacao || current[index].observacaoSaude,
      atualizadoEm: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.COLABORADORES, current);
  }
}

/**
 * Renovar Exame ASO
 */
export function renovarExameASO(
  colaboradorId: string,
  dataUltimoExame: string,
  dataVencimento: string,
  clinica?: string,
  asoImagemUrl?: string,
  asoNomeArquivo?: string,
  asoMedicoEmitente?: string,
  asoResultado?: 'Apto' | 'Inapto' | 'Apto com Restrições'
): void {
  const current = getColaboradores();
  const index = current.findIndex((c) => c.id === colaboradorId);
  if (index >= 0) {
    current[index] = {
      ...current[index],
      dataUltimoExameOcupacional: dataUltimoExame,
      dataVencimentoExame: dataVencimento,
      clinicaMedica: clinica || current[index].clinicaMedica,
      asoImagemUrl: asoImagemUrl !== undefined ? asoImagemUrl : current[index].asoImagemUrl,
      asoNomeArquivo: asoNomeArquivo !== undefined ? asoNomeArquivo : current[index].asoNomeArquivo,
      asoMedicoEmitente: asoMedicoEmitente !== undefined ? asoMedicoEmitente : current[index].asoMedicoEmitente,
      asoResultado: asoResultado !== undefined ? asoResultado : current[index].asoResultado,
      atualizadoEm: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.COLABORADORES, current);
  }
}

/**
 * Update Onboarding Item
 */
export function updateOnboardingItem(
  colaboradorId: string,
  itemKey: string,
  concluido: boolean
): void {
  const current = getColaboradores();
  const index = current.findIndex((c) => c.id === colaboradorId);
  if (index >= 0) {
    const list = [...(current[index].onboarding || [])];
    const itemIdx = list.findIndex((i) => i.item === itemKey);
    const now = new Date().toISOString().slice(0, 10);

    if (itemIdx >= 0) {
      list[itemIdx] = {
        ...list[itemIdx],
        concluido,
        dataConclusao: concluido ? now : undefined,
      };
    } else {
      list.push({
        item: itemKey,
        concluido,
        dataConclusao: concluido ? now : undefined,
      });
    }

    current[index] = {
      ...current[index],
      onboarding: list,
      atualizadoEm: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.COLABORADORES, current);
  }
}

// Férias
export function getFerias(): ProgramacaoFerias[] {
  return getItem<ProgramacaoFerias[]>(STORAGE_KEYS.FERIAS, INITIAL_FERIAS);
}

export function saveFerias(feriasItem: ProgramacaoFerias): void {
  const current = getFerias();
  const index = current.findIndex((f) => f.id === feriasItem.id);
  if (index >= 0) {
    current[index] = feriasItem;
  } else {
    current.unshift({
      ...feriasItem,
      id: feriasItem.id || `fer-${Date.now()}`,
    });
  }
  setItem(STORAGE_KEYS.FERIAS, current);
}

export function updateStatusFerias(id: string, newStatus: StatusFerias): void {
  const current = getFerias();
  const index = current.findIndex((f) => f.id === id);
  if (index >= 0) {
    current[index] = { ...current[index], status: newStatus };
    setItem(STORAGE_KEYS.FERIAS, current);
  }
}

export function deleteFerias(id: string): void {
  const current = getFerias().filter((f) => f.id !== id);
  setItem(STORAGE_KEYS.FERIAS, current);
}

// Ocorrências
export function getOcorrencias(): Ocorrencia[] {
  return getItem<Ocorrencia[]>(STORAGE_KEYS.OCORRENCIAS, INITIAL_OCORRENCIAS);
}

export function saveOcorrencia(item: Ocorrencia): void {
  const current = getOcorrencias();
  const index = current.findIndex((o) => o.id === item.id);
  if (index >= 0) {
    current[index] = item;
  } else {
    current.unshift({
      ...item,
      id: item.id || `oco-${Date.now()}`,
      criadoEm: item.criadoEm || new Date().toISOString(),
    });
  }
  setItem(STORAGE_KEYS.OCORRENCIAS, current);
}

export function deleteOcorrencia(id: string): void {
  const current = getOcorrencias().filter((o) => o.id !== id);
  setItem(STORAGE_KEYS.OCORRENCIAS, current);
}

// ==========================================
// Vale Alimentação (Programação de Quinzenas + Lançamentos por Colaborador)
// ==========================================

// Quinzenas (períodos fixos do ano, réplica de "QUINZENAS - VALE ALIMENTAÇÃO" no Coda)
export function getQuinzenasValeAlimentacao(): QuinzenaValeAlimentacao[] {
  return getItem<QuinzenaValeAlimentacao[]>(STORAGE_KEYS.QUINZENAS_VALE_ALIMENTACAO, []);
}

export function saveQuinzenaValeAlimentacao(item: QuinzenaValeAlimentacao): void {
  const current = getQuinzenasValeAlimentacao();
  const index = current.findIndex((q) => q.id === item.id);
  if (index >= 0) {
    current[index] = item;
  } else {
    current.push({ ...item, id: item.id || `quinz-va-${Date.now()}` });
  }
  // Ordena por data de início — a lista de quinzenas cresce ao longo do ano e a ordem
  // cronológica facilita achar a quinzena vigente sem precisar reordenar na UI toda hora.
  current.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  setItem(STORAGE_KEYS.QUINZENAS_VALE_ALIMENTACAO, current);
}

export function deleteQuinzenaValeAlimentacao(id: string): void {
  const current = getQuinzenasValeAlimentacao().filter((q) => q.id !== id);
  setItem(STORAGE_KEYS.QUINZENAS_VALE_ALIMENTACAO, current);
}

// Lançamentos (movimentações) — um por colaborador/quinzena, réplica de "PROGRAMAÇÃO DO VALE
// ALIMENTAÇÃO" no Coda. Aparecem tanto na tela de gestão quanto na ficha do colaborador.
export function getLancamentosValeAlimentacao(): LancamentoValeAlimentacao[] {
  return getItem<LancamentoValeAlimentacao[]>(STORAGE_KEYS.LANCAMENTOS_VALE_ALIMENTACAO, []);
}

export function saveLancamentosValeAlimentacao(items: LancamentoValeAlimentacao[]): void {
  setItem(STORAGE_KEYS.LANCAMENTOS_VALE_ALIMENTACAO, items);
}

export function saveLancamentoValeAlimentacao(item: LancamentoValeAlimentacao): void {
  const current = getLancamentosValeAlimentacao();
  const index = current.findIndex((l) => l.id === item.id);
  if (index >= 0) {
    current[index] = item;
  } else {
    current.unshift({ ...item, id: item.id || `lanc-va-${Date.now()}` });
  }
  setItem(STORAGE_KEYS.LANCAMENTOS_VALE_ALIMENTACAO, current);
}

export function deleteLancamentoValeAlimentacao(id: string): void {
  const current = getLancamentosValeAlimentacao().filter((l) => l.id !== id);
  setItem(STORAGE_KEYS.LANCAMENTOS_VALE_ALIMENTACAO, current);
}

// ==========================================
// 2.19 Pré-Admissões & Auto-Cadastro de Novos Colaboradores
// ==========================================
export function getPreAdmissoes(): PreAdmissao[] {
  return getItem<PreAdmissao[]>(STORAGE_KEYS.PRE_ADMISSOES, INITIAL_PRE_ADMISSOES);
}

export function getPreAdmissaoById(id: string): PreAdmissao | undefined {
  return getPreAdmissoes().find((p) => p.id === id);
}

export function getPreAdmissaoByToken(token: string): PreAdmissao | undefined {
  return getPreAdmissoes().find((p) => p.token === token);
}

export function savePreAdmissao(item: PreAdmissao): void {
  const current = getPreAdmissoes();
  const index = current.findIndex((p) => p.id === item.id || (p.token && p.token === item.token));
  const now = new Date().toISOString();

  if (index >= 0) {
    current[index] = {
      ...current[index],
      ...item,
      atualizadoEm: now,
    };
  } else {
    current.unshift({
      ...item,
      id: item.id || `preadm-${Date.now()}`,
      token: item.token || `admissao-${Math.random().toString(36).substring(2, 8)}`,
      criadoEm: item.criadoEm || now,
      atualizadoEm: now,
      status: item.status || 'Pendente',
    });
  }
  setItem(STORAGE_KEYS.PRE_ADMISSOES, current);
}

export function updatePreAdmissaoStatus(
  id: string,
  status: StatusPreAdmissao,
  observacoesDP?: string
): void {
  const current = getPreAdmissoes();
  const index = current.findIndex((p) => p.id === id);
  if (index >= 0) {
    current[index] = {
      ...current[index],
      status,
      observacoesDP: observacoesDP !== undefined ? observacoesDP : current[index].observacoesDP,
      atualizadoEm: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.PRE_ADMISSOES, current);
  }
}

export function deletePreAdmissao(id: string): void {
  const current = getPreAdmissoes().filter((p) => p.id !== id);
  setItem(STORAGE_KEYS.PRE_ADMISSOES, current);
}

/**
 * Efetivar Admissão do Candidato (Converte Pré-Cadastro em Colaborador Ativo)
 */
export function efetivarPreAdmissao(
  preAdmissaoId: string,
  config?: {
    empregadorId?: string;
    funcaoCargo?: string;
    setor?: string;
    dataAdmissao?: string;
    remuneracao?: number;
    gratificacao?: number;
    valorValeAlimentacaoDia?: number;
    jornadaTrabalho?: string;
    supervisorId?: string;
  }
): Colaborador | null {
  const pre = getPreAdmissaoById(preAdmissaoId);
  if (!pre) return null;

  const resolvedConfig = {
    empregadorId: config?.empregadorId || pre.empresaPredefinidaId || 'emp-01',
    funcaoCargo: config?.funcaoCargo || pre.cargoPredefinido || 'Operador Logístico Farma',
    setor: config?.setor || 'Operações / Farma',
    dataAdmissao: config?.dataAdmissao || new Date().toISOString().slice(0, 10),
    remuneracao: config?.remuneracao || 2100,
    gratificacao: config?.gratificacao || 0,
    valorValeAlimentacaoDia: config?.valorValeAlimentacaoDia || 28.5,
    jornadaTrabalho: config?.jornadaTrabalho || '44h semanais (Segunda a Sexta 08h-18h)',
    supervisorId: config?.supervisorId || pre.supervisorPredefinidoId || 'sup-01',
  };

  const currentColaboradores = getColaboradores();
  const now = new Date().toISOString();
  const matriculaNumber = String(currentColaboradores.length + 101).padStart(4, '0');
  const newColaboradorId = `colab-adm-${Date.now()}`;

  // Monta lista de documentos padrão marcando recebidos os que foram enviados
  const docsList: DocumentoItem[] = [
    {
      id: `doc-${Date.now()}-1`,
      tipo: 'CPF/RG/CNH',
      status: pre.documentosEnviados.some((d) => d.tipo.toLowerCase().includes('rg') || d.tipo.toLowerCase().includes('cnh') || d.tipo.toLowerCase().includes('cpf')) ? 'Recebido' : 'Pendente',
      nomeArquivo: pre.documentosEnviados.find((d) => d.tipo.toLowerCase().includes('rg') || d.tipo.toLowerCase().includes('cnh') || d.tipo.toLowerCase().includes('cpf'))?.nomeArquivo,
    },
    {
      id: `doc-${Date.now()}-2`,
      tipo: 'Título de Eleitor',
      status: pre.documentosEnviados.some((d) => d.tipo.toLowerCase().includes('título')) ? 'Recebido' : 'Pendente',
      nomeArquivo: pre.documentosEnviados.find((d) => d.tipo.toLowerCase().includes('título'))?.nomeArquivo,
    },
    {
      id: `doc-${Date.now()}-3`,
      tipo: 'Carteira de Trabalho',
      status: pre.documentosEnviados.some((d) => d.tipo.toLowerCase().includes('carteira') || d.tipo.toLowerCase().includes('ctps')) ? 'Recebido' : 'Pendente',
      nomeArquivo: pre.documentosEnviados.find((d) => d.tipo.toLowerCase().includes('carteira') || d.tipo.toLowerCase().includes('ctps'))?.nomeArquivo,
    },
    {
      id: `doc-${Date.now()}-4`,
      tipo: 'Cartão do PIS',
      status: pre.documentosEnviados.some((d) => d.tipo.toLowerCase().includes('pis')) ? 'Recebido' : 'Pendente',
      nomeArquivo: pre.documentosEnviados.find((d) => d.tipo.toLowerCase().includes('pis'))?.nomeArquivo,
    },
    {
      id: `doc-${Date.now()}-5`,
      tipo: 'Certificado de Reservista',
      status: pre.dadosPessoais.genero === 'Masculino' ? 'Pendente' : 'Não se aplica',
    },
    {
      id: `doc-${Date.now()}-6`,
      tipo: 'Certidão de Casamento',
      status: pre.dadosPessoais.estadoCivil === 'Casado(a)' ? (pre.documentosEnviados.some((d) => d.tipo.toLowerCase().includes('casamento')) ? 'Recebido' : 'Pendente') : 'Não se aplica',
      nomeArquivo: pre.documentosEnviados.find((d) => d.tipo.toLowerCase().includes('casamento'))?.nomeArquivo,
    },
    {
      id: `doc-${Date.now()}-7`,
      tipo: 'Comprovante de Residência',
      status: pre.documentosEnviados.some((d) => d.tipo.toLowerCase().includes('residência') || d.tipo.toLowerCase().includes('residencia')) ? 'Recebido' : 'Pendente',
      nomeArquivo: pre.documentosEnviados.find((d) => d.tipo.toLowerCase().includes('residência') || d.tipo.toLowerCase().includes('residencia'))?.nomeArquivo,
    },
    {
      id: `doc-${Date.now()}-8`,
      tipo: 'ASO Admissional',
      status: pre.documentosEnviados.some((d) => d.tipo.toLowerCase().includes('aso')) ? 'Recebido' : 'Pendente',
      nomeArquivo: pre.documentosEnviados.find((d) => d.tipo.toLowerCase().includes('aso'))?.nomeArquivo,
    },
    {
      id: `doc-${Date.now()}-9`,
      tipo: 'Certificado RDC 430',
      status: 'Pendente',
    },
  ];

  // Anexos do dossiê
  const anexosDossie = pre.documentosEnviados.map((doc, idx) => ({
    id: `anexo-${Date.now()}-${idx}`,
    nome: doc.nomeArquivo,
    categoria: 'Documento Pessoal' as const,
    dataUpload: doc.dataUpload || now,
    tamanho: doc.tamanho || '1.0 MB',
    arquivoUrl: doc.arquivoUrl,
    descricao: `Enviado pelo colaborador via Portal de Admissão Digital (${doc.tipo})`,
  }));

  const novoColaborador: Colaborador = {
    id: newColaboradorId,
    codigoMatricula: `JMT-${matriculaNumber}`,
    nomeCompleto: pre.dadosPessoais.nomeCompleto,
    nomePai: pre.dadosPessoais.nomePai,
    nomeMae: pre.dadosPessoais.nomeMae,
    dataNascimento: pre.dadosPessoais.dataNascimento,
    naturalidade: pre.dadosPessoais.naturalidade,
    nacionalidade: pre.dadosPessoais.nacionalidade || 'Brasileira',
    estadoCivil: pre.dadosPessoais.estadoCivil,
    racaCor: pre.dadosPessoais.racaCor,
    grauInstrucao: pre.dadosPessoais.grauInstrucao,
    genero: pre.dadosPessoais.genero,
    enderecoCompleto: `${pre.contatoEndereco.enderecoCompleto}${pre.contatoEndereco.numero ? `, nº ${pre.contatoEndereco.numero}` : ''}${pre.contatoEndereco.complemento ? ` (${pre.contatoEndereco.complemento})` : ''}${pre.contatoEndereco.bairro ? ` - ${pre.contatoEndereco.bairro}` : ''}`,
    cidadeUF: pre.contatoEndereco.cidadeUF,
    cep: pre.contatoEndereco.cep,
    telefoneWhatsapp: pre.contatoEndereco.telefoneWhatsapp,
    email: pre.contatoEndereco.email,
    cpf: pre.dadosPessoais.cpf,
    rg: pre.dadosPessoais.rg,
    orgaoEmissorUF: pre.dadosPessoais.orgaoEmissorUF,
    portadorDeficiencia: pre.dadosPessoais.portadorDeficiencia,
    detalheDeficiencia: pre.dadosPessoais.detalheDeficiencia,

    // Dados Contratuais
    empregadorId: config.empregadorId,
    status: 'Ativo',
    funcaoCargo: config.funcaoCargo,
    setor: config.setor,
    dataAdmissao: config.dataAdmissao,
    supervisorId: config.supervisorId,
    formaPagamento: 'Mensal',
    remuneracao: config.remuneracao,
    gratificacao: config.gratificacao || 0,
    valorValeAlimentacaoDia: config.valorValeAlimentacaoDia || 38.0,
    jornadaTrabalho: config.jornadaTrabalho || '08:00 às 17:00, segunda a sexta (44h semanais)',

    // Dados Bancários
    banco: pre.dadosBancarios.banco,
    agencia: pre.dadosBancarios.agencia,
    tipoConta: pre.dadosBancarios.tipoConta || 'Corrente',
    numeroConta: pre.dadosBancarios.numeroConta,
    tipoChavePix: pre.dadosBancarios.tipoChavePix || 'CPF',
    chavePix: pre.dadosBancarios.chavePix,

    // Dependentes
    dependentes: pre.dependentes || [],

    // Vale Transporte
    vtQuantidadeTarifasDia: pre.transporte.utilizaVT ? pre.transporte.vtQuantidadeTarifasDia || 2 : 0,
    vtValorTarifa: pre.transporte.utilizaVT ? pre.transporte.vtValorTarifa || 5.0 : 0,
    vtIdentificacaoConducao: pre.transporte.vtIdentificacaoConducao,

    // Saúde Ocupacional & ASO
    dataExameAdmissional: config.dataAdmissao,
    clinicaMedica: 'MedSeg Medicina do Trabalho',
    documentos: docsList,
    anexos: anexosDossie,
    anotacoes: [
      {
        id: `anot-${Date.now()}`,
        data: now.slice(0, 10),
        autor: 'Sistema de Admissão Digital',
        categoria: 'Geral',
        texto: `Colaborador admitido via preenchimento de formulário online em ${pre.dataEnvio ? new Date(pre.dataEnvio).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}.`,
        fixado: true,
      },
    ],

    // Fardamento
    tamanhoCamisa: pre.fardamento.tamanhoCamisa || 'G',
    numeroCalca: pre.fardamento.numeroCalca || '42',
    numeroCalcado: pre.fardamento.numeroCalcado || '41',
    historicoFardamento: [
      {
        id: `hf-${Date.now()}`,
        data: config.dataAdmissao,
        itemAlterado: 'Kit Inicial de Fardamento & EPI JMT',
        tamanhoAnterior: 'Nenhum',
        tamanhoNovo: `Camisa ${pre.fardamento.tamanhoCamisa || 'G'} / Calça ${pre.fardamento.numeroCalca || '42'} / Bota ${pre.fardamento.numeroCalcado || '41'}`,
        motivo: 'Admissão de Colaborador',
        responsavel: 'Departamento Pessoal',
      },
    ],

    // Onboarding checklist
    onboarding: [
      { id: `ob-${Date.now()}-1`, etapa: 'Documentação e Pré-Cadastro Digital', responsavel: 'DP / Colaborador', prazo: config.dataAdmissao, concluido: true, dataConclusao: now.slice(0, 10) },
      { id: `ob-${Date.now()}-2`, etapa: 'Exame Admissional ASO (RDC 430)', responsavel: 'MedSeg', prazo: config.dataAdmissao, concluido: false },
      { id: `ob-${Date.now()}-3`, etapa: 'Entrega de Fardamento & EPI', responsavel: 'Almoxarifado', prazo: config.dataAdmissao, concluido: false },
      { id: `ob-${Date.now()}-4`, etapa: 'Treinamento de Boas Práticas Pharma', responsavel: 'Garantia da Qualidade', prazo: config.dataAdmissao, concluido: false },
      { id: `ob-${Date.now()}-5`, etapa: 'Integração e Liberação de Acessos', responsavel: 'TI / Operações', prazo: config.dataAdmissao, concluido: false },
    ],

    criadoEm: now,
    atualizadoEm: now,
  };

  // Salva o colaborador
  saveColaborador(novoColaborador);

  // Atualiza status da pré-admissão para Aprovado
  updatePreAdmissaoStatus(preAdmissaoId, 'Aprovado', `Efetivado como ${novoColaborador.codigoMatricula} em ${new Date().toLocaleDateString('pt-BR')}`);
  const preAtualizado = getPreAdmissaoById(preAdmissaoId);
  if (preAtualizado) {
    preAtualizado.colaboradorEfetivadoId = novoColaborador.id;
    savePreAdmissao(preAtualizado);
  }

  return novoColaborador;
}

// ==========================================
// 3.0 MÓDULO CARTEIRA DE CLIENTES
// ==========================================

export function getClientes(): Cliente[] {
  return getItem<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
}

export function getClienteById(id: string): Cliente | undefined {
  return getClientes().find((c) => c.id === id);
}

export function saveCliente(cliente: Cliente): void {
  const current = getClientes();
  const index = current.findIndex((c) => c.id === cliente.id);
  const now = new Date().toISOString();

  if (index >= 0) {
    current[index] = { ...cliente, atualizadoEm: now };
  } else {
    current.unshift({
      ...cliente,
      id: cliente.id || `cli-${Date.now()}`,
      criadoEm: cliente.criadoEm || now,
      atualizadoEm: now,
    });
  }
  setItem(STORAGE_KEYS.CLIENTES, current);
}

export function saveClientes(clientes: Cliente[]): void {
  setItem(STORAGE_KEYS.CLIENTES, clientes);
}

export function deleteCliente(id: string): void {
  const current = getClientes();
  const filtered = current.filter((c) => c.id !== id);
  setItem(STORAGE_KEYS.CLIENTES, filtered);
}

// ==========================================
// FARMA AÉREO STORAGE
// ==========================================
export function getEmbarquesAereos(): EmbarqueAereo[] {
  return getItem<EmbarqueAereo[]>(STORAGE_KEYS.EMBARQUES_AEREOS, INITIAL_EMBARQUES_AEREOS);
}

export function saveEmbarquesAereos(items: EmbarqueAereo[]): void {
  setItem(STORAGE_KEYS.EMBARQUES_AEREOS, items);
}

export function saveEmbarqueAereo(item: EmbarqueAereo): void {
  const current = getEmbarquesAereos();
  const now = new Date().toISOString();
  const idx = current.findIndex((e) => e.id === item.id);
  if (idx >= 0) {
    current[idx] = { ...item, atualizadoEm: now };
  } else {
    current.unshift({
      ...item,
      id: item.id || `emb-air-${Date.now()}`,
      criadoEm: item.criadoEm || now,
      atualizadoEm: now,
    });
  }
  setItem(STORAGE_KEYS.EMBARQUES_AEREOS, current);
}

export function deleteEmbarqueAereo(id: string): void {
  const current = getEmbarquesAereos();
  const filtered = current.filter((e) => e.id !== id);
  setItem(STORAGE_KEYS.EMBARQUES_AEREOS, filtered);
}

// ==========================================
// CONTROLE FINANCEIRO — FATURAMENTO FARMA AÉREO
// ==========================================
export function getLancamentosFaturamentoAereo(): LancamentoFaturamentoAereo[] {
  return getItem<LancamentoFaturamentoAereo[]>(STORAGE_KEYS.LANCAMENTOS_FATURAMENTO_AEREO, []);
}

export function saveLancamentosFaturamentoAereo(items: LancamentoFaturamentoAereo[]): void {
  setItem(STORAGE_KEYS.LANCAMENTOS_FATURAMENTO_AEREO, items);
}

export function saveLancamentoFaturamentoAereo(item: LancamentoFaturamentoAereo): void {
  const current = getLancamentosFaturamentoAereo();
  const now = new Date().toISOString();
  const idx = current.findIndex((l) => l.id === item.id);
  if (idx >= 0) {
    current[idx] = { ...item, atualizadoEm: now };
  } else {
    current.unshift({
      ...item,
      id: item.id || `lanc-fat-aereo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      criadoEm: item.criadoEm || now,
      atualizadoEm: now,
    });
  }
  setItem(STORAGE_KEYS.LANCAMENTOS_FATURAMENTO_AEREO, current);
}

/** Insere/atualiza em lote — usado pela importação de planilha. */
export function importLancamentosFaturamentoAereo(items: LancamentoFaturamentoAereo[]): void {
  const current = getLancamentosFaturamentoAereo();
  setItem(STORAGE_KEYS.LANCAMENTOS_FATURAMENTO_AEREO, [...items, ...current]);
}

export function deleteLancamentoFaturamentoAereo(id: string): void {
  const current = getLancamentosFaturamentoAereo();
  setItem(
    STORAGE_KEYS.LANCAMENTOS_FATURAMENTO_AEREO,
    current.filter((l) => l.id !== id)
  );
}

export function getFaturasAereo(): FaturaAereo[] {
  return getItem<FaturaAereo[]>(STORAGE_KEYS.FATURAS_AEREO, []);
}

export function saveFaturasAereo(items: FaturaAereo[]): void {
  setItem(STORAGE_KEYS.FATURAS_AEREO, items);
}

export function saveFaturaAereo(item: FaturaAereo): void {
  const current = getFaturasAereo();
  const now = new Date().toISOString();
  const idx = current.findIndex((f) => f.id === item.id);
  if (idx >= 0) {
    current[idx] = { ...item, atualizadoEm: now };
  } else {
    current.unshift({
      ...item,
      id: item.id || `fatura-aereo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      criadoEm: item.criadoEm || now,
      atualizadoEm: now,
    });
  }
  setItem(STORAGE_KEYS.FATURAS_AEREO, current);
}

/** Insere/atualiza em lote — usado pela importação de planilha. */
export function importFaturasAereo(items: FaturaAereo[]): void {
  const current = getFaturasAereo();
  setItem(STORAGE_KEYS.FATURAS_AEREO, [...items, ...current]);
}

export function deleteFaturaAereo(id: string): void {
  const current = getFaturasAereo();
  setItem(
    STORAGE_KEYS.FATURAS_AEREO,
    current.filter((f) => f.id !== id)
  );
  // Desvincula lançamentos que apontavam para a fatura removida
  const lancamentos = getLancamentosFaturamentoAereo();
  setItem(
    STORAGE_KEYS.LANCAMENTOS_FATURAMENTO_AEREO,
    lancamentos.map((l) => (l.faturaId === id ? { ...l, faturaId: undefined } : l))
  );
}

// ==========================================
// FARMA RODOVIÁRIO STORAGE
// ==========================================
export function normalizeViagem(v: any): ViagemRodoviaria {
  if (!v) return v;
  
  const rawPontos = Array.isArray(v.pontosParada)
    ? v.pontosParada
    : Array.isArray(v.pontosEntrega)
    ? v.pontosEntrega
    : [];

  const pontosNormalizados = rawPontos.map((p: any, idx: number) => ({
    id: p.id || `pto-${Date.now()}-${idx + 1}`,
    ordem: p.ordem ?? p.ordemEntrega ?? idx + 1,
    ordemEntrega: p.ordemEntrega ?? p.ordem ?? idx + 1,
    clienteId: p.clienteId || '',
    clienteNome: p.clienteNome || 'Cliente JMT Farma',
    destinatarioNome: p.destinatarioNome || p.nomeRecebedor || 'Farmácia Central',
    endereco: p.endereco || 'Endereço de Entrega',
    cidadeUF: p.cidadeUF || 'Natal/RN',
    numeroNotaFiscal: p.numeroNotaFiscal || p.numeroNF || `NF-${idx + 101}`,
    numeroNF: p.numeroNF || p.numeroNotaFiscal || `NF-${idx + 101}`,
    faixaTemperatura: p.faixaTemperatura || v.faixaTemperatura || v.faixaTemperaturaExigida || '2°C a 8°C',
    janelaHorario: p.janelaHorario || 'Comercial',
    quantidadeVolumes: p.quantidadeVolumes ?? 5,
    pesoKg: p.pesoKg ?? 30.0,
    valorMercadoria: p.valorMercadoria ?? p.valorCarga ?? 25000.0,
    valorCarga: p.valorCarga ?? p.valorMercadoria ?? 25000.0,
    status: p.status || 'Pendente',
    horarioChegada: p.horarioChegada,
    horarioEntrega: p.horarioEntrega,
    horarioEfetivoEntrega: p.horarioEfetivoEntrega || p.horarioEntrega,
    temperaturaMomento: p.temperaturaMomento ?? v.temperaturaAtualBau ?? 4.0,
    temperaturaNaEntrega: p.temperaturaNaEntrega ?? p.temperaturaMomento ?? v.temperaturaAtualBau ?? 4.0,
    nomeRecebedor: p.nomeRecebedor || p.recebedorNome,
    recebedorNome: p.recebedorNome || p.nomeRecebedor,
    documentoRecebedor: p.documentoRecebedor || p.recebedorDocumento,
    recebedorDocumento: p.recebedorDocumento || p.documentoRecebedor,
    observacao: p.observacao || p.observacoes,
    observacoes: p.observacoes || p.observacao,
  }));

  const dataSaida = v.dataSaida || v.dataPartida || new Date().toISOString().split('T')[0];
  const dataPartida = v.dataPartida || v.dataSaida || new Date().toISOString().split('T')[0];
  const rotaOrigem = v.rotaOrigem || v.origem || 'CD Principal JMT - Natal/RN';
  const rotaDestino = v.rotaDestino || v.destinoFinal || 'Destino Intermunicipal';
  const veiculoTipo = v.veiculoTipo || v.veiculoModelo || 'Van Refrigerada (2°C a 8°C)';
  const veiculoModelo = v.veiculoModelo || v.veiculoTipo || 'Van Refrigerada (2°C a 8°C)';
  const faixaTemperatura = v.faixaTemperatura || v.faixaTemperaturaExigida || 'Refrigerado (2°C a 8°C)';
  const faixaTemperaturaExigida = v.faixaTemperaturaExigida || v.faixaTemperatura || '2°C a 8°C';

  const setpoint = v.setpointTermostato ?? v.temperaturaSetPoint ?? 4.0;
  const tempMin = v.temperaturaMinima ?? v.temperaturaMinPermitida ?? 2.0;
  const tempMax = v.temperaturaMaxima ?? v.temperaturaMaxPermitida ?? 8.0;

  const rawChecklistPartida = v.checklistPartida || {};
  const rawChecklistSaida = v.checklistSaida || {};

  const checklistPartida = {
    sanitizadoBau: rawChecklistPartida.sanitizadoBau ?? rawChecklistSaida.higienizacaoSanitizacaoOk ?? true,
    preResfriamentoConcluido: rawChecklistPartida.preResfriamentoConcluido ?? rawChecklistSaida.preResfriamentoAtingido ?? true,
    dataloggerAtivo: rawChecklistPartida.dataloggerAtivo ?? rawChecklistSaida.dataloggerLigadoConfigurado ?? true,
    numeroLacre: rawChecklistPartida.numeroLacre || rawChecklistSaida.lacreBauNumero || 'LCR-JMT-9901',
    dataVerificacao: rawChecklistPartida.dataVerificacao || dataSaida,
    responsavelExpedicao: rawChecklistPartida.responsavelExpedicao || rawChecklistSaida.validadoPor || 'Expedição JMT Farma',
  };

  const checklistSaida = {
    higienizacaoSanitizacaoOk: checklistPartida.sanitizadoBau,
    preResfriamentoAtingido: checklistPartida.preResfriamentoConcluido,
    dataloggerLigadoConfigurado: checklistPartida.dataloggerAtivo,
    lacreBauNumero: checklistPartida.numeroLacre,
    epiTermicoDisponibilizado: true,
    documentacaoMdfeCteOk: true,
    calibracaoTermometroValida: true,
    dataHoraValidacao: rawChecklistSaida.dataHoraValidacao || `${dataSaida} ${v.horarioSaida || '06:00'}`,
    validadoPor: checklistPartida.responsavelExpedicao,
  };

  const qtdNfs = v.quantidadeNotasFiscais ?? v.totalNFs ?? pontosNormalizados.length;
  const vlrMercadoria = v.valorTotalMercadoria ?? v.valorTotalCarga ?? 150000.0;

  return {
    ...v,
    id: v.id || `viag-rod-${Date.now()}`,
    codigoViagem: v.codigoViagem || 'ROD-2026-001',
    numeroMdfe: v.numeroMdfe || 'MDF-E 001.000.000',
    tituloRota: v.tituloRota || `${rotaOrigem} → ${rotaDestino}`,
    origem: rotaOrigem,
    rotaOrigem: rotaOrigem,
    destinoFinal: rotaDestino,
    rotaDestino: rotaDestino,
    regioesAtendidas: v.regioesAtendidas || [rotaOrigem, rotaDestino],
    modalidade: v.modalidade || 'Distribuição Urbana / Last Mile',
    veiculoPlaca: v.veiculoPlaca || 'BRA2E19',
    veiculoTipo: veiculoTipo,
    veiculoModelo: veiculoModelo,
    motoristaId: v.motoristaId || 'col-1',
    motoristaNome: v.motoristaNome || 'Motorista JMT',
    motoristaCpf: v.motoristaCpf || '000.000.000-00',
    motoristaTelefone: v.motoristaTelefone || '(84) 99999-9999',
    ajudanteNome: v.ajudanteNome,
    dataSaida: dataSaida,
    dataPartida: dataPartida,
    horarioSaida: v.horarioSaida || v.horarioPartidaReal || v.horarioPartidaPrevisto || '06:00',
    horarioPartidaPrevisto: v.horarioPartidaPrevisto || '06:00',
    horarioPartidaReal: v.horarioPartidaReal || v.horarioSaida || '06:00',
    previsaoRetornoBase: v.previsaoRetornoBase || `${dataSaida} 18:00`,
    previsaoChegadaDestino: v.previsaoChegadaDestino || `${dataSaida} 16:00`,
    status: v.status || 'Em Rota / Trânsito',
    faixaTemperatura: faixaTemperatura,
    faixaTemperaturaExigida: faixaTemperaturaExigida,
    temperaturaAtualBau: typeof v.temperaturaAtualBau === 'number' ? v.temperaturaAtualBau : 4.0,
    temperaturaSetPoint: setpoint,
    setpointTermostato: setpoint,
    temperaturaMinima: tempMin,
    temperaturaMaxima: tempMax,
    temperaturaMinPermitida: tempMin,
    temperaturaMaxPermitida: tempMax,
    statusRefrigerador: v.statusRefrigerador || 'Ligado - Resfriando',
    dataloggerId: v.dataloggerId || v.dataloggerSerial || 'DL-ROD-01',
    dataloggerSerial: v.dataloggerSerial || v.dataloggerId || 'DL-ROD-01',
    quantidadeNotasFiscais: qtdNfs,
    totalNFs: qtdNfs,
    quantidadeTotalVolumes: v.quantidadeTotalVolumes ?? 30,
    valorTotalMercadoria: vlrMercadoria,
    valorTotalCarga: vlrMercadoria,
    pesoTotalKg: v.pesoTotalKg ?? 350.0,
    kmTotalEstimado: v.kmTotalEstimado ?? 200,
    kmInicial: v.kmInicial ?? 100000,
    kmFinal: v.kmFinal,
    checklistPartida: checklistPartida,
    checklistSaida: checklistSaida,
    pontosParada: pontosNormalizados,
    pontosEntrega: pontosNormalizados,
    ocorrencias: Array.isArray(v.ocorrencias) ? v.ocorrencias : [],
    observacoes: v.observacoes || v.observacao || '',
    criadoEm: v.criadoEm || new Date().toISOString(),
    atualizadoEm: v.atualizadoEm || new Date().toISOString(),
  };
}

export function getViagensRodoviarias(): ViagemRodoviaria[] {
  const rawList = getItem<ViagemRodoviaria[]>(STORAGE_KEYS.VIAGENS_RODOVIARIAS, INITIAL_VIAGENS_RODOVIARIAS);
  if (!Array.isArray(rawList)) return INITIAL_VIAGENS_RODOVIARIAS.map(normalizeViagem);
  return rawList.map(normalizeViagem);
}

export function saveViagensRodoviarias(items: ViagemRodoviaria[]): void {
  const normalized = items.map(normalizeViagem);
  setItem(STORAGE_KEYS.VIAGENS_RODOVIARIAS, normalized);
}

export function saveViagemRodoviaria(item: ViagemRodoviaria): void {
  const current = getViagensRodoviarias();
  const now = new Date().toISOString();
  const normalizedItem = normalizeViagem({
    ...item,
    atualizadoEm: now,
  });

  const idx = current.findIndex((v) => v.id === item.id);
  if (idx >= 0) {
    current[idx] = normalizedItem;
  } else {
    current.unshift({
      ...normalizedItem,
      id: item.id || `viag-rod-${Date.now()}`,
      criadoEm: item.criadoEm || now,
    });
  }
  setItem(STORAGE_KEYS.VIAGENS_RODOVIARIAS, current);
}

export function deleteViagemRodoviaria(id: string): void {
  const current = getViagensRodoviarias();
  const filtered = current.filter((v) => v.id !== id);
  setItem(STORAGE_KEYS.VIAGENS_RODOVIARIAS, filtered);
}

// ==========================================
// MÓDULO 5: PROJETOS GERENCIAIS & ESTRATÉGICOS
// ==========================================
export function getProjetosGerenciais(): ProjetoGerencial[] {
  const rawList = getItem<ProjetoGerencial[]>(STORAGE_KEYS.PROJETOS_GERENCIAIS, INITIAL_PROJETOS_GERENCIAIS);
  if (!Array.isArray(rawList)) return INITIAL_PROJETOS_GERENCIAIS;
  return rawList;
}

export function saveProjetosGerenciais(items: ProjetoGerencial[]): void {
  setItem(STORAGE_KEYS.PROJETOS_GERENCIAIS, items);
}

export function saveProjetoGerencial(item: ProjetoGerencial): void {
  const current = getProjetosGerenciais();
  const now = new Date().toISOString();
  const idx = current.findIndex((p) => p.id === item.id);
  
  if (idx >= 0) {
    current[idx] = {
      ...item,
      atualizadoEm: now,
    };
  } else {
    current.unshift({
      ...item,
      id: item.id || `prj-${Date.now()}`,
      codigo: item.codigo || `PRJ-2026-${String(current.length + 1).padStart(3, '0')}`,
      criadoEm: item.criadoEm || now,
      atualizadoEm: now,
    });
  }
  setItem(STORAGE_KEYS.PROJETOS_GERENCIAIS, current);
}

export function deleteProjetoGerencial(id: string): void {
  const current = getProjetosGerenciais();
  const filtered = current.filter((p) => p.id !== id);
  setItem(STORAGE_KEYS.PROJETOS_GERENCIAIS, filtered);
}

export function updateProjetoStatus(id: string, newStatus: StatusProjeto): void {
  const current = getProjetosGerenciais();
  const idx = current.findIndex((p) => p.id === id);
  if (idx >= 0) {
    current[idx] = {
      ...current[idx],
      status: newStatus,
      atualizadoEm: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.PROJETOS_GERENCIAIS, current);
  }
}

// ==========================================
// AGENDA DE ATIVIDADES DA GESTÃO
// ==========================================
export function getAtividadesGestao(): AtividadeGestao[] {
  return getItem<AtividadeGestao[]>(STORAGE_KEYS.ATIVIDADES_GESTAO, INITIAL_ATIVIDADES_GESTAO);
}

export function saveAtividadesGestao(items: AtividadeGestao[]): void {
  setItem(STORAGE_KEYS.ATIVIDADES_GESTAO, items);
}

export function saveAtividadeGestao(item: AtividadeGestao): void {
  const current = getAtividadesGestao();
  const idx = current.findIndex((a) => a.id === item.id);
  if (idx >= 0) {
    current[idx] = { ...item, atualizadoEm: new Date().toISOString() };
  } else {
    current.push(item);
  }
  setItem(STORAGE_KEYS.ATIVIDADES_GESTAO, current);
}

export function deleteAtividadeGestao(id: string): void {
  const current = getAtividadesGestao();
  const filtered = current.filter((a) => a.id !== id);
  setItem(STORAGE_KEYS.ATIVIDADES_GESTAO, filtered);
}

export function updateAtividadeStatus(id: string, newStatus: StatusAtividadeGestao): void {
  const current = getAtividadesGestao();
  const idx = current.findIndex((a) => a.id === id);
  if (idx >= 0) {
    current[idx] = {
      ...current[idx],
      status: newStatus,
      atualizadoEm: new Date().toISOString(),
      concluidaEm: newStatus === 'Concluída' ? new Date().toISOString() : current[idx].concluidaEm,
    };
    setItem(STORAGE_KEYS.ATIVIDADES_GESTAO, current);
  }
}

// Notas (Páginas estilo Notion)
export function getNotasPaginas(): NotaPagina[] {
  return getItem<NotaPagina[]>(STORAGE_KEYS.NOTAS_PAGINAS, INITIAL_NOTAS_PAGINAS);
}

export function saveNotasPaginas(items: NotaPagina[]): void {
  setItem(STORAGE_KEYS.NOTAS_PAGINAS, items);
}

export function saveNotaPagina(item: NotaPagina): void {
  const current = getNotasPaginas();
  const idx = current.findIndex((n) => n.id === item.id);
  if (idx >= 0) {
    current[idx] = { ...item, atualizadoEm: new Date().toISOString() };
  } else {
    current.push(item);
  }
  setItem(STORAGE_KEYS.NOTAS_PAGINAS, current);
}

export function deleteNotaPagina(id: string): void {
  const current = getNotasPaginas();
  // Remove a página e também suas eventuais sub-páginas (paginaPaiId)
  const idsToRemove = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    current.forEach((n) => {
      if (n.paginaPaiId && idsToRemove.has(n.paginaPaiId) && !idsToRemove.has(n.id)) {
        idsToRemove.add(n.id);
        changed = true;
      }
    });
  }
  const filtered = current.filter((n) => !idsToRemove.has(n.id));
  setItem(STORAGE_KEYS.NOTAS_PAGINAS, filtered);
}

// ==========================================
// MÓDULO INSTRUÇÕES DE TRABALHO (IT)
// ==========================================
export function getInstrucoesTrabalho(): InstrucaoTrabalho[] {
  return getItem<InstrucaoTrabalho[]>(STORAGE_KEYS.INSTRUCOES_TRABALHO, INITIAL_INSTRUCOES_TRABALHO);
}

export function saveInstrucaoTrabalho(item: InstrucaoTrabalho): void {
  const current = getInstrucoesTrabalho();
  const idx = current.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    current[idx] = { ...item, atualizadoEm: new Date().toISOString() };
  } else {
    current.push(item);
  }
  setItem(STORAGE_KEYS.INSTRUCOES_TRABALHO, current);
}

export function deleteInstrucaoTrabalho(id: string): void {
  const current = getInstrucoesTrabalho().filter((i) => i.id !== id);
  setItem(STORAGE_KEYS.INSTRUCOES_TRABALHO, current);
}

// ==========================================
// GLOBAL MODULE NAVIGATION PREFERENCE
// ==========================================
export function getStoredGlobalModule(): GlobalModuleId {
  return getItem<GlobalModuleId>(STORAGE_KEYS.ACTIVE_GLOBAL_MODULE, 'visao_geral');
}

export function saveStoredGlobalModule(module: GlobalModuleId): void {
  setItem(STORAGE_KEYS.ACTIVE_GLOBAL_MODULE, module);
}

// Export / Import / Reset Database
export function resetDatabaseToDefault(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.EMPREGADORES, JSON.stringify(INITIAL_EMPREGADORES));
  localStorage.setItem(STORAGE_KEYS.SUPERVISORES, JSON.stringify(INITIAL_SUPERVISORES));
  localStorage.setItem(STORAGE_KEYS.CARGOS, JSON.stringify(INITIAL_CARGOS));
  localStorage.setItem(STORAGE_KEYS.FERIADOS, JSON.stringify(INITIAL_FERIADOS));
  localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify(INITIAL_COLABORADORES));
  localStorage.setItem(STORAGE_KEYS.FERIAS, JSON.stringify(INITIAL_FERIAS));
  localStorage.setItem(STORAGE_KEYS.OCORRENCIAS, JSON.stringify(INITIAL_OCORRENCIAS));
  localStorage.setItem(STORAGE_KEYS.PRE_ADMISSOES, JSON.stringify(INITIAL_PRE_ADMISSOES));
  localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(INITIAL_CLIENTES));
  localStorage.setItem(STORAGE_KEYS.EMBARQUES_AEREOS, JSON.stringify(INITIAL_EMBARQUES_AEREOS));
  localStorage.setItem(STORAGE_KEYS.VIAGENS_RODOVIARIAS, JSON.stringify(INITIAL_VIAGENS_RODOVIARIAS));
  localStorage.setItem(STORAGE_KEYS.PROJETOS_GERENCIAIS, JSON.stringify(INITIAL_PROJETOS_GERENCIAIS));
  localStorage.setItem(STORAGE_KEYS.ATIVIDADES_GESTAO, JSON.stringify(INITIAL_ATIVIDADES_GESTAO));
  notifyChange();
}

// Custos Operacionais
export function getCustosOperacionais(): CustoOperacional[] {
  return getItem<CustoOperacional[]>(STORAGE_KEYS.CUSTOS_OPERACIONAIS, INITIAL_CUSTOS_OPERACIONAIS);
}
export function saveCustosOperacionais(items: CustoOperacional[]): void {
  setItem(STORAGE_KEYS.CUSTOS_OPERACIONAIS, items);
}
export function saveCustoOperacional(item: CustoOperacional): void {
  const current = getCustosOperacionais();
  const idx = current.findIndex((c) => c.id === item.id);
  if (idx >= 0) {
    current[idx] = { ...item, atualizadoEm: new Date().toISOString() };
  } else {
    current.unshift(item);
  }
  saveCustosOperacionais(current);
}
export function deleteCustoOperacional(id: string): void {
  const current = getCustosOperacionais();
  const updated = current.filter((c) => c.id !== id);
  saveCustosOperacionais(updated);
}

export function exportDatabaseJSON(): string {
  const db = {
    versao: '1.5.0',
    empresa: 'Jobson de Moraes Transportes (JMT)',
    geradoEm: new Date().toISOString(),
    empregadores: getEmpregadores(),
    supervisores: getSupervisores(),
    cargos: getCargos(),
    feriados: getFeriados(),
    colaboradores: getColaboradores(),
    ferias: getFerias(),
    ocorrencias: getOcorrencias(),
    preAdmissoes: getPreAdmissoes(),
    clientes: getClientes(),
    embarquesAereos: getEmbarquesAereos(),
    viagensRodoviarias: getViagensRodoviarias(),
    projetosGerenciais: getProjetosGerenciais(),
    atividadesGestao: getAtividadesGestao(),
    custosOperacionais: getCustosOperacionais(),
    lancamentosFaturamentoAereo: getLancamentosFaturamentoAereo(),
    faturasAereo: getFaturasAereo(),
  };
  return JSON.stringify(db, null, 2);
}

export function importDatabaseJSON(jsonContent: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonContent);
    if (!data.colaboradores || !Array.isArray(data.colaboradores)) {
      return { success: false, message: 'Arquivo inválido: campo colaboradores não encontrado.' };
    }
    if (data.empregadores) setItem(STORAGE_KEYS.EMPREGADORES, data.empregadores);
    if (data.supervisores) setItem(STORAGE_KEYS.SUPERVISORES, data.supervisores);
    if (data.cargos) setItem(STORAGE_KEYS.CARGOS, data.cargos);
    if (data.feriados) setItem(STORAGE_KEYS.FERIADOS, data.feriados);
    if (data.colaboradores) setItem(STORAGE_KEYS.COLABORADORES, data.colaboradores);
    if (data.ferias) setItem(STORAGE_KEYS.FERIAS, data.ferias);
    if (data.ocorrencias) setItem(STORAGE_KEYS.OCORRENCIAS, data.ocorrencias);
    if (data.preAdmissoes) setItem(STORAGE_KEYS.PRE_ADMISSOES, data.preAdmissoes);
    if (data.clientes) setItem(STORAGE_KEYS.CLIENTES, data.clientes);
    if (data.embarquesAereos) setItem(STORAGE_KEYS.EMBARQUES_AEREOS, data.embarquesAereos);
    if (data.viagensRodoviarias) setItem(STORAGE_KEYS.VIAGENS_RODOVIARIAS, data.viagensRodoviarias);
    if (data.projetosGerenciais) setItem(STORAGE_KEYS.PROJETOS_GERENCIAIS, data.projetosGerenciais);
    if (data.atividadesGestao) setItem(STORAGE_KEYS.ATIVIDADES_GESTAO, data.atividadesGestao);
    if (data.custosOperacionais) setItem(STORAGE_KEYS.CUSTOS_OPERACIONAIS, data.custosOperacionais);
    if (data.lancamentosFaturamentoAereo)
      setItem(STORAGE_KEYS.LANCAMENTOS_FATURAMENTO_AEREO, data.lancamentosFaturamentoAereo);
    if (data.faturasAereo) setItem(STORAGE_KEYS.FATURAS_AEREO, data.faturasAereo);
    notifyChange();
    return { success: true, message: 'Dados importados com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro ao importar: ${err.message || 'Formato inválido'}` };
  }
}


