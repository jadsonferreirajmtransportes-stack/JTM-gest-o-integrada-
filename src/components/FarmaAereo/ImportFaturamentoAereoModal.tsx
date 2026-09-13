import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Cliente, LancamentoFaturamentoAereo, FaturaAereo } from '../../types';
import {
  readSpreadsheetFile,
  mapRowsToFaturamentoAereo,
  ImportacaoFaturamentoAereoResultado,
} from './faturamentoAereoUtils';
import { formatCurrency } from '../../utils/formatters';

interface ImportFaturamentoAereoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientes: Cliente[];
  onConfirmImport: (lancamentos: LancamentoFaturamentoAereo[], faturas: FaturaAereo[]) => void;
  /** Título/legenda exibidos no cabeçalho — deixa o modal genérico entre Farma Aéreo e
   *  Farma Rodoviário (mesma estrutura de importação, só muda o setor). */
  titulo?: string;
  subtitulo?: string;
  /** Setor aplicado a toda linha importada que não trouxer sua própria coluna "Modal" na
   *  planilha (ver mapRowsToFaturamentoAereo). Rodoviário passa 'Rodoviário' aqui; Aéreo
   *  deixa em branco, preservando o comportamento de sempre. */
  modalPadrao?: string;
}

export const ImportFaturamentoAereoModal: React.FC<ImportFaturamentoAereoModalProps> = ({
  isOpen,
  onClose,
  clientes,
  onConfirmImport,
  titulo = 'Importar Faturamento (Excel/XLS)',
  subtitulo = 'Controle Financeiro — Farma Aéreo: lançamentos de CT-e e faturas',
  modalPadrao,
}) => {
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ImportacaoFaturamentoAereoResultado | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFileName('');
    setErro(null);
    setResultado(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErro(null);
    setResultado(null);
    setIsProcessing(true);
    try {
      const rows = await readSpreadsheetFile(file);
      if (rows.length === 0) {
        setErro('A planilha está vazia ou não foi possível identificar linhas de dados.');
        return;
      }
      const mapped = mapRowsToFaturamentoAereo(rows, clientes, modalPadrao);
      if (mapped.lancamentos.length === 0) {
        setErro(
          'Nenhuma linha reconhecida. Verifique se a planilha tem uma coluna de cliente/empresa (ex: "EMPRESA" ou "CLIENTE") e uma coluna de Nota Fiscal ou CT-e preenchidas.'
        );
        return;
      }
      setResultado(mapped);
    } catch (err: any) {
      setErro(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmar = () => {
    if (!resultado) return;
    onConfirmImport(resultado.lancamentos, resultado.faturas);
    handleReset();
    onClose();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
              <p className="text-xs text-slate-500">{subtitulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!resultado && (
            <>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-700">
                  Colunas reconhecidas (nomes flexíveis, acentos e maiúsculas não importam):
                </p>
                <p>
                  <strong>Obrigatória:</strong> Empresa/Cliente.
                </p>
                <p>
                  <strong>Recomendadas:</strong> Destinatário, Nota Fiscal, CT-e, Data da Emissão,
                  Peso (KG), Volumes, Valor da Prestação, Custo Extra, Valor a Cobrar do Cliente,
                  Fatura Atrelada (nº fatura), Confirmação de Pagamento, Valor Recebido na Fatura,
                  Data da Conclusão.
                </p>
                <p className="text-slate-500">
                  Se "Valor a Cobrar do Cliente" não vier preenchido, o sistema soma automaticamente
                  Valor da Prestação + Custo Extra. Lançamentos com o mesmo Cliente + Fatura Atrelada
                  são agrupados automaticamente em uma única Fatura.
                </p>
                <p className="text-slate-500">
                  Quando o cliente já tem um tarifário cadastrado (tabela por cidade/peso ou % Ad
                  Valorem sobre a Nota Fiscal), o Valor a Cobrar é recalculado automaticamente por
                  esse tarifário, mesmo que a planilha já traga um valor — ajuste em Cadastro de
                  Clientes se o valor final não bater com o esperado.
                </p>
              </div>

              <label
                htmlFor="import-fat-aereo-file"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl p-8 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors text-center"
              >
                <UploadCloud className="w-8 h-8 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">
                  {isProcessing ? 'Processando...' : 'Clique para selecionar a planilha'}
                </span>
                <span className="text-xs text-slate-400">Formatos aceitos: .xlsx, .xls, .csv</span>
                {fileName && !isProcessing && (
                  <span className="text-xs text-emerald-700 font-medium mt-1">{fileName}</span>
                )}
                <input
                  id="import-fat-aereo-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
              </label>

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Lendo planilha...</span>
                </div>
              )}

              {erro && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{erro}</span>
                </div>
              )}
            </>
          )}

          {resultado && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <p className="font-bold text-sm text-emerald-900">
                    Planilha processada: {fileName}
                  </p>
                  <p className="mt-1">
                    {resultado.lancamentos.length} lançamento(s) de CT-e prontos para importar,
                    agrupados em {resultado.faturas.length} nova(s) fatura(s).
                  </p>
                  {resultado.totalLinhasIgnoradas > 0 && (
                    <p className="mt-1 text-amber-700">
                      {resultado.totalLinhasIgnoradas} linha(s) ignorada(s) por não terem
                      cliente/empresa ou nenhum documento (NF/CT-e) identificado — inclui
                      linhas de total/rodapé, se a planilha tiver.
                    </p>
                  )}
                </div>
              </div>

              {resultado.avisos.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1 max-h-28 overflow-y-auto">
                  {resultado.avisos.map((aviso, idx) => (
                    <p key={idx} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{aviso}</span>
                    </p>
                  ))}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">
                  Prévia (primeiros {Math.min(8, resultado.lancamentos.length)} lançamentos):
                </p>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-slate-500">
                        <th className="px-2.5 py-2">Cliente</th>
                        <th className="px-2.5 py-2">Nota Fiscal</th>
                        <th className="px-2.5 py-2">Data</th>
                        <th className="px-2.5 py-2 text-right">Valor a Cobrar</th>
                        <th className="px-2.5 py-2">Pago?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultado.lancamentos.slice(0, 8).map((l) => (
                        <tr key={l.id}>
                          <td className="px-2.5 py-2 font-medium text-slate-700 max-w-[160px] truncate">
                            {l.clienteNome}
                          </td>
                          <td className="px-2.5 py-2 text-slate-600">{l.notaFiscal || '—'}</td>
                          <td className="px-2.5 py-2 text-slate-600">{l.dataEmissao || '—'}</td>
                          <td className="px-2.5 py-2 text-right font-semibold text-slate-800">
                            {formatCurrency(l.valorACobrar)}
                          </td>
                          <td className="px-2.5 py-2">
                            {l.confirmacaoPagamento ? (
                              <span className="text-emerald-600 font-semibold">Sim</span>
                            ) : (
                              <span className="text-slate-400">Não</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 underline"
              >
                Escolher outro arquivo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!resultado}
            onClick={handleConfirmar}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              Confirmar Importação
              {resultado ? ` (${resultado.lancamentos.length} lançamentos)` : ''}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
