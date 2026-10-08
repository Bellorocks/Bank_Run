/**
 * Campionatori parametrici sopra `SeededRandom`.
 *
 * Regola del modulo (§4.3): i numeri di un livello non sono mai uniformi. Un
 * fatturato uniforme tra 1,5m e 150m produce aziende che non esistono; una
 * log-normale produce il mid-market vero, con la coda lunga a destra.
 *
 * Tutte le funzioni sono pure rispetto al generatore: stesso rng nello stesso
 * stato => stesso campione. Nessuna cachea stato tra chiamate (vedi `normal`).
 */

import type { SeededRandom } from './SeededRandom';

/**
 * Normale via Box-Muller.
 *
 * Box-Muller produce DUE variate indipendenti per coppia di uniformi, e la
 * versione "efficiente" tiene in cache la seconda. Qui la scartiamo di
 * proposito: la cache dovrebbe vivere fuori dal generatore (la funzione riceve
 * `rng`, non lo possiede) e renderebbe il risultato dipendente da quali altre
 * distribuzioni hanno chiamato `normal` prima. Determinismo prima di velocita'.
 */
export function normal(rng: SeededRandom, mu: number, sigma: number): number {
  // u1 puo' valere esattamente 0 (probabilita' 2^-32) e log(0) = -Infinity.
  let u1 = rng.next();
  while (u1 === 0) u1 = rng.next();
  const u2 = rng.next();
  const r = Math.sqrt(-2 * Math.log(u1));
  return mu + sigma * r * Math.cos(2 * Math.PI * u2);
}

/**
 * Log-normale parametrizzata sulla MEDIANA, non sulla media.
 *
 * Scelta deliberata: lo spec dice "mediana 8m". Per una log-normale
 * median = exp(mu), mentre mean = exp(mu + sigma^2/2) — con sigma 0,9 la media
 * sta il 50% sopra la mediana. Parametrizzare sulla media renderebbe il numero
 * dichiarato nello spec irriconoscibile nei campioni.
 *
 * `sigma` e' la deviazione standard del logaritmo, cioe' la dispersione
 * moltiplicativa: sigma 0,9 significa che un'azienda a +1 sigma fattura
 * exp(0,9) = 2,46 volte la mediana.
 */
export function logNormal(rng: SeededRandom, median: number, sigma: number): number {
  if (median <= 0) {
    throw new RangeError('logNormal: la mediana deve essere positiva');
  }
  return median * Math.exp(normal(rng, 0, sigma));
}

/**
 * Gamma con shape `k` e scala 1, metodo Marsaglia-Tsang (2000).
 * Esportata perche' e' il mattone della beta e serve altrove (code di costi).
 */
