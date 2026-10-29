import React from 'react';
import { Plus, Trash2, Square, CheckSquare } from 'lucide-react';
import type { BlocoDocumento } from '../../utils/documentosPadronizadosApi';

type BlocoCk = Extract<BlocoDocumento, { tipo: 'checklist' }>;

const MODELOS_OPCOES: [string, string[] | undefined][] = [
  ['Caixinha simples', undefined],
  ['Sim / Não', ['Sim', 'Não']],
  ['Sim / Não / N/A', ['Sim', 'Não', 'N/A']],
  ['C / NC / N/A', ['C', 'NC', 'N/A']],
  ['OK / Não OK', ['OK', 'Não OK']],
];

/** Checklist do documento padronizado: itens, tipo de marcação (caixinha simples ou colunas
 *  Sim/Não/N/A, C/NC...) e coluna de observação opcional. */
export const BlocoChecklist: React.FC<{ bloco: BlocoCk; somenteLeitura: boolean; onChange: (b: BlocoCk) => void }> = ({ bloco: b, somenteLeitura, onChange }) => {
  const mudarItem = (i: number, campos: Partial<BlocoCk['itens'][number]>) => onChange({ ...b, itens: b.itens.map((it, k) => (k === i ? { ...it, ...campos } : it)) });
  const chaveOpcoes = (o?: string[]) => (o || []).join('|');
  const modeloAtual = MODELOS_OPCOES.find(([, o]) => chaveOpcoes(o) === chaveOpcoes(b.opcoes));
  const campo = 'bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 disabled:bg-slate-50';

  return (
    <div className="space-y-2">
      <input value={b.titulo || ''} disabled={somenteLeitura} onChange={(e) => onChange({ ...b, titulo: e.target.value || undefined })} placeholder="Título do checklist (opcional) — ex.: Inspeção do veículo antes da saída" className={`${campo} w-full font-semibold`} data-texto-livre />
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {b.opcoes && (
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
            <span className="flex-1">Item</span>
            {b.opcoes.map((o) => (
              <span key={o} className="w-10 text-center">{o}</span>
            ))}
            {b.comObservacao && <span className="w-32">Observação</span>}
            {!somenteLeitura && <span className="w-6" />}
          </div>
        )}
        {b.itens.map((it, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1 border-t border-slate-100 first:border-t-0">
            {!b.opcoes && (
              <button type="button" disabled={somenteLeitura} onClick={() => mudarItem(i, { marcado: !it.marcado || undefined })} className="text-[#92611F] shrink-0" title="Marcar/desmarcar">
                {it.marcado ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
            )}
            <input value={it.texto} disabled={somenteLeitura} onChange={(e) => mudarItem(i, { texto: e.target.value })} placeholder="Item a verificar" className={`${campo} flex-1 min-w-0`} data-texto-livre />
            {b.opcoes?.map((o) => (
              <button key={o} type="button" disabled={somenteLeitura} onClick={() => mudarItem(i, { resposta: it.resposta === o ? undefined : o })} className="w-10 flex justify-center text-[#92611F]" title={o}>
                {it.resposta === o ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
              </button>
            ))}
            {b.opcoes && b.comObservacao && <input value={it.obs || ''} disabled={somenteLeitura} onChange={(e) => mudarItem(i, { obs: e.target.value || undefined })} placeholder="Obs." className={`${campo} w-32`} data-texto-livre />}
            {!somenteLeitura && (
              <button type="button" onClick={() => onChange({ ...b, itens: b.itens.filter((_, k) => k !== i) })} className="p-1 text-slate-300 hover:text-rose-600 shrink-0" title="Tirar item">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!somenteLeitura && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button type="button" onClick={() => onChange({ ...b, itens: [...b.itens, { texto: '' }] })} className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-600 flex items-center gap-1 normal-case tracking-normal">
            <Plus className="w-3.5 h-3.5" /> Item
          </button>
          <select
            value={modeloAtual ? modeloAtual[0] : 'personalizado'}
            onChange={(e) => {
              const m = MODELOS_OPCOES.find(([n]) => n === e.target.value);
              if (m) onChange({ ...b, opcoes: m[1], comObservacao: m[1] ? b.comObservacao : undefined, itens: b.itens.map((it) => ({ ...it, resposta: undefined })) });
            }}
            className={campo}
            title="Como cada item é marcado"
          >
            {MODELOS_OPCOES.map(([n]) => (
              <option key={n}>{n}</option>
            ))}
            {!modeloAtual && <option value="personalizado">{(b.opcoes || []).join(' / ')}</option>}
          </select>
          {b.opcoes && (
            <label className="flex items-center gap-1.5 font-semibold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!!b.comObservacao} onChange={(e) => onChange({ ...b, comObservacao: e.target.checked || undefined })} /> Coluna de observação
            </label>
          )}
        </div>
      )}
    </div>
  );
};
