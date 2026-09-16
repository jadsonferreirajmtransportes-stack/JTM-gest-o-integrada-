import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, X } from 'lucide-react';
import { FluxogramaNo, FluxogramaConexao } from '../../types';

interface FluxogramaBlockProps {
  nos: FluxogramaNo[];
  conexoes: FluxogramaConexao[];
  onChange: (nos: FluxogramaNo[], conexoes: FluxogramaConexao[]) => void;
}

type EtapaData = { label: string; onLabelChange: (valor: string) => void; onDelete: () => void };

/** Caixa de etapa arrastável, com o texto editável direto na caixa e um "x" pra remover
 *  (aparece ao passar o mouse). Handles nos 4 lados — dá pra montar fluxo vertical ou horizontal. */
const EtapaNode: React.FC<NodeProps<Node<EtapaData>>> = ({ data, selected }) => {
  return (
    <div
      className={`group relative min-w-[130px] rounded-xl border-2 bg-white px-3.5 py-2.5 text-center shadow-xs transition-colors ${
        selected ? 'border-[#B38F4F] shadow-md' : 'border-slate-300'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#B38F4F] !border-white" />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-2 !h-2 !bg-[#B38F4F] !border-white"
      />
      <textarea
        value={data.label}
        onChange={(e) => data.onLabelChange(e.target.value)}
        placeholder="Etapa..."
        rows={1}
        className="nodrag w-full resize-none border-none bg-transparent text-center text-xs font-medium text-slate-700 placeholder-slate-300 outline-hidden"
        onPointerDown={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={data.onDelete}
        className="absolute -top-2 -right-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
        title="Remover etapa"
      >
        <X className="w-3 h-3" />
      </button>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#B38F4F] !border-white" />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-2 !h-2 !bg-[#B38F4F] !border-white"
      />
    </div>
  );
};

const nodeTypes = { etapa: EtapaNode };

const paraNode = (n: FluxogramaNo): Node<EtapaData> => ({
  id: n.id,
  type: 'etapa',
  position: { x: n.x, y: n.y },
  data: { label: n.texto, onLabelChange: () => {}, onDelete: () => {} },
});

const paraEdge = (c: FluxogramaConexao): Edge => ({
  id: c.id,
  source: c.origemId,
  target: c.destinoId,
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
  style: { stroke: '#94a3b8', strokeWidth: 1.5 },
});

const FluxogramaCanvas: React.FC<FluxogramaBlockProps> = ({ nos, conexoes, onChange }) => {
  // Semente inicial única (montagem) — depois disso o estado vive no React Flow; mudanças
  // voltam pro dono via `onChange` (debounced) em vez de re-sincronizar a cada prop.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EtapaData>>(nos.map(paraNode));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(conexoes.map(paraEdge));
  const { deleteElements } = useReactFlow();

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const latestRef = useRef({ nodes, edges });
  latestRef.current = { nodes, edges };

  const serializar = useCallback((ns: Node<EtapaData>[], es: Edge[]) => {
    onChangeRef.current(
      ns.map((n) => ({ id: n.id, texto: n.data.label || '', x: n.position.x, y: n.position.y })),
      es.map((e) => ({ id: e.id, origemId: e.source, destinoId: e.target }))
    );
  }, []);

  // Salva com um pequeno atraso após qualquer mudança (arrastar, digitar, conectar, excluir)
  // — evita gravar a cada pixel de um arraste, mas ainda assim persiste rápido o suficiente.
  useEffect(() => {
    const timer = setTimeout(() => serializar(nodes, edges), 400);
    return () => clearTimeout(timer);
  }, [nodes, edges, serializar]);

  // Garante que a última alteração não se perca se a página for trocada antes do timer acima disparar.
  useEffect(() => {
    return () => serializar(latestRef.current.nodes, latestRef.current.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLabelChange = useCallback(
    (id: string, valor: string) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: valor } } : n)));
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      deleteElements({ nodes: [{ id }] });
    },
    [deleteElements]
  );

  // Injeta os callbacks (fecham sobre o id de cada nó) a cada render.
  const nodesComHandlers = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onLabelChange: (v: string) => handleLabelChange(n.id, v),
          onDelete: () => handleDeleteNode(n.id),
        },
      })),
    [nodes, handleLabelChange, handleDeleteNode]
  );

  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `con-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            style: { stroke: '#94a3b8', strokeWidth: 1.5 },
          } as Edge,
          eds
        )
      );
    },
    [setEdges]
  );

  const handleAddNode = useCallback(() => {
    const novoId = `no-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setNodes((nds) => [
      ...nds,
      {
        id: novoId,
        type: 'etapa',
        position: { x: 60 + (nds.length % 3) * 160, y: 30 + Math.floor(nds.length / 3) * 110 },
        data: { label: '', onLabelChange: () => {}, onDelete: () => {} },
      },
    ]);
  }, [setNodes]);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <span className="text-[11px] font-semibold text-slate-500">
          Fluxograma <span className="font-normal text-slate-400">— arraste para posicionar, puxe das bordas para ligar</span>
        </span>
        <button
          type="button"
          onClick={handleAddNode}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#8A6A39] transition-colors hover:bg-amber-50 hover:text-[#8A6A39]"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar etapa
        </button>
      </div>
      <div style={{ height: 340 }} className="bg-[repeating-linear-gradient(0deg,transparent,transparent)] bg-slate-50/60">
        <ReactFlow
          nodes={nodesComHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} color="#e2e8f0" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>
    </div>
  );
};

/** Bloco de fluxograma editável (arrastar/soltar caixas e setas) para as páginas de Notas & Ideias.
 *  `ReactFlowProvider` isola o estado interno do React Flow — necessário para usar `useReactFlow()`
 *  (deleção de nó em cascata com as setas) dentro do próprio bloco. */
export const FluxogramaBlock: React.FC<FluxogramaBlockProps> = (props) => (
  <ReactFlowProvider>
    <FluxogramaCanvas {...props} />
  </ReactFlowProvider>
);
