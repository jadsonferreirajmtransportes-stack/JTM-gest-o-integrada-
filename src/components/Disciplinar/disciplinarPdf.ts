// ============================================================================
// Documento da medida disciplinar (jsPDF, mesmo visual dos documentos impressos
// do sistema — ver comprasPdf.ts): Registro de Advertência Verbal, Advertência
// Escrita, Suspensão Disciplinar (art. 474) ou Recomendação de Justa Causa (uso
// interno, sem ciência do colaborador).
//
// Devolve o PDF e a posição da linha "Assinatura do Empregado" — o documento é
// gerado aqui, então a posição é conhecida (não precisa procurar no texto).
// ============================================================================

import jsPDF from 'jspdf';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import type { MedidaDisciplinar, TestemunhaRecusa } from '../../utils/disciplinarApi';
import { ESCADA_DISCIPLINAR, descreverEnquadramento } from './disciplinarRegras';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [51, 51, 51];
const CINZA: [number, number, number] = [110, 110, 110];
const MARGEM = 18; // mm
const MM_PARA_PT = 72 / 25.4;

export interface DadosDocumentoDisciplinar {
  medida: MedidaDisciplinar;
  colaborador: { nomeCompleto: string; cpf?: string; codigoMatricula?: string; funcaoCargo?: string; setor?: string };
  empregador?: { razaoSocial?: string; cnpj?: string; cidadeUF?: string };
  /** Medidas anteriores que ainda contam (últimos 12 meses), pra citar o histórico. */
  historico: MedidaDisciplinar[];
}

export function tituloMedida(m: Pick<MedidaDisciplinar, 'tipo' | 'etapa' | 'diasSuspensao'>): string {
  if (m.tipo === 'Suspensão') return `Suspensão Disciplinar de ${m.diasSuspensao} dia${m.diasSuspensao === 1 ? '' : 's'}`;
  if (m.tipo === 'Advertência verbal') return 'Registro de Advertência Verbal';
  if (m.tipo === 'Recomendação de justa causa') return 'Recomendação de Justa Causa';
  return ESCADA_DISCIPLINAR.find((e) => e.etapa === m.etapa)?.rotulo === '2ª Advertência escrita'
    ? '2ª Advertência Escrita'
    : 'Advertência Escrita';
}

function dataBr(iso?: string): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const NUMEROS_POR_EXTENSO = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
  'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco', 'vinte e seis',
  'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta',
];

