// Cenas do Jornal JMT (gestão e portal do colaborador). Tudo fictício: notícias, nomes e
// ilustrações próprias (pasta ilustracoes/) — nenhuma foto de pessoa real.
import React from 'react';
import { tabelas, rpcs, esperar, clicar, digitar, achar, moldura, Cena } from './apoio';

const AGORA = new Date('2026-10-02T10:00:00-03:00');
const iso = (dias = 0, horas = 0) => new Date(AGORA.getTime() + dias * 86400000 + horas * 3600000).toISOString();
const ILU = (n: string) => `/ferramentas/telas-treinamento/ilustracoes/${n}.svg`;
const ADMIN: any = { id: 'u-admin', nome: 'Marcos Andrade', login: 'marcos', role: 'admin', status: 'Ativo', modulosPermitidos: [] };
const COLABS: any[] = ['Paula Ribeiro', 'Renato Campos', 'Sílvia Moura', 'Tiago Nogueira'].map((nome, i) => ({ id: `c${i}`, nomeCompleto: nome, status: 'Ativo', telefoneWhatsapp: '(84) 90000-0000' }));

const TEXTO_RECORDE = `Em setembro, a equipe do Farma Aéreo fechou o mês com 99,4% das entregas dentro do prazo combinado com os clientes — o melhor resultado desde que a operação começou.

O resultado veio de pequenos ajustes no dia a dia: conferência dupla na expedição, rotas revisadas toda manhã e o acompanhamento da temperatura em tempo real.

"Cada caixa que sai daqui é um tratamento que chega na hora certa", lembrou a supervisão da operação. Parabéns a todos!`;

const NOTICIAS = [
  { id: 'n1', titulo: 'Farma Aéreo bate recorde: 99,4% das entregas no prazo', resumo: 'Melhor resultado desde o início da operação, com conferência dupla e rotas revisadas toda manhã.', categoria: 'Conquistas', capa: ILU('trofeu'), status: 'publicada', destaque: true, permite_comentarios: true, autor_nome: 'Comunicação JMT', criado_por: 'Marcos Andrade', autorizacao_imagem: true, publicada_em: iso(-1), criado_em: iso(-2), blocos: [{ id: 'b1', tipo: 'texto', texto: TEXTO_RECORDE }, { id: 'b2', tipo: 'imagens', telas: [{ titulo: 'Expedição da base', imagem: ILU('caminhao'), marcas: ['Saída das rotas da manhã.'] }] }] },
  { id: 'n2', titulo: 'Nova câmara fria amplia a capacidade da base', resumo: 'Mais espaço para produtos de 2 °C a 8 °C, com monitoramento contínuo de temperatura.', categoria: 'Qualidade', capa: ILU('camara'), status: 'publicada', destaque: false, permite_comentarios: true, autor_nome: 'Comunicação JMT', criado_por: 'Marcos Andrade', autorizacao_imagem: true, publicada_em: iso(-6), criado_em: iso(-7), blocos: [] },
  { id: 'n3', titulo: 'Semana de Segurança no Trânsito começa segunda', resumo: 'Palestras rápidas no início do turno e checklist do veículo valendo brinde.', categoria: 'Segurança', capa: null, status: 'publicada', destaque: false, permite_comentarios: true, autor_nome: 'Comunicação JMT', criado_por: 'Marcos Andrade', autorizacao_imagem: false, publicada_em: iso(-9), criado_em: iso(-10), blocos: [] },
  { id: 'n4', titulo: 'Equipe do Rodoviário completa 1 ano sem acidentes', resumo: 'Sugestão da supervisão do Farma Rodoviário.', categoria: 'Nossa equipe', capa: ILU('caminhao'), status: 'sugerida', destaque: false, permite_comentarios: true, autor_nome: 'Supervisão Rodoviário', criado_por: 'Wagner Pires', autorizacao_imagem: true, publicada_em: null, criado_em: iso(0, -3), blocos: [] },
];

function prepararGestao() {
  tabelas.noticias = NOTICIAS;
  tabelas.noticia_leituras = [...Array(23)].map((_, i) => ({ noticia_id: 'n1', colaborador_id: `x${i}` })).concat([...Array(14)].map((_, i) => ({ noticia_id: 'n2', colaborador_id: `y${i}` })), [...Array(9)].map((_, i) => ({ noticia_id: 'n3', colaborador_id: `z${i}` })));
  tabelas.noticia_reacoes = [
    ...[...Array(11)].map(() => ({ noticia_id: 'n1', tipo: 'parabens' })),
    ...[...Array(6)].map(() => ({ noticia_id: 'n1', tipo: 'curtir' })),
    ...[...Array(3)].map(() => ({ noticia_id: 'n1', tipo: 'amei' })),
    ...[...Array(5)].map(() => ({ noticia_id: 'n2', tipo: 'curtir' })),
    ...[...Array(2)].map(() => ({ noticia_id: 'n3', tipo: 'apoio' })),
  ];
  tabelas.noticia_comentarios = [
    { id: 'k1', noticia_id: 'n1', colaborador_id: 'c0', autor_nome: 'Paula R.', texto: 'Orgulho de fazer parte dessa equipe! 👏', status: 'pendente', criado_em: iso(0, -2) },
    { id: 'k2', noticia_id: 'n1', colaborador_id: 'c1', autor_nome: 'Renato C.', texto: 'Mérito de todo mundo da expedição.', status: 'pendente', criado_em: iso(0, -1) },
  ];
}

