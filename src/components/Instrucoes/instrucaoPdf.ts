// ============================================================================
// PDF da Instrução de Trabalho (identidade JMT) — usado no envio para ciência dos
// colaboradores: o documento vai para "Documentos" no link pessoal, com a página do
// termo de ciência e a linha de assinatura (assinada no celular).
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import type { InstrucaoTrabalho } from '../../types';
import { getCategoriaConfig } from './instrucoesTrabalhoUtils';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [45, 45, 45];
const CINZA: [number, number, number] = [110, 110, 110];
const FUNDO: [number, number, number] = [248, 240, 228];
const MM_PARA_PT = 72 / 25.4;
const MARGEM = 20;
const TOPO = 32;

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const preenchido = (...v: (string | undefined)[]) => v.some((x) => x?.trim());

export const tituloCienciaInstrucao = (i: InstrucaoTrabalho) => `Instrução de Trabalho ${i.codigo} — ${i.titulo} (versão ${i.versao})`;

export function gerarInstrucaoPdf(
  it: InstrucaoTrabalho,
  opcoes: { ciencia?: { nomeCompleto: string; cpf?: string; funcaoCargo?: string } } = {}
): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const larguraTexto = largura - 2 * MARGEM;
  const LIMITE = altura - 22;
  let y = TOPO;

  const novaPagina = () => {
    doc.addPage();
    y = TOPO;
  };
  const espaco = (mm: number) => {
    if (y + mm > LIMITE) novaPagina();
  };
  const fonte = (estilo: 'normal' | 'bold' | 'italic', tamanho = 10, cor: [number, number, number] = CORPO) => {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
  };
  const texto = (t: string) => {
    fonte('normal');
    t.split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((l) => {
        (doc.splitTextToSize(l, larguraTexto) as string[]).forEach((linha) => {
          espaco(5);
          doc.text(linha, MARGEM, y);
          y += 4.8;
        });
        y += 1.2;
      });
  };
  let secao = 0;
  const titulo = (t: string) => {
    secao += 1;
    espaco(16);
    y += 3;
    fonte('bold', 11, TEXTO);
    doc.text(`${secao}. ${t.toUpperCase()}`, MARGEM, y);
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, y + 1.8, 14, 0.6, 'F');
    y += 7;
  };
  const tabela = (cabecalho: string[], linhas: string[][], tamanho = 9) => {
    // Coluna sem nada preenchido em nenhuma linha não entra (ex.: Entrada/Saída do passo a passo).
    const usadas = cabecalho.map((_, c) => linhas.some((l) => (l[c] || '').trim()));
    const head = cabecalho.filter((_, c) => usadas[c]);
    const body = linhas.map((l) => l.filter((_, c) => usadas[c]));
    autoTable(doc, {
      startY: y,
      margin: { left: MARGEM, right: MARGEM, top: TOPO, bottom: 24 },
      head: [head],
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: tamanho, cellPadding: 1.6, textColor: CORPO, lineColor: [215, 215, 215], lineWidth: 0.15, valign: 'top' },
      headStyles: { fillColor: FUNDO, textColor: TEXTO, fontStyle: 'bold' },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  };

  // ---- Título e identificação ---------------------------------------------------------------
  fonte('bold', 16, TEXTO);
  const linhasTitulo = doc.splitTextToSize((it.titulo || 'Sem título').toUpperCase(), larguraTexto) as string[];
  doc.text(linhasTitulo, MARGEM, y + 2);
  y += linhasTitulo.length * 7 + 3;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEM, right: MARGEM },
    body: [
      ['Código', it.codigo, 'Versão', String(it.versao)],
      ['Operação', getCategoriaConfig(it.categoria).label, 'Vigência', dataBr(it.dataVigencia)],
      ['Dono do processo', it.responsavel || '—', 'Aprovado por', it.aprovadoPor || '—'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: CORPO, lineColor: [215, 215, 215], lineWidth: 0.15 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: FUNDO, cellWidth: 34 }, 2: { fontStyle: 'bold', fillColor: FUNDO, cellWidth: 28 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // ---- Conteúdo (só o que estiver preenchido) -----------------------------------------------
  if (preenchido(it.objetivo)) {
    titulo('Objetivo');
    texto(it.objetivo!);
  }
  if (preenchido(it.aplicacaoAbrangencia)) {
    titulo('Aplicação e abrangência');
    texto(it.aplicacaoAbrangencia!);
  }
  if (preenchido(it.definicoes)) {
    titulo('Definições');
    texto(it.definicoes!);
  }
  const resp = (it.responsabilidades || []).filter((r) => preenchido(r.responsavel, r.responsabilidade));
  if (resp.length) {
    titulo('Responsabilidades');
    tabela(['Quem', 'Responsabilidade'], resp.map((r) => [r.responsavel, r.responsabilidade]));
  }
  const sipoc = (it.sipoc || []).filter((s) => preenchido(s.fornecedores, s.entradas, s.processo, s.saidas, s.clientes));
  if (sipoc.length) {
    titulo('Visão do processo (SIPOC)');
    tabela(['Fornecedores', 'Entradas', 'Processo', 'Saídas', 'Clientes'], sipoc.map((s) => [s.fornecedores, s.entradas, s.processo, s.saidas, s.clientes]), 8.5);
  }
  const fluxo = (it.fluxoProcesso || []).filter((e) => preenchido(e.etapa, e.responsavel, e.observacao)).sort((a, b) => a.ordem - b.ordem);
  if (fluxo.length) {
    titulo('Passo a passo');
    tabela(
      ['Nº', 'Etapa', 'Responsável', 'Entrada', 'Saída', 'Sistema / documento', 'Observação'],
      fluxo.map((e, i) => [String(e.ordem || i + 1), e.etapa, e.responsavel || '', e.entrada || '', e.saida || '', e.sistemaDocumento || '', e.observacao || '']),
      8
    );
  }
  if (preenchido(it.criteriosDecisao)) {
    titulo('Critérios de decisão');
    texto(it.criteriosDecisao!);
  }
  if (preenchido(it.registrosEvidencias)) {
    titulo('Registros e evidências');
    texto(it.registrosEvidencias!);
  }
  const indicadores = (it.indicadores || []).filter((x) => preenchido(x.indicador, x.meta));
  if (indicadores.length) {
    titulo('Indicadores');
    tabela(['Indicador', 'Fórmula', 'Meta', 'Frequência', 'Responsável'], indicadores.map((x) => [x.indicador, x.formula, x.meta, x.frequencia, x.responsavel]), 8.5);
  }
  const riscos = (it.riscosControles || []).filter((x) => preenchido(x.risco, x.controle));
  if (riscos.length) {
    titulo('Riscos e controles');
    tabela(['Risco', 'Controle'], riscos.map((x) => [x.risco, x.controle]));
  }
  const historico = (it.historicoRevisoes || []).filter((x) => preenchido(x.data, x.descricao));
  if (historico.length) {
    titulo('Histórico de revisões');
    tabela(['Revisão', 'Data', 'Alterado por', 'Descrição'], historico.map((x) => [x.revisao, x.data?.includes('-') ? dataBr(x.data) : x.data, x.alteradoPor, x.descricao]), 8.5);
  }

  // ---- Termo de ciência -----------------------------------------------------------------------
  const camposAssinatura: CampoAssinaturaPdf[] = [];
  if (opcoes.ciencia) {
    const col = opcoes.ciencia;
    novaPagina();
    fonte('bold', 13, TEXTO);
    doc.text('TERMO DE CIÊNCIA', largura / 2, y, { align: 'center' });
    y += 12;
    fonte('normal', 11);
    const declaracao = `Eu, ${col.nomeCompleto}${col.cpf ? `, CPF ${col.cpf}` : ''}${col.funcaoCargo ? `, ${col.funcaoCargo}` : ''}, declaro que recebi, li e compreendi a Instrução de Trabalho ${it.codigo} — ${it.titulo} (versão ${it.versao}), que tive a oportunidade de esclarecer minhas dúvidas e que me comprometo a segui-la nas atividades sob minha responsabilidade.`;
    (doc.splitTextToSize(declaracao, larguraTexto) as string[]).forEach((l, i, todas) => {
      if (i < todas.length - 1) doc.text(l, MARGEM, y, { align: 'justify', maxWidth: larguraTexto });
      else doc.text(l, MARGEM, y);
      y += 6.5;
    });
    y += 28;
    const larguraLinha = 95;
    const xLinha = MARGEM + (larguraTexto - larguraLinha) / 2;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.line(xLinha, y, xLinha + larguraLinha, y);
    fonte('normal', 10, TEXTO);
    doc.text(col.nomeCompleto, xLinha + larguraLinha / 2, y + 5, { align: 'center' });
    fonte('normal', 9, CINZA);
    doc.text('Assinatura do colaborador', xLinha + larguraLinha / 2, y + 9.5, { align: 'center' });
    camposAssinatura.push({
      pagina: doc.getNumberOfPages() - 1,
      x: xLinha * MM_PARA_PT,
      y: altura * MM_PARA_PT - y * MM_PARA_PT + 1,
      largura: larguraLinha * MM_PARA_PT,
      altura: 34,
    });
  }

  // ---- Cabeçalho e rodapé ---------------------------------------------------------------------
  const total = doc.getNumberOfPages();
  const logoL = 30;
  const logoA = (logoL * 339) / 900;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', MARGEM, 10, logoL, logoA, 'jmt-logo', 'FAST');
    fonte('bold', 8.5, TEXTO);
    doc.text(`${it.codigo} · Versão ${it.versao}`, largura - MARGEM, 14.5, { align: 'right' });
    fonte('normal', 7.5, BRONZE);
    doc.text('INSTRUÇÃO DE TRABALHO', largura - MARGEM, 19, { align: 'right' });
    doc.setFillColor(...BRONZE);
    doc.rect(MARGEM, 10 + logoA + 2.5, larguraTexto, 0.5, 'F');
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(MARGEM, altura - 16, largura - MARGEM, altura - 16);
    fonte('normal', 6.8, CINZA);
    doc.text(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, MARGEM, altura - 11.5);
    doc.text(`Página ${p} de ${total}`, largura - MARGEM, altura - 11.5, { align: 'right' });
  }

  const nome = `${it.codigo}_v${it.versao}_${it.titulo}${opcoes.ciencia ? `_${opcoes.ciencia.nomeCompleto}` : ''}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 110) + '.pdf';
  return { arquivo: new File([doc.output('blob')], nome, { type: 'application/pdf' }), camposAssinatura };
}
