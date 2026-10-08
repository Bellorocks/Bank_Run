/**
 * M1 · 02 — Riclassificazione: valore aggiunto e margine di contribuzione.
 *
 * Il CE qui sotto arriva GIA' classificato (M1-01 ha gia' insegnato quello):
 * niente disordine da riordinare in questo livello. Il punto didattico e' un
 * altro: lo stesso conto economico si puo' leggere in due modi diversi, con
 * due scopi diversi.
 *
 * - Schema A (valore aggiunto / MOL): raggruppa i costi per NATURA — cosa
 *   l'azienda ha comprato da fuori (materie prime, servizi, beni di terzi) e
 *   cosa ha pagato al proprio personale. E' lo schema che si vede nei bilanci
 *   pubblicati.
 * - Schema B (margine di contribuzione): raggruppa gli STESSI ricavi per
 *   COMPORTAMENTO del costo — variabile o fisso rispetto al volume. E' lo
 *   schema che si usa per le decisioni di breakeven e pricing, e i suoi dati
 *   di costo sono generati in modo indipendente da quelli dello Schema A: non
 *   e' la stessa scomposizione riletta, e' un taglio analitico diverso sullo
 *   stesso business. Il fatturato (Ricavi) e' l'unico numero condiviso fra i
 *   due schemi — appare identico in entrambe le tabelle apposta, per rendere
 *   visibile che la base di partenza e' la stessa.
 *
 * Conseguenza esplicita nel brief: MOL (Schema A) e Margine di contribuzione
 * (Schema B) NON sono la stessa grandezza e non c'e' motivo per cui debbano
 * coincidere. Se il giocatore se lo aspettasse, il livello avrebbe fallito il
 * suo scopo.
 *
 * Geometria del foglio fissa (nessuna riga aggiunta/rimossa/mescolata per
 * seed): gli indirizzi di cella qui sotto possono restare literal.
 */

