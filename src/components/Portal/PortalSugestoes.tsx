import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, EyeOff, Lightbulb, Loader2, Plus, Send, ThumbsUp, UserRound } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { CATEGORIAS_SUGESTAO, PONTOS_SUGESTAO_IMPLEMENTADA, SugestaoPortal, portalApoiarSugestao, portalEnviarSugestao, portalSugestoes, statusSugestao } from '../../utils/sugestoesApi';

const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const campoCls = 'mt-1 w-full p-3 border border-slate-300 rounded-xl bg-white text-sm';

const Selo: React.FC<{ status: string }> = ({ status }) => {
  const s = statusSugestao(status);
  return <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${s.cls}`}>{s.rotulo}</span>;
};

/** Portal do colaborador: sugestões de melhoria (enviar, acompanhar as minhas e o mural). */
export const PortalSugestoes: React.FC<{ credenciais: CredenciaisPortal }> = ({ credenciais }) => {
  const [dados, setDados] = useState<{ minhas: SugestaoPortal[]; mural: SugestaoPortal[] } | null>(null);
  const [aba, setAba] = useState<'mural' | 'minhas'>('mural');
  const [nova, setNova] = useState(false);
  const [enviada, setEnviada] = useState<{ protocolo: string; anonima: boolean } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [apoiando, setApoiando] = useState<string | null>(null);

  const carregar = () =>
    portalSugestoes(credenciais)
      .then((d) => {
        setDados(d);
        if (!d.mural.length && d.minhas.length) setAba('minhas');
      })
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar.');
        setDados({ minhas: [], mural: [] });
      });
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais]);

  const apoiar = async (s: SugestaoPortal) => {
    setApoiando(s.id);
    setErro(null);
    try {
      const r = await portalApoiarSugestao(credenciais, s.id);
      setDados((d) => d && { ...d, mural: d.mural.map((x) => (x.id === s.id ? { ...x, apoios: r.apoios, apoiei: r.apoiei } : x)) });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível apoiar.');
    } finally {
      setApoiando(null);
    }
  };

  if (nova)
    return (
      <NovaSugestao
        credenciais={credenciais}
        onVoltar={() => setNova(false)}
        onEnviada={(r) => {
          setNova(false);
          setEnviada(r);
          setAba('minhas');
          carregar();
        }}
      />
    );

  const lista = aba === 'mural' ? dados?.mural || [] : dados?.minhas || [];
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-black text-slate-900">Sugestões de melhoria</p>
          <p className="text-xs text-slate-500">Tem uma ideia para melhorar o trabalho, a segurança, o atendimento ou o ambiente? Conte para a gente — você pode mandar com o seu nome ou sem se identificar.</p>
        </div>
      </div>
      {enviada && (
        <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Sugestão {enviada.protocolo} enviada. Obrigado!{' '}
            {enviada.anonima ? 'Ela foi sem o seu nome — só você vê, aqui em "Minhas", que ela é sua.' : 'Você acompanha a resposta aqui em "Minhas".'}
          </span>
        </p>
      )}
      <button type="button" onClick={() => (setEnviada(null), setNova(true))} className="w-full py-3 rounded-2xl bg-[#C48229] hover:bg-[#92611F] text-white text-sm font-bold flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Enviar uma sugestão
      </button>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
        {(
          [
            ['mural', `Mural${dados ? ` (${dados.mural.length})` : ''}`],
            ['minhas', `Minhas${dados ? ` (${dados.minhas.length})` : ''}`],
          ] as const
        ).map(([id, rot]) => (
          <button key={id} type="button" onClick={() => setAba(id)} className={`flex-1 py-2 rounded-lg text-xs font-bold normal-case tracking-normal ${aba === id ? 'bg-[#C48229] text-white' : 'text-slate-600'}`}>
            {rot}
          </button>
        ))}
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {dados === null ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : lista.length === 0 ? (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
          {aba === 'mural' ? 'As sugestões escolhidas pela gestão aparecem aqui para todos apoiarem.' : 'Você ainda não enviou nenhuma sugestão.'}
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2" data-texto-livre="true">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-[#92611F]">
                    {s.protocolo} · {s.categoria}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{s.titulo}</p>
                </div>
                <Selo status={s.status} />
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-line">{s.descricao}</p>
              {s.resposta && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-xs text-slate-700 whitespace-pre-line">
                  <span className="font-black text-[#92611F]">Resposta da gestão: </span>
                  {s.resposta}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  {aba === 'minhas' ? (
                    s.anonima ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Enviada sem o seu nome · {dataBr(s.criadoEm)}
                      </>
                    ) : (
                      <>Enviada em {dataBr(s.criadoEm)}{s.noMural ? ' · no mural' : ''}</>
                    )
                  ) : (
                    <>
                      <UserRound className="w-3.5 h-3.5" /> {s.minha ? 'Sua sugestão' : s.autor ? `${s.autor}${s.setor ? ` · ${s.setor}` : ''}` : 'Anônima'}
                    </>
                  )}
                </span>
                {aba === 'mural' ? (
                  <button
                    type="button"
                    onClick={() => apoiar(s)}
                    disabled={!!s.minha || apoiando === s.id}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 normal-case tracking-normal disabled:opacity-60 ${s.apoiei ? 'bg-[#C48229] border-[#C48229] text-white' : 'border-slate-300 text-slate-700 bg-white'}`}
                    title={s.minha ? 'Esta é a sua sugestão' : s.apoiei ? 'Tirar o apoio' : 'Apoiar esta ideia'}
                  >
                    {apoiando === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />} {s.apoios}
                  </button>
                ) : (
                  s.noMural && (
                    <span className="flex items-center gap-1 font-bold">
                      <ThumbsUp className="w-3.5 h-3.5" /> {s.apoios}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NovaSugestao: React.FC<{ credenciais: CredenciaisPortal; onVoltar: () => void; onEnviada: (r: { protocolo: string; anonima: boolean }) => void }> = ({ credenciais, onVoltar, onEnviada }) => {
  const [s, setS] = useState({ titulo: '', descricao: '', categoria: '', beneficio: '', anonima: false });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mudar = (p: Partial<typeof s>) => setS((x) => ({ ...x, ...p }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!s.categoria) return setErro('Escolha o assunto.');
    if (s.titulo.trim().length < 3) return setErro('Dê um título curto para a sua ideia.');
    if (s.descricao.trim().length < 5) return setErro('Explique a sua sugestão.');
    setEnviando(true);
    try {
      const r = await portalEnviarSugestao(credenciais, s);
      onEnviada({ protocolo: r.protocolo, anonima: s.anonima });
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
        <p className="text-sm font-black text-slate-900">Nova sugestão</p>
        <label className="block">
          <span className="font-bold text-slate-700">Assunto *</span>
          <select value={s.categoria} onChange={(e) => mudar({ categoria: e.target.value })} className={campoCls}>
            <option value="">Escolha...</option>
            {CATEGORIAS_SUGESTAO.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-bold text-slate-700">Sua ideia em poucas palavras *</span>
          <input value={s.titulo} onChange={(e) => mudar({ titulo: e.target.value.slice(0, 120) })} placeholder="Ex.: Etiqueta colorida por cliente na expedição" className={campoCls} />
        </label>
        <label className="block">
          <span className="font-bold text-slate-700">Explique a sugestão *</span>
          <textarea value={s.descricao} onChange={(e) => mudar({ descricao: e.target.value.slice(0, 3000) })} rows={5} placeholder="O que acontece hoje e o que você sugere mudar." className={campoCls} />
        </label>
        <label className="block">
          <span className="font-bold text-slate-700">Que ganho isso traz? (opcional)</span>
          <textarea value={s.beneficio} onChange={(e) => mudar({ beneficio: e.target.value.slice(0, 1500) })} rows={2} placeholder="Ex.: menos troca de volume, mais rapidez, mais segurança." className={campoCls} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              [false, 'Com o meu nome', `A gestão sabe que a ideia é sua. Se for implementada, você ganha +${PONTOS_SUGESTAO_IMPLEMENTADA} pontos no Meu desempenho`],
              [true, 'Sem me identificar', 'Ninguém da gestão vê quem mandou (por isso não soma pontos)'],
            ] as const
          ).map(([anon, titulo, texto]) => (
            <button
              key={String(anon)}
              type="button"
              onClick={() => mudar({ anonima: anon })}
              className={`text-left p-3 rounded-xl border normal-case tracking-normal ${s.anonima === anon ? 'border-[#C48229] bg-amber-50' : 'border-slate-200 bg-white'}`}
            >
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                {anon ? <EyeOff className="w-4 h-4 text-[#C48229]" /> : <UserRound className="w-4 h-4 text-[#C48229]" />} {titulo}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">{texto}</span>
            </button>
          ))}
        </div>
        {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        <button type="submit" disabled={enviando} className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar sugestão
        </button>
      </form>
    </div>
  );
};
