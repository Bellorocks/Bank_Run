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

// Rettifiche POSITIVE (costi one-off/fuori mercato gia' dentro l'EBITDA
// riportato: lo hanno sgonfiato, si RIAGGIUNGONO) — mix di poste infragruppo
// e one-off, per sintetizzare entrambe le famiglie del modulo.
const CATEGORIE_POSITIVE = [
  "Compenso amministratore fuori mercato: sovra-compenso pagato al socio rispetto al benchmark di un manager esterno equivalente",
  "Canone di affitto infragruppo pagato alla societa' immobiliare della proprieta', sopra il canone di mercato per un immobile equivalente",
  "Spese personali del socio (auto a uso privato, viaggi non di lavoro) contabilizzate impropriamente come costi aziendali",
  "Spese legali straordinarie per una causa con un ex-fornitore, transazione una tantum gia' liquidata",
  "Costi di ristrutturazione organizzativa, piano una tantum gia' completato nell'anno",
  "Minusvalenza da cessione di un cespite, perdita one-off gia' inclusa nell'EBITDA riportato",
] as const;

// Rettifiche NEGATIVE (proventi one-off, o costi nascosti da una
// capitalizzazione impropria, gia' dentro l'EBITDA riportato: lo hanno
// gonfiato, si TOLGONO).
const CATEGORIE_NEGATIVE = [
  "Plusvalenza da cessione di un cespite, guadagno one-off gia' incluso nell'EBITDA riportato",
  "Utile su cambi non ricorrente, incluso nel costo delle materie prime invece che nella gestione finanziaria",
  "Contributo pubblico una tantum, incassato nell'anno e contabilizzato come provento operativo",
  "Quota di costi di sviluppo impropriamente capitalizzata, avrebbe dovuto interamente pesare a Conto Economico",
] as const;

