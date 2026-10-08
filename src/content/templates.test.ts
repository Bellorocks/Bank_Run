/**
 * Prova end-to-end della pipeline dei contenuti:
 *   template -> seed -> istanza -> Workbook -> soluzione -> grader.
 *
 * E' il test che deve esistere PRIMA di scrivere centotrenta template: se il
 * contratto fra generazione e grader non regge su due livelli, non regge su
 * centotrenta, e ce ne accorgeremmo con il curriculum gia' scritto.
 */

import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate, instantiate, validateRegistry } from './registry';
import { SKILLS_BY_ID } from './skills';
import { loadInstance, applySolution, fillFrom } from '../game/loadLevel';
import { shiftFormula } from '../engine/formula/refs';
import { gradeLevel } from '../grader/grade';
import { MODEL_COLORS } from '../styles/palette';

const SEEDS = [1, 42, 1337, 20260812];

describe('registro dei template', () => {
  it('e\' coerente: prerequisiti esistenti, nessun ciclo, campi obbligatori', () => {
    expect(validateRegistry()).toEqual([]);
  });

  it('dichiara solo skill che esistono nel tree', () => {
    for (const t of TEMPLATES) {
      for (const s of t.skills) {
        expect(SKILLS_BY_ID.has(s), `${t.id} dichiara la skill inesistente "${s}"`).toBe(true);
      }
    }
  });

  it('ha almeno un template caricato', () => {
    // Se il glob del registry si rompe, questo test e' l'unico che se ne accorge.
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });
});

describe('determinismo: stesso seed, stesso livello', () => {
  it('produce istanze identiche a parita\' di seed', () => {
    for (const t of TEMPLATES) {
      for (const seed of SEEDS) {
        const a = instantiate(t.id, seed);
        const b = instantiate(t.id, seed);
        expect(JSON.stringify(a), `${t.id} non e' deterministico sul seed ${seed}`).toBe(
          JSON.stringify(b),
        );
      }
    }
  });

  it('produce istanze diverse a seed diversi', () => {
    for (const t of TEMPLATES) {
      const a = JSON.stringify(instantiate(t.id, 1));
      const b = JSON.stringify(instantiate(t.id, 999));
      expect(a, `${t.id} ignora il seed`).not.toBe(b);
    }
  });
});

describe('ogni template genera un livello caricabile e risolvibile', () => {
  it('si carica in un Workbook senza errori, su piu\' seed', () => {
    for (const t of TEMPLATES) {
      for (const seed of SEEDS) {
        const { workbook, start } = loadInstance(instantiate(t.id, seed));
        expect(workbook.sheetNames().length, `${t.id}`).toBeGreaterThan(0);
        expect(start.row).toBeGreaterThanOrEqual(0);
        // Il caricamento non deve lasciare niente da annullare.
        expect(workbook.canUndo(), `${t.id}: il setup e' finito nell'undo stack`).toBe(false);
        workbook.destroy();
      }
    }
  });

  it('un livello appena caricato non passa il grader', () => {
    // Se passasse, vorrebbe dire che i task non chiedono niente.
    for (const t of TEMPLATES) {
      const { workbook, instance } = loadInstance(instantiate(t.id, 7));
      const report = gradeLevel(workbook, instance);
      expect(report.passed, `${t.id} passa senza che l'utente faccia nulla`).toBe(false);
      workbook.destroy();
    }
  });

  it('le celle di lavoro sono sbloccate e quelle di partenza no', () => {
    for (const t of TEMPLATES) {
      const { workbook, instance } = loadInstance(instantiate(t.id, 7));
      for (const task of instance.tasks) {
        const bang = task.targetCell.lastIndexOf('!');
        const sheetId = workbook.sheetId(task.targetCell.slice(0, bang));
        const cellPart = task.targetCell.slice(bang + 1).split(':')[0];
        const m = /^([A-Z]+)([0-9]+)$/.exec(cellPart)!;
        const col = m[1].split('').reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
        const row = Number(m[2]) - 1;
        expect(
          workbook.isLocked(sheetId, { row, col }),
          `${t.id}: la cella bersaglio ${task.targetCell} e' bloccata`,
        ).toBe(false);
      }
      workbook.destroy();
    }
  });
});

// ---------------------------------------------------------------------------
// Soluzioni vere: il test che dimostra che i livelli sono giocabili
// ---------------------------------------------------------------------------