function dataPorExtenso(d: Date): string {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export function gerarPdfMedidaDisciplinar(dados: DadosDocumentoDisciplinar): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const { medida: m, colaborador: c, empregador: e } = dados;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const larguraTexto = largura - 2 * MARGEM;
  const interno = m.tipo === 'Recomendação de justa causa';
  const titulo = tituloMedida(m).toUpperCase();
  let y = MARGEM;

  const novaPaginaSePreciso = (espaco: number) => {
    if (y + espaco > altura - 22) {
      doc.addPage();
      y = MARGEM;
    }
  };
  const paragrafo = (texto: string, tamanho = 10, cor = CORPO, estilo: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(texto, larguraTexto) as string[];
    linhas.forEach((l) => {
      novaPaginaSePreciso(tamanho * 0.5);
      doc.text(l, MARGEM, y);
      y += tamanho * 0.45;
    });
    y += 2.5;
  };
  const rotulo = (texto: string) => {
    novaPaginaSePreciso(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...CINZA);
    doc.text(texto.toUpperCase(), MARGEM, y);
    y += 4.5;
  };

  // ---- Cabeçalho ----
  const logoLargura = 42;
  const logoAltura = (logoLargura * 339) / 900;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, y, logoLargura, logoAltura, 'jmt-logo', 'FAST');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...TEXTO);
  doc.text(titulo, largura - MARGEM, y + 6, { align: 'right' });
  doc.setFontSize(9.5);
  doc.setTextColor(...BRONZE);
  doc.text(interno ? 'Uso interno — análise jurídica' : 'Medida disciplinar — CLT', largura - MARGEM, y + 11.5, { align: 'right' });
  y += logoAltura + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text(
    [e?.razaoSocial || STRATEGIC_GUIDELINES.empresa, `Emitido em ${new Date().toLocaleDateString('pt-BR')}`].join(' | '),
    largura - MARGEM,
    y,
    { align: 'right' }
  );
  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, y + 2.5, larguraTexto, 0.7, 'F');
  y += 11;

  // ---- Partes ----
  paragrafo(`Empregador: ${e?.razaoSocial || STRATEGIC_GUIDELINES.empresa}${e?.cnpj ? ` — CNPJ ${e.cnpj}` : ''}`, 9.5);
  paragrafo(
    `Empregado(a): ${c.nomeCompleto}${c.cpf ? ` — CPF ${c.cpf}` : ''}${c.codigoMatricula ? ` — Matrícula ${c.codigoMatricula}` : ''}` +
      `${c.funcaoCargo ? ` — ${c.funcaoCargo}` : ''}${c.setor ? ` (${c.setor})` : ''}`,
    9.5
  );
  y += 2;

  // ---- Texto da medida ----
  const enquadramento = descreverEnquadramento(m.enquadramento, m.enquadramentoOutro);
  if (m.tipo === 'Advertência verbal') {
    paragrafo(
      `Registramos que, nesta data, o(a) empregado(a) acima foi ADVERTIDO(A) VERBALMENTE em razão do fato descrito abaixo, ocorrido em ${dataBr(m.dataFato)}, que caracteriza ${enquadramento}. ` +
        'Foi orientado(a) quanto à conduta esperada e alertado(a) de que a repetição poderá acarretar medidas disciplinares mais severas.'
    );
  } else if (m.tipo === 'Advertência escrita') {
    paragrafo(
      `Pela presente, fica V.Sa. ADVERTIDO(A) em razão do fato descrito abaixo, ocorrido em ${dataBr(m.dataFato)}, que caracteriza ${enquadramento}. ` +
        'Esclarecemos que a reincidência poderá acarretar a aplicação de penalidades mais severas previstas na legislação trabalhista, ' +
        'inclusive a rescisão do contrato de trabalho por justa causa, nos termos do art. 482 da CLT.'
    );
  } else if (m.tipo === 'Suspensão') {
    const inicio = m.suspensaoInicio || new Date().toISOString().slice(0, 10);
    const dias = m.diasSuspensao || 1;
    const fim = somarDias(inicio, dias - 1);
    const retorno = somarDias(inicio, dias);
    paragrafo(
      `Pela presente, fica V.Sa. SUSPENSO(A) de suas atividades por ${dias} (${NUMEROS_POR_EXTENSO[dias] || dias}) dia${dias === 1 ? '' : 's'}, ` +
        `de ${dataBr(inicio)} a ${dataBr(fim)}, devendo retornar ao trabalho em ${dataBr(retorno)}, nos termos do art. 474 da CLT, ` +
        `em razão do fato descrito abaixo, ocorrido em ${dataBr(m.dataFato)}, que caracteriza ${enquadramento}. ` +
        'Os dias de suspensão não serão remunerados. Esclarecemos que a reincidência poderá acarretar a rescisão do contrato de trabalho por justa causa (art. 482 da CLT).'
    );
  } else {
    paragrafo(
      `Com base no histórico disciplinar do(a) empregado(a) e no fato descrito abaixo, ocorrido em ${dataBr(m.dataFato)}, que caracteriza ${enquadramento}, ` +
        'o Departamento Pessoal RECOMENDA a análise jurídica para eventual rescisão do contrato de trabalho por justa causa (art. 482 da CLT). ' +
        'Este documento é de uso interno e NÃO deve ser entregue ao empregado; a decisão final e o desligamento dependem da análise jurídica.'
    );
  }

  rotulo('Descrição do fato');
  paragrafo(m.descricaoFato, 10, TEXTO);
  if (m.testemunhasFato?.trim()) {
    rotulo('Testemunhas do fato');
    paragrafo(m.testemunhasFato, 9.5);
  }
  if (interno && m.justificativaEtapa?.trim()) {
    rotulo('Justificativa da medida');
    paragrafo(m.justificativaEtapa, 9.5);
  }

  const anteriores = dados.historico.filter((h) => h.id !== m.id);
  if (anteriores.length > 0) {
    rotulo('Histórico disciplinar (últimos 12 meses)');
    anteriores
      .sort((a, b) => a.dataFato.localeCompare(b.dataFato))
      .forEach((h) => paragrafo(`• ${dataBr(h.dataFato)} — ${tituloMedida(h)}`, 9.5));
  }

  // ---- Local, data e assinaturas ----
  novaPaginaSePreciso(62);
  y += 4;
  const cidade = e?.cidadeUF ? `${e.cidadeUF.split('/')[0].trim()}, ` : '';
  paragrafo(`${cidade}${dataPorExtenso(new Date())}.`, 10, TEXTO);
  y += 14;

  const larguraLinha = (larguraTexto - 12) / 2;
  const xEsq = MARGEM;
  const xDir = MARGEM + larguraLinha + 12;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.3);
  doc.line(xEsq, y, xEsq + larguraLinha, y);
  doc.line(xDir, y, xDir + larguraLinha, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CORPO);
  doc.text(interno ? 'Responsável — Departamento Pessoal' : 'Empregador', xEsq + larguraLinha / 2, y + 4.5, { align: 'center' });
  if (m.aprovadoPor) doc.text(m.aprovadoPor, xEsq + larguraLinha / 2, y + 8.5, { align: 'center' });
  doc.text(interno ? 'Análise jurídica' : 'Assinatura do Empregado (ciente)', xDir + larguraLinha / 2, y + 4.5, { align: 'center' });

  const camposAssinatura: CampoAssinaturaPdf[] = [];
  if (!interno) {
    const alturaPaginaPt = altura * MM_PARA_PT;
    camposAssinatura.push({
      pagina: doc.getNumberOfPages() - 1,
      x: xDir * MM_PARA_PT,
      y: alturaPaginaPt - y * MM_PARA_PT + 1,
      largura: larguraLinha * MM_PARA_PT,
      altura: 34,
    });
    y += 13;
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA);
    const nota = doc.splitTextToSize(
      'A assinatura do empregado indica apenas o recebimento e a ciência desta comunicação, e não a concordância com o seu conteúdo. ' +
        'Em caso de recusa em assinar, a ciência é atestada por duas testemunhas.',
      larguraTexto
    ) as string[];
    doc.text(nota, MARGEM, y);
    y += nota.length * 3.5 + 12;

    // Testemunhas (usadas só se o empregado se recusar a assinar).
    doc.setDrawColor(150, 150, 150);
    doc.line(xEsq, y, xEsq + larguraLinha, y);
    doc.line(xDir, y, xDir + larguraLinha, y);
    doc.setFontSize(8);
    doc.setTextColor(...CORPO);
    doc.text('Testemunha 1 — nome e CPF', xEsq + larguraLinha / 2, y + 4.5, { align: 'center' });
    doc.text('Testemunha 2 — nome e CPF', xDir + larguraLinha / 2, y + 4.5, { align: 'center' });
  }

  // ---- Rodapé ----
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(MARGEM, altura - 12, largura - MARGEM, altura - 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BRONZE);
    doc.text(STRATEGIC_GUIDELINES.assinatura, largura / 2, altura - 7.5, { align: 'center' });
  }

  const nomeArquivo = `${tituloMedida(m).replace(/\s+/g, '_')}_${c.nomeCompleto.replace(/\s+/g, '_')}_${m.dataFato}.pdf`;
  const blob = doc.output('blob');
  return { arquivo: new File([blob], nomeArquivo, { type: 'application/pdf' }), camposAssinatura };
}

