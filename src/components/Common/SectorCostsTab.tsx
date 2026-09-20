import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Download,
  AlertCircle,
  PieChart,
  Plane,
  Truck,
  CheckCircle2,
  Layers,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Calendar,
  Building2,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { Colaborador, CustoOperacional, StatusCustoOperacional } from '../../types';
import { SectorManagerialMetrics, SetorModuloId } from '../../utils/sectorUtils';
import { formatCurrency } from '../../utils/formatters';

interface SectorCostsTabProps {
  setor: SetorModuloId;
  metrics: SectorManagerialMetrics;
  colaboradores: Colaborador[];
  custosOperacionais?: CustoOperacional[];
  onOpenNovoCusto?: () => void;
  onEditCusto?: (custo: CustoOperacional) => void;
  onDeleteCusto?: (id: string) => void;
  onToggleStatusCusto?: (id: string, newStatus: StatusCustoOperacional) => void;
  onOpenLinkModal: () => void;
  onOpenNovoColaborador?: () => void;
  /** Quantas operações ativas existem hoje — define a fração do rateio de um custo "Geral"
   *  (1/N). Com as 2 operações originais isso já dá 50%, então o padrão preserva o
   *  comportamento de sempre quando nenhuma 3ª operação ainda foi cadastrada. */
  totalOperacoesAtivas?: number;
  nomeSetorGenerico?: string;
  iconeSetorGenerico?: React.ElementType;
}

