import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, GripVertical } from 'lucide-react';
import { AtividadeGestao, Cliente, InteracaoCliente, StatusCliente } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// Funil comercial (CRM): os clientes em colunas pela etapa (status do cadastro) — arrastar o
// cartão muda a etapa — e, em cima, os próximos passos combinados nas interações, com os
// vencidos em destaque. Um próximo passo fica resolvido quando é marcado aqui ou quando o
// compromisso criado na Agenda da Gestão é concluído.

const ETAPAS: { status: StatusCliente; cor: string; borda: string }[] = [
  { status: 'Prospecção', cor: 'text-sky-700', borda: 'border-sky-200 bg-sky-50/40' },
  { status: 'Em Negociação', cor: 'text-amber-700', borda: 'border-amber-200 bg-amber-50/40' },
  { status: 'Ativo', cor: 'text-emerald-700', borda: 'border-emerald-200 bg-emerald-50/40' },
  { status: 'Suspenso', cor: 'text-orange-700', borda: 'border-orange-200 bg-orange-50/40' },
  { status: 'Inativo', cor: 'text-slate-500', borda: 'border-slate-200 bg-slate-50' },
];

const hoje = () => new Date().toISOString().slice(0, 10);
const dataBr = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—');
const diasAte = (iso: string) => Math.round((Date.parse(`${iso}T12:00:00`) - Date.parse(`${hoje()}T12:00:00`)) / 86400000);

export interface PassoPendente {
  cliente: Cliente;
  interacao: InteracaoCliente;
}

/** Próximo passo ainda em aberto (não marcado e sem compromisso concluído na Agenda). */
export function passoPendente(i: InteracaoCliente, atividades: AtividadeGestao[]): boolean {
  if (!i.proximoPasso || i.proximoPassoConcluido) return false;
  if (i.atividadeId) {
    const a = atividades.find((x) => x.id === i.atividadeId);
    if (a && a.status === 'Concluída') return false;
  }
  return true;
}

export const ClientesFunil: React.FC<{
  clientes: Cliente[];
  atividades: AtividadeGestao[];
  onAbrir: (c: Cliente) => void;
  onMudarEtapa: (clienteId: string, status: StatusCliente) => void;
  onConcluirPasso: (clienteId: string, interacaoId: string) => void;
}> = ({ clientes, atividades, onAbrir, onMudarEtapa, onConcluirPasso }) => {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<StatusCliente | null>(null);

  const passos = useMemo(() => {
    const lista: PassoPendente[] = [];
    clientes.forEach((c) => (c.interacoes || []).forEach((i) => passoPendente(i, atividades) && lista.push({ cliente: c, interacao: i })));
    return lista.sort((a, b) => (a.interacao.dataProximoPasso || '9999').localeCompare(b.interacao.dataProximoPasso || '9999'));
  }, [clientes, atividades]);
  const vencidos = passos.filter((p) => p.interacao.dataProximoPasso && p.interacao.dataProximoPasso < hoje()).length;

  const ultimaInteracao = (c: Cliente) => [...(c.interacoes || [])].sort((a, b) => b.data.localeCompare(a.data))[0];
  const proximoDoCliente = (c: Cliente) => passos.find((p) => p.cliente.id === c.id)?.interacao;

  const corPrazo = (iso?: string) => {
    if (!iso) return 'text-slate-500';
    const d = diasAte(iso);
    return d < 0 ? 'text-rose-700 font-bold' : d <= 7 ? 'text-amber-700 font-bold' : 'text-slate-600';
  };
  const rotuloPrazo = (iso?: string) => {
    if (!iso) return 'sem prazo';
    const d = diasAte(iso);
    return d < 0 ? `vencido há ${-d} dia(s)` : d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`;
  };

  return (
    <div className="space-y-4">
      {/* Próximos passos */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#C48229]" /> Próximos passos ({passos.length})
          </h3>
          {vencidos > 0 && (
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {vencidos} vencido(s)
            </span>
          )}
        </div>
        {passos.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-400">Nenhum próximo passo em aberto. Registre uma interação com "Próximo passo" e prazo.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {passos.map(({ cliente, interacao }) => (
              <div key={interacao.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => onConcluirPasso(cliente.id, interacao.id)}
                  className="text-slate-300 hover:text-emerald-600 shrink-0"
                  title="Marcar como feito"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => onAbrir(cliente)} className="flex-1 min-w-0 text-left normal-case tracking-normal">
                  <span className="block font-bold text-slate-900 truncate">{interacao.proximoPasso}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {cliente.nomeFantasia || cliente.razaoSocial} · {interacao.responsavelJMT}
                    {interacao.atividadeId ? ' · na Agenda' : ''}
                  </span>
                </button>
                <span className={`text-[11px] text-right shrink-0 ${corPrazo(interacao.dataProximoPasso)}`}>
                  {dataBr(interacao.dataProximoPasso)}
                  <span className="block font-normal">{rotuloPrazo(interacao.dataProximoPasso)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Colunas por etapa */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {ETAPAS.map((etapa) => {
          const daEtapa = clientes.filter((c) => c.status === etapa.status);
          const total = daEtapa.reduce((s, c) => s + (Number(c.faturamentoMensalEstimado) || 0), 0);
          return (
            <div
              key={etapa.status}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(etapa.status);
              }}
              onDragLeave={() => setSobre((s) => (s === etapa.status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') || arrastando;
                if (id) onMudarEtapa(id, etapa.status);
                setArrastando(null);
                setSobre(null);
              }}
              className={`w-64 shrink-0 rounded-2xl border p-2.5 space-y-2 transition-colors ${etapa.borda} ${sobre === etapa.status ? 'ring-2 ring-[#C48229]' : ''}`}
            >
              <div className="px-1">
                <p className={`text-xs font-black uppercase tracking-wide ${etapa.cor}`}>
                  {etapa.status} <span className="text-slate-400 font-bold">({daEtapa.length})</span>
                </p>
                {total > 0 && <p className="text-[10px] text-slate-500">{formatCurrency(total)}/mês estimado</p>}
              </div>
              {daEtapa.map((c) => {
                const ultima = ultimaInteracao(c);
                const prox = proximoDoCliente(c);
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', c.id);
                      setArrastando(c.id);
                    }}
                    onDragEnd={() => setArrastando(null)}
                    onClick={() => onAbrir(c)}
                    className={`bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs cursor-pointer hover:border-[#C48229] ${arrastando === c.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{c.nomeFantasia || c.razaoSocial}</p>
                        <p className="text-[10px] text-slate-500 truncate">{c.segmento}</p>
                      </div>
                    </div>
                    {!!c.faturamentoMensalEstimado && <p className="mt-1 text-[11px] font-semibold text-emerald-700">{formatCurrency(c.faturamentoMensalEstimado)}/mês</p>}
                    {ultima && (
                      <p className="mt-1 text-[10px] text-slate-500 truncate">
                        Última: {ultima.tipo} · {dataBr(ultima.data)}
                      </p>
                    )}
                    {prox ? (
                      <p className={`mt-1 text-[10px] truncate ${corPrazo(prox.dataProximoPasso)}`}>
                        Próximo: {prox.proximoPasso} · {rotuloPrazo(prox.dataProximoPasso)}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> sem próximo passo
                      </p>
                    )}
                  </div>
                );
              })}
              {daEtapa.length === 0 && <p className="px-1 py-3 text-[10px] text-slate-400 text-center">Arraste um cliente para cá</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
