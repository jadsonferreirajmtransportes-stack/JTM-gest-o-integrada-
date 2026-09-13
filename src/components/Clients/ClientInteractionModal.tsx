import React, { useState } from 'react';
import {
  X,
  Clock,
  User,
  Calendar,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Cliente, InteracaoCliente, Supervisor } from '../../types';

interface ClientInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  supervisores: Supervisor[];
  onSaveInteraction: (clienteId: string, interacao: InteracaoCliente) => void;
}

export const ClientInteractionModal: React.FC<ClientInteractionModalProps> = ({
  isOpen,
  onClose,
  cliente,
  supervisores,
  onSaveInteraction,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [data, setData] = useState(today);
  const [tipo, setTipo] = useState<InteracaoCliente['tipo']>('Reunião Comercial');
  const [responsavelJMT, setResponsavelJMT] = useState(
    cliente?.gerenteContaResponsavel || supervisores[0]?.nome || 'Jadson Ferreira'
  );
  const [resumo, setResumo] = useState('');
  const [proximoPasso, setProximoPasso] = useState('');
  const [dataProximoPasso, setDataProximoPasso] = useState('');

  if (!isOpen || !cliente) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumo.trim()) {
      alert('Por favor, descreva o resumo da interação.');
      return;
    }

    const novaInteracao: InteracaoCliente = {
      id: `inter-${Date.now()}`,
      data,
      tipo,
      responsavelJMT,
      resumo: resumo.trim(),
      proximoPasso: proximoPasso.trim() || undefined,
      dataProximoPasso: dataProximoPasso || undefined,
    };

    onSaveInteraction(cliente.id, novaInteracao);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#8A6A39]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Registrar Interação Comercial / CRM
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {cliente.nomeFantasia || cliente.razaoSocial} ({cliente.codigoCliente})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Data da Interação *
              </label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tipo de Contato / Evento *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as InteracaoCliente['tipo'])}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
              >
                <option value="Reunião Comercial">Reunião Comercial</option>
                <option value="Alinhamento Operacional">Alinhamento Operacional</option>
                <option value="Auditoria de Qualidade (RDC 430)">Auditoria de Qualidade (RDC 430)</option>
                <option value="Revisão de Tabela / Reajuste">Revisão de Tabela / Reajuste</option>
                <option value="Feedback / SLA">Feedback / SLA</option>
                <option value="Visita Técnica / Início de Rota">Visita Técnica / Início de Rota</option>
                <option value="Atendimento Financeiro">Atendimento Financeiro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Responsável JMT *
            </label>
            <select
              value={responsavelJMT}
              onChange={(e) => setResponsavelJMT(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
            >
              {supervisores.map((s) => (
                <option key={s.id} value={s.nome}>
                  {s.nome} ({s.cargo})
                </option>
              ))}
              <option value="Jadson Ferreira">Jadson Ferreira (Gerente DP / Contas)</option>
              <option value="Jobson de Moraes">Jobson de Moraes (Diretoria)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Resumo da Conversa / Assunto Tratado *
            </label>
            <textarea
              required
              rows={3}
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="Descreva detalhadamente o que foi conversado, alinhamentos de frete, acordos operacionais ou auditorias..."
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#B38F4F]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Próximo Passo / Ação de Acompanhamento
              </label>
              <input
                type="text"
                value={proximoPasso}
                onChange={(e) => setProximoPasso(e.target.value)}
                placeholder="Ex: Enviar minuta aditiva de frete..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#B38F4F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Data Prevista
              </label>
              <input
                type="date"
                value={dataProximoPasso}
                onChange={(e) => setDataProximoPasso(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#B38F4F] hover:bg-[#8A6A39] text-white transition-colors flex items-center gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Interação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
