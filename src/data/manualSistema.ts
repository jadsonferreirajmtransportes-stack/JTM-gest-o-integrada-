// ============================================================================
// Manual do sistema — conteúdo da Ajuda (painel "?" do cabeçalho) e dos tours
// guiados. Um tópico por tela (chave = activeSection do App). Linguagem simples,
// pra quem nunca usou o sistema.
//
// Tour: cada passo aponta para um elemento da tela pelo TEXTO visível (botão,
// título, campo de busca) — assim o tour não depende de mexer no código das
// telas. Se o elemento não estiver na tela (ex.: o login não tem permissão para
// aquele botão), o passo aparece no centro, sem destaque.
// ============================================================================

export interface PassoTour {
  /** Texto (ou parte) de um botão/título/aba/placeholder visível na tela. */
  alvo?: string;
  titulo: string;
  texto: string;
}

export interface TopicoManual {
  id: string;
  grupo: 'Começando' | 'Gestão' | 'Operações' | 'Departamento Pessoal' | 'Corporativo';
  titulo: string;
  resumo: string;
  passos: { titulo: string; texto: string }[];
  dicas?: string[];
  tour?: PassoTour[];
}

export const MANUAL: TopicoManual[] = [
  // ---------------------------------------------------------------- Começando
  {
    id: 'primeiros_passos',
    grupo: 'Começando',
    titulo: 'Primeiros passos no sistema',
    resumo: 'Como o sistema é organizado, como navegar e onde pedir ajuda.',
    passos: [
      { titulo: 'Módulos', texto: 'No menu da esquerda ficam os módulos (Visão Geral, Clientes, Farma Aéreo, Departamento Pessoal, Comunicados...). Você só vê os módulos liberados para o seu login.' },
      { titulo: 'Seções', texto: 'Dentro do Departamento Pessoal, o menu mostra as seções (Colaboradores, Férias, Contracheques, Frequência...). Clique para abrir.' },
      { titulo: 'Ajuda em qualquer tela', texto: 'O botão "?" no topo abre esta Ajuda já na tela em que você está. Dá para buscar qualquer assunto e fazer o tour guiado.' },
      { titulo: 'Links para quem não tem login', texto: 'Colaboradores, candidatos e supervisores de campo usam links (admissão, ocorrência, contracheque, ponto, portal de educação, comunicado). Eles abrem no celular sem senha — a pessoa confirma CPF (e às vezes data de nascimento).' },
      { titulo: 'Envio por WhatsApp', texto: 'Quando o sistema manda algo para várias pessoas, ele abre uma fila: cada clique abre a conversa da próxima pessoa com a mensagem pronta, e você só aperta "enviar" no WhatsApp.' },
    ],
    dicas: [
      'O sistema salva sozinho no banco de dados — não precisa exportar nada para guardar.',
      'Dados pessoais (CPF, salário, saúde) só aparecem para quem tem permissão. Não compartilhe prints com esses dados.',
      'Se algo não carregar, atualize a página (F5). Se continuar, avise quem cuida do sistema.',
    ],
  },

  // ---------------------------------------------------------------- Gestão
  {
    id: 'visao_geral',
    grupo: 'Gestão',
    titulo: 'Visão Geral',
    resumo: 'Painel da empresa toda: faturamento, folha, alertas, agenda do dia e atalhos para os módulos.',
    passos: [
      { titulo: 'Indicadores', texto: 'No topo ficam faturamento (aéreo, rodoviário, total), custo da folha e outros números do mês.' },
      { titulo: 'Alertas', texto: 'Alertas críticos e de atenção (ASO vencendo, férias no limite, ocorrências abertas). Clique em "Ver todos os alertas" para a lista completa.' },
      { titulo: 'Atalhos', texto: 'Os cartões "Acessar..." levam direto para cada módulo.' },
    ],
    tour: [
      { alvo: 'Alertas Críticos', titulo: 'Alertas', texto: 'O que precisa de ação imediata aparece aqui primeiro.' },
      { alvo: 'Faturamento Total', titulo: 'Números do mês', texto: 'Faturamento e custos consolidados das operações.' },
      { alvo: 'Acessar Painel DP', titulo: 'Atalhos', texto: 'Cada cartão leva direto ao módulo.' },
    ],
  },
  {
    id: 'projetos',
    grupo: 'Gestão',
    titulo: 'Projetos & OKRs',
    resumo: 'Projetos gerenciais com responsáveis, prazos, orçamento, riscos e andamento.',
    passos: [
      { titulo: 'Criar', texto: 'Clique em "Novo Projeto Gerencial", preencha objetivo, responsável, datas e orçamento.' },
      { titulo: 'Acompanhar', texto: 'Use as abas (painel, lista, kanban, cronograma, financeiro, riscos) para ver o projeto de jeitos diferentes.' },
      { titulo: 'Anexos', texto: 'Dentro do projeto dá para anexar arquivos (orçamentos, fotos, documentos).' },
    ],
    tour: [{ alvo: 'Novo Projeto Gerencial', titulo: 'Novo projeto', texto: 'Comece por aqui: objetivo, responsável, prazo e orçamento.' }],
  },
  {
    id: 'agenda_gestao',
    grupo: 'Gestão',
    titulo: 'Agenda da Gestão',
    resumo: 'Reuniões, auditorias, rotinas e prazos da gestão, em lista, kanban, semana ou mês.',
    passos: [
      { titulo: 'Nova atividade', texto: 'Clique em "Nova Atividade", escolha o tipo (reunião, auditoria RDC 430, rotina...), data, responsáveis e quem participa.' },
      { titulo: 'Visualizações', texto: 'Alterne entre Hoje, Semana, Mês, Lista e Kanban.' },
      { titulo: 'Concluir', texto: 'Marque a atividade como concluída para entrar na taxa de conclusão.' },
    ],
    tour: [
      { alvo: 'Nova Atividade', titulo: 'Nova atividade', texto: 'Agende reuniões, auditorias e prazos.' },
      { alvo: 'Kanban', titulo: 'Jeitos de ver', texto: 'Troque entre lista, kanban, semana e mês.' },
    ],
  },
  {
    id: 'controladoria',
    grupo: 'Gestão',
    titulo: 'Controladoria (DRE)',
    resumo: 'DRE gerencial com orçado x realizado, margem de contribuição e ponto de equilíbrio.',
    passos: [
      { titulo: 'Planejado', texto: 'Preencha o valor planejado de cada linha para o mês.' },
      { titulo: 'Realizado', texto: 'O realizado vem das operações (faturamento e custos lançados) e da folha.' },
      { titulo: 'Desvio', texto: 'A coluna Desvio mostra onde o mês fugiu do plano.' },
    ],
    dicas: ['Leia "Como ler esta DRE" no topo da tela se tiver dúvida sobre alguma linha.'],
  },
  {
    id: 'chat',
    grupo: 'Gestão',
    titulo: 'Chat interno',
    resumo: 'Conversas entre os usuários do sistema, com anexo de imagem ou PDF.',
    passos: [
      { titulo: 'Conversar', texto: 'Escolha a conversa à esquerda e escreva embaixo. Enter envia.' },
      { titulo: 'Anexar', texto: 'O clipe anexa imagem ou PDF.' },
    ],
  },
  {
    id: 'notas',
    grupo: 'Gestão',
    titulo: 'Notas & Ideias',
    resumo: 'Páginas de anotação e brainstorm, com sub-páginas e compartilhamento por link.',
    passos: [
      { titulo: 'Nova página', texto: 'Clique em "Nova Página". Use sub-páginas para organizar por assunto.' },
      { titulo: 'Compartilhar', texto: 'Uma nota pode ser compartilhada por link (somente leitura).' },
    ],
  },

  // ---------------------------------------------------------------- Operações
  {
    id: 'clientes',
    grupo: 'Operações',
    titulo: 'Carteira de Clientes',
    resumo: 'Cadastro dos clientes: dados, contatos, faixa de temperatura, tarifário, contrato e histórico de interações.',
    passos: [
      { titulo: 'Novo cliente', texto: 'Clique em "Novo Cliente" e preencha os dados, contatos (com WhatsApp e e-mail) e o tarifário.' },
      { titulo: 'Filtrar', texto: 'Use a busca e os filtros de segmento, status e temperatura.' },
      { titulo: 'Interações', texto: 'Registre visitas, ligações e negociações no histórico do cliente.' },
    ],
    dicas: ['Os contatos cadastrados aqui aparecem como destinatários nos Comunicados para clientes.'],
    tour: [
      { alvo: 'Novo Cliente', titulo: 'Cadastrar', texto: 'Dados, contatos e tarifário do cliente.' },
      { alvo: 'Buscar por cliente', titulo: 'Buscar', texto: 'Por nome, CNPJ, código ou cidade.' },
    ],
  },
  {
    id: 'farma_aereo',
    grupo: 'Operações',
    titulo: 'Farma Aéreo',
    resumo: 'Operação aérea: visão geral e DRE, empresas atreladas, equipe, faturamento, controle financeiro (faturas) e custos.',
    passos: [
      { titulo: 'Abas', texto: 'Use as abas no topo: Visão Geral & DRE, Empresas, Equipe, Faturamento, Controle Financeiro e Custos.' },
      { titulo: 'Faturamento', texto: 'Lance ou importe o faturamento por cliente. O valor entra na DRE da operação.' },
      { titulo: 'Faturas', texto: 'Em Controle Financeiro, acompanhe as faturas emitidas e recebidas.' },
    ],
    tour: [{ alvo: 'Visão Geral & DRE', titulo: 'Abas da operação', texto: 'Cada aba mostra uma parte da operação.' }],
  },
  {
    id: 'farma_rodoviario',
    grupo: 'Operações',
    titulo: 'Farma Rodoviário',
    resumo: 'Operação rodoviária, com as mesmas abas do Farma Aéreo (DRE, empresas, equipe, faturamento, faturas e custos) e as viagens.',
    passos: [
      { titulo: 'Abas', texto: 'Visão Geral & DRE, Empresas, Equipe, Faturamento, Controle Financeiro e Custos.' },
      { titulo: 'Custos', texto: 'Lance combustível, manutenção e diárias na aba Custos.' },
    ],
    tour: [{ alvo: 'Visão Geral & DRE', titulo: 'Abas da operação', texto: 'Cada aba mostra uma parte da operação.' }],
  },

  // ---------------------------------------------------------------- Corporativo
  {
    id: 'instrucoes',
    grupo: 'Corporativo',
    titulo: 'Instruções de Trabalho',
    resumo: 'Procedimentos padronizados (IT) por operação, com responsáveis, fluxo, indicadores e riscos.',
    passos: [
      { titulo: 'Nova instrução', texto: 'Clique em "Nova Instrução", escolha a operação e um modelo (ou comece do zero).' },
      { titulo: 'Etapas', texto: 'Preencha objetivo, responsabilidades, fluxo do processo, critérios, indicadores e riscos.' },
      { titulo: 'Vigente', texto: 'Quando aprovada, marque como Vigente — só as vigentes aparecem no Portal de Educação dos colaboradores.' },
    ],
    tour: [
      { alvo: 'Nova Instrução', titulo: 'Nova instrução', texto: 'Escolha a operação e um modelo para começar.' },
      { alvo: 'Buscar por código', titulo: 'Buscar', texto: 'Por código, título ou conteúdo.' },
    ],
  },
  {
    id: 'compras',
    grupo: 'Corporativo',
    titulo: 'Compras',
    resumo: 'Solicitações de compra com aprovação, link público para pedidos e PDF da lista.',
    passos: [
      { titulo: 'Nova solicitação', texto: 'Clique em "Nova Solicitação", informe os itens, quantidade, valor estimado, urgência e anexe orçamento ou foto.' },
      { titulo: 'Aprovar', texto: 'A diretoria aprova ou recusa (com motivo). Depois de comprado, marque como comprado.' },
      { titulo: 'Link público', texto: 'Quem não tem login pode pedir pelo "Link Público".' },
      { titulo: 'PDF', texto: '"Baixar PDF" gera a lista do filtro atual no padrão JMT.' },
    ],
    tour: [
      { alvo: 'Nova Solicitação', titulo: 'Pedir', texto: 'Itens, urgência e anexo do orçamento.' },
      { alvo: 'Link Público', titulo: 'Link para quem não tem login', texto: 'Envie para quem precisa pedir sem acessar o sistema.' },
      { alvo: 'Baixar PDF', titulo: 'Lista em PDF', texto: 'Gera a lista filtrada para imprimir ou enviar.' },
    ],
  },
  {
    id: 'comunicados',
    grupo: 'Corporativo',
    titulo: 'Comunicados',
    resumo: 'Um comunicado, três formatos no padrão JMT (texto para WhatsApp/e-mail, imagem e PDF), com histórico e confirmação de ciência.',
    passos: [
      { titulo: 'Novo comunicado', texto: 'Clique em "Novo comunicado", escolha Colaboradores ou Clientes e a categoria (Aviso, Informativo, Urgente, Segurança, Parabéns, Evento, Comercial).' },
      { titulo: 'Pontos-chave', texto: 'Não se escreve texto livre: preencha os campos da categoria (ex.: Evento pede nome, data, horário, local, programação). O sistema redige o texto final no padrão JMT, com saudação, datas por extenso e encerramento. Para mudar o texto, ajuste os campos.' },
      { titulo: 'Imagem', texto: 'A imagem usa só os pontos-chave. Escolha um dos 6 modelos (o da categoria já vem marcado); a prévia atualiza enquanto você preenche.' },
      { titulo: 'Destinatários', texto: 'Filtre por setor (colaboradores) ou cliente e marque quem recebe.' },
      { titulo: 'Enviar', texto: 'No comunicado criado: WhatsApp (fila), E-mail (abre no seu e-mail), Baixar imagem, Baixar PDF timbrado.' },
      { titulo: 'Ciência', texto: 'Com "Pedir confirmação de ciência", cada pessoa recebe um link próprio. A tabela mostra quem abriu e quem confirmou; o botão de WhatsApp reenvia só para quem falta.' },
    ],
    tour: [{ alvo: 'Novo comunicado', titulo: 'Novo comunicado', texto: 'Escreva uma vez e envie em texto, imagem e PDF.' }],
  },
  {
    id: 'jornal',
    grupo: 'Corporativo',
    titulo: 'Jornal JMT',
    resumo: 'Notícias da empresa no estilo blog, lidas pelos colaboradores no link pessoal do portal (aba "Jornal JMT"), com fotos, reações e comentários.',
    passos: [
      { titulo: 'Escrever', texto: 'Clique em "Nova notícia" (ou "Sugerir notícia"). Preencha título, linha fina e editoria. Escreva o texto — uma linha em branco começa um novo parágrafo — e use "Adicionar fotos" para colocar imagens no meio do texto.' },
      { titulo: 'Capa', texto: 'Sem foto, a notícia ganha uma capa automática na cor da editoria. Para usar uma foto, clique em "Enviar foto".' },
      { titulo: 'Ver como fica', texto: 'O botão "Ver como fica" mostra a notícia como o colaborador vai ver no celular.' },
      { titulo: 'Aprovação', texto: 'Supervisores enviam para aprovação. O administrador revisa em "Para aprovar": publica ou devolve para ajuste com um comentário.' },
      { titulo: 'Divulgar', texto: 'Na notícia publicada, "Divulgar" abre a fila do WhatsApp com o link pessoal de cada colaborador, que já abre direto na notícia.' },
      { titulo: 'Comentários', texto: 'Os colaboradores reagem e comentam. Comentário só aparece para os outros depois que o administrador aprova, em "Comentários para aprovar".' },
      { titulo: 'Tirar do ar', texto: 'Arquivar tira a notícia do portal sem apagar. O alfinete fixa uma notícia no topo.' },
      { titulo: 'Aniversariantes (automático)', texto: 'Todo dia às 7h, se houver aniversariante, o sistema publica sozinho a notícia "Hoje é aniversário de..." com nome, cargo e setor (nunca a idade). Os colegas comentam os parabéns (com a sua moderação). Quem não quiser aparecer: desmarque "Aparecer no Jornal JMT no dia do aniversário" no cadastro do colaborador.' },
    ],
    dicas: [
      'Só publique foto de pessoa com autorização de uso de imagem, e sem documentos, crachás, placas ou dados de clientes à mostra (LGPD).',
      'Títulos curtos e diretos funcionam melhor no celular.',
    ],
    tour: [{ alvo: 'Nova notícia', titulo: 'Nova notícia', texto: 'Escreva, coloque fotos e publique no portal dos colaboradores.' }],
  },
  {
    id: 'documentos',
    grupo: 'Corporativo',
    titulo: 'Padronização de Documentos',
    resumo: 'Todo documento da empresa passa por aqui: importa PDF, Word ou Excel, revisa no editor com o crivo do padrão JMT e gera PDF, Word ou Excel na identidade da empresa.',
    passos: [
      { titulo: 'Importar', texto: 'Clique em "Importar arquivo" e escolha o PDF, Word (.docx) ou Excel. O sistema separa títulos, parágrafos, listas e tabelas.' },
      { titulo: 'Revisar', texto: 'Corrija o texto nos blocos. Troque o tipo de um bloco no seletor (ex.: parágrafo → tabela). "inserir abaixo" adiciona blocos.' },
      { titulo: 'Crivo do padrão', texto: 'A coluna da esquerda lista o que falta ou está fora do padrão. Clique no item para ir até o bloco. "Corrigir automaticamente" resolve espaços, pontuação, datas e blocos vazios.' },
      { titulo: 'Gerar', texto: 'Os botões PDF, Word e Excel baixam o documento no padrão JMT, com código, versão e quadro de controle.' },
      { titulo: 'Publicar e revisar', texto: '"Publicar versão" deixa o documento Vigente (somente leitura) e guarda no histórico. Para mudar depois, use "Nova revisão".' },
    ],
    dicas: [
      'PDF escaneado (foto) não tem texto para ler — importe a versão em Word ou digite.',
      'Em PDF, tabelas costumam vir como texto: converta o bloco em tabela no editor.',
      'Word antigo (.doc): abra no Word e use "Salvar como" → .docx.',
    ],
    tour: [
      { alvo: 'Importar arquivo', titulo: 'Importar', texto: 'PDF, Word ou Excel — o sistema lê e monta o documento.' },
      { alvo: 'Em branco', titulo: 'Do zero', texto: 'Também dá para escrever um documento novo.' },
      { alvo: 'Buscar por código', titulo: 'Biblioteca', texto: 'Todos os documentos ficam aqui, com código e versão.' },
    ],
  },
  {
    id: 'usuarios',
    grupo: 'Corporativo',
    titulo: 'Logins & Acessos',
    resumo: 'Criação de logins, convites por e-mail e permissões por módulo e por seção do DP.',
    passos: [
      { titulo: 'Novo login', texto: 'Clique em "Novo Login" (ou "Convidar por E-mail"), informe nome, e-mail, perfil e marque os módulos liberados.' },
      { titulo: 'Seções do DP', texto: 'Dá para liberar só algumas seções do Departamento Pessoal e limitar o supervisor à própria equipe.' },
      { titulo: 'Módulos novos', texto: 'Módulo novo (ex.: Comunicados, Padronização de Documentos) começa desmarcado — marque para quem deve usar.' },
    ],
    dicas: ['Libere só o necessário: o DP tem dados pessoais e salariais.'],
    tour: [
      { alvo: 'Novo Login', titulo: 'Criar login', texto: 'Defina perfil e módulos liberados.' },
      { alvo: 'Convidar por E-mail', titulo: 'Convite', texto: 'A pessoa recebe um e-mail e cria a própria senha.' },
    ],
  },

  // ---------------------------------------------------------------- DP
  {
    id: 'dashboard',
    grupo: 'Departamento Pessoal',
    titulo: 'Painel DP & Indicadores',
    resumo: 'Resumo do DP: ASO, férias, ocorrências, documentos e atalhos (novo colaborador, link de admissão, nova ocorrência).',
    passos: [
      { titulo: 'Atenção CLT', texto: 'Mostra o que está perto do limite legal (férias, ASO).' },
      { titulo: 'Atalhos', texto: '"Novo Colaborador", "Link de Admissão" e "Nova Ocorrência" no topo.' },
    ],
    tour: [
      { alvo: 'Novo Colaborador', titulo: 'Cadastrar', texto: 'Cadastro completo de um colaborador.' },
      { alvo: 'Link de Admissão', titulo: 'Admissão digital', texto: 'O candidato preenche os dados e manda os documentos pelo celular.' },
    ],
  },
  {
    id: 'colaboradores',
    grupo: 'Departamento Pessoal',
    titulo: 'Colaboradores',
    resumo: 'Cadastro e ficha de cada colaborador, documentos, exportação e comunicado por WhatsApp.',
    passos: [
      { titulo: 'Cadastrar', texto: 'Clique em "Novo Cadastro". Preencha dados pessoais, contratuais, bancários e anexe os documentos (limite de 20MB somando os anexos).' },
      { titulo: 'Ficha', texto: '"Ver Ficha" mostra tudo; dá para compartilhar a ficha por link.' },
      { titulo: 'Ações na linha', texto: 'Editar, programar férias, registrar ocorrência, inativar (demissão).' },
      { titulo: 'Comunicado', texto: 'O botão "Comunicado" manda uma mensagem por WhatsApp para os colaboradores filtrados.' },
      { titulo: 'Exportar', texto: 'Excel ou CSV da lista filtrada.' },
    ],
    dicas: ['Data de nascimento e CPF corretos são necessários para o colaborador entrar no Portal de Educação, no ponto e nos links de assinatura.'],
    tour: [
      { alvo: 'Novo Cadastro', titulo: 'Novo colaborador', texto: 'Cadastro completo, com documentos anexados.' },
      { alvo: 'Buscar colaborador', titulo: 'Buscar e filtrar', texto: 'Por nome; os filtros ao lado separam por empresa, setor e status.' },
      { alvo: 'Comunicado', titulo: 'Comunicado rápido', texto: 'Mensagem por WhatsApp para a lista filtrada.' },
    ],
  },
  {
    id: 'preadmissoes',
    grupo: 'Departamento Pessoal',
    titulo: 'Pré-Admissões (Link)',
    resumo: 'Formulários de admissão enviados pelos candidatos pelo link, para conferir e efetivar.',
    passos: [
      { titulo: 'Enviar o link', texto: '"Gerar / Enviar Link de Admissão" — o candidato preenche dados e manda fotos dos documentos.' },
      { titulo: 'Conferir', texto: 'Abra o formulário em "Pendentes de Análise", confira dados e anexos.' },
      { titulo: 'Efetivar', texto: '"Efetivar Admissão" cria o colaborador com os dados do formulário — complete cargo, salário, empresa e supervisor.' },
    ],
    tour: [{ alvo: 'Gerar / Enviar Link', titulo: 'Link de admissão', texto: 'Envie ao candidato pelo WhatsApp.' }],
  },
  {
    id: 'custos',
    grupo: 'Departamento Pessoal',
    titulo: 'Custo Mensal por Colaborador',
    resumo: 'Quanto cada colaborador custa por mês: salário, adicionais, encargos, provisões e benefícios da CCT.',
    passos: [
      { titulo: 'Filtrar', texto: 'Por empresa, setor ou nome.' },
      { titulo: 'Exportar', texto: '"Exportar Excel" gera a planilha com todos os valores.' },
    ],
  },
  {
    id: 'beneficios',
    grupo: 'Departamento Pessoal',
    titulo: 'Benefícios (VA & VT)',
    resumo: 'Vale-alimentação e vale-transporte por colaborador, conforme a CCT.',
    passos: [{ titulo: 'Valores', texto: 'Confira VA e VT diários e mensais (22 dias) de cada colaborador.' }],
  },
  {
    id: 'vale_alimentacao',
    grupo: 'Departamento Pessoal',
    titulo: 'Programação do Vale-Alimentação',
    resumo: 'Quinzenas do ano e lançamento por colaborador, com diárias calculadas (faltas, férias e suspensões descontam).',
    passos: [
      { titulo: 'Quinzena', texto: 'Cadastre a quinzena (ex.: "1ª QUINZENA - SETEMBRO/2026") com início e fim.' },
      { titulo: 'Lançamentos', texto: 'O sistema calcula as diárias; ajuste faltas e extras quando precisar.' },
      { titulo: 'Comunicar', texto: '"Comunicar" copia ou envia a mensagem com o valor para o colaborador, já com o link pessoal dele.' },
      { titulo: 'Disponibilizar no portal', texto: 'Com os valores conferidos, clique em "Disponibilizar no portal": cada colaborador recebe o demonstrativo da quinzena em "Documentos", no link pessoal, para conferir e assinar — igual ao contracheque. Logo abaixo, a lista mostra quem já viu e quem assinou; "Enviar pendentes" avisa pelo WhatsApp.' },
      { titulo: 'Corrigir um valor', texto: 'O demonstrativo disponibilizado não muda sozinho. Para corrigir: ajuste o lançamento, exclua o demonstrativo daquela pessoa na lista e clique de novo em "Disponibilizar no portal" (só gera para quem está faltando).' },
    ],
  },
  {
    id: 'ferias',
    grupo: 'Departamento Pessoal',
    titulo: 'Férias & Ausências CLT',
    resumo: 'Programação de férias, prazo legal, aviso e recibo para assinatura pelo link.',
    passos: [
      { titulo: 'Programar', texto: '"Programar Férias": colaborador, período e abono. O prazo limite (CLT) aparece na lista.' },
      { titulo: 'Aviso e recibo', texto: 'Na área "Aviso & Recibo p/ Assinatura", importe os PDFs da contabilidade e envie o link para o colaborador assinar.' },
      { titulo: 'Programação para assinar', texto: 'Com as datas marcadas, "Programação p/ assinar" (na linha das férias) gera a Programação de Férias pelo próprio sistema — período aquisitivo, gozo, abono e retorno — e coloca em Documentos, no link pessoal do colaborador, para conferir e assinar. Mudou a data? Clique de novo: a versão sem assinatura é substituída.' },
      { titulo: 'No portal do colaborador', texto: 'Programação, Aviso e Recibo aparecem juntos em Documentos (rótulo Férias). Os selos na linha mostram o que já foi visto e assinado.' },
      { titulo: 'Assinados', texto: '"Baixar assinados" na linha traz o PDF com a assinatura e a página de comprovação.' },
      { titulo: 'Relatório', texto: '"Relatório PDF por Período" lista as férias de um intervalo.' },
    ],
    tour: [
      { alvo: 'Programar Férias', titulo: 'Programar', texto: 'Período, abono e prazo legal.' },
      { alvo: 'Aviso & Recibo', titulo: 'Assinatura', texto: 'Aviso e recibo de férias assinados pelo celular.' },
    ],
  },
  {
    id: 'saude',
    grupo: 'Departamento Pessoal',
    titulo: 'Exames ASO (RDC 430)',
    resumo: 'Controle dos atestados de saúde ocupacional: válidos, a vencer, vencidos e agendamentos.',
    passos: [
      { titulo: 'Status', texto: 'Os cartões mostram válidos, a vencer (30 dias) e vencidos.' },
      { titulo: 'Renovar', texto: '"Renovar ASO" registra o novo exame e anexa o atestado digitalizado.' },
      { titulo: 'Agendar', texto: '"Agendar renovação periódica" com clínica, data e horário; envie a mensagem ao colaborador por WhatsApp.' },
      { titulo: 'Relatório', texto: '"Exportar Relatório ANVISA" para auditoria.' },
    ],
  },
  {
    id: 'epis',
    grupo: 'Departamento Pessoal',
    titulo: 'Entrega de EPI',
    resumo: 'Registro das entregas de EPI com recibo assinado e ficha de EPI por colaborador.',
    passos: [
      { titulo: 'Nova entrega', texto: '"Nova Entrega": colaborador, itens e assinatura do recibo.' },
      { titulo: 'Formulário de campo', texto: '"Link do Formulário" permite registrar entregas sem login.' },
      { titulo: 'Ficha', texto: 'A ficha de EPI reúne todas as entregas da pessoa.' },
    ],
    dicas: ['A recusa injustificada ao uso de EPI é falta grave (CLT art. 158) — registre no módulo Disciplinar.'],
  },
  {
    id: 'contracheques',
    grupo: 'Departamento Pessoal',
    titulo: 'Contracheques',
    resumo: 'Importa o PDF da folha, separa por colaborador, envia o link e guarda a assinatura de cada um.',
    passos: [
      { titulo: 'Importar', texto: '"Importar Contracheques" e escolha o PDF da folha (pode ser o ano inteiro). O sistema separa por pessoa, competência e tipo pelo CPF.' },
      { titulo: 'Enviar', texto: '"Enviar pendentes" manda o link para quem ainda não assinou (fila do WhatsApp).' },
      { titulo: 'Assinatura', texto: 'O colaborador abre o link, confirma o CPF, confere e assina com o dedo. A assinatura vai para o campo do próprio contracheque.' },
      { titulo: 'Baixar', texto: '"Baixar todos assinados" gera um .zip com os PDFs assinados e o comprovante.' },
      { titulo: 'Assinar de novo', texto: 'Se algo mudou, "Solicitar nova assinatura" na linha — sem reimportar.' },
    ],
    dicas: ['Se um contracheque não aparecer, confira se a pessoa está cadastrada com o CPF certo e importe de novo.'],
    tour: [
      { alvo: 'Importar Contracheques', titulo: 'Importar a folha', texto: 'O PDF é separado por colaborador automaticamente.' },
      { alvo: 'Enviar pendentes', titulo: 'Enviar', texto: 'Link de assinatura para quem falta, pelo WhatsApp.' },
      { alvo: 'Baixar todos assinados', titulo: 'Arquivo', texto: 'Todos os assinados num .zip.' },
    ],
  },
  {
    id: 'onboarding',
    grupo: 'Departamento Pessoal',
    titulo: 'Onboarding & Checklist de Admissão',
    resumo: 'Checklist do novo colaborador: norteadores estratégicos JMT, treinamento RDC 430 e entrega de EPIs.',
    passos: [{ titulo: 'Checklist', texto: 'Busque o colaborador e marque cada etapa concluída.' }],
  },
  {
    id: 'ocorrencias',
    grupo: 'Departamento Pessoal',
    titulo: 'Ocorrências & Advertências',
    resumo: 'Registro de faltas, atrasos, atestados, afastamentos, elogios e advertências, inclusive pelo formulário de campo dos supervisores.',
    passos: [
      { titulo: 'Nova ocorrência', texto: '"Nova Ocorrência": colaborador, tipo, data, horários e descrição. Anexe o comprovante (atestado, foto).' },
      { titulo: 'Formulário de campo', texto: '"Gerar Link / WhatsApp" envia aos supervisores o formulário para registrarem pelo celular.' },
      { titulo: 'Impacto', texto: 'Faltas e suspensões descontam o vale-alimentação automaticamente.' },
    ],
    dicas: ['Advertências e suspensões com gradação, aprovação e ciência ficam no módulo Disciplinar.'],
    tour: [
      { alvo: 'Nova Ocorrência', titulo: 'Registrar', texto: 'Tipo, data, descrição e comprovante.' },
      { alvo: 'Gerar Link', titulo: 'Supervisores', texto: 'Formulário de campo pelo celular.' },
    ],
  },
  {
    id: 'disciplinar',
    grupo: 'Departamento Pessoal',
    titulo: 'Disciplinar (Advertências)',
    resumo: 'Advertências e suspensões com a gradação do Regulamento (verbal → escrita → 2ª escrita → suspensão 1/3/5 dias → justa causa), aprovação e ciência do colaborador.',
    passos: [
      { titulo: 'Propor', texto: 'O supervisor propõe a medida ("Propor medida"); o sistema sugere a etapa pela reincidência dos últimos 12 meses e avisa sobre prazo (imediatidade) e dupla punição.' },
      { titulo: 'Aprovar', texto: 'O administrador aprova ou rejeita. A aprovação cria a ocorrência (suspensão desconta o VA).' },
      { titulo: 'Ciência', texto: 'O documento vai por link para o colaborador assinar (ciência não é concordância). Se ele se recusar, registre a recusa com duas testemunhas.' },
    ],
    dicas: ['Pular etapa da gradação exige justificativa — proporcionalidade é o que a Justiça mais confere.', 'Recomendação de justa causa é documento interno; não é enviada ao colaborador.'],
  },
  {
    id: 'frequencia',
    grupo: 'Departamento Pessoal',
    titulo: 'Controle de Frequência',
    resumo: 'Ponto pelo celular (controle interno — não substitui o ponto oficial), espelho mensal, justificativas e assinatura do espelho.',
    passos: [
      { titulo: 'Configurar', texto: 'Em "Jornadas, bases e links": cadastre a base (galpão) colando o link do Google Maps ou usando a localização do celular no local, defina a jornada de cada colaborador e envie o link do ponto.' },
      { titulo: 'Colaborador', texto: 'No 1º acesso ele confirma CPF e data de nascimento; depois é só abrir o link e tocar em "Bater ponto" com a localização ligada.' },
      { titulo: 'Hoje', texto: 'Quem já bateu, quem não bateu depois do horário e quem chegou atrasado.' },
      { titulo: 'Espelho', texto: 'Mês do colaborador: inclua batida esquecida (+), anule batida errada (clique nela) e justifique o dia (atestado, folga...). Tudo fica registrado com motivo e autor.' },
      { titulo: 'Resumo e assinatura', texto: '"Resumo do mês" mostra faltas, atrasos e saldo, com alerta de mais de 3 atrasos. Gere os espelhos para assinatura e envie pela aba "Assinaturas".' },
    ],
    dicas: ['Batida em vermelho = longe da base; amarelo = sem localização; azul* = ajuste do DP.', 'Celular trocado ou link vazado: "Desconectar celulares" na lista de colaboradores.'],
    tour: [
      { alvo: 'Jornadas, bases e links', titulo: 'Comece por aqui', texto: 'Base, jornada de cada um e envio dos links.' },
      { alvo: 'Espelho do colaborador', titulo: 'Espelho', texto: 'Ajustes, anulações e justificativas do mês.' },
      { alvo: 'Resumo do mês', titulo: 'Resumo', texto: 'Faltas, atrasos e espelhos para assinatura.' },
    ],
  },
  {
    id: 'solicitacoes',
    grupo: 'Departamento Pessoal',
    titulo: 'Fale com o DP (solicitações)',
    resumo: 'Os colaboradores abrem solicitações pelo link pessoal: contestação (VA, contracheque, ponto, faltas), pedido de férias, documentos/declarações e atualização de dados. Só o DP vê e responde.',
    passos: [
      { titulo: 'Fila', texto: '"Pendentes" mostra o que aguarda o DP. O ponto laranja marca mensagem nova do colaborador. Filtre por tipo ou busque por nome, assunto ou número.' },
      { titulo: 'Responder', texto: 'Abra a solicitação, leia a conversa e os anexos (clique no nome do arquivo para abrir), escreva a resposta e escolha: responder e aguardar o colaborador, manter em análise, concluir ou não atendida.' },
      { titulo: 'Enviar documento', texto: 'Para declarações e segundas vias, anexe o PDF na resposta — o colaborador baixa pelo portal (por 30 dias).' },
      { titulo: 'Pedido de férias', texto: '"Aprovar e criar a programação de férias" já cria a programação em Férias com a data e os dias pedidos (ou "a programar", quando o colaborador escolheu só o mês) e deixa a resposta pronta.' },
      { titulo: 'Avisar', texto: 'Depois de responder, o sistema oferece avisar pelo WhatsApp com o link pessoal já abrindo na solicitação. O colaborador também vê "Nova resposta" no portal.' },
    ],
    dicas: [
      'Contestações não aparecem para os supervisores — só para quem tem a seção "Fale com o DP" liberada.',
      'Atualização de dados (endereço, conta, dependentes): confira o documento anexado antes de alterar o cadastro do colaborador.',
    ],
    tour: [{ alvo: 'Pendentes', titulo: 'Fila do DP', texto: 'Solicitações que aguardam resposta.' }],
  },
  {
    id: 'educacao',
    grupo: 'Departamento Pessoal',
    titulo: 'Portal de Educação',
    resumo: 'Treinamentos com vídeo, material, Instrução de Trabalho e prova; certificado; Regulamento Interno para ciência e assinatura.',
    passos: [
      { titulo: 'Criar treinamento', texto: '"Novo treinamento": conteúdos (vídeo por link, PDF, Instrução de Trabalho, texto), prova com nota mínima, quem precisa fazer (todos, cargos, setores), prazo e validade.' },
      { titulo: 'A partir de um documento', texto: '"Importar documento" monta o treinamento a partir de um PDF, Word ou texto colado: cada título vira uma parte, as figuras (do Word ou do PDF) entram junto e o PDF original pode ir como material. Revise no editor, defina quem faz e salve.' },
      { titulo: 'Atribuição', texto: 'Pela regra de cargo/setor é automática; também dá para "Atribuir" a pessoas específicas. Com validade, o treinamento volta sozinho quando vence (reciclagem).' },
      { titulo: 'Enviar o link', texto: '"Enviar link do portal" manda o link pessoal para quem tem treinamento em aberto. O colaborador entra com CPF e data de nascimento.' },
      { titulo: 'Link único do colaborador', texto: 'O link pessoal é o mesmo para tudo: ponto, documentos para assinar (contracheque, férias, espelho, medidas), comunicados, treinamentos e Jornal JMT. Toda mensagem do sistema manda esse link, já abrindo no item. Com "Lembrar neste celular", o link abre direto, sem CPF. Celular perdido ou trocado: em Controle de Frequência, desconecte os aparelhos da pessoa.' },
      { titulo: 'Acompanhar', texto: 'Na aba Acompanhamento: situação, nota, validade e certificado de cada um.' },
      { titulo: 'Regulamento Interno', texto: 'Na aba do regulamento, "Enviar para assinatura" gera uma cópia com nome e CPF de cada colaborador para ciência e assinatura pelo link.' },
    ],
    tour: [
      { alvo: 'Novo treinamento', titulo: 'Treinamento', texto: 'Conteúdos, prova, quem faz e validade.' },
      { alvo: 'Acompanhamento', titulo: 'Quem fez', texto: 'Situação, nota e certificado de cada colaborador.' },
      { alvo: 'Regulamento Interno', titulo: 'Regulamento', texto: 'Ciência e assinatura de todos.' },
    ],
  },
  {
    id: 'arquivo',
    grupo: 'Departamento Pessoal',
    titulo: 'Arquivo / Demitidos',
    resumo: 'Histórico dos colaboradores desligados, com motivo e data da rescisão.',
    passos: [{ titulo: 'Consultar', texto: 'Busque o ex-colaborador e abra a ficha para ver o histórico.' }],
  },
  {
    id: 'aniversariantes',
    grupo: 'Departamento Pessoal',
    titulo: 'Aniversariantes do Mês',
    resumo: 'Aniversariantes por mês, mensagem de parabéns por WhatsApp e mural para imprimir.',
    passos: [
      { titulo: 'Navegar', texto: 'Use as setas para trocar de mês.' },
      { titulo: 'Felicitar', texto: '"Felicitar" abre o WhatsApp com a mensagem pronta.' },
      { titulo: 'Mural', texto: '"Imprimir Mural" para o quadro de avisos.' },
    ],
  },
  {
    id: 'cargos',
    grupo: 'Departamento Pessoal',
    titulo: 'Cargos e Salários',
    resumo: 'Cargos com piso da CCT e faixas salariais, operações e feriados.',
    passos: [{ titulo: 'Cargos', texto: 'Cadastre o cargo com função normativa, piso da CCT e faixa mínima/máxima.' }],
  },
  {
    id: 'supervisores',
    grupo: 'Departamento Pessoal',
    titulo: 'Supervisores e Gestão',
    resumo: 'Cadastro dos supervisores e dos setores que eles acompanham.',
    passos: [{ titulo: 'Supervisor', texto: 'Cadastre nome, e-mail e setor. O supervisor vê só a própria equipe quando o login dele estiver configurado assim.' }],
  },
];

export function topicoDaSecao(secao: string): TopicoManual | undefined {
  return MANUAL.find((t) => t.id === secao);
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca simples em título, resumo, passos e dicas (todas as palavras precisam aparecer). */
export function buscarNoManual(termo: string): TopicoManual[] {
  const palavras = normalizar(termo).split(/\s+/).filter((p) => p.length > 1);
  if (palavras.length === 0) return [];
  return MANUAL.map((t) => {
    const titulo = normalizar(t.titulo);
    const corpo = normalizar([t.resumo, ...t.passos.map((p) => `${p.titulo} ${p.texto}`), ...(t.dicas || [])].join(' '));
    if (!palavras.every((p) => titulo.includes(p) || corpo.includes(p))) return null;
    const pontos = palavras.reduce((s, p) => s + (titulo.includes(p) ? 3 : 0) + (corpo.split(p).length - 1), 0);
    return { t, pontos };
  })
    .filter((x): x is { t: TopicoManual; pontos: number } => !!x)
    .sort((a, b) => b.pontos - a.pontos)
    .map((x) => x.t);
}
