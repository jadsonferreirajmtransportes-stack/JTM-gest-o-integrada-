import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  GraduationCap,
  PlayCircle,
  FileText,
  BookOpen,
  AlignLeft,
  CheckCircle2,
  Circle,
  ChevronLeft,
  Award,
  ClipboardCheck,
  Search,
  ScrollText,
  ExternalLink,
  Image as ImageIcon,
  LogOut,
  FileSignature,
  Megaphone,
  Newspaper,
  Fingerprint,
} from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { AssinaturaDigitalPad } from '../Epi/AssinaturaDigitalPad';
import { PdfEmTela } from '../Contracheques/ContrachequePublicView';
import { TelasIlustradas } from './TelasIlustradas';
import { CapaTreinamento } from './CapaTreinamento';
import { InstrucaoTrabalho } from '../../types';
import { rowToInstrucao } from '../../utils/gestaoApi';
import {
  ConteudoTreinamento,
  CredenciaisPortal,
  DadosPortal,
  TreinamentoPortal,
  portalConcluir,
  portalEntrar,
  portalEnviarProva,
  portalMarcarVisto,
} from '../../utils/educacaoApi';
import { gerarCertificadoPdf, formatarCargaHoraria } from './certificadoPdf';
import { gerarPdfRegulamento } from '../Regulamento/regulamentoPdf';
import { ROTULO_VERSAO_REGULAMENTO } from '../../data/regulamentoInterno';
import { baixarBlob } from '../../utils/downloadUtils';
import { JornalPortal } from '../Jornal/JornalPortal';
import { portalJornal } from '../../utils/jornalApi';
import { PontoPublicView } from '../Frequencia/PontoPublicView';
import { pontoVincular } from '../../utils/frequenciaApi';
import { credenciaisDoAparelho, entrouPeloAparelho, gravarAparelho, lerAparelho } from '../../utils/aparelhoColaborador';
import { portalComunicados, portalDocumentos } from '../../utils/portalColaboradorApi';
import { PortalDocumentos } from '../Portal/PortalDocumentos';
import { PortalComunicados } from '../Portal/PortalComunicados';

function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function mascararData(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

/** "dd/mm/aaaa" → "aaaa-mm-dd" (ou null se inválida). */
function dataParaIso(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, a] = m;
  const data = new Date(`${a}-${mes}-${d}T12:00:00`);
  if (Number.isNaN(data.getTime()) || data.getDate() !== Number(d)) return null;
  return `${a}-${mes}-${d}`;
}

