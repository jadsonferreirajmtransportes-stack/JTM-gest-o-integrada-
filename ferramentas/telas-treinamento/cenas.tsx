// ============================================================================
// Estúdio das telas de treinamento (só para desenvolvimento — não entra no site).
// Abre ?cena=<id> (ids em src/data/telasTreinamento.ts), monta a tela real do
// sistema com DADOS FICTÍCIOS (o banco é simulado aqui — nada vem do Supabase
// nem vai para ele), executa os cliques/preenchimentos da cena e desenha os
// números das marcas. O capturar.ps1 tira o print de cada cena.
// ============================================================================

import '../../src/index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TELAS_TREINAMENTO } from '../../src/data/telasTreinamento';

// ---------------------------------------------------------------------------
// Banco simulado — precisa entrar ANTES de carregar o cliente do Supabase.
// ---------------------------------------------------------------------------
const tabelas: Record<string, any[]> = {};
const fetchOriginal = window.fetch.bind(window);
window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  if (!/supabase\.co/.test(url)) return fetchOriginal(entrada as any, init);
  const resposta = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?.*)?$/);
  if (!m || m[1] === 'rpc') return resposta({});
  if (init?.method && init.method !== 'GET' && init.method !== 'HEAD') return resposta([]);
  let linhas = [...(tabelas[m[1]] || [])];
  new URLSearchParams(m[2] || '').forEach((valor, chave) => {
    if (valor.startsWith('eq.')) linhas = linhas.filter((l) => String(l[chave]) === valor.slice(3));
  });
  const cabecalhos = new Headers(init?.headers);
  if ((cabecalhos.get('Accept') || '').includes('pgrst.object')) return resposta(linhas[0] ?? null);
  return resposta(linhas);
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Acha o elemento visível cujo texto/placeholder/título contém `alvo` (o menor deles). */
function achar(alvo: string): HTMLElement | null {
  const procurado = normalizar(alvo);
  const lista = Array.from(document.querySelectorAll<HTMLElement>('button, a, h1, h2, h3, label, th, span, p, input, select, textarea, li, td, div, img'))
    .filter((el) => {
      if (el.closest('[data-marcas]')) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.top < 0 || r.bottom > window.innerHeight + 1) return false;
      const textos = [el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.placeholder : el.textContent || '', el.getAttribute('title') || '', el.getAttribute('aria-label') || '', el.getAttribute('alt') || ''];
      return textos.some((t) => normalizar(t).includes(procurado));
    })
    .sort((a, b) => {
      const area = (e: HTMLElement) => { const r = e.getBoundingClientRect(); return r.width * r.height; };
      // Quem tem o texto visível vem antes de quem só tem no title/placeholder.
      const peloTexto = (e: HTMLElement) => (normalizar(e.textContent || '').includes(procurado) ? 0 : 1);
      return peloTexto(a) - peloTexto(b) || (a.textContent || '').length - (b.textContent || '').length || area(a) - area(b);
    });
  // Texto dentro de botão/link: marca o botão inteiro.
  const el = lista[0] || null;
  return (el?.closest('button, a, select') as HTMLElement | null) || el;
}

async function digitar(placeholderOuRotulo: string, valor: string) {
  const el = achar(placeholderOuRotulo) as HTMLInputElement | null;
  const campo = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el : (el.parentElement?.querySelector('input, textarea') as HTMLInputElement | null));
  if (!campo) return console.warn('campo não achado:', placeholderOuRotulo);
  const proto = campo.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(campo, valor);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  await esperar(80);
}
async function clicar(alvo: string) {
  const el = achar(alvo);
  const clicavel = (el?.closest('button, a, label, li, [role="button"]') as HTMLElement | null) || el;
  if (!clicavel) return console.warn('clique não achado:', alvo);
  clicavel.click();
  await esperar(400);
}

/** Números marcados na tela (círculo bronze + contorno). */
function desenharMarcas(alvos: string[]) {
  const camada = document.createElement('div');
  camada.setAttribute('data-marcas', '1');
  camada.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999';
  alvos.forEach((alvo, i) => {
    const el = achar(alvo);
    if (!el) return console.warn('marca não achada:', alvo);
    const r = el.getBoundingClientRect();
    const contorno = document.createElement('div');
    contorno.style.cssText = `position:absolute;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border:3px solid #C48229;border-radius:10px;box-shadow:0 0 0 3px rgba(196,130,41,.18)`;
    const bola = document.createElement('div');
    const x = Math.max(4, r.left - 26);
    const y = Math.max(4, r.top - 22);
    bola.textContent = String(i + 1);
    bola.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:30px;height:30px;border-radius:50%;background:#C48229;color:#fff;font:800 16px "Hanken Grotesk",Arial;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff`;
    camada.append(contorno, bola);
  });
  document.body.appendChild(camada);
}

