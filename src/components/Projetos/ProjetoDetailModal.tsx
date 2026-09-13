import React, { useState } from 'react';
import {
  X,
  Printer,
  FolderKanban,
  Calendar,
  DollarSign,
  Users,
  Flag,
  ShieldCheck,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  Briefcase,
  Target,
  Edit3,
  TrendingUp,
  MessageSquare,
  FileText,
  Sparkles,
  Send,
  Paperclip,
} from 'lucide-react';
import {
  ProjetoGerencial,
  StatusProjeto,
  MarcoProjeto,
  TarefaKanban,
  RiscoProjeto,
  AtualizacaoProjeto,
  UserRole,
} from '../../types';
import { ProjetoAnexosSection, getFileIcon, getFileCategoryBadgeColor } from './ProjetoAnexosSection';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

interface ProjetoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projeto: ProjetoGerencial | null;
  onEdit: (projeto: ProjetoGerencial) => void;
  onUpdateProjeto: (projeto: ProjetoGerencial) => void;
  userRole?: UserRole;
  onOpenResumo?: (projeto: ProjetoGerencial) => void;
}

export const ProjetoDetailModal: React.FC<ProjetoDetailModalProps> = ({
  isOpen,
  onClose,
  projeto,
  onEdit,
  onUpdateProjeto,
  userRole = 'admin',
  onOpenResumo,
}) => {
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'marcos' | 'kanban' | 'financeiro' | 'riscos' | 'atualizacoes' | 'documentos'>('visao_geral');
  
  // New task input inside detail modal
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState('');
  const [novaTarefaResp, setNovaTarefaResp] = useState('');
  const [novaTarefaColuna, setNovaTarefaColuna] = useState<'backlog' | 'a_fazer' | 'em_andamento' | 'revisao' | 'concluido'>('a_fazer');

  // New update feed input
  const [novoStatusFeedTitulo, setNovoStatusFeedTitulo] = useState('');
  const [novoStatusFeedDesc, setNovoStatusFeedDesc] = useState('');

  if (!isOpen || !projeto) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleToggleMarco = (marcoId: string) => {
    const updatedMarcos = projeto.marcos.map((m) => {
      if (m.id === marcoId) {
        const nextConcluido = !m.concluido;
        return {
          ...m,
          concluido: nextConcluido,
          dataConclusao: nextConcluido ? new Date().toISOString().split('T')[0] : undefined,
          status: (nextConcluido ? 'Concluído' : 'Em Andamento') as MarcoProjeto['status'],
        };
      }
      return m;
    });

    // Auto-calculate progress percent based on milestones if present
    const completedCount = updatedMarcos.filter((m) => m.concluido).length;
    const autoProgress = updatedMarcos.length > 0 ? Math.round((completedCount / updatedMarcos.length) * 100) : projeto.progressoPercentual;

    const updated = {
      ...projeto,
      marcos: updatedMarcos,
      progressoPercentual: autoProgress,
      atualizadoEm: new Date().toISOString(),
    };
    onUpdateProjeto(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTarefaTitulo.trim()) return;

    const newTask: TarefaKanban = {
      id: `t-${Date.now()}`,
      titulo: novaTarefaTitulo.trim(),
      coluna: novaTarefaColuna,
      responsavel: novaTarefaResp.trim() || projeto.liderProjetoNome,
      prioridade: 'Alta',
      concluida: novaTarefaColuna === 'concluido',
      dataLimite: projeto.dataPrevisaoFim,
    };

    const updated = {
      ...projeto,
      tarefas: [...(projeto.tarefas || []), newTask],
      atualizadoEm: new Date().toISOString(),
    };
    onUpdateProjeto(updated);
    setNovaTarefaTitulo('');
    setNovaTarefaResp('');
  };

  const handleMoveTask = (taskId: string, newColuna: TarefaKanban['coluna']) => {
    const updatedTasks = (projeto.tarefas || []).map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          coluna: newColuna,
          concluida: newColuna === 'concluido',
          dataConclusao: newColuna === 'concluido' ? new Date().toISOString().split('T')[0] : undefined,
        };
      }
      return t;
    });

    const updated = {
      ...projeto,
      tarefas: updatedTasks,
      atualizadoEm: new Date().toISOString(),
    };
    onUpdateProjeto(updated);
  };

  const handleAddStatusFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoStatusFeedTitulo.trim() || !novoStatusFeedDesc.trim()) return;

    const newUpdate: AtualizacaoProjeto = {
      id: `att-${Date.now()}`,
      data: new Date().toISOString(),
      autor: userRole === 'admin' ? 'Diretoria / Gestão de Projetos' : projeto.liderProjetoNome,
      titulo: novoStatusFeedTitulo.trim(),
      descricao: novoStatusFeedDesc.trim(),
      tipo: 'Status',
    };

    const updated = {
      ...projeto,
      atualizacoes: [newUpdate, ...(projeto.atualizacoes || [])],
      atualizadoEm: new Date().toISOString(),
    };
    onUpdateProjeto(updated);
    setNovoStatusFeedTitulo('');
    setNovoStatusFeedDesc('');
  };

  const statusColors: Record<StatusProjeto, string> = {
    'Planejamento': 'bg-slate-100 text-slate-800 border-slate-300',
    'Em Andamento': 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
    'Em Revisão': 'bg-amber-100 text-amber-800 border-amber-300',
    'Pausado': 'bg-rose-100 text-rose-800 border-rose-300',
    'Concluído': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Cancelado': 'bg-gray-200 text-gray-700 border-gray-400',
  };

  const saldo = projeto.orcamentoPrevisto - projeto.custoRealizado;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Bar */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-purple-700 border border-slate-200">
                  {projeto.codigo}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors[projeto.status]}`}>
                  {projeto.status}
                </span>
                {projeto.alinhamentoRDC430 && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" />
                    RDC 430/2020
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5 truncate max-w-xl">
                {projeto.titulo}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenResumo && (
              <button
                type="button"
                onClick={() => onOpenResumo(projeto)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Disparar resumo e alinhamento do projeto via WhatsApp e E-mail"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Resumo</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
              title="Imprimir Ficha Executiva do Projeto"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir Ficha</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(projeto);
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="print:hidden flex items-center gap-1 px-6 pt-2.5 border-b border-slate-200 bg-slate-50 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('visao_geral')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'visao_geral'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            Visão Geral 360°
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('marcos')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'marcos'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flag className="w-4 h-4" />
            Marcos & Prazos ({projeto.marcos.filter((m) => m.concluido).length}/{projeto.marcos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'kanban'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-4 h-4" />
            Plano de Ação / Kanban ({projeto.tarefas?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'financeiro'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Financeiro & ROI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riscos')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'riscos'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Riscos ({projeto.riscos?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documentos')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'documentos'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            Anexos & Documentos ({projeto.documentos?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('atualizacoes')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'atualizacoes'
                ? 'border-purple-600 text-purple-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Histórico ({projeto.atualizacoes?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="jmt-print-doc flex-1 overflow-y-auto p-6 space-y-6">
          <PrintDocumentHeader
            titulo="FICHA EXECUTIVA DE PROJETO"
            subtitulo={`${projeto.status} — ${projeto.codigo}`}
            metadados={projeto.titulo}
          />
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'visao_geral' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Top Banner with Progress & Quick KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase">Progresso Geral</span>
                  <div className="my-2">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-2xl font-black text-purple-700 font-mono">
                        {projeto.progressoPercentual}%
                      </span>
                      <span className="text-xs text-purple-600 font-semibold">
                        {projeto.marcos.filter((m) => m.concluido).length} de {projeto.marcos.length} marcos
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${projeto.progressoPercentual}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-purple-700">Meta: {projeto.dataPrevisaoFim}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">Orçamento Total</span>
                  <span className="text-xl font-bold text-slate-900 font-mono my-1">
                    {projeto.orcamentoPrevisto.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Tipo: <span className="font-semibold text-slate-700">{projeto.tipoInvestimento || 'OPEX'}</span>
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">Custo Realizado</span>
                  <span className="text-xl font-bold text-slate-900 font-mono my-1">
                    {projeto.custoRealizado.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      saldo >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    Saldo: {saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">Líder & Setor</span>
                  <div className="my-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{projeto.liderProjetoNome}</p>
                    <p className="text-[11px] text-slate-500 truncate">{projeto.liderCargo}</p>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium inline-block truncate">
                    {projeto.setorImpactado}
                  </span>
                </div>
              </div>

              {/* Quick Share / Enviar Resumo Executivo Card */}
              {onOpenResumo && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-purple-50 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Compartilhar Resumo do Projeto (WhatsApp & E-mail)
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Envie o status report com progresso ({projeto.progressoPercentual}%), marcos e finanças para a diretoria, líderes e equipe com 1 clique.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenResumo(projeto)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Disparar Resumo</span>
                  </button>
                </div>
              )}

              {/* Scope & Description */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  Escopo e Descrição do Projeto
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {projeto.descricao || 'Nenhuma descrição detalhada informada.'}
                </p>
                {projeto.objetivoEstrategico && (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-800 block">
                        Objetivo Estratégico & OKR
                      </span>
                      <span className="text-xs font-medium text-indigo-950">
                        {projeto.objetivoEstrategico}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Team Section */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Comitê & Membros da Equipe Envolvidos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {projeto.equipeMembros && projeto.equipeMembros.length > 0 ? (
                    projeto.equipeMembros.map((membro, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg text-xs bg-slate-100 text-slate-800 border border-slate-200 font-medium flex items-center gap-1.5"
                      >
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        {membro}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">Nenhum membro listado.</span>
                  )}
                </div>
              </div>

              {/* Strategic KPIs if any */}
              {projeto.kpis && projeto.kpis.length > 0 && (
                <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    Indicadores-Chave de Desempenho (KPIs do Projeto)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projeto.kpis.map((kpi) => (
                      <div
                        key={kpi.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{kpi.nome}</p>
                          <p className="text-[11px] text-slate-500">
                            Meta: <span className="font-semibold text-slate-700">{kpi.meta}</span> • Atual:{' '}
                            <span className="font-bold text-purple-700">{kpi.atual}</span>
                          </p>
                        </div>
                        {kpi.atingido ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Atingido
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Em Progresso
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments quick-access widget */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Documentação & Anexos do Projeto ({projeto.documentos?.length || 0})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('documentos')}
                    className="text-xs text-purple-600 hover:text-purple-800 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Ver todos / Anexar</span>
                    <span>→</span>
                  </button>
                </div>

                {(!projeto.documentos || projeto.documentos.length === 0) ? (
                  <div className="p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">
                      Nenhum anexo ou laudo foi adicionado a este projeto ainda.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('documentos')}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Anexar Primeiro Arquivo</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {projeto.documentos.slice(0, 3).map((doc) => {
                      const iconMeta = getFileIcon(doc.nome, doc.tipo);
                      const IconComp = iconMeta.icon;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setActiveTab('documentos')}
                          className="p-3 bg-slate-50 hover:bg-purple-50/50 rounded-xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer flex items-center gap-3"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconMeta.bgColor} ${iconMeta.color}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate" title={doc.nome}>
                              {doc.nome}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className="truncate">{doc.categoria || 'Anexo'}</span>
                              {doc.tamanho && <span>• {doc.tamanho}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MARCOS & PRAZOS */}
          {activeTab === 'marcos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Marcos Críticos e Entregáveis</h3>
                  <p className="text-xs text-slate-500">
                    Clique no checkbox para marcar o marco como concluído e atualizar o progresso automaticamente
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {projeto.marcos.map((marco, index) => (
                  <div
                    key={marco.id}
                    onClick={() => handleToggleMarco(marco.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      marco.concluido
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-white border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${
                          marco.concluido
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-500 border border-slate-300'
                        }`}
                      >
                        {marco.concluido ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            marco.concluido ? 'line-through text-slate-500' : 'text-slate-800'
                          }`}
                        >
                          {marco.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Data Limite: <span className="font-semibold text-slate-700">{marco.dataLimite}</span> •
                          Responsável: <span className="font-semibold text-slate-700">{marco.responsavel || projeto.liderProjetoNome}</span>
                          {marco.dataConclusao && (
                            <span className="text-emerald-700 ml-1.5 font-bold">
                              (Concluído em {marco.dataConclusao})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        marco.concluido
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {marco.concluido ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PLANO DE AÇÃO / KANBAN */}
          {activeTab === 'kanban' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Add Task bar */}
              <form onSubmit={handleAddTask} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Adicionar Ação / Tarefa ao Projeto:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    required
                    value={novaTarefaTitulo}
                    onChange={(e) => setNovaTarefaTitulo(e.target.value)}
                    placeholder="Descrição da ação..."
                    className="sm:col-span-2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <input
                    type="text"
                    value={novaTarefaResp}
                    onChange={(e) => setNovaTarefaResp(e.target.value)}
                    placeholder="Responsável"
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <div className="flex gap-2">
                    <select
                      value={novaTarefaColuna}
                      onChange={(e) => setNovaTarefaColuna(e.target.value as any)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="a_fazer">A Fazer</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="revisao">Revisão</option>
                      <option value="concluido">Concluído</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 shrink-0"
                    >
                      + Criar
                    </button>
                  </div>
                </div>
              </form>

              {/* 4 Mini Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {(['a_fazer', 'em_andamento', 'revisao', 'concluido'] as const).map((col) => {
                  const tasksInCol = (projeto.tarefas || []).filter((t) => t.coluna === col);
                  const titles: Record<string, string> = {
                    a_fazer: 'A Fazer',
                    em_andamento: 'Em Andamento',
                    revisao: 'Revisão / Validação',
                    concluido: 'Concluído',
                  };

                  return (
                    <div key={col} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col space-y-2 min-h-[160px]">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-700">{titles[col]}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                          {tasksInCol.length}
                        </span>
                      </div>

                      <div className="space-y-2 flex-1">
                        {tasksInCol.map((task) => (
                          <div
                            key={task.id}
                            className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs space-y-1.5"
                          >
                            <p className="font-semibold text-slate-800 leading-snug">{task.titulo}</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>Resp: {task.responsavel}</span>
                              <span className="font-bold text-purple-700">{task.prioridade}</span>
                            </div>

                            {/* Move controls */}
                            <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[10px]">
                              {col !== 'a_fazer' && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveTask(task.id, 'a_fazer')}
                                  className="text-slate-400 hover:text-purple-600"
                                >
                                  ← A Fazer
                                </button>
                              )}
                              {col !== 'concluido' && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveTask(task.id, col === 'a_fazer' ? 'em_andamento' : col === 'em_andamento' ? 'revisao' : 'concluido')}
                                  className="text-purple-600 hover:text-purple-800 font-bold ml-auto"
                                >
                                  Avançar →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: FINANCEIRO & ROI */}
          {activeTab === 'financeiro' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Orçado Previsto</span>
                  <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                    {projeto.orcamentoPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Executado Real</span>
                  <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                    {projeto.custoRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Economia / Saldo</span>
                  <p
                    className={`text-xl font-bold font-mono mt-1 ${
                      saldo >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              {/* ROI and Return Section */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5 uppercase">
                  <TrendingUp className="w-4 h-4 text-purple-700" />
                  Retorno sobre Investimento (ROI) e Ganhos Operacionais
                </h4>
                <p className="text-xs text-purple-950 font-medium">
                  {projeto.retornoEsperadoDescricao || 'Retorno direto em conformidade regulatória e atração comercial.'}
                </p>
                <div className="flex items-center gap-4 text-xs text-purple-800 pt-1">
                  <span>
                    Payback Estimado: <strong className="font-mono">{projeto.roiEstimadoMeses || 6} meses</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Classificação: <strong>{projeto.tipoInvestimento || 'OPEX'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RISCOS */}
          {activeTab === 'riscos' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-900">Matriz de Riscos & Contingências</h3>
              {(!projeto.riscos || projeto.riscos.length === 0) ? (
                <p className="text-xs text-slate-400 italic">Nenhum risco cadastrado para este projeto.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projeto.riscos.map((risco) => (
                    <div
                      key={risco.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{risco.descricao}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            risco.impacto === 'Alto'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          Prob: {risco.probabilidade} | Imp: {risco.impacto}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <strong className="text-slate-800">Plano de Mitigação:</strong> {risco.planoMitigacao}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ATUALIZAÇÕES & HISTÓRICO */}
          {activeTab === 'atualizacoes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <form onSubmit={handleAddStatusFeed} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Registrar Novo Ponto de Controle / Atualização:</span>
                <input
                  type="text"
                  required
                  value={novoStatusFeedTitulo}
                  onChange={(e) => setNovoStatusFeedTitulo(e.target.value)}
                  placeholder="Título do status (ex: Vistoria concluída sem desvios)..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={novoStatusFeedDesc}
                    onChange={(e) => setNovoStatusFeedDesc(e.target.value)}
                    placeholder="Detalhamento técnico / operacional..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 shrink-0"
                  >
                    Publicar
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {(!projeto.atualizacoes || projeto.atualizacoes.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma atualização registrada ainda.</p>
                ) : (
                  projeto.atualizacoes.map((att) => (
                    <div key={att.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{att.titulo}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(att.data).toLocaleDateString('pt-BR')} {new Date(att.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{att.descricao}</p>
                      <span className="text-[10px] text-purple-700 font-medium block">
                        Por: {att.autor}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: ANEXOS & DOCUMENTOS DO PROJETO */}
          {activeTab === 'documentos' && (
            <ProjetoAnexosSection
              projeto={projeto}
              onUpdateProjeto={onUpdateProjeto}
              userRole={userRole}
            />
          )}
          <PrintDocumentFooter />
        </div>

        {/* Footer */}
        <div className="print:hidden px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Criado em: {new Date(projeto.criadoEm || '').toLocaleDateString('pt-BR')}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
