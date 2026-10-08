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

import { tx } from '../../../i18n/content';
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
  get title() {
    return tx('M1-06-CAPITALIZZAZIONE.title');
  },
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
        tx('M1-06-CAPITALIZZAZIONE.2', { B_QUOTA, p1: eur(speseSviluppo), B_SPESA, p3: pct(percCapitalizzabile), B_PERC }),
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
        tx('M1-06-CAPITALIZZAZIONE.3', { B_AMMORT, B_QUOTA, B_VITA }),
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
        tx('M1-06-CAPITALIZZAZIONE.4', { B_DISTORSIONE, B_QUOTA }),
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
      brief: [tx('M1-06-CAPITALIZZAZIONE.5', { p0: eur(speseSviluppo), p1: pct(percCapitalizzabile), vitaUtile })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M1-06-CAPITALIZZAZIONE.6')], { style: STILE_TITOLO }),
            riga('A3', [tx('M1-06-CAPITALIZZAZIONE.16'), tx('M1-06-CAPITALIZZAZIONE.17')], { style: STILE_TITOLO }),
            [{ ref: 'A4', content: tx('M1-06-CAPITALIZZAZIONE.7'), locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_SPESA, content: speseSviluppo, locked: true, style: STILE_INPUT }],
            [{ ref: 'A5', content: tx('M1-06-CAPITALIZZAZIONE.8'), locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_PERC, content: percCapitalizzabile, locked: true, style: STILE_INPUT_PCT }],
            [{ ref: 'A6', content: tx('M1-06-CAPITALIZZAZIONE.9'), locked: true, style: STILE_ETICHETTA }],
            [{ ref: B_VITA, content: vitaUtile, locked: true, style: STILE_INPUT }],
            riga('A8', [tx('M1-06-CAPITALIZZAZIONE.18')], { style: STILE_TITOLO }),
            [
              {
                ref: 'A9',
                content: tx('M1-06-CAPITALIZZAZIONE.10'),
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_QUOTA, content: null, locked: false, style: STILE_FORMULA },
              {
                ref: 'A10',
                content: tx('M1-06-CAPITALIZZAZIONE.11'),
                locked: true,
                style: STILE_ETICHETTA,
              },
              { ref: B_AMMORT, content: null, locked: false, style: STILE_FORMULA },
              {
                ref: 'A11',
                content: tx('M1-06-CAPITALIZZAZIONE.12'),
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
        hint('H1', tx('M1-06-CAPITALIZZAZIONE.13', { B_SPESA, B_PERC }), 8, 'T1'),
        hint('H2', tx('M1-06-CAPITALIZZAZIONE.14', { B_QUOTA, B_VITA }), 8, 'T2'),
        hint(
          'H3',
          tx('M1-06-CAPITALIZZAZIONE.15', { B_QUOTA }),
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 60 }),
      startAt: `Model!${B_QUOTA}`,
    };
  },
});
