import { describe, it, expect } from 'vitest';
import { Workbook } from '../engine/workbook';
import { detectCycleCells } from '../engine/iterative';
import { MODEL_COLORS } from '../styles/palette';
import { gradeTask, gradeLevel, type GradeOptions } from './grade';
import type { Check, LevelInstance, Task } from '../content/types';

/**
 * Foglio di prova: una piccola normalizzazione EBITDA.
 *   A          B           C           D
 * 1 Voce       2023        2024        2025
 * 2 Ricavi     12.500.000  13.900.000  15.100.000
 * 3 Costi      -9.800.000  -10.700.000 -11.500.000
 * 4 EBITDA     (da fare)
 * 5 Margine    (da fare)
 * 7 Multiplo   8,5   <- assumption
 */
function foglioBase(): Workbook {
  return Workbook.create([
    {
      name: 'Model',
      data: [
        ['Voce', 2023, 2024, 2025],
        ['Ricavi', 12500000, 13900000, 15100000],
        ['Costi', -9800000, -10700000, -11500000],
        ['EBITDA', null, null, null],
        ['Margine', null, null, null],
        [null, null, null, null],
        ['Multiplo', 8.5, null, null],
      ],
    },
  ]);
}

function task(id: string, targetCell: string, check: Check[]): Task {
  return { id, prompt: '', targetCell, check };
}

const B4 = { row: 3, col: 1 };

function scrivi(wb: Workbook, coord: { row: number; col: number }, raw: string | number | null) {
  wb.setContents(0, coord, raw);
}

describe('regola d\'oro: un numero giusto hardcodato e\' un livello fallito', () => {
  it('boccia l\'hardcode anche quando il valore e\' esatto', () => {
    const wb = foglioBase();
    scrivi(wb, B4, 2700000); // il numero giusto, battuto a mano

    const r = gradeTask(
      wb,
      task('t1', 'Model!B4', [
        { kind: 'value', expected: 2700000 },
        { kind: 'mustBeFormula' },
      ]),
      { attempt: 2 },
    );

    expect(r.passed).toBe(false);
    const numerico = r.checks.find((c) => c.kind === 'value')!;
    const strutturale = r.checks.find((c) => c.kind === 'mustBeFormula')!;
    expect(numerico.passed).toBe(true); // il numero e' giusto...
    expect(strutturale.passed).toBe(false); // ...ma il task e' fallito lo stesso
    expect(strutturale.message).toContain('hardcodato');
    expect(r.failedFamilies).toEqual(['strutturale']);
    wb.destroy();
  });

  it('promuove la stessa cella se e\' una formula', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=B2+B3');
    const r = gradeTask(
      wb,
      task('t1', 'Model!B4', [{ kind: 'value', expected: 2700000 }, { kind: 'mustBeFormula' }]),
    );
    expect(r.passed).toBe(true);
    expect(r.userFormula).toBe('=B2+B3');
    wb.destroy();
  });
});

