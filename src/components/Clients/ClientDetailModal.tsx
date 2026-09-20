import React, { useState } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Truck,
  Thermometer,
  ShieldCheck,
  Calendar,
  MessageCircle,
  Clock,
  Printer,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
  TrendingUp,
  Globe,
  Share2,
  Award,
  FileSignature,
} from 'lucide-react';
import { Cliente, Empregador, Supervisor, UserRole } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  empregadores: Empregador[];
  supervisores: Supervisor[];
  userRole: UserRole;
  onEdit: (cliente: Cliente) => void;
  onAddInteraction: (cliente: Cliente) => void;
  onUpdateStatus: (clienteId: string, status: Cliente['status']) => void;
  onGerarProposta: (cliente: Cliente) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  isOpen,
  onClose,
  cliente,
  empregadores,
  supervisores,
  userRole,
  onEdit,
  onAddInteraction,
  onUpdateStatus,
  onGerarProposta,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'operacao' | 'contrato' | 'rotas' | 'contatos' | 'crm'>('geral');

  if (!isOpen || !cliente) return null;

  const empregadorFaturamento = empregadores.find((e) => e.id === cliente.empresaFaturamentoId) || empregadores[0];
  const principalContact = cliente.contatos?.find((c) => c.principal) || cliente.contatos?.[0];

  const cleanPhoneForWhatsApp = (phoneStr?: string) => {
    return phoneStr ? phoneStr.replace(/\D/g, '') : '';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="print:hidden px-6 py-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#92611F] shrink-0 mt-0.5">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-mono font-bold border border-slate-200">
                  {cliente.codigoCliente}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {cliente.segmento}
                </span>
                {cliente.exigeRDC430 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    RDC 430 ANVISA
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {cliente.nomeFantasia || cliente.razaoSocial}
              </h2>
              <p className="text-xs text-slate-500 font-mono line-clamp-1">
                {cliente.razaoSocial} — CNPJ: {cliente.cnpj || 'Não informado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Status Selector */}
            <select
              value={cliente.status}
              onChange={(e) => onUpdateStatus(cliente.id, e.target.value as Cliente['status'])}
              className="bg-white border border-slate-200 text-xs text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg focus:outline-hidden focus:border-[#C48229]"
            >
              <option value="Ativo">Status: Ativo</option>
              <option value="Em Negociação">Status: Em Negociação</option>
              <option value="Prospecção">Status: Prospecção</option>
              <option value="Suspenso">Status: Suspenso</option>
              <option value="Inativo">Status: Inativo</option>
            </select>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Imprimir Ficha do Cliente"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onGerarProposta(cliente)}
              className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Gerar Proposta Comercial em PDF a partir deste cadastro"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Proposta Comercial</span>
            </button>

            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(cliente);
                }}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="print:hidden flex border-b border-slate-100 bg-slate-50 px-6 gap-2 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'geral'
                ? 'border-[#C48229] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#C48229]" />
            <span>Visão Geral & Cadastro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('operacao')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'operacao'
                ? 'border-[#C48229] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>Operação & RDC 430</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contrato')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'contrato'
                ? 'border-[#C48229] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Contrato & Tabela de Fretes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rotas')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'rotas'
                ? 'border-[#C48229] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Praças & Rotas ({cliente.regioesAtendidas?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contatos')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'contatos'
                ? 'border-[#C48229] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Contatos ({cliente.contatos?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('crm')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'crm'
                ? 'border-[#C48229] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            <span>Histórico CRM ({cliente.interacoes?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="jmt-print-doc flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <PrintDocumentHeader
            titulo="FICHA CADASTRAL DE CLIENTE"
            subtitulo={`${cliente.segmento} — ${cliente.codigoCliente}`}
            metadados={cliente.nomeFantasia || cliente.razaoSocial}
          />
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              {/* Financial KPI Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                    Faturamento Mensal
                  </span>
                  <span className="text-base sm:text-lg font-bold text-emerald-600 mt-1 block">
                    {formatCurrency(cliente.faturamentoMensalEstimado || 0)}
                  </span>
                  <span className="text-[11px] text-slate-400">Estimativa contratada</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                    Volume Médio
                  </span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 mt-1 block">
                    {cliente.volumeEntregasMesEstimado || 0}{' '}
                    <span className="text-xs font-normal text-slate-400">entregas/mês</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Last mile & transferências</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                    Satisfação (NPS)
                  </span>
                  <span className="text-base sm:text-lg font-bold text-[#92611F] mt-1 block flex items-center gap-1">
                    <Award className="w-4 h-4 text-[#C48229]" />
                    {cliente.satisfacaoNPS || 10} / 10
                  </span>
                  <span className="text-[11px] text-slate-400">Índice de Qualidade JMT</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                    Gestor da Conta (JMT)
                  </span>
                  <span className="text-xs font-bold text-slate-700 mt-1 block truncate">
                    {cliente.gerenteContaResponsavel || 'Não atribuído'}
                  </span>
                  <span className="text-[11px] text-slate-400">Atendimento Dedicado</span>
                </div>
              </div>

              {/* Informações Cadastrais */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C48229]" />
                  Dados Cadastrais e Fiscais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Razão Social:</span>
                    <span className="text-slate-700 font-medium">{cliente.razaoSocial}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">CNPJ:</span>
                    <span className="text-slate-700 font-mono">{cliente.cnpj || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Inscrição Estadual (IE):</span>
                    <span className="text-slate-700 font-mono">{cliente.inscricaoEstadual || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Filial JMT de Faturamento:</span>
                    <span className="text-slate-700 font-medium">
                      {empregadorFaturamento?.nomeFantasia || empregadorFaturamento?.razaoSocial}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Endereço do CD / Matriz:</span>
                    <span className="text-slate-700 font-medium">{cliente.enderecoCompleto || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Cidade / UF:</span>
                    <span className="text-slate-700 font-medium">{cliente.cidadeUF || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Telefone Principal:</span>
                    <span className="text-slate-700 font-medium">{cliente.telefonePrincipal || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">E-mail Principal:</span>
                    <span className="text-slate-700 font-medium">{cliente.emailPrincipal || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Website:</span>
                    <span className="text-slate-700 font-medium">{cliente.website || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Contato Principal Destaque */}
              {principalContact && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                      {principalContact.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{principalContact.nome}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          Contato Principal
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {principalContact.cargoSetor} • {principalContact.email || 'Sem e-mail'}
                      </p>
                    </div>
                  </div>

                  {principalContact.telefoneWhatsapp && (
                    <a
                      href={`https://wa.me/55${cleanPhoneForWhatsApp(principalContact.telefoneWhatsapp)}?text=${encodeURIComponent(
                        `Olá ${principalContact.nome}, aqui é da Jobson de Moraes Transportes (JMT). Referente à operação da ${cliente.nomeFantasia}:`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Falar no WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OPERAÇÃO & ANVISA (RDC 430) */}
          {activeTab === 'operacao' && (
            <div className="space-y-5">
              {/* Modalidades Operacionais */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-600" />
                  Modalidades Operacionais & Frota Dedicada
                </h4>

                <div className="flex flex-wrap gap-2">
                  {cliente.tiposOperacao?.map((tipo) => (
                    <span
                      key={tipo}
                      className="text-xs px-3 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 font-medium flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                      {tipo}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Faixa Térmica Exigida:</span>
                    <span className="text-cyan-700 font-semibold flex items-center gap-1 mt-0.5">
                      <Thermometer className="w-3.5 h-3.5" />
                      {cliente.faixaTemperatura}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Frota / Veículos Alocados:</span>
                    <span className="text-slate-700 font-medium mt-0.5 block">
                      {cliente.veiculosAlocados || 'Frota compartilhada / sob demanda'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conformidade Regulatória Sanitária ANVISA */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Conformidade Sanitária & ANVISA (RDC 430/2020)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Exigência RDC 430:</span>
                    <span className="text-emerald-700 font-semibold">
                      {cliente.exigeRDC430 ? 'Sim (Qualificação Térmica + Datalogger)' : 'Não'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Nº Licença Sanitária / AFE:</span>
                    <span className="text-slate-700 font-mono">
                      {cliente.numeroLicencaSanitaria || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Validade da Licença Sanitária:</span>
                    <span className="text-slate-700 font-semibold">
                      {cliente.validadeLicencaSanitaria ? formatDateBR(cliente.validadeLicencaSanitaria) : '—'}
                    </span>
                  </div>
                </div>

                {cliente.restricoesHorarioCarga && (
                  <div className="pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-400 block">Restrições de Horário e Janelas de Descarga:</span>
                    <p className="text-slate-600 mt-1 italic bg-white p-2.5 rounded border border-slate-200">
                      {cliente.restricoesHorarioCarga}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONTRATO & TABELA DE FRETES */}
          {activeTab === 'contrato' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Vigência e Condições Contratuais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Número do Contrato:</span>
                    <span className="text-slate-900 font-mono font-bold">{cliente.numeroContrato || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Data de Início:</span>
                    <span className="text-slate-700 font-medium">
                      {cliente.dataInicioContrato ? formatDateBR(cliente.dataInicioContrato) : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Próxima Renovação:</span>
                    <span className="text-amber-700 font-semibold">
                      {cliente.dataRenovacaoContrato ? formatDateBR(cliente.dataRenovacaoContrato) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Preço Detalhada */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-[#92611F] uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#C48229]" />
                  Tabela de Frete & Tarifas Vigentes
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Modelo de Cobrança:</span>
                    <span className="text-slate-900 font-bold block mt-0.5">
                      {cliente.tabelaFrete?.tipoCobranca}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">
                      {cliente.tabelaFrete?.tipoCobranca === '% sobre Nota Fiscal (Ad Valorem)'
                        ? '% Ad Valorem sobre a NF:'
                        : 'Taxa de Entrega / Valor Base:'}
                    </span>
                    <span className="text-emerald-700 font-bold text-sm block mt-0.5">
                      {cliente.tabelaFrete?.tipoCobranca === '% sobre Nota Fiscal (Ad Valorem)'
                        ? `${cliente.tabelaFrete?.percentualAdValoremNF ?? cliente.tabelaFrete?.valorBase ?? 0}% sobre NF`
                        : formatCurrency(cliente.tabelaFrete?.valorBase || 0)}
                    </span>
                  </div>

                  {!!cliente.tabelaFrete?.valorKgExcedente && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-400 block text-[11px]">Valor por Kg Excedente:</span>
                      <span className="text-emerald-700 font-bold text-sm block mt-0.5">
                        {formatCurrency(cliente.tabelaFrete.valorKgExcedente)}/kg
                      </span>
                    </div>
                  )}

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Frete Mínimo:</span>
                    <span className="text-slate-700 font-semibold block mt-0.5">
                      {formatCurrency(cliente.tabelaFrete?.freteMinimo || 0)}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Taxa Descarga / Ajudante CCT:</span>
                    <span className="text-slate-700 font-semibold block mt-0.5">
                      {formatCurrency(cliente.tabelaFrete?.taxaDescargaAjudante || 0)}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">% GRIS / Pedágio:</span>
                    <span className="text-slate-700 font-semibold block mt-0.5">
                      {cliente.tabelaFrete?.percentualGrisPedagio || 0}%
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Condição de Pagamento:</span>
                    <span className="text-[#92611F] font-semibold block mt-0.5">
                      {cliente.tabelaFrete?.condicaoPagamento || 'Faturamento 15 dias'} (Dia {cliente.tabelaFrete?.diaFechamento || 15})
                    </span>
                  </div>
                </div>

                {cliente.tabelaFrete?.observacoesTarifa && (
                  <div className="text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block">Regras e Taxas Especiais:</span>
                    <p className="text-slate-600 mt-1 italic">{cliente.tabelaFrete.observacoesTarifa}</p>
                  </div>
                )}

                {!!cliente.tabelaFrete?.tarifasPorCidade?.length && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">
                      Tabela Detalhada por Cidade / Praça ({cliente.tabelaFrete.tarifasPorCidade.length})
                    </span>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500">
                            <th className="text-left p-2 font-semibold">Cidade</th>
                            <th className="text-left p-2 font-semibold">Raio</th>
                            <th className="text-right p-2 font-semibold">Até 10kg</th>
                            <th className="text-right p-2 font-semibold">Kg Exc.</th>
                            <th className="text-right p-2 font-semibold">Km</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cliente.tabelaFrete.tarifasPorCidade.map((t) => (
                            <tr key={t.id} className="bg-white text-slate-700">
                              <td className="p-2">{t.cidade}</td>
                              <td className="p-2 text-slate-400">{t.raio}</td>
                              <td className="p-2 text-right font-semibold">{formatCurrency(t.valorAte10Kg)}</td>
                              <td className="p-2 text-right font-semibold">{formatCurrency(t.valorKgExcedente)}</td>
                              <td className="p-2 text-right text-slate-400">{t.distanciaKm ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!!cliente.tabelaFrete?.custosExtras?.length && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">
                      Custos Extras / Encargos Avulsos ({cliente.tabelaFrete.custosExtras.length})
                    </span>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500">
                            <th className="text-left p-2 font-semibold">Categoria</th>
                            <th className="text-left p-2 font-semibold">Grupo / Destinatário</th>
                            <th className="text-left p-2 font-semibold">Item / Descrição</th>
                            <th className="text-left p-2 font-semibold">Tipo</th>
                            <th className="text-right p-2 font-semibold">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cliente.tabelaFrete.custosExtras.map((c) => (
                            <tr key={c.id} className="bg-white text-slate-700">
                              <td className="p-2">{c.categoria || '—'}</td>
                              <td className="p-2 text-slate-400">{c.grupoDestinatario || '—'}</td>
                              <td className="p-2 text-slate-400">{c.itemDescricao || '—'}</td>
                              <td className="p-2 text-slate-400">{c.tipoCobranca}</td>
                              <td className="p-2 text-right font-semibold">{formatCurrency(c.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRAÇAS & ROTAS */}
          {activeTab === 'rotas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  Praças Atendidas & Frequência de Distribuição
                </h4>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-500 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Praça / Região Atendida</th>
                      <th className="px-4 py-3">Frequência</th>
                      <th className="px-4 py-3">SLA / Lead Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cliente.regioesAtendidas?.map((reg, idx) => (
                      <tr key={idx} className="hover:bg-slate-100/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">{reg.cidadeUF}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
                            {reg.frequencia}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-medium">{reg.prazoLeadTime}</td>
                      </tr>
                    ))}
                    {(!cliente.regioesAtendidas || cliente.regioesAtendidas.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic">
                          Nenhuma rota ou praça cadastrada para este cliente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CONTATOS */}
          {activeTab === 'contatos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Lista de Contatos e Gestores
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cliente.contatos?.map((cont) => (
                  <div
                    key={cont.id}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{cont.nome}</span>
                        {cont.principal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{cont.cargoSetor}</p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
                      {cont.telefoneWhatsapp && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cont.telefoneWhatsapp}</span>
                        </div>
                      )}
                      {cont.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{cont.email}</span>
                        </div>
                      )}
                    </div>

                    {cont.telefoneWhatsapp && (
                      <a
                        href={`https://wa.me/55${cleanPhoneForWhatsApp(cont.telefoneWhatsapp)}?text=${encodeURIComponent(
                          `Olá ${cont.nome}, aqui é da Jobson de Moraes Transportes (JMT):`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 w-full py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chamar no WhatsApp</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: HISTÓRICO CRM */}
          {activeTab === 'crm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Histórico de Interações, Auditorias & Alinhamentos
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Registro de reuniões comerciais, auditorias de cadeia fria e aditivos contratuais
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddInteraction(cliente)}
                  className="px-3 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nova Interação</span>
                </button>
              </div>

              <div className="space-y-3">
                {cliente.interacoes && cliente.interacoes.length > 0 ? (
                  cliente.interacoes.map((inter) => (
                    <div
                      key={inter.id}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{inter.tipo}</span>
                          <span className="text-[11px] text-slate-400">• {formatDateBR(inter.data)}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Resp: <strong className="text-slate-600">{inter.responsavelJMT}</strong>
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">{inter.resumo}</p>

                      {inter.proximoPasso && (
                        <div className="text-[11px] bg-white p-2 rounded border border-slate-200 text-amber-700 flex items-center justify-between">
                          <span>
                            <strong>Próximo Passo:</strong> {inter.proximoPasso}
                          </span>
                          {inter.dataProximoPasso && (
                            <span className="text-slate-400">Prazo: {formatDateBR(inter.dataProximoPasso)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    Nenhuma interação registrada ainda. Clique em "+ Nova Interação" para registrar reuniões ou contatos.
                  </p>
                )}
              </div>
            </div>
          )}
          <PrintDocumentFooter />
        </div>

        {/* Footer */}
        <div className="print:hidden px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Última atualização: {cliente.atualizadoEm ? formatDateBR(cliente.atualizadoEm) : '—'}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
          >
            Fechar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
