/**
 * `GridSession` — il motore di interazione.
 *
 * E' il punto in cui i moduli puri (navigazione, selezione, formule, appunti)
 * diventano un foglio che si guida da tastiera. Volutamente SENZA React: la
 * sessione e' una classe normale, osservabile, che gira anche in Node. E' cosi'
 * che si testano le scorciatoie contro il comportamento di Excel senza montare
 * un DOM — il criterio di accettazione §13 chiede proprio questo.
 *
 * React ci si appoggia sopra e si limita a disegnare.
 *
 * Nota di localizzazione: il motore usa la convenzione internazionale (punto
 * decimale, virgola come separatore di argomenti), che e' quella dell'Excel in
 * inglese usato negli uffici di IB. L'interfaccia resta in italiano.
 */

import {
  coordToA1,
  a1ToCoord,
  normalizeRange,
  rangeToA1,
  type CellCoord,
  type RangeCoords,
} from '../engine/address';
import {
  ctrlEnd,
  ctrlHome,

  homeOfRow,
  jump,
  pageJump,
  pageJumpH,
  step,
  type Direction,
} from '../engine/navigation';
import {
  addArea,
  extendTo,
  isSingleCellSelection,
  moveAndExtend,
  moveTo,
  moveWithinSelection,
  selectAll,
  selectCol,
  selectRow,
  tabFrom,
  enterFrom,
} from '../engine/selection';
import {
  singleCellSelection,
  type CellRaw,
  type CellStyle,
  type EditState,
  type Selection,
  READY_EDIT_STATE,
} from '../engine/types';
import { Workbook } from '../engine/workbook';
import { cycleAnchoring } from '../engine/formula/anchoring';
import { selectFragment, replaceFragment, formatFragmentValue } from '../engine/formula/fragment';
import { shiftFormula } from '../engine/formula/refs';
import {
  buildClipboard,
  planPasteArea,
  resolvePasteTarget,
  parsePasteSpecialKey,
  DEFAULT_PASTE_OPTIONS,
  type ClipCell,
  type Clipboard,
  type PasteOptions,
} from '../engine/clipboard';
import { DEFAULT_FORMATS } from '../engine/numberFormat';
import { keySignature, isPrintableTyping, isModifierKey, type KeyLike } from '../keymap/keySignature';
import { resolveBinding } from '../keymap/bindings';
import { createAltMachine, EXCEL_ALT_TREE, type AltMachine } from '../keymap/altSequence';
import type { Command } from '../keymap/commands';
import { InputRecorder } from '../input/InputRecorder';
import { MODEL_COLORS } from '../styles/palette';
import { applyPercentEntry, normalizeTypedInput, type NumberLocale } from '../engine/typedInput';
import { numberLocale } from '../i18n/language';

import { tr } from '../i18n/ui';
export interface SessionOptions {
  /** Mouse-free: i click sulla griglia vengono ignorati e contati (§3.3). */
  readonly mouseFree?: boolean;
  /**
   * Blocco vero: nei livelli SPEEDRUN "il mouse e' disabilitato hard" (spec
   * §3.3) — non un default che l'utente puo' togliere dal pulsante HUD o dal
   * comando da tastiera. Con questo attivo, `setMouseFree(false)` e
   * `ui.toggleMouseFree` non hanno effetto: solo riattivarlo (true) e' permesso,
   * anche se non dovrebbe mai servire.
   */
  readonly mouseFreeLocked?: boolean;
  readonly visibleRows?: number;
  readonly visibleCols?: number;
  readonly recorder?: InputRecorder;
  /**
   * Aggancio per i comandi che non riguardano il foglio ma la partita
   * (`game.verify`, `game.hint`, apertura di dialoghi). Restituire `true`
   * significa "l'ho gestito io"; `false` lascia alla sessione il messaggio di
   * comando non implementato. Tenuto fuori dalla sessione perche' un foglio di
   * calcolo non deve sapere che esiste un punteggio.
   */
  readonly onGameCommand?: (command: Command) => boolean;
  /**
   * Convenzione numerica con cui interpretare cio' che si digita (decimale con
   * virgola o punto). Default: quella della lingua dell'interfaccia.
   */
  readonly inputLocale?: () => NumberLocale;
}

export interface SessionSnapshot {
  readonly sheet: number;
  readonly selection: Selection;
  readonly edit: EditState;
  readonly showFormulas: boolean;
  readonly mouseFree: boolean;
  readonly mouseFreeLocked: boolean;
  readonly mouseBlocked: number;
  readonly cheatSheetOpen: boolean;
  readonly altPath: string;
  readonly pasteSpecialOpen: boolean;
  readonly clipboardRange: RangeCoords | null;
  readonly status: string;
  readonly revision: number;
}

type Listener = (s: SessionSnapshot) => void;

export class GridSession {
  readonly workbook: Workbook;
  readonly recorder: InputRecorder;

  private sheet: number;
  private selection: Selection;
  private edit: EditState = READY_EDIT_STATE;

  private clipboard: Clipboard | null = null;
  private pasteOptions: PasteOptions = { ...DEFAULT_PASTE_OPTIONS };
  private pasteSpecialOpen = false;

  private readonly alt: AltMachine = createAltMachine(EXCEL_ALT_TREE);
  private altActive = false;

  private mouseFree: boolean;
  private readonly mouseFreeLocked: boolean;
  private mouseBlocked = 0;
  private showFormulas = false;
  private cheatSheetOpen = false;
  private status = '';
  private revision = 0;

  private visibleRows: number;
  private visibleCols: number;

  /** Ultima azione ripetibile con F4 fuori editing. */
  private lastAction: { command: Command } | null = null;

  private readonly onGameCommand?: (command: Command) => boolean;
  private readonly inputLocale: () => NumberLocale;

  private listeners = new Set<Listener>();

