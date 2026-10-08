/**
 * M1 · 06 — Capitalizzazione dei costi di sviluppo.
 *
 * Prima puntata del tema che M2 (Quality of Earnings) riprendera' sul serio:
 * un costo non sparisce perche' lo si sposta a Stato Patrimoniale invece che a
 * Conto Economico — cambia solo QUANDO (e COME) passa a Conto Economico. La
 * spesa di sviluppo capitalizzata secondo i criteri OIC diventa un'immobilizza-
 * zione immateriale ammortizzata su piu' anni, invece di un costo dell'anno:
 * l'EBITDA riportato ne esce piu' alto, ma non perche' l'azienda genera piu'
 * cassa operativa — solo perche' una parte del costo e' stata spostata sotto la
 * riga.
 *
 * Il terzo task e' quello che conta di piu' didatticamente: non chiede di
 * ricostruire due EBITDA in due celle e poi sottrarli, chiede UN numero solo
 * che isola la distorsione. Il punto e' che quel numero coincide esattamente
 * con la quota capitalizzata del primo task — l'effetto e' pari, euro per
 * euro, alla spesa spostata fuori dal Conto Economico. Se il giocatore capisce
 * perche' referenziare quella cella basta, ha capito la lezione.
 *
 * Layout fisso (nessuno shuffle di righe o colonne): i riferimenti di riga qui
 * sotto sono letterali di proposito, non perche' la regola "mai un letterale
 * quando la posizione dipende dal seed" sia stata dimenticata, ma perche' qui
 * la posizione non dipende MAI dal seed.
 */

import {
  defineTemplate,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';

// --- Geometria fissa del foglio. -------------------------------------------
const RIGA_SPESA = 4;
const RIGA_PERC = 5;
const RIGA_VITA = 6;
const RIGA_QUOTA = 9; // T1
const RIGA_AMMORT = 10; // T2
const RIGA_DISTORSIONE = 11; // T3

const B_SPESA = `B${RIGA_SPESA}`;
const B_PERC = `B${RIGA_PERC}`;
const B_VITA = `B${RIGA_VITA}`;
const B_QUOTA = `B${RIGA_QUOTA}`;
const B_AMMORT = `B${RIGA_AMMORT}`;
const B_DISTORSIONE = `B${RIGA_DISTORSIONE}`;

/** Percentuali capitalizzabili plausibili secondo i criteri OIC: 30%-70%, a scatti di 5 punti. */
const PERCENTUALI_CAPITALIZZABILI = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7] as const;

