/**
 * Tabella firma -> comando (BUILD SPEC §3.1, §3.2).
 *
 * Questo file e' *dati*: nessuna logica di esecuzione, solo la mappa fra cio'
 * che l'utente preme e il comando che ne consegue. La logica sta nelle unita'
 * di lavoro (`Workbook`, navigazione, selezione, clipboard).
 *
 * Il punto non ovvio, e il motivo per cui questa tabella non e' un semplice
 * `Record<string, Command>`: **in Excel i binding sono contestuali**. La stessa
 * firma fa cose diverse a seconda dello stato di editing mostrato in basso a
 * sinistra (Pronto / Immissione / Modifica / Punta). I quattro casi che la
 * gente sbaglia sempre quando riscrive Excel:
 *
 *  - `F4` in Modifica/Punta cicla gli ancoraggi del riferimento sotto il
 *    cursore; in Pronto ripete l'ultima azione. Sono due comandi diversi.
 *  - le frecce in **Modifica** muovono il cursore DENTRO il testo (nessuna
 *    navigazione!), in **Immissione** confermano la cella e si spostano, in
 *    **Pronto** navigano, in **Punta** spostano il riferimento che si sta
 *    costruendo. Quattro comportamenti, una sola firma.
 *  - `F9` con un frammento di formula selezionato valuta il frammento; senza
 *    selezione ricalcola. E' la killer feature del debug (§3.1) e dipende
 *    interamente dal contesto.
 *  - `Invio` scende sempre, ma da Pronto e' navigazione e da Modifica e'
 *    conferma: due comandi, non uno con un `if` dentro.
 *
 * Le **sequenze Alt** (Alt,H,O,I e compagnia) non stanno qui: sono cammini in
 * un albero, non accordi, e vivono in `altSequence.ts`. Qui c'e' solo la firma
 * `Alt` che apre la barra dei menu, piu' i pochi accordi che *contengono* Alt
 * ma non sono cammini (`Alt+=`, `Alt+Invio`, `Alt+Maiusc+Destra`, `Alt+PagSu`).
 */

import type { EditMode } from '../engine/types';
import type { Command } from './commands';

import { tr } from '../i18n/ui';
// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

/**
 * Le categorie sono quelle dei titoletti del §3.1, in italiano: servono a
 * raggruppare il cheat sheet e non hanno alcun ruolo nel dispatch.
 */
export type BindingCategory =
  | 'navigazione'
  | 'editing'
  | 'struttura'
  | 'formattazione'
  | 'formule'
  | 'altro';

export interface Binding {
  /** Firma canonica prodotta da `keySignature()`. */
  readonly signature: string;
  readonly command: Command;
  /** Stati di editing in cui il binding e' attivo. Vuoto non ha senso. */
  readonly modes: readonly EditMode[];
  /**
   * Se `true` il binding vale solo quando nella barra della formula c'e' del
   * testo selezionato (F9 sul frammento). Un binding con questo guard ha la
   * precedenza su quello senza: e' il piu' specifico.
   */
  readonly requiresTextSelection?: boolean;
  /** Se `true` il binding vale solo con appunti non vuoti (Ctrl+Alt+V). */
  readonly requiresClipboard?: boolean;
  /** Descrizione italiana, riusata dal cheat sheet. */
  readonly description: string;
  readonly category: BindingCategory;
}

/**
 * Contesto minimo per risolvere una firma. `clipboardEmpty` e `hasTextSelection`
 * sono i due soli pezzi di stato che cambiano il *significato* di un tasto:
 * tutto il resto (che cella, che selezione) riguarda l'esecuzione, non la
 * risoluzione.
 */
export interface BindingContext {
  readonly mode: EditMode;
  readonly hasTextSelection: boolean;
  /** Assente = appunti pieni: il chiamante che non ha appunti lo dice esplicitamente. */
  readonly clipboardEmpty?: boolean;
}

// ---------------------------------------------------------------------------
// Insiemi di modalita' ricorrenti
// ---------------------------------------------------------------------------

const READY: readonly EditMode[] = ['ready'];
/** Tutte le modalita' con un editor aperto. */
const TYPING: readonly EditMode[] = ['enter', 'edit', 'point'];
/** Modifica del testo vera e propria: qui il caret e' nel testo. */
const TEXT_EDIT: readonly EditMode[] = ['edit', 'enter'];
const EDIT_ONLY: readonly EditMode[] = ['edit'];
const POINT_ONLY: readonly EditMode[] = ['point'];
/** Dentro una formula, dove i riferimenti esistono. */
const IN_FORMULA: readonly EditMode[] = ['edit', 'point'];
const ANY: readonly EditMode[] = ['ready', 'enter', 'edit', 'point'];

