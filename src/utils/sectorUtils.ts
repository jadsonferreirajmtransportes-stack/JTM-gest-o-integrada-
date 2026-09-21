import {
  Cliente,
  Colaborador,
  CustoOperacional,
  LancamentoFaturamentoAereo,
  LancamentoFaturamentoOperacao,
  ColetaOperacao,
  RegistroDiaOperacao,
  TipoOperacaoDiaria,
} from '../types';

// Os 2 literais continuam documentando os setores originais; `| string` abre espaço pra
// qualquer operação cadastrada dinamicamente (ver types.ts `Operacao` / operacoesApi.ts).
export type SetorModuloId = 'farma_aereo' | 'farma_rodoviario' | string;

/** Vínculo genérico por array explícito — único critério usado pra qualquer operação NOVA
 *  (sem o histórico de heurísticas por palavra-chave que os 2 setores originais acumularam
 *  só pra dar conta de dados antigos sem vínculo explícito). */
export function isVinculadoAoSetor(setoresVinculados: string[] | undefined, setor: string): boolean {
  return Array.isArray(setoresVinculados) && setoresVinculados.includes(setor);
}

/** Se a Operação não restringiu nenhuma aba (Operacao.secoesAtivas ausente/vazio), mostra
 *  todas — mesmo padrão de "ausente = sem restrição" já usado em secoesOperacoesPermitidas/
 *  secoesDpPermitidas (ver visibilidadeUtils.ts). */
export function operacaoTemAba(secoesAtivas: string[] | undefined, aba: string): boolean {
  if (!secoesAtivas || secoesAtivas.length === 0) return true;
  return secoesAtivas.includes(aba);
}

// ==========================================
// FATURAMENTO REAL (a partir dos lançamentos do Controle Financeiro)
// ==========================================

/** Faturamento real de um setor, calculado a partir dos lançamentos efetivamente cobrados —
 *  em vez do campo manual "Faturamento Mensal Estimado" preenchido por cliente, que fica
 *  desatualizado assim que ninguém mantém. Usa a MÉDIA mensal (total ÷ nº de meses com
 *  lançamento) para ficar comparável aos custos fixos mensais do DRE — somar tudo bruto
 *  como se fosse "do mês" distorceria a margem quando há vários meses de histórico. */
export interface FaturamentoRealSetor {
  /** Faturamento médio mensal real (total de todos os lançamentos ÷ meses com dado). */
  totalMensalMedio: number;
  /** Faturamento médio mensal real por cliente, chaveado por clienteId (ou `nome:<nome>`
   *  quando o lançamento não tem clienteId vinculado). */
  porClienteChave: Record<string, number>;
  /** Quantidade de meses distintos (YYYY-MM) com pelo menos um lançamento datado. */
  mesesComDados: number;
}

/** Calcula o faturamento real do Farma Aéreo a partir dos lançamentos do Controle
 *  Financeiro (LancamentoFaturamentoAereo). Lançamentos sem `dataEmissao` entram no total
 *  geral mas não contam para a quantidade de meses (não dá pra saber a qual mês pertencem). */
export function computeFaturamentoRealAereo(
  lancamentos: LancamentoFaturamentoAereo[]
): FaturamentoRealSetor {
  const totalPorChave: Record<string, number> = {};
  const meses = new Set<string>();
  let totalGeral = 0;

  (lancamentos || []).forEach((l) => {
    const valor = Number(l.valorACobrar) || 0;
    totalGeral += valor;
    const chave = l.clienteId || `nome:${l.clienteNome}`;
    totalPorChave[chave] = (totalPorChave[chave] || 0) + valor;
    if (l.dataEmissao) {
      meses.add(l.dataEmissao.slice(0, 7));
    }
  });

  const mesesComDados = Math.max(meses.size, 1);
  const porClienteChave: Record<string, number> = {};
  Object.entries(totalPorChave).forEach(([chave, total]) => {
    porClienteChave[chave] = total / mesesComDados;
  });

  return {
    totalMensalMedio: totalGeral / mesesComDados,
    porClienteChave,
    mesesComDados: meses.size,
  };
}

