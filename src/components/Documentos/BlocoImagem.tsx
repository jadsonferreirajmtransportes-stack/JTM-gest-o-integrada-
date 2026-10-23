import React, { useState } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import type { BlocoDocumento } from '../../utils/documentosPadronizadosApi';
import { enviarArquivo, useArquivoUrl } from '../../utils/arquivosStorage';

type BlocoImg = Extract<BlocoDocumento, { tipo: 'imagem' }>;

const LIMITE_MB = 8;

/** Bloco de imagem do documento padronizado: prévia, tamanho na página, legenda e troca do
 *  arquivo (vai para o Storage privado "anexos", pasta documentos/imagens). */
export const BlocoImagem: React.FC<{ bloco: BlocoImg; somenteLeitura: boolean; onChange: (b: BlocoImg) => void }> = ({ bloco: b, somenteLeitura, onChange }) => {
  const { url, carregando } = useArquivoUrl(b.ref || null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (arquivo?: File) => {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) return setErro('Escolha uma imagem (JPG ou PNG).');
    if (arquivo.size > LIMITE_MB * 1024 * 1024) return setErro(`A imagem passa de ${LIMITE_MB} MB.`);
    setEnviando(true);
    setErro(null);
    try {
      onChange({ ...b, ref: await enviarArquivo(arquivo, 'documentos/imagens') });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  };

  const largura = b.largura || 100;
  return (
    <div className="space-y-2">
      {b.ref ? (
        <div className="flex justify-center bg-slate-50 rounded-lg p-2">
          {carregando || !url ? (
            <span className="py-8 text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando imagem...
            </span>
          ) : (
            <img src={url} alt={b.legenda || 'Imagem do documento'} style={{ width: `${largura}%` }} className="rounded border border-slate-200 bg-white" />
          )}
        </div>
      ) : (
        <div className="py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 flex flex-col items-center gap-1">
          <ImageIcon className="w-6 h-6 text-slate-300" /> Nenhuma imagem ainda
        </div>
      )}
      {b.legenda && somenteLeitura && <p className="text-center text-xs italic text-slate-500">{b.legenda}</p>}
      {!somenteLeitura && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <label className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 flex items-center gap-1">
            {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {b.ref ? 'Trocar imagem' : 'Enviar imagem'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => enviar(e.target.files?.[0])} />
          </label>
          <select
            value={largura}
            onChange={(e) => onChange({ ...b, largura: Number(e.target.value) as 50 | 75 | 100 })}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 font-semibold"
            title="Tamanho da imagem na página"
          >
            <option value={50}>Metade da largura</option>
            <option value={75}>3/4 da largura</option>
            <option value={100}>Largura inteira</option>
          </select>
          <input
            value={b.legenda || ''}
            onChange={(e) => onChange({ ...b, legenda: e.target.value || undefined })}
            placeholder="Legenda (opcional) — ex.: Exemplo correto de preenchimento LUFT"
            data-texto-livre
            className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700"
          />
          {erro && <span className="w-full text-rose-600 font-semibold">{erro}</span>}
        </div>
      )}
    </div>
  );
};
