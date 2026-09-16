import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Building2,
  Plane,
  Truck,
  Users,
  FolderKanban,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  Search,
  Plus,
  UserCheck,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Thermometer,
  FileText,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  Percent,
  Wallet,
  Award,
} from 'lucide-react';
import {
  Cliente,
  Colaborador,
  EmbarqueAereo,
  ViagemRodoviaria,
  ProjetoGerencial,
  AtividadeGestao,
  CustoOperacional,
  ProgramacaoFerias,
  Ocorrencia,
  PreAdmissao,
  AlertaItem,
  UserRole,
  GlobalModuleId,
} from '../../types';
import { NavSection } from '../Sidebar';
import {
  formatMoney,
  formatDate,
  calcVtMes,
  calcVaMes,
  calcCustoMensalTotal,
} from '../../utils/formatters';
import {
  calcFinancialsSetor,
  isClienteFarmaAereo,
  isClienteFarmaRodoviario,
  isColaboradorFarmaAereo,
  isColaboradorFarmaRodoviario,
} from '../../utils/sectorUtils';
import { StrategicGuidelinesBanner } from '../Common/StrategicGuidelinesBanner';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';
import { atividadeOcorreEm } from '../Agenda/agendaUtils';

interface GeneralDashboardProps {
  clientes: Cliente[];
  embarquesAereos: EmbarqueAereo[];
  viagensRodoviarias: ViagemRodoviaria[];
  colaboradores: Colaborador[];
  projetos: ProjetoGerencial[];
  atividadesGestao: AtividadeGestao[];
  custosOperacionais: CustoOperacional[];
  feriasList: ProgramacaoFerias[];
  ocorrencias: Ocorrencia[];
  preAdmissoes: PreAdmissao[];
  alertas: AlertaItem[];
  userRole: UserRole;
  /** Acesso GERAL ao módulo DP — ver temAcessoGeralDp em visibilidadeUtils.ts. Controla só o
   *  atalho de "Link Admissão Digital" abaixo, mesma restrição da tela de Ocorrências. */
  temAcessoGeralDp: boolean;
  onNavigateModule: (mod: GlobalModuleId) => void;
  onNavigateSection: (sec: NavSection) => void;
  onOpenNovoColaborador: () => void;
  onOpenNovaOcorrencia: () => void;
  onOpenAdmissionLink?: () => void;
  onOpenNovoCliente: () => void;
  onOpenNovoCustoOperacional?: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onResetDatabase: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectColaboradorDetail?: (c: Colaborador) => void;
  onSelectClienteDetail?: (c: Cliente) => void;
}

