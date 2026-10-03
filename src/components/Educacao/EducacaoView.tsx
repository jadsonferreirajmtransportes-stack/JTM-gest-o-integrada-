import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  MonitorSmartphone,
  FileUp,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  MessageCircle,
  Award,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Link2,
  X,
  PlayCircle,
  FileText,
  BookOpen,
  ListChecks,
} from 'lucide-react';
import { Colaborador, InstrucaoTrabalho, UsuarioLogin } from '../../types';
import {
  AtribuicaoTreinamento,
  Treinamento,
  atribuicaoAtual,
  atribuirManualmente,
  deleteTreinamento,
  estaVencida,
  excluirAtribuicao,
  getAtribuicao,
  getAtribuicoes,
  getTokensPortal,
  getTreinamentos,
  montarLinkPortal,
  obterOuCriarTokenPortal,
  regenerarTokenPortal,
  saveTreinamento,
  sincronizarAtribuicoes,
} from '../../utils/educacaoApi';
import { TreinamentoEditorModal } from './TreinamentoEditorModal';
import { MODULOS_CORPORATIVOS, PREFIXO_TREINAMENTO_SISTEMA, montarTreinamentoSistema } from './treinamentosSistema';
import { documentoParaTreinamento } from './importarTreinamento';
import { gerarCertificadoPdf, formatarCargaHoraria } from './certificadoPdf';
import { baixarBlob } from '../../utils/downloadUtils';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';
import { EnvioWhatsAppEmMassaModal, ItemEnvioWhatsApp } from '../Common/EnvioWhatsAppEmMassaModal';
import { DocumentosAssinaturaView } from '../Contracheques/DocumentosAssinaturaView';

interface EducacaoViewProps {
  colaboradores: Colaborador[];
  instrucoes: InstrucaoTrabalho[];
  currentUser?: UsuarioLogin;
}

type Aba = 'treinamentos' | 'acompanhamento' | 'regulamento';
type SituacaoAtribuicao = 'Pendente' | 'Em andamento' | 'Concluído' | 'Atrasado' | 'Vencido';

const hoje = () => new Date().toISOString().slice(0, 10);

function situacao(a: AtribuicaoTreinamento): SituacaoAtribuicao {
  if (a.status === 'Concluído') return estaVencida(a) ? 'Vencido' : 'Concluído';
  if (a.prazo && a.prazo < hoje()) return 'Atrasado';
  return a.status;
}

const ESTILO_SITUACAO: Record<SituacaoAtribuicao, string> = {
  Pendente: 'bg-slate-100 text-slate-600 border-slate-200',
  'Em andamento': 'bg-amber-50 text-[#92611F] border-amber-200',
  Concluído: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Atrasado: 'bg-rose-50 text-rose-700 border-rose-200',
  Vencido: 'bg-rose-50 text-rose-700 border-rose-200',
};

function dataBr(iso?: string): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** DP → Portal de Educação: cadastro de treinamentos, acompanhamento por colaborador (com
 *  atribuição automática por cargo/setor e reciclagem), links do portal e o Regulamento
 *  Interno para ciência e assinatura. O colaborador faz tudo pelo link pessoal
 *  (?form=portal), entrando com CPF + data de nascimento. */
