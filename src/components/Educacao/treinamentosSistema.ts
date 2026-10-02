// ============================================================================
// Pacote "Treinamentos do sistema" (pedido de 2026-10-02): um treinamento por
// módulo corporativo do JMT, para os supervisores — sem prova, só leitura +
// assinatura de ciência no Portal de Educação. O conteúdo vem do manual do
// sistema (src/data/manualSistema.ts), mais um exercício prático por módulo,
// então ajuda (F1) e treinamento dizem sempre a mesma coisa.
// ============================================================================

import { topicoDaSecao } from '../../data/manualSistema';
import type { ConteudoTreinamento, Treinamento } from '../../utils/educacaoApi';
import { gerarIdCurto } from '../../utils/educacaoApi';

interface ModuloTreinamento {
  /** id do tópico no manual (= tela do sistema) */
  secao: string;
  titulo: string;
  porQue: string;
  pratica: string[];
  cargaHorariaMin: number;
}

/** Prefixo comum — também serve para reconhecer os que já foram criados. */
export const PREFIXO_TREINAMENTO_SISTEMA = 'Sistema JMT — ';

export const MODULOS_CORPORATIVOS: ModuloTreinamento[] = [
  {
    secao: 'comunicados',
    titulo: 'Comunicados',
    porQue: 'Todo aviso para a equipe ou para os clientes sai pelo sistema, no padrão JMT. Assim ninguém manda mensagem solta com informação diferente, e fica registrado quem recebeu e quem confirmou a leitura.',
    pratica: [
      'Abra o módulo Comunicados e clique em "Novo comunicado".',
      'Escolha Colaboradores e a categoria Aviso. Preencha os pontos-chave de um aviso de teste (ex.: mudança de horário).',
      'Confira o "Texto que será enviado" e a prévia da imagem. Troque a categoria para Evento e veja como os campos mudam.',
      'Feche sem criar — o objetivo é conhecer a tela. Quando for de verdade, peça ciência e acompanhe quem confirmou.',
    ],
    cargaHorariaMin: 20,
  },
  {
    secao: 'compras',
    titulo: 'Compras',
    porQue: 'Toda compra passa por uma solicitação com justificativa e aprovação. Isso evita compra em duplicidade, gasto fora do orçamento e falta de material por pedido esquecido.',
    pratica: [
      'Abra o módulo Compras e clique em "Nova Solicitação".',
      'Veja os campos: itens, quantidade, valor estimado, urgência, justificativa e anexo do orçamento.',
      'Localize o botão "Link Público" — é ele que você passa para quem da sua equipe não tem login.',
      'Use "Baixar PDF" para ver como a lista sai no padrão JMT.',
    ],
    cargaHorariaMin: 15,
  },
  {
    secao: 'instrucoes',
    titulo: 'Instruções de Trabalho',
    porQue: 'As Instruções de Trabalho (IT) são o jeito certo de fazer cada processo. O supervisor é quem garante que a equipe conhece e segue as ITs vigentes — e elas aparecem no Portal de Educação para os colaboradores.',
    pratica: [
      'Abra o módulo Instruções de Trabalho e procure uma instrução da sua operação pela busca.',
      'Leia o objetivo, as responsabilidades e o fluxo do processo.',
      'Veja o status: só as "Vigentes" valem e aparecem para os colaboradores.',
      'Se uma IT estiver desatualizada em relação ao que a equipe faz, avise o responsável pela instrução.',
    ],
    cargaHorariaMin: 20,
  },
  {
    secao: 'documentos',
    titulo: 'Padronização de Documentos',
    porQue: 'Todo documento da empresa (procedimento, relatório, formulário, política) deve sair na identidade JMT, com código, versão e aprovação. O módulo lê o arquivo que você já tem e refaz no padrão.',
    pratica: [
      'Abra o módulo Padronização de Documentos e clique em "Importar arquivo".',
      'Escolha um documento em Word ou PDF que a sua equipe usa.',
      'No editor, veja o "Crivo do padrão JMT" na coluna da esquerda e use "Corrigir automaticamente".',
      'Baixe em PDF para ver o resultado. Para valer como oficial, o documento precisa ser publicado com aprovação.',
    ],
    cargaHorariaMin: 25,
  },
  {
    secao: 'chat',
    titulo: 'Chat interno',
    porQue: 'Assuntos de trabalho entre quem usa o sistema ficam no chat interno, junto do resto da informação da empresa — e não espalhados em conversas pessoais.',
    pratica: [
      'Abra o Chat e procure a conversa com o Departamento Pessoal ou com outro supervisor.',
      'Envie uma mensagem curta de teste.',
      'Veja como anexar uma imagem ou PDF pelo clipe.',
    ],
    cargaHorariaMin: 10,
  },
  {
    secao: 'notas',
    titulo: 'Notas & Ideias',
    porQue: 'Anotações de reunião, ideias de melhoria e rascunhos ficam organizados em páginas, que podem ser compartilhadas por link quando preciso.',
    pratica: [
      'Abra Notas & Ideias e crie uma "Nova Página" com o nome da sua equipe.',
      'Crie uma sub-página para anotações de reunião.',
      'Veja como compartilhar uma página por link (somente leitura).',
    ],
    cargaHorariaMin: 10,
  },
];

