import React, { useMemo, useState } from 'react';
import { FileCheck2, Plus, Search, Star, X, FileText, Layers, Sparkles, Share2 } from 'lucide-react';
import {
  InstrucaoTrabalho,
  VinculoNotaModulo,
  GlobalModuleId,
  Cliente,
  Colaborador,
  ProjetoGerencial,
  EmbarqueAereo,
  ViagemRodoviaria,
  Ocorrencia,
  CategoriaInstrucaoTrabalho,
  UsuarioLogin,
} from '../../types';
import { CATEGORIAS_INSTRUCAO, STATUS_INSTRUCAO_CONFIG, TEMPLATES_INSTRUCAO, criarInstrucaoVazia, getCategoriaConfig } from './instrucoesTrabalhoUtils';
import { InstrucaoEditor } from './InstrucaoEditor';
import { InstrucaoLinkModal } from './InstrucaoLinkModal';
import { VincularModuloModal } from '../Notas/VincularModuloModal';
import { formatDateBR } from '../../utils/formatters';

interface InstrucoesTrabalhoViewProps {
  instrucoes: InstrucaoTrabalho[];
  onSaveInstrucao: (instrucao: InstrucaoTrabalho) => void;
  onDeleteInstrucao: (id: string) => void;
  currentUserName?: string;
  onNavigateModule?: (mod: GlobalModuleId) => void;
  clientes: Cliente[];
  colaboradores: Colaborador[];
  projetos: ProjetoGerencial[];
  embarquesAereos: EmbarqueAereo[];
  viagensRodoviarias: ViagemRodoviaria[];
  ocorrencias: Ocorrencia[];
  usuarios: UsuarioLogin[];
}

