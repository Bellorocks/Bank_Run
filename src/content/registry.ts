/**
 * Registro dei template (spec §11).
 *
 * Vincolo di progetto: "i template vivono in src/content/templates/** come moduli
 * TS separati, uno per file, esportati da un registry. Devono essere aggiungibili
 * senza toccare il motore."
 *
 * Per questo la scoperta e' automatica: `import.meta.glob` raccoglie ogni modulo
 * sotto templates/ e ne prende il default export. Aggiungere un livello =
 * aggiungere un file. Nessuna lista da mantenere a mano, nessun import da
 * ricordare, nessun merge conflict quando si scrivono 132 template in parallelo.
 */

import type { LevelInstance, LevelTemplate, ModuleId, SkillId } from './types';
import { SeededRandom } from '../rng/SeededRandom';

/**
 * `defineTemplate` vive in `authoring.ts`, non qui: i template lo importano, e
 * se lo importassero da questo modulo lo troverebbero non ancora inizializzato,
 * perche' il glob qui sotto gira al top level. Ri-esportato solo per comodita'
 * di chi legge il registry.
 */
export { defineTemplate } from './authoring';

type TemplateModule = { default?: unknown };

/**
 * Vite risolve questo glob a build time. In vitest funziona allo stesso modo
 * perche' i test girano attraverso la pipeline di Vite.
 *
 * Il pattern negativo per i `.test.ts` NON e' una rifinitura: senza, un file di
 * test lasciato sotto templates/ (anche solo per debug, anche cancellato un
 * minuto dopo se la build nel frattempo lo ha visto) viene importato EAGER da
 * Vite insieme a tutto il resto — e con lui `vitest`, che finisce nel bundle
 * del frontend. E' successo davvero: ha prodotto un "optimized dependencies
 * changed, reloading" e una schermata bianca nell'app Tauri. Il controllo
 * `path.endsWith('.test.ts')` piu' sotto arriva troppo tardi: gira DOPO che
 * Vite ha gia' risolto staticamente ogni file del glob, quindi non basta.
 */
const MODULES = import.meta.glob<TemplateModule>(
  ['./templates/**/*.ts', '!./templates/**/*.test.ts'],
  { eager: true },
);

function isLevelTemplate(v: unknown): v is LevelTemplate {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Partial<LevelTemplate>;
  return (
    typeof t.id === 'string' &&
    typeof t.module === 'string' &&
    typeof t.title === 'string' &&
    typeof t.rank === 'number' &&
    typeof t.mode === 'string' &&
    typeof t.generate === 'function'
  );
}

const byId = new Map<string, LevelTemplate>();
const sourcePath = new Map<string, string>();

for (const [path, mod] of Object.entries(MODULES)) {
  // I file di test sotto templates/ non sono template: ignorali senza rumore.
  if (path.endsWith('.test.ts') || path.endsWith('.d.ts')) continue;

  const candidate = mod?.default;
  if (!isLevelTemplate(candidate)) {
    throw new Error(
      `Template non valido in ${path}: il default export deve essere un LevelTemplate ` +
        `(usa defineTemplate({...}) da src/content/registry).`,
    );
  }
  const existing = sourcePath.get(candidate.id);
  if (existing) {
    throw new Error(`Id template duplicato "${candidate.id}": ${existing} e ${path}`);
  }
  byId.set(candidate.id, candidate);
  sourcePath.set(candidate.id, path);
}

export const TEMPLATES: readonly LevelTemplate[] = Object.freeze([...byId.values()]);

export function getTemplate(id: string): LevelTemplate | undefined {
  return byId.get(id);
}

export function requireTemplate(id: string): LevelTemplate {
  const t = byId.get(id);
  if (!t) throw new Error(`Template sconosciuto: "${id}"`);
  return t;
}

export function templatesOfModule(module: ModuleId): LevelTemplate[] {
  return TEMPLATES.filter((t) => t.module === module);
}

export function templatesForSkill(skill: SkillId): LevelTemplate[] {
  return TEMPLATES.filter((t) => t.skills.includes(skill));
}

export function templatePath(id: string): string | undefined {
  return sourcePath.get(id);
}

// ---------------------------------------------------------------------------
// Istanziazione
// ---------------------------------------------------------------------------

/**
 * Genera l'istanza giocabile. Il seed e' l'unica sorgente di variabilita':
 * stesso template + stesso seed => stessa istanza, byte per byte (§13).
 *
 * L'istanza restituita viene validata: un template che dichiara un `targetCell`
 * su un foglio inesistente deve rompersi qui, in fase di sviluppo, non davanti
 * all'utente a meta' livello.
 */
