import React, { useMemo, useState } from 'react';
import { HardHat, Plus, Search, Printer, Paperclip, Edit2, Trash2, CheckCircle2, X } from 'lucide-react';
import { Colaborador, EntregaEpi } from '../../types';
import { formatDate } from '../../utils/formatters';
import { EpiFormModal } from './EpiFormModal';
import { EpiPrintModal } from './EpiPrintModal';
import { EpiComprovanteUploader } from './EpiComprovanteUploader';

interface EpiViewProps {
  colaboradores: Colaborador[];
  entregas: EntregaEpi[];
  currentUserName?: string;
  onSaveEntrega: (entrega: EntregaEpi) => void;
  onDeleteEntrega: (id: string) => void;
}

/** Entrega de EPI (Equipamento de Proteção Individual) — lista de entregas registradas +
 *  formulário de nova entrega + recibo imprimível pro recebedor assinar (NR-6). Mesmo padrão
 *  de lista+modal já usado em OccurrencesView.tsx/VacationView.tsx. */
export const EpiView: React.FC<EpiViewProps> = ({
  colaboradores,
  entregas,
  currentUserName,
  onSaveEntrega,
  onDeleteEntrega,
}) => {
  const [busca, setBusca] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState<EntregaEpi | null>(null);
  const [entregaParaImprimir, setEntregaParaImprimir] = useState<EntregaEpi | null>(null);
  const [entregaComprovante, setEntregaComprovante] = useState<EntregaEpi | null>(null);

  const colaboradorPorId = useMemo(() => {
    const map = new Map<string, Colaborador>();
    colaboradores.forEach((c) => map.set(c.id, c));
    return map;
  }, [colaboradores]);

  const entregasFiltradas = useMemo(() => {
    const ordenadas = [...entregas].sort((a, b) => b.data.localeCompare(a.data));
    const termo = busca.trim().toLowerCase();
    if (!termo) return ordenadas;
    return ordenadas.filter((e) => (colaboradorPorId.get(e.colaboradorId)?.nomeCompleto || '').toLowerCase().includes(termo));
  }, [entregas, busca, colaboradorPorId]);

  const handleNovaEntrega = () => {
    setEditingEntrega(null);
    setIsFormOpen(true);
  };
  const handleEditar = (entrega: EntregaEpi) => {
    setEditingEntrega(entrega);
    setIsFormOpen(true);
  };
  const handleExcluir = (entrega: EntregaEpi) => {
    const colab = colaboradorPorId.get(entrega.colaboradorId);
    if (window.confirm(`Excluir o registro de entrega de EPI de ${colab?.nomeCompleto || 'colaborador'} em ${formatDate(entrega.data)}?`)) {
      onDeleteEntrega(entrega.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-[#B38F4F]" />
            Entrega de EPI
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro escrito de entrega/troca de Equipamento de Proteção Individual, exigido pela NR-6.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNovaEntrega}
          className="px-4 py-2.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Entrega</span>
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          data-no-uppercase="true"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por colaborador..."
          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Itens</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Recibo</th>
                <th className="py-3 px-4 text-right sticky right-0 bg-slate-50 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entregasFiltradas.map((entrega) => {
                const colab = colaboradorPorId.get(entrega.colaboradorId);
                return (
                  <tr key={entrega.id} className="group hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-semibold text-slate-800">{colab?.nomeCompleto || 'Colaborador não encontrado'}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(entrega.data)}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {entrega.itens.map((i) => `${i.descricao} (${i.quantidade})`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{entrega.responsavelEntrega || '—'}</td>
                    <td className="py-3 px-4">
                      {entrega.comprovanteAssinadoUrl ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          Anexado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEntregaComprovante(entrega)}
                          className="text-[11px] font-semibold text-[#8A6A39] hover:underline flex items-center gap-1"
                        >
                          <Paperclip className="w-3 h-3" /> Anexar
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right sticky right-0 bg-white group-hover:bg-slate-50/80 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEntregaParaImprimir(entrega)}
                          className="p-1.5 text-slate-400 hover:text-[#8A6A39] hover:bg-slate-100 rounded-lg"
                          title="Imprimir recibo"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditar(entrega)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluir(entrega)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {entregasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhuma entrega de EPI registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EpiFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        colaboradores={colaboradores}
        initialData={editingEntrega}
        currentUserName={currentUserName}
        onSave={onSaveEntrega}
      />

      <EpiPrintModal
        entrega={entregaParaImprimir}
        colaborador={entregaParaImprimir ? colaboradorPorId.get(entregaParaImprimir.colaboradorId) || null : null}
        onClose={() => setEntregaParaImprimir(null)}
      />

      {/* Modal: Recibo de EPI Assinado */}
      {entregaComprovante && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">Recibo de EPI Assinado</h2>
                  <p className="text-[11px] text-slate-500 truncate">
                    {colaboradorPorId.get(entregaComprovante.colaboradorId)?.nomeCompleto || 'Colaborador não encontrado'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEntregaComprovante(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-500">
                Anexe a foto ou o PDF do recibo de entrega de EPI assinado pelo colaborador, confirmando o recebimento.
              </p>
              <EpiComprovanteUploader
                comprovanteUrl={entregaComprovante.comprovanteAssinadoUrl}
                nomeArquivo={entregaComprovante.comprovanteAssinadoNomeArquivo}
                onUpload={(dataUrl, fileName) => {
                  const atualizado: EntregaEpi = {
                    ...entregaComprovante,
                    comprovanteAssinadoUrl: dataUrl,
                    comprovanteAssinadoNomeArquivo: fileName,
                  };
                  onSaveEntrega(atualizado);
                  setEntregaComprovante(atualizado);
                }}
                onRemove={() => {
                  const atualizado: EntregaEpi = {
                    ...entregaComprovante,
                    comprovanteAssinadoUrl: undefined,
                    comprovanteAssinadoNomeArquivo: undefined,
                  };
                  onSaveEntrega(atualizado);
                  setEntregaComprovante(atualizado);
                }}
              />
            </div>
            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setEntregaComprovante(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
