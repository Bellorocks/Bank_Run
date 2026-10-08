import { describe, it, expect } from 'vitest';
import { Axis, indicesInViewport } from './geometry';

function asse(opts: {
  sizes?: Record<number, number>;
  hidden?: number[];
  defaultSize?: number;
  count?: number;
} = {}): Axis {
  return new Axis({
    sizes: new Map(Object.entries(opts.sizes ?? {}).map(([k, v]) => [Number(k), v])),
    hidden: new Set(opts.hidden ?? []),
    defaultSize: opts.defaultSize ?? 20,
    count: opts.count ?? 999,
  });
}

describe('asse uniforme', () => {
  const a = asse();

  it('offset e dimensione sono quelli banali', () => {
    expect(a.size(0)).toBe(20);
    expect(a.offset(0)).toBe(0);
    expect(a.offset(5)).toBe(100);
    expect(a.offset(1000)).toBe(20000);
  });

  it('indexAt inverte offset', () => {
    expect(a.indexAt(0)).toBe(0);
    expect(a.indexAt(19)).toBe(0);
    expect(a.indexAt(20)).toBe(1);
    expect(a.indexAt(105)).toBe(5);
    expect(a.indexAt(-50)).toBe(0);
  });

  it('regge il foglio Excel intero senza precalcolare niente', () => {
    const grande = asse({ count: 1_048_575, defaultSize: 21 });
    expect(grande.offset(1_048_575)).toBe(1_048_575 * 21);
    expect(grande.indexAt(1_048_575 * 21)).toBe(1_048_575);
    expect(grande.totalSize).toBe(1_048_576 * 21);
  });
});

describe('dimensioni personalizzate', () => {
  const a = asse({ sizes: { 2: 100, 5: 5 } });

  it('applica lo scarto solo dove serve', () => {
    expect(a.size(1)).toBe(20);
    expect(a.size(2)).toBe(100);
    expect(a.size(5)).toBe(5);
  });

  it('accumula gli scarti negli offset successivi', () => {
    expect(a.offset(2)).toBe(40);
    expect(a.offset(3)).toBe(140); // 40 + 100
    expect(a.offset(5)).toBe(180); // 140 + 20 + 20
    expect(a.offset(6)).toBe(185); // 180 + 5
    expect(a.offset(7)).toBe(205);
  });

  it('indexAt resta l\'inverso esatto anche con gli scarti', () => {
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 50]) {
      const meta = a.offset(i) + Math.max(1, Math.floor(a.size(i) / 2));
      if (a.size(i) === 0) continue;
      expect(a.indexAt(meta), `indice ${i}`).toBe(i);
    }
  });

  it('il bordo di una cella appartiene alla cella che comincia li\'', () => {
    expect(a.indexAt(a.offset(3))).toBe(3);
    expect(a.indexAt(a.offset(3) - 1)).toBe(2);
  });
});

describe('righe nascoste', () => {
  const a = asse({ hidden: [3, 4] });

  it('hanno dimensione zero e non occupano spazio', () => {
    expect(a.size(3)).toBe(0);
    expect(a.isHidden(3)).toBe(true);
    expect(a.offset(3)).toBe(60);
    expect(a.offset(5)).toBe(60); // 3 e 4 non aggiungono nulla
    expect(a.offset(6)).toBe(80);
  });

  it('un click sul loro punto atterra sulla prima riga VISIBILE successiva', () => {
    // Selezionare una riga nascosta sarebbe un cursore invisibile: in Excel non succede.
    expect(a.indexAt(60)).toBe(5);
  });

  it('una banda nascosta in fondo non manda indexAt oltre il foglio', () => {
    const b = asse({ hidden: [8, 9], count: 9 });
    expect(b.indexAt(b.totalSize + 500)).toBeLessThanOrEqual(9);
  });
});

describe('visibleRange', () => {
  const a = asse();

  it('copre la finestra e non una riga di piu\' del necessario', () => {
    expect(a.visibleRange(0, 100)).toEqual({ start: 0, end: 6 });
    expect(a.visibleRange(40, 100)).toEqual({ start: 2, end: 6 });
  });

  it('non produce intervalli rovesciati su finestre degeneri', () => {
    const r = a.visibleRange(100, 100);
    expect(r.end).toBeGreaterThanOrEqual(r.start);
  });

  it('salta le righe nascoste in testa alla finestra', () => {
    const b = asse({ hidden: [0, 1] });
    expect(b.visibleRange(0, 60).start).toBe(2);
  });
});

describe('scrollToShow', () => {
  const a = asse(); // 20px per indice

  it('non muove nulla se l\'indice e\' gia\' visibile', () => {
    expect(a.scrollToShow(5, 0, 200, 0)).toBe(0);
  });

  it('scorre all\'indietro di quanto basta', () => {
    // indice 2 sta a 40..60; con scroll 100 e' sopra la finestra
    expect(a.scrollToShow(2, 100, 200, 0)).toBe(40);
  });

  it('scorre in avanti di quanto basta, non di piu\'', () => {
    // indice 20 finisce a 420; finestra alta 200 -> scroll 220
    expect(a.scrollToShow(20, 0, 200, 0)).toBe(220);
  });

  it('tiene conto della banda bloccata che copre l\'inizio', () => {
    // Senza questo, una cella appena sotto i riquadri bloccati resterebbe
    // nascosta DIETRO di essi pur essendo "dentro" la finestra.
    expect(a.scrollToShow(6, 130, 200, 40)).toBe(80);
  });

  it('non produce mai uno scroll negativo', () => {
    expect(a.scrollToShow(0, 50, 200, 40)).toBe(0);
  });
});

describe('indicesInViewport', () => {
  it('conta le righe che stanno in una schermata', () => {
    expect(indicesInViewport(asse(), 0, 200)).toBe(10);
  });

  it('non conta le righe nascoste', () => {
    const a = asse({ hidden: [1, 2, 3] });
    expect(indicesInViewport(a, 0, 200)).toBe(10); // 10 visibili, le nascoste non consumano
  });

  it('restituisce almeno 1 anche su una finestra minuscola', () => {
    expect(indicesInViewport(asse(), 0, 3)).toBe(1);
  });
});
