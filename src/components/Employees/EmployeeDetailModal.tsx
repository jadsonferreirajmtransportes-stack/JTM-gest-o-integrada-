import React, { useState } from 'react';
import {
  X,
  Printer,
  Edit2,
  Calendar,
  AlertTriangle,
  UserX,
  CheckCircle2,
  FileWarning,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Stethoscope,
  Paperclip,
  Shirt,
  Users as UsersIcon,
  Download,
  Image as ImageIcon,
  Eye,
  StickyNote,
  Utensils,
  Link2,
} from 'lucide-react';
import {
  Colaborador,
  Empregador,
  Supervisor,
  UserRole,
  AnotacaoColaborador,
  AnexoColaborador,
  LancamentoValeAlimentacao,
} from '../../types';
import {
  formatDate,
  formatMoney,
  calcVtMes,
  calcVaMes,
  calcCustoMensalTotal,
  calcExamStatus,
  calcDaysRemaining,
  formatDaysCountdown,
} from '../../utils/formatters';
import { ImageViewerModal } from '../Common/ImageViewerModal';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';
import { EmployeeDossierSection } from './EmployeeDossierSection';
import { CompartilharFichaModal } from './CompartilharFichaModal';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaborador: Colaborador | null;
  empregadores: Empregador[];
  supervisores: Supervisor[];
  userRole: UserRole;
  /** Acesso GERAL ao módulo DP — ver temAcessoGeralDp em visibilidadeUtils.ts. Controla os
   *  botões "Editar" e "Compartilhar" abaixo: só quem tem TODAS as seções de DP liberadas
   *  (nenhuma restrição em secoesDpPermitidas) pode editar a ficha ou gerar o link externo de
   *  compartilhamento — ver a ficha e imprimi-la continua liberado normalmente. */
  temAcessoGeralDp: boolean;
  onEdit: (c: Colaborador) => void;
  onProgramarFerias: (c: Colaborador) => void;
  onRegistrarOcorrencia: (c: Colaborador) => void;
  onDemitir: (c: Colaborador) => void;
  onUpdateColaborador?: (c: Colaborador) => void;
  lancamentosValeAlimentacao?: LancamentoValeAlimentacao[];
  /** Nome de quem está logado — vai gravado no link de compartilhamento gerado, pra
   *  rastreabilidade (quem enviou a ficha pra fora). */
  criadoPor?: string;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  isOpen,
  onClose,
  colaborador,
  empregadores,
  supervisores,
  userRole,
  temAcessoGeralDp,
  onEdit,
  onProgramarFerias,
  onRegistrarOcorrencia,
  onDemitir,
  onUpdateColaborador,
  lancamentosValeAlimentacao = [],
  criadoPor,
}) => {
  const [printMode, setPrintMode] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAsoViewerOpen, setIsAsoViewerOpen] = useState(false);

  if (!isOpen || !colaborador) return null;

  const empregador = empregadores.find((e) => e.id === colaborador.empregadorId);
  const supervisor = supervisores.find((s) => s.id === colaborador.supervisorId);

  const vtMes = calcVtMes(colaborador.vtValorTarifa, colaborador.vtQuantidadeTarifasDia);
  const vaMes = calcVaMes(colaborador.valorValeAlimentacaoDia);
  const custoTotal = calcCustoMensalTotal(
    colaborador.remuneracao,
    colaborador.gratificacao,
    colaborador.vtValorTarifa,
    colaborador.vtQuantidadeTarifasDia,
    colaborador.valorValeAlimentacaoDia
  );

  const examStatus = calcExamStatus(colaborador.dataVencimentoExame);
  const examDays = calcDaysRemaining(colaborador.dataVencimentoExame);
  const examCountdown = formatDaysCountdown(examDays);

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateAnotacoes = (anotacoes: AnotacaoColaborador[]) => {
    if (onUpdateColaborador) {
      onUpdateColaborador({ ...colaborador, anotacoes });
    }
  };

  const handleUpdateAnexos = (anexos: AnexoColaborador[]) => {
    if (onUpdateColaborador) {
      onUpdateColaborador({ ...colaborador, anexos });
    }
  };

  const handleUpdateObservacoesGerais = (observacoesGerais: string) => {
    if (onUpdateColaborador) {
      onUpdateColaborador({ ...colaborador, observacoesGerais });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-md">
              {colaborador.nomeCompleto.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {colaborador.codigoMatricula}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    colaborador.status === 'Ativo'
                      ? 'bg-emerald-50 text-emerald-700'
                      : colaborador.status === 'Férias'
                      ? 'bg-blue-50 text-blue-700'
                      : colaborador.status === 'Afastado'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {colaborador.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1 leading-tight">
                {colaborador.nomeCompleto}
              </h2>
              <p className="text-xs text-slate-500 print:text-slate-600">
                {colaborador.funcaoCargo} • {colaborador.setor}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200"
              title="Imprimir Ficha Cadastral do Empregado"
            >
              <Printer className="w-4 h-4 text-[#92611F]" />
              <span>Imprimir Ficha</span>
            </button>

            {temAcessoGeralDp && (
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200"
                title="Compartilhar Ficha Cadastral por link (terceiro externo, sem login)"
              >
                <Link2 className="w-4 h-4 text-[#92611F]" />
                <span>Compartilhar</span>
              </button>
            )}

            {temAcessoGeralDp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(colaborador);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="jmt-print-doc p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
          <PrintDocumentHeader
            titulo="FICHA DE REGISTRO DE EMPREGADO"
            subtitulo="Conformidade ANVISA RDC 430 & Portaria MTE"
            metadados={`${colaborador.nomeCompleto} — Matrícula ${colaborador.codigoMatricula}`}
          />

          {/* Quick Summary Cards (2.11 & 2.7) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Custo Total Mensal */}
            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                Custo Total Mensal (2.11)
              </span>
              <div className="text-2xl font-black text-amber-950 mt-1">
                {colaborador.status === 'Inativo' ? 'Inativo' : formatMoney(custoTotal)}
              </div>
              <div className="text-[11px] text-amber-800 mt-1">
                Salário ({formatMoney(colaborador.remuneracao)}) + VT ({formatMoney(vtMes)}) + VA ({formatMoney(vaMes)})
              </div>
            </div>

            {/* Saúde Ocupacional RDC 430 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Saúde Ocupacional (RDC 430)
                </span>
                {colaborador.asoImagemUrl && (
                  <button
                    type="button"
                    onClick={() => setIsAsoViewerOpen(true)}
                    className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 transition-colors"
                  >
                    <Eye className="w-3 h-3 text-amber-700" />
                    Ver ASO
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-sm font-bold px-2 py-0.5 rounded-full border ${examCountdown.bgClass}`}
                >
                  {examStatus}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {formatDate(colaborador.dataVencimentoExame)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{examCountdown.text}</div>
            </div>

            {/* Documentação */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Checklist de Documentação
              </span>
              <div className="mt-1 font-bold text-sm text-slate-800">
                {colaborador.documentos?.filter((d) => d.status === 'Recebido').length} de{' '}
                {colaborador.documentos?.filter((d) => d.status !== 'Não se aplica').length} documentos recebidos
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {colaborador.documentos?.some((d) => d.status === 'Pendente') ? (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <FileWarning className="w-3 h-3" /> Possui pendências cadastrais
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Documentação completa
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Dados Pessoais (2.2) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
              <span>2.2 Dados Pessoais</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">CPF:</span>
                <span className="font-semibold text-slate-800 font-mono">{colaborador.cpf}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">RG / Órgão:</span>
                <span className="font-semibold text-slate-800">
                  {colaborador.rg} ({colaborador.orgaoEmissorUF})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Nascimento:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(colaborador.dataNascimento)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Gênero:</span>
                <span className="font-semibold text-slate-800">{colaborador.genero}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Estado Civil:</span>
                <span className="font-semibold text-slate-800">{colaborador.estadoCivil}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Raça / Cor:</span>
                <span className="font-semibold text-slate-800">{colaborador.racaCor}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Grau de Instrução:</span>
                <span className="font-semibold text-slate-800">{colaborador.grauInstrucao}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">PCD (Deficiência):</span>
                <span className="font-semibold text-slate-800">
                  {colaborador.portadorDeficiencia ? `Sim (${colaborador.detalheDeficiencia || 'Laudo'})` : 'Não'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Filiação:</span>
                <span className="font-medium text-slate-800">
                  Mãe: {colaborador.nomeMae || '-'} | Pai: {colaborador.nomePai || '-'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Endereço:</span>
                <span className="font-medium text-slate-800">
                  {colaborador.enderecoCompleto} — {colaborador.cidadeUF} (CEP: {colaborador.cep})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Telefone (WhatsApp):</span>
                <span className="font-semibold text-slate-800">{colaborador.telefoneWhatsapp}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">E-mail:</span>
                <span className="font-semibold text-slate-800">{colaborador.email}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Dados Contratuais & Bancários (2.3 & 2.4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contratuais */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">2.3 Dados Contratuais</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Empregador:</span>
                  <span className="font-medium text-slate-900">
                    {empregador?.nomeFantasia || empregador?.razaoSocial || 'JMT'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admissão:</span>
                  <span className="font-semibold text-slate-800">{formatDate(colaborador.dataAdmissao)}</span>
                </div>
                {colaborador.dataDemissao && (
                  <div className="flex justify-between text-rose-700">
                    <span>Demissão:</span>
                    <span className="font-bold">{formatDate(colaborador.dataDemissao)} ({colaborador.motivoDemissao})</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Supervisor Direto:</span>
                  <span className="font-medium text-slate-800">{supervisor?.nome || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma de Pagamento:</span>
                  <span className="font-medium text-slate-800">{colaborador.formaPagamento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jornada de Trabalho:</span>
                  <span className="font-medium text-slate-800 text-right">{colaborador.jornadaTrabalho}</span>
                </div>
              </div>
            </div>

            {/* Bancários */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">2.4 Dados Bancários</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Banco:</span>
                  <span className="font-semibold text-slate-800">{colaborador.banco || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Agência / Conta:</span>
                  <span className="font-mono text-slate-800">
                    Ag: {colaborador.agencia || '-'} | C/C: {colaborador.numeroConta || '-'} ({colaborador.tipoConta})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tipo de Chave PIX:</span>
                  <span className="font-medium text-slate-800">{colaborador.tipoChavePix}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chave PIX:</span>
                  <span className="font-mono font-bold text-amber-900">{colaborador.chavePix || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Benefícios (VT & VA) e Fardamento (2.6 & 2.9) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VT & VA */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">2.6 Benefícios (VT & VA)</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vale Transporte / Dia:</span>
                  <span className="font-semibold text-slate-800">
                    {colaborador.vtQuantidadeTarifasDia} tarifas × {formatMoney(colaborador.vtValorTarifa)} ={' '}
                    {formatMoney(colaborador.vtQuantidadeTarifasDia * colaborador.vtValorTarifa)}/dia
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Linha / Condução:</span>
                  <span className="font-medium text-slate-700">{colaborador.vtIdentificacaoConducao || 'Não informada'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vale Alimentação / Dia:</span>
                  <span className="font-semibold text-slate-800">
                    {formatMoney(colaborador.valorValeAlimentacaoDia)}/dia ({formatMoney(vaMes)}/mês)
                  </span>
                </div>
              </div>
            </div>

            {/* Fardamento & EPI */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">2.9 Fardamento e EPI</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-lg border">
                  <span className="text-slate-400 text-[10px] block">Camisa</span>
                  <span className="font-bold text-slate-900 text-base">{colaborador.tamanhoCamisa}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border">
                  <span className="text-slate-400 text-[10px] block">Calça</span>
                  <span className="font-bold text-slate-900 text-base">{colaborador.numeroCalca}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border">
                  <span className="text-slate-400 text-[10px] block">Calçado</span>
                  <span className="font-bold text-slate-900 text-base">{colaborador.numeroCalcado}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Dependentes (2.5) */}
          {colaborador.dependentes?.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">
                2.5 Dependentes ({colaborador.dependentes.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {colaborador.dependentes.map((d) => (
                  <div key={d.id} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{d.nome}</span>
                      <span className="text-slate-400 ml-2">({d.parentesco})</span>
                    </div>
                    <div className="text-slate-500 font-mono">
                      Nasc: {formatDate(d.dataNascimento)} | CPF: {d.cpf}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Documentação Detalhada (2.8) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm border-b pb-2">
              2.8 Documentos Arquivados (Checklist RDC 430)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {colaborador.documentos?.map((doc) => {
                // Cadastros antigos de ASO Admissional foram salvos só no campo do ASO
                // (colaborador.asoImagemUrl), sem duplicar o arquivo aqui no item do checklist —
                // usa esse como reserva pra não deixar o download quebrado nesses casos.
                const arquivoUrl =
                  doc.arquivoUrl || (doc.tipo === 'ASO Admissional' ? colaborador.asoImagemUrl : undefined);
                const nomeArquivo =
                  doc.nomeArquivo || (doc.tipo === 'ASO Admissional' ? colaborador.asoNomeArquivo : undefined);
                return (
                <div
                  key={doc.id}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{doc.tipo}</div>
                    {nomeArquivo && (
                      <div className="text-[10px] text-blue-600 font-mono truncate">{nomeArquivo}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {arquivoUrl && (
                      <a
                        href={arquivoUrl}
                        download={nomeArquivo || doc.tipo}
                        className="p-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-slate-600"
                        title="Baixar documento"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.status === 'Recebido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.status === 'Pendente'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Section 6: Saúde Ocupacional & ASO Detalhado (2.7) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-amber-600" />
                <span>2.7 Atestado de Saúde Ocupacional (ASO) & Exames RDC 430</span>
              </h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${examCountdown.bgClass}`}>
                {examStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">Resultado do ASO:</span>
                <span className="font-bold text-slate-900 text-xs">
                  {colaborador.asoResultado || 'Apto'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Vencimento do Exame:</span>
                <span className="font-bold text-slate-900 text-xs">
                  {formatDate(colaborador.dataVencimentoExame)} ({examDays} dias)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Clínica Médica / Coordenador:</span>
                <span className="font-medium text-slate-800 text-xs">
                  {colaborador.clinicaMedica || 'MedSeg Medicina do Trabalho'}
                </span>
              </div>
              {colaborador.asoMedicoEmitente && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Médico Emitente / CRM:</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {colaborador.asoMedicoEmitente}
                  </span>
                </div>
              )}
              {colaborador.dataExameAdmissional && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Data Admissional:</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {formatDate(colaborador.dataExameAdmissional)}
                  </span>
                </div>
              )}
              {colaborador.observacaoSaude && (
                <div className="sm:col-span-3">
                  <span className="text-slate-400 block text-[11px]">Observações / Restrições Médicas:</span>
                  <span className="font-medium text-slate-800 text-xs bg-slate-50 p-2 rounded-md block mt-0.5">
                    {colaborador.observacaoSaude}
                  </span>
                </div>
              )}
            </div>

            {/* ASO Image Preview Card */}
            {colaborador.asoImagemUrl ? (
              <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3 mt-2">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setIsAsoViewerOpen(true)}
                    className="w-14 h-14 rounded-lg bg-white border border-amber-300 overflow-hidden flex items-center justify-center cursor-pointer group relative"
                  >
                    <img
                      src={colaborador.asoImagemUrl}
                      alt="ASO Digitalizado"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {colaborador.asoNomeArquivo || 'Comprovante_ASO_Digitalizado.png'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Documento comprobatório auditável ANVISA RDC 430
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAsoViewerOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 text-xs transition-colors shrink-0 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visualizar ASO</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-xs text-center border border-slate-200 border-dashed">
                Nenhum arquivo digitalizado ou imagem do ASO foi anexado a este registro.
              </div>
            )}
          </div>

          {/* Movimentações — Vale Alimentação (lançamentos gerados na Programação por Quinzena) */}
          <div className="print:hidden">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-amber-600" />
              Movimentações — Vale Alimentação
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {lancamentosValeAlimentacao.length === 0 ? (
                <div className="p-3 bg-slate-50 text-slate-400 text-center">
                  Nenhuma movimentação de Vale Alimentação registrada ainda para este
                  colaborador. Gere pela tela "Programação VA (Quinzenas)".
                </div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Quinzena</th>
                      <th className="px-3 py-2">Período</th>
                      <th className="px-3 py-2 text-right">Faltas</th>
                      <th className="px-3 py-2 text-right">Dias de Férias</th>
                      <th className="px-3 py-2 text-right">Diárias</th>
                      <th className="px-3 py-2 text-right">Valor Disponibilizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lancamentosValeAlimentacao
                      .slice()
                      .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))
                      .map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-1.5 font-medium text-slate-700">
                            {l.identificacaoQuinzena}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">
                            {formatDate(l.dataInicio)} a {formatDate(l.dataTermino)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{l.faltas}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{l.diasFerias || 0}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-slate-700">
                            {l.quantidadeDiarias}
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-emerald-700">
                            {formatMoney(l.valorDisponibilizado)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Section 7: Anotações Internas e Dossiê de Anexos (2.10) */}
          <div className="print:hidden">
            <EmployeeDossierSection
              anotacoes={colaborador.anotacoes || []}
              anexos={colaborador.anexos || []}
              observacoesGerais={colaborador.observacoesGerais || ''}
              onUpdateAnotacoes={handleUpdateAnotacoes}
              onUpdateAnexos={handleUpdateAnexos}
              onUpdateObservacoesGerais={handleUpdateObservacoesGerais}
              readOnly={userRole === 'colaborador'}
            />
          </div>
          <PrintDocumentFooter />
        </div>

        {/* Lightbox for ASO */}
        {colaborador.asoImagemUrl && (
          <ImageViewerModal
            isOpen={isAsoViewerOpen}
            onClose={() => setIsAsoViewerOpen(false)}
            imageUrl={colaborador.asoImagemUrl}
            title="Atestado de Saúde Ocupacional (ASO) — Digitalizado"
            subtitle={`${colaborador.nomeCompleto} • Matrícula: ${colaborador.codigoMatricula}`}
            fileName={colaborador.asoNomeArquivo || 'ASO_Digitalizado.png'}
          />
        )}

        {/* Compartilhar Ficha Cadastral por link (terceiro externo, sem login) */}
        <CompartilharFichaModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          colaborador={colaborador}
          criadoPor={criadoPor}
        />

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            {userRole !== 'colaborador' && colaborador.status !== 'Inativo' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onProgramarFerias(colaborador);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Programar Férias</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRegistrarOcorrencia(colaborador);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1 border border-amber-200"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Registrar Ocorrência</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {userRole === 'admin' && colaborador.status !== 'Inativo' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDemitir(colaborador);
                }}
                className="px-3 py-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold"
              >
                Inativar / Demitir
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
