/**
 * M11 · 05 — Caccia all'Errore: un modello ricevuto dalla controparte, tre errori.
 *
 * Il foglio e' un piccolo conto economico con flusso di cassa: tutte le celle
 * formula sono modificabili e hanno lo stesso aspetto, quindi lo stato del
 * foglio non tradisce dove stanno gli errori. Il seed sceglie tre celle fra
 * cinque possibili e, per ciascuna, una variante d'errore:
 *
 *   B8   totale costi     hardcode di una versione precedente | range che salta una riga
 *   B11  EBIT             ammortamenti sommati invece che sottratti
 *   B15  IRES             calcolata sull'EBIT | aliquota battuta a mano nella formula
 *   B17  totale imposte   IRAP dimenticata
 *   B21  free cash flow   capex sommato invece che sottratto
 *
 * I task controllano solo i tre risultati che il comitato legge (EBITDA,
 * utile netto, FCF) e che restino collegati ai loro precedenti diretti: per
 * farli tornare bisogna risalire la catena e correggere le celle sbagliate,
 * non riscrivere il risultato da zero. Il brief non dice dove guardare.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

type Cella = 'B8' | 'B11' | 'B15' | 'B17' | 'B21';

const CORRETTE: Record<Cella, string> = {
  B8: '=SUM(B5:B7)',
  B11: '=B9-B10',
  B15: '=B13*B14',
  B17: '=SUM(B15:B16)',
  B21: '=B9-B17-B19-B20',
};

export default defineTemplate({
  id: 'M11-05-FINDERRORS',
  module: 'M11',
  title: 'Trovare gli errori piantati: audit, hardcode e formule incoerenti',
  rank: 3,
  mode: 'AUDIT',
  estimatedSeconds: 420,
  skills: ['real.find-errors'],
  prerequisites: ['M0D-01-CINQUEERRORI', 'M0F-10-COMBOAUDIT'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ricavi = roundTo(triangular(r, 40_000_000, 55_000_000, 70_000_000), 100_000);
    const materie = roundTo(ricavi * triangular(r, 0.3, 0.36, 0.42), 10_000);
    const servizi = roundTo(ricavi * triangular(r, 0.12, 0.15, 0.18), 10_000);
    const personale = roundTo(ricavi * triangular(r, 0.15, 0.19, 0.23), 10_000);
    const ammortamenti = roundTo(ricavi * triangular(r, 0.03, 0.04, 0.05), 10_000);
    const oneriFin = roundTo(ricavi * triangular(r, 0.01, 0.02, 0.03), 10_000);
    const aliquota = 0.24;
    const irap = roundTo(ricavi * triangular(r, 0.008, 0.011, 0.014), 10_000);
    const capex = roundTo(ricavi * triangular(r, 0.03, 0.045, 0.06), 10_000);
    const varCcn = roundTo(ricavi * triangular(r, -0.01, 0.01, 0.025), 10_000);

    const costi = materie + servizi + personale;
    const ebitda = ricavi - costi;
    const ebit = ebitda - ammortamenti;
    const ebt = ebit - oneriFin;
    const ires = ebt * aliquota;
    const imposte = ires + irap;
    const utile = ebt - imposte;
    const fcf = ebitda - imposte - capex - varCcn;

    // --- Errori piantati: tre celle diverse su cinque, variante a caso. ---
    const candidate: Cella[] = ['B8', 'B11', 'B15', 'B17', 'B21'];
    const scelte: Cella[] = [];
    while (scelte.length < 3) {
      const c = candidate[r.int(0, candidate.length - 1)];
      if (!scelte.includes(c)) scelte.push(c);
    }
    const sbagliate: Partial<Record<Cella, string | number>> = {};
    for (const c of scelte) {
      const variante = r.int(0, 1);
      switch (c) {
        case 'B8':
          sbagliate.B8 = variante === 0 ? roundTo(costi * triangular(r, 0.93, 0.96, 0.98), 10_000) : '=SUM(B5:B6)';
          break;
        case 'B11':
          sbagliate.B11 = '=B9+B10';
          break;
        case 'B15':
          sbagliate.B15 = variante === 0 ? '=B11*B14' : '=B13*0.275';
          break;
        case 'B17':
          sbagliate.B17 = '=SUM(B15:B15)';
          break;
        case 'B21':
          sbagliate.B21 = '=B9-B17+B19-B20';
          break;
      }
    }
    const formula = (c: Cella) => sbagliate[c] ?? CORRETTE[c];

    const kpi = (id: string, target: string, cosa: string, atteso: number, referenzia: string[]): Task => ({
      id,
      prompt: `${cosa} (${target}) deve tornare, restando collegato alle righe da cui dipende.`,
      targetCell: `Model!${target}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: atteso },
        { kind: 'mustReference', cells: referenzia, allowViaRange: true },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['real.find-errors'],
      minKeystrokes: 20,
    });

    const tasks: Task[] = [
      kpi('T1', 'B9', "L'EBITDA", ebitda, ['B4', 'B8']),
      kpi('T2', 'B18', "L'utile netto", utile, ['B13', 'B17']),
      kpi('T3', 'B21', 'Il free cash flow', fcf, ['B9', 'B17', 'B19', 'B20']),
    ];

    const brief = [
      "La controparte ti ha mandato il suo modello. Il comitato legge tre numeri: **EBITDA**, **utile netto** " +
        "e **free cash flow**. Nel modello ci sono **tre errori**, e almeno uno dei tre numeri non torna.",
      '',
      "Ricalcola a mente l'ordine di grandezza, poi risali i precedenti di ogni risultato (F2 su una cella " +
        'mostra la formula) finche\' non trovi le celle sbagliate. Correggile li\', dove nascono: riscrivere ' +
        'il risultato finale da zero non conta come correzione.',
      '',
      'Gli errori tipici di un modello ricevuto: numeri battuti a mano dove dovrebbe esserci una formula, ' +
        'range che saltano una riga, segni invertiti, imposte calcolate sulla base sbagliata, costanti nascoste ' +
        "dentro le formule invece che nelle celle d'ipotesi.",
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['MODELLO DELLA CONTROPARTE — AUDIT'], { style: STILE_TITOLO }),
      riga('A3', ['Conto economico', '€'], { style: STILE_TITOLO }),
      colonna(
        'A4',
        [
          'Ricavi',
          'Materie prime',
          'Servizi',
          'Personale',
          'Totale costi operativi',
          'EBITDA',
          'Ammortamenti',
          'EBIT',
          'Oneri finanziari',
          'Utile ante imposte',
          'Aliquota IRES',
          'IRES',
          'IRAP',
          'Totale imposte',
          'Utile netto',
          'Capex',
          'Variazione capitale circolante (aumento = assorbimento)',
          'Free cash flow',
        ],
        { style: STILE_ETICHETTA },
      ),
      colonna('B4', [ricavi, materie, servizi, personale], { style: STILE_INPUT }),
      [{ ref: 'B10', content: ammortamenti, style: STILE_INPUT, locked: true }],
      [{ ref: 'B12', content: oneriFin, style: STILE_INPUT, locked: true }],
      [{ ref: 'B14', content: aliquota, style: STILE_INPUT_PCT, locked: true }],
      [{ ref: 'B16', content: irap, style: STILE_INPUT, locked: true }],
      colonna('B19', [capex, varCcn], { style: STILE_INPUT }),
      ...(
        [
          ['B8', formula('B8')],
          ['B9', '=B4-B8'],
          ['B11', formula('B11')],
          ['B13', '=B11-B12'],
          ['B15', formula('B15')],
          ['B17', formula('B17')],
          ['B18', '=B13-B17'],
          ['B21', formula('B21')],
        ] as const
      ).map(([ref, content]) => [
        {
          ref,
          content,
          locked: false,
          style: ref === 'B9' || ref === 'B18' || ref === 'B21' ? STILE_TOTALE : STILE_FORMULA,
        },
      ]),
    ], { colWidths: { A: 420, B: 150 } });

    return {
      templateId: 'M11-05-FINDERRORS',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 120 }),
      startAt: 'Model!B9',
      hints: [
        hint('H1', 'Parti dai costi: il totale e\' davvero la somma delle tre righe sopra, ed e\' una formula?', 15),
        hint('H2', "Controlla i segni: l'EBIT toglie gli ammortamenti, il free cash flow toglie il capex.", 15),
        hint('H3', "Le imposte: l'IRES si calcola sull'utile ante imposte con l'aliquota in B14, e il totale include l'IRAP.", 15),
      ],
    };
  },
});
