import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileSpreadsheet, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import type { Colaborador } from '../../types';
import { Formulario, Pergunta, RespostaFormulario, excluirResposta, getRespostas, textoResposta } from '../../utils/formulariosApi';
import { garantirTokensPortal, montarLinkUnico } from '../../utils/linkUnico';
import { EnvioWhatsAppEmMassaModal, ItemEnvioWhatsApp } from '../Common/EnvioWhatsAppEmMassaModal';
import { baixarBlob } from '../../utils/downloadUtils';

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const nomeBonito = (n: string) => n.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
const quem = (r: RespostaFormulario) =>
  r.origem === 'portal' ? nomeBonito(r.colaboradorNome || 'Colaborador') : r.nomeExterno ? `${r.nomeExterno}${r.contatoExterno ? ` · ${r.contatoExterno}` : ''}` : 'Anônimo (link externo)';

type Aba = 'resumo' | 'individuais' | 'pendentes';

/** Barra horizontal de contagem (resumo). */
const Barra: React.FC<{ rotulo: string; qtd: number; total: number }> = ({ rotulo, qtd, total }) => {
  const pct = total ? Math.round((qtd / total) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-700 truncate">{rotulo}</span>
        <span className="text-slate-500 tabular-nums shrink-0">
          {qtd} · {pct}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#C48229]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const ResumoPergunta: React.FC<{ p: Pergunta; respostas: RespostaFormulario[] }> = ({ p, respostas }) => {
  const valores = respostas.map((r) => r.respostas[p.id]).filter((v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length));
  const total = valores.length;
  let corpo: React.ReactNode;
  if (['multipla', 'lista', 'caixas', 'simnao'].includes(p.tipo)) {
    const opcoes = p.tipo === 'simnao' ? ['Sim', 'Não'] : p.opcoes || [];
    const conta = new Map<string, number>();
    valores.forEach((v) => (Array.isArray(v) ? v : [textoResposta(v)]).forEach((o) => conta.set(String(o), (conta.get(String(o)) || 0) + 1)));
    // Para caixas, o % é sobre quem respondeu (cada um pode marcar várias).
    corpo = (
      <div className="space-y-2">
        {[...opcoes, ...Array.from(conta.keys()).filter((k) => !opcoes.includes(k))].map((o) => (
          <Barra key={o} rotulo={o} qtd={conta.get(o) || 0} total={total} />
        ))}
      </div>
    );
  } else if (p.tipo === 'escala' || p.tipo === 'numero') {
    const nums = valores.map(Number).filter((n) => !isNaN(n));
    const media = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
    if (p.tipo === 'escala') {
      const min = p.min ?? 1;
      const max = p.max ?? 5;
      corpo = (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">
            Média: <b className="text-lg text-[#92611F]">{nums.length ? media.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}</b> de {max}
          </p>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <Barra key={n} rotulo={`Nota ${n}`} qtd={nums.filter((x) => x === n).length} total={nums.length} />
          ))}
        </div>
      );
    } else {
      corpo = (
        <p className="text-sm text-slate-700">
          Média <b>{nums.length ? media.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'}</b> · menor <b>{nums.length ? Math.min(...nums) : '—'}</b> · maior <b>{nums.length ? Math.max(...nums) : '—'}</b>
        </p>
      );
    }
  } else {
    corpo = (
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
        {valores.length === 0 && <p className="text-slate-400 py-1">Sem respostas.</p>}
        {[...valores].reverse().map((v, i) => (
          <p key={i} className="py-1.5 text-slate-700 whitespace-pre-line">
            {p.tipo === 'data' ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : textoResposta(v)}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
      <div>
        <p className="text-sm font-bold text-slate-900">{p.titulo}</p>
        <p className="text-[11px] text-slate-500">{total} resposta(s)</p>
      </div>
      {corpo}
    </div>
  );
};

export const FormularioRespostas: React.FC<{ formulario: Formulario; colaboradores: Colaborador[]; onVoltar: () => void }> = ({ formulario: f, colaboradores, onVoltar }) => {
  const [respostas, setRespostas] = useState<RespostaFormulario[] | null>(null);
  const [aba, setAba] = useState<Aba>('resumo');
  const [envio, setEnvio] = useState<ItemEnvioWhatsApp[] | null>(null);
  const [preparando, setPreparando] = useState(false);

  useEffect(() => {
    getRespostas(f.id)
      .then(setRespostas)
      .catch((e) => {
        console.error(e);
        setRespostas([]);
      });
  }, [f.id]);

  const pendentes = useMemo(() => {
    if (!f.noPortal || !respostas) return [];
    const responderam = new Set(respostas.map((r) => r.colaboradorId).filter(Boolean));
    const alvo = f.destinatarios ? colaboradores.filter((c) => f.destinatarios!.includes(c.id)) : colaboradores;
    return alvo.filter((c) => !responderam.has(c.id));
  }, [f, respostas, colaboradores]);

  const exportarExcel = async () => {
    if (!respostas) return;
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Respostas');
    ws.addRow(['Data', 'Origem', 'Quem respondeu', 'Contato', ...f.perguntas.map((p) => p.titulo)]);
    ws.getRow(1).font = { bold: true };
    respostas.forEach((r) =>
      ws.addRow([
        new Date(r.criadoEm),
        r.origem === 'portal' ? 'Portal' : 'Link externo',
        r.origem === 'portal' ? nomeBonito(r.colaboradorNome || '') : r.nomeExterno || 'Anônimo',
        r.contatoExterno || '',
        ...f.perguntas.map((p) => {
          const v = r.respostas[p.id];
          return typeof v === 'number' ? v : textoResposta(v);
        }),
      ])
    );
    ws.getColumn(1).numFmt = 'dd/mm/yyyy hh:mm';
    ws.columns.forEach((c, i) => (c.width = i < 4 ? 20 : 28));
    const buf = await wb.xlsx.writeBuffer();
    const nome = `Respostas_${f.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 50)}.xlsx`;
    baixarBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nome);
  };

  const enviarPendentes = async () => {
    setPreparando(true);
    try {
      const tokens = await garantirTokensPortal(pendentes.map((c) => c.id));
      setEnvio(
        pendentes.map((c) => {
          const link = montarLinkUnico(tokens.get(c.id) as string, `formulario:${f.id}`);
          return {
            id: c.id,
            nome: c.nomeCompleto,
            telefone: c.telefoneWhatsapp,
            mensagem: `Olá, ${nomeBonito(c.nomeCompleto).split(' ')[0]}! Responda o formulário "${f.titulo}" pelo seu link pessoal:\n${link}\n\nJM Transportes`,
          };
        })
      );
    } catch (e) {
      console.error(e);
      alert('Não foi possível montar os links pessoais agora.');
    } finally {
      setPreparando(false);
    }
  };

  if (envio) {
    return <EnvioWhatsAppEmMassaModal titulo={`Formulário "${f.titulo}" — quem ainda não respondeu`} itens={envio} onClose={() => setEnvio(null)} onVoltar={() => setEnvio(null)} />;
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <button type="button" onClick={onVoltar} className="flex items-center gap-1 text-xs font-bold text-[#92611F] normal-case tracking-normal">
        <ArrowLeft className="w-4 h-4" /> Formulários
      </button>
      <div className="bg-white rounded-2xl border-t-4 border-t-[#C48229] border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-900">{f.titulo}</p>
          <p className="text-xs text-slate-500">
            {respostas ? `${respostas.length} resposta(s)` : 'Carregando...'}
            {f.noPortal ? ` · ${pendentes.length} colaborador(es) ainda não responderam` : ''}
          </p>
        </div>
        <button type="button" onClick={exportarExcel} disabled={!respostas?.length} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Excel
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {(
          [
            ['resumo', 'Resumo'],
            ['individuais', 'Uma a uma'],
            ...(f.noPortal ? [['pendentes', `Não responderam (${pendentes.length})`]] : []),
          ] as [Aba, string][]
        ).map(([id, rotulo]) => (
          <button key={id} type="button" onClick={() => setAba(id)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold ${aba === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}>
            {rotulo}
          </button>
        ))}
      </div>

      {!respostas ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando respostas...
        </div>
      ) : aba === 'resumo' ? (
        respostas.length === 0 ? (
          <p className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">Ainda não há respostas.</p>
        ) : (
          <div className="space-y-3">
            {f.perguntas.map((p) => (
              <ResumoPergunta key={p.id} p={p} respostas={respostas} />
            ))}
          </div>
        )
      ) : aba === 'individuais' ? (
        <div className="space-y-3">
          {respostas.length === 0 && <p className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">Ainda não há respostas.</p>}
          {[...respostas].reverse().map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{quem(r)}</p>
                  <p className="text-[11px] text-slate-500">
                    {dataHora(r.criadoEm)} · {r.origem === 'portal' ? 'portal' : 'link externo'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Excluir esta resposta? (Se for do portal, o colaborador poderá responder de novo.)')) return;
                    try {
                      await excluirResposta(r.id);
                      setRespostas((p) => (p || []).filter((x) => x.id !== r.id));
                    } catch (e) {
                      console.error(e);
                      alert('Não foi possível excluir.');
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600"
                  title="Excluir resposta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {f.perguntas.map((p) => (
                  <div key={p.id} className="py-1.5 text-xs">
                    <p className="text-slate-500">{p.titulo}</p>
                    <p className="text-slate-900 font-semibold whitespace-pre-line">
                      {p.tipo === 'data' && r.respostas[p.id] ? new Date(`${r.respostas[p.id]}T12:00:00`).toLocaleDateString('pt-BR') : textoResposta(r.respostas[p.id]) || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {pendentes.length > 0 && (
            <button type="button" onClick={enviarPendentes} disabled={preparando} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
              {preparando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Lembrar pelo WhatsApp quem não respondeu ({pendentes.length})
            </button>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {pendentes.length === 0 && <p className="p-6 text-center text-xs text-slate-500">Todos já responderam. 🎉</p>}
            {pendentes.map((c) => (
              <div key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800">{nomeBonito(c.nomeCompleto)}</span>
                <span className="text-slate-400">{c.setor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