export const SectorCostsTab: React.FC<SectorCostsTabProps> = ({
  setor,
  metrics,
  colaboradores,
  custosOperacionais = [],
  onOpenNovoCusto,
  onEditCusto,
  onDeleteCusto,
  onToggleStatusCusto,
  onOpenLinkModal,
  onOpenNovoColaborador,
  totalOperacoesAtivas = 2,
  nomeSetorGenerico,
  iconeSetorGenerico,
}) => {
  const isAereo = setor === 'farma_aereo';
  const isRodoviario = setor === 'farma_rodoviario';
  const fracaoRateio = 1 / Math.max(totalOperacoesAtivas, 1);
  const [activeTab, setActiveTab] = useState<'lancamentos' | 'composicao'>('lancamentos');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | StatusCustoOperacional>('Todos');

  // Filtrar custos operacionais deste setor (e os gerais que são rateados)
  const sectorCosts = useMemo(() => {
    return custosOperacionais.filter((c) => c.setor === setor || c.setor === 'geral');
  }, [custosOperacionais, setor]);

  // Filtrar por busca e status
  const filteredCosts = useMemo(() => {
    return sectorCosts.filter((item) => {
      if (statusFilter !== 'Todos' && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = item.descricao?.toLowerCase().includes(q);
        const matchCat = item.categoria?.toLowerCase().includes(q);
        const matchForn = item.fornecedor?.toLowerCase().includes(q);
        const matchDoc = item.numeroDocumentoOuNF?.toLowerCase().includes(q);
        const matchPlaca = item.placaVeiculo?.toLowerCase().includes(q);
        const matchAwb = item.conhecimentoOuAwb?.toLowerCase().includes(q);
        if (!matchDesc && !matchCat && !matchForn && !matchDoc && !matchPlaca && !matchAwb) {
          return false;
        }
      }
      return true;
    });
  }, [sectorCosts, statusFilter, searchQuery]);

  // Totais dos custos cadastrados
  const totalLancado = useMemo(() => {
    return sectorCosts.reduce((acc, c) => acc + (c.setor === 'geral' ? c.valor * fracaoRateio : c.valor), 0);
  }, [sectorCosts, fracaoRateio]);

  const totalPago = useMemo(() => {
    return sectorCosts
      .filter((c) => c.status === 'Pago')
      .reduce((acc, c) => acc + (c.setor === 'geral' ? c.valor * fracaoRateio : c.valor), 0);
  }, [sectorCosts, fracaoRateio]);

  const totalAPagar = useMemo(() => {
    return sectorCosts
      .filter((c) => c.status === 'A Pagar' || c.status === 'Provisionado')
      .reduce((acc, c) => acc + (c.setor === 'geral' ? c.valor * fracaoRateio : c.valor), 0);
  }, [sectorCosts, fracaoRateio]);

  const handleExportCSV = () => {
    const headers = [
      'Setor',
      'Categoria',
      'Descrição',
      'Valor (R$)',
      'Status',
      'Fornecedor',
      'Nº Documento/NF',
      'Competência',
      'Vencimento',
      'Placa/AWB',
    ];

    const rows = sectorCosts.map((c) => [
      c.setor === 'farma_aereo'
        ? 'Farma Aéreo'
        : c.setor === 'farma_rodoviario'
        ? 'Farma Rodoviário'
        : c.setor === 'geral'
        ? 'Geral / Compartilhado'
        : c.setor,
      c.categoria,
      c.descricao,
      c.valor.toFixed(2),
      c.status,
      c.fornecedor || '',
      c.numeroDocumentoOuNF || '',
      c.dataCompetencia || '',
      c.dataVencimento || '',
      c.placaVeiculo || c.conhecimentoOuAwb || '',
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `custos_operacionais_${setor}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Cost KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>Custo Total do Setor</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.custoTotalSetor)}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-2">
            {((metrics.custoTotalSetor / (metrics.faturamentoMensalTotal || 1)) * 100).toFixed(1)}% do faturamento bruto
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>Folha & Encargos CLT (RH)</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.custoTotalFolhaPatronal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {metrics.headcountEquipe} colaboradores • Méd: {formatCurrency(metrics.custoMedioPorColaborador)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>Custos Operacionais Diretos</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.custoTotalOperacionalDireto)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{sectorCosts.length} lançamentos</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">Pago: {formatCurrency(totalPago)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>Margem de Sobra / EBITDA</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(metrics.margemContribuicao)}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-2">
            Margem Líquida: {metrics.margemPercentual.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section: Custos Operacionais Detalhados e Inserção (7/8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col space-y-5">
          {/* Header with Title and Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#C48229]/15 text-[#92611F]">
                  {isAereo ? (
                    <Plane className="w-4 h-4" />
                  ) : isRodoviario ? (
                    <Truck className="w-4 h-4" />
                  ) : (
                    React.createElement(iconeSetorGenerico || Building2, { className: 'w-4 h-4' })
                  )}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Custos Operacionais & Despesas ({isAereo ? 'Farma Aéreo' : isRodoviario ? 'Farma Rodoviário' : nomeSetorGenerico || setor})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Cadastre e acompanhe notas fiscais, abastecimento, manutenção, insumos térmicos e tarifas
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Exportar dados para planilha Excel / CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>

              {onOpenNovoCusto && (
                <button
                  type="button"
                  onClick={onOpenNovoCusto}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#C48229] hover:bg-[#9A7B43] shadow-sm shadow-[#C48229]/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Custo</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Selection: Lançamentos Detalhados vs Composição por Categoria */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('lancamentos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'lancamentos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lançamentos Detalhados ({sectorCosts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('composicao')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'composicao'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Composição por Categoria
              </button>
            </div>

            {/* Quick summary numbers */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                Pago: {formatCurrency(totalPago)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-200/60">
                A Pagar: {formatCurrency(totalAPagar)}
              </span>
            </div>
          </div>

          {/* Tab 1: Lançamentos Detalhados */}
          {activeTab === 'lancamentos' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por fornecedor, NF, descrição, placa..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(['Todos', 'Pago', 'A Pagar', 'Provisionado'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === st
                          ? 'bg-[#C48229] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of Costs */}
              {filteredCosts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-200/60 flex items-center justify-center text-slate-400">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Nenhum custo operacional encontrado</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery || statusFilter !== 'Todos'
                        ? 'Nenhum lançamento corresponde aos filtros aplicados.'
                        : 'Comece a registrar as despesas operacionais deste setor para um controle gerencial completo.'}
                    </p>
                  </div>
                  {onOpenNovoCusto && (
                    <button
                      type="button"
                      onClick={onOpenNovoCusto}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#C48229] hover:bg-[#9A7B43] shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Primeiro Custo</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {filteredCosts.map((item) => {
                    const isGeral = item.setor === 'geral';
                    const valorEfetivo = isGeral ? item.valor * fracaoRateio : item.valor;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">
                              {item.categoria}
                            </span>
                            {isGeral && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Geral (Rateado {Math.round(fracaoRateio * 100)}%)
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                item.status === 'Pago'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                  : item.status === 'A Pagar'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200'
                              }`}
                              title="Clique para alternar o status"
                              onClick={() => {
                                if (onToggleStatusCusto) {
                                  const nextStatus: StatusCustoOperacional =
                                    item.status === 'Pago'
                                      ? 'A Pagar'
                                      : item.status === 'A Pagar'
                                      ? 'Provisionado'
                                      : 'Pago';
                                  onToggleStatusCusto(item.id, nextStatus);
                                }
                              }}
                            >
                              ● {item.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 font-medium leading-snug">
                            {item.descricao}
                          </p>

                          {/* Metadata row */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            {item.fornecedor && (
                              <span className="flex items-center gap-1 font-medium text-slate-600">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {item.fornecedor}
                              </span>
                            )}
                            {item.numeroDocumentoOuNF && (
                              <span className="flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                <FileText className="w-3 h-3 text-slate-400" />
                                {item.numeroDocumentoOuNF}
                              </span>
                            )}
                            {item.placaVeiculo && (
                              <span className="flex items-center gap-1 font-mono text-slate-600">
                                <Truck className="w-3 h-3 text-slate-400" />
                                {item.placaVeiculo}
                              </span>
                            )}
                            {item.conhecimentoOuAwb && (
                              <span className="flex items-center gap-1 font-mono text-sky-700">
                                <Plane className="w-3 h-3 text-sky-500" />
                                {item.conhecimentoOuAwb}
                              </span>
                            )}
                            {item.dataCompetencia && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Calendar className="w-3 h-3" />
                                Comp: {item.dataCompetencia}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Value and Actions */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-2">
                          <div className="text-right">
                            <div className="text-base font-black font-mono text-slate-900">
                              {formatCurrency(valorEfetivo)}
                            </div>
                            {isGeral && (
                              <div className="text-[10px] text-purple-600 font-medium">
                                (Integral: {formatCurrency(item.valor)})
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400">
                              {metrics.faturamentoMensalTotal > 0
                                ? `${((valorEfetivo / metrics.faturamentoMensalTotal) * 100).toFixed(1)}% rec.`
                                : ''}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {onEditCusto && (
                              <button
                                type="button"
                                onClick={() => onEditCusto(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Editar custo operacional"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteCusto && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Excluir o lançamento "${item.descricao}"?`)) {
                                    onDeleteCusto(item.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir custo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Composição Analítica por Categoria */}
          {activeTab === 'composicao' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-700" />
                  <span>
                    Consolidação de custos operacionais diretos agrupados por categoria contábil.
                  </span>
                </div>
                <span className="font-bold text-amber-950 font-mono">
                  {formatCurrency(metrics.custoTotalOperacionalDireto)}
                </span>
              </div>

              <div className="space-y-3">
                {metrics.custosOperacionaisDiretos.map((item, index) => {
                  const pctOfCosts = (item.valor / (metrics.custoTotalSetor || 1)) * 100;
                  return (
                    <div
                      key={index}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                            <span>{item.categoria}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                              {item.tipo}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.descricao}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-sm text-slate-900">
                            {formatCurrency(item.valor)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.percentualFaturamento.toFixed(1)}% da receita
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden mt-2">
                        <div
                          className="bg-[#C48229] h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, pctOfCosts)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Folha de Pagamento & Encargos Patronais (4/5 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Custos de Folha & Encargos CLT
                </h3>
                <p className="text-xs text-slate-500">
                  Custos trabalhistas da equipe do setor
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenLinkModal}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Vincular
              </button>
            </div>

            <div className="space-y-2.5 font-sans text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Salários Base ({metrics.headcountEquipe} colab.)</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(metrics.totalSalariosBase)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-600">Benefícios CCT 2026</span>
                  <div className="text-[10px] text-slate-400">Vale Transporte + Vale Alimentação R$ 35/dia</div>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(metrics.totalBeneficiosVtVa)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-600">Encargos CLT Patronais</span>
                  <div className="text-[10px] text-slate-400">FGTS 8%, 13º, Férias + 1/3, INSS (~35.4%)</div>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(metrics.totalEncargosCltPatronais)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-900">Custo Total de Pessoal</div>
                  <div className="text-[10px] text-indigo-700">
                    Média de {formatCurrency(metrics.custoMedioPorColaborador)} / colab.
                  </div>
                </div>
                <div className="font-mono font-black text-sm text-indigo-900">
                  {formatCurrency(metrics.custoTotalFolhaPatronal)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-slate-800">
              <ShieldCheck className="w-4 h-4 text-[#C48229]" />
              Gestão Orçamentária JMT
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              O DRE gerencial consolida a receita dos clientes ativos, subtrai a folha patronal e os custos operacionais diretos lançados em tempo real.
            </p>
            {onOpenNovoCusto && (
              <button
                type="button"
                onClick={onOpenNovoCusto}
                className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold text-[#92611F] bg-[#C48229]/10 hover:bg-[#C48229]/20 border border-[#C48229]/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lançar Nova Despesa</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
