// Mensagens de comunicação da Programação de Férias (WhatsApp/E-mail) — mesmo padrão já usado
// em Aniversariantes e na Programação do Vale Alimentação, só o texto muda.
import { ProgramacaoFerias } from '../types';
import { formatDate } from './formatters';

function primeiroNomeDe(nomeCompleto?: string): string {
  const nome = (nomeCompleto || '').trim();
  return nome.split(' ')[0] || nome;
}

function periodoTexto(f: ProgramacaoFerias): string {
  if (f.fracionamento && f.fracionamento.length > 0) {
    return f.fracionamento
      .map((etapa, i) => `Etapa ${etapa.periodo ?? i + 1}: ${formatDate(etapa.dataInicio)} a ${formatDate(etapa.dataFim)} (${etapa.dias} dias)`)
      .join('\n');
  }
  if (f.dataInicio && f.dataFim) {
    return `${formatDate(f.dataInicio)} a ${formatDate(f.dataFim)} (${f.diasGozados} dias)`;
  }
  return 'Período ainda não definido';
}

const STATUS_FRASE: Record<string, string> = {
  'A programar': 'ainda serão programadas',
  Programada: 'estão programadas',
  'Em gozo': 'estão em andamento',
  Concluída: 'foram concluídas',
  Contemplada: 'foram contempladas',
  Vencida: 'venceram sem gozo — procure o Departamento Pessoal',
};

/** Mensagem no formato WhatsApp (com *negrito* e emojis). */
export function buildMensagemFerias(f: ProgramacaoFerias, colaboradorNome?: string): string {
  const primeiroNome = primeiroNomeDe(colaboradorNome);
  const fraseStatus = STATUS_FRASE[f.status] || f.status;
  const abono = f.abonoPecuniario
    ? `\n💰 Abono pecuniário: ${f.diasAbono} dia(s) (venda de 1/3)`
    : '';
  return `🌴 *Programação de Férias* — ${f.status}

Olá, ${primeiroNome}! Suas férias ${fraseStatus}:

📅 ${periodoTexto(f)}${abono}

Qualquer dúvida, fale com o Departamento Pessoal.

*Jobson de Moraes Transportes (JMT)*`;
}

export function buildAssuntoEmailFerias(f: ProgramacaoFerias): string {
  return `Programação de Férias — ${f.status}`;
}

/** Corpo do e-mail em texto puro (sem marcação de WhatsApp). */
export function buildCorpoEmailFerias(f: ProgramacaoFerias, colaboradorNome?: string): string {
  const primeiroNome = primeiroNomeDe(colaboradorNome);
  const fraseStatus = STATUS_FRASE[f.status] || f.status;
  const abono = f.abonoPecuniario
    ? `\nAbono pecuniário: ${f.diasAbono} dia(s) (venda de 1/3)`
    : '';
  return `Olá, ${primeiroNome}!

Suas férias ${fraseStatus}:

${periodoTexto(f)}${abono}

Qualquer dúvida, fale com o Departamento Pessoal.

Jobson de Moraes Transportes (JMT)`;
}
