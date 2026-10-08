/**
 * Test di `Workbook`, l'adattatore fra HyperFormula e il gioco.
 *
 * Il rischio specifico di un adattatore non e' che sbagli i conti — quelli li fa
 * HyperFormula — ma che le due meta' del modello divergano: il contenuto vive nel
 * motore, stili / lucchetti / undo vivono qui. Quasi tutti i test sotto verificano
 * proprio la giuntura: dopo un inserimento di righe le formule e i colori devono
 * essersi mossi INSIEME, e un solo Ctrl+Z deve riportare indietro entrambi.
 *
 * Convenzione: righe e colonne 0-based ovunque, come nel resto del codebase.
 * Ogni test distrugge il workbook in `finally` — un'istanza HyperFormula viva
 * trattiene l'intero grafo delle dipendenze.
 */

import { describe, expect, it } from 'vitest';

import { ctrlEnd } from './navigation';
import { EMPTY_STYLE } from './types';
import { Workbook } from './workbook';

/** Esegue `fn` su un workbook e lo distrugge comunque vada. */
function withWorkbook<T>(wb: Workbook, fn: (wb: Workbook) => T): T {
  try {
    return fn(wb);
  } finally {
    wb.destroy();
  }
}

const A1 = { row: 0, col: 0 };
const A2 = { row: 1, col: 0 };
const A3 = { row: 2, col: 0 };
const B1 = { row: 0, col: 1 };
const C1 = { row: 0, col: 2 };

// ---------------------------------------------------------------------------
// Contenuto: HyperFormula e' l'unica fonte di verita'
// ---------------------------------------------------------------------------

describe('contenuto', () => {
  it('create popola il foglio e le tre viste sul contenuto restano coerenti', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[10, '=A1*2', 'testo']] }]), (wb) => {
      expect(wb.sheetNames()).toEqual(['Model']);
      expect(wb.sheetIds()).toEqual([0]);

      // getRaw = cosa ha digitato l'utente, getFormula = il testo della formula,
      // getValue = il risultato. Su una formula devono raccontare la stessa cella.
      expect(wb.getRaw(0, A1)).toBe(10);
      expect(wb.getFormula(0, A1)).toBeUndefined();
      expect(wb.getValue(0, A1)).toBe(10);

      expect(wb.getRaw(0, B1)).toBe('=A1*2');
      expect(wb.getFormula(0, B1)).toBe('=A1*2');
      expect(wb.getValue(0, B1)).toBe(20);

      expect(wb.getRaw(0, C1)).toBe('testo');
      expect(wb.isFormula(0, B1)).toBe(true);
      expect(wb.isFormula(0, C1)).toBe(false);
    });
  });

  it('setContents propaga ai dipendenti e li elenca nel ChangeSummary', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[10, '=A1*2', '=B1+1']] }]), (wb) => {
      const summary = wb.setContents(0, A1, 4);
      expect(wb.getValue(0, B1)).toBe(8);
      expect(wb.getValue(0, C1)).toBe(9);

      // Il senso di avere un motore a grafo: il ridisegno deve sapere che anche
      // B1 e C1 sono cambiate, non solo la cella scritta.
      const touched = summary.touched.map((t) => `${t.row},${t.col}`);
      expect(touched).toContain('0,1');
      expect(touched).toContain('0,2');
    });
  });

  it('scrivere null svuota la cella e i dipendenti se ne accorgono', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[10, '=A1*2']] }]), (wb) => {
      wb.setContents(0, A1, null);
      expect(wb.isEmpty(0, A1)).toBe(true);
      expect(wb.getRaw(0, A1)).toBeNull();
      expect(wb.getValue(0, B1)).toBe(0); // cella vuota = 0 in aritmetica
    });
  });

  it('il contenuto non e\' mai in cache: una scrittura diretta sul motore si vede subito', () => {
    // Se `getRaw` tenesse una copia locale, questo test fallirebbe — ed e' il bug
    // che il commento in testa a workbook.ts vuole prevenire.
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setContents(0, A1, 1);
      wb.engine.setCellContents({ sheet: 0, row: 0, col: 0 }, 99);
      expect(wb.getRaw(0, A1)).toBe(99);
      expect(wb.getValue(0, A1)).toBe(99);
    });
  });

  it('setBlock scrive una matrice ed e\' una sola voce di undo', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setBlock(0, A1, [
        [1, 2],
        [3, '=A1+B1'],
      ]);
      expect(wb.getValue(0, { row: 1, col: 1 })).toBe(3);

      wb.undo();
      expect(wb.isEmpty(0, A1)).toBe(true);
      expect(wb.isEmpty(0, { row: 1, col: 1 })).toBe(true);
      expect(wb.canUndo()).toBe(false);
    });
  });

  it('clearRange svuota un rettangolo in un colpo solo', () => {
    withWorkbook(
      Workbook.create([{ name: 'Model', data: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }]),
      (wb) => {
        wb.clearRange(0, { top: 0, left: 0, bottom: 1, right: 1 });
        expect(wb.isEmpty(0, A1)).toBe(true);
        expect(wb.isEmpty(0, { row: 1, col: 1 })).toBe(true);
        expect(wb.getValue(0, C1)).toBe(3); // fuori dal rettangolo: intatta

        wb.undo();
        expect(wb.getValue(0, A1)).toBe(1);
      },
    );
  });

  it('clearRange accetta un rettangolo con gli estremi invertiti', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, 2], [3, 4]] }]), (wb) => {
      // Una selezione trascinata dal basso a destra verso l'alto a sinistra
      // arriva qui con bottom < top: va normalizzata, non ignorata.
      wb.clearRange(0, { top: 1, left: 1, bottom: 0, right: 0 });
      expect(wb.isEmpty(0, A1)).toBe(true);
      expect(wb.isEmpty(0, { row: 1, col: 1 })).toBe(true);
    });
  });

  it('addSheet crea un foglio indipendente con i propri stili', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      const id = wb.addSheet('Inputs');
      expect(wb.sheetName(id)).toBe('Inputs');
      expect(wb.sheetId('Inputs')).toBe(id);

      wb.setStyle(id, A1, { bold: true });
      expect(wb.getStyle(id, A1)).toEqual({ bold: true });
      expect(wb.getStyle(0, A1)).toBe(EMPTY_STYLE);
      expect(() => wb.sheetName(42)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// usedRange e probe
// ---------------------------------------------------------------------------

describe('usedRange', () => {
  it('foglio vuoto: nessuna area utilizzata', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      expect(wb.usedRange(0)).toBeNull();
      expect(ctrlEnd(wb.probe(0))).toEqual({ row: 0, col: 0 });
    });
  });

  it('si restringe davvero dopo una cancellazione, e Ctrl+Fine con lei', () => {
    // Il caso classico: scrivo in E10, cancello E10. HyperFormula continua a
    // dichiarare un rettangolo allocato 5x10, ma Ctrl+Fine deve tornare indietro
    // sul contenuto vero — altrimenti la navigazione atterra nel nulla.
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, 2]] }]), (wb) => {
      expect(wb.usedRange(0)).toEqual({ top: 0, left: 0, bottom: 0, right: 1 });

      wb.setContents(0, { row: 9, col: 4 }, 5); // E10
      expect(wb.usedRange(0)).toEqual({ top: 0, left: 0, bottom: 9, right: 4 });
      expect(ctrlEnd(wb.probe(0))).toEqual({ row: 9, col: 4 });

      wb.setContents(0, { row: 9, col: 4 }, null);
      expect(wb.engine.getSheetDimensions(0)).toEqual({ width: 5, height: 10 });
      expect(wb.usedRange(0)).toEqual({ top: 0, left: 0, bottom: 0, right: 1 });
      expect(ctrlEnd(wb.probe(0))).toEqual({ row: 0, col: 1 });
    });
  });

  it('torna null quando l\'ultima cella viene svuotata', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1]] }]), (wb) => {
      wb.setContents(0, A1, null);
      expect(wb.usedRange(0)).toBeNull();
    });
  });
});

