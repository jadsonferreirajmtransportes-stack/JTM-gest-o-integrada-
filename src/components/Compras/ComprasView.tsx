import React, { useMemo, useRef, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Pencil,
  Check,
  X as XIcon,
  Link2,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  PackageCheck,
} from 'lucide-react';
import { SolicitacaoCompra, StatusSolicitacaoCompra, UrgenciaSolicitacaoCompra, UsuarioLogin } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface ComprasViewProps {
  solicitacoes: SolicitacaoCompra[];
  currentUser?: UsuarioLogin;
  isAdmin: boolean;
  onSave: (item: SolicitacaoCompra) => void;
  onDelete: (id: string) => void;
  onAprovar: (item: SolicitacaoCompra) => void;
  onRecusar: (item: SolicitacaoCompra, motivo?: string) => void;
  onMarcarComprado: (item: SolicitacaoCompra) => void;
  onOpenLinkModal: () => void;
}

const STATUS_ORDEM: StatusSolicitacaoCompra[] = ['Pendente', 'Aprovado', 'Comprado', 'Recusado'];

const STATUS_STYLE: Record<StatusSolicitacaoCompra, { badge: string; icon: React.ReactNode }> = {
  Pendente: { badge: 'bg-amber-50 text-[#92611F] border-amber-200', icon: <Clock className="w-3 h-3" /> },
  Aprovado: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  Recusado: { badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="w-3 h-3" /> },
  Comprado: { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: <PackageCheck className="w-3 h-3" /> },
};

/** Módulo Compras: qualquer login solicita um item; admin/diretoria aprova ou recusa; depois
 *  de comprado, marca como "Comprado". Complementa o Formulário Público de Compras
 *  (PublicPurchaseRequestPortal.tsx), que alimenta a mesma lista sem exigir login. */
