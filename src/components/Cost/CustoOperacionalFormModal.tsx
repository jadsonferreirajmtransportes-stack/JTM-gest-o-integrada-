import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  Truck,
  Plane,
  Building2,
  Calendar,
  FileText,
  Tag,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
} from 'lucide-react';
import {
  CustoOperacional,
  SetorCustoOperacional,
  CategoriaCustoOperacional,
  StatusCustoOperacional,
  PeriodicidadeCusto,
} from '../../types';

interface CustoOperacionalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (custo: CustoOperacional) => void;
  initialData?: CustoOperacional | null;
  defaultSetor?: SetorCustoOperacional;
}

const CATEGORIAS_PRESETS: { categoria: CategoriaCustoOperacional; icon: string; setorHint?: SetorCustoOperacional }[] = [
  { categoria: 'Combustível & Abastecimento', icon: '⛽', setorHint: 'farma_rodoviario' },
  { categoria: 'Manutenção Mecânica & Peças', icon: '🔧', setorHint: 'farma_rodoviario' },
  { categoria: 'Refrigeração & Thermo King / Carrier', icon: '❄️', setorHint: 'farma_rodoviario' },
  { categoria: 'Pedágios & ConectCar / Sem Parar', icon: '🛣️', setorHint: 'farma_rodoviario' },
  { categoria: 'Fretes & Tarifas Aéreas (Cias)', icon: '✈️', setorHint: 'farma_aereo' },
  { categoria: 'Embalagens Térmicas & Gelo Seco / PCM', icon: '📦', setorHint: 'farma_aereo' },
  { categoria: 'Qualificação Térmica & Dataloggers (RDC 430)', icon: '🌡️', setorHint: 'farma_aereo' },
  { categoria: 'Armazenagem TECA & Câmaras Frias', icon: '🏢', setorHint: 'farma_aereo' },
  { categoria: 'Seguros de Carga (RCTR-C / RCF-DC)', icon: '🛡️' },
  { categoria: 'Sanitização & Limpeza Técnica de Baús', icon: '🧼', setorHint: 'farma_rodoviario' },
  { categoria: 'Coletas de Urgência & Last-Mile', icon: '🚚' },
  { categoria: 'EPIs & Uniformes Operacionais', icon: '🦺', setorHint: 'geral' },
  { categoria: 'Diárias & Alimentação de Motoristas', icon: '🍽️', setorHint: 'farma_rodoviario' },
  { categoria: 'Outros Custos Operacionais', icon: '📋' },
];

