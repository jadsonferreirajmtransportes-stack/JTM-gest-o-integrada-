import React, { useMemo, useState } from 'react';
import {
  UploadCloud,
  Plus,
  ChevronDown,
  ChevronRight,
  Wallet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Package,
  X,
  AlertTriangle,
  Link2,
  Unlink,
  Calculator,
  FileSpreadsheet,
  Search,
  Receipt,
  Check,
} from 'lucide-react';
import { Cliente, LancamentoFaturamentoAereo, FaturaAereo } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import {
  computeResumoFatura,
  computeResumoGeral,
  computeValorACobrar,
  explicarValorACobrar,
  exportarFaturaParaExcel,
  findClienteById,
  findLancamentosDuplicados,
  STATUS_FATURA_CONFIG,
  TIPOS_CUSTO_EXTRA,
} from './faturamentoAereoUtils';
import { ImportFaturamentoAereoModal } from './ImportFaturamentoAereoModal';

interface FaturamentoAereoViewProps {
  lancamentos: LancamentoFaturamentoAereo[];
  faturas: FaturaAereo[];
  clientes: Cliente[];
  onImport: (lancamentos: LancamentoFaturamentoAereo[], faturas: FaturaAereo[]) => void;
  onCreateFatura: (fatura: FaturaAereo) => void;
  onUpdateFatura?: (fatura: FaturaAereo) => void;
  onDeleteFatura: (id: string) => void;
  onUpdateLancamento: (lancamento: LancamentoFaturamentoAereo) => void;
  onDeleteLancamento: (id: string) => void;
  /** "Farma Aéreo" (padrão) ou "Farma Rodoviário" — deixa essa tela (e o modal de importação)
   *  genéricos entre os dois setores, que compartilham a mesma estrutura de Controle Financeiro. */
  tituloSetor?: string;
  /** Setor aplicado às faturas/lançamentos criados aqui (manual ou importação) quando não
   *  vier um "Modal" explícito na planilha — ver ehModalRodoviario/mapRowsToFaturamentoAereo. */
  modalPadrao?: string;
}

