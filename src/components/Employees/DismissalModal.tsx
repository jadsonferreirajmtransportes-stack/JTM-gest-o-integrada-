import React, { useState } from 'react';
import { X, UserX, AlertTriangle, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Colaborador, MotivoDemissao } from '../../types';
import { formatDate } from '../../utils/formatters';

interface DismissalModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaborador: Colaborador | null;
  onConfirmDismissal: (
    colaboradorId: string,
    dataDemissao: string,
    motivo: MotivoDemissao,
    dataExameDemissional?: string,
    observacao?: string
  ) => void;
}

export const DismissalModal: React.FC<DismissalModalProps> = ({
  isOpen,
  onClose,
  colaborador,
  onConfirmDismissal,
}) => {
  const [dataDemissao, setDataDemissao] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [motivo, setMotivo] = useState<MotivoDemissao>('Demissão sem justa causa');
  const [dataExameDemissional, setDataExameDemissional] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [observacao, setObservacao] = useState<string>('');
  const [confirmedCheck, setConfirmedCheck] = useState<boolean>(false);

  if (!isOpen || !colaborador) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataDemissao) {
      alert('Informe a data de demissão');
      return;
    }
    if (!confirmedCheck) {
      alert('Por favor, confirme a ciência do processo rescisório e arquivamento.');
      return;
    }

    onConfirmDismissal(
      colaborador.id,
      dataDemissao,
      motivo,
      dataExameDemissional || undefined,
      observacao || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-rose-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-800 rounded-lg">
              <UserX className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Processo de Inativação / Demissão</h2>
              <p className="text-xs text-rose-200">Regra 4 — Arquivamento e Encerramento Contratual</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target Employee Info */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
              Colaborador Selecionado
            </span>
            <div className="font-bold text-slate-900 text-sm">{colaborador.nomeCompleto}</div>
            <div className="text-slate-600">
              Matrícula: <span className="font-mono font-bold">{colaborador.codigoMatricula}</span> • Cargo: {colaborador.funcaoCargo}
            </div>
            <div className="text-slate-500">
              Data de Admissão: {formatDate(colaborador.dataAdmissao)}
            </div>
          </div>

          {/* Form Fields */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Data do Desligamento / Rescisão *
            </label>
            <input
              type="date"
              required
              value={dataDemissao}
              onChange={(e) => setDataDemissao(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Motivo do Desligamento (CLT) *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoDemissao)}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="Demissão sem justa causa">Demissão sem justa causa</option>
              <option value="Pedido de demissão">Pedido de demissão</option>
              <option value="Demissão com justa causa">Demissão com justa causa</option>
              <option value="Término de contrato de experiência">Término de contrato de experiência</option>
              <option value="Rescisão antecipada do contrato de experiência">Rescisão antecipada do contrato de experiência</option>
              <option value="Acordo mútuo (Art. 484-A CLT)">Acordo mútuo (Art. 484-A CLT)</option>
              <option value="Aposentadoria">Aposentadoria</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Data do Exame ASO Demissional (RDC 430 / NR-7)
            </label>
            <input
              type="date"
              value={dataExameDemissional}
              onChange={(e) => setDataExameDemissional(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Obrigatório para conformidade de auditoria médica e sanitária.
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Observações da Rescisão</label>
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações adicionais sobre o aviso prévio, devolução de EPIs e equipamentos..."
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                required
                checked={confirmedCheck}
                onChange={(e) => setConfirmedCheck(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-slate-300 mt-0.5"
              />
              <span className="text-[11px] text-slate-700 font-medium leading-tight">
                Estou ciente de que o status do colaborador será alterado para <strong>Inativo</strong>, mantendo todo o histórico arquivado e auditável para fins da ANVISA e fiscais.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <UserX className="w-4 h-4" />
              <span>Confirmar Inativação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
