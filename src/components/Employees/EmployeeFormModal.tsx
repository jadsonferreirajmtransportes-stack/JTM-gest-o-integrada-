import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  FileText,
  CreditCard,
  Users as UsersIcon,
  Bus,
  Stethoscope,
  Paperclip,
  Shirt,
  Save,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
  StickyNote,
  Loader2,
} from 'lucide-react';
import {
  Colaborador,
  Empregador,
  Supervisor,
  CargoSalario,
  EstadoCivil,
  RacaCor,
  GrauInstrucao,
  Genero,
  StatusColaborador,
  FormaPagamento,
  TipoConta,
  TipoChavePix,
  StatusDocumento,
  Dependente,
  DocumentoItem,
  AnotacaoColaborador,
  AnexoColaborador,
} from '../../types';
import {
  maskCPF,
  validateCPF,
  maskPhone,
  maskCEP,
  calcVtDia,
  calcVtMes,
  calcVaMes,
  calcExamStatus,
  calcDaysRemaining,
  calcVencimentoExame,
  formatMoney,
  formatDate,
} from '../../utils/formatters';
import { AsoImageUploader } from '../Common/AsoImageUploader';
import { EmployeeDossierSection } from './EmployeeDossierSection';
import { vincularColaboradorAoSetor } from '../../utils/sectorUtils';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pode ser assíncrona (é, no fluxo real — grava no Supabase). O modal espera essa
   *  Promise terminar antes de qualquer coisa: só fecha quando quem chama decidir (via
   *  `isOpen`), nunca por conta própria — assim, se a gravação falhar (ex.: sem conexão,
   *  anexo grande demais), o formulário continua aberto com os dados preenchidos, em vez
   *  de fechar e deixar o erro aparecer "do nada" depois. */
  onSave: (colaborador: Colaborador) => void | Promise<void>;
  initialData?: Colaborador | null;
  empregadores: Empregador[];
  supervisores: Supervisor[];
  cargos: CargoSalario[];
}

