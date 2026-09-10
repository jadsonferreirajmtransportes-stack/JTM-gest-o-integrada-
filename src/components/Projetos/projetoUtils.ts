import { ProjetoGerencial, Supervisor, Colaborador, MarcoProjeto, RiscoProjeto } from '../../types';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';

export interface PessoaEnvolvidaProjeto {
  id: string;
  nome: string;
  papel: 'lider' | 'equipe' | 'extra';
  cargo?: string;
  telefone?: string;
  email?: string;
  selecionado: boolean;
}

export type TipoModeloResumoProjeto =
  | 'resumo_executivo'
  | 'status_report'
  | 'marcos_prazos'
  | 'orcamento_custos';

/**
 * Normaliza número de telefone para formato aceito pela API do WhatsApp (ex: 5511987654321)
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

  return digits;
}

/**
 * Cruza nomes de Líder e Membros da Equipe com a base de Supervisores e Colaboradores para extrair telefones e e-mails
 */
export function resolvePessoasEnvolvidasProjeto(
  projeto: ProjetoGerencial,
  supervisores: Supervisor[] = [],
  colaboradores: Colaborador[] = []
): PessoaEnvolvidaProjeto[] {
  const list: PessoaEnvolvidaProjeto[] = [];
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

    // Se o próprio nome for um e-mail
    if (clean.includes('@')) {
      return { cargo: undefined, tel: undefined, email: nameStr.trim() };
    }

    // Se contiver números de telefone
    const digitsOnly = nameStr.replace(/\D/g, '');
    if (digitsOnly.length >= 8) {
      return { cargo: undefined, tel: nameStr.trim(), email: undefined };
    }

    return { cargo: undefined, tel: undefined, email: undefined };
  };

  // 1. Líder do Projeto
  if (projeto.liderProjetoNome) {
    const contact = findContact(projeto.liderProjetoNome);
    const key = `lider-${projeto.liderProjetoNome.toLowerCase()}`;
    addedKeys.add(key);
    list.push({
      id: key,
      nome: projeto.liderProjetoNome,
      papel: 'lider',
      cargo: projeto.liderCargo || contact.cargo || 'Líder do Projeto',
      telefone: contact.tel || '',
      email: contact.email || '',
      selecionado: true,
    });
  }

  // 2. Equipe de Membros
  if (projeto.equipeMembros && projeto.equipeMembros.length > 0) {
    projeto.equipeMembros.forEach((membro, idx) => {
      const trimmed = membro.trim();
      if (!trimmed) return;
      const key = `membro-${trimmed.toLowerCase()}`;
      if (addedKeys.has(key)) return;
      addedKeys.add(key);

      const contact = findContact(trimmed);
      list.push({
        id: key || `membro-${idx}`,
        nome: trimmed,
        papel: 'equipe',
        cargo: contact.cargo || 'Membro do Projeto',
        telefone: contact.tel || '',
        email: contact.email || '',
        selecionado: true,
      });
    });
  }

  return list;
}

/**
 * Cria uma barra visual de progresso em texto puro para mensagens (ex: ██████░░░░ 60%)
 */
