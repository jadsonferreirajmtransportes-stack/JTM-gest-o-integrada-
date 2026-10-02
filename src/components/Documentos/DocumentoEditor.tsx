import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  Save,
  Loader2,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Heading,
  AlignLeft,
  List,
  Table as TableIcon,
  Quote,
  FileText,
  FileType2,
  Sheet,
  History,
  BadgeCheck,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  BlocoDocumento,
  CLASSIFICACOES,
  DocumentoPadronizado,
  SETORES_DOCUMENTO,
  TIPOS_DOCUMENTO,
  VersaoDocumento,
  getVersoes,
  novaRevisao,
  novoIdBloco,
  publicarVersao,
  salvarDocumento,
} from '../../utils/documentosPadronizadosApi';
import { corrigirAutomaticamente, verificarPadrao } from './padraoDocumento';
import { gerarDocxDocumento, gerarPdfDocumento, gerarXlsxDocumento } from './gerarDocumento';
import { baixarBlob } from '../../utils/downloadUtils';

interface DocumentoEditorProps {
  documento: DocumentoPadronizado;
  avisosImportacao?: string[];
  usuario?: string;
  onVoltar: () => void;
  onSalvo: (d: DocumentoPadronizado) => void;
}

const TIPOS_BLOCO: { tipo: BlocoDocumento['tipo']; rotulo: string; icone: React.ReactNode }[] = [
  { tipo: 'titulo', rotulo: 'Título', icone: <Heading className="w-3.5 h-3.5" /> },
  { tipo: 'paragrafo', rotulo: 'Parágrafo', icone: <AlignLeft className="w-3.5 h-3.5" /> },
  { tipo: 'lista', rotulo: 'Lista', icone: <List className="w-3.5 h-3.5" /> },
  { tipo: 'tabela', rotulo: 'Tabela', icone: <TableIcon className="w-3.5 h-3.5" /> },
  { tipo: 'destaque', rotulo: 'Destaque', icone: <Quote className="w-3.5 h-3.5" /> },
];

function blocoVazio(tipo: BlocoDocumento['tipo']): BlocoDocumento {
  const id = novoIdBloco();
  if (tipo === 'titulo') return { id, tipo, nivel: 2, texto: '' };
  if (tipo === 'lista') return { id, tipo, ordenada: false, itens: [''] };
  if (tipo === 'tabela') return { id, tipo, cabecalho: ['Coluna 1', 'Coluna 2'], linhas: [['', '']] };
  return { id, tipo, texto: '' } as BlocoDocumento;
}

/** Converte um bloco para outro tipo aproveitando o texto. */
function converter(b: BlocoDocumento, tipo: BlocoDocumento['tipo']): BlocoDocumento {
  const texto =
    b.tipo === 'lista' ? b.itens.join('\n') : b.tipo === 'tabela' ? [b.cabecalho.join(' | '), ...b.linhas.map((l) => l.join(' | '))].join('\n') : b.texto;
  if (tipo === 'titulo') return { id: b.id, tipo, nivel: 2, texto: texto.replace(/\n/g, ' ') };
  if (tipo === 'lista') return { id: b.id, tipo, ordenada: false, itens: texto.split(/\n+/).map((t) => t.trim()).filter(Boolean) };
  if (tipo === 'tabela') {
    const linhas = texto.split(/\n+/).map((l) => l.split(/\s*[|;\t]\s*/));
    const n = Math.max(...linhas.map((l) => l.length), 2);
    const ajustar = (l: string[]) => Array.from({ length: n }, (_, i) => l[i] ?? '');
    return { id: b.id, tipo, cabecalho: ajustar(linhas[0] || []), linhas: linhas.slice(1).map(ajustar) };
  }
  return { id: b.id, tipo, texto } as BlocoDocumento;
}

const STATUS_ESTILO: Record<string, string> = {
  Rascunho: 'bg-slate-100 text-slate-600 border-slate-200',
  Vigente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Obsoleto: 'bg-rose-50 text-rose-700 border-rose-200',
};

