/**
 * M0-D · 04 — Diagnosi: leggere una formula prima di fidarsi del suo output.
 *
 * Modalita' AUDIT: qui non si scrive un modello, lo si controlla. Il foglio
 * arriva con tre formule GIA' scritte (celle bloccate), tutte e tre senza un
 * cancelletto rosso in vista. Due sono corrette. Una ha un riferimento alla
 * colonna sbagliata nel denominatore — un errore da una lettera sola, dello
 * stesso tipo di quelli che sopravvivono mesi in un modello vero perche' il
 * numero che produce e' plausibile, non assurdo.
 *
 * Il punto didattico non e' "trova l'errore": e' "non fidarti del numero
 * finche' non hai riletto la formula". Per questo il task non chiede di
 * CORREGGERE la cella (sarebbe un esercizio di editing), ma di scrivere altrove
 * il valore che quella cella DOVREBBE mostrare — cosa impossibile da fare senza
 * aver prima capito perche' il numero attuale e' sbagliato.
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
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { SECTORS, ebitdaMargin } from '../../../rng/finance';
import { roundTo, triangular } from '../../../rng/distributions';
import type { SeededRandom } from '../../../rng/SeededRandom';
import type { Task } from '../../types';

const DIVISIONI = [
  'Divisione Nord',
  'Divisione Sud',
  'Divisione Export',
  'Divisione Retail',
  'Divisione Grande Distribuzione',
  'Divisione Online',
] as const;

/** Tre nomi distinti, nell'ordine in cui finiscono in tabella. */
function treDivisioni(rng: SeededRandom): string[] {
  const scelte: string[] = [];
  const disponibili = [...DIVISIONI];
  for (let i = 0; i < 3; i++) {
    const idx = rng.int(0, disponibili.length - 1);
    scelte.push(disponibili[idx]);
    disponibili.splice(idx, 1);
  }
  return scelte;
}

interface RigaDivisione {
  readonly nome: string;
  readonly ricavi: number;
  readonly costi: number;
  /** Margine EBITDA vero: (ricavi - costi) / ricavi, la formula corretta. */
  readonly margine: number;
}

