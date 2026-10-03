// ============================================================================
// Documento (PDF/Word) ou texto colado → rascunho de treinamento, para revisar no
// editor antes de salvar. Mesmo formato dos "Treinamentos do sistema":
//   - cada título do documento (nível 1/2) vira um conteúdo do tipo texto;
//   - listas e tabelas viram texto organizado (• item / "Coluna: valor");
//   - imagens do Word entram como "Passo a passo com imagens" logo depois do
//     texto da parte em que aparecem (enviadas ao bucket público "treinamentos");
//   - PDF: opcionalmente o próprio arquivo entra como Material (PDF), para o
//     colaborador ver o visual original.
// Sem prova: perguntas são acrescentadas no editor, se quiser.
// ============================================================================

import type { BlocoDocumento } from '../../utils/documentosPadronizadosApi';
import { ConteudoTreinamento, TelaIlustrada, Treinamento, enviarMaterialTreinamento, gerarIdCurto } from '../../utils/educacaoApi';
import { importarArquivo } from '../Documentos/importarDocumento';
import { dataUrlParaBlob } from '../../utils/downloadUtils';

interface Parte {
  titulo: string;
  linhas: string[];
  imagens: { dataUrl: string; legenda: string }[];
}

export interface ResultadoImportacao {
  treinamento: Treinamento;
  avisos: string[];
}

const LIMITE_PARTE = 3500; // caracteres por conteúdo de texto

function blocoParaLinhas(b: BlocoDocumento): string[] {
  if (b.tipo === 'paragrafo') return [b.texto];
  if (b.tipo === 'destaque') return [`Atenção: ${b.texto}`];
  if (b.tipo === 'titulo') return [b.texto.toUpperCase()];
  if (b.tipo === 'lista') return [b.itens.map((i, k) => (b.ordenada ? `${k + 1}. ${i}` : `• ${i}`)).join('\n')];
  if (b.tipo === 'tabela') {
    const linhas = b.linhas.map((l) =>
      l
        .map((v, i) => (b.cabecalho[i]?.trim() ? `${b.cabecalho[i]}: ${v}` : v))
        .filter((x) => x.replace(/^[^:]*:\s*/, '').trim())
        .join(' · ')
    );
    return [linhas.map((l) => `• ${l}`).join('\n')];
  }
  return [];
}

/** Agrupa os blocos em partes pelos títulos de nível 1 e 2 (nível 3 fica no texto, em maiúsculas). */
function agruparEmPartes(blocos: BlocoDocumento[], imagensPorBloco: Map<number, { dataUrl: string; legenda: string }[]> = new Map()): Parte[] {
  const partes: Parte[] = [];
  let atual: Parte = { titulo: 'Introdução', linhas: [], imagens: [] };
  blocos.forEach((b, i) => {
    if (b.tipo === 'titulo' && b.nivel <= 2) {
      if (atual.linhas.length || atual.imagens.length) partes.push(atual);
      atual = { titulo: b.texto, linhas: [], imagens: [] };
    } else {
      atual.linhas.push(...blocoParaLinhas(b));
    }
    atual.imagens.push(...(imagensPorBloco.get(i) || []));
  });
  if (atual.linhas.length || atual.imagens.length) partes.push(atual);
  // Partes longas demais são divididas (leitura no celular).
  return partes.flatMap((p) => {
    const texto = p.linhas.join('\n\n');
    if (texto.length <= LIMITE_PARTE) return [p];
    const pedacos: string[][] = [[]];
    let tamanho = 0;
    p.linhas.forEach((l) => {
      if (tamanho + l.length > LIMITE_PARTE && pedacos[pedacos.length - 1].length) {
        pedacos.push([]);
        tamanho = 0;
      }
      pedacos[pedacos.length - 1].push(l);
      tamanho += l.length;
    });
    return pedacos.map((linhas, k) => ({ titulo: `${p.titulo} (${k + 1}/${pedacos.length})`, linhas, imagens: k === pedacos.length - 1 ? p.imagens : [] }));
  });
}

