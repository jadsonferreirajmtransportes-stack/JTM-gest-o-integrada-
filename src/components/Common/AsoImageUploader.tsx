import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  FileCheck,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { ImageViewerModal } from './ImageViewerModal';

interface AsoImageUploaderProps {
  asoImagemUrl?: string;
  asoNomeArquivo?: string;
  onImageChange: (dataUrl: string, fileName: string) => void;
  onImageRemove: () => void;
  readOnly?: boolean;
}

export const AsoImageUploader: React.FC<AsoImageUploaderProps> = ({
  asoImagemUrl,
  asoNomeArquivo,
  onImageChange,
  onImageRemove,
  readOnly = false,
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // O ASO fica gravado como base64 numa coluna do próprio cadastro do colaborador (não num
  // storage de arquivos separado) — um arquivo grande demais nessa mesma gravação estoura o
  // tempo limite da instrução SQL no banco. Ver mesmo limite em EmployeeDossierSection.tsx.
  const LIMITE_MB = 8;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroUpload(null);

    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB > LIMITE_MB) {
      setErroUpload(
        `"${file.name}" tem ${tamanhoMB.toFixed(1)}MB — o limite é ${LIMITE_MB}MB. Comprima a imagem/PDF ou tire uma foto em resolução menor.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onImageChange(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const isPdf = asoNomeArquivo?.toLowerCase().endsWith('.pdf') || asoImagemUrl?.startsWith('data:application/pdf');

  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Stethoscope className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-slate-800">
            Comprovante Digitalizado do ASO (Imagem / PDF)
          </span>
        </div>
        {asoImagemUrl && (
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Anexado
          </span>
        )}
      </div>

      {asoImagemUrl ? (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
          {/* Thumbnail */}
          <div
            onClick={() => setIsViewerOpen(true)}
            className="w-20 h-20 shrink-0 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer group relative hover:border-amber-400 transition-colors"
          >
            {isPdf ? (
              <FileText className="w-8 h-8 text-amber-600" />
            ) : (
              <img
                src={asoImagemUrl}
                alt="ASO Digitalizado"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            )}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Eye className="w-5 h-5" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 text-left">
            <div className="font-semibold text-xs text-slate-800 truncate">
              {asoNomeArquivo || 'Comprovante_ASO_Digitalizado'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Documento anexado para comprovação regulatória ANVISA RDC 430 & CLT.
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

              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors"
                  >
                    Substituir
                  </button>
                  <button
                    type="button"
                    onClick={onImageRemove}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Remover anexo do ASO"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !readOnly && fileInputRef.current?.click()}
          className={`p-4 border-2 border-dashed border-slate-300 rounded-lg text-center bg-white transition-colors ${
            !readOnly ? 'cursor-pointer hover:border-amber-500 hover:bg-amber-50/20' : ''
          }`}
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 block">
            Clique para carregar a foto ou PDF do ASO
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Formatos suportados: PNG, JPG, JPEG ou PDF (até {LIMITE_MB}MB)
          </span>
        </div>
      )}

      {erroUpload && (
        <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 font-semibold flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{erroUpload}</span>
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
        imageUrl={asoImagemUrl}
        title="Atestado de Saúde Ocupacional (ASO)"
        subtitle="Rastreabilidade Sanitária & Medicina do Trabalho"
        fileName={asoNomeArquivo}
      />
    </div>
  );
};
