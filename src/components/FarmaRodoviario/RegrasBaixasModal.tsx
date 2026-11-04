import React, { useState } from 'react';
import { Loader2, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { REGRAS_PADRAO, RegrasBaixas, explicarRegrasMotorista, explicarRegrasResponsavel, salvarRegrasBaixas } from '../../utils/baixasApi';

const Peso: React.FC<{ rotulo: string; ajuda: string; valor: number; onChange: (v: number) => void }> = ({ rotulo, ajuda, valor, onChange }) => (
  <label className="flex items-center gap-3 py-2">
    <span className="flex-1 min-w-0">
      <span className="block font-bold text-slate-800">{rotulo}</span>
      <span className="block text-[11px] text-slate-500">{ajuda}</span>
    </span>
    <input type="range" min={0} max={100} step={5} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-28 accent-[#C48229]" />
    <span className="w-16 flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={100}
        value={valor}
        onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        className="w-12 p-1 border border-slate-300 rounded-md text-right text-xs"
      />
      %
    </span>
  </label>
);

const Soma: React.FC<{ total: number }> = ({ total }) => (
  <p className={`text-right text-[11px] font-bold ${total === 100 ? 'text-slate-500' : 'text-rose-700'}`}>
    Soma dos pesos: {total}% {total !== 100 && '(precisa dar 100%)'}
  </p>
);

/** Regras de pontuação da Performance das baixas: responsáveis e motoristas. */
export const RegrasBaixasModal: React.FC<{ regras: RegrasBaixas; usuario?: string; onClose: () => void; onSalvo: (r: RegrasBaixas) => void }> = ({ regras, usuario, onClose, onSalvo }) => {
  const [r, setR] = useState<RegrasBaixas>(regras);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novoMotivo, setNovoMotivo] = useState('');
  const resp = r.responsavel;
  const mot = r.motorista;
  const somaResp = resp.pesoRegularidade + resp.pesoComprovacao + resp.pesoEntrega;
  const somaMot = mot.pesoEntrega + mot.pesoPrazo + mot.pesoComprovacao;
  const mudarResp = (p: Partial<RegrasBaixas['responsavel']>) => setR((x) => ({ ...x, responsavel: { ...x.responsavel, ...p } }));
  const mudarMot = (p: Partial<RegrasBaixas['motorista']>) => setR((x) => ({ ...x, motorista: { ...x.motorista, ...p } }));

  const salvar = async () => {
    if (somaResp !== 100 || somaMot !== 100) return setErro('Os pesos de cada parte precisam somar 100%.');
    if (!r.motivosAbono.filter((m) => m.trim()).length) return setErro('Deixe pelo menos um motivo de abono.');
    setSalvando(true);
    setErro(null);
    try {
      const final = { ...r, motivosAbono: Array.from(new Set(r.motivosAbono.map((m) => m.trim()).filter(Boolean))) };
      await salvarRegrasBaixas(final, usuario);
      onSalvo(final);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[94vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 normal-case">Regras de pontuação</h2>
            <p className="text-slate-500">Pontos, meta e motivos de abono. Valem para o painel do mês e o dossiê — inclusive dos meses anteriores, que são recalculados.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <section className="p-3 rounded-xl border border-slate-200 bg-[#FCFAF6]">
            <h3 className="text-sm font-black text-slate-900 normal-case">Responsáveis (escritório)</h3>
            <Peso rotulo="Regularidade" ajuda="Dias com a planilha importada no prazo ÷ dias de operação do mês" valor={resp.pesoRegularidade} onChange={(v) => mudarResp({ pesoRegularidade: v })} />
            <Peso rotulo="Comprovação" ajuda="Notas com status COMPROVADO ÷ notas do mês" valor={resp.pesoComprovacao} onChange={(v) => mudarResp({ pesoComprovacao: v })} />
            <Peso rotulo="Entrega" ajuda="Notas entregues ÷ notas do mês" valor={resp.pesoEntrega} onChange={(v) => mudarResp({ pesoEntrega: v })} />
            <Soma total={somaResp} />
            <label className="block mt-2">
              <span className="font-bold text-slate-800">Prazo para importar a planilha do dia</span>
              <select value={resp.diasParaImportar} onChange={(e) => mudarResp({ diasParaImportar: Number(e.target.value) })} className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value={0}>No mesmo dia</option>
                <option value={1}>Até 1 dia útil depois</option>
                <option value={2}>Até 2 dias úteis depois</option>
                <option value={3}>Até 3 dias úteis depois</option>
              </select>
            </label>
          </section>

          <section className="p-3 rounded-xl border border-slate-200 bg-[#FCFAF6]">
            <h3 className="text-sm font-black text-slate-900 normal-case">Motoristas</h3>
            <Peso rotulo="Entrega" ajuda="Notas entregues ÷ notas do motorista" valor={mot.pesoEntrega} onChange={(v) => mudarMot({ pesoEntrega: v })} />
            <Peso rotulo="No prazo" ajuda="Notas entregues no prazo ÷ notas do motorista" valor={mot.pesoPrazo} onChange={(v) => mudarMot({ pesoPrazo: v })} />
            <Peso rotulo="Comprovação" ajuda="Notas com comprovante (COMPROVADO) ÷ notas do motorista" valor={mot.pesoComprovacao} onChange={(v) => mudarMot({ pesoComprovacao: v })} />
            <Soma total={somaMot} />
            <label className="block mt-2">
              <span className="font-bold text-slate-800">Mínimo de notas no mês para entrar no ranking</span>
              <input type="number" min={1} value={mot.minimoNotas} onChange={(e) => mudarMot({ minimoNotas: Math.max(1, Number(e.target.value) || 1) })} className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white" />
              <span className="block text-[11px] text-slate-500 mt-0.5">Quem fez menos aparece no fim, separado, sem posição.</span>
            </label>
          </section>

          <section className="p-3 rounded-xl border border-slate-200 bg-[#FCFAF6]">
            <label className="block">
              <span className="font-bold text-slate-800">Meta de entrega (%)</span>
              <input type="number" min={0} max={100} step={0.5} value={r.metaEntrega} onChange={(e) => setR((x) => ({ ...x, metaEntrega: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white" />
              <span className="block text-[11px] text-slate-500 mt-0.5">Abaixo da meta, a taxa de entrega aparece em vermelho.</span>
            </label>
          </section>

          <section className="p-3 rounded-xl border border-slate-200 bg-[#FCFAF6] space-y-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 normal-case">Motivos de abono</h3>
              <p className="text-[11px] text-slate-500">Aparecem na hora de abonar uma pendência (gestão e link pessoal do responsável).</p>
            </div>
            {r.motivosAbono.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={m}
                  onChange={(e) => setR((x) => ({ ...x, motivosAbono: x.motivosAbono.map((y, k) => (k === i ? e.target.value.slice(0, 80) : y)) }))}
                  className="flex-1 p-2 border border-slate-300 rounded-lg bg-white"
                />
                <button type="button" onClick={() => setR((x) => ({ ...x, motivosAbono: x.motivosAbono.filter((_, k) => k !== i) }))} className="p-1.5 text-slate-400 hover:text-rose-600" title="Tirar o motivo">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={novoMotivo}
                onChange={(e) => setNovoMotivo(e.target.value.slice(0, 80))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && novoMotivo.trim()) {
                    e.preventDefault();
                    setR((x) => ({ ...x, motivosAbono: [...x.motivosAbono, novoMotivo.trim()] }));
                    setNovoMotivo('');
                  }
                }}
                placeholder="Novo motivo (ex.: Avaria na carga)"
                className="flex-1 p-2 border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="button"
                disabled={!novoMotivo.trim()}
                onClick={() => {
                  setR((x) => ({ ...x, motivosAbono: [...x.motivosAbono, novoMotivo.trim()] }));
                  setNovoMotivo('');
                }}
                className="px-3 py-2 rounded-lg border border-[#C48229] text-[#92611F] font-bold flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          </section>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[#92611F] space-y-1">
            <p>
              <b>Responsáveis:</b> {explicarRegrasResponsavel(r)}
            </p>
            <p>
              <b>Motoristas:</b> {explicarRegrasMotorista(r)}
            </p>
          </div>
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        </div>
        <div className="p-4 border-t border-slate-200 flex items-center gap-2">
          <button type="button" onClick={() => setR(REGRAS_PADRAO)} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Voltar ao padrão
          </button>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-bold text-slate-600">
              Cancelar
            </button>
            <button type="button" onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
