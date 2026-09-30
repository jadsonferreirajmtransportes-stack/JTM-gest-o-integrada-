// ============================================================================
// Regras do Módulo Disciplinar (decididas com o DP em 2026-09-30):
//   - escada COMPLETA de 7 etapas (abaixo);
//   - reincidência conta as medidas dos últimos 12 meses;
//   - a medida sugerida é a etapa seguinte à mais alta que ainda conta; pular
//     etapas (falta grave) é permitido, com justificativa obrigatória;
//   - recomendação de justa causa é só RECOMENDAÇÃO — decisão é jurídica e o
//     desligamento em si é feito em Colaboradores.
// Base legal: CLT art. 482 (faltas graves), art. 474 (suspensão ≤ 30 dias),
// art. 158 parágrafo único (recusa de EPI). Princípios que a Justiça do
// Trabalho cobra: imediatidade, proporcionalidade, gradação e uma só punição
// por fato (non bis in idem).
// ============================================================================

export type TipoMedidaDisciplinar =
  | 'Advertência verbal'
  | 'Advertência escrita'
  | 'Suspensão'
  | 'Recomendação de justa causa';

export type StatusMedidaDisciplinar = 'Proposta' | 'Aprovada' | 'Rejeitada' | 'Recusou-se a assinar' | 'Cancelada';

export interface EtapaDisciplinar {
  etapa: number;
  rotulo: string;
  tipo: TipoMedidaDisciplinar;
  diasSuspensao?: number;
}

export const ESCADA_DISCIPLINAR: EtapaDisciplinar[] = [
  { etapa: 1, rotulo: 'Advertência verbal', tipo: 'Advertência verbal' },
  { etapa: 2, rotulo: 'Advertência escrita', tipo: 'Advertência escrita' },
  { etapa: 3, rotulo: '2ª Advertência escrita', tipo: 'Advertência escrita' },
  { etapa: 4, rotulo: 'Suspensão de 1 dia', tipo: 'Suspensão', diasSuspensao: 1 },
  { etapa: 5, rotulo: 'Suspensão de 3 dias', tipo: 'Suspensão', diasSuspensao: 3 },
  { etapa: 6, rotulo: 'Suspensão de 5 dias', tipo: 'Suspensão', diasSuspensao: 5 },
  { etapa: 7, rotulo: 'Recomendação de justa causa', tipo: 'Recomendação de justa causa' },
];

export const MESES_REINCIDENCIA = 12;
/** CLT art. 474: suspensão acima de 30 dias consecutivos equivale à rescisão injusta. */
export const MAX_DIAS_SUSPENSAO = 30;

export const ALINEAS_ART_482: { codigo: string; curto: string; texto: string }[] = [
  { codigo: 'a', curto: 'Improbidade', texto: 'ato de improbidade' },
  { codigo: 'b', curto: 'Mau procedimento', texto: 'incontinência de conduta ou mau procedimento' },
  { codigo: 'c', curto: 'Negociação/concorrência', texto: 'negociação habitual por conta própria ou alheia sem permissão do empregador, quando constituir ato de concorrência ou for prejudicial ao serviço' },
  { codigo: 'd', curto: 'Condenação criminal', texto: 'condenação criminal do empregado, passada em julgado, sem suspensão da execução da pena' },
  { codigo: 'e', curto: 'Desídia', texto: 'desídia no desempenho das respectivas funções' },
  { codigo: 'f', curto: 'Embriaguez', texto: 'embriaguez habitual ou em serviço' },
  { codigo: 'g', curto: 'Violação de segredo', texto: 'violação de segredo da empresa' },
  { codigo: 'h', curto: 'Indisciplina/insubordinação', texto: 'ato de indisciplina ou de insubordinação' },
  { codigo: 'i', curto: 'Abandono de emprego', texto: 'abandono de emprego' },
  { codigo: 'j', curto: 'Ofensa a qualquer pessoa', texto: 'ato lesivo da honra ou da boa fama ou ofensas físicas praticados no serviço contra qualquer pessoa, salvo legítima defesa' },
  { codigo: 'k', curto: 'Ofensa ao empregador/superior', texto: 'ato lesivo da honra ou da boa fama ou ofensas físicas contra o empregador e superiores hierárquicos, salvo legítima defesa' },
  { codigo: 'l', curto: 'Jogos de azar', texto: 'prática constante de jogos de azar' },
  { codigo: 'm', curto: 'Perda da habilitação', texto: 'perda da habilitação ou dos requisitos legais para o exercício da profissão, por conduta dolosa do empregado' },
  { codigo: 'epi', curto: 'Recusa de EPI/segurança', texto: 'recusa injustificada à observância das instruções de segurança e ao uso dos equipamentos de proteção individual (art. 158, parágrafo único, da CLT)' },
];

