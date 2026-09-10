import React, { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Building2,
  Users,
  PieChart,
  Percent,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Plane,
  Truck,
  Flame,
  Snowflake,
  BarChart3,
  Briefcase,
  Layers,
} from 'lucide-react';
import { Cliente, Colaborador } from '../../types';
import { SectorManagerialMetrics, SetorModuloId } from '../../utils/sectorUtils';
import { formatCurrency, formatMoney } from '../../utils/formatters';

interface SectorManagerialDashboardProps {
  setor: SetorModuloId;
  metrics: SectorManagerialMetrics;
  clientes: Cliente[];
  colaboradores: Colaborador[];
  onOpenLinkModal: (mode: 'clientes' | 'colaboradores') => void;
  onSwitchTab: (tab: string) => void;
}

export const SectorManagerialDashboard: React.FC<SectorManagerialDashboardProps> = ({
  setor,
  metrics,
  clientes,
  colaboradores,
  onOpenLinkModal,
  onSwitchTab,
}) => {
  const isAereo = setor === 'farma_aereo';
  const themeBg = isAereo ? 'bg-sky-600' : 'bg-emerald-600';
  const themeText = isAereo ? 'text-sky-700' : 'text-emerald-700';
  const themeBorder = isAereo ? 'border-sky-200' : 'border-emerald-200';
  const themeLightBg = isAereo ? 'bg-sky-50' : 'bg-emerald-50';

  // Faturamento do cliente — usa a média mensal real (Controle Financeiro) quando
  // disponível; cai para o campo manual "estimado" só nos setores sem lançamento
  // granular (ex.: Rodoviário hoje).
  const faturamentoCliente = (c: Cliente): number => {
    if (metrics.usaFaturamentoReal && metrics.faturamentoRealPorClienteChave) {
      const chave = c.id || `nome:${c.nomeFantasia}`;
      const real = metrics.faturamentoRealPorClienteChave[chave];
      if (real !== undefined) return real;
      // Cliente vinculado ao setor mas sem nenhum lançamento ainda — real é 0, não a estimativa.
      return 0;
    }
    return Number(c.faturamentoMensalEstimado) || 0;
  };

  // Sorted top revenue clients
  const topClientes = useMemo(() => {
    return [...clientes].sort((a, b) => faturamentoCliente(b) - faturamentoCliente(a)).slice(0, 5);
  }, [clientes, metrics.usaFaturamentoReal, metrics.faturamentoRealPorClienteChave]);

  // Group roles in team
  const rolesDistribution = useMemo(() => {
    const map: Record<string, { count: number; totalSalarios: number }> = {};
    colaboradores.forEach((c) => {
      const cargo = c.funcaoCargo || 'Colaborador';
      if (!map[cargo]) {
        map[cargo] = { count: 0, totalSalarios: 0 };
      }
      map[cargo].count += 1;
      map[cargo].totalSalarios += Number(c.remuneracao) || 0;
    });
    return Object.entries(map).map(([cargo, data]) => ({
      cargo,
      count: data.count,
      totalSalarios: data.totalSalarios,
      media: data.count > 0 ? data.totalSalarios / data.count : 0,
    }));
  }, [colaboradores]);

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Faturamento Mensal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Faturamento Mensal</span>
            <div className={`p-2 rounded-xl ${themeLightBg} ${themeText}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.faturamentoMensalTotal)}
          </div>
          <div className="mt-1">
            {metrics.usaFaturamentoReal ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full"
                title="Média mensal calculada a partir dos lançamentos do Controle Financeiro"
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                Real — média de {metrics.mesesComDadosReais || 0} {(metrics.mesesComDadosReais || 0) === 1 ? 'mês' : 'meses'}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"
                title="Soma do campo 'Faturamento Mensal Estimado' cadastrado em cada cliente — ainda sem lançamento real neste setor"
              >
                <AlertCircle className="w-2.5 h-2.5" />
                Estimado
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Anualizado:</span>
            <span className="font-semibold text-slate-800">
              {formatCurrency(metrics.faturamentoAnualizado)}
            </span>
          </div>
        </div>

        {/* KPI 2: Custos Operacionais Totais */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Custos Operacionais Totais</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.custoTotalSetor)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Folha RH + Diretos:</span>
            <span className="font-semibold text-rose-600">
              {((metrics.custoTotalSetor / (metrics.faturamentoMensalTotal || 1)) * 100).toFixed(1)}% da receita
            </span>
          </div>
        </div>

        {/* KPI 3: Margem de Contribuição / EBITDA */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Margem de Contribuição</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(metrics.margemContribuicao)}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              {metrics.margemPercentual.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Resultado Operacional:</span>
            <span className="font-semibold text-emerald-700">Lucro Positivo</span>
          </div>
        </div>

        {/* KPI 4: Carteira & Equipe */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Carteira & Headcount</span>
            <div className={`p-2 rounded-xl ${themeLightBg} ${themeText}`}>
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-black text-slate-900">
                {metrics.totalClientesVinculados} <span className="text-xs font-normal text-slate-500">empresas</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {metrics.totalClientesAtivos} ativas no setor
              </div>
            </div>
            <div className="text-right border-l border-slate-200 pl-4">
              <div className="text-xl font-black text-slate-900">
                {metrics.headcountEquipe} <span className="text-xs font-normal text-slate-500">colab.</span>
              </div>
              <div className="text-[11px] text-slate-400">equipe alocada</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Ticket Médio / Cliente:</span>
            <span className="font-semibold text-slate-800">
              {formatCurrency(metrics.ticketMedioCliente)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Section: DRE do Setor + Composição de Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: DRE Gerencial do Setor (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${themeLightBg} ${themeText}`}>
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Demonstrativo de Resultados do Setor (DRE Gerencial)
                </h3>
                <p className="text-xs text-slate-500">
                  Visão contábil e de rentabilidade mensal consolidada
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Mês Vigente
            </span>
          </div>

          <div className="p-6">
            <div className="space-y-3 font-mono text-xs">
              {/* 1. Receita Bruta */}
              <div className="flex items-center justify-between py-2 border-b border-slate-200 bg-slate-50/70 px-3 rounded-lg font-sans">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-mono">(+)</span> 1. Receita Operacional Bruta (Faturamento)
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatCurrency(metrics.faturamentoMensalTotal)}
                </span>
              </div>

              {/* 2. Deduções */}
              <div className="flex items-center justify-between py-1.5 px-3 text-slate-600 font-sans">
                <span className="flex items-center gap-1.5 pl-4">
                  <span className="text-rose-500 font-mono">(-)</span> Impostos sobre Faturamento (Simples/Presumido ~6%)
                </span>
                <span className="font-mono text-rose-600 font-medium">
                  - {formatCurrency(metrics.impostosSobreFaturamento)}
                </span>
              </div>

              {/* 3. Receita Líquida */}
              <div className="flex items-center justify-between py-2 border-y border-slate-200 bg-slate-50 px-3 rounded-lg font-sans">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-blue-600 font-mono">(=)</span> 2. Receita Operacional Líquida
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(metrics.receitaLiquida)}
                </span>
              </div>

              {/* 4. Custos com Pessoal */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between py-1 px-3 text-slate-800 font-sans font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-500 font-mono">(-)</span> 3. Custos com Equipe & Folha de Pagamento
                  </span>
                  <span className="font-mono text-rose-600 font-bold">
                    - {formatCurrency(metrics.custoTotalFolhaPatronal)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-3 text-slate-500 text-[11px] font-sans pl-8">
                  <span>• Salários Base ({metrics.headcountEquipe} colaboradores)</span>
                  <span className="font-mono">{formatCurrency(metrics.totalSalariosBase)}</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-3 text-slate-500 text-[11px] font-sans pl-8">
                  <span>• Benefícios CCT (Vale Transporte + Vale Alimentação)</span>
                  <span className="font-mono">{formatCurrency(metrics.totalBeneficiosVtVa)}</span>
                </div>
                <div className="flex items-center justify-between py-0.5 px-3 text-slate-500 text-[11px] font-sans pl-8">
                  <span>• Encargos CLT & Provisões (INSS, FGTS, 13º, Férias)</span>
                  <span className="font-mono">{formatCurrency(metrics.totalEncargosCltPatronais)}</span>
                </div>
              </div>

              {/* 5. Custos Operacionais Diretos */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between py-1 px-3 text-slate-800 font-sans font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-500 font-mono">(-)</span> 4. Custos Operacionais Específicos do Setor
                  </span>
                  <span className="font-mono text-rose-600 font-bold">
                    - {formatCurrency(metrics.custoTotalOperacionalDireto)}
                  </span>
                </div>
                {metrics.custosOperacionaisDiretos.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-0.5 px-3 text-slate-500 text-[11px] font-sans pl-8"
                  >
                    <span>• {item.categoria} ({item.percentualFaturamento.toFixed(1)}%)</span>
                    <span className="font-mono">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>

              {/* 6. Lucro Operacional / Margem */}
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-sans">
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    (=) 5. Lucro Operacional Bruto / Margem de Contribuição
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Margem EBITDA do Setor: {metrics.margemPercentual.toFixed(2)}% sobre a receita bruta
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-800 font-mono">
                    {formatCurrency(metrics.margemContribuicao)}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                    Rentável
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Custos Operacionais Detalhados + Distribuição (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Composição de Custos do Setor */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600" />
                Composição de Custos do Setor
              </h3>
              <button
                onClick={() => onSwitchTab('custos')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Folha RH */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Equipe & Folha Patronal (RH)</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatCurrency(metrics.custoTotalFolhaPatronal)} (
                    {((metrics.custoTotalFolhaPatronal / (metrics.custoTotalSetor || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (metrics.custoTotalFolhaPatronal / (metrics.custoTotalSetor || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Custos Operacionais Diretos */}
              {metrics.custosOperacionaisDiretos.map((c, i) => {
                const pct = (c.valor / (metrics.custoTotalSetor || 1)) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 truncate max-w-[200px]">{c.categoria}</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatCurrency(c.valor)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          i === 0 ? 'bg-sky-500' : i === 1 ? 'bg-amber-500' : i === 2 ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Top Contratos do Setor */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Principais Contratos da Carteira
              </h3>
              <button
                onClick={() => onSwitchTab('empresas')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Ver {metrics.totalClientesVinculados}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topClientes.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Nenhuma empresa vinculada a este setor.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topClientes.map((cli) => {
                  const faturamento = faturamentoCliente(cli);
                  const part =
                    metrics.faturamentoMensalTotal > 0
                      ? (faturamento / metrics.faturamentoMensalTotal) * 100
                      : 0;
                  return (
                    <div key={cli.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{cli.nomeFantasia || cli.razaoSocial}</div>
                        <div className="text-[11px] text-slate-500">
                          {cli.cidadeUF} • {cli.segmento}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {formatCurrency(faturamento)}
                        </div>
                        <div className="text-[10px] text-slate-400">{part.toFixed(1)}% do setor</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Roles & Team Structure Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Estrutura de Cargos & Folha do Setor
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição do headcount e remuneração média da equipe alocada
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenLinkModal('colaboradores')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              + Alocar Colaborador
            </button>
            <button
              onClick={() => onSwitchTab('equipe')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Ver Quadro Completo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rolesDistribution.map((role, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                <span className="truncate">{role.cargo}</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 text-[10px]">
                  {role.count} {role.count === 1 ? 'vaga' : 'vagas'}
                </span>
              </div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">
                {formatCurrency(role.totalSalarios)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Média: {formatCurrency(role.media)} / colab.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
