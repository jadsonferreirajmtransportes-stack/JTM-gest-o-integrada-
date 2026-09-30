import React, { useMemo, useState } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ScanSearch } from 'lucide-react';
import { Colaborador } from '../../types';
import { criarDocumentoAssinatura, DocumentoAssinatura } from '../../utils/documentosAssinaturaApi';
import {
  ParteIdentificada,
  PaginaComPosicao,
  extrairPaginasComPosicao,
  identificarPartes,
  criarSeparadorDePdf,
  camposDasPartes,
  chaveParte,
  formatarCompetencia,
} from './contrachequePdfUtils';

/** "Página 3" ou, quando a página tem 2+ contracheques, "Página 3 (parte de cima/de baixo)". */
function descreverParte(p: { indice: number; parte: number; totalPartes: number }): string {
  if (p.totalPartes <= 1) return `Página ${p.indice + 1}`;
  if (p.totalPartes === 2) return `Página ${p.indice + 1} (${p.parte === 0 ? 'metade de cima' : 'metade de baixo'})`;
  return `Página ${p.indice + 1} (${p.parte + 1}ª de ${p.totalPartes} partes)`;
}

/** Um documento a importar = um colaborador + uma competência + um tipo. O arquivo da folha pode
 *  ser só do mês ou do ANO inteiro (vários meses de cada pessoa, um contracheque por metade de
 *  página) — cada mês vira um documento próprio pra assinar. */
interface GrupoContracheque {
  chave: string;
  colaboradorId: string;
  competencia: string;
  tipo: string;
  /** true quando competência/tipo vieram do próprio contracheque (e não do padrão do formulário). */
  lidoDoPdf: boolean;
  partes: ParteIdentificada[];
}

function agruparPartes(partes: ParteIdentificada[], competenciaPadrao: string, tipoPadrao: string): GrupoContracheque[] {
  const grupos = new Map<string, GrupoContracheque>();
  partes.forEach((p) => {
    if (!p.colaboradorId) return;
    const competencia = p.competencia || competenciaPadrao;
    const tipo = p.tipo || tipoPadrao;
    const chave = `${p.colaboradorId}|${competencia}|${tipo}`;
    const existente = grupos.get(chave);
    if (existente) existente.partes.push(p);
    else
      grupos.set(chave, {
        chave,
        colaboradorId: p.colaboradorId,
        competencia,
        tipo,
        lidoDoPdf: !!p.competencia,
        partes: [p],
      });
  });
  return Array.from(grupos.values());
}

const TIPOS_CONTRACHEQUE = ['Mensal', 'Adiantamento', '13º Salário — 1ª parcela', '13º Salário — 2ª parcela', 'Férias', 'Rescisão'];

interface ImportarContrachequesModalProps {
  colaboradores: Colaborador[];
  /** Já importados — pra avisar de duplicidade (mesmo colaborador + competência + tipo). */
  existentes: DocumentoAssinatura[];
  criadoPor?: string;
  onClose: () => void;
  onImportado: (novos: DocumentoAssinatura[]) => void;
}

