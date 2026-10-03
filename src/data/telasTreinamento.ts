// ============================================================================
// Telas ilustradas dos treinamentos do sistema: cada tela é uma captura da
// tela real do JMT, com dados fictícios, e números marcados nos botões. A
// legenda de cada número fica aqui, então imagem e texto não se desencontram.
//
// As imagens ficam em /public/treinamento-sistema/<id>.png (servidas pelo site,
// sem custo de Supabase). Para gerar de novo depois de mudar uma tela:
// ferramentas/telas-treinamento/LEIA-ME.md.
// ============================================================================

export interface MarcaTela {
  /** Texto (ou placeholder/título) do elemento a marcar na tela. */
  alvo: string;
  /** Explicação do número na imagem. */
  texto: string;
}

export interface TelaTreinamento {
  id: string;
  secao: string; // id do tópico do manual / módulo
  titulo: string;
  marcas: MarcaTela[];
}

export const TELAS_TREINAMENTO: TelaTreinamento[] = [
  // ---- Comunicados
  {
    id: 'com-1',
    secao: 'comunicados',
    titulo: 'A lista de comunicados',
    marcas: [
      { alvo: 'Novo comunicado', texto: 'Clique em "Novo comunicado" para começar.' },
      { alvo: 'Buscar comunicado', texto: 'Busque comunicados antigos pelo título ou pelo número.' },
      { alvo: 'cientes', texto: 'Cada cartão mostra quantos receberam, abriram e confirmaram a leitura.' },
    ],
  },
  {
    id: 'com-2',
    secao: 'comunicados',
    titulo: 'Preenchendo os pontos-chave',
    marcas: [
      { alvo: 'Colaboradores', texto: 'Escolha para quem é: Colaboradores ou Clientes.' },
      { alvo: 'Categoria', texto: 'Escolha a categoria — cada uma tem os seus campos.' },
      { alvo: 'Pontos-chave do comunicado', texto: 'Preencha os pontos-chave. Não existe texto livre: o sistema redige.' },
      { alvo: 'Prévia do comunicado', texto: 'A prévia mostra a imagem que vai para o WhatsApp.' },
    ],
  },
  {
    id: 'com-2b',
    secao: 'comunicados',
    titulo: 'Conferindo o texto montado',
    marcas: [
      { alvo: 'Texto que será enviado', texto: 'Mais abaixo, confira o texto final que o sistema redigiu (cada pessoa recebe com o próprio nome). No fim da tela, deixe marcado "Pedir confirmação de ciência".' },
      { alvo: 'Escolher destinatários', texto: 'Clique em "Escolher destinatários".' },
    ],
  },
  {
    id: 'com-3',
    secao: 'comunicados',
    titulo: 'Escolhendo quem recebe',
    marcas: [
      { alvo: 'Todos os setores', texto: 'Filtre por setor (ou por cliente).' },
      { alvo: 'Marcar os', texto: 'Marque todos os mostrados de uma vez, ou um a um na lista.' },
      { alvo: 'Criar comunicado', texto: 'Clique em "Criar comunicado" — o número sai sozinho.' },
    ],
  },
  {
    id: 'com-4',
    secao: 'comunicados',
    titulo: 'Enviando e acompanhando a leitura',
    marcas: [
      { alvo: 'WhatsApp —', texto: 'Envie pelo WhatsApp: abre a conversa de cada pessoa, uma por vez.' },
      { alvo: 'E-mail (', texto: 'Ou envie por e-mail (abre no seu e-mail).' },
      { alvo: 'Baixar imagem', texto: 'Baixe a imagem ou o PDF timbrado, se precisar.' },
      { alvo: 'Ciência', texto: 'Acompanhe quem abriu e quem confirmou a leitura.' },
    ],
  },
  // ---- Compras
  {
    id: 'cmp-1',
    secao: 'compras',
    titulo: 'As solicitações de compra',
    marcas: [
      { alvo: 'Nova Solicitação', texto: 'Clique em "Nova Solicitação" para pedir uma compra.' },
      { alvo: 'Link Público', texto: '"Link Público": envie para quem da equipe não tem login.' },
      { alvo: 'Baixar PDF', texto: '"Baixar PDF" gera a lista no padrão JMT.' },
      { alvo: 'Pendente', texto: 'O status mostra se o pedido está pendente, aprovado, recusado ou comprado.' },
    ],
  },
  {
    id: 'cmp-2',
    secao: 'compras',
    titulo: 'Fazendo o pedido',
    marcas: [
      { alvo: 'Ex: Resma de papel A4', texto: 'Informe o item, a quantidade e o valor estimado.' },
      { alvo: 'Urgência', texto: 'Marque a urgência.' },
      { alvo: 'Pra que precisa', texto: 'Explique para que é a compra (ajuda na aprovação).' },
      { alvo: 'Anexar Orçamento', texto: 'Anexe o orçamento ou uma foto, se tiver.' },
    ],
  },
  // ---- Instruções de Trabalho
  {
    id: 'it-1',
    secao: 'instrucoes',
    titulo: 'A biblioteca de instruções',
    marcas: [
      { alvo: 'Buscar por código', texto: 'Busque a instrução pelo código, título ou conteúdo.' },
      { alvo: 'Todas as Operações', texto: 'Filtre pela sua operação.' },
      { alvo: 'Nova Instrução', texto: '"Nova Instrução" cria uma instrução a partir de um modelo.' },
    ],
  },
  {
    id: 'it-2',
    secao: 'instrucoes',
    titulo: 'Lendo uma instrução',
    marcas: [
      { alvo: 'Coleta e Conferência de AWB — Farma Aéreo', texto: 'Clique na instrução na lista para abrir. No topo aparecem o código, a operação e o status — só as "Vigentes" valem.' },
      { alvo: 'Objetivo e Escopo', texto: 'Navegue pelas etapas: objetivo, responsabilidades, fluxo do processo e riscos.' },
      { alvo: 'Próxima etapa', texto: 'Ou avance etapa por etapa até o fim.' },
    ],
  },
  // ---- Padronização de Documentos
  {
    id: 'doc-1',
    secao: 'documentos',
    titulo: 'A biblioteca de documentos',
    marcas: [
      { alvo: 'Importar arquivo', texto: 'Importe um PDF, Word ou Excel que você já tem.' },
      { alvo: 'Em branco', texto: 'Ou comece um documento em branco.' },
      { alvo: 'DOC-OPE-001', texto: 'Cada documento tem código, versão e status.' },
    ],
  },
  {
    id: 'doc-2',
    secao: 'documentos',
    titulo: 'Revisando no editor',
    marcas: [
      { alvo: 'Crivo do padrão JMT', texto: 'O crivo mostra o que falta ou está fora do padrão.' },
      { alvo: 'Corrigir automaticamente', texto: 'Corrige sozinho espaços, pontuação, datas e blocos vazios.' },
      { alvo: 'inserir abaixo', texto: 'Edite os blocos e insira novos onde precisar.' },
      { alvo: 'PDF', texto: 'Baixe em PDF, Word ou Excel no padrão JMT.' },
      { alvo: 'Publicar versão', texto: 'Publique a versão quando estiver aprovada.' },
    ],
  },
  // ---- Chat
  {
    id: 'chat-1',
    secao: 'chat',
    titulo: 'Conversando no chat interno',
    marcas: [
      { alvo: 'Buscar conversa', texto: 'Escolha ou busque a conversa.' },
      { alvo: 'Anexar imagem ou PDF', texto: 'Anexe uma imagem ou PDF pelo clipe.' },
      { alvo: 'Enviar (Enter)', texto: 'Escreva e envie (Enter também envia).' },
    ],
  },
  // ---- Notas
  {
    id: 'notas-1',
    secao: 'notas',
    titulo: 'Organizando as notas',
    marcas: [
      { alvo: 'Nova Página', texto: 'Crie uma página nova.' },
      { alvo: 'Buscar páginas', texto: 'Busque as páginas pelo título.' },
      { alvo: 'Compartilhar', texto: 'Compartilhe a página com outros usuários ou por link.' },
      { alvo: 'Adicionar bloco', texto: 'Escreva em blocos: títulos, listas, checklists e mais.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Departamento Pessoal
// ---------------------------------------------------------------------------
const m = (alvo: string, texto: string): MarcaTela => ({ alvo, texto });
TELAS_TREINAMENTO.push(
  { id: 'dpd-1', secao: 'dashboard', titulo: 'O painel do DP', marcas: [
    m('Novo Colaborador', 'Cadastre um novo colaborador.'),
    m('Gerar e compartilhar link do formulário de admissão', 'Envie o link de admissão para o candidato preencher pelo celular.'),
    m('Nova Ocorrência', 'Registre uma ocorrência (falta, atestado, atraso...).'),
    m('Alertas de Documentação', 'Acompanhe ASO e documentos perto de vencer.'),
  ] },
  { id: 'col-1', secao: 'colaboradores', titulo: 'A lista de colaboradores', marcas: [
    m('Buscar colaborador', 'Busque pelo nome.'),
    m('Todos os Status', 'Filtre por status e por empresa.'),
    m('Novo Cadastro', 'Cadastre um novo colaborador.'),
    m('Visualizar Ficha Cadastral Completa', 'Na linha: ver a ficha, programar férias, registrar ocorrência, editar ou inativar.'),
    m('Exportar para Excel', 'Exporte a lista filtrada em Excel ou CSV.'),
  ] },
  { id: 'pre-1', secao: 'preadmissoes', titulo: 'As pré-admissões recebidas', marcas: [
    m('Gerar / Enviar Link de Admissão', 'Envie o link de admissão para o candidato.'),
    m('Pendente', 'Filtre pelos formulários que ainda precisam de conferência.'),
    m('Ver Ficha Completa', 'Confira os dados e os documentos enviados.'),
    m('Efetivar Admissão', 'Efetive: o candidato vira colaborador (complete cargo, salário e empresa).'),
  ] },
  { id: 'cus-1', secao: 'custos', titulo: 'O custo mensal por colaborador', marcas: [
    m('Buscar por colaborador ou cargo', 'Busque por colaborador ou cargo.'),
    m('Todas as Empresas', 'Filtre por empresa.'),
    m('Custo Total Empresa', 'Veja o custo total de cada pessoa (salário, encargos, provisões e benefícios).'),
    m('Exportar Excel', 'Exporte a planilha completa.'),
  ] },
  { id: 'va-1', secao: 'vale_alimentacao', titulo: 'A quinzena do vale-alimentação', marcas: [
    m('Nova Quinzena', 'Cadastre a quinzena (início e fim).'),
    m('1ª QUINZENA - OUTUBRO/2026', 'Escolha a quinzena para ver os lançamentos.'),
    m('Diárias', 'O sistema calcula as diárias (faltas, férias e suspensões descontam).'),
    m('Enviar aviso de liberação por WhatsApp', 'Avise o colaborador do valor pelo WhatsApp ou e-mail.'),
  ] },
  { id: 'fer-1', secao: 'ferias', titulo: 'A programação de férias', marcas: [
    m('Programar Férias', 'Programe as férias de um colaborador.'),
    m('Prazo Limite Gozo (CLT)', 'Acompanhe o prazo legal para cada um tirar férias.'),
    m('Enviar aviso de férias por WhatsApp', 'Avise o colaborador pelo WhatsApp ou e-mail.'),
    m('Aviso & Recibo p/ Assinatura', 'Envie o aviso e o recibo de férias para assinatura pelo celular.'),
    m('Relatório PDF por Período', 'Gere o relatório de férias de um período.'),
  ] },
  { id: 'aso-1', secao: 'saude', titulo: 'O controle de ASO', marcas: [
    m('Buscar por colaborador ou cargo', 'Busque o colaborador.'),
    m('Todos os Status', 'Filtre pelos vencidos ou a vencer em 30 dias.'),
    m('Data de Vencimento', 'Confira a data de vencimento de cada ASO.'),
    m('Renovar ASO', 'Registre o novo exame e anexe o atestado digitalizado.'),
    m('Exportar Relatório ANVISA', 'Exporte o relatório para auditoria.'),
  ] },
  { id: 'epi-1', secao: 'epis', titulo: 'As entregas de EPI', marcas: [
    m('Nova Entrega', 'Registre uma entrega (itens, tamanho, CA e assinatura).'),
    m('Link do Formulário Público de Entrega de EPI', 'Use o formulário de campo para registrar entregas sem login.'),
    m('Ver ficha de EPI', 'Veja a ficha de EPI com todas as entregas da pessoa.'),
    m('Anexar', 'Anexe o recibo assinado, se for em papel.'),
  ] },
  { id: 'cc-1', secao: 'contracheques', titulo: 'Os contracheques da folha', marcas: [
    m('Importar Contracheques', 'Importe o PDF da folha — o sistema separa por colaborador.'),
    m('Todas as competências', 'Escolha a competência (mês).'),
    m('Enviar por WhatsApp', 'Envie o link de assinatura pelo WhatsApp.'),
    m('Visualizado', 'Acompanhe quem já abriu e quem já assinou.'),
    m('Baixar o documento com a página de comprovante', 'Baixe o contracheque assinado, com a página de comprovação.'),
  ] },
  { id: 'onb-1', secao: 'onboarding', titulo: 'O checklist de admissão', marcas: [
    m('Buscar colaborador', 'Busque o novo colaborador.'),
    m('6. Entrega do fardamento', 'Marque cada etapa conforme for concluída.'),
    m('Ver Norteadores Completos', 'Apresente os norteadores estratégicos da JMT.'),
  ] },
  { id: 'oco-1', secao: 'ocorrencias', titulo: 'O registro de ocorrências', marcas: [
    m('Nova Ocorrência', 'Registre uma ocorrência.'),
    m('Abrir Formulário de Campo dos Supervisores', 'Formulário de campo: o supervisor registra pelo celular.'),
    m('Buscar por colaborador ou motivo', 'Busque por colaborador ou motivo.'),
    m('Anexo / Comprovante', 'Veja o comprovante anexado (atestado, foto).'),
    m('Excel', 'Exporte em Excel.'),
  ] },
  { id: 'oco-2', secao: 'ocorrencias', titulo: 'Registrando uma ocorrência', marcas: [
    m('Colaborador *', 'Escolha o colaborador.'),
    m('Tipo de Ocorrência *', 'Escolha o tipo (falta, atraso, atestado, afastamento...).'),
    m('Data da Ocorrência *', 'Informe a data.'),
    m('Descrição / Justificativa *', 'Descreva o que aconteceu.'),
    m('Anexar Comprovante', 'Anexe o atestado ou a foto.'),
    m('Registrar Ocorrência', 'Registre. Faltas e suspensões descontam o vale-alimentação.'),
  ] },
  { id: 'dis-1', secao: 'disciplinar', titulo: 'As medidas disciplinares', marcas: [
    m('Nova medida', 'Proponha uma nova medida (advertência ou suspensão).'),
    m('aguardando sua aprovação', 'O administrador aprova ou rejeita as medidas propostas.'),
    m('Progressão por colaborador', 'Veja a gradação de cada colaborador nos últimos 12 meses.'),
    m('Buscar colaborador', 'Busque o colaborador.'),
  ] },
  { id: 'dis-2', secao: 'disciplinar', titulo: 'Propondo uma medida', marcas: [
    m('Nova medida disciplinar', 'O sistema sugere a etapa pela reincidência dos últimos 12 meses.'),
    m('Descrição do fato', 'Descreva o fato com clareza (data, local, o que aconteceu).'),
    m('Enquadramento (art. 482 da CLT)', 'Marque o enquadramento na CLT.'),
    m('Registrar medida', 'Registre — o documento vai para o colaborador assinar a ciência.'),
  ] },
  { id: 'freq-1', secao: 'frequencia', titulo: 'A frequência de hoje', marcas: [
    m('Hoje', 'Quem já bateu, quem não bateu e quem chegou atrasado.'),
    m('Espelho do colaborador', 'O mês de cada colaborador, com ajustes e justificativas.'),
    m('Resumo do mês', 'Faltas, atrasos e horas de todos, em PDF ou Excel.'),
    m('Jornadas, bases e links', 'Cadastre a base, a jornada de cada um e envie o link do ponto.'),
    m('Situação', 'A situação de cada pessoa hoje.'),
  ] },
  { id: 'freq-2', secao: 'frequencia', titulo: 'O espelho do colaborador', marcas: [
    m('Escolha o colaborador', 'Escolha o colaborador (e o mês, no topo).'),
    m('Incluir batida (ajuste)', 'Inclua uma batida esquecida, com motivo.'),
    m('Justificar o dia', 'Justifique o dia (atestado, folga, falta legal).'),
    m('Baixar PDF', 'Baixe o espelho em PDF ou Excel.'),
    m('Enviar para assinatura', 'Envie o espelho para o colaborador assinar pelo celular.'),
  ] },
  { id: 'edu-1', secao: 'educacao', titulo: 'O Portal de Educação', marcas: [
    m('Novo treinamento', 'Monte um treinamento: vídeos, materiais, textos, imagens e prova.'),
    m('Importar documento', 'Ou monte a partir de um PDF, Word ou texto colado.'),
    m('Treinamentos do sistema', 'Treinamentos prontos de uso do sistema.'),
    m('Acompanhamento', 'Acompanhe quem fez, a nota e o certificado.'),
    m('Atribuir', 'Atribua um treinamento a pessoas específicas.'),
  ] },
  { id: 'ani-1', secao: 'aniversariantes', titulo: 'Os aniversariantes do mês', marcas: [
    m('Mês Anterior', 'Navegue pelos meses.'),
    m('Destaques (7 Dias)', 'Veja os aniversários dos próximos 7 dias.'),
    m('Imprimir Mural', 'Imprima o mural para o quadro de avisos.'),
    m('Exportar XLSX', 'Exporte a lista.'),
  ] },
  { id: 'arq-1', secao: 'arquivo', titulo: 'O arquivo de desligados', marcas: [
    m('Buscar colaborador', 'Busque o ex-colaborador.'),
    m('Visualizar Ficha Cadastral Completa', 'Abra a ficha com o histórico e o motivo do desligamento.'),
    m('Exportar para Excel', 'Exporte a lista.'),
  ] },
  { id: 'car-1', secao: 'cargos', titulo: 'Cargos, supervisores e cadastros de apoio', marcas: [
    m('2.10 Cargos e Salários', 'Cargos com o piso da CCT e a faixa salarial.'),
    m('2.17 Supervisores', 'Cadastro dos supervisores e dos setores que acompanham.'),
    m('2.18 Feriados', 'Feriados e calendário da empresa.'),
    m('CCT 2026/2028', 'Consulte os pisos e as cláusulas da convenção coletiva.'),
  ] },
);
TELAS_TREINAMENTO.push(
  { id: 'vg-1', secao: 'visao_geral', titulo: 'O painel geral', marcas: [
    m('Agenda da Gestão', 'Veja a agenda do dia.'),
    m('Cadastrar novo colaborador na folha', 'Atalhos: novo colaborador, link de admissão, ocorrência e novo cliente.'),
    m('Exportar Relatório Geral', 'Exporte o relatório geral.'),
  ] },
  { id: 'cli-1', secao: 'clientes', titulo: 'A carteira de clientes', marcas: [
    m('Novo Cliente', 'Cadastre um cliente: dados, contatos, faixa de temperatura e tarifário.'),
    m('Buscar por cliente, CNPJ', 'Busque por nome, CNPJ, código ou cidade.'),
    m('Todos os Status', 'Filtre por status, segmento e temperatura.'),
    m('Editar Cliente', 'Edite o cadastro ou registre uma interação.'),
    m('Exportar Carteira em Planilha CSV', 'Exporte a carteira.'),
  ] },
  { id: 'fa-1', secao: 'farma_aereo', titulo: 'A operação Farma Aéreo', marcas: [
    m('Visão Geral & DRE', 'O resultado da operação (DRE).'),
    m('Empresas Atreladas', 'Os clientes atendidos pela operação.'),
    m('Equipe do Setor', 'A equipe da operação.'),
    m('Faturamento (', 'Lance ou importe o faturamento.'),
    m('Controle Financeiro', 'Acompanhe as faturas.'),
    m('Custos Operacionais Totais', 'Os custos da operação — lançados na aba Custos Operacionais (combustível, manutenção, diárias).'),
  ] },
  { id: 'fr-1', secao: 'farma_rodoviario', titulo: 'A operação Farma Rodoviário', marcas: [
    m('Visão Geral & DRE', 'O resultado da operação (DRE).'),
    m('Empresas Atreladas', 'Os clientes atendidos pela operação.'),
    m('Equipe do Setor', 'A equipe da operação.'),
    m('Faturamento (', 'Lance ou importe o faturamento.'),
    m('Controle Financeiro', 'Acompanhe as notas e faturas.'),
    m('Custos Operacionais Totais', 'Os custos da operação — lançados na aba Custos Operacionais (combustível, manutenção, diárias).'),
  ] },
  { id: 'prj-1', secao: 'projetos', titulo: 'Os projetos e OKRs', marcas: [
    m('Novo Projeto Gerencial', 'Crie um projeto: objetivo, responsável, prazo e orçamento.'),
    m('Portfólio', 'Veja todos os projetos.'),
    m('Quadro de Ações (Kanban)', 'Acompanhe as ações no quadro.'),
    m('Matriz de Risco', 'Avalie os riscos.'),
    m('Enviar Resumo', 'Envie o resumo por WhatsApp ou e-mail.'),
  ] },
  { id: 'age-1', secao: 'agenda_gestao', titulo: 'A agenda da gestão', marcas: [
    m('Nova Atividade', 'Agende reuniões, auditorias e prazos.'),
    m('Kanban', 'Troque a visualização: mês, semana, dia, lista ou kanban.'),
    m('Auditoria RDC 430', 'Filtre pelo tipo de atividade.'),
    m('Exportar todas as atividades', 'Exporte a agenda.'),
  ] },
  { id: 'ctl-1', secao: 'controladoria', titulo: 'A controladoria', marcas: [
    m('DRE Gerencial', 'A DRE do mês, consolidada ou por operação.'),
    m('Orçado x Realizado', 'Compare o planejado com o realizado.'),
  ] },
  { id: 'usr-1', secao: 'usuarios', titulo: 'Os logins e permissões', marcas: [
    m('Novo Login de Acesso', 'Crie um login (ou convide por e-mail).'),
    m('Buscar por nome, login', 'Busque o login.'),
    m('Matriz de Acesso Rápido', 'Libere ou tire módulos de cada login rapidamente.'),
    m('Revogar acesso ao módulo', 'Cada ícone liga/desliga um módulo para a pessoa.'),
  ] },
);

export const telasDaSecao =(secao: string) => TELAS_TREINAMENTO.filter((t) => t.secao === secao);

/** Endereço público da imagem (servida pelo próprio site). */
export const urlTela = (id: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/treinamento-sistema/${id}.png`;
