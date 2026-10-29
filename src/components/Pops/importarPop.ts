// ============================================================================
// Importar um POP de um arquivo (PDF, Word, Excel) — reaproveita a leitura da
// Padronização de Documentos (importarArquivo, que já reconhece títulos, listas,
// tabelas e checklists) e distribui o conteúdo nas seções do POP pelos títulos
// ("Objetivo", "Campo de aplicação", "Responsabilidades", "Procedimento"...).
// O que não se encaixa em nenhuma seção vai para o Procedimento, com aviso.
// ============================================================================

import { importarArquivo } from '../Documentos/importarDocumento';
import type { BlocoDocumento } from '../../utils/documentosPadronizadosApi';
import { ChecklistPop, ConteudoPop, EtapaPop, conteudoEmBranco, novoIdPop } from '../../utils/popsModelo';

type Secao = 'objetivo' | 'aplicacao' | 'referencias' | 'definicoes' | 'responsabilidades' | 'materiais' | 'procedimento' | 'desvios' | 'registros' | 'anexos' | 'checklists';

const SECOES: [Secao, RegExp][] = [
  ['objetivo', /^objetiv|^finalidade|^prop[óo]sito/],
  ['aplicacao', /aplica[çc][ãa]o|abrang[êe]ncia|^escopo|^campo de/],
  ['referencias', /refer[êe]ncia|normas?\b|legisla[çc][ãa]o|documentos? (de )?refer/],
  ['definicoes', /defini[çc]|termos|siglas|gloss[áa]rio/],
  ['responsabilidades', /responsabilidade|atribui[çc]/],
  ['materiais', /materia(l|is)|equipamento|\bepis?\b|recursos/],
  ['desvios', /desvio|a[çc][õo]es? corretiv|n[ãa]o conformidade|conting[êe]ncia|tratativa/],
  ['registros', /^registros?\b|formul[áa]rios?\b/],
  ['anexos', /^anexos?\b/],
  ['checklists', /check ?-?list|lista de verifica|verifica[çc][ãa]o/],
  ['procedimento', /procedimento|descri[çc][ãa]o|etapas?|passo a passo|execu[çc][ãa]o|atividades?|desenvolvimento|instru[çc]/],
];

const norm = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^\s*\d+(\.\d+)*[.)]?\s*/, '')
    .trim();
