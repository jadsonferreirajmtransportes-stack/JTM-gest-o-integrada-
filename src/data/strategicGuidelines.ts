/**
 * Norteadores Estratégicos Institucionais — JMT
 * Jobson de Moraes Transportes Ltda
 * 
 * Documento oficial de consolidação dos pilares estratégicos que orientam as decisões,
 * a cultura e o posicionamento da JMT no mercado de logística de produtos para a saúde.
 */

export interface ValorEstrategico {
  nome: string;
  descricao: string;
  icone?: string;
}

export interface PilarOperacional {
  nome: string;
  descricao: string;
}

export const STRATEGIC_GUIDELINES = {
  empresa: 'Jobson de Moraes Transportes Ltda',
  sigla: 'JMT',
  dataDocumento: '04/09/2026',
  
  // Assinatura Institucional Oficial
  assinatura: 'JOBSON DE MORAES TRANSPORTES | Segurança, Rastreabilidade e Pontualidade na Logística da Saúde',
  sloganCurto: 'Segurança, Rastreabilidade e Pontualidade na Logística da Saúde',

  // Propósito: Por que existimos
  proposito: {
    titulo: 'Propósito',
    subtitulo: 'Por que existimos',
    frase: 'Levar saúde com segurança, do remetente ao destino final.',
  },

  // Missão: O que fazemos, hoje
  missao: {
    titulo: 'Missão',
    subtitulo: 'O que fazemos, hoje',
    frase: 'Entregar soluções de logística para produtos de saúde, garantindo segurança, conformidade, rastreabilidade e pontualidade, com processos padronizados e gestão por indicadores.',
  },

  // Visão: Onde queremos chegar
  visao: {
    titulo: 'Visão',
    subtitulo: 'Onde queremos chegar',
    frase: 'Ser reconhecida pela excelência em logística de produtos para a saúde, garantindo entregas seguras, rastreáveis e pontuais onde quer que atuemos.',
  },

  // Valores
  valores: [
    {
      nome: 'Ética e transparência',
      descricao: 'Conduta íntegra em todas as relações — com clientes, colaboradores e parceiros.',
    },
    {
      nome: 'Qualidade e segurança',
      descricao: 'Rigor operacional e conformidade regulatória em cada etapa da cadeia logística.',
    },
    {
      nome: 'Foco no cliente',
      descricao: 'Soluções desenhadas a partir da necessidade real de quem confia sua carga à JMT.',
    },
    {
      nome: 'Comunicação e respeito',
      descricao: 'Relações claras, diretas e respeitosas em todos os níveis da organização.',
    },
    {
      nome: 'Autonomia com responsabilidade',
      descricao: 'Liberdade para decidir e agir, com responsabilidade pelo resultado.',
    },
    {
      nome: 'Melhoria contínua e inovação',
      descricao: 'Evolução constante de processos, tecnologia e padrões de atendimento.',
    },
  ] as ValorEstrategico[],

  // 4 Pilares Operacionais
  pilaresOperacionais: [
    { nome: 'Segurança', descricao: 'Proteção da integridade de cargas farmacêuticas e pessoas.' },
    { nome: 'Rastreabilidade', descricao: 'Visibilidade de temperatura e localização de ponta a ponta.' },
    { nome: 'Pontualidade', descricao: 'Compromisso com prazos críticos em saídas e entregas.' },
    { nome: 'Conformidade ANVISA/BPAD', descricao: 'Rigor regulatório de acordo com a RDC 430/2020 e Boas Práticas.' },
  ] as PilarOperacional[],

  // Identidade de Comunicação
  personalidade: 'Sóbria, técnica e acolhedora — sem ruído visual.',
  tomDeVoz: 'Executivo, direto e objetivo — fundamentado em dados e conformidade regulatória.',

  // Diretriz Estratégica
  diretriz: 'Estes norteadores devem orientar toda comunicação institucional, material comercial, onboarding de colaboradores e decisões estratégicas da JMT, mantendo coerência entre discurso e prática operacional.',
};
