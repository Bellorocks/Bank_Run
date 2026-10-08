import { describe, it, expect } from 'vitest';
import type { EditMode } from '../engine/types';
import type { Command } from './commands';
import {
  BINDINGS,
  PASTE_SPECIAL_OPTIONS,
  allSignatures,
  bindingsForCommand,
  bindingsForSignature,
  findBindingConflicts,
  resolveBinding,
} from './bindings';
import {
  CHEAT_SHEET,
  allCheatSheetRows,
  cheatSheetRowsForCommand,
  searchCheatSheet,
} from './cheatSheet';
import { keySignature, type KeyLike } from './keySignature';

/**
 * Questo file e' un criterio di accettazione del progetto (§13: "30 shortcut
 * testate automaticamente contro il comportamento Excel documentato"), non un
 * test di regressione.
 *
 * `SPEC_31` e' trascritta a mano dal §3.1 dello spec, riga per riga: se
 * qualcuno cancella un binding dalla tabella, qui casca un test con il nome
 * della scorciatoia mancante. La lista NON va derivata da `BINDINGS`, o
 * verificherebbe soltanto che il codice e' uguale a se stesso.
 */

interface SpecRow {
  readonly keys: string;
  readonly mode: EditMode;
  readonly command: Command;
  readonly textSelection?: boolean;
}

