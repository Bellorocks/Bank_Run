/**
 * Catalogo dei comandi (BUILD SPEC §3.1).
 *
 * Qui NON c'e' logica: solo i nomi. Sono le chiavi del dispatcher e il
 * vocabolario comune fra `bindings.ts`, `altSequence.ts`, il cheat sheet,
 * l'`InputRecorder` (che logga il comando, non il tasto: il tasto cambia col
 * layout, il comando no) e le statistiche per-skill.
 *
 * Regola di naming: `dominio.azioneInCamelCase`. Il dominio e' l'unita' di
 * lavoro che eseguira' il comando, non la categoria del cheat sheet.
 */

// ---------------------------------------------------------------------------
// Navigazione
// ---------------------------------------------------------------------------

export type NavigationCommand =
  | 'nav.moveUp'
  | 'nav.moveDown'
  | 'nav.moveLeft'
  | 'nav.moveRight'
  /** Ctrl+frecce: salto al bordo del blocco dati. */
  | 'nav.blockUp'
  | 'nav.blockDown'
  | 'nav.blockLeft'
  | 'nav.blockRight'
  /** Maiusc+frecce: estensione di una cella. */
  | 'nav.extendUp'
  | 'nav.extendDown'
  | 'nav.extendLeft'
  | 'nav.extendRight'
  /** Ctrl+Maiusc+frecce: estensione con salto al bordo del blocco. */
  | 'nav.extendBlockUp'
  | 'nav.extendBlockDown'
  | 'nav.extendBlockLeft'
  | 'nav.extendBlockRight'
  | 'nav.rowStart'
  | 'nav.sheetStart'
  | 'nav.sheetEnd'
  | 'nav.extendToRowStart'
  | 'nav.extendToSheetStart'
  | 'nav.extendToSheetEnd'
  | 'nav.pageUp'
  | 'nav.pageDown'
  | 'nav.extendPageUp'
  | 'nav.extendPageDown'
  /** Alt+PagSu / Alt+PagGiu: una schermata a sinistra / a destra. */
  | 'nav.pageLeft'
  | 'nav.pageRight'
  | 'nav.prevSheet'
  | 'nav.nextSheet'
  | 'nav.tabNext'
  | 'nav.tabPrev'
  | 'nav.enterNext'
  | 'nav.enterPrev'
  | 'nav.goTo'
  /** Ctrl+[ e Ctrl+]: seleziona le celle precedenti / dipendenti. */
  | 'nav.selectPrecedents'
  | 'nav.selectDependents'
  /** F8: modalita' "Estendi selezione". */
  | 'nav.toggleExtendMode'
  /** Fine: modalita' "Fine" (il prefisso di Fine+freccia). */
  | 'nav.toggleEndMode'
  /** Ctrl+. : ruota fra gli angoli della selezione. */
  | 'nav.nextSelectionCorner';

// ---------------------------------------------------------------------------
// Editing (celle e barra della formula)
// ---------------------------------------------------------------------------

export type EditingCommand =
  | 'edit.begin'
  /** F2 dentro l'editing: alterna Modifica <-> Punta. */
  | 'edit.toggleEditPoint'
  | 'edit.confirm'
  | 'edit.cancel'
  | 'edit.clearContents'
  /** Backspace da stato Pronto: svuota la cella e apre l'editing. */
  | 'edit.clearAndBegin'
  | 'edit.deleteForward'
  | 'edit.deleteBackward'
  | 'edit.caretUp'
  | 'edit.caretDown'
  | 'edit.caretLeft'
  | 'edit.caretRight'
  | 'edit.caretWordLeft'
  | 'edit.caretWordRight'
  | 'edit.caretLineStart'
  | 'edit.caretLineEnd'
  | 'edit.selectCaretLeft'
  | 'edit.selectCaretRight'
  | 'edit.selectToLineStart'
  | 'edit.selectToLineEnd'
  | 'edit.confirmAndMoveUp'
  | 'edit.confirmAndMoveDown'
  | 'edit.confirmAndMoveLeft'
  | 'edit.confirmAndMoveRight'
  /**
   * Conferma con Tab. Distinto da `confirmAndMoveRight` perche' il Tab APRE (o
   * prosegue) la catena che Invio poi chiude tornando a capo; la freccia destra
   * conferma e basta. Sono due tasti che sembrano fare la stessa cosa e non la fanno.
   */
  | 'edit.confirmAndTabNext'
  | 'edit.confirmAndTabPrev'
  /** F4 in editing: A1 -> $A$1 -> A$1 -> $A1 -> A1. */
  | 'edit.cycleAnchor'
  /** F4 fuori editing: ripeti l'ultima azione. */
  | 'edit.repeatLastAction'
  | 'edit.fillSelection'
  | 'edit.newlineInCell'
  | 'edit.fillDown'
  | 'edit.fillRight'
  /** Ctrl+' : copia la FORMULA della cella sopra, senza traslare i riferimenti. */
  | 'edit.copyFormulaFromAbove'
  /** Ctrl+Maiusc+' : copia il VALORE della cella sopra. */
  | 'edit.copyValueFromAbove'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.selectAll'
  | 'edit.find'
  | 'edit.replace';

