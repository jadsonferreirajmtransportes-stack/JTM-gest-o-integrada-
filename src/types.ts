// Types for JMT (Jobson de Moraes Transportes) System

export type GlobalModuleId =
  | 'visao_geral'
  | 'clientes'
  | 'farma_aereo'
  | 'farma_rodoviario'
  | 'dp'
  | 'projetos'
  | 'agenda'
  | 'controladoria'
  | 'chat'
  | 'notas'
  | 'instrucoes'
  | 'usuarios';

// Sistema de Autenticação e Permissão de Módulos por Login
export interface UsuarioLogin {
  id: string;
  nome: string;
  login: string; // nome de usuário para login
  email: string;
  senha?: string;
  cargo: string;
  setor?: string;
  status: 'Ativo' | 'Inativo' | 'Bloqueado';
  fotoUrl?: string;
  dataCriacao: string;
  ultimoAcesso?: string;
  modulosPermitidos: GlobalModuleId[];
  observacoes?: string;
  /** Vínculo com a conta REAL de login (Supabase Auth, auth.users.id) desta pessoa — fase 1 do
   *  login real por pessoa. Preenchido automaticamente (por e-mail) em usuariosApi.ts quando a
   *  conta ainda não tem vínculo; nunca via senha/credencial. Enquanto for undefined, essa
   *  pessoa ainda não tem uma conta de login própria vinculada. */
  authUserId?: string;
  /** Papel real desta pessoa, checado no SERVIDOR (Edge Function convidar-usuario) — diferente
   *  do seletor "userRole" do cabeçalho, que é só uma troca de visual sem checagem nenhuma por
   *  trás. Só quem tiver role 'admin' aqui consegue convidar gente nova por e-mail. */
  role?: UserRole;
}

export type EstadoCivil = 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | 'União estável';
export type RacaCor = 'Branca' | 'Preta' | 'Parda' | 'Amarela' | 'Indígena' | 'Não declarada';
export type GrauInstrucao = 
  | 'Ensino Fundamental Incompleto' 
  | 'Ensino Fundamental Completo' 
  | 'Ensino Médio Incompleto' 
  | 'Ensino Médio Completo' 
  | 'Superior Incompleto' 
  | 'Superior Completo' 
  | 'Pós-graduação / Especialização';
export type Genero = 'Masculino' | 'Feminino' | 'Outro';

export type StatusColaborador = 'Ativo' | 'Férias' | 'Afastado' | 'Inativo';
export type FormaPagamento = 'Mensal' | 'Quinzenal' | 'Semanal';
export type TipoConta = 'Corrente' | 'Poupança' | 'Salário';
export type TipoChavePix = 'CPF' | 'CNPJ' | 'E-mail' | 'Telefone' | 'Aleatória';

export type StatusExame = 'Válido' | 'A vencer' | 'Vencido' | 'Pendente';
export type StatusDocumento = 'Pendente' | 'Recebido' | 'Não se aplica';

export type StatusFerias = 'A programar' | 'Programada' | 'Em gozo' | 'Concluída' | 'Contemplada' | 'Vencida';
export type TipoOcorrencia =
  | 'Atestado médico'
  | 'Falta justificada'
  | 'Falta injustificada'
  | 'Atraso'
  | 'Falta'
  | 'Advertência'
  | 'Advertência escrita'
  | 'Suspensão disciplinar'
  | 'Elogio'
  | 'Acidente'
  | 'Acidente de trabalho (CAT)'
  | 'Comparecimento'
  | 'Saída antecipada'
  | 'Outro';

export type StatusOcorrencia = 'Aberta' | 'Em análise' | 'Resolvida';

export type MotivoDemissao = 
  | 'Demissão sem justa causa'
  | 'Pedido de demissão'
  | 'Demissão com justa causa'
  | 'Término de contrato de experiência'
  | 'Rescisão antecipada do contrato de experiência'
  | 'Acordo mútuo (Art. 484-A CLT)'
  | 'Aposentadoria';

export type UserRole = 'admin' | 'supervisor' | 'colaborador';

// 2.1 Empregador
export interface Empregador {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  endereco?: string;
  cidadeUF?: string;
  telefone?: string;
  responsavelLegal?: string;
  registroAnvisa?: string;
}

// 2.5 Dependentes
export interface Dependente {
  id: string;
  nome: string;
  parentesco: 'Filho(a)' | 'Cônjuge' | 'Pai/Mãe' | 'Enteado(a)' | 'Outro';
  dataNascimento: string; // YYYY-MM-DD
  cpf: string;
}

// 2.8 Documentos Checklist
export interface DocumentoItem {
  id: string;
  tipo: 'CPF/RG/CNH' | 'Título de Eleitor' | 'Carteira de Trabalho' | 'Cartão do PIS' | 'Certificado de Reservista' | 'Certidão de Casamento' | 'Comprovante de Residência' | 'ASO Admissional' | 'Certificado RDC 430';
  status: StatusDocumento;
  nomeArquivo?: string;
  dataUpload?: string;
  arquivoUrl?: string;
  observacao?: string;
}

// 2.9 Histórico de Fardamento / EPI
export interface HistoricoFardamento {
  id: string;
  data: string;
  itemAlterado: string;
  tamanhoAnterior: string;
  tamanhoNovo: string;
  motivo?: string;
  responsavel: string;
}

// 2.10 Cargos e Salários
export interface CargoSalario {
  id: string;
  cargo: string;
  setor: string;
  faixaSalarialMinima: number;
  faixaSalarialMaxima: number;
  pisoConvencaoColetiva?: number;
  cbo?: string;
  descricao?: string;
}

// 2.15 Motivos de Ocorrência Config
export interface MotivoOcorrenciaConfig {
  id: string;
  tipo: TipoOcorrencia;
  descricao: string;
  impactaRemuneracao: boolean;
  exigeComprovante: boolean;
}

// 2.16 Tipos de Contrato e Benefícios
export interface TipoContratoBeneficio {
  id: string;
  tipoContrato: 'CLT Indeterminado' | 'CLT Determinado (Experiência)' | 'Aprendiz' | 'Estagiário';
  elegivelVT: boolean;
  elegivelVA: boolean;
  diasExperienciaTotal?: number;
}

// 2.17 Supervisores
export interface Supervisor {
  id: string;
  nome: string;
  setor?: string;
  setores?: string[];
  cargo: string;
  email?: string;
  telefone?: string;
  telefoneWhatsapp?: string;
  ativo?: boolean;
}

// Versões "públicas" (só os campos mínimos e não sensíveis) de Supervisor/Colaborador/
// Empregador — usadas nos formulários preenchidos por quem NÃO tem login no sistema (ex.:
// Formulário Público de Ocorrências). O papel "anon" do Supabase não tem acesso de leitura
// às tabelas completas (colaboradores guarda CPF, endereço, dados bancários e de saúde) —
// essas listas vêm de funções "security definer" que devolvem só isto (ver migração
// 019_acesso_publico_ocorrencias.sql e getSupervisoresPublico/getColaboradoresAtivosPublico/
// getEmpregadoresPublico em dpApi.ts). Nunca adicionar um campo sensível aqui.
export interface SupervisorPublico {
  id: string;
  nome: string;
  cargo: string;
  setor?: string;
}
export interface ColaboradorPublico {
  id: string;
  nomeCompleto: string;
  funcaoCargo: string;
  codigoMatricula: string;
  setor?: string;
  empregadorId?: string;
  dataAdmissao?: string;
}
export interface EmpregadorPublico {
  id: string;
  razaoSocial: string;
}

// 2.18 Feriados da Empresa
export interface FeriadoEmpresa {
  id: string;
  data: string; // YYYY-MM-DD
  descricao: string;
  tipo: 'Nacional' | 'Estadual' | 'Municipal' | 'Ponto Facultativo';
}

// 2.13 Onboarding Item
export interface ItemOnboarding {
  id?: string;
  item?: string;
  etapa?: string;
  responsavel?: string;
  prazo?: string;
  concluido: boolean;
  dataConclusao?: string;
  observacao?: string;
  observacoes?: string;
}