const SPEC_31: readonly SpecRow[] = [
  // --- Navigazione ---------------------------------------------------------
  { keys: 'ArrowUp', mode: 'ready', command: 'nav.moveUp' },
  { keys: 'ArrowDown', mode: 'ready', command: 'nav.moveDown' },
  { keys: 'ArrowLeft', mode: 'ready', command: 'nav.moveLeft' },
  { keys: 'ArrowRight', mode: 'ready', command: 'nav.moveRight' },
  { keys: 'Ctrl+ArrowUp', mode: 'ready', command: 'nav.blockUp' },
  { keys: 'Ctrl+ArrowDown', mode: 'ready', command: 'nav.blockDown' },
  { keys: 'Ctrl+ArrowLeft', mode: 'ready', command: 'nav.blockLeft' },
  { keys: 'Ctrl+ArrowRight', mode: 'ready', command: 'nav.blockRight' },
  { keys: 'Shift+ArrowUp', mode: 'ready', command: 'nav.extendUp' },
  { keys: 'Shift+ArrowDown', mode: 'ready', command: 'nav.extendDown' },
  { keys: 'Shift+ArrowLeft', mode: 'ready', command: 'nav.extendLeft' },
  { keys: 'Shift+ArrowRight', mode: 'ready', command: 'nav.extendRight' },
  { keys: 'Ctrl+Shift+ArrowUp', mode: 'ready', command: 'nav.extendBlockUp' },
  { keys: 'Ctrl+Shift+ArrowDown', mode: 'ready', command: 'nav.extendBlockDown' },
  { keys: 'Ctrl+Shift+ArrowLeft', mode: 'ready', command: 'nav.extendBlockLeft' },
  { keys: 'Ctrl+Shift+ArrowRight', mode: 'ready', command: 'nav.extendBlockRight' },
  { keys: 'Home', mode: 'ready', command: 'nav.rowStart' },
  { keys: 'Shift+Home', mode: 'ready', command: 'nav.extendToRowStart' },
  { keys: 'Shift+End', mode: 'edit', command: 'edit.selectToLineEnd' },
  { keys: 'End', mode: 'ready', command: 'nav.toggleEndMode' },
  { keys: 'Ctrl+Home', mode: 'ready', command: 'nav.sheetStart' },
  { keys: 'Ctrl+End', mode: 'ready', command: 'nav.sheetEnd' },
  { keys: 'Ctrl+Shift+Home', mode: 'ready', command: 'nav.extendToSheetStart' },
  { keys: 'Ctrl+Shift+End', mode: 'ready', command: 'nav.extendToSheetEnd' },
  { keys: 'PageUp', mode: 'ready', command: 'nav.pageUp' },
  { keys: 'PageDown', mode: 'ready', command: 'nav.pageDown' },
  { keys: 'Shift+PageUp', mode: 'ready', command: 'nav.extendPageUp' },
  { keys: 'Shift+PageDown', mode: 'ready', command: 'nav.extendPageDown' },
  { keys: 'Alt+PageUp', mode: 'ready', command: 'nav.pageLeft' },
  { keys: 'Alt+PageDown', mode: 'ready', command: 'nav.pageRight' },
  { keys: 'Ctrl+PageUp', mode: 'ready', command: 'nav.prevSheet' },
  { keys: 'Ctrl+PageDown', mode: 'ready', command: 'nav.nextSheet' },
  { keys: 'Tab', mode: 'ready', command: 'nav.tabNext' },
  { keys: 'Shift+Tab', mode: 'ready', command: 'nav.tabPrev' },
  { keys: 'Enter', mode: 'ready', command: 'nav.enterNext' },
  { keys: 'Shift+Enter', mode: 'ready', command: 'nav.enterPrev' },
  { keys: 'F5', mode: 'ready', command: 'nav.goTo' },
  { keys: 'Ctrl+G', mode: 'ready', command: 'nav.goTo' },
  { keys: 'Ctrl+BracketLeft', mode: 'ready', command: 'nav.selectPrecedents' },
  { keys: 'Ctrl+BracketRight', mode: 'ready', command: 'nav.selectDependents' },
  { keys: 'F8', mode: 'ready', command: 'nav.toggleExtendMode' },
  { keys: 'Ctrl+.', mode: 'ready', command: 'nav.nextSelectionCorner' },

  // --- Editing -------------------------------------------------------------
  { keys: 'F2', mode: 'ready', command: 'edit.begin' },
  { keys: 'F2', mode: 'edit', command: 'edit.toggleEditPoint' },
  { keys: 'Escape', mode: 'ready', command: 'clipboard.clearMarquee' },
  { keys: 'Escape', mode: 'edit', command: 'edit.cancel' },
  { keys: 'Delete', mode: 'ready', command: 'edit.clearContents' },
  { keys: 'Delete', mode: 'edit', command: 'edit.deleteForward' },
  { keys: 'Backspace', mode: 'ready', command: 'edit.clearAndBegin' },
  { keys: 'Backspace', mode: 'edit', command: 'edit.deleteBackward' },
  { keys: 'F4', mode: 'ready', command: 'edit.repeatLastAction' },
  { keys: 'F4', mode: 'edit', command: 'edit.cycleAnchor' },
  { keys: 'F4', mode: 'point', command: 'edit.cycleAnchor' },
  { keys: 'Ctrl+Enter', mode: 'ready', command: 'edit.fillSelection' },
  { keys: 'Alt+Enter', mode: 'edit', command: 'edit.newlineInCell' },
  { keys: 'Ctrl+D', mode: 'ready', command: 'edit.fillDown' },
  { keys: 'Ctrl+R', mode: 'ready', command: 'edit.fillRight' },
  { keys: 'Ctrl+C', mode: 'ready', command: 'clipboard.copy' },
  { keys: 'Ctrl+X', mode: 'ready', command: 'clipboard.cut' },
  { keys: 'Ctrl+V', mode: 'ready', command: 'clipboard.paste' },
  { keys: 'Ctrl+Alt+V', mode: 'ready', command: 'clipboard.pasteSpecialDialog' },
  { keys: 'Ctrl+Z', mode: 'ready', command: 'edit.undo' },
  { keys: 'Ctrl+Y', mode: 'ready', command: 'edit.redo' },
  { keys: 'Ctrl+A', mode: 'ready', command: 'edit.selectAll' },
  { keys: 'Ctrl+F', mode: 'ready', command: 'edit.find' },
  { keys: 'Ctrl+H', mode: 'ready', command: 'edit.replace' },
  { keys: 'Ctrl+Quote', mode: 'ready', command: 'edit.copyFormulaFromAbove' },
  { keys: 'Ctrl+Shift+Quote', mode: 'ready', command: 'edit.copyValueFromAbove' },

  // --- Struttura -----------------------------------------------------------
  { keys: 'Ctrl+Shift+=', mode: 'ready', command: 'structure.insertDialog' },
  { keys: 'Ctrl++', mode: 'ready', command: 'structure.insertDialog' },
  { keys: 'Ctrl+-', mode: 'ready', command: 'structure.deleteDialog' },
  { keys: 'Ctrl+Space', mode: 'ready', command: 'structure.selectColumn' },
  { keys: 'Shift+Space', mode: 'ready', command: 'structure.selectRow' },
  { keys: 'Alt+Shift+ArrowRight', mode: 'ready', command: 'structure.group' },
  { keys: 'Alt+Shift+ArrowLeft', mode: 'ready', command: 'structure.ungroup' },
  { keys: 'Ctrl+9', mode: 'ready', command: 'structure.hideRows' },
  { keys: 'Ctrl+0', mode: 'ready', command: 'structure.hideCols' },
  { keys: 'Ctrl+Shift+9', mode: 'ready', command: 'structure.unhideRows' },
  { keys: 'Ctrl+Shift+0', mode: 'ready', command: 'structure.unhideCols' },

  // --- Formattazione -------------------------------------------------------
  { keys: 'Ctrl+1', mode: 'ready', command: 'format.cellsDialog' },
  { keys: 'Ctrl+B', mode: 'ready', command: 'format.bold' },
  { keys: 'Ctrl+I', mode: 'ready', command: 'format.italic' },
  { keys: 'Ctrl+U', mode: 'ready', command: 'format.underline' },
  { keys: 'Ctrl+Shift+1', mode: 'ready', command: 'format.numberTwoDecimals' },
  { keys: 'Ctrl+Shift+2', mode: 'ready', command: 'format.time' },
  { keys: 'Ctrl+Shift+3', mode: 'ready', command: 'format.date' },
  { keys: 'Ctrl+Shift+4', mode: 'ready', command: 'format.currency' },
  { keys: 'Ctrl+Shift+5', mode: 'ready', command: 'format.percent' },
  { keys: 'Ctrl+Shift+6', mode: 'ready', command: 'format.exponential' },
  { keys: 'Ctrl+Shift+7', mode: 'ready', command: 'format.borderOutside' },
  { keys: 'Ctrl+Shift+-', mode: 'ready', command: 'format.borderNone' },
  { keys: 'Ctrl+Shift+Backquote', mode: 'ready', command: 'format.general' },
  // Le sequenze Alt legacy passano da qui e poi da altSequence.ts.
  { keys: 'Alt', mode: 'ready', command: 'altMenu.open' },

  // --- Formule e audit -----------------------------------------------------
  { keys: 'Alt+=', mode: 'ready', command: 'formula.autosum' },
  { keys: 'Ctrl+Backquote', mode: 'ready', command: 'formula.toggleShowFormulas' },
  { keys: 'F9', mode: 'ready', command: 'formula.recalculate' },
  { keys: 'F9', mode: 'edit', command: 'formula.evaluateFragment', textSelection: true },
  { keys: 'Shift+F9', mode: 'ready', command: 'formula.recalculateSheet' },
  { keys: 'Ctrl+Alt+F9', mode: 'ready', command: 'formula.recalculateFull' },
  { keys: 'Shift+F3', mode: 'ready', command: 'formula.insertFunction' },
  { keys: 'Ctrl+Shift+Enter', mode: 'edit', command: 'formula.arrayEnter' },
  { keys: 'Ctrl+F3', mode: 'ready', command: 'name.manager' },
  { keys: 'Ctrl+Shift+F3', mode: 'ready', command: 'name.createFromSelection' },
  { keys: 'Alt+F3', mode: 'ready', command: 'name.focusNameBox' },
  { keys: 'F3', mode: 'edit', command: 'name.paste' },

  // --- Altro ---------------------------------------------------------------
  { keys: 'Ctrl+Shift+L', mode: 'ready', command: 'data.filter' },
  { keys: '?', mode: 'ready', command: 'ui.toggleCheatSheet' },
  { keys: 'F1', mode: 'ready', command: 'game.hint' },
  { keys: 'Ctrl+F1', mode: 'ready', command: 'ui.toggleTaskPanel' },
  { keys: 'Ctrl+Shift+M', mode: 'ready', command: 'ui.toggleMouseFree' },
  { keys: 'F12', mode: 'ready', command: 'game.verify' },
];