/** "art. 482, alínea "e" (desídia...)" — texto do enquadramento pro documento. */
export function descreverEnquadramento(codigos: string[], outro?: string): string {
  const partes = codigos
    .map((c) => ALINEAS_ART_482.find((a) => a.codigo === c))
    .filter(Boolean)
    .map((a) => (a!.codigo === 'epi' ? a!.texto : `art. 482, alínea "${a!.codigo}", da CLT (${a!.texto})`));
  if (outro?.trim()) partes.push(outro.trim());
  return partes.join('; ');
}

export interface MedidaParaRegra {
  id: string;
  colaboradorId: string;
  etapa: number;
  status: StatusMedidaDisciplinar;
  dataFato: string;
  enquadramento: string[];
  aprovadoEm?: string;
  propostoEm?: string;
}

/** Medida que conta pra reincidência: aprovada (com ou sem assinatura/recusa) e aplicada nos
 *  últimos 12 meses. Proposta, rejeitada ou cancelada não conta. */
export function contaParaReincidencia(m: MedidaParaRegra, hoje = new Date()): boolean {
  if (m.status !== 'Aprovada' && m.status !== 'Recusou-se a assinar') return false;
  const aplicadaEm = new Date(m.aprovadoEm || m.propostoEm || m.dataFato);
  const limite = new Date(hoje);
  limite.setMonth(limite.getMonth() - MESES_REINCIDENCIA);
  return aplicadaEm >= limite;
}

/** Etapa atual do colaborador (0 = nenhuma medida válida) e a próxima sugerida. */
export function situacaoDisciplinar(colaboradorId: string, medidas: MedidaParaRegra[], hoje = new Date()) {
  const validas = medidas.filter((m) => m.colaboradorId === colaboradorId && contaParaReincidencia(m, hoje));
  const etapaAtual = validas.reduce((max, m) => Math.max(max, m.etapa), 0);
  const proxima = ESCADA_DISCIPLINAR[Math.min(etapaAtual, ESCADA_DISCIPLINAR.length - 1)];
  // Quando a medida mais alta deixa de contar (12 meses depois de aplicada).
  const maisAlta = validas.filter((m) => m.etapa === etapaAtual).sort((a, b) => (b.aprovadoEm || '').localeCompare(a.aprovadoEm || ''))[0];
  let zeraEm: string | undefined;
  if (maisAlta) {
    const d = new Date(maisAlta.aprovadoEm || maisAlta.propostoEm || maisAlta.dataFato);
    d.setMonth(d.getMonth() + MESES_REINCIDENCIA);
    zeraEm = d.toISOString().slice(0, 10);
  }
  return { etapaAtual, proxima, validas, zeraEm };
}

export interface AlertaDisciplinar {
  nivel: 'erro' | 'atencao' | 'info';
  texto: string;
}

function diasEntre(inicioIso: string, fimIso: string): number {
  return Math.round((new Date(fimIso + 'T00:00:00').getTime() - new Date(inicioIso + 'T00:00:00').getTime()) / 86400000);
}

