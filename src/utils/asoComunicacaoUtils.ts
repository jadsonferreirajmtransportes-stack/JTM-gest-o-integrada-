// Mensagens de comunicação do agendamento de Exame ASO Periódico (WhatsApp/E-mail) — mesmo
// padrão já usado em Férias, Aniversariantes e na Programação do Vale Alimentação, só o
// texto muda.
import { formatDate } from './formatters';

function primeiroNomeDe(nomeCompleto?: string): string {
  const nome = (nomeCompleto || '').trim();
  return nome.split(' ')[0] || nome;
}

function dataHoraTexto(dataExame: string, horaExame?: string): string {
  return horaExame ? `${formatDate(dataExame)} às ${horaExame}` : formatDate(dataExame);
}

/** Mesmo padrão usado no campo "Clínica Médica Conveniada" da tela — se vier vazio, assume a
 *  clínica conveniada padrão em vez de simplesmente omitir a linha da mensagem. */
function clinicaOuPadrao(clinica?: string): string {
  return clinica?.trim() || 'MedSeg Medicina do Trabalho';
}

/** Mensagem no formato WhatsApp (com *negrito* e emojis). */
export function buildMensagemAgendamentoAso(
  colaboradorNome: string,
  dataExame: string,
  clinica?: string,
  linkLocalizacao?: string,
  horaExame?: string
): string {
  const primeiroNome = primeiroNomeDe(colaboradorNome);
  const clinicaTexto = `\n🏥 Clínica: ${clinicaOuPadrao(clinica)}`;
  const linkTexto = linkLocalizacao ? `\n📍 Localização: ${linkLocalizacao}` : '';
  return `🩺 *Agendamento de Exame Ocupacional (ASO)*

Olá, ${primeiroNome}! Seu exame periódico foi agendado:

📅 Data: ${dataHoraTexto(dataExame, horaExame)}${clinicaTexto}${linkTexto}

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
  clinica?: string,
  linkLocalizacao?: string,
  horaExame?: string
): string {
  const primeiroNome = primeiroNomeDe(colaboradorNome);
  const clinicaTexto = `\nClínica: ${clinicaOuPadrao(clinica)}`;
  const linkTexto = linkLocalizacao ? `\nLocalização: ${linkLocalizacao}` : '';
  return `Olá, ${primeiroNome}!

Seu exame periódico foi agendado:

Data: ${dataHoraTexto(dataExame, horaExame)}${clinicaTexto}${linkTexto}

Leve um documento com foto. Qualquer dúvida, fale com o Departamento Pessoal.

Jobson de Moraes Transportes (JMT)`;
}
