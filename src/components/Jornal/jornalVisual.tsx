import React from 'react';
import { Newspaper } from 'lucide-react';
import type { BlocoNoticia, TipoReacao } from '../../utils/jornalApi';
import { REACOES } from '../../utils/jornalApi';

// Paletas da capa automática (escolhida pela categoria — cada editoria fica com a sua cor).
const PALETAS: Record<string, [string, string]> = {
  Conquistas: ['#C48229', '#7A4F17'],
  'Nossa equipe': ['#5C4526', '#2B2014'],
  Segurança: ['#1F3A3D', '#0F1F21'],
  Qualidade: ['#22252B', '#121316'],
  Clientes: ['#3A2E4A', '#1E1828'],
  Eventos: ['#92611F', '#3D2A10'],
  Aniversários: ['#B4532A', '#5C2410'],
};

export function dataNoticia(iso?: string | null, comHora = false): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', ...(comHora ? { hour: '2-digit', minute: '2-digit' } : {}) });
}

/** Capa da notícia (16:9). Com imagem: a foto com a editoria e o título por cima. Sem imagem:
 *  capa automática JMT na cor da editoria. */
export const CapaNoticia: React.FC<{ titulo: string; categoria: string; capa?: string | null; tamanho?: 'pequena' | 'grande'; className?: string }> = ({
  titulo,
  categoria,
  capa,
  tamanho = 'pequena',
  className = '',
}) => {
  const [c1, c2] = PALETAS[categoria] || ['#C48229', '#5C4526'];
  const grande = tamanho === 'grande';
  return (
    <div className={`relative w-full aspect-[16/9] overflow-hidden ${className}`} style={capa ? undefined : { background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      {capa ? (
        <>
          <img src={capa} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        </>
      ) : (
        <>
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full border-[18px] border-white/10" />
          <div className="absolute right-16 top-20 w-28 h-28 rounded-full border-[10px] border-white/10" />
          <Newspaper className={`absolute ${grande ? 'right-6 top-6 w-10 h-10' : 'right-4 top-4 w-7 h-7'} text-white/40`} />
          <p className={`absolute left-4 top-4 font-black tracking-[0.2em] text-white/70 ${grande ? 'text-xs' : 'text-[9px]'}`}>JORNAL JMT</p>
        </>
      )}
      <div className={`absolute inset-x-0 bottom-0 ${grande ? 'p-5 sm:p-6' : 'p-4'}`}>
        <span className="inline-block text-[10px] font-black uppercase tracking-wide bg-white/90 text-[#7A4F17] px-2 py-0.5 rounded">{categoria}</span>
        <h3 className={`mt-1.5 font-black text-white leading-tight ${grande ? 'text-xl sm:text-2xl' : 'text-sm line-clamp-3'}`} style={{ textShadow: '0 1px 8px rgba(0,0,0,.35)' }}>
          {titulo || 'Título da notícia'}
        </h3>
      </div>
    </div>
  );
};

/** Corpo da notícia: parágrafos (linha em branco separa) e grupos de imagens com legenda. */
export const CorpoNoticia: React.FC<{ blocos: BlocoNoticia[] }> = ({ blocos }) => (
  <div className="space-y-4">
    {blocos.map((b) =>
      b.tipo === 'texto' ? (
        <div key={b.id} className="space-y-3">
          {b.texto
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">
                {p}
              </p>
            ))}
        </div>
      ) : b.telas.length > 0 ? (
        <div key={b.id} className={`grid gap-3 ${b.telas.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {b.telas.map((t, i) => (
            <figure key={`${t.imagem}-${i}`} className="space-y-1.5">
              <a href={t.imagem} target="_blank" rel="noopener noreferrer" title="Abrir a imagem em tamanho real">
                <img src={t.imagem} alt={t.titulo} loading="lazy" className="w-full rounded-xl border border-slate-200 bg-slate-50 object-cover" />
              </a>
              {(t.titulo || t.marcas.some((m) => m.trim())) && (
                <figcaption className="text-xs text-slate-500 leading-snug">
                  {t.titulo && <span className="font-semibold text-slate-600">{t.titulo}</span>}
                  {t.marcas.filter((m) => m.trim()).length > 0 && <span> — {t.marcas.filter((m) => m.trim()).join(' ')}</span>}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : null
    )}
  </div>
);

export const totalReacoes = (r: Partial<Record<TipoReacao, number>>) => Object.values(r).reduce((s, n) => s + (n || 0), 0);

/** Resumo "👍👏 12" das reações. */
export const ResumoReacoes: React.FC<{ reacoes: Partial<Record<TipoReacao, number>> }> = ({ reacoes }) => {
  const total = totalReacoes(reacoes);
  if (!total) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span>{REACOES.filter((r) => reacoes[r.tipo]).map((r) => r.emoji).join('')}</span>
      <span>{total}</span>
    </span>
  );
};
