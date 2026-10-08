import { describe, it, expect } from 'vitest';
import {
  createAltMachine,
  flattenAltTree,
  EXCEL_ALT_TREE,
  type AltFeedResult,
  type AltMachine,
} from './altSequence';

/** Alimenta la macchina con una sequenza e restituisce l'ultimo risultato. */
function run(machine: AltMachine, keys: readonly string[]): AltFeedResult {
  let last: AltFeedResult = { state: 'idle', path: [] };
  for (const k of keys) last = machine.feed(k);
  return last;
}

describe('cammini completi', () => {
  it('Alt,H,O,I esegue autofit colonna', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    expect(m.feed('Alt')).toEqual({ state: 'pending', path: [] });
    expect(m.feed('H')).toEqual({ state: 'pending', path: ['H'] });
    expect(m.feed('O')).toEqual({ state: 'pending', path: ['H', 'O'] });
    expect(m.feed('I')).toEqual({
      state: 'fired',
      path: ['H', 'O', 'I'],
      command: 'structure.autofitColumn',
    });
    // Dopo l'esecuzione la barra e chiusa.
    expect(m.isOpen()).toBe(false);
    expect(m.pathLabel()).toBe('');
  });

  it('copre tutti i rami citati nello spec', () => {
    const cases: ReadonlyArray<readonly [readonly string[], string]> = [
      [['Alt', 'H', 'O', 'I'], 'structure.autofitColumn'],
      [['Alt', 'H', 'O', 'A'], 'structure.autofitRow'],
      [['Alt', 'H', 'O', 'W'], 'structure.columnWidth'],
      [['Alt', 'H', 'O', 'H'], 'structure.rowHeight'],
      [['Alt', 'H', 'H'], 'format.fillColor'],
      [['Alt', 'H', 'F', 'C'], 'format.fontColor'],
      [['Alt', 'H', 'B', 'A'], 'format.borderAll'],
      [['Alt', 'H', 'B', 'S'], 'format.borderOutside'],
      [['Alt', 'H', 'B', 'O'], 'format.borderBottom'],
      [['Alt', 'H', 'B', 'T'], 'format.borderTop'],
      [['Alt', 'H', 'B', 'L'], 'format.borderLeft'],
      [['Alt', 'H', 'B', 'R'], 'format.borderRight'],
      [['Alt', 'H', 'B', 'N'], 'format.borderNone'],
      [['Alt', 'A', 'S', 'S'], 'data.sort'],
      [['Alt', 'M', 'P'], 'formula.tracePrecedents'],
      [['Alt', 'M', 'D'], 'formula.traceDependents'],
      [['Alt', 'E', 'S'], 'clipboard.pasteSpecialDialog'],
      [['Alt', '='], 'formula.autosum'],
    ];
    for (const [keys, command] of cases) {
      const m = createAltMachine(EXCEL_ALT_TREE);
      const res = run(m, keys);
      expect(res.state, keys.join(',')).toBe('fired');
      expect(res.command, keys.join(',')).toBe(command);
    }
  });

  it('Alt,H,H e Alt,H,O,H sono comandi diversi', () => {
    // Trappola classica: la stessa lettera significa cose diverse a livelli diversi.
    const a = createAltMachine(EXCEL_ALT_TREE);
    expect(run(a, ['Alt', 'H', 'H']).command).toBe('format.fillColor');
    const b = createAltMachine(EXCEL_ALT_TREE);
    expect(run(b, ['Alt', 'H', 'O', 'H']).command).toBe('structure.rowHeight');
  });

  it('Alt+= si chiude subito: e una foglia della radice', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    m.feed('Alt');
    const res = m.feed('=');
    expect(res).toEqual({ state: 'fired', path: ['='], command: 'formula.autosum' });
    expect(m.isOpen()).toBe(false);
  });

  it('i tasti sono case-insensitive', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    expect(run(m, ['Alt', 'h', 'o', 'i']).command).toBe('structure.autofitColumn');
  });
});

