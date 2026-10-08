/**
 * PRNG deterministico — xoshiro128** con seeding SplitMix32.
 *
 * Requisito duro del progetto (§13): "lo stesso seed produce lo stesso livello,
 * sempre". Un livello fallito si ri-gioca identico, e il seed vive nel save file.
 * Per questo `Math.random` non compare in NESSUN punto del codebase.
 *
 * Perche' xoshiro128** e non un LCG improvvisato:
 *  - passa BigCrush, quindi le distribuzioni derivate (beta, log-normale) non
 *    ereditano artefatti di reticolo che renderebbero i numeri di bilancio
 *    riconoscibilmente "finti";
 *  - lavora su quattro parole a 32 bit, cioe' su interi che JS rappresenta
 *    esattamente: nessuna dipendenza da BigInt, nessun costo per chiamata.
 *
 * Tutta l'aritmetica e' forzata a 32 bit con `Math.imul`, `>>> 0` e rotazioni
 * esplicite: in JS `a * b` su interi grandi passa ai float e perde i bit bassi,
 * che sono esattamente quelli che il generatore usa.
 */

/** 2^32. Serve come divisore e come modulo, sempre esatto in double. */
const UINT32 = 4294967296;

/** Rotazione sinistra a 32 bit. */
function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * SplitMix32 — finalizzatore/mixer a 32 bit.
 *
 * Serve a due cose: espandere un seed scalare nelle quattro parole di stato di
 * xoshiro (seedare xoshiro con `[seed,0,0,0]` produrrebbe sequenze correlate tra
 * seed vicini, e i nostri seed vicini lo sono davvero: 1, 2, 3...) e a derivare
 * i seed dei fork.
 */
