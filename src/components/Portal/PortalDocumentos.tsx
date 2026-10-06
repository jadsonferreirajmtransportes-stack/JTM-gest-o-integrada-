import React, { useEffect, useState } from 'react';
import { Loader2, ChevronLeft, FileSignature, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { DocumentoPortal, portalAbrirDocumento, portalAssinarDocumento, portalDocumentos } from '../../utils/portalColaboradorApi';
import { ContrachequePublicView } from '../Contracheques/ContrachequePublicView';

const ROTULO_CATEGORIA: Record<string, string> = {
  contracheque: 'Contracheque',
  ferias: 'Férias',
  vale_alimentacao: 'Vale-alimentação',
  ponto: 'Espelho de ponto',
  disciplinar: 'Medida disciplinar',
  regulamento: 'Regulamento',
};

const rotuloDe = (d: { categoria: string; tipo: string }) => (d.tipo === 'Folha extra' ? 'Folha extra' : ROTULO_CATEGORIA[d.categoria] || 'Documento');

const dataCurta = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

/** Documentos do colaborador para ver e assinar (contracheques, férias, espelho, medidas). */
export const PortalDocumentos: React.FC<{ credenciais: CredenciaisPortal; documentoInicial?: string; onMudou?: (pendentes: number) => void }> = ({
  credenciais,
  documentoInicial,
  onMudou,
}) => {
  const [lista, setLista] = useState<DocumentoPortal[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(documentoInicial || null);

  const carregar = () =>
    portalDocumentos(credenciais)
      .then((l) => {
        setLista(l);
        onMudou?.(l.filter((d) => d.status !== 'Assinado' && !d.vencido).length);
      })
      .catch((err) => {
        console.error(err);
        setErro(err instanceof Error ? err.message : 'Não foi possível carregar seus documentos.');
        setLista([]);
      });

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais]);

  if (abertoId) {
    const doc = lista?.find((d) => d.id === abertoId);
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setAbertoId(null)} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Meus documentos
        </button>
        <ContrachequePublicView
          key={abertoId}
          rotulo={doc ? rotuloDe(doc) : 'Documento'}
          acesso={{
            abrir: () => portalAbrirDocumento(credenciais, abertoId),
            assinar: (assinatura, declaracao) => portalAssinarDocumento(credenciais, abertoId, assinatura, declaracao),
          }}
          onAssinado={carregar}
        />
      </div>
    );
  }

  if (lista === null) {
    return (
      <p className="text-xs text-slate-500 flex items-center gap-2 p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
      </p>
    );
  }
  if (erro) return <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>;
  if (lista.length === 0) {
    return <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Nenhum documento para você por enquanto.</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
      {lista.map((d) => {
        const assinado = d.status === 'Assinado';
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => (d.vencido && !assinado ? undefined : setAbertoId(d.id))}
            className={`w-full text-left normal-case p-4 flex items-center gap-3 ${d.vencido && !assinado ? 'cursor-default' : 'hover:bg-slate-50'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${assinado ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-[#C48229]'}`}>
              {assinado ? <CheckCircle2 className="w-5 h-5" /> : <FileSignature className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">{rotuloDe(d)}</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{d.titulo}</p>
              <p className="text-[11px] text-slate-500">
                {assinado ? `Assinado em ${dataCurta(d.assinadoEm)}` : d.vencido ? 'Prazo vencido — peça ao Departamento Pessoal para renovar' : `Enviado em ${dataCurta(d.criadoEm)}`}
              </p>
            </div>
            {!assinado && !d.vencido && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-[#92611F] border border-amber-200 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" /> Assinar
              </span>
            )}
            {!assinado && d.vencido && <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
};
