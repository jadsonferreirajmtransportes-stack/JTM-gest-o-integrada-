import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Link2,
  Unlink,
  Star,
  MoreHorizontal,
  FileText,
  Building2,
  Plane,
  Truck,
  Users,
  FolderKanban,
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Paperclip,
  Download,
  Eye,
  Share2,
  Check,
  Calendar,
} from 'lucide-react';
import {
  BlocoNota,
  TipoBlocoNota,
  NotaPagina,
  VinculoNotaModulo,
  GlobalModuleId,
  FluxogramaNo,
  FluxogramaConexao,
  UsuarioLogin,
} from '../../types';
import { BLOCO_CONFIG, ICONES_SUGERIDOS, criarBlocoVazio, getFileKind } from './notasUtils';
import { CompartilharNotaModal } from './CompartilharNotaModal';
import { ImageViewerModal } from '../Common/ImageViewerModal';
import { FluxogramaBlock } from './FluxogramaBlock';
import { TabelaBlock } from './TabelaBlock';

interface NotaEditorProps {
  pagina: NotaPagina;
  onSave: (pagina: NotaPagina) => void;
  onDelete: () => void;
  onOpenVincular: () => void;
  onNavigateToVinculo?: (modulo: GlobalModuleId) => void;
  usuarios: UsuarioLogin[];
  criadoPor?: string;
}

const VINCULO_ICON: Record<VinculoNotaModulo['tipoEntidade'], React.ElementType> = {
  cliente: Building2,
  embarque_aereo: Plane,
  viagem_rodoviaria: Truck,
  colaborador: Users,
  projeto: FolderKanban,
  ocorrencia: AlertTriangle,
  atividade_agenda: Calendar,
};

