// ============================================================================
// Importar cronograma do Excel para a Agenda da Gestão. A planilha pode vir em qualquer
// formato "uma linha por compromisso": o cabeçalho é achado pelos nomes das colunas (Data,
// Título/Atividade, Horário, Responsável, Local, Categoria...), em qualquer aba e em
// qualquer posição. Datas e horas podem estar como data do Excel, número ou texto.
// ============================================================================

import type { AtividadeGestao, CategoriaAtividadeGestao } from '../../types';

export interface LinhaCronograma {
  /** Aba e linha na planilha — para o usuário achar o que não entrou. */
  origem: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  dataFim?: string;
  horaInicio?: string; // HH:mm
  horaFim?: string;
  responsavel?: string;
  participantes: string[];
  local?: string;
  categoria?: CategoriaAtividadeGestao;
  descricao?: string;
}

export interface ResultadoCronograma {
  linhas: LinhaCronograma[];
  /** Linhas com conteúdo mas sem data ou sem título reconhecível. */
  ignoradas: string[];
  /** Nomes das colunas reconhecidas (para mostrar ao usuário). */
  colunas: string[];
}

const norm = (t: unknown) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

type Campo = 'data' | 'dataFim' | 'titulo' | 'hora' | 'horaFim' | 'responsavel' | 'participantes' | 'local' | 'categoria' | 'descricao';

