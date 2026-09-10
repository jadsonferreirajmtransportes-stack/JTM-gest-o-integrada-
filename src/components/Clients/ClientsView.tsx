import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  DollarSign,
  Truck,
  ShieldCheck,
  Thermometer,
  Layers,
  FileSpreadsheet,
  Download,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Clock,
  Phone,
  MessageCircle,
  TrendingUp,
  User,
  ChevronRight,
} from 'lucide-react';
import { Cliente, Empregador, Supervisor, UserRole, InteracaoCliente } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { ClientCard } from './ClientCard';
import { ClientFormModal } from './ClientFormModal';
import { ClientDetailModal } from './ClientDetailModal';
import { ClientInteractionModal } from './ClientInteractionModal';
import { PropostaComercialModal } from './PropostaComercialModal';

interface ClientsViewProps {
  clientes: Cliente[];
  onSaveCliente: (cliente: Cliente) => void;
  onDeleteCliente: (id: string) => void;
  empregadores: Empregador[];
  supervisores: Supervisor[];
  userRole: UserRole;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clientes,
  onSaveCliente,
  onDeleteCliente,
  empregadores,
  supervisores,
  userRole,
}) => {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSegmento, setSelectedSegmento] = useState<string>('all');
  const [selectedTemperatura, setSelectedTemperatura] = useState<string>('all');
  const [selectedGestor, setSelectedGestor] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [selectedDetailClient, setSelectedDetailClient] = useState<Cliente | null>(null);
  const [interactionModalClient, setInteractionModalClient] = useState<Cliente | null>(null);
  const [propostaClient, setPropostaClient] = useState<Cliente | null>(null);

  // Filtered list
  const filteredClientes = useMemo(() => {
    return clientes.filter((cli) => {
      const matchSearch =
        cli.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cli.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cli.codigoCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cli.cnpj && cli.cnpj.includes(searchTerm)) ||
        (cli.cidadeUF && cli.cidadeUF.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = selectedStatus === 'all' || cli.status === selectedStatus;
      const matchSegmento = selectedSegmento === 'all' || cli.segmento === selectedSegmento;
      const matchTemperatura = selectedTemperatura === 'all' || cli.faixaTemperatura.includes(selectedTemperatura);
      const matchGestor = selectedGestor === 'all' || cli.gerenteContaResponsavel === selectedGestor;

      return matchSearch && matchStatus && matchSegmento && matchTemperatura && matchGestor;
    });
  }, [clientes, searchTerm, selectedStatus, selectedSegmento, selectedTemperatura, selectedGestor]);

  // Executive Metrics
  const metrics = useMemo(() => {
    const total = clientes.length;
    const ativos = clientes.filter((c) => c.status === 'Ativo').length;
    const faturamentoTotal = clientes.reduce(
      (acc, c) => acc + (c.status === 'Ativo' ? (c.faturamentoMensalEstimado || 0) : 0),
      0
    );
    const volumeTotal = clientes.reduce(
      (acc, c) => acc + (c.status === 'Ativo' ? (c.volumeEntregasMesEstimado || 0) : 0),
      0
    );
    const rdc430Count = clientes.filter((c) => c.exigeRDC430).length;

    return {
      total,
      ativos,
      faturamentoTotal,
      volumeTotal,
      rdc430Count,
    };
  }, [clientes]);

  // Handlers
  const handleOpenNew = () => {
    setEditingClient(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setEditingClient(cliente);
    setIsFormModalOpen(true);
  };

  const handleSelectDetail = (cliente: Cliente) => {
    setSelectedDetailClient(cliente);
  };

  const handleOpenAddInteraction = (cliente: Cliente) => {
    setInteractionModalClient(cliente);
  };

  // Ao cadastrar um cliente NOVO (editingClient nulo no momento do save), já abre a
  // Proposta Comercial pré-preenchida pra revisar/exportar em PDF na hora. Ao editar
  // um cliente existente, não reabre — evita interromper com uma proposta a cada ajuste.
  const handleSaveClienteComProposta = (cliente: Cliente) => {
    const eraNovo = !editingClient;
    onSaveCliente(cliente);
    if (eraNovo) {
      setPropostaClient(cliente);
    }
  };

  const handleGerarProposta = (cliente: Cliente) => {
    setSelectedDetailClient(null);
    setPropostaClient(cliente);
  };

  const handleSaveInteraction = (clienteId: string, interacao: InteracaoCliente) => {
    const target = clientes.find((c) => c.id === clienteId);
    if (!target) return;
    const updated: Cliente = {
      ...target,
      interacoes: [interacao, ...(target.interacoes || [])],
      atualizadoEm: new Date().toISOString(),
    };
    onSaveCliente(updated);
    if (selectedDetailClient && selectedDetailClient.id === clienteId) {
      setSelectedDetailClient(updated);
    }
  };

  const handleUpdateStatus = (clienteId: string, newStatus: Cliente['status']) => {
    const target = clientes.find((c) => c.id === clienteId);
    if (!target) return;
    const updated: Cliente = {
      ...target,
      status: newStatus,
      atualizadoEm: new Date().toISOString(),
    };
    onSaveCliente(updated);
    if (selectedDetailClient && selectedDetailClient.id === clienteId) {
      setSelectedDetailClient(updated);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Razão Social',
      'Nome Fantasia',
      'CNPJ',
      'Status',
      'Segmento',
      'Faixa Temperatura',
      'Exige RDC 430',
      'Faturamento Mensal (R$)',
      'Volume Entregas/Mês',
      'Modelo Cobrança',
      'Tarifa Base',
      'Gestor da Conta',
      'Cidade/UF',
      'Telefone',
      'E-mail',
    ];

    const rows = filteredClientes.map((c) => [
      c.codigoCliente,
      `"${c.razaoSocial.replace(/"/g, '""')}"`,
      `"${(c.nomeFantasia || '').replace(/"/g, '""')}"`,
      c.cnpj || '',
      c.status,
      c.segmento,
      c.faixaTemperatura,
      c.exigeRDC430 ? 'Sim' : 'Não',
      c.faturamentoMensalEstimado || 0,
      c.volumeEntregasMesEstimado || 0,
      c.tabelaFrete?.tipoCobranca || '',
      c.tabelaFrete?.valorBase || 0,
      c.gerenteContaResponsavel || '',
      `"${(c.cidadeUF || '').replace(/"/g, '""')}"`,
      c.telefonePrincipal || '',
      c.emailPrincipal || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jmt_carteira_clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Executive Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Building2 className="w-80 h-80 text-blue-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B38F4F]/20 text-[#E5C178] border border-[#B38F4F]/40 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Building2 className="w-3.5 h-3.5 text-[#E5C178]" />
              <span>Gestão Comercial & Operações Farmacêuticas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Carteira de Clientes & Contratos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
              Gestão de contratos de frete, distribuição farmacêutica RDC 430, tabelas de tarifas e histórico de atendimento.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              id="btn-export-clients-csv"
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors shadow-xs"
              title="Exportar Carteira em Planilha CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            {userRole === 'admin' && (
              <button
                id="btn-add-new-client"
                type="button"
                onClick={handleOpenNew}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B38F4F] hover:bg-[#8A6A39] text-slate-950 font-bold text-xs transition-all shadow-md active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Cliente</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Carteira de Clientes</span>
            <Building2 className="w-4 h-4 text-[#B38F4F]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics.total}</span>
            <span className="text-xs text-emerald-400 font-semibold font-mono">
              ({metrics.ativos} Ativos)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Parceiros contratados JMT</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Faturamento / Mês Estimado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {formatCurrency(metrics.faturamentoTotal)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Receita estimada da carteira ativa</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Volume de Entregas / Mês</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics.volumeTotal}</span>
            <span className="text-xs text-cyan-400 font-semibold font-mono">pontos/mês</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Last mile e transferências</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Cadeia Fria & RDC 430</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">{metrics.rdc430Count}</span>
            <span className="text-xs text-slate-400">
              ({metrics.total > 0 ? Math.round((metrics.rdc430Count / metrics.total) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Exigem qualificação térmica ANVISA</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-clients"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, CNPJ, código ou cidade..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#B38F4F]"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              id="select-filter-client-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#B38F4F]"
            >
              <option value="all">Todos os Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Em Negociação">Em Negociação</option>
              <option value="Prospecção">Prospecção</option>
              <option value="Suspenso">Suspenso</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          {/* Segment Filter */}
          <div className="sm:col-span-3">
            <select
              id="select-filter-client-segment"
              value={selectedSegmento}
              onChange={(e) => setSelectedSegmento(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#B38F4F]"
            >
              <option value="all">Todos os Segmentos</option>
              <option value="Distribuidora de Medicamentos">Distribuidora Medicamentos</option>
              <option value="Indústria Farmacêutica">Indústria Farmacêutica</option>
              <option value="Rede de Drogarias / Farmácias">Rede de Drogarias</option>
              <option value="Hospital / Clínica / Operadora de Saúde">Hospital / Clínica</option>
              <option value="Cosméticos / Higiene / Nutracêuticos">Cosméticos / Nutracêuticos</option>
              <option value="Alimentos Climatizados / Frios">Alimentos Climatizados</option>
              <option value="Atacado / Carga Seca">Atacado / Carga Seca</option>
            </select>
          </div>

          {/* Temperatura Filter */}
          <div className="sm:col-span-2">
            <select
              id="select-filter-client-temp"
              value={selectedTemperatura}
              onChange={(e) => setSelectedTemperatura(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-[#B38F4F]"
            >
              <option value="all">Todas as Temperaturas</option>
              <option value="Climatizado">Climatizado (15° a 25°)</option>
              <option value="Refrigerado">Refrigerado (2° a 8°)</option>
              <option value="Múltiplas">Múltiplas Faixas</option>
              <option value="Ambiente">Ambiente</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="sm:col-span-1 flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#B38F4F]/15 text-[#B38F4F] border border-[#B38F4F]/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#B38F4F]/15 text-[#B38F4F] border border-[#B38F4F]/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Visualização em Lista / Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Clients Display: Grid vs. Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClientes.map((cliente) => (
            <ClientCard
              key={cliente.id}
              cliente={cliente}
              userRole={userRole}
              onSelect={handleSelectDetail}
              onEdit={handleOpenEdit}
              onDelete={onDeleteCliente}
              onAddInteraction={handleOpenAddInteraction}
            />
          ))}

          {filteredClientes.length === 0 && (
            <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhum cliente encontrado</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tente ajustar os filtros de busca ou cadastre um novo parceiro comercial para a carteira da JMT.
              </p>
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={handleOpenNew}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#B38F4F] hover:bg-[#8A6A39] text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Cliente</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Código / Cliente</th>
                  <th className="px-4 py-3">Segmento</th>
                  <th className="px-4 py-3">Faixa Térmica</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Faturamento/Mês</th>
                  <th className="px-4 py-3">Modelo Frete</th>
                  <th className="px-4 py-3">Gestor JMT</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredClientes.map((cli) => (
                  <tr
                    key={cli.id}
                    onClick={() => handleSelectDetail(cli)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{cli.nomeFantasia || cli.razaoSocial}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {cli.codigoCliente} • {cli.cidadeUF || 'RN'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{cli.segmento}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                        {cli.faixaTemperatura}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                          cli.status === 'Ativo'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : cli.status === 'Em Negociação'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
                        }`}
                      >
                        {cli.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      {formatCurrency(cli.faturamentoMensalEstimado || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {cli.tabelaFrete?.tipoCobranca || 'Valor por Ponto'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {cli.gerenteContaResponsavel || 'Jadson Ferreira'}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAddInteraction(cli)}
                          className="p-1.5 text-slate-400 hover:text-[#B38F4F] hover:bg-slate-800 rounded transition-colors"
                          title="Registrar Interação"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cli)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja remover ${cli.nomeFantasia || cli.razaoSocial}?`)) {
                                onDeleteCliente(cli.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ClientFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClienteComProposta}
        initialData={editingClient}
        empregadores={empregadores}
        supervisores={supervisores}
        existingClientsCount={clientes.length}
      />

      <ClientDetailModal
        isOpen={!!selectedDetailClient}
        onClose={() => setSelectedDetailClient(null)}
        cliente={selectedDetailClient}
        empregadores={empregadores}
        supervisores={supervisores}
        userRole={userRole}
        onEdit={handleOpenEdit}
        onAddInteraction={handleOpenAddInteraction}
        onUpdateStatus={handleUpdateStatus}
        onGerarProposta={handleGerarProposta}
      />

      <ClientInteractionModal
        isOpen={!!interactionModalClient}
        onClose={() => setInteractionModalClient(null)}
        cliente={interactionModalClient}
        supervisores={supervisores}
        onSaveInteraction={handleSaveInteraction}
      />

      <PropostaComercialModal
        isOpen={!!propostaClient}
        onClose={() => setPropostaClient(null)}
        cliente={propostaClient}
      />
    </div>
  );
};
