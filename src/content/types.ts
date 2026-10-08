/**
 * Modello dati dei livelli (BUILD SPEC §4.1).
 *
 * Un `LevelTemplate` non contiene numeri: contiene la ricetta per generarli.
 * Da un template + un seed nasce una `LevelInstance`, che e' cio' che l'utente
 * gioca. Stesso seed => stessa istanza, sempre (criterio di accettazione §13).
 */

import type { CellStyle } from '../engine/types';
import type { SeededRandom } from '../rng/SeededRandom';

export type ModuleId =
  | 'M0-A' | 'M0-B' | 'M0-C' | 'M0-D' | 'M0-E' | 'M0-F'
  | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6'
  | 'M7' | 'M8' | 'M9' | 'M10' | 'M11' | 'M12';

/** Identificatore di skill del tree. Il registro vive in `skills.ts`. */
export type SkillId = string;

export type LevelMode = 'GUIDED' | 'PRACTICE' | 'BLIND' | 'SPEEDRUN' | 'AUDIT' | 'BOSS';

export type Rank = 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Check — le verifiche del grader
// ---------------------------------------------------------------------------

/**
 * Come si applica la tolleranza numerica.
 *  - `relative`: |a-b| <= tolerance * |expected|
 *  - `absolute`: |a-b| <= tolerance
 *  - `hybrid`  : relativa, ma con un pavimento assoluto per gli `expected` vicini a zero.
 *
 * Il default e' `hybrid` con tolleranza 0,001 (0,1%) e un pavimento assoluto
 * minimo (1e-6), che serve solo per gli attesi pari a zero. Il pavimento era 0,01:
 * su una percentuale (IRR, margine, WACC) voleva dire accettare qualunque risposta
 * entro un punto percentuale, cioe' risposte finanziariamente sbagliate. I task di
 * quadratura sovrascrivono con `absolute`.
 */
export type ToleranceMode = 'relative' | 'absolute' | 'hybrid';

export const DEFAULT_TOLERANCE = 0.001;
export const DEFAULT_ABSOLUTE_FLOOR = 1e-6;

interface CheckBase {
  /**
   * Messaggio didattico mostrato quando il check fallisce. Se omesso, il grader
   * ne genera uno dal tipo di check. §14: "il messaggio di errore e' il prodotto".
   */
  readonly message?: string;
}

export interface ValueCheck extends CheckBase {
  readonly kind: 'value';
  readonly expected: number;
  readonly tolerance?: number;
  readonly toleranceMode?: ToleranceMode;
  readonly absoluteFloor?: number;
}

export interface TextCheck extends CheckBase {
  readonly kind: 'text';
  readonly expected: string;
  readonly caseSensitive?: boolean;
  /** Ignora spazi iniziali/finali e spazi multipli. Default: true. */
  readonly trim?: boolean;
}

export interface BooleanCheck extends CheckBase {
  readonly kind: 'boolean';
  readonly expected: boolean;
}

/** Vieta l'hardcode: la cella deve contenere una formula, non un valore battuto a mano. */
export interface MustBeFormulaCheck extends CheckBase {
  readonly kind: 'mustBeFormula';
}

/** La formula deve puntare a queste celle (notazione A1, eventualmente qualificata). */
export interface MustReferenceCheck extends CheckBase {
  readonly kind: 'mustReference';
  readonly cells: readonly string[];
  /** Se true, un riferimento a un range che CONTIENE la cella soddisfa il check. Default: true. */
  readonly allowViaRange?: boolean;
}

/** Niente numeri magici dentro la formula. `except` elenca i literal ammessi (tipicamente 0, 1, 12, 365). */
export interface MustNotContainLiteralCheck extends CheckBase {
  readonly kind: 'mustNotContainLiteral';
  readonly except: readonly number[];
}

/**
 * Ancoraggi. `pattern` e' il riferimento nella forma richiesta, es. `"$B$5"`.
 * Il check verifica che quella cella sia referenziata CON quegli ancoraggi.
 */
export interface AnchoringCheck extends CheckBase {
  readonly kind: 'anchoring';
  readonly pattern: string;
}

/** Input blu, formule nere, link cross-sheet verdi. Attivo dal rank 3 in su. */
export interface ColorDisciplineCheck extends CheckBase {
  readonly kind: 'colorDiscipline';
}

/**
 * La stessa formula, correttamente traslata, su tutto il range.
 * E' il check che intercetta l'errore silenzioso piu' comune dei modelli veri:
 * una cella modificata a mano in mezzo a una riga.
 */
export interface ConsistentRowCheck extends CheckBase {
  readonly kind: 'consistentRow';
  readonly range: string;
}

export interface NoCircularCheck extends CheckBase {
  readonly kind: 'noCircular';
}

export interface RequiresCircularCheck extends CheckBase {
  readonly kind: 'requiresCircular';
}