export default defineTemplate({
  id: 'M1-06-CAPITALIZZAZIONE',
  module: 'M1',
  title: 'Capitalizzazione dei costi di sviluppo',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 230,
  skills: ['acc.capitalization'],
  prerequisites: ['M1-01-SCHEMACEE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const speseSviluppo = r.int(30, 250) * 10_000; // 300.000 - 2.500.000, a scatti di 10.000
    const percCapitalizzabile = r.pick(PERCENTUALI_CAPITALIZZABILI);
    const vitaUtile = r.int(3, 5); // anni

    const quotaCapitalizzata = speseSviluppo * percCapitalizzabile;
    const ammortamentoAnnuo = quotaCapitalizzata / vitaUtile;
    // La distorsione sull'EBITDA riportato coincide, per costruzione, con la
    // quota capitalizzata: e' esattamente il costo che non compare piu' a CE.
    const distorsioneEbitda = quotaCapitalizzata;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_QUOTA} calcola la quota di spesa di sviluppo capitalizzata: la spesa totale dell'anno ` +
        `(${eur(speseSviluppo)}, in ${B_SPESA}) moltiplicata per la percentuale ritenuta capitalizzabile secondo ` +
        `i criteri OIC (${pct(percCapitalizzabile)}, in ${B_PERC}). Riferisciti alle due celle, non scrivere i ` +
        "numeri a mano: quella quota smette di essere un costo dell'anno a Conto Economico e diventa " +
        "un'immobilizzazione immateriale a Stato Patrimoniale.",
      target: `Model!${B_QUOTA}`,
      atteso: quotaCapitalizzata,
      referenzia: [B_SPESA, B_PERC],
      senzaLiteral: [],
      skills: ['acc.capitalization'],
      minKeystrokes: 6,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_AMMORT} calcola l'ammortamento annuo della quota capitalizzata: dividi la quota che hai ` +
        `appena calcolato in ${B_QUOTA} per la vita utile del progetto in anni (${B_VITA}). Riferisciti alla ` +
        'quota gia\' calcolata, non ricalcolarla moltiplicando di nuovo spesa per percentuale.',
      target: `Model!${B_AMMORT}`,
      atteso: ammortamentoAnnuo,
      referenzia: [B_QUOTA, B_VITA],
      senzaLiteral: [],
      skills: ['acc.capitalization'],
      minKeystrokes: 6,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${B_DISTORSIONE} calcola di quanto l'EBITDA che l'azienda riporta risulta piu' alto rispetto a ` +
        "quello che avrebbe riportato se l'intera spesa di sviluppo fosse stata trattata come costo " +
        "dell'esercizio, come vorrebbe un'ottica prudente da Quality of Earnings. Non ricostruire due EBITDA " +
        "in due celle separate per poi sottrarli: la differenza e' un numero solo, ed e' esattamente la quota " +
        `che hai capitalizzato sopra (${B_QUOTA}) — riferisciti solo a quella.`,
      target: `Model!${B_DISTORSIONE}`,
      atteso: distorsioneEbitda,
      referenzia: [B_QUOTA],
      senzaLiteral: [],
      skills: ['acc.capitalization'],
      minKeystrokes: 3,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-06-CAPITALIZZAZIONE',
      seed: rng.seed,
      brief: [
        "## Capitalizzare non fa sparire un costo, lo sposta",
        '',
        "Un'azienda ha speso quest'anno in ricerca e sviluppo di un nuovo prodotto. Non tutta questa " +
          "spesa e' necessariamente un costo dell'esercizio: se il progetto soddisfa i criteri dell'OIC " +
          "(dimostrabile fattibilita' tecnica, intenzione e capacita' di completarlo, benefici economici " +
          "futuri attendibili...), la parte capitalizzabile puo' essere iscritta come immobilizzazione " +
          "immateriale e ammortizzata sulla vita utile del progetto, invece di pesare tutta insieme sul " +
          "Conto Economico dell'anno in cui e' stata sostenuta.",
        '',
        `Qui sotto trovi la spesa totale dell'anno (${eur(speseSviluppo)}), la percentuale che i criteri ` +
          `OIC permettono di capitalizzare (${pct(percCapitalizzabile)}) e la vita utile del progetto ` +
          `(${vitaUtile} anni).`,
        '',
        "**Il punto delicato** e' l'ultimo task. Capitalizzare invece di spesare fa apparire un EBITDA " +
          "piu' alto — non perche' l'azienda genera piu' cassa operativa quest'anno, ma solo perche' una " +
          "parte del costo e' stata spostata sotto la riga, verso l'ammortamento dei prossimi anni. Un " +
          "analista che valuta la qualita' dell'utile vuole sapere esattamente quanto vale questa " +
          "distorsione: non due EBITDA da confrontare, un solo numero che la isola.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Capitalizzazione dei costi di sviluppo'], { style: STILE_TITOLO }),
            riga('A3', ['Voce', 'Valore'], { style: STILE_TITOLO }),
            [{ ref: 'A4', content: "Spesa di sviluppo dell'anno (R&D), €", locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_SPESA, content: speseSviluppo, locked: true, style: STILE_INPUT }],
            [{ ref: 'A5', content: 'Quota capitalizzabile secondo i criteri OIC', locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_PERC, content: percCapitalizzabile, locked: true, style: STILE_INPUT_PCT }],
            [{ ref: 'A6', content: 'Vita utile del progetto (anni)', locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_VITA, content: vitaUtile, locked: true, style: STILE_INPUT }],
            riga('A8', ['Riepilogo'], { style: STILE_TITOLO }),
            [
              {
                ref: 'A9',
                content: "Quota di spesa capitalizzata (immobilizzazione immateriale), €",
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_QUOTA, content: null, locked: false, style: STILE_FORMULA },
              {
                ref: 'A10',
                content: 'Ammortamento annuo della quota capitalizzata, €',
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_AMMORT, content: null, locked: false, style: STILE_FORMULA },
              {
                ref: 'A11',
                content: "Effetto sull'EBITDA riportato rispetto a un trattamento interamente a Conto Economico, €",
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_DISTORSIONE, content: null, locked: false, style: STILE_FORMULA },
            ],
          ],
          { colWidths: { A: 460, B: 140 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `=${B_SPESA}*${B_PERC}: la spesa totale per la percentuale capitalizzabile.`, 8, 'T1'),
        hint('H2', `=${B_QUOTA}/${B_VITA}: la quota capitalizzata divisa per gli anni di vita utile.`, 8, 'T2'),
        hint(
          'H3',
          `=${B_QUOTA}: capitalizzare non fa sparire il costo, lo sposta fuori dal Conto Economico di ` +
            "quest'anno. L'EBITDA riportato e' piu' alto esattamente della quota che non e' passata a costo.",
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_QUOTA}`,
    };
  },
});
