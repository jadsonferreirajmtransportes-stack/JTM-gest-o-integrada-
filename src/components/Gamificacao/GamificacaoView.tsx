import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Loader2, ChevronLeft, ChevronRight, Plus, Trash2, X, Megaphone, Search, Lock } from 'lucide-react';
import { Colaborador, UsuarioLogin } from '../../types';
import { getBatidas, getInicioControle, getJornadas, getJornadasColaboradores, getJustificativas, getLocais, BatidaPonto, JornadaPonto, JustificativaDia } from '../../utils/frequenciaApi';
import { DestaqueMes, Reconhecimento, excluirReconhecimento, getAtividadesDoMes, getDestaques, getReconhecimentos, salvarDestaque, salvarReconhecimento } from '../../utils/gamificacaoApi';
import { ResultadoMes, calcularMes, mesAtualLocal, PONTOS } from '../../utils/gamificacaoCalc';
import { saveNoticia, novoIdJornal } from '../../utils/jornalApi';
import { diasDoMes, hojeLocal, montarEspelho } from '../Frequencia/frequenciaCalc';
import { nomeMes } from '../Frequencia/espelhoPdf';

// ============================================================================
// DP → Gamificação & Destaques: pontos do mês de cada colaborador (só o DP vê
// esta lista — no portal cada um vê só o próprio), reconhecimentos lançados
// pelo DP e publicação do Destaque do mês no Jornal JMT.
// ============================================================================

const somarMes = (mes: string, n: number) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const nomeBonito = (nome: string) =>
  nome
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && ['da', 'de', 'do', 'das', 'dos', 'e'].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
const hoje = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

interface Linha {
  c: Colaborador;
  r: ResultadoMes;
}

