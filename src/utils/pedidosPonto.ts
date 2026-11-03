// ============================================================================
// Pedidos de ponto pelo "Fale com o DP" (tipo 'ponto'): esqueci de bater,
// abonos, atestados e licenças. O colaborador pede no portal; o DP confere e
// lança no controle de frequência (batida de ajuste ou justificativa do dia).
// ============================================================================

/** Como o pedido é preenchido: horários de um dia, período de dias, horas de um dia ou dias a partir de uma data. */
export type CampoPedidoPonto = 'marcacao' | 'periodo' | 'horas' | 'dias';

export interface ConfigPedidoPonto {
  assunto: string;
  dica: string;
  campo: CampoPedidoPonto;
  /** Atestado / certidão obrigatório. */
  anexoObrigatorio?: boolean;
  /** Texto (motivo) obrigatório. */
  motivoObrigatorio?: boolean;
  /** Dias sugeridos (licenças da CLT). */
  diasPadrao?: number;
  /** Tipo de justificativa sugerido ao lançar no ponto (ver TIPOS_JUSTIFICATIVA). */
  justificativa?: string;
}

export const PEDIDOS_PONTO: ConfigPedidoPonto[] = [
  { assunto: 'Inclusão de marcação', dica: 'Esqueceu de bater o ponto ou o celular falhou', campo: 'marcacao', motivoObrigatorio: true },
  { assunto: 'Abonar ausência no período', dica: 'Um ou mais dias inteiros fora, com motivo', campo: 'periodo', motivoObrigatorio: true, justificativa: 'Folga / compensação' },
  { assunto: 'Abonar quantidade de horas', dica: 'Atraso ou saída antecipada em um dia', campo: 'horas', motivoObrigatorio: true, justificativa: 'Abono de horas' },
  { assunto: 'Atestado médico', dica: 'Envie a foto do atestado', campo: 'dias', anexoObrigatorio: true, diasPadrao: 1, justificativa: 'Atestado médico' },
  { assunto: 'Atestado de comparecimento', dica: 'Consulta ou exame em parte do dia — envie a declaração', campo: 'horas', anexoObrigatorio: true, justificativa: 'Atestado de comparecimento' },
  { assunto: 'Licença casamento', dica: '3 dias seguidos — envie a certidão de casamento', campo: 'dias', anexoObrigatorio: true, diasPadrao: 3, justificativa: 'Falta legal (CLT art. 473)' },
  { assunto: 'Licença paternidade', dica: '5 dias seguidos — envie a certidão de nascimento', campo: 'dias', anexoObrigatorio: true, diasPadrao: 5, justificativa: 'Falta legal (CLT art. 473)' },
  { assunto: 'Licença maternidade', dica: '120 dias — envie o atestado ou a certidão de nascimento', campo: 'dias', anexoObrigatorio: true, diasPadrao: 120, justificativa: 'Afastamento' },
  { assunto: 'Licença por falecimento (nojo)', dica: '2 dias seguidos — envie a certidão de óbito', campo: 'dias', anexoObrigatorio: true, diasPadrao: 2, justificativa: 'Falta legal (CLT art. 473)' },
  { assunto: 'Doação de sangue', dica: '1 dia a cada 12 meses — envie o comprovante', campo: 'dias', anexoObrigatorio: true, diasPadrao: 1, justificativa: 'Falta legal (CLT art. 473)' },
];

export const configPedidoPonto = (assunto: string) => PEDIDOS_PONTO.find((p) => p.assunto === assunto);

export const dataBrPonto = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

export function somarDiasIso(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Dias (YYYY-MM-DD) de um pedido de período/dias/horas — no máximo 180. */
export function diasDoPedido(d: Record<string, any>): string[] {
  const inicio: string | undefined = d.inicio || d.data;
  if (!inicio) return [];
  let fim: string = inicio;
  if (d.fim) fim = d.fim;
  else if (Number(d.dias) > 1) fim = somarDiasIso(inicio, Number(d.dias) - 1);
  const dias: string[] = [];
  for (let x = inicio; x <= fim && dias.length < 180; x = somarDiasIso(x, 1)) dias.push(x);
  return dias;
}

/** Linhas de resumo (portal e DP). */
export function resumoPedidoPonto(d: Record<string, any>): string[] {
  const l: string[] = [];
  if (Array.isArray(d.horarios) && d.data) l.push(`Dia ${dataBrPonto(d.data)}: ${d.horarios.filter(Boolean).join(', ')}`);
  else if (d.de && d.data) l.push(`Dia ${dataBrPonto(d.data)}, das ${d.de} às ${d.ate}`);
  else if (d.inicio && d.fim) l.push(d.inicio === d.fim ? `Dia ${dataBrPonto(d.inicio)}` : `De ${dataBrPonto(d.inicio)} a ${dataBrPonto(d.fim)}`);
  else if (d.inicio) {
    const dias = Number(d.dias) || 1;
    l.push(dias > 1 ? `${dias} dias a partir de ${dataBrPonto(d.inicio)} (até ${dataBrPonto(somarDiasIso(d.inicio, dias - 1))})` : `Dia ${dataBrPonto(d.inicio)}`);
  }
  return l;
}
