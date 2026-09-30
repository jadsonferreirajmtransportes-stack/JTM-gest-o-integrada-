// ============================================================================
// "Baixar assinado": gera um PDF único com o documento original (contracheque,
// aviso/recibo de férias) + uma página final de COMPROVANTE DE ASSINATURA
// ELETRÔNICA — quem assinou, CPF (mascarado), quando visualizou/assinou, a
// declaração aceita, a imagem da assinatura, o dispositivo e o código de
// verificação (SHA-256) do PDF original, que amarra a assinatura àquele arquivo.
// Gerado no navegador (pdf-lib), sob demanda.
// ============================================================================

import { DocumentoAssinatura } from '../../utils/documentosAssinaturaApi';
import { obterUrlArquivo } from '../../utils/arquivosStorage';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';

// As fontes padrão do PDF (Helvetica) só codificam o conjunto WinAnsi — um caractere fora dele
// (ex.: emoji ou símbolo num user agent) faria o pdf-lib lançar erro e o download falhar.
const EXTRAS_WINANSI = new Set('—–“”‘’•…€™'.split(''));
function paraWinAnsi(v: string): string {
  return Array.from(v)
    .map((ch) => (ch.charCodeAt(0) <= 0xff || EXTRAS_WINANSI.has(ch) ? ch : '?'))
    .join('');
}

function mascararCpf(cpf?: string): string {
  const d = (cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return '—';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

function dataHora(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** `doc` precisa ser o registro COMPLETO (com assinaturaImagem) — ver getDocumentoAssinatura. */
export async function gerarPdfAssinado(doc: DocumentoAssinatura, cpfColaborador?: string): Promise<File> {
  if (doc.status !== 'Assinado' || !doc.assinaturaImagem) {
    throw new Error('Este documento ainda não foi assinado.');
  }
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const resposta = await fetch(await obterUrlArquivo(doc.arquivoRef));
  if (!resposta.ok) throw new Error(`Não foi possível baixar o documento original (${resposta.status}).`);
  const bytesOriginais = await resposta.arrayBuffer();
  const hash = await sha256Hex(bytesOriginais);

  const pdf = await PDFDocument.load(bytesOriginais);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bronze = rgb(196 / 255, 130 / 255, 41 / 255);
  const texto = rgb(0.2, 0.2, 0.2);
  const cinza = rgb(0.4, 0.4, 0.4);

  const pagina = pdf.addPage([595.28, 841.89]); // A4
  const { width: largura, height: altura } = pagina.getSize();
  const margem = 50;
  let y = altura - margem;

  // Cabeçalho: logo + título, régua bronze (mesmo padrão dos documentos impressos do sistema).
  const logo = await pdf.embedPng(JMT_LOGO_BASE64);
  const logoLargura = 120;
  const logoAltura = (logoLargura * logo.height) / logo.width;
  pagina.drawImage(logo, { x: margem, y: y - logoAltura, width: logoLargura, height: logoAltura });
  const titulo = 'COMPROVANTE DE ASSINATURA ELETRÔNICA';
  pagina.drawText(titulo, {
    x: largura - margem - negrito.widthOfTextAtSize(titulo, 13),
    y: y - 18,
    size: 13,
    font: negrito,
    color: rgb(0.07, 0.07, 0.07),
  });
  y -= Math.max(logoAltura, 30) + 12;
  pagina.drawRectangle({ x: margem, y, width: largura - 2 * margem, height: 1.5, color: bronze });
  y -= 26;

  // Quebra de linha simples por largura (pdf-lib não quebra texto sozinho).
  const escrever = (rotulo: string, valorOriginal: string, tamanho = 10) => {
    const valor = paraWinAnsi(valorOriginal);
    pagina.drawText(rotulo, { x: margem, y, size: 9, font: negrito, color: cinza });
    y -= 13;
    const larguraMax = largura - 2 * margem;
    // Texto sem espaço (ex.: o hash) maior que a linha é quebrado por caractere.
    const palavras = valor.split(/\s+/).flatMap((p) => {
      if (fonte.widthOfTextAtSize(p, tamanho) <= larguraMax) return [p];
      const pedacos: string[] = [];
      let atual = '';
      for (const ch of p) {
        if (fonte.widthOfTextAtSize(atual + ch, tamanho) > larguraMax) {
          pedacos.push(atual);
          atual = ch;
        } else atual += ch;
      }
      if (atual) pedacos.push(atual);
      return pedacos;
    });
    let linha = '';
    for (const palavra of palavras) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) > larguraMax && linha) {
        pagina.drawText(linha, { x: margem, y, size: tamanho, font: fonte, color: texto });
        y -= tamanho + 4;
        linha = palavra;
      } else {
        linha = tentativa;
      }
    }
    if (linha) {
      pagina.drawText(linha, { x: margem, y, size: tamanho, font: fonte, color: texto });
      y -= tamanho + 4;
    }
    y -= 8;
  };

  escrever('DOCUMENTO', doc.titulo);
  escrever('COLABORADOR', `${doc.colaboradorNome}   —   CPF ${mascararCpf(cpfColaborador)}`);
  escrever(
    'COMO A IDENTIDADE FOI CONFIRMADA',
    'Link individual enviado ao colaborador; antes de abrir o documento, o colaborador informou o CPF, que foi conferido com o CPF do cadastro.'
  );
  escrever('VISUALIZADO EM', dataHora(doc.visualizadoEm));
  escrever('ASSINADO EM', dataHora(doc.assinadoEm));
  if (doc.declaracao) escrever('DECLARAÇÃO ACEITA PELO COLABORADOR', `"${doc.declaracao}"`);

  // Assinatura desenhada.
  pagina.drawText('ASSINATURA', { x: margem, y, size: 9, font: negrito, color: cinza });
  y -= 8;
  const assinatura = await pdf.embedPng(doc.assinaturaImagem);
  const boxLargura = 260;
  const boxAltura = 100;
  const escala = Math.min(boxLargura / assinatura.width, boxAltura / assinatura.height);
  const assLargura = assinatura.width * escala;
  const assAltura = assinatura.height * escala;
  pagina.drawRectangle({
    x: margem,
    y: y - boxAltura - 10,
    width: boxLargura + 20,
    height: boxAltura + 10,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 0.8,
  });
  pagina.drawImage(assinatura, {
    x: margem + 10 + (boxLargura - assLargura) / 2,
    y: y - boxAltura - 5 + (boxAltura - assAltura) / 2,
    width: assLargura,
    height: assAltura,
  });
  y -= boxAltura + 30;

  if (doc.navegador) escrever('DISPOSITIVO / NAVEGADOR', doc.navegador, 8);
  escrever('CÓDIGO DE VERIFICAÇÃO DO DOCUMENTO ORIGINAL (SHA-256)', hash, 8);
  escrever('IDENTIFICADOR DO REGISTRO', doc.id, 8);

  // Rodapé institucional.
  pagina.drawLine({
    start: { x: margem, y: 40 },
    end: { x: largura - margem, y: 40 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });
  const assinaturaInstitucional = paraWinAnsi(STRATEGIC_GUIDELINES.assinatura);
  pagina.drawText(assinaturaInstitucional, {
    x: (largura - negrito.widthOfTextAtSize(assinaturaInstitucional, 7.5)) / 2,
    y: 28,
    size: 7.5,
    font: negrito,
    color: bronze,
  });

  const bytes = await pdf.save();
  const base = (doc.arquivoNome || 'documento.pdf').replace(/\.pdf$/i, '');
  return new File([bytes], `${base}_ASSINADO.pdf`, { type: 'application/pdf' });
}
