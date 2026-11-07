import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Calculator, X, Copy, Check, Delete, GripHorizontal } from 'lucide-react';

/**
 * Calculadora flutuante do financeiro (Controle Financeiro e Custos Extras): botão no canto,
 * janela arrastável, teclado do computador, vírgula como decimal, × e ÷ antes de + e −,
 * % como na calculadora de mão (200 + 10% = 220; 200 × 10% = 20) e histórico das últimas contas.
 */

type Op = '+' | '−' | '×' | '÷';
const OPS: Op[] = ['+', '−', '×', '÷'];
const ehOp = (t: string): t is Op => (OPS as string[]).includes(t);

const paraNumero = (t: string) => parseFloat(t.replace(/\./g, '').replace(',', '.')) || 0;
const formatar = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 10 }) : 'Erro';
/** Número para continuar a conta (sem separador de milhar, vírgula decimal). */
const paraToken = (n: number) => String(Math.round(n * 1e10) / 1e10).replace('.', ',');

/** Avalia [n, op, n, op, n...] com × e ÷ antes de + e −. */
function avaliar(tokens: string[]): number {
  const t = ehOp(tokens[tokens.length - 1] || '') ? tokens.slice(0, -1) : tokens;
  if (!t.length) return 0;
  const somas: number[] = [paraNumero(t[0])];
  const sinais: Op[] = [];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i] as Op;
    const n = paraNumero(t[i + 1] ?? '0');
    if (op === '×') somas[somas.length - 1] *= n;
    else if (op === '÷') somas[somas.length - 1] = n === 0 ? NaN : somas[somas.length - 1] / n;
    else {
      sinais.push(op);
      somas.push(n);
    }
  }
  return somas.reduce((acc, v, i) => (i === 0 ? v : sinais[i - 1] === '+' ? acc + v : acc - v), 0);
}

const CHAVE_POSICAO = 'jmt-calculadora-posicao';
const lerPosicao = (): { x: number; y: number } | null => {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE_POSICAO) || 'null');
    return p && typeof p.x === 'number' && typeof p.y === 'number' ? p : null;
  } catch {
    return null;
  }
};

interface EstadoConta {
  tokens: string[];
  /** Preenchido logo depois do "=" (a próxima tecla de número começa conta nova). */
  resultado: number | null;
  historico: { conta: string; valor: number }[];
}
type Acao =
  | { t: 'digito'; d: string }
  | { t: 'op'; op: Op }
  | { t: 'igual' }
  | { t: 'porcento' }
  | { t: 'apagar' }
  | { t: 'limpar' }
  | { t: 'sinal' }
  | { t: 'usar'; valor: number };
const ESTADO_INICIAL: EstadoConta = { tokens: ['0'], resultado: null, historico: [] };

function reduzir(s: EstadoConta, a: Acao): EstadoConta {
  const ts = s.tokens;
  const ult = ts[ts.length - 1];
  const com = (tokens: string[]): EstadoConta => ({ ...s, tokens, resultado: null });
  switch (a.t) {
    case 'digito': {
      const inicio = a.d === ',' ? '0,' : a.d;
      if (s.resultado !== null) return com([inicio]); // conta nova depois do "="
      if (ehOp(ult)) return com([...ts, inicio]);
      if (a.d === ',' && ult.includes(',')) return s;
      if (a.d !== ',' && ult.replace(/\D/g, '').length >= 15) return s;
      const novo = a.d !== ',' && (ult === '0' || ult === '-0') ? ult.replace('0', a.d) : ult + a.d;
      return com([...ts.slice(0, -1), novo]);
    }
    case 'op':
      if (s.resultado !== null) return com(Number.isFinite(s.resultado) ? [paraToken(s.resultado), a.op] : ['0', a.op]);
      return com(ehOp(ult) ? [...ts.slice(0, -1), a.op] : [...ts, a.op]);
    case 'igual': {
      if (ts.length < 3) return s;
      const valor = avaliar(ts);
      const conta = (ehOp(ult) ? ts.slice(0, -1) : ts).join(' ');
      return {
        tokens: Number.isFinite(valor) ? [paraToken(valor)] : ['0'],
        resultado: valor,
        historico: [{ conta, valor }, ...s.historico].slice(0, 6),
      };
    }
    case 'porcento': {
      if (ehOp(ult)) return s;
      const op = ts[ts.length - 2];
      // 200 + 10% → 200 + 20 (10% de 200); 200 × 10% → 200 × 0,1
      const base = op === '+' || op === '−' ? avaliar(ts.slice(0, -2)) : 1;
      return com([...ts.slice(0, -1), paraToken((base * paraNumero(ult)) / 100)]);
    }
    case 'apagar': {
      if (s.resultado !== null) return com(['0']);
      if (ehOp(ult)) return com(ts.slice(0, -1));
      const novo = ult.slice(0, -1);
      if (!novo || novo === '-') return com(ts.length > 1 ? ts.slice(0, -1) : ['0']);
      return com([...ts.slice(0, -1), novo]);
    }
    case 'limpar':
      return com(['0']);
    case 'sinal':
      if (ehOp(ult)) return s;
      return com([...ts.slice(0, -1), ult.startsWith('-') ? ult.slice(1) : `-${ult}`]);
    case 'usar':
      return com([paraToken(a.valor)]);
  }
}

