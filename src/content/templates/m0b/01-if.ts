/**
 * M0-B · 01 — IF: una domanda, due risposte.
 *
 * Il primissimo livello del modulo "Costruire". Fin qui il foglio ha sempre
 * calcolato: ora deve anche DECIDERE. `IF` e' la prima formula che non produce
 * un numero direttamente, ma sceglie fra due numeri a seconda di una condizione.
 *
 * Scenario: un bonus a soglia per il team vendite, con due condizioni separate
 * e deliberatamente diverse:
 *   - T1 usa `>` (maggiore stretto): il bonus scatta solo SOPRA l'obiettivo.
 *   - T2 usa `<=` (minore o uguale): la penale scatta ANCHE sul pareggio esatto.
 * T3 non fa scrivere una formula: chiede di prevedere a parole cosa succede nel
 * caso limite, cioe' se il confine include se stesso o no. E' li' che la
 * differenza fra `>` e `>=` smette di essere un dettaglio sintattico.
 *
 * I numeri sono generati in modo che l'esito di ciascuna condizione dipenda dal
 * seed: a volte il bonus scatta, a volte no. Imparare a memoria "il bonus c'e'
 * sempre" non porta da nessuna parte.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
} from '../../authoring';

export default defineTemplate({
  id: 'M0B-01-IF',
  module: 'M0-B',
  title: 'IF: una domanda, due risposte',
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 180,
  skills: ['xl.if'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const obiettivo = r.int(120, 380) * 1000;
    // 0,65x .. 1,35x l'obiettivo: quasi meta' delle volte sopra, meta' sotto.
    const fattoreVendite = 0.65 + r.next() * 0.7;
    // Arrotondato a dieci euro, non a mille: e' un consuntivo, non un budget.
    const vendite = Math.round((obiettivo * fattoreVendite) / 10) * 10 + r.int(1, 9);
    const bonusImporto = r.int(2, 10) * 1000;

    // 70%-95% dell'obiettivo: abbastanza vicino alle vendite perche' la penale
    // scatti in una parte non trascurabile dei seed, non in tutti ne' in nessuno.
    const fattoreSogliaMinima = 0.7 + r.next() * 0.25;
    const sogliaMinima = Math.round((obiettivo * fattoreSogliaMinima) / 1000) * 1000;
    const penaleImporto = r.int(1, 5) * 1000;

    const bonusAtteso = vendite > obiettivo ? bonusImporto : 0;
    const penaleAtteso = vendite <= sogliaMinima ? penaleImporto : 0;

    const tasks = [
      {
        id: 'T1',
        prompt:
          'In B8 calcola il bonus maturato dal team vendite: se le vendite in B2 superano ' +
          "l'obiettivo in B3, il bonus e' quello scritto in B4; altrimenti il bonus e' zero. " +
          "Usa IF: una condizione, il valore se e' vera, il valore se e' falsa.",
        targetCell: 'Model!B8',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'value' as const, expected: bonusAtteso },
          { kind: 'mustUseFunction' as const, functions: ['IF'] },
          { kind: 'mustReference' as const, cells: ['B2', 'B3', 'B4'] },
          { kind: 'mustNotContainLiteral' as const, except: [0] },
        ],
        skills: ['xl.if'],
        minKeystrokes: 16,
      },
      {
        id: 'T2',
        prompt:
          "In B9 calcola la penale: se le vendite in B2 non arrivano alla soglia minima in B5 " +
          '(compreso il caso in cui la toccano esattamente), la penale e\' quella scritta in B6; ' +
          'altrimenti zero.',
        targetCell: 'Model!B9',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'value' as const, expected: penaleAtteso },
          { kind: 'mustUseFunction' as const, functions: ['IF'] },
          { kind: 'mustReference' as const, cells: ['B2', 'B5', 'B6'] },
          { kind: 'mustNotContainLiteral' as const, except: [0] },
        ],
        skills: ['xl.if'],
        minKeystrokes: 16,
      },
      {
        id: 'T3',
        prompt:
          "Non scrivere una formula: rispondi a parole in B11. Se le vendite fossero esattamente " +
          "uguali all'obiettivo in B3 — nemmeno un euro di piu' — il bonus del task precedente " +
          'scatterebbe? Scrivi SI oppure NO.',
        targetCell: 'Model!B11',
        check: [{ kind: 'text' as const, expected: 'NO', caseSensitive: false }],
        skills: ['xl.if'],
        minKeystrokes: 3,
      },
    ];

    return {
      templateId: 'M0B-01-IF',
      seed: rng.seed,
      brief: [
        '## Se succede, allora',
        '',
        'Fin qui ogni formula ha sempre calcolato lo stesso modo, qualunque fossero i numeri.',
        "`IF` e' diverso: guarda una condizione e **sceglie** fra due risposte a seconda che sia",
        'vera o falsa. E\' la prima formula del foglio che decide, non solo che somma.',
        '',
        'La forma e\' sempre la stessa, in tre pezzi separati da virgola:',
        '',
        '`=IF(condizione, valore se vera, valore se falsa)`',
        '',
        'La condizione confronta due celle con un operatore: `>` maggiore, `<` minore, `>=`',
        "maggiore o uguale, `<=` minore o uguale. La differenza fra `>` e `>=` sembra un dettaglio,",
        "ma decide se il caso limite — il pareggio esatto — passa la condizione o no.",
        '',
        `Questo mese il team ha venduto ${eur(vendite)}. L'obiettivo per far scattare il bonus e'`,
        `${eur(obiettivo)}: sopra, il team incassa ${eur(bonusImporto)}; altrimenti niente.`,
        `Esiste anche una soglia minima di attenzione, ${eur(sogliaMinima)}: scenderci sotto (o`,
        `toccarla esattamente) fa scattare una penale di ${eur(penaleImporto)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            blocco('A1', [['Bonus vendite a soglia']], { style: STILE_TITOLO }),
            blocco(
              'A2',
              [
                ['Vendite del mese'],
                ['Obiettivo (soglia bonus)'],
                ["Bonus se le vendite superano l'obiettivo"],
                ['Soglia minima di attenzione'],
                ['Penale se le vendite non raggiungono la soglia minima'],
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco('B2', [[vendite], [obiettivo], [bonusImporto], [sogliaMinima], [penaleImporto]], {
              style: STILE_INPUT,
            }),
            blocco('A8', [['Bonus maturato'], ['Penale maturata']], { style: STILE_ETICHETTA }),
            blocco(
              'A11',
              [["Se le vendite fossero esattamente pari all'obiettivo, il bonus scatterebbe?"]],
              { style: STILE_ETICHETTA },
            ),
            areaLibera(['B8', 'B9', 'B11']),
          ],
          { colWidths: { A: 340, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "IF ha tre pezzi separati da virgola: la condizione, il valore se e' vera, il valore " +
            "se e' falsa. Qui la condizione confronta B2 con B3, e il valore vero e' B4.",
          10,
          'T1',
        ),
        hint(
          'H2',
          "Stessa struttura del task precedente, ma la condizione ora e' 'minore o uguale': " +
            'confronta B2 con B5. Il valore vero e\' B6.',
          10,
          'T2',
        ),
        hint(
          'H3',
          'Nel primo task hai scritto una condizione con B2>B3: quell\'operatore include il ' +
            "pareggio esatto o lo esclude?",
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 45 }),
      startAt: 'Model!B8',
    };
  },
});
