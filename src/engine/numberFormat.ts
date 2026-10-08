/**
 * Formati numerici in sintassi Excel.
 *
 * Il modulo serve due padroni, e la differenza va tenuta a mente leggendo il codice:
 *  - la GRIGLIA, che deve disegnare la cella esattamente come farebbe Excel;
 *  - il GRADER, che sul check `numberFormat` deve poter ispezionare la struttura di
 *    un formato e confrontarlo con quello atteso senza cadere su differenze
 *    puramente ortografiche (`"€"` contro `\€`, `GG/MM/AAAA` contro `gg/mm/aaaa`).
 *
 * Due livelli da non confondere mai:
 *  - il FORMATO e' scritto in sintassi Excel, che e' anglosassone e immutabile:
 *    il punto e' sempre il decimale, la virgola sempre il raggruppamento;
 *  - l'OUTPUT e' localizzato: in it-IT la virgola e' il decimale e il punto il
 *    raggruppamento. La traduzione avviene solo in fase di rendering.
 *
 * Modulo PURO: nessun DOM, nessun HyperFormula, nessuna dipendenza.
 */

// ---------------------------------------------------------------------------
// Tipi pubblici
// ---------------------------------------------------------------------------

/**
 * Le uniche localizzazioni previste. `it-IT` e' quella del gioco; `en-US` esiste
 * per rendere evidente nei test che il formato non cambia, cambia solo l'output.
 */
export type FormatLocale = 'it-IT' | 'en-US';

export interface FormatOptions {
  locale?: FormatLocale;
}

/**
 * Risultato del rendering di una cella.
 *
 * `align` NON viene dal formato ma dal TIPO del valore: e' l'allineamento
 * predefinito di Excel (numeri a destra, testo a sinistra, booleani ed errori al
 * centro), quello che lo spec §5 insegna come indizio visivo per capire se una
 * data e' stata riconosciuta come tale o e' rimasta testo.
 */
export interface FormattedCell {
  text: string;
  color?: string;
  align: 'left' | 'right' | 'center';
}

export type FormatTokenKind =
  /** Segnaposto di cifra: `0` obbligatoria, `#` opzionale, `?` spazio di riempimento. */
  | 'digit'
  | 'decimalPoint'
  /** La virgola: raggruppamento se sta fra cifre, scala se sta dopo l'ultima. */
  | 'groupSep'
  | 'percent'
  | 'literal'
  /** `@`, il segnaposto del testo. */
  | 'textPlaceholder'
  /** Un codice data/ora, gia' minuscolo (`gg`, `mm`, `aaaa`, `hh`...). */
  | 'date'
  /** `General` / `Generale` / `Standard`. */
  | 'general'
  /** `_x`: larghezza di un carattere, resa con uno spazio. */
  | 'skip';

export interface FormatToken {
  readonly kind: FormatTokenKind;
  readonly text: string;
}

export type SectionKind = 'general' | 'number' | 'date' | 'text' | 'literal';

/**
 * Struttura numerica di una sezione. E' quello che il grader guarda quando deve
 * dire *perche'* un formato non va bene (mancano i decimali, manca il
 * raggruppamento, manca la scala in migliaia).
 */
export interface NumericSpec {
  /** Segnaposto della parte intera, nell'ordine: es. `#,##0` -> `['#','#','#','0']`. */
  readonly intPlaceholders: readonly string[];
  readonly decPlaceholders: readonly string[];
  /** Cifre intere sempre stampate (i soli `0`). */
  readonly minIntDigits: number;
  /** Decimali sempre stampati (fino all'ultimo `0`). */
  readonly minDecimals: number;
  /** Decimali massimi: e' la precisione a cui si arrotonda. */
  readonly maxDecimals: number;
  readonly grouping: boolean;
  /** Virgole finali: 1 = migliaia, 2 = milioni. */
  readonly scaleCommas: number;
  /** Numero di `%`: ognuno moltiplica per 100. */
  readonly percentCount: number;
}

export interface ParsedSection {
  readonly source: string;
  readonly tokens: readonly FormatToken[];
  readonly kind: SectionKind;
  /** Colore da `[Red]`/`[Rosso]`/`[Color3]`, risolto in esadecimale. */
  readonly color?: string;
  /** Contenuto delle parentesi quadre non riconosciuto come colore (condizioni, locale). */
  readonly conditions: readonly string[];
  readonly numeric: NumericSpec | null;
}

