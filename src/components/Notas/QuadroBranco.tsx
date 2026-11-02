import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeResizer,
  NodeToolbar,
  ConnectionMode,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  getNodesBounds,
  getViewportForBounds,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeftRight,
  Circle,
  Copy,
  Database,
  Diamond,
  Download,
  FileText,
  LayoutTemplate,
  Loader2,
  Maximize2,
  Minimize2,
  Redo2,
  RectangleHorizontal,
  Rows3,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  Pill,
  Check,
} from 'lucide-react';
import type { NotaPagina, QuadroAresta, QuadroDados, QuadroNo, TipoFormaQuadro } from '../../types';

// ============================================================================
// Quadro (mapa / fluxograma estilo Miro) dentro de Notas & Ideias. As formas e setas
// ficam em NotaPagina.quadro (migração 089) e são salvas sozinhas a cada mudança.
// ============================================================================

const CORES = ['#FFFFFF', '#FEF3C7', '#FEF08A', '#DCFCE7', '#DBEAFE', '#EDE9FE', '#FCE7F3', '#FEE2E2', '#F1F5F9'];

const FORMAS: { tipo: TipoFormaQuadro; rotulo: string; icone: React.ElementType; largura: number; altura: number; cor?: string; texto: string }[] = [
  { tipo: 'etapa', rotulo: 'Etapa', icone: RectangleHorizontal, largura: 170, altura: 70, texto: 'Etapa' },
  { tipo: 'decisao', rotulo: 'Decisão', icone: Diamond, largura: 150, altura: 110, texto: 'Decisão?' },
  { tipo: 'inicio', rotulo: 'Início / fim', icone: Pill, largura: 150, altura: 56, cor: '#DCFCE7', texto: 'Início' },
  { tipo: 'documento', rotulo: 'Documento', icone: FileText, largura: 160, altura: 80, texto: 'Documento' },
  { tipo: 'dados', rotulo: 'Entrada / saída', icone: Database, largura: 170, altura: 70, texto: 'Dados' },
  { tipo: 'circulo', rotulo: 'Círculo', icone: Circle, largura: 100, altura: 100, texto: '' },
  { tipo: 'nota', rotulo: 'Nota adesiva', icone: StickyNote, largura: 160, altura: 140, cor: '#FEF08A', texto: '' },
  { tipo: 'texto', rotulo: 'Texto', icone: Type, largura: 200, altura: 50, texto: 'Texto' },
  { tipo: 'raia', rotulo: 'Raia (setor)', icone: Rows3, largura: 900, altura: 200, cor: '#F8FAFC', texto: 'Setor' },
];

type DadosForma = { tipo: TipoFormaQuadro; texto: string; cor?: string; aoMudarTexto: (t: string) => void };

let seq = 0;
const novoId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

// ---------------------------------------------------------------------------
// Forma (nó)
// ---------------------------------------------------------------------------
const ALCAS: { id: string; pos: Position }[] = [
  { id: 't', pos: Position.Top },
  { id: 'r', pos: Position.Right },
  { id: 'b', pos: Position.Bottom },
  { id: 'l', pos: Position.Left },
];

