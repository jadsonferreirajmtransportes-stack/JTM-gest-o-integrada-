import React, { useMemo, useState } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  Target,
  Building2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Colaborador,
  CustoOperacional,
  LancamentoFaturamentoAereo,
  ProjetoGerencial,
  OrcamentoItem,
  TipoLinhaOrcamento,
  UserRole,
} from '../../types';
import { formatMoney } from '../../utils/formatters';
import {
  SetorDre,
  calcularDreGerencial,
  calcularOrcadoRealizado,
  TIPOS_LINHA_ORCAMENTO,
} from '../../utils/controladoriaUtils';

interface ControladoriaViewProps {
  custosOperacionais: CustoOperacional[];
  colaboradores: Colaborador[];
  lancamentosFaturamentoAereo: LancamentoFaturamentoAereo[];
  projetos: ProjetoGerencial[];
  orcamentos: OrcamentoItem[];
  userRole: UserRole;
  onSaveOrcamento: (item: OrcamentoItem) => void;
}

const SETORES: { id: SetorDre; label: string }[] = [
  { id: 'consolidado', label: 'Consolidado (JMT)' },
  { id: 'farma_aereo', label: 'Farma Aéreo' },
  { id: 'farma_rodoviario', label: 'Farma Rodoviário' },
  { id: 'geral', label: 'Geral / Administrativo' },
];

function competenciaAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

function mesLabel(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const idx = Number(mes) - 1;
  return `${nomes[idx] || mes} de ${ano}`;
}

