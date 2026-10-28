// Gera o documento "Boas-vindas à JMT" (Word) com os Norteadores Estratégicos e o Regulamento
// Interno vigente — texto oficial, sem alteração. Uso: npx tsx ferramentas/gerar-boas-vindas.tsx <saida.docx>
import fs from 'node:fs';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { STRATEGIC_GUIDELINES as N } from '../src/data/strategicGuidelines';
import { EMPRESA_REGULAMENTO, ROTULO_VERSAO_REGULAMENTO, SECOES_REGULAMENTO } from '../src/data/regulamentoInterno';
import { JMT_LOGO_BASE64 } from '../src/data/jmtLogoBase64';

const FONTE = 'Arial';
const BRONZE = 'C48229';
const ESCURO = '111111';
const CORPO = '333333';
const saida = process.argv[2] || 'Boas-vindas JMT.docx';

const run = (text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text, font: FONTE, size: o.size ?? 22, bold: o.bold, italics: o.italics, color: o.color ?? CORPO });
const p = (texto: string, o: { after?: number; italics?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new Paragraph({ spacing: { after: o.after ?? 140, line: 300 }, alignment: o.align ?? AlignmentType.JUSTIFIED, children: [run(texto, { italics: o.italics })] });
const h1 = (texto: string) =>
  new Paragraph({
    heading: 'Heading1',
    pageBreakBefore: false,
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRONZE, space: 4 } },
    children: [run(texto.toUpperCase(), { bold: true, size: 28, color: ESCURO })],
  });
const h2 = (texto: string) => new Paragraph({ heading: 'Heading2', spacing: { before: 220, after: 100 }, children: [run(texto, { bold: true, size: 24, color: ESCURO })] });
const destaque = (texto: string) =>
  new Paragraph({
    spacing: { before: 80, after: 200 },
    indent: { left: 240 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: BRONZE, space: 10 } },
    shading: { fill: 'FBF6EE', type: ShadingType.CLEAR, color: 'auto' },
    children: [run(texto, { italics: true, size: 24, color: ESCURO })],
  });
const item = (texto: string, ref = 'marcadores') =>
  new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80 }, children: [run(texto)] });
const borda = { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' };
const tabela = (cab: string[], linhas: string[][]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [cab, ...linhas].map(
      (l, i) =>
        new TableRow({
          tableHeader: i === 0,
          children: l.map(
            (c) =>
              new TableCell({
                borders: { top: borda, bottom: borda, left: borda, right: borda },
                shading: i === 0 ? { fill: 'F8F0E4', type: ShadingType.CLEAR, color: 'auto' } : undefined,
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new Paragraph({ children: [run(c, { bold: i === 0, size: 19 })] })],
              })
          ),
        })
    ),
  });

const logo = Uint8Array.from(Buffer.from(JMT_LOGO_BASE64.split(',')[1], 'base64'));
const filhos: (Paragraph | Table)[] = [];

// ---- Capa / abertura ----
filhos.push(
  new Paragraph({ spacing: { after: 300 }, children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 200, height: 75 } })] }),
  new Paragraph({ spacing: { after: 80 }, children: [run('TREINAMENTO DE INTEGRAÇÃO', { bold: true, size: 20, color: BRONZE })] }),
  new Paragraph({ spacing: { after: 200 }, children: [run('Boas-vindas à JMT', { bold: true, size: 52, color: ESCURO })] }),
  p(
    `Seja muito bem-vindo(a) à ${EMPRESA_REGULAMENTO.razaoSocial}! A partir de hoje você faz parte de uma equipe que leva saúde com segurança a muita gente. Este material apresenta quem somos, aonde queremos chegar, os valores que guiam o nosso trabalho e as regras do nosso dia a dia.`
  ),
  p('Leia com atenção. Se ficar com qualquer dúvida, fale com o seu supervisor ou com o Departamento Pessoal — perguntar é sempre melhor do que adivinhar.'),
  destaque(N.sloganCurto)
);

