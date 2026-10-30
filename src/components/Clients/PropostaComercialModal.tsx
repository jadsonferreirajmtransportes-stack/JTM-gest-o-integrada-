import React, { useEffect, useState } from 'react';
import { X, Printer, AlertTriangle } from 'lucide-react';
import { Cliente, CustoExtraTarifa, TabelaPrecoFrete } from '../../types';
import { agruparPorFaixa } from './tabelaFreteExcel';
import { formatCurrency } from '../../utils/formatters';
import { JmtLogo } from '../Brand/JmtLogo';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';
import { EMPRESA_REGULAMENTO } from '../../data/regulamentoInterno';

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
  if (!valor) return 'Sob consulta';
  if (tipoCobranca === 'Valor/KM') return `${formatCurrency(valor)}/km`;
  return formatCurrency(valor);
}

const COMO_COBRA: Record<string, string> = {
  'Valor fechado': 'Valor fechado',
  'Valor/KM': 'Por km rodado',
  'Serviço avulso': 'Por serviço',
};

/** Tarifário tem preço de verdade (tarifa base, ad valorem ou tabela por cidade). */
function temPreco(t?: TabelaPrecoFrete): t is TabelaPrecoFrete {
  return !!t && !!(t.valorBase || t.percentualAdValoremNF || t.tarifasPorCidade?.length || t.custosExtras?.length);
}

/** Valor mais comum de uma lista (ex.: prazo da faixa). */
/** Prazo da faixa: um só quando todas as cidades têm o mesmo; senão os prazos que existem
 *  (ex.: "24HS / 48HS") — o prazo de cada cidade fica no Anexo I. */
function prazosDaFaixa(valores: (string | undefined)[]): string | undefined {
  const distintos = Array.from(new Set(valores.map((v) => v?.trim()).filter(Boolean))) as string[];
  return distintos.length ? distintos.join(' / ') : undefined;
}

