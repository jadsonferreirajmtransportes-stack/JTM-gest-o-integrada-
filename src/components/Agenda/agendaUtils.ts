import {
  AtividadeGestao,
  CategoriaAtividadeGestao,
  StatusAtividadeGestao,
  PrioridadeAtividadeGestao,
  Supervisor,
  Colaborador,
  UsuarioLogin,
  UserRole,
} from '../../types';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';

export const CATEGORIA_CONFIG: Record<
  CategoriaAtividadeGestao,
  { label: string; bg: string; text: string; border: string; dot: string; lightBg: string }
> = {
  'Reunião & Governança': {
    label: 'Reunião & Governança',
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    lightBg: 'bg-purple-50',
  },
  'Auditoria & RDC 430': {
    label: 'Auditoria & RDC 430',
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    lightBg: 'bg-rose-50',
  },
  'Operação & Frota': {
    label: 'Operação & Frota',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    lightBg: 'bg-amber-50',
  },
  'Gente & DP': {
    label: 'Gente & DP',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    lightBg: 'bg-blue-50',
  },
  'Projetos & OKRs': {
    label: 'Projetos & OKRs',
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-800',
    border: 'border-fuchsia-200',
    dot: 'bg-fuchsia-500',
    lightBg: 'bg-fuchsia-50',
  },
  'Comercial & Clientes': {
    label: 'Comercial & Clientes',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
  },
  'Treinamento & Capacitação': {
    label: 'Treinamento & Capacitação',
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    lightBg: 'bg-teal-50',
  },
};

export const STATUS_CONFIG: Record<
  StatusAtividadeGestao,
  { label: string; badge: string; border: string; dot: string }
