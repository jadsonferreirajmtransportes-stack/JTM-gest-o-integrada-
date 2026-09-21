import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  MapPin,
  CreditCard,
  Bus,
  Users as UsersIcon,
  Shirt,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  Trash2,
  FileText,
  Printer,
  Smartphone,
  Info,
  Lock,
  ArrowRight,
  Building2,
  HeartHandshake,
  Check,
} from 'lucide-react';
import {
  PreAdmissao,
  EstadoCivil,
  RacaCor,
  GrauInstrucao,
  Genero,
  TipoConta,
  TipoChavePix,
  Dependente,
  DocumentoPreAdmissao,
  Empregador,
  CargoSalario,
} from '../../types';
import { JmtLogo } from '../Brand/JmtLogo';
import {
  maskCPF,
  validateCPF,
  maskPhone,
  maskCEP,
  formatMoney,
  formatDate,
} from '../../utils/formatters';
// Envio direto pro Supabase (formulário público, sem login — papel "anon" só pode inserir,
// nunca ler/editar; ver supabase/migrations/005_pre_admissoes.sql e src/utils/dpApi.ts).
import { criarPreAdmissaoPublica } from '../../utils/dpApi';
import { useBotGuard } from '../../utils/botProtection';
import { HumanVerificationField } from '../Common/HumanVerificationField';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

interface CandidateAdmissionPortalProps {
  initialToken?: string;
  preselectedEmpresaId?: string;
  preselectedCargo?: string;
  empregadores?: Empregador[];
  cargos?: CargoSalario[];
  onAdminBack?: () => void;
}

const TABS = [
  { id: 0, title: 'Identificação', subtitle: 'Dados Pessoais', icon: User },
  { id: 1, title: 'Endereço', subtitle: 'Contato & Local', icon: MapPin },
  { id: 2, title: 'Bancário', subtitle: 'Salário & PIX', icon: CreditCard },
  { id: 3, title: 'Transporte', subtitle: 'Vale Transporte', icon: Bus },
  { id: 4, title: 'Dependentes', subtitle: 'IR & Benefícios', icon: UsersIcon },
  { id: 5, title: 'Uniforme', subtitle: 'Fardamento & EPI', icon: Shirt },
  { id: 6, title: 'Documentos', subtitle: 'Envio de Fotos', icon: Paperclip },
  { id: 7, title: 'Finalização', subtitle: 'Termo & Envio', icon: ShieldCheck },
];