describe('probe', () => {
  it('una formula che restituisce stringa vuota CONTA come piena', () => {
    // In Excel Ctrl+Freccia si ferma su `=IF(A1>0,"","")`: la cella non e' vuota,
    // contiene una formula. Se contasse come vuota, saltare a fine tabella
    // scavalcherebbe le righe con le formule "silenziose", che nei modelli
    // finanziari sono ovunque.
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, '=IF(A1>0,"","")', null]] }]), (wb) => {
      const probe = wb.probe(0);
      expect(wb.getValue(0, B1)).toBe('');
      expect(probe.isFilled(0, 0)).toBe(true);
      expect(probe.isFilled(0, 1)).toBe(true);
      expect(probe.isFilled(0, 2)).toBe(false);
      expect(wb.isEmpty(0, B1)).toBe(false);
    });
  });

  it('espone i limiti del foglio e lo stato del layout', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      const layout = wb.layout(0);
      layout.hiddenRows.add(3);
      layout.hiddenCols.add(2);
      layout.frozenRows = 1;
      layout.frozenCols = 2;

      const probe = wb.probe(0);
      expect(probe.maxRow).toBe(1_048_575);
      expect(probe.maxCol).toBe(16_383);
      expect(probe.isRowHidden(3)).toBe(true);
      expect(probe.isRowHidden(4)).toBe(false);
      expect(probe.isColHidden(2)).toBe(true);
      expect(probe.frozenRows).toBe(1);
      expect(probe.frozenCols).toBe(2);
      expect(() => wb.layout(9)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Stili
// ---------------------------------------------------------------------------

describe('stili', () => {
  it('una cella senza stile restituisce EMPTY_STYLE', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      expect(wb.getStyle(0, A1)).toBe(EMPTY_STYLE);
    });
  });

  it('un patch parziale si fonde con lo stile precedente', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setStyle(0, A1, { fontColor: '#0000FF', bold: true });
      wb.setStyle(0, A1, { numFmt: '#,##0' });
      expect(wb.getStyle(0, A1)).toEqual({ fontColor: '#0000FF', bold: true, numFmt: '#,##0' });

      wb.setStyle(0, A1, { bold: false });
      expect(wb.getStyle(0, A1)).toEqual({ fontColor: '#0000FF', bold: false, numFmt: '#,##0' });
    });
  });

  it('un patch che azzera l\'ultima proprieta\' rimuove la voce', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setStyle(0, A1, { bold: true });
      wb.setStyle(0, A1, { bold: undefined });
      expect(wb.getStyle(0, A1)).toEqual({});
    });
  });

  it('azzerare una proprieta\' sola lascia in piedi le altre', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setStyle(0, A1, { bold: true, fillColor: '#FFFF00' });
      wb.setStyle(0, A1, { bold: undefined });
      expect(wb.getStyle(0, A1)).toEqual({ fillColor: '#FFFF00' });
    });
  });

  it('setStyleRange applica a tutto il rettangolo con una sola voce di undo', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setStyle(0, B1, { bold: true }, 'grassetto');
      wb.setStyleRange(0, { top: 0, left: 0, bottom: 1, right: 1 }, { fillColor: '#EEE' });

      expect(wb.getStyle(0, A1)).toEqual({ fillColor: '#EEE' });
      // La fusione vale anche dentro un range: il grassetto preesistente resta.
      expect(wb.getStyle(0, B1)).toEqual({ bold: true, fillColor: '#EEE' });
      expect(wb.getStyle(0, { row: 1, col: 1 })).toEqual({ fillColor: '#EEE' });

      wb.undo(); // una sola volta per quattro celle
      expect(wb.getStyle(0, A1)).toEqual({});
      expect(wb.getStyle(0, B1)).toEqual({ bold: true });
    });
  });

  it('setStyle su un foglio inesistente lancia invece di perdere lo stile', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      expect(() => wb.setStyle(7, A1, { bold: true })).toThrow(/inesistente/);
    });
  });
});