import {
  defineTemplate,
  areaLibera,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

export default defineTemplate({
  id: 'M1-02-RICLASSIFICAZIONE',
  module: 'M1',
  title: 'Riclassificazione a valore aggiunto e margine di contribuzione',
  rank: 1,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['acc.reclass'],
  prerequisites: ['M1-01-SCHEMACEE'],

  generate: (rng) => {
    // --- Ricavi: l'unico numero condiviso fra i due schemi. -----------------
    const rBase = rng.fork('base');
    const ricavi = rBase.int(2000, 15000) * 1000; // 2.000.000 - 15.000.000, step 1.000

    // --- Schema A: valore aggiunto / MOL, per natura. ------------------------
    const rA = rng.fork('valoreAggiunto');
    const variazioneRimanenze = rA.int(-300, 300) * 1000;
    const costiMateriePrime = roundTo(triangular(rA, 0.2 * ricavi, 0.3 * ricavi, 0.42 * ricavi), 500);
    const costiServizi = roundTo(triangular(rA, 0.1 * ricavi, 0.16 * ricavi, 0.24 * ricavi), 500);
    const costiGodimento = roundTo(triangular(rA, 0.02 * ricavi, 0.04 * ricavi, 0.07 * ricavi), 500);
    const costoPersonale = roundTo(triangular(rA, 0.15 * ricavi, 0.24 * ricavi, 0.34 * ricavi), 500);

    const valoreAggiunto = ricavi + variazioneRimanenze - (costiMateriePrime + costiServizi + costiGodimento);
    const mol = valoreAggiunto - costoPersonale;

    // --- Schema B: margine di contribuzione, per comportamento. Dati
    // generati da un fork indipendente: cambiare lo Schema A non deve
    // spostare di un euro i numeri dello Schema B, e viceversa. -------------
    const rB = rng.fork('margineContribuzione');
    const costiVariabili = roundTo(triangular(rB, 0.3 * ricavi, 0.42 * ricavi, 0.55 * ricavi), 500);
    const costiFissi = roundTo(triangular(rB, 0.15 * ricavi, 0.22 * ricavi, 0.3 * ricavi), 500);

    const margineContribuzione = ricavi - costiVariabili;

    const t1 = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          'In B12 calcola il Valore Aggiunto: (Ricavi + Variazione delle rimanenze) meno la somma dei costi ' +
          "\"esterni\" — Costi per materie prime (B6), Costi per servizi (B7) e Costi per godimento di beni di " +
          "terzi (B8). Sono gli acquisti che l'azienda fa da fuori: cio' che produce con le proprie risorse " +
          "interne — il personale — resta apposta escluso da questo primo calcolo.",
        target: 'Model!B12',
        atteso: valoreAggiunto,
        referenzia: ['B4', 'B5', 'B6', 'B7', 'B8'],
        senzaLiteral: [],
        skills: ['acc.reclass'],
        minKeystrokes: 16,
      });
      return base;
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        "In B13 calcola il MOL (Margine Operativo Lordo, l'EBITDA di questo schema riclassificato): parti dal " +
        'Valore Aggiunto che hai gia\' calcolato in B12 e sottrai il Costo del personale (B9). Non risommare ' +
        "tutto da capo — il Valore Aggiunto e' gia' un numero solido, usalo cosi' com'e'.",
      target: 'Model!B13',
      atteso: mol,
      referenzia: ['B12', 'B9'],
      senzaLiteral: [],
      skills: ['acc.reclass'],
      minKeystrokes: 7,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        'In B23 calcola il Margine di contribuzione, usando la lettura alternativa qui sotto (righe 18-20), NON ' +
        'i dati della tabella a valore aggiunto qui sopra: Ricavi (B18) meno Costi variabili (B19). I Costi per ' +
        'materie prime/servizi/godimento della prima tabella non c\'entrano qui — sono due schemi diversi, con ' +
        'dati di costo diversi, anche se il fatturato di partenza (Ricavi) e\' lo stesso numero in entrambi.',
      target: 'Model!B23',
      atteso: margineContribuzione,
      referenzia: ['B18', 'B19'],
      senzaLiteral: [],
      skills: ['acc.reclass'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-02-RICLASSIFICAZIONE',
      seed: rng.seed,
      brief: [
        '## Due letture dello stesso Conto Economico',
        '',
        "Il CE qui sotto e' gia' classificato: niente da riordinare, quello lo hai gia' fatto nel livello",
        "precedente. Qui il compito e' un altro: lo stesso conto economico si legge in due modi diversi,",
        'per due scopi diversi.',
        '',
        '**Schema A — valore aggiunto e MOL** (righe 4-9): raggruppa i costi per **natura**, cioe\' per cosa',
        "sono — materie prime, servizi, affitti, personale. E' lo schema che vedi nei bilanci pubblicati.",
        'Il **Valore Aggiunto** e\' quanto resta dei ricavi dopo aver pagato tutto cio\' che viene comprato',
        "da fuori (i costi \"esterni\"); il **MOL** e' quanto resta dopo aver pagato anche il personale.",
        '',
        '**Schema B — margine di contribuzione** (righe 18-20): raggruppa gli STESSI ricavi per',
        '**comportamento** del costo — variabile (cresce col volume prodotto/venduto) o fisso (non dipende',
        "dal volume). Sono dati di costo diversi da quelli dello Schema A, generati per un'analisi diversa:",
        "non e' la stessa scomposizione riletta, e' un taglio analitico alternativo sullo stesso business.",
        "L'unico numero che i due schemi condividono e' il fatturato — i Ricavi compaiono identici in",
        'entrambe le tabelle apposta, per farti vedere che la base di partenza e\' la stessa.',
        '',
        "**Attenzione**: MOL (Schema A) e Margine di contribuzione (Schema B) non sono la stessa grandezza",
        "e non hanno motivo di coincidere. Se ti sembrano numeri slegati fra loro, e' perche' lo sono: due",
        'letture diverse, non due modi di ricontrollare la stessa somma.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Conto Economico riclassificato — due letture'], { style: STILE_TITOLO }),

            // --- Schema A: valore aggiunto / MOL, per natura. ----------------
            riga('A3', ['Voce di Conto Economico', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Ricavi delle vendite e delle prestazioni',
                'Variazione delle rimanenze di prodotti',
                'Costi per materie prime e merci',
                'Costi per servizi',
                'Costi per godimento di beni di terzi',
                'Costo del personale',
              ],
              { style: STILE_ETICHETTA },
            ),
            blocco(
              'B4',
              [
                [ricavi],
                [variazioneRimanenze],
                [costiMateriePrime],
                [costiServizi],
                [costiGodimento],
                [costoPersonale],
              ],
              { style: STILE_INPUT },
            ),
            riga('A11', ['Riepilogo — valore aggiunto e MOL'], { style: STILE_TITOLO }),
            colonna('A12', ['Valore Aggiunto', 'MOL / EBITDA (Valore Aggiunto - Costo del personale)'], {
              style: STILE_ETICHETTA,
            }),
            areaLibera(['B12', 'B13']),

            // --- Schema B: margine di contribuzione, per comportamento. -----
            riga('A15', ["Lettura alternativa — costi variabili e costi fissi"], { style: STILE_TITOLO }),
            riga('A17', ['Voce', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna(
              'A18',
              ['Ricavi delle vendite e delle prestazioni', 'Costi variabili', 'Costi fissi'],
              { style: STILE_ETICHETTA },
            ),
            blocco('B18', [[ricavi], [costiVariabili], [costiFissi]], { style: STILE_INPUT }),
            riga('A22', ['Riepilogo — margine di contribuzione'], { style: STILE_TITOLO }),
            colonna('A23', ['Margine di contribuzione'], { style: STILE_ETICHETTA }),
            areaLibera(['B23']),
          ],
          { colWidths: { A: 380, B: 130 }, frozenRows: 0 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', '=B4+B5-B6-B7-B8 : ricavi piu\' variazione rimanenze, meno i tre costi "esterni".', 10, 'T1'),
        hint('H2', '=B12-B9 : il Valore Aggiunto che hai gia\' scritto, meno il costo del personale.', 8, 'T2'),
        hint('H3', '=B18-B19 : Ricavi della seconda tabella meno Costi variabili, non i dati della prima.', 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: 'Model!B12',
    };
  },
});
