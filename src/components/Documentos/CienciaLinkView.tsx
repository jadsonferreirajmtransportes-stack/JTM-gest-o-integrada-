import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Download, FileText, Loader2, XCircle } from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { CienciaPublica, abrirCiencia, lerConfig, responderCiencia } from '../../utils/cienciaLinkApi';
import { AssinaturaDigitalPad } from '../Epi/AssinaturaDigitalPad';
import type { BlocoDocumento, DocumentoPadronizado } from '../../utils/documentosPadronizadosApi';
import { caixaInfo, normalizarInformativo, parteInfo, trechos } from './gerarDocumento';

const soDigitos = (s: string) => s.replace(/\D/g, '');
const mascaraCpf = (s: string) =>
  soDigitos(s)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
/** CPF com dígitos verificadores certos. */
function cpfValido(cpf: string): boolean {
  const n = soDigitos(cpf);
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  const dv = (base: string, peso: number) => {
    const s = base.split('').reduce((acc, d, i) => acc + Number(d) * (peso - i), 0);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(n.slice(0, 9), 10) === Number(n[9]) && dv(n.slice(0, 10), 11) === Number(n[10]);
}

/** Texto com **negrito** (e o rótulo antes dos dois-pontos nas listas). */
const Rico: React.FC<{ texto: string; rotulo?: boolean }> = ({ texto, rotulo }) => (
  <>
    {trechos(texto, rotulo).map((p, i) => (p.b ? <strong key={i} className="font-bold text-slate-900">{p.t}</strong> : <React.Fragment key={i}>{p.t}</React.Fragment>))}
  </>
);

/** O documento em tela de celular (mesma ordem e estilo do PDF, sem o papel). */
const DocumentoEmTela: React.FC<{ doc: CienciaPublica['documento'] }> = ({ doc }) => {
  const info = doc.modelo === 'informativo';
  const blocos: BlocoDocumento[] = info ? normalizarInformativo(doc.blocos) : doc.blocos;
  let secao = 0;
  const capaPropria = info && blocos[0]?.tipo === 'titulo' && blocos[0].nivel === 1;
  const partes: React.ReactNode[] = [];
  for (let i = 0; i < blocos.length; i++) {
    const b = blocos[i];
    if (b.tipo === 'titulo') {
      if (b.nivel === 1) {
        const p = info ? parteInfo(b.texto, doc as DocumentoPadronizado) : { etiqueta: '', titulo: b.texto };
        const seg = blocos[i + 1];
        const sub = info && seg?.tipo === 'paragrafo' && seg.texto.length < 220 ? seg.texto : '';
        if (sub) i += 1;
        partes.push(
          <div key={b.id} className={partes.length ? 'pt-6 mt-2 border-t border-slate-200' : ''}>
            {p.etiqueta && <p className="text-[10px] font-black uppercase tracking-wide text-[#C48229]">{p.etiqueta}</p>}
            <h2 className="text-xl font-black text-slate-900 leading-tight normal-case tracking-normal">{p.titulo}</h2>
            {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
          </div>
        );
      } else {
        if (b.nivel === 2) secao += 1;
        partes.push(
          <h3 key={b.id} className={`font-black text-slate-900 pt-2 normal-case tracking-normal ${b.nivel === 2 ? 'text-base' : 'text-sm'}`}>
            {info && b.nivel === 2 && <span className="text-[#C48229] mr-2">{String(secao).padStart(2, '0')}</span>}
            {b.texto}
          </h3>
        );
      }
    } else if (b.tipo === 'paragrafo') {
      partes.push(
        <p key={b.id} className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          <Rico texto={b.texto} />
        </p>
      );
    } else if (b.tipo === 'lista') {
      const Tag = b.ordenada ? 'ol' : 'ul';
      partes.push(
        <Tag key={b.id} className={`text-sm text-slate-700 leading-relaxed space-y-1.5 pl-5 ${b.ordenada ? 'list-decimal' : 'list-disc'}`}>
          {b.itens.map((it, k) => (
            <li key={k}>
              <Rico texto={it} rotulo />
            </li>
          ))}
        </Tag>
      );
    } else if (b.tipo === 'destaque') {
      const c = info ? caixaInfo(b.texto) : { titulo: undefined, corpo: b.texto, laranja: false };
      partes.push(
        <div key={b.id} className={`rounded-xl p-3.5 border-l-4 ${c.laranja ? 'bg-orange-50 border-orange-600' : 'bg-[#FAF6EE] border-[#C48229]'}`}>
          {c.titulo && <p className={`text-[10px] font-black uppercase tracking-wide mb-1 ${c.laranja ? 'text-orange-700' : 'text-[#92611F]'}`}>{c.titulo}</p>}
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
            <Rico texto={c.corpo} />
          </p>
        </div>
      );
    } else if (b.tipo === 'tabela') {
      partes.push(
        <div key={b.id} className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F0E4] text-slate-800">
              <tr>
                {b.cabecalho.map((h, k) => (
                  <th key={k} className="text-left p-2 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.linhas.map((l, k) => (
                <tr key={k} className="border-t border-slate-100">
                  {l.map((c, j) => (
                    <td key={j} className="p-2 text-slate-700">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (b.tipo === 'checklist' && b.itens.length) {
      partes.push(
        <div key={b.id} className="space-y-1">
          {b.titulo && <p className="text-sm font-bold normal-case tracking-normal text-slate-900">{b.titulo}</p>}
          <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
            {b.itens.map((it, k) => (
              <li key={k}>{it.texto}</li>
            ))}
          </ul>
        </div>
      );
    }
  }
  return (
    <div className="space-y-3.5">
      {!capaPropria && (
        <div>
          {info && <p className="text-[10px] font-black uppercase tracking-wide text-[#C48229]">JM TRANSPORTES{doc.oficio?.publico ? ` / ${doc.oficio.publico.toUpperCase()}` : ''}</p>}
          <h1 className="text-2xl font-black text-slate-900 leading-tight normal-case tracking-normal">{doc.titulo}</h1>
          {info && doc.oficio?.subtitulo && <p className="text-sm text-slate-500 mt-1">{doc.oficio.subtitulo}</p>}
        </div>
      )}
      {partes}
    </div>
  );
};

/** Ciência por link (?form=ciencia&t=...): ler → responder → confirmar com nome, CPF e telefone. */
export const CienciaLinkView: React.FC<{ token?: string }> = ({ token }) => {
  const [dados, setDados] = useState<CienciaPublica | null>(null);
  const [erro, setErro] = useState<string | null>(token ? null : 'Este link não é válido.');
  const [etapa, setEtapa] = useState<'ler' | 'perguntas' | 'confirmar' | 'pronto'>('ler');
  const [respostas, setRespostas] = useState<(number | null)[]>([]);
  const [conferido, setConferido] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [ciente, setCiente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [cienteEm, setCienteEm] = useState('');
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [leuAteFim, setLeuAteFim] = useState(false);
  const fimRef = React.useRef<HTMLDivElement>(null);
  const config = lerConfig(dados?.config);

  // Leitura completa: o "continuar" só libera quando o fim do documento aparece na tela.
  useEffect(() => {
    if (etapa !== 'ler' || !fimRef.current || leuAteFim) return;
    const obs = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setLeuAteFim(true), { threshold: 0.5 });
    obs.observe(fimRef.current);
    return () => obs.disconnect();
  }, [etapa, dados, leuAteFim]);

  useEffect(() => {
    if (!token) return;
    abrirCiencia(token)
      .then((d) => {
        if (d.erro) setErro('Este link não está mais ativo. Peça o link novo à JM Transportes.');
        else {
          setDados(d);
          setRespostas(d.perguntas.map(() => null));
        }
      })
      .catch(() => setErro('Não foi possível abrir agora. Verifique sua internet e tente de novo.'));
  }, [token]);

  const perguntas = dados?.perguntas || [];
  const erradas = useMemo(() => perguntas.map((p, i) => respostas[i] !== p.correta), [perguntas, respostas]);
  const todasCertas = perguntas.length > 0 && erradas.every((e) => !e);

  const baixarPdf = async () => {
    if (!dados) return;
    setGerandoPdf(true);
    try {
      const { gerarPdfDocumento } = await import('./gerarDocumento');
      const arq = await gerarPdfDocumento({ ...(dados.documento as DocumentoPadronizado), id: 'link', criadoEm: '' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(arq);
      a.download = arq.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    } catch {
      alert('Não foi possível gerar o PDF agora.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const confirmar = async () => {
    if (!token || !dados) return;
    if (nome.trim().split(/\s+/).length < 2) return setErroEnvio('Escreva o nome completo.');
    if (!cpfValido(cpf)) return setErroEnvio('CPF inválido. Confira os números.');
    if (config.pedirTelefone && soDigitos(telefone).length < 10) return setErroEnvio('Informe o telefone com DDD.');
    if (config.assinatura && !assinatura) return setErroEnvio('Assine no quadro com o dedo.');
    if (!ciente) return setErroEnvio('Marque "Li e estou ciente" para confirmar.');
    setEnviando(true);
    setErroEnvio(null);
    try {
      const r = await responderCiencia({ token, nome: nome.trim(), cpf, telefone, respostas: respostas.map((x) => x ?? -1), tentativas: Math.max(1, tentativas), assinatura: config.assinatura ? assinatura : null, leuAteFim: config.leituraCompleta ? leuAteFim : undefined });
      if (r.erro) setErroEnvio(r.erro === 'assinatura' ? 'Assine no quadro com o dedo.' : r.erro === 'telefone' ? 'Informe o telefone com DDD.' : r.erro === 'respostas' ? 'Alguma resposta do questionário não está certa. Volte e confira.' : r.erro === 'cpf' ? 'CPF inválido.' : 'Não foi possível confirmar. Tente de novo.');
      else {
        setCienteEm(r.cienteEm || new Date().toISOString());
        setEtapa('pronto');
      }
    } catch {
      setErroEnvio('Não foi possível confirmar agora. Verifique a internet e tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const campo = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans" data-texto-livre="true">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <JmtLogo variant="compact" theme="light" iconSize={28} />
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <FileText className="w-4 h-4 text-[#C48229]" /> Ciência de documento
        </span>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-4">
        {erro ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center text-sm text-rose-700 flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6" /> {erro}
          </div>
        ) : !dados ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Abrindo o documento...
          </div>
        ) : etapa === 'pronto' ? (
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="text-lg font-black text-slate-900">Ciência registrada!</p>
            <p className="text-sm text-slate-600">
              Obrigado, {nome.trim().split(/\s+/)[0]}. Sua confirmação de "{dados.titulo}" foi registrada em {new Date(cienteEm).toLocaleString('pt-BR')}.
            </p>
            <button type="button" onClick={baixarPdf} disabled={gerandoPdf} className="mt-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold inline-flex items-center gap-1.5">
              {gerandoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-[#C48229]" />} Guardar uma cópia (PDF)
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              {['Ler', ...(perguntas.length ? ['Questionário'] : []), 'Confirmar'].map((e, i, arr) => {
                const atual = (etapa === 'ler' && i === 0) || (etapa === 'perguntas' && e === 'Questionário') || (etapa === 'confirmar' && i === arr.length - 1);
                return (
                  <React.Fragment key={e}>
                    <span className={`px-2.5 py-1 rounded-full ${atual ? 'bg-[#C48229] text-white' : 'bg-white border border-slate-200'}`}>
                      {i + 1}. {e}
                    </span>
                    {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
                  </React.Fragment>
                );
              })}
            </div>

            {etapa === 'ler' && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <DocumentoEmTela doc={dados.documento} />
                  <div ref={fimRef} className="h-1" />
                </div>
                {config.leituraCompleta && !leuAteFim && <p className="text-xs text-[#92611F] font-semibold text-center">Leia até o fim do documento para continuar.</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" onClick={baixarPdf} disabled={gerandoPdf} className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold normal-case tracking-normal flex items-center justify-center gap-1.5">
                    {gerandoPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-[#C48229]" />} Baixar em PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEtapa(perguntas.length ? 'perguntas' : 'confirmar');
                      window.scrollTo(0, 0);
                    }}
                    disabled={config.leituraCompleta && !leuAteFim}
                    className="disabled:opacity-50 flex-1 px-4 py-3 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-sm font-bold normal-case tracking-normal"
                  >
                    Li o documento — continuar
                  </button>
                </div>
              </>
            )}

            {etapa === 'perguntas' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Responda às perguntas sobre o que você leu.</p>
                {perguntas.map((p, i) => {
                  const errou = conferido && erradas[i];
                  return (
                    <div key={p.id} className={`bg-white rounded-2xl border p-4 space-y-2 ${errou ? 'border-rose-300' : conferido ? 'border-emerald-300' : 'border-slate-200'}`}>
                      <p className="text-sm font-bold normal-case tracking-normal text-slate-900">
                        {i + 1}. {p.texto}
                      </p>
                      {p.opcoes.map((o, k) => (
                        <label key={k} className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer text-sm ${respostas[i] === k ? 'border-[#C48229] bg-[#FBF6EE]' : 'border-slate-200'}`}>
                          <input
                            type="radio"
                            name={p.id}
                            checked={respostas[i] === k}
                            onChange={() => {
                              setRespostas((r) => r.map((x, j) => (j === i ? k : x)));
                            }}
                            className="mt-0.5"
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                      {errou && (
                        <p className="text-xs text-rose-700 flex items-start gap-1.5">
                          <XCircle className="w-4 h-4 shrink-0" /> {p.explicacao ? p.explicacao : 'Resposta incorreta. Releia o documento e tente de novo.'}
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEtapa('ler')} className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold normal-case tracking-normal">
                    Reler
                  </button>
                  <button
                    type="button"
                    disabled={respostas.some((r) => r === null)}
                    onClick={() => {
                      setTentativas((t) => t + 1);
                      if (todasCertas) {
                        setEtapa('confirmar');
                        window.scrollTo(0, 0);
                      } else {
                        setConferido(true);
                      }
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-sm font-bold normal-case tracking-normal disabled:opacity-50"
                  >
                    {conferido && !todasCertas ? 'Conferir de novo' : 'Conferir respostas'}
                  </button>
                </div>
              </div>
            )}

            {etapa === 'confirmar' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                {perguntas.length > 0 && (
                  <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Questionário respondido corretamente.
                  </p>
                )}
                <div>
                  <label className="text-xs font-bold text-slate-600">Nome completo</label>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} autoComplete="name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-600">CPF</label>
                    <input value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" className={campo} />
                  </div>
                  <div className={config.pedirTelefone ? '' : 'hidden'}>
                    <label className="text-xs font-bold text-slate-600">Telefone (WhatsApp)</label>
                    <input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="(84) 99999-9999" className={campo} autoComplete="tel" />
                  </div>
                </div>
                {config.assinatura && (
                  <div>
                    <label className="text-xs font-bold text-slate-600">Assinatura (desenhe com o dedo)</label>
                    <AssinaturaDigitalPad onChange={setAssinatura} />
                  </div>
                )}
                <label className="flex items-start gap-2 p-3 rounded-xl bg-[#FBF6EE] border border-amber-200 cursor-pointer text-sm">
                  <input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} className="mt-0.5" />
                  <span>
                    <b>Li e estou ciente</b> das orientações de "{dados.titulo}".
                  </span>
                </label>
                {erroEnvio && <p className="text-xs text-rose-700 font-semibold">{erroEnvio}</p>}
                <button type="button" onClick={confirmar} disabled={enviando} className="w-full px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold normal-case tracking-normal flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar ciência
                </button>
                <p className="text-[10px] text-slate-400">Seus dados (nome, CPF e telefone) são usados só para registrar esta ciência pela JM Transportes.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