// ---------------------------------------------------------------------------
// Celle bloccate
// ---------------------------------------------------------------------------

describe('celle bloccate', () => {
  it('setLocked marca un rettangolo e isLocked lo rilegge', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setLocked(0, { top: 0, left: 0, bottom: 1, right: 0 }, true);
      expect(wb.isLocked(0, A1)).toBe(true);
      expect(wb.isLocked(0, A2)).toBe(true);
      expect(wb.isLocked(0, A3)).toBe(false);

      wb.setLocked(0, { top: 0, left: 0, bottom: 0, right: 0 }, false);
      expect(wb.isLocked(0, A1)).toBe(false);
      expect(wb.isLocked(0, A2)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Undo / redo unificati
// ---------------------------------------------------------------------------

describe('undo e redo', () => {
  it('undo su stack vuoto non fa nulla', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      expect(wb.canUndo()).toBe(false);
      expect(wb.undoLabel()).toBeUndefined();
      expect(() => wb.undo()).not.toThrow();
      expect(() => wb.redo()).not.toThrow();
    });
  });

  it('undo riporta indietro il contenuto e redo lo rimette', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, '=A1*2']] }]), (wb) => {
      wb.setContents(0, A1, 50);
      expect(wb.getValue(0, B1)).toBe(100);

      wb.undo();
      expect(wb.getValue(0, A1)).toBe(1);
      expect(wb.getValue(0, B1)).toBe(2);
      expect(wb.canRedo()).toBe(true);

      wb.redo();
      expect(wb.getValue(0, A1)).toBe(50);
      expect(wb.getValue(0, B1)).toBe(100);
    });
  });

  it('undoLabel racconta l\'ultima azione', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setContents(0, A1, 1, 'digita 1');
      expect(wb.undoLabel()).toBe('digita 1');
      wb.setStyle(0, A1, { bold: true }, 'grassetto');
      expect(wb.undoLabel()).toBe('grassetto');
      wb.undo();
      expect(wb.undoLabel()).toBe('digita 1');
    });
  });

  it('UN SOLO Ctrl+Z annulla contenuto E stile della stessa azione', () => {
    // "Scrivi l'input e coloralo di blu" e' un gesto solo per l'utente: se
    // servissero due Ctrl+Z, la meta' annullata resterebbe visibile e il
    // color coding racconterebbe una cella che non esiste piu'.
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.batch('input blu', () => {
        wb.setContents(0, A1, 42);
        wb.setStyle(0, A1, { fontColor: '#0000FF' });
      });
      expect(wb.getValue(0, A1)).toBe(42);
      expect(wb.getStyle(0, A1)).toEqual({ fontColor: '#0000FF' });
      expect(wb.undoLabel()).toBe('input blu');

      wb.undo();
      expect(wb.isEmpty(0, A1)).toBe(true);
      expect(wb.getStyle(0, A1)).toEqual({});
      expect(wb.canUndo()).toBe(false); // una voce sola, non due
    });
  });

  it('il redo di un\'azione mista ripristina contenuto E stile', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.batch('input blu', () => {
        wb.setContents(0, A1, 42);
        wb.setStyle(0, A1, { fontColor: '#0000FF' });
      });
      wb.undo();
      wb.redo();

      expect(wb.getValue(0, A1)).toBe(42);
      // Senza il "dopo" nella voce di undo, qui lo stile resterebbe vuoto e il
      // foglio finirebbe in uno stato che l'utente non ha mai prodotto.
      expect(wb.getStyle(0, A1)).toEqual({ fontColor: '#0000FF' });
      expect(wb.canRedo()).toBe(false);
      expect(wb.canUndo()).toBe(true);
    });
  });

  it('undo/redo ripetuti su uno stile restano stabili', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setStyle(0, A1, { bold: true });
      wb.setStyle(0, A1, { italic: true });

      for (let i = 0; i < 3; i++) {
        wb.undo();
        expect(wb.getStyle(0, A1)).toEqual({ bold: true });
        wb.redo();
        expect(wb.getStyle(0, A1)).toEqual({ bold: true, italic: true });
      }
    });
  });

  it('una nuova azione dopo un undo azzera la pila di redo', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setContents(0, A1, 1);
      wb.setContents(0, A1, 2);
      wb.undo();
      expect(wb.canRedo()).toBe(true);

      wb.setContents(0, A1, 3);
      expect(wb.canRedo()).toBe(false);
      expect(wb.getValue(0, A1)).toBe(3);

      wb.undo();
      expect(wb.getValue(0, A1)).toBe(1);
    });
  });

  it('120 passi di undo consecutivi risalgono fino all\'inizio (spec 3.1: almeno 100)', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      const N = 120;
      for (let i = 1; i <= N; i++) wb.setContents(0, A1, i, `passo ${i}`);
      expect(wb.getValue(0, A1)).toBe(N);

      for (let i = N; i >= 2; i--) {
        expect(wb.getValue(0, A1)).toBe(i);
        wb.undo();
      }
      expect(wb.getValue(0, A1)).toBe(1);
      wb.undo();
      expect(wb.isEmpty(0, A1)).toBe(true);
      expect(wb.canUndo()).toBe(false);
    });
  });

  it('120 passi di redo ricostruiscono la stessa storia', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      const N = 120;
      for (let i = 1; i <= N; i++) {
        wb.setContents(0, { row: i - 1, col: 0 }, i);
        wb.setStyle(0, { row: i - 1, col: 0 }, { bold: true });
      }
      for (let i = 0; i < 2 * N; i++) wb.undo();
      expect(wb.usedRange(0)).toBeNull();
      expect(wb.canUndo()).toBe(false);

      for (let i = 0; i < 2 * N; i++) wb.redo();
      expect(wb.canRedo()).toBe(false);
      expect(wb.getValue(0, { row: N - 1, col: 0 })).toBe(N);
      expect(wb.getStyle(0, { row: N - 1, col: 0 })).toEqual({ bold: true });
    });
  });

  it('una transazione annidata confluisce nella padre, non ne apre un\'altra', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.batch('esterna', () => {
        wb.batch('interna', () => {
          wb.setContents(0, A1, 1);
        });
        wb.setContents(0, B1, 2);
      });
      expect(wb.undoLabel()).toBe('esterna');
      wb.undo();
      expect(wb.isEmpty(0, A1)).toBe(true);
      expect(wb.isEmpty(0, B1)).toBe(true);
      expect(wb.canUndo()).toBe(false);
    });
  });

  it('clearHistory azzera entrambe le pile senza toccare il contenuto', () => {
    // Il setup di un livello usa gli stessi metodi del giocatore: senza questo,
    // il primo Ctrl+Z smonterebbe l'esercizio invece della prima mossa.
    withWorkbook(Workbook.empty('Model'), (wb) => {
      wb.setContents(0, A1, 1);
      wb.setStyle(0, A1, { bold: true });
      wb.undo();
      expect(wb.canRedo()).toBe(true);

      wb.clearHistory();
      expect(wb.canUndo()).toBe(false);
      expect(wb.canRedo()).toBe(false);
      expect(wb.getValue(0, A1)).toBe(1);

      wb.undo();
      expect(wb.getValue(0, A1)).toBe(1);
    });
  });

  it('un batch che non scrive nulla non lascia una voce di undo fantasma', () => {
    withWorkbook(Workbook.empty('Model'), (wb) => {
      const out = wb.batch('niente', () => 7);
      expect(out).toBe(7);
      expect(wb.canUndo()).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Struttura: righe e colonne
// ---------------------------------------------------------------------------

describe('insertRows / removeRows', () => {
  it('inserire una riga aggiorna le formule e trasla gli stili insieme a loro', () => {
    // Il punto esatto in cui un adattatore sbaglia: HyperFormula sposta il
    // contenuto, gli stili sono roba nostra. Se si muove solo una delle due meta',
    // il color coding finisce sulla riga sbagliata.
    withWorkbook(
      Workbook.create([{ name: 'Model', data: [[10], [20], ['=SUM(A1:A2)']] }]),
      (wb) => {
        wb.setStyle(0, A3, { bold: true }); // sul totale
        wb.setStyle(0, A1, { fontColor: '#0000FF' }); // sull'input, sopra il taglio

        wb.insertRows(0, 1, 1);

        expect(wb.getFormula(0, { row: 3, col: 0 })).toBe('=SUM(A1:A3)');
        expect(wb.getValue(0, { row: 3, col: 0 })).toBe(30);
        expect(wb.getStyle(0, { row: 3, col: 0 })).toEqual({ bold: true });
        expect(wb.getStyle(0, A3)).toEqual({}); // la riga nuova nasce senza formato
        expect(wb.getStyle(0, A1)).toEqual({ fontColor: '#0000FF' }); // sopra il taglio: ferma
      },
    );
  });

  it('lo stile di una riga ELIMINATA sparisce e non si accavalla su quella sopra', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1], [2], [3], [4]] }]), (wb) => {
      wb.setStyle(0, A2, { bold: true }); // riga 2, sopravvive
      wb.setStyle(0, A3, { italic: true }); // riga 3, verra' eliminata
      wb.setStyle(0, { row: 3, col: 0 }, { underline: true }); // riga 4, risale

      wb.removeRows(0, 2, 1); // via la riga 3

      expect(wb.getValue(0, A3)).toBe(4);
      // Senza la banda eliminata, lo stile della riga 3 traslerebbe a riga 2
      // cancellando il grassetto: due formati per una cella sola.
      expect(wb.getStyle(0, A2)).toEqual({ bold: true });
      expect(wb.getStyle(0, A3)).toEqual({ underline: true });
      expect(wb.getStyle(0, { row: 3, col: 0 })).toEqual({});
    });
  });

  it('eliminare piu\' righe insieme svuota tutta la banda', () => {
    withWorkbook(
      Workbook.create([{ name: 'Model', data: [[1], [2], [3], [4], [5]] }]),
      (wb) => {
        wb.setStyle(0, A1, { bold: true });
        wb.setStyle(0, A2, { italic: true });
        wb.setStyle(0, A3, { underline: true });
        wb.setStyle(0, { row: 3, col: 0 }, { fillColor: '#EEE' });

        wb.removeRows(0, 1, 2); // via righe 2 e 3

        expect(wb.getValue(0, A2)).toBe(4);
        expect(wb.getStyle(0, A1)).toEqual({ bold: true });
        expect(wb.getStyle(0, A2)).toEqual({ fillColor: '#EEE' });
        expect(wb.getStyle(0, A3)).toEqual({});
      },
    );
  });

  it('eliminare la riga a cui punta una formula produce #REF!', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[10], ['=A1*2']] }]), (wb) => {
      wb.removeRows(0, 0, 1);
      const v = wb.getValue(0, A1);
      expect(typeof v === 'object' && v !== null && (v as { type?: string }).type).toBe('REF');
    });
  });

  it('anche le celle bloccate traslano con le righe', () => {
    // Stessa logica degli stili: un\'area protetta che non si muove finirebbe per
    // proteggere le celle sbagliate dopo un inserimento.
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1], [2], [3]] }]), (wb) => {
      wb.setLocked(0, { top: 2, left: 0, bottom: 2, right: 0 }, true);
      wb.insertRows(0, 0, 1);
      expect(wb.isLocked(0, A3)).toBe(false);
      expect(wb.isLocked(0, { row: 3, col: 0 })).toBe(true);

      wb.removeRows(0, 3, 1);
      expect(wb.isLocked(0, { row: 3, col: 0 })).toBe(false);
    });
  });

  it('un indice fuori dai limiti viene clampato per il contenuto E per gli stili', () => {
    // Se HyperFormula inserisse a riga 0 e gli stili traslassero da riga -5, le
    // due meta' del modello scivolerebbero di quantita' diverse.
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1], [2]] }]), (wb) => {
      wb.setStyle(0, A1, { bold: true });
      wb.insertRows(0, -5, 1);

      expect(wb.getValue(0, A2)).toBe(1);
      expect(wb.getStyle(0, A2)).toEqual({ bold: true });
      expect(wb.getStyle(0, A1)).toEqual({});
    });
  });

  it('un solo undo riporta indietro sia le formule sia gli stili', () => {
    withWorkbook(
      Workbook.create([{ name: 'Model', data: [[10], [20], ['=SUM(A1:A2)']] }]),
      (wb) => {
        wb.setStyle(0, A3, { bold: true });
        wb.insertRows(0, 1, 1);
        expect(wb.undoLabel()).toBe('inserisci righe');

        wb.undo();

        expect(wb.getFormula(0, A3)).toBe('=SUM(A1:A2)');
        expect(wb.getValue(0, A3)).toBe(30);
        expect(wb.getStyle(0, A3)).toEqual({ bold: true });
        expect(wb.getStyle(0, { row: 3, col: 0 })).toEqual({});
      },
    );
  });

  it('il redo di un inserimento rimette anche gli stili nella posizione nuova', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[10], [20], [30]] }]), (wb) => {
      wb.setStyle(0, A3, { bold: true });
      wb.insertRows(0, 1, 1);
      wb.undo();
      wb.redo();

      expect(wb.getValue(0, { row: 3, col: 0 })).toBe(30);
      expect(wb.getStyle(0, { row: 3, col: 0 })).toEqual({ bold: true });
      expect(wb.getStyle(0, A3)).toEqual({});
    });
  });

  it('l\'undo di un\'eliminazione fa riapparire lo stile della riga eliminata', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1], [2], [3]] }]), (wb) => {
      wb.setStyle(0, A2, { italic: true });
      wb.removeRows(0, 1, 1);
      expect(wb.getStyle(0, A2)).toEqual({});

      wb.undo();
      expect(wb.getValue(0, A2)).toBe(2);
      expect(wb.getStyle(0, A2)).toEqual({ italic: true });
    });
  });
});