export function getProgressBarText(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const totalBars = 10;
  const filledBars = Math.round((clamped / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  return `${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)} ${clamped}%`;
}

/**
 * Formata valor em moeda BRL
 */
export function formatCurrencyBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

/**
 * Formata data ISO para formato legível DD/MM/AAAA
 */
export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return 'Não definida';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Gera mensagem formatada para WhatsApp conforme o modelo selecionado
 */
export function generateProjetoWhatsAppMessage(
  projeto: ProjetoGerencial,
  destinatarioNome?: string,
  customNote?: string,
  tipoModelo: TipoModeloResumoProjeto = 'resumo_executivo'
): string {
  const greeting = destinatarioNome ? `Olá, *${destinatarioNome.trim()}*!` : `Prezada equipe e liderança,`;
  const progressBar = getProgressBarText(projeto.progressoPercentual);
  const dataFimBR = formatDateBR(projeto.dataPrevisaoFim);
  const dataInicioBR = formatDateBR(projeto.dataInicio);

  const saldo = projeto.orcamentoPrevisto - projeto.custoRealizado;
  const marcosConcluidos = projeto.marcos.filter((m) => m.concluido).length;
  const totalMarcos = projeto.marcos.length;

  let titleHeader = '📊 *RESUMO EXECUTIVO DO PROJETO - JMT GESTÃO INTEGRADA*';
  if (tipoModelo === 'status_report') {
    titleHeader = '📋 *STATUS REPORT SEMANAL - JMT GESTÃO DE PROJETOS*';
  } else if (tipoModelo === 'marcos_prazos') {
    titleHeader = '🎯 *ALINHAMENTO DE MARCOS & PRAZOS - JMT PROJETOS*';
  } else if (tipoModelo === 'orcamento_custos') {
    titleHeader = '💰 *ACOMPANHAMENTO ORÇAMENTÁRIO & ROI - JMT PROJETOS*';
  }

  const lines: string[] = [];

  // Cabeçalho
  lines.push(titleHeader);
  lines.push('');
  lines.push(greeting);
  lines.push('');
  lines.push(`Compartilhamos a síntese estratégica atualizada do projeto corporativo:`);
  lines.push('');

  // Identificação do Projeto
  lines.push(`📁 *Projeto:* ${projeto.codigo} - ${projeto.titulo}`);
  lines.push(`🏷️ *Categoria:* ${projeto.categoria} | *Setor:* ${projeto.setorImpactado}`);
  lines.push(`🚦 *Status Atual:* ${projeto.status.toUpperCase()} | *Prioridade:* ${projeto.prioridade}`);
  lines.push(`📈 *Progresso Geral:* ${progressBar}`);
  lines.push(`👤 *Líder do Projeto:* ${projeto.liderProjetoNome}${projeto.liderCargo ? ` (${projeto.liderCargo})` : ''}`);

  if (projeto.equipeMembros && projeto.equipeMembros.length > 0) {
    lines.push(`👥 *Equipe:* ${projeto.equipeMembros.join(', ')}`);
  }

  // Cronograma
  lines.push(`🗓️ *Vigência:* ${dataInicioBR} até *${dataFimBR}*`);

  if (projeto.alinhamentoRDC430) {
    lines.push(`🛡️ *Conformidade Regulatória:* Alinhado às Boas Práticas RDC 430/2020 ANVISA`);
  }

  // Seções específicas por modelo
  if (tipoModelo === 'resumo_executivo' || tipoModelo === 'marcos_prazos') {
    lines.push('');
    lines.push(`📌 *Marcos & Entregas Chave (${marcosConcluidos}/${totalMarcos} Concluídos):*`);
    if (projeto.marcos.length === 0) {
      lines.push(`  • Nenhum marco cadastrado até o momento.`);
    } else {
      projeto.marcos.forEach((m) => {
        const statusIcon = m.concluido ? '✅' : '⏳';
        lines.push(`  ${statusIcon} *${m.titulo}* - Prazo: ${formatDateBR(m.dataLimite)} [${m.concluido ? 'CONCLUÍDO' : 'PENDENTE'}]`);
      });
    }
  }

  if (tipoModelo === 'resumo_executivo' || tipoModelo === 'orcamento_custos') {
    lines.push('');
    lines.push(`💵 *Saúde Financeira do Projeto:*`);
    lines.push(`  • Orçamento Aprovado: *${formatCurrencyBRL(projeto.orcamentoPrevisto)}*`);
    lines.push(`  • Custo Realizado: *${formatCurrencyBRL(projeto.custoRealizado)}*`);
    lines.push(`  • Saldo Disponível: *${formatCurrencyBRL(saldo)}* (${saldo >= 0 ? 'Dentro da meta orçamentária' : 'Atenção: Excedente orçamentário'})`);
    if (projeto.roiEstimadoMeses) {
      lines.push(`  • ROI Estimado: *${projeto.roiEstimadoMeses} meses*`);
    }
    if (projeto.retornoEsperadoDescricao) {
      lines.push(`  • Retorno Esperado: ${projeto.retornoEsperadoDescricao}`);
    }
  }

  if (tipoModelo === 'status_report') {
    lines.push('');
    lines.push(`📝 *Quadro de Ações Rápidas:*`);
    const tarefas = projeto.tarefas || [];
    const concluidas = tarefas.filter((t) => t.concluida).length;
    lines.push(`  • Tarefas Concluídas: ${concluidas}/${tarefas.length}`);
    const pendentes = tarefas.filter((t) => !t.concluida).slice(0, 4);
    if (pendentes.length > 0) {
      lines.push(`  • Próximas Atividades Prioritárias:`);
      pendentes.forEach((t) => {
        lines.push(`    - [${t.prioridade.toUpperCase()}] ${t.titulo} (Resp: ${t.responsavel || 'Equipe'})`);
      });
    }

    if (projeto.riscos && projeto.riscos.length > 0) {
      const riscosAltos = projeto.riscos.filter((r) => r.impacto === 'Alto');
      if (riscosAltos.length > 0) {
        lines.push('');
        lines.push(`⚠️ *Atenção aos Riscos Mapeados:*`);
        riscosAltos.forEach((r) => {
          lines.push(`  • [Impacto Alto] ${r.descricao} - Mitigação: ${r.planoMitigacao || 'Em monitoramento'}`);
        });
      }
    }
  }

  // Observações Customizadas Adicionais
  if (customNote && customNote.trim()) {
    lines.push('');
    lines.push(`💬 *Mensagem da Gestão:*`);
    lines.push(customNote.trim());
  }

  // Rodapé institucional
  lines.push('');
  lines.push('──────────────────────────────');
  lines.push(`*${STRATEGIC_GUIDELINES.assinatura}*`);

  return lines.join('\n');
}

/**
 * Gera conteúdo rico para disparo de E-mail
 */
export function generateProjetoEmailContent(
  projeto: ProjetoGerencial,
  customNote?: string,
  tipoModelo: TipoModeloResumoProjeto = 'resumo_executivo'
): { subject: string; body: string } {
  const progressBar = getProgressBarText(projeto.progressoPercentual);
  const dataFimBR = formatDateBR(projeto.dataPrevisaoFim);
  const dataInicioBR = formatDateBR(projeto.dataInicio);
  const saldo = projeto.orcamentoPrevisto - projeto.custoRealizado;
  const marcosConcluidos = projeto.marcos.filter((m) => m.concluido).length;
  const totalMarcos = projeto.marcos.length;

  let modelName = 'Resumo Executivo';
  if (tipoModelo === 'status_report') modelName = 'Status Report';
  else if (tipoModelo === 'marcos_prazos') modelName = 'Marcos & Prazos';
  else if (tipoModelo === 'orcamento_custos') modelName = 'Acompanhamento Financeiro';

  const subject = `[JMT Projetos] ${modelName}: ${projeto.codigo} - ${projeto.titulo} (${projeto.progressoPercentual}%)`;

  const bodyLines: string[] = [
    `Prezados(as),`,
    '',
    `Segue o alinhamento executivo atualizado do projeto gerencial sob governança da JMT Transportes:`,
    '',
    `=======================================================`,
    `INFORMAÇÕES ESTRATÉGICAS DO PROJETO`,
    `=======================================================`,
    `Código do Projeto: ${projeto.codigo}`,
    `Título: ${projeto.titulo}`,
    `Categoria: ${projeto.categoria}`,
    `Setor Impactado: ${projeto.setorImpactado}`,
    `Status: ${projeto.status}`,
    `Prioridade: ${projeto.prioridade}`,
    `Progresso Geral: ${progressBar}`,
    `Líder do Projeto: ${projeto.liderProjetoNome}${projeto.liderCargo ? ` (${projeto.liderCargo})` : ''}`,
    `Equipe: ${projeto.equipeMembros && projeto.equipeMembros.length > 0 ? projeto.equipeMembros.join(', ') : 'Não informada'}`,
    `Vigência Prevista: ${dataInicioBR} até ${dataFimBR}`,
    `Alinhamento RDC 430/2020: ${projeto.alinhamentoRDC430 ? 'Sim (Auditável)' : 'Não aplicável'}`,
    '',
    `Objetivo do Projeto:`,
    `${projeto.descricao || 'Sem descrição cadastrada.'}`,
    '',
    `=======================================================`,
    `MARCOS E ENTREGAS (${marcosConcluidos}/${totalMarcos} CONCLUÍDOS)`,
    `=======================================================`,
  ];

  if (projeto.marcos.length === 0) {
    bodyLines.push('Nenhum marco cadastrado.');
  } else {
    projeto.marcos.forEach((m) => {
      bodyLines.push(
        `- [${m.concluido ? 'CONCLUÍDO' : 'PENDENTE'}] ${m.titulo} | Prazo: ${formatDateBR(m.dataLimite)}${m.responsavel ? ` | Resp: ${m.responsavel}` : ''}`
      );
    });
  }

  bodyLines.push(
    '',
    `=======================================================`,
    `ORÇAMENTO E FINANÇAS`,
    `=======================================================`,
    `Orçamento Total Aprovado: ${formatCurrencyBRL(projeto.orcamentoPrevisto)}`,
    `Custo Realizado Atual: ${formatCurrencyBRL(projeto.custoRealizado)}`,
    `Saldo Disponível: ${formatCurrencyBRL(saldo)}`,
    projeto.roiEstimadoMeses ? `Retorno do Investimento (ROI): Estimado em ${projeto.roiEstimadoMeses} meses` : '',
    projeto.retornoEsperadoDescricao ? `Ganhos Esperados: ${projeto.retornoEsperadoDescricao}` : ''
  );

  if (customNote && customNote.trim()) {
    bodyLines.push(
      '',
      `=======================================================`,
      `OBSERVAÇÕES E NOTAS DA GESTÃO`,
      `=======================================================`,
      customNote.trim()
    );
  }

  bodyLines.push(
    '',
    '-------------------------------------------------------',
    STRATEGIC_GUIDELINES.assinatura
  );

  return {
    subject,
    body: bodyLines.filter((l) => l !== undefined).join('\n'),
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
