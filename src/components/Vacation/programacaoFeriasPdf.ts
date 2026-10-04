// ============================================================================
// Programação de Férias para ciência e assinatura do colaborador (2026-10-04) —
// gerada pelo próprio sistema a partir da programação (não depende da
// contabilidade). Vai para o portal do colaborador (aba Documentos), categoria
// 'ferias' com tipo 'Programação de Férias', ao lado do Aviso e do Recibo.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import type { ProgramacaoFerias } from '../../types';
import { formatDate } from '../../utils/formatters';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [110, 110, 110];
const MARGEM = 16;
const MM_PARA_PT = 72 / 25.4;

export const TIPO_PROGRAMACAO_FERIAS = 'Programação de Férias';

/** Dia seguinte (YYYY-MM-DD), sem depender do fuso do navegador. */
function diaSeguinte(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Etapas de gozo (uma só, ou as do fracionamento). */
export function etapasDaProgramacao(f: ProgramacaoFerias): { inicio: string; fim: string; dias: number }[] {
  if (f.fracionamento?.length) return f.fracionamento.filter((e) => e.dataInicio && e.dataFim).map((e) => ({ inicio: e.dataInicio, fim: e.dataFim, dias: e.dias }));
  if (f.dataInicio && f.dataFim) return [{ inicio: f.dataInicio, fim: f.dataFim, dias: f.diasGozados || 0 }];
  return [];
}

export function tituloProgramacaoFerias(f: ProgramacaoFerias): string {
  const etapas = etapasDaProgramacao(f);
  if (etapas.length === 0) return TIPO_PROGRAMACAO_FERIAS;
  const fim = etapas[etapas.length - 1].fim;
  return `${TIPO_PROGRAMACAO_FERIAS} — ${formatDate(etapas[0].inicio)} a ${formatDate(fim)}`;
}

export function gerarProgramacaoFeriasPdf(params: {
  colaborador: { nomeCompleto: string; cpf?: string; funcaoCargo?: string; codigoMatricula?: string };
  programacao: ProgramacaoFerias;
}): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const { colaborador: c, programacao: f } = params;
  const etapas = etapasDaProgramacao(f);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();

  const logoLargura = 36;
  const logoAltura = (logoLargura * 339) / 900;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 12, logoLargura, logoAltura, 'jmt-logo', 'FAST');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...TEXTO);
  doc.text('PROGRAMAÇÃO DE FÉRIAS', largura - MARGEM, 17, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRONZE);
  if (etapas.length) doc.text(`${formatDate(etapas[0].inicio)} a ${formatDate(etapas[etapas.length - 1].fim)}`, largura - MARGEM, 22.5, { align: 'right' });
  let y = 12 + logoAltura + 4;
  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, y, largura - 2 * MARGEM, 0.6, 'F');
  y += 7;

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

  const linhas: string[][] = [];
  if (f.periodoAquisitivoInicio && f.periodoAquisitivoFim) linhas.push(['Período aquisitivo', `${formatDate(f.periodoAquisitivoInicio)} a ${formatDate(f.periodoAquisitivoFim)}`]);
  if (f.prazoLimiteGozo) linhas.push(['Prazo legal para o gozo', `até ${formatDate(f.prazoLimiteGozo)}`]);
  etapas.forEach((e, i) =>
    linhas.push([etapas.length > 1 ? `Gozo — ${i + 1}ª etapa` : 'Período de gozo', `${formatDate(e.inicio)} a ${formatDate(e.fim)} (${e.dias} dias)`])
  );
  linhas.push(['Total de dias de gozo', `${etapas.reduce((s, e) => s + (e.dias || 0), 0) || f.diasGozados || 0} dias`]);
  linhas.push(['Abono pecuniário (venda de dias)', f.abonoPecuniario ? `Sim — ${f.diasAbono || 0} dias` : 'Não']);
  if (etapas.length) linhas.push(['Retorno ao trabalho', formatDate(diaSeguinte(etapas[etapas.length - 1].fim))]);

  autoTable(doc, {
    startY: y + 2,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Item', 'Programação']],
    body: linhas,
    styles: { fontSize: 9.5, cellPadding: 2.4, textColor: [40, 40, 40], lineColor: [225, 225, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [248, 240, 228], textColor: TEXTO, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 80 } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (f.observacoes?.trim()) {
    doc.setFontSize(8.5);
    doc.setTextColor(...CINZA);
    const obs = doc.splitTextToSize(`Observações: ${f.observacoes.trim()}`, largura - 2 * MARGEM) as string[];
    doc.text(obs, MARGEM, y);
    y += obs.length * 4 + 2;
  }
  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA);
  const nota = doc.splitTextToSize(
    'Esta é a programação das suas férias. O aviso e o recibo de férias, com os valores, são entregues separadamente pelo Departamento Pessoal. Em caso de divergência nas datas, procure o Departamento Pessoal antes de assinar.',
    largura - 2 * MARGEM
  ) as string[];
  doc.text(nota, MARGEM, y);
  y += nota.length * 3.6 + 12;

  doc.setFontSize(9);
  doc.setTextColor(...TEXTO);
  const declaracao = doc.splitTextToSize(
    'Declaro que tomei ciência da programação das minhas férias, conforme as datas acima.',
    largura - 2 * MARGEM
  ) as string[];
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

  const nome = `Programacao_Ferias_${etapas[0]?.inicio || 'sem_data'}_${c.nomeCompleto}`.replace(/[^\p{L}\p{N}]+/gu, '_');
  return { arquivo: new File([doc.output('blob')], `${nome}.pdf`, { type: 'application/pdf' }), camposAssinatura };
}
