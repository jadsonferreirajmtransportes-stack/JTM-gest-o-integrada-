import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Loader2,
  AlertTriangle,
  MapPin,
  Plus,
  Trash2,
  Pencil,
  X,
  Download,
  FileSignature,
  MessageCircle,
  Link2,
  Smartphone,
  RefreshCw,
  Ban,
  CalendarCheck,
  Info,
  Sheet,
} from 'lucide-react';
import { Colaborador, UsuarioLogin } from '../../types';
import {
  BatidaPonto,
  JornadaPonto,
  JustificativaDia,
  LocalPonto,
  TIPOS_JUSTIFICATIVA,
  anularBatida,
  definirJornadaColaboradores,
  deleteJornada,
  deleteLocal,
  desconectarAparelhos,
  excluirJustificativa,
  getBatidas,
  getInicioControle,
  getJornadas,
  getJornadasColaboradores,
  getJustificativas,
  getLocais,
  incluirBatidaAjuste,
  salvarJustificativa,
  saveJornada,
  saveLocal,
} from '../../utils/frequenciaApi';
import { getTokensPortal, obterOuCriarTokenPortal } from '../../utils/educacaoApi';
import { criarDocumentoAssinatura } from '../../utils/documentosAssinaturaApi';
import { linkUnicoDe, montarLinkUnico } from '../../utils/linkUnico';
import { buildWhatsAppLink } from '../../utils/birthdayUtils';
import { baixarBlob } from '../../utils/downloadUtils';
import { EnvioWhatsAppEmMassaModal, ItemEnvioWhatsApp } from '../Common/EnvioWhatsAppEmMassaModal';
import { DocumentosAssinaturaView } from '../Contracheques/DocumentosAssinaturaView';
import {
  DiaEspelho,
  LIMITE_ATRASOS_MES,
  NOMES_DIA,
  ResumoFrequencia,
  SituacaoDia,
  diaDaSemana,
  diaDeTrabalho,
  diasDoMes,
  formatarMinutos,
  hojeLocal,
  dataLocal,
  horaLocal,
  montarEspelho,
  resumir,
} from './frequenciaCalc';
import { gerarEspelhoPdf, nomeMes } from './espelhoPdf';
import { gerarEspelhoXlsx, gerarResumoPdf, gerarResumoXlsx } from './relatorioFrequencia';

interface FrequenciaViewProps {
  colaboradores: Colaborador[];
  currentUser?: UsuarioLogin;
}

type Aba = 'hoje' | 'espelho' | 'resumo' | 'assinaturas' | 'configurar';

const ESTILO_SITUACAO: Record<SituacaoDia, string> = {
  OK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Atraso: 'bg-amber-50 text-[#92611F] border-amber-200',
  Falta: 'bg-rose-50 text-rose-700 border-rose-200',
  Incompleto: 'bg-orange-50 text-orange-700 border-orange-200',
  Justificado: 'bg-sky-50 text-sky-700 border-sky-200',
  Folga: 'bg-slate-50 text-slate-400 border-slate-200',
  Extra: 'bg-violet-50 text-violet-700 border-violet-200',
  Futuro: 'bg-white text-slate-300 border-slate-100',
  'Em andamento': 'bg-slate-100 text-slate-600 border-slate-200',
  'Fora do período': 'bg-white text-slate-300 border-slate-100',
};

const mesAtual = () => hojeLocal().slice(0, 7);
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** DP → Controle de Frequência (CONTROLE INTERNO — o ponto oficial continua no sistema atual).
 *  Batidas pelo celular (?form=ponto), espelho mensal com ajustes auditáveis, justificativas,
 *  resumo com a regra de atrasos do Regulamento e espelho para assinatura do colaborador. */
