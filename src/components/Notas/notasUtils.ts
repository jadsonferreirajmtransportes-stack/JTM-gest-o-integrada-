import React from 'react';
import { FileText, FileSpreadsheet, FileArchive, File as FileGenericIcon, Image as ImageIcon } from 'lucide-react';
import { BlocoNota, TipoBlocoNota, NotaPagina, TipoEntidadeVinculo } from '../../types';

export interface BlocoConfig {
  tipo: TipoBlocoNota;
  label: string;
  atalho: string; // dica visual (não funcional) de atalho estilo Notion
  placeholder: string;
}

export const BLOCO_CONFIG: BlocoConfig[] = [
  { tipo: 'texto', label: 'Texto', atalho: 'Aa', placeholder: "Escreva algo, ou pressione '+' para inserir um bloco..." },
  { tipo: 'titulo1', label: 'Título 1', atalho: 'H1', placeholder: 'Título 1' },
  { tipo: 'titulo2', label: 'Título 2', atalho: 'H2', placeholder: 'Título 2' },
  { tipo: 'titulo3', label: 'Título 3', atalho: 'H3', placeholder: 'Título 3' },
  { tipo: 'lista', label: 'Lista com marcadores', atalho: '•', placeholder: 'Item da lista' },
  { tipo: 'lista_numerada', label: 'Lista numerada', atalho: '1.', placeholder: 'Item da lista' },
  { tipo: 'checklist', label: 'Checklist', atalho: '☑', placeholder: 'Tarefa a fazer' },
  { tipo: 'citacao', label: 'Citação', atalho: '"', placeholder: 'Citação ou destaque' },
  { tipo: 'callout', label: 'Destaque (Callout)', atalho: '💡', placeholder: 'Escreva uma observação importante...' },
  { tipo: 'divisor', label: 'Divisor', atalho: '—', placeholder: '' },
  { tipo: 'imagem', label: 'Imagem', atalho: '🖼️', placeholder: 'Adicionar uma legenda (opcional)...' },
  { tipo: 'documento', label: 'Documento', atalho: '📎', placeholder: 'Adicionar uma descrição (opcional)...' },
  { tipo: 'fluxograma', label: 'Fluxograma', atalho: '⬡', placeholder: '' },
  { tipo: 'tabela', label: 'Tabela', atalho: '▦', placeholder: '' },
];

export interface FileKindInfo {
  label: string;
  Icon: React.ElementType;
  colorClass: string;
  /** true quando o arquivo pode ser aberto no visualizador embutido (imagem ou PDF). */
  previewable: boolean;
}

/** Classifica um arquivo anexado (bloco de imagem/documento) pela extensão do nome ou pelo mime da Data URL, para exibir ícone e rótulo apropriados. */
export function getFileKind(nome?: string, dataUrl?: string): FileKindInfo {
  const ext = (nome?.split('.').pop() || '').toLowerCase();
  const mime = dataUrl?.match(/^data:([^;]+);/)?.[1] || '';

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return { label: 'Imagem', Icon: ImageIcon, colorClass: 'text-purple-700 bg-purple-50 border-purple-200', previewable: true };
  }
  if (ext === 'pdf' || mime === 'application/pdf') {
    return { label: 'PDF', Icon: FileText, colorClass: 'text-rose-700 bg-rose-50 border-rose-200', previewable: true };
  }
  if (['doc', 'docx'].includes(ext)) {
    return { label: 'Word', Icon: FileText, colorClass: 'text-blue-700 bg-blue-50 border-blue-200', previewable: false };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { label: 'Excel', Icon: FileSpreadsheet, colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', previewable: false };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return { label: 'PowerPoint', Icon: FileText, colorClass: 'text-orange-700 bg-orange-50 border-orange-200', previewable: false };
  }
  if (['zip', 'rar', '7z'].includes(ext)) {
    return { label: 'Compactado', Icon: FileArchive, colorClass: 'text-slate-700 bg-slate-100 border-slate-200', previewable: false };
  }
  return {
    label: ext ? ext.toUpperCase() : 'Arquivo',
    Icon: FileGenericIcon,
    colorClass: 'text-slate-700 bg-slate-100 border-slate-200',
    previewable: false,
  };
}

export function getBlocoConfig(tipo: TipoBlocoNota): BlocoConfig {
  return BLOCO_CONFIG.find((b) => b.tipo === tipo) || BLOCO_CONFIG[0];
}

export function criarBlocoVazio(tipo: TipoBlocoNota = 'texto'): BlocoNota {
  const id = `bloco-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (tipo === 'fluxograma') {
    // Começa com duas etapas já ligadas, em vez de uma tela em branco — dá um ponto de
    // partida claro (basta arrastar/editar) para quem nunca montou um fluxograma aqui.
    const idInicio = `no-${Date.now()}-a`;
    const idFim = `no-${Date.now()}-b`;
    return {
      id,
      tipo,
      texto: '',
      fluxogramaNos: [
        { id: idInicio, texto: 'Início', x: 40, y: 30 },
        { id: idFim, texto: 'Fim', x: 40, y: 170 },
      ],
      fluxogramaConexoes: [{ id: `con-${Date.now()}`, origemId: idInicio, destinoId: idFim }],
    };
  }
  if (tipo === 'tabela') {
    return {
      id,
      tipo,
      texto: '',
      tabelaColunas: ['Coluna 1', 'Coluna 2'],
      tabelaLinhas: [
        ['', ''],
        ['', ''],
      ],
    };
  }
  return {
    id,
    tipo,
    texto: '',
    concluido: tipo === 'checklist' ? false : undefined,
  };
}

export function criarPaginaVazia(autor?: string, paginaPaiId?: string): NotaPagina {
  const now = new Date().toISOString();
  return {
    id: `nota-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    titulo: '',
    icone: '📄',
    paginaPaiId,
    blocos: [criarBlocoVazio('texto')],
    favorito: false,
    arquivada: false,
    autor,
    criadoEm: now,
    atualizadoEm: now,
  };
}

export const ICONES_SUGERIDOS = ['📄', '📝', '💡', '🚀', '📌', '🗂️', '✅', '📊', '🧠', '⭐', '🔥', '📅', '🎯', '🔧', '📦', '✈️', '🚚', '👥'];

export const MODULOS_VINCULO: Array<{ tipo: TipoEntidadeVinculo; label: string; modulo: string }> = [
  { tipo: 'cliente', label: 'Cliente', modulo: 'clientes' },
  { tipo: 'embarque_aereo', label: 'Embarque Aéreo', modulo: 'farma_aereo' },
  { tipo: 'viagem_rodoviaria', label: 'Viagem Rodoviária', modulo: 'farma_rodoviario' },
  { tipo: 'colaborador', label: 'Colaborador', modulo: 'dp' },
  { tipo: 'projeto', label: 'Projeto Gerencial', modulo: 'projetos' },
  { tipo: 'ocorrencia', label: 'Ocorrência', modulo: 'dp' },
];