  constructor(workbook: Workbook, start: { sheet: number; row: number; col: number }, opts: SessionOptions = {}) {
    this.workbook = workbook;
    this.sheet = start.sheet;
    this.selection = singleCellSelection(start.sheet, { row: start.row, col: start.col });
    this.mouseFreeLocked = opts.mouseFreeLocked ?? false;
    // Lockato -> il livello parte gia' mouse-free, qualunque cosa dica opts.mouseFree:
    // "hard" nello spec §3.3 significa che non c'e' un momento in cui il mouse funziona.
    this.mouseFree = this.mouseFreeLocked ? true : (opts.mouseFree ?? false);
    this.visibleRows = opts.visibleRows ?? 30;
    this.visibleCols = opts.visibleCols ?? 12;
    this.recorder = opts.recorder ?? new InputRecorder();
    this.onGameCommand = opts.onGameCommand;
    this.inputLocale = opts.inputLocale ?? (() => numberLocale());
  }

  // -------------------------------------------------------------------------
  // Osservabilita'
  // -------------------------------------------------------------------------

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  snapshot(): SessionSnapshot {
    return {
      sheet: this.sheet,
      selection: this.selection,
      edit: this.edit,
      showFormulas: this.showFormulas,
      mouseFree: this.mouseFree,
      mouseFreeLocked: this.mouseFreeLocked,
      mouseBlocked: this.mouseBlocked,
      cheatSheetOpen: this.cheatSheetOpen,
      altPath: this.altActive ? this.alt.pathLabel() : '',
      pasteSpecialOpen: this.pasteSpecialOpen,
      clipboardRange: this.clipboard ? this.clipboard.source.range : null,
      status: this.status,
      revision: this.revision,
    };
  }

  private emit(): void {
    this.revision += 1;
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }

  private say(message: string): void {
    this.status = message;
  }

  /** Messaggio nella barra di stato, dall'esterno della sessione (es. la schermata di gioco). */
  announce(message: string): void {
    this.say(message);
    this.emit();
  }

  // -------------------------------------------------------------------------
  // Accessori
  // -------------------------------------------------------------------------

  get activeCell(): CellCoord {
    return this.selection.active;
  }

  get currentSheet(): number {
    return this.sheet;
  }

  get editState(): EditState {
    return this.edit;
  }

  get selectionState(): Selection {
    return this.selection;
  }

  private probe() {
    return this.workbook.probe(this.sheet);
  }

  setViewport(rows: number, cols: number): void {
    this.visibleRows = Math.max(1, rows);
    this.visibleCols = Math.max(1, cols);
  }

  setMouseFree(on: boolean): void {
    if (this.mouseFreeLocked && !on) return; // hard: non si disattiva mai
    this.mouseFree = on;
    this.emit();
  }

  /** Click sulla griglia. In mouse-free non fa nulla e viene contato in rosso. */
  clickCell(target: CellCoord, opts: { extend?: boolean; addArea?: boolean } = {}): boolean {
    this.recorder.record({ kind: 'mouse', target: 'grid', blocked: this.mouseFree });
    if (this.mouseFree) {
      this.mouseBlocked += 1;
      this.say(`MOUSE: ${this.mouseBlocked}`);
      this.emit();
      return false;
    }
    if (this.edit.mode !== 'ready') this.commitEdit();
    if (opts.addArea) {
      this.selection = addArea(this.selection, { top: target.row, left: target.col, bottom: target.row, right: target.col });
    } else if (opts.extend) {
      this.selection = extendTo(this.selection, target);
    } else {
      this.selection = moveTo(this.selection, target, this.probe());
    }
    this.emit();
    return true;
  }

  // -------------------------------------------------------------------------
  // Ingresso da tastiera
  // -------------------------------------------------------------------------

