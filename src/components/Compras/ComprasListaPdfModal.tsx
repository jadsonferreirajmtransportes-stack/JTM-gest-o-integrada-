import React, { useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { SolicitacaoCompra } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportarElementoComoPdf } from '../../utils/pdfExportUtils';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

const ELEMENT_ID = 'compras-lista-pdf-doc';

interface ComprasListaPdfModalProps {
  /** Já filtrada pelo status escolhido na tela (Pendente/Aprovado/Comprado/Recusado/Todas) —
   *  a lista impressa é sempre "o que está sendo visto agora", pra bater com o que a pessoa
   *  já selecionou antes de pedir o PDF (ex.: filtrar "Aprovado" pra levar pra loja). */
  itens: SolicitacaoCompra[];
  filtroLabel: string;
  onClose: () => void;
}

/** PDF/impressão da lista de compras — mesmo padrão de EpiPrintModal.tsx (Baixar PDF via
 *  html2canvas+jsPDF, Imprimir via window.print()) e cabeçalho/rodapé institucional
 *  (PrintDocumentChrome) já usado nos demais documentos do sistema. */
export const ComprasListaPdfModal: React.FC<ComprasListaPdfModalProps> = ({ itens, filtroLabel, onClose }) => {
  const [baixando, setBaixando] = useState(false);

  const totalEstimado = itens.reduce((soma, s) => soma + (s.valorEstimado || 0), 0);

  const handlePrint = () => window.print();

  const handleBaixarPdf = async () => {
    setBaixando(true);
    try {
      const data = new Date().toISOString().slice(0, 10);
      await exportarElementoComoPdf(ELEMENT_ID, `Lista_de_Compras_${filtroLabel}_${data}`);
    } catch (err) {
      console.error('Erro ao gerar PDF da lista de compras:', err);
      alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:rounded-none print:border-0 print:shadow-none print:max-w-none">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden shrink-0">
          <h2 className="text-sm font-bold text-slate-800">Lista de Compras — {filtroLabel}</h2>
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
              className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
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
          <div id={ELEMENT_ID} className="jmt-print-doc bg-white text-slate-900 p-6 text-xs">
            <PrintDocumentHeader
              titulo="LISTA DE COMPRAS"
              subtitulo={filtroLabel}
              metadados={`${itens.length} ite${itens.length === 1 ? 'm' : 'ns'}`}
            />

            {itens.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Nenhum item nesta lista.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-left">
                    <th className="py-2 pr-2">Item</th>
                    <th className="py-2 px-2 text-center">Qtd.</th>
                    <th className="py-2 px-2">Urgência</th>
                    <th className="py-2 px-2">Solicitante</th>
                    <th className="py-2 pl-2 text-right">Valor Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((s) => (
                    <tr key={s.id} className="border-b border-slate-200">
                      <td className="py-2 pr-2 font-semibold">{s.item}</td>
                      <td className="py-2 px-2 text-center">{s.quantidade}</td>
                      <td className="py-2 px-2">{s.urgencia}</td>
                      <td className="py-2 px-2">
                        {s.solicitanteNome}
                        {s.criadoEm ? ` — ${formatDate(s.criadoEm.slice(0, 10))}` : ''}
                      </td>
                      <td className="py-2 pl-2 text-right">
                        {s.valorEstimado !== undefined ? formatCurrency(s.valorEstimado) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="pt-3 text-right font-bold">
                      Total estimado
                    </td>
                    <td className="pt-3 pl-2 text-right font-bold">{formatCurrency(totalEstimado)}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            <PrintDocumentFooter />
          </div>
        </div>
      </div>
    </div>
  );
};
