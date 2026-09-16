// Mensagens de comunicação do agendamento de Exame ASO Periódico (WhatsApp/E-mail) — mesmo
// padrão já usado em Férias, Aniversariantes e na Programação do Vale Alimentação, só o
// texto muda.
import { formatDate } from './formatters';

function primeiroNomeDe(nomeCompleto?: string): string {
  const nome = (nomeCompleto || '').trim();
  return nome.split(' ')[0] || nome;
}

/** Mensagem no formato WhatsApp (com *negrito* e emojis). */
export function buildMensagemAgendamentoAso(
  colaboradorNome: string,
  dataExame: string,
  clinica?: string
): string {
  const primeiroNome = primeiroNomeDe(colaboradorNome);
  const clinicaTexto = clinica ? `\n🏥 Clínica: ${clinica}` : '';
  return `🩺 *Agendamento de Exame Ocupacional (ASO)*

Olá, ${primeiroNome}! Seu exame periódico foi agendado:

📅 Data: ${formatDate(dataExame)}${clinicaTexto}

Leve um documento com foto. Qualquer dúvida, fale com o Departamento Pessoal.

*Jobson de Moraes Transportes (JMT)*`;
}

export function buildAssuntoEmailAgendamentoAso(): string {
  return 'Agendamento de Exame Ocupacional (ASO) Periódico';
}

/** Corpo do e-mail em texto puro (sem marcação de WhatsApp). */
export function buildCorpoEmailAgendamentoAso(
  colaboradorNome: string,
  dataExame: string,
  clinica?: string
): string {
  const primeiroNome = primeiroNomeDe(colaboradorNome);
  const clinicaTexto = clinica ? `\nClínica: ${clinica}` : '';
  return `Olá, ${primeiroNome}!

Seu exame periódico foi agendado:

Data: ${formatDate(dataExame)}${clinicaTexto}

Leve um documento com foto. Qualquer dúvida, fale com o Departamento Pessoal.

Jobson de Moraes Transportes (JMT)`;
}