// ---- Parte 1: Norteadores ----
filhos.push(h1('Parte 1 — Nossos norteadores'));
filhos.push(p('Os Norteadores Estratégicos explicam por que a JMT existe, o que fazemos hoje, aonde queremos chegar e como queremos agir. Eles orientam as decisões da empresa e o trabalho de cada um de nós.'));
filhos.push(h2(`${N.proposito.titulo} — ${N.proposito.subtitulo.toLowerCase()}`), destaque(N.proposito.frase));
filhos.push(h2(`${N.missao.titulo} — ${N.missao.subtitulo.toLowerCase()}`), destaque(N.missao.frase));
filhos.push(h2(`${N.visao.titulo} — ${N.visao.subtitulo.toLowerCase()}`), destaque(N.visao.frase));
filhos.push(h2('Nossos valores'));
N.valores.forEach((v, i) => {
  filhos.push(new Paragraph({ spacing: { before: 100, after: 40 }, children: [run(`${i + 1}. ${v.nome}`, { bold: true, color: ESCURO })] }), p(v.descricao, { after: 100 }));
});
filhos.push(h2('Nossos 4 pilares operacionais'));
N.pilaresOperacionais.forEach((pl) => filhos.push(new Paragraph({ numbering: { reference: 'marcadores', level: 0 }, spacing: { after: 80 }, children: [run(`${pl.nome}: `, { bold: true, color: ESCURO }), run(pl.descricao)] })));

// ---- Parte 2: Regulamento ----
filhos.push(h1('Parte 2 — Regulamento Interno'));
filhos.push(p(`Texto vigente do Regulamento Interno (${ROTULO_VERSAO_REGULAMENTO}). A via oficial para assinatura é enviada ao seu link pessoal, em Documentos.`, { italics: true }));
SECOES_REGULAMENTO.forEach((s, i) => {
  filhos.push(h2(`${i + 1}. ${s.titulo}`));
  let lista = 0;
  s.blocos.forEach((b) => {
    if (b.tipo === 'p') filhos.push(p(b.texto));
    else if (b.tipo === 'sub') filhos.push(new Paragraph({ spacing: { before: 120, after: 80 }, children: [run(b.texto, { bold: true, color: ESCURO })] }));
    else if (b.tipo === 'nota') filhos.push(destaque(b.texto));
    else if (b.tipo === 'lista') {
      lista += 1;
      b.itens.forEach((it) => filhos.push(item(it)));
    } else if (b.tipo === 'tabela') {
      filhos.push(tabela(b.cabecalho, b.linhas), new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
  });
});

// ---- Encerramento ----
filhos.push(h1('Para fechar'));
filhos.push(
  p('Agora você conhece os nossos norteadores e as regras do dia a dia. No seu link pessoal você encontra o Regulamento Interno para assinar, os treinamentos, os comunicados, o ponto e o Fale com o DP.'),
  destaque('Conte com a gente — e bem-vindo(a) à equipe JMT!')
);

const documento = new Document({
  creator: EMPRESA_REGULAMENTO.razaoSocial,
  title: 'Boas-vindas à JMT — Norteadores e Regulamento Interno',
  styles: { default: { document: { run: { font: FONTE } } } },
  numbering: {
    config: [{ reference: 'marcadores', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 260 } } } }] }],
  },
  sections: [
    {
      properties: { page: { margin: { top: 1300, bottom: 1100, left: 1300, right: 1300 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('Boas-vindas à JMT · Treinamento de integração', { size: 16, color: BRONZE })] })] }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(`${EMPRESA_REGULAMENTO.razaoSocial} — CNPJ ${EMPRESA_REGULAMENTO.cnpj} · Página `, { size: 15, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], font: FONTE, size: 15, color: '888888' })],
            }),
          ],
        }),
      },
      children: filhos,
    },
  ],
});

fs.writeFileSync(saida, await Packer.toBuffer(documento));
console.log('gerado', saida);