/** Modalita' "Punta": il cursore sta scegliendo un riferimento dentro una formula. */
export type PointCommand =
  | 'point.moveUp'
  | 'point.moveDown'
  | 'point.moveLeft'
  | 'point.moveRight'
  | 'point.extendUp'
  | 'point.extendDown'
  | 'point.extendLeft'
  | 'point.extendRight';

// ---------------------------------------------------------------------------
// Appunti e incolla speciale
// ---------------------------------------------------------------------------

export type ClipboardCommand =
  | 'clipboard.copy'
  | 'clipboard.cut'
  | 'clipboard.paste'
  /** Ctrl+Alt+V: apre il dialogo con la sotto-keymap A/F/V/T/E/M. */
  | 'clipboard.pasteSpecialDialog'
  /** Esc da stato Pronto: toglie il bordo tratteggiato degli appunti. */
  | 'clipboard.clearMarquee'
  | 'clipboard.pasteAll'
  | 'clipboard.pasteFormulas'
  | 'clipboard.pasteValues'
  | 'clipboard.pasteFormats'
  | 'clipboard.pasteTranspose'
  | 'clipboard.pasteMultiply';

// ---------------------------------------------------------------------------
// Struttura del foglio
// ---------------------------------------------------------------------------

export type StructureCommand =
  | 'structure.insertDialog'
  | 'structure.deleteDialog'
  | 'structure.selectColumn'
  | 'structure.selectRow'
  | 'structure.group'
  | 'structure.ungroup'
  | 'structure.hideRows'
  | 'structure.hideCols'
  | 'structure.unhideRows'
  | 'structure.unhideCols'
  | 'structure.autofitColumn'
  | 'structure.autofitRow'
  | 'structure.columnWidth'
  | 'structure.rowHeight'
  | 'structure.freezePanes';

// ---------------------------------------------------------------------------
// Formattazione
// ---------------------------------------------------------------------------

export type FormatCommand =
  | 'format.cellsDialog'
  | 'format.bold'
  | 'format.italic'
  | 'format.underline'
  /** Ctrl+Maiusc+1: numero con separatore migliaia e 2 decimali. */
  | 'format.numberTwoDecimals'
  | 'format.time'
  | 'format.date'
  | 'format.currency'
  | 'format.percent'
  | 'format.exponential'
  | 'format.general'
  | 'format.fillColor'
  | 'format.fontColor'
  | 'format.borderAll'
  | 'format.borderOutside'
  | 'format.borderBottom'
  | 'format.borderTop'
  | 'format.borderLeft'
  | 'format.borderRight'
  | 'format.borderNone';

// ---------------------------------------------------------------------------
// Formule e audit
// ---------------------------------------------------------------------------

export type FormulaCommand =
  | 'formula.autosum'
  /** Ctrl+` : mostra le formule al posto dei valori. */
  | 'formula.toggleShowFormulas'
  | 'formula.tracePrecedents'
  | 'formula.traceDependents'
  | 'formula.removeArrows'
  /** F9 su un frammento selezionato: lo sostituisce col suo valore (killer feature del debug). */
  | 'formula.evaluateFragment'
  | 'formula.recalculate'
  | 'formula.recalculateSheet'
  | 'formula.recalculateFull'
  | 'formula.insertFunction'
  /** Ctrl+Maiusc+Invio: immissione in forma di matrice (CSE legacy). */
  | 'formula.arrayEnter'
  | 'name.manager'
  | 'name.createFromSelection'
  | 'name.focusNameBox'
  | 'name.paste';

// ---------------------------------------------------------------------------
// Dati
// ---------------------------------------------------------------------------

export type DataCommand = 'data.sort' | 'data.filter';

// ---------------------------------------------------------------------------
// Interfaccia del gioco
// ---------------------------------------------------------------------------

export type UiCommand =
  /** Overlay "?" — aprirlo costa XP e viene tracciato (§3.2, §6). */
  | 'ui.toggleCheatSheet'
  | 'ui.toggleTaskPanel'
  | 'ui.toggleMouseFree'
  | 'game.verify'
  | 'game.hint'
  /** La barra Alt e' uno stato dell'interfaccia, non un'azione sul foglio. */
  | 'altMenu.open'
  | 'altMenu.cancel';

export type Command =
  | NavigationCommand
  | EditingCommand
  | PointCommand
  | ClipboardCommand
  | StructureCommand
  | FormatCommand
  | FormulaCommand
  | DataCommand
  | UiCommand;
