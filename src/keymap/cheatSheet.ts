/**
 * Cheat sheet richiamabile con "?" (BUILD SPEC §3.2).
 *
 * Regola non negoziabile: **questo file non contiene elenchi di scorciatoie**.
 * Tutte le righe sono derivate da tre sorgenti gia' esistenti —
 * `BINDINGS` (gli accordi), `EXCEL_ALT_TREE` (i cammini Alt) e
 * `PASTE_SPECIAL_OPTIONS` (la sotto-keymap del dialogo). Una seconda lista da
 * tenere allineata a mano diventerebbe bugiarda entro una settimana, e un
 * cheat sheet che mente e' peggio di nessun cheat sheet: qui l'overlay costa
 * XP (§6), quindi deve valere il prezzo.
 *
 * Cio' che questo file aggiunge e' solo presentazione: raggruppamento per
 * categoria, fusione delle firme che fanno la stessa cosa ("F5 / Ctrl+G") e
 * l'etichetta di contesto ("in Modifica, con testo selezionato").
 */

import type { EditMode } from '../engine/types';
import type { Command } from './commands';
import {
  BINDINGS,
  PASTE_SPECIAL_OPTIONS,
  type Binding,
  type BindingCategory,
} from './bindings';
import { EXCEL_ALT_TREE, flattenAltTree } from './altSequence';
import { formatSignatureForDisplay } from './keySignature';

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface CheatSheetRow {
  /** Gia' pronta da stampare: `"Ctrl+Maiusc+Giù"`, `"F5 / Ctrl+G"`, `"Alt, H, O, I"`. */
  readonly keys: string;
  /** Le firme grezze che hanno generato la riga (le sequenze Alt non ne hanno). */
  readonly signatures: readonly string[];
  readonly command: Command;
  readonly description: string;
  /** Quando la scorciatoia vale solo in certi stati: `"in Modifica/Punta"`. */
  readonly context?: string;
}

export interface CheatSheetSection {
  readonly category: BindingCategory;
  readonly title: string;
  readonly rows: readonly CheatSheetRow[];
}

// ---------------------------------------------------------------------------
// Etichette
// ---------------------------------------------------------------------------

/** Titoli dei gruppi: sono quelli del §3.1, nello stesso ordine. */
export const CATEGORY_TITLES: Readonly<Record<BindingCategory, string>> = {
  navigazione: 'Navigazione',
  editing: 'Editing',
  struttura: 'Struttura',
  formattazione: 'Formattazione',
  formule: 'Formule e audit',
  altro: 'Altro',
};

export const CATEGORY_ORDER: readonly BindingCategory[] = [
  'navigazione',
  'editing',
  'struttura',
  'formattazione',
  'formule',
  'altro',
];

/** Nomi italiani degli stati, come li mostra Excel in basso a sinistra. */
const MODE_LABELS: Readonly<Record<EditMode, string>> = {
  ready: 'Pronto',
  enter: 'Immissione',
  edit: 'Modifica',
  point: 'Punta',
};

// ---------------------------------------------------------------------------
// Derivazione
// ---------------------------------------------------------------------------

/**
 * Etichetta di contesto. Il caso normale (vale solo da Pronto, oppure vale
 * ovunque) non produce nulla: annotare l'ovvio riempie l'overlay di rumore.
 */
