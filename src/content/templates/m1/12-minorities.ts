/**
 * M1 · 12 — Minorities e metodo del patrimonio netto.
 *
 * Due meccaniche di consolidamento DISTINTE, e il livello esiste apposta per
 * evitare che il giocatore le confonda (e' l'errore concettuale piu' comune
 * su questo argomento):
 *
 *  - CONTROLLATA (Scenario A): il gruppo la controlla, quindi la consolida
 *    al 100% linea per linea — l'utile consolidato del gruppo include GIA'
 *    tutto l'utile della controllata, non solo la quota di proprieta'. Dopo
 *    aver consolidato al 100%, si "TOGLIE" la fetta che spetta ai terzi
 *    (minority interest / quota di terzi) per arrivare all'utile di
 *    pertinenza del gruppo.
 *
 *  - PARTECIPATA (Scenario B, metodo del patrimonio netto / equity method):
 *    il gruppo NON la controlla (quota sotto la soglia di controllo), quindi
 *    NON la consolida mai linea per linea. In bilancio compare come una
 *    singola riga di partecipazione, il cui valore di carico si aggiorna
 *    ogni anno: SALE per la quota di utile maturato (il gruppo si e'
 *    arricchito anche se non ha incassato nulla), SCENDE per i dividendi
 *    incassati (un dividendo, in questo metodo, e' un disinvestimento della
 *    partecipazione — un rientro di cassa che riduce cio' che resta "dentro"
 *    la partecipazione — non un provento a Conto Economico).
 *
 * Due scenari indipendenti, `rng.fork` separato per ciascuno cosi' che
 * cambiare la scala dell'uno non sposti di un euro l'altro (stessa
 * precauzione di m1/04-fondi-rischi-tfr.ts).
 *
 * DERIVAZIONE ALGEBRICA DEI TRE TASK — scritta per esteso prima di generare
 * un numero, cosi' il test di fedelta' verifica la stessa formula che il
 * giocatore deve scrivere.
 *
 *   Scenario A (controllata):
 *     T1  QuotaTerzi        = UtileControllata × (1 - PercentualeGruppoA)
 *     T2  QuotaGruppo       = UtileConsolidato - QuotaTerzi
 *
 *   Scenario B (partecipata, equity method):
 *     T3  CaricoFinale      = CaricoIniziale + (UtilePartecipata × PercentualeGruppoB) - Dividendi
 *
 * Nessun controllo di quadratura in questo livello: sono tre calcoli diretti,
 * non uno schema che deve chiudere a zero.
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
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------

// Scenario A — controllata consolidata integralmente.
const A_UTILE_CTRL = 'B4'; // Utile della controllata (100%)
const A_PCT_GRUPPO = 'B5'; // % posseduta dal gruppo
const A_UTILE_CONS = 'B6'; // Utile consolidato del gruppo (include gia' la controllata al 100%)
const A_QUOTA_TERZI = 'B8'; // T1
const A_QUOTA_GRUPPO = 'B9'; // T2

// Scenario B — partecipata non controllata, metodo del patrimonio netto.
const B_CARICO0 = 'B13'; // Valore di carico iniziale della partecipazione
const B_PCT_GRUPPO = 'B14'; // % posseduta dal gruppo (sotto la soglia di controllo)
const B_UTILE_PART = 'B15'; // Utile della partecipata nell'anno
const B_DIVIDENDI = 'B16'; // Dividendi ricevuti dalla partecipata nell'anno
const B_CARICO_FIN = 'B18'; // T3

export default defineTemplate({
  id: 'M1-12-MINORITIES',
  module: 'M1',
  title: 'Minorities e metodo del patrimonio netto',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['acc.minorities'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    // --- Scenario A: controllata consolidata integralmente. -----------------
    const rA = rng.fork('controllata');
    const percentualeGruppoA = roundTo(triangular(rA, 0.6, 0.75, 0.9), 0.01);
    const utileControllata = roundTo(triangular(rA, 400_000, 900_000, 2_000_000), 5_000);
    // L'utile consolidato include gia' il 100% della controllata, quindi e'
    // sempre maggiore dell'utile della controllata stessa: si genera come
    // "resto del gruppo" (le altre linee consolidate) sommato all'utile
    // della controllata al 100%, cosi' il numero e' sempre coerente.
    const restoGruppoA = roundTo(triangular(rA, 500_000, 1_500_000, 4_000_000), 5_000);
    const utileConsolidato = utileControllata + restoGruppoA;

    const quotaTerzi = utileControllata * (1 - percentualeGruppoA);
    const quotaGruppo = utileConsolidato - quotaTerzi;

    // --- Scenario B: partecipata non controllata, equity method. ------------
    const rB = rng.fork('partecipata');
    const percentualeGruppoB = roundTo(triangular(rB, 0.2, 0.3, 0.4), 0.01);
    const caricoIniziale = roundTo(triangular(rB, 300_000, 800_000, 1_800_000), 5_000);
    const utilePartecipata = roundTo(triangular(rB, 100_000, 400_000, 900_000), 5_000);
    // I dividendi ricevuti non possono superare la quota di utile maturata
    // nell'anno piu' il carico iniziale (altrimenti il carico finale
    // diventerebbe negativo, un caso che il metodo del patrimonio netto non
    // contempla in un esercizio didattico): li si genera come una frazione
    // della quota di utile spettante al gruppo.
    const quotaUtilePartecipata = utilePartecipata * percentualeGruppoB;
    const dividendiRicevuti = roundTo(triangular(rB, 0, quotaUtilePartecipata * 0.4, quotaUtilePartecipata * 0.9), 1_000);

    const caricoFinale = caricoIniziale + quotaUtilePartecipata - dividendiRicevuti;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${A_QUOTA_TERZI} calcola la quota di utile di pertinenza DEI TERZI (minority interest) sulla ` +
        `controllata. La controllata e' consolidata al 100% (${A_UTILE_CTRL} e' gia' il suo utile intero), ` +
        `ma il gruppo ne possiede solo ${A_PCT_GRUPPO}: la quota che spetta a chi possiede il resto — i ` +
        `terzi — e' l'utile della controllata moltiplicato per (1 - percentuale del gruppo).`,
      target: `Model!${A_QUOTA_TERZI}`,
      atteso: quotaTerzi,
      referenzia: [A_UTILE_CTRL, A_PCT_GRUPPO],
      skills: ['acc.minorities'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${A_QUOTA_GRUPPO} calcola l'utile di pertinenza DEL GRUPPO: l'utile consolidato complessivo ` +
        `(${A_UTILE_CONS}, che include gia' la controllata al 100%) meno la quota di terzi appena ` +
        `calcolata (${A_QUOTA_TERZI}). E' cosi' che il consolidamento integrale "toglie" ai terzi la loro ` +
        'fetta dopo aver sommato tutto.',
      target: `Model!${A_QUOTA_GRUPPO}`,
      atteso: quotaGruppo,
      referenzia: [A_UTILE_CONS, A_QUOTA_TERZI],
      skills: ['acc.minorities'],
      minKeystrokes: 8,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${B_CARICO_FIN} calcola il valore di carico FINALE della partecipazione con il metodo del ` +
        `patrimonio netto (equity method). Questa partecipata NON e' controllata (${B_PCT_GRUPPO}, sotto ` +
        "la soglia di controllo) e quindi NON si consolida mai riga per riga: si porta a bilancio solo " +
        `come valore della partecipazione, che si aggiorna cosi': carico iniziale (${B_CARICO0}) PIU' la ` +
        `quota di utile maturato dal gruppo (utile della partecipata ${B_UTILE_PART} moltiplicato per ` +
        `${B_PCT_GRUPPO} — il carico SALE anche se non e' arrivata cassa) MENO i dividendi incassati ` +
        `nell'anno (${B_DIVIDENDI} — un dividendo qui e' un disinvestimento della partecipazione, non un ` +
        'provento a Conto Economico, e quindi il carico SCENDE).',
      target: `Model!${B_CARICO_FIN}`,
      atteso: caricoFinale,
      referenzia: [B_CARICO0, B_UTILE_PART, B_PCT_GRUPPO, B_DIVIDENDI],
      skills: ['acc.minorities'],
      minKeystrokes: 20,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-12-MINORITIES',
      seed: rng.seed,
      brief: [
        '## Due situazioni diverse, non da confondere',
        '',
        "Questo livello mette una accanto all'altra due meccaniche di consolidamento che si assomigliano " +
          "nel nome — entrambe parlano di \"quanto possiedo\" — ma sono concettualmente opposte:",
        '',
        '**Scenario A — Controllata (consolidamento integrale).** Il gruppo la CONTROLLA, quindi la ' +
          "consolida al 100%: ogni ricavo e costo della controllata finisce nel bilancio del gruppo per " +
          "intero, come se fosse suo. Ma se il gruppo non la possiede al 100%, una parte di quell'utile " +
          "spetta a chi possiede il resto — i **terzi** (minority interest). Il gruppo consolida tutto e " +
          'POI toglie la fetta dei terzi.',
        '',
        '**Scenario B — Partecipata (metodo del patrimonio netto / equity method).** Il gruppo NON la ' +
          "controlla (la quota posseduta e' sotto la soglia di controllo): non la consolida MAI riga per " +
          "riga. In bilancio compare come una singola riga — il valore della partecipazione — che si " +
          "aggiorna ogni anno in base a quanto la partecipata guadagna e quanto distribuisce.",
        '',
        `**Scenario A.** La controllata ha realizzato un utile di ${eur(utileControllata)} (gia' al ` +
          `100%, e' cosi' che viene consolidata). Il gruppo ne possiede il ${pct(percentualeGruppoA)}; ` +
          "il resto e' dei terzi. L'utile consolidato complessivo del gruppo, che include gia' l'intero " +
          `utile della controllata, e' ${eur(utileConsolidato)}.`,
        '',
        `**Scenario B.** Il valore di carico iniziale della partecipazione e' ${eur(caricoIniziale)}. Il ` +
          `gruppo ne possiede il ${pct(percentualeGruppoB)} — sotto la soglia di controllo. Nell'anno la ` +
          `partecipata ha realizzato un utile di ${eur(utilePartecipata)} e ha distribuito dividendi per ` +
          `${eur(dividendiRicevuti)}, incassati dal gruppo.`,
        '',
        "**Il punto piu' delicato dello Scenario B**: nel metodo del patrimonio netto, la quota di utile " +
          "maturato FA SALIRE il carico della partecipazione (il gruppo si e' arricchito, anche se non ha " +
          "visto un euro di cassa in piu'), mentre i dividendi incassati FANNO SCENDERE il carico — sono " +
          "trattati come un disinvestimento, un rientro di cio' che era gia' dentro la partecipazione, non " +
          "come un provento a Conto Economico. E' l'opposto di come si tratterebbe un dividendo incassato " +
          "da un investimento qualsiasi, ed e' proprio per questo che va imparato con attenzione.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Minorities e metodo del patrimonio netto'], { style: STILE_TITOLO }),

            riga('A3', ['Scenario A — Controllata (consolidamento integrale)'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Utile della controllata (100%), €',
                'Percentuale posseduta dal gruppo',
                "Utile consolidato del gruppo (include gia' la controllata al 100%), €",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: A_UTILE_CTRL, content: utileControllata, style: STILE_INPUT, locked: true },
              { ref: A_PCT_GRUPPO, content: percentualeGruppoA, style: STILE_INPUT_PCT, locked: true },
              { ref: A_UTILE_CONS, content: utileConsolidato, style: STILE_INPUT, locked: true },
            ],
            riga('A7', ['Ripartizione dell\'utile consolidato'], { style: STILE_ETICHETTA }),
            colonna('A8', ['Quota di pertinenza di terzi (minority interest)', 'Quota di pertinenza del gruppo'], {
              style: STILE_ETICHETTA,
            }),
            [{ ref: A_QUOTA_TERZI, content: null, locked: false, style: STILE_TOTALE }],
            [{ ref: A_QUOTA_GRUPPO, content: null, locked: false, style: STILE_TOTALE }],

            riga('A12', ['Scenario B — Partecipata (metodo del patrimonio netto)'], { style: STILE_TITOLO }),
            colonna(
              'A13',
              [
                'Valore di carico iniziale della partecipazione, €',
                'Percentuale posseduta dal gruppo (sotto la soglia di controllo)',
                "Utile della partecipata nell'anno, €",
                "Dividendi ricevuti dalla partecipata nell'anno, €",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_CARICO0, content: caricoIniziale, style: STILE_INPUT, locked: true },
              { ref: B_PCT_GRUPPO, content: percentualeGruppoB, style: STILE_INPUT_PCT, locked: true },
              { ref: B_UTILE_PART, content: utilePartecipata, style: STILE_INPUT, locked: true },
              { ref: B_DIVIDENDI, content: dividendiRicevuti, style: STILE_INPUT, locked: true },
            ],
            [
              {
                ref: 'A18',
                content: 'Valore di carico finale della partecipazione',
                locked: true,
                style: STILE_ETICHETTA,
              },
            ],
            [{ ref: B_CARICO_FIN, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${A_UTILE_CTRL}*(1-${A_PCT_GRUPPO}): utile della controllata per la percentuale NON posseduta dal gruppo.`,
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${A_UTILE_CONS}-${A_QUOTA_TERZI}: utile consolidato meno la quota gia' calcolata dei terzi.`,
          8,
          'T2',
        ),
        hint(
          'H3',
          `=${B_CARICO0}+${B_UTILE_PART}*${B_PCT_GRUPPO}-${B_DIVIDENDI}: carico iniziale, piu' la quota di utile maturato, meno i dividendi incassati (un disinvestimento, non un provento).`,
          15,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!${A_QUOTA_TERZI}`,
    };
  },
});
