import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  FileText,
  ShieldCheck,
  DollarSign,
  Truck,
  MapPin,
  Phone,
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  Thermometer,
  Calendar,
  Layers,
  Clock,
  User,
} from 'lucide-react';
import {
  Cliente,
  Empregador,
  Supervisor,
  SegmentoCliente,
  StatusCliente,
  TipoOperacaoContratada,
  FaixaTemperaturaExigida,
  ContatoCliente,
  RegiaoAtendimento,
  FaixaTarifaCidade,
  CustoExtraTarifa,
  TabelaPrecoFrete,
} from '../../types';
import { TabelaFreteEditor, TABELA_FRETE_PADRAO } from './TabelaFreteEditor';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cliente: Cliente) => void;
  initialData?: Cliente | null;
  empregadores: Empregador[];
  supervisores: Supervisor[];
  existingClientsCount: number;
}

const SEGMENTOS_OPTIONS: SegmentoCliente[] = [
  'Distribuidora de Medicamentos',
  'Indústria Farmacêutica',
  'Rede de Drogarias / Farmácias',
  'Hospital / Clínica / Operadora de Saúde',
  'Alimentos Climatizados / Frios',
  'Cosméticos / Higiene / Nutracêuticos',
  'Atacado / Carga Seca',
  'Outro Segmento',
];

const TIPOS_OPERACAO_OPTIONS: TipoOperacaoContratada[] = [
  'Distribuição Fracionada (Last Mile)',
  'Transferência Dedicada (Lotação)',
  'Cross-Docking / Armazenagem Fria',
  'Coleta & Logística Reversa',
  'Transporte Termolábil Crítico (2°C a 8°C)',
  'Transporte Climatizado (15°C a 25°C)',
  'Plantão Hospitalar 24h',
];