const ALL_MODES: readonly EditMode[] = ['ready', 'enter', 'edit', 'point'];

function ctx(mode: EditMode, over: { hasTextSelection?: boolean; clipboardEmpty?: boolean } = {}) {
  return { mode, hasTextSelection: false, ...over };
}

// ---------------------------------------------------------------------------
// 1. Copertura del §3.1
// ---------------------------------------------------------------------------

describe('copertura delle scorciatoie del §3.1', () => {
  it.each([...SPEC_31])('$keys in $mode esegue $command', (row) => {
    expect(
      resolveBinding(row.keys, ctx(row.mode, { hasTextSelection: row.textSelection ?? false })),
    ).toBe(row.command);
  });

  it('ha un binding registrato per ogni firma dello spec', () => {
    const senzaBinding = SPEC_31.filter((r) => bindingsForSignature(r.keys).length === 0).map(
      (r) => r.keys,
    );
    expect(senzaBinding).toEqual([]);
  });

  it('copre almeno 60 firme distinte', () => {
    // Il §13 chiede 30 shortcut testate; la griglia ne pretende molte di piu'.
    expect(new Set(SPEC_31.map((r) => r.keys)).size).toBeGreaterThanOrEqual(60);
    expect(allSignatures().length).toBeGreaterThanOrEqual(60);
  });

  it('non ha firme orfane: tutto cio che e in tabella e anche nello spec', () => {
    // Difesa contro il binding aggiunto di soppiatto e mai documentato.
    const attese = new Set(SPEC_31.map((r) => r.keys));
    const orfane = allSignatures().filter((s) => !attese.has(s));
    expect(orfane).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. Risoluzione contestuale nei quattro EditMode
// ---------------------------------------------------------------------------

describe('frecce: quattro comportamenti per la stessa firma', () => {
  it('in Pronto navigano', () => {
    expect(resolveBinding('ArrowDown', ctx('ready'))).toBe('nav.moveDown');
    expect(resolveBinding('ArrowLeft', ctx('ready'))).toBe('nav.moveLeft');
  });

  it('in Modifica muovono il cursore dentro il testo, non la selezione', () => {
    expect(resolveBinding('ArrowLeft', ctx('edit'))).toBe('edit.caretLeft');
    expect(resolveBinding('ArrowRight', ctx('edit'))).toBe('edit.caretRight');
    expect(resolveBinding('ArrowUp', ctx('edit'))).toBe('edit.caretUp');
    // Nessun comando di navigazione deve trapelare in Modifica.
    for (const s of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      expect(resolveBinding(s, ctx('edit'))?.startsWith('nav.')).toBe(false);
    }
  });

  it('in Immissione confermano e si spostano', () => {
    expect(resolveBinding('ArrowDown', ctx('enter'))).toBe('edit.confirmAndMoveDown');
    expect(resolveBinding('ArrowUp', ctx('enter'))).toBe('edit.confirmAndMoveUp');
    expect(resolveBinding('ArrowLeft', ctx('enter'))).toBe('edit.confirmAndMoveLeft');
    expect(resolveBinding('ArrowRight', ctx('enter'))).toBe('edit.confirmAndMoveRight');
  });

  it('in Punta spostano il riferimento che si sta costruendo', () => {
    expect(resolveBinding('ArrowDown', ctx('point'))).toBe('point.moveDown');
    expect(resolveBinding('Shift+ArrowDown', ctx('point'))).toBe('point.extendDown');
  });

  it('Ctrl+Sinistra e Destra diventano salto di parola dentro il testo', () => {
    expect(resolveBinding('Ctrl+ArrowLeft', ctx('ready'))).toBe('nav.blockLeft');
    expect(resolveBinding('Ctrl+ArrowLeft', ctx('edit'))).toBe('edit.caretWordLeft');
    expect(resolveBinding('Ctrl+ArrowRight', ctx('enter'))).toBe('edit.caretWordRight');
  });

  it('Maiusc+frecce: estensione in Pronto, selezione di testo in Modifica', () => {
    expect(resolveBinding('Shift+ArrowRight', ctx('ready'))).toBe('nav.extendRight');
    expect(resolveBinding('Shift+ArrowRight', ctx('edit'))).toBe('edit.selectCaretRight');
  });
});

describe('F4: ancoraggi dentro la formula, ripeti fuori', () => {
  it.each([...ALL_MODES])('in %s', (mode) => {
    const atteso = mode === 'ready' ? 'edit.repeatLastAction' : 'edit.cycleAnchor';
    expect(resolveBinding('F4', ctx(mode))).toBe(atteso);
  });
});

describe('F9: valuta il frammento solo se ce del testo selezionato', () => {
  it('con selezione dentro la formula valuta il frammento', () => {
    expect(resolveBinding('F9', ctx('edit', { hasTextSelection: true }))).toBe(
      'formula.evaluateFragment',
    );
    expect(resolveBinding('F9', ctx('point', { hasTextSelection: true }))).toBe(
      'formula.evaluateFragment',
    );
  });

  it('senza selezione ricalcola, in qualunque modalita', () => {
    for (const mode of ALL_MODES) {
      expect(resolveBinding('F9', ctx(mode))).toBe('formula.recalculate');
    }
  });

  it('fuori dalla formula il testo selezionato non basta', () => {
    // In Pronto non esiste un frammento da valutare: resta il ricalcolo.
    expect(resolveBinding('F9', ctx('ready', { hasTextSelection: true }))).toBe(
      'formula.recalculate',
    );
    expect(resolveBinding('F9', ctx('enter', { hasTextSelection: true }))).toBe(
      'formula.recalculate',
    );
  });
});

describe('Invio, Esc, F2, Tab: conferma contro navigazione', () => {
  it('Invio scende da Pronto e conferma dagli editor', () => {
    expect(resolveBinding('Enter', ctx('ready'))).toBe('nav.enterNext');
    expect(resolveBinding('Enter', ctx('edit'))).toBe('edit.confirmAndMoveDown');
    expect(resolveBinding('Enter', ctx('enter'))).toBe('edit.confirmAndMoveDown');
    expect(resolveBinding('Enter', ctx('point'))).toBe('edit.confirmAndMoveDown');
    expect(resolveBinding('Shift+Enter', ctx('ready'))).toBe('nav.enterPrev');
    expect(resolveBinding('Shift+Enter', ctx('edit'))).toBe('edit.confirmAndMoveUp');
  });

  it('Esc smonta lo stato in Pronto e annulla la modifica negli editor', () => {
    expect(resolveBinding('Escape', ctx('ready'))).toBe('clipboard.clearMarquee');
    for (const mode of ['enter', 'edit', 'point'] as const) {
      expect(resolveBinding('Escape', ctx(mode))).toBe('edit.cancel');
    }
  });

  it('F2 apre la modifica e poi alterna Modifica/Punta', () => {
    expect(resolveBinding('F2', ctx('ready'))).toBe('edit.begin');
    for (const mode of ['enter', 'edit', 'point'] as const) {
      expect(resolveBinding('F2', ctx(mode))).toBe('edit.toggleEditPoint');
    }
  });

  it('Tab naviga da Pronto e conferma dagli editor', () => {
    expect(resolveBinding('Tab', ctx('ready'))).toBe('nav.tabNext');
    expect(resolveBinding('Tab', ctx('edit'))).toBe('edit.confirmAndTabNext');
    expect(resolveBinding('Shift+Tab', ctx('ready'))).toBe('nav.tabPrev');
    expect(resolveBinding('Shift+Tab', ctx('enter'))).toBe('edit.confirmAndTabPrev');
  });

  it('confermare con Tab NON e\' confermare con la freccia destra', () => {
    // Sembrano lo stesso gesto e non lo sono: Tab apre la catena che Invio poi
    // chiude riportando il cursore a capo sotto la colonna di partenza, la
    // freccia destra conferma e basta. Mapparli sullo stesso comando fa perdere
    // il "ritorno a capo", che e' meta' del motivo per cui si compila una
    // tabella da tastiera. Se qualcuno li unifica di nuovo, questo test cade.
    expect(resolveBinding('Tab', ctx('enter'))).not.toBe(
      resolveBinding('ArrowRight', ctx('enter')),
    );
    expect(resolveBinding('ArrowRight', ctx('enter'))).toBe('edit.confirmAndMoveRight');
  });

  it('Canc e Backspace cambiano bersaglio: la cella o il carattere', () => {
    expect(resolveBinding('Delete', ctx('ready'))).toBe('edit.clearContents');
    expect(resolveBinding('Delete', ctx('edit'))).toBe('edit.deleteForward');
    expect(resolveBinding('Backspace', ctx('ready'))).toBe('edit.clearAndBegin');
    expect(resolveBinding('Backspace', ctx('point'))).toBe('edit.deleteBackward');
  });

  it('Home e Fine passano dal foglio al testo', () => {
    expect(resolveBinding('Home', ctx('ready'))).toBe('nav.rowStart');
    expect(resolveBinding('Home', ctx('edit'))).toBe('edit.caretLineStart');
    expect(resolveBinding('End', ctx('ready'))).toBe('nav.toggleEndMode');
    expect(resolveBinding('End', ctx('enter'))).toBe('edit.caretLineEnd');
    expect(resolveBinding('Shift+Home', ctx('edit'))).toBe('edit.selectToLineStart');
    expect(resolveBinding('Shift+End', ctx('edit'))).toBe('edit.selectToLineEnd');
  });
});

describe('Ctrl+Alt+V: incolla speciale solo con appunti pieni', () => {
  it('apre il dialogo quando gli appunti hanno qualcosa', () => {
    expect(resolveBinding('Ctrl+Alt+V', ctx('ready'))).toBe('clipboard.pasteSpecialDialog');
    expect(resolveBinding('Ctrl+Alt+V', ctx('ready', { clipboardEmpty: false }))).toBe(
      'clipboard.pasteSpecialDialog',
    );
  });

  it('non fa nulla con gli appunti vuoti', () => {
    expect(resolveBinding('Ctrl+Alt+V', ctx('ready', { clipboardEmpty: true }))).toBeUndefined();
  });

  it('espone la sotto-keymap A/F/V/T/E/M del dialogo', () => {
    const perTasto = Object.fromEntries(PASTE_SPECIAL_OPTIONS.map((o) => [o.key, o.command]));
    expect(perTasto['V']).toBe('clipboard.pasteValues');
    expect(perTasto['T']).toBe('clipboard.pasteFormats');
    expect(perTasto['F']).toBe('clipboard.pasteFormulas');
    expect(perTasto['E']).toBe('clipboard.pasteTranspose');
    expect(perTasto['A']).toBe('clipboard.pasteAll');
    expect(perTasto['M']).toBe('clipboard.pasteMultiply');
  });
});

describe('firme senza binding nel contesto corrente', () => {
  it('restituisce undefined per una firma sconosciuta', () => {
    expect(resolveBinding('Ctrl+Shift+Q', ctx('ready'))).toBeUndefined();
  });

  it('"?" apre il cheat sheet solo da Pronto: mentre digiti e un carattere', () => {
    expect(resolveBinding('?', ctx('ready'))).toBe('ui.toggleCheatSheet');
    expect(resolveBinding('?', ctx('edit'))).toBeUndefined();
    expect(resolveBinding('?', ctx('enter'))).toBeUndefined();
  });

  it('le scorciatoie di struttura non scattano mentre si digita', () => {
    expect(resolveBinding('Ctrl+Space', ctx('edit'))).toBeUndefined();
    expect(resolveBinding('Ctrl+9', ctx('enter'))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Coerenza della tabella
// ---------------------------------------------------------------------------

describe('coerenza della tabella', () => {
  it('nessuna firma ha due binding attivi nello stesso stato', () => {
    expect(findBindingConflicts()).toEqual([]);
  });

  it('la risoluzione non e mai ambigua, su tutte le combinazioni firma x stato', () => {
    // Rete di sicurezza indipendente da findBindingConflicts: ricalcola a mano
    // i binding attivi e pretende che ne resti sempre uno solo per specificita'.
    for (const signature of allSignatures()) {
      for (const mode of ALL_MODES) {
        for (const hasTextSelection of [false, true]) {
          const dove = `${signature} / ${mode} / sel=${hasTextSelection}`;
          const attivi = BINDINGS.filter(
            (b) =>
              b.signature === signature &&
              b.modes.includes(mode) &&
              (b.requiresTextSelection !== true || hasTextSelection),
          );
          const risolto = resolveBinding(signature, { mode, hasTextSelection });
          if (attivi.length === 0) {
            expect(risolto, dove).toBeUndefined();
            continue;
          }
          // Il guard piu' specifico vince; fra pari specificita' non ci deve
          // essere concorrenza, altrimenti il vincitore sarebbe casuale.
          const atteso = attivi.find((b) => b.requiresTextSelection === true) ?? attivi[0];
          expect(risolto, dove).toBe(atteso.command);
          const pari = attivi.filter(
            (b) =>
              (b.requiresTextSelection ?? false) === (atteso.requiresTextSelection ?? false),
          );
          expect(pari, dove).toHaveLength(1);
        }
      }
    }
  });

  it('ogni binding ha almeno una modalita e una descrizione', () => {
    for (const b of BINDINGS) {
      expect(b.modes.length, b.signature).toBeGreaterThan(0);
      expect(b.description.trim(), b.signature).not.toBe('');
    }
  });

  it('bindingsForCommand trova tutte le firme alternative', () => {
    const goTo = bindingsForCommand('nav.goTo').map((b) => b.signature);
    expect(goTo).toEqual(['F5', 'Ctrl+G']);
    // Inserisci celle: riga dei numeri e tastierino.
    expect(bindingsForCommand('structure.insertDialog').map((b) => b.signature)).toEqual([
      'Ctrl+Shift+=',
      'Ctrl++',
    ]);
    expect(bindingsForCommand('nav.moveUp')).toHaveLength(1);
    expect(bindingsForCommand('structure.freezePanes')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. Le firme sono quelle che produce davvero la tastiera
// ---------------------------------------------------------------------------

function ev(key: string, code: string, mods: Partial<KeyLike> = {}): KeyLike {
  return { key, code, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...mods };
}

describe('dall evento tastiera al comando (layout italiano)', () => {
  const casi: ReadonlyArray<[string, KeyLike, Command]> = [
    ['Ctrl+Maiusc+Giù', ev('ArrowDown', 'ArrowDown', { ctrlKey: true, shiftKey: true }), 'nav.extendBlockDown'],
    // Su tastiera IT Maiusc+1 stampa "!": conta la posizione del tasto.
    ['Ctrl+Maiusc+1', ev('!', 'Digit1', { ctrlKey: true, shiftKey: true }), 'format.numberTwoDecimals'],
    ['Ctrl+~ (mostra formule)', ev('\\', 'Backquote', { ctrlKey: true }), 'formula.toggleShowFormulas'],
    ['Ctrl+[ (precedenti)', ev('è', 'BracketLeft', { ctrlKey: true }), 'nav.selectPrecedents'],
    ['Ctrl+] (dipendenti)', ev('+', 'BracketRight', { ctrlKey: true }), 'nav.selectDependents'],
    ['Alt+= (autosum)', ev('ì', 'Equal', { altKey: true }), 'formula.autosum'],
    ['Ctrl+Alt+V', ev('v', 'KeyV', { ctrlKey: true, altKey: true }), 'clipboard.pasteSpecialDialog'],
    ['Ctrl+Spazio', ev(' ', 'Space', { ctrlKey: true }), 'structure.selectColumn'],
    ['Maiusc+Spazio', ev(' ', 'Space', { shiftKey: true }), 'structure.selectRow'],
    ['Ctrl+- (elimina)', ev('-', 'Minus', { ctrlKey: true }), 'structure.deleteDialog'],
    ['Ctrl+Num+ (inserisci)', ev('+', 'NumpadAdd', { ctrlKey: true }), 'structure.insertDialog'],
    ['Alt+Maiusc+Destra (raggruppa)', ev('ArrowRight', 'ArrowRight', { altKey: true, shiftKey: true }), 'structure.group'],
    ['? (cheat sheet)', ev('?', 'Minus', { shiftKey: true }), 'ui.toggleCheatSheet'],
    ['Ctrl+Maiusc+L (filtro)', ev('L', 'KeyL', { ctrlKey: true, shiftKey: true }), 'data.filter'],
    ['Alt (barra dei menu)', ev('Alt', 'AltLeft', { altKey: true }), 'altMenu.open'],
  ];

  it.each([...casi])('%s', (_nome, evento, atteso) => {
    const firma = keySignature(evento);
    expect(firma).toBeDefined();
    expect(resolveBinding(firma!, ctx('ready'))).toBe(atteso);
  });
});

// ---------------------------------------------------------------------------
// 5. Cheat sheet: derivato, mai scritto due volte
// ---------------------------------------------------------------------------

describe('cheat sheet', () => {
  it('contiene una riga per ogni comando della tabella dei binding', () => {
    const comandiInRighe = new Set(allCheatSheetRows().map((r) => r.command));
    const mancanti = BINDINGS.map((b) => b.command).filter((c) => !comandiInRighe.has(c));
    expect(mancanti).toEqual([]);
  });

  it('fonde le firme alternative in una riga sola', () => {
    const righe = cheatSheetRowsForCommand('nav.goTo');
    expect(righe).toHaveLength(1);
    expect(righe[0].keys).toBe('F5 / Ctrl+G');
  });

  it('usa le etichette italiane dei tasti', () => {
    const riga = cheatSheetRowsForCommand('nav.extendBlockDown')[0];
    expect(riga.keys).toBe('Ctrl+Maiusc+Giù');
    expect(cheatSheetRowsForCommand('nav.selectPrecedents')[0].keys).toBe('Ctrl+[');
    expect(cheatSheetRowsForCommand('edit.newlineInCell')[0].keys).toBe('Alt+Invio');
  });

  it('annota il contesto solo quando serve', () => {
    const ripeti = cheatSheetRowsForCommand('edit.repeatLastAction')[0];
    expect(ripeti.context).toBeUndefined(); // vale da Pronto: e' il caso normale
    const ancore = cheatSheetRowsForCommand('edit.cycleAnchor')[0];
    expect(ancore.context).toContain('Modifica');
    const frammento = cheatSheetRowsForCommand('formula.evaluateFragment')[0];
    expect(frammento.context).toContain('con testo selezionato');
  });

  it('raggruppa nelle sei categorie del §3.1, senza sezioni vuote', () => {
    expect(CHEAT_SHEET.map((s) => s.title)).toEqual([
      'Navigazione',
      'Editing',
      'Struttura',
      'Formattazione',
      'Formule e audit',
      'Altro',
    ]);
    for (const sezione of CHEAT_SHEET) expect(sezione.rows.length).toBeGreaterThan(0);
  });

  it('include le sequenze Alt legacy prese dall albero, non riscritte a mano', () => {
    const autofit = cheatSheetRowsForCommand('structure.autofitColumn');
    expect(autofit).toHaveLength(1);
    expect(autofit[0].keys).toBe('Alt, H, O, I');
    expect(cheatSheetRowsForCommand('format.fillColor')[0].keys).toBe('Alt, H, H');
    expect(cheatSheetRowsForCommand('format.fontColor')[0].keys).toBe('Alt, H, F, C');
    expect(cheatSheetRowsForCommand('data.sort')[0].keys).toBe('Alt, A, S, S');
    expect(cheatSheetRowsForCommand('formula.tracePrecedents')[0].keys).toBe('Alt, M, P');
  });

  it('include la sotto-keymap di Incolla speciale', () => {
    const valori = cheatSheetRowsForCommand('clipboard.pasteValues')[0];
    expect(valori.keys).toBe('Ctrl+Alt+V, V');
  });

  it('non duplica un comando gia raggiungibile con un accordo', () => {
    // Alt+= e' anche foglia dell'albero Alt: una riga, non due.
    expect(cheatSheetRowsForCommand('formula.autosum')).toHaveLength(1);
  });

  it('cerca ignorando accenti e maiuscole', () => {
    const trovate = searchCheatSheet('giu').map((r) => r.command);
    expect(trovate).toContain('nav.moveDown');
    expect(searchCheatSheet('ancoragg').map((r) => r.command)).toContain('edit.cycleAnchor');
    expect(searchCheatSheet('   ')).toHaveLength(allCheatSheetRows().length);
    expect(searchCheatSheet('zzz-non-esiste')).toEqual([]);
  });
});