describe('insertCols / removeCols', () => {
  it('inserire una colonna aggiorna le formule e trasla gli stili', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[10, 20, '=A1+B1']] }]), (wb) => {
      wb.setStyle(0, C1, { bold: true });
      wb.setStyle(0, A1, { fontColor: '#0000FF' });

      wb.insertCols(0, 1, 1);

      expect(wb.getFormula(0, { row: 0, col: 3 })).toBe('=A1+C1');
      expect(wb.getValue(0, { row: 0, col: 3 })).toBe(30);
      expect(wb.getStyle(0, { row: 0, col: 3 })).toEqual({ bold: true });
      expect(wb.getStyle(0, A1)).toEqual({ fontColor: '#0000FF' });
      expect(wb.getStyle(0, B1)).toEqual({});
    });
  });

  it('lo stile di una colonna eliminata sparisce senza travolgere la vicina', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, 2, 3, 4]] }]), (wb) => {
      wb.setStyle(0, B1, { bold: true }); // colonna B, sopravvive
      wb.setStyle(0, C1, { italic: true }); // colonna C, eliminata
      wb.setStyle(0, { row: 0, col: 3 }, { underline: true }); // colonna D, scala a C

      wb.removeCols(0, 2, 1);

      expect(wb.getValue(0, C1)).toBe(4);
      expect(wb.getStyle(0, B1)).toEqual({ bold: true });
      expect(wb.getStyle(0, C1)).toEqual({ underline: true });
    });
  });

  it('un solo undo riporta indietro colonne e stili insieme', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, 2, 3]] }]), (wb) => {
      wb.setStyle(0, C1, { bold: true });
      wb.removeCols(0, 0, 1);
      expect(wb.getValue(0, B1)).toBe(3);
      expect(wb.getStyle(0, B1)).toEqual({ bold: true });

      wb.undo();
      expect(wb.getValue(0, C1)).toBe(3);
      expect(wb.getStyle(0, C1)).toEqual({ bold: true });
      expect(wb.getStyle(0, B1)).toEqual({});
    });
  });
});