// ---------------------------------------------------------------------------
// Dados fictícios
// ---------------------------------------------------------------------------
const agora = new Date('2026-10-02T10:00:00-03:00').toISOString();
const USUARIOS: any[] = [
  { id: 'u1', nome: 'Ana Supervisora', login: 'ana', email: 'ana@exemplo.com', cargo: 'Supervisora Operacional', status: 'Ativo', dataCriacao: agora, modulosPermitidos: [] },
  { id: 'u2', nome: 'Bruno Departamento Pessoal', login: 'bruno', email: 'bruno@exemplo.com', cargo: 'Analista de DP', status: 'Ativo', dataCriacao: agora, modulosPermitidos: [] },
  { id: 'u3', nome: 'Carla Qualidade', login: 'carla', email: 'carla@exemplo.com', cargo: 'Responsável Técnica', status: 'Ativo', dataCriacao: agora, modulosPermitidos: [] },
];
const nomes = ['Diego Motorista', 'Elisa Ajudante', 'Fábio Motorista', 'Gabriela Expedição', 'Hugo Ajudante', 'Iara Escritório', 'João Motorista', 'Karina Recebimento'];
const setores = ['Farma Aéreo', 'Farma Rodoviário', 'Administrativo'];
const COLABORADORES: any[] = nomes.map((n, i) => ({ id: `c${i}`, nomeCompleto: n, funcaoCargo: n.split(' ')[1], setor: setores[i % 3], status: 'Ativo', telefoneWhatsapp: '84900000000', email: '' }));
const USUARIO_ATUAL = USUARIOS[0];

async function prepararComunicados() {
  const { gerarImagemComunicado } = await import('../../src/components/Comunicados/comunicadoImagem');
  const { montarComunicado } = await import('../../src/components/Comunicados/comunicadoModelos');
  const exemplos = [
    { cat: 'Aviso', modelo: 'aviso', v: { assunto: 'Novo horário de expedição', oQue: 'o horário de saída da expedição passa a ser 6h30', aPartirDe: '2026-10-06', quem: 'motoristas e ajudantes do Farma Rodoviário', acao: 'chegar 10 minutos antes e conferir o checklist do veículo' } },
    { cat: 'Evento', modelo: 'evento', v: { nome: 'Treinamento de Boas Práticas RDC 430', data: '2026-10-10', hora: '08:00', local: 'sala de reunião da base', pauta: ['cadeia fria', 'controle de temperatura'], obrigatorio: true } },
    { cat: 'Segurança', modelo: 'seguranca', v: { tema: 'Uso obrigatório de luva no galpão', risco: 'foram vistos volumes carregados sem luva', regras: ['usar luva em toda carga e descarga', 'trocar a luva rasgada no almoxarifado'], disciplinar: true } },
  ];
  const linhas: any[] = [];
  const dests: any[] = [];
  for (const [i, e] of exemplos.entries()) {
    const m = montarComunicado(e.cat, 'colaboradores', e.v as any);
    const { blob } = await gerarImagemComunicado({ modelo: e.modelo as any, titulo: m.titulo, texto: m.textoImagem, destaque: m.destaque, assinatura: 'Departamento Pessoal', numero: `00${3 - i}/2026` });
    const imagem = await new Promise<string>((r) => {
      const leitor = new FileReader();
      leitor.onload = () => r(leitor.result as string);
      leitor.readAsDataURL(blob);
    });
    const id = `com${i}`;
    linhas.push({ id, numero: 3 - i, ano: 2026, titulo: m.titulo, categoria: e.cat, publico: 'colaboradores', corpo: m.corpo, assinatura: 'Departamento Pessoal', modelo_imagem: e.modelo, destaque: m.destaque, imagem_url: imagem, exige_ciencia: true, criado_por: 'Ana Supervisora', criado_em: new Date(Date.parse(agora) - i * 86400000 * 3).toISOString() });
    COLABORADORES.forEach((c, k) =>
      dests.push({
        id: `${id}-d${k}`,
        comunicado_id: id,
        tipo: 'colaborador',
        ref_id: c.id,
        nome: c.nomeCompleto,
        telefone: c.telefoneWhatsapp,
        email: `${c.nomeCompleto.split(' ')[0].toLowerCase()}@exemplo.com`,
        token: `t${i}${k}`,
        enviado_em: k < 7 ? agora : null,
        canal: 'whatsapp',
        visualizado_em: k < 6 - i ? agora : null,
        ciente_em: k < 4 - i ? agora : null,
      })
    );
  }
  tabelas.comunicados = linhas;
  tabelas.comunicado_destinatarios = dests;
}

