import React, { useState } from 'react';
import { Compass, Target, ShieldCheck, ChevronRight, Sparkles, Award } from 'lucide-react';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';
import { StrategicGuidelinesModal } from './StrategicGuidelinesModal';

interface StrategicGuidelinesBannerProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export const StrategicGuidelinesBanner: React.FC<StrategicGuidelinesBannerProps> = ({
  variant = 'dark',
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { proposito, missao, pilaresOperacionais } = STRATEGIC_GUIDELINES;

  if (variant === 'light') {
    return (
      <>
        <div
          className={`bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-[#8A6A39] border border-amber-500/20 shrink-0 mt-0.5">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-[#8A6A39] border border-amber-200">
                  Propósito JMT
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Por que existimos:
                </span>
              </div>
              <p className="text-sm font-extrabold text-slate-900 leading-snug">
                "{proposito.frase}"
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-slate-600 font-semibold">
                <span className="text-slate-400">Pilares:</span>
                {pilaresOperacionais.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px]"
                  >
                    <ShieldCheck className="w-3 h-3 text-[#B38F4F]" />
                    {p.nome}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0 shadow-2xs"
          >
            <span>Ver Norteadores Completos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <StrategicGuidelinesModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-[#181614] to-slate-900 text-white p-5 sm:p-6 border border-[#B38F4F]/30 shadow-md ${className}`}
      >
        <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none flex items-center pr-6">
          <Compass className="w-48 h-48 text-[#B38F4F]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B38F4F]/20 text-[#E5C178] border border-[#B38F4F]/40 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Compass className="w-3.5 h-3.5 text-[#E5C178]" />
              <span>Norteadores Estratégicos JMT</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Propósito:
                </span>
                <span className="text-base sm:text-lg font-black text-white leading-snug">
                  "{proposito.frase}"
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-normal pt-0.5">
                <span className="text-amber-200/90 font-semibold">Missão:</span> {missao.frase}
              </p>
            </div>

            {/* Operational Pillars Badge Line */}
            <div className="flex items-center gap-1.5 sm:gap-2 pt-2 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Pilares Operacionais:
              </span>
              {pilaresOperacionais.map((p, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 text-[11px] font-semibold"
                >
                  <ShieldCheck className="w-3 h-3 text-[#E5C178]" />
                  {p.nome}
                </span>
              ))}
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B38F4F] hover:bg-[#8A6A39] text-slate-950 font-extrabold text-xs transition-all shadow-md active:scale-98"
            >
              <Award className="w-4 h-4" />
              <span>Missão, Visão e Valores</span>
            </button>
          </div>
        </div>
      </div>

      <StrategicGuidelinesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
