import React from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  MessageSquare,
  ShoppingCart,
  AlertTriangle,
  Users,
  LayoutGrid,
  Building2,
  Plane,
  Truck,
  Target,
  Landmark,
  NotebookPen,
  FileCheck2,
  Megaphone,
  FileStack,
  Newspaper,
  ClipboardList,
  KeyRound,
  Inbox,
} from 'lucide-react';
import type { AlertaItem, AtividadeGestao, GlobalModuleId, UsuarioLogin } from '../../types';

/** Módulos que aparecem no "Acesso rápido" (na ordem), com nome curto e ícone. */
const MODULOS: { id: GlobalModuleId; rotulo: string; icone: React.ElementType }[] = [
  { id: 'dp', rotulo: 'DP', icone: Users },
  { id: 'agenda', rotulo: 'Agenda', icone: CalendarDays },
  { id: 'chat', rotulo: 'Chat', icone: MessageSquare },
  { id: 'compras', rotulo: 'Compras', icone: ShoppingCart },
  { id: 'notas', rotulo: 'Notas', icone: NotebookPen },
  { id: 'clientes', rotulo: 'Clientes', icone: Building2 },
  { id: 'farma_aereo', rotulo: 'Farma Aéreo', icone: Plane },
  { id: 'farma_rodoviario', rotulo: 'Rodoviário', icone: Truck },
  { id: 'instrucoes', rotulo: 'Instruções', icone: FileCheck2 },
  { id: 'pops', rotulo: 'POPs', icone: ClipboardList },
  { id: 'documentos', rotulo: 'Padronização', icone: FileStack },
  { id: 'comunicados', rotulo: 'Comunicados', icone: Megaphone },
  { id: 'jornal', rotulo: 'Jornal', icone: Newspaper },
  { id: 'projetos', rotulo: 'Projetos', icone: Target },
  { id: 'controladoria', rotulo: 'Controladoria', icone: Landmark },
  { id: 'visao_geral', rotulo: 'Visão geral', icone: LayoutGrid },
  { id: 'usuarios', rotulo: 'Logins', icone: KeyRound },
];

