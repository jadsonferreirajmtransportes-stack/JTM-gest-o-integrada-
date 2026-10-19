// ============================================================================
// Áudio no chat: gravar pelo microfone (MediaRecorder) e tocar na mensagem.
// O áudio vai pro Storage (bucket "anexos", ver arquivosStorage.ts) e a mensagem
// guarda só a referência "storage:..." — não pesa no banco nem no Egress das
// listas; o arquivo só é baixado quando alguém dá play.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';
import type { MensagemChat } from '../../types';
import { getAnexoMensagem } from '../../utils/chatApi';
import { obterUrlArquivo } from '../../utils/arquivosStorage';

export const DURACAO_MAXIMA_AUDIO_SEG = 180;

const formatarDuracao = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}`;

function tipoSuportado(): string {
  const opcoes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined') return '';
  return opcoes.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
}

/** Botão de microfone: clica pra gravar, clica de novo pra parar; depois escuta/descarta/envia. */
export const GravadorAudio: React.FC<{
  onEnviar: (arquivo: File, duracaoSeg: number) => Promise<void>;
  compacto?: boolean;
  desabilitado?: boolean;
  /** Avisa quando está gravando/ouvindo — a tela esconde a caixa de texto nesse tempo. */
  onAtivo?: (ativo: boolean) => void;
}> = ({ onEnviar, compacto, desabilitado, onAtivo }) => {
  const [estado, setEstado] = useState<'parado' | 'gravando' | 'pronto' | 'enviando'>('parado');
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [gravado, setGravado] = useState<{ arquivo: File; url: string; duracao: number } | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const inicio = useRef(0);
  const timer = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => onAtivo?.(estado !== 'parado'), [estado, onAtivo]);

  const limparTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };
  const soltarMicrofone = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  useEffect(
    () => () => {
      limparTimer();
      soltarMicrofone();
      if (gravado) URL.revokeObjectURL(gravado.url);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const comecar = async () => {
    setErro(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErro('Este navegador não grava áudio.');
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErro('Permita o uso do microfone no navegador para gravar.');
      return;
    }
    const tipo = tipoSuportado();
    const rec = new MediaRecorder(stream.current, tipo ? { mimeType: tipo } : undefined);
    pedacos.current = [];
    rec.ondataavailable = (e) => e.data.size && pedacos.current.push(e.data);
    rec.onstop = () => {
      soltarMicrofone();
      limparTimer();
      const duracao = Math.max(1, Math.round((Date.now() - inicio.current) / 1000));
      const mime = (rec.mimeType || tipo || 'audio/webm').split(';')[0];
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(pedacos.current, { type: mime });
      const arquivo = new File([blob], `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`, { type: mime });
      setGravado({ arquivo, url: URL.createObjectURL(blob), duracao });
      setEstado('pronto');
    };
    gravador.current = rec;
    rec.start();
    inicio.current = Date.now();
    setSegundos(0);
    setEstado('gravando');
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - inicio.current) / 1000);
      setSegundos(s);
      if (s >= DURACAO_MAXIMA_AUDIO_SEG) rec.state === 'recording' && rec.stop();
    }, 250);
  };

  const parar = () => gravador.current?.state === 'recording' && gravador.current.stop();

  const descartar = () => {
    if (gravador.current?.state === 'recording') {
      gravador.current.onstop = () => {
        soltarMicrofone();
        limparTimer();
      };
      gravador.current.stop();
    }
    if (gravado) URL.revokeObjectURL(gravado.url);
    setGravado(null);
    setEstado('parado');
  };

  const enviar = async () => {
    if (!gravado) return;
    setEstado('enviando');
    try {
      await onEnviar(gravado.arquivo, gravado.duracao);
      URL.revokeObjectURL(gravado.url);
      setGravado(null);
      setEstado('parado');
    } catch (err) {
      console.error(err);
      setErro('Não foi possível enviar o áudio. Tente de novo.');
      setEstado('pronto');
    }
  };

  const tam = compacto ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const pad = compacto ? 'p-1.5' : 'p-2.5';

  if (estado === 'parado')
    return (
      <span className="relative shrink-0">
        <button
          type="button"
          onClick={comecar}
          disabled={desabilitado}
          className={`${pad} text-slate-400 hover:text-[#C48229] hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40`}
          title="Gravar áudio"
        >
          <Mic className={tam} />
        </button>
        {erro && <span className="absolute bottom-full right-0 mb-1 w-48 text-[10px] text-rose-600 bg-white border border-rose-200 rounded-lg px-2 py-1 shadow-sm">{erro}</span>}
      </span>
    );

  return (
    <div className="flex-1 flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-2 py-1.5 min-w-0">
      <button type="button" onClick={descartar} disabled={estado === 'enviando'} className="p-1.5 text-slate-500 hover:text-rose-600 shrink-0" title="Descartar">
        <Trash2 className={tam} />
      </button>
      {estado === 'gravando' ? (
        <>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-rose-700 tabular-nums flex-1">
            Gravando {formatarDuracao(segundos)} <span className="font-normal text-rose-500">/ {formatarDuracao(DURACAO_MAXIMA_AUDIO_SEG)}</span>
          </span>
          <button type="button" onClick={parar} className="p-1.5 bg-rose-600 text-white rounded-lg shrink-0" title="Parar">
            <Square className={tam} />
          </button>
        </>
      ) : (
        <>
          {gravado && <audio src={gravado.url} controls className="h-8 flex-1 min-w-0" />}
          <button
            type="button"
            onClick={enviar}
            disabled={estado === 'enviando'}
            className="p-1.5 bg-[#C48229] hover:bg-[#92611F] text-white rounded-lg shrink-0 disabled:opacity-60"
            title="Enviar áudio"
          >
            {estado === 'enviando' ? <Loader2 className={`${tam} animate-spin`} /> : <Send className={tam} />}
          </button>
        </>
      )}
    </div>
  );
};

/** Player do áudio na mensagem — busca o link só quando a mensagem aparece; o arquivo só baixa no play. */
export const AudioDaMensagem: React.FC<{ mensagem: MensagemChat; propria: boolean }> = ({ mensagem, propria }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const ref = mensagem.anexoUrl || (await getAnexoMensagem(mensagem.id));
        if (!ref) throw new Error('sem áudio');
        const url = await obterUrlArquivo(ref);
        if (!cancelado) setSrc(url);
      } catch (err) {
        console.error(err);
        if (!cancelado) setFalhou(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [mensagem.id, mensagem.anexoUrl]);

  if (falhou) return <p className={`text-[11px] italic ${propria ? 'text-white/80' : 'text-slate-500'}`}>Áudio indisponível</p>;
  if (!src)
    return (
      <p className={`text-[11px] flex items-center gap-1 ${propria ? 'text-white/80' : 'text-slate-500'}`}>
        <Loader2 className="w-3 h-3 animate-spin" /> Carregando áudio...
      </p>
    );
  return <audio src={src} controls preload="none" className="h-9 w-56 max-w-full mb-1" />;
};

export const nomeAudio = (duracaoSeg: number) => `Áudio (${formatarDuracao(duracaoSeg)})`;
