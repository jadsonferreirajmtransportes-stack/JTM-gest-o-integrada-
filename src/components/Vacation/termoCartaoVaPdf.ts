// ============================================================================
// Termo de entrega do cartão de vale-alimentação — um PDF por colaborador, com a
// linha de assinatura (assinada no portal/link, documentos_assinatura categoria
// 'termo_cartao_va'). Sem número do cartão: o termo não precisa dele (LGPD —
// minimização), basta a operadora e a data da entrega.
// ============================================================================

import jsPDF from 'jspdf';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [45, 45, 45];
const CINZA: [number, number, number] = [110, 110, 110];
const MM_PARA_PT = 72 / 25.4;
const MARGEM = 22;

export interface DadosTermoCartaoVa {
  operadora: string;
  dataEntrega: string; // YYYY-MM-DD
  /** 'entrega' = 1º cartão; 'segunda_via' = reposição. */
  motivo: 'entrega' | 'segunda_via';
}

const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export const tituloTermoCartaoVa = (d: DadosTermoCartaoVa) =>
  `Termo de ${d.motivo === 'segunda_via' ? 'entrega de 2ª via' : 'entrega'} do cartão de vale-alimentação${d.operadora ? ` (${d.operadora})` : ''} — ${dataBr(d.dataEntrega)}`;

export function gerarTermoCartaoVaPdf(
  dados: DadosTermoCartaoVa,
  colaborador: { nomeCompleto: string; cpf?: string; funcaoCargo?: string; codigoMatricula?: string }
): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const larguraTexto = largura - 2 * MARGEM;
  let y = 42;

  const fonte = (estilo: 'normal' | 'bold' | 'italic', tamanho: number, cor: [number, number, number] = CORPO) => {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
  };
  const paragrafo = (t: string, recuo = 0) => {
    fonte('normal', 10.5);
    const linhas = doc.splitTextToSize(t, larguraTexto - recuo) as string[];
    linhas.forEach((l, i) => {
      if (i < linhas.length - 1) doc.text(l, MARGEM + recuo, y, { align: 'justify', maxWidth: larguraTexto - recuo });
      else doc.text(l, MARGEM + recuo, y);
      y += 5.6;
    });
    y += 2;
  };

  // Cabeçalho
  const logoL = 34;
  const logoA = (logoL * 339) / 900;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 12, logoL, logoA, 'jmt-logo', 'FAST');
  fonte('bold', 8, BRONZE);
  doc.text('DEPARTAMENTO PESSOAL', largura - MARGEM, 17, { align: 'right' });
  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, 12 + logoA + 3, larguraTexto, 0.5, 'F');

  fonte('bold', 13, TEXTO);
  const titulo = dados.motivo === 'segunda_via' ? 'TERMO DE ENTREGA DE 2ª VIA DO CARTÃO DE VALE-ALIMENTAÇÃO' : 'TERMO DE ENTREGA DO CARTÃO DE VALE-ALIMENTAÇÃO';
  (doc.splitTextToSize(titulo, larguraTexto) as string[]).forEach((l) => {
    doc.text(l, largura / 2, y, { align: 'center' });
    y += 6.5;
  });
  y += 4;

  const identificacao = [
    colaborador.nomeCompleto,
    colaborador.cpf ? `CPF ${colaborador.cpf}` : '',
    colaborador.funcaoCargo || '',
    colaborador.codigoMatricula ? `matrícula ${colaborador.codigoMatricula}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  paragrafo(
    `Eu, ${identificacao}, declaro que recebi da ${EMPRESA_REGULAMENTO.razaoSocial}, CNPJ ${EMPRESA_REGULAMENTO.cnpj}, em ${dataBr(dados.dataEntrega)}, ` +
      `${dados.motivo === 'segunda_via' ? 'a 2ª via do ' : 'o '}cartão de vale-alimentação${dados.operadora ? ` da operadora ${dados.operadora}` : ''}, ` +
      `de uso pessoal e intransferível, destinado exclusivamente à compra de gêneros alimentícios.`
  );
  paragrafo('Declaro também estar ciente de que:');
  [
    'o cartão e a senha são de minha inteira responsabilidade e não podem ser emprestados, cedidos, vendidos ou trocados por dinheiro;',
    'os créditos são feitos conforme as regras do benefício na empresa, considerando os dias trabalhados no período;',
    'em caso de perda, roubo, furto ou dano, devo avisar imediatamente o Departamento Pessoal e a operadora para o bloqueio do cartão;',
    'ao deixar a empresa, os créditos deixam de ser feitos;',
    'o uso do cartão em desacordo com estas regras pode resultar nas medidas previstas no regulamento interno.',
  ].forEach((item, i) => paragrafo(`${'abcde'[i]}) ${item}`, 6));

  y += 6;
  fonte('normal', 10.5);
  doc.text(`${EMPRESA_REGULAMENTO.cidadeUF}, ${dataBr(dados.dataEntrega)}.`, MARGEM, y);
  y += 30;

  const larguraLinha = 95;
  const xLinha = MARGEM + (larguraTexto - larguraLinha) / 2;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(xLinha, y, xLinha + larguraLinha, y);
  fonte('normal', 10, TEXTO);
  doc.text(colaborador.nomeCompleto, largura / 2, y + 5, { align: 'center' });
  fonte('normal', 9, CINZA);
  doc.text('Assinatura do colaborador', largura / 2, y + 9.5, { align: 'center' });
  const camposAssinatura: CampoAssinaturaPdf[] = [
    { pagina: 0, x: xLinha * MM_PARA_PT, y: altura * MM_PARA_PT - y * MM_PARA_PT + 1, largura: larguraLinha * MM_PARA_PT, altura: 34 },
  ];

  // Rodapé
  doc.setDrawColor(221, 221, 221);
  doc.setLineWidth(0.2);
  doc.line(MARGEM, altura - 16, largura - MARGEM, altura - 16);
  fonte('normal', 6.8, CINZA);
  doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} — ${EMPRESA_REGULAMENTO.cidadeUF}`, MARGEM, altura - 11.5);

  const nome = `Termo_cartao_VA_${colaborador.nomeCompleto}_${dados.dataEntrega}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 110) + '.pdf';
  return { arquivo: new File([doc.output('blob')], nome, { type: 'application/pdf' }), camposAssinatura };
}