describe('cammini parziali', () => {
  it('pathLabel mostra il cammino per la barra di stato', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    expect(m.pathLabel()).toBe('');
    m.feed('Alt');
    expect(m.pathLabel()).toBe('Alt');
    m.feed('H');
    expect(m.pathLabel()).toBe('Alt, H');
    m.feed('O');
    expect(m.pathLabel()).toBe('Alt, H, O');
  });

  it('Esc risale di UN livello, non azzera tutto', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    run(m, ['Alt', 'H', 'O']);
    expect(m.feed('Escape')).toEqual({ state: 'pending', path: ['H'] });
    expect(m.pathLabel()).toBe('Alt, H');
    // Da qui in poi il ramo Home e ancora percorribile: H = colore riempimento.
    expect(m.feed('H').command).toBe('format.fillColor');
  });

  it('Esc dalla radice chiude la barra', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    m.feed('Alt');
    expect(m.feed('Escape')).toEqual({ state: 'idle', path: [] });
    expect(m.isOpen()).toBe(false);
  });

  it('risalire e ridiscendere in un ramo diverso funziona', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    run(m, ['Alt', 'H', 'B', 'Escape']);
    expect(m.pathLabel()).toBe('Alt, H');
    expect(m.feed('F').state).toBe('pending');
    expect(m.feed('C').command).toBe('format.fontColor');
  });

  it('elenca i tasti disponibili nel ramo corrente (key tip)', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    expect(m.options()).toEqual([]);
    run(m, ['Alt', 'H', 'O']);
    expect(m.options().map((o) => o.key)).toEqual(['I', 'A', 'W', 'H']);
    expect(m.options().every((o) => o.isLeaf)).toBe(true);
    expect(m.options()[0]?.label).toBe('Adatta larghezza colonna');
  });
});

describe('rami inesistenti', () => {
  it('un tasto sconosciuto invalida e resetta (Excel fa beep ed esce)', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    run(m, ['Alt', 'H']);
    const res = m.feed('Z');
    expect(res.state).toBe('invalid');
    // Il cammino tentato viene restituito per il log degli errori.
    expect(res.path).toEqual(['H', 'Z']);
    expect(res.command).toBeUndefined();
    expect(m.isOpen()).toBe(false);
    expect(m.pathLabel()).toBe('');
  });

  it('una lettera valida al livello sbagliato non salva la sequenza', () => {
    // `I` esiste sotto H,O ma non direttamente sotto H.
    const m = createAltMachine(EXCEL_ALT_TREE);
    run(m, ['Alt', 'H']);
    expect(m.feed('I').state).toBe('invalid');
  });

  it('un tasto sconosciuto alla radice invalida subito', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    m.feed('Alt');
    const res = m.feed('Q');
    expect(res.state).toBe('invalid');
    expect(res.path).toEqual(['Q']);
  });
});

describe('gestione della barra', () => {
  it('Alt premuto due volte chiude la barra', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    expect(m.feed('Alt').state).toBe('pending');
    expect(m.feed('Alt')).toEqual({ state: 'idle', path: [] });
    expect(m.isOpen()).toBe(false);
  });

  it('Alt dentro un ramo chiude tutto, non risale', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    run(m, ['Alt', 'H', 'O']);
    expect(m.feed('Alt')).toEqual({ state: 'idle', path: [] });
  });

  it('con la barra chiusa i tasti non vengono consumati', () => {
    // Fondamentale: senza questo, digitare "h" in una cella aprirebbe un menu.
    const m = createAltMachine(EXCEL_ALT_TREE);
    expect(m.feed('H')).toEqual({ state: 'idle', path: [] });
    expect(m.feed('Escape')).toEqual({ state: 'idle', path: [] });
    expect(m.isOpen()).toBe(false);
  });

  it('reset() chiude e azzera', () => {
    const m = createAltMachine(EXCEL_ALT_TREE);
    run(m, ['Alt', 'H', 'B']);
    m.reset();
    expect(m.isOpen()).toBe(false);
    expect(m.pathLabel()).toBe('');
  });

  it('due macchine sono indipendenti', () => {
    const a = createAltMachine(EXCEL_ALT_TREE);
    const b = createAltMachine(EXCEL_ALT_TREE);
    run(a, ['Alt', 'H']);
    expect(b.isOpen()).toBe(false);
  });
});

describe('flattenAltTree', () => {
  it('elenca tutte le foglie con cammino leggibile', () => {
    const leaves = flattenAltTree(EXCEL_ALT_TREE);
    expect(leaves.length).toBe(18);
    const autofit = leaves.find((l) => l.command === 'structure.autofitColumn');
    expect(autofit?.display).toBe('Alt, H, O, I');
    expect(autofit?.trail).toBe('Home > Formato > Adatta larghezza colonna');
    // Nessun comando duplicato nell'albero.
    const commands = leaves.map((l) => l.command);
    expect(new Set(commands).size).toBe(commands.length);
  });
});