describe('check numerico', () => {
  it('applica la tolleranza relativa di default (0,1%)', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=2700000*1.0005'); // +0,05%: dentro
    expect(gradeTask(wb, task('t', 'Model!B4', [{ kind: 'value', expected: 2700000 }])).passed).toBe(true);

    scrivi(wb, B4, '=2700000*1.005'); // +0,5%: fuori
    expect(gradeTask(wb, task('t', 'Model!B4', [{ kind: 'value', expected: 2700000 }])).passed).toBe(false);
    wb.destroy();
  });

  it('usa il pavimento assoluto quando l\'atteso e\' vicino a zero', () => {
    const wb = foglioBase();
    // Con atteso 0 la tolleranza relativa sarebbe 0: senza pavimento nessun
    // balance check passerebbe mai per un errore di virgola mobile.
    scrivi(wb, B4, '=0.001');
    expect(gradeTask(wb, task('t', 'Model!B4', [{ kind: 'value', expected: 0 }])).passed).toBe(true);
    scrivi(wb, B4, '=5');
    expect(gradeTask(wb, task('t', 'Model!B4', [{ kind: 'value', expected: 0 }])).passed).toBe(false);
    wb.destroy();
  });

  it('la tolleranza assoluta stretta serve ai task di quadratura', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=0.5');
    const check: Check = { kind: 'value', expected: 0, tolerance: 0.01, toleranceMode: 'absolute' };
    expect(gradeTask(wb, task('t', 'Model!B4', [check])).passed).toBe(false);
    wb.destroy();
  });

  it('riconosce il segno invertito e lo dice', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=-2700000');
    const r = gradeTask(wb, task('t', 'Model!B4', [{ kind: 'value', expected: 2700000 }]), { attempt: 2 });
    expect(r.passed).toBe(false);
    expect(r.checks[0].message).toContain('segno invertito');
    wb.destroy();
  });

  it('boccia una cella in errore con il codice di errore nel messaggio', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=1/0');
    const r = gradeTask(wb, task('t', 'Model!B4', [{ kind: 'value', expected: 1 }]), { attempt: 2 });
    expect(r.passed).toBe(false);
    expect(r.checks[0].message).toContain('#DIV/0!');
    wb.destroy();
  });
});

describe('check strutturali', () => {
  it('mustReference: il numero giusto per la strada sbagliata non passa', () => {
    const wb = foglioBase();
    // Somma i valori a mano invece di referenziare le celle: il totale coincide.
    scrivi(wb, B4, '=12500000-9800000');
    const r = gradeTask(
      wb,
      task('t', 'Model!B4', [
        { kind: 'value', expected: 2700000 },
        { kind: 'mustReference', cells: ['B2', 'B3'] },
      ]),
      { attempt: 2 },
    );
    expect(r.checks.find((c) => c.kind === 'value')!.passed).toBe(true);
    expect(r.checks.find((c) => c.kind === 'mustReference')!.passed).toBe(false);
    expect(r.checks.find((c) => c.kind === 'mustReference')!.detail).toContain('B2');
    wb.destroy();
  });

  it('mustReference accetta un range che contiene la cella, se permesso', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=SUM(B2:B3)');
    const conRange: Check = { kind: 'mustReference', cells: ['B2', 'B3'] };
    expect(gradeTask(wb, task('t', 'Model!B4', [conRange])).passed).toBe(true);

    const senzaRange: Check = { kind: 'mustReference', cells: ['B2', 'B3'], allowViaRange: false };
    expect(gradeTask(wb, task('t', 'Model!B4', [senzaRange])).passed).toBe(false);
    wb.destroy();
  });

  it('mustNotContainLiteral: intercetta il multiplo sepolto nella formula', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=B2*8.5'); // il multiplo hardcodato invece di B7
    const r = gradeTask(
      wb,
      task('t', 'Model!B4', [{ kind: 'mustNotContainLiteral', except: [0, 1] }]),
      { attempt: 2 },
    );
    expect(r.passed).toBe(false);
    expect(r.checks[0].detail).toContain('8,5');

    scrivi(wb, B4, '=B2*B7');
    expect(
      gradeTask(wb, task('t', 'Model!B4', [{ kind: 'mustNotContainLiteral', except: [0, 1] }])).passed,
    ).toBe(true);
    wb.destroy();
  });

  it('mustNotContainLiteral distingue -1 da 1', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=B3*-1');
    // `except: [1]` ammette il literal 1, non il -1 di un cambio di segno a mano.
    expect(
      gradeTask(wb, task('t', 'Model!B4', [{ kind: 'mustNotContainLiteral', except: [1] }])).passed,
    ).toBe(false);
    expect(
      gradeTask(wb, task('t', 'Model!B4', [{ kind: 'mustNotContainLiteral', except: [1, -1] }])).passed,
    ).toBe(true);
    wb.destroy();
  });

  it('anchoring: esige il $ dove serve per poter copiare', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=B2*B7'); // senza ancoraggio: copiando a destra B7 diventa C7
    const r = gradeTask(wb, task('t', 'Model!B4', [{ kind: 'anchoring', pattern: '$B$7' }]), {
      attempt: 2,
    });
    expect(r.passed).toBe(false);
    expect(r.checks[0].detail).toContain('$B$7');

    scrivi(wb, B4, '=B2*$B$7');
    expect(gradeTask(wb, task('t', 'Model!B4', [{ kind: 'anchoring', pattern: '$B$7' }])).passed).toBe(true);
    wb.destroy();
  });

  it('anchoring segnala la mancanza del riferimento, non l\'ancoraggio, se la cella non e\' citata', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=B2*2');
    const r = gradeTask(wb, task('t', 'Model!B4', [{ kind: 'anchoring', pattern: '$B$7' }]), { attempt: 2 });
    expect(r.passed).toBe(false);
    expect(r.checks[0].message).toContain('non pesca dalle celle giuste');
    wb.destroy();
  });

  it('mustNotUseFunction: vieta VLOOKUP dove il livello insegna INDEX/MATCH', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=VLOOKUP(A2,A1:D3,2,FALSE)');
    const r = gradeTask(
      wb,
      task('t', 'Model!B4', [{ kind: 'mustNotUseFunction', functions: ['VLOOKUP'] }]),
      { attempt: 2 },
    );
    expect(r.passed).toBe(false);
    expect(r.checks[0].message).toContain('VLOOKUP');

    scrivi(wb, B4, '=INDEX(B1:D1,MATCH(2024,B1:D1,0))');
    expect(
      gradeTask(wb, task('t', 'Model!B4', [
        { kind: 'mustNotUseFunction', functions: ['VLOOKUP'] },
        { kind: 'mustUseFunction', functions: ['INDEX', 'MATCH'], quantifier: 'all' },
      ])).passed,
    ).toBe(true);
    wb.destroy();
  });
});

