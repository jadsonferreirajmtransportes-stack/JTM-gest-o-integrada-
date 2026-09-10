// Birthday Calculation, Zodiac, Templates and Greeting Dispatch Utilities

export interface BirthdayInfo {
  dia: number;
  mes: number; // 1-12
  anoNascimento?: number;
  idadeAtual?: number;
  idadeCompletando?: number;
  dataFormatada: string; // "14 de Setembro"
  dataNascimentoOriginal: string;
  diasRestantes: number; // 0 = Hoje, 1 = Amanhã, etc.
  isHoje: boolean;
  isEstaSemana: boolean;
  signo: string;
}

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const SHORT_MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function getZodiacSign(day: number, month: number): string {
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquário ♒';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Peixes ♓';
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Áries ♈';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Touro ♉';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gêmeos ♊';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Câncer ♋';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leão ♌';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgem ♍';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra ♎';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Escorpião ♏';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagitário ♐';
  return 'Capricórnio ♑';
}

export function parseBirthdayInfo(dateStr?: string | null): BirthdayInfo | null {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) return null;

  const anoNasc = parseInt(parts[0], 10);
  const mesNasc = parseInt(parts[1], 10); // 1-12
  const diaNasc = parseInt(parts[2], 10);

  if (isNaN(anoNasc) || isNaN(mesNasc) || isNaN(diaNasc)) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1; // 1-12
  const diaAtual = hoje.getDate();

  // Calcular próximo aniversário
  let proximoAniversario = new Date(anoAtual, mesNasc - 1, diaNasc, 0, 0, 0, 0);
  let idadeCompletando = anoAtual - anoNasc;

  // Se já passou este ano
  if (
    proximoAniversario.getTime() < hoje.getTime() &&
    !(mesNasc === mesAtual && diaNasc === diaAtual)
  ) {
    proximoAniversario = new Date(anoAtual + 1, mesNasc - 1, diaNasc, 0, 0, 0, 0);
    idadeCompletando = anoAtual + 1 - anoNasc;
  }

  const isHoje = mesNasc === mesAtual && diaNasc === diaAtual;

  const diffMs = proximoAniversario.getTime() - hoje.getTime();
  const diasRestantes = isHoje ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isEstaSemana = diasRestantes >= 0 && diasRestantes <= 7;

  let idadeAtual = anoAtual - anoNasc;
  if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) {
    idadeAtual -= 1;
  }

  const dataFormatada = `${String(diaNasc).padStart(2, '0')} de ${MONTH_NAMES[mesNasc - 1]}`;

  return {
    dia: diaNasc,
    mes: mesNasc,
    anoNascimento: anoNasc,
    idadeAtual,
    idadeCompletando,
    dataFormatada,
    dataNascimentoOriginal: dateStr,
    diasRestantes,
    isHoje,
    isEstaSemana,
    signo: getZodiacSign(diaNasc, mesNasc),
  };
}

export interface BirthdayTemplate {
  id: string;
  titulo: string;
  descricao: string;
  categoria: 'institucional' | 'caloroso' | 'equipe' | 'curto' | 'dependente';
  texto: string;
}

