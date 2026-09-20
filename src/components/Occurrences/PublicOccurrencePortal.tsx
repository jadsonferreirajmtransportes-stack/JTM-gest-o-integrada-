import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  Paperclip,
  Upload,
  Send,
  CheckCircle2,
  FileText,
  Stethoscope,
  X,
  ArrowLeft,
  Search,
  Check,
  ChevronRight,
  Info,
  Truck,
  HeartPulse,
  AlertCircle,
  FileCheck,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  ColaboradorPublico,
  SupervisorPublico,
  TipoOcorrencia,
  Ocorrencia,
  EmpregadorPublico,
} from '../../types';
import { JmtLogo } from '../Brand/JmtLogo';
import { formatDate } from '../../utils/formatters';
import { useBotGuard } from '../../utils/botProtection';

interface PublicOccurrencePortalProps {
  colaboradores: ColaboradorPublico[];
  supervisores: SupervisorPublico[];
  empregadores?: EmpregadorPublico[];
  preselectedSupervisorId?: string;
  preselectedEmpresaId?: string;
  onSuccessSubmit: (ocorrencia: Ocorrencia) => Promise<void>;
  onAdminBack?: () => void;
}

// Tipos que podem durar mais de um dia — mesmo conjunto (mais CAT) que reduz diárias de VA em
// calcFaltasEmPeriodo (src/utils/formatters.ts). Atraso, Advertência, Elogio etc. são pontuais,
// não fazem sentido com uma "data de término" separada.
const TIPOS_COM_DURACAO = new Set<TipoOcorrencia>([
  'Atestado médico',
  'Falta justificada',
  'Falta injustificada',
  'Suspensão disciplinar',
  'Acidente de trabalho (CAT)',
]);

const TIPO_OPTS: {
  tipo: TipoOcorrencia;
  icon: React.ElementType;
  color: string;
  badgeBg: string;
  desc: string;
}[] = [
  {
    tipo: 'Atestado médico',
    icon: Stethoscope,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-800',
    desc: 'Atestados de consulta, internação ou repouso médico (RDC 430)',
  },
  {
    tipo: 'Falta justificada',
    icon: Calendar,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    desc: 'Casamento, doação de sangue, luto ou convocação legal',
  },
  {
    tipo: 'Falta injustificada',
    icon: AlertTriangle,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 border-rose-200 text-rose-800',
    desc: 'Ausência sem comunicação prévia ou justificativa legal',
  },
  {
    tipo: 'Atraso',
    icon: Clock,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
    desc: 'Atraso na apresentação ao turno de rota ou armazém',
  },
  {
    tipo: 'Advertência escrita',
    icon: AlertCircle,
    color: 'text-orange-600',
    badgeBg: 'bg-orange-50 border-orange-200 text-orange-800',
    desc: 'Notificação disciplinar formal por descumprimento de norma',
  },
  {
    tipo: 'Suspensão disciplinar',
    icon: ShieldCheck,
    color: 'text-red-700',
    badgeBg: 'bg-red-50 border-red-200 text-red-800',
    desc: 'Afastamento disciplinar com suspensão de remuneração',
  },
  {
    tipo: 'Acidente de trabalho (CAT)',
    icon: HeartPulse,
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 border-purple-200 text-purple-800',
    desc: 'Ocorrência de trajeto ou operação com emissão de CAT',
  },
  {
    tipo: 'Elogio',
    icon: Sparkles,
    color: 'text-teal-600',
    badgeBg: 'bg-teal-50 border-teal-200 text-teal-800',
    desc: 'Reconhecimento por destaque operacional ou pontualidade',
  },
  {
    tipo: 'Outro',
    icon: FileText,
    color: 'text-slate-600',
    badgeBg: 'bg-slate-50 border-slate-200 text-slate-800',
    desc: 'Demais comunicações operacionais para o DP',
  },
];

