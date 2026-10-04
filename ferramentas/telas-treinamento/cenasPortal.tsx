// Cenas do Portal do Colaborador (link único). Tudo fictício.
import React from 'react';
import { rpcs, esperar, clicar, Cena } from './apoio';

const TOKEN = 'demo-portal-0000000000000000';
const AGORA = new Date('2026-10-02T10:00:00-03:00');
const iso = (dias = 0) => new Date(AGORA.getTime() + dias * 86400000).toISOString();

function preparar(lembrado: boolean) {
  try {
    if (lembrado) localStorage.setItem(`jmt-ponto-${TOKEN.slice(0, 16)}`, 'segredo-demo');
    else localStorage.removeItem(`jmt-ponto-${TOKEN.slice(0, 16)}`);
  } catch {
    /* sem armazenamento */
  }
  rpcs.portal_entrar = () => ({
    ...{
      colaborador: { nome: 'Paula Ribeiro', cargo: 'Ajudante Operacional de Carga e Descarga' },
      treinamentos: [
        { atribuicaoId: 'a1', treinamentoId: 't1', titulo: 'Boas Práticas de Transporte (RDC 430)', cargaHorariaMin: 45, conteudos: [{ id: 'c', tipo: 'texto', titulo: 'Introdução', texto: '...' }], status: 'Pendente', conteudosVistos: [], tentativas: [], prazo: '2026-10-15' },
      ],
      instrucoes: [],
    },
  });
  rpcs.portal_documentos = () => ({
    documentos: [
      { id: 'd1', categoria: 'contracheque', referencia: '2026-09', tipo: 'Mensal', titulo: 'Contracheque — Setembro/2026', status: 'Pendente', criadoEm: iso(-2), vencido: false },
      { id: 'd2', categoria: 'ferias', referencia: '2026-11', tipo: 'Aviso', titulo: 'Aviso de férias — 03/11 a 02/12', status: 'Visualizado', criadoEm: iso(-5), vencido: false },
      { id: 'd3', categoria: 'contracheque', referencia: '2026-08', tipo: 'Mensal', titulo: 'Contracheque — Agosto/2026', status: 'Assinado', criadoEm: iso(-33), assinadoEm: iso(-31), vencido: true },
    ],
  });
  rpcs.portal_comunicados = () => ({
    comunicados: [
      { id: 'k1', token: 'k1', titulo: 'Mudança no horário da expedição', categoria: 'Aviso', numero: 12, ano: 2026, criadoEm: iso(-1), exigeCiencia: true, visualizadoEm: null, cienteEm: null },
      { id: 'k2', token: 'k2', titulo: 'Semana de Segurança no Trânsito', categoria: 'Evento', numero: 11, ano: 2026, criadoEm: iso(-6), exigeCiencia: false, visualizadoEm: iso(-5), cienteEm: null },
    ],
  });
  rpcs.portal_jornal = () => ({ noticias: [{ id: 'n1', titulo: 'Farma Aéreo bate recorde', categoria: 'Conquistas', destaque: true, publicadaEm: iso(-1), reacoes: {}, comentarios: 0, lida: false }] });
}

export const CENAS_PORTAL: Record<string, Cena> = {
  'por-1': {
    montar: async () => {
      preparar(false);
      const { PortalEducacaoView } = await import('../../src/components/Educacao/PortalEducacaoView');
      return <PortalEducacaoView token={TOKEN} />;
    },
  },
  'por-2': {
    montar: async () => {
      preparar(true);
      const { PortalEducacaoView } = await import('../../src/components/Educacao/PortalEducacaoView');
      return <PortalEducacaoView token={TOKEN} />;
    },
    acoes: async () => {
      await esperar(1200);
    },
  },
  'por-3': {
    montar: async () => {
      preparar(true);
      const { PortalEducacaoView } = await import('../../src/components/Educacao/PortalEducacaoView');
      return <PortalEducacaoView token={TOKEN} ir="documentos" />;
    },
    acoes: async () => {
      await esperar(1200);
    },
  },
  'por-4': {
    montar: async () => {
      preparar(true);
      const { PortalEducacaoView } = await import('../../src/components/Educacao/PortalEducacaoView');
      return <PortalEducacaoView token={TOKEN} ir="comunicados" />;
    },
    acoes: async () => {
      await esperar(1000);
      await clicar('Comunicados');
      await esperar(600);
    },
  },
};

// Prévia do demonstrativo de VA (só para conferência visual, não vira tela de treinamento).
CENAS_PORTAL['va-pdf'] = {
  montar: async () => {
    const { gerarDemonstrativoVaPdf } = await import('../../src/components/Vacation/demonstrativoVaPdf');
    const { PdfEmTela } = await import('../../src/components/Contracheques/ContrachequePublicView');
    const { arquivo } = gerarDemonstrativoVaPdf({
      colaborador: { nomeCompleto: 'Paula Ribeiro', cpf: '000.000.000-00', funcaoCargo: 'Ajudante Operacional', codigoMatricula: 'JMT-0101' },
      lancamento: {
        id: 'l1', colaboradorId: 'c1', colaboradorNome: 'Paula Ribeiro', quinzenaId: 'q1', identificacaoQuinzena: '1ª QUINZENA - OUTUBRO/2026',
        dataInicio: '2026-10-01', dataTermino: '2026-10-15', valorDiaria: 25, faltas: 1, diasFerias: 0, diariasExtras: 1, quantidadeDiarias: 11, valorDisponibilizado: 275, criadoEm: '2026-10-01',
      } as any,
    });
    return <div style={{ width: 800, margin: '0 auto', padding: 20 }}><PdfEmTela url={URL.createObjectURL(arquivo)} /></div>;
  },
  acoes: async () => {
    await esperar(3000);
  },
};

CENAS_PORTAL['fer-pdf'] = {
  montar: async () => {
    const { gerarProgramacaoFeriasPdf } = await import('../../src/components/Vacation/programacaoFeriasPdf');
    const { PdfEmTela } = await import('../../src/components/Contracheques/ContrachequePublicView');
    const { arquivo } = gerarProgramacaoFeriasPdf({
      colaborador: { nomeCompleto: 'Paula Ribeiro', cpf: '000.000.000-00', funcaoCargo: 'Ajudante Operacional', codigoMatricula: 'JMT-0101' },
      programacao: {
        id: 'f1', colaboradorId: 'c1', periodoAquisitivoInicio: '2025-03-10', periodoAquisitivoFim: '2026-03-09', prazoLimiteGozo: '2027-02-09',
        diasGozados: 20, abonoPecuniario: true, diasAbono: 10, dataInicio: '2026-11-03', dataFim: '2026-11-22', status: 'Programada',
      } as any,
    });
    return <div style={{ width: 800, margin: '0 auto', padding: 20 }}><PdfEmTela url={URL.createObjectURL(arquivo)} /></div>;
  },
  acoes: async () => {
    await esperar(3000);
  },
};
