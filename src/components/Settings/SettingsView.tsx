import React, { useState } from 'react';
import {
  Building2,
  Briefcase,
  AlertTriangle,
  FileCheck,
  UserCheck,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  DollarSign,
  ShieldCheck,
  MapPin,
  HeartHandshake,
  Utensils,
  Award,
  BookOpen,
} from 'lucide-react';
import {
  Empregador,
  CargoSalario,
  MotivoOcorrenciaConfig,
  TipoContratoBeneficio,
  Supervisor,
  FeriadoEmpresa,
  UserRole,
  Operacao,
} from '../../types';
import { formatMoney, formatDate, calcDaysRemaining } from '../../utils/formatters';
import { CCT_PISOS_SALARIAIS, CCT_METADATA } from '../../data/cctData';
import { ICON_OPTIONS, resolveOperacaoIcon } from '../../utils/iconResolver';

const CORES_OPERACAO = [
  { de: 'from-sky-600', ate: 'to-blue-800', borda: 'border-sky-500', label: 'Azul' },
  { de: 'from-emerald-600', ate: 'to-teal-800', borda: 'border-emerald-500', label: 'Verde' },
  { de: 'from-[#C48229]', ate: 'to-[#5c4526]', borda: 'border-[#C48229]', label: 'Bronze' },
  { de: 'from-purple-600', ate: 'to-purple-900', borda: 'border-purple-500', label: 'Roxo' },
  { de: 'from-rose-600', ate: 'to-rose-900', borda: 'border-rose-500', label: 'Rosa' },
  { de: 'from-slate-700', ate: 'to-slate-900', borda: 'border-slate-500', label: 'Grafite' },
];

