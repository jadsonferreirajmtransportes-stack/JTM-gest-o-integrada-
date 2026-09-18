import React, { useMemo, useState } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Save,
  X,
  Users as UsersIcon,
  Wallet,
  RefreshCw,
  AlertTriangle,
  MessageCircle,
  Mail,
  Copy,
  Printer,
  Search,
} from 'lucide-react';
import {
  Colaborador,
  Ocorrencia,
  ProgramacaoFerias,
  QuinzenaValeAlimentacao,
  LancamentoValeAlimentacao,
} from '../../types';
import {
  formatDate,
  formatMoney,
  calcDiasUteisPeriodo,
  calcQuantidadeDiariasVA,
  calcValorDisponibilizadoVA,
  calcFaltasEmPeriodo,
  calcDiasFeriasEmPeriodo,
} from '../../utils/formatters';
import { buildWhatsAppLink, buildMailtoLink } from '../../utils/birthdayUtils';
import {
  buildMensagemLiberacaoVA,
  buildAssuntoEmailVA,
  buildCorpoEmailVA,
} from '../../utils/valeAlimentacaoUtils';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

interface ValeAlimentacaoViewProps {
  colaboradores: Colaborador[];
  ocorrencias: Ocorrencia[];
  feriasList: ProgramacaoFerias[];
  quinzenas: QuinzenaValeAlimentacao[];
  lancamentos: LancamentoValeAlimentacao[];
  onSaveQuinzena: (quinzena: QuinzenaValeAlimentacao) => void;
  onDeleteQuinzena: (id: string) => void;
  onGerarLancamentos: (quinzenaId: string) => void;
  onSincronizarFaltas: (quinzenaId: string) => void;
  onSaveLancamento: (lancamento: LancamentoValeAlimentacao) => void;
  onDeleteLancamento: (id: string) => void;
}

const inputCls =
  'border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden';