export const EducacaoView: React.FC<EducacaoViewProps> = ({ colaboradores, instrucoes, currentUser }) => {
  const [aba, setAba] = useState<Aba>('treinamentos');
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoTreinamento[]>([]);
  const [tokens, setTokens] = useState<Map<string, string>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Treinamento | null | 'novo'>(null);
  const [atribuindo, setAtribuindo] = useState<Treinamento | null>(null);
  const [filtroTreinamento, setFiltroTreinamento] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<SituacaoAtribuicao | ''>('');
  const [busca, setBusca] = useState('');
  const [acaoId, setAcaoId] = useState<string | null>(null);
  const [envioMassa, setEnvioMassa] = useState<ItemEnvioWhatsApp[] | null>(null);
  const [pacoteSistema, setPacoteSistema] = useState(false);
  const [importandoDoc, setImportandoDoc] = useState(false);
  const [preparandoEnvio, setPreparandoEnvio] = useState(false);

  const ativos: Colaborador[] = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo'), [colaboradores]);
  const colaboradorPorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);
  const treinamentoPorId = useMemo(() => new Map(treinamentos.map((t) => [t.id, t])), [treinamentos]);

  /** Carrega tudo e cria as atribuições que faltam (regra de cargo/setor + reciclagem). */
  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const [ts, as, tk] = await Promise.all([getTreinamentos(), getAtribuicoes(), getTokensPortal()]);
      const novas = await sincronizarAtribuicoes(ts, ativos, as);
      setTreinamentos(ts);
      setAtribuicoes([...novas, ...as]);
      setTokens(tk);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível carregar o Portal de Educação. Se for a primeira vez, confirme que a migração 061 foi rodada no Supabase.');
    } finally {
      setCarregando(false);
    }
  }, [ativos]);

  useEffect(() => {
    carregar();
    // Só na abertura — depois cada ação atualiza o estado local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atribuição "da vez" de cada colaborador × treinamento (a mais recente), só de ativos.
  const atuais: AtribuicaoTreinamento[] = useMemo(() => {
    const vistos = new Set<string>();
    return [...atribuicoes]
      .sort((a, b) => b.atribuidoEm.localeCompare(a.atribuidoEm))
      .filter((a) => {
        const chave = `${a.treinamentoId}|${a.colaboradorId}`;
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        const c = colaboradorPorId.get(a.colaboradorId);
        return !!c && c.status !== 'Inativo' && treinamentoPorId.has(a.treinamentoId);
      });
  }, [atribuicoes, colaboradorPorId, treinamentoPorId]);

  const linhas: AtribuicaoTreinamento[] = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return atuais
      .filter((a) => !filtroTreinamento || a.treinamentoId === filtroTreinamento)
      .filter((a) => !filtroSituacao || situacao(a) === filtroSituacao)
      .filter((a) => !termo || (colaboradorPorId.get(a.colaboradorId)?.nomeCompleto || '').toLowerCase().includes(termo))
      .sort((a, b) =>
        (colaboradorPorId.get(a.colaboradorId)?.nomeCompleto || '').localeCompare(colaboradorPorId.get(b.colaboradorId)?.nomeCompleto || '')
      );
  }, [atuais, filtroTreinamento, filtroSituacao, busca, colaboradorPorId]);

  const resumoPorTreinamento = useMemo(() => {
    const mapa = new Map<string, { total: number; concluidos: number }>();
    atuais.forEach((a) => {
      const r = mapa.get(a.treinamentoId) || { total: 0, concluidos: 0 };
      r.total += 1;
      if (situacao(a) === 'Concluído') r.concluidos += 1;
      mapa.set(a.treinamentoId, r);
    });
    return mapa;
  }, [atuais]);

  // Colaboradores com algo a fazer — os que recebem o link do portal no envio em massa.
  const comPendencia: Colaborador[] = useMemo(() => {
    const ids = new Set(atuais.filter((a) => situacao(a) !== 'Concluído').map((a) => a.colaboradorId));
    return ativos.filter((c) => ids.has(c.id));
  }, [atuais, ativos]);
  const semDadosDeAcesso: Colaborador[] = useMemo(
    () => comPendencia.filter((c) => !c.dataNascimento || (c.cpf || '').replace(/\D/g, '').length !== 11),
    [comPendencia]
  );

  const mensagemPortal = (c: Colaborador, token: string, pendentes: number) =>
    `Olá, ${c.nomeCompleto.split(' ')[0]}! Você tem ${pendentes} treinamento(s) no Portal de Educação da JM Transportes.\n\n` +
    `Acesse pelo seu link pessoal (para entrar, informe seu CPF e sua data de nascimento):\n${montarLinkPortal(token)}\n\n` +
    `Lá também ficam as Instruções de Trabalho e o Regulamento Interno.\n\nJM Transportes — Departamento Pessoal`;

  const pendentesDe = (colaboradorId: string) => atuais.filter((a) => a.colaboradorId === colaboradorId && situacao(a) !== 'Concluído').length;

  const handleWhatsAppPortal = async (c: Colaborador) => {
    setAcaoId(`wa-${c.id}`);
    try {
      const mapa = new Map<string, string>(tokens);
      const token = await obterOuCriarTokenPortal(c.id, mapa);
      setTokens(mapa);
      const link = buildWhatsAppLink(c.telefoneWhatsapp || '', mensagemPortal(c, token, pendentesDe(c.id)));
      if (!link) {
        await navigator.clipboard.writeText(montarLinkPortal(token)).catch(() => undefined);
        alert(`${c.nomeCompleto} não tem WhatsApp cadastrado. O link do portal foi copiado — envie por outro meio.`);
        return;
      }
      window.open(link, '_blank', 'noopener');
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o link do portal.');
    } finally {
      setAcaoId(null);
    }
  };

  const handleCopiarLink = async (c: Colaborador) => {
    try {
      const mapa = new Map<string, string>(tokens);
      const token = await obterOuCriarTokenPortal(c.id, mapa);
      setTokens(mapa);
      await navigator.clipboard.writeText(montarLinkPortal(token));
      alert('Link do portal copiado.');
    } catch (err) {
      console.error(err);
      alert('Não foi possível copiar o link.');
    }
  };

  const handleNovoLink = async (c: Colaborador) => {
    if (!window.confirm(`Gerar um link novo para ${c.nomeCompleto}? O link antigo para de funcionar.`)) return;
    try {
      const token = await regenerarTokenPortal(c.id);
      setTokens((prev) => new Map(prev).set(c.id, token));
      alert('Link novo gerado. Envie pelo WhatsApp.');
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o link novo.');
    }
  };

  const handleEnviarTodos = async () => {
    setPreparandoEnvio(true);
    try {
      const mapa = new Map<string, string>(tokens);
      const itens: ItemEnvioWhatsApp[] = [];
      for (const c of comPendencia) {
        const token = await obterOuCriarTokenPortal(c.id, mapa);
        itens.push({ id: c.id, nome: c.nomeCompleto, telefone: c.telefoneWhatsapp, mensagem: mensagemPortal(c, token, pendentesDe(c.id)) });
      }
      setTokens(mapa);
      setEnvioMassa(itens);
    } catch (err) {
      console.error(err);
      alert('Não foi possível preparar os links do portal.');
    } finally {
      setPreparandoEnvio(false);
    }
  };

  const handleCertificado = async (a: AtribuicaoTreinamento) => {
    const t = treinamentoPorId.get(a.treinamentoId);
    const c = colaboradorPorId.get(a.colaboradorId);
    if (!t || !c) return;
    setAcaoId(`cert-${a.id}`);
    try {
      const completa = (await getAtribuicao(a.id)) || a;
      const arquivo = gerarCertificadoPdf({
        colaboradorNome: c.nomeCompleto,
        colaboradorCpf: c.cpf,
        treinamentoTitulo: t.titulo,
        cargaHorariaMin: t.cargaHorariaMin,
        nota: completa.nota,
        concluidoEm: completa.concluidoEm || '',
        validoAte: completa.validoAte,
        codigo: completa.id,
        assinaturaImagem: completa.assinaturaImagem,
      });
      baixarBlob(arquivo, arquivo.name);
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o certificado.');
    } finally {
      setAcaoId(null);
    }
  };

  const handleExcluirAtribuicao = async (a: AtribuicaoTreinamento) => {
    const nome = colaboradorPorId.get(a.colaboradorId)?.nomeCompleto;
    const t = treinamentoPorId.get(a.treinamentoId);
    const aviso = a.origem === 'regra' ? '\n\nAtenção: pela regra de cargo/setor, este treinamento volta a ser atribuído na próxima abertura da tela.' : '';
    if (!window.confirm(`Remover "${t?.titulo}" de ${nome}?${aviso}`)) return;
    try {
      await excluirAtribuicao(a.id);
      setAtribuicoes((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      console.error(err);
      alert('Não foi possível remover.');
    }
  };

  const handleSalvarTreinamento = async (t: Treinamento) => {
    const salvo = await saveTreinamento(t);
    const lista = [...treinamentos.filter((x) => x.id !== salvo.id), salvo].sort((a, b) => a.titulo.localeCompare(b.titulo));
    setTreinamentos(lista);
    const novas = await sincronizarAtribuicoes(lista, ativos, atribuicoes);
    if (novas.length > 0) setAtribuicoes((prev) => [...novas, ...prev]);
  };

  /** Vários treinamentos de uma vez (pacote do sistema): salva todos e atribui uma vez só. */
  const handleCriarVarios = async (novos: Treinamento[]) => {
    const salvos: Treinamento[] = [];
    for (const t of novos) salvos.push(await saveTreinamento(t));
    const lista = [...treinamentos.filter((x) => !salvos.some((s) => s.id === x.id)), ...salvos].sort((a, b) => a.titulo.localeCompare(b.titulo));
    setTreinamentos(lista);
    const novas = await sincronizarAtribuicoes(lista, ativos, atribuicoes);
    if (novas.length > 0) setAtribuicoes((prev) => [...novas, ...prev]);
    return novas.length;
  };

  const handleExcluirTreinamento = async (t: Treinamento) => {
    const r = resumoPorTreinamento.get(t.id);
    const aviso = r && r.total > 0 ? `\n\n${r.total} colaborador(es) têm este treinamento (${r.concluidos} concluído[s]) — o histórico e os certificados deles também serão apagados. Para só parar de atribuir, desmarque "Ativo".` : '';
    if (!window.confirm(`Excluir o treinamento "${t.titulo}"?${aviso}`)) return;
    try {
      await deleteTreinamento(t.id);
      setTreinamentos((prev) => prev.filter((x) => x.id !== t.id));
      setAtribuicoes((prev) => prev.filter((a) => a.treinamentoId !== t.id));
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir.');
    }
  };

  const iconeTipo = { video: PlayCircle, pdf: FileText, instrucao: BookOpen, texto: FileText, telas: MonitorSmartphone };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Portal de Educação</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Treinamentos com vídeo, material, prova e certificado; Instruções de Trabalho e Regulamento Interno — tudo pelo link pessoal do colaborador.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleEnviarTodos}
            disabled={preparandoEnvio || comPendencia.length === 0}
            className="px-3 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            title="Envia pelo WhatsApp o link do portal pra quem tem treinamento em aberto"
          >
            {preparandoEnvio ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            Enviar link do portal ({comPendencia.length})
          </button>
          <button
            type="button"
            onClick={() => setImportandoDoc(true)}
            className="px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
            title="Monta um treinamento a partir de um PDF, Word ou texto colado"
          >
            <FileUp className="w-4 h-4 text-[#92611F]" /> Importar documento
          </button>
          <button
            type="button"
            onClick={() => setPacoteSistema(true)}
            className="px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
            title="Treinamentos prontos de uso dos módulos do sistema, para os supervisores"
          >
            <MonitorSmartphone className="w-4 h-4 text-[#92611F]" /> Treinamentos do sistema
          </button>
          <button
            type="button"
            onClick={() => setEditando('novo')}
            className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo treinamento
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ['treinamentos', 'Treinamentos'],
            ['acompanhamento', 'Acompanhamento'],
            ['regulamento', 'Regulamento Interno'],
          ] as [Aba, string][]
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px ${aba === id ? 'border-[#C48229] text-[#92611F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      {semDadosDeAcesso.length > 0 && aba !== 'regulamento' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-[#92611F] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{semDadosDeAcesso.length} colaborador(es) com treinamento em aberto não conseguem entrar no portal</strong> — falta data de nascimento ou CPF
            no cadastro: {semDadosDeAcesso.map((c) => c.nomeCompleto).join(', ')}.
          </span>
        </div>
      )}

      {aba === 'regulamento' ? (
        <DocumentosAssinaturaView categoria="regulamento" colaboradores={colaboradores} currentUser={currentUser} compacto />
      ) : carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : aba === 'treinamentos' ? (
        treinamentos.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
            Nenhum treinamento cadastrado. Clique em <strong>Novo treinamento</strong> para montar o primeiro (vídeos, PDFs, Instruções de Trabalho e prova).
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {treinamentos.map((t) => {
              const r = resumoPorTreinamento.get(t.id) || { total: 0, concluidos: 0 };
              const pct = r.total ? Math.round((r.concluidos / r.total) * 100) : 0;
              return (
                <div key={t.id} className={`bg-white rounded-2xl border border-slate-200 p-4 space-y-3 ${t.ativo ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{t.titulo}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatarCargaHoraria(t.cargaHorariaMin)} · {t.conteudos.length} conteúdo(s)
                        {t.prova?.perguntas.length ? ` · prova (${t.prova.perguntas.length} perguntas, mín. ${t.prova.notaMinima})` : ''}
                      </p>
                    </div>
                    {!t.ativo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inativo</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.conteudos.slice(0, 6).map((c) => {
                      const Icone = iconeTipo[c.tipo];
                      return (
                        <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-1 max-w-full truncate">
                          <Icone className="w-3 h-3 shrink-0" /> {c.titulo}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p>
                      <strong>Quem faz:</strong>{' '}
                      {t.obrigatorioTodos
                        ? 'todos os colaboradores'
                        : [...t.obrigatorioCargos, ...t.obrigatorioSetores].join(', ') || 'só atribuição manual'}
                    </p>
                    <p>
                      <strong>Validade:</strong> {t.validadeMeses ? `${t.validadeMeses} meses (reciclagem automática)` : 'não vence'}
                      {t.prazoDias ? ` · prazo ${t.prazoDias} dias` : ''}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                      <span>Concluíram</span>
                      <span>
                        {r.concluidos} de {r.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button type="button" onClick={() => setEditando(t)} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button type="button" onClick={() => setAtribuindo(t)} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                      <UserPlus className="w-3 h-3" /> Atribuir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroTreinamento(t.id);
                        setAba('acompanhamento');
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                    >
                      <ListChecks className="w-3 h-3" /> Quem fez
                    </button>
                    <button type="button" onClick={() => handleExcluirTreinamento(t)} className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold flex items-center gap-1 ml-auto">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={filtroTreinamento} onChange={(e) => setFiltroTreinamento(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold">
              <option value="">Todos os treinamentos</option>
              {treinamentos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo}
                </option>
              ))}
            </select>
            <select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value as SituacaoAtribuicao | '')} className="p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold">
              <option value="">Todas as situações</option>
              {(Object.keys(ESTILO_SITUACAO) as SituacaoAtribuicao[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador" className="w-full pl-8 p-2 border border-slate-200 rounded-lg text-xs" />
            </div>
            <button
              type="button"
              onClick={() => {
                setCarregando(true);
                carregar();
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50"
              title="Recarregar e verificar atribuições/reciclagens"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3">Colaborador</th>
                  <th className="text-left p-3">Treinamento</th>
                  <th className="text-left p-3">Situação</th>
                  <th className="text-left p-3">Prazo</th>
                  <th className="text-left p-3">Nota</th>
                  <th className="text-left p-3">Concluído / validade</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Nenhuma atribuição com esses filtros.
                    </td>
                  </tr>
                ) : (
                  linhas.map((a) => {
                    const c = colaboradorPorId.get(a.colaboradorId)!;
                    const t = treinamentoPorId.get(a.treinamentoId)!;
                    const s = situacao(a);
                    const progresso = t.conteudos.length ? a.conteudosVistos.filter((id) => t.conteudos.some((x) => x.id === id)).length : 0;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{c.nomeCompleto}</p>
                          <p className="text-[10px] text-slate-400">{c.funcaoCargo}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-slate-700">{t.titulo}</p>
                          <p className="text-[10px] text-slate-400">
                            {a.origem === 'reciclagem' ? 'Reciclagem' : a.origem === 'manual' ? 'Atribuído manualmente' : 'Pelo cargo/setor'}
                            {s !== 'Concluído' && s !== 'Vencido' && ` · ${progresso}/${t.conteudos.length} conteúdos`}
                          </p>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTILO_SITUACAO[s]}`}>{s}</span>
                        </td>
                        <td className="p-3 text-slate-600">{dataBr(a.prazo)}</td>
                        <td className="p-3 text-slate-600">{a.nota ?? (a.tentativas.length ? `${a.tentativas.length} tentativa(s)` : '—')}</td>
                        <td className="p-3 text-slate-600">
                          {a.concluidoEm ? dataBr(a.concluidoEm) : '—'}
                          {a.validoAte && <span className="block text-[10px] text-slate-400">até {dataBr(a.validoAte)}</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {a.status === 'Concluído' && (
                              <button type="button" onClick={() => handleCertificado(a)} className="p-1.5 text-[#92611F] hover:bg-amber-50 rounded-lg" title="Baixar certificado">
                                {acaoId === `cert-${a.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button type="button" onClick={() => handleWhatsAppPortal(c)} className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg" title="Enviar link do portal pelo WhatsApp">
                              {acaoId === `wa-${c.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button type="button" onClick={() => handleCopiarLink(c)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Copiar link do portal">
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleNovoLink(c)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Gerar link novo (o antigo para de funcionar)">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            {a.status !== 'Concluído' && (
                              <button type="button" onClick={() => handleExcluirAtribuicao(a)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Remover atribuição">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editando && (
        <TreinamentoEditorModal
          treinamento={editando === 'novo' ? null : editando}
          colaboradores={ativos}
          instrucoes={instrucoes}
          criadoPor={currentUser?.nome}
          onClose={() => setEditando(null)}
          onSalvar={handleSalvarTreinamento}
        />
      )}

      {importandoDoc && (
        <ImportarDocumentoModal
          criadoPor={currentUser?.nome}
          onClose={() => setImportandoDoc(false)}
          onPronto={(t) => {
            setImportandoDoc(false);
            setEditando(t);
          }}
        />
      )}

      {pacoteSistema && (
        <PacoteSistemaModal
          colaboradores={ativos}
          existentes={treinamentos}
          criadoPor={currentUser?.nome}
          onClose={() => setPacoteSistema(false)}
          onCriar={handleCriarVarios}
        />
      )}

      {atribuindo && (
        <AtribuirModal
          treinamento={atribuindo}
          colaboradores={ativos}
          atribuicoes={atribuicoes}
          onClose={() => setAtribuindo(null)}
          onAtribuido={(novas) => setAtribuicoes((prev) => [...novas, ...prev])}
        />
      )}

      {envioMassa && (
        <EnvioWhatsAppEmMassaModal titulo="Enviar link do Portal de Educação" itens={envioMassa} onClose={() => setEnvioMassa(null)} />
      )}
    </div>
  );
};

/** Monta um rascunho de treinamento a partir de um PDF, Word ou texto colado (ver
 *  importarTreinamento.ts) e abre no editor para revisar antes de salvar. */
export const ImportarDocumentoModal: React.FC<{ criadoPor?: string; onClose: () => void; onPronto: (t: Treinamento) => void }> = ({ criadoPor, onClose, onPronto }) => {
  const [modo, setModo] = useState<'arquivo' | 'texto'>('arquivo');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [texto, setTexto] = useState('');
  const [titulo, setTitulo] = useState('');
  const [anexarPdf, setAnexarPdf] = useState(true);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ treinamento: Treinamento; avisos: string[] } | null>(null);
  const ehPdf = !!arquivo && arquivo.name.toLowerCase().endsWith('.pdf');
  const pronto = titulo.trim().length > 2 && (modo === 'arquivo' ? !!arquivo : texto.trim().length > 20);

  const handleMontar = async () => {
    setErro(null);
    setProgresso('Lendo...');
    try {
      const r = await documentoParaTreinamento(modo === 'arquivo' ? { arquivo: arquivo!, anexarPdf } : { texto }, { titulo, criadoPor, aoProgredir: setProgresso });
      if (r.avisos.length === 0) onPronto(r.treinamento);
      else setResultado(r);
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível montar o treinamento.');
    } finally {
      setProgresso(null);
    }
  };

  return (
    <div data-texto-livre="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">Treinamento a partir de um documento</h2>
            <p className="text-slate-500 mt-0.5">O sistema separa o conteúdo pelos títulos do documento. Você revisa no editor, define quem faz e, se quiser, acrescenta a prova.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          {resultado ? (
            <div className="space-y-3">
              <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold">
                Treinamento montado com {resultado.treinamento.conteudos.length} conteúdo(s). Confira os avisos abaixo e revise no editor.
              </p>
              <ul className="space-y-1.5">
                {resultado.avisos.map((a) => (
                  <li key={a} className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[#7A4F17]">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {(
                  [
                    ['arquivo', 'Arquivo (PDF ou Word)'],
                    ['texto', 'Colar texto'],
                  ] as ['arquivo' | 'texto', string][]
                ).map(([id, nome]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setModo(id)}
                    className={`flex-1 py-2 rounded-xl border font-bold ${modo === id ? 'bg-[#C48229] text-white border-[#C48229]' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Título do treinamento</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="Ex.: Boas Práticas de Transporte de Medicamentos" />
              </div>
              {modo === 'arquivo' ? (
                <>
                  <label className="block p-4 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-[#C48229]">
                    <FileUp className="w-6 h-6 text-[#92611F] mx-auto mb-1" />
                    <span className="font-semibold text-slate-700">{arquivo ? arquivo.name : 'Escolher PDF ou Word (.docx)'}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (f && f.size > 20 * 1024 * 1024) {
                          setErro('O arquivo passa de 20MB.');
                          return;
                        }
                        setArquivo(f);
                        if (f && !titulo.trim()) setTitulo(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
                      }}
                    />
                  </label>
                  {ehPdf && (
                    <label className="flex items-start gap-2 font-semibold text-slate-700">
                      <input type="checkbox" checked={anexarPdf} onChange={(e) => setAnexarPdf(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
                      <span>
                        Incluir o PDF original como material
                        <span className="block font-normal text-slate-500">O colaborador vê também o documento com o visual original (imagens, tabelas).</span>
                      </span>
                    </label>
                  )}
                  <p className="text-slate-500">As figuras do documento (Word ou PDF) entram no treinamento, na parte em que aparecem. Logos e cabeçalhos repetidos ficam de fora. Word antigo (.doc): salve como .docx antes.</p>
                </>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Texto</label>
                  <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={10} className="w-full p-2 border border-slate-300 rounded-lg" placeholder={'Cole aqui o conteúdo.\n\nDica: linhas curtas em MAIÚSCULAS, terminadas em ":" ou começando com "#" viram títulos; linhas com "-" ou "1." viram listas.'} />
                </div>
              )}
              {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
            </>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
            Cancelar
          </button>
          {resultado ? (
            <button type="button" onClick={() => onPronto(resultado.treinamento)} className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold">
              Revisar no editor
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMontar}
              disabled={!pronto || !!progresso}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {progresso && <Loader2 className="w-4 h-4 animate-spin" />}
              {progresso || 'Montar treinamento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Pacote "Treinamentos do sistema": cria os treinamentos de uso dos módulos corporativos
 *  para os cargos escolhidos (os que parecem de supervisor já vêm marcados). */
export const PacoteSistemaModal: React.FC<{
  colaboradores: Colaborador[];
  existentes: Treinamento[];
  criadoPor?: string;
  onClose: () => void;
  onCriar: (lista: Treinamento[]) => Promise<number>;
}> = ({ colaboradores, existentes, criadoPor, onClose, onCriar }) => {
  const cargos: string[] = useMemo(
    () => Array.from(new Set<string>(colaboradores.map((c) => (c.funcaoCargo || '').trim()).filter(Boolean))).sort((a: string, b: string) => a.localeCompare(b)),
    [colaboradores]
  );
  const ehSupervisor = (c: string) => /supervis|coordenad|l[ií]der|encarregad|gerente/i.test(c);
  const [cargosSel, setCargosSel] = useState<Set<string>>(() => new Set(cargos.filter(ehSupervisor)));
  const existente = (titulo: string) => existentes.find((t) => t.titulo.trim().toLowerCase() === titulo.toLowerCase());
  const jaExiste = (titulo: string) => !!existente(titulo);
  const [modulosSel, setModulosSel] = useState<Set<string>>(
    () => new Set(MODULOS_CORPORATIVOS.map((m) => m.secao))
  );
  const [prazoDias, setPrazoDias] = useState(15);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pessoas = colaboradores.filter((c) => cargosSel.has((c.funcaoCargo || '').trim())).length;

  const alternar = (conjunto: Set<string>, valor: string) => {
    const novo = new Set(conjunto);
    if (novo.has(valor)) novo.delete(valor);
    else novo.add(valor);
    return novo;
  };

  const handleCriar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      let criados = 0;
      let atualizados = 0;
      const lista = MODULOS_CORPORATIVOS.filter((m) => modulosSel.has(m.secao)).map((m) => {
        const novo = montarTreinamentoSistema(m, { cargos: Array.from(cargosSel), prazoDias: prazoDias || undefined, criadoPor });
        const atual = existente(novo.titulo);
        if (!atual) {
          criados += 1;
          return novo;
        }
        // Já existe: troca só o conteúdo (mantém quem faz, prazo, validade e o histórico de quem concluiu).
        atualizados += 1;
        return { ...atual, conteudos: novo.conteudos, descricao: novo.descricao, cargaHorariaMin: novo.cargaHorariaMin };
      });
      const atribuicoes = await onCriar(lista);
      setResultado(
        [criados ? `${criados} treinamento(s) criado(s)` : '', atualizados ? `${atualizados} atualizado(s) com as imagens` : '', `${atribuicoes} nova(s) atribuição(ões)`]
          .filter(Boolean)
          .join(', ') + '. Agora use "Enviar link do portal" para avisar os supervisores.'
      );
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível criar os treinamentos.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">Treinamentos do sistema — supervisores</h2>
            <p className="text-slate-500 mt-0.5">Um treinamento por módulo, com conteúdo do manual do sistema e um exercício prático. Sem prova: leitura + assinatura de ciência.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          {resultado ? (
            <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold">{resultado}</p>
          ) : (
            <>
              <section className="space-y-1.5">
                <p className="font-black text-slate-700 uppercase tracking-wide text-[11px]">Módulos</p>
                {MODULOS_CORPORATIVOS.map((m) => {
                  const existe = jaExiste(`${PREFIXO_TREINAMENTO_SISTEMA}${m.titulo}`);
                  return (
                    <label key={m.secao} className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={modulosSel.has(m.secao)}
                        onChange={() => setModulosSel((s) => alternar(s, m.secao))}
                        className="w-4 h-4 accent-[#C48229]"
                      />
                      <span className="flex-1 font-semibold text-slate-800">{m.titulo}</span>
                      <span className={existe ? 'text-[#92611F] font-semibold' : 'text-slate-400'}>{existe ? 'já existe — atualizar com as imagens' : formatarCargaHoraria(m.cargaHorariaMin)}</span>
                    </label>
                  );
                })}
              </section>
              <section className="space-y-1.5">
                <p className="font-black text-slate-700 uppercase tracking-wide text-[11px]">Cargos que devem fazer</p>
                {cargos.length === 0 ? (
                  <p className="text-slate-500">Nenhum cargo no cadastro de colaboradores.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {cargos.map((c) => (
                      <label key={c} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={cargosSel.has(c)} onChange={() => setCargosSel((s) => alternar(s, c))} className="w-4 h-4 accent-[#C48229]" />
                        <span className="flex-1">{c}</span>
                        {ehSupervisor(c) && <span className="text-[10px] text-[#92611F] font-bold">supervisão</span>}
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-slate-500">
                  {pessoas} colaborador(es) com esses cargos. Quem não tiver um desses cargos pode receber depois pelo botão "Atribuir" do treinamento.
                </p>
              </section>
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                Prazo para concluir
                <input type="number" min={0} value={prazoDias} onChange={(e) => setPrazoDias(Math.max(0, Number(e.target.value) || 0))} className="w-16 p-1.5 border border-slate-300 rounded-lg" />
                dias
              </label>
              <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[#7A4F17]">
                Para fazer a parte prática, o supervisor precisa ter os módulos liberados no login dele (Logins & Acessos).
              </p>
              {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
            </>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
            {resultado ? 'Fechar' : 'Cancelar'}
          </button>
          {!resultado && (
            <button
              type="button"
              onClick={handleCriar}
              disabled={salvando || modulosSel.size === 0 || cargosSel.size === 0}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar / atualizar {modulosSel.size}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Atribuição manual de um treinamento a colaboradores específicos. */
const AtribuirModal: React.FC<{
  treinamento: Treinamento;
  colaboradores: Colaborador[];
  atribuicoes: AtribuicaoTreinamento[];
  onClose: () => void;
  onAtribuido: (novas: AtribuicaoTreinamento[]) => void;
}> = ({ treinamento, colaboradores, atribuicoes, onClose, onAtribuido }) => {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);

  const emAberto = (cid: string) => {
    const a = atribuicaoAtual(atribuicoes, treinamento.id, cid);
    return !!a && a.status !== 'Concluído';
  };
  const lista = colaboradores
    .filter((c) => !busca.trim() || c.nomeCompleto.toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const novas = await atribuirManualmente(treinamento, Array.from(selecionados), atribuicoes);
      onAtribuido(novas);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Não foi possível atribuir.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">Atribuir treinamento</h2>
            <p className="text-slate-500 mt-0.5">{treinamento.titulo}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador" className="w-full p-2 border border-slate-200 rounded-lg" />
          <p className="text-[11px] text-slate-500">Quem já concluiu pode receber de novo (refazer). Quem está com o treinamento em aberto não aparece marcável.</p>
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {lista.map((c) => {
              const aberto = emAberto(c.id);
              return (
                <label key={c.id} className={`flex items-center gap-2.5 px-3 py-2 ${aberto ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    disabled={aberto}
                    checked={selecionados.has(c.id)}
                    onChange={() =>
                      setSelecionados((prev) => {
                        const novo = new Set(prev);
                        if (novo.has(c.id)) novo.delete(c.id);
                        else novo.add(c.id);
                        return novo;
                      })
                    }
                    className="w-4 h-4 accent-[#C48229]"
                  />
                  <span className="flex-1 font-medium text-slate-800">{c.nomeCompleto}</span>
                  <span className="text-slate-400">{aberto ? 'já atribuído' : c.funcaoCargo}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || selecionados.size === 0}
            className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Atribuir a {selecionados.size}
          </button>
        </div>
      </div>
    </div>
  );
};
