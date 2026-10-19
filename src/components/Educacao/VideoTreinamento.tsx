import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, HelpCircle } from 'lucide-react';

// Vídeos de treinamento entram só por LINK (YouTube, Vimeo, Google Drive): o arquivo fica
// hospedado lá e não gasta a franquia de transferência do Supabase a cada vez que alguém assiste.

/** Link de vídeo → endereço de incorporação (YouTube, Vimeo, Google Drive). */
export function urlIncorporavel(url: string): { tipo: 'iframe' | 'video' | 'link'; src: string; origem?: string } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { tipo: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`, origem: 'YouTube' };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { tipo: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}`, origem: 'Vimeo' };
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?(?:.*&)?id=)([\w-]+)/i);
  if (drive) return { tipo: 'iframe', src: `https://drive.google.com/file/d/${drive[1]}/preview`, origem: 'Google Drive' };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { tipo: 'video', src: url, origem: 'arquivo de vídeo' };
  return { tipo: 'link', src: url };
}

/** Player do vídeo (incorporado quando o link é reconhecido; senão, botão para abrir). */
export const VideoTreinamento: React.FC<{ url: string }> = ({ url }) => {
  const v = urlIncorporavel(url);
  if (v.tipo === 'iframe') {
    return (
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={v.src}
          title="Vídeo do treinamento"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (v.tipo === 'video') return <video src={v.src} controls className="w-full rounded-xl bg-black" />;
  return (
    <a href={v.src} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#92611F] flex items-center gap-1">
      <ExternalLink className="w-3.5 h-3.5" /> Abrir o vídeo
    </a>
  );
};

/** Campo do editor: link + conferência + pré-visualização + passo a passo. */
export const CampoVideoTreinamento: React.FC<{ url: string; onChange: (url: string) => void; classeCampo: string }> = ({
  url,
  onChange,
  classeCampo,
}) => {
  const [ajuda, setAjuda] = useState(!url);
  const v = url ? urlIncorporavel(url) : null;
  return (
    <div className="space-y-2">
      <input
        value={url}
        onChange={(e) => onChange(e.target.value.trim())}
        className={classeCampo}
        placeholder="Cole aqui o link do YouTube, Vimeo ou Google Drive"
        data-no-uppercase
      />
      {v && v.tipo !== 'link' && (
        <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Vídeo do {v.origem} reconhecido — confira abaixo se ele toca.
        </p>
      )}
      {v && v.tipo === 'link' && (
        <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Link não reconhecido: o colaborador verá só um botão "Abrir o vídeo". Prefira um link do YouTube, Vimeo ou Google Drive.
        </p>
      )}
      {v && v.tipo !== 'link' && (
        <div className="max-w-sm">
          <VideoTreinamento url={url} />
        </div>
      )}
      {v?.origem === 'Google Drive' && (
        <p className="text-[11px] text-slate-500">
          No Drive, o vídeo precisa estar compartilhado como <b>"Qualquer pessoa com o link"</b> — senão o colaborador vê "Acesso negado".
        </p>
      )}
      <button
        type="button"
        onClick={() => setAjuda((a) => !a)}
        className="text-[11px] font-semibold text-[#92611F] flex items-center gap-1 normal-case tracking-normal"
      >
        <HelpCircle className="w-3.5 h-3.5" /> Como colocar um vídeo do computador ou do celular
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ajuda ? 'rotate-180' : ''}`} />
      </button>
      {ajuda && (
        <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-slate-600" data-texto-livre>
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1">
            <p className="font-bold text-slate-800">YouTube (recomendado)</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Entre em youtube.com (ou no app) com a conta da empresa e toque em <b>Criar → Enviar vídeo</b>.</li>
              <li>Em <b>Visibilidade</b>, escolha <b>Não listado</b>: só quem tem o link assiste, o vídeo não aparece em buscas.</li>
              <li>Depois de enviado, toque em <b>Compartilhar → Copiar link</b> e cole aqui.</li>
            </ol>
          </div>
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1">
            <p className="font-bold text-slate-800">Google Drive</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Envie o vídeo para o Drive da empresa.</li>
              <li>Clique com o botão direito (ou nos três pontinhos) → <b>Compartilhar</b> → em Acesso geral, <b>Qualquer pessoa com o link</b>.</li>
              <li><b>Copiar link</b> e cole aqui. Vídeo recém-enviado pode levar alguns minutos para tocar.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