/**
 * Estensione rispetto all'elenco di §4.1: serve al curriculum gia' scritto.
 * M0-C insegna "perche' non si usa VLOOKUP" — senza questo check quella lezione
 * non e' verificabile; M0-D e M11 hanno bisogno del duale.
 */
export interface MustUseFunctionCheck extends CheckBase {
  readonly kind: 'mustUseFunction';
  readonly functions: readonly string[];
  /** `all`: servono tutte. `any`: ne basta una. Default: `any`. */
  readonly quantifier?: 'all' | 'any';
}

export interface MustNotUseFunctionCheck extends CheckBase {
  readonly kind: 'mustNotUseFunction';
  readonly functions: readonly string[];
}

/** La cella non deve restituire un errore (#REF!, #DIV/0!, ...). */
export interface NoErrorCheck extends CheckBase {
  readonly kind: 'noError';
}

/** Il numero deve essere formattato secondo un formato Excel atteso. */
export interface NumberFormatCheck extends CheckBase {
  readonly kind: 'numberFormat';
  readonly expected: string;
}

export type Check =
  | ValueCheck
  | TextCheck
  | BooleanCheck
  | MustBeFormulaCheck
  | MustReferenceCheck
  | MustNotContainLiteralCheck
  | AnchoringCheck
  | ColorDisciplineCheck
  | ConsistentRowCheck
  | NoCircularCheck
  | RequiresCircularCheck
  | MustUseFunctionCheck
  | MustNotUseFunctionCheck
  | NoErrorCheck
  | NumberFormatCheck;

/** Le tre famiglie di §4.2. Il feedback al primo tentativo rivela solo questa. */
export type CheckFamily = 'numerico' | 'strutturale' | 'stilistico';

export function checkFamily(kind: Check['kind']): CheckFamily {
  switch (kind) {
    case 'value':
    case 'text':
    case 'boolean':
    case 'noError':
      return 'numerico';
    case 'colorDiscipline':
    case 'numberFormat':
      return 'stilistico';
    default:
      return 'strutturale';
  }
}

// ---------------------------------------------------------------------------
// Task e livelli
// ---------------------------------------------------------------------------

export interface Task {
  readonly id: string;
  readonly prompt: string;
  /** Cella o range bersaglio, qualificato col foglio: `"Model!D24"`. */
  readonly targetCell: string;
  readonly check: readonly Check[];
  /** Skill allenate da questo task, per le statistiche per-skill. */
  readonly skills?: readonly SkillId[];
  /** Keystroke minimi teorici per completarlo: alimenta la keystroke efficiency. */
  readonly minKeystrokes?: number;
}

export interface CellSpec {
  /** Notazione A1 relativa al foglio, senza prefisso. */
  readonly ref: string;
  readonly content: string | number | boolean | null;
  readonly style?: CellStyle;
  /** Se true la cella e' di sola lettura per il giocatore. */
  readonly locked?: boolean;
}

export interface SheetSpec {
  readonly name: string;
  readonly cells: readonly CellSpec[];
  readonly colWidths?: Readonly<Record<string, number>>;
  readonly frozenRows?: number;
  readonly frozenCols?: number;
  /** Se true tutte le celle non elencate in `cells` sono libere. Default: true. */
  readonly unlockedByDefault?: boolean;
}

export interface Hint {
  readonly id: string;
  readonly taskId?: string;
  readonly text: string;
  /** XP sottratti per averlo sbloccato. */
  readonly xpCost: number;
}

export interface ParScore {
  readonly seconds: number;
  readonly keystrokes: number;
}

export interface LevelInstance {
  readonly templateId: string;
  readonly seed: number;
  /** Il "mandato", in markdown. Generato da slot, mai da un LLM (§14). */
  readonly brief: string;
  readonly sheets: readonly SheetSpec[];
  readonly tasks: readonly Task[];
  readonly hints: readonly Hint[];
  readonly parScore: ParScore;
  /** Attiva il solver iterativo: obbligatorio sui livelli LBO con interessi circolari. */
  readonly iterativeCalculation?: boolean;
  /** Foglio e cella su cui posizionare il cursore all'avvio. */
  readonly startAt?: string;
}

export interface LevelTemplate {
  readonly id: string;
  readonly module: ModuleId;
  readonly title: string;
  readonly rank: Rank;
  readonly mode: LevelMode;
  readonly estimatedSeconds: number;
  readonly skills: readonly SkillId[];
  readonly prerequisites: readonly string[];
  /** Quanto sono sporchi i dati generati, 0..1 (§4.3). */
  readonly dirtiness?: number;
  /** Livello che ne combina altri: sono la parte importante del curriculum (§5). */
  readonly combo?: boolean;
  readonly generate: (rng: SeededRandom) => LevelInstance;
}
