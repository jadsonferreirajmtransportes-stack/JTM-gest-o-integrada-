import React, { useMemo, useState } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ScanSearch } from 'lucide-react';
import { Colaborador } from '../../types';
import { criarDocumentoAssinatura, DocumentoAssinatura } from '../../utils/documentosAssinaturaApi';
import {
  extrairPaginasComPosicao,
  identificarPaginas,
  detectarTipoFerias,
  extrairPeriodoGozo,
  formatarDataBr,
  camposDasPartes,
  CampoAssinatura,
  TipoDocumentoFerias,
  TIPOS_DOCUMENTO_FERIAS,
} from './contrachequePdfUtils';

interface ItemFerias {
  arquivo: File;
  /** Linhas "Empregado"/"Assinatura do Empregado" onde a assinatura vai ser desenhada. */
  camposAssinatura: CampoAssinatura[];
  colaboradorId?: string;
  tipo?: TipoDocumentoFerias;
  inicioGozo?: string;
  fimGozo?: string;
  incluir: boolean;
}

interface ImportarDocumentosFeriasModalProps {
  colaboradores: Colaborador[];
  existentes: DocumentoAssinatura[];
  criadoPor?: string;
  onClose: () => void;
  onImportado: (novos: DocumentoAssinatura[]) => void;
}

export function tituloDocumentoFerias(tipo: string, inicio?: string, fim?: string): string {
  return inicio ? `${tipo} — gozo de ${formatarDataBr(inicio)}${fim ? ` a ${formatarDataBr(fim)}` : ''}` : tipo;
}

/** Importa os PDFs de férias que a contabilidade manda (um arquivo por colaborador: Aviso
 *  Prévio de Férias e/ou Demonstrativo + Recibo). Cada arquivo vira um documento pra assinar:
 *  o sistema lê de quem é (CPF/nome), se é Aviso ou Recibo e o período de gozo — tudo
 *  editável na prévia antes de gravar. */
