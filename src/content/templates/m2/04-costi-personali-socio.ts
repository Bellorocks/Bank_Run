/**
 * M2 · 04 — Costi personali del socio: rettifica come somma di un elenco.
 *
 * Terzo e ultimo template della serie "poste infragruppo" del modulo M2. Nei
 * due precedenti la rettifica nasceva da una DIFFERENZA fra due numeri (un
 * compenso/affitto pagato contro un valore di mercato). Qui cambia forma
 * apposta, per non far credere che "rettifica" significhi sempre sottrazione:
 * la rettifica e' la SOMMA di un piccolo elenco di voci di spesa personale
 * del socio, contabilizzate impropriamente come costi aziendali (auto uso
 * personale, spese di rappresentanza non documentate, viaggi non di lavoro,
 * quota di un club privato...). Non c'e' ambiguita' di segno da testare qui:
 * sono TUTTE spese personali che hanno gonfiato i costi aziendali (quindi
 * sgonfiato l'EBITDA riportato), quindi vanno TUTTE riaggiunte. Il brief lo
 * dichiara comunque in modo esplicito, come da convenzione del modulo.
 *
 * Meccanica Excel: SUM su un range la cui lunghezza dipende dal seed (3 o 4
 * voci, estratte senza ripetizione da un pool di 4 possibili), poi la somma
 * base EBITDA + rettifiche del template introduttivo (M2-01). Il pattern di
 * elenco-che-si-somma e' lo stesso di M1-04 (fondi rischi/TFR), qui applicato
 * a una singola riga di totale invece che a un rollforward a due gambe.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

/** Pool delle possibili voci di spesa personale: se ne scelgono 3 o 4, senza ripetizione. */
const POOL_SPESE_PERSONALI = [
  'Auto aziendale a uso personale del socio',
  'Spese di rappresentanza non documentate',
  'Viaggi e vacanze non di lavoro',
  'Quota abbonamento club privato',
] as const;

