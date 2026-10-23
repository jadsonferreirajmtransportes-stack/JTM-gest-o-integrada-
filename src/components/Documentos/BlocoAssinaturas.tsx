import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { BlocoDocumento } from '../../utils/documentosPadronizadosApi';

type BlocoAss = Extract<BlocoDocumento, { tipo: 'assinaturas' }>;
type Pessoa = BlocoAss['pessoas'][number];

export const MAX_ASSINATURAS = 6;

/** Bloco de assinaturas do documento padronizado: cada pessoa vira, no PDF/Word, um espaço
 *  com a linha para assinar, nome e cargo embaixo e (opcional) o campo de data. */
export const BlocoAssinaturas: React.FC<{ bloco: BlocoAss; somenteLeitura: boolean; onChange: (b: BlocoAss) => void }> = ({ bloco: b, somenteLeitura, onChange }) => {
  const mudar = (i: number, campos: Partial<Pessoa>) => onChange({ ...b, pessoas: b.pessoas.map((p, k) => (k === i ? { ...p, ...campos } : p)) });
  const campo = 'w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 disabled:bg-slate-50';

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {b.pessoas.map((p, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input value={p.papel} disabled={somenteLeitura} onChange={(e) => mudar(i, { papel: e.target.value })} placeholder="Papel — ex.: Elaborado por" className={`${campo} font-bold text-[#92611F]`} />
              {!somenteLeitura && b.pessoas.length > 1 && (
                <button type="button" title="Tirar esta assinatura" onClick={() => onChange({ ...b, pessoas: b.pessoas.filter((_, k) => k !== i) })} className="p-1.5 text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="h-7 border-b border-slate-400" aria-hidden />
            <input value={p.nome} disabled={somenteLeitura} onChange={(e) => mudar(i, { nome: e.target.value })} placeholder="Nome (em branco = preencher à mão)" className={campo} />
            <input value={p.cargo || ''} disabled={somenteLeitura} onChange={(e) => mudar(i, { cargo: e.target.value || undefined })} placeholder="Cargo / área (opcional)" className={campo} />
            {b.comData && (
              <input value={p.data || ''} disabled={somenteLeitura} onChange={(e) => mudar(i, { data: e.target.value || undefined })} placeholder="Data (em branco = ___/___/_____)" className={campo} />
            )}
          </div>
        ))}
      </div>
      {!somenteLeitura && (
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {b.pessoas.length < MAX_ASSINATURAS && (
            <button
              type="button"
              onClick={() => onChange({ ...b, pessoas: [...b.pessoas, { papel: '', nome: '' }] })}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1 normal-case tracking-normal"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar assinatura
            </button>
          )}
          <label className="flex items-center gap-1.5 font-semibold text-slate-600 cursor-pointer">
            <input type="checkbox" checked={!!b.comData} onChange={(e) => onChange({ ...b, comData: e.target.checked })} /> Campo de data
          </label>
        </div>
      )}
    </div>
  );
};