const moldura = (filho: React.ReactNode) => <div style={{ padding: 24, background: '#F8FAFC' }}>{filho}</div>;

// ---------------------------------------------------------------------------
// Cenas
// ---------------------------------------------------------------------------
type Cena = { montar: () => Promise<React.ReactNode>; acoes?: () => Promise<void> };

const preencherAviso = async () => {
  await digitar('Ex.: Novo horário de expedição', 'Novo horário de expedição');
  await digitar('Ex.: o horário de saída da expedição', 'o horário de saída da expedição passa a ser 6h30');
  const data = document.querySelector('input[type="date"]') as HTMLInputElement;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(data, '2026-10-06');
  data.dispatchEvent(new Event('input', { bubbles: true }));
  await digitar('Ex.: motoristas e ajudantes', 'motoristas e ajudantes do Farma Rodoviário');
  await digitar('Ex.: chegar 10 minutos antes', 'chegar 10 minutos antes e conferir o checklist do veículo');
  await esperar(2500);
};

const CENAS: Record<string, Cena> = {
  'com-1': {
    montar: async () => {
      await prepararComunicados();
      const { ComunicadosView } = await import('../../src/components/Comunicados/ComunicadosView');
      return moldura(<ComunicadosView colaboradores={COLABORADORES} clientes={[]} currentUser={USUARIO_ATUAL} />);
    },
  },
  'com-2': {
    montar: async () => {
      const { NovoComunicadoModal } = await import('../../src/components/Comunicados/NovoComunicadoModal');
      return <NovoComunicadoModal colaboradores={COLABORADORES} clientes={[]} onClose={() => {}} onCriado={() => {}} />;
    },
    acoes: preencherAviso,
  },
  'com-2b': {
    montar: async () => {
      const { NovoComunicadoModal } = await import('../../src/components/Comunicados/NovoComunicadoModal');
      return <NovoComunicadoModal colaboradores={COLABORADORES} clientes={[]} onClose={() => {}} onCriado={() => {}} />;
    },
    acoes: async () => {
      await preencherAviso();
      // Rola a coluna do formulário até o texto montado.
      achar('Texto que será enviado')?.scrollIntoView({ block: 'center' });
      await esperar(500);
    },
  },
  'com-3': {
    montar: async () => {
      const { NovoComunicadoModal } = await import('../../src/components/Comunicados/NovoComunicadoModal');
      return <NovoComunicadoModal colaboradores={COLABORADORES} clientes={[]} onClose={() => {}} onCriado={() => {}} />;
    },
    acoes: async () => {
      await preencherAviso();
      await clicar('Escolher destinatários');
      await clicar('Marcar os');
    },
  },
  'com-4': {
    montar: async () => {
      await prepararComunicados();
      const { ComunicadosView } = await import('../../src/components/Comunicados/ComunicadosView');
      return moldura(<ComunicadosView colaboradores={COLABORADORES} clientes={[]} currentUser={USUARIO_ATUAL} />);
    },
    acoes: async () => {
      await esperar(800);
      await clicar('Novo horário de expedição');
      await esperar(600);
    },
  },
  'cmp-1': {
    montar: async () => {
      const { ComprasView } = await import('../../src/components/Compras/ComprasView');
      return moldura(<ComprasView solicitacoes={SOLICITACOES} currentUser={USUARIO_ATUAL} isAdmin onSave={() => {}} onDelete={() => {}} onAprovar={() => {}} onRecusar={() => {}} onMarcarComprado={() => {}} onOpenLinkModal={() => {}} />);
    },
  },
  'cmp-2': {
    montar: async () => {
      const { ComprasView } = await import('../../src/components/Compras/ComprasView');
      return moldura(<ComprasView solicitacoes={SOLICITACOES} currentUser={USUARIO_ATUAL} isAdmin onSave={() => {}} onDelete={() => {}} onAprovar={() => {}} onRecusar={() => {}} onMarcarComprado={() => {}} onOpenLinkModal={() => {}} />);
    },
    acoes: async () => {
      await clicar('Nova Solicitação');
      await digitar('Ex: Resma de papel A4', 'Luva nitrílica (caixa com 100)');
    },
  },
  'it-1': {
    montar: async () => moldura(await instrucoesView()),
  },
  'it-2': {
    montar: async () => moldura(await instrucoesView()),
    acoes: async () => {
      await clicar(INSTRUCOES[0].titulo);
      await esperar(500);
    },
  },
  'doc-1': {
    montar: async () => {
      tabelas.documentos_padronizados = DOCUMENTOS;
      const { DocumentosView } = await import('../../src/components/Documentos/DocumentosView');
      return moldura(<DocumentosView currentUser={USUARIO_ATUAL} />);
    },
  },
  'doc-2': {
    montar: async () => {
      const { DocumentoEditor } = await import('../../src/components/Documentos/DocumentoEditor');
      return <DocumentoEditor documento={{ ...DOCUMENTOS[0], blocos: BLOCOS_DOC, status: 'Rascunho', responsavel: 'Ana Supervisora', aprovadoPor: '' } as any} onVoltar={() => {}} onSalvo={() => {}} />;
    },
  },
  'chat-1': {
    montar: async () => {
      tabelas.chat_mensagens = MENSAGENS;
      const { ChatView } = await import('../../src/components/Chat/ChatView');
      return moldura(
        <ChatView
          usuarios={USUARIOS}
          currentUserId="u1"
          conversas={CONVERSAS}
          ultimasLeituras={{}}
          onAbrirConversa={() => {}}
          onEnviarMensagem={() => {}}
          onCriarConversaDireta={() => {}}
          onCriarConversaGrupo={() => {}}
          onExcluirConversa={() => {}}
        />
      );
    },
    acoes: async () => {
      await clicar('Bruno Departamento Pessoal');
      await esperar(800);
    },
  },
  'notas-1': {
    montar: async () => {
      const { INITIAL_NOTAS_PAGINAS } = await import('../../src/data/initialNotasData');
      const { NotasView } = await import('../../src/components/Notas/NotasView');
      const paginas = INITIAL_NOTAS_PAGINAS.map((p) => ({ ...p, autor: 'Ana Supervisora' }));
      return moldura(
        <NotasView paginas={paginas} onSavePagina={() => {}} onDeletePagina={() => {}} currentUserName="Ana Supervisora" clientes={[]} colaboradores={[]} projetos={[]} embarquesAereos={[]} viagensRodoviarias={[]} ocorrencias={[]} atividadesGestao={[]} usuarios={USUARIOS} />
      );
    },
    acoes: async () => {
      await clicar('Bem-vindo às Notas JMT');
    },
  },
};

