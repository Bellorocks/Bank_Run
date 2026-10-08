/**
 * Il ciclo F4 sugli ancoraggi.
 *
 * Ciclo Excel: `A1` -> `$A$1` -> `A$1` -> `$A1` -> `A1`.
 * Si legge come: prima blocca tutto, poi sblocca la colonna, poi sblocca la riga
 * e blocca la colonna, poi libera tutto. E' l'ordine che rende `A$1` (blocca la
 * riga) raggiungibile in due pressioni — quello che serve per le tabelle
 * di sensitivita', dove F4 si usa davvero.
 *
 * Lavora sul TESTO, non sull'AST: F4 si preme mentre la formula e' incompleta e
 * un parser che rifiuta l'input a meta' sarebbe inutilizzabile. Serve solo il lexer.
 */

import { tokenize, type Token } from './tokenizer';

export interface AnchorState {
  readonly colAbs: boolean;
  readonly rowAbs: boolean;
}

export interface AnchorCycleResult {
  readonly text: string;
  readonly selStart: number;
  readonly selEnd: number;
  /** Falso se il cursore non era su alcun riferimento: il testo e' invariato. */
  readonly changed: boolean;
}

/** Passo successivo del ciclo: A1 -> $A$1 -> A$1 -> $A1 -> A1. */
export function nextAnchorState(s: AnchorState): AnchorState {
  if (!s.colAbs && !s.rowAbs) return { colAbs: true, rowAbs: true }; // A1   -> $A$1
  if (s.colAbs && s.rowAbs) return { colAbs: false, rowAbs: true }; //  $A$1 -> A$1
  if (!s.colAbs && s.rowAbs) return { colAbs: true, rowAbs: false }; // A$1  -> $A1
  return { colAbs: false, rowAbs: false }; //                          $A1  -> A1
}

// ---------------------------------------------------------------------------
// Riscrittura degli ancoraggi su testo
// ---------------------------------------------------------------------------

/** Riscrive un estremo (`A1`, `$A`, `3`) con gli ancoraggi richiesti. */
function reanchorPart(part: string, colAbs: boolean, rowAbs: boolean): string {
  const cell = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,7})$/.exec(part);
  if (cell) return `${colAbs ? '$' : ''}${cell[1]}${rowAbs ? '$' : ''}${cell[2]}`;
  const colOnly = /^\$?([A-Za-z]{1,3})$/.exec(part);
  if (colOnly) return `${colAbs ? '$' : ''}${colOnly[1]}`;
  const rowOnly = /^\$?([0-9]{1,7})$/.exec(part);
  if (rowOnly) return `${rowAbs ? '$' : ''}${rowOnly[1]}`;
  return part;
}

/**
 * Applica lo stato a un riferimento intero, prefisso foglio incluso.
 * Su un range i due estremi vanno allo STESSO stato: e' cio' che fa F4 su `A1:B2`.
 */
export function setAnchors(refText: string, state: AnchorState): string {
  // Il nome del foglio puo' contenere `!` se e' quotato (`'Q1!draft'!A1`),
  // quindi il separatore e' l'ULTIMO `!`, non il primo.
  const bang = refText.lastIndexOf('!');
  const prefix = bang >= 0 ? refText.slice(0, bang + 1) : '';
  const body = bang >= 0 ? refText.slice(bang + 1) : refText;
  const parts = body.split(':').map((p) => reanchorPart(p, state.colAbs, state.rowAbs));
  return prefix + parts.join(':');
}

/** Stato corrente di un token riferimento (per un range: quello dell'estremo iniziale). */
function stateOf(tok: Token): AnchorState {
  if (tok.type === 'cell' && tok.cell) {
    return { colAbs: tok.cell.colAbs, rowAbs: tok.cell.rowAbs };
  }
  if (tok.type === 'range' && tok.range) {
    return { colAbs: tok.range.start.colAbs, rowAbs: tok.range.start.rowAbs };
  }
  return { colAbs: false, rowAbs: false };
}