/** Mesmo cálculo acima, só que a partir dos Lançamentos de Faturamento de uma Operação
 *  genérica (ex.: Unimed) — conciliados mês a mês com o parceiro, em vez de CT-e/AWB. Usa
 *  `periodo` (já vem como 'YYYY-MM') no lugar de `dataEmissao`. Também soma o que já foi
 *  apurado automaticamente no Acompanhamento Operacional (dias marcados × valor diário do
 *  tipo, e coletas com valor já congelado pela tabela de faixas) — a partir do mês em que o
 *  usuário passa a registrar direto na tela em vez de lançar o valor pronto, o Faturamento
 *  Real continua contando esse mês sem exigir um lançamento manual também. */
export function computeFaturamentoRealOperacao(
  lancamentos: LancamentoFaturamentoOperacao[],
  coletas: ColetaOperacao[] = [],
  registrosDia: RegistroDiaOperacao[] = [],
  tiposOperacaoDiaria: TipoOperacaoDiaria[] = []
): FaturamentoRealSetor {
  const totalPorChave: Record<string, number> = {};
  const meses = new Set<string>();
  let totalGeral = 0;

  const somar = (valor: number, periodo: string | undefined, chave: string) => {
    totalGeral += valor;
    totalPorChave[chave] = (totalPorChave[chave] || 0) + valor;
    if (periodo) meses.add(periodo);
  };

  (lancamentos || []).forEach((l) => {
    somar(Number(l.valor) || 0, l.periodo, l.clienteId || `periodo:${l.periodo}`);
  });

  (coletas || []).forEach((c) => {
    const periodo = c.data ? c.data.slice(0, 7) : undefined;
    somar(Number(c.valor) || 0, periodo, c.clienteId || `periodo:${periodo}`);
  });

  const tipoPorId = new Map((tiposOperacaoDiaria || []).map((t) => [t.id, t]));
  (registrosDia || []).forEach((r) => {
    const periodo = r.data ? r.data.slice(0, 7) : undefined;
    const tipo = tipoPorId.get(r.tipoOperacaoId);
    somar(tipo?.valorDiario || 0, periodo, tipo?.clienteId || `periodo:${periodo}`);
  });

  const mesesComDados = Math.max(meses.size, 1);
  const porClienteChave: Record<string, number> = {};
  Object.entries(totalPorChave).forEach(([chave, total]) => {
    porClienteChave[chave] = total / mesesComDados;
  });

  return {
    totalMensalMedio: totalGeral / mesesComDados,
    porClienteChave,
    mesesComDados: meses.size,
  };
}

/**
 * Checks if a Client belongs to Farma Aéreo.
 * Checks explicit tag, sector enum, operation types, or Aéreo keyword in notes/contract.
 */
export function isClienteFarmaAereo(c: Cliente): boolean {
  if (!c) return false;
  // Uma vez que o cliente tem vínculo explícito de setor (mesmo que já tenha sido
  // desmarcado de tudo), esse array manda — sem isso, um cliente com "Distribuição
  // Fracionada" no tipo de operação (comum a quase todos) nunca conseguia ser
  // desvinculado de um setor, porque a heurística por palavra-chave abaixo continuava
  // classificando-o ali mesmo depois do usuário clicar em "Desvincular".
  if (Array.isArray(c.setoresVinculados)) {
    return c.setoresVinculados.includes('farma_aereo');
  }
  if (c.setorAtuacao === 'farma_aereo' || c.setorAtuacao === 'ambos') {
    return true;
  }
  // Check operation types
  if (Array.isArray(c.tiposOperacao)) {
    const hasAereoOp = c.tiposOperacao.some(
      (op) =>
        op.toLowerCase().includes('aéreo') ||
        op.toLowerCase().includes('plantão hospitalar 24h') ||
        op.toLowerCase().includes('termolábil crítico')
    );
    if (hasAereoOp && (c.id === 'cli-001' || c.id === 'cli-002' || c.id === 'cli-003' || c.id === 'cli-1' || c.id === 'cli-2' || c.id === 'cli-3')) {
      return true;
    }
  }
  // Default seeded clients
  const defaultAereoIds = ['cli-001', 'cli-002', 'cli-003', 'cli-1', 'cli-2', 'cli-3'];
  if (defaultAereoIds.includes(c.id) || defaultAereoIds.includes(c.codigoCliente)) {
    return true;
  }

  return false;
}

/**
 * Checks if a Client belongs to Farma Rodoviário.
 * Checks explicit tag, sector enum, operation types, or Rodoviário keyword.
 */
