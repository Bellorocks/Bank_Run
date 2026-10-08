/**
 * Normalizzazione degli eventi tastiera in una "firma" canonica (BUILD SPEC §3.2).
 *
 * Perche' una firma stringa e non un oggetto: la tabella dei binding deve essere
 * un dato ispezionabile, diffabile e stampabile nel cheat sheet. `"Ctrl+Maiusc+Giu"`
 * lo leggi; `{ctrl:true,shift:true,key:"ArrowDown"}` no.
 *
 * Le due scelte non ovvie di questo modulo:
 *
 *  1. Per cifre e punteggiatura si usa `event.code` (posizione fisica del tasto)
 *     e non `event.key` (carattere prodotto dal layout). L'utente ha una tastiera
 *     ITALIANA: Maiusc+1 produce `!`, Maiusc+9 produce `(`, il tasto in posizione
 *     `Equal` stampa `ì` e quello in posizione `Backquote` stampa `\`. Con `key`
 *     meta' delle scorciatoie Excel semplicemente non esisterebbero.
 *
 *  2. Su Windows AltGr arriva ai gestori come `ctrlKey && altKey`. Quindi
 *     AltGr+ò (che su tastiera italiana e' la @) sarebbe indistinguibile da una
 *     scorciatoia Ctrl+Alt. Regola: Ctrl+Alt insieme + carattere stampabile =
 *     digitazione, non scorciatoia. L'unica eccezione e' `Ctrl+Alt+V`, che in
 *     Excel e' davvero l'incolla speciale.
 */

/**
 * Superficie minima di un `KeyboardEvent`. Tenerla stretta e' cio' che rende
 * testabile tutta la keymap senza DOM.
 */
export interface KeyLike {
  readonly key: string;
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat?: boolean;
}

/** Ordine canonico dei modificatori. Non cambiarlo: le firme sono chiavi di tabella. */
export const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;

export type ModifierName = (typeof MODIFIER_ORDER)[number];

/**
 * Tasti la cui etichetta dipende dal layout: si identificano per posizione.
 *
 * `BracketLeft`/`BracketRight`/`Backquote`/`Quote` restano token nominali perche'
 * il carattere che stampano cambia troppo (su IT sono `è`, `+`, `\`, `à`) e un
 * token simbolico renderebbe la tabella illeggibile. Cifre, `-` e `=` invece
 * conservano il simbolo US, che e' come Excel documenta le proprie scorciatoie.
 */
const CODE_TOKENS: Readonly<Record<string, string>> = {
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Minus: '-',
  Equal: '=',
  BracketLeft: 'BracketLeft',
  BracketRight: 'BracketRight',
  Backquote: 'Backquote',
  Quote: 'Quote',
  // Excel accetta il tastierino per inserisci/elimina celle: Ctrl+Num+ e Ctrl+Num-.
  NumpadAdd: '+',
  NumpadSubtract: '-',
};

/** Alias di `event.key` verso il nome canonico (i browser vecchi usano ancora `Up`, `Esc`, `Del`). */
const KEY_ALIASES: Readonly<Record<string, string>> = {
  ' ': 'Space',
  Spacebar: 'Space',
  Esc: 'Escape',
  Del: 'Delete',
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  Win: 'Meta',
  OS: 'Meta',
};

const MODIFIER_KEYS: ReadonlySet<string> = new Set([
  'Control',
  'Alt',
  'AltGraph',
  'Shift',
  'Meta',
  'OS',
  'Win',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Hyper',
  'Super',
]);

/** Vero se l'evento e' la pressione isolata di un modificatore. */
export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}

/**
 * Vero se Ctrl+Alt su questo evento sono in realta' AltGr che sta componendo un
 * carattere. Vedi nota (2) in testa al file.
 */
export function isAltGrTyping(ev: KeyLike): boolean {
  if (!ev.ctrlKey || !ev.altKey || ev.metaKey) return false;
  // Eccezione esplicita: Ctrl+Alt+V e' un binding vero (incolla speciale).
  if (ev.code === 'KeyV') return false;
  if (ev.key === 'AltGraph') return true;
  // Un `key` di un solo carattere significa che il layout ha prodotto testo.
  return ev.key.length === 1;
}

/**
 * Vero se l'evento deve finire nella cella come testo invece che nel dispatcher.
 * Serve alla griglia per decidere se aprire l'editing digitando.
 */
export function isPrintableTyping(ev: KeyLike): boolean {
  if (isModifierKey(ev.key)) return false;
  if (isAltGrTyping(ev)) return true;
  if (ev.ctrlKey || ev.altKey || ev.metaKey) return false;
  return ev.key.length === 1;
}