const LinhaLista: React.FC<{ itens: { categoria: string; valor: number }[] }> = ({ itens }) => {
  const [aberto, setAberto] = useState(false);
  if (itens.length === 0) return null;
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 font-semibold"
      >
        {aberto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {itens.length} categoria{itens.length > 1 ? 's' : ''}
      </button>
      {aberto && (
        <div className="mt-1 space-y-0.5 pl-4 border-l-2 border-slate-100">
          {itens.map((i) => (
            <div key={i.categoria} className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{i.categoria}</span>
              <span className="font-mono">{formatMoney(i.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ControladoriaView: React.FC<ControladoriaViewProps> = ({
  custosOperacionais,
  colaboradores,
  lancamentosFaturamentoAereo,
  projetos,
  orcamentos,
  userRole,
  onSaveOrcamento,
}) => {
  const [aba, setAba] = useState<'dre' | 'orcamento'>('dre');
  const [setor, setSetor] = useState<SetorDre>('consolidado');
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const podeEditarOrcamento = userRole === 'admin';

  const dre = useMemo(
    () =>
      calcularDreGerencial({
        setor,
        competencia,
        custosOperacionais,
        colaboradores,
        lancamentosFaturamentoAereo,
        projetos,
      }),
    [setor, competencia, custosOperacionais, colaboradores, lancamentosFaturamentoAereo, projetos]
  );

  const linhasOrcamento = useMemo(
    () => calcularOrcadoRealizado(orcamentos, setor, competencia, dre),
    [orcamentos, setor, competencia, dre]
  );

  const resultadoPositivo = dre.resultadoPeriodo >= 0;

  const handleEditarPlanejado = (tipoLinha: TipoLinhaOrcamento, valor: number) => {
    if (setor === 'consolidado') return;
    const existente = orcamentos.find(
      (o) => o.setor === setor && o.tipoLinha === tipoLinha && o.competencia === competencia
    );
    const item: OrcamentoItem = {
      id: existente?.id || `orc-${setor}-${tipoLinha}-${competencia}`.replace(/\s+/g, '_'),
      setor,
      tipoLinha,
      competencia,
      valorPlanejado: valor,
      criadoEm: existente?.criadoEm || new Date().toISOString(),
    };
    onSaveOrcamento(item);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho / Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Calculator className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Controladoria</h2>
            <p className="text-[11px] text-slate-500">DRE Gerencial e Orçado x Realizado</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={setor}
            onChange={(e) => setSetor(e.target.value as SetorDre)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          >
            {SETORES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setAba('dre')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
            aba === 'dre' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          DRE Gerencial
        </button>
        <button
          type="button"
          onClick={() => setAba('orcamento')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
            aba === 'orcamento' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Orçado x Realizado
        </button>
      </div>

      {aba === 'dre' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* DRE detalhada */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-bold text-slate-700">
                Resultado — {mesLabel(competencia)} · {SETORES.find((s) => s.id === setor)?.label}
              </h3>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Receita Operacional</span>
                <span className="font-mono font-bold text-emerald-700">{formatMoney(dre.receita)}</span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">(−) Custos Variáveis</span>
                  <span className="font-mono text-rose-600">{formatMoney(dre.custosVariaveis)}</span>
                </div>
                <LinhaLista itens={dre.itensCustosVariaveis} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-bold">
                <span className="text-slate-800">(=) Margem de Contribuição</span>
                <span className="font-mono text-slate-900">
                  {formatMoney(dre.margemContribuicao)}{' '}
                  <span className="text-slate-400 font-normal">({dre.margemContribuicaoPercentual.toFixed(1)}%)</span>
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">(−) Custos Fixos Operacionais</span>
                  <span className="font-mono text-rose-600">{formatMoney(dre.custosFixosOperacionais)}</span>
                </div>
                <LinhaLista itens={dre.itensCustosFixos} />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">(−) Folha de Pagamento ({dre.folha.headcount} colab.)</span>
                  <span className="font-mono text-rose-600">{formatMoney(dre.folha.total)}</span>
                </div>
                <div className="mt-1 pl-4 border-l-2 border-slate-100 space-y-0.5 text-[11px] text-slate-500">
                  <div className="flex justify-between"><span>Salários + Gratificações</span><span className="font-mono">{formatMoney(dre.folha.salarios + dre.folha.gratificacoes)}</span></div>
                  <div className="flex justify-between"><span>VT + VA</span><span className="font-mono">{formatMoney(dre.folha.beneficios)}</span></div>
                  <div className="flex justify-between"><span>Encargos CLT (~35,44%)</span><span className="font-mono">{formatMoney(dre.folha.encargos)}</span></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-bold">
                <span className="text-slate-800">(=) Resultado Operacional</span>
                <span className={`font-mono ${dre.resultadoOperacional >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatMoney(dre.resultadoOperacional)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">(−) Investimentos (CAPEX no ano)</span>
                <span className="font-mono text-rose-600">{formatMoney(dre.capexDoAno)}</span>
              </div>

              <div className={`flex items-center justify-between pt-2 border-t-2 font-bold text-sm ${resultadoPositivo ? 'border-emerald-200' : 'border-rose-200'}`}>
                <span className="text-slate-900">(=) Resultado do Período</span>
                <span className={`font-mono flex items-center gap-1 ${resultadoPositivo ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {resultadoPositivo ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {formatMoney(dre.resultadoPeriodo)}
                </span>
              </div>
            </div>
          </div>

          {/* Cards laterais: indicadores + avisos */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Scale className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide">Ponto de Equilíbrio</span>
              </div>
              <p className="text-lg font-bold text-slate-900">
                {dre.pontoEquilibrioReceita !== null ? formatMoney(dre.pontoEquilibrioReceita) : '—'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {dre.pontoEquilibrioReceita !== null
                  ? 'Receita necessária no mês pra cobrir todos os custos fixos.'
                  : 'Não calculável — margem de contribuição zero ou negativa no período.'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide">Margem de Contribuição</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{dre.margemContribuicaoPercentual.toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500 mt-1">
                De cada R$ 1,00 faturado, {formatMoney(Math.max(dre.margemContribuicaoPercentual, 0) / 100)} sobra pra cobrir custo fixo e gerar resultado.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-900 leading-relaxed flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Como ler esta DRE</p>
                <p>Só mostra dado realmente lançado no sistema (Custos Operacionais, Colaboradores ativos, Faturamento, Projetos) — sem estimativa. A Folha reflete o quadro <strong>atual</strong> de colaboradores (não uma folha histórica mês a mês), e o CAPEX é somado por <strong>ano</strong> da competência, não por mês exato.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {aba === 'orcamento' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700">
              Orçado x Realizado — {mesLabel(competencia)} · {SETORES.find((s) => s.id === setor)?.label}
            </h3>
            {setor === 'consolidado' && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Consolidado é só leitura — selecione um setor pra lançar orçamento.
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-2 font-semibold">Linha</th>
                  <th className="px-4 py-2 font-semibold text-right">Planejado</th>
                  <th className="px-4 py-2 font-semibold text-right">Realizado</th>
                  <th className="px-4 py-2 font-semibold text-right">Desvio</th>
                  <th className="px-4 py-2 font-semibold text-center">Situação</th>
                </tr>
              </thead>
              <tbody>
                {linhasOrcamento.map((l) => (
                  <tr key={l.tipoLinha} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{l.tipoLinha}</td>
                    <td className="px-4 py-2.5 text-right">
                      {podeEditarOrcamento && setor !== 'consolidado' ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={l.planejado || ''}
                          onBlur={(e) => handleEditarPlanejado(l.tipoLinha, Number(e.target.value) || 0)}
                          placeholder="0,00"
                          className="w-28 text-right px-2 py-1 border border-slate-200 rounded-md font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                        />
                      ) : (
                        <span className="font-mono">{formatMoney(l.planejado)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatMoney(l.realizado)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${
                      l.favoravel === null ? 'text-slate-400' : l.favoravel ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {formatMoney(l.desvio)}
                      {l.desvioPercentual !== null && (
                        <span className="text-[10px] ml-1">({l.desvioPercentual >= 0 ? '+' : ''}{l.desvioPercentual.toFixed(0)}%)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {l.favoravel === null ? (
                        <span className="text-[10px] text-slate-400">sem orçamento</span>
                      ) : l.favoravel ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          <Target className="w-3 h-3" /> Favorável
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          <TrendingDown className="w-3 h-3" /> Desvio
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!podeEditarOrcamento && (
            <div className="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-500">
              Só administradores podem lançar/editar o orçamento planejado.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