export const CandidateAdmissionPortal: React.FC<CandidateAdmissionPortalProps> = ({
  initialToken,
  preselectedEmpresaId,
  preselectedCargo,
  empregadores = [],
  cargos = [],
  onAdminBack,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<PreAdmissao | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCepLoading, setIsCepLoading] = useState<boolean>(false);

  // Form State
  const [dadosPessoais, setDadosPessoais] = useState({
    nomeCompleto: '',
    nomePai: '',
    nomeMae: '',
    dataNascimento: '',
    naturalidade: '',
    nacionalidade: 'Brasileira',
    estadoCivil: 'Solteiro(a)' as EstadoCivil,
    racaCor: 'Parda' as RacaCor,
    grauInstrucao: 'Ensino Médio Completo' as GrauInstrucao,
    genero: 'Masculino' as Genero,
    cpf: '',
    rg: '',
    orgaoEmissorUF: 'SSP/SP',
    portadorDeficiencia: false,
    detalheDeficiencia: '',
  });

  const [contatoEndereco, setContatoEndereco] = useState({
    telefoneWhatsapp: '',
    email: '',
    enderecoCompleto: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidadeUF: 'São Paulo - SP',
    cep: '',
  });

  const [dadosBancarios, setDadosBancarios] = useState({
    banco: 'Banco Itaú Unibanco S.A. (341)',
    agencia: '',
    tipoConta: 'Corrente' as TipoConta,
    numeroConta: '',
    tipoChavePix: 'CPF' as TipoChavePix,
    chavePix: '',
  });

  const [transporte, setTransporte] = useState({
    utilizaVT: true,
    vtQuantidadeTarifasDia: 2,
    vtValorTarifa: 5.0,
    vtIdentificacaoConducao: '',
  });

  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [novoDependente, setNovoDependente] = useState<{
    nome: string;
    parentesco: Dependente['parentesco'];
    dataNascimento: string;
    cpf: string;
  }>({
    nome: '',
    parentesco: 'Filho(a)',
    dataNascimento: '',
    cpf: '',
  });

  const [fardamento, setFardamento] = useState({
    tamanhoCamisa: 'G',
    numeroCalca: '42',
    numeroCalcado: '41',
  });

  const [documentosEnviados, setDocumentosEnviados] = useState<DocumentoPreAdmissao[]>([]);
  const [declaracaoVeracidade, setDeclaracaoVeracidade] = useState<boolean>(false);
  const [aceiteLgpd, setAceiteLgpd] = useState<boolean>(false);
  const [humanCheckValid, setHumanCheckValid] = useState<boolean>(false);
  const botGuard = useBotGuard();

  // Prefill chave PIX when CPF changes and PIX type is CPF
  useEffect(() => {
    if (dadosBancarios.tipoChavePix === 'CPF' && dadosPessoais.cpf) {
      setDadosBancarios((prev) => ({ ...prev, chavePix: dadosPessoais.cpf }));
    }
  }, [dadosPessoais.cpf, dadosBancarios.tipoChavePix]);

  // CEP Auto lookup via ViaCEP
  const handleCepBlur = async () => {
    const cleanCep = contatoEndereco.cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setContatoEndereco((prev) => ({
            ...prev,
            enderecoCompleto: data.logradouro || prev.enderecoCompleto,
            bairro: data.bairro || prev.bairro,
            cidadeUF: `${data.localidade} - ${data.uf}`,
          }));
        }
      } catch (err) {
        console.warn('ViaCEP offline or failed, continuing with manual entry', err);
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  // Add dependente
  const handleAddDependente = () => {
    if (!novoDependente.nome.trim()) {
      alert('Informe o nome do dependente.');
      return;
    }
    setDependentes((prev) => [
      ...prev,
      {
        id: `dep-${Date.now()}`,
        nome: novoDependente.nome.trim(),
        parentesco: novoDependente.parentesco,
        dataNascimento: novoDependente.dataNascimento,
        cpf: novoDependente.cpf,
      },
    ]);
    setNovoDependente({
      nome: '',
      parentesco: 'Filho(a)',
      dataNascimento: '',
      cpf: '',
    });
  };

  const handleRemoveDependente = (id: string) => {
    setDependentes((prev) => prev.filter((d) => d.id !== id));
  };

  // Handle Document Upload (Simulated with DataURL / Local Storage preview)
  const handleFileUpload = (tipo: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo selecionado excede o limite máximo de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };

      const newDoc: DocumentoPreAdmissao = {
        id: `doc-${Date.now()}`,
        tipo,
        nomeArquivo: file.name,
        arquivoUrl: dataUrl,
        dataUpload: new Date().toISOString(),
        tamanho: formatSize(file.size),
      };

      setDocumentosEnviados((prev) => {
        // Replace if same tipo exists or append
        const filtered = prev.filter((d) => d.tipo !== tipo);
        return [...filtered, newDoc];
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocumento = (tipo: string) => {
    setDocumentosEnviados((prev) => prev.filter((d) => d.tipo !== tipo));
  };

  // Step Validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!dadosPessoais.nomeCompleto.trim()) {
        newErrors.nomeCompleto = 'Nome completo é obrigatório';
      }
      if (!dadosPessoais.cpf.trim()) {
        newErrors.cpf = 'CPF é obrigatório';
      } else if (!validateCPF(dadosPessoais.cpf)) {
        newErrors.cpf = 'CPF inválido. Verifique os dígitos.';
      }
      if (!dadosPessoais.dataNascimento) {
        newErrors.dataNascimento = 'Data de nascimento é obrigatória';
      }
      if (!dadosPessoais.nomeMae.trim()) {
        newErrors.nomeMae = 'Nome da mãe é obrigatório para o eSocial';
      }
    }

    if (step === 1) {
      if (!contatoEndereco.telefoneWhatsapp.trim()) {
        newErrors.telefoneWhatsapp = 'WhatsApp / Celular para contato é obrigatório';
      }
      if (!contatoEndereco.email.trim() || !contatoEndereco.email.includes('@')) {
        newErrors.email = 'E-mail válido é obrigatório';
      }
      if (!contatoEndereco.enderecoCompleto.trim()) {
        newErrors.enderecoCompleto = 'Endereço (logradouro) é obrigatório';
      }
      if (!contatoEndereco.cidadeUF.trim()) {
        newErrors.cidadeUF = 'Cidade e UF são obrigatórios';
      }
      if (!contatoEndereco.cep.trim()) {
        newErrors.cep = 'CEP é obrigatório';
      }
    }

    if (step === 2) {
      if (!dadosBancarios.banco.trim()) {
        newErrors.banco = 'Selecione o banco de recebimento';
      }
      if (!dadosBancarios.agencia.trim()) {
        newErrors.agencia = 'Agência é obrigatória';
      }
      if (!dadosBancarios.numeroConta.trim()) {
        newErrors.numeroConta = 'Número da conta é obrigatório';
      }
      if (!dadosBancarios.chavePix.trim()) {
        newErrors.chavePix = 'Chave PIX é obrigatória para agilidade nos pagamentos';
      }
    }

    if (step === 3) {
      if (transporte.utilizaVT && transporte.vtQuantidadeTarifasDia <= 0) {
        newErrors.vtQuantidadeTarifasDia = 'Informe a quantidade de tarifas por dia';
      }
    }

    if (step === 7) {
      if (!declaracaoVeracidade) {
        newErrors.declaracaoVeracidade = 'Você precisa declarar a veracidade das informações prestadas';
      }
      if (!aceiteLgpd) {
        newErrors.aceiteLgpd = 'Você precisa aceitar os termos de tratamento de dados LGPD';
      }
      if (!humanCheckValid) {
        newErrors.humanCheck = 'Resolva corretamente a verificação anti-robô para concluir o envio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, TABS.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Submit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (botGuard.isLikelyBot()) {
      // Automated submission detected (honeypot filled or submitted too fast) — drop silently.
      console.warn('Envio bloqueado: comportamento automatizado detectado.');
      return;
    }
    if (!validateStep(7)) return;

    setErroEnvio(null);
    setIsSubmitting(true);

    const protocol = `JMT-ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const payload: PreAdmissao = {
      id: `preadm-${Date.now()}`,
      token: initialToken || `admissao-${Math.random().toString(36).substring(2, 8)}`,
      criadoEm: now,
      dataEnvio: now,
      status: 'Pendente',
      empresaPredefinidaId: preselectedEmpresaId || 'emp-1',
      cargoPredefinido: preselectedCargo || 'A Definir pelo DP',
      observacoesDP: 'Aguardando conferência e validação dos documentos pelo DP.',
      dadosPessoais,
      contatoEndereco,
      dadosBancarios,
      transporte,
      dependentes,
      fardamento,
      documentosEnviados,
      declaracaoVeracidade: true,
    };

    try {
      await criarPreAdmissaoPublica(payload);
      setSubmittedProtocol(protocol);
      setSubmittedData(payload);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setErroEnvio(
        'Não foi possível enviar seu cadastro agora — verifique sua conexão com a internet e tente novamente. Se o problema continuar, avise quem te enviou o link.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (submittedProtocol && submittedData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#C48229] selection:text-white">
        <div className="jmt-print-doc w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center">
          {/* Top Gold Accent */}
          <div className="print:hidden absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#C48229] via-amber-400 to-[#C48229]" />
          <PrintDocumentHeader
            titulo="COMPROVANTE DE ADMISSÃO DIGITAL"
            subtitulo="Departamento Pessoal — JMT"
            metadados={`Protocolo ${submittedProtocol}`}
          />

          {/* Success Icon */}
          <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>

          <span className="inline-block px-3 py-1 bg-amber-500/10 border border-[#C48229]/30 rounded-full text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
            Admissão Digital Concluída
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Dados Recebidos com Sucesso!
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto mb-8">
            Prezado(a) <span className="text-white font-semibold">{dadosPessoais.nomeCompleto}</span>,
            sua ficha de admissão foi enviada diretamente ao Departamento Pessoal da{' '}
            <strong className="text-amber-300">Jobson de Moraes Transportes (JMT)</strong>.
          </p>

          {/* Protocol Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-8 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-500 block">Número do Protocolo</span>
                <span className="text-lg font-mono font-bold text-[#C48229]">{submittedProtocol}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Data e Hora de Envio</span>
                <span className="text-xs font-medium text-slate-300">
                  {new Date().toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
              <div>
                <span className="text-slate-500 block">CPF do Colaborador:</span>
                <span className="text-slate-200 font-mono">{dadosPessoais.cpf}</span>
              </div>
              <div>
                <span className="text-slate-500 block">WhatsApp de Contato:</span>
                <span className="text-slate-200">{contatoEndereco.telefoneWhatsapp}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Documentos Anexados:</span>
                <span className="text-emerald-400 font-semibold">
                  {documentosEnviados.length} arquivos enviados
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tamanhos de Fardamento:</span>
                <span className="text-slate-200">
                  Camisa {fardamento.tamanhoCamisa} | Calça {fardamento.numeroCalca} | Calçado {fardamento.numeroCalcado}
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps Guide */}
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 mb-8 text-left">
            <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              Próximos Passos do seu Processo Admissional
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#C48229]/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  1
                </div>
                <span>
                  <strong>Conferência Documental:</strong> Nossa equipe do DP irá validar seus documentos e dados para o eSocial.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#C48229]/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  2
                </div>
                <span>
                  <strong>Exame Admissional (ASO):</strong> Entraremos em contato via WhatsApp para confirmar o agendamento na clínica de medicina do trabalho credenciada (RDC 430).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#C48229]/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  3
                </div>
                <span>
                  <strong>Contrato & Fardamento:</strong> No primeiro dia, você receberá seu fardamento personalizado e assinará o contrato de trabalho.
                </span>
              </li>
            </ul>
          </div>

          <PrintDocumentFooter />

          {/* Action Buttons */}
          <div className="print:hidden flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700 shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              Imprimir / Salvar Comprovante
            </button>

            {onAdminBack && (
              <button
                type="button"
                onClick={onAdminBack}
                className="w-full sm:w-auto px-6 py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-900/30"
              >
                <Building2 className="w-4 h-4" />
                Acessar Painel do DP (Administrador)
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs mt-6 text-center">
          Jobson de Moraes Transportes (JMT) • Logística Farmacêutica RDC 430 • Sistema de Admissão Digital
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 flex flex-col selection:bg-[#C48229] selection:text-white">
      {/* Top Banner Header */}
      <header className="bg-[#0c0c0c] border-b border-[#262626] sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <JmtLogo variant="compact" theme="dark" iconSize={32} />
            <div className="hidden sm:block pl-3 border-l border-[#262626]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#C48229]/15 text-[#C48229] rounded text-[10px] font-bold border border-[#C48229]/30 uppercase tracking-wider">
                  RDC 430
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Portal de Admissão Digital do Novo Colaborador</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#C48229] bg-[#161616] border border-[#2a2a2a] px-2.5 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5" />
              <span>Ambiente Seguro & LGPD</span>
            </div>

            {onAdminBack && (
              <button
                type="button"
                onClick={onAdminBack}
                className="text-xs bg-[#181818] hover:bg-[#222222] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-[#2a2a2a] flex items-center gap-1.5"
                title="Voltar para o painel de administração do DP"
              >
                <Building2 className="w-3.5 h-3.5 text-[#C48229]" />
                <span className="hidden sm:inline">Painel DP</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Welcome Intro */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-amber-400 font-semibold text-xs uppercase tracking-widest block mb-1">
                Boas-Vindas à Equipe JMT
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Ficha Cadastral de Admissão Digital
              </h2>
              <p className="text-amber-200/90 text-xs sm:text-sm mt-1 font-semibold">
                "Levar saúde com segurança, do remetente ao destino final."
              </p>
              <p className="text-slate-400 text-xs mt-1 max-w-xl leading-relaxed">
                Preencha os dados cadastrais e anexe fotos dos seus documentos. Na JMT, atuamos com rigor operacional, conformidade regulatória e integridade em cada etapa.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 rounded-2xl shrink-0">
              <Smartphone className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Tempo Estimado</span>
                <span className="text-xs font-bold text-white">3 a 5 minutos</span>
              </div>
            </div>
          </div>

          {/* Stepper Wizard Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-400">
                Passo {currentStep + 1} de {TABS.length}: {TABS[currentStep].title}
              </span>
              <span className="text-xs text-slate-400">
                {Math.round(((currentStep + 1) / TABS.length) * 100)}% concluído
              </span>
            </div>

            {/* Progress line */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#C48229] to-amber-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${((currentStep + 1) / TABS.length) * 100}%` }}
              />
            </div>

            {/* Step icons grid for desktop */}
            <div className="hidden md:grid grid-cols-8 gap-2 mt-4">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isCompleted = currentStep > tab.id;
                const isCurrent = currentStep === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id <= currentStep || validateStep(currentStep)) {
                        setCurrentStep(tab.id);
                      }
                    }}
                    className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${
                      isCurrent
                        ? 'bg-[#C48229]/20 border border-amber-500/40 text-amber-300'
                        : isCompleted
                        ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                        : 'bg-slate-950/40 border border-slate-800/40 text-slate-600'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 text-xs font-bold ${
                        isCurrent
                          ? 'bg-[#C48229] text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[10px] font-medium truncate w-full">{tab.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        <form onSubmit={handleSubmitForm} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl">
          {/* Honeypot — invisible to real users, catches generic auto-fill bots */}
          <div {...botGuard.honeypotWrapperProps}>
            <label htmlFor={botGuard.honeypotFieldId}>Não preencha este campo</label>
            <input type="text" {...botGuard.honeypotFieldProps} />
          </div>

          {/* STEP 0: DADOS PESSOAIS */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#C48229]" />
                  1. Dados Pessoais & Documentos de Identificação
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preencha exatamente como consta no seu documento oficial (RG/CNH).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Completo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dadosPessoais.nomeCompleto}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, nomeCompleto: e.target.value })}
                    placeholder="Ex: Gabriel Henrique de Souza"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] transition-all ${
                      errors.nomeCompleto ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.nomeCompleto && (
                    <span className="text-[11px] text-rose-400 mt-1 block">{errors.nomeCompleto}</span>
                  )}
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CPF <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dadosPessoais.cpf}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, cpf: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#C48229] transition-all ${
                      errors.cpf ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.cpf && <span className="text-[11px] text-rose-400 mt-1 block">{errors.cpf}</span>}
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Data de Nascimento <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dadosPessoais.dataNascimento}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, dataNascimento: e.target.value })}
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] transition-all ${
                      errors.dataNascimento ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.dataNascimento && (
                    <span className="text-[11px] text-rose-400 mt-1 block">{errors.dataNascimento}</span>
                  )}
                </div>

                {/* RG */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Número do RG / CNH
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.rg}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, rg: e.target.value })}
                    placeholder="Ex: 38.912.445-1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>

                {/* Órgão Emissor / UF */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Órgão Emissor / UF
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.orgaoEmissorUF}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, orgaoEmissorUF: e.target.value })}
                    placeholder="Ex: SSP/SP ou DETRAN/SP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>

                {/* Gênero */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Gênero</label>
                  <select
                    value={dadosPessoais.genero}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, genero: e.target.value as Genero })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                {/* Estado Civil */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Estado Civil</label>
                  <select
                    value={dadosPessoais.estadoCivil}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, estadoCivil: e.target.value as EstadoCivil })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="União estável">União estável</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>

                {/* Raça / Cor */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Raça / Cor (eSocial)</label>
                  <select
                    value={dadosPessoais.racaCor}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, racaCor: e.target.value as RacaCor })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="Branca">Branca</option>
                    <option value="Preta">Preta</option>
                    <option value="Parda">Parda</option>
                    <option value="Amarela">Amarela</option>
                    <option value="Indígena">Indígena</option>
                    <option value="Não declarada">Não declarada</option>
                  </select>
                </div>

                {/* Escolaridade */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Grau de Instrução</label>
                  <select
                    value={dadosPessoais.grauInstrucao}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, grauInstrucao: e.target.value as GrauInstrucao })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</option>
                    <option value="Ensino Fundamental Completo">Ensino Fundamental Completo</option>
                    <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                    <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                    <option value="Superior Incompleto">Superior Incompleto</option>
                    <option value="Superior Completo">Superior Completo</option>
                    <option value="Pós-graduação / Especialização">Pós-graduação / Especialização</option>
                  </select>
                </div>

                {/* Nome da Mãe */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Completo da Mãe <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dadosPessoais.nomeMae}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, nomeMae: e.target.value })}
                    placeholder="Nome completo da mãe"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.nomeMae ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.nomeMae && <span className="text-[11px] text-rose-400 mt-1 block">{errors.nomeMae}</span>}
                </div>

                {/* Nome do Pai */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Completo do Pai (Opcional)
                  </label>
                  <input
                    type="text"
                    value={dadosPessoais.nomePai}
                    onChange={(e) => setDadosPessoais({ ...dadosPessoais, nomePai: e.target.value })}
                    placeholder="Nome completo do pai"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>

                {/* PCD */}
                <div className="sm:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dadosPessoais.portadorDeficiencia}
                      onChange={(e) => setDadosPessoais({ ...dadosPessoais, portadorDeficiencia: e.target.checked })}
                      className="w-4 h-4 rounded text-[#C48229] focus:ring-[#C48229] bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      É Pessoa com Deficiência (PCD)?
                    </span>
                  </label>
                  {dadosPessoais.portadorDeficiencia && (
                    <div className="mt-3 pl-7">
                      <input
                        type="text"
                        value={dadosPessoais.detalheDeficiencia}
                        onChange={(e) => setDadosPessoais({ ...dadosPessoais, detalheDeficiencia: e.target.value })}
                        placeholder="Especifique a deficiência / laudo..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: ENDEREÇO & CONTATO */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C48229]" />
                  2. Contato & Endereço Residencial
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Informe seus dados de contato e residência atualizados.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Telefone WhatsApp / Celular <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contatoEndereco.telefoneWhatsapp}
                    onChange={(e) => setContatoEndereco({ ...contatoEndereco, telefoneWhatsapp: maskPhone(e.target.value) })}
                    placeholder="(11) 98765-4321"
                    maxLength={15}
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.telefoneWhatsapp ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.telefoneWhatsapp && (
                    <span className="text-[11px] text-rose-400 mt-1 block">{errors.telefoneWhatsapp}</span>
                  )}
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    E-mail Pessoal <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={contatoEndereco.email}
                    onChange={(e) => setContatoEndereco({ ...contatoEndereco, email: e.target.value })}
                    placeholder="seu.email@exemplo.com"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.email ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.email && <span className="text-[11px] text-rose-400 mt-1 block">{errors.email}</span>}
                </div>

                {/* CEP */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      CEP <span className="text-rose-400">*</span>
                    </label>
                    {isCepLoading && <span className="text-[10px] text-amber-400 animate-pulse">Buscando CEP...</span>}
                  </div>
                  <input
                    type="text"
                    required
                    value={contatoEndereco.cep}
                    onChange={(e) => setContatoEndereco({ ...contatoEndereco, cep: maskCEP(e.target.value) })}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.cep ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.cep && <span className="text-[11px] text-rose-400 mt-1 block">{errors.cep}</span>}
                </div>

                {/* Cidade / UF */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cidade - UF <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contatoEndereco.cidadeUF}
                    onChange={(e) => setContatoEndereco({ ...contatoEndereco, cidadeUF: e.target.value })}
                    placeholder="Ex: São Paulo - SP ou Guarulhos - SP"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.cidadeUF ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                </div>

                {/* Endereço / Logradouro */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Endereço Completo (Rua / Avenida / Travessa) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contatoEndereco.enderecoCompleto}
                    onChange={(e) => setContatoEndereco({ ...contatoEndereco, enderecoCompleto: e.target.value })}
                    placeholder="Ex: Rua das Flores"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.enderecoCompleto ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                </div>

                {/* Número */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Número</label>
                  <input
                    type="text"
                    value={contatoEndereco.numero}
                    onChange={(e) => setContatoEndereco({ ...contatoEndereco, numero: e.target.value })}
                    placeholder="Ex: 120"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>

                {/* Bairro */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={contatoEndereco.bairro}
                    onChange={(e) => setContatoEndereco({ ...contatoEndereco, bairro: e.target.value })}
                    placeholder="Ex: Centro / Vila Mariana"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>

                {/* Complemento */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Complemento (Apto, Bloco, Casa 2)</label>
                  <input
                    type="text"
                    value={contatoEndereco.complemento}
                    onChange={(e) => setContatoEndereco({ ...contatoEndereco, complemento: e.target.value })}
                    placeholder="Ex: Apto 42 Bloco B"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DADOS BANCÁRIOS & PIX */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#C48229]" />
                  3. Dados Bancários & PIX para Recebimento de Salário
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  A conta bancária deve ser obrigatoriamente em nome do próprio colaborador.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Banco */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Instituição Bancária <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={dadosBancarios.banco}
                    onChange={(e) => setDadosBancarios({ ...dadosBancarios, banco: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="Banco Itaú Unibanco S.A. (341)">Banco Itaú Unibanco S.A. (341)</option>
                    <option value="Banco Bradesco S.A. (237)">Banco Bradesco S.A. (237)</option>
                    <option value="Banco do Brasil S.A. (001)">Banco do Brasil S.A. (001)</option>
                    <option value="Caixa Econômica Federal (104)">Caixa Econômica Federal (104)</option>
                    <option value="Banco Santander Brasil (033)">Banco Santander Brasil (033)</option>
                    <option value="Nubank / Nu Pagamentos (260)">Nubank / Nu Pagamentos (260)</option>
                    <option value="Banco Inter S.A. (077)">Banco Inter S.A. (077)</option>
                    <option value="Banco C6 S.A. (336)">Banco C6 S.A. (336)</option>
                    <option value="Outro Banco">Outro Banco</option>
                  </select>
                </div>

                {/* Agência */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Agência (sem dígito) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dadosBancarios.agencia}
                    onChange={(e) => setDadosBancarios({ ...dadosBancarios, agencia: e.target.value })}
                    placeholder="Ex: 0452"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.agencia ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.agencia && <span className="text-[11px] text-rose-400 mt-1 block">{errors.agencia}</span>}
                </div>

                {/* Tipo de Conta */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Conta</label>
                  <select
                    value={dadosBancarios.tipoConta}
                    onChange={(e) => setDadosBancarios({ ...dadosBancarios, tipoConta: e.target.value as TipoConta })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="Corrente">Conta Corrente</option>
                    <option value="Salário">Conta Salário</option>
                    <option value="Poupança">Conta Poupança</option>
                  </select>
                </div>

                {/* Número da Conta */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Número da Conta (com dígito verificador) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dadosBancarios.numeroConta}
                    onChange={(e) => setDadosBancarios({ ...dadosBancarios, numeroConta: e.target.value })}
                    placeholder="Ex: 12345-6"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.numeroConta ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.numeroConta && (
                    <span className="text-[11px] text-rose-400 mt-1 block">{errors.numeroConta}</span>
                  )}
                </div>

                {/* Tipo de Chave PIX */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Chave PIX</label>
                  <select
                    value={dadosBancarios.tipoChavePix}
                    onChange={(e) => setDadosBancarios({ ...dadosBancarios, tipoChavePix: e.target.value as TipoChavePix })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="CPF">CPF</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Aleatória">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                {/* Chave PIX */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Chave PIX <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dadosBancarios.chavePix}
                    onChange={(e) => setDadosBancarios({ ...dadosBancarios, chavePix: e.target.value })}
                    placeholder="Informe sua chave PIX"
                    className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-[#C48229] ${
                      errors.chavePix ? 'border-rose-500' : 'border-slate-800'
                    }`}
                  />
                  {errors.chavePix && (
                    <span className="text-[11px] text-rose-400 mt-1 block">{errors.chavePix}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VALE TRANSPORTE */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bus className="w-5 h-5 text-[#C48229]" />
                  4. Opção de Vale Transporte & Trajeto
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conforme Lei nº 7.418/1985 e Decreto nº 95.247/1987.
                </p>
              </div>

              {/* Opção VT */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs font-bold text-slate-200 block mb-3">
                  Você opta pela utilização do benefício do Vale Transporte?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      transporte.utilizaVT
                        ? 'bg-[#C48229]/15 border-amber-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="opcaoVT"
                      checked={transporte.utilizaVT}
                      onChange={() => setTransporte({ ...transporte, utilizaVT: true })}
                      className="w-4 h-4 text-[#C48229] focus:ring-[#C48229]"
                    />
                    <div>
                      <span className="text-sm font-semibold block text-white">Sim, opto pelo Vale Transporte</span>
                      <span className="text-[11px] text-slate-400 block">
                        Desconto legal de até 6% do salário base nos termos da CLT.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      !transporte.utilizaVT
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="opcaoVT"
                      checked={!transporte.utilizaVT}
                      onChange={() => setTransporte({ ...transporte, utilizaVT: false })}
                      className="w-4 h-4 text-[#C48229] focus:ring-[#C48229]"
                    />
                    <div>
                      <span className="text-sm font-semibold block text-white">Não utilizarei (Veículo Próprio / A pé)</span>
                      <span className="text-[11px] text-slate-400 block">
                        Declaro que utilizo condução própria ou não necessito de VT.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {transporte.utilizaVT && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 border border-slate-800/80 rounded-2xl p-5 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Quantidade de Conduções por Dia (Ida + Volta)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={transporte.vtQuantidadeTarifasDia}
                      onChange={(e) => setTransporte({ ...transporte, vtQuantidadeTarifasDia: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Valor Médio da Tarifa Unitária (R$)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min={1}
                      value={transporte.vtValorTarifa}
                      onChange={(e) => setTransporte({ ...transporte, vtValorTarifa: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Linhas / Meios de Transporte Utilizados (Ônibus, Metrô, Trem, EMTU)
                    </label>
                    <input
                      type="text"
                      value={transporte.vtIdentificacaoConducao || ''}
                      onChange={(e) => setTransporte({ ...transporte, vtIdentificacaoConducao: e.target.value })}
                      placeholder="Ex: Metrô Linha 1 Azul + Ônibus SPTrans Linha 175T"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: DEPENDENTES */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-[#C48229]" />
                  5. Dependentes para Fins de IR e Salário-Família
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Informe filhos menores de 14 anos ou cônjuge/companheiro(a) para fins fiscais e previdenciários.
                </p>
              </div>

              {/* Add Dependent Sub-Form */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs font-bold text-slate-200 block mb-3">
                  Adicionar Novo Dependente
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Nome do Dependente</label>
                    <input
                      type="text"
                      value={novoDependente.nome}
                      onChange={(e) => setNovoDependente({ ...novoDependente, nome: e.target.value })}
                      placeholder="Nome completo do dependente"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Parentesco</label>
                    <select
                      value={novoDependente.parentesco}
                      onChange={(e) => setNovoDependente({ ...novoDependente, parentesco: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Filho(a)">Filho(a)</option>
                      <option value="Cônjuge">Cônjuge</option>
                      <option value="Enteado(a)">Enteado(a)</option>
                      <option value="Pai/Mãe">Pai/Mãe</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={novoDependente.dataNascimento}
                      onChange={(e) => setNovoDependente({ ...novoDependente, dataNascimento: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">CPF do Dependente</label>
                    <input
                      type="text"
                      value={novoDependente.cpf}
                      onChange={(e) => setNovoDependente({ ...novoDependente, cpf: maskCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddDependente}
                      className="w-full bg-[#C48229] hover:bg-[#92611F] text-white font-semibold py-2 px-3 rounded-xl text-xs transition-colors shadow-xs"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Dependents List */}
              {dependentes.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Nenhum dependente cadastrado até o momento. Caso não possua dependentes, prossiga normalmente.
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Dependentes Cadastrados ({dependentes.length})
                  </span>
                  {dependentes.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white block">{dep.nome}</span>
                        <span className="text-slate-400">
                          {dep.parentesco} • Nasc: {formatDate(dep.dataNascimento)} • CPF: {dep.cpf || 'Não informado'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependente(dep.id)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: FARDAMENTO & EPI */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shirt className="w-5 h-5 text-[#C48229]" />
                  6. Tamanhos de Fardamento & EPI (Uniforme JMT)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Informe suas medidas para separação do seu kit de uniforme e bota de segurança no almoxarifado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Camisa / Jaleco */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3 text-amber-400">
                    <Shirt className="w-6 h-6" />
                  </div>
                  <label className="block text-xs font-bold text-white mb-2">Tamanho da Camisa / Jaleco</label>
                  <select
                    value={fardamento.tamanhoCamisa}
                    onChange={(e) => setFardamento({ ...fardamento, tamanhoCamisa: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-semibold text-center focus:ring-2 focus:ring-[#C48229]"
                  >
                    <option value="PP">PP</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                    <option value="XG">XG (Extra Grande)</option>
                    <option value="XXG">XXG (Especial)</option>
                  </select>
                </div>

                {/* Calça */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 text-blue-400">
                    <span className="text-lg font-bold">👖</span>
                  </div>
                  <label className="block text-xs font-bold text-white mb-2">Número da Calça</label>
                  <select
                    value={fardamento.numeroCalca}
                    onChange={(e) => setFardamento({ ...fardamento, numeroCalca: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-semibold text-center focus:ring-2 focus:ring-[#C48229]"
                  >
                    {['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56'].map((tam) => (
                      <option key={tam} value={tam}>
                        Tamanho {tam}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calçado / Bota */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                    <span className="text-lg font-bold">🥾</span>
                  </div>
                  <label className="block text-xs font-bold text-white mb-2">Número do Calçado / Bota</label>
                  <select
                    value={fardamento.numeroCalcado}
                    onChange={(e) => setFardamento({ ...fardamento, numeroCalcado: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-semibold text-center focus:ring-2 focus:ring-[#C48229]"
                  >
                    {['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'].map((tam) => (
                      <option key={tam} value={tam}>
                        Nº {tam}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: UPLOAD DE DOCUMENTOS */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-[#C48229]" />
                  7. Envio de Fotos & Documentos Digitalizados
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Você pode tirar foto pelo celular ou anexar arquivos em PDF, JPG ou PNG (máx. 5MB cada).
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    tipo: 'RG / CNH Digital (Frente e Verso)',
                    obrigatorio: true,
                    desc: 'Documento de identificação com foto legível.',
                  },
                  {
                    tipo: 'Comprovante de Residência Recente',
                    obrigatorio: true,
                    desc: 'Conta de luz, água ou telefone dos últimos 90 dias em seu nome ou dos pais/cônjuge.',
                  },
                  {
                    tipo: 'Carteira de Trabalho (CTPS Digital em PDF)',
                    obrigatorio: true,
                    desc: 'Extrato ou PDF exportado do aplicativo Carteira de Trabalho Digital.',
                  },
                  {
                    tipo: 'Cartão do PIS / Extrato Caixa',
                    obrigatorio: false,
                    desc: 'Comprovante com o número do PIS/PASEP/NIT.',
                  },
                  {
                    tipo: 'Certidão de Casamento ou Nascimento dos Dependentes',
                    obrigatorio: false,
                    desc: 'Para fins de inclusão no salário-família e plano de saúde.',
                  },
                  {
                    tipo: 'Atestado de Saúde Ocupacional (ASO Admissional)',
                    obrigatorio: false,
                    desc: 'Caso já tenha realizado o exame médico na clínica indicada pelo DP.',
                  },
                ].map((item, idx) => {
                  const uploaded = documentosEnviados.find((d) => d.tipo === item.tipo);

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        uploaded
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            uploaded
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {uploaded ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-white">{item.tipo}</span>
                            {item.obrigatorio && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-medium border border-amber-500/30">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                          {uploaded && (
                            <span className="text-[11px] text-emerald-400 font-medium block mt-1">
                              Arquivo anexado: {uploaded.nomeArquivo} ({uploaded.tamanho})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {uploaded ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveDocumento(item.tipo)}
                            className="px-3 py-1.5 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-500/30 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remover
                          </button>
                        ) : (
                          <label className="px-4 py-2 bg-slate-800 hover:bg-[#C48229] text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700 shadow-xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Anexar / Tirar Foto</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleFileUpload(item.tipo, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 7: TERMO DE VERACIDADE & FINALIZAÇÃO */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C48229]" />
                  8. Declaração de Veracidade & Envio Final
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Revise o resumo das suas informações e confirme o envio ao Departamento Pessoal.
                </p>
              </div>

              {/* Resumo Rápido */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] block">
                  Resumo dos Dados Cadastrados
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <p><strong>Colaborador:</strong> {dadosPessoais.nomeCompleto || '-'}</p>
                  <p><strong>CPF:</strong> {dadosPessoais.cpf || '-'}</p>
                  <p><strong>WhatsApp:</strong> {contatoEndereco.telefoneWhatsapp || '-'}</p>
                  <p><strong>E-mail:</strong> {contatoEndereco.email || '-'}</p>
                  <p><strong>Cidade / UF:</strong> {contatoEndereco.cidadeUF || '-'}</p>
                  <p><strong>Banco / PIX:</strong> {dadosBancarios.banco} ({dadosBancarios.chavePix})</p>
                  <p><strong>Vale Transporte:</strong> {transporte.utilizaVT ? `${transporte.vtQuantidadeTarifasDia} passagens/dia` : 'Não optante'}</p>
                  <p><strong>Fardamento:</strong> Camisa {fardamento.tamanhoCamisa} | Calça {fardamento.numeroCalca} | Calçado {fardamento.numeroCalcado}</p>
                  <p><strong>Dependentes:</strong> {dependentes.length} dependente(s)</p>
                  <p><strong>Documentos Anexados:</strong> {documentosEnviados.length} arquivo(s)</p>
                </div>
              </div>

              {/* Norteadores Estratégicos JMT Welcome Box */}
              <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-[#C48229]/40 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C48229]/20 text-[#D8B97E] text-[10px] font-bold uppercase tracking-wider border border-[#C48229]/30">
                    Nossa Cultura • JMT
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Norteadores Estratégicos</span>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">Propósito</h4>
                  <p className="text-sm font-extrabold text-white">"Levar saúde com segurança, do remetente ao destino final."</p>
                </div>
                <div className="pt-1 border-t border-slate-800 flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Pilares Operacionais:</span>
                  <span>Segurança</span> • <span>Rastreabilidade</span> • <span>Pontualidade</span> • <span>Conformidade ANVISA/BPAD</span>
                </div>
              </div>

              {/* Termo de Veracidade */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={declaracaoVeracidade}
                    onChange={(e) => setDeclaracaoVeracidade(e.target.checked)}
                    className="w-5 h-5 rounded text-[#C48229] focus:ring-[#C48229] bg-slate-900 border-slate-700 mt-0.5"
                  />
                  <div className="text-xs text-slate-300">
                    <strong className="text-white block mb-0.5">Declaração de Veracidade das Informações</strong>
                    Declaro, sob as penas da lei (Art. 299 do Código Penal Brasileiro), que todas as informações e documentos por mim apresentados neste formulário são fiéis à verdade e condizentes com a realidade.
                  </div>
                </label>
                {errors.declaracaoVeracidade && (
                  <span className="text-[11px] text-rose-400 block pl-8">{errors.declaracaoVeracidade}</span>
                )}

                <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-800/80">
                  <input
                    type="checkbox"
                    required
                    checked={aceiteLgpd}
                    onChange={(e) => setAceiteLgpd(e.target.checked)}
                    className="w-5 h-5 rounded text-[#C48229] focus:ring-[#C48229] bg-slate-900 border-slate-700 mt-0.5"
                  />
                  <div className="text-xs text-slate-300">
                    <strong className="text-white block mb-0.5">Autorização de Tratamento de Dados (LGPD)</strong>
                    Autorizo a Jobson de Moraes Transportes (JMT) a coletar e tratar os meus dados pessoais exclusivamente para fins de registro admissional, cumprimento de obrigações trabalhistas, previdenciárias e fiscais (eSocial, CLT e ANVISA RDC 430).
                  </div>
                </label>
                {errors.aceiteLgpd && (
                  <span className="text-[11px] text-rose-400 block pl-8">{errors.aceiteLgpd}</span>
                )}
              </div>

              <HumanVerificationField onValidChange={setHumanCheckValid} error={errors.humanCheck} />
            </div>
          )}

          {erroEnvio && (
            <div className="flex items-start gap-2 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl p-3 mt-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erroEnvio}</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-800">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            ) : (
              <div />
            )}

            {currentStep < TABS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-amber-900/20"
              >
                <span>Próximo Passo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-[#C48229] to-amber-500 hover:from-amber-600 hover:to-amber-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-900/40 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitindo Dados ao DP...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Concluir & Enviar Admissão</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </main>

      {/* Footer Signature */}
      <footer className="py-5 border-t border-slate-900 text-center text-xs text-slate-400 bg-[#0c0c0c] px-4">
        <p className="font-bold text-slate-300">
          JOBSON DE MORAES TRANSPORTES | Segurança, Rastreabilidade e Pontualidade na Logística da Saúde
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Rigor operacional, conformidade regulatória ANVISA RDC 430/2020 e Boas Práticas de Distribuição e Armazenagem (BPAD)
        </p>
      </footer>
    </div>
  );
};