const KpiCard: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  tone: 'default' | 'success' | 'danger' | 'info';
}> = ({ label, value, icon: Icon, tone }) => {
  const toneClasses: Record<typeof tone, string> = {
    default: 'bg-slate-50 border-slate-200 text-slate-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    danger: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  };
  return (
    <div className={`p-4 rounded-xl border ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
};

// Sem `w-full` de propósito: cada input abaixo define sua própria largura (w-16, w-20 etc.)
// e misturar as duas classes é ambíguo no Tailwind (a ordem de definição no CSS gerado decide,
// não a ordem no className), o que fazia os campos de largura fixa colapsarem.
const inputCls =
  'px-1.5 py-1 border border-slate-200 rounded text-[11px] focus:outline-hidden focus:ring-1 focus:ring-emerald-500';

/** Monta o texto do tooltip (title nativo, \n vira quebra de linha) explicando linha a linha
 *  de onde vem o Valor a Cobrar de um lançamento — mesma lista usada pra somar o total em
 *  `explicarValorACobrar`, então nunca mostra uma conta diferente da que foi realmente
 *  calculada. Reaproveitado em toda tela que mostra esse valor (fatura expandida, sem fatura
 *  vinculada, alerta de duplicidade). */
function tituloValorACobrarDetalhado(l: LancamentoFaturamentoAereo, cliente?: Cliente): string {
  const { linhas, total } = explicarValorACobrar(l, cliente);
  return (
    'Como o Valor a Cobrar foi calculado:\n' +
    linhas.map((linha) => `• ${linha.label}: ${formatCurrency(linha.valor)}`).join('\n') +
    `\n—\nTotal: ${formatCurrency(total)}`
  );
}

interface LancamentoRowProps {
  lancamento: LancamentoFaturamentoAereo;
  cliente?: Cliente;
  showCliente?: boolean;
  showSelecao?: boolean;
  selecionado?: boolean;
  onToggleSelecionado?: () => void;
  showRemoverDaFatura?: boolean;
  onFieldChange: (patch: Partial<LancamentoFaturamentoAereo>) => void;
  onDelete: () => void;
}

/** Uma linha de lançamento (CT-e), reaproveitada tanto dentro de uma fatura expandida
 *  quanto na lista "Sem Fatura Vinculada". Cidade/Peso/Tipo de Custo Extra/Custo Extra
 *  são editáveis e recalculam "Valor a Cobrar" ao vivo (mesma fórmula do Coda). */
const LancamentoRow: React.FC<LancamentoRowProps> = ({
  lancamento: l,
  cliente,
  showCliente,
  showSelecao,
  selecionado,
  onToggleSelecionado,
  showRemoverDaFatura,
  onFieldChange,
  onDelete,
}) => {
  const valorCalculado = computeValorACobrar(l, cliente);
  const tituloValorACobrar = tituloValorACobrarDetalhado(l, cliente);
  const cidadesTarifario = cliente?.tabelaFrete?.tarifasPorCidade;
  const usaTarifaPorCidade = !!cidadesTarifario && cidadesTarifario.length > 0;

  return (
    <tr className="align-middle">
      {showSelecao && (
        <td className="px-2 py-1.5">
          <input
            type="checkbox"
            checked={!!selecionado}
            onChange={onToggleSelecionado}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
        </td>
      )}
      {showCliente && (
        <td className="px-2 py-1.5 font-medium text-slate-700 max-w-[130px] truncate">{l.clienteNome}</td>
      )}
      <td className="px-2 py-1.5 text-slate-700 whitespace-nowrap">{l.notaFiscal || l.numeroCte || '—'}</td>
      <td className="px-2 py-1.5 text-slate-600 max-w-[120px] truncate">{l.destinatario || '—'}</td>
      <td className="px-2 py-1.5">
        {usaTarifaPorCidade ? (
          // <input list> + <datalist> em vez de <select>: dá pra digitar (filtra a lista
          // conforme digita) ou rolar/clicar as opções — um <select> nativo com centenas de
          // cidades (tarifário por cidade do cliente) só aceita pular pela 1ª letra digitada.
          <>
            <input
              type="text"
              list={`cidades-tarifario-${l.id}`}
              value={l.cidadeDestino || ''}
              onChange={(e) => onFieldChange({ cidadeDestino: e.target.value || undefined })}
              placeholder="Digite ou role para buscar..."
              className={inputCls + ' min-w-[110px]'}
            />
            <datalist id={`cidades-tarifario-${l.id}`}>
              {cidadesTarifario!.map((c) => (
                <option key={c.id} value={c.cidade} />
              ))}
            </datalist>
          </>
        ) : (
          <input
            type="text"
            value={l.cidadeDestino || ''}
            onChange={(e) => onFieldChange({ cidadeDestino: e.target.value || undefined })}
            placeholder="Cidade"
            className={inputCls + ' w-24'}
          />
        )}
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.1"
          value={l.pesoKg ?? ''}
          onChange={(e) => onFieldChange({ pesoKg: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="kg"
          className={inputCls + ' w-16 text-right'}
        />
      </td>
      <td className="px-2 py-1.5">
        <select
          value={l.tipoCustoExtra || ''}
          onChange={(e) =>
            onFieldChange({ tipoCustoExtra: (e.target.value || undefined) as any })
          }
          className={inputCls + ' min-w-[130px]'}
          title="Define como o Valor a Cobrar é calculado (igual ao Coda)"
        >
          <option value="">Padrão (tarifa)</option>
          {TIPOS_CUSTO_EXTRA.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.01"
          value={l.custoExtra ?? ''}
          onChange={(e) => onFieldChange({ custoExtra: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="0,00"
          className={inputCls + ' w-20 text-right'}
        />
      </td>
      <td className="px-2 py-1.5">
        <input
          type="date"
          value={l.dataConclusao || l.dataEmissao || ''}
          onChange={(e) => onFieldChange({ dataConclusao: e.target.value || undefined })}
          title={
            l.dataConclusao
              ? 'Data de Conclusão'
              : 'Ainda sem Data de Conclusão — mostrando a Data de Emissão da NF. Edite para registrar a data correta.'
          }
          className={inputCls + ' w-[124px]'}
        />
      </td>
      <td className="px-2 py-1.5 text-right font-bold text-slate-800 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 cursor-help" title={tituloValorACobrar}>
          <Calculator className="w-3 h-3 text-emerald-500 shrink-0" />
          {formatCurrency(valorCalculado)}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.01"
          value={l.valorRecebido ?? ''}
          onChange={(e) =>
            onFieldChange({ valorRecebido: e.target.value ? parseFloat(e.target.value) : undefined })
          }
          placeholder="0,00"
          className={inputCls + ' w-20 text-right'}
        />
      </td>
      <td className="px-2 py-1.5 text-center">
        <input
          type="checkbox"
          checked={l.confirmacaoPagamento}
          onChange={(e) =>
            onFieldChange({
              confirmacaoPagamento: e.target.checked,
              dataConclusao: e.target.checked ? l.dataConclusao || new Date().toISOString().split('T')[0] : undefined,
              // "Total Pago" soma o Valor Recebido dos lançamentos pagos, não o checkbox em si —
              // sem isso, marcar "Pago" sem digitar o valor recebido deixava o card em R$ 0,00.
              // Só preenche se ainda estiver vazio, pra não sobrescrever um valor já registrado
              // (ex.: pagamento parcial digitado manualmente); desmarcar não apaga o valor.
              valorRecebido:
                e.target.checked && !l.valorRecebido ? valorCalculado : l.valorRecebido,
            })
          }
          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
      </td>
      {showRemoverDaFatura && (
        <td className="px-2 py-1.5 text-center">
          <button
            type="button"
            onClick={() => onFieldChange({ faturaId: undefined })}
            className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
            title="Remover desta fatura (volta para Sem Fatura Vinculada)"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
      <td className="px-2 py-1.5 text-center">
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
          title="Excluir lançamento"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};

export const FaturamentoAereoView: React.FC<FaturamentoAereoViewProps> = ({
  lancamentos,
  faturas,
  clientes,
  onImport,
  onCreateFatura,
  onUpdateFatura,
  onDeleteFatura,
  onUpdateLancamento,
  onDeleteLancamento,
  tituloSetor = 'Farma Aéreo',
  modalPadrao,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNovaFaturaOpen, setIsNovaFaturaOpen] = useState(false);
  const [expandedFaturaId, setExpandedFaturaId] = useState<string | null>(null);
  const [faturaParaExcluir, setFaturaParaExcluir] = useState<FaturaAereo | null>(null);
  const [novaFaturaCliente, setNovaFaturaCliente] = useState('');
  const [novaFaturaPeriodo, setNovaFaturaPeriodo] = useState('');
  const [novaFaturaNumero, setNovaFaturaNumero] = useState('');

  // Edição inline do nº da NF emitida para a fatura — chaveado por fatura.id, igual ao padrão
  // já usado pra busca por fatura (evita um estado por linha e mantém cada edição isolada).
  const [nfEmEdicaoId, setNfEmEdicaoId] = useState<string | null>(null);
  const [nfDraft, setNfDraft] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [faturaDestinoSelecao, setFaturaDestinoSelecao] = useState('');
  const [buscaSemFatura, setBuscaSemFatura] = useState('');

  // Busca dentro de cada fatura — um termo por fatura (chaveado pelo id), para filtrar as
  // notas/CT-es exibidos quando a fatura está expandida, sem afetar as demais faturas abertas.
  const [buscaPorFatura, setBuscaPorFatura] = useState<Record<string, string>>({});

  // Busca global por NF/CT-e — encontra o lançamento em qualquer fatura (ou sem fatura
  // vinculada) e leva o usuário direto até ele, sem precisar abrir fatura por fatura.
  const [buscaGlobal, setBuscaGlobal] = useState('');

  // Filtro por empresa — a página inteira (contadores, alerta de duplicidade, faturas e
  // lançamentos sem fatura) passa a considerar só os lançamentos/faturas da empresa escolhida.
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  // Chave de agrupamento por empresa: usa o clienteId (fonte da verdade) quando o lançamento
  // está vinculado a um cliente cadastrado — assim duas importações que resolvem pro mesmo
  // cliente com nomes de exibição diferentes (razão social numa, nome fantasia noutra) caem
  // na mesma opção do filtro, em vez de criar entradas fantasmas no seletor. Só cai no
  // clienteNome bruto quando não há cliente vinculado (lançamento importado sem match).
  const chaveEmpresa = (clienteId?: string, clienteNome?: string) => clienteId || clienteNome || '';
  const empresasDisponiveis = useMemo(() => {
    const porChave = new Map<string, string>(); // chave -> nome de exibição
    lancamentos.forEach((l) => {
      const chave = chaveEmpresa(l.clienteId, l.clienteNome);
      if (!chave || porChave.has(chave)) return;
      const cliente = l.clienteId ? findClienteById(clientes, l.clienteId) : undefined;
      const label = cliente?.nomeFantasia || cliente?.razaoSocial || l.clienteNome || chave;
      porChave.set(chave, label);
    });
    return Array.from(porChave.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [lancamentos, clientes]);
  const lancamentosDaEmpresa = useMemo(
    () =>
      empresaSelecionada
        ? lancamentos.filter((l) => chaveEmpresa(l.clienteId, l.clienteNome) === empresaSelecionada)
        : lancamentos,
    [lancamentos, empresaSelecionada]
  );
  const faturasDaEmpresa = useMemo(
    () =>
      empresaSelecionada
        ? faturas.filter((f) => chaveEmpresa(f.clienteId, f.clienteNome) === empresaSelecionada)
        : faturas,
    [faturas, empresaSelecionada]
  );

  const resumoGeral = useMemo(
    () => computeResumoGeral(lancamentosDaEmpresa, faturasDaEmpresa, clientes),
    [lancamentosDaEmpresa, faturasDaEmpresa, clientes]
  );

  const duplicados = useMemo(() => findLancamentosDuplicados(lancamentosDaEmpresa), [lancamentosDaEmpresa]);
  const totalLancamentosDuplicados = useMemo(
    () => duplicados.reduce((sum, g) => sum + g.lancamentos.length, 0),
    [duplicados]
  );

  const lancamentosSemFatura = useMemo(() => lancamentosDaEmpresa.filter((l) => !l.faturaId), [lancamentosDaEmpresa]);
  const totalSemFatura = useMemo(
    () =>
      lancamentosSemFatura.reduce(
        (sum, l) => sum + computeValorACobrar(l, findClienteById(clientes, l.clienteId)),
        0
      ),
    [lancamentosSemFatura, clientes]
  );

  // Busca (cliente, destinatário, NF, CT-e ou cidade) — não some com a seleção: filtrar e
  // depois limpar o campo não perde CT-es que já estavam marcados fora do resultado atual.
  // Vírgula separa vários termos (ex.: "381523, 227813") — entra quem bater com qualquer um deles.
  const lancamentosSemFaturaFiltrados = useMemo(() => {
    const termos = buscaSemFatura
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (termos.length === 0) return lancamentosSemFatura;
    return lancamentosSemFatura.filter((l) => {
      const campos = [l.clienteNome, l.destinatario, l.notaFiscal, l.numeroCte, l.cidadeDestino]
        .filter(Boolean)
        .map((campo) => String(campo).toLowerCase());
      return termos.some((termo) => campos.some((campo) => campo.includes(termo)));
    });
  }, [lancamentosSemFatura, buscaSemFatura]);

  const faturasOrdenadas = useMemo(
    () => [...faturasDaEmpresa].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || '')),
    [faturasDaEmpresa]
  );

  // Resultados da busca global por NF/CT-e — respeita o filtro de empresa selecionado.
  const resultadosBuscaGlobal = useMemo(() => {
    const termo = buscaGlobal.trim().toLowerCase();
    if (!termo) return [];
    return lancamentosDaEmpresa.filter((l) => {
      const nf = (l.notaFiscal || '').toLowerCase();
      const cte = (l.numeroCte || '').toLowerCase();
      return nf.includes(termo) || cte.includes(termo);
    });
  }, [lancamentosDaEmpresa, buscaGlobal]);

  const handleIrParaResultado = (l: LancamentoFaturamentoAereo) => {
    setBuscaGlobal('');
    if (l.faturaId) {
      setExpandedFaturaId(l.faturaId);
      requestAnimationFrame(() => {
        document
          .getElementById(`fatura-aerea-${l.faturaId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } else {
      setBuscaSemFatura(l.numeroCte || l.notaFiscal || '');
      requestAnimationFrame(() => {
        document
          .getElementById('lancamentos-sem-fatura')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  // Clientes distintos entre os lançamentos selecionados (para saber se dá para vincular
  // a uma fatura já existente daquele cliente, ou se precisa criar uma nova).
  const clienteIdsSelecionados = useMemo(() => {
    const ids = new Set<string | undefined>();
    selecionados.forEach((id) => {
      const l = lancamentos.find((x) => x.id === id);
      ids.add(l?.clienteId);
    });
    return ids;
  }, [selecionados, lancamentos]);
  const clienteUnicoSelecionado =
    clienteIdsSelecionados.size === 1 ? Array.from(clienteIdsSelecionados)[0] : undefined;

  const faturasDoClienteSelecionado = useMemo(
    () => (clienteUnicoSelecionado ? faturas.filter((f) => f.clienteId === clienteUnicoSelecionado) : []),
    [faturas, clienteUnicoSelecionado]
  );

  const totalSelecionado = useMemo(() => {
    return Array.from(selecionados).reduce((sum: number, id) => {
      const l = lancamentos.find((x) => x.id === id);
      if (!l) return sum;
      return sum + computeValorACobrar(l, findClienteById(clientes, l.clienteId));
    }, 0);
  }, [selecionados, lancamentos, clientes]);

  const handleFieldChangeFactory =
    (l: LancamentoFaturamentoAereo) => (patch: Partial<LancamentoFaturamentoAereo>) => {
      const atualizado: LancamentoFaturamentoAereo = { ...l, ...patch };
      const cliente = findClienteById(clientes, atualizado.clienteId);
      // Recalcula e persiste o valor a cobrar sempre que algo que o influencia muda —
      // mesmo quando o campo alterado foi outro (ex: valor recebido), o recálculo é
      // barato e mantém o snapshot salvo sempre coerente com o tarifário atual.
      atualizado.valorACobrar = computeValorACobrar(atualizado, cliente);
      onUpdateLancamento(atualizado);
    };

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Marca/desmarca só os CT-es visíveis no filtro atual — os já selecionados fora dele
  // (busca ainda ativa ou já limpa) continuam marcados.
  const toggleSelecionarTodos = () => {
    setSelecionados((prev) => {
      const todosFiltradosSelecionados =
        lancamentosSemFaturaFiltrados.length > 0 &&
        lancamentosSemFaturaFiltrados.every((l) => prev.has(l.id));
      const next = new Set(prev);
      lancamentosSemFaturaFiltrados.forEach((l) => {
        if (todosFiltradosSelecionados) next.delete(l.id);
        else next.add(l.id);
      });
      return next;
    });
  };

  const limparSelecao = () => {
    setSelecionados(new Set());
    setFaturaDestinoSelecao('');
  };

  const handleVincularSelecionadosAFatura = () => {
    if (!faturaDestinoSelecao) return;
    selecionados.forEach((id) => {
      const l = lancamentos.find((x) => x.id === id);
      if (l) onUpdateLancamento({ ...l, faturaId: faturaDestinoSelecao });
    });
    limparSelecao();
  };

  const handleCriarFatura = () => {
    if (!novaFaturaCliente.trim() || !novaFaturaNumero.trim()) return;
    const cliente = clientes.find((c) => c.id === novaFaturaCliente);
    const novaFaturaId = `fatura-aereo-${Date.now()}`;
    onCreateFatura({
      id: novaFaturaId,
      clienteId: cliente?.id,
      clienteNome: cliente?.nomeFantasia || cliente?.razaoSocial || novaFaturaCliente,
      periodo: novaFaturaPeriodo.trim() || '—',
      numeroFatura: novaFaturaNumero.trim(),
      modal: modalPadrao,
      criadoEm: new Date().toISOString(),
    });
    // Se a fatura foi criada a partir de uma seleção de CT-es, já vincula todos a ela.
    if (selecionados.size > 0) {
      selecionados.forEach((id) => {
        const l = lancamentos.find((x) => x.id === id);
        if (l) onUpdateLancamento({ ...l, faturaId: novaFaturaId });
      });
      limparSelecao();
    }
    setNovaFaturaCliente('');
    setNovaFaturaPeriodo('');
    setNovaFaturaNumero('');
    setIsNovaFaturaOpen(false);
  };

  const handleAbrirNovaFaturaComSelecao = () => {
    if (clienteUnicoSelecionado) setNovaFaturaCliente(clienteUnicoSelecionado);
    setIsNovaFaturaOpen(true);
  };

  const handleExportarFatura = (fatura: FaturaAereo) => {
    const lancamentosDaFatura = lancamentos.filter((l) => l.faturaId === fatura.id);
    void exportarFaturaParaExcel(fatura, lancamentosDaFatura, findClienteById(clientes, fatura.clienteId));
  };

  const handleAbrirEdicaoNF = (fatura: FaturaAereo) => {
    setNfEmEdicaoId(fatura.id);
    setNfDraft(fatura.numeroNF || '');
  };

  const handleCancelarEdicaoNF = () => {
    setNfEmEdicaoId(null);
    setNfDraft('');
  };

  const handleSalvarNF = (fatura: FaturaAereo) => {
    onUpdateFatura?.({
      ...fatura,
      numeroNF: nfDraft.trim() || undefined,
      atualizadoEm: new Date().toISOString(),
    });
    setNfEmEdicaoId(null);
    setNfDraft('');
  };

  // Um .xlsx por fatura (mesmas colunas da tabela de CT-e do Coda) — igual ao que sairia
  // se cada fatura fosse exportada individualmente pelo botão da linha, só que em lote.
  // Sequencial (await) em vez de disparar tudo de uma vez — cada exportação monta o arquivo
  // inteiro em memória antes do download, então gerar todas em paralelo desperdiçaria memória
  // à toa sem nenhum ganho perceptível de velocidade.
  const handleExportarTodasFaturas = async () => {
    for (const fatura of faturasOrdenadas) {
      const lancamentosDaFatura = lancamentos.filter((l) => l.faturaId === fatura.id);
      if (lancamentosDaFatura.length === 0) continue;
      await exportarFaturaParaExcel(fatura, lancamentosDaFatura, findClienteById(clientes, fatura.clienteId));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header da seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            Controle Financeiro — Faturamento {tituloSetor}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Lançamentos de CT-e agrupados em faturas, com status de cobrança e pagamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportarTodasFaturas}
            disabled={faturasOrdenadas.length === 0}
            className="px-3 py-2 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Baixa um .xlsx por fatura, com as mesmas colunas da tabela de CT-e do Coda"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Todas as Faturas (Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNovaFaturaOpen(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Fatura</span>
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Importar Planilha (Excel/XLS)</span>
          </button>
        </div>
      </div>

      {/* Filtro por Empresa — afeta contadores, alerta de duplicidade, faturas, busca global e
          lançamentos sem fatura vinculada da página inteira. */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <label htmlFor="filtro-empresa-aereo" className="text-xs font-semibold text-slate-600 shrink-0">
          Empresa
        </label>
        <select
          id="filtro-empresa-aereo"
          value={empresaSelecionada}
          onChange={(e) => setEmpresaSelecionada(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Todas as Empresas</option>
          {empresasDisponiveis.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {empresaSelecionada && (
          <button
            type="button"
            onClick={() => setEmpresaSelecionada('')}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Limpar filtro
          </button>
        )}
        <span className="text-[11px] text-slate-400 ml-auto">
          {resumoGeral.totalCtes} CT-e(s) • {resumoGeral.totalFaturas} fatura(s)
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Faturado" value={formatCurrency(resumoGeral.totalFaturado)} icon={Wallet} tone="default" />
        <KpiCard label="Total Pago (CT-Es)" value={formatCurrency(resumoGeral.totalPago)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Total em Aberto" value={formatCurrency(resumoGeral.totalEmAberto)} icon={AlertCircle} tone="danger" />
        <KpiCard label="Total de Faturas" value={String(resumoGeral.totalFaturas)} icon={FileText} tone="info" />
        <KpiCard label="Total de CT-Es" value={String(resumoGeral.totalCtes)} icon={Package} tone="default" />
        <KpiCard label="CT-Es Pagos" value={String(resumoGeral.ctesPagos)} icon={CheckCircle2} tone="success" />
        <KpiCard label="CT-Es em Aberto" value={String(resumoGeral.ctesEmAberto)} icon={AlertCircle} tone="danger" />
      </div>

      {/* Busca global por NF/CT-e — encontra o lançamento em qualquer fatura (ou sem fatura
          vinculada) sem precisar abrir fatura por fatura. */}
      <div className="relative">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={buscaGlobal}
            onChange={(e) => setBuscaGlobal(e.target.value)}
            placeholder="Buscar Nota Fiscal ou CT-e..."
            className="w-full pl-8 pr-7 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
          {buscaGlobal && (
            <button
              type="button"
              onClick={() => setBuscaGlobal('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {buscaGlobal.trim() !== '' && (
          <div className="absolute z-10 mt-1 w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {resultadosBuscaGlobal.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-slate-400">
                Nenhum lançamento encontrado para "{buscaGlobal}".
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {resultadosBuscaGlobal.slice(0, 15).map((l) => {
                  const faturaDoLancamento = l.faturaId ? faturas.find((f) => f.id === l.faturaId) : undefined;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleIrParaResultado(l)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-800 truncate">{l.clienteNome}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          NF {l.notaFiscal || '—'} • CT-e {l.numeroCte || '—'}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          faturaDoLancamento
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {faturaDoLancamento ? faturaDoLancamento.numeroFatura : 'Sem fatura'}
                      </span>
                    </button>
                  );
                })}
                {resultadosBuscaGlobal.length > 15 && (
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 text-center">
                    +{resultadosBuscaGlobal.length - 15} resultado(s) — refine a busca
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alerta de CT-Es em duplicidade — mesmo nº de CT-e (ou mesma NF do mesmo cliente)
          aparecendo em mais de um lançamento. Comum após reimportar planilha ou digitação
          repetida; deixa revisar e excluir a entrada redundante direto aqui. */}
      {duplicados.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-300 overflow-hidden">
          <div className="px-4 py-3 bg-rose-50 border-b border-rose-200">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              CT-Es em Duplicidade ({duplicados.length} grupo{duplicados.length > 1 ? 's' : ''},{' '}
              {totalLancamentosDuplicados} lançamentos)
            </h4>
            <p className="text-[11px] text-rose-700 mt-0.5">
              Mesmo número de CT-e (ou mesma Nota Fiscal do mesmo cliente) aparece em mais de um
              lançamento. Revise abaixo e exclua a(s) entrada(s) repetida(s).
            </p>
          </div>
          <div className="divide-y divide-rose-100">
            {duplicados.map((grupo) => (
              <div key={`${grupo.criterio}-${grupo.chave}`} className="p-3">
                <div className="text-[11px] font-bold text-slate-700 mb-1.5">
                  {grupo.criterio === 'numeroCte' ? 'CT-e' : 'Nota Fiscal'}{' '}
                  <span className="font-mono text-rose-700">{grupo.chave}</span>
                  <span className="ml-2 text-slate-400 font-normal">
                    — {grupo.lancamentos.length} ocorrências
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-slate-400">
                        <th className="px-2 py-1">Cliente</th>
                        <th className="px-2 py-1">NF</th>
                        <th className="px-2 py-1">CT-e</th>
                        <th className="px-2 py-1">Destinatário</th>
                        <th className="px-2 py-1">Data</th>
                        <th className="px-2 py-1 text-right">Valor a Cobrar</th>
                        <th className="px-2 py-1">Fatura</th>
                        <th className="px-2 py-1" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grupo.lancamentos.map((l) => {
                        const faturaDoLancamento = l.faturaId
                          ? faturas.find((f) => f.id === l.faturaId)
                          : undefined;
                        const clienteDoLancamento = findClienteById(clientes, l.clienteId);
                        return (
                          <tr key={l.id}>
                            <td className="px-2 py-1.5 max-w-[130px] truncate">{l.clienteNome}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{l.notaFiscal || '—'}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{l.numeroCte || '—'}</td>
                            <td className="px-2 py-1.5 max-w-[150px] truncate">{l.destinatario || '—'}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {l.dataEmissao ? formatDateBR(l.dataEmissao) : '—'}
                            </td>
                            <td
                              className="px-2 py-1.5 text-right font-semibold text-slate-800 cursor-help"
                              title={tituloValorACobrarDetalhado(l, clienteDoLancamento)}
                            >
                              {formatCurrency(computeValorACobrar(l, clienteDoLancamento))}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {faturaDoLancamento ? (
                                faturaDoLancamento.numeroFatura
                              ) : (
                                <span className="text-amber-600">Sem fatura</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => onDeleteLancamento(l.id)}
                                className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                                title="Excluir este lançamento duplicado"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de Faturas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Faturas ({faturasOrdenadas.length})
          </h4>
        </div>

        {faturasOrdenadas.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Nenhuma fatura cadastrada ainda. Importe uma planilha ou crie uma fatura manualmente.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {faturasOrdenadas.map((fatura) => {
              const resumo = computeResumoFatura(fatura.id, lancamentos, clientes);
              const statusCfg = STATUS_FATURA_CONFIG[resumo.status];
              const isExpanded = expandedFaturaId === fatura.id;
              const lancamentosDaFatura = lancamentos.filter((l) => l.faturaId === fatura.id);
              const clienteDaFatura = findClienteById(clientes, fatura.clienteId);

              // Filtra os lançamentos desta fatura pelo termo de busca próprio dela (vírgula
              // separa vários termos, mesmo padrão da busca de "Sem Fatura Vinculada").
              const termoFatura = buscaPorFatura[fatura.id] || '';
              const termosFatura = termoFatura
                .split(',')
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean);
              const lancamentosDaFaturaFiltrados =
                termosFatura.length === 0
                  ? lancamentosDaFatura
                  : lancamentosDaFatura.filter((l) => {
                      const campos = [l.clienteNome, l.destinatario, l.notaFiscal, l.numeroCte, l.cidadeDestino]
                        .filter(Boolean)
                        .map((campo) => String(campo).toLowerCase());
                      return termosFatura.some((termo) => campos.some((campo) => campo.includes(termo)));
                    });

              return (
                <div key={fatura.id} id={`fatura-aerea-${fatura.id}`}>
                  {/* Div clicável (não <button>) porque a linha contém botões de ação (exportar/excluir)
                      dentro dela — <button> aninhado em <button> é HTML inválido e gera erro de hidratação. */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedFaturaId(isExpanded ? null : fatura.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedFaturaId(isExpanded ? null : fatura.id);
                      }
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                          {fatura.clienteNome}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {fatura.numeroFatura}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                        {fatura.numeroNF && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 flex items-center gap-1">
                            <Receipt className="w-2.5 h-2.5" />
                            NF {fatura.numeroNF}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{fatura.periodo}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-800">
                        {formatCurrency(resumo.valorTotalCobrado)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {resumo.qtdCtesPagos}/{resumo.qtdCtes} CT-Es pagos
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isExpanded) setExpandedFaturaId(fatura.id);
                        handleAbrirEdicaoNF(fatura);
                      }}
                      className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
                      title={
                        fatura.numeroNF
                          ? `NF emitida: ${fatura.numeroNF} — clique para editar`
                          : 'Informar nº da NF emitida para esta fatura'
                      }
                    >
                      <Receipt className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportarFatura(fatura);
                      }}
                      className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                      title="Exportar esta fatura para Excel (usa o modelo de colunas da empresa, quando houver, senão o padrão do Coda)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFaturaParaExcluir(fatura);
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                      title="Excluir fatura"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-slate-50/60">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-[11px]">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="block text-slate-400">Valor Pago</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(resumo.valorPago)}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="block text-slate-400">Valor em Aberto</span>
                          <span className="font-bold text-rose-700">{formatCurrency(resumo.valorEmAberto)}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="block text-slate-400">Data Envio</span>
                          <span className="font-semibold text-slate-700">
                            {fatura.dataEnvio ? formatDateBR(fatura.dataEnvio) : '—'}
                          </span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="block text-slate-400">Confirmação Pagamento</span>
                          <span className="font-semibold text-slate-700">
                            {resumo.dataConfirmacaoPagamento ? formatDateBR(resumo.dataConfirmacaoPagamento) : '—'}
                          </span>
                        </div>

                        {/* NF Emitida — nº da nota fiscal que a JMT emitiu para cobrar esta fatura;
                            editável aqui mesmo (botão do cabeçalho da fatura abre este campo). */}
                        <div className="p-2 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                          <span className="block text-slate-400 mb-0.5">NF Emitida</span>
                          {nfEmEdicaoId === fatura.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                autoFocus
                                value={nfDraft}
                                onChange={(e) => setNfDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSalvarNF(fatura);
                                  if (e.key === 'Escape') handleCancelarEdicaoNF();
                                }}
                                placeholder="Nº da NF..."
                                className="w-full min-w-0 px-1.5 py-1 border border-indigo-300 rounded-md text-[11px] focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleSalvarNF(fatura)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md shrink-0"
                                title="Salvar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelarEdicaoNF}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded-md shrink-0"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAbrirEdicaoNF(fatura)}
                              className="font-semibold text-slate-700 hover:text-indigo-600 transition-colors text-left"
                            >
                              {fatura.numeroNF || (
                                <span className="text-indigo-500 font-bold inline-flex items-center gap-1">
                                  <Receipt className="w-3 h-3" /> Informar NF
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {lancamentosDaFatura.length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-2">Nenhum lançamento vinculado.</p>
                      ) : (
                        <>
                          {/* Busca dentro da fatura — filtra por cliente, destinatário, NF, CT-e ou cidade */}
                          <div className="mb-2">
                            <div className="relative max-w-sm">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                              <input
                                type="text"
                                value={termoFatura}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  setBuscaPorFatura((prev) => ({ ...prev, [fatura.id]: e.target.value }))
                                }
                                placeholder="Buscar NF, CT-e, destinatário ou cidade nesta fatura..."
                                className="w-full pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                              {termoFatura && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBuscaPorFatura((prev) => ({ ...prev, [fatura.id]: '' }));
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                  title="Limpar busca"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {termoFatura && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                {lancamentosDaFaturaFiltrados.length} de {lancamentosDaFatura.length} nota(s)
                                encontrada(s)
                              </p>
                            )}
                          </div>

                          {lancamentosDaFaturaFiltrados.length === 0 ? (
                            <p className="text-[11px] text-slate-400 py-2">
                              Nenhuma nota encontrada para "{termoFatura}" nesta fatura.
                            </p>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
                              <table className="w-full text-[11px]">
                                <thead className="bg-slate-50">
                                  <tr className="text-left text-slate-500">
                                    <th className="px-2 py-2">NF / CT-e</th>
                                    <th className="px-2 py-2">Destinatário</th>
                                    <th className="px-2 py-2">Cidade</th>
                                    <th className="px-2 py-2">Peso</th>
                                    <th className="px-2 py-2">Tipo Custo Extra</th>
                                    <th className="px-2 py-2">Custo Extra</th>
                                    <th className="px-2 py-2">Data</th>
                                    <th className="px-2 py-2 text-right">Valor a Cobrar</th>
                                    <th className="px-2 py-2">Valor Recebido</th>
                                    <th className="px-2 py-2 text-center">Pago</th>
                                    <th className="px-2 py-2 text-center">Fatura</th>
                                    <th className="px-2 py-2" />
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {lancamentosDaFaturaFiltrados.map((l) => (
                                    <LancamentoRow
                                      key={l.id}
                                      lancamento={l}
                                      cliente={clienteDaFatura || findClienteById(clientes, l.clienteId)}
                                      showRemoverDaFatura
                                      onFieldChange={handleFieldChangeFactory(l)}
                                      onDelete={() => onDeleteLancamento(l.id)}
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lançamentos sem fatura vinculada — selecione os CT-es que devem entrar em uma fatura */}
      {lancamentosSemFatura.length > 0 && (
        <div id="lancamentos-sem-fatura" className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Sem Fatura Vinculada ({lancamentosSemFatura.length})
            </h4>
            <span className="text-xs font-bold text-amber-800">{formatCurrency(totalSemFatura)}</span>
          </div>

          {/* Busca — filtra por cliente, destinatário, NF, CT-e ou cidade */}
          <div className="px-4 py-2.5 border-b border-amber-100 bg-white">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={buscaSemFatura}
                onChange={(e) => setBuscaSemFatura(e.target.value)}
                placeholder="Buscar por cliente, NF, CT-e, destinatário ou cidade — separe vários com vírgula..."
                className="w-full pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              {buscaSemFatura && (
                <button
                  type="button"
                  onClick={() => setBuscaSemFatura('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {buscaSemFatura && (
              <p className="text-[10px] text-slate-400 mt-1">
                {lancamentosSemFaturaFiltrados.length} de {lancamentosSemFatura.length} CT-e(s) encontrados
              </p>
            )}
          </div>

          {/* Barra de ação em lote — aparece quando há CT-es selecionados */}
          {selecionados.size > 0 && (
            <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-bold text-emerald-800">
                {selecionados.size} CT-e(s) selecionado(s) — {formatCurrency(totalSelecionado)}
              </span>

              {clienteUnicoSelecionado === undefined && clienteIdsSelecionados.size > 1 ? (
                <span className="text-[11px] text-amber-700">
                  Selecione CT-es de um único cliente para vincular a uma fatura existente.
                </span>
              ) : (
                <>
                  <select
                    value={faturaDestinoSelecao}
                    onChange={(e) => setFaturaDestinoSelecao(e.target.value)}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Vincular à fatura existente...</option>
                    {faturasDoClienteSelecionado.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.numeroFatura} — {f.periodo}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleVincularSelecionadosAFatura}
                    disabled={!faturaDestinoSelecao}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Vincular
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleAbrirNovaFaturaComSelecao}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Fatura com Selecionados
              </button>

              <button
                type="button"
                onClick={limparSelecao}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-[11px] font-medium ml-auto"
              >
                Limpar seleção
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={
                        lancamentosSemFaturaFiltrados.length > 0 &&
                        lancamentosSemFaturaFiltrados.every((l) => selecionados.has(l.id))
                      }
                      onChange={toggleSelecionarTodos}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">NF / CT-e</th>
                  <th className="px-2 py-2">Destinatário</th>
                  <th className="px-2 py-2">Cidade</th>
                  <th className="px-2 py-2">Peso</th>
                  <th className="px-2 py-2">Tipo Custo Extra</th>
                  <th className="px-2 py-2">Custo Extra</th>
                  <th className="px-2 py-2">Data</th>
                  <th className="px-2 py-2 text-right">Valor a Cobrar</th>
                  <th className="px-2 py-2">Valor Recebido</th>
                  <th className="px-2 py-2 text-center">Pago</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentosSemFaturaFiltrados.map((l) => (
                  <LancamentoRow
                    key={l.id}
                    lancamento={l}
                    cliente={findClienteById(clientes, l.clienteId)}
                    showCliente
                    showSelecao
                    selecionado={selecionados.has(l.id)}
                    onToggleSelecionado={() => toggleSelecionado(l.id)}
                    onFieldChange={handleFieldChangeFactory(l)}
                    onDelete={() => onDeleteLancamento(l.id)}
                  />
                ))}
              </tbody>
            </table>
            {lancamentosSemFaturaFiltrados.length === 0 && (
              <p className="text-center text-[11px] text-slate-400 py-6">
                Nenhum CT-e encontrado para "{buscaSemFatura}".
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nova Fatura manual */}
      {isNovaFaturaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Nova Fatura</h3>
              <button
                type="button"
                onClick={() => setIsNovaFaturaOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {selecionados.size > 0 && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                  {selecionados.size} CT-e(s) selecionado(s) serão vinculados a esta fatura ao criar.
                </p>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cliente</label>
                <select
                  value={novaFaturaCliente}
                  onChange={(e) => setNovaFaturaCliente(e.target.value)}
                  disabled={!!clienteUnicoSelecionado}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                >
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeFantasia || c.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Período</label>
                <input
                  type="text"
                  value={novaFaturaPeriodo}
                  onChange={(e) => setNovaFaturaPeriodo(e.target.value)}
                  placeholder="Ex: Setembro 2026"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nº da Fatura</label>
                <input
                  type="text"
                  value={novaFaturaNumero}
                  onChange={(e) => setNovaFaturaNumero(e.target.value)}
                  placeholder="Ex: SET/26"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNovaFaturaOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCriarFatura}
                disabled={!novaFaturaCliente.trim() || !novaFaturaNumero.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-lg"
              >
                Criar Fatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão de fatura (substitui window.confirm, não confiável em alguns navegadores/webviews) */}
      {faturaParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Excluir fatura?</h3>
              <p className="text-xs text-slate-500">
                A fatura <strong>{faturaParaExcluir.numeroFatura}</strong> ({faturaParaExcluir.clienteNome}) será
                removida. Os lançamentos vinculados a ela ficarão sem fatura, mas não serão excluídos.
              </p>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFaturaParaExcluir(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteFatura(faturaParaExcluir.id);
                  setFaturaParaExcluir(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Excluir Fatura
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportFaturamentoAereoModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        clientes={clientes}
        onConfirmImport={onImport}
        titulo={`Importar Faturamento — ${tituloSetor} (Excel/XLS)`}
        subtitulo={`Controle Financeiro — ${tituloSetor}: lançamentos de CT-e e faturas`}
        modalPadrao={modalPadrao}
      />
    </div>
  );
};