export const FrequenciaView: React.FC<FrequenciaViewProps> = ({ colaboradores, currentUser }) => {
  const [aba, setAba] = useState<Aba>('hoje');
  const [mes, setMes] = useState(mesAtual());
  const [jornadas, setJornadas] = useState<JornadaPonto[]>([]);
  const [jornadaDe, setJornadaDe] = useState<Map<string, string>>(new Map());
  const [locais, setLocais] = useState<LocalPonto[]>([]);
  const [tokens, setTokens] = useState<Map<string, string>>(new Map());
  const [inicioControle, setInicioControle] = useState<string | null>(null);
  const [batidas, setBatidas] = useState<BatidaPonto[]>([]);
  const [justificativas, setJustificativas] = useState<JustificativaDia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMes, setCarregandoMes] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [colaboradorId, setColaboradorId] = useState('');
  const [envioMassa, setEnvioMassa] = useState<{ titulo: string; itens: ItemEnvioWhatsApp[] } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [acaoDia, setAcaoDia] = useState<{ tipo: 'batida' | 'justificar'; data: string } | null>(null);
  const [anulando, setAnulando] = useState<BatidaPonto | null>(null);
  const [editandoJornada, setEditandoJornada] = useState<JornadaPonto | 'nova' | null>(null);
  const [editandoLocal, setEditandoLocal] = useState<LocalPonto | 'novo' | null>(null);

  const ativos: Colaborador[] = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
    [colaboradores]
  );
  const colaboradorPorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);
  const jornadaPorId = useMemo(() => new Map(jornadas.map((j) => [j.id, j])), [jornadas]);
  const raioPadrao = locais.length ? Math.max(...locais.map((l) => l.raioM)) : 300;

  useEffect(() => {
    Promise.all([getJornadas(), getJornadasColaboradores(), getLocais(), getTokensPortal(), getInicioControle()])
      .then(([js, jc, ls, tk, ini]) => {
        setJornadas(js);
        setJornadaDe(jc);
        setLocais(ls);
        setTokens(tk);
        setInicioControle(ini);
      })
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar o Controle de Frequência. Se for a primeira vez, confirme que a migração 062 foi rodada no Supabase.');
      })
      .finally(() => setCarregando(false));
  }, []);

  const carregarMes = useCallback(async () => {
    setCarregandoMes(true);
    try {
      const dias = diasDoMes(mes);
      const [bs, js] = await Promise.all([getBatidas(dias[0], dias[dias.length - 1]), getJustificativas(dias[0], dias[dias.length - 1])]);
      setBatidas(bs);
      setJustificativas(js);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível carregar as batidas do mês. Se for a primeira vez, confirme que a migração 062 foi rodada no Supabase.');
    } finally {
      setCarregandoMes(false);
    }
  }, [mes]);

  useEffect(() => {
    carregarMes();
  }, [carregarMes]);

  const espelhoDe = useCallback(
    (c: Colaborador, dias: string[]): DiaEspelho[] => {
      const jornada = jornadaPorId.get(jornadaDe.get(c.id) || '');
      const inicio = [c.dataAdmissao, inicioControle || undefined].filter(Boolean).sort().pop();
      return montarEspelho(
        dias,
        batidas.filter((b) => b.colaboradorId === c.id),
        justificativas.filter((j) => j.colaboradorId === c.id),
        { jornada, inicioContagem: inicio || hojeLocal(), fimContagem: c.dataDemissao, raioPadraoM: raioPadrao }
      );
    },
    [batidas, justificativas, jornadaDe, jornadaPorId, inicioControle, raioPadrao]
  );

  const resumos: { c: Colaborador; resumo: ResumoFrequencia; jornada?: JornadaPonto }[] = useMemo(
    () => ativos.map((c) => ({ c, resumo: resumir(espelhoDe(c, diasDoMes(mes))), jornada: jornadaPorId.get(jornadaDe.get(c.id) || '') })),
    [ativos, espelhoDe, mes, jornadaDe, jornadaPorId]
  );

  // ---- Links do ponto ----
  const mensagemPonto = (c: Colaborador, token: string) =>
    `Olá, ${c.nomeCompleto.split(' ')[0]}! Este é o seu link pessoal da JMT — nele você bate o ponto e também recebe seus documentos, comunicados e treinamentos:\n${montarLinkUnico(token, 'ponto')}\n\n` +
    `No primeiro acesso, informe seu CPF e sua data de nascimento e deixe marcado "Lembrar neste celular". Depois é só abrir o link e tocar em "Bater ponto" (deixe a localização do celular ligada). Guarde este link — é o único que você vai precisar.\n\nJM Transportes — Departamento Pessoal`;

  const tokenDe = async (c: Colaborador) => {
    const mapa = new Map<string, string>(tokens);
    const token = await obterOuCriarTokenPortal(c.id, mapa);
    setTokens(mapa);
    return token;
  };

  const handleWhatsAppPonto = async (c: Colaborador) => {
    try {
      const link = buildWhatsAppLink(c.telefoneWhatsapp || '', mensagemPonto(c, await tokenDe(c)));
      if (!link) alert(`${c.nomeCompleto} não tem WhatsApp cadastrado. Use "Copiar link".`);
      else window.open(link, '_blank', 'noopener');
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o link do ponto.');
    }
  };

  const handleCopiarPonto = async (c: Colaborador) => {
    try {
      const link = montarLinkUnico(await tokenDe(c), 'ponto');
      await navigator.clipboard.writeText(link).catch(() => window.prompt('Copie o link:', link));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDesconectar = async (c: Colaborador) => {
    if (!window.confirm(`Desconectar os celulares de ${c.nomeCompleto}? O ponto e o portal vão pedir CPF e nascimento de novo nesses aparelhos (use se o celular foi perdido ou trocado).`)) return;
    try {
      await desconectarAparelhos(c.id);
      alert('Aparelhos desconectados.');
    } catch (err) {
      console.error(err);
      alert('Não foi possível desconectar.');
    }
  };

  const handleEnviarLinksTodos = async () => {
    setOcupado('links');
    try {
      const itens: ItemEnvioWhatsApp[] = [];
      for (const c of ativos.filter((x) => jornadaDe.has(x.id))) {
        itens.push({ id: c.id, nome: c.nomeCompleto, telefone: c.telefoneWhatsapp, mensagem: mensagemPonto(c, await tokenDe(c)) });
      }
      setEnvioMassa({ titulo: 'Enviar link pessoal (abre no ponto)', itens });
    } catch (err) {
      console.error(err);
      alert('Não foi possível preparar os links.');
    } finally {
      setOcupado(null);
    }
  };

  // ---- Espelho / assinatura ----
  const gerarPdfDe = (c: Colaborador) => {
    const espelho = espelhoDe(c, diasDoMes(mes));
    return gerarEspelhoPdf({
      colaborador: c,
      mes,
      jornada: jornadaPorId.get(jornadaDe.get(c.id) || ''),
      espelho,
      resumo: resumir(espelho),
    });
  };

  const enviarParaAssinatura = async (c: Colaborador) => {
    const { arquivo, camposAssinatura } = gerarPdfDe(c);
    return criarDocumentoAssinatura({
      categoria: 'ponto',
      colaboradorId: c.id,
      colaboradorNome: c.nomeCompleto,
      referencia: mes,
      tipo: 'Espelho de frequência',
      titulo: `Espelho de Frequência — ${nomeMes(mes)}`,
      arquivo,
      camposAssinatura,
      criadoPor: currentUser?.nome,
    });
  };

  const handleEnviarAssinaturaUm = async (c: Colaborador) => {
    if (!window.confirm(`Gerar o espelho de ${nomeMes(mes)} de ${c.nomeCompleto} e enviar para assinatura?`)) return;
    setOcupado(`ass-${c.id}`);
    try {
      const d = await enviarParaAssinatura(c);
      const link = buildWhatsAppLink(
        c.telefoneWhatsapp || '',
        `Olá, ${c.nomeCompleto.split(' ')[0]}! Seu ${d.titulo} está disponível. Confira e assine pelo seu link pessoal:\n${await linkUnicoDe(c.id, `documento:${d.id}`)}\n\nJM Transportes — Departamento Pessoal`
      );
      if (link) window.open(link, '_blank', 'noopener');
      else alert('Documento criado. A pessoa não tem WhatsApp — envie o link pela aba Assinaturas.');
    } catch (err) {
      console.error(err);
      alert('Não foi possível criar o documento.');
    } finally {
      setOcupado(null);
    }
  };

  const handleEnviarAssinaturaTodos = async () => {
    const lista = ativos.filter((c) => jornadaDe.has(c.id));
    if (!window.confirm(`Gerar o espelho de ${nomeMes(mes)} de ${lista.length} colaborador(es) e criar os documentos para assinatura? Depois envie os links pela aba Assinaturas → Enviar pendentes.`)) return;
    setOcupado('ass-todos');
    let falhas = 0;
    for (const c of lista) {
      try {
        await enviarParaAssinatura(c);
      } catch (err) {
        console.error(err);
        falhas += 1;
      }
    }
    setOcupado(null);
    alert(falhas ? `${lista.length - falhas} criados, ${falhas} com erro.` : `${lista.length} espelhos criados. Envie pela aba Assinaturas.`);
    setAba('assinaturas');
  };

  const exportar = async (chave: string, gerar: () => Promise<File>) => {
    setOcupado(chave);
    try {
      const arquivo = await gerar();
      baixarBlob(arquivo, arquivo.name);
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar o arquivo.');
    } finally {
      setOcupado(null);
    }
  };
  const linhasResumo = () => resumos.map(({ c, resumo, jornada }) => ({ colaborador: c, resumo, jornada }));

  const colaboradorSel = colaboradorPorId.get(colaboradorId);
  const espelhoSel: DiaEspelho[] = useMemo(
    () => (colaboradorSel ? espelhoDe(colaboradorSel, diasDoMes(mes)) : []),
    [colaboradorSel, espelhoDe, mes]
  );

  // ---- Hoje ----
  const hoje = hojeLocal();
  const linhasHoje = useMemo(
    () =>
      ativos.map((c) => {
        const jornada = jornadaPorId.get(jornadaDe.get(c.id) || '');
        const dia = espelhoDe(c, [hoje])[0];
        const atrasadoSemBatida =
          !!jornada && dia.previsto && dia.batidas.length === 0 && !dia.justificativa &&
          Date.now() > Date.parse(`${hoje}T${jornada.entrada}:00-03:00`) + jornada.toleranciaMin * 60000;
        return { c, jornada, dia, atrasadoSemBatida };
      }),
    [ativos, jornadaDe, jornadaPorId, espelhoDe, hoje]
  );
  const contagemHoje = {
    previstos: linhasHoje.filter((l) => l.dia.previsto).length,
    presentes: linhasHoje.filter((l) => l.dia.batidas.length > 0).length,
    ausentes: linhasHoje.filter((l) => l.atrasadoSemBatida).length,
    atrasos: linhasHoje.filter((l) => l.dia.situacao === 'Atraso' || (l.jornada && l.dia.atrasoMin > l.jornada.toleranciaMin)).length,
  };
  const semJornada = ativos.filter((c) => !jornadaDe.has(c.id));

  if (carregando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
      </div>
    );
  }

  const chipBatida = (b: BatidaPonto) => (
    <button
      key={b.id}
      type="button"
      onClick={() => setAnulando(b)}
      title={`${b.origem === 'ajuste' ? `Ajuste: ${b.motivo || ''} (${b.criadoPor || 'DP'})` : b.localNome ? `${b.localNome} — ${Math.round(b.distanciaM ?? 0)} m` : 'Sem localização'}\nClique para anular`}
      className={`px-1.5 py-0.5 rounded-md border text-[11px] font-bold tabular-nums ${
        b.origem === 'ajuste'
          ? 'border-sky-200 bg-sky-50 text-sky-700'
          : b.distanciaM !== undefined && b.distanciaM > raioPadrao
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : b.latitude === undefined
              ? 'border-amber-200 bg-amber-50 text-[#92611F]'
              : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      {horaLocal(b.registradoEm)}
      {b.origem === 'ajuste' && '*'}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Controle de Frequência</h1>
            <p className="text-xs text-slate-500 mt-0.5">Ponto pelo celular com localização, espelho mensal, justificativas e assinatura do colaborador.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <input type="month" value={mes} max={mesAtual()} onChange={(e) => e.target.value && setMes(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-semibold" />
          <button type="button" onClick={carregarMes} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50">
            <RefreshCw className={`w-3.5 h-3.5 ${carregandoMes ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 text-slate-400" />
        <span>
          <strong>Controle interno.</strong> Não substitui o registro oficial de ponto da empresa (CLT art. 74 e Portaria MTP 671/2021). O horário de cada batida é o do servidor; batidas não são apagadas — ajustes e anulações ficam registrados com motivo e autor.
        </span>
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {(
          [
            ['hoje', 'Hoje'],
            ['espelho', 'Espelho do colaborador'],
            ['resumo', 'Resumo do mês'],
            ['assinaturas', 'Assinaturas'],
            ['configurar', 'Jornadas, bases e links'],
          ] as [Aba, string][]
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setAba(id);
              if (id === 'hoje') setMes(mesAtual());
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px whitespace-nowrap ${aba === id ? 'border-[#C48229] text-[#92611F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {semJornada.length > 0 && aba !== 'assinaturas' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-[#92611F] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {semJornada.length} colaborador(es) sem jornada definida — sem jornada não dá para calcular atraso nem falta. Defina em <strong>Jornadas, bases e links</strong>.
          </span>
        </div>
      )}
      {locais.length === 0 && aba !== 'assinaturas' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-[#92611F] flex items-start gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          <span>Nenhuma base cadastrada — as batidas guardam a localização, mas sem base não dá para saber se foi feita longe dela.</span>
        </div>
      )}

      {aba === 'hoje' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { rotulo: 'Previstos hoje', valor: contagemHoje.previstos, classe: 'text-slate-900' },
              { rotulo: 'Já bateram', valor: contagemHoje.presentes, classe: 'text-emerald-700' },
              { rotulo: 'Atrasados/ausentes', valor: contagemHoje.ausentes, classe: 'text-rose-700' },
              { rotulo: 'Chegaram atrasados', valor: contagemHoje.atrasos, classe: 'text-[#92611F]' },
            ].map((t) => (
              <div key={t.rotulo} className="bg-white p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold">{t.rotulo}</p>
                <p className={`text-2xl font-black ${t.classe}`}>{t.valor}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3">Colaborador</th>
                  <th className="text-left p-3">Jornada hoje</th>
                  <th className="text-left p-3">Batidas</th>
                  <th className="text-left p-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhasHoje
                  .filter((l) => l.dia.previsto || l.dia.batidas.length > 0)
                  .sort((a, b) => Number(b.atrasadoSemBatida) - Number(a.atrasadoSemBatida))
                  .map(({ c, jornada, dia, atrasadoSemBatida }) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="p-3">
                        <button type="button" onClick={() => { setColaboradorId(c.id); setAba('espelho'); }} className="font-semibold text-slate-800 hover:text-[#92611F] text-left">
                          {c.nomeCompleto}
                        </button>
                        <p className="text-[10px] text-slate-400">{c.funcaoCargo}</p>
                      </td>
                      <td className="p-3 text-slate-600">{jornada && dia.previsto ? `${jornada.entrada}–${jornada.saida}` : 'Folga'}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">{dia.batidas.map(chipBatida)}</div>
                      </td>
                      <td className="p-3">
                        {atrasadoSemBatida ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">Não bateu</span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTILO_SITUACAO[dia.situacao]}`}>
                            {dia.situacao === 'Em andamento' && dia.atrasoMin > (jornada?.toleranciaMin ?? 15) ? `Atraso ${dia.atrasoMin} min` : dia.situacao}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === 'espelho' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold">
              <option value="">Escolha o colaborador...</option>
              {ativos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeCompleto}
                </option>
              ))}
            </select>
            {colaboradorSel && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const { arquivo } = gerarPdfDe(colaboradorSel);
                    baixarBlob(arquivo, arquivo.name);
                  }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5 text-[#92611F]" /> Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportar('xlsx-col', async () => {
                      const espelho = espelhoDe(colaboradorSel, diasDoMes(mes));
                      return gerarEspelhoXlsx({
                        colaborador: colaboradorSel,
                        mes,
                        jornada: jornadaPorId.get(jornadaDe.get(colaboradorSel.id) || ''),
                        espelho,
                        resumo: resumir(espelho),
                        todasBatidas: espelho.flatMap((d) => [...d.batidas, ...d.anuladas]),
                      });
                    })
                  }
                  disabled={!!ocupado}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50"
                >
                  {ocupado === 'xlsx-col' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sheet className="w-3.5 h-3.5 text-emerald-700" />} Baixar Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleEnviarAssinaturaUm(colaboradorSel)}
                  disabled={!!ocupado}
                  className="px-3 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {ocupado === `ass-${colaboradorSel.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSignature className="w-3.5 h-3.5" />}
                  Enviar para assinatura
                </button>
              </>
            )}
          </div>

          {colaboradorSel && (
            <>
              <ResumoCartoes resumo={resumir(espelhoSel)} />
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="text-left p-2.5">Dia</th>
                      <th className="text-left p-2.5">Batidas</th>
                      <th className="text-left p-2.5">Trabalhado</th>
                      <th className="text-left p-2.5">Saldo</th>
                      <th className="text-left p-2.5">Situação</th>
                      <th className="text-right p-2.5">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {espelhoSel.map((d) => (
                      <tr key={d.data} className={d.situacao === 'Folga' || d.situacao === 'Futuro' || d.situacao === 'Fora do período' ? 'text-slate-400' : ''}>
                        <td className="p-2.5 font-semibold whitespace-nowrap">
                          {d.data.slice(8, 10)} <span className="text-slate-400 font-normal">{NOMES_DIA[diaDaSemana(d.data)]}</span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap gap-1 items-center">
                            {d.batidas.map(chipBatida)}
                            {d.anuladas.map((b) => (
                              <span key={b.id} title={`Anulada: ${b.anuladoMotivo || ''} (${b.anuladoPor || 'DP'})`} className="px-1.5 py-0.5 rounded-md border border-slate-200 text-[11px] text-slate-300 line-through tabular-nums">
                                {horaLocal(b.registradoEm)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5 tabular-nums">{d.trabalhadoMin ? formatarMinutos(d.trabalhadoMin) : ''}</td>
                        <td className={`p-2.5 tabular-nums ${d.saldoMin < 0 ? 'text-rose-600' : d.saldoMin > 0 ? 'text-emerald-700' : ''}`}>{d.saldoMin ? formatarMinutos(d.saldoMin, true) : ''}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTILO_SITUACAO[d.situacao]}`}>
                            {d.situacao === 'Atraso' ? `Atraso ${d.atrasoMin} min` : d.situacao}
                          </span>
                          {d.justificativa && <span className="block text-[10px] text-slate-500 mt-0.5">{d.justificativa.tipo}{d.justificativa.observacao ? ` — ${d.justificativa.observacao}` : ''}</span>}
                          {d.foraDoLocal && <span className="block text-[10px] text-rose-600 mt-0.5">Batida longe da base</span>}
                        </td>
                        <td className="p-2.5">
                          {d.data <= hoje && (
                            <div className="flex justify-end gap-1">
                              <button type="button" onClick={() => setAcaoDia({ tipo: 'batida', data: d.data })} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Incluir batida (ajuste)">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => setAcaoDia({ tipo: 'justificar', data: d.data })} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Justificar o dia">
                                <CalendarCheck className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500">
                Clique numa batida para anular. <span className="text-sky-700 font-semibold">Azul*</span> = ajuste do DP ·{' '}
                <span className="text-rose-700 font-semibold">vermelho</span> = longe da base · <span className="text-[#92611F] font-semibold">amarelo</span> = sem localização.
              </p>
            </>
          )}
        </>
      )}

      {aba === 'resumo' && (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => exportar('pdf-resumo', async () => gerarResumoPdf(mes, linhasResumo()))}
              disabled={!!ocupado}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50"
            >
              {ocupado === 'pdf-resumo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#92611F]" />} Resumo em PDF
            </button>
            <button
              type="button"
              onClick={() => exportar('xlsx-resumo', () => gerarResumoXlsx(mes, linhasResumo()))}
              disabled={!!ocupado}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50"
            >
              {ocupado === 'xlsx-resumo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sheet className="w-3.5 h-3.5 text-emerald-700" />} Resumo em Excel
            </button>
            <button
              type="button"
              onClick={handleEnviarAssinaturaTodos}
              disabled={!!ocupado}
              className="px-3 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {ocupado === 'ass-todos' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSignature className="w-3.5 h-3.5" />}
              Gerar espelhos de {nomeMes(mes)} para assinatura
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3">Colaborador</th>
                  <th className="text-right p-3">Previstos</th>
                  <th className="text-right p-3">Com batida</th>
                  <th className="text-right p-3">Faltas</th>
                  <th className="text-right p-3">Atrasos</th>
                  <th className="text-right p-3">Incompletos</th>
                  <th className="text-right p-3">Trabalhado</th>
                  <th className="text-right p-3">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumos.map(({ c, resumo: r, jornada }) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <button type="button" onClick={() => { setColaboradorId(c.id); setAba('espelho'); }} className="font-semibold text-slate-800 hover:text-[#92611F] text-left">
                        {c.nomeCompleto}
                      </button>
                      <p className="text-[10px] text-slate-400">{jornada?.nome || 'Sem jornada'}</p>
                      {r.atrasos > LIMITE_ATRASOS_MES && (
                        <p className="text-[10px] font-bold text-rose-600">Mais de {LIMITE_ATRASOS_MES} atrasos no mês — prevê advertência (Regulamento, item 2)</p>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{r.diasPrevistos}</td>
                    <td className="p-3 text-right tabular-nums">{r.diasTrabalhados}</td>
                    <td className={`p-3 text-right tabular-nums ${r.faltas ? 'text-rose-600 font-bold' : ''}`}>{r.faltas}</td>
                    <td className={`p-3 text-right tabular-nums ${r.atrasos > LIMITE_ATRASOS_MES ? 'text-rose-600 font-bold' : r.atrasos ? 'text-[#92611F] font-bold' : ''}`}>{r.atrasos}</td>
                    <td className={`p-3 text-right tabular-nums ${r.incompletos ? 'text-orange-600 font-bold' : ''}`}>{r.incompletos}</td>
                    <td className="p-3 text-right tabular-nums">{formatarMinutos(r.trabalhadoMin)}</td>
                    <td className={`p-3 text-right tabular-nums ${r.saldoMin < 0 ? 'text-rose-600' : r.saldoMin > 0 ? 'text-emerald-700' : ''}`}>{formatarMinutos(r.saldoMin, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === 'assinaturas' && <DocumentosAssinaturaView categoria="ponto" colaboradores={colaboradores} currentUser={currentUser} compacto />}

      {aba === 'configurar' && (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">Jornadas</h2>
              <button type="button" onClick={() => setEditandoJornada('nova')} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Nova jornada
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {jornadas.map((j) => (
                <div key={j.id} className="border border-slate-200 rounded-xl p-3 text-xs flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-800">{j.nome}</p>
                    <p className="text-slate-500">
                      {j.entrada}
                      {j.saidaIntervalo ? `–${j.saidaIntervalo} / ${j.voltaIntervalo}` : ''}–{j.saida} · {j.diasSemana.map((d) => NOMES_DIA[d]).join(', ')} · tolerância {j.toleranciaMin} min
                    </p>
                    <p className="text-slate-400">{Array.from(jornadaDe.values()).filter((v) => v === j.id).length} colaborador(es)</p>
                  </div>
                  <button type="button" onClick={() => setEditandoJornada(j)} className="p-1.5 text-slate-400 hover:text-slate-700">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">Bases (localização de referência)</h2>
              <button type="button" onClick={() => setEditandoLocal('novo')} className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Nova base
              </button>
            </div>
            {locais.length === 0 ? (
              <p className="text-xs text-slate-500">Cadastre a base (galpão). Dica: abra esta tela no celular estando na base e use "Usar minha localização atual".</p>
            ) : (
              locais.map((l) => (
                <div key={l.id} className="border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between gap-2">
                  <span>
                    <strong>{l.nome}</strong> · raio {l.raioM} m ·{' '}
                    <a href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[#92611F] font-semibold">
                      ver no mapa
                    </a>
                  </span>
                  <button type="button" onClick={() => setEditandoLocal(l)} className="p-1.5 text-slate-400 hover:text-slate-700">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900">Colaboradores: jornada e link pessoal</h2>
                <p className="text-[11px] text-slate-500">O link é o mesmo do Portal de Educação. Gerar link novo lá também desconecta os celulares.</p>
              </div>
              <button
                type="button"
                onClick={handleEnviarLinksTodos}
                disabled={!!ocupado}
                className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {ocupado === 'links' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                Enviar link pessoal (quem tem jornada)
              </button>
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {ativos.map((c) => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.nomeCompleto}</p>
                    <p className="text-[10px] text-slate-400">
                      {c.funcaoCargo}
                      {!c.dataNascimento && <span className="text-rose-600 font-semibold"> · sem data de nascimento (não consegue entrar)</span>}
                    </p>
                  </div>
                  <select
                    value={jornadaDe.get(c.id) || ''}
                    onChange={async (e) => {
                      const valor = e.target.value || null;
                      try {
                        await definirJornadaColaboradores([c.id], valor);
                        setJornadaDe((prev) => {
                          const novo = new Map(prev);
                          if (valor) novo.set(c.id, valor);
                          else novo.delete(c.id);
                          return novo;
                        });
                      } catch (err) {
                        console.error(err);
                        alert('Não foi possível salvar a jornada.');
                      }
                    }}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white text-xs sm:w-72"
                  >
                    <option value="">Sem jornada</option>
                    {jornadas.filter((j) => j.ativo || j.id === jornadaDe.get(c.id)).map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nome}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => handleWhatsAppPonto(c)} className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg" title="Enviar o link pessoal (abre no ponto) pelo WhatsApp">
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleCopiarPonto(c)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Copiar o link pessoal">
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDesconectar(c)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg" title="Desconectar celulares">
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {acaoDia && colaboradorSel && (
        <AcaoDiaModal
          tipo={acaoDia.tipo}
          data={acaoDia.data}
          colaborador={colaboradorSel}
          justificativaAtual={espelhoSel.find((d) => d.data === acaoDia.data)?.justificativa}
          onClose={() => setAcaoDia(null)}
          onBatida={async (hora, motivo) => {
            // Batida de madrugada numa jornada noturna pertence ao dia seguinte no relógio.
            const jornada = jornadaPorId.get(jornadaDe.get(colaboradorSel.id) || '');
            let data = acaoDia.data;
            if (jornada && jornada.saida < jornada.entrada && hora < jornada.entrada) {
              const d = new Date(`${data}T12:00:00Z`);
              d.setUTCDate(d.getUTCDate() + 1);
              data = d.toISOString().slice(0, 10);
            }
            const nova = await incluirBatidaAjuste(colaboradorSel.id, `${data}T${hora}`, motivo, currentUser?.nome);
            if (diaDeTrabalho(nova.registradoEm, jornada) !== acaoDia.data) {
              alert('Atenção: pela jornada, esse horário foi contado em outro dia.');
            }
            setBatidas((prev) => [...prev, nova]);
          }}
          onJustificar={async (tipo, abona, observacao) => {
            const j = await salvarJustificativa({ colaboradorId: colaboradorSel.id, data: acaoDia.data, tipo, abona, observacao, criadoPor: currentUser?.nome });
            setJustificativas((prev) => [...prev.filter((x) => !(x.colaboradorId === j.colaboradorId && x.data === j.data)), j]);
          }}
          onRemoverJustificativa={async () => {
            await excluirJustificativa(colaboradorSel.id, acaoDia.data);
            setJustificativas((prev) => prev.filter((x) => !(x.colaboradorId === colaboradorSel.id && x.data === acaoDia.data)));
          }}
        />
      )}

      {anulando && (
        <AnularModal
          batida={anulando}
          nome={colaboradorPorId.get(anulando.colaboradorId)?.nomeCompleto || ''}
          onClose={() => setAnulando(null)}
          onAnular={async (motivo) => {
            await anularBatida(anulando.id, motivo, currentUser?.nome);
            setBatidas((prev) => prev.map((b) => (b.id === anulando.id ? { ...b, anulado: true, anuladoMotivo: motivo, anuladoPor: currentUser?.nome } : b)));
          }}
        />
      )}

      {editandoJornada && (
        <JornadaModal
          jornada={editandoJornada === 'nova' ? null : editandoJornada}
          emUso={editandoJornada !== 'nova' && Array.from(jornadaDe.values()).includes(editandoJornada.id)}
          onClose={() => setEditandoJornada(null)}
          onSalvar={async (j) => {
            const salva = await saveJornada(j);
            setJornadas((prev) => [...prev.filter((x) => x.id !== salva.id), salva].sort((a, b) => a.nome.localeCompare(b.nome)));
          }}
          onExcluir={async (id) => {
            await deleteJornada(id);
            setJornadas((prev) => prev.filter((x) => x.id !== id));
          }}
        />
      )}

      {editandoLocal && (
        <LocalModal
          local={editandoLocal === 'novo' ? null : editandoLocal}
          onClose={() => setEditandoLocal(null)}
          onSalvar={async (l) => {
            const salvo = await saveLocal(l);
            setLocais((prev) => [...prev.filter((x) => x.id !== salvo.id), salvo]);
          }}
          onExcluir={async (id) => {
            await deleteLocal(id);
            setLocais((prev) => prev.filter((x) => x.id !== id));
          }}
        />
      )}

      {envioMassa && <EnvioWhatsAppEmMassaModal titulo={envioMassa.titulo} itens={envioMassa.itens} onClose={() => setEnvioMassa(null)} />}
    </div>
  );
};

const ResumoCartoes: React.FC<{ resumo: ResumoFrequencia }> = ({ resumo: r }) => (
  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
    {[
      { rotulo: 'Previstos', valor: String(r.diasPrevistos) },
      { rotulo: 'Faltas', valor: String(r.faltas), alerta: r.faltas > 0 },
      { rotulo: 'Atrasos', valor: String(r.atrasos), alerta: r.atrasos > LIMITE_ATRASOS_MES },
      { rotulo: 'Incompletos', valor: String(r.incompletos), alerta: r.incompletos > 0 },
      { rotulo: 'Trabalhado', valor: formatarMinutos(r.trabalhadoMin) },
      { rotulo: 'Saldo', valor: formatarMinutos(r.saldoMin, true), alerta: r.saldoMin < 0 },
    ].map((t) => (
      <div key={t.rotulo} className="bg-white p-3 rounded-xl border border-slate-200">
        <p className="text-[10px] text-slate-500 font-semibold">{t.rotulo}</p>
        <p className={`text-lg font-black tabular-nums ${t.alerta ? 'text-rose-600' : 'text-slate-900'}`}>{t.valor}</p>
      </div>
    ))}
  </div>
);

const Moldura: React.FC<{ titulo: string; subtitulo?: string; onClose: () => void; children: React.ReactNode; rodape: React.ReactNode }> = ({ titulo, subtitulo, onClose, children, rodape }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col text-xs">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-black text-slate-900">{titulo}</h2>
          {subtitulo && <p className="text-slate-500 mt-0.5">{subtitulo}</p>}
        </div>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto">{children}</div>
      <div className="p-4 border-t border-slate-200 flex justify-end gap-2">{rodape}</div>
    </div>
  </div>
);

const campo = 'w-full p-2 border border-slate-300 rounded-lg text-xs';
const botaoPrimario = 'px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50';
const botaoSecundario = 'px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl';

function useAcao() {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const executar = async (fn: () => Promise<void>, depois: () => void) => {
    setSalvando(true);
    setErro(null);
    try {
      await fn();
      depois();
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };
  return { salvando, erro, executar };
}

const AcaoDiaModal: React.FC<{
  tipo: 'batida' | 'justificar';
  data: string;
  colaborador: Colaborador;
  justificativaAtual?: JustificativaDia;
  onClose: () => void;
  onBatida: (hora: string, motivo: string) => Promise<void>;
  onJustificar: (tipo: string, abona: boolean, observacao: string) => Promise<void>;
  onRemoverJustificativa: () => Promise<void>;
}> = ({ tipo, data, colaborador, justificativaAtual, onClose, onBatida, onJustificar, onRemoverJustificativa }) => {
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipoJust, setTipoJust] = useState(justificativaAtual?.tipo || TIPOS_JUSTIFICATIVA[0].tipo);
  const [obs, setObs] = useState(justificativaAtual?.observacao || '');
  const { salvando, erro, executar } = useAcao();
  const abona = TIPOS_JUSTIFICATIVA.find((t) => t.tipo === tipoJust)?.abona ?? true;

  if (tipo === 'batida') {
    return (
      <Moldura
        titulo="Incluir batida (ajuste)"
        subtitulo={`${colaborador.nomeCompleto} — ${dataBr(data)}`}
        onClose={onClose}
        rodape={
          <>
            <button type="button" onClick={onClose} className={botaoSecundario}>Cancelar</button>
            <button type="button" disabled={salvando || !hora || motivo.trim().length < 5} onClick={() => executar(() => onBatida(hora, motivo.trim()), onClose)} className={botaoPrimario}>
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Incluir
            </button>
          </>
        }
      >
        <div>
          <label className="font-bold text-slate-600 block mb-1">Horário</label>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={campo} />
        </div>
        <div>
          <label className="font-bold text-slate-600 block mb-1">Motivo (fica registrado)</label>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} className={campo} placeholder="Ex.: esqueceu de bater na volta do almoço — confirmado pelo supervisor" />
        </div>
        <p className="text-slate-500">A batida entra marcada como ajuste do DP (com seu nome), nunca como batida do celular.</p>
        {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
      </Moldura>
    );
  }

  return (
    <Moldura
      titulo="Justificar o dia"
      subtitulo={`${colaborador.nomeCompleto} — ${dataBr(data)}`}
      onClose={onClose}
      rodape={
        <>
          {justificativaAtual && (
            <button type="button" disabled={salvando} onClick={() => executar(onRemoverJustificativa, onClose)} className="px-4 py-2 font-semibold text-rose-600 hover:bg-rose-50 rounded-xl mr-auto">
              Remover
            </button>
          )}
          <button type="button" onClick={onClose} className={botaoSecundario}>Cancelar</button>
          <button type="button" disabled={salvando} onClick={() => executar(() => onJustificar(tipoJust, abona, obs.trim()), onClose)} className={botaoPrimario}>
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
          </button>
        </>
      }
    >
      <div>
        <label className="font-bold text-slate-600 block mb-1">Tipo</label>
        <select value={tipoJust} onChange={(e) => setTipoJust(e.target.value)} className={campo}>
          {TIPOS_JUSTIFICATIVA.map((t) => (
            <option key={t.tipo} value={t.tipo}>
              {t.tipo} {t.abona ? '(abona)' : '(conta como falta)'}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="font-bold text-slate-600 block mb-1">Observação</label>
        <input value={obs} onChange={(e) => setObs(e.target.value)} className={campo} placeholder="Ex.: atestado de 1 dia, CID não informado" />
      </div>
      {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
    </Moldura>
  );
};

const AnularModal: React.FC<{ batida: BatidaPonto; nome: string; onClose: () => void; onAnular: (motivo: string) => Promise<void> }> = ({ batida, nome, onClose, onAnular }) => {
  const [motivo, setMotivo] = useState('');
  const { salvando, erro, executar } = useAcao();
  return (
    <Moldura
      titulo="Anular batida"
      subtitulo={`${nome} — ${dataBr(dataLocal(batida.registradoEm))} às ${horaLocal(batida.registradoEm)}`}
      onClose={onClose}
      rodape={
        <>
          <button type="button" onClick={onClose} className={botaoSecundario}>Cancelar</button>
          <button type="button" disabled={salvando || motivo.trim().length < 5} onClick={() => executar(() => onAnular(motivo.trim()), onClose)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Anular
          </button>
        </>
      }
    >
      <div className="p-3 bg-slate-50 rounded-xl text-slate-600 space-y-0.5">
        <p>Origem: {batida.origem === 'ajuste' ? `ajuste do DP (${batida.criadoPor || '—'}): ${batida.motivo || ''}` : 'celular'}</p>
        {batida.latitude !== undefined && (
          <p>
            Local: {batida.localNome || '—'} {batida.distanciaM !== undefined && `(${Math.round(batida.distanciaM)} m)`} ·{' '}
            <a href={`https://www.google.com/maps?q=${batida.latitude},${batida.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[#92611F] font-semibold">
              ver no mapa
            </a>
          </p>
        )}
      </div>
      {batida.anulado ? (
        <p className="text-slate-500">Já anulada: {batida.anuladoMotivo}</p>
      ) : (
        <div>
          <label className="font-bold text-slate-600 block mb-1">Motivo (fica registrado; a batida continua no histórico, riscada)</label>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} className={campo} placeholder="Ex.: batida duplicada" />
        </div>
      )}
      {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
    </Moldura>
  );
};

const JornadaModal: React.FC<{
  jornada: JornadaPonto | null;
  emUso: boolean;
  onClose: () => void;
  onSalvar: (j: JornadaPonto) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
}> = ({ jornada, emUso, onClose, onSalvar, onExcluir }) => {
  const [j, setJ] = useState<JornadaPonto>(
    jornada ?? { id: '', nome: '', diasSemana: [1, 2, 3, 4, 5], entrada: '08:00', saidaIntervalo: '12:00', voltaIntervalo: '13:12', saida: '18:00', toleranciaMin: 15, ativo: true }
  );
  const { salvando, erro, executar } = useAcao();
  const atualizar = (p: Partial<JornadaPonto>) => setJ((prev) => ({ ...prev, ...p }));
  return (
    <Moldura
      titulo={jornada ? 'Editar jornada' : 'Nova jornada'}
      onClose={onClose}
      rodape={
        <>
          {jornada && !emUso && (
            <button type="button" disabled={salvando} onClick={() => window.confirm('Excluir esta jornada?') && executar(() => onExcluir(jornada.id), onClose)} className="px-4 py-2 font-semibold text-rose-600 hover:bg-rose-50 rounded-xl mr-auto flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          )}
          <button type="button" onClick={onClose} className={botaoSecundario}>Cancelar</button>
          <button type="button" disabled={salvando || !j.nome.trim() || j.diasSemana.length === 0} onClick={() => executar(() => onSalvar({ ...j, nome: j.nome.trim() }), onClose)} className={botaoPrimario}>
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
          </button>
        </>
      }
    >
      <div>
        <label className="font-bold text-slate-600 block mb-1">Nome</label>
        <input value={j.nome} onChange={(e) => atualizar({ nome: e.target.value })} className={campo} />
      </div>
      <div>
        <span className="font-bold text-slate-600 block mb-1">Dias</span>
        <div className="flex gap-1">
          {NOMES_DIA.map((n, i) => (
            <button
              key={n}
              type="button"
              onClick={() => atualizar({ diasSemana: j.diasSemana.includes(i) ? j.diasSemana.filter((d) => d !== i) : [...j.diasSemana, i].sort() })}
              className={`flex-1 py-1.5 rounded-lg border font-bold ${j.diasSemana.includes(i) ? 'bg-[#C48229] text-white border-[#C48229]' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            ['entrada', 'Entrada'],
            ['saidaIntervalo', 'Saída int.'],
            ['voltaIntervalo', 'Volta int.'],
            ['saida', 'Saída'],
          ] as [keyof JornadaPonto, string][]
        ).map(([chave, rotulo]) => (
          <div key={chave}>
            <label className="font-bold text-slate-600 block mb-1">{rotulo}</label>
            <input type="time" value={(j[chave] as string) || ''} onChange={(e) => atualizar({ [chave]: e.target.value || undefined } as Partial<JornadaPonto>)} className={campo} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 items-end">
        <div>
          <label className="font-bold text-slate-600 block mb-1">Tolerância (min)</label>
          <input type="number" min={0} max={60} value={j.toleranciaMin} onChange={(e) => atualizar({ toleranciaMin: Math.max(0, Number(e.target.value) || 0) })} className={campo} />
        </div>
        <label className="flex items-center gap-2 font-semibold text-slate-700 pb-2">
          <input type="checkbox" checked={j.ativo} onChange={(e) => atualizar({ ativo: e.target.checked })} className="w-4 h-4 accent-[#C48229]" /> Ativa
        </label>
      </div>
      <p className="text-slate-500">Saída antes da entrada = jornada que vira a noite (a saída da madrugada conta no dia em que entrou). A tolerância do Regulamento Interno é de 15 minutos.</p>
      {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
    </Moldura>
  );
};

/** Coordenadas a partir de um link do Google Maps (ou de "lat, lng" colado direto).
 *  Formatos: ...!3d-5.91!4d-35.26 (pino do lugar — o mais preciso), .../@-5.91,-35.26,17z,
 *  ?q=-5.91,-35.26, ?ll=..., &query=..., e o texto "-5.91, -35.26". Link curto
 *  (maps.app.goo.gl) não traz as coordenadas — devolve 'curto'. */
export function coordenadasDoLink(texto: string): { latitude: number; longitude: number } | 'curto' | null {
  const t = decodeURIComponent(texto.trim());
  if (/goo\.gl\/|maps\.app\.goo/i.test(t)) return 'curto';
  const num = '(-?\\d{1,3}\\.\\d+)';
  const padroes = [
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`@${num},${num}`),
    new RegExp(`[?&](?:q|ll|query|center|destination)=${num},\\s*${num}`),
    new RegExp(`^${num}\\s*,\\s*${num}$`),
  ];
  for (const p of padroes) {
    const m = t.match(p);
    if (m) {
      const latitude = Number(m[1]);
      const longitude = Number(m[2]);
      if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) return { latitude, longitude };
    }
  }
  return null;
}

const LocalModal: React.FC<{ local: LocalPonto | null; onClose: () => void; onSalvar: (l: LocalPonto) => Promise<void>; onExcluir: (id: string) => Promise<void> }> = ({ local, onClose, onSalvar, onExcluir }) => {
  const [l, setL] = useState<LocalPonto>(local ?? { id: '', nome: 'Base Parnamirim', latitude: 0, longitude: 0, raioM: 300, ativo: true });
  const [localizando, setLocalizando] = useState(false);
  const [link, setLink] = useState('');
  const [avisoLink, setAvisoLink] = useState<{ ok: boolean; texto: string } | null>(null);
  const lerLink = (valor: string) => {
    setLink(valor);
    if (!valor.trim()) {
      setAvisoLink(null);
      return;
    }
    const r = coordenadasDoLink(valor);
    if (r === 'curto') {
      setAvisoLink({
        ok: false,
        texto: 'Esse é um link curto (maps.app.goo.gl), que não traz a localização. Abra o link no navegador, espere o mapa carregar e copie o endereço completo da barra do navegador.',
      });
    } else if (!r) {
      setAvisoLink({ ok: false, texto: 'Não encontrei a localização nesse link. Use o link completo do Google Maps (da barra de endereço) ou cole as coordenadas no formato -5.91, -35.26.' });
    } else {
      setL((prev) => ({ ...prev, latitude: r.latitude, longitude: r.longitude }));
      setAvisoLink({ ok: true, texto: `Localização encontrada: ${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)}. Confira em "ver no mapa" depois de salvar.` });
    }
  };
  const { salvando, erro, executar } = useAcao();
  const valido = l.nome.trim() && Math.abs(l.latitude) > 0.0001 && Math.abs(l.longitude) > 0.0001;
  return (
    <Moldura
      titulo={local ? 'Editar base' : 'Nova base'}
      onClose={onClose}
      rodape={
        <>
          {local && (
            <button type="button" disabled={salvando} onClick={() => window.confirm('Excluir esta base?') && executar(() => onExcluir(local.id), onClose)} className="px-4 py-2 font-semibold text-rose-600 hover:bg-rose-50 rounded-xl mr-auto">
              Excluir
            </button>
          )}
          <button type="button" onClick={onClose} className={botaoSecundario}>Cancelar</button>
          <button type="button" disabled={salvando || !valido} onClick={() => executar(() => onSalvar({ ...l, nome: l.nome.trim() }), onClose)} className={botaoPrimario}>
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
          </button>
        </>
      }
    >
      <div>
        <label className="font-bold text-slate-600 block mb-1">Nome</label>
        <input value={l.nome} onChange={(e) => setL({ ...l, nome: e.target.value })} className={campo} />
      </div>
      <div>
        <label className="font-bold text-slate-600 block mb-1">Link do Google Maps</label>
        <input
          type="url"
          data-no-uppercase="true"
          value={link}
          onChange={(e) => lerLink(e.target.value)}
          className={campo}
          placeholder="Cole aqui o link do galpão no Google Maps"
        />
        {avisoLink && <p className={`mt-1 ${avisoLink.ok ? 'text-emerald-700' : 'text-[#92611F]'}`}>{avisoLink.texto}</p>}
      </div>
      <p className="text-center text-slate-400">ou</p>
      <button
        type="button"
        disabled={localizando}
        onClick={() => {
          setLocalizando(true);
          navigator.geolocation?.getCurrentPosition(
            (p) => {
              setL((prev) => ({ ...prev, latitude: p.coords.latitude, longitude: p.coords.longitude }));
              setLocalizando(false);
            },
            () => {
              alert('Não foi possível pegar a localização. Permita o acesso à localização ou digite as coordenadas.');
              setLocalizando(false);
            },
            { enableHighAccuracy: true, timeout: 15000 }
          );
        }}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1.5"
      >
        {localizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5 text-[#92611F]" />} Usar minha localização atual
      </button>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="font-bold text-slate-600 block mb-1">Latitude</label>
          <input type="number" step="0.000001" value={l.latitude || ''} onChange={(e) => setL({ ...l, latitude: Number(e.target.value) })} className={campo} />
        </div>
        <div>
          <label className="font-bold text-slate-600 block mb-1">Longitude</label>
          <input type="number" step="0.000001" value={l.longitude || ''} onChange={(e) => setL({ ...l, longitude: Number(e.target.value) })} className={campo} />
        </div>
        <div>
          <label className="font-bold text-slate-600 block mb-1">Raio (m)</label>
          <input type="number" min={50} value={l.raioM} onChange={(e) => setL({ ...l, raioM: Math.max(50, Number(e.target.value) || 300) })} className={campo} />
        </div>
      </div>
      <p className="text-slate-500">Dica: no Google Maps, segure o dedo sobre o galpão para ver as coordenadas. Batidas fora do raio aparecem em vermelho (motoristas em rota podem bater longe — confira caso a caso).</p>
      {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
    </Moldura>
  );
};
