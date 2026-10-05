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
  rpcs.portal_jornal = () => ({ noticias: [
    { id: 'n1', titulo: 'Farma Aéreo bate recorde: 99,4% das entregas no prazo', categoria: 'Conquistas', capa: '/ferramentas/telas-treinamento/ilustracoes/trofeu.svg', destaque: true, publicadaEm: iso(-1), reacoes: {}, comentarios: 0, lida: false },
    { id: 'n2', titulo: 'Vale-alimentação da 1ª quinzena de outubro será creditado no dia 07/10', categoria: 'Notícias', destaque: false, publicadaEm: iso(-2), reacoes: {}, comentarios: 0, lida: false },
    { id: 'n3', titulo: 'Nova câmara fria amplia a capacidade da base', categoria: 'Qualidade', capa: '/ferramentas/telas-treinamento/ilustracoes/camara.svg', destaque: false, publicadaEm: iso(-6), reacoes: {}, comentarios: 0, lida: true },
  ] });
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

CENAS_PORTAL['aniv-capa'] = {
  montar: async () => {
    const { CapaNoticia } = await import('../../src/components/Jornal/jornalVisual');
    return <div style={{ width: 640, margin: '20px auto' }}><CapaNoticia titulo="Hoje é aniversário de Paula Ribeiro! 🎉" categoria="Aniversários" capa="/jornal/aniversario.svg" tamanho="grande" /></div>;
  },
  acoes: async () => {
    await esperar(800);
  },
};

// ---- Fale com o DP ----
function prepararSolicitacoes() {
  preparar(true);
  rpcs.portal_solicitacoes = () => ({
    solicitacoes: [
      { id: 's1', protocolo: '2026-0007', tipo: 'contestacao', assunto: 'Vale-alimentação', status: 'respondida', novaResposta: true, criadoEm: iso(-2), atualizadoEm: iso(0) },
      { id: 's2', protocolo: '2026-0004', tipo: 'ferias', assunto: 'Pedido de férias', status: 'em_analise', novaResposta: false, criadoEm: iso(-6), atualizadoEm: iso(-4) },
      { id: 's3', protocolo: '2026-0002', tipo: 'documento', assunto: 'Declaração de vínculo', status: 'concluida', novaResposta: false, criadoEm: iso(-15), atualizadoEm: iso(-14) },
    ],
  });
  rpcs.portal_solicitacao = () => ({
    id: 's1', protocolo: '2026-0007', tipo: 'contestacao', assunto: 'Vale-alimentação', status: 'respondida', criadoEm: iso(-2),
    dados: { documentoTitulo: 'Demonstrativo de Vale-Alimentação — 1ª quinzena de outubro/2026' },
    mensagens: [
      { id: 'm1', autor: 'colaborador', autorNome: 'Paula Ribeiro', texto: 'No VA da 1ª quinzena aparece 1 falta no dia 03/10, mas eu trabalhei nesse dia (estava na rota do aeroporto).', anexos: [{ nome: 'foto_ponto_03-10.jpg' }], criadoEm: iso(-2) },
      { id: 'm2', autor: 'dp', autorNome: 'Departamento Pessoal', texto: 'Oi, Paula! Conferimos com a supervisão e você tem razão: a falta foi lançada por engano. Corrigimos e a diferença de R$ 25,00 entra na próxima quinzena.', anexos: [], criadoEm: iso(0) },
    ],
  });
  rpcs.portal_documentos = () => ({ documentos: [{ id: 'd1', categoria: 'vale_alimentacao', referencia: 'q1', tipo: 'Quinzena', titulo: 'Demonstrativo de Vale-Alimentação — 1ª quinzena de outubro/2026', status: 'Visualizado', criadoEm: iso(-3), vencido: false }] });
}
const montarPortalSol = async (ir?: string) => {
  prepararSolicitacoes();
  const { PortalEducacaoView } = await import('../../src/components/Educacao/PortalEducacaoView');
  return <PortalEducacaoView token={TOKEN} ir={ir} />;
};
CENAS_PORTAL['sol-1'] = { montar: () => montarPortalSol('solicitacoes'), acoes: async () => { await esperar(1200); } };
CENAS_PORTAL['sol-2'] = { montar: () => montarPortalSol('solicitacoes'), acoes: async () => { await esperar(1200); await clicar('Nova solicitação'); await clicar('Pedir férias'); await esperar(500); } };
CENAS_PORTAL['sol-3'] = { montar: () => montarPortalSol('solicitacao:s1'), acoes: async () => { await esperar(1500); } };
CENAS_PORTAL['sol-dp'] = {
  montar: async () => {
    const { tabelas } = await import('./apoio');
    tabelas.solicitacoes_dp = [
      { id: 's1', numero: 7, ano: 2026, colaborador_id: 'c1', colaborador_nome: 'PAULA RIBEIRO', tipo: 'contestacao', assunto: 'Vale-alimentação', dados: { documentoTitulo: 'Demonstrativo de VA — 1ª quinzena de outubro/2026' }, status: 'aberta', lida_pelo_dp: false, lida_pelo_colaborador: true, criado_em: iso(-1), atualizado_em: iso(-1) },
      { id: 's2', numero: 6, ano: 2026, colaborador_id: 'c2', colaborador_nome: 'RENATO CAMPOS', tipo: 'ferias', assunto: 'Pedido de férias', dados: { mes: '2027-01', dias: 30, venderDias: true }, status: 'aberta', lida_pelo_dp: false, lida_pelo_colaborador: true, criado_em: iso(-2), atualizado_em: iso(-2) },
      { id: 's3', numero: 5, ano: 2026, colaborador_id: 'c3', colaborador_nome: 'SÍLVIA MOURA', tipo: 'cadastro', assunto: 'Endereço', dados: {}, status: 'em_analise', lida_pelo_dp: true, lida_pelo_colaborador: true, criado_em: iso(-3), atualizado_em: iso(-2) },
      { id: 's4', numero: 4, ano: 2026, colaborador_id: 'c4', colaborador_nome: 'TIAGO NOGUEIRA', tipo: 'documento', assunto: 'Declaração de vínculo', dados: {}, status: 'respondida', lida_pelo_dp: true, lida_pelo_colaborador: false, criado_em: iso(-5), atualizado_em: iso(-4) },
    ];
    tabelas.solicitacao_mensagens = [
      { id: 'm1', solicitacao_id: 's2', autor: 'colaborador', autor_nome: 'RENATO CAMPOS', texto: 'Gostaria de tirar férias em janeiro, para viajar com a família.', anexos: [], criado_em: iso(-2) },
    ];
    const { SolicitacoesDpView } = await import('../../src/components/Solicitacoes/SolicitacoesDpView');
    const colabs: any[] = ['Paula Ribeiro', 'Renato Campos', 'Sílvia Moura', 'Tiago Nogueira'].map((n, i) => ({ id: `c${i + 1}`, nomeCompleto: n.toUpperCase(), status: 'Ativo', setor: ['Farma Aéreo', 'Expedição', 'Armazenagem', 'Farma Rodoviário'][i], funcaoCargo: 'Ajudante Operacional', dataAdmissao: '2024-03-10', telefoneWhatsapp: '(84) 90000-0000' }));
    return <div style={{ padding: 24, background: '#F8FAFC' }}><SolicitacoesDpView colaboradores={colabs} currentUser={{ nome: 'Marcos Andrade', role: 'admin' } as any} onSaveFerias={async () => {}} /></div>;
  },
  acoes: async () => { await esperar(1000); await clicar('Pedido de férias'); await esperar(800); },
};
