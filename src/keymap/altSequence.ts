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
  label: 'Bordi',
  children: {
    A: { kind: 'leaf', label: 'Tutti i bordi', command: 'format.borderAll' },
    S: { kind: 'leaf', label: 'Bordo esterno (box)', command: 'format.borderOutside' },
    O: { kind: 'leaf', label: 'Bordo inferiore', command: 'format.borderBottom' },
    T: { kind: 'leaf', label: 'Bordo superiore', command: 'format.borderTop' },
    L: { kind: 'leaf', label: 'Bordo sinistro', command: 'format.borderLeft' },
    R: { kind: 'leaf', label: 'Bordo destro', command: 'format.borderRight' },
    N: { kind: 'leaf', label: 'Nessun bordo', command: 'format.borderNone' },
  },
};

const HOME_BRANCH: AltBranch = {
  kind: 'branch',
  label: 'Home',
  children: {
    O: {
      kind: 'branch',
      label: 'Formato',
      children: {
        I: { kind: 'leaf', label: 'Adatta larghezza colonna', command: 'structure.autofitColumn' },
        A: { kind: 'leaf', label: 'Adatta altezza riga', command: 'structure.autofitRow' },
        W: { kind: 'leaf', label: 'Larghezza colonna...', command: 'structure.columnWidth' },
        H: { kind: 'leaf', label: 'Altezza riga...', command: 'structure.rowHeight' },
      },
    },
    // Attenzione: `H` qui dentro e' il colore di riempimento, non un sotto-ramo.
    // Alt,H,H e Alt,H,O,H sono due cose diverse ed e' un classico inciampo.
    H: { kind: 'leaf', label: 'Colore riempimento', command: 'format.fillColor' },
    F: {
      kind: 'branch',
      label: 'Carattere',
      children: {
        C: { kind: 'leaf', label: 'Colore carattere', command: 'format.fontColor' },
      },
    },
    B: BORDERS_BRANCH,
  },
};

export const EXCEL_ALT_TREE: AltBranch = {
  kind: 'branch',
  label: 'Barra dei menu',
  children: {
    H: HOME_BRANCH,
    A: {
      kind: 'branch',
      label: 'Dati',
      children: {
        S: {
          kind: 'branch',
          label: 'Ordina',
          children: {
            S: { kind: 'leaf', label: 'Ordina...', command: 'data.sort' },
          },
        },
      },
    },
    M: {
      kind: 'branch',
      label: 'Formule',
      children: {
        P: { kind: 'leaf', label: 'Individua precedenti', command: 'formula.tracePrecedents' },
        D: { kind: 'leaf', label: 'Individua dipendenti', command: 'formula.traceDependents' },
      },
    },
    E: {
      kind: 'branch',
      label: 'Modifica (legacy)',
      children: {
        S: { kind: 'leaf', label: 'Incolla speciale...', command: 'clipboard.pasteSpecialDialog' },
      },
    },
    // Caso a se': `=` e' una foglia della radice, quindi Alt+= esegue e chiude.
    '=': { kind: 'leaf', label: 'Somma automatica', command: 'formula.autosum' },
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
