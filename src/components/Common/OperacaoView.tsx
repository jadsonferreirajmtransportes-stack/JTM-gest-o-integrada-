import React, { useState, useMemo } from 'react';
import { Building2, Users, DollarSign, TrendingUp, PieChart, Receipt } from 'lucide-react';
import {
  Cliente,
  Colaborador,
  UserRole,
  UsuarioLogin,
  CustoOperacional,
  Operacao,
  LancamentoFaturamentoOperacao,
  TipoOperacaoDiaria,
  RegistroDiaOperacao,
  FaixaVolumeOperacao,
  ColetaOperacao,
} from '../../types';
import { podeVerAbaOperacoes } from '../../utils/visibilidadeUtils';
import { SectorClientsTab } from './SectorClientsTab';
import { SectorEmployeesTab } from './SectorEmployeesTab';
import { SectorManagerialDashboard } from './SectorManagerialDashboard';
import { SectorRevenueTab } from './SectorRevenueTab';
import { SectorCostsTab } from './SectorCostsTab';
import { LancamentosFaturamentoOperacaoSection } from './LancamentosFaturamentoOperacaoSection';
import { AcompanhamentoOperacionalSection } from './AcompanhamentoOperacionalSection';
import { CustoOperacionalFormModal } from '../Cost/CustoOperacionalFormModal';
import {
  calcFinancialsSetor,
  computeFaturamentoRealOperacao,
  isVinculadoAoSetor,
  operacaoTemAba,
} from '../../utils/sectorUtils';
import { resolveOperacaoIcon } from '../../utils/iconResolver';
import { formatCurrency } from '../../utils/formatters';

/** Painel genérico de uma Operação cadastrada (ver types.ts `Operacao`) — qualquer setor além
 *  de Farma Aéreo/Farma Rodoviário (que continuam com suas próprias telas, mais ricas: têm
 *  Controle Financeiro de CT-e/NF que não faz sentido genérico) passa por aqui. Monta as
 *  mesmas 5 abas genéricas que já existem nos dois setores originais — Visão Geral, Empresas,
 *  Equipe, Faturamento e Custos — a partir só do registro da operação, sem tela nova por
 *  operação. */
interface OperacaoViewProps {
  operacao: Operacao;
  clientes: Cliente[];
  colaboradores?: Colaborador[];
  custosOperacionais?: CustoOperacional[];
  operacoesExtras?: Operacao[];
  totalOperacoesAtivas?: number;
  /** Meses de faturamento real já conciliados com o parceiro (ver LancamentoFaturamentoOperacao)
   *  — já vem filtrado só pra essa operação. Assim que existir 1, ele passa a mandar na Visão
   *  Geral/DRE em vez do campo "estimado" de cada cliente. */
  lancamentosFaturamento?: LancamentoFaturamentoOperacao[];
  onSaveLancamentoFaturamento?: (lancamento: LancamentoFaturamentoOperacao) => void;
  onDeleteLancamentoFaturamento?: (id: string) => void;
  /** Acompanhamento operacional (dias corridos / coletas por faixa de volume) — já vem
   *  filtrado só pra essa operação. Sem os handlers, a seção de acompanhamento não aparece. */
  tiposOperacaoDiaria?: TipoOperacaoDiaria[];
  registrosDiaOperacao?: RegistroDiaOperacao[];
  faixasVolumeOperacao?: FaixaVolumeOperacao[];
  coletasOperacao?: ColetaOperacao[];
  onSaveTipoOperacaoDiaria?: (tipo: TipoOperacaoDiaria) => void;
  onDeleteTipoOperacaoDiaria?: (id: string) => void;
  onMarcarDiaOperacao?: (registro: RegistroDiaOperacao) => void;
  onDesmarcarDiaOperacao?: (id: string) => void;
  onSaveFaixaVolumeOperacao?: (faixa: FaixaVolumeOperacao) => void;
  onDeleteFaixaVolumeOperacao?: (id: string) => void;
  onSaveColetaOperacao?: (coleta: ColetaOperacao) => void;
  onDeleteColetaOperacao?: (id: string) => void;
  onSaveCliente?: (cliente: Cliente) => void;
  onSaveColaborador?: (colaborador: Colaborador) => void;
  onSaveCusto?: (custo: CustoOperacional) => void;
  onDeleteCusto?: (id: string) => void;
  onOpenNovoCliente?: () => void;
  onOpenNovoColaborador?: () => void;
  onSelectClienteDetail?: (cliente: Cliente) => void;
  onSelectColaboradorDetail?: (colaborador: Colaborador) => void;
  onOpenLinkModal: (mode: 'clientes' | 'colaboradores') => void;
  userRole?: UserRole;
  currentUser?: UsuarioLogin;
}

