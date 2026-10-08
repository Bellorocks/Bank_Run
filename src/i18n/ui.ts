/**
 * Testi dell'interfaccia (menu, pulsanti, messaggi del grader, scorciatoie).
 *
 * `t(chiave, parametri)` legge `src/locales/<lingua>/ui.json` nella lingua
 * corrente; `useLanguage()` fa ridisegnare un componente quando la lingua cambia.
 */

import { useSyncExternalStore } from 'react';
import { getLanguage, subscribeLanguage, type Language } from './language';
import { interpolate } from './content';
import en from '../locales/en/ui.json';
import it from '../locales/it/ui.json';

const dicts: Record<Language, Record<string, string>> = { en, it };

export function tr(key: string, params?: Readonly<Record<string, unknown>>): string {
  const text = dicts[getLanguage()][key] ?? dicts.it[key];
  if (text === undefined) return key;
  return params ? interpolate(text, params) : text;
}

/** Lingua corrente, osservata: il componente si ridisegna quando cambia. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

export function uiKeys(lang: Language): string[] {
  return Object.keys(dicts[lang]);
}
