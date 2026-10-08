/**
 * M1 · 04 — Fondi rischi e TFR: la schedule "a cascata" (rollforward).
 *
 * TFR e fondi rischi ed oneri non sono un numero, sono un movimento: saldo
 * iniziale + accantonamento dell'anno - utilizzi/erogazioni dell'anno = saldo
 * finale. E' lo schema a cascata (rollforward) che ricorrera' in tutto il
 * modello finanziario — qui lo vediamo per la prima volta sulla posta piu'
 * semplice possibile, con segno delicato: l'accantonamento AUMENTA il fondo
 * (si somma), l'utilizzo lo RIDUCE (si sottrae). E' un errore facile da
 * invertire, quindi il brief lo dice due volte con parole diverse.
 *
 * Due schedule paralleli, stessa struttura, dati indipendenti: TFR e Fondo
 * rischi ed oneri. Uso `rng.fork` separati per non correlare le due zone di
 * dati — cambiare la scala del fondo rischi non deve spostare di un euro il
 * TFR, e viceversa.
 *
 * Non e' un esercizio a se stante: queste sono le poste italiane che nel
 * bridge EV-equity (modulo M4) diventeranno "debt-like items" — un accenno
 * nel brief, senza approfondire: e' materia di un modulo successivo.
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
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';

export default defineTemplate({
  id: 'M1-04-FONDIRISCHI',
  module: 'M1',
  title: 'Fondi rischi e TFR: la schedule a cascata',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 220,
  skills: ['acc.provisions'],
  prerequisites: ['M1-01-SCHEMACEE'],

  generate: (rng) => {
    // --- TFR: due sotto-stream indipendenti, cosi' scalare l'uno non sposta l'altro.
    const rTfr = rng.fork('tfr');
    const tfrIniziale = roundTo(triangular(rTfr, 180_000, 320_000, 520_000), 1000);
    const tfrAccantonamento = roundTo(triangular(rTfr, 25_000, 42_000, 65_000), 500);
    const tfrUtilizzi = roundTo(triangular(rTfr, 10_000, 28_000, 55_000), 500);
    const tfrFinale = tfrIniziale + tfrAccantonamento - tfrUtilizzi;

    // --- Fondo rischi ed oneri: scala diversa apposta, per non sembrare un copia-incolla.
    const rFondo = rng.fork('fondo-rischi');
    const fondoIniziale = roundTo(triangular(rFondo, 40_000, 95_000, 210_000), 1000);
    const fondoAccantonamento = roundTo(triangular(rFondo, 8_000, 18_000, 35_000), 500);
    const fondoUtilizzi = roundTo(triangular(rFondo, 3_000, 12_000, 30_000), 500);
    const fondoFinale = fondoIniziale + fondoAccantonamento - fondoUtilizzi;

    // --- Geometria fissa: nessuna posizione dipende dal seed in questo livello.
    const TFR_TITLE_ROW = 3;
    const TFR_INIZ_ROW = 4;
    const TFR_ACC_ROW = 5;
    const TFR_UTIL_ROW = 6;
    const TFR_FIN_ROW = 7;

    const FONDO_TITLE_ROW = 10;
    const FONDO_INIZ_ROW = 11;
    const FONDO_ACC_ROW = 12;
    const FONDO_UTIL_ROW = 13;
    const FONDO_FIN_ROW = 14;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In B${TFR_FIN_ROW} calcola il "TFR finale": parti dal TFR iniziale (B${TFR_INIZ_ROW}), ` +
        `aggiungi l'accantonamento dell'anno (B${TFR_ACC_ROW}, aumenta il fondo) e sottrai gli ` +
        `utilizzi/anticipazioni erogate nell'anno (B${TFR_UTIL_ROW}, riducono il fondo perche' sono ` +
        "uscite gia' pagate ai dipendenti).",
      target: `Model!B${TFR_FIN_ROW}`,
      atteso: tfrFinale,
      referenzia: [`B${TFR_INIZ_ROW}`, `B${TFR_ACC_ROW}`, `B${TFR_UTIL_ROW}`],
      skills: ['acc.provisions'],
      minKeystrokes: 12,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In B${FONDO_FIN_ROW} calcola il "Fondo rischi ed oneri finale" con la stessa logica: saldo ` +
        `iniziale (B${FONDO_INIZ_ROW}) piu' accantonamento (B${FONDO_ACC_ROW}) meno utilizzi ` +
        `(B${FONDO_UTIL_ROW}). Anche qui l'utilizzo e' un'uscita: si sottrae, non si somma.`,
      target: `Model!B${FONDO_FIN_ROW}`,
      atteso: fondoFinale,
      referenzia: [`B${FONDO_INIZ_ROW}`, `B${FONDO_ACC_ROW}`, `B${FONDO_UTIL_ROW}`],
      skills: ['acc.provisions'],
      minKeystrokes: 12,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M1-04-FONDIRISCHI',
      seed: rng.seed,
      brief: [
        '## Il fondo non e\' un numero, e\' un movimento',
        '',
        "TFR e fondi rischi ed oneri si leggono in bilancio come un saldo unico, ma dietro c'e'",
        "sempre lo stesso schema \"a cascata\" (rollforward), lo stesso su cui costruirai ogni",
        "schedule di questo modulo:",
        '',
        '**saldo iniziale + accantonamento dell\'anno - utilizzi/erogazioni dell\'anno = saldo finale**',
        '',
        "L'accantonamento e' un costo dell'anno che **aumenta** il fondo — si somma. Gli utilizzi",
        "sono le somme gia' pagate (un'anticipazione di TFR erogata, un rischio che si e' manifestato",
        `ed e' stato liquidato) — sono un'uscita, e **riducono** il fondo: si sottraggono. Invertire`,
        "questo segno e' l'errore piu' facile da fare su questa posta, quindi rileggilo prima di",
        "scrivere la formula.",
        '',
        `Sotto trovi due schedule indipendenti, stessa struttura: il **TFR** (${eur(tfrIniziale)} di`,
        `saldo iniziale) e il **Fondo rischi ed oneri** (${eur(fondoIniziale)} di saldo iniziale).`,
        "Completa entrambi i saldi finali.",
        '',
        "Non e' un dettaglio da manuale: nel bridge tra valore d'impresa (EV) ed equity, TFR e fondi",
        "rischi sono fra le poste italiane che si trattano come debito (\"debt-like items\") — ma",
        "questo e' materia di un modulo piu' avanti. Qui basta la meccanica del rollforward.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Fondi rischi e TFR — movimentazione dell\'anno'], { style: STILE_TITOLO }),
            riga(`A${TFR_TITLE_ROW}`, ['TFR'], { style: STILE_TITOLO }),
            colonna(
              `A${TFR_INIZ_ROW}`,
              [
                'TFR iniziale',
                "Accantonamento dell'anno",
                'Utilizzi/anticipazioni erogate',
                'TFR finale',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: `B${TFR_INIZ_ROW}`, content: tfrIniziale, style: STILE_INPUT, locked: true },
              { ref: `B${TFR_ACC_ROW}`, content: tfrAccantonamento, style: STILE_INPUT, locked: true },
              { ref: `B${TFR_UTIL_ROW}`, content: tfrUtilizzi, style: STILE_INPUT, locked: true },
            ],
            [{ ref: `B${TFR_FIN_ROW}`, content: null, locked: false, style: STILE_TOTALE }],

            riga(`A${FONDO_TITLE_ROW}`, ['Fondo rischi ed oneri'], { style: STILE_TITOLO }),
            colonna(
              `A${FONDO_INIZ_ROW}`,
              [
                'Fondo iniziale',
                "Accantonamento dell'anno",
                'Utilizzi',
                'Fondo finale',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: `B${FONDO_INIZ_ROW}`, content: fondoIniziale, style: STILE_INPUT, locked: true },
              { ref: `B${FONDO_ACC_ROW}`, content: fondoAccantonamento, style: STILE_INPUT, locked: true },
              { ref: `B${FONDO_UTIL_ROW}`, content: fondoUtilizzi, style: STILE_INPUT, locked: true },
            ],
            [{ ref: `B${FONDO_FIN_ROW}`, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 300, B: 130 }, frozenRows: TFR_TITLE_ROW },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=B${TFR_INIZ_ROW}+B${TFR_ACC_ROW}-B${TFR_UTIL_ROW}: iniziale piu' accantonamento (aumenta), meno utilizzi (riduce).`,
          8,
          'T1',
        ),
        hint(
          'H2',
          `=B${FONDO_INIZ_ROW}+B${FONDO_ACC_ROW}-B${FONDO_UTIL_ROW}: stessa cascata del TFR, dati diversi.`,
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: `Model!B${TFR_FIN_ROW}`,
    };
  },
});
