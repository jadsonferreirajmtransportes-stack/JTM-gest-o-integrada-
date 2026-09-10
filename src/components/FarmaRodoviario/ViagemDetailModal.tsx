import React, { useState } from 'react';
import {
  X,
  Truck,
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
  User,
  Package,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';
import { ViagemRodoviaria, StatusViagemRodoviaria, PontoParadaViagem } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { normalizeViagem } from '../../utils/storage';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

interface ViagemDetailModalProps {
  viagem: ViagemRodoviaria;
  isOpen: boolean;
  onClose: () => void;
  onUpdateViagem: (updated: ViagemRodoviaria) => void;
}

export const ViagemDetailModal: React.FC<ViagemDetailModalProps> = ({
  viagem: rawViagem,
  isOpen,
  onClose,
  onUpdateViagem,
}) => {
  const viagem = normalizeViagem(rawViagem);
  const [selectedPontoId, setSelectedPontoId] = useState<string | null>(null);
  const [recebedorNome, setRecebedorNome] = useState('');
  const [recebedorDoc, setRecebedorDoc] = useState('');
  const [tempEntrega, setTempEntrega] = useState<string>('');

  if (!isOpen || !viagem) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = (newStatus: StatusViagemRodoviaria) => {
    onUpdateViagem({
      ...viagem,
      status: newStatus,
    });
  };

  const handleConfirmDelivery = (pontoId: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const pontos = viagem.pontosParada || viagem.pontosEntrega || [];

    const updatedPontos = pontos.map((p) => {
      if (p.id === pontoId) {
        return {
          ...p,
          status: 'Entregue' as const,
          horarioEfetivoEntrega: timeStr,
          temperaturaNaEntrega: tempEntrega ? parseFloat(tempEntrega) : viagem.temperaturaAtualBau,
          recebedorNome: recebedorNome.trim() || 'Farmacêutico / Recebedor',
          recebedorDocumento: recebedorDoc.trim() || 'CRF / RG Confirmado',
        };
      }
      return p;
    });

    const allDone = updatedPontos.every((p) => p.status === 'Entregue');

    onUpdateViagem({
      ...viagem,
      pontosParada: updatedPontos,
      pontosEntrega: updatedPontos,
      status: allDone ? 'Viagem Concluída' : viagem.status,
    });

    setSelectedPontoId(null);
    setRecebedorNome('');
    setRecebedorDoc('');
    setTempEntrega('');
  };

  const isTempOk =
    viagem.temperaturaAtualBau >= viagem.temperaturaMinima &&
    viagem.temperaturaAtualBau <= viagem.temperaturaMaxima;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="print:hidden px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-white">
                  {viagem.veiculoPlaca}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {viagem.veiculoTipo} • {viagem.modalidade}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Motorista: {viagem.motoristaNome} {viagem.numeroMdfe ? `• MDF-e ${viagem.numeroMdfe}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Imprimir Romaneio da Viagem"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="jmt-print-doc p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          <PrintDocumentHeader
            titulo="ROMANEIO DE VIAGEM RODOVIÁRIA"
            subtitulo="Validação Térmica e Rastreabilidade — Farma Rodoviário"
            metadados={`${viagem.veiculoPlaca} — Motorista ${viagem.motoristaNome}`}
          />
          {/* Quick Route & Status Bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Origem</span>
              <span className="font-semibold text-slate-800 text-sm">{viagem.rotaOrigem}</span>
              <span className="text-xs text-slate-500 font-mono">Saída: {formatDateBR(viagem.dataSaida)} às {viagem.horarioSaida}</span>
            </div>

            <div className="flex items-center gap-2 px-4 text-emerald-600 font-semibold text-xs">
              <Truck className="w-4 h-4 animate-pulse" />
              <span>{viagem.status}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Destino Principal</span>
              <span className="font-semibold text-slate-800 text-sm">{viagem.rotaDestino}</span>
              <span className="text-xs text-slate-500 font-mono">Previsão Chegada: {viagem.previsaoChegadaDestino}</span>
            </div>
          </div>

          {/* Info Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Telemetry & Temp */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-emerald-600" />
                Telemetria do Baú (RDC 430)
              </span>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">{viagem.faixaTemperatura}</span>
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    Set-point: {viagem.setpointTermostato ?? 4}°C
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-emerald-700">
                    {(viagem.temperaturaAtualBau ?? 4) > 0 ? `+${(viagem.temperaturaAtualBau ?? 4).toFixed(1)}°C` : `${(viagem.temperaturaAtualBau ?? 4).toFixed(1)}°C`}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Faixa: {viagem.temperaturaMinima ?? 2}°C a {viagem.temperaturaMaxima ?? 8}°C
                  </span>
                </div>
              </div>
            </div>

            {/* Departure Checklist */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Checklist de Partida & ANVISA
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Sanitização Baú:</span>
                  <span className="font-semibold text-emerald-700">
                    {(viagem.checklistPartida?.sanitizadoBau ?? viagem.checklistSaida?.higienizacaoSanitizacaoOk ?? true) ? '✓ Aprovado' : '✗ Pendente'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Pré-Resfriamento:</span>
                  <span className="font-semibold text-emerald-700">
                    {(viagem.checklistPartida?.preResfriamentoConcluido ?? viagem.checklistSaida?.preResfriamentoAtingido ?? true) ? '✓ Concluído' : '✗ Pendente'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Lacre da Porta:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {viagem.checklistPartida?.numeroLacre || viagem.checklistSaida?.lacreBauNumero || 'Sem Lacre'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial & Invoices */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Carga & Faturamento
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total NFs:</span>
                  <span className="font-semibold text-slate-800">{viagem.quantidadeNotasFiscais ?? viagem.totalNFs ?? 0} NFs</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Volumes / Peso:</span>
                  <span className="font-semibold text-slate-800">{viagem.quantidadeTotalVolumes ?? 0} vol ({viagem.pesoTotalKg ?? 0} kg)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Valor da Carga:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(viagem.valorTotalMercadoria ?? viagem.valorTotalCarga ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick status button bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              Atualizar Status da Viagem:
            </span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'Carregamento / Pré-Resfriamento',
                  'Em Rota / Trânsito',
                  'Parada / Entrega em Andamento',
                  'Viagem Concluída',
                  'Ocorrência Operacional',
                ] as StatusViagemRodoviaria[]
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    viagem.status === st
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Points & Stops */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Pontos de Parada, Clientes e Baixa de Entregas ({viagem.pontosParada.length} paradas)
              </span>
            </div>

            <div className="space-y-3">
              {viagem.pontosParada.map((ponto, idx) => (
                <div
                  key={ponto.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    ponto.status === 'Entregue'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {ponto.ordemEntrega}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {ponto.clienteNome}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            NF {ponto.numeroNotaFiscal} ({ponto.quantidadeVolumes} vol)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {ponto.endereco} — {ponto.cidadeUF}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ponto.status === 'Entregue' ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Entregue às {ponto.horarioEfetivoEntrega}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Recebedor: {ponto.recebedorNome} • Temp: {ponto.temperaturaNaEntrega}°C
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedPontoId(ponto.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
                        >
                          Dar Baixa na Entrega
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Check-in Form */}
                  {selectedPontoId === ponto.id && (
                    <div className="mt-4 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3 animate-fade-in">
                      <span className="text-xs font-bold text-blue-900 block">
                        Confirmar Recebimento Farmacêutico RDC 430:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Nome do Farmacêutico / Recebedor"
                          value={recebedorNome}
                          onChange={(e) => setRecebedorNome(e.target.value)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="CRF / RG / Matrícula"
                          value={recebedorDoc}
                          onChange={(e) => setRecebedorDoc(e.target.value)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder={`Temp Aferida °C (Ex: ${viagem.temperaturaAtualBau})`}
                          value={tempEntrega}
                          onChange={(e) => setTempEntrega(e.target.value)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedPontoId(null)}
                          className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleConfirmDelivery(ponto.id)}
                          className="px-4 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                        >
                          Confirmar Entrega
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <PrintDocumentFooter />
        </div>

        {/* Footer */}
        <div className="print:hidden px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Validação Térmica e Rastreabilidade de Transporte Rodoviário JMT
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
