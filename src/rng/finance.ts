/**
 * Distribuzioni di dominio (§4.3): i numeri che finiscono nelle celle.
 *
 * Ogni funzione restituisce un valore GIA' ARROTONDATO come lo scriverebbe un
 * analista: ricavi a migliaia di euro, margini e crescite a 0,1 punti
 * percentuali, multipli e leva a 0,1x. Il grader lavora con tolleranze strette
 * e l'utente ricalcola a mano: numeri con sette decimali romperebbero entrambi.
 *
 * Tutti i bound sono esportati come costanti perche' li usano anche i template
 * (per scrivere i brief) e i test. Nessun numero magico duplicato altrove.
 */

import type { SeededRandom } from './SeededRandom';
import { beta, logNormal, normal, roundTo, triangular, truncated } from './distributions';

export type Sector = 'manifattura' | 'software' | 'distribuzione' | 'servizi';

/** Elenco canonico dei settori, per iterare e per `rng.pick`. */
export const SECTORS: readonly Sector[] = [
  'manifattura',
  'software',
  'distribuzione',
  'servizi',
];

/** Passi di arrotondamento, in unita' naturali del dato. */
export const STEP_REVENUE = 1000; // euro
export const STEP_RATE = 0.001; // 0,1 punti percentuali
export const STEP_MULTIPLE = 0.1; // 0,1x

// ---------------------------------------------------------------------------
// Ricavi
// ---------------------------------------------------------------------------

export const REVENUE_MEDIAN = 8_000_000;
export const REVENUE_MIN = 1_500_000;
export const REVENUE_MAX = 150_000_000;

/**
 * Sigma del logaritmo dei ricavi. 0,9 significa che un'azienda a +1 sigma
 * fattura 2,46 volte la mediana: con questo valore i limiti dello spec cadono a
 * -1,86 e +3,26 sigma, cioe' la coda bassa viene troncata nel ~3% dei casi e
 * quella alta quasi mai. E' la dispersione che rende il mid-market credibile
 * senza generare una maggioranza di casi appiattiti sui bound.
 */
const REVENUE_SIGMA = 0.9;

/**
 * Ricavi annui in euro. Log-normale troncata a [1,5m, 150m].
 *
 * Nota: la mediana EMPIRICA dei campioni esce sopra 8m (circa 8,3m). Non e' un
 * bug: il troncamento taglia il 3% in basso e lo 0,06% in alto, quindi
 * ridistribuisce massa verso destra. Il parametro resta la mediana della
 * log-normale sottostante, come chiede lo spec.
 */
export function revenue(rng: SeededRandom): number {
  const raw = truncated(
    () => logNormal(rng, REVENUE_MEDIAN, REVENUE_SIGMA),
    REVENUE_MIN,
    REVENUE_MAX,
  );
  // I bound sono multipli di 1.000, quindi l'arrotondamento non puo' uscirne.
  return roundTo(raw, STEP_REVENUE);
}

// ---------------------------------------------------------------------------
// Margine EBITDA
// ---------------------------------------------------------------------------

interface RangeSpec {
  readonly lo: number;
  readonly hi: number;
}

/** Bande di margine EBITDA per settore (§4.3). Estremi inclusi. */
export const MARGIN_BOUNDS: Readonly<Record<Sector, RangeSpec>> = {
  manifattura: { lo: 0.08, hi: 0.14 },
  software: { lo: 0.2, hi: 0.35 },
  distribuzione: { lo: 0.03, hi: 0.06 },
  servizi: { lo: 0.12, hi: 0.2 },
};

/**
 * Forma della beta usata per i margini. Simmetrica e unimodale: dentro la banda
 * di settore i valori centrali sono i piu' probabili, gli estremi rari ma
 * raggiungibili. alpha = beta = 2,6 da' una campana con deviazione standard
 * pari al 20% della larghezza della banda.
 */
const MARGIN_ALPHA = 2.6;
const MARGIN_BETA = 2.6;

/** Margine EBITDA come frazione dei ricavi (0,12 = 12%), arrotondato a 0,1pp. */
export function ebitdaMargin(rng: SeededRandom, sector: Sector): number {
  const { lo, hi } = MARGIN_BOUNDS[sector];
  const x = beta(rng, MARGIN_ALPHA, MARGIN_BETA);
  return roundTo(lo + x * (hi - lo), STEP_RATE);
}

// ---------------------------------------------------------------------------
// Crescita
// ---------------------------------------------------------------------------

interface GrowthSpec {
  readonly min: number;
  readonly mode: number;
  readonly max: number;
}

/**
 * Crescita organica dei ricavi, per settore. Triangolare: si conosce un
 * intervallo plausibile e un valore tipico, non c'e' una teoria dietro — ed e'
 * bounded, cosa che serve perche' il multiplo ci si aggancia sopra.
 * Il minimo negativo e' voluto: un target in contrazione e' un caso da saper
 * valutare, non un'anomalia da escludere.
 */
