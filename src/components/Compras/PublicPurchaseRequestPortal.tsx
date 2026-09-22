import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  ShoppingCart,
  Upload,
  FileText,
  Send,
  Plus,
  Trash2,
} from 'lucide-react';
import { SolicitacaoCompra, UrgenciaSolicitacaoCompra } from '../../types';
import { JmtLogo } from '../Brand/JmtLogo';
import { useBotGuard } from '../../utils/botProtection';

interface PublicPurchaseRequestPortalProps {
  onSuccessSubmit: (item: SolicitacaoCompra) => Promise<void>;
  onAdminBack?: () => void;
}

const LIMITE_ANEXO_MB = 5;

/** Formulário público (sem login) de solicitação de compra — mesmo padrão de segurança/UI dos
 *  outros formulários públicos (Admissão, Ocorrências): honeypot anti-bot via useBotGuard,
 *  envio direto pro Supabase com o papel "anon" (só INSERT — ver migração
 *  050_solicitacoes_compra.sql), acessado via link `?form=compras`. */
export const PublicPurchaseRequestPortal: React.FC<PublicPurchaseRequestPortalProps> = ({
  onSuccessSubmit,
  onAdminBack,
}) => {
  const [itens, setItens] = useState<{ item: string; quantidade: string; valorEstimado: string }[]>([
    { item: '', quantidade: '1', valorEstimado: '' },
  ]);
  const [setor, setSetor] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [fornecedorSugerido, setFornecedorSugerido] = useState('');
  const [urgencia, setUrgencia] = useState<UrgenciaSolicitacaoCompra>('Normal');
  const [prazoNecessario, setPrazoNecessario] = useState('');
  const [solicitanteNome, setSolicitanteNome] = useState('');
  const [solicitanteContato, setSolicitanteContato] = useState('');
  const [anexoNome, setAnexoNome] = useState('');
  const [anexoUrl, setAnexoUrl] = useState('');
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const botGuard = useBotGuard();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroUpload(null);
    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB > LIMITE_ANEXO_MB) {
      setErroUpload(`"${file.name}" tem ${tamanhoMB.toFixed(1)}MB — o limite é ${LIMITE_ANEXO_MB}MB.`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAnexoNome(file.name);
      setAnexoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddLinhaItem = () => {
    setItens((prev) => [...prev, { item: '', quantidade: '1', valorEstimado: '' }]);
  };
  const handleRemoveLinhaItem = (idx: number) => {
    setItens((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };
  const handleUpdateLinhaItem = (idx: number, campo: 'item' | 'quantidade' | 'valorEstimado', valor: string) => {
    setItens((prev) => prev.map((linha, i) => (i === idx ? { ...linha, [campo]: valor } : linha)));
  };

  const resetForm = () => {
    setItens([{ item: '', quantidade: '1', valorEstimado: '' }]);
    setSetor('');
    setJustificativa('');
    setFornecedorSugerido('');
    setUrgencia('Normal');
    setPrazoNecessario('');
    setSolicitanteNome('');
    setSolicitanteContato('');
    setAnexoNome('');
    setAnexoUrl('');
    setSubmittedProtocol(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botGuard.isLikelyBot()) {
      console.warn('Envio bloqueado: comportamento automatizado detectado.');
      return;
    }
    const linhasValidas = itens.filter((l) => l.item.trim());
    if (linhasValidas.length === 0) {
      alert('Por favor, informe ao menos um item que precisa comprar.');
      return;
    }
    if (!solicitanteNome.trim()) {
      alert('Por favor, informe seu nome.');
      return;
    }

    setIsSubmitting(true);
    setErroEnvio(null);
    const protocolNum = `JMT-COMPRA-${Date.now().toString().slice(-6)}`;
    const agora = Date.now();
    const grupoId = linhasValidas.length > 1 ? `pedido-${agora}` : undefined;
    const payloads: SolicitacaoCompra[] = linhasValidas.map((linha, idx) => ({
      id: `compra-${agora}-${idx}`,
      grupoId,
      item: linha.item.trim(),
      quantidade: Number(linha.quantidade) || 1,
      setor: setor.trim() || undefined,
      justificativa: justificativa.trim() || undefined,
      valorEstimado: linha.valorEstimado ? Number(linha.valorEstimado.replace(/\./g, '').replace(',', '.')) : undefined,
      fornecedorSugerido: fornecedorSugerido.trim() || undefined,
      urgencia,
      prazoNecessario: prazoNecessario || undefined,
      anexoNome: anexoNome || undefined,
      anexoUrl: anexoUrl || undefined,
      solicitanteNome: solicitanteNome.trim(),
      solicitanteContato: solicitanteContato.trim() || undefined,
      status: 'Pendente',
      criadoEm: new Date().toISOString(),
    }));

    setTimeout(async () => {
      try {
        for (const payload of payloads) {
          // Sequencial (não Promise.all) — evita rajada simultânea no Supabase e mantém a
          // ordem de criação previsível caso algum item falhe no meio da lista.
          await onSuccessSubmit(payload);
        }
        setSubmittedProtocol(protocolNum);
      } catch (err) {
        console.error(err);
        setErroEnvio(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSubmitting(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 flex flex-col font-sans selection:bg-[#C48229] selection:text-white">
      <header className="bg-[#0c0c0c] border-b border-[#262626] sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <JmtLogo variant="compact" theme="dark" iconSize={32} />
          <div className="hidden sm:block pl-3 border-l border-[#262626]">
            <span className="bg-[#C48229]/15 text-[#C48229] border border-[#C48229]/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Canal de Compras
            </span>
            <p className="text-[11px] text-slate-400">Solicitação de Item para Compra</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
            <ShieldCheck className="w-4 h-4 text-[#C48229]" />
            <span>JM Transportes</span>
          </div>
          {onAdminBack && (
            <button
              type="button"
              onClick={onAdminBack}
              className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-slate-200 border border-[#2a2a2a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C48229]" />
              <span>Painel Admin</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {submittedProtocol ? (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                Protocolo: {submittedProtocol}
              </span>
              <h2 className="text-2xl font-bold text-white">Solicitação Enviada com Sucesso!</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Seu pedido de compra foi recebido e entra na fila de aprovação da diretoria da JMT.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-xl transition-colors"
            >
              Fazer Outra Solicitação
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-2 pt-2">
              <div className="w-14 h-14 bg-[#C48229]/15 text-[#C48229] border border-[#C48229]/30 rounded-2xl flex items-center justify-center mx-auto">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-white">Solicitar Item para Compra</h1>
              <p className="text-sm text-slate-400">Preencha os dados abaixo — sem precisar de login.</p>
            </div>

            {/* Honeypot — invisível a usuários reais, pega bots que preenchem tudo automaticamente */}
            <div {...botGuard.honeypotWrapperProps}>
              <label htmlFor={botGuard.honeypotFieldId}>Não preencha este campo</label>
              <input type="text" {...botGuard.honeypotFieldProps} />
            </div>

            {erroEnvio && (
              <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl p-3">
                Não foi possível enviar sua solicitação: {erroEnvio}. Tente novamente.
              </div>
            )}

            <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Itens *</label>
                  <button
                    type="button"
                    onClick={handleAddLinhaItem}
                    className="text-[11px] font-semibold text-[#C48229] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar outro item
                  </button>
                </div>
                {itens.map((linha, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                    <input
                      type="text"
                      required={idx === 0}
                      value={linha.item}
                      onChange={(e) => handleUpdateLinhaItem(idx, 'item', e.target.value)}
                      placeholder="Ex: Resma de papel A4"
                      className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                    />
                    <input
                      type="number"
                      required={idx === 0}
                      min={1}
                      value={linha.quantidade}
                      onChange={(e) => handleUpdateLinhaItem(idx, 'quantidade', e.target.value)}
                      placeholder="Qtd."
                      className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                    />
                    <input
                      type="text"
                      value={linha.valorEstimado}
                      onChange={(e) => handleUpdateLinhaItem(idx, 'valorEstimado', e.target.value)}
                      placeholder="R$ (opc.)"
                      className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                    />
                    {itens.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveLinhaItem(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Justificativa</label>
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={3}
                  placeholder="Pra que precisa / onde vai ser usado"
                  className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Urgência</label>
                  <select
                    value={urgencia}
                    onChange={(e) => setUrgencia(e.target.value as UrgenciaSolicitacaoCompra)}
                    className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Setor</label>
                  <input
                    type="text"
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    placeholder="Ex: Departamento Pessoal"
                    className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Fornecedor Sugerido</label>
                <input
                  type="text"
                  value={fornecedorSugerido}
                  onChange={(e) => setFornecedorSugerido(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Prazo Necessário</label>
                <input
                  type="date"
                  value={prazoNecessario}
                  onChange={(e) => setPrazoNecessario(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Seu Nome *</label>
                  <input
                    type="text"
                    required
                    value={solicitanteNome}
                    onChange={(e) => setSolicitanteNome(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Contato (telefone/e-mail)</label>
                  <input
                    type="text"
                    value={solicitanteContato}
                    onChange={(e) => setSolicitanteContato(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Anexar Orçamento/Foto (opcional)</label>
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 hover:border-[#C48229] rounded-xl cursor-pointer transition-colors bg-[#1a1a1a]">
                  {anexoNome ? (
                    <span className="text-xs font-semibold text-[#C48229] flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> {anexoNome}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Upload className="w-4 h-4" /> Clique para escolher o arquivo
                    </span>
                  )}
                  <input type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp" />
                </label>
                {erroUpload && <p className="text-[11px] text-rose-400 mt-1">{erroUpload}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#C48229] hover:bg-[#92611F] disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                'Enviando...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {itens.filter((l) => l.item.trim()).length > 1
                    ? `Enviar ${itens.filter((l) => l.item.trim()).length} Itens`
                    : 'Enviar Solicitação'}
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
