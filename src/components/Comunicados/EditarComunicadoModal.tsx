import React, { useEffect, useState } from 'react';
import { X, Loader2, Save, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { Comunicado, DestinatarioComunicado, ModeloImagem, editarComunicado, enviarArquivoComunicado, numeroFormatado } from '../../utils/comunicadosApi';
import { ESTILOS_IMAGEM, MODELOS_IMAGEM, gerarImagemComunicado, textoParaImagem } from './comunicadoImagem';

const ASSINATURAS = ['Departamento Pessoal', 'Diretoria', 'Gestão de Qualidade', 'Comercial', 'Operações'];

/** Edita um comunicado já publicado: texto, título, destaque, assinatura, foto, modelo/estilo da
 *  imagem e se exige ciência. A imagem é refeita com o mesmo número e os links já enviados passam
 *  a mostrar a versão nova. */
export const EditarComunicadoModal: React.FC<{
  comunicado: Comunicado;
  destinatarios: DestinatarioComunicado[];
  onClose: () => void;
  onSalvo: (c: Comunicado) => void;
}> = ({ comunicado: c, destinatarios, onClose, onSalvo }) => {
  const [titulo, setTitulo] = useState(c.titulo);
  const [corpo, setCorpo] = useState(c.corpo);
  const [destaque, setDestaque] = useState(c.destaque || '');
  const [assinatura, setAssinatura] = useState(c.assinatura);
  const [modelo, setModelo] = useState<ModeloImagem>(c.modeloImagem);
  const [estilo, setEstilo] = useState(c.estiloImagem || 1);
  const [exigeCiencia, setExigeCiencia] = useState(c.exigeCiencia);
  const [foto, setFoto] = useState<{ arquivo?: File; url: string } | null>(c.fotoUrl ? { url: c.fotoUrl } : null);
  const [previa, setPrevia] = useState<{ url: string; cortado: boolean } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const jaCientes = destinatarios.filter((d) => d.cienteEm).length;
  const jaVisualizaram = destinatarios.filter((d) => d.visualizadoEm).length;

  useEffect(() => {
    if (!titulo.trim()) return;
    const id = setTimeout(async () => {
      try {
        const { blob, textoCortado } = await gerarImagemComunicado({
          modelo,
          estilo,
          titulo,
          texto: textoParaImagem(corpo),
          destaque,
          assinatura,
          numero: numeroFormatado(c),
          fotoUrl: foto?.url,
        });
        setPrevia((ant) => {
          if (ant) URL.revokeObjectURL(ant.url);
          return { url: URL.createObjectURL(blob), cortado: textoCortado };
        });
      } catch (err) {
        console.error(err);
      }
    }, 450);
    return () => clearTimeout(id);
  }, [modelo, estilo, titulo, corpo, destaque, assinatura, foto, c]);

  const salvar = async () => {
    if (!titulo.trim() || !corpo.trim()) return setErro('Preencha o título e o texto.');
    if (jaCientes > 0 && !window.confirm(`${jaCientes} pessoa(s) já deram ciência da versão anterior. A ciência delas continua registrada, mas elas leram o texto antigo. Salvar a alteração mesmo assim?`)) return;
    setSalvando(true);
    setErro(null);
    try {
      let fotoUrl = foto?.url;
      if (foto?.arquivo) fotoUrl = await enviarArquivoComunicado(foto.arquivo, foto.arquivo.name);
      const { blob } = await gerarImagemComunicado({
        modelo,
        estilo,
        titulo: titulo.trim(),
        texto: textoParaImagem(corpo),
        destaque: destaque.trim(),
        assinatura,
        numero: numeroFormatado(c),
        fotoUrl,
      });
      const imagemUrl = await enviarArquivoComunicado(blob, `comunicado-${c.numero}-editado.png`);
      const edicao = {
        titulo: titulo.trim(),
        corpo: corpo.trim(),
        assinatura,
        modeloImagem: modelo,
        estiloImagem: estilo,
        destaque: destaque.trim() || undefined,
        fotoUrl: fotoUrl || undefined,
        imagemUrl,
        exigeCiencia,
      };
      await editarComunicado(c.id, edicao);
      onSalvo({ ...c, ...edicao });
    } catch (err) {
      console.error(err);
      setErro('Não foi possível salvar a alteração. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full p-2 border border-slate-300 rounded-lg text-xs';
  const rotulo = 'text-[11px] font-bold text-slate-600 block mb-1';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4" data-texto-livre="true" data-no-uppercase="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[94vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-[#92611F]">Nº {numeroFormatado(c)} · editar comunicado publicado</p>
            <h2 className="text-base font-black text-slate-900">Editar comunicado</h2>
          </div>
          <button type="button" onClick={onClose} disabled={salvando} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid md:grid-cols-[1fr_280px] gap-5">
          <div className="space-y-3">
            {(jaVisualizaram > 0 || jaCientes > 0) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[#92611F] flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Os links já enviados passam a mostrar a versão nova. {jaVisualizaram} pessoa(s) já abriram
                  {jaCientes > 0 ? ` e ${jaCientes} já deram ciência da versão anterior` : ''}. Se a mudança for importante, reenvie o aviso pelo WhatsApp depois de salvar.
                </span>
              </div>
            )}
            <div>
              <span className={rotulo}>Título</span>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} />
            </div>
            <div>
              <span className={rotulo}>Texto (use {'{nome}'} para o nome de cada pessoa e *palavra* para negrito no WhatsApp)</span>
              <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={10} className={`${campo} leading-relaxed`} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <span className={rotulo}>Destaque (opcional — data, local, prazo)</span>
                <input value={destaque} onChange={(e) => setDestaque(e.target.value)} className={campo} />
              </div>
              <div>
                <span className={rotulo}>Assinatura</span>
                <select value={assinatura} onChange={(e) => setAssinatura(e.target.value)} className={campo}>
                  {Array.from(new Set([assinatura, ...ASSINATURAS])).map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input type="checkbox" checked={exigeCiencia} onChange={(e) => setExigeCiencia(e.target.checked)} />
              Pedir ciência (a pessoa confirma que leu)
            </label>
            <div>
              <span className={rotulo}>Modelo da imagem</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(Object.keys(MODELOS_IMAGEM) as ModeloImagem[]).map((m) => {
                  const t = MODELOS_IMAGEM[m];
                  const fundo = Array.isArray(t.fundo) ? `linear-gradient(135deg, ${t.fundo[0]}, ${t.fundo[1]})` : t.fundo;
                  return (
                    <button key={m} type="button" onClick={() => setModelo(m)} title={t.descricao} className={`rounded-xl border-2 p-1.5 text-left ${modelo === m ? 'border-[#C48229]' : 'border-slate-200'}`}>
                      <span className="block h-6 rounded-md mb-1 border border-black/5" style={{ background: fundo }} />
                      <span className="font-bold text-slate-700 text-[10px]">{t.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className={rotulo}>Estilo do layout</span>
              <div className="flex flex-wrap gap-1.5">
                {ESTILOS_IMAGEM.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEstilo(e.id)}
                    title={e.descricao}
                    className={`px-3 py-1.5 rounded-full border text-[11px] font-bold ${estilo === e.id ? 'bg-[#C48229] text-white border-[#C48229]' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {e.nome}
                  </button>
                ))}
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
                    e.target.value = '';
                    if (!f) return;
                    if (f.size > 8 * 1024 * 1024) return setErro('A foto passa de 8MB. Use uma foto menor.');
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
          </div>

          <div className="space-y-2">
            <span className={rotulo}>Prévia da imagem</span>
            {previa ? (
              <img src={previa.url} alt="Prévia" className="w-full rounded-xl border border-slate-200" />
            ) : (
              <div className="aspect-[4/5] rounded-xl bg-slate-100 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              </div>
            )}
            {previa?.cortado && <p className="text-[11px] text-[#92611F] font-semibold">O texto não coube inteiro na imagem — resuma um pouco (no link e no WhatsApp ele vai completo).</p>}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-rose-600 font-semibold">{erro}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={salvando} className="px-3 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50">
              Cancelar
            </button>
            <button type="button" onClick={salvar} disabled={salvando} className="px-4 py-2 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50">
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