/** Texto colado → blocos. Reconhece "# Título", linhas curtas em maiúsculas ou terminadas em
 *  ":" como títulos, e "-", "•", "*", "1." como listas. */
export function textoParaBlocos(texto: string): BlocoDocumento[] {
  const blocos: BlocoDocumento[] = [];
  let paragrafo: string[] = [];
  const fechar = () => {
    if (paragrafo.length) blocos.push({ id: gerarIdCurto('b'), tipo: 'paragrafo', texto: paragrafo.join(' ').replace(/\s+/g, ' ').trim() });
    paragrafo = [];
  };
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    const l = bruta.trim();
    if (!l) {
      fechar();
      continue;
    }
    const md = l.match(/^(#{1,3})\s+(.+)$/);
    const lista = l.match(/^(?:[-•*–]|(\d{1,2})[.)])\s+(.+)$/);
    const caixaAlta = l.length <= 80 && l === l.toUpperCase() && /\p{Lu}{3}/u.test(l);
    const doisPontos = l.length <= 70 && /:$/.test(l) && !/[.;]/.test(l.slice(0, -1));
    if (md) {
      fechar();
      blocos.push({ id: gerarIdCurto('b'), tipo: 'titulo', nivel: Math.min(md[1].length, 3) as 1 | 2 | 3, texto: md[2].trim() });
    } else if (lista) {
      fechar();
      const ordenada = !!lista[1];
      const ultimo = blocos[blocos.length - 1];
      if (ultimo?.tipo === 'lista' && ultimo.ordenada === ordenada) ultimo.itens.push(lista[2].trim());
      else blocos.push({ id: gerarIdCurto('b'), tipo: 'lista', ordenada, itens: [lista[2].trim()] });
    } else if (caixaAlta || doisPontos) {
      fechar();
      blocos.push({ id: gerarIdCurto('b'), tipo: 'titulo', nivel: 2, texto: l.replace(/:$/, '') });
    } else {
      paragrafo.push(l);
    }
  }
  fechar();
  return blocos;
}

/** Word com imagens: lê pelo mammoth guardando a posição de cada imagem em relação aos blocos. */
async function lerDocxComImagens(arquivo: File): Promise<{ blocos: BlocoDocumento[]; imagens: Map<number, { dataUrl: string; legenda: string }[]> }> {
  const base = await importarArquivo(arquivo); // blocos já limpos (títulos, listas, tabelas)
  const mammoth = await import('mammoth');
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await arquivo.arrayBuffer() });
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const imagens = new Map<number, { dataUrl: string; legenda: string }[]>();
  // Para cada imagem, acha o bloco cujo texto vem logo antes dela no documento.
  const textos = base.blocos.map((b) => (b.tipo === 'lista' ? b.itens.join(' ') : b.tipo === 'tabela' ? b.cabecalho.join(' ') : b.texto).slice(0, 40).trim());
  let indiceAtual = -1;
  Array.from(doc.body.children).forEach((el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (t) {
      const achado = textos.findIndex((x, i) => i > indiceAtual && x && (t.startsWith(x.slice(0, 25)) || x.startsWith(t.slice(0, 25))));
      if (achado >= 0) indiceAtual = achado;
    }
    el.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (!src.startsWith('data:image')) return;
      const lista = imagens.get(Math.max(0, indiceAtual)) || [];
      lista.push({ dataUrl: src, legenda: (img.getAttribute('alt') || '').trim() });
      imagens.set(Math.max(0, indiceAtual), lista);
    });
  });
  return { blocos: base.blocos, imagens };
}

function estimarMinutos(partes: Parte[]): number {
  const palavras = partes.reduce((s, p) => s + p.linhas.join(' ').split(/\s+/).length, 0);
  const imagens = partes.reduce((s, p) => s + p.imagens.length, 0);
  const min = Math.ceil(palavras / 150) + imagens; // ~150 palavras/min + 1 min por imagem
  return Math.max(5, Math.ceil(min / 5) * 5);
}

