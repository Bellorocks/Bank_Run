/**
 * M1 · 10 — IFRS 16: il leasing entra in bilancio.
 *
 * Con IFRS 16 il leasing operativo genera una passivita' finanziaria pari al
 * VALORE ATTUALE dei canoni futuri, scontati al tasso di finanziamento
 * marginale (IBR), e un diritto d'uso (right-of-use) di pari importo. Il
 * canone sparisce dai costi operativi ed e' sostituito da:
 *
 *   ammortamento del ROU  = passivita' iniziale / durata   (lineare)
 *   interessi anno 1      = passivita' iniziale × IBR
 *
 * entrambi sotto la riga EBITDA. Conseguenze, che sono il punto del livello:
 *   - l'EBITDA sale esattamente del canone;
 *   - il primo anno il costo totale (ammortamento + interessi) SUPERA il
 *     canone: l'utile ante imposte scende (effetto front-loading), perche' gli
 *     interessi si calcolano su un debito che all'inizio e' al massimo.
 *
 * Canoni posticipati (pagati a fine anno), nessun costo diretto iniziale.
 */

import {
  defineTemplate,
  foglio,
  colonna,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
  pct,
} from '../../authoring';

const B_CANONE = 'B4';
const B_DURATA = 'B5';
const B_IBR = 'B6';

const B_PASSIVITA = 'B9'; // T1
const B_AMMORT = 'B10'; // T2
const B_INTERESSI = 'B11'; // T3
const B_EFFETTO_EBITDA = 'B12'; // T4
const B_EFFETTO_UTILE = 'B13'; // T5

export default defineTemplate({
  id: 'M1-10-IFRS16',
  module: 'M1',
  title: 'IFRS 16: il leasing entra in bilancio',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 330,
  skills: ['acc.ifrs16'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const canone = r.int(30, 200) * 1000;
    const durata = r.int(4, 10);
    const ibr = r.int(30, 70) / 1000;

    const passivita = (canone * (1 - Math.pow(1 + ibr, -durata))) / ibr;
    const ammort = passivita / durata;
    const interessi = passivita * ibr;
    const effettoEbitda = canone;
    const effettoUtile = canone - ammort - interessi;

    const t = (
      id: string,
      target: string,
      prompt: string,
      atteso: number,
      referenzia: string[],
      ammessi: number[],
      minKeystrokes: number,
    ) =>
      taskFormula({
        id,
        prompt,
        target: `Model!${target}`,
        atteso,
        referenzia,
        senzaLiteral: ammessi,
        skills: ['acc.ifrs16'],
        minKeystrokes,
      });

    const tasks = [
      t(
        'T1',
        B_PASSIVITA,
        `In ${B_PASSIVITA} la passivita' leasing iniziale: il valore attuale dei canoni futuri (pagati a fine ` +
          "anno), scontati al tasso di finanziamento marginale. E' anche il valore iniziale del diritto d'uso.",
        passivita,
        [B_CANONE, B_DURATA, B_IBR],
        [0, 1],
        18,
      ),
      t(
        'T2',
        B_AMMORT,
        `In ${B_AMMORT} l'ammortamento annuo del diritto d'uso, lineare sulla durata del contratto.`,
        ammort,
        [B_PASSIVITA, B_DURATA],
        [],
        8,
      ),
      t(
        'T3',
        B_INTERESSI,
        `In ${B_INTERESSI} gli interessi del primo anno sulla passivita' leasing.`,
        interessi,
        [B_PASSIVITA, B_IBR],
        [],
        8,
      ),
      t(
        'T4',
        B_EFFETTO_EBITDA,
        `In ${B_EFFETTO_EBITDA} di quanto sale l'EBITDA rispetto a quando il canone era un costo operativo.`,
        effettoEbitda,
        [B_CANONE],
        [],
        3,
      ),
      t(
        'T5',
        B_EFFETTO_UTILE,
        `In ${B_EFFETTO_UTILE} l'effetto sull'utile ante imposte del primo anno: il canone che non c'e' piu', ` +
          "meno i due costi che lo sostituiscono (negativo se l'utile scende).",
        effettoUtile,
        [B_CANONE, B_AMMORT, B_INTERESSI],
        [],
        12,
      ),
    ];

    return {
      templateId: 'M1-10-IFRS16',
      seed: rng.seed,
      brief: [
        "## Il leasing operativo entra in bilancio, e l'EBITDA ne beneficia",
        '',
        "Prima di IFRS 16 il canone di un leasing operativo era un costo a conto economico, sopra la riga " +
          "EBITDA. Con IFRS 16 l'azienda iscrive una **passivita' finanziaria** pari al valore attuale dei " +
          "canoni futuri e un **diritto d'uso** di pari importo. Il canone sparisce dai costi operativi e " +
          "al suo posto compaiono ammortamento del diritto d'uso e interessi sulla passivita', **entrambi " +
          'sotto la riga EBITDA**.',
        '',
        `Contratto: canone annuo ${eur(canone)} pagato a fine anno, durata residua ${durata} anni, tasso ` +
          `di finanziamento marginale ${pct(ibr)}.`,
        '',
        "Due effetti da vedere coi tuoi numeri: l'EBITDA migliora senza che entri un euro di cassa in piu', e " +
          "il primo anno l'utile peggiora, perche' gli interessi pesano di piu' quando il debito e' ancora " +
          "tutto da rimborsare. Per questo un analista confronta l'EBITDA di aziende IFRS 16 e non IFRS 16 " +
          'solo dopo averlo rettificato.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['IFRS 16: il leasing entra in bilancio'], { style: STILE_TITOLO }),
            riga('A3', ['Contratto', 'Valore'], { style: STILE_TITOLO }),
            colonna('A4', ['Canone annuo (fine anno), €', 'Durata residua, anni', 'Tasso di finanziamento marginale (IBR)'], {
              style: STILE_ETICHETTA,
            }),
            [{ ref: B_CANONE, content: canone, locked: true, style: STILE_INPUT }],
            [{ ref: B_DURATA, content: durata, locked: true, style: { ...STILE_INPUT, numFmt: '0' } }],
            [{ ref: B_IBR, content: ibr, locked: true, style: STILE_INPUT_PCT }],
            riga('A8', ['IFRS 16', '€'], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                "Passivita' leasing iniziale (= diritto d'uso)",
                "Ammortamento annuo del diritto d'uso",
                "Interessi del primo anno",
                "Effetto sull'EBITDA",
                "Effetto sull'utile ante imposte, anno 1",
              ],
              { style: STILE_ETICHETTA },
            ),
            ...[B_PASSIVITA, B_AMMORT, B_INTERESSI, B_EFFETTO_EBITDA].map((ref) => [
              { ref, content: null, locked: false, style: STILE_FORMULA },
            ]),
            [{ ref: B_EFFETTO_UTILE, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 150 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=PV(${B_IBR},${B_DURATA},-${B_CANONE}), oppure =${B_CANONE}*(1-(1+${B_IBR})^-${B_DURATA})/${B_IBR}.`, 12, 'T1'),
        hint('H2', `=${B_PASSIVITA}/${B_DURATA}`, 8, 'T2'),
        hint('H3', `=${B_PASSIVITA}*${B_IBR}`, 8, 'T3'),
        hint('H4', `=${B_CANONE}: il canone esce per intero dai costi sopra l'EBITDA.`, 8, 'T4'),
        hint('H5', `=${B_CANONE}-${B_AMMORT}-${B_INTERESSI}`, 8, 'T5'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${B_PASSIVITA}`,
    };
  },
});
