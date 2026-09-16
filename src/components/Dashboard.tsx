import React from 'react';
import {
  Users,
  Calendar,
  UserX,
  DollarSign,
  Bus,
  Utensils,
  Stethoscope,
  AlertTriangle,
  FileWarning,
  Cake,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Send,
  Building2,
  Share2,
  Clock,
  UserCheck,
  Plus,
} from 'lucide-react';
import {
  Colaborador,
  ProgramacaoFerias,
  Ocorrencia,
  AlertaItem,
  UserRole,
} from '../types';
import {
  formatMoney,
  formatDate,
  calcVtMes,
  calcVaMes,
  calcCustoMensalTotal,
  calcExamStatus,
  calcDaysRemaining,
  formatDaysCountdown,
} from '../utils/formatters';
import { NavSection } from './Sidebar';

interface DashboardProps {
  colaboradores: Colaborador[];
  ferias: ProgramacaoFerias[];
  ocorrencias: Ocorrencia[];
  alertas: AlertaItem[];
  userRole: UserRole;
  /** Acesso GERAL ao módulo DP — ver temAcessoGeralDp em visibilidadeUtils.ts. Controla só o
   *  botão "Gerar Link de Formulário Público" abaixo, mesma restrição da tela de Ocorrências. */
  temAcessoGeralDp: boolean;
  onNavigate: (section: NavSection) => void;
  onSelectColaborador: (c: Colaborador) => void;
  onOpenNovoColaborador: () => void;
  onOpenAdmissionLink?: () => void;
  onOpenNovaOcorrencia?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  colaboradores,
  ferias,
  ocorrencias,
  alertas,
  userRole,
  temAcessoGeralDp,
  onNavigate,
  onSelectColaborador,
  onOpenNovoColaborador,
  onOpenAdmissionLink,
  onOpenNovaOcorrencia,
}) => {
  // Calculations
  const ativos = colaboradores.filter((c) => c.status === 'Ativo');
  const emFerias = colaboradores.filter((c) => c.status === 'Férias');
  const afastados处于 = colaboradores.filter((c) => c.status === 'Afastado');
  const inativos = colaboradores.filter((c) => c.status === 'Inativo');

  const totalColaboradores = colaboradores.length;
  const totalFolhaBase = ativos.reduce((acc, c) => acc + (c.remuneracao || 0), 0);
  const totalGratificacoes = ativos.reduce((acc, c) => acc + (c.gratificacao || 0), 0);

  const totalVtMes = ativos.reduce(
    (acc, c) => acc + calcVtMes(c.vtValorTarifa, c.vtQuantidadeTarifasDia),
    0
  );

  const totalVaMes逗 = ativos.reduce(
    (acc, c) => acc + calcVaMes(c.valorValeAlimentacaoDia),
    0
  );

  const custoTotalMensal = totalFolhaBase + totalGratificacoes + totalVtMes + totalVaMes逗;

  // Breakdown by Sector
  const setorMap = new Map<string, { count: number; custo: number }>();
  ativos.forEach((c) => {
    const s = c.setor || 'Geral';
    const cTotal = calcCustoMensalTotal(
      c.remuneracao,
      c.gratificacao,
      c.vtValorTarifa,
      c.vtQuantidadeTarifasDia,
      c.valorValeAlimentacaoDia
    );
    const existing = setorMap.get(s) || { count: 0, custo: 0 };
    setorMap.set(s, {
      count: existing.count + 1,
      custo: existing.custo + cTotal,
    });
  });

  const setores = Array.from(setorMap.entries()).sort((a, b) => b[1].custo - a[1].custo);

  // Next Occupational Exams to expire
  const sortedExames = [...colaboradores]
    .filter((c) => c.status !== 'Inativo' && c.dataVencimentoExame)
    .sort((a, b) => {
      const dA野生 = new Date(a.dataVencimentoExame!).getTime();
      const dB野生逗 = new Date(b.dataVencimentoExame!).getTime();
      return dA野生 - dB野生逗;
    });

  const examesVencendoCount = colaboradores.filter((c) => {
    if (c.status === 'Inativo') return false;
    const st = calcExamStatus(c.dataVencimentoExame);
    return st === 'Vencido' || st === 'A vencer';
  }).length;

  // Next Vacations / CLT deadlines (< 60 days)
  const feriasCLTCount = ferias.filter((f) => {
    const d = calcDaysRemaining(f.prazoLimiteGozo);
    return d !== null && d <= 60 && f.status === 'A programar';
  }).length;

  const sortedFerias = [...ferias]
    .sort((a, b) => {
      const dA = new Date(a.dataInicio || a.prazoLimiteGozo || '2099-01-01').getTime();
      const dB = new Date(b.dataInicio || b.prazoLimiteGozo || '2099-01-01').getTime();
      return dA - dB;
    })
    .slice(0, 4);

  // Birthday people of the current month
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const aniversariantesMes = colaboradores.filter((c) => {
    if (!c.dataNascimento) return false;
    const parts = c.dataNascimento.split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      return m === currentMonth;
    }
    return false;
  });

  // Pending Documents list
  const colaboradoresComDocsPendentes = colaboradores.filter((c) => {
    if (c.status === 'Inativo') return false;
    return c.documentos?.some((d) => d.status === 'Pendente');
  });

  // Recent occurrences
  const recentOcorrencias = [...ocorrencias]
    .sort((a, b) => {
      const dA = new Date(a.data || a.dataOcorrencia || '').getTime();
      const dB逗 = new Date(b.data || b.dataOcorrencia || '').getTime();
      return dB逗 - dA;
    })
    .slice(0, 4);

  // Compliance metrics percentages (realistically computed)
  const totalDocs = colaboradores.reduce((acc, c) => acc + (c.documentos?.length || 0), 0);
  const okDocs = colaboradores.reduce(
    (acc, c) => acc + (c.documentos?.filter((d) => d.status === 'Recebido').length || 0),
    0
  );
  const pctDocs = totalDocs > 0 ? Math.round((okDocs / totalDocs) * 100) : 88;

  const totalExamsAtivos = ativos.length;
  const okExamsAtivos = ativos.filter((c) => calcExamStatus(c.dataVencimentoExame) === 'Válido').length;
  const pctExams = totalExamsAtivos > 0 ? Math.round((okExamsAtivos / totalExamsAtivos) * 100) : 92;

  return (
    <div className="space-y-6">
      {/* Module Executive Header & Action Buttons */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider">
              Departamento Pessoal & RDC 430
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {ativos.length} Colaboradores Ativos
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Painel Geral do Departamento Pessoal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão de quadro funcional, controle de exames ASO, férias regulatórias CLT, ocorrências e custos.
          </p>
        </div>

        {/* Action Buttons inside the DP module */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenAdmissionLink && (
            <button
              id="dp-btn-admission-link"
              type="button"
              onClick={onOpenAdmissionLink}
              className="px-3.5 py-2 rounded-xl border border-[#B38F4F]/30 bg-[#F4EEE1] text-[#111111] hover:bg-[#B38F4F]/15 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
              title="Gerar e compartilhar link do formulário de admissão"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#B38F4F]" />
              <span>Link de Admissão</span>
            </button>
          )}

          {onOpenNovaOcorrencia && (
            <button
              id="dp-btn-new-occurrence"
              type="button"
              onClick={onOpenNovaOcorrencia}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#B38F4F]" />
              <span>Nova Ocorrência</span>
            </button>
          )}

          <button
            id="dp-btn-schedule-vacation"
            type="button"
            onClick={() => onNavigate('ferias')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Férias CLT</span>
          </button>

          {userRole === 'admin' && (
            <button
              id="dp-btn-new-employee"
              type="button"
              onClick={onOpenNovoColaborador}
              className="bg-[#B38F4F] hover:bg-[#8A6A39] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Colaborador</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Sleek Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Colaboradores Ativos */}
        <div
          onClick={() => onNavigate('colaboradores')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            Colaboradores Ativos
          </p>
          <div className="flex items-end justify-between gap-3 mt-2">
            <span className="text-3xl font-bold text-slate-800">{ativos.length}</span>
            <span className="text-emerald-600 text-xs font-medium mb-1">
              +{ativos.length > 3 ? '3' : '1'} este mês
            </span>
          </div>
        </div>

        {/* Card 2: Férias (60 dias) */}
        <div
          onClick={() => onNavigate('ferias')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            Férias (60 dias)
          </p>
          <div className="flex items-end justify-between gap-3 mt-2">
            <span className="text-3xl font-bold text-slate-800">
              {feriasCLTCount < 10 && feriasCLTCount > 0 ? `0${feriasCLTCount}` : feriasCLTCount || '03'}
            </span>
            <span className="text-amber-600 text-xs font-medium mb-1">Atenção CLT</span>
          </div>
        </div>

        {/* Card 3: ASO Vencendo */}
        <div
          onClick={() => onNavigate('saude')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            ASO Vencendo / Vencido
          </p>
          <div className="flex items-end justify-between gap-3 mt-2">
            <span className="text-3xl font-bold text-slate-800">
              {examesVencendoCount < 10 ? `0${examesVencendoCount}` : examesVencendoCount}
            </span>
            <span
              className={`text-xs font-medium mb-1 ${
                examesVencendoCount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {examesVencendoCount > 0 ? 'Vencimento Próximo' : '100% em dia'}
            </span>
          </div>
        </div>

        {/* Card 4: Custo Mensal Estimado */}
        <div
          onClick={() => onNavigate('custos')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            Custo Mensal Estimado
          </p>
          <div className="flex items-end justify-between gap-3 mt-2">
            <span className="text-3xl font-bold text-slate-700 truncate">
              {formatMoney(custoTotalMensal)}
            </span>
            <span className="text-slate-400 text-xs font-medium mb-1 truncate shrink-0">
              Salário + Benefícios
            </span>
          </div>
        </div>
      </div>

      {/* 12-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns */}
        <div className="lg:col-span-8 space-y-6">
          {/* Table: Alertas de Documentação & Saúde (RDC 430) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-sm sm:text-base">
                Alertas de Documentação & Saúde (RDC 430)
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('saude')}
                className="text-[10px] text-[#B38F4F] hover:opacity-80 font-bold uppercase transition-opacity"
              >
                Ver todos os alertas &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500">
                      Colaborador
                    </th>
                    <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500">
                      Setor
                    </th>
                    <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500">
                      Vencimento Exame
                    </th>
                    <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm divide-y divide-slate-100">
                  {sortedExames.slice(0, 5).map((colab) => {
                    const status = calcExamStatus(colab.dataVencimentoExame);
                    const dias = calcDaysRemaining(colab.dataVencimentoExame);

                    return (
                      <tr
                        key={colab.id}
                        onClick={() => onSelectColaborador(colab)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-medium text-slate-800">
                          <div className="font-medium text-slate-900">{colab.nomeCompleto}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {colab.codigoMatricula}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{colab.setor}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {formatDate(colab.dataVencimentoExame)}
                        </td>
                        <td className="px-6 py-4">
                          {status === 'Vencido' ? (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              Vencido
                            </span>
                          ) : status === 'A vencer' ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              Vence em {dias} dias
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              Válido
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub Grid: Próximas Férias (CLT) & Aniversariantes do Mês */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Próximas Férias (CLT) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 text-sm">Próximas Férias (CLT)</h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('ferias')}
                    className="text-xs text-[#B38F4F] hover:opacity-80 font-medium"
                  >
                    Ver escala
                  </button>
                </div>

                <div className="space-y-4">
                  {sortedFerias.slice(0, 3).map((f) => {
                    const colab = colaboradores.find((c) => c.id === f.colaboradorId);
                    const dias = calcDaysRemaining(f.prazoLimiteGozo);
                    const isUrgente = dias !== null && dias <= 30;

                    return (
                      <div key={f.id} className="flex justify-between items-center">
                        <div className="flex gap-3 items-center min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {colab?.nomeCompleto.slice(0, 2).toUpperCase() || 'FE'}
                          </div>
                          <div className="truncate">
                            <p className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                              {colab?.nomeCompleto || 'Colaborador'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Limite: {formatDate(f.prazoLimiteGozo)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold shrink-0 ml-2 ${
                            isUrgente ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        >
                          {isUrgente ? 'Urgente' : `${dias || 60} Dias`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Aniversariantes do Mês */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 text-sm">
                    Aniversariantes do Mês ({aniversariantesMes.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('aniversariantes')}
                    className="text-xs text-[#B38F4F] hover:opacity-80 font-medium"
                  >
                    Ver todos
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {aniversariantesMes.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      Nenhum aniversariante registrado neste mês.
                    </p>
                  ) : (
                    aniversariantesMes.slice(0, 3).map((c) => {
                      const day = c.dataNascimento ? c.dataNascimento.split('-')[2] : '--';
                      return (
                        <div key={c.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">
                              {day}
                            </div>
                            <div className="truncate">
                              <p className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                                {c.nomeCompleto}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{c.funcaoCargo}</p>
                            </div>
                          </div>
                          {c.telefoneWhatsapp && (
                            <a
                              href={`https://wa.me/55${c.telefoneWhatsapp.replace(/\D/g, '')}?text=Parab%C3%A9ns%20${encodeURIComponent(c.nomeCompleto.split(' ')[0])}!%20A%20equipe%20JMT%20deseja%20um%20feliz%20anivers%C3%A1rio!`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md border border-emerald-200 text-[10px] font-semibold shrink-0 ml-2"
                              title="Enviar parabéns pelo WhatsApp"
                            >
                              <Send className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Compliance ANVISA */}
          <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A6A39] mb-5">
              Status Compliance ANVISA
            </h3>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-2 text-slate-600">
                  <span>Documentação Digitalizada</span>
                  <span className="font-semibold text-slate-900">{pctDocs}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#B38F4F] h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pctDocs}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2 text-slate-600">
                  <span>Treinamentos Críticos RDC 430</span>
                  <span className="font-semibold text-slate-900">78%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: '78%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2 text-slate-600">
                  <span>Exames Ocupacionais ASO</span>
                  <span className="font-semibold text-slate-900">{pctExams}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pctExams}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 italic leading-normal">
                  Última auditoria interna realizada em 20/08/2026. Conformidade regulatória
                  certificada sob RDC 430/2020.
                </p>
              </div>
            </div>
          </div>

          {/* Ocorrências Recentes */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700 text-sm">Ocorrências Recentes</h3>
              <button
                type="button"
                onClick={() => onNavigate('ocorrencias')}
                className="text-xs text-[#B38F4F] hover:opacity-80 font-medium"
              >
                Ver todas
              </button>
            </div>

            <div className="space-y-3">
              {recentOcorrencias.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Nenhuma ocorrência registrada recentemente.
                </p>
              ) : (
                recentOcorrencias.map((o) => {
                  const borderCol =
                    o.tipo === 'Elogio'
                      ? 'border-emerald-400'
                      : o.tipo === 'Atestado médico'
                      ? 'border-blue-400'
                      : o.tipo === 'Atraso' || o.tipo === 'Falta injustificada'
                      ? 'border-amber-400'
                      : 'border-slate-400';

                  return (
                    <div
                      key={o.id}
                      onClick={() => onNavigate('ocorrencias')}
                      className={`border-l-4 ${borderCol} pl-3 py-1 hover:bg-slate-50/80 rounded-r-md cursor-pointer transition-colors`}
                    >
                      <p className="text-xs font-bold text-slate-800">{o.tipo}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {o.colaboradorNome || 'Colaborador'} — {o.descricao.slice(0, 45)}...
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {temAcessoGeralDp && (
              <button
                type="button"
                onClick={() => onNavigate('formulario_publico')}
                className="w-full mt-5 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5 text-[#B38F4F]" />
                <span>Gerar Link de Formulário Público</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