const FormaNode: React.FC<NodeProps<Node<DadosForma>>> = ({ data, selected }) => {
  const { tipo, texto, cor } = data;
  const fundo = cor || '#FFFFFF';
  const borda = selected ? '#C48229' : '#94A3B8';
  const caixaTexto = (classe = '') => (
    <textarea
      value={texto}
      onChange={(e) => data.aoMudarTexto(e.target.value)}
      placeholder={tipo === 'nota' ? 'Escreva aqui...' : ''}
      className={`nodrag nowheel w-full h-full resize-none bg-transparent border-none outline-hidden text-slate-800 placeholder-slate-400 ${classe}`}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
  const centro = (conteudo: React.ReactNode) => <div className="absolute inset-0 flex items-center justify-center p-3">{conteudo}</div>;
  const textoCentro = caixaTexto('text-center text-[13px] font-semibold leading-snug flex items-center');

  let corpo: React.ReactNode;
  if (tipo === 'decisao' || tipo === 'dados' || tipo === 'documento') {
    const forma =
      tipo === 'decisao' ? (
        <polygon points="50,2 98,50 50,98 2,50" fill={fundo} stroke={borda} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ) : tipo === 'dados' ? (
        <polygon points="14,2 98,2 86,98 2,98" fill={fundo} stroke={borda} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ) : (
        <path d="M2,2 H98 V84 C80,96 64,72 50,84 C36,96 20,72 2,84 Z" fill={fundo} stroke={borda} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      );
    corpo = (
      <>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {forma}
        </svg>
        <div className={`absolute flex items-center justify-center ${tipo === 'decisao' ? 'inset-[22%]' : 'inset-x-[12%] inset-y-[10%]'}`}>{textoCentro}</div>
      </>
    );
  } else if (tipo === 'nota') {
    corpo = (
      <div className="absolute inset-0 p-3 shadow-md" style={{ background: fundo, border: selected ? `2px solid ${borda}` : 'none' }}>
        {caixaTexto('text-[13px] leading-snug')}
      </div>
    );
  } else if (tipo === 'texto') {
    corpo = <div className="absolute inset-0 p-1" style={{ outline: selected ? `1px dashed ${borda}` : 'none' }}>{caixaTexto('text-[15px] font-bold')}</div>;
  } else if (tipo === 'raia') {
    corpo = (
      <div className="absolute inset-0 rounded-xl flex" style={{ background: fundo, border: `2px solid ${selected ? borda : '#CBD5E1'}` }}>
        <div className="w-10 shrink-0 bg-slate-200/70 rounded-l-[10px] flex items-center justify-center">
          <textarea
            value={texto}
            onChange={(e) => data.aoMudarTexto(e.target.value)}
            className="nodrag w-[160px] -rotate-90 bg-transparent border-none outline-hidden resize-none text-center text-xs font-black uppercase tracking-wide text-slate-600"
            rows={1}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    );
  } else {
    const raio = tipo === 'inicio' ? 'rounded-full' : tipo === 'circulo' ? 'rounded-full' : 'rounded-xl';
    corpo = (
      <div className={`absolute inset-0 ${raio}`} style={{ background: fundo, border: `2px solid ${borda}` }}>
        {centro(textoCentro)}
      </div>
    );
  }

  return (
    <div className="quadro-forma relative w-full h-full">
      <NodeResizer isVisible={selected} minWidth={tipo === 'raia' ? 300 : 40} minHeight={tipo === 'raia' ? 100 : 30} lineClassName="!border-[#C48229]" handleClassName="!bg-white !border-[#C48229] !w-2.5 !h-2.5" />
      {corpo}
      {tipo !== 'raia' &&
        ALCAS.map((a) => <Handle key={a.id} id={a.id} type="source" position={a.pos} className="quadro-alca !w-3 !h-3 !bg-[#C48229] !border-2 !border-white" />)}
    </div>
  );
};

const nodeTypes = { forma: FormaNode };

// ---------------------------------------------------------------------------
// Conversões quadro <-> React Flow
// ---------------------------------------------------------------------------
const estiloAresta = (a: Pick<QuadroAresta, 'tracejada' | 'semSeta'>) => ({
  style: { stroke: '#475569', strokeWidth: 2, ...(a.tracejada ? { strokeDasharray: '6 4' } : {}) },
  markerEnd: a.semSeta ? undefined : { type: MarkerType.ArrowClosed, color: '#475569', width: 18, height: 18 },
});

function paraArestaRF(a: QuadroAresta): Edge {
  return {
    id: a.id,
    source: a.origem,
    target: a.destino,
    sourceHandle: a.origemLado,
    targetHandle: a.destinoLado,
    type: 'smoothstep',
    label: a.rotulo,
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 6,
    labelStyle: { fontSize: 12, fontWeight: 600, fill: '#334155' },
    data: { tracejada: !!a.tracejada, semSeta: !!a.semSeta },
    ...estiloAresta(a),
  };
}

// ---------------------------------------------------------------------------
// Modelos prontos
// ---------------------------------------------------------------------------
const no = (tipo: TipoFormaQuadro, x: number, y: number, texto: string, extra: Partial<QuadroNo> = {}): QuadroNo => {
  const f = FORMAS.find((x2) => x2.tipo === tipo)!;
  return { id: novoId('no'), tipo, x, y, largura: f.largura, altura: f.altura, texto, cor: f.cor, ...extra };
};
const liga = (a: QuadroNo, b: QuadroNo, rotulo?: string, origemLado = 'r', destinoLado = 'l'): QuadroAresta => ({ id: novoId('ar'), origem: a.id, destino: b.id, origemLado, destinoLado, rotulo });

const MODELOS: { nome: string; descricao: string; montar: () => QuadroDados }[] = [
  {
    nome: 'Fluxograma de processo',
    descricao: 'Início, etapas, uma decisão e fim',
    montar: () => {
      const ini = no('inicio', 0, 40, 'Início');
      const e1 = no('etapa', 220, 33, 'Receber o pedido');
      const d = no('decisao', 460, 13, 'Documentação ok?');
      const e2 = no('etapa', 680, 33, 'Separar e expedir');
      const e3 = no('etapa', 445, 220, 'Solicitar correção');
      const fim = no('inicio', 920, 40, 'Fim', { cor: '#FEE2E2' });
      return {
        nos: [ini, e1, d, e2, e3, fim],
        arestas: [liga(ini, e1), liga(e1, d), liga(d, e2, 'Sim'), liga(d, e3, 'Não', 'b', 't'), { ...liga(e3, e1, undefined, 'l', 'b') }, liga(e2, fim)],
      };
    },
  },
  {
    nome: 'Raias por setor',
    descricao: 'Fluxo entre setores (Comercial, Operação, Financeiro)',
    montar: () => {
      const r1 = no('raia', 0, 0, 'Comercial', { largura: 1000, altura: 170, z: -1 });
      const r2 = no('raia', 0, 180, 'Operação', { largura: 1000, altura: 170, z: -1, cor: '#FFFBEB' });
      const r3 = no('raia', 0, 360, 'Financeiro', { largura: 1000, altura: 170, z: -1, cor: '#F0FDF4' });
      const a = no('etapa', 80, 50, 'Fechar o contrato');
      const b = no('etapa', 330, 230, 'Programar a coleta');
      const c = no('etapa', 580, 230, 'Entregar e baixar o CT-e');
      const dd = no('etapa', 820, 410, 'Faturar e cobrar');
      return { nos: [r1, r2, r3, a, b, c, dd], arestas: [liga(a, b, undefined, 'b', 'l'), liga(b, c), liga(c, dd, undefined, 'b', 'l')] };
    },
  },
  {
    nome: 'Mapa mental',
    descricao: 'Ideia central com ramos',
    montar: () => {
      const c = no('circulo', 420, 200, 'Ideia central', { largura: 150, altura: 150, cor: '#FEF3C7' });
      const ramos = [
        no('nota', 120, 20, 'Ramo 1'),
        no('nota', 720, 20, 'Ramo 2', { cor: '#DBEAFE' }),
        no('nota', 120, 380, 'Ramo 3', { cor: '#DCFCE7' }),
        no('nota', 720, 380, 'Ramo 4', { cor: '#FCE7F3' }),
      ];
      return {
        nos: [c, ...ramos],
        arestas: [
          liga(c, ramos[0], undefined, 'l', 'r'),
          liga(c, ramos[1], undefined, 'r', 'l'),
          liga(c, ramos[2], undefined, 'l', 'r'),
          liga(c, ramos[3], undefined, 'r', 'l'),
        ].map((a) => ({ ...a, semSeta: true })),
      };
    },
  },
  {
    nome: 'SIPOC',
    descricao: 'Fornecedores, entradas, processo, saídas e clientes',
    montar: () => {
      const cols = ['Fornecedores', 'Entradas', 'Processo', 'Saídas', 'Clientes'];
      const nos = cols.flatMap((t, i) => [
        no('texto', i * 210, 0, t, { largura: 190 }),
        no('nota', i * 210, 60, '', { largura: 190, altura: 260, cor: CORES[(i % 6) + 1] }),
      ]);
      return { nos, arestas: [] };
    },
  },
];

// ---------------------------------------------------------------------------
// Quadro
// ---------------------------------------------------------------------------
const QuadroInterno: React.FC<{ pagina: NotaPagina; onSave: (p: NotaPagina) => void; onDelete?: () => void }> = ({ pagina, onSave, onDelete }) => {
  const rf = useReactFlow();
  const [titulo, setTitulo] = useState(pagina.titulo);
  const [estado, setEstado] = useState<'salvo' | 'salvando'>('salvo');
  const [telaCheia, setTelaCheia] = useState(false);
  const [modelosAbertos, setModelosAbertos] = useState(false);
  const [exportando, setExportando] = useState(false);
  const envelopeRef = useRef<HTMLDivElement>(null);

  const mudarTexto = useCallback((id: string, texto: string) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, texto } } : n))), []); // eslint-disable-line react-hooks/exhaustive-deps

  const paraNoRF = useCallback(
    (q: QuadroNo): Node<DadosForma> => ({
      id: q.id,
      type: 'forma',
      position: { x: q.x, y: q.y },
      width: q.largura,
      height: q.altura,
      zIndex: q.tipo === 'raia' ? -1 : q.z || 0,
      data: { tipo: q.tipo, texto: q.texto, cor: q.cor, aoMudarTexto: (t: string) => mudarTexto(q.id, t) },
    }),
    [mudarTexto]
  );

  const inicial = pagina.quadro || { nos: [], arestas: [] };
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DadosForma>>(inicial.nos.map(paraNoRF));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(inicial.arestas.map(paraArestaRF));

  // Estado "puro" do quadro (o que é salvo).
  const dados = useMemo<QuadroDados>(
    () => ({
      nos: nodes.map((n) => ({
        id: n.id,
        tipo: n.data.tipo,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        largura: Math.round(n.width ?? n.measured?.width ?? 150),
        altura: Math.round(n.height ?? n.measured?.height ?? 60),
        texto: n.data.texto,
        cor: n.data.cor,
        z: n.zIndex || undefined,
      })),
      arestas: edges.map((e) => ({
        id: e.id,
        origem: e.source,
        destino: e.target,
        origemLado: e.sourceHandle || undefined,
        destinoLado: e.targetHandle || undefined,
        rotulo: typeof e.label === 'string' && e.label ? e.label : undefined,
        tracejada: !!(e.data as any)?.tracejada,
        semSeta: !!(e.data as any)?.semSeta,
      })),
    }),
    [nodes, edges]
  );
  const json = JSON.stringify(dados);

  // Salvar sozinho (1,2s depois da última mudança).
  const ultimoSalvo = useRef(JSON.stringify(inicial));
  const tituloSalvo = useRef(pagina.titulo);
  useEffect(() => {
    if (json === ultimoSalvo.current && titulo === tituloSalvo.current) return;
    setEstado('salvando');
    const t = window.setTimeout(() => {
      ultimoSalvo.current = json;
      tituloSalvo.current = titulo;
      onSave({ ...pagina, titulo, tipo: 'quadro', quadro: JSON.parse(json) });
      setEstado('salvo');
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, titulo]);

  // Desfazer / refazer (fotografias do quadro).
  const historico = useRef<string[]>([JSON.stringify(inicial)]);
  const futuro = useRef<string[]>([]);
  const aplicando = useRef(false);
  useEffect(() => {
    if (aplicando.current) {
      aplicando.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      if (historico.current[historico.current.length - 1] === json) return;
      historico.current.push(json);
      if (historico.current.length > 80) historico.current.shift();
      futuro.current = [];
    }, 500);
    return () => window.clearTimeout(t);
  }, [json]);
  const aplicar = (snap: string) => {
    const d: QuadroDados = JSON.parse(snap);
    aplicando.current = true;
    setNodes(d.nos.map(paraNoRF));
    setEdges(d.arestas.map(paraArestaRF));
  };
  const desfazer = () => {
    if (historico.current.length < 2) return;
    futuro.current.push(historico.current.pop() as string);
    aplicar(historico.current[historico.current.length - 1]);
  };
  const refazer = () => {
    const s = futuro.current.pop();
    if (!s) return;
    historico.current.push(s);
    aplicar(s);
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.tagName === 'TEXTAREA' || alvo.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) refazer();
        else desfazer();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        refazer();
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const adicionar = (tipo: TipoFormaQuadro) => {
    const f = FORMAS.find((x) => x.tipo === tipo)!;
    const caixa = envelopeRef.current?.getBoundingClientRect();
    const centro = rf.screenToFlowPosition({ x: (caixa?.left || 0) + (caixa?.width || 600) / 2, y: (caixa?.top || 0) + (caixa?.height || 400) / 2 });
    const q: QuadroNo = { id: novoId('no'), tipo, x: centro.x - f.largura / 2 + (seq % 5) * 12, y: centro.y - f.altura / 2 + (seq % 5) * 12, largura: f.largura, altura: f.altura, texto: f.texto, cor: f.cor };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...paraNoRF(q), selected: true }]);
  };

  const onConnect = useCallback(
    (c: Connection) => setEdges((es) => addEdge({ ...paraArestaRF({ id: novoId('ar'), origem: c.source, destino: c.target, origemLado: c.sourceHandle || undefined, destinoLado: c.targetHandle || undefined }) }, es)),
    [setEdges]
  );

  const selecionados = nodes.filter((n) => n.selected);
  const arestaSel = edges.find((e) => e.selected);

  const pintar = (cor: string) => setNodes((ns) => ns.map((n) => (n.selected ? { ...n, data: { ...n.data, cor } } : n)));
  const duplicar = () => {
    const novos = selecionados.map((n) => ({ ...paraNoRF({ ...dados.nos.find((q) => q.id === n.id)!, id: novoId('no'), x: n.position.x + 30, y: n.position.y + 30 }), selected: true }));
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), ...novos]);
  };
  const apagarSelecao = () => {
    const ids = new Set(selecionados.map((n) => n.id));
    setNodes((ns) => ns.filter((n) => !n.selected));
    setEdges((es) => es.filter((e) => !e.selected && !ids.has(e.source) && !ids.has(e.target)));
  };
  const camada = (frente: boolean) => setNodes((ns) => ns.map((n) => (n.selected && n.data.tipo !== 'raia' ? { ...n, zIndex: (n.zIndex || 0) + (frente ? 1 : -1) } : n)));

  const mudarAresta = (patch: { rotulo?: string; tracejada?: boolean; semSeta?: boolean }) =>
    setEdges((es) =>
      es.map((e) => {
        if (!e.selected) return e;
        const atual = { tracejada: !!(e.data as any)?.tracejada, semSeta: !!(e.data as any)?.semSeta };
        const novo = { ...atual, ...('tracejada' in patch ? { tracejada: patch.tracejada } : {}), ...('semSeta' in patch ? { semSeta: patch.semSeta } : {}) };
        return { ...e, ...('rotulo' in patch ? { label: patch.rotulo } : {}), data: novo, ...estiloAresta(novo as any) };
      })
    );

  const aplicarModelo = (m: (typeof MODELOS)[number]) => {
    const d = m.montar();
    if (nodes.length && !window.confirm('Juntar o modelo ao que já está no quadro? (Cancelar = não aplicar)')) return;
    // Coloca o modelo à direita do que já existe.
    const deslocX = nodes.length ? Math.max(...dados.nos.map((q) => q.x + q.largura)) + 120 : 0;
    setNodes((ns) => [...ns, ...d.nos.map((q) => paraNoRF({ ...q, x: q.x + deslocX }))]);
    setEdges((es) => [...es, ...d.arestas.map(paraArestaRF)]);
    setModelosAbertos(false);
    setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 50);
  };

  const exportarPng = async () => {
    if (!nodes.length) return;
    setExportando(true);
    try {
      const { toPng } = await import('html-to-image');
      const limites = getNodesBounds(nodes);
      const largura = Math.min(4000, Math.max(800, limites.width + 160));
      const altura = Math.min(4000, Math.max(500, limites.height + 160));
      const vp = getViewportForBounds(limites, largura, altura, 0.2, 2, 0.08);
      const alvo = envelopeRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null;
      if (!alvo) return;
      const url = await toPng(alvo, {
        backgroundColor: '#ffffff',
        width: largura,
        height: altura,
        style: { width: `${largura}px`, height: `${altura}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
        filter: (el) => !(el instanceof HTMLElement && (el.classList?.contains('react-flow__resize-control') || el.classList?.contains('quadro-alca'))),
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(titulo || 'quadro').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_')}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      alert('Não foi possível gerar a imagem.');
    } finally {
      setExportando(false);
    }
  };

  const botaoBarra = 'p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30';

  return (
    <div
      ref={envelopeRef}
      data-texto-livre="true"
      className={telaCheia ? 'fixed inset-0 z-[70] bg-white flex flex-col' : 'flex flex-col h-[calc(100vh-11rem)] min-h-[480px] rounded-2xl border border-slate-200 overflow-hidden bg-white'}
    >
      {/* Barra de cima */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white shrink-0">
        <span className="text-lg">🧭</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Quadro sem título" data-no-uppercase="true" className="flex-1 min-w-0 text-sm font-black text-slate-900 bg-transparent outline-hidden" />
        <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
          {estado === 'salvando' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-600" />}
          {estado === 'salvando' ? 'Salvando...' : 'Salvo'}
        </span>
        <button type="button" onClick={desfazer} className={botaoBarra} title="Desfazer (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={refazer} className={botaoBarra} title="Refazer (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="relative">
          <button type="button" onClick={() => setModelosAbertos((v) => !v)} className={botaoBarra} title="Modelos prontos">
            <LayoutTemplate className="w-4 h-4" />
          </button>
          {modelosAbertos && (
            <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5">
              {MODELOS.map((m) => (
                <button key={m.nome} type="button" onClick={() => aplicarModelo(m)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 normal-case tracking-normal">
                  <span className="block text-xs font-bold text-slate-800">{m.nome}</span>
                  <span className="block text-[11px] text-slate-500">{m.descricao}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={exportarPng} disabled={exportando || !nodes.length} className={botaoBarra} title="Baixar como imagem (PNG)">
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => setTelaCheia((v) => !v)} className={botaoBarra} title={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}>
          {telaCheia ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete} className={`${botaoBarra} hover:text-rose-600`} title="Excluir quadro">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative flex-1 min-h-0">
        {/* Formas */}
        <div className="absolute left-2 top-2 z-10 bg-white border border-slate-200 rounded-2xl shadow-lg p-1 flex flex-col gap-0.5 max-h-[calc(100%-1rem)] overflow-y-auto">
          {FORMAS.map((f) => {
            const Icone = f.icone;
            return (
              <button key={f.tipo} type="button" onClick={() => adicionar(f.tipo)} className="p-2 rounded-xl text-slate-600 hover:bg-amber-50 hover:text-[#92611F]" title={`Adicionar: ${f.rotulo}`}>
                <Icone className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        {/* Seleção: cor, duplicar, camadas, apagar */}
        {(selecionados.length > 0 || arestaSel) && (
          <div className="absolute left-1/2 -translate-x-1/2 top-2 z-10 bg-white border border-slate-200 rounded-2xl shadow-lg px-2 py-1.5 flex items-center gap-1 max-w-[calc(100%-5rem)] overflow-x-auto">
            {selecionados.length > 0 ? (
              <>
                {CORES.map((c) => (
                  <button key={c} type="button" onClick={() => pintar(c)} className="w-6 h-6 rounded-full border border-slate-300 shrink-0" style={{ background: c }} title="Cor" />
                ))}
                <span className="w-px h-6 bg-slate-200 mx-1" />
                <button type="button" onClick={duplicar} className={botaoBarra} title="Duplicar">
                  <Copy className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => camada(true)} className={`${botaoBarra} text-[10px] font-black`} title="Trazer para a frente">
                  ↑
                </button>
                <button type="button" onClick={() => camada(false)} className={`${botaoBarra} text-[10px] font-black`} title="Mandar para trás">
                  ↓
                </button>
                <button type="button" onClick={apagarSelecao} className={`${botaoBarra} hover:text-rose-600`} title="Apagar (Delete)">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : arestaSel ? (
              <>
                <input
                  value={typeof arestaSel.label === 'string' ? arestaSel.label : ''}
                  onChange={(e) => mudarAresta({ rotulo: e.target.value })}
                  placeholder="Texto na seta (ex.: Sim)"
                  data-no-uppercase="true"
                  className="w-40 px-2 py-1 border border-slate-200 rounded-lg text-xs"
                />
                <button type="button" onClick={() => mudarAresta({ tracejada: !(arestaSel.data as any)?.tracejada })} className={`${botaoBarra} text-[11px] font-bold normal-case tracking-normal`} title="Linha tracejada">
                  - - -
                </button>
                <button type="button" onClick={() => mudarAresta({ semSeta: !(arestaSel.data as any)?.semSeta })} className={botaoBarra} title="Com / sem seta">
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setEdges((es) => es.filter((e) => !e.selected))} className={`${botaoBarra} hover:text-rose-600`} title="Apagar seta">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : null}
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          snapToGrid
          snapGrid={[10, 10]}
          deleteKeyCode={['Delete', 'Backspace']}
          multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
          fitView={nodes.length > 0}
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          className="quadro-branco"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#CBD5E1" />
          <Controls showInteractive={false} position="bottom-right" />
          <MiniMap pannable zoomable position="bottom-left" className="!hidden sm:!block" nodeColor={(n) => (n.data as DadosForma)?.cor || '#E2E8F0'} />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center text-slate-400 text-sm space-y-1 px-6">
              <p className="font-bold text-slate-500">Quadro em branco</p>
              <p>Use as formas à esquerda ou um modelo pronto (ícone de modelos, no alto).</p>
              <p className="text-xs">Para ligar duas formas, arraste a partir do ponto dourado na borda de uma até a outra.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Quadro de mapa / fluxograma (estilo Miro) de uma página das Notas. */
export const QuadroBranco: React.FC<{ pagina: NotaPagina; onSave: (p: NotaPagina) => void; onDelete?: () => void }> = (props) => (
  <ReactFlowProvider>
    <QuadroInterno {...props} />
  </ReactFlowProvider>
);
