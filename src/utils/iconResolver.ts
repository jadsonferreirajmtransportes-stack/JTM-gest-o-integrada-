// ============================================================================
// Resolve o nome de um ícone (string, salvo em Operacao.icone) pro componente
// lucide-react correspondente — só os ícones oferecidos no seletor do cadastro
// de Operações (não a biblioteca inteira, pra não puxar import desnecessário).
// ============================================================================

import {
  Plane,
  Truck,
  Building2,
  HeartPulse,
  Package,
  Warehouse,
  Stethoscope,
  ShieldCheck,
  Boxes,
  type LucideIcon,
} from 'lucide-react';

export const ICON_OPTIONS: Record<string, LucideIcon> = {
  Plane,
  Truck,
  Building2,
  HeartPulse,
  Package,
  Warehouse,
  Stethoscope,
  ShieldCheck,
  Boxes,
};

export function resolveOperacaoIcon(nomeIcone: string | undefined): LucideIcon {
  return (nomeIcone && ICON_OPTIONS[nomeIcone]) || Building2;
}
