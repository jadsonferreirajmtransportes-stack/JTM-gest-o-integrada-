import React, { useState } from 'react';
import { X, Loader2, Upload, Type, Images, ArrowUp, ArrowDown, Trash2, Eye, PencilLine, Send, Save, Undo2, ShieldCheck } from 'lucide-react';
import { EditorImagens } from '../Educacao/EditorImagens';
import { CapaNoticia, CorpoNoticia, dataNoticia } from './jornalVisual';
import { BlocoNoticia, CATEGORIAS_NOTICIA, Noticia, enviarImagemJornal, novoIdJornal, saveNoticia } from '../../utils/jornalApi';

const LIMITE_CAPA_MB = 8;

export function noticiaEmBranco(autor?: string): Noticia {
  return {
    id: '',
    titulo: '',
    resumo: '',
    categoria: 'Notícias',
    capa: '',
    blocos: [{ id: novoIdJornal('bl'), tipo: 'texto', texto: '' }],
    status: 'rascunho',
    destaque: false,
    permiteComentarios: true,
    autorNome: 'Comunicação JMT',
    criadoPor: autor,
    autorizacaoImagem: false,
  };
}

/** Editor da notícia (texto livre com imagens). Administrador publica direto; os demais
 *  salvam rascunho e enviam para aprovação. */
