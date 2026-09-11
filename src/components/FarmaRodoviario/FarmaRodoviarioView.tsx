import React, { useState, useMemo } from 'react';
import {
  Truck,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Download,
  Plus,
  Layers,
  PieChart,
  FileSpreadsheet,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  ViagemRodoviaria,
  Cliente,
  Colaborador,
  UserRole,
  CustoOperacional,
  StatusCustoOperacional,
  LancamentoFaturamentoAereo,
  FaturaAereo,
} from '../../types';
import { SectorClientsTab } from '../Common/SectorClientsTab';
import { SectorEmployeesTab } from '../Common/SectorEmployeesTab';
import { SectorLinkModal } from '../Common/SectorLinkModal';
import { SectorManagerialDashboard } from '../Common/SectorManagerialDashboard';
import { SectorRevenueTab } from '../Common/SectorRevenueTab';
import { SectorCostsTab } from '../Common/SectorCostsTab';
import { CustoOperacionalFormModal } from '../Cost/CustoOperacionalFormModal';
import { FaturamentoAereoView } from '../FarmaAereo/FaturamentoAereoView';
import { ehModalRodoviario } from '../FarmaAereo/faturamentoAereoUtils';
import {
  calcFinancialsSetor,
  computeFaturamentoRealAereo,
  isClienteFarmaRodoviario,
  isColaboradorFarmaRodoviario,
  vincularClienteAoSetor,
  vincularColaboradorAoSetor,
} from '../../utils/sectorUtils';
import { formatCurrency } from '../../utils/formatters';

interface FarmaRodoviarioViewProps {
  viagens?: ViagemRodoviaria[];
  onSaveViagem?: (viagem: ViagemRodoviaria) => void;
  onDeleteViagem?: (id: string) => void;
  clientes: Cliente[];
  colaboradores?: Colaborador[];
  custosOperacionais?: CustoOperacional[];
  onSaveCliente?: (cliente: Cliente) => void;
  onSaveColaborador?: (colaborador: Colaborador) => void;
  onSaveCusto?: (custo: CustoOperacional) => void;
  onDeleteCusto?: (id: string) => void;
  onOpenNovoCliente?: () => void;
  onOpenNovoColaborador?: () => void;
  onSelectClienteDetail?: (cliente: Cliente) => void;
  onSelectColaboradorDetail?: (colaborador: Colaborador) => void;
  userRole?: UserRole;
  // Controle Financeiro — mesma tabela de lançamentos/faturas do Farma Aéreo
  // (LancamentoFaturamentoAereo/FaturaAereo), separada pelo campo `modal`.
  lancamentosFaturamentoAereo?: LancamentoFaturamentoAereo[];
  faturasAereo?: FaturaAereo[];
  onImportFaturamentoAereo?: (lancamentos: LancamentoFaturamentoAereo[], faturas: FaturaAereo[]) => void;
  onCreateFaturaAereo?: (fatura: FaturaAereo) => void;
  onUpdateFaturaAereo?: (fatura: FaturaAereo) => void;
  onDeleteFaturaAereo?: (id: string) => void;
  onUpdateLancamentoFaturamentoAereo?: (lancamento: LancamentoFaturamentoAereo) => void;
  onDeleteLancamentoFaturamentoAereo?: (id: string) => void;
}

