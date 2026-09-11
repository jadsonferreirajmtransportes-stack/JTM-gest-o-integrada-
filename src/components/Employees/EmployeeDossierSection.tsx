import React, { useState, useRef } from 'react';
import {
  StickyNote,
  Paperclip,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  Calendar,
  User,
  Tag,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Check,
} from 'lucide-react';
import { AnotacaoColaborador, AnexoColaborador } from '../../types';
import { formatDate } from '../../utils/formatters';
import { ImageViewerModal } from '../Common/ImageViewerModal';

interface EmployeeDossierSectionProps {
  anotacoes?: AnotacaoColaborador[];
  anexos?: AnexoColaborador[];
  observacoesGerais?: string;
  onUpdateAnotacoes: (anotacoes: AnotacaoColaborador[]) => void;
  onUpdateAnexos: (anexos: AnexoColaborador[]) => void;
  onUpdateObservacoesGerais?: (text: string) => void;
  readOnly?: boolean;
}

const CATEGORIAS_ANOTACOES: AnotacaoColaborador['categoria'][] = [
  'Geral',
  'Desempenho',
  'Conduta',
  'Saúde',
  'Treinamento',
  'Documentação',
  'Elogio',
];

const CATEGORIAS_ANEXOS: AnexoColaborador['categoria'][] = [
  'Documento Pessoal',
  'Certificado RDC 430',
  'Laudo / Exame',
  'Contrato / Termo',
  'Treinamento',
  'Comprovante',
  'Outros',
];