const SOLICITACOES: any[] = [
  { id: 's1', item: 'Luva nitrílica (caixa com 100)', quantidade: 10, setor: 'Farma Aéreo', justificativa: 'Reposição do estoque do galpão', valorEstimado: 45, urgencia: 'Urgente', solicitanteNome: 'Ana Supervisora', status: 'Pendente', criadoEm: agora },
  { id: 's2', item: 'Resma de papel A4', quantidade: 5, setor: 'Departamento Pessoal', valorEstimado: 28, urgencia: 'Normal', solicitanteNome: 'Bruno Departamento Pessoal', status: 'Aprovado', aprovadoPor: 'Diretoria', criadoEm: agora },
  { id: 's3', item: 'Bateria para termômetro digital', quantidade: 4, setor: 'Qualidade', valorEstimado: 12, urgencia: 'Normal', solicitanteNome: 'Carla Qualidade', status: 'Comprado', criadoEm: agora },
];

let INSTRUCOES: any[] = [];
async function instrucoesView() {
  const { INITIAL_INSTRUCOES_TRABALHO } = await import('../../src/data/initialInstrucoesData');
  const trocar = (s?: string) => (s && /^[A-ZÁ-Ú][a-zá-ú]+ [A-ZÁ-Ú]/.test(s) && !/Supervisor|Motorista|Coletador|Gestor|Analista|Responsável/.test(s) ? 'Ana Supervisora' : s);
  INSTRUCOES = INITIAL_INSTRUCOES_TRABALHO.map((i: any) => ({
    ...i,
    status: 'Vigente',
    responsavel: trocar(i.responsavel),
    aprovadoPor: trocar(i.aprovadoPor),
    autor: trocar(i.autor),
    responsabilidades: (i.responsabilidades || []).map((r: any) => ({ ...r, responsavel: trocar(r.responsavel) })),
  }));
  const { InstrucoesTrabalhoView } = await import('../../src/components/Instrucoes/InstrucoesTrabalhoView');
  return (
    <InstrucoesTrabalhoView instrucoes={INSTRUCOES} onSaveInstrucao={() => {}} onDeleteInstrucao={() => {}} currentUserName="Ana Supervisora" clientes={[]} colaboradores={[]} projetos={[]} embarquesAereos={[]} viagensRodoviarias={[]} ocorrencias={[]} atividadesGestao={[]} usuarios={USUARIOS} />
  );
}

