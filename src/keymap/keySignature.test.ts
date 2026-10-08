import { describe, it, expect } from 'vitest';
import {
  keySignature,
  formatSignatureForDisplay,
  formatSignatureList,
  parseSignature,
  isAltGrTyping,
  isPrintableTyping,
  isModifierKey,
  type KeyLike,
} from './keySignature';

/** Costruttore comodo: i modificatori mancanti sono falsi. */
function ev(key: string, code: string, mods: Partial<KeyLike> = {}): KeyLike {
  return {
    key,
    code,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    ...mods,
  };
}

describe('ordine dei modificatori', () => {
  it('e sempre Ctrl+Alt+Shift+Meta', () => {
    expect(
      keySignature(ev('F2', 'F2', { ctrlKey: true, shiftKey: true, altKey: true, metaKey: true })),
    ).toBe('Ctrl+Alt+Shift+Meta+F2');
    expect(keySignature(ev('ArrowDown', 'ArrowDown', { shiftKey: true, ctrlKey: true }))).toBe(
      'Ctrl+Shift+ArrowDown',
    );
    expect(keySignature(ev('ArrowRight', 'ArrowRight', { altKey: true, shiftKey: true }))).toBe(
      'Alt+Shift+ArrowRight',
    );
  });

  it('riconosce la pressione isolata di un modificatore', () => {
    // Serve alla macchina Alt: Alt da solo apre la barra dei menu.
    expect(keySignature(ev('Alt', 'AltLeft', { altKey: true }))).toBe('Alt');
    expect(keySignature(ev('Control', 'ControlLeft', { ctrlKey: true }))).toBe('Ctrl');
    expect(keySignature(ev('Shift', 'ShiftLeft', { shiftKey: true, ctrlKey: true }))).toBe(
      'Ctrl+Shift',
    );
    expect(isModifierKey('Alt')).toBe(true);
    expect(isModifierKey('F2')).toBe(false);
  });
});

