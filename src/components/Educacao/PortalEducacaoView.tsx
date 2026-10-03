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

type Aba = 'treinamentos' | 'instrucoes' | 'regulamento';

/** Portal do colaborador (sem login): ?form=portal&token=... — entra com CPF + data de
 *  nascimento, faz os treinamentos (conteúdos → prova → assinatura → certificado), consulta
 *  as Instruções de Trabalho vigentes e lê o Regulamento Interno. Tudo passa pelas funções
 *  portal_* do banco (migração 061), que conferem token + CPF + nascimento a cada chamada. */
export const PortalEducacaoView: React.FC<{ token?: string }> = ({ token }) => {
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(token ? null : MENSAGENS_ERRO.link);
  const [credenciais, setCredenciais] = useState<CredenciaisPortal | null>(null);
  const [dados, setDados] = useState<DadosPortal | null>(null);
  const [aba, setAba] = useState<Aba>('treinamentos');
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [instrucaoAberta, setInstrucaoAberta] = useState<InstrucaoTrabalho | null>(null);

  const instrucoes: InstrucaoTrabalho[] = useMemo(() => (dados?.instrucoes ?? []).map(rowToInstrucao), [dados]);
  const aberto = dados?.treinamentos.find((t) => t.atribuicaoId === abertoId) || null;

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
      const r = await portalEntrar(cred);
      if (r.erro) setErro(MENSAGENS_ERRO[r.erro]);
      else if (r.dados) {
        setCredenciais(cred);
        setDados(r.dados);
      }
    } catch (err) {
      console.error(err);
      setErro('Não foi possível entrar agora. Verifique sua internet e tente de novo.');
    } finally {
      setEntrando(false);
    }
  };

  const atualizarTreinamento = (atribuicaoId: string, parcial: Partial<TreinamentoPortal>) =>
    setDados((prev) =>
      prev ? { ...prev, treinamentos: prev.treinamentos.map((t) => (t.atribuicaoId === atribuicaoId ? { ...t, ...parcial } : t)) } : prev
    );

  const pendentes = dados?.treinamentos.filter((t) => t.status !== 'Concluído').length ?? 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <JmtLogo variant="compact" theme="light" iconSize={28} />
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#C48229]" /> Portal de Educação
        </span>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        {!dados || !credenciais ? (
          <form onSubmit={handleEntrar} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">Portal de Educação JMT</h1>
                <p className="text-xs text-slate-500">Treinamentos, Instruções de Trabalho e Regulamento Interno.</p>
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
        ) : aberto ? (
          <TreinamentoAberto
            treinamento={aberto}
            credenciais={credenciais}
            colaboradorNome={dados.colaborador.nome}
            colaboradorCpf={credenciais.cpf}
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
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
              <p className="text-xs text-slate-500">Olá,</p>
              <h1 className="text-lg font-black text-slate-900">{dados.colaborador.nome}</h1>
              {dados.colaborador.cargo && <p className="text-xs text-slate-500">{dados.colaborador.cargo}</p>}
              <p className="text-xs mt-2 font-semibold text-[#92611F]">
                {pendentes > 0 ? `Você tem ${pendentes} treinamento(s) para concluir.` : 'Você está em dia com os treinamentos.'}
              </p>
            </div>

            <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
              {(
                [
                  ['treinamentos', 'Treinamentos'],
                  ['instrucoes', 'Instruções de Trabalho'],
                  ['regulamento', 'Regulamento'],
                ] as [Aba, string][]
              ).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAba(id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${aba === id ? 'bg-[#C48229] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

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
          </>
        )}
      </main>
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