const secaoDoTitulo = (t: string): Secao | null => {
  const n = norm(t);
  // Testa sem acento também (os padrões têm os dois).
  const comAcento = t.toLowerCase().replace(/^\s*\d+(\.\d+)*[.)]?\s*/, '').trim();
  return SECOES.find(([, re]) => re.test(n) || re.test(comAcento))?.[0] ?? null;
};
const dividir = (t: string): [string, string] | null => {
  const m = t.match(/^(.{2,60}?)\s*(?::|–|—| - )\s*(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : null;
};
const linhasDoBloco = (b: BlocoDocumento): string[] => {
  if (b.tipo === 'paragrafo' || b.tipo === 'destaque') return [b.texto];
  if (b.tipo === 'lista') return b.itens.map((i) => `- ${i}`);
  if (b.tipo === 'tabela') return b.linhas.map((l) => `- ${l.map((v, i) => (b.cabecalho[i] ? `${b.cabecalho[i]}: ${v}` : v)).filter((x) => x && !/:\s*$/.test(x)).join('; ')}`);
  if (b.tipo === 'checklist') return b.itens.map((i) => `- ${i.texto}`);
  return [];
};

export interface PopImportado {
  titulo: string;
  conteudo: ConteudoPop;
  avisos: string[];
}

export async function importarPop(arquivo: File): Promise<PopImportado> {
  const lido = await importarArquivo(arquivo, { imagens: false });
  const c: ConteudoPop = { ...conteudoEmBranco(), responsabilidades: [], etapas: [] };
  const avisos: string[] = lido.avisos.filter((a) => !/imagens|imagem|checklist/i.test(a));
  let ultimoTitulo = '';
  let secao: Secao | null = null;
  let etapa: EtapaPop | null = null;
  let semSecao = 0;
  const textoDe = { objetivo: [] as string[], aplicacao: [] as string[], desvios: [] as string[] };

  const novaEtapa = (titulo: string) => {
    etapa = { id: novoIdPop('et'), titulo, descricao: '', responsavel: '' };
    c.etapas.push(etapa);
  };
  const noProcedimento = (linhas: string[]) => {
    if (!etapa) novaEtapa('');
    etapa!.descricao = [etapa!.descricao, ...linhas].filter(Boolean).join('\n');
  };

  for (const b of lido.blocos) {
    if (b.tipo === 'titulo') {
      ultimoTitulo = b.texto.replace(/^\s*\d+(\.\d+)*[.)]?\s*/, '');
      const s = secaoDoTitulo(b.texto);
      if (s && s !== 'checklists') {
        secao = s;
        etapa = null;
      } else if (s === 'checklists') {
        secao = 'checklists';
      } else if (secao === 'procedimento') {
        // Subtítulo dentro do Procedimento = uma etapa.
        novaEtapa(b.texto.replace(/^\s*\d+(\.\d+)*[.)]?\s*/, ''));
      }
      // Título fora de seção (ex.: o nome do POP no topo) é ignorado.
      continue;
    }
    if (b.tipo === 'checklist') {
      // Sem título próprio: usa o da seção de checklist ou o da etapa onde ele estava.
      const herdado = secao === 'checklists' ? ultimoTitulo : secao === 'procedimento' ? (etapa as EtapaPop | null)?.titulo || '' : '';
      const ck: ChecklistPop = { id: novoIdPop('ck'), titulo: b.titulo || herdado, itens: b.itens, opcoes: b.opcoes, comObservacao: b.comObservacao };
      c.checklists.push(ck);
      continue;
    }
    if (b.tipo === 'imagem' || b.tipo === 'assinaturas') continue;

    switch (secao) {
      case 'objetivo':
      case 'aplicacao':
      case 'desvios':
        textoDe[secao].push(...linhasDoBloco(b));
        break;
      case 'referencias':
      case 'materiais':
      case 'anexos':
        c[secao].push(...linhasDoBloco(b).map((l) => l.replace(/^- /, '')));
        break;
      case 'definicoes':
        if (b.tipo === 'tabela') b.linhas.forEach((l) => l[0] && c.definicoes.push({ termo: l[0], definicao: l.slice(1).filter(Boolean).join(' — ') }));
        else linhasDoBloco(b).forEach((l) => {
          const par = dividir(l.replace(/^- /, ''));
          c.definicoes.push(par ? { termo: par[0], definicao: par[1] } : { termo: '', definicao: l.replace(/^- /, '') });
        });
        break;
      case 'responsabilidades':
        if (b.tipo === 'tabela') b.linhas.forEach((l) => l[0] && c.responsabilidades.push({ funcao: l[0], atribuicao: l.slice(1).filter(Boolean).join(' — ') }));
        else linhasDoBloco(b).forEach((l) => {
          const par = dividir(l.replace(/^- /, ''));
          c.responsabilidades.push(par ? { funcao: par[0], atribuicao: par[1] } : { funcao: '', atribuicao: l.replace(/^- /, '') });
        });
        break;
      case 'registros':
        if (b.tipo === 'tabela') b.linhas.forEach((l) => l[0] && c.registros.push({ registro: l[0], responsavel: l[1] || '', guarda: l[2] || '' }));
        else linhasDoBloco(b).forEach((l) => c.registros.push({ registro: l.replace(/^- /, ''), responsavel: '', guarda: '' }));
        break;
      case 'checklists':
      case 'procedimento':
        // Lista numerada sem subtítulos: cada item vira uma etapa.
        if (b.tipo === 'lista' && b.ordenada && !etapa) b.itens.forEach((i) => c.etapas.push({ id: novoIdPop('et'), titulo: '', descricao: i, responsavel: '' }));
        else noProcedimento(linhasDoBloco(b));
        break;
      default:
        // Antes de qualquer título reconhecido: vira o objetivo se ainda estiver vazio.
        if (!textoDe.objetivo.length && (b.tipo === 'paragrafo' || b.tipo === 'destaque')) textoDe.objetivo.push(b.texto);
        else {
          semSecao += 1;
          noProcedimento(linhasDoBloco(b));
        }
    }
  }

  c.objetivo = textoDe.objetivo.join('\n');
  c.aplicacao = textoDe.aplicacao.join('\n');
  c.desvios = textoDe.desvios.join('\n');
  if (!c.responsabilidades.length) c.responsabilidades = [{ funcao: '', atribuicao: '' }];
  if (!c.etapas.length) c.etapas = [{ id: novoIdPop('et'), titulo: '', descricao: '', responsavel: '' }];

  if (semSecao) avisos.push(`${semSecao} trecho(s) sem título de seção foram para o Procedimento — confira.`);
  if (c.checklists.length) avisos.push(`${c.checklists.length} checklist(s) foram para "Listas de verificação".`);
  if (!c.objetivo) avisos.push('Não encontrei o Objetivo — preencha à mão.');
  return { titulo: lido.tituloSugerido, conteudo: c, avisos };
}
