// ============================================================================
// Gamificação do desempenho — regras de pontuação (sem acesso ao banco; usada
// pelo portal do colaborador e pela tela do DP, pra os dois sempre baterem).
//
// Por mês:
//   • Pontualidade: +2 por dia de trabalho com o ponto dentro da tolerância.
//   • Assiduidade: +30 no mês fechado sem nenhuma falta injustificada.
//     Atestado, abono, folga e férias são NEUTROS — nunca tiram pontos.
//   • Treinamento concluído: +20.
//   • Documento assinado em até 3 dias: +5.
//   • Ciência de comunicado em até 3 dias: +3.
//   • Reconhecimento lançado pelo DP: os pontos definidos no lançamento.
// O nível (Bronze → Diamante) soma todos os meses desde o início do programa.
// ============================================================================

import type { DiaEspelho } from '../components/Frequencia/frequenciaCalc';

export const INICIO_GAMIFICACAO = '2026-10';
export const PONTOS = { diaPontual: 2, mesSemFalta: 30, treinamento: 20, documentoEmDia: 5, cienciaEmDia: 3 };
const PRAZO_DIAS = 3;

export const NIVEIS = [
  { nome: 'Bronze', minimo: 0, cor: '#B87333', fundo: '#F6E7DA' },
  { nome: 'Prata', minimo: 300, cor: '#7C8A99', fundo: '#EEF1F4' },
  { nome: 'Ouro', minimo: 800, cor: '#C48229', fundo: '#FBF0DC' },
  { nome: 'Diamante', minimo: 1500, cor: '#2E7FB8', fundo: '#E3F1FA' },
];

export interface EntradaGamificacao {
  /** Espelho do mês (sem o colaborador usar o ponto pelo celular: undefined). */
  espelho?: DiaEspelho[];
  treinamentos: { concluidoEm?: string | null }[];
  documentos: { criadoEm: string; assinadoEm?: string | null }[];
  comunicados: { criadoEm: string; exigeCiencia: boolean; cienteEm?: string | null }[];
  reconhecimentos: { data: string; pontos: number; motivo: string }[];
}

export interface ItemPontos {
  chave: 'pontualidade' | 'assiduidade' | 'treinamentos' | 'documentos' | 'ciencias' | 'reconhecimentos';
  rotulo: string;
  quantidade: number;
  pontos: number;
  detalhe?: string;
}

export interface ResultadoMes {
  periodo: string;
  pontos: number;
  itens: ItemPontos[];
  /** Dias de trabalho previstos (só quem usa o ponto pelo celular). */
  diasPrevistos: number;
  diasPontuais: number;
  faltas: number;
  mesFechado: boolean;
}

const mesDe = (iso?: string | null) => (iso ? new Date(Date.parse(iso) - 3 * 3600 * 1000).toISOString().slice(0, 7) : '');
const dias = (de: string, ate: string) => (Date.parse(ate) - Date.parse(de)) / 86400000;
export const mesAtualLocal = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 7);

