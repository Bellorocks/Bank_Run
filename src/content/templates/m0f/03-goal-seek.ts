/**
 * M0-F · 03 — Risolvere all'indietro (Goal Seek, in attesa del motore).
 *
 * NOTA DI IMPLEMENTAZIONE: `GridSession` (src/game/session.ts) non ha nessun comando
 * di Ricerca obiettivo — ne' un dialogo "Imposta cella / A valore / Cambiando cella",
 * ne' un solver che ci lavori dietro. Verificato con grep prima di scrivere questo
 * file: la funzionalita' e' assente dal motore, non solo dall'interfaccia. Aggiungerla
 * era fuori dal perimetro di questo compito (avrebbe voluto dire un solver dentro
 * `session.ts`, assegnato altrove).
 *
 * Il livello insegna quindi il CONCETTO — dato un risultato desiderato, trovare
 * l'input che lo produce — con lo strumento che il giocatore ha gia' in mano:
 * l'algebra. La relazione fra prezzo e margine e' lineare (margine = (prezzo-costo)/
 * prezzo), quindi si risolve isolando il prezzo in un passaggio, invece di iterare
 * come farebbe un solver. Il brief spiega cosa farebbe Ricerca obiettivo vero e
 * perche' qui conviene la scorciatoia algebrica. Quando il motore avra' un comando
 * di goal seek vero, questo e' il livello naturale da riscrivere per usarlo davvero:
 * pattern preso da `m0b/06-named-ranges.ts`, che affronta lo stesso tipo di lacuna.
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
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_FORMULA_PCT,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';

/** Il prezzo risolto: due decimali, colore da formula. Non c'e' un formato standard pronto in authoring.ts. */
const STILE_FORMULA_PREZZO: CellStyle = {
  fontColor: MODEL_COLORS.formula,
  numFmt: '#,##0.00',
};

const CANALI = ['Canale retail', 'Canale grande distribuzione', 'Canale export'] as const;