export interface ParsedFormat {
  readonly source: string;
  /** Le sezioni come sono scritte, da 1 a 4. */
  readonly sections: readonly ParsedSection[];
  /** Sezioni risolte secondo le regole di ereditarieta' di Excel. */
  readonly positive: ParsedSection;
  readonly negative: ParsedSection;
  readonly zero: ParsedSection;
  readonly text: ParsedSection | null;
  /**
   * Vero se esiste una sezione negativi esplicita. E' l'informazione che cambia
   * tutto: in quel caso Excel passa alla sezione il VALORE ASSOLUTO, e il segno
   * lo deve mettere il formato (di solito con le parentesi).
   */
  readonly negativeIsExplicit: boolean;
}

// ---------------------------------------------------------------------------
// Colori
// ---------------------------------------------------------------------------

/** I colori nominabili in un formato, sia in inglese sia in italiano. */
const NAMED_COLORS: Readonly<Record<string, string>> = {
  black: '#000000',
  nero: '#000000',
  white: '#FFFFFF',
  bianco: '#FFFFFF',
  red: '#FF0000',
  rosso: '#FF0000',
  green: '#00B050',
  verde: '#00B050',
  blue: '#0000FF',
  blu: '#0000FF',
  yellow: '#FFFF00',
  giallo: '#FFFF00',
  magenta: '#FF00FF',
  cyan: '#00FFFF',
  ciano: '#00FFFF',
};

/**
 * Palette indicizzata di Excel, forma `[Color3]`. Le prime otto voci sono quelle
 * che si incontrano davvero nei formati scritti a mano; oltre, il formato resta
 * valido ma il colore non e' risolto (meglio nessun colore che uno sbagliato).
 */
const INDEXED_COLORS: Readonly<Record<number, string>> = {
  1: '#000000',
  2: '#FFFFFF',
  3: '#FF0000',
  4: '#00FF00',
  5: '#0000FF',
  6: '#FFFF00',
  7: '#FF00FF',
  8: '#00FFFF',
};

function resolveColor(body: string): string | undefined {
  const key = body.trim().toLowerCase();
  const named = NAMED_COLORS[key];
  if (named !== undefined) return named;

  const indexed = /^colou?r\s*(\d{1,2})$/.exec(key) ?? /^colore\s*(\d{1,2})$/.exec(key);
  if (indexed) return INDEXED_COLORS[Number(indexed[1])];

  return undefined;
}

// ---------------------------------------------------------------------------
// Formati predefiniti
// ---------------------------------------------------------------------------

/**
 * I formati che il gioco applica di default.
 *
 * `migliaia` e `milioni` usano la virgola finale come scala: e' cio' che si fa nei
 * modelli veri per esprimere gli euro in migliaia o in milioni senza toccare i
 * dati sottostanti (il valore in cella resta quello pieno, cambia solo la vista).
 */
export const DEFAULT_FORMATS: Record<string, string> = {
  generale: 'General',
  numero2dec: '#,##0.00',
  valuta: '#,##0.00 "€";-#,##0.00 "€"',
  percentuale: '0%',
  /** Valore pieno, mostrato in migliaia. */
  migliaia: '#,##0,',
  milioni: '#,##0,,',
  /** Il multiplo dell'EV/EBITDA e della leva: `4,2x`. */
  multiplo: '0.0x',
  data: 'gg/mm/aaaa',
};

/**
 * Le tre scorciatoie di formattazione dello spec §3.1. Le firme sono quelle
 * prodotte da `keySignature`.
 */
export const NUMBER_FORMAT_SHORTCUTS: Readonly<Record<string, string>> = {
  'Ctrl+Shift+1': DEFAULT_FORMATS.numero2dec,
  'Ctrl+Shift+4': DEFAULT_FORMATS.valuta,
  'Ctrl+Shift+5': DEFAULT_FORMATS.percentuale,
};

// ---------------------------------------------------------------------------
// Separatori per locale
// ---------------------------------------------------------------------------

interface Separators {
  readonly decimal: string;
  readonly group: string;
}

const SEPARATORS: Readonly<Record<FormatLocale, Separators>> = {
  'it-IT': { decimal: ',', group: '.' },
  'en-US': { decimal: '.', group: ',' },
};

// ---------------------------------------------------------------------------
// Nomi di mesi e giorni (italiano)
// ---------------------------------------------------------------------------

const MONTHS_LONG = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const WEEKDAYS_LONG = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

// ---------------------------------------------------------------------------
// Date seriali
// ---------------------------------------------------------------------------

