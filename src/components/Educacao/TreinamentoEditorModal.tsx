import React, { useMemo, useState } from 'react';
import {
  X,
  Loader2,
  PlayCircle,
  FileText,
  BookOpen,
  AlignLeft,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { Colaborador, InstrucaoTrabalho } from '../../types';
import {
  ConteudoTreinamento,
  PerguntaProva,
  TipoConteudoTreinamento,
  Treinamento,
  enviarMaterialTreinamento,
  gerarIdCurto,
} from '../../utils/educacaoApi';

interface TreinamentoEditorModalProps {
  treinamento: Treinamento | null;
  colaboradores: Colaborador[];
  instrucoes: InstrucaoTrabalho[];
  criadoPor?: string;
  onClose: () => void;
  onSalvar: (t: Treinamento) => Promise<void>;
}

export const TIPOS_CONTEUDO: Record<TipoConteudoTreinamento, { rotulo: string; icone: React.ReactNode }> = {
  video: { rotulo: 'Vídeo', icone: <PlayCircle className="w-4 h-4" /> },
  pdf: { rotulo: 'Material (PDF)', icone: <FileText className="w-4 h-4" /> },
  instrucao: { rotulo: 'Instrução de Trabalho', icone: <BookOpen className="w-4 h-4" /> },
  texto: { rotulo: 'Texto', icone: <AlignLeft className="w-4 h-4" /> },
  telas: { rotulo: 'Passo a passo com imagens', icone: <ImageIcon className="w-4 h-4" /> },
};

function vazio(criadoPor?: string): Treinamento {
  return {
    id: '',
    titulo: '',
    descricao: '',
    cargaHorariaMin: 60,
    conteudos: [],
    prova: { notaMinima: 70, perguntas: [] },
    obrigatorioTodos: false,
    obrigatorioCargos: [],
    obrigatorioSetores: [],
    validadeMeses: undefined,
    prazoDias: 15,
    ativo: true,
    criadoPor,
  };
}

const unicos = (valores: (string | undefined)[]) =>
  Array.from(new Set(valores.map((v) => (v || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

/** Cadastro/edição de um treinamento: conteúdos (vídeo, PDF, Instrução de Trabalho, texto),
 *  prova com nota mínima, obrigatoriedade por cargo/setor, prazo e validade (reciclagem). */
export const TreinamentoEditorModal: React.FC<TreinamentoEditorModalProps> = ({ treinamento, colaboradores, instrucoes, criadoPor, onClose, onSalvar }) => {
  const [t, setT] = useState<Treinamento>(() =>
    treinamento ? { ...treinamento, prova: treinamento.prova ?? { notaMinima: 70, perguntas: [] } } : vazio(criadoPor)
  );
  const [salvando, setSalvando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const cargos: string[] = useMemo(() => unicos(colaboradores.map((c) => c.funcaoCargo)), [colaboradores]);
  const setores: string[] = useMemo(() => unicos(colaboradores.map((c) => c.setor)), [colaboradores]);
  const instrucoesVigentes: InstrucaoTrabalho[] = useMemo(
    () => instrucoes.filter((i) => i.status === 'Vigente' && !i.arquivada).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [instrucoes]
  );
  const perguntas = t.prova?.perguntas ?? [];

  const atualizar = (parcial: Partial<Treinamento>) => setT((prev) => ({ ...prev, ...parcial }));
  const atualizarConteudo = (id: string, parcial: Partial<ConteudoTreinamento>) =>
    atualizar({ conteudos: t.conteudos.map((c) => (c.id === id ? { ...c, ...parcial } : c)) });
  const moverConteudo = (i: number, delta: number) => {
    const lista = [...t.conteudos];
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    atualizar({ conteudos: lista });
  };
  const adicionarConteudo = (tipo: TipoConteudoTreinamento) =>
    atualizar({ conteudos: [...t.conteudos, { id: gerarIdCurto('cont'), tipo, titulo: '' }] });

  const atualizarPerguntas = (lista: PerguntaProva[]) => atualizar({ prova: { notaMinima: t.prova?.notaMinima ?? 70, perguntas: lista } });
  const atualizarPergunta = (id: string, parcial: Partial<PerguntaProva>) =>
    atualizarPerguntas(perguntas.map((p) => (p.id === id ? { ...p, ...parcial } : p)));

  const alternarLista = (lista: string[], valor: string) => (lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);

  const handleEnviarPdf = async (conteudoId: string, arquivo?: File) => {
    if (!arquivo) return;
    if (arquivo.size > 20 * 1024 * 1024) {
      setErro('O PDF passa de 20MB. Reduza o arquivo (ex.: "Salvar como PDF reduzido") e tente de novo.');
      return;
    }
    setErro(null);
    setEnviandoId(conteudoId);
    try {
      const url = await enviarMaterialTreinamento(arquivo);
      const atual = t.conteudos.find((c) => c.id === conteudoId);
      atualizarConteudo(conteudoId, { url, titulo: atual?.titulo || arquivo.name.replace(/\.pdf$/i, '') });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setEnviandoId(null);
    }
  };

  const validar = (): string | null => {
    if (!t.titulo.trim()) return 'Dê um título ao treinamento.';
    if (t.conteudos.length === 0) return 'Adicione pelo menos um conteúdo.';
    for (const c of t.conteudos) {
      if (!c.titulo.trim()) return 'Todo conteúdo precisa de um título.';
      if ((c.tipo === 'video' || c.tipo === 'pdf') && !c.url) return `Falta o ${c.tipo === 'video' ? 'link do vídeo' : 'arquivo PDF'} em "${c.titulo}".`;
      if (c.tipo === 'instrucao' && !c.instrucaoId) return `Escolha a Instrução de Trabalho em "${c.titulo}".`;
      if (c.tipo === 'texto' && !c.texto?.trim()) return `Escreva o texto de "${c.titulo}".`;
      if (c.tipo === 'telas' && !c.telas?.length) return `"${c.titulo}" está sem imagens.`;
    }
    for (const [i, p] of perguntas.entries()) {
      if (!p.enunciado.trim()) return `Escreva o enunciado da pergunta ${i + 1}.`;
      if (p.alternativas.filter((a) => a.trim()).length < 2) return `A pergunta ${i + 1} precisa de pelo menos 2 alternativas.`;
      if (p.correta === undefined || !p.alternativas[p.correta]?.trim()) return `Marque a alternativa certa da pergunta ${i + 1}.`;
    }
    return null;
  };

  const handleSalvar = async () => {
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      // Tira alternativas em branco (ajustando o índice da certa).
      const perguntasLimpas = perguntas.map((p) => {
        const certa = p.alternativas[p.correta ?? 0];
        const alternativas = p.alternativas.map((a) => a.trim()).filter(Boolean);
        return { ...p, enunciado: p.enunciado.trim(), alternativas, correta: alternativas.indexOf(certa.trim()) };
      });
      await onSalvar({ ...t, titulo: t.titulo.trim(), prova: { notaMinima: t.prova?.notaMinima ?? 70, perguntas: perguntasLimpas } });
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full p-2 border border-slate-300 rounded-lg text-xs';
  const rotulo = 'text-[11px] font-bold text-slate-600 block mb-1';

  return (
    <div data-texto-livre="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">{treinamento?.id ? 'Editar treinamento' : 'Novo treinamento'}</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto text-xs">
          {/* Dados gerais */}
          <section className="space-y-3">
            <div>
              <label className={rotulo}>Título</label>
              <input value={t.titulo} onChange={(e) => atualizar({ titulo: e.target.value })} className={campo} placeholder="Ex.: Boas Práticas de Transporte (RDC 430)" />
            </div>
            <div>
              <label className={rotulo}>Descrição (aparece pro colaborador)</label>
              <textarea value={t.descricao || ''} onChange={(e) => atualizar({ descricao: e.target.value })} rows={2} className={campo} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={rotulo}>Carga horária (min)</label>
                <input type="number" min={1} value={t.cargaHorariaMin} onChange={(e) => atualizar({ cargaHorariaMin: Math.max(1, Number(e.target.value) || 1) })} className={campo} />
              </div>
              <div>
                <label className={rotulo}>Prazo para concluir (dias)</label>
                <input
                  type="number"
                  min={0}
                  value={t.prazoDias ?? ''}
                  onChange={(e) => atualizar({ prazoDias: e.target.value ? Number(e.target.value) : undefined })}
                  className={campo}
                  placeholder="Sem prazo"
                />
              </div>
              <div>
                <label className={rotulo}>Validade (meses)</label>
                <input
                  type="number"
                  min={1}
                  value={t.validadeMeses ?? ''}
                  onChange={(e) => atualizar({ validadeMeses: e.target.value ? Number(e.target.value) : undefined })}
                  className={campo}
                  placeholder="Não vence"
                />
              </div>
              <label className="flex items-center gap-2 mt-5 font-semibold text-slate-700">
                <input type="checkbox" checked={t.ativo} onChange={(e) => atualizar({ ativo: e.target.checked })} className="w-4 h-4 accent-[#C48229]" />
                Ativo
              </label>
            </div>
            <p className="text-[11px] text-slate-500">
              Com validade, quem concluiu recebe o treinamento de novo (reciclagem) quando vencer.
            </p>
          </section>

          {/* Conteúdos */}
          <section className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Conteúdos (na ordem em que o colaborador vê)</h3>
            {t.conteudos.map((c, i) => (
              <div key={c.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <span className="text-[#92611F] flex items-center gap-1 font-bold shrink-0">
                    {TIPOS_CONTEUDO[c.tipo].icone} {TIPOS_CONTEUDO[c.tipo].rotulo}
                  </span>
                  <input value={c.titulo} onChange={(e) => atualizarConteudo(c.id, { titulo: e.target.value })} className={campo} placeholder="Título do conteúdo" />
                  <button type="button" onClick={() => moverConteudo(i, -1)} className="p-1 text-slate-400 hover:text-slate-700" title="Subir">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => moverConteudo(i, 1)} className="p-1 text-slate-400 hover:text-slate-700" title="Descer">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => atualizar({ conteudos: t.conteudos.filter((x) => x.id !== c.id) })}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {c.tipo === 'video' && (
                  <input
                    value={c.url || ''}
                    onChange={(e) => atualizarConteudo(c.id, { url: e.target.value.trim() })}
                    className={campo}
                    placeholder="Link do YouTube, Vimeo ou Google Drive"
                  />
                )}
                {c.tipo === 'pdf' && (
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-slate-50">
                      {enviandoId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {c.url ? 'Trocar PDF' : 'Enviar PDF'}
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleEnviarPdf(c.id, e.target.files?.[0])} />
                    </label>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Arquivo enviado (abrir)
                      </a>
                    )}
                  </div>
                )}
                {c.tipo === 'instrucao' && (
                  <select value={c.instrucaoId || ''} onChange={(e) => {
                    const it = instrucoesVigentes.find((x) => x.id === e.target.value);
                    atualizarConteudo(c.id, { instrucaoId: e.target.value, titulo: c.titulo || (it ? `${it.codigo} — ${it.titulo}` : '') });
                  }} className={campo}>
                    <option value="">Escolha uma Instrução de Trabalho vigente...</option>
                    {instrucoesVigentes.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.codigo} — {it.titulo}
                      </option>
                    ))}
                  </select>
                )}
                {c.tipo === 'texto' && (
                  <textarea value={c.texto || ''} onChange={(e) => atualizarConteudo(c.id, { texto: e.target.value })} rows={4} className={campo} placeholder="Texto que o colaborador vai ler" />
                )}
                {c.tipo === 'telas' && (
                  <div className="flex gap-2 overflow-x-auto">
                    {(c.telas || []).map((t) => (
                      <img key={t.imagem} src={t.imagem} alt={t.titulo} title={t.titulo} className="h-20 rounded-lg border border-slate-200" />
                    ))}
                    <p className="text-[11px] text-slate-500 self-center shrink-0">Gerado pelo sistema (Treinamentos do sistema).</p>
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TIPOS_CONTEUDO) as TipoConteudoTreinamento[]).filter((tipo) => tipo !== 'telas').map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => adicionarConteudo(tipo)}
                  className="px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded-lg font-semibold text-slate-600 hover:border-[#C48229] hover:text-[#92611F] flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> {TIPOS_CONTEUDO[tipo].rotulo}
                </button>
              ))}
            </div>
            {instrucoesVigentes.length === 0 && (
              <p className="text-[11px] text-slate-500">Nenhuma Instrução de Trabalho está "Vigente" ainda — só as vigentes podem entrar no treinamento.</p>
            )}
          </section>

          {/* Prova */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Prova (opcional)</h3>
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                Nota mínima
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={t.prova?.notaMinima ?? 70}
                  onChange={(e) => atualizar({ prova: { perguntas, notaMinima: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })}
                  className="w-16 p-1.5 border border-slate-300 rounded-lg text-xs"
                />
                / 100
              </label>
            </div>
            {perguntas.map((p, i) => (
              <div key={p.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-black text-slate-500 mt-2">{i + 1}.</span>
                  <textarea value={p.enunciado} onChange={(e) => atualizarPergunta(p.id, { enunciado: e.target.value })} rows={2} className={campo} placeholder="Enunciado da pergunta" />
                  <button type="button" onClick={() => atualizarPerguntas(perguntas.filter((x) => x.id !== p.id))} className="p-1 mt-1 text-slate-400 hover:text-rose-600" title="Remover pergunta">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {p.alternativas.map((a, k) => (
                  <div key={k} className="flex items-center gap-2 pl-5">
                    <input
                      type="radio"
                      name={`certa-${p.id}`}
                      checked={p.correta === k}
                      onChange={() => atualizarPergunta(p.id, { correta: k })}
                      className="w-4 h-4 accent-emerald-600"
                      title="Alternativa certa"
                    />
                    <input
                      value={a}
                      onChange={(e) => atualizarPergunta(p.id, { alternativas: p.alternativas.map((x, j) => (j === k ? e.target.value : x)) })}
                      className={campo}
                      placeholder={`Alternativa ${String.fromCharCode(65 + k)}`}
                    />
                  </div>
                ))}
                <div className="pl-5 flex items-center gap-3 text-[11px]">
                  {p.alternativas.length < 5 && (
                    <button type="button" onClick={() => atualizarPergunta(p.id, { alternativas: [...p.alternativas, ''] })} className="text-[#92611F] font-bold hover:underline">
                      + alternativa
                    </button>
                  )}
                  <span className="text-slate-400">Marque a bolinha da alternativa certa.</span>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => atualizarPerguntas([...perguntas, { id: gerarIdCurto('perg'), enunciado: '', alternativas: ['', '', ''], correta: undefined }])}
              className="px-3 py-1.5 bg-white border border-dashed border-slate-300 rounded-lg font-semibold text-slate-600 hover:border-[#C48229] hover:text-[#92611F] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Pergunta
            </button>
          </section>

          {/* Obrigatoriedade */}
          <section className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Quem precisa fazer</h3>
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input type="checkbox" checked={t.obrigatorioTodos} onChange={(e) => atualizar({ obrigatorioTodos: e.target.checked })} className="w-4 h-4 accent-[#C48229]" />
              Todos os colaboradores ativos
            </label>
            {!t.obrigatorioTodos && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <span className={rotulo}>Cargos</span>
                  <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {cargos.map((c) => (
                      <label key={c} className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={t.obrigatorioCargos.includes(c)} onChange={() => atualizar({ obrigatorioCargos: alternarLista(t.obrigatorioCargos, c) })} className="accent-[#C48229]" />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={rotulo}>Setores</span>
                  <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {setores.map((s) => (
                      <label key={s} className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={t.obrigatorioSetores.includes(s)} onChange={() => atualizar({ obrigatorioSetores: alternarLista(t.obrigatorioSetores, s) })} className="accent-[#C48229]" />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500">Também dá pra atribuir a pessoas específicas depois, na aba Acompanhamento.</p>
          </section>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-rose-700 font-semibold">{erro}</span>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando || !!enviandoId}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
