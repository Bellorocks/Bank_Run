/**
 * M12 · 01 — Live Deal Room: la simulazione completa di transazione M&A/LBO. [BOSS]
 *
 * Il livello Capstone finale di DEAL DESK. Combina l'intero curriculum professionale:
 *
 *   1. Quality of Earnings (QoE):
 *      EBITDA Normalizzato = EBITDA Riportato + Spese Personali del Socio + Oneri Legali Straordinari.
 *
 *   2. EV / Equity Purchase Price:
 *      Enterprise Value = EBITDA Normalizzato × Multiplo di Ingresso (Entry Multiple).
 *      Equity Purchase Price = Enterprise Value - Debito Netto Esistente.
 *
 *   3. Strutturazione LBO & Sponsor Equity Plug:
 *      Totale Usi = Equity Purchase Price + Advisory/Financing Fees.
 *      Debito Finanziario Raccolto = EBITDA Normalizzato × Multiplo di Leva (es. 4.0x).
 *      Sponsor Equity (Plug) = Totale Usi - Debito Finanziario.
 *
 *   4. Rendimento Finale & Copertura Creditizia:
 *      Sponsor Net MoIC = Sponsor Net Equity all'Uscita / Sponsor Equity Iniziale.
 *      DSCR Pro-Forma = CFADS Operativo / Servizio Annuo del Debito.
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
  multiplo,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_MULTIPLO,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// Geometria fissa
const B_REP_EBITDA = 'B4'; // EBITDA Riportato (dato)
const B_ADDBACK_PERS = 'B5'; // Addback costi personali (dato)
const B_ADDBACK_LEGAL = 'B6'; // Addback spese legali one-off (dato)

const B_NORM_EBITDA = 'B8'; // T1: EBITDA Normalizzato = B4+B5+B6

const B_ENTRY_MULT = 'B11'; // Multiplo Entry (8.0x) (dato)
const B_EXIST_ND = 'B12'; // Debito Netto Esistente (dato)
const B_DEAL_FEES = 'B13'; // Commissioni Deal (dato)
const B_LEV_MULT = 'B14'; // Leva Finanziaria (4.0x) (dato)

const B_SPONSOR_EQ = 'B17'; // T2: Sponsor Equity Plug = (B8*B11 - B12) + B13 - (B8*B14)

const B_EXIT_EQ_NET = 'B20'; // Sponsor Net Equity all'uscita (dato)
const B_SPONSOR_MOIC = 'B21'; // T3: Sponsor MoIC = B20 / B17

const B_CFADS = 'B22'; // CFADS Operativo Annuo (dato)
const B_DEBT_SVC = 'B23'; // Servizio Totale del Debito (dato)
const B_DSCR = 'B24'; // T4: DSCR = B22 / B23

export default defineTemplate({
  id: 'M12-01-DEALROOM',
  module: 'M12',
  title: 'Live Deal Room: simulazione completa di transazione M&A/LBO [BOSS]',
  rank: 5,
  mode: 'BOSS',
  estimatedSeconds: 600,
  skills: ['lbo.attribution', 'ma.proforma-leverage', 'cred.ratios', 'real.restatement'],
  prerequisites: [
    'M8-11-RETURNSATTRIBUTION',
    'M9-07-PROFORMALEVERAGE',
    'M10-05-REFINANCING',
    'M11-06-RESTATEMENT',
  ],

  generate: (rng) => {
    const r = rng.fork('dati');

    const repEbitda = roundTo(triangular(r, 15_000_000, 20_000_000, 25_000_000), 500_000);
    const addbackPers = roundTo(triangular(r, 500_000, 1_000_000, 1_500_000), 100_000);
    const addbackLegal = roundTo(triangular(r, 500_000, 1_000_000, 1_500_000), 100_000);
    const normEbitda = repEbitda + addbackPers + addbackLegal;

    const entryMult = 8.0;
    const existNd = roundTo(normEbitda * 1.5, 500_000);
    const dealFees = roundTo(triangular(r, 2_000_000, 3_000_000, 4_000_000), 500_000);
    const levMult = 4.0;

    const ev = normEbitda * entryMult;
    const eqPurchase = ev - existNd;
    const totUses = eqPurchase + dealFees;
    const totDebt = normEbitda * levMult;
    const sponsorEq = totUses - totDebt;

    const exitEqNet = roundTo(sponsorEq * 2.8, 500_000); // 2.8x ritorno
    const sponsorMoic = exitEqNet / sponsorEq;

    const cfads = roundTo(normEbitda * 0.60, 250_000);
    const debtSvc = roundTo(totDebt * 0.12, 100_000);
    const dscr = cfads / debtSvc;

    const brief = [
      `Benvenuto nella **Live Deal Room finale [BOSS FIGHT]**.`,
      `Sei il Lead Dealmaker e devi completare la modellizzazione end-to-end dell'operazione di acquisizione e leveraged buyout:`,
      ``,
      `### Fasi del Deal:`,
      `1. **Fase 1 (QoE Normalization)**: Rettifica l'EBITDA da spese personali del socio (${eur(addbackPers)}) e oneri legali one-off (${eur(addbackLegal)}).`,
      `2. **Fase 2 (Strutturazione LBO & Sponsor Equity Plug)**:`,
      `   - Valuta il target a ${multiplo(entryMult)} EV/EBITDA con ${eur(existNd)} di debito netto e ${eur(dealFees)} di fee complessive.`,
      `   - Struttura debito bancario per ${multiplo(levMult)} EBITDA e calcola l'**Equity Plug versata dallo Sponsor** in \`${B_SPONSOR_EQ}\`.`,
      `3. **Fase 3 (Returns & Credito)**:`,
      `   - Calcola il **MoIC Netto dello Sponsor** in \`${B_SPONSOR_MOIC}\` (Exit Net Equity ${eur(exitEqNet)} / Sponsor Entry Equity).`,
      `   - Verifica il **DSCR Pro-Forma** in \`${B_DSCR}\` (CFADS ${eur(cfads)} / Servizio Debito ${eur(debtSvc)}).`,
    ].join('\n');

    const sheet = foglio('Model', [
      riga('A1', ['LIVE DEAL ROOM — TRANSAZIONE INTEGRATA M&A/LBO [BOSS]'], { style: STILE_TITOLO }),
      riga('A3', ['1. Quality of Earnings (QoE)', 'Valore (€)'], { style: STILE_TITOLO }),
      colonna('A4', [
        'EBITDA Riportato a Bilancio',
        'Addback: Spese Personali del Socio',
        'Addback: Oneri Legali Straordinari',
        'EBITDA NORMALIZZATO GESTIONALE',
      ], { style: STILE_ETICHETTA }),
      colonna('B4', [repEbitda, addbackPers, addbackLegal], { style: STILE_INPUT }),
      colonna(B_NORM_EBITDA, [null], { style: STILE_TOTALE, locked: false }),

      riga('A10', ['2. Parametri di Transazione & Leva LBO', 'Valore / Multiplo'], { style: STILE_TITOLO }),
      colonna('A11', [
        'Multiplo di Acquisto Entry (EV / EBITDA)',
        'Debito Netto Esistente Target (€)',
        'Commissioni Totali Transazione (€)',
        'Leva Finanziaria Raccordata (Debito / EBITDA)',
        'Enterprise Value Target (€)',
        'Equity Purchase Price (€)',
        'SPONSOR EQUITY PLUG (€)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_ENTRY_MULT, [entryMult], { style: STILE_INPUT_MULTIPLO }),
      colonna(B_EXIST_ND, [existNd, dealFees], { style: STILE_INPUT }),
      colonna(B_LEV_MULT, [levMult], { style: STILE_INPUT_MULTIPLO }),
      colonna('B15', [`=${B_NORM_EBITDA}*${B_ENTRY_MULT}`], { style: STILE_FORMULA }),
      colonna('B16', [`=B15-${B_EXIST_ND}`], { style: STILE_FORMULA }),
      colonna(B_SPONSOR_EQ, [null], { style: STILE_TOTALE, locked: false }),

      riga('A19', ['3. Ritorno Sponsor & Merito di Credito', 'Risultato'], { style: STILE_TITOLO }),
      colonna('A20', [
        'Sponsor Net Equity Finale all\'Uscita (€)',
        'SPONSOR NET MoIC (x)',
        'CFADS Operativo Annuo (€)',
        'Servizio Totale Annuo del Debito (€)',
        'PRO-FORMA DSCR (x)',
      ], { style: STILE_ETICHETTA }),
      colonna(B_EXIT_EQ_NET, [exitEqNet], { style: STILE_INPUT }),
      colonna(B_SPONSOR_MOIC, [null], { style: STILE_TOTALE, locked: false }),
      colonna(B_CFADS, [cfads, debtSvc], { style: STILE_INPUT }),
      colonna(B_DSCR, [null], { style: STILE_TOTALE, locked: false }),
    ]);

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt: `Calcola l'EBITDA Normalizzato in ${B_NORM_EBITDA}: =${B_REP_EBITDA}+${B_ADDBACK_PERS}+${B_ADDBACK_LEGAL} o =SUM(B4:B6).`,
        target: `Model!${B_NORM_EBITDA}`,
        atteso: normEbitda,
        referenzia: [B_REP_EBITDA, B_ADDBACK_PERS, B_ADDBACK_LEGAL],
        skills: ['lbo.attribution', 'real.restatement'],
      }),
      taskFormula({
        id: 'T2',
        prompt: `Calcola l'Equity dello Sponsor (Plug) in ${B_SPONSOR_EQ}: =(B16+${B_DEAL_FEES})-(${B_NORM_EBITDA}*${B_LEV_MULT}) o =(B15-B12+B13)-(B8*B14).`,
        target: `Model!${B_SPONSOR_EQ}`,
        atteso: sponsorEq,
        referenzia: [B_NORM_EBITDA, B_DEAL_FEES, B_LEV_MULT],
        skills: ['lbo.sources-uses', 'ma.proforma-leverage'],
      }),
      taskFormula({
        id: 'T3',
        prompt: `Calcola il MoIC Netto dello Sponsor in ${B_SPONSOR_MOIC}: =${B_EXIT_EQ_NET}/${B_SPONSOR_EQ}.`,
        target: `Model!${B_SPONSOR_MOIC}`,
        atteso: sponsorMoic,
        referenzia: [B_EXIT_EQ_NET, B_SPONSOR_EQ],
        skills: ['lbo.returns', 'lbo.attribution'],
      }),
      taskFormula({
        id: 'T4',
        prompt: `Calcola il DSCR Pro-Forma in ${B_DSCR}: =${B_CFADS}/${B_DEBT_SVC}.`,
        target: `Model!${B_DSCR}`,
        atteso: dscr,
        referenzia: [B_CFADS, B_DEBT_SVC],
        skills: ['cred.ratios'],
      }),
    ];

    return {
      templateId: 'M12-01-DEALROOM',
      seed: rng.seed,
      brief,
      sheets: [sheet],
      tasks,
      parScore: par(tasks, { letturaSecondi: 30 }),
      hints: [
        hint('H1', 'In B8 somma l\'EBITDA riportato e gli addback: =SUM(B4:B6).', 10, 'T1'),
        hint('H2', 'In B17 calcola il totale impieghi (B16+B13) meno il debito raccolto (B8*B14): =(B16+B13)-(B8*B14).', 20, 'T2'),
        hint('H3', 'In B21 dividi l\'equity di uscita per quella iniziale: =B20/B17.', 10, 'T3'),
        hint('H4', 'In B24 dividi il CFADS per il servizio del debito: =B22/B23.', 10, 'T4'),
      ],
    };
  },
});
