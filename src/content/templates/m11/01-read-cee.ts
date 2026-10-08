/**
 * M11 · 01 — Bilancio CEE Reale: riclassificazione con nota integrativa.
 *
 * Un conto economico civilistico (art. 2425 c.c.) non ha una riga "EBITDA":
 * va costruito scegliendo le voci giuste. Qui il foglio riporta le voci A e B
 * come sono depositate, e il giocatore deve:
 *
 *   T1  EBITDA civilistico = totale A − voci B operative, ESCLUSI B10
 *       (ammortamenti e svalutazioni) e B12/B13 (accantonamenti)
 *   T2  EBITDA gestionale  = T1 + canoni di leasing operativo core (dalla nota
 *       integrativa), per confrontarlo con peer che applicano IFRS 16
 *   T3  CCN commerciale    = crediti verso clienti esigibili ENTRO l'esercizio
 *       + rimanenze − debiti verso fornitori; i crediti oltre 12 mesi restano fuori
 *
 * L'errore che il livello intercetta e' sommare tutte le voci B (EBITDA
 * troppo basso) o tutti i crediti (circolante gonfiato). La variazione delle
 * rimanenze di materie (B11) puo' essere positiva o negativa: va sottratta
 * col suo segno, come nello schema.
 */

import {
  defineTemplate,
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
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Conto economico (colonna C = importi)
const ROW_A1 = 4;
const ROW_A5 = 6;
const ROW_B6 = 7;
const ROW_B9 = 10;
const ROW_B11 = 12;
const ROW_B14 = 14;
// Nota integrativa e stato patrimoniale
const C_LEASING = 'C17';
const C_CRED_ENTRO = 'C20';
const C_RIMANENZE = 'C22';
const C_FORNITORI = 'C23';

const C_EBITDA_CIV = 'C26'; // T1
const C_EBITDA_GEST = 'C27'; // T2
const C_CCN = 'C28'; // T3

const c = (row: number) => `C${row}`;

export default defineTemplate({
  id: 'M11-01-READCEE',
  module: 'M11',
  title: 'Leggere un bilancio CEE: riclassificazione e nota integrativa',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['real.read-cee'],
  prerequisites: ['M1-01-SCHEMACEE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ricavi = roundTo(triangular(r, 40_000_000, 50_000_000, 60_000_000), 10_000);
    const varProdotti = roundTo(ricavi * triangular(r, -0.02, 0.005, 0.03), 1_000);
    const altriRicavi = roundTo(ricavi * triangular(r, 0.005, 0.015, 0.03), 1_000);
    const materie = roundTo(ricavi * triangular(r, 0.3, 0.38, 0.45), 1_000);
    const servizi = roundTo(ricavi * triangular(r, 0.12, 0.16, 0.2), 1_000);
    const godimento = roundTo(ricavi * triangular(r, 0.02, 0.03, 0.05), 1_000);
    const personale = roundTo(ricavi * triangular(r, 0.15, 0.2, 0.25), 1_000);
    const ammortamenti = roundTo(ricavi * triangular(r, 0.03, 0.045, 0.06), 1_000);
    const varMaterie = roundTo(ricavi * triangular(r, -0.015, 0, 0.015), 1_000);
    const accantonamenti = roundTo(ricavi * triangular(r, 0.002, 0.006, 0.012), 1_000);
    const oneriDiversi = roundTo(ricavi * triangular(r, 0.005, 0.01, 0.02), 1_000);
    const leasingCore = roundTo(godimento * triangular(r, 0.4, 0.6, 0.8), 1_000);

    const credEntro = roundTo(ricavi * triangular(r, 0.15, 0.22, 0.3), 1_000);
    const credOltre = roundTo(ricavi * triangular(r, 0.01, 0.03, 0.05), 1_000);
    const rimanenze = roundTo(ricavi * triangular(r, 0.08, 0.12, 0.16), 1_000);
    const fornitori = roundTo(ricavi * triangular(r, 0.12, 0.17, 0.22), 1_000);

    const totA = ricavi + varProdotti + altriRicavi;
    const ebitdaCiv = totA - (materie + servizi + godimento + personale + varMaterie + oneriDiversi);
    const ebitdaGest = ebitdaCiv + leasingCore;
    const ccn = credEntro + rimanenze - fornitori;

    const brief = [
      "Hai il conto economico depositato in formato CEE e due estratti della nota integrativa. Non c'e' " +
        "una riga EBITDA: costruiscila tu.",
      '',
      "- L'EBITDA e' il risultato operativo **prima** di ammortamenti e svalutazioni (B10) e degli " +
        'accantonamenti (B12): tutte le altre voci B si sottraggono al valore della produzione, ' +
        'ciascuna col suo segno (B11 puo\' essere negativa).',
      "- La nota integrativa rivela che in B8 (godimento beni di terzi) ci sono " +
        `${eur(leasingCore)} di canoni di leasing operativo su macchinari core. I peer quotati applicano ` +
        "IFRS 16 e quei canoni non li hanno nell'EBITDA: per confrontarli serve un EBITDA gestionale che li riaggiunga.",
      '- Il capitale circolante commerciale usa i crediti verso clienti **esigibili entro** 12 mesi; quelli ' +
        'oltre sono un finanziamento al cliente, non circolante.',
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['CONTO ECONOMICO CEE (art. 2425 c.c.) E NOTA INTEGRATIVA'], { style: STILE_TITOLO }),
      riga('A3', ['Voce', 'Descrizione', 'Importo (€)'], { style: STILE_TITOLO }),
      ...[
        ['A1', 'Ricavi delle vendite e delle prestazioni', ricavi],
        ['A2', 'Variazione rimanenze prodotti finiti', varProdotti],
        ['A5', 'Altri ricavi e proventi', altriRicavi],
        ['B6', 'Materie prime, sussidiarie e merci', materie],
        ['B7', 'Servizi', servizi],
        ['B8', 'Godimento beni di terzi', godimento],
        ['B9', 'Personale', personale],
        ['B10', 'Ammortamenti e svalutazioni', ammortamenti],
        ['B11', 'Variazione rimanenze materie prime', varMaterie],
        ['B12', 'Accantonamenti per rischi', accantonamenti],
        ['B14', 'Oneri diversi di gestione', oneriDiversi],
      ].map(([voce, descr, importo], i) => [
        { ref: `A${ROW_A1 + i}`, content: voce as string, locked: true },
        { ref: `B${ROW_A1 + i}`, content: descr as string, locked: true },
        { ref: `C${ROW_A1 + i}`, content: importo as number, style: STILE_INPUT, locked: true },
      ]),

      riga('A16', ['Nota integrativa'], { style: STILE_TITOLO }),
      riga('B17', ['di cui in B8: canoni leasing operativo macchinari core'], { style: STILE_ETICHETTA }),
      [{ ref: C_LEASING, content: leasingCore, style: STILE_INPUT, locked: true }],

      riga('A19', ['Stato patrimoniale (estratto)'], { style: STILE_TITOLO }),
      colonna(
        'B20',
        [
          'C.II.1 Crediti verso clienti, esigibili entro 12 mesi',
          'C.II.1 Crediti verso clienti, esigibili oltre 12 mesi',
          'C.I Rimanenze',
          'D.7 Debiti verso fornitori',
        ],
        { style: STILE_ETICHETTA },
      ),
      colonna(C_CRED_ENTRO, [credEntro, credOltre, rimanenze, fornitori], { style: STILE_INPUT }),

      riga('A25', ['Riclassificazione gestionale', '', '€'], { style: STILE_TITOLO }),
      colonna('B26', ['EBITDA civilistico', 'EBITDA gestionale (canoni core riaggiunti)', 'CCN commerciale'], {
        style: STILE_ETICHETTA,
      }),
      [{ ref: C_EBITDA_CIV, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: C_EBITDA_GEST, content: null, locked: false, style: STILE_FORMULA }],
      [{ ref: C_CCN, content: null, locked: false, style: STILE_TOTALE }],
    ], { colWidths: { A: 60, B: 420, C: 140 } });

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `In ${C_EBITDA_CIV} l'EBITDA civilistico, costruito dalle voci del conto economico.`,
        target: `Model!${C_EBITDA_CIV}`,
        atteso: ebitdaCiv,
        referenzia: [c(ROW_A1), c(ROW_A5), c(ROW_B6), c(ROW_B9), c(ROW_B11), c(ROW_B14)],
        senzaLiteral: [],
        skills: ['real.read-cee'],
        minKeystrokes: 40,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${C_EBITDA_GEST} l'EBITDA gestionale, confrontabile con i peer IFRS 16.`,
        target: `Model!${C_EBITDA_GEST}`,
        atteso: ebitdaGest,
        referenzia: [C_EBITDA_CIV, C_LEASING],
        senzaLiteral: [],
        skills: ['real.read-cee'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${C_CCN} il capitale circolante netto commerciale.`,
        target: `Model!${C_CCN}`,
        atteso: ccn,
        referenzia: [C_CRED_ENTRO, C_RIMANENZE, C_FORNITORI],
        senzaLiteral: [],
        skills: ['real.read-cee'],
        minKeystrokes: 12,
      }),
    ];

    return {
      templateId: 'M11-01-READCEE',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${C_EBITDA_CIV}`,
      hints: [
        hint(
          'H1',
          `=SUM(C${ROW_A1}:C${ROW_A5})-SUM(C${ROW_B6}:C${ROW_B9})-C${ROW_B11}-C${ROW_B14}: tutto A, meno le voci B tranne B10 e B12.`,
          15,
          'T1',
        ),
        hint('H2', `=${C_EBITDA_CIV}+${C_LEASING}`, 10, 'T2'),
        hint('H3', `=${C_CRED_ENTRO}+${C_RIMANENZE}-${C_FORNITORI}: i crediti oltre 12 mesi restano fuori.`, 10, 'T3'),
      ],
    };
  },
});
