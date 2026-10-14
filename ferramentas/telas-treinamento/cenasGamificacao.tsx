// Cenas da Gamificação (portal "Meu desempenho" e DP "Gamificação & Destaques"). Tudo fictício.
import React from 'react';
import { tabelas, rpcs, esperar, moldura, Cena } from './apoio';

const ADMIN: any = { id: 'u-admin', nome: 'Marcos Andrade', cargo: 'Diretor', login: 'marcos', role: 'admin', status: 'Ativo', modulosPermitidos: [] };
const NOMES = ['PAULA RIBEIRO', 'RENATO CAMPOS', 'SÍLVIA MOURA', 'TIAGO NOGUEIRA'];
const COLABS: any[] = NOMES.map((nome, i) => ({ id: `c${i}`, nomeCompleto: nome, status: 'Ativo', setor: i % 2 ? 'Armazenagem' : 'Expedição', funcaoCargo: 'Conferente', dataAdmissao: '2024-01-10' }));
const JORNADA = { id: 'j1', nome: 'Comercial', dias_semana: [1, 2, 3, 4, 5], entrada: '08:00:00', saida_intervalo: '12:00:00', volta_intervalo: '13:00:00', saida: '17:00:00', tolerancia_min: 10, ativo: true };

/** Batidas de 01 a 13/10/2026 nos dias úteis; `atrasos` = dias com entrada 08:25. */
function batidas(colab: string, atrasos: number[], faltas: number[]) {
  const linhas: any[] = [];
  for (let d = 1; d <= 13; d++) {
    const data = `2026-10-${String(d).padStart(2, '0')}`;
    const dow = new Date(`${data}T12:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6 || faltas.includes(d)) continue;
    const entrada = atrasos.includes(d) ? '08:25' : '07:58';
    [entrada, '12:01', '13:00', '17:03'].forEach((h, k) =>
      linhas.push({ id: `b-${colab}-${d}-${k}`, colaborador_id: colab, registrado_em: new Date(`${data}T${h}:00-03:00`).toISOString(), origem: 'celular', anulado: false })
    );
  }
  return linhas;
}

function preparar() {
  tabelas.ponto_jornadas = [JORNADA];
  tabelas.ponto_colaborador_jornada = COLABS.map((c) => ({ colaborador_id: c.id, jornada_id: 'j1' }));
  tabelas.ponto_locais = [];
  tabelas.ponto_registros = [...batidas('c0', [], []), ...batidas('c1', [6, 8], []), ...batidas('c2', [2], [7]), ...batidas('c3', [1, 2, 5, 6], [])];
  tabelas.ponto_registros.sort((a, b) => a.registrado_em.localeCompare(b.registrado_em));
  tabelas.ponto_justificativas = [];
  tabelas.treinamento_atribuicoes = [
    { colaborador_id: 'c0', concluido_em: '2026-10-05T15:00:00Z' },
    { colaborador_id: 'c0', concluido_em: '2026-10-09T15:00:00Z' },
    { colaborador_id: 'c2', concluido_em: '2026-10-06T15:00:00Z' },
  ];
  tabelas.documentos_assinatura = [
    { colaborador_id: 'c0', criado_em: '2026-10-06T10:00:00Z', assinado_em: '2026-10-07T10:00:00Z' },
    { colaborador_id: 'c1', criado_em: '2026-10-06T10:00:00Z', assinado_em: '2026-10-06T18:00:00Z' },
    { colaborador_id: 'c3', criado_em: '2026-10-01T10:00:00Z', assinado_em: '2026-10-12T10:00:00Z' },
  ];
  tabelas.comunicado_destinatarios = [
    { ref_id: 'c0', ciente_em: '2026-10-03T10:00:00Z', comunicados: { criado_em: '2026-10-02T10:00:00Z', exige_ciencia: true } },
    { ref_id: 'c1', ciente_em: '2026-10-03T10:00:00Z', comunicados: { criado_em: '2026-10-02T10:00:00Z', exige_ciencia: true } },
  ];
  tabelas.gamificacao_reconhecimentos = [{ id: 'r1', colaborador_id: 'c1', data: '2026-10-08', pontos: 50, motivo: 'Elogio do cliente pela entrega urgente no hospital', criado_por: 'Marcos Andrade' }];
  tabelas.gamificacao_destaques = [];
}

export const CENAS_GAMIFICACAO: Record<string, Cena> = {
  'gam-dp': {
    montar: async () => {
      preparar();
      const { GamificacaoView } = await import('../../src/components/Gamificacao/GamificacaoView');
      return moldura(<GamificacaoView colaboradores={COLABS} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(1500);
    },
  },
  'gam-portal': {
    montar: async () => {
      preparar();
      const meus = tabelas.ponto_registros.filter((b) => b.colaborador_id === 'c0');
      rpcs.portal_ponto_historico = (corpo: any) =>
        corpo.p_mes === '2026-10'
          ? { colaborador: { admissao: '2024-01-10' }, jornada: JORNADA, inicio_controle: '2026-10-01', raio_padrao: 300, batidas: meus, justificativas: [] }
          : { colaborador: { admissao: '2024-01-10' }, jornada: JORNADA, inicio_controle: '2026-10-01', raio_padrao: 300, batidas: [], justificativas: [] };
      rpcs.portal_documentos = () => ({
        documentos: [
          { id: 'd1', categoria: 'contracheque', referencia: '2026-09', tipo: 'Mensal', titulo: 'Contracheque Mensal — Setembro/2026', status: 'Assinado', criadoEm: '2026-10-06T10:00:00Z', assinadoEm: '2026-10-07T10:00:00Z', vencido: false },
          { id: 'd2', categoria: 'pop', referencia: 'p1', tipo: 'POP-OPE-001 v02', titulo: 'Procedimento POP-OPE-001', status: 'Pendente', criadoEm: '2026-10-12T10:00:00Z', vencido: false },
        ],
      });
      rpcs.portal_comunicados = () => ({ comunicados: [{ id: 'k1', token: 't', titulo: 'Novo horário', categoria: 'Aviso', numero: 3, ano: 2026, criadoEm: '2026-10-02T10:00:00Z', exigeCiencia: true, cienteEm: '2026-10-03T10:00:00Z' }] });
      rpcs.portal_gamificacao = () => ({ reconhecimentos: [], destaques: [] });
      const treinamentos: any[] = [
        { atribuicaoId: 'a1', treinamentoId: 't1', titulo: 'Boas práticas RDC 430', status: 'Concluído', concluidoEm: '2026-10-05T15:00:00Z', conteudos: [], conteudosVistos: [], tentativas: [], cargaHorariaMin: 30 },
        { atribuicaoId: 'a2', treinamentoId: 't2', titulo: 'Cadeia fria', status: 'Concluído', concluidoEm: '2026-10-09T15:00:00Z', conteudos: [], conteudosVistos: [], tentativas: [], cargaHorariaMin: 30 },
        { atribuicaoId: 'a3', treinamentoId: 't3', titulo: 'Direção defensiva', status: 'Pendente', conteudos: [], conteudosVistos: [], tentativas: [], cargaHorariaMin: 30 },
      ];
      const { MeuDesempenho } = await import('../../src/components/Portal/MeuDesempenho');
      return (
        <div style={{ padding: 24, background: '#E9EDF2', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 430, background: '#F8FAFC', borderRadius: 28, border: '10px solid #22252B', padding: 16 }}>
            <MeuDesempenho credenciais={{ token: 'demo', cpf: '000', nascimento: '1990-01-01' }} treinamentos={treinamentos} />
          </div>
        </div>
      );
    },
    acoes: async () => {
      await esperar(1500);
    },
  },
};
