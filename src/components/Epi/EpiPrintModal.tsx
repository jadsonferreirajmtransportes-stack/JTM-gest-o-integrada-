import React from 'react';
import { X, Printer } from 'lucide-react';
import { Colaborador, EntregaEpi } from '../../types';
import { formatDate } from '../../utils/formatters';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';

interface EpiPrintModalProps {
  entrega: EntregaEpi | null;
  colaborador: Colaborador | null;
  onClose: () => void;
}

/** Recibo de Entrega de EPI pra impressão — o colaborador (recebedor) assina a via impressa,
 *  seguindo a mesma estrutura de "modal que é o próprio documento imprimível" já usada em
 *  EmployeeDetailModal.tsx (cabeçalho com ações `print:hidden`, corpo em `.jmt-print-doc`). O
 *  registro escrito de entrega de EPI é exigido pela NR-6 (Portaria 3.214/78, §6.7.1). */
export const EpiPrintModal: React.FC<EpiPrintModalProps> = ({ entrega, colaborador, onClose }) => {
  if (!entrega || !colaborador) return null;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:rounded-none print:border-0 print:shadow-none print:max-w-none">
        {/* Header (tela apenas) */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden shrink-0">
          <h2 className="text-sm font-bold text-slate-800">Recibo de Entrega de EPI — {colaborador.nomeCompleto}</h2>
          <div className="flex items-center gap-2">
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

        {/* Documento imprimível */}
        <div className="jmt-print-doc p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
          <PrintDocumentHeader
            titulo="RECIBO DE ENTREGA DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)"
            subtitulo={`${colaborador.nomeCompleto} — Matrícula ${colaborador.codigoMatricula}`}
            metadados={`Data da entrega: ${formatDate(entrega.data)}`}
          />

          <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-3">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Colaborador</span>
              <span className="font-bold text-slate-900">{colaborador.nomeCompleto}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Matrícula</span>
              <span className="font-bold text-slate-900">{colaborador.codigoMatricula}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Função / Cargo</span>
              <span className="font-bold text-slate-900">{colaborador.funcaoCargo}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Setor</span>
              <span className="font-bold text-slate-900">{colaborador.setor}</span>
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800">
                <th className="text-left py-1.5 pr-2">Descrição do EPI</th>
                <th className="text-left py-1.5 px-2">CA</th>
                <th className="text-right py-1.5 px-2">Qtd.</th>
                <th className="text-left py-1.5 pl-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {entrega.itens.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-1.5 pr-2 font-semibold">{item.descricao}</td>
                  <td className="py-1.5 px-2">{item.ca || '—'}</td>
                  <td className="py-1.5 px-2 text-right">{item.quantidade}</td>
                  <td className="py-1.5 pl-2">{item.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {entrega.observacoes && (
            <p>
              <span className="font-bold">Observações: </span>
              {entrega.observacoes}
            </p>
          )}

          <p className="pt-2 leading-relaxed text-justify">
            Declaro, para os devidos fins, que recebi da empresa <strong>{STRATEGIC_GUIDELINES.empresa}</strong> os
            Equipamentos de Proteção Individual (EPI) relacionados acima, em perfeito estado de conservação e
            funcionamento, comprometendo-me a: usá-los exclusivamente para a finalidade a que se destinam;
            responsabilizar-me pela sua guarda e conservação; comunicar imediatamente ao empregador qualquer
            alteração que os torne impróprios para uso; e cumprir as determinações do empregador sobre o uso
            adequado, conforme a NR-6 da Portaria nº 3.214/78 do Ministério do Trabalho.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-10">
            <div className="text-center">
              <div className="border-t border-slate-800 pt-1">
                <span className="font-bold">{colaborador.nomeCompleto}</span>
                <p className="text-[10px] text-slate-500">Assinatura do Recebedor</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-800 pt-1">
                <span className="font-bold">{entrega.responsavelEntrega || '—'}</span>
                <p className="text-[10px] text-slate-500">Responsável pela Entrega</p>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400">Data: {formatDate(entrega.data)}</p>

          <PrintDocumentFooter />
        </div>
      </div>
    </div>
  );
};
