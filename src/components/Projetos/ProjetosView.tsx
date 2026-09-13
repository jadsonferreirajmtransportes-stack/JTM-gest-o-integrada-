import React, { useState } from 'react';
import {
  FolderKanban,
  LayoutDashboard,
  List,
  Target,
  Calendar,
  DollarSign,
  AlertTriangle,
  Plus,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Building2,
  TrendingUp,
} from 'lucide-react';
import {
  ProjetoGerencial,
  StatusProjeto,
  Supervisor,
  Colaborador,
  UserRole,
  UsuarioLogin,
} from '../../types';

import { ProjetosDashboardTab } from './ProjetosDashboardTab';
import { ProjetosListTab } from './ProjetosListTab';
import { ProjetosKanbanTab } from './ProjetosKanbanTab';
import { ProjetosTimelineTab } from './ProjetosTimelineTab';
import { ProjetosFinancialTab } from './ProjetosFinancialTab';
import { ProjetosRisksTab } from './ProjetosRisksTab';
import { ProjetoFormModal } from './ProjetoFormModal';
import { ProjetoDetailModal } from './ProjetoDetailModal';
import { ProjetoResumoModal } from './ProjetoResumoModal';
import { StrategicGuidelinesBanner } from '../Common/StrategicGuidelinesBanner';

interface ProjetosViewProps {
  projetos: ProjetoGerencial[];
  onSaveProjeto: (projeto: ProjetoGerencial) => void;
  onDeleteProjeto: (id: string) => void;
  onUpdateProjetoStatus?: (id: string, newStatus: StatusProjeto) => void;
  supervisores: Supervisor[];
  colaboradores: Colaborador[];
  usuarios: UsuarioLogin[];
  userRole?: UserRole;
}

export const ProjetosView: React.FC<ProjetosViewProps> = ({
  projetos,
  onSaveProjeto,
  onDeleteProjeto,
  onUpdateProjetoStatus,
  supervisores,
  colaboradores,
  usuarios,
  userRole = 'admin',
}) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'portfolio' | 'kanban' | 'cronograma' | 'orcamento' | 'riscos'
  >('dashboard');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<ProjetoGerencial | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailProjeto, setSelectedDetailProjeto] = useState<ProjetoGerencial | null>(null);

  const [isResumoModalOpen, setIsResumoModalOpen] = useState(false);
  const [selectedResumoProjeto, setSelectedResumoProjeto] = useState<ProjetoGerencial | null>(null);

  const handleOpenNew = () => {
    setEditingProjeto(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (projeto: ProjetoGerencial) => {
    setEditingProjeto(projeto);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (projeto: ProjetoGerencial) => {
    setSelectedDetailProjeto(projeto);
    setIsDetailModalOpen(true);
  };

  const handleOpenResumo = (projeto: ProjetoGerencial) => {
    setSelectedResumoProjeto(projeto);
    setIsResumoModalOpen(true);
  };

  const handleStatusChange = (id: string, newStatus: StatusProjeto) => {
    if (onUpdateProjetoStatus) {
      onUpdateProjetoStatus(id, newStatus);
    } else {
      const found = projetos.find((p) => p.id === id);
      if (found) {
        onSaveProjeto({ ...found, status: newStatus, atualizadoEm: new Date().toISOString() });
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Module Title Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Gestão Corporativa & OKRs
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {projetos.length} Projetos Estratégicos
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Projetos Gerenciais & OKRs Estratégicos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Iniciativas alinhadas aos Norteadores Estratégicos: Segurança, Rastreabilidade, Pontualidade e Conformidade ANVISA/BPAD.
            </p>
          </div>
        </div>

        {/* Global Action & Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto Gerencial</span>
          </button>
        </div>
      </div>

      {/* Strategic Guidelines Institutional Banner */}
      <StrategicGuidelinesBanner variant="light" />

      {/* Modern Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard Executivo
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'portfolio'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <List className="w-4 h-4" />
          Portfólio ({projetos.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kanban')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'kanban'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Target className="w-4 h-4" />
          Quadro de Ações (Kanban)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cronograma')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'cronograma'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Cronograma & Prazos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orcamento')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'orcamento'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Orçamento & ROI
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riscos')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'riscos'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Matriz de Riscos
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'dashboard' && (
        <ProjetosDashboardTab
          projetos={projetos}
          onSelectProjeto={handleOpenDetail}
          onOpenNovoProjeto={handleOpenNew}
          onNavigateTab={setActiveTab}
          onOpenResumo={handleOpenResumo}
        />
      )}

      {activeTab === 'portfolio' && (
        <ProjetosListTab
          projetos={projetos}
          onSelectProjeto={handleOpenDetail}
          onEditProjeto={handleOpenEdit}
          onDeleteProjeto={onDeleteProjeto}
          onOpenNovoProjeto={handleOpenNew}
          onUpdateStatus={handleStatusChange}
          userRole={userRole}
          onOpenResumo={handleOpenResumo}
        />
      )}

      {activeTab === 'kanban' && (
        <ProjetosKanbanTab
          projetos={projetos}
          onUpdateProjeto={onSaveProjeto}
          onSelectProjeto={handleOpenDetail}
        />
      )}

      {activeTab === 'cronograma' && (
        <ProjetosTimelineTab
          projetos={projetos}
          onSelectProjeto={handleOpenDetail}
        />
      )}

      {activeTab === 'orcamento' && (
        <ProjetosFinancialTab
          projetos={projetos}
          onSelectProjeto={handleOpenDetail}
        />
      )}

      {activeTab === 'riscos' && (
        <ProjetosRisksTab
          projetos={projetos}
          onSelectProjeto={handleOpenDetail}
        />
      )}

      {/* Form Modal (Create / Edit) */}
      <ProjetoFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={(proj) => {
          onSaveProjeto(proj);
          if (selectedDetailProjeto && selectedDetailProjeto.id === proj.id) {
            setSelectedDetailProjeto(proj);
          }
        }}
        initialData={editingProjeto}
        supervisores={supervisores}
        colaboradores={colaboradores}
        usuarios={usuarios}
      />

      {/* Detail 360° Modal */}
      <ProjetoDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        projeto={selectedDetailProjeto}
        onEdit={(proj) => {
          handleOpenEdit(proj);
        }}
        onUpdateProjeto={(proj) => {
          onSaveProjeto(proj);
          setSelectedDetailProjeto(proj);
        }}
        userRole={userRole}
        onOpenResumo={handleOpenResumo}
      />

      {/* Resumo Share/Alert Modal (WhatsApp / E-mail) */}
      <ProjetoResumoModal
        isOpen={isResumoModalOpen}
        onClose={() => setIsResumoModalOpen(false)}
        projeto={selectedResumoProjeto}
        supervisores={supervisores}
        colaboradores={colaboradores}
      />
    </div>
  );
};