describe('M0A-01-RIFERIMENTI', () => {
  const ID = 'M0A-01-RIFERIMENTI';

  it('esiste', () => {
    expect(getTemplate(ID)).toBeDefined();
  });

  it('la soluzione corretta passa tutti i task', () => {
    for (const seed of SEEDS) {
      const { workbook, instance } = loadInstance(instantiate(ID, seed));
      applySolution(workbook, {
        'Model!B4': '=B2-B3',
        'Model!B6': 'B2',
        'Model!B8': '=B4+B7',
      });
      const report = gradeLevel(workbook, instance, { attempt: 2 });
      const falliti = report.tasks.filter((t) => !t.passed);
      expect(
        falliti.map((t) => `${t.taskId}: ${t.checks.filter((c) => !c.passed).map((c) => c.detail ?? c.message).join('; ')}`),
        `seed ${seed}`,
      ).toEqual([]);
      expect(report.passed).toBe(true);
      workbook.destroy();
    }
  });

  it('l\'hardcode con il numero giusto viene bocciato', () => {
    const { workbook, instance } = loadInstance(instantiate(ID, 42));
    // Prima risolvo bene, leggo il numero, poi lo ribatto a mano.
    applySolution(workbook, { 'Model!B4': '=B2-B3' });
    const giusto = workbook.getValue(workbook.sheetId('Model'), { row: 3, col: 1 }) as number;
    applySolution(workbook, { 'Model!B4': giusto, 'Model!B6': 'B2', 'Model!B8': '=B4+B7' });

    const report = gradeLevel(workbook, instance, { attempt: 2 });
    expect(report.passed).toBe(false);
    const t1 = report.tasks.find((t) => t.taskId === 'T1')!;
    expect(t1.checks.find((c) => c.kind === 'value')!.passed).toBe(true);
    expect(t1.checks.find((c) => c.kind === 'mustBeFormula')!.passed).toBe(false);
    expect(t1.failedFamilies).toEqual(['strutturale']);
    workbook.destroy();
  });

  it('risommare da capo invece di riusare il margine viene bocciato', () => {
    const { workbook, instance } = loadInstance(instantiate(ID, 42));
    applySolution(workbook, {
      'Model!B4': '=B2-B3',
      'Model!B6': 'B2',
      'Model!B8': '=B2-B3+B7', // numero giusto, ma non riusa il lavoro fatto
    });
    const report = gradeLevel(workbook, instance, { attempt: 2 });
    const t3 = report.tasks.find((t) => t.taskId === 'T3')!;
    expect(t3.checks.find((c) => c.kind === 'value')!.passed).toBe(true);
    expect(t3.checks.find((c) => c.kind === 'mustReference')!.passed).toBe(false);
    workbook.destroy();
  });
});

describe('M0A-05-ANCORAGGI', () => {
  const ID = 'M0A-05-ANCORAGGI';
  const CORRETTA = '=$C$2*$B7*C$6';

  it('la formula con i tre ancoraggi giusti riempie tutta la tabella', () => {
    for (const seed of SEEDS) {
      const { workbook, instance } = loadInstance(instantiate(ID, seed));
      applySolution(workbook, { 'Model!C7': CORRETTA });
      fillFrom(workbook, 'Model', 'C7', { rows: 3, cols: 4 }, shiftFormula);
      applySolution(workbook, { 'Model!C11': '=SUM(C9:F9)' });

      const report = gradeLevel(workbook, instance, { attempt: 2 });
      const falliti = report.tasks.filter((t) => !t.passed);
      expect(
        falliti.map((t) => `${t.taskId}: ${t.checks.filter((c) => !c.passed).map((c) => c.detail ?? c.message).join('; ')}`),
        `seed ${seed}`,
      ).toEqual([]);
      workbook.destroy();
    }
  });

  it('senza ancoraggi la tabella resta COERENTE ma i numeri sono falsi', () => {
    const { workbook, instance } = loadInstance(instantiate(ID, 42));
    applySolution(workbook, { 'Model!C7': '=C2*B7*C6' }); // nessun $
    fillFrom(workbook, 'Model', 'C7', { rows: 3, cols: 4 }, shiftFormula);
    applySolution(workbook, { 'Model!C11': '=SUM(C9:F9)' });

    const report = gradeLevel(workbook, instance, { attempt: 2 });
    expect(report.passed).toBe(false);

    // Questa e' la distinzione che il grader deve saper fare, ed e' anche la
    // ragione per cui servono TRE famiglie di verifica e non una: la tabella e'
    // strutturalmente impeccabile — ogni cella e' la stessa formula traslata —
    // e produce numeri completamente sbagliati. Un grader che guardasse solo la
    // struttura la promuoverebbe; uno che guardasse solo il valore della prima
    // cella pure, perche' C7 e' giusta per costruzione.
    const t2 = report.tasks.find((t) => t.taskId === 'T2')!;
    expect(t2.checks.find((c) => c.kind === 'consistentRow')!.passed).toBe(true);

    const t3 = report.tasks.find((t) => t.taskId === 'T3')!;
    expect(t3.passed).toBe(false);
    expect(t3.checks.find((c) => c.kind === 'value')!.message).toContain('angolo in basso a destra');
    workbook.destroy();
  });

  it('riempire a mano una cella in mezzo rompe la coerenza di riga', () => {
    const { workbook, instance } = loadInstance(instantiate(ID, 42));
    applySolution(workbook, { 'Model!C7': CORRETTA });
    fillFrom(workbook, 'Model', 'C7', { rows: 3, cols: 4 }, shiftFormula);

    const sheetId = workbook.sheetId('Model');
    const valoreGiusto = workbook.getValue(sheetId, { row: 7, col: 3 }) as number;
    // Stesso numero, battuto a mano: invisibile a occhio, letale in un modello.
    applySolution(workbook, { 'Model!D9': valoreGiusto, 'Model!C11': '=SUM(C9:F9)' });

    const report = gradeLevel(workbook, instance, { attempt: 2 });
    const t2 = report.tasks.find((t) => t.taskId === 'T2')!;
    const coerenza = t2.checks.find((c) => c.kind === 'consistentRow')!;
    expect(coerenza.passed).toBe(false);
    expect(coerenza.detail).toContain('D9');
    workbook.destroy();
  });
});

describe('disciplina dei colori sui livelli generati', () => {
  it('gli input generati dal template sono gia\' blu', () => {
    // I template insegnano la convenzione mostrandola, non solo enunciandola.
    const { workbook } = loadInstance(instantiate('M0A-01-RIFERIMENTI', 1));
    const sheetId = workbook.sheetId('Model');
    expect(workbook.getStyle(sheetId, { row: 1, col: 1 }).fontColor).toBe(MODEL_COLORS.input);
    expect(workbook.getStyle(sheetId, { row: 2, col: 1 }).fontColor).toBe(MODEL_COLORS.input);
    workbook.destroy();
  });
});
