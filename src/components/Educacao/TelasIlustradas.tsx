import React from 'react';
import type { TelaIlustrada } from '../../utils/educacaoApi';

/** Passo a passo com imagens: cada tela do sistema (com os números marcados) e, embaixo, o que
 *  cada número significa. Usado no Portal de Educação e na Ajuda (F1). Toque na imagem abre
 *  em tamanho real — no celular dá para dar zoom. */
export const TelasIlustradas: React.FC<{ telas: TelaIlustrada[]; compacto?: boolean }> = ({ telas, compacto }) => (
  <div className={compacto ? 'space-y-4' : 'space-y-6'}>
    {telas.map((t, i) => (
      <figure key={t.imagem} className="space-y-2">
        <figcaption className="text-xs font-black text-slate-800">
          {telas.length > 1 && <span className="text-[#C48229]">Tela {i + 1} de {telas.length} · </span>}
          {t.titulo}
        </figcaption>
        <a href={t.imagem} target="_blank" rel="noopener noreferrer" title="Abrir a imagem em tamanho real">
          <img src={t.imagem} alt={t.titulo} loading="lazy" className="w-full rounded-xl border border-slate-200 shadow-xs bg-slate-50" />
        </a>
        <ol className="space-y-1.5">
          {t.marcas.map((m, k) => (
            <li key={k} className="flex gap-2 text-xs text-slate-700 leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-[#C48229] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-px">{k + 1}</span>
              <span>{m}</span>
            </li>
          ))}
        </ol>
      </figure>
    ))}
  </div>
);
