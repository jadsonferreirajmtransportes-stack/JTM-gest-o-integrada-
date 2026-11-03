// ============================================================================
// Treinamento de boas-vindas (integração de novos colaboradores — pedido de
// 2026-11-03): norteadores (propósito, missão, visão, valores, pilares) e o
// Regulamento Interno, com imagens (public/treinamento-boas-vindas, geradas no
// padrão JMT) e provinha. Os textos vêm de strategicGuidelines.ts e de
// regulamentoInterno.ts — mudou lá, é só "Atualizar" o treinamento.
// ============================================================================

import { STRATEGIC_GUIDELINES as N } from '../../data/strategicGuidelines';
import { BlocoRegulamento, ROTULO_VERSAO_REGULAMENTO, SECOES_REGULAMENTO } from '../../data/regulamentoInterno';
import type { ConteudoTreinamento, ProvaTreinamento, Treinamento } from '../../utils/educacaoApi';
import { gerarIdCurto } from '../../utils/educacaoApi';

export const TITULO_BOAS_VINDAS = 'Boas-vindas à JMT — Norteadores e Regulamento Interno';

const img = (arquivo: string, titulo: string) => ({ titulo, imagem: `/treinamento-boas-vindas/${arquivo}.png`, marcas: [] as string[] });
/** Uma parte do treinamento: texto e, se houver, a imagem (aparece em cima do texto). */
const texto = (titulo: string, t: string, imagem?: ReturnType<typeof img>): ConteudoTreinamento => ({
  id: gerarIdCurto('cont'),
  tipo: 'texto',
  titulo,
  texto: t,
  ...(imagem ? { telas: [imagem] } : {}),
});

/** Uma seção do Regulamento em texto corrido (para o treinamento). */
function blocosEmTexto(blocos: BlocoRegulamento[]): string {
  return blocos
    .map((b) => {
      if (b.tipo === 'p') return b.texto;
      if (b.tipo === 'sub') return `*${b.texto}*`;
      if (b.tipo === 'nota') return `Importante: ${b.texto}`;
      if (b.tipo === 'lista') return b.itens.map((i) => `• ${i}`).join('\n');
      return b.linhas.map((l) => `• ${l[0]}: ${l[1]} (${l[2]})`).join('\n');
    })
    .join('\n\n');
}
const secao = (titulo: string) => SECOES_REGULAMENTO.find((s) => s.titulo === titulo);
const textoSecao = (titulo: string) => {
  const s = secao(titulo);
  return s ? blocosEmTexto(s.blocos) : '';
};

