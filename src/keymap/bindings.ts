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
  nav('ArrowUp', 'nav.moveUp', READY, 'Sposta la selezione in alto'),
  nav('ArrowDown', 'nav.moveDown', READY, 'Sposta la selezione in basso'),
  nav('ArrowLeft', 'nav.moveLeft', READY, 'Sposta la selezione a sinistra'),
  nav('ArrowRight', 'nav.moveRight', READY, 'Sposta la selezione a destra'),

  // In Immissione (stai digitando) la freccia CONFERMA e si sposta.
  edt('ArrowUp', 'edit.confirmAndMoveUp', ['enter'], 'Conferma e sale (durante la digitazione)'),
  edt('ArrowDown', 'edit.confirmAndMoveDown', ['enter'], 'Conferma e scende (durante la digitazione)'),
  edt('ArrowLeft', 'edit.confirmAndMoveLeft', ['enter'], 'Conferma e va a sinistra (durante la digitazione)'),
  edt('ArrowRight', 'edit.confirmAndMoveRight', ['enter'], 'Conferma e va a destra (durante la digitazione)'),

  // In Modifica (F2) la freccia muove il CARET dentro il testo: niente navigazione.
  edt('ArrowUp', 'edit.caretUp', EDIT_ONLY, 'Riga precedente del testo in modifica'),
  edt('ArrowDown', 'edit.caretDown', EDIT_ONLY, 'Riga successiva del testo in modifica'),
  edt('ArrowLeft', 'edit.caretLeft', EDIT_ONLY, 'Cursore a sinistra nel testo'),
  edt('ArrowRight', 'edit.caretRight', EDIT_ONLY, 'Cursore a destra nel testo'),

  // In Punta la freccia sposta il riferimento che si sta scrivendo.
  nav('ArrowUp', 'point.moveUp', POINT_ONLY, 'Sposta in alto il riferimento puntato'),
  nav('ArrowDown', 'point.moveDown', POINT_ONLY, 'Sposta in basso il riferimento puntato'),
  nav('ArrowLeft', 'point.moveLeft', POINT_ONLY, 'Sposta a sinistra il riferimento puntato'),
  nav('ArrowRight', 'point.moveRight', POINT_ONLY, 'Sposta a destra il riferimento puntato'),

  // Ctrl+frecce: salto al bordo del blocco dati.
  nav('Ctrl+ArrowUp', 'nav.blockUp', READY, 'Salta al bordo superiore del blocco dati'),
  nav('Ctrl+ArrowDown', 'nav.blockDown', READY, 'Salta al bordo inferiore del blocco dati'),
  nav('Ctrl+ArrowLeft', 'nav.blockLeft', READY, 'Salta al bordo sinistro del blocco dati'),
  nav('Ctrl+ArrowRight', 'nav.blockRight', READY, 'Salta al bordo destro del blocco dati'),
  // ...ma dentro il testo Ctrl+Sinistra/Destra e' il salto di parola.
  edt('Ctrl+ArrowLeft', 'edit.caretWordLeft', TEXT_EDIT, 'Parola precedente nel testo'),
  edt('Ctrl+ArrowRight', 'edit.caretWordRight', TEXT_EDIT, 'Parola successiva nel testo'),

  // Maiusc+frecce: estensione di una cella.
  nav('Shift+ArrowUp', 'nav.extendUp', READY, 'Estende la selezione in alto'),
  nav('Shift+ArrowDown', 'nav.extendDown', READY, 'Estende la selezione in basso'),
  nav('Shift+ArrowLeft', 'nav.extendLeft', READY, 'Estende la selezione a sinistra'),
  nav('Shift+ArrowRight', 'nav.extendRight', READY, 'Estende la selezione a destra'),
  nav('Shift+ArrowUp', 'point.extendUp', POINT_ONLY, 'Estende in alto il riferimento puntato'),
  nav('Shift+ArrowDown', 'point.extendDown', POINT_ONLY, 'Estende in basso il riferimento puntato'),
  nav('Shift+ArrowLeft', 'point.extendLeft', POINT_ONLY, 'Estende a sinistra il riferimento puntato'),
  nav('Shift+ArrowRight', 'point.extendRight', POINT_ONLY, 'Estende a destra il riferimento puntato'),
  // Nel testo, Maiusc+Sinistra/Destra seleziona caratteri.
  edt('Shift+ArrowLeft', 'edit.selectCaretLeft', EDIT_ONLY, 'Seleziona un carattere a sinistra'),
  edt('Shift+ArrowRight', 'edit.selectCaretRight', EDIT_ONLY, 'Seleziona un carattere a destra'),

  // Ctrl+Maiusc+frecce: estensione con salto.
  nav('Ctrl+Shift+ArrowUp', 'nav.extendBlockUp', READY, 'Estende fino al bordo superiore del blocco'),
  nav('Ctrl+Shift+ArrowDown', 'nav.extendBlockDown', READY, 'Estende fino al bordo inferiore del blocco'),
  nav('Ctrl+Shift+ArrowLeft', 'nav.extendBlockLeft', READY, 'Estende fino al bordo sinistro del blocco'),
  nav('Ctrl+Shift+ArrowRight', 'nav.extendBlockRight', READY, 'Estende fino al bordo destro del blocco'),

  // Home / Fine.
  nav('Home', 'nav.rowStart', READY, 'Vai alla prima colonna della riga'),
  edt('Home', 'edit.caretLineStart', TEXT_EDIT, 'Inizio della riga di testo'),
  nav('End', 'nav.toggleEndMode', READY, 'Attiva la modalità Fine (Fine + freccia)'),
  edt('End', 'edit.caretLineEnd', TEXT_EDIT, 'Fine della riga di testo'),
  nav('Shift+Home', 'nav.extendToRowStart', READY, 'Estende fino alla prima colonna della riga'),
  edt('Shift+Home', 'edit.selectToLineStart', TEXT_EDIT, 'Seleziona fino a inizio riga di testo'),
  edt('Shift+End', 'edit.selectToLineEnd', TEXT_EDIT, 'Seleziona fino a fine riga di testo'),
  nav('Ctrl+Home', 'nav.sheetStart', READY, 'Vai a A1'),
  nav('Ctrl+End', 'nav.sheetEnd', READY, "Vai all'ultima cella usata del foglio"),
  nav('Ctrl+Shift+Home', 'nav.extendToSheetStart', READY, 'Estende la selezione fino ad A1'),
  nav('Ctrl+Shift+End', 'nav.extendToSheetEnd', READY, "Estende fino all'ultima cella usata"),

  // Pagine e fogli.
  nav('PageUp', 'nav.pageUp', READY, 'Una schermata in su'),
  nav('PageDown', 'nav.pageDown', READY, 'Una schermata in giù'),
  nav('Shift+PageUp', 'nav.extendPageUp', READY, 'Estende di una schermata in su'),
  nav('Shift+PageDown', 'nav.extendPageDown', READY, 'Estende di una schermata in giù'),
  nav('Alt+PageUp', 'nav.pageLeft', READY, 'Una schermata a sinistra'),
  nav('Alt+PageDown', 'nav.pageRight', READY, 'Una schermata a destra'),
  nav('Ctrl+PageUp', 'nav.prevSheet', READY, 'Foglio precedente'),
  nav('Ctrl+PageDown', 'nav.nextSheet', READY, 'Foglio successivo'),

  // Tab e Invio: da Pronto navigano, da editor confermano.
  nav('Tab', 'nav.tabNext', READY, 'Cella a destra (e ritorno a capo dopo Invio)'),
  nav('Shift+Tab', 'nav.tabPrev', READY, 'Cella a sinistra'),
  // Tab non e' "conferma e vai a destra": apre la catena che Invio chiude
  // riportando il cursore a capo. La freccia destra, invece, conferma e basta.
  edt('Tab', 'edit.confirmAndTabNext', TYPING, 'Conferma e passa alla cella a destra (apre la catena)'),
  edt('Shift+Tab', 'edit.confirmAndTabPrev', TYPING, 'Conferma e passa alla cella a sinistra'),
  nav('Enter', 'nav.enterNext', READY, 'Scendi di una cella'),
  nav('Shift+Enter', 'nav.enterPrev', READY, 'Sali di una cella'),
  edt('Enter', 'edit.confirmAndMoveDown', TYPING, 'Conferma la modifica e scendi'),
  edt('Shift+Enter', 'edit.confirmAndMoveUp', TYPING, 'Conferma la modifica e sali'),

  // Vai a: due firme per lo stesso comando, come in Excel.
  nav('F5', 'nav.goTo', READY, 'Vai a... (indirizzo o nome)'),
  nav('Ctrl+G', 'nav.goTo', READY, 'Vai a... (indirizzo o nome)'),

  // Audit di navigazione.
  nav('Ctrl+BracketLeft', 'nav.selectPrecedents', READY, 'Seleziona le celle precedenti'),
  nav('Ctrl+BracketRight', 'nav.selectDependents', READY, 'Seleziona le celle dipendenti'),

  nav('F8', 'nav.toggleExtendMode', READY, 'Modalità Estendi selezione'),
  nav('Ctrl+.', 'nav.nextSelectionCorner', READY, 'Ruota fra gli angoli della selezione'),

  // -------------------------------------------------------------------------
  // Editing (§3.1 "Editing")
  // -------------------------------------------------------------------------

  edt('F2', 'edit.begin', READY, 'Modifica la cella (cursore in fondo)'),
  edt('F2', 'edit.toggleEditPoint', TYPING, 'Alterna Modifica e Punta'),

  // Esc: da Pronto smonta lo stato transitorio (marching ants, Estendi,
  // selezione multipla in costruzione); da editor annulla la modifica.
  edt('Escape', 'clipboard.clearMarquee', READY, 'Annulla appunti, modalità Estendi e selezione multipla'),
  edt('Escape', 'edit.cancel', TYPING, 'Annulla la modifica'),

  edt('Delete', 'edit.clearContents', READY, 'Cancella il contenuto della selezione'),
  edt('Delete', 'edit.deleteForward', TYPING, 'Cancella il carattere a destra'),
  edt('Backspace', 'edit.clearAndBegin', READY, 'Svuota la cella e apri la modifica'),
  edt('Backspace', 'edit.deleteBackward', TYPING, 'Cancella il carattere a sinistra'),

  edt('Ctrl+Enter', 'edit.fillSelection', ANY, 'Compila tutta la selezione con la voce corrente'),
  edt('Alt+Enter', 'edit.newlineInCell', TYPING, 'A capo dentro la cella'),

  edt('Ctrl+D', 'edit.fillDown', READY, 'Ricopia verso il basso (fill down)'),
  edt('Ctrl+R', 'edit.fillRight', READY, 'Ricopia verso destra (fill right)'),

  // F4: il caso contestuale per eccellenza. In Immissione Excel cicla comunque
  // gli ancoraggi del riferimento appena scritto, quindi TYPING e non IN_FORMULA.
  edt('F4', 'edit.cycleAnchor', TYPING, 'Ciclo ancoraggi A1 → $A$1 → A$1 → $A1'),
  edt('F4', 'edit.repeatLastAction', READY, "Ripeti l'ultima azione"),

  // Appunti.
  edt('Ctrl+C', 'clipboard.copy', READY, 'Copia'),
  edt('Ctrl+X', 'clipboard.cut', READY, 'Taglia'),
  edt('Ctrl+V', 'clipboard.paste', READY, 'Incolla'),
  edt('Ctrl+Alt+V', 'clipboard.pasteSpecialDialog', READY, 'Incolla speciale... (V valori, F formule, T formati, E trasponi)', {
    requiresClipboard: true,
  }),

  edt('Ctrl+Quote', 'edit.copyFormulaFromAbove', READY, 'Copia la formula dalla cella sopra (senza traslare)'),
  edt('Ctrl+Shift+Quote', 'edit.copyValueFromAbove', READY, 'Copia il valore dalla cella sopra'),

  edt('Ctrl+Z', 'edit.undo', READY, 'Annulla'),
  edt('Ctrl+Y', 'edit.redo', READY, 'Ripristina'),
  edt('Ctrl+A', 'edit.selectAll', READY, 'Seleziona la regione corrente, poi tutto il foglio'),
  edt('Ctrl+F', 'edit.find', READY, 'Trova'),
  edt('Ctrl+H', 'edit.replace', READY, 'Sostituisci'),

  // -------------------------------------------------------------------------
  // Struttura (§3.1 "Struttura")
  // -------------------------------------------------------------------------

  // Ctrl+Maiusc++ : sulla riga dei numeri il "+" e' Maiusc+"=", sul tastierino
  // e' un tasto suo. Due firme, stesso comando.
  str('Ctrl+Shift+=', 'structure.insertDialog', READY, 'Inserisci celle/righe/colonne...'),
  str('Ctrl++', 'structure.insertDialog', READY, 'Inserisci celle/righe/colonne...'),
  str('Ctrl+-', 'structure.deleteDialog', READY, 'Elimina celle/righe/colonne...'),

  str('Ctrl+Space', 'structure.selectColumn', READY, 'Seleziona la colonna'),
  str('Shift+Space', 'structure.selectRow', READY, 'Seleziona la riga'),

  str('Alt+Shift+ArrowRight', 'structure.group', READY, 'Raggruppa righe/colonne'),
  str('Alt+Shift+ArrowLeft', 'structure.ungroup', READY, 'Separa righe/colonne'),

  str('Ctrl+9', 'structure.hideRows', READY, 'Nascondi righe'),
  str('Ctrl+0', 'structure.hideCols', READY, 'Nascondi colonne'),
  str('Ctrl+Shift+9', 'structure.unhideRows', READY, 'Mostra righe'),
  str('Ctrl+Shift+0', 'structure.unhideCols', READY, 'Mostra colonne'),

  // -------------------------------------------------------------------------
  // Formattazione (§3.1 "Formattazione")
  // -------------------------------------------------------------------------

  fmt('Ctrl+1', 'format.cellsDialog', READY, 'Formato celle...'),
  fmt('Ctrl+B', 'format.bold', READY, 'Grassetto'),
  fmt('Ctrl+I', 'format.italic', READY, 'Corsivo'),
  fmt('Ctrl+U', 'format.underline', READY, 'Sottolineato'),

  fmt('Ctrl+Shift+1', 'format.numberTwoDecimals', READY, 'Formato numero: separatore migliaia, 2 decimali'),
  fmt('Ctrl+Shift+2', 'format.time', READY, 'Formato ora'),
  fmt('Ctrl+Shift+3', 'format.date', READY, 'Formato data'),
  fmt('Ctrl+Shift+4', 'format.currency', READY, 'Formato valuta'),
  fmt('Ctrl+Shift+5', 'format.percent', READY, 'Formato percentuale'),
  fmt('Ctrl+Shift+6', 'format.exponential', READY, 'Formato esponenziale'),
  fmt('Ctrl+Shift+7', 'format.borderOutside', READY, 'Bordo esterno (box)'),
  fmt('Ctrl+Shift+-', 'format.borderNone', READY, 'Togli tutti i bordi'),
  fmt('Ctrl+Shift+Backquote', 'format.general', READY, 'Formato Generale'),

  // Ingresso alle sequenze Alt legacy: da qui in poi comanda `altSequence.ts`
  // (Alt,H,O,I autofit colonna; Alt,H,H riempimento; Alt,H,F,C carattere;
  // Alt,H,B bordi; Alt,A,S,S ordina; Alt,M,P/D individua precedenti/dipendenti).
  fmt('Alt', 'altMenu.open', READY, 'Apre la barra dei menu (sequenze Alt legacy)'),

  // -------------------------------------------------------------------------
  // Formule e audit (§3.1 "Formule e audit")
  // -------------------------------------------------------------------------

  // Alt+= e' anche una foglia della radice dell'albero Alt: chi lo preme come
  // accordo passa di qui, chi fa Alt poi "=" passa da altSequence.
  fml('Alt+=', 'formula.autosum', ANY, 'Somma automatica'),
  fml('Ctrl+Backquote', 'formula.toggleShowFormulas', READY, 'Mostra le formule al posto dei valori'),

  // F9: con un frammento selezionato lo valuta, altrimenti ricalcola.
  // Il guard `requiresTextSelection` vince sul binding generico.
  fml('F9', 'formula.evaluateFragment', IN_FORMULA, 'Valuta il frammento di formula selezionato', {
    requiresTextSelection: true,
  }),
  fml('F9', 'formula.recalculate', ANY, 'Ricalcola le formule modificate'),
  fml('Shift+F9', 'formula.recalculateSheet', ANY, 'Ricalcola il foglio attivo'),
  fml('Ctrl+Alt+F9', 'formula.recalculateFull', ANY, 'Ricalcolo completo della cartella'),

  fml('Shift+F3', 'formula.insertFunction', ANY, 'Inserisci funzione...'),
  fml('Ctrl+Shift+Enter', 'formula.arrayEnter', TYPING, 'Conferma come formula in forma di matrice'),

  fml('Ctrl+F3', 'name.manager', READY, 'Gestione nomi'),
  fml('Ctrl+Shift+F3', 'name.createFromSelection', READY, 'Crea nomi dalla selezione'),
  fml('F3', 'name.paste', TYPING, 'Incolla un nome nella formula'),
  // Estensione del gioco: Excel non ha un tasto documentato per la casella
  // Nome, ma senza mouse serve un modo per arrivarci (§3.3 modalità mouse-free).
  fml('Alt+F3', 'name.focusNameBox', READY, 'Vai alla casella Nome'),

  // -------------------------------------------------------------------------
  // Altro (§3.1 "Altro" e interfaccia del gioco §3.2)
  // -------------------------------------------------------------------------

  oth('Ctrl+Shift+L', 'data.filter', READY, 'Attiva/disattiva i filtri'),

  // "?" apre il cheat sheet solo da Pronto: mentre digiti e' un carattere.
  oth('?', 'ui.toggleCheatSheet', READY, 'Mostra il cheat sheet (costa XP)'),
  oth('F1', 'game.hint', READY, 'Suggerimento (costa XP)'),
  oth('Ctrl+F1', 'ui.toggleTaskPanel', READY, 'Mostra/nascondi il pannello del mandato'),
  oth('Ctrl+Shift+M', 'ui.toggleMouseFree', ANY, 'Attiva/disattiva la modalità mouse-free'),
  oth('F12', 'game.verify', READY, 'Verifica il livello'),
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
  { key: 'A', command: 'clipboard.pasteAll', label: 'Tutto' },
  { key: 'F', command: 'clipboard.pasteFormulas', label: 'Formule' },
  { key: 'V', command: 'clipboard.pasteValues', label: 'Valori' },
  { key: 'T', command: 'clipboard.pasteFormats', label: 'Formati' },
  { key: 'E', command: 'clipboard.pasteTranspose', label: 'Trasponi' },
  { key: 'M', command: 'clipboard.pasteMultiply', label: 'Moltiplica' },
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
