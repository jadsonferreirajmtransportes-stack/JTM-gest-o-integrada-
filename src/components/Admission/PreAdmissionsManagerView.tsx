import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Smartphone,
  Eye,
  Trash2,
  UserCheck,
  Building2,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Download,
  Calendar,
  CreditCard,
  Shirt,
  Bus,
  Paperclip,
  Check,
  X,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  PreAdmissao,
  StatusPreAdmissao,
  Empregador,
  CargoSalario,
  Supervisor,
  Colaborador,
} from '../../types';
import { formatDate, formatMoney } from '../../utils/formatters';

interface PreAdmissionsManagerViewProps {
  preAdmissoes: PreAdmissao[];
  empregadores: Empregador[];
  cargos: CargoSalario[];
  supervisores: Supervisor[];
  /** Acesso GERAL ao módulo DP — ver temAcessoGeralDp em visibilidadeUtils.ts. Controla só os
   *  botões de gerar/enviar o link de admissão abaixo, mesma restrição da tela de Ocorrências;
   *  a lista e a efetivação de pré-admissões continuam liberadas normalmente. */
  temAcessoGeralDp: boolean;
  onOpenLinkGenerator: () => void;
  onEfetivarAdmissao: (
    preAdmissaoId: string,
    config: {
      empregadorId: string;
      funcaoCargo: string;
      setor: string;
      dataAdmissao: string;
      remuneracao: number;
      gratificacao?: number;
      valorValeAlimentacaoDia?: number;
      jornadaTrabalho?: string;
      supervisorId?: string;
    }
  ) => void;
  onUpdateStatus: (id: string, status: StatusPreAdmissao, obs?: string) => void;
  onDeletePreAdmissao: (id: string) => void;
  onSelectColaboradorDetail?: (c: Colaborador) => void;
}

