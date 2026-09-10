import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Building2,
  TrendingUp,
  Bus,
  Utensils,
  Wallet,
  ShieldCheck,
  HeartHandshake,
  Percent,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Colaborador, Empregador } from '../../types';
import {
  formatMoney,
  calcVtMes,
  calcVaMes,
  calcCustoMensalTotal,
  calcVtDia,
  calcCustoPatronalCompleto,
  SALARIO_MINIMO_NACIONAL,
  VALOR_VA_CCT_DIA,
  SUBSIDIO_SAUDE_CCT_MES,
  CUIDADO_PESSOAL_CCT_MES,
} from '../../utils/formatters';
import { CCT_PISOS_SALARIAIS, CCT_METADATA } from '../../data/cctData';
import { exportCustosMensaisReport } from '../../utils/exportUtils';

interface MonthlyCostViewProps {
  colaboradores: Colaborador[];
  empregadores: Empregador[];
}

export const MonthlyCostView: React.FC<MonthlyCostViewProps> = ({
  colaboradores,
  empregadores,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('todos');
  const [selectedEmpregador, setSelectedEmpregador] = useState('todos');
  const [viewMode, setViewMode] = useState<'operacional' | 'clt_cct'>('clt_cct');

  // Filter active employees (or on vacation / afastado)
  const ativos = useMemo(() => {
    return colaboradores.filter((c) => c.status !== 'Inativo');
  }, [colaboradores]);

  const setoresUnicos = useMemo(() => {
    const s = new Set<string>();
    ativos.forEach((c) => {
      if (c.setor) s.add(c.setor);
    });
    return Array.from(s).sort();
  }, [ativos]);

  const filtered = useMemo(() => {
    return ativos.filter((c) => {
      if (selectedSetor !== 'todos' && c.setor !== selectedSetor) return false;
      if (selectedEmpregador !== 'todos' && c.empregadorId !== selectedEmpregador) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = c.nomeCompleto?.toLowerCase().includes(q);
        const matchCargo = c.funcaoCargo?.toLowerCase().includes(q);
        const matchMatricula = c.codigoMatricula?.toLowerCase().includes(q);
        if (!matchName && !matchCargo && !matchMatricula) return false;
      }
      return true;
    });
  }, [ativos, selectedSetor, selectedEmpregador, searchQuery]);

  // Overall calculations for filtered list
  const costSummaries = useMemo(() => {
    return filtered.map((c) => {
      // Find matching CCT floor
      const pisoMatch = CCT_PISOS_SALARIAIS.find(
        (p) =>
          p.funcao.toLowerCase().includes((c.funcaoCargo || '').toLowerCase()) ||
          (c.funcaoCargo || '').toLowerCase().includes(p.funcao.toLowerCase())
      );

      const detailed = calcCustoPatronalCompleto({
        remuneracao: c.remuneracao || 0,
        gratificacao: c.gratificacao || 0,
        adicionalPericulosidade: c.adicionalPericulosidade,
        adicionalInsalubridade: c.adicionalInsalubridade,
        adicionalAcumulo: c.adicionalAcumuloFuncao,
        adicionalPenosidade: c.adicionalPenosidade,
        possuiQuinquenio: c.possuiQuinquenio,
        numeroQuinquenios: c.numeroQuinquenios || 1,
        vtQtdTarifasDia: c.vtQuantidadeTarifasDia,
        vtValorTarifa: c.vtValorTarifa,
        vaValorDia: c.valorValeAlimentacaoDia || VALOR_VA_CCT_DIA,
        filiadoSintrocern: c.filiadoSintrocern,
        diasUteis: 22,
      });

      const vtDia = calcVtDia(c.vtValorTarifa, c.vtQuantidadeTarifasDia);
      const vtMes = calcVtMes(c.vtValorTarifa, c.vtQuantidadeTarifasDia);
      const vaMes = calcVaMes(c.valorValeAlimentacaoDia || VALOR_VA_CCT_DIA);
      const custoOperacionalDireto = calcCustoMensalTotal(
        c.remuneracao,
        c.gratificacao,
        c.vtValorTarifa,
        c.vtQuantidadeTarifasDia,
        c.valorValeAlimentacaoDia || VALOR_VA_CCT_DIA
      );

      const pisoReferencia = pisoMatch ? pisoMatch.salarioBase : c.pisoCctFuncao || 0;
      const abaixoPiso = pisoReferencia > 0 && (c.remuneracao || 0) < pisoReferencia;

      return {
        colaborador: c,
        pisoReferencia,
        abaixoPiso,
        vtDia,
        vtMes,
        vaMes,
        custoOperacionalDireto,
        detailed,
      };
    });
  }, [filtered]);

  // Overall totals
  const totalSalarios = useMemo(
    () => costSummaries.reduce((acc, item) => acc + (item.colaborador.remuneracao || 0), 0),
    [costSummaries]
  );
  const totalGratificacoes = useMemo(
    () => costSummaries.reduce((acc, item) => acc + (item.colaborador.gratificacao || 0), 0),
    [costSummaries]
  );
  const totalAdicionaisCct = useMemo(
    () => costSummaries.reduce((acc, item) => acc + item.detailed.adicionaisTotal, 0),
    [costSummaries]
  );
  const totalVt = useMemo(
    () => costSummaries.reduce((acc, item) => acc + item.vtMes, 0),
    [costSummaries]
  );
  const totalVa = useMemo(
    () => costSummaries.reduce((acc, item) => acc + item.vaMes, 0),
    [costSummaries]
  );
  const totalEncargosClt = useMemo(
    () => costSummaries.reduce((acc, item) => acc + item.detailed.encargosCltTotal, 0),
    [costSummaries]
  );
  const totalBeneficiosCct = useMemo(
    () => costSummaries.reduce((acc, item) => acc + item.detailed.beneficiosCctTotal, 0),
    [costSummaries]
  );
  const totalGeralOperacional = totalSalarios + totalGratificacoes + totalVt + totalVa;
  const totalGeralCltCct = useMemo(
    () => costSummaries.reduce((acc, item) => acc + item.detailed.custoTotalMensal, 0),
    [costSummaries]
  );

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold uppercase">
              Gestão de Custos DP
            </span>
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              CCT 2026/2028 (SETCERN × SINTROCERN)
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Custo Mensal Consolidado por Colaborador
          </h2>
          <p className="text-xs text-slate-500">
            Cálculo automatizado parametrizado pela CLT e Convenção Coletiva do Transporte Rodoviário de Cargas (VA R$ 32,00/dia, Saúde R$ 189,50/mês, Bem Mais Benefícios R$ 47,90/mês).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('clt_cct')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'clt_cct'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custo Total CLT + CCT
            </button>
            <button
              type="button"
              onClick={() => setViewMode('operacional')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'operacional'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Direto (Salário + VT + VA)
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportCustosMensaisReport(filtered, 'xlsx')}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => exportCustosMensaisReport(filtered, 'csv')}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Salarial Base + Adicionais */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Salários Base & Adicionais CCT</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900">{formatMoney(totalSalarios + totalAdicionaisCct)}</div>
          <div className="text-[10px] text-slate-500 mt-1">
            Base: {formatMoney(totalSalarios)} {totalAdicionaisCct > 0 && `+ ${formatMoney(totalAdicionaisCct)} adicionais CCT`}
          </div>
        </div>

        {/* Total Encargos CLT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Provisões CLT & FGTS</span>
            <Percent className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-900">{formatMoney(totalEncargosClt)}</div>
          <div className="text-[10px] text-slate-500 mt-1">FGTS (8%) + 13º (8,33%) + Férias+1/3 (11,11%)</div>
        </div>

        {/* Total Benefícios CCT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Benefícios CCT 2026/2028</span>
            <HeartHandshake className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-900">{formatMoney(totalBeneficiosCct)}</div>
          <div className="text-[10px] text-slate-500 mt-1">VA R$32/d + Saúde R$189,50 + Cuidado R$47,90 + VT</div>
        </div>

        {/* Custo Global Mensal */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-4 rounded-xl shadow-xs text-white">
          <div className="flex items-center justify-between text-amber-100 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              {viewMode === 'clt_cct' ? 'Custo Global Total CLT+CCT' : 'Custo Direto Mensal'}
            </span>
            <DollarSign className="w-5 h-5 text-amber-200" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatMoney(viewMode === 'clt_cct' ? totalGeralCltCct : totalGeralOperacional)}
          </div>
          <div className="text-[10px] text-amber-100 mt-1">
            {filtered.length} colaboradores ativos considerados
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por colaborador ou cargo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <select
          value={selectedSetor}
          onChange={(e) => setSelectedSetor(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
        >
          <option value="todos">Todos os Setores</option>
          {setoresUnicos.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {empregadores.length > 1 && (
          <select
            value={selectedEmpregador}
            onChange={(e) => setSelectedEmpregador(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="todos">Todas as Empresas</option>
            {empregadores.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nomeFantasia || emp.razaoSocial}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
              {viewMode === 'clt_cct' ? (
                <tr>
                  <th className="py-3 px-4">Colaborador / Função CCT</th>
                  <th className="py-3 px-3">Setor</th>
                  <th className="py-3 px-3 text-right">Salário Base</th>
                  <th className="py-3 px-3 text-right">Adicionais CCT</th>
                  <th className="py-3 px-3 text-right">Base INSS/FGTS</th>
                  <th className="py-3 px-3 text-right">Encargos CLT</th>
                  <th className="py-3 px-3 text-right">Benefícios CCT</th>
                  <th className="py-3 px-4 text-right">Custo Total Empresa</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-3 px-4">Colaborador / Cargo</th>
                  <th className="py-3 px-3">Setor</th>
                  <th className="py-3 px-3 text-right">Salário Base</th>
                  <th className="py-3 px-3 text-right">Gratificação</th>
                  <th className="py-3 px-3 text-right">VT Diário</th>
                  <th className="py-3 px-3 text-right">VT Mensal (22d)</th>
                  <th className="py-3 px-3 text-right">VA Diário (CCT)</th>
                  <th className="py-3 px-3 text-right">VA Mensal (22d)</th>
                  <th className="py-3 px-4 text-right">Custo Direto</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costSummaries.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'clt_cct' ? 8 : 9} className="py-8 text-center text-slate-400">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              ) : (
                costSummaries.map(({ colaborador: c, detailed, pisoReferencia, abaixoPiso, vtDia, vtMes, vaMes, custoOperacionalDireto }) => {
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{c.nomeCompleto}</span>
                          {abaixoPiso && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[9px] font-bold" title={`Abaixo do piso CCT de ${formatMoney(pisoReferencia)}`}>
                              Abaixo Piso CCT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>{c.codigoMatricula}</span>
                          <span>•</span>
                          <span>{c.funcaoCargo}</span>
                          {pisoReferencia > 0 && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Piso CCT: {formatMoney(pisoReferencia)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-700">{c.setor}</td>

                      {viewMode === 'clt_cct' ? (
                        <>
                          <td className="py-3 px-3 text-right font-medium text-slate-900">
                            {formatMoney(detailed.salarioBase)}
                          </td>

                          <td className="py-3 px-3 text-right text-amber-800 font-medium">
                            {detailed.adicionaisTotal > 0 ? (
                              <span title="Periculosidade, Insalubridade, Acúmulo ou Penosidade">
                                + {formatMoney(detailed.adicionaisTotal)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-semibold text-slate-900">
                            {formatMoney(detailed.baseInssFgts)}
                          </td>

                          <td className="py-3 px-3 text-right text-indigo-900 font-medium">
                            <span title="FGTS (8%) + Provisão 13º (8,33%) + Férias+1/3 (11,11%)">
                              {formatMoney(detailed.encargosCltTotal)}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right text-emerald-800 font-medium">
                            <span title={`VT: ${formatMoney(detailed.valeTransporteCustoEmpresa)} | VA: ${formatMoney(detailed.valeAlimentacaoTotal)} | Saúde CCT: ${formatMoney(detailed.subsidioPlanoSaude)} | Cuidado: ${formatMoney(detailed.auxilioCuidadoPessoal)}`}>
                              {formatMoney(detailed.beneficiosCctTotal)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-black text-slate-900 bg-amber-50/40">
                            {formatMoney(detailed.custoTotalMensal)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3 text-right font-medium text-slate-900">
                            {formatMoney(c.remuneracao)}
                          </td>

                          <td className="py-3 px-3 text-right text-slate-600">
                            {c.gratificacao > 0 ? formatMoney(c.gratificacao) : '-'}
                          </td>

                          <td className="py-3 px-3 text-right text-slate-600">
                            {c.vtQuantidadeTarifasDia > 0 ? (
                              <span>
                                {c.vtQuantidadeTarifasDia}x ({formatMoney(c.vtValorTarifa)}) ={' '}
                                <strong>{formatMoney(vtDia)}</strong>
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-semibold text-blue-900">
                            {vtMes > 0 ? formatMoney(vtMes) : '-'}
                          </td>

                          <td className="py-3 px-3 text-right text-slate-600">
                            {formatMoney(c.valorValeAlimentacaoDia || VALOR_VA_CCT_DIA)}/d
                          </td>

                          <td className="py-3 px-3 text-right font-semibold text-amber-900">
                            {formatMoney(vaMes)}
                          </td>

                          <td className="py-3 px-4 text-right font-black text-slate-900 bg-amber-50/30">
                            {formatMoney(custoOperacionalDireto)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {costSummaries.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                {viewMode === 'clt_cct' ? (
                  <tr>
                    <td colSpan={2} className="py-3 px-4 uppercase text-[11px]">
                      Total Geral Consolidado ({filtered.length} Colaboradores)
                    </td>
                    <td className="py-3 px-3 text-right">{formatMoney(totalSalarios)}</td>
                    <td className="py-3 px-3 text-right text-amber-800">{formatMoney(totalAdicionaisCct)}</td>
                    <td className="py-3 px-3 text-right">{formatMoney(totalSalarios + totalAdicionaisCct + totalGratificacoes)}</td>
                    <td className="py-3 px-3 text-right text-indigo-900">{formatMoney(totalEncargosClt)}</td>
                    <td className="py-3 px-3 text-right text-emerald-800">{formatMoney(totalBeneficiosCct)}</td>
                    <td className="py-3 px-4 text-right text-amber-950 font-black text-sm bg-amber-100">
                      {formatMoney(totalGeralCltCct)}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={2} className="py-3 px-4 uppercase text-[11px]">
                      Total Consolidado ({filtered.length} Colaboradores)
                    </td>
                    <td className="py-3 px-3 text-right">{formatMoney(totalSalarios)}</td>
                    <td className="py-3 px-3 text-right">{formatMoney(totalGratificacoes)}</td>
                    <td className="py-3 px-3 text-right">-</td>
                    <td className="py-3 px-3 text-right text-blue-900">{formatMoney(totalVt)}</td>
                    <td className="py-3 px-3 text-right">-</td>
                    <td className="py-3 px-3 text-right text-amber-900">{formatMoney(totalVa)}</td>
                    <td className="py-3 px-4 text-right text-amber-950 font-black text-sm bg-amber-100">
                      {formatMoney(totalGeralOperacional)}
                    </td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

