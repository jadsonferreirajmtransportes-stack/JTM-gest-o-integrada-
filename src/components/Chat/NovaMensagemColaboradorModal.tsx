import React, { useMemo, useState } from 'react';
import { FileText, Loader2, Paperclip, Search, Send, X } from 'lucide-react';
import { Colaborador } from '../../types';
import { iniciarConversaDp } from '../../utils/solicitacoesApi';
import { linkUnicoDe } from '../../utils/linkUnico';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';

// O DP começa uma conversa com um colaborador pelo Chat (vira "Mensagem do DP" no Fale com
// o DP do portal). O colaborador recebe aviso no app (se ativou) e, opcionalmente, pelo
// WhatsApp com o link pessoal já abrindo a conversa.

const nomeBonito = (n: string) => n.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const NovaMensagemColaboradorModal: React.FC<{
  colaboradores: Colaborador[];
  atendente?: string;
  onClose: () => void;
  onCriada: (demandaId: string) => void;
}> = ({ colaboradores, atendente, onClose, onCriada }) => {
  const [busca, setBusca] = useState('');
  const [escolhido, setEscolhido] = useState<Colaborador | null>(null);
  const [assunto, setAssunto] = useState('');
  const [texto, setTexto] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [avisarWhats, setAvisarWhats] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const lista = useMemo(() => {
    const termo = semAcento(busca.trim());
    return colaboradores
      .filter((c) => c.status !== 'Inativo')
      .filter((c) => !termo || semAcento(`${c.nomeCompleto} ${c.funcaoCargo || ''} ${c.setor || ''}`).includes(termo))
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
      .slice(0, 40);
  }, [colaboradores, busca]);

  const enviar = async () => {
    if (!escolhido || !texto.trim()) return;
    setEnviando(true);
    setErro(null);
    // Abre a janela do WhatsApp já no clique (o navegador bloqueia se abrir depois de esperar).
    const janela = avisarWhats && escolhido.telefoneWhatsapp ? window.open('', 'jmt-whatsapp') : null;
    try {
      const s = await iniciarConversaDp({
        colaboradorId: escolhido.id,
        colaboradorNome: escolhido.nomeCompleto,
        assunto: assunto || 'Recado do DP',
        texto,
        arquivos,
        atendente,
      });
      if (janela && escolhido.telefoneWhatsapp) {
        const link = await linkUnicoDe(escolhido.id, `solicitacao:${s.id}`);
        const url = buildWhatsAppLink(
          escolhido.telefoneWhatsapp,
          `Olá, ${nomeBonito(escolhido.nomeCompleto).split(' ')[0]}! O DP te mandou uma mensagem (${s.assunto}). Veja e responda pelo seu link pessoal:\n${link}\n\nJM Transportes — Departamento Pessoal`
        );
        if (url) janela.location.href = url;
        else janela.close();
      }
      onCriada(s.id);
    } catch (err) {
      janela?.close();
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">Falar com um colaborador</h2>
            <p className="text-slate-500 mt-0.5">A mensagem aparece no "Fale com o DP" do portal dele, que pode responder por lá. A conversa continua aqui no Chat.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {!escolhido ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  data-no-uppercase="true"
                  placeholder="Buscar colaborador pelo nome, cargo ou setor..."
                  className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {lista.length === 0 && <p className="p-3 text-slate-400">Ninguém encontrado.</p>}
                {lista.map((c) => (
                  <button key={c.id} type="button" onClick={() => setEscolhido(c)} className="w-full px-3 py-2 text-left hover:bg-slate-50 normal-case tracking-normal">
                    <span className="block font-bold text-slate-800">{nomeBonito(c.nomeCompleto)}</span>
                    <span className="block text-[10px] text-slate-500">{[c.funcaoCargo, c.setor].filter(Boolean).join(' · ')}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{nomeBonito(escolhido.nomeCompleto)}</p>
                  <p className="text-[10px] text-slate-500 truncate">{[escolhido.funcaoCargo, escolhido.setor].filter(Boolean).join(' · ')}</p>
                </div>
                <button type="button" onClick={() => setEscolhido(null)} className="text-[10px] font-bold text-[#92611F] hover:underline normal-case tracking-normal shrink-0">
                  Trocar
                </button>
              </div>
              <label className="block">
                <span className="font-semibold text-slate-700">Assunto</span>
                <input
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  data-texto-livre
                  placeholder="Ex.: Documento pendente, Exame periódico, Recado do DP"
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  maxLength={120}
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700">Mensagem</span>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  data-texto-livre
                  data-no-uppercase="true"
                  rows={5}
                  placeholder="Escreva a mensagem para o colaborador..."
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg resize-y"
                  maxLength={3000}
                />
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 cursor-pointer hover:bg-slate-50">
                  <Paperclip className="w-3.5 h-3.5" /> Anexar (até 3)
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const novos = Array.from(e.target.files || []);
                      setArquivos((p) => [...p, ...novos].slice(0, 3));
                      e.target.value = '';
                    }}
                  />
                </label>
                {arquivos.map((a, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-semibold text-slate-600">
                    <FileText className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{a.name}</span>
                    <button type="button" onClick={() => setArquivos((p) => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {escolhido.telefoneWhatsapp ? (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={avisarWhats} onChange={(e) => setAvisarWhats(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
                  <span className="text-slate-700">Também avisar pelo WhatsApp (abre a conversa com o link pessoal pronto)</span>
                </label>
              ) : (
                <p className="text-[10px] text-slate-500">Sem WhatsApp no cadastro: o colaborador verá no portal e receberá o aviso no app, se ativou.</p>
              )}
              {erro && <p className="text-rose-600 font-semibold">{erro}</p>}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={!escolhido || !texto.trim() || enviando}
            className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Enviar
          </button>
        </div>
      </div>
    </div>
  );
};
