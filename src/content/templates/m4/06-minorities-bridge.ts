/**
 * M4 · 06 — Minorities e partecipazioni non consolidate: l'ultimo aggiustamento del bridge.
 *
 * M4-05 ha chiuso il bridge fino al pezzo debt-like/cash-like:
 *
 *   Equity Value (grezzo) = Enterprise Value - Net Debt (base) - Σ debt-like +
 *                           Σ cash-like
 *
 * Questo livello aggiunge l'ULTIMO pezzo, quello legato al consolidamento —
 * lo stesso argomento di M1-12 (minorities e metodo del patrimonio netto),
 * qui riletto dal lato dell'Equity Value invece che del Conto Economico:
 *
 *   Equity Value (di pertinenza del gruppo) = Equity Value (grezzo)
 *                                              - Minorities
 *                                              + Partecipazioni non consolidate
 *
 * PERCHE' OGNUNA VA COME VA (dichiarato qui, non lasciato implicito):
 *
 *   - **Minorities** (quota di terzi in una controllata consolidata
 *     integralmente): l'Enterprise Value e i multipli di partenza sono
 *     costruiti su un EBITDA/EBIT che include GIA' il 100% della controllata
 *     (esattamente come in M1-12, Scenario A — la si consolida per intero e
 *     POI si toglie la fetta dei terzi). Quel 100% include quindi anche il
 *     valore che spetta ai terzi, non al gruppo. Il valore delle minorities
 *     SI SOTTRAE dall'Equity Value grezzo: e' valore reale, ma non appartiene
 *     a chi sta comprando la quota del gruppo.
 *   - **Partecipazioni non consolidate** (partecipate valutate con il metodo
 *     del patrimonio netto, come in M1-12 Scenario B): il gruppo non le
 *     controlla, quindi non le consolida mai riga per riga — il loro
 *     EBITDA/EBIT NON e' dentro l'Enterprise Value di partenza. Il loro
 *     valore e' comunque reale e appartiene al gruppo (e' un asset in
 *     bilancio, il valore di carico della partecipazione), quindi SI SOMMA:
 *     senza questo pezzo, l'Equity Value dimenticherebbe un pezzo di
 *     patrimonio del tutto legittimo.
 *
 * In una riga: le minorities sono valore INCLUSO nell'EV di partenza ma NON
 * di pertinenza del gruppo (si toglie); le partecipazioni non consolidate
 * sono valore DI pertinenza del gruppo ma NON incluso nell'EV di partenza
 * (si aggiunge). Le due voci si muovono in direzioni opposte per motivi
 * opposti — e' il punto che il livello vuole far fissare.
 *
 * T2 ripete lo schema gia' visto in M2-01/M2-12: un'aggiustamento va sempre
 * letto anche in proporzione, non solo in valore assoluto, per dare al
 * giocatore un senso di materialita' — qui l'impatto netto dei due
 * aggiustamenti (partecipazioni meno minorities) sull'Equity Value grezzo.
 *
 * Geometria fissa: nessuna riga dipende dal seed (tre dati, due task, niente
 * tabelle da classificare), quindi i riferimenti sotto sono letterali per
 * costruzione, come in m1/12-minorities.ts.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
  pct,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_EQV_GREZZO = 'B4'; // Equity Value grezzo dal bridge (dato, bloccato)
const B_MINORITIES = 'B5'; // Valore stimato delle minorities (dato, bloccato)
const B_PARTECIPAZIONI = 'B6'; // Valore delle partecipazioni non consolidate (dato, bloccato)

const B_EQV_GRUPPO = 'B9'; // T1
const B_IMPATTO_PCT = 'B10'; // T2

export default defineTemplate({
  id: 'M4-06-MINORITIESBRIDGE',
  module: 'M4',
  title: "Minorities e partecipazioni non consolidate nel bridge",
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['ev.minorities'],
  prerequisites: ['M4-05-BRIDGECOMPLETO'],

  generate: (rng) => {
    const rBase = rng.fork('base');
    const rMinorities = rng.fork('minorities');
    const rPartecipazioni = rng.fork('partecipazioni');

    // Equity Value grezzo dal bridge: dato bloccato, autosufficiente (nessuna
    // cella live condivisa con M4-05 — qui e' semplicemente il punto di
    // partenza di QUESTO livello).
    const equityValueGrezzo = rBase.int(15_000, 90_000) * 1000;

    // Minorities e partecipazioni sono generate come FRAZIONE dell'Equity
    // Value grezzo (non come importi assoluti indipendenti): garantisce che
    // restino sempre in una proporzione plausibile rispetto al numero di
    // partenza, qualunque combinazione esca dal seed — esattamente come la
    // rettifica di M2-01 e' generata come frazione dell'EBITDA riportato.
    // Le minorities sono tipicamente il pezzo piu' rilevante dei due (una
    // quota di terzi in una controllata puo' pesare parecchio), le
    // partecipazioni non consolidate tendono a essere piu' contenute (un
    // valore di carico, non un intero business consolidato) — da qui i due
    // range diversi.
    const fracMinorities = triangular(rMinorities, 0.03, 0.08, 0.18);
    const minoritiesValue = roundTo(fracMinorities * equityValueGrezzo, 5_000);

    const fracPartecipazioni = triangular(rPartecipazioni, 0.01, 0.05, 0.12);
    const partecipazioniValue = roundTo(fracPartecipazioni * equityValueGrezzo, 5_000);

    const equityValueGruppo = equityValueGrezzo - minoritiesValue + partecipazioniValue;
    const impattoNettoPct = (partecipazioniValue - minoritiesValue) / equityValueGrezzo;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_EQV_GRUPPO} calcola l'Equity Value di pertinenza DEL GRUPPO: l'Equity Value grezzo dal ` +
        `bridge (${B_EQV_GREZZO}) MENO il valore delle minorities (${B_MINORITIES}) PIU' il valore delle ` +
        `partecipazioni non consolidate (${B_PARTECIPAZIONI}). Le minorities si tolgono perche' l'Equity ` +
        "Value grezzo e' costruito su un Enterprise Value che include GIA' il 100% delle controllate " +
        "consolidate integralmente — anche la fetta che spetta ai terzi, non al gruppo. Le partecipazioni " +
        "non consolidate si aggiungono per il motivo opposto: sono valore vero, di pertinenza del gruppo, " +
        "ma il loro EBITDA non e' mai entrato nell'Enterprise Value di partenza perche' non si consolidano " +
        'riga per riga (metodo del patrimonio netto) — senza questo pezzo l\'Equity Value dimenticherebbe ' +
        'un pezzo di patrimonio legittimo del gruppo.',
      target: `Model!${B_EQV_GRUPPO}`,
      atteso: equityValueGruppo,
      referenzia: [B_EQV_GREZZO, B_MINORITIES, B_PARTECIPAZIONI],
      senzaLiteral: [],
      skills: ['ev.minorities'],
      minKeystrokes: 14,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_IMPATTO_PCT} calcola l'impatto percentuale NETTO di questo aggiustamento sull'Equity ` +
        `Value grezzo: le partecipazioni non consolidate (${B_PARTECIPAZIONI}) MENO le minorities ` +
        `(${B_MINORITIES}), il tutto diviso per l'Equity Value grezzo (${B_EQV_GREZZO}). Non basta guardare ` +
        "i due importi in valore assoluto: un compratore vuole sapere quanto, in percentuale, l'aggiustamento " +
        "legato al consolidamento sposta l'Equity Value rispetto al bridge grezzo — in un verso o nell'altro " +
        "a seconda di quale dei due pesi di piu'.",
      target: `Model!${B_IMPATTO_PCT}`,
      atteso: impattoNettoPct,
      referenzia: [B_PARTECIPAZIONI, B_MINORITIES, B_EQV_GREZZO],
      senzaLiteral: [],
      skills: ['ev.minorities'],
      minKeystrokes: 16,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M4-06-MINORITIESBRIDGE',
      seed: rng.seed,
      brief: [
        "## L'ultimo aggiustamento: minorities e partecipazioni non consolidate",
        '',
        "Il bridge da Enterprise Value a Equity Value che hai gia' costruito (M4-05) si ferma al pezzo " +
          "debt-like/cash-like. Manca un ultimo aggiustamento, legato a COME e' stato costruito il gruppo " +
          "consolidato — lo stesso argomento di M1-12, qui riletto dal lato dell'Equity Value:",
        '',
        '> **Equity Value (di pertinenza del gruppo) = Equity Value (grezzo) - Minorities + Partecipazioni ' +
          'non consolidate**',
        '',
        "- **Minorities** (quota di terzi in una controllata consolidata integralmente): l'Enterprise " +
          "Value di partenza e' costruito su un EBITDA che include GIA' il 100% della controllata, non " +
          "solo la quota del gruppo (e' cosi' che funziona il consolidamento integrale: si somma tutto e " +
          "POI si toglie la fetta dei terzi). Quel 100% include anche valore che non e' del gruppo: le " +
          'minorities SI SOTTRAGGONO.',
        "- **Partecipazioni non consolidate** (partecipate valutate col metodo del patrimonio netto): il " +
          "gruppo non le controlla, quindi non le consolida mai riga per riga — il loro EBITDA non e' MAI " +
          "entrato nell'Enterprise Value di partenza. Il loro valore pero' e' reale e appartiene al gruppo " +
          "(e' un asset in bilancio): le partecipazioni SI SOMMANO.",
        '',
        "Le due voci si muovono in direzioni opposte per ragioni opposte: le minorities sono valore GIA' " +
          "incluso nell'Enterprise Value ma non di pertinenza del gruppo (si toglie); le partecipazioni " +
          "non consolidate sono valore DI pertinenza del gruppo ma mai incluso nell'Enterprise Value (si " +
          'aggiunge). Confonderle — o dimenticarne una — e\' l\'errore piu\' comune su questo pezzo del bridge.',
        '',
        `Qui sotto trovi l'Equity Value grezzo dal bridge, gia' dato: ${eur(equityValueGrezzo)}. Il ` +
          `valore stimato delle minorities, gia' dato, e' ${eur(minoritiesValue)}; il valore delle ` +
          `partecipazioni non consolidate, gia' dato, e' ${eur(partecipazioniValue)}. Componi prima ` +
          "l'Equity Value di pertinenza del gruppo (task 1), poi misura quanto pesa l'aggiustamento in " +
          'proporzione (task 2).',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Minorities e partecipazioni non consolidate nel bridge'], { style: STILE_TITOLO }),

            riga('A3', ['Dati di base (dal bridge)'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Equity Value grezzo dal bridge, €',
                'Valore stimato delle minorities (quota di terzi), €',
                "Valore delle partecipazioni non consolidate (equity method), €",
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_EQV_GREZZO, content: equityValueGrezzo, style: STILE_INPUT, locked: true },
              { ref: B_MINORITIES, content: minoritiesValue, style: STILE_INPUT, locked: true },
              { ref: B_PARTECIPAZIONI, content: partecipazioniValue, style: STILE_INPUT, locked: true },
            ],

            riga('A8', ["Equity Value di pertinenza del gruppo"], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Equity Value di pertinenza del gruppo, €',
                "Impatto netto dell'aggiustamento sull'Equity Value grezzo, %",
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_EQV_GRUPPO, content: null, locked: false, style: STILE_TOTALE }],
            [{ ref: B_IMPATTO_PCT, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 460, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=${B_EQV_GREZZO}-${B_MINORITIES}+${B_PARTECIPAZIONI}: Equity Value grezzo meno le minorities ` +
            "(valore incluso nell'EV ma non del gruppo), piu' le partecipazioni non consolidate (valore " +
            "del gruppo ma non incluso nell'EV).",
          14,
          'T1',
        ),
        hint(
          'H2',
          `=(${B_PARTECIPAZIONI}-${B_MINORITIES})/${B_EQV_GREZZO}: partecipazioni meno minorities, ` +
            "diviso l'Equity Value grezzo — l'impatto netto in percentuale, non in valore assoluto " +
            `(qui vale ${pct(impattoNettoPct)}).`,
          14,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 130 }),
      startAt: `Model!${B_EQV_GRUPPO}`,
    };
  },
});
