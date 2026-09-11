import React, { useEffect, useState } from 'react';
import { ShieldCheck, ArrowLeft, AlertTriangle, Printer, Loader2 } from 'lucide-react';
import { JmtLogo } from '../Brand/JmtLogo';
import { PrintDocumentHeader, PrintDocumentFooter } from '../Common/PrintDocumentChrome';
import { obterFichaCompartilhadaPublica } from '../../utils/dpApi';
import { formatDate, formatMoney, calcVtMes, calcVaMes } from '../../utils/formatters';

interface FichaCadastralPublicViewProps {
  token?: string;
  onAdminBack?: () => void;
}

/** Portal público (sem login) para visualizar uma Ficha Cadastral compartilhada por link —
 *  mesmo padrão do Link de Admissão / Formulário Público de Ocorrências / Instrução de
 *  Trabalho: acessível por link direto, sem conta no sistema JMT. Usado pra enviar o cadastro
 *  de um colaborador a um terceiro externo (contador, fiscalização, RH de outra empresa).
 *
 *  O conteúdo vem de uma "foto" (snapshot) tirada no momento em que o link foi gerado — ver
 *  gerarLinkFichaCompartilhada em dpApi.ts — validado no banco via token único, com expiração
 *  curta e possibilidade de revogação antecipada pelo RH. */
