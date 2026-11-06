import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { PedidoCompraPortal, portalComprasEstado, portalComprasSolicitar } from '../../utils/comprasApi';

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const ESTILO: Record<string, string> = {
  Pendente: 'bg-amber-50 text-[#92611F] border-amber-200',
  Aprovado: 'bg-sky-50 text-sky-700 border-sky-200',
  Comprado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Recusado: 'bg-rose-50 text-rose-700 border-rose-200',
};
const ROTULO: Record<string, string> = { Pendente: 'Aguardando aprovação', Aprovado: 'Aprovado', Comprado: 'Comprado', Recusado: 'Recusado' };

/** Portal: pedir compras e acompanhar os próprios pedidos (migração 114). */
export const PortalCompras: React.FC<{ credenciais: CredenciaisPortal }> = ({ credenciais }) => {
  const [estado, setEstado] = useState<{ permitido: boolean; pedidos: PedidoCompraPortal[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [itens, setItens] = useState([{ item: '', quantidade: '1' }]);
  const [justificativa, setJustificativa] = useState('');
  const [setor, setSetor] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [urgencia, setUrgencia] = useState<'Normal' | 'Urgente'>('Normal');
  const [prazo, setPrazo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  const carregar = () =>
    portalComprasEstado(credenciais)
      .then(setEstado)
      .catch(() => setErro('Não foi possível abrir agora. Tente de novo.'));
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const validos = itens.filter((i) => i.item.trim());
    if (!validos.length) return setErro('Informe ao menos um item.');
    setEnviando(true);
    setErro(null);
    try {
      const p = await portalComprasSolicitar(credenciais, {
        itens: validos.map((i) => ({ item: i.item.trim(), quantidade: Number(i.quantidade.replace(',', '.')) || 1 })),
        setor,
        justificativa,
        fornecedor,
        urgencia,
        prazo,
      });
      setProtocolo(p);
      setNovo(false);
      setItens([{ item: '', quantidade: '1' }]);
      setJustificativa('');
      setFornecedor('');
      setUrgencia('Normal');
      setPrazo('');
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  };

  if (!estado)
    return erro ? (
      <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>
    ) : (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
      </div>
    );
  if (!estado.permitido) return <p className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600">Esta área é só para quem foi liberado para pedir compras.</p>;

  const campo = 'w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white';
  return (
    <div className="space-y-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
          <ShoppingCart className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-base font-black text-slate-900 normal-case">Compras</h2>
          <p className="text-xs text-slate-500">Peça o que precisa ser comprado e acompanhe a aprovação até a compra.</p>
        </div>
      </div>

      {protocolo && (
        <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Pedido enviado ({protocolo}). Você acompanha a situação aqui embaixo.
        </p>
      )}

      {novo ? (
        <form onSubmit={enviar} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
          <p className="font-black text-slate-900 text-sm">Novo pedido</p>
          {itens.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input value={it.item} onChange={(e) => setItens((l) => l.map((x, k) => (k === i ? { ...x, item: e.target.value } : x)))} placeholder={i === 0 ? 'O que precisa comprar (ex.: lâmpada LED 9W)' : 'Mais um item'} className={campo} />
              <input value={it.quantidade} onChange={(e) => setItens((l) => l.map((x, k) => (k === i ? { ...x, quantidade: e.target.value } : x)))} inputMode="decimal" className="w-16 p-2.5 border border-slate-300 rounded-xl text-sm text-center" title="Quantidade" />
              {itens.length > 1 && (
                <button type="button" onClick={() => setItens((l) => l.filter((_, k) => k !== i))} className="px-2 text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setItens((l) => [...l, { item: '', quantidade: '1' }])} className="text-[11px] font-bold text-[#92611F] flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Outro item
          </button>
          <label className="block">
            <span className="font-bold text-slate-600">Para que serve / por que precisa</span>
            <textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={2} className={campo} placeholder="Ex.: a lâmpada da copa queimou" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="font-bold text-slate-600">Setor</span>
              <input value={setor} onChange={(e) => setSetor(e.target.value)} className={campo} placeholder="Ex.: Qualidade" />
            </label>
            <label className="block">
              <span className="font-bold text-slate-600">Precisa até (opcional)</span>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={campo} />
            </label>
          </div>
          <label className="block">
            <span className="font-bold text-slate-600">Onde comprar (opcional)</span>
            <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className={campo} placeholder="Ex.: loja X ou link do produto" />
          </label>
          <div className="flex gap-2">
            {(['Normal', 'Urgente'] as const).map((u) => (
              <button key={u} type="button" onClick={() => setUrgencia(u)} className={`flex-1 py-2 rounded-xl border font-bold ${urgencia === u ? (u === 'Urgente' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-[#C48229] border-[#C48229] text-white') : 'bg-white border-slate-200 text-slate-600'}`}>
                {u}
              </button>
            ))}
          </div>
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setNovo(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold">
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="flex-1 py-2.5 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Enviar pedido
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => (setNovo(true), setProtocolo(null))} className="w-full py-3 rounded-2xl bg-[#C48229] hover:bg-[#92611F] text-white text-sm font-bold flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> Novo pedido de compra
        </button>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <p className="text-sm font-black text-slate-900">Meus pedidos</p>
        {estado.pedidos.length === 0 ? (
          <p className="text-xs text-slate-500">Você ainda não fez pedidos.</p>
        ) : (
          estado.pedidos.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-2 py-2 border-t border-slate-100 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-slate-900">
                  {p.quantidade}x {p.item}
                  {p.urgencia === 'Urgente' && <span className="ml-1.5 text-[10px] text-rose-700 font-bold">Urgente</span>}
                </p>
                <p className="text-[11px] text-slate-500">
                  Pedido em {dataBr(p.criadoEm)}
                  {p.prazo ? ` · precisa até ${dataBr(p.prazo)}` : ''}
                </p>
                {p.status === 'Recusado' && p.motivoRecusa && <p className="text-[11px] text-rose-700">Motivo: {p.motivoRecusa}</p>}
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${ESTILO[p.status] || ESTILO.Pendente}`}>{ROTULO[p.status] || p.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