export const EmployeeDossierSection: React.FC<EmployeeDossierSectionProps> = ({
  anotacoes = [],
  anexos = [],
  observacoesGerais = '',
  onUpdateAnotacoes,
  onUpdateAnexos,
  onUpdateObservacoesGerais,
  readOnly = false,
}) => {
  // New Note state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTexto, setNoteTexto] = useState('');
  const [noteCategoria, setNoteCategoria] = useState<AnotacaoColaborador['categoria']>('Geral');
  const [noteAutor, setNoteAutor] = useState('Jadson Ferreira (RH)');

  // New Attachment state
  const [anexoCategoria, setAnexoCategoria] = useState<AnexoColaborador['categoria']>('Documento Pessoal');
  const [anexoDescricao, setAnexoDescricao] = useState('');
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox state
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string; title: string } | null>(null);

  // Note Handlers
  const handleAddNote = () => {
    if (!noteTexto.trim()) return;

    const nova: AnotacaoColaborador = {
      id: `note-${Date.now()}`,
      data: new Date().toISOString().slice(0, 10),
      autor: noteAutor.trim() || 'Gestão de DP / RH',
      categoria: noteCategoria,
      texto: noteTexto.trim(),
    };

    onUpdateAnotacoes([nova, ...anotacoes]);
    setNoteTexto('');
    setIsAddingNote(false);
  };

  const handleRemoveNote = (id: string) => {
    onUpdateAnotacoes(anotacoes.filter((n) => n.id !== id));
  };

  // Attachment Handlers
  //
  // Limites de tamanho: os anexos são gravados como base64 dentro de uma coluna JSONB no
  // Postgres (não em um storage de arquivos separado) — um payload grande demais na mesma
  // gravação estoura o tempo limite da instrução SQL no banco (testado: 25MB já falha com
  // "canceling statement due to statement timeout"; 15MB passa mas demora ~20s mesmo numa
  // boa conexão). Os limites abaixo dão uma margem confortável pra conexões mais lentas.
  const LIMITE_ANEXO_MB = 8;
  const LIMITE_TOTAL_ANEXOS_MB = 20;

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroAnexo(null);

    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB > LIMITE_ANEXO_MB) {
      setErroAnexo(
        `"${file.name}" tem ${tamanhoMB.toFixed(1)}MB — o limite por arquivo é ${LIMITE_ANEXO_MB}MB. Comprima a imagem/PDF ou tire uma foto em resolução menor antes de anexar.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const tamanhoAtualAnexosMB = anexos.reduce((soma, a) => soma + (a.arquivoUrl?.length || 0), 0) / (1024 * 1024);
    if (tamanhoAtualAnexosMB + tamanhoMB > LIMITE_TOTAL_ANEXOS_MB) {
      setErroAnexo(
        `O total de anexos deste colaborador passaria de ${LIMITE_TOTAL_ANEXOS_MB}MB, o que pode falhar ao salvar. Remova algum anexo antigo antes de adicionar este.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const sizeFormatted =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      const novoAnexo: AnexoColaborador = {
        id: `anexo-${Date.now()}`,
        nome: file.name,
        categoria: anexoCategoria,
        dataUpload: new Date().toISOString().slice(0, 10),
        tamanho: sizeFormatted,
        tipo: file.type || 'application/octet-stream',
        arquivoUrl: reader.result as string,
        descricao: anexoDescricao.trim() || undefined,
      };

      onUpdateAnexos([novoAnexo, ...anexos]);
      setAnexoDescricao('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAnexo = (id: string) => {
    onUpdateAnexos(anexos.filter((a) => a.id !== id));
  };

  // Edição da descrição de um anexo já existente — antes só dava pra definir a descrição
  // no momento do upload; se o usuário digitasse algo no campo "Descrição Opcional" depois
  // de o arquivo já estar na lista, aquele texto não tinha efeito nenhum sobre o anexo já
  // anexado (só valeria pro PRÓXIMO upload) — parecia que "a descrição não fica salva".
  const [editandoAnexoId, setEditandoAnexoId] = useState<string | null>(null);
  const [descricaoEmEdicao, setDescricaoEmEdicao] = useState('');

  const handleIniciarEdicaoDescricao = (anexo: AnexoColaborador) => {
    setEditandoAnexoId(anexo.id);
    setDescricaoEmEdicao(anexo.descricao || '');
  };

  const handleConfirmarEdicaoDescricao = (id: string) => {
    onUpdateAnexos(
      anexos.map((a) => (a.id === id ? { ...a, descricao: descricaoEmEdicao.trim() || undefined } : a))
    );
    setEditandoAnexoId(null);
  };

  const getCategoryColor = (cat: AnotacaoColaborador['categoria']) => {
    switch (cat) {
      case 'Elogio':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Desempenho':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Conduta':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Saúde':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Treinamento':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Documentação':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-xs animate-in fade-in duration-100">
      {/* SECTION 1: ANOTAÇÕES E PRONTUÁRIO INTERNO */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Anotações Internas & Prontuário do Colaborador ({anotacoes.length})
            </h3>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsAddingNote((prev) => !prev)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingNote ? 'Cancelar' : 'Nova Anotação'}</span>
            </button>
          )}
        </div>

        {/* Inline Add Note Form */}
        {isAddingNote && !readOnly && (
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-2.5 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-700 block text-[11px] mb-1">Categoria:</label>
                <select
                  value={noteCategoria}
                  onChange={(e) => setNoteCategoria(e.target.value as AnotacaoColaborador['categoria'])}
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  {CATEGORIAS_ANOTACOES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block text-[11px] mb-1">Registrado por:</label>
                <input
                  type="text"
                  value={noteAutor}
                  onChange={(e) => setNoteAutor(e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block text-[11px] mb-1">
                Texto da Anotação / Observação:
              </label>
              <textarea
                rows={3}
                value={noteTexto}
                onChange={(e) => setNoteTexto(e.target.value)}
                placeholder="Insira aqui as anotações sobre feedbacks, orientações, acordos de jornada, histórico ou observações sobre o colaborador..."
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNote(false)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddNote}
                className="px-3.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvar Anotação</span>
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {anotacoes.length === 0 ? (
          <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            Nenhuma anotação interna cadastrada para este colaborador.
          </div>
        ) : (
          <div className="space-y-2.5">
            {anotacoes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between gap-2.5 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(
                        note.categoria
                      )}`}
                    >
                      {note.categoria}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(note.data)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {note.autor}
                    </span>
                  </div>
                  <p className="text-slate-800 text-xs whitespace-pre-wrap leading-relaxed">
                    {note.texto}
                  </p>
                </div>

                {!readOnly && (
                  <div className="sm:self-start shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveNote(note.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir anotação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ANEXOS & ARQUIVOS GERAIS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Dossiê de Anexos & Arquivos Extras ({anexos.length})
            </h3>
          </div>
        </div>

        {/* Upload Form Box */}
        {!readOnly && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-700 block text-[11px] mb-1">
                  Categoria do Anexo:
                </label>
                <select
                  value={anexoCategoria}
                  onChange={(e) => setAnexoCategoria(e.target.value as AnexoColaborador['categoria'])}
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  {CATEGORIAS_ANEXOS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block text-[11px] mb-1">
                  Descrição Opcional:
                </label>
                <input
                  type="text"
                  value={anexoDescricao}
                  onChange={(e) => setAnexoDescricao(e.target.value)}
                  placeholder="Ex: Certificado Treinamento Boas Práticas Distribuição"
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/30 rounded-lg flex items-center justify-center gap-2 text-slate-700 font-bold transition-all bg-white"
              >
                <Upload className="w-4 h-4 text-amber-600" />
                <span>Clique para selecionar e anexar foto, laudo ou documento (PDF/PNG/JPG — até {LIMITE_ANEXO_MB}MB)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelected}
              />
              {erroAnexo && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{erroAnexo}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attachments Grid */}
        {anexos.length === 0 ? (
          <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            Nenhum arquivo ou documento adicional anexado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {anexos.map((anexo) => {
              const isImg =
                anexo.tipo?.startsWith('image/') ||
                anexo.arquivoUrl?.startsWith('data:image/') ||
                /\.(png|jpe?g|webp|gif)$/i.test(anexo.nome);

              return (
                <div
                  key={anexo.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-start gap-3 transition-colors"
                >
                  {/* Thumbnail / Icon */}
                  <div
                    onClick={() =>
                      anexo.arquivoUrl &&
                      setViewerFile({
                        url: anexo.arquivoUrl,
                        name: anexo.nome,
                        title: anexo.categoria,
                      })
                    }
                    className="w-14 h-14 shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer group relative"
                  >
                    {isImg && anexo.arquivoUrl ? (
                      <img
                        src={anexo.arquivoUrl}
                        alt={anexo.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-amber-600" />
                    )}
                    {anexo.arquivoUrl && (
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate" title={anexo.nome}>
                      {anexo.nome}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-sm font-semibold">
                        {anexo.categoria}
                      </span>
                      {anexo.tamanho && (
                        <span className="text-[10px] text-slate-400 font-mono">{anexo.tamanho}</span>
                      )}
                    </div>
                    {editandoAnexoId === anexo.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          autoFocus
                          value={descricaoEmEdicao}
                          onChange={(e) => setDescricaoEmEdicao(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleConfirmarEdicaoDescricao(anexo.id)}
                          placeholder="Descrição do anexo"
                          className="flex-1 text-[11px] p-1 border border-amber-300 rounded-md bg-white min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmarEdicaoDescricao(anexo.id)}
                          className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md shrink-0"
                          title="Confirmar descrição"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      anexo.descricao && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{anexo.descricao}</p>
                      )
                    )}
                    <div className="text-[10px] text-slate-400 mt-1">
                      Data: {formatDate(anexo.dataUpload)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {anexo.arquivoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setViewerFile({
                            url: anexo.arquivoUrl!,
                            name: anexo.nome,
                            title: anexo.categoria,
                          })
                        }
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md transition-colors"
                        title="Visualizar documento"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleIniciarEdicaoDescricao(anexo)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                        title="Editar descrição"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAnexo(anexo.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Remover anexo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: OBSERVAÇÕES GERAIS PERMANENTES */}
      {onUpdateObservacoesGerais && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
            Observações Gerais & Informações Complementares
          </h3>
          <textarea
            rows={3}
            disabled={readOnly}
            value={observacoesGerais}
            onChange={(e) => onUpdateObservacoesGerais(e.target.value)}
            placeholder="Campo livre para anotações gerais permanentes, restrições específicas, observações de RH ou dados históricos..."
            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs disabled:bg-slate-50"
          />
        </div>
      )}

      {/* Lightbox Viewer */}
      {viewerFile && (
        <ImageViewerModal
          isOpen={!!viewerFile}
          onClose={() => setViewerFile(null)}
          imageUrl={viewerFile.url}
          title={viewerFile.title}
          subtitle="Documento arquivado no dossiê do colaborador"
          fileName={viewerFile.name}
        />
      )}
    </div>
  );
};
