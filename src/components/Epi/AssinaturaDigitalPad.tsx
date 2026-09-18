import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

interface AssinaturaDigitalPadProps {
  /** Chamado com a assinatura como data URL PNG a cada traço, ou null quando limpa. */
  onChange: (dataUrl: string | null) => void;
}

/** Campo de assinatura desenhada na tela (mouse ou dedo) — usado no Formulário Público de
 *  Entrega de EPI pra dispensar assinar no papel depois. Sem biblioteca externa: só um
 *  <canvas> com os eventos de pointer (funciona igual pra mouse e touch). */
export const AssinaturaDigitalPad: React.FC<AssinaturaDigitalPadProps> = ({ onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhandoRef = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Resolução real do canvas maior que o tamanho exibido (devicePixelRatio) — sem isso a
    // assinatura sai borrada/pixelada em telas de alta densidade (a maioria dos celulares).
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111111';
    }
  }, []);

  const posicao = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    desenhandoRef.current = true;
    const { x, y } = posicao(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhandoRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = posicao(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!temTraco) setTemTraco(true);
  };

  const handlePointerUp = () => {
    if (!desenhandoRef.current) return;
    desenhandoRef.current = false;
    if (canvasRef.current) onChange(canvasRef.current.toDataURL('image/png'));
  };

  const handleLimpar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-semibold text-slate-700 flex items-center gap-1.5">
          <PenLine className="w-3.5 h-3.5 text-slate-400" />
          Assinatura do Recebedor
        </label>
        {temTraco && (
          <button
            type="button"
            onClick={handleLimpar}
            className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1"
          >
            <Eraser className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
        className="w-full h-36 bg-white border-2 border-dashed border-slate-300 rounded-lg cursor-crosshair"
      />
      <p className="text-[10px] text-slate-400 mt-1">Desenhe a assinatura com o dedo ou o mouse na área acima.</p>
    </div>
  );
};
