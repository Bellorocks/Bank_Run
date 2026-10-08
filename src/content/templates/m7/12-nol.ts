/**
 * M7 · 12 — NOL (Net Operating Losses): lo scudo fiscale delle perdite pregresse.
 *
 * IL PUNTO DIDATTICO — un'azienda che in anni passati ha accumulato perdite
 * fiscali non le perde: puo' "riportarle a nuovo" (carry-forward) e usarle per
 * ridurre l'imponibile fiscale degli anni futuri, finche' il reddito
 * imponibile lo permette e finche' il monte perdite non si esaurisce. E' uno
 * scudo fiscale vero, esattamente come il D&A o gli interessi passivi: va
 * valorizzato nel FCF perche' riduce le imposte EFFETTIVAMENTE pagate, non
 * quelle "piene" che si otterrebbero applicando l'aliquota al reddito lordo.
 *
 * PERCHE' SERVE UN MIN E NON UNA SOTTRAZIONE SEMPLICE — il NOL utilizzato in
 * un anno non puo' MAI superare due tetti indipendenti:
 *   - non puo' superare il NOL residuo disponibile (non si puo' usare piu'
 *     credito di quanto se ne abbia in cassa fiscale);
 *   - non puo' superare il reddito imponibile ante-NOL dell'anno (non serve
 *     azzerare l'imponibile PIU' di zero: il NOL non genera un rimborso, puo'
 *     solo abbattere le imposte fino a zero).
 * Il NOL utilizzato e' quindi il PIU' PICCOLO fra i due tetti — da qui il MIN.
 * Questo livello genera apposta i dati in modo che, a seconda del seed,
 * capitino ENTRAMBE le direzioni: a volte vince il tetto del NOL residuo (il
 * NOL non basta a coprire tutto il reddito, ne resta poco o nulla), a volte
 * vince il tetto del reddito (il NOL e' piu' che sufficiente, l'imponibile si
 * azzera e una parte del NOL resta disponibile per il futuro).
 *
 * DERIVAZIONE ALGEBRICA DEI DUE TASK:
 *
 *   T1  NolUtilizzato       = MIN(NolResiduoInizioAnno, RedditoImponibileAnteNOL)
 *   T2  ImposteEffettive    = (RedditoImponibileAnteNOL - NolUtilizzato) * AliquotaIRES
 *
 * Per confronto (solo in prosa, non un task): senza NOL l'azienda pagherebbe
 * ImposteSenzaNOL = RedditoImponibileAnteNOL * AliquotaIRES, sempre maggiore o
 * uguale a ImposteEffettive — la differenza fra le due e' il valore dello
 * scudo fiscale del NOL, in euro sonanti.
 *
 * Aliquota fiscale FISSA al 24% (IRES post-2017, dato di legge italiano, mai
 * randomizzata — coerente con m1/09-imposte.ts e con M7-02).
 *
 * GENERAZIONE DATI — a seconda di un bool pescato dal rng, il NOL residuo e'
 * costruito STRETTAMENTE maggiore o STRETTAMENTE minore del reddito
 * imponibile (mai uguale): cosi', su una serie di seed, il MIN di T1 viene
 * davvero messo alla prova in entrambe le direzioni, non solo in una.
 *
 * Geometria fissa: nessuna posizione dipende dal seed, i riferimenti di cella
 * sono letterali per costruzione, come negli altri livelli di M7.
 */

