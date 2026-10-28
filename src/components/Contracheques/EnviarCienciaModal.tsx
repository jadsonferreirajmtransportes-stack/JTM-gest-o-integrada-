import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Search, FileSignature, CheckCircle2 } from 'lucide-react';
import { Colaborador } from '../../types';
import { CampoAssinaturaPdf, CategoriaDocumentoAssinatura, DocumentoAssinatura, criarDocumentoAssinatura, getDocumentosAssinatura } from '../../utils/documentosAssinaturaApi';

type GeradoParaCiencia = { arquivo: File; camposAssinatura: CampoAssinaturaPdf[] };

export interface DocumentoParaCiencia {
  categoria: CategoriaDocumentoAssinatura;
  /** Identifica a versão enviada (ex.: id do POP; id da instrução + versão) — quem já recebeu fica de fora. */
  referencia: string;
  /** Rótulo curto (ex.: "POP-OPE-001 v02"). */
  tipo: string;
  /** Título do documento que o colaborador vê. */
  titulo: string;
  /** O que está sendo enviado (linha de baixo do título da janela). */
  descricao: string;
  prefixoLote: string;
  /** `extra` = o que foi digitado no campoPorColaborador (quando existe). */
  gerarPdf: (c: Colaborador, extra?: string) => GeradoParaCiencia | Promise<GeradoParaCiencia>;
  /** Campo digitado para cada colaborador marcado (ex.: número do cartão de VA). */
  campoPorColaborador?: { rotulo: string; placeholder?: string; obrigatorio?: boolean };
}

/** Gera, para cada colaborador escolhido, uma cópia do documento com o termo de ciência e cria o
 *  documento para assinar no link pessoal (Documentos). Quem já recebeu ESTA referência fica de fora.
 *  Usado pelos POPs e pelas Instruções de Trabalho. */
export const EnviarCienciaModal: React.FC<{
  documento: DocumentoParaCiencia;
  colaboradores: Colaborador[];
  criadoPor?: string;
  onClose: () => void;
  onEnviados: (novos: DocumentoAssinatura[]) => void;
}> = ({ documento, colaboradores, criadoPor, onClose, onEnviados }) => {
  const [existentes, setExistentes] = useState<DocumentoAssinatura[] | null>(null);
  const [busca, setBusca] = useState('');
  const [setor, setSetor] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{ ok: number; falhas: string[] } | null>(null);
  const [extras, setExtras] = useState<Record<string, string>>({});
  const campoExtra = documento.campoPorColaborador;
  const faltaExtra = !!campoExtra?.obrigatorio && Array.from(selecionados).some((id) => !extras[id]?.trim());

  useEffect(() => {
    getDocumentosAssinatura(documento.categoria)
      .then((l) => setExistentes(l.filter((d) => d.referencia === documento.referencia)))
      .catch((err) => {
        console.error(err);
        setExistentes([]);
      });
  }, [documento.categoria, documento.referencia]);

  const jaRecebeu = useMemo(() => new Set((existentes ?? []).map((d) => d.colaboradorId)), [existentes]);
  const ativos = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
    [colaboradores]
  );
  const setores = useMemo(() => Array.from(new Set(ativos.map((c) => c.setor).filter(Boolean))).sort(), [ativos]);
  const visiveis = ativos.filter(
    (c) => (!setor || c.setor === setor) && (!busca.trim() || c.nomeCompleto.toLowerCase().includes(busca.trim().toLowerCase()))
  );
  const disponiveis = visiveis.filter((c) => !jaRecebeu.has(c.id));

  const alternar = (id: string) =>
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const enviar = async () => {
    const escolhidos = ativos.filter((c) => selecionados.has(c.id) && !jaRecebeu.has(c.id));
    if (!escolhidos.length) return;
    const loteId = `lote-${documento.prefixoLote}-${Date.now()}`;
    const criados: DocumentoAssinatura[] = [];
    const falhas: string[] = [];
    setProgresso({ feito: 0, total: escolhidos.length });
    for (const [i, c] of escolhidos.entries()) {
      try {
        const { arquivo, camposAssinatura } = await documento.gerarPdf(c, extras[c.id]?.trim() || undefined);
        criados.push(
          await criarDocumentoAssinatura({
            categoria: documento.categoria,
            colaboradorId: c.id,
            colaboradorNome: c.nomeCompleto,
            referencia: documento.referencia,
            tipo: documento.tipo,
            titulo: documento.titulo,
            arquivo,
            camposAssinatura,
            loteId,
            criadoPor,
          })
        );
      } catch (err) {
        console.error(err);
        falhas.push(c.nomeCompleto);
      }
      setProgresso({ feito: i + 1, total: escolhidos.length });
    }
    setProgresso(null);
    setResultado({ ok: criados.length, falhas });
    setExistentes((prev) => [...(prev ?? []), ...criados]);
    setSelecionados(new Set());
    onEnviados(criados);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-[#C48229]" /> Enviar para ciência
            </h2>
            <p className="text-slate-500 mt-0.5">
              {documento.descricao} Cada colaborador recebe o documento com o termo de ciência em <b>Documentos</b>, no link pessoal.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={!!progresso} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador" className="w-full border border-slate-200 rounded-lg pl-7 pr-2 py-2" />
          </div>
          <select value={setor} onChange={(e) => setSetor(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-2 bg-white">
            <option value="">Todos os setores</option>
            {setores.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSelecionados(new Set(disponiveis.map((c) => c.id)))}
            className="px-3 py-2 border border-slate-200 rounded-lg font-semibold hover:bg-slate-50"
          >
            Marcar {disponiveis.length} da lista
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {existentes === null ? (
            <p className="p-4 text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visiveis.map((c) => {
                const recebeu = jaRecebeu.has(c.id);
                return (
                  <li key={c.id} className={`px-4 py-2 flex items-center gap-3 ${recebeu ? 'opacity-60' : ''}`}>
                    <input type="checkbox" checked={recebeu || selecionados.has(c.id)} disabled={recebeu || !!progresso} onChange={() => alternar(c.id)} />
                    <span className="flex-1">
                      <span className="font-semibold text-slate-800">{c.nomeCompleto}</span>
                      <span className="text-slate-400"> · {c.funcaoCargo || '—'}{c.setor ? ` · ${c.setor}` : ''}</span>
                    </span>
                    {campoExtra && !recebeu && selecionados.has(c.id) && (
                      <input
                        value={extras[c.id] || ''}
                        onChange={(e) => setExtras((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        disabled={!!progresso}
                        placeholder={campoExtra.placeholder || campoExtra.rotulo}
                        title={campoExtra.rotulo}
                        className={`w-44 border rounded-lg px-2 py-1.5 ${campoExtra.obrigatorio && !extras[c.id]?.trim() ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}
                      />
                    )}
                    {recebeu && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">Já recebeu</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-slate-600">
            {resultado ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> {resultado.ok} enviado(s){resultado.falhas.length ? ` · erro em: ${resultado.falhas.join(', ')}` : ''}. Mande o aviso pelo WhatsApp na lista de ciência.
              </span>
            ) : (
              <>
                <b>{selecionados.size}</b> selecionado(s){faltaExtra ? <span className="text-amber-700"> · preencha {campoExtra!.rotulo.toLowerCase()} de todos</span> : null}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={enviar}
            disabled={!!progresso || selecionados.size === 0 || faltaExtra}
            className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {progresso ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
            {progresso ? `Gerando ${progresso.feito} de ${progresso.total}...` : `Enviar para ${selecionados.size} colaborador(es)`}
          </button>
        </div>
      </div>
    </div>
  );
};
