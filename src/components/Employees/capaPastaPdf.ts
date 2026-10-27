// ============================================================================
// Capa da pasta física do colaborador (A4) + etiqueta de lombada para recortar.
// A capa fica à vista no arquivo do DP, então leva só identificação funcional
// (nome, matrícula, cargo, setor, empresa, admissão) — sem CPF, RG, endereço ou
// salário (LGPD: minimização).
// ============================================================================

import jsPDF from 'jspdf';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import type { Colaborador, Empregador, Supervisor } from '../../types';

const BRONZE: [number, number, number] = [196, 130, 41];
const BRONZE_ESCURO: [number, number, number] = [146, 97, 31];
const TEXTO: [number, number, number] = [22, 19, 15];
const CINZA: [number, number, number] = [110, 110, 110];
const AREIA: [number, number, number] = [248, 240, 228];

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

export function gerarCapaPastaPdf(c: Colaborador, empregador?: Empregador, supervisor?: Supervisor): File {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const L = doc.internal.pageSize.getWidth();
  const A = doc.internal.pageSize.getHeight();
  const M = 20;

  // Faixa dourada à esquerda e fundo areia no topo
  doc.setFillColor(...AREIA);
  doc.rect(0, 0, L, 92, 'F');
  doc.setFillColor(...BRONZE);
  doc.rect(0, 0, 6, A, 'F');

  const logoL = 58;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', M + 4, 18, logoL, (logoL * 339) / 900, 'jmt-logo', 'FAST');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRONZE_ESCURO);
  doc.text('DEPARTAMENTO PESSOAL', L - M, 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text('Pasta funcional do colaborador', L - M, 29, { align: 'right' });

  // Nome em destaque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRONZE_ESCURO);
  doc.text('COLABORADOR', M + 4, 58);
  doc.setFontSize(26);
  doc.setTextColor(...TEXTO);
  const nome = doc.splitTextToSize(c.nomeCompleto.toUpperCase(), L - 2 * M - 4) as string[];
  doc.text(nome.slice(0, 2), M + 4, 69);

  // Matrícula em caixa grande (fácil de achar no arquivo)
  let y = 106;
  doc.setDrawColor(...BRONZE);
  doc.setLineWidth(0.8);
  doc.roundedRect(M + 4, y, 70, 30, 3, 3, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRONZE_ESCURO);
  doc.text('MATRÍCULA', M + 10, y + 9);
  doc.setFontSize(24);
  doc.setTextColor(...TEXTO);
  doc.text(c.codigoMatricula || '—', M + 10, y + 22);

  doc.setFontSize(8.5);
  doc.setTextColor(...BRONZE_ESCURO);
  doc.text('SITUAÇÃO', M + 86, y + 9);
  doc.setFontSize(16);
  doc.setTextColor(...(c.status === 'Inativo' ? ([190, 30, 45] as [number, number, number]) : TEXTO));
  doc.text((c.status || 'Ativo').toUpperCase(), M + 86, y + 21);
  if (c.status === 'Inativo' && c.dataDemissao) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...CINZA);
    doc.text(`Desligado em ${dataBr(c.dataDemissao)}`, M + 86, y + 27);
  }

  // Dados funcionais
  y += 42;
  const linhas: [string, string][] = [
    ['Cargo / função', c.funcaoCargo || '—'],
    ['Setor', c.setor || '—'],
    ['Empresa', empregador ? empregador.nomeFantasia || empregador.razaoSocial : '—'],
    ['Data de admissão', dataBr(c.dataAdmissao)],
    ['Supervisor', supervisor?.nome || '—'],
  ];
  linhas.forEach(([rotulo, valor]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRONZE_ESCURO);
    doc.text(rotulo.toUpperCase(), M + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(...TEXTO);
    doc.text((doc.splitTextToSize(valor, L - 2 * M - 4) as string[])[0], M + 4, y + 7);
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.2);
    doc.line(M + 4, y + 11, L - M, y + 11);
    y += 16;
  });

  // Etiqueta de lombada (recortar)
  const yLomb = A - 44;
  doc.setLineDashPattern([2, 2], 0);
  doc.setDrawColor(...CINZA);
  doc.setLineWidth(0.3);
  doc.line(M, yLomb - 6, L - M, yLomb - 6);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...CINZA);
  doc.text('Etiqueta para a lombada — recorte na linha pontilhada', M, yLomb - 8);
  doc.setFillColor(...AREIA);
  doc.rect(M, yLomb, L - 2 * M, 16, 'F');
  doc.setFillColor(...BRONZE);
  doc.rect(M, yLomb, 4, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...TEXTO);
  doc.text(c.codigoMatricula || '—', M + 9, yLomb + 10.5);
  doc.setFontSize(12);
  const nomeLomb = doc.splitTextToSize(c.nomeCompleto.toUpperCase(), L - 2 * M - 60) as string[];
  doc.text(nomeLomb[0], M + 42, yLomb + 10.5);

  // Rodapé
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...CINZA);
  doc.text('Documento de uso interno do Departamento Pessoal — guardar em local de acesso restrito.', L / 2, A - 10, { align: 'center' });

  const nomeArquivo = `Capa_pasta_${c.codigoMatricula || ''}_${c.nomeCompleto}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 110) + '.pdf';
  return new File([doc.output('blob')], nomeArquivo, { type: 'application/pdf' });
}
