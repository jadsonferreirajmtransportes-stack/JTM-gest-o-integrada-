import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Check, CheckCircle2, FileSpreadsheet, Loader2, Mail, Pencil, Plus, Receipt, RotateCcw, Search, Settings2, Trash2, X, XCircle } from 'lucide-react';
import type { Cliente, LancamentoFaturamentoAereo, UsuarioLogin } from '../../types';
import { CustoExtra, ModeloPlanilhaCusto, STATUS_CUSTO_EXTRA, StatusCustoExtra, excluirCustoExtra, getCustosExtras, getModelosPlanilha, novoIdCustoExtra, salvarCustosExtras } from '../../utils/custosExtrasApi';
import { obterUrlArquivo } from '../../utils/arquivosStorage';
import { formatCurrency } from '../../utils/formatters';
import { baixarBlob } from '../../utils/downloadUtils';
import { CustoParaPlanilha, gerarPlanilhaPeloModelo, gerarPlanilhaValidacao } from './planilhaCustosExtras';
import { ModeloPlanilhaModal } from './ModeloPlanilhaModal';
import { CalculadoraFreteModal } from '../Clients/CalculadoraFreteModal';

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const hoje = () => new Date().toLocaleDateString('sv-SE');
const ESTILO: Record<StatusCustoExtra, string> = {
  Pendente: 'bg-amber-50 text-[#92611F] border-amber-200',
  Enviado: 'bg-sky-50 text-sky-700 border-sky-200',
  Aprovado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Recusado: 'bg-rose-50 text-rose-700 border-rose-200',
};
const ROTULO: Record<StatusCustoExtra, string> = { Pendente: 'A enviar', Enviado: 'Aguardando validação', Aprovado: 'Aprovado', Recusado: 'Recusado' };
const chaveEmpresa = (c: Pick<CustoExtra, 'clienteId' | 'clienteNome'>) => c.clienteId || `nome:${c.clienteNome}`;

interface Props {
  currentUser?: UsuarioLogin | null;
  lancamentos: LancamentoFaturamentoAereo[];
  clientes: Cliente[];
  onUpdateLancamento: (l: LancamentoFaturamentoAereo) => Promise<void>;
}

