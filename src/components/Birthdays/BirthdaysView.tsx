import React, { useState, useMemo } from 'react';
import {
  Cake,
  PartyPopper,
  Sparkles,
  Send,
  Copy,
  Mail,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Phone,
  Building2,
  Users,
  Heart,
  Baby,
  Smile,
  CheckCircle2,
  LayoutGrid,
  List,
  Flame,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Colaborador, Empregador, Dependente } from '../../types';
import {
  parseBirthdayInfo,
  MONTH_NAMES,
  SHORT_MONTH_NAMES,
  BirthdayInfo,
  compileBirthdayMessage,
  BIRTHDAY_TEMPLATES,
  buildWhatsAppLink,
} from '../../utils/birthdayUtils';
import { exportAniversariantesReport } from '../../utils/exportUtils';
import { BirthdayCelebrationModal } from './BirthdayCelebrationModal';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

interface BirthdaysViewProps {
  colaboradores: Colaborador[];
  empregadores: Empregador[];
  onSelectColaborador: (c: Colaborador) => void;
  onNotifySuccess?: (msg: string) => void;
}

type BirthdayTab = 'destaques' | 'mes' | 'anual' | 'dependentes';

export const BirthdaysView: React.FC<BirthdaysViewProps> = ({
  colaboradores,
  empregadores,
  onSelectColaborador,
  onNotifySuccess,
}) => {
  const hoje = new Date();
  const currentMonthNum = hoje.getMonth() + 1; // 1-12

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [activeTab, setActiveTab] = useState<BirthdayTab>('mes');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [selectedEmpregador, setSelectedEmpregador] = useState<string>('todos');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [celebrationColab, setCelebrationColab] = useState<Colaborador | null>(null);

  // Active employees with valid birth date
  const activeColaboradores = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo' && c.dataNascimento),
    [colaboradores]
  );

  // Calculate parsed info for all active employees
  const colabsWithInfo = useMemo(() => {
    return activeColaboradores
      .map((c) => {
        const info = parseBirthdayInfo(c.dataNascimento);
        return {
          colaborador: c,
          info: info!,
        };
      })
      .filter((item) => item.info !== null);
  }, [activeColaboradores]);

  // Counts by month for the 12-month badges
  const countByMonth = useMemo(() => {
    const counts = Array(13).fill(0);
    colabsWithInfo.forEach(({ info }) => {
      if (info.mes >= 1 && info.mes <= 12) {
        counts[info.mes] += 1;
      }
    });
    return counts;
  }, [colabsWithInfo]);

  // KPIs
  const aniversariantesHoje = useMemo(
    () => colabsWithInfo.filter(({ info }) => info.isHoje),
    [colabsWithInfo]
  );

  const aniversariantesSemana = useMemo(
    () => colabsWithInfo.filter(({ info }) => info.isEstaSemana && !info.isHoje),
    [colabsWithInfo]
  );

  const aniversariantesMesAtual = useMemo(
    () => colabsWithInfo.filter(({ info }) => info.mes === selectedMonth),
    [colabsWithInfo, selectedMonth]
  );

  // Extract all dependents with birthdays
  const allDependentes = useMemo(() => {
    const list: {
      dependente: Dependente;
      colaborador: Colaborador;
      info: BirthdayInfo;
    }[] = [];

    activeColaboradores.forEach((c) => {
      if (c.dependentes && c.dependentes.length > 0) {
        c.dependentes.forEach((dep) => {
          if (dep.dataNascimento) {
            const info = parseBirthdayInfo(dep.dataNascimento);
            if (info) {
              list.push({ dependente: dep, colaborador: c, info });
            }
          }
        });
      }
    });

    return list;
  }, [activeColaboradores]);

  const dependentesMesAtual = useMemo(() => {
    return allDependentes.filter(({ info }) => info.mes === selectedMonth);
  }, [allDependentes, selectedMonth]);

  // Unique sectors for filter dropdown
  const setoresList = useMemo(() => {
    const s = new Set<string>();
    activeColaboradores.forEach((c) => {
      if (c.setor) s.add(c.setor);
    });
    return Array.from(s).sort();
  }, [activeColaboradores]);

  // Filtered employees according to activeTab & filters
  const filteredColaboradores = useMemo(() => {
    let list = colabsWithInfo;

    if (activeTab === 'destaques') {
      list = colabsWithInfo.filter(({ info }) => info.isEstaSemana);
    } else if (activeTab === 'mes') {
      list = colabsWithInfo.filter(({ info }) => info.mes === selectedMonth);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        ({ colaborador }) =>
          colaborador.nomeCompleto.toLowerCase().includes(q) ||
          colaborador.funcaoCargo.toLowerCase().includes(q) ||
          (colaborador.setor && colaborador.setor.toLowerCase().includes(q))
      );
    }

    // Apply sector filter
    if (selectedSetor !== 'todos') {
      list = list.filter(({ colaborador }) => colaborador.setor === selectedSetor);
    }

    // Apply employer filter
    if (selectedEmpregador !== 'todos') {
      list = list.filter(
        ({ colaborador }) => colaborador.empregadorId === selectedEmpregador
      );
    }

    // Sort order
    if (activeTab === 'destaques') {
      // Sort by days remaining (0, 1, 2...)
      return [...list].sort((a, b) => a.info.diasRestantes - b.info.diasRestantes);
    } else if (activeTab === 'mes') {
      // Sort by day of month (1, 2, 3...)
      return [...list].sort((a, b) => a.info.dia - b.info.dia);
    } else {
      // Annual: sort by month then day
      return [...list].sort((a, b) => {
        if (a.info.mes !== b.info.mes) return a.info.mes - b.info.mes;
        return a.info.dia - b.info.dia;
      });
    }
  }, [
    colabsWithInfo,
    activeTab,
    selectedMonth,
    searchTerm,
    selectedSetor,
    selectedEmpregador,
  ]);

  // Filtered dependents
  const filteredDependentes = useMemo(() => {
    let list = allDependentes.filter(({ info }) => info.mes === selectedMonth);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        ({ dependente, colaborador }) =>
          dependente.nome.toLowerCase().includes(q) ||
          colaborador.nomeCompleto.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => a.info.dia - b.info.dia);
  }, [allDependentes, selectedMonth, searchTerm]);

  // Quick 1-click WhatsApp copy/send
  const handleQuickWhatsApp = (c: Colaborador, info: BirthdayInfo) => {
    if (!c.telefoneWhatsapp) {
      // Open modal so user can provide phone
      setCelebrationColab(c);
      return;
    }
    const template = BIRTHDAY_TEMPLATES[0];
    const msg = compileBirthdayMessage(template.texto, {
      nome: c.nomeCompleto,
      cargo: c.funcaoCargo,
      idade: info.idadeCompletando,
    });
    const url = buildWhatsAppLink(c.telefoneWhatsapp, msg);
    window.open(url, '_blank');
  };

  const handleQuickCopy = async (c: Colaborador, info: BirthdayInfo) => {
    const template = BIRTHDAY_TEMPLATES[0];
    const msg = compileBirthdayMessage(template.texto, {
      nome: c.nomeCompleto,
      cargo: c.funcaoCargo,
      idade: info.idadeCompletando,
    });
    try {
      await navigator.clipboard.writeText(msg);
      if (onNotifySuccess) {
        onNotifySuccess(`Mensagem de parabéns para ${c.nomeCompleto.split(' ')[0]} copiada!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="jmt-print-doc space-y-6">
      {/* Top Header & Page Actions */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Cake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Aniversariantes & Central de Felicitações
              </h1>
              {aniversariantesHoje.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  {aniversariantesHoje.length} Hoje!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhe as datas comemorativas, gere cartões virtuais e envie mensagens de parabéns personalizadas pelo WhatsApp ou E-mail.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Imprimir Mural de Aniversariantes do Mês"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir Mural</span>
          </button>

          <button
            type="button"
            onClick={() => exportAniversariantesReport(colaboradores, selectedMonth, 'xlsx')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar XLSX</span>
          </button>
        </div>
      </div>

      <PrintDocumentHeader
        titulo="MURAL DE ANIVERSARIANTES"
        subtitulo="Comunicado Interno — Departamento Pessoal"
        metadados={`Mês de Referência: ${MONTH_NAMES[selectedMonth - 1]} de ${hoje.getFullYear()}`}
      />

      {/* KPI Metric Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Card 1: Aniversariantes de Hoje */}
        <div
          onClick={() => {
            setActiveTab('destaques');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            aniversariantesHoje.length > 0
              ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white border-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-800 border-slate-200 shadow-xs hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                aniversariantesHoje.length > 0 ? 'text-amber-100' : 'text-slate-500'
              }`}
            >
              Aniversariantes de Hoje
            </span>
            <div
              className={`p-2 rounded-xl ${
                aniversariantesHoje.length > 0
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Cake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {aniversariantesHoje.length}
            </span>
            <span
              className={`text-xs font-semibold ${
                aniversariantesHoje.length > 0 ? 'text-amber-100' : 'text-slate-400'
              }`}
            >
              {aniversariantesHoje.length === 1 ? 'colaborador hoje' : 'colaboradores hoje'}
            </span>
          </div>
          {aniversariantesHoje.length > 0 ? (
            <p className="text-[11px] text-amber-100 font-medium mt-1 truncate">
              {aniversariantesHoje.map((a) => a.colaborador.nomeCompleto.split(' ')[0]).join(', ')} 🎉
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">
              Nenhum aniversariante hoje
            </p>
          )}
        </div>

        {/* Card 2: Aniversariantes do Mês Selecionado */}
        <div
          onClick={() => setActiveTab('mes')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Neste Mês ({MONTH_NAMES[selectedMonth - 1]})
            </span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <PartyPopper className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {aniversariantesMesAtual.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              colaboradores
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total de celebrações corporativas
          </p>
        </div>

        {/* Card 3: Próximos em 7 Dias */}
        <div
          onClick={() => setActiveTab('destaques')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Próximos em 7 Dias
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {aniversariantesSemana.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              na sequência
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Prepare as felicitações da semana
          </p>
        </div>

        {/* Card 4: Dependentes Aniversariantes */}
        <div
          onClick={() => setActiveTab('dependentes')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dependentes no Mês
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Baby className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {dependentesMesAtual.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              filhos e familiares
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ações de carinho com as famílias
          </p>
        </div>
      </div>

      {/* 12-Month Selector Strip */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Navegar por Mês:</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setSelectedMonth((prev) => (prev === 1 ? 12 : prev - 1))
                }
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedMonth((prev) => (prev === 12 ? 1 : prev + 1))
                }
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            {MONTH_NAMES[selectedMonth - 1]} ({countByMonth[selectedMonth]} aniversariantes)
          </span>
        </div>

        {/* 12 Month Pills */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {MONTH_NAMES.map((mName, index) => {
            const mNum = index + 1;
            const isSelected = selectedMonth === mNum;
            const isCurrentMonth = currentMonthNum === mNum;
            const count = countByMonth[mNum];

            return (
              <button
                key={mNum}
                type="button"
                onClick={() => {
                  setSelectedMonth(mNum);
                  if (activeTab === 'destaques') setActiveTab('mes');
                }}
                className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-white font-black shadow-sm ring-2 ring-amber-400/40'
                    : isCurrentMonth
                    ? 'bg-amber-50 text-amber-900 border border-amber-300 font-bold hover:bg-amber-100'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium'
                }`}
              >
                <span className="text-[11px] uppercase tracking-wider">
                  {SHORT_MONTH_NAMES[index]}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold mt-0.5 ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'mes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Mês ({MONTH_NAMES[selectedMonth - 1]})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('destaques')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'destaques'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Destaques (7 Dias)</span>
              {(aniversariantesHoje.length > 0 || aniversariantesSemana.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('anual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'anual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Todos os Meses (Anual)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dependentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'dependentes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Baby className="w-3.5 h-3.5 text-purple-600" />
              <span>Dependentes & Família</span>
              {dependentesMesAtual.length > 0 && (
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 rounded-full">
                  {dependentesMesAtual.length}
                </span>
              )}
            </button>
          </div>

          {/* Search & Layout Toggle */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar aniversariante..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewLayout === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewLayout === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sector and Employer Secondary Filters */}
        {activeTab !== 'dependentes' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtrar por:</span>
            </div>

            <select
              value={selectedSetor}
              onChange={(e) => setSelectedSetor(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-700 text-xs bg-slate-50 font-medium"
            >
              <option value="todos">Todos os Setores ({setoresList.length})</option>
              {setoresList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={selectedEmpregador}
              onChange={(e) => setSelectedEmpregador(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-700 text-xs bg-slate-50 font-medium"
            >
              <option value="todos">Todas as Empresas ({empregadores.length})</option>
              {empregadores.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nomeFantasia || emp.razaoSocial}
                </option>
              ))}
            </select>

            {(selectedSetor !== 'todos' || selectedEmpregador !== 'todos' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSetor('todos');
                  setSelectedEmpregador('todos');
                  setSearchTerm('');
                }}
                className="text-[11px] text-amber-700 hover:underline font-semibold ml-auto"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONTENT AREA */}
      {activeTab === 'dependentes' ? (
        /* DEPENDENTS VIEW */
        <div className="space-y-4">
          <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Aniversariantes da Família & Dependentes — {MONTH_NAMES[selectedMonth - 1]}
                </h3>
                <p className="text-xs text-slate-500">
                  Felicite os colaboradores pelo aniversário dos seus filhos e familiares cadastrados no DP.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-purple-100 text-purple-900 px-3 py-1 rounded-full">
              {filteredDependentes.length} dependentes
            </span>
          </div>

          {filteredDependentes.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
              <Baby className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhum dependente faz aniversário no mês de {MONTH_NAMES[selectedMonth - 1]}.
              </p>
              <p className="text-xs text-slate-400">
                Alterne os meses acima para visualizar os outros períodos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDependentes.map(({ dependente, colaborador, info }) => {
                const emp = empregadores.find((e) => e.id === colaborador.empregadorId);
                return (
                  <div
                    key={dependente.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                            {info.dia}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              {dependente.parentesco}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">
                              {dependente.nome}
                            </h4>
                          </div>
                        </div>

                        {info.isHoje && (
                          <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-full animate-bounce">
                            HOJE! 🎂
                          </span>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs border border-slate-100">
                        <div className="text-slate-500 text-[11px]">
                          Colaborador(a) / Responsável:
                        </div>
                        <div className="font-bold text-slate-800">
                          {colaborador.nomeCompleto}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {colaborador.funcaoCargo} • Setor: {colaborador.setor || 'Geral'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                        <span>
                          🎂 {info.dataFormatada}
                        </span>
                        <span className="font-semibold text-purple-800">
                          {info.idadeCompletando ? `Completando ${info.idadeCompletando} anos` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Congratulate Employee Action */}
                    <button
                      type="button"
                      onClick={() => {
                        const template = BIRTHDAY_TEMPLATES.find((t) => t.id === 'dependente') || BIRTHDAY_TEMPLATES[0];
                        const msg = compileBirthdayMessage(template.texto, {
                          nome: colaborador.nomeCompleto,
                          cargo: colaborador.funcaoCargo,
                          nomeDependente: dependente.nome,
                          idade: info.idadeCompletando,
                        });
                        if (colaborador.telefoneWhatsapp) {
                          const url = buildWhatsAppLink(colaborador.telefoneWhatsapp, msg);
                          window.open(url, '_blank');
                        } else {
                          setCelebrationColab(colaborador);
                        }
                      }}
                      className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 text-purple-700" />
                      <span>Felicitar {colaborador.nomeCompleto.split(' ')[0]}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* EMPLOYEE BIRTHDAYS VIEW (Grid or Table) */
        <div className="space-y-4">
          {filteredColaboradores.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
              <Cake className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhum aniversariante encontrado
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há colaboradores cadastrados para os filtros selecionados no mês de {MONTH_NAMES[selectedMonth - 1]}. Experimente trocar o mês ou limpar a busca.
              </p>
            </div>
          ) : viewLayout === 'grid' ? (
            /* GRID CARDS VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {filteredColaboradores.map(({ colaborador, info }) => {
                const emp = empregadores.find((e) => e.id === colaborador.empregadorId);

                return (
                  <div
                    key={colaborador.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                      info.isHoje
                        ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                        : info.isEstaSemana
                        ? 'bg-amber-50/40 border-amber-200 shadow-xs hover:border-amber-300'
                        : 'bg-white border-slate-200 shadow-xs hover:border-amber-300'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Card Top: Date Badge & Status */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Day Avatar */}
                          <div
                            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-xs ${
                              info.isHoje
                                ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                                : info.isEstaSemana
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            <span className="text-base leading-none">{info.dia}</span>
                            <span className="text-[9px] uppercase tracking-wider mt-0.5">
                              {SHORT_MONTH_NAMES[info.mes - 1]}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3
                                onClick={() => onSelectColaborador(colaborador)}
                                className="font-bold text-slate-900 text-sm hover:text-amber-700 cursor-pointer transition-colors"
                              >
                                {colaborador.nomeCompleto}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              {colaborador.funcaoCargo}
                            </p>
                          </div>
                        </div>

                        {/* Status / Countdown Badge */}
                        {info.isHoje ? (
                          <span className="text-[10px] bg-rose-600 text-white font-black px-2.5 py-1 rounded-full shadow-xs animate-pulse flex items-center gap-1 shrink-0">
                            <Sparkles className="w-3 h-3" />
                            <span>É HOJE! 🎂</span>
                          </span>
                        ) : info.diasRestantes === 1 ? (
                          <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full shadow-xs shrink-0">
                            Amanhã! 🎉
                          </span>
                        ) : info.isEstaSemana ? (
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                            Em {info.diasRestantes} dias
                          </span>
                        ) : null}
                      </div>

                      {/* Info Metadata Box */}
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400 text-[11px]">Setor:</span>
                          <span className="font-semibold text-slate-800">
                            {colaborador.setor || 'Geral'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-400 text-[11px]">Idade / Ciclo:</span>
                          <span className="font-semibold text-amber-800 flex items-center gap-1">
                            {info.idadeCompletando ? `Completando ${info.idadeCompletando} anos` : '-'}
                            <span className="text-slate-400 font-normal">({info.signo})</span>
                          </span>
                        </div>

                        {colaborador.telefoneWhatsapp && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-400 text-[11px]">WhatsApp:</span>
                            <span className="font-medium text-emerald-700 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {colaborador.telefoneWhatsapp}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={() => setCelebrationColab(colaborador)}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                            info.isHoje
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 shadow-md'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          <PartyPopper className="w-4 h-4" />
                          <span>Mandar Mensagem de Parabéns</span>
                        </button>
                      </div>

                      {/* Quick Icons Strip */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleQuickCopy(colaborador, info)}
                          className="hover:text-slate-800 flex items-center gap-1 transition-colors font-medium"
                          title="Copiar mensagem rápida"
                        >
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar Texto</span>
                        </button>

                        {colaborador.telefoneWhatsapp && (
                          <button
                            type="button"
                            onClick={() => handleQuickWhatsApp(colaborador, info)}
                            className="hover:text-emerald-700 text-emerald-600 flex items-center gap-1 transition-colors font-bold"
                            title="Enviar direto no WhatsApp"
                          >
                            <Send className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp Direto</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-3">Cargo / Função</th>
                      <th className="py-3 px-3">Setor</th>
                      <th className="py-3 px-3">Idade</th>
                      <th className="py-3 px-3">WhatsApp / Contato</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredColaboradores.map(({ colaborador, info }) => (
                      <tr
                        key={colaborador.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          info.isHoje ? 'bg-amber-50/50 font-medium' : ''
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                info.isHoje
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {info.dia}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {MONTH_NAMES[info.mes - 1]}
                            </span>
                            {info.isHoje && (
                              <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.2 rounded-full">
                                HOJE
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div
                            onClick={() => onSelectColaborador(colaborador)}
                            className="font-bold text-slate-900 hover:text-amber-700 cursor-pointer"
                          >
                            {colaborador.nomeCompleto}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Matrícula: {colaborador.codigoMatricula}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-700">
                          {colaborador.funcaoCargo}
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700 text-[11px]">
                            {colaborador.setor || 'Geral'}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-amber-800">
                            {info.idadeCompletando ? `${info.idadeCompletando} anos` : '-'}
                          </span>
                          <span className="text-slate-400 text-[10px] block">
                            {info.signo}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {colaborador.telefoneWhatsapp ? (
                            <span className="flex items-center gap-1 font-medium text-emerald-700">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {colaborador.telefoneWhatsapp}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Não informado</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickCopy(colaborador, info)}
                              className="p-1.5 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Copiar mensagem"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {colaborador.telefoneWhatsapp && (
                              <button
                                type="button"
                                onClick={() => handleQuickWhatsApp(colaborador, info)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
                                title="Mandar direto no WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setCelebrationColab(colaborador)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <PartyPopper className="w-3.5 h-3.5" />
                              <span>Felicitar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <PrintDocumentFooter />

      {/* Birthday Celebration & Message Modal */}
      {celebrationColab && (
        <BirthdayCelebrationModal
          isOpen={!!celebrationColab}
          onClose={() => setCelebrationColab(null)}
          colaborador={celebrationColab}
          empresaNome="Jobson de Moraes Transportes (JMT)"
          onNotifySuccess={onNotifySuccess}
        />
      )}
    </div>
  );
};
