// ============================================================================
// Modelos de redação dos comunicados (decisão de 2026-10-02): quem cria o
// comunicado NÃO escreve texto livre — preenche os pontos-chave de cada
// categoria e o sistema redige o texto final no padrão JMT (saudação, frases,
// datas por extenso, encerramento). Para mudar o texto, muda-se os campos.
//
// Saída de cada modelo:
//   - titulo:       título do comunicado
//   - corpo:        texto completo (WhatsApp/e-mail/PDF/link), com {nome} e
//                   *negrito* do WhatsApp
//   - textoImagem:  resumo curto só com os pontos-chave (imagem do WhatsApp)
//   - destaque:     linha de destaque da imagem (data/local/prazo)
// Sem emoji: o PDF (fonte padrão) não desenha emoji.
// ============================================================================

import type { PublicoComunicado } from '../../utils/comunicadosApi';

export type TipoCampo = 'texto' | 'data' | 'hora' | 'lista' | 'opcoes' | 'sim_nao';

export interface CampoModelo {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio?: boolean;
  placeholder?: string;
  ajuda?: string;
  opcoes?: string[];
  /** Lista: quantos itens no máximo. */
  max?: number;
  /** Valor inicial (ex.: sim/não marcado). */
  padrao?: string | boolean | string[];
  /** Só aparece para este público. */
  somente?: PublicoComunicado;
}

export type ValoresModelo = Record<string, string | boolean | string[] | undefined>;

export interface ComunicadoMontado {
  titulo: string;
  corpo: string;
  textoImagem: string;
  destaque?: string;
  faltando: string[];
}

interface ModeloRedacao {
  publicos: PublicoComunicado[];
  descricao: string;
  campos: CampoModelo[];
  montar: (v: Ler, publico: PublicoComunicado) => Omit<ComunicadoMontado, 'faltando'>;
}

// ---------------------------------------------------------------------------
// Utilidades de redação
// ---------------------------------------------------------------------------
interface Ler {
  t: (chave: string) => string; // texto limpo, sem pontuação final
  lista: (chave: string) => string[];
  sim: (chave: string) => boolean;
}

const limpar = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/[.;,:!]+$/, '').trim();
const PALAVRAS_INICIO = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'nosso', 'nossa', 'nossos', 'nossas', 'seu', 'sua', 'este', 'esta', 'esse', 'essa',
  'haverá', 'será', 'serão', 'teremos', 'vamos', 'todos', 'todas', 'cada', 'no', 'na', 'nos', 'nas', 'em', 'de', 'do', 'da', 'para', 'pelo', 'pela',
  'agora', 'hoje', 'amanhã', 'durante', 'houve', 'ocorreu', 'foi', 'está', 'estão', 'temos', 'precisamos', 'bateu', 'bateram', 'completou', 'atingiu', 'atingimos',
]);
/** Primeira letra minúscula quando o trecho entra no meio da frase — só se a 1ª palavra for
 *  comum ("O horário…" → "o horário…"); nomes próprios e siglas ficam como estão. */