interface SettingsViewProps {
  empregadores: Empregador[];
  cargos: CargoSalario[];
  supervisores: Supervisor[];
  feriados: FeriadoEmpresa[];
  operacoes: Operacao[];
  userRole: UserRole;
  onAddEmpregador: (e: Empregador) => void;
  onAddCargo: (c: CargoSalario) => void;
  onAddSupervisor: (s: Supervisor) => void;
  onAddFeriado: (f: FeriadoEmpresa) => void;
  onSaveOperacao: (o: Operacao) => void;
  onDeleteOperacao: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  empregadores,
  cargos,
  supervisores,
  feriados,
  operacoes,
  userRole,
  onAddEmpregador,
  onAddCargo,
  onAddSupervisor,
  onAddFeriado,
  onSaveOperacao,
  onDeleteOperacao,
}) => {
  const [activeTab, setActiveTab] = useState<
    'cct' | 'cargos' | 'supervisores' | 'empregadores' | 'feriados' | 'operacoes'
  >('cct');

  // New Operação Form
  const [opNome, setOpNome] = useState('');
  const [opNomeCurto, setOpNomeCurto] = useState('');
  const [opIcone, setOpIcone] = useState('Building2');
  const [opCorIdx, setOpCorIdx] = useState(0);
  const [opOrdem, setOpOrdem] = useState(100);

  const handleSaveOperacaoForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cor = CORES_OPERACAO[opCorIdx];
    onSaveOperacao({
      id: opNome.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
      nome: opNome.trim(),
      nomeCurto: opNomeCurto.trim() || undefined,
      icone: opIcone,
      corDe: cor.de,
      corAte: cor.ate,
      corBorda: cor.borda,
      ordem: opOrdem,
      ativo: true,
    });
    setOpNome('');
    setOpNomeCurto('');
    setOpIcone('Building2');
    setOpCorIdx(0);
    setOpOrdem(100);
    setIsAddModalOpen(false);
  };

  // Aviso de renovação da CCT — a convenção vigente tem prazo de validade (Cláusula de vigência)
  // e hoje é só um arquivo estático (src/data/cctData.ts): quando vencer, alguém (o usuário) tem
  // que providenciar o texto da próxima convenção pra eu atualizar os valores. Sem esse aviso,
  // ninguém ficaria sabendo até esbarrar no problema — mesma lógica do alerta de ASO vencendo.
  const diasParaVencerCct = calcDaysRemaining(CCT_METADATA.vigenciaFim);
  const cctStatus: 'vigente' | 'renovacao_proxima' | 'vencida' =
    diasParaVencerCct === null
      ? 'vigente'
      : diasParaVencerCct < 0
      ? 'vencida'
      : diasParaVencerCct <= 90
      ? 'renovacao_proxima'
      : 'vigente';

  // Simple Add Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Cargo Form
  const [cargoNome, setCargoNome] = useState('');
  const [cargoSetor, setCargoSetor] = useState('Operacional / Transporte');
  const [cargoMin, setCargoMin] = useState(2500);
  const [cargoMax, setCargoMax] = useState(4000);
  const [cargoPiso, setCargoPiso] = useState(2400);

  // New Supervisor Form
  const [supNome, setSupNome] = useState('');
  const [supCargo, setSupCargo] = useState('Supervisor Operacional');
  const [supSetor, setSupSetor] = useState('Transporte de Medicamentos');
  const [supEmail, setSupEmail] = useState('');
  const [supTelefone, setSupTelefone] = useState('');

  // New Empregador Form
  const [empRazao, setEmpRazao] = useState('');
  const [empFantasia, setEmpFantasia] = useState('');
  const [empCnpj, setEmpCnpj] = useState('');
  const [empCidade, setEmpCidade] = useState('');

  // New Feriado Form
  const [feriadoData, setFeriadoData] = useState('');
  const [feriadoDesc, setFeriadoDesc] = useState('');
  const [feriadoTipo, setFeriadoTipo] = useState<'Nacional' | 'Estadual' | 'Municipal' | 'Ponto Facultativo'>('Nacional');

  const handleSaveCargo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoNome) return;
    onAddCargo({
      id: `cargo-${Date.now()}`,
      cargo: cargoNome,
      setor: cargoSetor,
      faixaSalarialMinima: cargoMin,
      faixaSalarialMaxima: cargoMax,
      pisoConvencaoColetiva: cargoPiso,
    });
    setCargoNome('');
    setIsAddModalOpen(false);
  };

  const handleSaveSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supNome) return;
    onAddSupervisor({
      id: `sup-${Date.now()}`,
      nome: supNome,
      cargo: supCargo,
      setor: supSetor,
      email: supEmail,
      telefoneWhatsapp: supTelefone,
      ativo: true,
    });
    setSupNome('');
    setIsAddModalOpen(false);
  };

  const handleSaveEmpregador = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empRazao) return;
    onAddEmpregador({
      id: `emp-${Date.now()}`,
      razaoSocial: empRazao,
      nomeFantasia: empFantasia,
      cnpj: empCnpj,
      cidadeUF: empCidade,
    });
    setEmpRazao('');
    setIsAddModalOpen(false);
  };

  const handleSaveFeriado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feriadoData || !feriadoDesc) return;
    onAddFeriado({
      id: `fer-${Date.now()}`,
      data: feriadoData,
      descricao: feriadoDesc,
      tipo: feriadoTipo,
    });
    setFeriadoDesc('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold uppercase">
            Tabelas Auxiliares — Parâmetros JMT
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Configurações & Cadastros de Apoio
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie Convenção Coletiva CCT 2026/2028, Empregadores (2.1), Cargos e Faixas Salariais (2.10), Supervisores (2.17) e Feriados (2.18).
          </p>
        </div>

        {userRole === 'admin' && activeTab !== 'cct' && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>
              Adicionar{' '}
              {activeTab === 'cargos'
                ? 'Cargo'
                : activeTab === 'supervisores'
                ? 'Supervisor'
                : activeTab === 'empregadores'
                ? 'Empregador'
                : activeTab === 'operacoes'
                ? 'Operação'
                : 'Feriado'}
            </span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('cct')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'cct'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>CCT 2026/2028 (SETCERN × SINTROCERN)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cargos')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'cargos'
              ? 'border-[#C48229] text-[#C48229]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>2.10 Cargos e Salários ({cargos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supervisores')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'supervisores'
              ? 'border-[#C48229] text-[#C48229]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>2.17 Supervisores ({supervisores.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('empregadores')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'empregadores'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2.1 Empregadores ({empregadores.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feriados')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'feriados'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>2.18 Feriados / Calendário ({feriados.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operacoes')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            activeTab === 'operacoes'
              ? 'border-[#C48229] text-[#C48229]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Operações / Setores ({operacoes.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4 shadow-xs">
        {/* CCT 2026/2028 TAB */}
        {activeTab === 'cct' && (
          <div className="space-y-6">
            {/* Header info card */}
            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono font-bold uppercase">
                    Registro MTE: {CCT_METADATA.registroMte}
                  </span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-mono font-bold uppercase">
                    Processo: {CCT_METADATA.processo}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                    Reajuste Geral: {(CCT_METADATA.indiceReajuste * 100).toFixed(1)}%
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      cctStatus === 'vencida'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : cctStatus === 'renovacao_proxima'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {cctStatus === 'vencida'
                      ? `⚠️ VIGÊNCIA VENCIDA HÁ ${Math.abs(diasParaVencerCct!)} DIA(S)`
                      : cctStatus === 'renovacao_proxima'
                      ? `⚠️ RENOVAÇÃO EM ${diasParaVencerCct} DIA(S)`
                      : 'VIGENTE'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  Convenção Coletiva de Trabalho 2026/2028 (SETCERN × SINTROCERN)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sindicatos Convenentes: {CCT_METADATA.sindicatoPatronal} e {CCT_METADATA.sindicatoLaboral}.
                  Vigência: <strong>01/05/2026 a 30/04/2028</strong>.
                </p>
              </div>
            </div>

            {cctStatus !== 'vigente' && (
              <div
                className={`rounded-xl border p-4 flex items-start gap-3 ${
                  cctStatus === 'vencida'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">
                    {cctStatus === 'vencida'
                      ? `A vigência desta CCT terminou em ${formatDate(CCT_METADATA.vigenciaFim)} (há ${Math.abs(diasParaVencerCct!)} dia(s)).`
                      : `A vigência desta CCT termina em ${formatDate(CCT_METADATA.vigenciaFim)} (${diasParaVencerCct} dia(s)).`}
                  </p>
                  <p className="text-xs mt-1 opacity-90">
                    Os valores desta tela (pisos salariais, VA, VT, plano de saúde, diárias e cláusulas) são fixos no
                    código do sistema — não são atualizados sozinhos. Quando o SETCERN/SINTROCERN publicar a próxima
                    convenção, envie o texto/PDF dela para que os valores sejam atualizados aqui.
                  </p>
                </div>
              </div>
            )}

            {/* Economic highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl">
                <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  Vale Alimentação (Cláusula 15ª)
                </div>
                <div className="text-lg font-black text-amber-950 mt-1">{formatMoney(CCT_METADATA.valeAlimentacaoDia)} / dia</div>
                <div className="text-[10px] text-amber-700 mt-0.5">Mínimo 22 dias trabalhados ({formatMoney(CCT_METADATA.valeAlimentacaoDia * 22)}/mês)</div>
              </div>

              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl">
                <div className="text-[11px] font-semibold text-blue-800 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-blue-600" />
                  Plano de Saúde (Cláusula 17ª)
                </div>
                <div className="text-lg font-black text-blue-950 mt-1">{formatMoney(CCT_METADATA.subsidioPlanoSaudeMes)} / mês</div>
                <div className="text-[10px] text-blue-700 mt-0.5">Subsídio patronal obrigatório por colaborador</div>
              </div>

              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Bem Mais Benefícios (Cláusula 19ª)
                </div>
                <div className="text-lg font-black text-emerald-950 mt-1">{formatMoney(CCT_METADATA.auxilioCuidadoPessoalMes)} / mês</div>
                <div className="text-[10px] text-emerald-700 mt-0.5">Cuidado pessoal, telemedicina e auxílio</div>
              </div>

              <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-xl">
                <div className="text-[11px] font-semibold text-purple-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  Diárias de Viagem (Cláusula 14ª)
                </div>
                <div className="text-xs font-bold text-purple-950 mt-1">
                  Pernoite: {formatMoney(CCT_METADATA.diariaComPernoite)} | S/ Pernoite: {formatMoney(CCT_METADATA.diariaSemPernoite)}
                </div>
                <div className="text-[10px] text-purple-700 mt-0.5">Almoço/Jantar &gt;80km: {formatMoney(CCT_METADATA.diariaAlmoco80km)}</div>
              </div>
            </div>

            {/* Salary Floors Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tabela Oficial de Pisos Salariais por Função (Cláusula 3ª da CCT 2026/2028)
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  18 Funções Homologadas no MTE
                </span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Função Normativa</th>
                      <th className="py-2.5 px-3">CBO</th>
                      <th className="py-2.5 px-3">CNH Requerida</th>
                      <th className="py-2.5 px-3 text-right">Piso Salarial Base (R$)</th>
                      <th className="py-2.5 px-3">Adicionais Normativos Previstos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CCT_PISOS_SALARIAIS.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-900">{p.funcao}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{p.cbo || '-'}</td>
                        <td className="py-2 px-3">
                          {p.categoriaCnh ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold text-[10px]">
                              Cat. {p.categoriaCnh}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-950 bg-emerald-50/40">
                          {formatMoney(p.salarioBase)}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600">
                          {p.adicionalPadrao || 'Conforme condições operacionais'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CARGOS E SALÁRIOS */}
        {activeTab === 'cargos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Cargo / Função</th>
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3 text-right">Piso da CCT</th>
                  <th className="py-2.5 px-3 text-right">Faixa Mínima</th>
                  <th className="py-2.5 px-3 text-right">Faixa Máxima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargos.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{c.cargo}</td>
                    <td className="py-2.5 px-3 text-slate-600">{c.setor}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatMoney(c.pisoConvencaoColetiva)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatMoney(c.faixaSalarialMinima)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                      {formatMoney(c.faixaSalarialMaxima)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUPERVISORES */}
        {activeTab === 'supervisores' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Nome do Supervisor</th>
                  <th className="py-2.5 px-3">Cargo</th>
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3">Telefone</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supervisores.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{s.nome}</td>
                    <td className="py-2.5 px-3 text-slate-700">{s.cargo}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.setor}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.email || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{s.telefoneWhatsapp || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* EMPREGADORES */}
        {activeTab === 'empregadores' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Razão Social</th>
                  <th className="py-2.5 px-3">Nome Fantasia</th>
                  <th className="py-2.5 px-3">CNPJ</th>
                  <th className="py-2.5 px-3">Cidade / UF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empregadores.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{e.razaoSocial}</td>
                    <td className="py-2.5 px-3 text-slate-700">{e.nomeFantasia || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono">{e.cnpj}</td>
                    <td className="py-2.5 px-3 text-slate-600">{e.cidadeUF || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FERIADOS */}
        {activeTab === 'feriados' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Descrição do Feriado</th>
                  <th className="py-2.5 px-3">Abrangência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feriados.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 font-mono">
                      {formatDate(f.data)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{f.descricao}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        {f.tipo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* OPERAÇÕES / SETORES */}
        {activeTab === 'operacoes' && (
          <div className="overflow-x-auto">
            <p className="text-[11px] text-slate-500 mb-3">
              Cada operação ativa vira um módulo próprio no menu lateral (Empresas, Equipe,
              Faturamento e Custos) — Farma Aéreo e Farma Rodoviário são as 2 originais e
              continuam com suas telas completas (inclui Controle Financeiro); qualquer outra
              ganha o painel genérico.
            </p>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Operação</th>
                  <th className="py-2.5 px-3">Ícone</th>
                  <th className="py-2.5 px-3">Cor</th>
                  <th className="py-2.5 px-3">Ordem</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operacoes.map((op) => {
                  const OpIcon = resolveOperacaoIcon(op.icone);
                  const ehOriginal = op.id === 'farma_aereo' || op.id === 'farma_rodoviario';
                  return (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{op.nome}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{op.id}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex p-1.5 rounded-lg bg-linear-to-r ${op.corDe} ${op.corAte} text-white`}>
                          <OpIcon className="w-3.5 h-3.5" />
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`w-4 h-4 inline-block rounded bg-linear-to-r ${op.corDe} ${op.corAte}`} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{op.ordem}</td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => onSaveOperacao({ ...op, ativo: !op.ativo })}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            op.ativo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {op.ativo ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!ehOriginal && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Excluir a operação "${op.nome}"? Isso não afeta clientes/colaboradores já vinculados, só remove o módulo do menu.`)) {
                                onDeleteOperacao(op.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Excluir operação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Adicionar{' '}
                {activeTab === 'cargos'
                  ? 'Cargo'
                  : activeTab === 'supervisores'
                  ? 'Supervisor'
                  : activeTab === 'empregadores'
                  ? 'Empregador'
                  : activeTab === 'operacoes'
                  ? 'Operação'
                  : 'Feriado'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTab === 'cargos' && (
              <form onSubmit={handleSaveCargo} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Título do Cargo *</label>
                  <input
                    type="text"
                    required
                    value={cargoNome}
                    onChange={(e) => setCargoNome(e.target.value)}
                    placeholder="Ex: Motorista Carreta Frigorífica"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Setor</label>
                  <input
                    type="text"
                    value={cargoSetor}
                    onChange={(e) => setCargoSetor(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Piso CCT</label>
                    <input
                      type="number"
                      value={cargoPiso}
                      onChange={(e) => setCargoPiso(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mínimo</label>
                    <input
                      type="number"
                      value={cargoMin}
                      onChange={(e) => setCargoMin(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Máximo</label>
                    <input
                      type="number"
                      value={cargoMax}
                      onChange={(e) => setCargoMax(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-lg transition-colors shadow-xs"
                  >
                    Salvar Cargo
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'supervisores' && (
              <form onSubmit={handleSaveSupervisor} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={supNome}
                    onChange={(e) => setSupNome(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cargo</label>
                  <input
                    type="text"
                    value={supCargo}
                    onChange={(e) => setSupCargo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="supervisor@jmt.com.br"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'empregadores' && (
              <form onSubmit={handleSaveEmpregador} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={empRazao}
                    onChange={(e) => setEmpRazao(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={empCnpj}
                    onChange={(e) => setEmpCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'feriados' && (
              <form onSubmit={handleSaveFeriado} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={feriadoData}
                    onChange={(e) => setFeriadoData(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Descrição *</label>
                  <input
                    type="text"
                    required
                    value={feriadoDesc}
                    onChange={(e) => setFeriadoDesc(e.target.value)}
                    placeholder="Ex: Tiradentes"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'operacoes' && (
              <form onSubmit={handleSaveOperacaoForm} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nome da Operação *</label>
                  <input
                    type="text"
                    required
                    value={opNome}
                    onChange={(e) => setOpNome(e.target.value)}
                    placeholder="Ex: Unimed"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nome Curto (opcional)</label>
                  <input
                    type="text"
                    value={opNomeCurto}
                    onChange={(e) => setOpNomeCurto(e.target.value)}
                    placeholder="Ex: Plano de Saúde"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ícone</label>
                  <select
                    value={opIcone}
                    onChange={(e) => setOpIcone(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    {Object.keys(ICON_OPTIONS).map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cor</label>
                  <select
                    value={opCorIdx}
                    onChange={(e) => setOpCorIdx(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    {CORES_OPERACAO.map((cor, idx) => (
                      <option key={cor.label} value={idx}>
                        {cor.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ordem no Menu</label>
                  <input
                    type="number"
                    value={opOrdem}
                    onChange={(e) => setOpOrdem(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-lg transition-colors shadow-xs"
                  >
                    Salvar Operação
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