export default defineTemplate({
  id: 'M0F-03-GOALSEEK',
  module: 'M0-F',
  title: "Risolvere all'indietro",
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 360,
  skills: ['xl.goal-seek', 'xl.fill', 'xl.row-consistency'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const costi = CANALI.map(() => roundTo(triangular(r, 15, 45, 150), 1));
    const margini = CANALI.map(() => roundTo(triangular(r, 0.12, 0.22, 0.38), 0.001));
    // Stessa aritmetica che scrivera' il giocatore: prezzo = costo / (1 - margine).
    const prezzi = costi.map((c, i) => c / (1 - margini[i]));

    const RIGA_HEADER = 3;
    const RIGA_PRIMO = 4;
    const RIGA_ULTIMO = RIGA_PRIMO + CANALI.length - 1; // 6

    const rangePrezzo = `Model!D${RIGA_PRIMO}:D${RIGA_ULTIMO}`;
    const rangeVerifica = `Model!E${RIGA_PRIMO}:E${RIGA_ULTIMO}`;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          `In D${RIGA_PRIMO} trova il prezzo di vendita per il primo canale (${CANALI[0]}) che realizza ` +
          `esattamente il margine obiettivo scritto in C${RIGA_PRIMO}, partendo dal costo unitario in B${RIGA_PRIMO}. ` +
          "Non tentare numeri a caso: usa l'equazione risolta nel testo, prezzo = costo / (1 - margine).",
        target: `Model!D${RIGA_PRIMO}`,
        atteso: prezzi[0],
        referenzia: [`B${RIGA_PRIMO}`, `C${RIGA_PRIMO}`],
        senzaLiteral: [1],
        skills: ['xl.goal-seek'],
        minKeystrokes: 12,
      }),
      {
        id: 'T2',
        prompt:
          `Riempi D${RIGA_PRIMO}:D${RIGA_ULTIMO} copiando quella stessa formula sugli altri due canali: ` +
          "ogni riga guarda solo il proprio costo e il proprio margine obiettivo, nessun ritocco a mano.",
        targetCell: rangePrezzo,
        check: [
          { kind: 'consistentRow' as const, range: rangePrezzo },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
      taskFormula({
        id: 'T3',
        prompt:
          `In E${RIGA_PRIMO} verifica il prezzo appena trovato: ricalcola il margine che produce davvero, ` +
          `(prezzo meno costo) diviso prezzo. Se l'algebra e' giusta deve tornare identico al margine ` +
          `obiettivo in C${RIGA_PRIMO} — e' esattamente cio' che il campo "Imposta cella" di Ricerca ` +
          'obiettivo controllerebbe da solo, se il gioco lo avesse gia\' implementato.',
        target: `Model!E${RIGA_PRIMO}`,
        atteso: margini[0],
        referenzia: [`D${RIGA_PRIMO}`, `B${RIGA_PRIMO}`],
        senzaLiteral: [],
        skills: ['xl.goal-seek'],
        minKeystrokes: 10,
      }),
      {
        id: 'T4',
        prompt: `Riempi anche E${RIGA_PRIMO}:E${RIGA_ULTIMO} allo stesso modo.`,
        targetCell: rangeVerifica,
        check: [
          { kind: 'consistentRow' as const, range: rangeVerifica },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
    ];

    const elencoCanali = CANALI.map(
      (nome, i) => `- **${nome}**: costo unitario ${eur(costi[i])}, margine obiettivo ${pct(margini[i])}`,
    ).join('\n');

    return {
      templateId: 'M0F-03-GOALSEEK',
      seed: rng.seed,
      brief: [
        "## Risolvere all'indietro",
        '',
        'Di solito una formula parte dagli input e arriva a un risultato. Qui il problema e\' al',
        "contrario: conosci il risultato che vuoi — un margine lordo preciso — e devi trovare",
        "l'input — il prezzo — che lo produce.",
        '',
        "In Excel vero esiste uno strumento pensato apposta per questo: **Ricerca obiettivo**",
        '(Goal Seek), sotto **Dati > Analisi di simulazione > Ricerca obiettivo**. Si compilano tre',
        'campi — **Imposta cella** (la formula che vuoi portare a un certo valore), **A valore**',
        '(il numero che vuoi vedere li\'), **Cambiando cella** (l\'unica cella che Excel puo\' muovere',
        "per arrivarci) — ed Excel prova prezzi diversi finche' il margine calcolato non torna",
        'quello richiesto.',
        '',
        "*(Questo trainer non genera ancora l'interfaccia di Ricerca obiettivo: e' una funzionalita'",
        "del motore di gioco non ancora implementata. Il concetto si allena comunque, e qui e'",
        "persino piu' rapido farlo a mano — la relazione fra prezzo e margine e' lineare, quindi",
        "due righe di algebra bastano dove un solver dovrebbe iterare.)*",
        '',
        "## L'algebra",
        '',
        'Il margine lordo si definisce cosi\': `margine = (prezzo - costo) / prezzo`. Vuoi il prezzo',
        'che porta quel margine a un obiettivo M, conoscendo il costo C. Risolvi per il prezzo:',
        '',
        '`M = (P - C) / P`  →  `M·P = P - C`  →  `C = P - M·P = P·(1 - M)`  →  `P = C / (1 - M)`',
        '',
        "Questa e' la formula che scriverai: non un numero trovato per tentativi, un'equazione",
        "risolta una volta sola, valida per qualunque costo e qualunque margine obiettivo.",
        '',
        '## Il caso',
        '',
        'Il CFO del target ha fissato margini obiettivo diversi per i tre canali di vendita, e ti',
        "ha dato il costo unitario di produzione di ciascuno. Devi ricostruire il listino: il",
        'prezzo che, applicato a quel costo, realizza esattamente il margine richiesto.',
        '',
        elencoCanali,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ["Listino obiettivo: il prezzo che manca"], { style: STILE_TITOLO }),
            riga(
              `A${RIGA_HEADER}`,
              ['Canale', 'Costo unitario (€)', 'Margine obiettivo', 'Prezzo di vendita', 'Margine realizzato'],
              { style: STILE_TITOLO },
            ),
            colonna(`A${RIGA_PRIMO}`, [...CANALI], { style: STILE_ETICHETTA }),
            colonna(`B${RIGA_PRIMO}`, costi, { style: STILE_INPUT }),
            colonna(`C${RIGA_PRIMO}`, margini, { style: STILE_INPUT_PCT }),
            CANALI.map((_, i) => ({
              ref: `D${RIGA_PRIMO + i}`,
              content: null,
              locked: false,
              style: STILE_FORMULA_PREZZO,
            })),
            CANALI.map((_, i) => ({
              ref: `E${RIGA_PRIMO + i}`,
              content: null,
              locked: false,
              style: STILE_FORMULA_PCT,
            })),
          ],
          {
            colWidths: { A: 220, B: 150, C: 150, D: 150, E: 160 },
            frozenRows: RIGA_HEADER,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `Margine = (prezzo - costo) / prezzo. Isola il prezzo: prezzo = costo / (1 - margine). In D${RIGA_PRIMO} scrivi =B${RIGA_PRIMO}/(1-C${RIGA_PRIMO}).`,
          12,
          'T1',
        ),
        hint('H2', `Copia D${RIGA_PRIMO}, seleziona ${rangePrezzo.replace('Model!', '')}, incolla (o Ctrl+D).`, 8, 'T2'),
        hint(
          'H3',
          `In E${RIGA_PRIMO} scrivi =(D${RIGA_PRIMO}-B${RIGA_PRIMO})/D${RIGA_PRIMO}: deve tornare identico a C${RIGA_PRIMO}.`,
          10,
          'T3',
        ),
        hint('H4', `Copia E${RIGA_PRIMO}, seleziona ${rangeVerifica.replace('Model!', '')}, incolla (o Ctrl+D).`, 8, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!D${RIGA_PRIMO}`,
    };
  },
});
