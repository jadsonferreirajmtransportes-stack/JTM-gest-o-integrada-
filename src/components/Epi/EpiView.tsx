import React, { useMemo, useState } from 'react';
import { HardHat, Plus, Search, FileText, Share2, Link2, Paperclip, Edit2, Trash2, CheckCircle2, X } from 'lucide-react';
import { Colaborador, EntregaEpi } from '../../types';
import { formatDate } from '../../utils/formatters';
import { EpiFormModal } from './EpiFormModal';
import { EpiPrintModal } from './EpiPrintModal';
import { CompartilharEpiModal } from './CompartilharEpiModal';
import { EpiComprovanteUploader } from './EpiComprovanteUploader';

interface EpiViewProps {
  colaboradores: Colaborador[];
  entregas: EntregaEpi[];
  currentUserName?: string;
  onSaveEntrega: (entrega: EntregaEpi) => void;
  onDeleteEntrega: (id: string) => void;
  /** Abre o modal com o link fixo do Formulário Público de Entrega de EPI (?form=epi_entrega)
   *  — vive em App.tsx (EpiFormularioLinkModal), mesmo padrão de onOpenOccurrenceLinkModal em
   *  OccurrencesView.tsx. */
  onOpenEpiLinkModal?: () => void;
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
  onOpenEpiLinkModal,
}) => {
  const [busca, setBusca] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState<EntregaEpi | null>(null);
  // A ficha de EPI é corrida por PESSOA (acumula TODAS as entregas dela) — não um recibo de um
  // evento só. "alvoFicha" guarda o nome/função de quem vai aparecer na ficha, seja um
  // Colaborador cadastrado ou alguém sem cadastro (recebedorNomeLivre) — nesse 2º caso não há
  // Colaborador nenhum pra passar, só o nome digitado.
  const [alvoFicha, setAlvoFicha] = useState<{ nome: string; funcaoCargo?: string } | null>(null);
  const [colaboradorParaCompartilhar, setColaboradorParaCompartilhar] = useState<Colaborador | null>(null);
  const [entregaComprovante, setEntregaComprovante] = useState<EntregaEpi | null>(null);

  const colaboradorPorId = useMemo(() => {
    const map = new Map<string, Colaborador>();
    colaboradores.forEach((c) => map.set(c.id, c));
    return map;
  }, [colaboradores]);

  /** Nome de quem recebeu — do cadastro quando há colaboradorId, senão o nome digitado
   *  (recebedorNomeLivre, colaborador de verdade que a empresa optou por não cadastrar). */
  const nomeRecebedor = (entrega: EntregaEpi): string =>
    (entrega.colaboradorId && colaboradorPorId.get(entrega.colaboradorId)?.nomeCompleto) ||
    entrega.recebedorNomeLivre ||
    'Recebedor não identificado';

  const entregasFiltradas = useMemo(() => {
    const ordenadas = [...entregas].sort((a, b) => b.data.localeCompare(a.data));
    const termo = busca.trim().toLowerCase();
    if (!termo) return ordenadas;
    return ordenadas.filter((e) => nomeRecebedor(e).toLowerCase().includes(termo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregas, busca, colaboradorPorId]);

  /** Todas as entregas da mesma pessoa que está na ficha aberta — por colaboradorId quando
   *  existe; por nome digitado (só entre quem também não tem colaboradorId) quando não. */
  const entregasDoAlvoFicha = useMemo(() => {
    if (!alvoFicha) return [];
    return entregas.filter((e) =>
      e.colaboradorId
        ? colaboradorPorId.get(e.colaboradorId)?.nomeCompleto === alvoFicha.nome
        : e.recebedorNomeLivre === alvoFicha.nome
    );
  }, [entregas, alvoFicha, colaboradorPorId]);

  const handleNovaEntrega = () => {
    setEditingEntrega(null);
    setIsFormOpen(true);
  };
  const handleEditar = (entrega: EntregaEpi) => {
    setEditingEntrega(entrega);
    setIsFormOpen(true);
  };
  const handleExcluir = (entrega: EntregaEpi) => {
    if (window.confirm(`Excluir o registro de entrega de EPI de ${nomeRecebedor(entrega)} em ${formatDate(entrega.data)}?`)) {
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
        <div className="flex items-center gap-2">
          {onOpenEpiLinkModal && (
            <button
              type="button"
              onClick={onOpenEpiLinkModal}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
              title="Link do Formulário Público de Entrega de EPI (sem login)"
            >
              <Link2 className="w-4 h-4 text-[#8A6A39]" />
              <span>Link do Formulário</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleNovaEntrega}
            className="px-4 py-2.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Entrega</span>
          </button>
        </div>
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
                const colab = entrega.colaboradorId ? colaboradorPorId.get(entrega.colaboradorId) : undefined;
                const nome = nomeRecebedor(entrega);
                return (
                  <tr key={entrega.id} className="group hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {nome}
                      {!entrega.colaboradorId && (
                        <span className="ml-1.5 text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full align-middle">
                          NÃO CADASTRADO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(entrega.data)}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {entrega.itens
                        .map((i) => `${i.descricao}${i.tamanho ? ` — Tam. ${i.tamanho}` : ''} (${i.quantidade})`)
                        .join(', ')}
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
                          onClick={() => setAlvoFicha({ nome, funcaoCargo: colab?.funcaoCargo })}
                          className="p-1.5 text-slate-400 hover:text-[#8A6A39] hover:bg-slate-100 rounded-lg"
                          title="Ver ficha de EPI (todas as entregas dessa pessoa)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setColaboradorParaCompartilhar(colab || null)}
                          disabled={!colab}
                          className="p-1.5 text-slate-400 hover:text-[#8A6A39] hover:bg-slate-100 rounded-lg disabled:opacity-30"
                          title={colab ? 'Compartilhar ficha por link' : 'Só disponível pra colaboradores cadastrados no sistema'}
                        >
                          <Share2 className="w-3.5 h-3.5" />
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

      {alvoFicha && (
        <EpiPrintModal
          nome={alvoFicha.nome}
          funcaoCargo={alvoFicha.funcaoCargo}
          entregas={entregasDoAlvoFicha}
          onClose={() => setAlvoFicha(null)}
        />
      )}

      <CompartilharEpiModal
        isOpen={!!colaboradorParaCompartilhar}
        onClose={() => setColaboradorParaCompartilhar(null)}
        colaborador={colaboradorParaCompartilhar}
        entregasDoColaborador={
          colaboradorParaCompartilhar ? entregas.filter((e) => e.colaboradorId === colaboradorParaCompartilhar.id) : []
        }
        criadoPor={currentUserName}
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
                  <p className="text-[11px] text-slate-500 truncate">{nomeRecebedor(entregaComprovante)}</p>
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
