import React, { useState } from 'react';
import { HardHat, Plus, Trash2, Send, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { ColaboradorPublico, EntregaEpi, ItemEntregaEpi, MotivoEntregaEpi } from '../../types';
import { JmtLogo } from '../Brand/JmtLogo';
import { AssinaturaDigitalPad } from './AssinaturaDigitalPad';
import { useBotGuard } from '../../utils/botProtection';

const MOTIVOS_ENTREGA_EPI: MotivoEntregaEpi[] = [
  'Entrega Inicial',
  'Troca por Desgaste',
  'Reposição por Perda',
  'Reposição por Dano',
  'Substituição Periódica',
  'Outro',
];

function criarItemVazio(): ItemEntregaEpi {
  return { id: `item-epi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, descricao: '', ca: '', quantidade: 1, motivo: 'Entrega Inicial' };
}

interface PublicEpiEntregaViewProps {
  colaboradores: ColaboradorPublico[];
  onSuccessSubmit: (entrega: EntregaEpi) => Promise<void>;
}

/** Formulário Público de Entrega de EPI — link GENÉRICO (?form=epi_entrega), preenchido sem
 *  login por um supervisor/responsável em nome do colaborador, com assinatura digital na tela
 *  (dispensa imprimir e assinar no papel depois, embora ainda seja possível). Mesmo padrão dos
 *  outros formulários públicos (Ocorrências, Admissão) — ver PublicOccurrenceForm.tsx. */
export const PublicEpiEntregaView: React.FC<PublicEpiEntregaViewProps> = ({ colaboradores, onSuccessSubmit }) => {
  const [colaboradorId, setColaboradorId] = useState('');
  const [recebedorNaoCadastrado, setRecebedorNaoCadastrado] = useState(false);
  const [recebedorNomeLivre, setRecebedorNomeLivre] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [responsavelEntrega, setResponsavelEntrega] = useState('');
  const [itens, setItens] = useState<ItemEntregaEpi[]>([criarItemVazio()]);
  const [observacoes, setObservacoes] = useState('');
  const [assinaturaDigitalUrl, setAssinaturaDigitalUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const botGuard = useBotGuard();

  const activeColaboradores = [...colaboradores].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));

  const handleAddItem = () => setItens((prev) => [...prev, criarItemVazio()]);
  const handleRemoveItem = (index: number) => setItens((prev) => prev.filter((_, i) => i !== index));
  const handleUpdateItem = (index: number, field: keyof ItemEntregaEpi, valor: any) => {
    setItens((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: valor } : it)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botGuard.isLikelyBot()) {
      console.warn('Envio bloqueado: comportamento automatizado detectado.');
      return;
    }
    const itensValidos = itens.filter((it) => it.descricao.trim());
    if (itensValidos.length === 0 || !responsavelEntrega.trim()) return;
    if (recebedorNaoCadastrado ? !recebedorNomeLivre.trim() : !colaboradorId) return;
    if (!assinaturaDigitalUrl) {
      setErroEnvio('Assinatura do recebedor é obrigatória.');
      return;
    }

    const payload: EntregaEpi = {
      id: `epi-pub-${Date.now()}`,
      colaboradorId: recebedorNaoCadastrado ? undefined : colaboradorId,
      recebedorNomeLivre: recebedorNaoCadastrado ? recebedorNomeLivre.trim() : undefined,
      data,
      responsavelEntrega: responsavelEntrega.trim(),
      itens: itensValidos,
      observacoes: observacoes.trim() || undefined,
      assinaturaDigitalUrl,
      criadoEm: new Date().toISOString(),
    };

    setEnviando(true);
    setErroEnvio(null);
    try {
      await onSuccessSubmit(payload);
      setEnviado(true);
    } catch (err) {
      console.error(err);
      setErroEnvio(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 flex flex-col font-sans">
      <header className="bg-[#0c0c0c] border-b border-[#262626] px-4 sm:px-8 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <JmtLogo variant="compact" theme="dark" iconSize={32} />
          <div className="hidden sm:block pl-3 border-l border-[#262626]">
            <span className="bg-[#B38F4F]/15 text-[#B38F4F] border border-[#B38F4F]/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Formulário de Entrega de EPI
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Preenchido pelo supervisor/responsável — sem login</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
          <ShieldCheck className="w-4 h-4 text-[#B38F4F]" />
          <span>Gestão por Processos JMT</span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {enviado ? (
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-8 sm:p-10 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Entrega de EPI registrada com sucesso!</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              O Departamento Pessoal da JMT já pode ver este registro no sistema.
            </p>
          </div>
        ) : (
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#B38F4F] flex items-center justify-center border border-amber-200 shrink-0">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">Registrar Entrega de EPI</h1>
                <p className="text-[11px] text-slate-500">Registro escrito exigido pela NR-6 (Portaria 3.214/78)</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Honeypot — invisible to real users, catches generic auto-fill bots */}
              <div {...botGuard.honeypotWrapperProps}>
                <label htmlFor={botGuard.honeypotFieldId}>Não preencha este campo</label>
                <input type="text" {...botGuard.honeypotFieldProps} />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Responsável pela Entrega (seu nome) *</label>
                <input
                  type="text"
                  required
                  value={responsavelEntrega}
                  onChange={(e) => setResponsavelEntrega(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Colaborador (Recebedor) *</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recebedorNaoCadastrado}
                      onChange={(e) => setRecebedorNaoCadastrado(e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    Não está na lista
                  </label>
                </div>
                {recebedorNaoCadastrado ? (
                  <input
                    type="text"
                    required
                    value={recebedorNomeLivre}
                    onChange={(e) => setRecebedorNomeLivre(e.target.value)}
                    placeholder="Nome completo do recebedor"
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                ) : (
                  <select
                    required
                    value={colaboradorId}
                    onChange={(e) => setColaboradorId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                  >
                    <option value="">Selecione o colaborador</option>
                    {activeColaboradores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nomeCompleto} ({c.funcaoCargo} — {c.setor})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Data da Entrega *</label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">Itens Entregues *</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] font-bold text-[#8A6A39] hover:text-[#6b5029] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar item
                  </button>
                </div>
                <div className="space-y-2">
                  {itens.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        required
                        placeholder="Descrição do EPI"
                        value={item.descricao}
                        onChange={(e) => handleUpdateItem(idx, 'descricao', e.target.value)}
                        className="col-span-5 p-1.5 border border-slate-200 rounded-md text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="CA"
                        value={item.ca}
                        onChange={(e) => handleUpdateItem(idx, 'ca', e.target.value)}
                        title="Certificado de Aprovação (CA) do EPI"
                        className="col-span-2 p-1.5 border border-slate-200 rounded-md text-[11px]"
                      />
                      <input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) => handleUpdateItem(idx, 'quantidade', Number(e.target.value) || 1)}
                        className="col-span-1 p-1.5 border border-slate-200 rounded-md text-[11px] text-right"
                      />
                      <select
                        value={item.motivo}
                        onChange={(e) => handleUpdateItem(idx, 'motivo', e.target.value as MotivoEntregaEpi)}
                        className="col-span-3 p-1.5 border border-slate-200 rounded-md text-[11px]"
                      >
                        {MOTIVOS_ENTREGA_EPI.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={itens.length === 1}
                        className="col-span-1 p-1.5 text-rose-500 hover:bg-rose-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">CA = Certificado de Aprovação do EPI (exigido pela NR-6).</p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais sobre a entrega..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <AssinaturaDigitalPad onChange={setAssinaturaDigitalUrl} />

              {erroEnvio && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Não foi possível enviar: {erroEnvio}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full px-5 py-2.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{enviando ? 'Enviando...' : 'Registrar Entrega'}</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
