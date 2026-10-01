// ============================================================================
// Certificado de conclusão de treinamento (jsPDF, A4 paisagem). Gerado no
// navegador tanto pelo DP quanto pelo próprio colaborador no portal — os dados
// vêm da atribuição concluída (nota, data, validade).
// ============================================================================

import jsPDF from 'jspdf';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [60, 60, 60];
const CINZA: [number, number, number] = [120, 120, 120];

export interface DadosCertificado {
  colaboradorNome: string;
  colaboradorCpf?: string;
  treinamentoTitulo: string;
  cargaHorariaMin: number;
  nota?: number | null;
  concluidoEm: string;
  validoAte?: string | null;
  /** Código da atribuição — identifica o registro no sistema. */
  codigo: string;
  /** Assinatura desenhada pelo colaborador ao concluir (data URL PNG), quando disponível. */
  assinaturaImagem?: string;
}

function dataBr(iso?: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function formatarCargaHoraria(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

/** CPF parcialmente oculto no certificado (LGPD): ***.456.789-** */
function cpfMascarado(cpf?: string): string | undefined {
  const d = (cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return undefined;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function gerarCertificadoPdf(c: DadosCertificado): File {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();

  // Moldura
  doc.setDrawColor(...BRONZE);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, largura - 20, altura - 20);
  doc.setLineWidth(0.3);
  doc.rect(13, 13, largura - 26, altura - 26);

  const logoLargura = 52;
  const logoAltura = (logoLargura * 339) / 900;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', (largura - logoLargura) / 2, 22, logoLargura, logoAltura, 'jmt-logo', 'FAST');

  let y = 22 + logoAltura + 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...TEXTO);
  doc.text('CERTIFICADO', largura / 2, y, { align: 'center' });
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...BRONZE);
  doc.text('de conclusão de treinamento', largura / 2, y, { align: 'center' });

  y += 15;
  doc.setFontSize(12);
  doc.setTextColor(...CORPO);
  doc.text('Certificamos que', largura / 2, y, { align: 'center' });
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...TEXTO);
  doc.text(c.colaboradorNome.toUpperCase(), largura / 2, y, { align: 'center' });
  const cpf = cpfMascarado(c.colaboradorCpf);
  if (cpf) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...CINZA);
    doc.text(`CPF ${cpf}`, largura / 2, y, { align: 'center' });
  }

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...CORPO);
  const partes = [
    `concluiu o treinamento "${c.treinamentoTitulo}", com carga horária de ${formatarCargaHoraria(c.cargaHorariaMin)}`,
    c.nota !== undefined && c.nota !== null ? `, obtendo nota ${c.nota}` : '',
    `, em ${dataBr(c.concluidoEm)}.`,
  ].join('');
  const linhas = doc.splitTextToSize(partes, largura - 80) as string[];
  doc.text(linhas, largura / 2, y, { align: 'center' });
  y += linhas.length * 6;
  if (c.validoAte) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...BRONZE);
    doc.text(`Válido até ${dataBr(c.validoAte)}`, largura / 2, y, { align: 'center' });
  }

  // Assinaturas
  const yLinha = altura - 42;
  const larguraLinha = 80;
  const xEsq = largura / 2 - larguraLinha - 15;
  const xDir = largura / 2 + 15;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(xEsq, yLinha, xEsq + larguraLinha, yLinha);
  doc.line(xDir, yLinha, xDir + larguraLinha, yLinha);
  if (c.assinaturaImagem) {
    try {
      doc.addImage(c.assinaturaImagem, 'PNG', xDir + 10, yLinha - 20, larguraLinha - 20, 19);
    } catch {
      /* imagem inválida — fica só a linha */
    }
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CORPO);
  doc.text(EMPRESA_REGULAMENTO.razaoSocial, xEsq + larguraLinha / 2, yLinha + 5, { align: 'center' });
  doc.text('Departamento Pessoal', xEsq + larguraLinha / 2, yLinha + 9, { align: 'center' });
  doc.text(c.colaboradorNome, xDir + larguraLinha / 2, yLinha + 5, { align: 'center' });
  doc.text(c.assinaturaImagem ? 'Assinatura eletrônica no portal' : 'Concluído no Portal de Educação', xDir + larguraLinha / 2, yLinha + 9, {
    align: 'center',
  });

  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA);
  doc.text(
    `${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} — ${EMPRESA_REGULAMENTO.cidadeUF}   |   Código do registro: ${c.codigo}`,
    largura / 2,
    altura - 17,
    { align: 'center' }
  );

  const nome = `Certificado_${c.treinamentoTitulo}_${c.colaboradorNome}`.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 120);
  return new File([doc.output('blob')], `${nome}.pdf`, { type: 'application/pdf' });
}
