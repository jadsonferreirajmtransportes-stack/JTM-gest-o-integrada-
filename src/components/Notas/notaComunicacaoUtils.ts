// Compartilhamento externo (WhatsApp/e-mail) de uma página de Notas & Ideias — converte os
// blocos num texto simples, já que WhatsApp/e-mail não têm como renderizar o editor visual.
// Sem destinatário fixo (a página não pertence a um contato específico como um colaborador):
// no WhatsApp abre o seletor de conversa/grupo; no e-mail abre o cliente com o "Para" em branco.
import { BlocoNota, NotaPagina } from '../../types';

function linhaDoBloco(bloco: BlocoNota, whatsapp: boolean): string | null {
  const negrito = (t: string) => (whatsapp ? `*${t}*` : t.toUpperCase());

  switch (bloco.tipo) {
    case 'texto':
    case 'citacao':
    case 'callout':
      return bloco.texto?.trim() || null;
    case 'titulo1':
    case 'titulo2':
    case 'titulo3':
      return bloco.texto?.trim() ? `\n${negrito(bloco.texto.trim())}` : null;
    case 'lista':
      return bloco.texto?.trim() ? `• ${bloco.texto.trim()}` : null;
    case 'lista_numerada':
      return bloco.texto?.trim() ? `- ${bloco.texto.trim()}` : null;
    case 'checklist':
      return bloco.texto?.trim() ? `${bloco.concluido ? '✅' : '☐'} ${bloco.texto.trim()}` : null;
    case 'divisor':
      return '—————————';
    case 'imagem':
    case 'documento':
      return `📎 ${bloco.imagemNome || (bloco.tipo === 'imagem' ? 'Imagem anexada' : 'Documento anexado')} (ver no sistema)`;
    case 'fluxograma':
      return '⬡ Fluxograma (ver no sistema)';
    case 'tabela':
      if (!bloco.tabelaColunas?.length) return '▦ Tabela (ver no sistema)';
      return [
        `▦ ${bloco.tabelaColunas.join(' | ')}`,
        ...(bloco.tabelaLinhas || []).map((linha) => linha.join(' | ')),
      ].join('\n');
    default:
      return null;
  }
}

function blocosParaTexto(blocos: BlocoNota[], whatsapp: boolean): string {
  return blocos
    .map((b) => linhaDoBloco(b, whatsapp))
    .filter((l): l is string => !!l)
    .join('\n');
}

export function buildMensagemNotaWhatsApp(pagina: NotaPagina): string {
  const corpo = blocosParaTexto(pagina.blocos, true);
  return `${pagina.icone ? `${pagina.icone} ` : '📄 '}*${pagina.titulo || 'Sem título'}*\n\n${corpo || '(página em branco)'}\n\n_Compartilhado via Notas & Ideias — JMT Gestão Integrada_`;
}

export function buildAssuntoEmailNota(pagina: NotaPagina): string {
  return `Notas & Ideias: ${pagina.titulo || 'Sem título'}`;
}

export function buildCorpoEmailNota(pagina: NotaPagina): string {
  const corpo = blocosParaTexto(pagina.blocos, false);
  return `${pagina.titulo || 'Sem título'}\n\n${corpo || '(página em branco)'}\n\n— Compartilhado via Notas & Ideias — JMT Gestão Integrada`;
}
