import React from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Truck,
  Thermometer,
  ShieldCheck,
  Calendar,
  MessageCircle,
  Clock,
  ChevronRight,
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { Cliente, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ClientCardProps {
  cliente: Cliente;
  userRole: UserRole;
  onSelect: (cliente: Cliente) => void;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
  onAddInteraction: (cliente: Cliente) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  cliente,
  userRole,
  onSelect,
  onEdit,
  onDelete,
  onAddInteraction,
}) => {
  const principalContact = cliente.contatos?.find((c) => c.principal) || cliente.contatos?.[0];

  const getStatusBadge = (status: Cliente['status']) => {
    switch (status) {
      case 'Ativo':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Em Negociação':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Prospecção':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Suspenso':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Inativo':
      default:
        return 'bg-slate-700/50 text-slate-400 border-slate-600/30';
    }
  };

  const getTempBadge = (temp: Cliente['faixaTemperatura']) => {
    switch (temp) {
      case 'Refrigerado / Termolábil (2°C a 8°C)':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'Climatizado (15°C a 25°C)':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      case 'Múltiplas Faixas Térmicas':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'Congelado (-20°C)':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/30';
    }
  };

  const cleanPhoneForWhatsApp = (phoneStr: string) => {
    return phoneStr.replace(/\D/g, '');
  };

  const lastInteraction = cliente.interacoes && cliente.interacoes.length > 0
    ? [...cliente.interacoes].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0]
    : null;

  return (
    <div
      id={`client-card-${cliente.id}`}
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between group"
    >
      {/* Top Bar: Code, Segment & Status */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono font-semibold border border-slate-700">
              {cliente.codigoCliente}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadge(
                cliente.status
              )}`}
            >
              {cliente.status}
            </span>
            {cliente.exigeRDC430 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                RDC 430
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {userRole === 'admin' && (
              <button
                id={`btn-edit-client-${cliente.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(cliente);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Editar Cliente"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {userRole === 'admin' && (
              <button
                id={`btn-delete-client-${cliente.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Deseja remover o cliente ${cliente.nomeFantasia || cliente.razaoSocial} da carteira?`)) {
                    onDelete(cliente.id);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Excluir Cliente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Client Name & Segment */}
        <div className="cursor-pointer" onClick={() => onSelect(cliente)}>
          <h3 className="text-base font-bold text-white group-hover:text-[#B38F4F] transition-colors line-clamp-1">
            {cliente.nomeFantasia || cliente.razaoSocial}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5 line-clamp-1">
            {cliente.razaoSocial}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
              {cliente.segmento}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${getTempBadge(cliente.faixaTemperatura)}`}>
              <Thermometer className="w-3 h-3 shrink-0" />
              {cliente.faixaTemperatura}
            </span>
          </div>
        </div>

        {/* Operational & Financial Highlights */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/50">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Faturamento / Mês
            </span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
              {formatCurrency(cliente.faturamentoMensalEstimado || 0)}
            </span>
            <span className="text-[10px] text-slate-400">
              ~{cliente.volumeEntregasMesEstimado || 0} entregas/mês
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/50">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Modelo de Frete
            </span>
            <span className="text-xs font-semibold text-slate-200 mt-0.5 block truncate">
              {cliente.tabelaFrete?.tipoCobranca || 'Valor por Ponto'}
            </span>
            <span className="text-[10px] text-[#B38F4F] font-medium">
              {cliente.tabelaFrete?.tipoCobranca === '% sobre Nota Fiscal (Ad Valorem)'
                ? `${cliente.tabelaFrete?.percentualAdValoremNF ?? cliente.tabelaFrete?.valorBase ?? 0}% sobre NF`
                : cliente.tabelaFrete?.valorKgExcedente
                ? `${formatCurrency(cliente.tabelaFrete?.valorBase || 0)} + ${formatCurrency(
                    cliente.tabelaFrete.valorKgExcedente
                  )}/kg exc.`
                : formatCurrency(cliente.tabelaFrete?.valorBase || 0)}
            </span>
          </div>
        </div>

        {/* Location & Account Manager */}
        <div className="mt-3 space-y-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{cliente.cidadeUF || 'Não informada'}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Gestor JMT: <strong className="text-slate-300 font-medium">{cliente.gerenteContaResponsavel || 'Geral'}</strong></span>
          </div>
        </div>

        {/* Principal Contact & WhatsApp action */}
        {principalContact && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <p className="text-slate-200 font-medium truncate">{principalContact.nome}</p>
              <p className="text-slate-500 text-[11px] truncate">{principalContact.cargoSetor}</p>
            </div>
            {principalContact.telefoneWhatsapp && (
              <a
                id={`btn-whatsapp-client-${cliente.id}`}
                href={`https://wa.me/55${cleanPhoneForWhatsApp(principalContact.telefoneWhatsapp)}?text=${encodeURIComponent(
                  `Olá ${principalContact.nome}, aqui é da Jobson de Moraes Transportes (JMT). Referente à operação da ${cliente.nomeFantasia || cliente.razaoSocial}:`
                )}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shrink-0 flex items-center gap-1 font-medium text-[11px]"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        )}

        {/* Last CRM Interaction Preview */}
        {lastInteraction && (
          <div className="mt-2.5 px-2.5 py-1.5 rounded bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400">
            <span className="text-slate-300 font-medium">Última Interação ({lastInteraction.data}):</span>{' '}
            <span className="italic line-clamp-1">{lastInteraction.resumo}</span>
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          id={`btn-add-interaction-${cliente.id}`}
          type="button"
          onClick={() => onAddInteraction(cliente)}
          className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1"
        >
          <Clock className="w-3.5 h-3.5 text-[#B38F4F]" />
          <span>+ Interação</span>
        </button>

        <button
          id={`btn-view-dossier-${cliente.id}`}
          type="button"
          onClick={() => onSelect(cliente)}
          className="text-xs text-[#B38F4F] hover:text-[#8A6A39] hover:bg-[#B38F4F]/10 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1"
        >
          <span>Ficha Completa</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