export const GeneralDashboard: React.FC<GeneralDashboardProps> = ({
  clientes = [],
  embarquesAereos = [],
  viagensRodoviarias = [],
  colaboradores = [],
  projetos = [],
  atividadesGestao = [],
  custosOperacionais = [],
  feriasList = [],
  ocorrencias = [],
  preAdmissoes = [],
  alertas = [],
  userRole,
  temAcessoGeralDp,
  onNavigateModule,
  onNavigateSection,
  onOpenNovoColaborador,
  onOpenNovaOcorrencia,
  onOpenAdmissionLink,
  onOpenNovoCliente,
  onOpenNovoCustoOperacional,
  onExportBackup,
  onImportBackup,
  onResetDatabase,
  searchQuery,
  onSearchChange,
  onSelectColaboradorDetail,
  onSelectClienteDetail,
}) => {
  // Local state for backup dropdown in action bar
  const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
  const [isLiveSearchFocused, setIsLiveSearchFocused] = useState(false);

  // 1. REVENUE CONSOLIDATION
  const revenueSummary = useMemo(() => {
    const clientesAtivos = clientes.filter((c) => c.status === 'Ativo');
    const totalFaturamentoMensal = clientes.reduce(
      (acc, c) => acc + (Number(c.faturamentoMensalEstimado) || 0),
      0
    );
    const totalFaturamentoAnualizado = totalFaturamentoMensal * 12;
    const ticketMedio = clientesAtivos.length > 0 ? totalFaturamentoMensal / clientesAtivos.length : 0;

    const clientesAereo = clientes.filter((c) => isClienteFarmaAereo(c));
    const faturamentoAereo = clientesAereo.reduce(
      (acc, c) => acc + (Number(c.faturamentoMensalEstimado) || 0),
      0
    );

    const clientesRodoviario = clientes.filter((c) => isClienteFarmaRodoviario(c));
    const faturamentoRodoviario = clientesRodoviario.reduce(
      (acc, c) => acc + (Number(c.faturamentoMensalEstimado) || 0),
      0
    );

    const clientesRdc430 = clientes.filter((c) => c.exigeRDC430 || c.exigeRegistroAnvisa);

    return {
      totalClientes: clientes.length,
      clientesAtivosCount: clientesAtivos.length,
      totalFaturamentoMensal,
      totalFaturamentoAnualizado,
      ticketMedio,
      clientesAereoCount: clientesAereo.length,
      faturamentoAereo,
      clientesRodoviarioCount: clientesRodoviario.length,
      faturamentoRodoviario,
      clientesRdc430Count: clientesRdc430.length,
    };
  }, [clientes]);

  // 2. PAYROLL & HR COSTS CONSOLIDATION
  const payrollSummary = useMemo(() => {
    const ativos = colaboradores.filter((c) => c.status === 'Ativo');
    const emFerias = colaboradores.filter((c) => c.status === 'Férias');
    const afastados = colaboradores.filter((c) => c.status === 'Afastado');

    const totalSalariosBase = ativos.reduce((acc, c) => acc + (Number(c.remuneracao) || 0), 0);
    const totalGratificacoes = ativos.reduce((acc, c) => acc + (Number(c.gratificacao) || 0), 0);
    const totalVt = ativos.reduce(
      (acc, c) => acc + calcVtMes(c.vtValorTarifa, c.vtQuantidadeTarifasDia),
      0
    );
    const totalVa = ativos.reduce(
      (acc, c) => acc + calcVaMes(c.valorValeAlimentacaoDia),
      0
    );

    // CLT charges (INSS patronal 20%, FGTS 8%, 13º prop 8.33%, Férias prop 11.11%, Seguro Acidente ~2%) ~ 45%
    const totalEncargosPatronais = totalSalariosBase * 0.45;
    const custoTotalFolhaMensal = totalSalariosBase + totalGratificacoes + totalVt + totalVa + totalEncargosPatronais;

    const preAdmissoesPendentes = preAdmissoes.filter((p) => p.status === 'Preenchido' || p.status === 'Aprovado').length;
    const ocorrenciasAbertas = ocorrencias.filter((o) => o.status === 'Aberta' || o.status === 'Em análise').length;

    return {
      colaboradoresTotal: colaboradores.length,
      colaboradoresAtivos: ativos.length,
      colaboradoresFerias: emFerias.length,
      colaboradoresAfastados: afastados.length,
      totalSalariosBase,
      totalBeneficios: totalVt + totalVa,
      totalEncargosPatronais,
      custoTotalFolhaMensal,
      preAdmissoesPendentes,
      ocorrenciasAbertas,
    };
  }, [colaboradores, preAdmissoes, ocorrencias]);

  // 3. OPERATIONAL COSTS CONSOLIDATION
  const opCostsSummary = useMemo(() => {
    const totalCustosOperacionais = custosOperacionais.reduce(
      (acc, c) => acc + (Number(c.valor) || 0),
      0
    );
    const custosAereo = custosOperacionais
      .filter((c) => c.setor === 'farma_aereo')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
    const custosRodoviario = custosOperacionais
      .filter((c) => c.setor === 'farma_rodoviario')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
    const custosGerais = custosOperacionais
      .filter((c) => c.setor === 'geral')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0);

    const pagos = custosOperacionais
      .filter((c) => c.status === 'Pago')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0);
    const aPagar = custosOperacionais
      .filter((c) => c.status === 'A Pagar' || c.status === 'Provisionado')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0);

    return {
      totalCustosOperacionais,
      custosAereo,
      custosRodoviario,
      custosGerais,
      pagos,
      aPagar,
      totalLancamentos: custosOperacionais.length,
    };
  }, [custosOperacionais]);

  // 4. OVERALL CONSOLIDATED DRE (FINANCIAL RESULT)
  const financialResult = useMemo(() => {
    const faturamentoBruto = revenueSummary.totalFaturamentoMensal;
    const impostosEstimados = faturamentoBruto * 0.06; // 6% Simples/Presumido
    const receitaLiquida = faturamentoBruto - impostosEstimados;
    const custoGlobalMensal = payrollSummary.custoTotalFolhaMensal + opCostsSummary.totalCustosOperacionais;
    const ebitda = receitaLiquida - custoGlobalMensal;
    const margemLiquidaPercent = faturamentoBruto > 0 ? (ebitda / faturamentoBruto) * 100 : 0;

    return {
      faturamentoBruto,
      impostosEstimados,
      receitaLiquida,
      custoGlobalMensal,
      ebitda,
      margemLiquidaPercent,
    };
  }, [revenueSummary, payrollSummary, opCostsSummary]);

  // 5. AIR & ROAD OPERATIONS REAL-TIME STATS
  const opsSummary = useMemo(() => {
    const aereoAtivos = embarquesAereos.filter(
      (e) => e.status !== 'Entregue no Destino' && e.status !== 'Cancelado'
    );
    const aereoTermolabeis = embarquesAereos.filter(
      (e) =>
        e.faixaTemperatura.includes('2°C') ||
        e.faixaTemperatura.includes('Gelo Seco') ||
        e.faixaTemperatura.includes('-20°C')
    );

    const rodoAtivos = viagensRodoviarias.filter(
      (v) =>
        v.status.includes('Em Rota') ||
        v.status.includes('Em Trânsito') ||
        v.status.includes('Carregamento') ||
        v.status.includes('Entregas')
    );

    return {
      embarquesAereosTotal: embarquesAereos.length,
      embarquesAereosAtivos: aereoAtivos.length,
      embarquesTermolabeisCount: aereoTermolabeis.length,
      viagensRodoviariasTotal: viagensRodoviarias.length,
      viagensRodoviariasAtivas: rodoAtivos.length,
      totalOperacoesAtivas: aereoAtivos.length + rodoAtivos.length,
    };
  }, [embarquesAereos, viagensRodoviarias]);

  // 6. PROJECTS & MANAGEMENT GOVERNANCE
  const govSummary = useMemo(() => {
    const projetosAtivos = projetos.filter((p) => p.status !== 'Concluído' && p.status !== 'Cancelado');
    const mediaProgressoOkrs =
      projetos.length > 0
        ? Math.round(projetos.reduce((acc, p) => acc + (p.progressoPercentual || 0), 0) / projetos.length)
        : 0;
    const orcamentoTotalProjetos = projetos.reduce((acc, p) => acc + (p.orcamentoPrevisto || 0), 0);

    const hojeStr = new Date().toISOString().split('T')[0];
    const atividadesHoje = atividadesGestao.filter((a) => atividadeOcorreEm(a, hojeStr) && a.status !== 'Concluída');
    const atividadesPendentes = atividadesGestao.filter((a) => a.status === 'Pendente' || a.status === 'Em Andamento');

    return {
      projetosTotal: projetos.length,
      projetosAtivosCount: projetosAtivos.length,
      mediaProgressoOkrs,
      orcamentoTotalProjetos,
      atividadesHojeCount: atividadesHoje.length,
      atividadesPendentesCount: atividadesPendentes.length,
    };
  }, [projetos, atividadesGestao]);

  // 7. MULTI-MODULE LIVE SEARCH RESULTS (When user types in search query)
  const searchResults = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return null;

    const matchedColaboradores = colaboradores.filter(
      (c) =>
        c.nomeCompleto.toLowerCase().includes(q) ||
        (c.cpf && c.cpf.includes(q)) ||
        (c.funcaoCargo && c.funcaoCargo.toLowerCase().includes(q)) ||
        (c.setor && c.setor.toLowerCase().includes(q)) ||
        (c.codigoMatricula && c.codigoMatricula.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedClientes = clientes.filter(
      (c) =>
        c.nomeFantasia.toLowerCase().includes(q) ||
        c.razaoSocial.toLowerCase().includes(q) ||
        (c.cnpj && c.cnpj.includes(q)) ||
        (c.cidadeUF && c.cidadeUF.toLowerCase().includes(q)) ||
        (c.codigoCliente && c.codigoCliente.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedAereo = embarquesAereos.filter(
      (e) =>
        (e.codigoAWB && e.codigoAWB.toLowerCase().includes(q)) ||
        (e.numeroVoo && e.numeroVoo.toLowerCase().includes(q)) ||
        (e.clienteNome && e.clienteNome.toLowerCase().includes(q)) ||
        (e.destinatarioNome && e.destinatarioNome.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedRodo = viagensRodoviarias.filter(
      (v) =>
        (v.veiculoPlaca && v.veiculoPlaca.toLowerCase().includes(q)) ||
        (v.motoristaNome && v.motoristaNome.toLowerCase().includes(q)) ||
        (v.numeroMdfe && v.numeroMdfe.toLowerCase().includes(q)) ||
        (v.rotaDestino && v.rotaDestino.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedProjetos = projetos.filter(
      (p) =>
        p.titulo.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        p.liderNome.toLowerCase().includes(q)
    ).slice(0, 5);

    const totalMatches =
      matchedColaboradores.length +
      matchedClientes.length +
      matchedAereo.length +
      matchedRodo.length +
      matchedProjetos.length;

    return {
      query: q,
      totalMatches,
      colaboradores: matchedColaboradores,
      clientes: matchedClientes,
      aereo: matchedAereo,
      rodo: matchedRodo,
      projetos: matchedProjetos,
    };
  }, [searchQuery, colaboradores, clientes, embarquesAereos, viagensRodoviarias, projetos]);

  // Export Executive Summary to CSV
  const handleExportExecutiveSummary = () => {
    const rows = [
      ['JOBSON DE MORAES TRANSPORTES | Seguranca, Rastreabilidade e Pontualidade na Logistica da Saude'],
      ['RELATORIO EXECUTIVO CONSOLIDADO - JMT GESTAO INTEGRADA'],
      ['Proposito: Levar saude com seguranca, do remetente ao destino final.'],
      ['Missao: Entregar solucoes de logistica para produtos de saude com seguranca, conformidade, rastreabilidade e pontualidade.'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      [''],
      ['INDICADOR FINANCEIRO GERAL', 'VALOR'],
      ['Faturamento Mensal Consolidado', formatMoney(financialResult.faturamentoBruto)],
      ['Faturamento Anualizado Projetado', formatMoney(revenueSummary.totalFaturamentoAnualizado)],
      ['Impostos Estimados (~6%)', formatMoney(financialResult.impostosEstimados)],
      ['Receita Líquida', formatMoney(financialResult.receitaLiquida)],
      ['Folha CLT + Encargos Patronais (DP)', formatMoney(payrollSummary.custoTotalFolhaMensal)],
      ['Custos Operacionais Diretos', formatMoney(opCostsSummary.totalCustosOperacionais)],
      ['Custo Total da Operacao (Folha + OPEX)', formatMoney(financialResult.custoGlobalMensal)],
      ['EBITDA / Margem de Contribuicao (R$)', formatMoney(financialResult.ebitda)],
      ['Margem Liquida (%)', `${financialResult.margemLiquidaPercent.toFixed(1)}%`],
      [''],
      ['MODULO 1: CLIENTES & CONTRATOS', 'VALOR'],
      ['Total de Clientes Cadastrados', revenueSummary.totalClientes],
      ['Clientes Ativos em Operacao', revenueSummary.clientesAtivosCount],
      ['Ticket Medio Mensal', formatMoney(revenueSummary.ticketMedio)],
      ['Contratos com Exigencia RDC 430', revenueSummary.clientesRdc430Count],
      [''],
      ['MODULO 2: FARMA AEREO', 'VALOR'],
      ['Embarques Ativos em Voo/TECA', opsSummary.embarquesAereosAtivos],
      ['Faturamento Farma Aereo', formatMoney(revenueSummary.faturamentoAereo)],
      ['Custos Operacionais Farma Aereo', formatMoney(opCostsSummary.custosAereo)],
      [''],
      ['MODULO 3: FARMA RODOVIARIO', 'VALOR'],
      ['Viagens Rodoviarias Ativas', opsSummary.viagensRodoviariasAtivas],
      ['Faturamento Farma Rodoviario', formatMoney(revenueSummary.faturamentoRodoviario)],
      ['Custos Operacionais Rodoviarios', formatMoney(opCostsSummary.custosRodoviario)],
      [''],
      ['MODULO 4: DEPARTAMENTO PESSOAL & RH', 'VALOR'],
      ['Colaboradores Ativos CLT', payrollSummary.colaboradoresAtivos],
      ['Salarios Base Total', formatMoney(payrollSummary.totalSalariosBase)],
      ['Beneficios (VA & VT)', formatMoney(payrollSummary.totalBeneficios)],
      ['Pre-Admissoes Pendentes', payrollSummary.preAdmissoesPendentes],
      ['Ocorrencias de Campo Abertas', payrollSummary.ocorrenciasAbertas],
      [''],
      ['MODULO 5: PROJETOS GERENCIAIS & GOVERNANCA', 'VALOR'],
      ['Projetos Estrategicos Ativos', govSummary.projetosAtivosCount],
      ['Progresso Medio dos OKRs', `${govSummary.mediaProgressoOkrs}%`],
      ['Orcamento Total CAPEX/OPEX', formatMoney(govSummary.orcamentoTotalProjetos)],
      ['Atividades da Gestao Hoje', govSummary.atividadesHojeCount],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JMT_Dashboard_Geral_Consolidado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP HERO: DASHBOARD GERAL & ACTION / SEARCH BAR                        */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-sm">
        {/* Acento dourado discreto — mantém a identidade sem escurecer o fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#B38F4F]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#B38F4F]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header titles & Seal */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-[#8A6A39] border border-amber-200 text-xs font-bold tracking-wide">
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#B38F4F]" />
                  Torre de Controle Executiva • Painel Geral
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  RDC 430/2020 ANVISA
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
                Dashboard Geral — Jobson de Moraes Transportes
              </h1>
              <p className="text-sm text-slate-500 max-w-3xl font-normal leading-relaxed mt-1">
                {STRATEGIC_GUIDELINES.sloganCurto}
              </p>
            </div>

            {/* Quick Export & Agenda pill */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                id="btn-agenda-atalho"
                onClick={() => onNavigateSection('agenda_gestao')}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-xs"
              >
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <span>Agenda da Gestão</span>
                {govSummary.atividadesHojeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold">
                    {govSummary.atividadesHojeCount} hoje
                  </span>
                )}
              </button>

              <button
                id="btn-export-executivo"
                onClick={handleExportExecutiveSummary}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#B38F4F] hover:bg-[#8A6A39] text-white text-xs font-bold transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Relatório Geral (CSV)</span>
              </button>
            </div>
          </div>

          {/* INTEGRATED GLOBAL SEARCH BAR & ACESSO RÁPIDO */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-stretch">
              {/* Prominent Global Search Input */}
              <div className="relative flex-1 max-w-2xl">
                <div className="relative flex items-center bg-slate-50 hover:bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#B38F4F]/30 rounded-xl px-3.5 py-2.5 border border-slate-200 transition-colors">
                  <Search className="w-4 h-4 text-[#8A6A39] mr-2.5 shrink-0" />
                  <input
                    id="dashboard-integrated-search-input"
                    type="text"
                    placeholder="Pesquisar em todos os módulos: colaborador, cliente, AWB, placa de veículo, projeto..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => setIsLiveSearchFocused(true)}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => onSearchChange('')}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <kbd className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-400 shrink-0 ml-1">
                      ⌘K
                    </kbd>
                  )}
                </div>

                {/* Instant Search Results Dropdown Overlay */}
                {isLiveSearchFocused && searchResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    <div className="p-3 bg-slate-50 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Resultados da Busca Geral ({searchResults.totalMatches} encontrados)
                      </span>
                      <button
                        onClick={() => setIsLiveSearchFocused(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        Fechar
                      </button>
                    </div>

                    {searchResults.totalMatches === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        Nenhum registro correspondente a &quot;{searchQuery}&quot; nos módulos da JMT.
                      </div>
                    ) : (
                      <div className="p-2 space-y-3">
                        {/* Colaboradores matches */}
                        {searchResults.colaboradores.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 px-2 py-1 flex items-center gap-1.5">
                              <Users className="w-3 h-3" />
                              Colaboradores ({searchResults.colaboradores.length})
                            </div>
                            {searchResults.colaboradores.map((colab) => (
                              <div
                                key={colab.id}
                                onClick={() => {
                                  onNavigateModule('dp');
                                  onNavigateSection('colaboradores');
                                  if (onSelectColaboradorDetail) onSelectColaboradorDetail(colab);
                                  setIsLiveSearchFocused(false);
                                }}
                                className="px-2.5 py-1.5 hover:bg-amber-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">{colab.nomeCompleto}</span>
                                  <span className="text-slate-500 ml-2 text-[11px]">{colab.funcaoCargo} • {colab.setor}</span>
                                </div>
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                  {colab.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Clientes matches */}
                        {searchResults.clientes.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 px-2 py-1 flex items-center gap-1.5">
                              <Building2 className="w-3 h-3" />
                              Clientes & Contratos ({searchResults.clientes.length})
                            </div>
                            {searchResults.clientes.map((cli) => (
                              <div
                                key={cli.id}
                                onClick={() => {
                                  onNavigateModule('clientes');
                                  onNavigateSection('clientes');
                                  if (onSelectClienteDetail) onSelectClienteDetail(cli);
                                  setIsLiveSearchFocused(false);
                                }}
                                className="px-2.5 py-1.5 hover:bg-blue-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">{cli.nomeFantasia}</span>
                                  <span className="text-slate-500 ml-2 text-[11px]">{cli.cidadeUF} • {formatMoney(cli.faturamentoMensalEstimado)}/mês</span>
                                </div>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                  {cli.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Farma Aéreo matches */}
                        {searchResults.aereo.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 px-2 py-1 flex items-center gap-1.5">
                              <Plane className="w-3 h-3" />
                              Farma Aéreo ({searchResults.aereo.length})
                            </div>
                            {searchResults.aereo.map((emb) => (
                              <div
                                key={emb.id}
                                onClick={() => {
                                  onNavigateModule('farma_aereo');
                                  onNavigateSection('farma_aereo');
                                  setIsLiveSearchFocused(false);
                                }}
                                className="px-2.5 py-1.5 hover:bg-sky-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">AWB {emb.codigoAWB}</span>
                                  <span className="text-slate-500 ml-2 text-[11px]">{emb.clienteNome} • {emb.faixaTemperatura}</span>
                                </div>
                                <span className="text-[10px] font-bold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded">
                                  {emb.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Farma Rodoviário matches */}
                        {searchResults.rodo.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 px-2 py-1 flex items-center gap-1.5">
                              <Truck className="w-3 h-3" />
                              Farma Rodoviário ({searchResults.rodo.length})
                            </div>
                            {searchResults.rodo.map((viagem) => (
                              <div
                                key={viagem.id}
                                onClick={() => {
                                  onNavigateModule('farma_rodoviario');
                                  onNavigateSection('farma_rodoviario');
                                  setIsLiveSearchFocused(false);
                                }}
                                className="px-2.5 py-1.5 hover:bg-emerald-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">Placa {viagem.veiculoPlaca}</span>
                                  <span className="text-slate-500 ml-2 text-[11px]">Motorista: {viagem.motoristaNome} • {viagem.rotaDestino}</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  {viagem.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Projetos matches */}
                        {searchResults.projetos.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 px-2 py-1 flex items-center gap-1.5">
                              <FolderKanban className="w-3 h-3" />
                              Projetos Gerenciais ({searchResults.projetos.length})
                            </div>
                            {searchResults.projetos.map((proj) => (
                              <div
                                key={proj.id}
                                onClick={() => {
                                  onNavigateModule('projetos');
                                  onNavigateSection('projetos');
                                  setIsLiveSearchFocused(false);
                                }}
                                className="px-2.5 py-1.5 hover:bg-purple-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-900">{proj.titulo}</span>
                                  <span className="text-slate-500 ml-2 text-[11px]">{proj.codigo} • Líder: {proj.liderNome}</span>
                                </div>
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                                  {proj.progressoPercentual}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* ACESSO RÁPIDO — atalhos diretos pras ações do dia a dia, fora da lista de
                módulos da barra lateral (cadastro de colaborador, admissão, ocorrência,
                cliente, custo, backup da base). */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Acesso Rápido
              </span>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {/* 1. Novo Colaborador */}
                {userRole === 'admin' && (
                  <button
                    id="dash-action-novo-colaborador"
                    onClick={onOpenNovoColaborador}
                    title="Cadastrar novo colaborador na folha"
                    className="group flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-[#B38F4F] text-white flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      <Plus className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                      Novo Colaborador
                    </span>
                  </button>
                )}

                {/* 2. Link Admissão Digital */}
                {userRole !== 'colaborador' && temAcessoGeralDp && onOpenAdmissionLink && (
                  <button
                    id="dash-action-link-admissao"
                    onClick={onOpenAdmissionLink}
                    title="Gerar link de pré-admissão digital para novo colaborador"
                    className="group flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <UserCheck className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                      Link Admissão
                    </span>
                  </button>
                )}

                {/* 3. Nova Ocorrência */}
                {userRole !== 'colaborador' && (
                  <button
                    id="dash-action-nova-ocorrencia"
                    onClick={onOpenNovaOcorrencia}
                    title="Registrar ocorrência disciplinar ou de campo"
                    className="group flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                      Nova Ocorrência
                    </span>
                  </button>
                )}

                {/* 4. Novo Cliente / Contrato */}
                {userRole !== 'colaborador' && (
                  <button
                    id="dash-action-novo-cliente"
                    onClick={onOpenNovoCliente}
                    title="Cadastrar novo parceiro ou cliente contratante"
                    className="group flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                      Novo Cliente
                    </span>
                  </button>
                )}

                {/* 5. Lançar Custo Operacional */}
                {userRole === 'admin' && onOpenNovoCustoOperacional && (
                  <button
                    id="dash-action-novo-custo"
                    onClick={onOpenNovoCustoOperacional}
                    title="Lançar custo operacional (combustível, fretes, insumos, manutenção)"
                    className="group flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <DollarSign className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
                      Lançar Custo
                    </span>
                  </button>
                )}

                {/* 6. Database / Backup Menu Dropdown */}
                <div className="relative">
                  <button
                    id="dash-action-backup-menu"
                    type="button"
                    onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
                    title="Opções de Backup e Restauração"
                    className="group w-full flex flex-col items-center gap-2 py-3.5 px-1.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Download className="w-5 h-5" />
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 text-center leading-tight">
                      Backup
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </span>
                  </button>

                  {isDbMenuOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 top-full mt-2 w-60 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-slate-100 font-bold text-slate-800">
                        Gerenciamento da Base (JMT)
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDbMenuOpen(false);
                          onExportBackup();
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                      >
                        <Download className="w-4 h-4 text-[#B38F4F]" />
                        <span>Exportar Backup (JSON)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDbMenuOpen(false);
                          onImportBackup();
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                      >
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>Importar Backup (JSON)</span>
                      </button>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDbMenuOpen(false);
                          onResetDatabase();
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-500" />
                        <span>Restaurar Base Padrão</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Guidelines Banner: Institutional Mission, Vision and Values */}
      <StrategicGuidelinesBanner variant="light" />

      {/* ========================================================================= */}
      {/* 2. GRANDES NÚMEROS: CONSOLIDAÇÃO FINANCEIRA & OPERACIONAL (KPI CARDS)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* KPI 1: Faturamento Mensal Consolidado */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Receita Mensal (Carteira)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              {formatMoney(financialResult.faturamentoBruto)}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {revenueSummary.clientesAtivosCount} clientes ativos · ticket médio {formatMoney(revenueSummary.ticketMedio)}
            </p>
          </div>
          {/* Indicador único do cartão: divisão da receita entre Aéreo e Rodoviário */}
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-blue-500"
              style={{
                width: `${revenueSummary.clientesAtivosCount > 0 ? (revenueSummary.clientesAereoCount / revenueSummary.clientesAtivosCount) * 100 : 50}%`,
              }}
            />
            <div
              className="h-full bg-sky-200"
              style={{
                width: `${revenueSummary.clientesAtivosCount > 0 ? (revenueSummary.clientesRodoviarioCount / revenueSummary.clientesAtivosCount) * 100 : 50}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {revenueSummary.clientesAereoCount} Aéreo · {revenueSummary.clientesRodoviarioCount} Rodoviário · projeção anual {formatMoney(revenueSummary.totalFaturamentoAnualizado)}
          </p>
        </div>

        {/* KPI 2: Custo Global Consolidado (Folha + OPEX) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Custo Total da Operação
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              {formatMoney(financialResult.custoGlobalMensal)}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Folha {formatMoney(payrollSummary.custoTotalFolhaMensal)} · OPEX {formatMoney(opCostsSummary.totalCustosOperacionais)}
            </p>
          </div>
          {/* Indicador único do cartão: composição Folha x OPEX */}
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-rose-500"
              style={{
                width: `${financialResult.custoGlobalMensal > 0 ? (payrollSummary.custoTotalFolhaMensal / financialResult.custoGlobalMensal) * 100 : 50}%`,
              }}
            />
            <div
              className="h-full bg-rose-200"
              style={{
                width: `${financialResult.custoGlobalMensal > 0 ? (opCostsSummary.totalCustosOperacionais / financialResult.custoGlobalMensal) * 100 : 50}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {financialResult.custoGlobalMensal > 0
              ? `${Math.round((payrollSummary.custoTotalFolhaMensal / financialResult.custoGlobalMensal) * 100)}% folha · ${Math.round((opCostsSummary.totalCustosOperacionais / financialResult.custoGlobalMensal) * 100)}% opex`
              : 'Sem dados de custo no período'}
          </p>
        </div>

        {/* KPI 3: EBITDA / Margem de Contribuição Consolidada */}
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              EBITDA / Margem Operacional
            </span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${financialResult.ebitda >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`font-display text-3xl font-bold tracking-tight ${financialResult.ebitda >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatMoney(financialResult.ebitda)}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {financialResult.margemLiquidaPercent.toFixed(1)}% de margem · rentabilidade {financialResult.margemLiquidaPercent >= 20 ? 'excelente' : financialResult.margemLiquidaPercent >= 10 ? 'saudável' : 'em atenção'}
            </p>
          </div>
          {/* Indicador único do cartão: margem líquida */}
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${financialResult.ebitda >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, Math.max(4, Math.abs(financialResult.margemLiquidaPercent)))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Receita líquida (após impostos): {formatMoney(financialResult.receitaLiquida)}
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. VISÃO 360° MÓDULO A MÓDULO (OS 5 PILARES DA JMT)                       */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Desempenho por Área Operacional
            </h2>
            <p className="text-xs text-slate-500">
              Acesso rápido aos principais indicadores e ferramentas de cada área do sistema.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CARD GESTÃO DE CLIENTES */}
          <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Carteira & Contratos</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Gestão de Clientes & CRM
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {revenueSummary.clientesAtivosCount} ativos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3.5 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Faturamento Total</span>
                  <span className="text-xs font-bold text-slate-900">{formatMoney(revenueSummary.totalFaturamentoMensal)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Conformidade RDC 430</span>
                  <span className="text-xs font-bold text-emerald-700">{revenueSummary.clientesRdc430Count} contratos</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Farma Aéreo Atrelados:</span>
                  <span className="font-semibold text-slate-800">{revenueSummary.clientesAereoCount} clientes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Farma Rodoviário Atrelados:</span>
                  <span className="font-semibold text-slate-800">{revenueSummary.clientesRodoviarioCount} clientes</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                id="btn-acessar-clientes"
                onClick={() => {
                  onNavigateModule('clientes');
                  onNavigateSection('clientes');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
              >
                <span>Acessar Clientes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {userRole !== 'colaborador' && (
                <button
                  id="btn-quick-add-cliente"
                  onClick={onOpenNovoCliente}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Novo Cliente"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* CARD FARMA AÉREO */}
          <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Cadeia Fria & Voos</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                      Farma Aéreo (AWB & TECA)
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {opsSummary.embarquesAereosAtivos} em voo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3.5 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Faturamento Aéreo</span>
                  <span className="text-xs font-bold text-slate-900">{formatMoney(revenueSummary.faturamentoAereo)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Custos Operacionais</span>
                  <span className="text-xs font-bold text-slate-900">{formatMoney(opCostsSummary.custosAereo)}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cargas Termolábeis:</span>
                  <span className="font-semibold text-sky-700">{opsSummary.embarquesTermolabeisCount} embarques</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cias Aéreas Integradas:</span>
                  <span className="font-semibold text-slate-800">LATAM, Azul, Gollog</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                id="btn-acessar-farma-aereo"
                onClick={() => {
                  onNavigateModule('farma_aereo');
                  onNavigateSection('farma_aereo');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors"
              >
                <span>Acessar Farma Aéreo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD FARMA RODOVIÁRIO */}
          <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Frota & Telemetria</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Farma Rodoviário (Frota & MDF-e)
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {opsSummary.viagensRodoviariasAtivas} em trânsito
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3.5 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Faturamento Rodoviário</span>
                  <span className="text-xs font-bold text-slate-900">{formatMoney(revenueSummary.faturamentoRodoviario)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Custos de Frota & Diesel</span>
                  <span className="text-xs font-bold text-slate-900">{formatMoney(opCostsSummary.custosRodoviario)}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Telemetria de Baú (RDC 430):</span>
                  <span className="font-semibold text-emerald-700">100% Calibrado</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total de Viagens Registradas:</span>
                  <span className="font-semibold text-slate-800">{opsSummary.viagensRodoviariasTotal} viagens</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                id="btn-acessar-farma-rodoviario"
                onClick={() => {
                  onNavigateModule('farma_rodoviario');
                  onNavigateSection('farma_rodoviario');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
              >
                <span>Acessar Farma Rodoviário</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD DEPARTAMENTO PESSOAL & RH */}
          <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">RH & Departamento Pessoal</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      Departamento Pessoal & ASO
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {payrollSummary.colaboradoresAtivos} ativos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3.5 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Custo Total Folha CLT</span>
                  <span className="text-xs font-bold text-slate-900">{formatMoney(payrollSummary.custoTotalFolhaMensal)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Benefícios (VA & VT)</span>
                  <span className="text-xs font-bold text-slate-900">{formatMoney(payrollSummary.totalBeneficios)}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pré-Admissões Digitais:</span>
                  <span className={`font-semibold ${payrollSummary.preAdmissoesPendentes > 0 ? 'text-amber-600 font-bold' : 'text-slate-800'}`}>
                    {payrollSummary.preAdmissoesPendentes} pendentes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ocorrências Abertas:</span>
                  <span className={`font-semibold ${payrollSummary.ocorrenciasAbertas > 0 ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                    {payrollSummary.ocorrenciasAbertas} em análise
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                id="btn-acessar-dp"
                onClick={() => {
                  onNavigateModule('dp');
                  onNavigateSection('dashboard');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors"
              >
                <span>Acessar Painel DP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {userRole === 'admin' && (
                <button
                  id="btn-quick-add-colab"
                  onClick={onOpenNovoColaborador}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Novo Colaborador"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* CARD PROJETOS GERENCIAIS & OKRs */}
          <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Estratégia & OKRs</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      Projetos Gerenciais & OKRs
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {govSummary.projetosAtivosCount} projetos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3.5 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Progresso Médio OKRs</span>
                  <span className="text-xs font-bold text-purple-700">{govSummary.mediaProgressoOkrs}% concluído</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Orçamento CAPEX/OPEX</span>
                  <span className="text-xs font-bold text-slate-900">{formatMoney(govSummary.orcamentoTotalProjetos)}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reuniões / Prazos Hoje:</span>
                  <span className={`font-semibold ${govSummary.atividadesHojeCount > 0 ? 'text-indigo-600 font-bold' : 'text-slate-800'}`}>
                    {govSummary.atividadesHojeCount} atividades
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Atividades Pendentes:</span>
                  <span className="font-semibold text-slate-800">{govSummary.atividadesPendentesCount} em aberto</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                id="btn-acessar-projetos"
                onClick={() => {
                  onNavigateModule('projetos');
                  onNavigateSection('projetos');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors"
              >
                <span>Acessar Projetos & OKRs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD CENTRAL DE ALERTAS REGULATÓRIOS (RDC 430 & CLT) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Governança</span>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                      Alertas Regulatórios & Prazos
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {alertas.length} alertas
                </span>
              </div>

              <div className="bg-rose-50/60 border border-rose-100 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-800 font-medium">Alertas Críticos / Imediatos:</span>
                  <span className="font-extrabold text-rose-700">
                    {alertas.filter((a) => a.nivel === 'urgente').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-800 font-medium">Alertas de Atenção (30 dias):</span>
                  <span className="font-extrabold text-amber-700">
                    {alertas.filter((a) => a.nivel === 'alerta').length}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 line-clamp-2">
                Monitoramento contínuo de ASOs periódicos, limite de 11 meses de férias CLT e conformidade RDC 430/2020.
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                id="btn-ver-relatorio-saude"
                onClick={() => {
                  onNavigateModule('dp');
                  onNavigateSection('saude');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
              >
                <span>Ver Relatório de Conformidade</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CONSOLIDATED AGENDA & PRIORITY ALERTS PREVIEW                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Próximas Atividades da Gestão */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Agenda da Gestão Executiva
              </h3>
            </div>
            <button
              onClick={() => onNavigateSection('agenda_gestao')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Ver agenda completa</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {atividadesGestao.slice(0, 4).map((ativ) => (
              <div key={ativ.id} className="py-3 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{ativ.titulo}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                      {ativ.tipo}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>Data: {formatDate(ativ.data)} às {ativ.horarioInicio}</span>
                    <span>•</span>
                    <span>Resp: {ativ.responsavel}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  ativ.status === 'Concluída'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ativ.status === 'Em Andamento'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {ativ.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Top Alertas Críticos de Conformidade */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#B38F4F]" />
              <h3 className="font-bold text-slate-900 text-sm">
                Radar de Conformidade RDC 430 & Prazos
              </h3>
            </div>
            <button
              onClick={() => {
                onNavigateModule('dp');
                onNavigateSection('saude');
              }}
              className="text-xs font-semibold text-[#8A6A39] hover:text-[#B38F4F] flex items-center gap-1"
            >
              <span>Ver todos os alertas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {alertas.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                Nenhuma pendência crítica. Todos os ASOs, férias e laudos estão rigorosamente em dia!
              </div>
            ) : (
              alertas.slice(0, 4).map((alerta) => (
                <div key={alerta.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${alerta.nivel === 'urgente' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {alerta.titulo}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {alerta.colaboradorNome} • {alerta.descricao}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                    alerta.nivel === 'urgente' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {alerta.diasRestantes !== undefined
                      ? alerta.diasRestantes < 0
                        ? 'Vencido'
                        : `${alerta.diasRestantes}d`
                      : '!'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