export const FarmaRodoviarioView: React.FC<FarmaRodoviarioViewProps> = ({
  viagens = [],
  clientes,
  colaboradores = [],
  custosOperacionais = [],
  onSaveCliente = (_c: Cliente) => {},
  onSaveColaborador = (_c: Colaborador) => {},
  onSaveCusto,
  onDeleteCusto,
  onOpenNovoCliente,
  onOpenNovoColaborador,
  onSelectClienteDetail,
  onSelectColaboradorDetail,
  userRole = 'admin',
  lancamentosFaturamentoAereo = [],
  faturasAereo = [],
  onImportFaturamentoAereo = () => {},
  onCreateFaturaAereo = () => {},
  onUpdateFaturaAereo = () => {},
  onDeleteFaturaAereo = () => {},
  onUpdateLancamentoFaturamentoAereo = () => {},
  onDeleteLancamentoFaturamentoAereo = () => {},
}) => {
  // Managerial sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'visao_geral' | 'empresas' | 'equipe' | 'faturamento' | 'controle_financeiro' | 'custos'
  >('visao_geral');

  // Farma Aéreo e Farma Rodoviário compartilham a mesma tabela de lançamentos/faturas — o
  // campo `modal` separa quem é de quem (ver ehModalRodoviario).
  const lancamentosDoSetor = useMemo(
    () => lancamentosFaturamentoAereo.filter((l) => ehModalRodoviario(l.modal)),
    [lancamentosFaturamentoAereo]
  );
  const faturasDoSetor = useMemo(
    () => faturasAereo.filter((f) => ehModalRodoviario(f.modal)),
    [faturasAereo]
  );
  const faturamentoReal = useMemo(
    () => computeFaturamentoRealAereo(lancamentosDoSetor),
    [lancamentosDoSetor]
  );

  // Sector Link Modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalMode, setLinkModalMode] = useState<'clientes' | 'colaboradores'>('clientes');

  // Custo Operacional Modal state
  const [isCustoModalOpen, setIsCustoModalOpen] = useState(false);
  const [selectedCustoEdit, setSelectedCustoEdit] = useState<CustoOperacional | null>(null);

  // Financial and operational calculations
  const metrics = useMemo(() => {
    return calcFinancialsSetor('farma_rodoviario', clientes, colaboradores, custosOperacionais, faturamentoReal);
  }, [clientes, colaboradores, custosOperacionais, faturamentoReal]);

  // Clients and Collaborators of this sector
  const sectorClientes = useMemo(() => {
    return clientes.filter((c) => isClienteFarmaRodoviario(c));
  }, [clientes]);

  const sectorColaboradores = useMemo(() => {
    return colaboradores.filter((c) => c.status !== 'Inativo' && isColaboradorFarmaRodoviario(c));
  }, [colaboradores]);

  const handleOpenLinkModal = (mode: 'clientes' | 'colaboradores') => {
    setLinkModalMode(mode);
    setIsLinkModalOpen(true);
  };

  const handleToggleClienteLink = (cliente: Cliente, vincular: boolean) => {
    const updated = vincularClienteAoSetor(cliente, 'farma_rodoviario', vincular);
    onSaveCliente(updated);
  };

  const handleToggleColaboradorLink = (colaborador: Colaborador, vincular: boolean) => {
    const updated = vincularColaboradorAoSetor(colaborador, 'farma_rodoviario', vincular);
    onSaveColaborador(updated);
  };

  const handleExportManagerialReport = () => {
    const headers = ['Métrica Gerencial / Conta', 'Categoria', 'Valor / Quantidade', 'Observação'];
    const rows = [
      ['Setor', 'Identificação', 'Farma Rodoviário — Frotas & Rotas RDC 430', 'Gestão Gerencial JMT'],
      ['Faturamento Mensal Bruto', 'Receita', `R$ ${metrics.faturamentoMensalTotal.toFixed(2)}`, 'Contratos vigentes'],
      ['Faturamento Anual Projetado', 'Receita', `R$ ${metrics.faturamentoAnualizado.toFixed(2)}`, '12 meses'],
      ['Impostos s/ Faturamento (6%)', 'Deduções', `R$ ${metrics.impostosSobreFaturamento.toFixed(2)}`, 'Simples/Presumido'],
      ['Receita Operacional Líquida', 'Receita', `R$ ${metrics.receitaLiquida.toFixed(2)}`, 'Líquido de tributos'],
      ['Folha de Pagamento & Encargos RH', 'Custos', `R$ ${metrics.custoTotalFolhaPatronal.toFixed(2)}`, `${metrics.headcountEquipe} colaboradores`],
      ['Custos Operacionais Diretos', 'Custos', `R$ ${metrics.custoTotalOperacionalDireto.toFixed(2)}`, 'Diesel S10, manutenção, pedágios, frio'],
      ['Custo Total do Setor', 'Custos', `R$ ${metrics.custoTotalSetor.toFixed(2)}`, 'Folha + Diretos'],
      ['Margem de Contribuição / Lucro', 'Resultado', `R$ ${metrics.margemContribuicao.toFixed(2)}`, `${metrics.margemPercentual.toFixed(2)}% margem`],
      ['Total de Empresas Vinculadas', 'Carteira', metrics.totalClientesVinculados.toString(), `${metrics.totalClientesAtivos} ativas`],
      ['Ticket Médio por Empresa', 'Carteira', `R$ ${metrics.ticketMedioCliente.toFixed(2)}`, 'Média mensal'],
      ['Equipe Total Alocada', 'RH', metrics.headcountEquipe.toString(), `Custo médio R$ ${metrics.custoMedioPorColaborador.toFixed(2)}/colab`],
    ];

    const csvContent = [headers.join(';'), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_gerencial_farma_rodoviario_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Truck className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold backdrop-blur-xs">
              <Truck className="w-3.5 h-3.5" />
              <span>Painel Gerencial do Setor • Centro de Custo Rodoviário</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Gestão Executiva — Farma Rodoviário
            </h1>
            <p className="text-sm text-emerald-100/90 max-w-2xl font-normal leading-relaxed">
              Governança gerencial do setor rodoviário: controle de carteira de empresas atreladas, headcount e folha de equipe, faturamento de contratos e custos operacionais específicos (Diesel S10, manutenção de refrigeração e pedágios).
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenLinkModal('clientes')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Vincular Empresas ({metrics.totalClientesVinculados})</span>
            </button>

            <button
              onClick={() => handleOpenLinkModal('colaboradores')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors shadow-xs"
            >
              <Users className="w-3.5 h-3.5 text-teal-300" />
              <span>Alocar Equipe ({metrics.headcountEquipe})</span>
            </button>

            <button
              onClick={handleExportManagerialReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Relatório Gerencial</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center overflow-x-auto border-b border-slate-200 gap-2 bg-white px-3 pt-2 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveSubTab('visao_geral')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeSubTab === 'visao_geral'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Visão Geral & DRE</span>
        </button>

        <button
          onClick={() => setActiveSubTab('empresas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeSubTab === 'empresas'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empresas Atreladas ({metrics.totalClientesVinculados})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('equipe')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeSubTab === 'equipe'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Equipe do Setor ({metrics.headcountEquipe})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('faturamento')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeSubTab === 'faturamento'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Faturamento ({formatCurrency(metrics.faturamentoMensalTotal)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('controle_financeiro')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeSubTab === 'controle_financeiro'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Controle Financeiro ({lancamentosDoSetor.length} NFs/CT-es)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('custos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
            activeSubTab === 'custos'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Custos Operacionais ({formatCurrency(metrics.custoTotalSetor)})</span>
        </button>
      </div>

      {/* TAB 1: VISÃO GERAL GERENCIAL & DRE */}
      {activeSubTab === 'visao_geral' && (
        <SectorManagerialDashboard
          setor="farma_rodoviario"
          metrics={metrics}
          clientes={sectorClientes}
          colaboradores={sectorColaboradores}
          onOpenLinkModal={handleOpenLinkModal}
          onSwitchTab={(t) => setActiveSubTab(t as any)}
        />
      )}

      {/* TAB 2: EMPRESAS ATRELADAS */}
      {activeSubTab === 'empresas' && (
        <SectorClientsTab
          setor="farma_rodoviario"
          allClientes={clientes}
          onSaveCliente={onSaveCliente}
          onOpenNovoCliente={onOpenNovoCliente}
          onOpenLinkModal={() => handleOpenLinkModal('clientes')}
          onSelectClienteDetail={onSelectClienteDetail}
          userRole={userRole}
        />
      )}

      {/* TAB 3: EQUIPE DO SETOR */}
      {activeSubTab === 'equipe' && (
        <SectorEmployeesTab
          setor="farma_rodoviario"
          allColaboradores={colaboradores}
          onSaveColaborador={onSaveColaborador}
          onOpenNovoColaborador={onOpenNovoColaborador}
          onOpenLinkModal={() => handleOpenLinkModal('colaboradores')}
          onSelectColaboradorDetail={onSelectColaboradorDetail}
          userRole={userRole}
        />
      )}

      {/* TAB 4: FATURAMENTO & RECEITAS */}
      {activeSubTab === 'faturamento' && (
        <SectorRevenueTab
          setor="farma_rodoviario"
          metrics={metrics}
          clientes={sectorClientes}
          onOpenNovoCliente={onOpenNovoCliente}
          onOpenLinkModal={() => handleOpenLinkModal('clientes')}
          onSelectClienteDetail={onSelectClienteDetail}
        />
      )}

      {/* TAB: CONTROLE FINANCEIRO — FATURAMENTO (NFs / CT-es, precificação Ad Valorem ou por
          tabela de peso/cidade, conforme cadastrado no tarifário de cada cliente) */}
      {activeSubTab === 'controle_financeiro' && (
        <FaturamentoAereoView
          lancamentos={lancamentosDoSetor}
          faturas={faturasDoSetor}
          // Clientes: lista completa (não filtrada por setor) — o cálculo do Valor a Cobrar
          // depende do tarifário do cliente vinculado ao lançamento, independente de o
          // cadastro já ter sido explicitamente atrelado ao setor Farma Rodoviário ou não.
          clientes={clientes}
          onImport={onImportFaturamentoAereo}
          onCreateFatura={onCreateFaturaAereo}
          onUpdateFatura={onUpdateFaturaAereo}
          onDeleteFatura={onDeleteFaturaAereo}
          onUpdateLancamento={onUpdateLancamentoFaturamentoAereo}
          onDeleteLancamento={onDeleteLancamentoFaturamentoAereo}
          tituloSetor="Farma Rodoviário"
          modalPadrao="Rodoviário"
        />
      )}

      {/* TAB 5: CUSTOS OPERACIONAIS */}
      {activeSubTab === 'custos' && (
        <SectorCostsTab
          setor="farma_rodoviario"
          metrics={metrics}
          colaboradores={sectorColaboradores}
          custosOperacionais={custosOperacionais}
          onOpenNovoCusto={() => {
            setSelectedCustoEdit(null);
            setIsCustoModalOpen(true);
          }}
          onEditCusto={(c) => {
            setSelectedCustoEdit(c);
            setIsCustoModalOpen(true);
          }}
          onDeleteCusto={onDeleteCusto}
          onToggleStatusCusto={(id, newStatus) => {
            const item = custosOperacionais.find((c) => c.id === id);
            if (item && onSaveCusto) {
              onSaveCusto({ ...item, status: newStatus });
            }
          }}
          onOpenLinkModal={() => handleOpenLinkModal('colaboradores')}
          onOpenNovoColaborador={onOpenNovoColaborador}
        />
      )}

      {/* Sector Link Modal for Farma Rodoviário */}
      <SectorLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        setor="farma_rodoviario"
        mode={linkModalMode}
        allClientes={clientes}
        allColaboradores={colaboradores}
        onToggleClienteLink={handleToggleClienteLink}
        onToggleColaboradorLink={handleToggleColaboradorLink}
        onOpenNovoCliente={onOpenNovoCliente}
        onOpenNovoColaborador={onOpenNovoColaborador}
      />

      {/* Custo Operacional Form Modal */}
      <CustoOperacionalFormModal
        isOpen={isCustoModalOpen}
        onClose={() => {
          setIsCustoModalOpen(false);
          setSelectedCustoEdit(null);
        }}
        onSave={(custo) => {
          if (onSaveCusto) {
            onSaveCusto(custo);
          }
          setIsCustoModalOpen(false);
          setSelectedCustoEdit(null);
        }}
        initialData={selectedCustoEdit}
        defaultSetor="farma_rodoviario"
      />
    </div>
  );
};
