import React, { useEffect, useMemo, useState } from 'react';
import { Gavel, Plus, Loader2, Search, Clock, CheckCircle2, UserX, XCircle, Ban, FileSignature } from 'lucide-react';
import { Colaborador, Empregador, Ocorrencia, UserRole, UsuarioLogin } from '../../types';
import { MedidaDisciplinar, getMedidasDisciplinares } from '../../utils/disciplinarApi';
import { DocumentoAssinatura, getDocumentosAssinatura } from '../../utils/documentosAssinaturaApi';
import { ESCADA_DISCIPLINAR, MESES_REINCIDENCIA, situacaoDisciplinar } from './disciplinarRegras';
import { tituloMedida } from './disciplinarPdf';
import { NovaMedidaModal } from './NovaMedidaModal';
import { MedidaDetalheModal } from './MedidaDetalheModal';

interface DisciplinarViewProps {
  colaboradores: Colaborador[];
  empregadores: Empregador[];
  ocorrencias: Ocorrencia[];
  currentUser?: UsuarioLogin;
  userRole: UserRole;
  onSalvarOcorrencia: (o: Ocorrencia) => Promise<void>;
  onExcluirOcorrencia: (id: string) => Promise<void>;
}

function dataBr(iso?: string): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** DP → Disciplinar: medidas disciplinares com gradação (escada de 7 etapas, reincidência de 12
 *  meses), aprovação do administrador, documento com ciência por link/assinatura (ou recusa com
 *  testemunhas) e visão da progressão de cada colaborador. Regras em disciplinarRegras.ts. */
