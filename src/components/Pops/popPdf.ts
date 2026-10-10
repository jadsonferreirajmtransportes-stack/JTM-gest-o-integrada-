// ============================================================================
// PDF do POP no modelo ABNT + identidade JMT.
// - NBR 14724: A4, margens superior/esquerda 3 cm e inferior/direita 2 cm, fonte
//   12 no texto e menor em tabelas, entrelinha 1,5, texto justificado com recuo
//   de 1,25 cm na primeira linha.
// - NBR 6024: seções numeradas (1, 1.1...), primárias em NEGRITO MAIÚSCULO,
//   secundárias em negrito; alíneas a), b)...; seções vazias opcionais saem e a
//   numeração segue sem buraco.
// - NBR 6023: referências como o usuário escreveu (o editor orienta o formato).
// - Controle de documento (ABNT NBR ISO 9001): cabeçalho com código, versão e
//   página em todas as páginas; quadro Elaborado/Revisado/Aprovado; histórico
//   de revisões; marca d'água quando não é a versão vigente.
// Com `ciencia`, acrescenta a página do termo de ciência com a linha de
// assinatura do colaborador (assinada no link pessoal).
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import { SETORES_DOCUMENTO } from '../../data/setoresDocumento';
import type { CampoAssinaturaPdf } from '../../utils/documentosAssinaturaApi';
import type { Pop } from '../../utils/popsModelo';

const BRONZE: [number, number, number] = [196, 130, 41];
const TEXTO: [number, number, number] = [17, 17, 17];
const CORPO: [number, number, number] = [40, 40, 40];
const CINZA: [number, number, number] = [110, 110, 110];
const FUNDO: [number, number, number] = [248, 240, 228];
const MM_PARA_PT = 72 / 25.4;

// NBR 14724
const M_ESQ = 30;
const M_DIR = 20;
const M_SUP = 30;
const M_INF = 20;
const FONTE = 12;
const ENTRELINHA = (FONTE * 1.5) / MM_PARA_PT; // 1,5 × 12 pt em mm
const RECUO = 12.5;

export const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
export const nomeSetorPop = (sigla: string) => SETORES_DOCUMENTO.find((s) => s.sigla === sigla)?.nome || sigla;
const ALINEAS = 'abcdefghijklmnopqrstuvwxyz';

export function nomeArquivoPop(p: Pop, sufixo = ''): string {
  return `${p.codigo || 'POP'}_v${p.versao}_${p.titulo}${sufixo}`.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 110) + '.pdf';
}

