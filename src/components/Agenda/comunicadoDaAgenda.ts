import type { AtividadeGestao, Colaborador } from '../../types';
import type { RascunhoComunicado } from '../Comunicados/NovoComunicadoModal';

// Compromisso da Agenda → comunicado "Lembrete" já preenchido (vai para o portal dos
// colaboradores marcados, com aviso no app). Os destinatários são achados pelos nomes que
// aparecem nos participantes e na pauta (ex.: "COLABORADORES: ADAILSON; JAILSON; ...") —
// só entra quem bate com UM colaborador ativo; o resto a pessoa marca na tela.

const norm = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Colaboradores citados por nome (nome completo, ou começo do nome) — só os sem ambiguidade. */
export function colaboradoresCitados(textos: string[], colaboradores: Colaborador[]): string[] {
  const ativos = colaboradores.filter((c) => c.status !== 'Inativo');
  const nomes = ativos.map((c) => ({ id: c.id, nome: norm(c.nomeCompleto || '') }));
  const ids = new Set<string>();
  textos
    .flatMap((t) => (t || '').split(/[\n;,]+/))
    .map((t) => norm(t.replace(/^[^:]*:\s*/, (m) => (m.length < 30 ? '' : m))))
    .filter((t) => t.length >= 3)
    .forEach((t) => {
      const achados = nomes.filter((n) => n.nome === t || n.nome.startsWith(`${t} `));
      if (achados.length === 1) ids.add(achados[0].id);
    });
  return Array.from(ids);
}

export function rascunhoDaAtividade(a: AtividadeGestao, colaboradores: Colaborador[]): RascunhoComunicado {
  const videoconf = a.tipoLocal === 'videoconferencia' || /^https?:\/\//i.test(a.localOuLink || '');
  return {
    categoria: 'Lembrete',
    valores: {
      assunto: a.titulo,
      data: a.data,
      hora: a.diaInteiro ? '' : a.horaInicio || '',
      horaFim: a.diaInteiro ? '' : a.horaFim || '',
      local: videoconf ? (a.localOuLink ? `videochamada: ${a.localOuLink}` : '') : a.localOuLink || '',
      detalhes: (a.descricao || '').trim(),
    },
    colaboradoresIds: colaboradoresCitados([...(a.participantes || []), a.pautaAta || ''], colaboradores),
  };
}
