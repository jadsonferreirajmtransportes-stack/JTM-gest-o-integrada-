import React, { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface HumanVerificationFieldProps {
  onValidChange: (valid: boolean) => void;
  error?: string;
}

/**
 * Simple visible "prove you're human" challenge (basic arithmetic) for the
 * highest-risk public form (candidate admission — collects CPF, address and
 * banking data). Combined with the honeypot + time trap in botProtection.ts,
 * this stops generic bots without requiring any external CAPTCHA
 * provider/API key or account setup.
 */
export const HumanVerificationField: React.FC<HumanVerificationFieldProps> = ({
  onValidChange,
  error,
}) => {
  const challenge = useMemo(() => {
    const a = 2 + Math.floor(Math.random() * 7);
    const b = 2 + Math.floor(Math.random() * 7);
    return { a, b, answer: a + b };
  }, []);
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    onValidChange(v.trim() !== '' && parseInt(v, 10) === challenge.answer);
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
      <label className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#B38F4F] shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="text-xs text-slate-300">
            <strong className="text-white block mb-0.5">Verificação Anti-Robô</strong>
            Para confirmar que um humano está enviando este formulário, responda: quanto é{' '}
            <strong className="text-amber-300">
              {challenge.a} + {challenge.b}
            </strong>
            ?
          </div>
          <input
            type="text"
            inputMode="numeric"
            required
            value={value}
            onChange={handleChange}
            placeholder="Digite o resultado"
            className="w-full sm:w-40 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-[#B38F4F]"
          />
        </div>
      </label>
      {error && <span className="text-[11px] text-rose-400 block pl-8 mt-2">{error}</span>}
    </div>
  );
};
