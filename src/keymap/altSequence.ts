/**
 * Sequenze Alt legacy (BUILD SPEC §3.1 "Formattazione", §3.2).
 *
 * Una sequenza Alt NON e' una scorciatoia: e' un cammino in un albero.
 * `Alt` apre la barra dei menu, `H` scende nel ramo Home, `O` nel sotto-ramo
 * Formato, `I` esegue Adatta larghezza colonne. Fra un tasto e l'altro non c'e'
 * nessun modificatore premuto: e' uno stato dell'interfaccia, e va mostrato
 * ("Alt, H, O" nella barra di stato) altrimenti l'utente si perde.
 *
 * Comportamenti Excel riprodotti di proposito:
 *  - un tasto che non esiste nel ramo corrente non "aspetta": Excel emette un
 *    beep e chiude la barra. Quindi -> stato `invalid` e reset completo.
 *  - Esc risale di UN livello soltanto, non azzera tutto.
 *  - Alt premuto una seconda volta chiude la barra (toggle), non la riapre.
 *  - `Alt+=` e' una foglia della radice: si chiude subito, non apre nulla.
 *
 * NON passano da qui, perche' in Excel sono accordi veri e non cammini:
 * `Alt+Invio`, `Alt+Maiusc+Destra`, `Alt+Maiusc+Sinistra`, `Alt+PagSu/PagGiu`.
 * Stanno in `bindings.ts`.
 */

import type { Command } from './commands';

import { tr } from '../i18n/ui';
export interface AltLeaf {
  readonly kind: 'leaf';
  /** Etichetta italiana per la barra di stato e il cheat sheet. */
  readonly label: string;
  readonly command: Command;
}

export interface AltBranch {
  readonly kind: 'branch';
  readonly label: string;
  /** Chiavi SEMPRE in maiuscolo (o il simbolo, per `=`). */
  readonly children: Readonly<Record<string, AltNode>>;
}

export type AltNode = AltLeaf | AltBranch;

export type AltState = 'idle' | 'pending' | 'fired' | 'invalid';

export interface AltFeedResult {
  readonly state: AltState;
  /**
   * Cammino percorso, senza il prefisso `Alt`.
   * Su `fired` contiene il cammino completo eseguito; su `invalid` contiene il
   * cammino tentato COMPRESO il tasto rifiutato (serve al log degli errori:
   * "l'utente cerca Alt,H,Z" e' un'informazione didattica).
   */
  readonly path: string[];
  readonly command?: Command;
}

export interface AltOption {
  readonly key: string;
  readonly label: string;
  readonly isLeaf: boolean;
}

export interface AltMachine {
  /** Consuma un tasto. Accetta `"Alt"`, `"Escape"` e i tasti del cammino. */
  feed(key: string): AltFeedResult;
  reset(): void;
  /** `"Alt, H, O"` per la barra di stato; stringa vuota se la barra e' chiusa. */
  pathLabel(): string;
  isOpen(): boolean;
  /** Tasti disponibili nel ramo corrente, per l'overlay dei key tip. */
  options(): AltOption[];
}

/** Normalizza il tasto in ingresso: i cammini Alt sono case-insensitive. */
function normalizeAltKey(key: string): string {
  if (key === 'Alt') return 'Alt';
  if (key === 'Escape' || key === 'Esc') return 'Escape';
  return key.toUpperCase();
}

