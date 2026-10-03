// ============================================================================
// Pacote "Treinamentos do sistema" (pedido de 2026-10-02): um treinamento por
// módulo corporativo do JMT, para os supervisores — sem prova, só leitura +
// assinatura de ciência no Portal de Educação. O conteúdo vem do manual do
// sistema (src/data/manualSistema.ts), mais um exercício prático por módulo,
// então ajuda (F1) e treinamento dizem sempre a mesma coisa.
// ============================================================================

import { topicoDaSecao } from '../../data/manualSistema';
import { telasDaSecao } from '../../data/telasTreinamento';
import type { ConteudoTreinamento, Treinamento } from '../../utils/educacaoApi';
import { gerarIdCurto } from '../../utils/educacaoApi';

export type GrupoTreinamentoSistema = 'Começando' | 'Corporativo' | 'Rotina do supervisor' | 'Departamento Pessoal' | 'Gestão e Operações' | 'Administração';

export const GRUPOS_TREINAMENTO_SISTEMA: { grupo: GrupoTreinamentoSistema; publico: string }[] = [
  { grupo: 'Começando', publico: 'Todos que usam o sistema' },
  { grupo: 'Corporativo', publico: 'Supervisores e lideranças' },
  { grupo: 'Rotina do supervisor', publico: 'Supervisores de equipe' },
  { grupo: 'Departamento Pessoal', publico: 'Equipe do DP / RH' },
  { grupo: 'Gestão e Operações', publico: 'Gestores, comercial e operação' },
  { grupo: 'Administração', publico: 'Administradores do sistema' },
];

export interface ModuloTreinamento {
  grupo: GrupoTreinamentoSistema;
  /** id do tópico no manual (= tela do sistema) */
  secao: string;
  /** Outras telas cujas imagens também entram (ex.: Supervisores usa a tela de Cargos). */
  telasExtras?: string[];
  titulo: string;
  porQue: string;
  pratica: string[];
  cargaHorariaMin: number;
}

/** Prefixo comum — também serve para reconhecer os que já foram criados. */
export const PREFIXO_TREINAMENTO_SISTEMA = 'Sistema JMT — ';

