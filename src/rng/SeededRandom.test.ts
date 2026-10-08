import { describe, it, expect } from 'vitest';
import { SeededRandom, deriveSeed } from './SeededRandom';

/** Coefficiente di correlazione di Pearson, usato per verificare l'indipendenza dei fork. */
function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

function draw(rng: SeededRandom, n: number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = rng.next();
  return out;
}

describe('SeededRandom — determinismo', () => {
  it('lo stesso seed produce la stessa sequenza su 10.000 estrazioni', () => {
    const a = new SeededRandom(20260812);
    const b = new SeededRandom(20260812);
    for (let i = 0; i < 10_000; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('due seed diversi divergono subito e non ri-sincronizzano', () => {
    const a = new SeededRandom(1);
    const b = new SeededRandom(2);
    let equals = 0;
    for (let i = 0; i < 10_000; i++) {
      if (a.next() === b.next()) equals++;
    }
    // Collisione attesa: 10.000 / 2^32 ~ 0,000002 volte. Zero, in pratica.
    expect(equals).toBe(0);
  });

  it('seed vicini (1, 2, 3) non producono sequenze correlate: e il lavoro di SplitMix32', () => {
    const s1 = draw(new SeededRandom(1), 20_000);
    const s2 = draw(new SeededRandom(2), 20_000);
    const s3 = draw(new SeededRandom(3), 20_000);
    expect(Math.abs(pearson(s1, s2))).toBeLessThan(0.03);
    expect(Math.abs(pearson(s2, s3))).toBeLessThan(0.03);
  });

  it('`seed` e normalizzato a uint32 e ricostruisce il generatore', () => {
    const r = new SeededRandom(-7);
    expect(r.seed).toBe(4294967289);
    const clone = new SeededRandom(r.seed);
    expect(draw(clone, 100)).toEqual(draw(new SeededRandom(-7), 100));
  });

  it('seed congruenti mod 2^32 sono lo stesso seed', () => {
    const a = new SeededRandom(5);
    const b = new SeededRandom(5 + 4294967296);
    expect(a.seed).toBe(b.seed);
    expect(draw(a, 50)).toEqual(draw(b, 50));
  });

  it('rifiuta seed non finiti', () => {
    expect(() => new SeededRandom(NaN)).toThrow(RangeError);
    expect(() => new SeededRandom(Infinity)).toThrow(RangeError);
  });
});

describe('SeededRandom — uniformita', () => {
  it('next() sta in [0,1) e riempie 20 bin entro tolleranza su 100.000 campioni', () => {
    const BINS = 20;
    const N = 100_000;
    const atteso = N / BINS; // 5.000
    for (const seed of [1, 42, 999_983]) {
      const rng = new SeededRandom(seed);
      const bins = new Array<number>(BINS).fill(0);
      let fuoriRange = 0;
      for (let i = 0; i < N; i++) {
        const u = rng.next();
        // niente expect() dentro il loop: 100.000 asserzioni costano piu' del test
        if (!(u >= 0 && u < 1)) fuoriRange++;
        bins[Math.floor(u * BINS)]++;
      }
      expect(fuoriRange).toBe(0);
      // sigma binomiale per bin = sqrt(N*p*(1-p)) ~ 69. Soglia a ~5,8 sigma.
      const scartoMax = Math.max(...bins.map((c) => Math.abs(c - atteso)));
      expect(scartoMax).toBeLessThan(400);
    }
  });

  it('int() include entrambi gli estremi ed e uniforme', () => {
    const rng = new SeededRandom(7);
    const counts = new Map<number, number>();
    const N = 60_000;
    let invalidi = 0;
    for (let i = 0; i < N; i++) {
      const v = rng.int(1, 6);
      if (!Number.isInteger(v) || v < 1 || v > 6) invalidi++;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    expect(invalidi).toBe(0);
    expect(counts.size).toBe(6);
    for (const c of counts.values()) {
      expect(Math.abs(c - N / 6)).toBeLessThan(500);
    }
  });

  it('int() su intervallo degenere e sui casi limite', () => {
    const rng = new SeededRandom(11);
    expect(rng.int(5, 5)).toBe(5);
    expect(rng.int(-3, -3)).toBe(-3);
    expect(() => rng.int(5, 4)).toThrow(RangeError);
    expect(() => rng.int(0.5, 3)).toThrow(RangeError);
  });

  it('bool(p) rispetta la probabilita, e p=0 / p=1 sono deterministici', () => {
    const rng = new SeededRandom(123);
    let veri = 0;
    const N = 50_000;
    for (let i = 0; i < N; i++) if (rng.bool(0.3)) veri++;
    expect(Math.abs(veri / N - 0.3)).toBeLessThan(0.01);

    for (let i = 0; i < 200; i++) {
      expect(rng.bool(0)).toBe(false);
      expect(rng.bool(1)).toBe(true);
    }
  });
});

describe('SeededRandom — pick, pickWeighted, shuffle', () => {
  it('pick copre tutti gli elementi e rifiuta array vuoti', () => {
    const rng = new SeededRandom(3);
    const arr = ['a', 'b', 'c', 'd'] as const;
    const visti = new Set<string>();
    for (let i = 0; i < 500; i++) visti.add(rng.pick(arr));
    expect(visti.size).toBe(4);
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it('pickWeighted rispetta i pesi e non estrae mai peso 0', () => {
    const rng = new SeededRandom(4);
    const tabella = [
      { item: 'senior', weight: 70 },
      { item: 'mezzanine', weight: 30 },
      { item: 'pik', weight: 0 },
    ];
    const counts: Record<string, number> = { senior: 0, mezzanine: 0, pik: 0 };
    const N = 40_000;
    for (let i = 0; i < N; i++) counts[rng.pickWeighted(tabella)]++;
    expect(counts.pik).toBe(0);
    expect(Math.abs(counts.senior / N - 0.7)).toBeLessThan(0.01);
    expect(Math.abs(counts.mezzanine / N - 0.3)).toBeLessThan(0.01);
  });

  it('pickWeighted rifiuta input degeneri', () => {
    const rng = new SeededRandom(5);
    expect(() => rng.pickWeighted([])).toThrow(RangeError);
    expect(() => rng.pickWeighted([{ item: 'x', weight: 0 }])).toThrow(RangeError);
    expect(() => rng.pickWeighted([{ item: 'x', weight: -1 }])).toThrow(RangeError);
  });

  it('shuffle e una permutazione e non muta l ingresso', () => {
    const rng = new SeededRandom(9);
    const originale = [0, 1, 2, 3, 4, 5, 6, 7];
    const mescolato = rng.shuffle(originale);
    expect(originale).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect([...mescolato].sort((a, b) => a - b)).toEqual(originale);
    expect(mescolato).not.toEqual(originale);
  });

  it('shuffle e uniforme: ogni elemento finisce in ogni posizione con pari frequenza', () => {
    const rng = new SeededRandom(17);
    const base = [0, 1, 2, 3];
    // conteggi[elemento][posizione]
    const conteggi = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const N = 24_000;
    for (let i = 0; i < N; i++) {
      const p = rng.shuffle(base);
      for (let pos = 0; pos < 4; pos++) conteggi[p[pos]][pos]++;
    }
    for (const riga of conteggi) {
      for (const c of riga) {
        expect(Math.abs(c - N / 4)).toBeLessThan(400);
      }
    }
  });
});

describe('SeededRandom — fork', () => {
  it('e riproducibile: stessa label, stesso stream', () => {
    const padre = new SeededRandom(2024);
    const a = padre.fork('debt-schedule');
    const b = new SeededRandom(2024).fork('debt-schedule');
    expect(draw(a, 1000)).toEqual(draw(b, 1000));
  });

  it('non consuma estrazioni al padre (e questo il punto di tutto)', () => {
    const senzaFork = draw(new SeededRandom(77), 100);

    const conFork = new SeededRandom(77);
    conFork.fork('task-1').next();
    conFork.fork('task-2').next();
    expect(draw(conFork, 100)).toEqual(senzaFork);
  });

  it('e indipendente dallo stato corrente del padre: aggiungere un task non sposta gli altri', () => {
    // Scenario reale: il template v1 genera "assumptions" e poi "exit".
    // Il template v2 inserisce "debt-schedule" in mezzo. I numeri di "exit"
    // devono restare identici, altrimenti i seed salvati nelle run passate
    // ricostruirebbero un livello diverso.
    const v1 = new SeededRandom(555);
    v1.fork('assumptions').next();
    const exitV1 = draw(v1.fork('exit'), 200);

    const v2 = new SeededRandom(555);
    v2.fork('assumptions').next();
    const debt = v2.fork('debt-schedule');
    for (let i = 0; i < 137; i++) debt.next();
    const exitV2 = draw(v2.fork('exit'), 200);

    expect(exitV2).toEqual(exitV1);
  });

  it('label diverse producono stream indipendenti', () => {
    const padre = new SeededRandom(31337);
    const a = draw(padre.fork('alpha'), 20_000);
    const b = draw(padre.fork('beta'), 20_000);
    const c = draw(padre.fork('alphb'), 20_000); // label a un bit di distanza

    expect(a).not.toEqual(b);
    expect(Math.abs(pearson(a, b))).toBeLessThan(0.03);
    expect(Math.abs(pearson(a, c))).toBeLessThan(0.03);

    let equals = 0;
    for (let i = 0; i < a.length; i++) if (a[i] === b[i]) equals++;
    expect(equals).toBe(0);
  });

  it('fork di seed diversi con la stessa label divergono', () => {
    const a = draw(new SeededRandom(1).fork('x'), 5000);
    const b = draw(new SeededRandom(2).fork('x'), 5000);
    expect(a).not.toEqual(b);
    expect(Math.abs(pearson(a, b))).toBeLessThan(0.05);
  });

  it('fork annidati restano deterministici', () => {
    const p1 = new SeededRandom(8).fork('m8').fork('lbo').fork('sweep');
    const p2 = new SeededRandom(8).fork('m8').fork('lbo').fork('sweep');
    expect(draw(p1, 500)).toEqual(draw(p2, 500));
  });

  it('deriveSeed e una funzione pura ed e cio che usa fork', () => {
    expect(deriveSeed(42, 'ciao')).toBe(deriveSeed(42, 'ciao'));
    expect(deriveSeed(42, 'ciao')).not.toBe(deriveSeed(42, 'ciaò'));
    expect(new SeededRandom(42).fork('ciao').seed).toBe(deriveSeed(42, 'ciao'));
  });

  it('label vuota e ammessa', () => {
    const r = new SeededRandom(1).fork('');
    expect(Number.isInteger(r.seed)).toBe(true);
    expect(draw(r, 10)).toEqual(draw(new SeededRandom(1).fork(''), 10));
  });
});
