import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Image as ImageIcon, Users, Building2, AlertTriangle, Upload, Trash2, ChevronLeft } from 'lucide-react';
import { Cliente, Colaborador } from '../../types';
import {

  Comunicado,
  DestinatarioComunicado,
  ModeloImagem,
  NovoDestinatario,
  PublicoComunicado,
  criarComunicado,
  enviarArquivoComunicado,
  atualizarImagemComunicado,
  numeroFormatado,
} from '../../utils/comunicadosApi';
import { MODELOS_IMAGEM, gerarImagemComunicado } from './comunicadoImagem';
import { CampoModelo, MODELOS_REDACAO, ValoresModelo, camposDe, categoriasPara, montarComunicado, valoresIniciais } from './comunicadoModelos';

interface NovoComunicadoModalProps {
  colaboradores: Colaborador[];
  clientes: Cliente[];
  criadoPor?: string;
  onClose: () => void;
  onCriado: (c: Comunicado, d: DestinatarioComunicado[]) => void;
}

const ASSINATURAS = ['Departamento Pessoal', 'Diretoria', 'Gestão de Qualidade', 'Comercial', 'Operações'];

const MODELO_POR_CATEGORIA: Record<string, ModeloImagem> = {
  Aviso: 'aviso',
  Informativo: 'aviso',
  Urgente: 'urgente',
  Segurança: 'seguranca',
  Parabéns: 'parabens',
  Evento: 'evento',
  Comercial: 'comercial',
};

interface Candidato extends NovoDestinatario {
  chave: string;
  grupo: string; // setor do colaborador ou empresa do cliente
  detalhe?: string; // cargo / função do contato
}