// Anotações internas e observações do colaborador
export interface AnotacaoColaborador {
  id: string;
  data: string; // YYYY-MM-DD ou ISO
  autor: string;
  categoria: 'Geral' | 'Desempenho' | 'Conduta' | 'Saúde' | 'Treinamento' | 'Documentação' | 'Elogio';
  texto: string;
  fixado?: boolean;
}

// Anexos, certificados e arquivos do colaborador
export interface AnexoColaborador {
  id: string;
  nome: string;
  categoria: 'Documento Pessoal' | 'Certificado RDC 430' | 'Laudo / Exame' | 'Contrato / Termo' | 'Treinamento' | 'Comprovante' | 'Outros';
  dataUpload: string;
  tamanho?: string;
  tipo?: string; // 'image/png', 'image/jpeg', 'application/pdf', etc.
  arquivoUrl?: string; // Data URL Base64 or URL
  descricao?: string;
}

// 2.2 a 2.9 Entidade Central COLABORADOR
export interface Colaborador {
  id: string;
  codigoMatricula: string;
  
  // 2.2 Dados Pessoais
  nomeCompleto: string;
  nomePai?: string;
  nomeMae?: string;
  dataNascimento?: string; // YYYY-MM-DD
  naturalidade?: string;
  nacionalidade?: string;
  estadoCivil: EstadoCivil;
  racaCor: RacaCor;
  grauInstrucao: GrauInstrucao;
  genero: Genero;
  enderecoCompleto?: string;
  cidadeUF?: string;
  cep?: string;
  telefoneWhatsapp: string;
  email: string;
  cpf: string;
  rg?: string;
  orgaoEmissorUF?: string;
  portadorDeficiencia: boolean;
  detalheDeficiencia?: string;

  // 2.3 Dados Contratuais
  empregadorId: string;
  status: StatusColaborador;
  funcaoCargo: string;
  setor: string;
  setoresAtuacao?: ('farma_aereo' | 'farma_rodoviario' | 'dp')[];
  setorPrincipal?: 'farma_aereo' | 'farma_rodoviario' | 'dp' | 'ambos' | string;
  dataAdmissao: string; // YYYY-MM-DD
  dataDemissao?: string; // YYYY-MM-DD
  motivoDemissao?: MotivoDemissao | string;
  supervisorId?: string;
  formaPagamento: FormaPagamento;
  remuneracao: number;
  gratificacao: number;
  valorValeAlimentacaoDia: number;
  jornadaTrabalho: string;

  // Parâmetros CLT & Convenção Coletiva CCT 2026/2028 (SETCERN x SINTROCERN)
  pisoCctFuncao?: number;
  adicionalInsalubridade?: boolean; // Cláusula 12ª - 20% salário mínimo ou 15% salário base cimento
  percentualInsalubridade?: number;
  adicionalPericulosidade?: boolean; // Cláusula 13ª - 30% salário base
  adicionalAcumuloFuncao?: boolean; // Cláusula 27ª - 15% salário base ("Bater Carga")
  adicionalPenosidade?: boolean; // Cláusula 31ª - 15% salário base (Escadas >25kg)
  filiadoSintrocern?: boolean; // Cláusula 49ª - Mensalidade associativa 2%
  possuiQuinquenio?: boolean; // Cláusula 11ª - 5% a cada 5 anos ininterruptos
  numeroQuinquenios?: number;
  antecedentesCriminaisEntregue?: boolean; // Cláusula 21ª
  cnhPontuacaoEntregue?: boolean; // Cláusula 21ª
  termoVtAssinado?: boolean; // Cláusula 16ª
  termoFardamentoAssinado?: boolean; // Cláusula 42ª
  
  // Documentos Complementares CLT
  pisPasep?: string;
  ctpsNumero?: string;
  ctpsSerie?: string;
  ctpsUF?: string;
  cnhNumero?: string;
  cnhCategoria?: string;
  cnhValidade?: string;
  tituloEleitorNumero?: string;
  reservistaNumero?: string;

  // 2.4 Dados Bancários
  banco?: string;
  agencia?: string;
  tipoConta?: TipoConta;
  numeroConta?: string;
  tipoChavePix?: TipoChavePix;
  chavePix?: string;

  // 2.5 Dependentes
  dependentes: Dependente[];

  // 2.6 Vale Transporte
  vtQuantidadeTarifasDia: number;
  vtValorTarifa: number;
  vtIdentificacaoConducao?: string;

  // 2.7 Saúde do Trabalhador (ANVISA / RDC 430)
  dataExameAdmissional?: string;
  dataUltimoExameOcupacional?: string;
  dataVencimentoExame?: string;
  dataExameDemissional?: string;
  clinicaMedica?: string;
  observacaoSaude?: string;
  asoImagemUrl?: string;
  asoNomeArquivo?: string;
  asoMedicoEmitente?: string;
  asoCrmMedico?: string;
  asoResultado?: 'Apto' | 'Inapto' | 'Apto com Restrições';

  // 2.8 Documentação (Checklist)
  documentos: DocumentoItem[];

  // 2.9 Fardamento e EPI
  tamanhoCamisa: string;
  numeroCalca: string;
  numeroCalcado: string;
  historicoFardamento: HistoricoFardamento[];

  // 2.10 Anotações e Dossiê de Anexos
  anotacoes?: AnotacaoColaborador[];
  anexos?: AnexoColaborador[];
  observacoesGerais?: string;

  // 2.13 Onboarding
  onboarding: ItemOnboarding[];

  // Metadados
  criadoEm?: string;
  atualizadoEm?: string;
}

// 2.12 Programação de Férias
export interface ProgramacaoFerias {
  id: string;
  colaboradorId: string;
  assunto?: string;
  periodoAquisitivoInicio?: string; // YYYY-MM-DD
  periodoAquisitivoFim?: string; // YYYY-MM-DD
  prazoLimiteGozo?: string; // YYYY-MM-DD
  dataLimiteLegal?: string;
  dataAdmissaoReferencia?: string;
  diasDireito?: number;
  abonoPecuniario?: boolean;
  vende10Dias?: boolean;
  diasAbono?: number;
  diasGozados?: number;
  totalDias?: number;
  mesReferencia?: string;
  dataInicio?: string;
  dataTermino?: string;
  dataRetorno?: string;
  dataFim?: string;
  fracionamento?: { periodo: number; dataInicio: string; dataFim: string; dias: number }[];
  status: StatusFerias;
  emailAvisoGerado?: string;
  avisoEnviadoEm?: string;
  comprovanteAssinadoUrl?: string; // data URL (imagem/PDF) do recibo/aviso de férias assinado
  comprovanteAssinadoNomeArquivo?: string;
  observacoes?: string;
}

// 2.12.1 Programação do Vale Alimentação (réplica do painel do Coda: quinzenas fixas do ano +
// um lançamento por colaborador/quinzena, com diárias calculadas a partir dos dias úteis do
// período menos as faltas informadas).
export interface QuinzenaValeAlimentacao {
  id: string;
  identificacao: string; // Ex: '1ª QUINZENA - ABRIL/2026'
  dataInicio: string; // YYYY-MM-DD
  dataTermino: string; // YYYY-MM-DD
}

