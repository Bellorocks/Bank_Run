/**
 * Geometria della griglia: da indice a pixel e ritorno.
 *
 * Serve a tre cose che devono restare d'accordo fra loro, altrimenti il cursore
 * finisce su una cella e il rettangolo blu su un'altra:
 *   - posizionare le celle nel DOM
 *   - mappare un click in coordinate di cella
 *   - decidere quali righe/colonne sono visibili, e portarne una in vista
 *
 * Vincolo che detta l'implementazione: il foglio ha 1.048.576 righe. Precalcolare
 * le somme cumulate e' fuori discussione. Ma le righe che deviano dall'altezza
 * standard sono poche decine, quindi l'offset si calcola come
 * `indice * dimensioneStandard + somma degli scarti precedenti`, e gli scarti
 * stanno in un elenco ordinato su cui si fa ricerca binaria: O(log n) per query,
 * memoria proporzionale alle sole righe modificate.
 */

export interface AxisSource {
  /** Dimensioni che deviano dal default, per indice. */
  readonly sizes: ReadonlyMap<number, number>;
  /** Indici nascosti: contano come dimensione 0. */
  readonly hidden: ReadonlySet<number>;
  readonly defaultSize: number;
  /** Ultimo indice valido (compreso). */
  readonly count: number;
}

interface Override {
  readonly index: number;
  /** Scarto rispetto al default: puo' essere negativo. */
  readonly delta: number;
}

/**
 * Un asse della griglia (le righe oppure le colonne).
 * Immutabile: si ricostruisce quando il layout cambia, cosi' React puo'
 * confrontarlo per identita' invece di ricalcolare a ogni frame.
 */
export class Axis {
  private readonly overrides: Override[];
  /** Somme cumulate degli scarti, allineate a `overrides`. */
  private readonly cumulative: number[];

  readonly defaultSize: number;
  readonly count: number;

  constructor(source: AxisSource) {
    this.defaultSize = source.defaultSize;
    this.count = source.count;

    const indici = new Set<number>([...source.sizes.keys(), ...source.hidden]);
    this.overrides = [...indici]
      .sort((a, b) => a - b)
      .map((index) => {
        const size = source.hidden.has(index) ? 0 : (source.sizes.get(index) ?? source.defaultSize);
        return { index, delta: size - source.defaultSize };
      })
      .filter((o) => o.delta !== 0);

    this.cumulative = [];
    let acc = 0;
    for (const o of this.overrides) {
      acc += o.delta;
      this.cumulative.push(acc);
    }
  }

  /** Dimensione in pixel dell'indice. Zero se nascosto. */
  size(index: number): number {
    const i = this.findOverride(index);
    if (i >= 0) return this.defaultSize + this.overrides[i].delta;
    return this.defaultSize;
  }

  isHidden(index: number): boolean {
    return this.size(index) === 0;
  }

  /**
   * Pixel dal bordo iniziale al bordo iniziale dell'indice.
   * Accetta `count + 1` — cioe' il bordo finale del foglio — perche' e' quello
   * che serve per l'estensione totale e per il limite superiore della ricerca.
   */
  offset(index: number): number {
    const clamped = Math.max(0, Math.min(this.count + 1, index));
    return clamped * this.defaultSize + this.deltaBefore(clamped);
  }

  /** Estensione totale dell'asse, ultimo indice compreso. */
  get totalSize(): number {
    return this.offset(this.count + 1);
  }

  /**
   * Indice che contiene la coordinata in pixel. Se `px` cade su una riga
   * nascosta (dimensione zero) restituisce il primo indice VISIBILE successivo:
   * un click non deve mai lasciare il cursore su qualcosa che non si vede.
   *
   * Niente scorciatoia per `px <= 0`: con le prime righe nascoste il pixel zero
   * NON appartiene alla riga zero, e la ricerca binaria e' l'unica che lo sa.
   */
  indexAt(px: number): number {
    const target = Math.max(0, px);
    let lo = 0;
    let hi = this.count;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.offset(mid + 1) <= target) lo = mid + 1;
      else hi = mid;
    }
    let i = Math.min(lo, this.count);
    while (i < this.count && this.size(i) === 0) i += 1;
    return i;
  }

  /** Indici visibili che intersecano la finestra `[from, to)` in pixel. */
  visibleRange(from: number, to: number): { start: number; end: number } {
    const start = this.indexAt(Math.max(0, from));
    const end = Math.min(this.count, this.indexAt(Math.max(0, to)) + 1);
    return { start, end: Math.max(start, end) };
  }

  /**
   * Scroll minimo per portare `index` dentro la finestra, tenendo conto delle
   * bande bloccate che coprono l'inizio dell'area scorrevole.
   */
  scrollToShow(index: number, scroll: number, viewport: number, frozenSize: number): number {
    const inizio = this.offset(index);
    const fine = inizio + this.size(index);
    const visibileDa = scroll + frozenSize;
    const visibileA = scroll + viewport;
    if (inizio < visibileDa) return Math.max(0, inizio - frozenSize);
    if (fine > visibileA) return Math.max(0, fine - viewport);
    return scroll;
  }

  /** Somma degli scarti degli indici strettamente minori di `index`. */
  private deltaBefore(index: number): number {
    if (this.overrides.length === 0) return 0;
    let lo = 0;
    let hi = this.overrides.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.overrides[mid].index < index) lo = mid + 1;
      else hi = mid;
    }
    return lo === 0 ? 0 : this.cumulative[lo - 1];
  }

  /** Posizione in `overrides`, oppure -1. */
  private findOverride(index: number): number {
    let lo = 0;
    let hi = this.overrides.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const v = this.overrides[mid].index;
      if (v === index) return mid;
      if (v < index) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }
}

/**
 * Quanti indici stanno in una finestra alta `viewport` pixel a partire da
 * `start`. Serve a PagSu/PagGiu, che in Excel si muovono di una schermata.
 */
export function indicesInViewport(axis: Axis, start: number, viewport: number): number {
  let usati = 0;
  let i = start;
  let n = 0;
  while (i <= axis.count && usati < viewport) {
    usati += axis.size(i);
    if (axis.size(i) > 0) n += 1;
    i += 1;
  }
  return Math.max(1, n);
}
