import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  Download,
  Building2,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  Calendar,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Cliente } from '../../types';
import { SectorManagerialMetrics, SetorModuloId } from '../../utils/sectorUtils';
import { formatCurrency } from '../../utils/formatters';

interface SectorRevenueTabProps {
  setor: SetorModuloId;
  metrics: SectorManagerialMetrics;
  clientes: Cliente[];
  onOpenNovoCliente?: () => void;
  onOpenLinkModal: () => void;
  onSelectClienteDetail?: (cliente: Cliente) => void;
}

export const SectorRevenueTab: React.FC<SectorRevenueTabProps> = ({
  setor,
  metrics,
  clientes,
  onOpenNovoCliente,
  onOpenLinkModal,
  onSelectClienteDetail,
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'faturamento_desc' | 'faturamento_asc' | 'nome' | 'segmento'>('faturamento_desc');

  // Faturamento do cliente — real (Controle Financeiro) quando disponível, senão o campo
  // manual "estimado" (mesmo critério do SectorManagerialDashboard).
  const faturamentoCliente = (c: Cliente): number => {
    if (metrics.usaFaturamentoReal && metrics.faturamentoRealPorClienteChave) {
      const chave = c.id || `nome:${c.nomeFantasia}`;
      return metrics.faturamentoRealPorClienteChave[chave] ?? 0;
    }
    return Number(c.faturamentoMensalEstimado) || 0;
  };

  const filteredClientes = useMemo(() => {
    let list = clientes.filter((c) => {
      const q = search.toLowerCase();
      const matchName = (c.nomeFantasia || c.razaoSocial || '').toLowerCase().includes(q);
      const matchCnpj = (c.cnpj || '').includes(q);
      const matchSegmento = (c.segmento || '').toLowerCase().includes(q);
      const matchCidade = (c.cidadeUF || '').toLowerCase().includes(q);
      return matchName || matchCnpj || matchSegmento || matchCidade;
    });

    list.sort((a, b) => {
      if (sortBy === 'faturamento_desc') {
        return faturamentoCliente(b) - faturamentoCliente(a);
      }
      if (sortBy === 'faturamento_asc') {
        return faturamentoCliente(a) - faturamentoCliente(b);
      }
      if (sortBy === 'nome') {
        return (a.nomeFantasia || a.razaoSocial).localeCompare(b.nomeFantasia || b.razaoSocial);
      }
      if (sortBy === 'segmento') {
        return (a.segmento || '').localeCompare(b.segmento || '');
      }
      return 0;
    });

    return list;
  }, [clientes, search, sortBy, metrics.usaFaturamentoReal, metrics.faturamentoRealPorClienteChave]);

  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Razão Social',
      'Nome Fantasia',
      'CNPJ',
      'Segmento',
      'Cidade/UF',
      'Faturamento Mensal (R$)',
      '% Participação Setor',
      'Tipo Cobrança Frete',
      'Condição Pagamento',
      'Dia Fechamento',
      'Gerente de Conta',
      'Status',
    ];

    const rows = filteredClientes.map((c) => {
      const fat = faturamentoCliente(c);
      const part = metrics.faturamentoMensalTotal > 0 ? (fat / metrics.faturamentoMensalTotal) * 100 : 0;
      return [
        c.codigoCliente || c.id,
        c.razaoSocial,
        c.nomeFantasia || c.razaoSocial,
        c.cnpj,
        c.segmento,
        c.cidadeUF,
        fat.toFixed(2),
        part.toFixed(2) + '%',
        c.tabelaFrete?.tipoCobranca || 'Tabela Padrão',
        c.tabelaFrete?.condicaoPagamento || 'Mensal 30 dias',
        c.tabelaFrete?.diaFechamento || '30',
        c.gerenteContaResponsavel || 'Comercial',
        c.status,
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `faturamento_setor_${setor}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Revenue Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>Faturamento Mensal Consolidado</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.faturamentoMensalTotal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between gap-2">
            <span>Base: {clientes.length} empresas atreladas</span>
            {metrics.usaFaturamentoReal ? (
              <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                Real
              </span>
            ) : (
              <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                Estimado
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>Projeção de Receita Anual</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.faturamentoAnualizado)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            12 meses de receita recorrente
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>Ticket Médio por Empresa</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.ticketMedioCliente)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Média mensal faturada por conta
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>Volume Mensal Estimado</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {metrics.volumeMensalEstimado.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">entregas/mês</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Capacidade operacional atendida
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filters & Actions */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por empresa, CNPJ, praça..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="faturamento_desc">Maior Faturamento</option>
                <option value="faturamento_asc">Menor Faturamento</option>
                <option value="nome">Nome da Empresa</option>
                <option value="segmento">Segmento</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={onOpenLinkModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#C48229] hover:bg-[#92611F] text-white shadow-xs transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Vincular Empresa</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        {filteredClientes.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Nenhuma empresa encontrada com os filtros</p>
            <p className="text-xs text-slate-400 mt-1">Vincule empresas ao setor para visualizar o faturamento gerencial.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Empresa / Cliente</th>
                  <th className="py-3 px-4">Segmento & Local</th>
                  <th className="py-3 px-4 text-right">Faturamento Mensal</th>
                  <th className="py-3 px-4 text-center">Participação Setor</th>
                  <th className="py-3 px-4">Tabela & Cobrança</th>
                  <th className="py-3 px-4">Condição Pgto</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClientes.map((c) => {
                  const fat = faturamentoCliente(c);
                  const part =
                    metrics.faturamentoMensalTotal > 0
                      ? (fat / metrics.faturamentoMensalTotal) * 100
                      : 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.nomeFantasia || c.razaoSocial}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {c.codigoCliente || 'CLI'} • CNPJ: {c.cnpj}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{c.segmento}</div>
                        <div className="text-[11px] text-slate-500">{c.cidadeUF}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(fat)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.volumeEntregasMesEstimado || 0} volumes/mês
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#C48229] h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, part)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-700 text-[11px]">
                            {part.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700 font-medium">
                          {c.tabelaFrete?.tipoCobranca || 'Tabela Padrão'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Base: {formatCurrency(c.tabelaFrete?.valorBase || 0)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700">
                          {c.tabelaFrete?.condicaoPagamento || 'Mensal (30 dias)'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Fechamento: Dia {c.tabelaFrete?.diaFechamento || 30}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'Ativo'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onSelectClienteDetail && (
                          <button
                            onClick={() => onSelectClienteDetail(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Ver detalhes do cliente"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
