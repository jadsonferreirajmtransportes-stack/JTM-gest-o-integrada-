import React, { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { FormularioPublico, Pergunta, ValorResposta, faltando } from '../../utils/formulariosApi';

/**
 * Formulário para responder — usado no portal do colaborador e no link externo (mesma tela).
 * `identificar`: link externo pedindo nome (e contato) antes das perguntas.
 */
export const PreencherFormulario: React.FC<{
  formulario: FormularioPublico;
  identificar?: boolean;
  onEnviar: (respostas: Record<string, ValorResposta>, nome: string, contato: string) => Promise<void>;
  /** Mostrar já como "enviado" (ex.: colaborador que já respondeu). */
  jaEnviado?: boolean;
}> = ({ formulario: f, identificar, onEnviar, jaEnviado }) => {
  const [respostas, setRespostas] = useState<Record<string, ValorResposta>>({});
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(!!jaEnviado);
  const [erro, setErro] = useState<string | null>(null);
  const [faltam, setFaltam] = useState<Set<string>>(new Set());

  const definir = (id: string, v: ValorResposta) => {
    setRespostas((p) => ({ ...p, [id]: v }));
    setFaltam((p) => {
      if (!p.has(id)) return p;
      const n = new Set(p);
      n.delete(id);
      return n;
    });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (identificar && f.identificacao !== 'anonimo' && !nome.trim()) return setErro('Informe o seu nome.');
    if (identificar && f.identificacao === 'nome_contato' && !contato.trim()) return setErro('Informe um telefone ou e-mail para contato.');
    const pendentes = f.perguntas.filter((p) => faltando(p, respostas[p.id])).map((p) => p.id);
    if (pendentes.length) {
      setFaltam(new Set(pendentes));
      setErro('Responda as perguntas obrigatórias (marcadas em vermelho).');
      document.getElementById(`perg-${pendentes[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEnviando(true);
    try {
      await onEnviar(respostas, nome.trim(), contato.trim());
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center space-y-2">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <p className="text-base font-black text-slate-900">Respostas enviadas</p>
        <p className="text-sm text-slate-600 whitespace-pre-line">{f.mensagemFinal || 'Obrigado por responder!'}</p>
      </div>
    );
  }

  if (!f.aberto) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center text-sm text-slate-600">
        Este formulário foi encerrado e não recebe mais respostas.
      </div>
    );
  }

  const campo = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]/40';

  const entrada = (p: Pergunta) => {
    const v = respostas[p.id];
    switch (p.tipo) {
      case 'texto':
        return <input value={(v as string) || ''} onChange={(e) => definir(p.id, e.target.value)} maxLength={500} className={campo} placeholder="Sua resposta" />;
      case 'paragrafo':
        return <textarea value={(v as string) || ''} onChange={(e) => definir(p.id, e.target.value)} maxLength={4000} rows={4} className={campo} placeholder="Sua resposta" />;
      case 'numero':
        return <input type="number" inputMode="decimal" value={(v as number | string) ?? ''} onChange={(e) => definir(p.id, e.target.value === '' ? null : Number(e.target.value))} className={campo} />;
      case 'data':
        return <input type="date" value={(v as string) || ''} onChange={(e) => definir(p.id, e.target.value)} className={campo} />;
      case 'lista':
        return (
          <select value={(v as string) || ''} onChange={(e) => definir(p.id, e.target.value)} className={campo}>
            <option value="">Escolha...</option>
            {(p.opcoes || []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case 'multipla':
        return (
          <div className="space-y-1.5">
            {(p.opcoes || []).map((o) => (
              <label key={o} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer ${v === o ? 'border-[#C48229] bg-amber-50' : 'border-slate-200'}`}>
                <input type="radio" name={p.id} checked={v === o} onChange={() => definir(p.id, o)} className="w-4 h-4 accent-[#C48229]" />
                <span className="text-sm text-slate-800">{o}</span>
              </label>
            ))}
          </div>
        );
      case 'caixas': {
        const marcadas = Array.isArray(v) ? v : [];
        return (
          <div className="space-y-1.5">
            {(p.opcoes || []).map((o) => (
              <label key={o} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer ${marcadas.includes(o) ? 'border-[#C48229] bg-amber-50' : 'border-slate-200'}`}>
                <input
                  type="checkbox"
                  checked={marcadas.includes(o)}
                  onChange={() => definir(p.id, marcadas.includes(o) ? marcadas.filter((x) => x !== o) : [...marcadas, o])}
                  className="w-4 h-4 accent-[#C48229]"
                />
                <span className="text-sm text-slate-800">{o}</span>
              </label>
            ))}
          </div>
        );
      }
      case 'escala': {
        const min = p.min ?? 1;
        const max = p.max ?? 5;
        const notas = Array.from({ length: Math.max(1, max - min + 1) }, (_, i) => min + i);
        return (
          <div className="flex flex-wrap gap-1.5">
            {notas.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => definir(p.id, n)}
                className={`w-11 h-11 rounded-xl border text-sm font-black ${v === n ? 'bg-[#C48229] border-[#C48229] text-white' : 'border-slate-300 text-slate-700 bg-white'}`}
              >
                {n}
              </button>
            ))}
          </div>
        );
      }
      case 'simnao':
        return (
          <div className="flex gap-2">
            {[true, false].map((b) => (
              <button
                key={String(b)}
                type="button"
                onClick={() => definir(p.id, b)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-bold normal-case tracking-normal ${v === b ? 'bg-[#C48229] border-[#C48229] text-white' : 'border-slate-300 text-slate-700 bg-white'}`}
              >
                {b ? 'Sim' : 'Não'}
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-3" data-texto-livre="true">
      <div className="bg-white rounded-3xl border-t-4 border-t-[#C48229] border border-slate-100 shadow-sm p-5">
        <h1 className="text-lg font-black text-slate-900 normal-case tracking-normal">{f.titulo}</h1>
        {f.descricao && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{f.descricao}</p>}
        {f.perguntas.some((p) => p.obrigatoria) && <p className="text-[11px] text-rose-600 mt-2">* Obrigatória</p>}
      </div>

      {identificar && f.identificacao !== 'anonimo' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-2.5">
          <label className="block">
            <span className="text-sm font-bold text-slate-800">
              Seu nome <span className="text-rose-600">*</span>
            </span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} className={`${campo} mt-1.5`} autoComplete="name" />
          </label>
          {f.identificacao === 'nome_contato' && (
            <label className="block">
              <span className="text-sm font-bold text-slate-800">
                Telefone ou e-mail <span className="text-rose-600">*</span>
              </span>
              <input value={contato} onChange={(e) => setContato(e.target.value)} maxLength={120} className={`${campo} mt-1.5`} />
            </label>
          )}
        </div>
      )}

      {f.perguntas.map((p) => (
        <div key={p.id} id={`perg-${p.id}`} className={`bg-white rounded-3xl border shadow-sm p-5 space-y-2.5 ${faltam.has(p.id) ? 'border-rose-300' : 'border-slate-100'}`}>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {p.titulo || 'Pergunta'} {p.obrigatoria && <span className="text-rose-600">*</span>}
            </p>
            {p.ajuda && <p className="text-xs text-slate-500 mt-0.5">{p.ajuda}</p>}
          </div>
          {entrada(p)}
          {faltam.has(p.id) && <p className="text-xs text-rose-600 font-semibold">Esta pergunta é obrigatória.</p>}
        </div>
      ))}

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-semibold">{erro}</p>}
      <button type="submit" disabled={enviando} className="w-full py-3 rounded-2xl bg-[#C48229] hover:bg-[#92611F] text-white font-black flex items-center justify-center gap-2 disabled:opacity-60">
        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar respostas
      </button>
    </form>
  );
};
