/**
 * M0-A · 01 — La griglia e il riferimento di cella.
 *
 * Il primo livello del gioco. Non da' niente per scontato: una cella ha un nome,
 * il segno `=` cambia la natura di quello che scrivi, e una formula puo' puntare
 * a un'altra formula.
 *
 * Il punto didattico e' T3: il risultato si costruisce referenziando una cella
 * che a sua volta e' una formula. Chi arriva da una calcolatrice sommerebbe di
 * nuovo tutto da capo, ed e' esattamente l'abitudine da rompere subito.
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

export default defineTemplate({
  id: 'M0A-01-RIFERIMENTI',
  module: 'M0-A',
  title: 'Il nome delle celle',
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 120,
  skills: ['xl.grid', 'xl.formula-basics'],
  prerequisites: [],

  generate: (rng) => {
    const r = rng.fork('dati');
    // Numeri tondi al primo livello: qui si impara la meccanica, non l'aritmetica.
    const ricavi = Math.round(revenue(r) / 100_000) * 100_000;
    const costi = Math.round((ricavi * (0.6 + r.next() * 0.2)) / 100_000) * 100_000;
    const aumento = r.int(2, 9) * 50_000;
    const margine = ricavi - costi;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          'In B4 calcola il margine: ricavi meno costi. Comincia col segno = e raggiungi le due celle con le frecce.',
        target: 'Model!B4',
        atteso: margine,
        referenzia: ['B2', 'B3'],
        senzaLiteral: [],
        skills: ['xl.formula-basics'],
        minKeystrokes: 8,
      }),
      {
        id: 'T2',
        prompt:
          'In B6 scrivi il nome della cella che contiene i ricavi: la lettera della colonna e il numero della riga. Come testo, senza il segno =.',
        targetCell: 'Model!B6',
        check: [{ kind: 'text' as const, expected: 'B2' }],
        skills: ['xl.grid'],
        minKeystrokes: 4,
      },
      taskFormula({
        id: 'T3',
        prompt:
          'In B8 calcola il margine dopo l\'aumento di ricavi previsto in B7. Non risommare tutto da capo: parti dal margine che hai gia\' calcolato.',
        target: 'Model!B8',
        atteso: margine + aumento,
        referenzia: ['B4', 'B7'],
        senzaLiteral: [],
        skills: ['xl.formula-basics'],
        minKeystrokes: 8,
      }),
    ];

    return {
      templateId: 'M0A-01-RIFERIMENTI',
      seed: rng.seed,
      brief: [
        '## Il tuo primo foglio',
        '',
        'Ogni cella ha un nome: la colonna, poi la riga. Quella in alto a sinistra si chiama `A1`.',
        '',
        `Qui dentro ci sono i ricavi (${eur(ricavi)}) e i costi (${eur(costi)}) di una piccola azienda.`,
        'Non ti serve sapere altro di finanza per questo livello.',
        '',
        'Una **formula** comincia sempre con `=`. Se scrivi `10+5` Excel legge del testo; se scrivi',
        '`=10+5` Excel calcola. La differenza e\' tutta li\'.',
        '',
        'Ma il motivo per cui esiste un foglio di calcolo non e\' fare somme: e\' che una formula',
        'punta a **un\'altra cella**, e quando quella cambia il risultato si aggiorna da solo.',
        'Nell\'ultimo task punterai a una cella che e\' a sua volta una formula. E\' cosi\' che si',
        'costruisce un modello: a strati, non riscrivendo tutto ogni volta.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Conto economico semplificato'], { style: STILE_TITOLO }),
            blocco('A2', [['Ricavi'], ['Costi'], ['Margine']], { style: STILE_ETICHETTA }),
            blocco('A6', [['Il nome della cella dei ricavi']], { style: STILE_ETICHETTA }),
            blocco('A7', [['Aumento di ricavi previsto']], { style: STILE_ETICHETTA }),
            blocco('A8', [['Margine dopo l\'aumento']], { style: STILE_ETICHETTA }),
            // Gli input sono blu: e' la convenzione di mestiere che il grader
            // verifichera' dal rank 3, ma la si vede applicata fin da qui.
            blocco('B2', [[ricavi], [costi]], { style: STILE_INPUT }),
            blocco('B7', [[aumento]], { style: STILE_INPUT }),
            areaLibera(['B4', 'B6', 'B8']),
          ],
          { colWidths: { A: 240, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', 'Batti `=`, sali su B2 con la freccia, batti `-`, scendi su B3, premi Invio.', 8, 'T1'),
        hint('H2', 'Lettera della colonna, poi numero della riga. Senza `=`, o Excel prova a calcolare.', 8, 'T2'),
        hint('H3', 'B4 contiene gia\' il margine: ti basta sommarci B7.', 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 40 }),
      startAt: 'Model!B4',
    };
  },
});
