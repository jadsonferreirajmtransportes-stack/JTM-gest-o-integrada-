import React, { useRef, useState } from 'react';
import { Upload, Trash2, Eye, CheckCircle2, FileText, FileSignature } from 'lucide-react';
import { ImageViewerModal } from '../Common/ImageViewerModal';

interface EpiComprovanteUploaderProps {
  comprovanteUrl?: string; // data URL (imagem/PDF) — só existe quando há arquivo digital anexado
  nomeArquivo?: string;
  onUpload: (dataUrl: string, fileName: string) => void;
  onRemove: () => void;
}

/** Anexo do recibo de entrega de EPI assinado pelo recebedor — mesmo padrão de upload
 *  (FileReader → data URL) já usado em FeriasComprovanteUploader.tsx. */
export const EpiComprovanteUploader: React.FC<EpiComprovanteUploaderProps> = ({
  comprovanteUrl,
  nomeArquivo,
  onUpload,
  onRemove,
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpload(reader.result as string, file.name);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const isPdf = nomeArquivo?.toLowerCase().endsWith('.pdf') || comprovanteUrl?.startsWith('data:application/pdf');

  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <FileSignature className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-slate-800">Recibo de EPI Assinado pelo Recebedor</span>
        </div>
        {comprovanteUrl && (
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Anexado
          </span>
        )}
      </div>

      {comprovanteUrl ? (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
          <div
            onClick={() => setIsViewerOpen(true)}
            className="w-20 h-20 shrink-0 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer group relative hover:border-amber-400 transition-colors"
          >
            {isPdf ? (
              <FileText className="w-8 h-8 text-amber-600" />
            ) : (
              <img
                src={comprovanteUrl}
                alt="Recibo de EPI assinado"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            )}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Eye className="w-5 h-5" />
            </div>
          </div>

          <div className="flex-1 min-w-0 text-left">
            <div className="font-semibold text-xs text-slate-800 truncate">
              {nomeArquivo || 'Recibo_EPI_Assinado'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Recibo de entrega de EPI com a assinatura do recebedor, para fins de comprovação NR-6.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsViewerOpen(true)}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-[11px] font-bold flex items-center gap-1 border border-amber-200 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualizar</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors"
              >
                Substituir
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Remover recibo anexado"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center bg-white cursor-pointer hover:border-amber-500 hover:bg-amber-50/20 transition-colors"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 block">
            Clique para anexar a foto ou PDF do recibo assinado
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Formatos suportados: PNG, JPG, JPEG ou PDF (até 15MB)</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <ImageViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        imageUrl={comprovanteUrl}
        title="Recibo de Entrega de EPI Assinado"
        subtitle="Comprovação NR-6 — Departamento Pessoal"
        fileName={nomeArquivo}
      />
    </div>
  );
};