function dataBr(iso?: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** Link de vídeo → endereço de incorporação (YouTube, Vimeo, Google Drive). */
export function urlIncorporavel(url: string): { tipo: 'iframe' | 'video' | 'link'; src: string } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { tipo: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { tipo: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i);
  if (drive) return { tipo: 'iframe', src: `https://drive.google.com/file/d/${drive[1]}/preview` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { tipo: 'video', src: url };
  return { tipo: 'link', src: url };
}

const ICONES: Record<ConteudoTreinamento['tipo'], React.ReactNode> = {
  video: <PlayCircle className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  instrucao: <BookOpen className="w-4 h-4" />,
  texto: <AlignLeft className="w-4 h-4" />,
  telas: <ImageIcon className="w-4 h-4" />,
};

const MENSAGENS_ERRO = {
  link: 'Este link não é válido ou foi substituído. Peça o link atualizado ao Departamento Pessoal.',
  dados: 'CPF ou data de nascimento não conferem com o cadastro. Confira e tente de novo — se continuar, fale com o Departamento Pessoal.',
};

type Aba = 'inicio' | 'ponto' | 'documentos' | 'comunicados' | 'treinamentos' | 'jornal' | 'instrucoes' | 'regulamento';

const ABAS: [Aba, string][] = [
  ['inicio', 'Início'],
  ['ponto', 'Ponto'],
  ['documentos', 'Documentos'],
  ['comunicados', 'Comunicados'],
  ['treinamentos', 'Treinamentos'],
  ['jornal', 'Jornal'],
  ['instrucoes', 'Instruções'],
  ['regulamento', 'Regulamento'],
];

/** "&ir=" do link: aba e, se houver, o item (ex.: "documento:docass-123"). Aceita também o
 *  formato antigo do Jornal (&aba=jornal&noticia=). */
function lerDestino(ir?: string, abaAntiga?: string, noticiaAntiga?: string): { aba: Aba; item?: string } {
  if (!ir && abaAntiga === 'jornal') return { aba: 'jornal', item: noticiaAntiga };
  const [tipo, ...resto] = (ir || '').split(':');
  const item = resto.join(':') || undefined;
  const mapa: Record<string, Aba> = { ponto: 'ponto', documentos: 'documentos', documento: 'documentos', comunicados: 'comunicados', comunicado: 'comunicados', treinamentos: 'treinamentos', jornal: 'jornal' };
  return { aba: mapa[tipo] || 'inicio', item };
}

/** Portal do colaborador — o LINK ÚNICO (?form=portal&token=...): ponto, documentos para
 *  assinar, comunicados, treinamentos, jornal, instruções e regulamento. Entra com CPF + data
 *  de nascimento ou, com "Lembrar neste celular", direto pelo aparelho (migração 067). Tudo
 *  passa pelas funções portal_* do banco, que conferem a entrada a cada chamada. */
export const PortalEducacaoView: React.FC<{ token?: string; abaInicial?: string; noticiaInicial?: string; ir?: string }> = ({ token, abaInicial, noticiaInicial, ir }) => {
  const destino = useMemo(() => lerDestino(ir, abaInicial, noticiaInicial), [ir, abaInicial, noticiaInicial]);
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [lembrar, setLembrar] = useState(true);
  // CPF digitado nesta entrada (só na memória) — vai mascarado no certificado.
  const [cpfDaSessao, setCpfDaSessao] = useState('');
  const [entrando, setEntrando] = useState(() => !!token && !!lerAparelho(token));
  const [erro, setErro] = useState<string | null>(token ? null : MENSAGENS_ERRO.link);
  const [credenciais, setCredenciais] = useState<CredenciaisPortal | null>(null);
  const [dados, setDados] = useState<DadosPortal | null>(null);
  const [aba, setAba] = useState<Aba>(destino.aba);
  // Item do link (documento, comunicado, notícia) abre direto — só na primeira vez.
  const [itemDoLink, setItemDoLink] = useState<string | undefined>(destino.item);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [instrucaoAberta, setInstrucaoAberta] = useState<InstrucaoTrabalho | null>(null);
  const [resumo, setResumo] = useState<{ documentos?: number; comunicados?: number; noticias?: number }>({});

  const instrucoes: InstrucaoTrabalho[] = useMemo(() => (dados?.instrucoes ?? []).map(rowToInstrucao), [dados]);
  const aberto = dados?.treinamentos.find((t) => t.atribuicaoId === abertoId) || null;

  // Pendências da tela inicial (não trava a entrada se alguma falhar).
  const carregarResumo = (cred: CredenciaisPortal) => {
    portalDocumentos(cred)
      .then((l) => setResumo((p) => ({ ...p, documentos: l.filter((d) => d.status !== 'Assinado' && !d.vencido).length })))
      .catch(() => undefined);
    portalComunicados(cred)
      .then((l) => setResumo((p) => ({ ...p, comunicados: l.filter((c) => !c.visualizadoEm || (c.exigeCiencia && !c.cienteEm)).length })))
      .catch(() => undefined);
    portalJornal(cred)
      .then((l) => setResumo((p) => ({ ...p, noticias: l.filter((n) => !n.lida).length })))
      .catch(() => undefined);
  };

  const entrarCom = async (cred: CredenciaisPortal): Promise<boolean> => {
    const r = await portalEntrar(cred);
    if (r.erro) {
      if (entrouPeloAparelho(cred)) {
        // Aparelho desconectado pelo DP (ou link trocado): volta a pedir CPF.
        gravarAparelho(cred.token, null);
        setErro('Este celular foi desconectado. Confirme seus dados para entrar de novo.');
      } else setErro(MENSAGENS_ERRO[r.erro]);
      return false;
    }
    if (r.dados) {
      setCredenciais(cred);
      setDados(r.dados);
      carregarResumo(cred);
    }
    return true;
  };

  // Celular lembrado: entra sozinho.
  useEffect(() => {
    if (!token) return;
    const segredo = lerAparelho(token);
    if (!segredo) return;
    entrarCom(credenciaisDoAparelho(token, segredo))
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível entrar agora. Verifique sua internet e tente de novo.');
      })
      .finally(() => setEntrando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const iso = dataParaIso(nascimento);
    if (!iso) {
      setErro('Informe a data de nascimento no formato dd/mm/aaaa.');
      return;
    }
    setErro(null);
    setEntrando(true);
    try {
      const cred = { token, cpf, nascimento: iso };
      const ok = await entrarCom(cred);
      if (ok) setCpfDaSessao(cpf);
      if (ok && lembrar) {
        // Mesmo código do ponto: lembra o celular para o portal e para o ponto.
        const v = await pontoVincular(token, cpf, iso).catch(() => null);
        if (v?.dispositivo) {
          gravarAparelho(token, v.dispositivo);
          setCredenciais(credenciaisDoAparelho(token, v.dispositivo));
        }
      }
      if (ok) {
        setCpf('');
        setNascimento('');
      }
    } catch (err) {
      console.error(err);
      setErro('Não foi possível entrar agora. Verifique sua internet e tente de novo.');
    } finally {
      setEntrando(false);
    }
  };

  const handleSair = () => {
    if (!token) return;
    if (!window.confirm('Sair deste celular? Na próxima vez o portal e o ponto vão pedir CPF e data de nascimento.')) return;
    gravarAparelho(token, null);
    setCredenciais(null);
    setDados(null);
    setAba('inicio');
  };

  const atualizarTreinamento = (atribuicaoId: string, parcial: Partial<TreinamentoPortal>) =>
    setDados((prev) =>
      prev ? { ...prev, treinamentos: prev.treinamentos.map((t) => (t.atribuicaoId === atribuicaoId ? { ...t, ...parcial } : t)) } : prev
    );

  const pendentes = dados?.treinamentos.filter((t) => t.status !== 'Concluído').length ?? 0;
  const irPara = (a: Aba) => {
    setAba(a);
    setAbertoId(null);
    setInstrucaoAberta(null);
    window.scrollTo({ top: 0 });
  };
  const itemPara = (a: Aba) => (aba === a && destino.aba === a ? itemDoLink : undefined);
  const contagem: Partial<Record<Aba, number>> = { documentos: resumo.documentos, comunicados: resumo.comunicados, treinamentos: pendentes, jornal: resumo.noticias };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <JmtLogo variant="compact" theme="light" iconSize={28} />
        {dados && credenciais && entrouPeloAparelho(credenciais) ? (
          <button type="button" onClick={handleSair} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800">
            <LogOut className="w-4 h-4 text-[#C48229]" /> Sair deste celular
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#C48229]" /> Portal do Colaborador
          </span>
        )}
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        {!dados || !credenciais ? (
          entrando && !cpf ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Entrando...
            </div>
          ) : (
          <form onSubmit={handleEntrar} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">Portal do Colaborador JMT</h1>
                <p className="text-xs text-slate-500">Ponto, documentos, comunicados, treinamentos e o Jornal JMT — tudo neste link.</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">CPF</label>
              <input
                value={cpf}
                onChange={(e) => setCpf(mascararCpf(e.target.value))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                className="w-full p-3 border border-slate-300 rounded-xl text-base tracking-wide"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Data de nascimento</label>
              <input
                value={nascimento}
                onChange={(e) => setNascimento(mascararData(e.target.value))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="dd/mm/aaaa"
                className="w-full p-3 border border-slate-300 rounded-xl text-base tracking-wide"
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
              <span>
                <strong>Lembrar neste celular</strong> — da próxima vez o link abre direto e o ponto já fica ativado. Desmarque se o celular não for só seu.
              </span>
            </label>
            {erro && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={!token || cpf.replace(/\D/g, '').length !== 11 || nascimento.length !== 10 || entrando}
              className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {entrando && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </button>
          </form>
          )
        ) : aberto ? (
          <TreinamentoAberto
            treinamento={aberto}
            credenciais={credenciais}
            colaboradorNome={dados.colaborador.nome}
            colaboradorCpf={cpfDaSessao}
            instrucoes={instrucoes}
            onVoltar={() => setAbertoId(null)}
            onAtualizar={(parcial) => atualizarTreinamento(aberto.atribuicaoId, parcial)}
          />
        ) : instrucaoAberta ? (
          <div className="space-y-3">
            <button type="button" onClick={() => setInstrucaoAberta(null)} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <InstrucaoLeitura instrucao={instrucaoAberta} />
          </div>
        ) : (
          <>
            <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 overflow-x-auto">
              {ABAS.map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => irPara(id)}
                  className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${aba === id ? 'bg-[#C48229] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {rotulo}
                  {contagem[id] ? (
                    <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center ${aba === id ? 'bg-white text-[#92611F]' : 'bg-[#C48229] text-white'}`}>{contagem[id]}</span>
                  ) : null}
                </button>
              ))}
            </div>

            {aba === 'inicio' && (
              <PortalInicio
                nome={dados.colaborador.nome}
                cargo={dados.colaborador.cargo}
                pendencias={{ documentos: resumo.documentos, comunicados: resumo.comunicados, treinamentos: pendentes, noticias: resumo.noticias }}
                onIr={irPara}
              />
            )}

            {aba === 'ponto' && token && (
              <PontoPublicView
                token={token}
                embutido
                credenciais={entrouPeloAparelho(credenciais) ? undefined : credenciais}
                onVinculado={(segredo) => setCredenciais(credenciaisDoAparelho(token, segredo))}
              />
            )}

            {aba === 'documentos' && (
              <PortalDocumentos
                credenciais={credenciais}
                documentoInicial={itemPara('documentos')}
                onMudou={(n) => {
                  setItemDoLink(undefined);
                  setResumo((p) => ({ ...p, documentos: n }));
                }}
              />
            )}

            {aba === 'comunicados' && (
              <PortalComunicados
                credenciais={credenciais}
                comunicadoInicial={itemPara('comunicados')}
                onMudou={(n) => {
                  setItemDoLink(undefined);
                  setResumo((p) => ({ ...p, comunicados: n }));
                }}
              />
            )}

            {aba === 'treinamentos' && (
              <div className="space-y-3">
                {dados.treinamentos.length === 0 && (
                  <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                    Nenhum treinamento atribuído a você no momento.
                  </p>
                )}
                {dados.treinamentos.map((t) => {
                  const vistos = t.conteudos.filter((c) => t.conteudosVistos.includes(c.id)).length;
                  const concluido = t.status === 'Concluído';
                  const vencido = concluido && !!t.validoAte && t.validoAte < new Date().toISOString().slice(0, 10);
                  return (
                    <button
                      key={t.atribuicaoId}
                      type="button"
                      onClick={() => setAbertoId(t.atribuicaoId)}
                      className="w-full text-left bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-[#C48229] transition-colors"
                    >
                      <CapaTreinamento titulo={t.titulo} capa={t.capa} cargaHorariaMin={t.cargaHorariaMin} />
                      <div className="p-4 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {!concluido && (t.prazo ? `Concluir até ${dataBr(t.prazo)}` : 'Em aberto')}
                            {concluido && `Concluído em ${dataBr(t.concluidoEm)}`}
                            {concluido && t.validoAte && ` · válido até ${dataBr(t.validoAte)}`}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            vencido
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : concluido
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-[#92611F] border-amber-200'
                          }`}
                        >
                          {vencido ? 'Vencido' : concluido ? 'Concluído' : `${vistos}/${t.conteudos.length}`}
                        </span>
                      </div>
                      {!concluido && (
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                          <div className="h-full bg-[#C48229]" style={{ width: `${t.conteudos.length ? (vistos / t.conteudos.length) * 100 : 0}%` }} />
                        </div>
                      )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {aba === 'instrucoes' && <ListaInstrucoes instrucoes={instrucoes} onAbrir={setInstrucaoAberta} />}

            {aba === 'regulamento' && <RegulamentoLeitura />}

            {aba === 'jornal' && <JornalPortal credenciais={credenciais} noticiaInicial={itemPara('jornal')} onNoticiaInicialUsada={() => setItemDoLink(undefined)} />}
          </>
        )}
      </main>
    </div>
  );
};

/** Tela inicial: saudação + atalhos com o que está pendente. */
const PortalInicio: React.FC<{
  nome: string;
  cargo?: string;
  pendencias: { documentos?: number; comunicados?: number; treinamentos?: number; noticias?: number };
  onIr: (a: Aba) => void;
}> = ({ nome, cargo, pendencias, onIr }) => {
  const atalhos: { aba: Aba; titulo: string; texto: string; icone: React.ReactNode; qtd?: number }[] = [
    { aba: 'documentos', titulo: 'Documentos', texto: 'Contracheques, férias e outros para assinar', icone: <FileSignature className="w-5 h-5" />, qtd: pendencias.documentos },
    { aba: 'comunicados', titulo: 'Comunicados', texto: 'Avisos da empresa para você', icone: <Megaphone className="w-5 h-5" />, qtd: pendencias.comunicados },
    { aba: 'treinamentos', titulo: 'Treinamentos', texto: 'Cursos, provas e certificados', icone: <GraduationCap className="w-5 h-5" />, qtd: pendencias.treinamentos },
    { aba: 'jornal', titulo: 'Jornal JMT', texto: 'Notícias da empresa', icone: <Newspaper className="w-5 h-5" />, qtd: pendencias.noticias },
    { aba: 'instrucoes', titulo: 'Instruções de Trabalho', texto: 'Como fazer cada processo', icone: <BookOpen className="w-5 h-5" /> },
    { aba: 'regulamento', titulo: 'Regulamento Interno', texto: 'Regras e direitos', icone: <ScrollText className="w-5 h-5" /> },
  ];
  const total = (pendencias.documentos || 0) + (pendencias.comunicados || 0) + (pendencias.treinamentos || 0);
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <p className="text-xs text-slate-500">Olá,</p>
        <h1 className="text-lg font-black text-slate-900">{nome}</h1>
        {cargo && <p className="text-xs text-slate-500">{cargo}</p>}
        <p className="text-xs mt-2 font-semibold text-[#92611F]">{total > 0 ? `Você tem ${total} pendência(s) — veja abaixo.` : 'Você está em dia. Obrigado!'}</p>
      </div>
      <button
        type="button"
        onClick={() => onIr('ponto')}
        className="w-full py-5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-2xl shadow-md flex items-center justify-center gap-3"
      >
        <Fingerprint className="w-7 h-7" />
        <span className="text-base font-black">Bater ponto</span>
      </button>
      <div className="grid grid-cols-2 gap-3">
        {atalhos.map((a) => (
          <button
            key={a.aba}
            type="button"
            onClick={() => onIr(a.aba)}
            className="relative text-left normal-case bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-[#C48229] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center">{a.icone}</div>
            <p className="mt-2 text-sm font-black text-slate-900">{a.titulo}</p>
            <p className="text-[11px] text-slate-500 leading-snug">{a.texto}</p>
            {a.qtd ? <span className="absolute top-3 right-3 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#C48229] text-white text-[11px] font-black flex items-center justify-center">{a.qtd}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
};

/** Um treinamento aberto: conteúdos em sequência → prova → declaração + assinatura → certificado. */
const TreinamentoAberto: React.FC<{
  treinamento: TreinamentoPortal;
  credenciais: CredenciaisPortal;
  colaboradorNome: string;
  colaboradorCpf: string;
  instrucoes: InstrucaoTrabalho[];
  onVoltar: () => void;
  onAtualizar: (parcial: Partial<TreinamentoPortal>) => void;
}> = ({ treinamento: t, credenciais, colaboradorNome, colaboradorCpf, instrucoes, onVoltar, onAtualizar }) => {
  const concluido = t.status === 'Concluído';
  const [conteudoId, setConteudoId] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [enviandoProva, setEnviandoProva] = useState(false);
  const [resultado, setResultado] = useState<{ nota?: number; aprovado?: boolean; notaMinima?: number; acertos?: number; total?: number } | null>(null);
  const [concordo, setConcordo] = useState(false);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const conteudo = t.conteudos.find((c) => c.id === conteudoId) || null;
  const todosVistos = t.conteudos.every((c) => t.conteudosVistos.includes(c.id));
  const temProva = !!t.prova && t.prova.perguntas.length > 0;
  const aprovado = !temProva || t.tentativas.some((x) => x.aprovado) || !!resultado?.aprovado;
  const declaracao = `Declaro que participei do treinamento "${t.titulo}", que assisti/li todo o conteúdo e que compreendi as orientações recebidas, comprometendo-me a aplicá-las no meu trabalho.`;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [conteudoId]);

  const handleConcluirConteudo = async () => {
    if (!conteudo) return;
    setMarcando(true);
    setErro(null);
    try {
      if (!t.conteudosVistos.includes(conteudo.id)) {
        await portalMarcarVisto(credenciais, t.atribuicaoId, conteudo.id);
        onAtualizar({
          conteudosVistos: [...t.conteudosVistos, conteudo.id],
          status: t.status === 'Pendente' ? 'Em andamento' : t.status,
        });
      }
      const vistos = new Set([...t.conteudosVistos, conteudo.id]);
      setConteudoId(t.conteudos.find((c) => !vistos.has(c.id))?.id ?? null);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível registrar. Verifique sua internet e tente de novo.');
    } finally {
      setMarcando(false);
    }
  };

  const handleEnviarProva = async () => {
    setEnviandoProva(true);
    setErro(null);
    try {
      const r = await portalEnviarProva(credenciais, t.atribuicaoId, respostas);
      if (r.erro) {
        setErro('Não foi possível corrigir a prova. Saia e entre de novo no portal.');
        return;
      }
      setResultado(r);
      onAtualizar({ tentativas: [...t.tentativas, { em: new Date().toISOString(), nota: r.nota ?? 0, aprovado: !!r.aprovado }], nota: r.aprovado ? r.nota : t.nota });
      if (!r.aprovado) setRespostas({});
    } catch (err) {
      console.error(err);
      setErro('Não foi possível enviar a prova. Verifique sua internet e tente de novo.');
    } finally {
      setEnviandoProva(false);
    }
  };

  const handleConcluir = async () => {
    if (!assinatura || !concordo) return;
    setConcluindo(true);
    setErro(null);
    try {
      const r = await portalConcluir(credenciais, t.atribuicaoId, assinatura, declaracao);
      if (r.erro && r.erro !== 'concluido') {
        setErro(
          r.erro === 'conteudos'
            ? 'Ainda falta ver algum conteúdo.'
            : r.erro === 'prova'
              ? 'A prova ainda não foi aprovada.'
              : 'Não foi possível registrar a assinatura. Limpe e assine de novo.'
        );
        return;
      }
      onAtualizar({ status: 'Concluído', concluidoEm: r.concluidoEm || new Date().toISOString(), validoAte: r.validoAte ?? null });
    } catch (err) {
      console.error(err);
      setErro('Não foi possível concluir. Verifique sua internet e tente de novo.');
    } finally {
      setConcluindo(false);
    }
  };

  const handleCertificado = () => {
    const arquivo = gerarCertificadoPdf({
      colaboradorNome,
      colaboradorCpf,
      treinamentoTitulo: t.titulo,
      cargaHorariaMin: t.cargaHorariaMin,
      nota: t.nota,
      concluidoEm: t.concluidoEm || new Date().toISOString(),
      validoAte: t.validoAte,
      codigo: t.atribuicaoId,
      assinaturaImagem: assinatura || undefined,
    });
    baixarBlob(arquivo, arquivo.name);
  };

  const caixaErro = erro && (
    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{erro}</span>
    </div>
  );

  // ---- Um conteúdo aberto ----
  if (conteudo) {
    const jaVisto = t.conteudosVistos.includes(conteudo.id);
    const instrucao = conteudo.tipo === 'instrucao' ? instrucoes.find((i) => i.id === conteudo.instrucaoId) : undefined;
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setConteudoId(null)} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> {t.titulo}
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="text-[#C48229]">{ICONES[conteudo.tipo]}</span> {conteudo.titulo}
          </h2>
          {conteudo.tipo === 'video' && conteudo.url && <Video url={conteudo.url} />}
          {conteudo.tipo === 'pdf' && conteudo.url && (
            <>
              <a href={conteudo.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#92611F] flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Abrir o PDF em outra aba
              </a>
              <PdfEmTela url={conteudo.url} />
            </>
          )}
          {conteudo.tipo === 'texto' && <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{conteudo.texto}</p>}
          {conteudo.tipo === 'texto' && !!conteudo.telas?.length && <TelasIlustradas telas={conteudo.telas} />}
          {conteudo.tipo === 'telas' && <TelasIlustradas telas={conteudo.telas || []} />}
          {conteudo.tipo === 'instrucao' &&
            (instrucao ? (
              <InstrucaoLeitura instrucao={instrucao} semMoldura />
            ) : (
              <p className="text-xs text-slate-500">Esta Instrução de Trabalho não está mais vigente. Avise o Departamento Pessoal.</p>
            ))}
        </div>
        {caixaErro}
        <button
          type="button"
          onClick={handleConcluirConteudo}
          disabled={marcando}
          className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {marcando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {jaVisto ? 'Próximo' : conteudo.tipo === 'video' ? 'Assisti — continuar' : 'Li — continuar'}
        </button>
      </div>
    );
  }

  // ---- Visão geral do treinamento ----
  return (
    <div className="space-y-3">
      <button type="button" onClick={onVoltar} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Meus treinamentos
      </button>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <CapaTreinamento titulo={t.titulo} capa={t.capa} cargaHorariaMin={t.cargaHorariaMin} tamanho="grande" />
        <div className="p-4 sm:p-5 space-y-3">
          {t.prazo && !concluido && <p className="text-[11px] text-slate-500">Concluir até {dataBr(t.prazo)}</p>}
        {t.descricao && <p className="text-xs text-slate-600 whitespace-pre-line">{t.descricao}</p>}
        <ol className="space-y-1.5">
          {t.conteudos.map((c, i) => {
            const visto = t.conteudosVistos.includes(c.id) || concluido;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setConteudoId(c.id)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:border-[#C48229] text-left text-xs"
                >
                  {visto ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
                  <span className="text-[#C48229] shrink-0">{ICONES[c.tipo]}</span>
                  <span className="flex-1 font-semibold text-slate-700">
                    {i + 1}. {c.titulo}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        </div>
      </div>

      {concluido ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
          <Award className="w-9 h-9 text-emerald-600 mx-auto" />
          <p className="text-sm font-bold text-emerald-800">Treinamento concluído</p>
          <p className="text-xs text-emerald-700">
            Em {dataBr(t.concluidoEm)}
            {t.nota !== undefined && t.nota !== null && ` · nota ${t.nota}`}
            {t.validoAte && ` · válido até ${dataBr(t.validoAte)}`}
          </p>
          <button type="button" onClick={handleCertificado} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
            <Award className="w-4 h-4" /> Baixar certificado
          </button>
        </div>
      ) : !todosVistos ? (
        <button
          type="button"
          onClick={() => setConteudoId(t.conteudos.find((c) => !t.conteudosVistos.includes(c.id))?.id ?? null)}
          className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold"
        >
          {t.conteudosVistos.length ? 'Continuar' : 'Começar'}
        </button>
      ) : temProva && !aprovado ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#C48229]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Prova</h2>
              <p className="text-[11px] text-slate-500">Nota mínima para aprovação: {t.prova!.notaMinima}</p>
            </div>
          </div>
          {resultado && !resultado.aprovado && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-[#92611F] font-semibold">
              Você acertou {resultado.acertos} de {resultado.total} (nota {resultado.nota}). Revise o conteúdo se precisar e tente de novo.
            </div>
          )}
          {t.prova!.perguntas.map((p, i) => (
            <fieldset key={p.id} className="space-y-1.5">
              <legend className="text-xs font-bold text-slate-800 mb-1">
                {i + 1}. {p.enunciado}
              </legend>
              {p.alternativas.map((a, k) => (
                <label
                  key={k}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer ${respostas[p.id] === k ? 'border-[#C48229] bg-amber-50/60' : 'border-slate-200'}`}
                >
                  <input type="radio" name={p.id} checked={respostas[p.id] === k} onChange={() => setRespostas((prev) => ({ ...prev, [p.id]: k }))} className="mt-0.5 accent-[#C48229]" />
                  <span className="text-slate-700">{a}</span>
                </label>
              ))}
            </fieldset>
          ))}
          {caixaErro}
          <button
            type="button"
            onClick={handleEnviarProva}
            disabled={enviandoProva || t.prova!.perguntas.some((p) => respostas[p.id] === undefined)}
            className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {enviandoProva && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar respostas
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs text-xs">
          {resultado?.aprovado && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold">
              Aprovado! Você acertou {resultado.acertos} de {resultado.total} (nota {resultado.nota}).
            </div>
          )}
          <p className="font-bold text-slate-800">Para concluir, confirme e assine:</p>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={concordo} onChange={(e) => setConcordo(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
            <span className="text-slate-700 font-medium">{declaracao}</span>
          </label>
          <AssinaturaDigitalPad onChange={setAssinatura} />
          {caixaErro}
          <button
            type="button"
            onClick={handleConcluir}
            disabled={!concordo || !assinatura || concluindo}
            className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {concluindo && <Loader2 className="w-4 h-4 animate-spin" />}
            Assinar e concluir
          </button>
          <p className="text-[10px] text-slate-400 text-center">Ficam registrados a data, a hora e a confirmação do seu CPF.</p>
        </div>
      )}
    </div>
  );
};

const Video: React.FC<{ url: string }> = ({ url }) => {
  const v = urlIncorporavel(url);
  if (v.tipo === 'iframe') {
    return (
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={v.src}
          title="Vídeo do treinamento"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (v.tipo === 'video') return <video src={v.src} controls className="w-full rounded-xl bg-black" />;
  return (
    <a href={v.src} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#92611F] flex items-center gap-1">
      <ExternalLink className="w-3.5 h-3.5" /> Abrir o vídeo
    </a>
  );
};

const ListaInstrucoes: React.FC<{ instrucoes: InstrucaoTrabalho[]; onAbrir: (i: InstrucaoTrabalho) => void }> = ({ instrucoes, onAbrir }) => {
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();
  const lista = instrucoes.filter((i) => !termo || `${i.codigo} ${i.titulo}`.toLowerCase().includes(termo));
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar instrução" className="w-full pl-9 p-3 border border-slate-200 rounded-xl text-sm bg-white" />
      </div>
      {lista.length === 0 ? (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Nenhuma Instrução de Trabalho vigente encontrada.</p>
      ) : (
        lista.map((i) => (
          <button key={i.id} type="button" onClick={() => onAbrir(i)} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-[#C48229]">
            <p className="text-[10px] font-bold text-[#92611F]">{i.codigo} · versão {i.versao}</p>
            <p className="text-sm font-bold text-slate-900">{i.titulo}</p>
            {i.objetivo && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{i.objetivo}</p>}
          </button>
        ))
      )}
    </div>
  );
};

/** Leitura (somente) de uma Instrução de Trabalho — as partes que o colaborador usa no dia a dia. */
export const InstrucaoLeitura: React.FC<{ instrucao: InstrucaoTrabalho; semMoldura?: boolean }> = ({ instrucao: i, semMoldura }) => {
  const bloco = (titulo: string, texto?: string) =>
    texto?.trim() ? (
      <section>
        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1">{titulo}</h3>
        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{texto}</p>
      </section>
    ) : null;
  const etapas = [...(i.fluxoProcesso || [])].filter((e) => e.etapa?.trim()).sort((a, b) => a.ordem - b.ordem);
  return (
    <div className={semMoldura ? 'space-y-4' : 'bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs'}>
      {!semMoldura && (
        <div>
          <p className="text-[10px] font-bold text-[#92611F]">
            {i.codigo} · versão {i.versao}
            {i.dataVigencia && ` · vigente desde ${dataBr(i.dataVigencia)}`}
          </p>
          <h1 className="text-base font-black text-slate-900">{i.titulo}</h1>
        </div>
      )}
      {bloco('Objetivo', i.objetivo)}
      {bloco('Onde se aplica', i.aplicacaoAbrangencia)}
      {bloco('Definições', i.definicoes)}
      {i.responsabilidades?.some((r) => r.responsavel?.trim() || r.responsabilidade?.trim()) && (
        <section>
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1">Responsabilidades</h3>
          <ul className="space-y-1">
            {i.responsabilidades
              .filter((r) => r.responsavel?.trim() || r.responsabilidade?.trim())
              .map((r) => (
                <li key={r.id} className="text-sm text-slate-700">
                  <strong>{r.responsavel}:</strong> {r.responsabilidade}
                </li>
              ))}
          </ul>
        </section>
      )}
      {etapas.length > 0 && (
        <section>
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">Passo a passo</h3>
          <ol className="space-y-2">
            {etapas.map((e, k) => (
              <li key={e.id} className="flex gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-50 text-[#92611F] text-[11px] font-black flex items-center justify-center shrink-0">{k + 1}</span>
                <div className="text-sm text-slate-700">
                  <p className="font-semibold">{e.etapa}</p>
                  {e.responsavel && <p className="text-[11px] text-slate-500">Responsável: {e.responsavel}</p>}
                  {e.observacao && <p className="text-xs text-slate-500 whitespace-pre-line">{e.observacao}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {bloco('Critérios de decisão', i.criteriosDecisao)}
      {bloco('Registros e evidências', i.registrosEvidencias)}
      {i.riscosControles?.some((r) => r.risco?.trim()) && (
        <section>
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1">Riscos e cuidados</h3>
          <ul className="space-y-1">
            {i.riscosControles
              .filter((r) => r.risco?.trim())
              .map((r) => (
                <li key={r.id} className="text-sm text-slate-700">
                  <strong>{r.risco}</strong>
                  {r.controle && ` — ${r.controle}`}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
};

/** O Regulamento Interno vigente, só pra leitura (a assinatura é feita pelo link próprio que o
 *  DP envia — ver DocumentosAssinaturaView, categoria "regulamento"). Gerado no próprio
 *  navegador a partir do texto do sistema, então não depende de download do servidor. */
const RegulamentoLeitura: React.FC = () => {
  const arquivo = useMemo(() => gerarPdfRegulamento().arquivo, []);
  const url = useMemo(() => URL.createObjectURL(arquivo), [arquivo]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-[#C48229]" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Regulamento Interno</h2>
            <p className="text-[11px] text-slate-500">{ROTULO_VERSAO_REGULAMENTO}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => baixarBlob(arquivo, arquivo.name)}
          className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold shrink-0"
        >
          Baixar PDF
        </button>
      </div>
      <PdfEmTela url={url} />
    </div>
  );
};
