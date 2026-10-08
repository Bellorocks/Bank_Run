/**
 * Test dei formati numerici.
 *
 * Regola di questi test: i valori attesi sono quelli che darebbe EXCEL, scritti a
 * mano. Dove Excel fa una cosa che sembra sbagliata (il `-0`, il 29/02/1900, il
 * valore assoluto passato alla sezione dei negativi) il test la fissa di
 * proposito: e' proprio quel comportamento che il trainer deve insegnare.
 *
 * L'output atteso e' in locale italiano — virgola decimale, punto migliaia —
 * mentre i formati restano in sintassi Excel, dove il punto e' sempre il decimale.
 */

import { describe, expect, it } from 'vitest';

import {
  canonicalizeFormat,
  DEFAULT_FORMATS,
  formatNumber,
  formatsEquivalent,
  NUMBER_FORMAT_SHORTCUTS,
  parseNumberFormat,
  serialToDate,
} from './numberFormat';

/** Scorciatoia: nei test quasi sempre interessa solo il testo. */
function txt(value: number | string | boolean | null, format: string): string {
  return formatNumber(value, format).text;
}

// ---------------------------------------------------------------------------
// parseNumberFormat — la struttura che ispeziona il grader
// ---------------------------------------------------------------------------

describe('parseNumberFormat', () => {
  it('legge raggruppamento, decimali e cifre obbligatorie', () => {
    const p = parseNumberFormat('#,##0.00');
    expect(p.sections).toHaveLength(1);
    expect(p.negativeIsExplicit).toBe(false);
    expect(p.positive.kind).toBe('number');
    expect(p.positive.numeric).toMatchObject({
      grouping: true,
      minIntDigits: 1,
      minDecimals: 2,
      maxDecimals: 2,
      scaleCommas: 0,
      percentCount: 0,
    });
  });

  it('distingue la virgola di raggruppamento da quella di scala', () => {
    expect(parseNumberFormat('#,##0,').positive.numeric).toMatchObject({ grouping: true, scaleCommas: 1 });
    expect(parseNumberFormat('#,##0,,').positive.numeric).toMatchObject({ grouping: true, scaleCommas: 2 });
    expect(parseNumberFormat('0,,').positive.numeric).toMatchObject({ grouping: false, scaleCommas: 2 });
  });

  it('tre sezioni: positivo, negativo, zero — e la terza puo\' essere solo testo', () => {
    const p = parseNumberFormat('#,##0;(#,##0);-');
    expect(p.sections).toHaveLength(3);
    expect(p.negativeIsExplicit).toBe(true);
    expect(p.zero.kind).toBe('literal');
    expect(p.text).toBeNull();
  });

  it('due sezioni: lo zero eredita dalla sezione dei positivi', () => {
    const p = parseNumberFormat('#,##0;(#,##0)');
    expect(p.zero).toBe(p.positive);
    expect(p.negative).not.toBe(p.positive);
  });

  it('quattro sezioni: la quarta e\' quella del testo', () => {
    const p = parseNumberFormat('#,##0;(#,##0);-;"n.d."');
    expect(p.sections).toHaveLength(4);
    expect(p.text).not.toBeNull();
  });

  it('il punto e virgola dentro le virgolette non divide le sezioni', () => {
    const p = parseNumberFormat('0" ; "0');
    expect(p.sections).toHaveLength(1);
  });

  it('conta le percentuali', () => {
    expect(parseNumberFormat('0.0%').positive.numeric).toMatchObject({ percentCount: 1, maxDecimals: 1 });
  });

  it('riconosce i colori per nome, in inglese e in italiano', () => {
    expect(parseNumberFormat('[Red]0').positive.color).toBe('#FF0000');
    expect(parseNumberFormat('[Rosso]0').positive.color).toBe('#FF0000');
    expect(parseNumberFormat('[Blue]0').positive.color).toBe('#0000FF');
    expect(parseNumberFormat('[Black]0').positive.color).toBe('#000000');
    expect(parseNumberFormat('[Green]0').positive.color).toBe('#00B050');
  });

  it('riconosce la forma indicizzata [Color3]', () => {
    expect(parseNumberFormat('[Color3]0').positive.color).toBe('#FF0000');
    expect(parseNumberFormat('[Color5]0').positive.color).toBe('#0000FF');
  });

  it('cio\' che sta fra quadre e non e\' un colore resta conservato come condizione', () => {
    const p = parseNumberFormat('[>1000]#,##0');
    expect(p.positive.color).toBeUndefined();
    expect(p.positive.conditions).toEqual(['>1000']);
  });

  it('riconosce le sezioni data e non le confonde con i numeri', () => {
    expect(parseNumberFormat('gg/mm/aaaa').positive.kind).toBe('date');
    expect(parseNumberFormat('mm/aa').positive.kind).toBe('date');
    expect(parseNumberFormat('General').positive.kind).toBe('general');
    expect(parseNumberFormat('@').positive.kind).toBe('text');
  });

  it('nel multiplo 0.0x la x e\' testo, non un codice: la sezione resta numerica', () => {
    const p = parseNumberFormat('0.0x');
    expect(p.positive.kind).toBe('number');
    expect(p.positive.tokens.some((t) => t.kind === 'literal' && t.text === 'x')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Numeri: base
// ---------------------------------------------------------------------------

describe('formatNumber — numeri di base', () => {
  it('raggruppa le migliaia col punto (locale italiano)', () => {
    expect(txt(1500, '#,##0')).toBe('1.500');
    expect(txt(1234567, '#,##0')).toBe('1.234.567');
  });

  it('senza raggruppamento nel formato non raggruppa', () => {
    expect(txt(1234567, '0')).toBe('1234567');
  });

  it('il decimale in output e\' la virgola anche se nel formato e\' il punto', () => {
    expect(txt(1234.5, '#,##0.00')).toBe('1.234,50');
    expect(txt(0.5, '0.00')).toBe('0,50');
  });

  it('en-US usa gli stessi formati ma separatori invertiti', () => {
    expect(formatNumber(1234.5, '#,##0.00', { locale: 'en-US' }).text).toBe('1,234.50');
    expect(formatNumber(1234.5, '#,##0.00', { locale: 'it-IT' }).text).toBe('1.234,50');
  });

  it('lo 0 e\' obbligatorio, il # e\' opzionale', () => {
    expect(txt(0, '#,##0')).toBe('0');
    expect(txt(0, '#')).toBe('');
    expect(txt(5, '0000')).toBe('0005');
  });

  it('il ? riempie con spazi al posto degli zeri', () => {
    expect(txt(5, '???0')).toBe('   5');
    expect(txt(1.5, '0.???')).toBe('1,5  ');
  });

  it('i # decimali finali non stampano zeri non significativi', () => {
    expect(txt(1.5, '0.0#')).toBe('1,5');
    expect(txt(1.55, '0.0#')).toBe('1,55');
    expect(txt(1.5, '0.00')).toBe('1,50');
  });
});

// ---------------------------------------------------------------------------
// Numeri: negativi e zero
// ---------------------------------------------------------------------------

describe('formatNumber — negativi', () => {
  it('senza sezione negativi il meno lo mette Excel', () => {
    expect(txt(-1500, '#,##0')).toBe('-1.500');
    expect(txt(-1234.5, '#,##0.00')).toBe('-1.234,50');
  });

  it('CON una sezione negativi Excel passa il VALORE ASSOLUTO: niente doppio segno', () => {
    // Il caso che sbagliano tutti i cloni: "#,##0;(#,##0)" su -1500 deve dare
    // "(1.500)" e non "(-1.500)".
    expect(txt(-1500, '#,##0;(#,##0)')).toBe('(1.500)');
    expect(txt(-1234.5, '#,##0.00;(#,##0.00)')).toBe('(1.234,50)');
  });

  it('se la sezione negativi vuole il meno, deve scriverlo lei', () => {
    expect(txt(-1500, '#,##0;-#,##0')).toBe('-1.500');
    expect(txt(-1234.5, '#,##0.00 "€";-#,##0.00 "€"')).toBe('-1.234,50 €');
  });

  it('formato contabile completo: positivo, parentesi, trattino sullo zero', () => {
    const fmt = '#,##0;(#,##0);-';
    expect(txt(1500, fmt)).toBe('1.500');
    expect(txt(-1500, fmt)).toBe('(1.500)');
    expect(txt(0, fmt)).toBe('-');
  });

  it('un negativo che arrotonda a zero resta nella sezione dei negativi', () => {
    expect(txt(-0.4, '#,##0;(#,##0);-')).toBe('(0)');
    // Senza sezione negativi si ottiene il famigerato "-0" di Excel.
    expect(txt(-0.4, '#,##0')).toBe('-0');
  });

  it('lo zero negativo di JS e\' zero e basta', () => {
    expect(txt(-0, '0.00')).toBe('0,00');
    expect(txt(-0, '#,##0;(#,##0);-')).toBe('-');
  });

  it('una sezione vuota nasconde il valore', () => {
    expect(txt(0, '#,##0;;')).toBe('');
    expect(txt(-5, '#,##0;;')).toBe('');
    expect(txt(5, '#,##0;;')).toBe('5');
  });
});

// ---------------------------------------------------------------------------
// Arrotondamento
// ---------------------------------------------------------------------------

describe('formatNumber — arrotondamento', () => {
  it('lo 0,5 va per eccesso, non al pari (niente banker rounding)', () => {
    expect(txt(0.5, '0')).toBe('1');
    expect(txt(1.5, '0')).toBe('2');
    expect(txt(2.5, '0')).toBe('3');
    expect(txt(3.5, '0')).toBe('4');
  });

  it('sui negativi lo 0,5 si allontana da zero: Math.round(-0.5) darebbe -0', () => {
    expect(txt(-0.5, '0')).toBe('-1');
    expect(txt(-1.5, '0')).toBe('-2');
    expect(txt(-2.5, '0')).toBe('-3');
  });

  it('arrotonda sulla decimale a 15 cifre come Excel, non sul binario', () => {
    // In binario 1.005 e' 1.00499999...: toFixed darebbe "1.00", Excel mostra 1,01.
    expect(txt(1.005, '0.00')).toBe('1,01');
    expect(txt(2.675, '0.00')).toBe('2,68');
  });

  it('il riporto propaga fino a creare una cifra nuova', () => {
    expect(txt(9.99, '0.0')).toBe('10,0');
    expect(txt(999.5, '#,##0')).toBe('1.000');
    expect(txt(0.999, '0.00')).toBe('1,00');
  });
});

// ---------------------------------------------------------------------------
// Scala: migliaia e milioni
// ---------------------------------------------------------------------------

describe('formatNumber — la virgola finale come scala', () => {
  it('una virgola finale divide per mille', () => {
    expect(txt(1500000, '#,##0,')).toBe('1.500');
    expect(txt(1500, '#,##0,')).toBe('2');
    expect(txt(1500, '#,##0.0,')).toBe('1,5');
  });

  it('due virgole finali dividono per un milione', () => {
    expect(txt(2500000000, '#,##0,,')).toBe('2.500');
    expect(txt(1234567890, '#,##0.0,,')).toBe('1.234,6');
  });

  it('la scala non tocca il valore, solo la vista: si combina col suffisso', () => {
    expect(txt(1234567, '#,##0, "k€"')).toBe('1.235 k€');
    expect(txt(1234567890, '#,##0,, "mln"')).toBe('1.235 mln');
  });
});

// ---------------------------------------------------------------------------
// Percentuali
// ---------------------------------------------------------------------------

describe('formatNumber — percentuali', () => {
  it('Excel memorizza 0,15 e mostra 15% (spec §5)', () => {
    expect(txt(0.15, '0%')).toBe('15%');
    expect(txt(0.15, '0.0%')).toBe('15,0%');
  });

  it('battere 15 invece di 0,15 da 1500%: l\'errore che il livello deve indurre', () => {
    expect(txt(15, '0%')).toBe('1500%');
  });

  it('percentuali negative e arrotondate', () => {
    expect(txt(-0.075, '0.0%')).toBe('-7,5%');
    expect(txt(0.155, '0%')).toBe('16%');
    expect(txt(0.005, '0%')).toBe('1%');
  });
});

// ---------------------------------------------------------------------------
// Valuta, multipli, testo letterale
// ---------------------------------------------------------------------------

describe('formatNumber — simboli e letterali', () => {
  it('simbolo di valuta fra virgolette', () => {
    expect(txt(1234.5, '#,##0.00 "€"')).toBe('1.234,50 €');
  });

  it('simbolo di valuta in testa, senza virgolette', () => {
    expect(formatNumber(1500, '$#,##0', { locale: 'en-US' }).text).toBe('$1,500');
  });

  it('escape con backslash', () => {
    expect(txt(1500, '#,##0\\ \\€')).toBe('1.500 €');
  });

  it('il multiplo dei banker: 0.0x per EV/EBITDA e leva', () => {
    expect(txt(8.25, '0.0x')).toBe('8,3x');
    expect(txt(12, '0.0x')).toBe('12,0x');
    expect(txt(3.45, '0.00x')).toBe('3,45x');
  });

  it('_x riserva la larghezza di un carattere e diventa uno spazio', () => {
    expect(txt(1500, '#,##0_)')).toBe('1.500 ');
  });
});

// ---------------------------------------------------------------------------
// Colori
// ---------------------------------------------------------------------------

describe('formatNumber — colori', () => {
  it('il colore della sezione arriva nel risultato', () => {
    const fmt = '[Blue]#,##0;[Red](#,##0)';
    expect(formatNumber(1500, fmt)).toEqual({ text: '1.500', color: '#0000FF', align: 'right' });
    expect(formatNumber(-1500, fmt)).toEqual({ text: '(1.500)', color: '#FF0000', align: 'right' });
  });

  it('senza colore il campo non c\'e\'', () => {
    expect(formatNumber(1500, '#,##0').color).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Estremi e valori non numerici
// ---------------------------------------------------------------------------

describe('formatNumber — estremi', () => {
  it('numeri molto grandi restano interi, senza notazione scientifica', () => {
    expect(txt(1e15, '#,##0')).toBe('1.000.000.000.000.000');
    expect(txt(999999999999999, '#,##0')).toBe('999.999.999.999.999');
  });

  it('numeri molto piccoli', () => {
    expect(txt(0.0000001, '#,##0.00')).toBe('0,00');
    expect(txt(0.0000001, '0.00000000')).toBe('0,00000010');
    expect(txt(1e-15, '0.00')).toBe('0,00');
  });

  it('General: decimali solo se servono, nessun raggruppamento', () => {
    expect(txt(1234.5, 'General')).toBe('1234,5');
    expect(txt(100, 'General')).toBe('100');
    expect(txt(0, 'General')).toBe('0');
    expect(txt(-0.4, 'General')).toBe('-0,4');
    expect(txt(0.1 + 0.2, 'General')).toBe('0,3');
  });

  it('General passa alla notazione scientifica sugli estremi', () => {
    expect(txt(1e12, 'General')).toBe('1E+12');
    expect(txt(1.23e-15, 'General')).toBe('1,23E-15');
  });

  it('formato vuoto vale General', () => {
    expect(txt(1234.5, '')).toBe('1234,5');
  });
});

describe('formatNumber — valori non numerici', () => {
  it('una stringa passata a un formato numerico resta testo, a sinistra', () => {
    expect(formatNumber('ciao', '#,##0')).toEqual({ text: 'ciao', align: 'left' });
  });

  it('anche una stringa che sembra un numero resta testo: e\' il bug da insegnare', () => {
    expect(formatNumber('1500', '#,##0')).toEqual({ text: '1500', align: 'left' });
  });

  it('la quarta sezione formatta il testo', () => {
    expect(txt('boh', '#,##0;(#,##0);-;"n.d."')).toBe('n.d.');
    expect(txt('ciao', '@" mln"')).toBe('ciao mln');
    expect(txt('ciao', '"["@"]"')).toBe('[ciao]');
    expect(txt('ciao', '@')).toBe('ciao');
  });

  it('booleani: VERO/FALSO al centro, formato ignorato', () => {
    expect(formatNumber(true, '#,##0')).toEqual({ text: 'VERO', align: 'center' });
    expect(formatNumber(false, '0.00')).toEqual({ text: 'FALSO', align: 'center' });
  });

  it('cella vuota: nessun formato la fa apparire', () => {
    expect(formatNumber(null, '#,##0;(#,##0);-')).toEqual({ text: '', align: 'left' });
  });

  it('gli errori si mostrano tali e quali, centrati', () => {
    expect(formatNumber('#DIV/0!', '#,##0')).toEqual({ text: '#DIV/0!', align: 'center' });
    expect(formatNumber('#N/A', '#,##0')).toEqual({ text: '#N/A', align: 'center' });
    expect(formatNumber('#REF!', 'General')).toEqual({ text: '#REF!', align: 'center' });
  });

  it('NaN e infinito diventano #NUM!', () => {
    expect(formatNumber(NaN, '#,##0').text).toBe('#NUM!');
    expect(formatNumber(Infinity, '#,##0').text).toBe('#NUM!');
  });

  it('i numeri sono allineati a destra, sempre', () => {
    expect(formatNumber(1500, '#,##0').align).toBe('right');
    expect(formatNumber(45000, 'gg/mm/aaaa').align).toBe('right');
  });
});

// ---------------------------------------------------------------------------
// Date seriali
// ---------------------------------------------------------------------------

describe('serialToDate', () => {
  it('il giorno 1 e\' il 01/01/1900', () => {
    expect(serialToDate(1)).toMatchObject({ year: 1900, month: 1, day: 1 });
  });

  it('conserva il bug dell\'anno bisestile 1900: il seriale 60 e\' il 29/02/1900', () => {
    // Un giorno che non e' mai esistito. Excel lo tiene per compatibilita' col
    // Lotus 1-2-3 e noi lo teniamo per compatibilita' con Excel.
    expect(serialToDate(59)).toMatchObject({ year: 1900, month: 2, day: 28 });
    expect(serialToDate(60)).toMatchObject({ year: 1900, month: 2, day: 29 });
    expect(serialToDate(61)).toMatchObject({ year: 1900, month: 3, day: 1 });
  });

  it('il seriale 0 e\' il "giorno zero" di gennaio 1900', () => {
    expect(serialToDate(0)).toMatchObject({ year: 1900, month: 1, day: 0 });
  });

  it('date moderne', () => {
    expect(serialToDate(44927)).toMatchObject({ year: 2023, month: 1, day: 1 });
    expect(serialToDate(45000)).toMatchObject({ year: 2023, month: 3, day: 15 });
  });

  it('la parte frazionaria e\' l\'ora', () => {
    expect(serialToDate(45000.5)).toMatchObject({ hour: 12, minute: 0, second: 0 });
    expect(serialToDate(45000.75)).toMatchObject({ hour: 18, minute: 0 });
  });

  it('il giorno della settimana segue il seriale, come WEEKDAY di Excel', () => {
    // 15/03/2023 era un mercoledi'.
    expect(serialToDate(45000).weekday).toBe(3);
  });
});

describe('formatNumber — date', () => {
  it('gg/mm/aaaa', () => {
    expect(txt(45000, 'gg/mm/aaaa')).toBe('15/03/2023');
    expect(txt(44927, 'gg/mm/aaaa')).toBe('01/01/2023');
    expect(txt(1, 'gg/mm/aaaa')).toBe('01/01/1900');
    expect(txt(60, 'gg/mm/aaaa')).toBe('29/02/1900');
  });

  it('mm/aa: l\'intestazione di colonna di ogni modello', () => {
    expect(txt(45000, 'mm/aa')).toBe('03/23');
  });

  it('nomi di mese e di giorno', () => {
    expect(txt(45000, 'mmm aaaa')).toBe('mar 2023');
    expect(txt(45000, 'mmmm aaaa')).toBe('marzo 2023');
    expect(txt(45000, 'gggg gg mmmm')).toBe('mercoledi 15 marzo');
  });

  it('la m dopo la h sono minuti, non mesi', () => {
    expect(txt(0.5, 'hh:mm')).toBe('12:00');
    expect(txt(45000.5, 'gg/mm/aaaa hh:mm')).toBe('15/03/2023 12:00');
  });

  it('lo stesso seriale con un formato numerico mostra il numero', () => {
    expect(txt(45000, '#,##0')).toBe('45.000');
  });
});

// ---------------------------------------------------------------------------
// Equivalenza fra formati
// ---------------------------------------------------------------------------

describe('formatsEquivalent', () => {
  it('le sezioni implicite valgono quelle esplicite', () => {
    expect(formatsEquivalent('#,##0', '#,##0;-#,##0;#,##0')).toBe(true);
  });

  it('i codici data non sono sensibili al maiuscolo', () => {
    expect(formatsEquivalent('gg/mm/aaaa', 'GG/MM/AAAA')).toBe(true);
  });

  it('virgolette, backslash e carattere nudo sono lo stesso letterale', () => {
    expect(formatsEquivalent('#,##0.00 "€"', '#,##0.00 \\€')).toBe(true);
    expect(formatsEquivalent('0.0x', '0.0"x"')).toBe(true);
  });

  it('i colori si confrontano risolti, non per nome', () => {
    expect(formatsEquivalent('[Red]0', '[Color3]0')).toBe(true);
    expect(formatsEquivalent('[Rosso]0', '[Red]0')).toBe(true);
    expect(formatsEquivalent('[Red]0', '[Blue]0')).toBe(false);
  });

  it('General, Generale e Standard sono lo stesso formato', () => {
    expect(formatsEquivalent('General', 'Standard')).toBe(true);
    expect(formatsEquivalent('General', 'Generale')).toBe(true);
  });

  it('differenze che contano davvero restano differenze', () => {
    expect(formatsEquivalent('#,##0', '#,##0.00')).toBe(false);
    expect(formatsEquivalent('#,##0', '#,##0;(#,##0)')).toBe(false);
    expect(formatsEquivalent('#,##0', '#,##0,')).toBe(false);
    expect(formatsEquivalent('0%', '0.0%')).toBe(false);
    expect(formatsEquivalent('#,##0', '0')).toBe(false);
  });

  it('la forma canonica ha sempre quattro sezioni', () => {
    expect(canonicalizeFormat('#,##0').split(';')).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Formati predefiniti
// ---------------------------------------------------------------------------

describe('DEFAULT_FORMATS', () => {
  it('ci sono tutti gli otto formati previsti', () => {
    expect(Object.keys(DEFAULT_FORMATS).sort()).toEqual(
      ['data', 'generale', 'migliaia', 'milioni', 'multiplo', 'numero2dec', 'percentuale', 'valuta'].sort(),
    );
  });

  it('rendono quello che promettono', () => {
    expect(txt(1234.5, DEFAULT_FORMATS.numero2dec)).toBe('1.234,50');
    expect(txt(-1234.5, DEFAULT_FORMATS.valuta)).toBe('-1.234,50 €');
    expect(txt(0.15, DEFAULT_FORMATS.percentuale)).toBe('15%');
    expect(txt(1500000, DEFAULT_FORMATS.migliaia)).toBe('1.500');
    expect(txt(1500000000, DEFAULT_FORMATS.milioni)).toBe('1.500');
    expect(txt(8.25, DEFAULT_FORMATS.multiplo)).toBe('8,3x');
    expect(txt(45000, DEFAULT_FORMATS.data)).toBe('15/03/2023');
    expect(txt(1234.5, DEFAULT_FORMATS.generale)).toBe('1234,5');
  });

  it('le tre scorciatoie di spec §3.1 sono mappate', () => {
    expect(NUMBER_FORMAT_SHORTCUTS['Ctrl+Shift+1']).toBe(DEFAULT_FORMATS.numero2dec);
    expect(NUMBER_FORMAT_SHORTCUTS['Ctrl+Shift+4']).toBe(DEFAULT_FORMATS.valuta);
    expect(NUMBER_FORMAT_SHORTCUTS['Ctrl+Shift+5']).toBe(DEFAULT_FORMATS.percentuale);
  });
});