const TEMPERATURA_OPTIONS: FaixaTemperaturaExigida[] = [
  'Múltiplas Faixas Térmicas',
  'Refrigerado / Termolábil (2°C a 8°C)',
  'Climatizado (15°C a 25°C)',
  'Congelado (-20°C)',
  'Ambiente / Carga Seca',
];

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  empregadores,
  supervisores,
  existingClientsCount,
}) => {
  const [activeTab, setActiveTab] = useState<'cadastral' | 'operacao' | 'contrato' | 'contatos_pracas'>('cadastral');

  // Form State
  const [codigoCliente, setCodigoCliente] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [segmento, setSegmento] = useState<SegmentoCliente>('Distribuidora de Medicamentos');
  const [status, setStatus] = useState<StatusCliente>('Ativo');
  const [empresaFaturamentoId, setEmpresaFaturamentoId] = useState('');
  const [gerenteContaResponsavel, setGerenteContaResponsavel] = useState('Jadson Ferreira');
  const [enderecoCompleto, setEnderecoCompleto] = useState('');
  const [cidadeUF, setCidadeUF] = useState('Natal/RN');
  const [cep, setCep] = useState('');
  const [telefonePrincipal, setTelefonePrincipal] = useState('');
  const [emailPrincipal, setEmailPrincipal] = useState('');
  const [website, setWebsite] = useState('');

  // Operação & Regulatório
  const [tiposOperacao, setTiposOperacao] = useState<TipoOperacaoContratada[]>([
    'Distribuição Fracionada (Last Mile)',
    'Transporte Climatizado (15°C a 25°C)',
  ]);
  const [faixaTemperatura, setFaixaTemperatura] = useState<FaixaTemperaturaExigida>('Climatizado (15°C a 25°C)');
  const [exigeRDC430, setExigeRDC430] = useState(true);
  const [exigeRegistroAnvisa, setExigeRegistroAnvisa] = useState(true);
  const [numeroLicencaSanitaria, setNumeroLicencaSanitaria] = useState('');
  const [validadeLicencaSanitaria, setValidadeLicencaSanitaria] = useState('');
  const [restricoesHorarioCarga, setRestricoesHorarioCarga] = useState('');
  const [veiculosAlocados, setVeiculosAlocados] = useState('');

  // Contrato & Faturamento
  const [numeroContrato, setNumeroContrato] = useState('');
  const [dataInicioContrato, setDataInicioContrato] = useState('');
  const [dataRenovacaoContrato, setDataRenovacaoContrato] = useState('');
  const [faturamentoMensalEstimado, setFaturamentoMensalEstimado] = useState(0);
  const [volumeEntregasMesEstimado, setVolumeEntregasMesEstimado] = useState(0);
  const [tabelaModeloPrecificacao, setTabelaModeloPrecificacao] = useState<'tarifa_base' | 'ad_valorem' | 'outro'>('tarifa_base');
  const [tabelaTipoCobranca, setTabelaTipoCobranca] = useState<Cliente['tabelaFrete']['tipoCobranca']>('Tabela por Faixa de Peso');
  const [tabelaValorBase, setTabelaValorBase] = useState(0);
  const [tabelaKgExcedente, setTabelaKgExcedente] = useState(0);
  const [tabelaFreteMinimo, setTabelaFreteMinimo] = useState(0);
  const [tabelaTaxaDescarga, setTabelaTaxaDescarga] = useState(0);
  const [tabelaGrisPedagio, setTabelaGrisPedagio] = useState(0.8);
  const [tabelaAdValoremNF, setTabelaAdValoremNF] = useState(0);
  const [tarifasPorCidade, setTarifasPorCidade] = useState<FaixaTarifaCidade[]>([]);
  const [custosExtras, setCustosExtras] = useState<CustoExtraTarifa[]>([]);
  const [tabelaCondicaoPagamento, setTabelaCondicaoPagamento] = useState('Faturamento Quinzenal (15 dias)');
  const [tabelaDiaFechamento, setTabelaDiaFechamento] = useState(15);
  const [tabelaObservacoes, setTabelaObservacoes] = useState('');
  // Tarifário específico do Rodoviário — opcional, só usado quando o cliente cobra diferente
  // por modal (hoje só a LUFT: "TARIFARIO - LUFT AEREO" x "TARIFARIO - LUFT RODOVIARIO" no Coda).
  // Sem isso marcado, lançamentos Rodoviários desse cliente continuam usando a tabelaFrete acima.
  const [temTarifarioRodoviarioDistinto, setTemTarifarioRodoviarioDistinto] = useState(false);
  const [tabelaFreteRodoviario, setTabelaFreteRodoviario] = useState<TabelaPrecoFrete>(TABELA_FRETE_PADRAO);

  // Contatos & Praças
  const [contatos, setContatos] = useState<ContatoCliente[]>([]);
  const [regioesAtendidas, setRegioesAtendidas] = useState<RegiaoAtendimento[]>([]);
  const [observacoesOperacionais, setObservacoesOperacionais] = useState('');
  const [satisfacaoNPS, setSatisfacaoNPS] = useState<number>(10);

  // Load initial data on edit
  useEffect(() => {
    if (initialData) {
      setCodigoCliente(initialData.codigoCliente || '');
      setRazaoSocial(initialData.razaoSocial || '');
      setNomeFantasia(initialData.nomeFantasia || '');
      setCnpj(initialData.cnpj || '');
      setInscricaoEstadual(initialData.inscricaoEstadual || '');
      setSegmento(initialData.segmento || 'Distribuidora de Medicamentos');
      setStatus(initialData.status || 'Ativo');
      setEmpresaFaturamentoId(initialData.empresaFaturamentoId || (empregadores[0]?.id || ''));
      setGerenteContaResponsavel(initialData.gerenteContaResponsavel || 'Jadson Ferreira');
      setEnderecoCompleto(initialData.enderecoCompleto || '');
      setCidadeUF(initialData.cidadeUF || 'Natal/RN');
      setCep(initialData.cep || '');
      setTelefonePrincipal(initialData.telefonePrincipal || '');
      setEmailPrincipal(initialData.emailPrincipal || '');
      setWebsite(initialData.website || '');

      setTiposOperacao(initialData.tiposOperacao || ['Distribuição Fracionada (Last Mile)']);
      setFaixaTemperatura(initialData.faixaTemperatura || 'Climatizado (15°C a 25°C)');
      setExigeRDC430(initialData.exigeRDC430 ?? true);
      setExigeRegistroAnvisa(initialData.exigeRegistroAnvisa ?? true);
      setNumeroLicencaSanitaria(initialData.numeroLicencaSanitaria || '');
      setValidadeLicencaSanitaria(initialData.validadeLicencaSanitaria || '');
      setRestricoesHorarioCarga(initialData.restricoesHorarioCarga || '');
      setVeiculosAlocados(initialData.veiculosAlocados || '');

      setNumeroContrato(initialData.numeroContrato || '');
      setDataInicioContrato(initialData.dataInicioContrato || '');
      setDataRenovacaoContrato(initialData.dataRenovacaoContrato || '');
      setFaturamentoMensalEstimado(initialData.faturamentoMensalEstimado || 0);
      setVolumeEntregasMesEstimado(initialData.volumeEntregasMesEstimado || 0);
      const tipoCobrancaInicial = initialData.tabelaFrete?.tipoCobranca || 'Tabela por Faixa de Peso';
      setTabelaTipoCobranca(tipoCobrancaInicial);
      setTabelaModeloPrecificacao(
        initialData.tabelaFrete?.modeloPrecificacao ||
          (tipoCobrancaInicial === '% sobre Nota Fiscal (Ad Valorem)'
            ? 'ad_valorem'
            : tipoCobrancaInicial === 'Tabela por Faixa de Peso'
            ? 'tarifa_base'
            : 'outro')
      );
      setTabelaValorBase(initialData.tabelaFrete?.valorBase || 0);
      setTabelaKgExcedente(initialData.tabelaFrete?.valorKgExcedente || 0);
      setTabelaFreteMinimo(initialData.tabelaFrete?.freteMinimo || 0);
      setTabelaTaxaDescarga(initialData.tabelaFrete?.taxaDescargaAjudante || 0);
      setTabelaGrisPedagio(initialData.tabelaFrete?.percentualGrisPedagio || 0.8);
      setTabelaAdValoremNF(initialData.tabelaFrete?.percentualAdValoremNF || 0);
      setTarifasPorCidade(initialData.tabelaFrete?.tarifasPorCidade || []);
      setCustosExtras(initialData.tabelaFrete?.custosExtras || []);
      setTabelaCondicaoPagamento(initialData.tabelaFrete?.condicaoPagamento || 'Faturamento Quinzenal (15 dias)');
      setTabelaDiaFechamento(initialData.tabelaFrete?.diaFechamento || 15);
      setTabelaObservacoes(initialData.tabelaFrete?.observacoesTarifa || '');
      setTemTarifarioRodoviarioDistinto(!!initialData.tabelaFreteRodoviario);
      setTabelaFreteRodoviario(initialData.tabelaFreteRodoviario || TABELA_FRETE_PADRAO);

      setContatos(initialData.contatos || []);
      setRegioesAtendidas(initialData.regioesAtendidas || []);
      setObservacoesOperacionais(initialData.observacoesOperacionais || '');
      setSatisfacaoNPS(initialData.satisfacaoNPS ?? 10);
    } else {
      // Auto-generate code
      const nextNum = String(existingClientsCount + 1).padStart(3, '0');
      setCodigoCliente(`CLI-${nextNum}`);
      setRazaoSocial('');
      setNomeFantasia('');
      setCnpj('');
      setInscricaoEstadual('');
      setSegmento('Distribuidora de Medicamentos');
      setStatus('Ativo');
      setEmpresaFaturamentoId(empregadores[0]?.id || '');
      setGerenteContaResponsavel('Jadson Ferreira');
      setEnderecoCompleto('');
      setCidadeUF('Natal/RN');
      setCep('');
      setTelefonePrincipal('');
      setEmailPrincipal('');
      setWebsite('');

      setTiposOperacao([
        'Distribuição Fracionada (Last Mile)',
        'Transporte Climatizado (15°C a 25°C)',
      ]);
      setFaixaTemperatura('Climatizado (15°C a 25°C)');
      setExigeRDC430(true);
      setExigeRegistroAnvisa(true);
      setNumeroLicencaSanitaria('');
      setValidadeLicencaSanitaria('');
      setRestricoesHorarioCarga('');
      setVeiculosAlocados('');

      setNumeroContrato(`CT-JMT-${new Date().getFullYear()}/${String(existingClientsCount + 1).padStart(2, '0')}`);
      setDataInicioContrato(new Date().toISOString().split('T')[0]);
      setDataRenovacaoContrato('');
      setFaturamentoMensalEstimado(0);
      setVolumeEntregasMesEstimado(0);
      setTabelaModeloPrecificacao('tarifa_base');
      setTabelaTipoCobranca('Tabela por Faixa de Peso');
      setTabelaValorBase(35);
      setTabelaKgExcedente(0.5);
      setTabelaFreteMinimo(500);
      setTabelaTaxaDescarga(100);
      setTabelaGrisPedagio(0.8);
      setTabelaAdValoremNF(0);
      setTarifasPorCidade([]);
      setCustosExtras([]);
      setTabelaCondicaoPagamento('Faturamento Quinzenal (15 dias)');
      setTabelaDiaFechamento(15);
      setTabelaObservacoes('');
      setTemTarifarioRodoviarioDistinto(false);
      setTabelaFreteRodoviario(TABELA_FRETE_PADRAO);

      setContatos([
        {
          id: `cont-${Date.now()}`,
          nome: '',
          cargoSetor: 'Gerência de Logística',
          telefoneWhatsapp: '',
          email: '',
          principal: true,
        },
      ]);
      setRegioesAtendidas([
        { cidadeUF: 'Natal e Região Metropolitana / RN', frequencia: 'Diária', prazoLeadTime: '24 horas' },
      ]);
      setObservacoesOperacionais('');
      setSatisfacaoNPS(10);
    }
  }, [initialData, isOpen, existingClientsCount, empregadores]);

  if (!isOpen) return null;

  const toggleTipoOperacao = (tipo: TipoOperacaoContratada) => {
    if (tiposOperacao.includes(tipo)) {
      setTiposOperacao(tiposOperacao.filter((t) => t !== tipo));
    } else {
      setTiposOperacao([...tiposOperacao, tipo]);
    }
  };

  // Contatos Handlers
  const handleAddContact = () => {
    setContatos([
      ...contatos,
      {
        id: `cont-${Date.now()}`,
        nome: '',
        cargoSetor: 'Logística / Faturamento',
        telefoneWhatsapp: '',
        email: '',
        principal: contatos.length === 0,
      },
    ]);
  };

  const handleUpdateContact = (index: number, field: keyof ContatoCliente, value: any) => {
    const updated = [...contatos];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'principal' && value === true) {
      updated.forEach((c, idx) => {
        if (idx !== index) c.principal = false;
      });
    }
    setContatos(updated);
  };

  const handleRemoveContact = (index: number) => {
    setContatos(contatos.filter((_, idx) => idx !== index));
  };

  // Praças Handlers
  const handleAddRegiao = () => {
    setRegioesAtendidas([
      ...regioesAtendidas,
      {
        cidadeUF: '',
        frequencia: 'Diária',
        prazoLeadTime: '24 horas',
      },
    ]);
  };

  const handleUpdateRegiao = (index: number, field: keyof RegiaoAtendimento, value: any) => {
    const updated = [...regioesAtendidas];
    updated[index] = { ...updated[index], [field]: value };
    setRegioesAtendidas(updated);
  };

  const handleRemoveRegiao = (index: number) => {
    setRegioesAtendidas(regioesAtendidas.filter((_, idx) => idx !== index));
  };

  // Tabela Detalhada por Cidade/Praça (Tarifa Base) Handlers
  const handleAddTarifaCidade = () => {
    setTarifasPorCidade([
      ...tarifasPorCidade,
      {
        id: `tar-${Date.now()}`,
        cidade: '',
        raio: 'CAPITAL E REGIÃO METROPOLITANA',
        valorAte10Kg: 0,
        valorKgExcedente: 0,
        distanciaKm: undefined,
      },
    ]);
  };

  const handleUpdateTarifaCidade = (index: number, field: keyof FaixaTarifaCidade, value: any) => {
    const updated = [...tarifasPorCidade];
    updated[index] = { ...updated[index], [field]: value };
    setTarifasPorCidade(updated);
  };

  const handleRemoveTarifaCidade = (index: number) => {
    setTarifasPorCidade(tarifasPorCidade.filter((_, idx) => idx !== index));
  };

  // Custos Extras / Encargos Avulsos Handlers
  const handleAddCustoExtra = () => {
    setCustosExtras([
      ...custosExtras,
      {
        id: `cex-${Date.now()}`,
        categoria: '',
        grupoDestinatario: '',
        itemDescricao: '',
        tipoCobranca: 'Valor fechado',
        valor: 0,
      },
    ]);
  };

  const handleUpdateCustoExtra = (index: number, field: keyof CustoExtraTarifa, value: any) => {
    const updated = [...custosExtras];
    updated[index] = { ...updated[index], [field]: value };
    setCustosExtras(updated);
  };

  const handleRemoveCustoExtra = (index: number) => {
    setCustosExtras(custosExtras.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!razaoSocial.trim()) {
      alert('Por favor, informe a Razão Social do cliente.');
      setActiveTab('cadastral');
      return;
    }

    // Deriva o modelo de cobrança clássico (tipoCobranca) e os valores efetivos a partir do
    // toggle "Modelo de Precificação" — mantém compatível com telas que já leem tipoCobranca.
    const tipoCobrancaFinal: Cliente['tabelaFrete']['tipoCobranca'] =
      tabelaModeloPrecificacao === 'tarifa_base'
        ? 'Tabela por Faixa de Peso'
        : tabelaModeloPrecificacao === 'ad_valorem'
        ? '% sobre Nota Fiscal (Ad Valorem)'
        : tabelaTipoCobranca;
    const percentualAdValoremFinal = tabelaModeloPrecificacao === 'ad_valorem' ? Number(tabelaAdValoremNF) || 0 : 0;
    const valorKgExcedenteFinal = tabelaModeloPrecificacao === 'tarifa_base' ? Number(tabelaKgExcedente) || 0 : undefined;
    // Mantém valorBase = % Ad Valorem quando esse é o modelo ativo, para telas que já exibem
    // "{valorBase}% NF" com base em tipoCobranca === '% sobre Nota Fiscal (Ad Valorem)'.
    const valorBaseFinal = tabelaModeloPrecificacao === 'ad_valorem' ? percentualAdValoremFinal : Number(tabelaValorBase) || 0;

    const clienteToSave: Cliente = {
      id: initialData?.id || `cli-${Date.now()}`,
      codigoCliente: codigoCliente || `CLI-${String(existingClientsCount + 1).padStart(3, '0')}`,
      razaoSocial: razaoSocial.trim(),
      nomeFantasia: nomeFantasia.trim() || razaoSocial.trim(),
      cnpj: cnpj.trim(),
      inscricaoEstadual: inscricaoEstadual.trim() || undefined,
      segmento,
      status,
      empresaFaturamentoId: empresaFaturamentoId || undefined,
      gerenteContaResponsavel,
      enderecoCompleto: enderecoCompleto.trim(),
      cidadeUF: cidadeUF.trim(),
      cep: cep.trim() || undefined,
      telefonePrincipal: telefonePrincipal.trim(),
      emailPrincipal: emailPrincipal.trim(),
      website: website.trim() || undefined,

      tiposOperacao,
      faixaTemperatura,
      exigeRDC430,
      exigeRegistroAnvisa,
      numeroLicencaSanitaria: numeroLicencaSanitaria.trim() || undefined,
      validadeLicencaSanitaria: validadeLicencaSanitaria || undefined,
      restricoesHorarioCarga: restricoesHorarioCarga.trim() || undefined,
      veiculosAlocados: veiculosAlocados.trim() || undefined,

      numeroContrato: numeroContrato.trim() || undefined,
      dataInicioContrato: dataInicioContrato || undefined,
      dataRenovacaoContrato: dataRenovacaoContrato || undefined,
      faturamentoMensalEstimado: Number(faturamentoMensalEstimado) || 0,
      volumeEntregasMesEstimado: Number(volumeEntregasMesEstimado) || 0,
      tabelaFrete: {
        modeloPrecificacao: tabelaModeloPrecificacao,
        tipoCobranca: tipoCobrancaFinal,
        valorBase: valorBaseFinal,
        valorKgExcedente: valorKgExcedenteFinal,
        tarifasPorCidade: tarifasPorCidade.filter((t) => t.cidade.trim() !== ''),
        custosExtras: custosExtras.filter((c) => c.categoria.trim() !== '' || (c.itemDescricao || '').trim() !== ''),
        freteMinimo: Number(tabelaFreteMinimo) || 0,
        taxaDescargaAjudante: Number(tabelaTaxaDescarga) || 0,
        percentualGrisPedagio: Number(tabelaGrisPedagio) || 0,
        percentualAdValoremNF: percentualAdValoremFinal,
        condicaoPagamento: tabelaCondicaoPagamento,
        diaFechamento: Number(tabelaDiaFechamento) || 15,
        observacoesTarifa: tabelaObservacoes.trim() || undefined,
      },
      tabelaFreteRodoviario: temTarifarioRodoviarioDistinto
        ? {
            ...tabelaFreteRodoviario,
            tarifasPorCidade: (tabelaFreteRodoviario.tarifasPorCidade || []).filter((t) => t.cidade.trim() !== ''),
            custosExtras: (tabelaFreteRodoviario.custosExtras || []).filter(
              (c) => c.categoria.trim() !== '' || (c.itemDescricao || '').trim() !== ''
            ),
          }
        : undefined,

      contatos: contatos.filter((c) => c.nome.trim() !== ''),
      regioesAtendidas: regioesAtendidas.filter((r) => r.cidadeUF.trim() !== ''),
      interacoes: initialData?.interacoes || [],
      observacoesOperacionais: observacoesOperacionais.trim() || undefined,
      satisfacaoNPS: Number(satisfacaoNPS) || 10,
      criadoEm: initialData?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    onSave(clienteToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#8A6A39]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {initialData ? 'Editar Cliente / Contrato' : 'Cadastrar Novo Cliente da Carteira'}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {initialData ? `${initialData.nomeFantasia} (${initialData.codigoCliente})` : 'JMT Transportes & Logística Farmacêutica'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-6 gap-2 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('cadastral')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'cadastral'
                ? 'border-[#B38F4F] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4 text-[#B38F4F]" />
            <span>1. Dados Cadastrais & Fiscais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('operacao')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'operacao'
                ? 'border-[#B38F4F] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
            <span>2. Operação & ANVISA (RDC 430)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contrato')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'contrato'
                ? 'border-[#B38F4F] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>3. Contrato & Tabela de Fretes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contatos_pracas')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'contatos_pracas'
                ? 'border-[#B38F4F] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>4. Contatos & Praças</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* TAB 1: DADOS CADASTRAIS & FISCAIS */}
          {activeTab === 'cadastral' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={codigoCliente}
                    onChange={(e) => setCodigoCliente(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Status na Carteira *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusCliente)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  >
                    <option value="Ativo">Ativo (Contrato Vigente)</option>
                    <option value="Em Negociação">Em Negociação</option>
                    <option value="Prospecção">Prospecção (Pipeline)</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Segmento de Atuação *
                  </label>
                  <select
                    value={segmento}
                    onChange={(e) => setSegmento(e.target.value as SegmentoCliente)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  >
                    {SEGMENTOS_OPTIONS.map((seg) => (
                      <option key={seg} value={seg}>
                        {seg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Razão Social Completa *
                  </label>
                  <input
                    type="text"
                    required
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Ex: Profarma Distribuidora de Produtos Farmacêuticos S/A"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome Fantasia / Divisão
                  </label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Ex: Profarma Medicamentos Nordeste"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    placeholder="Ex: 20.123.456-7"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Filial JMT Emissora / Faturamento
                  </label>
                  <select
                    value={empresaFaturamentoId}
                    onChange={(e) => setEmpresaFaturamentoId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  >
                    {empregadores.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nomeFantasia || emp.razaoSocial}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Gestor de Contas Responsável (JMT)
                  </label>
                  <select
                    value={gerenteContaResponsavel}
                    onChange={(e) => setGerenteContaResponsavel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  >
                    {supervisores.map((s) => (
                      <option key={s.id} value={s.nome}>
                        {s.nome} ({s.cargo})
                      </option>
                    ))}
                    <option value="Jadson Ferreira">Jadson Ferreira (Gerente DP / Contas)</option>
                    <option value="Jobson de Moraes">Jobson de Moraes (Diretoria)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nota de Satisfação NPS (1 a 10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={satisfacaoNPS}
                    onChange={(e) => setSatisfacaoNPS(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>

              {/* Endereço e Contatos Gerais */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Endereço Completo (CD / Matriz)
                  </label>
                  <input
                    type="text"
                    value={enderecoCompleto}
                    onChange={(e) => setEnderecoCompleto(e.target.value)}
                    placeholder="Av. Industrial, 2500 - Distrito Industrial"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={cidadeUF}
                    onChange={(e) => setCidadeUF(e.target.value)}
                    placeholder="Natal/RN"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Telefone Geral / PABX
                  </label>
                  <input
                    type="text"
                    value={telefonePrincipal}
                    onChange={(e) => setTelefonePrincipal(e.target.value)}
                    placeholder="(84) 3210-0000"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    E-mail Principal de Contato
                  </label>
                  <input
                    type="email"
                    value={emailPrincipal}
                    onChange={(e) => setEmailPrincipal(e.target.value)}
                    placeholder="logistica@cliente.com.br"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Website / Portal
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="www.cliente.com.br"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPERAÇÃO & ANVISA (RDC 430) */}
          {activeTab === 'operacao' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Modalidades Operacionais Contratadas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TIPOS_OPERACAO_OPTIONS.map((tipo) => {
                    const isSelected = tiposOperacao.includes(tipo);
                    return (
                      <button
                        type="button"
                        key={tipo}
                        onClick={() => toggleTipoOperacao(tipo)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-amber-50 border-[#B38F4F] text-amber-900'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span>{tipo}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#B38F4F]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Faixa Térmica Exigida *
                  </label>
                  <select
                    value={faixaTemperatura}
                    onChange={(e) => setFaixaTemperatura(e.target.value as FaixaTemperaturaExigida)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  >
                    {TEMPERATURA_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Frota & Veículos Alocados
                  </label>
                  <input
                    type="text"
                    value={veiculosAlocados}
                    onChange={(e) => setVeiculosAlocados(e.target.value)}
                    placeholder="Ex: 2x Vans Refrigeradas Master 2°C a 8°C + 1x VUC"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>

              {/* Parâmetros Regulatórios ANVISA */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Conformidade Sanitária & ANVISA (RDC 430/2020)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exigeRDC430}
                      onChange={(e) => setExigeRDC430(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#B38F4F] focus:ring-0 bg-white"
                    />
                    <span>Exige Boas Práticas de Transporte RDC 430</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exigeRegistroAnvisa}
                      onChange={(e) => setExigeRegistroAnvisa(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#B38F4F] focus:ring-0 bg-white"
                    />
                    <span>Exige AFE ANVISA & RT Farmacêutico</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nº da Licença Sanitária / AFE
                    </label>
                    <input
                      type="text"
                      value={numeroLicencaSanitaria}
                      onChange={(e) => setNumeroLicencaSanitaria(e.target.value)}
                      placeholder="Ex: SUVISA/RN Nº 4589/2025"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Validade da Licença Sanitária
                    </label>
                    <input
                      type="date"
                      value={validadeLicencaSanitaria}
                      onChange={(e) => setValidadeLicencaSanitaria(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Janelas de Carga & Restrições Operacionais
                  </label>
                  <textarea
                    rows={2}
                    value={restricoesHorarioCarga}
                    onChange={(e) => setRestricoesHorarioCarga(e.target.value)}
                    placeholder="Ex: Recebimento das 05h às 08h. Saída de rota até 08h30. Conferência por código de barras."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTRATO & TABELA DE FRETES */}
          {activeTab === 'contrato' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Número do Contrato
                  </label>
                  <input
                    type="text"
                    value={numeroContrato}
                    onChange={(e) => setNumeroContrato(e.target.value)}
                    placeholder="Ex: CT-JMT-PRO-2025/08"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Início da Vigência
                  </label>
                  <input
                    type="date"
                    value={dataInicioContrato}
                    onChange={(e) => setDataInicioContrato(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Renovação / Término
                  </label>
                  <input
                    type="date"
                    value={dataRenovacaoContrato}
                    onChange={(e) => setDataRenovacaoContrato(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Faturamento Mensal Estimado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={faturamentoMensalEstimado}
                    onChange={(e) => setFaturamentoMensalEstimado(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-emerald-600 font-bold focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Volume de Entregas / Mês (Estimado)
                  </label>
                  <input
                    type="number"
                    value={volumeEntregasMesEstimado}
                    onChange={(e) => setVolumeEntregasMesEstimado(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>

              {/* Parâmetros de Tarifa / Tabela de Preço */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-[#B38F4F] uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Condições Comerciais & Tabela de Frete
                </h4>

                {/* Toggle: Modelo de Precificação */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Modelo de Precificação *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTabelaModeloPrecificacao('tarifa_base');
                        setTabelaTipoCobranca('Tabela por Faixa de Peso');
                      }}
                      className={`text-left p-2.5 rounded-lg border transition-colors ${
                        tabelaModeloPrecificacao === 'tarifa_base'
                          ? 'bg-amber-50 border-[#B38F4F] text-amber-900'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold block">Tarifa Base</span>
                      <span className="text-[10px] text-slate-400">Taxa de Entrega + Excedente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTabelaModeloPrecificacao('ad_valorem');
                        setTabelaTipoCobranca('% sobre Nota Fiscal (Ad Valorem)');
                      }}
                      className={`text-left p-2.5 rounded-lg border transition-colors ${
                        tabelaModeloPrecificacao === 'ad_valorem'
                          ? 'bg-amber-50 border-[#B38F4F] text-amber-900'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold block">% Ad Valorem</span>
                      <span className="text-[10px] text-slate-400">Sobre a NF do Serviço</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTabelaModeloPrecificacao('outro')}
                      className={`text-left p-2.5 rounded-lg border transition-colors ${
                        tabelaModeloPrecificacao === 'outro'
                          ? 'bg-amber-50 border-[#B38F4F] text-amber-900'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold block">Outro Modelo</span>
                      <span className="text-[10px] text-slate-400">Km rodado, diária, misto...</span>
                    </button>
                  </div>
                </div>

                {/* Campos: Tarifa Base (Taxa de Entrega + Excedente) */}
                {tabelaModeloPrecificacao === 'tarifa_base' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Taxa de Entrega (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tabelaValorBase}
                        onChange={(e) => setTabelaValorBase(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#B38F4F]"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Valor cobrado até o peso-base da faixa (ex: até 10kg).</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Valor por Kg Excedente (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tabelaKgExcedente}
                        onChange={(e) => setTabelaKgExcedente(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#B38F4F]"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Cobrado por kg que ultrapassar o peso-base.</p>
                    </div>
                  </div>
                )}

                {/* Tabela Detalhada por Cidade / Praça (opcional, só na Tarifa Base) */}
                {tabelaModeloPrecificacao === 'tarifa_base' && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div>
                        <span className="block text-xs font-semibold text-slate-600">
                          Tabela Detalhada por Cidade / Praça{' '}
                          <span className="text-slate-500 font-normal">(opcional)</span>
                        </span>
                        <p className="text-[10px] text-slate-500">
                          Use quando a taxa varia por cidade/raio — mesmo formato do tarifário real (Cidade, Raio, Até 10kg, Kg Excedente, Km).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddTarifaCidade}
                        className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Cidade</span>
                      </button>
                    </div>

                    {tarifasPorCidade.length > 0 && (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {tarifasPorCidade.map((tarifa, idx) => (
                          <div
                            key={tarifa.id}
                            className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5"
                          >
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                value={tarifa.cidade}
                                onChange={(e) => handleUpdateTarifaCidade(idx, 'cidade', e.target.value)}
                                placeholder="Cidade"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                              />
                              <input
                                type="text"
                                value={tarifa.raio}
                                onChange={(e) => handleUpdateTarifaCidade(idx, 'raio', e.target.value)}
                                placeholder="Raio / Faixa (Ex: Capital, Até 300km)"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                              />
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 items-center">
                              <input
                                type="number"
                                step="0.01"
                                value={tarifa.valorAte10Kg}
                                onChange={(e) => handleUpdateTarifaCidade(idx, 'valorAte10Kg', Number(e.target.value))}
                                placeholder="Até 10kg (R$)"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={tarifa.valorKgExcedente}
                                onChange={(e) => handleUpdateTarifaCidade(idx, 'valorKgExcedente', Number(e.target.value))}
                                placeholder="Kg exc. (R$)"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                              />
                              <input
                                type="number"
                                value={tarifa.distanciaKm ?? ''}
                                onChange={(e) =>
                                  handleUpdateTarifaCidade(idx, 'distanciaKm', e.target.value ? Number(e.target.value) : undefined)
                                }
                                placeholder="Km"
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveTarifaCidade(idx)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition-colors justify-self-end"
                                title="Remover Cidade"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Campo: % Ad Valorem sobre a NF do Serviço */}
                {tabelaModeloPrecificacao === 'ad_valorem' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      % Ad Valorem sobre a NF do Serviço
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tabelaAdValoremNF}
                      onChange={(e) => setTabelaAdValoremNF(Number(e.target.value))}
                      placeholder="0.30"
                      className="w-full sm:w-1/2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#B38F4F]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Percentual cobrado sobre o valor declarado na Nota Fiscal do serviço/mercadoria transportada — modelo usado tanto no Farma Aéreo quanto no Farma Rodoviário.
                    </p>
                  </div>
                )}

                {/* Campos: Outro Modelo (fallback avançado) */}
                {tabelaModeloPrecificacao === 'outro' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Modelo / Tipo de Cobrança
                      </label>
                      <select
                        value={tabelaTipoCobranca}
                        onChange={(e) => setTabelaTipoCobranca(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                      >
                        <option value="Valor por Ponto/Entrega">Valor por Ponto / Entrega</option>
                        <option value="Valor por Km Rodado">Valor por Km Rodado</option>
                        <option value="Diária por Veículo Dedicado">Diária por Veículo Dedicado</option>
                        <option value="Fracionado + Taxa Fixa">Fracionado + Taxa Fixa</option>
                        <option value="Mista">Mista</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Valor Base / Tarifa (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tabelaValorBase}
                        onChange={(e) => setTabelaValorBase(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#B38F4F]"
                      />
                    </div>
                  </div>
                )}

                {/* Custos Extras / Encargos Avulsos (opcional, qualquer modelo) */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div>
                      <span className="block text-xs font-semibold text-slate-600">
                        Custos Extras / Encargos Avulsos <span className="text-slate-500 font-normal">(opcional)</span>
                      </span>
                      <p className="text-[10px] text-slate-500">
                        TDE, dedicado, embarque, entrega rastreada etc. — mesmo formato do tarifário real (Categoria, Grupo/Destinatário, Item/Descrição, Tipo de Cobrança, Valor).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustoExtra}
                      className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Encargo</span>
                    </button>
                  </div>

                  {custosExtras.length > 0 && (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {custosExtras.map((custo, idx) => (
                        <div key={custo.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5">
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={custo.categoria}
                              onChange={(e) => handleUpdateCustoExtra(idx, 'categoria', e.target.value)}
                              placeholder="Categoria (Ex: TDE / VEÍCULO)"
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                            />
                            <input
                              type="text"
                              value={custo.grupoDestinatario || ''}
                              onChange={(e) => handleUpdateCustoExtra(idx, 'grupoDestinatario', e.target.value)}
                              placeholder="Grupo / Destinatário"
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                            />
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 items-center">
                            <input
                              type="text"
                              value={custo.itemDescricao || ''}
                              onChange={(e) => handleUpdateCustoExtra(idx, 'itemDescricao', e.target.value)}
                              placeholder="Item / Descrição"
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                            />
                            <select
                              value={custo.tipoCobranca}
                              onChange={(e) => handleUpdateCustoExtra(idx, 'tipoCobranca', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                            >
                              <option value="Valor fechado">Valor fechado</option>
                              <option value="Valor/KM">Valor/KM</option>
                              <option value="Serviço avulso">Serviço avulso</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={custo.valor}
                              onChange={(e) => handleUpdateCustoExtra(idx, 'valor', Number(e.target.value))}
                              placeholder="Valor (R$)"
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCustoExtra(idx)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition-colors justify-self-end"
                              title="Remover Encargo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Frete Mínimo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tabelaFreteMinimo}
                      onChange={(e) => setTabelaFreteMinimo(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Taxa de Descarga / Ajudante CCT (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tabelaTaxaDescarga}
                      onChange={(e) => setTabelaTaxaDescarga(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      % GRIS & Pedágio
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tabelaGrisPedagio}
                      onChange={(e) => setTabelaGrisPedagio(Number(e.target.value))}
                      placeholder="0.8"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Condição de Pagamento
                    </label>
                    <input
                      type="text"
                      value={tabelaCondicaoPagamento}
                      onChange={(e) => setTabelaCondicaoPagamento(e.target.value)}
                      placeholder="Ex: Faturamento Quinzenal (15 dias)"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Dia de Fechamento da Fatura
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={tabelaDiaFechamento}
                      onChange={(e) => setTabelaDiaFechamento(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#B38F4F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Regras Especiais / Observações de Tarifa
                  </label>
                  <textarea
                    rows={2}
                    value={tabelaObservacoes}
                    onChange={(e) => setTabelaObservacoes(e.target.value)}
                    placeholder="Ex: Adicional de R$ 14,00 por volume termolábil com datalogger calibrado."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#B38F4F]"
                  />
                </div>
              </div>

              {/* Tarifário específico do Rodoviário (opcional) — hoje só usado pela LUFT, que
                  cobra Aéreo e Rodoviário por tabelas diferentes (ver Cliente.tabelaFreteRodoviario). */}
              <div className="bg-white p-4 rounded-xl border border-dashed border-slate-300 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={temTarifarioRodoviarioDistinto}
                    onChange={(e) => setTemTarifarioRodoviarioDistinto(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#B38F4F] focus:ring-[#B38F4F]"
                  />
                  <span>
                    <span className="block text-xs font-bold text-slate-700">
                      Este cliente tem um tarifário diferente para o Rodoviário
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Marque só quando o cliente cobra valores diferentes por modal (ex.: LUFT — "TARIFARIO AEREO" x
                      "TARIFARIO RODOVIARIO" do Coda). Sem marcar, lançamentos Rodoviários deste cliente usam a
                      mesma tabela do Aéreo acima.
                    </span>
                  </span>
                </label>

                {temTarifarioRodoviarioDistinto && (
                  <TabelaFreteEditor
                    titulo="Condições Comerciais & Tabela de Frete — Rodoviário"
                    value={tabelaFreteRodoviario}
                    onChange={setTabelaFreteRodoviario}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CONTATOS & PRAÇAS */}
          {activeTab === 'contatos_pracas' && (
            <div className="space-y-6">
              {/* Contatos Chave */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[#B38F4F]" />
                      Contatos Chave (Logística / Compras / Financeiro)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Pessoas responsáveis para contato diário e envio de documentação
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Contato</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {contatos.map((cont, idx) => (
                    <div
                      key={cont.id || idx}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end"
                    >
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">Nome</label>
                        <input
                          type="text"
                          value={cont.nome}
                          onChange={(e) => handleUpdateContact(idx, 'nome', e.target.value)}
                          placeholder="Nome do contato"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">Cargo / Setor</label>
                        <input
                          type="text"
                          value={cont.cargoSetor}
                          onChange={(e) => handleUpdateContact(idx, 'cargoSetor', e.target.value)}
                          placeholder="Ex: Coordenador Logística"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">WhatsApp / Fone</label>
                        <input
                          type="text"
                          value={cont.telefoneWhatsapp}
                          onChange={(e) => handleUpdateContact(idx, 'telefoneWhatsapp', e.target.value)}
                          placeholder="(84) 99999-0000"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[11px] text-slate-400 mb-0.5">E-mail</label>
                          <input
                            type="email"
                            value={cont.email}
                            onChange={(e) => handleUpdateContact(idx, 'email', e.target.value)}
                            placeholder="contato@cliente.com"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition-colors"
                          title="Remover Contato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {contatos.length === 0 && (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      Nenhum contato cadastrado. Clique no botão acima para adicionar.
                    </p>
                  )}
                </div>
              </div>

              {/* Praças & Rotas */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Praças de Atendimento & Rotas Contratadas
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Regiões geográficas e frequência de abastecimento
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRegiao}
                    className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Praça</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {regioesAtendidas.map((reg, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                    >
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={reg.cidadeUF}
                          onChange={(e) => handleUpdateRegiao(idx, 'cidadeUF', e.target.value)}
                          placeholder="Cidade / Região (Ex: Mossoró & Oeste Potiguar)"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <select
                          value={reg.frequencia}
                          onChange={(e) => handleUpdateRegiao(idx, 'frequencia', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        >
                          <option value="Diária">Diária</option>
                          <option value="Segunda/Quarta/Sexta">Seg / Qua / Sex</option>
                          <option value="Terça/Quinta">Ter / Qui</option>
                          <option value="Semanal">Semanal</option>
                          <option value="Sob Demanda">Sob Demanda</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={reg.prazoLeadTime}
                          onChange={(e) => handleUpdateRegiao(idx, 'prazoLeadTime', e.target.value)}
                          placeholder="Lead Time (Ex: 24h)"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveRegiao(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {regioesAtendidas.length === 0 && (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      Nenhuma rota configurada. Clique no botão acima para adicionar praças.
                    </p>
                  )}
                </div>
              </div>

              {/* Observações Gerais */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Observações Operacionais & Notas Gerais
                </label>
                <textarea
                  rows={2}
                  value={observacoesOperacionais}
                  onChange={(e) => setObservacoesOperacionais(e.target.value)}
                  placeholder="Informações adicionais, particularidades de entrega, diretrizes de segurança..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#B38F4F]"
                />
              </div>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              * Campos obrigatórios para validação cadastral
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#B38F4F] hover:bg-[#8A6A39] text-slate-950 transition-colors flex items-center gap-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{initialData ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
