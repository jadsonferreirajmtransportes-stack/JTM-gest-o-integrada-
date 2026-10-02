// ============================================================================
// PDF do comunicado em papel timbrado JMT (jsPDF): "Comunicado nº 001/2026",
// título, data, texto e assinatura do setor. Mesmo visual dos demais documentos
// gerados pelo sistema (ver regulamentoPdf.ts).
// ============================================================================

import jsPDF from 'jspdf';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { textoParaImagem } from './comunicadoImagem';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [51, 51, 51];
const CINZA: [number, number, number] = [120, 120, 120];
const MARGEM = 22;

export interface DadosPdfComunicado {
  numero: string;
  titulo: string;
  categoria: string;
  corpo: string;
  assinatura: string;
  data: Date;
  /** Para quem (ex.: "Colaboradores", "Clientes"). */
  publico: string;
}

export function gerarPdfComunicado(c: DadosPdfComunicado): File {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const larguraTexto = largura - 2 * MARGEM;
  let y = 0;

  const cabecalho = () => {
    const logoLargura = 40;
    const logoAltura = (logoLargura * 339) / 900;
    doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 14, logoLargura, logoAltura, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...TEXTO);
    doc.text(`COMUNICADO Nº ${c.numero}`, largura - MARGEM, 19, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRONZE);
    doc.text(`${c.categoria} · ${c.publico}`, largura - MARGEM, 24, { align: 'right' });
    y = 14 + logoAltura + 4;
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, y, larguraTexto, 0.6, 'F');
    y += 12;
  };
  const rodape = () => {
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setDrawColor(221, 221, 221);
      doc.setLineWidth(0.2);
      doc.line(MARGEM, altura - 17, largura - MARGEM, altura - 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...CINZA);
      doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, largura / 2, altura - 12.5, { align: 'center' });
      doc.text(`${EMPRESA_REGULAMENTO.endereco} — CEP ${EMPRESA_REGULAMENTO.cep} — ${EMPRESA_REGULAMENTO.cidadeUF}`, largura / 2, altura - 9, { align: 'center' });
      if (total > 1) doc.text(`Página ${p} de ${total}`, largura - MARGEM, altura - 5.5, { align: 'right' });
    }
  };

  cabecalho();
  const dataExtenso = c.data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CORPO);
  doc.text(`${EMPRESA_REGULAMENTO.cidadeUF.split('/')[0]}, ${dataExtenso}.`, largura - MARGEM, y, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...TEXTO);
  const titulo = doc.splitTextToSize(c.titulo.toUpperCase(), larguraTexto) as string[];
  doc.text(titulo, MARGEM, y);
  y += titulo.length * 7 + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...CORPO);
  // O PDF é o mesmo para todos — a saudação com {nome} vira uma saudação geral.
  doc.text(c.publico === 'Clientes' ? 'Prezados clientes e parceiros,' : 'Prezados colaboradores,', MARGEM, y);
  y += 9;
  const texto = textoParaImagem(c.corpo).replace(/\*([^*\n]+)\*/g, '$1'); // tira o negrito do WhatsApp
  for (const paragrafo of texto.split(/\n/)) {
    if (!paragrafo.trim()) {
      y += 3;
      continue;
    }
    const linhas = doc.splitTextToSize(paragrafo, larguraTexto) as string[];
    for (const l of linhas) {
      if (y > altura - 45) {
        doc.addPage();
        cabecalho();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...CORPO);
      }
      doc.text(l, MARGEM, y, { align: 'left' });
      y += 5.6;
    }
    y += 2;
  }

  if (y > altura - 60) {
    doc.addPage();
    cabecalho();
  }
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CORPO);
  doc.text('Atenciosamente,', MARGEM, y);
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXTO);
  doc.text(c.assinatura, MARGEM, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CINZA);
  doc.text(EMPRESA_REGULAMENTO.razaoSocial, MARGEM, y);

  rodape();
  const nome = `Comunicado_${c.numero.replace('/', '-')}_${c.titulo}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 100);
  return new File([doc.output('blob')], `${nome}.pdf`, { type: 'application/pdf' });
}