// ---------------------------------------------------------------------------
// Costruttore della tabella
// ---------------------------------------------------------------------------

interface Guards {
  readonly requiresTextSelection?: boolean;
  readonly requiresClipboard?: boolean;
}

/**
 * Fabbrica per categoria: tiene la tabella leggibile come una tabella invece
 * che come duecento oggetti letterali identici tranne un campo.
 */
function group(category: BindingCategory) {
  return (
    signature: string,
    command: Command,
    modes: readonly EditMode[],
    description: string,
    guards: Guards = {},
  ): Binding => ({ signature, command, modes, description, category, ...guards });
}

const nav = group('navigazione');
const edt = group('editing');
const str = group('struttura');
const fmt = group('formattazione');
const fml = group('formule');
const oth = group('altro');

// ---------------------------------------------------------------------------
// La tabella
// ---------------------------------------------------------------------------

export const BINDINGS: readonly Binding[] = [
  // -------------------------------------------------------------------------
  // Navigazione (§3.1 "Navigazione")
  // -------------------------------------------------------------------------

  // Frecce: quattro significati per la stessa firma, uno per modalita'.
  nav('ArrowUp', 'nav.moveUp', READY, tr('bindings.1')),
  nav('ArrowDown', 'nav.moveDown', READY, tr('bindings.2')),
  nav('ArrowLeft', 'nav.moveLeft', READY, tr('bindings.3')),
  nav('ArrowRight', 'nav.moveRight', READY, tr('bindings.4')),

  // In Immissione (stai digitando) la freccia CONFERMA e si sposta.
  edt('ArrowUp', 'edit.confirmAndMoveUp', ['enter'], tr('bindings.5')),
  edt('ArrowDown', 'edit.confirmAndMoveDown', ['enter'], tr('bindings.6')),
  edt('ArrowLeft', 'edit.confirmAndMoveLeft', ['enter'], tr('bindings.7')),
  edt('ArrowRight', 'edit.confirmAndMoveRight', ['enter'], tr('bindings.8')),

  // In Modifica (F2) la freccia muove il CARET dentro il testo: niente navigazione.
  edt('ArrowUp', 'edit.caretUp', EDIT_ONLY, tr('bindings.9')),
  edt('ArrowDown', 'edit.caretDown', EDIT_ONLY, tr('bindings.10')),
  edt('ArrowLeft', 'edit.caretLeft', EDIT_ONLY, tr('bindings.11')),
  edt('ArrowRight', 'edit.caretRight', EDIT_ONLY, tr('bindings.12')),

  // In Punta la freccia sposta il riferimento che si sta scrivendo.
  nav('ArrowUp', 'point.moveUp', POINT_ONLY, tr('bindings.13')),
  nav('ArrowDown', 'point.moveDown', POINT_ONLY, tr('bindings.14')),
  nav('ArrowLeft', 'point.moveLeft', POINT_ONLY, tr('bindings.15')),
  nav('ArrowRight', 'point.moveRight', POINT_ONLY, tr('bindings.16')),

  // Ctrl+frecce: salto al bordo del blocco dati.
  nav('Ctrl+ArrowUp', 'nav.blockUp', READY, tr('bindings.17')),
  nav('Ctrl+ArrowDown', 'nav.blockDown', READY, tr('bindings.18')),
  nav('Ctrl+ArrowLeft', 'nav.blockLeft', READY, tr('bindings.19')),
  nav('Ctrl+ArrowRight', 'nav.blockRight', READY, tr('bindings.20')),
  // ...ma dentro il testo Ctrl+Sinistra/Destra e' il salto di parola.
  edt('Ctrl+ArrowLeft', 'edit.caretWordLeft', TEXT_EDIT, tr('bindings.21')),
  edt('Ctrl+ArrowRight', 'edit.caretWordRight', TEXT_EDIT, tr('bindings.22')),

  // Maiusc+frecce: estensione di una cella.
  nav('Shift+ArrowUp', 'nav.extendUp', READY, tr('bindings.23')),
  nav('Shift+ArrowDown', 'nav.extendDown', READY, tr('bindings.24')),
  nav('Shift+ArrowLeft', 'nav.extendLeft', READY, tr('bindings.25')),
  nav('Shift+ArrowRight', 'nav.extendRight', READY, tr('bindings.26')),
  nav('Shift+ArrowUp', 'point.extendUp', POINT_ONLY, tr('bindings.27')),
  nav('Shift+ArrowDown', 'point.extendDown', POINT_ONLY, tr('bindings.28')),
  nav('Shift+ArrowLeft', 'point.extendLeft', POINT_ONLY, tr('bindings.29')),
  nav('Shift+ArrowRight', 'point.extendRight', POINT_ONLY, tr('bindings.30')),
  // Nel testo, Maiusc+Sinistra/Destra seleziona caratteri.
  edt('Shift+ArrowLeft', 'edit.selectCaretLeft', EDIT_ONLY, tr('bindings.31')),
  edt('Shift+ArrowRight', 'edit.selectCaretRight', EDIT_ONLY, tr('bindings.32')),

  // Ctrl+Maiusc+frecce: estensione con salto.
  nav('Ctrl+Shift+ArrowUp', 'nav.extendBlockUp', READY, tr('bindings.33')),
  nav('Ctrl+Shift+ArrowDown', 'nav.extendBlockDown', READY, tr('bindings.34')),
  nav('Ctrl+Shift+ArrowLeft', 'nav.extendBlockLeft', READY, tr('bindings.35')),
  nav('Ctrl+Shift+ArrowRight', 'nav.extendBlockRight', READY, tr('bindings.36')),

  // Home / Fine.
  nav('Home', 'nav.rowStart', READY, tr('bindings.37')),
  edt('Home', 'edit.caretLineStart', TEXT_EDIT, tr('bindings.38')),
  nav('End', 'nav.toggleEndMode', READY, tr('bindings.39')),
  edt('End', 'edit.caretLineEnd', TEXT_EDIT, tr('bindings.40')),
  nav('Shift+Home', 'nav.extendToRowStart', READY, tr('bindings.41')),
  edt('Shift+Home', 'edit.selectToLineStart', TEXT_EDIT, tr('bindings.42')),
  edt('Shift+End', 'edit.selectToLineEnd', TEXT_EDIT, tr('bindings.43')),
  nav('Ctrl+Home', 'nav.sheetStart', READY, tr('bindings.44')),
  nav('Ctrl+End', 'nav.sheetEnd', READY, tr('bindings.45')),
  nav('Ctrl+Shift+Home', 'nav.extendToSheetStart', READY, tr('bindings.46')),
  nav('Ctrl+Shift+End', 'nav.extendToSheetEnd', READY, tr('bindings.47')),

  // Pagine e fogli.
  nav('PageUp', 'nav.pageUp', READY, tr('bindings.48')),
  nav('PageDown', 'nav.pageDown', READY, tr('bindings.49')),
  nav('Shift+PageUp', 'nav.extendPageUp', READY, tr('bindings.50')),
  nav('Shift+PageDown', 'nav.extendPageDown', READY, tr('bindings.51')),
  nav('Alt+PageUp', 'nav.pageLeft', READY, tr('bindings.52')),
  nav('Alt+PageDown', 'nav.pageRight', READY, tr('bindings.53')),
  nav('Ctrl+PageUp', 'nav.prevSheet', READY, tr('bindings.54')),
  nav('Ctrl+PageDown', 'nav.nextSheet', READY, tr('bindings.55')),

  // Tab e Invio: da Pronto navigano, da editor confermano.
  nav('Tab', 'nav.tabNext', READY, tr('bindings.56')),
  nav('Shift+Tab', 'nav.tabPrev', READY, tr('bindings.57')),
  // Tab non e' "conferma e vai a destra": apre la catena che Invio chiude
  // riportando il cursore a capo. La freccia destra, invece, conferma e basta.
  edt('Tab', 'edit.confirmAndTabNext', TYPING, tr('bindings.58')),
  edt('Shift+Tab', 'edit.confirmAndTabPrev', TYPING, tr('bindings.59')),
  nav('Enter', 'nav.enterNext', READY, tr('bindings.60')),
  nav('Shift+Enter', 'nav.enterPrev', READY, tr('bindings.61')),
  edt('Enter', 'edit.confirmAndMoveDown', TYPING, tr('bindings.62')),
  edt('Shift+Enter', 'edit.confirmAndMoveUp', TYPING, tr('bindings.63')),

  // Vai a: due firme per lo stesso comando, come in Excel.
  nav('F5', 'nav.goTo', READY, tr('bindings.64')),
  nav('Ctrl+G', 'nav.goTo', READY, tr('bindings.65')),

  // Audit di navigazione.
  nav('Ctrl+BracketLeft', 'nav.selectPrecedents', READY, tr('bindings.66')),
  nav('Ctrl+BracketRight', 'nav.selectDependents', READY, tr('bindings.67')),

  nav('F8', 'nav.toggleExtendMode', READY, tr('bindings.68')),
  nav('Ctrl+.', 'nav.nextSelectionCorner', READY, tr('bindings.69')),

  // -------------------------------------------------------------------------
  // Editing (§3.1 "Editing")
  // -------------------------------------------------------------------------

  edt('F2', 'edit.begin', READY, tr('bindings.70')),
  edt('F2', 'edit.toggleEditPoint', TYPING, tr('bindings.71')),

  // Esc: da Pronto smonta lo stato transitorio (marching ants, Estendi,
  // selezione multipla in costruzione); da editor annulla la modifica.
  edt('Escape', 'clipboard.clearMarquee', READY, tr('bindings.72')),
  edt('Escape', 'edit.cancel', TYPING, tr('bindings.73')),

  edt('Delete', 'edit.clearContents', READY, tr('bindings.74')),
  edt('Delete', 'edit.deleteForward', TYPING, tr('bindings.75')),
  edt('Backspace', 'edit.clearAndBegin', READY, tr('bindings.76')),
  edt('Backspace', 'edit.deleteBackward', TYPING, tr('bindings.77')),

  edt('Ctrl+Enter', 'edit.fillSelection', ANY, tr('bindings.78')),
  edt('Alt+Enter', 'edit.newlineInCell', TYPING, tr('bindings.79')),

  edt('Ctrl+D', 'edit.fillDown', READY, tr('bindings.80')),
  edt('Ctrl+R', 'edit.fillRight', READY, tr('bindings.81')),

  // F4: il caso contestuale per eccellenza. In Immissione Excel cicla comunque
  // gli ancoraggi del riferimento appena scritto, quindi TYPING e non IN_FORMULA.
  edt('F4', 'edit.cycleAnchor', TYPING, tr('bindings.82')),
  edt('F4', 'edit.repeatLastAction', READY, tr('bindings.83')),

  // Appunti.
  edt('Ctrl+C', 'clipboard.copy', READY, 'Copia'),
  edt('Ctrl+X', 'clipboard.cut', READY, 'Taglia'),
  edt('Ctrl+V', 'clipboard.paste', READY, 'Incolla'),
  edt('Ctrl+Alt+V', 'clipboard.pasteSpecialDialog', READY, tr('bindings.84'), {
    requiresClipboard: true,
  }),

  edt('Ctrl+Quote', 'edit.copyFormulaFromAbove', READY, tr('bindings.85')),
  edt('Ctrl+Shift+Quote', 'edit.copyValueFromAbove', READY, tr('bindings.86')),

  edt('Ctrl+Z', 'edit.undo', READY, 'Annulla'),
  edt('Ctrl+Y', 'edit.redo', READY, 'Ripristina'),
  edt('Ctrl+A', 'edit.selectAll', READY, tr('bindings.87')),
  edt('Ctrl+F', 'edit.find', READY, 'Trova'),
  edt('Ctrl+H', 'edit.replace', READY, 'Sostituisci'),

  // -------------------------------------------------------------------------
  // Struttura (§3.1 "Struttura")
  // -------------------------------------------------------------------------

  // Ctrl+Maiusc++ : sulla riga dei numeri il "+" e' Maiusc+"=", sul tastierino
  // e' un tasto suo. Due firme, stesso comando.
  str('Ctrl+Shift+=', 'structure.insertDialog', READY, tr('bindings.88')),
  str('Ctrl++', 'structure.insertDialog', READY, tr('bindings.89')),
  str('Ctrl+-', 'structure.deleteDialog', READY, tr('bindings.90')),

  str('Ctrl+Space', 'structure.selectColumn', READY, tr('bindings.91')),
  str('Shift+Space', 'structure.selectRow', READY, tr('bindings.92')),

  str('Alt+Shift+ArrowRight', 'structure.group', READY, tr('bindings.93')),
  str('Alt+Shift+ArrowLeft', 'structure.ungroup', READY, tr('bindings.94')),

  str('Ctrl+9', 'structure.hideRows', READY, tr('bindings.95')),
  str('Ctrl+0', 'structure.hideCols', READY, tr('bindings.96')),
  str('Ctrl+Shift+9', 'structure.unhideRows', READY, tr('bindings.97')),
  str('Ctrl+Shift+0', 'structure.unhideCols', READY, tr('bindings.98')),

  // -------------------------------------------------------------------------
  // Formattazione (§3.1 "Formattazione")
  // -------------------------------------------------------------------------

  fmt('Ctrl+1', 'format.cellsDialog', READY, tr('bindings.99')),
  fmt('Ctrl+B', 'format.bold', READY, 'Grassetto'),
  fmt('Ctrl+I', 'format.italic', READY, 'Corsivo'),
  fmt('Ctrl+U', 'format.underline', READY, 'Sottolineato'),

  fmt('Ctrl+Shift+1', 'format.numberTwoDecimals', READY, tr('bindings.100')),
  fmt('Ctrl+Shift+2', 'format.time', READY, tr('bindings.101')),
  fmt('Ctrl+Shift+3', 'format.date', READY, tr('bindings.102')),
  fmt('Ctrl+Shift+4', 'format.currency', READY, tr('bindings.103')),
  fmt('Ctrl+Shift+5', 'format.percent', READY, tr('bindings.104')),
  fmt('Ctrl+Shift+6', 'format.exponential', READY, tr('bindings.105')),
  fmt('Ctrl+Shift+7', 'format.borderOutside', READY, tr('bindings.106')),
  fmt('Ctrl+Shift+-', 'format.borderNone', READY, tr('bindings.107')),
  fmt('Ctrl+Shift+Backquote', 'format.general', READY, tr('bindings.108')),

  // Ingresso alle sequenze Alt legacy: da qui in poi comanda `altSequence.ts`
  // (Alt,H,O,I autofit colonna; Alt,H,H riempimento; Alt,H,F,C carattere;
  // Alt,H,B bordi; Alt,A,S,S ordina; Alt,M,P/D individua precedenti/dipendenti).
  fmt('Alt', 'altMenu.open', READY, tr('bindings.109')),

  // -------------------------------------------------------------------------
  // Formule e audit (§3.1 "Formule e audit")
  // -------------------------------------------------------------------------

  // Alt+= e' anche una foglia della radice dell'albero Alt: chi lo preme come
  // accordo passa di qui, chi fa Alt poi "=" passa da altSequence.
  fml('Alt+=', 'formula.autosum', ANY, tr('bindings.110')),
  fml('Ctrl+Backquote', 'formula.toggleShowFormulas', READY, tr('bindings.111')),

  // F9: con un frammento selezionato lo valuta, altrimenti ricalcola.
  // Il guard `requiresTextSelection` vince sul binding generico.
  fml('F9', 'formula.evaluateFragment', IN_FORMULA, tr('bindings.112'), {
    requiresTextSelection: true,
  }),
  fml('F9', 'formula.recalculate', ANY, tr('bindings.113')),
  fml('Shift+F9', 'formula.recalculateSheet', ANY, tr('bindings.114')),
  fml('Ctrl+Alt+F9', 'formula.recalculateFull', ANY, tr('bindings.115')),

  fml('Shift+F3', 'formula.insertFunction', ANY, tr('bindings.116')),
  fml('Ctrl+Shift+Enter', 'formula.arrayEnter', TYPING, tr('bindings.117')),

  fml('Ctrl+F3', 'name.manager', READY, tr('bindings.118')),
  fml('Ctrl+Shift+F3', 'name.createFromSelection', READY, tr('bindings.119')),
  fml('F3', 'name.paste', TYPING, tr('bindings.120')),
  // Estensione del gioco: Excel non ha un tasto documentato per la casella
  // Nome, ma senza mouse serve un modo per arrivarci (§3.3 modalità mouse-free).
  fml('Alt+F3', 'name.focusNameBox', READY, tr('bindings.121')),

  // -------------------------------------------------------------------------
  // Altro (§3.1 "Altro" e interfaccia del gioco §3.2)
  // -------------------------------------------------------------------------

  oth('Ctrl+Shift+L', 'data.filter', READY, tr('bindings.122')),

  // "?" apre il cheat sheet solo da Pronto: mentre digiti e' un carattere.
  oth('?', 'ui.toggleCheatSheet', READY, tr('bindings.123')),
  oth('F1', 'game.hint', READY, tr('bindings.124')),
  oth('Ctrl+F1', 'ui.toggleTaskPanel', READY, tr('bindings.125')),
  oth('Ctrl+Shift+M', 'ui.toggleMouseFree', ANY, tr('bindings.126')),
  oth('F12', 'game.verify', READY, tr('bindings.127')),
];

