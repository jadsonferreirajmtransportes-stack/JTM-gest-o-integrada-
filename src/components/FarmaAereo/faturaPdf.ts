// ============================================================================
// Fatura em PDF — layout padrão JMT para todos os clientes: prestador (JMT) e
// tomador (cliente), número/período/modal, tabela dos CT-es com o Valor a Cobrar
// (mesmo cálculo da tela) e o resumo (total, recebido, em aberto).
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Cliente, FaturaAereo, LancamentoFaturamentoAereo } from '../../types';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { computeValorACobrar, ehModalRodoviario } from './faturamentoAereoUtils';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [51, 51, 51];
const CINZA: [number, number, number] = [110, 110, 110];
const AREIA: [number, number, number] = [250, 246, 238];

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const num = (v?: number, casas = 2) => (v === undefined || v === null ? '' : v.toLocaleString('pt-BR', { maximumFractionDigits: casas }));

export function gerarFaturaPdf(fatura: FaturaAereo, lancamentos: LancamentoFaturamentoAereo[], cliente?: Cliente): File {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const M = 14;
  const largura = L - 2 * M;

  const linhas = [...lancamentos].sort(
    (a, b) => (a.dataEmissao || '').localeCompare(b.dataEmissao || '') || (a.numeroCte || '').localeCompare(b.numeroCte || '', 'pt-BR', { numeric: true })
  );
  const valores = linhas.map((l) => computeValorACobrar(l, cliente));
  const total = valores.reduce((s, v) => s + v, 0);
  const recebido = linhas.reduce((s, l) => s + (l.confirmacaoPagamento ? l.valorRecebido || 0 : 0), 0);
  const pesoTotal = linhas.reduce((s, l) => s + (l.pesoKg || 0), 0);
  const modal = ehModalRodoviario(fatura.modal) ? 'Rodoviário' : 'Aéreo';

  // ---- Cabeçalho ----
  const logoL = 46;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', M, 12, logoL, (logoL * 339) / 900, 'jmt-logo', 'FAST');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...TEXTO);
  doc.text('FATURA', L - M, 20, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(...BRONZE);
  doc.text(`Nº ${fatura.numeroFatura}`, L - M, 26.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text(`Emitida em ${new Date().toLocaleDateString('pt-BR')}`, L - M, 31.5, { align: 'right' });
  doc.setFillColor(...BRONZE);
  doc.rect(M, 37, largura, 0.6, 'F');

  // ---- Prestador / Tomador ----
  let y = 43;
  const caixa = (x: number, w: number, rotulo: string, entrada: string[]) => {
    // Cada informação pode quebrar em mais de uma linha (endereço longo).
    const linhasTexto: { t: string; principal: boolean }[] = [];
    entrada.forEach((t, i) => {
      doc.setFontSize(i === 0 ? 9.5 : 8.5);
      (doc.splitTextToSize(t, w - 8) as string[]).forEach((l) => linhasTexto.push({ t: l, principal: i === 0 }));
    });
    const h = 6 + linhasTexto.length * 4.3 + 2;
    doc.setFillColor(...AREIA);
    doc.rect(x, y, w, h, 'F');
    doc.setFillColor(...BRONZE);
    doc.rect(x, y, 1, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BRONZE);
    doc.text(rotulo, x + 4, y + 5);
    linhasTexto.forEach(({ t, principal }, i) => {
      doc.setFont('helvetica', principal ? 'bold' : 'normal');
      doc.setFontSize(principal ? 9.5 : 8.5);
      doc.setTextColor(...(principal ? TEXTO : CORPO));
      doc.text(t, x + 4, y + 10 + i * 4.3);
    });
    return h;
  };
  const w = (largura - 6) / 2;
  const prestador = [EMPRESA_REGULAMENTO.razaoSocial, `CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, `${EMPRESA_REGULAMENTO.endereco}`, `CEP ${EMPRESA_REGULAMENTO.cep} — ${EMPRESA_REGULAMENTO.cidadeUF}`];
  const tomador = [
    cliente?.razaoSocial || fatura.clienteNome,
    cliente?.cnpj ? `CNPJ ${cliente.cnpj}` : '',
    cliente?.enderecoCompleto || '',
    [cliente?.cep ? `CEP ${cliente.cep}` : '', cliente?.cidadeUF || ''].filter(Boolean).join(' — '),
    cliente?.emailPrincipal || '',
  ].filter(Boolean);
  const h1 = caixa(M, w, 'PRESTADOR DO SERVIÇO', prestador);
  const h2 = caixa(M + w + 6, w, 'CLIENTE (TOMADOR)', tomador);
  y += Math.max(h1, h2) + 5;

  // ---- Dados da fatura ----
  const dados: [string, string][] = [
    ['Período', fatura.periodo || '—'],
    ['Modal', modal],
    ['CT-es', String(linhas.length)],
    ['Peso total', `${num(pesoTotal)} kg`],
    ...(fatura.numeroNF ? ([['NF de serviço', fatura.numeroNF]] as [string, string][]) : []),
    ...(cliente?.tabelaFrete?.condicaoPagamento ? ([['Condição de pagamento', cliente.tabelaFrete.condicaoPagamento]] as [string, string][]) : []),
  ];
  // Três por linha, para caber período e condição de pagamento por extenso.
  const colW = largura / 3;
  dados.forEach(([r, v], i) => {
    const x = M + (i % 3) * colW;
    const yy = y + Math.floor(i / 3) * 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...BRONZE);
    doc.text(r.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXTO);
    doc.text((doc.splitTextToSize(v, colW - 3) as string[])[0], x, yy + 4.5);
  });
  y += Math.ceil(dados.length / 3) * 10;

  // ---- CT-es ----
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, top: 20, bottom: 18 },
    head: [['Emissão', 'CT-e', 'NF', 'Destinatário', 'Cidade/UF', 'Peso (kg)', 'Custo extra', 'Valor']],
    body: linhas.map((l, i) => [
      dataBr(l.dataEmissao),
      l.numeroCte || '—',
      l.notaFiscal || '—',
      l.destinatario || '—',
      [l.cidadeDestino, l.estadoDestino].filter(Boolean).join('/') || '—',
      num(l.pesoKg),
      l.tipoCustoExtra || '',
      moeda(valores[i]),
    ]),
    foot: [['', '', '', '', 'Total', num(pesoTotal), '', moeda(total)]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.3, cellPadding: 1.5, textColor: CORPO, lineColor: [225, 225, 225], lineWidth: 0.15, overflow: 'linebreak' },
    headStyles: { fillColor: [248, 240, 228], textColor: TEXTO, fontStyle: 'bold' },
    footStyles: { fillColor: [248, 240, 228], textColor: TEXTO, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [252, 250, 247] },
    columnStyles: { 0: { cellWidth: 17 }, 1: { cellWidth: 16 }, 2: { cellWidth: 18 }, 4: { cellWidth: 28 }, 5: { cellWidth: 15, halign: 'right' }, 6: { cellWidth: 24 }, 7: { cellWidth: 22, halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ---- Resumo ----
  const emAberto = Math.max(0, total - recebido);
  const resumo: [string, string, boolean][] = [
    ['Total da fatura', moeda(total), true],
    ...(recebido ? ([['Já recebido', moeda(recebido), false], ['Em aberto', moeda(emAberto), true]] as [string, string, boolean][]) : []),
  ];
  const alturaResumo = resumo.length * 7 + 4;
  if (y + alturaResumo + 20 > A - 18) {
    doc.addPage();
    y = 24;
  }
  const xR = L - M - 80;
  doc.setFillColor(...AREIA);
  doc.rect(xR, y, 80, alturaResumo, 'F');
  doc.setFillColor(...BRONZE);
  doc.rect(xR, y, 1, alturaResumo, 'F');
  resumo.forEach(([r, v, destaque], i) => {
    const yy = y + 6.5 + i * 7;
    doc.setFont('helvetica', destaque ? 'bold' : 'normal');
    doc.setFontSize(destaque ? 10.5 : 9);
    doc.setTextColor(...(destaque ? TEXTO : CORPO));
    doc.text(r, xR + 4, yy);
    doc.text(v, L - M - 4, yy, { align: 'right' });
  });
  if (fatura.observacao?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRONZE);
    doc.text('OBSERVAÇÕES', M, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...CORPO);
    doc.text(doc.splitTextToSize(fatura.observacao, xR - M - 8) as string[], M, y + 9);
  }

  // ---- Rodapé em todas as páginas ----
  const totalPag = doc.getNumberOfPages();
  for (let p = 1; p <= totalPag; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXTO);
      doc.text(`Fatura Nº ${fatura.numeroFatura} — ${fatura.clienteNome}`, M, 13);
      doc.setFillColor(...BRONZE);
      doc.rect(M, 15.5, largura, 0.4, 'F');
    }
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(M, A - 13, L - M, A - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, M, A - 8.5);
    doc.text(`Página ${p} de ${totalPag}`, L - M, A - 8.5, { align: 'right' });
  }

  const nome = `Fatura_${fatura.numeroFatura}_${fatura.clienteNome}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 100) + '.pdf';
  return new File([doc.output('blob')], nome, { type: 'application/pdf' });
}
