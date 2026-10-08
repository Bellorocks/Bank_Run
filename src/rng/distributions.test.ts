import { describe, it, expect } from 'vitest';
import { SeededRandom } from './SeededRandom';
import { normal, logNormal, gamma, beta, triangular, truncated, roundTo } from './distributions';

const N = 50_000;

function sample(n: number, f: () => number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = f();
  return out;
}

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function stdev(xs: readonly number[]): number {
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return Math.sqrt(s / (xs.length - 1));
}

function median(xs: readonly number[]): number {
  const sorted = xs.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function minOf(xs: readonly number[]): number {
  return xs.reduce((a, b) => (b < a ? b : a), Infinity);
}

function maxOf(xs: readonly number[]): number {
  return xs.reduce((a, b) => (b > a ? b : a), -Infinity);
}

describe('normal', () => {
  it('media e deviazione standard empiriche su 50.000 campioni', () => {
    const rng = new SeededRandom(101);
    const xs = sample(N, () => normal(rng, 100, 15));
    // SE della media = 15/sqrt(50.000) = 0,067 -> 0,5 e' oltre 7 sigma
    expect(Math.abs(mean(xs) - 100)).toBeLessThan(0.5);
    expect(Math.abs(stdev(xs) - 15)).toBeLessThan(0.3);
  });

  it('e simmetrica: mediana ~ media', () => {
    const rng = new SeededRandom(102);
    const xs = sample(N, () => normal(rng, 0, 1));
    expect(Math.abs(median(xs))).toBeLessThan(0.03);
  });

  it('sigma 0 degenera nella costante mu', () => {
    const rng = new SeededRandom(103);
    for (let i = 0; i < 20; i++) expect(normal(rng, 7, 0)).toBe(7);
  });

  it('e deterministica a parita di seed', () => {
    const r1 = new SeededRandom(5);
    const r2 = new SeededRandom(5);
    const a = sample(200, () => normal(r1, 3, 2));
    const b = sample(200, () => normal(r2, 3, 2));
    expect(a).toEqual(b);
    // e non e' costante: la sequenza avanza davvero
    expect(new Set(a).size).toBe(200);
  });
});

describe('logNormal', () => {
  it('la MEDIANA empirica coincide col parametro, la media no', () => {
    const rng = new SeededRandom(201);
    const sigma = 0.6;
    const xs = sample(N, () => logNormal(rng, 8000, sigma));

    expect(Math.abs(median(xs) - 8000)).toBeLessThan(150);

    // La media teorica e' median * exp(sigma^2/2) = 8000 * 1,1972 = 9577:
    // e' il motivo per cui questa funzione e' parametrizzata sulla mediana.
    const mediaTeorica = 8000 * Math.exp((sigma * sigma) / 2);
    expect(Math.abs(mean(xs) - mediaTeorica)).toBeLessThan(200);
    expect(mean(xs)).toBeGreaterThan(median(xs) * 1.15);
  });

  it('e sempre positiva', () => {
    const rng = new SeededRandom(202);
    const xs = sample(20_000, () => logNormal(rng, 100, 1.2));
    expect(minOf(xs)).toBeGreaterThan(0);
  });

  it('rifiuta mediane non positive', () => {
    const rng = new SeededRandom(203);
    expect(() => logNormal(rng, 0, 0.5)).toThrow(RangeError);
    expect(() => logNormal(rng, -1, 0.5)).toThrow(RangeError);
  });
});

describe('gamma', () => {
  it('media e varianza valgono entrambe shape (scala 1)', () => {
    const rng = new SeededRandom(301);
    const xs = sample(N, () => gamma(rng, 3));
    expect(Math.abs(mean(xs) - 3)).toBeLessThan(0.05);
    expect(Math.abs(stdev(xs) - Math.sqrt(3))).toBeLessThan(0.05);
    expect(minOf(xs)).toBeGreaterThan(0);
  });

  it('copre il ramo shape < 1 (boost di Marsaglia-Tsang)', () => {
    const rng = new SeededRandom(302);
    const xs = sample(N, () => gamma(rng, 0.4));
    expect(Math.abs(mean(xs) - 0.4)).toBeLessThan(0.02);
    expect(minOf(xs)).toBeGreaterThanOrEqual(0);
  });

  it('rifiuta shape non positivi', () => {
    const rng = new SeededRandom(303);
    expect(() => gamma(rng, 0)).toThrow(RangeError);
    expect(() => gamma(rng, -2)).toThrow(RangeError);
  });
});

describe('beta', () => {
  it('media empirica = alpha/(alpha+beta) e supporto in [0,1]', () => {
    const rng = new SeededRandom(401);
    const xs = sample(N, () => beta(rng, 2, 5));
    expect(Math.abs(mean(xs) - 2 / 7)).toBeLessThan(0.005);
    expect(minOf(xs)).toBeGreaterThanOrEqual(0);
    expect(maxOf(xs)).toBeLessThanOrEqual(1);
  });

  it('la varianza segue la formula teorica', () => {
    const rng = new SeededRandom(402);
    const a = 2.6;
    const b = 2.6;
    const xs = sample(N, () => beta(rng, a, b));
    const varTeorica = (a * b) / ((a + b) * (a + b) * (a + b + 1));
    expect(Math.abs(stdev(xs) - Math.sqrt(varTeorica))).toBeLessThan(0.005);
    // simmetrica: mediana e media coincidono
    expect(Math.abs(median(xs) - 0.5)).toBeLessThan(0.01);
  });

  it('regge parametri < 1 (distribuzione a U)', () => {
    const rng = new SeededRandom(403);
    const xs = sample(20_000, () => beta(rng, 0.5, 0.5));
    expect(Math.abs(mean(xs) - 0.5)).toBeLessThan(0.02);
    expect(minOf(xs)).toBeGreaterThanOrEqual(0);
    expect(maxOf(xs)).toBeLessThanOrEqual(1);
  });

  it('rifiuta parametri non positivi', () => {
    const rng = new SeededRandom(404);
    expect(() => beta(rng, 0, 1)).toThrow(RangeError);
    expect(() => beta(rng, 1, -1)).toThrow(RangeError);
  });
});

describe('triangular', () => {
  it('media empirica = (min+mode+max)/3 e supporto rispettato', () => {
    const rng = new SeededRandom(501);
    const xs = sample(N, () => triangular(rng, 0, 1, 4));
    expect(Math.abs(mean(xs) - 5 / 3)).toBeLessThan(0.03);
    expect(minOf(xs)).toBeGreaterThanOrEqual(0);
    expect(maxOf(xs)).toBeLessThanOrEqual(4);
  });

  it('con moda su un estremo diventa la triangolare rettangola', () => {
    const rng = new SeededRandom(502);
    const xs = sample(N, () => triangular(rng, 0, 0, 1));
    // media = (0+0+1)/3
    expect(Math.abs(mean(xs) - 1 / 3)).toBeLessThan(0.01);
    expect(minOf(xs)).toBeGreaterThanOrEqual(0);
    expect(maxOf(xs)).toBeLessThanOrEqual(1);
  });

  it('intervallo degenere restituisce la costante', () => {
    const rng = new SeededRandom(503);
    expect(triangular(rng, 2, 2, 2)).toBe(2);
  });

  it('rifiuta moda fuori intervallo e intervalli invertiti', () => {
    const rng = new SeededRandom(504);
    expect(() => triangular(rng, 0, 5, 1)).toThrow(RangeError);
    expect(() => triangular(rng, 1, 0.5, 0)).toThrow(RangeError);
  });
});

describe('truncated', () => {
  it('taglia davvero le code: nessun campione fuori dai limiti', () => {
    const rng = new SeededRandom(601);
    const xs = sample(N, () => truncated(() => normal(rng, 0, 1), -1, 1));
    expect(minOf(xs)).toBeGreaterThanOrEqual(-1);
    expect(maxOf(xs)).toBeLessThanOrEqual(1);
    // la normale troncata simmetrica resta centrata
    expect(Math.abs(mean(xs))).toBeLessThan(0.02);
  });

  it('il troncamento asimmetrico sposta la media, come deve', () => {
    const rng = new SeededRandom(602);
    const xs = sample(20_000, () => truncated(() => normal(rng, 0, 1), -0.5, 3));
    expect(minOf(xs)).toBeGreaterThanOrEqual(-0.5);
    expect(maxOf(xs)).toBeLessThanOrEqual(3);
    expect(mean(xs)).toBeGreaterThan(0.2);
  });

  it('esaurito maxTries clampa al bound corretto invece di ciclare', () => {
    expect(truncated(() => 999, 0, 10, 5)).toBe(10);
    expect(truncated(() => -999, 0, 10, 5)).toBe(0);
    // NaN non e' ne' dentro ne' fuori: finisce sul minimo, non propaga
    expect(truncated(() => NaN, 0, 10, 3)).toBe(0);
  });

  it('smette di campionare appena il valore e valido', () => {
    let chiamate = 0;
    const valori = [50, 60, 7];
    const v = truncated(
      () => valori[chiamate++],
      0,
      10,
      100,
    );
    expect(v).toBe(7);
    expect(chiamate).toBe(3);
  });

  it('rispetta esattamente maxTries', () => {
    let chiamate = 0;
    truncated(
      () => {
        chiamate++;
        return 999;
      },
      0,
      1,
      7,
    );
    expect(chiamate).toBe(7);
  });

  it('rifiuta intervalli invertiti', () => {
    expect(() => truncated(() => 1, 10, 0)).toThrow(RangeError);
  });
});

describe('roundTo', () => {
  it('arrotonda a migliaia di euro', () => {
    expect(roundTo(8_431_772.4193, 1000)).toBe(8_432_000);
    expect(roundTo(1_500_499, 1000)).toBe(1_500_000);
    expect(roundTo(1_500_500, 1000)).toBe(1_501_000);
  });

  it('non lascia code binarie: il risultato e il numero che si vede in cella', () => {
    // il caso classico: 3 * 0.1 = 0.30000000000000004
    expect(roundTo(0.30000000000000004, 0.1)).toBe(0.3);
    expect(String(roundTo(0.2999, 0.1))).toBe('0.3');
    expect(String(roundTo(0.1236, 0.001))).toBe('0.124');
    expect(String(roundTo(12.34999, 0.1))).toBe('12.3');
  });

  it('i mezzi vanno lontano da zero, come ROUND di Excel', () => {
    // `Math.round(4.25/0.1)` darebbe 42 (la divisione produce 42,49999...),
    // e su valori negativi Math.round arrotonda verso +infinito: entrambi
    // divergerebbero da =ROUND(4,25;1) e =ROUND(-4,25;1) in Excel.
    expect(roundTo(4.25, 0.1)).toBe(4.3);
    expect(roundTo(-4.25, 0.1)).toBe(-4.3);
    expect(roundTo(2.5, 1)).toBe(3);
    expect(roundTo(-2.5, 1)).toBe(-3);
  });

  it('funziona con step non decimali (0,25x) e step > 1', () => {
    expect(roundTo(1.37, 0.25)).toBe(1.25);
    expect(roundTo(1.38, 0.25)).toBe(1.5);
    expect(roundTo(1.375, 0.25)).toBe(1.5);
    expect(roundTo(137, 25)).toBe(125);
    expect(roundTo(138, 25)).toBe(150);
  });

  it('non restituisce mai -0', () => {
    expect(Object.is(roundTo(-0.0001, 0.1), 0)).toBe(true);
  });

  it('e idempotente', () => {
    const rng = new SeededRandom(701);
    for (let i = 0; i < 500; i++) {
      const v = roundTo(normal(rng, 0, 1000), 0.1);
      expect(roundTo(v, 0.1)).toBe(v);
    }
  });

  it('rifiuta step non positivi', () => {
    expect(() => roundTo(1, 0)).toThrow(RangeError);
    expect(() => roundTo(1, -0.1)).toThrow(RangeError);
    expect(() => roundTo(1, Infinity)).toThrow(RangeError);
  });
});
