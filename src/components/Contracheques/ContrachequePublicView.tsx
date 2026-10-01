import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Download, FileSignature } from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { AssinaturaDigitalPad } from '../Epi/AssinaturaDigitalPad';
import {
  abrirDocumentoPublico,
  assinarDocumentoPublico,
  DocumentoPublico,
  ErroDocumentoPublico,
} from '../../utils/documentosAssinaturaApi';
import { carregarPdfJs } from './contrachequePdfUtils';

interface ContrachequePublicViewProps {
  token?: string;
  /** Título da tela antes de abrir (ainda não se sabe o tipo do documento sem o CPF). */
  rotulo?: string;
}

/** Texto que o colaborador declara ao assinar — varia pelo tipo de documento. */
function montarDeclaracao(doc: DocumentoPublico): string {
  if (doc.categoria === 'disciplinar') {
    return `Declaro que recebi e tomei ciência do documento "${doc.titulo}". Estou ciente de que a minha assinatura indica apenas o recebimento e a ciência desta comunicação, e não a concordância com o seu conteúdo.`;
  }
  if (doc.categoria === 'regulamento') {
    return `Declaro que recebi, li e tomei conhecimento do ${doc.titulo} e que me comprometo a cumpri-lo.`;
  }
  if (doc.categoria === 'ferias' && doc.tipo === 'Aviso de Férias') {
    return `Declaro que recebi o ${doc.titulo} e que estou ciente do período de férias nele informado.`;
  }
  if (doc.categoria === 'ferias') {
    return `Declaro que recebi o ${doc.titulo}, que conferi os valores e que dou quitação conforme o recibo.`;
  }
  return `Declaro que recebi o ${doc.titulo} e que conferi as informações nele contidas.`;
}

const MENSAGENS_ERRO: Record<ErroDocumentoPublico, string> = {
  nao_encontrado: 'Este link não é válido. Peça um novo link ao Departamento Pessoal.',
  cpf: 'O CPF informado não confere com o cadastro. Confira os números e tente de novo.',
  expirado: 'Este link venceu. Peça ao Departamento Pessoal para renovar — o mesmo link volta a funcionar.',
  ja_assinado: 'Este documento já foi assinado.',
  assinatura_invalida: 'Não foi possível registrar a assinatura. Limpe e assine de novo.',
};

function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Desenha as páginas do PDF em <canvas> — no celular um PDF dentro de <iframe> muitas vezes
 *  não aparece (só oferece baixar), e o colaborador precisa conseguir LER antes de assinar. */
export const PdfEmTela: React.FC<{ url: string }> = ({ url }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const pdfjs = await carregarPdfJs();
        const pdf = await pdfjs.getDocument({ url }).promise;
        const container = containerRef.current;
        if (!container || cancelado) return;
        container.replaceChildren();
        const largura = container.clientWidth || 360;
        for (let i = 1; i <= pdf.numPages; i++) {
          const pagina = await pdf.getPage(i);
          const base = pagina.getViewport({ scale: 1 });
          const escala = (largura / base.width) * (window.devicePixelRatio || 1);
          const viewport = pagina.getViewport({ scale: escala });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '8px';
          canvas.style.background = '#fff';
          container.appendChild(canvas);
          // intent 'print' desenha de uma vez, sem depender de requestAnimationFrame (pausado
          // quando o celular está com a aba em segundo plano).
          await pagina.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport, intent: 'print' }).promise;
        }
        if (!cancelado) setEstado('ok');
      } catch (err) {
        console.error('Erro ao mostrar o PDF:', err);
        if (!cancelado) setEstado('erro');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [url]);

  return (
    <div>
      {estado === 'carregando' && (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" /> Carregando o documento...
        </div>
      )}
      {estado === 'erro' && (
        <p className="py-6 text-center text-xs text-slate-500">
          Não foi possível mostrar o documento aqui. Use o botão <strong>Baixar PDF</strong> para abrir.
        </p>
      )}
      <div ref={containerRef} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100" />
    </div>
  );
};