/** PDF da medida + "Termo de recusa de assinatura" com as 2 testemunhas (nome, CPF e assinatura
 *  desenhada de cada uma) — pra quando o empregado toma ciência mas se recusa a assinar. */
export async function gerarPdfComRecusa(
  bytesOriginais: ArrayBuffer,
  m: MedidaDisciplinar,
  testemunhas: TestemunhaRecusa[]
): Promise<File> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.load(bytesOriginais);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pagina = pdf.addPage([595.28, 841.89]);
  const { width: largura, height: altura } = pagina.getSize();
  const margem = 50;
  let y = altura - margem - 10;

  const titulo = 'TERMO DE RECUSA DE ASSINATURA';
  pagina.drawText(titulo, { x: (largura - negrito.widthOfTextAtSize(titulo, 14)) / 2, y, size: 14, font: negrito });
  y -= 36;

  const quando = m.recusaRegistradaEm ? new Date(m.recusaRegistradaEm) : new Date();
  const texto =
    `Em ${quando.toLocaleDateString('pt-BR')}, às ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}, ` +
    `na presença das testemunhas abaixo identificadas, o(a) empregado(a) ${m.colaboradorNome} tomou conhecimento do documento ` +
    `"${tituloMedida(m)}" (fato de ${dataBr(m.dataFato)}), cujo conteúdo lhe foi apresentado, e recusou-se a assiná-lo. ` +
    'As testemunhas abaixo atestam que o empregado teve ciência da medida.';
  const palavras = texto.split(' ');
  let linha = '';
  const escreverLinha = (l: string) => {
    pagina.drawText(l, { x: margem, y, size: 11, font: fonte, color: rgb(0.15, 0.15, 0.15) });
    y -= 16;
  };
  palavras.forEach((p) => {
    const tentativa = linha ? `${linha} ${p}` : p;
    if (fonte.widthOfTextAtSize(tentativa, 11) > largura - 2 * margem) {
      escreverLinha(linha);
      linha = p;
    } else linha = tentativa;
  });
  if (linha) escreverLinha(linha);
  y -= 40;

  const larguraBloco = (largura - 2 * margem - 30) / 2;
  for (let i = 0; i < 2; i++) {
    const t = testemunhas[i];
    const x = margem + i * (larguraBloco + 30);
    if (t?.assinatura) {
      const img = await pdf.embedPng(t.assinatura);
      const escala = Math.min(larguraBloco / img.width, 50 / img.height);
      pagina.drawImage(img, {
        x: x + (larguraBloco - img.width * escala) / 2,
        y: y + 2,
        width: img.width * escala,
        height: img.height * escala,
      });
    }
    pagina.drawLine({ start: { x, y }, end: { x: x + larguraBloco, y }, thickness: 0.6, color: rgb(0.3, 0.3, 0.3) });
    const nome = `Testemunha ${i + 1}: ${t?.nome || ''}`;
    pagina.drawText(nome, { x, y: y - 14, size: 9, font: negrito });
    if (t?.cpf) pagina.drawText(`CPF: ${t.cpf}`, { x, y: y - 27, size: 9, font: fonte });
  }

  const bytes = await pdf.save();
  return new File([bytes], `${tituloMedida(m).replace(/\s+/g, '_')}_${m.colaboradorNome.replace(/\s+/g, '_')}_RECUSA.pdf`, {
    type: 'application/pdf',
  });
}