const resumoPortal = (n: any, i: number) => ({
  id: n.id,
  titulo: n.titulo,
  resumo: n.resumo,
  categoria: n.categoria,
  capa: n.capa,
  destaque: n.destaque,
  autorNome: n.autor_nome,
  publicadaEm: n.publicada_em,
  reacoes: i === 0 ? { parabens: 11, curtir: 6, amei: 3 } : i === 1 ? { curtir: 5 } : { apoio: 2 },
  minhaReacao: null,
  comentarios: i === 0 ? 4 : 0,
  lida: i !== 0,
});

function prepararPortal(curta = false) {
  const publicadas = NOTICIAS.filter((n) => n.status === 'publicada');
  rpcs.portal_jornal = () => ({ noticias: publicadas.map(resumoPortal) });
  rpcs.portal_noticia = () => ({
    ...resumoPortal(publicadas[0], 0),
    blocos: curta ? [{ id: 'b1', tipo: 'texto', texto: 'Em setembro, a equipe do Farma Aéreo fechou o mês com 99,4% das entregas dentro do prazo — o melhor resultado desde que a operação começou. Parabéns a todos!' }] : publicadas[0].blocos,
    permiteComentarios: true,
    minhaReacao: 'parabens',
    reacoes: { parabens: 12, curtir: 6, amei: 3 },
    comentarios: [
      { id: 'k0', autorNome: 'Sílvia M.', texto: 'Que orgulho dessa equipe! Parabéns a todos.', criadoEm: iso(0, -20), pendente: false, meu: false },
      { id: 'k3', autorNome: 'Tiago N.', texto: 'A conferência dupla fez muita diferença na expedição.', criadoEm: iso(0, -8), pendente: false, meu: false },
      { id: 'k4', autorNome: 'Paula R.', texto: 'Bora manter esse ritmo em outubro!', criadoEm: iso(0, -1), pendente: true, meu: true },
    ],
  });
}

const CREDENCIAIS = { token: 'demo', cpf: '000.000.000-00', nascimento: '1990-01-01' };
// Moldura de celular para as telas do portal.
const celular = (filho: React.ReactNode) => (
  <div style={{ padding: 24, background: '#E9EDF2',  display: 'flex', justifyContent: 'center' }}>
    <div id="tela-celular" style={{ width: 430, height: 740, background: '#F8FAFC', borderRadius: 28, border: '10px solid #22252B', overflowY: 'auto', padding: 16 }}>{filho}</div>
  </div>
);

export const CENAS_JORNAL: Record<string, Cena> = {
  'jor-1': {
    montar: async () => {
      prepararGestao();
      const { JornalView } = await import('../../src/components/Jornal/JornalView');
      return moldura(<JornalView colaboradores={COLABS} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(1200);
    },
  },
  'jor-2': {
    montar: async () => {
      prepararGestao();
      const { JornalView } = await import('../../src/components/Jornal/JornalView');
      return moldura(<JornalView colaboradores={COLABS} currentUser={ADMIN} />);
    },
    acoes: async () => {
      await esperar(1000);
      await clicar('Nova notícia');
      await digitar('Ex.: Equipe do Farma Aéreo', 'Semana de Segurança no Trânsito começa segunda');
      await digitar('Uma frase que conta o essencial', 'Palestras rápidas no início do turno e checklist do veículo valendo brinde.');
      const sel = achar('Notícias') as HTMLSelectElement | null;
      const select = (sel?.tagName === 'SELECT' ? sel : document.querySelector('[data-texto-livre] select')) as HTMLSelectElement | null;
      if (select) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, 'Segurança');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await digitar('Escreva aqui. Deixe uma linha', 'De segunda a sexta, o início de cada turno terá 10 minutos sobre direção defensiva, uso do cinto e cuidados na carga e descarga.\n\nQuem entregar o checklist do veículo completo durante a semana concorre a brindes.');
      await esperar(400);
    },
  },
  'jor-3': {
    montar: async () => {
      prepararPortal();
      const { JornalPortal } = await import('../../src/components/Jornal/JornalPortal');
      return celular(<JornalPortal credenciais={CREDENCIAIS} />);
    },
    acoes: async () => {
      await esperar(1200);
    },
  },
  'jor-4': {
    montar: async () => {
      prepararPortal(true);
      const { JornalPortal } = await import('../../src/components/Jornal/JornalPortal');
      return celular(<JornalPortal credenciais={CREDENCIAIS} noticiaInicial="n1" />);
    },
    acoes: async () => {
      await esperar(1200);
      await esperar(400);
    },
  },
  'jor-5': {
    montar: async () => {
      prepararPortal(true);
      const { JornalPortal } = await import('../../src/components/Jornal/JornalPortal');
      return celular(<JornalPortal credenciais={CREDENCIAIS} noticiaInicial="n1" />);
    },
    acoes: async () => {
      await esperar(1200);
      const tela = document.getElementById('tela-celular');
      const sec = tela?.querySelector('section');
      if (tela && sec) tela.scrollTop = tela.scrollHeight; // fim: comentários + campo de escrever
      await esperar(300);
      await esperar(400);
    },
  },
};