export function isClienteFarmaRodoviario(c: Cliente): boolean {
  if (!c) return false;
  // Ver comentário equivalente em isClienteFarmaAereo: vínculo explícito manda, sem
  // cair de volta nas heurísticas por palavra-chave (que impediam desvincular).
  if (Array.isArray(c.setoresVinculados)) {
    return c.setoresVinculados.includes('farma_rodoviario');
  }
  if (c.setorAtuacao === 'farma_rodoviario' || c.setorAtuacao === 'ambos') {
    return true;
  }
  // Check operation types
  if (Array.isArray(c.tiposOperacao)) {
    const hasRodoOp = c.tiposOperacao.some(
      (op) =>
        op.toLowerCase().includes('distribuição fracionada') ||
        op.toLowerCase().includes('transferência dedicada') ||
        op.toLowerCase().includes('cross-docking') ||
        op.toLowerCase().includes('rodoviário')
    );
    if (hasRodoOp) return true;
  }
  // Default seeded clients for Road
  const defaultRodoIds = ['cli-001', 'cli-004', 'cli-005', 'cli-006', 'cli-1', 'cli-4', 'cli-5', 'cli-6'];
  if (defaultRodoIds.includes(c.id) || defaultRodoIds.includes(c.codigoCliente)) {
    return true;
  }

  return false;
}

/**
 * Checks if a Collaborator belongs to Farma Aéreo.
 */
export function isColaboradorFarmaAereo(c: Colaborador): boolean {
  if (!c) return false;
  // Vínculo explícito manda — sem isso, um cargo com "farmacêutica"/"RT" no nome (comum
  // a colaboradores de Qualidade) nunca conseguia ser desvinculado de um setor.
  if (Array.isArray(c.setoresAtuacao)) {
    return c.setoresAtuacao.includes('farma_aereo');
  }
  if (c.setorPrincipal === 'farma_aereo' || c.setorPrincipal === 'ambos') {
    return true;
  }
  const s = (c.setor || '').toLowerCase();
  const f = (c.funcaoCargo || '').toLowerCase();

  if (
    s.includes('aéreo') ||
    s.includes('teca') ||
    s.includes('aeroporto') ||
    s.includes('qualidade') ||
    f.includes('aéreo') ||
    f.includes('teca') ||
    f.includes('rastreamento') ||
    f.includes('farmacêutica') ||
    f.includes('rt')
  ) {
    return true;
  }

  // Known seeds for Aéreo
  const aereoColabIds = ['colab-2', 'colab-7', 'colab-1', 'col-1', 'col-2'];
  if (aereoColabIds.includes(c.id) || aereoColabIds.includes(c.codigoMatricula)) {
    return true;
  }

  return false;
}

/**
 * Checks if a Collaborator belongs to Farma Rodoviário.
 */
export function isColaboradorFarmaRodoviario(c: Colaborador): boolean {
  if (!c) return false;
  // Ver comentário equivalente em isColaboradorFarmaAereo.
  if (Array.isArray(c.setoresAtuacao)) {
    return c.setoresAtuacao.includes('farma_rodoviario');
  }
  if (c.setorPrincipal === 'farma_rodoviario' || c.setorPrincipal === 'ambos') {
    return true;
  }
  const s = (c.setor || '').toLowerCase();
  const f = (c.funcaoCargo || '').toLowerCase();

  if (
    s.includes('transporte') ||
    s.includes('frota') ||
    s.includes('rodoviário') ||
    s.includes('armazém') ||
    s.includes('armazenagem') ||
    s.includes('manutenção') ||
    s.includes('qualidade') ||
    f.includes('motorista') ||
    f.includes('ajudante') ||
    f.includes('conferente') ||
    f.includes('refrigeração') ||
    f.includes('frota') ||
    f.includes('farmacêutica') ||
    f.includes('rt')
  ) {
    return true;
  }

  // Known seeds for Rodoviário
  const rodoColabIds = ['colab-1', 'colab-2', 'colab-3', 'colab-5', 'colab-6', 'colab-8', 'col-1', 'col-3'];
  if (rodoColabIds.includes(c.id) || rodoColabIds.includes(c.codigoMatricula)) {
    return true;
  }

  return false;
}

/**
 * Attaches or detaches a client to/from a sector.
 */