export const GROWTH_BOUNDS: Readonly<Record<Sector, GrowthSpec>> = {
  manifattura: { min: -0.03, mode: 0.03, max: 0.12 },
  software: { min: 0.0, mode: 0.15, max: 0.45 },
  distribuzione: { min: -0.04, mode: 0.02, max: 0.1 },
  servizi: { min: -0.02, mode: 0.06, max: 0.18 },
};

/** Tasso di crescita annuo dei ricavi (0,08 = +8%), arrotondato a 0,1pp. */
export function growthRate(rng: SeededRandom, sector: Sector): number {
  const { min, mode, max } = GROWTH_BOUNDS[sector];
  return roundTo(triangular(rng, min, mode, max), STEP_RATE);
}

// ---------------------------------------------------------------------------
// Multiplo EV/EBITDA
// ---------------------------------------------------------------------------

interface MultipleSpec {
  /** Multiplo del settore quando crescita e margine sono ai valori di riferimento. */
  readonly center: number;
  /** Dispersione idiosincratica: qualita' del management, quote di mercato, timing. */
  readonly sigma: number;
  readonly min: number;
  readonly max: number;
  /** Crescita e margine "normali" del settore: il punto in cui lo shift e' nullo. */
  readonly growthRef: number;
  readonly marginRef: number;
  /** Turni di EBITDA per punto (frazione, non percentuale) di crescita / margine. */
  readonly growthBeta: number;
  readonly marginBeta: number;
}

export const MULTIPLE_BOUNDS: Readonly<Record<Sector, MultipleSpec>> = {
  manifattura: {
    center: 6.5,
    sigma: 0.8,
    min: 4.0,
    max: 11.0,
    growthRef: 0.03,
    growthBeta: 22,
    marginRef: 0.11,
    marginBeta: 25,
  },
  software: {
    center: 12.0,
    sigma: 1.6,
    min: 7.0,
    max: 22.0,
    growthRef: 0.15,
    growthBeta: 14,
    marginRef: 0.275,
    marginBeta: 18,
  },
  distribuzione: {
    center: 5.5,
    sigma: 0.7,
    min: 3.5,
    max: 9.0,
    growthRef: 0.02,
    growthBeta: 20,
    marginRef: 0.045,
    marginBeta: 45,
  },
  servizi: {
    center: 8.0,
    sigma: 1.0,
    min: 5.0,
    max: 14.0,
    growthRef: 0.06,
    growthBeta: 18,
    marginRef: 0.16,
    marginBeta: 22,
  },
};

/**
 * Multiplo EV/EBITDA di settore, correlato positivamente a crescita e margine.
 *
 * Come e' implementata la correlazione — e perche' cosi': si SPOSTA IL CENTRO
 * della distribuzione, non si deforma il campione estratto.
 *
 *     center' = center + growthBeta * (growth - growthRef)
 *                      + marginBeta * (margin - marginRef)
 *     multiplo ~ N(center', sigma) troncata a [min, max]
 *
 * Vantaggi rispetto ad altre strade (copule, campionamento condizionato):
 *  - la dispersione idiosincratica resta esattamente `sigma` a qualunque livello
 *    di crescita, quindi due aziende identiche su carta possono comunque valere
 *    multipli diversi — che e' il fatto empirico che i comps devono insegnare;
 *  - la relazione e' leggibile e difendibile in un brief: "+10pp di crescita
 *    valgono +2,2 turni nella manifattura" e' una frase che un analista firma;
 *  - resta monotona, quindi il segno della correlazione non dipende dal seed.
 *
 * I `beta` sono in turni di EBITDA per unita' (non per punto percentuale):
 * `growthBeta: 22` vuol dire +0,22x ogni punto percentuale di crescita in piu'.
 */
export function evEbitdaMultiple(
  rng: SeededRandom,
  sector: Sector,
  growth: number,
  margin: number,
): number {
  const spec = MULTIPLE_BOUNDS[sector];
  const center =
    spec.center +
    spec.growthBeta * (growth - spec.growthRef) +
    spec.marginBeta * (margin - spec.marginRef);

  const raw = truncated(() => normal(rng, center, spec.sigma), spec.min, spec.max);
  // min e max sono multipli di 0,1: l'arrotondamento non puo' far uscire dai bound.
  return roundTo(raw, STEP_MULTIPLE);
}

// ---------------------------------------------------------------------------
// Leva
// ---------------------------------------------------------------------------

/** Leva di ingresso di un LBO mid-market, in turni di EBITDA (§4.3). */
export const LEVERAGE_BOUNDS = { min: 3.0, mode: 4.0, max: 5.5 } as const;

/**
 * Debito totale / EBITDA all'ingresso. Moda a 4,0x e non al centro
 * dell'intervallo: 5x+ e' territorio da banche compiacenti o ciclo caldo, va
 * generato ma meno spesso di 4x.
 */
export function leverage(rng: SeededRandom): number {
  const raw = triangular(rng, LEVERAGE_BOUNDS.min, LEVERAGE_BOUNDS.mode, LEVERAGE_BOUNDS.max);
  return roundTo(raw, STEP_MULTIPLE);
}