// ---------------------------------------------------------------------------
// Incolla speciale: sotto-keymap del dialogo (§3.1)
// ---------------------------------------------------------------------------

export interface PasteSpecialOption {
  /** Tasto singolo, maiuscolo, come nella finestra di Excel. */
  readonly key: string;
  readonly command: Command;
  readonly label: string;
}

/**
 * Vive qui e non in `BINDINGS` perche' non sono scorciatoie globali: valgono
 * solo mentre il dialogo di Ctrl+Alt+V e' aperto, esattamente come le lettere
 * di un menu. Le lettere sono quelle di Excel (A/F/V/T/E/M), non tradotte:
 * chi impara qui deve ritrovarle identiche in ufficio.
 */
export const PASTE_SPECIAL_OPTIONS: readonly PasteSpecialOption[] = [
  { key: 'A', command: 'clipboard.pasteAll', label: tr('bindings.128') },
  { key: 'F', command: 'clipboard.pasteFormulas', label: tr('bindings.129') },
  { key: 'V', command: 'clipboard.pasteValues', label: tr('bindings.130') },
  { key: 'T', command: 'clipboard.pasteFormats', label: tr('bindings.131') },
  { key: 'E', command: 'clipboard.pasteTranspose', label: tr('bindings.132') },
  { key: 'M', command: 'clipboard.pasteMultiply', label: tr('bindings.133') },
];

