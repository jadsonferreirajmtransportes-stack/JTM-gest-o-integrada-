import React, { useMemo, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { EntregaEpi } from '../../types';
import { EpiFichaDocumento, LinhaFichaEpi } from './EpiFichaDocumento';
import { exportarElementoComoPdf } from '../../utils/pdfExportUtils';

const ELEMENT_ID = 'epi-ficha-documento';

interface EpiPrintModalProps {
  /** Nome de quem recebeu — de um Colaborador cadastrado ou digitado (recebedorNomeLivre,
   *  colaborador de verdade que a empresa optou por não cadastrar no sistema). */
  nome: string;
  funcaoCargo?: string;
  /** TODAS as entregas já registradas pra essa pessoa — a ficha é corrida (acumula tudo), não
   *  um recibo de um evento só. */
  entregas: EntregaEpi[];
  onClose: () => void;
}

/** Ficha de EPI pra impressão/PDF — ver EpiFichaDocumento.tsx pra estrutura visual (réplica do
 *  formulário de papel real da JMT). Aqui só monta as linhas achatadas (uma por item, ordenadas
 *  por data de entrega) e oferece Imprimir (window.print()) e Baixar PDF (html2canvas+jsPDF). */
export const EpiPrintModal: React.FC<EpiPrintModalProps> = ({ nome, funcaoCargo, entregas, onClose }) => {
  const [baixando, setBaixando] = useState(false);

  const linhas = useMemo<LinhaFichaEpi[]>(() => {
    return [...entregas]
      .sort((a, b) => a.data.localeCompare(b.data))
      .flatMap((entrega) =>
        entrega.itens.map((item) => ({
          descricao: item.tamanho ? `${item.descricao} — Tam. ${item.tamanho}` : item.descricao,
          ca: item.ca,
          entrega: entrega.data,
          devolucao: item.devolucao,
          assinaturaDigitalUrl: entrega.assinaturaDigitalUrl,
        }))
      );
  }, [entregas]);

  const handlePrint = () => window.print();

  const handleBaixarPdf = async () => {
    setBaixando(true);
    try {
      await exportarElementoComoPdf(ELEMENT_ID, `Fornecimento_EPI_${nome}`);
    } catch (err) {
      console.error('Erro ao gerar PDF da ficha de EPI:', err);
      alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:rounded-none print:border-0 print:shadow-none print:max-w-none">
        {/* Header (tela apenas) */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden shrink-0">
          <h2 className="text-sm font-bold text-slate-800">Ficha de EPI — {nome}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBaixarPdf}
              disabled={baixando}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
            >
              {baixando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Baixar PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <EpiFichaDocumento elementId={ELEMENT_ID} colaboradorNome={nome} funcaoCargo={funcaoCargo} linhas={linhas} />
        </div>
      </div>
    </div>
  );
};
