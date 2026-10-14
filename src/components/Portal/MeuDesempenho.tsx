import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Trophy, Target, Award, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { CredenciaisPortal, TreinamentoPortal } from '../../utils/educacaoApi';
import { portalComunicados, portalDocumentos, ComunicadoPortal, DocumentoPortal } from '../../utils/portalColaboradorApi';
import { pontoHistorico } from '../../utils/frequenciaApi';
import { portalGamificacao, Reconhecimento } from '../../utils/gamificacaoApi';
import { diasDoMes, hojeLocal, montarEspelho } from '../Frequencia/frequenciaCalc';
import { nomeMes } from '../Frequencia/espelhoPdf';
import { PONTOS, ResultadoMes, calcularMes, medalhasDe, mesAtualLocal, mesesDoPrograma, nivelDe } from '../../utils/gamificacaoCalc';

// ============================================================================
// "Meu desempenho" no portal: nível acumulado, pontos do mês, missões, medalhas
// e histórico. Cada colaborador vê SÓ o próprio desempenho (não há ranking).
// ============================================================================

export const MeuDesempenho: React.FC<{ credenciais: CredenciaisPortal; treinamentos: TreinamentoPortal[]; onIr?: (aba: 'documentos' | 'treinamentos' | 'comunicados' | 'ponto') => void }> = ({
  credenciais,
  treinamentos,
  onIr,
}) => {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoPortal[]>([]);
  const [comunicados, setComunicados] = useState<ComunicadoPortal[]>([]);
  const [reconhecimentos, setReconhecimentos] = useState<Reconhecimento[]>([]);
  const [destaques, setDestaques] = useState<{ periodo: string; pontos: number }[]>([]);
  const [espelhos, setEspelhos] = useState<Record<string, ReturnType<typeof montarEspelho> | undefined>>({});
  const [verRegras, setVerRegras] = useState(false);
  const [mesAberto, setMesAberto] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [docs, coms, gam] = await Promise.all([portalDocumentos(credenciais), portalComunicados(credenciais), portalGamificacao(credenciais)]);
        // Ponto de cada mês do programa (só de quem usa o ponto pelo celular — sem jornada, não conta).
        const meses = mesesDoPrograma();
        const porMes: Record<string, ReturnType<typeof montarEspelho> | undefined> = {};
        for (const mes of meses) {
          try {
            const r = await pontoHistorico(credenciais, mes);
            const h = r.historico;
            if (!h?.jornada) continue;
            const inicio = [h.admissao, h.inicioControle].filter(Boolean).sort().pop() as string | undefined;
            porMes[mes] = montarEspelho(diasDoMes(mes), h.batidas, h.justificativas, {
              jornada: h.jornada,
              inicioContagem: inicio || hojeLocal(),
              fimContagem: h.demissao,
              raioPadraoM: h.raioPadraoM,
            });
          } catch {
            /* sem ponto nesse mês */
          }
        }
        if (cancelado) return;
        setDocumentos(docs);
        setComunicados(coms);
        setReconhecimentos(gam.reconhecimentos);
        setDestaques(gam.destaques);
        setEspelhos(porMes);
      } catch (err) {
        console.error(err);
        if (!cancelado) setErro('Não foi possível carregar seu desempenho agora. Tente de novo em instantes.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [credenciais]);

  const meses: ResultadoMes[] = useMemo(
    () =>
      mesesDoPrograma().map((p) =>
        calcularMes(p, {
          espelho: espelhos[p],
          treinamentos,
          documentos,
          comunicados,
          reconhecimentos,
        })
      ),
    [espelhos, treinamentos, documentos, comunicados, reconhecimentos]
  );
  const total = meses.reduce((s, m) => s + m.pontos, 0);
  const nivel = nivelDe(total);
  const atual = meses.find((m) => m.periodo === mesAtualLocal()) || meses[meses.length - 1];
  const medalhas = medalhasDe(meses, { treinamentos, reconhecimentos }, destaques);
  const usaPonto = Object.values(espelhos).some(Boolean);

  const docsPendentes = documentos.filter((d) => d.status !== 'Assinado' && !d.vencido).length;
  const treinosPendentes = treinamentos.filter((t) => t.status !== 'Concluído').length;
  const cienciasPendentes = comunicados.filter((c) => c.exigeCiencia && !c.cienteEm).length;
  const missoes = [
    docsPendentes > 0 && { texto: `Assine ${docsPendentes} documento(s) pendente(s)`, pontos: `+${PONTOS.documentoEmDia} cada, se em até 3 dias`, ir: 'documentos' as const },
    treinosPendentes > 0 && { texto: `Conclua ${treinosPendentes} treinamento(s)`, pontos: `+${PONTOS.treinamento} cada`, ir: 'treinamentos' as const },
    cienciasPendentes > 0 && { texto: `Dê ciência em ${cienciasPendentes} comunicado(s)`, pontos: `+${PONTOS.cienciaEmDia} cada, se em até 3 dias`, ir: 'comunicados' as const },
    usaPonto && { texto: 'Bata o ponto no horário todos os dias', pontos: `+${PONTOS.diaPontual} por dia`, ir: 'ponto' as const },
    usaPonto && { texto: 'Feche o mês sem faltas', pontos: `+${PONTOS.mesSemFalta} no fim do mês`, ir: 'ponto' as const },
  ].filter(Boolean) as { texto: string; pontos: string; ir: 'documentos' | 'treinamentos' | 'comunicados' | 'ponto' }[];

  if (carregando)
    return (
      <p className="text-xs text-slate-500 flex items-center gap-2 p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Calculando seu desempenho...
      </p>
    );
  if (erro) return <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>;

  return (
    <div className="space-y-4">
      {/* Nível */}
      <div className="rounded-2xl p-5 border shadow-xs" style={{ background: nivel.atual.fundo, borderColor: `${nivel.atual.cor}55` }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0" style={{ background: nivel.atual.cor }}>
            <Trophy className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: nivel.atual.cor }}>
              Nível {nivel.atual.nome}
            </p>
            <p className="text-2xl font-black text-slate-900 tabular-nums">{total} pontos</p>
            <div className="mt-2 h-2.5 rounded-full bg-white/70 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(nivel.progresso * 100)}%`, background: nivel.atual.cor }} />
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              {nivel.proximo ? `Faltam ${nivel.faltam} pontos para o nível ${nivel.proximo.nome}` : 'Você chegou ao nível máximo!'}
            </p>
          </div>
        </div>
      </div>

      {/* Este mês */}
      {atual && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide">{nomeMes(atual.periodo)}</h2>
            <span className="text-sm font-black text-[#92611F]">{atual.pontos} pts</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {atual.itens.map((i) => (
              <li key={i.chave} className="py-2 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0">
                  <span className="font-semibold text-slate-800">{i.rotulo}</span>
                  {i.detalhe && <span className="block text-[11px] text-slate-500 truncate">{i.detalhe}</span>}
                </span>
                <span className={`font-black tabular-nums shrink-0 ${i.pontos ? 'text-emerald-700' : 'text-slate-300'}`}>+{i.pontos}</span>
              </li>
            ))}
          </ul>
          {!usaPonto && <p className="text-[11px] text-slate-400 mt-1">Pontualidade e assiduidade contam para quem bate o ponto pelo celular.</p>}
        </div>
      )}

      {/* Missões */}
      {missoes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-[#C48229]" /> Missões
          </h2>
          <ul className="space-y-1.5">
            {missoes.map((m) => (
              <li key={m.texto}>
                <button
                  type="button"
                  onClick={() => onIr?.(m.ir)}
                  className="w-full text-left normal-case tracking-normal flex items-center justify-between gap-3 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 hover:bg-amber-50"
                >
                  <span className="text-xs font-semibold text-slate-800">{m.texto}</span>
                  <span className="text-[10px] font-bold text-[#92611F] shrink-0">{m.pontos}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Medalhas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <Award className="w-3.5 h-3.5 text-[#C48229]" /> Medalhas ({medalhas.filter((m) => m.conquistada).length}/{medalhas.length})
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {medalhas.map((m) => (
            <div key={m.id} title={m.descricao} className={`rounded-xl border p-2 text-center ${m.conquistada ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-50 grayscale'}`}>
              <div className="text-2xl">{m.emoji}</div>
              <p className="text-[10px] font-bold text-slate-700 leading-tight mt-1">{m.nome}</p>
              <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{m.descricao}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico */}
      {meses.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide mb-2">Meses anteriores</h2>
          <ul className="divide-y divide-slate-100">
            {[...meses]
              .filter((m) => m.periodo !== atual?.periodo)
              .reverse()
              .map((m) => (
                <li key={m.periodo} className="py-1.5">
                  <button type="button" onClick={() => setMesAberto(mesAberto === m.periodo ? null : m.periodo)} className="w-full normal-case tracking-normal flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      {nomeMes(m.periodo)} {destaques.some((d) => d.periodo === m.periodo) && '🏆'}
                    </span>
                    <span className="flex items-center gap-1 font-black text-slate-800 tabular-nums">
                      {m.pontos} pts {mesAberto === m.periodo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  {mesAberto === m.periodo && (
                    <ul className="mt-1 pl-2 text-[11px] text-slate-500 space-y-0.5">
                      {m.itens.filter((i) => i.pontos).map((i) => (
                        <li key={i.chave} className="flex justify-between">
                          <span>{i.rotulo}</span>
                          <span className="tabular-nums">+{i.pontos}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Regras */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <button type="button" onClick={() => setVerRegras((v) => !v)} className="w-full normal-case tracking-normal flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#C48229]" /> Como ganhar pontos
          </span>
          {verRegras ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {verRegras && (
          <ul className="mt-2 space-y-1 text-[11px] text-slate-600 list-disc pl-4">
            <li>Ponto no horário: +{PONTOS.diaPontual} por dia (quem bate o ponto pelo celular).</li>
            <li>Mês fechado sem faltas: +{PONTOS.mesSemFalta}. Atestado, abono, folga e férias não tiram pontos.</li>
            <li>Treinamento concluído: +{PONTOS.treinamento}.</li>
            <li>Documento assinado em até 3 dias: +{PONTOS.documentoEmDia}.</li>
            <li>Ciência de comunicado em até 3 dias: +{PONTOS.cienciaEmDia}.</li>
            <li>Reconhecimentos do DP (elogio de cliente, meta batida...): pontos definidos pelo DP.</li>
            <li>Os pontos de cada mês somam no seu nível: Bronze, Prata (300), Ouro (800) e Diamante (1.500).</li>
            <li>Só você vê a sua pontuação. Todo mês, o destaque é homenageado no Jornal JMT.</li>
          </ul>
        )}
      </div>
    </div>
  );
};
