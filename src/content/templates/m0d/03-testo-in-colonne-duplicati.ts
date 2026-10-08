/**
 * M0-D · 03 — Dati sporchi: il doppione che gonfia il totale.
 *
 * Il tema dello spec per questo slot e' "Testo in colonne" + "Rimuovi duplicati".
 * Al momento in cui questo file e' stato scritto, GridSession/Workbook
 * (src/game/session.ts, src/engine/workbook.ts) NON espongono comandi nativi per
 * nessuno dei due (verificato: nessun risultato per "textToColumns|removeDuplicates"
 * nei sorgenti) — sono funzioni avanzate non ancora implementate nel motore.
 *
 * Questo livello allena il concetto affine con gli strumenti gia' disponibili:
 * un elenco con un doppione vero (stesso fornitore, stesso importo, incollato
 * due volte) che il giocatore deve TROVARE A MANO — sul modello del task T2 di
 * `m0a/01-riferimenti.ts`, un check testuale sul riferimento della cella — e poi
 * CORREGGERE nel totale senza poter cancellare la riga (in un modello vero non
 * si cancella mai una riga a cuor leggero: si documenta la rettifica). Il brief
 * spiega cosa farebbero "Rimuovi duplicati" e "Testo in colonne" in Excel vero;
 * il foglio mostra anche un esempio di dato incollato in blocco unico, cosi' la
 * spiegazione ha qualcosa di concreto sotto gli occhi. Vedi STATO.md/openIssues:
 * i comandi nativi restano lavoro futuro per session.ts.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
const FORNITORI = () => ([
  tx('M0D-03-PULIZIADATI.1'),
  tx('M0D-03-PULIZIADATI.2'),
  tx('M0D-03-PULIZIADATI.3'),
  tx('M0D-03-PULIZIADATI.4'),
  tx('M0D-03-PULIZIADATI.5'),
  tx('M0D-03-PULIZIADATI.6'),
  tx('M0D-03-PULIZIADATI.7'),
  tx('M0D-03-PULIZIADATI.8'),
  tx('M0D-03-PULIZIADATI.9'),
  tx('M0D-03-PULIZIADATI.10'),
] as const);

const N_UNICI = 7;
const RIGA_INIZIO = 4;

export default defineTemplate({
  id: 'M0D-03-PULIZIADATI',
  module: 'M0-D',
  get title() {
    return tx('M0D-03-PULIZIADATI.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.dedup', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const nomi = r.shuffle(FORNITORI()).slice(0, N_UNICI);
    const importi = nomi.map(() => roundTo(triangular(r, 1500, 6000, 32000), 50));
    const unici = nomi.map((nome, i) => ({ nome, importo: importi[i] }));

    // Il doppione: lo stesso fornitore, con lo stesso importo, ricomparso piu'
    // in basso nell'elenco — esattamente come lo produce un copia-incolla da un
    // export CRM fatto scrollando due volte sullo stesso blocco.
    const idxDup = r.int(0, N_UNICI - 1);
    const posInserimento = r.int(idxDup + 1, N_UNICI); // indice nell'elenco finale
    const duplicato = { ...unici[idxDup] };
    const elenco = [...unici.slice(0, posInserimento), duplicato, ...unici.slice(posInserimento)];

    const rigaDuplicato = RIGA_INIZIO + posInserimento;
    const rigaFine = RIGA_INIZIO + elenco.length - 1;
    const refNomeDuplicato = `A${rigaDuplicato}`;
    const refImportoDuplicato = `B${rigaDuplicato}`;
    const refPrimaRiga = `B${RIGA_INIZIO}`;
    const refUltimaRiga = `B${rigaFine}`;

    const totaleCorretto = importi.reduce((acc, v) => acc + v, 0);
    const totaleGrezzo = totaleCorretto + duplicato.importo;

    const rigaTotaleGrezzo = rigaFine + 1;
    const rigaRispostaDup = rigaFine + 2;
    const rigaRispostaTotale = rigaFine + 3;
    const rigaRispostaConteggio = rigaFine + 4;
    const rigaEsempioGrezzo = rigaFine + 6;

    const esempioGrezzo = `${elenco[0].nome};${elenco[0].importo}`;

    const t1: Task = {
      id: 'T1',
      prompt:
        tx('M0D-03-PULIZIADATI.12', { rigaRispostaDup }),
      targetCell: `Model!B${rigaRispostaDup}`,
      check: [{ kind: 'text', expected: refNomeDuplicato }],
      skills: ['xl.dedup'],
      minKeystrokes: 4,
    };

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M0D-03-PULIZIADATI.13', { rigaRispostaTotale }),
      target: `Model!B${rigaRispostaTotale}`,
      atteso: totaleCorretto,
      referenzia: [refPrimaRiga, refUltimaRiga, refImportoDuplicato],
      senzaLiteral: [],
      skills: ['xl.dedup', 'xl.aggregates'],
      minKeystrokes: 16,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M0D-03-PULIZIADATI.14', { rigaRispostaConteggio }),
      target: `Model!B${rigaRispostaConteggio}`,
      atteso: N_UNICI,
      referenzia: [`A${RIGA_INIZIO}`, `A${rigaFine}`],
      senzaLiteral: [1],
      skills: ['xl.dedup', 'xl.aggregates'],
      minKeystrokes: 10,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0D-03-PULIZIADATI',
      seed: rng.seed,
      brief: [tx('M0D-03-PULIZIADATI.15', { p0: num(elenco.length), p1: num(rigaEsempioGrezzo), p2: eur(duplicato.importo), p3: eur(totaleGrezzo), p4: eur(totaleCorretto), p5: eur(duplicato.importo) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0D-03-PULIZIADATI.16')], { style: STILE_TITOLO }),
            riga('A3', [tx('M0D-03-PULIZIADATI.26'), tx('M0D-03-PULIZIADATI.17')], { style: STILE_TITOLO }),
            colonna(
              'A' + RIGA_INIZIO,
              elenco.map((e) => e.nome),
              { style: STILE_ETICHETTA },
            ),
            colonna(
              'B' + RIGA_INIZIO,
              elenco.map((e) => e.importo),
              { style: STILE_INPUT },
            ),
            blocco('A' + rigaTotaleGrezzo, [[tx('M0D-03-PULIZIADATI.18')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('B' + rigaTotaleGrezzo, [[totaleGrezzo]], { style: STILE_TOTALE }),
            blocco('A' + rigaRispostaDup, [[tx('M0D-03-PULIZIADATI.19')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('A' + rigaRispostaTotale, [[tx('M0D-03-PULIZIADATI.20')]], {
              style: STILE_ETICHETTA,
            }),
            blocco('A' + rigaRispostaConteggio, [[tx('M0D-03-PULIZIADATI.21')]], {
              style: STILE_ETICHETTA,
            }),
            blocco(
              'A' + rigaEsempioGrezzo,
              [[tx('M0D-03-PULIZIADATI.22')]],
              { style: STILE_ETICHETTA },
            ),
            blocco('B' + rigaEsempioGrezzo, [[esempioGrezzo]], { locked: true }),
            areaLibera([`B${rigaRispostaDup}`, `B${rigaRispostaTotale}`, `B${rigaRispostaConteggio}`]),
          ],
          { colWidths: { A: 340, B: 200 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0D-03-PULIZIADATI.23'),
          8,
          'T1',
        ),
        hint(
          'H2',
          tx('M0D-03-PULIZIADATI.24', { RIGA_INIZIO, rigaFine }),
          10,
          'T2',
        ),
        hint('H3', tx('M0D-03-PULIZIADATI.25'), 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: `Model!B${rigaRispostaDup}`,
    };
  },
});