/** Uma parte da seção 5 — um tarifário (Aéreo, Rodoviário ou o único do cliente). */
const BlocoTarifario: React.FC<{ titulo?: string; tabela: TabelaPrecoFrete; incluirDedicada: boolean; incluirFracionada: boolean }> = ({
  titulo,
  tabela: t,
  incluirDedicada,
  incluirFracionada,
}) => {
  const adValorem = t.modeloPrecificacao === 'ad_valorem';
  const faixas = agruparPorFaixa(t.tarifasPorCidade || []);
  const extras = (t.custosExtras || []).filter((c) => incluirDedicada || !normalizeKey(c.categoria).includes('dedicado'));
  const categorias = Array.from(new Set(extras.map((c) => c.categoria || 'Outros')));
  const condicoes = (t.observacoesTarifa || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <div className="mb-4">
      {titulo && <h4 className="jmt-proposta-subtitle font-bold text-[#92611F] text-[13px] mt-3 mb-1.5 uppercase tracking-wide">{titulo}</h4>}
      {adValorem ? (
        <div className="jmt-proposta-callout mb-2">
          Será aplicado o percentual de <strong>{t.percentualAdValoremNF ?? 0}%</strong> sobre o valor de cada Nota Fiscal transportada.
        </div>
      ) : incluirFracionada && faixas.length > 0 ? (
        <>
          <p className="mb-1.5">Modalidade Fracionada — tarifa por faixa de distância (até 10 kg + valor por kg excedente):</p>
          <table className="jmt-proposta-table mb-2">
            <thead>
              <tr>
                <th>Faixa</th>
                <th>Até 10 kg</th>
                <th>Kg excedente</th>
                <th>Prazo</th>
                <th>Cidades</th>
              </tr>
            </thead>
            <tbody>
              {faixas.map(({ faixa, cidades }) => {
                const v10 = cidades.map((c) => c.valorAte10Kg);
                const vExc = cidades.map((c) => c.valorKgExcedente);
                const iguais = (l: number[]) => l.every((x) => x === l[0]);
                return (
                  <tr key={faixa}>
                    <td>{faixa}</td>
                    <td>{iguais(v10) ? formatCurrency(v10[0]) : `a partir de ${formatCurrency(Math.min(...v10))}`}</td>
                    <td>{iguais(vExc) ? formatCurrency(vExc[0]) : `a partir de ${formatCurrency(Math.min(...vExc))}`}</td>
                    <td>{prazosDaFaixa(cidades.map((c) => c.prazo)) || '—'}</td>
                    <td>{cidades.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : incluirFracionada && t.valorBase ? (
        <p className="mb-2">
          Modalidade Fracionada: tarifa de <strong>{formatCurrency(t.valorBase)}</strong> até 10 kg
          {t.valorKgExcedente ? `, acrescida de ${formatCurrency(t.valorKgExcedente)} por kg excedente` : ''}.
        </p>
      ) : null}

      {(t.freteMinimo || t.taxaDescargaAjudante || t.percentualGrisPedagio) ? (
        <ul className="list-disc pl-5 space-y-0.5 mb-2">
          {!!t.freteMinimo && <li>Frete mínimo por entrega: <strong>{formatCurrency(t.freteMinimo)}</strong>.</li>}
          {!!t.taxaDescargaAjudante && <li>Descarga / ajudante: <strong>{formatCurrency(t.taxaDescargaAjudante)}</strong>.</li>}
          {!!t.percentualGrisPedagio && <li>GRIS / pedágio: <strong>{t.percentualGrisPedagio}%</strong>.</li>}
        </ul>
      ) : null}

      {extras.length > 0 && (
        <>
          <p className="mb-1.5">Custos extras e encargos — cobrados além do frete, somente quando o serviço é utilizado:</p>
          <table className="jmt-proposta-table mb-2">
            <thead>
              <tr>
                <th>Item</th>
                <th>Como é cobrado</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat) => (
                <React.Fragment key={cat}>
                  <tr>
                    <td colSpan={3} className="jmt-proposta-table-group font-bold text-[#92611F] bg-[#F4EEE1]">{cat}</td>
                  </tr>
                  {extras
                    .filter((c) => (c.categoria || 'Outros') === cat)
                    .map((c: CustoExtraTarifa) => (
                      <tr key={c.id}>
                        <td>
                          {c.itemDescricao || c.categoria}
                          {c.grupoDestinatario ? ` (${c.grupoDestinatario})` : ''}
                        </td>
                        <td>{COMO_COBRA[c.tipoCobranca] || c.tipoCobranca}</td>
                        <td>{formatValorCustoExtra(c.tipoCobranca, c.valor)}</td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}

      {condicoes.length > 0 && (
        <>
          <p className="mb-1 font-semibold text-slate-900">Condições:</p>
          <ul className="list-disc pl-5 space-y-0.5 text-[12px]">
            {condicoes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

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
  // Um bloco por tarifário: o do cliente e, quando cobra diferente por modal (ex.: LUFT), o Rodoviário.
  const tarifarios: { titulo?: string; tabela: TabelaPrecoFrete }[] = temPreco(cliente.tabelaFreteRodoviario)
    ? [
        ...(temPreco(tf) ? [{ titulo: 'Tarifário Aéreo', tabela: tf }] : []),
        { titulo: 'Tarifário Rodoviário', tabela: cliente.tabelaFreteRodoviario as TabelaPrecoFrete },
      ]
    : temPreco(tf)
      ? [{ tabela: tf }]
      : [];
  // Estado onde a JMT faz as entregas (não o endereço do cliente, que pode ser de outro estado):
  // a UF mais comum nas cidades do tarifário; sem UF nelas, o estado da própria JMT.
  const contagemUf = new Map<string, number>();
  tarifarios.forEach(({ tabela }) =>
    (tabela.tarifasPorCidade || []).forEach((t) => {
      const u = (t.uf || '').trim().toUpperCase();
      if (NOMES_ESTADOS[u]) contagemUf.set(u, (contagemUf.get(u) || 0) + 1);
    })
  );
  const uf = Array.from(contagemUf.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || extrairUF(EMPRESA_REGULAMENTO.cidadeUF);
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

  const tarifaSemInfo = tarifarios.length === 0;

  // Anexo I: cidades da tabela principal agrupadas por faixa (os valores de cada faixa estão na seção 5).
  const tabelaCidades = (tf?.tarifasPorCidade?.length ? tf.tarifasPorCidade : cliente.tabelaFreteRodoviario?.tarifasPorCidade) || [];
  const faixasAnexo = agruparPorFaixa(tabelaCidades.filter((t) => t.cidade));
  const cidadesAnexo = tabelaCidades.map((t) => t.cidade).filter(Boolean);

  // Rotas e prazos: as praças cadastradas + o interior pelos prazos da tabela de frete (cidades
  // com prazo diferente do das praças), para a proposta não falar só da capital.
  const prazoLegivel = (p: string) => {
    const m = p.trim().match(/^(\d+)\s*(H|HS|HR|HRS|HORAS?)$/i);
    return m ? `${m[1]} horas` : p.trim();
  };
  const chavePrazo = (p?: string) => prazoLegivel(p || '').toLowerCase().replace(/\s+/g, '');
  const regioes = cliente.regioesAtendidas || [];
  const prazosDasPracas = new Set(regioes.map((r) => chavePrazo(r.prazoLeadTime)));
  const temInteriorCadastrado = regioes.some((r) => /interior/i.test(r.cidadeUF || ''));
  const interiorPorPrazo = new Map<string, { prazo: string; cidades: number }>();
  if (!temInteriorCadastrado)
    tabelaCidades.forEach((t) => {
      if (!t.cidade || !t.prazo?.trim()) return;
      const k = chavePrazo(t.prazo);
      if (regioes.length && prazosDasPracas.has(k)) return;
      const g = interiorPorPrazo.get(k) || { prazo: prazoLegivel(t.prazo), cidades: 0 };
      g.cidades += 1;
      interiorPorPrazo.set(k, g);
    });
  const linhasInterior = Array.from(interiorPorPrazo.values()).sort((a, b) => (parseInt(a.prazo) || 999) - (parseInt(b.prazo) || 999));
  const ufRotulo = uf ? ` / ${uf}` : '';

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
          <div className="max-w-[750px] mx-auto p-8 text-[13px] leading-relaxed text-slate-800 [&_p]:text-justify [&_li]:text-justify">
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
              {tarifarios.length > 1 && (
                <li>
                  <strong>Modais Aéreo e Rodoviário</strong> — cada um com tarifário próprio, detalhado na seção 5.
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
                {linhasInterior.map((g) => (
                  <li key={g.prazo}>
                    <strong>Interior{ufRotulo}</strong> — entregas realizadas em até {g.prazo} ({g.cidades} cidade{g.cidades === 1 ? '' : 's'}, conforme o Anexo I).
                  </li>
                ))}
                {!temInteriorCadastrado && linhasInterior.length === 0 && cidadesAnexo.length > 0 && (
                  <li>
                    <strong>Interior{ufRotulo}</strong> — entregas realizadas conforme o prazo de cada cidade (Anexo I).
                  </li>
                )}
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
              <li>Comprovações realizadas via aplicativo de TMS no ato da entrega.</li>
              <li>Equipe de escritório à disposição para fornecer status de entregas e demais tratativas operacionais.</li>
              <li>Comprovantes físicos enviados ao cliente até a 1ª quinzena do mês subsequente.</li>
            </ul>

            {/* 5. Estrutura de Custos */}
            <SectionHead n={5}>Estrutura de Custos — Tabela de Fretes</SectionHead>
            {tarifaSemInfo ? (
              <p className="text-slate-400 italic">
                Tabela de Frete do cliente ainda não preenchida — edite o cadastro para completar esta seção.
              </p>
            ) : (
              <>
                {tarifarios.map((tar) => (
                  <BlocoTarifario
                    key={tar.titulo || 'unico'}
                    titulo={tar.titulo}
                    tabela={tar.tabela}
                    incluirDedicada={incluirDedicada}
                    incluirFracionada={incluirFracionada}
                  />
                ))}
                {cidadesAnexo.length > 0 && (
                  <p className="text-[11.5px] text-slate-500 italic">A relação das cidades de cada faixa, com distância e prazo, consta no Anexo I.</p>
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
                    Anexo I — Cidades Atendidas por Faixa{nomeEstadoPlano ? ` (${nomeEstadoPlano})` : ''}
                  </h3>
                </div>
                {faixasAnexo.map(({ faixa, cidades }) => (
                  <div key={faixa} className="mt-3 break-inside-avoid-page">
                    <div className="font-bold text-[#92611F] text-[11.5px] uppercase">
                      {faixa} — {cidades.length} cidade(s)
                    </div>
                    <table className="jmt-proposta-table mt-1">
                      <thead>
                        <tr>
                          <th>Cidade</th>
                          <th>UF</th>
                          <th>Km</th>
                          <th>Prazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cidades.map((c) => (
                          <tr key={c.id}>
                            <td>{c.cidade}</td>
                            <td>{c.uf || '—'}</td>
                            <td>{c.distanciaKm ?? '—'}</td>
                            <td>{c.prazo || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
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
