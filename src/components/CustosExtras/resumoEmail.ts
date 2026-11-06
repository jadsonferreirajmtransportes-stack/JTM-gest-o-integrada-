// Resumo dos custos extras para o corpo do e-mail: uma imagem (PNG, no mesmo formato vertical da
// aba "Resumo" da planilha) e um texto pronto.
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';
import type { CustoExtra } from '../../utils/custosExtrasApi';

type CustoResumo = CustoExtra & { uf?: string; notasDetalhe?: { cte?: string; nf?: string; destinatario?: string }[] };

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

/** Linhas iguais às da aba "Resumo" da planilha padrão (De acordo/Observação ficam para o cliente). */
const LINHAS: [string, (x: CustoResumo) => string][] = [
  ['DATA', (x) => dataBr(x.dataOcorrencia)],
  ['Nº DO CT-E', (x) => x.numeroCte || '—'],
  ['Nº DA NOTA FISCAL', (x) => x.notaFiscal || '—'],
  ['DESTINATÁRIO', (x) => x.destinatario || '—'],
  ['CIDADE', (x) => x.cidade || '—'],
  ['UF', (x) => x.uf || '—'],
  ['TIPO DO CUSTO', (x) => x.tipo],
  ['MOTIVO / DETALHES', (x) => x.descricao || '—'],
  ['VALOR', (x) => moeda(x.valor)],
  ['DE ACORDO? (S/N)', () => ''],
  ['OBSERVAÇÃO DO CLIENTE', () => ''],
];
const I_MOTIVO = 7;
const I_VALOR = 8;
const I_ACORDO = 9;
const I_OBS = 10;

/** Nome do custo como a equipe escreve no e-mail (ex.: "TDE - Taxa de Dificuldade de Entrega", "VEÍCULO DEDICADO"). */
function nomeDoCusto(tipo: string): string {
  const t = tipo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/\btde\b/.test(t)) return 'TDE - Taxa de Dificuldade de Entrega';
  if (/dedicado/.test(t)) return 'VEÍCULO DEDICADO';
  return tipo;
}
const siglaDoCusto = (tipo: string) => {
  const n = nomeDoCusto(tipo);
  return n.startsWith('TDE') ? 'TDE' : n === 'VEÍCULO DEDICADO' ? 'CUSTO ADICIONAL' : n.toUpperCase();
};
const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))];
const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia!' : h < 18 ? 'Boa tarde!' : 'Boa noite!';
};
const dataDosCustos = (itens: CustoResumo[]) => {
  const datas = unicos(itens.map((x) => x.dataOcorrencia || ''));
  return datas.length === 1 ? dataBr(datas[0]) : new Date().toLocaleDateString('pt-BR');
};

/** CT-e/NF de cada destinatário (como nas tabelinhas "CTC | NF" que a equipe cola no e-mail). */
export function notasPorDestinatario(itens: CustoResumo[]): { destinatario: string; notas: { cte: string; nf: string }[] }[] {
  const grupos = new Map<string, { cte: string; nf: string }[]>();
  itens.forEach((x) => {
    const notas = x.notasDetalhe?.length ? x.notasDetalhe : [{ cte: x.numeroCte, nf: x.notaFiscal, destinatario: x.destinatario }];
    notas.forEach((n) => {
      const dest = (n.destinatario || x.destinatario || 'Destinatário').trim();
      const lista = grupos.get(dest) || [];
      if (!lista.some((l) => l.cte === (n.cte || '') && l.nf === (n.nf || ''))) lista.push({ cte: n.cte || '—', nf: n.nf || '—' });
      grupos.set(dest, lista);
    });
  });
  return [...grupos.entries()].map(([destinatario, notas]) => ({ destinatario, notas }));
}

/** Assunto no padrão da equipe, com o cliente: "TDE (UNICARGO) - DESTINO A / DESTINO B - 05/11/2026". */
export function assuntoEmail(empresa: string, itens: CustoResumo[]): string {
  const sigla = unicos(itens.map((x) => siglaDoCusto(x.tipo))).join(' / ');
  // Até 3 destinatários: até 3 palavras de cada; mais que isso: só o primeiro nome de cada.
  // O Destino do custo compartilhado guarda os nomes juntos ("A / B / C"): separa cada um.
  const nomes = unicos([
    ...notasPorDestinatario(itens).flatMap((g) => g.destinatario.split(/\s*\/\s*/)),
    ...itens.flatMap((x) => (x.destinatario || '').split(/\s*\/\s*/)),
  ].map((n) => n.trim().toUpperCase())).map((n) => n.split(/\s+/));
  const quem = nomes.map((n) => n.slice(0, nomes.length <= 3 ? 3 : 1).join(' ')).join(' / ');
  return `${sigla} (${empresa}) - ${quem} - ${dataDosCustos(itens)}`.toUpperCase();
}