export const ComprasView: React.FC<ComprasViewProps> = ({
  solicitacoes,
  currentUser,
  isAdmin,
  onSave,
  onDelete,
  onAprovar,
  onRecusar,
  onMarcarComprado,
  onOpenLinkModal,
}) => {
  const [filtroStatus, setFiltroStatus] = useState<StatusSolicitacaoCompra | 'Todas'>('Pendente');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [recusandoId, setRecusandoId] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const [itens, setItens] = useState<{ item: string; quantidade: string; valorEstimado: string }[]>([
    { item: '', quantidade: '1', valorEstimado: '' },
  ]);
  const [justificativa, setJustificativa] = useState('');
  const [fornecedorSugerido, setFornecedorSugerido] = useState('');
  const [urgencia, setUrgencia] = useState<UrgenciaSolicitacaoCompra>('Normal');
  const [prazoNecessario, setPrazoNecessario] = useState('');
  const [anexoNome, setAnexoNome] = useState<string | undefined>();
  const [anexoUrl, setAnexoUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtradas = useMemo(() => {
    const base = filtroStatus === 'Todas' ? solicitacoes : solicitacoes.filter((s) => s.status === filtroStatus);
    return [...base].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [solicitacoes, filtroStatus]);

  // Agrupa itens pedidos juntos (mesmo grupoId, ex.: "papel + canetas" numa só submissão) pra
  // exibir num único card — cada item continua com status/ações independentes. Itens sem
  // grupoId (pedido de item único, ou registros antigos de antes dessa funcionalidade) viram
  // seu próprio "grupo" de 1 item, exibido do mesmo jeito de sempre.
  const gruposExibicao = useMemo(() => {
    const grupos: SolicitacaoCompra[][] = [];
    const indicePorGrupo = new Map<string, number>();
    filtradas.forEach((s) => {
      if (s.grupoId) {
        const idx = indicePorGrupo.get(s.grupoId);
        if (idx !== undefined) {
          grupos[idx].push(s);
          return;
        }
        indicePorGrupo.set(s.grupoId, grupos.length);
      }
      grupos.push([s]);
    });
    return grupos;
  }, [filtradas]);

  const contagemPorStatus = useMemo(() => {
    const mapa: Record<string, number> = {};
    solicitacoes.forEach((s) => {
      mapa[s.status] = (mapa[s.status] || 0) + 1;
    });
    return mapa;
  }, [solicitacoes]);

  const resetForm = () => {
    setEditingId(null);
    setItens([{ item: '', quantidade: '1', valorEstimado: '' }]);
    setJustificativa('');
    setFornecedorSugerido('');
    setUrgencia('Normal');
    setPrazoNecessario('');
    setAnexoNome(undefined);
    setAnexoUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAbrirEdicao = (s: SolicitacaoCompra) => {
    setEditingId(s.id);
    setItens([
      {
        item: s.item,
        quantidade: String(s.quantidade),
        valorEstimado: s.valorEstimado !== undefined ? s.valorEstimado.toFixed(2).replace('.', ',') : '',
      },
    ]);
    setJustificativa(s.justificativa || '');
    setFornecedorSugerido(s.fornecedorSugerido || '');
    setUrgencia(s.urgencia);
    setPrazoNecessario(s.prazoNecessario || '');
    setAnexoNome(s.anexoNome);
    setAnexoUrl(s.anexoUrl);
    setShowForm(true);
  };

  const handleAddLinhaItem = () => {
    setItens((prev) => [...prev, { item: '', quantidade: '1', valorEstimado: '' }]);
  };
  const handleRemoveLinhaItem = (idx: number) => {
    setItens((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };
  const handleUpdateLinhaItem = (idx: number, campo: 'item' | 'quantidade' | 'valorEstimado', valor: string) => {
    setItens((prev) => prev.map((linha, i) => (i === idx ? { ...linha, [campo]: valor } : linha)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAnexoNome(file.name);
      setAnexoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const linhasValidas = itens.filter((l) => l.item.trim());
    if (linhasValidas.length === 0) return;
    const existente = editingId ? solicitacoes.find((s) => s.id === editingId) : undefined;
    const agora = Date.now();
    const grupoId = linhasValidas.length > 1 ? `pedido-${agora}` : undefined;

    linhasValidas.forEach((linha, idx) => {
      onSave({
        id: editingId || `compra-${agora}-${idx}`,
        grupoId: editingId ? existente?.grupoId : grupoId,
        item: linha.item.trim(),
        quantidade: Number(linha.quantidade) || 1,
        justificativa: justificativa.trim() || undefined,
        valorEstimado: linha.valorEstimado ? Number(linha.valorEstimado.replace(/\./g, '').replace(',', '.')) : undefined,
        fornecedorSugerido: fornecedorSugerido.trim() || undefined,
        urgencia,
        prazoNecessario: prazoNecessario || undefined,
        anexoNome,
        anexoUrl,
        solicitanteNome: existente?.solicitanteNome || currentUser?.nome || 'Usuário do sistema',
        solicitanteLogin: existente?.solicitanteLogin || currentUser?.login,
        status: existente?.status || 'Pendente',
        aprovadoPor: existente?.aprovadoPor,
        motivoRecusa: existente?.motivoRecusa,
        criadoEm: existente?.criadoEm || new Date().toISOString(),
      });
    });
    resetForm();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-100 pointer-events-none flex items-center pr-8">
          <ShoppingCart className="w-56 h-56 text-orange-50" />
        </div>
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Módulo Compras</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Solicitações de Compra</h1>
          <p className="text-sm text-slate-500 font-normal leading-relaxed">
            Peça um item, acompanhe a aprovação da diretoria e o status até a compra ser efetivada.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['Todas', ...STATUS_ORDEM] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  filtroStatus === s
                    ? 'bg-[#C48229] text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-[#C48229]'
                }`}
              >
                {s} {s !== 'Todas' && contagemPorStatus[s] ? `(${contagemPorStatus[s]})` : ''}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLinkModal}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link Público</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Solicitação</span>
            </button>
          </div>
        </div>

        {filtradas.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Nenhuma solicitação {filtroStatus !== 'Todas' ? `com status "${filtroStatus}"` : ''} ainda.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {gruposExibicao.map((grupo) => {
              const primeiro = grupo[0];
              const renderAcoes = (s: SolicitacaoCompra) => (
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && s.status === 'Pendente' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAprovar(s)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
                        title="Aprovar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecusandoId(s.id);
                          setMotivoRecusa('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Recusar"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {isAdmin && s.status === 'Aprovado' && (
                    <button
                      type="button"
                      onClick={() => onMarcarComprado(s)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold"
                    >
                      Marcar Comprado
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAbrirEdicao(s)}
                    className="p-1.5 text-slate-400 hover:text-[#C48229] rounded-lg hover:bg-amber-50"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {deleteConfirmId === s.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(s.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px]"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(s.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );

              const renderBadges = (s: SolicitacaoCompra) => (
                <>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${STATUS_STYLE[s.status].badge}`}>
                    {STATUS_STYLE[s.status].icon}
                    {s.status}
                  </span>
                  {s.urgencia === 'Urgente' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                      Urgente
                    </span>
                  )}
                  {s.valorEstimado !== undefined && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      ~{formatCurrency(s.valorEstimado)}
                    </span>
                  )}
                </>
              );

              if (grupo.length === 1) {
                const s = primeiro;
                return (
                  <div key={s.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {s.quantidade}x {s.item}
                        </span>
                        {renderBadges(s)}
                        {!s.solicitanteLogin && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded">
                            Link público
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Pedido por <strong>{s.solicitanteNome}</strong>
                        {s.solicitanteContato ? ` (${s.solicitanteContato})` : ''} em {formatDate(s.criadoEm.slice(0, 10))}
                        {s.fornecedorSugerido ? ` • Fornecedor sugerido: ${s.fornecedorSugerido}` : ''}
                        {s.prazoNecessario ? ` • Prazo: ${formatDate(s.prazoNecessario)}` : ''}
                      </p>
                      {s.justificativa && <p className="text-[11px] text-slate-600 mt-1">{s.justificativa}</p>}
                      {s.status === 'Recusado' && s.motivoRecusa && (
                        <p className="text-[11px] text-rose-600 mt-1 font-semibold">Motivo da recusa: {s.motivoRecusa}</p>
                      )}
                      {s.aprovadoPor && s.status !== 'Pendente' && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {s.status === 'Recusado' ? 'Recusado' : 'Aprovado'} por {s.aprovadoPor}
                        </p>
                      )}
                      {s.anexoUrl && (
                        <a
                          href={s.anexoUrl}
                          download={s.anexoNome}
                          className="inline-flex items-center gap-1 text-[11px] text-[#92611F] hover:underline mt-1"
                        >
                          <FileText className="w-3 h-3" /> {s.anexoNome || 'Anexo'}
                        </a>
                      )}
                    </div>
                    {renderAcoes(s)}
                  </div>
                );
              }

              // Grupo com mais de 1 item (mesma submissão, ex.: "papel + canetas") — mostra o
              // que é comum (solicitante, data, justificativa, fornecedor, prazo, anexo) uma
              // única vez, e cada item embaixo com seu próprio status/ações independentes.
              return (
                <div key={primeiro.grupoId} className="px-4 py-3">
                  <div className="mb-2">
                    <span className="text-xs font-bold text-slate-900">
                      Pedido de {grupo.length} itens — {primeiro.solicitanteNome}
                    </span>
                    {!primeiro.solicitanteLogin && (
                      <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded">
                        Link público
                      </span>
                    )}
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {primeiro.solicitanteContato ? `${primeiro.solicitanteContato} • ` : ''}
                      em {formatDate(primeiro.criadoEm.slice(0, 10))}
                      {primeiro.fornecedorSugerido ? ` • Fornecedor sugerido: ${primeiro.fornecedorSugerido}` : ''}
                      {primeiro.prazoNecessario ? ` • Prazo: ${formatDate(primeiro.prazoNecessario)}` : ''}
                    </p>
                    {primeiro.justificativa && <p className="text-[11px] text-slate-600 mt-1">{primeiro.justificativa}</p>}
                    {primeiro.anexoUrl && (
                      <a
                        href={primeiro.anexoUrl}
                        download={primeiro.anexoNome}
                        className="inline-flex items-center gap-1 text-[11px] text-[#92611F] hover:underline mt-1"
                      >
                        <FileText className="w-3 h-3" /> {primeiro.anexoNome || 'Anexo'}
                      </a>
                    )}
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-orange-200">
                    {grupo.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 py-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs font-semibold text-slate-800">
                            {s.quantidade}x {s.item}
                          </span>
                          {renderBadges(s)}
                        </div>
                        {renderAcoes(s)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Nova/Editar Solicitação */}
      {showForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Solicitação' : 'Nova Solicitação de Compra'}</h3>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Itens *</label>
                  {!editingId && (
                    <button
                      type="button"
                      onClick={handleAddLinhaItem}
                      className="text-[11px] font-semibold text-[#92611F] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar outro item
                    </button>
                  )}
                </div>
                {itens.map((linha, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                    <input
                      type="text"
                      required={idx === 0}
                      value={linha.item}
                      onChange={(e) => handleUpdateLinhaItem(idx, 'item', e.target.value)}
                      placeholder="Ex: Resma de papel A4"
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="number"
                      required={idx === 0}
                      min={1}
                      value={linha.quantidade}
                      onChange={(e) => handleUpdateLinhaItem(idx, 'quantidade', e.target.value)}
                      placeholder="Qtd."
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      value={linha.valorEstimado}
                      onChange={(e) => handleUpdateLinhaItem(idx, 'valorEstimado', e.target.value)}
                      placeholder="R$ (opc.)"
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                    {!editingId && itens.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveLinhaItem(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Justificativa (opcional)</label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={2}
                  placeholder="Pra que precisa / onde vai ser usado"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Urgência</label>
                <select
                  value={urgencia}
                  onChange={(e) => setUrgencia(e.target.value as UrgenciaSolicitacaoCompra)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fornecedor Sugerido (opcional)</label>
                  <input
                    type="text"
                    value={fornecedorSugerido}
                    onChange={(e) => setFornecedorSugerido(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Prazo Necessário (opcional)</label>
                  <input
                    type="date"
                    value={prazoNecessario}
                    onChange={(e) => setPrazoNecessario(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Anexar Orçamento/Foto (opcional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 border-2 border-dashed border-amber-300 hover:border-[#C48229] bg-amber-50/40 rounded-lg text-center cursor-pointer transition-colors"
                >
                  {anexoNome ? (
                    <span className="text-[11px] font-semibold text-[#5c4526] flex items-center justify-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> {anexoNome}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Clique para escolher o arquivo
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                />
              </div>
              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="px-3 py-1.5 text-slate-600 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-lg transition-colors shadow-xs"
                >
                  {editingId
                    ? 'Salvar Alterações'
                    : itens.filter((l) => l.item.trim()).length > 1
                    ? `Enviar ${itens.filter((l) => l.item.trim()).length} Itens`
                    : 'Enviar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Recusar (motivo) */}
      {recusandoId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Recusar Solicitação</h3>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Motivo (opcional)</label>
              <textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={3}
                className="w-full p-2 border border-slate-200 rounded-lg"
                placeholder="Ex: fora do orçamento do mês"
              />
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setRecusandoId(null)} className="px-3 py-1.5 text-slate-600 rounded-lg">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const alvo = solicitacoes.find((s) => s.id === recusandoId);
                    if (alvo) onRecusar(alvo, motivoRecusa.trim() || undefined);
                    setRecusandoId(null);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg"
                >
                  Confirmar Recusa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