/** Um lançamento (movimentação) de VA de um colaborador em uma quinzena específica. */
export interface LancamentoValeAlimentacao {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  quinzenaId: string;
  identificacaoQuinzena: string; // desnormalizado para exibição/exportação
  dataInicio: string; // YYYY-MM-DD — herdado da quinzena
  dataTermino: string; // YYYY-MM-DD — herdado da quinzena
  valorDiaria: number; // R$/dia — herdado de Colaborador.valorValeAlimentacaoDia no momento da geração
  faltas: number;
  /** Dias úteis do período em que o colaborador estava de férias (Programação de Férias) — não
   *  gera diária de VA, igual a uma falta, mas contado à parte para deixar claro o motivo. */
  diasFerias?: number;
  /** Dias úteis (seg-sex) do período menos faltas e dias de férias — calculado, não editável diretamente. */
  quantidadeDiarias: number;
  /** quantidadeDiarias * valorDiaria — calculado, não editável diretamente. */
  valorDisponibilizado: number;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

// 2.14 Ocorrências
export interface Ocorrencia {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  setor?: string;
  data?: string;
  dataOcorrencia?: string; // YYYY-MM-DD
  tipo: TipoOcorrencia;
  diasAfastamento?: number;
  descricao: string;
  supervisorId?: string;
  supervisorNome?: string;
  status?: StatusOcorrencia;
  acaoTomada?: string;
  comprovanteAnexo?: string;
  registradoPor?: string;
  origem?: string;
  criadoEm?: string;
}

// Alertas do Sistema
export interface AlertaItem {
  id: string;
  tipo: 'exame' | 'ferias' | 'documento' | 'onboarding';
  nivel: 'urgente' | 'atencao' | 'info';
  colaboradorId: string;
  colaboradorNome: string;
  titulo: string;
  descricao: string;
  diasRestantes?: number;
  dataLimite?: string;
}

// 2.19 Admissão Digital / Pré-Cadastro de Novos Colaboradores
export type StatusPreAdmissao = 'Pendente' | 'Em Análise' | 'Aprovado' | 'Rejeitado';

export interface DocumentoPreAdmissao {
  id: string;
  tipo: string;
  nomeArquivo: string;
  arquivoUrl?: string; // base64 or data URL
  dataUpload: string;
  tamanho?: string;
}

export interface PreAdmissao {
  id: string;
  token: string;
  criadoEm: string;
  atualizadoEm?: string;
  status: StatusPreAdmissao;
  empresaPredefinidaId?: string;
  cargoPredefinido?: string;
  supervisorPredefinidoId?: string;
  observacoesDP?: string;
  colaboradorEfetivadoId?: string;

  // Dados preenchidos pelo candidato
  dadosPessoais: {
    nomeCompleto: string;
    nomePai?: string;
    nomeMae?: string;
    dataNascimento?: string; // YYYY-MM-DD
    naturalidade?: string;
    nacionalidade?: string;
    estadoCivil: EstadoCivil;
    racaCor: RacaCor;
    grauInstrucao: GrauInstrucao;
    genero: Genero;
    cpf: string;
    rg?: string;
    orgaoEmissorUF?: string;
    pisPasep?: string;
    cnhNumero?: string;
    cnhCategoria?: string;
    cnhValidade?: string;
    ctpsNumero?: string;
    ctpsSerie?: string;
    ctpsUF?: string;
    tituloEleitorNumero?: string;
    reservistaNumero?: string;
    portadorDeficiencia: boolean;
    detalheDeficiencia?: string;
  };
  contatoEndereco: {
    telefoneWhatsapp: string;
    email: string;
    enderecoCompleto: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidadeUF: string;
    cep: string;
  };
  dadosBancarios: {
    banco?: string;
    agencia?: string;
    tipoConta?: TipoConta;
    numeroConta?: string;
    tipoChavePix?: TipoChavePix;
    chavePix?: string;
  };
  transporte: {
    utilizaVT: boolean;
    vtQuantidadeTarifasDia: number;
    vtValorTarifa: number;
    vtIdentificacaoConducao?: string;
    termoAceito?: boolean;
  };
  filiacaoSindical?: {
    optaFiliacaoSintrocern: boolean;
    autorizaDesconto2Porcento: boolean;
    dataOpcao?: string;
  };
  termosCCT?: {
    aceitouTermoVT: boolean;
    aceitouTermoFardamentoEPI: boolean;
    dataAceiteTermos?: string;
  };
  dependentes: Dependente[];
  fardamento: {
    tamanhoCamisa: string;
    numeroCalca: string;
    numeroCalcado: string;
  };
  documentosEnviados: DocumentoPreAdmissao[];
  declaracaoVeracidade: boolean;
  aceiteLgpd?: boolean;
  dataEnvio?: string;
}

// ==========================================
// 3.0 MÓDULO CARTEIRA DE CLIENTES (LOGÍSTICA & TRANSPORTE)
// ==========================================

export type SegmentoCliente =
  | 'Distribuidora de Medicamentos'
  | 'Indústria Farmacêutica'
  | 'Rede de Drogarias / Farmácias'
  | 'Hospital / Clínica / Operadora de Saúde'
  | 'Alimentos Climatizados / Frios'
  | 'Cosméticos / Higiene / Nutracêuticos'
  | 'Atacado / Carga Seca'
  | 'Outro Segmento';

export type StatusCliente =
  | 'Ativo'
  | 'Em Negociação'
  | 'Prospecção'
  | 'Suspenso'
  | 'Inativo';

export type TipoOperacaoContratada =
  | 'Distribuição Fracionada (Last Mile)'
  | 'Transferência Dedicada (Lotação)'
  | 'Cross-Docking / Armazenagem Fria'
  | 'Coleta & Logística Reversa'
  | 'Transporte Termolábil Crítico (2°C a 8°C)'
  | 'Transporte Climatizado (15°C a 25°C)'
  | 'Plantão Hospitalar 24h';

export type FaixaTemperaturaExigida =
  | 'Ambiente / Carga Seca'
  | 'Climatizado (15°C a 25°C)'
  | 'Refrigerado / Termolábil (2°C a 8°C)'
  | 'Congelado (-20°C)'
  | 'Múltiplas Faixas Térmicas';

export interface ContatoCliente {
  id: string;
  nome: string;
  cargoSetor: string; // Ex: Gerente de Logística, Coordenador de Expedição, Compras, Faturamento
  telefoneWhatsapp: string;
  email: string;
  principal?: boolean;
}

/**
 * Uma linha da tabela de tarifa por cidade/praça (Tarifa Base), no mesmo formato usado nos
 * tarifários reais da JMT no Coda: CIDADE, RAIO, ATÉ 10KG, KG EXCEDENTE, KM.
 */
export interface FaixaTarifaCidade {
  id: string;
  cidade: string;
  raio: string; // Ex: 'CAPITAL E REGIÃO METROPOLITANA', 'CIDADES INT. ATÉ 300 KM COMPART.'
  valorAte10Kg: number; // R$ — taxa de entrega até o peso-base da faixa
  valorKgExcedente: number; // R$/kg — cobrado por kg que ultrapassar o peso-base
  distanciaKm?: number;
}

/**
 * Um encargo avulso/adicional da tabela de "Custos Extras" do cliente (TDE, dedicado,
 * embarque, entrega rastreada etc.), no mesmo formato usado no Coda: CATEGORIA,
 * GRUPO/DESTINATÁRIO, ITEM/DESCRIÇÃO, TIPO DE COBRANÇA, VALOR.
 */
export interface CustoExtraTarifa {
  id: string;
  categoria: string; // Ex: 'TDE / VEÍCULO', 'DEDICADO CAPITAL', 'CUSTO EXTRA'
  grupoDestinatario?: string;
  itemDescricao?: string;
  tipoCobranca: 'Valor fechado' | 'Valor/KM' | 'Serviço avulso';
  valor: number;
}

export interface TabelaPrecoFrete {
  tipoCobranca:
    | 'Valor por Ponto/Entrega'
    | 'Valor por Km Rodado'
    | '% sobre Nota Fiscal (Ad Valorem)'
    | 'Diária por Veículo Dedicado'
    | 'Tabela por Faixa de Peso'
    | 'Fracionado + Taxa Fixa'
    | 'Mista';
  /**
   * Alterna entre os dois modelos de precificação mais usados na operação (Farma Aéreo e
   * Farma Rodoviário, conferido no Coda): tarifa base por faixa de peso (taxa de entrega +
   * kg excedente) ou percentual Ad Valorem sobre a Nota Fiscal. 'outro' libera o
   * `tipoCobranca` clássico para modelos alternativos (km rodado, diária, misto etc.).
   */
  modeloPrecificacao?: 'tarifa_base' | 'ad_valorem' | 'outro';
  /** Tarifa Base: taxa de entrega cobrada até o peso-base da faixa (ex: até 10kg). */
  valorBase: number;
  /** Tarifa Base: valor por kg que ultrapassar o peso-base (R$/kg excedente). */
  valorKgExcedente?: number;
  /**
   * Tarifa Base (opcional): tabela detalhada por cidade/praça, para quando a taxa de entrega
   * e o kg excedente variam por destino (ex: Capital x Interior por faixa de km) — mesmo
   * formato do tarifário real da JMT no Coda. Quando vazia, usa-se `valorBase`/`valorKgExcedente`
   * como tarifa única padrão.
   */
  tarifasPorCidade?: FaixaTarifaCidade[];
  /** Encargos avulsos do cliente (TDE, dedicado, embarque, entrega rastreada etc.). */
  custosExtras?: CustoExtraTarifa[];
  freteMinimo?: number;
  taxaDescargaAjudante?: number;
  percentualGrisPedagio?: number;
  /**
   * % Ad Valorem/GRIS cobrado sobre o valor declarado na Nota Fiscal do serviço/mercadoria —
   * usado quando `modeloPrecificacao` é 'ad_valorem'. Replica o modelo real de precificação
   * conferido no Coda: item "Custos extras de cliente (Ad valorem, GRIS, etc.)" em CUSTO,
   * PRECIFICAÇÃO E RENTABILIDADE — base de cálculo "conforme tarifário de cada cliente".
   */
  percentualAdValoremNF?: number;
  condicaoPagamento: string; // Ex: 'Faturamento Quinzenal (15 dias)', 'Faturamento Mensal (30 dias)'
  diaFechamento?: number;
  observacoesTarifa?: string;
}

export interface InteracaoCliente {
  id: string;
  data: string; // YYYY-MM-DD
  tipo:
    | 'Reunião Comercial'
    | 'Alinhamento Operacional'
    | 'Auditoria de Qualidade (RDC 430)'
    | 'Revisão de Tabela / Reajuste'
    | 'Feedback / SLA'
    | 'Visita Técnica / Início de Rota'
    | 'Atendimento Financeiro';
  responsavelJMT: string;
  resumo: string;
  proximoPasso?: string;
  dataProximoPasso?: string;
}

export interface RegiaoAtendimento {
  id?: string;
  cidadeUF: string;
  frequencia: 'Diária' | 'Segunda/Quarta/Sexta' | 'Terça/Quinta' | 'Semanal' | 'Sob Demanda';
  prazoLeadTime: string; // Ex: '24 horas', '48 horas', 'Mesmo dia (Same Day)'
}

export interface Cliente {
  id: string;
  codigoCliente: string; // Ex: 'CLI-001'
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  segmento: SegmentoCliente;
  status: StatusCliente;
  setoresVinculados?: ('farma_aereo' | 'farma_rodoviario')[];
  setorAtuacao?: 'farma_aereo' | 'farma_rodoviario' | 'ambos' | string;
  empresaFaturamentoId?: string; // ID da filial JMT que emite os CT-es / faturas
  gerenteContaResponsavel: string; // Nome do supervisor ou gestor comercial JMT
  enderecoCompleto: string;
  cidadeUF: string;
  cep?: string;
  telefonePrincipal: string;
  emailPrincipal: string;
  website?: string;