  /**
   * Unico punto d'ingresso. Restituisce `true` se l'evento e' stato consumato,
   * cosi' il chiamante puo' fare `preventDefault`: in un'app che allena la
   * muscle memory, un tasto che scivola al browser e' un bug funzionale.
   */
  handleKey(ev: KeyLike): boolean {
    if (isModifierKey(ev.key)) return false;
    // Primo tasto: parte il cronometro della run (no-op se gia' partito).
    this.recorder.start();

    const sig = keySignature(ev);

    // 1. Sotto-keymap dell'Incolla speciale: cattura tutto finche' e' aperta.
    if (this.pasteSpecialOpen && sig) {
      return this.feedPasteSpecial(ev.key);
    }

    // 2. Macchina a stati delle sequenze Alt.
    if (this.altActive) {
      const res = this.alt.feed(ev.key);
      this.recorder.record({ kind: 'key', signature: sig ?? ev.key, inEdit: false });
      if (res.state === 'fired' && res.command) {
        this.altActive = false;
        this.execute(res.command as Command);
        return true;
      }
      if (res.state === 'invalid') {
        this.altActive = false;
        this.say(tr('session.1'));
      } else if (res.state === 'idle') {
        this.altActive = false;
      }
      this.emit();
      return true;
    }

    if (sig) {
      const command = resolveBinding(sig, {
        mode: this.edit.mode,
        hasTextSelection: this.edit.selectionStart !== this.edit.selectionEnd,
        clipboardEmpty: this.clipboard === null,
      });
      if (command) {
        this.recorder.record({
          kind: 'key',
          signature: sig,
          command,
          inEdit: this.edit.mode !== 'ready',
        });
        this.execute(command);
        return true;
      }
    }

    // 3. Digitazione vera e propria.
    if (isPrintableTyping(ev)) {
      this.recorder.record({ kind: 'key', signature: sig ?? ev.key, inEdit: this.edit.mode !== 'ready' });
      this.typeCharacter(ev.key);
      return true;
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // Esecuzione dei comandi
  // -------------------------------------------------------------------------

  execute(command: Command): void {
    this.status = '';
    const ripetibile = this.applyCommand(command);
    if (ripetibile) this.lastAction = { command };
    this.emit();
  }

  /** Restituisce `true` se il comando e' ripetibile con F4. */
  private applyCommand(command: Command): boolean {
    switch (command) {
      // ------------------------------------------------------------ navigazione
      case 'nav.moveUp': return this.move('up'), false;
      case 'nav.moveDown': return this.move('down'), false;
      case 'nav.moveLeft': return this.move('left'), false;
      case 'nav.moveRight': return this.move('right'), false;

      case 'nav.blockUp': return this.moveJump('up'), false;
      case 'nav.blockDown': return this.moveJump('down'), false;
      case 'nav.blockLeft': return this.moveJump('left'), false;
      case 'nav.blockRight': return this.moveJump('right'), false;

      case 'nav.extendUp': return this.extend('up', false), false;
      case 'nav.extendDown': return this.extend('down', false), false;
      case 'nav.extendLeft': return this.extend('left', false), false;
      case 'nav.extendRight': return this.extend('right', false), false;

      case 'nav.extendBlockUp': return this.extend('up', true), false;
      case 'nav.extendBlockDown': return this.extend('down', true), false;
      case 'nav.extendBlockLeft': return this.extend('left', true), false;
      case 'nav.extendBlockRight': return this.extend('right', true), false;

      case 'nav.rowStart':
        this.goTo(homeOfRow(this.probe(), this.activeCell));
        return false;
      case 'nav.sheetStart':
        this.goTo(ctrlHome(this.probe()));
        return false;
      case 'nav.sheetEnd':
        this.goTo(ctrlEnd(this.probe()));
        return false;
      case 'nav.extendToRowStart':
        this.selection = extendTo(this.selection, homeOfRow(this.probe(), this.activeCell));
        return false;
      case 'nav.extendToSheetStart':
        this.selection = extendTo(this.selection, ctrlHome(this.probe()));
        return false;
      case 'nav.extendToSheetEnd':
        this.selection = extendTo(this.selection, ctrlEnd(this.probe()));
        return false;

      case 'nav.pageUp':
        this.goTo(pageJump(this.probe(), this.activeCell, 'up', this.visibleRows));
        return false;
      case 'nav.pageDown':
        this.goTo(pageJump(this.probe(), this.activeCell, 'down', this.visibleRows));
        return false;
      case 'nav.extendPageUp':
        this.selection = extendTo(this.selection, pageJump(this.probe(), this.activeCell, 'up', this.visibleRows));
        return false;
      case 'nav.extendPageDown':
        this.selection = extendTo(this.selection, pageJump(this.probe(), this.activeCell, 'down', this.visibleRows));
        return false;
      case 'nav.pageLeft':
        this.goTo(pageJumpH(this.probe(), this.activeCell, 'left', this.visibleCols));
        return false;
      case 'nav.pageRight':
        this.goTo(pageJumpH(this.probe(), this.activeCell, 'right', this.visibleCols));
        return false;

      case 'nav.prevSheet': return this.switchSheet(-1), false;
      case 'nav.nextSheet': return this.switchSheet(+1), false;

      case 'nav.tabNext': return this.tab(false), false;
      case 'nav.tabPrev': return this.tab(true), false;
      case 'nav.enterNext': return this.enter(false), false;
      case 'nav.enterPrev': return this.enter(true), false;

      case 'nav.selectPrecedents': return this.selectRelated('precedents'), false;
      case 'nav.selectDependents': return this.selectRelated('dependents'), false;

      case 'nav.toggleExtendMode':
        this.selection = { ...this.selection, extendMode: !this.selection.extendMode };
        this.say(this.selection.extendMode ? tr('session.2') : '');
        return false;

      case 'edit.selectAll':
        this.selection = selectAll(this.selection, this.probe());
        return false;

      case 'structure.selectColumn':
        this.selection = selectCol(this.selection, {
          from: this.activeArea().left,
          to: this.activeArea().right,
        });
        return false;
      case 'structure.selectRow':
        this.selection = selectRow(this.selection, {
          from: this.activeArea().top,
          to: this.activeArea().bottom,
        });
        return false;

      // ---------------------------------------------------------------- editing
      case 'edit.begin': return this.beginEdit(true), false;
      case 'edit.clearAndBegin': return this.beginEdit(false), false;
      case 'edit.confirm': return this.commitEdit('down'), false;
      case 'edit.confirmAndMoveDown': return this.commitEdit('down'), false;
      case 'edit.confirmAndMoveUp': return this.commitEdit('up'), false;
      case 'edit.confirmAndMoveRight': return this.commitEdit('right'), false;
      case 'edit.confirmAndMoveLeft': return this.commitEdit('left'), false;
      // Confermare con Tab prosegue la catena: e' `tab()` a memorizzare
      // l'entryOrigin da cui Invio poi torna a capo.
      case 'edit.confirmAndTabNext': return this.tab(false), false;
      case 'edit.confirmAndTabPrev': return this.tab(true), false;
      case 'edit.cancel': return this.cancelEdit(), false;
      case 'edit.clearContents': return this.clearSelection(), true;

      case 'edit.caretLeft': return this.moveCaret(-1, false), false;
      case 'edit.caretRight': return this.moveCaret(+1, false), false;
      case 'edit.selectCaretLeft': return this.moveCaret(-1, true), false;
      case 'edit.selectCaretRight': return this.moveCaret(+1, true), false;
      case 'edit.caretLineStart': return this.setCaret(0, 0), false;
      case 'edit.caretLineEnd': return this.setCaret(this.edit.text.length, this.edit.text.length), false;
      case 'edit.selectToLineStart': return this.setCaret(0, this.edit.selectionEnd), false;
      case 'edit.selectToLineEnd': return this.setCaret(this.edit.selectionStart, this.edit.text.length), false;
      case 'edit.deleteBackward': return this.deleteInEdit(-1), false;
      case 'edit.deleteForward': return this.deleteInEdit(+1), false;
      case 'edit.newlineInCell': return this.insertInEdit('\n'), false;

      case 'edit.cycleAnchor': return this.cycleAnchor(), false;
      case 'edit.repeatLastAction': return this.repeatLast(), false;

      case 'edit.fillDown': return this.fill('down'), true;
      case 'edit.fillRight': return this.fill('right'), true;
      case 'edit.fillSelection': return this.fillSelection(), true;
      case 'edit.copyFormulaFromAbove': return this.copyFromAbove(true), true;
      case 'edit.copyValueFromAbove': return this.copyFromAbove(false), true;

      case 'edit.undo':
        this.workbook.undo();
        this.say(tr('session.annullato'));
        return false;
      case 'edit.redo':
        this.workbook.redo();
        this.say(tr('session.ripristinato'));
        return false;

      // --------------------------------------------------------------- appunti
      case 'clipboard.copy': return this.copy('copy'), false;
      case 'clipboard.cut': return this.copy('cut'), false;
      case 'clipboard.paste': return this.paste(this.pasteOptions), true;
      case 'clipboard.pasteAll': return this.paste({ ...DEFAULT_PASTE_OPTIONS, mode: 'all' }), true;
      case 'clipboard.pasteValues': return this.paste({ ...DEFAULT_PASTE_OPTIONS, mode: 'values' }), true;
      case 'clipboard.pasteFormulas': return this.paste({ ...DEFAULT_PASTE_OPTIONS, mode: 'formulas' }), true;
      case 'clipboard.pasteFormats': return this.paste({ ...DEFAULT_PASTE_OPTIONS, mode: 'formats' }), true;
      case 'clipboard.pasteTranspose': return this.paste({ ...DEFAULT_PASTE_OPTIONS, transpose: true }), true;
      case 'clipboard.pasteMultiply': return this.paste({ ...DEFAULT_PASTE_OPTIONS, operation: 'multiply' }), true;
      case 'clipboard.pasteSpecialDialog':
        if (!this.clipboard) {
          this.say(tr('session.3'));
          return false;
        }
        this.pasteSpecialOpen = true;
        this.pasteOptions = { ...DEFAULT_PASTE_OPTIONS };
        this.say(tr('session.4'));
        return false;
      case 'clipboard.clearMarquee':
        // Esc da Pronto in Excel smonta tre cose insieme: il bordo tratteggiato
        // degli appunti, la modalita' Estendi e la selezione multipla.
        this.clipboard = null;
        if (this.selection.areas.length > 1 || this.selection.extendMode) {
          this.selection = singleCellSelection(this.sheet, this.activeCell);
        }
        return false;

      // -------------------------------------------------------------- struttura
      case 'structure.insertDialog': return this.insertRowsOrCols(), true;
      case 'structure.deleteDialog': return this.deleteRowsOrCols(), true;
      case 'structure.hideRows': return this.setHidden('row', true), true;
      case 'structure.hideCols': return this.setHidden('col', true), true;
      case 'structure.unhideRows': return this.setHidden('row', false), true;
      case 'structure.unhideCols': return this.setHidden('col', false), true;
      case 'structure.freezePanes': return this.freezePanes(), false;

      // ---------------------------------------------------------- formattazione
      case 'format.bold': return this.toggleStyle('bold'), true;
      case 'format.italic': return this.toggleStyle('italic'), true;
      case 'format.underline': return this.toggleStyle('underline'), true;
      case 'format.numberTwoDecimals': return this.applyNumFmt(DEFAULT_FORMATS.numero2dec), true;
      case 'format.currency': return this.applyNumFmt(DEFAULT_FORMATS.valuta), true;
      case 'format.percent': return this.applyNumFmt(DEFAULT_FORMATS.percentuale), true;
      case 'format.date': return this.applyNumFmt(DEFAULT_FORMATS.data), true;
      case 'format.general': return this.applyNumFmt(DEFAULT_FORMATS.generale), true;
      case 'format.fontColor': return this.applyStyle({ fontColor: MODEL_COLORS.input }), true;

      // ------------------------------------------------------- formule e audit
      case 'formula.autosum': return this.autosum(), true;
      case 'formula.toggleShowFormulas':
        this.showFormulas = !this.showFormulas;
        return false;
      case 'formula.evaluateFragment': return this.evaluateFragment(), false;
      case 'formula.recalculate':
      case 'formula.recalculateSheet':
      case 'formula.recalculateFull':
        this.workbook.recalcIterative();
        this.say(tr('session.ricalcolato'));
        return false;
      case 'formula.tracePrecedents': return this.selectRelated('precedents'), false;
      case 'formula.traceDependents': return this.selectRelated('dependents'), false;

      // ---------------------------------------------------------------- gioco
      case 'ui.toggleCheatSheet':
        this.cheatSheetOpen = !this.cheatSheetOpen;
        this.recorder.record({ kind: 'cheatSheet', open: this.cheatSheetOpen });
        return false;
      case 'ui.toggleMouseFree':
        if (this.mouseFreeLocked) {
          this.say(tr('session.5'));
          return false;
        }
        this.mouseFree = !this.mouseFree;
        this.say(this.mouseFree ? tr('session.6') : tr('session.7'));
        return false;
      case 'altMenu.open':
        this.altActive = true;
        this.alt.reset();
        return false;
      case 'altMenu.cancel':
        this.altActive = false;
        this.alt.reset();
        return false;

      default:
        if (this.onGameCommand?.(command) === true) return false;
        // Comando riconosciuto dalla keymap ma non ancora eseguibile: lo si dice,
        // invece di ingoiarlo. Un tasto che "non fa niente" senza spiegazione e'
        // peggio di un tasto non associato.
        this.say(tr('session.8', { command }));
        return false;
    }
  }

  // -------------------------------------------------------------------------
  // Navigazione
  // -------------------------------------------------------------------------

  private activeArea(): RangeCoords {
    return this.selection.areas[this.selection.activeArea]?.range ?? {
      top: this.activeCell.row,
      left: this.activeCell.col,
      bottom: this.activeCell.row,
      right: this.activeCell.col,
    };
  }

  private goTo(target: CellCoord): void {
    if (this.edit.mode !== 'ready') this.commitEdit();
    this.selection = this.selection.extendMode
      ? extendTo(this.selection, target)
      : moveTo(this.selection, target, this.probe());
  }

  private move(dir: Direction): void {
    this.goTo(step(this.probe(), this.activeCell, dir));
  }

  private moveJump(dir: Direction): void {
    this.goTo(jump(this.probe(), this.activeCell, dir));
  }

  private extend(dir: Direction, withJump: boolean): void {
    if (this.edit.mode !== 'ready') this.commitEdit();
    this.selection = moveAndExtend(this.selection, this.probe(), dir, { jump: withJump });
  }

  private switchSheet(delta: number): void {
    if (this.edit.mode !== 'ready') this.commitEdit();
    const ids = this.workbook.sheetIds();
    const i = ids.indexOf(this.sheet);
    const next = ids[Math.max(0, Math.min(ids.length - 1, i + delta))];
    if (next === undefined || next === this.sheet) return;
    this.sheet = next;
    this.selection = singleCellSelection(next, { row: 0, col: 0 });
  }

  private tab(back: boolean): void {
    if (this.edit.mode !== 'ready') this.commitEdit();
    this.selection = isSingleCellSelection(this.selection)
      ? tabFrom(this.selection, this.probe(), { back })
      : moveWithinSelection(this.selection, back ? 'prev' : 'next');
  }

  private enter(back: boolean): void {
    if (this.edit.mode !== 'ready') {
      this.commitEdit(back ? 'up' : 'down');
      return;
    }
    this.selection = isSingleCellSelection(this.selection)
      ? enterFrom(this.selection, this.probe(), { back })
      : moveWithinSelection(this.selection, back ? 'up' : 'down');
  }

  /** Ctrl+[ e Ctrl+]: seleziona precedenti o dipendenti della cella attiva. */
  private selectRelated(kind: 'precedents' | 'dependents'): void {
    const rel =
      kind === 'precedents'
        ? this.workbook.precedents(this.sheet, this.activeCell)
        : this.workbook.dependents(this.sheet, this.activeCell);
    const stesso = rel.filter((r) => r.sheet === this.sheet);
    if (stesso.length === 0) {
      this.say(kind === 'precedents' ? tr('session.9') : tr('session.10'));
      return;
    }
    let sel = moveTo(
      this.selection,
      { row: stesso[0].range.top, col: stesso[0].range.left },
      this.probe(),
    );
    sel = { ...sel, areas: [{ range: stesso[0].range, anchor: sel.active }] };
    for (const r of stesso.slice(1)) sel = addArea(sel, r.range);
    this.selection = sel;
    this.say(tr(kind === 'precedents' ? 'session.precedenti' : 'session.dipendenti', { n: stesso.length }));
  }

  // -------------------------------------------------------------------------
  // Editing
  // -------------------------------------------------------------------------

  private lockedHere(): boolean {
    if (!this.workbook.isLocked(this.sheet, this.activeCell)) return false;
    this.say(tr('session.11', { p0: coordToA1(this.activeCell) }));
    return true;
  }

  /** F2 apre con il contenuto e il cursore in fondo; Backspace apre vuoto. */
  private beginEdit(keepContent: boolean): void {
    if (this.lockedHere()) return;
    const raw = keepContent ? this.rawText(this.activeCell) : '';
    this.edit = {
      mode: keepContent ? 'edit' : 'enter',
      cell: this.activeCell,
      text: raw,
      selectionStart: raw.length,
      selectionEnd: raw.length,
      openedWithF2: keepContent,
    };
  }

  private rawText(c: CellCoord): string {
    const raw = this.workbook.getRaw(this.sheet, c);
    return raw === null ? '' : String(raw);
  }

  private typeCharacter(ch: string): void {
    if (this.edit.mode === 'ready') {
      if (this.lockedHere()) {
        this.emit();
        return;
      }
      // In Excel digitare da stato Pronto SOSTITUISCE il contenuto: non lo aggiunge.
      this.edit = {
        mode: 'enter',
        cell: this.activeCell,
        text: ch,
        selectionStart: ch.length,
        selectionEnd: ch.length,
        openedWithF2: false,
      };
    } else {
      this.insertInEdit(ch);
    }
    this.emit();
  }

  private insertInEdit(s: string): void {
    const { text, selectionStart, selectionEnd } = this.edit;
    const next = text.slice(0, selectionStart) + s + text.slice(selectionEnd);
    const caret = selectionStart + s.length;
    this.edit = { ...this.edit, text: next, selectionStart: caret, selectionEnd: caret };
  }

  private deleteInEdit(dir: -1 | 1): void {
    const { text, selectionStart, selectionEnd } = this.edit;
    if (selectionStart !== selectionEnd) {
      const next = text.slice(0, selectionStart) + text.slice(selectionEnd);
      this.edit = { ...this.edit, text: next, selectionStart, selectionEnd: selectionStart };
      return;
    }
    if (dir === -1 && selectionStart > 0) {
      const next = text.slice(0, selectionStart - 1) + text.slice(selectionStart);
      this.edit = { ...this.edit, text: next, selectionStart: selectionStart - 1, selectionEnd: selectionStart - 1 };
    } else if (dir === 1 && selectionStart < text.length) {
      const next = text.slice(0, selectionStart) + text.slice(selectionStart + 1);
      this.edit = { ...this.edit, text: next };
    }
  }

  private moveCaret(delta: number, select: boolean): void {
    const pos = Math.max(0, Math.min(this.edit.text.length, this.edit.selectionEnd + delta));
    this.setCaret(select ? this.edit.selectionStart : pos, pos);
  }

  private setCaret(start: number, end: number): void {
    this.edit = { ...this.edit, selectionStart: Math.min(start, end), selectionEnd: Math.max(start, end) };
  }

  private commitEdit(move?: Direction): void {
    if (this.edit.mode === 'ready') {
      if (move) this.enterAfterCommit(move);
      return;
    }
    const cell = this.edit.cell ?? this.activeCell;
    const text = this.edit.text;
    this.edit = READY_EDIT_STATE;
    const normalized =
      text === ''
        ? null
        : normalizeTypedInput(text, this.inputLocale(), (f) => this.workbook.isValidFormula(f));
    const { raw, numFmt } = applyPercentEntry(normalized, this.workbook.getStyle(this.sheet, cell).numFmt);
    if (numFmt) {
      this.workbook.batch('digitazione', () => {
        this.workbook.setContents(this.sheet, cell, raw as CellRaw);
        this.workbook.setStyle(this.sheet, cell, { numFmt });
      });
    } else {
      this.workbook.setContents(this.sheet, cell, raw as CellRaw, 'digitazione');
    }
    if (move) this.enterAfterCommit(move);
  }

  private enterAfterCommit(move: Direction): void {
    if (move === 'down' || move === 'up') {
      this.selection = isSingleCellSelection(this.selection)
        ? enterFrom(this.selection, this.probe(), { back: move === 'up' })
        : moveWithinSelection(this.selection, move === 'up' ? 'up' : 'down');
    } else {
      this.selection = moveTo(this.selection, step(this.probe(), this.activeCell, move), this.probe());
    }
  }

  private cancelEdit(): void {
    if (this.edit.mode !== 'ready') {
      this.edit = READY_EDIT_STATE;
      return;
    }
    // Esc da Pronto: toglie appunti e selezione multipla, come in Excel.
    this.clipboard = null;
    if (this.selection.areas.length > 1 || this.selection.extendMode) {
      this.selection = singleCellSelection(this.sheet, this.activeCell);
    }
  }

  /**
   * Canc. Una sola voce di undo per tutta la selezione, e le celle bloccate
   * restano intoccate: in un livello sono i dati di partenza, e cancellarle
   * renderebbe il livello irrisolvibile senza che l'utente capisca perche'.
   */
  private clearSelection(): void {
    this.workbook.batch('cancella', () => {
      let bloccate = 0;
      for (const area of this.selection.areas) {
        const r = normalizeRange(area.range);
        for (let row = r.top; row <= r.bottom; row++) {
          for (let col = r.left; col <= r.right; col++) {
            if (this.workbook.isLocked(this.sheet, { row, col })) {
              bloccate += 1;
              continue;
            }
            this.workbook.setContents(this.sheet, { row, col }, null, 'cancella');
          }
        }
      }
      if (bloccate > 0) {
        this.say(tr(bloccate === 1 ? 'session.bloccataUna' : 'session.bloccateMolte', { bloccate }));
      }
    });
  }

  /** F4 in editing: cicla gli ancoraggi del riferimento sotto il cursore. */
  private cycleAnchor(): void {
    if (this.edit.mode === 'ready') {
      this.repeatLast();
      return;
    }
    const res = cycleAnchoring(this.edit.text, this.edit.selectionStart, this.edit.selectionEnd);
    this.edit = {
      ...this.edit,
      text: res.text,
      selectionStart: res.selStart,
      selectionEnd: res.selEnd,
    };
  }

  private repeatLast(): void {
    if (!this.lastAction) {
      this.say(tr('session.15'));
      return;
    }
    this.applyCommand(this.lastAction.command);
  }

  /** F9 sul frammento selezionato: lo sostituisce col suo valore. */
  private evaluateFragment(): void {
    if (this.edit.mode === 'ready') {
      this.workbook.recalcIterative();
      this.say(tr('session.ricalcolato'));
      return;
    }
    const frammento = selectFragment(this.edit.text, this.edit.selectionStart, this.edit.selectionEnd);
    if (!frammento) {
      this.say(tr('session.16'));
      return;
    }
    const valore = this.workbook.evaluateFragment(this.sheet, frammento.expression);
    const testo = formatFragmentValue(valore);
    const nuovo = replaceFragment(this.edit.text, frammento.start, frammento.end, testo);
    const caret = frammento.start + testo.length;
    this.edit = { ...this.edit, text: nuovo, selectionStart: frammento.start, selectionEnd: caret };
  }

  // -------------------------------------------------------------------------
  // Riempimento
  // -------------------------------------------------------------------------

  private fill(dir: 'down' | 'right'): void {
    const area = normalizeRange(this.activeArea());
    if (dir === 'down' && area.top === area.bottom) return;
    if (dir === 'right' && area.left === area.right) return;

    // Una sola voce di undo per l'intero riempimento: in Excel Ctrl+D e' UN'azione.
    this.workbook.batch('riempimento', () => {
      for (let col = area.left; col <= area.right; col++) {
        for (let row = area.top; row <= area.bottom; row++) {
          const sorgente = dir === 'down' ? { row: area.top, col } : { row, col: area.left };
          const bersaglio = { row, col };
          if (sorgente.row === bersaglio.row && sorgente.col === bersaglio.col) continue;
          this.copyCellInto(sorgente, bersaglio);
        }
      }
    });
    this.say(dir === 'down' ? tr('session.17') : tr('session.18'));
  }

  private copyCellInto(from: CellCoord, to: CellCoord): void {
    if (this.workbook.isLocked(this.sheet, to)) return;
    const formula = this.workbook.getFormula(this.sheet, from);
    const contenuto: CellRaw =
      formula !== undefined
        ? shiftFormula(formula, to.row - from.row, to.col - from.col)
        : this.workbook.getRaw(this.sheet, from);
    this.workbook.setContents(this.sheet, to, contenuto, 'riempimento');
    const stile = this.workbook.getStyle(this.sheet, from);
    if (Object.keys(stile).length > 0) this.workbook.setStyle(this.sheet, to, stile, 'riempimento');
  }

  /** Ctrl+Invio: scrive lo stesso contenuto in tutta la selezione. */
  private fillSelection(): void {
    const testo = this.edit.mode !== 'ready' ? this.edit.text : this.rawText(this.activeCell);
    const origine = this.edit.cell ?? this.activeCell;
    if (this.edit.mode !== 'ready') this.edit = READY_EDIT_STATE;

    this.workbook.batch(tr('session.19'), () => {
      for (const area of this.selection.areas) {
        const r = normalizeRange(area.range);
        for (let row = r.top; row <= r.bottom; row++) {
          for (let col = r.left; col <= r.right; col++) {
            if (this.workbook.isLocked(this.sheet, { row, col })) continue;
            const contenuto: CellRaw = testo.startsWith('=')
              ? shiftFormula(testo, row - origine.row, col - origine.col)
              : (testo as CellRaw);
            this.workbook.setContents(this.sheet, { row, col }, contenuto === '' ? null : contenuto, tr('session.20'));
          }
        }
      }
    });
  }

  /** Ctrl+' copia la formula di sopra SENZA traslare; Ctrl+Maiusc+' copia il valore. */
  private copyFromAbove(asFormula: boolean): void {
    const sopra = { row: this.activeCell.row - 1, col: this.activeCell.col };
    if (sopra.row < 0 || this.lockedHere()) return;
    const contenuto = asFormula
      ? (this.workbook.getFormula(this.sheet, sopra) ?? this.workbook.getRaw(this.sheet, sopra))
      : (this.workbook.getValue(this.sheet, sopra) as CellRaw);
    this.workbook.setContents(this.sheet, this.activeCell, contenuto ?? null, tr('session.21'));
  }

  // -------------------------------------------------------------------------
  // Appunti
  // -------------------------------------------------------------------------

  private copy(kind: 'copy' | 'cut'): void {
    const area = normalizeRange(this.activeArea());
    this.clipboard = buildClipboard(kind, this.workbook.sheetName(this.sheet), area, (row, col): ClipCell => {
      const coord = { row, col };
      const formula = this.workbook.getFormula(this.sheet, coord);
      const stile = this.workbook.getStyle(this.sheet, coord);
      const valore = this.workbook.getValue(this.sheet, coord);
      return {
        raw: this.workbook.getRaw(this.sheet, coord),
        ...(formula !== undefined ? { formula } : {}),
        ...(Object.keys(stile).length > 0 ? { style: stile } : {}),
        value: typeof valore === 'object' && valore !== null ? String((valore as { value: string }).value) : (valore as ClipCell['value']),
      };
    });
    this.say(tr(kind === 'cut' ? 'session.tagliato' : 'session.copiato', { area: rangeToA1(area) }));
  }

  private paste(opts: PasteOptions): void {
    if (!this.clipboard) {
      this.say(tr('session.22'));
      return;
    }
    const bersaglio = normalizeRange(this.activeArea());
    const risolto = resolvePasteTarget(this.clipboard, bersaglio, opts.transpose);
    if (!risolto.ok) {
      this.say(risolto.reason);
      return;
    }

    // `planPasteArea` e non `planPaste`: quest'ultima riempie una sola sagoma a
    // partire da un angolo, e non saprebbe ripetere gli appunti a mosaico. E' il
    // gesto con cui si riempie una tabella — copi la formula dell'angolo e la
    // incolli sull'area intera — quindi deve passare dall'area risolta.
    const piano = planPasteArea(
      this.clipboard,
      risolto.area,
      opts,
      shiftFormula,
      (row, col) => this.workbook.getValue(this.sheet, { row, col }) as number | string | boolean | null,
    );

    // Contenuto, stile e svuotamento dell'origine sono una sola azione: un solo
    // Ctrl+Z deve riportare indietro tutto quanto, non il testo senza il formato.
    this.workbook.batch('incolla', () => {
      for (const w of piano.writes) {
        if (this.workbook.isLocked(this.sheet, { row: w.row, col: w.col })) continue;
        if (w.raw !== undefined) {
          this.workbook.setContents(this.sheet, { row: w.row, col: w.col }, w.raw, 'incolla');
        }
        if (w.style) {
          const base = w.mergeStyle ? this.workbook.getStyle(this.sheet, { row: w.row, col: w.col }) : {};
          this.workbook.setStyle(this.sheet, { row: w.row, col: w.col }, { ...base, ...w.style }, 'incolla');
        }
      }
      if (piano.clearSource) this.workbook.clearRange(this.sheet, piano.clearSource, 'incolla');
    });
    if (piano.clearSource) this.clipboard = null;
    if (piano.colWidths) {
      const layout = this.workbook.layout(this.sheet);
      for (const c of piano.colWidths) {
        const px = layout.colWidths.get(c.from);
        if (px !== undefined) layout.colWidths.set(c.to, px);
      }
    }
    this.say(tr('session.incollato'));
  }

  private feedPasteSpecial(key: string): boolean {
    const res = parsePasteSpecialKey(key);
    if (res === undefined) return true; // il dialogo mangia i tasti sconosciuti
    if (res === 'cancel') {
      this.pasteSpecialOpen = false;
      this.say('');
      this.emit();
      return true;
    }
    if (res === 'confirm') {
      this.pasteSpecialOpen = false;
      this.paste(this.pasteOptions);
      this.emit();
      return true;
    }
    // Come nel dialogo di Excel: la lettera seleziona l'opzione (le caselle
    // Trasponi e Salta celle vuote si alternano), Invio conferma ed esegue.
    const prima = this.pasteOptions;
    this.pasteOptions = {
      ...prima,
      ...res,
      ...(res.transpose ? { transpose: !prima.transpose } : {}),
      ...(res.skipBlanks ? { skipBlanks: !prima.skipBlanks } : {}),
    };
    this.say(tr('session.23', { p0: describePasteOptions(this.pasteOptions) }));
    this.emit();
    return true;
  }

  // -------------------------------------------------------------------------
  // Struttura e formato
  // -------------------------------------------------------------------------

  /**
   * Ctrl+Maiusc+= e Ctrl+- agiscono su righe o colonne INTERE, selezionate prima con
   * Maiusc+Spazio o Ctrl+Spazio. Su una selezione parziale Excel apre un dialogo
   * ("sposta celle a destra/in basso, riga intera, colonna intera"); qui non c'e',
   * quindi invece di eliminare un'intera riga alla cieca si spiega cosa fare.
   */
  private wholeAxis(): { area: RangeCoords; axis: 'row' | 'col' } | null {
    const area = normalizeRange(this.activeArea());
    if (area.top === 0 && area.bottom >= this.probe().maxRow) return { area, axis: 'col' };
    if (area.left === 0 && area.right >= this.probe().maxCol) return { area, axis: 'row' };
    return null;
  }

  private insertRowsOrCols(): void {
    const sel = this.wholeAxis();
    if (!sel) {
      this.say(tr('session.24'));
      return;
    }
    const { area, axis } = sel;
    if (axis === 'col') this.workbook.insertCols(this.sheet, area.left, area.right - area.left + 1);
    else this.workbook.insertRows(this.sheet, area.top, area.bottom - area.top + 1);
  }

  private deleteRowsOrCols(): void {
    const sel = this.wholeAxis();
    if (!sel) {
      this.say(tr('session.25'));
      return;
    }
    const { area, axis } = sel;
    if (axis === 'col') this.workbook.removeCols(this.sheet, area.left, area.right - area.left + 1);
    else this.workbook.removeRows(this.sheet, area.top, area.bottom - area.top + 1);
  }

  private setHidden(axis: 'row' | 'col', hidden: boolean): void {
    const area = normalizeRange(this.activeArea());
    const layout = this.workbook.layout(this.sheet);
    const set = axis === 'row' ? layout.hiddenRows : layout.hiddenCols;
    const from = axis === 'row' ? area.top : area.left;
    const to = axis === 'row' ? area.bottom : area.right;
    for (let i = from; i <= to; i++) {
      if (hidden) set.add(i);
      else set.delete(i);
    }
  }

  private freezePanes(): void {
    const layout = this.workbook.layout(this.sheet);
    if (layout.frozenRows > 0 || layout.frozenCols > 0) {
      layout.frozenRows = 0;
      layout.frozenCols = 0;
      this.say(tr('session.26'));
    } else {
      layout.frozenRows = this.activeCell.row;
      layout.frozenCols = this.activeCell.col;
      this.say(tr('session.27'));
    }
  }

  private toggleStyle(prop: 'bold' | 'italic' | 'underline'): void {
    const attuale = this.workbook.getStyle(this.sheet, this.activeCell)[prop] === true;
    this.applyStyle({ [prop]: !attuale } as CellStyle);
  }

  private applyNumFmt(numFmt: string): void {
    this.applyStyle({ numFmt });
  }

  private applyStyle(patch: CellStyle): void {
    for (const area of this.selection.areas) {
      this.workbook.setStyleRange(this.sheet, area.range, patch, 'formato');
    }
  }

  /**
   * Alt+= : propone la SUM del blocco contiguo sopra (o a sinistra, se sopra non
   * c'e' niente), e lascia l'utente in editing perche' possa correggere il range,
   * esattamente come fa Excel.
   */
  private autosum(): void {
    if (this.lockedHere()) return;
    const c = this.activeCell;
    const probe = this.probe();

    let range: RangeCoords | null = null;
    if (c.row > 0 && probe.isFilled(c.row - 1, c.col)) {
      const cima = jump(probe, { row: c.row, col: c.col }, 'up');
      range = { top: cima.row, left: c.col, bottom: c.row - 1, right: c.col };
    } else if (c.col > 0 && probe.isFilled(c.row, c.col - 1)) {
      const sinistra = jump(probe, c, 'left');
      range = { top: c.row, left: sinistra.col, bottom: c.row, right: c.col - 1 };
    }

    const testo = range ? `=SUM(${rangeToA1(range)})` : '=SUM()';
    const caret = range ? testo.length : testo.length - 1;
    this.edit = {
      mode: 'point',
      cell: c,
      text: testo,
      selectionStart: caret,
      selectionEnd: caret,
      openedWithF2: false,
    };
  }

  // -------------------------------------------------------------------------
  // Utilita' per l'interfaccia
  // -------------------------------------------------------------------------

  /** Vai a (F5 / Ctrl+G / Name box). Accetta `A1`, `A1:B4`, `Foglio!A1`. */
  goToReference(ref: string): boolean {
    const bang = ref.lastIndexOf('!');
    let sheet = this.sheet;
    let corpo = ref;
    if (bang > 0) {
      const nome = ref.slice(0, bang).replace(/^'|'$/g, '');
      if (!this.workbook.sheetNames().includes(nome)) return false;
      sheet = this.workbook.sheetId(nome);
      corpo = ref.slice(bang + 1);
    }
    const coord = a1ToCoord(corpo.split(':')[0]);
    if (!coord) return false;
    this.sheet = sheet;
    this.selection = singleCellSelection(sheet, coord);
    this.emit();
    return true;
  }

  /** Testo mostrato nella barra della formula. */
  formulaBarText(): string {
    if (this.edit.mode !== 'ready') return this.edit.text;
    return this.rawText(this.activeCell);
  }
}

const PASTE_MODE_LABEL: Record<PasteOptions['mode'], string> = {
  all: 'tutto',
  formulas: 'formule',
  values: 'valori',
  formats: 'formati',
  comments: 'commenti',
  valuesAndNumberFormats: tr('session.28'),
  columnWidths: tr('session.29'),
};

const PASTE_OP_LABEL: Record<PasteOptions['operation'], string> = {
  none: '',
  add: 'aggiungi',
  subtract: 'sottrai',
  multiply: 'moltiplica',
  divide: 'dividi',
};

function describePasteOptions(o: PasteOptions): string {
  return [
    PASTE_MODE_LABEL[o.mode],
    PASTE_OP_LABEL[o.operation],
    o.transpose ? 'trasponi' : '',
    o.skipBlanks ? tr('session.30') : '',
  ]
    .filter(Boolean)
    .join(' + ');
}
