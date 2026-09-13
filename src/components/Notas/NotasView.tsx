import React, { useEffect, useMemo, useState } from 'react';
import {
  NotebookPen,
  Plus,
  Search,
  Star,
  ChevronRight,
  ChevronDown,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  NotaPagina,
  VinculoNotaModulo,
  GlobalModuleId,
  Cliente,
  Colaborador,
  ProjetoGerencial,
  EmbarqueAereo,
  ViagemRodoviaria,
  Ocorrencia,
  UsuarioLogin,
} from '../../types';
import { criarPaginaVazia } from './notasUtils';
import { NotaEditor } from './NotaEditor';
import { VincularModuloModal } from './VincularModuloModal';

interface NotasViewProps {
  paginas: NotaPagina[];
  onSavePagina: (pagina: NotaPagina) => void;
  onDeletePagina: (id: string) => void;
  currentUserName?: string;
  onNavigateModule?: (mod: GlobalModuleId) => void;
  clientes: Cliente[];
  colaboradores: Colaborador[];
  projetos: ProjetoGerencial[];
  embarquesAereos: EmbarqueAereo[];
  viagensRodoviarias: ViagemRodoviaria[];
  ocorrencias: Ocorrencia[];
  usuarios: UsuarioLogin[];
  /** Id de uma página pra abrir automaticamente (ex.: veio de uma menção no Chat). */
  abrirPaginaId?: string;
  /** Muda a cada clique de menção, mesmo pra mesma página, pra forçar reabrir. */
  abrirPaginaSinal?: number;
}

