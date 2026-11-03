import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Loader2, X } from 'lucide-react';
import type { SolicitacaoDp } from '../../utils/solicitacoesApi';
import { JustificativaDia, TIPOS_JUSTIFICATIVA, getJustificativas, incluirBatidasLote, salvarJustificativasLote } from '../../utils/frequenciaApi';
import { configPedidoPonto, dataBrPonto, diasDoPedido, somarDiasIso } from '../../utils/pedidosPonto';

/** DP lança no controle de frequência o pedido de ponto do colaborador (Fale com o DP):
 *  "Inclusão de marcação" vira batida de ajuste; os demais viram justificativa em cada dia. */
export const LancarPedidoPontoModal: React.FC<{
  s: SolicitacaoDp;
  criadoPor?: string;
  onClose: () => void;
  /** Lançado: devolve a resposta sugerida ao colaborador. */
  onLancado: (resposta: string) => void;
}> = ({ s, criadoPor, onClose, onLancado }) => {
  const d = s.dados || {};
  const cfg = configPedidoPonto(s.assunto);
  const ehMarcacao = cfg?.campo === 'marcacao' || Array.isArray(d.horarios);
  const diasIniciais = diasDoPedido(d);

  const [data, setData] = useState<string>(d.data || diasIniciais[0] || '');
  const [horarios, setHorarios] = useState<string[]>(Array.isArray(d.horarios) && d.horarios.length ? d.horarios : ['']);
  const [inicio, setInicio] = useState(diasIniciais[0] || '');
  const [fim, setFim] = useState(diasIniciais[diasIniciais.length - 1] || '');
  const [tipoJust, setTipoJust] = useState(cfg?.justificativa || TIPOS_JUSTIFICATIVA[0].tipo);
  const [observacao, setObservacao] = useState(`Pedido nº ${s.protocolo} pelo portal — ${s.assunto}${d.de ? ` (das ${d.de} às ${d.ate})` : ''}`);
  const [existentes, setExistentes] = useState<JustificativaDia[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dias = useMemo(() => {
    if (!inicio || !fim || fim < inicio) return [];
    const r: string[] = [];
    for (let x = inicio; x <= fim && r.length < 180; x = somarDiasIso(x, 1)) r.push(x);
    return r;
  }, [inicio, fim]);

  useEffect(() => {
    if (ehMarcacao || !dias.length) return setExistentes([]);
    getJustificativas(dias[0], dias[dias.length - 1])
      .then((l) => setExistentes(l.filter((j) => j.colaboradorId === s.colaboradorId)))
      .catch(() => setExistentes([]));
  }, [ehMarcacao, dias, s.colaboradorId]);

  const lancar = async () => {
    setErro(null);
    setSalvando(true);
    try {
      if (ehMarcacao) {
        const hs = horarios.filter(Boolean).sort();
        if (!data || !hs.length) throw new Error('Informe o dia e pelo menos um horário.');
        await incluirBatidasLote(
          hs.map((h) => ({ colaboradorId: s.colaboradorId, dataHoraLocal: `${data}T${h}`, diaTrabalho: data })),
          observacao.trim() || `Pedido nº ${s.protocolo}`,
          criadoPor
        );
        onLancado(`Incluímos no seu ponto ${hs.length > 1 ? 'as marcações' : 'a marcação'} do dia ${dataBrPonto(data)}: ${hs.join(', ')}.`);
      } else {
        if (!dias.length) throw new Error('Confira o primeiro e o último dia.');
        const abona = TIPOS_JUSTIFICATIVA.find((t) => t.tipo === tipoJust)?.abona ?? true;
        await salvarJustificativasLote(dias.map((x) => ({ colaboradorId: s.colaboradorId, data: x, tipo: tipoJust, abona, observacao: observacao.trim(), criadoPor })));
        const periodo = dias.length === 1 ? `no dia ${dataBrPonto(dias[0])}` : `de ${dataBrPonto(dias[0])} a ${dataBrPonto(dias[dias.length - 1])}`;
        onLancado(`Lançamos no seu ponto "${tipoJust}" ${periodo}${abona ? ', sem desconto' : ''}.`);
      }
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível lançar no ponto.');
      setSalvando(false);
    }
  };

  const campo = 'mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white text-sm';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-3" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#92611F]">Lançar no controle de frequência</p>
            <h3 className="text-sm font-black text-slate-900">{s.assunto}</h3>
            <p className="text-slate-500">Confira e ajuste antes de lançar.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {ehMarcacao ? (
            <>
              <label className="block">
                <span className="font-bold text-slate-700">Dia</span>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
              </label>
              <div>
                <span className="font-bold text-slate-700">Horários a incluir</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {horarios.map((h, i) => (
                    <input key={i} type="time" value={h} onChange={(e) => setHorarios((p) => p.map((x, k) => (k === i ? e.target.value : x)))} className="p-2 border border-slate-300 rounded-lg bg-white text-sm" />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="font-bold text-slate-700">Primeiro dia</span>
                  <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={campo} />
                </label>
                <label className="block">
                  <span className="font-bold text-slate-700">Último dia</span>
                  <input type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} className={campo} />
                </label>
              </div>
              <label className="block">
                <span className="font-bold text-slate-700">Justificativa</span>
                <select value={tipoJust} onChange={(e) => setTipoJust(e.target.value)} className={campo}>
                  {TIPOS_JUSTIFICATIVA.map((t) => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.tipo}
                      {t.abona ? '' : ' (não abona)'}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-slate-500">
                {dias.length} dia{dias.length === 1 ? '' : 's'} no controle de frequência.
              </p>
              {existentes.length > 0 && (
                <p className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[#92611F] font-semibold">
                  {existentes.length === 1 ? 'Já existe justificativa em 1 desses dias' : `Já existe justificativa em ${existentes.length} desses dias`} ({existentes.map((j) => `${dataBrPonto(j.data).slice(0, 5)} ${j.tipo}`).join('; ')}). Ela será substituída.
                </p>
              )}
            </>
          )}
          <label className="block">
            <span className="font-bold text-slate-700">{ehMarcacao ? 'Motivo do ajuste' : 'Observação'}</span>
            <input value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={300} className={campo} />
          </label>
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-600">
            Cancelar
          </button>
          <button type="button" onClick={lancar} disabled={salvando} className="px-3 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Lançar no ponto
          </button>
        </div>
      </div>
    </div>
  );
};