export const DisciplinarView: React.FC<DisciplinarViewProps> = ({
  colaboradores,
  empregadores,
  ocorrencias,
  currentUser,
  userRole,
  onSalvarOcorrencia,
  onExcluirOcorrencia,
}) => {
  const ehAdmin = userRole === 'admin';
  const [medidas, setMedidas] = useState<MedidaDisciplinar[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoAssinatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<'medidas' | 'colaboradores'>('medidas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [novaPara, setNovaPara] = useState<string | null>(null); // '' = sem colaborador pré-escolhido
  const [detalhe, setDetalhe] = useState<MedidaDisciplinar | null>(null);

  useEffect(() => {
    Promise.all([getMedidasDisciplinares(), getDocumentosAssinatura('disciplinar')])
      .then(([ms, ds]) => {
        setMedidas(ms);
        setDocumentos(ds);
      })
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar as medidas disciplinares. Verifique sua conexão.');
      })
      .finally(() => setCarregando(false));
  }, []);

  const docPorId = useMemo(() => new Map(documentos.map((d) => [d.id, d])), [documentos]);
  const aguardando = medidas.filter((m) => m.status === 'Proposta' && colaboradores.some((c) => c.id === m.colaboradorId)).length;

  const statusExibido = (m: MedidaDisciplinar): { texto: string; classe: string; icone: React.ReactNode } => {
    if (m.status === 'Proposta') return { texto: 'Aguardando aprovação', classe: 'bg-amber-50 text-[#92611F] border-amber-200', icone: <Clock className="w-3 h-3" /> };
    if (m.status === 'Rejeitada') return { texto: 'Rejeitada', classe: 'bg-slate-100 text-slate-500 border-slate-200', icone: <XCircle className="w-3 h-3" /> };
    if (m.status === 'Cancelada') return { texto: 'Cancelada', classe: 'bg-slate-100 text-slate-500 border-slate-200', icone: <Ban className="w-3 h-3" /> };
    if (m.status === 'Recusou-se a assinar') return { texto: 'Recusa c/ testemunhas', classe: 'bg-rose-50 text-rose-700 border-rose-200', icone: <UserX className="w-3 h-3" /> };
    const doc = m.documentoId ? docPorId.get(m.documentoId) : undefined;
    if (m.tipo === 'Recomendação de justa causa') return { texto: 'Aprovada (interna)', classe: 'bg-rose-50 text-rose-700 border-rose-200', icone: <CheckCircle2 className="w-3 h-3" /> };
    if (doc?.status === 'Assinado') return { texto: 'Ciente (assinada)', classe: 'bg-emerald-50 text-emerald-700 border-emerald-200', icone: <CheckCircle2 className="w-3 h-3" /> };
    if (doc) return { texto: doc.status === 'Visualizado' ? 'Aprovada — vista, sem assinatura' : 'Aprovada — enviada', classe: 'bg-sky-50 text-sky-700 border-sky-200', icone: <FileSignature className="w-3 h-3" /> };
    return { texto: 'Aprovada — gerar documento', classe: 'bg-sky-50 text-sky-700 border-sky-200', icone: <FileSignature className="w-3 h-3" /> };
  };

  // `colaboradores` já vem recortado pela equipe do supervisor (App.tsx) — a lista de medidas
  // segue o mesmo recorte.
  const idsVisiveis = useMemo(() => new Set(colaboradores.map((c) => c.id)), [colaboradores]);
  const medidasVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return medidas.filter(
      (m) =>
        idsVisiveis.has(m.colaboradorId) &&
        (filtroStatus === 'todas' ||
          (filtroStatus === 'pendentes' && m.status === 'Proposta') ||
          (filtroStatus === 'ativas' && (m.status === 'Aprovada' || m.status === 'Recusou-se a assinar')) ||
          (filtroStatus === 'encerradas' && (m.status === 'Rejeitada' || m.status === 'Cancelada'))) &&
        (!termo || m.colaboradorNome.toLowerCase().includes(termo))
    );
  }, [medidas, filtroStatus, busca, idsVisiveis]);

  const colaboradoresComSituacao = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return colaboradores
      .filter((c) => c.status !== 'Inativo' && (!termo || c.nomeCompleto.toLowerCase().includes(termo)))
      .map((c) => ({ c, s: situacaoDisciplinar(c.id, medidas) }))
      .filter((x) => x.s.etapaAtual > 0 || termo)
      .sort((a, b) => b.s.etapaAtual - a.s.etapaAtual || a.c.nomeCompleto.localeCompare(b.c.nomeCompleto));
  }, [colaboradores, medidas, busca]);

  const atualizarMedida = (m: MedidaDisciplinar) => {
    setMedidas((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev]));
    setDetalhe((atual) => (atual && atual.id === m.id ? m : atual));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Disciplinar</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Advertências e suspensões com gradação (CLT art. 482 e 474), aprovação, ciência do colaborador e histórico de{' '}
              {MESES_REINCIDENCIA} meses.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNovaPara('')}
          className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {ehAdmin ? 'Nova medida' : 'Propor medida'}
        </button>
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      {ehAdmin && aguardando > 0 && (
        <button
          type="button"
          onClick={() => {
            setAba('medidas');
            setFiltroStatus('pendentes');
          }}
          className="w-full p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold text-left flex items-center gap-2"
        >
          <Clock className="w-4 h-4" /> {aguardando} medida(s) aguardando sua aprovação — clique para ver
        </button>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['medidas', 'colaboradores'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAba(a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${aba === a ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              {a === 'medidas' ? 'Medidas' : 'Progressão por colaborador'}
            </button>
          ))}
        </div>
        {aba === 'medidas' && (
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold">
            <option value="todas">Todas</option>
            <option value="pendentes">Aguardando aprovação</option>
            <option value="ativas">Aprovadas</option>
            <option value="encerradas">Rejeitadas/canceladas</option>
          </select>
        )}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador" className="w-full pl-8 p-2 border border-slate-200 rounded-lg text-xs" />
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : aba === 'medidas' ? (
        medidasVisiveis.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
            Nenhuma medida disciplinar {filtroStatus !== 'todas' ? 'neste filtro' : 'registrada ainda'}.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Colaborador</th>
                  <th className="px-3 py-2.5">Medida</th>
                  <th className="px-3 py-2.5">Data do fato</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Proposta por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medidasVisiveis.map((m) => {
                  const st = statusExibido(m);
                  return (
                    <tr key={m.id} onClick={() => setDetalhe(m)} className="hover:bg-slate-50/70 cursor-pointer">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{m.colaboradorNome}</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {tituloMedida(m)} <span className="text-slate-400">• etapa {m.etapa}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{dataBr(m.dataFato)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.classe}`}>
                          {st.icone}
                          {st.texto}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{m.propostoPor || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : colaboradoresComSituacao.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
          Nenhum colaborador com medida válida nos últimos {MESES_REINCIDENCIA} meses.
        </div>
      ) : (
        <div className="space-y-2">
          {colaboradoresComSituacao.map(({ c, s }) => (
            <div key={c.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="lg:w-56 shrink-0">
                <p className="text-xs font-bold text-slate-800">{c.nomeCompleto}</p>
                <p className="text-[11px] text-slate-500">
                  {s.etapaAtual > 0 && s.zeraEm ? `Zera em ${dataBr(s.zeraEm)}` : 'Sem medidas válidas'}
                </p>
              </div>
              <div className="flex-1 flex items-center gap-1">
                {ESCADA_DISCIPLINAR.map((e) => (
                  <div
                    key={e.etapa}
                    title={e.rotulo}
                    className={`flex-1 h-2.5 rounded-full ${
                      e.etapa <= s.etapaAtual
                        ? e.etapa >= 7
                          ? 'bg-rose-600'
                          : e.etapa >= 4
                            ? 'bg-rose-400'
                            : 'bg-amber-400'
                        : e.etapa === s.proxima.etapa
                          ? 'bg-slate-300 ring-2 ring-[#C48229]/40'
                          : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
              <div className="lg:w-64 shrink-0 flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-600">
                  Próxima: <strong className="text-slate-800">{s.proxima.rotulo}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setNovaPara(c.id)}
                  className="px-2 py-1 text-[11px] font-bold text-[#92611F] bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 shrink-0"
                >
                  {ehAdmin ? 'Registrar' : 'Propor'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {novaPara !== null && (
        <NovaMedidaModal
          colaboradores={colaboradores}
          medidas={medidas}
          ocorrencias={ocorrencias}
          currentUser={currentUser}
          ehAdmin={ehAdmin}
          colaboradorInicialId={novaPara || undefined}
          onClose={() => setNovaPara(null)}
          onSalvo={(m) => {
            atualizarMedida(m);
            setDetalhe(m);
          }}
        />
      )}

      {detalhe && (
        <MedidaDetalheModal
          medida={detalhe}
          medidas={medidas}
          colaboradores={colaboradores}
          empregadores={empregadores}
          ocorrencias={ocorrencias}
          currentUser={currentUser}
          ehAdmin={ehAdmin}
          onClose={() => setDetalhe(null)}
          onAtualizada={atualizarMedida}
          onDocumentoAtualizado={(d) => setDocumentos((prev) => [d, ...prev.filter((x) => x.id !== d.id)])}
          onSalvarOcorrencia={onSalvarOcorrencia}
          onExcluirOcorrencia={onExcluirOcorrencia}
        />
      )}
    </div>
  );
};
