import React, { useState, useMemo } from 'react';
import {
  Plane,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Layers,
  PieChart,
  FileSpreadsheet,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  EmbarqueAereo,
  Cliente,
  Colaborador,
  UserRole,
  UsuarioLogin,
  CustoOperacional,
  StatusCustoOperacional,
  LancamentoFaturamentoAereo,
  FaturaAereo,
  Operacao,
} from '../../types';
import { podeVerAbaOperacoes } from '../../utils/visibilidadeUtils';
import { FaturamentoAereoView } from './FaturamentoAereoView';
import { SectorClientsTab } from '../Common/SectorClientsTab';
import { SectorEmployeesTab } from '../Common/SectorEmployeesTab';
import { SectorManagerialDashboard } from '../Common/SectorManagerialDashboard';
import { SectorRevenueTab } from '../Common/SectorRevenueTab';
import { SectorCostsTab } from '../Common/SectorCostsTab';
import { CustoOperacionalFormModal } from '../Cost/CustoOperacionalFormModal';
import {
  calcFinancialsSetor,
  computeFaturamentoRealAereo,
  isClienteFarmaAereo,
  isColaboradorFarmaAereo,
} from '../../utils/sectorUtils';
import { pertenceAoFarmaAereo } from './faturamentoAereoUtils';
import { formatCurrency } from '../../utils/formatters';

interface FarmaAereoViewProps {
  embarques?: EmbarqueAereo[];
  onSaveEmbarque?: (embarque: EmbarqueAereo) => void;
  onDeleteEmbarque?: (id: string) => void;
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
  /** Abre o modal de vincular Empresas/Equipe ao setor — o modal em si vive no App (é
   *  compartilhado com o Farma Rodoviário) para poder ser acionado tanto pelas abas
   *  internas quanto pelo atalho suspenso no menu lateral, abaixo do botão do módulo. */
  onOpenLinkModal: (mode: 'clientes' | 'colaboradores') => void;
  userRole?: UserRole;
  currentUser?: UsuarioLogin;
  lancamentosFaturamentoAereo?: LancamentoFaturamentoAereo[];
  faturasAereo?: FaturaAereo[];
  onImportFaturamentoAereo?: (lancamentos: LancamentoFaturamentoAereo[], faturas: FaturaAereo[]) => void;
  onCreateFaturaAereo?: (fatura: FaturaAereo) => void;
  onUpdateFaturaAereo?: (fatura: FaturaAereo) => void;
  onDeleteFaturaAereo?: (id: string) => void;
  onUpdateLancamentoFaturamentoAereo?: (lancamento: LancamentoFaturamentoAereo) => void;
  onDeleteLancamentoFaturamentoAereo?: (id: string) => void;
  /** Operações cadastradas além de Farma Aéreo/Rodoviário (ex.: Unimed) — repassadas só pro
   *  seletor de setor do Custo Operacional, pra poder marcar um custo como de outra operação. */
  operacoesExtras?: Operacao[];
}

