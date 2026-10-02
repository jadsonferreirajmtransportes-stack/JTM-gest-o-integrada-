import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileStack, Upload, Plus, Loader2, Search, FileText, FileType2, Sheet, Ban, Trash2 } from 'lucide-react';
import { UsuarioLogin } from '../../types';
import {
  DocumentoPadronizado,
  SETORES_DOCUMENTO,
  excluirDocumento,
  getDocumento,
  getDocumentos,
  marcarObsoleto,
} from '../../utils/documentosPadronizadosApi';
import { importarArquivo } from './importarDocumento';
import { DocumentoEditor } from './DocumentoEditor';

interface DocumentosViewProps {
  currentUser?: UsuarioLogin;
}

const STATUS_ESTILO: Record<string, string> = {
  Rascunho: 'bg-slate-100 text-slate-600 border-slate-200',
  Vigente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Obsoleto: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ICONE_ORIGEM: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-3.5 h-3.5" />,
  docx: <FileType2 className="w-3.5 h-3.5" />,
  xlsx: <Sheet className="w-3.5 h-3.5" />,
  csv: <Sheet className="w-3.5 h-3.5" />,
};

function documentoNovo(usuario?: string): DocumentoPadronizado {
  return {
    id: '',
    codigo: '',
    titulo: '',
    tipo: 'Procedimento',
    setor: 'ADM',
    versao: 1,
    status: 'Rascunho',
    classificacao: 'Uso interno',
    responsavel: usuario,
    dataDocumento: new Date().toISOString().slice(0, 10),
    blocos: [],
    origemTipo: 'manual',
    criadoPor: usuario,
    criadoEm: new Date().toISOString(),
  };
}

/** Padronização de Documentos: importa PDF/Word/Excel, revisa no editor com o crivo do padrão
 *  JMT e gera o documento na identidade da empresa. Biblioteca com código (DOC-SETOR-NNN) e versão. */
export const DocumentosView: React.FC<DocumentosViewProps> = ({ currentUser }) => {
  const [documentos, setDocumentos] = useState<DocumentoPadronizado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [aberto, setAberto] = useState<{ doc: DocumentoPadronizado; avisos: string[] } | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDocumentos()
      .then(setDocumentos)
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar a biblioteca. Se for a primeira vez, confirme que a migração 064 foi rodada no Supabase.');
      })
      .finally(() => setCarregando(false));
  }, []);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return documentos.filter(
      (d) =>
        (!filtroSetor || d.setor === filtroSetor) &&
        (!filtroStatus || d.status === filtroStatus) &&
        (!termo || `${d.codigo} ${d.titulo} ${d.tipo} ${d.responsavel || ''}`.toLowerCase().includes(termo))
    );
  }, [documentos, busca, filtroSetor, filtroStatus]);

  const handleImportar = async (arquivo?: File) => {
    if (!arquivo) return;
    if (arquivo.size > 25 * 1024 * 1024) {
      setErro('O arquivo passa de 25MB.');
      return;
    }
    setImportando(true);
    setErro(null);
    try {
      const r = await importarArquivo(arquivo);
      if (r.blocos.length === 0 && r.avisos.length === 0) r.avisos.push('Nenhum conteúdo encontrado no arquivo.');
      setAberto({
        doc: { ...documentoNovo(currentUser?.nome), titulo: r.tituloSugerido, blocos: r.blocos, origemArquivo: arquivo.name, origemTipo: r.origemTipo, tipo: r.origemTipo === 'xlsx' || r.origemTipo === 'csv' ? 'Planilha' : 'Procedimento' },
        avisos: r.avisos,
      });
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    } finally {
      setImportando(false);
      if (inputArquivo.current) inputArquivo.current.value = '';
    }
  };

  const handleAbrir = async (d: DocumentoPadronizado) => {
    setAbrindo(d.id);
    try {
      const completo = await getDocumento(d.id);
      if (completo) setAberto({ doc: completo, avisos: [] });
    } catch (err) {
      console.error(err);
      setErro('Não foi possível abrir o documento.');
    } finally {
      setAbrindo(null);
    }
  };

  const atualizarNaLista = (d: DocumentoPadronizado) =>
    setDocumentos((prev) => [...prev.filter((x) => x.id !== d.id), { ...d, blocos: [] }].sort((a, b) => a.codigo.localeCompare(b.codigo)));

  if (aberto) {
    return (
      <DocumentoEditor
        documento={aberto.doc}
        avisosImportacao={aberto.avisos}
        usuario={currentUser?.nome}
        onVoltar={() => setAberto(null)}
        onSalvo={atualizarNaLista}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <FileStack className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Padronização de Documentos</h1>
            <p className="text-xs text-slate-500 mt-0.5">Importe PDF, Word ou Excel, revise com o crivo do padrão JMT e gere o documento na identidade da empresa.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => setAberto({ doc: documentoNovo(currentUser?.nome), avisos: [] })} className="px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50">
            <Plus className="w-4 h-4" /> Em branco
          </button>
          <button type="button" onClick={() => inputArquivo.current?.click()} disabled={importando} className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 disabled:opacity-60">
            {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {importando ? 'Lendo o arquivo...' : 'Importar arquivo'}
          </button>
          <input ref={inputArquivo} type="file" accept=".pdf,.docx,.xlsx,.xls,.csv" className="hidden" onChange={(e) => handleImportar(e.target.files?.[0])} />
        </div>
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, título, tipo ou responsável" className="w-full pl-8 p-2 border border-slate-200 rounded-lg text-xs bg-white" />
        </div>
        <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold">
          <option value="">Todos os setores</option>
          {SETORES_DOCUMENTO.map((s) => (
            <option key={s.sigla} value={s.sigla}>
              {s.nome}
            </option>
          ))}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold">
          <option value="">Todos os status</option>
          <option>Rascunho</option>
          <option>Vigente</option>
          <option>Obsoleto</option>
        </select>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : documentos.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
          Nenhum documento ainda. Clique em <strong>Importar arquivo</strong> para padronizar um documento existente (PDF, Word ou Excel), ou em <strong>Em branco</strong>.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left p-3">Código</th>
                <th className="text-left p-3">Título</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Versão</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Responsável</th>
                <th className="text-left p-3">Atualizado</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visiveis.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => handleAbrir(d)}>
                  <td className="p-3 font-bold text-[#92611F] whitespace-nowrap">
                    {abrindo === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : d.codigo}
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-slate-800">{d.titulo}</p>
                    {d.origemArquivo && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        {ICONE_ORIGEM[d.origemTipo || ''] || null} {d.origemArquivo}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{d.tipo}</td>
                  <td className="p-3 text-slate-600">v{d.versao}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_ESTILO[d.status]}`}>{d.status}</span>
                  </td>
                  <td className="p-3 text-slate-600">{d.responsavel || '—'}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(d.atualizadoEm || d.criadoEm).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {d.status === 'Vigente' && (
                        <button
                          type="button"
                          title="Marcar como obsoleto"
                          onClick={async () => {
                            if (!window.confirm(`Marcar ${d.codigo} como obsoleto? Ele continua na biblioteca para consulta.`)) return;
                            const completo = await getDocumento(d.id);
                            if (completo) atualizarNaLista(await marcarObsoleto(completo));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {d.status === 'Rascunho' && d.versao === 1 && (
                        <button
                          type="button"
                          title="Excluir rascunho"
                          onClick={async () => {
                            if (!window.confirm(`Excluir o rascunho ${d.codigo}?`)) return;
                            await excluirDocumento(d.id);
                            setDocumentos((prev) => prev.filter((x) => x.id !== d.id));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