  // Operação & Regulatório ANVISA / RDC 430
  tiposOperacao: TipoOperacaoContratada[];
  faixaTemperatura: FaixaTemperaturaExigida;
  exigeRDC430: boolean;
  exigeRegistroAnvisa: boolean;
  numeroLicencaSanitaria?: string;
  validadeLicencaSanitaria?: string;
  restricoesHorarioCarga?: string; // Ex: 'Janela de descarga das 06:00 às 11:00'

  // Contrato & Faturamento
  numeroContrato?: string;
  dataInicioContrato?: string; // YYYY-MM-DD
  dataRenovacaoContrato?: string; // YYYY-MM-DD
  faturamentoMensalEstimado: number;
  volumeEntregasMesEstimado: number;
  /** Tarifário padrão do cliente — usado para lançamentos Aéreo, e para Rodoviário também
   *  quando o cliente só atende um modal. */
  tabelaFrete: TabelaPrecoFrete;
  /**
   * Tarifário específico para lançamentos com `modal` Rodoviário — só é necessário quando o
   * cliente opera nos dois modais com tabelas de preço DIFERENTES entre si (ex.: LUFT, que tem
   * "TARIFARIO - LUFT AEREO" e "TARIFARIO - LUFT RODOVIARIO" com valores distintos por cidade
   * no Coda). Sem esse campo, todo lançamento do cliente (aéreo ou rodoviário) usa `tabelaFrete`
   * — comportamento anterior, preservado para os demais clientes que só têm uma tabela.
   */
  tabelaFreteRodoviario?: TabelaPrecoFrete;

  // Frota / Equipe Dedicada
  veiculosAlocados?: string; // Ex: '2x Vans Refrigeradas Master 2°C a 8°C + 1x VUC Climatizado'
  motoristasAlocadosIds?: string[]; // IDs de colaboradores JMT dedicados à conta

  // Contatos, Praças & Histórico CRM
  contatos: ContatoCliente[];
  regioesAtendidas: RegiaoAtendimento[];
  interacoes: InteracaoCliente[];
  observacoesOperacionais?: string;
  satisfacaoNPS?: number; // 1 a 10

  criadoEm?: string;
  atualizadoEm?: string;
}

// ==========================================
// 4.0 MÓDULO FARMA AÉREO (RDC 430 / AWB / TECA)
// ==========================================

export type StatusEmbarqueAereo =
  | 'Programado'
  | 'Coletado no Remetente'
  | 'No TECA Origem'
  | 'Em Voo / Trânsito'
  | 'Pousado / No TECA Destino'
  | 'Liberado TECA / ANVISA'
  | 'Em Rota de Entrega'
  | 'Entregue com Sucesso'
  | 'Entregue / Concluído'
  | 'Alerta de Atraso'
  | 'Alerta Térmico';

export type FaixaTemperaturaAereo =
  | 'Refrigerado (2°C a 8°C)'
  | 'Climatizado (15°C a 25°C)'
  | 'Gelo Seco (-70°C a -20°C)'
  | 'Nitrogênio Líquido (-196°C)'
  | 'Ambiente Controlado'
  | 'Ambiente Monitorado';

export type TipoCargaAereo =
  | 'Medicamentos Termolábeis'
  | 'Vacinas & Imunobiológicos'
  | 'Reagentes Diagnósticos'
  | 'Insumos Hospitalares Críticos'
  | 'Amostras Biológicas'
  | 'Medicamentos Oncológicos'
  | 'Carga Geral Farma';

export type CompanhiaAerea =
  | 'LATAM Cargo'
  | 'Gollog (GOL)'
  | 'Azul Cargo Express'
  | 'Voepass Cargo'
  | 'Voo Fretado / Táxi Aéreo'
  | 'Outra Cia';

export interface HistoricoRastreamentoAereo {
  id: string;
  dataHora: string; // ISO or YYYY-MM-DD HH:mm
  local: string;
  descricao: string;
  temperaturaAferida?: number;
  responsavel?: string;
}

export interface EmbarqueAereo {
  id: string;
  codigoAWB: string; // Ex: 'LA-8192034', 'G3-5910243'
  numeroAwb?: string;
  numeroCteAereo?: string;
  clienteId: string;
  clienteNome: string;
  remetenteNome: string;
  remetenteCidadeUF: string;
  destinatarioNome: string;
  destinatarioEndereco: string;
  destinatarioCidadeUF: string;
  tipoCarga: TipoCargaAereo;
  faixaTemperatura: FaixaTemperaturaAereo;
  tipoEmbalagem: string; // Ex: 'Caixa Térmica VIP c/ PCM', 'EPS c/ Gelo Seco', 'Envirotainer'
  companhiaAerea: CompanhiaAerea;
  numeroVoo: string; // Ex: 'LA-3712', 'G3-1590'
  aeroportoOrigem: string; // Ex: 'GRU - São Paulo/Guarulhos', 'VCP - Viracopos'
  aeroportoDestino: string; // Ex: 'NAT - Natal/RN', 'REC - Recife/PE', 'FOR - Fortaleza/CE'
  dataEmbarque: string; // YYYY-MM-DD
  horarioPrevistoDecolagem?: string;
  horarioPrevistoPouso?: string;
  previsaoEntregaDestino: string; // YYYY-MM-DD HH:mm
  status: StatusEmbarqueAereo;
  