export const CustoOperacionalFormModal: React.FC<CustoOperacionalFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultSetor = 'farma_rodoviario',
}) => {
  const [setor, setSetor] = useState<SetorCustoOperacional>(defaultSetor);
  const [categoria, setCategoria] = useState<string>('Combustível & Abastecimento');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<string>('');
  const [status, setStatus] = useState<StatusCustoOperacional>('Pago');
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadeCusto>('Recorrente');
  const [fornecedor, setFornecedor] = useState('');
  const [numeroDocumentoOuNF, setNumeroDocumentoOuNF] = useState('');
  const [dataCompetencia, setDataCompetencia] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [dataVencimento, setDataVencimento] = useState(
    new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  );
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [conhecimentoOuAwb, setConhecimentoOuAwb] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setSetor(initialData.setor);
      setCategoria(initialData.categoria);
      setDescricao(initialData.descricao);
      setValor(initialData.valor ? initialData.valor.toString() : '');
      setStatus(initialData.status);
      setPeriodicidade(initialData.periodicidade);
      setFornecedor(initialData.fornecedor || '');
      setNumeroDocumentoOuNF(initialData.numeroDocumentoOuNF || '');
      setDataCompetencia(initialData.dataCompetencia || new Date().toISOString().slice(0, 7));
      setDataVencimento(initialData.dataVencimento || new Date().toISOString().slice(0, 10));
      setDataPagamento(initialData.dataPagamento || new Date().toISOString().slice(0, 10));
      setPlacaVeiculo(initialData.placaVeiculo || '');
      setConhecimentoOuAwb(initialData.conhecimentoOuAwb || '');
      setObservacoes(initialData.observacoes || '');
    } else {
      setSetor(defaultSetor);
      if (defaultSetor === 'farma_aereo') {
        setCategoria('Fretes & Tarifas Aéreas (Cias)');
      } else {
        setCategoria('Combustível & Abastecimento');
      }
      setDescricao('');
      setValor('');
      setStatus('Pago');
      setPeriodicidade('Recorrente');
      setFornecedor('');
      setNumeroDocumentoOuNF('');
      setDataCompetencia(new Date().toISOString().slice(0, 7));
      setDataVencimento(new Date().toISOString().slice(0, 10));
      setDataPagamento(new Date().toISOString().slice(0, 10));
      setPlacaVeiculo('');
      setConhecimentoOuAwb('');
      setObservacoes('');
    }
    setErrors({});
  }, [initialData, defaultSetor, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!descricao.trim()) {
      errs.descricao = 'Informe a descrição do custo operacional.';
    }
    const numVal = parseFloat(valor.replace(',', '.'));
    if (isNaN(numVal) || numVal <= 0) {
      errs.valor = 'Informe um valor válido maior que zero.';
    }
    if (!categoria.trim()) {
      errs.categoria = 'Selecione ou digite a categoria.';
    }
    if (!dataCompetencia) {
      errs.dataCompetencia = 'Informe a competência (mês/ano).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const numVal = parseFloat(valor.replace(',', '.'));
    const custoToSave: CustoOperacional = {
      id: initialData ? initialData.id : `custo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      setor,
      categoria: categoria.trim() as CategoriaCustoOperacional,
      descricao: descricao.trim(),
      valor: numVal,
      dataCompetencia,
      dataVencimento: dataVencimento || undefined,
      dataPagamento: status === 'Pago' ? (dataPagamento || new Date().toISOString().slice(0, 10)) : undefined,
      status,
      periodicidade,
      fornecedor: fornecedor.trim() || undefined,
      numeroDocumentoOuNF: numeroDocumentoOuNF.trim() || undefined,
      placaVeiculo: placaVeiculo.trim() || undefined,
      conhecimentoOuAwb: conhecimentoOuAwb.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      criadoEm: initialData ? initialData.criadoEm : new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    onSave(custoToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C48229]/15 text-[#92611F] border border-[#C48229]/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {initialData ? 'Editar Custo Operacional' : 'Novo Lançamento de Custo Operacional'}
              </h2>
              <p className="text-xs text-slate-500">
                Lançamento contábil e gerencial de despesas diretas da operação farmacêutica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* 1. Seleção de Setor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Setor / Centro de Custo Vinculado *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSetor('farma_rodoviario')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  setor === 'farma_rodoviario'
                    ? 'border-[#C48229] bg-[#C48229]/10 ring-2 ring-[#C48229]/30 text-slate-900 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${setor === 'farma_rodoviario' ? 'bg-[#C48229] text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Farma Rodoviário</div>
                  <div className="text-[10px] text-slate-500">Frota & Baús Refrigerados</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSetor('farma_aereo')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  setor === 'farma_aereo'
                    ? 'border-[#C48229] bg-[#C48229]/10 ring-2 ring-[#C48229]/30 text-slate-900 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${setor === 'farma_aereo' ? 'bg-[#C48229] text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Farma Aéreo</div>
                  <div className="text-[10px] text-slate-500">AWB, TECA & Termolábeis</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSetor('geral')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  setor === 'geral'
                    ? 'border-[#C48229] bg-[#C48229]/10 ring-2 ring-[#C48229]/30 text-slate-900 font-bold'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${setor === 'geral' ? 'bg-[#C48229] text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Geral / Rateado</div>
                  <div className="text-[10px] text-slate-500">50% Aéreo / 50% Rodoviário</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Categoria com Botões Rápidos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Categoria de Custo *
              </label>
              <span className="text-[11px] text-slate-400">Clique para selecionar rápido</span>
            </div>
            
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CATEGORIAS_PRESETS.filter(
                (p) => !p.setorHint || p.setorHint === setor || p.setorHint === 'geral' || setor === 'geral'
              ).map((preset) => (
                <button
                  key={preset.categoria}
                  type="button"
                  onClick={() => setCategoria(preset.categoria)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    categoria === preset.categoria
                      ? 'bg-[#C48229] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.categoria}</span>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ou digite o nome personalizado da categoria..."
              className={`w-full px-3.5 py-2 rounded-xl border text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40 ${
                errors.categoria ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
              }`}
            />
            {errors.categoria && <p className="text-xs text-rose-600 mt-1">{errors.categoria}</p>}
          </div>

          {/* 3. Descrição & Valor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Descrição da Despesa / Custo *
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Diesel S10 para frota refrigerada quinzenal (Posto Graal)"
                className={`w-full px-3.5 py-2 rounded-xl border text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40 ${
                  errors.descricao ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                }`}
              />
              {errors.descricao && <p className="text-xs text-rose-600 mt-1">{errors.descricao}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Valor Total (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="text"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border font-mono font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40 ${
                    errors.valor ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.valor && <p className="text-xs text-rose-600 mt-1">{errors.valor}</p>}
            </div>
          </div>

          {/* 4. Fornecedor & Documento / NF */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fornecedor / Prestador de Serviço
              </label>
              <input
                type="text"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Ex: Thermo King Autorizada, LATAM Cargo, Posto Shell..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nº Documento / Nota Fiscal / Fatura
              </label>
              <input
                type="text"
                value={numeroDocumentoOuNF}
                onChange={(e) => setNumeroDocumentoOuNF(e.target.value)}
                placeholder="Ex: NF-e 45.891 ou Fatura FAT-2026/09"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40"
              />
            </div>
          </div>

          {/* 5. Datas, Status & Periodicidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mês Competência *
              </label>
              <input
                type="month"
                value={dataCompetencia}
                onChange={(e) => setDataCompetencia(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs focus:ring-2 focus:ring-[#C48229]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vencimento
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs focus:ring-2 focus:ring-[#C48229]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusCustoOperacional)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs font-medium focus:ring-2 focus:ring-[#C48229]/40"
              >
                <option value="Pago">Pago</option>
                <option value="A Pagar">A Pagar / Pendente</option>
                <option value="Provisionado">Provisionado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Periodicidade
              </label>
              <select
                value={periodicidade}
                onChange={(e) => setPeriodicidade(e.target.value as PeriodicidadeCusto)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs font-medium focus:ring-2 focus:ring-[#C48229]/40"
              >
                <option value="Recorrente">Recorrente</option>
                <option value="Mensal Fixo">Mensal Fixo</option>
                <option value="Avulso / Por Viagem">Avulso / Por Viagem</option>
              </select>
            </div>

            {status === 'Pago' && (
              <div className="sm:col-span-2 md:col-span-4 pt-2 border-t border-slate-200 flex items-center gap-3">
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Data de Pagamento Efetivo:
                </span>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="px-3 py-1 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs"
                />
              </div>
            )}
          </div>

          {/* 6. Campos Opcionais de Operação (Placa ou AWB) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                Placa(s) do Veículo / Equipamento (Opcional)
              </label>
              <input
                type="text"
                value={placaVeiculo}
                onChange={(e) => setPlacaVeiculo(e.target.value)}
                placeholder="Ex: RXT-8H20, BRA-4E19 ou Frota Geral"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-slate-400" />
                AWB / CTE / Conhecimento Aéreo (Opcional)
              </label>
              <input
                type="text"
                value={conhecimentoOuAwb}
                onChange={(e) => setConhecimentoOuAwb(e.target.value)}
                placeholder="Ex: AWB 037-98124401"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs"
              />
            </div>
          </div>

          {/* 7. Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Observações Adicionais / Justificativa
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes sobre a conformidade RDC 430, rota, calibração RBC, garantia..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 bg-white text-xs focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C48229] hover:bg-[#9A7B43] shadow-md shadow-[#C48229]/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialData ? 'Salvar Alterações' : 'Confirmar & Adicionar Custo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
