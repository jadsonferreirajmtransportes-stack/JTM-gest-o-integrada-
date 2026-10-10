// ============================================================================
// POPs — tipos e regras sem acesso ao banco (usados pelo PDF e pelas telas).
// ============================================================================

export type StatusPop = 'Rascunho' | 'Em revisão' | 'Em aprovação' | 'Vigente' | 'Obsoleto';

export interface EtapaPop {
  id: string;
  titulo: string;
  descricao: string;
  responsavel?: string;
}

export interface ConteudoPop {
  objetivo: string;
  aplicacao: string;
  referencias: string[];
  definicoes: { termo: string; definicao: string }[];
  responsabilidades: { funcao: string; atribuicao: string }[];
  materiais: string[];
  etapas: EtapaPop[];
  desvios: string;
  registros: { registro: string; responsavel: string; guarda: string }[];
  anexos: string[];
}

export interface Pop {
  id: string;
  codigo: string;
  versao: number;
  titulo: string;
  setor: string;
  classificacao: string;
  status: StatusPop;
  conteudo: ConteudoPop;
  motivoRevisao?: string;
  elaboradoPor?: string;
  elaboradoCargo?: string;
  elaboradoEm?: string;
  revisadoPor?: string;
  revisadoCargo?: string;
  revisadoEm?: string;
  aprovadoPor?: string;
  aprovadoCargo?: string;
  aprovadoEm?: string;
  vigenciaInicio?: string;
  proximaRevisao?: string;
  devolucaoObservacao?: string;
  devolvidoPor?: string;
  devolvidoEm?: string;
  criadoPor?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

/** Quem está agindo (nome e cargo vão pro quadro de aprovação do POP). */
export interface AssinantePop {
  nome: string;
  cargo: string;
}

export const novoIdPop = (prefixo = 'pop') => `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function conteudoEmBranco(): ConteudoPop {
  return {
    objetivo: '',
    aplicacao: '',
    referencias: [],
    definicoes: [],
    responsabilidades: [{ funcao: '', atribuicao: '' }],
    materiais: [],
    etapas: [{ id: novoIdPop('et'), titulo: '', descricao: '', responsavel: '' }],
    desvios: '',
    registros: [],
    anexos: [],
  };
}

export function normalizarConteudo(c: any): ConteudoPop {
  const base = conteudoEmBranco();
  return {
    objetivo: c?.objetivo ?? '',
    aplicacao: c?.aplicacao ?? '',
    referencias: Array.isArray(c?.referencias) ? c.referencias : [],
    definicoes: Array.isArray(c?.definicoes) ? c.definicoes : [],
    responsabilidades: Array.isArray(c?.responsabilidades) ? c.responsabilidades : base.responsabilidades,
    materiais: Array.isArray(c?.materiais) ? c.materiais : [],
    etapas: Array.isArray(c?.etapas) ? c.etapas.map((e: any) => ({ ...e, id: e.id || novoIdPop('et') })) : base.etapas,
    desvios: c?.desvios ?? '',
    registros: Array.isArray(c?.registros) ? c.registros : [],
    anexos: Array.isArray(c?.anexos) ? c.anexos : [],
  };
}

export const SITUACAO_ESTILO: Record<StatusPop, string> = {
  Rascunho: 'bg-slate-100 text-slate-600 border-slate-200',
  'Em revisão': 'bg-sky-50 text-sky-700 border-sky-200',
  'Em aprovação': 'bg-amber-50 text-[#92611F] border-amber-200',
  Vigente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Obsoleto: 'bg-white text-slate-400 border-slate-200',
};

/** Pendências pra mandar pra revisão (seções obrigatórias do modelo). */
export function verificarPop(p: Pop): string[] {
  const faltas: string[] = [];
  const c = p.conteudo;
  if (!p.titulo.trim()) faltas.push('Título do POP.');
  if (!c.objetivo.trim()) faltas.push('1 Objetivo.');
  if (!c.aplicacao.trim()) faltas.push('2 Campo de aplicação.');
  if (!c.responsabilidades.some((r) => r.funcao.trim() && r.atribuicao.trim())) faltas.push('Responsabilidades (pelo menos uma função com a atribuição).');
  if (!c.etapas.some((e) => e.descricao.trim())) faltas.push('Procedimento (pelo menos uma etapa descrita).');
  if (!p.elaboradoPor?.trim() || !p.elaboradoCargo?.trim()) faltas.push('Nome e cargo de quem elaborou.');
  if (p.versao > 1 && !p.motivoRevisao?.trim()) faltas.push('O que mudou nesta revisão (histórico de revisões).');
  return faltas;
}

export const somarAnos = (iso: string, anos: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + anos);
  return d.toISOString().slice(0, 10);
};
