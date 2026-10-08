/**
 * M12 · 01 — Live Deal Room: la transazione LBO integrata. [BOSS]
 *
 * Il livello finale tiene insieme il curriculum in un unico modello che si
 * chiude da solo, dall'EBITDA normalizzato fino alla decisione d'investimento:
 *
 *   1. Quality of Earnings: EBITDA riportato + addback legittimi.
 *   2. Sources & Uses, cash free / debt free: il compratore paga l'equity al
 *      venditore E rifinanzia il debito netto esistente, piu' le fee. Il debito
 *      nuovo copre una parte degli impieghi, lo sponsor mette il resto.
 *   3. Piano di rimborso su cinque anni con cash sweep al 100%: interessi sul
 *      debito di inizio anno (niente circolarita'), cassa disponibile, rimborso
 *      limitato dal debito residuo (MIN), debito di fine anno.
 *   4. Uscita: EV di uscita, equity di uscita, MoIC, IRR e una decisione
 *      INVESTI / PASSA contro l'hurdle del comitato, che dipende dal seed.
 *
 * Nessun prompt detta la formula: il mandato descrive la finanza, i
 * suggerimenti (a pagamento) danno la sintassi.
 *
 * Vincoli per costruzione, verificati nel generatore:
 *   - la cassa disponibile per il rimborso e' positiva ogni anno (la
 *     conversione in cassa supera sempre il costo del debito iniziale);
 *   - il debito non si estingue entro l'anno 5, cosi' non resta cassa
 *     inutilizzata da portare all'uscita (il modello non ha una riga cassa).
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eurM,
  multiplo,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

const ANNI = 5;
const COLONNE = ['C', 'D', 'E', 'F', 'G'] as const;
const ULTIMA = COLONNE[ANNI - 1];

// 1. Quality of Earnings
const B_EBITDA_REP = 'B4';
const B_ADD_SOCIO = 'B5';
const B_ADD_LEGALI = 'B6';
const B_EBITDA_NORM = 'B8';

// 2. Ipotesi
const B_MULT_IN = 'B11';
const B_ND_ESISTENTE = 'B12';
const B_FEE_PCT = 'B13';
const B_LEVA = 'B14';
const B_TASSO = 'B15';
const B_CRESCITA = 'B16';
const B_CONVERSIONE = 'B17';
const B_MULT_OUT = 'B18';
const B_HURDLE = 'B19';
const B_ANNI = 'B20';

// 3. Sources & Uses
const B_EV = 'B23';
const B_PREZZO_EQ = 'B24';
const B_FEE = 'B25';
const B_IMPIEGHI = 'B26';
const B_DEBITO = 'B27';
const B_SPONSOR = 'B28';

// 4. Piano di rimborso
const ROW_INTEST = 30;
const ROW_EBITDA = 31;
const ROW_INTERESSI = 32;
const ROW_CASSA = 33;
const ROW_RIMBORSO = 34;
const ROW_DEBITO = 35;

// 5. Uscita e decisione
const B_EV_OUT = 'B38';
const B_EQ_OUT = 'B39';
const B_MOIC = 'B40';
const B_IRR = 'B41';
const B_DECISIONE = 'B42';

const rowRange = (row: number) => `${COLONNE[0]}${row}:${ULTIMA}${row}`;

export default defineTemplate({
  id: 'M12-01-DEALROOM',
  module: 'M12',
  title: 'Live Deal Room: la transazione LBO integrata [BOSS]',
  rank: 5,
  mode: 'BOSS',
  estimatedSeconds: 1200,
  skills: ['qoe.normalization', 'lbo.sources-uses', 'lbo.debt-schedule', 'lbo.returns', 'lbo.exit'],
  prerequisites: [
    'M8-11-RETURNSATTRIBUTION',
    'M9-07-PROFORMALEVERAGE',
    'M10-05-REFINANCING',
    'M11-06-RESTATEMENT',
  ],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ebitdaRep = roundTo(triangular(r, 15_000_000, 20_000_000, 25_000_000), 100_000);
    const addSocio = roundTo(triangular(r, 300_000, 700_000, 1_200_000), 10_000);
    const addLegali = roundTo(triangular(r, 200_000, 600_000, 1_000_000), 10_000);
    const ebitdaNorm = ebitdaRep + addSocio + addLegali;

    const multIn = roundTo(triangular(r, 6.5, 8, 9.5), 0.5);
    const ndEsistente = roundTo(ebitdaNorm * triangular(r, 1, 1.8, 2.5), 100_000);
    const feePct = roundTo(triangular(r, 0.02, 0.025, 0.035), 0.001);
    const leva = roundTo(triangular(r, 4, 4.75, 5.5), 0.25);
    const tasso = roundTo(triangular(r, 0.065, 0.075, 0.09), 0.0025);
    const crescita = roundTo(triangular(r, 0.03, 0.06, 0.09), 0.005);
    // Conversione in cassa sempre sopra il costo del debito iniziale: almeno
    // 10 punti di EBITDA restano per il rimborso gia' nel primo anno.
    const conversione = roundTo(leva * tasso + triangular(r, 0.1, 0.18, 0.25), 0.01);
    const multOut = roundTo(multIn + triangular(r, -1, 0, 1.5), 0.5);
    // L'hurdle si estrae dopo aver calcolato l'IRR (in fondo): cade sempre a
    // 1-4 punti dall'IRR, sopra o sotto, cosi' entrambe le decisioni escono
    // con la stessa frequenza e nessuna e' un pareggio ambiguo.
    const rHurdle = rng.fork('hurdle');

    // --- Sources & Uses ---
    const ev = ebitdaNorm * multIn;
    const prezzoEquity = ev - ndEsistente;
    const fee = ev * feePct;
    const impieghi = prezzoEquity + ndEsistente + fee;
    const debito = ebitdaNorm * leva;
    const sponsor = impieghi - debito;

    // --- Piano di rimborso ---
    const ebitda: number[] = [];
    const interessi: number[] = [];
    const cassa: number[] = [];
    const rimborso: number[] = [];
    const debitoFine: number[] = [];
    let ePrec = ebitdaNorm;
    let dPrec = debito;
    for (let t = 0; t < ANNI; t++) {
      const e = ePrec * (1 + crescita);
      const i = dPrec * tasso;
      const c = e * conversione - i;
      const rim = Math.min(dPrec, c);
      const d = dPrec - rim;
      if (c <= 0) throw new Error('M12-01: cassa per il rimborso non positiva');
      ebitda.push(e);
      interessi.push(i);
      cassa.push(c);
      rimborso.push(rim);
      debitoFine.push(d);
      ePrec = e;
      dPrec = d;
    }
    if (debitoFine[ANNI - 1] <= 0) throw new Error('M12-01: debito estinto prima dell\'uscita');

    // --- Uscita ---
    const evOut = ebitda[ANNI - 1] * multOut;
    const eqOut = evOut - debitoFine[ANNI - 1];
    const moic = eqOut / sponsor;
    const irr = Math.pow(moic, 1 / ANNI) - 1;
    const scarto = (rHurdle.next() < 0.5 ? -1 : 1) * (0.01 + rHurdle.next() * 0.03);
    const hurdle = Math.min(0.3, Math.max(0.1, roundTo(irr + scarto, 0.01)));
    const decisione = irr >= hurdle ? 'INVESTI' : 'PASSA';

    const c1 = COLONNE[0];
    const tasks: Task[] = [
      taskFormula({
        id: 'T1',
        prompt:
          `In ${B_EBITDA_NORM} l'EBITDA normalizzato: quello riportato a bilancio, rettificato per i due ` +
          'costi che un compratore non sosterra\' (sezione 1).',
        target: `Model!${B_EBITDA_NORM}`,
        atteso: ebitdaNorm,
        referenzia: [B_EBITDA_REP, B_ADD_SOCIO, B_ADD_LEGALI],
        senzaLiteral: [],
        skills: ['qoe.normalization'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt: `In ${B_EV} l'Enterprise Value pagato, al multiplo d'ingresso concordato.`,
        target: `Model!${B_EV}`,
        atteso: ev,
        referenzia: [B_EBITDA_NORM, B_MULT_IN],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T3',
        prompt: `In ${B_PREZZO_EQ} quanto incassa il venditore per le sue azioni.`,
        target: `Model!${B_PREZZO_EQ}`,
        atteso: prezzoEquity,
        referenzia: [B_EV, B_ND_ESISTENTE],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T4',
        prompt: `In ${B_FEE} le fee di transazione in euro.`,
        target: `Model!${B_FEE}`,
        atteso: fee,
        referenzia: [B_EV, B_FEE_PCT],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T5',
        prompt:
          `In ${B_IMPIEGHI} il totale degli impieghi: tutto il denaro che serve al closing. Il deal e' ` +
          'cash free / debt free: il debito esistente non resta in azienda.',
        target: `Model!${B_IMPIEGHI}`,
        atteso: impieghi,
        referenzia: [B_PREZZO_EQ, B_ND_ESISTENTE, B_FEE],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T6',
        prompt: `In ${B_DEBITO} il debito senior raccolto, alla leva concordata con le banche.`,
        target: `Model!${B_DEBITO}`,
        atteso: debito,
        referenzia: [B_EBITDA_NORM, B_LEVA],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T7',
        prompt: `In ${B_SPONSOR} l'equity che lo sponsor deve versare per chiudere le fonti.`,
        target: `Model!${B_SPONSOR}`,
        atteso: sponsor,
        referenzia: [B_IMPIEGHI, B_DEBITO],
        senzaLiteral: [],
        skills: ['lbo.sources-uses'],
        minKeystrokes: 8,
      }),
      rigaPiano(
        'T8',
        ROW_EBITDA,
        `Riga ${ROW_EBITDA}, ${rowRange(ROW_EBITDA)}: l'EBITDA di ogni anno, che cresce al tasso ipotizzato. ` +
          'Una formula sola, copiata su tutta la riga.',
        ebitda[0],
        ebitda[ANNI - 1],
        [`B${ROW_EBITDA}`, B_CRESCITA],
        ['lbo.debt-schedule'],
      ),
      rigaPiano(
        'T9',
        ROW_INTERESSI,
        `Riga ${ROW_INTERESSI}: gli interessi dell'anno, calcolati sul debito di inizio anno (cioe' quello ` +
          'di fine anno precedente): cosi\' il modello resta senza circolarita\'.',
        interessi[0],
        interessi[ANNI - 1],
        [`B${ROW_DEBITO}`, B_TASSO],
        ['lbo.debt-schedule'],
      ),
      rigaPiano(
        'T10',
        ROW_CASSA,
        `Riga ${ROW_CASSA}: la cassa disponibile per rimborsare il debito, cioe' l'EBITDA convertito in ` +
          'cassa secondo l\'ipotesi, dopo aver pagato gli interessi.',
        cassa[0],
        cassa[ANNI - 1],
        [`${c1}${ROW_EBITDA}`, B_CONVERSIONE, `${c1}${ROW_INTERESSI}`],
        ['lbo.debt-schedule'],
      ),
      rigaPiano(
        'T11',
        ROW_RIMBORSO,
        `Riga ${ROW_RIMBORSO}: il rimborso con cash sweep al 100%. Tutta la cassa disponibile va a ripagare ` +
          'il debito, ma non si puo\' rimborsare piu\' del debito che resta.',
        rimborso[0],
        rimborso[ANNI - 1],
        [`B${ROW_DEBITO}`, `${c1}${ROW_CASSA}`],
        ['lbo.debt-schedule'],
        ['MIN'],
      ),
      rigaPiano(
        'T12',
        ROW_DEBITO,
        `Riga ${ROW_DEBITO}: il debito di fine anno.`,
        debitoFine[0],
        debitoFine[ANNI - 1],
        [`B${ROW_DEBITO}`, `${c1}${ROW_RIMBORSO}`],
        ['lbo.debt-schedule'],
      ),
      taskFormula({
        id: 'T13',
        prompt: `In ${B_EV_OUT} l'Enterprise Value all'uscita, a fine anno ${ANNI}, al multiplo di uscita ipotizzato.`,
        target: `Model!${B_EV_OUT}`,
        atteso: evOut,
        referenzia: [`${ULTIMA}${ROW_EBITDA}`, B_MULT_OUT],
        senzaLiteral: [],
        skills: ['lbo.exit'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T14',
        prompt: `In ${B_EQ_OUT} il valore dell'equity dello sponsor all'uscita.`,
        target: `Model!${B_EQ_OUT}`,
        atteso: eqOut,
        referenzia: [B_EV_OUT, `${ULTIMA}${ROW_DEBITO}`],
        senzaLiteral: [],
        skills: ['lbo.exit'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T15',
        prompt: `In ${B_MOIC} il multiplo sul capitale investito (MoIC) dello sponsor.`,
        target: `Model!${B_MOIC}`,
        atteso: moic,
        referenzia: [B_EQ_OUT, B_SPONSOR],
        senzaLiteral: [],
        skills: ['lbo.returns'],
        minKeystrokes: 8,
      }),
      taskFormula({
        id: 'T16',
        prompt:
          `In ${B_IRR} l'IRR dello sponsor. Un solo versamento all'ingresso e un solo incasso all'uscita: ` +
          `bastano MoIC e durata dell'investimento (${B_ANNI}).`,
        target: `Model!${B_IRR}`,
        atteso: irr,
        referenzia: [B_MOIC, B_ANNI],
        senzaLiteral: [1],
        skills: ['lbo.returns'],
        minKeystrokes: 14,
      }),
      {
        id: 'T17',
        prompt:
          `In ${B_DECISIONE} la raccomandazione al comitato, calcolata e non battuta a mano: "INVESTI" se ` +
          `l'IRR raggiunge almeno l'hurdle (${B_HURDLE}), altrimenti "PASSA". Se cambia un'ipotesi, la ` +
          'raccomandazione deve aggiornarsi da sola.',
        targetCell: `Model!${B_DECISIONE}`,
        check: [
          { kind: 'mustBeFormula' },
          { kind: 'text', expected: decisione },
          { kind: 'mustReference', cells: [B_IRR, B_HURDLE] },
          { kind: 'mustUseFunction', functions: ['IF'] },
        ],
        skills: ['lbo.returns', 'xl.logical'],
        minKeystrokes: 30,
      },
    ];

    const brief = [
      '## Live Deal Room — il comitato ti aspetta',
      '',
      'Lo sponsor vuole comprare il 100% di un\'azienda industriale con un leveraged buyout. Hai tutti i ' +
        'dati nel foglio: costruisci il modello dall\'inizio alla fine e porta al comitato una ' +
        'raccomandazione. Nessuna formula suggerita: il mandato dice cosa serve, il come e\' tuo ' +
        '(i suggerimenti ci sono, ma costano XP).',
      '',
      '### 1. Quality of Earnings',
      `L'EBITDA a bilancio sconta il compenso eccedente del socio uscente e oneri legali straordinari ` +
        'che non si ripeteranno: vanno riaggiunti.',
      '',
      '### 2. Sources & Uses',
      `Il prezzo e' ${multiplo(multIn)} l'EBITDA normalizzato. L'operazione e' **cash free / debt free**: ` +
        'lo sponsor paga l\'equity al venditore e rifinanzia per intero il debito netto esistente; sopra ' +
        `ci sono le fee. Le banche prestano ${multiplo(leva)} l'EBITDA normalizzato al ${pct(tasso, 2)}; ` +
        'il resto lo mette lo sponsor.',
      '',
      '### 3. Piano di rimborso',
      `Cinque anni, EBITDA in crescita del ${pct(crescita)} annuo. Il ${pct(conversione, 0)} dell'EBITDA ` +
        'diventa cassa prima degli interessi (dopo tasse, capex e capitale circolante); tutto quello che ' +
        'resta dopo gli interessi va a rimborsare il debito (**cash sweep al 100%**).',
      '',
      '### 4. Uscita e decisione',
      `Uscita a fine anno ${ANNI} a ${multiplo(multOut)} l'EBITDA. Il comitato investe solo se l'IRR ` +
        `raggiunge almeno il ${pct(hurdle, 0)}.`,
      '',
      `Ordine di grandezza per orientarti: EBITDA riportato ${eurM(ebitdaRep)}.`,
    ].join('\n');

    const intestazioni = ['Closing', ...COLONNE.map((_, i) => `Anno ${i + 1}`)];

    const sheet = foglio(
      'Model',
      [
        riga('A1', ['LIVE DEAL ROOM — LBO INTEGRATO'], { style: STILE_TITOLO }),

        riga('A3', ['1. Quality of Earnings', '€'], { style: STILE_TITOLO }),
        colonna(
          'A4',
          ['EBITDA riportato a bilancio', 'Compenso eccedente del socio uscente', 'Oneri legali straordinari'],
          { style: STILE_ETICHETTA },
        ),
        colonna(B_EBITDA_REP, [ebitdaRep, addSocio, addLegali], { style: STILE_INPUT }),
        colonna('A8', ['EBITDA normalizzato'], { style: STILE_ETICHETTA }),
        [{ ref: B_EBITDA_NORM, content: null, locked: false, style: STILE_TOTALE }],

        riga('A10', ['2. Ipotesi'], { style: STILE_TITOLO }),
        colonna(
          'A11',
          [
            "Multiplo d'ingresso (EV / EBITDA normalizzato)",
            'Debito netto esistente, rifinanziato al closing, €',
            "Fee di transazione, % dell'EV",
            'Leva senior (debito / EBITDA normalizzato)',
            "Tasso d'interesse senior",
            'Crescita annua EBITDA',
            'EBITDA convertito in cassa prima degli interessi',
            'Multiplo di uscita (EV / EBITDA anno 5)',
            'IRR minimo del comitato (hurdle)',
            'Durata dell\'investimento, anni',
          ],
          { style: STILE_ETICHETTA },
        ),
        [{ ref: B_MULT_IN, content: multIn, style: STILE_INPUT_MULTIPLO, locked: true }],
        [{ ref: B_ND_ESISTENTE, content: ndEsistente, style: STILE_INPUT, locked: true }],
        [{ ref: B_FEE_PCT, content: feePct, style: STILE_INPUT_PCT, locked: true }],
        [{ ref: B_LEVA, content: leva, style: STILE_INPUT_MULTIPLO, locked: true }],
        [{ ref: B_TASSO, content: tasso, style: { ...STILE_INPUT_PCT, numFmt: '0.00%' }, locked: true }],
        [{ ref: B_CRESCITA, content: crescita, style: STILE_INPUT_PCT, locked: true }],
        [{ ref: B_CONVERSIONE, content: conversione, style: STILE_INPUT_PCT, locked: true }],
        [{ ref: B_MULT_OUT, content: multOut, style: STILE_INPUT_MULTIPLO, locked: true }],
        [{ ref: B_HURDLE, content: hurdle, style: STILE_INPUT_PCT, locked: true }],
        [{ ref: B_ANNI, content: ANNI, style: { ...STILE_INPUT, numFmt: '0' }, locked: true }],

        riga('A22', ['3. Sources & Uses', '€'], { style: STILE_TITOLO }),
        colonna(
          'A23',
          [
            'Enterprise Value',
            "Prezzo dell'equity al venditore",
            'Fee di transazione',
            'Totale impieghi',
            'Debito senior raccolto',
            'Equity dello sponsor',
          ],
          { style: STILE_ETICHETTA },
        ),
        [{ ref: B_EV, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_PREZZO_EQ, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_FEE, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_IMPIEGHI, content: null, locked: false, style: STILE_TOTALE }],
        [{ ref: B_DEBITO, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_SPONSOR, content: null, locked: false, style: STILE_TOTALE }],

        riga(`A${ROW_INTEST}`, ['4. Piano di rimborso (cash sweep 100%)', ...intestazioni], { style: STILE_TITOLO }),
        colonna(
          `A${ROW_EBITDA}`,
          ['EBITDA', 'Interessi sul debito di inizio anno', 'Cassa disponibile per il rimborso', 'Rimborso del debito', 'Debito di fine anno'],
          { style: STILE_ETICHETTA },
        ),
        [{ ref: `B${ROW_EBITDA}`, content: `=${B_EBITDA_NORM}`, style: STILE_FORMULA, locked: true }],
        [{ ref: `B${ROW_DEBITO}`, content: `=${B_DEBITO}`, style: STILE_FORMULA, locked: true }],
        ...[ROW_EBITDA, ROW_INTERESSI, ROW_CASSA, ROW_RIMBORSO, ROW_DEBITO].map((row) =>
          COLONNE.map((c) => ({
            ref: `${c}${row}`,
            content: null,
            locked: false,
            style: row === ROW_DEBITO ? STILE_TOTALE : STILE_FORMULA,
          })),
        ),

        riga('A37', ['5. Uscita e decisione'], { style: STILE_TITOLO }),
        colonna(
          'A38',
          ["Enterprise Value all'uscita, €", "Equity dello sponsor all'uscita, €", 'MoIC', 'IRR', 'Raccomandazione'],
          { style: STILE_ETICHETTA },
        ),
        [{ ref: B_EV_OUT, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_EQ_OUT, content: null, locked: false, style: STILE_FORMULA }],
        [{ ref: B_MOIC, content: null, locked: false, style: { ...STILE_FORMULA, numFmt: '0.00x' } }],
        [{ ref: B_IRR, content: null, locked: false, style: STILE_FORMULA_PCT }],
        [{ ref: B_DECISIONE, content: null, locked: false, style: { ...STILE_TOTALE, numFmt: '@' } }],
      ],
      { colWidths: { A: 380, B: 130, C: 120, D: 120, E: 120, F: 120, G: 120 }, frozenCols: 1 },
    );

    return {
      templateId: 'M12-01-DEALROOM',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 120 }),
      startAt: `Model!${B_EBITDA_NORM}`,
      hints: [
        hint('H1', `=SUM(${B_EBITDA_REP}:${B_ADD_LEGALI}): riportato piu' i due addback.`, 15, 'T1'),
        hint(
          'H2',
          `Impieghi = prezzo dell'equity + debito esistente rifinanziato + fee: =${B_PREZZO_EQ}+${B_ND_ESISTENTE}+${B_FEE}. ` +
            `Il prezzo dell'equity e' EV meno debito netto: =${B_EV}-${B_ND_ESISTENTE}.`,
          20,
          'T5',
        ),
        hint('H3', `L'equity dello sponsor chiude le fonti: =${B_IMPIEGHI}-${B_DEBITO}.`, 15, 'T7'),
        hint(
          'H4',
          `In ${c1}${ROW_EBITDA}: =B${ROW_EBITDA}*(1+$${B_CRESCITA.slice(0, 1)}$${B_CRESCITA.slice(1)}). ` +
            'Il dollaro tiene ferma la cella dell\'ipotesi quando copi verso destra.',
          20,
          'T8',
        ),
        hint(
          'H5',
          `In ${c1}${ROW_INTERESSI}: =B${ROW_DEBITO}*$B$${B_TASSO.slice(1)} — il debito di fine anno precedente.`,
          20,
          'T9',
        ),
        hint(
          'H6',
          `In ${c1}${ROW_RIMBORSO}: =MIN(B${ROW_DEBITO},${c1}${ROW_CASSA}). In ${c1}${ROW_DEBITO}: ` +
            `=B${ROW_DEBITO}-${c1}${ROW_RIMBORSO}.`,
          20,
          'T11',
        ),
        hint('H7', `IRR con due flussi: =${B_MOIC}^(1/${B_ANNI})-1.`, 20, 'T16'),
        hint('H8', `=IF(${B_IRR}>=${B_HURDLE},"INVESTI","PASSA")`, 15, 'T17'),
      ],
    };
  },
});

/** Una riga del piano: la formula di C copiata fino a G, coerente e senza errori. */
function rigaPiano(
  id: string,
  row: number,
  prompt: string,
  attesoPrimoAnno: number,
  attesoUltimoAnno: number,
  referenzia: readonly string[],
  skills: readonly string[],
  funzioni?: readonly string[],
): Task {
  const range = rowRange(row);
  return {
    id,
    prompt,
    targetCell: `Model!${range}`,
    check: [
      { kind: 'mustBeFormula' },
      { kind: 'value', expected: attesoPrimoAnno },
      { kind: 'value', expected: attesoUltimoAnno, at: `${ULTIMA}${row}` },
      { kind: 'mustReference', cells: referenzia },
      { kind: 'mustNotContainLiteral', except: [0, 1] },
      ...(funzioni ? [{ kind: 'mustUseFunction' as const, functions: funzioni }] : []),
      { kind: 'consistentRow', range: `Model!${range}` },
      { kind: 'noError' },
    ],
    skills,
    minKeystrokes: 20,
  };
}
