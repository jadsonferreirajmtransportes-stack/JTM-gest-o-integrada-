import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FolderKanban,
  Calendar,
  DollarSign,
  Users,
  Flag,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Briefcase,
  Target,
  Paperclip,
  Upload,
  Eye,
  Download,
} from 'lucide-react';
import {
  ProjetoGerencial,
  CategoriaProjeto,
  StatusProjeto,
  PrioridadeProjeto,
  SetorImpactadoProjeto,
  MarcoProjeto,
  RiscoProjeto,
  AnexoDocumentoProjeto,
  CategoriaDocumentoProjeto,
  Supervisor,
  Colaborador,
  UsuarioLogin,
} from '../../types';
import {
  CATEGORIAS_DOCUMENTOS_PROJETO,
  getFileIcon,
  getFileCategoryBadgeColor,
} from './ProjetoAnexosSection';

interface ProjetoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projeto: ProjetoGerencial) => void;
  initialData?: ProjetoGerencial | null;
  supervisores: Supervisor[];
  colaboradores: Colaborador[];
  usuarios: UsuarioLogin[];
}

const CATEGORIAS: CategoriaProjeto[] = [
  'Expansão & Novos Hubs',
  'Regulatório & Qualidade RDC 430',
  'Inovação & Tecnologia',
  'Frota & Sustentabilidade',
  'Comercial & Novos Clientes',
  'Eficiência Operacional & Custos',
  'RH & Treinamento',
];

const STATUS_OPTIONS: StatusProjeto[] = [
  'Planejamento',
  'Em Andamento',
  'Em Revisão',
  'Pausado',
  'Concluído',
  'Cancelado',
];

const PRIORIDADES: PrioridadeProjeto[] = ['Baixa', 'Média', 'Alta', 'Crítica'];

const SETORES: SetorImpactadoProjeto[] = [
  'Todos os Setores',
  'Farma Aéreo',
  'Farma Rodoviário',
  'Departamento Pessoal',
  'Comercial & CRM',
  'Garantia da Qualidade & RDC 430',
  'Diretoria Executiva',
];