export function gerarPopPdf(
  p: Pop,
  opcoes: {
    /** Todas as versões do mesmo código (pro histórico de revisões). */
    historico?: Pop[];
    ciencia?: { nomeCompleto: string; cpf?: string; funcaoCargo?: string };
  } = {}
): { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const larguraTexto = largura - M_ESQ - M_DIR;
  const LIMITE = altura - M_INF;
  const c = p.conteudo;
  let y = M_SUP + 4;

  const novaPagina = () => {
    doc.addPage();
    y = M_SUP + 4;
  };
  const espaco = (mm: number) => {
    if (y + mm > LIMITE) novaPagina();
  };
  const fonte = (estilo: 'normal' | 'bold' | 'italic' | 'bolditalic', tamanho = FONTE, cor: [number, number, number] = CORPO) => {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
  };

  /** Parágrafo justificado, recuo de 1,25 cm na 1ª linha (ABNT). */
  const paragrafo = (t: string, opc: { recuo?: boolean; margem?: number; estilo?: 'normal' | 'italic' } = {}) => {
    const texto = t.replace(/\s+/g, ' ').trim();
    if (!texto) return;
    const margem = opc.margem ?? 0;
    const recuo = opc.recuo === false ? 0 : RECUO;
    fonte(opc.estilo ?? 'normal');
    const primeira = (doc.splitTextToSize(texto, larguraTexto - margem - recuo) as string[])[0];
    const resto = texto.slice(primeira.length).trim();
    const linhas: { t: string; x: number; w: number }[] = [{ t: primeira, x: M_ESQ + margem + recuo, w: larguraTexto - margem - recuo }];
    if (resto) (doc.splitTextToSize(resto, larguraTexto - margem) as string[]).forEach((l) => linhas.push({ t: l, x: M_ESQ + margem, w: larguraTexto - margem }));
    linhas.forEach((l, i) => {
      espaco(ENTRELINHA);
      const ultima = i === linhas.length - 1;
      if (ultima) doc.text(l.t, l.x, y);
      else doc.text(l.t, l.x, y, { align: 'justify', maxWidth: l.w });
      y += ENTRELINHA;
    });
  };

  /** Alínea "a) texto" com recuo, texto justificado nas linhas seguintes. */
  const alinea = (rotulo: string, t: string) => {
    fonte('normal');
    const recuoRotulo = RECUO;
    const larg = larguraTexto - recuoRotulo - 7;
    const linhas = doc.splitTextToSize(t.replace(/\s+/g, ' ').trim(), larg) as string[];
    linhas.forEach((l, i) => {
      espaco(ENTRELINHA);
      if (i === 0) doc.text(rotulo, M_ESQ + recuoRotulo, y);
      if (i === linhas.length - 1) doc.text(l, M_ESQ + recuoRotulo + 7, y);
      else doc.text(l, M_ESQ + recuoRotulo + 7, y, { align: 'justify', maxWidth: larg });
      y += ENTRELINHA;
    });
  };

  /** Texto livre: linhas que começam com "-", "•" ou "*" viram alíneas; o resto, parágrafos. */
  const textoLivre = (t: string) => {
    const linhas = t
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    let n = 0;
    linhas.forEach((l, i) => {
      const m = l.match(/^[-•*]\s*(.+)$/);
      if (m) {
        // ABNT: alíneas terminam em ";" e a última do grupo em "."
        const ultimaDoGrupo = !/^[-•*]/.test(linhas[i + 1] ?? '');
        const item = m[1].replace(/[.;,]$/, '');
        alinea(`${ALINEAS[n++ % 26]})`, item + (ultimaDoGrupo ? '.' : ';'));
      } else {
        n = 0;
        paragrafo(l);
      }
    });
  };

  let secao = 0;
  const titulo1 = (t: string) => {
    secao += 1;
    espaco(ENTRELINHA * 3);
    y += ENTRELINHA * 0.5;
    fonte('bold', FONTE, TEXTO);
    doc.text(`${secao} ${t.toUpperCase()}`, M_ESQ, y);
    y += ENTRELINHA * 1.2;
    return secao;
  };
  const titulo2 = (numero: string, t: string) => {
    espaco(ENTRELINHA * 2.5);
    y += ENTRELINHA * 0.3;
    fonte('bold', FONTE, TEXTO);
    const linhas = doc.splitTextToSize(`${numero} ${t}`, larguraTexto) as string[];
    linhas.forEach((l) => {
      espaco(ENTRELINHA);
      doc.text(l, M_ESQ, y);
      y += ENTRELINHA;
    });
  };
  const tabela = (head: string[], body: string[][], larguras?: Record<number, number>) => {
    autoTable(doc, {
      startY: y - ENTRELINHA * 0.4,
      margin: { left: M_ESQ, right: M_DIR, top: M_SUP + 4, bottom: M_INF + 2 },
      head: [head],
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 1.8, textColor: CORPO, lineColor: [200, 200, 200], lineWidth: 0.15, valign: 'top' },
      headStyles: { fillColor: FUNDO, textColor: TEXTO, fontStyle: 'bold' },
      columnStyles: Object.fromEntries(Object.entries(larguras ?? {}).map(([k, v]) => [k, { cellWidth: v }])),
    });
    y = (doc as any).lastAutoTable.finalY + ENTRELINHA;
  };

  // ---- 1ª página: identificação e quadro de aprovação --------------------------------------
  fonte('bold', 14, TEXTO);
  const tituloLinhas = doc.splitTextToSize(p.titulo.toUpperCase() || 'SEM TÍTULO', larguraTexto) as string[];
  tituloLinhas.forEach((l) => {
    doc.text(l, largura / 2 + (M_ESQ - M_DIR) / 2, y, { align: 'center' });
    y += 7;
  });
  y += 2;
  autoTable(doc, {
    startY: y,
    margin: { left: M_ESQ, right: M_DIR },
    body: [
      ['Código', p.codigo || '(gerado ao salvar)', 'Versão', String(p.versao).padStart(2, '0')],
      ['Setor', nomeSetorPop(p.setor), 'Classificação', p.classificacao],
      ['Início da vigência', dataBr(p.vigenciaInicio), 'Próxima revisão', dataBr(p.proximaRevisao)],
    ],
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 1.8, textColor: CORPO, lineColor: [200, 200, 200], lineWidth: 0.15 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: FUNDO, cellWidth: 34 }, 2: { fontStyle: 'bold', fillColor: FUNDO, cellWidth: 32 } },
  });
  y = (doc as any).lastAutoTable.finalY + 3;
  const assinatura = (nome?: string, cargo?: string, em?: string) => [nome || '—', cargo || '—', em ? dataBr(em.slice(0, 10)) : '—'];
  const el = assinatura(p.elaboradoPor, p.elaboradoCargo, p.elaboradoEm);
  const rv = assinatura(p.revisadoPor, p.revisadoCargo, p.revisadoEm);
  const ap = assinatura(p.aprovadoPor, p.aprovadoCargo, p.aprovadoEm);
  autoTable(doc, {
    startY: y,
    margin: { left: M_ESQ, right: M_DIR },
    head: [['', 'Elaborado por', 'Revisado por', 'Aprovado por']],
    body: [
      ['Nome', el[0], rv[0], ap[0]],
      ['Cargo', el[1], rv[1], ap[1]],
      ['Data', el[2], rv[2], ap[2]],
    ],
    foot: [['', ...[p.elaboradoEm, p.revisadoEm, p.aprovadoEm].map((d) => (d ? 'Assinado eletronicamente no sistema' : ''))]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: CORPO, lineColor: [200, 200, 200], lineWidth: 0.15 },
    headStyles: { fillColor: FUNDO, textColor: TEXTO, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [255, 255, 255], textColor: CINZA, fontStyle: 'italic', fontSize: 7, halign: 'center' },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: FUNDO, cellWidth: 18 } },
  });
  y = (doc as any).lastAutoTable.finalY + ENTRELINHA;

  // ---- Seções -------------------------------------------------------------------------------
  titulo1('Objetivo');
  textoLivre(c.objetivo || '—');

  titulo1('Campo de aplicação');
  textoLivre(c.aplicacao || '—');

  const referencias = c.referencias.filter((r) => r.trim());
  if (referencias.length) {
    titulo1('Referências');
    referencias.forEach((r) => {
      paragrafo(r, { recuo: false });
      y += ENTRELINHA * 0.3;
    });
  }

  const definicoes = c.definicoes.filter((d) => d.termo.trim() || d.definicao.trim());
  if (definicoes.length) {
    titulo1('Termos, definições e siglas');
    tabela(['Termo / sigla', 'Definição'], definicoes.map((d) => [d.termo, d.definicao]), { 0: 42 });
  }

  titulo1('Responsabilidades');
  const resp = c.responsabilidades.filter((r) => r.funcao.trim() || r.atribuicao.trim());
  if (resp.length) tabela(['Função', 'Responsabilidade'], resp.map((r) => [r.funcao, r.atribuicao]), { 0: 45 });
  else paragrafo('—');

  const materiais = c.materiais.filter((m) => m.trim());
  if (materiais.length) {
    titulo1('Materiais, equipamentos e EPIs');
    materiais.forEach((m, i) => alinea(`${ALINEAS[i % 26]})`, m + (i === materiais.length - 1 ? '.' : ';')));
  }

  const nProc = titulo1('Procedimento');
  const etapas = c.etapas.filter((e) => e.titulo.trim() || e.descricao.trim());
  etapas.forEach((e, i) => {
    titulo2(`${nProc}.${i + 1}`, e.titulo.trim() || `Etapa ${i + 1}`);
    textoLivre(e.descricao);
    if (e.responsavel?.trim()) {
      espaco(ENTRELINHA);
      fonte('italic', 10.5, CINZA);
      doc.text(`Responsável: ${e.responsavel.trim()}`, M_ESQ + RECUO, y);
      y += ENTRELINHA;
    }
  });
  if (!etapas.length) paragrafo('—');

  if (c.desvios.trim()) {
    titulo1('Desvios e ações corretivas');
    textoLivre(c.desvios);
  }

  const registros = c.registros.filter((r) => r.registro.trim());
  if (registros.length) {
    titulo1('Registros');
    tabela(['Registro', 'Responsável', 'Tempo de guarda'], registros.map((r) => [r.registro, r.responsavel, r.guarda]), { 1: 40, 2: 32 });
  }

  const anexos = c.anexos.filter((a) => a.trim());
  if (anexos.length) {
    titulo1('Anexos');
    anexos.forEach((a, i) => paragrafo(`Anexo ${ALINEAS[i % 26].toUpperCase()} — ${a}`, { recuo: false }));
  }

  titulo1('Histórico de revisões');
  const versoes = [...(opcoes.historico ?? []).filter((v) => v.codigo === p.codigo && v.id !== p.id), p]
    .filter((v) => v.versao <= p.versao)
    .sort((a, b) => a.versao - b.versao);
  tabela(
    ['Versão', 'Data', 'Descrição da alteração', 'Aprovado por'],
    versoes.map((v) => [
      String(v.versao).padStart(2, '0'),
      dataBr(v.vigenciaInicio || v.aprovadoEm?.slice(0, 10)),
      v.motivoRevisao?.trim() || (v.versao === 1 ? 'Emissão inicial.' : '—'),
      v.aprovadoPor || '—',
    ]),
    { 0: 16, 1: 24, 3: 38 }
  );

  // ---- Termo de ciência (envio para o colaborador) -----------------------------------------
  const camposAssinatura: CampoAssinaturaPdf[] = [];
  if (opcoes.ciencia) {
    const col = opcoes.ciencia;
    novaPagina();
    fonte('bold', 13, TEXTO);
    doc.text('TERMO DE CIÊNCIA', largura / 2 + (M_ESQ - M_DIR) / 2, y, { align: 'center' });
    y += ENTRELINHA * 2;
    paragrafo(
      `Eu, ${col.nomeCompleto}${col.cpf ? `, CPF ${col.cpf}` : ''}${col.funcaoCargo ? `, ${col.funcaoCargo}` : ''}, declaro que recebi, li e compreendi o procedimento ${p.codigo} — ${p.titulo} (versão ${String(p.versao).padStart(2, '0')}), que tive a oportunidade de esclarecer minhas dúvidas e que me comprometo a cumpri-lo nas atividades sob minha responsabilidade.`
    );
    y += ENTRELINHA * 4;
    const larguraLinha = 95;
    const xLinha = M_ESQ + (larguraTexto - larguraLinha) / 2;
    espaco(30);
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

  // ---- Cabeçalho, rodapé e marca d'água em todas as páginas -------------------------------
  const total = doc.getNumberOfPages();
  const logoL = 26;
  const logoA = (logoL * 339) / 900;
  const marca = p.status === 'Vigente' ? '' : p.status === 'Obsoleto' ? 'OBSOLETO' : p.status === 'Rascunho' ? 'RASCUNHO' : 'EM APROVAÇÃO';
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (marca) {
      const gs = (doc as any).GState ? new (doc as any).GState({ opacity: 0.08 }) : null;
      if (gs) (doc as any).setGState(gs);
      fonte('bold', 70, p.status === 'Obsoleto' ? [190, 30, 45] : CINZA);
      doc.text(marca, largura / 2, altura / 2 + 20, { align: 'center', angle: 45 });
      if (gs) (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
    }
    // Quadro do cabeçalho: logo | título | código/versão/página
    const topo = 9;
    const alturaCab = 15;
    const xMeio = M_ESQ + logoL + 4;
    const xDir = largura - M_DIR - 38;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(M_ESQ, topo, larguraTexto, alturaCab);
    doc.line(xMeio, topo, xMeio, topo + alturaCab);
    doc.line(xDir, topo, xDir, topo + alturaCab);
    doc.addImage(JMT_LOGO_BASE64, 'PNG', M_ESQ + 2, topo + (alturaCab - logoA) / 2, logoL, logoA, 'jmt-logo', 'FAST');
    fonte('bold', 8, BRONZE);
    doc.text('PROCEDIMENTO OPERACIONAL PADRÃO', (xMeio + xDir) / 2, topo + 5, { align: 'center' });
    fonte('bold', 8.5, TEXTO);
    const tCab = doc.splitTextToSize(p.titulo || 'Sem título', xDir - xMeio - 4) as string[];
    doc.text(tCab.slice(0, 2), (xMeio + xDir) / 2, topo + 9.5, { align: 'center' });
    fonte('normal', 8, CORPO);
    doc.text(p.codigo || 'POP', xDir + 2.5, topo + 4.5);
    doc.text(`Versão ${String(p.versao).padStart(2, '0')}`, xDir + 2.5, topo + 8.5);
    doc.text(`Página ${i} de ${total}`, xDir + 2.5, topo + 12.5);
    doc.setFillColor(...BRONZE);
    doc.rect(M_ESQ, topo + alturaCab + 1, larguraTexto, 0.5, 'F');
    // Rodapé
    fonte('normal', 7, CINZA);
    doc.text(
      `${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} · ${p.classificacao} · Cópia ${p.status === 'Vigente' ? 'controlada' : 'não controlada'}`,
      largura / 2 + (M_ESQ - M_DIR) / 2,
      altura - 9,
      { align: 'center' }
    );
  }

  const blob = doc.output('blob');
  return {
    arquivo: new File([blob], nomeArquivoPop(p, opcoes.ciencia ? `_${opcoes.ciencia.nomeCompleto}` : ''), { type: 'application/pdf' }),
    camposAssinatura,
  };
}