/** Editor do documento padronizado: dados de controle, crivo do padrão JMT, blocos de conteúdo
 *  e saída em PDF/Word/Excel. Publicar = versão Vigente guardada no histórico. */
export const DocumentoEditor: React.FC<DocumentoEditorProps> = ({ documento, avisosImportacao = [], usuario, onVoltar, onSalvo }) => {
  const [d, setD] = useState<DocumentoPadronizado>(documento);
  const [alterado, setAlterado] = useState(!documento.id);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarAvisos, setMostrarAvisos] = useState(avisosImportacao.length > 0);
  const [publicando, setPublicando] = useState(false);
  const [historico, setHistorico] = useState<VersaoDocumento[] | null>(null);
  const [inserirApos, setInserirApos] = useState<string | null>(null);

  const somenteLeitura = d.status !== 'Rascunho';
  const problemas = useMemo(() => verificarPadrao(d), [d]);
  const erros = problemas.filter((p) => p.nivel === 'erro');
  const corrigiveis = problemas.filter((p) => p.corrigivel).length;

  const atualizar = (parcial: Partial<DocumentoPadronizado>) => {
    setD((prev) => ({ ...prev, ...parcial }));
    setAlterado(true);
  };
  const atualizarBloco = (id: string, novo: BlocoDocumento) => atualizar({ blocos: d.blocos.map((b) => (b.id === id ? novo : b)) });
  const mover = (i: number, delta: number) => {
    const lista = [...d.blocos];
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    atualizar({ blocos: lista });
  };
  const inserir = (tipo: BlocoDocumento['tipo'], aposId: string | null) => {
    const novo = blocoVazio(tipo);
    const idx = aposId ? d.blocos.findIndex((b) => b.id === aposId) + 1 : d.blocos.length;
    const lista = [...d.blocos];
    lista.splice(idx, 0, novo);
    atualizar({ blocos: lista });
    setInserirApos(null);
  };

  const salvar = async (doc = d): Promise<DocumentoPadronizado | null> => {
    setSalvando(true);
    setErro(null);
    try {
      const salvo = await salvarDocumento(doc);
      setD(salvo);
      setAlterado(false);
      onSalvo(salvo);
      return salvo;
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
      return null;
    } finally {
      setSalvando(false);
    }
  };

  const baixar = async (formato: 'pdf' | 'docx' | 'xlsx') => {
    setGerando(formato);
    try {
      const arquivo = formato === 'pdf' ? gerarPdfDocumento(d) : formato === 'docx' ? await gerarDocxDocumento(d) : await gerarXlsxDocumento(d);
      baixarBlob(arquivo, arquivo.name);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível gerar o arquivo.');
    } finally {
      setGerando(null);
    }
  };

  const campo = 'w-full p-2 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50 disabled:text-slate-500';
  const rotulo = 'text-[11px] font-bold text-slate-600 block mb-1';

  return (
    <div data-texto-livre="true" className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col">
      {/* Barra superior */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => (!alterado || window.confirm('Sair sem salvar as alterações?')) && onVoltar()} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-[#92611F]">
            {d.codigo || 'Novo documento'} · Versão {d.versao}{' '}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full border text-[10px] ${STATUS_ESTILO[d.status]}`}>{d.status}</span>
          </p>
          <p className="text-sm font-black text-slate-900 truncate">{d.titulo || 'Sem título'}</p>
        </div>
        {!somenteLeitura && (
          <>
            <button
              type="button"
              onClick={() => atualizar({ blocos: corrigirAutomaticamente(d.blocos) })}
              disabled={corrigiveis === 0}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50"
              title="Corrige espaços, pontuação, maiúsculas, datas e blocos vazios — não muda o sentido do texto"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#92611F]" /> Corrigir automaticamente ({corrigiveis})
            </button>
            <button type="button" onClick={() => salvar()} disabled={salvando || !d.titulo.trim()} className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50">
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar rascunho
            </button>
            <button
              type="button"
              onClick={() => setPublicando(true)}
              disabled={erros.length > 0 || !d.aprovadoPor?.trim()}
              title={erros.length ? 'Resolva os erros do padrão antes' : !d.aprovadoPor?.trim() ? 'Informe quem aprovou' : 'Publicar como versão vigente'}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <BadgeCheck className="w-3.5 h-3.5" /> Publicar versão {d.versao}
            </button>
          </>
        )}
        {d.status === 'Vigente' && (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Abrir a revisão ${d.versao + 1}? A versão ${d.versao} continua guardada no histórico.`)) return;
              try {
                const nova = await novaRevisao(d);
                setD(nova);
                onSalvo(nova);
              } catch (err) {
                console.error(err);
                setErro('Não foi possível abrir a revisão.');
              }
            }}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Nova revisão
          </button>
        )}
        {d.id && (
          <button
            type="button"
            onClick={async () => setHistorico(await getVersoes(d.id).catch(() => []))}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
          >
            <History className="w-3.5 h-3.5" /> Histórico
          </button>
        )}
        <div className="flex gap-1">
          {(
            [
              ['pdf', 'PDF', <FileText key="p" className="w-3.5 h-3.5" />],
              ['docx', 'Word', <FileType2 key="w" className="w-3.5 h-3.5" />],
              ['xlsx', 'Excel', <Sheet key="x" className="w-3.5 h-3.5" />],
            ] as ['pdf' | 'docx' | 'xlsx', string, React.ReactNode][]
          ).map(([f, nome, icone]) => (
            <button
              key={f}
              type="button"
              onClick={() => baixar(f)}
              disabled={!!gerando || d.blocos.length === 0}
              className="px-3 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {gerando === f ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icone} {nome}
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}
      {mostrarAvisos && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-[#92611F] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div className="flex-1 space-y-0.5">
            <p className="font-bold">Leitura do arquivo:</p>
            {avisosImportacao.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
          <button type="button" onClick={() => setMostrarAvisos(false)} className="p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden grid lg:grid-cols-[300px_1fr]">
        {/* Coluna de dados + crivo */}
        <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4 space-y-4 text-xs">
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Dados do documento</h3>
            <div>
              <label className={rotulo}>Título</label>
              <input value={d.titulo} disabled={somenteLeitura} onChange={(e) => atualizar({ titulo: e.target.value })} className={campo} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={rotulo}>Tipo</label>
                <select value={d.tipo} disabled={somenteLeitura} onChange={(e) => atualizar({ tipo: e.target.value })} className={campo}>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={rotulo}>Setor</label>
                <select value={d.setor} disabled={somenteLeitura || !!d.id} onChange={(e) => atualizar({ setor: e.target.value })} className={campo} title={d.id ? 'O setor faz parte do código e não muda depois de salvo' : ''}>
                  {SETORES_DOCUMENTO.map((s) => (
                    <option key={s.sigla} value={s.sigla}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={rotulo}>Data</label>
                <input type="date" value={d.dataDocumento || ''} disabled={somenteLeitura} onChange={(e) => atualizar({ dataDocumento: e.target.value || undefined })} className={campo} />
              </div>
              <div>
                <label className={rotulo}>Classificação</label>
                <select value={d.classificacao} disabled={somenteLeitura} onChange={(e) => atualizar({ classificacao: e.target.value })} className={campo}>
                  {CLASSIFICACOES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={rotulo}>Responsável</label>
              <input value={d.responsavel || ''} disabled={somenteLeitura} onChange={(e) => atualizar({ responsavel: e.target.value })} className={campo} />
            </div>
            <div>
              <label className={rotulo}>Aprovado por</label>
              <input value={d.aprovadoPor || ''} disabled={somenteLeitura} onChange={(e) => atualizar({ aprovadoPor: e.target.value })} className={campo} />
            </div>
            {d.origemArquivo && <p className="text-[10px] text-slate-400">Importado de: {d.origemArquivo}</p>}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              Crivo do padrão JMT
              {problemas.length === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </h3>
            {problemas.length === 0 ? (
              <p className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-semibold">Tudo no padrão.</p>
            ) : (
              <ul className="space-y-1.5">
                {problemas.map((p, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => p.blocoId && document.getElementById(`bloco-${p.blocoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      className={`w-full text-left p-2 rounded-lg border flex items-start gap-1.5 ${p.nivel === 'erro' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-[#7A4F17]'}`}
                    >
                      {p.nivel === 'erro' ? <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />}
                      <span>
                        {p.mensagem}
                        {p.corrigivel && <span className="block text-[10px] opacity-75">corrigível automaticamente</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        {/* Conteúdo */}
        <main className="overflow-y-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-2">
            {somenteLeitura && (
              <p className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600">
                Versão {d.status === 'Vigente' ? 'vigente' : 'obsoleta'} — somente leitura. Para alterar, use <strong>Nova revisão</strong>.
              </p>
            )}
            {d.blocos.length === 0 && !somenteLeitura && (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">Documento vazio. Adicione o primeiro bloco abaixo.</div>
            )}
            {d.blocos.map((b, i) => (
              <div key={b.id} id={`bloco-${b.id}`} className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300">
                {!somenteLeitura && (
                  <div className="flex items-center gap-1 px-2 pt-1.5 text-[10px] text-slate-400">
                    <select value={b.tipo} onChange={(e) => atualizarBloco(b.id, converter(b, e.target.value as BlocoDocumento['tipo']))} className="bg-transparent font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800">
                      {TIPOS_BLOCO.map((t) => (
                        <option key={t.tipo} value={t.tipo}>
                          {t.rotulo}
                        </option>
                      ))}
                    </select>
                    {b.tipo === 'titulo' && (
                      <select value={b.nivel} onChange={(e) => atualizarBloco(b.id, { ...b, nivel: Number(e.target.value) as 1 | 2 | 3 })} className="bg-transparent font-bold text-slate-500">
                        <option value={1}>Seção (nível 1)</option>
                        <option value={2}>Subtítulo (nível 2)</option>
                        <option value={3}>Nível 3</option>
                      </select>
                    )}
                    {b.tipo === 'lista' && (
                      <select value={b.ordenada ? '1' : '0'} onChange={(e) => atualizarBloco(b.id, { ...b, ordenada: e.target.value === '1' })} className="bg-transparent font-bold text-slate-500">
                        <option value="0">Com marcadores</option>
                        <option value="1">Numerada</option>
                      </select>
                    )}
                    <span className="flex-1" />
                    <button type="button" onClick={() => mover(i, -1)} className="p-1 hover:text-slate-700" title="Subir">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => mover(i, 1)} className="p-1 hover:text-slate-700" title="Descer">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => atualizar({ blocos: d.blocos.filter((x) => x.id !== b.id) })} className="p-1 hover:text-rose-600" title="Remover bloco">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="px-3 pb-2.5 pt-1">
                  <EditorBloco bloco={b} somenteLeitura={somenteLeitura} onChange={(novo) => atualizarBloco(b.id, novo)} />
                </div>
                {!somenteLeitura && (
                  <div className="px-3 pb-2">
                    {inserirApos === b.id ? (
                      <MenuInserir onEscolher={(t) => inserir(t, b.id)} onFechar={() => setInserirApos(null)} />
                    ) : (
                      <button type="button" onClick={() => setInserirApos(b.id)} className="text-[10px] font-bold text-slate-300 group-hover:text-[#92611F] flex items-center gap-1">
                        <Plus className="w-3 h-3" /> inserir abaixo
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!somenteLeitura && (
              <div className="pt-2">
                <MenuInserir onEscolher={(t) => inserir(t, null)} />
              </div>
            )}
          </div>
        </main>
      </div>

      {publicando && (
        <PublicarModal
          documento={d}
          avisos={problemas.filter((p) => p.nivel === 'aviso').length}
          onClose={() => setPublicando(false)}
          onPublicar={async (nota) => {
            const publicado = await publicarVersao(d, nota, usuario);
            setD(publicado);
            setAlterado(false);
            onSalvo(publicado);
            setPublicando(false);
          }}
        />
      )}

      {historico && <HistoricoModal documento={d} versoes={historico} onClose={() => setHistorico(null)} />}
    </div>
  );
};

const MenuInserir: React.FC<{ onEscolher: (t: BlocoDocumento['tipo']) => void; onFechar?: () => void }> = ({ onEscolher, onFechar }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {TIPOS_BLOCO.map((t) => (
      <button
        key={t.tipo}
        type="button"
        onClick={() => onEscolher(t.tipo)}
        className="px-2.5 py-1.5 bg-white border border-dashed border-slate-300 rounded-lg text-[11px] font-semibold text-slate-600 hover:border-[#C48229] hover:text-[#92611F] flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> {t.icone} {t.rotulo}
      </button>
    ))}
    {onFechar && (
      <button type="button" onClick={onFechar} className="p-1 text-slate-400">
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

/** Textarea que cresce com o conteúdo. */
const TextoAuto: React.FC<{ valor: string; onChange: (v: string) => void; className: string; placeholder?: string; disabled?: boolean }> = ({ valor, onChange, className, placeholder, disabled }) => (
  <textarea
    value={valor}
    disabled={disabled}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    rows={Math.max(1, Math.ceil(valor.length / 95) + (valor.match(/\n/g)?.length || 0))}
    className={`w-full resize-none bg-transparent outline-none disabled:text-inherit ${className}`}
  />
);

const EditorBloco: React.FC<{ bloco: BlocoDocumento; somenteLeitura: boolean; onChange: (b: BlocoDocumento) => void }> = ({ bloco: b, somenteLeitura, onChange }) => {
  if (b.tipo === 'titulo') {
    const tamanho = b.nivel === 1 ? 'text-base font-black uppercase tracking-wide text-slate-900' : b.nivel === 2 ? 'text-sm font-black text-slate-900' : 'text-sm font-bold text-slate-700';
    return <TextoAuto valor={b.texto} disabled={somenteLeitura} onChange={(texto) => onChange({ ...b, texto })} className={tamanho} placeholder="Título" />;
  }
  if (b.tipo === 'paragrafo') return <TextoAuto valor={b.texto} disabled={somenteLeitura} onChange={(texto) => onChange({ ...b, texto })} className="text-sm text-slate-700 leading-relaxed" placeholder="Texto" />;
  if (b.tipo === 'destaque')
    return (
      <div className="border-l-4 border-[#C48229] bg-amber-50/50 pl-3 rounded-r-lg">
        <TextoAuto valor={b.texto} disabled={somenteLeitura} onChange={(texto) => onChange({ ...b, texto })} className="text-sm italic text-slate-700 py-1.5" placeholder="Texto em destaque (atenção, observação importante)" />
      </div>
    );
  if (b.tipo === 'lista')
    return (
      <div className="space-y-1">
        {b.itens.map((item, k) => (
          <div key={k} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="text-[#92611F] font-bold w-5 shrink-0 text-right pt-px">{b.ordenada ? `${k + 1}.` : '•'}</span>
            <TextoAuto
              valor={item}
              disabled={somenteLeitura}
              onChange={(v) => {
                // Enter no fim do item = novo item.
                if (v.endsWith('\n')) onChange({ ...b, itens: [...b.itens.slice(0, k), v.trimEnd(), '', ...b.itens.slice(k + 1)] });
                else onChange({ ...b, itens: b.itens.map((x, j) => (j === k ? v : x)) });
              }}
              className="text-sm"
              placeholder="Item"
            />
            {!somenteLeitura && (
              <button type="button" onClick={() => onChange({ ...b, itens: b.itens.filter((_, j) => j !== k) })} className="p-0.5 text-slate-300 hover:text-rose-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {!somenteLeitura && (
          <button type="button" onClick={() => onChange({ ...b, itens: [...b.itens, ''] })} className="text-[11px] font-bold text-[#92611F] ml-7">
            + item
          </button>
        )}
      </div>
    );
  // Tabela
  const celula = 'w-full min-w-[80px] px-1.5 py-1 text-xs bg-transparent outline-none focus:bg-amber-50 disabled:text-inherit';
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {b.cabecalho.map((c, j) => (
              <th key={j} className="border border-slate-200 bg-[#F8F0E4] p-0 font-bold">
                <input value={c} disabled={somenteLeitura} onChange={(e) => onChange({ ...b, cabecalho: b.cabecalho.map((x, k) => (k === j ? e.target.value : x)) })} className={`${celula} font-bold`} />
                {!somenteLeitura && b.cabecalho.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...b, cabecalho: b.cabecalho.filter((_, k) => k !== j), linhas: b.linhas.map((l) => l.filter((_, k) => k !== j)) })}
                    className="text-[9px] text-slate-400 hover:text-rose-600 px-1"
                    title="Remover coluna"
                  >
                    remover
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.linhas.map((l, i) => (
            <tr key={i}>
              {l.map((v, j) => (
                <td key={j} className="border border-slate-200 p-0">
                  <input value={v} disabled={somenteLeitura} onChange={(e) => onChange({ ...b, linhas: b.linhas.map((x, k) => (k === i ? x.map((y, m) => (m === j ? e.target.value : y)) : x)) })} className={celula} />
                </td>
              ))}
              {!somenteLeitura && (
                <td className="pl-1">
                  <button type="button" onClick={() => onChange({ ...b, linhas: b.linhas.filter((_, k) => k !== i) })} className="p-0.5 text-slate-300 hover:text-rose-600" title="Remover linha">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!somenteLeitura && (
        <div className="flex gap-3 mt-1.5 text-[11px] font-bold text-[#92611F]">
          <button type="button" onClick={() => onChange({ ...b, linhas: [...b.linhas, b.cabecalho.map(() => '')] })}>+ linha</button>
          <button type="button" onClick={() => onChange({ ...b, cabecalho: [...b.cabecalho, `Coluna ${b.cabecalho.length + 1}`], linhas: b.linhas.map((l) => [...l, '']) })}>+ coluna</button>
        </div>
      )}
    </div>
  );
};

const PublicarModal: React.FC<{ documento: DocumentoPadronizado; avisos: number; onClose: () => void; onPublicar: (nota: string) => Promise<void> }> = ({ documento, avisos, onClose, onPublicar }) => {
  const [nota, setNota] = useState(documento.versao === 1 ? 'Emissão inicial' : '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-xs">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-black text-slate-900">Publicar versão {documento.versao}</h2>
          <p className="text-slate-500 mt-0.5">O documento passa a ser Vigente e fica somente leitura; esta versão é guardada no histórico.</p>
        </div>
        <div className="p-4 space-y-3">
          {avisos > 0 && (
            <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[#7A4F17]">
              Ainda há {avisos} aviso(s) do padrão. Dá para publicar assim, mas o ideal é resolver antes.
            </p>
          )}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">O que mudou nesta versão</label>
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando || !nota.trim()}
            onClick={async () => {
              setSalvando(true);
              setErro(null);
              try {
                await onPublicar(nota.trim());
              } catch (err) {
                console.error(err);
                setErro(err instanceof Error ? err.message : 'Não foi possível publicar.');
                setSalvando(false);
              }
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Publicar
          </button>
        </div>
      </div>
    </div>
  );
};

const HistoricoModal: React.FC<{ documento: DocumentoPadronizado; versoes: VersaoDocumento[]; onClose: () => void }> = ({ documento, versoes, onClose }) => (
  <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col text-xs">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-900">Histórico de revisões — {documento.codigo}</h2>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto">
        {versoes.length === 0 ? (
          <p className="text-slate-500">Nenhuma versão publicada ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {versoes.map((v) => (
              <li key={v.id} className="p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">
                    Versão {v.versao} · {new Date(v.criadoEm).toLocaleDateString('pt-BR')}
                    {v.criadoPor && <span className="font-normal text-slate-500"> · {v.criadoPor}</span>}
                  </p>
                  {v.nota && <p className="text-slate-600 mt-0.5">{v.nota}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const arquivo = gerarPdfDocumento({ ...documento, ...v.dados, titulo: v.titulo, versao: v.versao, blocos: v.blocos, status: v.versao === documento.versao && documento.status === 'Vigente' ? 'Vigente' : 'Obsoleto' } as DocumentoPadronizado);
                    baixarBlob(arquivo, arquivo.name);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold flex items-center gap-1 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-[#92611F]" /> PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);