  // Controle Térmico & Sensores
  temperaturaAtual: number;
  temperaturaMinima: number;
  temperaturaMaxima: number;
  dataloggerSerial?: string;
  dataloggerModelo?: string; // Ex: 'TempTale Ultra', 'Elitech RC-5+'
  termogramaValidado: boolean;

  // Carga & Documentos
  pesoBrutoKg: number;
  quantidadeVolumes: number;
  valorMercadoria: number;
  valorFreteAereo: number;
  urgencia: 'Normal' | 'Urgente' | 'Plantão Emergencial / UTI 24h';
  numeroNotaFiscal: string;
  responsavelLiberacaoTeca?: string;
  motoristaColetaId?: string;
  motoristaEntregaId?: string;
  observacoes?: string;
  comprovanteEntregaUrl?: string;
  
  historico: HistoricoRastreamentoAereo[];
  criadoEm?: string;
  atualizadoEm?: string;
}

// ==========================================
// 4.5 CONTROLE FINANCEIRO — FATURAMENTO FARMA AÉREO
// (Réplica do painel "CONTROLE FINANCEIRO - AÉREO" mantido no Coda:
//  lançamentos de CT-e por cliente, agrupados em Faturas com status
//  de cobrança/pagamento. Alimentável por importação de planilha.)
// ==========================================

export type StatusFaturaAereo = 'Aberta' | 'Parcial' | 'Paga' | 'A Confirmar' | 'NF Gerada';

export type TipoCustoExtraFaturamentoAereo =
  | 'Dedicado por KM'
  | 'Dedicado Integral'
  | 'Dedicado Compartilhado'
  | 'TDE Compartilhado ou Integral + Descarga no Cliente'
  | 'TDE Integral'
  | 'TDE Compartilhado'
  | 'Coleta de Insumos'
  | 'Compra de Insumos'
  | 'Operação Fleury com Reversa'
  | 'Operação sem Reversar';

/** Lançamento individual de CT-e/entrega vinculado (ou não) a uma Fatura. */
export interface LancamentoFaturamentoAereo {
  id: string;
  clienteId?: string;
  clienteNome: string;
  cnpjRemetente?: string;
  estadoRemetente?: string;
  cidadeRemetente?: string;
  remetenteLab?: string;
  destinatario?: string;
  cnpjDestinatario?: string;
  estadoDestino?: string;
  cidadeDestino?: string;
  bairroDestino?: string;
  notaFiscal?: string;
  valorNF?: number;
  valorPrestacao?: number;
  dataEmissao?: string; // YYYY-MM-DD
  numeroCte?: string;
  ctrc?: string;
  modal?: string; // ex: 'Aéreo', 'Rodoviário' — texto livre, também aceito da importação
  pesoKg?: number;
  pesoTaxado?: number;
  volumes?: number;
  tipoCustoExtra?: TipoCustoExtraFaturamentoAereo;
  custoExtra?: number;
  custoDescarga?: number;
  /** Valor a cobrar do cliente por este lançamento (informado ou importado). */
  valorACobrar: number;
  valorRecebido?: number;
  confirmacaoPagamento: boolean;
  dataConclusao?: string;
  nfEmitida?: boolean;
  /** Vínculo com a Fatura (FaturaAereo.id) que agrupa este lançamento. */
  faturaId?: string;
  observacao?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

/** Fatura que agrupa um conjunto de lançamentos (CT-es) de um cliente/período. */
export interface FaturaAereo {
  id: string;
  clienteId?: string;
  clienteNome: string;
  periodo: string; // Ex: 'Setembro 2026'
  numeroFatura: string;
  dataEnvio?: string;
  numeroNF?: string;
  observacao?: string;
  /** 'Aéreo' | 'Rodoviário' — mesmo campo livre de LancamentoFaturamentoAereo.modal, usado pra
   *  separar o Controle Financeiro de cada setor (ver faturamentoAereoUtils.ehModalRodoviario).
   *  Ausente = trata como Aéreo (compatibilidade com faturas já existentes, todas aéreas). */
  modal?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

// ==========================================
// 5.0 MÓDULO FARMA RODOVIÁRIO (RDC 430 / FROTAS / ROTAS)
// ==========================================

export type StatusViagemRodoviaria =
  | 'Planejada'
  | 'Carregamento / Pré-Resfriamento'
  | 'Em Carregamento & Pré-Resfriamento'
  | 'Em Rota / Trânsito'
  | 'Em Trânsito / Em Rota'
  | 'Parada / Entrega em Andamento'
  | 'Entregas em Andamento'
  | 'Viagem Concluída'
  | 'Concluída / Retornou à Base'
  | 'Ocorrência Operacional'
  | 'Alerta de Atraso'
  | 'Alerta de Temperatura'
  | 'Ocorrência Térmica';

export type FaixaTemperaturaRodoviario =
  | 'Refrigerado (2°C a 8°C)'
  | 'Climatizado (15°C a 25°C)'
  | 'Congelado (-25°C a -15°C)'
  | 'Ambiente Monitorado'
  | '2°C a 8°C'
  | '15°C a 25°C'
  | 'Bi-Thermo (2°C-8°C e 15°C-25°C)';

export type ModalidadeViagemRodoviaria =
  | 'Distribuição Urbana / Last Mile'
  | 'Distribuição Fracionada (Last Mile)'
  | 'Linha Tronco / Transferência'
  | 'Transferência Linha Tronco'
  | 'Cross-Docking'
  | 'Dedicado Exclusivo'
  | 'Coleta de Emergência';

export type TipoVeiculoRodoviario =
  | 'Van Refrigerada (2°C a 8°C)'
  | 'Van Climatizada (15°C a 25°C)'
  | 'VUC Climatizado / Refrigerado'
  | 'Caminhão Toco Refrigerado'
  | 'Caminhão Truck Frigorífico'
  | 'Carreta Frigorífica Dedicada'
  | string;

export interface PontoParadaViagem {
  id: string;
  ordem?: number;
  ordemEntrega?: number;
  clienteId?: string;
  clienteNome: string;
  destinatarioNome?: string;
  endereco: string;
  cidadeUF: string;
  numeroNotaFiscal?: string;
  numeroNF?: string;
  faixaTemperatura?: string;
  janelaHorario?: string;
  quantidadeVolumes?: number;
  pesoKg?: number;
  valorCarga?: number;
  valorMercadoria?: number;
  status: 'Pendente' | 'No Local' | 'Entregue' | 'Insucesso / Reagendado' | 'Recusada / Reagendada';
  horarioChegada?: string;
  horarioEntrega?: string;
  horarioEfetivoEntrega?: string;
  temperaturaMomento?: number;
  temperaturaNaEntrega?: number;
  responsavelRecebimento?: string;
  nomeRecebedor?: string;
  recebedorNome?: string;
  documentoRecebedor?: string;
  recebedorDocumento?: string;
  observacoes?: string;
  observacao?: string;
}

export type PontoEntregaRodoviario = PontoParadaViagem;

export interface ChecklistSaidaVeiculo {
  higienizacaoSanitizacaoOk: boolean;
  preResfriamentoAtingido: boolean;
  dataloggerLigadoConfigurado: boolean;
  lacreBauNumero: string;
  epiTermicoDisponibilizado: boolean;
  documentacaoMdfeCteOk: boolean;
  calibracaoTermometroValida: boolean;
  dataHoraValidacao?: string;
  validadoPor?: string;
}

export interface OcorrenciaRotaRodoviaria {
  id: string;
  dataHora: string;
  tipo:
    | 'Variação Térmica Temporária'
    | 'Atraso no Cliente'
    | 'Congestionamento / Bloqueio'
    | 'Avaria em Embalagem Secundária'
    | 'Recusa de Produto'
    | 'Manutenção Preventiva Equipamento de Frio';
  descricao: string;
  resolvida: boolean;
}

export interface ViagemRodoviaria {
  id: string;
  codigoViagem?: string; // Ex: 'ROD-2026-051'
  numeroMdfe?: string;
  tituloRota?: string; // Ex: 'Rota Seridó & Alto Oeste Potiguar'
  origem?: string;
  rotaOrigem?: string; // Ex: 'CD Principal JMT - Natal/RN'
  destinoFinal?: string;
  rotaDestino?: string; // Ex: 'Mossoró/RN' ou 'João Pessoa/PB'
  regioesAtendidas?: string[];
  modalidade: ModalidadeViagemRodoviaria;
  