export const InstrucoesTrabalhoView: React.FC<InstrucoesTrabalhoViewProps> = ({
  instrucoes,
  onSaveInstrucao,
  onDeleteInstrucao,
  currentUserName,
  onNavigateModule,
  clientes,
  colaboradores,
  projetos,
  embarquesAereos,
  viagensRodoviarias,
  ocorrencias,
  usuarios,
}) => {
  const instrucoesAtivas = useMemo(() => instrucoes.filter((i) => !i.arquivada), [instrucoes]);

  const [selectedId, setSelectedId] = useState<string | null>(instrucoesAtivas[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaInstrucaoTrabalho | 'todas'>('todas');
  const [isVincularOpen, setIsVincularOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isNovaOpen, setIsNovaOpen] = useState(false);
  const [categoriaEscolhida, setCategoriaEscolhida] = useState<CategoriaInstrucaoTrabalho | null>(null);

  const instrucaoSelecionada = instrucoesAtivas.find((i) => i.id === selectedId) || null;

  const listaFiltrada = useMemo(() => {
    return instrucoesAtivas.filter((i) => {
      if (filtroCategoria !== 'todas' && i.categoria !== filtroCategoria) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const camposTexto = [
          i.titulo,
          i.codigo,
          i.objetivo,
          i.aplicacaoAbrangencia,
          i.criteriosDecisao,
          i.registrosEvidencias,
          ...i.fluxoProcesso.map((e) => e.etapa),
        ];
        const bate = camposTexto.some((campo) => (campo || '').toLowerCase().includes(q));
        if (!bate) return false;
      }
      return true;
    });
  }, [instrucoesAtivas, filtroCategoria, searchTerm]);

  const handleAbrirNova = (categoria: CategoriaInstrucaoTrabalho) => {
    setCategoriaEscolhida(categoria);
  };

  const handleCriarComTemplate = (preenchimento?: Partial<InstrucaoTrabalho>) => {
    if (!categoriaEscolhida) return;
    const nova = criarInstrucaoVazia(categoriaEscolhida, instrucoesAtivas, currentUserName, preenchimento);
    onSaveInstrucao(nova);
    setSelectedId(nova.id);
    setIsNovaOpen(false);
    setCategoriaEscolhida(null);
  };

  const handleDelete = (id: string) => {
    onDeleteInstrucao(id);
    if (selectedId === id) {
      const proxima = instrucoesAtivas.find((i) => i.id !== id);
      setSelectedId(proxima?.id || null);
    }
  };

  const handleVincular = (vinculo: VinculoNotaModulo) => {
    if (!instrucaoSelecionada) return;
    onSaveInstrucao({ ...instrucaoSelecionada, vinculo });
  };

  const handleRemoverVinculo = () => {
    if (!instrucaoSelecionada) return;
    onSaveInstrucao({ ...instrucaoSelecionada, vinculo: undefined });
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 text-[#8A6A39] text-xs font-semibold border border-amber-200">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Instruções de Trabalho (IT)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Procedimentos Operacionais Padronizados</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Construa checklists, fluxogramas e procedimentos de referência para o Farma Aéreo, Farma Rodoviário e demais
            operações — com código, dono do processo, versão e status de vigência — e vincule cada instrução a um
            cliente, embarque ou viagem específica. Inclui os modelos do método interno de gestão por processos
            (SIPOC, 5W2H e checklist de revisão).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNovaOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#B38F4F] hover:bg-[#8A6A39] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Instrução</span>
        </button>
      </div>

      {/* Workspace */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Lista de instruções */}
        <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, título ou conteúdo..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]/30"
              />
            </div>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value as CategoriaInstrucaoTrabalho | 'todas')}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="todas">Todas as Operações</option>
              {CATEGORIAS_INSTRUCAO.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto space-y-0.5">
            {listaFiltrada.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-6 px-2">
                Nenhuma instrução encontrada. Clique em "Nova Instrução" para começar.
              </p>
            )}
            {listaFiltrada.map((i) => {
              const catCfg = getCategoriaConfig(i.categoria);
              const CatIcon = catCfg.icon;
              const statusCfg = STATUS_INSTRUCAO_CONFIG[i.status];
              const selecionado = selectedId === i.id;
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setSelectedId(i.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-colors ${
                    selecionado ? 'bg-amber-50 border-[#B38F4F]/50' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500">{i.codigo}</span>
                    <div className="flex items-center gap-1">
                      {i.favorito && <Star className="w-3 h-3 text-amber-400" fill="currentColor" />}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusCfg.badge}`}>{statusCfg.label}</span>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 truncate">{i.titulo || 'Instrução sem título'}</div>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span className="flex items-center gap-1 min-w-0">
                      <CatIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-[10px] text-slate-400 truncate">{catCfg.label}</span>
                    </span>
                    {i.atualizadoEm && (
                      <span className="text-[9px] text-slate-300 shrink-0">{formatDateBR(i.atualizadoEm.slice(0, 10))}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-8 min-h-[60vh]">
          {instrucaoSelecionada ? (
            <InstrucaoEditor
              key={instrucaoSelecionada.id}
              instrucao={instrucaoSelecionada}
              onSave={onSaveInstrucao}
              onDelete={() => handleDelete(instrucaoSelecionada.id)}
              onOpenVincular={() => setIsVincularOpen(true)}
              onNavigateToVinculo={onNavigateModule}
              onShare={() => setIsLinkModalOpen(true)}
              usuarios={usuarios}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <Sparkles className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Nenhuma instrução selecionada</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                Escolha uma instrução na lista ao lado ou crie uma nova para começar.
              </p>
              <button
                type="button"
                onClick={() => setIsNovaOpen(true)}
                className="px-4 py-2 text-xs font-semibold bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-lg shadow-xs inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Instrução</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {instrucaoSelecionada && (
        <VincularModuloModal
          isOpen={isVincularOpen}
          onClose={() => setIsVincularOpen(false)}
          onVincular={handleVincular}
          onRemoverVinculo={handleRemoverVinculo}
          vinculoAtual={instrucaoSelecionada.vinculo}
          clientes={clientes}
          colaboradores={colaboradores}
          projetos={projetos}
          embarquesAereos={embarquesAereos}
          viagensRodoviarias={viagensRodoviarias}
          ocorrencias={ocorrencias}
        />
      )}

      {instrucaoSelecionada && (
        <InstrucaoLinkModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          instrucao={instrucaoSelecionada}
        />
      )}

      {/* Modal: Nova Instrução — escolher operação e, em seguida, um modelo pronto ou em branco */}
      {isNovaOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#B38F4F]" />
                <h3 className="text-sm font-bold text-slate-800">
                  {categoriaEscolhida ? `Modelo para ${getCategoriaConfig(categoriaEscolhida).label}` : 'Nova Instrução de Trabalho'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNovaOpen(false);
                  setCategoriaEscolhida(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {!categoriaEscolhida ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-500 mb-2">Para qual operação é esta instrução?</p>
                  {CATEGORIAS_INSTRUCAO.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleAbrirNova(c.id)}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${c.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setCategoriaEscolhida(null)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
                  >
                    ← Escolher outra operação
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCriarComTemplate()}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block">Em branco</span>
                      <span className="text-[10px] text-slate-400">Começar do zero</span>
                    </div>
                  </button>

                  {TEMPLATES_INSTRUCAO[categoriaEscolhida].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleCriarComTemplate(tpl.gerarPreenchimento())}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-amber-50 hover:border-[#B38F4F]/40 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg border border-[#B38F4F]/30 bg-amber-50 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4 text-[#8A6A39]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-700 block truncate">{tpl.nome}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{tpl.descricao}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