describe('consistentRow — l\'errore silenzioso piu\' comune dei modelli veri', () => {
  it('passa se tutta la riga e\' la stessa formula traslata', () => {
    const wb = foglioBase();
    scrivi(wb, { row: 3, col: 1 }, '=B2+B3');
    scrivi(wb, { row: 3, col: 2 }, '=C2+C3');
    scrivi(wb, { row: 3, col: 3 }, '=D2+D3');
    expect(
      gradeTask(wb, task('t', 'Model!B4', [{ kind: 'consistentRow', range: 'Model!B4:D4' }])).passed,
    ).toBe(true);
    wb.destroy();
  });

  it('boccia una cella hardcodata in mezzo alla riga', () => {
    const wb = foglioBase();
    scrivi(wb, { row: 3, col: 1 }, '=B2+B3');
    scrivi(wb, { row: 3, col: 2 }, 3200000); // battuta a mano: il totale e' pure giusto
    scrivi(wb, { row: 3, col: 3 }, '=D2+D3');
    const r = gradeTask(
      wb,
      task('t', 'Model!B4', [{ kind: 'consistentRow', range: 'Model!B4:D4' }]),
      { attempt: 2 },
    );
    expect(r.passed).toBe(false);
    expect(r.checks[0].detail).toContain('C4');
    wb.destroy();
  });

  it('boccia una formula diversa in mezzo alla riga', () => {
    const wb = foglioBase();
    scrivi(wb, { row: 3, col: 1 }, '=B2+B3');
    scrivi(wb, { row: 3, col: 2 }, '=C2-C3*-1'); // stesso risultato, struttura diversa
    scrivi(wb, { row: 3, col: 3 }, '=D2+D3');
    const r = gradeTask(
      wb,
      task('t', 'Model!B4', [{ kind: 'consistentRow', range: 'Model!B4:D4' }]),
      { attempt: 2 },
    );
    expect(r.passed).toBe(false);
    expect(r.checks[0].detail).toContain('C4');
    wb.destroy();
  });

  it('tollera gli ancoraggi: una riga con $ resta coerente', () => {
    const wb = foglioBase();
    scrivi(wb, { row: 3, col: 1 }, '=B2*$B$7');
    scrivi(wb, { row: 3, col: 2 }, '=C2*$B$7');
    scrivi(wb, { row: 3, col: 3 }, '=D2*$B$7');
    expect(
      gradeTask(wb, task('t', 'Model!B4', [{ kind: 'consistentRow', range: 'Model!B4:D4' }])).passed,
    ).toBe(true);
    wb.destroy();
  });
});

