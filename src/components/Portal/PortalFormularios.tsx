import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck, Loader2 } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import {
  FormularioPortalResumo,
  FormularioPublico,
  portalFormulario,
  portalFormularios,
  portalResponderFormulario,
} from '../../utils/formulariosApi';
import { PreencherFormulario } from '../Formularios/PreencherFormulario';

const dataBr = (d?: string) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR') : '');

/** Portal do colaborador: formulários para responder (pesquisas, inscrições, avaliações...). */
export const PortalFormularios: React.FC<{
  credenciais: CredenciaisPortal;
  formularioInicial?: string;
  onMudou?: (pendentes: number) => void;
}> = ({ credenciais, formularioInicial, onMudou }) => {
  const [lista, setLista] = useState<FormularioPortalResumo[] | null>(null);
  const [abertoId, setAbertoId] = useState<string | undefined>(formularioInicial);
  const [aberto, setAberto] = useState<FormularioPublico | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = () =>
    portalFormularios(credenciais)
      .then((l) => {
        setLista(l);
        onMudou?.(l.filter((f) => f.aberto && !f.respondidoEm).length);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar.'));

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais]);

  useEffect(() => {
    setAberto(null);
    if (!abertoId) return;
    portalFormulario(credenciais, abertoId)
      .then(setAberto)
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível abrir.');
        setAbertoId(undefined);
      });
  }, [abertoId, credenciais]);

  if (abertoId) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setAbertoId(undefined)} className="flex items-center gap-1 text-sm font-bold text-[#92611F] normal-case tracking-normal">
          <ChevronLeft className="w-4 h-4" /> Formulários
        </button>
        {!aberto ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Abrindo...
          </div>
        ) : (
          <PreencherFormulario
            formulario={aberto}
            jaEnviado={!!aberto.respondidoEm}
            onEnviar={async (respostas) => {
              await portalResponderFormulario(credenciais, aberto.id, respostas);
              carregar();
            }}
          />
        )}
      </div>
    );
  }

  const pendentes = (lista || []).filter((f) => f.aberto && !f.respondidoEm);
  const outros = (lista || []).filter((f) => !(f.aberto && !f.respondidoEm));

  const item = (f: FormularioPortalResumo) => (
    <button
      key={f.id}
      type="button"
      onClick={() => setAbertoId(f.id)}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 normal-case tracking-normal active:bg-amber-50"
    >
      {f.capa ? (
        <img src={f.capa} alt="" className="w-14 h-10 rounded-xl object-cover shrink-0 bg-slate-100" />
      ) : (
        <span className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5" />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-900">{f.titulo}</span>
        <span className="block text-[11px] text-slate-500">
          {f.respondidoEm ? `Respondido em ${dataBr(f.respondidoEm)}` : !f.aberto ? 'Encerrado' : f.encerraEm ? `Responda até ${dataBr(f.encerraEm)}` : 'Aguardando sua resposta'}
        </span>
      </span>
      {f.aberto && !f.respondidoEm && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">Novo</span>}
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </button>
  );

  return (
    <div className="space-y-4">
      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}
      {lista === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : lista.length === 0 ? (
        <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">Nenhum formulário para você no momento.</p>
      ) : (
        <>
          {pendentes.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-400">Para responder</h2>
              {pendentes.map(item)}
            </section>
          )}
          {outros.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-400">Respondidos e encerrados</h2>
              {outros.map(item)}
            </section>
          )}
        </>
      )}
    </div>
  );
};
