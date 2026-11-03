// ============================================================================
// PDF do relatório de um registro da Qualidade — feito para o desvio (com CAPA),
// serve também para excursão de temperatura, reclamação e auditoria.
// A4 retrato: identificação, textos, ações, anexos, histórico e assinaturas.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { configQualidade } from '../../data/qualidadeConfig';
import { RegistroQualidade, hojeIso, protocoloQualidade } from '../../utils/qualidadeApi';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [110, 110, 110];
const CREME: [number, number, number] = [248, 240, 228];

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
// Fonte padrão do PDF (WinAnsi): troca setas e símbolos fora dela para não sair texto embaralhado.
const EXTRAS = '–—‘’‚“”„•…€™ŠšŽžŒœŸ†‡‰‹›ˆ˜ƒ';
const S = (s: string) =>
  s.replace(/[→⇒➔]/g, '->').replace(/[←]/g, '<-').replace(/[‐-‒]/g, '-').replace(/./gu, (c) => (c.charCodeAt(0) <= 255 || EXTRAS.includes(c) ? c : ''));
const valor = (v: any) => (v === true ? 'Sim' : v === false ? 'Não' : v === undefined || v === null || v === '' ? '—' : String(v));

export function gerarRelatorioQualidadePdf(r: RegistroQualidade): File {
  const cfg = configQualidade(r.tipo);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const M = 14;
  const larg = L - 2 * M;
  const protocolo = protocoloQualidade(r);
  const situacao = cfg.status.find((s) => s.id === r.status)?.rotulo || r.status;
  let y = 32;

  const garantirEspaco = (h: number) => {
    if (y + h > A - 22) {
      doc.addPage();
      y = 32;
    }
  };
  const tituloSecao = (t: string) => {
    garantirEspaco(14);
    doc.setFillColor(...BRONZE);
    doc.rect(M, y, 1.2, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXTO);
    doc.text(S(t.toUpperCase()), M + 3.5, y + 4);
    y += 8;
  };
  const tabela = (opcoes: Parameters<typeof autoTable>[1]) => {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: 30, bottom: 20 },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: [45, 45, 45], lineColor: [220, 220, 220], lineWidth: 0.15, valign: 'top' },
      headStyles: { fillColor: CREME, textColor: TEXTO, fontStyle: 'bold' },
      ...opcoes,
      head: opcoes?.head?.map((l: any) => l.map((c: any) => (typeof c === 'string' ? S(c) : c))),
      body: opcoes?.body?.map((l: any) => l.map((c: any) => (typeof c === 'string' ? S(c) : c))),
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  };

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...TEXTO);
  doc.text(`RELATÓRIO DE ${cfg.singular.toUpperCase()}`, M, y);
  doc.setFontSize(11);
  doc.setTextColor(...BRONZE);
  doc.text(protocolo, L - M, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXTO);
  const linhasTitulo = doc.splitTextToSize(S(r.titulo || '—'), larg);
  doc.text(linhasTitulo, M, y);
  y += linhasTitulo.length * 4.6 + 3;

  // 1. Identificação
  tituloSecao('1. Identificação');
  const curtos = cfg.campos.filter((c) => c.tipo !== 'paragrafo');
  const pares: [string, string][] = [
    ['Situação', situacao],
    [cfg.rotuloData, dataBr(r.data)],
    ...(cfg.rotuloPrazo ? [[cfg.rotuloPrazo, dataBr(r.prazo)] as [string, string]] : []),
    ['Responsável', valor(r.responsavel)],
    ['Origem', r.origem === 'portal' ? `Relato pelo portal do colaborador${r.colaboradorNome ? ` (${r.colaboradorNome})` : ''}` : `Registro da gestão${r.criadoPor ? ` (${r.criadoPor})` : ''}`],
    ['Aberto em', dataHora(r.criadoEm)],
    ...curtos.map((c) => [c.rotulo, c.tipo === 'data' ? dataBr(r.dados[c.chave]) : valor(r.dados[c.chave])] as [string, string]),
  ];
  // Duas colunas de pares (rótulo | valor | rótulo | valor).
  const linhas: string[][] = [];
  for (let i = 0; i < pares.length; i += 2) linhas.push([pares[i][0], pares[i][1], pares[i + 1]?.[0] || '', pares[i + 1]?.[1] || '']);
  tabela({
    body: linhas,
    columnStyles: {
      0: { cellWidth: 34, fontStyle: 'bold', fillColor: [250, 247, 242] },
      1: { cellWidth: larg / 2 - 34 },
      2: { cellWidth: 34, fontStyle: 'bold', fillColor: [250, 247, 242] },
    },
  });

  // 2. Textos (descrição, investigação, impacto, eficácia...)
  const longos = cfg.campos.filter((c) => c.tipo === 'paragrafo');
  longos.forEach((c, i) => {
    tituloSecao(`${i + 2}. ${c.rotulo}`);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...(r.dados[c.chave] ? TEXTO : CINZA));
    const t = doc.splitTextToSize(S(String(r.dados[c.chave] || 'Não preenchido.')), larg);
    for (const linha of t) {
      garantirEspaco(5);
      doc.text(linha, M, y);
      y += 4.3;
    }
    y += 3;
  });
  let n = longos.length + 2;

  // Ações (CAPA / achados)
  if (cfg.acoes) {
    tituloSecao(`${n++}. ${cfg.acoes.titulo}`);
    if (r.acoes.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(...CINZA);
      doc.text('Nenhuma ação registrada.', M, y);
      y += 7;
    } else {
      const hoje = hojeIso();
      tabela({
        head: [['Tipo', 'O que será feito', 'Responsável', 'Prazo', 'Situação', 'Evidência']],
        body: r.acoes.map((a) => [
          a.tipo,
          a.descricao || '—',
          a.responsavel || '—',
          dataBr(a.prazo),
          a.status + (a.concluidaEm ? ` em ${dataBr(a.concluidaEm)}` : (a.status === 'Pendente' || a.status === 'Em andamento') && a.prazo && a.prazo < hoje ? ' (ATRASADA)' : ''),
          a.evidencia || '—',
        ]),
        columnStyles: { 0: { cellWidth: 26 }, 2: { cellWidth: 26 }, 3: { cellWidth: 19 }, 4: { cellWidth: 24 } },
      });
    }
  }

  // Anexos
  if (r.anexos.length) {
    tituloSecao(`${n++}. Anexos`);
    tabela({ body: r.anexos.map((a, i) => [String(i + 1), a.nome]), columnStyles: { 0: { cellWidth: 8, halign: 'center' } } });
  }

  // Histórico
  if (r.historico.length) {
    tituloSecao(`${n++}. Histórico`);
    tabela({ head: [['Quando', 'Quem', 'O quê']], body: r.historico.map((h) => [dataHora(h.em), h.por, h.texto]), columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 40 } } });
  }

  // Assinaturas
  garantirEspaco(40);
  tituloSecao(`${n}. Aprovação`);
  y += 14;
  const w = (larg - 12) / 2;
  [
    ['Elaborado por (Qualidade)', M],
    ['Aprovado por (Responsável Técnico)', M + w + 12],
  ].forEach(([rot, x]) => {
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.line(x as number, y, (x as number) + w, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text(rot as string, x as number, y + 4);
    doc.text('Data: ____/____/________', x as number, y + 9);
  });

  // Cabeçalho e rodapé em todas as páginas
  const total = doc.getNumberOfPages();
  const logoL = 30;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', M, 9, logoL, (logoL * 339) / 900, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRONZE);
    doc.text('GARANTIA DA QUALIDADE', L - M, 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CINZA);
    doc.text(`${cfg.singular} ${protocolo}`, L - M, 17.5, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(M, 22, larg, 0.5, 'F');
    doc.setFontSize(7);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} · CNPJ ${EMPRESA_REGULAMENTO.cnpj} — gerado em ${new Date().toLocaleString('pt-BR')}`, M, A - 8);
    doc.text(`Página ${p} de ${total}`, L - M, A - 8, { align: 'right' });
  }
  return new File([doc.output('blob')], `Relatorio_${protocolo}.pdf`, { type: 'application/pdf' });
}