  // Veículo & Motorista
  veiculoPlaca: string;
  veiculoTipo?: string;
  veiculoModelo?: TipoVeiculoRodoviario;
  motoristaId?: string;
  motoristaNome: string;
  motoristaCpf?: string;
  motoristaTelefone?: string;
  ajudanteNome?: string;

  // Datas & Horários
  dataSaida?: string; // YYYY-MM-DD
  dataPartida?: string; // YYYY-MM-DD
  horarioSaida?: string;
  horarioPartidaPrevisto?: string; // HH:mm
  horarioPartidaReal?: string;
  previsaoRetornoBase?: string; // YYYY-MM-DD HH:mm
  previsaoChegada?: string;
  previsaoChegadaDestino?: string;
  status: StatusViagemRodoviaria;

  // Controle de Temperatura & Telemetria em Tempo Real
  faixaTemperatura?: FaixaTemperaturaRodoviario;
  faixaTemperaturaExigida?: string;
  temperaturaAtualBau: number;
  temperaturaSetPoint?: number;
  setpointTermostato?: number;
  temperaturaMinima?: number;
  temperaturaMaxima?: number;
  temperaturaMinPermitida?: number;
  temperaturaMaxPermitida?: number;
  statusRefrigerador?: string;
  dataloggerId?: string;
  dataloggerSerial?: string;
  termoHigienizacaoAssinado?: boolean;

  // Métricas da Viagem
  quantidadeNotasFiscais?: number;
  totalNFs?: number;
  quantidadeTotalVolumes?: number;
  valorTotalMercadoria?: number;
  valorTotalCarga?: number;
  pesoTotalKg: number;
  kmTotalEstimado?: number;
  kmInicial?: number;
  kmFinal?: number;

  checklistSaida?: ChecklistSaidaVeiculo;
  checklistPartida?: any;
  historicoTemperatura?: any[];
  pontosParada?: PontoParadaViagem[];
  pontosEntrega?: PontoEntregaRodoviario[];
  ocorrencias?: OcorrenciaRotaRodoviaria[];
  observacoes?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

// =========================================================================
// MÓDULO 5: PROJETOS GERENCIAIS & ESTRATÉGICOS (JMT LOGÍSTICA FARMACÊUTICA)
// =========================================================================

export type CategoriaProjeto =
  | 'Expansão & Novos Hubs'
  | 'Regulatório & Qualidade RDC 430'
  | 'Inovação & Tecnologia'
  | 'Frota & Sustentabilidade'
  | 'Comercial & Novos Clientes'
  | 'Eficiência Operacional & Custos'
  | 'RH & Treinamento';

export type StatusProjeto =
  | 'Planejamento'
  | 'Em Andamento'
  | 'Em Revisão'
  | 'Pausado'
  | 'Concluído'
  | 'Cancelado';

export type PrioridadeProjeto = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export type SetorImpactadoProjeto =
  | 'Todos os Setores'
  | 'Farma Aéreo'
  | 'Farma Rodoviário'
  | 'Departamento Pessoal'
  | 'Comercial & CRM'
  | 'Garantia da Qualidade & RDC 430'
  | 'Diretoria Executiva';

export type ColunaKanban = 'backlog' | 'a_fazer' | 'em_andamento' | 'revisao' | 'concluido';

export interface MarcoProjeto {
  id: string;
  titulo: string;
  descricao?: string;
  dataLimite: string; // YYYY-MM-DD
  concluido: boolean;
  dataConclusao?: string;
  responsavel?: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Atrasado';
}

export interface TarefaKanban {
  id: string;
  titulo: string;
  descricao?: string;
  coluna: ColunaKanban;
  responsavel: string;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  dataLimite?: string;
  concluida: boolean;
  dataConclusao?: string;
  horasEstimadas?: number;
  custoEstimado?: number;
}

export interface RiscoProjeto {
  id: string;
  descricao: string;
  categoria?: 'Operacional' | 'Regulatório / RDC 430' | 'Financeiro' | 'Tecnológico' | 'Pessoas';
  probabilidade: 'Baixa' | 'Média' | 'Alta';
  impacto: 'Baixo' | 'Médio' | 'Alto';
  planoMitigacao: string;
  responsavel?: string;
  status: 'Ativo' | 'Mitigado' | 'Ocorrido' | 'Cancelado';
}

export interface IndicadorKPIProjeto {
  id: string;
  nome: string;
  meta: string;
  atual: string;
  atingido: boolean;
}

export interface AtualizacaoProjeto {
  id: string;
  data: string; // ISO
  autor: string;
  titulo: string;
  descricao: string;
  tipo?: 'Status' | 'Marco' | 'Financeiro' | 'Risco' | 'Geral';
}

export type CategoriaDocumentoProjeto =
  | 'Regulatório & Qualidade RDC 430'
  | 'Contrato & Termos'
  | 'Escopo & Cronograma'
  | 'Orçamento & Proposta Comercial'
  | 'Relatório & Apresentação Executiva'
  | 'Laudo Técnico & Certificado'
  | 'Evidência Fotográfica'
  | 'Outros';

export interface AnexoDocumentoProjeto {
  id: string;
  nome: string;
  tipo: string;
  tamanho?: string;
  dataUpload: string;
  url?: string;
  arquivoUrl?: string;
  observacao?: string;
  categoria?: CategoriaDocumentoProjeto;
  autor?: string;
}

export interface ProjetoGerencial {
  id: string;
  codigo: string; // ex: PRJ-2026-001
  titulo: string;
  descricao: string;
  categoria: CategoriaProjeto;
  status: StatusProjeto;
  prioridade: PrioridadeProjeto;
  setorImpactado: SetorImpactadoProjeto;
  
  // Liderança e Equipe
  liderProjetoId?: string;
  liderProjetoNome: string;
  liderCargo?: string;
  equipeMembros: string[]; // Nomes ou IDs
  
  // Datas e Prazos
  dataInicio: string; // YYYY-MM-DD
  dataPrevisaoFim: string; // YYYY-MM-DD
  dataConclusaoReal?: string; // YYYY-MM-DD
  
  // Orçamento e Finanças
  orcamentoPrevisto: number; // Capex + Opex
  custoRealizado: number;
  tipoInvestimento?: 'Capex' | 'Opex' | 'Misto';
  roiEstimadoMeses?: number;
  retornoEsperadoDescricao?: string;
  
  // Progresso
  progressoPercentual: number; // 0 a 100
  
  // Alinhamento Estratégico & OKRs
  objetivoEstrategico?: string;
  alinhamentoRDC430?: boolean;
  
  // Sub-estruturas Gerenciais
  marcos: MarcoProjeto[];
  tarefas: TarefaKanban[];
  riscos: RiscoProjeto[];
  kpis?: IndicadorKPIProjeto[];
  atualizacoes?: AtualizacaoProjeto[];
  documentos?: AnexoDocumentoProjeto[];