describe('check stilistici', () => {
  const CHECK: Check[] = [{ kind: 'colorDiscipline' }];

  it('non girano affatto sotto il rank 3', () => {
    const wb = foglioBase();
    scrivi(wb, B4, 2700000); // input senza colore: sarebbe una violazione
    const r = gradeTask(wb, task('t', 'Model!B4', CHECK), { enforceStyle: false });
    expect(r.checks).toHaveLength(0);
    expect(r.passed).toBe(true);
    wb.destroy();
  });

  it('esige il blu sugli input battuti a mano', () => {
    const wb = foglioBase();
    scrivi(wb, B4, 2700000);
    expect(gradeTask(wb, task('t', 'Model!B4', CHECK), { enforceStyle: true }).passed).toBe(false);

    wb.setStyle(0, B4, { fontColor: MODEL_COLORS.input });
    expect(gradeTask(wb, task('t', 'Model!B4', CHECK), { enforceStyle: true }).passed).toBe(true);
    wb.destroy();
  });

  it('esige il nero sulle formule e il verde sui link cross-sheet', () => {
    const wb = Workbook.create([
      { name: 'Model', data: [['Ricavi', 100], ['EBITDA', null]] },
      { name: 'Assunzioni', data: [['Multiplo', 8.5]] },
    ]);
    const cella = { row: 1, col: 1 };

    wb.setContents(0, cella, '=B1*2');
    expect(gradeTask(wb, task('t', 'Model!B2', CHECK), { enforceStyle: true }).passed).toBe(true);

    // Diventa un link a un altro foglio: ora il nero non basta piu'.
    wb.setContents(0, cella, '=B1*Assunzioni!B1');
    const r = gradeTask(wb, task('t', 'Model!B2', CHECK), { enforceStyle: true, attempt: 2 });
    expect(r.passed).toBe(false);
    expect(r.checks[0].detail).toContain('verde');

    wb.setStyle(0, cella, { fontColor: MODEL_COLORS.crossSheet });
    expect(gradeTask(wb, task('t', 'Model!B2', CHECK), { enforceStyle: true }).passed).toBe(true);
    wb.destroy();
  });

  it('numberFormat usa il comparatore iniettato', () => {
    const wb = foglioBase();
    scrivi(wb, B4, '=B2+B3');
    wb.setStyle(0, B4, { numFmt: '#,##0' });
    const check: Check[] = [{ kind: 'numberFormat', expected: '#,##0;(#,##0)' }];

    expect(gradeTask(wb, task('t', 'Model!B4', check), { enforceStyle: true }).passed).toBe(false);

    const permissivo: GradeOptions = { enforceStyle: true, formatComparator: () => true };
    expect(gradeTask(wb, task('t', 'Model!B4', check), permissivo).passed).toBe(true);
    wb.destroy();
  });
});