/** Il token principale della firma, senza modificatori. `undefined` se e' solo un modificatore. */
function mainToken(ev: KeyLike): string | undefined {
  if (isModifierKey(ev.key)) return undefined;

  const byCode = CODE_TOKENS[ev.code];
  if (byCode !== undefined) return byCode;

  const alias = KEY_ALIASES[ev.key];
  if (alias !== undefined) return alias;

  // Le lettere stanno nella stessa posizione su IT e US: `key` va benissimo.
  if (/^[A-Za-z]$/.test(ev.key)) return ev.key.toUpperCase();

  // ...ma se il layout ha prodotto un carattere morto o un accento, ripieghiamo
  // sulla posizione fisica.
  const keyCode = /^Key([A-Z])$/.exec(ev.code);
  if (keyCode) return keyCode[1];

  return ev.key;
}

function modifiersOf(ev: KeyLike): ModifierName[] {
  const mods: ModifierName[] = [];
  if (ev.ctrlKey) mods.push('Ctrl');
  if (ev.altKey) mods.push('Alt');
  if (ev.shiftKey) mods.push('Shift');
  if (ev.metaKey) mods.push('Meta');
  return mods;
}

/**
 * Firma canonica dell'evento, es. `"Ctrl+Shift+ArrowDown"`, `"Alt+="`, `"F2"`,
 * `"Ctrl+Alt+V"`, `"Ctrl+Backquote"`.
 *
 * Restituisce `undefined` quando l'evento non e' una scorciatoia ma digitazione
 * (composizione AltGr).
 */
export function keySignature(ev: KeyLike): string | undefined {
  // Caso speciale: il punto interrogativo apre il cheat sheet (§3.2). La sua
  // posizione fisica cambia col layout (Maiusc+Slash su US, Maiusc+Minus su IT),
  // quindi qui e' l'unico posto dove ci fidiamo del carattere e non del codice.
  if (ev.key === '?' && !ev.ctrlKey && !ev.altKey && !ev.metaKey) return '?';

  if (isAltGrTyping(ev)) return undefined;

  const mods = modifiersOf(ev);
  const token = mainToken(ev);

  if (token === undefined) {
    // Pressione isolata di un modificatore: la firma e' il modificatore stesso.
    // Serve ad `altSequence`, perche' Alt da solo apre la barra dei menu.
    return mods.length > 0 ? mods.join('+') : undefined;
  }

  return [...mods, token].join('+');
}

/**
 * Scompone una firma nei suoi pezzi. Non usa `split('+')` perche' `"Ctrl++"`
 * (inserisci celle dal tastierino) andrebbe in pezzi sbagliati.
 */
export function parseSignature(signature: string): { mods: ModifierName[]; token: string } {
  const mods: ModifierName[] = [];
  let rest = signature;
  for (const m of MODIFIER_ORDER) {
    const prefix = `${m}+`;
    if (rest.startsWith(prefix) && rest.length > prefix.length) {
      mods.push(m);
      rest = rest.slice(prefix.length);
    }
  }
  return { mods, token: rest };
}

/** Etichette italiane dei modificatori, come le stampa Windows in italiano. */
const MODIFIER_LABELS: Readonly<Record<ModifierName, string>> = {
  Ctrl: 'Ctrl',
  Alt: 'Alt',
  Shift: 'Maiusc',
  Meta: 'Win',
};

const TOKEN_LABELS: Readonly<Record<string, string>> = {
  ArrowUp: 'Su',
  ArrowDown: 'Giù',
  ArrowLeft: 'Sinistra',
  ArrowRight: 'Destra',
  Enter: 'Invio',
  Escape: 'Esc',
  Space: 'Spazio',
  Delete: 'Canc',
  Insert: 'Ins',
  Backspace: 'Backspace',
  Home: 'Home',
  End: 'Fine',
  PageUp: 'PagSu',
  PageDown: 'PagGiù',
  Backquote: '`',
  BracketLeft: '[',
  BracketRight: ']',
  Quote: "'",
  Tab: 'Tab',
  Ctrl: 'Ctrl',
  Alt: 'Alt',
  Shift: 'Maiusc',
  Meta: 'Win',
};

/**
 * Rende una firma leggibile in italiano: `"Ctrl+Shift+ArrowDown"` -> `"Ctrl+Maiusc+Giù"`.
 * Usata dal cheat sheet e dall'overlay tastiera del tutorial (§7).
 */
export function formatSignatureForDisplay(signature: string): string {
  const { mods, token } = parseSignature(signature);
  const parts = mods.map((m) => MODIFIER_LABELS[m]);
  parts.push(TOKEN_LABELS[token] ?? token);
  return parts.join('+');
}

/** Come sopra ma per una sequenza di firme, es. l'elenco di una scheda tutorial. */
export function formatSignatureList(signatures: readonly string[], separator = ' / '): string {
  return signatures.map(formatSignatureForDisplay).join(separator);
}