const PROVA: ProvaTreinamento = {
  notaMinima: 70,
  perguntas: [
    {
      id: 'bv-p1',
      enunciado: 'Qual é o propósito da JMT (por que existimos)?',
      alternativas: ['Levar saúde com segurança, do remetente ao destino final.', 'Ser a transportadora mais barata da região.', 'Entregar qualquer tipo de carga no menor tempo possível.'],
      correta: 0,
    },
    {
      id: 'bv-p2',
      enunciado: 'Quais são os 4 pilares operacionais de cada entrega?',
      alternativas: ['Velocidade, preço, volume e lucro.', 'Segurança, rastreabilidade, pontualidade e conformidade ANVISA/BPAD.', 'Uniforme, crachá, bota e EPI.'],
      correta: 1,
    },
    {
      id: 'bv-p3',
      enunciado: 'Qual destes é um valor da JMT?',
      alternativas: ['Autonomia com responsabilidade.', 'Resultado a qualquer custo.', 'Cada um por si.'],
      correta: 0,
    },
    {
      id: 'bv-p4',
      enunciado: 'Quantas vezes por dia você registra o ponto numa jornada com intervalo?',
      alternativas: ['Só na entrada.', 'Na entrada e na saída.', '4 vezes: entrada, saída para o intervalo, volta do intervalo e saída.'],
      correta: 2,
    },
    {
      id: 'bv-p5',
      enunciado: 'Você tem uma consulta médica agendada. O que o Regulamento pede?',
      alternativas: ['Avisar com pelo menos 2 dias de antecedência e entregar o atestado ao DP.', 'Faltar e explicar só quando voltar.', 'Não precisa avisar ninguém.'],
      correta: 0,
    },
    {
      id: 'bv-p6',
      enunciado: 'Sobre os EPIs, é correto dizer que:',
      alternativas: ['O colaborador compra os próprios EPIs.', 'São fornecidos gratuitamente pela empresa e o uso é obrigatório; recusar sem motivo é falta.', 'Só precisam ser usados quando o supervisor está olhando.'],
      correta: 1,
    },
    {
      id: 'bv-p7',
      enunciado: 'Você presenciou um caso de assédio. O que fazer?',
      alternativas: ['Não se envolver.', 'Postar nas redes sociais.', 'Comunicar ao supervisor ou ao DP, que tratam com sigilo e sem retaliação a quem comunicou.'],
      correta: 2,
    },
    {
      id: 'bv-p8',
      enunciado: 'Assinar a ciência de uma medida disciplinar significa:',
      alternativas: ['Que você concorda com a medida.', 'Que você tomou conhecimento dela — não que concorda.', 'Que você abre mão dos seus direitos.'],
      correta: 1,
    },
    {
      id: 'bv-p9',
      enunciado: 'Dados de clientes, cargas e colegas a que você tem acesso no trabalho:',
      alternativas: ['Podem ser compartilhados com amigos.', 'Só podem ser usados para o trabalho e devem ser mantidos em sigilo (LGPD).', 'Podem ser postados se não tiver o nome.'],
      correta: 1,
    },
    {
      id: 'bv-p10',
      enunciado: 'Motorista dirigindo o veículo da empresa pode usar o celular?',
      alternativas: ['Sim, se for rápido.', 'Não com o veículo em movimento (CTB, art. 252).', 'Sim, só para mensagens de voz.'],
      correta: 1,
    },
  ],
};