/** Um campo do modelo de redação (texto curto, data, hora, lista, opções ou sim/não). */
const CampoDoModelo: React.FC<{ campo: CampoModelo; valor: ValoresModelo[string]; onChange: (v: ValoresModelo[string]) => void }> = ({ campo: c, valor, onChange }) => {
  const estilo = 'w-full p-2 border border-slate-300 rounded-lg text-xs bg-white';
  const rotulo = (
    <span className="text-[11px] font-bold text-slate-600 block mb-1">
      {c.rotulo}
      {c.obrigatorio && <span className="text-rose-600"> *</span>}
    </span>
  );
  if (c.tipo === 'sim_nao') {
    return (
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" checked={valor === true} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-[#C48229]" />
        {c.rotulo}
      </label>
    );
  }
  if (c.tipo === 'lista') {
    const itens = Array.isArray(valor) && valor.length ? valor : [''];
    return (
      <div>
        {rotulo}
        <div className="space-y-1.5">
          {itens.map((item, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={item}
                maxLength={140}
                onChange={(e) => onChange(itens.map((x, k) => (k === i ? e.target.value : x)))}
                placeholder={i === 0 ? c.placeholder : 'Mais um item'}
                className={estilo}
              />
              {itens.length > 1 && (
                <button type="button" onClick={() => onChange(itens.filter((_, k) => k !== i))} className="px-2 text-slate-400 hover:text-rose-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {itens.length < (c.max || 5) && (
            <button type="button" onClick={() => onChange([...itens, ''])} className="text-[11px] font-bold text-[#92611F]">
              + item
            </button>
          )}
        </div>
      </div>
    );
  }
  if (c.tipo === 'opcoes') {
    return (
      <div>
        {rotulo}
        <select value={typeof valor === 'string' ? valor : ''} onChange={(e) => onChange(e.target.value)} className={estilo}>
          {(c.opcoes || []).map((o) => (
            <option key={o} value={o}>
              {o || '— nenhuma —'}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      {rotulo}
      <input
        type={c.tipo === 'data' ? 'date' : c.tipo === 'hora' ? 'time' : 'text'}
        value={typeof valor === 'string' ? valor : ''}
        maxLength={c.tipo === 'texto' ? 160 : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={c.placeholder}
        className={estilo}
      />
    </div>
  );
};

/** Novo comunicado: conteúdo (com prévia da imagem) → destinatários → cria e gera os links. */
export const NovoComunicadoModal: React.FC<NovoComunicadoModalProps> = ({ colaboradores, clientes, criadoPor, onClose, onCriado }) => {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [publico, setPublico] = useState<PublicoComunicado>('colaboradores');
  const [categoria, setCategoria] = useState<string>('Aviso');
  // Sem texto livre: os pontos-chave de cada categoria viram o texto final pelo modelo de
  // redação (ver comunicadoModelos.ts). Para mudar o texto, muda-se os campos.
  const [valores, setValores] = useState<ValoresModelo>(() => valoresIniciais('Aviso', 'colaboradores'));
  const [assinatura, setAssinatura] = useState(ASSINATURAS[0]);
  const [modelo, setModelo] = useState<ModeloImagem>('aviso');
  const montado = useMemo(() => montarComunicado(categoria, publico, valores), [categoria, publico, valores]);
  const titulo = montado.titulo;
  const corpo = montado.corpo;
  const destaque = montado.destaque || '';
  const camposAtuais: CampoModelo[] = camposDe(categoria, publico);
  const definirValor = (chave: string, valor: ValoresModelo[string]) => setValores((prev) => ({ ...prev, [chave]: valor }));
  const trocarCategoria = (c: string, p: PublicoComunicado = publico) => {
    setCategoria(c);
    setModelo(MODELO_POR_CATEGORIA[c] || 'aviso');
    setValores(valoresIniciais(c, p));
  };
  const [exigeCiencia, setExigeCiencia] = useState(true);
  const [foto, setFoto] = useState<{ arquivo: File; url: string } | null>(null);
  const [previa, setPrevia] = useState<{ url: string; cortado: boolean } | null>(null);
  const [gerandoPrevia, setGerandoPrevia] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);


  // Prévia da imagem, atualizada pouco depois de parar de digitar.
  useEffect(() => {
    if (!titulo.trim()) {
      setPrevia(null);
      return;
    }
    const id = setTimeout(async () => {
      setGerandoPrevia(true);
      try {
        const { blob, textoCortado } = await gerarImagemComunicado({
          modelo,
          titulo,
          texto: montado.textoImagem,
          destaque,
          assinatura,
          fotoUrl: foto?.url,
        });

        setPrevia((anterior) => {
          if (anterior) URL.revokeObjectURL(anterior.url);
          return { url: URL.createObjectURL(blob), cortado: textoCortado };
        });
      } catch (err) {
        console.error(err);
      } finally {
        setGerandoPrevia(false);
      }
    }, 450);
    return () => clearTimeout(id);
  }, [modelo, titulo, montado.textoImagem, destaque, assinatura, foto]);

  const candidatos: Candidato[] = useMemo(() => {
    if (publico === 'colaboradores') {
      return colaboradores
        .filter((c) => c.status !== 'Inativo')
        .map((c) => ({
          chave: `col:${c.id}`,
          tipo: 'colaborador' as const,
          refId: c.id,
          nome: c.nomeCompleto,
          telefone: c.telefoneWhatsapp,
          email: c.email,
          grupo: c.setor || 'Sem setor',
          detalhe: c.funcaoCargo,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    }
    const lista: Candidato[] = [];
    clientes
      .filter((c) => c.status !== 'Inativo')
      .forEach((c) => {
        const empresa = c.nomeFantasia || c.razaoSocial;
        const contatos = (c.contatos || []).filter((k) => k.nome?.trim() && (k.email?.trim() || k.telefoneWhatsapp?.trim()));
        if (contatos.length === 0 && (c.emailPrincipal || c.telefonePrincipal)) {
          lista.push({
            chave: `cli:${c.id}:principal`,
            tipo: 'contato_cliente',
            refId: `${c.id}:principal`,
            nome: empresa,
            empresa,
            telefone: c.telefonePrincipal,
            email: c.emailPrincipal,
            grupo: empresa,
            detalhe: 'Contato principal',
          });
        }
        contatos.forEach((k) =>
          lista.push({
            chave: `cli:${c.id}:${k.id}`,
            tipo: 'contato_cliente',
            refId: `${c.id}:${k.id}`,
            nome: k.nome,
            empresa,
            telefone: k.telefoneWhatsapp,
            email: k.email,
            grupo: empresa,
            detalhe: k.cargoSetor,
          })
        );
      });
    return lista.sort((a, b) => a.grupo.localeCompare(b.grupo) || a.nome.localeCompare(b.nome));
  }, [publico, colaboradores, clientes]);

  const grupos: string[] = useMemo(() => Array.from(new Set(candidatos.map((c) => c.grupo))).sort((a, b) => a.localeCompare(b)), [candidatos]);
  const visiveis = candidatos.filter(
    (c) => (!filtroGrupo || c.grupo === filtroGrupo) && (!busca.trim() || `${c.nome} ${c.grupo}`.toLowerCase().includes(busca.trim().toLowerCase()))
  );
  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every((c) => selecionados.has(c.chave));

  const trocarPublico = (p: PublicoComunicado) => {
    setPublico(p);
    setSelecionados(new Set());
    setFiltroGrupo('');
    if (p === 'clientes') {
      trocarCategoria('Comercial', p);
      setAssinatura('Comercial');
    } else {
      trocarCategoria('Aviso', p);
      setAssinatura('Departamento Pessoal');
    }
  };

  const handleSalvar = async () => {
    const escolhidos = candidatos.filter((c) => selecionados.has(c.chave));
    if (escolhidos.length === 0) {
      setErro('Escolha pelo menos um destinatário.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      let fotoUrl: string | undefined;
      if (foto) fotoUrl = await enviarArquivoComunicado(foto.arquivo, foto.arquivo.name);
      const { comunicado, destinatarios } = await criarComunicado(
        {
          titulo: titulo.trim(),
          categoria,
          publico,
          corpo: corpo.trim(),
          assinatura,
          modeloImagem: modelo,
          destaque: destaque.trim() || undefined,
          fotoUrl,
          exigeCiencia,
          criadoPor,
        },
        escolhidos.map(({ tipo, refId, nome, empresa, telefone, email }) => ({ tipo, refId, nome, empresa, telefone, email }))
      );
      // Imagem final, já com o número do comunicado (é ela que aparece no link de cada pessoa).
      try {
        const { blob } = await gerarImagemComunicado({
          modelo,
          titulo: comunicado.titulo,
          texto: montado.textoImagem,
          destaque: comunicado.destaque,
          assinatura,
          numero: numeroFormatado(comunicado),
          fotoUrl,
        });
        comunicado.imagemUrl = await enviarArquivoComunicado(blob, `comunicado-${comunicado.numero}.png`);
        await atualizarImagemComunicado(comunicado.id, comunicado.imagemUrl);
      } catch (err) {
        console.error('Imagem do comunicado não foi salva:', err);
      }
      onCriado(comunicado, destinatarios);
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : 'Não foi possível criar o comunicado.');
      setSalvando(false);
    }
  };

  const campo = 'w-full p-2 border border-slate-300 rounded-lg text-xs';
  const rotulo = 'text-[11px] font-bold text-slate-600 block mb-1';
  const conteudoOk = montado.faltando.length === 0 && titulo.trim().length > 2;

  return (
    <div data-texto-livre="true" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[94vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">Novo comunicado</h2>
            <p className="text-[11px] text-slate-500">{etapa === 1 ? '1 de 2 — Conteúdo' : '2 de 2 — Destinatários'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {etapa === 1 ? (
          <div className="p-4 overflow-y-auto grid lg:grid-cols-[1fr_360px] gap-5 text-xs">
            <div className="space-y-3">
              <div className="flex gap-2">
                {(
                  [
                    ['colaboradores', 'Colaboradores', Users],
                    ['clientes', 'Clientes', Building2],
                  ] as [PublicoComunicado, string, typeof Users][]
                ).map(([id, nome, Icone]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => trocarPublico(id)}
                    className={`flex-1 py-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 ${publico === id ? 'bg-[#C48229] text-white border-[#C48229]' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    <Icone className="w-4 h-4" /> {nome}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={rotulo}>Categoria</label>
                  <select value={categoria} onChange={(e) => trocarCategoria(e.target.value)} className={campo}>
                    {categoriasPara(publico).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">{MODELOS_REDACAO[categoria]?.descricao}</p>
                </div>
                <div>
                  <label className={rotulo}>Assinado por</label>
                  <input list="assinaturas-comunicado" value={assinatura} onChange={(e) => setAssinatura(e.target.value)} className={campo} />
                  <datalist id="assinaturas-comunicado">
                    {ASSINATURAS.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide">Pontos-chave do comunicado</p>
                {camposAtuais.map((c) => (
                  <CampoDoModelo key={`${categoria}-${c.chave}`} campo={c} valor={valores[c.chave]} onChange={(v) => definirValor(c.chave, v)} />
                ))}
                <p className="text-[10px] text-slate-500">O texto final é redigido pelo sistema no padrão JMT. Para mudar o texto, ajuste os campos.</p>
              </div>
              <div>
                <span className={rotulo}>Texto que será enviado</span>
                {montado.faltando.length > 0 ? (
                  <p className="p-3 rounded-xl border border-dashed border-slate-300 text-slate-500">Preencha: {montado.faltando.join(', ')}.</p>
                ) : (
                  <div className="p-3 rounded-xl border border-slate-200 bg-white text-slate-700 leading-relaxed space-y-2 max-h-72 overflow-y-auto">
                    <p className="font-black text-slate-900">{titulo}</p>
                    {corpo.split(/\n\n/).map((paragrafo, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {paragrafo
                          .replace(/\{nome\}/g, publico === 'clientes' ? 'Maria' : 'João')
                          .split(/(\*[^*\n]+\*)/g)
                          .map((parte, k) => (/^\*[^*\n]+\*$/.test(parte) ? <strong key={k}>{parte.slice(1, -1)}</strong> : <React.Fragment key={k}>{parte}</React.Fragment>))}
                      </p>
                    ))}
                    <p className="text-[10px] text-slate-400">Exemplo com o nome "{publico === 'clientes' ? 'Maria' : 'João'}" — cada pessoa recebe com o próprio nome.</p>
                  </div>
                )}
              </div>
              <div>
                <span className={rotulo}>Modelo da imagem</span>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(MODELOS_IMAGEM) as ModeloImagem[]).map((m) => {
                    const t = MODELOS_IMAGEM[m];
                    const fundo = Array.isArray(t.fundo) ? `linear-gradient(135deg, ${t.fundo[0]}, ${t.fundo[1]})` : t.fundo;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModelo(m)}
                        title={t.descricao}
                        className={`rounded-xl border-2 p-2 text-left ${modelo === m ? 'border-[#C48229]' : 'border-slate-200'}`}
                      >
                        <span className="block h-8 rounded-md mb-1 border border-black/5" style={{ background: fundo }}>
                          <span className="inline-block m-1.5 px-1.5 rounded text-[8px] font-black" style={{ background: t.rotuloFundo, color: t.rotuloTexto }}>
                            {t.rotulo}
                          </span>
                        </span>
                        <span className="font-bold text-slate-700">{t.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5" /> {foto ? 'Trocar foto' : 'Foto (opcional)'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 8 * 1024 * 1024) {
                        setErro('A foto passa de 8MB. Use uma foto menor.');
                        return;
                      }
                      setFoto({ arquivo: f, url: URL.createObjectURL(f) });
                    }}
                  />
                </label>
                {foto && (
                  <button type="button" onClick={() => setFoto(null)} className="text-rose-600 font-semibold flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Tirar foto
                  </button>
                )}
              </div>
              <label className="flex items-start gap-2 font-semibold text-slate-700 p-3 bg-slate-50 rounded-xl">
                <input type="checkbox" checked={exigeCiencia} onChange={(e) => setExigeCiencia(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#C48229]" />
                <span>
                  Pedir confirmação de ciência
                  <span className="block font-normal text-slate-500">Cada pessoa recebe um link próprio; o sistema registra quem abriu e quem confirmou.</span>
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <span className={rotulo}>Prévia da imagem (WhatsApp)</span>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/5] flex items-center justify-center">
                {previa ? <img src={previa.url} alt="Prévia do comunicado" className="w-full h-full object-contain" /> : <ImageIcon className="w-10 h-10 text-slate-300" />}
                {gerandoPrevia && <Loader2 className="w-5 h-5 animate-spin text-[#C48229] absolute top-2 right-2" />}
              </div>
              {previa?.cortado && (
                <p className="text-[11px] text-[#92611F] flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> O texto não coube inteiro na imagem — ele vai completo no WhatsApp, no e-mail e no PDF. Para a imagem, deixe o texto mais curto.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 overflow-y-auto space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white font-semibold">
                <option value="">{publico === 'colaboradores' ? 'Todos os setores' : 'Todos os clientes'}</option>
                {grupos.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="flex-1 p-2 border border-slate-200 rounded-lg" />
              <button
                type="button"
                onClick={() =>
                  setSelecionados((prev) => {
                    const novo = new Set(prev);
                    visiveis.forEach((c) => (todosVisiveisMarcados ? novo.delete(c.chave) : novo.add(c.chave)));
                    return novo;
                  })
                }
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-[#92611F]"
              >
                {todosVisiveisMarcados ? 'Desmarcar os mostrados' : `Marcar os ${visiveis.length} mostrados`}
              </button>
            </div>
            <p className="font-semibold text-slate-700">{selecionados.size} selecionado(s)</p>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
              {visiveis.length === 0 && <p className="p-6 text-center text-slate-400">{publico === 'clientes' ? 'Nenhum contato de cliente com e-mail ou WhatsApp.' : 'Nenhum colaborador.'}</p>}
              {visiveis.map((c) => (
                <label key={c.chave} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selecionados.has(c.chave)}
                    onChange={() =>
                      setSelecionados((prev) => {
                        const novo = new Set(prev);
                        if (novo.has(c.chave)) novo.delete(c.chave);
                        else novo.add(c.chave);
                        return novo;
                      })
                    }
                    className="w-4 h-4 accent-[#C48229]"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-800">{c.nome}</span>
                    <span className="text-slate-400"> · {publico === 'clientes' ? c.empresa : c.grupo}{c.detalhe ? ` · ${c.detalhe}` : ''}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {c.telefone ? 'WhatsApp' : ''}
                    {c.telefone && c.email ? ' · ' : ''}
                    {c.email ? 'e-mail' : ''}
                    {!c.telefone && !c.email && <span className="text-rose-600">sem contato</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-rose-700 font-semibold">{erro}</span>
          <div className="flex gap-2 shrink-0">
            {etapa === 2 ? (
              <button type="button" onClick={() => setEtapa(1)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            ) : (
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancelar
              </button>
            )}
            {etapa === 1 ? (
              <button
                type="button"
                disabled={!conteudoOk}
                onClick={() => {
                  setErro(null);
                  setEtapa(2);
                }}
                className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Escolher destinatários
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSalvar}
                disabled={salvando || selecionados.size === 0}
                className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar comunicado ({selecionados.size})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