  observacoes?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  /** Mesma regra de visibilidade da Agenda da Gestão — ver src/utils/visibilidadeUtils.ts. */
  criadoPorUserId?: string;
  usuariosMarcadosIds?: string[];
}

// ==========================================
// AGENDA DE ATIVIDADES DA GESTÃO
// ==========================================
export type CategoriaAtividadeGestao =
  | 'Reunião & Governança'
  | 'Auditoria & RDC 430'
  | 'Operação & Frota'
  | 'Gente & DP'
  | 'Projetos & OKRs'
  | 'Comercial & Clientes'
  | 'Treinamento & Capacitação';

export type StatusAtividadeGestao =
  | 'Agendada'
  | 'Em Andamento'
  | 'Concluída'
  | 'Cancelada'
  | 'Adiada';

export type PrioridadeAtividadeGestao = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export type RecorrenciaAtividade = 'Nenhuma' | 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal';

export interface ItemDeliberacaoAta {
  id: string;
  texto: string;
  concluido: boolean;
  responsavel?: string;
  prazo?: string;
}

export interface AtividadeGestao {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: CategoriaAtividadeGestao;
  status: StatusAtividadeGestao;
  prioridade: PrioridadeAtividadeGestao;
  data: string; // YYYY-MM-DD (data de início)
  dataFim?: string; // YYYY-MM-DD — data final, para atividades que abrangem várias datas (ex: viagem, auditoria de vários dias)
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  diaInteiro?: boolean;
  responsavel: string;
  responsavelCargo?: string;
  participantes: string[];
  /** UsuarioLogin.id de quem criou a atividade — App.tsx carimba automaticamente ao salvar.
   *  Junto com usuariosMarcadosIds, define quem (além de admin) enxerga esta atividade na
   *  Agenda da Gestão; ver podeVerAtividade em agendaUtils.ts. */
  criadoPorUserId?: string;
  /** UsuarioLogin.id de quem foi marcado/mencionado nesta atividade — ganham visibilidade dela
   *  mesmo sem ser responsável/participante (que são texto livre, nem sempre um login real). */
  usuariosMarcadosIds?: string[];
  /**
   * Alterna entre reunião presencial (endereço/sala física, com link de localização opcional)
   * ou videoconferência (link de sala online — Google Meet, Zoom, Teams etc.). Ausente em
   * atividades antigas; nesse caso o tipo é inferido a partir do conteúdo de `localOuLink`.
   */
  tipoLocal?: 'presencial' | 'videoconferencia';
  /** Endereço/nome do local (modo presencial) ou o próprio link da sala (modo videoconferência). */
  localOuLink: string;
  /** Usado apenas em modo presencial: link de localização (Google Maps ou similar) do endereço informado em `localOuLink`. */
  linkLocalizacao?: string;
  pautaAta?: string;
  deliberacoes?: ItemDeliberacaoAta[];
  moduloRelacionado?: GlobalModuleId | 'geral';
  projetoRelacionadoId?: string;
  lembreteMinutos?: number;
  recorrencia?: RecorrenciaAtividade;
  ultimoAlertaEnviadoEm?: string;
  ultimoAlertaCanal?: 'whatsapp' | 'email' | 'ambos';
  criadoEm: string;
  atualizadoEm?: string;
  concluidaEm?: string;
}

// ==========================================
// CUSTOS OPERACIONAIS (ENTRADAS & DESPESAS)
// ==========================================
export type SetorCustoOperacional = 'farma_aereo' | 'farma_rodoviario' | 'geral';

export type CategoriaCustoOperacional =
  | 'Combustível & Abastecimento'
  | 'Manutenção Mecânica & Peças'
  | 'Refrigeração & Thermo King / Carrier'
  | 'Pedágios & ConectCar / Sem Parar'
  | 'Fretes & Tarifas Aéreas (Cias)'
  | 'Embalagens Térmicas & Gelo Seco / PCM'
  | 'Qualificação Térmica & Dataloggers (RDC 430)'
  | 'Armazenagem TECA & Câmaras Frias'
  | 'Seguros de Carga (RCTR-C / RCF-DC)'
  | 'Sanitização & Limpeza Técnica de Baús'
  | 'Coletas de Urgência & Last-Mile'
  | 'EPIs & Uniformes Operacionais'
  | 'Diárias & Alimentação de Motoristas'
  | 'Outros Custos Operacionais';

export type StatusCustoOperacional = 'Pago' | 'A Pagar' | 'Provisionado';
export type PeriodicidadeCusto = 'Mensal Fixo' | 'Avulso / Por Viagem' | 'Recorrente';

export interface CustoOperacional {
  id: string;
  setor: SetorCustoOperacional;
  categoria: CategoriaCustoOperacional | string;
  descricao: string;
  valor: number;
  dataCompetencia: string; // YYYY-MM ou YYYY-MM-DD
  dataVencimento?: string;
  dataPagamento?: string;
  status: StatusCustoOperacional;
  periodicidade: PeriodicidadeCusto;
  fornecedor?: string;
  numeroDocumentoOuNF?: string;
  placaVeiculo?: string;
  conhecimentoOuAwb?: string;
  clienteRelacionadoId?: string;
  criadoPor?: string;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

// ==========================================
// MÓDULO CONTROLADORIA (DRE GERENCIAL & ORÇADO x REALIZADO)
// Ver src/utils/controladoriaUtils.ts para os cálculos.
// ==========================================

/** Cada linha corresponde a um bloco da DRE Gerencial calculada em controladoriaUtils.ts —
 *  orçamento é lançado no nível de linha (não por categoria individual de custo), pra manter o
 *  Orçado x Realizado direto e comparável com o resultado do setor. */
export type TipoLinhaOrcamento =
  | 'Receita'
  | 'Custos Variáveis'
  | 'Custos Fixos'
  | 'Folha de Pagamento'
  | 'Investimentos (CAPEX)';

export interface OrcamentoItem {
  id: string;
  setor: SetorCustoOperacional; // 'farma_aereo' | 'farma_rodoviario' | 'geral'
  tipoLinha: TipoLinhaOrcamento;
  competencia: string; // 'YYYY-MM'
  valorPlanejado: number;
  observacoes?: string;
  criadoPor?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

// ==========================================
// MÓDULO CHAT INTERNO (conversas diretas e em grupo entre Logins & Acessos)
// Ver src/utils/chatApi.ts para as funções de acesso e o realtime.
// ==========================================

export type TipoConversaChat = 'direta' | 'grupo';

export interface ConversaChat {
  id: string;
  tipo: TipoConversaChat;
  /** Só preenchido em conversas do tipo 'grupo' — direta usa o nome do outro participante. */
  nome?: string;
  criadoPor?: string;
  criadoEm: string;
  /** Carimbado a cada mensagem nova — usado pra ordenar a lista de conversas por atividade
   *  recente, sem precisar de outra consulta pra descobrir a última mensagem de cada uma. */
  atualizadoEm: string;
  /** Ids (UsuarioLogin.id) de quem participa — carregado junto ao buscar as conversas. */
  participantesIds: string[];
}

export interface MensagemChat {
  id: string;
  conversaId: string;
  autorId: string;
  texto: string;
  criadoEm: string;
  /** Anexo opcional (imagem ou PDF) — data URL (base64), mesmo padrão do ASO digitalizado e do
   *  comprovante de férias. `anexoNome`/`anexoTipo` vêm do arquivo original selecionado. */
  anexoUrl?: string;
  anexoNome?: string;
  anexoTipo?: string;
}

// ==========================================
// MÓDULO NOTAS (PÁGINAS ESTILO NOTION — ANOTAÇÕES & BRAINSTORM)
// ==========================================

export type TipoBlocoNota =
  | 'texto'
  | 'titulo1'
  | 'titulo2'
  | 'titulo3'
  | 'lista'
  | 'lista_numerada'
  | 'checklist'
  | 'citacao'
  | 'callout'
  | 'divisor'
  | 'imagem'
  | 'documento'
  | 'fluxograma'
  | 'tabela';

/** Uma etapa (caixa) de um bloco de fluxograma. */
export interface FluxogramaNo {
  id: string;
  texto: string;
  x: number;
  y: number;
}

/** Uma seta ligando duas etapas de um bloco de fluxograma. */
export interface FluxogramaConexao {
  id: string;
  origemId: string;
  destinoId: string;
}

/** Um bloco de conteúdo da página (parágrafo, título, item de lista, checklist, imagem, documento, fluxograma etc.) — mesma lógica de blocos empilháveis do Notion. */
export interface BlocoNota {
  id: string;
  tipo: TipoBlocoNota;
  /** Para blocos de texto, é o conteúdo; para `tipo === 'imagem'` ou `'documento'`, é a legenda/descrição opcional do arquivo. */
  texto: string;
  /** Usado apenas quando `tipo === 'checklist'`. */
  concluido?: boolean;
  /** Usado quando `tipo === 'imagem'` ou `'documento'`: arquivo em Data URL (base64), mesmo padrão usado nos anexos do ASO/admissão. */
  imagemUrl?: string;
  /** Usado quando `tipo === 'imagem'` ou `'documento'`: nome do arquivo original. */
  imagemNome?: string;
  /** Usado quando `tipo === 'fluxograma'`: etapas (caixas) do diagrama. */
  fluxogramaNos?: FluxogramaNo[];
  /** Usado quando `tipo === 'fluxograma'`: setas ligando as etapas. */
  fluxogramaConexoes?: FluxogramaConexao[];
  /** Usado quando `tipo === 'tabela'`: rótulos das colunas. */
  tabelaColunas?: string[];
  /** Usado quando `tipo === 'tabela'`: linhas da tabela — cada linha tem o mesmo número de células que `tabelaColunas`. */
  tabelaLinhas?: string[][];
}

/** Tipo de entidade de outro módulo que uma página de nota pode referenciar. */
export type TipoEntidadeVinculo =
  | 'cliente'
  | 'colaborador'
  | 'projeto'
  | 'embarque_aereo'
  | 'viagem_rodoviaria'
  | 'ocorrencia';

/** Vínculo opcional de uma nota com um registro de outro módulo do sistema (ex: um Cliente, Projeto, Colaborador). */
export interface VinculoNotaModulo {
  modulo: GlobalModuleId;
  tipoEntidade: TipoEntidadeVinculo;
  entidadeId: string;
  /** Nome/rótulo do registro vinculado, cacheado para exibição rápida sem precisar re-buscar. */
  entidadeLabel: string;
}

/** Uma página de anotações/brainstorm, estilo Notion — pode ter sub-páginas (via `paginaPaiId`) e um vínculo opcional com outro módulo. */
export interface NotaPagina {
  id: string;
  titulo: string;
  /** Emoji usado como ícone da página. */
  icone?: string;
  /** ID da página-mãe, para organizar em hierarquia (sub-páginas). */
  paginaPaiId?: string;
  blocos: BlocoNota[];
  vinculo?: VinculoNotaModulo;
  favorito?: boolean;
  arquivada?: boolean;
  autor?: string;
  criadoEm: string;
  atualizadoEm?: string;
  /** Mesma regra de visibilidade da Agenda da Gestão — ver src/utils/visibilidadeUtils.ts. */
  criadoPorUserId?: string;
  usuariosMarcadosIds?: string[];
}

// ==========================================
// MÓDULO INSTRUÇÕES DE TRABALHO (IT) — formulário estruturado por etapas (não blocos livres
// estilo Notion), seguindo à risca o método interno "Passo a passo — estabelecer e revisar
// processos": cada etapa da metodologia (Objetivo/Escopo, Responsabilidades, SIPOC, Fluxo do
// Processo, Indicadores, Riscos, Plano 5W2H, Histórico de Revisões) é um campo ou uma tabela
// dedicada, e não um bloco de texto genérico — mais amarrado ao processo real.
// ==========================================

/** Operação/área à qual a instrução pertence — também define o prefixo do código (ex.: IT-AER-001). */
export type CategoriaInstrucaoTrabalho =
  | 'Farma Aéreo'
  | 'Farma Rodoviário'
  | 'Departamento Pessoal'
  | 'Gestão de Clientes'
  | 'Projetos Gerenciais'
  | 'Geral';

export type StatusInstrucaoTrabalho = 'Rascunho' | 'Em Revisão' | 'Vigente' | 'Obsoleta';

/** Etapa 3 — quem responde pelo quê na execução e manutenção do processo. */
export interface ResponsabilidadeProcesso {
  id: string;
  responsavel: string;
  responsabilidade: string;
}

/** Etapa 4 — SIPOC: Fornecedores, Entradas, Processo, Saídas e Clientes, de ponta a ponta. */
export interface LinhaSipoc {
  id: string;
  fornecedores: string;
  entradas: string;
  processo: string;
  saidas: string;
  clientes: string;
}

/** Etapa 5 — uma etapa do fluxo do processo (réplica da "Estrutura simples" do método: Ordem,
 *  Etapa, Responsável, Entrada, Saída, Sistema/Documento, Observação). */
export interface EtapaFluxoProcesso {
  id: string;
  ordem: number;
  etapa: string;
  responsavel?: string;
  entrada?: string;
  saida?: string;
  sistemaDocumento?: string;
  observacao?: string;
}

/** Etapa 7 — indicador de desempenho do processo. */
export interface IndicadorProcesso {
  id: string;
  indicador: string;
  formula: string;
  meta: string;
  frequencia: string;
  responsavel: string;
}

/** Etapa 8 — um risco identificado e o controle adotado para mitigá-lo. */
export interface RiscoControleProcesso {
  id: string;
  risco: string;
  controle: string;
}

/** Etapa 9 — uma ação do plano 5W2H para implantar melhorias no processo. */
export interface AcaoPlano5W2H {
  id: string;
  oQue: string;
  porQue: string;
  onde: string;
  quando: string;
  quem: string;
  como: string;
  custoRecurso: string;
}

/** Etapa 10 — uma linha do histórico de revisões do documento. */
export interface RevisaoHistorico {
  id: string;
  revisao: string;
  data: string;
  alteradoPor: string;
  descricao: string;
}

/** Uma Instrução de Trabalho (IT) — formulário estruturado em etapas fixas (não blocos livres),
 *  com código sequencial, categoria/operação, status de vigência e versão. */
export interface InstrucaoTrabalho {
  id: string;
  /** Código sequencial por categoria, gerado automaticamente. Ex.: 'IT-AER-001'. */
  codigo: string;
  titulo: string;
  categoria: CategoriaInstrucaoTrabalho;
  status: StatusInstrucaoTrabalho;
  /** Incrementada manualmente pelo usuário a cada revisão relevante do conteúdo — equivale à
   *  "Revisão" do cabeçalho padrão de documentação de processos (Passo a passo — estabelecer
   *  e revisar processos). */
  versao: number;
  /** "Dono do processo": garante que o processo funcione, seja medido, revisado e melhorado. */
  responsavel?: string;
  /** Quem aprovou formalmente a versão vigente do documento. */
  aprovadoPor?: string;
  /** Data a partir da qual esta versão passa a valer (YYYY-MM-DD). */
  dataVigencia?: string;

