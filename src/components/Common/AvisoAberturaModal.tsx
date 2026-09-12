import React from 'react';
import { Bell, X, Clock, Calendar, AlertTriangle, Hourglass, ArrowRight, PartyPopper } from 'lucide-react';
import { AtividadeGestao, ProjetoGerencial } from '../../types';
import { CATEGORIA_CONFIG } from '../Agenda/agendaUtils';

interface AvisoAberturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  atividadesHoje: AtividadeGestao[];
  projetosAtrasados: ProjetoGerencial[];
  projetosProximos: ProjetoGerencial[];
  onIrParaAgenda: () => void;
  onIrParaProjetos: () => void;
}

const formatDataBr = (iso: string) => {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

// Aviso automático exibido uma vez por dia ao abrir o sistema (App.tsx controla a lógica de
// "uma vez por dia" via localStorage). Reúne os compromissos de hoje da Agenda da Gestão e os
// prazos de Projetos Gerenciais em atraso ou próximos do vencimento (3 dias) — só o aviso dentro
// do sistema, sem envio automático de e-mail/WhatsApp (isso continua manual, via "Disparar Alerta").
export const AvisoAberturaModal: React.FC<AvisoAberturaModalProps> = ({
  isOpen,
  onClose,
  atividadesHoje,
  projetosAtrasados,
  projetosProximos,
  onIrParaAgenda,
  onIrParaProjetos,
}) => {
  if (!isOpen) return null;

  const nadaPendente =
    atividadesHoje.length === 0 && projetosAtrasados.length === 0 && projetosProximos.length === 0;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-800/60 border border-indigo-400/30 flex items-center justify-center text-white">
              <Bell className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Avisos do Dia</h2>
              <p className="text-xs text-indigo-100">Compromissos de hoje e prazos de projetos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-indigo-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {nadaPendente && (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-2 text-slate-500">
              <PartyPopper className="w-8 h-8 text-emerald-500" />
              <p className="font-semibold text-slate-700">Nenhum compromisso ou prazo pendente por hoje.</p>
            </div>
          )}

          {atividadesHoje.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Compromissos de Hoje ({atividadesHoje.length})
              </h3>
              <div className="space-y-1.5">
                {atividadesHoje.map((a) => {
                  const cfg = CATEGORIA_CONFIG[a.categoria];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={onIrParaAgenda}
                      className={`w-full text-left p-2.5 rounded-lg border ${cfg?.border || 'border-slate-200'} ${cfg?.lightBg || 'bg-slate-50'} hover:brightness-95 transition`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 truncate">{a.titulo}</span>
                        {!a.diaInteiro && a.horaInicio && (
                          <span className="flex items-center gap-1 text-slate-500 font-mono text-[11px] shrink-0">
                            <Clock className="w-3 h-3" /> {a.horaInicio}
                          </span>
                        )}
                      </div>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg?.bg || 'bg-slate-100'} ${cfg?.text || 'text-slate-600'}`}>
                        {cfg?.label || a.categoria}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {projetosAtrasados.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-rose-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Projetos com Prazo Vencido ({projetosAtrasados.length})
              </h3>
              <div className="space-y-1.5">
                {projetosAtrasados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={onIrParaProjetos}
                    className="w-full text-left p-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:brightness-95 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">{p.titulo}</span>
                      <span className="text-rose-700 font-bold text-[11px] shrink-0">
                        venceu em {formatDataBr(p.dataPrevisaoFim)}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">{p.codigo} — {p.liderProjetoNome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {projetosProximos.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Hourglass className="w-3.5 h-3.5" /> Projetos com Prazo Próximo ({projetosProximos.length})
              </h3>
              <div className="space-y-1.5">
                {projetosProximos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={onIrParaProjetos}
                    className="w-full text-left p-2.5 rounded-lg border border-amber-200 bg-amber-50 hover:brightness-95 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">{p.titulo}</span>
                      <span className="text-amber-700 font-bold text-[11px] shrink-0">
                        até {formatDataBr(p.dataPrevisaoFim)}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">{p.codigo} — {p.liderProjetoNome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <span>Ciente</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