/** Tela pública (sem login) do link ?form=contracheque&token=... — o colaborador confirma o
 *  CPF, lê o contracheque, marca a declaração e assina com o dedo. Tudo passa pelas funções
 *  abrir/assinar_documento_assinatura do banco (migração 057), que conferem token + CPF. */
export const ContrachequePublicView: React.FC<ContrachequePublicViewProps> = ({ token, rotulo = 'Seu contracheque' }) => {
  const [cpf, setCpf] = useState('');
  const [abrindo, setAbrindo] = useState(false);
  const [documento, setDocumento] = useState<DocumentoPublico | null>(null);
  const [erro, setErro] = useState<string | null>(token ? null : MENSAGENS_ERRO.nao_encontrado);
  const [concordo, setConcordo] = useState(false);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [assinando, setAssinando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const declaracao = documento ? montarDeclaracao(documento) : '';

  const handleAbrir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErro(null);
    setAbrindo(true);
    try {
      const { documento: doc, erro: codigo } = await abrirDocumentoPublico(token, cpf);
      if (codigo) setErro(MENSAGENS_ERRO[codigo]);
      else if (doc) setDocumento(doc);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível abrir agora. Verifique sua internet e tente de novo.');
    } finally {
      setAbrindo(false);
    }
  };

  const handleAssinar = async () => {
    if (!token || !documento || !assinatura || !concordo) return;
    setErro(null);
    setAssinando(true);
    try {
      const { assinadoEm, erro: codigo } = await assinarDocumentoPublico(token, cpf, assinatura, declaracao);
      if (codigo && codigo !== 'ja_assinado') {
        setErro(MENSAGENS_ERRO[codigo]);
      } else {
        setDocumento({ ...documento, status: 'Assinado', assinadoEm });
      }
    } catch (err) {
      console.error(err);
      setErro('Não foi possível registrar a assinatura. Verifique sua internet e tente de novo.');
    } finally {
      setAssinando(false);
    }
  };

  const handleBaixar = async () => {
    if (!documento?.arquivoLink) return;
    setBaixando(true);
    try {
      const resposta = await fetch(documento.arquivoLink);
      const blob = await resposta.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = documento.arquivoNome || 'contracheque.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch (err) {
      console.error(err);
      window.open(documento.arquivoLink, '_blank', 'noopener');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <JmtLogo variant="compact" theme="light" iconSize={28} />
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#C48229]" /> Acesso seguro
        </span>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {!documento ? (
          <form onSubmit={handleAbrir} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">{rotulo}</h1>
                <p className="text-xs text-slate-500">Para sua segurança, confirme seu CPF para abrir.</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">CPF</label>
              <input
                value={cpf}
                onChange={(e) => setCpf(mascararCpf(e.target.value))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                className="w-full p-3 border border-slate-300 rounded-xl text-base tracking-wide"
              />
            </div>
            {erro && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={!token || cpf.replace(/\D/g, '').length !== 11 || abrindo}
              className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {abrindo && <Loader2 className="w-4 h-4 animate-spin" />}
              Abrir documento
            </button>
          </form>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-base font-bold text-slate-900">{documento.titulo}</h1>
                  <p className="text-xs text-slate-500">{documento.colaboradorNome}</p>
                </div>
                {documento.arquivoLink && (
                  <button
                    type="button"
                    onClick={handleBaixar}
                    disabled={baixando}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    {baixando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#92611F]" />}
                    Baixar PDF
                  </button>
                )}
              </div>
              {documento.arquivoLink && <PdfEmTela url={documento.arquivoLink} />}
            </div>

            {documento.status === 'Assinado' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-1.5">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-emerald-800">Assinatura registrada</p>
                {documento.assinadoEm && (
                  <p className="text-xs text-emerald-700">
                    Em {new Date(documento.assinadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
                    Obrigado!
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={concordo}
                    onChange={(e) => setConcordo(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#C48229]"
                  />
                  <span className="text-slate-700 font-medium">{declaracao}</span>
                </label>
                <AssinaturaDigitalPad onChange={setAssinatura} />
                {erro && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAssinar}
                  disabled={!concordo || !assinatura || assinando}
                  className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {assinando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Assinar
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  Ao assinar, ficam registrados a data, a hora e a confirmação do seu CPF.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
