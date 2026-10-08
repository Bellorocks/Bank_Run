/**
 * M2 · 11 — Addback aggressivi: leggere la prova, non fidarsi dell'etichetta.
 *
 * Chiude la sequenza "isolare con SUMIF" del modulo (dopo M2-05, che ha
 * introdotto il pattern con un'etichetta gia' esplicita "ricorrente"/
 * "straordinaria"). La meccanica Excel e' la STESSA — SUMIF su una colonna
 * criterio testuale — ma il punto didattico si sposta: qui la colonna
 * "Valida" e' gia' compilata SI/NO (per tenere il grading verificabile con
 * gli strumenti del motore, niente scelta multipla nella UI), ma le
 * ETICHETTE non sono piu' auto-esplicative come "ricorrente"/"straordinaria".
 * Ogni voce e' una proposta di rettifica del management descritta come la
 * leggerebbe davvero un analista in un data room: alcune hanno una PROVA
 * concreta dietro (una fattura, un verbale, un contratto di transazione),
 * altre sono stime, aspirazioni o riclassificazioni opportunistiche che
 * suonano plausibili ma non reggono a un secondo sguardo.
 *
 * Il valore didattico non e' nel filtro tecnico (SUMIF su "SI" e' meccanico
 * quanto in M2-05) ma nel fatto che il brief mostra ESPLICITAMENTE, voce per
 * voce, perche' ciascuna e' stata accettata o respinta — cosi' chi risolve il
 * livello e' costretto a leggere la giustificazione, non solo a copiare un
 * filtro. Le voci legittime e quelle aggressive vengono pescate da due pool
 * distinti e poi rimescolate insieme (mai raggruppate), stesso principio di
 * M2-05: "prendi le prime righe" non deve mai essere una scorciatoia che
 * funziona per caso.
 *
 * Geometria: DATA_END dipende da `n` (5 o 6, deciso a runtime dal seed), ma
 * ogni riferimento sotto e' calcolato come funzione di DATA_START/n, mai
 * scritto come letterale fisso (classe di bug #1 dello spec).
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
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

// Rettifiche LEGITTIME: dietro ciascuna c'e' una prova concreta e verificabile
// (una fattura, un verbale, un contratto di transazione) — Valida = "SI".
const LEGITTIME = [
  "Costi di ristrutturazione di un piano GIA' completato nell'anno, fattura del fornitore disponibile",
  "Causa legale con ex-fornitore, transazione una tantum liquidata, atto di transazione firmato agli atti",
  "Consulenza legale per due diligence su un'acquisizione conclusa, fattura dello studio legale disponibile",
  "Costi di chiusura di una sede secondaria, GIA' chiusa nell'anno, verbale del CdA e fatture di dismissione disponibili",
  "Penale contrattuale una tantum pagata a un fornitore per recesso anticipato, contratto di transazione disponibile",
] as const;

// Rettifiche AGGRESSIVE: suonano plausibili ma sono stime, aspirazioni o
// riclassificazioni opportunistiche — nessun documento dietro — Valida = "NO".
const AGGRESSIVE = [
  'Sinergie di procurement stimate dal management, non ancora realizzate',
  "Risparmio da un piano di efficientamento approvato dal CdA il mese scorso, non ancora avviato",
  "Costo di manutenzione ordinaria riclassificato come \"straordinario\" dal management, stesso importo dell'anno precedente",
  "Mancato guadagno stimato per un contratto che il management ritiene \"avrebbe dovuto vincere\"",
  "Risparmio atteso da una futura rinegoziazione di un contratto di fornitura, trattativa non ancora avviata",
] as const;

interface Rettifica {
  readonly descrizione: string;
  readonly valida: 'SI' | 'NO';
  readonly importo: number;
}

// --- Geometria fissa dell'intestazione: non dipende dal seed. --------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3;
const ROW_EBITDA = 4; // B4: EBITDA riportato (dato, bloccato)
const ROW_SEZ2 = 6;
const ROW_HEADER = 7; // Voce | Valida | Importo (€)
const DATA_START = 8;

export default defineTemplate({
  id: 'M2-11-ADDBACKAGGRESSIVI',
  module: 'M2',
  title: 'Addback aggressivi: leggere la prova, non fidarsi dell\'etichetta',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 280,
  skills: ['qoe.aggressive'],
  prerequisites: ['M2-09-RUNRATE'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // EBITDA "come riportato" in bilancio, prima di qualunque rettifica.
    const ebitdaRiportato = r.int(700, 3800) * 1000;

    // 5 o 6 proposte totali, con un mix garantito: almeno una legittima e
    // almeno una aggressiva (mai tutte dello stesso tipo, altrimenti SUMIF e
    // SUM darebbero lo stesso risultato e il livello non insegnerebbe niente).
    const n = r.int(5, 6);
    const kValide = r.int(1, n - 1);
    const nAggressive = n - kValide;

    const descrizioniValide = r.shuffle([...LEGITTIME]).slice(0, kValide);
    const descrizioniAggressive = r.shuffle([...AGGRESSIVE]).slice(0, nAggressive);

    const vociValide: Rettifica[] = descrizioniValide.map((descrizione) => ({
      descrizione,
      valida: 'SI',
      // Rettifiche documentate: tipicamente importi piu' consistenti (causa
      // legale, ristrutturazione, dismissione di una sede).
      importo: roundTo(triangular(r, 15_000, 45_000, 120_000), 500),
    }));
    const vociAggressive: Rettifica[] = descrizioniAggressive.map((descrizione) => ({
      descrizione,
      valida: 'NO',
      // Stime/aspirazioni del management: spesso presentate come importi
      // "rotondi" e generosi, proprio perche' non ancorate a un documento.
      importo: roundTo(triangular(r, 10_000, 35_000, 100_000), 500),
    }));

    // Rimescolate insieme: nell'elenco che il giocatore vede, legittime e
    // aggressive non sono raggruppate.
    const voci: Rettifica[] = r.shuffle([...vociValide, ...vociAggressive]);

    const DATA_END = DATA_START + n - 1;
    const ROW_SEZ3 = DATA_END + 2;
    const ROW_RETT = ROW_SEZ3 + 1; // T1
    const ROW_NORM = ROW_RETT + 1; // T2

    const rifValida = `B${DATA_START}`;
    const rifImporti = `C${DATA_START}`;
    const B_EBITDA_RIP = `B${ROW_EBITDA}`;
    const C_RETTIFICA = `C${ROW_RETT}`;
    const C_EBITDA_NORM = `C${ROW_NORM}`;

    const rettifica = voci
      .filter((v) => v.valida === 'SI')
      .reduce((acc, v) => acc + v.importo, 0);
    const totaleElencoCompleto = voci.reduce((acc, v) => acc + v.importo, 0);
    const ebitdaNormalizzato = ebitdaRiportato + rettifica;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          `In ${C_RETTIFICA} calcola la somma delle SOLE rettifiche accettate: quelle con Valida = "SI" ` +
          `nell'elenco qui sopra (${rifValida}:B${DATA_END} per la colonna Valida, ${rifImporti}:C${DATA_END} ` +
          "per gli importi). La colonna Valida e' gia' compilata, ma leggi bene ogni voce prima di fidarti: " +
          '"valida" significa che il management puo\'' +
          ' documentarla — una fattura, un verbale del CdA, un contratto di transazione. Le voci con ' +
          'Valida = "NO" SEMBRANO rettifiche legittime ma sono stime, sinergie non ancora realizzate, piani ' +
          'appena approvati e non ancora eseguiti, o costi ricorrenti rietichettati come straordinari: ' +
          "sommarle gonfierebbe l'EBITDA con soldi che non esistono ancora. Serve una funzione che sommi " +
          'solo le righe che rispettano il criterio.',
        target: `Model!${C_RETTIFICA}`,
        atteso: rettifica,
        referenzia: [rifValida, rifImporti],
        senzaLiteral: [],
        skills: ['qoe.aggressive'],
        minKeystrokes: 30,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMIF'] }],
      };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${C_EBITDA_NORM} calcola l'EBITDA normalizzato DIFENDIBILE: l'EBITDA riportato (${B_EBITDA_RIP}) ` +
        `piu' le sole rettifiche accettate appena isolate (${C_RETTIFICA}). Le rettifiche accettate sono ` +
        "costi one-off documentati, gia' dentro l'EBITDA riportato e gia' rimossi da esso: si RIAGGIUNGONO, " +
        'con segno positivo.',
      target: `Model!${C_EBITDA_NORM}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, C_RETTIFICA],
      senzaLiteral: [],
      skills: ['qoe.aggressive'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M2-11-ADDBACKAGGRESSIVI',
      seed: rng.seed,
      brief: [
        "## Un addback non e' un'opinione: e' un fatto documentabile",
        '',
        "Il management di un target propone quasi sempre piu' rettifiche di quante un buyer serio ne " +
          'accettera\'. Alcune sono legittime: un costo one-off vero, con una fattura o un verbale a ' +
          "provarlo. Altre SUONANO legittime ma non lo sono — sinergie non ancora realizzate, un piano " +
          "appena approvato e mai eseguito, un costo ricorrente rietichettato come straordinario per farlo " +
          "sparire dall'EBITDA riportato.",
        '',
        `L'EBITDA riportato e' ${eur(ebitdaRiportato)}. Qui sotto trovi ${num(n)} proposte di rettifica del ` +
          'management, ciascuna con la sua descrizione e una colonna Valida = "SI"/"NO" gia\'' +
          " compilata sulla base di cio' che e' realmente documentabile. Leggi ogni descrizione prima di " +
          'usare la colonna: e\' li\' che si vede la differenza tra un fatto e una speranza.',
        '',
        '- Valida **"SI"**: dietro c\'e\' una prova concreta (fattura, verbale, contratto di transazione). ' +
          'Si RIAGGIUNGE, rettifica positiva.',
        '- Valida **"NO"**: e\' una stima, un\'aspirazione o una riclassificazione opportunistica. NON si ' +
          'tocca — non entra nella somma.',
        '',
        'Sommare l\'intero elenco indiscriminatamente sarebbe un errore concettuale, non un dettaglio: il ' +
          `totale di TUTTE le proposte e' ${eur(totaleElencoCompleto)}, ma solo una parte di quel numero e\' ` +
          "davvero difendibile davanti a un buyer.",
        '',
        "Un buyer serio rigetta le rettifiche che non puoi dimostrare con un documento: se non sai indicare " +
          "la prova, non e' un addback, e' un'opinione.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, ['Addback aggressivi: leggere la prova, non fidarsi dell\'etichetta'], { style: STILE_TITOLO }),
            riga(`A${ROW_SEZ1}`, ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(`A${ROW_EBITDA}`, ['EBITDA riportato (da bilancio), €'], { style: STILE_ETICHETTA }),
            [{ ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, ['Rettifiche proposte dal management — elenco completo'], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, ['Voce', 'Valida', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, voci.map((v) => v.valida), { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_RETT}`,
              ['Rettifica: totale addback accettati (Valida = "SI"), da riaggiungere, €', 'EBITDA normalizzato difendibile, €'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: C_RETTIFICA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_EBITDA_NORM, content: null, locked: false, style: STILE_FORMULA }],
          ],
          { colWidths: { A: 480, B: 90, C: 140 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=SUMIF(${rifValida}:B${DATA_END},"SI",${rifImporti}:C${DATA_END}): somma solo gli importi delle ` +
            'righe con Valida uguale a "SI", ignorando le righe "NO".',
          12,
          'T1',
        ),
        hint(
          'H2',
          "Prima di applicare il filtro, rileggi le descrizioni: 'approvato il mese scorso' non e' 'gia' " +
            "eseguito', e 'riclassificato come straordinario' e' quasi sempre un campanello d'allarme.",
          10,
          'T1',
        ),
        hint(
          'H3',
          `=${B_EBITDA_RIP}+${C_RETTIFICA}: EBITDA riportato piu' la rettifica appena isolata. I costi ` +
            'documentati hanno gonfiato i costi, quindi si riaggiungono con segno positivo.',
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!${C_RETTIFICA}`,
    };
  },
});