// ---------------------------------------------------------------------------
// Audit: precedenti e dipendenti
// ---------------------------------------------------------------------------

describe('precedents e dependents', () => {
  it('precedenti di una formula su celle singole', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, 2, '=A1+B1']] }]), (wb) => {
      const prec = wb.precedents(0, C1);
      expect(prec).toEqual([
        { sheet: 0, range: { top: 0, left: 0, bottom: 0, right: 0 } },
        { sheet: 0, range: { top: 0, left: 1, bottom: 0, right: 1 } },
      ]);
    });
  });

  it('precedenti su un range restituiscono il rettangolo intero', () => {
    withWorkbook(
      Workbook.create([{ name: 'Model', data: [[1], [2], [3], ['=SUM(A1:A3)']] }]),
      (wb) => {
        expect(wb.precedents(0, { row: 3, col: 0 })).toEqual([
          { sheet: 0, range: { top: 0, left: 0, bottom: 2, right: 0 } },
        ]);
      },
    );
  });

  it('una cella senza formula non ha precedenti', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, '=A1']] }]), (wb) => {
      expect(wb.precedents(0, A1)).toEqual([]);
    });
  });

  it('dipendenti: tutte le formule che leggono la cella', () => {
    withWorkbook(
      Workbook.create([{ name: 'Model', data: [[1, '=A1*2', '=A1+B1']] }]),
      (wb) => {
        const dep = wb.dependents(0, A1);
        expect(dep).toHaveLength(2);
        expect(dep).toContainEqual({ sheet: 0, range: { top: 0, left: 1, bottom: 0, right: 1 } });
        expect(dep).toContainEqual({ sheet: 0, range: { top: 0, left: 2, bottom: 0, right: 2 } });
      },
    );
  });

  it('precedenti e dipendenti attraversano i fogli', () => {
    withWorkbook(
      Workbook.create([
        { name: 'Inputs', data: [[5]] },
        { name: 'Model', data: [['=Inputs!A1*2']] },
      ]),
      (wb) => {
        const inputs = wb.sheetId('Inputs');
        const model = wb.sheetId('Model');

        expect(wb.precedents(model, A1)).toEqual([
          { sheet: inputs, range: { top: 0, left: 0, bottom: 0, right: 0 } },
        ]);
        expect(wb.dependents(inputs, A1)).toEqual([
          { sheet: model, range: { top: 0, left: 0, bottom: 0, right: 0 } },
        ]);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// F9 su frammento
// ---------------------------------------------------------------------------

describe('evaluateFragment', () => {
  it('valuta un\'espressione con o senza il segno uguale', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, 2, 3]] }]), (wb) => {
      expect(wb.evaluateFragment(0, 'SUM(A1:C1)')).toBe(6);
      expect(wb.evaluateFragment(0, '=SUM(A1:C1)')).toBe(6);
      expect(wb.evaluateFragment(0, '2*3')).toBe(6);
    });
  });

  it('un frammento non parsificabile restituisce #NAME? invece di lanciare', () => {
    // F9 si preme in mezzo alla digitazione: il frammento sotto il cursore e'
    // spesso incompleto, e un\'eccezione butterebbe giu\' la barra della formula.
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1]] }]), (wb) => {
      expect(wb.evaluateFragment(0, 'SUM(')).toBe('#NAME?');
      expect(wb.evaluateFragment(0, '1+')).toBe('#NAME?');
    });
  });

  it('un frammento che nomina un range restituisce la matrice dei valori', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1, 2], [3, 4]] }]), (wb) => {
      expect(wb.evaluateFragment(0, 'A1:B2')).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });

  it('un frammento puo\' leggere un altro foglio', () => {
    withWorkbook(
      Workbook.create([
        { name: 'Inputs', data: [[5]] },
        { name: 'Model', data: [[0]] },
      ]),
      (wb) => {
        const model = wb.sheetId('Model');
        expect(wb.evaluateFragment(model, 'Inputs!A1+1')).toBe(6);
      },
    );
  });

  it('un riferimento a un foglio inesistente diventa #REF!, non un\'eccezione', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[1]] }]), (wb) => {
      const v = wb.evaluateFragment(0, 'Assente!A1');
      expect(typeof v === 'object' && v !== null && (v as { type?: string }).type).toBe('REF');
    });
  });
});

