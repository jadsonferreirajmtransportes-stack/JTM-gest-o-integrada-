// ============================================================================
// Regulamento Interno — texto da versão vigente.
//
// Base: "REGULAMENTO INTERNO - JOBSON DE MORAES TRANSPORTES LTDA" (PDF da empresa).
// As regras da empresa (horários, uniformes, penalidades, benefícios) são as do
// documento original — nada foi criado aqui. A revisão só (1) corrigiu a escrita
// e a numeração, (2) acrescentou as referências e limites da própria lei (CLT,
// CTB, NR-6, LGPD) onde a regra encosta nela, e (3) descreveu o rito disciplinar
// que a empresa já adotou no Módulo Disciplinar (gradação, reincidência de 12
// meses, supervisor propõe / DP aplica, ciência com testemunhas na recusa).
//
// Ao mudar o texto: subir VERSAO_REGULAMENTO — os colaboradores precisam assinar
// a versão nova (a referência do documento de assinatura é a versão).
// ============================================================================

export const VERSAO_REGULAMENTO = '2026.10';
export const ROTULO_VERSAO_REGULAMENTO = 'Revisão de outubro de 2026';

export const EMPRESA_REGULAMENTO = {
  razaoSocial: 'JOBSON DE MORAES TRANSPORTES LTDA',
  cnpj: '24.192.148/0001-33',
  endereco: 'Rua Piloto Pereira Tim, nº 316, Galpão 3A, Parque de Exposições',
  cep: '59.146-480',
  cidadeUF: 'Parnamirim/RN',
  segmento: 'Serviços de transporte',
};

export type BlocoRegulamento =
  | { tipo: 'p'; texto: string }
  | { tipo: 'sub'; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'tabela'; cabecalho: string[]; linhas: string[][] }
  | { tipo: 'nota'; texto: string };

export interface SecaoRegulamento {
  titulo: string;
  blocos: BlocoRegulamento[];
}