export function vincularClienteAoSetor(
  cliente: Cliente,
  setor: SetorModuloId,
  vincular: boolean
): Cliente {
  const currentSetores = new Set<SetorModuloId>(
    cliente.setoresVinculados || [
      ...(isClienteFarmaAereo(cliente) ? (['farma_aereo'] as SetorModuloId[]) : []),
      ...(isClienteFarmaRodoviario(cliente) ? (['farma_rodoviario'] as SetorModuloId[]) : []),
    ]
  );

  if (vincular) {
    currentSetores.add(setor);
  } else {
    currentSetores.delete(setor);
  }

  const updatedArray = Array.from(currentSetores);
  let novoSetorAtuacao: string = 'ambos';
  if (updatedArray.length === 1) {
    novoSetorAtuacao = updatedArray[0];
  } else if (updatedArray.length === 0) {
    novoSetorAtuacao = 'nenhum';
  }

  return {
    ...cliente,
    setoresVinculados: updatedArray,
    setorAtuacao: novoSetorAtuacao,
    atualizadoEm: new Date().toISOString(),
  };
}

/**
 * Attaches or detaches a collaborator to/from a sector.
 */
export function vincularColaboradorAoSetor(
  colaborador: Colaborador,
  setor: SetorModuloId,
  vincular: boolean
): Colaborador {
  const currentSetores = new Set<string>(
    colaborador.setoresAtuacao || [
      ...(isColaboradorFarmaAereo(colaborador) ? (['farma_aereo'] as const) : []),
      ...(isColaboradorFarmaRodoviario(colaborador) ? (['farma_rodoviario'] as const) : []),
      ...((colaborador.setor || '').toLowerCase().includes('pessoal') ||
      (colaborador.setor || '').toLowerCase().includes('rh')
        ? (['dp'] as const)
        : []),
    ]
  );

  if (vincular) {
    currentSetores.add(setor);
  } else {
    currentSetores.delete(setor);
  }

  const updatedArray = Array.from(currentSetores);
  let novoSetorPrincipal: string = 'ambos';
  if (updatedArray.length === 1) {
    novoSetorPrincipal = updatedArray[0];
  } else if (updatedArray.length === 0) {
    novoSetorPrincipal = 'dp';
  }

  return {
    ...colaborador,
    setoresAtuacao: updatedArray,
    setorPrincipal: novoSetorPrincipal,
    atualizadoEm: new Date().toISOString(),
  };
}

// ==========================================
// CÁLCULOS GERENCIAIS E FINANCEIROS POR SETOR
// ==========================================

export interface CustoItemGerencial {
  categoria: string;
  descricao: string;
  valor: number;
  percentualFaturamento: number;
  tipo: 'Pessoal / RH' | 'Fretes & Cias' | 'Combustível / Frota' | 'Insumos Térmicos' | 'Infra & TECA' | 'Seguros & Riscos' | 'Manutenção' | 'Regulatório RDC 430';
}

export interface SectorManagerialMetrics {
  setor: SetorModuloId;
  faturamentoMensalTotal: number;
  faturamentoAnualizado: number;
  totalClientesVinculados: number;
  totalClientesAtivos: number;
  ticketMedioCliente: number;
  volumeMensalEstimado: number;

  /** true quando `faturamentoMensalTotal` veio do faturamento real lançado (Controle
   *  Financeiro) — false quando ainda está usando o campo manual "estimado" por cliente
   *  (setor sem lançamentos granulares, como o Rodoviário hoje). */
  usaFaturamentoReal: boolean;
  /** Quantos meses distintos de lançamento embasam a média — só relevante quando
   *  `usaFaturamentoReal` é true. */
  mesesComDadosReais?: number;
  /** Faturamento médio mensal real por cliente (mesma chave usada em `porClienteChave` de
   *  `computeFaturamentoRealAereo`: clienteId, ou `nome:<nome>` sem vínculo). Alimenta o
   *  ranking de "Principais Contratos" com números reais em vez do campo estimado. */
  faturamentoRealPorClienteChave?: Record<string, number>;

  // Equipe & Folha
  headcountEquipe: number;
  totalSalariosBase: number;
  totalGratificacoes: number;
  totalBeneficiosVtVa: number;
  totalEncargosCltPatronais: number;
  custoTotalFolhaPatronal: number;
  custoMedioPorColaborador: number;