const DOCUMENTOS: any[] = [
  { id: 'd1', codigo: 'DOC-OPE-001', titulo: 'Procedimento de conferência de carga refrigerada', tipo: 'Procedimento', setor: 'OPE', versao: 2, status: 'Vigente', classificacao: 'Uso interno', responsavel: 'Ana Supervisora', aprovado_por: 'Diretoria', data_documento: '2026-09-15', origem_arquivo: 'conferencia_carga.docx', origem_tipo: 'docx', criado_em: agora, atualizado_em: agora, blocos: [] },
  { id: 'd2', codigo: 'DOC-QUA-001', titulo: 'Registro de temperatura dos baús', tipo: 'Formulário', setor: 'QUA', versao: 1, status: 'Rascunho', classificacao: 'Uso interno', responsavel: 'Carla Qualidade', data_documento: '2026-10-01', origem_arquivo: 'registro_temperatura.xlsx', origem_tipo: 'xlsx', criado_em: agora, atualizado_em: agora, blocos: [] },
  { id: 'd3', codigo: 'DOC-DP-001', titulo: 'Política de uso de uniforme e EPI', tipo: 'Política', setor: 'DP', versao: 1, status: 'Vigente', classificacao: 'Uso interno', responsavel: 'Bruno Departamento Pessoal', aprovado_por: 'Diretoria', data_documento: '2026-09-20', origem_arquivo: 'uniforme.pdf', origem_tipo: 'pdf', criado_em: agora, atualizado_em: agora, blocos: [] },
];
const BLOCOS_DOC: any[] = [
  { id: 'b1', tipo: 'titulo', nivel: 1, texto: 'Objetivo' },
  { id: 'b2', tipo: 'paragrafo', texto: 'Garantir que toda carga refrigerada seja conferida  na chegada , com registro da temperatura em 2/10/26.' },
  { id: 'b3', tipo: 'titulo', nivel: 1, texto: 'Passo a passo' },
  { id: 'b4', tipo: 'lista', ordenada: true, itens: ['Conferir a etiqueta e o lacre', 'Medir a temperatura do volume', 'Registrar no formulário DOC-QUA-001'] },
];

const CONVERSAS: any[] = [
  { id: 'cv1', tipo: 'direta', criadoEm: agora, atualizadoEm: agora, participantesIds: ['u1', 'u2'] },
  { id: 'cv2', tipo: 'grupo', nome: 'Supervisores', criadoEm: agora, atualizadoEm: new Date(Date.parse(agora) - 3600000).toISOString(), participantesIds: ['u1', 'u2', 'u3'] },
];
const MENSAGENS: any[] = [
  { id: 'm1', conversa_id: 'cv1', autor_id: 'u2', texto: 'Bom dia! Os espelhos de setembro já estão no sistema para assinatura.', criado_em: new Date(Date.parse(agora) - 1800000).toISOString() },
  { id: 'm2', conversa_id: 'cv1', autor_id: 'u1', texto: 'Ótimo, vou pedir para a equipe assinar hoje.', criado_em: new Date(Date.parse(agora) - 1500000).toISOString() },
  { id: 'm3', conversa_id: 'cv1', autor_id: 'u2', texto: 'Obrigado! Qualquer dúvida, me chama aqui.', criado_em: new Date(Date.parse(agora) - 1200000).toISOString() },
];

// ---------------------------------------------------------------------------
(async () => {
  const id = new URLSearchParams(location.search).get('cena') || '';
  const tela = TELAS_TREINAMENTO.find((t) => t.id === id);
  const cena = CENAS[id];
  if (!tela || !cena) {
    document.body.innerHTML = `<p style="font:14px Arial;padding:20px">Cenas: ${Object.keys(CENAS).join(', ')}</p>`;
    return;
  }
  createRoot(document.getElementById('root')!).render(await cena.montar());
  await document.fonts?.ready;
  await esperar(1500);
  if (cena.acoes) await cena.acoes();
  await esperar(500);
  desenharMarcas(tela.marcas.map((m) => m.alvo));
  // Altura útil da captura: até o fim do conteúdo (ou das marcas); modal ocupa a tela toda.
  const fixo = document.querySelector('.fixed.inset-0');
  const fundos = [document.getElementById('root')!.scrollHeight, ...Array.from(document.querySelectorAll('[data-marcas] > div')).map((d) => d.getBoundingClientRect().bottom)];
  (window as any).__altura = fixo ? window.innerHeight : Math.min(window.innerHeight, Math.max(380, ...fundos) + 24);
  document.title = 'PRONTO';
})();