function competenciaPadraoInicial(): string {
  // Folha costuma ser importada no começo do mês seguinte — sugere o mês anterior.
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/** Importa o PDF da folha (um ou mais contracheques por página, de um mês ou do ano inteiro): lê
 *  o texto de cada página, acha cada contracheque (cabeçalho "Recibo de Pagamento") e a faixa da
 *  página onde ele está, identifica o colaborador pelo CPF/nome e a competência/tipo pelo próprio
 *  contracheque, mostra uma prévia pra conferir e corrigir, e só então separa e grava um
 *  documento por colaborador + competência + tipo. */
export const ImportarContrachequesModal: React.FC<ImportarContrachequesModalProps> = ({
  colaboradores,
  existentes,
  criadoPor,
  onClose,
  onImportado,
}) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  // Usados só quando o contracheque não informa a competência/o tipo no próprio texto.
  const [competencia, setCompetencia] = useState(competenciaPadraoInicial());
  const [tipo, setTipo] = useState(TIPOS_CONTRACHEQUE[0]);
  const [lendo, setLendo] = useState(false);
  const [paginas, setPaginas] = useState<ParteIdentificada[] | null>(null);
  // Texto com posição de cada página do PDF da folha — usado na importação pra achar a linha de
  // assinatura do empregado de cada contracheque (camposDasPartes).
  const [paginasPdf, setPaginasPdf] = useState<PaginaComPosicao[]>([]);
  const [ignorados, setIgnorados] = useState<Set<string>>(new Set());
  // Arquivo do ano inteiro: importar só uma competência ('' = todas).
  const [somenteCompetencia, setSomenteCompetencia] = useState('');
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

  const grupos: GrupoContracheque[] = useMemo(
    () => (paginas ? agruparPartes(paginas, competencia, tipo) : []),
    [paginas, competencia, tipo]
  );
  const competenciasNoArquivo: string[] = useMemo(
    () => Array.from(new Set(grupos.map((g) => g.competencia))).sort(),
    [grupos]
  );
  const gruposVisiveis = grupos
    .filter((g) => !somenteCompetencia || g.competencia === somenteCompetencia)
    .sort(
      (a, b) =>
        (nomePorId.get(a.colaboradorId) || '').localeCompare(nomePorId.get(b.colaboradorId) || '') ||
        a.competencia.localeCompare(b.competencia)
    );
  const algumSemCompetenciaNoPdf = grupos.some((g) => !g.lidoDoPdf);
  const paginasSemColaborador = paginas?.filter((p) => !p.colaboradorId) ?? [];
  const paginasComProblema = paginasSemColaborador.filter((p) => p.problema);

  const jaImportado = (g: { colaboradorId: string; competencia: string; tipo: string }) =>
    existentes.some((d) => d.colaboradorId === g.colaboradorId && d.referencia === g.competencia && d.tipo === g.tipo);

  const handleLer = async () => {
    if (!arquivo) return;
    setErro(null);
    setLendo(true);
    try {
      const lidas = await extrairPaginasComPosicao(arquivo);
      const identificadas = identificarPartes(lidas, colaboradores);
      setPaginasPdf(lidas);
      setPaginas(identificadas);
      setSomenteCompetencia('');
      // Quem já tem contracheque dessa competência/tipo começa desmarcado — evita duplicar
      // quando a mesma folha é importada duas vezes por engano.
      setIgnorados(new Set(agruparPartes(identificadas, competencia, tipo).filter(jaImportado).map((g) => g.chave)));
    } catch (err) {
      console.error(err);
      setErro('Não foi possível ler este PDF. Confira se é o arquivo da folha (PDF com texto, não uma foto/escaneado).');
    } finally {
      setLendo(false);
    }
  };

  const handleAtribuirPagina = (chave: string, colaboradorId: string) => {
    setPaginas((prev) =>
      prev
        ? prev.map((p) =>
            chaveParte(p) === chave
              ? { ...p, colaboradorId: colaboradorId || undefined, motivo: colaboradorId ? 'manual' : undefined }
              : p
          )
        : prev
    );
  };

  const alternarIgnorado = (chave: string) => {
    setIgnorados((prev) => {
      const novo = new Set(prev);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  };

  const aImportar = gruposVisiveis.filter((g) => !ignorados.has(g.chave));

  const handleImportar = async () => {
    if (!arquivo || aImportar.length === 0) return;
    setErro(null);
    setImportando(true);
    setProgresso({ feito: 0, total: aImportar.length });
    const loteId = `lote-${Date.now()}`;
    const criados: DocumentoAssinatura[] = [];
    const falhas: string[] = [];
    let separador: Awaited<ReturnType<typeof criarSeparadorDePdf>> | null = null;
    try {
      separador = await criarSeparadorDePdf(arquivo);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível abrir o PDF para separar os contracheques. Tente de novo.');
      setImportando(false);
      return;
    }
    for (const g of aImportar) {
      const nome = nomePorId.get(g.colaboradorId) || 'Colaborador';
      try {
        const nomeArquivo = `Contracheque_${g.competencia}_${nome.replace(/\s+/g, '_')}.pdf`;
        const pdf = await separador.montar(g.partes, nomeArquivo);
        criados.push(
          await criarDocumentoAssinatura({
            categoria: 'contracheque',
            colaboradorId: g.colaboradorId,
            colaboradorNome: nome,
            referencia: g.competencia,
            tipo: g.tipo,
            titulo: `Contracheque ${g.tipo} — ${formatarCompetencia(g.competencia)}`,
            arquivo: pdf,
            camposAssinatura: camposDasPartes(paginasPdf, g.partes),
            loteId,
            criadoPor,
          })
        );
      } catch (err) {
        console.error(err);
        falhas.push(`${nome} (${formatarCompetencia(g.competencia)})`);
      }
      setProgresso((p) => ({ ...p, feito: p.feito + 1 }));
    }
    await separador.fechar().catch(() => {});
    setImportando(false);
    onImportado(criados);
    if (falhas.length > 0) {
      setErro(
        `${criados.length} importado(s). Não foi possível importar: ${falhas.join(', ')}. Leia o PDF de novo e importe só esses (os já importados ficam desmarcados).`
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
          {/* Passo 1: arquivo (+ competência/tipo padrão, pra contracheque que não informa) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">PDF da folha (do mês ou do ano inteiro)</label>
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
            {(!paginas || algumSemCompetenciaNoPdf) && (
              <>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Competência</label>
                  <input
                    type="month"
                    value={competencia}
                    disabled={importando}
                    onChange={(e) => setCompetencia(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Tipo</label>
                  <select
                    value={tipo}
                    disabled={importando}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    {TIPOS_CONTRACHEQUE.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="sm:col-span-3 text-[11px] text-slate-500 -mt-1">
                  Só são usados quando o contracheque não informa a competência e o tipo — normalmente o sistema lê do
                  próprio PDF ("Competência: Janeiro de 2026", "Folha de Pagamento").
                </p>
              </>
            )}
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
                <strong>{new Set(paginas.map((p) => p.indice)).size}</strong> página(s) lida(s),{' '}
                <strong>{paginas.length}</strong> contracheque(s) encontrado(s) de{' '}
                <strong>{new Set(grupos.map((g) => g.colaboradorId)).size}</strong> colaborador(es)
                {competenciasNoArquivo.length > 1 && (
                  <>
                    {' '}
                    em <strong>{competenciasNoArquivo.length}</strong> competências
                  </>
                )}
                {paginasSemColaborador.length > 0 && (
                  <>
                    , <strong className="text-amber-700">{paginasSemColaborador.length} sem identificação</strong>
                  </>
                )}
                . Confira antes de importar.
              </p>

              {competenciasNoArquivo.length > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg">
                  <span className="font-semibold text-slate-700 shrink-0">Importar só:</span>
                  <select
                    value={somenteCompetencia}
                    disabled={importando}
                    onChange={(e) => setSomenteCompetencia(e.target.value)}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white sm:w-56 font-semibold"
                  >
                    <option value="">Todas as competências do arquivo</option>
                    {competenciasNoArquivo.map((c) => (
                      <option key={c} value={c}>
                        {formatarCompetencia(c)}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500">
                    O arquivo tem vários meses — escolha o mês que quer enviar agora.
                  </span>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[45vh] overflow-y-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="bg-slate-50 text-left text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2">Colaborador</th>
                      <th className="px-3 py-2">Competência / Tipo</th>
                      <th className="px-3 py-2">Página</th>
                      <th className="px-3 py-2">Identificado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gruposVisiveis.map((g) => {
                      const motivo = g.partes[0]?.motivo;
                      return (
                        <tr key={g.chave} className={ignorados.has(g.chave) ? 'opacity-50' : ''}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={!ignorados.has(g.chave)}
                              disabled={importando}
                              onChange={() => alternarIgnorado(g.chave)}
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {nomePorId.get(g.colaboradorId)}
                            {jaImportado(g) && (
                              <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                Já importado
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {formatarCompetencia(g.competencia)} <span className="text-slate-400">• {g.tipo}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{g.partes.map(descreverParte).join(', ')}</td>
                          <td className="px-3 py-2 text-slate-500">
                            {motivo === 'cpf' ? 'CPF' : motivo === 'nome' ? 'Nome' : 'Escolhido manualmente'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {paginasComProblema.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {paginasComProblema.length} página(s) com mais de um contracheque não puderam ser separadas e NÃO serão importadas:
                  </p>
                  <p>{paginasComProblema.map((p) => `Página ${p.indice + 1}`).join(', ')}. Envie esses contracheques por fora ou me mande um exemplo da página para ajustar a leitura.</p>
                </div>
              )}

              {paginasSemColaborador.some((p) => !p.problema) && (
                <div className="space-y-2">
                  <p className="font-semibold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Contracheques sem colaborador identificado — escolha de quem é, ou deixe em branco para não importar:
                  </p>
                  {paginasSemColaborador.filter((p) => !p.problema).map((p) => (
                    <div key={chaveParte(p)} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg">
                      <span className="font-bold text-slate-700 shrink-0">
                        {descreverParte(p)}
                        {p.competencia && <span className="font-normal text-slate-500"> — {formatarCompetencia(p.competencia)}</span>}
                      </span>
                      <span className="text-[11px] text-slate-500 flex-1 truncate" title={p.trecho}>
                        {p.trecho || '(sem texto)'}
                      </span>
                      <select
                        value=""
                        disabled={importando}
                        onChange={(e) => handleAtribuirPagina(chaveParte(p), e.target.value)}
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