/** Monta o treinamento (sem id — o banco gera ao salvar). */
export function montarTreinamentoBoasVindas(opcoes: { criadoPor?: string; admitidosDesde?: string; prazoDias?: number }): Treinamento {
  const valores = N.valores.map((v) => `• ${v.nome}: ${v.descricao}`).join('\n');
  const pilares = N.pilaresOperacionais.map((p) => `• ${p.nome}: ${p.descricao}`).join('\n');
  const conteudos: ConteudoTreinamento[] = [
    texto(
      'Seja bem-vindo(a)! Quem somos',
      `Que bom ter você com a gente! A ${N.empresa} (${N.sigla}) faz logística de produtos para a saúde: medicamentos, vacinas, materiais hospitalares e cargas que não podem esperar, esquentar nem se perder.\n\nNossa assinatura resume o nosso jeito de trabalhar: *${N.sloganCurto}*.\n\nNeste treinamento você conhece os nossos norteadores — o que guia as decisões da empresa — e o Regulamento Interno, com as regras do dia a dia. No fim tem uma provinha rápida. Leia com calma: ele é a base para tudo o que vem depois.`,
      img('bv-1-boas-vindas', 'Boas-vindas')
    ),
    texto(
      'Norteadores: propósito, missão e visão',
      `*Propósito — ${N.proposito.subtitulo}:* ${N.proposito.frase}\nCada caixa que passa pela sua mão pode ser o remédio de alguém. É por isso que fazemos tudo com tanto cuidado.\n\n*Missão — ${N.missao.subtitulo}:* ${N.missao.frase}\nNa prática: seguir os procedimentos (POPs e Instruções de Trabalho), registrar tudo certinho e cumprir os horários.\n\n*Visão — ${N.visao.subtitulo}:* ${N.visao.frase}\nA reputação da JMT é construída em cada entrega — inclusive na sua.`,
      img('bv-2-norteadores', 'Propósito, missão e visão')
    ),
    texto(
      'Nossos valores',
      `${valores}\n\nUm exemplo: se você perceber uma caixa avariada ou um problema de temperatura, avise na hora — isso é ética, qualidade e foco no cliente ao mesmo tempo. E se tiver uma ideia para melhorar algo, mande pelo app em Sugestões: é melhoria contínua.`,
      img('bv-3-valores', 'Os 6 valores')
    ),
    texto(
      'Os 4 pilares de cada entrega',
      `${pilares}\n\nTrabalhamos com produtos para a saúde, então seguimos as regras da ANVISA (RDC 430/2020 — Boas Práticas de Armazenagem, Distribuição e Transporte). Por isso existem controles de temperatura, registros e conferências: eles protegem o produto e o paciente.`,
      img('bv-4-pilares', 'Pilares operacionais')
    ),
    texto(
      'Regulamento Interno — objetivo',
      `O Regulamento Interno (${ROTULO_VERSAO_REGULAMENTO}) reúne as regras de convivência e de trabalho da JMT. A seguir estão os pontos principais; o texto completo fica no seu link pessoal, em Mais → Regulamento, onde você também assina a ciência.\n\n${textoSecao('Objetivo')}`
    ),
    texto('Jornada de trabalho e ponto', textoSecao('Jornada de trabalho'), img('bv-5-ponto', 'As 4 marcações do ponto')),
    texto('Conduta e comportamento', textoSecao('Conduta e comportamento'), img('bv-7-conduta', 'Tolerância zero')),
    texto(
      'Uniforme, EPI e segurança do trabalho',
      `${textoSecao('Apresentação pessoal, uniformes e EPIs')}\n\n${textoSecao('Segurança do trabalho')}`,
      img('bv-6-uniforme', 'Uniforme por função')
    ),
    texto('Bens e recursos da empresa', textoSecao('Utilização de bens e recursos da empresa')),
    texto('Penalidades e advertências', textoSecao('Penalidades e advertências'), img('bv-8-disciplinar', 'A gradação das medidas')),
    texto('Direitos e deveres', `${textoSecao('Direitos e deveres dos colaboradores')}\n\n${textoSecao('Disposições finais')}`),
    texto(
      'Seus próximos passos',
      [
        '1. Faça a provinha deste treinamento (nota mínima 70).',
        '2. No seu link pessoal, abra Mais → Regulamento, leia a versão completa e assine a ciência.',
        '3. Instale o app JMT Colaborador e toque em "Ativar avisos" — você recebe o lembrete do ponto, comunicados e documentos.',
        '4. Bata o ponto pelo app nas 4 marcações do dia.',
        '5. Dúvidas sobre salário, férias, benefícios ou documentos: use o "Fale com o DP".',
        '6. Viu algo errado na operação (avaria, temperatura, embalagem)? Use "Relatar ocorrência". Tem uma ideia? Mande em "Sugestões".',
        '',
        'Seja bem-vindo(a) ao time. Conte com a gente!',
      ].join('\n')
    ),
  ];
  return {
    id: '',
    titulo: TITULO_BOAS_VINDAS,
    descricao: 'Integração de novos colaboradores: quem somos, propósito, missão, visão, valores, pilares e o Regulamento Interno (jornada, ponto, conduta, uniforme e EPI, medidas disciplinares, direitos e deveres).',
    cargaHorariaMin: 40,
    conteudos,
    prova: PROVA,
    obrigatorioTodos: true,
    obrigatorioCargos: [],
    obrigatorioSetores: [],
    admitidosDesde: opcoes.admitidosDesde,
    validadeMeses: undefined,
    prazoDias: opcoes.prazoDias,
    ativo: true,
    criadoPor: opcoes.criadoPor,
  };
}