const DEFAULT_DOCUMENTS: DocumentoItem[] = [
  { id: 'doc-1', tipo: 'CPF/RG/CNH', status: 'Pendente' },
  { id: 'doc-2', tipo: 'Título de Eleitor', status: 'Pendente' },
  { id: 'doc-3', tipo: 'Carteira de Trabalho', status: 'Pendente' },
  { id: 'doc-4', tipo: 'Cartão do PIS', status: 'Pendente' },
  { id: 'doc-5', tipo: 'Certificado de Reservista', status: 'Não se aplica' },
  { id: 'doc-6', tipo: 'Certidão de Casamento', status: 'Não se aplica' },
  { id: 'doc-7', tipo: 'Comprovante de Residência', status: 'Pendente' },
  { id: 'doc-8', tipo: 'ASO Admissional', status: 'Pendente' },
  { id: 'doc-9', tipo: 'Certificado RDC 430', status: 'Pendente' },
];

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  empregadores,
  supervisores,
  cargos,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // true depois de uma tentativa de salvar que falhou por validação — controla o aviso
  // no rodapé (sem isso, um campo inválido bloqueia o salvamento sem nenhum aviso visível
  // se o usuário não notar o texto vermelho embaixo do campo, numa aba que pode nem estar
  // à vista no momento).
  const [tentouSalvarComErro, setTentouSalvarComErro] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroUploadDocumento, setErroUploadDocumento] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Colaborador>>({
    status: 'Ativo',
    formaPagamento: 'Mensal',
    tipoConta: 'Corrente',
    tipoChavePix: 'CPF',
    estadoCivil: 'Solteiro(a)',
    racaCor: 'Parda',
    grauInstrucao: 'Ensino Médio Completo',
    genero: 'Masculino',
    portadorDeficiencia: false,
    dependentes: [],
    documentos: DEFAULT_DOCUMENTS,
    historicoFardamento: [],
    onboarding: [],
    remuneracao: 3000,
    gratificacao: 0,
    valorValeAlimentacaoDia: 38,
    vtQuantidadeTarifasDia: 2,
    vtValorTarifa: 5.0,
    tamanhoCamisa: 'G',
    numeroCalca: '42',
    numeroCalcado: '41',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        documentos: initialData.documentos?.length ? initialData.documentos : DEFAULT_DOCUMENTS,
      });
    } else {
      setFormData({
        id: `colab-${Date.now()}`,
        codigoMatricula: `JMT-${Math.floor(100 + Math.random() * 900)}`,
        status: 'Ativo',
        empregadorId: empregadores[0]?.id || '',
        supervisorId: supervisores[0]?.id || '',
        formaPagamento: 'Mensal',
        tipoConta: 'Corrente',
        tipoChavePix: 'CPF',
        estadoCivil: 'Solteiro(a)',
        racaCor: 'Parda',
        grauInstrucao: 'Ensino Médio Completo',
        genero: 'Masculino',
        portadorDeficiencia: false,
        dependentes: [],
        documentos: DEFAULT_DOCUMENTS,
        historicoFardamento: [],
        onboarding: [],
        remuneracao: 3200,
        gratificacao: 0,
        valorValeAlimentacaoDia: 38,
        vtQuantidadeTarifasDia: 2,
        vtValorTarifa: 5.0,
        tamanhoCamisa: 'G',
        numeroCalca: '42',
        numeroCalcado: '41',
        dataAdmissao: new Date().toISOString().slice(0, 10),
        jornadaTrabalho: '08:00 às 17:48 (Seg a Sex com 1h de almoço)',
      });
    }
    setActiveTab(0);
    setErrors({});
    setTentouSalvarComErro(false);
    setSalvando(false);
  }, [initialData, isOpen, empregadores, supervisores]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Colaborador, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Check salary against position min/max band (2.10)
  const selectedCargoObj = cargos.find((c) => c.cargo === formData.funcaoCargo);
  const isSalaryOutOfRange =
    selectedCargoObj &&
    formData.remuneracao !== undefined &&
    (formData.remuneracao < selectedCargoObj.faixaSalarialMinima ||
      formData.remuneracao > selectedCargoObj.faixaSalarialMaxima);

  // Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.nomeCompleto?.trim()) {
      errs.nomeCompleto = 'Nome completo é obrigatório';
    }
    if (!formData.cpf?.trim()) {
      errs.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      errs.cpf = 'CPF inválido (dígitos verificadores incorretos)';
    }
    if (!formData.email?.trim() || !formData.email.includes('@')) {
      errs.email = 'E-mail válido é obrigatório';
    }
    if (!formData.telefoneWhatsapp?.trim()) {
      errs.telefoneWhatsapp = 'Telefone/WhatsApp é obrigatório';
    }
    if (!formData.funcaoCargo?.trim()) {
      errs.funcaoCargo = 'Selecione o cargo/função';
    }
    if (!formData.dataAdmissao) {
      errs.dataAdmissao = 'Data de admissão é obrigatória';
    }
    if (!formData.remuneracao || formData.remuneracao <= 0) {
      errs.remuneracao = 'Informe a remuneração';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Switch to first tab if personal error
      if (errs.nomeCompleto || errs.cpf || errs.email || errs.telefoneWhatsapp) {
        setActiveTab(0);
      } else if (errs.funcaoCargo || errs.dataAdmissao || errs.remuneracao) {
        setActiveTab(1);
      }
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setTentouSalvarComErro(true);
      return;
    }
    setTentouSalvarComErro(false);
    setSalvando(true);
    try {
      // Espera a gravação terminar de verdade (pode levar vários segundos com anexos
      // grandes) antes de soltar o botão — NÃO fecha o modal aqui: quem chama (App.tsx)
      // é quem decide fechar, e só fecha se salvar com sucesso. Assim, se der erro no
      // meio do caminho, o formulário continua aberto com tudo preenchido, em vez de
      // fechar cedo demais e deixar o erro aparecer desconectado do que o usuário fez.
      await onSave(formData as Colaborador);
    } finally {
      setSalvando(false);
    }
  };

  // Dependents helpers
  const handleAddDependente = () => {
    const newDep: Dependente = {
      id: `dep-${Date.now()}`,
      nome: '',
      parentesco: 'Filho(a)',
      dataNascimento: '',
      cpf: '',
    };
    setFormData((prev) => ({
      ...prev,
      dependentes: [...(prev.dependentes || []), newDep],
    }));
  };

  const handleRemoveDependente = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      dependentes: prev.dependentes?.filter((d) => d.id !== id),
    }));
  };

  const handleUpdateDependente = (id: string, field: keyof Dependente, val: any) => {
    setFormData((prev) => ({
      ...prev,
      dependentes: prev.dependentes?.map((d) => (d.id === id ? { ...d, [field]: val } : d)),
    }));
  };

  // Documents helper
  const handleDocStatusChange = (docId: string, status: StatusDocumento) => {
    setFormData((prev) => ({
      ...prev,
      documentos: prev.documentos?.map((d) => (d.id === docId ? { ...d, status } : d)),
    }));
  };

  // Antes chamada "Simulated" com razão: só gravava o nome do arquivo e marcava
  // "Recebido", sem nunca ler o conteúdo — o documento aparecia como recebido em
  // todo lugar, mas não existia arquivo nenhum pra baixar depois (nem aqui, nem na
  // Ficha Cadastral compartilhada). Agora lê de verdade, com o mesmo limite de
  // tamanho dos outros uploads (ver EmployeeDossierSection.tsx/AsoImageUploader.tsx —
  // anexos grandes na mesma gravação estouram o tempo limite do banco).
  const LIMITE_DOCUMENTO_MB = 8;
  // Limite COMBINADO entre documentos + dossiê de anexos + ASO — os 3 campos gravam no mesmo
  // registro do colaborador, então o que importa pro banco não estourar o tempo limite é a
  // SOMA de tudo, não cada campo isolado (caso real: colaborador com vários documentos de
  // ~7-8MB cada passava longe disso mesmo com o dossiê de anexos vazio).
  const LIMITE_TOTAL_GERAL_MB = 20;
  const tamanhoDocumentosMB =
    (formData.documentos || []).reduce((soma, d) => soma + (d.arquivoUrl?.length || 0), 0) / (1024 * 1024);
  const tamanhoAnexosMB =
    (formData.anexos || []).reduce((soma, a) => soma + (a.arquivoUrl?.length || 0), 0) / (1024 * 1024);
  const tamanhoAsoMB = (formData.asoImagemUrl?.length || 0) / (1024 * 1024);

  const handleDocUploadSimulated = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroUploadDocumento(null);

    const tamanhoMB = file.size / (1024 * 1024);
    if (tamanhoMB > LIMITE_DOCUMENTO_MB) {
      setErroUploadDocumento(
        `"${file.name}" tem ${tamanhoMB.toFixed(1)}MB — o limite é ${LIMITE_DOCUMENTO_MB}MB. Comprima o arquivo ou tire uma foto em resolução menor.`
      );
      e.target.value = '';
      return;
    }

    const tamanhoOutrosDocumentosMB =
      (formData.documentos || [])
        .filter((d) => d.id !== docId)
        .reduce((soma, d) => soma + (d.arquivoUrl?.length || 0), 0) / (1024 * 1024);
    const totalComEsteMB = tamanhoOutrosDocumentosMB + tamanhoAnexosMB + tamanhoAsoMB + tamanhoMB;
    if (totalComEsteMB > LIMITE_TOTAL_GERAL_MB) {
      setErroUploadDocumento(
        `Esse arquivo deixaria o total de anexos deste colaborador em ~${totalComEsteMB.toFixed(1)}MB (limite combinado: ${LIMITE_TOTAL_GERAL_MB}MB, somando documentos + dossiê + ASO) — pode falhar ao salvar. Remova algum anexo antigo ou comprima este arquivo antes.`
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        documentos: prev.documentos?.map((d) =>
          d.id === docId
            ? {
                ...d,
                status: 'Recebido',
                nomeArquivo: file.name,
                arquivoUrl: reader.result as string,
                dataUpload: new Date().toISOString().slice(0, 10),
              }
            : d
        ),
      }));
    };
    reader.readAsDataURL(file);
  };

  // Fardamento history helper
  const handleAddFardamentoHistory = () => {
    const item = prompt('Informe o item alterado (ex: Camisa Pólo, Bota Frigorífica):');
    if (!item) return;
    const tamanhoNovo = prompt('Informe o novo tamanho:');
    if (!tamanhoNovo) return;

    const hist = {
      id: `hf-${Date.now()}`,
      data: new Date().toISOString().slice(0, 10),
      itemAlterado: item,
      tamanhoAnterior: 'Anterior',
      tamanhoNovo: tamanhoNovo,
      responsavel: 'Jadson Ferreira (RH)',
    };
    setFormData((prev) => ({
      ...prev,
      historicoFardamento: [...(prev.historicoFardamento || []), hist],
    }));
  };

  const tabs = [
    { id: 0, label: '2.2 Pessoais', icon: User },
    { id: 1, label: '2.3 Contratuais', icon: FileText },
    { id: 2, label: '2.4 Bancários', icon: CreditCard },
    { id: 3, label: '2.5 Dependentes', icon: UsersIcon },
    { id: 4, label: '2.6 Vale Transp.', icon: Bus },
    { id: 5, label: '2.7 Saúde (ASO RDC 430)', icon: Stethoscope },
    { id: 6, label: '2.8 Documentos', icon: Paperclip },
    { id: 7, label: '2.9 Fardamento/EPI', icon: Shirt },
    { id: 8, label: '2.10 Anotações & Anexos', icon: StickyNote },
  ];

  // Calculated VT per day
  const vtTotalDia = calcVtDia(formData.vtValorTarifa || 0, formData.vtQuantidadeTarifasDia || 0);

  // Calculated Exam Status
  const currentExamStatus = calcExamStatus(formData.dataVencimentoExame);
  const examDays = calcDaysRemaining(formData.dataVencimentoExame);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              {formData.codigoMatricula || 'NOVO COLABORADOR'}
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {initialData ? `Editar: ${formData.nomeCompleto || 'Colaborador'}` : 'Cadastrar Novo Colaborador — JMT'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto shrink-0 custom-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border-b-2 transition-all ${
                  isCurrent
                    ? 'border-amber-600 text-amber-700 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 0: DADOS PESSOAIS (2.2) */}
          {activeTab === 0 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
                2.2 Dados Pessoais do Colaborador
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nomeCompleto || ''}
                    onChange={(e) => handleChange('nomeCompleto', e.target.value)}
                    className={`w-full p-2 border rounded-lg ${
                      errors.nomeCompleto ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                    }`}
                    placeholder="Ex: João da Silva Santos"
                  />
                  {errors.nomeCompleto && (
                    <span className="text-rose-600 text-[11px] mt-0.5 block">{errors.nomeCompleto}</span>
                  )}
                </div>

                {/* CPF */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    CPF (com validação) *
                  </label>
                  <input
                    type="text"
                    value={formData.cpf || ''}
                    onChange={(e) => handleChange('cpf', maskCPF(e.target.value))}
                    className={`w-full p-2 border rounded-lg font-mono ${
                      errors.cpf ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                    }`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.cpf && (
                    <span className="text-rose-600 text-[11px] mt-0.5 block">{errors.cpf}</span>
                  )}
                </div>

                {/* Nome da Mãe */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nome da Mãe</label>
                  <input
                    type="text"
                    value={formData.nomeMae || ''}
                    onChange={(e) => handleChange('nomeMae', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Nome completo da mãe"
                  />
                </div>

                {/* Nome do Pai */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nome do Pai</label>
                  <input
                    type="text"
                    value={formData.nomePai || ''}
                    onChange={(e) => handleChange('nomePai', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Nome completo do pai"
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.dataNascimento || ''}
                    onChange={(e) => handleChange('dataNascimento', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                {/* RG & Órgão Emissor */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">RG</label>
                  <input
                    type="text"
                    value={formData.rg || ''}
                    onChange={(e) => handleChange('rg', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="00.000.000-0"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Órgão Emissor / UF</label>
                  <input
                    type="text"
                    value={formData.orgaoEmissorUF || 'SSP/SP'}
                    onChange={(e) => handleChange('orgaoEmissorUF', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: SSP/SP"
                  />
                </div>

                {/* Gênero */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gênero</label>
                  <select
                    value={formData.genero || 'Masculino'}
                    onChange={(e) => handleChange('genero', e.target.value as Genero)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                {/* Estado Civil */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Estado Civil</label>
                  <select
                    value={formData.estadoCivil || 'Solteiro(a)'}
                    onChange={(e) => handleChange('estadoCivil', e.target.value as EstadoCivil)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
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
                  <label className="font-semibold text-slate-700 block mb-1">Raça / Cor</label>
                  <select
                    value={formData.racaCor || 'Parda'}
                    onChange={(e) => handleChange('racaCor', e.target.value as RacaCor)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Branca">Branca</option>
                    <option value="Preta">Preta</option>
                    <option value="Parda">Parda</option>
                    <option value="Amarela">Amarela</option>
                    <option value="Indígena">Indígena</option>
                    <option value="Não declarada">Não declarada</option>
                  </select>
                </div>

                {/* Grau de Instrução */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Grau de Instrução</label>
                  <select
                    value={formData.grauInstrucao || 'Ensino Médio Completo'}
                    onChange={(e) => handleChange('grauInstrucao', e.target.value as GrauInstrucao)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
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

                {/* Naturalidade */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Naturalidade</label>
                  <input
                    type="text"
                    value={formData.naturalidade || ''}
                    onChange={(e) => handleChange('naturalidade', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: Natal/RN"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Telefone (WhatsApp) *</label>
                  <input
                    type="text"
                    value={formData.telefoneWhatsapp || ''}
                    onChange={(e) => handleChange('telefoneWhatsapp', maskPhone(e.target.value))}
                    className={`w-full p-2 border rounded-lg ${
                      errors.telefoneWhatsapp ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                    }`}
                    placeholder="(11) 90000-0000"
                    maxLength={15}
                  />
                  {errors.telefoneWhatsapp && (
                    <span className="text-rose-600 text-[11px] mt-0.5 block">{errors.telefoneWhatsapp}</span>
                  )}
                </div>

                {/* E-mail */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">E-mail *</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full p-2 border rounded-lg ${
                      errors.email ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                    }`}
                    placeholder="colaborador@jmt.com.br"
                  />
                  {errors.email && (
                    <span className="text-rose-600 text-[11px] mt-0.5 block">{errors.email}</span>
                  )}
                </div>

                {/* Endereço Completo */}
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={formData.enderecoCompleto || ''}
                    onChange={(e) => handleChange('enderecoCompleto', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Rua, Número, Bairro, Complemento"
                  />
                </div>

                {/* Cidade / UF */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    value={formData.cidadeUF || 'São Paulo / SP'}
                    onChange={(e) => handleChange('cidadeUF', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: São Paulo / SP"
                  />
                </div>

                {/* CEP */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">CEP</label>
                  <input
                    type="text"
                    value={formData.cep || ''}
                    onChange={(e) => handleChange('cep', maskCEP(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                {/* Portador de Deficiência (PCD) */}
                <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.portadorDeficiencia}
                      onChange={(e) => handleChange('portadorDeficiencia', e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300"
                    />
                    <span className="font-semibold text-slate-800">
                      Portador de Deficiência (PCD / Laudo Médico)?
                    </span>
                  </label>
                  {formData.portadorDeficiencia && (
                    <input
                      type="text"
                      placeholder="Detalhes / CID da deficiência"
                      value={formData.detalheDeficiencia || ''}
                      onChange={(e) => handleChange('detalheDeficiencia', e.target.value)}
                      className="p-1.5 border border-slate-200 rounded-lg text-xs flex-1"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: DADOS CONTRATUAIS (2.3) */}
          {activeTab === 1 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
                2.3 Dados Contratuais & Vínculo Empregatício
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {/* Empregador */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Empregador (Empresa) *</label>
                  <select
                    value={formData.empregadorId || ''}
                    onChange={(e) => handleChange('empregadorId', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    {empregadores.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nomeFantasia || emp.razaoSocial}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Contratual *</label>
                  <select
                    value={formData.status || 'Ativo'}
                    onChange={(e) => handleChange('status', e.target.value as StatusColaborador)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Férias">Férias</option>
                    <option value="Afastado">Afastado</option>
                    <option value="Inativo">Inativo (Demitido)</option>
                  </select>
                </div>

                {/* Cargo / Função */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Função / Cargo *</label>
                  <select
                    value={formData.funcaoCargo || ''}
                    onChange={(e) => {
                      const cargo = e.target.value;
                      const selectedObj = cargos.find((c) => c.cargo === cargo);
                      handleChange('funcaoCargo', cargo);
                      if (selectedObj) {
                        handleChange('setor', selectedObj.setor);
                        // Preenche com o piso da Convenção Coletiva do cargo (ou a faixa mínima,
                        // se não houver piso cadastrado) — sempre que a função muda, não só
                        // quando o valor atual está zerado ou abaixo do mínimo. O usuário pode
                        // ajustar o valor na sequência se o salário real for diferente do piso.
                        handleChange(
                          'remuneracao',
                          selectedObj.pisoConvencaoColetiva ?? selectedObj.faixaSalarialMinima
                        );
                      }
                    }}
                    className={`w-full p-2 border rounded-lg ${
                      errors.funcaoCargo ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  >
                    <option value="">Selecione o Cargo</option>
                    {cargos.map((c) => (
                      <option key={c.id} value={c.cargo}>
                        {c.cargo} ({c.setor})
                      </option>
                    ))}
                  </select>
                  {errors.funcaoCargo && (
                    <span className="text-rose-600 text-[11px] mt-0.5 block">{errors.funcaoCargo}</span>
                  )}
                </div>

                {/* Setor */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Setor / Departamento</label>
                  <input
                    type="text"
                    value={formData.setor || ''}
                    onChange={(e) => handleChange('setor', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: Transportes, Armazenagem, Garantia da Qualidade"
                  />
                </div>

                {/* Operação vinculada (Aéreo/Rodoviário/DP) — antes só existia o campo de texto
                    livre "Setor" acima, que podia ficar dessincronizado do que realmente conta
                    pra headcount/carteira de cada setor nos painéis gerenciais (Equipe do Setor,
                    badges do menu etc.). Esses botões gravam direto em setoresAtuacao, o campo
                    que essas contagens de verdade usam. */}
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Operação Vinculada (Equipe do Setor)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'farma_aereo', label: 'Farma Aéreo' },
                        { id: 'farma_rodoviario', label: 'Farma Rodoviário' },
                      ] as const
                    ).map((opt) => {
                      const ativo = (formData.setoresAtuacao || []).includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const atualizado = vincularColaboradorAoSetor(
                              formData as Colaborador,
                              opt.id,
                              !ativo
                            );
                            setFormData((prev) => ({
                              ...prev,
                              setoresAtuacao: atualizado.setoresAtuacao,
                              setorPrincipal: atualizado.setorPrincipal,
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                            ativo
                              ? 'bg-amber-600 border-amber-600 text-white'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-amber-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pode marcar mais de um — usado pra contar a equipe alocada em cada setor nos
                    painéis gerenciais.
                  </p>
                </div>

                {/* Supervisor Direto */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supervisor Direto (2.17)</label>
                  <select
                    value={formData.supervisorId || ''}
                    onChange={(e) => handleChange('supervisorId', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="">Selecione o Supervisor</option>
                    {supervisores.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.nome} ({sup.cargo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data de Admissão */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Admissão *</label>
                  <input
                    type="date"
                    value={formData.dataAdmissao || ''}
                    onChange={(e) => handleChange('dataAdmissao', e.target.value)}
                    className={`w-full p-2 border rounded-lg ${
                      errors.dataAdmissao ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  />
                  {errors.dataAdmissao && (
                    <span className="text-rose-600 text-[11px] mt-0.5 block">{errors.dataAdmissao}</span>
                  )}
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Forma de Pagamento</label>
                  <select
                    value={formData.formaPagamento || 'Mensal'}
                    onChange={(e) => handleChange('formaPagamento', e.target.value as FormaPagamento)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="Semanal">Semanal</option>
                  </select>
                </div>

                {/* Remuneração Base */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Remuneração Base (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.remuneracao ?? ''}
                    onChange={(e) => handleChange('remuneracao', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                  {/* Validation against salary band */}
                  {selectedCargoObj && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      Faixa do Cargo: {formatMoney(selectedCargoObj.faixaSalarialMinima)} a{' '}
                      {formatMoney(selectedCargoObj.faixaSalarialMaxima)}
                      {isSalaryOutOfRange && (
                        <span className="text-amber-600 block font-semibold">
                          Aviso: Fora da faixa salarial padrão cadastrada.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Gratificação */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gratificação / Adicional (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gratificacao ?? ''}
                    onChange={(e) => handleChange('gratificacao', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="0.00"
                  />
                </div>

                {/* Valor Vale Alimentação / Dia */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Valor de Vale-Alimentação / Dia (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorValeAlimentacaoDia ?? ''}
                    onChange={(e) => handleChange('valorValeAlimentacaoDia', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">
                    Provisão mensal: {formatMoney(calcVaMes(formData.valorValeAlimentacaoDia || 0))} (22 dias)
                  </span>
                </div>

                {/* Jornada de Trabalho */}
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Jornada de Trabalho</label>
                  <input
                    type="text"
                    value={formData.jornadaTrabalho || ''}
                    onChange={(e) => handleChange('jornadaTrabalho', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: das 08:00 às 17:00, segunda a sexta (44h semanais)"
                  />
                </div>

                {/* Nº da CTPS */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nº da CTPS</label>
                  <input
                    type="text"
                    value={formData.ctpsNumero || ''}
                    onChange={(e) => handleChange('ctpsNumero', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: 1234567"
                  />
                </div>

                {/* Série da CTPS */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Série da CTPS</label>
                  <input
                    type="text"
                    value={formData.ctpsSerie || ''}
                    onChange={(e) => handleChange('ctpsSerie', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: 00123"
                  />
                </div>

                {/* UF da CTPS */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">UF da CTPS</label>
                  <input
                    type="text"
                    value={formData.ctpsUF || ''}
                    onChange={(e) => handleChange('ctpsUF', e.target.value.toUpperCase().slice(0, 2))}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: RN"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DADOS BANCÁRIOS (2.4) */}
          {activeTab === 2 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
                2.4 Dados Bancários e Chave PIX para Pagamento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Instituição Bancária</label>
                  <input
                    type="text"
                    value={formData.banco || ''}
                    onChange={(e) => handleChange('banco', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: Itaú, Bradesco, Banco do Brasil, Santander, Nubank"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Agência</label>
                  <input
                    type="text"
                    value={formData.agencia || ''}
                    onChange={(e) => handleChange('agencia', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    placeholder="0000"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo de Conta</label>
                  <select
                    value={formData.tipoConta || 'Corrente'}
                    onChange={(e) => handleChange('tipoConta', e.target.value as TipoConta)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Corrente">Corrente</option>
                    <option value="Poupança">Poupança</option>
                    <option value="Salário">Salário</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Número da Conta com Dígito</label>
                  <input
                    type="text"
                    value={formData.numeroConta || ''}
                    onChange={(e) => handleChange('numeroConta', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    placeholder="00000-0"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo de Chave PIX</label>
                  <select
                    value={formData.tipoChavePix || 'CPF'}
                    onChange={(e) => handleChange('tipoChavePix', e.target.value as TipoChavePix)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Aleatória">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chave PIX</label>
                  <input
                    type="text"
                    value={formData.chavePix || ''}
                    onChange={(e) => handleChange('chavePix', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    placeholder="Insira a chave PIX"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEPENDENTES (2.5) */}
          {activeTab === 3 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <h3 className="text-sm font-bold text-slate-900">
                  2.5 Dependentes Cadastrados ({formData.dependentes?.length || 0})
                </h3>
                <button
                  type="button"
                  onClick={handleAddDependente}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Dependente</span>
                </button>
              </div>

              {formData.dependentes?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  Nenhum dependente cadastrado para este colaborador.
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.dependentes?.map((dep, idx) => (
                    <div
                      key={dep.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs items-center"
                    >
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block">Nome Completo</label>
                        <input
                          type="text"
                          value={dep.nome}
                          onChange={(e) => handleUpdateDependente(dep.id, 'nome', e.target.value)}
                          placeholder="Nome do dependente"
                          className="w-full p-1.5 border border-slate-200 rounded-md bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block">Parentesco</label>
                        <select
                          value={dep.parentesco}
                          onChange={(e) => handleUpdateDependente(dep.id, 'parentesco', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded-md bg-white"
                        >
                          <option value="Filho(a)">Filho(a)</option>
                          <option value="Cônjuge">Cônjuge</option>
                          <option value="Pai/Mãe">Pai/Mãe</option>
                          <option value="Enteado(a)">Enteado(a)</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block">Data de Nascimento</label>
                        <input
                          type="date"
                          value={dep.dataNascimento}
                          onChange={(e) => handleUpdateDependente(dep.id, 'dataNascimento', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded-md bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 font-semibold block">CPF</label>
                          <input
                            type="text"
                            value={dep.cpf}
                            onChange={(e) => handleUpdateDependente(dep.id, 'cpf', maskCPF(e.target.value))}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="w-full p-1.5 border border-slate-200 rounded-md bg-white font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependente(dep.id)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md mt-3"
                          title="Remover dependente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VALE TRANSPORTE (2.6) */}
          {activeTab === 4 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
                2.6 Vale-Transporte & Condução Diária
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Quantidade de Tarifas / Dia
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={formData.vtQuantidadeTarifasDia ?? 2}
                    onChange={(e) => handleChange('vtQuantidadeTarifasDia', parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                  <span className="text-[10px] text-slate-500">Ex: 2 para ida e volta padrão</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Valor da Tarifa Unitária (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.vtValorTarifa ?? 5.0}
                    onChange={(e) => handleChange('vtValorTarifa', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                  <span className="text-[10px] text-slate-500">Tarifa do transporte público utilizado</span>
                </div>

                {/* Campo Calculado AUTOMATICAMENTE */}
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
                    Total / Dia (Calculado: Qtd × Tarifa)
                  </span>
                  <div className="text-xl font-extrabold text-amber-950 mt-0.5">
                    {formatMoney(vtTotalDia)}
                  </div>
                  <span className="text-[11px] text-amber-800 mt-1 block">
                    Mensal estimado (22 dias):{' '}
                    <strong>
                      {formatMoney(calcVtMes(formData.vtValorTarifa || 0, formData.vtQuantidadeTarifasDia || 0))}
                    </strong>
                  </span>
                </div>

                <div className="sm:col-span-3">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Identificação da Condução (Linha / Ônibus / Metrô)
                  </label>
                  <input
                    type="text"
                    value={formData.vtIdentificacaoConducao || ''}
                    onChange={(e) => handleChange('vtIdentificacaoConducao', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: Ônibus Linha 330 EMTU + Metrô Linha 1 Azul"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SAÚDE DO TRABALHADOR (2.7) */}
          {activeTab === 5 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <h3 className="text-sm font-bold text-slate-900">
                  2.7 Saúde do Trabalhador & Rastreabilidade ANVISA RDC 430
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                  Status: {currentExamStatus}
                </span>
              </div>

              {/* Upload e Visualização da Imagem do ASO */}
              <AsoImageUploader
                asoImagemUrl={formData.asoImagemUrl}
                asoNomeArquivo={formData.asoNomeArquivo}
                tamanhoOutrosCamposMB={tamanhoDocumentosMB + tamanhoAnexosMB}
                onImageChange={(dataUrl, fileName) => {
                  handleChange('asoImagemUrl', dataUrl);
                  handleChange('asoNomeArquivo', fileName);
                  // Sync with Document checklist
                  setFormData((prev) => ({
                    ...prev,
                    asoImagemUrl: dataUrl,
                    asoNomeArquivo: fileName,
                    documentos: prev.documentos?.map((d) =>
                      d.tipo === 'ASO Admissional'
                        ? {
                            ...d,
                            status: 'Recebido',
                            nomeArquivo: fileName,
                            arquivoUrl: dataUrl,
                            dataUpload: new Date().toISOString().slice(0, 10),
                          }
                        : d
                    ),
                  }));
                }}
                onImageRemove={() => {
                  handleChange('asoImagemUrl', undefined);
                  handleChange('asoNomeArquivo', undefined);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data do Exame Admissional</label>
                  <input
                    type="date"
                    value={formData.dataExameAdmissional || ''}
                    onChange={(e) => {
                      const novaData = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        dataExameAdmissional: novaData,
                        // Só recalcula o vencimento a partir do admissional se ainda não houver
                        // exame periódico registrado — o periódico é a referência mais recente.
                        dataVencimentoExame: prev.dataUltimoExameOcupacional
                          ? prev.dataVencimentoExame
                          : calcVencimentoExame(novaData),
                      }));
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Último Exame Periódico</label>
                  <input
                    type="date"
                    value={formData.dataUltimoExameOcupacional || ''}
                    onChange={(e) => {
                      const novaData = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        dataUltimoExameOcupacional: novaData,
                        // Vencimento = 12 meses após o último exame periódico (periodicidade
                        // padrão do PCMSO). Continua editável manualmente depois, caso o médico
                        // do trabalho indique uma periodicidade diferente.
                        dataVencimentoExame: calcVencimentoExame(novaData),
                      }));
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Data de Vencimento do Exame *
                    <span className="font-normal text-slate-400"> (calculado, editável)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dataVencimentoExame || ''}
                    onChange={(e) => handleChange('dataVencimentoExame', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                  {formData.dataVencimentoExame && (
                    <span
                      className={`text-[10px] font-bold block mt-1 ${
                        currentExamStatus === 'Vencido'
                          ? 'text-rose-600'
                          : currentExamStatus === 'A vencer'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      Status Calculado: {currentExamStatus} ({examDays} dias restantes)
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Resultado do ASO</label>
                  <select
                    value={formData.asoResultado || 'Apto'}
                    onChange={(e) => handleChange('asoResultado', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-800"
                  >
                    <option value="Apto">Apto para a função</option>
                    <option value="Apto com Restrições">Apto com Restrições</option>
                    <option value="Inapto">Inapto</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Clínica Médica Emitente</label>
                  <input
                    type="text"
                    value={formData.clinicaMedica || 'MedSeg Medicina do Trabalho'}
                    onChange={(e) => handleChange('clinicaMedica', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Nome da clínica ou médico emitente"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Médico Coordenador / CRM</label>
                  <input
                    type="text"
                    value={formData.asoMedicoEmitente || ''}
                    onChange={(e) => handleChange('asoMedicoEmitente', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: Dr. Flávio Santos (CRM/SP 124.580)"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data do Exame Demissional (se houver)</label>
                  <input
                    type="date"
                    value={formData.dataExameDemissional || ''}
                    onChange={(e) => handleChange('dataExameDemissional', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Observações Médicas / Restrições</label>
                  <input
                    type="text"
                    value={formData.observacaoSaude || ''}
                    onChange={(e) => handleChange('observacaoSaude', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Ex: Apto sem restrições para trabalho em câmara fria e transporte de termolábeis."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTAÇÃO (2.8) */}
          {activeTab === 6 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
                2.8 Documentação Obrigatória — Checklist de Anexos
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o status e anexe os arquivos digitalizados de cada documento exigido pela ANVISA e CLT
                (até {LIMITE_DOCUMENTO_MB}MB por arquivo).
              </p>

              {erroUploadDocumento && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{erroUploadDocumento}</span>
                </div>
              )}

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {formData.documentos?.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span>{doc.tipo}</span>
                        {doc.nomeArquivo && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.2 rounded-sm font-mono truncate">
                            {doc.nomeArquivo}
                          </span>
                        )}
                      </div>
                      {doc.observacao && (
                        <div className="text-[11px] text-amber-700 mt-0.5">{doc.observacao}</div>
                      )}
                      {doc.status === 'Recebido' && !doc.arquivoUrl && (
                        <div className="text-[11px] text-amber-700 mt-0.5 font-semibold">
                          Marcado como recebido, mas sem arquivo anexado — clique em "Alterar" pra anexar de verdade.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={doc.status}
                        onChange={(e) => handleDocStatusChange(doc.id, e.target.value as StatusDocumento)}
                        className={`p-1.5 rounded-lg border text-xs font-bold ${
                          doc.status === 'Recebido'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : doc.status === 'Pendente'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="Recebido">Recebido</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Não se aplica">Não se aplica</option>
                      </select>

                      <label className="cursor-pointer px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1 text-xs">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{doc.nomeArquivo ? 'Alterar' : 'Anexar'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleDocUploadSimulated(doc.id, e)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: FARDAMENTO E EPI (2.9) */}
          {activeTab === 7 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">
                2.9 Fardamento e Equipamentos de Proteção Individual (EPI)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tamanho da Camisa</label>
                  <select
                    value={formData.tamanhoCamisa || 'G'}
                    onChange={(e) => handleChange('tamanhoCamisa', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="PP">PP</option>
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                    <option value="XG">XG</option>
                    <option value="EXG">EXG</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Número da Calça</label>
                  <select
                    value={formData.numeroCalca || '42'}
                    onChange={(e) => handleChange('numeroCalca', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    {['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56'].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Número do Calçado</label>
                  <select
                    value={formData.numeroCalcado || '41'}
                    onChange={(e) => handleChange('numeroCalcado', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    {['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Histórico de Fardamento */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-xs">Histórico de Entregas e Atualizações</h4>
                  <button
                    type="button"
                    onClick={handleAddFardamentoHistory}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                  >
                    + Registrar Troca / Entrega
                  </button>
                </div>

                {formData.historicoFardamento?.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                    Nenhum registro no histórico de fardamento.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {formData.historicoFardamento?.map((h) => (
                      <div key={h.id} className="p-2.5 bg-white flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{h.itemAlterado}</div>
                          <div className="text-[11px] text-slate-500">
                            {h.tamanhoAnterior} &rarr; <strong>{h.tamanhoNovo}</strong>
                            {h.motivo && ` (${h.motivo})`}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          <div>{formatDate(h.data)}</div>
                          <div className="text-[10px]">{h.responsavel}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: ANOTAÇÕES E ANEXOS (2.10) */}
          {activeTab === 8 && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <h3 className="text-sm font-bold text-slate-900">
                  2.10 Anotações Internas, Prontuário & Dossiê de Anexos
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                  {formData.anotacoes?.length || 0} Anotações | {formData.anexos?.length || 0} Anexos
                </span>
              </div>

              <EmployeeDossierSection
                anotacoes={formData.anotacoes || []}
                anexos={formData.anexos || []}
                observacoesGerais={formData.observacoesGerais || ''}
                onUpdateAnotacoes={(newNotes) => handleChange('anotacoes', newNotes)}
                onUpdateAnexos={(newAnexos) => handleChange('anexos', newAnexos)}
                onUpdateObservacoesGerais={(text) => handleChange('observacoesGerais', text)}
                tamanhoOutrosCamposMB={tamanhoDocumentosMB + tamanhoAsoMB}
              />
            </div>
          )}
        </div>

        {/* Aviso de validação — some sozinho quando o usuário corrige os campos listados */}
        {tentouSalvarComErro && Object.keys(errors).length > 0 && (
          <div className="px-4 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs font-semibold shrink-0 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Não foi possível salvar — corrija: {Object.values(errors).join('; ')}.
            </span>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab((prev) => prev - 1)}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
              >
                &larr; Anterior
              </button>
            )}

            {activeTab < tabs.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveTab((prev) => prev + 1)}
                className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Próximo &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={salvando}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando... (pode levar um pouco se houver anexos grandes)</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Cadastro</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