export const NoticiaEditorModal: React.FC<{
  inicial: Noticia;
  ehAdmin: boolean;
  usuarioNome?: string;
  onClose: () => void;
  onSalvo: (n: Noticia) => void;
}> = ({ inicial, ehAdmin, usuarioNome, onClose, onSalvo }) => {
  const [n, setN] = useState<Noticia>(inicial);
  const [previa, setPrevia] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [devolvendo, setDevolvendo] = useState(false);
  const [motivo, setMotivo] = useState('');

  const atualizar = (p: Partial<Noticia>) => setN((prev) => ({ ...prev, ...p }));
  const atualizarBloco = (i: number, b: BlocoNoticia) => atualizar({ blocos: n.blocos.map((x, k) => (k === i ? b : x)) });
  const moverBloco = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= n.blocos.length) return;
    const nova = [...n.blocos];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    atualizar({ blocos: nova });
  };

  const temImagens = !!n.capa || n.blocos.some((b) => b.tipo === 'imagens' && b.telas.length > 0);
  const temTexto = n.blocos.some((b) => b.tipo === 'texto' && b.texto.trim());
  const sugestaoDeOutro = inicial.status === 'sugerida' && ehAdmin;

  const salvar = async (status: Noticia['status'], rotulo: string, extra: Partial<Noticia> = {}) => {
    setErro(null);
    if (!n.titulo.trim()) return setErro('Dê um título à notícia.');
    if (status !== 'rascunho' && !temTexto) return setErro('Escreva o texto da notícia.');
    if (status === 'publicada' && temImagens && !n.autorizacaoImagem) return setErro('Confirme a autorização de uso das imagens antes de publicar.');
    setSalvando(rotulo);
    try {
      const blocos = n.blocos.filter((b) => (b.tipo === 'texto' ? b.texto.trim() : b.telas.length > 0));
      const salvo = await saveNoticia({
        ...n,
        ...extra,
        titulo: n.titulo.trim(),
        resumo: n.resumo?.trim(),
        blocos: blocos.length ? blocos : n.blocos,
        status,
        publicadaEm: status === 'publicada' ? n.publicadaEm || new Date().toISOString() : n.publicadaEm,
        revisadoPor: status === 'publicada' && ehAdmin ? usuarioNome : extra.revisadoPor ?? n.revisadoPor,
        observacaoRevisao: status === 'publicada' || status === 'sugerida' ? '' : extra.observacaoRevisao ?? n.observacaoRevisao,
      });
      onSalvo(salvo);
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a notícia.');
    } finally {
      setSalvando(null);
    }
  };

  const enviarCapa = async (arq?: File) => {
    if (!arq) return;
    if (!arq.type.startsWith('image/')) return setErro('Escolha uma imagem (JPG, PNG ou WEBP).');
    if (arq.size > LIMITE_CAPA_MB * 1024 * 1024) return setErro(`A imagem de capa passa de ${LIMITE_CAPA_MB}MB.`);
    setErro(null);
    setEnviandoCapa(true);
    try {
      atualizar({ capa: await enviarImagemJornal(arq) });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar a capa.');
    } finally {
      setEnviandoCapa(false);
    }
  };

  return (
    <div data-texto-livre="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">{inicial.id ? 'Editar notícia' : 'Nova notícia'}</h2>
            <p className="text-slate-500">{ehAdmin ? 'Você pode publicar direto no Jornal JMT.' : 'Escreva e envie para aprovação — o administrador revisa e publica.'}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPrevia((p) => !p)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              {previa ? <PencilLine className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {previa ? 'Voltar a editar' : 'Ver como fica'}
            </button>
            <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700" title="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {inicial.observacaoRevisao && inicial.status === 'rascunho' && (
            <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[#7A4F17]">
              <strong>Devolvida para ajuste:</strong> {inicial.observacaoRevisao}
            </p>
          )}

          {previa ? (
            <article className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <CapaNoticia titulo={n.titulo} categoria={n.categoria} capa={n.capa} tamanho="grande" />
              <div className="p-5 space-y-4">
                <p className="text-[11px] text-slate-500">
                  {n.autorNome || 'Comunicação JMT'} · {dataNoticia(n.publicadaEm || new Date().toISOString())}
                </p>
                {n.resumo && <p className="text-base font-semibold text-slate-800 leading-snug">{n.resumo}</p>}
                <CorpoNoticia blocos={n.blocos} />
              </div>
            </article>
          ) : (
            <>
              <div className="grid sm:grid-cols-[1fr_200px] gap-3">
                <div className="space-y-3">
                  <label className="block">
                    <span className="font-bold text-slate-700">Título *</span>
                    <input
                      value={n.titulo}
                      onChange={(e) => atualizar({ titulo: e.target.value })}
                      maxLength={140}
                      placeholder="Ex.: Equipe do Farma Aéreo bate recorde de entregas no prazo"
                      className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold"
                    />
                  </label>
                  <label className="block">
                    <span className="font-bold text-slate-700">Linha fina (resumo)</span>
                    <input
                      value={n.resumo || ''}
                      onChange={(e) => atualizar({ resumo: e.target.value })}
                      maxLength={220}
                      placeholder="Uma frase que conta o essencial — aparece na lista de notícias"
                      className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="font-bold text-slate-700">Editoria</span>
                      <select value={n.categoria} onChange={(e) => atualizar({ categoria: e.target.value })} className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg bg-white">
                        {CATEGORIAS_NOTICIA.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-bold text-slate-700">Assinatura</span>
                      <input
                        value={n.autorNome || ''}
                        onChange={(e) => atualizar({ autorNome: e.target.value })}
                        placeholder="Ex.: Comunicação JMT"
                        className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg"
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700">Capa</span>
                  <CapaNoticia titulo={n.titulo} categoria={n.categoria} capa={n.capa} className="rounded-xl border border-slate-200" />
                  <div className="flex flex-wrap gap-1">
                    <label className={`inline-flex items-center gap-1 px-2 py-1 border border-dashed border-slate-300 rounded-lg font-bold text-[#92611F] ${enviandoCapa ? 'opacity-60' : 'cursor-pointer hover:border-[#C48229]'}`}>
                      {enviandoCapa ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {n.capa ? 'Trocar foto' : 'Enviar foto'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={enviandoCapa} onChange={(e) => { enviarCapa(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {n.capa && (
                      <button type="button" onClick={() => atualizar({ capa: '' })} className="px-2 py-1 text-rose-600 font-semibold hover:bg-rose-50 rounded-lg">
                        Capa automática
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-700">Texto da notícia</p>
                {n.blocos.map((b, i) => (
                  <div key={b.id} className="flex gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      {b.tipo === 'texto' ? (
                        <textarea
                          value={b.texto}
                          onChange={(e) => atualizarBloco(i, { ...b, texto: e.target.value })}
                          rows={Math.min(14, Math.max(4, b.texto.split('\n').length + 1))}
                          placeholder="Escreva aqui. Deixe uma linha em branco para começar um novo parágrafo."
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm leading-relaxed bg-white"
                        />
                      ) : (
                        <EditorImagens
                          telas={b.telas}
                          onChange={(telas) => atualizarBloco(i, { ...b, telas })}
                          enviarArquivo={enviarImagemJornal}
                          textoBotao="Adicionar fotos"
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button type="button" onClick={() => moverBloco(i, -1)} className="p-1 text-slate-400 hover:text-slate-700" title="Subir">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => moverBloco(i, 1)} className="p-1 text-slate-400 hover:text-slate-700" title="Descer">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => atualizar({ blocos: n.blocos.filter((_, k) => k !== i) })} className="p-1 text-slate-400 hover:text-rose-600" title="Remover bloco">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => atualizar({ blocos: [...n.blocos, { id: novoIdJornal('bl'), tipo: 'texto', texto: '' }] })}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <Type className="w-3.5 h-3.5" /> Adicionar texto
                  </button>
                  <button
                    type="button"
                    onClick={() => atualizar({ blocos: [...n.blocos, { id: novoIdJornal('bl'), tipo: 'imagens', telas: [] }] })}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <Images className="w-3.5 h-3.5" /> Adicionar fotos
                  </button>
                </div>
              </div>

              <div className="space-y-2 p-3 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={n.permiteComentarios} onChange={(e) => atualizar({ permiteComentarios: e.target.checked })} className="w-4 h-4 accent-[#C48229]" />
                  <span>Permitir comentários (só aparecem depois que o administrador aprova)</span>
                </label>
                {ehAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={n.destaque} onChange={(e) => atualizar({ destaque: e.target.checked })} className="w-4 h-4 accent-[#C48229]" />
                    <span>Fixar no topo do jornal (destaque)</span>
                  </label>
                )}
                {temImagens && (
                  <label className="flex items-start gap-2 cursor-pointer p-2 bg-amber-50 border border-amber-200 rounded-lg text-[#7A4F17]">
                    <input type="checkbox" checked={n.autorizacaoImagem} onChange={(e) => atualizar({ autorizacaoImagem: e.target.checked })} className="w-4 h-4 accent-[#C48229] mt-0.5" />
                    <span>
                      <ShieldCheck className="w-3.5 h-3.5 inline -mt-0.5" /> As pessoas que aparecem nas fotos autorizaram o uso da imagem, e as fotos não mostram documentos, crachás, placas ou dados de
                      clientes (LGPD).
                    </span>
                  </label>
                )}
              </div>
            </>
          )}

          {devolvendo && (
            <div className="p-3 border border-amber-200 bg-amber-50 rounded-xl space-y-2">
              <p className="font-bold text-[#7A4F17]">O que precisa ajustar?</p>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 rounded-lg bg-white" placeholder="Ex.: incluir a data do evento e trocar a foto" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDevolvendo(false)} className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-white rounded-lg">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!motivo.trim() || !!salvando}
                  onClick={() => salvar('rascunho', 'devolver', { observacaoRevisao: motivo.trim(), revisadoPor: usuarioNome })}
                  className="px-3 py-1.5 bg-[#92611F] text-white rounded-lg font-bold disabled:opacity-50"
                >
                  Devolver ao autor
                </button>
              </div>
            </div>
          )}
          {erro && <p className="text-rose-700 font-semibold">{erro}</p>}
        </div>

        <div className="p-4 border-t border-slate-200 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
            Cancelar
          </button>
          {sugestaoDeOutro && !devolvendo && (
            <button type="button" onClick={() => setDevolvendo(true)} className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
              <Undo2 className="w-4 h-4" /> Devolver para ajuste
            </button>
          )}
          {inicial.status !== 'publicada' && !sugestaoDeOutro && (
            <button
              type="button"
              disabled={!!salvando}
              onClick={() => salvar('rascunho', 'rascunho')}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50"
            >
              {salvando === 'rascunho' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar rascunho
            </button>
          )}
          {ehAdmin ? (
            <button
              type="button"
              disabled={!!salvando}
              onClick={() => salvar('publicada', 'publicar')}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {salvando === 'publicar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {inicial.status === 'publicada' ? 'Salvar alterações' : 'Publicar'}
            </button>
          ) : (
            <button
              type="button"
              disabled={!!salvando}
              onClick={() => salvar('sugerida', 'sugerir')}
              className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {salvando === 'sugerir' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar para aprovação
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