  // Etapa 2 — Objetivo e Escopo
  objetivo?: string;
  aplicacaoAbrangencia?: string;
  definicoes?: string;

  // Etapa 3 — Responsabilidades
  responsabilidades: ResponsabilidadeProcesso[];

  // Etapa 4 — SIPOC
  sipoc: LinhaSipoc[];

  // Etapa 5 — Fluxo do Processo
  fluxoProcesso: EtapaFluxoProcesso[];

  // Etapa 6 — Critérios de Decisão e Registros
  criteriosDecisao?: string;
  registrosEvidencias?: string;

  // Etapa 7 — Indicadores
  indicadores: IndicadorProcesso[];

  // Etapa 8 — Riscos e Controles
  riscosControles: RiscoControleProcesso[];

  // Etapa 9 — Plano de Ação 5W2H
  planoAcao5W2H: AcaoPlano5W2H[];

  // Etapa 10 — Histórico de Revisões
  historicoRevisoes: RevisaoHistorico[];

  /** Vínculo opcional com um registro específico de outra operação (mesmo tipo do módulo Notas). */
  vinculo?: VinculoNotaModulo;
  favorito?: boolean;
  arquivada?: boolean;
  autor?: string;
  criadoEm: string;
  atualizadoEm?: string;
  /** Mesma regra de visibilidade da Agenda da Gestão — ver src/utils/visibilidadeUtils.ts. */
  criadoPorUserId?: string;
  usuariosMarcadosIds?: string[];
}