export const SECOES_REGULAMENTO: SecaoRegulamento[] = [
  {
    titulo: 'Objetivo',
    blocos: [
      {
        tipo: 'p',
        texto:
          'Este Regulamento tem a finalidade de nortear a conduta dos colaboradores da JOBSON DE MORAES TRANSPORTES LTDA no dia a dia de trabalho, visando assegurar a ordem, a segurança, a produtividade e a harmonia no ambiente de trabalho.',
      },
      {
        tipo: 'p',
        texto:
          'As regras aqui descritas complementam o contrato de trabalho e não substituem nem reduzem os direitos garantidos pela Consolidação das Leis do Trabalho (CLT), pela legislação aplicável e pela convenção coletiva da categoria. Em caso de conflito, prevalece a norma mais favorável ao colaborador.',
      },
    ],
  },
  {
    titulo: 'Jornada de trabalho',
    blocos: [
      { tipo: 'p', texto: 'A jornada de trabalho varia conforme a operação:' },
      {
        tipo: 'tabela',
        cabecalho: ['Operação / função', 'Horário (entrada – intervalo – saída)', 'Dias'],
        linhas: [
          ['Farma Rodoviário (motoristas e ajudantes)', '06h00–11h00 / 12h12–16h00', 'Terça a sábado'],
          ['Farma Aéreo (motoristas e ajudantes)', '08h00–12h00 / 13h12–18h00', 'Segunda a sexta'],
          ['Farma Aéreo e Rodoviário (escritórios)', '08h00–12h00 / 13h12–18h00', 'Segunda a sexta'],
          ['Qualidade (responsável técnica)', '08h00–12h00 / 13h12–18h00', 'Segunda a sexta'],
          ['ASG', '07h00–11h00 / 12h12–17h00', 'Segunda a sexta'],
          ['Recebimento e expedição (noturno)', '20h00–00h00 / 01h12–05h10', 'Segunda a sexta'],
          ['Transbordo (Natal x Mossoró)', '00h00–04h00 / 05h00–12h00', 'Terça a sexta'],
          ['Operação Unimed', '10h00–14h00 / 15h12–20h00', 'Segunda a sexta'],
        ],
      },
      {
        tipo: 'p',
        texto:
          'É dever do colaborador cumprir a sua jornada com pontualidade e assiduidade, registrando a entrada, a saída e os intervalos no ponto eletrônico disponibilizado pela empresa.',
      },
      {
        tipo: 'p',
        texto:
          'O intervalo para repouso e alimentação é obrigatório e deve ser efetivamente usufruído (CLT, art. 71). O trabalho entre 22h00 e 05h00 é noturno e observa a hora noturna reduzida e o adicional noturno previstos no art. 73 da CLT.',
      },
      {
        tipo: 'p',
        texto:
          'As horas extras são pagas ou compensadas na forma da lei e da convenção coletiva. Não são descontadas nem computadas como hora extra as variações de registro de até 5 minutos, observado o limite de 10 minutos diários (CLT, art. 58, § 1º).',
      },
      { tipo: 'sub', texto: 'Condutas que podem levar a advertências ou penalidades:' },
      {
        tipo: 'lista',
        itens: [
          'Atrasos reincidentes acima dos 15 minutos de tolerância da empresa, em mais de 3 dias no mesmo mês (advertência, seguindo a gradação do item 7).',
          'Faltas não justificadas, isto é, sem comunicação e sem atestado (desconto em folha do dia e, quando for o caso, do descanso semanal remunerado — Lei nº 605/1949).',
          'Não informar o agendamento de consulta ou exame médico com, no mínimo, 2 dias de antecedência (advertência, seguindo a gradação do item 7).',
        ],
      },
      {
        tipo: 'nota',
        texto:
          'Não são consideradas faltas as ausências permitidas por lei (CLT, art. 473 — por exemplo, falecimento de familiar, casamento, nascimento de filho, doação de sangue, alistamento eleitoral e comparecimento a juízo) nem as justificadas por atestado médico válido, que deve ser entregue ao Departamento Pessoal.',
      },
    ],
  },
  {
    titulo: 'Conduta e comportamento',
    blocos: [
      {
        tipo: 'p',
        texto:
          'Os colaboradores devem agir com ética e respeito com gestores, colegas, clientes e parceiros, observando os valores da empresa.',
      },
      {
        tipo: 'p',
        texto:
          'São proibidos: assédio moral ou sexual, qualquer forma de discriminação, violência verbal ou física, e o uso, porte ou estar sob efeito de bebida alcoólica ou substâncias ilícitas no ambiente de trabalho ou em serviço. Situações de assédio ou violência devem ser comunicadas ao supervisor ou ao Departamento Pessoal, que tratarão o caso com sigilo, sem qualquer retaliação a quem comunicar (Lei nº 14.457/2022).',
      },
      {
        tipo: 'nota',
        texto:
          'O uso do celular e das redes sociais durante o trabalho deve ser mínimo, para não prejudicar o rendimento das atividades. Para motoristas, é proibido usar o celular com o veículo em movimento (Código de Trânsito Brasileiro, art. 252).',
      },
    ],
  },
  {
    titulo: 'Apresentação pessoal, uniformes e EPIs',
    blocos: [
      { tipo: 'sub', texto: 'Motoristas e ajudantes:' },
      { tipo: 'lista', itens: ['Camisa;', 'Calça jeans ou preta;', 'Cinta (opcional);', 'Bota;', 'Crachá.'] },
      { tipo: 'sub', texto: 'Escritórios:' },
      { tipo: 'lista', itens: ['Camisa;', 'Calça jeans ou preta;', 'Sapato fechado;', 'Crachá.'] },
      { tipo: 'sub', texto: 'ASG:' },
      { tipo: 'lista', itens: ['Camisa;', 'Calça legging preta;', 'Bota;', 'Crachá.'] },
      { tipo: 'sub', texto: 'Recebimento e expedição (noturno):' },
      { tipo: 'lista', itens: ['Camisa;', 'Bermuda jeans ou preta;', 'Cinta (opcional);', 'Bota;', 'Crachá.'] },
      {
        tipo: 'p',
        texto:
          'É obrigatório usar os itens acima durante toda a jornada e manter higiene pessoal adequada ao ambiente de trabalho. Os EPIs são fornecidos gratuitamente pela empresa (CLT, art. 166; NR-6), e cabe ao colaborador usá-los, conservá-los e comunicar perda ou dano. A não utilização pode acarretar medidas disciplinares.',
      },
    ],
  },
  {
    titulo: 'Segurança do trabalho',
    blocos: [
      {
        tipo: 'lista',
        itens: [
          'Utilizar de forma adequada e constante os EPIs disponibilizados. A recusa injustificada ao uso de EPI constitui ato faltoso (CLT, art. 158, parágrafo único).',
          'Motoristas: dirigir com atenção e dentro da lei — velocidade controlada, sem bebida alcoólica ou drogas — e cumprir os deveres do motorista profissional (CLT, art. 235-B), inclusive o respeito aos tempos de direção e descanso e os exames toxicológicos exigidos por lei.',
        ],
      },
      { tipo: 'sub', texto: 'O descumprimento dessas medidas pode resultar em:' },
      {
        tipo: 'lista',
        itens: [
          'Não utilização dos EPIs: aplicação de advertência, seguindo a gradação do item 7.',
          'Multas de trânsito: cada caso é analisado. Comprovada a responsabilidade do colaborador, o valor pode ser descontado em folha, nos limites do art. 462, § 1º, da CLT (dano causado com dolo ou, havendo acordo prévio, por culpa).',
        ],
      },
    ],
  },
  {
    titulo: 'Utilização de bens e recursos da empresa',
    blocos: [
      {
        tipo: 'p',
        texto:
          'Veículos: os veículos da empresa devem ser utilizados exclusivamente em atividades de interesse da empresa, não sendo permitido o uso para fins particulares.',
      },
      {
        tipo: 'p',
        texto:
          'Equipamentos do escritório: computadores, telefones, móveis e materiais de papelaria devem ser usados exclusivamente nas atividades da empresa, de maneira consciente, evitando constrangimentos e desperdícios.',
      },
      {
        tipo: 'p',
        texto:
          'Ambientes e equipamentos de uso comum: os colaboradores devem zelar pela conservação das áreas comuns e dos equipamentos disponibilizados (ex.: copa e utensílios, sala de descanso, ar-condicionado).',
      },
      {
        tipo: 'nota',
        texto:
          'Descuido com o patrimônio da empresa pode resultar em advertência. Desconto por dano só ocorre nos casos permitidos pelo art. 462, § 1º, da CLT.',
      },
    ],
  },
  {
    titulo: 'Penalidades e advertências',
    blocos: [
      {
        tipo: 'p',
        texto:
          'O descumprimento das normas deste Regulamento pode levar às seguintes medidas disciplinares: advertência (verbal ou escrita), suspensão (de até 3 dias) ou dispensa por justa causa, nas hipóteses do art. 482 da CLT.',
      },
      { tipo: 'sub', texto: 'Na aplicação das medidas, a empresa observa:' },
      {
        tipo: 'lista',
        itens: [
          'Gradação: em regra, advertência verbal, advertência escrita, nova advertência escrita, suspensão e, por último, justa causa. Faltas graves podem justificar medida mais severa desde o início.',
          'Proporcionalidade: a medida deve ser compatível com a gravidade da falta.',
          'Imediatidade: a medida é aplicada logo após a empresa tomar conhecimento da falta.',
          'Uma única punição por fato: a mesma falta não é punida duas vezes.',
          'Reincidência: são consideradas as medidas aplicadas nos últimos 12 meses.',
          'A suspensão não pode passar de 30 dias consecutivos (CLT, art. 474). Os dias de suspensão não são remunerados.',
        ],
      },
      {
        tipo: 'p',
        texto:
          'Responsáveis: os supervisores propõem a medida, e o RH/Departamento Pessoal analisa e aplica. O colaborador recebe o documento para ciência — a assinatura indica que tomou conhecimento, e não que concorda. Se o colaborador se recusar a assinar, a ciência é registrada por duas testemunhas.',
      },
    ],
  },
  {
    titulo: 'Direitos e deveres dos colaboradores',
    blocos: [
      {
        tipo: 'p',
        texto:
          'Benefícios: vale-transporte (Lei nº 7.418/1985, com desconto de até 6% do salário-base), vale-alimentação e crescimento de carreira, de acordo com a demanda interna. Estes benefícios se somam aos direitos previstos na CLT e na convenção coletiva da categoria.',
      },
      {
        tipo: 'p',
        texto:
          'Deveres: cumprir este Regulamento; manter sigilo sobre informações da empresa, dos clientes e das cargas, inclusive dados pessoais a que tiver acesso, que só podem ser usados para o trabalho (Lei Geral de Proteção de Dados, Lei nº 13.709/2018); e manter a produtividade.',
      },
    ],
  },
  {
    titulo: 'Disposições finais',
    blocos: [
      {
        tipo: 'p',
        texto:
          'Ao tomar conhecimento deste Regulamento, o colaborador fica ciente dos seus direitos, deveres e das sanções aplicáveis em caso de descumprimento das normas.',
      },
      {
        tipo: 'p',
        texto:
          'Este Regulamento entra em vigor na data de sua divulgação. Alterações serão comunicadas a todos os colaboradores, e mudanças que retirem vantagens só se aplicam a quem for admitido depois delas (Súmula 51 do TST).',
      },
    ],
  },
];
