import React from 'react';
import { JMT_LOGO_BASE64, JMT_ICON_BASE64, JMT_ICON_DARK_BASE64 } from '../../data/jmtLogoBase64';

export interface JmtLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'seal';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  iconSize?: number;
}

/**
 * Official JMT Logo Component based on:
 * - Brand Manual: Manual de Identidade Visual Jobson de Moraes Transportes (Ed. 01 · 2026)
 * - Official Vector Asset: SELO.png
 *
 * Official Palette:
 * - Bronze JMT: #B38F4F
 * - Bronze Profundo: #8A6A39
 * - Grafite: #111111
 * - Branco: #FFFFFF
 * - Areia: #F4EEE1
 * - Névoa: #6E6A62
 * - Petróleo: #28464E
 */

/** Só o símbolo (sem o texto), recortado direto do arquivo oficial da marca — usado em todo
 *  lugar que precisa apenas do glifo (ícone, selo, ou ao lado do texto desenhado à parte nas
 *  variantes "compact"/"full" em tema escuro). `JMT_ICON_DARK_BASE64` é o mesmo recorte com o
 *  traço preto invertido para branco (o bronze permanece igual, já visível em fundo escuro). */
const JmtIconImage: React.FC<{
  className?: string;
  size?: number;
  isDark?: boolean;
}> = ({ className = '', size = 38, isDark = false }) => (
  <img
    src={isDark ? JMT_ICON_DARK_BASE64 : JMT_ICON_BASE64}
    alt="Jobson de Moraes Transportes"
    style={{ height: size }}
    className={`w-auto shrink-0 select-none ${className}`}
  />
);

export const JmtLogo: React.FC<JmtLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  iconSize = 36,
}) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-[#111111]';
  const subTextColor = isDark ? 'text-slate-300' : 'text-[#111111]';

  if (variant === 'icon') {
    return <JmtIconImage size={iconSize} isDark={isDark} className={className} />;
  }

  if (variant === 'seal') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${
          isDark
            ? 'bg-[#111111] border-[#B38F4F]/40 text-white'
            : 'bg-[#F4EEE1] border-[#B38F4F]/30 text-[#111111]'
        } ${className}`}
      >
        <JmtIconImage size={22} isDark={isDark} />
        <div className="flex flex-col">
          <span
            className={`text-[10px] font-bold tracking-[0.22em] uppercase leading-tight ${
              isDark ? 'text-[#B38F4F]' : 'text-[#8A6A39]'
            }`}
          >
            Logística de Saúde
          </span>
          <span className="text-[9px] font-medium tracking-wider opacity-80 leading-none">
            RDC 430/2020 · ANVISA
          </span>
        </div>
      </div>
    );
  }

  // Em tema claro (documentos gerados: fichas impressas/PDF, exportações, telas públicas
  // sobre fundo branco), usa a imagem oficial da marca (fornecida pela empresa) em vez de
  // recriar o logotipo com CSS — garante que "JOBSON DE MORAES / TRANSPORTES" saia idêntico
  // ao original, incluindo a tipografia própria da marca que não dá pra replicar com fontes
  // web. Tema escuro continua usando o símbolo desenhado (não temos uma versão clara da
  // imagem oficial pra fundos escuros, como o cabeçalho do sidebar).
  if (!isDark && (variant === 'compact' || variant === 'full')) {
    // `iconSize` antes media só o símbolo (ícone), com o texto "JOBSON DE MORAES/TRANSPORTES"
    // desenhado ao lado em fonte própria — por isso tinha peso visual bem maior que o número
    // sozinho sugere. A imagem real já traz o texto dentro dela, então precisa de uma altura
    // bem maior que `iconSize` pra manter o mesmo tamanho aparente de antes (proporção da logo
    // oficial: ~2.66:1 largura/altura).
    return (
      <div className={`inline-flex items-center ${className}`}>
        <img
          src={JMT_LOGO_BASE64}
          alt="Jobson de Moraes Transportes"
          style={{ height: iconSize * 1.8 }}
          className="w-auto select-none"
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <JmtIconImage size={iconSize} isDark={isDark} />
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline gap-1">
            <span className={`font-extrabold text-sm sm:text-base tracking-tight leading-none ${textColor}`}>
              JMT
            </span>
            <span className="text-[10px] font-bold text-[#B38F4F] tracking-wider uppercase">
              Transportes
            </span>
          </div>
          <span className="text-[9px] font-medium tracking-[0.16em] uppercase text-[#6E6A62] mt-0.5 leading-none">
            Logística de Saúde
          </span>
        </div>
      </div>
    );
  }

  // variant === 'full' (tema escuro)
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <JmtIconImage size={iconSize} isDark={isDark} />
      <div className="flex flex-col justify-center select-none">
        <span
          className={`font-black tracking-[-0.01em] uppercase text-sm sm:text-base leading-tight ${textColor}`}
          style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
        >
          Jobson de Moraes
        </span>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className={`text-[9px] sm:text-[10px] font-bold tracking-[0.28em] uppercase ${
              isDark ? 'text-slate-300' : 'text-[#111111]'
            }`}
            style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
          >
            Transportes
          </span>
          <span className="text-[8px] font-semibold tracking-wider text-[#B38F4F] uppercase">
            Saúde
          </span>
        </div>
      </div>
    </div>
  );
};