export function createAltMachine(tree: AltNode): AltMachine {
  let open = false;
  let path: string[] = [];

  /** Nodo raggiunto dal cammino corrente. */
  function currentNode(): AltNode {
    let node: AltNode = tree;
    for (const k of path) {
      if (node.kind !== 'branch') return node;
      const child = node.children[k];
      if (child === undefined) return node;
      node = child;
    }
    return node;
  }

  function pending(): AltFeedResult {
    return { state: 'pending', path: [...path] };
  }

  function close(): void {
    open = false;
    path = [];
  }

  function feed(rawKey: string): AltFeedResult {
    const key = normalizeAltKey(rawKey);

    if (key === 'Alt') {
      if (open) {
        // Secondo Alt: Excel chiude i key tip invece di riaprirli.
        close();
        return { state: 'idle', path: [] };
      }
      open = true;
      path = [];
      return pending();
    }

    // Barra chiusa: il tasto non ci riguarda, lo gestira' il dispatcher normale.
    if (!open) return { state: 'idle', path: [] };

    if (key === 'Escape') {
      if (path.length === 0) {
        close();
        return { state: 'idle', path: [] };
      }
      path.pop();
      return pending();
    }

    const node = currentNode();
    if (node.kind !== 'branch') {
      // Difensivo: una foglia viene sempre consumata subito, non si arriva qui.
      close();
      return { state: 'invalid', path: [] };
    }

    const child = node.children[key];
    if (child === undefined) {
      const attempted = [...path, key];
      close();
      return { state: 'invalid', path: attempted };
    }

    path.push(key);
    if (child.kind === 'leaf') {
      const executed = [...path];
      close();
      return { state: 'fired', path: executed, command: child.command };
    }
    return pending();
  }

  return {
    feed,
    reset: close,
    pathLabel(): string {
      if (!open) return '';
      return ['Alt', ...path].join(', ');
    },
    isOpen(): boolean {
      return open;
    },
    options(): AltOption[] {
      if (!open) return [];
      const node = currentNode();
      if (node.kind !== 'branch') return [];
      return Object.entries(node.children).map(([key, child]) => ({
        key,
        label: child.label,
        isLeaf: child.kind === 'leaf',
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// L'albero di Excel, limitato ai rami che il gioco usa davvero
// ---------------------------------------------------------------------------

const BORDERS_BRANCH: AltBranch = {
  kind: 'branch',
  label: tr('altSequence.1'),
  children: {
    A: { kind: 'leaf', label: tr('altSequence.2'), command: 'format.borderAll' },
    S: { kind: 'leaf', label: tr('altSequence.3'), command: 'format.borderOutside' },
    O: { kind: 'leaf', label: tr('altSequence.4'), command: 'format.borderBottom' },
    T: { kind: 'leaf', label: tr('altSequence.5'), command: 'format.borderTop' },
    L: { kind: 'leaf', label: tr('altSequence.6'), command: 'format.borderLeft' },
    R: { kind: 'leaf', label: tr('altSequence.7'), command: 'format.borderRight' },
    N: { kind: 'leaf', label: tr('altSequence.8'), command: 'format.borderNone' },
  },
};

const HOME_BRANCH: AltBranch = {
  kind: 'branch',
  label: tr('altSequence.9'),
  children: {
    O: {
      kind: 'branch',
      label: tr('altSequence.10'),
      children: {
        I: { kind: 'leaf', label: tr('altSequence.11'), command: 'structure.autofitColumn' },
        A: { kind: 'leaf', label: tr('altSequence.12'), command: 'structure.autofitRow' },
        W: { kind: 'leaf', label: tr('altSequence.13'), command: 'structure.columnWidth' },
        H: { kind: 'leaf', label: tr('altSequence.14'), command: 'structure.rowHeight' },
      },
    },
    // Attenzione: `H` qui dentro e' il colore di riempimento, non un sotto-ramo.
    // Alt,H,H e Alt,H,O,H sono due cose diverse ed e' un classico inciampo.
    H: { kind: 'leaf', label: tr('altSequence.15'), command: 'format.fillColor' },
    F: {
      kind: 'branch',
      label: tr('altSequence.16'),
      children: {
        C: { kind: 'leaf', label: tr('altSequence.17'), command: 'format.fontColor' },
      },
    },
    B: BORDERS_BRANCH,
  },
};

export const EXCEL_ALT_TREE: AltBranch = {
  kind: 'branch',
  label: tr('altSequence.18'),
  children: {
    H: HOME_BRANCH,
    A: {
      kind: 'branch',
      label: tr('altSequence.19'),
      children: {
        S: {
          kind: 'branch',
          label: tr('altSequence.20'),
          children: {
            S: { kind: 'leaf', label: tr('altSequence.21'), command: 'data.sort' },
          },
        },
      },
    },
    M: {
      kind: 'branch',
      label: tr('altSequence.22'),
      children: {
        P: { kind: 'leaf', label: tr('altSequence.23'), command: 'formula.tracePrecedents' },
        D: { kind: 'leaf', label: tr('altSequence.24'), command: 'formula.traceDependents' },
      },
    },
    E: {
      kind: 'branch',
      label: tr('altSequence.25'),
      children: {
        S: { kind: 'leaf', label: tr('altSequence.26'), command: 'clipboard.pasteSpecialDialog' },
      },
    },
    // Caso a se': `=` e' una foglia della radice, quindi Alt+= esegue e chiude.
    '=': { kind: 'leaf', label: tr('altSequence.27'), command: 'formula.autosum' },
  },
};

// ---------------------------------------------------------------------------
// Introspezione (serve al cheat sheet e ai test di copertura)
// ---------------------------------------------------------------------------

export interface AltSequenceEntry {
  /** Cammino senza `Alt`, es. `['H','O','I']`. */
  readonly path: readonly string[];
  /** `"Alt, H, O, I"`. */
  readonly display: string;
  /** Etichette dei rami attraversati piu' la foglia: `"Home > Formato > Adatta..."`. */
  readonly trail: string;
  readonly label: string;
  readonly command: Command;
}

/** Elenca tutte le foglie dell'albero, in profondita'. */
export function flattenAltTree(tree: AltNode): AltSequenceEntry[] {
  const out: AltSequenceEntry[] = [];
  const walk = (node: AltNode, path: string[], labels: string[]): void => {
    if (node.kind === 'leaf') {
      out.push({
        path: [...path],
        display: ['Alt', ...path].join(', '),
        trail: labels.join(' > '),
        label: node.label,
        command: node.command,
      });
      return;
    }
    for (const [key, child] of Object.entries(node.children)) {
      walk(child, [...path, key], [...labels, child.label]);
    }
  };
  walk(tree, [], []);
  return out;
}