export const ImportarDocumentosFeriasModal: React.FC<ImportarDocumentosFeriasModalProps> = ({
  colaboradores,
  existentes,
  criadoPor,
  onClose,
  onImportado,
}) => {
  const [itens, setItens] = useState<ItemFerias[] | null>(null);
  const [lendo, setLendo] = useState(false);
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

  const duplicado = (item: ItemFerias) =>
    !!item.colaboradorId &&
    existentes.some(
      (d) => d.colaboradorId === item.colaboradorId && d.tipo === item.tipo && d.referencia === item.inicioGozo
    );

  const handleArquivos = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;
    setErro(null);
    setLendo(true);
    const lidos: ItemFerias[] = [];
    const falhas: string[] = [];
    for (const arquivo of Array.from(lista)) {
      try {
        const paginasPdf = await extrairPaginasComPosicao(arquivo);
        const textos = paginasPdf.map((p) => p.texto);
        const paginas = identificarPaginas(textos, colaboradores);
        // O colaborador do arquivo é o que mais aparece nas páginas (a 2ª página do recibo, por
        // exemplo, não tem CPF — só o nome).
        const contagem = new Map<string, number>();
        paginas.forEach((p) => p.colaboradorId && contagem.set(p.colaboradorId, (contagem.get(p.colaboradorId) || 0) + 1));
        const colaboradorId = Array.from(contagem.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        const textoCompleto = textos.join(' ');
        const periodo = extrairPeriodoGozo(textoCompleto);
        const item: ItemFerias = {
          arquivo,
          // O arquivo vai inteiro (um por colaborador), então cada página entra como está.
          camposAssinatura: camposDasPartes(
            paginasPdf,
            paginasPdf.map((_, indice) => ({ indice, parte: 0, totalPartes: 1 }))
          ),
          colaboradorId,
          tipo: detectarTipoFerias(textoCompleto),
          inicioGozo: periodo?.inicio,
          fimGozo: periodo?.fim,
          incluir: true,
        };
        item.incluir = !duplicado(item);
        lidos.push(item);
      } catch (err) {
        console.error(err);
        falhas.push(arquivo.name);
      }
    }
    setItens((prev) => [...(prev || []), ...lidos]);
    if (falhas.length > 0) setErro(`Não foi possível ler: ${falhas.join(', ')}. Confira se são PDFs com texto (não foto/escaneado).`);
    setLendo(false);
  };

  const atualizar = (indice: number, mudanca: Partial<ItemFerias>) =>
    setItens((prev) => (prev ? prev.map((it, i) => (i === indice ? { ...it, ...mudanca } : it)) : prev));

  const prontos = (itens || []).filter((it) => it.incluir && it.colaboradorId && it.tipo && it.inicioGozo);
  const incompletos = (itens || []).filter((it) => it.incluir && !(it.colaboradorId && it.tipo && it.inicioGozo));

  const handleImportar = async () => {
    if (prontos.length === 0) return;
    setErro(null);
    setImportando(true);
    setProgresso({ feito: 0, total: prontos.length });
    const loteId = `lote-ferias-${Date.now()}`;
    const criados: DocumentoAssinatura[] = [];
    const falhas: string[] = [];
    for (const it of prontos) {
      const nome = nomePorId.get(it.colaboradorId!) || 'Colaborador';
      try {
        criados.push(
          await criarDocumentoAssinatura({
            categoria: 'ferias',
            colaboradorId: it.colaboradorId!,
            colaboradorNome: nome,
            referencia: it.inicioGozo!,
            tipo: it.tipo!,
            titulo: tituloDocumentoFerias(it.tipo!, it.inicioGozo, it.fimGozo),
            arquivo: it.arquivo,
            camposAssinatura: it.camposAssinatura,
            loteId,
            criadoPor,
          })
        );
      } catch (err) {
        console.error(err);
        falhas.push(`${nome} (${it.arquivo.name})`);
      }
      setProgresso((p) => ({ ...p, feito: p.feito + 1 }));
    }
    setImportando(false);
    onImportado(criados);
    if (falhas.length > 0) {
      setErro(`${criados.length} importado(s). Não foi possível importar: ${falhas.join(', ')}.`);
      setItens((prev) => (prev ? prev.filter((it) => !prontos.includes(it) || falhas.some((f) => f.includes(it.arquivo.name))) : prev));
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#C48229]" />
            Importar Documentos de Férias (Aviso / Recibo)
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
          <label className="flex items-center gap-2 p-3 border-2 border-dashed border-amber-300 hover:border-[#C48229] bg-amber-50/40 rounded-lg cursor-pointer">
            {lendo ? <Loader2 className="w-4 h-4 animate-spin text-[#C48229]" /> : <FileText className="w-4 h-4 text-[#C48229] shrink-0" />}
            <span className="font-semibold text-slate-700">
              {lendo
                ? 'Lendo os arquivos...'
                : itens
                  ? 'Adicionar mais arquivos'
                  : 'Clique para escolher os PDFs (pode escolher vários de uma vez)'}
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              disabled={lendo || importando}
              onChange={(e) => {
                handleArquivos(e.target.files);
                e.target.value = '';
              }}
            />
          </label>

          {erro && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {itens && itens.length > 0 && (
            <>
              <p className="text-slate-600 flex items-center gap-1.5">
                <ScanSearch className="w-3.5 h-3.5 text-[#C48229]" />
                Confira de quem é cada arquivo, o tipo e o início do gozo antes de importar.
              </p>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2">Arquivo</th>
                      <th className="px-3 py-2">Colaborador</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Início do gozo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map((it, i) => (
                      <tr key={`${it.arquivo.name}-${i}`} className={it.incluir ? '' : 'opacity-50'}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={it.incluir}
                            disabled={importando}
                            onChange={(e) => atualizar(i, { incluir: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate" title={it.arquivo.name}>
                          {it.arquivo.name}
                          {duplicado(it) && (
                            <span className="block text-[10px] font-bold text-amber-700">Já importado</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={it.colaboradorId || ''}
                            disabled={importando}
                            onChange={(e) => atualizar(i, { colaboradorId: e.target.value || undefined })}
                            className={`w-full p-1.5 border rounded-lg bg-white ${it.colaboradorId ? 'border-slate-200' : 'border-amber-400'}`}
                          >
                            <option value="">Escolha o colaborador</option>
                            {colaboradoresOrdenados.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nomeCompleto}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={it.tipo || ''}
                            disabled={importando}
                            onChange={(e) => atualizar(i, { tipo: (e.target.value || undefined) as TipoDocumentoFerias | undefined })}
                            className={`w-full p-1.5 border rounded-lg bg-white ${it.tipo ? 'border-slate-200' : 'border-amber-400'}`}
                          >
                            <option value="">Escolha</option>
                            {TIPOS_DOCUMENTO_FERIAS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={it.inicioGozo || ''}
                            disabled={importando}
                            onChange={(e) => atualizar(i, { inicioGozo: e.target.value || undefined })}
                            className={`p-1.5 border rounded-lg ${it.inicioGozo ? 'border-slate-200' : 'border-amber-400'}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {incompletos.length > 0 && (
                <p className="text-amber-800 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {incompletos.length} arquivo(s) marcado(s) sem colaborador, tipo ou data — complete (campos em amarelo) ou desmarque.
                </p>
              )}
            </>
          )}
        </div>

        {itens && itens.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
            <button
              type="button"
              onClick={handleImportar}
              disabled={importando || prontos.length === 0 || incompletos.length > 0}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {importando ? `Importando ${progresso.feito} de ${progresso.total}...` : `Importar ${prontos.length} documento(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