// ---------------------------------------------------------------------------
// Indice e risoluzione
// ---------------------------------------------------------------------------

/** Firma -> binding, nell'ordine di dichiarazione. */
const BY_SIGNATURE: ReadonlyMap<string, readonly Binding[]> = (() => {
  const map = new Map<string, Binding[]>();
  for (const b of BINDINGS) {
    const list = map.get(b.signature);
    if (list) list.push(b);
    else map.set(b.signature, [b]);
  }
  return map;
})();

/**
 * Risolve una firma nel comando da eseguire, o `undefined` se in questo
 * contesto il tasto non fa niente (e allora la griglia lo tratta come
 * digitazione o lo ignora).
 *
 * Precedenza: il binding con un guard soddisfatto batte quello generico. E'
 * cio' che fa funzionare F9 (frammento selezionato) sopra F9 (ricalcola).
 */
export function resolveBinding(signature: string, ctx: BindingContext): Command | undefined {
  const candidates = BY_SIGNATURE.get(signature);
  if (candidates === undefined) return undefined;

  let generic: Binding | undefined;
  for (const b of candidates) {
    if (!b.modes.includes(ctx.mode)) continue;
    // Appunti vuoti: Ctrl+Alt+V non apre nulla, come in Excel.
    if (b.requiresClipboard === true && ctx.clipboardEmpty === true) continue;
    if (b.requiresTextSelection === true) {
      if (ctx.hasTextSelection) return b.command;
      continue;
    }
    generic ??= b;
  }
  return generic?.command;
}

