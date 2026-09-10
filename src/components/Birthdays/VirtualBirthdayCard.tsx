import React from 'react';
import { Cake, Sparkles, Building2, Heart, PartyPopper } from 'lucide-react';
import { BirthdayInfo } from '../../utils/birthdayUtils';

interface VirtualBirthdayCardProps {
  nome: string;
  cargo?: string;
  empresaNome?: string;
  birthdayInfo: BirthdayInfo;
  mensagem: string;
}

export const VirtualBirthdayCard: React.FC<VirtualBirthdayCardProps> = ({
  nome,
  cargo,
  empresaNome = 'Jobson de Moraes Transportes (JMT)',
  birthdayInfo,
  mensagem,
}) => {
  const primeiroNome = nome.trim().split(' ')[0];

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-xl border border-amber-300 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 text-white p-6 sm:p-8">
      {/* Decorative Background Elements */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-black/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-4 right-4 text-white/20">
        <PartyPopper className="w-16 h-16" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-white/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 backdrop-blur-xs rounded-lg">
              <Cake className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-200">
                Cartão Comemorativo de Aniversário
              </div>
              <div className="text-xs font-semibold text-white flex items-center gap-1">
                <Building2 className="w-3 h-3 text-amber-300" />
                <span>{empresaNome}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block text-[11px] font-bold bg-white text-amber-900 px-3 py-1 rounded-full shadow-xs">
              🎂 {birthdayInfo.dataFormatada}
            </span>
          </div>
        </div>

        {/* Celebrant Name & Age */}
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-400/30 text-amber-100 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>
              {birthdayInfo.idadeCompletando
                ? `Completando ${birthdayInfo.idadeCompletando} anos!`
                : 'Feliz Aniversário!'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-xs">
            {nome}
          </h2>
          {cargo && (
            <p className="text-xs text-amber-100/90 font-medium mt-0.5">
              {cargo} • {birthdayInfo.signo}
            </p>
          )}
        </div>

        {/* Message Content Box */}
        <div className="bg-white/95 text-slate-800 rounded-xl p-4 sm:p-5 shadow-inner border border-white/40 space-y-2">
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-700">
            {mensagem}
          </p>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between text-[11px] text-amber-100/80 pt-1">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose-300 fill-rose-300" />
            Com carinho de toda a equipe
          </span>
          <span className="font-semibold text-white">
            Departamento Pessoal & Diretoria
          </span>
        </div>
      </div>
    </div>
  );
};
