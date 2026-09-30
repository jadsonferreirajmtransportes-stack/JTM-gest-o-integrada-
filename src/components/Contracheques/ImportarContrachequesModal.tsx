import React, { useMemo, useState } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ScanSearch } from 'lucide-react';
import { Colaborador } from '../../types';
import { criarDocumentoAssinatura, DocumentoAssinatura } from '../../utils/documentosAssinaturaApi';
import {
  PaginaIdentificada,
  extrairTextoDasPaginas,
  identificarPaginas,
  agruparPorColaborador,
  separarPaginas,
  formatarCompetencia,
} from './contrachequePdfUtils';

const TIPOS_CONTRACHEQUE = ['Mensal', 'Adiantamento', '13º Salário — 1ª parcela', '13º Salário — 2ª parcela', 'Férias', 'Rescisão'];

interface ImportarContrachequesModalProps {
  colaboradores: Colaborador[];
  /** Já importados — pra avisar de duplicidade (mesmo colaborador + competência + tipo). */
  existentes: DocumentoAssinatura[];
  criadoPor?: string;
  onClose: () => void;
  onImportado: (novos: DocumentoAssinatura[]) => void;
}

function competenciaPadrao(): string {
  // Folha costuma ser importada no começo do mês seguinte — sugere o mês anterior.
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/** Importa o PDF da folha (todos os contracheques num arquivo só, um por página): lê o texto
 *  de cada página, identifica o colaborador pelo CPF/nome, mostra uma prévia pra conferir e
 *  corrigir, e só então separa as páginas e grava um documento por colaborador. */
export const ImportarContrachequesModal: React.FC<ImportarContrachequesModalProps> = ({
  colaboradores,
  existentes,
  criadoPor,
  onClose,
  onImportado,
}) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [competencia, setCompetencia] = useState(competenciaPadrao());
  const [tipo, setTipo] = useState(TIPOS_CONTRACHEQUE[0]);
  const [lendo, setLendo] = useState(false);
  const [paginas, setPaginas] = useState<PaginaIdentificada[] | null>(null);
  const [ignorados, setIgnorados] = useState<Set<string>>(new Set());
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });
  const [erro, setErro] = useState<string | null>(null);

  const colaboradoresOrdenados: Colaborador[] = useMemo(
    () => [...colaboradores].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)),
    [colaboradores]
  );
  const nomePorId: Map<string, string> = useMemo(
    () => new Map(colaboradores.map((c) => [c.id, c.nomeCompleto] as [string, string])),
    [colaboradores]
  );

  const grupos: Map<string, number[]> = useMemo(
    () => (paginas ? agruparPorColaborador(paginas) : new Map<string, number[]>()),
    [paginas]
  );
  const paginasSemColaborador = paginas?.filter((p) => !p.colaboradorId) ?? [];

  const jaImportado = (colaboradorId: string) =>
    existentes.some((d) => d.colaboradorId === colaboradorId && d.referencia === competencia && d.tipo === tipo);

  const handleLer = async () => {
    if (!arquivo) return;
    setErro(null);
    setLendo(true);
    try {
      const textos = await extrairTextoDasPaginas(arquivo);
      const identificadas = identificarPaginas(textos, colaboradores);
      setPaginas(identificadas);
      // Quem já tem contracheque dessa competência/tipo começa desmarcado — evita duplicar
      // quando a mesma folha é importada duas vezes por engano.
      setIgnorados(
        new Set(
          Array.from(agruparPorColaborador(identificadas).keys()).filter((id) =>
            existentes.some((d) => d.colaboradorId === id && d.referencia === competencia && d.tipo === tipo)
          )
        )
      );
    } catch (err) {
      console.error(err);
      setErro('Não foi possível ler este PDF. Confira se é o arquivo da folha (PDF com texto, não uma foto/escaneado).');
    } finally {
      setLendo(false);
    }
  };

  const handleAtribuirPagina = (indice: number, colaboradorId: string) => {
    setPaginas((prev) =>
      prev
        ? prev.map((p) =>
            p.indice === indice
              ? { ...p, colaboradorId: colaboradorId || undefined, motivo: colaboradorId ? 'manual' : undefined }
              : p
          )
        : prev
    );
  };

  const alternarIgnorado = (colaboradorId: string) => {
    setIgnorados((prev) => {
      const novo = new Set(prev);
      if (novo.has(colaboradorId)) novo.delete(colaboradorId);
      else novo.add(colaboradorId);
      return novo;
    });
  };

  const aImportar = Array.from(grupos.entries()).filter(([id]) => !ignorados.has(id));

  const handleImportar = async () => {
    if (!arquivo || aImportar.length === 0) return;
    setErro(null);
    setImportando(true);
    setProgresso({ feito: 0, total: aImportar.length });
    const loteId = `lote-${Date.now()}`;
    const titulo = `Contracheque ${tipo} — ${formatarCompetencia(competencia)}`;
    const criados: DocumentoAssinatura[] = [];
    const falhas: string[] = [];
    for (const [colaboradorId, indices] of aImportar) {
      const nome = nomePorId.get(colaboradorId) || 'Colaborador';
      try {
        const nomeArquivo = `Contracheque_${competencia}_${nome.replace(/\s+/g, '_')}.pdf`;
        const pdf = await separarPaginas(arquivo, indices, nomeArquivo);
        criados.push(
          await criarDocumentoAssinatura({
            categoria: 'contracheque',
            colaboradorId,
            colaboradorNome: nome,
            referencia: competencia,
            tipo,
            titulo,
            arquivo: pdf,
            loteId,
            criadoPor,
          })
        );
      } catch (err) {
        console.error(err);
        falhas.push(nome);
      }
      setProgresso((p) => ({ ...p, feito: p.feito + 1 }));
    }
    setImportando(false);
    onImportado(criados);
    if (falhas.length > 0) {
      setErro(
        `${criados.length} importado(s). Não foi possível importar: ${falhas.join(', ')}. Tente importar de novo só esses (os já importados ficam desmarcados).`
      );
      setPaginas(null);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#C48229]" />
            Importar Contracheques
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={importando}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Passo 1: arquivo, competência e tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">PDF da folha (todos os contracheques)</label>
              <label className="flex items-center gap-2 p-3 border-2 border-dashed border-amber-300 hover:border-[#C48229] bg-amber-50/40 rounded-lg cursor-pointer">
                <FileText className="w-4 h-4 text-[#C48229] shrink-0" />
                <span className="truncate font-semibold text-slate-700">
                  {arquivo ? arquivo.name : 'Clique para escolher o PDF'}
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={importando}
                  onChange={(e) => {
                    setArquivo(e.target.files?.[0] || null);
                    setPaginas(null);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Competência</label>
              <input
                type="month"
                value={competencia}
                disabled={importando}
                onChange={(e) => {
                  setCompetencia(e.target.value);
                  setPaginas(null);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Tipo</label>
              <select
                value={tipo}
                disabled={importando}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setPaginas(null);
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              >
                {TIPOS_CONTRACHEQUE.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!paginas && (
            <button
              type="button"
              onClick={handleLer}
              disabled={!arquivo || lendo || !competencia}
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

          {/* Passo 2: prévia */}
          {paginas && (
            <div className="space-y-3">
              <p className="text-slate-600">
                <strong>{paginas.length}</strong> página(s) lida(s) — <strong>{grupos.size}</strong> colaborador(es)
                identificado(s)
                {paginasSemColaborador.length > 0 && (
                  <>
                    , <strong className="text-amber-700">{paginasSemColaborador.length} página(s) sem identificação</strong>
                  </>
                )}
                . Confira antes de importar.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2">Colaborador</th>
                      <th className="px-3 py-2">Página(s)</th>
                      <th className="px-3 py-2">Identificado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from(grupos.entries()).map(([id, indices]) => {
                      const motivo = paginas.find((p) => p.indice === indices[0])?.motivo;
                      const duplicado = jaImportado(id);
                      return (
                        <tr key={id} className={ignorados.has(id) ? 'opacity-50' : ''}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={!ignorados.has(id)}
                              disabled={importando}
                              onChange={() => alternarIgnorado(id)}
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {nomePorId.get(id)}
                            {duplicado && (
                              <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                Já importado nesta competência
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{indices.map((i) => i + 1).join(', ')}</td>
                          <td className="px-3 py-2 text-slate-500">
                            {motivo === 'cpf' ? 'CPF' : motivo === 'nome' ? 'Nome' : 'Escolhido manualmente'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {paginasSemColaborador.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Páginas sem colaborador identificado — escolha de quem é, ou deixe em branco para não importar:
                  </p>
                  {paginasSemColaborador.map((p) => (
                    <div key={p.indice} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg">
                      <span className="font-bold text-slate-700 shrink-0">Página {p.indice + 1}</span>
                      <span className="text-[11px] text-slate-500 flex-1 truncate" title={p.trecho}>
                        {p.trecho || '(página sem texto)'}
                      </span>
                      <select
                        value=""
                        disabled={importando}
                        onChange={(e) => handleAtribuirPagina(p.indice, e.target.value)}
                        className="p-1.5 border border-slate-200 rounded-lg bg-white sm:w-56"
                      >
                        <option value="">Não importar</option>
                        {colaboradoresOrdenados.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nomeCompleto}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {paginas && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setPaginas(null)}
              disabled={importando}
              className="px-3 py-2 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleImportar}
              disabled={importando || aImportar.length === 0}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {importando
                ? `Importando ${progresso.feito} de ${progresso.total}...`
                : `Importar ${aImportar.length} contracheque(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
