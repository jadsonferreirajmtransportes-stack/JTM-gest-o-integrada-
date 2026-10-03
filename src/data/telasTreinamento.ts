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

export const telasDaSecao = (secao: string) => TELAS_TREINAMENTO.filter((t) => t.secao === secao);

/** Endereço público da imagem (servida pelo próprio site). */
export const urlTela = (id: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/treinamento-sistema/${id}.png`;
