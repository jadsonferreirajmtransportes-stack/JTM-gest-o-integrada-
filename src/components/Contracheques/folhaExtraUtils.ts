// ============================================================================
// Folha extra (planilha da contabilidade: "SALÁRIOS DE SETEMBRO/2026" com
// Nome do empregado | Cargo | Sal Base | Extra | ad | DSR | Total R$ | Data |
// Assinatura) → uma linha por colaborador → recibo individual no padrão JMT,
// que vai pro colaborador assinar junto com o contracheque (categoria
// 'contracheque', tipo 'Folha extra').
// As colunas são lidas pelo cabeçalho da tabela (posição de cada título), então
// rubricas a mais ou a menos (ex.: sem "ad") continuam funcionando.
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { Colaborador } from '../../types';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import { PaginaComPosicao, formatarCompetencia } from './contrachequePdfUtils';

export const TIPO_FOLHA_EXTRA = 'Folha extra';

export interface ValorFolhaExtra {
  rotulo: string;
  valor: number;
}

export interface LinhaFolhaExtraLida {
  /** Ordem no arquivo (pra chave estável). */
  ordem: number;
  nomeNoPdf: string;
  cargo: string;
  salarioBase?: number;
  /** Rubricas pagas (Extra, ad, DSR...), na ordem da planilha. */
  valores: ValorFolhaExtra[];
  total: number;
  colaboradorId?: string;
}

export interface FolhaExtraLida {
  competencia?: string; // YYYY-MM
  rubrica?: string; // ex.: "Hora Extra"
  linhas: LinhaFolhaExtraLida[];
}

const MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function normalizar(v: string): string {
  return (v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ehValor = (s: string) => /^-?[\d.]+,\d{2}$/.test(s.trim());
const paraNumero = (s: string) => Number(s.trim().replace(/\./g, '').replace(',', '.')) || 0;
export const formatarReais = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Nome legível de cada título da planilha. */
function rotuloDaColuna(titulo: string): string {
  const t = normalizar(titulo);
  if (/^SAL/.test(t)) return 'Salário base';
  if (t === 'EXTRA' || t === 'HORA EXTRA' || t === 'HE') return 'Horas extras';
  if (t === 'AD' || t === 'ADICIONAL') return 'Adicional';
  if (t === 'AD NOT' || t === 'ADICIONAL NOTURNO') return 'Adicional noturno';
  if (t === 'DSR' || t === 'DRS') return 'DSR (descanso semanal remunerado)';
  if (/^DIF/.test(t) && /SAL/.test(t)) return 'Diferença salarial';
  return titulo.trim();
}

interface Coluna {
  x: number;
  titulo: string;
  tipo: 'nome' | 'cargo' | 'base' | 'valor' | 'total' | 'ignorar';
}

/** Junta os trechos em linhas (mesma altura, com folga de 2pt). */
function agruparLinhas(itens: PaginaComPosicao['itens']) {
  const linhas: { y: number; itens: PaginaComPosicao['itens'] }[] = [];
  itens
    .filter((it) => it.str.trim())
    .sort((a, b) => b.y - a.y)
    .forEach((it) => {
      const l = linhas.find((x) => Math.abs(x.y - it.y) <= 2);
      if (l) l.itens.push(it);
      else linhas.push({ y: it.y, itens: [it] });
    });
  linhas.forEach((l) => l.itens.sort((a, b) => a.x - b.x));
  return linhas;
}

export function lerFolhaExtra(paginas: PaginaComPosicao[], colaboradores: Colaborador[]): FolhaExtraLida {
  const textoTodo = normalizar(paginas.map((p) => p.texto).join(' '));
  const mComp = textoTodo.match(new RegExp(`\\b(${MESES.join('|')})\\s*(?:/|DE)\\s*(\\d{4})(?!\\d)`));
  const competencia = mComp ? `${mComp[2]}-${String(MESES.indexOf(mComp[1]) + 1).padStart(2, '0')}` : undefined;
  const linhasLidas: LinhaFolhaExtraLida[] = [];
  let rubrica: string | undefined;

  paginas.forEach((pagina) => {
    const linhas = agruparLinhas(pagina.itens);
    const iCab = linhas.findIndex((l) => {
      const t = normalizar(l.itens.map((i) => i.str).join(' '));
      return /NOME/.test(t) && /TOTAL/.test(t);
    });
    if (iCab < 0) return;
    // Título da rubrica logo acima do cabeçalho (ex.: "Hora Extra").
    const acima = linhas[iCab - 1];
    if (!rubrica && acima && !/SALARIO/.test(normalizar(acima.itens.map((i) => i.str).join(' ')))) {
      rubrica = acima.itens.map((i) => i.str.trim()).join(' ').trim() || undefined;
    }
    const colunas: Coluna[] = linhas[iCab].itens.map((it) => {
      const t = normalizar(it.str);
      const tipo: Coluna['tipo'] = /NOME/.test(t)
        ? 'nome'
        : /CARGO|FUNCAO/.test(t)
          ? 'cargo'
          : /^SAL/.test(t)
            ? 'base'
            : /TOTAL/.test(t)
              ? 'total'
              : /^DATA$|ASSINATURA/.test(t)
                ? 'ignorar'
                : 'valor';
      return { x: it.x, titulo: it.str, tipo };
    });
    const xNome = colunas.find((c) => c.tipo === 'nome')?.x ?? 0;
    // Trecho pertence à coluna cujo título começa até 12pt à direita dele (títulos e valores não
    // ficam exatamente alinhados na planilha).
    // O nome costuma começar à esquerda do título "Nome do empregado" — tudo que vem antes da
    // 2ª coluna (e não é o nº da linha) é nome.
    const colunaDe = (x: number) => [...colunas].reverse().find((c) => c.x <= x + 12) ?? (colunas[0]?.tipo === 'nome' ? colunas[0] : undefined);

    for (const linha of linhas.slice(iCab + 1)) {
      const textoLinha = normalizar(linha.itens.map((i) => i.str).join(' '));
      if (/^TOTAL\b/.test(textoLinha)) break;
      const nome: string[] = [];
      const cargo: string[] = [];
      let salarioBase: number | undefined;
      let total: number | undefined;
      const valores: ValorFolhaExtra[] = [];
      linha.itens.forEach((it) => {
        if (it.x + it.w < xNome - 2 && /^\d+$/.test(it.str.trim())) return; // nº da linha
        const col = colunaDe(it.x);
        if (!col) return;
        if (col.tipo === 'nome') nome.push(it.str.trim());
        else if (col.tipo === 'cargo') cargo.push(it.str.trim());
        else if (col.tipo === 'base' && ehValor(it.str)) salarioBase = paraNumero(it.str);
        else if (col.tipo === 'total' && ehValor(it.str)) total = paraNumero(it.str);
        else if (col.tipo === 'valor' && ehValor(it.str)) valores.push({ rotulo: rotuloDaColuna(col.titulo), valor: paraNumero(it.str) });
      });
      const nomeNoPdf = nome.join(' ').replace(/\s+/g, ' ').trim();
      if (!nomeNoPdf || (total === undefined && valores.length === 0)) continue;
      // Quando o total soma o salário junto (salário também pago nesta folha), o salário vira uma
      // linha do recibo; senão é só informativo (salário base do cálculo).
      const somaValores = valores.reduce((t, v) => t + v.valor, 0);
      if (salarioBase !== undefined && total !== undefined && Math.abs(salarioBase + somaValores - total) < 0.05) {
        valores.unshift({ rotulo: 'Salário', valor: salarioBase });
        salarioBase = undefined;
      }
      linhasLidas.push({
        ordem: linhasLidas.length,
        nomeNoPdf,
        cargo: cargo.join(' ').trim(),
        salarioBase,
        valores,
        total: total ?? valores.reduce((t, v) => t + v.valor, 0),
        colaboradorId: acharColaborador(nomeNoPdf, colaboradores),
      });
    }
  });
  return { competencia, rubrica, linhas: linhasLidas };
}

/** Nome completo igual; senão, o único colaborador que tem todas as palavras do nome da planilha
 *  (planilha às vezes abrevia/omite um sobrenome). */
function acharColaborador(nome: string, colaboradores: Colaborador[]): string | undefined {
  const alvo = normalizar(nome);
  const exato = colaboradores.find((c) => normalizar(c.nomeCompleto) === alvo);
  if (exato) return exato.id;
  const palavras = alvo.split(' ').filter((p) => p.length > 2);
  if (palavras.length < 2) return undefined;
  const candidatos = colaboradores.filter((c) => {
    const n = ` ${normalizar(c.nomeCompleto)} `;
    return palavras.every((p) => n.includes(` ${p} `));
  });
  if (candidatos.length === 1) return candidatos[0].id;
  if (candidatos.length > 1) return undefined;
  // Erro de digitação na planilha ("Fernadnes"): cada palavra pode diferir até 2 letras de uma
  // palavra do cadastro, e o primeiro nome tem que bater — só se houver um único candidato.
  const parecidos = colaboradores.filter((c) => {
    const doCadastro = normalizar(c.nomeCompleto).split(' ');
    if (distancia(doCadastro[0], palavras[0]) > 1) return false;
    return palavras.every((p) => doCadastro.some((w) => distancia(w, p) <= (p.length >= 6 ? 2 : 1)));
  });
  return parecidos.length === 1 ? parecidos[0].id : undefined;
}

/** Distância de edição (Damerau, com troca de letras vizinhas = 1). */
function distancia(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// ---------------------------------------------------------------------------
// Recibo individual em PDF (padrão JMT)
// ---------------------------------------------------------------------------

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [110, 110, 110];
const MARGEM = 18;
const MM_PARA_PT = 72 / 25.4;

export function gerarReciboFolhaExtraPdf(params: {
  colaborador: { nomeCompleto: string; cpf?: string; codigoMatricula?: string; funcaoCargo?: string };
  competencia: string;
  rubrica?: string;
  linha: LinhaFolhaExtraLida;
}): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const { colaborador: c, competencia, rubrica, linha } = params;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();

  const logoLargura = 36;
  const logoAltura = (logoLargura * 339) / 900;
  doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 12, logoLargura, logoAltura, 'jmt-logo', 'FAST');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...TEXTO);
  doc.text('RECIBO DE FOLHA EXTRA', largura - MARGEM, 17, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRONZE);
  doc.text(`Competência ${formatarCompetencia(competencia)}`, largura - MARGEM, 22, { align: 'right' });
  let y = 12 + logoAltura + 4;
  doc.setFillColor(...BRONZE);
  doc.rect(MARGEM, y, largura - 2 * MARGEM, 0.6, 'F');
  y += 8;

  doc.setFontSize(9.5);
  doc.setTextColor(...TEXTO);
  const linhaInfo = (rotulo: string, valor: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(rotulo, MARGEM, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, MARGEM + 32, y);
    y += 5.5;
  };
  linhaInfo('Empregador', `${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`);
  linhaInfo('Colaborador(a)', c.nomeCompleto);
  if (c.cpf || c.codigoMatricula) linhaInfo(c.cpf ? 'CPF' : 'Matrícula', [c.cpf, c.codigoMatricula && c.cpf ? `Matrícula ${c.codigoMatricula}` : c.codigoMatricula].filter(Boolean).join(' — '));
  linhaInfo('Cargo', linha.cargo || c.funcaoCargo || '—');
  if (linha.salarioBase) linhaInfo('Salário base', `R$ ${formatarReais(linha.salarioBase)}`);
  if (rubrica) linhaInfo('Referente a', rubrica);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Descrição', 'Valor (R$)']],
    body: linha.valores.map((v) => [v.rotulo, formatarReais(v.valor)]),
    foot: [['Total a receber', formatarReais(linha.total)]],
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 2.4, textColor: [40, 40, 40], lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [248, 240, 228], textColor: [17, 17, 17], fontStyle: 'bold' },
    footStyles: { fillColor: [248, 240, 228], textColor: [17, 17, 17], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
    didParseCell: (d) => {
      if (d.column.index === 1) d.cell.styles.halign = 'right';
    },
  });
  y = ((doc as any).lastAutoTable?.finalY ?? y + 30) + 12;

  doc.setFontSize(9.5);
  doc.setTextColor(...TEXTO);
  const declaracao = doc.splitTextToSize(
    `Declaro que recebi de ${EMPRESA_REGULAMENTO.razaoSocial} a importância de R$ ${formatarReais(linha.total)}, referente à folha extra${rubrica ? ` (${rubrica.toLowerCase()})` : ''} da competência ${formatarCompetencia(competencia)}, conforme discriminado acima.`,
    largura - 2 * MARGEM
  ) as string[];
  doc.text(declaracao, MARGEM, y);
  y += declaracao.length * 4.5 + 22;

  const larguraLinha = 95;
  const xLinha = (largura - larguraLinha) / 2;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(xLinha, y, xLinha + larguraLinha, y);
  doc.setFontSize(8.5);
  doc.text(c.nomeCompleto, largura / 2, y + 4.5, { align: 'center' });
  doc.setTextColor(...CINZA);
  doc.text('Assinatura do colaborador', largura / 2, y + 8.5, { align: 'center' });
  const camposAssinatura: CampoAssinaturaPdf[] = [
    {
      pagina: 0,
      x: xLinha * MM_PARA_PT,
      y: altura * MM_PARA_PT - y * MM_PARA_PT + 1,
      largura: larguraLinha * MM_PARA_PT,
      altura: 34,
    },
  ];

  doc.setFontSize(6.5);
  doc.setTextColor(...CINZA);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} a partir da folha enviada pela contabilidade.`, largura / 2, altura - 8, { align: 'center' });

  const nome = `Folha_extra_${competencia}_${c.nomeCompleto}`.replace(/[^\p{L}\p{N}]+/gu, '_');
  return { arquivo: new File([doc.output('blob')], `${nome}.pdf`, { type: 'application/pdf' }), camposAssinatura };
}
