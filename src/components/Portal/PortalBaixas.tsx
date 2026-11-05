import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ClipboardCheck, Loader2, Upload } from 'lucide-react';
import type { CredenciaisPortal } from '../../utils/educacaoApi';
import { BaixaNota, BaixaUpload, contar, lerPlanilhaBaixas, pct, portalBaixasEstado, portalBaixasImportar, portalBaixasNotas, portalBaixasTardia, portalBaixasAbonar } from '../../utils/baixasApi';
import { DetalheUpload } from '../FarmaRodoviario/BaixasPerformanceView';

const dataBr = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const f1 = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Portal do responsável do escritório: importar as baixas do dia e acompanhar a auditoria. */
export const PortalBaixas: React.FC<{ credenciais: CredenciaisPortal }> = ({ credenciais }) => {
  const [estado, setEstado] = useState<Awaited<ReturnType<typeof portalBaixasEstado>> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<BaixaUpload | null>(null);
  const [lido, setLido] = useState<{ arquivo: File; notas: ReturnType<typeof lerPlanilhaBaixas>['notas']; data: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = () =>
    portalBaixasEstado(credenciais)
      .then(setEstado)
      .catch((e) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar.');
        setEstado({ permitido: false, uploads: [], motivosAbono: [] });
      });
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciais]);

  const escolher = async (f?: File) => {
    if (!f) return;
    setErro(null);
    try {
      const r = lerPlanilhaBaixas(await f.arrayBuffer(), f.name);
      setLido({ arquivo: f, notas: r.notas, data: r.dataSugerida || new Date().toLocaleDateString('sv-SE') });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a planilha.');
    }
  };

  const importar = async () => {
    if (!lido) return;
    setEnviando(true);
    setErro(null);
    try {
      const id = await portalBaixasImportar(credenciais, lido.data, lido.arquivo.name, lido.notas);
      const novo = await portalBaixasEstado(credenciais);
      setEstado(novo);
      setLido(null);
      setAberto(novo.uploads.find((u) => u.id === id) || null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível importar.');
    } finally {
      setEnviando(false);
    }
  };

  if (estado === null)
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
      </div>
    );
  if (!estado.permitido)
    return <p className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600">{erro || 'Esta área é só para os responsáveis pelas baixas do escritório.'}</p>;

  if (aberto)
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => (setAberto(null), carregar())} className="text-xs font-bold text-[#92611F] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Minhas importações
        </button>
        <DetalheUpload
          upload={aberto}
          usuario={estado.nome}
          onAtualizado={(u) => setAberto(u)}
          carregarNotas={(id) => portalBaixasNotas(credenciais, id)}
          marcarTardia={(n: BaixaNota, quando: string) => portalBaixasTardia(credenciais, n, quando)}
          marcarAbono={(n: BaixaNota, motivo: string, obs: string) => portalBaixasAbonar(credenciais, n, motivo, obs)}
          motivosAbono={estado.motivosAbono}
        />
      </div>
    );

  const cont = lido ? contar(lido.notas as BaixaNota[]) : null;
  return (
    <div className="space-y-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-black text-slate-900">Baixas do dia — {estado.nome}</p>
          <p className="text-xs text-slate-500">Importe a planilha "Relatório de documentos" do dia. Base: {estado.base}.</p>
        </div>
      </div>

      {!lido ? (
        <label className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#C48229] hover:bg-[#92611F] text-white text-sm font-bold cursor-pointer">
          <Upload className="w-4 h-4" /> Importar a planilha do dia
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
        </label>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
          <p className="font-bold text-slate-800 break-all">{lido.arquivo.name}</p>
          {cont && (
            <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
              {cont.total} notas · {cont.entregues} entregues · {cont.total - cont.entregues} pendentes · {cont.comprovadas} comprovadas
            </p>
          )}
          <label className="block">
            <span className="font-bold text-slate-700">Dia das entregas <span className="font-normal text-slate-400">(sugerido pela data de entrega da planilha)</span></span>
            <input type="date" value={lido.data} onChange={(e) => setLido({ ...lido, data: e.target.value })} className="mt-1 w-full p-3 border border-slate-300 rounded-xl text-sm" />
          </label>
          <p className="text-[11px] text-slate-500">Se você já importou esse dia, a importação anterior é substituída.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setLido(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600">
              Cancelar
            </button>
            <button type="button" onClick={importar} disabled={enviando || !lido.data} className="flex-1 py-2.5 rounded-xl bg-[#C48229] text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar
            </button>
          </div>
        </div>
      )}
      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}

      <h2 className="px-1 text-[11px] font-black uppercase tracking-wide text-slate-400">Minhas importações</h2>
      {estado.uploads.length === 0 && <p className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Nenhuma importação ainda.</p>}
      {estado.uploads.map((u) => {
        const taxa = pct(u.entregues, u.total);
        return (
          <button key={u.id} type="button" onClick={() => setAberto(u)} className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 normal-case tracking-normal active:bg-amber-50">
            <CalendarDays className="w-5 h-5 text-[#C48229] shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-900">{dataBr(u.dataReferencia)}</span>
              <span className="block text-[11px] text-slate-500">
                {u.total} notas · {u.total - u.entregues} pendente(s) · {f1(pct(u.noPrazo, u.total))} no prazo
              </span>
            </span>
            <span className={`text-sm font-black ${taxa >= 97 ? 'text-emerald-700' : taxa >= 93 ? 'text-[#92611F]' : 'text-rose-700'}`}>{f1(taxa)}</span>
          </button>
        );
      })}
    </div>
  );
};
