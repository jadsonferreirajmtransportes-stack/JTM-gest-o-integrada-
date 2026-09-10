import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  UserX,
  Download,
  FileSpreadsheet,
  Grid,
  List,
  Stethoscope,
  FileWarning,
  CheckCircle2,
  Building2,
  DollarSign,
  Phone,
  Mail,
  Printer,
} from 'lucide-react';
import { Colaborador, Empregador, Supervisor, UserRole } from '../../types';
import {
  formatDate,
  formatMoney,
  calcCustoMensalTotal,
  calcExamStatus,
  calcDaysRemaining,
  formatDaysCountdown,
} from '../../utils/formatters';
import { exportColaboradoresReport } from '../../utils/exportUtils';

interface EmployeeListProps {
  colaboradores: Colaborador[];
  empregadores: Empregador[];
  supervisores: Supervisor[];
  userRole: UserRole;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNovo: () => void;
  onSelectColaborador: (c: Colaborador) => void;
  onEditColaborador: (c: Colaborador) => void;
  onDeleteColaborador: (id: string) => void;
  onOpenDemissaoModal: (c: Colaborador) => void;
  onOpenProgramarFerias: (c: Colaborador) => void;
  onOpenRegistrarOcorrencia: (c: Colaborador) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  colaboradores,
  empregadores,
  supervisores,
  userRole,
  searchQuery,
  onSearchChange,
  onOpenNovo,
  onSelectColaborador,
  onEditColaborador,
  onDeleteColaborador,
  onOpenDemissaoModal,
  onOpenProgramarFerias,
  onOpenRegistrarOcorrencia,
}) => {
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedEmpregador, setSelectedEmpregador] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Extract unique sectors
  const setoresUnicos = useMemo(() => {
    const s = new Set<string>();
    colaboradores.forEach((c) => {
      if (c.setor) s.add(c.setor);
    });
    return Array.from(s).sort();
  }, [colaboradores]);

  // Filtered employees
  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter((c) => {
      // Sector
      if (selectedSetor !== 'todos' && c.setor !== selectedSetor) return false;
      // Status
      if (selectedStatus !== 'todos' && c.status !== selectedStatus) return false;
      // Employer
      if (selectedEmpregador !== 'todos' && c.empregadorId !== selectedEmpregador) return false;
      // Search
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = c.nomeCompleto?.toLowerCase().includes(q);
        const matchMatricula = c.codigoMatricula?.toLowerCase().includes(q);
        const matchCpf = c.cpf?.toLowerCase().includes(q);
        const matchCargo = c.funcaoCargo?.toLowerCase().includes(q);
        const matchSetor = c.setor?.toLowerCase().includes(q);
        if (!matchName && !matchMatricula && !matchCpf && !matchCargo && !matchSetor) {
          return false;
        }
      }
      return true;
    });
  }, [colaboradores, selectedSetor, selectedStatus, selectedEmpregador, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Control Bar: Filters, Search, Export, and Add */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Sector Filter */}
          <select
            value={selectedSetor}
            onChange={(e) => setSelectedSetor(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="todos">Todos os Setores</option>
            {setoresUnicos.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="todos">Todos os Status</option>
            <option value="Ativo">Ativo</option>
            <option value="Férias">Férias</option>
            <option value="Afastado">Afastado</option>
            <option value="Inativo">Inativo (Demitidos)</option>
          </select>

          {/* Employer Filter */}
          {empregadores.length > 1 && (
            <select
              value={selectedEmpregador}
              onChange={(e) => setSelectedEmpregador(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
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

        {/* Action Group: View Toggle, Export, New */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
              title="Visualização em Cartões"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Export Buttons */}
          <button
            type="button"
            onClick={() => exportColaboradoresReport(filteredColaboradores, 'xlsx')}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Exportar para Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            onClick={() => exportColaboradoresReport(filteredColaboradores, 'csv')}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Exportar CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {userRole === 'admin' && (
            <button
              id="employee-list-add-btn"
              type="button"
              onClick={onOpenNovo}
              className="px-3.5 py-1.5 bg-[#B38F4F] hover:opacity-90 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cadastro</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Mostrando <strong>{filteredColaboradores.length}</strong> colaborador(es)
          {selectedStatus !== 'todos' && ` com status "${selectedStatus}"`}
        </span>
        <span>JMT Departamento Pessoal</span>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-3">Cargo / Setor</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Remuneração Base</th>
                  <th className="py-3 px-3">Custo Total Mês (2.11)</th>
                  <th className="py-3 px-3">Exame ASO (RDC 430)</th>
                  <th className="py-3 px-3">Documentos</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredColaboradores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nenhum colaborador encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredColaboradores.map((colab) => {
                    const examStatus = calcExamStatus(colab.dataVencimentoExame);
                    const examDays = calcDaysRemaining(colab.dataVencimentoExame);
                    const examCountdown = formatDaysCountdown(examDays);
                    const custoTotal = calcCustoMensalTotal(
                      colab.remuneracao,
                      colab.gratificacao,
                      colab.vtValorTarifa,
                      colab.vtQuantidadeTarifasDia,
                      colab.valorValeAlimentacaoDia
                    );

                    const docsPendentes = colab.documentos?.filter((d) => d.status === 'Pendente').length || 0;

                    return (
                      <tr
                        key={colab.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Colaborador */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{colab.nomeCompleto}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                              {colab.codigoMatricula}
                            </span>
                            <span>CPF: {colab.cpf}</span>
                          </div>
                        </td>

                        {/* Cargo / Setor */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{colab.funcaoCargo}</div>
                          <div className="text-[11px] text-slate-500">{colab.setor}</div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              colab.status === 'Ativo'
                                ? 'bg-emerald-100 text-emerald-800'
                                : colab.status === 'Férias'
                                ? 'bg-blue-100 text-blue-800'
                                : colab.status === 'Afastado'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {colab.status}
                          </span>
                          {colab.dataDemissao && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Demissão: {formatDate(colab.dataDemissao)}
                            </div>
                          )}
                        </td>

                        {/* Remuneração */}
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {formatMoney(colab.remuneracao)}
                          {colab.gratificacao > 0 && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              + {formatMoney(colab.gratificacao)} grat.
                            </div>
                          )}
                        </td>

                        {/* Custo Total Mês */}
                        <td className="py-3 px-3 font-extrabold text-amber-900">
                          {colab.status === 'Inativo' ? '-' : formatMoney(custoTotal)}
                          {colab.status !== 'Inativo' && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              Salário + VT + VA
                            </div>
                          )}
                        </td>

                        {/* Exame ASO RDC 430 */}
                        <td className="py-3 px-3">
                          <div className="text-[11px] font-medium text-slate-700">
                            {formatDate(colab.dataVencimentoExame)}
                          </div>
                          <span
                            className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${examCountdown.bgClass}`}
                          >
                            {examCountdown.text}
                          </span>
                        </td>

                        {/* Documentação */}
                        <td className="py-3 px-3">
                          {docsPendentes === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Completo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <FileWarning className="w-3 h-3 text-amber-600" />
                              {docsPendentes} Pendente{docsPendentes > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Profile */}
                            <button
                              type="button"
                              onClick={() => onSelectColaborador(colab)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Visualizar Ficha Cadastral Completa"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Schedule Vacation */}
                            {userRole !== 'colaborador' && colab.status !== 'Inativo' && (
                              <button
                                type="button"
                                onClick={() => onOpenProgramarFerias(colab)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Programar Férias CLT"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                            )}

                            {/* Register Occurrence */}
                            {userRole !== 'colaborador' && colab.status !== 'Inativo' && (
                              <button
                                type="button"
                                onClick={() => onOpenRegistrarOcorrencia(colab)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Registrar Ocorrência"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Edit (Admin only) */}
                            {userRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => onEditColaborador(colab)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Editar Cadastro"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Dismissal / Inactivation (Admin only) */}
                            {userRole === 'admin' && colab.status !== 'Inativo' && (
                              <button
                                type="button"
                                onClick={() => onOpenDemissaoModal(colab)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Inativar / Registrar Demissão"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete (Admin only) */}
                            {userRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Tem certeza que deseja excluir o cadastro de ${colaboradorFullName(colab)}?`
                                    )
                                  ) {
                                    onDeleteColaborador(colab.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir Definitivamente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredColaboradores.map((colab) => {
            const custoTotal = calcCustoMensalTotal(
              colab.remuneracao,
              colab.gratificacao,
              colab.vtValorTarifa,
              colab.vtQuantidadeTarifasDia,
              colab.valorValeAlimentacaoDia
            );
            const examDays = calcDaysRemaining(colab.dataVencimentoExame);
            const examCountdown = formatDaysCountdown(examDays);
            const docsPendentes = colab.documentos?.filter((d) => d.status === 'Pendente').length || 0;

            return (
              <div
                key={colab.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                        {colab.codigoMatricula}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1 leading-tight">
                        {colab.nomeCompleto}
                      </h3>
                      <p className="text-xs text-slate-500">{colab.funcaoCargo}</p>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        colab.status === 'Ativo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : colab.status === 'Férias'
                          ? 'bg-blue-100 text-blue-800'
                          : colab.status === 'Afastado'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {colab.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Setor:</span>
                      <span className="font-medium text-slate-800">{colab.setor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Admissão:</span>
                      <span>{formatDate(colab.dataAdmissao)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Remuneração Base:</span>
                      <span className="font-bold text-slate-900">
                        {formatMoney(colab.remuneracao)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Custo Total Mês:</span>
                      <span className="font-extrabold text-amber-900">
                        {formatMoney(custoTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-400">Exame ASO:</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${examCountdown.bgClass}`}
                      >
                        {examCountdown.text}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Documentação:</span>
                      {docsPendentes === 0 ? (
                        <span className="text-[10px] text-emerald-700 font-semibold">100% OK</span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold">
                          {docsPendentes} Pendente{docsPendentes > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectColaborador(colab)}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Ficha</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => onEditColaborador(colab)}
                        className="p-1 text-slate-500 hover:text-slate-800 rounded"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {userRole === 'admin' && colab.status !== 'Inativo' && (
                      <button
                        type="button"
                        onClick={() => onOpenDemissaoModal(colab)}
                        className="p-1 text-slate-500 hover:text-rose-600 rounded"
                        title="Demitir / Inativar"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function colaboradorFullName(c: Colaborador): string {
  return c.nomeCompleto || 'Colaborador';
}