export default defineTemplate({
  id: 'M0D-04-DIAGNOSI',
  module: 'M0-D',
  title: 'Il numero plausibile ma falso',
  rank: 2,
  mode: 'AUDIT',
  estimatedSeconds: 240,
  skills: ['xl.trace', 'xl.f9'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const rNomi = rng.fork('nomi');
    const rNumeri = rng.fork('numeri');
    const rSettore = rng.fork('settore');
    const rBug = rng.fork('bug');

    const settore = rSettore.pick(SECTORS);
    const nomi = treDivisioni(rNomi);

    const righe: RigaDivisione[] = nomi.map((nome) => {
      const ricavi = roundTo(triangular(rNumeri, 400_000, 900_000, 2_500_000), 1000);
      const margine = ebitdaMargin(rNumeri, settore);
      // ricavi e' multiplo di 1.000, margine e' multiplo di 0,001: il prodotto
      // e' sempre un intero, quindi il margine ricostruito da (ricavi-costi)/ricavi
      // torna ESATTAMENTE margine, senza rumore di arrotondamento da inseguire.
      const costiAssoluti = ricavi * margine;
      const costi = ricavi - costiAssoluti;
      return { nome, ricavi, costi, margine };
    });

    const bugIdx = rBug.int(0, 2);
    const rigaSbagliata = righe[bugIdx];

    // Le tre formule della colonna D, gia' scritte e bloccate. Quella in
    // posizione bugIdx punta al denominatore sbagliato (Costi invece di
    // Ricavi): stesso schema, una lettera diversa, nessun errore Excel.
    const formuleD = righe.map((_, i) => {
      const rNum = 4 + i;
      const denominatore = i === bugIdx ? 'C' : 'B';
      return `=(B${rNum}-C${rNum})/${denominatore}${rNum}`;
    });

    const task: Task = {
      id: 'T1',
      prompt:
        'Per ciascuna divisione il margine EBITDA dovrebbe essere ricavi meno costi, diviso ricavi. ' +
        "Una delle tre percentuali in D4:D6 non e' calcolata cosi': il denominatore punta alla colonna " +
        "sbagliata. Non c'e' nessun errore in vista — il numero che vedi e' plausibile, e' solo falso. " +
        'Controlla i riferimenti dentro ciascuna formula (F2 le evidenzia, F9 su un pezzo selezionato la ' +
        "calcola) prima di fidarti di quello che leggi. Trovata quella sbagliata, scrivi in B8 il valore " +
        'CORRETTO che quella cella dovrebbe mostrare.',
      targetCell: 'Model!B8',
      check: [
        {
          kind: 'value',
          expected: rigaSbagliata.margine,
          message:
            "Il valore non e' il margine EBITDA corretto di quella divisione: ricalcola ricavi meno " +
            "costi, diviso ricavi, per la riga che hai individuato come sbagliata — non fidarti del " +
            'numero che la colonna D mostra li\'.',
        },
      ],
      skills: ['xl.trace'],
      minKeystrokes: 6,
    };

    const tasks = [task];

    return {
      templateId: 'M0D-04-DIAGNOSI',
      seed: rng.seed,
      brief: [
        '## Un numero sbagliato non sempre grida',
        '',
        "Finora un errore in un foglio si e' sempre visto: un cancelletto rosso, `#DIV/0!`, `#REF!`.",
        "Quello che segue e' piu' pericoloso perche' non si vede affatto.",
        '',
        `Sotto ci sono tre divisioni dello stesso gruppo, settore **${settore}**. Per ciascuna la colonna`,
        '**D** calcola gia\' il margine EBITDA: ricavi meno costi, diviso ricavi. Le formule sono scritte',
        "e bloccate — non le devi editare — e nessuna delle tre restituisce un errore.",
        '',
        "Una pero' e' sbagliata. Non nel segno, non nella sottrazione: nel **denominatore**. Invece di",
        'dividere per i ricavi, divide per i costi. La differenza fra "colonna B" e "colonna C" e\' una',
        "lettera sola, e il numero che ne esce non e' assurdo: e' un margine EBITDA plausibile, dello",
        "stesso ordine di grandezza degli altri due. Nessun test a colpo d'occhio lo separa dai numeri",
        "veri: bisogna rileggere la formula, non fidarsi di quello che mostra.",
        '',
        "Trovala, ricalcola a mano il margine corretto per quella divisione, e scrivilo dove indicato.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Margine EBITDA per divisione'], { style: STILE_TITOLO }),
            riga('A3', ['Divisione', 'Ricavi (€)', 'Costi (€)', 'Margine EBITDA (%)'], { style: STILE_TITOLO }),
            colonna('A4', righe.map((r) => r.nome), { style: STILE_ETICHETTA }),
            colonna('B4', righe.map((r) => r.ricavi), { style: STILE_INPUT }),
            colonna('C4', righe.map((r) => r.costi), { style: STILE_INPUT }),
            colonna('D4', formuleD, { style: STILE_FORMULA_PCT }),
            blocco('A8', [["Il valore corretto della percentuale sbagliata, sopra, e'"]], { style: STILE_ETICHETTA }),
            areaLibera(['B8']),
          ],
          { colWidths: { A: 420, B: 140, C: 140, D: 190 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "Il margine corretto e' sempre (Ricavi - Costi) / Ricavi. Controlla il denominatore di ciascuna " +
            "delle tre formule in D4:D6: uno dei tre non divide per la colonna Ricavi.",
          10,
          'T1',
        ),
        hint(
          'H2',
          "Seleziona una cella di D4:D6, premi F2: Excel evidenzia a colori le celle che referenzia. " +
            'Confronta il colore sul denominatore fra le tre righe: uno spicca.',
          10,
          'T1',
        ),
        hint('H3', `La formula sbagliata e' quella della riga "${rigaSbagliata.nome}".`, 16, 'T1'),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: 'Model!D4',
    };
  },
});
