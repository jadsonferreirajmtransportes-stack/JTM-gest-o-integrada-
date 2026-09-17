// Lembretes automáticos da Agenda da Gestão — avisa X minutos antes do início do compromisso,
// via notificação do navegador (Notification API) enquanto o sistema estiver aberto numa aba.
// Não depende de servidor/e-mail/WhatsApp: é só um alarme local, então só funciona com o
// navegador aberto na hora certa (não chega se o computador estiver desligado, por exemplo).
import { AtividadeGestao } from '../types';

export const OPCOES_LEMBRETE_MINUTOS: { valor: number | ''; label: string }[] = [
  { valor: '', label: 'Sem aviso' },
  { valor: 15, label: '15 minutos antes' },
  { valor: 30, label: '30 minutos antes' },
  { valor: 60, label: '1 hora antes' },
  { valor: 120, label: '2 horas antes' },
  { valor: 1440, label: '1 dia antes' },
];

const CHAVE_LOCALSTORAGE = 'jmt_lembretes_agenda_notificados';

// Chave por data/hora (não só o id) — se a atividade for reagendada, o lembrete antigo não
// "atrapalha" o novo horário, e o novo horário volta a poder disparar normalmente.
function chaveAtividade(a: AtividadeGestao): string {
  return `${a.id}_${a.data}_${a.horaInicio}`;
}

function lerNotificados(): Set<string> {
  try {
    const raw = localStorage.getItem(CHAVE_LOCALSTORAGE);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function salvarNotificados(set: Set<string>): void {
  try {
    // Mantém só os últimos 300 pra não crescer pra sempre no localStorage.
    localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(Array.from(set).slice(-300)));
  } catch {
    // localStorage indisponível (modo privado, etc.) — sem tratamento; nesse caso o mesmo
    // lembrete pode repetir entre recarregamentos, mas o app continua funcionando normal.
  }
}

/** Verifica quais atividades devem disparar o lembrete agora — chamado periodicamente. Como
 *  efeito colateral, já marca as encontradas como notificadas (chamar de novo não repete o
 *  aviso pra elas). */
export function verificarEMarcarLembretesPendentes(atividades: AtividadeGestao[]): AtividadeGestao[] {
  const agora = new Date();
  const notificados = lerNotificados();
  const disparar: AtividadeGestao[] = [];

  for (const a of atividades) {
    if (!a.lembreteMinutos || a.diaInteiro) continue;
    if (a.status === 'Concluída' || a.status === 'Cancelada') continue;
    if (!a.data || !a.horaInicio) continue;

    const chave = chaveAtividade(a);
    if (notificados.has(chave)) continue;

    const inicio = new Date(`${a.data}T${a.horaInicio}:00`);
    if (Number.isNaN(inicio.getTime())) continue;

    const disparoEm = new Date(inicio.getTime() - a.lembreteMinutos * 60 * 1000);
    // Só dispara dentro da janela [disparoEm, início) — nunca depois do compromisso já ter
    // passado (evita uma enxurrada de avisos de reuniões antigas ao reabrir o sistema).
    if (agora >= disparoEm && agora < inicio) {
      disparar.push(a);
      notificados.add(chave);
    }
  }

  if (disparar.length > 0) salvarNotificados(notificados);
  return disparar;
}

export function rotuloLembrete(minutos: number): string {
  const opcao = OPCOES_LEMBRETE_MINUTOS.find((o) => o.valor === minutos);
  return opcao ? `Avisar ${opcao.label.toLowerCase()}` : `Avisar ${minutos} min antes`;
}

export function formatarTextoLembrete(a: AtividadeGestao): { titulo: string; corpo: string } {
  return {
    titulo: `Compromisso em breve: ${a.titulo}`,
    corpo: `Hoje às ${a.horaInicio}${a.localOuLink ? ` • ${a.localOuLink}` : ''}`,
  };
}
