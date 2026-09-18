import React, { useEffect, useState } from 'react';
import { ShieldCheck, ArrowLeft, AlertTriangle, Printer, Download, Loader2 } from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { EpiFichaDocumento, LinhaFichaEpi } from './EpiFichaDocumento';
import { obterEpiCompartilhadaPublica } from '../../utils/dpApi';
import { exportarElementoComoPdf } from '../../utils/pdfExportUtils';

const ELEMENT_ID = 'epi-ficha-publica';

interface EpiPublicViewProps {
  token?: string;
  onAdminBack?: () => void;
}

interface DadosEpiCompartilhados {
  colaboradorNome: string;
  funcaoCargo?: string;
  linhas: LinhaFichaEpi[];
}

/** Portal público (sem login) pra visualizar uma Ficha de EPI compartilhada por link — mesmo
 *  padrão do Link de Admissão / Ficha Cadastral / Notas: acessível direto pela URL, sem conta
 *  no sistema JMT. O conteúdo vem de uma "foto" (snapshot) tirada no momento em que o link foi
 *  gerado — ver gerarLinkEpiCompartilhado em dpApi.ts. */
export const EpiPublicView: React.FC<EpiPublicViewProps> = ({ token, onAdminBack }) => {
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<DadosEpiCompartilhados | null>(null);
  const [erro, setErro] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!token) {
      setCarregando(false);
      setErro(true);
      return;
    }
    (async () => {
      try {
        const resultado = await obterEpiCompartilhadaPublica(token);
        if (!ativo) return;
        if (resultado) {
          setDados(resultado as DadosEpiCompartilhados);
        } else {
          setErro(true);
        }
      } catch (e) {
        console.error('Erro ao carregar ficha de EPI compartilhada:', e);
        if (ativo) setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [token]);

  const handleBaixarPdf = async () => {
    if (!dados) return;
    setBaixando(true);
    try {
      await exportarElementoComoPdf(ELEMENT_ID, `Fornecimento_EPI_${dados.colaboradorNome}`);
    } catch (e) {
      console.error('Erro ao gerar PDF da ficha de EPI compartilhada:', e);
      alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 flex flex-col font-sans selection:bg-[#B38F4F] selection:text-white print:bg-white print:text-black">
      {/* Header */}
      <header className="bg-[#0c0c0c] border-b border-[#262626] sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <JmtLogo variant="compact" theme="dark" iconSize={32} />
          <div className="hidden sm:block pl-3 border-l border-[#262626]">
            <span className="bg-[#B38F4F]/15 text-[#B38F4F] border border-[#B38F4F]/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Ficha de EPI Compartilhada
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Visualização somente leitura — sem login</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dados && (
            <>
              <button
                type="button"
                onClick={handleBaixarPdf}
                disabled={baixando}
                className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-slate-200 border border-[#2a2a2a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {baixando ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B38F4F]" /> : <Download className="w-3.5 h-3.5 text-[#B38F4F]" />}
                <span>Baixar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-slate-200 border border-[#2a2a2a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#B38F4F]" />
                <span>Imprimir</span>
              </button>
            </>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
            <ShieldCheck className="w-4 h-4 text-[#B38F4F]" />
            <span>Gestão por Processos JMT</span>
          </div>
          {onAdminBack && (
            <button
              type="button"
              onClick={onAdminBack}
              className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-slate-200 border border-[#2a2a2a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#B38F4F]" />
              <span>Painel Admin</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:max-w-none">
        {carregando ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#B38F4F]" />
            <span className="text-xs">Carregando ficha de EPI...</span>
          </div>
        ) : erro || !dados ? (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-3">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Link inválido ou expirado</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Este link de ficha de EPI não é válido, já expirou ou foi revogado. Peça um novo link a quem
              compartilhou esta ficha com você.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden shadow-2xl print:rounded-none print:shadow-none">
            <EpiFichaDocumento
              elementId={ELEMENT_ID}
              colaboradorNome={dados.colaboradorNome}
              funcaoCargo={dados.funcaoCargo}
              linhas={dados.linhas || []}
            />
          </div>
        )}
      </main>
    </div>
  );
};