export const BIRTHDAY_TEMPLATES: BirthdayTemplate[] = [
  {
    id: 'institucional',
    titulo: 'Institucional & Corporativo JMT',
    descricao: 'Formal, elegante e em nome da diretoria e do Departamento Pessoal.',
    categoria: 'institucional',
    texto: `🎉 *Feliz Aniversário, {nome}!* 🎂

A diretoria e toda a equipe da *{empresa}* têm a alegria de parabenizá-lo(a) pelo seu dia especial!

Agradecemos imensamente pela sua dedicação, profissionalismo e parceria fundamental como nosso(a) *{cargo}*. Desejamos muita saúde, realizações, paz e sucesso contínuo em sua vida pessoal e profissional.

Que este novo ciclo traga grandes conquistas e muitas alegrias!

_Com os sinceros cumprimentos do Departamento Pessoal e Diretoria JMT._ 🎈✨`,
  },
  {
    id: 'caloroso',
    titulo: 'Caloroso & Amigável',
    descricao: 'Descontraído e afetuoso, perfeito para colegas de trabalho e supervisores.',
    categoria: 'caloroso',
    texto: `🎂 *Parabéns pelo seu dia, {primeiro_nome}!* 🥳🎈

Hoje é dia de celebrar a sua vida! Que o seu aniversário seja repleto de sorrisos, abraços sinceros e momentos inesquecíveis ao lado de quem você ama.

É uma satisfação imensa ter você em nossa equipe fazendo a diferença todos os dias com sua energia e competência.

Muita saúde, paz, felicidades e que você continue brilhando sempre! Um grande abraço de toda a equipe da *{empresa}*! 🎁🍰🥂`,
  },
  {
    id: 'equipe',
    titulo: 'Reconhecimento & Equipe',
    descricao: 'Foco no trabalho em equipe, crescimento conjunto e admiração profissional.',
    categoria: 'equipe',
    texto: `🌟 *Dia de Celebração! Parabéns, {nome}!* 👏🎉

Hoje celebramos não apenas mais um ano da sua vida, mas também a pessoa incrível e o(a) profissional exemplar que você é na função de *{cargo}*.

Seu compromisso, dedicação e espírito de equipe são motivos de orgulho para todos nós. Que seu caminho continue sendo iluminado com prosperidade, saúde e muitas vitórias!

Parabéns pelo seu aniversário! Conte sempre conosco! 🚀💼🎂`,
  },
  {
    id: 'curto',
    titulo: 'Curto & Direto (WhatsApp Rápido)',
    descricao: 'Mensagem ágil e objetiva, ideal para envio rápido no WhatsApp.',
    categoria: 'curto',
    texto: `🎉 *Feliz Aniversário, {primeiro_nome}!* 🎂

Desejamos um dia incrível, repleto de saúde, paz, alegrias e muitas realizações! 

Parabéns e muito sucesso de toda a equipe da *{empresa}*! 🎈🥳👏`,
  },
  {
    id: 'dependente',
    titulo: 'Felicitação para Filho/Dependente',
    descricao: 'Mensagem carinhosa para parabenizar o colaborador pelo aniversário do filho(a).',
    categoria: 'dependente',
    texto: `🎈 *Parabéns pelo Aniversário do(a) {nome_dependente}!* 🎂🥳

A equipe da *{empresa}* deseja um dia muito especial, cheio de brincadeiras, saúde, bênçãos e alegrias para o(a) pequeno(a) e para toda a sua família!

Um grande abraço de todos nós do Departamento Pessoal e da equipe JMT! 🎁✨👶`,
  },
];

export function compileBirthdayMessage(
  templateText: string,
  params: {
    nome: string;
    cargo?: string;
    empresa?: string;
    idade?: number;
    nomeDependente?: string;
  }
): string {
  const primeiroNome = params.nome.trim().split(' ')[0] || params.nome;
  const empresa = params.empresa || 'Jobson de Moraes Transportes (JMT)';
  const cargo = params.cargo || 'Colaborador';

  let msg = templateText;
  msg = msg.replace(/{nome}/g, params.nome);
  msg = msg.replace(/{primeiro_nome}/g, primeiroNome);
  msg = msg.replace(/{empresa}/g, empresa);
  msg = msg.replace(/{cargo}/g, cargo);
  if (params.idade) {
    msg = msg.replace(/{idade}/g, String(params.idade));
  }
  if (params.nomeDependente) {
    msg = msg.replace(/{nome_dependente}/g, params.nomeDependente);
  }

  return msg;
}

export function cleanPhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // Se já tiver 55 no início e mais de 11 dígitos
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  // Se for celular com DDD brasileiro (ex: 11981234567 -> 5511981234567)
  return `55${digits}`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  if (!cleanPhone) return '';
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export function buildMailtoLink(email: string, subject: string, body: string): string {
  if (!email) return '';
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