export function gamma(rng: SeededRandom, shape: number): number {
  if (!(shape > 0)) {
    throw new RangeError('gamma: shape deve essere positivo');
  }
  if (shape < 1) {
    // Boost di Marsaglia-Tsang: G(k) = G(k+1) * U^(1/k). Il metodo squeeze
    // richiede k >= 1, questa identita' copre il resto.
    let u = rng.next();
    while (u === 0) u = rng.next();
    return gamma(rng, shape + 1) * Math.pow(u, 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rng, 0, 1);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng.next();
    const x2 = x * x;
    // squeeze: evita il logaritmo nel ~95% dei casi
    if (u < 1 - 0.0331 * x2 * x2) return d * v;
    if (Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Beta su [0,1] con il rapporto di due Gamma: X ~ G(alpha), Y ~ G(beta),
 * B = X / (X + Y).
 *
 * Perche' non Johnk: l'algoritmo di Johnk accetta con probabilita' che crolla
 * come 1/(alpha+beta) — con i nostri parametri tipici (alpha = beta = 2,6, cioe'
 * la campana che serve per i margini EBITDA) rifiuterebbe la grande maggioranza
 * dei tentativi. Marsaglia-Tsang accetta oltre il 95% delle volte a costo
 * costante, e regge anche parametri asimmetrici.
 */
export function beta(rng: SeededRandom, alpha: number, betaParam: number): number {
  if (!(alpha > 0) || !(betaParam > 0)) {
    throw new RangeError('beta: alpha e beta devono essere positivi');
  }
  const x = gamma(rng, alpha);
  const y = gamma(rng, betaParam);
  const sum = x + y;
  // Entrambe le gamma possono sottoflussare a 0 per shape molto piccoli.
  if (sum === 0) return 0.5;
  return x / sum;
}

/**
 * Triangolare su [min, max] con moda in `mode`, per inversione della CDF.
 * E' la distribuzione giusta quando si conosce un intervallo plausibile e un
 * valore "tipico" ma non c'e' nessuna teoria dietro: crescita, leva, capex.
 */
export function triangular(rng: SeededRandom, min: number, mode: number, max: number): number {
  if (max < min) {
    throw new RangeError('triangular: max < min');
  }
  if (mode < min || mode > max) {
    throw new RangeError('triangular: la moda deve stare dentro [min, max]');
  }
  const width = max - min;
  if (width === 0) return min;

  const u = rng.next();
  const fc = (mode - min) / width;
  if (u < fc) {
    return min + Math.sqrt(u * width * (mode - min));
  }
  return max - Math.sqrt((1 - u) * width * (max - mode));
}

/**
 * Troncamento per rifiuto: ripete `sampler` finche' il valore cade in
 * [min, max].
 *
 * Se dopo `maxTries` tentativi non ci riesce, CLAMPA agli estremi invece di
 * lanciare o di ciclare all'infinito. Motivo: questa funzione sta nel percorso
 * di generazione di un livello, e un livello che non nasce e' un bug visibile
 * all'utente; un valore appiattito sul bound e' solo un campione insolito.
 * Il prezzo e' un atomo di probabilita' sui due estremi — accettabile finche'
 * la coda troncata resta piccola (nei nostri usi < 5%), e comunque il contratto
 * "il risultato sta sempre dentro i bound" e' garantito in ogni caso.
 */
export function truncated(
  sampler: () => number,
  min: number,
  max: number,
  maxTries = 100,
): number {
  if (max < min) {
    throw new RangeError('truncated: max < min');
  }
  let value = min;
  for (let i = 0; i < maxTries; i++) {
    value = sampler();
    if (value >= min && value <= max) return value;
  }
  // NaN incluso: il confronto sotto lo manderebbe su `min`, che e' il fallback voluto.
  return value > max ? max : min;
}

/** Numero di decimali significativi di uno step, ricavato dalla sua rappresentazione. */
function decimalsOf(step: number): number {
  const s = String(step);
  const e = s.indexOf('e');
  if (e < 0) {
    const dot = s.indexOf('.');
    return dot < 0 ? 0 : s.length - dot - 1;
  }
  // notazione esponenziale, es. "1e-7"
  const mantissa = s.slice(0, e);
  const dot = mantissa.indexOf('.');
  const mantissaDecimals = dot < 0 ? 0 : mantissa.length - dot - 1;
  return Math.max(0, mantissaDecimals - Number(s.slice(e + 1)));
}

/**
 * Mezzi lontano da zero, come `ROUND` di Excel (`ROUND(-4,25; 1) = -4,3`).
 * `Math.round` invece arrotonda i mezzi verso +infinito e darebbe -4,2:
 * differenza invisibile finche' non si confrontano i numeri generati con quelli
 * che l'utente ottiene scrivendo `=ROUND(...)` nella griglia.
 */
function roundHalfAwayFromZero(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/**
 * Arrotonda al multiplo di `step` piu' vicino.
 *
 * Serve a due cose: nessun bilancio ha ricavi di 8.431.772,4193 euro, e —
 * soprattutto — il grader confronta i valori con tolleranze strette, quindi i
 * numeri di partenza devono essere esattamente quelli che l'utente legge nella
 * cella, senza coda binaria.
 *
 * Il calcolo passa per una scala intera invece del semplice
 * `round(value / step) * step`, che sbaglia due volte:
 *  - `4.25 / 0.1` vale 42,499999999999993, quindi il "mezzo" si perde e il
 *    risultato scende a 4,2;
 *  - `3 * 0.1` vale 0,30000000000000004, e quel valore finirebbe in una formula.
 */
export function roundTo(value: number, step: number): number {
  if (!(step > 0) || !Number.isFinite(step)) {
    throw new RangeError('roundTo: lo step deve essere positivo e finito');
  }
  if (!Number.isFinite(value)) return value;

  const decimals = decimalsOf(step);
  const scale = Math.pow(10, decimals);
  const scaledStep = Math.round(step * scale);
  const scaled = value * scale;

  let out: number;
  if (scaledStep < 1 || !Number.isSafeInteger(Math.round(scaled))) {
    // step con piu' di ~15 decimali, o valori cosi' grandi che la scala
    // sfonderebbe i 53 bit: si torna alla forma diretta, che li' e' adeguata.
    out = roundHalfAwayFromZero(value / step) * step;
  } else {
    out = (roundHalfAwayFromZero(scaled / scaledStep) * scaledStep) / scale;
  }
  // normalizza -0, che stampa "-0" e confonde le asserzioni
  return out === 0 ? 0 : out;
}
