import React, { useEffect, useState } from 'react';
import { X, Printer, AlertTriangle } from 'lucide-react';
import { Cliente } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { JmtLogo } from '../Brand/JmtLogo';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';

interface PropostaComercialModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

/** Nome do estado já com a preposição/artigo corretos para a frase "no estado {valor}"
 *  — a concordância (do/da/de) em português não segue uma regra única, por isso o mapa
 *  guarda a forma completa em vez de tentar derivá-la (ex.: "de Alagoas", "do Ceará"). */
const NOMES_ESTADOS: Record<string, string> = {
  AC: 'do Acre', AL: 'de Alagoas', AP: 'do Amapá', AM: 'do Amazonas', BA: 'da Bahia',
  CE: 'do Ceará', DF: 'do Distrito Federal', ES: 'do Espírito Santo', GO: 'de Goiás',
  MA: 'do Maranhão', MT: 'do Mato Grosso', MS: 'do Mato Grosso do Sul', MG: 'de Minas Gerais',
  PA: 'do Pará', PB: 'da Paraíba', PR: 'do Paraná', PE: 'de Pernambuco', PI: 'do Piauí',
  RJ: 'do Rio de Janeiro', RN: 'do Rio Grande do Norte', RS: 'do Rio Grande do Sul',
  RO: 'de Rondônia', RR: 'de Roraima', SC: 'de Santa Catarina', SP: 'de São Paulo',
  SE: 'de Sergipe', TO: 'do Tocantins',
};

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatDataExtenso(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function extrairUF(cidadeUF: string): string | undefined {
  const m = cidadeUF.trim().match(/([A-Z]{2})\s*$/);
  return m ? m[1] : undefined;
}

function normalizeKey(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function formatValorCustoExtra(tipoCobranca: string, valor: number): string {
  if (tipoCobranca === 'Valor/KM') return `${formatCurrency(valor)}/km`;
  if (tipoCobranca === 'Serviço avulso') return 'Sob consulta';
  return formatCurrency(valor);
}

const SectionHead: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <div className="jmt-proposta-section-head">
    <span className="jmt-proposta-section-num">{n}</span>
    <h3 className="jmt-proposta-section-title">{children}</h3>
  </div>
);

/**
 * Gera a Proposta Comercial no mesmo padrão dos documentos já elaborados pela JMT
 * (ver pasta 06_Comercial/Propostas) — cabeçalho com logo, seções numeradas em
 * dourado, tabela de custos e aceite com assinaturas. A seção 5 (Estrutura de
 * Custos) é preenchida automaticamente a partir da Tabela de Frete do cliente
 * (% Ad Valorem, tarifa base + kg excedente, ou tabela de veículo dedicado).
 */
export const PropostaComercialModal: React.FC<PropostaComercialModalProps> = ({
  isOpen,
  onClose,
  cliente,
}) => {
  const [contatoAC, setContatoAC] = useState('');
  const [incluirDedicada, setIncluirDedicada] = useState(true);
  const [incluirFracionada, setIncluirFracionada] = useState(true);
  const [observacoesAdicionais, setObservacoesAdicionais] = useState('');

  useEffect(() => {
    if (cliente) {
      const principal = cliente.contatos?.find((c) => c.principal) || cliente.contatos?.[0];
      setContatoAC(principal?.nome || '');
      setIncluirDedicada(true);
      setIncluirFracionada(true);
      setObservacoesAdicionais('');
    }
  }, [cliente?.id, isOpen]);

  if (!isOpen || !cliente) return null;

  const tf = cliente.tabelaFrete;
  const isAdValorem = tf?.modeloPrecificacao === 'ad_valorem';
  const uf = extrairUF(cliente.cidadeUF || '');
  const nomeEstado = uf ? NOMES_ESTADOS[uf] : undefined;
  // Forma sem preposição, para uso em rótulos/parênteses (ex.: "(Rio Grande do Norte)").
  const nomeEstadoPlano = nomeEstado?.replace(/^(do|da|de)\s+/, '');
  const dataExtenso = formatDataExtenso(new Date());
  const nomeExibicao = cliente.nomeFantasia || cliente.razaoSocial;
  const primeiroNome = contatoAC.trim() ? contatoAC.trim().split(' ')[0] : '';
  const saudacao = primeiroNome ? `Prezado(a) ${primeiroNome},` : 'Prezados(as),';

  const contatos = [cliente.emailPrincipal, ...(cliente.contatos || []).map((c) => c.email)].filter(
    (v, i, arr) => v && arr.indexOf(v) === i
  );
  const telefones = [cliente.telefonePrincipal, ...(cliente.contatos || []).map((c) => c.telefoneWhatsapp)].filter(
    (v, i, arr) => v && arr.indexOf(v) === i
  );

  const custosDedicado = (tf?.custosExtras || []).filter(
    (c) => normalizeKey(c.categoria).includes('dedicado') || normalizeKey(c.grupoDestinatario || '').includes('dedicado')
  );
  const tarifaSemInfo = !isAdValorem && !tf?.valorBase && custosDedicado.length === 0;

  const cidadesAnexo = (tf?.tarifasPorCidade || []).map((t) => t.cidade).filter(Boolean);

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header do modal (não imprime) */}
        <div className="print:hidden px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Proposta Comercial — {nomeExibicao}</h2>
            <p className="text-xs text-slate-500">
              Gerada automaticamente a partir do cadastro do cliente. Revise antes de enviar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Campos editáveis rápidos (não imprime) */}
        <div className="print:hidden px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0 space-y-2">
          {tarifaSemInfo && (
            <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                A Tabela de Frete deste cliente ainda não está preenchida — a seção "Estrutura de Custos" vai sair
                em branco. Edite o cadastro do cliente para preencher os valores e gere a proposta novamente.
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">A/C (contato na proposta)</label>
              <input
                type="text"
                value={contatoAC}
                onChange={(e) => setContatoAC(e.target.value)}
                placeholder="Representante Legal"
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 w-56 focus:outline-hidden focus:border-[#C48229]"
              />
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={incluirFracionada}
                onChange={(e) => setIncluirFracionada(e.target.checked)}
                className="rounded border-slate-300 text-[#C48229] focus:ring-0 bg-white"
              />
              Modalidade Fracionada
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={incluirDedicada}
                onChange={(e) => setIncluirDedicada(e.target.checked)}
                className="rounded border-slate-300 text-[#C48229] focus:ring-0 bg-white"
              />
              Modalidade Dedicada
            </label>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Observações adicionais (opcional — entram antes das considerações finais)
            </label>
            <textarea
              rows={2}
              value={observacoesAdicionais}
              onChange={(e) => setObservacoesAdicionais(e.target.value)}
              placeholder="Ex: condições especiais combinadas nesta negociação..."
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#C48229]"
            />
          </div>
        </div>

        {/* Documento — visual idêntico em tela e impressão */}
        <div className="jmt-print-doc jmt-print-styled flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[750px] mx-auto p-8 text-[13px] leading-relaxed text-slate-800">
            {/* Cabeçalho */}
            <div className="flex items-start gap-4 pb-3 mb-4 border-b-2 border-[#C48229]">
              <JmtLogo variant="full" theme="light" iconSize={30} />
              <div className="flex-1 text-right">
                <h1 className="text-lg font-bold text-slate-900">PROPOSTA COMERCIAL</h1>
                <div className="text-[11.5px] font-semibold text-[#C48229] mt-0.5">
                  {cliente.razaoSocial.toUpperCase()} | {dataExtenso}
                </div>
              </div>
            </div>

            {/* Card de dados do cliente */}
            <div className="jmt-proposta-info-card mb-4">
              <div className="font-bold text-slate-900 text-[13px]">
                {cliente.razaoSocial}
                {cliente.nomeFantasia && cliente.nomeFantasia !== cliente.razaoSocial && (
                  <span className="font-normal text-slate-600"> (Nome Fantasia: {cliente.nomeFantasia})</span>
                )}
              </div>
              <div className="text-[11.5px] text-slate-700 mt-1 space-y-0.5">
                <div>
                  <strong>CNPJ:</strong> {cliente.cnpj || '—'}
                  {cliente.inscricaoEstadual && (
                    <>
                      {'   '}
                      <strong>Insc. Estadual:</strong> {cliente.inscricaoEstadual}
                    </>
                  )}
                </div>
                {cliente.enderecoCompleto && (
                  <div>
                    <strong>Endereço:</strong> {cliente.enderecoCompleto}
                    {cliente.cidadeUF ? `, ${cliente.cidadeUF}` : ''}
                    {cliente.cep ? `, CEP ${cliente.cep}` : ''}
                  </div>
                )}
                {(contatos.length > 0 || telefones.length > 0) && (
                  <div>
                    <strong>Contato:</strong> {[...contatos, ...telefones].join(' · ')}
                  </div>
                )}
                <div>
                  <strong>A/C:</strong> {contatoAC.trim() || 'Representante Legal'}
                </div>
              </div>
            </div>

            {/* 1. Introdução */}
            <SectionHead n={1}>Introdução e Objetivo</SectionHead>
            <p className="mb-2">{saudacao}</p>
            <p className="mb-2">
              A Jobson de Moraes Transportes LTDA (JM Transportes) tem a satisfação de apresentar esta proposta
              comercial, que objetiva o estreitamento de uma parceria sólida e duradoura para viabilizar as entregas
              de {nomeExibicao}
              {nomeEstado ? ` no estado ${nomeEstado}` : ''}.
            </p>
            <p>
              Como empresa especializada em logística de produtos para a saúde e bens de consumo, a JM Transportes
              reúne a estrutura, os processos padronizados e a experiência necessários para garantir segurança,
              pontualidade e rastreabilidade em cada etapa da operação, com plena satisfação do cliente.
            </p>

            {/* 2. Modalidades */}
            <SectionHead n={2}>Modalidades Atendidas</SectionHead>
            <ul className="list-disc pl-5 space-y-1">
              {incluirFracionada && (
                <li>
                  <strong>Entrega Fracionada</strong> — a carga é roteirizada em veículo compartilhado, seguindo em
                  rota com cargas de outros clientes.
                </li>
              )}
              {incluirDedicada && (
                <li>
                  <strong>Entrega Dedicada</strong> — a carga é roteirizada em veículo exclusivo, sem
                  compartilhamento com outros clientes.
                </li>
              )}
              {!incluirFracionada && !incluirDedicada && (
                <li className="text-slate-400">Nenhuma modalidade selecionada — marque acima.</li>
              )}
            </ul>

            {/* 3. Rotas e Prazos */}
            <SectionHead n={3}>Rotas e Prazos</SectionHead>
            {cliente.regioesAtendidas && cliente.regioesAtendidas.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {cliente.regioesAtendidas.map((r, idx) => (
                  <li key={idx}>
                    <strong>{r.cidadeUF}</strong> — entregas realizadas em até {r.prazoLeadTime} (frequência:{' '}
                    {r.frequencia}).
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Capital</strong> — entregas realizadas em até 24 horas após a coleta e/ou recebimento.
                </li>
                <li>
                  <strong>Interior</strong> — entregas realizadas em até 48 horas após a coleta e/ou recebimento.
                </li>
              </ul>
            )}
            {cidadesAnexo.length > 0 && (
              <p className="text-[11.5px] text-slate-500 italic mt-1">
                Obs.: relação completa das cidades atendidas disponível no Anexo I.
              </p>
            )}

            {/* 4. Comprovações */}
            <SectionHead n={4}>Comprovações e Documentação</SectionHead>
            <ul className="list-disc pl-5 space-y-1">
              <li>Comprovações realizadas via aplicativo de TMS (Azapfy) no ato da entrega.</li>
              <li>Equipe de escritório à disposição para fornecer status de entregas e demais tratativas operacionais.</li>
              <li>Comprovantes físicos enviados ao cliente até a 1ª quinzena do mês subsequente.</li>
            </ul>

            {/* 5. Estrutura de Custos */}
            <SectionHead n={5}>Estrutura de Custos — Tabela de Fretes</SectionHead>
            {tarifaSemInfo ? (
              <p className="text-slate-400 italic">
                Tabela de Frete do cliente ainda não preenchida — edite o cadastro para completar esta seção.
              </p>
            ) : isAdValorem ? (
              <div className="jmt-proposta-callout">
                Será aplicado o percentual de <strong>{tf?.percentualAdValoremNF ?? 0}%</strong> sobre o valor de
                cada Nota Fiscal transportada.
                {tf?.freteMinimo ? ` Aplica-se frete mínimo de ${formatCurrency(tf.freteMinimo)} por entrega.` : ''}
              </div>
            ) : (
              <>
                {!!tf?.valorBase && (
                  <p className="mb-2">
                    Para a modalidade Fracionada, será aplicada a tarifa de{' '}
                    <strong>{formatCurrency(tf.valorBase)}</strong> até 10kg
                    {tf.valorKgExcedente
                      ? `, acrescida de ${formatCurrency(tf.valorKgExcedente)} por kg excedente`
                      : ''}
                    .{cidadesAnexo.length > 0 ? ' Tarifas específicas por praça constam no Anexo I.' : ''}
                  </p>
                )}
                {custosDedicado.length > 0 && (
                  <>
                    <p className="mb-1.5">
                      Para a modalidade Dedicada, quando solicitada, aplicam-se os valores fixos abaixo:
                    </p>
                    <table className="jmt-proposta-table">
                      <thead>
                        <tr>
                          <th>Tipo de Veículo</th>
                          <th>Custo Dedicado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custosDedicado.map((c) => (
                          <tr key={c.id}>
                            <td>{c.itemDescricao || c.categoria}</td>
                            <td>{formatValorCustoExtra(c.tipoCobranca, c.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}

            {/* 6. Faturamento */}
            <SectionHead n={6}>Faturamento e Pagamento</SectionHead>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Período de faturamento:</strong> {tf?.condicaoPagamento || 'a combinar'}
                {tf?.diaFechamento ? `, com fechamento no dia ${tf.diaFechamento}` : ''}.
              </li>
              <li>
                <strong>Reajuste:</strong> anual, conforme índice de mercado a ser acordado entre as partes.
              </li>
            </ul>

            {/* 7. Condições da carga */}
            <SectionHead n={7}>Condições da Carga</SectionHead>
            <p className="mb-2">
              A carga deve ser devidamente embalada e identificada pelo cliente, a fim de garantir a segurança e a
              rastreabilidade durante todo o transporte.
            </p>
            <div className="jmt-proposta-callout">
              <div className="font-bold text-slate-900 mb-1">Requisitos fiscais obrigatórios:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  A Nota Fiscal Eletrônica (NF-e) de cada remessa deverá indicar a{' '}
                  <strong>Jobson de Moraes Transportes LTDA</strong> no campo Transportador/Redespacho, com os dados
                  cadastrais da JM Transportes.
                </li>
                <li>
                  O arquivo <strong>XML</strong> de cada NF-e transportada deverá ser disponibilizado à JM
                  Transportes previamente à coleta, viabilizando a emissão do CT-e e o correto acompanhamento
                  fiscal e operacional da carga.
                </li>
              </ul>
            </div>

            {/* 8. Considerações finais */}
            <SectionHead n={8}>Considerações Finais</SectionHead>
            <p className="mb-2">
              A JM Transportes reafirma seu compromisso com a excelência operacional, sustentado por processos
              padronizados, gestão por indicadores e rígido controle da cadeia de custódia dos materiais
              transportados. Nosso nível de serviço é orientado por SLA claros de prazo e pontualidade, com
              transparência total na comunicação com o cliente.
            </p>
            {observacoesAdicionais.trim() && <p className="mb-2">{observacoesAdicionais.trim()}</p>}
            <p>
              Agradecemos a confiança depositada e colocamo-nos à inteira disposição para dar início a este projeto
              logístico em parceria com {nomeExibicao}.
            </p>

            {/* 9. Aceite */}
            <SectionHead n={9}>Aceite da Proposta</SectionHead>
            <p className="mb-8">
              Para formalizar o aceite desta proposta, solicitamos a assinatura do representante legal da
              Contratante abaixo.
            </p>
            <div className="grid grid-cols-2 gap-8 text-[11.5px]">
              <div className="border-t border-slate-400 pt-1.5 text-center">
                <div className="font-bold text-slate-900">Jobson de Moraes Transportes LTDA</div>
                <div className="text-[#C48229] font-semibold">Jobson de Moraes — Diretor</div>
              </div>
              <div className="border-t border-slate-400 pt-1.5 text-center">
                <div className="font-bold text-slate-900">{cliente.razaoSocial}</div>
                <div className="text-[#C48229] font-semibold">{contatoAC.trim() || 'Representante Legal'}</div>
              </div>
            </div>

            {/* Anexo I — Cidades Atendidas */}
            {cidadesAnexo.length > 0 && (
              <>
                <div className="mt-10 pt-3 border-t-2 border-[#C48229]">
                  <h3 className="font-bold text-slate-900 text-[13px]">
                    Anexo I — Cidades Atendidas{nomeEstadoPlano ? ` (${nomeEstadoPlano})` : ''}
                  </h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-3 gap-y-1 text-[11px] text-slate-700 mt-2">
                  {cidadesAnexo.map((cidade, idx) => (
                    <div key={idx}>{cidade}</div>
                  ))}
                </div>
              </>
            )}

            {/* Rodapé institucional */}
            <div className="mt-10 pt-3 border-t border-slate-200 text-center text-[9.5px] font-semibold text-[#C48229]">
              {STRATEGIC_GUIDELINES.assinatura}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
