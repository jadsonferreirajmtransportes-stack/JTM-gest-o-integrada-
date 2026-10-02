// ============================================================================
// Espelho mensal de frequência em PDF (jsPDF + autotable), com a linha de
// assinatura do colaborador em posição conhecida — pra ir pro link de
// assinatura (documentos_assinatura, categoria 'ponto').
// Controle interno: o rodapé deixa claro que não substitui o ponto oficial.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import type { JornadaPonto } from '../../utils/frequenciaApi';
import { DiaEspelho, NOMES_DIA, ResumoFrequencia, diaDaSemana, formatarMinutos, horaLocal } from './frequenciaCalc';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [110, 110, 110];
const MARGEM = 14;
const MM_PARA_PT = 72 / 25.4;

export function nomeMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  const nome = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}/${a}`;
}

export function gerarEspelhoPdf(params: {
  colaborador: { nomeCompleto: string; cpf?: string; funcaoCargo?: string; codigoMatricula?: string };
  mes: string;
  jornada?: JornadaPonto;
  espelho: DiaEspelho[];
  resumo: ResumoFrequencia;
}): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const { colaborador: c, mes, jornada, espelho, resumo } = params;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();

  const logoLargura = 34;
  const logoAltura = (logoLargura * 339) / 900;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 10, logoLargura, logoAltura, 'jmt-logo', 'FAST');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...TEXTO);
  doc.text('ESPELHO DE FREQUÊNCIA', largura - MARGEM, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRONZE);
  doc.text(nomeMes(mes), largura - MARGEM, 20, { align: 'right' });
  let y = 10 + logoAltura + 3;
  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, y, largura - 2 * MARGEM, 0.6, 'F');
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(...TEXTO);
  doc.text(`Empregador: ${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, MARGEM, y);
  y += 4.5;
  doc.text(
    `Colaborador(a): ${c.nomeCompleto}${c.cpf ? ` — CPF ${c.cpf}` : ''}${c.codigoMatricula ? ` — Matrícula ${c.codigoMatricula}` : ''}${c.funcaoCargo ? ` — ${c.funcaoCargo}` : ''}`,
    MARGEM,
    y
  );
  y += 4.5;
  doc.text(
    jornada
      ? `Jornada: ${jornada.nome} — ${jornada.entrada}${jornada.saidaIntervalo ? ` às ${jornada.saidaIntervalo} / ${jornada.voltaIntervalo}` : ''} às ${jornada.saida} (${jornada.diasSemana.map((d) => NOMES_DIA[d]).join(', ')})`
      : 'Jornada: não definida',
    MARGEM,
    y
  );
  y += 3;

  const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  autoTable(doc, {
    startY: y + 2,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Dia', '', '1ª', '2ª', '3ª', '4ª', 'Trabalhado', 'Saldo', 'Situação / observação']],
    body: espelho.map((d) => {
      const horas = d.batidas.map((b) => `${horaLocal(b.registradoEm)}${b.origem === 'ajuste' ? '*' : ''}`);
      const extras = horas.length > 4 ? ` (+${horas.slice(4).join(' ')})` : '';
      const obs =
        d.justificativa ? `${d.justificativa.tipo}${d.justificativa.observacao ? ` — ${d.justificativa.observacao}` : ''}` : d.situacao === 'Atraso' ? `Atraso ${d.atrasoMin} min` : d.situacao;
      return [
        dataBr(d.data),
        NOMES_DIA[diaDaSemana(d.data)],
        horas[0] || '',
        horas[1] || '',
        horas[2] || '',
        horas[3] || '',
        d.trabalhadoMin ? formatarMinutos(d.trabalhadoMin) : '',
        d.saldoMin ? formatarMinutos(d.saldoMin, true) : '',
        `${obs}${extras}`,
      ];
    }),
    styles: { fontSize: 7.5, cellPadding: 1.2, textColor: [40, 40, 40], lineColor: [225, 225, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [248, 240, 228], textColor: TEXTO, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 11 }, 1: { cellWidth: 9 }, 2: { cellWidth: 11 }, 3: { cellWidth: 11 }, 4: { cellWidth: 11 }, 5: { cellWidth: 11 }, 6: { cellWidth: 17 }, 7: { cellWidth: 15 } },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const d = espelho[data.row.index];
      if (d.situacao === 'Falta') data.cell.styles.textColor = [190, 30, 45];
      else if (d.situacao === 'Folga' || d.situacao === 'Fora do período' || d.situacao === 'Futuro') data.cell.styles.textColor = [150, 150, 150];
    },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  if (y > altura - 60) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXTO);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do mês', MARGEM, y);
  doc.setFont('helvetica', 'normal');
  y += 4.5;
  doc.text(
    [
      `Dias previstos: ${resumo.diasPrevistos}`,
      `Dias com batida: ${resumo.diasTrabalhados}`,
      `Faltas: ${resumo.faltas}`,
      `Justificados: ${resumo.justificados}`,
      `Atrasos acima da tolerância: ${resumo.atrasos} (${resumo.minutosAtraso} min)`,
    ].join('   ·   '),
    MARGEM,
    y
  );
  y += 4.5;
  doc.text(`Horas trabalhadas: ${formatarMinutos(resumo.trabalhadoMin)}   ·   Saldo: ${formatarMinutos(resumo.saldoMin, true)}`, MARGEM, y);
  y += 4.5;
  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA);
  doc.text('* batida incluída por ajuste do Departamento Pessoal, com motivo registrado.', MARGEM, y);
  y += 12;

  doc.setFontSize(8.5);
  doc.setTextColor(...TEXTO);
  const declaracao = doc.splitTextToSize(
    'Declaro que conferi os registros acima, que correspondem à minha frequência no período.',
    largura - 2 * MARGEM
  ) as string[];
  doc.text(declaracao, MARGEM, y);
  y += declaracao.length * 4 + 16;

  const larguraLinha = 85;
  const xLinha = (largura - larguraLinha) / 2;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(xLinha, y, xLinha + larguraLinha, y);
  doc.setFontSize(8);
  doc.text('Assinatura do colaborador', largura / 2, y + 4, { align: 'center' });
  const camposAssinatura: CampoAssinaturaPdf[] = [
    {
      pagina: doc.getNumberOfPages() - 1,
      x: xLinha * MM_PARA_PT,
      y: altura * MM_PARA_PT - y * MM_PARA_PT + 1,
      largura: larguraLinha * MM_PARA_PT,
      altura: 30,
    },
  ];

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setTextColor(...CINZA);
    doc.text(
      `Controle interno de frequência — não substitui o registro oficial de ponto. Emitido em ${new Date().toLocaleDateString('pt-BR')}. Página ${p} de ${total}.`,
      largura / 2,
      altura - 7,
      { align: 'center' }
    );
  }

  const nome = `Espelho_${mes}_${c.nomeCompleto}`.replace(/[^\p{L}\p{N}]+/gu, '_');
  return { arquivo: new File([doc.output('blob')], `${nome}.pdf`, { type: 'application/pdf' }), camposAssinatura };
}
