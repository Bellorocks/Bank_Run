/**
 * I messaggi del grader.
 *
 * Sono il prodotto (spec §14). "Task 4 sbagliato" non insegna niente;
 * "hai hardcodato il multiplo — deve referenziare la cella delle assumption"
 * insegna. Vivono in un file separato perche' vanno riletti e curati come testo,
 * non sepolti dentro la logica.
 *
 * Regola d'oro di §4.2: al primo tentativo il grader dice COSA hai sbagliato e
 * di che famiglia e' l'errore, ma non DOVE. Il dettaglio (quale cella, quale
 * riferimento manca, quale valore hai prodotto) e' in `detail` e si sblocca dal
 * secondo tentativo. Il debug e' l'esercizio.
 */

import type { CheckFamily } from '../content/types';

import { tr } from '../i18n/ui';
export const FAMILY_LABEL: Record<CheckFamily, string> = {
  numerico: tr('messages.famNumerico'),
  strutturale: tr('messages.famStrutturale'),
  stilistico: tr('messages.famStilistico'),
};

export const MESSAGES = {
  value: tr('messages.1'),
  valueClose:
    tr('messages.2'),
  valueSignFlipped:
    tr('messages.3'),
  text: tr('messages.4'),
  boolean: tr('messages.5'),

  mustBeFormula:
    tr('messages.6'),
  mustReference:
    tr('messages.7'),
  mustNotContainLiteral:
    tr('messages.8'),
  anchoring:
    tr('messages.9'),
  consistentRow:
    tr('messages.10'),
  noCircular:
    tr('messages.11'),
  requiresCircular:
    tr('messages.12'),
  mustUseFunction: tr('messages.13'),
  mustNotUseFunction:
    tr('messages.14'),
  noError: tr('messages.15'),
  colorDiscipline:
    tr('messages.16'),
  numberFormat: tr('messages.17'),

  emptyCell: tr('messages.18'),
  lockedCell: tr('messages.19'),
} as const;

/** Sintesi mostrata al primo tentativo: dice quale task e di che famiglia, non dove. */
export function firstAttemptSummary(failing: { taskId: string; families: CheckFamily[] }[]): string {
  if (failing.length === 0) return tr('messages.20');
  const parti = failing.map((f) => {
    const fam = f.families.map((x) => FAMILY_LABEL[x]).join(' + ');
    return `${f.taskId} (${fam})`;
  });
  return failing.length === 1
    ? tr('messages.21', { p0: parti[0] })
    : tr('messages.22', { p0: failing.length, p1: parti.join(', ') });
}

export function passedSummary(tasks: number, seconds: number, par: number): string {
  if (seconds <= par) {
    return tr('messages.23', { tasks });
  }
  const scarto = Math.round(((seconds - par) / par) * 100);
  return tr('messages.24', { tasks, scarto });
}
