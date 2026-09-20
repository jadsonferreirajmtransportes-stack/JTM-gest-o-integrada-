import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2, Printer, ShieldCheck } from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { obterNotaCompartilhadaPublica } from '../../utils/gestaoApi';
import { BlocoNota } from '../../types';

interface NotaPublicViewProps {
  token?: string;
  onAdminBack?: () => void;
}

const BlocoView: React.FC<{ bloco: BlocoNota }> = ({ bloco }) => {
  switch (bloco.tipo) {
    case 'titulo1':
      return bloco.texto ? <h2 className="text-xl font-black text-slate-900 mt-4">{bloco.texto}</h2> : null;
    case 'titulo2':
      return bloco.texto ? <h3 className="text-lg font-bold text-slate-900 mt-3">{bloco.texto}</h3> : null;
    case 'titulo3':
      return bloco.texto ? <h4 className="text-base font-bold text-slate-800 mt-2">{bloco.texto}</h4> : null;
    case 'lista':
      return bloco.texto ? <li className="text-sm text-slate-700 ml-5 list-disc">{bloco.texto}</li> : null;
    case 'lista_numerada':
      return bloco.texto ? <li className="text-sm text-slate-700 ml-5 list-decimal">{bloco.texto}</li> : null;
    case 'checklist':
      return bloco.texto ? (
        <div className="flex items-start gap-2 text-sm text-slate-700">
          <span className={bloco.concluido ? 'text-emerald-600' : 'text-slate-400'}>
            {bloco.concluido ? '☑' : '☐'}
          </span>
          <span className={bloco.concluido ? 'line-through text-slate-400' : ''}>{bloco.texto}</span>
        </div>
      ) : null;
    case 'citacao':
      return bloco.texto ? (
        <blockquote className="border-l-4 border-[#C48229] pl-3 text-sm italic text-slate-600">
          {bloco.texto}
        </blockquote>
      ) : null;
    case 'callout':
      return bloco.texto ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
          💡 {bloco.texto}
        </div>
      ) : null;
    case 'divisor':
      return <hr className="border-slate-200 my-2" />;
    case 'imagem':
      return bloco.imagemUrl ? (
        <figure className="space-y-1">
          <img src={bloco.imagemUrl} alt={bloco.imagemNome || 'Imagem'} className="max-w-full rounded-lg border border-slate-200" />
          {bloco.texto && <figcaption className="text-xs text-slate-500">{bloco.texto}</figcaption>}
        </figure>
      ) : null;
    case 'documento':
      return bloco.imagemUrl ? (
        <a
          href={bloco.imagemUrl}
          download={bloco.imagemNome}
          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
        >
          📎 {bloco.imagemNome || 'Documento anexado'}
        </a>
      ) : null;
    case 'tabela':
      if (!bloco.tabelaColunas?.length) return null;
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                {bloco.tabelaColunas.map((col, i) => (
                  <th key={i} className="px-3 py-2 text-left font-bold text-slate-700 border-b border-slate-200">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(bloco.tabelaLinhas || []).map((linha, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {linha.map((celula, j) => (
                    <td key={j} className="px-3 py-2 text-slate-700">
                      {celula}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'fluxograma':
      return (
        <p className="text-xs text-slate-400 italic">
          ⬡ Este bloco é um fluxograma — abra no sistema pra visualizar o diagrama completo.
        </p>
      );
    case 'texto':
    default:
      return bloco.texto ? <p className="text-sm text-slate-700 whitespace-pre-wrap">{bloco.texto}</p> : null;
  }
};

/** Portal público (sem login) para visualizar uma página de Notas & Ideias compartilhada por
 *  link — mesmo padrão da Ficha Cadastral / Instrução de Trabalho / Formulário de Ocorrências.
 *  O conteúdo vem de uma "foto" (snapshot) tirada no momento em que o link foi gerado — ver
 *  gerarLinkNotaCompartilhada em gestaoApi.ts. */
export const NotaPublicView: React.FC<NotaPublicViewProps> = ({ token, onAdminBack }) => {
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<{ titulo: string; icone?: string; blocos: BlocoNota[] } | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!token) {
      setCarregando(false);
      setErro(true);
      return;
    }
    (async () => {
      try {
        const resultado = await obterNotaCompartilhadaPublica(token);
        if (!ativo) return;
        if (resultado) {
          setDados(resultado as { titulo: string; icone?: string; blocos: BlocoNota[] });
        } else {
          setErro(true);
        }
      } catch (e) {
        console.error('Erro ao carregar página compartilhada:', e);
        if (ativo) setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans print:bg-white">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <JmtLogo variant="compact" theme="light" iconSize={32} />
          <div className="hidden sm:block pl-3 border-l border-slate-200">
            <span className="bg-amber-50 text-[#92611F] border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Página Compartilhada
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Visualização somente leitura — sem login</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dados && (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#92611F]" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-[#92611F]" />
            <span>Notas & Ideias JMT</span>
          </div>
          {onAdminBack && (
            <button
              type="button"
              onClick={onAdminBack}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#92611F]" />
              <span>Painel Admin</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:max-w-none">
        {carregando ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#C48229]" />
            <span className="text-xs">Carregando página...</span>
          </div>
        ) : erro || !dados ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center space-y-3">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Link inválido ou expirado</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Este link não é válido, já expirou ou foi revogado. Peça um novo link a quem compartilhou essa página
              com você.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-2 print:rounded-none print:border-none print:shadow-none">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-4">
              {dados.icone && <span>{dados.icone}</span>}
              <span>{dados.titulo || 'Sem título'}</span>
            </h1>
            <div className="space-y-2">
              {dados.blocos.map((bloco) => (
                <BlocoView key={bloco.id} bloco={bloco} />
              ))}
              {dados.blocos.length === 0 && (
                <p className="text-sm text-slate-400 italic">Esta página está em branco.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