describe('tastiera italiana: si usa code, non key', () => {
  // Su layout IT, Maiusc+1 stampa "!" e Maiusc+9 stampa "(". Se leggessimo `key`,
  // Ctrl+Maiusc+1 (formato numero) e Ctrl+Maiusc+9 (scopri righe) non esisterebbero.
  it('Ctrl+Maiusc+1 funziona anche se il layout stampa "!"', () => {
    expect(keySignature(ev('!', 'Digit1', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+1');
  });

  it('Ctrl+9 e Ctrl+Maiusc+9 restano distinguibili', () => {
    expect(keySignature(ev('9', 'Digit9', { ctrlKey: true }))).toBe('Ctrl+9');
    expect(keySignature(ev('(', 'Digit9', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+9');
  });

  it('Alt+= (autosum) arriva dal tasto che su IT stampa "ì"', () => {
    expect(keySignature(ev('ì', 'Equal', { altKey: true }))).toBe('Alt+=');
    // Su US lo stesso tasto stampa "=".
    expect(keySignature(ev('=', 'Equal', { altKey: true }))).toBe('Alt+=');
  });

  it('Ctrl+` (mostra formule) arriva dal tasto che su IT stampa "\\"', () => {
    expect(keySignature(ev('\\', 'Backquote', { ctrlKey: true }))).toBe('Ctrl+Backquote');
    expect(keySignature(ev('~', 'Backquote', { ctrlKey: true, shiftKey: true }))).toBe(
      'Ctrl+Shift+Backquote',
    );
  });

  it('Ctrl+[ e Ctrl+] usano la posizione fisica (su IT stampano "è" e "+")', () => {
    expect(keySignature(ev('è', 'BracketLeft', { ctrlKey: true }))).toBe('Ctrl+BracketLeft');
    expect(keySignature(ev('+', 'BracketRight', { ctrlKey: true }))).toBe('Ctrl+BracketRight');
  });

  it("Ctrl+' (copia formula da sopra) usa il code Quote, su IT stampa \"à\"", () => {
    expect(keySignature(ev('à', 'Quote', { ctrlKey: true }))).toBe('Ctrl+Quote');
    expect(keySignature(ev('°', 'Quote', { ctrlKey: true, shiftKey: true }))).toBe(
      'Ctrl+Shift+Quote',
    );
  });

  it('accetta anche il tastierino numerico per inserisci/elimina celle', () => {
    // In Excel Ctrl+Num- elimina e Ctrl+Num+ inserisce: sono gli stessi comandi
    // di Ctrl+"-" e Ctrl+Maiusc+"+".
    expect(keySignature(ev('-', 'NumpadSubtract', { ctrlKey: true }))).toBe('Ctrl+-');
    expect(keySignature(ev('+', 'NumpadAdd', { ctrlKey: true }))).toBe('Ctrl++');
    expect(keySignature(ev('-', 'Minus', { ctrlKey: true }))).toBe('Ctrl+-');
    expect(keySignature(ev('_', 'Minus', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+-');
  });

  it('per le lettere ripiega sul code se il layout ha prodotto un carattere strano', () => {
    expect(keySignature(ev('b', 'KeyB', { ctrlKey: true }))).toBe('Ctrl+B');
    expect(keySignature(ev('B', 'KeyB', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+B');
    expect(keySignature(ev('Dead', 'KeyD', { ctrlKey: true }))).toBe('Ctrl+D');
  });
});

describe('AltGr non e Ctrl+Alt', () => {
  // Su Windows AltGr genera ctrlKey+altKey. Senza questa regola, digitare "@"
  // su tastiera italiana (AltGr+ò) attiverebbe una scorciatoia Ctrl+Alt.
  it('scarta le composizioni AltGr che producono un carattere', () => {
    const at = ev('@', 'Semicolon', { ctrlKey: true, altKey: true });
    expect(isAltGrTyping(at)).toBe(true);
    expect(keySignature(at)).toBeUndefined();
    expect(isPrintableTyping(at)).toBe(true);

    // AltGr+e -> "€"
    expect(keySignature(ev('€', 'KeyE', { ctrlKey: true, altKey: true }))).toBeUndefined();
    // L'evento del solo AltGr
    expect(keySignature(ev('AltGraph', 'AltRight', { ctrlKey: true, altKey: true }))).toBeUndefined();
  });

  it('Ctrl+Alt+V resta un binding vero (eccezione esplicita)', () => {
    const pasteSpecial = ev('v', 'KeyV', { ctrlKey: true, altKey: true });
    expect(isAltGrTyping(pasteSpecial)).toBe(false);
    expect(keySignature(pasteSpecial)).toBe('Ctrl+Alt+V');
  });

  it('Ctrl+Alt su tasti non stampabili resta una scorciatoia', () => {
    expect(keySignature(ev('F9', 'F9', { ctrlKey: true, altKey: true }))).toBe('Ctrl+Alt+F9');
    expect(keySignature(ev('ArrowDown', 'ArrowDown', { ctrlKey: true, altKey: true }))).toBe(
      'Ctrl+Alt+ArrowDown',
    );
  });
});

describe('tasti speciali', () => {
  it('normalizza lo spazio e gli alias legacy', () => {
    expect(keySignature(ev(' ', 'Space', { ctrlKey: true }))).toBe('Ctrl+Space');
    expect(keySignature(ev(' ', 'Space', { shiftKey: true }))).toBe('Shift+Space');
    expect(keySignature(ev('Esc', 'Escape'))).toBe('Escape');
    expect(keySignature(ev('Del', 'Delete'))).toBe('Delete');
    expect(keySignature(ev('Down', 'ArrowDown'))).toBe('ArrowDown');
  });

  it('"?" apre il cheat sheet da qualunque layout', () => {
    // Su US "?" e Maiusc+Slash, su IT e Maiusc+Minus: due code diversi,
    // stesso carattere. Qui il carattere e piu affidabile della posizione.
    expect(keySignature(ev('?', 'Slash', { shiftKey: true }))).toBe('?');
    expect(keySignature(ev('?', 'Minus', { shiftKey: true }))).toBe('?');
  });

  it('la ripetizione automatica non cambia la firma', () => {
    // Tenere premuta la freccia deve continuare a navigare.
    expect(keySignature(ev('ArrowDown', 'ArrowDown', { repeat: true }))).toBe('ArrowDown');
  });
});

describe('isPrintableTyping', () => {
  it('distingue digitazione da scorciatoia', () => {
    expect(isPrintableTyping(ev('5', 'Digit5'))).toBe(true);
    expect(isPrintableTyping(ev('a', 'KeyA'))).toBe(true);
    expect(isPrintableTyping(ev('A', 'KeyA', { shiftKey: true }))).toBe(true);
    expect(isPrintableTyping(ev('a', 'KeyA', { ctrlKey: true }))).toBe(false);
    expect(isPrintableTyping(ev('ArrowDown', 'ArrowDown'))).toBe(false);
    expect(isPrintableTyping(ev('Shift', 'ShiftLeft', { shiftKey: true }))).toBe(false);
  });
});

describe('parseSignature', () => {
  it('non si rompe sui token che sono "+"', () => {
    expect(parseSignature('Ctrl++')).toEqual({ mods: ['Ctrl'], token: '+' });
    expect(parseSignature('Ctrl+Shift+=')).toEqual({ mods: ['Ctrl', 'Shift'], token: '=' });
    expect(parseSignature('Alt+Shift+ArrowRight')).toEqual({
      mods: ['Alt', 'Shift'],
      token: 'ArrowRight',
    });
    expect(parseSignature('F2')).toEqual({ mods: [], token: 'F2' });
    expect(parseSignature('Alt')).toEqual({ mods: [], token: 'Alt' });
  });
});

describe('formatSignatureForDisplay', () => {
  it('traduce in italiano per il cheat sheet e loverlay tastiera', () => {
    expect(formatSignatureForDisplay('Ctrl+Shift+ArrowDown')).toBe('Ctrl+Maiusc+Giù');
    expect(formatSignatureForDisplay('Shift+Enter')).toBe('Maiusc+Invio');
    expect(formatSignatureForDisplay('Ctrl+Shift+End')).toBe('Ctrl+Maiusc+Fine');
    expect(formatSignatureForDisplay('Alt+PageDown')).toBe('Alt+PagGiù');
    expect(formatSignatureForDisplay('Delete')).toBe('Canc');
    expect(formatSignatureForDisplay('Escape')).toBe('Esc');
    expect(formatSignatureForDisplay('Ctrl+Space')).toBe('Ctrl+Spazio');
  });

  it('rende leggibile la punteggiatura tenuta come token nominale', () => {
    expect(formatSignatureForDisplay('Ctrl+Backquote')).toBe('Ctrl+`');
    expect(formatSignatureForDisplay('Ctrl+BracketLeft')).toBe('Ctrl+[');
    expect(formatSignatureForDisplay('Ctrl+BracketRight')).toBe('Ctrl+]');
    expect(formatSignatureForDisplay('Ctrl+Quote')).toBe("Ctrl+'");
  });

  it('lascia intatti i token gia leggibili', () => {
    expect(formatSignatureForDisplay('Alt+=')).toBe('Alt+=');
    expect(formatSignatureForDisplay('Ctrl+Shift+1')).toBe('Ctrl+Maiusc+1');
    expect(formatSignatureForDisplay('F4')).toBe('F4');
    expect(formatSignatureForDisplay('?')).toBe('?');
  });

  it('formatta un elenco', () => {
    expect(formatSignatureList(['F5', 'Ctrl+G'])).toBe('F5 / Ctrl+G');
  });
});
