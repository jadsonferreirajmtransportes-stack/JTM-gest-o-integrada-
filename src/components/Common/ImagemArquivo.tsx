import React from 'react';
import { useArquivoUrl } from '../../utils/arquivosStorage';

/** <img> pra campo de anexo — aceita data URL (formato antigo) ou referência "storage:"
 *  (Supabase Storage, ver arquivosStorage.ts). Enquanto o link assinado não chega, mostra só o
 *  fundo do container (className), sem imagem quebrada. */
export const ImagemArquivo: React.FC<{ valor?: string; alt: string; className?: string }> = ({
  valor,
  alt,
  className,
}) => {
  const { url } = useArquivoUrl(valor);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
};
