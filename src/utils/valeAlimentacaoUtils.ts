// Mensagens de comunicação da Programação do Vale Alimentação (WhatsApp/E-mail) — reaproveita
// os mesmos construtores de link (buildWhatsAppLink/buildMailtoLink) já usados em
// Aniversariantes, só o texto muda.
import { LancamentoValeAlimentacao } from '../types';
import { formatDate, formatMoney } from './formatters';

function primeiroNomeDe(nomeCompleto?: string): string {
  const nome = (nomeCompleto || '').trim();
  return nome.split(' ')[0] || nome;
}

function detalheAusencias(l: LancamentoValeAlimentacao): string {
  const partes: string[] = [];
  if (l.faltas) partes.push(`${l.faltas} falta${l.faltas > 1 ? 's' : ''}`);
  if (l.diasFerias) partes.push(`${l.diasFerias} dia${l.diasFerias > 1 ? 's' : ''} de férias`);
  return partes.length ? ` (descontado${partes.length > 1 ? 's' : ''}: ${partes.join(' + ')})` : '';
}

/** Mensagem no formato WhatsApp (com *negrito* e emojis), igual ao padrão já usado em Aniversariantes. */
export function buildMensagemLiberacaoVA(l: LancamentoValeAlimentacao): string {
  const primeiroNome = primeiroNomeDe(l.colaboradorNome);
  return `🍽️ *Vale Alimentação Liberado* — ${l.identificacaoQuinzena}

Olá, ${primeiroNome}! Seu Vale Alimentação já foi disponibilizado:

📅 Período: ${formatDate(l.dataInicio)} a ${formatDate(l.dataTermino)}
📆 Diárias: ${l.quantidadeDiarias} dia(s)${detalheAusencias(l)}
💰 Valor disponibilizado: *${formatMoney(l.valorDisponibilizado)}*

Qualquer dúvida, fale com o Departamento Pessoal.

*Jobson de Moraes Transportes (JMT)*`;
}

export function buildAssuntoEmailVA(l: LancamentoValeAlimentacao): string {
  return `Vale Alimentação liberado — ${l.identificacaoQuinzena}`;
}

/** Corpo do e-mail em texto puro (sem marcação de WhatsApp). */
export function buildCorpoEmailVA(l: LancamentoValeAlimentacao): string {
  const primeiroNome = primeiroNomeDe(l.colaboradorNome);
  return `Olá, ${primeiroNome}!

Seu Vale Alimentação da quinzena ${l.identificacaoQuinzena} já foi disponibilizado:

Período: ${formatDate(l.dataInicio)} a ${formatDate(l.dataTermino)}
Diárias: ${l.quantidadeDiarias} dia(s)${detalheAusencias(l)}
Valor disponibilizado: ${formatMoney(l.valorDisponibilizado)}

Qualquer dúvida, fale com o Departamento Pessoal.

Jobson de Moraes Transportes (JMT)`;
}