/** Tutti i binding di un comando: il cheat sheet mostra "F5 / Ctrl+G". */
export function bindingsForCommand(command: Command): Binding[] {
  return BINDINGS.filter((b) => b.command === command);
}

/** Tutte le firme distinte della tabella, in ordine di dichiarazione. */
export function allSignatures(): string[] {
  return [...BY_SIGNATURE.keys()];
}

/** I binding registrati per una firma (vuoto se non esiste). */
export function bindingsForSignature(signature: string): readonly Binding[] {
  return BY_SIGNATURE.get(signature) ?? [];
}

/**
 * Due binding sono in conflitto se, a parita' di firma, esiste una modalita' in
 * cui sono entrambi selezionabili con lo stesso guard: in quel caso il
 * risolutore dovrebbe tirare a sorte. Esportata perche' e' un'asserzione di
 * correttezza della tabella, non una funzionalita' di runtime.
 */
export function findBindingConflicts(): string[] {
  const conflicts: string[] = [];
  for (const [signature, list] of BY_SIGNATURE) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if ((a.requiresTextSelection ?? false) !== (b.requiresTextSelection ?? false)) continue;
        if ((a.requiresClipboard ?? false) !== (b.requiresClipboard ?? false)) continue;
        const shared = a.modes.filter((m) => b.modes.includes(m));
        if (shared.length > 0) {
          conflicts.push(`${signature} in [${shared.join(', ')}]: ${a.command} vs ${b.command}`);
        }
      }
    }
  }
  return conflicts;
}
