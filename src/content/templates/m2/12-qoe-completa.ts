/**
 * M2 · 12 — QoE completa: dal bilancio sporco a un EBITDA adjusted difendibile.
 *
 * QUESTO E' IL LIVELLO [COMBO/BOSS] del modulo M2 (Quality of Earnings): non
 * introduce una categoria nuova, sintetizza quelle gia' viste — poste
 * infragruppo (M2-02/03/04), one-off (M2-05/06/07/08), lettura critica di un
 * addback proposto (M2-11) — in un unico SCHEDULE delle rettifiche, non piu'
 * una rettifica isolata alla volta come nei template precedenti.
 *
 * SEMPLIFICAZIONE DICHIARATA (stesso principio di M1-07/tre-prospetti, dove
 * ΔCCN e ΔDebito arrivano gia' come un numero con segno): ogni riga
 * dell'elenco arriva con l'importo GIA' firmato correttamente in base alla
 * sua categoria — positivo per un costo one-off/fuori mercato che ha
 * sgonfiato l'EBITDA riportato (si riaggiunge), negativo per un provento
 * one-off o un costo nascosto sotto una capitalizzazione impropria che lo ha
 * gonfiato (si toglie). Il livello non chiede di RIDERIVARE il segno di ogni
 * singola voce da zero (quello lo ha gia' messo alla prova ogni template
 * precedente del modulo, categoria per categoria): chiede di isolare le
 * righe VALIDE da un elenco misto — legittime con segno diverso mescolate a
 * una proposta aggressiva — e sommarle CON il segno che portano, senza
 * "raddrizzarle" tutte a positivo per abitudine. E' esattamente l'errore piu'
 * comune di chi ha interiorizzato "rettifica = si somma un costo": davanti a
 * un elenco con alcune voci negative, la tentazione e' sommare solo le
 * positive o prendere tutto in valore assoluto.
 *
 * Meccanica Excel: SUMIF su un criterio di validita' ("Valida" = SI/NO),
 * stesso pattern gia' visto in M2-05 e consolidato in M2-11 — qui applicato a
 * un range la cui somma NON e' piu' monotona (alcuni addendi sono negativi),
 * cosi' un SUMIF scritto guardando solo il criterio "SI" senza controllare il
 * segno della colonna importi produce comunque il risultato CORRETTO (il
 * segno e' gia' nella cella, SUMIF lo eredita), ma un giocatore che ricopia
 * gli importi a mano perdendo un segno meno viene intercettato dal check
 * numerico.
 *
 * Tre task in cascata, la stessa algebra di ogni template introduttivo del
 * modulo (M2-01) applicata a un totale invece che a un numero isolato:
 *   T1  Totale rettifiche LEGITTIME, con segno = SUMIF(Valida, "SI", Rettifiche)
 *   T2  EBITDA normalizzato = EBITDA riportato + T1
 *   T3  Impatto % delle rettifiche sull'EBITDA riportato = T1 / EBITDA riportato
 *       (stessa forma di M2-01/T2 — chiude il cerchio con l'apertura del
 *       modulo). Se il rapporto supera la soglia del 15-20% di cui parlava
 *       M2-01, il brief lo dice esplicitamente: e' il punto della sintesi.
 *
 * Geometria: DATA_END dipende dal numero di voci generate (5-6 legittime +
 * 1 aggressiva), quindi tutti i riferimenti sotto sono calcolati come
 * funzione di DATA_START/n, mai scritti come letterali fissi (classe di bug
 * #1 dello spec). Le voci legittime (positive e negative) e quella
 * aggressiva vengono rimescolate insieme, mai raggruppate — stesso principio
 * di M2-05/M2-11: "prendi le prime righe" non deve mai funzionare per caso.
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
  STILE_FORMULA_PCT,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
  num,
  pct,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

import { tx } from '../../../i18n/content';
// Rettifiche POSITIVE (costi one-off/fuori mercato gia' dentro l'EBITDA
// riportato: lo hanno sgonfiato, si RIAGGIUNGONO) — mix di poste infragruppo
// e one-off, per sintetizzare entrambe le famiglie del modulo.
const CATEGORIE_POSITIVE = () => ([
  tx('M2-12-QOECOMPLETA.1'),
  tx('M2-12-QOECOMPLETA.2'),
  tx('M2-12-QOECOMPLETA.3'),
  tx('M2-12-QOECOMPLETA.4'),
  tx('M2-12-QOECOMPLETA.5'),
  tx('M2-12-QOECOMPLETA.6'),
] as const);

// Rettifiche NEGATIVE (proventi one-off, o costi nascosti da una
// capitalizzazione impropria, gia' dentro l'EBITDA riportato: lo hanno
// gonfiato, si TOLGONO).
const CATEGORIE_NEGATIVE = () => ([
  tx('M2-12-QOECOMPLETA.7'),
  tx('M2-12-QOECOMPLETA.8'),
  tx('M2-12-QOECOMPLETA.9'),
  tx('M2-12-QOECOMPLETA.10'),
] as const);

// Proposte AGGRESSIVE: suonano plausibili ma nessun documento le sostiene —
// Valida = "NO", esattamente lo spirito di M2-11.
const CATEGORIE_AGGRESSIVE = () => ([
  tx('M2-12-QOECOMPLETA.11'),
  tx('M2-12-QOECOMPLETA.12'),
  tx('M2-12-QOECOMPLETA.13'),
] as const);

interface Rettifica {
  readonly descrizione: string;
  readonly valida: 'SI' | 'NO';
  readonly importo: number; // gia' con il segno corretto (vedi semplificazione dichiarata in testa al file)
}

// --- Geometria fissa dell'intestazione: non dipende dal seed. --------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3;
const ROW_EBITDA = 4; // B4: EBITDA riportato (dato, bloccato)
const ROW_SEZ2 = 6;
const ROW_HEADER = 7; // Voce | Valida | Rettifica (€, con segno)
const DATA_START = 8;

export default defineTemplate({
  id: 'M2-12-QOECOMPLETA',
  module: 'M2',
  get title() {
    return tx('M2-12-QOECOMPLETA.title');
  },
  rank: 4,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['qoe.normalization', 'qoe.related-party', 'qoe.one-off', 'qoe.aggressive'],
  prerequisites: [
    'M2-02-COMPENSOAMMINISTRATORE',
    'M2-03-AFFITTIINFRAGRUPPO',
    'M2-04-COSTIPERSONALISOCIO',
    'M2-05-ONEOFFLEGALI',
    'M2-06-PLUSMINUSVALENZE',
    'M2-07-CAPITALIZZAZIONEIMPROPRIA',
    'M2-08-EFFETTICAMBIO',
    'M2-09-RUNRATE',
    'M2-10-LTM',
    'M2-11-ADDBACKAGGRESSIVI',
  ],
  combo: true,

  generate: (rng) => {
    // Stream separati: quante voci di ciascun tipo escono, quali categorie
    // vengono scelte, quanto valgono, e l'EBITDA di base non devono
    // correlarsi fra loro (stesso principio di M2-04/M2-05/M2-11).
    const rConteggio = rng.fork('conteggio');
    const rVoci = rng.fork('voci');
    const rImporti = rng.fork('importi');
    const rEbitda = rng.fork('ebitda');
    const rOrdine = rng.fork('ordine');

    const ebitdaRiportato = rEbitda.int(900, 4200) * 1000;

    // 5 o 6 rettifiche LEGITTIME, mescolando 2-3 positive e 2-3 negative:
    // mai tutte dello stesso segno, altrimenti il livello non metterebbe
    // alla prova la disciplina del segno su un elenco misto. Con nLegit=6
    // l'unica ripartizione che rispetta "2-3 e 2-3" e' 3+3.
    const nLegit = rConteggio.int(5, 6);
    const kPositive = nLegit === 6 ? 3 : rConteggio.int(2, 3);
    const kNegative = nLegit - kPositive;

    const descrizioniPositive = rVoci.shuffle([...CATEGORIE_POSITIVE()]).slice(0, kPositive);
    const descrizioniNegative = rVoci.shuffle([...CATEGORIE_NEGATIVE()]).slice(0, kNegative);
    const descrizioneAggressiva = rVoci.pick([...CATEGORIE_AGGRESSIVE()]);

    const vociPositive: Rettifica[] = descrizioniPositive.map((descrizione) => ({
      descrizione,
      valida: 'SI',
      importo: roundTo(triangular(rImporti, 0.02, 0.06, 0.15) * ebitdaRiportato, 500),
    }));
    const vociNegative: Rettifica[] = descrizioniNegative.map((descrizione) => ({
      descrizione,
      valida: 'SI',
      importo: -roundTo(triangular(rImporti, 0.02, 0.05, 0.12) * ebitdaRiportato, 500),
    }));
    const voceAggressiva: Rettifica = {
      descrizione: descrizioneAggressiva,
      valida: 'NO',
      // Proposta "generosa" del management, tipica di chi non ha un
      // documento a supportarla: presentata come un addback positivo.
      importo: roundTo(triangular(rImporti, 0.03, 0.08, 0.18) * ebitdaRiportato, 500),
    };

    // Rimescolate insieme: nell'elenco che il giocatore vede, positive,
    // negative e la proposta aggressiva non sono raggruppate.
    const voci: Rettifica[] = rOrdine.shuffle([...vociPositive, ...vociNegative, voceAggressiva]);

    const n = voci.length;
    const DATA_END = DATA_START + n - 1;
    const ROW_SEZ3 = DATA_END + 2;
    const ROW_T1 = ROW_SEZ3 + 1; // Totale rettifiche legittime
    const ROW_T2 = ROW_T1 + 1; // EBITDA normalizzato
    const ROW_T3 = ROW_T2 + 1; // Impatto % sull'EBITDA riportato

    const rifValida = `B${DATA_START}`;
    const rifRettifiche = `C${DATA_START}`;
    const B_EBITDA_RIP = `B${ROW_EBITDA}`;
    const C_T1 = `C${ROW_T1}`;
    const C_T2 = `C${ROW_T2}`;
    const C_T3 = `C${ROW_T3}`;

    const rettificheTotali = voci
      .filter((v) => v.valida === 'SI')
      .reduce((acc, v) => acc + v.importo, 0);
    const ebitdaNormalizzato = ebitdaRiportato + rettificheTotali;
    const impattoPct = rettificheTotali / ebitdaRiportato;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          tx('M2-12-QOECOMPLETA.15', { C_T1 }),
        target: `Model!${C_T1}`,
        atteso: rettificheTotali,
        referenzia: [rifValida, rifRettifiche],
        senzaLiteral: [],
        skills: ['qoe.related-party', 'qoe.one-off', 'qoe.aggressive'],
        minKeystrokes: 32,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMIF'] }],
      };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        tx('M2-12-QOECOMPLETA.16', { C_T2, B_EBITDA_RIP, C_T1 }),
      target: `Model!${C_T2}`,
      atteso: ebitdaNormalizzato,
      referenzia: [B_EBITDA_RIP, C_T1],
      senzaLiteral: [],
      skills: ['qoe.normalization'],
      minKeystrokes: 6,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        tx('M2-12-QOECOMPLETA.17', { C_T3, C_T1, B_EBITDA_RIP }),
      target: `Model!${C_T3}`,
      atteso: impattoPct,
      referenzia: [C_T1, B_EBITDA_RIP],
      senzaLiteral: [],
      skills: ['qoe.normalization'],
      minKeystrokes: 6,
    });

    const giudizi: Task[] = voci.map((v, i) => ({
      id: `V${i + 1}`,
      prompt: tx('M2-12-QOECOMPLETA.18', { p0: DATA_START + i, p1: DATA_START + i }),
      targetCell: `Model!B${DATA_START + i}`,
      check: [
        {
          kind: 'text' as const,
          expected: v.valida === 'SI' ? tx('common.tok.si') : tx('common.tok.no'),
          message:
            v.valida === 'SI'
              ? tx('M2-12-QOECOMPLETA.19')
              : tx('M2-12-QOECOMPLETA.20'),
        },
      ],
      skills: ['qoe.aggressive'],
      minKeystrokes: 3,
    }));

    const tasks = [...giudizi, t1, t2, t3];

    return {
      templateId: 'M2-12-QOECOMPLETA',
      seed: rng.seed,
      brief: [tx('M2-12-QOECOMPLETA.21', { p0: eur(ebitdaRiportato), p1: num(n) })].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, [tx('M2-12-QOECOMPLETA.22')], {
              style: STILE_TITOLO,
            }),
            riga(`A${ROW_SEZ1}`, [tx('M2-12-QOECOMPLETA.23')], { style: STILE_TITOLO }),
            colonna(`A${ROW_EBITDA}`, [tx('M2-12-QOECOMPLETA.24')], { style: STILE_ETICHETTA }),
            [{ ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, [tx('M2-12-QOECOMPLETA.25')], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, [tx('M2-12-QOECOMPLETA.34'), tx('M2-12-QOECOMPLETA.35'), tx('M2-12-QOECOMPLETA.26')], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            voci.map((_, i) => ({ ref: `B${DATA_START + i}`, content: null, locked: false })),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, [tx('M2-12-QOECOMPLETA.36')], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              [
                tx('M2-12-QOECOMPLETA.27'),
                tx('M2-12-QOECOMPLETA.28'),
                tx('M2-12-QOECOMPLETA.29'),
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: C_T1, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_T2, content: null, locked: false, style: STILE_TOTALE }],
            [{ ref: C_T3, content: null, locked: false, style: STILE_FORMULA_PCT }],
          ],
          { colWidths: { A: 500, B: 90, C: 150 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          tx('M2-12-QOECOMPLETA.30', { rifValida, DATA_END, rifRettifiche }),
          14,
          'T1',
        ),
        hint(
          'H2',
          tx('M2-12-QOECOMPLETA.31'),
          10,
          'T1',
        ),
        hint(
          'H3',
          tx('M2-12-QOECOMPLETA.32', { B_EBITDA_RIP, C_T1 }),
          8,
          'T2',
        ),
        hint(
          'H4',
          tx('M2-12-QOECOMPLETA.33', { C_T1, B_EBITDA_RIP, p2: pct(impattoPct) }),
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!B${DATA_START}`,
    };
  },
});