export function instantiate(templateId: string, seed: number): LevelInstance {
  const template = requireTemplate(templateId);
  const rng = new SeededRandom(seed);
  const instance = template.generate(rng);

  const problems = validateInstance(template, instance);
  if (problems.length > 0) {
    throw new Error(
      `Istanza non valida per ${templateId} (seed ${seed}):\n  - ${problems.join('\n  - ')}`,
    );
  }
  return instance;
}

/** Controlli di coerenza fra template e istanza generata. */
export function validateInstance(template: LevelTemplate, instance: LevelInstance): string[] {
  const problems: string[] = [];

  if (instance.templateId !== template.id) {
    problems.push(`templateId dell'istanza ("${instance.templateId}") diverso da "${template.id}"`);
  }
  if (instance.sheets.length === 0) problems.push('nessun foglio');
  if (instance.tasks.length === 0) problems.push('nessun task');

  const sheetNames = new Set(instance.sheets.map((s) => s.name));
  if (sheetNames.size !== instance.sheets.length) problems.push('nomi foglio duplicati');

  const taskIds = new Set<string>();
  for (const task of instance.tasks) {
    if (taskIds.has(task.id)) problems.push(`task id duplicato: "${task.id}"`);
    taskIds.add(task.id);

    if (task.check.length === 0) problems.push(`task "${task.id}" senza alcun check`);

    const bang = task.targetCell.indexOf('!');
    if (bang < 0) {
      problems.push(`task "${task.id}": targetCell "${task.targetCell}" non e' qualificato col foglio`);
    } else {
      const sheet = unquote(task.targetCell.slice(0, bang));
      if (!sheetNames.has(sheet)) {
        problems.push(`task "${task.id}": foglio "${sheet}" inesistente nell'istanza`);
      }
    }
  }

  for (const hint of instance.hints) {
    if (hint.taskId && !taskIds.has(hint.taskId)) {
      problems.push(`hint "${hint.id}" punta al task inesistente "${hint.taskId}"`);
    }
    if (hint.xpCost < 0) problems.push(`hint "${hint.id}" con costo XP negativo`);
  }

  if (instance.parScore.seconds <= 0) problems.push('parScore.seconds deve essere positivo');
  if (instance.parScore.keystrokes <= 0) problems.push('parScore.keystrokes deve essere positivo');

  return problems;
}

function unquote(s: string): string {
  return s.startsWith("'") && s.endsWith("'") ? s.slice(1, -1).replace(/''/g, "'") : s;
}

// ---------------------------------------------------------------------------
// Prerequisiti e sblocco
// ---------------------------------------------------------------------------

/**
 * Integrita' del registro: prerequisiti esistenti e grafo aciclico.
 * Un ciclo nei prerequisiti renderebbe due livelli mutuamente inaccessibili;
 * meglio scoprirlo in un test che in produzione.
 */
export function validateRegistry(): string[] {
  const problems: string[] = [];

  for (const t of TEMPLATES) {
    for (const p of t.prerequisites) {
      if (!byId.has(p)) problems.push(`${t.id}: prerequisito inesistente "${p}"`);
    }
    if (t.rank < 1 || t.rank > 5) problems.push(`${t.id}: rank fuori scala (${t.rank})`);
    if (t.estimatedSeconds <= 0) problems.push(`${t.id}: estimatedSeconds non positivo`);
    if (t.skills.length === 0) problems.push(`${t.id}: nessuna skill dichiarata`);
  }

  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const color = new Map<string, number>([...byId.keys()].map((id) => [id, WHITE]));

  const visit = (id: string, path: string[]): void => {
    const c = color.get(id);
    if (c === BLACK) return;
    if (c === GREY) {
      problems.push(`ciclo nei prerequisiti: ${[...path, id].join(' -> ')}`);
      return;
    }
    color.set(id, GREY);
    for (const p of byId.get(id)?.prerequisites ?? []) {
      if (byId.has(p)) visit(p, [...path, id]);
    }
    color.set(id, BLACK);
  };

  for (const id of byId.keys()) visit(id, []);
  return problems;
}

/** Un livello e' sbloccato se tutti i suoi prerequisiti sono stati completati. */
export function isUnlocked(templateId: string, completed: ReadonlySet<string>): boolean {
  const t = byId.get(templateId);
  if (!t) return false;
  return t.prerequisites.every((p) => completed.has(p));
}

export function unlockedTemplates(completed: ReadonlySet<string>): LevelTemplate[] {
  return TEMPLATES.filter((t) => isUnlocked(t.id, completed));
}