  // Custos Operacionais Diretos
  custosOperacionaisDiretos: CustoItemGerencial[];
  custoTotalOperacionalDireto: number;

  // Totais & DRE
  custoTotalSetor: number;
  impostosSobreFaturamento: number; // ~6% Simples/Presumido
  receitaLiquida: number;
  lucroOperacionalBruto: number; // Receita - Custos
  margemContribuicao: number;
  margemPercentual: number; // EBITDA %
}

/**
 * Calculates complete managerial analytics, revenue, payroll costs and operational costs for a given sector.
 */
export function calcFinancialsSetor(
  setor: SetorModuloId,
  allClientes: Cliente[],
  allColaboradores: Colaborador[],
  allCustosOperacionais?: CustoOperacional[],
  faturamentoReal?: FaturamentoRealSetor
): SectorManagerialMetrics {
  // 1. Clientes do Setor
  const clientesDoSetor = (allClientes || []).filter((c) =>
    setor === 'farma_aereo'
      ? isClienteFarmaAereo(c)
      : setor === 'farma_rodoviario'
      ? isClienteFarmaRodoviario(c)
      : isVinculadoAoSetor(c.setoresVinculados, setor)
  );
  const clientesAtivos = clientesDoSetor.filter((c) => c.status === 'Ativo');

  // Quando há faturamento real (Controle Financeiro) disponível, ele manda — o campo
  // "estimado" por cliente só é usado como fallback para setores sem lançamento granular.
  const usaFaturamentoReal = !!faturamentoReal;
  const faturamentoMensalTotal = faturamentoReal
    ? faturamentoReal.totalMensalMedio
    : clientesDoSetor.reduce((acc, c) => acc + (Number(c.faturamentoMensalEstimado) || 0), 0);
  const volumeMensalEstimado = clientesDoSetor.reduce(
    (acc, c) => acc + (Number(c.volumeEntregasMesEstimado) || 0),
    0
  );
  const totalClientesVinculados = clientesDoSetor.length;
  const totalClientesAtivos = clientesAtivos.length;
  const ticketMedioCliente =
    totalClientesVinculados > 0 ? faturamentoMensalTotal / totalClientesVinculados : 0;
  const faturamentoAnualizado = faturamentoMensalTotal * 12;

  // 2. Colaboradores do Setor
  const colaboradoresDoSetor = (allColaboradores || []).filter(
    (c) =>
      c.status !== 'Inativo' &&
      (setor === 'farma_aereo'
        ? isColaboradorFarmaAereo(c)
        : setor === 'farma_rodoviario'
        ? isColaboradorFarmaRodoviario(c)
        : isVinculadoAoSetor(c.setoresAtuacao, setor))
  );

  let totalSalariosBase = 0;
  let totalGratificacoes = 0;
  let totalBeneficiosVtVa = 0;
  let totalEncargosCltPatronais = 0;
  let custoTotalFolhaPatronal = 0;

  colaboradoresDoSetor.forEach((colab) => {
    const sal = Number(colab.remuneracao) || 0;
    const grat = Number(colab.gratificacao) || 0;
    totalSalariosBase += sal;
    totalGratificacoes += grat;

    // VT & VA
    const vtDia = (Number(colab.vtValorTarifa) || 0) * (Number(colab.vtQuantidadeTarifasDia) || 0);
    const vtMes = vtDia * 22;
    const vaMes = (Number(colab.valorValeAlimentacaoDia) || 35.0) * 22;
    const ben = vtMes + vaMes;
    totalBeneficiosVtVa += ben;

    // Encargos CLT (FGTS 8% + 13º 8.33% + Férias 11.11% + INSS Patronal ~8% s/ FP) = ~35.44%
    const encargos = (sal + grat) * 0.3544;
    totalEncargosCltPatronais += encargos;

    const custoColab = sal + grat + ben + encargos;
    custoTotalFolhaPatronal += custoColab;
  });

  const headcountEquipe = colaboradoresDoSetor.length;
  const custoMedioPorColaborador =
    headcountEquipe > 0 ? custoTotalFolhaPatronal / headcountEquipe : 0;

  // 3. Custos Operacionais Específicos do Setor
  let custosOperacionaisDiretos: CustoItemGerencial[] = [];

  // Verificamos se há custos operacionais inseridos pelo usuário para este setor (ou gerais)
  const registeredCosts = (allCustosOperacionais || []).filter(
    (item) => item.setor === setor || item.setor === 'geral'
  );

  if (registeredCosts.length > 0) {
    // Agrupa os custos por categoria
    const grouped: Record<
      string,
      { total: number; descriptions: string[]; tipo: CustoItemGerencial['tipo'] }
    > = {};

    registeredCosts.forEach((item) => {
      // Se for geral, rateia 50% para cada setor
      const factor = item.setor === 'geral' ? 0.5 : 1.0;
      const cat = item.categoria || 'Outros Custos Operacionais';

      if (!grouped[cat]) {
        let tipo: CustoItemGerencial['tipo'] = 'Insumos Térmicos';
        const cLower = cat.toLowerCase();
        if (cLower.includes('combustível') || cLower.includes('diesel') || cLower.includes('frota')) {
          tipo = 'Combustível / Frota';
        } else if (cLower.includes('frete') || cLower.includes('aéreo') || cLower.includes('cia') || cLower.includes('coleta')) {
          tipo = 'Fretes & Cias';
        } else if (cLower.includes('embalagem') || cLower.includes('pcm') || cLower.includes('gelo') || cLower.includes('térmic')) {
          tipo = 'Insumos Térmicos';
        } else if (cLower.includes('teca') || cLower.includes('armazena') || cLower.includes('câmara')) {
          tipo = 'Infra & TECA';
        } else if (cLower.includes('seguro') || cLower.includes('pedágio') || cLower.includes('risco')) {
          tipo = 'Seguros & Riscos';
        } else if (cLower.includes('manuten') || cLower.includes('peça') || cLower.includes('refrigera') || cLower.includes('thermo')) {
          tipo = 'Manutenção';
        } else if (cLower.includes('rdc') || cLower.includes('datalogger') || cLower.includes('sanitiza') || cLower.includes('qualifica')) {
          tipo = 'Regulatório RDC 430';
        }

        grouped[cat] = {
          total: 0,
          descriptions: [],
          tipo,
        };
      }

      grouped[cat].total += (Number(item.valor) || 0) * factor;
      if (item.descricao && grouped[cat].descriptions.length < 2) {
        grouped[cat].descriptions.push(item.descricao);
      }
    });

    custosOperacionaisDiretos = Object.entries(grouped).map(([categoria, info]) => {
      const pct = faturamentoMensalTotal > 0 ? (info.total / faturamentoMensalTotal) * 100 : 0;
      return {
        categoria,
        descricao: info.descriptions.length > 0 ? info.descriptions.join(' • ') : `Custos registrados de ${categoria}`,
        valor: info.total,
        percentualFaturamento: pct,
        tipo: info.tipo,
      };
    });
  } else if (setor === 'farma_aereo') {
    // Estimativas padrão Farma Aéreo se nenhum custo cadastrado
    const custoCiasAereas = faturamentoMensalTotal * 0.32;
    const custoEmbalagensTermicas = faturamentoMensalTotal * 0.075;
    const custoDataloggers = faturamentoMensalTotal * 0.025;
    const custoTecaArmazenagem = faturamentoMensalTotal * 0.035;
    const custoColetaEntregaLocal = faturamentoMensalTotal * 0.045;

    custosOperacionaisDiretos = [
      {
        categoria: 'Fretes & Tarifas Aéreas',
        descricao: 'Contratos de espaço de carga com LATAM Cargo, Gollog e Azul Cargo Express',
        valor: custoCiasAereas,
        percentualFaturamento: 32.0,
        tipo: 'Fretes & Cias',
      },
      {
        categoria: 'Embalagens Térmicas & PCM',
        descricao: 'Caixas isotérmicas qualificadas VIP, gelo seco granulado e placas PCM 2°C-8°C',
        valor: custoEmbalagensTermicas,
        percentualFaturamento: 7.5,
        tipo: 'Insumos Térmicos',
      },
      {
        categoria: 'Qualificação Térmica & Dataloggers',
        descricao: 'Locação, leitura e calibração RBC de sensores de temperatura (RDC 430)',
        valor: custoDataloggers,
        percentualFaturamento: 2.5,
        tipo: 'Regulatório RDC 430',
      },
      {
        categoria: 'Armazenagem TECA & Taxas Aeroportuárias',
        descricao: 'Diárias em câmara fria aeroportuária (TECA) e taxas de liberação ANVISA',
        valor: custoTecaArmazenagem,
        percentualFaturamento: 3.5,
        tipo: 'Infra & TECA',
      },
      {
        categoria: 'Coletas de Urgência & Last Mile',
        descricao: 'Deslocamentos dedicados de coleta e entrega hospitalar em aeroportos de destino',
        valor: custoColetaEntregaLocal,
        percentualFaturamento: 4.5,
        tipo: 'Fretes & Cias',
      },
    ];
  } else if (setor === 'farma_rodoviario') {
    // Estimativas padrão Farma Rodoviário se nenhum custo cadastrado
    const custoCombustivel = faturamentoMensalTotal * 0.22;
    const custoManutencaoFrota = faturamentoMensalTotal * 0.085;
    const custoPedagioGris = faturamentoMensalTotal * 0.045;
    const custoSeguroCarga = faturamentoMensalTotal * 0.03;
    const custoSanitizacaoTermica = faturamentoMensalTotal * 0.02;

    custosOperacionaisDiretos = [
      {
        categoria: 'Combustível & Abastecimento (Diesel S10)',
        descricao: 'Abastecimento da frota refrigerada e climatizada com Diesel S10 e Arla 32',
        valor: custoCombustivel,
        percentualFaturamento: 22.0,
        tipo: 'Combustível / Frota',
      },
      {
        categoria: 'Manutenção de Frota & Refrigeração',
        descricao: 'Revisões mecânicas, troca de pneus e manutenção de compressores Thermo King/Carrier',
        valor: custoManutencaoFrota,
        percentualFaturamento: 8.5,
        tipo: 'Manutenção',
      },
      {
        categoria: 'Pedágios & Gerenciamento de Risco (GRIS)',
        descricao: 'Tags de pedágio automático (Sem Parar/Veloe) e monitoramento de telemetria/rastreamento',
        valor: custoPedagioGris,
        percentualFaturamento: 4.5,
        tipo: 'Seguros & Riscos',
      },
      {
        categoria: 'Seguros de Carga Farmacêutica',
        descricao: 'Apólices de seguro RCTR-C, RCF-DC e cobertura especial para termolábeis',
        valor: custoSeguroCarga,
        percentualFaturamento: 3.0,
        tipo: 'Seguros & Riscos',
      },
      {
        categoria: 'Sanitização & Validação Térmica RDC 430',
        descricao: 'Limpeza especializada, sanitização de baús e qualificação térmica anual dos veículos',
        valor: custoSanitizacaoTermica,
        percentualFaturamento: 2.0,
        tipo: 'Regulatório RDC 430',
      },
    ];
  } else {
    // Operação sem estimativa padrão cadastrada (qualquer setor além dos 2 originais) —
    // fica zerado até o usuário registrar custos reais, em vez de inventar uma composição
    // percentual fictícia que não faz sentido pra um negócio desconhecido.
    custosOperacionaisDiretos = [];
  }

  const custoTotalOperacionalDireto = custosOperacionaisDiretos.reduce(
    (acc, item) => acc + item.valor,
    0
  );

  const custoTotalSetor = custoTotalFolhaPatronal + custoTotalOperacionalDireto;
  const impostosSobreFaturamento = faturamentoMensalTotal * 0.06; // 6%
  const receitaLiquida = faturamentoMensalTotal - impostosSobreFaturamento;
  const lucroOperacionalBruto = faturamentoMensalTotal - custoTotalSetor;
  const margemContribuicao = lucroOperacionalBruto;
  const margemPercentual =
    faturamentoMensalTotal > 0 ? (lucroOperacionalBruto / faturamentoMensalTotal) * 100 : 0;

  return {
    setor,
    faturamentoMensalTotal,
    faturamentoAnualizado,
    totalClientesVinculados,
    totalClientesAtivos,
    ticketMedioCliente,
    volumeMensalEstimado,
    usaFaturamentoReal,
    mesesComDadosReais: faturamentoReal?.mesesComDados,
    faturamentoRealPorClienteChave: faturamentoReal?.porClienteChave,
    headcountEquipe,
    totalSalariosBase,
    totalGratificacoes,
    totalBeneficiosVtVa,
    totalEncargosCltPatronais,
    custoTotalFolhaPatronal,
    custoMedioPorColaborador,
    custosOperacionaisDiretos,
    custoTotalOperacionalDireto,
    custoTotalSetor,
    impostosSobreFaturamento,
    receitaLiquida,
    lucroOperacionalBruto,
    margemContribuicao,
    margemPercentual,
  };
}