export const NotasView: React.FC<NotasViewProps> = ({
  paginas,
  onSavePagina,
  onDeletePagina,
  currentUserName,
  onNavigateModule,
  clientes,
  colaboradores,
  projetos,
  embarquesAereos,
  viagensRodoviarias,
  ocorrencias,
  usuarios,
  abrirPaginaId,
  abrirPaginaSinal,
}) => {
  const paginasAtivas = useMemo(() => paginas.filter((p) => !p.arquivada), [paginas]);

  const [selectedId, setSelectedId] = useState<string | null>(paginasAtivas[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isVincularOpen, setIsVincularOpen] = useState(false);

  // Chegou uma menção do Chat pedindo pra abrir uma página específica.
  useEffect(() => {
    if (!abrirPaginaId) return;
    setSelectedId(abrirPaginaId);
    setSearchTerm('');
    // Expande a cadeia de páginas-pai pra a selecionada ficar visível na árvore lateral.
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let atual = paginas.find((p) => p.id === abrirPaginaId);
      while (atual?.paginaPaiId) {
        next.add(atual.paginaPaiId);
        atual = paginas.find((p) => p.id === atual!.paginaPaiId);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirPaginaSinal]);

  const childrenMap = useMemo(() => {
    const map: Record<string, NotaPagina[]> = {};
    paginasAtivas.forEach((p) => {
      const key = p.paginaPaiId && paginasAtivas.some((x) => x.id === p.paginaPaiId) ? p.paginaPaiId : '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [paginasAtivas]);

  const paginaSelecionada = paginasAtivas.find((p) => p.id === selectedId) || null;
  const favoritas = paginasAtivas.filter((p) => p.favorito);

  const resultadosBusca = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const q = searchTerm.toLowerCase();
    return paginasAtivas.filter(
      (p) => p.titulo.toLowerCase().includes(q) || p.blocos.some((b) => b.texto.toLowerCase().includes(q))
    );
  }, [searchTerm, paginasAtivas]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNovaPagina = (paginaPaiId?: string) => {
    const nova = criarPaginaVazia(currentUserName, paginaPaiId);
    onSavePagina(nova);
    setSelectedId(nova.id);
    if (paginaPaiId) setExpandedIds((prev) => new Set(prev).add(paginaPaiId));
  };

  const handleDelete = (id: string) => {
    onDeletePagina(id);
    if (selectedId === id) {
      const proxima = paginasAtivas.find((p) => p.id !== id);
      setSelectedId(proxima?.id || null);
    }
  };

  const handleVincular = (vinculo: VinculoNotaModulo) => {
    if (!paginaSelecionada) return;
    onSavePagina({ ...paginaSelecionada, vinculo });
  };

  const handleRemoverVinculo = () => {
    if (!paginaSelecionada) return;
    onSavePagina({ ...paginaSelecionada, vinculo: undefined });
  };

  const renderPaginaItem = (p: NotaPagina, depth: number) => {
    const filhos = childrenMap[p.id] || [];
    const expandido = expandedIds.has(p.id);
    const selecionado = selectedId === p.id;
    return (
      <div key={p.id}>
        <div
          className={`group flex items-center gap-1 pr-1.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
            selecionado ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100'
          }`}
          style={{ paddingLeft: `${6 + depth * 14}px` }}
          onClick={() => setSelectedId(p.id)}
        >
          {filhos.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(p.id);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-700 shrink-0"
            >
              {expandido ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <span className="text-sm shrink-0">{p.icone || '📄'}</span>
          <span className={`truncate flex-1 text-xs ${selecionado ? 'font-bold' : 'font-medium'}`}>
            {p.titulo || 'Sem título'}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNovaPagina(p.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-teal-600 shrink-0 transition-opacity"
            title="Nova sub-página"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        {expandido && filhos.map((filho) => renderPaginaItem(filho, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200">
            <NotebookPen className="w-3.5 h-3.5" />
            <span>Notas & Ideias JMT</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Anotações e Brainstorm</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Um espaço livre para registrar ideias, atas rápidas e rascunhos — vincule qualquer página a um
            Cliente, Projeto, Colaborador ou operação existente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleNovaPagina()}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:shadow-teal-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Página</span>
        </button>
      </div>

      {/* Workspace */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Sidebar de páginas */}
        <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar páginas..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {resultadosBusca ? (
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                  {resultadosBusca.length} resultado(s)
                </span>
                {resultadosBusca.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      selectedId === p.id ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm shrink-0">{p.icone || '📄'}</span>
                    <span className="truncate flex-1 text-xs font-medium">{p.titulo || 'Sem título'}</span>
                  </button>
                ))}
                {resultadosBusca.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-6">Nada encontrado.</p>
                )}
              </div>
            ) : (
              <>
                {favoritas.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1 mb-1">
                      <Star className="w-3 h-3 text-amber-400" fill="currentColor" />
                      Favoritas
                    </span>
                    <div className="space-y-0.5">
                      {favoritas.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                            selectedId === p.id ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-sm shrink-0">{p.icone || '📄'}</span>
                          <span className="truncate flex-1 text-xs font-medium">{p.titulo || 'Sem título'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Todas as Páginas</span>
                  <button
                    type="button"
                    onClick={() => handleNovaPagina()}
                    className="p-0.5 text-slate-400 hover:text-teal-600 transition-colors"
                    title="Nova página"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {(childrenMap['__root__'] || []).map((p) => renderPaginaItem(p, 0))}
                  {(childrenMap['__root__'] || []).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-6 px-2">
                      Nenhuma página ainda. Clique em "Nova Página" para começar.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-8 min-h-[60vh]">
          {paginaSelecionada ? (
            <NotaEditor
              key={paginaSelecionada.id}
              pagina={paginaSelecionada}
              onSave={onSavePagina}
              onDelete={() => handleDelete(paginaSelecionada.id)}
              onOpenVincular={() => setIsVincularOpen(true)}
              onNavigateToVinculo={onNavigateModule}
              usuarios={usuarios}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <Sparkles className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Nenhuma página selecionada</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                Escolha uma página na lista ao lado ou crie uma nova para começar a anotar.
              </p>
              <button
                type="button"
                onClick={() => handleNovaPagina()}
                className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Página</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {paginaSelecionada && (
        <VincularModuloModal
          isOpen={isVincularOpen}
          onClose={() => setIsVincularOpen(false)}
          onVincular={handleVincular}
          onRemoverVinculo={handleRemoverVinculo}
          vinculoAtual={paginaSelecionada.vinculo}
          clientes={clientes}
          colaboradores={colaboradores}
          projetos={projetos}
          embarquesAereos={embarquesAereos}
          viagensRodoviarias={viagensRodoviarias}
          ocorrencias={ocorrencias}
        />
      )}
    </div>
  );
};