const meioDeFrase = (s: string) => {
  const primeira = s.split(/\s+/)[0] || '';
  const sigla = primeira.length > 1 && primeira === primeira.toUpperCase();
  return PALAVRAS_INICIO.has(primeira.toLowerCase()) && !sigla ? s.charAt(0).toLowerCase() + s.slice(1) : s;
};
const inicioDeFrase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataObj = (iso: string) => new Date(`${iso}T12:00:00`);
export const dataExtenso = (iso: string) => {
  const d = dataObj(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const diaCurto = (iso: string) => DIAS_CURTOS[dataObj(iso).getDay()];
/** "08:00" → "8h"; "13:30" → "13h30". */
export const horaFalada = (h: string) => {
  const [hh, mm] = h.split(':');
  return `${Number(hh)}h${mm && mm !== '00' ? mm : ''}`;
};
const marcadores = (itens: string[]) => itens.map((i) => `• ${inicioDeFrase(i)}`).join('\n');
const numerados = (itens: string[]) => itens.map((i, k) => `${k + 1}. ${inicioDeFrase(i)}`).join('\n');
const saudacao = (p: PublicoComunicado) => (p === 'clientes' ? 'Prezado(a) {nome},' : 'Olá, {nome}!');

// ---------------------------------------------------------------------------
// Modelos por categoria
// ---------------------------------------------------------------------------
export const MODELOS_REDACAO: Record<string, ModeloRedacao> = {
  Aviso: {
    publicos: ['colaboradores', 'clientes'],
    descricao: 'Mudança de rotina, horário, procedimento ou regra.',
    campos: [
      { chave: 'assunto', rotulo: 'Assunto (vira o título)', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: Novo horário de expedição' },
      { chave: 'oQue', rotulo: 'O que muda ou vai acontecer', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: o horário de saída da expedição passa a ser 6h30' },
      { chave: 'aPartirDe', rotulo: 'A partir de quando', tipo: 'data' },
      { chave: 'quem', rotulo: 'Para quem vale', tipo: 'texto', placeholder: 'Ex.: motoristas e ajudantes do Farma Rodoviário' },
      { chave: 'acao', rotulo: 'O que a pessoa precisa fazer', tipo: 'texto', placeholder: 'Ex.: chegar 10 minutos antes e conferir o checklist do veículo' },
      { chave: 'motivo', rotulo: 'Motivo (opcional)', tipo: 'texto', placeholder: 'Ex.: aumento das coletas no período da manhã' },
      { chave: 'duvidas', rotulo: 'Dúvidas com', tipo: 'texto', placeholder: 'Ex.: o seu supervisor', padrao: '' },
    ],
    montar: (v, p) => {
      const data = v.t('aPartirDe');
      const oQue = meioDeFrase(v.t('oQue'));
      const partes = [saudacao(p), `Informamos que${data ? `, a partir de *${dataExtenso(data)}*,` : ''} ${oQue}.`];
      if (v.t('quem')) partes.push(`Este aviso vale para: *${v.t('quem')}*.`);
      if (v.t('motivo')) partes.push(`Motivo: ${inicioDeFrase(v.t('motivo'))}.`);
      if (v.t('acao')) partes.push(`*${p === 'clientes' ? 'Próximos passos' : 'O que você precisa fazer'}:* ${inicioDeFrase(v.t('acao'))}.`);
      const duvidas = v.t('duvidas') || (p === 'clientes' ? 'a nossa equipe comercial' : 'o seu supervisor ou o Departamento Pessoal');
      partes.push(`Em caso de dúvidas, fale com ${meioDeFrase(duvidas)}.`);
      partes.push(p === 'clientes' ? 'Agradecemos a parceria.' : 'Contamos com a colaboração de todos.');
      return {
        titulo: inicioDeFrase(v.t('assunto')),
        corpo: partes.join('\n\n'),
        textoImagem: [`${inicioDeFrase(v.t('oQue'))}.`, v.t('acao') ? `${inicioDeFrase(v.t('acao'))}.` : ''].filter(Boolean).join('\n\n'),
        destaque: data ? `A partir de ${diaCurto(data)}, ${dataCurta(data)}${v.t('quem') ? ` — ${v.t('quem')}` : ''}` : undefined,
      };
    },
  },

  Informativo: {
    publicos: ['colaboradores', 'clientes'],
    descricao: 'Informação geral, sem mudança de regra.',
    campos: [
      { chave: 'assunto', rotulo: 'Assunto (vira o título)', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: Calendário de pagamentos de outubro' },
      { chave: 'informacao', rotulo: 'Informação principal', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: o pagamento de outubro será feito no 5º dia útil, dia 7' },
      { chave: 'pontos', rotulo: 'Detalhes importantes', tipo: 'lista', max: 5, placeholder: 'Ex.: o vale-alimentação cai no mesmo dia' },
      { chave: 'saibaMais', rotulo: 'Para mais informações, falar com', tipo: 'texto', placeholder: 'Ex.: o Departamento Pessoal' },
    ],
    montar: (v, p) => {
      const pontos = v.lista('pontos');
      const partes = [saudacao(p), `Gostaríamos de informar que ${meioDeFrase(v.t('informacao'))}.`];
      if (pontos.length) partes.push(`*Pontos importantes:*\n${marcadores(pontos)}`);
      if (v.t('saibaMais')) partes.push(`Para mais informações, fale com ${meioDeFrase(v.t('saibaMais'))}.`);
      partes.push(p === 'clientes' ? 'Agradecemos a atenção e a parceria.' : 'Obrigado pela atenção.');
      return {
        titulo: inicioDeFrase(v.t('assunto')),
        corpo: partes.join('\n\n'),
        textoImagem: [`${inicioDeFrase(v.t('informacao'))}.`, pontos.length ? marcadores(pontos) : ''].filter(Boolean).join('\n\n'),
      };
    },
  },

  Urgente: {
    publicos: ['colaboradores', 'clientes'],
    descricao: 'Situação que exige ação imediata.',
    campos: [
      { chave: 'assunto', rotulo: 'Assunto (vira o título)', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: Interdição da BR-101 no trecho de Parnamirim' },
      { chave: 'situacao', rotulo: 'O que aconteceu', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: a BR-101 está interditada nos dois sentidos por causa de um acidente' },
      { chave: 'acao', rotulo: 'O que precisa ser feito', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: usar a rota alternativa pela RN-063 e avisar o supervisor ao sair' },
      { chave: 'prazo', rotulo: 'Prazo (data)', tipo: 'data' },
      { chave: 'prazoHora', rotulo: 'Prazo (horário)', tipo: 'hora' },
      { chave: 'contato', rotulo: 'Quem procurar', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: o supervisor de plantão, Fulano — (84) 99999-9999' },
    ],
    montar: (v, p) => {
      const prazo = v.t('prazo');
      const hora = v.t('prazoHora');
      const quando = prazo ? ` até *${hora ? `${horaFalada(hora)} de ` : ''}${dataExtenso(prazo)}*` : hora ? ` até *${horaFalada(hora)} de hoje*` : '';
      const partes = [
        saudacao(p),
        '*Comunicado urgente.*',
        `${inicioDeFrase(v.t('situacao'))}.`,
        `*O que fazer:* ${inicioDeFrase(v.t('acao'))}${quando}.`,
        `Em caso de dúvida, procure imediatamente ${meioDeFrase(v.t('contato'))}.`,
      ];
      return {
        titulo: inicioDeFrase(v.t('assunto')),
        corpo: partes.join('\n\n'),
        textoImagem: `${inicioDeFrase(v.t('situacao'))}.\n\n${inicioDeFrase(v.t('acao'))}.`,
        destaque: prazo || hora ? `Prazo: ${prazo ? `${diaCurto(prazo)}, ${dataCurta(prazo)}` : 'hoje'}${hora ? ` às ${horaFalada(hora)}` : ''}` : undefined,
      };
    },
  },

  Segurança: {
    publicos: ['colaboradores'],
    descricao: 'Regras de segurança, EPI, trânsito, boas práticas.',
    campos: [
      { chave: 'tema', rotulo: 'Tema (vira o título)', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: Uso obrigatório de bota e luva no galpão' },
      { chave: 'risco', rotulo: 'Risco ou situação observada', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: foram vistos colaboradores carregando volumes sem luva' },
      { chave: 'regras', rotulo: 'Regras que todos devem seguir', tipo: 'lista', obrigatorio: true, max: 6, placeholder: 'Ex.: usar luva em toda carga e descarga' },
      {
        chave: 'norma',
        rotulo: 'Base da regra (opcional)',
        tipo: 'opcoes',
        opcoes: ['', 'a NR-6 (Equipamentos de Proteção Individual)', 'o Código de Trânsito Brasileiro', 'a RDC 430/2020 da ANVISA', 'o Regulamento Interno da JMT', 'o art. 158 da CLT'],
      },
      { chave: 'disciplinar', rotulo: 'Lembrar que o descumprimento pode gerar medida disciplinar', tipo: 'sim_nao', padrao: true },
    ],
    montar: (v) => {
      const regras = v.lista('regras');
      const partes = ['Olá, {nome}!', `A sua segurança vem em primeiro lugar. ${inicioDeFrase(v.t('risco'))}.`];
      if (regras.length) partes.push(`*Regras que todos devem seguir:*\n${numerados(regras)}`);
      const fechamento = [v.t('norma') ? `Essas regras seguem ${v.t('norma')}.` : '', v.sim('disciplinar') ? 'O descumprimento pode resultar em medida disciplinar, conforme o Regulamento Interno.' : '']
        .filter(Boolean)
        .join(' ');
      if (fechamento) partes.push(fechamento);
      partes.push('Cuide de você e dos seus colegas.');
      return {
        titulo: inicioDeFrase(v.t('tema')),
        corpo: partes.join('\n\n'),
        textoImagem: regras.length ? numerados(regras) : `${inicioDeFrase(v.t('risco'))}.`,
      };
    },
  },

  Parabéns: {
    publicos: ['colaboradores'],
    descricao: 'Reconhecimento, metas, tempo de casa, aniversário.',
    campos: [
      { chave: 'motivo', rotulo: 'Motivo', tipo: 'opcoes', obrigatorio: true, opcoes: ['Meta atingida', 'Reconhecimento', 'Tempo de casa', 'Aniversário', 'Outro'], padrao: 'Meta atingida' },
      { chave: 'homenageado', rotulo: 'Quem está sendo parabenizado', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: equipe do Farma Aéreo' },
      { chave: 'conquista', rotulo: 'O que foi conquistado', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: 100% das entregas no prazo em setembro' },
    ],
    montar: (v) => {
      const motivo = v.t('motivo');
      const fecho: Record<string, string> = {
        'Meta atingida': 'Esse resultado mostra o compromisso de cada um com o nosso propósito: levar saúde com segurança, do remetente ao destino final.',
        'Tempo de casa': 'Obrigado pela dedicação e por fazer parte da nossa história.',
        Aniversário: 'Desejamos muita saúde, alegria e conquistas!',
        Reconhecimento: 'Obrigado pelo empenho e pelo exemplo!',
        Outro: 'Obrigado pelo empenho e pelo exemplo!',
      };
      const conquista = meioDeFrase(v.t('conquista'));
      return {
        titulo: `Parabéns, ${v.t('homenageado')}!`,
        corpo: ['Olá, {nome}!', `*Parabéns, ${v.t('homenageado')}!*`, `É com muita alegria que reconhecemos esta conquista: ${conquista}.`, fecho[motivo] || fecho.Outro].join('\n\n'),
        textoImagem: `${inicioDeFrase(v.t('conquista'))}.\n\n${fecho[motivo] || fecho.Outro}`,
      };
    },
  },

  Evento: {
    publicos: ['colaboradores', 'clientes'],
    descricao: 'Reunião, treinamento, confraternização, visita.',
    campos: [
      { chave: 'nome', rotulo: 'Nome do evento (vira o título)', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: Treinamento de Boas Práticas RDC 430' },
      { chave: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true },
      { chave: 'hora', rotulo: 'Horário de início', tipo: 'hora', obrigatorio: true },
      { chave: 'horaFim', rotulo: 'Horário de término (opcional)', tipo: 'hora' },
      { chave: 'local', rotulo: 'Local', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: sala de reunião da base Parnamirim' },
      { chave: 'publicoAlvo', rotulo: 'Quem deve participar', tipo: 'texto', placeholder: 'Ex.: motoristas e ajudantes dos dois turnos' },
      { chave: 'pauta', rotulo: 'Programação', tipo: 'lista', max: 6, placeholder: 'Ex.: cadeia fria e controle de temperatura' },
      { chave: 'levar', rotulo: 'O que levar ou preparar', tipo: 'texto', placeholder: 'Ex.: crachá e caneta' },
      { chave: 'obrigatorio', rotulo: 'Participação obrigatória', tipo: 'sim_nao', padrao: false },
      { chave: 'confirmarAte', rotulo: 'Confirmar presença até (opcional)', tipo: 'data' },
    ],
    montar: (v, p) => {
      const data = v.t('data');
      const hora = v.t('hora');
      const fim = v.t('horaFim');
      const pauta = v.lista('pauta');
      const partes = [
        saudacao(p),
        `Convidamos você para *${v.t('nome')}*${v.t('publicoAlvo') ? `, destinado a ${meioDeFrase(v.t('publicoAlvo'))}` : ''}.`,
        [
          data ? `*Data:* ${dataExtenso(data)}` : '',
          hora ? `*Horário:* ${horaFalada(hora)}${fim ? ` às ${horaFalada(fim)}` : ''}` : '',
          v.t('local') ? `*Local:* ${inicioDeFrase(v.t('local'))}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      ];
      if (pauta.length) partes.push(`*Programação:*\n${marcadores(pauta)}`);
      if (v.t('levar')) partes.push(`*Leve ou prepare:* ${inicioDeFrase(v.t('levar'))}.`);
      if (v.sim('obrigatorio')) partes.push('*A participação é obrigatória.*');
      if (v.t('confirmarAte')) partes.push(`Confirme a sua presença até ${dataCurta(v.t('confirmarAte'))}.`);
      partes.push(p === 'clientes' ? 'Será um prazer recebê-lo(a).' : 'Contamos com a sua presença!');
      return {
        titulo: inicioDeFrase(v.t('nome')),
        corpo: partes.join('\n\n'),
        textoImagem: [pauta.length ? marcadores(pauta) : '', v.sim('obrigatorio') ? 'Participação obrigatória.' : '', v.t('levar') ? `Leve: ${meioDeFrase(v.t('levar'))}.` : '']
          .filter(Boolean)
          .join('\n\n'),
        destaque: data ? `${diaCurto(data)}, ${dataCurta(data)}${hora ? ` às ${horaFalada(hora)}` : ''}${v.t('local') ? ` — ${v.t('local')}` : ''}` : undefined,
      };
    },
  },

  Comercial: {
    publicos: ['clientes'],
    descricao: 'Mudança no serviço para os clientes (horários, coleta, tabela, procedimento).',
    campos: [
      { chave: 'assunto', rotulo: 'Assunto (vira o título)', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: Novo horário de coleta' },
      { chave: 'oQue', rotulo: 'O que muda', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: as coletas passam a ser feitas das 14h às 17h' },
      { chave: 'aPartirDe', rotulo: 'A partir de quando', tipo: 'data', obrigatorio: true },
      { chave: 'impacto', rotulo: 'Próximos passos para o cliente', tipo: 'texto', placeholder: 'Ex.: deixar as cargas separadas até as 13h30' },
      { chave: 'motivo', rotulo: 'Motivo (opcional)', tipo: 'texto', placeholder: 'Ex.: ampliação da nossa malha de entregas' },
      { chave: 'contato', rotulo: 'Contato comercial', tipo: 'texto', obrigatorio: true, placeholder: 'Ex.: Fulano — (84) 99999-9999' },
    ],
    montar: (v) => {
      const data = v.t('aPartirDe');
      const partes = ['Prezado(a) {nome},', `A JM Transportes informa que${data ? `, a partir de *${dataExtenso(data)}*,` : ''} ${meioDeFrase(v.t('oQue'))}.`];
      if (v.t('motivo')) partes.push(`Motivo: ${inicioDeFrase(v.t('motivo'))}.`);
      if (v.t('impacto')) partes.push(`*Próximos passos:* ${inicioDeFrase(v.t('impacto'))}.`);
      partes.push(`Nossa equipe está à disposição para esclarecer qualquer dúvida: ${v.t('contato')}.`);
      partes.push('Agradecemos a confiança e a parceria.');
      return {
        titulo: inicioDeFrase(v.t('assunto')),
        corpo: partes.join('\n\n'),
        textoImagem: [`${inicioDeFrase(v.t('oQue'))}.`, v.t('impacto') ? `${inicioDeFrase(v.t('impacto'))}.` : ''].filter(Boolean).join('\n\n'),
        destaque: data ? `A partir de ${diaCurto(data)}, ${dataCurta(data)}` : undefined,
      };
    },
  },
};

export function categoriasPara(publico: PublicoComunicado): string[] {
  return Object.keys(MODELOS_REDACAO).filter((c) => MODELOS_REDACAO[c].publicos.includes(publico));
}

export function camposDe(categoria: string, publico: PublicoComunicado): CampoModelo[] {
  return (MODELOS_REDACAO[categoria]?.campos || []).filter((c) => !c.somente || c.somente === publico);
}

export function valoresIniciais(categoria: string, publico: PublicoComunicado): ValoresModelo {
  const v: ValoresModelo = {};
  camposDe(categoria, publico).forEach((c) => {
    if (c.padrao !== undefined) v[c.chave] = c.padrao;
    else if (c.tipo === 'lista') v[c.chave] = [''];
  });
  return v;
}

/** Monta o comunicado a partir dos campos. `faltando` = rótulos obrigatórios em branco. */
export function montarComunicado(categoria: string, publico: PublicoComunicado, valores: ValoresModelo): ComunicadoMontado {
  const modelo = MODELOS_REDACAO[categoria];
  const campos = camposDe(categoria, publico);
  const ler: Ler = {
    t: (k) => {
      const valor = valores[k];
      return typeof valor === 'string' ? limpar(valor) : '';
    },
    lista: (k) => {
      const valor = valores[k];
      return Array.isArray(valor) ? valor.map(limpar).filter(Boolean) : [];
    },
    sim: (k) => valores[k] === true,
  };
  const faltando = campos
    .filter((c) => c.obrigatorio && (c.tipo === 'lista' ? ler.lista(c.chave).length === 0 : c.tipo === 'sim_nao' ? false : !ler.t(c.chave)))
    .map((c) => c.rotulo.replace(/\s*\(.*\)$/, ''));
  if (!modelo) return { titulo: '', corpo: '', textoImagem: '', faltando: ['Categoria'] };
  return { ...modelo.montar(ler, publico), faltando };
}