export const PublicOccurrencePortal: React.FC<PublicOccurrencePortalProps> = ({
  colaboradores,
  supervisores,
  empregadores = [],
  preselectedSupervisorId,
  preselectedEmpresaId,
  onSuccessSubmit,
  onAdminBack,
}) => {
  // Filters & Form States
  const [supervisorId, setSupervisorId] = useState<string>(preselectedSupervisorId || '');
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(preselectedEmpresaId || '');
  const [colaboradorId, setColaboradorId] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [tipo, setTipo] = useState<TipoOcorrencia>('Atestado médico');
  const [dataOcorrencia, setDataOcorrencia] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  // Antes só existia "Dias de Afastamento" (número) e só pra Atestado médico — o supervisor
  // tinha que fazer conta de cabeça, e Falta/Suspensão (que também podem durar mais de um dia,
  // e reduzem diárias de VA — ver TIPOS_OCORRENCIA_FALTA em formatters.ts) não tinham nenhum
  // jeito de registrar mais de 1 dia. Agora é uma Data de Término de verdade, disponível pros
  // tipos que representam ausência (não faz sentido pra Atraso/Elogio/Advertência, que são
  // pontuais). diasAfastamento continua existindo nos dados — só é calculado a partir das duas
  // datas em vez de digitado à parte.
  const [dataTermino, setDataTermino] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [cidCodigo, setCidCodigo] = useState<string>('');
  const [crmMedico, setCrmMedico] = useState<string>('');
  const [clinicaHospital, setClinicaHospital] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [arquivoNome, setArquivoNome] = useState<string>('');
  const [arquivoUrl, setArquivoUrl] = useState<string>('');
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<Ocorrencia | null>(null);
  const botGuard = useBotGuard();

  // Employees list filtered by optional employer — já vem só com colaboradores Ativos
  // (filtrado no próprio banco, ver getColaboradoresAtivosPublico/obter_colaboradores_ativos_publico).
  const availableEmployees = useMemo(() => {
    return colaboradores.filter((c) => {
      if (selectedEmpresaId && c.empregadorId !== selectedEmpresaId) return false;
      if (employeeSearch.trim()) {
        const q = employeeSearch.toLowerCase();
        const matchName = c.nomeCompleto.toLowerCase().includes(q);
        const matchMatricula = c.codigoMatricula.toLowerCase().includes(q);
        const matchCargo = c.funcaoCargo.toLowerCase().includes(q);
        const matchSetor = c.setor?.toLowerCase().includes(q);
        if (!matchName && !matchMatricula && !matchCargo && !matchSetor) return false;
      }
      return true;
    });
  }, [colaboradores, selectedEmpresaId, employeeSearch]);

  const selectedColaborador = useMemo(
    () => colaboradores.find((c) => c.id === colaboradorId),
    [colaboradores, colaboradorId]
  );

  const selectedSupervisor = useMemo(
    () => supervisores.find((s) => s.id === supervisorId),
    [supervisores, supervisorId]
  );

  const LIMITE_ANEXO_MB = 5;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroUpload(null);

    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB > LIMITE_ANEXO_MB) {
      setErroUpload(
        `"${file.name}" tem ${tamanhoMB.toFixed(1)}MB — o limite é ${LIMITE_ANEXO_MB}MB. Tire uma foto em resolução menor.`
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setArquivoNome(file.name);
      setArquivoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Quantidade de dias entre Início e Término, ambos inclusive (ex.: início e término no mesmo
  // dia = 1 dia de afastamento) — é o valor gravado em Ocorrencia.diasAfastamento.
  const calcularDiasAfastamento = (): number => {
    if (!dataOcorrencia || !dataTermino) return 1;
    const inicio = new Date(dataOcorrencia + 'T00:00:00');
    const termino = new Date(dataTermino + 'T00:00:00');
    if (isNaN(inicio.getTime()) || isNaN(termino.getTime()) || termino < inicio) return 1;
    const diffDias = Math.round((termino.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias + 1;
  };

  const calculateReturnDate = () => {
    if (!dataTermino) return '';
    try {
      const d = new Date(dataTermino + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (botGuard.isLikelyBot()) {
      // Automated submission detected (honeypot filled or submitted too fast) — drop silently.
      console.warn('Envio bloqueado: comportamento automatizado detectado.');
      return;
    }
    if (!supervisorId) {
      alert('Por favor, selecione seu nome como supervisor solicitante.');
      return;
    }
    if (!colaboradorId) {
      alert('Por favor, selecione o colaborador envolvido.');
      return;
    }
    if (!descricao.trim()) {
      alert('Por favor, preencha o relato / descrição da ocorrência.');
      return;
    }

    setIsSubmitting(true);
    setErroEnvio(null);

    const protocolNum = `JMT-OCORR-${Date.now().toString().slice(-6)}`;
    const fullSupervisor = selectedSupervisor
      ? `${selectedSupervisor.nome} (${selectedSupervisor.cargo || 'Supervisor'})`
      : 'Supervisor de Campo';

    // Detailed description with extra medical metadata if applicable
    let fullDescricao = descricao;
    if (tipo === 'Atestado médico') {
      const extras: string[] = [];
      if (cidCodigo) extras.push(`CID: ${cidCodigo.toUpperCase()}`);
      if (crmMedico) extras.push(`CRM: ${crmMedico}`);
      if (clinicaHospital) extras.push(`Local: ${clinicaHospital}`);
      if (extras.length > 0) {
        fullDescricao = `${descricao}\n[Dados Médicos: ${extras.join(' | ')}]`;
      }
    }

    const payload: Ocorrencia = {
      id: `ocorr-${Date.now()}`,
      colaboradorId,
      tipo,
      dataOcorrencia,
      diasAfastamento: TIPOS_COM_DURACAO.has(tipo) ? calcularDiasAfastamento() : undefined,
      descricao: fullDescricao,
      comprovanteAnexo: arquivoNome || undefined,
      comprovanteArquivoUrl: arquivoUrl || undefined,
      registradoPor: fullSupervisor,
      criadoEm: new Date().toISOString(),
    };

    setTimeout(async () => {
      try {
        await onSuccessSubmit(payload);
        setSubmittedData(payload);
        setSubmittedProtocol(protocolNum);
      } catch (err) {
        // Mantém o formulário aberto e mostra o motivo — sem isso, um erro no salvamento
        // parecia ter dado certo (a tela de protocolo apareceria mesmo sem nada salvo).
        console.error(err);
        setErroEnvio(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSubmitting(false);
      }
    }, 600);
  };

  const handleResetForm = () => {
    setColaboradorId('');
    setEmployeeSearch('');
    setTipo('Atestado médico');
    const hoje = new Date().toISOString().slice(0, 10);
    setDataOcorrencia(hoje);
    setDataTermino(hoje);
    setCidCodigo('');
    setCrmMedico('');
    setClinicaHospital('');
    setDescricao('');
    setArquivoNome('');
    setSubmittedProtocol(null);
    setSubmittedData(null);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 flex flex-col font-sans selection:bg-[#C48229] selection:text-white">
      {/* Top Brand Header */}
      <header className="bg-[#0c0c0c] border-b border-[#262626] sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <JmtLogo variant="compact" theme="dark" iconSize={32} />
          <div className="hidden sm:block pl-3 border-l border-[#262626]">
            <div className="flex items-center gap-2">
              <span className="bg-[#C48229]/15 text-[#C48229] border border-[#C48229]/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Canal de Campo
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Formulário de Ocorrências & Atestados Médicos (DP)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
            <ShieldCheck className="w-4 h-4 text-[#C48229]" />
            <span>ANVISA RDC 430 / CLT</span>
          </div>

          {onAdminBack && (
            <button
              type="button"
              onClick={onAdminBack}
              className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-slate-200 border border-[#2a2a2a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C48229]" />
              <span>Painel Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {submittedProtocol && submittedData ? (
          /* SUCCESS CONFIRMATION RECEIPT */
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                Protocolo: {submittedProtocol}
              </span>
              <h2 className="text-2xl font-bold text-white">
                Ocorrência Registrada com Sucesso!
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                As informações e anexos foram enviados diretamente para o Departamento Pessoal da JMT e vinculados à ficha do colaborador.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">Colaborador</span>
                  <strong className="text-white text-sm">{selectedColaborador?.nomeCompleto}</strong>
                  <div className="text-slate-400 text-[11px]">
                    Matrícula: {selectedColaborador?.codigoMatricula} • {selectedColaborador?.funcaoCargo}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Tipo de Ocorrência</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mt-0.5">
                    {submittedData.tipo}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">Data do Evento</span>
                  <strong className="text-slate-200">{formatDate(submittedData.dataOcorrencia)}</strong>
                </div>
                {submittedData.diasAfastamento && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Afastamento</span>
                    <strong className="text-amber-400">{submittedData.diasAfastamento} dia(s)</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block text-[11px]">Registrado por</span>
                  <strong className="text-slate-200">{submittedData.registradoPor}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] mb-1">Descrição / Justificativa</span>
                <p className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap text-xs">
                  {submittedData.descricao}
                </p>
              </div>

              {submittedData.comprovanteAnexo && (
                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/40 p-2.5 rounded-xl border border-blue-900/50">
                  <Paperclip className="w-4 h-4" />
                  <span>Anexo enviado: <strong>{submittedData.comprovanteAnexo}</strong></span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Registrar Outra Ocorrência</span>
              </button>

              {onAdminBack && (
                <button
                  type="button"
                  onClick={onAdminBack}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar ao Sistema</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* OCCURRENCE REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot — invisible to real users, catches generic auto-fill bots */}
            <div {...botGuard.honeypotWrapperProps}>
              <label htmlFor={botGuard.honeypotFieldId}>Não preencha este campo</label>
              <input type="text" {...botGuard.honeypotFieldProps} />
            </div>

            {/* Intro Alert */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 p-4 sm:p-5 rounded-2xl border border-amber-500/30 flex items-start gap-3.5 shadow-lg">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-200">
                  Canal Direto de Campo dos Supervisores
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Utilize este formulário para registrar prontamente atestados médicos, atrasos, faltas e advertências da sua equipe operacional. O DP é notificado em tempo real para regularização de folha e espelho de ponto.
                </p>
              </div>
            </div>

            {/* Step 1: Supervisor & Team Identification */}
            <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <UserCheck className="w-4 h-4 text-[#C48229]" />
                <h3 className="text-sm font-bold text-white">1. Identificação do Supervisor & Unidade</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Supervisor Solicitante *
                  </label>
                  <select
                    required
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Selecione seu nome na lista...</option>
                    {supervisores.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.nome} — {sup.cargo} ({sup.setor})
                      </option>
                    ))}
                  </select>
                </div>

                {empregadores.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Filtrar por Empresa / Unidade (Opcional)
                    </label>
                    <select
                      value={selectedEmpresaId}
                      onChange={(e) => {
                        setSelectedEmpresaId(e.target.value);
                        setColaboradorId('');
                      }}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Todas as Empresas</option>
                      {empregadores.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.razaoSocial}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Employee Selection */}
            <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#C48229]" />
                  <h3 className="text-sm font-bold text-white">2. Colaborador Envolvido *</h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {availableEmployees.length} colaboradores ativos disponíveis
                </span>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar colaborador por nome, cargo ou matrícula..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                />
              </div>

              {/* Select Employee */}
              <div>
                <select
                  required
                  value={colaboradorId}
                  onChange={(e) => setColaboradorId(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                >
                  <option value="">-- Selecione o colaborador --</option>
                  {availableEmployees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeCompleto} — {c.funcaoCargo} (Matrícula: {c.codigoMatricula} | Setor: {c.setor})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Employee Preview Chip */}
              {selectedColaborador && (
                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#C48229]/20 text-[#C48229] border border-[#C48229]/30 flex items-center justify-center font-bold">
                      {selectedColaborador.nomeCompleto.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{selectedColaborador.nomeCompleto}</h4>
                      <p className="text-[11px] text-slate-400">
                        {selectedColaborador.funcaoCargo} • Setor: {selectedColaborador.setor} • Admissão: {formatDate(selectedColaborador.dataAdmissao)}
                      </p>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold">
                    Ativo
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Occurrence Type Selection */}
            <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <AlertTriangle className="w-4 h-4 text-[#C48229]" />
                <h3 className="text-sm font-bold text-white">3. Tipo de Evento / Ocorrência *</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {TIPO_OPTS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = tipo === opt.tipo;

                  return (
                    <button
                      key={opt.tipo}
                      type="button"
                      onClick={() => {
                        setTipo(opt.tipo);
                        // Reseta a Data de Término pro mesmo dia do início ao trocar de tipo —
                        // evita herdar um término de vários dias escolhido antes num outro tipo.
                        setDataTermino(dataOcorrencia);
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'bg-[#1e1a14] border-[#C48229] text-white shadow-md ring-1 ring-[#C48229]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-[#C48229]' : opt.color}`} />
                          <span className="text-xs font-bold">{opt.tipo}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#C48229]" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Details & Medical Data */}
            <div className="bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <Calendar className="w-4 h-4 text-[#C48229]" />
                <h3 className="text-sm font-bold text-white">4. Data, Prazos & Relato</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {TIPOS_COM_DURACAO.has(tipo) ? 'Data de Início *' : 'Data do Fato *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={dataOcorrencia}
                    onChange={(e) => {
                      const novaData = e.target.value;
                      setDataOcorrencia(novaData);
                      // Término nunca pode ficar antes do início — se o usuário atrasar a data
                      // de início pra depois do término já escolhido, empurra o término junto.
                      if (dataTermino && novaData > dataTermino) setDataTermino(novaData);
                    }}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {TIPOS_COM_DURACAO.has(tipo) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Data de Término *
                    </label>
                    <input
                      type="date"
                      required
                      min={dataOcorrencia}
                      value={dataTermino}
                      onChange={(e) => setDataTermino(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {calcularDiasAfastamento()} dia(s) de afastamento — retorno previsto:{' '}
                      <strong className="text-amber-400">
                        {calculateReturnDate() ? formatDate(calculateReturnDate()) : '-'}
                      </strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Extra Medical Fields when Medical Certificate */}
              {tipo === 'Atestado médico' && (
                <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-900/50 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-300 mb-1">
                      CID (Opcional / Se houver no atestado)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: J06, M54"
                      value={cidCodigo}
                      onChange={(e) => setCidCodigo(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-blue-300 mb-1">
                      CRM do Médico
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: CRM/RN 12345"
                      value={crmMedico}
                      onChange={(e) => setCrmMedico(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-blue-300 mb-1">
                      Hospital / Posto de Saúde
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: UPA Esperança, Unimed"
                      value={clinicaHospital}
                      onChange={(e) => setClinicaHospital(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Relato do Supervisor / Justificativa Operacional *
                </label>
                <textarea
                  required
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o que ocorreu no turno, horário de apresentação, detalhes do atestado ou histórico..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* File / Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Foto do Atestado, Documento ou Comprovante (Opcional)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="cursor-pointer px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-semibold flex items-center gap-2 text-xs transition-colors">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Tirar Foto / Anexar Arquivo</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                  {arquivoNome && (
                    <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-800/60 px-3 py-2 rounded-xl text-xs text-blue-300">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono truncate max-w-xs">{arquivoNome}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setArquivoNome('');
                          setArquivoUrl('');
                        }}
                        className="text-slate-400 hover:text-white ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {erroUpload && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-lg p-2 mt-2">
                    {erroUpload}
                  </p>
                )}
              </div>
            </div>

            {erroEnvio && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Não foi possível enviar: {erroEnvio}</span>
              </div>
            )}

            {/* Submit Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Registrando e enviando...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Ocorrência para o DP</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
