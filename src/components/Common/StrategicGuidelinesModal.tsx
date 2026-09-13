import React from 'react';
import {
  X,
  Compass,
  Target,
  Eye,
  HeartHandshake,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Award,
  Users,
  MessageSquare,
  Flame,
  FileText,
} from 'lucide-react';
import { STRATEGIC_GUIDELINES } from '../../data/strategicGuidelines';
import { JmtLogo } from '../Brand/JmtLogo';

interface StrategicGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategicGuidelinesModal: React.FC<StrategicGuidelinesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const { proposito, missao, visao, valores, pilaresOperacionais, assinatura } = STRATEGIC_GUIDELINES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-white p-6 sm:p-7 relative border-b border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-[#8A6A39] shrink-0">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8A6A39]">
                    Norteadores Estratégicos Institucionais
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">04/09/2026</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                  Missão, Visão e Valores — JMT
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Jobson de Moraes Transportes Ltda • Pilares que orientam decisões, cultura e práticas operacionais.
                </p>
              </div>
            </div>

            <div className="hidden md:block">
              <JmtLogo variant="compact" theme="light" iconSize={32} />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 custom-scrollbar">
          {/* 1. Propósito (Por que existimos) */}
          <div className="bg-linear-to-r from-amber-50 to-orange-50/40 rounded-2xl p-5 sm:p-6 border border-amber-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-900 shrink-0 mt-0.5">
                <Compass className="w-6 h-6 text-[#8A6A39]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#8A6A39]">
                    {proposito.titulo}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    • {proposito.subtitulo}
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                  "{proposito.frase}"
                </p>
              </div>
            </div>
          </div>

          {/* 2. Missão & Visão (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Missão */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-sky-100 text-sky-800">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-sky-900 block">
                      {missao.titulo}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      {missao.subtitulo}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium mt-3">
                  {missao.frase}
                </p>
              </div>
            </div>

            {/* Visão */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900 block">
                      {visao.titulo}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      {visao.subtitulo}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium mt-3">
                  {visao.frase}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Valores (6 Cards) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-[#B38F4F]" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Nossos Valores
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {valores.map((val, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-[#B38F4F]/15 text-[#8A6A39] text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {val.nome}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-7">
                    {val.descricao}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Pilares Operacionais */}
          <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <span className="text-xs font-black uppercase tracking-widest text-[#8A6A39]">
                Pilares Operacionais
              </span>
              <span className="text-[11px] text-slate-400">Diretriz de Execução Diária</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {pilaresOperacionais.map((pilar, pIdx) => (
                <div
                  key={pIdx}
                  className="bg-white border border-slate-200 shadow-xs rounded-xl p-3 text-center flex flex-col justify-center"
                >
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {pilar.nome}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 leading-tight">
                    {pilar.descricao}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Tom de Voz & Personalidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-100 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 block mb-0.5 uppercase tracking-wide text-[10px]">
                Personalidade
              </span>
              <p className="text-slate-600 font-medium">{STRATEGIC_GUIDELINES.personalidade}</p>
            </div>
            <div>
              <span className="font-bold text-slate-900 block mb-0.5 uppercase tracking-wide text-[10px]">
                Tom de Voz
              </span>
              <p className="text-slate-600 font-medium">{STRATEGIC_GUIDELINES.tomDeVoz}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-medium italic">
            {assinatura}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#B38F4F] hover:bg-[#8A6A39] text-white text-xs font-bold transition-all shrink-0 shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
