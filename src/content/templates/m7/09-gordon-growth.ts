/**
 * M7 · 09 — Terminal value: il metodo Gordon growth.
 *
 * Un DCF sconta esplicitamente solo un numero finito di anni (tipicamente
 * 5-10): oltre l'orizzonte esplicito, il valore residuo dell'azienda si
 * comprime in un UNICO numero, il terminal value (valore terminale), che di
 * solito pesa la maggioranza del valore attuale totale — motivo in piu' per
 * costruirlo con cura.
 *
 * IL METODO GORDON GROWTH — una rendita perpetua crescente
 *
 * Il metodo piu' comune assume che, oltre l'ultimo anno esplicito, il FCF
 * continui a crescere per sempre a un tasso COSTANTE g (basso: la crescita di
 * un'economia matura, mai quella di un'azienda in iper-crescita — nessuna
 * azienda cresce piu' veloce del PIL nominale all'infinito). Il valore
 * attuale di quella rendita perpetua crescente e' la formula di Gordon:
 *
 *   Terminal Value = FCF(primo anno di perpetuita') / (WACC - g)
 *
 * IL PUNTO DIDATTICO — quale FCF va al numeratore, e perche'
 *
 * La formula della rendita perpetua crescente sconta il PRIMO flusso della
 * perpetuita', non il FCF dell'ultimo anno esplicito: quel primo flusso
 * arriva un anno DOPO l'ultimo anno esplicito, quindi e' gia' cresciuto di un
 * periodo. Usare direttamente il FCF dell'ultimo anno esplicito (senza
 * farlo crescere) sottostimerebbe SISTEMATICAMENTE il terminal value — un
 * errore piccolo in apparenza (un solo fattore (1+g), magari 2 punti
 * percentuali) ma che si applica all'intera perpetuita', quindi si propaga
 * per intero nel numero che di solito pesa piu' di meta' della valutazione.
 *
 * Due task in cascata, ognuno riferisce il precedente:
 *
 *   T1  FCF normalizzato del primo anno di perpetuita' = FCF ultimo anno × (1 + g)
 *   T2  Terminal Value (Gordon growth)                  = T1 / (WACC - g)
 *
 * VINCOLO CRITICO — WACC deve restare significativamente maggiore di g
 *
 * Se WACC si avvicinasse a g, il denominatore (WACC - g) collasserebbe verso
 * zero: il terminal value esploderebbe verso l'infinito. Se WACC scendesse
 * SOTTO g, il denominatore diventerebbe negativo e il terminal value
 * uscirebbe negativo — un numero senza senso economico (un'azienda non puo'
 * valere un importo negativo). Il generatore forza g SEMPRE basso (1,5%-2,5%,
 * la crescita di lungo periodo di un'economia matura, mai vicina al WACC) e
 * WACC SEMPRE in un range tipico (8%-12%): per costruzione il margine minimo
 * fra i due e' quindi ben oltre 4-5 punti percentuali su ogni seed generabile
 * (nel caso peggiore, WACC minimo 8% meno g massimo 2,5% = 5,5 punti). Un
 * `throw` esplicito nel generatore, stesso stile difensivo di
 * `m0f/02-data-table-2way.ts`, documenta l'invariante e intercetta subito —
 * in fase di generazione, non silenziosamente a runtime — qualunque futura
 * modifica ai range che lo rompesse.
 *
 * Geometria fissa: nessuna riga dipende dal seed, i riferimenti di cella sono
 * letterali per costruzione, come negli altri livelli di M7.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eurM,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_FCF = 'B4'; // FCF dell'ultimo anno esplicito della proiezione (dato, bloccato)
const B_G = 'B5'; // Tasso di crescita perpetuo g, basso e costante (dato, bloccato)
const B_WACC = 'B6'; // WACC (dato, bloccato)

const B_FCF1 = 'B9'; // T1: FCF normalizzato del primo anno di perpetuita'
const B_TV = 'B10'; // T2: Terminal value (Gordon growth)

// Margine minimo richiesto fra WACC e g: sotto questa soglia il denominatore
// (WACC - g) e' troppo vicino a zero perche' il terminal value abbia senso.
const MARGINE_MINIMO_WACC_G = 0.04;

export default defineTemplate({
  id: 'M7-09-GORDONGROWTH',
  module: 'M7',
  get title() {
    return tx('M7-09-GORDONGROWTH.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['dcf.terminal-value'],
  prerequisites: ['M7-08-STRUTTURATARGET'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // FCF dell'ultimo anno esplicito: 4m-12m, moda 7m — una mid-cap tipica,
    // arrotondato a 50.000 € per evitare code decimali innaturali.
    const fcfUltimoAnno = roundTo(triangular(r, 4_000_000, 7_000_000, 12_000_000), 50_000);

    // g: SEMPRE basso, 1,5%-2,5%, moda 2% — la crescita di lungo periodo di
    // un'economia matura. Mai vicino al WACC per costruzione (vedi guard-rail
    // sotto): nessuna azienda cresce piu' veloce del PIL nominale per sempre.
    const g = roundTo(triangular(r, 0.015, 0.02, 0.025), 0.001);

    // WACC: 8%-12%, moda 10% — range tipico, indipendente da g.
    const wacc = roundTo(triangular(r, 0.08, 0.1, 0.12), 0.001);

    // Guard-rail (§4.3): il denominatore WACC - g deve restare sempre
    // significativamente positivo. I range sopra lo garantiscono per
    // costruzione (margine minimo nel caso peggiore: WACC 8% - g 2,5% = 5,5
    // punti percentuali, ben oltre la soglia), ma il throw documenta
    // l'invariante e intercetta subito una futura modifica ai range che lo
    // rompesse, invece di lasciar passare un livello con un terminal value
    // che esplode o si inverte di segno.
    const margine = wacc - g;
    if (margine < MARGINE_MINIMO_WACC_G) {
      throw new Error(
        `M7-09-GORDONGROWTH: margine WACC-g troppo stretto (${margine}) per il seed ${rng.seed}: ` +
          `WACC ${wacc}, g ${g} — il denominatore della perpetuita' di Gordon rischia di collassare.`,
      );
    }

    const fcf1 = fcfUltimoAnno * (1 + g);
    const terminalValue = fcf1 / (wacc - g);

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M7-09-GORDONGROWTH.2', { B_FCF1, B_FCF, B_G }),
      target: `Model!${B_FCF1}`,
      atteso: fcf1,
      referenzia: [B_FCF, B_G],
      senzaLiteral: [1],
      skills: ['dcf.terminal-value'],
      minKeystrokes: 12,
    });

    // NB: costruito a mano (non con taskFormula) per obbligare esplicitamente
    // il riferimento a T1 (mustReference) accanto al check 'value': un
    // segno invertito nel denominatore (g - WACC invece di WACC - g) ribalta
    // il segno del risultato — un numero negativo, non "vicino" a quello
    // giusto — quindi il check 'value' da solo basterebbe gia' a bocciarlo,
    // ma il mustReference blocca ANCHE la variante matematicamente identica
    // ma concettualmente sbagliata: ricalcolare FCF(ultimo)×(1+g)/(WACC-g)
    // direttamente, senza passare per la cella di T1 appena costruita.
    const t2: Task = {
      id: 'T2',
      prompt:
        tx('M7-09-GORDONGROWTH.3', { B_TV, B_FCF1, B_WACC, B_G }),
      targetCell: `Model!${B_TV}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: terminalValue,
          tolerance: 0.001,
          toleranceMode: 'relative',
          message:
            tx('M7-09-GORDONGROWTH.4', { B_FCF1 }),
        },
        { kind: 'mustReference', cells: [B_FCF1, B_WACC, B_G] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['dcf.terminal-value'],
      minKeystrokes: 16,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M7-09-GORDONGROWTH',
      seed: rng.seed,
      brief: [tx('M7-09-GORDONGROWTH.5', { p0: eurM(fcfUltimoAnno), p1: pct(g, 1), p2: pct(wacc, 1) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M7-09-GORDONGROWTH.6')], { style: STILE_TITOLO }),
            riga('A3', [tx('M7-09-GORDONGROWTH.14')], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                tx('M7-09-GORDONGROWTH.7'),
                tx('M7-09-GORDONGROWTH.8'),
                tx('M7-09-GORDONGROWTH.15'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_FCF, content: fcfUltimoAnno, style: STILE_INPUT, locked: true },
              { ref: B_G, content: g, style: STILE_INPUT_PCT, locked: true },
              { ref: B_WACC, content: wacc, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A8', [tx('M7-09-GORDONGROWTH.9')], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                tx('M7-09-GORDONGROWTH.10'),
                tx('M7-09-GORDONGROWTH.11'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_FCF1, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_TV, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 400, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M7-09-GORDONGROWTH.12', { B_FCF, B_G }), 10, 'T1'),
        hint(
          'H2',
          tx('M7-09-GORDONGROWTH.13', { B_FCF1, B_WACC, B_G }),
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 100 }),
      startAt: `Model!${B_FCF1}`,
    };
  },
});
