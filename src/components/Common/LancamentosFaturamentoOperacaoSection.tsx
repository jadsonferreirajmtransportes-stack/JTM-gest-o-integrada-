import React, { useState, useRef } from 'react';
import {
  Receipt,
  Plus,
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  X,
  Calendar,
  Hash,
} from 'lucide-react';
import { Cliente, LancamentoFaturamentoOperacao } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface LancamentosFaturamentoOperacaoSectionProps {
  operacaoId: string;
  operacaoNome: string;
  lancamentos: LancamentoFaturamentoOperacao[];
  /** Empresas atreladas à Operação — pra poder identificar de qual empresa veio o lançamento
   *  (alimenta o Real Conciliado por empresa em Visão Geral/DRE e no ranking de clientes). */
  clientes?: Cliente[];
  onSave: (lancamento: LancamentoFaturamentoOperacao) => void;
  onDelete: (id: string) => void;
}

/** Registro dos meses de faturamento realmente conciliados/fechados com o parceiro de uma
 *  Operação genérica (ex.: Unimed) — sem Controle Financeiro de CT-e, esse é o equivalente
 *  simples: valor fechado + nº da NF + anexo do PDF. Assim que existe pelo menos 1 lançamento,
 *  ele passa a mandar na Visão Geral/DRE em vez do campo "Faturamento Mensal Estimado" do
 *  cliente (ver computeFaturamentoRealOperacao/calcFinancialsSetor). */
export const LancamentosFaturamentoOperacaoSection: React.FC<LancamentosFaturamentoOperacaoSectionProps> = ({
  operacaoId,
  operacaoNome,
  lancamentos,
  clientes = [],
  onSave,
  onDelete,
}) => {
  const hoje = new Date();
  const periodoAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [showForm, setShowForm] = useState(false);
  const [periodo, setPeriodo] = useState(periodoAtual);
  const [clienteId, setClienteId] = useState('');
  const [valor, setValor] = useState('');
  const [numeroNF, setNumeroNF] = useState('');
  const [descricao, setDescricao] = useState('');
  const [anexoNome, setAnexoNome] = useState<string | undefined>();
  const [anexoUrl, setAnexoUrl] = useState<string | undefined>();
  const [previewDoc, setPreviewDoc] = useState<LancamentoFaturamentoOperacao | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ordenados = [...lancamentos].sort((a, b) => b.periodo.localeCompare(a.periodo));

  const resetForm = () => {
    setPeriodo(periodoAtual);
    setClienteId('');
    setValor('');
    setNumeroNF('');
    setDescricao('');
    setAnexoNome(undefined);
    setAnexoUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    const valorNumerico = Number(valor.replace(/\./g, '').replace(',', '.'));
    if (!periodo || !valorNumerico) return;
    const clienteSelecionado = clientes.find((c) => c.id === clienteId);
    onSave({
      id: `lanc-fat-op-${Date.now()}`,
      operacaoId,
      periodo,
      clienteId: clienteId || undefined,
      clienteNome: clienteSelecionado ? clienteSelecionado.nomeFantasia || clienteSelecionado.razaoSocial : undefined,
      valor: valorNumerico,
      numeroNF: numeroNF.trim() || undefined,
      descricao: descricao.trim() || undefined,
      anexoNome,
      anexoUrl,
      criadoEm: new Date().toISOString(),
    });
    resetForm();
    setShowForm(false);
  };

  const formatPeriodoLabel = (p: string) => {
    const [ano, mes] = p.split('-');
    const nomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const idx = Number(mes) - 1;
    return `${nomes[idx] || mes}/${ano}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-[#92611F] flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Faturamento Real Conciliado ({ordenados.length} mês{ordenados.length === 1 ? '' : 'es'})
            </h4>
            <p className="text-[11px] text-slate-500">
              Registre aqui cada mês fechado com o parceiro — assim que houver 1 lançamento, ele passa a valer na Visão Geral/DRE no lugar do valor estimado.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Lançamento</span>
        </button>
      </div>

      {ordenados.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400">
          Nenhum mês fechado registrado ainda para {operacaoNome}.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {ordenados.map((l) => (
            <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">{formatPeriodoLabel(l.periodo)}</span>
                  <span className="text-xs font-bold text-emerald-700">{formatCurrency(l.valor)}</span>
                  {l.clienteNome && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-50 text-[#92611F] border border-amber-200 rounded">
                      {l.clienteNome}
                    </span>
                  )}
                  {l.numeroNF && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      NF {l.numeroNF}
                    </span>
                  )}
                </div>
                {l.descricao && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{l.descricao}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {l.anexoUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(l)}
                      className="p-1.5 text-slate-400 hover:text-[#C48229] rounded-lg hover:bg-amber-50"
                      title="Ver anexo"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={l.anexoUrl}
                      download={l.anexoNome}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
                      title="Baixar anexo"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
                {deleteConfirmId === l.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(l.id);
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
                    onClick={() => setDeleteConfirmId(l.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    title="Excluir lançamento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Novo Lançamento de Faturamento</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" /> Mês de Referência *
                  </label>
                  <input
                    type="month"
                    required
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Valor Total (R$) *</label>
                  <input
                    type="text"
                    required
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="Ex: 29690,00"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              {clientes.length > 0 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Empresa (opcional)</label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">— Não vincular a uma empresa específica —</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nomeFantasia || c.razaoSocial}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                  <Hash className="w-3 h-3" /> Nº da(s) NF (opcional)
                </label>
                <input
                  type="text"
                  value={numeroNF}
                  onChange={(e) => setNumeroNF(e.target.value)}
                  placeholder="Ex: 856, 857, 858"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descrição / Composição (opcional)</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={2}
                  placeholder="Ex: Operação Interior R$ 2.090,00 + Operação CD R$ 18.400,00 + Operação Extra R$ 9.200,00"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Anexar NF (PDF/Imagem, opcional)</label>
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
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-slate-600 rounded-lg">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-lg transition-colors shadow-xs"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewDoc && previewDoc.anexoUrl && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {previewDoc.anexoNome || 'Anexo'} — {formatPeriodoLabel(previewDoc.periodo)}
              </h3>
              <button type="button" onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex-1 overflow-y-auto flex items-center justify-center min-h-[300px]">
              {previewDoc.anexoUrl.startsWith('data:image/') ? (
                <img
                  src={previewDoc.anexoUrl}
                  alt={previewDoc.anexoNome}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
                />
              ) : (
                <iframe
                  src={previewDoc.anexoUrl}
                  title={previewDoc.anexoNome}
                  className="w-full h-[65vh] border-0 bg-white rounded-xl shadow-sm border border-slate-300"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
