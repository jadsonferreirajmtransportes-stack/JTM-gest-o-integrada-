import React, { useState } from 'react';
import { ImagePlus, Loader2, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react';
import type { TelaIlustrada } from '../../utils/educacaoApi';
import { enviarMaterialTreinamento } from '../../utils/educacaoApi';

const LIMITE_MB = 8;

/** Imagens de um conteúdo do treinamento: enviar (várias de uma vez), legenda, explicação
 *  numerada opcional (uma linha por item — vira 1, 2, 3 embaixo da imagem), ordem e remover.
 *  As imagens vão para o espaço público "treinamentos" (não usar foto com dado pessoal). */
export const EditorImagens: React.FC<{ telas: TelaIlustrada[]; onChange: (t: TelaIlustrada[]) => void; textoBotao?: string }> = ({ telas, onChange, textoBotao = 'Adicionar imagem' }) => {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    setErro(null);
    const novas: TelaIlustrada[] = [];
    const lista = Array.from(arquivos);
    for (const [i, arq] of lista.entries()) {
      if (!arq.type.startsWith('image/')) {
        setErro(`"${arq.name}" não é uma imagem.`);
        continue;
      }
      if (arq.size > LIMITE_MB * 1024 * 1024) {
        setErro(`"${arq.name}" passa de ${LIMITE_MB}MB — use uma imagem menor.`);
        continue;
      }
      setEnviando(lista.length > 1 ? `Enviando ${i + 1} de ${lista.length}...` : 'Enviando...');
      try {
        const url = await enviarMaterialTreinamento(arq);
        novas.push({ titulo: arq.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), imagem: url, marcas: [] });
      } catch (err) {
        setErro(err instanceof Error ? err.message : `Não foi possível enviar "${arq.name}".`);
      }
    }
    setEnviando(null);
    if (novas.length) onChange([...telas, ...novas]);
  };

  const atualizar = (i: number, parcial: Partial<TelaIlustrada>) => onChange(telas.map((t, k) => (k === i ? { ...t, ...parcial } : t)));
  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= telas.length) return;
    const nova = [...telas];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    onChange(nova);
  };

  return (
    <div className="space-y-2">
      {telas.map((t, i) => (
        <div key={`${t.imagem}-${i}`} className="flex gap-2.5 p-2 bg-white border border-slate-200 rounded-lg">
          <a href={t.imagem} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img src={t.imagem} alt={t.titulo} className="w-28 h-20 object-cover rounded-md border border-slate-200 bg-slate-50" />
          </a>
          <div className="flex-1 min-w-0 space-y-1.5">
            <input value={t.titulo} onChange={(e) => atualizar(i, { titulo: e.target.value })} placeholder="Legenda da imagem" className="w-full p-1.5 border border-slate-300 rounded-md text-xs" />
            <textarea
              value={t.marcas.join('\n')}
              onChange={(e) => atualizar(i, { marcas: e.target.value.split('\n') })}
              onBlur={() => atualizar(i, { marcas: t.marcas.map((m) => m.trim()).filter(Boolean) })}
              rows={2}
              placeholder="Explicação (opcional) — uma linha por item, vira 1, 2, 3 embaixo da imagem"
              className="w-full p-1.5 border border-slate-300 rounded-md text-xs"
            />
          </div>
          <div className="flex flex-col gap-0.5 shrink-0">
            <button type="button" onClick={() => mover(i, -1)} className="p-1 text-slate-400 hover:text-slate-700" title="Subir">
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => mover(i, 1)} className="p-1 text-slate-400 hover:text-slate-700" title="Descer">
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => onChange(telas.filter((_, k) => k !== i))} className="p-1 text-slate-400 hover:text-rose-600" title="Remover imagem">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-[#92611F] bg-white ${enviando ? 'opacity-60' : 'cursor-pointer hover:border-[#C48229]'}`}>
        {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
        {enviando || textoBotao}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" disabled={!!enviando} onChange={(e) => { enviar(e.target.files); e.target.value = ''; }} />
      </label>
      {erro && (
        <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
          {erro}
          <button type="button" onClick={() => setErro(null)} className="p-0.5">
            <X className="w-3 h-3" />
          </button>
        </p>
      )}
    </div>
  );
};