// ==========================================
// RELATÓRIO GERENCIAL (CSV) — usado tanto pelo botão dentro do painel do setor
// quanto pelo atalho "Relatório Gerencial" suspenso no menu lateral, abaixo do
// botão do próprio módulo (Farma Aéreo / Farma Rodoviário).
// ==========================================

const RELATORIO_GERENCIAL_LABELS: Partial<
  Record<string, { identificacao: string; custosDiretosObservacao: string; arquivo: string }>
> = {
  farma_aereo: {
    identificacao: 'Farma Aéreo & TECA RDC 430',
    custosDiretosObservacao: 'Cias aéreas, TECA, embalagens VIP',
    arquivo: 'relatorio_gerencial_farma_aereo',
  },
  farma_rodoviario: {
    identificacao: 'Farma Rodoviário — Frotas & Rotas RDC 430',
    custosDiretosObservacao: 'Diesel S10, manutenção, pedágios, frio',
    arquivo: 'relatorio_gerencial_farma_rodoviario',
  },
};

/** Gera e baixa o CSV do relatório gerencial (DRE resumido) de um setor, a partir das
 *  métricas já calculadas por `calcFinancialsSetor`. Compartilhado entre o painel do
 *  setor e o atalho do menu lateral para não duplicar as mesmas linhas em dois lugares. */