export const ValeAlimentacaoView: React.FC<ValeAlimentacaoViewProps> = ({
  colaboradores,
  ocorrencias,
  feriasList,
  quinzenas,
  lancamentos,
  onSaveQuinzena,
  onDeleteQuinzena,
  onGerarLancamentos,
  onSincronizarFaltas,
  onSaveLancamento,
  onDeleteLancamento,
}) => {
  const quinzenasOrdenadas = useMemo(
    () => [...quinzenas].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)),
    [quinzenas]
  );

  const hoje = new Date().toISOString().slice(0, 10);
  const quinzenaVigente = useMemo(
    () => quinzenasOrdenadas.find((q) => q.dataInicio <= hoje && hoje <= q.dataTermino),
    [quinzenasOrdenadas, hoje]
  );

  const [quinzenaSelecionadaId, setQuinzenaSelecionadaId] = useState<string>('');
  const quinzenaAtual =
    quinzenasOrdenadas.find((q) => q.id === quinzenaSelecionadaId) ||
    quinzenaVigente ||
    quinzenasOrdenadas[quinzenasOrdenadas.length - 1];

  const [isNovaQuinzenaOpen, setIsNovaQuinzenaOpen] = useState(false);
  const [novaIdentificacao, setNovaIdentificacao] = useState('');
  const [novaDataInicio, setNovaDataInicio] = useState('');
  const [novaDataTermino, setNovaDataTermino] = useState('');
  const [buscaColaborador, setBuscaColaborador] = useState('');

  const ativos = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo'), [colaboradores]);
  const colaboradoresPorId = useMemo(() => {
    const mapa = new Map<string, Colaborador>();
    colaboradores.forEach((c) => mapa.set(c.id, c));
    return mapa;
  }, [colaboradores]);

  const lancamentosDaQuinzena = useMemo(
    () =>
      quinzenaAtual
        ? lancamentos.filter((l) => l.quinzenaId === quinzenaAtual.id)
        : [],
    [lancamentos, quinzenaAtual]
  );

  // Busca por colaborador na tabela — mesmo padrão de "separe vários com vírgula" já usado na
  // busca de "Sem Fatura Vinculada" (FaturamentoAereoView.tsx): qualquer termo bate, comparação
  // sem distinguir maiúsculas/minúsculas.
  const lancamentosFiltrados = useMemo(() => {
    const termos = buscaColaborador
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (termos.length === 0) return lancamentosDaQuinzena;
    return lancamentosDaQuinzena.filter((l) => {
      const nome = (l.colaboradorNome || '').toLowerCase();
      return termos.some((termo) => nome.includes(termo));
    });
  }, [lancamentosDaQuinzena, buscaColaborador]);

  const colaboradoresSemLancamento = useMemo(() => {
    if (!quinzenaAtual) return [];
    const jaLancados = new Set(lancamentosDaQuinzena.map((l) => l.colaboradorId));
    return ativos.filter((c) => !jaLancados.has(c.id));
  }, [ativos, lancamentosDaQuinzena, quinzenaAtual]);

  const totalDisponibilizado = lancamentosDaQuinzena.reduce(
    (sum, l) => sum + (l.valorDisponibilizado || 0),
    0
  );
  const totalDiarias = lancamentosDaQuinzena.reduce((sum, l) => sum + (l.quantidadeDiarias || 0), 0);

  const handleSalvarNovaQuinzena = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaIdentificacao.trim() || !novaDataInicio || !novaDataTermino) return;
    if (novaDataTermino < novaDataInicio) {
      alert('A data de término não pode ser antes da data de início.');
      return;
    }
    const id = `quinz-va-${Date.now()}`;
    onSaveQuinzena({
      id,
      identificacao: novaIdentificacao.trim(),
      dataInicio: novaDataInicio,
      dataTermino: novaDataTermino,
    });
    setQuinzenaSelecionadaId(id);
    setNovaIdentificacao('');
    setNovaDataInicio('');
    setNovaDataTermino('');
    setIsNovaQuinzenaOpen(false);
  };

  const handleFaltasChange = (l: LancamentoValeAlimentacao, faltas: number) => {
    const quantidadeDiarias =
      calcQuantidadeDiariasVA(l.dataInicio, l.dataTermino, faltas, l.diasFerias || 0) + (l.diariasExtras || 0);
    const valorDisponibilizado = calcValorDisponibilizadoVA(quantidadeDiarias, l.valorDiaria);
    onSaveLancamento({
      ...l,
      faltas,
      quantidadeDiarias,
      valorDisponibilizado,
      atualizadoEm: new Date().toISOString(),
    });
  };

  const handleDiasFeriasChange = (l: LancamentoValeAlimentacao, diasFerias: number) => {
    const quantidadeDiarias =
      calcQuantidadeDiariasVA(l.dataInicio, l.dataTermino, l.faltas, diasFerias) + (l.diariasExtras || 0);
    const valorDisponibilizado = calcValorDisponibilizadoVA(quantidadeDiarias, l.valorDiaria);
    onSaveLancamento({
      ...l,
      diasFerias,
      quantidadeDiarias,
      valorDisponibilizado,
      atualizadoEm: new Date().toISOString(),
    });
  };

  const handleDiariasExtrasChange = (l: LancamentoValeAlimentacao, diariasExtras: number) => {
    const quantidadeDiarias =
      calcQuantidadeDiariasVA(l.dataInicio, l.dataTermino, l.faltas, l.diasFerias || 0) + diariasExtras;
    const valorDisponibilizado = calcValorDisponibilizadoVA(quantidadeDiarias, l.valorDiaria);
    onSaveLancamento({
      ...l,
      diariasExtras,
      quantidadeDiarias,
      valorDisponibilizado,
      atualizadoEm: new Date().toISOString(),
    });
  };

  const handleObservacoesChange = (l: LancamentoValeAlimentacao, observacoes: string) => {
    onSaveLancamento({ ...l, observacoes, atualizadoEm: new Date().toISOString() });
  };

  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Abre o WhatsApp/e-mail com a mensagem já preenchida — quem efetivamente envia é o usuário,
  // clicando em "Enviar" na própria janela do WhatsApp/cliente de e-mail (mesmo padrão já usado
  // em Aniversariantes).
  const handleEnviarWhatsApp = (l: LancamentoValeAlimentacao, colaborador?: Colaborador) => {
    if (!colaborador?.telefoneWhatsapp) return;
    const url = buildWhatsAppLink(colaborador.telefoneWhatsapp, buildMensagemLiberacaoVA(l));
    if (url) window.open(url, '_blank');
  };

  const handleEnviarEmail = (l: LancamentoValeAlimentacao, colaborador?: Colaborador) => {
    if (!colaborador?.email) return;
    const url = buildMailtoLink(colaborador.email, buildAssuntoEmailVA(l), buildCorpoEmailVA(l));
    // mailto: precisa ir por window.location.href (não window.open) — é assim que o resto do
    // app já abre o cliente de e-mail (ver BirthdayCelebrationModal) sem navegar a SPA para fora.
    if (url) window.location.href = url;
  };

  const handleCopiarMensagem = async (l: LancamentoValeAlimentacao) => {
    try {
      await navigator.clipboard.writeText(buildMensagemLiberacaoVA(l));
      setCopiadoId(l.id);
      setTimeout(() => setCopiadoId((atual) => (atual === l.id ? null : atual)), 2000);
    } catch {
      // Clipboard indisponível (ex: contexto sem permissão) — sem tratamento adicional, os
      // botões de WhatsApp/E-mail continuam funcionando normalmente.
    }
  };

  const handleImprimirRelatorio = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-600" />
            Programação do Vale Alimentação
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Réplica do painel do Coda: quinzenas fixas do ano e um lançamento por colaborador,
            calculado a partir dos dias úteis do período menos as faltas e os dias de férias.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNovaQuinzenaOpen(true)}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Quinzena
        </button>
      </div>

      {/* Seletor de quinzena */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <select
          value={quinzenaAtual?.id || ''}
          onChange={(e) => setQuinzenaSelecionadaId(e.target.value)}
          className={inputCls + ' min-w-[240px]'}
        >
          {quinzenasOrdenadas.length === 0 && <option value="">Nenhuma quinzena cadastrada</option>}
          {quinzenasOrdenadas.map((q) => (
            <option key={q.id} value={q.id}>
              {q.identificacao} ({formatDate(q.dataInicio)} a {formatDate(q.dataTermino)})
            </option>
          ))}
        </select>

        {quinzenaAtual && (
          <>
            <span className="text-[11px] text-slate-500">
              {calcDiasUteisPeriodo(quinzenaAtual.dataInicio, quinzenaAtual.dataTermino)} dias úteis no período
            </span>
            {quinzenaVigente?.id === quinzenaAtual.id && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                Quinzena vigente
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onGerarLancamentos(quinzenaAtual.id)}
                disabled={colaboradoresSemLancamento.length === 0}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                title={
                  colaboradoresSemLancamento.length === 0
                    ? 'Todos os colaboradores ativos já têm lançamento nesta quinzena'
                    : `Gera lançamento para ${colaboradoresSemLancamento.length} colaborador(es) que ainda não têm nesta quinzena`
                }
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar Lançamentos ({colaboradoresSemLancamento.length} pendente
                {colaboradoresSemLancamento.length === 1 ? '' : 's'})
              </button>
              <button
                type="button"
                onClick={() => onSincronizarFaltas(quinzenaAtual.id)}
                disabled={lancamentosDaQuinzena.length === 0}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                title="Recalcula faltas, dias de férias e o valor da diária de todos os lançamentos desta quinzena, a partir das Ocorrências, da Programação de Férias e do cadastro atual de cada colaborador"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sincronizar Faltas, Férias &amp; Valores
              </button>
              <button
                type="button"
                onClick={handleImprimirRelatorio}
                disabled={lancamentosDaQuinzena.length === 0}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                title="Gera um PDF (via impressão do navegador) só com o relatório desta quinzena"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Relatório
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    lancamentosDaQuinzena.length > 0 &&
                    !confirm(
                      `Esta quinzena tem ${lancamentosDaQuinzena.length} lançamento(s). Excluir a quinzena também remove esses lançamentos. Continuar?`
                    )
                  ) {
                    return;
                  }
                  onDeleteQuinzena(quinzenaAtual.id);
                  setQuinzenaSelecionadaId('');
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                title="Excluir quinzena"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Nova Quinzena — form inline */}
      {isNovaQuinzenaOpen && (
        <form
          onSubmit={handleSalvarNovaQuinzena}
          className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-amber-900">Identificação</label>
            <input
              type="text"
              value={novaIdentificacao}
              onChange={(e) => setNovaIdentificacao(e.target.value)}
              placeholder="Ex: 1ª QUINZENA - SETEMBRO/2026"
              className={inputCls + ' min-w-[220px]'}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-amber-900">Data de Início</label>
            <input
              type="date"
              value={novaDataInicio}
              onChange={(e) => setNovaDataInicio(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-amber-900">Data de Término</label>
            <input
              type="date"
              value={novaDataTermino}
              onChange={(e) => setNovaDataTermino(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setIsNovaQuinzenaOpen(false)}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
        </form>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <UsersIcon className="w-3.5 h-3.5" /> Colaboradores lançados
          </span>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {lancamentosDaQuinzena.length} / {ativos.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total de diárias
          </span>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalDiarias}</div>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Total a disponibilizar
          </span>
          <div className="text-2xl font-black text-amber-950 mt-1">{formatMoney(totalDisponibilizado)}</div>
        </div>
      </div>

      {/* Busca por colaborador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          data-no-uppercase="true"
          value={buscaColaborador}
          onChange={(e) => setBuscaColaborador(e.target.value)}
          placeholder="Buscar por colaborador — separe vários com vírgula..."
          className="w-full pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
        />
        {buscaColaborador && (
          <button
            type="button"
            onClick={() => setBuscaColaborador('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            title="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {buscaColaborador && (
        <p className="text-[10px] text-slate-400 -mt-2">
          {lancamentosFiltrados.length} de {lancamentosDaQuinzena.length} colaborador(es) encontrados
        </p>
      )}

      {/* Tabela de lançamentos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Colaborador</th>
              <th className="px-3 py-2 text-right">Valor da Diária</th>
              <th className="px-3 py-2 text-right">Faltas</th>
              <th className="px-3 py-2 text-right">Dias de Férias</th>
              <th className="px-3 py-2 text-right">Extras</th>
              <th className="px-3 py-2 text-right">Diárias</th>
              <th className="px-3 py-2 text-right">Valor a Disponibilizar</th>
              <th className="px-3 py-2">Observações</th>
              <th className="px-3 py-2 text-center">Comunicar</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lancamentosDaQuinzena.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                  Nenhum lançamento nesta quinzena ainda. Clique em "Gerar Lançamentos" para criar
                  um para cada colaborador ativo.
                </td>
              </tr>
            )}
            {lancamentosDaQuinzena.length > 0 && lancamentosFiltrados.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                  Nenhum colaborador encontrado para "{buscaColaborador}".
                </td>
              </tr>
            )}
            {lancamentosFiltrados
              .slice()
              .sort((a, b) => (a.colaboradorNome || '').localeCompare(b.colaboradorNome || ''))
              .map((l) => {
                const faltasOcorrencias = calcFaltasEmPeriodo(
                  ocorrencias,
                  l.colaboradorId,
                  l.dataInicio,
                  l.dataTermino
                );
                const diasFeriasCalculado = calcDiasFeriasEmPeriodo(
                  feriasList,
                  l.colaboradorId,
                  l.dataInicio,
                  l.dataTermino
                );
                const divergeDeOcorrencias = faltasOcorrencias !== l.faltas;
                const divergeDeFerias = diasFeriasCalculado !== (l.diasFerias || 0);
                const colaborador = colaboradoresPorId.get(l.colaboradorId);
                return (
                <tr key={l.id} className="align-middle">
                  <td className="px-3 py-1.5 font-medium text-slate-700">{l.colaboradorNome}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{formatMoney(l.valorDiaria)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {divergeDeOcorrencias && (
                        <AlertTriangle
                          className="w-3 h-3 text-amber-500 shrink-0"
                          title={`Ocorrências registram ${faltasOcorrencias} falta(s) no período — clique em "Sincronizar Faltas" para atualizar`}
                        />
                      )}
                      <input
                        type="number"
                        min={0}
                        value={l.faltas}
                        onChange={(e) => handleFaltasChange(l, e.target.value ? parseInt(e.target.value, 10) : 0)}
                        className={inputCls + ' w-16 text-right'}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {divergeDeFerias && (
                        <AlertTriangle
                          className="w-3 h-3 text-amber-500 shrink-0"
                          title={`Programação de Férias registra ${diasFeriasCalculado} dia(s) úteis de férias no período — clique em "Sincronizar Faltas & Férias" para atualizar`}
                        />
                      )}
                      <input
                        type="number"
                        min={0}
                        value={l.diasFerias || 0}
                        onChange={(e) =>
                          handleDiasFeriasChange(l, e.target.value ? parseInt(e.target.value, 10) : 0)
                        }
                        className={inputCls + ' w-16 text-right'}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      min={0}
                      value={l.diariasExtras || 0}
                      onChange={(e) =>
                        handleDiariasExtrasChange(l, e.target.value ? parseInt(e.target.value, 10) : 0)
                      }
                      title="Diárias extras somadas manualmente (ex.: dia trabalhado num sábado/feriado) — não é recalculado automaticamente"
                      className={inputCls + ' w-16 text-right'}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-slate-700">
                    {l.quantidadeDiarias}
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold text-emerald-700">
                    {formatMoney(l.valorDisponibilizado)}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={l.observacoes || ''}
                      onChange={(e) => handleObservacoesChange(l, e.target.value)}
                      placeholder="—"
                      className={inputCls + ' w-full'}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEnviarWhatsApp(l, colaborador)}
                        disabled={!colaborador?.telefoneWhatsapp}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:text-slate-300 disabled:cursor-not-allowed"
                        title={
                          colaborador?.telefoneWhatsapp
                            ? `Enviar aviso de liberação por WhatsApp para ${colaborador.nomeCompleto}`
                            : 'Colaborador sem WhatsApp cadastrado'
                        }
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEnviarEmail(l, colaborador)}
                        disabled={!colaborador?.email}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:text-slate-300 disabled:cursor-not-allowed"
                        title={
                          colaborador?.email
                            ? `Enviar aviso de liberação por e-mail para ${colaborador.nomeCompleto}`
                            : 'Colaborador sem e-mail cadastrado'
                        }
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopiarMensagem(l)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                        title="Copiar mensagem (para colar em outro app)"
                      >
                        {copiadoId === l.id ? (
                          <span className="text-[10px] font-bold text-emerald-600">Copiado!</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteLancamento(l.id)}
                      className="p-1 text-slate-300 hover:text-rose-500"
                      title="Excluir lançamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
                );
              })}
          </tbody>
          {lancamentosDaQuinzena.length > 0 && (
            <tfoot className="bg-slate-50 font-bold text-slate-700">
              <tr>
                <td className="px-3 py-2" colSpan={4}>
                  Total
                </td>
                <td className="px-3 py-2 text-right">{totalDiarias}</td>
                <td className="px-3 py-2 text-right text-emerald-700">
                  {formatMoney(totalDisponibilizado)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Relatório imprimível (PDF via window.print()) — só a quinzena selecionada, seguindo a
          Diretriz de Elaboração de Documentos em PDF (cabeçalho/rodapé institucional, cores
          neutras). Fica invisível na tela, só aparece ao chamar handleImprimirRelatorio. */}
      {quinzenaAtual && (
        <div className="hidden print:block jmt-print-doc">
          <PrintDocumentHeader
            titulo="RELATÓRIO DE VALE ALIMENTAÇÃO"
            subtitulo={quinzenaAtual.identificacao}
            metadados={`Período: ${formatDate(quinzenaAtual.dataInicio)} a ${formatDate(
              quinzenaAtual.dataTermino
            )}`}
          />
          <table className="w-full text-[11px] border-collapse mt-3">
            <thead>
              <tr className="border-b-2 border-slate-800">
                <th className="text-left py-1.5 pr-2">Colaborador</th>
                <th className="text-right py-1.5 px-2">Valor Diária</th>
                <th className="text-right py-1.5 px-2">Faltas</th>
                <th className="text-right py-1.5 px-2">Férias</th>
                <th className="text-right py-1.5 px-2">Diárias</th>
                <th className="text-right py-1.5 pl-2">Valor Disponibilizado</th>
              </tr>
            </thead>
            <tbody>
              {lancamentosDaQuinzena
                .slice()
                .sort((a, b) => (a.colaboradorNome || '').localeCompare(b.colaboradorNome || ''))
                .map((l) => (
                  <tr key={l.id} className="border-b border-slate-300">
                    <td className="py-1.5 pr-2">{l.colaboradorNome}</td>
                    <td className="text-right py-1.5 px-2">{formatMoney(l.valorDiaria)}</td>
                    <td className="text-right py-1.5 px-2">{l.faltas}</td>
                    <td className="text-right py-1.5 px-2">{l.diasFerias || 0}</td>
                    <td className="text-right py-1.5 px-2">{l.quantidadeDiarias}</td>
                    <td className="text-right py-1.5 pl-2 font-bold">
                      {formatMoney(l.valorDisponibilizado)}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-800 font-bold">
                <td className="py-2 pr-2" colSpan={4}>
                  Total ({lancamentosDaQuinzena.length} colaborador
                  {lancamentosDaQuinzena.length === 1 ? '' : 'es'})
                </td>
                <td className="text-right py-2 px-2">{totalDiarias}</td>
                <td className="text-right py-2 pl-2">{formatMoney(totalDisponibilizado)}</td>
              </tr>
            </tfoot>
          </table>
          <PrintDocumentFooter />
        </div>
      )}
    </div>
  );
};