function contextOf(b: Binding): string | undefined {
  const parts: string[] = [];
  const readyOnly = b.modes.length === 1 && b.modes[0] === 'ready';
  const everywhere = b.modes.length === 4;
  if (!readyOnly && !everywhere) {
    parts.push(`in ${b.modes.map((m) => MODE_LABELS[m]).join('/')}`);
  }
  if (b.requiresTextSelection === true) parts.push('con testo selezionato');
  if (b.requiresClipboard === true) parts.push('con appunti pieni');
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Categoria di un comando dedotta dal suo dominio. Serve solo alle sequenze
 * Alt, che nell'albero non portano una categoria con se'.
 */
function categoryForCommand(command: Command): BindingCategory {
  const domain = command.slice(0, command.indexOf('.'));
  switch (domain) {
    case 'nav':
    case 'point':
      return 'navigazione';
    case 'edit':
    case 'clipboard':
      return 'editing';
    case 'structure':
      return 'struttura';
    case 'format':
      return 'formattazione';
    case 'formula':
    case 'name':
      return 'formule';
    default:
      return 'altro';
  }
}

/** Chiave di fusione: due binding diversi che dicono la stessa cosa fanno una riga sola. */
function mergeKey(command: Command, description: string, context: string | undefined): string {
  return [command, description, context ?? ''].join('|');
}

/** Righe derivate dagli accordi, nell'ordine di dichiarazione della tabella. */
function rowsFromBindings(): CheatSheetRow[] {
  const order: string[] = [];
  const acc = new Map<string, { row: CheatSheetRow; signatures: string[] }>();

  for (const b of BINDINGS) {
    const context = contextOf(b);
    const key = mergeKey(b.command, b.description, context);
    const existing = acc.get(key);
    if (existing) {
      // Stessa azione, firma alternativa: "F5 / Ctrl+G".
      if (!existing.signatures.includes(b.signature)) existing.signatures.push(b.signature);
      continue;
    }
    order.push(key);
    acc.set(key, {
      signatures: [b.signature],
      row: {
        keys: '',
        signatures: [],
        command: b.command,
        description: b.description,
        ...(context !== undefined ? { context } : {}),
      },
    });
  }

  return order.map((key) => {
    const entry = acc.get(key)!;
    return {
      ...entry.row,
      signatures: [...entry.signatures],
      keys: entry.signatures.map(formatSignatureForDisplay).join(' / '),
    };
  });
}

/**
 * Righe derivate dall'albero Alt. Un comando gia' raggiungibile con un accordo
 * non viene ripetuto: `Alt+=` e' gia' nella tabella, mostrarlo anche come
 * "Alt, =" confonderebbe e basta.
 */
function rowsFromAltTree(covered: ReadonlySet<Command>): CheatSheetRow[] {
  const rows: CheatSheetRow[] = [];
  for (const entry of flattenAltTree(EXCEL_ALT_TREE)) {
    if (covered.has(entry.command)) continue;
    rows.push({
      keys: entry.display,
      signatures: [],
      command: entry.command,
      description: entry.label,
      context: entry.trail,
    });
  }
  return rows;
}

/** Righe della sotto-keymap di Incolla speciale (attive solo a dialogo aperto). */
function rowsFromPasteSpecial(): CheatSheetRow[] {
  return PASTE_SPECIAL_OPTIONS.map((opt) => ({
    keys: `Ctrl+Alt+V, ${opt.key}`,
    signatures: [],
    command: opt.command,
    description: `Incolla speciale: ${opt.label.toLowerCase()}`,
    context: 'nel dialogo Incolla speciale',
  }));
}

/**
 * Costruisce il cheat sheet completo. Le sezioni vuote non vengono emesse,
 * cosi' l'overlay non mostra intestazioni orfane.
 */
export function buildCheatSheet(): CheatSheetSection[] {
  const rows: CheatSheetRow[] = [...rowsFromBindings()];
  const covered = new Set<Command>(BINDINGS.map((b) => b.command));
  rows.push(...rowsFromAltTree(covered), ...rowsFromPasteSpecial());

  // La categoria di una riga da accordo e' quella del suo binding; per le
  // sequenze Alt e per l'incolla speciale si deduce dal dominio del comando.
  const categoryOf = new Map<Command, BindingCategory>();
  for (const b of BINDINGS) if (!categoryOf.has(b.command)) categoryOf.set(b.command, b.category);

  const sections: CheatSheetSection[] = [];
  for (const category of CATEGORY_ORDER) {
    const inCategory = rows.filter(
      (r) => (categoryOf.get(r.command) ?? categoryForCommand(r.command)) === category,
    );
    if (inCategory.length === 0) continue;
    sections.push({ category, title: CATEGORY_TITLES[category], rows: inCategory });
  }
  return sections;
}

/** Il cheat sheet gia' costruito: la tabella e' statica, calcolarlo ogni volta e' sprecato. */
export const CHEAT_SHEET: readonly CheatSheetSection[] = buildCheatSheet();

/** Tutte le righe, senza raggruppamento (comodo per la ricerca e per i test). */
export function allCheatSheetRows(): CheatSheetRow[] {
  return CHEAT_SHEET.flatMap((s) => [...s.rows]);
}

/**
 * Filtro testuale dell'overlay: cerca nei tasti, nella descrizione e nel nome
 * del comando. Accento e maiuscole non contano — chi cerca "giu" deve trovare
 * "Giù" mentre ha una mano sola sulla tastiera.
 */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function searchCheatSheet(query: string): CheatSheetRow[] {
  const needle = fold(query.trim());
  if (needle === '') return allCheatSheetRows();
  return allCheatSheetRows().filter((r) =>
    fold(`${r.keys} ${r.description} ${r.command} ${r.context ?? ''}`).includes(needle),
  );
}

/** Le righe che eseguono un dato comando (usato dall'overlay tastiera del tutorial, §7). */
export function cheatSheetRowsForCommand(command: Command): CheatSheetRow[] {
  return allCheatSheetRows().filter((r) => r.command === command);
}
