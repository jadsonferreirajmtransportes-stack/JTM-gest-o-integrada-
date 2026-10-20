import React from 'react';
import {
  Award,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FileSignature,
  Fingerprint,
  GraduationCap,
  Home,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageSquareText,
  Newspaper,
  ScrollText,
} from 'lucide-react';

// Navegação do portal do colaborador, no jeito de app de celular: barra fixa embaixo
// (Início, Ponto, Documentos, Mais) e a lista "Mais" com as outras áreas.

export type AreaPortal =
  | 'inicio'
  | 'ponto'
  | 'historico'
  | 'desempenho'
  | 'documentos'
  | 'comunicados'
  | 'solicitacoes'
  | 'treinamentos'
  | 'jornal'
  | 'instrucoes'
  | 'regulamento'
  | 'mais';

/** Áreas do portal: rótulo, ícone e descrição (usadas no "Mais" e no acesso rápido). */
export const AREAS_PORTAL: Record<Exclude<AreaPortal, 'mais'>, { rotulo: string; texto: string; icone: React.ElementType }> = {
  inicio: { rotulo: 'Início', texto: '', icone: Home },
  ponto: { rotulo: 'Bater ponto', texto: 'Registrar entrada, intervalo e saída', icone: Fingerprint },
  historico: { rotulo: 'Meu histórico', texto: 'Batidas e horas do mês', icone: CalendarDays },
  desempenho: { rotulo: 'Meu desempenho', texto: 'Pontos, nível e medalhas', icone: Award },
  documentos: { rotulo: 'Documentos', texto: 'Contracheques, férias e outros', icone: FileSignature },
  comunicados: { rotulo: 'Comunicados', texto: 'Avisos da empresa para você', icone: Megaphone },
  solicitacoes: { rotulo: 'Fale com o DP', texto: 'Pedidos, dúvidas e contestações', icone: MessageSquareText },
  treinamentos: { rotulo: 'Treinamentos', texto: 'Cursos, provas e certificados', icone: GraduationCap },
  jornal: { rotulo: 'Jornal JMT', texto: 'Notícias da empresa', icone: Newspaper },
  instrucoes: { rotulo: 'Instruções', texto: 'Como fazer cada processo', icone: BookOpen },
  regulamento: { rotulo: 'Regulamento', texto: 'Regras e direitos', icone: ScrollText },
};

const Contador: React.FC<{ n?: number; claro?: boolean }> = ({ n, claro }) =>
  n ? (
    <span
      className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center leading-none ${
        claro ? 'bg-rose-600 text-white border-2 border-white' : 'bg-[#C48229] text-white'
      }`}
    >
      {n > 99 ? '99+' : n}
    </span>
  ) : null;

/** Barra fixa de baixo. */
export const BarraPortal: React.FC<{
  area: AreaPortal;
  contagem: Partial<Record<AreaPortal, number>>;
  onIr: (a: AreaPortal) => void;
}> = ({ area, contagem, onIr }) => {
  const itens: { id: AreaPortal; rotulo: string; icone: React.ElementType; ativoEm: AreaPortal[] }[] = [
    { id: 'inicio', rotulo: 'Início', icone: Home, ativoEm: ['inicio'] },
    { id: 'ponto', rotulo: 'Ponto', icone: Fingerprint, ativoEm: ['ponto', 'historico'] },
    { id: 'documentos', rotulo: 'Documentos', icone: FileSignature, ativoEm: ['documentos'] },
    { id: 'mais', rotulo: 'Mais', icone: LayoutGrid, ativoEm: ['mais', 'desempenho', 'comunicados', 'solicitacoes', 'treinamentos', 'jornal', 'instrucoes', 'regulamento'] },
  ];
  const outros = (['comunicados', 'solicitacoes', 'treinamentos', 'jornal'] as AreaPortal[]).reduce((s, a) => s + (contagem[a] || 0), 0);
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação do portal"
    >
      <div className="max-w-3xl mx-auto flex">
        {itens.map((it) => {
          const ativo = it.ativoEm.includes(area);
          const Icone = it.icone;
          const n = it.id === 'mais' ? outros : contagem[it.id];
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onIr(it.id)}
              aria-current={ativo ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-bold normal-case tracking-normal ${ativo ? 'text-[#92611F]' : 'text-slate-500'}`}
            >
              {ativo && <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-[#C48229]" />}
              <span className="relative">
                <Icone className="w-[22px] h-[22px]" strokeWidth={ativo ? 2.4 : 2} />
                <span className="absolute -top-1.5 -right-2.5">
                  <Contador n={n} claro />
                </span>
              </span>
              {it.rotulo}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/** Lista "Mais": todas as outras áreas + sair deste celular. */
export const MenuMaisPortal: React.FC<{
  contagem: Partial<Record<AreaPortal, number>>;
  onIr: (a: AreaPortal) => void;
  onSair?: () => void;
}> = ({ contagem, onIr, onSair }) => {
  const grupos: { titulo: string; areas: Exclude<AreaPortal, 'mais' | 'inicio'>[] }[] = [
    { titulo: 'Meu ponto', areas: ['ponto', 'historico', 'desempenho'] },
    { titulo: 'Comunicação', areas: ['comunicados', 'solicitacoes', 'jornal'] },
    { titulo: 'Aprender', areas: ['treinamentos', 'instrucoes', 'regulamento'] },
  ];
  return (
    <div className="space-y-4">
      {grupos.map((g) => (
        <section key={g.titulo}>
          <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{g.titulo}</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {g.areas.map((a) => {
              const { rotulo, texto, icone: Icone } = AREAS_PORTAL[a];
              return (
                <button key={a} type="button" onClick={() => onIr(a)} className="w-full px-4 py-3 flex items-center gap-3 text-left normal-case tracking-normal active:bg-slate-50">
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
                    <Icone className="w-[18px] h-[18px]" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-slate-900">{rotulo}</span>
                    <span className="block text-[11px] text-slate-500 truncate">{texto}</span>
                  </span>
                  <Contador n={contagem[a]} />
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {onSair && (
        <button
          type="button"
          onClick={onSair}
          className="w-full py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-600 flex items-center justify-center gap-2 normal-case tracking-normal"
        >
          <LogOut className="w-4 h-4 text-[#C48229]" /> Sair deste celular
        </button>
      )}
    </div>
  );
};

/** Grade de acesso rápido da página de início. */
export const AcessoRapidoPortal: React.FC<{
  contagem: Partial<Record<AreaPortal, number>>;
  onIr: (a: AreaPortal) => void;
}> = ({ contagem, onIr }) => {
  const areas: Exclude<AreaPortal, 'mais' | 'inicio'>[] = ['historico', 'comunicados', 'solicitacoes', 'treinamentos', 'jornal', 'desempenho'];
  return (
    <section>
      <h2 className="px-1 mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Acesso rápido</h2>
      <div className="grid grid-cols-3 gap-2.5">
        {areas.map((a) => {
          const { rotulo, icone: Icone } = AREAS_PORTAL[a];
          return (
            <button
              key={a}
              type="button"
              onClick={() => onIr(a)}
              className="relative bg-white rounded-2xl border border-slate-200 shadow-xs px-2 py-3.5 flex flex-col items-center gap-2 normal-case tracking-normal active:scale-[0.98] transition-transform"
            >
              <span className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center">
                <Icone className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">{rotulo}</span>
              <span className="absolute top-2 right-2">
                <Contador n={contagem[a]} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
