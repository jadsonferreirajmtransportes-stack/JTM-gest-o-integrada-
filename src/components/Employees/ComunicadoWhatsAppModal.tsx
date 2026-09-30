import React, { useMemo, useState } from 'react';
import { X, MessageCircle, Users, Send } from 'lucide-react';
import { Colaborador } from '../../types';
import { EnvioWhatsAppEmMassaModal, ItemEnvioWhatsApp } from '../Common/EnvioWhatsAppEmMassaModal';

interface ComunicadoWhatsAppModalProps {
  /** Já filtrados pela tela de Colaboradores (setor, status, empresa, busca) — o comunicado vai
   *  pra essa lista, com opção de desmarcar alguém. */
  colaboradores: Colaborador[];
  onClose: () => void;
}

const MODELO =
  'Olá, {nome}! \n\n' +
  '(escreva aqui o comunicado)\n\n' +
  'JM Transportes — Departamento Pessoal';

/** Comunicado geral do DP por WhatsApp: escreve uma vez (com {nome} pra personalizar), escolhe
 *  quem recebe e passa pro envio assistido (EnvioWhatsAppEmMassaModal). */
export const ComunicadoWhatsAppModal: React.FC<ComunicadoWhatsAppModalProps> = ({ colaboradores, onClose }) => {
  const [mensagem, setMensagem] = useState(MODELO);
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  const ordenados: Colaborador[] = useMemo(
    () => [...colaboradores].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
    [colaboradores]
  );
  const selecionados = ordenados.filter((c) => !desmarcados.has(c.id));

  const primeiroNome = (nome: string) => {
    const p = (nome || '').trim().split(/\s+/)[0] || '';
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  };

  const itens: ItemEnvioWhatsApp[] = selecionados.map((c) => ({
    id: c.id,
    nome: c.nomeCompleto,
    telefone: c.telefoneWhatsapp,
    mensagem: mensagem.replace(/\{nome\}/gi, primeiroNome(c.nomeCompleto)),
  }));

  const alternar = (id: string) =>
    setDesmarcados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  if (enviando) {
    return (
      <EnvioWhatsAppEmMassaModal
        titulo="Comunicado por WhatsApp"
        itens={itens}
        onClose={onClose}
        onVoltar={() => setEnviando(false)}
      />
    );
  }

  const mensagemVazia = !mensagem.trim() || mensagem.includes('(escreva aqui o comunicado)');

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Comunicado por WhatsApp
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Mensagem</label>
            <textarea
              rows={7}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Use <strong>{'{nome}'}</strong> onde quiser o primeiro nome de cada colaborador.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Destinatários ({selecionados.length} de {ordenados.length})
              </label>
              <div className="flex gap-2 text-[11px] font-semibold">
                <button type="button" onClick={() => setDesmarcados(new Set())} className="text-[#92611F] hover:underline">
                  Marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => setDesmarcados(new Set(ordenados.map((c) => c.id)))}
                  className="text-slate-500 hover:underline"
                >
                  Desmarcar todos
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-1.5">
              São os colaboradores que estão na lista agora — use os filtros da tela (setor, status, empresa, busca) antes de
              abrir o comunicado para mandar só para um grupo.
            </p>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {ordenados.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={!desmarcados.has(c.id)} onChange={() => alternar(c.id)} />
                  <span className="flex-1 truncate text-slate-700">{c.nomeCompleto}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{c.setor || c.funcaoCargo}</span>
                  {!c.telefoneWhatsapp && <span className="text-[10px] font-bold text-rose-500 shrink-0">sem WhatsApp</span>}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => setEnviando(true)}
            disabled={selecionados.length === 0 || mensagemVazia}
            title={mensagemVazia ? 'Escreva o comunicado antes de enviar' : undefined}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Começar envio para {selecionados.length}
          </button>
        </div>
      </div>
    </div>
  );
};
