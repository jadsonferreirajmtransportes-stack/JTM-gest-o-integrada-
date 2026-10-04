// ============================================================================
// Demonstrativo de Vale-Alimentação da quinzena (2026-10-03) — um PDF por
// colaborador, no padrão JMT, que vai para o portal do colaborador (aba
// Documentos) para conferência e assinatura, igual ao contracheque.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import type { LancamentoValeAlimentacao } from '../../types';
import { formatDate, formatMoney } from '../../utils/formatters';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [110, 110, 110];
const MARGEM = 16;
const MM_PARA_PT = 72 / 25.4;

/** "1ª QUINZENA - OUTUBRO/2026" -> "1ª quinzena de outubro/2026" (para títulos e frases). */
export function quinzenaPorExtenso(identificacao: string): string {
  const m = identificacao.match(/^(\S+)\s+QUINZENA\s*-\s*(.+)$/i);
  if (!m) return identificacao;
  return `${m[1]} quinzena de ${m[2].toLowerCase()}`;
}

export function declaracaoVa(l: LancamentoValeAlimentacao): string {
  return `Declaro que conferi este demonstrativo e que estou ciente do valor de ${formatMoney(l.valorDisponibilizado)} de vale-alimentação referente à ${quinzenaPorExtenso(l.identificacaoQuinzena)} (${formatDate(l.dataInicio)} a ${formatDate(l.dataTermino)}).`;
}

export function gerarDemonstrativoVaPdf(params: {
  colaborador: { nomeCompleto: string; cpf?: string; funcaoCargo?: string; codigoMatricula?: string };
  lancamento: LancamentoValeAlimentacao;
}): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const { colaborador: c, lancamento: l } = params;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();

  // Cabeçalho
  const logoLargura = 36;
  const logoAltura = (logoLargura * 339) / 900;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 12, logoLargura, logoAltura, 'jmt-logo', 'FAST');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...TEXTO);
  doc.text('DEMONSTRATIVO DE VALE-ALIMENTAÇÃO', largura - MARGEM, 17, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRONZE);
  doc.text(l.identificacaoQuinzena, largura - MARGEM, 22.5, { align: 'right' });
  let y = 12 + logoAltura + 4;
  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, y, largura - 2 * MARGEM, 0.6, 'F');
  y += 7;

  // Identificação
  doc.setFontSize(9);
  doc.setTextColor(...TEXTO);
  doc.text(`Empregador: ${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, MARGEM, y);
  y += 5;
  doc.text(`Colaborador(a): ${c.nomeCompleto}${c.cpf ? ` — CPF ${c.cpf}` : ''}${c.codigoMatricula ? ` — Matrícula ${c.codigoMatricula}` : ''}`, MARGEM, y);
  y += 5;
  if (c.funcaoCargo) {
    doc.text(`Cargo: ${c.funcaoCargo}`, MARGEM, y);
    y += 5;
  }

  // Cálculo
  const faltas = l.faltas || 0;
  const ferias = l.diasFerias || 0;
  const extras = l.diariasExtras || 0;
  const diasUteis = Math.max(0, (l.quantidadeDiarias || 0) + faltas + ferias - extras);
  autoTable(doc, {
    startY: y + 2,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Descrição', 'Quantidade / valor']],
    body: [
      ['Período', `${formatDate(l.dataInicio)} a ${formatDate(l.dataTermino)}`],
      ['Dias úteis no período', String(diasUteis)],
      ['(-) Faltas', String(faltas)],
      ['(-) Dias de férias', String(ferias)],
      ['(+) Diárias extras', String(extras)],
      ['(=) Diárias pagas', String(l.quantidadeDiarias || 0)],
      ['Valor da diária', formatMoney(l.valorDiaria)],
      ['VALOR DISPONIBILIZADO', formatMoney(l.valorDisponibilizado)],
    ],
    styles: { fontSize: 9.5, cellPadding: 2.4, textColor: [40, 40, 40], lineColor: [225, 225, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [248, 240, 228], textColor: TEXTO, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 60 } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 7) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [253, 246, 236];
        data.cell.styles.textColor = TEXTO;
        data.cell.styles.fontSize = 10.5;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (l.observacoes?.trim()) {
    doc.setFontSize(8.5);
    doc.setTextColor(...CINZA);
    const obs = doc.splitTextToSize(`Observações: ${l.observacoes.trim()}`, largura - 2 * MARGEM) as string[];
    doc.text(obs, MARGEM, y);
    y += obs.length * 4 + 2;
  }
  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA);
  const nota = doc.splitTextToSize(
    'Faltas, férias e suspensões registradas no período não geram diária. Em caso de divergência, procure o Departamento Pessoal antes de assinar.',
    largura - 2 * MARGEM
  ) as string[];
  doc.text(nota, MARGEM, y);
  y += nota.length * 3.6 + 12;

  // Declaração + assinatura
  doc.setFontSize(9);
  doc.setTextColor(...TEXTO);
  const declaracao = doc.splitTextToSize(declaracaoVa(l), largura - 2 * MARGEM) as string[];
  doc.text(declaracao, MARGEM, y);
  y += declaracao.length * 4.3 + 20;

  const larguraLinha = 85;
  const xLinha = (largura - larguraLinha) / 2;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(xLinha, y, xLinha + larguraLinha, y);
  doc.setFontSize(8);
  doc.text('Assinatura do colaborador', largura / 2, y + 4, { align: 'center' });
  const camposAssinatura: CampoAssinaturaPdf[] = [
    { pagina: 0, x: xLinha * MM_PARA_PT, y: altura * MM_PARA_PT - y * MM_PARA_PT + 1, largura: larguraLinha * MM_PARA_PT, altura: 30 },
  ];

  doc.setFontSize(6.5);
  doc.setTextColor(...CINZA);
  doc.text(`Jobson de Moraes Transportes — Departamento Pessoal. Emitido em ${new Date().toLocaleDateString('pt-BR')}.`, largura / 2, altura - 8, { align: 'center' });

  const nome = `Vale_Alimentacao_${l.dataInicio}_${c.nomeCompleto}`.replace(/[^\p{L}\p{N}]+/gu, '_');
  return { arquivo: new File([doc.output('blob')], `${nome}.pdf`, { type: 'application/pdf' }), camposAssinatura };
}