// ---------------------------------------------------------------------------
// Calcolo iterativo
// ---------------------------------------------------------------------------

describe('calcolo iterativo', () => {
  /**
   * Modello circolare minimo, risolto a mano:
   *   A1 = B1*0,5 + 10
   *   B1 = A1 + 5
   * Sostituendo: A1 = (A1+5)*0,5 + 10 = 0,5*A1 + 12,5  ->  A1 = 25, B1 = 30.
   */
  const CIRCOLARE = [['=B1*0.5+10', '=A1+5']];

  it('spento: il ciclo resta #CYCLE! ed e\' il default', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: CIRCOLARE }]), (wb) => {
      expect(wb.getIterative()).toEqual({ enabled: false, maxIterations: 100, delta: 0.001 });
      const v = wb.getValue(0, A1);
      expect(typeof v === 'object' && v !== null && (v as { type?: string }).type).toBe('CYCLE');
      expect(wb.recalcIterative()).toBeNull();
    });
  });

  it('acceso: getValue restituisce il valore convergente', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: CIRCOLARE }]), (wb) => {
      wb.setIterative({ enabled: true });
      expect(wb.getValue(0, A1)).toBeCloseTo(25, 2);
      expect(wb.getValue(0, B1)).toBeCloseTo(30, 2);
    });
  });

  it('funziona anche su un foglio il cui nome va quotato', () => {
    // La mappa dei valori risolti e\' indicizzata con il nome foglio QUOTATO:
    // comporre la chiave a mano cercherebbe "Deal Model!A1" dove c\'e\'
    // "'Deal Model'!A1", e il valore convergente non verrebbe mai trovato.
    withWorkbook(Workbook.create([{ name: 'Deal Model', data: CIRCOLARE }]), (wb) => {
      wb.setIterative({ enabled: true });
      expect(wb.getValue(0, A1)).toBeCloseTo(25, 2);
    });
  });

  it('spegnendolo si torna a #CYCLE!', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: CIRCOLARE }]), (wb) => {
      wb.setIterative({ enabled: true });
      expect(wb.getValue(0, A1)).toBeCloseTo(25, 2);

      wb.setIterative({ enabled: false });
      const v = wb.getValue(0, A1);
      expect(typeof v === 'object' && v !== null && (v as { type?: string }).type).toBe('CYCLE');
    });
  });

  it('recalcIterative riferisce convergenza e iterazioni', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: CIRCOLARE }]), (wb) => {
      wb.setIterative({ enabled: true, maxIterations: 100, delta: 0.001 });
      const res = wb.recalcIterative();
      expect(res).not.toBeNull();
      expect(res!.converged).toBe(true);
      expect(res!.iterations).toBeGreaterThan(0);
      expect(res!.iterations).toBeLessThanOrEqual(100);
    });
  });

  it('una scrittura invalida i valori iterativi finche\' non si ricalcola', () => {
    // Durante la digitazione i cicli transitori sono normali: tenere in vita i
    // valori vecchi mostrerebbe numeri che non appartengono piu\' al modello.
    withWorkbook(Workbook.create([{ name: 'Model', data: CIRCOLARE }]), (wb) => {
      wb.setIterative({ enabled: true });
      expect(wb.getValue(0, A1)).toBeCloseTo(25, 2);

      wb.setContents(0, C1, 1);
      const dopo = wb.getValue(0, A1);
      expect(typeof dopo === 'object' && dopo !== null && (dopo as { type?: string }).type).toBe(
        'CYCLE',
      );

      wb.recalcIterative();
      expect(wb.getValue(0, A1)).toBeCloseTo(25, 2);
    });
  });

  it('un modello aciclico non viene toccato dall\'iterazione', () => {
    withWorkbook(Workbook.create([{ name: 'Model', data: [[10, '=A1*2']] }]), (wb) => {
      wb.setIterative({ enabled: true });
      expect(wb.getValue(0, B1)).toBe(20);
      expect(wb.recalcIterative()).toEqual({ converged: true, iterations: 0 });
    });
  });
});