export const FarmaAereoView: React.FC<FarmaAereoViewProps> = ({
  embarques = [],
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
  onOpenLinkModal,
  userRole = 'admin',
  currentUser,
  lancamentosFaturamentoAereo = [],
  faturasAereo = [],
  onImportFaturamentoAereo = () => {},
  onCreateFaturaAereo = () => {},
  onUpdateFaturaAereo = () => {},
  onDeleteFaturaAereo = () => {},
  onUpdateLancamentoFaturamentoAereo = () => {},
  onDeleteLancamentoFaturamentoAereo = () => {},
  operacoesExtras = [],
}) => {
  // Managerial sub-tabs — a aba inicial é a primeira permitida (ver secoesOperacoesPermitidas),
  // não sempre "visao_geral": alguém sem acesso a ela (ex.: só Empresas/Equipe) não pode abrir
  // a tela numa aba que nem vai poder ver.
  const ORDEM_ABAS_OPERACOES = [
    'visao_geral',
    'empresas',
    'equipe',
    'faturamento',
    'controle_financeiro',
    'custos',
  ] as const;
  const [activeSubTab, setActiveSubTab] = useState<
    'visao_geral' | 'empresas' | 'equipe' | 'faturamento' | 'controle_financeiro' | 'custos'
  >(() => ORDEM_ABAS_OPERACOES.find((aba) => podeVerAbaOperacoes(currentUser, aba, 'farma_aereo')) || 'visao_geral');

  // Custo Operacional Modal state
  const [isCustoModalOpen, setIsCustoModalOpen] = useState(false);
  const [selectedCustoEdit, setSelectedCustoEdit] = useState<CustoOperacional | null>(null);

  // Farma Aéreo e Farma Rodoviário compartilham a mesma tabela de lançamentos/faturas
  // (LancamentoFaturamentoAereo/FaturaAereo) — quem separa qual é de quem é o SETOR VINCULADO
  // AO CLIENTE (cadastro), não o texto livre da coluna "Modal" de uma planilha importada (que
  // pode vir errado/inconsistente linha a linha) — ver pertenceAoFarmaAereo.
  const lancamentosDoSetor = useMemo(
    () => lancamentosFaturamentoAereo.filter((l) => pertenceAoFarmaAereo(l, clientes)),
    [lancamentosFaturamentoAereo, clientes]
  );
  const faturasDoSetor = useMemo(
    () => faturasAereo.filter((f) => pertenceAoFarmaAereo(f, clientes)),
    [faturasAereo, clientes]
  );

  // Faturamento real (Controle Financeiro) — substitui o campo "estimado" por cliente
  // sempre que houver lançamento lançado, para a Visão Geral & DRE refletir o que foi
  // realmente cobrado em vez de uma meta manual que ninguém mantém atualizada.
  const faturamentoReal = useMemo(
    () => computeFaturamentoRealAereo(lancamentosDoSetor),
    [lancamentosDoSetor]
  );

  // Financial and operational calculations
  const metrics = useMemo(() => {
    return calcFinancialsSetor('farma_aereo', clientes, colaboradores, custosOperacionais, faturamentoReal);
  }, [clientes, colaboradores, custosOperacionais, faturamentoReal]);

  // Clients and Collaborators of this sector
  const sectorClientes = useMemo(() => {
    return clientes.filter((c) => isClienteFarmaAereo(c));
  }, [clientes]);

  const sectorColaboradores = useMemo(() => {
    return colaboradores.filter((c) => c.status !== 'Inativo' && isColaboradorFarmaAereo(c));
  }, [colaboradores]);

  return (
    <div className="space-y-6">
      {/* Executive Header — as ações rápidas (Vincular Empresas, Alocar Equipe, Relatório
          Gerencial) agora ficam suspensas no menu lateral, abaixo do botão do próprio
          módulo, em vez de duplicadas aqui no topo. */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-100 pointer-events-none flex items-center pr-8">
          <Plane className="w-64 h-64 text-amber-50" />
        </div>

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-[#92611F] border border-amber-200 text-xs font-semibold">
            <Plane className="w-3.5 h-3.5" />
            <span>Painel Gerencial do Setor • Centro de Custo Aéreo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Gestão Executiva — Farma Aéreo
          </h1>
          <p className="text-sm text-slate-500 font-normal leading-relaxed">
            Governança gerencial do setor aéreo: controle de carteira de empresas atreladas, headcount e folha de equipe, faturamento de contratos e custos operacionais específicos (Cias Aéreas, TECA e RDC 430).
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center overflow-x-auto border-b border-slate-200 gap-2 bg-white px-3 pt-2 rounded-xl shadow-xs">
        {podeVerAbaOperacoes(currentUser, 'visao_geral', 'farma_aereo') && (
          <button
            onClick={() => setActiveSubTab('visao_geral')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeSubTab === 'visao_geral'
                ? 'border-[#C48229] text-[#92611F] bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Visão Geral & DRE</span>
          </button>
        )}

        {podeVerAbaOperacoes(currentUser, 'empresas', 'farma_aereo') && (
          <button
            onClick={() => setActiveSubTab('empresas')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeSubTab === 'empresas'
                ? 'border-[#C48229] text-[#92611F] bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Empresas Atreladas ({metrics.totalClientesVinculados})</span>
          </button>
        )}

        {podeVerAbaOperacoes(currentUser, 'equipe', 'farma_aereo') && (
          <button
            onClick={() => setActiveSubTab('equipe')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeSubTab === 'equipe'
                ? 'border-[#C48229] text-[#92611F] bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Equipe do Setor ({metrics.headcountEquipe})</span>
          </button>
        )}

        {podeVerAbaOperacoes(currentUser, 'faturamento', 'farma_aereo') && (
          <button
            onClick={() => setActiveSubTab('faturamento')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeSubTab === 'faturamento'
                ? 'border-[#C48229] text-[#92611F] bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Faturamento ({formatCurrency(metrics.faturamentoMensalTotal)})</span>
          </button>
        )}

        {podeVerAbaOperacoes(currentUser, 'controle_financeiro', 'farma_aereo') && (
          <button
            onClick={() => setActiveSubTab('controle_financeiro')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeSubTab === 'controle_financeiro'
                ? 'border-[#C48229] text-[#92611F] bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Controle Financeiro ({lancamentosDoSetor.length} CT-Es)</span>
          </button>
        )}

        {podeVerAbaOperacoes(currentUser, 'custos', 'farma_aereo') && (
          <button
            onClick={() => setActiveSubTab('custos')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeSubTab === 'custos'
                ? 'border-[#C48229] text-[#92611F] bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Custos Operacionais ({formatCurrency(metrics.custoTotalSetor)})</span>
          </button>
        )}
      </div>

      {/* TAB 1: VISÃO GERAL GERENCIAL & DRE */}
      {activeSubTab === 'visao_geral' && podeVerAbaOperacoes(currentUser, 'visao_geral', 'farma_aereo') && (
        <SectorManagerialDashboard
          setor="farma_aereo"
          metrics={metrics}
          clientes={sectorClientes}
          colaboradores={sectorColaboradores}
          onOpenLinkModal={onOpenLinkModal}
          onSwitchTab={(t) => setActiveSubTab(t as any)}
        />
      )}

      {/* TAB 2: EMPRESAS ATRELADAS */}
      {activeSubTab === 'empresas' && podeVerAbaOperacoes(currentUser, 'empresas', 'farma_aereo') && (
        <SectorClientsTab
          setor="farma_aereo"
          allClientes={clientes}
          onSaveCliente={onSaveCliente}
          onOpenNovoCliente={onOpenNovoCliente}
          onOpenLinkModal={() => onOpenLinkModal('clientes')}
          onSelectClienteDetail={onSelectClienteDetail}
          userRole={userRole}
        />
      )}

      {/* TAB 3: EQUIPE DO SETOR */}
      {activeSubTab === 'equipe' && podeVerAbaOperacoes(currentUser, 'equipe', 'farma_aereo') && (
        <SectorEmployeesTab
          setor="farma_aereo"
          allColaboradores={colaboradores}
          onSaveColaborador={onSaveColaborador}
          onOpenNovoColaborador={onOpenNovoColaborador}
          onOpenLinkModal={() => onOpenLinkModal('colaboradores')}
          onSelectColaboradorDetail={onSelectColaboradorDetail}
          userRole={userRole}
        />
      )}

      {/* TAB 4: FATURAMENTO & RECEITAS */}
      {activeSubTab === 'faturamento' && podeVerAbaOperacoes(currentUser, 'faturamento', 'farma_aereo') && (
        <SectorRevenueTab
          setor="farma_aereo"
          metrics={metrics}
          clientes={sectorClientes}
          onOpenNovoCliente={onOpenNovoCliente}
          onOpenLinkModal={() => onOpenLinkModal('clientes')}
          onSelectClienteDetail={onSelectClienteDetail}
        />
      )}

      {/* TAB: CONTROLE FINANCEIRO — FATURAMENTO (CT-Es / Faturas) */}
      {activeSubTab === 'controle_financeiro' && podeVerAbaOperacoes(currentUser, 'controle_financeiro', 'farma_aereo') && (
        <FaturamentoAereoView
          lancamentos={lancamentosDoSetor}
          faturas={faturasDoSetor}
          // Clientes: lista completa (não filtrada por setor) — o cálculo do Valor a Cobrar
          // depende do tarifário do cliente vinculado ao lançamento, independente de o
          // cadastro já ter sido explicitamente atrelado ao setor Farma Aéreo ou não.
          clientes={clientes}
          onImport={onImportFaturamentoAereo}
          onCreateFatura={onCreateFaturaAereo}
          onUpdateFatura={onUpdateFaturaAereo}
          onDeleteFatura={onDeleteFaturaAereo}
          onUpdateLancamento={onUpdateLancamentoFaturamentoAereo}
          onDeleteLancamento={onDeleteLancamentoFaturamentoAereo}
          tituloSetor="Farma Aéreo"
        />
      )}

      {/* TAB 5: CUSTOS OPERACIONAIS */}
      {activeSubTab === 'custos' && podeVerAbaOperacoes(currentUser, 'custos', 'farma_aereo') && (
        <SectorCostsTab
          setor="farma_aereo"
          metrics={metrics}
          colaboradores={sectorColaboradores}
          custosOperacionais={custosOperacionais}
          totalOperacoesAtivas={2 + operacoesExtras.length}
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
          onOpenLinkModal={() => onOpenLinkModal('colaboradores')}
          onOpenNovoColaborador={onOpenNovoColaborador}
        />
      )}

      {/* Sector Link Modal for Farma Aéreo — vive no App.tsx (compartilhado com o Rodoviário
          e com o atalho suspenso no menu lateral), não é mais renderizado aqui. */}

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
        defaultSetor="farma_aereo"
        operacoesExtras={operacoesExtras}
      />
    </div>
  );
};
