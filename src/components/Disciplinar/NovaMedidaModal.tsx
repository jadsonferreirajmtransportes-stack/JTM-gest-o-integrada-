import React, { useMemo, useState } from 'react';
import { X, Gavel, AlertTriangle, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { Colaborador, Ocorrencia, UsuarioLogin } from '../../types';
import { MedidaDisciplinar, saveMedidaDisciplinar } from '../../utils/disciplinarApi';
import {
  ALINEAS_ART_482,
  ESCADA_DISCIPLINAR,
  MAX_DIAS_SUSPENSAO,
  avaliarMedida,
  situacaoDisciplinar,
} from './disciplinarRegras';
import { tituloMedida } from './disciplinarPdf';

interface NovaMedidaModalProps {
  colaboradores: Colaborador[];
  medidas: MedidaDisciplinar[];
  ocorrencias: Ocorrencia[];
  currentUser?: UsuarioLogin;
  /** Admin registra já aprovada; supervisor registra como "Proposta" (admin aprova depois). */
  ehAdmin: boolean;
  colaboradorInicialId?: string;
  onClose: () => void;
  onSalvo: (m: MedidaDisciplinar) => void;
}

const hojeIso = () => new Date().toISOString().slice(0, 10);

function dataBr(iso?: string): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export const NovaMedidaModal: React.FC<NovaMedidaModalProps> = ({
  colaboradores,
  medidas,
  ocorrencias,
  currentUser,
  ehAdmin,
  colaboradorInicialId,
  onClose,
  onSalvo,
}) => {
  const [colaboradorId, setColaboradorId] = useState(colaboradorInicialId || '');
  const [dataFato, setDataFato] = useState(hojeIso());
  const [dataCienciaFato, setDataCienciaFato] = useState(hojeIso());
  const [descricaoFato, setDescricaoFato] = useState('');
  const [enquadramento, setEnquadramento] = useState<string[]>([]);
  const [enquadramentoOutro, setEnquadramentoOutro] = useState('');
  const [testemunhasFato, setTestemunhasFato] = useState('');
  const [etapaEscolhida, setEtapaEscolhida] = useState<number | null>(null);
  const [diasSuspensao, setDiasSuspensao] = useState<number | undefined>(undefined);
  const [suspensaoInicio, setSuspensaoInicio] = useState('');
  const [justificativaEtapa, setJustificativaEtapa] = useState('');
  const [ocorrenciasRelacionadas, setOcorrenciasRelacionadas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ordenados: Colaborador[] = useMemo(
    () => colaboradores.filter((c) => c.status !== 'Inativo').sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
    [colaboradores]
  );
  const colaborador = ordenados.find((c) => c.id === colaboradorId);
  const situacao = colaboradorId ? situacaoDisciplinar(colaboradorId, medidas) : null;
  const etapaSugerida = situacao?.proxima.etapa ?? 1;
  const etapa = etapaEscolhida ?? etapaSugerida;
  const infoEtapa = ESCADA_DISCIPLINAR.find((e) => e.etapa === etapa)!;
  const dias = infoEtapa.tipo === 'Suspensão' ? diasSuspensao ?? infoEtapa.diasSuspensao : undefined;

  // Ocorrências do colaborador nos últimos 90 dias (pra vincular — ex.: as faltas que motivaram).
  const ocorrenciasDoColaborador = useMemo(() => {
    if (!colaboradorId) return [];
    const limite = new Date();
    limite.setDate(limite.getDate() - 90);
    const limiteIso = limite.toISOString().slice(0, 10);
    return ocorrencias
      .filter((o) => o.colaboradorId === colaboradorId && (o.dataOcorrencia || o.data || '') >= limiteIso)
      .sort((a, b) => (b.dataOcorrencia || b.data || '').localeCompare(a.dataOcorrencia || a.data || ''));
  }, [ocorrencias, colaboradorId]);

  const alertas = colaboradorId
    ? avaliarMedida({
        colaboradorId,
        etapaEscolhida: etapa,
        etapaSugerida,
        dataFato,
        dataCienciaFato,
        dataAplicacao: hojeIso(),
        enquadramento,
        enquadramentoOutro,
        diasSuspensao: dias,
        justificativaEtapa,
        medidas,
      })
    : [];
  const bloqueado = alertas.some((a) => a.nivel === 'erro') || !colaborador || !descricaoFato.trim();

  const alternarEnquadramento = (codigo: string) =>
    setEnquadramento((prev) => (prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]));

  const handleSalvar = async () => {
    if (bloqueado || !colaborador) return;
    setErro(null);
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const nova: MedidaDisciplinar = {
        id: '',
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nomeCompleto,
        tipo: infoEtapa.tipo,
        etapa,
        dataFato,
        dataCienciaFato,
        descricaoFato: descricaoFato.trim(),
        enquadramento,
        enquadramentoOutro: enquadramentoOutro.trim() || undefined,
        testemunhasFato: testemunhasFato.trim() || undefined,
        justificativaEtapa: etapa > etapaSugerida ? justificativaEtapa.trim() : undefined,
        ocorrenciasRelacionadas,
        diasSuspensao: dias,
        suspensaoInicio: infoEtapa.tipo === 'Suspensão' ? suspensaoInicio || undefined : undefined,
        status: 'Proposta',
        propostoPor: currentUser?.nome,
        propostoEm: agora,
      };
      onSalvo(await saveMedidaDisciplinar(nova));
      onClose();
    } catch (err) {
      console.error(err);
      setErro(`Não foi possível salvar. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Gavel className="w-4 h-4 text-[#C48229]" />
            Nova medida disciplinar
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Colaborador</label>
            <select
              value={colaboradorId}
              onChange={(e) => {
                setColaboradorId(e.target.value);
                setEtapaEscolhida(null);
                setDiasSuspensao(undefined);
                setOcorrenciasRelacionadas([]);
              }}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white font-semibold"
            >
              <option value="">Escolha o colaborador</option>
              {ordenados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeCompleto} {c.funcaoCargo ? `— ${c.funcaoCargo}` : ''}
                </option>
              ))}
            </select>
          </div>

          {situacao && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <p className="font-semibold text-slate-700">
                Situação nos últimos 12 meses:{' '}
                {situacao.etapaAtual === 0 ? (
                  <span className="text-emerald-700">nenhuma medida válida</span>
                ) : (
                  <span className="text-[#92611F]">
                    etapa {situacao.etapaAtual} — {ESCADA_DISCIPLINAR[situacao.etapaAtual - 1].rotulo}
                    {situacao.zeraEm && ` (deixa de contar em ${dataBr(situacao.zeraEm)})`}
                  </span>
                )}
              </p>
              {situacao.validas.length > 0 && (
                <ul className="text-slate-500 list-disc pl-4">
                  {situacao.validas
                    .sort((a, b) => a.dataFato.localeCompare(b.dataFato))
                    .map((m) => (
                      <li key={m.id}>
                        {dataBr(m.dataFato)} — {tituloMedida(m as MedidaDisciplinar)}
                      </li>
                    ))}
                </ul>
              )}
              <p className="font-bold text-slate-800">
                Medida sugerida pela gradação: <span className="text-[#C48229]">{situacao.proxima.rotulo}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Data do fato</label>
              <input type="date" value={dataFato} max={hojeIso()} onChange={(e) => setDataFato(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Data em que a empresa soube do fato</label>
              <input
                type="date"
                value={dataCienciaFato}
                max={hojeIso()}
                onChange={(e) => setDataCienciaFato(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Descrição do fato</label>
            <textarea
              rows={4}
              value={descricaoFato}
              onChange={(e) => setDescricaoFato(e.target.value)}
              placeholder="Descreva de forma objetiva o que aconteceu: quando, onde, o que foi feito/deixado de fazer e as consequências. Evite opiniões."
              className="w-full p-2.5 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Enquadramento (art. 482 da CLT)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ALINEAS_ART_482.map((a) => (
                <label
                  key={a.codigo}
                  title={a.texto}
                  className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${
                    enquadramento.includes(a.codigo) ? 'bg-amber-50 border-amber-300' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input type="checkbox" checked={enquadramento.includes(a.codigo)} onChange={() => alternarEnquadramento(a.codigo)} className="mt-0.5" />
                  <span>
                    <strong>{a.codigo === 'epi' ? 'Art. 158' : `"${a.codigo}"`}</strong> {a.curto}
                  </span>
                </label>
              ))}
            </div>
            <input
              value={enquadramentoOutro}
              onChange={(e) => setEnquadramentoOutro(e.target.value)}
              placeholder="Outro (ex.: descumprimento do procedimento POP-012 de cadeia fria)"
              className="w-full mt-2 p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Testemunhas do fato (opcional)</label>
            <input
              value={testemunhasFato}
              onChange={(e) => setTestemunhasFato(e.target.value)}
              placeholder="Nome de quem presenciou"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          {ocorrenciasDoColaborador.length > 0 && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ocorrências relacionadas (últimos 90 dias)</label>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {ocorrenciasDoColaborador.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={ocorrenciasRelacionadas.includes(o.id)}
                      onChange={() =>
                        setOcorrenciasRelacionadas((prev) => (prev.includes(o.id) ? prev.filter((x) => x !== o.id) : [...prev, o.id]))
                      }
                    />
                    <span className="text-slate-500 shrink-0">{dataBr(o.dataOcorrencia || o.data)}</span>
                    <span className="font-semibold text-slate-700 shrink-0">{o.tipo}</span>
                    <span className="text-slate-500 truncate">{o.descricao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">Medida</label>
              <select
                value={etapa}
                onChange={(e) => {
                  setEtapaEscolhida(Number(e.target.value));
                  setDiasSuspensao(undefined);
                }}
                disabled={!colaboradorId}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white font-semibold"
              >
                {ESCADA_DISCIPLINAR.map((e) => (
                  <option key={e.etapa} value={e.etapa}>
                    {e.etapa}. {e.rotulo}
                    {e.etapa === etapaSugerida ? '  (sugerida)' : e.etapa > etapaSugerida ? '  (pula etapas)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {infoEtapa.tipo === 'Suspensão' && (
              <>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dias de suspensão</label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_DIAS_SUSPENSAO}
                    value={dias ?? ''}
                    onChange={(e) => setDiasSuspensao(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Início da suspensão (pode definir na aprovação)</label>
                  <input
                    type="date"
                    value={suspensaoInicio}
                    min={hojeIso()}
                    onChange={(e) => setSuspensaoInicio(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </>
            )}
            {etapa > etapaSugerida && (
              <div className="sm:col-span-3">
                <label className="font-semibold text-slate-700 block mb-1">Por que aplicar uma medida mais severa que a sugerida?</label>
                <textarea
                  rows={2}
                  value={justificativaEtapa}
                  onChange={(e) => setJustificativaEtapa(e.target.value)}
                  placeholder="Ex.: falta grave — colocou em risco a carga termolábil e a segurança da equipe."
                  className="w-full p-2 border border-amber-300 rounded-lg"
                />
              </div>
            )}
          </div>

          {alertas.length > 0 && (
            <div className="space-y-1.5">
              {alertas.map((a, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    a.nivel === 'erro'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : a.nivel === 'atencao'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-sky-50 border-sky-200 text-sky-800'
                  }`}
                >
                  {a.nivel === 'info' ? <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <span>{a.texto}</span>
                </div>
              ))}
            </div>
          )}

          {erro && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold">{erro}</div>}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500">
            {ehAdmin
              ? 'Depois de registrar, aprove a medida para gerar o documento e enviar para ciência.'
              : 'A medida fica como "Proposta" até um administrador aprovar.'}
          </p>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={bloqueado || salvando}
            className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {ehAdmin ? 'Registrar medida' : 'Propor medida'}
          </button>
        </div>
      </div>
    </div>
  );
};