/** `A:A` e `3:3` hanno una sola dimensione scrivibile: il ciclo a 4 stati vi degenera. */
function isPartialSpan(tok: Token): boolean {
  return tok.type === 'range' && tok.range !== undefined && (tok.range.wholeColumn || tok.range.wholeRow);
}

// ---------------------------------------------------------------------------
// cycleAnchoring
// ---------------------------------------------------------------------------

function isRefToken(t: Token): boolean {
  return t.type === 'cell' || t.type === 'range';
}

/**
 * Riferimenti bersaglio della pressione di F4.
 *
 * Con selezione non vuota: tutti quelli che la selezione tocca, anche solo in
 * parte. Con solo il cursore: quello che lo contiene, considerando anche il
 * carattere alla SINISTRA del cursore — in Excel, con il cursore subito dopo
 * `A1`, F4 agisce su `A1`.
 */
function targetsFor(tokens: readonly Token[], selStart: number, selEnd: number): Token[] {
  const refs = tokens.filter(isRefToken);
  if (selEnd > selStart) {
    return refs.filter((r) => r.start < selEnd && r.end > selStart);
  }
  const p = selStart;
  const candidates = refs.filter((r) => r.start <= p && p <= r.end);
  if (candidates.length === 0) return [];
  // Con piu' candidati vince quello che sta a sinistra del cursore, come Excel.
  const leftish = candidates.filter((r) => r.start < p);
  return [leftish.length > 0 ? leftish[leftish.length - 1] : candidates[0]];
}

/**
 * Esegue un passo del ciclo F4 sul testo in editing.
 *
 * @param selStart inizio della selezione di testo (o posizione del cursore)
 * @param selEnd   fine della selezione; uguale a `selStart` se e' solo un cursore
 * @returns nuovo testo e nuova selezione, che copre i riferimenti modificati.
 *          Se il cursore non e' su alcun riferimento, tutto resta invariato.
 */
export function cycleAnchoring(text: string, selStart: number, selEnd: number): AnchorCycleResult {
  const lo = Math.min(selStart, selEnd);
  const hi = Math.max(selStart, selEnd);
  const tokens = tokenize(text);
  const targets = targetsFor(tokens, lo, hi);

  if (targets.length === 0) {
    return { text, selStart, selEnd, changed: false };
  }

  const first = targets[0];
  const current = stateOf(first);
  let next: AnchorState;
  if (targets.every(isPartialSpan)) {
    // Su `A:A` (o `3:3`) meta' del ciclo sarebbe invisibile: due dei quattro
    // stati producono lo stesso testo. Excel si comporta come un toggle secco.
    const on = first.range?.wholeColumn ? current.colAbs : current.rowAbs;
    next = { colAbs: !on, rowAbs: !on };
  } else {
    next = nextAnchorState(current);
  }

  // Sostituzione da destra a sinistra: cosi' gli offset dei token ancora da
  // trattare restano validi.
  let out = text;
  const newEnds = new Map<Token, number>();
  let delta = 0;
  for (let k = targets.length - 1; k >= 0; k--) {
    const t = targets[k];
    const replacement = setAnchors(t.text, next);
    out = out.slice(0, t.start) + replacement + out.slice(t.end);
  }
  // Ricalcolo degli offset da sinistra, ora che il testo e' definitivo.
  for (const t of targets) {
    const replacement = setAnchors(t.text, next);
    newEnds.set(t, t.end + delta + (replacement.length - t.text.length));
    delta += replacement.length - t.text.length;
  }

  const last = targets[targets.length - 1];
  const lastEnd = newEnds.get(last) ?? last.end;

  if (targets.length === 1) {
    // Excel lascia selezionato il riferimento appena modificato.
    return { text: out, selStart: first.start, selEnd: lastEnd, changed: true };
  }
  // Con piu' riferimenti la selezione li abbraccia tutti, senza restringersi
  // rispetto a quella che l'utente aveva fatto.
  return {
    text: out,
    selStart: Math.min(lo, first.start),
    selEnd: Math.max(hi + delta, lastEnd),
    changed: true,
  };
}
