/**
 * M0-B · 05 — Riferimenti fra fogli.
 *
 * Fin qui ogni formula viveva dentro un solo foglio: `B2` bastava da solo perche'
 * il contesto era ovvio. Un modello vero non sta mai su un foglio solo, e la
 * sintassi che collega due fogli e' `Foglio!A1` — con una trappola sola, ma
 * frequente: se il nome del foglio contiene uno spazio (o qualsiasi carattere
 * che non sia lettera, cifra, underscore o punto), Excel pretende gli apici
 * singoli attorno al nome, altrimenti legge `Conto` ed `Economico!A1` come due
 * cose diverse e si rompe.
 *
 * Struttura in due passi apposta: prima si scrive il riferimento come TESTO
 * (T2, sul modello di M0A-01·T2), cosi' la sintassi si vede senza che il
 * risultato di una formula la nasconda; poi lo stesso riferimento rientra in
 * una formula vera (T3), dove serve davvero.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';
import { revenue } from '../../../rng/finance';

import { tx } from '../../../i18n/content';
const FOGLIO_DATI = () => (tx('M0B-05-CROSSSHEET.1'));
const RIF_ONERI = () => `'${FOGLIO_DATI()}'!B2`;

export default defineTemplate({
  id: 'M0B-05-CROSSSHEET',
  module: 'M0-B',
  get title() {
    return tx('M0B-05-CROSSSHEET.title');
  },
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.cross-sheet', 'xl.references'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ricavi = revenue(r);
    const quotaCosti = 0.55 + r.next() * 0.3;
    const costiOperativi = Math.round((ricavi * quotaCosti) / 500) * 500;
    const margineOperativo = ricavi - costiOperativi;

    // Legati al margine, non a un range fisso: oneri finanziari plausibili
    // (una manciata di punti di margine), mai cosi' grandi da mandare in
    // rosso l'utile netto.
    const quotaOneri = 0.05 + r.next() * 0.22;
    const oneriFinanziari = Math.round((margineOperativo * quotaOneri) / 500) * 500;
    const utileNetto = margineOperativo - oneriFinanziari;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          tx('M0B-05-CROSSSHEET.3'),
        target: 'Model!B5',
        atteso: margineOperativo,
        referenzia: ['B2', 'B3'],
        skills: ['xl.references'],
        minKeystrokes: 8,
      }),
      {
        id: 'T2',
        prompt:
          tx('M0B-05-CROSSSHEET.4', { FOGLIO_DATI: FOGLIO_DATI() }),
        targetCell: 'Model!B7',
        check: [{ kind: 'text' as const, expected: RIF_ONERI() }],
        skills: ['xl.cross-sheet'],
        minKeystrokes: RIF_ONERI().length,
      },
      taskFormula({
        id: 'T3',
        prompt:
          tx('M0B-05-CROSSSHEET.5'),
        target: 'Model!B9',
        atteso: utileNetto,
        referenzia: ['B5', RIF_ONERI()],
        skills: ['xl.cross-sheet'],
        minKeystrokes: 4 + RIF_ONERI().length,
      }),
    ];

    return {
      templateId: 'M0B-05-CROSSSHEET',
      seed: rng.seed,
      brief: [tx('M0B-05-CROSSSHEET.6', { FOGLIO_DATI: FOGLIO_DATI(), p1: eur(ricavi), p2: eur(costiOperativi) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0B-05-CROSSSHEET.7')], { style: STILE_TITOLO }),
            blocco('A2', [[tx('M0B-05-CROSSSHEET.17')], [tx('M0B-05-CROSSSHEET.8')]], { style: STILE_ETICHETTA }),
            blocco('B2', [[ricavi], [costiOperativi]], { style: STILE_INPUT }),
            blocco('A5', [[tx('M0B-05-CROSSSHEET.9')]], { style: STILE_ETICHETTA }),
            blocco('A7', [[tx('M0B-05-CROSSSHEET.10', { FOGLIO_DATI: FOGLIO_DATI() })]], {
              style: STILE_ETICHETTA,
            }),
            blocco('A9', [[tx('M0B-05-CROSSSHEET.11')]], { style: STILE_ETICHETTA }),
            areaLibera(['B5', 'B7', 'B9']),
          ],
          { colWidths: { A: 320, B: 140 }, frozenRows: 1 },
        ),
        foglio(
          FOGLIO_DATI(),
          [
            riga('A1', [tx('M0B-05-CROSSSHEET.12')], { style: STILE_TITOLO }),
            blocco('A2', [[tx('M0B-05-CROSSSHEET.13')]], { style: STILE_ETICHETTA }),
            blocco('B2', [[oneriFinanziari]], { style: STILE_INPUT }),
          ],
          { colWidths: { A: 220, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', tx('M0B-05-CROSSSHEET.14'), 8, 'T1'),
        hint(
          'H2',
          tx('M0B-05-CROSSSHEET.15', { FOGLIO_DATI: FOGLIO_DATI(), RIF_ONERI: RIF_ONERI() }),
          12,
          'T2',
        ),
        hint('H3', tx('M0B-05-CROSSSHEET.16'), 10, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: 'Model!B5',
    };
  },
});