export function calcularMes(periodo: string, e: EntradaGamificacao): ResultadoMes {
  const mesFechado = periodo < mesAtualLocal();
  const itens: ItemPontos[] = [];

  let diasPrevistos = 0;
  let diasPontuais = 0;
  let faltas = 0;
  if (e.espelho) {
    e.espelho.forEach((d) => {
      if (!d.previsto || d.situacao === 'Futuro' || d.situacao === 'Fora do período' || d.situacao === 'Em andamento') return;
      if (d.situacao === 'Justificado' || d.situacao === 'Folga') return; // neutros
      diasPrevistos++;
      if (d.situacao === 'OK') diasPontuais++;
      if (d.situacao === 'Falta') faltas++;
    });
    itens.push({ chave: 'pontualidade', rotulo: 'Dias com ponto no horário', quantidade: diasPontuais, pontos: diasPontuais * PONTOS.diaPontual, detalhe: `${diasPontuais} de ${diasPrevistos} dias` });
    const ganhou = mesFechado && diasPrevistos > 0 && faltas === 0;
    itens.push({
      chave: 'assiduidade',
      rotulo: 'Mês sem faltas',
      quantidade: ganhou ? 1 : 0,
      pontos: ganhou ? PONTOS.mesSemFalta : 0,
      detalhe: !mesFechado ? (faltas ? `${faltas} falta(s) no mês` : 'vale no fechamento do mês') : faltas ? `${faltas} falta(s)` : diasPrevistos ? 'conquistado' : '—',
    });
  }

  const treinos = e.treinamentos.filter((t) => mesDe(t.concluidoEm) === periodo).length;
  itens.push({ chave: 'treinamentos', rotulo: 'Treinamentos concluídos', quantidade: treinos, pontos: treinos * PONTOS.treinamento });

  const docs = e.documentos.filter((d) => d.assinadoEm && mesDe(d.assinadoEm) === periodo && dias(d.criadoEm, d.assinadoEm) <= PRAZO_DIAS).length;
  itens.push({ chave: 'documentos', rotulo: 'Documentos assinados em até 3 dias', quantidade: docs, pontos: docs * PONTOS.documentoEmDia });

  const ciencias = e.comunicados.filter((c) => c.exigeCiencia && c.cienteEm && mesDe(c.cienteEm) === periodo && dias(c.criadoEm, c.cienteEm) <= PRAZO_DIAS).length;
  itens.push({ chave: 'ciencias', rotulo: 'Comunicados com ciência em até 3 dias', quantidade: ciencias, pontos: ciencias * PONTOS.cienciaEmDia });

  const rec = e.reconhecimentos.filter((r) => r.data.slice(0, 7) === periodo);
  itens.push({
    chave: 'reconhecimentos',
    rotulo: 'Reconhecimentos',
    quantidade: rec.length,
    pontos: rec.reduce((s, r) => s + (Number(r.pontos) || 0), 0),
    detalhe: rec.map((r) => r.motivo).join(' · ') || undefined,
  });

  return { periodo, pontos: itens.reduce((s, i) => s + i.pontos, 0), itens, diasPrevistos, diasPontuais, faltas, mesFechado };
}

export function nivelDe(total: number) {
  let atual = NIVEIS[0];
  for (const n of NIVEIS) if (total >= n.minimo) atual = n;
  const proximo = NIVEIS[NIVEIS.indexOf(atual) + 1];
  const progresso = proximo ? (total - atual.minimo) / (proximo.minimo - atual.minimo) : 1;
  return { atual, proximo, progresso: Math.max(0, Math.min(1, progresso)), faltam: proximo ? proximo.minimo - total : 0 };
}

export interface Medalha {
  id: string;
  nome: string;
  descricao: string;
  emoji: string;
  conquistada: boolean;
}

export function medalhasDe(meses: ResultadoMes[], e: Pick<EntradaGamificacao, 'treinamentos' | 'reconhecimentos'>, destaques: { periodo: string }[]): Medalha[] {
  const treinosTotal = e.treinamentos.filter((t) => t.concluidoEm).length;
  return [
    { id: 'pontual', nome: 'Relógio suíço', emoji: '⏰', descricao: 'Um mês inteiro com todos os dias no horário (mínimo 10 dias).', conquistada: meses.some((m) => m.diasPrevistos >= 10 && m.diasPontuais === m.diasPrevistos && m.mesFechado) },
    { id: 'assiduo', nome: 'Presença garantida', emoji: '✅', descricao: 'Fechar um mês sem nenhuma falta.', conquistada: meses.some((m) => m.itens.some((i) => i.chave === 'assiduidade' && i.pontos > 0)) },
    { id: 'aprendiz', nome: 'Aprendiz', emoji: '📘', descricao: 'Concluir o primeiro treinamento.', conquistada: treinosTotal >= 1 },
    { id: 'estudioso', nome: 'Estudioso', emoji: '🎓', descricao: 'Concluir 5 treinamentos.', conquistada: treinosTotal >= 5 },
    { id: 'em-dia', nome: 'Sempre em dia', emoji: '✍️', descricao: 'Assinar 5 documentos em até 3 dias.', conquistada: meses.reduce((s, m) => s + (m.itens.find((i) => i.chave === 'documentos')?.quantidade || 0), 0) >= 5 },
    { id: 'reconhecido', nome: 'Reconhecido', emoji: '🌟', descricao: 'Receber um reconhecimento do DP.', conquistada: e.reconhecimentos.length > 0 },
    { id: 'destaque', nome: 'Destaque do mês', emoji: '🏆', descricao: 'Ser escolhido destaque do mês.', conquistada: destaques.length > 0 },
  ];
}

/** Meses do programa até o atual ('YYYY-MM'). */
export function mesesDoPrograma(ate = mesAtualLocal()): string[] {
  const lista: string[] = [];
  let [a, m] = INICIO_GAMIFICACAO.split('-').map(Number);
  for (let i = 0; i < 120; i++) {
    const p = `${a}-${String(m).padStart(2, '0')}`;
    if (p > ate) break;
    lista.push(p);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return lista;
}
