import { useCallback, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from 'react';

/**
 * Lightweight, dependency-free bot protection for public-facing forms
 * (occurrence portal, admission portal). These forms are reachable via
 * shareable links (?form=..., #ocorrencia, #admissao) without login, so
 * they're exposed to generic internet scraping/spam bots.
 *
 * Two layers, combined:
 *  1. Honeypot field — invisible to real users, but generic bots that
 *     auto-fill every input on a page will populate it.
 *  2. Time trap — a submission that arrives faster than a human could
 *     plausibly have read and filled the form is treated as automated.
 *
 * This is not a substitute for server-side validation (there is no
 * backend here — data is stored client-side), but it filters out the
 * overwhelming majority of unsophisticated spam/scraper bots without
 * requiring any external service, API key, or account setup.
 */

/** Minimum time (ms) a human plausibly needs before submitting. */
export const MIN_HUMAN_FILL_TIME_MS = 2500;

/** Field name chosen to look plausible to a bot's heuristics. */
const HONEYPOT_FIELD_NAME = 'confirmar_telefone_contato';

const HONEYPOT_HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: 'auto',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  opacity: 0,
  pointerEvents: 'none',
};

export interface BotGuard {
  /** Spread onto a plain <input> rendered anywhere inside the form. */
  honeypotFieldProps: {
    id: string;
    name: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    tabIndex: number;
    autoComplete: string;
  };
  /** Spread onto the wrapping element so the field stays invisible/unreachable to real users. */
  honeypotWrapperProps: {
    style: CSSProperties;
    'aria-hidden': boolean;
  };
  honeypotFieldId: string;
  /** Call inside handleSubmit. Returns true when the submission looks automated. */
  isLikelyBot: () => boolean;
  /** Restart the fill timer — e.g. when a multi-step wizard reaches its final step. */
  resetTimer: () => void;
}

export function useBotGuard(minFillTimeMs: number = MIN_HUMAN_FILL_TIME_MS): BotGuard {
  const [honeypot, setHoneypot] = useState('');
  const startedAtRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    startedAtRef.current = Date.now();
  }, []);

  const isLikelyBot = useCallback((): boolean => {
    if (honeypot.trim() !== '') return true;
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed < minFillTimeMs) return true;
    return false;
  }, [honeypot, minFillTimeMs]);

  const honeypotFieldProps = useMemo(
    () => ({
      id: HONEYPOT_FIELD_NAME,
      name: HONEYPOT_FIELD_NAME,
      value: honeypot,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setHoneypot(e.target.value),
      tabIndex: -1,
      autoComplete: 'off',
    }),
    [honeypot]
  );

  const honeypotWrapperProps = useMemo(
    () => ({
      style: HONEYPOT_HIDDEN_STYLE,
      'aria-hidden': true as const,
    }),
    []
  );

  return { honeypotFieldProps, honeypotWrapperProps, honeypotFieldId: HONEYPOT_FIELD_NAME, isLikelyBot, resetTimer };
}
