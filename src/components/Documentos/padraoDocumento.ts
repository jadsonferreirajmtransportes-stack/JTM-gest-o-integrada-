// ============================================================================
// "Crivo" do padrão JMT: aponta o que falta ou está fora do padrão antes de
// gerar o documento, e corrige automaticamente o que é mecânico (espaços,
// pontuação, maiúsculas, blocos vazios, tabelas com colunas desiguais).
// Nunca muda o sentido do texto.
// ============================================================================

import type { BlocoDocumento, DocumentoPadronizado } from '../../utils/documentosPadronizadosApi';

export interface ProblemaPadrao {
  nivel: 'erro' | 'aviso';
  mensagem: string;
  blocoId?: string;
  corrigivel?: boolean;
}

const ehCaixaAlta = (t: string) => {
  const letras = t.replace(/[^\p{L}]/gu, '');
  return letras.length > 25 && letras === letras.toUpperCase();
};

export function verificarPadrao(d: DocumentoPadronizado): ProblemaPadrao[] {
  const p: ProblemaPadrao[] = [];
  if (!d.titulo.trim()) p.push({ nivel: 'erro', mensagem: 'O documento precisa de um título.' });
  if (d.blocos.length === 0) p.push({ nivel: 'erro', mensagem: 'O documento está sem conteúdo.' });
  if (!d.responsavel?.trim()) p.push({ nivel: 'aviso', mensagem: 'Informe o responsável (dono do documento).' });
  if (!d.dataDocumento) p.push({ nivel: 'aviso', mensagem: 'Informe a data do documento.' });
  if (!d.aprovadoPor?.trim()) p.push({ nivel: 'aviso', mensagem: 'Informe quem aprovou — obrigatório para publicar como Vigente.' });

  let ultimoNivel = 0;
  d.blocos.forEach((b) => {
    if (b.tipo === 'titulo') {
      if (!b.texto.trim()) p.push({ nivel: 'aviso', mensagem: 'Há um título vazio.', blocoId: b.id, corrigivel: true });
      if (b.nivel > ultimoNivel + 1) p.push({ nivel: 'aviso', mensagem: `"${b.texto.slice(0, 40)}" pula um nível de título (ex.: subtítulo sem título acima).`, blocoId: b.id });
      if (/[.;,]$/.test(b.texto.trim())) p.push({ nivel: 'aviso', mensagem: `Título com pontuação no final: "${b.texto.slice(0, 40)}".`, blocoId: b.id, corrigivel: true });
      ultimoNivel = b.nivel;
    } else if (b.tipo === 'paragrafo' || b.tipo === 'destaque') {
      const t = b.texto;
      if (!t.trim()) p.push({ nivel: 'aviso', mensagem: 'Há um parágrafo vazio.', blocoId: b.id, corrigivel: true });
      if (ehCaixaAlta(t)) p.push({ nivel: 'aviso', mensagem: `Texto todo em maiúsculas ("${t.slice(0, 40)}…") — no padrão JMT, maiúsculas só em títulos. Reescreva à mão (a correção automática não mexe para não estragar nomes próprios).`, blocoId: b.id });
      if (t.length > 1400) p.push({ nivel: 'aviso', mensagem: `Parágrafo muito longo (${t.length} caracteres) — divida em partes para facilitar a leitura.`, blocoId: b.id });
      if (/ {2,}| ,| \.|\s+$/.test(t) || /^\p{Ll}/u.test(t.trim())) p.push({ nivel: 'aviso', mensagem: `Espaços ou pontuação fora do padrão em "${t.slice(0, 40)}…".`, blocoId: b.id, corrigivel: true });
      if (/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2}\b(?!\d)/.test(t)) p.push({ nivel: 'aviso', mensagem: `Data fora do padrão dd/mm/aaaa em "${t.slice(0, 40)}…".`, blocoId: b.id, corrigivel: true });
    } else if (b.tipo === 'lista') {
      if (b.itens.some((i) => !i.trim())) p.push({ nivel: 'aviso', mensagem: 'Lista com item vazio.', blocoId: b.id, corrigivel: true });
    } else if (b.tipo === 'tabela') {
      if (b.cabecalho.every((c) => !c.trim())) p.push({ nivel: 'aviso', mensagem: 'Tabela sem cabeçalho — dê nome às colunas.', blocoId: b.id });
      if (b.linhas.length === 0) p.push({ nivel: 'aviso', mensagem: 'Tabela sem linhas.', blocoId: b.id });
      if (b.cabecalho.length > 8) p.push({ nivel: 'aviso', mensagem: `Tabela com ${b.cabecalho.length} colunas — no PDF/Word ela fica apertada; considere gerar em Excel.`, blocoId: b.id });
    }
  });
  return p;
}

const capitalizar = (t: string) => t.replace(/^(\s*)(\p{Ll})/u, (_, e, l) => e + l.toUpperCase());
const frase = (t: string) =>
  capitalizar(
    t
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([,;:])(?=\p{L})/gu, '$1 ')
      .trim()
  );
const datasPadrao = (t: string) =>
  t
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3/$2/$1')
    .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b(?!\d)/g, (_, d, m, a) => `${d.padStart(2, '0')}/${m.padStart(2, '0')}/20${a}`);

export function corrigirAutomaticamente(blocos: BlocoDocumento[]): BlocoDocumento[] {
  return blocos
    .map((b): BlocoDocumento | null => {
      if (b.tipo === 'titulo') {
        const texto = b.texto.replace(/\s+/g, ' ').replace(/[.;,]+$/, '').trim();
        return texto ? { ...b, texto } : null;
      }
      if (b.tipo === 'paragrafo' || b.tipo === 'destaque') {
        const texto = datasPadrao(frase(b.texto));
        return texto ? { ...b, texto } : null;
      }
      if (b.tipo === 'lista') {
        const itens = b.itens.map((i) => datasPadrao(frase(i))).filter(Boolean);
        return itens.length ? { ...b, itens } : null;
      }
      if (b.tipo === 'tabela') {
        const n = Math.max(b.cabecalho.length, ...b.linhas.map((l) => l.length), 1);
        const ajustar = (l: string[]) => Array.from({ length: n }, (_, i) => (l[i] ?? '').replace(/\s+/g, ' ').trim());
        const linhas = b.linhas.map(ajustar).filter((l) => l.some(Boolean));
        return { ...b, cabecalho: ajustar(b.cabecalho), linhas };
      }
      return b;
    })
    .filter((b): b is BlocoDocumento => b !== null);
}