/** Custos extras: atrelar a uma nota, mandar para a empresa validar e lançar no CT-e quando aprovado. */
export const CustosExtrasView: React.FC<Props> = ({ currentUser, lancamentos, clientes, onUpdateLancamento }) => {
  const [itens, setItens] = useState<CustoExtra[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusCustoExtra | 'Todos'>('Pendente');
  const [empresa, setEmpresa] = useState('');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<CustoExtra | 'novo' | null>(null);
  const [recusando, setRecusando] = useState<CustoExtra | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [modelos, setModelos] = useState<Map<string, ModeloPlanilhaCusto>>(new Map());
  const [formatoDe, setFormatoDe] = useState<{ chave: string; nome: string } | null>(null);
  const [escolhendoFormato, setEscolhendoFormato] = useState(false);

  useEffect(() => {
    getModelosPlanilha()
      .then((ms) => setModelos(new Map(ms.map((m) => [m.clienteChave, m]))))
      .catch(() => undefined);
    getCustosExtras()
      .then(setItens)
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar.');
        setItens([]);
      });
  }, []);

  const lancPorId = useMemo(() => new Map(lancamentos.map((l) => [l.id, l])), [lancamentos]);
  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const empresas = useMemo(() => {
    const m = new Map<string, string>();
    (itens || []).forEach((c) => m.set(chaveEmpresa(c), c.clienteNome));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [itens]);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (itens || []).filter(
      (c) =>
        (status === 'Todos' || c.status === status) &&
        (!empresa || chaveEmpresa(c) === empresa) &&
        (!t || [c.notaFiscal, c.numeroCte, c.descricao, c.tipo, c.destinatario, c.clienteNome].some((x) => (x || '').toLowerCase().includes(t)))
    );
  }, [itens, status, empresa, busca]);
  const grupos = useMemo(() => {
    const m = new Map<string, CustoExtra[]>();
    visiveis.forEach((c) => m.set(chaveEmpresa(c), [...(m.get(chaveEmpresa(c)) || []), c]));
    return [...m.entries()].sort((a, b) => a[1][0].clienteNome.localeCompare(b[1][0].clienteNome));
  }, [visiveis]);
  const contagem = (s: StatusCustoExtra) => (itens || []).filter((c) => c.status === s && (!empresa || chaveEmpresa(c) === empresa)).length;

  const gravar = async (lista: CustoExtra[]) => {
    await salvarCustosExtras(lista);
    setItens((atual) => {
      const m = new Map<string, CustoExtra>((atual || []).map((c) => [c.id, c]));
      lista.forEach((c) => m.set(c.id, c));
      return [...m.values()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    });
  };

  /** Soma (ou tira) o valor no "Custo extra" do CT-e. */
  const ajustarCte = async (c: CustoExtra, sinal: 1 | -1) => {
    const l = c.lancamentoId ? lancPorId.get(c.lancamentoId) : undefined;
    if (!l) return false;
    const novo = Math.round(((l.custoExtra || 0) + sinal * c.valor) * 100) / 100;
    await onUpdateLancamento({ ...l, custoExtra: novo || undefined, atualizadoEm: new Date().toISOString() } as LancamentoFaturamentoAereo);
    return true;
  };

  const paraPlanilha = (lista: CustoExtra[]): CustoParaPlanilha[] =>
    lista.map((c) => ({ ...c, volumes: c.lancamentoId ? lancPorId.get(c.lancamentoId)?.volumes : undefined }));

  const executar = async (chave: string, fn: () => Promise<void>) => {
    setOcupado(chave);
    setErro(null);
    try {
      await fn();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(null);
    }
  };

  const aprovar = (c: CustoExtra) =>
    executar(c.id, async () => {
      const quem = window.prompt('Quem validou na empresa? (opcional — nome ou e-mail)', c.validadoPor || '') ?? undefined;
      if (quem === undefined) return;
      const lancou = !c.lancadoNoCte ? await ajustarCte(c, 1) : c.lancadoNoCte;
      if (!lancou) alert('Aprovado, mas a nota não está mais no Controle Financeiro — lance o valor no CT-e à mão.');
      await gravar([{ ...c, status: 'Aprovado', validadoEm: new Date().toISOString(), validadoPor: quem.trim() || undefined, motivoRecusa: undefined, lancadoNoCte: !!lancou }]);
    });
  const desfazer = (c: CustoExtra) =>
    executar(c.id, async () => {
      if (!window.confirm(`Voltar "${c.tipo}" da NF ${c.notaFiscal || '—'} para "aguardando validação"?${c.lancadoNoCte ? ' O valor sai do Custo extra do CT-e.' : ''}`)) return;
      if (c.lancadoNoCte) await ajustarCte(c, -1);
      await gravar([{ ...c, status: c.enviadoEm ? 'Enviado' : 'Pendente', validadoEm: undefined, validadoPor: undefined, motivoRecusa: undefined, lancadoNoCte: false }]);
    });
  const excluir = (c: CustoExtra) =>
    executar(c.id, async () => {
      if (!window.confirm(`Excluir o custo extra "${c.tipo}" da NF ${c.notaFiscal || '—'}?${c.lancadoNoCte ? ' O valor também sai do Custo extra do CT-e.' : ''}`)) return;
      if (c.lancadoNoCte) await ajustarCte(c, -1);
      await excluirCustoExtra(c.id);
      setItens((a) => (a || []).filter((x) => x.id !== c.id));
    });

  /** Planilha de validação da empresa: os "a enviar" dela (ou, se não houver, os aguardando). */
  const enviarParaValidacao = (chave: string, lista: CustoExtra[]) =>
    executar(`env-${chave}`, async () => {
      const aEnviar = lista.filter((c) => c.status === 'Pendente');
      const itensPlanilha = aEnviar.length ? aEnviar : lista.filter((c) => c.status === 'Enviado');
      if (!itensPlanilha.length) return setErro('Não há custos a enviar para esta empresa.');
      const envioId = aEnviar.length ? `CE-${hoje().replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` : itensPlanilha[0].envioId || `CE-${hoje().replace(/-/g, '')}`;
      const modelo = modelos.get(chave);
      let arq: File;
      if (modelo) {
        const r = await fetch(await obterUrlArquivo(modelo.arquivoRef));
        if (!r.ok) throw new Error('Não consegui baixar a planilha modelo desta empresa. Confira em "Formato da planilha".');
        arq = await gerarPlanilhaPeloModelo(modelo, await r.arrayBuffer(), itensPlanilha[0].clienteNome, paraPlanilha(itensPlanilha), envioId);
      } else arq = await gerarPlanilhaValidacao(itensPlanilha[0].clienteNome, itensPlanilha, envioId);
      baixarBlob(arq, arq.name);
      if (aEnviar.length) {
        const agora = new Date().toISOString();
        await gravar(aEnviar.map((c) => ({ ...c, status: 'Enviado' as const, envioId, enviadoEm: agora })));
      }
      const cli = itensPlanilha[0].clienteId ? clientePorId.get(itensPlanilha[0].clienteId) : undefined;
      const email = cli?.emailPrincipal || '';
      if (window.confirm(`Planilha "${arq.name}" baixada.\n\nAbrir um e-mail${email ? ` para ${email}` : ''} já com o assunto? (anexe a planilha baixada)`)) {
        const total = itensPlanilha.reduce((s, c) => s + c.valor, 0);
        const pedido = modelo ? 'Por favor, confiram e nos respondam este e-mail com a validação.' : 'Por favor, preencham a coluna "De acordo?" com S ou N e nos respondam este e-mail.';
        const corpo = `Prezados,\n\nSegue em anexo a planilha de custos extras (${envioId}) para validação: ${itensPlanilha.length} item(ns), total de ${formatCurrency(total)}.\n\n${pedido}\n\nAtenciosamente,\nFinanceiro — JM Transportes`;
        window.open(`mailto:${email}?subject=${encodeURIComponent(`Validação de custos extras — ${itensPlanilha[0].clienteNome} (${envioId})`)}&body=${encodeURIComponent(corpo)}`);
      }
    });

  return (
    <div className="space-y-4" data-texto-livre="true">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight normal-case">Custos extras</h1>
            <p className="text-xs text-slate-500">Atrele o custo a uma nota, mande a planilha para a empresa validar e lance no CT-e quando aprovado.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEscolhendoFormato(true)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" /> Planilhas das empresas
          </button>
          <button type="button" onClick={() => setEditando('novo')} className="px-4 py-2 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Novo custo extra
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['Todos', ...STATUS_CUSTO_EXTRA] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${status === s ? 'bg-[#C48229] border-[#C48229] text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
            {s === 'Todos' ? 'Todos' : ROTULO[s]}
            {s !== 'Todos' && ` (${contagem(s)})`}
          </button>
        ))}
        <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="ml-auto px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white">
          <option value="">Todas as empresas</option>
          {empresas.map(([k, nome]) => (
            <option key={k} value={k}>
              {nome}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="NF, CT-e, descrição..." className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white w-48" />
        </div>
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}

      {itens === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : grupos.length === 0 ? (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">Nenhum custo extra {status !== 'Todos' ? `"${ROTULO[status]}"` : ''} aqui.</p>
      ) : (
        grupos.map(([chave, lista]) => {
          const pendentes = lista.filter((c) => c.status === 'Pendente').length;
          const aguardando = lista.filter((c) => c.status === 'Enviado').length;
          return (
            <div key={chave} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-900">{lista[0].clienteNome}</p>
                  <p className="text-[11px] text-slate-500">
                    {lista.length} custo(s) · {formatCurrency(lista.reduce((s, c) => s + c.valor, 0))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormatoDe({ chave, nome: lista[0].clienteNome })}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                  title="Usar a planilha no formato que esta empresa pede"
                >
                  <Settings2 className="w-4 h-4" />
                  {modelos.has(chave) ? 'Formato do cliente' : 'Formato padrão JMT'}
                </button>
                {(pendentes > 0 || aguardando > 0) && (
                  <button
                    type="button"
                    disabled={!!ocupado}
                    onClick={() => enviarParaValidacao(chave, lista)}
                    className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    title={pendentes ? 'Gera a planilha com os custos "a enviar" e marca como enviados' : 'Gera de novo a planilha dos que aguardam validação'}
                  >
                    {ocupado === `env-${chave}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    {pendentes ? `Planilha para validação (${pendentes})` : 'Baixar planilha de novo'}
                    <Mail className="w-3.5 h-3.5 opacity-80" />
                  </button>
                )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[860px]">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">NF / CT-e</th>
                      <th className="p-2.5">Destino</th>
                      <th className="p-2.5">Tipo / descrição</th>
                      <th className="p-2.5 text-right">Valor</th>
                      <th className="p-2.5">Situação</th>
                      <th className="p-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100 align-top">
                        <td className="p-2.5 whitespace-nowrap">{dataBr(c.dataOcorrencia)}</td>
                        <td className="p-2.5">
                          <b className="text-slate-900">{c.notaFiscal || '—'}</b>
                          <span className="block text-[10px] text-slate-400">CT-e {c.numeroCte || '—'}</span>
                        </td>
                        <td className="p-2.5 max-w-[180px]">
                          <span className="block truncate">{c.destinatario || '—'}</span>
                          <span className="block text-[10px] text-slate-400">{c.cidade}</span>
                        </td>
                        <td className="p-2.5 max-w-[240px]">
                          <b className="text-slate-800">{c.tipo}</b>
                          {c.descricao && <span className="block text-slate-500">{c.descricao}</span>}
                          {c.status === 'Recusado' && c.motivoRecusa && <span className="block text-rose-700">Motivo: {c.motivoRecusa}</span>}
                        </td>
                        <td className="p-2.5 text-right font-bold whitespace-nowrap">{formatCurrency(c.valor)}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${ESTILO[c.status]}`}>{ROTULO[c.status]}</span>
                          {c.envioId && <span className="block text-[10px] text-slate-400 mt-0.5">{c.envioId}{c.enviadoEm ? ` · ${dataBr(c.enviadoEm.slice(0, 10))}` : ''}</span>}
                          {c.status === 'Aprovado' && (
                            <span className="block text-[10px] text-emerald-700 mt-0.5">
                              {c.lancadoNoCte ? 'No CT-e' : 'Lançar no CT-e à mão'}
                              {c.validadoPor ? ` · ${c.validadoPor}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="flex justify-end gap-1">
                            {(c.status === 'Pendente' || c.status === 'Enviado') && (
                              <>
                                <button type="button" disabled={!!ocupado} onClick={() => aprovar(c)} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50" title="Empresa aprovou — lança no CT-e">
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button type="button" disabled={!!ocupado} onClick={() => setRecusando(c)} className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50" title="Empresa recusou">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {(c.status === 'Aprovado' || c.status === 'Recusado') && (
                              <button type="button" disabled={!!ocupado} onClick={() => desfazer(c)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Desfazer a validação">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {c.status !== 'Aprovado' && (
                              <button type="button" onClick={() => setEditando(c)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Editar">
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button type="button" disabled={!!ocupado} onClick={() => excluir(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Excluir">
                              {ocupado === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {editando && (
        <CustoExtraModal
          inicial={editando === 'novo' ? null : editando}
          lancamentos={lancamentos}
          clientes={clientes}
          onClose={() => setEditando(null)}
          onSalvar={async (c) => {
            await gravar([{ ...c, criadoPor: c.criadoPor || currentUser?.nome }]);
            setEditando(null);
            if (status !== 'Todos' && status !== c.status) setStatus(c.status);
          }}
        />
      )}
      {formatoDe && (
        <ModeloPlanilhaModal
          chave={formatoDe.chave}
          empresa={formatoDe.nome}
          modelo={modelos.get(formatoDe.chave)}
          itensTeste={paraPlanilha((itens || []).filter((c) => chaveEmpresa(c) === formatoDe.chave && (c.status === 'Pendente' || c.status === 'Enviado')))}
          usuario={currentUser?.nome}
          onClose={() => setFormatoDe(null)}
          onSalvo={(m) => {
            setModelos((atual) => {
              const novo = new Map(atual);
              if (m) novo.set(formatoDe.chave, m);
              else novo.delete(formatoDe.chave);
              return novo;
            });
            setFormatoDe(null);
          }}
        />
      )}
      {escolhendoFormato && (
        <EscolherEmpresaModal
          clientes={clientes}
          modelos={modelos}
          onClose={() => setEscolhendoFormato(false)}
          onEscolher={(chave, nome) => {
            setEscolhendoFormato(false);
            setFormatoDe({ chave, nome });
          }}
        />
      )}
      {recusando && (
        <RecusaModal
          custo={recusando}
          onClose={() => setRecusando(null)}
          onConfirmar={async (motivo, quem) => {
            await gravar([{ ...recusando, status: 'Recusado', motivoRecusa: motivo, validadoPor: quem || undefined, validadoEm: new Date().toISOString() }]);
            setRecusando(null);
          }}
        />
      )}
    </div>
  );
};

/** Lançar/editar um custo extra: escolhe a nota (pela NF ou CT-e), o tipo (do tarifário do cliente ou outro) e o valor. */
const CustoExtraModal: React.FC<{
  inicial: CustoExtra | null;
  lancamentos: LancamentoFaturamentoAereo[];
  clientes: Cliente[];
  onClose: () => void;
  onSalvar: (c: CustoExtra) => Promise<void>;
}> = ({ inicial, lancamentos, clientes, onClose, onSalvar }) => {
  const [lanc, setLanc] = useState<LancamentoFaturamentoAereo | undefined>(inicial?.lancamentoId ? lancamentos.find((l) => l.id === inicial.lancamentoId) : undefined);
  const [busca, setBusca] = useState(inicial?.notaFiscal || '');
  const [tipo, setTipo] = useState(inicial?.tipo || '');
  const [descricao, setDescricao] = useState(inicial?.descricao || '');
  const [valor, setValor] = useState(inicial ? String(inicial.valor).replace('.', ',') : '');
  const [data, setData] = useState(inicial?.dataOcorrencia || hoje());
  const [calculadora, setCalculadora] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const resultados = useMemo(() => {
    const t = busca.trim().replace(/^0+/, '').toLowerCase();
    if (t.length < 3 || lanc) return [];
    return lancamentos
      .filter((l) => [l.notaFiscal, l.numeroCte].some((x) => (x || '').replace(/^0+/, '').toLowerCase().includes(t)))
      .slice(0, 8);
  }, [busca, lancamentos, lanc]);

  const cliente = lanc?.clienteId ? clientes.find((c) => c.id === lanc.clienteId) : undefined;
  const opcoesTarifa = (cliente?.tabelaFrete?.custosExtras || []).filter((c) => c.tipoCobranca !== 'Valor/KM');
  const nomeOpcao = (c: (typeof opcoesTarifa)[number]) => [c.categoria, c.grupoDestinatario, c.itemDescricao].filter(Boolean).join(' — ');

  /** `direto` = vem da calculadora: grava com esses dados sem esperar o "Salvar". */
  const salvar = async (direto?: { valor: number; tipo: string; descricao: string }) => {
    const v = direto ? direto.valor : Number(valor.replace(/\./g, '').replace(',', '.'));
    const tipoFinal = (direto ? direto.tipo : tipo).trim();
    const descricaoFinal = (direto ? direto.descricao : descricao).trim();
    if (!lanc && !inicial) return setErro('Escolha a nota (busque pela NF ou pelo CT-e).');
    if (!tipoFinal) return setErro('Informe o tipo do custo extra.');
    if (!v || v <= 0) return setErro('Informe o valor.');
    setSalvando(true);
    setErro(null);
    try {
      const base = lanc
        ? {
            lancamentoId: lanc.id,
            clienteId: lanc.clienteId,
            clienteNome: cliente?.nomeFantasia || lanc.clienteNome || 'Sem cliente',
            notaFiscal: lanc.notaFiscal,
            numeroCte: lanc.numeroCte,
            destinatario: lanc.destinatario,
            cidade: lanc.cidadeDestino,
          }
        : {};
      await onSalvar({
        ...(inicial || { id: novoIdCustoExtra(), status: 'Pendente' as const, lancadoNoCte: false, criadoEm: new Date().toISOString(), clienteNome: '' }),
        ...base,
        tipo: tipoFinal,
        descricao: descricaoFinal || undefined,
        valor: v,
        dataOcorrencia: data || undefined,
      } as CustoExtra);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  const campo = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white';
  const clienteCalc = cliente?.id || inicial?.clienteId;
  return (
    <>
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3 text-xs" onClick={(e) => e.stopPropagation()} data-texto-livre="true">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-black text-slate-900 normal-case tracking-normal">{inicial ? 'Editar custo extra' : 'Novo custo extra'}</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="font-bold text-slate-600">Nota (NF ou CT-e)</label>
          {lanc ? (
            <div className="mt-1 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start justify-between gap-2">
              <div>
                <b className="text-slate-900">NF {lanc.notaFiscal || '—'}</b> · CT-e {lanc.numeroCte || '—'}
                <span className="block text-slate-600">
                  {cliente?.nomeFantasia || lanc.clienteNome} → {lanc.destinatario || '—'} ({lanc.cidadeDestino || '—'})
                </span>
              </div>
              <button type="button" onClick={() => setLanc(undefined)} className="text-[11px] font-bold text-[#92611F]">
                Trocar
              </button>
            </div>
          ) : (
            <>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o número da NF ou do CT-e" className={`${campo} mt-1`} autoFocus />
              {resultados.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {resultados.map((l) => (
                    <button key={l.id} type="button" onClick={() => setLanc(l)} className="w-full text-left p-2 hover:bg-amber-50">
                      <b>NF {l.notaFiscal || '—'}</b> · CT-e {l.numeroCte || '—'} · {l.clienteNome}
                      <span className="block text-[10px] text-slate-500">
                        {l.destinatario} ({l.cidadeDestino}) · {dataBr(l.dataEmissao)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {busca.trim().length >= 3 && resultados.length === 0 && <p className="mt-1 text-[11px] text-slate-500">Nenhuma nota com esse número no Controle Financeiro.</p>}
            </>
          )}
        </div>

        <div>
          <label className="font-bold text-slate-600">Tipo do custo extra</label>
          {opcoesTarifa.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const o = opcoesTarifa.find((x) => x.id === e.target.value);
                if (!o) return;
                setTipo(nomeOpcao(o));
                if (o.valor) setValor(String(o.valor).replace('.', ','));
              }}
              className={`${campo} mt-1`}
            >
              <option value="">Escolher do tarifário do cliente...</option>
              {opcoesTarifa.map((o) => (
                <option key={o.id} value={o.id}>
                  {nomeOpcao(o)} {o.valor ? `— ${formatCurrency(o.valor)}` : ''}
                </option>
              ))}
            </select>
          )}
          <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ex.: Reentrega, Paletização, Taxa de espera" className={`${campo} mt-1`} />
        </div>
        <div>
          <label className="font-bold text-slate-600">Descrição (o que aconteceu)</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className={`${campo} mt-1`} placeholder="Ex.: destinatário fechado na 1ª tentativa, reentrega no dia seguinte" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-600">Valor (R$)</label>
              <button type="button" onClick={() => setCalculadora(true)} className="text-[11px] font-bold text-[#92611F] hover:underline flex items-center gap-1" title="Calcular pela tabela de frete do cliente">
                <Calculator className="w-3.5 h-3.5" /> Calculadora
              </button>
            </div>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${campo} mt-1 text-right font-bold`} />
          </div>
          <div>
            <label className="font-bold text-slate-600">Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={`${campo} mt-1`} />
          </div>
        </div>
        {erro && <p className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</p>}
        <button type="button" onClick={() => salvar()} disabled={salvando} className="w-full py-2.5 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
        </button>
      </div>
    </div>
    {calculadora && (
      <CalculadoraFreteModal
        clientes={clientes}
        clienteInicialId={clienteCalc}
        inicial={
          lanc
            ? {
                modal: /rodo/i.test(lanc.modal || '') ? 'Rodoviário' : lanc.modal ? 'Aéreo' : undefined,
                cidade: lanc.cidadeDestino,
                pesoKg: lanc.pesoTaxado || lanc.pesoKg,
                valorNF: lanc.valorNF,
              }
            : { cidade: inicial?.cidade }
        }
        rotuloUsar={lanc || inicial ? 'Registrar no custo extra' : 'Usar no custo extra'}
        onClose={() => setCalculadora(false)}
        onUsar={(f) => {
          const novoTipo = tipo.trim() || (f.modal === 'Dedicado' ? 'Dedicado' : `Frete ${f.modal}`);
          const detalhe = (f.linhas || []).map((l) => `${l.label}: ${formatCurrency(l.valor)}`).join('; ');
          const calculo = `Calculado pela tabela do cliente: ${f.modal} para ${f.destino}${f.pesoKg ? `, ${String(f.pesoKg).replace('.', ',')} kg` : ''}${detalhe ? ` (${detalhe})` : ''}.`;
          const novaDescricao = descricao.trim() ? `${descricao.trim()}\n${calculo}` : calculo;
          setValor(f.total.toFixed(2).replace('.', ','));
          setTipo(novoTipo);
          setDescricao(novaDescricao);
          setCalculadora(false);
          // Com a nota escolhida, já registra o custo; sem nota, só preenche e pede a nota.
          if (lanc || inicial) salvar({ valor: Math.round(f.total * 100) / 100, tipo: novoTipo, descricao: novaDescricao });
          else setErro('Valor calculado. Agora escolha a nota (NF ou CT-e) e clique em Salvar.');
        }}
      />
    )}
    </>
  );
};

const RecusaModal: React.FC<{ custo: CustoExtra; onClose: () => void; onConfirmar: (motivo: string, quem: string) => Promise<void> }> = ({ custo, onClose, onConfirmar }) => {
  const [motivo, setMotivo] = useState('');
  const [quem, setQuem] = useState('');
  const [salvando, setSalvando] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3 text-xs" onClick={(e) => e.stopPropagation()} data-texto-livre="true">
        <h3 className="text-sm font-black text-slate-900 normal-case tracking-normal">Empresa recusou</h3>
        <p className="text-slate-500">
          {custo.tipo} · NF {custo.notaFiscal || '—'} · {formatCurrency(custo.valor)}
        </p>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Motivo informado pela empresa" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
        <input value={quem} onChange={(e) => setQuem(e.target.value)} placeholder="Quem respondeu (opcional)" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
        <button
          type="button"
          disabled={salvando || !motivo.trim()}
          onClick={async () => {
            setSalvando(true);
            await onConfirmar(motivo.trim(), quem.trim()).catch(() => setSalvando(false));
          }}
          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
        >
          Registrar recusa
        </button>
      </div>
    </div>
  );
};

/** Escolher a empresa para cadastrar/ver o formato da planilha (mesmo sem custo lançado). */
const EscolherEmpresaModal: React.FC<{
  clientes: Cliente[];
  modelos: Map<string, ModeloPlanilhaCusto>;
  onClose: () => void;
  onEscolher: (chave: string, nome: string) => void;
}> = ({ clientes, modelos, onClose, onEscolher }) => {
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return clientes
      .filter((c) => !t || [c.nomeFantasia, c.razaoSocial, c.cnpj].some((x) => (x || '').toLowerCase().includes(t)))
      .sort((a, b) => Number(modelos.has(b.id)) - Number(modelos.has(a.id)) || (a.nomeFantasia || a.razaoSocial).localeCompare(b.nomeFantasia || b.razaoSocial));
  }, [clientes, modelos, busca]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case">Planilhas das empresas</h2>
            <p className="text-xs text-slate-500">Escolha a empresa para cadastrar a planilha no formato dela. Sem formato, vai a planilha padrão JMT.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa..." className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs" />
          </div>
        </div>
        <div className="overflow-y-auto divide-y divide-slate-100">
          {lista.map((c) => {
            const nome = c.nomeFantasia || c.razaoSocial;
            const m = modelos.get(c.id);
            return (
              <button key={c.id} type="button" onClick={() => onEscolher(c.id, nome)} className="w-full px-5 py-2.5 text-left hover:bg-amber-50/50 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 truncate">{nome}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${m ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  {m ? 'Formato do cliente' : 'Padrão JMT'}
                </span>
              </button>
            );
          })}
          {lista.length === 0 && <p className="p-6 text-center text-xs text-slate-500">Nenhuma empresa encontrada.</p>}
        </div>
      </div>
    </div>
  );
};