export const FichaCadastralPublicView: React.FC<FichaCadastralPublicViewProps> = ({
  token,
  onAdminBack,
}) => {
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<Record<string, any> | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!token) {
      setCarregando(false);
      setErro(true);
      return;
    }
    (async () => {
      try {
        const resultado = await obterFichaCompartilhadaPublica(token);
        if (!ativo) return;
        if (resultado) {
          setDados(resultado);
        } else {
          setErro(true);
        }
      } catch (e) {
        console.error('Erro ao carregar ficha cadastral compartilhada:', e);
        if (ativo) setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [token]);

  const vtMes = dados ? calcVtMes(dados.vtValorTarifa || 0, dados.vtQuantidadeTarifasDia || 0) : 0;
  const vaMes = dados ? calcVaMes(dados.valorValeAlimentacaoDia || 0) : 0;

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 flex flex-col font-sans selection:bg-[#B38F4F] selection:text-white print:bg-white print:text-black">
      {/* Header */}
      <header className="bg-[#0c0c0c] border-b border-[#262626] sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <JmtLogo variant="compact" theme="dark" iconSize={32} />
          <div className="hidden sm:block pl-3 border-l border-[#262626]">
            <span className="bg-[#B38F4F]/15 text-[#B38F4F] border border-[#B38F4F]/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Ficha Cadastral Compartilhada
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Visualização somente leitura — sem login</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dados && (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-slate-200 border border-[#2a2a2a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#B38F4F]" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-[#161616] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
            <ShieldCheck className="w-4 h-4 text-[#B38F4F]" />
            <span>Gestão por Processos JMT</span>
          </div>
          {onAdminBack && (
            <button
              type="button"
              onClick={onAdminBack}
              className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] text-slate-200 border border-[#2a2a2a] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#B38F4F]" />
              <span>Painel Admin</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:max-w-none">
        {carregando ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#B38F4F]" />
            <span className="text-xs">Carregando ficha cadastral...</span>
          </div>
        ) : erro || !dados ? (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-3">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Link inválido ou expirado</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Este link de ficha cadastral não é válido, já expirou ou foi revogado. Peça um novo link a quem
              compartilhou este cadastro com você.
            </p>
          </div>
        ) : (
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 jmt-print-doc print:rounded-none print:border-none print:shadow-none">
            <PrintDocumentHeader
              titulo="FICHA CADASTRAL DO COLABORADOR"
              subtitulo="Visualização Compartilhada — Somente Leitura"
              metadados={dados.nomeCompleto}
            />

            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <div>
                <span className="font-mono text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                  {dados.codigoMatricula}
                </span>
                <h1 className="text-xl font-bold text-slate-900 mt-1">{dados.nomeCompleto}</h1>
                <p className="text-xs text-slate-500">
                  {dados.funcaoCargo} • {dados.setor}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  dados.status === 'Ativo'
                    ? 'bg-emerald-100 text-emerald-700'
                    : dados.status === 'Férias'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {dados.status}
              </span>
            </div>

            <Secao titulo="Dados Pessoais">
              <Campo label="Nome Completo" valor={dados.nomeCompleto} />
              <Campo label="CPF" valor={dados.cpf} />
              <Campo label="RG" valor={dados.rg} extra={dados.orgaoEmissorUF} />
              <Campo label="Data de Nascimento" valor={formatDate(dados.dataNascimento)} />
              <Campo label="Nome do Pai" valor={dados.nomePai} />
              <Campo label="Nome da Mãe" valor={dados.nomeMae} />
              <Campo label="Estado Civil" valor={dados.estadoCivil} />
              <Campo label="Cor/Raça" valor={dados.racaCor} />
              <Campo label="Grau de Instrução" valor={dados.grauInstrucao} />
              <Campo label="Naturalidade" valor={dados.naturalidade} />
              <Campo label="Endereço" valor={dados.enderecoCompleto} extra={dados.cidadeUF} />
              <Campo label="CEP" valor={dados.cep} />
              <Campo label="Telefone/WhatsApp" valor={dados.telefoneWhatsapp} />
              <Campo label="E-mail" valor={dados.email} />
            </Secao>

            <Secao titulo="Dados Contratuais">
              <Campo label="Cargo/Função" valor={dados.funcaoCargo} />
              <Campo label="Setor" valor={dados.setor} />
              <Campo label="Status" valor={dados.status} />
              <Campo label="Data de Admissão" valor={formatDate(dados.dataAdmissao)} />
              {dados.dataDemissao && <Campo label="Data de Demissão" valor={formatDate(dados.dataDemissao)} />}
              <Campo label="Forma de Pagamento" valor={dados.formaPagamento} />
              <Campo label="Remuneração Base" valor={formatMoney(dados.remuneracao)} />
              {!!dados.gratificacao && <Campo label="Gratificação" valor={formatMoney(dados.gratificacao)} />}
              <Campo label="Jornada de Trabalho" valor={dados.jornadaTrabalho} />
              <Campo label="PIS/PASEP" valor={dados.pisPasep} />
              <Campo label="CTPS" valor={dados.ctpsNumero} extra={dados.ctpsSerie ? `Série ${dados.ctpsSerie}/${dados.ctpsUF || ''}` : undefined} />
              {dados.cnhNumero && (
                <Campo label="CNH" valor={dados.cnhNumero} extra={`Cat. ${dados.cnhCategoria || '-'} • Val. ${formatDate(dados.cnhValidade)}`} />
              )}
            </Secao>

            <Secao titulo="Dados Bancários">
              <Campo label="Banco" valor={dados.banco} />
              <Campo label="Agência" valor={dados.agencia} />
              <Campo label="Conta" valor={dados.numeroConta} extra={dados.tipoConta} />
              <Campo label="Chave PIX" valor={dados.chavePix} extra={dados.tipoChavePix} />
            </Secao>

            <Secao titulo="Vale Transporte / Vale Alimentação">
              <Campo label="Tarifas por Dia" valor={String(dados.vtQuantidadeTarifasDia ?? '-')} />
              <Campo label="Valor da Tarifa" valor={formatMoney(dados.vtValorTarifa)} />
              <Campo label="Total VT/Mês (estimado)" valor={formatMoney(vtMes)} />
              <Campo label="Valor VA/Dia" valor={formatMoney(dados.valorValeAlimentacaoDia)} />
              <Campo label="Total VA/Mês (estimado)" valor={formatMoney(vaMes)} />
            </Secao>

            {Array.isArray(dados.dependentes) && dados.dependentes.length > 0 && (
              <Secao titulo="Dependentes">
                {dados.dependentes.map((d: any, idx: number) => (
                  <Campo
                    key={idx}
                    label={d.parentesco || 'Dependente'}
                    valor={d.nome}
                    extra={d.dataNascimento ? formatDate(d.dataNascimento) : undefined}
                  />
                ))}
              </Secao>
            )}

            <Secao titulo="Saúde do Trabalhador (ASO / RDC 430)">
              <Campo label="Exame Admissional" valor={formatDate(dados.dataExameAdmissional)} />
              <Campo label="Último Exame Periódico" valor={formatDate(dados.dataUltimoExameOcupacional)} />
              <Campo label="Vencimento do Exame" valor={formatDate(dados.dataVencimentoExame)} />
              <Campo label="Resultado do ASO" valor={dados.asoResultado} />
              <Campo label="Clínica Médica" valor={dados.clinicaMedica} />
              <Campo label="Médico Emitente" valor={dados.asoMedicoEmitente} extra={dados.asoCrmMedico ? `CRM ${dados.asoCrmMedico}` : undefined} />
            </Secao>

            {Array.isArray(dados.documentos) && dados.documentos.length > 0 && (
              <Secao titulo="Checklist de Documentação">
                {dados.documentos.map((d: any, idx: number) => (
                  <Campo key={idx} label={d.tipo} valor={d.status} />
                ))}
              </Secao>
            )}

            <PrintDocumentFooter />
          </div>
        )}
      </main>
    </div>
  );
};

const Secao: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div className="space-y-2">
    <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 uppercase tracking-wide">
      {titulo}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">{children}</div>
  </div>
);

const Campo: React.FC<{ label: string; valor?: string | null; extra?: string }> = ({ label, valor, extra }) => {
  if (!valor) return null;
  return (
    <div>
      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="block text-slate-900 font-medium">
        {valor}
        {extra ? <span className="text-slate-400 font-normal"> — {extra}</span> : null}
      </span>
    </div>
  );
};