export const GamificacaoView: React.FC<{ colaboradores: Colaborador[]; currentUser?: UsuarioLogin }> = ({ colaboradores, currentUser }) => {
  const [mes, setMes] = useState(mesAtualLocal());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [reconhecimentos, setReconhecimentos] = useState<Reconhecimento[]>([]);
  const [destaques, setDestaques] = useState<DestaqueMes[]>([]);
  const [busca, setBusca] = useState('');
  const [novoRec, setNovoRec] = useState(false);
  const [publicando, setPublicando] = useState<Linha | null>(null);

  const ativos = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo'), [colaboradores]);
  const nomePorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c.nomeCompleto] as [string, string])), [colaboradores]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dias = diasDoMes(mes);
      const [jornadas, jornadaDe, inicioControle, locais, batidas, justificativas, atividades, recs, dests] = await Promise.all([
        getJornadas(),
        getJornadasColaboradores(),
        getInicioControle(),
        getLocais(),
        getBatidas(dias[0], dias[dias.length - 1]),
        getJustificativas(dias[0], dias[dias.length - 1]),
        getAtividadesDoMes(mes),
        getReconhecimentos(),
        getDestaques(),
      ]);
      const jornadaPorId = new Map(jornadas.map((j) => [j.id, j] as [string, JornadaPonto]));
      const raio = locais.length ? Math.max(...locais.map((l) => l.raioM)) : 300;
      const porColab = <T extends { colaboradorId: string }>(lista: T[], id: string) => lista.filter((x) => x.colaboradorId === id);
      const novas = ativos.map((c) => {
        const jornada = jornadaPorId.get(jornadaDe.get(c.id) || '');
        const inicio = [c.dataAdmissao, inicioControle || undefined].filter(Boolean).sort().pop();
        const espelho = jornada
          ? montarEspelho(
              dias,
              batidas.filter((b: BatidaPonto) => b.colaboradorId === c.id),
              justificativas.filter((j: JustificativaDia) => j.colaboradorId === c.id),
              { jornada, inicioContagem: inicio || hojeLocal(), fimContagem: c.dataDemissao, raioPadraoM: raio }
            )
          : undefined;
        const r = calcularMes(mes, {
          espelho,
          treinamentos: porColab(atividades.treinamentos, c.id),
          documentos: porColab(atividades.documentos, c.id),
          comunicados: porColab(atividades.comunicados, c.id),
          reconhecimentos: porColab(recs, c.id),
        });
        return { c, r };
      });
      setLinhas(novas.sort((a, b) => b.r.pontos - a.r.pontos || a.c.nomeCompleto.localeCompare(b.c.nomeCompleto)));
      setReconhecimentos(recs);
      setDestaques(dests);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível carregar a gamificação. Se for a primeira vez, confirme que a migração 075 foi rodada no Supabase.');
    } finally {
      setCarregando(false);
    }
  }, [mes, ativos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recsDoMes = reconhecimentos.filter((r) => r.data.slice(0, 7) === mes);
  const destaquesDoMes = destaques.filter((d) => d.periodo === mes);
  const visiveis = linhas.filter((l) => !busca.trim() || l.c.nomeCompleto.toLowerCase().includes(busca.trim().toLowerCase()));
  const pts = (l: Linha, chave: string) => l.r.itens.find((i) => i.chave === chave)?.pontos ?? 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Gamificação & Destaques</h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Lista visível só para o DP — no portal, cada colaborador vê apenas o próprio desempenho.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMes(somarMes(mes, -1))} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" title="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-black text-slate-800 w-36 text-center">{nomeMes(mes)}</span>
          <button type="button" onClick={() => setMes(somarMes(mes, 1))} disabled={mes >= mesAtualLocal()} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40" title="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        {/* Pontos do mês */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide">Pontos de {nomeMes(mes)}</h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador" className="border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-xs w-52" />
            </div>
          </div>
          {carregando ? (
            <p className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" /> Calculando os pontos do mês...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[720px]">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-2.5 w-8">#</th>
                    <th className="text-left p-2.5">Colaborador</th>
                    <th className="text-right p-2.5" title={`+${PONTOS.diaPontual} por dia no horário`}>Pontual.</th>
                    <th className="text-right p-2.5" title={`+${PONTOS.mesSemFalta} no mês fechado sem faltas`}>Assid.</th>
                    <th className="text-right p-2.5">Treinos</th>
                    <th className="text-right p-2.5">Docs</th>
                    <th className="text-right p-2.5">Ciências</th>
                    <th className="text-right p-2.5">Reconh.</th>
                    <th className="text-right p-2.5">Total</th>
                    <th className="p-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiveis.map((l, i) => {
                    const ehDestaque = destaquesDoMes.some((d) => d.colaboradorId === l.c.id);
                    return (
                      <tr key={l.c.id} className={ehDestaque ? 'bg-amber-50/60' : ''}>
                        <td className="p-2.5 text-slate-400 tabular-nums">{busca ? '' : i + 1}</td>
                        <td className="p-2.5">
                          <span className="font-semibold text-slate-800">{nomeBonito(l.c.nomeCompleto)}</span> {ehDestaque && '🏆'}
                          <span className="block text-[10px] text-slate-400">{l.c.setor || l.c.funcaoCargo || ''}{l.r.diasPrevistos === 0 ? ' · sem ponto pelo celular' : ''}</span>
                        </td>
                        {['pontualidade', 'assiduidade', 'treinamentos', 'documentos', 'ciencias', 'reconhecimentos'].map((k) => (
                          <td key={k} className={`p-2.5 text-right tabular-nums ${pts(l, k) ? 'text-slate-700' : 'text-slate-300'}`}>{pts(l, k)}</td>
                        ))}
                        <td className="p-2.5 text-right font-black text-slate-900 tabular-nums">{l.r.pontos}</td>
                        <td className="p-2.5 text-right">
                          {!ehDestaque && l.r.pontos > 0 && (
                            <button type="button" onClick={() => setPublicando(l)} className="text-[11px] font-bold text-[#92611F] hover:underline whitespace-nowrap" title="Publicar como destaque do mês no Jornal">
                              Destacar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reconhecimentos e destaques */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide">Reconhecimentos</h2>
              <button type="button" onClick={() => setNovoRec(true)} className="px-2.5 py-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-[11px] font-bold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Lançar
              </button>
            </div>
            {recsDoMes.length === 0 ? (
              <p className="text-[11px] text-slate-400">Nenhum reconhecimento em {nomeMes(mes)}. Ex.: elogio de cliente, meta batida, sugestão aproveitada.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recsDoMes.map((r) => (
                  <li key={r.id} className="py-2 flex items-start justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-800">{nomeBonito(nomePorId.get(r.colaboradorId) || '—')}</span>
                      <span className="block text-[11px] text-slate-500">{r.motivo}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="font-black text-emerald-700">+{r.pontos}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('Excluir este reconhecimento?')) return;
                          await excluirReconhecimento(r.id).catch((e) => alert(String(e)));
                          carregar();
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide">Destaque do mês</h2>
            {destaquesDoMes.length === 0 ? (
              <p className="text-[11px] text-slate-400">Escolha na lista ("Destacar") — sai uma notícia no Jornal JMT e a medalha 🏆 no portal da pessoa.</p>
            ) : (
              destaquesDoMes.map((d) => (
                <p key={d.id} className="text-xs font-semibold text-slate-800">
                  🏆 {nomeBonito(nomePorId.get(d.colaboradorId) || '—')} <span className="text-slate-400 font-normal">· {d.pontos} pts</span>
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      {novoRec && (
        <NovoReconhecimentoModal
          colaboradores={ativos}
          mes={mes}
          onClose={() => setNovoRec(false)}
          onSalvar={async (r) => {
            await salvarReconhecimento({ ...r, criadoPor: currentUser?.nome });
            setNovoRec(false);
            carregar();
          }}
        />
      )}
      {publicando && (
        <PublicarDestaqueModal
          linha={publicando}
          mes={mes}
          autor={currentUser?.nome}
          onClose={() => setPublicando(null)}
          onPublicado={() => {
            setPublicando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
};

const NovoReconhecimentoModal: React.FC<{
  colaboradores: Colaborador[];
  mes: string;
  onClose: () => void;
  onSalvar: (r: { colaboradorId: string; data: string; pontos: number; motivo: string }) => Promise<void>;
}> = ({ colaboradores, mes, onClose, onSalvar }) => {
  const [colaboradorId, setColaboradorId] = useState('');
  const [data, setData] = useState(mes === mesAtualLocal() ? hoje() : `${mes}-01`);
  const [pontos, setPontos] = useState(50);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const ordenados = [...colaboradores].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
  const campo = 'w-full p-2 border border-slate-200 rounded-lg text-xs bg-white';
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Lançar reconhecimento</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <span className="font-semibold text-slate-600 block mb-1">Colaborador</span>
            <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} className={campo}>
              <option value="">Escolha...</option>
              {ordenados.map((c) => (
                <option key={c.id} value={c.id}>
                  {nomeBonito(c.nomeCompleto)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-semibold text-slate-600 block mb-1">Motivo</span>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: elogio do cliente pela entrega urgente" className={campo} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-semibold text-slate-600 block mb-1">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
            </label>
            <label className="block">
              <span className="font-semibold text-slate-600 block mb-1">Pontos</span>
              <select value={pontos} onChange={(e) => setPontos(Number(e.target.value))} className={campo}>
                <option value={20}>20 — gesto pontual</option>
                <option value={50}>50 — elogio / boa prática</option>
                <option value={100}>100 — feito excepcional</option>
              </select>
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-semibold">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!colaboradorId || !motivo.trim() || !data || salvando}
            onClick={async () => {
              setSalvando(true);
              try {
                await onSalvar({ colaboradorId, data, pontos, motivo: motivo.trim() });
              } catch (err) {
                console.error(err);
                alert('Não foi possível salvar.');
                setSalvando(false);
              }
            }}
            className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PublicarDestaqueModal: React.FC<{ linha: Linha; mes: string; autor?: string; onClose: () => void; onPublicado: () => void }> = ({ linha, mes, autor, onClose, onPublicado }) => {
  const nome = nomeBonito(linha.c.nomeCompleto);
  const conquistas = linha.r.itens.filter((i) => i.pontos > 0).map((i) => (i.chave === 'reconhecimentos' && i.detalhe ? `• Reconhecimento: ${i.detalhe}` : `• ${i.rotulo}${i.quantidade > 1 ? ` (${i.quantidade})` : ''}`));
  const [texto, setTexto] = useState(
    `Parabéns, ${nome}${linha.c.setor ? `, do setor ${linha.c.setor}` : ''}! Você foi o destaque de ${nomeMes(mes)} no programa de desempenho da JMT, com ${linha.r.pontos} pontos.\n\nO que fez a diferença no mês:\n${conquistas.join('\n')}\n\nObrigado pelo compromisso com a pontualidade, o aprendizado e o cuidado com cada entrega. Que sirva de inspiração para toda a equipe!`
  );
  const [autorizou, setAutorizou] = useState(false);
  const [publicando, setPublicando] = useState(false);

  const publicar = async () => {
    setPublicando(true);
    try {
      const noticia = await saveNoticia({
        id: '',
        titulo: `Destaque de ${nomeMes(mes)}: ${nome}`,
        resumo: `${nome} foi o destaque do mês no programa de desempenho da JMT.`,
        categoria: 'Nossa equipe',
        capa: '',
        blocos: [{ id: novoIdJornal('bl'), tipo: 'texto', texto }],
        status: 'publicada',
        destaque: true,
        permiteComentarios: true,
        autorNome: 'Departamento Pessoal',
        criadoPor: autor,
        autorizacaoImagem: false,
        publicadaEm: new Date().toISOString(),
      } as any);
      await salvarDestaque({ periodo: mes, colaboradorId: linha.c.id, pontos: linha.r.pontos, noticiaId: noticia.id, criadoPor: autor });
      onPublicado();
    } catch (err) {
      console.error(err);
      alert('Não foi possível publicar. Tente de novo.');
      setPublicando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true" data-no-uppercase="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg text-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#C48229]" /> Destaque de {nomeMes(mes)}
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-slate-600">
            Vai sair uma notícia no <b>Jornal JMT</b> (categoria "Nossa equipe") e a medalha 🏆 aparece no portal de {nome}. Os pontos dos outros colaboradores não são divulgados.
          </p>
          <label className="block">
            <span className="font-semibold text-slate-600 block mb-1">Texto da notícia</span>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={10} className="w-full p-2 border border-slate-200 rounded-lg leading-relaxed" />
          </label>
          <label className="flex items-start gap-2 font-semibold text-slate-700">
            <input type="checkbox" checked={autorizou} onChange={(e) => setAutorizou(e.target.checked)} className="mt-0.5" />
            {nome} autorizou a divulgação do nome no Jornal (LGPD).
          </label>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 font-semibold">
            Cancelar
          </button>
          <button type="button" disabled={!autorizou || publicando || !texto.trim()} onClick={publicar} className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold disabled:opacity-50">
            {publicando ? 'Publicando...' : 'Publicar no Jornal'}
          </button>
        </div>
      </div>
    </div>
  );
};
