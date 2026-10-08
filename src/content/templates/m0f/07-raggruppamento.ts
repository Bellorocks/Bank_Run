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

interface VoceCosto {
  readonly nome: string;
  readonly importo: number;
}

const RIGA_PRIMA_VOCE = 5;

export default defineTemplate({
  id: 'M0F-07-RAGGRUPPAMENTO',
  module: 'M0-F',
  title: 'Il gruppo collassato: si vede solo il subtotale',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['xl.grouping', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const voci: readonly VoceCosto[] = [
      { nome: 'Advisory (M&A, legale)', importo: roundTo(triangular(r, 180_000, 420_000, 850_000), 5_000) },
      { nome: 'Due diligence finanziaria', importo: roundTo(triangular(r, 90_000, 220_000, 480_000), 5_000) },
      { nome: 'Due diligence commerciale', importo: roundTo(triangular(r, 60_000, 150_000, 320_000), 5_000) },
      { nome: 'Financing fee', importo: roundTo(triangular(r, 120_000, 300_000, 700_000), 5_000) },
      { nome: 'Assicurazioni W&I', importo: roundTo(triangular(r, 40_000, 95_000, 210_000), 5_000) },
      { nome: 'Altri costi di transazione', importo: roundTo(triangular(r, 25_000, 60_000, 140_000), 5_000) },
    ];

    const RIGA_ULTIMA_VOCE = RIGA_PRIMA_VOCE + voci.length - 1; // 10
    const RIGA_SUBTOTALE = RIGA_ULTIMA_VOCE + 2; // 12

    const subtotale = voci.reduce((acc, v) => acc + v.importo, 0);

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In B${RIGA_SUBTOTALE} calcola il subtotale dei costi di transazione: la somma delle ${num(voci.length)} voci ` +
        `di dettaglio da B${RIGA_PRIMA_VOCE} a B${RIGA_ULTIMA_VOCE}. Questo e' l'unico numero che resterebbe visibile se il ` +
        'dettaglio qui sopra fosse un gruppo raggruppato e collassato: il resto del modello lo guarda cosi\'.',
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
      brief: [
        '## Raggruppare righe: il dettaglio si apre solo quando serve',
        '',
        'Un modello di deal lungo — decine o centinaia di righe — non si legge mai tutto disteso.',
        'Si legge **a gruppi collassati**: solo i subtotali, le sezioni chiuse, i numeri che',
        'contano davvero in quel momento. Il dettaglio si apre solo quando serve controllarlo.',
        '',
        'In Excel vero questo si fa con il **raggruppamento di righe (outline)**: selezioni le',
        'righe di dettaglio, poi **Dati > Struttura > Raggruppa** (o la scorciatoia diretta,',
        '**Alt+Maiusc+Destra**), e a sinistra dei numeri di riga compare una barra di outline con',
        'un simbolo **"−"**: cliccandolo il dettaglio si nasconde e resta visibile solo la riga',
        'del subtotale, con un **"+"** al suo posto per riaprirlo quando serve. Per separare un',
        'gruppo si usa **Alt+Maiusc+Sinistra**. E\' lo stesso principio dei livelli di outline',
        '(1, 2, 3...) che vedi nell\'angolo in alto a sinistra della barra di struttura: un click',
        'su "1" collassa tutto, un click su "2" apre solo il primo livello, e cosi\' via.',
        '',
        '*(Questo trainer non genera ancora un outline vero — collassare/espandere righe e' +
          ' un comando che richiederebbe un supporto per la struttura del foglio che il motore di',
        'gioco non ha ancora; le scorciatoie Alt+Maiusc+Destra/Sinistra esistono gia\' nella',
        'mappa tasti ma senza logica dietro. L\'esercizio allena pero\' esattamente cosa RESTA',
        'visibile quando un gruppo si chiude: costruisci il blocco di dettaglio esattamente come',
        'si vedrebbe dentro un gruppo aperto, e il subtotale esattamente come si vedrebbe con',
        'quel gruppo collassato — e\' il numero su cui il resto del modello si appoggia.)*',
        '',
        '## Il caso',
        '',
        `Stai chiudendo l'acquisizione e devi sommare i costi di transazione: ${num(voci.length)} voci di`,
        'dettaglio — parcelle di advisory, due diligence, financing fee, assicurazioni — che in',
        'un modello vero starebbero raggruppate sotto un\'unica riga di subtotale, cosi\' il resto',
        'del piano puo\' riferirsi a un numero solo senza dover riaprire il dettaglio ogni volta.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Costi di transazione'], { style: STILE_TITOLO }),
            riga('A3', ['Voce', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna(`A${RIGA_PRIMA_VOCE}`, voci.map((v) => v.nome), { style: STILE_ETICHETTA }),
            blocco(
              `B${RIGA_PRIMA_VOCE}`,
              voci.map((v) => [v.importo]),
              { style: STILE_INPUT },
            ),
            colonna(`A${RIGA_SUBTOTALE}`, ['Subtotale costi di transazione'], { style: STILE_TITOLO }),
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
          `SUM sull'intero intervallo di dettaglio: =SUM(B${RIGA_PRIMA_VOCE}:B${RIGA_ULTIMA_VOCE}).`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `In Excel vero selezioneresti le righe ${RIGA_PRIMA_VOCE}-${RIGA_ULTIMA_VOCE} e premeresti Alt+Maiusc+Destra per raggrupparle: il subtotale che scrivi qui e' esattamente il numero che resterebbe visibile a gruppo chiuso.`,
          6,
          'T1',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!B${RIGA_SUBTOTALE}`,
    };
  },
});
