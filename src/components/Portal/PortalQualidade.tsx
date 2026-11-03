import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, Loader2, Paperclip, Plus, Send, ShieldAlert, X } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { CATEGORIAS_RELATO_PORTAL, COR_SELO, configQualidade } from '../../data/qualidadeConfig';
import { RelatoPortal, portalMeusRelatos, portalRelatarOcorrencia } from '../../utils/qualidadeApi';
import { AnexoSolicitacao, enviarAnexoPortal } from '../../utils/solicitacoesApi';

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const campoCls = 'mt-1 w-full p-3 border border-slate-300 rounded-xl bg-white text-sm';

/** Portal do colaborador: relatar uma ocorrência à Qualidade (avaria, extravio, temperatura...). */
export const PortalQualidade: React.FC<{ credenciais: CredenciaisPortal }> = ({ credenciais }) => {
  const [lista, setLista] = useState<RelatoPortal[] | null>(null);
  const [novo, setNovo] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = () =>
    portalMeusRelatos(credenciais)
      .then(setLista)
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar.');
        setLista([]);
      });
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais]);

  if (novo) return <NovoRelato credenciais={credenciais} onVoltar={() => setNovo(false)} onEnviado={(p) => (setNovo(false), setEnviado(p), carregar())} />;

  const status = configQualidade('desvio').status;
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-black text-slate-900">Relatar ocorrência</p>
          <p className="text-xs text-slate-500">Viu uma avaria, falta de volume, problema de temperatura, embalagem ou limpeza? Avise a Qualidade. Relatar ajuda a proteger os medicamentos e os pacientes.</p>
        </div>
      </div>
      {enviado && (
        <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Ocorrência {enviado} enviada. Obrigado por avisar!
        </p>
      )}
      <button type="button" onClick={() => (setEnviado(null), setNovo(true))} className="w-full py-3 rounded-2xl bg-[#C48229] hover:bg-[#92611F] text-white text-sm font-bold flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Relatar uma ocorrência
      </button>
      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {lista === null ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : (
        lista.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-400">Minhas ocorrências</h2>
            {lista.map((r) => {
              const s = status.find((x) => x.id === r.status);
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-[#92611F]">{r.protocolo}</p>
                    <p className="text-sm font-bold text-slate-900">{r.categoria || 'Ocorrência'}</p>
                    <p className="text-[11px] text-slate-500">Do dia {dataBr(r.data)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${s ? COR_SELO[s.cor] : COR_SELO.cinza}`}>{r.status === 'aberto' ? 'Recebida' : s?.rotulo || r.status}</span>
                </div>
              );
            })}
          </section>
        )
      )}
    </div>
  );
};

const NovoRelato: React.FC<{ credenciais: CredenciaisPortal; onVoltar: () => void; onEnviado: (protocolo: string) => void }> = ({ credenciais, onVoltar, onEnviado }) => {
  const [d, setD] = useState({ categoria: '', data: new Date().toLocaleDateString('sv-SE'), cliente: '', documento: '', local: '', descricao: '', acaoImediata: '' });
  const [anexos, setAnexos] = useState<AnexoSolicitacao[]>([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mudar = (p: Partial<typeof d>) => setD((x) => ({ ...x, ...p }));

  const fotos = async (l: FileList | null) => {
    if (!l?.length) return;
    setEnviandoFoto(true);
    setErro(null);
    try {
      const novos: AnexoSolicitacao[] = [];
      for (const arq of Array.from(l).slice(0, 3 - anexos.length)) novos.push(await enviarAnexoPortal(credenciais.token, arq));
      setAnexos((a) => [...a, ...novos]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!d.categoria) return setErro('Escolha o tipo de ocorrência.');
    if (d.descricao.trim().length < 5) return setErro('Conte o que aconteceu.');
    setEnviando(true);
    try {
      const r = await portalRelatarOcorrencia(credenciais, d, anexos);
      onEnviado(r.protocolo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar.');
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3" data-texto-livre="true">
      <button type="button" onClick={onVoltar} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
      <form onSubmit={enviar} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs text-xs">
        <p className="text-sm font-black text-slate-900">Relatar ocorrência à Qualidade</p>
        <label className="block">
          <span className="font-bold text-slate-700">Tipo de ocorrência *</span>
          <select value={d.categoria} onChange={(e) => mudar({ categoria: e.target.value })} className={campoCls}>
            <option value="">Escolha...</option>
            {CATEGORIAS_RELATO_PORTAL.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="font-bold text-slate-700">Quando</span>
            <input type="date" value={d.data} onChange={(e) => mudar({ data: e.target.value })} className={campoCls} />
          </label>
          <label className="block">
            <span className="font-bold text-slate-700">Onde (local / placa)</span>
            <input value={d.local} onChange={(e) => mudar({ local: e.target.value })} maxLength={120} className={campoCls} />
          </label>
          <label className="block">
            <span className="font-bold text-slate-700">Cliente (se souber)</span>
            <input value={d.cliente} onChange={(e) => mudar({ cliente: e.target.value })} maxLength={120} className={campoCls} />
          </label>
          <label className="block">
            <span className="font-bold text-slate-700">NF / CT-e (se souber)</span>
            <input value={d.documento} onChange={(e) => mudar({ documento: e.target.value })} maxLength={120} className={campoCls} />
          </label>
        </div>
        <label className="block">
          <span className="font-bold text-slate-700">O que aconteceu? *</span>
          <textarea value={d.descricao} onChange={(e) => mudar({ descricao: e.target.value.slice(0, 3000) })} rows={4} placeholder="Ex.: na conferência, 2 volumes da NF chegaram com a caixa amassada e úmida." className={campoCls} />
        </label>
        <label className="block">
          <span className="font-bold text-slate-700">O que você já fez? (opcional)</span>
          <textarea value={d.acaoImediata} onChange={(e) => mudar({ acaoImediata: e.target.value.slice(0, 2000) })} rows={2} placeholder="Ex.: separei os volumes e avisei o supervisor." className={campoCls} />
        </label>
        <div className="space-y-1.5">
          <span className="font-bold text-slate-700">Fotos (até 3)</span>
          <div className="flex flex-wrap gap-2">
            {anexos.map((a, i) => (
              <span key={a.caminho || i} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg border border-slate-200 bg-slate-50">
                {a.nome}
                <button type="button" onClick={() => setAnexos((x) => x.filter((_, k) => k !== i))} className="p-0.5 text-slate-400 hover:text-rose-600" title="Tirar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {anexos.length < 3 && (
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-slate-600 font-bold cursor-pointer">
                {enviandoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />} Anexar foto ou PDF
                <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => fotos(e.target.files)} disabled={enviandoFoto} />
              </label>
            )}
          </div>
        </div>
        {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        <button type="submit" disabled={enviando || enviandoFoto} className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar à Qualidade
        </button>
        <p className="text-[10px] text-slate-400 text-center">Só a equipe da Qualidade vê o seu relato e as fotos.</p>
      </form>
    </div>
  );
};
