import React from 'react';
import {
  Plane,
  Thermometer,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  MapPin,
  Building2,
  CheckCircle2,
  ArrowRight,
  Eye,
  Edit2,
  Trash2,
  Activity,
  Box,
  Flame,
  Snowflake,
} from 'lucide-react';
import { EmbarqueAereo, StatusEmbarqueAereo } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';

interface EmbarqueAereoCardProps {
  embarque: EmbarqueAereo;
  onView: (embarque: EmbarqueAereo) => void;
  onEdit: (embarque: EmbarqueAereo) => void;
  onDelete: (id: string) => void;
  onUpdateStatus?: (id: string, newStatus: StatusEmbarqueAereo) => void;
}

export const EmbarqueAereoCard: React.FC<EmbarqueAereoCardProps> = ({
  embarque,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
}) => {
  // Status style helper
  const getStatusBadge = (status: StatusEmbarqueAereo) => {
    switch (status) {
      case 'Em Voo / Trânsito':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          dot: 'bg-sky-500 animate-pulse',
          icon: Plane,
        };
      case 'Liberado TECA / ANVISA':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: CheckCircle2,
        };
      case 'No TECA Origem':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          icon: Building2,
        };
      case 'Pousado / No TECA Destino':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500 animate-bounce',
          icon: Clock,
        };
      case 'Em Rota de Entrega':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-500 animate-pulse',
          icon: Activity,
        };
      case 'Entregue com Sucesso':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          icon: CheckCircle2,
        };
      case 'Alerta Térmico':
      case 'Alerta de Atraso':
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

  const statusInfo = getStatusBadge(embarque.status);
  const StatusIcon = statusInfo.icon;

  // Temperature helper
  const isTempOk =
    embarque.temperaturaAtual >= embarque.temperaturaMinima &&
    embarque.temperaturaAtual <= embarque.temperaturaMaxima;

  const isColdChain =
    embarque.faixaTemperatura.includes('2°C') ||
    embarque.faixaTemperatura.includes('Gelo Seco') ||
    embarque.faixaTemperatura.includes('Nitrogênio');

  return (
    <div
      id={`card-aereo-${embarque.id}`}
      className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
    >
      {/* Header Bar: AWB + Airline + Status */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 text-base">
                AWB {embarque.codigoAWB}
              </span>
              {embarque.urgencia === 'Plantão Emergencial / UTI 24h' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
                  UTI 24h
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
              <span className="font-medium text-slate-800">{embarque.companhiaAerea}</span>
              <span>•</span>
              <span className="font-mono font-semibold text-blue-700">{embarque.numeroVoo}</span>
              {embarque.numeroCteAereo && (
                <>
                  <span>•</span>
                  <span className="text-slate-500">{embarque.numeroCteAereo}</span>
                </>
              )}
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{embarque.status}</span>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3.5 flex-1">
        {/* Origin -> Destination airport route */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wide block">
              Origem
            </span>
            <span className="font-semibold text-slate-900 text-sm">
              {embarque.aeroportoOrigem.split(' - ')[0]}
            </span>
            <span className="text-[11px] text-slate-600 block truncate max-w-[130px]">
              {embarque.remetenteCidadeUF}
            </span>
          </div>

          <div className="flex flex-col items-center px-2">
            <Plane className="w-4 h-4 text-blue-600 animate-pulse" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-600 -mt-1" />
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wide block">
              Destino
            </span>
            <span className="font-semibold text-slate-900 text-sm">
              {embarque.aeroportoDestino.split(' - ')[0]}
            </span>
            <span className="text-[11px] text-slate-600 block truncate max-w-[130px]">
              {embarque.destinatarioCidadeUF}
            </span>
          </div>
        </div>

        {/* Client & Destination recipient */}
        <div>
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-600">Cliente:</span>
            <span className="font-medium text-slate-800 truncate">{embarque.clienteNome}</span>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-600">Entrega:</span>
            <span className="font-medium text-slate-800 truncate">{embarque.destinatarioNome}</span>
          </div>
        </div>

        {/* Temperature & Cold Chain Gauge */}
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
                {embarque.faixaTemperatura}
              </span>
              <span className="text-[10px] text-slate-600 font-mono">
                {embarque.dataloggerModelo || 'Datalogger'} ({embarque.dataloggerSerial || 'Ativo'})
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`font-mono text-base font-bold ${
                isTempOk ? 'text-slate-900' : 'text-rose-700'
              }`}
            >
              {embarque.temperaturaAtual > 0 ? `+${embarque.temperaturaAtual.toFixed(1)}°C` : `${embarque.temperaturaAtual.toFixed(1)}°C`}
            </span>
            <span className="text-[10px] text-slate-600 block">
              Alvo: {embarque.temperaturaMinima}°C a {embarque.temperaturaMaxima}°C
            </span>
          </div>
        </div>

        {/* Cargo specs & Volume/Value */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-xs border-t border-slate-100">
          <div>
            <span className="text-[10px] text-slate-600 block">Volumes / Peso</span>
            <span className="font-semibold text-slate-800">
              {embarque.quantidadeVolumes} vol ({embarque.pesoBrutoKg} kg)
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-600 block">Embarque</span>
            <span className="font-medium text-slate-800">
              {formatDateBR(embarque.dataEmbarque)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-600 block">Valor Mercadoria</span>
            <span className="font-semibold text-slate-800">
              {formatCurrency(embarque.valorMercadoria)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onView(embarque)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          Rastrear AWB
        </button>

        <button
          onClick={() => onEdit(embarque)}
          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
          title="Editar Embarque"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDelete(embarque.id)}
          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
          title="Excluir Registro"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