> = {
  Agendada: {
    label: 'Agendada',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  'Em Andamento': {
    label: 'Em Andamento',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  Concluída: {
    label: 'Concluída',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  Cancelada: {
    label: 'Cancelada',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 line-through',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
  Adiada: {
    label: 'Adiada',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
};

export const PRIORIDADE_CONFIG: Record<PrioridadeAtividadeGestao, { label: string; badge: string }> = {
  Urgente: { label: 'Urgente', badge: 'bg-rose-600 text-white font-bold shadow-2xs' },
  Alta: { label: 'Alta', badge: 'bg-rose-100 text-rose-800 border border-rose-200 font-medium' },
  Média: { label: 'Média', badge: 'bg-amber-100 text-amber-800 border border-amber-200 font-medium' },
  Baixa: { label: 'Baixa', badge: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium' },
};

/**
 * Data final efetiva da atividade. Quando `dataFim` não é informada, ou é
 * anterior/igual à data de início, a atividade é tratada como de um único dia.
 */
export function getAtividadeDataFim(atividade: AtividadeGestao): string {
  return atividade.dataFim && atividade.dataFim > atividade.data ? atividade.dataFim : atividade.data;
}

/** true quando a atividade abrange mais de uma data (ex: 04/10 a 06/10). */
export function isAtividadeMultiDia(atividade: AtividadeGestao): boolean {
  return getAtividadeDataFim(atividade) > atividade.data;
}

/** Quantidade de dias que a atividade abrange (mínimo 1). */
export function getAtividadeDuracaoDias(atividade: AtividadeGestao): number {
  const inicio = new Date(atividade.data + 'T00:00:00');
  const fim = new Date(getAtividadeDataFim(atividade) + 'T00:00:00');
  const diffMs = fim.getTime() - inicio.getTime();
  return Math.round(diffMs / 86400000) + 1;
}

/** true quando `dateStr` (YYYY-MM-DD) cai dentro do intervalo [data, dataFim] da atividade. */
export function atividadeOcorreEm(atividade: AtividadeGestao, dateStr: string): boolean {
  return dateStr >= atividade.data && dateStr <= getAtividadeDataFim(atividade);
}

/** Quem enxerga uma atividade da Agenda da Gestão, agora que o módulo pode ser liberado pra
 *  mais gente sem virar visão total de tudo (ver comentário em types.ts sobre
 *  criadoPorUserId/usuariosMarcadosIds):
 *   - admin sempre vê tudo (mantém a supervisão geral).
 *   - quem criou a atividade sempre vê a própria.
 *   - quem foi marcado explicitamente (usuariosMarcadosIds) vê.
 *   - compatibilidade com atividades antigas (criadas antes dessa marcação existir, ou
 *     criadas sem marcar ninguém): continua visível pra quem já está escrito como
 *     responsável/participante pelo nome — texto livre, então comparado sem acento/caixa. */
export function podeVerAtividade(
  atividade: AtividadeGestao,
  currentUser?: UsuarioLogin,
  userRole?: UserRole
): boolean {
  if (userRole === 'admin') return true;
  if (!currentUser) return true;
  if (atividade.criadoPorUserId === currentUser.id) return true;
  if ((atividade.usuariosMarcadosIds || []).includes(currentUser.id)) return true;

  const normalizar = (s: string) => (s || '').trim().toLowerCase();
  const nomeAtual = normalizar(currentUser.nome);
  if (!nomeAtual) return false;
  if (normalizar(atividade.responsavel) === nomeAtual) return true;
  if ((atividade.participantes || []).some((p) => normalizar(p) === nomeAtual)) return true;

  return false;
}

/**
 * Rótulo de data formatado em pt-BR, exibindo o intervalo completo
 * ("de 04 a 06 de outubro de 2026") quando a atividade é de vários dias.
 */
export function formatAtividadeDateLabel(
  atividade: AtividadeGestao,
  style: 'long' | 'short' = 'long'
): string {
  const inicio = new Date(atividade.data + 'T12:00:00');
  const longOpts: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' };

  if (!isAtividadeMultiDia(atividade)) {
    return inicio.toLocaleDateString('pt-BR', longOpts);
  }

  const fim = new Date(getAtividadeDataFim(atividade) + 'T12:00:00');
  if (style === 'long') {
    const inicioFmt = inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    const fimFmt = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return `de ${inicioFmt} a ${fimFmt}`;
  }
  const inicioFmt = inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const fimFmt = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${inicioFmt} a ${fimFmt}`;
}

/** true quando o texto parece ser um link de reunião online (URL genérica, Meet, Zoom, Teams etc.). */
export function pareceLinkDeReuniao(texto?: string): boolean {
  if (!texto) return false;
  const t = texto.trim().toLowerCase();
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.includes('meet.google') ||
    t.includes('teams.microsoft') ||
    t.includes('zoom.us') ||
    t.includes('whereby.com')
  );
}

/**
 * Tipo de local efetivo da atividade: usa `tipoLocal` quando informado; caso contrário,
 * infere pelo conteúdo de `localOuLink` (compatibilidade com atividades antigas).
 */
export function getTipoLocalEfetivo(atividade: AtividadeGestao): 'presencial' | 'videoconferencia' {
  return atividade.tipoLocal || (pareceLinkDeReuniao(atividade.localOuLink) ? 'videoconferencia' : 'presencial');
}

function addDaysToIsoDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Generates and triggers download of an .ics file for calendar import
 */
export function downloadIcsFile(atividade: AtividadeGestao) {
  const cleanStr = (s?: string) => (s || '').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,');
  const dataFimEfetiva = getAtividadeDataFim(atividade);

  // Eventos de dia inteiro usam VALUE=DATE, com DTEND exclusivo (dia seguinte ao último dia)
  const dtStartLine = atividade.diaInteiro
    ? `DTSTART;VALUE=DATE:${atividade.data.replace(/-/g, '')}`
    : `DTSTART:${atividade.data.replace(/-/g, '')}T${(atividade.horaInicio || '09:00').replace(':', '')}00`;
  const dtEndLine = atividade.diaInteiro
    ? `DTEND;VALUE=DATE:${addDaysToIsoDate(dataFimEfetiva, 1).replace(/-/g, '')}`
    : `DTEND:${dataFimEfetiva.replace(/-/g, '')}T${(atividade.horaFim || '10:00').replace(':', '')}00`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jobson de Moraes Transportes//Agenda Gestao JMT//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:jmt-${atividade.id}@jmt.log.br`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:${cleanStr(atividade.titulo)}`,
    `DESCRIPTION:${cleanStr(
      (atividade.descricao || '') +
        '\\n\\nCategoria: ' +
        atividade.categoria +
        '\\nResponsável: ' +
        atividade.responsavel +
        (atividade.participantes?.length ? '\\nParticipantes: ' + atividade.participantes.join(', ') : '') +
        (atividade.pautaAta ? '\\n\\nPauta:\\n' + cleanStr(atividade.pautaAta) : '')
    )}`,
    `LOCATION:${cleanStr(
      getTipoLocalEfetivo(atividade) === 'presencial'
        ? atividade.linkLocalizacao
          ? `${atividade.localOuLink} (Mapa: ${atividade.linkLocalizacao})`
          : atividade.localOuLink
        : `Videoconferência: ${atividade.localOuLink}`
    )}`,
    ...(getTipoLocalEfetivo(atividade) === 'videoconferencia' && atividade.localOuLink
      ? [`URL:${atividade.localOuLink}`]
      : []),
    `STATUS:${atividade.status === 'Cancelada' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sufixoData = isAtividadeMultiDia(atividade)
    ? `${atividade.data}_a_${dataFimEfetiva}`
    : atividade.data;
  a.download = `JMT-Agenda-${atividade.id}-${sufixoData}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export list of activities to CSV
 */
export function exportAtividadesToCSV(atividades: AtividadeGestao[]) {
  const headers = [
    'ID',
    'Título',
    'Categoria',
    'Status',
    'Prioridade',
    'Data Início',
    'Data Final',
    'Início',
    'Término',
    'Responsável',
    'Local ou Link',
    'Participantes',
    'Pauta/Ata',
  ];

  const rows = atividades.map((a) => [
    `"${a.id}"`,
    `"${(a.titulo || '').replace(/"/g, '""')}"`,
    `"${a.categoria}"`,
    `"${a.status}"`,
    `"${a.prioridade}"`,
    `"${a.data}"`,
    `"${isAtividadeMultiDia(a) ? getAtividadeDataFim(a) : ''}"`,
    `"${a.horaInicio}"`,
    `"${a.horaFim}"`,
    `"${(a.responsavel || '').replace(/"/g, '""')}"`,
    `"${(a.localOuLink || '').replace(/"/g, '""')}"`,
    `"${(a.participantes || []).join('; ').replace(/"/g, '""')}"`,
    `"${(a.pautaAta || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `JMT_Agenda_Gestao_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==========================================
// ALERTAS & NOTIFICAÇÕES (WHATSAPP & E-MAIL)
// ==========================================

export interface PessoaEnvolvida {
  id: string;
  nome: string;
  tipo: 'responsavel' | 'participante' | 'extra';
  cargo?: string;
  telefone?: string;
  email?: string;
  selecionado: boolean;
}

export type TipoModeloAlerta = 'lembrete' | 'urgente' | 'sala' | 'ata';

/**
 * Normaliza número de telefone para formato internacional aceito pela API do WhatsApp (ex: 5511987654321)
 */
export function formatPhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Se já tem código de país do Brasil (55) com DDD (10 ou 11 dígitos a mais) -> 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se tem DDD + Número padrão BR (10 ou 11 dígitos, ex: 11987654321 ou 1138761100)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Outros casos ou já internacional
  return digits;
}

/**
 * Localiza telefones e e-mails de responsáveis e participantes cruzando com a base de Supervisores e Colaboradores
 */
export function resolvePessoasEnvolvidas(
  atividade: AtividadeGestao,
  supervisores: Supervisor[] = [],
  colaboradores: Colaborador[] = []
): PessoaEnvolvida[] {
  const list: PessoaEnvolvida[] = [];
  const addedKeys = new Set<string>();

  const findContact = (nameStr: string) => {
    const clean = nameStr.trim().toLowerCase();
    if (!clean) return { cargo: undefined, tel: undefined, email: undefined };

    // Tentar correspondência em Supervisores
    const sup = supervisores.find(
      (s) =>
        s.nome.toLowerCase() === clean ||
        s.nome.toLowerCase().includes(clean) ||
        clean.includes(s.nome.toLowerCase())
    );
    if (sup) {
      return {
        cargo: sup.cargo,
        tel: sup.telefoneWhatsapp || sup.telefone,
        email: sup.email,
      };
    }

    // Tentar correspondência em Colaboradores
    const colab = colaboradores.find(
      (c) =>
        c.nomeCompleto.toLowerCase() === clean ||
        c.nomeCompleto.toLowerCase().includes(clean) ||
        clean.includes(c.nomeCompleto.toLowerCase())
    );
    if (colab) {
      return {
        cargo: colab.funcaoCargo,
        tel: colab.telefoneWhatsapp,
        email: colab.email,
      };
    }

    // Extrair se o nome já for um e-mail direto
    if (clean.includes('@')) {
      return { cargo: undefined, tel: undefined, email: nameStr.trim() };
    }

    // Extrair se contiver dígitos numéricos de telefone
    const digitsOnly = nameStr.replace(/\D/g, '');
    if (digitsOnly.length >= 8) {
      return { cargo: undefined, tel: nameStr.trim(), email: undefined };
    }

    return { cargo: undefined, tel: undefined, email: undefined };
  };

  // 1. Responsável Principal
  if (atividade.responsavel) {
    const contact = findContact(atividade.responsavel);
    const key = `resp-${atividade.responsavel.toLowerCase()}`;
    addedKeys.add(key);
    list.push({
      id: key,
      nome: atividade.responsavel,
      tipo: 'responsavel',
      cargo: atividade.responsavelCargo || contact.cargo,
      telefone: contact.tel || '',
      email: contact.email || '',
      selecionado: true,
    });
  }

  // 2. Participantes
  if (atividade.participantes && atividade.participantes.length > 0) {
    atividade.participantes.forEach((partName, idx) => {
      const trimmed = partName.trim();
      if (!trimmed) return;
      const key = `part-${trimmed.toLowerCase()}`;
      if (addedKeys.has(key)) return;
      addedKeys.add(key);

      const contact = findContact(trimmed);
      list.push({
        id: key || `part-${idx}`,
        nome: trimmed,
        tipo: 'participante',
        cargo: contact.cargo,
        telefone: contact.tel || '',
        email: contact.email || '',
        selecionado: true,
      });
    });
  }

  return list;
}

/**
 * Gera mensagem rica e formatada para disparo via WhatsApp
 */
export function generateWhatsAppMessage(
  atividade: AtividadeGestao,
  destinatarioNome?: string,
  customNote?: string,
  tipoModelo: TipoModeloAlerta = 'lembrete'
): string {
  const dateFormatted = formatAtividadeDateLabel(atividade);

  const timeStr = atividade.diaInteiro
    ? 'Dia Inteiro'
    : `${atividade.horaInicio} às ${atividade.horaFim}`;

  let headerIntro = '🔔 *Lembrete de Compromisso - JMT Gestão Integrada*';
  if (tipoModelo === 'urgente') {
    headerIntro = '🚨 *COMUNICADO IMPORTANTE / URGENTE - JMT Transportes*';
  } else if (tipoModelo === 'sala') {
    headerIntro = '💻 *Link de Acesso à Reunião / Sala Virtual - JMT*';
  } else if (tipoModelo === 'ata') {
    headerIntro = '📋 *Ata e Deliberações da Reunião - JMT Transportes*';
  }

  const saudacao = destinatarioNome ? `Olá, *${destinatarioNome}*!\n\n` : '';
  const tipoLocalEfetivo = getTipoLocalEfetivo(atividade);

  let lines: string[] = [
    `${headerIntro}\n`,
    `${saudacao}Segue o alinhamento da agenda da gestão:`,
    `📌 *Atividade:* ${atividade.titulo}`,
    `🏷️ *Categoria:* ${atividade.categoria}`,
    `🗓️ *Data:* ${dateFormatted}`,
    `⏰ *Horário:* ${timeStr}`,
    tipoLocalEfetivo === 'videoconferencia'
      ? `🎥 *Videoconferência:* ${atividade.localOuLink}`
      : `📍 *Local:* ${atividade.localOuLink}`,
    ...(tipoLocalEfetivo === 'presencial' && atividade.linkLocalizacao
      ? [`🗺️ *Ver no Mapa:* ${atividade.linkLocalizacao}`]
      : []),
    `👤 *Responsável:* ${atividade.responsavel}${
      atividade.responsavelCargo ? ` (${atividade.responsavelCargo})` : ''
    }`,
  ];

  if (atividade.participantes && atividade.participantes.length > 0) {
    lines.push(`👥 *Participantes:* ${atividade.participantes.join(', ')}`);
  }

  if (atividade.pautaAta && tipoModelo !== 'sala') {
    lines.push(`\n📝 *Pauta Programada:*\n${atividade.pautaAta}`);
  }

  if (atividade.deliberacoes && atividade.deliberacoes.length > 0 && (tipoModelo === 'ata' || tipoModelo === 'lembrete')) {
    const delibTexts = atividade.deliberacoes
      .map(
        (d) =>
          `• [${d.concluido ? 'CONCLUÍDO' : 'PENDENTE'}] ${d.texto}${
            d.responsavel ? ` (${d.responsavel})` : ''
          }${d.prazo ? ` - Prazo: ${d.prazo}` : ''}`
      )
      .join('\n');
    lines.push(`\n✅ *Ações e Deliberações:*\n${delibTexts}`);
  }

  if (customNote && customNote.trim()) {
    lines.push(`\n💬 *Mensagem da Coordenação:*\n${customNote.trim()}`);
  }

  if (tipoModelo === 'sala') {
    lines.push('\n👉 Por favor, conecte-se com 5 minutos de antecedência para checagem de áudio/vídeo.');
  } else if (tipoModelo === 'urgente') {
    lines.push('\n⚠️ Sua pontualidade e presença são impreteríveis.');
  } else if (tipoModelo === 'lembrete') {
    lines.push('\nFavor confirmar o recebimento deste lembrete. Bom trabalho!');
  }

  lines.push(`\n_${STRATEGIC_GUIDELINES.assinatura}_`);

  return lines.join('\n');
}

/**
 * Gera conteúdo formatado para disparo de E-mail (Assunto e Corpo)
 */
export function generateEmailContent(
  atividade: AtividadeGestao,
  customNote?: string,
  tipoModelo: TipoModeloAlerta = 'lembrete'
): { subject: string; body: string } {
  const dateFormatted = formatAtividadeDateLabel(atividade);

  const timeStr = atividade.diaInteiro
    ? 'Dia Inteiro'
    : `${atividade.horaInicio} às ${atividade.horaFim}`;

  let prefix = '[Lembrete JMT]';
  if (tipoModelo === 'urgente') prefix = '[URGENTE JMT]';
  if (tipoModelo === 'sala') prefix = '[Link de Reunião JMT]';
  if (tipoModelo === 'ata') prefix = '[Ata & Ações JMT]';

  const subject = `${prefix} ${atividade.categoria}: ${atividade.titulo} - ${dateFormatted} (${timeStr})`;

  const tipoLocalEfetivo = getTipoLocalEfetivo(atividade);

  const bodyLines = [
    'Prezados(as),',
    '',
    `Notificação da Agenda de Gestão da JMT Transportes:`,
    '',
    `• Atividade / Evento: ${atividade.titulo}`,
    `• Categoria: ${atividade.categoria}`,
    `• Prioridade: ${atividade.prioridade}`,
    `• Data: ${dateFormatted}`,
    `• Horário: ${timeStr}`,
    tipoLocalEfetivo === 'videoconferencia'
      ? `• Link da Videoconferência: ${atividade.localOuLink}`
      : `• Local: ${atividade.localOuLink}`,
    ...(tipoLocalEfetivo === 'presencial' && atividade.linkLocalizacao
      ? [`• Ver no Mapa: ${atividade.linkLocalizacao}`]
      : []),
    `• Responsável: ${atividade.responsavel} ${atividade.responsavelCargo ? `(${atividade.responsavelCargo})` : ''}`,
    `• Participantes Convocados: ${(atividade.participantes || []).join(', ') || 'Equipe designada'}`,
  ];

  if (atividade.descricao) {
    bodyLines.push('', `Descrição:`, atividade.descricao);
  }

  if (atividade.pautaAta) {
    bodyLines.push('', `Pauta Prévia / Resumo de Ata:`, atividade.pautaAta);
  }

  if (atividade.deliberacoes && atividade.deliberacoes.length > 0) {
    bodyLines.push('', `Plano de Ação e Deliberações:`);
    atividade.deliberacoes.forEach((d) => {
      bodyLines.push(
        `- [${d.concluido ? 'CONCLUÍDO' : 'PENDENTE'}] ${d.texto}${
          d.responsavel ? ` | Responsável: ${d.responsavel}` : ''
        }${d.prazo ? ` | Prazo: ${d.prazo}` : ''}`
      );
    });
  }

  if (customNote && customNote.trim()) {
    bodyLines.push('', `Observações Adicionais:`, customNote.trim());
  }

  bodyLines.push(
    '',
    '-------------------------------------------------------',
    STRATEGIC_GUIDELINES.assinatura
  );

  return {
    subject,
    body: bodyLines.join('\n'),
  };
}

/**
 * Monta URL direta para WhatsApp Web / App para um número específico
 */
export function getWhatsAppDirectUrl(phone: string, text: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  return `https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(text)}`;
}

/**
 * Monta URL de compartilhamento geral no WhatsApp (para escolher contato ou grupo)
 */
export function getWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Monta link mailto com destinatários, assunto e corpo
 */
export function getMailtoUrl(toEmails: string[], subject: string, body: string): string {
  const validEmails = toEmails.filter((e) => e && e.includes('@')).join(',');
  return `mailto:${validEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Monta URL para abrir diretamente nova mensagem no Gmail Web com campos pré-preenchidos
 */
export function getGmailWebComposeUrl(toEmails: string[], subject: string, body: string): string {
  const validEmails = toEmails.filter((e) => e && e.includes('@')).join(',');
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(validEmails)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

