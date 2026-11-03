// ============================================================================
// Módulo Qualidade (área farmacêutica — RDC 430/2020): o que cada tipo de
// registro tem (situações, campos e rótulos). A tela e o formulário são
// montados a partir daqui — ver QualidadeView.tsx e RegistroQualidadeModal.tsx.
// ============================================================================

export type TipoQualidade = 'desvio' | 'excursao' | 'qualificacao' | 'fornecedor' | 'reclamacao' | 'auditoria';

export interface CampoQualidade {
  chave: string;
  rotulo: string;
  tipo: 'texto' | 'paragrafo' | 'data' | 'numero' | 'lista' | 'simnao';
  opcoes?: string[];
  obrigatorio?: boolean;
  dica?: string;
  /** Ocupa a linha inteira no formulário (parágrafos já ocupam). */
  inteira?: boolean;
  /** Aparece como coluna na lista. */
  naLista?: boolean;
}

export interface StatusQualidade {
  id: string;
  rotulo: string;
  /** Estilo do selo. */
  cor: 'ambar' | 'azul' | 'roxo' | 'verde' | 'cinza' | 'vermelho';
  /** Situação encerrada (sai dos pendentes do painel). */
  final?: boolean;
}

export interface ConfigQualidade {
  tipo: TipoQualidade;
  sigla: string;
  aba: string;
  singular: string;
  descricao: string;
  status: StatusQualidade[];
  rotuloTitulo: string;
  rotuloData: string;
  rotuloPrazo?: string;
  /** O prazo é uma validade (qualificações, fornecedores): avisa vencidos e a vencer. */
  prazoEhValidade?: boolean;
  campos: CampoQualidade[];
  /** Tem ações (CAPA / achados). */
  acoes?: { titulo: string; tipos: string[] };
}

export const TIPOS_ACAO_CAPA = ['Correção imediata', 'Ação corretiva', 'Ação preventiva'];
export const STATUS_ACAO = ['Pendente', 'Em andamento', 'Concluída', 'Cancelada'] as const;

const CATEGORIAS_DESVIO = [
  'Avaria de carga',
  'Extravio / falta de volume',
  'Excursão de temperatura',
  'Atraso na entrega',
  'Entrega trocada / errada',
  'Documentação (NF, CT-e, AWB)',
  'Embalagem / acondicionamento',
  'Limpeza e higiene (veículo / armazém)',
  'Controle de pragas',
  'Segurança / roubo',
  'Medicamento controlado',
  'Outro',
];