function saudacao(nome: string) {
  const h = new Date().getHours();
  const p = (nome || '').trim().split(/\s+/)[0] || '';
  return {
    cumprimento: h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite',
    primeiroNome: p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
  };
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

interface Props {
  currentUser: UsuarioLogin;
  /** Compromissos de hoje que este login pode ver. */
  compromissosHoje: AtividadeGestao[];
  alertas: AlertaItem[];
  pendencias: { chat: number; compras: number; demandasDp: number };
  onAbrirModulo: (modulo: GlobalModuleId) => void;
}

/**
 * Tela "Início" do app de gestão no celular — mesmo desenho do app do colaborador: faixa escura
 * com saudação, cartão do dia (compromissos de hoje), pendências e acesso rápido aos módulos
 * liberados para este login. No computador não aparece (o menu lateral faz esse papel).
 */
export const InicioGestaoMobile: React.FC<Props> = ({ currentUser, compromissosHoje, alertas, pendencias, onAbrirModulo }) => {
  const { cumprimento, primeiroNome } = saudacao(currentUser.nome);
  const iniciais = (currentUser.nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const pode = (m: GlobalModuleId) => currentUser.modulosPermitidos.includes(m);
  const hoje = new Date();
  const urgentes = alertas.filter((a) => a.nivel === 'urgente').length;

  const itensPendencia = [
    pode('chat') && pendencias.chat > 0 && { chave: 'chat', rotulo: `${pendencias.chat} mensagem(ns) não lida(s) no Chat`, icone: MessageSquare, modulo: 'chat' },
    pode('dp') && pendencias.demandasDp > 0 && { chave: 'dp-demandas', rotulo: `${pendencias.demandasDp} solicitação(ões) no Fale com o DP`, icone: Inbox, modulo: 'chat' },
    pode('compras') && pendencias.compras > 0 && { chave: 'compras', rotulo: `${pendencias.compras} compra(s) aguardando`, icone: ShoppingCart, modulo: 'compras' },
    pode('dp') && alertas.length > 0 && {
      chave: 'alertas',
      rotulo: `${alertas.length} alerta(s) do DP${urgentes ? ` · ${urgentes} urgente(s)` : ''}`,
      icone: AlertTriangle,
      modulo: 'dp',
    },
  ].filter(Boolean) as { chave: string; rotulo: string; icone: React.ElementType; modulo: GlobalModuleId }[];
  const totalPendencias = pendencias.chat + pendencias.compras + pendencias.demandasDp + alertas.length;

  const modulos = MODULOS.filter((m) => pode(m.id));

  return (
    <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 pb-4">
      {/* Faixa escura com a saudação (como no app do colaborador) */}
      <div className="bg-[#16130F] text-white px-4 pt-4 pb-16">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C48229] to-[#7A4F17] text-white text-sm font-black flex items-center justify-center shrink-0 ring-2 ring-white/10">
              {iniciais}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-white/60 font-semibold">{cumprimento},</p>
              <p className="text-lg font-black leading-tight truncate">{primeiroNome}</p>
              {currentUser.cargo && <p className="text-[11px] text-[#E8C48E] truncate">{currentUser.cargo}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('inicio-pendencias')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="relative w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
            title="Pendências"
          >
            <Bell className="w-5 h-5" />
            {totalPendencias > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#16130F]">
                {totalPendencias > 99 ? '99+' : totalPendencias}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 -mt-12 space-y-4">
        {/* Cartão do dia: compromissos de hoje */}
        <div className="bg-white rounded-3xl shadow-lg shadow-slate-900/5 border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">Hoje</p>
              <p className="text-lg font-black text-slate-900 leading-tight">
                {DIAS[hoje.getDay()]} · {hoje.getDate()} de {MESES[hoje.getMonth()]}
              </p>
            </div>
            {pode('agenda') && (
              <button
                type="button"
                onClick={() => onAbrirModulo('agenda')}
                className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 normal-case tracking-normal"
              >
                Ver agenda
              </button>
            )}
          </div>
          {compromissosHoje.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum compromisso na agenda hoje.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {compromissosHoje.slice(0, 4).map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onAbrirModulo('agenda')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl normal-case tracking-normal ${
                    i === 0 ? 'bg-[#16130F] text-white' : 'bg-slate-50 text-slate-800'
                  }`}
                >
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-[#C48229]' : 'bg-white border border-slate-200'}`}>
                    <Clock className={`w-4 h-4 ${i === 0 ? 'text-white' : 'text-[#92611F]'}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold truncate">{a.titulo}</span>
                    <span className={`block text-[11px] ${i === 0 ? 'text-[#E8C48E]' : 'text-slate-500'}`}>
                      {a.diaInteiro ? 'Dia inteiro' : `${a.horaInicio}–${a.horaFim}`}
                      {a.localOuLink ? ` · ${a.localOuLink}` : ''}
                    </span>
                  </span>
                </button>
              ))}
              {compromissosHoje.length > 4 && (
                <p className="text-[11px] text-slate-500 text-center">+ {compromissosHoje.length - 4} compromisso(s) hoje</p>
              )}
            </div>
          )}
        </div>

        {/* Pendências */}
        <div id="inicio-pendencias">
          {itensPendencia.length > 0 ? (
            <div className="bg-white rounded-3xl border-2 border-[#C48229] overflow-hidden">
              <div className="px-4 py-3 bg-amber-50/70 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#C48229]" />
                <p className="text-sm font-black text-slate-900">Pendências</p>
              </div>
              {itensPendencia.map((p) => {
                const Icone = p.icone;
                return (
                  <button
                    key={p.chave}
                    type="button"
                    onClick={() => onAbrirModulo(p.modulo)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 border-t border-slate-100 normal-case tracking-normal active:bg-amber-50"
                  >
                    <Icone className="w-5 h-5 text-[#C48229] shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-slate-800">{p.rotulo}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 p-4 text-sm text-slate-500 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" /> Nenhuma pendência no momento.
            </div>
          )}
        </div>

        {/* Acesso rápido */}
        {modulos.length > 0 && (
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1 mb-2">Acesso rápido</p>
            <div className="grid grid-cols-3 gap-2.5">
              {modulos.map((m) => {
                const Icone = m.icone;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onAbrirModulo(m.id)}
                    className="bg-white rounded-2xl border border-slate-100 shadow-xs p-3 flex flex-col items-center gap-2 normal-case tracking-normal active:bg-amber-50"
                  >
                    <span className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Icone className="w-5 h-5 text-[#92611F]" />
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{m.rotulo}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