export default defineTemplate({
  id: 'M2-04-COSTIPERSONALISOCIO',
  module: 'M2',
  title: 'Costi personali del socio: la rettifica come somma di un elenco',
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['qoe.related-party'],
  prerequisites: ['M2-01-NORMALIZZAZIONE'],

  generate: (rng) => {
    // Stream indipendenti: quali voci escono, quanto valgono, e l'EBITDA di
    // base non devono correlarsi fra loro.
    const rVoci = rng.fork('voci');
    const nVoci = rVoci.int(3, 4);
    const labelsScelte = rVoci.shuffle(POOL_SPESE_PERSONALI).slice(0, nVoci);

    const rImporti = rng.fork('importi');
    const importi = labelsScelte.map(() => roundTo(triangular(rImporti, 800, 3200, 11000), 100));

    const rEbitda = rng.fork('ebitda');
    const ebitdaRiportato = rEbitda.int(700, 3500) * 1000;

    const rettificaTotale = importi.reduce((a, b) => a + b, 0);
    const ebitdaNormalizzato = ebitdaRiportato + rettificaTotale;

    // --- Geometria: tutto calcolato dal numero di voci, mai un letterale. ---
    const EBITDA_RIP_ROW = 4;
    const SEZ_SPESE_TITLE_ROW = 6;
    const LIST_FIRST = SEZ_SPESE_TITLE_ROW + 1;
    const LIST_LAST = LIST_FIRST + nVoci - 1;
    const RETTIFICA_ROW = LIST_LAST + 2;
    const SEZ_NORM_TITLE_ROW = RETTIFICA_ROW + 2;
    const NORM_ROW = SEZ_NORM_TITLE_ROW + 1;

    const rangeSpese = `B${LIST_FIRST}:B${LIST_LAST}`;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          `In B${RETTIFICA_ROW} calcola la rettifica totale: somma le ${nVoci} voci di spesa personale del ` +
          `socio contabilizzate come costi aziendali (${rangeSpese}). Sono tutte spese personali, non ` +
          "aziendali, e sono gia' dentro i costi che hanno determinato l'EBITDA riportato: hanno GONFIATO " +
          "i costi (quindi SGONFIATO l'EBITDA riportato), percio' vanno TUTTE riaggiunte, con segno " +
          'positivo — nessuna eccezione in questo elenco. Usa SUM sull\'intero range.',
        target: `Model!B${RETTIFICA_ROW}`,
        atteso: rettificaTotale,
        referenzia: [`B${LIST_FIRST}`, `B${LIST_LAST}`],
        senzaLiteral: [],
        skills: ['qoe.related-party'],
        minKeystrokes: 12,
      });
      return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUM'] }] };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In B${NORM_ROW} calcola l'EBITDA normalizzato: l'EBITDA riportato (B${EBITDA_RIP_ROW}) piu' la ` +
        `rettifica totale delle spese personali che hai appena calcolato (B${RETTIFICA_ROW}).`,
      target: `Model!B${NORM_ROW}`,
      atteso: ebitdaNormalizzato,
      referenzia: [`B${EBITDA_RIP_ROW}`, `B${RETTIFICA_ROW}`],
      senzaLiteral: [],
      skills: ['qoe.related-party'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-04-COSTIPERSONALISOCIO',
      seed: rng.seed,
      brief: [
        "## Le spese del socio non sono spese dell'azienda",
        '',
        "Non tutte le rettifiche sono una differenza fra due numeri. A volte sono un ELENCO di voci",
        "che, singolarmente, sembrano normali costi aziendali — ma sono in realta' spese personali",
        "del socio, pagate con la carta dell'azienda e finite nel conto economico come se fossero",
        "costi operativi. E' una delle forme piu' comuni di poste infragruppo in una PMI a controllo",
        "familiare.",
        '',
        `L'EBITDA riportato di quest'anno e' ${eur(ebitdaRiportato)}. Dentro ai costi che lo hanno`,
        `determinato ci sono anche queste ${nVoci} voci, tutte estranee al business:`,
        '',
        ...labelsScelte.map((l, i) => `- **${l}**: ${eur(importi[i])}`),
        '',
        "Qui non c'e' un segno da indovinare: sono TUTTE spese personali che hanno gonfiato i costi",
        "aziendali (e quindi sgonfiato l'EBITDA riportato). Vanno TUTTE riaggiunte, con segno",
        "positivo — a differenza di altre rettifiche di questo modulo, qui non c'e' nessuna voce da",
        "sottrarre. Prima somma l'intero elenco in un'unica rettifica totale, poi usala per",
        "normalizzare l'EBITDA con la stessa formula generale vista in apertura di modulo:",
        '',
        '> **EBITDA normalizzato = EBITDA riportato + Σ rettifiche**',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Costi personali del socio contabilizzati come costi aziendali"], { style: STILE_TITOLO }),
            riga(`A3`, ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(`A${EBITDA_RIP_ROW}`, ['EBITDA riportato (da bilancio), €'], { style: STILE_ETICHETTA }),
            [{ ref: `B${EBITDA_RIP_ROW}`, content: ebitdaRiportato, style: STILE_INPUT, locked: true }],

            riga(`A${SEZ_SPESE_TITLE_ROW}`, ['Spese personali del socio contabilizzate come costi aziendali, €'], {
              style: STILE_TITOLO,
            }),
            colonna(`A${LIST_FIRST}`, labelsScelte, { style: STILE_ETICHETTA }),
            blocco(
              `B${LIST_FIRST}`,
              importi.map((v) => [v]),
              { style: STILE_INPUT },
            ),

            colonna(`A${RETTIFICA_ROW}`, ["Totale rettifica: spese personali da riaggiungere, €"], {
              style: STILE_ETICHETTA,
            }),
            [{ ref: `B${RETTIFICA_ROW}`, content: null, locked: false, style: STILE_FORMULA }],

            riga(`A${SEZ_NORM_TITLE_ROW}`, ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna(`A${NORM_ROW}`, ['EBITDA normalizzato, €'], { style: STILE_ETICHETTA }),
            [{ ref: `B${NORM_ROW}`, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=SUM(${rangeSpese}): somma tutte le voci dell'elenco, sono tutte da riaggiungere, nessuna esclusa.`,
          8,
          'T1',
        ),
        hint(
          'H2',
          `=B${EBITDA_RIP_ROW}+B${RETTIFICA_ROW}: EBITDA riportato piu' la rettifica totale appena calcolata.`,
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 55 }),
      startAt: `Model!B${RETTIFICA_ROW}`,
    };
  },
});
