// Cenas do módulo POPs. Tudo fictício (nomes, procedimentos).
import React from 'react';
import { tabelas, esperar, clicar, moldura, Cena } from './apoio';

const ADMIN: any = { id: 'u-admin', nome: 'Marcos Andrade', cargo: 'Diretor', login: 'marcos', role: 'admin', status: 'Ativo', modulosPermitidos: [] };
const COLABS: any[] = ['Paula Ribeiro', 'Renato Campos', 'Sílvia Moura', 'Tiago Nogueira'].map((nome, i) => ({
  id: `c${i}`,
  nomeCompleto: nome.toUpperCase(),
  status: 'Ativo',
  setor: i % 2 ? 'Armazenagem' : 'Expedição',
  funcaoCargo: 'Conferente',
  telefoneWhatsapp: '(84) 90000-0000',
}));

const CONTEUDO = {
  objetivo: 'Estabelecer o procedimento para o recebimento de medicamentos termolábeis, garantindo a faixa de 2 °C a 8 °C e a rastreabilidade de cada volume.',
  aplicacao: 'Aplica-se a todos os recebimentos de cargas refrigeradas da base.',
  referencias: ['BRASIL. Agência Nacional de Vigilância Sanitária. Resolução RDC nº 430, de 8 de outubro de 2020. Diário Oficial da União, Brasília, DF, 2020.'],
  definicoes: [{ termo: 'Termolábil', definicao: 'Produto que exige armazenamento entre 2 °C e 8 °C.' }],
  responsabilidades: [
    { funcao: 'Conferente', atribuicao: 'Conferir temperatura e volumes e registrar o recebimento.' },
    { funcao: 'Supervisor', atribuicao: 'Garantir o cumprimento e tratar os desvios.' },
  ],
  materiais: ['Termômetro calibrado', 'Luvas de procedimento'],
  etapas: [
    { id: 'e1', titulo: 'Conferência da temperatura', descricao: 'Antes de abrir o veículo, verificar o datalogger.\n- Dentro da faixa: seguir para a descarga\n- Fora da faixa: não descarregar e acionar o supervisor', responsavel: 'Conferente' },
    { id: 'e2', titulo: 'Descarga e armazenamento', descricao: 'Descarregar em até 15 minutos e levar para a câmara fria (FEFO).', responsavel: 'Equipe de operações' },
  ],
  desvios: 'Registrar toda excursão de temperatura no formulário de desvio.',
  registros: [{ registro: 'Formulário de recebimento', responsavel: 'Conferente', guarda: '5 anos' }],
  anexos: [],
};

function preparar() {
  tabelas.pops = [
    { id: 'p1', codigo: 'POP-OPE-001', versao: 2, titulo: 'Recebimento de medicamentos termolábeis', setor: 'OPE', classificacao: 'Uso interno', status: 'Vigente', conteudo: CONTEUDO, motivo_revisao: 'Prazo máximo de descarga.', elaborado_por: 'Paula Ribeiro', elaborado_cargo: 'Supervisora', elaborado_em: '2026-10-01T10:00:00Z', revisado_por: 'Sílvia Moura', revisado_cargo: 'Farmacêutica RT', revisado_em: '2026-10-02T10:00:00Z', aprovado_por: 'Marcos Andrade', aprovado_cargo: 'Diretor', aprovado_em: '2026-10-03T10:00:00Z', vigencia_inicio: '2026-10-03', proxima_revisao: '2028-10-03' },
    { id: 'p0', codigo: 'POP-OPE-001', versao: 1, titulo: 'Recebimento de medicamentos termolábeis', setor: 'OPE', classificacao: 'Uso interno', status: 'Obsoleto', conteudo: CONTEUDO, aprovado_por: 'Marcos Andrade', vigencia_inicio: '2024-03-01', proxima_revisao: '2026-03-01' },
    { id: 'p2', codigo: 'POP-QUA-001', versao: 1, titulo: 'Higienização do baú refrigerado', setor: 'QUA', classificacao: 'Uso interno', status: 'Em aprovação', conteudo: CONTEUDO, elaborado_por: 'Renato Campos', elaborado_cargo: 'Analista de qualidade', elaborado_em: '2026-10-08T10:00:00Z', revisado_por: 'Sílvia Moura', revisado_cargo: 'Farmacêutica RT', revisado_em: '2026-10-09T10:00:00Z' },
    { id: 'p3', codigo: 'POP-OPE-002', versao: 1, titulo: 'Expedição de cargas fracionadas', setor: 'OPE', classificacao: 'Uso interno', status: 'Rascunho', conteudo: { ...CONTEUDO, objetivo: '' }, elaborado_por: 'Tiago Nogueira', elaborado_cargo: 'Líder de expedição' },
    { id: 'p4', codigo: 'POP-DP-001', versao: 1, titulo: 'Integração de novos colaboradores', setor: 'DP', classificacao: 'Uso interno', status: 'Vigente', conteudo: CONTEUDO, aprovado_por: 'Marcos Andrade', vigencia_inicio: '2024-01-10', proxima_revisao: '2026-01-10' },
  ];
  tabelas.documentos_assinatura = [
    { id: 'd1', categoria: 'pop', colaborador_id: 'c0', colaborador_nome: 'PAULA RIBEIRO', referencia: 'p1', tipo: 'POP-OPE-001 v02', titulo: 'Procedimento POP-OPE-001 — Recebimento de medicamentos termolábeis (versão 02)', status: 'Assinado', token: 't1', link_expira_em: '2027-01-01T00:00:00Z', assinado_em: '2026-10-04T09:00:00Z', visualizado_em: '2026-10-04T08:55:00Z', criado_em: '2026-10-03T12:00:00Z' },
    { id: 'd2', categoria: 'pop', colaborador_id: 'c1', colaborador_nome: 'RENATO CAMPOS', referencia: 'p1', tipo: 'POP-OPE-001 v02', titulo: 'Procedimento POP-OPE-001 — Recebimento de medicamentos termolábeis (versão 02)', status: 'Pendente', token: 't2', link_expira_em: '2027-01-01T00:00:00Z', criado_em: '2026-10-03T12:00:00Z' },
  ];
  tabelas.portal_colaborador = [];
}

export const CENAS_POPS: Record<string, Cena> = {
  'pop-lista': {
    montar: async () => {
      preparar();
      const { PopsView } = await import('../../src/components/Pops/PopsView');
      return moldura(<PopsView colaboradores={COLABS} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(800);
    },
  },
  'pop-vigente': {
    montar: async () => {
      preparar();
      const { PopsView } = await import('../../src/components/Pops/PopsView');
      return moldura(<PopsView colaboradores={COLABS} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(800);
      await clicar('POP-OPE-001');
      await esperar(800);
    },
  },
  'pop-aprovacao': {
    montar: async () => {
      preparar();
      const { PopsView } = await import('../../src/components/Pops/PopsView');
      return moldura(<PopsView colaboradores={COLABS} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(800);
      await clicar('POP-QUA-001');
      await esperar(800);
    },
  },
  'pop-novo': {
    montar: async () => {
      preparar();
      const { PopsView } = await import('../../src/components/Pops/PopsView');
      return moldura(<PopsView colaboradores={COLABS} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(800);
      await clicar('POP-OPE-002');
      await esperar(800);
    },
  },
};