// Proposte AGGRESSIVE: suonano plausibili ma nessun documento le sostiene —
// Valida = "NO", esattamente lo spirito di M2-11.
const CATEGORIE_AGGRESSIVE = [
  "Sinergie di procurement stimate dal management, non ancora realizzate",
  "Risparmio atteso da un piano di efficientamento approvato dal CdA il mese scorso, non ancora avviato",
  "Mancato guadagno stimato per un contratto che il management ritiene \"avrebbe dovuto vincere\"",
] as const;

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
  title: 'QoE completa: dal bilancio sporco a un EBITDA adjusted difendibile',
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

    const descrizioniPositive = rVoci.shuffle([...CATEGORIE_POSITIVE]).slice(0, kPositive);
    const descrizioniNegative = rVoci.shuffle([...CATEGORIE_NEGATIVE]).slice(0, kNegative);
    const descrizioneAggressiva = rVoci.pick([...CATEGORIE_AGGRESSIVE]);

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
          `In ${C_T1} il totale delle sole rettifiche che hai giudicato valide, ciascuna col segno che ` +
          'porta gia\' in colonna C, con una funzione che sommi solo le righe "SI".',
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
        `In ${C_T2} calcola l'EBITDA normalizzato: l'EBITDA riportato (${B_EBITDA_RIP}) piu' il totale ` +
        `delle rettifiche legittime appena isolato (${C_T1}). ${C_T1} porta gia' il segno netto corretto — ` +
        'qui e\' comunque una somma, positive e negative sono gia\' incorporate nel totale.',
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
        `In ${C_T3} calcola l'impatto percentuale delle rettifiche sull'EBITDA riportato: il totale delle ` +
        `rettifiche legittime (${C_T1}) diviso per l'EBITDA riportato (${B_EBITDA_RIP}). E' lo stesso ` +
        "rapporto che hai calcolato in apertura di modulo (M2-01): non basta guardare le rettifiche in " +
        "valore assoluto, un compratore le giudica sempre in proporzione all'EBITDA di partenza.",
      target: `Model!${C_T3}`,
      atteso: impattoPct,
      referenzia: [C_T1, B_EBITDA_RIP],
      senzaLiteral: [],
      skills: ['qoe.normalization'],
      minKeystrokes: 6,
    });

    const giudizi: Task[] = voci.map((v, i) => ({
      id: `V${i + 1}`,
      prompt: `B${DATA_START + i}: la rettifica in A${DATA_START + i} e' documentabile e quindi accettabile? Scrivi SI o NO.`,
      targetCell: `Model!B${DATA_START + i}`,
      check: [
        {
          kind: 'text' as const,
          expected: v.valida,
          message:
            v.valida === 'SI'
              ? "Questa rettifica corrisponde a un fatto documentato: va accettata, col suo segno."
              : 'Questa proposta del management non ha fattura, verbale o contratto a supporto.',
        },
      ],
      skills: ['qoe.aggressive'],
      minKeystrokes: 3,
    }));

    const tasks = [...giudizi, t1, t2, t3];

    return {
      templateId: 'M2-12-QOECOMPLETA',
      seed: rng.seed,
      brief: [
        '## Lo schedule delle rettifiche: sintesi del modulo',
        '',
        "Hai visto, un caso alla volta, come poste infragruppo (compenso amministratore, affitti, costi " +
          "personali del socio), one-off (spese legali, ristrutturazioni, plus/minusvalenze, effetti " +
          "cambio, capitalizzazione impropria) e proposte aggressive del management rettificano l'EBITDA " +
          "riportato. In un vero QoE queste categorie non arrivano una alla volta: arrivano tutte insieme, " +
          "in un unico SCHEDULE misto che devi imparare a leggere riga per riga, senza perdere la disciplina " +
          'del segno vista finora:',
        '',
        '> **EBITDA normalizzato = EBITDA riportato + Σ rettifiche**',
        '',
        "- un **costo** one-off o fuori mercato che ha gonfiato i costi (sgonfiato l'EBITDA riportato) si " +
          'RIAGGIUNGE: rettifica **positiva**.',
        "- un **ricavo/provento** one-off, o un costo nascosto da una capitalizzazione impropria, che ha " +
          'gonfiato l\'EBITDA riportato si TOGLIE: rettifica **negativa**.',
        '',
        `L'EBITDA riportato di quest'anno e' ${eur(ebitdaRiportato)}. Qui sotto trovi ${num(n)} proposte di ` +
          'rettifica, ciascuna con un importo GIA\' scritto col segno corretto per la sua categoria. Una di ' +
          "queste e' una proposta del management senza documenti a supporto: per ogni riga decidi tu, nella " +
          'colonna Valida, se e\' accettabile ("SI") o no ("NO").',
        '',
        "Poi guarda il risultato in proporzione: oltre il 15-20% dell'EBITDA riportato un buyer comincia a " +
          'insospettirsi, anche se ogni voce e\' documentata, e mettera\' sotto torchio il multiplo.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, ['QoE completa: dal bilancio sporco a un EBITDA adjusted difendibile'], {
              style: STILE_TITOLO,
            }),
            riga(`A${ROW_SEZ1}`, ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(`A${ROW_EBITDA}`, ['EBITDA riportato (da bilancio), €'], { style: STILE_ETICHETTA }),
            [{ ref: B_EBITDA_RIP, content: ebitdaRiportato, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, ['Schedule delle rettifiche proposte — elenco completo'], { style: STILE_TITOLO }),
            riga(`A${ROW_HEADER}`, ['Voce', 'Valida', 'Rettifica (€, con segno)'], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, voci.map((v) => v.descrizione), { style: STILE_ETICHETTA }),
            voci.map((_, i) => ({ ref: `B${DATA_START + i}`, content: null, locked: false })),
            colonna(`C${DATA_START}`, voci.map((v) => v.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, ['Normalizzazione'], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_T1}`,
              [
                'Totale rettifiche legittime, con segno (Valida = "SI"), €',
                'EBITDA normalizzato, €',
                "Impatto delle rettifiche sull'EBITDA riportato, %",
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
          `=SUMIF(${rifValida}:B${DATA_END},"SI",${rifRettifiche}:C${DATA_END}): somma solo gli importi ` +
            'delle righe con Valida uguale a "SI", con il segno che ciascuna gia\' porta.',
          14,
          'T1',
        ),
        hint(
          'H2',
          "Non serve ridecidere se una voce e' positiva o negativa: quella scelta e' gia' nella colonna " +
            "Rettifica. Il tuo lavoro qui e' isolare le righe documentate, non riclassificarle.",
          10,
          'T1',
        ),
        hint(
          'H3',
          `=${B_EBITDA_RIP}+${C_T1}: EBITDA riportato piu' il totale delle rettifiche legittime, che porta ` +
            "gia' il segno netto corretto.",
          8,
          'T2',
        ),
        hint(
          'H4',
          `=${C_T1}/${B_EBITDA_RIP}: il totale delle rettifiche legittime in proporzione all'EBITDA ` +
            `riportato (qui vale ${pct(impattoPct)}), non in valore assoluto.`,
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 110 }),
      startAt: `Model!B${DATA_START}`,
    };
  },
});
