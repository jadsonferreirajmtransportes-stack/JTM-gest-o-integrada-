import React, { useMemo, useState } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ScanSearch } from 'lucide-react';
import { Colaborador } from '../../types';
import { criarDocumentoAssinatura, DocumentoAssinatura } from '../../utils/documentosAssinaturaApi';
import { extrairPaginasComPosicao, formatarCompetencia } from './contrachequePdfUtils';
import { FolhaExtraLida, TIPO_FOLHA_EXTRA, formatarReais, gerarReciboFolhaExtraPdf, lerFolhaExtra } from './folhaExtraUtils';

interface ImportarFolhaExtraModalProps {
  colaboradores: Colaborador[];
  existentes: DocumentoAssinatura[];
  criadoPor?: string;
  onClose: () => void;
  onImportado: (novos: DocumentoAssinatura[]) => void;
}

function competenciaPadraoInicial(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/** Importa a folha extra pronta da contabilidade (PDF com uma linha por colaborador), refaz cada
 *  linha como recibo no padrão JMT e cria um documento pra assinar junto dos contracheques
 *  (mesma competência, tipo "Folha extra"). */
export const ImportarFolhaExtraModal: React.FC<ImportarFolhaExtraModalProps> = ({ colaboradores, existentes, criadoPor, onClose, onImportado }) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [folha, setFolha] = useState<FolhaExtraLida | null>(null);
  const [competencia, setCompetencia] = useState(competenciaPadraoInicial());
  const [ignorados, setIgnorados] = useState<Set<number>>(new Set());
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });
  const [erro, setErro] = useState<string | null>(null);

  const colaboradoresOrdenados = useMemo(() => [...colaboradores].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)), [colaboradores]);
  const porId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c] as [string, Colaborador])), [colaboradores]);

  const jaImportado = (colaboradorId?: string) =>
    !!colaboradorId && existentes.some((d) => d.colaboradorId === colaboradorId && d.referencia === competencia && d.tipo === TIPO_FOLHA_EXTRA);

  const handleLer = async () => {
    if (!arquivo) return;
    setErro(null);
    setLendo(true);
    try {
      const lida = lerFolhaExtra(await extrairPaginasComPosicao(arquivo), colaboradores);
      if (lida.linhas.length === 0) {
        setErro('Não encontrei a tabela da folha extra neste PDF (cabeçalho com "Nome do empregado" ... "Total"). Confira se é o arquivo certo, em PDF com texto (não foto).');
        return;
      }
      const comp = lida.competencia || competencia;
      setCompetencia(comp);
      setFolha(lida);
      setIgnorados(
        new Set(
          lida.linhas
            .filter((l) => l.colaboradorId && existentes.some((d) => d.colaboradorId === l.colaboradorId && d.referencia === comp && d.tipo === TIPO_FOLHA_EXTRA))
            .map((l) => l.ordem)
        )
      );
    } catch (err) {
      console.error(err);
      setErro('Não foi possível ler este PDF.');
    } finally {
      setLendo(false);
    }
  };

  const atribuir = (ordem: number, colaboradorId: string) =>
    setFolha((f) => (f ? { ...f, linhas: f.linhas.map((l) => (l.ordem === ordem ? { ...l, colaboradorId: colaboradorId || undefined } : l)) } : f));

  const aImportar = folha ? folha.linhas.filter((l) => l.colaboradorId && !ignorados.has(l.ordem)) : [];

  const handleImportar = async () => {
    if (!folha || aImportar.length === 0) return;
    setErro(null);
    setImportando(true);
    setProgresso({ feito: 0, total: aImportar.length });
    const loteId = `lote-${Date.now()}`;
    const criados: DocumentoAssinatura[] = [];
    const falhas: string[] = [];
    for (const l of aImportar) {
      const c = porId.get(l.colaboradorId!);
      if (!c) continue;
      try {
        const { arquivo: pdf, camposAssinatura } = gerarReciboFolhaExtraPdf({ colaborador: c, competencia, rubrica: folha.rubrica, linha: l });
        criados.push(
          await criarDocumentoAssinatura({
            categoria: 'contracheque',
            colaboradorId: c.id,
            colaboradorNome: c.nomeCompleto,
            referencia: competencia,
            tipo: TIPO_FOLHA_EXTRA,
            titulo: `Recibo de Folha Extra — ${formatarCompetencia(competencia)}`,
            arquivo: pdf,
            camposAssinatura,
            loteId,
            criadoPor,
          })
        );
      } catch (err) {
        console.error(err);
        falhas.push(c.nomeCompleto);
      }
      setProgresso((p) => ({ ...p, feito: p.feito + 1 }));
    }
    setImportando(false);
    onImportado(criados);
    if (falhas.length) setErro(`${criados.length} importado(s). Não foi possível importar: ${falhas.join(', ')}.`);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#C48229]" />
            Importar Folha Extra
          </h2>
          <button type="button" onClick={onClose} disabled={importando} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <p className="text-slate-500">
            Envie o PDF da folha extra que vem da contabilidade. Cada linha vira um <b>recibo com a formatação da JMT</b>, que o colaborador recebe e assina no
            portal junto com o contracheque do mês.
          </p>
          <label className="flex items-center gap-2 p-3 border-2 border-dashed border-amber-300 hover:border-[#C48229] bg-amber-50/40 rounded-lg cursor-pointer">
            <FileText className="w-4 h-4 text-[#C48229] shrink-0" />
            <span className="truncate font-semibold text-slate-700">{arquivo ? arquivo.name : 'Clique para escolher o PDF da folha extra'}</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={importando}
              onChange={(e) => {
                setArquivo(e.target.files?.[0] || null);
                setFolha(null);
                e.target.value = '';
              }}
            />
          </label>

          {!folha && (
            <button
              type="button"
              onClick={handleLer}
              disabled={!arquivo || lendo}
              className="w-full py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {lendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
              {lendo ? 'Lendo o PDF...' : 'Ler PDF e identificar colaboradores'}
            </button>
          )}

          {erro && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {folha && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Competência</span>
                  <input type="month" value={competencia} disabled={importando} onChange={(e) => setCompetencia(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg" />
                </label>
                {folha.rubrica && (
                  <span className="text-slate-500">
                    Referente a: <b className="text-slate-700">{folha.rubrica}</b>
                  </span>
                )}
                {!folha.competencia && <span className="text-amber-700 font-semibold">Confira a competência — não achei o mês no PDF.</span>}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[45vh] overflow-y-auto">
                <table className="w-full min-w-[620px]">
                  <thead className="bg-slate-50 text-left text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2">Na folha</th>
                      <th className="px-3 py-2">Colaborador no sistema</th>
                      <th className="px-3 py-2">Valores</th>
                      <th className="px-3 py-2 text-right">Total R$</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {folha.linhas.map((l) => (
                      <tr key={l.ordem} className={!l.colaboradorId || ignorados.has(l.ordem) ? 'opacity-60' : ''}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!!l.colaboradorId && !ignorados.has(l.ordem)}
                            disabled={importando || !l.colaboradorId}
                            onChange={() =>
                              setIgnorados((prev) => {
                                const novo = new Set(prev);
                                if (novo.has(l.ordem)) novo.delete(l.ordem);
                                else novo.add(l.ordem);
                                return novo;
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800">{l.nomeNoPdf}</p>
                          <p className="text-slate-400">{l.cargo}</p>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={l.colaboradorId || ''}
                            disabled={importando}
                            onChange={(e) => atribuir(l.ordem, e.target.value)}
                            className={`p-1.5 border rounded-lg bg-white w-56 ${l.colaboradorId ? 'border-slate-200' : 'border-amber-300 bg-amber-50'}`}
                          >
                            <option value="">— escolha / não importar —</option>
                            {colaboradoresOrdenados.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nomeCompleto}
                              </option>
                            ))}
                          </select>
                          {jaImportado(l.colaboradorId) && (
                            <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Já importado</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{l.valores.map((v) => `${v.rotulo.split(' (')[0]} ${formatarReais(v.valor)}`).join(' · ')}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">
                          {formatarReais(l.total)}
                          {l.totalCalculado && (
                            <p className="text-[10px] font-semibold text-amber-700" title="A folha veio com o Total em branco (-); o sistema somou os valores da linha.">
                              Total em branco na folha — confira
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {folha.linhas.some((l) => !l.colaboradorId) && (
                <p className="text-amber-700 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Linhas sem colaborador identificado: escolha de quem é, ou deixe em branco para não importar.
                </p>
              )}
            </div>
          )}
        </div>

        {folha && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <button type="button" onClick={() => setFolha(null)} disabled={importando} className="px-3 py-2 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50">
              Voltar
            </button>
            <button
              type="button"
              onClick={handleImportar}
              disabled={importando || aImportar.length === 0}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {importando ? `Importando ${progresso.feito} de ${progresso.total}...` : `Importar ${aImportar.length} recibo(s) de folha extra`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
