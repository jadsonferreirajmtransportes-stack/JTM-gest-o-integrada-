import React from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Target,
  ShieldCheck,
  Calendar,
  Users,
  ArrowUpRight,
  Briefcase,
  ChevronRight,
  Send,
} from 'lucide-react';
import { ProjetoGerencial, StatusProjeto, CategoriaProjeto } from '../../types';

interface ProjetosDashboardTabProps {
  projetos: ProjetoGerencial[];
  onSelectProjeto: (p: ProjetoGerencial) => void;
  onOpenNovoProjeto: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenResumo?: (p: ProjetoGerencial) => void;
}

export const ProjetosDashboardTab: React.FC<ProjetosDashboardTabProps> = ({
  projetos,
  onSelectProjeto,
  onOpenNovoProjeto,
  onNavigateTab,
  onOpenResumo,
}) => {
  const totalProjetos = projetos.length;
  const emAndamento = projetos.filter((p) => p.status === 'Em Andamento').length;
  const concluidos = projetos.filter((p) => p.status === 'Concluído').length;
  const planejamento = projetos.filter((p) => p.status === 'Planejamento').length;
  const emRevisao = projetos.filter((p) => p.status === 'Em Revisão').length;

  const orcamentoTotal = projetos.reduce((acc, p) => acc + (p.orcamentoPrevisto || 0), 0);
  const custoTotalRealizado = projetos.reduce((acc, p) => acc + (p.custoRealizado || 0), 0);
  const economiaTotal = orcamentoTotal - custoTotalRealizado;

  const progressoMedio = totalProjetos > 0
    ? Math.round(projetos.reduce((acc, p) => acc + (p.progressoPercentual || 0), 0) / totalProjetos)
    : 0;

  const projetosRDC430 = projetos.filter((p) => p.alinhamentoRDC430).length;

  // Next critical milestones
  const allMarcos = projetos.flatMap((p) =>
    (p.marcos || []).map((m) => ({
      ...m,
      projetoCodigo: p.codigo,
      projetoTitulo: p.titulo,
      projetoObj: p,
    }))
  );
  const marcosPendentes = allMarcos
    .filter((m) => !m.concluido)
    .sort((a, b) => new Date(a.dataLimite).getTime() - new Date(b.dataLimite).getTime())
    .slice(0, 5);

  // Categories count
  const categoriaCounts: Record<string, number> = {};
  projetos.forEach((p) => {
    categoriaCounts[p.categoria] = (categoriaCounts[p.categoria] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome / Strategy Banner */}
      <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-[#8A6A39] border border-amber-200 uppercase tracking-wider">
              Governança Corporativa JMT
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              RDC 430/2020 ANVISA
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Painel Executivo de Projetos & Planejamento Estratégico
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Acompanhamento centralizado de CAPEX, expansão de hubs, digitalização de telemetria,
            qualificação de rotas térmicas e conformidade sanitária em toda a malha logística.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenNovoProjeto}
            className="px-4 py-2.5 bg-gradient-to-r from-[#B38F4F] to-[#B38F4F] hover:from-[#8A6A39] hover:to-[#8A6A39] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#B38F4F]/30 transition-all flex items-center gap-2"
          >
            <FolderKanban className="w-4 h-4" />
            + Novo Projeto Estratégico
          </button>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Projetos</span>
            <FolderKanban className="w-4 h-4 text-[#B38F4F]" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalProjetos}</span>
            <span className="text-xs text-slate-500 ml-1 font-medium">iniciativas</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>{emAndamento} em andamento</span>
            <span className="font-bold text-emerald-600">{concluidos} entregues</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Progresso Médio</span>
            <TrendingUp className="w-4 h-4 text-[#B38F4F]" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-[#B38F4F] font-mono">{progressoMedio}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#B38F4F] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressoMedio}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Orçamento Previsto</span>
            <DollarSign className="w-4 h-4 text-slate-600" />
          </div>
          <div className="my-2">
            <span className="text-xl font-black text-slate-900 font-mono">
              {orcamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Capex + Opex Aprovados</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Custo Realizado</span>
            <TrendingUp className="w-4 h-4 text-[#B38F4F]" />
          </div>
          <div className="my-2">
            <span className="text-xl font-black text-slate-900 font-mono">
              {custoTotalRealizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </span>
          </div>
          <span className={`text-[11px] font-bold ${economiaTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            Saldo: {economiaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Qualidade RDC 430</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{projetosRDC430}</span>
            <span className="text-xs text-slate-500 ml-1">alinhados</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">100% validados pela RT</span>
        </div>
      </div>

      {/* 2-Column Split: Active Projects Highlights & Milestones Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Active Projects Progress Table / Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Iniciativas Estratégicas em Andamento</h3>
              <p className="text-xs text-slate-500">Principais projetos de expansão, tecnologia e conformidade</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('portfolio')}
              className="text-xs font-bold text-[#8A6A39] hover:text-[#5c4526] flex items-center gap-1"
            >
              Ver Portfólio Completo →
            </button>
          </div>

          <div className="space-y-3">
            {projetos.slice(0, 4).map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProjeto(p)}
                className="p-3.5 bg-slate-50/70 hover:bg-amber-50/50 rounded-xl border border-slate-200 hover:border-amber-300 transition-all cursor-pointer space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white text-[#8A6A39] border border-slate-200 shadow-2xs">
                      {p.codigo}
                    </span>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#5c4526] truncate max-w-md">
                      {p.titulo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenResumo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenResumo(p);
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Enviar Resumo (WhatsApp / E-mail)"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'Concluído'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'Em Andamento'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                    <span>Líder: <strong className="text-slate-700">{p.liderProjetoNome}</strong></span>
                    <span>•</span>
                    <span>Setor: <strong className="text-slate-700">{p.setorImpactado}</strong></span>
                    <span>•</span>
                    <span>Previsão: <strong className="text-slate-700">{p.dataPrevisaoFim}</strong></span>
                  </div>
                  <span className="font-mono font-bold text-[#8A6A39]">{p.progressoPercentual}%</span>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#B38F4F] h-full rounded-full transition-all duration-300"
                    style={{ width: `${p.progressoPercentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Upcoming Critical Milestones */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#B38F4F]" />
              Próximos Marcos Críticos
            </h3>
            <p className="text-xs text-slate-500">Deadlines regulatórios e operacionais prioritários</p>
          </div>

          <div className="space-y-3 my-2">
            {marcosPendentes.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Todos os marcos concluídos!</p>
            ) : (
              marcosPendentes.map((marco) => (
                <div
                  key={marco.id}
                  onClick={() => onSelectProjeto(marco.projetoObj)}
                  className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-lg border border-slate-200 hover:border-amber-300 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#8A6A39] font-bold">
                      {marco.projetoCodigo}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      {marco.dataLimite}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                    {marco.titulo}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Resp: {marco.responsavel || 'Equipe'}
                  </p>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('cronograma')}
            className="w-full py-2 bg-slate-100 hover:bg-amber-100 text-[#8A6A39] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            Ver Cronograma Completo
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Strategic Category Pills breakdown */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Distribuição de Iniciativas por Eixo Estratégico
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {Object.entries(categoriaCounts).map(([cat, count]) => (
            <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <span className="text-xs font-bold text-slate-700 block truncate" title={cat}>
                {cat}
              </span>
              <span className="text-lg font-black text-[#8A6A39] font-mono block">
                {count} {count === 1 ? 'projeto' : 'projetos'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