const LARGURA = 264;

export const CalculadoraFlutuante: React.FC = () => {
  const [aberta, setAberta] = useState(false);
  const [conta, despachar] = useReducer(reduzir, ESTADO_INICIAL);
  const { tokens, resultado, historico } = conta;
  const [copiado, setCopiado] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => lerPosicao());
  const painelRef = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ dx: number; dy: number } | null>(null);
  const ultimaPos = useRef<{ x: number; y: number } | null>(null);

  const atual = tokens[tokens.length - 1];
  const digitar = useCallback((d: string) => despachar({ t: 'digito', d }), []);
  const operar = useCallback((op: Op) => despachar({ t: 'op', op }), []);
  const igual = useCallback(() => despachar({ t: 'igual' }), []);
  const porcentagem = useCallback(() => despachar({ t: 'porcento' }), []);
  const apagar = useCallback(() => despachar({ t: 'apagar' }), []);
  const limpar = useCallback(() => despachar({ t: 'limpar' }), []);
  const inverterSinal = useCallback(() => despachar({ t: 'sinal' }), []);

  const valorMostrado = resultado ?? (ehOp(atual) ? avaliar(tokens) : paraNumero(atual));

  const copiar = async () => {
    const texto = formatar(resultado ?? avaliar(tokens));
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sem permissão de área de transferência: ignora */
    }
  };

  // Teclado do computador — só quando o foco não está num campo da tela (para não atrapalhar a digitação).
  useEffect(() => {
    if (!aberta) return;
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const emCampo = alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) && !painelRef.current?.contains(alvo);
      if (emCampo || alvo?.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      let tratou = true;
      if (/^\d$/.test(k)) digitar(k);
      else if (k === ',' || k === '.') digitar(',');
      else if (k === '+') operar('+');
      else if (k === '-') operar('−');
      else if (k === '*' || k === 'x' || k === 'X') operar('×');
      else if (k === '/') operar('÷');
      else if (k === '%') porcentagem();
      else if (k === 'Enter' || k === '=') igual();
      else if (k === 'Backspace') apagar();
      else if (k === 'Delete' || k === 'c' || k === 'C') limpar();
      else if (k === 'Escape') setAberta(false);
      else tratou = false;
      if (tratou) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberta, digitar, operar, porcentagem, igual, apagar, limpar]);

  // Mantém a janela dentro da tela (ex.: depois de mudar o tamanho do navegador).
  const dentroDaTela = (x: number, y: number) => {
    const altura = painelRef.current?.offsetHeight || 420;
    return {
      x: Math.min(Math.max(8, x), window.innerWidth - LARGURA - 8),
      y: Math.min(Math.max(8, y), window.innerHeight - altura - 8),
    };
  };

  const iniciarArraste = (e: React.PointerEvent) => {
    const r = painelRef.current?.getBoundingClientRect();
    if (!r) return;
    arraste.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const mover = (e: React.PointerEvent) => {
    if (!arraste.current) return;
    ultimaPos.current = dentroDaTela(e.clientX - arraste.current.dx, e.clientY - arraste.current.dy);
    setPos(ultimaPos.current);
  };
  const soltar = () => {
    if (!arraste.current) return;
    arraste.current = null;
    try {
      if (ultimaPos.current) localStorage.setItem(CHAVE_POSICAO, JSON.stringify(ultimaPos.current));
    } catch {
      /* sem armazenamento: só não lembra a posição */
    }
  };

  useEffect(() => {
    if (!aberta) return;
    // Primeira vez: acima do botão; depois, onde foi deixada — sempre dentro da tela.
    const altura = painelRef.current?.offsetHeight || 420;
    setPos((p) => (p ? dentroDaTela(p.x, p.y) : dentroDaTela(window.innerWidth - LARGURA - 20, window.innerHeight - altura - 152)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta]);

  if (!aberta) {
    return (
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="fixed bottom-[9.5rem] right-5 z-[60] w-12 h-12 rounded-full bg-white hover:bg-slate-50 text-[#92611F] border border-slate-200 shadow-xl flex items-center justify-center transition-all hover:scale-105"
        title="Calculadora"
        aria-label="Abrir calculadora"
      >
        <Calculator className="w-5 h-5" />
      </button>
    );
  }

  const tecla = 'h-11 rounded-xl text-sm font-bold transition-colors active:scale-95 select-none';
  const num = `${tecla} bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200`;
  const opCls = (op: Op) =>
    `${tecla} border ${ehOp(atual) && atual === op && resultado === null ? 'bg-[#C48229] text-white border-[#C48229]' : 'bg-amber-50 hover:bg-amber-100 text-[#92611F] border-amber-200'}`;
  const fn = `${tecla} bg-white hover:bg-slate-50 text-slate-600 border border-slate-200`;

  return (
    <div
      ref={painelRef}
      data-texto-livre="true"
      className={`fixed z-[60] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden ${pos ? '' : 'bottom-[9.5rem] right-5'}`}
      style={{ width: LARGURA, maxHeight: 'calc(100vh - 16px)', overflowY: 'auto', ...(pos ? { left: pos.x, top: pos.y } : {}) }}
      role="dialog"
      aria-label="Calculadora"
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 cursor-move touch-none select-none"
        onPointerDown={iniciarArraste}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        title="Arraste para mudar de lugar"
      >
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Calculator className="w-3.5 h-3.5 text-[#C48229]" /> Calculadora
          <GripHorizontal className="w-3.5 h-3.5 text-slate-300" />
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setAberta(false)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Fechar calculadora"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="rounded-xl bg-slate-900 text-white px-3 py-2.5 text-right">
          <div className="text-[11px] text-slate-400 min-h-[16px] truncate" title={tokens.join(' ')}>
            {resultado !== null ? `${historico[0]?.conta ?? ''} =` : tokens.length > 1 ? tokens.join(' ') : ' '}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={copiar}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
              title="Copiar o resultado"
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-2xl font-bold tabular-nums truncate">
              {ehOp(atual) || resultado !== null ? formatar(valorMostrado) : atual.replace(/^(-?)(\d+)/, (_, s, i) => s + Number(i).toLocaleString('pt-BR'))}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 p-3">
        <button type="button" className={fn} onClick={limpar} title="Limpar (C / Delete)">C</button>
        <button type="button" className={fn} onClick={apagar} title="Apagar (Backspace)" aria-label="Apagar"><Delete className="w-4 h-4 mx-auto" /></button>
        <button type="button" className={fn} onClick={porcentagem} title="Porcentagem: 200 + 10% = 220">%</button>
        <button type="button" className={opCls('÷')} onClick={() => operar('÷')}>÷</button>
        {['7', '8', '9'].map((d) => <button key={d} type="button" className={num} onClick={() => digitar(d)}>{d}</button>)}
        <button type="button" className={opCls('×')} onClick={() => operar('×')}>×</button>
        {['4', '5', '6'].map((d) => <button key={d} type="button" className={num} onClick={() => digitar(d)}>{d}</button>)}
        <button type="button" className={opCls('−')} onClick={() => operar('−')}>−</button>
        {['1', '2', '3'].map((d) => <button key={d} type="button" className={num} onClick={() => digitar(d)}>{d}</button>)}
        <button type="button" className={opCls('+')} onClick={() => operar('+')}>+</button>
        <button type="button" className={fn} onClick={inverterSinal} title="Trocar o sinal">±</button>
        <button type="button" className={num} onClick={() => digitar('0')}>0</button>
        <button type="button" className={num} onClick={() => digitar(',')}>,</button>
        <button type="button" className={`${tecla} bg-[#C48229] hover:bg-[#92611F] text-white`} onClick={igual} title="Resultado (Enter)">=</button>
      </div>

      {historico.length > 0 && (
        <div className="border-t border-slate-100 px-3 py-2 max-h-28 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Últimas contas</p>
          {historico.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => despachar({ t: 'usar', valor: h.valor })}
              className="w-full flex items-center justify-between gap-2 py-0.5 text-[11px] text-slate-500 hover:text-[#92611F]"
              title="Usar este resultado"
            >
              <span className="truncate">{h.conta}</span>
              <span className="font-bold text-slate-700 tabular-nums shrink-0">{formatar(h.valor)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