export async function documentoParaTreinamento(
  origem: { arquivo: File; anexarPdf: boolean } | { texto: string },
  opcoes: { titulo: string; criadoPor?: string; aoProgredir?: (msg: string) => void }
): Promise<ResultadoImportacao> {
  const avisos: string[] = [];
  let blocos: BlocoDocumento[];
  let imagens = new Map<number, { dataUrl: string; legenda: string }[]>();
  let pdfUrl: string | undefined;

  if ('texto' in origem) {
    blocos = textoParaBlocos(origem.texto);
  } else {
    const nome = origem.arquivo.name.toLowerCase();
    opcoes.aoProgredir?.('Lendo o arquivo...');
    if (nome.endsWith('.docx')) {
      const r = await lerDocxComImagens(origem.arquivo);
      blocos = r.blocos;
      imagens = r.imagens;
    } else if (nome.endsWith('.pdf')) {
      const r = await importarArquivo(origem.arquivo);
      blocos = r.blocos;
      avisos.push(...r.avisos.filter((a) => !/padrão JMT coloca|transforme em tabela/.test(a)));
      avisos.push(origem.anexarPdf ? 'Em PDF, tabelas e colunas podem vir como texto corrido — confira no editor. O PDF original vai junto como material, com o visual original.' : 'Em PDF, tabelas e colunas podem vir como texto corrido — confira no editor.');
      if (origem.anexarPdf) {
        opcoes.aoProgredir?.('Enviando o PDF original...');
        pdfUrl = await enviarMaterialTreinamento(origem.arquivo);
      }
    } else {
      throw new Error('Use um arquivo PDF ou Word (.docx), ou cole o texto.');
    }
  }

  const partes = agruparEmPartes(blocos, imagens);
  if (partes.length === 0 && !pdfUrl) throw new Error('Não encontrei conteúdo para montar o treinamento.');

  // Envia as imagens do Word para o espaço público dos treinamentos.
  const totalImagens = partes.reduce((s, p) => s + p.imagens.length, 0);
  let enviadas = 0;
  const conteudos: ConteudoTreinamento[] = [];
  for (const p of partes) {
    if (p.linhas.length) conteudos.push({ id: gerarIdCurto('cont'), tipo: 'texto', titulo: p.titulo, texto: p.linhas.join('\n\n') });
    if (p.imagens.length) {
      const telas: TelaIlustrada[] = [];
      for (const [k, img] of p.imagens.entries()) {
        enviadas += 1;
        opcoes.aoProgredir?.(`Enviando imagem ${enviadas} de ${totalImagens}...`);
        try {
          const blob = dataUrlParaBlob(img.dataUrl);
          const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
          const url = await enviarMaterialTreinamento(new File([blob], `figura-${enviadas}.${ext}`, { type: blob.type }));
          telas.push({ titulo: img.legenda || `${p.titulo} — figura ${k + 1}`, imagem: url, marcas: [] });
        } catch (err) {
          console.error(err);
          avisos.push(`Uma imagem da parte "${p.titulo}" não pôde ser enviada.`);
        }
      }
      if (telas.length) conteudos.push({ id: gerarIdCurto('cont'), tipo: 'telas', titulo: `${p.titulo} — imagens`, telas });
    }
  }
  if (pdfUrl) conteudos.push({ id: gerarIdCurto('cont'), tipo: 'pdf', titulo: 'Material completo (PDF original)', url: pdfUrl });

  if (blocos.length && !blocos.some((b) => b.tipo === 'titulo')) avisos.push('O texto não tinha títulos — ficou numa parte só. Você pode dividir no editor.');

  return {
    treinamento: {
      id: '',
      titulo: opcoes.titulo.trim(),
      descricao: '',
      cargaHorariaMin: estimarMinutos(partes),
      conteudos,
      prova: { notaMinima: 70, perguntas: [] },
      obrigatorioTodos: false,
      obrigatorioCargos: [],
      obrigatorioSetores: [],
      validadeMeses: undefined,
      prazoDias: 15,
      ativo: true,
      criadoPor: opcoes.criadoPor,
    },
    avisos,
  };
}
