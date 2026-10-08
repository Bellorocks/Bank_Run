/**
 * M7 · 01 — FCFF vs FCFE: due flussi, due tassi di sconto.
 *
 * Primo livello del modulo DCF. Introduce la distinzione fra i due flussi di
 * cassa che si possono scontare in una valutazione:
 *
 *   - FCFF (Free Cash Flow to Firm): il flusso disponibile per TUTTI i
 *     finanziatori dell'azienda, debito ED equity insieme, PRIMA del
 *     servizio del debito. Si sconta al WACC (il costo medio ponderato di
 *     tutte le fonti di capitale) — il WACC arriva nei livelli successivi di
 *     questo modulo, qui non si sconta ancora nulla.
 *   - FCFE (Free Cash Flow to Equity): il flusso che resta ai SOLI azionisti,
 *     DOPO aver pagato gli interessi e rimborsato (o incassato) debito. Si
 *     sconta al costo del capitale proprio (Ke), MAI al WACC.
 *
 * IL PUNTO PIU' IMPORTANTE DEL LIVELLO — ripetuto nel brief e nel prompt di
 * T2: scontare l'FCFE al WACC e' l'errore classico. Il WACC e' una media fra
 * costo del debito (piu' basso, perche' il debito e' meno rischioso per chi
 * lo presta) e costo dell'equity (piu' alto). L'FCFE e' un flusso che spetta
 * SOLO agli azionisti, quindi il suo rischio e' quello dell'equity levered,
 * non una media col debito: scontarlo al WACC usa un tasso troppo BASSO per
 * il suo rischio vero, e quindi SOVRASTIMA il valore dell'equity.
 *
 * DERIVAZIONE ALGEBRICA DEI DUE TASK, calcolata in forma chiusa nel
 * generate() (non un placeholder):
 *
 *   T1  FCFF = EBIT * (1 - aliquota) + D&A - Capex - ΔNWC
 *   T2  FCFE = FCFF - Interessi passivi netti * (1 - aliquota) - Rimborso netto di debito
 *
 * CONVENZIONI DI SEGNO:
 *   - ΔNWC: stessa convenzione stabilita in M3-03 (skill nwc.fcf-impact,
 *     prerequisito di questo livello) — positiva = il NWC e' aumentato, ha
 *     ASSORBITO cassa, quindi si sottrae. Puo' essere negativa (NWC che
 *     libera cassa): sottrarre un negativo la restituisce.
 *   - Interessi passivi netti: sempre un costo, sempre positivi come dato;
 *     nel calcolo dell'FCFE si applica loro lo scudo fiscale (si tassano
 *     "in meno", esattamente come l'EBIT) prima di sottrarli, perche' sono
 *     gia' un costo DEDOTTO ai fini fiscali (a differenza di Capex e ΔNWC,
 *     che sono voci di cassa, non di Conto Economico, e quindi non hanno
 *     scudo fiscale proprio).
 *   - Rimborso netto di debito: positivo = l'azienda ha rimborsato piu'
 *     debito di quanto ne abbia acceso nell'anno, riducendo la cassa
 *     disponibile per gli azionisti. Si sottrae sempre.
 *
 * Aliquota fiscale FISSA al 24% (dato di legge italiano, IRES post-2017: mai
 * randomizzata, coerente con m1/09-imposte.ts). Tutti gli altri input sono
 * generati come multipli di 1.000, quindi ogni prodotto per l'aliquota resta
 * un numero esatto in virgola: non serve una tolleranza allargata.
 *
 * Geometria fissa: nessuna riga dipende dal seed, quindi i riferimenti di
 * cella sono letterali per costruzione, come in M3-03 e M1-09.
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
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
} from '../../authoring';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EBIT = 'B4'; // EBIT dell'anno (dato, bloccato)
const B_ALIQ = 'B5'; // Aliquota fiscale, fissa 24% (dato, bloccato)
const B_DA = 'B6'; // Ammortamenti (D&A) dell'anno (dato, bloccato)
const B_CAPEX = 'B7'; // Capex dell'anno (dato, bloccato)
const B_DNWC = 'B8'; // ΔNWC dell'anno, gia' con segno (dato, bloccato)
const B_INT = 'B9'; // Interessi passivi netti dell'anno (dato, bloccato)
const B_RIMB = 'B10'; // Rimborso netto di debito dell'anno (dato, bloccato)

const B_FCFF = 'B14'; // T1
const B_FCFE = 'B15'; // T2

const ALIQUOTA_FISCALE = 0.24; // dato di legge, non randomizzato

export default defineTemplate({
  id: 'M7-01-FCFFFCFE',
  module: 'M7',
  title: 'FCFF vs FCFE: due flussi, due tassi di sconto',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['dcf.fcff-fcfe'],
  prerequisites: ['M3-03-NWCEFCF'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBIT: un valore plausibile per una mid-cap, in migliaia.
    const ebit = r.int(2000, 8000) * 1000;

    // D&A e Capex: range indipendenti, entrambi positivi.
    const da = r.int(300, 1200) * 1000;
    const capex = r.int(400, 1800) * 1000;

    // ΔNWC: puo' essere positiva (assorbe cassa) o negativa (ne libera),
    // esattamente come in M3-03 — non ha un segno fisso fra un seed e l'altro.
    const deltaNWC = r.int(-400, 500) * 1000;

    // Interessi passivi netti: sempre un costo, range indipendente.
    const interessi = r.int(100, 600) * 1000;

    // Rimborso netto di debito: positivo, riduce la cassa per l'equity.
    const rimborsoDebito = r.int(100, 800) * 1000;

    // Valori attesi, calcolati con la STESSA algebra dei due task.
    const fcff = ebit * (1 - ALIQUOTA_FISCALE) + da - capex - deltaNWC;
    const fcfe = fcff - interessi * (1 - ALIQUOTA_FISCALE) - rimborsoDebito;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_FCFF} calcola il FCFF (Free Cash Flow to Firm), il flusso di cassa disponibile per TUTTI ` +
        `i finanziatori (debito ed equity insieme), PRIMA del servizio del debito: parti dall'EBIT ` +
        `(${B_EBIT}) tassato con l'aliquota fiscale (${B_ALIQ}), aggiungi gli ammortamenti D&A (${B_DA}, ` +
        `un costo non monetario da riaggiungere), sottrai il Capex (${B_CAPEX}, un'uscita di cassa che ` +
        `non passa da Conto Economico) e sottrai la ΔNWC (${B_DNWC}, gia' col segno giusto: se positiva ` +
        "ha assorbito cassa e va sottratta, se negativa ne ha liberata e sottrarla la restituisce — e' lo " +
        'stesso segno gia\' visto in M3-03).',
      target: `Model!${B_FCFF}`,
      atteso: fcff,
      referenzia: [B_EBIT, B_ALIQ, B_DA, B_CAPEX, B_DNWC],
      senzaLiteral: [1],
      skills: ['dcf.fcff-fcfe'],
      minKeystrokes: 28,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_FCFE} calcola il FCFE (Free Cash Flow to Equity), il flusso che resta ai SOLI azionisti: ` +
        `parti dal FCFF appena calcolato (${B_FCFF} — NON ricalcolarlo da zero), sottrai gli interessi ` +
        `passivi netti al netto dello scudo fiscale (${B_INT} tassato con l'aliquota ${B_ALIQ}: sono gia' ` +
        'un costo dedotto a Conto Economico, quindi si tassano "in meno" come l\'EBIT prima di sottrarli) ' +
        `e sottrai il rimborso netto di debito dell'anno (${B_RIMB}, cassa uscita verso i finanziatori di ` +
        'debito, non disponibile per gli azionisti). ATTENZIONE: il FCFE si scontera\' al costo del ' +
        'capitale proprio (Ke), MAI al WACC — il WACC e\' una media col costo del debito, piu\' basso, e ' +
        "userebbe un tasso troppo leggero per il rischio vero di un flusso che spetta solo all'equity, " +
        'sovrastimandone il valore. Qui non sconti ancora nulla: il punto e\' impararlo per i livelli che ' +
        'seguono.',
      target: `Model!${B_FCFE}`,
      atteso: fcfe,
      referenzia: [B_FCFF, B_INT, B_ALIQ, B_RIMB],
      senzaLiteral: [1],
      skills: ['dcf.fcff-fcfe'],
      minKeystrokes: 22,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M7-01-FCFFFCFE',
      seed: rng.seed,
      brief: [
        '## FCFF vs FCFE: due flussi, due tassi di sconto',
        '',
        "Una valutazione DCF sconta un flusso di cassa futuro. Ma \"il\" flusso di cassa non e' uno solo: " +
          'esistono due versioni, e usare quella sbagliata col tasso sbagliato e\' l\'errore piu\' comune di ' +
          'chi inizia a costruire un DCF.',
        '',
        '- **FCFF (Free Cash Flow to Firm)**: il flusso disponibile per TUTTI i finanziatori dell\'azienda, ' +
          'debito ED equity insieme, calcolato PRIMA di pagare interessi o rimborsare debito. Si sconta al ' +
          '**WACC**, il costo medio ponderato di tutte le fonti di capitale (lo costruirai nei prossimi ' +
          'livelli di questo modulo).',
        '- **FCFE (Free Cash Flow to Equity)**: il flusso che resta ai SOLI azionisti, dopo che il debito e\' ' +
          'stato servito (interessi pagati, capitale rimborsato o acceso). Si sconta al **costo del ' +
          'capitale proprio (Ke)**.',
        '',
        '> **FCFF = EBIT × (1 − aliquota) + D&A − Capex − ΔNWC**',
        '> **FCFE = FCFF − Interessi passivi netti × (1 − aliquota) − Rimborso netto di debito**',
        '',
        "**L'errore da non fare, mai**: scontare l'FCFE al WACC. Il WACC e' una media fra il costo del " +
          'debito (piu\' basso, il debito e\' meno rischioso per chi presta) e il costo dell\'equity (piu\' ' +
          'alto). L\'FCFE spetta SOLO agli azionisti: il suo rischio e\' quello dell\'equity levered, non una ' +
          'media col debito. Scontarlo al WACC userebbe un tasso troppo basso per il suo rischio vero, e il ' +
          "valore dell'equity risulterebbe SOVRASTIMATO. In questo livello non sconti ancora nulla — il " +
          'punto e\' fissare la distinzione prima di arrivare al WACC e al Ke nei livelli successivi.',
        '',
        `Dati dell'anno: EBIT ${eur(ebit)}, aliquota fiscale ${pct(ALIQUOTA_FISCALE)} (l'IRES italiana, ` +
          `fissa per legge), ammortamenti (D&A) ${eur(da)}, Capex ${eur(capex)}, ΔNWC ${eur(deltaNWC)}, ` +
          `interessi passivi netti ${eur(interessi)}, rimborso netto di debito dell'anno ${eur(rimborsoDebito)}.`,
        '',
        "Calcola prima il FCFF, poi usalo per arrivare al FCFE. Il secondo task NON si ricalcola da zero: " +
          'parte dal risultato del primo.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['FCFF vs FCFE: due flussi, due tassi di sconto'], { style: STILE_TITOLO }),

            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                "EBIT dell'anno, €",
                'Aliquota fiscale',
                "Ammortamenti (D&A) dell'anno, €",
                "Capex dell'anno, €",
                "ΔNWC dell'anno (gia' col segno), €",
                'Interessi passivi netti, €',
                "Rimborso netto di debito dell'anno, €",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EBIT, content: ebit, style: STILE_INPUT, locked: true },
              { ref: B_ALIQ, content: ALIQUOTA_FISCALE, style: STILE_INPUT_PCT, locked: true },
              { ref: B_DA, content: da, style: STILE_INPUT, locked: true },
              { ref: B_CAPEX, content: capex, style: STILE_INPUT, locked: true },
              { ref: B_DNWC, content: deltaNWC, style: STILE_INPUT, locked: true },
              { ref: B_INT, content: interessi, style: STILE_INPUT, locked: true },
              { ref: B_RIMB, content: rimborsoDebito, style: STILE_INPUT, locked: true },
            ],

            riga('A13', ['Free Cash Flow'], { style: STILE_TITOLO }),
            colonna(
              'A14',
              ['FCFF (Free Cash Flow to Firm), €', 'FCFE (Free Cash Flow to Equity), €'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_FCFF, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_FCFE, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_EBIT}*(1-${B_ALIQ})+${B_DA}-${B_CAPEX}-${B_DNWC}: EBIT tassato, piu' D&A, meno Capex, ` +
            'meno ΔNWC (col suo segno).',
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_FCFF}-${B_INT}*(1-${B_ALIQ})-${B_RIMB}: FCFF meno interessi al netto dello scudo fiscale, ` +
            'meno il rimborso netto di debito. Non e\' il WACC che sconta questo flusso: e\' il Ke.',
          10,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_FCFF}`,
    };
  },
});