function splitMix32(x: number): number {
  let z = (x + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return (z ^ (z >>> 15)) >>> 0;
}

/** FNV-1a a 32 bit su unita' UTF-16: hash delle label dei fork. */
function hashLabel(label: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/**
 * Seed di un sotto-generatore, funzione pura di (seed, label).
 * Esportata perche' il motore di gioco puo' aver bisogno di ricostruire un fork
 * senza avere in mano il generatore padre.
 */
export function deriveSeed(seed: number, label: string): number {
  // Doppio passaggio di mixing: senza il primo, label che differiscono di un bit
  // su seed vicini finirebbero in seed vicini, e SplitMix32 da solo diffonde
  // bene ma su un input gia' decorrelato.
  return splitMix32((splitMix32(seed) ^ hashLabel(label)) >>> 0);
}

export class SeededRandom {
  /**
   * Seed effettivo, normalizzato a uint32. Invariante garantita:
   * `new SeededRandom(r.seed)` produce la stessa sequenza di `r` appena creato.
   */
  readonly seed: number;

  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: number) {
    if (!Number.isFinite(seed)) {
      throw new RangeError('SeededRandom: il seed deve essere un numero finito');
    }
    // Due seed congruenti mod 2^32 sono lo stesso seed: lo diciamo esponendo il
    // valore normalizzato invece di quello passato, cosi' il seed salvato nel
    // save file e' sempre quello che riproduce davvero la partita.
    this.seed = Math.trunc(seed) >>> 0;

    let x = this.seed;
    this.s0 = x = splitMix32(x);
    this.s1 = x = splitMix32(x);
    this.s2 = x = splitMix32(x);
    this.s3 = splitMix32(x);
    // Lo stato tutto-zero e' il punto fisso di xoshiro. SplitMix32 non lo produce
    // (le quattro parole sono output distinti di una permutazione), ma la guardia
    // costa nulla e documenta la trappola.
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) {
      this.s3 = 0x9e3779b9;
    }
  }

  /** Passo di xoshiro128**. Restituisce un uint32. */
  private next32(): number {
    const s0 = this.s0;
    const s1 = this.s1;
    const s2 = this.s2;
    const s3 = this.s3;

    const result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;

    // Attenzione all'ordine: s1 e s0 si aggiornano usando i valori NUOVI di s2 e
    // s3, mentre s2 e s3 usano quelli VECCHI di s0 e s1.
    const n2 = (s2 ^ s0) >>> 0;
    const n3 = (s3 ^ s1) >>> 0;
    this.s1 = (s1 ^ n2) >>> 0;
    this.s0 = (s0 ^ n3) >>> 0;
    this.s2 = (n2 ^ t) >>> 0;
    this.s3 = rotl(n3, 11);

    return result;
  }

  /**
   * Uniforme in [0, 1). Risoluzione 2^-32: piu' che sufficiente per generare
   * bilanci, e costa una sola estrazione invece delle due di un float a 53 bit.
   */
  next(): number {
    return this.next32() / UINT32;
  }

  /** Intero uniforme in [minIncl, maxIncl], estremi inclusi. */
  int(minIncl: number, maxIncl: number): number {
    if (!Number.isInteger(minIncl) || !Number.isInteger(maxIncl)) {
      throw new RangeError('SeededRandom.int: gli estremi devono essere interi');
    }
    if (maxIncl < minIncl) {
      throw new RangeError(`SeededRandom.int: intervallo vuoto [${minIncl}, ${maxIncl}]`);
    }
    const span = maxIncl - minIncl + 1;
    if (span > UINT32) {
      throw new RangeError('SeededRandom.int: intervallo piu ampio di 2^32');
    }
    if (span === 1) return minIncl;

    // `next32() % span` da solo favorirebbe i primi `2^32 % span` valori. Il bias
    // e' invisibile su un dado a sei facce ma diventa misurabile sulle decine di
    // migliaia di estrazioni che un template fa in una serata: rejection sampling.
    const limit = UINT32 - (UINT32 % span);
    let r = this.next32();
    while (r >= limit) {
      r = this.next32();
    }
    return minIncl + (r % span);
  }

  /** Elemento uniforme dell'array. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new RangeError('SeededRandom.pick: array vuoto');
    }
    return arr[this.int(0, arr.length - 1)];
  }

  /**
   * Elemento estratto con probabilita' proporzionale al peso.
   * I pesi non devono sommare a 1: vengono normalizzati qui.
   */
  pickWeighted<T>(arr: readonly { item: T; weight: number }[]): T {
    if (arr.length === 0) {
      throw new RangeError('SeededRandom.pickWeighted: array vuoto');
    }
    let total = 0;
    for (const entry of arr) {
      if (!Number.isFinite(entry.weight) || entry.weight < 0) {
        throw new RangeError('SeededRandom.pickWeighted: pesi negativi o non finiti');
      }
      total += entry.weight;
    }
    if (total <= 0) {
      throw new RangeError('SeededRandom.pickWeighted: somma dei pesi nulla');
    }

    let threshold = this.next() * total;
    for (const entry of arr) {
      threshold -= entry.weight;
      // `<` e non `<=`: un peso 0 non deve mai poter vincere, nemmeno quando la
      // soglia arriva esattamente a zero per accumulo di errore in virgola mobile.
      if (threshold < 0) return entry.item;
    }
    // Irraggiungibile salvo errori di arrotondamento sull'ultimo confronto.
    return arr[arr.length - 1].item;
  }

  /** Copia mescolata con Fisher-Yates (l'array in ingresso non viene toccato). */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /** `true` con probabilita' `p` (default 0,5). */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /**
   * Sotto-generatore derivato da (seed, label).
   *
   * Perche' esiste: un template genera i numeri di piu' task dallo stesso rng.
   * Se tutti pescassero dallo stesso stream, aggiungere un task in mezzo — o
   * semplicemente cambiare l'ordine di generazione — sposterebbe tutti i numeri
   * successivi, e i seed salvati nelle run passate produrrebbero livelli diversi.
   * Con `fork("debt-schedule")` ogni sezione ha il suo stream, indipendente
   * dall'ordine e dal numero di estrazioni fatte dalle altre.
   *
   * Nota deliberata: il fork deriva dal `seed` immutabile, NON dallo stato
   * corrente. Chiamare `fork` non consuma estrazioni al padre, e la stessa label
   * restituisce sempre lo stesso stream — anche se il padre nel frattempo e'
   * avanzato.
   */
  fork(label: string): SeededRandom {
    return new SeededRandom(deriveSeed(this.seed, label));
  }
}
