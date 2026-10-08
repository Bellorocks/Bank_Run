/**
 * M0-C · 02 — MATCH: esatto (0) o approssimato (1)?
 *
 * Il punto didattico e' il disastro del terzo argomento omesso (spec §5): MATCH
 * senza terzo argomento assume 1, cioe' "il piu' grande valore minore o uguale,
 * in un elenco ordinato crescente". Su un elenco NON ordinato quell'ipotesi e'
 * falsa, ma Excel non lo controlla: restituisce un numero plausibile, senza
 * nessun cancelletto rosso. E' l'errore silenzioso per eccellenza — si scopre
 * mesi dopo, quando qualcuno confronta il totale con la fonte originale.
 *
 *  - T1: l'elenco delle pratiche e' ordinato per data di arrivo, non per ID.
 *    Serve match ESATTO (terzo argomento 0). Ometterlo o sbagliarlo produce
 *    quasi sempre un numero diverso da quello atteso: il check "value" con
 *    tolleranza stretta basta da solo a bocciarlo, senza bisogno di leggere
 *    la formula carattere per carattere.
 *  - T2 e' il caso gemello e complementare: una griglia di scaglioni di leva,
 *    ORDINATA crescente apposta. Qui il match approssimato non e' un errore,
 *    e' l'unico modo corretto di trovare "la fascia giusta" quando il valore
 *    cercato non compare mai esattamente nella colonna.
 *
 * Senza T2 il livello insegnerebbe "usa sempre 0", che e' falso quanto "MATCH
 * funziona sempre cosi'": l'approssimato esiste ed e' lo strumento giusto
 * quando — e solo quando — l'ordinamento e' garantito.
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
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  multiplo,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

const CLIENTI = [
  'Meccanica Trentina',
  'Vetro Optical Group',
  'Ortofrutticola Emiliana',
  'Cartotecnica Levante',
  'Serramenti Alpini',
  'Ittica Adriatica',
  'Termoidraulica Vesuviana',
  'Componenti Automotive Piemonte',
  'Editoria Tecnica Milano',
  'Agritech Puglia',
] as const;

const N_PRATICHE = 7;
const N_SCAGLIONI = 5;

export default defineTemplate({
  id: 'M0C-02-MATCHTIPO',
  module: 'M0-C',
  title: 'MATCH: esatto o approssimato?',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 270,
  skills: ['xl.match-exact', 'xl.index-match'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // ------------------------------------------------------------------
    // Tabella 1: pratiche registrate per data di arrivo, NON per ID.
    // ------------------------------------------------------------------
    const clientiMescolati = r.shuffle(CLIENTI);
    const clientiPratiche = clientiMescolati.slice(0, N_PRATICHE);
    const clienteLeva = clientiMescolati[N_PRATICHE]; // uno dei rimasti, per la tabella 2

    const idsSet = new Set<number>();
    while (idsSet.size < N_PRATICHE) {
      idsSet.add(r.int(1000, 9999));
    }
    const ids = [...idsSet];
    // Sicurezza: la lista deve percepirsi come non ordinata. Con ID casuali
    // capita per costruzione quasi sempre, ma se il seed produce per caso una
    // sequenza gia' crescente o decrescente si scambiano le prime due righe.
    const crescente = ids.every((v, i) => i === 0 || v >= ids[i - 1]);
    const decrescente = ids.every((v, i) => i === 0 || v <= ids[i - 1]);
    if (crescente || decrescente) {
      [ids[0], ids[1]] = [ids[1], ids[0]];
    }

    const fees = ids.map(() => roundTo(triangular(r, 60_000, 140_000, 320_000), 1_000));

    const targetIdx = r.int(1, N_PRATICHE - 2); // mai la prima ne' l'ultima riga
    const targetId = ids[targetIdx];
    const targetFee = fees[targetIdx];

    // ------------------------------------------------------------------
    // Tabella 2: scaglioni di margine per leva d'ingresso, ordinati crescenti.
    // ------------------------------------------------------------------
    const bp: number[] = [0];
    for (let i = 1; i < N_SCAGLIONI; i++) {
      bp.push(roundTo(bp[i - 1] + triangular(r, 0.6, 0.9, 1.3), 0.1));
    }
    const margini: number[] = [r.int(220, 300)];
    for (let i = 1; i < N_SCAGLIONI; i++) {
      margini.push(margini[i - 1] + r.int(40, 90));
    }

    const k = r.int(1, N_SCAGLIONI - 2); // scaglione con un vicino sopra e uno sotto
    const frazione = 0.2 + r.next() * 0.6;
    let leva = roundTo(bp[k] + frazione * (bp[k + 1] - bp[k]), 0.1);
    if (leva <= bp[k]) leva = roundTo(bp[k] + 0.1, 0.1);
    if (leva >= bp[k + 1]) leva = roundTo(bp[k + 1] - 0.1, 0.1);
    const margineAtteso = margini[k];

    // ------------------------------------------------------------------
    // Task
    // ------------------------------------------------------------------
    const t1: Task = {
      id: 'T1',
      prompt:
        `In B13 trova la fee di advisory della pratica con ID ${targetId}. L'elenco qui sopra e' ` +
        "ordinato per data di arrivo in ufficio, non per ID: cercarla scorrendo a occhio funziona, " +
        'ma la formula deve funzionare anche quando le pratiche saranno cento. Il terzo argomento ' +
        "di MATCH decide come cerca: 0 vuol dire \"trova esattamente questo valore\", 1 (il default " +
        "se lo ometti) vuol dire \"trova il piu' grande valore minore o uguale, assumendo che la " +
        "colonna sia ordinata crescente\". Su un elenco non ordinato per ID quell'ipotesi e' falsa, " +
        "e il risultato non e' un errore: e' un numero plausibile ma sbagliato.",
      targetCell: 'Model!B13',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: targetFee,
          tolerance: 0.01,
          toleranceMode: 'absolute',
          message:
            "Il valore non torna: su un elenco non ordinato il match approssimato non da' errore, " +
            "da' un'altra riga. Controlla il terzo argomento di MATCH.",
        },
        { kind: 'mustReference', cells: ['A4', 'A10', 'C4', 'C10', 'B12'] },
        { kind: 'mustUseFunction', functions: ['INDEX', 'MATCH'], quantifier: 'all' },
        { kind: 'mustNotContainLiteral', except: [0] },
      ],
      skills: ['xl.match-exact', 'xl.index-match'],
      minKeystrokes: 26,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        `In B24 calcola il margine applicabile alla leva d'ingresso di ${clienteLeva}, ${multiplo(leva)}, ` +
        "usando la griglia degli scaglioni qui sopra. Attenzione: qui la colonna delle leve minime " +
        "E' ordinata in modo crescente apposta — e' l'unico caso in cui MATCH puo' cercare " +
        "\"il piu' grande valore minore o uguale\" invece del valore esatto, perche' quella leva " +
        "non compare mai identica in tabella. Trova la fascia giusta, non quella piu' vicina.",
      targetCell: 'Model!B24',
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: margineAtteso,
          tolerance: 0.01,
          toleranceMode: 'absolute',
          message:
            "Il margine non torna: con il match esatto su un valore che non compare in tabella " +
            'ottieni #N/A, non un numero. Qui serve il match approssimato.',
        },
        { kind: 'mustReference', cells: ['A17', 'A21', 'B17', 'B21', 'B23'] },
        { kind: 'mustUseFunction', functions: ['INDEX', 'MATCH'], quantifier: 'all' },
        { kind: 'mustNotContainLiteral', except: [1] },
      ],
      skills: ['xl.match-exact', 'xl.index-match'],
      minKeystrokes: 26,
    };

    const tasks = [t1, t2];

    return {
      templateId: 'M0C-02-MATCHTIPO',
      seed: rng.seed,
      brief: [
        '## Il terzo argomento che nessuno guarda',
        '',
        '`MATCH(valore_cercato, matrice, tipo_corrispondenza)` ha un terzo argomento che quasi',
        "tutti dimenticano. Non e' un dettaglio: cambia radicalmente come cerca.",
        '',
        '- **0** = corrispondenza esatta. Trova quel valore preciso, ovunque sia, in qualunque ordine',
        '  sia la lista. Se non lo trova, `#N/A`.',
        '- **1** (il default se lo ometti) = corrispondenza approssimata. Assume che la lista sia',
        "  ordinata **crescente** e restituisce il piu' grande valore minore o uguale a quello cercato.",
        '',
        `Sotto trovi le ultime ${num(N_PRATICHE)} pratiche del desk, registrate nell'ordine in cui sono`,
        "arrivate — non per ID. Su una lista cosi', un match approssimato non solleva nessun errore:",
        'restituisce comunque una riga, con un numero dentro, e quel numero sembra vero. Lo scopri',
        "sbagliato solo quando qualcuno confronta il totale con la fattura originale — mesi dopo,",
        "in riunione, con il cliente sbagliato in bocca.",
        '',
        `Il caso opposto e' la seconda tabella: gli scaglioni di margine per leva d'ingresso, dal`,
        `${multiplo(bp[0])} in su. Qui l'ordine crescente e' garantito, e serve DAVVERO: la leva reale`,
        "di un'operazione quasi mai coincide esattamente con una soglia di tabella, quindi il match",
        "esatto darebbe sempre `#N/A`. Il match approssimato non e' un ripiego qui: e' lo strumento",
        "giusto per trovare \"in quale fascia cado\".",
        '',
        "La differenza fra i due livelli non e' la formula — e' se l'elenco sotto e' ordinato o no.",
        "Guardalo prima di scrivere MATCH, non dopo che il numero e' gia' sbagliato.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Pipeline del Deal Desk'], { style: STILE_TITOLO }),
            riga('A3', ['ID pratica', 'Cliente', 'Fee di advisory (€)'], { style: STILE_TITOLO }),
            colonna('A4', ids, { style: { ...STILE_INPUT, numFmt: '0000' } }),
            colonna('B4', clientiPratiche, { style: STILE_ETICHETTA }),
            colonna('C4', fees, { style: { ...STILE_INPUT, numFmt: '#,##0" €"' } }),

            blocco('A12', [['Pratica da cercare (ID)']], { style: STILE_ETICHETTA }),
            blocco('B12', [[targetId]], { style: { ...STILE_INPUT, numFmt: '0000' } }),
            blocco('A13', [['Fee di advisory trovata (€)']], { style: STILE_ETICHETTA }),

            riga('A15', ["Griglia margine per leva d'ingresso"], { style: STILE_TITOLO }),
            riga('A16', ['Leva minima (x)', 'Margine (bps)'], { style: STILE_TITOLO }),
            colonna('A17', bp, { style: STILE_INPUT_MULTIPLO }),
            colonna('B17', margini, { style: { ...STILE_INPUT, numFmt: '#,##0" bps"' } }),

            blocco('A23', [[`Leva d'ingresso di ${clienteLeva} (x)`]], { style: STILE_ETICHETTA }),
            blocco('B23', [[leva]], { style: STILE_INPUT_MULTIPLO }),
            blocco('A24', [['Margine applicabile (bps)']], { style: STILE_ETICHETTA }),

            areaLibera(['B13', 'B24']),
          ],
          { colWidths: { A: 260, B: 190, C: 190 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "INDEX(C4:C10, MATCH(B12, A4:A10, 0)): il terzo argomento di MATCH e' 0, non 1 e non vuoto.",
          10,
          'T1',
        ),
        hint(
          'H2',
          "Se lasci vuoto il terzo argomento, Excel assume 1: su una lista ordinata per data e non " +
            "per ID il risultato e' un'altra pratica, con un numero che sembra vero.",
          10,
          'T1',
        ),
        hint(
          'H3',
          "INDEX(B17:B21, MATCH(B23, A17:A21, 1)): qui il terzo argomento e' 1 (o puoi ometterlo) " +
            "perche' la colonna delle leve minime e' ordinata crescente — l'unico caso in cui va bene.",
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 80 }),
      startAt: 'Model!B13',
    };
  },
});
