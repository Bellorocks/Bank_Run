/**
 * M0-F · 07 — Il gruppo collassato: si vede solo il subtotale.
 *
 * NOTA DI IMPLEMENTAZIONE: il raggruppamento vero (outline righe/colonne, il
 * comando Dati > Struttura > Raggruppa, scorciatoia Alt+Maiusc+Destra, e il
 * collasso/espansione con il simbolo +/-) NON e' implementato nel motore.
 * `structure.group` e `structure.ungroup` esistono SOLO come voci della keymap
 * (src/keymap/commands.ts riga 162-163, mappate in src/keymap/bindings.ts
 * riga 293-294 su Alt+Maiusc+Destra/Sinistra) ma non hanno nessuna logica
 * dietro: verificato con grep su src/game/session.ts, che e' dove vivono i
 * comandi di `GridSession` — "group" non compare mai in quel file. Non esiste
 * quindi un modo per un `LevelTemplate` di registrare un outline, ne' un
 * `Check` che lo verifichi. Aggiungerlo era fuori dal perimetro di questo file.
 *
 * Il livello insegna quindi il concetto per via indiretta, seguendo lo stesso
 * pattern di `m0b/06-named-ranges.ts` e `m0f/01-data-table-1way.ts`: costruisce
 * il foglio esattamente come si vedrebbe DENTRO un gruppo raggruppato e
 * collassato in Excel vero — un blocco di dettaglio (le voci di costo) e,
 * subito sotto, il subtotale che le somma. Il task e' sul subtotale: e'
 * l'unico numero che resterebbe visibile quando il gruppo viene chiuso con
 * il simbolo "-" a lato delle righe. Il brief spiega il comando reale
 * (Alt+Maiusc+Destra per raggruppare, Alt+Maiusc+Sinistra per separare, il
 * simbolo +/- che compare nella barra di outline a sinistra) e perche' i
 * modelli IB/PE lunghi si leggono quasi sempre a gruppi collassati.
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
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

import { tx } from '../../../i18n/content';
interface VoceCosto {
  readonly nome: string;
  readonly importo: number;
}

const RIGA_PRIMA_VOCE = 5;

export default defineTemplate({
  id: 'M0F-07-RAGGRUPPAMENTO',
  module: 'M0-F',
  get title() {
    return tx('M0F-07-RAGGRUPPAMENTO.title');
  },
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['xl.grouping', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const voci: readonly VoceCosto[] = [
      { nome: tx('M0F-07-RAGGRUPPAMENTO.2'), importo: roundTo(triangular(r, 180_000, 420_000, 850_000), 5_000) },
      { nome: tx('M0F-07-RAGGRUPPAMENTO.3'), importo: roundTo(triangular(r, 90_000, 220_000, 480_000), 5_000) },
      { nome: tx('M0F-07-RAGGRUPPAMENTO.4'), importo: roundTo(triangular(r, 60_000, 150_000, 320_000), 5_000) },
      { nome: tx('M0F-07-RAGGRUPPAMENTO.5'), importo: roundTo(triangular(r, 120_000, 300_000, 700_000), 5_000) },
      { nome: tx('M0F-07-RAGGRUPPAMENTO.6'), importo: roundTo(triangular(r, 40_000, 95_000, 210_000), 5_000) },
      { nome: tx('M0F-07-RAGGRUPPAMENTO.7'), importo: roundTo(triangular(r, 25_000, 60_000, 140_000), 5_000) },
    ];

    const RIGA_ULTIMA_VOCE = RIGA_PRIMA_VOCE + voci.length - 1; // 10
    const RIGA_SUBTOTALE = RIGA_ULTIMA_VOCE + 2; // 12

    const subtotale = voci.reduce((acc, v) => acc + v.importo, 0);

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        tx('M0F-07-RAGGRUPPAMENTO.8', { RIGA_SUBTOTALE, p1: num(voci.length), RIGA_PRIMA_VOCE, RIGA_ULTIMA_VOCE }),
      target: `Model!B${RIGA_SUBTOTALE}`,
      atteso: subtotale,
      referenzia: [`B${RIGA_PRIMA_VOCE}`, `B${RIGA_ULTIMA_VOCE}`],
      skills: ['xl.aggregates'],
      minKeystrokes: 20,
    });

    const tasks = [t1];

    return {
      templateId: 'M0F-07-RAGGRUPPAMENTO',
      seed: rng.seed,
      brief: [tx('M0F-07-RAGGRUPPAMENTO.9', { p0: num(voci.length) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0F-07-RAGGRUPPAMENTO.10')], { style: STILE_TITOLO }),
            riga('A3', [tx('M0F-07-RAGGRUPPAMENTO.15'), tx('M0F-07-RAGGRUPPAMENTO.11')], { style: STILE_TITOLO }),
            colonna(`A${RIGA_PRIMA_VOCE}`, voci.map((v) => v.nome), { style: STILE_ETICHETTA }),
            blocco(
              `B${RIGA_PRIMA_VOCE}`,
              voci.map((v) => [v.importo]),
              { style: STILE_INPUT },
            ),
            colonna(`A${RIGA_SUBTOTALE}`, [tx('M0F-07-RAGGRUPPAMENTO.12')], { style: STILE_TITOLO }),
            areaLibera([`B${RIGA_SUBTOTALE}`]),
          ],
          {
            colWidths: { A: 280, B: 140 },
            frozenRows: 3,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M0F-07-RAGGRUPPAMENTO.13', { RIGA_PRIMA_VOCE, RIGA_ULTIMA_VOCE }),
          10,
          'T1',
        ),
        hint(
          'H2',
          tx('M0F-07-RAGGRUPPAMENTO.14', { RIGA_PRIMA_VOCE, RIGA_ULTIMA_VOCE }),
          6,
          'T1',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!B${RIGA_SUBTOTALE}`,
    };
  },
});
