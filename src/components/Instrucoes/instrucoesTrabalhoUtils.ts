import type { ElementType } from 'react';
import { Plane, Truck, Users, Building2, FolderKanban, FileCheck2 } from 'lucide-react';
import {
  CategoriaInstrucaoTrabalho,
  GlobalModuleId,
  InstrucaoTrabalho,
  StatusInstrucaoTrabalho,
  ResponsabilidadeProcesso,
  LinhaSipoc,
  EtapaFluxoProcesso,
  IndicadorProcesso,
  RiscoControleProcesso,
  AcaoPlano5W2H,
  RevisaoHistorico,
} from '../../types';

export interface CategoriaInstrucaoConfig {
  id: CategoriaInstrucaoTrabalho;
  label: string;
  /** Prefixo usado na numeração automática do código (ex.: 'AER' → IT-AER-001). */
  prefixo: string;
  modulo: GlobalModuleId;
  icon: ElementType;
  color: string;
}

export const CATEGORIAS_INSTRUCAO: CategoriaInstrucaoConfig[] = [
  { id: 'Farma Aéreo', label: 'Farma Aéreo', prefixo: 'AER', modulo: 'farma_aereo', icon: Plane, color: 'text-sky-700 bg-sky-50 border-sky-200' },
  { id: 'Farma Rodoviário', label: 'Farma Rodoviário', prefixo: 'ROD', modulo: 'farma_rodoviario', icon: Truck, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'Departamento Pessoal', label: 'Departamento Pessoal', prefixo: 'DP', modulo: 'dp', icon: Users, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'Gestão de Clientes', label: 'Gestão de Clientes', prefixo: 'CLI', modulo: 'clientes', icon: Building2, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'Projetos Gerenciais', label: 'Projetos Gerenciais', prefixo: 'PROJ', modulo: 'projetos', icon: FolderKanban, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { id: 'Geral', label: 'Geral / Institucional', prefixo: 'GER', modulo: 'visao_geral', icon: FileCheck2, color: 'text-slate-700 bg-slate-100 border-slate-200' },
];

export function getCategoriaConfig(categoria: CategoriaInstrucaoTrabalho): CategoriaInstrucaoConfig {
  return CATEGORIAS_INSTRUCAO.find((c) => c.id === categoria) || CATEGORIAS_INSTRUCAO[CATEGORIAS_INSTRUCAO.length - 1];
}

export const STATUS_INSTRUCAO_CONFIG: Record<StatusInstrucaoTrabalho, { label: string; badge: string; dot: string }> = {
  Rascunho: { label: 'Rascunho', badge: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' },
  'Em Revisão': { label: 'Em Revisão', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  Vigente: { label: 'Vigente', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Obsoleta: { label: 'Obsoleta', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

/** Gera o próximo código sequencial dentro da categoria (ex.: existem IT-AER-001 e IT-AER-002 → devolve IT-AER-003). */
export function gerarProximoCodigo(categoria: CategoriaInstrucaoTrabalho, existentes: InstrucaoTrabalho[]): string {
  const prefixo = getCategoriaConfig(categoria).prefixo;
  const marcador = `IT-${prefixo}-`;
  const maiorNumero = existentes
    .filter((i) => i.codigo.startsWith(marcador))
    .map((i) => parseInt(i.codigo.slice(marcador.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${marcador}${String(maiorNumero + 1).padStart(3, '0')}`;
}

// ==========================================
// Etapas do formulário — cada uma é uma "página" do wizard, na mesma ordem do método
// interno "Passo a passo — estabelecer e revisar processos" (seção 12: Documentar o processo).
// ==========================================
export type EtapaFormularioId =
  | 'identificacao'
  | 'objetivo'
  | 'responsabilidades'
  | 'sipoc'
  | 'fluxo'
  | 'decisao'
  | 'indicadores'
  | 'riscos'
  | 'plano5w2h'
  | 'historico';

export interface EtapaFormularioConfig {
  id: EtapaFormularioId;
  numero: number;
  titulo: string;
  descricao: string;
  /** Nota explicando como preencher esta etapa — reaproveita o método interno "Passo a passo —
   *  estabelecer e revisar processos", para guiar quem nunca documentou um processo antes. */
  guia: string;
}

export const ETAPAS_FORMULARIO: EtapaFormularioConfig[] = [
  {
    id: 'identificacao',
    numero: 1,
    titulo: 'Identificação',
    descricao: 'Código, dono do processo, aprovação e vigência',
    guia:
      'Nomeie um "dono do processo": ele não precisa executar tudo, mas garante que o processo funcione, seja medido, revisado e melhorado (acompanha desempenho, valida treinamentos e responde por resultados). Preencha "Aprovado por" com quem validou esta versão e "Vigência a partir de" com a data em que ela passa a valer. Use "Status" para sinalizar se o documento ainda é rascunho, está em revisão, é a versão vigente ou já ficou obsoleta.',
  },
  {
    id: 'objetivo',
    numero: 2,
    titulo: 'Objetivo e Escopo',
    descricao: 'Por que este processo existe e até onde ele vai',
    guia:
      'No Objetivo, descreva o problema com fatos e exemplos reais — modelo: "O processo de [nome] apresenta [problema principal], causando [impactos como atrasos, retrabalho, custos ou reclamações]." Ou, se o processo já está definido, use: "Este procedimento tem como objetivo padronizar [...], garantindo [finalidade], com foco em [qualidade/prazo/segurança]." Um bom objetivo é SMART: específico, mensurável, alcançável, relevante e com prazo. Na Aplicação/Abrangência, responda: onde o processo começa e termina? Quais setores participam? O que fica de fora desta revisão? Em Definições, explique siglas e termos técnicos usados no documento.',
  },
  {
    id: 'responsabilidades',
    numero: 3,
    titulo: 'Responsabilidades',
    descricao: 'Quem responde por cada parte do processo',
    guia:
      'Liste quem realmente executa a atividade no dia a dia — não apenas a liderança. É quem conhece os atalhos, gargalos, falhas e exceções da rotina, então precisa participar da construção deste documento. Para cada responsável, descreva objetivamente o que ele responde por fazer (ex.: "Motorista — conferir carga e temperatura no ato da coleta").',
  },
  {
    id: 'sipoc',
    numero: 4,
    titulo: 'SIPOC',
    descricao: 'Fornecedores, Entradas, Processo, Saídas e Clientes',
    guia:
      'O SIPOC ajuda a enxergar o processo de ponta a ponta antes de detalhar o fluxo. Preencha: Fornecedores (quem entrega as entradas), Entradas (o que é necessário para iniciar — documentos, sistemas, solicitações), Processo (as macroetapas, em poucas palavras), Saídas (o que o processo entrega ao final) e Clientes (quem recebe ou depende desse resultado — pode ser um cliente externo ou outra área interna).',
  },
  {
    id: 'fluxo',
    numero: 5,
    titulo: 'Fluxo do Processo',
    descricao: 'Etapas em sequência, com responsável e documentos',
    guia:
      'Descreva as etapas em ordem, uma por linha, sempre começando com um verbo de ação (ex.: "Conferir", "Registrar", "Entregar"). Preencha o responsável por cada etapa, o que entra e o que sai dela, o sistema ou documento envolvido e observações relevantes (ex.: exceções, esperas, aprovações necessárias). Pense primeiro em como o processo funciona hoje de fato (AS-IS) e, se for uma revisão, ajuste para como ele deve funcionar depois de melhorado (TO-BE).',
  },
  {
    id: 'decisao',
    numero: 6,
    titulo: 'Decisão e Registros',
    descricao: 'Critérios de decisão e evidências geradas',
    guia:
      'Em Critérios de Decisão, registre as regras que definem qual caminho seguir nos pontos de decisão do fluxo (ex.: "carga com avaria aparente não é embarcada sem aprovação do supervisor"). Em Registros e Evidências, liste quais documentos, fotos, prints ou sistemas comprovam que cada etapa foi realmente executada — isso é o que sustenta uma auditoria ou investigação de ocorrência.',
  },
  {
    id: 'indicadores',
    numero: 7,
    titulo: 'Indicadores',
    descricao: 'Como o desempenho do processo é medido',
    guia:
      'Escolha poucos indicadores, mas que mostrem desempenho real — de tempo (lead time, prazo), qualidade (% de erros, retrabalho), produtividade (volume processado), custo (multas, horas extras) ou risco (avarias, desvios de temperatura). Para cada um, defina a fórmula de cálculo, a meta esperada, a frequência de acompanhamento (diária, semanal, mensal) e quem é o responsável por medir.',
  },
  {
    id: 'riscos',
    numero: 8,
    titulo: 'Riscos e Controles',
    descricao: 'O que pode dar errado e como é controlado',
    guia:
      'Procure especialmente: filas e esperas desnecessárias, retrabalho, dupla digitação, falhas de comunicação, excesso de aprovações, etapas sem responsável definido, informações combinadas só por WhatsApp sem registro, e decisões tomadas sem critério claro. Para cada risco identificado, descreva o controle adotado (ou a ser adotado) para reduzi-lo ou eliminá-lo.',
  },
  {
    id: 'plano5w2h',
    numero: 9,
    titulo: 'Plano de Ação (5W2H)',
    descricao: 'O que fazer para implantar ou melhorar o processo',
    guia:
      'Use esta etapa só quando houver melhorias pendentes de implantação (é normal ficar vazia em um processo já estável). Para cada ação: O quê será feito, Por quê (o motivo/benefício), Onde, Quando (prazo), Quem é o responsável, Como será executado e Custo/recurso necessário (tempo, dinheiro, pessoas).',
  },
  {
    id: 'historico',
    numero: 10,
    titulo: 'Histórico e Vínculo',
    descricao: 'Revisões do documento e registro operacional vinculado',
    guia:
      'Toda vez que este documento for revisado de forma relevante, registre uma nova linha no histórico: o número da revisão, a data, quem alterou e o que mudou — isso é o que comprova que o processo é revisado periodicamente (não só criado uma vez e esquecido). Se esta instrução for específica de um cliente, embarque ou viagem, use "Vincular a um registro da operação" para linkar diretamente ao registro correspondente.',
  },
];

// ==========================================
// Fábricas de linha vazia para cada tabela do formulário — usadas tanto pelo botão
// "Adicionar linha" quanto pelos modelos prontos abaixo.
// ==========================================
function gerarId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function novaResponsabilidade(responsavel = '', responsabilidade = ''): ResponsabilidadeProcesso {
  return { id: gerarId('resp'), responsavel, responsabilidade };
}

export function novaLinhaSipoc(): LinhaSipoc {
  return { id: gerarId('sipoc'), fornecedores: '', entradas: '', processo: '', saidas: '', clientes: '' };
}

export function novaEtapaFluxo(ordem: number, etapa = ''): EtapaFluxoProcesso {
  return { id: gerarId('fluxo'), ordem, etapa, responsavel: '', entrada: '', saida: '', sistemaDocumento: '', observacao: '' };
}

export function novoIndicador(): IndicadorProcesso {
  return { id: gerarId('ind'), indicador: '', formula: '', meta: '', frequencia: '', responsavel: '' };
}

export function novoRiscoControle(risco = '', controle = ''): RiscoControleProcesso {
  return { id: gerarId('risco'), risco, controle };
}

export function novaAcao5W2H(): AcaoPlano5W2H {
  return { id: gerarId('5w2h'), oQue: '', porQue: '', onde: '', quando: '', quem: '', como: '', custoRecurso: '' };
}

export function novaRevisao(revisao = '1'): RevisaoHistorico {
  return { id: gerarId('rev'), revisao, data: '', alteradoPor: '', descricao: '' };
}

export function criarInstrucaoVazia(
  categoria: CategoriaInstrucaoTrabalho,
  existentes: InstrucaoTrabalho[],
  autor?: string,
  preenchimento?: Partial<InstrucaoTrabalho>
): InstrucaoTrabalho {
  const now = new Date().toISOString();
  return {
    id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    codigo: gerarProximoCodigo(categoria, existentes),
    titulo: '',
    categoria,
    status: 'Rascunho',
    versao: 1,
    responsavel: autor,
    responsabilidades: [novaResponsabilidade()],
    sipoc: [novaLinhaSipoc()],
    fluxoProcesso: [novaEtapaFluxo(1)],
    indicadores: [novoIndicador()],
    riscosControles: [novoRiscoControle()],
    planoAcao5W2H: [novaAcao5W2H()],
    historicoRevisoes: [novaRevisao()],
    favorito: false,
    arquivada: false,
    autor,
    criadoEm: now,
    atualizadoEm: now,
    ...preenchimento,
  };
}

// ==========================================
// Modelos prontos — em vez de gerar "blocos" de texto, pré-preenchem os campos e tabelas
// do formulário (objetivo, fluxo do processo, responsabilidades...), ponto de partida
// rápido em vez de formulário em branco. "Em Branco" é sempre oferecido pela tela.
// ==========================================
interface TemplateInstrucao {
  id: string;
  nome: string;
  descricao: string;
  gerarPreenchimento: () => Partial<InstrucaoTrabalho>;
}

const TEMPLATES_POR_CATEGORIA: Record<CategoriaInstrucaoTrabalho, TemplateInstrucao[]> = {
  'Farma Aéreo': [
    {
      id: 'aer-coleta',
      nome: 'Coleta e Conferência de AWB',
      descricao: 'Fluxo de conferência antes, durante e depois da coleta até a entrega na TECA.',
      gerarPreenchimento: () => ({
        objetivo: 'Padronizar a coleta e a conferência do AWB antes do embarque, evitando divergências de peso, temperatura e documentação na TECA.',
        aplicacaoAbrangencia: 'Aplica-se à equipe de coleta do Farma Aéreo, do momento da coleta no remetente até a entrega na TECA do aeroporto.',
        fluxoProcesso: [
          novaEtapaFluxo(1, 'Conferir AWB, Nota Fiscal e CT-e do remetente'),
          novaEtapaFluxo(2, 'Verificar faixa de temperatura exigida pelo cliente'),
          novaEtapaFluxo(3, 'Registrar peso e volumes coletados'),
          novaEtapaFluxo(4, 'Entregar carga na TECA e registrar embarque no sistema'),
        ],
      }),
    },
    {
      id: 'aer-ocorrencia',
      nome: 'Registro de Ocorrência (Atraso/Avaria)',
      descricao: 'Como registrar, comunicar e tratar uma ocorrência operacional no Farma Aéreo.',
      gerarPreenchimento: () => ({
        objetivo: 'Padronizar o registro e a comunicação de ocorrências (atrasos, avarias) no Farma Aéreo.',
        fluxoProcesso: [
          novaEtapaFluxo(1, 'Identificar e registrar horário, AWB e natureza da ocorrência'),
          novaEtapaFluxo(2, 'Avisar o supervisor responsável em até 30 minutos'),
          novaEtapaFluxo(3, 'Registrar a ocorrência no sistema JMT'),
          novaEtapaFluxo(4, 'Definir plano de ação com o cliente e encerrar a ocorrência'),
        ],
      }),
    },
  ],
  'Farma Rodoviário': [
    {
      id: 'rod-pre-viagem',
      nome: 'Checklist de Pré-Viagem (Cadeia Fria)',
      descricao: 'Verificação de veículo, baú refrigerado e documentação antes da saída.',
      gerarPreenchimento: () => ({
        objetivo: 'Garantir que veículo, baú refrigerado e documentação estejam aptos antes da saída, evitando ocorrências térmicas em rota.',
        fluxoProcesso: [
          novaEtapaFluxo(1, 'Pré-climatizar o baú na faixa de temperatura da carga'),
          novaEtapaFluxo(2, 'Conferir termógrafo/registrador de temperatura'),
          novaEtapaFluxo(3, 'Conferir MDF-e, CT-e e Notas Fiscais da rota'),
          novaEtapaFluxo(4, 'Validar sequência de entregas e janelas de descarga'),
        ],
      }),
    },
    {
      id: 'rod-descarga',
      nome: 'Conferência de Descarga no Cliente',
      descricao: 'Passos de conferência de temperatura, volumes e assinatura no momento da entrega.',
      gerarPreenchimento: () => ({
        objetivo: 'Assegurar a rastreabilidade da entrega e da cadeia de frio no destino.',
        fluxoProcesso: [
          novaEtapaFluxo(1, 'Registrar temperatura interna do baú antes de abrir'),
          novaEtapaFluxo(2, 'Conferir volumes entregues x Nota Fiscal'),
          novaEtapaFluxo(3, 'Coletar assinatura/carimbo do recebedor'),
        ],
      }),
    },
  ],
  'Departamento Pessoal': [
    {
      id: 'dp-admissao',
      nome: 'Admissão de Colaborador',
      descricao: 'Passos de documentação, EPI e treinamento inicial na admissão.',
      gerarPreenchimento: () => ({
        objetivo: 'Padronizar a admissão de novos colaboradores.',
        fluxoProcesso: [
          novaEtapaFluxo(1, 'Coletar documentos pessoais e ASO admissional'),
          novaEtapaFluxo(2, 'Apresentar Norteadores Estratégicos JMT'),
          novaEtapaFluxo(3, 'Entregar EPIs e registrar recebimento'),
        ],
      }),
    },
  ],
  'Gestão de Clientes': [
    {
      id: 'cli-onboarding',
      nome: 'Onboarding de Novo Cliente',
      descricao: 'Passos para cadastro, tarifário e alinhamento operacional de um novo cliente.',
      gerarPreenchimento: () => ({
        objetivo: 'Padronizar a implantação operacional de um novo cliente.',
        fluxoProcesso: [
          novaEtapaFluxo(1, 'Cadastrar cliente com CNPJ, contatos e endereço'),
          novaEtapaFluxo(2, 'Registrar tabela de frete/tarifário acordado'),
          novaEtapaFluxo(3, 'Definir praças atendidas e prazos de entrega'),
        ],
      }),
    },
  ],
  'Projetos Gerenciais': [
    {
      id: 'proj-abertura',
      nome: 'Abertura de Novo Projeto/Iniciativa',
      descricao: 'Passos para estruturar objetivo, escopo e responsáveis de um novo projeto.',
      gerarPreenchimento: () => ({
        objetivo: 'Padronizar a abertura de projetos e iniciativas estratégicas.',
        fluxoProcesso: [
          novaEtapaFluxo(1, 'Definir objetivo e resultado esperado'),
          novaEtapaFluxo(2, 'Definir responsável e prazo'),
        ],
      }),
    },
  ],
  Geral: [],
};

// Modelo universal — réplica direta da checklist de 21 pontos do método interno "Passo a
// passo — estabelecer e revisar processos", disponível em todas as categorias.
const TEMPLATE_CHECKLIST_REVISAO: TemplateInstrucao = {
  id: 'universal-checklist-revisao',
  nome: 'Checklist de Revisão de Processo (método interno)',
  descricao: 'Os 21 pontos de verificação do método interno antes de considerar um processo revisado.',
  gerarPreenchimento: () => ({
    objetivo: 'Verificar, antes de considerar um processo revisado, se todas as etapas do método interno foram cumpridas.',
    responsabilidades: [
      novaResponsabilidade('Dono do processo', 'Conduzir e validar cada etapa da revisão'),
      novaResponsabilidade('Equipe executora', 'Participar do levantamento AS-IS e validar o TO-BE'),
    ],
    riscosControles: [
      novoRiscoControle('Processo revisado sem quem executa participar', 'Sempre incluir a equipe operacional na análise'),
      novoRiscoControle('Processo sem dono definido', 'Exigir dono do processo antes de aprovar a revisão'),
    ],
    registrosEvidencias:
      'O problema foi descrito com fatos? O objetivo SMART foi definido? O escopo está claro? O AS-IS foi levantado? O SIPOC foi feito? O fluxo atual foi desenhado? Gargalos e retrabalhos foram analisados? O TO-BE foi desenhado? O plano 5W2H foi criado? O processo foi aprovado e a equipe treinada, com evidências? Os indicadores estão sendo acompanhados? Existe data para a próxima revisão?',
  }),
};

export const TEMPLATES_INSTRUCAO: Record<CategoriaInstrucaoTrabalho, TemplateInstrucao[]> = Object.fromEntries(
  CATEGORIAS_INSTRUCAO.map((c) => [c.id, [...TEMPLATES_POR_CATEGORIA[c.id], TEMPLATE_CHECKLIST_REVISAO]])
) as Record<CategoriaInstrucaoTrabalho, TemplateInstrucao[]>;