describe('riferimenti circolari', () => {
  it('noCircular boccia un anello indesiderato', () => {
    const wb = Workbook.create([{ name: 'Model', data: [[null], [null]] }]);
    wb.setContents(0, { row: 0, col: 0 }, '=A2+1');
    wb.setContents(0, { row: 1, col: 0 }, '=A1*2');
    const cycle = new Set(detectCycleCells(wb.engine));
    const r = gradeTask(wb, task('t', 'Model!A1', [{ kind: 'noCircular' }]), {
      cycleCells: cycle,
      attempt: 2,
    });
    expect(r.passed).toBe(false);
    expect(r.checks[0].message).toContain('circolare');
    wb.destroy();
  });

  it('requiresCircular esige l\'anello dove il debt schedule lo vuole', () => {
    const wb = Workbook.create([{ name: 'Model', data: [[null], [null]] }]);
    wb.setContents(0, { row: 0, col: 0 }, '=100'); // nessun anello: sbagliato qui
    let cycle = new Set(detectCycleCells(wb.engine));
    expect(gradeTask(wb, task('t', 'Model!A1', [{ kind: 'requiresCircular' }]), { cycleCells: cycle }).passed).toBe(
      false,
    );

    wb.setContents(0, { row: 0, col: 0 }, '=A2*0.5+10');
    wb.setContents(0, { row: 1, col: 0 }, '=A1+5');
    cycle = new Set(detectCycleCells(wb.engine));
    expect(gradeTask(wb, task('t', 'Model!A1', [{ kind: 'requiresCircular' }]), { cycleCells: cycle }).passed).toBe(
      true,
    );
    wb.destroy();
  });
});

describe('regola d\'oro del feedback: cosa, non dove', () => {
  const T = task('t', 'Model!B4', [
    { kind: 'value', expected: 2700000 },
    { kind: 'mustBeFormula' },
  ]);

  it('al primo tentativo nasconde il dettaglio che localizza l\'errore', () => {
    const wb = foglioBase();
    scrivi(wb, B4, 999);
    const primo = gradeTask(wb, T, { attempt: 1 });
    expect(primo.checks.every((c) => c.detail === undefined)).toBe(true);
    // Il messaggio didattico c'e' comunque: dice CHE COSA hai sbagliato.
    expect(primo.checks.find((c) => c.kind === 'mustBeFormula')!.message).toContain('hardcodato');
    wb.destroy();
  });

  it('dal secondo tentativo rivela il dettaglio', () => {
    const wb = foglioBase();
    scrivi(wb, B4, 999);
    const secondo = gradeTask(wb, T, { attempt: 2 });
    expect(secondo.checks.find((c) => c.kind === 'value')!.detail).toContain('999');
    wb.destroy();
  });

  it('la sintesi di livello nomina il task e la famiglia, non la cella', () => {
    const wb = foglioBase();
    scrivi(wb, B4, 999);
    const instance = {
      templateId: 'X',
      seed: 1,
      brief: '',
      sheets: [{ name: 'Model', cells: [] }],
      tasks: [T],
      hints: [],
      parScore: { seconds: 60, keystrokes: 20 },
    } as unknown as LevelInstance;

    const report = gradeLevel(wb, instance, { attempt: 1 });
    expect(report.passed).toBe(false);
    expect(report.summary).toContain('t');
    expect(report.summary).not.toContain('B4');
    wb.destroy();
  });
});

describe('perfectStructure', () => {
  it('e\' vero solo se nessun check strutturale fallisce', () => {
    const wb = foglioBase();
    const instance = {
      templateId: 'X',
      seed: 1,
      brief: '',
      sheets: [{ name: 'Model', cells: [] }],
      tasks: [task('t', 'Model!B4', [{ kind: 'value', expected: 2700000 }, { kind: 'mustBeFormula' }])],
      hints: [],
      parScore: { seconds: 60, keystrokes: 20 },
    } as unknown as LevelInstance;

    scrivi(wb, B4, 2700000);
    expect(gradeLevel(wb, instance).perfectStructure).toBe(false);

    scrivi(wb, B4, '=B2+B3');
    const buono = gradeLevel(wb, instance);
    expect(buono.perfectStructure).toBe(true);
    expect(buono.passed).toBe(true);
    wb.destroy();
  });
});