export const CONFIG_QUALIDADE: ConfigQualidade[] = [
  {
    tipo: 'desvio',
    sigla: 'DSV',
    aba: 'Desvios e CAPA',
    singular: 'Desvio',
    descricao: 'Não conformidades, investigação de causa e ações corretivas e preventivas (CAPA)',
    status: [
      { id: 'aberto', rotulo: 'Aberto', cor: 'ambar' },
      { id: 'investigacao', rotulo: 'Em investigação', cor: 'azul' },
      { id: 'capa', rotulo: 'CAPA em andamento', cor: 'roxo' },
      { id: 'eficacia', rotulo: 'Verificação de eficácia', cor: 'azul' },
      { id: 'encerrado', rotulo: 'Encerrado', cor: 'verde', final: true },
      { id: 'cancelado', rotulo: 'Cancelado', cor: 'cinza', final: true },
    ],
    rotuloTitulo: 'Título (resumo do desvio)',
    rotuloData: 'Data da ocorrência',
    rotuloPrazo: 'Prazo para encerrar',
    campos: [
      { chave: 'categoria', rotulo: 'Categoria', tipo: 'lista', opcoes: CATEGORIAS_DESVIO, obrigatorio: true, naLista: true },
      { chave: 'classificacao', rotulo: 'Classificação de risco', tipo: 'lista', opcoes: ['Crítico', 'Maior', 'Menor'], dica: 'Crítico: risco à qualidade do produto ou ao paciente', naLista: true },
      { chave: 'cliente', rotulo: 'Cliente', tipo: 'texto', naLista: true },
      { chave: 'documento', rotulo: 'NF / CT-e / AWB', tipo: 'texto' },
      { chave: 'local', rotulo: 'Local / veículo (placa)', tipo: 'texto' },
      { chave: 'produtoAfetado', rotulo: 'Produto afetado?', tipo: 'simnao' },
      { chave: 'descricao', rotulo: 'Descrição do que aconteceu', tipo: 'paragrafo', obrigatorio: true },
      { chave: 'acaoImediata', rotulo: 'Ação imediata (contenção)', tipo: 'paragrafo' },
      { chave: 'metodo', rotulo: 'Método de investigação', tipo: 'lista', opcoes: ['5 Porquês', 'Ishikawa (6M)', 'Análise de falha', 'Outro'] },
      { chave: 'causaRaiz', rotulo: 'Causa raiz', tipo: 'paragrafo' },
      { chave: 'impacto', rotulo: 'Avaliação de impacto / risco ao produto', tipo: 'paragrafo' },
      { chave: 'clienteNotificado', rotulo: 'Cliente notificado?', tipo: 'simnao' },
      { chave: 'eficacia', rotulo: 'Verificação de eficácia (resultado)', tipo: 'paragrafo' },
    ],
    acoes: { titulo: 'Ações (CAPA)', tipos: TIPOS_ACAO_CAPA },
  },
  {
    tipo: 'excursao',
    sigla: 'EXC',
    aba: 'Temperatura',
    singular: 'Excursão de temperatura',
    descricao: 'Cargas que saíram da faixa de temperatura: avaliação de impacto e decisão sobre o produto',
    status: [
      { id: 'aberto', rotulo: 'Aberta', cor: 'ambar' },
      { id: 'avaliacao', rotulo: 'Em avaliação', cor: 'azul' },
      { id: 'encerrado', rotulo: 'Encerrada', cor: 'verde', final: true },
    ],
    rotuloTitulo: 'Título (ex.: Excursão na rota Natal–Mossoró)',
    rotuloData: 'Data da excursão',
    rotuloPrazo: 'Prazo para decisão',
    campos: [
      { chave: 'cliente', rotulo: 'Cliente', tipo: 'texto', obrigatorio: true, naLista: true },
      { chave: 'documento', rotulo: 'NF / CT-e / AWB', tipo: 'texto' },
      { chave: 'veiculo', rotulo: 'Veículo (placa) / caixa térmica', tipo: 'texto' },
      { chave: 'etapa', rotulo: 'Onde aconteceu', tipo: 'lista', opcoes: ['Coleta', 'Transporte rodoviário', 'Terminal aéreo', 'Voo', 'Armazenagem', 'Entrega', 'Outra'] },
      { chave: 'faixa', rotulo: 'Faixa exigida', tipo: 'lista', opcoes: ['2 °C a 8 °C', '15 °C a 25 °C', '15 °C a 30 °C', 'Abaixo de -20 °C', 'Outra'], obrigatorio: true, naLista: true },
      { chave: 'tempMin', rotulo: 'Mínima registrada (°C)', tipo: 'numero' },
      { chave: 'tempMax', rotulo: 'Máxima registrada (°C)', tipo: 'numero' },
      { chave: 'duracaoMin', rotulo: 'Tempo fora da faixa (minutos)', tipo: 'numero', naLista: true },
      { chave: 'dataLogger', rotulo: 'Data logger / termômetro (nº de série)', tipo: 'texto' },
      { chave: 'causa', rotulo: 'Causa provável', tipo: 'paragrafo' },
      { chave: 'impacto', rotulo: 'Avaliação de impacto', tipo: 'paragrafo', dica: 'Consultar os dados de estabilidade com o cliente / fabricante' },
      { chave: 'decisao', rotulo: 'Decisão sobre o produto', tipo: 'lista', opcoes: ['Aguardando', 'Liberado', 'Quarentena', 'Devolvido ao remetente', 'Descartado'], naLista: true },
      { chave: 'decisaoPor', rotulo: 'Quem decidiu (cliente, fabricante, RT)', tipo: 'texto' },
    ],
    acoes: { titulo: 'Ações (CAPA)', tipos: TIPOS_ACAO_CAPA },
  },
  {
    tipo: 'qualificacao',
    sigla: 'QLF',
    aba: 'Qualificações e calibrações',
    singular: 'Qualificação / calibração',
    descricao: 'Veículos, caixas térmicas, mapeamentos, calibrações e licenças, com aviso de vencimento',
    status: [
      { id: 'vigente', rotulo: 'Vigente', cor: 'verde' },
      { id: 'reprovado', rotulo: 'Reprovado', cor: 'vermelho' },
      { id: 'substituido', rotulo: 'Substituído (histórico)', cor: 'cinza', final: true },
    ],
    rotuloTitulo: 'Item (ex.: Baú refrigerado placa ABC1D23)',
    rotuloData: 'Data de realização',
    rotuloPrazo: 'Válido até',
    prazoEhValidade: true,
    campos: [
      {
        chave: 'categoria',
        rotulo: 'Tipo',
        tipo: 'lista',
        opcoes: [
          'Qualificação de veículo',
          'Qualificação de caixa térmica / embalagem',
          'Mapeamento térmico (armazém / câmara)',
          'Calibração de termômetro / data logger',
          'Qualificação de equipamento',
          'Licença sanitária',
          'AFE / AE (ANVISA)',
          'Alvará / licença de funcionamento',
          'Certidão de regularidade (CRF)',
          'Controle de pragas (certificado)',
          'Limpeza de caixa d’água',
          'Outro',
        ],
        obrigatorio: true,
        naLista: true,
      },
      { chave: 'identificacao', rotulo: 'Identificação (placa, nº de série, local)', tipo: 'texto', naLista: true },
      { chave: 'executante', rotulo: 'Empresa / responsável técnico', tipo: 'texto' },
      { chave: 'certificado', rotulo: 'Nº do certificado / laudo', tipo: 'texto' },
      { chave: 'resultado', rotulo: 'Resultado', tipo: 'lista', opcoes: ['Aprovado', 'Aprovado com restrição', 'Reprovado'] },
      { chave: 'observacao', rotulo: 'Observações', tipo: 'paragrafo' },
    ],
  },
  {
    tipo: 'fornecedor',
    sigla: 'FOR',
    aba: 'Fornecedores',
    singular: 'Fornecedor',
    descricao: 'Cadastro e qualificação de fornecedores e prestadores, com requalificação periódica',
    status: [
      { id: 'qualificacao', rotulo: 'Em qualificação', cor: 'ambar' },
      { id: 'qualificado', rotulo: 'Qualificado', cor: 'verde' },
      { id: 'restricao', rotulo: 'Qualificado com restrição', cor: 'roxo' },
      { id: 'reprovado', rotulo: 'Reprovado', cor: 'vermelho', final: true },
      { id: 'inativo', rotulo: 'Inativo', cor: 'cinza', final: true },
    ],
    rotuloTitulo: 'Razão social / nome',
    rotuloData: 'Data da qualificação',
    rotuloPrazo: 'Requalificar até',
    prazoEhValidade: true,
    campos: [
      { chave: 'cnpj', rotulo: 'CNPJ', tipo: 'texto', naLista: true },
      {
        chave: 'categoria',
        rotulo: 'Categoria',
        tipo: 'lista',
        opcoes: [
          'Agente / transportadora parceira',
          'Companhia aérea',
          'Embalagens e caixas térmicas',
          'Gelo reciclável / gelo seco',
          'Data loggers / termômetros',
          'Calibração / metrologia',
          'Controle de pragas',
          'Limpeza e higienização',
          'Manutenção de veículos e refrigeração',
          'Armazenagem terceirizada',
          'Tecnologia / sistemas',
          'Outro',
        ],
        obrigatorio: true,
        naLista: true,
      },
      { chave: 'critico', rotulo: 'Crítico para as Boas Práticas?', tipo: 'simnao', dica: 'Afeta a qualidade, a segurança ou a rastreabilidade do produto' },
      { chave: 'cidade', rotulo: 'Cidade / UF', tipo: 'texto' },
      { chave: 'contato', rotulo: 'Contato comercial (setor, telefone, e-mail)', tipo: 'texto', inteira: true },
      { chave: 'metodo', rotulo: 'Forma de qualificação', tipo: 'lista', opcoes: ['Questionário de qualificação', 'Análise documental', 'Auditoria presencial', 'Histórico de desempenho'] },
      { chave: 'nota', rotulo: 'Nota da avaliação (0 a 100)', tipo: 'numero' },
      { chave: 'documentos', rotulo: 'Documentos conferidos e validades', tipo: 'paragrafo', dica: 'Ex.: AFE nº ..., licença sanitária válida até ..., alvará, certificado de calibração' },
      { chave: 'parecer', rotulo: 'Parecer da Qualidade', tipo: 'paragrafo' },
    ],
    acoes: { titulo: 'Pendências / restrições', tipos: ['Pendência documental', 'Ação corretiva', 'Restrição de uso'] },
  },
  {
    tipo: 'reclamacao',
    sigla: 'REC',
    aba: 'Reclamações',
    singular: 'Reclamação',
    descricao: 'Reclamações de clientes, análise de procedência e resposta',
    status: [
      { id: 'aberto', rotulo: 'Aberta', cor: 'ambar' },
      { id: 'analise', rotulo: 'Em análise', cor: 'azul' },
      { id: 'respondida', rotulo: 'Respondida ao cliente', cor: 'roxo' },
      { id: 'encerrado', rotulo: 'Encerrada', cor: 'verde', final: true },
    ],
    rotuloTitulo: 'Resumo da reclamação',
    rotuloData: 'Data do recebimento',
    rotuloPrazo: 'Prazo de resposta',
    campos: [
      { chave: 'cliente', rotulo: 'Cliente', tipo: 'texto', obrigatorio: true, naLista: true },
      { chave: 'contato', rotulo: 'Quem reclamou (setor / cargo)', tipo: 'texto' },
      { chave: 'canal', rotulo: 'Canal', tipo: 'lista', opcoes: ['E-mail', 'Telefone', 'WhatsApp', 'Portal do cliente', 'Visita / reunião', 'Outro'] },
      { chave: 'documento', rotulo: 'NF / CT-e / AWB', tipo: 'texto' },
      { chave: 'categoria', rotulo: 'Assunto', tipo: 'lista', opcoes: ['Atraso', 'Avaria', 'Extravio', 'Temperatura', 'Atendimento', 'Documentação', 'Cobrança', 'Outro'], naLista: true },
      { chave: 'descricao', rotulo: 'O que o cliente relatou', tipo: 'paragrafo', obrigatorio: true },
      { chave: 'procedente', rotulo: 'Procedência', tipo: 'lista', opcoes: ['Em análise', 'Procedente', 'Improcedente'], naLista: true },
      { chave: 'resposta', rotulo: 'Resposta enviada ao cliente', tipo: 'paragrafo' },
      { chave: 'dataResposta', rotulo: 'Data da resposta', tipo: 'data' },
    ],
    acoes: { titulo: 'Ações (CAPA)', tipos: TIPOS_ACAO_CAPA },
  },
  {
    tipo: 'auditoria',
    sigla: 'AUD',
    aba: 'Auditorias',
    singular: 'Auditoria',
    descricao: 'Auditorias internas, de clientes, da Vigilância Sanitária e em fornecedores',
    status: [
      { id: 'planejada', rotulo: 'Planejada', cor: 'cinza' },
      { id: 'realizada', rotulo: 'Realizada', cor: 'azul' },
      { id: 'tratamento', rotulo: 'Achados em tratamento', cor: 'roxo' },
      { id: 'encerrado', rotulo: 'Encerrada', cor: 'verde', final: true },
    ],
    rotuloTitulo: 'Auditoria (ex.: Autoinspeção BPAD 2026)',
    rotuloData: 'Data',
    rotuloPrazo: 'Prazo para tratar os achados',
    campos: [
      { chave: 'tipoAuditoria', rotulo: 'Tipo', tipo: 'lista', opcoes: ['Interna (autoinspeção)', 'De cliente', 'ANVISA / Vigilância Sanitária', 'Em fornecedor', 'Certificadora', 'Outra'], obrigatorio: true, naLista: true },
      { chave: 'auditor', rotulo: 'Auditor / órgão / cliente', tipo: 'texto', naLista: true },
      { chave: 'escopo', rotulo: 'Escopo / setores auditados', tipo: 'paragrafo' },
      { chave: 'resultado', rotulo: 'Resultado', tipo: 'lista', opcoes: ['Sem achados', 'Com achados', 'Reprovado / interdição'], naLista: true },
      { chave: 'resumo', rotulo: 'Resumo / conclusão', tipo: 'paragrafo' },
    ],
    acoes: { titulo: 'Achados e ações', tipos: ['Achado crítico', 'Achado maior', 'Achado menor', 'Observação / melhoria'] },
  },
];

export const configQualidade = (tipo: string) => CONFIG_QUALIDADE.find((c) => c.tipo === tipo)!;

/** Categorias que o colaborador escolhe ao relatar pelo portal. */
export const CATEGORIAS_RELATO_PORTAL = CATEGORIAS_DESVIO;

export const COR_SELO: Record<StatusQualidade['cor'], string> = {
  ambar: 'bg-amber-50 text-[#92611F] border-amber-200',
  azul: 'bg-blue-50 text-blue-700 border-blue-200',
  roxo: 'bg-violet-50 text-violet-700 border-violet-200',
  verde: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cinza: 'bg-slate-100 text-slate-500 border-slate-200',
  vermelho: 'bg-rose-50 text-rose-700 border-rose-200',
};
