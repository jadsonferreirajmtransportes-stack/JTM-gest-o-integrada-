import React, { useState } from 'react';
import {
  Plus,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  FolderKanban,
  Filter,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { ProjetoGerencial, TarefaKanban, ColunaKanban } from '../../types';

interface ProjetosKanbanTabProps {
  projetos: ProjetoGerencial[];
  onUpdateProjeto: (projeto: ProjetoGerencial) => void;
  onSelectProjeto: (projeto: ProjetoGerencial) => void;
}

const COLUMNS: { id: ColunaKanban; title: string; color: string; badgeBg: string }[] = [
  { id: 'backlog', title: '1. Backlog & Ideação', color: 'border-slate-300', badgeBg: 'bg-slate-200 text-slate-700' },
  { id: 'a_fazer', title: '2. A Fazer (Sprint)', color: 'border-blue-400', badgeBg: 'bg-blue-100 text-blue-800' },
  { id: 'em_andamento', title: '3. Em Execução', color: 'border-purple-400', badgeBg: 'bg-purple-100 text-purple-800' },
  { id: 'revisao', title: '4. Validação & QA', color: 'border-amber-400', badgeBg: 'bg-amber-100 text-amber-800' },
  { id: 'concluido', title: '5. Concluído & Homologado', color: 'border-emerald-400', badgeBg: 'bg-emerald-100 text-emerald-800' },
];

export const ProjetosKanbanTab: React.FC<ProjetosKanbanTabProps> = ({
  projetos,
  onUpdateProjeto,
  onSelectProjeto,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('todos');
  const [selectedPriority, setSelectedPriority] = useState<string>('todos');

  // New quick task form
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string>(projetos[0]?.id || '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskResp, setNewTaskResp] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState<ColunaKanban>('a_fazer');
  const [newTaskPriority, setNewTaskPriority] = useState<'Baixa' | 'Média' | 'Alta' | 'Urgente'>('Alta');

  // Flatten tasks with parent project info
  const allTasks = projetos.flatMap((p) =>
    (p.tarefas || []).map((t) => ({
      ...t,
      projetoId: p.id,
      projetoCodigo: p.codigo,
      projetoTitulo: p.titulo,
      projetoObj: p,
    }))
  );

  const filteredTasks = allTasks.filter((t) => {
    const matchProject = selectedProjectId === 'todos' || t.projetoId === selectedProjectId;
    const matchPriority = selectedPriority === 'todos' || t.prioridade === selectedPriority;
    return matchProject && matchPriority;
  });

  const handleMoveTask = (
    taskId: string,
    projetoObj: ProjetoGerencial,
    newCol: ColunaKanban
  ) => {
    const updatedTasks = (projetoObj.tarefas || []).map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          coluna: newCol,
          concluida: newCol === 'concluido',
          dataConclusao: newCol === 'concluido' ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return t;
    });

    const updated = {
      ...projetoObj,
      tarefas: updatedTasks,
      atualizadoEm: new Date().toISOString(),
    };
    onUpdateProjeto(updated);
  };

  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !targetProjectId) return;

    const targetProj = projetos.find((p) => p.id === targetProjectId);
    if (!targetProj) return;

    const newTask: TarefaKanban = {
      id: `t-${Date.now()}`,
      titulo: newTaskTitle.trim(),
      coluna: newTaskColumn,
      responsavel: newTaskResp.trim() || targetProj.liderProjetoNome,
      prioridade: newTaskPriority,
      concluida: newTaskColumn === 'concluido',
      dataLimite: targetProj.dataPrevisaoFim,
    };

    const updated = {
      ...targetProj,
      tarefas: [...(targetProj.tarefas || []), newTask],
      atualizadoEm: new Date().toISOString(),
    };
    onUpdateProjeto(updated);

    setNewTaskTitle('');
    setNewTaskResp('');
    setIsQuickAddOpen(false);
  };

  const getNextColumn = (current: ColunaKanban): ColunaKanban | null => {
    const order: ColunaKanban[] = ['backlog', 'a_fazer', 'em_andamento', 'revisao', 'concluido'];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const getPrevColumn = (current: ColunaKanban): ColunaKanban | null => {
    const order: ColunaKanban[] = ['backlog', 'a_fazer', 'em_andamento', 'revisao', 'concluido'];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  };

  return (
    <div className="space-y-4">
      {/* Filter and Action Header */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Filtrar Quadro por:</span>
          </div>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden max-w-xs"
          >
            <option value="todos">Todos os Projetos ({projetos.length})</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} - {p.titulo}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="todos">Todas Prioridades</option>
            <option value="Baixa">Baixa</option>
            <option value="Média">Média</option>
            <option value="Alta">Alta</option>
            <option value="Urgente">Urgente</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
          className="px-3.5 py-2 bg-[#B38F4F] hover:bg-[#8A6A39] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Ação / Tarefa</span>
        </button>
      </div>

      {/* Quick Add Collapse Bar */}
      {isQuickAddOpen && (
        <form
          onSubmit={handleCreateQuickTask}
          className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl shadow-xs space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#5c4526] flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#8A6A39]" />
              Adicionar Nova Tarefa ao Quadro Kanban
            </h4>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="text-xs text-[#8A6A39] hover:underline"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="sm:col-span-2 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800"
            >
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} - {p.titulo}
                </option>
              ))}
            </select>

            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="O que precisa ser feito?"
              className="sm:col-span-2 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
            />

            <input
              type="text"
              value={newTaskResp}
              onChange={(e) => setNewTaskResp(e.target.value)}
              placeholder="Responsável"
              className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-[#5c4526]">Coluna Inicial:</span>
              <select
                value={newTaskColumn}
                onChange={(e) => setNewTaskColumn(e.target.value as ColunaKanban)}
                className="px-2 py-1 bg-white border border-amber-300 rounded-md text-xs font-medium"
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 bg-[#8A6A39] hover:bg-[#8A6A39] text-white font-bold text-xs rounded-lg shadow-xs"
            >
              Confirmar e Inserir
            </button>
          </div>
        </form>
      )}

      {/* 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-start">
        {COLUMNS.map((col) => {
          const tasksInCol = filteredTasks.filter((t) => t.coluna === col.id);

          return (
            <div
              key={col.id}
              className={`bg-slate-100/90 rounded-2xl border ${col.color} p-3 flex flex-col space-y-3 min-h-[480px] shadow-2xs`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-xs text-slate-800 tracking-tight">{col.title}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                  {tasksInCol.length}
                </span>
              </div>

              {/* Tasks List inside Column */}
              <div className="space-y-2.5 flex-1">
                {tasksInCol.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-center p-3 text-slate-400 text-xs italic border border-dashed border-slate-300 rounded-xl">
                    Nenhuma ação nesta etapa
                  </div>
                ) : (
                  tasksInCol.map((task) => {
                    const prevCol = getPrevColumn(task.coluna);
                    const nextCol = getNextColumn(task.coluna);

                    return (
                      <div
                        key={task.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-2 group"
                      >
                        {/* Task Project Tag */}
                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            onClick={() => onSelectProjeto(task.projetoObj)}
                            className="font-mono font-bold text-[#8A6A39] bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            {task.projetoCodigo}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold ${
                              task.prioridade === 'Urgente' || task.prioridade === 'Alta'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {task.prioridade}
                          </span>
                        </div>

                        {/* Title */}
                        <p className="text-xs font-semibold text-slate-900 leading-snug">
                          {task.titulo}
                        </p>

                        {/* Assignee & Dates */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1 font-medium text-slate-700 truncate max-w-[120px]">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            {task.responsavel}
                          </span>
                          {task.concluida && (
                            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              OK
                            </span>
                          )}
                        </div>

                        {/* Fast Move Buttons */}
                        <div className="flex items-center justify-between pt-1 text-[10px] border-t border-slate-100">
                          {prevCol ? (
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task.id, task.projetoObj, prevCol)}
                              className="text-slate-400 hover:text-[#8A6A39] flex items-center gap-0.5 font-medium"
                              title="Voltar etapa"
                            >
                              <ArrowLeft className="w-3 h-3" />
                              Voltar
                            </button>
                          ) : (
                            <span />
                          )}

                          {nextCol ? (
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task.id, task.projetoObj, nextCol)}
                              className="text-[#8A6A39] hover:text-[#5c4526] flex items-center gap-0.5 font-bold ml-auto"
                              title="Avançar etapa"
                            >
                              Avançar
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold ml-auto">Entregue</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
