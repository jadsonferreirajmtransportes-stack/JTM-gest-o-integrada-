import React, { useState, useRef } from 'react';
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File as FileGeneric,
  Download,
  Trash2,
  Eye,
  Plus,
  Check,
  Search,
  X,
  ShieldCheck,
  AlertCircle,
  Clock,
  User,
  Tag,
  ExternalLink,
} from 'lucide-react';
import {
  ProjetoGerencial,
  AnexoDocumentoProjeto,
  CategoriaDocumentoProjeto,
  UserRole,
} from '../../types';

interface ProjetoAnexosSectionProps {
  projeto: ProjetoGerencial;
  onUpdateProjeto: (projeto: ProjetoGerencial) => void;
  userRole?: UserRole;
  readOnly?: boolean;
}

export const CATEGORIAS_DOCUMENTOS_PROJETO: CategoriaDocumentoProjeto[] = [
  'Regulatório & Qualidade RDC 430',
  'Contrato & Termos',
  'Escopo & Cronograma',
  'Orçamento & Proposta Comercial',
  'Relatório & Apresentação Executiva',
  'Laudo Técnico & Certificado',
  'Evidência Fotográfica',
  'Outros',
];

export function getFileCategoryBadgeColor(categoria?: CategoriaDocumentoProjeto): string {
  switch (categoria) {
    case 'Regulatório & Qualidade RDC 430':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Contrato & Termos':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Escopo & Cronograma':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Orçamento & Proposta Comercial':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Relatório & Apresentação Executiva':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Laudo Técnico & Certificado':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'Evidência Fotográfica':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getFileIcon(nome: string, tipo?: string) {
  const ext = nome.split('.').pop()?.toLowerCase() || '';
  const mime = tipo?.toLowerCase() || '';

  if (
    ext === 'pdf' ||
    mime.includes('pdf')
  ) {
    return {
      icon: FileText,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 border-rose-200',
      label: 'PDF',
    };
  }

  if (
    ['xls', 'xlsx', 'csv', 'ods'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv')
  ) {
    return {
      icon: FileSpreadsheet,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
      label: 'PLANILHA',
    };
  }

  if (
    ['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext) ||
    mime.includes('word') ||
    mime.includes('document')
  ) {
    return {
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      label: 'DOC',
    };
  }

  if (
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return {
      icon: ImageIcon,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
      label: 'IMAGEM',
    };
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return {
      icon: FileArchive,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      label: 'ZIP',
    };
  }

  return {
    icon: FileGeneric,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 border-slate-200',
    label: ext.toUpperCase() || 'ARQUIVO',
  };
}

export const ProjetoAnexosSection: React.FC<ProjetoAnexosSectionProps> = ({
  projeto,
  onUpdateProjeto,
  userRole = 'admin',
  readOnly = false,
}) => {
  const documentos = projeto.documentos || [];

  // Form / Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDocumentoProjeto>('Regulatório & Qualidade RDC 430');
  const [observacao, setObservacao] = useState('');
  const [autor, setAutor] = useState(projeto.liderProjetoNome || 'Gestão de Projetos JMT');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoriaFilter, setSelectedCategoriaFilter] = useState<string>('all');

  // Preview Lightbox State
  const [previewDoc, setPreviewDoc] = useState<AnexoDocumentoProjeto | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = !readOnly && userRole !== 'visualizador';

  // Trigger temporary feedback banner
  const triggerFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3000);
  };

  // Process selected file
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      const sizeFormatted =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const base64Data = reader.result as string;

      const novoAnexo: AnexoDocumentoProjeto = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        nome: file.name,
        tipo: file.type || 'application/octet-stream',
        tamanho: sizeFormatted,
        dataUpload: new Date().toISOString().slice(0, 10),
        url: base64Data,
        arquivoUrl: base64Data,
        observacao: observacao.trim() || undefined,
        categoria,
        autor: autor.trim() || 'Gestão JMT',
      };

      const updatedDocumentos = [novoAnexo, ...documentos];

      // Also create an audit/historical entry in atualizacoes
      const historicoEntry = {
        id: `att-${Date.now()}`,
        data: new Date().toISOString(),
        autor: autor.trim() || 'Gestão JMT',
        titulo: `Novo documento anexado: ${file.name}`,
        descricao: `Documento incluído na categoria "${categoria}". ${observacao.trim() ? `Nota: ${observacao.trim()}` : ''}`,
        tipo: 'Geral' as const,
      };

      const updatedAtualizacoes = [historicoEntry, ...(projeto.atualizacoes || [])];

      const updatedProjeto: ProjetoGerencial = {
        ...projeto,
        documentos: updatedDocumentos,
        atualizacoes: updatedAtualizacoes,
        atualizadoEm: new Date().toISOString(),
      };

      onUpdateProjeto(updatedProjeto);
      setObservacao('');
      setShowUploadModal(false);
      triggerFeedback(`Documento "${file.name}" anexado com sucesso ao projeto!`);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  // Drag-and-drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  // Removal handler
  const handleRemoveDocumento = (id: string) => {
    const docToRemove = documentos.find((d) => d.id === id);
    const updatedDocumentos = documentos.filter((d) => d.id !== id);

    // Audit log
    const historicoEntry = {
      id: `att-${Date.now()}`,
      data: new Date().toISOString(),
      autor: autor.trim() || 'Gestão JMT',
      titulo: `Documento removido: ${docToRemove?.nome || 'Anexo'}`,
      descricao: `O arquivo foi excluído do repositório do projeto.`,
      tipo: 'Geral' as const,
    };

    const updatedProjeto: ProjetoGerencial = {
      ...projeto,
      documentos: updatedDocumentos,
      atualizacoes: [historicoEntry, ...(projeto.atualizacoes || [])],
      atualizadoEm: new Date().toISOString(),
    };

    onUpdateProjeto(updatedProjeto);
    setDeleteConfirmId(null);
    triggerFeedback('Anexo excluído com sucesso.');
  };

  // Download handler
  const handleDownload = (doc: AnexoDocumentoProjeto) => {
    const fileUrl = doc.arquivoUrl || doc.url;
    if (!fileUrl) {
      alert('Arquivo não disponível para download.');
      return;
    }

    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = doc.nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerFeedback(`Iniciando download de "${doc.nome}"...`);
  };

  // Filtered documents
  const filteredDocs = documentos.filter((doc) => {
    const matchesSearch =
      doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.observacao && doc.observacao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.autor && doc.autor.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat =
      selectedCategoriaFilter === 'all' || doc.categoria === selectedCategoriaFilter;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Paperclip className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Repositório de Anexos & Documentos do Projeto
              </h3>
              <p className="text-[11px] text-slate-500">
                Laudos técnicos RDC 430, contratos, cronogramas, propostas e evidências auditáveis.
              </p>
            </div>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Anexar Novo Arquivo</span>
          </button>
        )}
      </div>

      {/* Drag & Drop Quick Area */}
      {canEdit && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2.5 ${
            dragActive
              ? 'border-purple-600 bg-purple-50/80 scale-[0.99]'
              : 'border-slate-300 bg-slate-50/60 hover:bg-purple-50/30 hover:border-purple-400'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-purple-600">
            <Upload className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Arraste e solte arquivos aqui, ou clique para selecionar do computador
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Suporta PDF, Planilhas Excel (.xlsx/.csv), Word (.docx), Imagens (PNG/JPG), Laudos RDC 430 e Arquivos ZIP
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.rar,.txt"
          />
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar documento por nome, nota ou autor..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategoriaFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
              selectedCategoriaFilter === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({documentos.length})
          </button>
          {CATEGORIAS_DOCUMENTOS_PROJETO.map((cat) => {
            const count = documentos.filter((d) => d.categoria === cat).length;
            if (count === 0 && selectedCategoriaFilter !== cat) return null;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoriaFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
                  selectedCategoriaFilter === cat
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Grid / Empty State */}
      {filteredDocs.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Paperclip className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700">
              {documentos.length === 0
                ? 'Nenhum documento anexado ao projeto ainda'
                : 'Nenhum documento encontrado com os filtros atuais'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {documentos.length === 0
                ? 'Adicione laudos de validação térmica, contratos de prestadores, atas de reunião, relatórios executivos ou planilhas orçamentárias.'
                : 'Tente alterar os termos da busca ou limpar o filtro de categoria.'}
            </p>
          </div>
          {canEdit && documentos.length === 0 && (
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Anexar Primeiro Arquivo</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDocs.map((doc) => {
            const fileMeta = getFileIcon(doc.nome, doc.tipo);
            const IconComponent = fileMeta.icon;
            const isImage =
              doc.tipo?.startsWith('image/') ||
              doc.arquivoUrl?.startsWith('data:image/') ||
              /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.nome);

            const hasPreviewUrl = !!(doc.arquivoUrl || doc.url);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Top Bar: Icon + Category Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${fileMeta.bgColor} ${fileMeta.color} shadow-2xs cursor-pointer group-hover:scale-105 transition-transform`}
                      onClick={() => hasPreviewUrl && setPreviewDoc(doc)}
                    >
                      {isImage && (doc.arquivoUrl || doc.url) ? (
                        <img
                          src={doc.arquivoUrl || doc.url}
                          alt={doc.nome}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <IconComponent className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getFileCategoryBadgeColor(
                          doc.categoria
                        )}`}
                      >
                        {doc.categoria || 'Geral'}
                      </span>
                      {doc.tamanho && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {doc.tamanho}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4
                    className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-purple-700 cursor-pointer"
                    title={doc.nome}
                    onClick={() => hasPreviewUrl && setPreviewDoc(doc)}
                  >
                    {doc.nome}
                  </h4>

                  {doc.observacao && (
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {doc.observacao}
                    </p>
                  )}
                </div>

                {/* Metadata & Actions Bottom Bar */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {doc.dataUpload}
                    </span>
                    {doc.autor && (
                      <span className="flex items-center gap-1 truncate max-w-[120px]" title={doc.autor}>
                        <User className="w-3 h-3 text-slate-400" />
                        {doc.autor}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    {hasPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Visualizar documento"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>
                    )}

                    {hasPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Baixar arquivo"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </button>
                    )}

                    {canEdit && (
                      <>
                        {deleteConfirmId === doc.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveDocumento(doc.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px]"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Anexar Documento ao Projeto</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Categoria do Documento *
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaDocumentoProjeto)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-hidden"
                >
                  {CATEGORIAS_DOCUMENTOS_PROJETO.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Responsável / Autor do Envio
                </label>
                <input
                  type="text"
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Nome do autor ou departamento..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observações & Contexto Auditável (Opcional)
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  placeholder="Ex: Laudo técnico de calibração emitido pela RBC com validade até Julho/2027..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Selecionar Arquivo *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-purple-300 hover:border-purple-600 bg-purple-50/40 rounded-xl text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-6 h-6 text-purple-600 mx-auto mb-1.5" />
                  <span className="text-xs font-bold text-purple-900 block">
                    Clique para escolher o arquivo
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    PDF, Planilhas, Imagens, Documentos de Texto ou ZIP
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Escolher Arquivo e Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3 truncate">
                <Paperclip className="w-5 h-5 text-purple-600 shrink-0" />
                <div className="truncate">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{previewDoc.nome}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{previewDoc.categoria}</span>
                    <span>•</span>
                    <span>{previewDoc.tamanho || 'Tamanho desconhecido'}</span>
                    <span>•</span>
                    <span>Data: {previewDoc.dataUpload}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-100 flex-1 overflow-y-auto flex items-center justify-center min-h-[400px]">
              {previewDoc.tipo?.startsWith('image/') ||
              previewDoc.arquivoUrl?.startsWith('data:image/') ||
              /\.(png|jpe?g|webp|gif|svg)$/i.test(previewDoc.nome) ? (
                <div className="max-h-[70vh] flex items-center justify-center">
                  <img
                    src={previewDoc.arquivoUrl || previewDoc.url}
                    alt={previewDoc.nome}
                    className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
                  />
                </div>
              ) : previewDoc.tipo?.includes('pdf') ||
                previewDoc.arquivoUrl?.startsWith('data:application/pdf') ||
                /\.pdf$/i.test(previewDoc.nome) ? (
                <div className="w-full h-[65vh] bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden flex flex-col">
                  <iframe
                    src={previewDoc.arquivoUrl || previewDoc.url}
                    title={previewDoc.nome}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{previewDoc.nome}</h4>
                  <p className="text-xs text-slate-500">
                    Este tipo de arquivo pode ser baixado diretamente para visualização completa no aplicativo correspondente do seu dispositivo.
                  </p>
                  {previewDoc.observacao && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 text-left border border-slate-100">
                      <strong>Observação:</strong> {previewDoc.observacao}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(previewDoc)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Arquivo Completo</span>
                  </button>
                </div>
              )}
            </div>

            {previewDoc.observacao && (
              <div className="px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span><strong>Nota da Gestão:</strong> {previewDoc.observacao}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