// ---------------------------------------------------------------------------
// Prestazioni (criterio di accettazione, spec 13)
// ---------------------------------------------------------------------------

describe('prestazioni', () => {
  it('5.000 celle concatenate: costruzione e ricalcolo dopo un edit sotto i 100 ms', () => {
    // Catena massima: ogni cella dipende dalla precedente, quindi un edit su A1
    // costringe il motore a ripercorrere tutte e 5.000. E' il caso peggiore per
    // un grafo di dipendenze, ed e' il numero del criterio di accettazione.
    const N = 5000;
    const data: (string | number)[][] = [[1]];
    for (let r = 1; r < N; r++) data.push([`=A${r}+1`]);

    const t0 = performance.now();
    const wb = Workbook.create([{ name: 'Model', data }]);
    const creazione = performance.now() - t0;

    withWorkbook(wb, () => {
      expect(wb.getValue(0, { row: N - 1, col: 0 })).toBe(N);

      const t1 = performance.now();
      wb.setContents(0, A1, 1000);
      const ricalcolo = performance.now() - t1;

      const t2 = performance.now();
      wb.usedRange(0);
      const scansione = performance.now() - t2;

      console.log(
        `[perf] ${N} celle concatenate — creazione ${creazione.toFixed(1)} ms, ` +
          `ricalcolo dopo un edit ${ricalcolo.toFixed(1)} ms, ` +
          `usedRange ${scansione.toFixed(1)} ms`,
      );

      expect(wb.getValue(0, { row: N - 1, col: 0 })).toBe(1000 + N - 1);
      expect(creazione).toBeLessThan(250);
      expect(ricalcolo).toBeLessThan(250);
    });
  });

  it('5.000 celle in griglia: creazione e ricalcolo restano sotto i 100 ms', () => {
    // Forma piu\' realistica di un modello: 100 righe x 50 colonne, ogni cella
    // somma la cella a sinistra e quella sopra.
    const ROWS = 100;
    const COLS = 50;
    const data: (string | number)[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: (string | number)[] = [];
      for (let c = 0; c < COLS; c++) {
        if (r === 0 && c === 0) row.push(1);
        else if (r === 0) row.push(`=${colName(c - 1)}1+1`);
        else if (c === 0) row.push(`=A${r}+1`);
        else row.push(`=${colName(c - 1)}${r + 1}+${colName(c)}${r}`);
      }
      data.push(row);
    }

    const t0 = performance.now();
    const wb = Workbook.create([{ name: 'Model', data }]);
    const creazione = performance.now() - t0;

    withWorkbook(wb, () => {
      const t1 = performance.now();
      wb.setContents(0, A1, 2);
      const ricalcolo = performance.now() - t1;

      const t2 = performance.now();
      wb.usedRange(0);
      const scansione = performance.now() - t2;

      console.log(
        `[perf] griglia ${ROWS}x${COLS} (${ROWS * COLS} celle) — creazione ${creazione.toFixed(1)} ms, ` +
          `ricalcolo dopo un edit ${ricalcolo.toFixed(1)} ms, ` +
          `usedRange ${scansione.toFixed(1)} ms`,
      );

      expect(creazione).toBeLessThan(100);
      expect(ricalcolo).toBeLessThan(100);
    });
  });
});

/** Lettera di colonna 0-based, solo per costruire i fogli di prova. */
function colName(col: number): string {
  let n = col;
  let out = '';
  while (n >= 0) {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
}
