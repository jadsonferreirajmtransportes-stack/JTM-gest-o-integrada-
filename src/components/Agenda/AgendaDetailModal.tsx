import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Download,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  CheckSquare,
  FileText,
  Building,
  Send,
  MessageSquare,
  Mail,
  BellRing,
  Video,
  Navigation,
  Paperclip,
} from 'lucide-react';
import { AtividadeGestao, StatusAtividadeGestao, ItemDeliberacaoAta } from '../../types';
import {
  CATEGORIA_CONFIG,
  STATUS_CONFIG,
  PRIORIDADE_CONFIG,
  downloadIcsFile,
  isAtividadeMultiDia,
  getAtividadeDuracaoDias,
  formatAtividadeDateLabel,
  getTipoLocalEfetivo,
} from './agendaUtils';

interface AgendaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  atividade: AtividadeGestao | null;
  onEdit: (atividade: AtividadeGestao) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: StatusAtividadeGestao) => void;
  onUpdateDeliberacoes: (id: string, deliberacoes: ItemDeliberacaoAta[]) => void;
  onOpenAlerta?: (atividade: AtividadeGestao) => void;
}

export const AgendaDetailModal: React.FC<AgendaDetailModalProps> = ({
  isOpen,
  onClose,
  atividade,
  onEdit,
  onDelete,
  onStatusChange,
  onUpdateDeliberacoes,
  onOpenAlerta,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [deliberacoes, setDeliberacoes] = useState<ItemDeliberacaoAta[]>(
    atividade?.deliberacoes || []
  );
  const [novoItem, setNovoItem] = useState('');
  const [novoResp, setNovoResp] = useState('');

  if (!isOpen || !atividade) return null;

  const catConfig = CATEGORIA_CONFIG[atividade.categoria];
  const statConfig = STATUS_CONFIG[atividade.status];
  const prioConfig = PRIORIDADE_CONFIG[atividade.prioridade];

  const handleCopyLink = () => {
    if (!atividade.localOuLink) return;
    navigator.clipboard.writeText(atividade.localOuLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleDeliberacao = (itemId: string) => {
    const updated = deliberacoes.map((d) =>
      d.id === itemId ? { ...d, concluido: !d.concluido } : d
    );
    setDeliberacoes(updated);
    onUpdateDeliberacoes(atividade.id, updated);
  };

  const handleAddDeliberacao = () => {
    if (!novoItem.trim()) return;
    const newItem: ItemDeliberacaoAta = {
      id: `del-${Date.now()}`,
      texto: novoItem.trim(),
      concluido: false,
      responsavel: novoResp.trim() || undefined,
    };
    const updated = [...deliberacoes, newItem];
    setDeliberacoes(updated);
    onUpdateDeliberacoes(atividade.id, updated);
    setNovoItem('');
    setNovoResp('');
  };

  const tipoLocalEfetivo = getTipoLocalEfetivo(atividade);
  const isVideoconferencia = tipoLocalEfetivo === 'videoconferencia';
  const isLink =
    isVideoconferencia &&
    atividade.localOuLink &&
    (atividade.localOuLink.startsWith('http://') ||
      atividade.localOuLink.startsWith('https://') ||
      atividade.localOuLink.includes('meet.google') ||
      atividade.localOuLink.includes('teams.microsoft'));

  const formattedDate = formatAtividadeDateLabel(atividade);
  const multiDia = isAtividadeMultiDia(atividade);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header with category banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}
            >
              {atividade.categoria}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-md border flex items-center gap-1.5 ${statConfig.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${statConfig.dot}`} />
              {atividade.status}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-md ${prioConfig.badge}`}>
              Prioridade {atividade.prioridade}
            </span>
            {atividade.recorrencia && atividade.recorrencia !== 'Nenhuma' && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium">
                Recorrente: {atividade.recorrencia}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-700">
          {/* Title & Info */}
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-snug">{atividade.titulo}</h1>
            {atividade.descricao && (
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {atividade.descricao}
              </p>
            )}
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
            {/* Data & Hora */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Data do Compromisso
              </span>
              <p className="text-xs font-bold text-slate-800 capitalize">{formattedDate}</p>
              {multiDia && (
                <span className="inline-block px-2 py-0.5 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-md">
                  {getAtividadeDuracaoDias(atividade)} dias de duração
                </span>
              )}
              <p className="text-[11px] text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {atividade.diaInteiro
                  ? 'Dia Inteiro'
                  : `${atividade.horaInicio} às ${atividade.horaFim}`}
              </p>
            </div>

            {/* Responsável */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Responsável Principal
              </span>
              <p className="text-xs font-bold text-slate-800">{atividade.responsavel}</p>
              {atividade.responsavelCargo && (
                <p className="text-[11px] text-slate-500">{atividade.responsavelCargo}</p>
              )}
            </div>

            {/* Local / Link */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                {isVideoconferencia ? (
                  <Video className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                )}
                {isVideoconferencia ? 'Videoconferência' : 'Local do Compromisso'}
              </span>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-slate-800 font-medium">{atividade.localOuLink}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-[11px] font-medium text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  {isLink && (
                    <a
                      href={
                        atividade.localOuLink?.startsWith('http')
                          ? atividade.localOuLink
                          : `https://${atividade.localOuLink}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md text-[11px] font-medium text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Entrar na Reunião</span>
                    </a>
                  )}
                  {!isVideoconferencia && atividade.linkLocalizacao && (
                    <a
                      href={atividade.linkLocalizacao}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md text-[11px] font-medium text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Ver no Mapa</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Participantes */}
            {atividade.participantes && atividade.participantes.length > 0 && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    Participantes Convocados ({atividade.participantes.length})
                  </span>
                  {onOpenAlerta && (
                    <button
                      type="button"
                      onClick={() => onOpenAlerta(atividade)}
                      className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Notificar Participantes</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {atividade.participantes.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Último Alerta Enviado banner if any */}
          {atividade.ultimoAlertaEnviadoEm && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Alerta enviado em{' '}
                  <strong>
                    {new Date(atividade.ultimoAlertaEnviadoEm).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>{' '}
                  via {atividade.ultimoAlertaCanal === 'whatsapp' ? 'WhatsApp' : atividade.ultimoAlertaCanal === 'email' ? 'E-mail' : 'WhatsApp / E-mail'}
                </span>
              </div>
              {onOpenAlerta && (
                <button
                  type="button"
                  onClick={() => onOpenAlerta(atividade)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold underline text-[11px]"
                >
                  Reenviar Alerta
                </button>
              )}
            </div>
          )}

          {/* Pauta / Ata */}
          {atividade.pautaAta && (
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Pauta Prévia & Resumo de Ata
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                {atividade.pautaAta}
              </div>
            </div>
          )}

          {/* Checklist de Deliberações */}
          <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                Deliberações e Ações Definidas ({deliberacoes.filter((d) => d.concluido).length}/
                {deliberacoes.length})
              </span>
              {deliberacoes.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {Math.round(
                    (deliberacoes.filter((d) => d.concluido).length / deliberacoes.length) * 100
                  )}
                  % concluído
                </span>
              )}
            </div>

            {/* Deliberations list */}
            {deliberacoes.length > 0 ? (
              <div className="space-y-1.5">
                {deliberacoes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={item.concluido}
                        onChange={() => handleToggleDeliberacao(item.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span
                        className={`truncate ${
                          item.concluido ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                        }`}
                      >
                        {item.texto}
                      </span>
                    </label>
                    {item.responsavel && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium shrink-0">
                        {item.responsavel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhuma deliberação registrada ainda.</p>
            )}

            {/* Quick add deliberation */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                placeholder="Adicionar nova deliberação..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeliberacao();
                  }
                }}
              />
              <input
                type="text"
                value={novoResp}
                onChange={(e) => setNovoResp(e.target.value)}
                placeholder="Responsável"
                className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddDeliberacao}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium text-xs transition-colors shrink-0"
              >
                + Ação
              </button>
            </div>
          </div>

          {/* Documentos / Anexos */}
          {atividade.anexos && atividade.anexos.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                Documentos / Anexos ({atividade.anexos.length})
              </span>
              <div className="space-y-1.5">
                {atividade.anexos.map((anexo) => (
                  <a
                    key={anexo.id}
                    href={anexo.arquivoUrl}
                    download={anexo.nome}
                    className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
                    title="Baixar anexo"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate font-medium flex-1">{anexo.nome}</span>
                    {anexo.tamanho && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{anexo.tamanho}</span>
                    )}
                    <Download className="w-3 h-3 text-slate-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenAlerta && (
              <button
                type="button"
                onClick={() => onOpenAlerta(atividade)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20"
                title="Disparar alerta e lembrete via WhatsApp e E-mail"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Mandar Alerta (WhatsApp / E-mail)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => downloadIcsFile(atividade)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Baixar arquivo .ICS para Apple Calendar, Google Calendar, Outlook"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Exportar (.ics)</span>
            </button>

            {atividade.status !== 'Concluída' ? (
              <button
                type="button"
                onClick={() => onStatusChange(atividade.id, 'Concluída')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Marcar Concluída</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStatusChange(atividade.id, 'Agendada')}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reabrir Atividade</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(atividade)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Deseja realmente excluir a atividade "${atividade.titulo}"?`)) {
                  onDelete(atividade.id);
                  onClose();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Excluir Atividade"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
