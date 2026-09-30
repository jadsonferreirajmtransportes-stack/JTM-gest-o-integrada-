import React, { useMemo, useState } from 'react';
import { X, MessageCircle, SkipForward, CheckCircle2, PhoneOff, Copy, ChevronLeft } from 'lucide-react';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';

export interface ItemEnvioWhatsApp {
  id: string;
  nome: string;
  telefone?: string;
  /** Mensagem já pronta pra ESTA pessoa (pode ter nome, link individual etc.). */
  mensagem: string;
}

interface EnvioWhatsAppEmMassaModalProps {
  titulo: string;
  itens: ItemEnvioWhatsApp[];
  onClose: () => void;
  /** Botão "Voltar" (ex.: voltar pra edição do comunicado). */
  onVoltar?: () => void;
}

type StatusEnvio = 'pendente' | 'aberto' | 'pulado';

/** "Envio assistido" pelo WhatsApp pra várias pessoas: o WhatsApp comum não deixa um sistema
 *  mandar mensagens sozinho nem criar lista de transmissão (só a API paga da Meta), então aqui
 *  vira uma fila — cada clique abre a conversa da próxima pessoa já com a mensagem pronta, e quem
 *  usa só aperta "enviar" no WhatsApp. Todas as conversas abrem na MESMA aba/janela
 *  ('jmt-whatsapp'), pra não encher o navegador de abas. Quem não tem WhatsApp no cadastro já
 *  aparece separado, pra enviar por outro meio. */
export const EnvioWhatsAppEmMassaModal: React.FC<EnvioWhatsAppEmMassaModalProps> = ({ titulo, itens, onClose, onVoltar }) => {
  const comTelefone = useMemo(() => itens.filter((i) => buildWhatsAppLink(i.telefone || '', 'x')), [itens]);
  const semTelefone = useMemo(() => itens.filter((i) => !buildWhatsAppLink(i.telefone || '', 'x')), [itens]);
  const [status, setStatus] = useState<Record<string, StatusEnvio>>({});
  const [atual, setAtual] = useState(0);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const item = comTelefone[atual];
  const abertos = comTelefone.filter((i) => status[i.id] === 'aberto').length;
  const concluido = comTelefone.length > 0 && comTelefone.every((i) => status[i.id] && status[i.id] !== 'pendente');

  const proximoPendente = (depoisDe: number, novoStatus: Record<string, StatusEnvio>) => {
    for (let k = 1; k <= comTelefone.length; k++) {
      const idx = (depoisDe + k) % comTelefone.length;
      if (!novoStatus[comTelefone[idx].id]) return idx;
    }
    return depoisDe;
  };

  const marcar = (idx: number, s: StatusEnvio) => {
    const novo = { ...status, [comTelefone[idx].id]: s };
    setStatus(novo);
    setAtual(proximoPendente(idx, novo));
  };

  const handleAbrir = () => {
    if (!item) return;
    const link = buildWhatsAppLink(item.telefone || '', item.mensagem);
    window.open(link, 'jmt-whatsapp');
    marcar(atual, 'aberto');
  };

  const handleCopiar = async (i: ItemEnvioWhatsApp) => {
    try {
      await navigator.clipboard.writeText(i.mensagem);
      setCopiadoId(i.id);
      setTimeout(() => setCopiadoId((c) => (c === i.id ? null : c)), 2000);
    } catch {
      window.prompt('Copie a mensagem:', i.mensagem);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              {titulo}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {abertos} de {comTelefone.length} enviados
              {semTelefone.length > 0 && ` • ${semTelefone.length} sem WhatsApp no cadastro`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${comTelefone.length ? (abertos / comTelefone.length) * 100 : 0}%` }}
            />
          </div>

          {comTelefone.length === 0 ? (
            <p className="text-center text-slate-500 py-6">Nenhum destinatário com WhatsApp cadastrado.</p>
          ) : concluido ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-emerald-800">Fila concluída</p>
              <p className="text-emerald-700">
                {abertos} conversa(s) aberta(s). Confira no WhatsApp se todas as mensagens foram enviadas.
              </p>
            </div>
          ) : (
            item && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-slate-500">
                      Próximo ({atual + 1} de {comTelefone.length})
                    </p>
                    <p className="text-sm font-bold text-slate-900">{item.nome}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => marcar(atual, 'pulado')}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg font-semibold flex items-center gap-1"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> Pular
                  </button>
                </div>
                <p className="whitespace-pre-wrap bg-white border border-slate-200 rounded-lg p-2.5 text-slate-700 max-h-40 overflow-y-auto">
                  {item.mensagem}
                </p>
                <button
                  type="button"
                  onClick={handleAbrir}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir WhatsApp de {item.nome.split(' ')[0]}
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  A conversa abre com a mensagem pronta — aperte enviar no WhatsApp e volte aqui para o próximo.
                </p>
              </div>
            )
          )}

          {comTelefone.length > 0 && (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {comTelefone.map((i, idx) => {
                const s = status[i.id];
                return (
                  <button
                    type="button"
                    key={i.id}
                    onClick={() => setAtual(idx)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-slate-50 ${
                      idx === atual && !concluido ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <span className="font-semibold text-slate-700 truncate">{i.nome}</span>
                    <span
                      className={`text-[10px] font-bold shrink-0 ${
                        s === 'aberto' ? 'text-emerald-700' : s === 'pulado' ? 'text-slate-400' : 'text-[#92611F]'
                      }`}
                    >
                      {s === 'aberto' ? 'Enviado' : s === 'pulado' ? 'Pulado' : 'Pendente'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {semTelefone.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-600 flex items-center gap-1.5">
                <PhoneOff className="w-3.5 h-3.5 text-slate-400" /> Sem WhatsApp no cadastro — envie por outro meio:
              </p>
              {semTelefone.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-700 truncate">{i.nome}</span>
                  <button
                    type="button"
                    onClick={() => handleCopiar(i)}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3 h-3" /> {copiadoId === i.id ? 'Copiada!' : 'Copiar mensagem'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {onVoltar && (
          <div className="p-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onVoltar}
              className="px-3 py-1.5 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar e editar a mensagem
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