export interface ExcelDateParts {
  readonly year: number;
  readonly month: number;
  /** Giorno del mese. Vale 0 solo per il seriale 0, che Excel mostra come `00/01/1900`. */
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  /** 0 = domenica, come `WEEKDAY(seriale)` di Excel. */
  readonly weekday: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Converte un seriale Excel in data.
 *
 * IL BUG DELL'ANNO BISESTILE 1900. Excel considera il 1900 bisestile perche' il
 * Lotus 1-2-3 lo faceva, e nel 1985 la compatibilita' con il Lotus valeva piu'
 * della correttezza: il seriale 60 e' il 29/02/1900, un giorno che non e' mai
 * esistito. La conseguenza e' che i seriali fino al 59 sono sfasati di un giorno
 * rispetto al conteggio reale, e da 61 in poi tornano a posto. Qui il bug e'
 * riprodotto di proposito: un trainer che desse date diverse da Excel su seriali
 * bassi insegnerebbe la cosa sbagliata.
 *
 * Per lo stesso motivo il giorno della settimana si calcola dal seriale
 * (`(n + 6) % 7`) e non dalla data reale: e' cio' che fa `WEEKDAY` in Excel, ed e'
 * il motivo per cui prima del 01/03/1900 il giorno della settimana di Excel non
 * coincide con quello del calendario.
 */
export function serialToDate(serial: number): ExcelDateParts {
  let n = Math.floor(serial);
  let frac = serial - n;

  // Gli arrotondamenti dell'orario possono spingere a mezzanotte del giorno dopo.
  let secondsOfDay = Math.round(frac * 86_400);
  if (secondsOfDay >= 86_400) {
    n += 1;
    frac = 0;
    secondsOfDay = 0;
  }

  const hour = Math.floor(secondsOfDay / 3600);
  const minute = Math.floor((secondsOfDay % 3600) / 60);
  const second = secondsOfDay % 60;
  const weekday = ((n % 7) + 6) % 7;

  // Seriale 0: Excel lo disegna come il "giorno zero" di gennaio 1900.
  if (n === 0) return { year: 1900, month: 1, day: 0, hour, minute, second, weekday };

  // Seriale 60: il 29 febbraio che non e' mai esistito.
  if (n === 60) return { year: 1900, month: 2, day: 29, hour, minute, second, weekday };

  // Sotto il 60 il calendario di Excel e' avanti di un giorno rispetto al reale,
  // quindi l'epoca da cui contare e' diversa.
  const base = n < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
  const dt = new Date(base + n * MS_PER_DAY);
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
    hour,
    minute,
    second,
    weekday,
  };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const DATE_LETTERS = /^(g+|d+|m+|a+|y+|h+|s+)/i;

/**
 * Divide il formato nelle sue sezioni. Non si puo' usare `split(';')`: un punto e
 * virgola dentro le virgolette o dentro le quadre e' un carattere qualsiasi.
 */
function splitSections(format: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  let inBracket = false;

  for (let i = 0; i < format.length; i++) {
    const ch = format[i];

    if (ch === '\\' && !inQuotes) {
      current += ch;
      if (i + 1 < format.length) current += format[i + 1];
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (!inQuotes && ch === '[') inBracket = true;
    if (!inQuotes && ch === ']') inBracket = false;

    if (ch === ';' && !inQuotes && !inBracket) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);

  // Oltre la quarta sezione Excel ignora il resto.
  return out.slice(0, 4);
}

function parseSection(source: string): ParsedSection {
  const tokens: FormatToken[] = [];
  const conditions: string[] = [];
  let color: string | undefined;

  let i = 0;
  while (i < source.length) {
    const ch = source[i];

    // Escape: il carattere successivo e' letterale, qualunque esso sia.
    if (ch === '\\') {
      if (i + 1 < source.length) tokens.push({ kind: 'literal', text: source[i + 1] });
      i += 2;
      continue;
    }

    // Testo fra virgolette.
    if (ch === '"') {
      const end = source.indexOf('"', i + 1);
      const body = end < 0 ? source.slice(i + 1) : source.slice(i + 1, end);
      if (body.length > 0) tokens.push({ kind: 'literal', text: body });
      i = end < 0 ? source.length : end + 1;
      continue;
    }

    // Parentesi quadre: colore, oppure condizione/locale che qui non applichiamo
    // ma conserviamo perche' il grader possa vederla.
    if (ch === '[') {
      const end = source.indexOf(']', i);
      if (end < 0) {
        tokens.push({ kind: 'literal', text: source.slice(i) });
        i = source.length;
        continue;
      }
      const body = source.slice(i + 1, end);
      const resolved = resolveColor(body);
      if (resolved !== undefined) color = color ?? resolved;
      else conditions.push(body);
      i = end + 1;
      continue;
    }

    // `_x` riserva la larghezza di un carattere: lo rendiamo con uno spazio.
    if (ch === '_') {
      tokens.push({ kind: 'skip', text: ' ' });
      i += 2;
      continue;
    }

    // `*x` ripete un carattere fino a riempire la cella: la larghezza qui non la
    // conosciamo, quindi il carattere si consuma e non si stampa.
    if (ch === '*') {
      i += 2;
      continue;
    }

    if (ch === '0' || ch === '#' || ch === '?') {
      tokens.push({ kind: 'digit', text: ch });
      i++;
      continue;
    }
    if (ch === '.') {
      tokens.push({ kind: 'decimalPoint', text: '.' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'groupSep', text: ',' });
      i++;
      continue;
    }
    if (ch === '%') {
      tokens.push({ kind: 'percent', text: '%' });
      i++;
      continue;
    }
    if (ch === '@') {
      tokens.push({ kind: 'textPlaceholder', text: '@' });
      i++;
      continue;
    }

    const rest = source.slice(i);
    const general = /^(generale|general|standard)/i.exec(rest);
    if (general) {
      tokens.push({ kind: 'general', text: 'general' });
      i += general[0].length;
      continue;
    }

    const date = DATE_LETTERS.exec(rest);
    if (date) {
      tokens.push({ kind: 'date', text: date[0].toLowerCase() });
      i += date[0].length;
      continue;
    }

    tokens.push({ kind: 'literal', text: ch });
    i++;
  }

  return finishSection(source, tokens, color, conditions);
}

function finishSection(
  source: string,
  rawTokens: FormatToken[],
  color: string | undefined,
  conditions: string[],
): ParsedSection {
  const hasDigit = rawTokens.some((t) => t.kind === 'digit');
  const hasDate = rawTokens.some((t) => t.kind === 'date');
  const hasText = rawTokens.some((t) => t.kind === 'textPlaceholder');
  const hasGeneral = rawTokens.some((t) => t.kind === 'general');

  // Un formato non e' mai insieme data e numero: se ci sono segnaposto di cifra,
  // le lettere che sembravano codici data sono solo testo (es. `0.0x`, dove la
  // `x` non e' un codice ma il suffisso del multiplo).
  const tokens: FormatToken[] =
    hasDate && hasDigit ? rawTokens.map((t) => (t.kind === 'date' ? { kind: 'literal' as const, text: t.text } : t)) : rawTokens;

  let kind: SectionKind;
  if (hasDigit) kind = 'number';
  else if (hasDate) kind = 'date';
  else if (hasGeneral) kind = 'general';
  else if (hasText) kind = 'text';
  else kind = 'literal';

  return {
    source,
    tokens,
    kind,
    color,
    conditions,
    numeric: kind === 'number' ? buildNumericSpec(tokens) : null,
  };
}

function buildNumericSpec(tokens: readonly FormatToken[]): NumericSpec {
  const decPointIndex = tokens.findIndex((t) => t.kind === 'decimalPoint');
  const intPlaceholders: string[] = [];
  const decPlaceholders: string[] = [];
  let percentCount = 0;

  tokens.forEach((t, idx) => {
    if (t.kind === 'percent') percentCount++;
    if (t.kind !== 'digit') return;
    if (decPointIndex >= 0 && idx > decPointIndex) decPlaceholders.push(t.text);
    else intPlaceholders.push(t.text);
  });

  const firstDigit = tokens.findIndex((t) => t.kind === 'digit');
  let lastDigit = -1;
  tokens.forEach((t, idx) => {
    if (t.kind === 'digit') lastDigit = idx;
  });

  // La virgola cambia significato secondo la posizione: fra cifre chiede il
  // raggruppamento, dopo l'ultima cifra divide per mille (una volta per virgola).
  let grouping = false;
  let scaleCommas = 0;
  tokens.forEach((t, idx) => {
    if (t.kind !== 'groupSep') return;
    if (idx > lastDigit) scaleCommas++;
    else if (idx > firstDigit) grouping = true;
  });

  // Le cifre obbligatorie sono gli `0`; i `?` occupano spazio ma non stampano zeri.
  const minIntDigits = intPlaceholders.filter((p) => p === '0').length;
  let minDecimals = 0;
  decPlaceholders.forEach((p, idx) => {
    if (p === '0') minDecimals = idx + 1;
  });

  return {
    intPlaceholders,
    decPlaceholders,
    minIntDigits,
    minDecimals,
    maxDecimals: decPlaceholders.length,
    grouping,
    scaleCommas,
    percentCount,
  };
}

/** Sezione vuota: in Excel significa "non mostrare nulla" (idioma `0;;` per nascondere gli zeri). */
const EMPTY_SECTION: ParsedSection = Object.freeze({
  source: '',
  tokens: [],
  kind: 'literal' as const,
  conditions: [],
  numeric: null,
});

const CACHE = new Map<string, ParsedFormat>();
const CACHE_MAX = 512;

/**
 * Analizza un formato Excel e restituisce una struttura ispezionabile.
 *
 * Regole di ereditarieta' delle sezioni, esattamente come Excel:
 *  - 1 sezione: vale per positivi, negativi e zero (il segno meno lo mette Excel);
 *  - 2 sezioni: la seconda vale per i negativi, la prima anche per lo zero;
 *  - 3 sezioni: positivi / negativi / zero;
 *  - 4 sezioni: la quarta e' il testo.
 */
export function parseNumberFormat(format: string): ParsedFormat {
  const cached = CACHE.get(format);
  if (cached !== undefined) return cached;

  const rawSections = splitSections(format);
  const sections = rawSections.map((s) => (s === '' ? EMPTY_SECTION : parseSection(s)));

  const positive = sections[0] ?? EMPTY_SECTION;
  const negativeIsExplicit = sections.length >= 2;
  const negative = negativeIsExplicit ? sections[1] : positive;
  const zero = sections.length >= 3 ? sections[2] : positive;

  // La sezione del testo e' la quarta. Unica eccezione, ed e' quella che si usa
  // davvero: un formato di una sola sezione che contiene `@` e' un formato di
  // testo e basta (`@" mln"`), non un formato numerico.
  const text =
    sections.length >= 4 ? sections[3] : sections.length === 1 && positive.kind === 'text' ? positive : null;

  const parsed: ParsedFormat = { source: format, sections, positive, negative, zero, text, negativeIsExplicit };

  if (CACHE.size >= CACHE_MAX) CACHE.clear();
  CACHE.set(format, parsed);
  return parsed;
}

// ---------------------------------------------------------------------------
// Aritmetica decimale
// ---------------------------------------------------------------------------

/** Trasforma la notazione esponenziale di JS in una stringa decimale piena. */
function expandExponential(s: string): string {
  const m = /^(\d+)(?:\.(\d+))?e([+-]\d+)$/i.exec(s);
  if (!m) return s;

  const intPart = m[1];
  const fracPart = m[2] ?? '';
  const exp = Number(m[3]);
  const digits = intPart + fracPart;
  const pointPos = intPart.length + exp;

  if (pointPos <= 0) return `0.${'0'.repeat(-pointPos)}${digits}`;
  if (pointPos >= digits.length) return digits + '0'.repeat(pointPos - digits.length);
  return `${digits.slice(0, pointPos)}.${digits.slice(pointPos)}`;
}

/**
 * Arrotonda il valore assoluto a `decimals` cifre, con lo 0,5 SEMPRE per eccesso
 * come fa Excel (mai banker rounding).
 *
 * Si lavora sulla rappresentazione decimale a 15 cifre significative, non sul
 * binario, per lo stesso motivo per cui Excel lo fa: `1.005` in binario e'
 * 1.00499999999999989, e un arrotondamento fatto sui bit darebbe `1,00` mentre
 * Excel mostra `1,01`. Si lavora inoltre sul valore ASSOLUTO perche' in JS
 * `Math.round(-0.5)` vale `-0` e non `-1`: il segno si rimette alla fine.
 */
function roundAbsHalfUp(abs: number, decimals: number): { int: string; dec: string } {
  if (abs === 0) return { int: '0', dec: '0'.repeat(decimals) };

  // 15 cifre significative: la precisione che Excel stesso dichiara di avere.
  const plain = expandExponential(abs.toPrecision(15));
  const dot = plain.indexOf('.');
  let intDigits = dot < 0 ? plain : plain.slice(0, dot);
  let fracDigits = dot < 0 ? '' : plain.slice(dot + 1);

  if (fracDigits.length <= decimals) {
    return { int: stripLeadingZeros(intDigits), dec: fracDigits.padEnd(decimals, '0') };
  }

  const keep = fracDigits.slice(0, decimals);
  const nextDigit = fracDigits.charCodeAt(decimals) - 48;
  let all = intDigits + keep;

  if (nextDigit >= 5) {
    // Incremento con riporto sulla stringa di cifre: niente float, niente sorprese.
    const chars = all.split('');
    let k = chars.length - 1;
    for (;;) {
      if (k < 0) {
        chars.unshift('1');
        break;
      }
      if (chars[k] === '9') {
        chars[k] = '0';
        k--;
        continue;
      }
      chars[k] = String.fromCharCode(chars[k].charCodeAt(0) + 1);
      break;
    }
    all = chars.join('');
  }

  const intLen = all.length - decimals;
  intDigits = all.slice(0, intLen);
  fracDigits = all.slice(intLen);
  return { int: stripLeadingZeros(intDigits), dec: fracDigits };
}

function stripLeadingZeros(s: string): string {
  const stripped = s.replace(/^0+/, '');
  return stripped === '' ? '0' : stripped;
}

function groupThousands(intDigits: string, sep: string): string {
  if (intDigits.length <= 3) return intDigits;
  let out = '';
  for (let i = intDigits.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    out = intDigits.slice(start, i) + (out === '' ? '' : sep + out);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rendering: numeri
// ---------------------------------------------------------------------------

/**
 * Il formato `General`: nessun raggruppamento, decimali solo se servono.
 *
 * Excel decide quante cifre mostrare in base alla larghezza della colonna; qui la
 * larghezza non la conosciamo, quindi si fissa una regola deterministica (10 cifre
 * significative, notazione scientifica agli estremi) che e' quella che Excel usa a
 * larghezza standard.
 */
function formatGeneral(value: number, seps: Separators): string {
  if (value === 0) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1e11 || abs < 1e-10) {
    const [mantissa, exp] = abs.toExponential(5).split('e');
    const trimmed = mantissa.replace(/\.?0+$/, '').replace('.', seps.decimal);
    const expNum = Number(exp);
    const expSign = expNum < 0 ? '-' : '+';
    return `${sign}${trimmed}E${expSign}${String(Math.abs(expNum)).padStart(2, '0')}`;
  }

  const plain = expandExponential(abs.toPrecision(10));
  const trimmed = plain.includes('.') ? plain.replace(/0+$/, '').replace(/\.$/, '') : plain;
  return sign + trimmed.replace('.', seps.decimal);
}

/**
 * Compone la parte intera distribuendo le cifre sui segnaposto, da destra a
 * sinistra: ogni segnaposto ne prende una, e il piu' a sinistra si prende tutto
 * cio' che avanza (e' cosi' che `#,##0` mostra comunque i milioni). I separatori
 * di migliaia gia' inseriti viaggiano insieme alla cifra che precedono.
 */
function layoutIntegerDigits(placeholders: readonly string[], grouped: string): string[] {
  const pool = grouped.split('');
  const out: string[] = new Array(placeholders.length).fill('');

  for (let k = placeholders.length - 1; k >= 0; k--) {
    let piece = '';
    if (pool.length > 0) {
      piece = pool.pop() as string;
      while (pool.length > 0 && !/\d/.test(pool[pool.length - 1])) piece = (pool.pop() as string) + piece;
      if (k === 0 && pool.length > 0) piece = pool.join('') + piece;
      if (k === 0) pool.length = 0;
    } else {
      const ph = placeholders[k];
      // Esauriti i digit: `0` stampa comunque uno zero, `?` uno spazio, `#` nulla.
      piece = ph === '0' ? '0' : ph === '?' ? ' ' : '';
    }
    out[k] = piece;
  }
  return out;
}

/**
 * Compone i decimali. I `#` (e i `?`) finali che corrisponderebbero a zeri non
 * significativi si tagliano: `0.0#` su 1,5 da `1,5` e non `1,50`.
 */
function layoutDecimalDigits(placeholders: readonly string[], dec: string): string[] {
  let last = placeholders.length - 1;
  while (last >= 0 && (placeholders[last] === '#' || placeholders[last] === '?') && (dec[last] ?? '0') === '0') last--;

  return placeholders.map((ph, idx) => {
    if (idx <= last) return dec[idx] ?? '0';
    return ph === '?' ? ' ' : '';
  });
}

function renderNumberSection(section: ParsedSection, abs: number, seps: Separators): string {
  const spec = section.numeric;
  if (spec === null) return renderLiteralOnly(section);

  let v = abs;
  for (let i = 0; i < spec.percentCount; i++) v *= 100;
  for (let i = 0; i < spec.scaleCommas; i++) v /= 1000;

  const { int, dec } = roundAbsHalfUp(v, spec.maxDecimals);

  // Senza cifre intere obbligatorie lo zero non si stampa: `#` su 0 da cella
  // vuota, `#.##` su 0,5 da `,5`. E' la differenza fra `#` e `0`, ed e' il motivo
  // per cui i formati veri scrivono sempre `#,##0` e mai `#,###`.
  const intDigits = int === '0' && spec.minIntDigits === 0 ? '' : int;
  const grouped = spec.grouping ? groupThousands(intDigits, seps.group) : intDigits;

  const intPieces = layoutIntegerDigits(spec.intPlaceholders, grouped);
  const decPieces = layoutDecimalDigits(spec.decPlaceholders, dec);

  // Se il formato non ha alcun segnaposto intero (es. `.00`) le cifre intere non
  // avrebbero dove finire: si emettono davanti al separatore decimale.
  const orphanInt = spec.intPlaceholders.length === 0 ? grouped : '';

  let out = '';
  let intCursor = 0;
  let decCursor = 0;
  let afterPoint = false;

  for (const t of section.tokens) {
    switch (t.kind) {
      case 'digit':
        out += afterPoint ? decPieces[decCursor++] : intPieces[intCursor++];
        break;
      case 'decimalPoint':
        afterPoint = true;
        out += orphanInt + seps.decimal;
        break;
      case 'groupSep':
        // Strutturale: il raggruppamento e' gia' dentro le cifre, la scala e' gia' applicata.
        break;
      case 'percent':
        out += '%';
        break;
      case 'literal':
        out += t.text;
        break;
      case 'skip':
        out += ' ';
        break;
      case 'textPlaceholder':
      case 'date':
      case 'general':
        break;
    }
  }
  return out;
}

/** Sezione senza segnaposto numerici, come il `-` degli zeri in `#,##0;(#,##0);-`. */
function renderLiteralOnly(section: ParsedSection): string {
  let out = '';
  for (const t of section.tokens) {
    if (t.kind === 'literal') out += t.text;
    else if (t.kind === 'skip') out += ' ';
    else if (t.kind === 'percent') out += '%';
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rendering: date
// ---------------------------------------------------------------------------

/** Vero se questo codice `m` va letto come minuti e non come mese. */
function isMinuteCode(tokens: readonly FormatToken[], idx: number): boolean {
  for (let i = idx - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.kind !== 'date') continue;
    if (t.text.startsWith('h')) return true;
    break;
  }
  for (let i = idx + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== 'date') continue;
    if (t.text.startsWith('s')) return true;
    break;
  }
  return false;
}

function renderDateSection(section: ParsedSection, serial: number): string {
  const d = serialToDate(serial);
  let out = '';

  section.tokens.forEach((t, idx) => {
    if (t.kind === 'literal') {
      out += t.text;
      return;
    }
    if (t.kind === 'skip') {
      out += ' ';
      return;
    }
    if (t.kind !== 'date') return;

    const code = t.text;
    const n = code.length;
    const head = code[0];

    if (head === 'g' || head === 'd') {
      // In Excel italiano `g` e' il giorno e `ggg`/`gggg` il giorno della settimana.
      if (n >= 4) out += WEEKDAYS_LONG[d.weekday];
      else if (n === 3) out += WEEKDAYS_SHORT[d.weekday];
      else out += String(d.day).padStart(n, '0');
      return;
    }
    if (head === 'm') {
      if (isMinuteCode(section.tokens, idx)) {
        out += String(d.minute).padStart(Math.min(n, 2), '0');
        return;
      }
      if (n >= 5) out += MONTHS_LONG[d.month - 1].charAt(0).toUpperCase();
      else if (n === 4) out += MONTHS_LONG[d.month - 1];
      else if (n === 3) out += MONTHS_SHORT[d.month - 1];
      else out += String(d.month).padStart(n, '0');
      return;
    }
    if (head === 'a' || head === 'y') {
      // `aa` due cifre, `aaaa` quattro: `mm/aa` e' il formato delle colonne di un modello.
      if (n <= 2) out += String(d.year % 100).padStart(2, '0');
      else out += String(d.year).padStart(4, '0');
      return;
    }
    if (head === 'h') {
      out += String(d.hour).padStart(Math.min(n, 2), '0');
      return;
    }
    if (head === 's') {
      out += String(d.second).padStart(Math.min(n, 2), '0');
    }
  });

  return out;
}

// ---------------------------------------------------------------------------
// Rendering: testo
// ---------------------------------------------------------------------------

function renderTextSection(section: ParsedSection | null, value: string): string {
  // Senza quarta sezione il testo passa intatto: un formato numerico non tocca
  // le stringhe, le lascia dov'erano (a sinistra, come le disegna Excel).
  if (section === null) return value;

  let out = '';
  for (const t of section.tokens) {
    if (t.kind === 'textPlaceholder' || t.kind === 'general') out += value;
    else if (t.kind === 'literal') out += t.text;
    else if (t.kind === 'skip') out += ' ';
  }
  return out;
}

// ---------------------------------------------------------------------------
// API principale
// ---------------------------------------------------------------------------

/**
 * I valori di errore che HyperFormula restituisce come stringhe. `#N/A` non
 * finisce con `!`, quindi la lista e' esplicita e non un pattern.
 */
const ERROR_VALUES: ReadonlySet<string> = new Set([
  '#DIV/0!',
  '#N/A',
  '#NAME?',
  '#NULL!',
  '#NUM!',
  '#REF!',
  '#VALUE!',
  '#CYCLE!',
  '#SPILL!',
  '#ERROR!',
]);

/**
 * Formatta un valore secondo un formato Excel.
 *
 * Le stringhe restano stringhe: un `"1500"` NON viene convertito in numero,
 * perche' in Excel il testo che assomiglia a un numero e' comunque testo (ed e'
 * proprio l'errore che i livelli di data cleaning devono far vedere).
 */
export function formatNumber(
  value: number | string | boolean | null,
  format: string,
  opts?: FormatOptions,
): FormattedCell {
  const seps = SEPARATORS[opts?.locale ?? 'it-IT'];

  // Cella vuota: nessun formato la fa apparire.
  if (value === null) return { text: '', align: 'left' };

  // I booleani ignorano il formato numerico e stanno al centro, come in Excel.
  if (typeof value === 'boolean') {
    const [vero, falso] = opts?.locale === 'en-US' ? ['TRUE', 'FALSE'] : ['VERO', 'FALSO'];
    return { text: value ? vero : falso, align: 'center' };
  }

  const effective = format.trim() === '' ? 'General' : format;
  const parsed = parseNumberFormat(effective);

  if (typeof value === 'string') {
    // Gli errori (#DIV/0!, #REF!...) arrivano da HyperFormula come stringhe e non
    // si formattano: si mostrano tali e quali, centrati.
    if (ERROR_VALUES.has(value)) return { text: value, align: 'center' };
    const section = parsed.text;
    return {
      text: renderTextSection(section, value),
      ...(section?.color !== undefined ? { color: section.color } : {}),
      align: 'left',
    };
  }

  if (!Number.isFinite(value)) return { text: '#NUM!', align: 'center' };

  // Scelta della sezione. Il caso critico: quando la sezione negativi esiste,
  // Excel le passa il VALORE ASSOLUTO, ed e' il formato a dover produrre il segno
  // (di solito con le parentesi contabili). Senza sezione negativi il meno lo
  // aggiunge Excel davanti al risultato.
  let section: ParsedSection;
  let negativeSign = false;
  if (value > 0) {
    section = parsed.positive;
  } else if (value < 0) {
    section = parsed.negative;
    negativeSign = !parsed.negativeIsExplicit;
  } else {
    section = parsed.zero;
  }

  const abs = Math.abs(value);
  let text: string;
  switch (section.kind) {
    case 'general':
      text = formatGeneral(negativeSign ? -abs : abs, seps);
      negativeSign = false;
      break;
    case 'date':
      text = renderDateSection(section, value);
      negativeSign = false;
      break;
    case 'number':
      text = renderNumberSection(section, abs, seps);
      break;
    case 'text':
    case 'literal':
      text = renderLiteralOnly(section);
      break;
  }

  if (negativeSign && text !== '') text = `-${text}`;

  return {
    text,
    ...(section.color !== undefined ? { color: section.color } : {}),
    align: 'right',
  };
}

// ---------------------------------------------------------------------------
// Equivalenza fra formati (serve al grader)
// ---------------------------------------------------------------------------

function canonicalTokens(tokens: readonly FormatToken[], color: string | undefined): string {
  let out = color !== undefined ? `[${color}]` : '';
  let literal = '';

  const flush = (): void => {
    if (literal !== '') {
      out += `"${literal}"`;
      literal = '';
    }
  };

  for (const t of tokens) {
    if (t.kind === 'literal') {
      literal += t.text;
      continue;
    }
    if (t.kind === 'skip') {
      literal += ' ';
      continue;
    }
    flush();
    out += t.kind === 'general' ? 'general' : t.text;
  }
  flush();
  return out;
}

/**
 * Forma canonica di un formato: le quattro sezioni risolte, con i literal
 * normalizzati e i colori tradotti in esadecimale.
 *
 * La sezione negativi implicita viene resa esplicita come `-` piu' la sezione dei
 * positivi: e' esattamente cio' che Excel fa, e permette di riconoscere che
 * `#,##0` e `#,##0;-#,##0;#,##0` sono lo stesso formato.
 */
export function canonicalizeFormat(format: string): string {
  const p = parseNumberFormat(format.trim() === '' ? 'General' : format);

  const pos = canonicalTokens(p.positive.tokens, p.positive.color);
  const neg = p.negativeIsExplicit
    ? canonicalTokens(p.negative.tokens, p.negative.color)
    : canonicalTokens([{ kind: 'literal', text: '-' }, ...p.positive.tokens], p.positive.color);
  const zero = canonicalTokens(p.zero.tokens, p.zero.color);
  const text = p.text === null ? '@' : canonicalTokens(p.text.tokens, p.text.color);

  return [pos, neg, zero, text].join(';');
}

/** Due formati sono equivalenti se producono lo stesso output per ogni valore. */
export function formatsEquivalent(a: string, b: string): boolean {
  return canonicalizeFormat(a) === canonicalizeFormat(b);
}
