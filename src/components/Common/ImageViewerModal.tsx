import React from 'react';
import { X, ZoomIn, Download, Loader2 } from 'lucide-react';
import { ehRefStorage, useArquivoUrl } from '../../utils/arquivosStorage';
import { baixarArquivo } from '../../utils/downloadUtils';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  fileName?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Visualização de Documento / Imagem',
  subtitle,
  fileName,
}) => {
  // imageUrl pode ser data URL (anexo antigo, base64) ou referência "storage:" (anexo novo, no
  // Supabase Storage) — ver arquivosStorage.ts; o hook devolve uma URL exibível nos dois casos.
  const { url: urlExibivel, carregando, erro } = useArquivoUrl(isOpen ? imageUrl : undefined);

  if (!isOpen || !imageUrl) return null;

  const isPdf =
    imageUrl.startsWith('data:application/pdf') ||
    !!fileName?.toLowerCase().endsWith('.pdf') ||
    (ehRefStorage(imageUrl) && imageUrl.toLowerCase().endsWith('.pdf'));

  const handleDownload = () => {
    baixarArquivo(imageUrl, fileName || 'documento_colaborador').catch((err) => {
      console.error(err);
      alert('Não foi possível baixar o arquivo. Tente novamente.');
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <ZoomIn className="w-4 h-4 text-[#92611F]" />
              <span>{title}</span>
            </h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
              title="Baixar arquivo original"
            >
              <Download className="w-3.5 h-3.5 text-[#92611F]" />
              <span>Baixar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-slate-100 min-h-[300px]">
          {carregando || erro || !urlExibivel ? (
            <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
              {erro ? (
                <span>Não foi possível carregar o arquivo. Feche e tente abrir de novo.</span>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#92611F]" />
                  <span>Carregando arquivo...</span>
                </>
              )}
            </div>
          ) : isPdf ? (
            <div className="w-full h-[65vh] flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
              <iframe
                src={urlExibivel}
                title={fileName || 'Documento PDF Anexado'}
                className="w-full flex-1 bg-white"
              />
              <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 truncate">
                  Se o PDF não aparecer acima, baixe para abrir no visualizador do seu computador.
                </span>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={urlExibivel}
                alt={title}
                className="max-h-[70vh] max-w-full object-contain rounded-lg border border-slate-200 shadow-md"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-white text-right text-xs text-slate-500 shrink-0 flex items-center justify-between">
          <span className="text-[11px] truncate max-w-[70%]">{fileName || 'Arquivo digitalizado'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
          >
            Fechar Visualizador
          </button>
        </div>
      </div>
    </div>
  );
};
