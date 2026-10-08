/**
 * Utensili per chi scrive template.
 *
 * Sta FUORI da `templates/` di proposito: il registry raccoglie ogni file sotto
 * quella cartella e pretende un `LevelTemplate` come default export, quindi i
 * moduli di supporto non possono viverci dentro.
 *
 * Obiettivo di questo file: rendere la scrittura di un template una descrizione
 * del contenuto didattico, non un esercizio di costruzione di array. Se scrivere
 * il centotrentaduesimo template costa quanto il primo, il curriculum non si
 * finisce mai.
 */

import { colToLetters, a1ToCoord } from '../engine/address';
import { MODEL_COLORS } from '../styles/palette';
import type { CellStyle } from '../engine/types';
import { contentNumberLocale } from '../i18n/content';
import type { CellSpec, Hint, LevelTemplate, ParScore, SheetSpec, Task } from './types';

/**
 * Tipizza un template senza fare nulla a runtime.
 *
 * Vive qui e non nel registry di proposito: il registry carica i template con
 * `import.meta.glob` al proprio top level, quindi un template che importasse da
 * lui troverebbe il modulo a meta' inizializzazione. Il ciclo si spezza tenendo
 * l'helper in un modulo che non dipende da nessuno.
 */
export function defineTemplate(t: LevelTemplate): LevelTemplate {
  return t;
}

// ---------------------------------------------------------------------------
// Stili ricorrenti
// ---------------------------------------------------------------------------

/** Intestazione di sezione: grassetto su fondo scuro, come nei modelli veri. */
export const STILE_TITOLO: CellStyle = { bold: true };
export const STILE_ETICHETTA: CellStyle = {};
/** Input battuto a mano: blu. E' la convenzione che il grader verifica. */
export const STILE_INPUT: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '#,##0' };
export const STILE_INPUT_PCT: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '0.0%' };
export const STILE_INPUT_MULTIPLO: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: '0.0x' };
export const STILE_FORMULA: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '#,##0' };
export const STILE_FORMULA_PCT: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.0%' };
export const STILE_TOTALE: CellStyle = {
  fontColor: MODEL_COLORS.formula,
  bold: true,
  numFmt: '#,##0',
  borders: { top: { style: 'thin' } },
};

// ---------------------------------------------------------------------------
// Costruzione dei fogli
// ---------------------------------------------------------------------------

/** Contenuto di una cella in forma compatta, per le matrici letterali. */
export type Contenuto = string | number | boolean | null;

export interface BloccoOpzioni {
  /** Stile applicato a tutte le celle non nulle del blocco. */
  readonly style?: CellStyle;
  /** Se true (default) le celle scritte dal template sono di sola lettura. */
  readonly locked?: boolean;
}

/**
 * Trasforma una matrice in `CellSpec[]`, a partire da un angolo in alto a sinistra.
 * Le celle `null` non vengono emesse: servono a bucare il blocco.
 */
export function blocco(topLeft: string, righe: readonly (readonly Contenuto[])[], opts: BloccoOpzioni = {}): CellSpec[] {
  const origine = a1ToCoord(topLeft);
  if (!origine) throw new Error(`blocco(): "${topLeft}" non e' un riferimento valido`);

  const out: CellSpec[] = [];
  for (let r = 0; r < righe.length; r++) {
    const riga = righe[r];
    for (let c = 0; c < riga.length; c++) {
      const v = riga[c];
      if (v === null) continue;
      out.push({
        ref: `${colToLetters(origine.col + c)}${origine.row + r + 1}`,
        content: v,
        ...(opts.style ? { style: opts.style } : {}),
        locked: opts.locked !== false,
      });
    }
  }
  return out;
}

/** Una colonna verticale a partire da una cella. Comodo per le etichette di riga. */
export function colonna(topLeft: string, valori: readonly Contenuto[], opts: BloccoOpzioni = {}): CellSpec[] {
  return blocco(topLeft, valori.map((v) => [v]), opts);
}

/** Una riga orizzontale. Comodo per le intestazioni di periodo. */
export function riga(topLeft: string, valori: readonly Contenuto[], opts: BloccoOpzioni = {}): CellSpec[] {
  return blocco(topLeft, [valori], opts);
}

