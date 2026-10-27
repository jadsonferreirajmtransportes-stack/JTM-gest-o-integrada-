import React, { useMemo, useState } from 'react';
import { X, Calculator, Copy, CheckCircle2, AlertTriangle, Plane, Truck, Clock, MapPin, Plus, Trash2, Package, Car } from 'lucide-react';
import { Cliente, CustoExtraTarifa } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { LinhaValorACobrar, detalharTarifaPorPeso, normalizeCidade, tabelaFreteParaModal } from '../FarmaAereo/faturamentoAereoUtils';

interface Volume {
  id: string;
  quantidade: number;
  comprimento: number; // cm
  largura: number;
  altura: number;
}

const numero = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Calculadora de frete para a equipe: escolhe o cliente, o modal, a cidade de destino e o peso
 *  e vê o frete pela TABELA DO CLIENTE — o mesmo cálculo do "Valor a Cobrar" do Controle
 *  Financeiro (detalharTarifaPorPeso), para a cotação bater com a cobrança. Peso cubado e custos
 *  extras são opcionais e aparecem separados no detalhamento. */
export const CalculadoraFreteModal: React.FC<{ clientes: Cliente[]; clienteInicialId?: string; onClose: () => void }> = ({ clientes, clienteInicialId, onClose }) => {
  const comTabela = useMemo(
    () =>
      clientes
        .filter((c) => c.tabelaFrete || c.tabelaFreteRodoviario)
        .sort((a, b) => (a.nomeFantasia || a.razaoSocial).localeCompare(b.nomeFantasia || b.razaoSocial)),
    [clientes]
  );
  const [clienteId, setClienteId] = useState(clienteInicialId && comTabela.some((c) => c.id === clienteInicialId) ? clienteInicialId : '');
  const [modal, setModal] = useState<'Aéreo' | 'Rodoviário'>('Aéreo');
  const [cidade, setCidade] = useState('');
  const [peso, setPeso] = useState('');
  const [valorNF, setValorNF] = useState('');
  const [usarCubagem, setUsarCubagem] = useState(false);
  const [fatorCubagem, setFatorCubagem] = useState('300');
  const [volumes, setVolumes] = useState<Volume[]>([{ id: 'v1', quantidade: 1, comprimento: 0, largura: 0, altura: 0 }]);
  const [extrasMarcados, setExtrasMarcados] = useState<Set<string>>(new Set());
  const [incluirGris, setIncluirGris] = useState(false);
  const [incluirDescarga, setIncluirDescarga] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // Dedicado por km: veículo (tarifa "Valor/KM" da tabela do cliente ou valor digitado) × km da rota.
  const [modo, setModo] = useState<'fracionado' | 'dedicado'>('fracionado');
  const [veiculoId, setVeiculoId] = useState('');
  const [valorKmManual, setValorKmManual] = useState('');
  const [km, setKm] = useState('');
  const [idaEVolta, setIdaEVolta] = useState(false);
  const [pedagio, setPedagio] = useState('');

  const cliente = comTabela.find((c) => c.id === clienteId);
  const temRodoviarioProprio = !!cliente?.tabelaFreteRodoviario;
  const tabela = tabelaFreteParaModal(cliente, modal);
  const cidades = tabela?.tarifasPorCidade ?? [];
  const tarifaCidade = cidade ? cidades.find((t) => normalizeCidade(t.cidade) === normalizeCidade(cidade)) : undefined;

  // Peso considerado: o maior entre o real e o cubado (quando a cubagem está ligada).
  const pesoReal = numero(peso);
  const m3 = volumes.reduce((s, v) => s + (v.quantidade || 0) * ((v.comprimento || 0) * (v.largura || 0) * (v.altura || 0)) / 1_000_000, 0);
  const pesoCubado = usarCubagem ? m3 * numero(fatorCubagem) : 0;
  const pesoCalculo = Math.max(pesoReal, pesoCubado);
  const nf = numero(valorNF);

  // Tarifas por km (veículos do dedicado) ficam no modo Dedicado; os demais extras valem nos dois modos.
  const veiculosKm: CustoExtraTarifa[] = (tabela?.custosExtras ?? []).filter((c) => c.tipoCobranca === 'Valor/KM' && c.valor > 0);
  const custosExtras: CustoExtraTarifa[] = (tabela?.custosExtras ?? []).filter((c) => c.tipoCobranca !== 'Valor/KM');
  const valorDoExtra = (c: CustoExtraTarifa) => c.valor;
  const nomeExtra = (c: CustoExtraTarifa) => [c.categoria, c.grupoDestinatario, c.itemDescricao].filter(Boolean).join(' — ');
  const veiculo = veiculosKm.find((c) => c.id === veiculoId);
  const valorKm = veiculoId === 'manual' ? numero(valorKmManual) : veiculo?.valor ?? 0;
  const kmRota = numero(km) || tarifaCidade?.distanciaKm || 0;
  const kmTotal = kmRota * (idaEVolta ? 2 : 1);
  const valorPedagio = numero(pedagio);

  const resultado = useMemo(() => {
    if (!cliente || !tabela) return null;
    const extrasMarcadosLinhas = (): LinhaValorACobrar[] => {
      const l: LinhaValorACobrar[] = custosExtras.filter((c) => extrasMarcados.has(c.id)).map((c) => ({ label: nomeExtra(c), valor: valorDoExtra(c) }));
      if (incluirDescarga && tabela.taxaDescargaAjudante) l.push({ label: 'Descarga / ajudante', valor: tabela.taxaDescargaAjudante });
      if (incluirGris && tabela.percentualGrisPedagio && nf) l.push({ label: `GRIS / pedágio (${tabela.percentualGrisPedagio}% sobre a NF de ${formatCurrency(nf)})`, valor: (tabela.percentualGrisPedagio / 100) * nf });
      return l;
    };
    if (modo === 'dedicado') {
      if (!valorKm || !kmTotal) return null;
      const nomeVeiculo = veiculoId === 'manual' ? 'Dedicado' : `Dedicado ${veiculo?.itemDescricao || nomeExtra(veiculo!)}`;
      const linhas: LinhaValorACobrar[] = [
        {
          label: `${nomeVeiculo} — ${kmTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km${idaEVolta ? ` (ida e volta: ${kmRota} × 2)` : ''} × ${formatCurrency(valorKm)}/km`,
          valor: kmTotal * valorKm,
        },
      ];
      if (valorPedagio) linhas.push({ label: 'Pedágio', valor: valorPedagio });
      linhas.push(...extrasMarcadosLinhas());
      return { linhas, total: linhas.reduce((s, l) => s + l.valor, 0) };
    }
    const base = detalharTarifaPorPeso({ cidadeDestino: cidade, pesoKg: pesoCalculo, valorNF: nf || undefined, valorPrestacao: undefined, modal }, cliente);
    if (!base) return null;
    const linhas: LinhaValorACobrar[] = [...base, ...extrasMarcadosLinhas()];
    return { linhas, total: linhas.reduce((s, l) => s + l.valor, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, tabela, cidade, pesoCalculo, nf, modal, extrasMarcados, incluirDescarga, incluirGris, tarifaCidade, modo, valorKm, kmTotal, valorPedagio, veiculoId, idaEVolta]);

  const ehAdValorem = tabela?.modeloPrecificacao === 'ad_valorem' || (!tabela?.modeloPrecificacao && tabela?.tipoCobranca === '% sobre Nota Fiscal (Ad Valorem)');
  const faltando = !cliente
    ? 'Escolha o cliente.'
    : !tabela
      ? 'Este cliente não tem tabela de frete cadastrada.'
      : modo === 'dedicado'
        ? !valorKm
          ? veiculosKm.length
            ? 'Escolha o veículo (ou informe o valor por km).'
            : 'A tabela deste cliente não tem valor por km de veículo — informe o valor por km.'
          : !kmTotal
            ? 'Informe o km da rota (ou escolha a cidade para usar o km da tabela).'
            : null
      : ehAdValorem
        ? !nf
          ? 'Informe o valor da nota fiscal (a tabela é % Ad Valorem).'
          : null
        : cidades.length && !tarifaCidade
          ? cidade
            ? 'Cidade fora da tabela do cliente — confira a grafia ou use a tarifa padrão no cadastro.'
            : 'Escolha a cidade de destino.'
          : !pesoCalculo
            ? 'Informe o peso.'
            : null;

  const resumo = () => {
    if (!resultado || !cliente) return '';
    const linhas = [
      `Cotação de frete — ${cliente.nomeFantasia || cliente.razaoSocial}`,
      `${modo === 'dedicado' ? 'Dedicado por km' : `Modal: ${modal}`}${tarifaCidade ? ` · Destino: ${tarifaCidade.cidade}${tarifaCidade.uf ? `/${tarifaCidade.uf}` : ''}` : cidade ? ` · Destino: ${cidade}` : ''}`,
      ...(modo === 'dedicado' ? [] : [`Peso considerado: ${pesoCalculo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg${pesoCubado > pesoReal ? ' (cubado)' : ''}`]),
      ...resultado.linhas.map((l) => `• ${l.label}: ${formatCurrency(l.valor)}`),
      `Total: ${formatCurrency(resultado.total)}`,
      ...(tarifaCidade?.prazo ? [`Prazo de entrega: ${tarifaCidade.prazo}`] : []),
    ];
    return linhas.join('\n');
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(resumo()).catch(() => undefined);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const campo = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-[#C48229]';
  const rotulo = 'block text-[11px] font-semibold text-slate-600 mb-1';
  const alternarExtra = (id: string) =>
    setExtrasMarcados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#92611F]">
              <Calculator className="w-4 h-4" />
            </span>
            Calculadora de frete
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid md:grid-cols-[1fr_320px]">
          {/* Entradas */}
          <div className="p-5 space-y-4 md:border-r border-slate-100">
            <div>
              <label className={rotulo}>Cliente</label>
              <select
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value);
                  setCidade('');
                  setExtrasMarcados(new Set());
                }}
                className={campo}
              >
                <option value="">Escolha o cliente...</option>
                {comTabela.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeFantasia || c.razaoSocial}
                  </option>
                ))}
              </select>
            </div>

            {cliente && (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['fracionado', 'Fracionado (por peso)', <Package key="f" className="w-3.5 h-3.5" />],
                    ['dedicado', 'Dedicado por km', <Car key="d" className="w-3.5 h-3.5" />],
                  ] as const
                ).map(([m, rotuloModo, icone]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModo(m)}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 normal-case tracking-normal ${modo === m ? 'bg-[#C48229] border-[#C48229] text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    {icone} {rotuloModo}
                  </button>
                ))}
              </div>
            )}

            {modo === 'dedicado' && cliente && (
              <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-3 space-y-3">
                <div>
                  <label className={rotulo}>Veículo</label>
                  <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} className={campo}>
                    <option value="">Escolha o veículo...</option>
                    {veiculosKm.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.itemDescricao || nomeExtra(c)} — {formatCurrency(c.valor)}/km
                      </option>
                    ))}
                    <option value="manual">Outro — informar o valor por km</option>
                  </select>
                  {veiculoId === 'manual' && (
                    <input value={valorKmManual} onChange={(e) => setValorKmManual(e.target.value)} inputMode="decimal" placeholder="Valor por km (R$) — ex.: 3,82" className={`${campo} mt-2`} />
                  )}
                  {!veiculosKm.length && <p className="text-[11px] text-amber-800 mt-1">A tabela deste cliente não tem valor por km de veículo cadastrado — use "Outro".</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={rotulo}>Km da rota</label>
                    <input value={km} onChange={(e) => setKm(e.target.value)} inputMode="decimal" placeholder={tarifaCidade?.distanciaKm ? `${tarifaCidade.distanciaKm} (da cidade)` : 'Ex.: 120'} className={campo} />
                  </div>
                  <div>
                    <label className={rotulo}>Pedágio (R$) <span className="font-normal text-slate-400">(opcional)</span></label>
                    <input value={pedagio} onChange={(e) => setPedagio(e.target.value)} inputMode="decimal" placeholder="0,00" className={campo} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={idaEVolta} onChange={(e) => setIdaEVolta(e.target.checked)} /> Cobrar ida e volta (km × 2)
                </label>
                <p className="text-[11px] text-slate-500">Sem km digitado, usa o km da cidade de destino na tabela do cliente.</p>
              </div>
            )}

            {temRodoviarioProprio && (
              <div className="flex gap-2">
                {(['Aéreo', 'Rodoviário'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setModal(m);
                      setExtrasMarcados(new Set());
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 ${modal === m ? 'bg-amber-50 border-[#C48229] text-[#92611F]' : 'bg-white border-slate-200 text-slate-500'}`}
                  >
                    {m === 'Aéreo' ? <Plane className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />} {m}
                  </button>
                ))}
              </div>
            )}

            {cliente && !ehAdValorem && cidades.length > 0 && (
              <div>
                <label className={rotulo}>Cidade de destino</label>
                <input list="calc-frete-cidades" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Digite para buscar..." className={campo} />
                <datalist id="calc-frete-cidades">
                  {cidades.map((t) => (
                    <option key={t.id} value={t.cidade}>
                      {[t.uf, t.raio, t.distanciaKm ? `${t.distanciaKm} km` : '', t.prazo].filter(Boolean).join(' · ')}
                    </option>
                  ))}
                </datalist>
                {tarifaCidade && (
                  <p className="mt-1.5 text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tarifaCidade.raio}</span>
                    {tarifaCidade.distanciaKm ? <span>{tarifaCidade.distanciaKm} km</span> : null}
                    {tarifaCidade.prazo && <span className="flex items-center gap-1 font-semibold text-[#92611F]"><Clock className="w-3 h-3" /> {tarifaCidade.prazo}</span>}
                  </p>
                )}
              </div>
            )}

            {modo === 'fracionado' && (<>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={rotulo}>Peso real (kg)</label>
                <input value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" placeholder="Ex.: 12,5" className={campo} />
              </div>
              <div>
                <label className={rotulo}>Valor da NF (R$) {ehAdValorem ? '' : <span className="font-normal text-slate-400">(opcional)</span>}</label>
                <input value={valorNF} onChange={(e) => setValorNF(e.target.value)} inputMode="decimal" placeholder="Ex.: 3500" className={campo} />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={usarCubagem} onChange={(e) => setUsarCubagem(e.target.checked)} /> Considerar peso cubado (usa o maior entre o real e o cubado)
              </label>
              {usarCubagem && (
                <>
                  {volumes.map((v, i) => (
                    <div key={v.id} className="grid grid-cols-[60px_1fr_1fr_1fr_auto] gap-1.5 items-center">
                      {(['quantidade', 'comprimento', 'largura', 'altura'] as const).map((k) => (
                        <input
                          key={k}
                          value={v[k] || ''}
                          onChange={(e) => setVolumes((prev) => prev.map((x, j) => (j === i ? { ...x, [k]: numero(e.target.value) } : x)))}
                          inputMode="decimal"
                          placeholder={k === 'quantidade' ? 'Qtd' : k === 'comprimento' ? 'Compr. cm' : k === 'largura' ? 'Larg. cm' : 'Alt. cm'}
                          className={campo}
                        />
                      ))}
                      <button type="button" disabled={volumes.length === 1} onClick={() => setVolumes((prev) => prev.filter((_, j) => j !== i))} className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setVolumes((prev) => [...prev, { id: `v${Date.now()}`, quantidade: 1, comprimento: 0, largura: 0, altura: 0 }])}
                      className="text-[11px] px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 flex items-center gap-1 normal-case tracking-normal"
                    >
                      <Plus className="w-3.5 h-3.5" /> Outro tamanho de volume
                    </button>
                    <label className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      Fator (kg/m³)
                      <input value={fatorCubagem} onChange={(e) => setFatorCubagem(e.target.value)} inputMode="decimal" className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-xs" />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {m3.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} m³ → peso cubado <b>{pesoCubado.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</b>. Fator usual: 300 (rodoviário) e 167 (aéreo).
                  </p>
                </>
              )}
            </div>
            </>)}

            {tabela && (custosExtras.length > 0 || tabela.taxaDescargaAjudante || tabela.percentualGrisPedagio) ? (
              <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-600 uppercase">Custos extras (marque os que se aplicam)</p>
                {tabela.taxaDescargaAjudante ? (
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={incluirDescarga} onChange={(e) => setIncluirDescarga(e.target.checked)} className="mt-0.5" />
                    <span className="flex-1">Descarga / ajudante</span>
                    <span className="font-semibold">{formatCurrency(tabela.taxaDescargaAjudante)}</span>
                  </label>
                ) : null}
                {tabela.percentualGrisPedagio ? (
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={incluirGris} onChange={(e) => setIncluirGris(e.target.checked)} className="mt-0.5" />
                    <span className="flex-1">GRIS / pedágio ({tabela.percentualGrisPedagio}% sobre a NF{nf ? '' : ' — informe a NF'})</span>
                  </label>
                ) : null}
                {custosExtras.map((c) => (
                  <label key={c.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={extrasMarcados.has(c.id)} onChange={() => alternarExtra(c.id)} className="mt-0.5" />
                    <span className="flex-1">
                      {nomeExtra(c)}
                      <span className="text-slate-400"> · {c.tipoCobranca}</span>
                    </span>
                    <span className="font-semibold whitespace-nowrap">{c.valor ? formatCurrency(c.valor) : 'consultar'}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          {/* Resultado */}
          <div className="p-5 bg-slate-50/70 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Frete calculado</p>
            {faltando || !resultado ? (
              <p className="text-xs text-slate-500 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" /> {faltando || 'Não foi possível calcular com a tabela deste cliente.'}
              </p>
            ) : (
              <>
                <p className="text-3xl font-black text-slate-900">{formatCurrency(resultado.total)}</p>
                {tarifaCidade?.prazo && (
                  <p className="text-xs font-semibold text-[#92611F] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Prazo: {tarifaCidade.prazo}
                  </p>
                )}
                {modo === 'fracionado' && (
                  <p className="text-[11px] text-slate-500">
                    Peso considerado: {pesoCalculo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg{pesoCubado > pesoReal ? ' (cubado)' : ''}
                  </p>
                )}
                <ul className="divide-y divide-slate-200 border-t border-b border-slate-200">
                  {resultado.linhas.map((l, i) => (
                    <li key={i} className="py-1.5 flex justify-between gap-3 text-xs">
                      <span className="text-slate-600">{l.label}</span>
                      <span className="font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(l.valor)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={copiar}
                  className="w-full px-3 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 normal-case tracking-normal"
                >
                  {copiado ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiado ? 'Copiado!' : 'Copiar cotação (WhatsApp / e-mail)'}
                </button>
                <p className="text-[10px] text-slate-400">
                  {modo === 'dedicado'
                    ? 'Dedicado: km × valor por km do veículo na tabela do cliente. No CT-e, lance esse total como Custo Extra "Dedicado por KM".'
                    : 'Mesmo cálculo do Valor a Cobrar do Controle Financeiro, com a tabela atual do cliente. Custos extras só entram quando marcados.'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
