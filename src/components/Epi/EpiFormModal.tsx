import React, { useEffect, useState } from 'react';
import { X, HardHat, Plus, Trash2 } from 'lucide-react';
import { Colaborador, EntregaEpi, ItemEntregaEpi, MotivoEntregaEpi } from '../../types';

const MOTIVOS_ENTREGA_EPI: MotivoEntregaEpi[] = [
  'Entrega Inicial',
  'Troca por Desgaste',
  'Reposição por Perda',
  'Reposição por Dano',
  'Substituição Periódica',
  'Outro',
];

function criarItemVazio(): ItemEntregaEpi {
  return { id: `item-epi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, descricao: '', ca: '', quantidade: 1, motivo: 'Entrega Inicial' };
}

interface EpiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaboradores: Colaborador[];
  initialData: EntregaEpi | null;
  currentUserName?: string;
  onSave: (entrega: EntregaEpi) => void;
}

/** Formulário de Entrega de EPI — colaborador, data, itens entregues (descrição, CA,
 *  quantidade, motivo) e observações. O recibo imprimível é montado em EpiView.tsx a partir
 *  do registro já salvo (não faz parte deste formulário). */
export const EpiFormModal: React.FC<EpiFormModalProps> = ({
  isOpen,
  onClose,
  colaboradores,
  initialData,
  currentUserName,
  onSave,
}) => {
  const [colaboradorId, setColaboradorId] = useState('');
  const [recebedorNaoCadastrado, setRecebedorNaoCadastrado] = useState(false);
  const [recebedorNomeLivre, setRecebedorNomeLivre] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [responsavelEntrega, setResponsavelEntrega] = useState('');
  const [itens, setItens] = useState<ItemEntregaEpi[]>([criarItemVazio()]);
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setColaboradorId(initialData?.colaboradorId || '');
    setRecebedorNaoCadastrado(!initialData?.colaboradorId && !!initialData?.recebedorNomeLivre);
    setRecebedorNomeLivre(initialData?.recebedorNomeLivre || '');
    setData(initialData?.data || new Date().toISOString().slice(0, 10));
    setResponsavelEntrega(initialData?.responsavelEntrega || currentUserName || '');
    setItens(initialData?.itens && initialData.itens.length > 0 ? initialData.itens : [criarItemVazio()]);
    setObservacoes(initialData?.observacoes || '');
  }, [isOpen, initialData, currentUserName]);

  if (!isOpen) return null;

  const activeEmployees = colaboradores.filter((c) => c.status !== 'Inativo');

  const handleAddItem = () => setItens((prev) => [...prev, criarItemVazio()]);
  const handleRemoveItem = (index: number) => setItens((prev) => prev.filter((_, i) => i !== index));
  const handleUpdateItem = (index: number, field: keyof ItemEntregaEpi, valor: any) => {
    setItens((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: valor } : it)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itensValidos = itens.filter((it) => it.descricao.trim());
    if (itensValidos.length === 0) return;
    if (recebedorNaoCadastrado ? !recebedorNomeLivre.trim() : !colaboradorId) return;
    onSave({
      id: initialData?.id || '',
      colaboradorId: recebedorNaoCadastrado ? undefined : colaboradorId,
      recebedorNomeLivre: recebedorNaoCadastrado ? recebedorNomeLivre.trim() : undefined,
      data,
      responsavelEntrega: responsavelEntrega.trim() || undefined,
      itens: itensValidos,
      observacoes: observacoes.trim() || undefined,
      comprovanteAssinadoUrl: initialData?.comprovanteAssinadoUrl,
      comprovanteAssinadoNomeArquivo: initialData?.comprovanteAssinadoNomeArquivo,
      criadoEm: initialData?.criadoEm,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#B38F4F] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-lg">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">{initialData ? 'Editar Entrega de EPI' : 'Nova Entrega de EPI'}</h2>
              <p className="text-xs text-white/80">Registro escrito exigido pela NR-6 (Portaria 3.214/78)</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/15">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Colaborador (Recebedor) *</label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recebedorNaoCadastrado}
                    onChange={(e) => setRecebedorNaoCadastrado(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  Colaborador não cadastrado no sistema
                </label>
              </div>
              {recebedorNaoCadastrado ? (
                <input
                  type="text"
                  data-no-uppercase="true"
                  required
                  value={recebedorNomeLivre}
                  onChange={(e) => setRecebedorNomeLivre(e.target.value)}
                  placeholder="Nome completo do recebedor"
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              ) : (
                <select
                  required
                  value={colaboradorId}
                  onChange={(e) => setColaboradorId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="">Selecione o Colaborador</option>
                  {activeEmployees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeCompleto} ({c.funcaoCargo} — {c.setor})
                    </option>
                  ))}
                </select>
              )}
              {recebedorNaoCadastrado && (
                <p className="text-[10px] text-slate-400 mt-1">
                  A ficha e o PDF continuam funcionando pra essa pessoa; o link de compartilhamento por WhatsApp/e-mail
                  só está disponível pra colaboradores cadastrados no sistema.
                </p>
              )}
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Data da Entrega *</label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Responsável pela Entrega</label>
              <input
                type="text"
                data-no-uppercase="true"
                value={responsavelEntrega}
                onChange={(e) => setResponsavelEntrega(e.target.value)}
                placeholder="Nome de quem entregou"
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
          </div>

          {/* Itens entregues */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">Itens Entregues *</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[11px] font-bold text-[#8A6A39] hover:text-[#6b5029] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    data-no-uppercase="true"
                    required
                    placeholder="Descrição do EPI (ex.: Luva de Proteção)"
                    value={item.descricao}
                    onChange={(e) => handleUpdateItem(idx, 'descricao', e.target.value)}
                    className="col-span-4 p-1.5 border border-slate-200 rounded-md text-[11px]"
                  />
                  <input
                    type="text"
                    data-no-uppercase="true"
                    placeholder="CA"
                    value={item.ca}
                    onChange={(e) => handleUpdateItem(idx, 'ca', e.target.value)}
                    title="Certificado de Aprovação (CA) do EPI"
                    className="col-span-2 p-1.5 border border-slate-200 rounded-md text-[11px]"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => handleUpdateItem(idx, 'quantidade', Number(e.target.value) || 1)}
                    className="col-span-1 p-1.5 border border-slate-200 rounded-md text-[11px] text-right"
                  />
                  <select
                    value={item.motivo}
                    onChange={(e) => handleUpdateItem(idx, 'motivo', e.target.value as MotivoEntregaEpi)}
                    className="col-span-2 p-1.5 border border-slate-200 rounded-md text-[11px]"
                  >
                    {MOTIVOS_ENTREGA_EPI.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={item.devolucao || ''}
                    onChange={(e) => handleUpdateItem(idx, 'devolucao', e.target.value || undefined)}
                    title="Data de devolução/troca deste item (preencher quando o colaborador devolver)"
                    className="col-span-2 p-1.5 border border-slate-200 rounded-md text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={itens.length === 1}
                    className="col-span-1 p-1.5 text-rose-500 hover:bg-rose-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    title="Remover item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              CA = Certificado de Aprovação do EPI (exigido pela NR-6). Preencha "Devolução" quando o colaborador
              devolver/trocar este item específico (pode editar depois).
            </p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Observações</label>
            <textarea
              rows={2}
              data-no-uppercase="true"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais sobre a entrega..."
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Salvar Entrega
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
