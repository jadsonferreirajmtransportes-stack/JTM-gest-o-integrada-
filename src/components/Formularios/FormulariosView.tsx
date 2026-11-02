import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  ClipboardList,
  Copy,
  Eye,
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Colaborador, UsuarioLogin } from '../../types';
import {
  Formulario,
  IdentificacaoExterna,
  Pergunta,
  StatusFormulario,
  TIPOS_PERGUNTA,
  TipoPergunta,
  contarRespostas,
  enviarCapaFormulario,
  excluirFormulario,
  formularioNovo,
  getFormularios,
  linkExternoDe,
  novaPergunta,
  salvarFormulario,
} from '../../utils/formulariosApi';
import { AcoesTela } from '../Common/AcoesTela';
import { FormularioRespostas } from './FormularioRespostas';
import { PreencherFormulario } from './PreencherFormulario';

const STATUS: Record<StatusFormulario, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: 'Rascunho', classe: 'bg-slate-100 text-slate-600 border-slate-200' },
  aberto: { rotulo: 'Recebendo respostas', classe: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  encerrado: { rotulo: 'Encerrado', classe: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const copiar = async (texto: string) => {
  try {
    await navigator.clipboard.writeText(texto);
    alert('Link copiado.');
  } catch {
    window.prompt('Copie o link:', texto);
  }
};

/** Módulo Formulários (estilo Google Forms): criar, publicar no portal e/ou por link, ver respostas. */
export const FormulariosView: React.FC<{ colaboradores: Colaborador[]; currentUser?: UsuarioLogin }> = ({ colaboradores, currentUser }) => {
  const [lista, setLista] = useState<Formulario[] | null>(null);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [editando, setEditando] = useState<Formulario | null>(null);
  const [vendoRespostas, setVendoRespostas] = useState<Formulario | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const carregar = () => {
    getFormularios()
      .then(setLista)
      .catch((e) => {
        console.error(e);
        setLista([]);
        setErro('Não foi possível carregar os formulários. Confira se a migração 088 foi rodada no Supabase.');
      });
    contarRespostas().then(setContagem).catch(() => undefined);
  };
  useEffect(carregar, []);

  const ativos = useMemo(() => colaboradores.filter((c) => c.status !== 'Inativo'), [colaboradores]);
  const visiveis = (lista || []).filter((f) => !busca.trim() || f.titulo.toLowerCase().includes(busca.toLowerCase()));

  if (editando) {
    return (
      <EditorFormulario
        inicial={editando}
        colaboradores={ativos}
        onVoltar={() => setEditando(null)}
        onSalvo={(f) => {
          setEditando(f);
          setLista((p) => [f, ...(p || []).filter((x) => x.id !== f.id)]);
        }}
      />
    );
  }
  if (vendoRespostas) {
    return <FormularioRespostas formulario={vendoRespostas} colaboradores={ativos} onVoltar={() => { setVendoRespostas(null); carregar(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hidden lg:flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Formulários</h1>
            <p className="text-xs text-slate-500 mt-0.5">Pesquisas, inscrições e avaliações respondidas no portal do colaborador e/ou por link externo.</p>
          </div>
        </div>
        <AcoesTela
          principal={
            <button
              type="button"
              onClick={() => setEditando(formularioNovo(currentUser?.nome))}
              className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo formulário
            </button>
          }
        />
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar formulário" className="w-full pl-8 p-2 border border-slate-200 rounded-lg text-xs bg-white" />
      </div>

      {lista === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : visiveis.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
          Nenhum formulário ainda. Clique em <strong>Novo formulário</strong> para criar o primeiro.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visiveis.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {f.capaUrl && <img src={f.capaUrl} alt="" className="w-full aspect-[3/1] object-cover bg-slate-100" />}
              <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-black text-slate-900 leading-snug">{f.titulo}</p>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS[f.status].classe}`}>{STATUS[f.status].rotulo}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {f.perguntas.length} pergunta(s) · {contagem[f.id] || 0} resposta(s)
                {f.noPortal ? ` · portal (${f.destinatarios ? `${f.destinatarios.length} colaborador(es)` : 'todos'})` : ''}
                {f.linkExterno ? ' · link externo' : ''}
                {f.encerraEm ? ` · até ${new Date(`${f.encerraEm}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setVendoRespostas(f)} className="px-2.5 py-1.5 rounded-lg bg-[#C48229] text-white text-[11px] font-bold flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5" /> Respostas
                </button>
                <button type="button" onClick={() => setEditando(f)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                {f.linkExterno && f.tokenExterno && (
                  <button type="button" onClick={() => copiar(linkExternoDe(f))} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" /> Copiar link
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setEditando({ ...f, id: '', titulo: `${f.titulo} (cópia)`, status: 'rascunho', tokenExterno: undefined, criadoPor: currentUser?.nome, criadoEm: new Date().toISOString() })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold flex items-center gap-1"
                  title="Criar um novo formulário a partir deste"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Excluir o formulário "${f.titulo}" e todas as ${contagem[f.id] || 0} resposta(s)? Não dá para desfazer.`)) return;
                    try {
                      await excluirFormulario(f.id);
                      setLista((p) => (p || []).filter((x) => x.id !== f.id));
                    } catch (e) {
                      console.error(e);
                      alert('Não foi possível excluir.');
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
const EditorFormulario: React.FC<{
  inicial: Formulario;
  colaboradores: Colaborador[];
  onVoltar: () => void;
  onSalvo: (f: Formulario) => void;
}> = ({ inicial, colaboradores, onVoltar, onSalvo }) => {
  const [f, setF] = useState<Formulario>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState(false);
  const [buscaColab, setBuscaColab] = useState('');
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const mudar = (p: Partial<Formulario>) => setF((x) => ({ ...x, ...p }));
  const escolherCapa = async (arquivo?: File) => {
    if (!arquivo) return;
    setEnviandoCapa(true);
    setErro(null);
    try {
      mudar({ capaUrl: await enviarCapaFormulario(arquivo) });
    } catch (e) {
      console.error(e);
      setErro(e instanceof Error ? `${e.message} (confira se a migração 090 foi rodada no Supabase)` : 'Não foi possível enviar a capa.');
    } finally {
      setEnviandoCapa(false);
    }
  };
  const mudarPergunta = (id: string, p: Partial<Pergunta>) => setF((x) => ({ ...x, perguntas: x.perguntas.map((q) => (q.id === id ? { ...q, ...p } : q)) }));
  const mover = (i: number, d: -1 | 1) =>
    setF((x) => {
      const l = [...x.perguntas];
      const j = i + d;
      if (j < 0 || j >= l.length) return x;
      [l[i], l[j]] = [l[j], l[i]];
      return { ...x, perguntas: l };
    });

  const salvar = async (status?: StatusFormulario) => {
    setErro(null);
    if (!f.titulo.trim()) return setErro('Dê um título ao formulário.');
    if (!f.perguntas.length) return setErro('Inclua pelo menos uma pergunta.');
    const semTitulo = f.perguntas.findIndex((q) => !q.titulo.trim());
    if (semTitulo >= 0) return setErro(`A pergunta ${semTitulo + 1} está sem texto.`);
    const semOpcoes = f.perguntas.findIndex((q) => TIPOS_PERGUNTA.find((t) => t.tipo === q.tipo)?.temOpcoes && !(q.opcoes || []).filter((o) => o.trim()).length);
    if (semOpcoes >= 0) return setErro(`A pergunta ${semOpcoes + 1} precisa de pelo menos uma opção.`);
    if (!f.noPortal && !f.linkExterno) return setErro('Escolha onde o formulário será respondido: no portal e/ou por link externo.');
    if (f.noPortal && f.destinatarios && f.destinatarios.length === 0) return setErro('Escolha pelo menos um colaborador (ou marque "Todos os colaboradores ativos").');
    setSalvando(true);
    try {
      const limpo: Formulario = {
        ...f,
        status: status || f.status,
        perguntas: f.perguntas.map((q) => ({ ...q, titulo: q.titulo.trim(), opcoes: q.opcoes ? Array.from(new Set(q.opcoes.map((o) => o.trim()).filter(Boolean))) : undefined })),
      };
      const salvo = await salvarFormulario(limpo);
      setF(salvo);
      onSalvo(salvo);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível salvar. Confira se a migração 088 foi rodada no Supabase.');
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs';
  const colabsFiltrados = colaboradores.filter((c) => !buscaColab.trim() || c.nomeCompleto.toLowerCase().includes(buscaColab.toLowerCase()) || (c.setor || '').toLowerCase().includes(buscaColab.toLowerCase()));

  if (previa) {
    return (
      <div className="space-y-3 max-w-2xl mx-auto">
        <button type="button" onClick={() => setPrevia(false)} className="flex items-center gap-1 text-xs font-bold text-[#92611F] normal-case tracking-normal">
          <ArrowLeft className="w-4 h-4" /> Voltar à edição
        </button>
        <p className="text-[11px] text-slate-500">Prévia: é assim que o colaborador (ou quem abrir o link) vê. Nada é enviado.</p>
        <PreencherFormulario
          formulario={{ id: f.id || 'previa', titulo: f.titulo || 'Formulário sem título', descricao: f.descricao, capa: f.capaUrl, perguntas: f.perguntas, identificacao: f.linkExterno ? f.identificacaoExterna : 'anonimo', mensagemFinal: f.mensagemFinal, aberto: true }}
          identificar={f.linkExterno}
          onEnviar={async () => {
            alert('Prévia: as respostas não são salvas.');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto" data-texto-livre="true">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onVoltar} className="flex items-center gap-1 text-xs font-bold text-[#92611F] normal-case tracking-normal">
          <ArrowLeft className="w-4 h-4" /> Formulários
        </button>
        <button type="button" onClick={() => setPrevia(true)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Prévia
        </button>
      </div>

      {/* Capa */}
      {f.capaUrl ? (
        <div className="relative">
          <img src={f.capaUrl} alt="" className="w-full aspect-[3/1] object-cover rounded-2xl border border-slate-200 bg-slate-100" />
          <div className="absolute right-2 bottom-2 flex gap-1.5">
            <label className="px-2.5 py-1.5 rounded-lg bg-white/90 text-[11px] font-bold cursor-pointer shadow-sm">
              {enviandoCapa ? 'Enviando...' : 'Trocar capa'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { escolherCapa(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={() => mudar({ capaUrl: '' })} className="px-2.5 py-1.5 rounded-lg bg-white/90 text-[11px] font-bold text-rose-600 shadow-sm">
              Tirar
            </button>
          </div>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 text-xs font-bold cursor-pointer hover:bg-amber-50 hover:border-amber-300">
          {enviandoCapa ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {enviandoCapa ? 'Enviando a imagem...' : 'Adicionar imagem de capa (opcional — formato largo, ex.: 1500 × 500)'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { escolherCapa(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      )}

      <div className="bg-white rounded-2xl border-t-4 border-t-[#C48229] border border-slate-200 p-4 space-y-2">
        <input value={f.titulo} onChange={(e) => mudar({ titulo: e.target.value })} placeholder="Título do formulário" data-no-uppercase="true" className="w-full text-lg font-black text-slate-900 border-b border-slate-200 pb-1.5 focus:outline-hidden focus:border-[#C48229]" />
        <textarea value={f.descricao || ''} onChange={(e) => mudar({ descricao: e.target.value })} placeholder="Descrição (opcional): para que serve, prazo, instruções..." rows={2} data-no-uppercase="true" className={campo} />
      </div>

      {f.perguntas.map((q, i) => {
        const temOpcoes = TIPOS_PERGUNTA.find((t) => t.tipo === q.tipo)?.temOpcoes;
        return (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={q.titulo} onChange={(e) => mudarPergunta(q.id, { titulo: e.target.value })} placeholder={`Pergunta ${i + 1}`} data-no-uppercase="true" className={`${campo} sm:flex-1 text-sm font-semibold`} />
              <select
                value={q.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as TipoPergunta;
                  const base = novaPergunta(tipo);
                  mudarPergunta(q.id, { tipo, opcoes: TIPOS_PERGUNTA.find((t) => t.tipo === tipo)?.temOpcoes ? q.opcoes?.length ? q.opcoes : base.opcoes : undefined, min: base.min, max: base.max });
                }}
                className={`${campo} sm:w-56`}
              >
                {TIPOS_PERGUNTA.map((t) => (
                  <option key={t.tipo} value={t.tipo}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <input value={q.ajuda || ''} onChange={(e) => mudarPergunta(q.id, { ajuda: e.target.value || undefined })} placeholder="Texto de ajuda (opcional)" data-no-uppercase="true" className={campo} />

            {temOpcoes && (
              <div className="space-y-1.5">
                {(q.opcoes || []).map((o, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    <input
                      value={o}
                      onChange={(e) => mudarPergunta(q.id, { opcoes: (q.opcoes || []).map((x, j) => (j === k ? e.target.value : x)) })}
                      data-no-uppercase="true"
                      className={`${campo} flex-1`}
                    />
                    <button type="button" onClick={() => mudarPergunta(q.id, { opcoes: (q.opcoes || []).filter((_, j) => j !== k) })} className="p-1 text-slate-400 hover:text-rose-600" title="Tirar opção">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => mudarPergunta(q.id, { opcoes: [...(q.opcoes || []), `Opção ${(q.opcoes || []).length + 1}`] })} className="text-[11px] font-bold text-[#92611F] hover:underline normal-case tracking-normal">
                  + Adicionar opção
                </button>
              </div>
            )}

            {q.tipo === 'escala' && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                De
                <select value={q.min ?? 1} onChange={(e) => mudarPergunta(q.id, { min: Number(e.target.value) })} className="border border-slate-200 rounded-lg px-2 py-1">
                  {[0, 1].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                a
                <select value={q.max ?? 5} onChange={(e) => mudarPergunta(q.id, { max: Number(e.target.value) })} className="border border-slate-200 rounded-lg px-2 py-1">
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                <input type="checkbox" checked={q.obrigatoria} onChange={(e) => mudarPergunta(q.id, { obrigatoria: e.target.checked })} className="w-4 h-4 accent-[#C48229]" /> Obrigatória
              </label>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Subir">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === f.perguntas.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Descer">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setF((x) => ({ ...x, perguntas: [...x.perguntas.slice(0, i + 1), { ...q, id: novaPergunta(q.tipo).id }, ...x.perguntas.slice(i + 1)] }))}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                  title="Duplicar pergunta"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setF((x) => ({ ...x, perguntas: x.perguntas.filter((p) => p.id !== q.id) }))} className="p-1.5 text-slate-400 hover:text-rose-600" title="Excluir pergunta">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={() => setF((x) => ({ ...x, perguntas: [...x.perguntas, novaPergunta('multipla')] }))} className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-300 text-[#92611F] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-amber-50">
        <Plus className="w-4 h-4" /> Adicionar pergunta
      </button>

      {/* Onde e como responder */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-black text-slate-900">Onde será respondido</p>

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={f.noPortal} onChange={(e) => mudar({ noPortal: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
          <span className="text-xs text-slate-700">
            <b>No portal do colaborador</b> — aparece em "Formulários" no link pessoal; uma resposta por colaborador e você vê quem ainda não respondeu.
          </span>
        </label>
        {f.noPortal && (
          <div className="ml-6 space-y-2">
            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={!f.destinatarios} onChange={() => mudar({ destinatarios: undefined })} className="accent-[#C48229]" /> Todos os colaboradores ativos
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={!!f.destinatarios} onChange={() => mudar({ destinatarios: f.destinatarios || [] })} className="accent-[#C48229]" /> Escolher colaboradores
              </label>
            </div>
            {f.destinatarios && (
              <div className="border border-slate-200 rounded-xl p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input value={buscaColab} onChange={(e) => setBuscaColab(e.target.value)} placeholder="Buscar por nome ou setor" className={`${campo} flex-1`} />
                  <button type="button" onClick={() => mudar({ destinatarios: Array.from(new Set([...(f.destinatarios || []), ...colabsFiltrados.map((c) => c.id)])) })} className="text-[11px] font-bold text-[#92611F] whitespace-nowrap normal-case tracking-normal">
                    Marcar os da lista
                  </button>
                  <button type="button" onClick={() => mudar({ destinatarios: [] })} className="text-[11px] font-bold text-slate-500 whitespace-nowrap normal-case tracking-normal">
                    Limpar
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">{f.destinatarios.length} selecionado(s)</p>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {colabsFiltrados.map((c) => {
                    const marcado = (f.destinatarios || []).includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 py-1.5 px-1 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => mudar({ destinatarios: marcado ? (f.destinatarios || []).filter((x) => x !== c.id) : [...(f.destinatarios || []), c.id] })}
                          className="w-4 h-4 accent-[#C48229]"
                        />
                        <span className="flex-1">{c.nomeCompleto}</span>
                        <span className="text-[10px] text-slate-400">{c.setor}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={f.linkExterno} onChange={(e) => mudar({ linkExterno: e.target.checked })} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
          <span className="text-xs text-slate-700">
            <b>Por link externo</b> — qualquer pessoa com o link responde, sem login (clientes, candidatos, gente de fora).
          </span>
        </label>
        {f.linkExterno && (
          <div className="ml-6 space-y-2">
            <select value={f.identificacaoExterna} onChange={(e) => mudar({ identificacaoExterna: e.target.value as IdentificacaoExterna })} className={campo}>
              <option value="anonimo">Anônimo (não pede identificação)</option>
              <option value="nome">Pedir o nome</option>
              <option value="nome_contato">Pedir nome e telefone/e-mail</option>
            </select>
            {f.tokenExterno ? (
              <div className="flex items-center gap-2">
                <input readOnly value={linkExternoDe(f)} className={`${campo} flex-1 text-slate-500`} />
                <button type="button" onClick={() => copiar(linkExternoDe(f))} className="px-2.5 py-2 rounded-lg border border-slate-200 text-[11px] font-bold flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">O link aparece aqui depois de salvar.</p>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <label className="text-xs">
            <span className="font-semibold text-slate-600">Recebe respostas até (opcional)</span>
            <input type="date" value={f.encerraEm || ''} onChange={(e) => mudar({ encerraEm: e.target.value || undefined })} className={campo} />
          </label>
          <label className="text-xs">
            <span className="font-semibold text-slate-600">Mensagem depois de enviar (opcional)</span>
            <input value={f.mensagemFinal || ''} onChange={(e) => mudar({ mensagemFinal: e.target.value || undefined })} placeholder="Obrigado por responder!" data-no-uppercase="true" className={campo} />
          </label>
        </div>
      </div>

      {erro && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</p>}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS[f.status].classe}`}>{STATUS[f.status].rotulo}</span>
        <div className="flex flex-wrap gap-2 ml-auto">
          <button type="button" onClick={() => salvar()} disabled={salvando} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
          {f.status !== 'aberto' && (
            <button type="button" onClick={() => salvar('aberto')} disabled={salvando} className="px-3 py-2 rounded-lg bg-[#C48229] hover:bg-[#92611F] text-white text-xs font-bold disabled:opacity-50">
              {f.status === 'encerrado' ? 'Reabrir' : 'Publicar e receber respostas'}
            </button>
          )}
          {f.status === 'aberto' && (
            <button type="button" onClick={() => salvar('encerrado')} disabled={salvando} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold disabled:opacity-50">
              Encerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
