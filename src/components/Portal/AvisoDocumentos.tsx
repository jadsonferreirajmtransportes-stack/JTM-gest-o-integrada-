import React, { useEffect, useState } from 'react';
import { FileSignature, ChevronRight, X, BellRing } from 'lucide-react';
import type { DocumentoPortal } from '../../utils/portalColaboradorApi';
import { rotuloDocumentoPortal } from './PortalDocumentos';

// ============================================================================
// Aviso de documento novo no portal: cartão na página de início com cada
// documento que falta assinar + janela ao entrar quando chegou documento que
// este celular ainda não avisou (guardado no aparelho, por link).
// ============================================================================

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const ehRecente = (iso: string) => Date.now() - Date.parse(iso) < 7 * 86400000;
const chaveVistos = (token: string) => `jmt-avisos-docs-${token.slice(0, 16)}`;

function lerVistos(token: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(chaveVistos(token)) || '[]'));
  } catch {
    return new Set();
  }
}
function gravarVistos(token: string, ids: string[]) {
  try {
    localStorage.setItem(chaveVistos(token), JSON.stringify(ids.slice(-200)));
  } catch {
    /* navegador sem armazenamento — o aviso só aparece de novo na próxima entrada */
  }
}

/** Cartão da página de início: documentos para assinar, cada um abre direto. */
export const CartaoDocumentosPendentes: React.FC<{ documentos: DocumentoPortal[]; onAbrir: (id: string) => void }> = ({ documentos, onAbrir }) => {
  if (!documentos.length) return null;
  return (
    <section className="rounded-2xl border-2 border-[#C48229] bg-amber-50 shadow-xs overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <BellRing className="w-4 h-4 text-[#C48229]" />
        <h2 className="text-sm font-black text-slate-900">
          {documentos.length === 1 ? 'Você tem 1 documento para assinar' : `Você tem ${documentos.length} documentos para assinar`}
        </h2>
      </div>
      <div className="divide-y divide-amber-100 bg-white">
        {documentos.map((d) => (
          <button key={d.id} type="button" onClick={() => onAbrir(d.id)} className="w-full text-left normal-case tracking-normal px-4 py-3 flex items-center gap-3 hover:bg-amber-50/50">
            <FileSignature className="w-5 h-5 text-[#C48229] shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wide text-[#92611F]">{rotuloDocumentoPortal(d)}</span>
              <span className="block text-sm font-bold text-slate-900 leading-snug line-clamp-2">{d.titulo}</span>
              <span className="block text-[11px] text-slate-500">Recebido em {dataCurta(d.criadoEm)}</span>
            </span>
            {ehRecente(d.criadoEm) && <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0">Novo</span>}
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        ))}
      </div>
    </section>
  );
};

/** Janela ao entrar no portal quando chegou documento que este celular ainda não avisou. */
export const JanelaDocumentoNovo: React.FC<{ token: string; documentos: DocumentoPortal[]; onAbrir: (id: string) => void }> = ({ token, documentos, onAbrir }) => {
  const [novos, setNovos] = useState<DocumentoPortal[]>([]);

  useEffect(() => {
    if (!documentos.length) return;
    const vistos = lerVistos(token);
    const naoAvisados = documentos.filter((d) => !vistos.has(d.id));
    if (!naoAvisados.length) return;
    setNovos(naoAvisados);
    gravarVistos(token, [...vistos, ...naoAvisados.map((d) => d.id)]);
  }, [token, documentos]);

  if (!novos.length) return null;
  const fechar = () => setNovos([]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-3" onClick={fechar}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-[#C48229] to-[#92611F] p-5 text-white relative">
          <button type="button" onClick={fechar} className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20" title="Fechar">
            <X className="w-4 h-4" />
          </button>
          <BellRing className="w-8 h-8" />
          <h2 className="text-lg font-black mt-2 leading-tight">{novos.length === 1 ? 'Você tem um documento novo' : `Você tem ${novos.length} documentos novos`}</h2>
          <p className="text-xs text-white/85 mt-1">Confira e assine pelo celular — leva menos de um minuto.</p>
        </div>
        <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto overflow-x-hidden">
          {novos.map((d) => (
            <li key={d.id} className="px-5 py-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">{rotuloDocumentoPortal(d)}</p>
              <p className="text-sm font-bold text-slate-900 leading-snug">{d.titulo}</p>
            </li>
          ))}
        </ul>
        <div className="p-4 flex gap-2">
          <button type="button" onClick={fechar} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
            Depois
          </button>
          <button
            type="button"
            onClick={() => {
              const primeiro = novos[0];
              fechar();
              onAbrir(primeiro.id);
            }}
            className="flex-1 py-3 rounded-xl bg-[#C48229] hover:bg-[#92611F] text-white text-sm font-black"
          >
            Ver agora
          </button>
        </div>
      </div>
    </div>
  );
};