export const MODULOS_CORPORATIVOS: ModuloTreinamento[] = [
  {
    grupo: 'Corporativo',
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
    grupo: 'Corporativo',
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
    grupo: 'Corporativo',
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
    grupo: 'Corporativo',
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
    grupo: 'Corporativo',
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
    grupo: 'Corporativo',
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

const mod = (grupo: GrupoTreinamentoSistema, secao: string, titulo: string, cargaHorariaMin: number, porQue: string, pratica: string[], telasExtras?: string[]): ModuloTreinamento =>
  ({ grupo, secao, titulo, cargaHorariaMin, porQue, pratica, telasExtras });

/** Demais módulos e funções do sistema (pedido de 2026-10-03). */
export const MODULOS_DEMAIS: ModuloTreinamento[] = [
  // ------------------------------------------------------------ Começando
  mod('Começando', 'primeiros_passos', 'Primeiros passos no sistema', 15,
    'Antes de qualquer módulo: como entrar, navegar pelo menu, encontrar a ajuda e cuidar do seu acesso. Seu login é pessoal — tudo o que é feito nele fica registrado no seu nome.',
    ['Entre no sistema com o seu login.', 'Abra o menu e veja quais módulos estão liberados para você.', 'Em qualquer tela, aperte F1 (ou o "?") e abra a ajuda daquela tela.', 'Faça o tour guiado de uma tela que você usa todo dia.']),

  mod('Corporativo', 'jornal', 'Jornal JMT', 15,
    'O Jornal JMT conta para todos os colaboradores o que acontece na empresa: conquistas, equipe, segurança, eventos. O supervisor é quem mais vê essas histórias no dia a dia — e pode sugerir notícias, que o administrador revisa e publica.',
    ['Abra o módulo Jornal JMT e leia uma notícia publicada.', 'Clique em "Sugerir notícia", escreva um rascunho curto e use "Ver como fica".', 'Salve como rascunho (ou exclua) — quando for de verdade, use "Enviar para aprovação".', 'Lembre: foto de pessoa só com autorização, e sem documentos ou dados de clientes à mostra.']),

  // ------------------------------------------------- Rotina do supervisor
  mod('Rotina do supervisor', 'frequencia', 'Controle de Frequência (ponto pelo celular)', 25,
    'A frequência da equipe é acompanhada todo dia: quem bateu, quem faltou, quem atrasou. Ajustes e justificativas ficam registrados com motivo e autor — nada é apagado — e o espelho do mês vai para o colaborador assinar.',
    ['Abra Controle de Frequência na aba "Hoje" e veja quem ainda não bateu o ponto.', 'Vá em "Espelho do colaborador", escolha uma pessoa da sua equipe e confira o mês.', 'Veja onde ficam "Incluir batida (ajuste)" e "Justificar o dia" (não salve nada de teste).', 'Abra "Resumo do mês" e baixe o resumo em PDF ou Excel.']),
  mod('Rotina do supervisor', 'ocorrencias', 'Ocorrências (faltas, atrasos e atestados)', 20,
    'Toda falta, atraso, atestado ou afastamento precisa estar registrado, com comprovante quando houver. É isso que garante o desconto certo no vale-alimentação, a folha correta e o histórico do colaborador.',
    ['Abra Ocorrências e use a busca para encontrar um colaborador da sua equipe.', 'Clique em "Nova Ocorrência" e veja os campos (tipo, data, descrição e anexo). Feche sem salvar.', 'Copie o link do "Formulário de Campo dos Supervisores" e guarde no seu celular.']),
  mod('Rotina do supervisor', 'disciplinar', 'Medidas disciplinares', 25,
    'As medidas seguem a escada do Regulamento Interno (orientação, advertências e suspensões de 1, 3 e 5 dias), considerando a reincidência dos últimos 12 meses. O supervisor propõe, o administrador aprova e o colaborador assina a ciência — ou a recusa é registrada com duas testemunhas.',
    ['Abra Disciplinar e veja a "Progressão por colaborador".', 'Clique em "Nova medida", escolha um colaborador e veja qual etapa o sistema sugere. Feche sem registrar.', 'Releia: a descrição do fato deve ser objetiva — data, local, o que aconteceu — sem opiniões.']),
  mod('Rotina do supervisor', 'epis', 'Entrega de EPI', 15,
    'Toda entrega de EPI é registrada com item, tamanho, CA e assinatura do colaborador. A ficha de EPI comprova a entrega em auditoria e em processo trabalhista.',
    ['Abra Entrega de EPI e procure a ficha de um colaborador da sua equipe.', 'Clique em "Nova Entrega" e veja os campos. Feche sem salvar.', 'Copie o link do formulário público de entrega para usar em campo.']),

  // ------------------------------------------------- Departamento Pessoal
  mod('Departamento Pessoal', 'dashboard', 'Painel DP & Indicadores', 15,
    'O painel mostra num lugar só o que precisa de atenção no DP: alertas de documentos e ASO, admissões em andamento e atalhos para as tarefas mais comuns.',
    ['Abra o Painel DP e leia os alertas de documentação.', 'Use "Ver todos os alertas" e veja o que vence nos próximos dias.', 'Localize o atalho para gerar o link de admissão.']),
  mod('Departamento Pessoal', 'colaboradores', 'Cadastro de Colaboradores', 30,
    'O cadastro é a base de tudo: folha, férias, ASO, EPI, vale e frequência saem dele. Dados completos e atualizados evitam erro em todos os outros módulos.',
    ['Abra Colaboradores e busque uma pessoa pelo nome.', 'Abra a ficha cadastral completa (ícone do olho) e veja as abas.', 'Filtre por status e por empresa e exporte a lista em Excel.', 'Veja onde ficam "Programar Férias", "Registrar Ocorrência" e "Inativar / Registrar Demissão" na linha do colaborador.']),
  mod('Departamento Pessoal', 'preadmissoes', 'Pré-Admissões pelo link', 20,
    'O candidato preenche os próprios dados e envia os documentos pelo celular. O DP só confere e efetiva — sem redigitar nada.',
    ['Abra Pré-Admissões e clique em "Gerar / Enviar Link de Admissão".', 'Abra a ficha de uma pré-admissão pendente e confira os documentos.', 'Veja o que é pedido em "Efetivar Admissão" (cargo, salário, empresa). Não efetive um teste.']),
  mod('Departamento Pessoal', 'onboarding', 'Onboarding & Checklist de Admissão', 10,
    'O checklist garante que nenhum passo da integração fica para trás: documentos, ASO, uniforme, EPI, treinamentos e apresentação dos norteadores da JMT.',
    ['Abra Onboarding e busque um colaborador recém-admitido.', 'Veja as etapas do checklist e como marcar as concluídas.', 'Abra "Ver Norteadores Completos".']),
  mod('Departamento Pessoal', 'custos', 'Custo Mensal por Colaborador', 15,
    'Mostra quanto cada pessoa custa de verdade para a empresa: salário, encargos, provisões de férias e 13º e benefícios, conforme a CCT.',
    ['Abra Custo Mensal e filtre por empresa.', 'Busque um cargo e compare o custo total com o salário base.', 'Exporte a planilha em Excel.']),
  mod('Departamento Pessoal', 'vale_alimentacao', 'Benefícios e Vale-Alimentação', 20,
    'O vale-alimentação é calculado por quinzena a partir dos dias úteis, descontando faltas, férias e suspensões registradas. Lançamento certo depende das ocorrências em dia.',
    ['Abra Programação do Vale-Alimentação e escolha a quinzena vigente.', 'Use "Sincronizar faltas, férias & valores" e veja as diárias de cada um.', 'Veja como avisar o colaborador do valor pelo WhatsApp ou e-mail.'], ['beneficios']),
  mod('Departamento Pessoal', 'ferias', 'Férias & Ausências CLT', 20,
    'As férias precisam ser programadas dentro do prazo legal, com aviso e recibo assinados. O sistema mostra o prazo limite de cada um e envia os documentos para assinatura pelo celular.',
    ['Abra Férias e veja a coluna "Prazo Limite Gozo (CLT)".', 'Clique em "Programar Férias" e veja os campos. Feche sem salvar.', 'Veja onde enviar o aviso e o recibo para assinatura.', 'Gere o "Relatório PDF por Período" do mês que vem.']),
  mod('Departamento Pessoal', 'saude', 'Exames ASO (RDC 430)', 15,
    'ASO vencido é falha de auditoria da ANVISA e risco trabalhista. O controle mostra quem está vencido, quem vence em 30 dias e guarda o atestado digitalizado.',
    ['Abra Exames ASO e filtre pelos vencidos e a vencer.', 'Veja onde fica "Renovar ASO".', 'Exporte o relatório para a ANVISA.']),
  mod('Departamento Pessoal', 'contracheques', 'Contracheques com assinatura', 20,
    'O PDF da folha é importado uma vez só: o sistema separa por colaborador, envia o link pelo WhatsApp e o colaborador assina pelo celular com o CPF. O comprovante de assinatura fica guardado.',
    ['Abra Contracheques e escolha uma competência.', 'Veja quem já visualizou e quem já assinou.', 'Veja onde ficam "Importar Contracheques" e "Enviar por WhatsApp".', 'Baixe um contracheque com a página de comprovante.']),
  mod('Departamento Pessoal', 'educacao', 'Portal de Educação', 20,
    'Treinamentos, Instruções de Trabalho e o Regulamento Interno chegam ao colaborador pelo portal, com prova quando preciso e certificado. O DP acompanha quem fez e quem está atrasado.',
    ['Abra Portal de Educação e veja a aba "Acompanhamento".', 'Abra "Importar documento" e veja como um PDF vira treinamento (não salve).', 'Veja como atribuir um treinamento a uma pessoa.']),
  mod('Departamento Pessoal', 'aniversariantes', 'Aniversariantes do Mês', 5,
    'Valorizar as pessoas faz parte da cultura JMT. O mural do mês sai pronto para o quadro de avisos.',
    ['Abra Aniversariantes e veja os destaques dos próximos 7 dias.', 'Imprima o mural do mês.']),
  mod('Departamento Pessoal', 'arquivo', 'Arquivo de Desligados', 10,
    'Quem saiu da empresa não some do sistema: a ficha, o histórico e o motivo do desligamento ficam guardados, como exige a lei.',
    ['Abra Arquivo / Demitidos e busque um ex-colaborador.', 'Abra a ficha e veja o motivo do desligamento.']),
  mod('Departamento Pessoal', 'cargos', 'Cargos, Supervisores e Cadastros de Apoio', 15,
    'Cargos com piso da CCT, supervisores com seus setores, empregadores e feriados: são os cadastros que alimentam o resto do DP.',
    ['Abra Cargos e Salários e confira o piso de um cargo.', 'Veja a aba de Supervisores e os setores de cada um.', 'Veja o calendário de feriados.'], ['supervisores']),

  // --------------------------------------------------- Gestão e Operações
  mod('Gestão e Operações', 'visao_geral', 'Visão Geral', 10,
    'O painel de entrada da gestão: números principais, agenda do dia e atalhos para as tarefas mais comuns.',
    ['Abra a Visão Geral e veja a agenda do dia.', 'Use um atalho (ex.: novo cliente) e feche sem salvar.']),
  mod('Gestão e Operações', 'clientes', 'Carteira de Clientes', 20,
    'Cada cliente tem um cadastro só, com contatos, faixa de temperatura, modelo de frete e histórico. É de lá que saem faturamento, operação e comunicados para clientes.',
    ['Abra Carteira de Clientes e busque um cliente.', 'Filtre por status e por temperatura.', 'Abra a edição de um cliente e veja as abas. Feche sem salvar.']),
  mod('Gestão e Operações', 'farma_aereo', 'Operação Farma Aéreo', 20,
    'A operação aérea tem clientes, equipe, faturamento e custos próprios. Lançar tudo no setor mostra o resultado real (DRE) da operação.',
    ['Abra Farma Aéreo e veja a Visão Geral & DRE.', 'Veja as abas de Faturamento, Controle Financeiro e Custos Operacionais.']),
  mod('Gestão e Operações', 'farma_rodoviario', 'Operação Farma Rodoviário', 20,
    'A operação rodoviária tem clientes, equipe, faturamento e custos próprios. Lançar tudo no setor mostra o resultado real (DRE) da operação.',
    ['Abra Farma Rodoviário e veja a Visão Geral & DRE.', 'Veja as abas de Faturamento, Controle Financeiro e Custos Operacionais.']),
  mod('Gestão e Operações', 'projetos', 'Projetos & OKRs', 20,
    'Projetos com objetivo, responsável, prazo, ações e riscos. O acompanhamento fica num lugar só e o resumo vai para a equipe por WhatsApp ou e-mail.',
    ['Abra Projetos e veja o portfólio.', 'Abra o Quadro de Ações (Kanban) de um projeto.', 'Veja a Matriz de Riscos.']),
  mod('Gestão e Operações', 'agenda_gestao', 'Agenda da Gestão', 10,
    'Reuniões, auditorias, prazos legais e visitas ficam numa agenda compartilhada da gestão.',
    ['Abra a Agenda e troque entre mês, semana e kanban.', 'Clique em "Nova Atividade" e veja os campos. Feche sem salvar.']),
  mod('Gestão e Operações', 'controladoria', 'Controladoria (DRE)', 15,
    'A DRE gerencial junta o resultado das operações e compara o orçado com o realizado.',
    ['Abra a Controladoria e veja a DRE do mês.', 'Abra "Orçado x Realizado".']),

  // -------------------------------------------------------- Administração
  mod('Administração', 'usuarios', 'Logins & Acessos', 20,
    'Cada pessoa vê só o que precisa. O administrador cria o login (ou convida por e-mail) e libera os módulos e as seções do DP de cada um. Login é pessoal e intransferível.',
    ['Abra Logins & Acessos e busque um login.', 'Abra a "Matriz de Acesso Rápido" e veja os módulos de cada pessoa.', 'Veja como criar um "Novo Login de Acesso". Não crie um login de teste.']),
];

/** Todos os treinamentos do sistema, na ordem dos grupos. */
export const TODOS_MODULOS_SISTEMA: ModuloTreinamento[] = GRUPOS_TREINAMENTO_SISTEMA.flatMap(({ grupo }) =>
  [...MODULOS_CORPORATIVOS, ...MODULOS_DEMAIS].filter((m) => m.grupo === grupo)
);

const CUIDADOS_GERAIS = [
  'Use o botão "?" (ou F1) em qualquer tela para abrir a ajuda daquela tela; lá também tem o tour guiado.',
  'Você só vê os módulos liberados para o seu login. Se faltar algum que você precisa, peça ao administrador em Logins & Acessos.',
  'Não compartilhe prints ou arquivos com dados pessoais (CPF, salário, saúde) fora do sistema — LGPD.',
];

/** Monta o treinamento de um módulo (ainda sem id — o banco gera ao salvar). */
export function montarTreinamentoSistema(m: ModuloTreinamento, opcoes: { cargos: string[]; prazoDias?: number; criadoPor?: string }): Treinamento {
  const topico = topicoDaSecao(m.secao);
  const telas = [m.secao, ...(m.telasExtras || [])].flatMap((s) => telasDaSecao(s));
  const passoAPassoTexto = (topico?.passos || []).map((p, i) => `${i + 1}. ${p.titulo}\n${p.texto}`).join('\n\n');
  const conteudos: ConteudoTreinamento[] = [
    { id: gerarIdCurto('cont'), tipo: 'texto', titulo: `Para que serve o módulo ${m.titulo}`, texto: `${topico?.resumo || ''}\n\n${m.porQue}`.trim() },
    // Passo a passo com as telas do sistema (imagens com números) e, depois, o resumo em texto.
    ...(telas.length > 0
      ? [
          {
            id: gerarIdCurto('cont'),
            tipo: 'telas' as const,
            titulo: 'Passo a passo com imagens',
            telas: telas.map((t) => ({ titulo: t.titulo, imagem: `/treinamento-sistema/${t.id}.png`, marcas: t.marcas.map((x) => x.texto) })),
          },
          { id: gerarIdCurto('cont'), tipo: 'texto' as const, titulo: 'Resumo do passo a passo', texto: passoAPassoTexto },
        ]
      : [{ id: gerarIdCurto('cont'), tipo: 'texto' as const, titulo: 'Passo a passo', texto: passoAPassoTexto }]),
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
    descricao: `Treinamento de uso do módulo ${m.titulo} do sistema JMT Gestão Integrada. Público: ${GRUPOS_TREINAMENTO_SISTEMA.find((g) => g.grupo === m.grupo)?.publico || 'supervisores'}.`,
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
