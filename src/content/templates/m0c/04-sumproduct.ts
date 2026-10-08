/**
 * M0-C · 04 — SUMPRODUCT: la somma di prodotti, e il suo secondo mestiere.
 *
 * Due punti didattici, entrambi con la stessa funzione:
 *  - T1 e' il mestiere ovvio: fatturato = quantita' per prezzo, riga per riga,
 *    sommato in un colpo solo. Il punto non e' che SUMPRODUCT sappia farlo —
 *    e' che lo fa SENZA una colonna di supporto con i prodotti gia' calcolati.
 *    Chi arriva da un foglio con quella colonna E in piu' non ha sbagliato
 *    aritmetica: ha aggiunto un pezzo di modello che nessuno chiedera' mai
 *    di vedere in un report.
 *  - T2 e' il mestiere meno ovvio: (range="X")*1 trasforma un confronto
 *    VERO/FALSO in un array di 1 e 0, e SUMPRODUCT di quell'array conta le
 *    righe che soddisfano la condizione — lo stesso risultato di COUNTIF,
 *    costruito pero' con gli stessi due mattoni (array, prodotto, somma) del
 *    task precedente. Per questo T2 vieta esplicitamente COUNTIF: la lezione
 *    non e' "conta quelle righe", e' "SUMPRODUCT sa anche contare".
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
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

const PRODOTTI = [
  'Filtri aria industriali',
  'Cinghie di trasmissione',
  'Pompe idrauliche compatte',
  'Sensori di prossimita\'',
  'Quadri elettrici modulari',
  'Motoriduttori',
  'Compressori portatili',
  'Regolatori di pressione',
  'Attuatori pneumatici',
  'Valvole di sicurezza',
  'Giunti flessibili',
  'Centraline di controllo',
] as const;

const CANALI = ['Retail', 'Grossisti', 'Export'] as const;

export default defineTemplate({
  id: 'M0C-04-SUMPRODUCT',
  module: 'M0-C',
  title: 'Un prodotto per riga, una somma sola',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['xl.sumproduct', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const n = r.int(6, 10);
    const prodotti = r.shuffle(PRODOTTI).slice(0, n);
    const canali = prodotti.map(() => r.pick(CANALI));
    const quantita = prodotti.map(() => r.int(20, 480));
    const prezzi = prodotti.map(() => roundTo(triangular(r, 15, 60, 250), 0.5));

    // Il canale bersaglio del task 2: deve comparire ma non deve coprire tutte
    // le righe, altrimenti il conteggio condizionale collassa nel banale "tutte".
    let canaleTarget: (typeof CANALI)[number] = canali[0];
    let conteggioTarget = canali.filter((c) => c === canaleTarget).length;
    if (conteggioTarget === n) {
      const altri = CANALI.filter((c) => c !== canaleTarget);
      canali[n - 1] = r.pick(altri);
      canaleTarget = canali[0];
      conteggioTarget = canali.filter((c) => c === canaleTarget).length;
    }

    const fatturatoTotale = quantita.reduce((acc, q, i) => acc + q * prezzi[i], 0);

    const HEADER_ROW = 3;
    const DATA_START = 4;
    const dataEnd = DATA_START + n - 1;
    const riepilogoRow = dataEnd + 2;
    const t1Row = riepilogoRow + 1;
    const t2Row = t1Row + 1;

    const rangeQuantita = `C${DATA_START}:C${dataEnd}`;
    const rangePrezzi = `D${DATA_START}:D${dataEnd}`;
    const rangeCanali = `B${DATA_START}:B${dataEnd}`;

    const t1: Task = {
      id: 'T1',
      prompt:
        `In B${t1Row} calcola il fatturato totale delle ${num(n)} linee di prodotto: la somma, riga per riga, ` +
        `di quantita' per prezzo unitario. Non aggiungere una colonna di supporto con i prodotti gia' ` +
        'calcolati: fallo con una sola formula su tutta la tabella.',
      targetCell: `Model!B${t1Row}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: fatturatoTotale },
        { kind: 'mustReference', cells: [`C${DATA_START}`, `C${dataEnd}`, `D${DATA_START}`, `D${dataEnd}`] },
        { kind: 'mustNotContainLiteral', except: [] },
        { kind: 'mustUseFunction', functions: ['SUMPRODUCT'] },
      ],
      skills: ['xl.sumproduct'],
      minKeystrokes: 24,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        `In B${t2Row} conta quante linee di prodotto sono state vendute sul canale "${canaleTarget}". ` +
        'Non usare COUNTIF: costruisci il conteggio con SUMPRODUCT, come hai appena fatto per il ' +
        'fatturato — un confronto che diventa un array di VERO/FALSO, trasformato in 1 e 0, e sommato.',
      targetCell: `Model!B${t2Row}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: conteggioTarget,
          message:
            `Il conteggio non torna: deve essere il numero di righe di ${rangeCanali} uguali a "${canaleTarget}".`,
        },
        { kind: 'mustReference', cells: [`B${DATA_START}`, `B${dataEnd}`] },
        { kind: 'mustUseFunction', functions: ['SUMPRODUCT'] },
        { kind: 'mustNotUseFunction', functions: ['COUNTIF'] },
      ],
      skills: ['xl.sumproduct'],
      minKeystrokes: 30,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0C-04-SUMPRODUCT',
      seed: rng.seed,
      brief: [
        '## Il prodotto di due colonne, senza una terza',
        '',
        `Sei in due diligence commerciale su una societa' target. Il registro vendite del mese elenca`,
        `${num(n)} linee di prodotto, con le unita' vendute e il prezzo medio per pezzo di ciascuna.`,
        '',
        'Il **fatturato totale** e\' la somma di quantita\' per prezzo, riga per riga. Potresti scrivere',
        'una colonna E con `=C4*D4` copiata in basso, poi sommarla: funziona, ma lascia nel modello',
        'una colonna che nessuno ti chiedera\' mai di vedere in un report. **`SUMPRODUCT`** fa la',
        'stessa cosa in un colpo solo: moltiplica due intervalli elemento per elemento e somma i',
        'risultati, senza bisogno di appoggiarsi da nessuna parte.',
        '',
        '`SUMPRODUCT(quantita, prezzi)` — due intervalli della stessa forma, separati da una virgola.',
        '',
        'SUMPRODUCT ha pero\' un secondo mestiere, meno ovvio del primo: sa **contare**. Un confronto',
        'come `B4:B13="Retail"` non restituisce un numero: restituisce un array di VERO e FALSO, uno',
        'per riga. Moltiplicarlo per `1` lo trasforma in un array di 1 e 0. Sommare quell\'array —',
        'cioe\' `SUMPRODUCT((B4:B13="Retail")*1)` — da\' esattamente il numero di righe che soddisfano',
        'la condizione: lo stesso risultato di `COUNTIF(B4:B13,"Retail")`, ma costruito con gli stessi',
        'mattoni — array, prodotto, somma — che hai appena usato per il fatturato.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Registro vendite del mese'], { style: STILE_TITOLO }),
            riga(
              `A${HEADER_ROW}`,
              ['Linea di prodotto', 'Canale', "Quantita' (pz)", 'Prezzo unitario (€/pz)'],
              { style: STILE_TITOLO },
            ),
            colonna(`A${DATA_START}`, prodotti, { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, canali, { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, quantita, { style: STILE_INPUT }),
            colonna(`D${DATA_START}`, prezzi, { style: { ...STILE_INPUT, numFmt: '#,##0.0' } }),

            riga(`A${riepilogoRow}`, ['Riepilogo'], { style: STILE_TITOLO }),
            blocco(`A${t1Row}`, [['Fatturato totale (€)']], { style: STILE_ETICHETTA }),
            blocco(`A${t2Row}`, [[`Linee vendute su canale "${canaleTarget}"`]], { style: STILE_ETICHETTA }),

            areaLibera([`B${t1Row}`, `B${t2Row}`]),
          ],
          { colWidths: { A: 250, B: 150, C: 130, D: 170 }, frozenRows: HEADER_ROW },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `SUMPRODUCT(${rangeQuantita},${rangePrezzi}): moltiplica ogni riga di quantita' per la riga corrispondente di prezzo e somma tutto, senza bisogno di una colonna in piu'.`,
          12,
          'T1',
        ),
        hint(
          'H2',
          `SUMPRODUCT((${rangeCanali}="${canaleTarget}")*1): il confronto produce VERO/FALSO per ogni riga, il *1 lo trasforma in 1/0, SUMPRODUCT somma quell'array.`,
          14,
          'T2',
        ),
        hint('H3', `${eur(fatturatoTotale)} e' il fatturato atteso: se il tuo numero e' diverso, controlla di aver preso gli stessi ${num(n)} righe per entrambi gli intervalli.`, 8, 'T1'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!B${t1Row}`,
    };
  },
});
