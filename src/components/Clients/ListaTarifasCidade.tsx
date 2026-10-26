import React, { useState } from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { FaixaTarifaCidade } from '../../types';

const SEM_FAIXA = 'Sem faixa';
const faixaDe = (t: FaixaTarifaCidade) => t.raio || SEM_FAIXA;

/** Lista editável da tabela de frete por cidade (cidade, raio, até 10 kg, kg excedente, km e
 *  prazo de entrega), com o atalho "Prazo por faixa" — usada nas duas tabelas do cadastro do
 *  cliente (a principal/Aéreo no ClientFormModal e a do Rodoviário no TabelaFreteEditor). */
export const ListaTarifasCidade: React.FC<{ tarifas: FaixaTarifaCidade[]; onChange: (tarifas: FaixaTarifaCidade[]) => void }> = ({ tarifas, onChange }) => {
  const [prazoPorFaixaAberto, setPrazoPorFaixaAberto] = useState(false);
  if (!tarifas.length) return null;

  const atualizar = (index: number, campo: keyof FaixaTarifaCidade, valor: any) => onChange(tarifas.map((t, i) => (i === index ? { ...t, [campo]: valor } : t)));
  const remover = (index: number) => onChange(tarifas.filter((_, i) => i !== index));

  const faixas: string[] = Array.from(new Set<string>(tarifas.map(faixaDe)));
  const semPrazo = tarifas.filter((t) => !t.prazo?.trim()).length;
  const prazoDaFaixa = (faixa: string) => {
    const prazos = Array.from(new Set(tarifas.filter((t) => faixaDe(t) === faixa).map((t) => t.prazo || '')));
    return prazos.length === 1 ? prazos[0] : '';
  };
  const aplicarPrazoNaFaixa = (faixa: string, prazo: string) => onChange(tarifas.map((t) => (faixaDe(t) === faixa ? { ...t, prazo: prazo.trim() || undefined } : t)));

  const campo = 'w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-900';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className={`text-[10px] font-semibold ${semPrazo ? 'text-amber-700' : 'text-emerald-700'}`}>
          {semPrazo ? `${semPrazo} cidade(s) sem prazo de entrega — o prazo sai na proposta e no Excel.` : 'Todas as cidades com prazo de entrega.'}
        </p>
        <button
          type="button"
          onClick={() => setPrazoPorFaixaAberto((v) => !v)}
          className={`text-[11px] border px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium ${prazoPorFaixaAberto ? 'bg-amber-50 border-[#C48229] text-[#92611F]' : 'bg-white hover:bg-amber-50 text-[#92611F] border-amber-200'}`}
          title="Preencher o prazo de entrega de todas as cidades de uma faixa de uma vez"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Prazo por faixa</span>
        </button>
      </div>

      {prazoPorFaixaAberto && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 space-y-1.5">
          <p className="text-[10px] text-amber-900">
            Digite o prazo de cada faixa (ex.: <b>24HS</b>, <b>48HS</b>, <b>D+2</b>) — vale para todas as cidades da faixa. Depois dá para ajustar uma cidade específica na lista.
          </p>
          {faixas.map((faixa) => (
            <div key={faixa} className="grid grid-cols-[1fr_110px] gap-2 items-center">
              <span className="text-[11px] text-slate-700 truncate" title={faixa}>
                {faixa} <span className="text-slate-400">({tarifas.filter((t) => faixaDe(t) === faixa).length})</span>
              </span>
              <input
                type="text"
                defaultValue={prazoDaFaixa(faixa)}
                onBlur={(e) => e.target.value !== prazoDaFaixa(faixa) && aplicarPrazoNaFaixa(faixa, e.target.value)}
                placeholder={prazoDaFaixa(faixa) ? '' : 'variado / vazio'}
                className="w-full bg-white border border-amber-200 rounded px-2 py-1.5 text-[11px] text-slate-900"
              />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {tarifas.map((tarifa, idx) => (
          <div key={tarifa.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <input type="text" value={tarifa.cidade} onChange={(e) => atualizar(idx, 'cidade', e.target.value)} placeholder="Cidade" className={campo} />
              <input type="text" value={tarifa.raio} onChange={(e) => atualizar(idx, 'raio', e.target.value)} placeholder="Raio / Faixa (Ex: Capital, Até 300km)" className={campo} />
            </div>
            <div className="grid grid-cols-[1fr_1fr_0.8fr_0.9fr_auto] gap-1.5 items-center">
              <input type="number" step="0.01" value={tarifa.valorAte10Kg} onChange={(e) => atualizar(idx, 'valorAte10Kg', Number(e.target.value))} placeholder="Até 10kg (R$)" className={campo} />
              <input type="number" step="0.01" value={tarifa.valorKgExcedente} onChange={(e) => atualizar(idx, 'valorKgExcedente', Number(e.target.value))} placeholder="Kg exc. (R$)" className={campo} />
              <input type="number" value={tarifa.distanciaKm ?? ''} onChange={(e) => atualizar(idx, 'distanciaKm', e.target.value ? Number(e.target.value) : undefined)} placeholder="Km" className={campo} />
              <input type="text" value={tarifa.prazo ?? ''} onChange={(e) => atualizar(idx, 'prazo', e.target.value || undefined)} placeholder="Prazo (24HS)" title="Prazo de entrega desta cidade" className={campo} />
              <button type="button" onClick={() => remover(idx)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded transition-colors justify-self-end" title="Remover Cidade">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
