/**
 * Lingua dell'interfaccia: una sola fonte di verita', osservabile.
 *
 * Ordine di scelta: la preferenza salvata dall'utente, poi la lingua del
 * browser/sistema, poi l'inglese come default.
 */

import type { NumberLocale } from '../engine/typedInput';

export type Language = 'en' | 'it';

export const LANGUAGES: readonly Language[] = ['en', 'it'];

const STORAGE_KEY = 'dd_lang';

function storedLanguage(): Language | null {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return v === 'en' || v === 'it' ? v : null;
  } catch {
    return null;
  }
}

export function detectLanguage(): Language {
  const stored = storedLanguage();
  if (stored) return stored;
  const nav = typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language : undefined;
  if (nav && nav.toLowerCase().startsWith('it')) return 'it';
  return 'en';
}

let current: Language = detectLanguage();
const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // archiviazione non disponibile: la scelta vale per la sessione
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  for (const l of listeners) l(lang);
}

export function subscribeLanguage(fn: (lang: Language) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Convenzione numerica con cui si interpreta cio' che l'utente digita. */
export function numberLocale(lang: Language = current): NumberLocale {
  return lang;
}

/** Locale per la resa dei numeri a schermo. */
export function displayLocale(lang: Language = current): 'it-IT' | 'en-US' {
  return lang === 'it' ? 'it-IT' : 'en-US';
}