export const OperacaoView: React.FC<OperacaoViewProps> = ({
  operacao,
  clientes,
  colaboradores = [],
  custosOperacionais = [],
  operacoesExtras = [],
  totalOperacoesAtivas = 2,
  lancamentosFaturamento = [],
  onSaveLancamentoFaturamento,
  onDeleteLancamentoFaturamento,
  tiposOperacaoDiaria = [],
  registrosDiaOperacao = [],
  faixasVolumeOperacao = [],
  coletasOperacao = [],
  onSaveTipoOperacaoDiaria,
  onDeleteTipoOperacaoDiaria,
  onMarcarDiaOperacao,
  onDesmarcarDiaOperacao,
  onSaveFaixaVolumeOperacao,
  onDeleteFaixaVolumeOperacao,
  onSaveColetaOperacao,
  onDeleteColetaOperacao,
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
}) => {
  const OperacaoIcon = resolveOperacaoIcon(operacao.icone);

  const ORDEM_ABAS_OPERACOES = ['visao_geral', 'empresas', 'equipe', 'faturamento', 'custos'] as const;
  // Uma aba só aparece se a Operação a tiver habilitada (cadastro) E o login tiver permissão
  // pra vê-la (secoesOperacoesPermitidas) — as duas checagens são independentes.
  const podeVerAba = (aba: (typeof ORDEM_ABAS_OPERACOES)[number]) =>
    operacaoTemAba(operacao.secoesAtivas, aba) && podeVerAbaOperacoes(currentUser, aba);
  const [activeSubTab, setActiveSubTab] = useState<
    'visao_geral' | 'empresas' | 'equipe' | 'faturamento' | 'custos'
  >(() => ORDEM_ABAS_OPERACOES.find((aba) => podeVerAba(aba)) || 'visao_geral');

  const [isCustoModalOpen, setIsCustoModalOpen] = useState(false);
  const [selectedCustoEdit, setSelectedCustoEdit] = useState<CustoOperacional | null>(null);

  // Sem Controle Financeiro de CT-e/NF — o "faturamento real" aqui vem dos meses conciliados
  // manualmente (LancamentosFaturamentoOperacaoSection) OU do que já foi apurado sozinho no
  // Acompanhamento Operacional (dias marcados / coletas registradas). Só sem nenhum dos dois
  // é que cai no fallback "estimado" por cliente (mesmo comportamento de antes).
  const temFaturamentoReal =
    lancamentosFaturamento.length > 0 || coletasOperacao.length > 0 || registrosDiaOperacao.length > 0;
  const faturamentoReal = useMemo(
    () =>
      temFaturamentoReal
        ? computeFaturamentoRealOperacao(lancamentosFaturamento, coletasOperacao, registrosDiaOperacao, tiposOperacaoDiaria)
        : undefined,
    [temFaturamentoReal, lancamentosFaturamento, coletasOperacao, registrosDiaOperacao, tiposOperacaoDiaria]
  );
  const metrics = useMemo(
    () => calcFinancialsSetor(operacao.id, clientes, colaboradores, custosOperacionais, faturamentoReal),
    [operacao.id, clientes, colaboradores, custosOperacionais, faturamentoReal]
  );

  const sectorClientes = useMemo(
    () => clientes.filter((c) => isVinculadoAoSetor(c.setoresVinculados, operacao.id)),
    [clientes, operacao.id]
  );
  // Soma do "Faturamento Mensal Estimado" de cada empresa atrelada — mostrado ao lado do real
  // conciliado (não some quando há lançamento; o usuário pediu pra ver os dois lado a lado,
  // mesmo que o DRE priorize o real quando ele existir).
  const totalEstimadoEmpresas = useMemo(
    () => sectorClientes.reduce((sum, c) => sum + (Number(c.faturamentoMensalEstimado) || 0), 0),
    [sectorClientes]
  );
  const sectorColaboradores = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo' && isVinculadoAoSetor(c.setoresAtuacao, operacao.id)),
    [colaboradores, operacao.id]
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho Executivo */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-100 pointer-events-none flex items-center pr-8">
          <OperacaoIcon className="w-64 h-64 text-amber-50" />
        </div>
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-[#92611F] border border-amber-200 text-xs font-semibold">
            <OperacaoIcon className="w-3.5 h-3.5" />
            <span>Painel Gerencial do Setor • Centro de Custo {operacao.nome}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Gestão Executiva — {operacao.nome}
          </h1>
          <p className="text-sm text-slate-500 font-normal leading-relaxed">
            Governança gerencial da operação: carteira de empresas atreladas, headcount e folha
            de equipe, faturamento estimado por contrato e custos operacionais registrados.
          </p>
        </div>
      </div>

      {/* Sub-navegação */}
      <div className="flex items-center overflow-x-auto border-b border-slate-200 gap-2 bg-white px-3 pt-2 rounded-xl shadow-xs">
        {podeVerAba('visao_geral') && (
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
        {podeVerAba('empresas') && (
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
        {podeVerAba('equipe') && (
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
        {podeVerAba('faturamento') && (
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
        {podeVerAba('custos') && (
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

      {activeSubTab === 'visao_geral' && podeVerAba('visao_geral') && (
        <SectorManagerialDashboard
          setor={operacao.id}
          metrics={metrics}
          clientes={sectorClientes}
          colaboradores={sectorColaboradores}
          onOpenLinkModal={onOpenLinkModal}
          onSwitchTab={(t) => setActiveSubTab(t as any)}
        />
      )}

      {activeSubTab === 'empresas' && podeVerAba('empresas') && (
        <SectorClientsTab
          setor={operacao.id}
          allClientes={clientes}
          onSaveCliente={onSaveCliente}
          onOpenNovoCliente={onOpenNovoCliente}
          onOpenLinkModal={() => onOpenLinkModal('clientes')}
          onSelectClienteDetail={onSelectClienteDetail}
          userRole={userRole}
          nomeSetorGenerico={operacao.nome}
          iconeSetorGenerico={OperacaoIcon}
        />
      )}

      {activeSubTab === 'equipe' && podeVerAba('equipe') && (
        <SectorEmployeesTab
          setor={operacao.id}
          allColaboradores={colaboradores}
          onSaveColaborador={onSaveColaborador}
          onOpenNovoColaborador={onOpenNovoColaborador}
          onOpenLinkModal={() => onOpenLinkModal('colaboradores')}
          onSelectColaboradorDetail={onSelectColaboradorDetail}
          userRole={userRole}
          nomeSetorGenerico={operacao.nome}
          iconeSetorGenerico={OperacaoIcon}
        />
      )}

      {activeSubTab === 'faturamento' && podeVerAba('faturamento') && (
        <div className="space-y-4">
          {/* Comparativo: as duas fontes de faturamento ficam sempre visíveis lado a lado —
              uma não substitui a outra na tela, mesmo que o DRE (Visão Geral) priorize o real
              conciliado quando ele existir, por ser mais confiável que uma estimativa. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Estimado (Empresas Atreladas)
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(totalEstimadoEmpresas)}</div>
              <p className="text-[10px] text-slate-400 mt-1">
                Soma do "Faturamento Mensal Estimado" digitado em cada empresa vinculada.
              </p>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Real Conciliado (Lançamentos)
              </span>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {faturamentoReal ? formatCurrency(faturamentoReal.totalMensalMedio) : '—'}
              </div>
              <p className="text-[10px] text-emerald-700/70 mt-1">
                {faturamentoReal
                  ? `Média de ${faturamentoReal.mesesComDados} mês${faturamentoReal.mesesComDados === 1 ? '' : 'es'} lançado${faturamentoReal.mesesComDados === 1 ? '' : 's'} — este valor é o que entra na Visão Geral & DRE.`
                  : 'Nenhum mês lançado ainda — a Visão Geral & DRE usa o estimado ao lado.'}
              </p>
            </div>
          </div>

          {onSaveLancamentoFaturamento && (
            <LancamentosFaturamentoOperacaoSection
              operacaoId={operacao.id}
              operacaoNome={operacao.nome}
              lancamentos={lancamentosFaturamento}
              clientes={sectorClientes}
              onSave={onSaveLancamentoFaturamento}
              onDelete={onDeleteLancamentoFaturamento || (() => {})}
            />
          )}

          {onSaveTipoOperacaoDiaria &&
            onMarcarDiaOperacao &&
            onDesmarcarDiaOperacao &&
            onSaveFaixaVolumeOperacao &&
            onSaveColetaOperacao && (
              <AcompanhamentoOperacionalSection
                operacaoId={operacao.id}
                operacaoNome={operacao.nome}
                tiposOperacaoDiaria={tiposOperacaoDiaria}
                registrosDia={registrosDiaOperacao}
                faixasVolume={faixasVolumeOperacao}
                coletas={coletasOperacao}
                clientes={sectorClientes}
                onSaveTipo={onSaveTipoOperacaoDiaria}
                onDeleteTipo={onDeleteTipoOperacaoDiaria || (() => {})}
                onMarcarDia={onMarcarDiaOperacao}
                onDesmarcarDia={onDesmarcarDiaOperacao}
                onSaveFaixa={onSaveFaixaVolumeOperacao}
                onDeleteFaixa={onDeleteFaixaVolumeOperacao || (() => {})}
                onSaveColeta={onSaveColetaOperacao}
                onDeleteColeta={onDeleteColetaOperacao || (() => {})}
              />
            )}

          <SectorRevenueTab
            setor={operacao.id}
            metrics={metrics}
            clientes={sectorClientes}
            onOpenNovoCliente={onOpenNovoCliente}
            onOpenLinkModal={() => onOpenLinkModal('clientes')}
            onSelectClienteDetail={onSelectClienteDetail}
          />
        </div>
      )}

      {activeSubTab === 'custos' && podeVerAba('custos') && (
        <SectorCostsTab
          setor={operacao.id}
          metrics={metrics}
          colaboradores={sectorColaboradores}
          custosOperacionais={custosOperacionais}
          totalOperacoesAtivas={totalOperacoesAtivas}
          nomeSetorGenerico={operacao.nome}
          iconeSetorGenerico={OperacaoIcon}
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

      <CustoOperacionalFormModal
        isOpen={isCustoModalOpen}
        onClose={() => {
          setIsCustoModalOpen(false);
          setSelectedCustoEdit(null);
        }}
        onSave={(custo) => {
          if (onSaveCusto) onSaveCusto(custo);
          setIsCustoModalOpen(false);
          setSelectedCustoEdit(null);
        }}
        initialData={selectedCustoEdit}
        defaultSetor={operacao.id}
        operacoesExtras={operacoesExtras}
      />
    </div>
  );
};