/** Marca un'area come area di lavoro del giocatore: sbloccata e vuota. */
export function areaLibera(refs: readonly string[]): CellSpec[] {
  return refs.map((ref) => ({ ref, content: null, locked: false }));
}

export interface FoglioOpzioni {
  readonly colWidths?: Readonly<Record<string, number>>;
  readonly frozenRows?: number;
  readonly frozenCols?: number;
}

export function foglio(name: string, gruppi: readonly CellSpec[][], opts: FoglioOpzioni = {}): SheetSpec {
  const cells = gruppi.flat();
  const visti = new Set<string>();
  for (const c of cells) {
    const key = c.ref.toUpperCase();
    if (visti.has(key)) {
      throw new Error(`foglio("${name}"): la cella ${c.ref} e' definita due volte`);
    }
    visti.add(key);
  }
  return { name, cells, ...opts };
}

// ---------------------------------------------------------------------------
// Task e hint
// ---------------------------------------------------------------------------

/** Scorciatoia per il task piu' frequente: una cella, una formula, un valore atteso. */
export function taskFormula(args: {
  id: string;
  prompt: string;
  target: string;
  atteso: number;
  referenzia?: readonly string[];
  tolleranza?: number;
  senzaLiteral?: readonly number[];
  ancoraggio?: string;
  skills?: readonly string[];
  minKeystrokes?: number;
}): Task {
  const check: Task['check'] = [
    { kind: 'mustBeFormula' },
    {
      kind: 'value',
      expected: args.atteso,
      ...(args.tolleranza !== undefined ? { tolerance: args.tolleranza } : {}),
    },
    ...(args.referenzia ? [{ kind: 'mustReference' as const, cells: args.referenzia }] : []),
    ...(args.senzaLiteral ? [{ kind: 'mustNotContainLiteral' as const, except: args.senzaLiteral }] : []),
    ...(args.ancoraggio ? [{ kind: 'anchoring' as const, pattern: args.ancoraggio }] : []),
  ];
  return {
    id: args.id,
    prompt: args.prompt,
    targetCell: args.target,
    check,
    ...(args.skills ? { skills: args.skills } : {}),
    ...(args.minKeystrokes !== undefined ? { minKeystrokes: args.minKeystrokes } : {}),
  };
}

export function hint(id: string, text: string, xpCost = 10, taskId?: string): Hint {
  return { id, text, xpCost, ...(taskId ? { taskId } : {}) };
}

// ---------------------------------------------------------------------------
// Par score
// ---------------------------------------------------------------------------

/**
 * Par iniziale ragionevole, da ricalibrare sulla mediana delle run reali (§14).
 * Non e' inventato del tutto: parte dai keystroke minimi teorici dei task e
 * assume un ritmo di ~3,5 battute al secondo per chi sa gia' usare la tastiera,
 * piu' un tempo fisso di lettura del brief.
 */
export function par(tasks: readonly Task[], opts: { letturaSecondi?: number; ritmo?: number } = {}): ParScore {
  const keystrokes = tasks.reduce((acc, t) => acc + (t.minKeystrokes ?? 18), 0);
  const ritmo = opts.ritmo ?? 3.5;
  const lettura = opts.letturaSecondi ?? 15;
  return {
    keystrokes,
    seconds: Math.round(lettura + keystrokes / ritmo),
  };
}

// ---------------------------------------------------------------------------
// Formattazione dei brief
// ---------------------------------------------------------------------------

/** Numeri dentro il testo del brief: separatori della lingua dei testi, mai notazione scientifica. */
export function num(n: number, decimali = 0): string {
  return n.toLocaleString(contentNumberLocale(), { minimumFractionDigits: decimali, maximumFractionDigits: decimali });
}

export function eur(n: number, decimali = 0): string {
  return `€ ${num(n, decimali)}`;
}

/** Milioni con una cifra: "€ 12,5m", come si scrive in un teaser. */
export function eurM(n: number): string {
  return `€ ${num(n / 1_000_000, 1)}m`;
}

export function pct(frazione: number, decimali = 1): string {
  return `${num(frazione * 100, decimali)}%`;
}

export function multiplo(x: number): string {
  return `${num(x, 1)}x`;
}
