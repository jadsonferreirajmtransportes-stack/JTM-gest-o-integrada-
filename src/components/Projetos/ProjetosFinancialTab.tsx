import React from 'react';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Plane,
  Truck,
  Briefcase,
} from 'lucide-react';
import { ProjetoGerencial } from '../../types';

interface ProjetosFinancialTabProps {
  projetos: ProjetoGerencial[];
  onSelectProjeto: (p: ProjetoGerencial) => void;
}

export const ProjetosFinancialTab: React.FC<ProjetosFinancialTabProps> = ({
  projetos,
  onSelectProjeto,
}) => {
  const totalOrcado = projetos.reduce((acc, p) => acc + (p.orcamentoPrevisto || 0), 0);
  const totalRealizado = projetos.reduce((acc, p) => acc + (p.custoRealizado || 0), 0);
  const saldoTotal = totalOrcado - totalRealizado;

  // Capex vs Opex
  const capex = projetos
    .filter((p) => p.tipoInvestimento === 'Capex' || p.tipoInvestimento === 'Misto')
    .reduce((acc, p) => acc + (p.orcamentoPrevisto || 0), 0);
  const opex = projetos
    .filter((p) => p.tipoInvestimento === 'Opex')
    .reduce((acc, p) => acc + (p.orcamentoPrevisto || 0), 0);

  // Sector breakdown
  const sectorBudgets: Record<string, { orcado: number; realizado: number }> = {};
  projetos.forEach((p) => {
    const st = p.setorImpactado || 'Geral';
    if (!sectorBudgets[st]) sectorBudgets[st] = { orcado: 0, realizado: 0 };
    sectorBudgets[st].orcado += p.orcamentoPrevisto || 0;
    sectorBudgets[st].realizado += p.custoRealizado || 0;
  });

  return (
    <div className="space-y-6">
      {/* 3 Top Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Orçamento Total Aprovado (2026)
          </span>
          <span className="text-2xl font-black text-slate-900 font-mono">
            {totalOrcado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Capex: {capex.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
            <span>Opex: {opex.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Executado / Desembolsado
          </span>
          <span className="text-2xl font-black text-[#92611F] font-mono">
            {totalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#C48229] h-full rounded-full"
              style={{ width: `${totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Saldo Disponível / Economia
          </span>
          <span
            className={`text-2xl font-black font-mono ${
              saldoTotal >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {saldoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-500">
            {saldoTotal >= 0 ? 'Dentro do teto orçamentário previsto' : 'Alerta de estouro orçamentário'}
          </span>
        </div>
      </div>

      {/* Sector Allocation Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#C48229]" />
          Alocação Orçamentária por Setor Estratégico
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(sectorBudgets).map(([setor, values]) => {
            const execPct = values.orcado > 0 ? Math.round((values.realizado / values.orcado) * 100) : 0;
            return (
              <div key={setor} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block truncate">{setor}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {values.orcado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[11px] font-bold text-[#92611F] font-mono">{execPct}% gasto</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#C48229] h-full rounded-full" style={{ width: `${Math.min(execPct, 100)}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>Executado: {values.realizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Project Variance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Demonstrativo Financeiro & ROI por Projeto</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Projeto</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Orçado</th>
                <th className="py-2.5 px-3">Realizado</th>
                <th className="py-2.5 px-3">Saldo</th>
                <th className="py-2.5 px-3">ROI (Meses)</th>
                <th className="py-2.5 px-3">Retorno Esperado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projetos.map((p) => {
                const saldo = p.orcamentoPrevisto - p.custoRealizado;
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProjeto(p)}
                    className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-[#92611F]">{p.codigo}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{p.titulo}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">{p.tipoInvestimento || 'OPEX'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">
                      {p.orcamentoPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">
                      {p.custoRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-mono font-bold ${
                        saldo >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                      {p.roiEstimadoMeses ? `${p.roiEstimadoMeses}m` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                      {p.retornoEsperadoDescricao || 'Conformidade e eficiência'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
