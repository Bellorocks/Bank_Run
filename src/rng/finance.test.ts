import { describe, it, expect } from 'vitest';
import { SeededRandom } from './SeededRandom';
import {
  SECTORS,
  MARGIN_BOUNDS,
  GROWTH_BOUNDS,
  MULTIPLE_BOUNDS,
  LEVERAGE_BOUNDS,
  REVENUE_MIN,
  REVENUE_MAX,
  REVENUE_MEDIAN,
  STEP_REVENUE,
  STEP_RATE,
  STEP_MULTIPLE,
  revenue,
  ebitdaMargin,
  growthRate,
  evEbitdaMultiple,
  leverage,
} from './finance';

const N = 20_000;

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function median(xs: readonly number[]): number {
  const sorted = xs.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Pearson: serve per verificare che il multiplo segua davvero crescita e margine. */
function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
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

/** Tutti i valori devono cadere sulla griglia dello step dichiarato. */
function tuttiSullaGriglia(xs: readonly number[], step: number): boolean {
  return xs.every((x) => Math.abs(x / step - Math.round(x / step)) < 1e-6);
}

function fuoriDaiBound(xs: readonly number[], lo: number, hi: number): number[] {
  return xs.filter((x) => x < lo || x > hi);
}

describe('revenue', () => {
  const rng = new SeededRandom(4242);
  const xs = Array.from({ length: N }, () => revenue(rng));

  it('sta sempre dentro [1,5m, 150m]', () => {
    expect(fuoriDaiBound(xs, REVENUE_MIN, REVENUE_MAX)).toEqual([]);
  });

  it('e arrotondato a migliaia di euro', () => {
    expect(tuttiSullaGriglia(xs, STEP_REVENUE)).toBe(true);
  });

  it('ha la mediana vicino a 8m, leggermente sopra per effetto del troncamento', () => {
    // La log-normale sottostante ha mediana esattamente 8m, ma il troncamento
    // taglia ~3% di massa in basso e ~0,06% in alto: la mediana empirica sale a
    // ~8,3m. E' atteso, non un errore di parametrizzazione.
    const m = median(xs);
    expect(m).toBeGreaterThan(REVENUE_MEDIAN);
    expect(m).toBeLessThan(REVENUE_MEDIAN * 1.09);
  });

  it('e asimmetrica a destra: la media supera la mediana', () => {
    expect(mean(xs)).toBeGreaterThan(median(xs) * 1.2);
  });

  it('copre davvero il mid-market, non solo il centro della banda', () => {
    const sotto3m = xs.filter((x) => x < 3_000_000).length / N;
    const sopra40m = xs.filter((x) => x > 40_000_000).length / N;
    expect(sotto3m).toBeGreaterThan(0.05);
    expect(sopra40m).toBeGreaterThan(0.02);
  });

  it('e deterministica a parita di seed', () => {
    const a = new SeededRandom(9);
    const b = new SeededRandom(9);
    for (let i = 0; i < 300; i++) expect(revenue(a)).toBe(revenue(b));
  });
});

describe('ebitdaMargin', () => {
  for (const sector of SECTORS) {
    const { lo, hi } = MARGIN_BOUNDS[sector];

    it(`${sector}: resta dentro [${lo}, ${hi}] ed e arrotondato a 0,1pp`, () => {
      const rng = new SeededRandom(1000 + sector.length);
      const xs = Array.from({ length: N }, () => ebitdaMargin(rng, sector));
      expect(fuoriDaiBound(xs, lo, hi)).toEqual([]);
      expect(tuttiSullaGriglia(xs, STEP_RATE)).toBe(true);
    });

    it(`${sector}: la beta simmetrica centra la banda e non si appiattisce sugli estremi`, () => {
      const rng = new SeededRandom(2000 + sector.length);
      const xs = Array.from({ length: N }, () => ebitdaMargin(rng, sector));
      const centro = (lo + hi) / 2;
      const larghezza = hi - lo;
      expect(Math.abs(mean(xs) - centro)).toBeLessThan(larghezza * 0.03);

      // il decile centrale deve essere piu' popolato di quello estremo:
      // se fosse uniforme sarebbero uguali
      const centrale = xs.filter(
        (x) => x > centro - larghezza * 0.05 && x < centro + larghezza * 0.05,
      ).length;
      const estremo = xs.filter((x) => x < lo + larghezza * 0.1).length;
      expect(centrale).toBeGreaterThan(estremo);
    });
  }

  it('i settori restano separati: software > servizi > manifattura > distribuzione', () => {
    const rng = new SeededRandom(31);
    const medie = Object.fromEntries(
      SECTORS.map((s) => [s, mean(Array.from({ length: 5000 }, () => ebitdaMargin(rng, s)))]),
    ) as Record<(typeof SECTORS)[number], number>;
    expect(medie.software).toBeGreaterThan(medie.servizi);
    expect(medie.servizi).toBeGreaterThan(medie.manifattura);
    expect(medie.manifattura).toBeGreaterThan(medie.distribuzione);
  });
});

describe('growthRate', () => {
  for (const sector of SECTORS) {
    const { min, mode, max } = GROWTH_BOUNDS[sector];

    it(`${sector}: dentro [${min}, ${max}], media = (min+moda+max)/3, griglia 0,1pp`, () => {
      const rng = new SeededRandom(3000 + sector.length);
      const xs = Array.from({ length: N }, () => growthRate(rng, sector));
      expect(fuoriDaiBound(xs, min, max)).toEqual([]);
      expect(tuttiSullaGriglia(xs, STEP_RATE)).toBe(true);
      expect(Math.abs(mean(xs) - (min + mode + max) / 3)).toBeLessThan(0.005);
    });
  }

  it('genera anche casi in contrazione dove il settore lo prevede', () => {
    const rng = new SeededRandom(77);
    const xs = Array.from({ length: 5000 }, () => growthRate(rng, 'manifattura'));
    expect(xs.some((x) => x < 0)).toBe(true);
  });
});

describe('leverage', () => {
  const rng = new SeededRandom(555);
  const xs = Array.from({ length: N }, () => leverage(rng));

  it('sta tra 3,0x e 5,5x ed e arrotondata a 0,1x', () => {
    expect(fuoriDaiBound(xs, LEVERAGE_BOUNDS.min, LEVERAGE_BOUNDS.max)).toEqual([]);
    expect(tuttiSullaGriglia(xs, STEP_MULTIPLE)).toBe(true);
  });

  it('ha media 4,17x: la moda a 4,0x la tiene sotto il centro della banda', () => {
    const atteso = (LEVERAGE_BOUNDS.min + LEVERAGE_BOUNDS.mode + LEVERAGE_BOUNDS.max) / 3;
    expect(Math.abs(mean(xs) - atteso)).toBeLessThan(0.03);
    expect(mean(xs)).toBeLessThan((LEVERAGE_BOUNDS.min + LEVERAGE_BOUNDS.max) / 2);
  });

  it('le strutture oltre 5x restano una minoranza', () => {
    expect(xs.filter((x) => x > 5).length / N).toBeLessThan(0.15);
  });
});

describe('evEbitdaMultiple', () => {
  for (const sector of SECTORS) {
    const spec = MULTIPLE_BOUNDS[sector];
    const growthSpec = GROWTH_BOUNDS[sector];
    const marginSpec = MARGIN_BOUNDS[sector];

    // 20.000 deal completi per settore: crescita, margine e multiplo coerenti
    const rng = new SeededRandom(7000 + sector.length);
    const growths: number[] = [];
    const margins: number[] = [];
    const multiples: number[] = [];
    for (let i = 0; i < N; i++) {
      const g = growthRate(rng, sector);
      const m = ebitdaMargin(rng, sector);
      growths.push(g);
      margins.push(m);
      multiples.push(evEbitdaMultiple(rng, sector, g, m));
    }

    it(`${sector}: dentro [${spec.min}x, ${spec.max}x] e sulla griglia 0,1x`, () => {
      expect(fuoriDaiBound(multiples, spec.min, spec.max)).toEqual([]);
      expect(tuttiSullaGriglia(multiples, STEP_MULTIPLE)).toBe(true);
    });

    it(`${sector}: la media resta vicina al centro corretto per crescita e margine medi`, () => {
      const growthMedio = (growthSpec.min + growthSpec.mode + growthSpec.max) / 3;
      const marginMedio = (marginSpec.lo + marginSpec.hi) / 2;
      const atteso =
        spec.center +
        spec.growthBeta * (growthMedio - spec.growthRef) +
        spec.marginBeta * (marginMedio - spec.marginRef);
      // tolleranza larga: il troncamento asimmetrico sposta la media di qualche centesimo
      expect(Math.abs(mean(multiples) - atteso)).toBeLessThan(0.45);
    });

    it(`${sector}: correlazione positiva con il margine (Pearson)`, () => {
      const r = pearson(multiples, margins);
      expect(r).toBeGreaterThan(0.1);
    });

    it(`${sector}: correlazione positiva con la crescita (Pearson)`, () => {
      const r = pearson(multiples, growths);
      expect(r).toBeGreaterThan(0.4);
    });

    it(`${sector}: resta dispersione idiosincratica anche a parita di fondamentali`, () => {
      // Due aziende identiche su carta NON valgono lo stesso multiplo: e' il
      // fatto che i comps devono insegnare. Se la correlazione fosse totale,
      // qui usciremmo con un valore solo.
      const fisso = new SeededRandom(4321);
      const g = (growthSpec.min + growthSpec.max) / 2;
      const m = (marginSpec.lo + marginSpec.hi) / 2;
      const xs = Array.from({ length: 2000 }, () => evEbitdaMultiple(fisso, sector, g, m));
      expect(new Set(xs).size).toBeGreaterThan(5);
    });

    it(`${sector}: la correlazione e uno shift del centro, quindi e monotona`, () => {
      // stesso margine, crescita al minimo vs crescita al massimo
      const m = (marginSpec.lo + marginSpec.hi) / 2;
      const bassa = new SeededRandom(11);
      const alta = new SeededRandom(11);
      const mediaBassa = mean(
        Array.from({ length: 4000 }, () => evEbitdaMultiple(bassa, sector, growthSpec.min, m)),
      );
      const mediaAlta = mean(
        Array.from({ length: 4000 }, () => evEbitdaMultiple(alta, sector, growthSpec.max, m)),
      );
      expect(mediaAlta).toBeGreaterThan(mediaBassa);
    });
  }

  it('i multipli di settore restano ordinati: software batte tutti', () => {
    const rng = new SeededRandom(88);
    const medie = Object.fromEntries(
      SECTORS.map((s) => {
        const g = GROWTH_BOUNDS[s];
        const mb = MARGIN_BOUNDS[s];
        const growthMedio = (g.min + g.mode + g.max) / 3;
        const marginMedio = (mb.lo + mb.hi) / 2;
        return [
          s,
          mean(
            Array.from({ length: 4000 }, () =>
              evEbitdaMultiple(rng, s, growthMedio, marginMedio),
            ),
          ),
        ];
      }),
    ) as Record<(typeof SECTORS)[number], number>;

    expect(medie.software).toBeGreaterThan(medie.servizi);
    expect(medie.servizi).toBeGreaterThan(medie.manifattura);
    expect(medie.manifattura).toBeGreaterThan(medie.distribuzione);
  });

  it('input fuori scala saturano ai bound invece di sfondarli', () => {
    // Il troncamento e' il contratto: qualunque cosa arrivi da un template
    // sbagliato, il multiplo resta un numero che un comps set puo' contenere.
    const rng = new SeededRandom(99);
    for (const sector of SECTORS) {
      const spec = MULTIPLE_BOUNDS[sector];
      const iperbolici = Array.from({ length: 2000 }, () =>
        evEbitdaMultiple(rng, sector, 2, 0.9),
      );
      const disastrosi = Array.from({ length: 2000 }, () =>
        evEbitdaMultiple(rng, sector, -0.5, -0.2),
      );
      expect(fuoriDaiBound(iperbolici, spec.min, spec.max)).toEqual([]);
      expect(fuoriDaiBound(disastrosi, spec.min, spec.max)).toEqual([]);
      // e saturano dalla parte giusta
      expect(mean(iperbolici)).toBeGreaterThan(spec.max - 0.5);
      expect(mean(disastrosi)).toBeLessThan(spec.min + 0.5);
    }
  });
});

describe('riproducibilita del pacchetto completo', () => {
  /** Un "deal" come lo assemblerebbe un template. */
  function deal(seed: number) {
    const rng = new SeededRandom(seed);
    const sector = rng.pick(SECTORS);
    const rev = revenue(rng);
    const margin = ebitdaMargin(rng, sector);
    const growth = growthRate(rng, sector);
    return {
      sector,
      rev,
      margin,
      growth,
      ebitda: rev * margin,
      multiple: evEbitdaMultiple(rng, sector, growth, margin),
      leverage: leverage(rng),
    };
  }

  it('lo stesso seed produce lo stesso deal, sempre (§13)', () => {
    for (const seed of [1, 2, 12345, 987654321]) {
      expect(deal(seed)).toEqual(deal(seed));
    }
  });

  it('seed diversi producono deal diversi', () => {
    const visti = new Set<string>();
    for (let seed = 0; seed < 200; seed++) visti.add(JSON.stringify(deal(seed)));
    expect(visti.size).toBe(200);
  });

  it('i fork isolano le sezioni: aggiungere una sezione non sposta le altre', () => {
    const v1 = new SeededRandom(2026);
    const assunzioniV1 = revenue(v1.fork('assumptions'));
    const uscitaV1 = leverage(v1.fork('exit'));

    const v2 = new SeededRandom(2026);
    const assunzioniV2 = revenue(v2.fork('assumptions'));
    // nuova sezione inserita in mezzo dalla versione successiva del template
    const extra = v2.fork('working-capital');
    for (let i = 0; i < 50; i++) extra.next();
    const uscitaV2 = leverage(v2.fork('exit'));

    expect(assunzioniV2).toBe(assunzioniV1);
    expect(uscitaV2).toBe(uscitaV1);
  });
});
