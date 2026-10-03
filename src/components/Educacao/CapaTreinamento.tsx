import React from 'react';
import { GraduationCap, Clock } from 'lucide-react';
import { formatarCargaHoraria } from './certificadoPdf';

// Paletas da capa automática (escolhida pelo título, então cada treinamento fica sempre
// com a mesma cor e treinamentos diferentes se distinguem na lista).
const PALETAS: [string, string, string][] = [
  ['#C48229', '#7A4F17', '#FFE7C2'],
  ['#22252B', '#121316', '#D9A35B'],
  ['#5C4526', '#2B2014', '#E9C891'],
  ['#1F3A3D', '#0F1F21', '#C9A15A'],
  ['#3A2E4A', '#1E1828', '#D9B26B'],
];
function paletaDe(titulo: string) {
  let h = 0;
  for (const ch of titulo) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETAS[h % PALETAS.length];
}

/** Capa do treinamento (proporção 16:9). Com imagem: a foto com o título por cima, sobre um
 *  degradê para dar leitura. Sem imagem: capa automática JMT com o título. */
export const CapaTreinamento: React.FC<{
  titulo: string;
  capa?: string | null;
  cargaHorariaMin?: number;
  /** Selo no canto (ex.: "Concluído"). */
  selo?: React.ReactNode;
  tamanho?: 'pequena' | 'grande';
  className?: string;
}> = ({ titulo, capa, cargaHorariaMin, selo, tamanho = 'pequena', className = '' }) => {
  const [fundo1, fundo2, destaque] = paletaDe(titulo || 'Treinamento');
  const grande = tamanho === 'grande';
  return (
    <div className={`relative w-full aspect-[16/9] overflow-hidden ${className}`} style={capa ? undefined : { background: `linear-gradient(135deg, ${fundo1}, ${fundo2})` }}>
      {capa ? (
        <>
          <img src={capa} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        </>
      ) : (
        <>
          {/* Arcos decorativos e o ícone, no lugar da foto */}
          <svg className="absolute -right-10 -top-10 w-2/3 h-[140%] opacity-20" viewBox="0 0 200 200" aria-hidden="true">
            {[40, 60, 80, 100].map((r) => (
              <circle key={r} cx="160" cy="40" r={r} fill="none" stroke={destaque} strokeWidth="3" />
            ))}
          </svg>
          <GraduationCap className={`absolute ${grande ? 'right-6 top-6 w-16 h-16' : 'right-3 top-3 w-9 h-9'} opacity-30`} style={{ color: destaque }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        </>
      )}
      {selo && <div className="absolute left-3 top-3">{selo}</div>}
      <div className={`absolute inset-x-0 bottom-0 ${grande ? 'p-5' : 'p-3'}`}>
        <p className={`font-black text-white leading-tight drop-shadow ${grande ? 'text-xl sm:text-2xl' : 'text-sm line-clamp-2'}`} style={{ fontFamily: '"Bricolage Grotesque", "Hanken Grotesk", sans-serif' }}>
          {titulo || 'Sem título'}
        </p>
        {cargaHorariaMin ? (
          <p className={`mt-1 flex items-center gap-1 font-semibold ${grande ? 'text-xs' : 'text-[10px]'}`} style={{ color: capa ? '#F3E3C8' : destaque }}>
            <Clock className="w-3 h-3" /> {formatarCargaHoraria(cargaHorariaMin)}
          </p>
        ) : null}
      </div>
    </div>
  );
};
