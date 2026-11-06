import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import type { MensagemChat } from '../../types';
import { getAnexoMensagem } from '../../utils/chatApi';
import { obterUrlArquivo } from '../../utils/arquivosStorage';

// Anexo de uma mensagem — o histórico vem sem o conteúdo do arquivo (ver getMensagens). Imagem
// busca sozinha ao aparecer (pra miniatura), documento só quando clicado; os dois ficam em cache
// na sessão (getAnexoMensagem), então reabrir a conversa não baixa de novo.
export const AnexoDaMensagem: React.FC<{
  mensagem: MensagemChat;
  ehImagem: boolean;
  propria: boolean;
  onAbrir: (url: string) => void;
}> = ({ mensagem, ehImagem, propria, onAbrir }) => {
  // Anexo antigo vem em base64; os movidos para o Storage vêm como "storage:..." (link assinado).
  const [url, setUrl] = useState<string | undefined>(mensagem.anexoUrl?.startsWith('storage:') ? undefined : mensagem.anexoUrl);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const buscar = async (): Promise<string | undefined> => {
    if (url) return url;
    setCarregando(true);
    setFalhou(false);
    try {
      const bruto = mensagem.anexoUrl || (await getAnexoMensagem(mensagem.id)) || undefined;
      const encontrado = bruto ? await obterUrlArquivo(bruto) : undefined;
      setUrl(encontrado);
      if (!encontrado) setFalhou(true);
      return encontrado;
    } catch (err) {
      console.error('Erro ao carregar anexo da mensagem:', err);
      setFalhou(true);
      return undefined;
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (ehImagem && !url) buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem.id]);

  const handleClick = async () => {
    const encontrado = await buscar();
    if (encontrado) onAbrir(encontrado);
  };

  return (
    <button type="button" onClick={handleClick} className="block mb-1.5 rounded-lg overflow-hidden">
      {ehImagem && url ? (
        <img
          src={url}
          alt={mensagem.anexoNome || 'Imagem anexada'}
          className="max-w-full max-h-48 rounded-lg object-cover"
        />
      ) : (
        <span
          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold ${
            propria ? 'bg-white/15 text-white' : 'bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {carregando
              ? 'Carregando anexo...'
              : falhou
                ? 'Não foi possível carregar — clique pra tentar de novo'
                : mensagem.anexoNome || (ehImagem ? 'Imagem' : 'Documento')}
          </span>
        </span>
      )}
    </button>
  );
};
