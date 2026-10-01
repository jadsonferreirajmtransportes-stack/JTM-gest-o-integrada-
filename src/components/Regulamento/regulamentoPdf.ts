// ============================================================================
// PDF do Regulamento Interno (jsPDF, mesmo visual dos documentos do sistema —
// ver disciplinarPdf.ts). Uma cópia por colaborador, com nome/CPF no termo de
// ciência e a posição da linha de assinatura conhecida (o documento é gerado
// aqui), pra assinatura desenhada no link cair no lugar certo.
// Sem colaborador = modelo em branco (pré-visualização / impressão).
// ============================================================================

import jsPDF from 'jspdf';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import {
  EMPRESA_REGULAMENTO,
  ROTULO_VERSAO_REGULAMENTO,
  SECOES_REGULAMENTO,
  VERSAO_REGULAMENTO,
} from '../../data/regulamentoInterno';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [51, 51, 51];
const CINZA: [number, number, number] = [110, 110, 110];
const MARGEM = 20; // mm
const MM_PARA_PT = 72 / 25.4;

export interface ColaboradorRegulamento {
  nomeCompleto: string;
  cpf?: string;
  funcaoCargo?: string;
}

export function gerarPdfRegulamento(colaborador?: ColaboradorRegulamento): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const larguraTexto = largura - 2 * MARGEM;
  const LIMITE_INFERIOR = altura - 24;
  let y = 0;

  const cabecalhoPagina = () => {
    y = 14;
    const logoLargura = 36;
    const logoAltura = (logoLargura * 339) / 900;
    doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, y, logoLargura, logoAltura, 'jmt-logo', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXTO);
    doc.text('REGULAMENTO INTERNO', largura - MARGEM, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRONZE);
    doc.text(ROTULO_VERSAO_REGULAMENTO, largura - MARGEM, y + 9.5, { align: 'right' });
    y += logoAltura + 3;
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, y, larguraTexto, 0.6, 'F');
    y += 8;
  };
  const novaPaginaSePreciso = (espaco: number) => {
    if (y + espaco > LIMITE_INFERIOR) {
      doc.addPage();
      cabecalhoPagina();
    }
  };
  const escrever = (texto: string, opcoes: { tamanho?: number; cor?: [number, number, number]; estilo?: 'normal' | 'bold' | 'italic'; recuo?: number; prefixo?: string; espacoDepois?: number } = {}) => {
    const { tamanho = 10, cor = CORPO, estilo = 'normal', recuo = 0, prefixo, espacoDepois = 2.5 } = opcoes;
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    const larguraPrefixo = prefixo ? 6 : 0;
    const linhas = doc.splitTextToSize(texto, larguraTexto - recuo - larguraPrefixo) as string[];
    const alturaLinha = tamanho * 0.47;
    linhas.forEach((l, i) => {
      novaPaginaSePreciso(alturaLinha + 1);
      if (i === 0 && prefixo) doc.text(prefixo, MARGEM + recuo, y);
      doc.text(l, MARGEM + recuo + larguraPrefixo, y, { maxWidth: larguraTexto - recuo - larguraPrefixo, align: 'left' });
      y += alturaLinha;
    });
    y += espacoDepois;
  };

  // ---- Capa / identificação ----
  cabecalhoPagina();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...TEXTO);
  doc.text('REGULAMENTO INTERNO', largura / 2, y + 4, { align: 'center' });
  y += 13;
  escrever(`Empresa: ${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, { tamanho: 9.5, espacoDepois: 1 });
  escrever(`Segmento: ${EMPRESA_REGULAMENTO.segmento}`, { tamanho: 9.5, espacoDepois: 6 });

  // ---- Seções ----
  SECOES_REGULAMENTO.forEach((secao, i) => {
    novaPaginaSePreciso(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...TEXTO);
    doc.text(`${i + 1}. ${secao.titulo.toUpperCase()}`, MARGEM, y);
    y += 6.5;

    secao.blocos.forEach((bloco) => {
      if (bloco.tipo === 'p') escrever(bloco.texto);
      else if (bloco.tipo === 'sub') escrever(bloco.texto, { estilo: 'bold', tamanho: 9.5, espacoDepois: 1.5 });
      else if (bloco.tipo === 'nota') {
        // Faixa lateral bronze, como um "Atenção:" do documento original.
        const inicio = y - 3.5;
        const paginaInicio = doc.getNumberOfPages();
        escrever(bloco.texto, { recuo: 4, tamanho: 9.5, cor: CORPO, estilo: 'italic', espacoDepois: 0 });
        if (doc.getNumberOfPages() === paginaInicio) {
          doc.setFillColor(...BRONZE);
          doc.rect(MARGEM, inicio, 0.9, y - inicio - 1.5, 'F');
        }
        y += 3;
      } else if (bloco.tipo === 'lista') {
        bloco.itens.forEach((item, k) => escrever(item, { recuo: 4, prefixo: `${k + 1}.`, espacoDepois: 1.2 }));
        y += 1.5;
      } else if (bloco.tipo === 'tabela') {
        const colunas = [larguraTexto * 0.42, larguraTexto * 0.36, larguraTexto * 0.22];
        const linhaTabela = (celulas: string[], cabecalho: boolean) => {
          doc.setFont('helvetica', cabecalho ? 'bold' : 'normal');
          doc.setFontSize(8.5);
          const quebradas = celulas.map((c, j) => doc.splitTextToSize(c, colunas[j] - 3) as string[]);
          const alturaLinha = Math.max(...quebradas.map((q) => q.length)) * 3.8 + 2.6;
          novaPaginaSePreciso(alturaLinha);
          if (cabecalho) {
            doc.setFillColor(248, 240, 228);
            doc.rect(MARGEM, y - 3.6, larguraTexto, alturaLinha, 'F');
          }
          doc.setTextColor(...(cabecalho ? TEXTO : CORPO));
          let x = MARGEM;
          quebradas.forEach((q, j) => {
            doc.text(q, x + 1.5, y);
            x += colunas[j];
          });
          y += alturaLinha;
          doc.setDrawColor(225, 225, 225);
          doc.setLineWidth(0.2);
          doc.line(MARGEM, y - 3.6, MARGEM + larguraTexto, y - 3.6);
        };
        linhaTabela(bloco.cabecalho, true);
        bloco.linhas.forEach((l) => linhaTabela(l, false));
        y += 3;
      }
    });
    y += 2;
  });

  // ---- Termo de ciência ----
  novaPaginaSePreciso(70);
  y += 4;
  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, y - 4, larguraTexto, 0.6, 'F');
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXTO);
  doc.text('TERMO DE CIÊNCIA E COMPROMISSO', MARGEM, y);
  y += 7;
  const nome = colaborador?.nomeCompleto || '______________________________________________';
  const cpf = colaborador?.cpf || '____________________';
  escrever(
    `Eu, ${nome}, CPF ${cpf}${colaborador?.funcaoCargo ? `, ${colaborador.funcaoCargo}` : ''}, declaro que recebi, li e tomei conhecimento do Regulamento Interno da ${EMPRESA_REGULAMENTO.razaoSocial} (${ROTULO_VERSAO_REGULAMENTO}), e que me comprometo a cumpri-lo.`
  );
  y += 24;

  // Mesma linha: "Parnamirim, ________" (data) à esquerda e a assinatura à direita — o carimbo
  // do link escreve a data e desenha a assinatura na mesma altura (ver pdfAssinadoUtils.ts).
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CORPO);
  const local = `${EMPRESA_REGULAMENTO.cidadeUF.split('/')[0]},`;
  doc.text(local, MARGEM, y);
  const xData = MARGEM + doc.getTextWidth(local) + 2;
  const larguraData = 34;
  const larguraLinha = 85;
  const xLinha = largura - MARGEM - larguraLinha;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(xData, y + 0.8, xData + larguraData, y + 0.8);
  doc.line(xLinha, y + 0.8, xLinha + larguraLinha, y + 0.8);
  doc.setFontSize(8.5);
  doc.text('Data', xData + larguraData / 2, y + 5.3, { align: 'center' });
  doc.text('Assinatura do colaborador', xLinha + larguraLinha / 2, y + 5.3, { align: 'center' });

  const alturaPaginaPt = altura * MM_PARA_PT;
  const camposAssinatura: CampoAssinaturaPdf[] = [
    {
      pagina: doc.getNumberOfPages() - 1,
      x: xLinha * MM_PARA_PT,
      y: alturaPaginaPt - (y + 0.8) * MM_PARA_PT + 1,
      largura: larguraLinha * MM_PARA_PT,
      altura: 34,
      comData: true,
      dataX: xData * MM_PARA_PT,
      dataLargura: larguraData * MM_PARA_PT,
    },
  ];

  // ---- Rodapé ----
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
    doc.text(
      `${EMPRESA_REGULAMENTO.endereco} — CEP ${EMPRESA_REGULAMENTO.cep} — ${EMPRESA_REGULAMENTO.cidadeUF}`,
      largura / 2,
      altura - 9,
      { align: 'center' }
    );
    doc.text(`Página ${p} de ${total}`, largura - MARGEM, altura - 5.5, { align: 'right' });
  }

  const sufixo = colaborador ? `_${colaborador.nomeCompleto.trim().replace(/\s+/g, '_')}` : '';
  const nomeArquivo = `Regulamento_Interno_${VERSAO_REGULAMENTO}${sufixo}.pdf`;
  const blob = doc.output('blob');
  return { arquivo: new File([blob], nomeArquivo, { type: 'application/pdf' }), camposAssinatura };
}
