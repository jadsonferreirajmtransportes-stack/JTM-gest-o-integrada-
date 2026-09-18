import React from 'react';
import { JMT_LOGO_BASE64 } from '../../data/jmtLogoBase64';

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
export const JmtLogoSymbol: React.FC<{
  className?: string;
  size?: number;
  isDark?: boolean;
}> = ({ className = '', size = 38, isDark = false }) => {
  const mainStroke = isDark ? '#FFFFFF' : '#111111';
  const bronzeStroke = '#B38F4F';

  return (
    <svg
      viewBox="0 0 140 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size * 1.55, height: size }}
      className={`shrink-0 select-none ${className}`}
      aria-label="Símbolo Jobson de Moraes Transportes (JM)"
    >
      {/* 
        Geometry definition:
        Base line: y = 72
        Peak 1 apex: (58, 18)
        Peak 2 apex: (92, 18)
        Inner intersection: (75, 45)
        Inner triangle base: (58, 72) to (92, 72)
        Peak 2 right leg: (92, 18) to (126, 72)
        Bronze line: horizontal tail (12, 72) -> (24, 72) -> ascends to Peak 1 (58, 18)
      */}

      {/* Traço Bronze: a rota e o movimento (Início horizontal e subida ao Vértice 1) */}
      <path
        d="M 12 72 L 28 72 L 58 18"
        stroke={bronzeStroke}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Vértice 1 descendo até a base direita do triângulo central */}
      <path
        d="M 58 18 L 92 72"
        stroke={mainStroke}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Base do triângulo central: solidez e montanhas */}
      <path
        d="M 58 72 L 92 72"
        stroke={mainStroke}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Vértice 2 subindo do triângulo central até o pico 2 */}
      <path
        d="M 58 72 L 92 18"
        stroke={mainStroke}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Descida do pico 2 até o solo direito */}
      <path
        d="M 92 18 L 126 72"
        stroke={mainStroke}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

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
    return <JmtLogoSymbol size={iconSize} isDark={isDark} className={className} />;
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
        <JmtLogoSymbol size={22} isDark={isDark} />
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
        <JmtLogoSymbol size={iconSize} isDark={isDark} />
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
      <JmtLogoSymbol size={iconSize} isDark={isDark} />
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