export const PreAdmissionsManagerView: React.FC<PreAdmissionsManagerViewProps> = ({
  preAdmissoes,
  empregadores,
  cargos,
  supervisores,
  temAcessoGeralDp,
  onOpenLinkGenerator,
  onEfetivarAdmissao,
  onUpdateStatus,
  onDeletePreAdmissao,
  onSelectColaboradorDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | StatusPreAdmissao>('Todos');
  const [selectedCandidate, setSelectedCandidate] = useState<PreAdmissao | null>(null);
  const [efetivarCandidate, setEfetivarCandidate] = useState<PreAdmissao | null>(null);

  // Efetivar Modal Form State
  const [efetivarData, setEfetivarData] = useState({
    empregadorId: empregadores[0]?.id || '',
    funcaoCargo: '',
    setor: '',
    dataAdmissao: new Date().toISOString().slice(0, 10),
    remuneracao: 3200,
    gratificacao: 0,
    valorValeAlimentacaoDia: 38.0,
    jornadaTrabalho: '08:00 às 17:00, segunda a sexta (44h semanais)',
    supervisorId: supervisores[0]?.id || '',
  });

  // KPIs
  const totalCount = preAdmissoes.length;
  const pendentesCount = preAdmissoes.filter((p) => p.status === 'Pendente').length;
  const aprovadosCount = preAdmissoes.filter((p) => p.status === 'Aprovado').length;
  const totalDocs = preAdmissoes.reduce((acc, p) => acc + (p.documentosEnviados?.length || 0), 0);

  // Filtered List
  const filteredList = preAdmissoes.filter((item) => {
    const matchesSearch =
      item.dadosPessoais.nomeCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.dadosPessoais.cpf.includes(searchQuery) ||
      item.contatoEndereco.telefoneWhatsapp.includes(searchQuery);

    const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStartEfetivacao = (candidate: PreAdmissao) => {
    // Find matching cargo
    const matchingCargo = cargos.find(
      (c) => c.cargo.toLowerCase() === (candidate.cargoPredefinido || '').toLowerCase()
    );

    setEfetivarData({
      empregadorId: candidate.empresaPredefinidaId || empregadores[0]?.id || '',
      funcaoCargo: matchingCargo ? matchingCargo.cargo : cargos[0]?.cargo || 'Motorista Veículo Refrigerado',
      setor: matchingCargo ? matchingCargo.setor : 'Transporte e Frota',
      dataAdmissao: new Date().toISOString().slice(0, 10),
      remuneracao: matchingCargo ? matchingCargo.faixaSalarialMinima : 3200,
      gratificacao: 0,
      valorValeAlimentacaoDia: 38.0,
      jornadaTrabalho: '08:00 às 17:00, segunda a sexta (44h semanais)',
      supervisorId: candidate.supervisorPredefinidoId || supervisores[0]?.id || '',
    });

    setEfetivarCandidate(candidate);
  };

  const handleConfirmEfetivacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!efetivarCandidate) return;

    onEfetivarAdmissao(efetivarCandidate.id, efetivarData);
    setEfetivarCandidate(null);
    setSelectedCandidate(null);
  };

  const handleOpenWhatsAppCandidate = (candidate: PreAdmissao) => {
    const cleanPhone = candidate.contatoEndereco.telefoneWhatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá ${candidate.dadosPessoais.nomeCompleto}, tudo bem? Aqui é do Departamento Pessoal da Jobson de Moraes Transportes (JMT). Estamos analisando a sua ficha de admissão digital.`
    );
    window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Portal de Admissões Digitais</h1>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold border border-amber-300">
              Auto-Cadastro
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento e efetivação de formulários de admissão preenchidos pelos novos colaboradores via link.
          </p>
        </div>

        {temAcessoGeralDp && (
          <button
            type="button"
            onClick={onOpenLinkGenerator}
            className="px-4 py-2.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-900/20 shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>Gerar / Enviar Link de Admissão</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Total de Formulários</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Recebidos no sistema</span>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs bg-amber-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-700 font-medium">Pendentes de Análise</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800">{pendentesCount}</p>
          <span className="text-[11px] text-amber-600 mt-1 block">Aguardando conferência DP</span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs bg-emerald-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-emerald-700 font-medium">Admissões Efetivadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800">{aprovadosCount}</p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Colaboradores ativos</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Documentos Recebidos</span>
            <Paperclip className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalDocs}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Fotos e PDFs anexados</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome do candidato, CPF ou WhatsApp..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['Todos', 'Pendente', 'Em Análise', 'Aprovado'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#B38F4F] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-Admissions List */}
      {filteredList.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-[#B38F4F] flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Share2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Nenhum formulário de admissão encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Envie o link para novos colaboradores preencherem seus dados cadastrais, anexar fotos e agilizar o processo admissional.
          </p>
          {temAcessoGeralDp && (
            <button
              type="button"
              onClick={onOpenLinkGenerator}
              className="px-5 py-2.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-900/20"
            >
              Gerar Link de Admissão Agora
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => {
            const isPendente = item.status === 'Pendente';
            const isAprovado = item.status === 'Aprovado';
            const docsCount = item.documentosEnviados?.length || 0;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Candidate Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100/80 text-[#B38F4F] border border-amber-200 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
                    {item.dadosPessoais.nomeCompleto.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {item.dadosPessoais.nomeCompleto}
                      </h3>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isAprovado
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isPendente
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {item.status}
                      </span>

                      {item.colaboradorEfetivadoId && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded-md border border-slate-200">
                          Efetivado no Sistema
                        </span>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span><strong>CPF:</strong> {item.dadosPessoais.cpf}</span>
                      <span><strong>WhatsApp:</strong> {item.contatoEndereco.telefoneWhatsapp}</span>
                      <span><strong>Cidade:</strong> {item.contatoEndereco.cidadeUF}</span>
                      <span><strong>Preenchido em:</strong> {formatDate(item.dataEnvio || item.criadoEm)}</span>
                    </div>

                    {/* Quick Specs Pill: Uniforme & Docs */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                        <Shirt className="w-3 h-3 text-[#B38F4F]" />
                        <span>Uniforme: Camisa {item.fardamento.tamanhoCamisa} | Calça {item.fardamento.numeroCalca} | Bota {item.fardamento.numeroCalcado}</span>
                      </span>

                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-blue-600" />
                        <span>{docsCount} Documentos Anexados</span>
                      </span>

                      {item.transporte.utilizaVT && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                          <Bus className="w-3 h-3 text-emerald-600" />
                          <span>Optante VT ({item.transporte.vtQuantidadeTarifasDia} tarifas/dia)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppCandidate(item)}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Conversar com o candidato no WhatsApp"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(item)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span>Ver Ficha Completa</span>
                  </button>

                  {!isAprovado && (
                    <button
                      type="button"
                      onClick={() => handleStartEfetivacao(item)}
                      className="px-4 py-2 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Efetivar Admissão</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir a solicitação de admissão de ${item.dadosPessoais.nomeCompleto}?`)) {
                        onDeletePreAdmissao(item.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Excluir Pré-Cadastro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CANDIDATE DOSSIER VIEWER */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#B38F4F] text-white flex items-center justify-center font-bold text-lg">
                  {selectedCandidate.dadosPessoais.nomeCompleto.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    Ficha de Admissão: {selectedCandidate.dadosPessoais.nomeCompleto}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Protocolo: Token {selectedCandidate.token} • Enviado em {formatDate(selectedCandidate.dataEnvio)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Status banner */}
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-900">Status Atual:</span>
                  <span className="font-bold text-amber-800 uppercase">{selectedCandidate.status}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(selectedCandidate.id, 'Em Análise', 'Documentação em conferência')}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-medium"
                  >
                    Marcar em Análise
                  </button>
                </div>
              </div>

              {/* 1. Dados Pessoais */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1">
                  1. Dados Pessoais & Documentos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div><span className="text-slate-500 block">Nome Completo:</span><strong className="text-slate-800">{selectedCandidate.dadosPessoais.nomeCompleto}</strong></div>
                  <div><span className="text-slate-500 block">CPF:</span><strong className="text-slate-800 font-mono">{selectedCandidate.dadosPessoais.cpf}</strong></div>
                  <div><span className="text-slate-500 block">Data de Nascimento:</span><strong className="text-slate-800">{formatDate(selectedCandidate.dadosPessoais.dataNascimento)}</strong></div>
                  <div><span className="text-slate-500 block">RG / Órgão:</span><strong className="text-slate-800">{selectedCandidate.dadosPessoais.rg || '-'} ({selectedCandidate.dadosPessoais.orgaoEmissorUF || '-'})</strong></div>
                  <div><span className="text-slate-500 block">Gênero / Estado Civil:</span><strong className="text-slate-800">{selectedCandidate.dadosPessoais.genero} • {selectedCandidate.dadosPessoais.estadoCivil}</strong></div>
                  <div><span className="text-slate-500 block">Raça / Cor:</span><strong className="text-slate-800">{selectedCandidate.dadosPessoais.racaCor}</strong></div>
                  <div><span className="text-slate-500 block">Escolaridade:</span><strong className="text-slate-800">{selectedCandidate.dadosPessoais.grauInstrucao}</strong></div>
                  <div><span className="text-slate-500 block">Nome da Mãe:</span><strong className="text-slate-800">{selectedCandidate.dadosPessoais.nomeMae || '-'}</strong></div>
                  <div><span className="text-slate-500 block">Nome do Pai:</span><strong className="text-slate-800">{selectedCandidate.dadosPessoais.nomePai || '-'}</strong></div>
                </div>
              </div>

              {/* 2. Endereço & Contato */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1">
                  2. Contato & Endereço
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div><span className="text-slate-500 block">WhatsApp:</span><strong className="text-slate-800">{selectedCandidate.contatoEndereco.telefoneWhatsapp}</strong></div>
                  <div><span className="text-slate-500 block">E-mail:</span><strong className="text-slate-800">{selectedCandidate.contatoEndereco.email}</strong></div>
                  <div><span className="text-slate-500 block">CEP:</span><strong className="text-slate-800 font-mono">{selectedCandidate.contatoEndereco.cep}</strong></div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-slate-500 block">Endereço Residencial:</span>
                    <strong className="text-slate-800">
                      {selectedCandidate.contatoEndereco.enderecoCompleto}
                      {selectedCandidate.contatoEndereco.numero ? `, nº ${selectedCandidate.contatoEndereco.numero}` : ''}
                      {selectedCandidate.contatoEndereco.bairro ? ` - ${selectedCandidate.contatoEndereco.bairro}` : ''}
                      {` - ${selectedCandidate.contatoEndereco.cidadeUF}`}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Dados Bancários & PIX */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1">
                  3. Dados Bancários & PIX
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div><span className="text-slate-500 block">Banco:</span><strong className="text-slate-800">{selectedCandidate.dadosBancarios.banco}</strong></div>
                  <div><span className="text-slate-500 block">Agência / Conta:</span><strong className="text-slate-800">Ag {selectedCandidate.dadosBancarios.agencia} • Conta {selectedCandidate.dadosBancarios.numeroConta} ({selectedCandidate.dadosBancarios.tipoConta})</strong></div>
                  <div><span className="text-slate-500 block">Chave PIX:</span><strong className="text-slate-800">{selectedCandidate.dadosBancarios.tipoChavePix}: {selectedCandidate.dadosBancarios.chavePix}</strong></div>
                </div>
              </div>

              {/* 4. Uniforme & Vale Transporte */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1">
                  4. Uniforme & Transporte
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div><span className="text-slate-500 block">Tamanhos:</span><strong className="text-slate-800">Camisa {selectedCandidate.fardamento.tamanhoCamisa} • Calça {selectedCandidate.fardamento.numeroCalca} • Calçado {selectedCandidate.fardamento.numeroCalcado}</strong></div>
                  <div><span className="text-slate-500 block">Opção VT:</span><strong className="text-slate-800">{selectedCandidate.transporte.utilizaVT ? `Sim (${selectedCandidate.transporte.vtQuantidadeTarifasDia} tarifas/dia)` : 'Não utiliza'}</strong></div>
                  <div><span className="text-slate-500 block">Linhas / Trajeto:</span><strong className="text-slate-800">{selectedCandidate.transporte.vtIdentificacaoConducao || '-'}</strong></div>
                </div>
              </div>

              {/* 5. Documentos Anexados */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b pb-1 flex items-center justify-between">
                  <span>5. Documentos e Fotos Anexados ({selectedCandidate.documentosEnviados?.length || 0})</span>
                </h4>
                {selectedCandidate.documentosEnviados?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum anexo enviado.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedCandidate.documentosEnviados.map((doc) => (
                      <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 block truncate">{doc.tipo}</span>
                            <span className="text-[11px] text-slate-500 truncate block">{doc.nomeArquivo} ({doc.tamanho || '1 MB'})</span>
                          </div>
                        </div>

                        {doc.arquivoUrl && (
                          <a
                            href={doc.arquivoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 shrink-0"
                            title="Abrir anexo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppCandidate(selectedCandidate)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Chamar no WhatsApp</span>
                </button>

                {selectedCandidate.status !== 'Aprovado' && (
                  <button
                    type="button"
                    onClick={() => handleStartEfetivacao(selectedCandidate)}
                    className="px-4 py-2 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Efetivar Admissão</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EFETIVAÇÃO DE ADMISSÃO */}
      {efetivarCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <form onSubmit={handleConfirmEfetivacao}>
              <div className="bg-gradient-to-r from-[#B38F4F] to-amber-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center text-white">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Efetivar Admissão de Colaborador</h2>
                    <p className="text-xs text-amber-100">
                      {efetivarCandidate.dadosPessoais.nomeCompleto} • CPF: {efetivarCandidate.dadosPessoais.cpf}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Confirme os dados contratuais para registrar o colaborador no quadro de funcionários ativos da <strong>Jobson de Moraes Transportes (JMT)</strong>. A matrícula e o kit de documentos serão gerados automaticamente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Empresa */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Empresa Contratante</label>
                    <select
                      value={efetivarData.empregadorId}
                      onChange={(e) => setEfetivarData({ ...efetivarData, empregadorId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    >
                      {empregadores.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.razaoSocial} ({emp.cnpj})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cargo */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cargo / Função</label>
                    <select
                      value={efetivarData.funcaoCargo}
                      onChange={(e) => {
                        const sel = cargos.find((c) => c.cargo === e.target.value);
                        setEfetivarData({
                          ...efetivarData,
                          funcaoCargo: e.target.value,
                          setor: sel ? sel.setor : efetivarData.setor,
                          remuneracao: sel ? sel.faixaSalarialMinima : efetivarData.remuneracao,
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    >
                      {cargos.map((cargo) => (
                        <option key={cargo.id} value={cargo.cargo}>
                          {cargo.cargo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Setor */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Setor</label>
                    <input
                      type="text"
                      value={efetivarData.setor}
                      onChange={(e) => setEfetivarData({ ...efetivarData, setor: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  {/* Data Admissão */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Data de Admissão</label>
                    <input
                      type="date"
                      required
                      value={efetivarData.dataAdmissao}
                      onChange={(e) => setEfetivarData({ ...efetivarData, dataAdmissao: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  {/* Supervisor */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Supervisor Imediato</label>
                    <select
                      value={efetivarData.supervisorId}
                      onChange={(e) => setEfetivarData({ ...efetivarData, supervisorId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    >
                      {supervisores.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.nome} ({sup.cargo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remuneração */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Salário Base (R$)</label>
                    <input
                      type="number"
                      step="50"
                      value={efetivarData.remuneracao}
                      onChange={(e) => setEfetivarData({ ...efetivarData, remuneracao: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  {/* Vale Alimentação */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vale Alimentação / Dia (R$)</label>
                    <input
                      type="number"
                      step="1"
                      value={efetivarData.valorValeAlimentacaoDia}
                      onChange={(e) => setEfetivarData({ ...efetivarData, valorValeAlimentacaoDia: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEfetivarCandidate(null)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#B38F4F] hover:bg-[#8A6A39] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-900/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar & Cadastrar Colaborador</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
