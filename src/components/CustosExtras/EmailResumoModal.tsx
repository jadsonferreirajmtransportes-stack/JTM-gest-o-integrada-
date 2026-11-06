import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, ImageIcon, Loader2, Mail, X } from 'lucide-react';
import type { CustoExtra } from '../../utils/custosExtrasApi';
import { baixarBlob } from '../../utils/downloadUtils';
import { imagemResumoEmail, textoResumoEmail } from './resumoEmail';

/** Imagem do resumo + texto pronto para o corpo do e-mail de validação. */
export const EmailResumoModal: React.FC<{
  empresa: string;
  itens: (CustoExtra & { uf?: string })[];
  envioId: string;
  email?: string;
  planilhaBaixada?: string;
  onClose: () => void;
}> = ({ empresa, itens, envioId, email, planilhaBaixada, onClose }) => {
  const [imagem, setImagem] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [texto, setTexto] = useState(() => textoResumoEmail(empresa, itens, envioId));
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let link = '';
    imagemResumoEmail(empresa, itens, envioId)
      .then((b) => {
        if (!vivo) return;
        link = URL.createObjectURL(b);
        setImagem(b);
        setUrl(link);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não consegui gerar a imagem.'));
    return () => {
      vivo = false;
      if (link) URL.revokeObjectURL(link);
    };
  }, [empresa, itens, envioId]);

  const avisar = (m: string) => {
    setAviso(m);
    setTimeout(() => setAviso(null), 2500);
  };
  const nomeImagem = `Resumo_Custos_Extras_${empresa.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40)}_${envioId}.png`;

  const copiarImagem = async () => {
    if (!imagem) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': imagem })]);
      avisar('Imagem copiada — cole (Ctrl+V) no corpo do e-mail.');
    } catch {
      baixarBlob(imagem, nomeImagem);
      avisar('Este navegador não deixou copiar: a imagem foi baixada.');
    }
  };
  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar('Texto copiado.');
    } catch {
      setErro('Não consegui copiar o texto — selecione e copie com Ctrl+C.');
    }
  };
  const abrirEmail = () => {
    window.open(`mailto:${email || ''}?subject=${encodeURIComponent(`Validação de custos extras — ${empresa} (${envioId})`)}&body=${encodeURIComponent(texto)}`);
  };

  const botao = 'px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50';
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#C48229]" /> E-mail de validação — {empresa}
            </h2>
            <p className="text-xs text-slate-500">
              {planilhaBaixada ? `Planilha "${planilhaBaixada}" baixada. ` : ''}Cole a imagem e o texto no corpo do e-mail e anexe a planilha.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" /> Imagem do resumo
              </span>
              <div className="flex gap-2">
                <button type="button" disabled={!imagem} onClick={copiarImagem} className={`${botao} bg-[#C48229] hover:bg-[#92611F] text-white`}>
                  <Copy className="w-4 h-4" /> Copiar imagem
                </button>
                <button type="button" disabled={!imagem} onClick={() => imagem && baixarBlob(imagem, nomeImagem)} className={`${botao} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
                  <Download className="w-4 h-4" /> Baixar imagem
                </button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl bg-slate-50 p-2 flex justify-center">
              {url ? (
                <img src={url} alt="Resumo dos custos extras" className="max-w-full h-auto rounded" />
              ) : (
                <p className="py-10 text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" /> Gerando a imagem...
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-600">Texto do e-mail (pode editar)</span>
              <div className="flex gap-2">
                <button type="button" onClick={copiarTexto} className={`${botao} bg-[#C48229] hover:bg-[#92611F] text-white`}>
                  <Copy className="w-4 h-4" /> Copiar texto
                </button>
                <button type="button" onClick={abrirEmail} className={`${botao} bg-emerald-700 hover:bg-emerald-800 text-white`} title="Abre o programa de e-mail com o assunto e o texto (cole a imagem e anexe a planilha)">
                  <Mail className="w-4 h-4" /> Abrir e-mail
                </button>
              </div>
            </div>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={12} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono" />
          </div>

          {aviso && (
            <p className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4" /> {aviso}
            </p>
          )}
          {erro && <p className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
        </div>
      </div>
    </div>
  );
};