export const ProjetoFormModal: React.FC<ProjetoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  supervisores,
  colaboradores,
  usuarios,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'equipe' | 'cronograma' | 'financeiro' | 'marcos' | 'riscos' | 'anexos'>('geral');

  // Form states
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProjeto>('Regulatório & Qualidade RDC 430');
  const [status, setStatus] = useState<StatusProjeto>('Planejamento');
  const [prioridade, setPrioridade] = useState<PrioridadeProjeto>('Alta');
  const [setorImpactado, setSetorImpactado] = useState<SetorImpactadoProjeto>('Todos os Setores');
  
  const [liderProjetoNome, setLiderProjetoNome] = useState('');
  const [liderCargo, setLiderCargo] = useState('');
  const [equipeMembrosInput, setEquipeMembrosInput] = useState('');
  // Marcação por login do sistema — diferente de "equipe" (texto livre) — quem for marcado aqui
  // ganha visão deste projeto mesmo sem estar na equipe. Ver visibilidadeUtils.ts.
  const [usuariosMarcadosIds, setUsuariosMarcadosIds] = useState<string[]>([]);

  const [dataInicio, setDataInicio] = useState('');
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState('');
  const [dataConclusaoReal, setDataConclusaoReal] = useState('');
  const [progressoPercentual, setProgressoPercentual] = useState<number>(0);

  const [orcamentoPrevisto, setOrcamentoPrevisto] = useState<number>(0);
  const [custoRealizado, setCustoRealizado] = useState<number>(0);
  const [tipoInvestimento, setTipoInvestimento] = useState<'Capex' | 'Opex' | 'Misto'>('Opex');
  const [roiEstimadoMeses, setRoiEstimadoMeses] = useState<number>(6);
  const [retornoEsperadoDescricao, setRetornoEsperadoDescricao] = useState('');

  const [objetivoEstrategico, setObjetivoEstrategico] = useState('');
  const [alinhamentoRDC430, setAlinhamentoRDC430] = useState<boolean>(true);
  const [observacoes, setObservacoes] = useState('');

  // Marcos & Riscos lists
  const [marcos, setMarcos] = useState<MarcoProjeto[]>([]);
  const [riscos, setRiscos] = useState<RiscoProjeto[]>([]);

  // Documentos & Anexos state
  const [documentos, setDocumentos] = useState<AnexoDocumentoProjeto[]>([]);
  const [novoDocCategoria, setNovoDocCategoria] = useState<CategoriaDocumentoProjeto>('Regulatório & Qualidade RDC 430');
  const [novoDocObs, setNovoDocObs] = useState('');
  const [formDragActive, setFormDragActive] = useState(false);
  const formFileInputRef = React.useRef<HTMLInputElement>(null);

  // Temp inputs for adding new milestone
  const [novoMarcoTitulo, setNovoMarcoTitulo] = useState('');
  const [novoMarcoData, setNovoMarcoData] = useState('');
  const [novoMarcoResp, setNovoMarcoResp] = useState('');

  // Temp inputs for adding new risk
  const [novoRiscoDesc, setNovoRiscoDesc] = useState('');
  const [novoRiscoProb, setNovoRiscoProb] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [novoRiscoImp, setNovoRiscoImp] = useState<'Baixo' | 'Médio' | 'Alto'>('Alto');
  const [novoRiscoMitig, setNovoRiscoMitig] = useState('');

  useEffect(() => {
    if (initialData) {
      setCodigo(initialData.codigo || '');
      setTitulo(initialData.titulo || '');
      setDescricao(initialData.descricao || '');
      setCategoria(initialData.categoria || 'Regulatório & Qualidade RDC 430');
      setStatus(initialData.status || 'Planejamento');
      setPrioridade(initialData.prioridade || 'Alta');
      setSetorImpactado(initialData.setorImpactado || 'Todos os Setores');
      setLiderProjetoNome(initialData.liderProjetoNome || '');
      setLiderCargo(initialData.liderCargo || '');
      setEquipeMembrosInput(initialData.equipeMembros ? initialData.equipeMembros.join(', ') : '');
      setDataInicio(initialData.dataInicio || '');
      setDataPrevisaoFim(initialData.dataPrevisaoFim || '');
      setDataConclusaoReal(initialData.dataConclusaoReal || '');
      setProgressoPercentual(initialData.progressoPercentual ?? 0);
      setOrcamentoPrevisto(initialData.orcamentoPrevisto ?? 0);
      setCustoRealizado(initialData.custoRealizado ?? 0);
      setTipoInvestimento(initialData.tipoInvestimento || 'Opex');
      setRoiEstimadoMeses(initialData.roiEstimadoMeses ?? 6);
      setRetornoEsperadoDescricao(initialData.retornoEsperadoDescricao || '');
      setObjetivoEstrategico(initialData.objetivoEstrategico || '');
      setAlinhamentoRDC430(initialData.alinhamentoRDC430 ?? true);
      setObservacoes(initialData.observacoes || '');
      setMarcos(initialData.marcos || []);
      setRiscos(initialData.riscos || []);
      setDocumentos(initialData.documentos || []);
      setUsuariosMarcadosIds(initialData.usuariosMarcadosIds || []);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 4);
      const defaultEnd = sixMonthsLater.toISOString().split('T')[0];

      setCodigo(`PRJ-2026-${String(Math.floor(Math.random() * 900) + 100)}`);
      setTitulo('');
      setDescricao('');
      setCategoria('Regulatório & Qualidade RDC 430');
      setStatus('Planejamento');
      setPrioridade('Alta');
      setSetorImpactado('Todos os Setores');
      setLiderProjetoNome(supervisores[0]?.nome || 'Dra. Mariana Alencar (CRF/SP 45.890)');
      setLiderCargo(supervisores[0]?.cargo || 'Farmacêutica Responsável Técnica');
      setEquipeMembrosInput('');
      setDataInicio(today);
      setDataPrevisaoFim(defaultEnd);
      setDataConclusaoReal('');
      setProgressoPercentual(0);
      setOrcamentoPrevisto(50000);
      setCustoRealizado(0);
      setTipoInvestimento('Opex');
      setRoiEstimadoMeses(6);
      setRetornoEsperadoDescricao('');
      setObjetivoEstrategico('');
      setAlinhamentoRDC430(true);
      setObservacoes('');
      setMarcos([]);
      setRiscos([]);
      setDocumentos([]);
      setUsuariosMarcadosIds([]);
    }
    setActiveTab('geral');
  }, [initialData, isOpen, supervisores]);

  if (!isOpen) return null;

  const handleAddMarco = () => {
    if (!novoMarcoTitulo.trim()) return;
    const newMarco: MarcoProjeto = {
      id: `m-${Date.now()}`,
      titulo: novoMarcoTitulo.trim(),
      dataLimite: novoMarcoData || dataPrevisaoFim,
      concluido: false,
      responsavel: novoMarcoResp || liderProjetoNome,
      status: 'Pendente',
    };
    setMarcos([...marcos, newMarco]);
    setNovoMarcoTitulo('');
    setNovoMarcoData('');
    setNovoMarcoResp('');
  };

  const handleRemoveMarco = (id: string) => {
    setMarcos(marcos.filter((m) => m.id !== id));
  };

  const handleAddRisco = () => {
    if (!novoRiscoDesc.trim()) return;
    const newRisco: RiscoProjeto = {
      id: `r-${Date.now()}`,
      descricao: novoRiscoDesc.trim(),
      probabilidade: novoRiscoProb,
      impacto: novoRiscoImp,
      planoMitigacao: novoRiscoMitig.trim() || 'Acompanhamento preventivo contínuo.',
      responsavel: liderProjetoNome,
      status: 'Ativo',
    };
    setRiscos([...riscos, newRisco]);
    setNovoRiscoDesc('');
    setNovoRiscoMitig('');
  };

  const handleRemoveRisco = (id: string) => {
    setRiscos(riscos.filter((r) => r.id !== id));
  };

  // Form file handling
  const handleFormFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const sizeFormatted =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const base64 = reader.result as string;
      const novoDoc: AnexoDocumentoProjeto = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        nome: file.name,
        tipo: file.type || 'application/octet-stream',
        tamanho: sizeFormatted,
        dataUpload: new Date().toISOString().slice(0, 10),
        url: base64,
        arquivoUrl: base64,
        observacao: novoDocObs.trim() || undefined,
        categoria: novoDocCategoria,
        autor: liderProjetoNome || 'Gestão JMT',
      };
      setDocumentos((prev) => [novoDoc, ...prev]);
      setNovoDocObs('');
      if (formFileInputRef.current) formFileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleFormRemoveDoc = (id: string) => {
    setDocumentos((prev) => prev.filter((d) => d.id !== id));
  };

  const handleToggleUsuarioMarcado = (userId: string) => {
    setUsuariosMarcadosIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const equipeArray = equipeMembrosInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (liderProjetoNome && !equipeArray.includes(liderProjetoNome)) {
      equipeArray.unshift(liderProjetoNome);
    }

    const projetoToSave: ProjetoGerencial = {
      id: initialData?.id || `prj-${Date.now()}`,
      codigo: codigo.trim() || `PRJ-2026-${Date.now().toString().slice(-3)}`,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      categoria,
      status,
      prioridade,
      setorImpactado,
      liderProjetoNome: liderProjetoNome.trim(),
      liderCargo: liderCargo.trim(),
      equipeMembros: equipeArray,
      dataInicio: dataInicio || new Date().toISOString().split('T')[0],
      dataPrevisaoFim: dataPrevisaoFim || dataInicio,
      dataConclusaoReal: dataConclusaoReal || undefined,
      progressoPercentual: Number(progressoPercentual) || 0,
      orcamentoPrevisto: Number(orcamentoPrevisto) || 0,
      custoRealizado: Number(custoRealizado) || 0,
      tipoInvestimento,
      roiEstimadoMeses: Number(roiEstimadoMeses) || 0,
      retornoEsperadoDescricao: retornoEsperadoDescricao.trim(),
      objetivoEstrategico: objetivoEstrategico.trim(),
      alinhamentoRDC430,
      observacoes: observacoes.trim(),
      marcos,
      tarefas: initialData?.tarefas || [],
      riscos,
      kpis: initialData?.kpis || [],
      atualizacoes: initialData?.atualizacoes || [],
      documentos: documentos,
      criadoEm: initialData?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      criadoPorUserId: initialData?.criadoPorUserId,
      usuariosMarcadosIds,
    };

    onSave(projetoToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#B38F4F]">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {initialData ? 'Editar Projeto Gerencial' : 'Novo Projeto Estratégico & Gerencial'}
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-100 text-[#8A6A39] border border-slate-200">
                  {codigo || 'PRJ-2026'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Governança de Projetos, Metas RDC 430, Orçamento e Matriz de Riscos JMT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'geral'
                ? 'border-[#B38F4F] text-[#8A6A39] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            1. Escopo & Classificação
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('equipe')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'equipe'
                ? 'border-[#B38F4F] text-[#8A6A39] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            2. Liderança & Equipe
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cronograma')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cronograma'
                ? 'border-[#B38F4F] text-[#8A6A39] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            3. Prazos & Progresso
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'financeiro'
                ? 'border-[#B38F4F] text-[#8A6A39] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            4. Orçamento & ROI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('marcos')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'marcos'
                ? 'border-[#B38F4F] text-[#8A6A39] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flag className="w-4 h-4" />
            5. Marcos ({marcos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('riscos')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'riscos'
                ? 'border-[#B38F4F] text-[#8A6A39] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            6. Riscos & Mitigação ({riscos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('anexos')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'anexos'
                ? 'border-[#B38F4F] text-[#8A6A39] bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            7. Anexos & Dossiê ({documentos.length})
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: GERAL & ESCOPO */}
          {activeTab === 'geral' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código do Projeto *
                  </label>
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="PRJ-2026-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título Estratégico do Projeto *
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Validação Térmica RDC 430 / Mapeamento de Rotas"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição Executiva & Justificativa
                </label>
                <textarea
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva os objetivos, impacto operacional farmacêutico e entregáveis esperados..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria Estratégica
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaProjeto)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden font-medium"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as PrioridadeProjeto)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden font-medium"
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Atual
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusProjeto)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden font-medium"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Setor Principal Impactado
                  </label>
                  <select
                    value={setorImpactado}
                    onChange={(e) => setSetorImpactado(e.target.value as SetorImpactadoProjeto)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  >
                    {SETORES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Objetivo Estratégico / OKR Alinhado
                  </label>
                  <input
                    type="text"
                    value={objetivoEstrategico}
                    onChange={(e) => setObjetivoEstrategico(e.target.value)}
                    placeholder="Ex: Zero desvios de temperatura em auditorias ANVISA"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* RDC 430 Compliance Checkbox */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">
                      Alinhamento Regulatório com Boas Práticas RDC 430 / ANVISA
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Marque se este projeto impacta diretamente a cadeia de custódia e qualificação térmica
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alinhamentoRDC430}
                    onChange={(e) => setAlinhamentoRDC430(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: EQUIPE & LIDERANÇA */}
          {activeTab === 'equipe' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Líder do Projeto (Gerente / Supervisor)
                  </label>
                  <select
                    value={liderProjetoNome}
                    onChange={(e) => {
                      setLiderProjetoNome(e.target.value);
                      const found = supervisores.find((s) => s.nome === e.target.value);
                      if (found) setLiderCargo(found.cargo || 'Supervisor');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden font-medium"
                  >
                    {supervisores.map((s) => (
                      <option key={s.id} value={s.nome}>
                        {s.nome} ({s.cargo || 'Supervisor'})
                      </option>
                    ))}
                    {colaboradores.map((c) => (
                      <option key={c.id} value={c.nome}>
                        {c.nome} ({c.cargo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cargo / Função do Líder
                  </label>
                  <input
                    type="text"
                    value={liderCargo}
                    onChange={(e) => setLiderCargo(e.target.value)}
                    placeholder="Ex: Farmacêutica Responsável Técnica (RT)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Membros da Equipe / Envolvidos (separados por vírgula)
                </label>
                <textarea
                  rows={3}
                  value={equipeMembrosInput}
                  onChange={(e) => setEquipeMembrosInput(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Lima, Ricardo Silveira, Gabriel Santos (TI), Juliana Nogueira"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Dica: inclua farmacêuticos, operadores, supervisores e técnicos envolvidos no comitê de execução.
                </p>
              </div>

              {/* Quick Suggestion Chips from Supervisors */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-600 block mb-1.5">
                  Adicionar Lideranças Rapidamente à Equipe:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {supervisores.map((sup) => (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => {
                        if (!equipeMembrosInput.includes(sup.nome)) {
                          setEquipeMembrosInput((prev) =>
                            prev ? `${prev}, ${sup.nome}` : sup.nome
                          );
                        }
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-[#8A6A39] border border-slate-200 transition-colors"
                    >
                      + {sup.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marcar Usuários do Sistema — compartilha a visão deste projeto */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Compartilhar com Usuários do Sistema (opcional)
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Só quem criou este projeto e quem for marcado aqui enxerga ele na tela de Projetos —
                  os demais logins com acesso ao módulo não veem, a não ser que sejam administradores.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {usuarios
                    .filter((u) => u.status === 'Ativo')
                    .map((u) => {
                      const marcado = usuariosMarcadosIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleToggleUsuarioMarcado(u.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                            marcado
                              ? 'bg-[#B38F4F] border-[#B38F4F] text-white'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-amber-300'
                          }`}
                        >
                          {u.nome}
                        </button>
                      );
                    })}
                  {usuarios.filter((u) => u.status === 'Ativo').length === 0 && (
                    <span className="text-[11px] text-slate-400">Nenhum outro login cadastrado ainda.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRAZOS & PROGRESSO */}
          {activeTab === 'cronograma' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data Prevista de Fim (Deadline) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataPrevisaoFim}
                    onChange={(e) => setDataPrevisaoFim(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data de Conclusão Real (se concluído)
                  </label>
                  <input
                    type="date"
                    value={dataConclusaoReal}
                    onChange={(e) => setDataConclusaoReal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Progress Slider */}
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#5c4526] flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#B38F4F]" />
                    Progresso Geral Realizado:
                  </label>
                  <span className="text-sm font-extrabold text-[#8A6A39] font-mono">
                    {progressoPercentual}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressoPercentual}
                  onChange={(e) => setProgressoPercentual(Number(e.target.value))}
                  className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-[#B38F4F]"
                />
                <div className="flex justify-between text-[10px] text-[#8A6A39] font-medium">
                  <span>0% (Início)</span>
                  <span>25% (Estruturação)</span>
                  <span>50% (Execução)</span>
                  <span>75% (Homologação)</span>
                  <span>100% (Entregue)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ORÇAMENTO & FINANÇAS */}
          {activeTab === 'financeiro' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Orçamento Previsto Total (R$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={orcamentoPrevisto}
                    onChange={(e) => setOrcamentoPrevisto(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custo Realizado até o Momento (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={custoRealizado}
                    onChange={(e) => setCustoRealizado(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Investimento
                  </label>
                  <select
                    value={tipoInvestimento}
                    onChange={(e) => setTipoInvestimento(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden font-medium"
                  >
                    <option value="Opex">OPEX (Despesa Operacional / Consultoria)</option>
                    <option value="Capex">CAPEX (Investimento em Ativo / Infra / Frota)</option>
                    <option value="Misto">Misto (Capex + Opex)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payback / ROI Estimado (Meses)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={roiEstimadoMeses}
                    onChange={(e) => setRoiEstimadoMeses(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Retorno Esperado / Economia Estimada
                  </label>
                  <input
                    type="text"
                    value={retornoEsperadoDescricao}
                    onChange={(e) => setRetornoEsperadoDescricao(e.target.value)}
                    placeholder="Ex: Redução de 12% no consumo de diesel e economia de R$ 22.000/mês"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Financial Balance Pill */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Saldo Orçamentário Remanescente:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    orcamentoPrevisto - custoRealizado >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {(orcamentoPrevisto - custoRealizado).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: MARCOS E ENTREGAS */}
          {activeTab === 'marcos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#B38F4F]" />
                  Adicionar Novo Marco / Milestone
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={novoMarcoTitulo}
                    onChange={(e) => setNovoMarcoTitulo(e.target.value)}
                    placeholder="Título do marco (ex: Concluir QI/QO)"
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                  <input
                    type="date"
                    value={novoMarcoData}
                    onChange={(e) => setNovoMarcoData(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novoMarcoResp}
                      onChange={(e) => setNovoMarcoResp(e.target.value)}
                      placeholder="Responsável"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddMarco}
                      className="px-3 py-1.5 bg-[#B38F4F] text-white rounded-lg text-xs font-bold hover:bg-[#8A6A39] shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {/* List of Milestones */}
              <div className="space-y-2">
                {marcos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    Nenhum marco cadastrado. Adicione as etapas críticas acima.
                  </p>
                ) : (
                  marcos.map((marco, idx) => (
                    <div
                      key={marco.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-[#8A6A39] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{marco.titulo}</p>
                          <p className="text-[11px] text-slate-500">
                            Prazo: {marco.dataLimite} • Resp: {marco.responsavel || liderProjetoNome}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMarco(marco.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: MATRIZ DE RISCOS */}
          {activeTab === 'riscos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 space-y-3">
                <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Cadastrar Risco do Projeto
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={novoRiscoDesc}
                    onChange={(e) => setNovoRiscoDesc(e.target.value)}
                    placeholder="Descrição do risco operacional ou regulatório..."
                    className="sm:col-span-2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                  <select
                    value={novoRiscoProb}
                    onChange={(e) => setNovoRiscoProb(e.target.value as any)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Baixa">Prob: Baixa</option>
                    <option value="Média">Prob: Média</option>
                    <option value="Alta">Prob: Alta</option>
                  </select>
                  <select
                    value={novoRiscoImp}
                    onChange={(e) => setNovoRiscoImp(e.target.value as any)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Baixo">Imp: Baixo</option>
                    <option value="Médio">Imp: Médio</option>
                    <option value="Alto">Imp: Alto</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoRiscoMitig}
                    onChange={(e) => setNovoRiscoMitig(e.target.value)}
                    placeholder="Plano de Contingência e Mitigação..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddRisco}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shrink-0"
                  >
                    + Risco
                  </button>
                </div>
              </div>

              {/* List of Risks */}
              <div className="space-y-2">
                {riscos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    Nenhum risco cadastrado ainda.
                  </p>
                ) : (
                  riscos.map((risco) => (
                    <div
                      key={risco.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{risco.descricao}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              risco.impacto === 'Alto'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            P: {risco.probabilidade} | I: {risco.impacto}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRisco(risco.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700">Mitigação:</span>{' '}
                        {risco.planoMitigacao}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: ANEXOS & DOCUMENTOS */}
          {activeTab === 'anexos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Paperclip className="w-4 h-4 text-[#B38F4F]" />
                  <h3 className="text-xs font-bold text-[#5c4526] uppercase tracking-wide">
                    Anexar Documentação, POPs e Certificados ao Projeto
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  Faça o upload de documentos de suporte para este projeto. Os arquivos serão mantidos no dossiê oficial e ficarão disponíveis para visualização e download por toda a equipe autorizada.
                </p>
              </div>

              {/* Upload Configuration Area */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Classificação / Categoria do Documento
                    </label>
                    <select
                      value={novoDocCategoria}
                      onChange={(e) => setNovoDocCategoria(e.target.value as CategoriaDocumentoProjeto)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                    >
                      {CATEGORIAS_DOCUMENTOS_PROJETO.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observação / Finalidade (opcional)
                    </label>
                    <input
                      type="text"
                      value={novoDocObs}
                      onChange={(e) => setNovoDocObs(e.target.value)}
                      placeholder="Ex: Versão aprovada pelo comitê técnico..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#B38F4F] focus:outline-hidden"
                    >
                    </input>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setFormDragActive(true);
                  }}
                  onDragLeave={() => setFormDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setFormDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      Array.from(e.dataTransfer.files).forEach((file) => handleFormFileSelect(file as File));
                    }
                  }}
                  onClick={() => formFileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    formDragActive
                      ? 'border-[#B38F4F] bg-amber-50'
                      : 'border-slate-300 hover:border-amber-400 bg-white'
                  }`}
                >
                  <input
                    ref={formFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        Array.from(e.target.files).forEach((file) => handleFormFileSelect(file as File));
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-[#B38F4F] flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 text-center">
                    Clique para selecionar ou arraste arquivos para anexar
                  </p>
                  <p className="text-[11px] text-slate-500 text-center mt-1">
                    Suporta PDF, Planilhas Excel, Word, Imagens e Laudos Técnicos
                  </p>
                </div>
              </div>

              {/* Attachments List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Anexos deste Projeto ({documentos.length})
                  </span>
                  {documentos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDocumentos([])}
                      className="text-[11px] text-rose-600 hover:underline"
                    >
                      Remover todos
                    </button>
                  )}
                </div>

                {documentos.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-500 font-medium">
                      Nenhum arquivo adicionado até o momento.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Utilize a caixa acima para carregar documentações regulatórias, cronogramas ou orçamentos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentos.map((doc) => {
                      const iconMeta = getFileIcon(doc.nome, doc.tipo);
                      const IconComp = iconMeta.icon;
                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${iconMeta.bgColor} ${iconMeta.color}`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate" title={doc.nome}>
                                {doc.nome}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded font-semibold ${getFileCategoryBadgeColor(doc.categoria)}`}>
                                  {doc.categoria || 'Geral'}
                                </span>
                                <span>• {doc.tamanho || 'Tam. não inf.'}</span>
                                <span>• {doc.dataUpload}</span>
                                {doc.observacao && (
                                  <span className="text-slate-400 italic truncate max-w-[200px]">
                                    ({doc.observacao})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {(doc.url || doc.arquivoUrl) && (
                              <a
                                href={doc.arquivoUrl || doc.url}
                                download={doc.nome}
                                className="p-1.5 text-slate-500 hover:text-[#B38F4F] hover:bg-slate-100 rounded-lg transition-colors"
                                title="Baixar Arquivo"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleFormRemoveDoc(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remover Anexo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#B38F4F] to-[#B38F4F] hover:from-[#8A6A39] hover:to-[#8A6A39] text-white font-bold text-xs rounded-xl shadow-md transition-all shadow-[#B38F4F]/20"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Salvar Alterações' : 'Criar Projeto Gerencial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