const CUIDADOS_GERAIS = [
  'Use o botão "?" (ou F1) em qualquer tela para abrir a ajuda daquela tela; lá também tem o tour guiado.',
  'Você só vê os módulos liberados para o seu login. Se faltar algum que você precisa, peça ao administrador em Logins & Acessos.',
  'Não compartilhe prints ou arquivos com dados pessoais (CPF, salário, saúde) fora do sistema — LGPD.',
];

/** Monta o treinamento de um módulo (ainda sem id — o banco gera ao salvar). */
export function montarTreinamentoSistema(m: ModuloTreinamento, opcoes: { cargos: string[]; prazoDias?: number; criadoPor?: string }): Treinamento {
  const topico = topicoDaSecao(m.secao);
  const conteudos: ConteudoTreinamento[] = [
    { id: gerarIdCurto('cont'), tipo: 'texto', titulo: `Para que serve o módulo ${m.titulo}`, texto: `${topico?.resumo || ''}\n\n${m.porQue}`.trim() },
    {
      id: gerarIdCurto('cont'),
      tipo: 'texto',
      titulo: 'Passo a passo',
      texto: (topico?.passos || []).map((p, i) => `${i + 1}. ${p.titulo}\n${p.texto}`).join('\n\n'),
    },
    {
      id: gerarIdCurto('cont'),
      tipo: 'texto',
      titulo: 'Dicas e cuidados',
      texto: [...(topico?.dicas || []), ...CUIDADOS_GERAIS].map((d) => `• ${d}`).join('\n'),
    },
    {
      id: gerarIdCurto('cont'),
      tipo: 'texto',
      titulo: 'Pratique no sistema',
      texto: `Com o sistema aberto no computador ou no celular:\n\n${m.pratica.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nDica: abra a tela e use o botão "?" → "Fazer o tour desta tela".`,
    },
  ];
  return {
    id: '',
    titulo: `${PREFIXO_TREINAMENTO_SISTEMA}${m.titulo}`,
    descricao: `Treinamento de uso do módulo ${m.titulo} do sistema JMT Gestão Integrada, para supervisores.`,
    cargaHorariaMin: m.cargaHorariaMin,
    conteudos,
    prova: undefined,
    obrigatorioTodos: false,
    obrigatorioCargos: opcoes.cargos,
    obrigatorioSetores: [],
    validadeMeses: undefined,
    prazoDias: opcoes.prazoDias,
    ativo: true,
    criadoPor: opcoes.criadoPor,
  };
}
