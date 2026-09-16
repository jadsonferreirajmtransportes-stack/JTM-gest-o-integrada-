import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  LayoutGrid,
  List,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  ShieldCheck,
  Calendar,
  Users,
  DollarSign,
  ChevronDown,
  Send,
} from 'lucide-react';
import {
  ProjetoGerencial,
  StatusProjeto,
  CategoriaProjeto,
  PrioridadeProjeto,
  SetorImpactadoProjeto,
  UserRole,
} from '../../types';

interface ProjetosListTabProps {
  projetos: ProjetoGerencial[];
  onSelectProjeto: (p: ProjetoGerencial) => void;
  onEditProjeto: (p: ProjetoGerencial) => void;
  onDeleteProjeto: (id: string) => void;
  onOpenNovoProjeto: () => void;
  onUpdateStatus: (id: string, newStatus: StatusProjeto) => void;
  userRole?: UserRole;
  onOpenResumo?: (p: ProjetoGerencial) => void;
}

export const ProjetosListTab: React.FC<ProjetosListTabProps> = ({
  projetos,
  onSelectProjeto,
  onEditProjeto,
  onDeleteProjeto,
  onOpenNovoProjeto,
  onUpdateStatus,
  userRole = 'admin',
  onOpenResumo,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedPrioridade, setSelectedPrioridade] = useState<string>('todos');
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');

  // Filtered projects
  const filteredProjetos = useMemo(() => {
    return projetos.filter((p) => {
      const matchSearch =
        searchTerm === '' ||
        p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.liderProjetoNome.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategoria = selectedCategoria === 'todos' || p.categoria === selectedCategoria;
      const matchStatus = selectedStatus === 'todos' || p.status === selectedStatus;
      const matchPrioridade = selectedPrioridade === 'todos' || p.prioridade === selectedPrioridade;
      const matchSetor = selectedSetor === 'todos' || p.setorImpactado === selectedSetor;

      return matchSearch && matchCategoria && matchStatus && matchPrioridade && matchSetor;
    });
  }, [projetos, searchTerm, selectedCategoria, selectedStatus, selectedPrioridade, selectedSetor]);

  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Título',
      'Categoria',
      'Status',
      'Prioridade',
      'Setor Impactado',
      'Líder',
      'Data Início',
      'Data Fim',
      'Progresso (%)',
      'Orçamento (R$)',
      'Custo Realizado (R$)',
      'RDC 430',
    ];

    const rows = filteredProjetos.map((p) => [
      `"${p.codigo}"`,
      `"${p.titulo.replace(/"/g, '""')}"`,
      `"${p.categoria}"`,
      `"${p.status}"`,
      `"${p.prioridade}"`,
      `"${p.setorImpactado}"`,
      `"${p.liderProjetoNome}"`,
      `"${p.dataInicio}"`,
      `"${p.dataPrevisaoFim}"`,
      `"${p.progressoPercentual}"`,
      `"${p.orcamentoPrevisto}"`,
      `"${p.custoRealizado}"`,
      `"${p.alinhamentoRDC430 ? 'Sim' : 'Não'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Projetos_Gerenciais_JMT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColors: Record<StatusProjeto, string> = {
    'Planejamento': 'bg-slate-100 text-slate-800 border-slate-300',
    'Em Andamento': 'bg-blue-100 text-blue-800 border-blue-300',
    'Em Revisão': 'bg-amber-100 text-amber-800 border-amber-300',
    'Pausado': 'bg-rose-100 text-rose-800 border-rose-300',
    'Concluído': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Cancelado': 'bg-gray-200 text-gray-700 border-gray-400',
  };

  const priorityColors: Record<PrioridadeProjeto, string> = {
    'Baixa': 'bg-slate-100 text-slate-700 border-slate-200',
    'Média': 'bg-blue-50 text-blue-700 border-blue-200',
    'Alta': 'bg-amber-50 text-amber-800 border-amber-300',
    'Crítica': 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filters, View Modes, Action */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, código, líder ou palavras-chave..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#B38F4F] focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* View Toggles & Export & New Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#8A6A39] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualização em Cartões"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-[#8A6A39] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={onOpenNovoProjeto}
              className="px-4 py-2 bg-[#B38F4F] hover:bg-[#8A6A39] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Projeto</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden font-medium"
            >
              <option value="todos">Todas Categorias</option>
              <option value="Expansão & Novos Hubs">Expansão & Novos Hubs</option>
              <option value="Regulatório & Qualidade RDC 430">Regulatório & RDC 430</option>
              <option value="Inovação & Tecnologia">Inovação & Tecnologia</option>
              <option value="Frota & Sustentabilidade">Frota & Sustentabilidade</option>
              <option value="Comercial & Novos Clientes">Comercial & Clientes</option>
              <option value="Eficiência Operacional & Custos">Eficiência Operacional</option>
              <option value="RH & Treinamento">RH & Treinamento</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden font-medium"
            >
              <option value="todos">Todos os Status</option>
              <option value="Planejamento">Planejamento</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Em Revisão">Em Revisão</option>
              <option value="Pausado">Pausado</option>
              <option value="Concluído">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <select
              value={selectedPrioridade}
              onChange={(e) => setSelectedPrioridade(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden font-medium"
            >
              <option value="todos">Todas as Prioridades</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Crítica">Crítica</option>
            </select>
          </div>

          <div>
            <select
              value={selectedSetor}
              onChange={(e) => setSelectedSetor(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden font-medium"
            >
              <option value="todos">Todos os Setores</option>
              <option value="Todos os Setores">Todos os Setores</option>
              <option value="Farma Aéreo">Farma Aéreo</option>
              <option value="Farma Rodoviário">Farma Rodoviário</option>
              <option value="Departamento Pessoal">Departamento Pessoal</option>
              <option value="Comercial & CRM">Comercial & CRM</option>
              <option value="Garantia da Qualidade & RDC 430">Qualidade & RDC 430</option>
            </select>
          </div>
        </div>
      </div>

      {/* List count summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Exibindo <strong>{filteredProjetos.length}</strong> de {projetos.length} projetos</span>
        {(searchTerm || selectedCategoria !== 'todos' || selectedStatus !== 'todos') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategoria('todos');
              setSelectedStatus('todos');
              setSelectedPrioridade('todos');
              setSelectedSetor('todos');
            }}
            className="text-[#8A6A39] hover:underline font-semibold"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* VIEW MODE 1: GRID / CARDS */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjetos.length === 0 ? (
            <div className="col-span-full p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <FolderKanban className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhum projeto encontrado com os filtros atuais</p>
              <button
                type="button"
                onClick={onOpenNovoProjeto}
                className="px-4 py-2 bg-[#B38F4F] text-white rounded-xl text-xs font-bold hover:bg-[#8A6A39]"
              >
                Criar Novo Projeto
              </button>
            </div>
          ) : (
            filteredProjetos.map((p) => {
              const completedMilestones = p.marcos.filter((m) => m.concluido).length;
              const totalMilestones = p.marcos.length;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-amber-300 transition-all p-5 flex flex-col justify-between space-y-4 group"
                >
                  {/* Card Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-[#8A6A39] border border-amber-200">
                          {p.codigo}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColors[p.prioridade]}`}>
                          {p.prioridade}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[p.status]}`}>
                        {p.status}
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectProjeto(p)}
                      className="text-sm font-bold text-slate-900 group-hover:text-[#5c4526] transition-colors cursor-pointer leading-snug line-clamp-2"
                    >
                      {p.titulo}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {p.descricao}
                    </p>
                  </div>

                  {/* Strategic Attributes */}
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700 truncate max-w-[160px]">{p.categoria}</span>
                      {p.alinhamentoRDC430 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          RDC 430
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Líder: <strong className="text-slate-700">{p.liderProjetoNome}</strong></span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">
                          Marcos: {completedMilestones}/{totalMilestones}
                        </span>
                        <span className="font-mono font-bold text-[#8A6A39]">{p.progressoPercentual}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#B38F4F] h-full rounded-full transition-all duration-300"
                          style={{ width: `${p.progressoPercentual}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Financial & Dates Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Orçamento</span>
                      <span className="font-mono font-bold text-slate-900">
                        {p.orcamentoPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {onOpenResumo && (
                        <button
                          type="button"
                          onClick={() => onOpenResumo(p)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Enviar Resumo do Projeto (WhatsApp / E-mail)"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectProjeto(p)}
                        className="p-1.5 text-slate-400 hover:text-[#B38F4F] hover:bg-amber-50 rounded-lg transition-colors"
                        title="Ver Detalhes 360°"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditProjeto(p)}
                        className="p-1.5 text-slate-400 hover:text-[#B38F4F] hover:bg-amber-50 rounded-lg transition-colors"
                        title="Editar Projeto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {userRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deseja realmente excluir o projeto ${p.codigo} - ${p.titulo}?`)) {
                              onDeleteProjeto(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Projeto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Código / Projeto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Líder & Setor</th>
                  <th className="py-3 px-4">Progresso</th>
                  <th className="py-3 px-4">Orçamento</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProjetos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#8A6A39] bg-amber-50 px-1.5 py-0.5 rounded">
                          {p.codigo}
                        </span>
                        <span
                          onClick={() => onSelectProjeto(p)}
                          className="font-bold text-slate-900 hover:text-[#8A6A39] cursor-pointer line-clamp-1"
                        >
                          {p.titulo}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {p.categoria}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColors[p.prioridade]}`}>
                        {p.prioridade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-bold text-slate-800 block truncate max-w-[140px]">{p.liderProjetoNome}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{p.setorImpactado}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#B38F4F] h-full rounded-full" style={{ width: `${p.progressoPercentual}%` }} />
                        </div>
                        <span className="font-mono font-bold text-[#8A6A39] text-[11px]">{p.progressoPercentual}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {p.orcamentoPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {onOpenResumo && (
                          <button
                            type="button"
                            onClick={() => onOpenResumo(p)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                            title="Enviar Resumo do Projeto (WhatsApp / E-mail)"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectProjeto(p)}
                          className="p-1 text-slate-400 hover:text-[#B38F4F] rounded-md"
                          title="Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditProjeto(p)}
                          className="p-1 text-slate-400 hover:text-[#B38F4F] rounded-md"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Excluir projeto ${p.codigo}?`)) {
                                onDeleteProjeto(p.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
};