// Ordem importa: o primeiro campo que bater fica com a coluna.
const ALIASES: [Campo, RegExp][] = [
  ['dataFim', /^(DATA )?(FIM|FINAL|TERMINO|ATE|DATA FINAL|DATA DE TERMINO|DATA FIM)$/],
  ['data', /^(DATA|DIA|DATA INICIO|DATA DE INICIO|DATA INICIAL|INICIO|DATE|DATA PREVISTA|PREVISAO|QUANDO)$/],
  ['horaFim', /^(HORA FIM|HORA FINAL|HORARIO FINAL|HORA TERMINO|HORARIO TERMINO|FIM HORA)$/],
  ['hora', /^(HORA|HORARIO|HORA INICIO|HORARIO INICIO|HORA INICIAL|HORAS)$/],
  ['titulo', /^(TITULO|ATIVIDADE|ATIVIDADES|COMPROMISSO|EVENTO|ASSUNTO|TAREFA|ACAO|ACOES|O QUE|REUNIAO|PAUTA|TEMA|ITEM)$/],
  ['responsavel', /^(RESPONSAVEL|RESPONSAVEIS|QUEM|LIDER|DONO|RESP)$/],
  ['participantes', /^(PARTICIPANTES|ENVOLVIDOS|CONVIDADOS|EQUIPE|PUBLICO|PUBLICO ALVO)$/],
  ['local', /^(LOCAL|ONDE|SALA|ENDERECO|LINK)$/],
  ['categoria', /^(CATEGORIA|TIPO|AREA|SETOR|MODULO|CLASSIFICACAO)$/],
  ['descricao', /^(DESCRICAO|OBSERVACAO|OBSERVACOES|OBS|DETALHES|COMENTARIOS|NOTAS)$/],
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Data do Excel (Date, número serial) ou texto (dd/mm/aaaa, dd/mm, aaaa-mm-dd). */
export function lerData(v: unknown, anoPadrao = new Date().getFullYear()): string | undefined {
  if (v instanceof Date && !isNaN(v.getTime())) {
    // O xlsx entrega a data como meia-noite local menos alguns segundos às vezes: arredonda.
    return iso(new Date(v.getTime() + 60_000));
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000).toISOString().slice(0, 10);
  const t = String(v ?? '').trim();
  let m = t.match(/(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/);
  if (m && !/^\d{4}-/.test(t)) {
    const ano = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : anoPadrao;
    const mes = Number(m[2]);
    const dia = Number(m[1]);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return undefined;
}

const hhmm = (h: number, min: number) => `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

/** Hora do Excel (Date, fração do dia) ou texto ("8h", "08:30", "8h30"). */
export function lerHora(v: unknown): string | undefined {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const d = new Date(v.getTime() + 30_000);
    return hhmm(d.getHours(), d.getMinutes());
  }
  if (typeof v === 'number' && v >= 0 && v < 1) {
    const total = Math.round(v * 24 * 60);
    return hhmm(Math.floor(total / 60) % 24, total % 60);
  }
  const m = String(v ?? '').match(/(\d{1,2})\s*(?:[:hH]\s*(\d{2})?)/);
  if (m && Number(m[1]) < 24) return hhmm(Number(m[1]), Number(m[2] || 0));
  return undefined;
}

/** "08:00 - 10:00", "8h às 10h" → [início, fim]. */
function lerFaixaHora(v: unknown): [string | undefined, string | undefined] {
  if (typeof v !== 'string') return [lerHora(v), undefined];
  const partes = v.split(/\s*(?:-|–|—)\s*|\s+(?:as|às|a|ate|até)\s+/i).filter(Boolean);
  return [lerHora(partes[0]), partes[1] ? lerHora(partes[1]) : undefined];
}

/** Texto livre da coluna categoria/tipo (ou do título) → categoria da Agenda. */
export function adivinharCategoria(texto: string): CategoriaAtividadeGestao | undefined {
  const n = norm(texto);
  if (!n) return undefined;
  if (/AUDITORIA|RDC|ANVISA|INSPECAO|VIGILANCIA|SANITARI|QUALIDADE|MAPEAMENTO TERMICO|CALIBRA|QUALIFICACAO/.test(n)) return 'Auditoria & RDC 430';
  if (/TREINAMENTO|CAPACITA|CURSO|DDS|INTEGRACAO|PALESTRA|WORKSHOP|RECICLAGEM/.test(n)) return 'Treinamento & Capacitação';
  if (/FROTA|VEICULO|MANUTENCAO|OPERACAO|OPERACIONAL|ROTA|LOGISTIC|ARMAZEM|ENTREGA|COLETA/.test(n)) return 'Operação & Frota';
  if (/\bDP\b|PESSOAL|RH|FOLHA|FERIAS|ADMISS|DEMISS|COLABORADOR|EXAME|ASO|BENEFICIO|PONTO/.test(n)) return 'Gente & DP';
  if (/PROJETO|OKR|META|PLANEJAMENTO|ESTRATEGI|INDICADOR|KPI/.test(n)) return 'Projetos & OKRs';
  if (/CLIENTE|COMERCIAL|VENDA|PROPOSTA|CONTRATO|VISITA|NEGOCIA/.test(n)) return 'Comercial & Clientes';
  if (/REUNIAO|COMITE|GOVERNANCA|DIRETORIA|ASSEMBLEIA|CONSELHO|ALINHAMENTO/.test(n)) return 'Reunião & Governança';
  return undefined;
}

const texto = (v: unknown) => (v instanceof Date ? '' : String(v ?? '').replace(/\s+/g, ' ').trim());

/** Lê todas as abas que tiverem um cabeçalho com pelo menos Data + (Título/Atividade). */
export async function lerCronogramaExcel(arquivo: File): Promise<ResultadoCronograma> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true });
  const linhas: LinhaCronograma[] = [];
  const ignoradas: string[] = [];
  const colunas = new Set<string>();

  for (const nomeAba of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, defval: '', raw: true });
    // Cabeçalho: a linha (entre as 30 primeiras) que reconhece mais colunas e tem data + título.
    let iCab = -1;
    let mapa: Partial<Record<Campo, number>> = {};
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const m: Partial<Record<Campo, number>> = {};
      (rows[i] || []).forEach((c, j) => {
        const n = norm(c);
        const campo = ALIASES.find(([k, re]) => m[k] === undefined && re.test(n))?.[0];
        if (campo) m[campo] = j;
      });
      // Sem coluna "título" mas com "descrição": a descrição vira o título.
      if (m.titulo === undefined && m.descricao !== undefined) {
        m.titulo = m.descricao;
        delete m.descricao;
      }
      if (m.data !== undefined && m.titulo !== undefined && Object.keys(m).length > Object.keys(mapa).length) {
        iCab = i;
        mapa = m;
      }
    }
    if (iCab < 0) continue;
    (rows[iCab] || []).forEach((c, j) => {
      if (Object.values(mapa).includes(j)) colunas.add(texto(c));
    });

    let ultimaData: string | undefined; // célula de data mesclada vale para as linhas de baixo
    for (let i = iCab + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const pega = (k: Campo) => (mapa[k] !== undefined ? r[mapa[k] as number] : '');
      if (r.every((c) => texto(c) === '' && !(c instanceof Date) && typeof c !== 'number')) continue;
      const origem = `${nomeAba}, linha ${i + 1}`;
      const titulo = texto(pega('titulo'));
      const dataLida = lerData(pega('data'));
      const data = dataLida || (titulo && texto(pega('data')) === '' ? ultimaData : undefined);
      if (dataLida) ultimaData = dataLida;
      if (!titulo || !data) {
        if (titulo || texto(pega('data'))) ignoradas.push(origem);
        continue;
      }
      let [horaInicio, horaFim] = lerFaixaHora(pega('hora'));
      if (mapa.horaFim !== undefined) horaFim = lerHora(pega('horaFim')) || horaFim;
      // Coluna "data" com hora junto (data e hora do Excel na mesma célula).
      const brutoData = pega('data');
      if (!horaInicio && brutoData instanceof Date && (brutoData.getHours() || brutoData.getMinutes())) horaInicio = lerHora(brutoData);
      const dataFim = lerData(pega('dataFim'));
      const categoriaTexto = texto(pega('categoria'));
      linhas.push({
        origem,
        titulo,
        data,
        dataFim: dataFim && dataFim > data ? dataFim : undefined,
        horaInicio,
        horaFim,
        responsavel: texto(pega('responsavel')) || undefined,
        participantes: texto(pega('participantes'))
          .split(/[,;/]| e /)
          .map((p) => p.trim())
          .filter(Boolean),
        local: texto(pega('local')) || undefined,
        categoria: adivinharCategoria(categoriaTexto) || adivinharCategoria(titulo),
        descricao: texto(pega('descricao')) || undefined,
      });
    }
  }
  return { linhas, ignoradas, colunas: Array.from(colunas) };
}

/** Já existe na agenda um compromisso com a mesma data e o mesmo título? */
export const chaveCompromisso = (data: string, titulo: string) => `${data}|${norm(titulo)}`;

export function paraAtividade(l: LinhaCronograma, categoriaPadrao: CategoriaAtividadeGestao, i: number): AtividadeGestao {
  const diaInteiro = !l.horaInicio;
  const inicio = l.horaInicio || '08:00';
  const [h, m] = inicio.split(':').map(Number);
  const fimPadrao = hhmm(Math.min(23, h + 1), m);
  return {
    id: `ativ-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    titulo: l.titulo,
    descricao: l.descricao,
    categoria: l.categoria || categoriaPadrao,
    status: 'Agendada',
    prioridade: 'Média',
    data: l.data,
    dataFim: l.dataFim,
    horaInicio: inicio,
    horaFim: l.horaFim && l.horaFim > inicio ? l.horaFim : fimPadrao,
    diaInteiro,
    responsavel: l.responsavel || '',
    participantes: l.participantes,
    tipoLocal: l.local && /^https?:\/\//i.test(l.local) ? 'videoconferencia' : 'presencial',
    localOuLink: l.local || '',
    recorrencia: 'Nenhuma',
    criadoEm: new Date().toISOString(),
  };
}
