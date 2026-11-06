import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, ImageIcon, Loader2, Mail, X } from 'lucide-react';
import type { CustoExtra } from '../../utils/custosExtrasApi';
import { baixarBlob } from '../../utils/downloadUtils';
import { assuntoEmail, htmlResumoEmail, imagemResumoEmail, textoResumoEmail } from './resumoEmail';

/** Copia o e-mail formatado (com as tabelas). Primeiro pelo "copiar" do próprio navegador sobre um
 *  bloco com o HTML (funciona em qualquer navegador, na hora do clique); se não der, pela API nova. */
async function copiarHtml(html: string, texto: string): Promise<boolean> {
  const bloco = document.createElement('div');
  bloco.contentEditable = 'true';
  bloco.innerHTML = html;
  bloco.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;background:#fff';
  document.body.appendChild(bloco);
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(bloco);
    sel?.removeAllRanges();
    sel?.addRange(range);
    const ok = document.execCommand('copy');
    sel?.removeAllRanges();
    if (ok) return true;
  } catch {
    /* tenta a API nova */
  } finally {
    bloco.remove();
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([texto], { type: 'text/plain' }) })]);
    return true;
  } catch {
    return false;
  }
}

/** Imagem do resumo + texto pronto para o corpo do e-mail de validação. */
export const EmailResumoModal: React.FC<{
  empresa: string;
  itens: (CustoExtra & { uf?: string; notasDetalhe?: { cte?: string; nf?: string; destinatario?: string }[] })[];
  envioId: string;
  email?: string;
  planilhaBaixada?: string;
  onClose: () => void;
}> = ({ empresa, itens, envioId, email, planilhaBaixada, onClose }) => {
  const [imagem, setImagem] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [texto, setTexto] = useState(() => textoResumoEmail(empresa, itens, envioId));
  const [assunto, setAssunto] = useState(() => assuntoEmail(empresa, itens));
  const [aviso, setAviso] = useState<string | null>(null);
  const [colar, setColar] = useState(false);
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
    window.open(`mailto:${email || ''}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`);
  };
  /** Abre o Gmail do navegador (nova aba) com destinatário e assunto, e deixa o e-mail com as tabelas
   *  copiado: é só clicar no corpo e colar (Ctrl+V). */
  const abrirGmail = async () => {
    // O Gmail só recebe texto simples pelo link: as tabelas vão pela área de transferência.
    const copiou = await copiarHtml(htmlResumoEmail(empresa, itens, envioId, texto), texto);
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email || '')}&su=${encodeURIComponent(assunto)}${copiou ? '' : `&body=${encodeURIComponent(texto)}`}`;
    window.open(url, '_blank', 'noopener');
    if (copiou) setColar(true);
    else setErro('Este navegador não deixou copiar as tabelas: o Gmail abriu só com o texto. Use "Copiar com tabelas" e cole no corpo do e-mail.');
  };
  /** Copia o e-mail com as tabelas CT-E | NF (cola formatado no Gmail/Outlook). */
  const copiarComTabelas = async () => {
    if (await copiarHtml(htmlResumoEmail(empresa, itens, envioId, texto), texto)) avisar('E-mail com tabelas copiado — cole (Ctrl+V) no corpo do e-mail.');
    else await copiarTexto();
  };
  const copiarAssunto = async () => {
    try {
      await navigator.clipboard.writeText(assunto);
      avisar('Assunto copiado.');
    } catch {
      setErro('Não consegui copiar o assunto — selecione e copie com Ctrl+C.');
    }
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
            <span className="text-xs font-bold text-slate-600 block mb-1">Assunto</span>
            <div className="flex gap-2">
              <input value={assunto} onChange={(e) => setAssunto(e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold" />
              <button type="button" onClick={copiarAssunto} className={`${botao} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
                <Copy className="w-4 h-4" /> Copiar
              </button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-600">Texto do e-mail (pode editar)</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copiarComTabelas} className={`${botao} bg-[#C48229] hover:bg-[#92611F] text-white`} title="Copia o texto com as tabelas CT-E | NF de cada destinatário, como nos e-mails da equipe">
                  <Copy className="w-4 h-4" /> Copiar com tabelas
                </button>
                <button type="button" onClick={copiarTexto} className={`${botao} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
                  <Copy className="w-4 h-4" /> Só o texto
                </button>
                <button type="button" onClick={abrirGmail} className={`${botao} bg-emerald-700 hover:bg-emerald-800 text-white`} title="Abre o Gmail deste navegador com o destinatário e o assunto; o texto com as tabelas fica copiado para colar">
                  <Mail className="w-4 h-4" /> Abrir e-mail
                </button>
                <button type="button" onClick={abrirEmail} className={`${botao} border border-slate-200 text-slate-700 hover:bg-slate-50`} title="Abre o programa de e-mail do computador (Outlook etc.)">
                  Outro programa
                </button>
              </div>
            </div>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={12} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono" />
          </div>

          {colar && (
            <div className="p-4 bg-amber-50 border-2 border-[#C48229] rounded-xl text-sm text-slate-800 space-y-1">
              <p className="font-black text-[#92611F]">Gmail aberto em outra aba. Falta colar o corpo:</p>
              <p>
                1. No Gmail, clique dentro do corpo do e-mail e aperte <b>Ctrl+V</b> — entram o texto e as tabelas CT-E | NF.
              </p>
              <p>2. (Opcional) Volte aqui, clique em <b>Copiar imagem</b> e cole embaixo.</p>
              <p>3. Anexe a planilha baixada e envie.</p>
              <button type="button" onClick={() => setColar(false)} className="text-xs font-bold text-[#92611F] hover:underline">
                Entendi
              </button>
            </div>
          )}
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
