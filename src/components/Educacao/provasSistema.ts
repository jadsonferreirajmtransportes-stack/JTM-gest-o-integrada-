// ============================================================================
// Provinhas dos "Treinamentos do sistema" (pedido de 2026-10-22): 4 perguntas por
// módulo, 3 alternativas, tiradas do mesmo conteúdo do manual (manualSistema.ts)
// que o treinamento mostra. Nota mínima 70 = acertar 3 de 4. A correção é no
// servidor (o gabarito nunca vai para o celular); pode refazer se não passar.
// Formato: [enunciado, [alternativas], índice da certa].
// ============================================================================

import type { PerguntaProva, ProvaTreinamento } from '../../utils/educacaoApi';

type Q = [string, string[], number];

const PROVAS: Record<string, Q[]> = {
  app_colaborador: [
    ['Onde você bate o ponto pelo app JMT Colaborador?', ['Em "Ponto", na barra de baixo, tocando no botão grande', 'Em "Fale com o DP", mandando uma mensagem', 'Só pelo computador do escritório'], 0],
    ['O horário que fica registrado na batida é:', ['O do relógio do seu celular', 'O do sistema (servidor), não o do celular', 'O que você digitar'], 1],
    ['O celular é emprestado ou de outra pessoa. O que fazer?', ['Marcar "Lembrar neste celular" para facilitar', 'Mandar o seu link para o dono do celular', 'Não marcar "Lembrar neste celular" e, ao terminar, usar Mais → "Sair deste celular"'], 2],
    ['Apareceu o aviso amarelo de dia com batida faltando. O que fazer?', ['Tocar no aviso, ver o "Meu histórico" e, se precisar, pedir o ajuste em "Fale com o DP"', 'Ignorar, o sistema corrige sozinho', 'Bater o ponto de novo várias vezes'], 0],
  ],
  comunicados: [
    ['Como o texto do comunicado é escrito?', ['Em texto livre, do jeito que cada um preferir', 'Preenchendo os pontos-chave da categoria; o sistema redige no padrão JMT', 'Copiando de um comunicado antigo'], 1],
    ['Quais formatos um comunicado gera?', ['Só mensagem de WhatsApp', 'Só PDF', 'Texto (WhatsApp/e-mail), imagem e PDF timbrado'], 2],
    ['Para saber quem leu e confirmou um aviso importante, você deve:', ['Marcar "Pedir confirmação de ciência" e acompanhar a tabela de quem abriu e confirmou', 'Perguntar um por um no WhatsApp', 'Imprimir e pedir assinatura em papel'], 0],
    ['Para mudar o texto final de um comunicado, você:', ['Edita a imagem no celular', 'Ajusta os campos (pontos-chave) — o texto é refeito a partir deles', 'Pede para o DP reescrever'], 1],
  ],
  compras: [
    ['Como se pede a compra de um item?', ['Pelo WhatsApp do diretor', 'Comprando e pedindo reembolso depois', 'Em "Nova Solicitação", com itens, quantidade, valor estimado, urgência e anexo do orçamento'], 2],
    ['Quem não tem login no sistema pode pedir uma compra?', ['Sim, pelo "Link Público"', 'Não, só quem tem login', 'Só por e-mail'], 0],
    ['Quem aprova ou recusa uma solicitação de compra?', ['O próprio solicitante', 'A diretoria (recusa sempre com motivo)', 'O fornecedor'], 1],
    ['O que o botão "Baixar PDF" faz em Compras?', ['Gera a nota fiscal', 'Gera a lista do filtro atual no padrão JMT', 'Apaga as solicitações antigas'], 1],
  ],
  instrucoes: [
    ['O que é uma Instrução de Trabalho (IT)?', ['Um procedimento padronizado de como fazer um processo, com responsáveis, fluxo, indicadores e riscos', 'Um comunicado de aviso', 'Um contrato com cliente'], 0],
    ['Quais ITs aparecem para os colaboradores no Portal de Educação?', ['Todas, inclusive rascunhos', 'Só as marcadas como Vigente', 'Nenhuma'], 1],
    ['Ao criar uma Nova Instrução, você pode:', ['Só escrever do zero', 'Só importar de outro sistema', 'Escolher a operação e um modelo (ou começar do zero)'], 2],
    ['Qual é o papel do supervisor em relação às ITs?', ['Garantir que a equipe conhece e segue as ITs vigentes', 'Nenhum, é só do DP', 'Apagar as ITs antigas'], 0],
  ],
  documentos: [
    ['Que tipos de arquivo dá para importar na Padronização de Documentos?', ['Só imagens', 'PDF, Word (.docx) e Excel', 'Só texto digitado'], 1],
    ['O que é o "crivo do padrão"?', ['A lista do que falta ou está fora do padrão JMT, com correção automática de espaços, pontuação e datas', 'Uma senha para abrir o documento', 'O histórico de versões'], 0],
    ['Um PDF escaneado (foto do papel) não tem texto para ler. O que fazer?', ['Importar assim mesmo, o sistema lê a foto', 'Desistir do documento', 'Importar a versão em Word ou digitar'], 2],
    ['Depois de "Publicar versão", como mudar o documento?', ['Editando direto, ele continua aberto', 'Usando "Nova revisão"', 'Apagando e importando de novo'], 1],
  ],
  chat: [
    ['Como se envia uma mensagem no Chat interno?', ['Escolhendo a conversa à esquerda, escrevendo embaixo e apertando Enter', 'Mandando e-mail', 'Ligando para a pessoa'], 0],
    ['O clipe no Chat serve para:', ['Fixar a conversa no topo', 'Anexar imagem ou PDF', 'Apagar a conversa'], 1],
    ['As demandas do "Fale com o DP" aparecem no Chat para:', ['Todos os usuários', 'Ninguém', 'Quem tem acesso ao Fale com o DP'], 2],
    ['O que o colaborador vê quando o DP responde uma demanda pelo Chat?', ['A resposta no Fale com o DP do portal dele', 'Nada, fica só no Chat', 'Um e-mail automático'], 0],
  ],
  notas: [
    ['Como organizar as anotações por assunto em Notas & Ideias?', ['Criando sub-páginas', 'Usando cores diferentes', 'Não dá para organizar'], 0],
    ['Uma nota compartilhada por link fica:', ['Editável por qualquer pessoa', 'Somente leitura', 'Apagada depois de 24 horas'], 1],
    ['Para começar uma anotação nova, você clica em:', ['"Nova Atividade"', '"Novo Comunicado"', '"Nova Página"'], 2],
    ['Dá para vincular uma página de notas a um cliente, projeto ou colaborador?', ['Sim', 'Não', 'Só a clientes'], 0],
  ],
  primeiros_passos: [
    ['Por que você não vê todos os módulos no menu?', ['O sistema está com defeito', 'Você só vê os módulos liberados para o seu login', 'Os módulos aparecem só no fim do mês'], 1],
    ['Onde abrir a ajuda da tela em que você está?', ['No botão "?" no topo (ou F1)', 'No menu "Sair"', 'Só ligando para o suporte'], 0],
    ['Como colaboradores e candidatos sem login usam o sistema?', ['Pedindo a senha do supervisor', 'Não usam', 'Por links que abrem no celular, confirmando CPF (e às vezes data de nascimento)'], 2],
    ['Sobre prints com CPF, salário ou dados de saúde:', ['Pode mandar em grupos de WhatsApp', 'Não compartilhe fora do sistema (LGPD)', 'Pode postar, desde que seja colega'], 1],
  ],
  jornal: [
    ['Quando um supervisor escreve uma notícia, ela:', ['É publicada na hora', 'Vai para aprovação do administrador', 'Vai só para o supervisor ver'], 1],
    ['Um comentário de colaborador aparece para os outros:', ['Depois que o administrador aprova', 'Imediatamente', 'Nunca'], 0],
    ['Qual cuidado com fotos de pessoas no Jornal?', ['Nenhum', 'Só usar foto de celular', 'Ter autorização de uso de imagem e não mostrar documentos, crachás, placas ou dados de clientes'], 2],
    ['O que "Arquivar" faz com uma notícia?', ['Apaga para sempre', 'Tira do portal sem apagar', 'Fixa no topo'], 1],
  ],
  frequencia: [
    ['O ponto pelo celular do sistema é:', ['O ponto oficial da empresa', 'Um controle interno, que não substitui o ponto oficial', 'Opcional e sem registro'], 1],
    ['No espelho do mês, como corrigir uma batida esquecida?', ['Incluindo a batida (+) com motivo — fica registrado quem fez', 'Pedindo para o colaborador bater de novo no dia seguinte', 'Não dá para corrigir'], 0],
    ['Batida em vermelho no espelho significa:', ['Atraso', 'Ajuste do DP', 'Batida longe da base'], 2],
    ['Celular trocado ou link vazado. O que fazer?', ['Nada', '"Desconectar celulares" na lista de colaboradores', 'Criar outro cadastro para a pessoa'], 1],
  ],
  ocorrencias: [
    ['Ao registrar uma falta ou atestado, o que anexar?', ['O comprovante (atestado, foto)', 'Nada', 'O contracheque'], 0],
    ['Como supervisores de campo registram ocorrências pelo celular?', ['Mandando áudio para o DP', 'Pelo formulário de campo ("Gerar Link / WhatsApp")', 'Não registram'], 1],
    ['Qual o impacto de faltas e suspensões?', ['Nenhum', 'Aumentam o salário', 'Descontam o vale-alimentação automaticamente'], 2],
    ['Advertências e suspensões com gradação e ciência ficam:', ['No módulo Disciplinar', 'No Chat', 'Em Notas & Ideias'], 0],
  ],
  disciplinar: [
    ['Qual é a gradação do Regulamento?', ['Justa causa direto', 'Verbal → escrita → 2ª escrita → suspensão (1/3/5 dias) → justa causa', 'Suspensão → verbal → justa causa'], 1],
    ['Quem propõe e quem aprova uma medida disciplinar?', ['O supervisor propõe; o administrador aprova ou rejeita', 'O colaborador propõe', 'Qualquer um aprova'], 0],
    ['O colaborador se recusou a assinar a ciência. O que fazer?', ['Desistir da medida', 'Assinar no lugar dele', 'Registrar a recusa com duas testemunhas'], 2],
    ['Assinar a ciência significa que o colaborador:', ['Concorda com a medida', 'Tomou conhecimento (ciência não é concordância)', 'Pediu demissão'], 1],
  ],
  epis: [
    ['O que comprova a entrega de um EPI?', ['O recibo assinado pelo colaborador', 'Uma foto do almoxarifado', 'Nada, basta entregar'], 0],
    ['Onde ver todas as entregas de EPI de uma pessoa?', ['No Chat', 'Na ficha de EPI do colaborador', 'Nos comunicados'], 1],
    ['Recusa injustificada ao uso de EPI é:', ['Permitida', 'Assunto só do colaborador', 'Falta grave (CLT art. 158) — registre no Disciplinar'], 2],
    ['Dá para registrar entrega de EPI sem login?', ['Sim, pelo "Link do Formulário"', 'Não', 'Só por e-mail'], 0],
  ],
  dashboard: [
    ['O quadro "Atenção CLT" do Painel DP mostra:', ['Os aniversariantes', 'O que está perto do limite legal (férias, ASO)', 'As notícias do Jornal'], 1],
    ['Quais atalhos ficam no topo do Painel DP?', ['Novo Colaborador, Link de Admissão e Nova Ocorrência', 'Só "Sair"', 'Nenhum'], 0],
    ['O Painel DP resume:', ['Faturamento dos clientes', 'Viagens rodoviárias', 'ASO, férias, ocorrências e documentos'], 2],
    ['Para cadastrar um novo colaborador rapidamente a partir do painel, use:', ['"Nova Ocorrência"', '"Novo Colaborador"', '"Link de Admissão" para o próprio DP'], 1],
  ],
  colaboradores: [
    ['Qual o limite de anexos no cadastro do colaborador?', ['20MB somando os anexos', 'Sem limite', '1MB por arquivo'], 0],
    ['Por que CPF e data de nascimento precisam estar corretos?', ['Só para o aniversário', 'Para o colaborador entrar no portal, no ponto e nos links de assinatura', 'Não precisam'], 1],
    ['Como registrar a demissão de um colaborador?', ['Apagando o cadastro', 'Mudando o nome', 'Inativando (demissão) na linha do colaborador'], 2],
    ['O botão "Comunicado" na lista de colaboradores:', ['Manda uma mensagem por WhatsApp para os colaboradores filtrados', 'Imprime o contracheque', 'Exclui os filtrados'], 0],
  ],
  preadmissoes: [
    ['Como o candidato envia seus dados de admissão?', ['Indo ao escritório com papéis', 'Pelo link de admissão, com fotos dos documentos', 'Por e-mail para o diretor'], 1],
    ['O que "Efetivar Admissão" faz?', ['Cria o colaborador com os dados do formulário', 'Recusa o candidato', 'Apaga o formulário'], 0],
    ['Depois de efetivar, o que ainda precisa completar?', ['Nada', 'Só a foto', 'Cargo, salário, empresa e supervisor'], 2],
    ['Onde ficam os formulários que chegaram e ainda não foram conferidos?', ['Em "Pendentes de Análise"', 'No Jornal', 'Na Agenda'], 0],
  ],
  onboarding: [
    ['O checklist de onboarding inclui:', ['Norteadores JMT, treinamento RDC 430 e entrega de EPIs', 'Só a assinatura do contrato', 'Faturamento do mês'], 0],
    ['Como usar o checklist?', ['Imprimir e guardar', 'Buscar o colaborador e marcar cada etapa concluída', 'Mandar para o cliente'], 1],
    ['O onboarding é feito para:', ['Clientes novos', 'Fornecedores', 'Colaboradores recém-admitidos'], 2],
    ['O treinamento RDC 430 no onboarding se refere a:', ['Boas práticas de transporte de medicamentos (ANVISA)', 'Regras de trânsito', 'Uso do Chat'], 0],
  ],
  custos: [
    ['O Custo Mensal por Colaborador mostra:', ['Só o salário', 'Salário, adicionais, encargos, provisões e benefícios da CCT', 'Só os benefícios'], 1],
    ['Como filtrar os custos?', ['Por empresa, setor ou nome', 'Não dá para filtrar', 'Só por data de admissão'], 0],
    ['Para levar os valores para uma planilha, use:', ['Print da tela', 'Copiar e colar linha a linha', '"Exportar Excel"'], 2],
    ['Quem deve ter acesso a essa tela?', ['Todos os colaboradores', 'Só quem precisa — ela tem dados salariais', 'Clientes'], 1],
  ],
  vale_alimentacao: [
    ['O que desconta diárias do vale-alimentação?', ['Faltas, férias e suspensões', 'Horas extras', 'Aniversário'], 0],
    ['O que "Disponibilizar no portal" faz?', ['Paga o vale', 'Coloca o demonstrativo da quinzena em Documentos, no link pessoal, para conferir e assinar', 'Apaga a quinzena'], 1],
    ['Um demonstrativo já disponibilizado está errado. Como corrigir?', ['Ele se corrige sozinho', 'Não dá', 'Ajustar o lançamento, excluir o demonstrativo da pessoa e disponibilizar de novo'], 2],
    ['Como avisar quem ainda não assinou o demonstrativo?', ['"Enviar pendentes" (WhatsApp)', 'Ligando um por um', 'Não precisa avisar'], 0],
  ],
  ferias: [
    ['Onde aparece o prazo limite das férias (CLT)?', ['Na lista de férias, ao programar', 'Só no contracheque', 'Em lugar nenhum'], 0],
    ['O que "Programação p/ assinar" faz?', ['Paga as férias', 'Gera a Programação de Férias e coloca em Documentos para o colaborador conferir e assinar', 'Cancela as férias'], 1],
    ['Mudou a data das férias depois de gerar a programação. O que fazer?', ['Nada', 'Criar outro colaborador', 'Clicar de novo em "Programação p/ assinar" — a versão sem assinatura é substituída'], 2],
    ['Como baixar o aviso/recibo já assinado?', ['"Baixar assinados" na linha das férias', 'Pedindo ao colaborador um print', 'Não dá'], 0],
  ],
  saude: [
    ['O ASO "a vencer" é o que vence em:', ['30 dias', '1 ano', '1 dia'], 0],
    ['Como registrar um exame renovado?', ['"Renovar ASO", com o atestado digitalizado', 'Só anotar no papel', 'Mandar no Chat'], 0],
    ['Para auditoria da ANVISA, use:', ['Print da tela', '"Exportar Relatório ANVISA"', 'O Jornal JMT'], 1],
    ['Ao agendar a renovação periódica, você informa:', ['Só a data', 'Nada', 'Clínica, data e horário, e pode avisar o colaborador por WhatsApp'], 2],
  ],
  contracheques: [
    ['Como o sistema separa a folha importada em contracheques?', ['Por pessoa, competência e tipo, pelo CPF', 'Pelo nome digitado à mão', 'Não separa'], 0],
    ['Um contracheque não apareceu depois de importar. O que conferir?', ['A internet', 'Se a pessoa está cadastrada com o CPF certo, e importar de novo', 'O nome do arquivo'], 1],
    ['Como o colaborador assina o contracheque?', ['Imprimindo e trazendo assinado', 'Por e-mail', 'Pelo link: confirma o CPF, confere e assina com o dedo'], 2],
    ['Algo mudou num contracheque já enviado. O que fazer?', ['"Solicitar nova assinatura" na linha, sem reimportar', 'Apagar a folha inteira', 'Nada'], 0],
  ],
  educacao: [
    ['O que um treinamento pode ter?', ['Vídeo por link, PDF, Instrução de Trabalho, texto e prova com nota mínima', 'Só texto', 'Só vídeo enviado do computador'], 0],
    ['Como os vídeos entram no treinamento?', ['Enviando o arquivo de vídeo para o sistema', 'Por link (YouTube "Não listado", Vimeo ou Google Drive)', 'Não entram'], 1],
    ['O que a validade do treinamento faz?', ['Apaga o treinamento', 'Nada', 'O treinamento volta sozinho para a pessoa quando vence (reciclagem)'], 2],
    ['Onde acompanhar a nota e o certificado de cada um?', ['Na aba Acompanhamento', 'No Chat', 'Na Agenda'], 0],
  ],
  aniversariantes: [
    ['Como trocar o mês na tela de aniversariantes?', ['Pelas setas', 'Recarregando a página', 'Não dá'], 0],
    ['O que "Felicitar" faz?', ['Manda um e-mail', 'Abre o WhatsApp com a mensagem pronta', 'Publica no Jornal na hora'], 1],
    ['"Imprimir Mural" serve para:', ['Imprimir contracheques', 'Imprimir a folha de ponto', 'O quadro de avisos com os aniversariantes'], 2],
    ['A notícia automática de aniversário no Jornal mostra a idade?', ['Não, nunca mostra a idade', 'Sim', 'Só para maiores de 40'], 0],
  ],
  arquivo: [
    ['O Arquivo de Desligados guarda:', ['Os candidatos', 'O histórico dos colaboradores desligados, com motivo e data da rescisão', 'Os clientes inativos'], 1],
    ['Como ver o histórico de um ex-colaborador?', ['Buscar a pessoa e abrir a ficha', 'Pedir ao contador', 'Não dá'], 0],
    ['Um colaborador desligado vai para o Arquivo quando:', ['Faz aniversário', 'Tira férias', 'É inativado (demissão) no cadastro'], 2],
    ['Os dados do Arquivo devem ser:', ['Compartilhados livremente', 'Tratados com cuidado — são dados pessoais (LGPD)', 'Apagados no mesmo dia'], 1],
  ],
  cargos: [
    ['Ao cadastrar um cargo, o que se informa?', ['Função normativa, piso da CCT e faixa salarial mínima/máxima', 'Só o nome', 'O nome do colaborador'], 0],
    ['O piso do cargo vem de:', ['Escolha livre', 'Da CCT (convenção coletiva)', 'Do cliente'], 1],
    ['Nessa área também se cadastram:', ['Clientes', 'Notícias', 'Operações, feriados e supervisores (cadastros de apoio)'], 2],
    ['Por que manter os cargos corretos?', ['Eles alimentam salários, custos e a atribuição de treinamentos por cargo', 'Não tem importância', 'Só para o organograma'], 0],
  ],
  visao_geral: [
    ['O que fica no topo da Visão Geral?', ['Indicadores do mês: faturamento (aéreo, rodoviário, total) e custo da folha', 'O Chat', 'Os contracheques'], 0],
    ['Para ver todos os alertas, você clica em:', ['"Sair"', '"Ver todos os alertas"', '"Imprimir"'], 1],
    ['Os cartões "Acessar..." servem para:', ['Excluir módulos', 'Trocar a senha', 'Ir direto para cada módulo'], 2],
    ['Exemplos de alertas da Visão Geral:', ['ASO vencendo, férias no limite e ocorrências abertas', 'Previsão do tempo', 'Notícias externas'], 0],
  ],
  clientes: [
    ['O que se cadastra em um cliente?', ['Dados, contatos, faixa de temperatura, tarifário, contrato e interações', 'Só o nome', 'Só o CNPJ'], 0],
    ['Como trazer a tabela de frete de uma planilha?', ['Digitando cidade por cidade, obrigatoriamente', '"Importar do Excel" na tabela de frete, conferir e salvar', 'Não dá'], 1],
    ['Os contatos do cliente aparecem também:', ['No Jornal', 'No ponto', 'Como destinatários nos Comunicados para clientes'], 2],
    ['Onde registrar visitas, ligações e negociações?', ['No histórico de interações do cliente', 'No Chat', 'Em Notas'], 0],
  ],
  farma_aereo: [
    ['Quais abas tem a operação Farma Aéreo?', ['Visão Geral & DRE, Empresas, Equipe, Faturamento, Controle Financeiro e Custos', 'Só Faturamento', 'Só Equipe'], 0],
    ['O faturamento lançado na operação:', ['Some no fim do mês', 'Entra na DRE da operação', 'Vai para o contracheque'], 1],
    ['Onde acompanhar as faturas emitidas e recebidas?', ['No Jornal', 'Na Agenda', 'Em Controle Financeiro'], 2],
    ['Uma fatura já emitida muda de valor se a tabela do cliente for trocada?', ['Não — os CT-es em fatura ficam com o valor congelado', 'Sim, sempre', 'Só no aéreo'], 0],
  ],
  farma_rodoviario: [
    ['A operação Farma Rodoviário tem, além das abas do Aéreo:', ['As viagens', 'O Jornal', 'O ponto'], 0],
    ['Onde lançar combustível, manutenção e diárias?', ['No Chat', 'Na aba Custos', 'Em Compras'], 1],
    ['Lançamentos rodoviários de um cliente com tabela própria do Rodoviário usam:', ['A tabela do Aéreo', 'Nenhuma tabela', 'A tabela do Rodoviário'], 2],
    ['Para o cliente aparecer na operação, ele precisa estar:', ['Vinculado ao setor ("Vincular Empresas ao Setor")', 'Com contrato em PDF', 'Com foto'], 0],
  ],
  projetos: [
    ['O que se preenche num Novo Projeto Gerencial?', ['Objetivo, responsável, datas e orçamento', 'Só o nome', 'Só o orçamento'], 0],
    ['Como ver o projeto de jeitos diferentes?', ['Não dá', 'Pelas abas: painel, lista, kanban, cronograma, financeiro e riscos', 'Só imprimindo'], 1],
    ['Dá para anexar arquivos ao projeto?', ['Não', 'Só fotos', 'Sim: orçamentos, fotos e documentos'], 2],
    ['OKR significa:', ['Objetivos e resultados-chave', 'Ordem de compra', 'Ocorrência registrada'], 0],
  ],
  agenda_gestao: [
    ['Que tipos de atividade a Agenda da Gestão registra?', ['Reuniões, auditorias RDC 430, rotinas e prazos', 'Só aniversários', 'Só férias'], 0],
    ['Quais visualizações a Agenda oferece?', ['Só lista', 'Hoje, Semana, Mês, Lista e Kanban', 'Só calendário anual'], 1],
    ['Para a atividade contar na taxa de conclusão, você deve:', ['Apagar a atividade', 'Mudar a data', 'Marcar como concluída'], 2],
    ['No celular, a Agenda fica:', ['Na barra de atalhos de baixo', 'Escondida', 'Só no computador'], 0],
  ],
  controladoria: [
    ['A DRE da Controladoria compara:', ['Orçado x realizado', 'Clientes x fornecedores', 'Férias x faltas'], 0],
    ['De onde vem o valor realizado?', ['É digitado à mão sempre', 'Das operações (faturamento e custos lançados) e da folha', 'De outro sistema'], 1],
    ['A coluna Desvio mostra:', ['Os aniversariantes', 'As faturas atrasadas', 'Onde o mês fugiu do plano'], 2],
    ['Dúvida sobre uma linha da DRE? Leia:', ['"Como ler esta DRE", no topo da tela', 'O manual do Excel', 'O Jornal'], 0],
  ],
  usuarios: [
    ['O que se define ao criar um login?', ['Nome, e-mail, perfil e módulos liberados', 'Só o nome', 'Só a senha'], 0],
    ['Dá para liberar só algumas seções do DP para alguém?', ['Não', 'Sim, e ainda limitar o supervisor à própria equipe', 'Só para o diretor'], 1],
    ['Um módulo novo do sistema começa:', ['Liberado para todos', 'Bloqueado para sempre', 'Desmarcado — marque para quem deve usar'], 2],
    ['Qual a regra de ouro para permissões?', ['Liberar só o necessário — o DP tem dados pessoais e salariais', 'Liberar tudo para todos', 'Não usar permissões'], 0],
  ],
};

let seq = 0;
/** Prova do treinamento do sistema daquele módulo (undefined se ainda não tiver perguntas). */
export function provaDoModulo(secao: string): ProvaTreinamento | undefined {
  const qs = PROVAS[secao];
  if (!qs?.length) return undefined;
  const perguntas: PerguntaProva[] = qs.map(([enunciado, alternativas, correta]) => ({
    id: `pq-${secao}-${(seq++).toString(36)}`,
    enunciado,
    alternativas,
    correta,
  }));
  return { notaMinima: 70, perguntas };
}
