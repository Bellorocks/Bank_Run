/**
 * Testi dei livelli (brief, task, hint, etichette del foglio) per lingua.
 *
 * I template non contengono testo: chiamano `tx(chiave, parametri)` mentre
 * generano l'istanza, e il testo arriva da `src/locales/<lingua>/content/*.json`.
 * La lingua e' quella dell'interfaccia, salvo che chi genera l'istanza ne fissi
 * un'altra con `withContentLanguage` (i test, per esempio).
 */

import { getLanguage, type Language } from './language';

type Dict = Record<string, string>;

const files = import.meta.glob<{ default: Dict }>('../locales/*/content/*.json', { eager: true });

const dicts: Record<Language, Dict> = { en: {}, it: {} };
for (const [file, mod] of Object.entries(files)) {
  const lang = /locales\/(en|it)\//.exec(file)?.[1] as Language | undefined;
  if (lang) Object.assign(dicts[lang], mod.default);
}

let override: Language | null = null;

/** Lingua in cui si stanno generando i testi dei livelli. */
export function contentLanguage(): Language {
  return override ?? getLanguage();
}

/** Esegue `fn` generando i testi in `lang`, qualunque sia la lingua dell'interfaccia. */
export function withContentLanguage<T>(lang: Language, fn: () => T): T {
  const prev = override;
  override = lang;
  try {
    return fn();
  } finally {
    override = prev;
  }
}

/** Sostituisce `{nome}` con i parametri; i segnaposto senza parametro restano come sono. */
export function interpolate(text: string, params: Readonly<Record<string, unknown>>): string {
  return text.replace(/\{([A-Za-z_$][\w$]*)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m,
  );
}

/** Testo di un livello nella lingua corrente (ripiega sull'italiano, poi sulla chiave). */
export function tx(key: string, params?: Readonly<Record<string, unknown>>): string {
  const text = dicts[contentLanguage()][key] ?? dicts.it[key];
  if (text === undefined) return key;
  return params ? interpolate(text, params) : text;
}

/** Per i test e gli strumenti di verifica. */
export function contentKeys(lang: Language): string[] {
  return Object.keys(dicts[lang]);
}

export function contentText(lang: Language, key: string): string | undefined {
  return dicts[lang][key];
}

/** Nome di un settore (rng/finance) nella lingua dei testi. */
/** Nome del mese `n` (1-12) nella lingua dei contenuti; `capitalize` per le etichette di colonna. */
export function monthName(n: number, capitalize = false): string {
  const name = tx(`common.nomeMese.${n}`);
  return capitalize ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

export function sectorName(sector: string): string {
  return tx(`common.settore.${sector}`);
}

/** Locale per i numeri scritti dentro i testi dei livelli. */
export function contentNumberLocale(): 'it-IT' | 'en-US' {
  return contentLanguage() === 'it' ? 'it-IT' : 'en-US';
}