/** Checagens jurídicas da medida antes de registrar/aprovar. 'erro' bloqueia. */
export function avaliarMedida(params: {
  colaboradorId: string;
  etapaEscolhida: number;
  etapaSugerida: number;
  dataFato: string;
  dataCienciaFato: string;
  dataAplicacao: string;
  enquadramento: string[];
  enquadramentoOutro?: string;
  diasSuspensao?: number;
  justificativaEtapa?: string;
  medidaId?: string;
  medidas: MedidaParaRegra[];
}): AlertaDisciplinar[] {
  const alertas: AlertaDisciplinar[] = [];
  const etapa = ESCADA_DISCIPLINAR.find((e) => e.etapa === params.etapaEscolhida);

  if (params.dataFato && params.dataCienciaFato && params.dataCienciaFato < params.dataFato) {
    alertas.push({ nivel: 'erro', texto: 'A data em que a empresa soube do fato não pode ser anterior à data do fato.' });
  }

  if (params.dataCienciaFato && params.dataAplicacao) {
    const atraso = diasEntre(params.dataCienciaFato, params.dataAplicacao);
    if (atraso > 30) {
      alertas.push({
        nivel: 'atencao',
        texto: `Imediatidade: a medida está sendo aplicada ${atraso} dias depois de a empresa saber do fato. A Justiça do Trabalho pode entender como perdão tácito e anular a punição — aplique o quanto antes.`,
      });
    } else if (atraso > 7) {
      alertas.push({
        nivel: 'info',
        texto: `Imediatidade: ${atraso} dias desde que a empresa soube do fato. O ideal é aplicar em poucos dias (tempo só da apuração).`,
      });
    }
  }

  if (params.enquadramento.length === 0 && !params.enquadramentoOutro?.trim()) {
    alertas.push({ nivel: 'erro', texto: 'Informe o enquadramento (qual falta foi cometida) — sem isso a medida fica sem fundamento.' });
  }

  if (etapa?.tipo === 'Suspensão') {
    const dias = params.diasSuspensao ?? 0;
    if (dias < 1) alertas.push({ nivel: 'erro', texto: 'Informe quantos dias de suspensão.' });
    if (dias > MAX_DIAS_SUSPENSAO) {
      alertas.push({
        nivel: 'erro',
        texto: `Suspensão de ${dias} dias não é permitida: pelo art. 474 da CLT, acima de ${MAX_DIAS_SUSPENSAO} dias consecutivos equivale a rescisão injusta do contrato.`,
      });
    }
  }

  if (params.etapaEscolhida > params.etapaSugerida && !params.justificativaEtapa?.trim()) {
    alertas.push({
      nivel: 'erro',
      texto: `A etapa sugerida pela gradação é "${ESCADA_DISCIPLINAR[params.etapaSugerida - 1]?.rotulo}". Para aplicar uma medida mais severa (falta grave), explique o motivo — proporcionalidade é um dos pontos que a Justiça mais verifica.`,
    });
  }

  // Mesmo fato já punido (non bis in idem): mesma data do fato e algum enquadramento em comum.
  const repetida = params.medidas.find(
    (m) =>
      m.id !== params.medidaId &&
      m.colaboradorId === params.colaboradorId &&
      m.status !== 'Rejeitada' &&
      m.status !== 'Cancelada' &&
      m.dataFato === params.dataFato &&
      m.enquadramento.some((e) => params.enquadramento.includes(e))
  );
  if (repetida) {
    alertas.push({
      nivel: 'atencao',
      texto: 'Já existe uma medida para este colaborador com a mesma data do fato e o mesmo enquadramento. Um mesmo fato só pode ser punido uma vez — confira se não é duplicidade.',
    });
  }

  if (etapa?.tipo === 'Recomendação de justa causa') {
    alertas.push({
      nivel: 'atencao',
      texto: 'Recomendação de justa causa é só uma recomendação para análise jurídica — não aplique o desligamento sem essa análise. Se confirmada, o desligamento é feito em Colaboradores (motivo: Demissão com justa causa).',
    });
  }
  return alertas;
}
