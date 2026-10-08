import { describe, it, expect } from 'vitest';
import { displayCell } from './cellDisplay';
import { MODEL_COLORS } from '../styles/palette';

const base = { formula: undefined, style: {}, showFormulas: false };

describe('allineamento predefinito', () => {
  it('numeri a destra, testo a sinistra, booleani al centro', () => {
    // E' il modo in cui si riconosce a vista un numero importato come testo,
    // che lo spec §5 (M0-A e M0-D) insegna esplicitamente. Se sbagliassimo
    // questo, il gioco insegnerebbe a diffidare dell'unico indizio disponibile.
    expect(displayCell({ ...base, value: 1234 }).align).toBe('right');
    expect(displayCell({ ...base, value: '1234' }).align).toBe('left');
    expect(displayCell({ ...base, value: true }).align).toBe('center');
  });

  it('un allineamento esplicito nello stile vince sul predefinito', () => {
    expect(displayCell({ ...base, value: 1234, style: { halign: 'left' } }).align).toBe('left');
    expect(displayCell({ ...base, value: 1234, style: { halign: 'general' } }).align).toBe('right');
  });
});

describe('errori', () => {
  const errore = { value: '#DIV/0!', type: 'DIV_BY_ZERO' };

  it('sono mostrati per esteso e in rosso', () => {
    const d = displayCell({ ...base, value: errore });
    expect(d.text).toBe('#DIV/0!');
    expect(d.isError).toBe(true);
    expect(d.color).toBe(MODEL_COLORS.external);
  });

  it('non vengono mai mascherati da ####, per quanto stretta sia la colonna', () => {
    const d = displayCell({ ...base, value: errore, widthPx: 8 });
    expect(d.text).toBe('#DIV/0!');
    expect(d.overflow).toBe(false);
  });
});

describe('mostra formule (Ctrl+~)', () => {
  it('sostituisce il valore col testo della formula, a sinistra', () => {
    const d = displayCell({ ...base, value: 42, formula: '=B1+B2', showFormulas: true });
    expect(d.text).toBe('=B1+B2');
    expect(d.align).toBe('left');
  });

  it('su una cella senza formula mostra il valore grezzo', () => {
    expect(displayCell({ ...base, value: 42, showFormulas: true }).text).toBe('42');
    expect(displayCell({ ...base, value: null, showFormulas: true }).text).toBe('');
  });
});

describe('formato numerico', () => {
  it('applica il formato della cella', () => {
    expect(displayCell({ ...base, value: 0.153, style: { numFmt: '0.0%' } }).text).toBe('15,3%');
    expect(displayCell({ ...base, value: 4.25, style: { numFmt: '0.0x' } }).text).toBe('4,3x');
  });

  it('il colore del formato ha la precedenza su quello dello stile', () => {
    // In Excel [Red] dentro il formato numerico vince sul colore carattere.
    const d = displayCell({
      ...base,
      value: -100,
      style: { numFmt: '#,##0;[Red]-#,##0', fontColor: MODEL_COLORS.input },
    });
    expect(d.color?.toLowerCase()).not.toBe(MODEL_COLORS.input.toLowerCase());
  });

  it('senza formato usa il colore carattere dello stile', () => {
    const d = displayCell({ ...base, value: 100, style: { fontColor: MODEL_COLORS.input } });
    expect(d.color).toBe(MODEL_COLORS.input);
  });
});

describe('####', () => {
  it('compare quando un numero non ci sta nella colonna', () => {
    const d = displayCell({ ...base, value: 123456789012, style: { numFmt: '#,##0' }, widthPx: 30 });
    expect(d.overflow).toBe(true);
    expect(d.text).toMatch(/^#+$/);
  });

  it('non compare per il testo: in Excel il testo deborda, non si maschera', () => {
    const d = displayCell({ ...base, value: 'una descrizione molto lunga', widthPx: 30 });
    expect(d.overflow).toBe(false);
    expect(d.text).toBe('una descrizione molto lunga');
  });

  it('non compare se la colonna e\' abbastanza larga', () => {
    expect(displayCell({ ...base, value: 42, widthPx: 84 }).overflow).toBe(false);
  });

  it('non compare se la larghezza non e\' nota', () => {
    expect(displayCell({ ...base, value: 123456789012 }).overflow).toBe(false);
  });
});

describe('cella vuota', () => {
  it('non mostra nulla, qualunque formato abbia', () => {
    expect(displayCell({ ...base, value: null, style: { numFmt: '#,##0' } }).text).toBe('');
  });

  it('lo zero invece si vede: in un bilancio la differenza conta', () => {
    expect(displayCell({ ...base, value: 0, style: { numFmt: '#,##0' } }).text).toBe('0');
  });
});