export function gerarRelatorioGerencialSetorCSV(
  metrics: SectorManagerialMetrics,
  nomeOperacao?: string
): void {
  const labels = RELATORIO_GERENCIAL_LABELS[metrics.setor] ?? {
    identificacao: nomeOperacao || metrics.setor,
    custosDiretosObservacao: 'Custos operacionais registrados',
    arquivo: `relatorio_gerencial_${metrics.setor}`,
  };
  const headers = ['Métrica Gerencial / Conta', 'Categoria', 'Valor / Quantidade', 'Observação'];
  const rows = [
    ['Setor', 'Identificação', labels.identificacao, 'Gestão Gerencial JMT'],
    ['Faturamento Mensal Bruto', 'Receita', `R$ ${metrics.faturamentoMensalTotal.toFixed(2)}`, 'Contratos vigentes'],
    ['Faturamento Anual Projetado', 'Receita', `R$ ${metrics.faturamentoAnualizado.toFixed(2)}`, '12 meses'],
    ['Impostos s/ Faturamento (6%)', 'Deduções', `R$ ${metrics.impostosSobreFaturamento.toFixed(2)}`, 'Simples/Presumido'],
    ['Receita Operacional Líquida', 'Receita', `R$ ${metrics.receitaLiquida.toFixed(2)}`, 'Líquido de tributos'],
    ['Folha de Pagamento & Encargos RH', 'Custos', `R$ ${metrics.custoTotalFolhaPatronal.toFixed(2)}`, `${metrics.headcountEquipe} colaboradores`],
    ['Custos Operacionais Diretos', 'Custos', `R$ ${metrics.custoTotalOperacionalDireto.toFixed(2)}`, labels.custosDiretosObservacao],
    ['Custo Total do Setor', 'Custos', `R$ ${metrics.custoTotalSetor.toFixed(2)}`, 'Folha + Diretos'],
    ['Margem de Contribuição / Lucro', 'Resultado', `R$ ${metrics.margemContribuicao.toFixed(2)}`, `${metrics.margemPercentual.toFixed(2)}% margem`],
    ['Total de Empresas Vinculadas', 'Carteira', metrics.totalClientesVinculados.toString(), `${metrics.totalClientesAtivos} ativas`],
    ['Ticket Médio por Empresa', 'Carteira', `R$ ${metrics.ticketMedioCliente.toFixed(2)}`, 'Média mensal'],
    ['Equipe Total Alocada', 'RH', metrics.headcountEquipe.toString(), `Custo médio R$ ${metrics.custoMedioPorColaborador.toFixed(2)}/colab`],
  ];

  const csvContent = [headers.join(';'), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(';'))].join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${labels.arquivo}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