export const NotaEditor: React.FC<NotaEditorProps> = ({ pagina, onSave, onDelete, onOpenVincular, onNavigateToVinculo, usuarios, criadoPor }) => {
  const [titulo, setTitulo] = useState(pagina.titulo);
  const [icone, setIcone] = useState(pagina.icone || '📄');
  const [blocos, setBlocos] = useState<BlocoNota[]>(pagina.blocos.length ? pagina.blocos : [criarBlocoVazio()]);
  const [showIconePicker, setShowIconePicker] = useState(false);
  const [menuAdicionarIdx, setMenuAdicionarIdx] = useState<number | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; nome?: string; titulo: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompartilhar, setShowCompartilhar] = useState(false);
  const [showCompartilharLink, setShowCompartilharLink] = useState(false);

  useEffect(() => {
    setTitulo(pagina.titulo);
    setIcone(pagina.icone || '📄');
    setBlocos(pagina.blocos.length ? pagina.blocos : [criarBlocoVazio()]);
    setMenuAdicionarIdx(null);
  }, [pagina.id]);

  const persist = (patch: Partial<NotaPagina>) => {
    onSave({ ...pagina, titulo, icone, blocos, ...patch });
  };

  const handleToggleUsuarioMarcado = (userId: string) => {
    const atual = pagina.usuariosMarcadosIds || [];
    const novo = atual.includes(userId) ? atual.filter((id) => id !== userId) : [...atual, userId];
    persist({ usuariosMarcadosIds: novo });
  };

  const handleUpdateBloco = (idx: number, field: keyof BlocoNota, value: any) => {
    const updated = [...blocos];
    updated[idx] = { ...updated[idx], [field]: value };
    setBlocos(updated);
  };

  const handleFluxogramaChange = (idx: number, nos: FluxogramaNo[], conexoes: FluxogramaConexao[]) => {
    const updated = blocos.map((b, i) =>
      i === idx ? { ...b, fluxogramaNos: nos, fluxogramaConexoes: conexoes } : b
    );
    setBlocos(updated);
    onSave({ ...pagina, titulo, icone, blocos: updated });
  };

  const handleTabelaChange = (idx: number, colunas: string[], linhasTabela: string[][]) => {
    const updated = blocos.map((b, i) =>
      i === idx ? { ...b, tabelaColunas: colunas, tabelaLinhas: linhasTabela } : b
    );
    setBlocos(updated);
    onSave({ ...pagina, titulo, icone, blocos: updated });
  };

  const handleUploadArquivo = (idx: number, file?: File | null, exigirImagem = false) => {
    if (!file) return;
    if (exigirImagem && !file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem (JPG, PNG, WEBP...).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const updated = blocos.map((b, i) =>
        i === idx ? { ...b, imagemUrl: reader.result as string, imagemNome: file.name } : b
      );
      setBlocos(updated);
      onSave({ ...pagina, titulo, icone, blocos: updated });
    };
    reader.readAsDataURL(file);
  };

  const handleBaixarArquivo = (bloco: BlocoNota) => {
    if (!bloco.imagemUrl) return;
    const link = document.createElement('a');
    link.href = bloco.imagemUrl;
    link.download = bloco.imagemNome || 'arquivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoverBloco = (idx: number) => {
    const updated = blocos.filter((_, i) => i !== idx);
    const finalBlocos = updated.length ? updated : [criarBlocoVazio()];
    setBlocos(finalBlocos);
    onSave({ ...pagina, titulo, icone, blocos: finalBlocos });
  };

  const handleMoverBloco = (idx: number, direcao: -1 | 1) => {
    const alvo = idx + direcao;
    if (alvo < 0 || alvo >= blocos.length) return;
    const updated = [...blocos];
    [updated[idx], updated[alvo]] = [updated[alvo], updated[idx]];
    setBlocos(updated);
    onSave({ ...pagina, titulo, icone, blocos: updated });
  };

  const handleInserirBloco = (idx: number, tipo: TipoBlocoNota) => {
    const novo = criarBlocoVazio(tipo);
    const updated = [...blocos.slice(0, idx + 1), novo, ...blocos.slice(idx + 1)];
    setBlocos(updated);
    setMenuAdicionarIdx(null);
    onSave({ ...pagina, titulo, icone, blocos: updated });
  };

  const renderBlocoInput = (bloco: BlocoNota, idx: number) => {
    const cfg = BLOCO_CONFIG.find((b) => b.tipo === bloco.tipo)!;
    const commonBlur = () => persist({});

    switch (bloco.tipo) {
      case 'divisor':
        return <hr className="border-slate-200 my-2" />;

      case 'titulo1':
      case 'titulo2':
      case 'titulo3': {
        const sizeClass =
          bloco.tipo === 'titulo1' ? 'text-xl font-extrabold' : bloco.tipo === 'titulo2' ? 'text-lg font-bold' : 'text-base font-bold';
        return (
          <input
            type="text"
            value={bloco.texto}
            onChange={(e) => handleUpdateBloco(idx, 'texto', e.target.value)}
            onBlur={commonBlur}
            placeholder={cfg.placeholder}
            className={`w-full bg-transparent border-none outline-hidden text-slate-900 placeholder-slate-300 ${sizeClass}`}
          />
        );
      }

      case 'lista':
      case 'lista_numerada':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 shrink-0 w-4 text-right">{bloco.tipo === 'lista' ? '•' : `${idx + 1}.`}</span>
            <input
              type="text"
              value={bloco.texto}
              onChange={(e) => handleUpdateBloco(idx, 'texto', e.target.value)}
              onBlur={commonBlur}
              placeholder={cfg.placeholder}
              className="flex-1 bg-transparent border-none outline-hidden text-sm text-slate-700 placeholder-slate-300"
            />
          </div>
        );

      case 'checklist':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!bloco.concluido}
              onChange={(e) => {
                handleUpdateBloco(idx, 'concluido', e.target.checked);
                onSave({
                  ...pagina,
                  titulo,
                  icone,
                  blocos: blocos.map((b, i) => (i === idx ? { ...b, concluido: e.target.checked } : b)),
                });
              }}
              className="w-4 h-4 rounded border-slate-300 text-[#B38F4F] focus:ring-[#B38F4F] shrink-0"
            />
            <input
              type="text"
              value={bloco.texto}
              onChange={(e) => handleUpdateBloco(idx, 'texto', e.target.value)}
              onBlur={commonBlur}
              placeholder={cfg.placeholder}
              className={`flex-1 bg-transparent border-none outline-hidden text-sm placeholder-slate-300 ${
                bloco.concluido ? 'line-through text-slate-400' : 'text-slate-700'
              }`}
            />
          </div>
        );

      case 'citacao':
        return (
          <div className="border-l-[3px] border-slate-300 pl-3">
            <input
              type="text"
              value={bloco.texto}
              onChange={(e) => handleUpdateBloco(idx, 'texto', e.target.value)}
              onBlur={commonBlur}
              placeholder={cfg.placeholder}
              className="w-full bg-transparent border-none outline-hidden text-sm text-slate-600 italic placeholder-slate-300"
            />
          </div>
        );

      case 'callout':
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-base shrink-0">💡</span>
            <textarea
              value={bloco.texto}
              onChange={(e) => handleUpdateBloco(idx, 'texto', e.target.value)}
              onBlur={commonBlur}
              placeholder={cfg.placeholder}
              rows={2}
              className="flex-1 bg-transparent border-none outline-hidden text-sm text-[#5c4526] placeholder-amber-400/60 resize-y"
            />
          </div>
        );

      case 'imagem': {
        const inputId = `img-input-${bloco.id}`;
        if (bloco.imagemUrl) {
          return (
            <div className="space-y-1.5">
              <div className="group/img relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={bloco.imagemUrl}
                  alt={bloco.texto || bloco.imagemNome || 'Imagem da nota'}
                  onClick={() => setViewingImage({ url: bloco.imagemUrl!, nome: bloco.imagemNome, titulo: 'Imagem da Nota' })}
                  className="w-full max-h-[420px] object-contain cursor-zoom-in bg-white"
                />
                <label
                  htmlFor={inputId}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-slate-900/90 text-white rounded-lg cursor-pointer opacity-0 group-hover/img:opacity-100 transition-opacity"
                  title="Trocar imagem"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </label>
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadArquivo(idx, e.target.files?.[0], true)}
                />
              </div>
              <input
                type="text"
                value={bloco.texto}
                onChange={(e) => handleUpdateBloco(idx, 'texto', e.target.value)}
                onBlur={commonBlur}
                placeholder={cfg.placeholder}
                className="w-full bg-transparent border-none outline-hidden text-[11px] text-slate-400 italic placeholder-slate-300 text-center"
              />
            </div>
          );
        }
        return (
          <label
            htmlFor={inputId}
            className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 rounded-xl p-6 cursor-pointer transition-colors"
          >
            <ImageIcon className="w-6 h-6 text-slate-300" />
            <span className="text-xs text-slate-400 font-medium">Clique para adicionar uma imagem</span>
            <span className="text-[10px] text-slate-300">JPG, PNG ou WEBP</span>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUploadArquivo(idx, e.target.files?.[0], true)}
            />
          </label>
        );
      }

      case 'documento': {
        const inputId = `doc-input-${bloco.id}`;
        if (bloco.imagemUrl) {
          const kind = getFileKind(bloco.imagemNome, bloco.imagemUrl);
          const KindIcon = kind.Icon;
          return (
            <div className="space-y-1.5">
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${kind.colorClass}`}>
                <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shrink-0 border border-current/20">
                  <KindIcon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold block truncate">{bloco.imagemNome || 'Documento anexado'}</span>
                  <span className="text-[10px] opacity-70">{kind.label}</span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {kind.previewable && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingImage({ url: bloco.imagemUrl!, nome: bloco.imagemNome, titulo: `Documento — ${kind.label}` })
                      }
                      className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleBaixarArquivo(bloco)}
                    className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                    title="Baixar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <label
                    htmlFor={inputId}
                    className="p-1.5 hover:bg-white/60 rounded-lg cursor-pointer transition-colors"
                    title="Trocar arquivo"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </label>
                  <input
                    id={inputId}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleUploadArquivo(idx, e.target.files?.[0])}
                  />
                </div>
              </div>
              <input
                type="text"
                value={bloco.texto}
                onChange={(e) => handleUpdateBloco(idx, 'texto', e.target.value)}
                onBlur={commonBlur}
                placeholder={cfg.placeholder}
                className="w-full bg-transparent border-none outline-hidden text-[11px] text-slate-400 italic placeholder-slate-300"
              />
            </div>
          );
        }
        return (
          <label
            htmlFor={inputId}
            className="flex items-center gap-3 border-2 border-dashed border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 rounded-xl p-4 cursor-pointer transition-colors"
          >
            <Paperclip className="w-5 h-5 text-slate-300 shrink-0" />
            <div>
              <span className="text-xs text-slate-500 font-medium block">Clique para anexar um documento</span>
              <span className="text-[10px] text-slate-300">PDF, Word, Excel, ZIP...</span>
            </div>
            <input id={inputId} type="file" className="hidden" onChange={(e) => handleUploadArquivo(idx, e.target.files?.[0])} />
          </label>
        );
      }

      case 'fluxograma':
        return (
          <FluxogramaBlock
            nos={bloco.fluxogramaNos || []}
            conexoes={bloco.fluxogramaConexoes || []}
            onChange={(nos, conexoes) => handleFluxogramaChange(idx, nos, conexoes)}
          />
        );

      case 'tabela':
        return (
          <TabelaBlock
            colunas={bloco.tabelaColunas || []}
            linhas={bloco.tabelaLinhas || []}
            onChange={(colunas, linhasTabela) => handleTabelaChange(idx, colunas, linhasTabela)}
          />
        );

      case 'texto':
      default:
        return (
          <textarea
            value={bloco.texto}
            onChange={(e) => handleUpdateBloco(idx, 'texto', e.target.value)}
            onBlur={commonBlur}
            placeholder={cfg.placeholder}
            rows={2}
            className="w-full bg-transparent border-none outline-hidden text-sm text-slate-700 placeholder-slate-300 resize-y"
          />
        );
    }
  };

  const vinculo = pagina.vinculo;
  const VinculoIcon = vinculo ? VINCULO_ICON[vinculo.tipoEntidade] : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header: Icon, Title, Actions */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowIconePicker((v) => !v)}
              className="text-3xl hover:bg-slate-100 rounded-lg p-1 transition-colors leading-none"
              title="Alterar ícone"
            >
              {icone}
            </button>
            {showIconePicker && (
              <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1 w-56">
                {ICONES_SUGERIDOS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => {
                      setIcone(ic);
                      setShowIconePicker(false);
                      onSave({ ...pagina, titulo, icone: ic, blocos });
                    }}
                    className="text-lg hover:bg-slate-100 rounded-lg p-1"
                  >
                    {ic}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => persist({})}
            placeholder="Página sem título"
            className="flex-1 min-w-0 bg-transparent border-none outline-hidden text-2xl font-extrabold text-slate-900 placeholder-slate-300 pt-1.5"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0 pt-2">
          <button
            type="button"
            onClick={() => {
              const novoFav = !pagina.favorito;
              onSave({ ...pagina, titulo, icone, blocos, favorito: novoFav });
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              pagina.favorito ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
            }`}
            title={pagina.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
          >
            <Star className="w-4 h-4" fill={pagina.favorito ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Excluir página"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Vínculo com outro módulo */}
      <div className="mb-5 pl-1">
        {vinculo ? (
          <button
            type="button"
            onClick={() => onNavigateToVinculo?.(vinculo.modulo)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[11px] font-semibold text-[#8A6A39] transition-colors"
            title="Ir para o registro vinculado"
          >
            {VinculoIcon && <VinculoIcon className="w-3.5 h-3.5" />}
            <span className="truncate max-w-[240px]">{vinculo.entidadeLabel}</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenVincular}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Vincular a um módulo</span>
          </button>
        )}
        {vinculo && (
          <button
            type="button"
            onClick={onOpenVincular}
            className="ml-2 text-[10px] text-slate-400 hover:text-slate-600 underline"
          >
            alterar
          </button>
        )}

        {/* Compartilhar com Usuários do Sistema — mesma regra de visibilidade da Agenda da
            Gestão e Projetos Gerenciais (ver visibilidadeUtils.ts). */}
        <button
          type="button"
          onClick={() => setShowCompartilhar((v) => !v)}
          className={`ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[11px] font-medium transition-colors ${
            (pagina.usuariosMarcadosIds || []).length > 0
              ? 'bg-amber-50 border-amber-200 text-[#8A6A39]'
              : 'bg-white border-dashed border-slate-300 text-slate-500 hover:text-slate-700'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>
            {(pagina.usuariosMarcadosIds || []).length > 0
              ? `Compartilhada com ${(pagina.usuariosMarcadosIds || []).length}`
              : 'Compartilhar'}
          </span>
        </button>

        {/* Compartilhar por fora do sistema — gera um link de visualização (somente leitura,
            sem login) e manda por WhatsApp/e-mail a partir dele, em vez de colar o texto puro. */}
        <button
          type="button"
          onClick={() => setShowCompartilharLink(true)}
          title="Gerar link de visualização (WhatsApp / e-mail)"
          className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-slate-300 rounded-lg text-[11px] font-medium text-slate-500 hover:text-[#8A6A39] hover:border-amber-300 transition-colors"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Link de Visualização</span>
        </button>

        {showCompartilhar && (
          <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-[11px] text-slate-500 mb-1.5">
              Só quem criou esta página e quem for marcado aqui enxerga ela em Notas & Ideias.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {usuarios
                .filter((u) => u.status === 'Ativo')
                .map((u) => {
                  const marcado = (pagina.usuariosMarcadosIds || []).includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleToggleUsuarioMarcado(u.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-colors ${
                        marcado
                          ? 'bg-[#B38F4F] border-[#B38F4F] text-white'
                          : 'bg-white border-slate-300 text-slate-600 hover:border-amber-300'
                      }`}
                    >
                      {marcado && <Check className="w-3 h-3" />}
                      {u.nome}
                    </button>
                  );
                })}
              {usuarios.filter((u) => u.status === 'Ativo').length === 0 && (
                <span className="text-[11px] text-slate-400">Nenhum outro login cadastrado ainda.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Blocos */}
      <div className="space-y-0.5 pb-16">
        {blocos.map((bloco, idx) => (
          <div key={bloco.id}>
            <div className="group relative flex items-start gap-1">
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-1 -ml-1">
                <button
                  type="button"
                  onClick={() => handleMoverBloco(idx, -1)}
                  disabled={idx === 0}
                  className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-0"
                  title="Mover para cima"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoverBloco(idx, 1)}
                  disabled={idx === blocos.length - 1}
                  className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-0"
                  title="Mover para baixo"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 min-w-0 py-0.5">{renderBlocoInput(bloco, idx)}</div>
              <button
                type="button"
                onClick={() => handleRemoverBloco(idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-300 hover:text-rose-500 shrink-0"
                title="Remover bloco"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {menuAdicionarIdx === idx && (
              <div className="ml-5 mb-2 flex flex-wrap gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {BLOCO_CONFIG.map((cfg) => (
                  <button
                    key={cfg.tipo}
                    type="button"
                    onClick={() => handleInserirBloco(idx, cfg.tipo)}
                    className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-md hover:border-amber-400 hover:text-[#8A6A39] text-slate-600 font-medium transition-colors flex items-center gap-1"
                  >
                    <span className="text-slate-400">{cfg.atalho}</span>
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => setMenuAdicionarIdx(menuAdicionarIdx === blocos.length - 1 ? null : blocos.length - 1)}
          className="ml-5 mt-1 flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#B38F4F] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar bloco</span>
        </button>
      </div>

      <ImageViewerModal
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage?.url}
        fileName={viewingImage?.nome}
        title={viewingImage?.titulo || 'Imagem da Nota'}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir página?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tem certeza que deseja excluir "<strong>{titulo || 'Página sem título'}</strong>"? Essa
                  ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                Excluir Página
              </button>
            </div>
          </div>
        </div>
      )}

      <CompartilharNotaModal
        isOpen={showCompartilharLink}
        onClose={() => setShowCompartilharLink(false)}
        pagina={pagina}
        criadoPor={criadoPor}
      />
    </div>
  );
};
