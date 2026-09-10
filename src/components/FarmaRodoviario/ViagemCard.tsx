import React from 'react';
import {
  Truck,
  Thermometer,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  ArrowRight,
  Eye,
  Edit2,
  Trash2,
  Activity,
  FileText,
  Snowflake,
  Package,
} from 'lucide-react';
import { ViagemRodoviaria, StatusViagemRodoviaria } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { normalizeViagem } from '../../utils/storage';

interface ViagemCardProps {
  viagem: ViagemRodoviaria;
  onView: (viagem: ViagemRodoviaria) => void;
  onEdit: (viagem: ViagemRodoviaria) => void;
  onDelete: (id: string) => void;
}

export const ViagemCard: React.FC<ViagemCardProps> = ({
  viagem: rawViagem,
  onView,
  onEdit,
  onDelete,
}) => {
  const viagem = normalizeViagem(rawViagem);

  // Status style helper
  const getStatusBadge = (status: StatusViagemRodoviaria) => {
    switch (status) {
      case 'Em Rota / Trânsito':
      case 'Em Trânsito / Em Rota':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500 animate-pulse',
          icon: Truck,
        };
      case 'Carregamento / Pré-Resfriamento':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500 animate-bounce',
          icon: Clock,
        };
      case 'Parada / Entrega em Andamento':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-500 animate-ping',
          icon: MapPin,
        };
      case 'Viagem Concluída':
      case 'Concluída / Retornou à Base':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          icon: CheckCircle2,
        };
      case 'Ocorrência Operacional':
      case 'Alerta de Temperatura':
      case 'Ocorrência Térmica':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500 animate-ping',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: Clock,
        };
    }
  };

  const statusInfo = getStatusBadge(viagem.status);
  const StatusIcon = statusInfo.icon;

  const minT = viagem.temperaturaMinima ?? 2.0;
  const maxT = viagem.temperaturaMaxima ?? 8.0;
  const currT = viagem.temperaturaAtualBau ?? 4.0;
  const isTempOk = currT >= minT && currT <= maxT;

  const faixaStr = viagem.faixaTemperatura || '2°C a 8°C';
  const isColdChain =
    faixaStr.includes('2°C') ||
    faixaStr.includes('Gelo Seco') ||
    faixaStr.includes('Congelado');

  const pontos = viagem.pontosParada || viagem.pontosEntrega || [];
  const entregasRealizadas = pontos.filter((p) => p.status === 'Entregue').length;
  const totalEntregas = pontos.length;
  const progressPercent = totalEntregas > 0 ? Math.round((entregasRealizadas / totalEntregas) * 100) : 0;

  const dataSaidaDisplay = (viagem.dataSaida || viagem.dataPartida || '')
    .split('-')
    .reverse()
    .slice(0, 2)
    .join('/');

  return (
    <div
      id={`card-rodoviario-${viagem.id}`}
      className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
    >
      {/* Header */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 text-base">
                {viagem.veiculoPlaca}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                {viagem.veiculoTipo || viagem.veiculoModelo}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-800">{viagem.motoristaNome}</span>
              {viagem.numeroMdfe && (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-500">{viagem.numeroMdfe}</span>
                </>
              )}
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{viagem.status}</span>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3.5 flex-1">
        {/* Origin -> Destination Route */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">
              Origem
            </span>
            <span className="font-semibold text-slate-900 text-xs truncate max-w-[130px] block">
              {viagem.rotaOrigem || viagem.origem}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Saída: {dataSaidaDisplay || 'Hoje'} {viagem.horarioSaida || viagem.horarioPartidaReal || ''}
            </span>
          </div>

          <div className="flex flex-col items-center px-2">
            <Truck className="w-4 h-4 text-emerald-600 animate-pulse" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 -mt-1" />
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">
              Destino
            </span>
            <span className="font-semibold text-slate-900 text-xs truncate max-w-[130px] block">
              {viagem.rotaDestino || viagem.destinoFinal}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {viagem.modalidade}
            </span>
          </div>
        </div>

        {/* Deliveries Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              Progresso de Entregas:
            </span>
            <span className="font-bold text-slate-800">
              {entregasRealizadas} de {totalEntregas} entregues ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cargo Body Temperature Gauge */}
        <div
          className={`p-2.5 rounded-lg border flex items-center justify-between ${
            isTempOk
              ? isColdChain
                ? 'bg-sky-50/70 border-sky-200'
                : 'bg-emerald-50/70 border-emerald-200'
              : 'bg-rose-50 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {isColdChain ? (
              <Snowflake className="w-4 h-4 text-sky-600" />
            ) : (
              <Thermometer className="w-4 h-4 text-emerald-600" />
            )}
            <div>
              <span className="text-[11px] font-semibold text-slate-800 block">
                {viagem.faixaTemperatura}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {viagem.dataloggerSerial || viagem.dataloggerId || 'Sensor Calibrado RBC'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`font-mono text-base font-bold ${
                isTempOk ? 'text-slate-900' : 'text-rose-700'
              }`}
            >
              {currT > 0 ? `+${currT.toFixed(1)}°C` : `${currT.toFixed(1)}°C`}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Set-point: {viagem.setpointTermostato ?? 4}°C
            </span>
          </div>
        </div>

        {/* Departure Checklist Status Badges */}
        <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {(viagem.checklistPartida?.sanitizadoBau ?? viagem.checklistSaida?.higienizacaoSanitizacaoOk ?? true)
              ? 'Baú Sanitizado'
              : 'Pendente Sanitização'}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {(viagem.checklistPartida?.preResfriamentoConcluido ?? viagem.checklistSaida?.preResfriamentoAtingido ?? true)
              ? 'Pré-resfriado'
              : 'Aguardando Temp'}
          </span>
          <span className="font-semibold text-slate-700">
            {formatCurrency(viagem.valorTotalMercadoria ?? viagem.valorTotalCarga ?? 0)}
          </span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onView(viagem)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          Romaneio & Paradas
        </button>

        <button
          onClick={() => onEdit(viagem)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
          title="Editar Viagem"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDelete(viagem.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
          title="Excluir Registro"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