import {
  defineTemplate,
  colonna,
  eur,
  foglio,
  hint,
  par,
  pct,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import type { Task } from '../../types';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_NOL = 'B4'; // NOL residuo disponibile a inizio anno (dato, bloccato)
const B_REDD = 'B5'; // Reddito imponibile ante-NOL dell'anno (dato, bloccato)
const B_ALIQ = 'B6'; // Aliquota fiscale, fissa 24% (dato, bloccato)

const B_NOLUSATO = 'B10'; // T1 — NOL utilizzato quest'anno
const B_IMPEFF = 'B11'; // T2 — imposte effettivamente pagate

const ALIQUOTA_FISCALE = 0.24; // dato di legge, non randomizzato

export default defineTemplate({
  id: 'M7-12-NOL',
  module: 'M7',
  title: 'NOL: lo scudo fiscale delle perdite pregresse',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['dcf.nol'],
  prerequisites: ['M7-02-COSTRUZIONEFCF'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Reddito imponibile ante-NOL dell'anno: un valore plausibile per una mid-cap.
    const redditoImponibile = r.int(200, 900) * 1000;

    // Circa meta' dei seed: NOL residuo MAGGIORE del reddito (l'imponibile si
    // azzera, resta NOL per il futuro). L'altra meta': NOL residuo MINORE del
    // reddito (il NOL si esaurisce, resta imponibile tassabile). Mai uguali.
    const nolMaggioreDelReddito = r.bool(0.5);

    const nolResiduo = nolMaggioreDelReddito
      ? redditoImponibile + r.int(50, 500) * 1000
      : r.int(50, Math.floor(redditoImponibile / 1000) - 50) * 1000;

    // Valori attesi, calcolati con la STESSA algebra dei due task.
    const nolUtilizzato = Math.min(nolResiduo, redditoImponibile);
    const imposteEffettive = (redditoImponibile - nolUtilizzato) * ALIQUOTA_FISCALE;
    const imposteSenzaNOL = redditoImponibile * ALIQUOTA_FISCALE; // solo per la narrazione del brief

    const t1: Task = {
      id: 'T1',
      prompt:
        `In ${B_NOLUSATO} calcola il NOL EFFETTIVAMENTE UTILIZZATO quest'anno. Non e' semplicemente il ` +
        `NOL residuo (${B_NOL}) ne' semplicemente il reddito imponibile ante-NOL (${B_REDD}): e' vincolato ` +
        `da DUE tetti indipendenti, e non puo' superare NESSUNO dei due. Primo tetto: non puoi usare piu' ` +
        `credito fiscale di quanto ne hai davvero in ${B_NOL}. Secondo tetto: non serve azzerare l'imponibile ` +
        `oltre lo zero — il NOL abbatte le imposte fino a zero, non genera un rimborso, quindi non puoi ` +
        `usarne piu' di ${B_REDD}. Il NOL utilizzato e' quindi il PIU' PICCOLO fra i due: usa la funzione MIN.`,
      targetCell: `Model!${B_NOLUSATO}`,
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: nolUtilizzato },
        { kind: 'mustReference', cells: [B_NOL, B_REDD] },
        { kind: 'mustUseFunction', functions: ['MIN'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['dcf.nol'],
      minKeystrokes: 14,
    };

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_IMPEFF} calcola le IMPOSTE EFFETTIVAMENTE PAGATE quest'anno: il reddito imponibile ` +
        `ante-NOL (${B_REDD}) MENO il NOL appena utilizzato (${B_NOLUSATO} — NON ricalcolarlo da zero), ` +
        `moltiplicato per l'aliquota IRES (${B_ALIQ}). Confronta questo numero con quanto l'azienda ` +
        `pagherebbe SENZA il NOL, cioe' ${B_REDD} moltiplicato per l'aliquota da sola: la differenza fra i ` +
        "due e' il valore concreto, in euro, dello scudo fiscale del NOL — piu' NOL residuo hai usato, " +
        'meno imposte hai pagato.',
      target: `Model!${B_IMPEFF}`,
      atteso: imposteEffettive,
      referenzia: [B_REDD, B_NOLUSATO, B_ALIQ],
      senzaLiteral: [],
      skills: ['dcf.nol'],
      minKeystrokes: 12,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M7-12-NOL',
      seed: rng.seed,
      brief: [
        '## NOL: le perdite fiscali pregresse sono un credito, non solo un ricordo',
        '',
        "Un'azienda che negli anni passati ha accumulato perdite fiscali non le perde: puo' riportarle a " +
          "nuovo (carry-forward) e usarle per ridurre l'imponibile fiscale degli anni futuri. E' uno scudo " +
          "fiscale vero, che va valorizzato nel Free Cash Flow esattamente come il D&A o gli interessi " +
          'passivi: riduce le imposte EFFETTIVAMENTE pagate, non solo quelle "sulla carta".',
        '',
        '**Perche\' serve un MIN e non una sottrazione diretta**: il NOL utilizzato in un anno non puo\' MAI ' +
          'superare due tetti indipendenti — il NOL residuo che hai davvero disponibile, e il reddito ' +
          "imponibile dell'anno (non serve azzerarlo oltre lo zero, il NOL non genera un rimborso). Il NOL " +
          "utilizzato e' il PIU' PICCOLO fra i due tetti.",
        '',
        nolMaggioreDelReddito
          ? `Quest'anno il NOL residuo (${eur(nolResiduo)}) e' MAGGIORE del reddito imponibile ante-NOL ` +
            `(${eur(redditoImponibile)}): l'azienda azzera completamente l'imponibile di quest'anno, e una ` +
            "parte del NOL resta disponibile per gli anni futuri — vince il tetto del reddito imponibile."
          : `Quest'anno il NOL residuo (${eur(nolResiduo)}) e' MINORE del reddito imponibile ante-NOL ` +
            `(${eur(redditoImponibile)}): il NOL si esaurisce completamente, e sulla parte di reddito che ` +
            "resta scoperta l'azienda paga le imposte piene — vince il tetto del NOL residuo.",
        '',
        `Dati dell'anno: NOL residuo a inizio anno ${eur(nolResiduo)}, reddito imponibile ante-NOL ` +
          `${eur(redditoImponibile)}, aliquota IRES ${pct(ALIQUOTA_FISCALE)}. Senza NOL, l'azienda avrebbe ` +
          `pagato ${eur(imposteSenzaNOL)} di imposte: quanto risparmia grazie al NOL lo scoprirai calcolando ` +
          'i due task qui sotto.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['NOL: lo scudo fiscale delle perdite pregresse'], { style: STILE_TITOLO }),
            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                "NOL residuo disponibile a inizio anno, €",
                "Reddito imponibile ante-NOL dell'anno, €",
                'Aliquota IRES',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_NOL, content: nolResiduo, style: STILE_INPUT, locked: true },
              { ref: B_REDD, content: redditoImponibile, style: STILE_INPUT, locked: true },
              { ref: B_ALIQ, content: ALIQUOTA_FISCALE, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A9', ['Utilizzo del NOL'], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [
                "NOL utilizzato quest'anno, €",
                'Imposte effettivamente pagate, €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_NOLUSATO, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_IMPEFF, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=MIN(${B_NOL},${B_REDD}): il NOL utilizzato e' il piu' piccolo fra il NOL residuo disponibile e ` +
            "il reddito imponibile dell'anno.",
          10,
          'T1',
        ),
        hint(
          'H2',
          `=(${B_REDD}-${B_NOLUSATO})*${B_ALIQ}: reddito imponibile meno il NOL utilizzato, per l'aliquota ` +
            'IRES.',
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_NOLUSATO}`,
    };
  },
});
