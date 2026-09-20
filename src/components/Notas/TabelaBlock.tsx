import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

interface TabelaBlockProps {
  colunas: string[];
  linhas: string[][];
  onChange: (colunas: string[], linhas: string[][]) => void;
}

/** Bloco de tabela simples (estilo planilha) para as páginas de Notas & Ideias — colunas e
 *  linhas editáveis, com botões para adicionar/remover ambas. Estado local espelha as props
 *  (seguindo o mesmo padrão dos demais blocos de texto): digitação atualiza a tela na hora,
 *  e o `onChange` (que grava a página) só dispara no blur ou em ações estruturais
 *  (adicionar/remover linha ou coluna). */
export const TabelaBlock: React.FC<TabelaBlockProps> = ({ colunas, linhas, onChange }) => {
  const [cols, setCols] = useState<string[]>(colunas.length ? colunas : ['Coluna 1', 'Coluna 2']);
  const [rows, setRows] = useState<string[][]>(linhas.length ? linhas : [Array(cols.length).fill('')]);

  const handleHeaderChange = (idx: number, valor: string) => {
    setCols((prev) => prev.map((c, i) => (i === idx ? valor : c)));
  };

  const handleCellChange = (rowIdx: number, colIdx: number, valor: string) => {
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? r.map((c, j) => (j === colIdx ? valor : c)) : r)));
  };

  const handleAddColuna = () => {
    const novasCols = [...cols, `Coluna ${cols.length + 1}`];
    const novasRows = rows.map((r) => [...r, '']);
    setCols(novasCols);
    setRows(novasRows);
    onChange(novasCols, novasRows);
  };

  const handleRemoverColuna = (idx: number) => {
    if (cols.length <= 1) return;
    const novasCols = cols.filter((_, i) => i !== idx);
    const novasRows = rows.map((r) => r.filter((_, i) => i !== idx));
    setCols(novasCols);
    setRows(novasRows);
    onChange(novasCols, novasRows);
  };

  const handleAddLinha = () => {
    const novasRows = [...rows, Array(cols.length).fill('')];
    setRows(novasRows);
    onChange(cols, novasRows);
  };

  const handleRemoverLinha = (idx: number) => {
    if (rows.length <= 1) return;
    const novasRows = rows.filter((_, i) => i !== idx);
    setRows(novasRows);
    onChange(cols, novasRows);
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            {cols.map((col, idx) => (
              <th key={idx} className="group/th relative border border-slate-200 p-0">
                <input
                  type="text"
                  value={col}
                  onChange={(e) => handleHeaderChange(idx, e.target.value)}
                  onBlur={() => onChange(cols, rows)}
                  placeholder={`Coluna ${idx + 1}`}
                  className="w-full bg-transparent px-2.5 py-2 pr-5 text-left font-bold text-slate-700 placeholder-slate-300 outline-hidden"
                />
                {cols.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoverColuna(idx)}
                    className="absolute top-1.5 right-1 p-0.5 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover/th:opacity-100"
                    title="Remover coluna"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </th>
            ))}
            <th className="w-8 border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={handleAddColuna}
                className="flex h-full w-full items-center justify-center py-2 text-slate-400 transition-colors hover:text-[#C48229]"
                title="Adicionar coluna"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="group/tr">
              {row.map((cell, colIdx) => (
                <td key={colIdx} className="border border-slate-200 p-0">
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                    onBlur={() => onChange(cols, rows)}
                    className="w-full bg-transparent px-2.5 py-2 text-slate-600 outline-hidden"
                  />
                </td>
              ))}
              <td className="border border-slate-200 w-8 text-center">
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoverLinha(rowIdx)}
                    className="p-0.5 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover/tr:opacity-100"
                    title="Remover linha"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={handleAddLinha}
        className="flex w-full items-center justify-center gap-1 border-t border-slate-200 py-1.5 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-amber-50/40 hover:text-[#C48229]"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar linha
      </button>
    </div>
  );
};