/** Texto para o corpo do e-mail, no padrão que a equipe já usa. */
export function textoResumoEmail(empresa: string, itens: CustoResumo[], envioId: string): string {
  const total = itens.reduce((s, x) => s + x.valor, 0);
  const custos = unicos(itens.map((x) => nomeDoCusto(x.tipo))).join(' / ');
  const grupos = notasPorDestinatario(itens);
  return [
    saudacao(),
    '',
    `Segue em anexo planilha de custo extra (${custos}) ${dataDosCustos(itens)}.`,
    '',
    "CTE's/NF's relacionadas:",
    '',
    ...grupos.flatMap((g) => [`${g.destinatario.toUpperCase()}:`, ...g.notas.map((n) => `CT-e ${n.cte} — NF ${n.nf}`), '']),
    `Valor total: ${moeda(total)}${itens.length > 1 ? ` (${itens.length} custos)` : ''} — referência ${envioId}.`,
    '',
    'Ficamos no aguardo da autorização.',
    '',
    'Atenciosamente,',
    `Financeiro — ${EMPRESA_REGULAMENTO.razaoSocial}`,
  ].join('\n');
}

/** Mesmo e-mail em HTML, com as tabelas "CT-E | NF" de cada destinatário (para colar no Gmail/Outlook). */
export function htmlResumoEmail(empresa: string, itens: CustoResumo[], envioId: string, texto: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const grupos = notasPorDestinatario(itens);
  const td = 'border:1px solid #000;padding:3px 10px;text-align:center;font-family:Calibri,Arial,sans-serif;font-size:14px';
  const tabelas = grupos
    .map(
      (g) =>
        `<p style="color:#1f5aa6;margin:14px 0 6px">${esc(g.destinatario.toUpperCase())}:</p>` +
        `<table style="border-collapse:collapse;min-width:420px"><tr><th style="${td};font-weight:bold">CT-E</th><th style="${td};font-weight:bold">NF</th></tr>` +
        g.notas.map((n) => `<tr><td style="${td}">${esc(n.cte)}</td><td style="${td}">${esc(n.nf)}</td></tr>`).join('') +
        '</table>'
    )
    .join('');
  // O texto (editável) entra como está; a lista de CT-e/NF dele vira as tabelas.
  const partes = texto.split("CTE's/NF's relacionadas:");
  const antes = partes[0] || '';
  const depois = partes.length > 1 ? partes[1].split(/\n(?=Valor total:)/).slice(1).join('\n') : '';
  const paragrafos = (s: string) =>
    s
      .trim()
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 12px">${esc(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">${paragrafos(antes)}${
    partes.length > 1 ? `<p style="margin:0 0 6px">CTE's/NF's relacionadas:</p>${tabelas}<br>` : ''
  }${paragrafos(depois)}</div>`;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = src;
  });
}

/** Quebra o texto em linhas que cabem na largura (no máximo `max` linhas, com "…"). */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, max: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/)) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length > max) {
    const cortadas = linhas.slice(0, max);
    cortadas[max - 1] = `${cortadas[max - 1].replace(/\s+\S*$/, '')}…`;
    return cortadas;
  }
  return linhas;
}

/** Imagem PNG do resumo (vertical: rótulos à esquerda, um custo por coluna; até 4 por bloco). */
export async function imagemResumoEmail(empresa: string, itens: CustoResumo[], envioId: string): Promise<Blob> {
  const ESCALA = 2;
  const PAD = 28;
  const COL_ROT = 230;
  const POR_BLOCO = Math.min(4, itens.length);
  // Largura mínima para o cabeçalho caber; com poucos custos, as colunas ficam mais largas.
  const COL = Math.max(250, Math.floor((820 - PAD * 2 - COL_ROT) / POR_BLOCO));
  const LARG = PAD * 2 + COL_ROT + COL * POR_BLOCO;
  const BRONZE = '#C48229';
  const BRONZE_ESC = '#92611F';
  const LH = 17;

  const blocos: CustoResumo[][] = [];
  for (let i = 0; i < itens.length; i += 4) blocos.push(itens.slice(i, i + 4));

  // 1ª passada: medir a altura de cada linha de cada bloco.
  const medidor = document.createElement('canvas').getContext('2d')!;
  medidor.font = '13px Arial';
  const alturas = blocos.map((b) =>
    LINHAS.map(([, f], li) => {
      if (li === I_OBS || li === I_MOTIVO) {
        const n = li === I_OBS ? 3 : Math.max(2, ...b.map((x) => quebrar(medidor, f(x), COL - 16, 5).length));
        return n * LH + 12;
      }
      const n = Math.max(1, ...b.map((x) => quebrar(medidor, f(x), COL - 16, 3).length));
      return n * LH + 12;
    })
  );
  const ALT_CAB = 30;
  const altBlocos = alturas.reduce((s, a) => s + ALT_CAB + a.reduce((x, y) => x + y, 0) + 18, 0);
  const ALT = PAD + 60 + 62 + 46 + 18 + altBlocos + 30 + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = LARG * ESCALA;
  canvas.height = ALT * ESCALA;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(ESCALA, ESCALA);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, LARG, ALT);
  ctx.textBaseline = 'middle';

  // Cabeçalho: logo, título, cliente/referência
  try {
    const logo = await carregarImagem(JMT_LOGO_BASE64);
    const h = 52;
    ctx.drawImage(logo, PAD, PAD, (logo.width / logo.height) * h, h);
  } catch {
    /* sem logo */
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 12px Arial';
  const larguraNome = Math.max(ctx.measureText(EMPRESA_REGULAMENTO.razaoSocial).width, 120);
  ctx.fillText('Prestador:', LARG - PAD - larguraNome - 8, PAD + 12);
  ctx.fillStyle = BRONZE_ESC;
  ctx.fillText(EMPRESA_REGULAMENTO.razaoSocial, LARG - PAD, PAD + 12);
  ctx.fillStyle = '#666666';
  ctx.font = '11px Arial';
  ctx.fillText(`CNPJ ${EMPRESA_REGULAMENTO.cnpj}`, LARG - PAD, PAD + 30);
  ctx.textAlign = 'center';
  ctx.fillStyle = BRONZE_ESC;
  ctx.font = 'bold 20px Arial';
  ctx.fillText('RESUMO DOS CUSTOS EXTRAS PARA AUTORIZAÇÃO', LARG / 2, PAD + 80);
  ctx.fillStyle = '#555555';
  ctx.font = '12px Arial';
  ctx.fillText(`Cliente: ${empresa} · Referência: ${envioId} · Emitido em ${new Date().toLocaleDateString('pt-BR')}`, LARG / 2, PAD + 104);
  ctx.textAlign = 'left';
  let y = PAD + 60 + 62;

  // Total em destaque
  const total = itens.reduce((s, x) => s + x.valor, 0);
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'right';
  ctx.fillText('TOTAL DOS CUSTOS:', PAD + COL_ROT - 10, y + 20);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFE066';
  ctx.fillRect(PAD + COL_ROT, y, COL, 40);
  ctx.strokeStyle = '#BFBFBF';
  ctx.strokeRect(PAD + COL_ROT, y, COL, 40);
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(moeda(total), PAD + COL_ROT + 12, y + 20);
  y += 46 + 18;

  // Blocos de até 4 custos
  blocos.forEach((b, bi) => {
    const inicio = bi * 4;
    ctx.fillStyle = BRONZE;
    ctx.fillRect(PAD + COL_ROT, y, COL * b.length, ALT_CAB);
    ctx.strokeStyle = '#BFBFBF';
    ctx.strokeRect(PAD, y, COL_ROT, ALT_CAB);
    b.forEach((_, k) => {
      ctx.strokeRect(PAD + COL_ROT + COL * k, y, COL, ALT_CAB);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`CUSTO ${inicio + k + 1}`, PAD + COL_ROT + COL * k + COL / 2, y + ALT_CAB / 2);
    });
    y += ALT_CAB;
    LINHAS.forEach(([rotulo, f], li) => {
      const h = alturas[bi][li];
      ctx.strokeStyle = '#BFBFBF';
      ctx.strokeRect(PAD, y, COL_ROT, h);
      ctx.fillStyle = li >= I_ACORDO ? BRONZE_ESC : '#111111';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${rotulo}:`, PAD + COL_ROT - 10, y + h / 2);
      b.forEach((x, k) => {
        const x0 = PAD + COL_ROT + COL * k;
        if (li === I_ACORDO || li === I_OBS) {
          ctx.fillStyle = li === I_ACORDO ? '#FFF2B3' : '#FAF6EE';
          ctx.fillRect(x0, y, COL, h);
        }
        ctx.strokeRect(x0, y, COL, h);
        ctx.fillStyle = '#111111';
        ctx.font = li === I_VALOR ? 'bold 13px Arial' : '13px Arial';
        ctx.textAlign = 'center';
        const linhas = quebrar(ctx, f(x), COL - 16, li === I_MOTIVO ? 5 : 3);
        const topo = y + h / 2 - ((linhas.length - 1) * LH) / 2;
        linhas.forEach((l, i) => ctx.fillText(l, x0 + COL / 2, topo + i * LH));
      });
      y += h;
    });
    y += 18;
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#888888';
  ctx.font = '11px Arial';
  ctx.fillText(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} — ${EMPRESA_REGULAMENTO.cidadeUF}`, PAD, y + 8);

  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error('Não consegui gerar a imagem.'))), 'image/png'));
}
