import React, { useState } from 'react';
import {
  X,
  Plane,
  Thermometer,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Share2,
  Snowflake,
  UserCheck,
  Flame,
  ArrowRight,
  Send,
  Plus,
} from 'lucide-react';
import { EmbarqueAereo, StatusEmbarqueAereo, HistoricoRastreamentoAereo } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

interface EmbarqueAereoDetailModalProps {
  embarque: EmbarqueAereo;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEmbarque: (updated: EmbarqueAereo) => void;
}

export const EmbarqueAereoDetailModal: React.FC<EmbarqueAereoDetailModalProps> = ({
  embarque,
  isOpen,
  onClose,
  onUpdateEmbarque,
}) => {
  const [newLogLocal, setNewLogLocal] = useState('');
  const [newLogDesc, setNewLogDesc] = useState('');
  const [newLogTemp, setNewLogTemp] = useState<string>('');
  const [isAddingLog, setIsAddingLog] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = (newStatus: StatusEmbarqueAereo) => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newLogItem: HistoricoRastreamentoAereo = {
      id: `hist-${Date.now()}`,
      dataHora: timeStr,
      local: embarque.aeroportoDestino.split(' - ')[0],
      descricao: `Status atualizado para "${newStatus}".`,
      temperaturaAferida: embarque.temperaturaAtual,
      responsavel: 'Operador JMT Aéreo',
    };

    onUpdateEmbarque({
      ...embarque,
      status: newStatus,
      historico: [...embarque.historico, newLogItem],
    });
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogDesc.trim()) return;

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newLogItem: HistoricoRastreamentoAereo = {
      id: `hist-${Date.now()}`,
      dataHora: timeStr,
      local: newLogLocal.trim() || embarque.aeroportoDestino.split(' - ')[0],
      descricao: newLogDesc.trim(),
      temperaturaAferida: newLogTemp ? parseFloat(newLogTemp) : embarque.temperaturaAtual,
      responsavel: 'Plantão Farma Aéreo JMT',
    };

    onUpdateEmbarque({
      ...embarque,
      historico: [...embarque.historico, newLogItem],
    });

    setNewLogLocal('');
    setNewLogDesc('');
    setNewLogTemp('');
    setIsAddingLog(false);
  };

  const isTempOk =
    embarque.temperaturaAtual >= embarque.temperaturaMinima &&
    embarque.temperaturaAtual <= embarque.temperaturaMaxima;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="print:hidden px-6 py-4 bg-white flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#B38F4F]">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-slate-900">
                  AWB {embarque.codigoAWB}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-[#8A6A39] border border-amber-200">
                  {embarque.companhiaAerea} • Voo {embarque.numeroVoo}
                </span>
                {embarque.urgencia === 'Plantão Emergencial / UTI 24h' && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    UTI 24h
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                {embarque.tipoCarga} • {embarque.clienteNome}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="Imprimir Dossiê do Embarque"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="jmt-print-doc p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          <PrintDocumentHeader
            titulo="FICHA DE EMBARQUE AÉREO"
            subtitulo="Cadeia Fria & Conformidade ANVISA RDC 430"
            metadados={`AWB ${embarque.codigoAWB} — ${embarque.clienteNome}`}
          />
          {/* Quick Route Banner */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-800">
                {embarque.aeroportoOrigem.split(' - ')[0]}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Origem</span>
                <span className="font-semibold text-slate-800 text-sm">{embarque.aeroportoOrigem}</span>
                <span className="text-xs text-slate-500 block">{embarque.remetenteNome}</span>
              </div>
            </div>

            <div className="flex flex-col items-center px-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#B38F4F]">
                <Plane className="w-4 h-4 animate-pulse" />
                <span>{embarque.horarioPrevistoDecolagem || '--:--'}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span>{embarque.horarioPrevistoPouso || '--:--'}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">Embarque: {formatDateBR(embarque.dataEmbarque)}</span>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto text-right md:text-left justify-end md:justify-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Destino Final</span>
                <span className="font-semibold text-slate-800 text-sm">{embarque.aeroportoDestino}</span>
                <span className="text-xs text-slate-500 block">{embarque.destinatarioNome}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#8A6A39] border border-amber-200 flex items-center justify-center font-bold">
                {embarque.aeroportoDestino.split(' - ')[0]}
              </div>
            </div>
          </div>

          {/* Grid of Key Info: Thermal, Cargo, Financial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cold Chain Panel */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-[#B38F4F]" />
                  Controle Térmico RDC 430
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  Validado
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">{embarque.faixaTemperatura}</span>
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    Sensor: {embarque.dataloggerSerial || 'Ativo'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-[#8A6A39]">
                    {embarque.temperaturaAtual > 0 ? `+${embarque.temperaturaAtual.toFixed(1)}°C` : `${embarque.temperaturaAtual.toFixed(1)}°C`}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Faixa: {embarque.temperaturaMinima}°C a {embarque.temperaturaMaxima}°C
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Embalagem: <strong className="text-slate-700">{embarque.tipoEmbalagem}</strong>
              </p>
            </div>

            {/* Cargo Specs */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Dados Fiscais & Carga
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Nota Fiscal:</span>
                  <span className="font-semibold text-slate-800">{embarque.numeroNotaFiscal}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Volumes / Peso:</span>
                  <span className="font-semibold text-slate-800">{embarque.quantidadeVolumes} vol ({embarque.pesoBrutoKg} kg)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Valor Mercadoria:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(embarque.valorMercadoria)}</span>
                </div>
              </div>
            </div>

            {/* Operations & TECA Clearance */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-600" />
                Liberação TECA / Plantão
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Resp. Aeroporto:</span>
                  <span className="font-medium text-slate-800">{embarque.responsavelLiberacaoTeca || 'Equipe JMT Natal'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Previsão Entrega:</span>
                  <span className="font-semibold text-[#8A6A39]">{embarque.previsaoEntregaDestino}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Frete Aéreo:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(embarque.valorFreteAereo)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Quick-Update Bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              Avançar Etapa Operacional do Embarque:
            </span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'No TECA Origem',
                  'Em Voo / Trânsito',
                  'Pousado / No TECA Destino',
                  'Liberado TECA / ANVISA',
                  'Em Rota de Entrega',
                  'Entregue com Sucesso',
                ] as StatusEmbarqueAereo[]
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    embarque.status === st
                      ? 'bg-[#B38F4F] text-white border-[#B38F4F] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking Timeline */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#B38F4F]" />
                Linha do Tempo de Rastreamento Térmico & Aeroportuário
              </span>
              <button
                onClick={() => setIsAddingLog(!isAddingLog)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#B38F4F] hover:text-[#8A6A39]"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Ocorrência / Checkpoint
              </button>
            </div>

            {isAddingLog && (
              <form onSubmit={handleAddLog} className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Local (Ex: TECA NAT, CD, Voo)"
                    value={newLogLocal}
                    onChange={(e) => setNewLogLocal(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Temp Aferida °C (Ex: 4.8)"
                    value={newLogTemp}
                    onChange={(e) => setNewLogTemp(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Descrição do evento..."
                    value={newLogDesc}
                    onChange={(e) => setNewLogDesc(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingLog(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-semibold text-white bg-[#B38F4F] hover:bg-[#8A6A39] rounded-md"
                  >
                    Salvar Evento
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {embarque.historico.map((hist, idx) => (
                <div key={hist.id || idx} className="relative flex items-start gap-3.5 pl-1">
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-[#B38F4F] flex items-center justify-center z-10 shrink-0 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[#B38F4F]" />
                  </div>
                  <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{hist.local}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{hist.dataHora}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{hist.descricao}</p>
                    {hist.temperaturaAferida !== undefined && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        <Thermometer className="w-3 h-3" />
                        Temp Registrada: {hist.temperaturaAferida > 0 ? `+${hist.temperaturaAferida}°C` : `${hist.temperaturaAferida}°C`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <PrintDocumentFooter />
        </div>

        {/* Modal Footer */}
        <div className="print:hidden px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Conforme Diretrizes ANVISA RDC 430/2020 para Transporte Aéreo de Termolábeis
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
