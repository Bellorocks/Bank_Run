/**
 * M0-F · 09 — Funzioni data: EOMONTH, EDATE, YEARFRAC.
 *
 * QUESTA E' UNA FEATURE VERA del motore: EOMONTH/EDATE/YEARFRAC esistono in
 * HyperFormula, ma con un vincolo tecnico verificato empiricamente prima di
 * scrivere questo file (buildFromArray + calculateFormula): le date vanno
 * costruite con `DATE(anno,mese,giorno)` DENTRO la formula, mai con una
 * stringa letterale tipo "2026-03-15" — quella da' #VALUE!, perche' il parser
 * di date del motore non la interpreta come seriale. La cella di riferimento
 * qui e' quindi una FORMULA `=DATE(anno,mese,giorno)`, bloccata, non un
 * valore letterale: e' didatticamente piu' onesto (mostra come si costruisce
 * una data da pezzi separati) ed evita del tutto la trappola.
 *
 * SCELTA DI RANGE, non arbitraria: i giorni delle due date generate stanno
 * SEMPRE fra 1 e 28. Motivo verificato con un probe diretto sul motore:
 *  - EDATE su un giorno 29/30/31 puo' "traboccare" nel mese successivo se il
 *    mese di arrivo e' piu' corto (comportamento che Excel invece CAPPA
 *    all'ultimo giorno del mese di arrivo) — riprodurre quella regola in JS
 *    puro e' delicato e non e' il punto di questo livello;
 *  - YEARFRAC con base 0 (30/360 US) applica regole speciali quando un
 *    giorno e' 30 o 31. Confinando i giorni a 1-28 la formula NAIVE
 *    `((y2-y1)*360+(m2-m1)*30+(d2-d1))/360` coincide ESATTAMENTE con quella
 *    del motore — verificato: YEARFRAC(10/1/2026,10/7/2026) e la naive danno
 *    entrambe 0,5; YEARFRAC(5/3/2026,5/9/2027) e la naive danno entrambe 1,5.
 * Con giorni sempre 1-28 questi due casi limite non si presentano mai, e il
 * valore atteso calcolato in JS e' garantito identico a quello del motore.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_TITOLO,
} from '../../authoring';
import { DEFAULT_FORMATS } from '../../../engine/numberFormat';
import { MODEL_COLORS } from '../../../styles/palette';
import type { CellStyle } from '../../../engine/types';

const MS_PER_DAY = 86_400_000;

/**
 * Giorni dal 30/12/1899 (l'epoca di Excel). Irrilevante qui il bug del
 * bisestile 1900 fittizio: ogni data generata cade ben dopo il 1900.
 */
function serialeData(anno: number, mese: number, giorno: number): number {
  return Math.round((Date.UTC(anno, mese - 1, giorno) - Date.UTC(1899, 11, 30)) / MS_PER_DAY);
}

/** Aggiunge N mesi mantenendo lo stesso giorno: sicuro perche' il giorno e' sempre 1-28. */
function edateAtteso(anno: number, mese: number, giorno: number, mesiDelta: number): number {
  const meseIndice0 = mese - 1 + mesiDelta;
  return serialeData(anno + Math.floor(meseIndice0 / 12), (((meseIndice0 % 12) + 12) % 12) + 1, giorno);
}

/** Ultimo giorno del mese N mesi dopo: "giorno 0" del mese successivo = ultimo giorno del mese target. */
function eomonthAtteso(anno: number, mese: number, mesiDelta: number): number {
  const meseIndice0 = mese - 1 + mesiDelta;
  const annoTarget = anno + Math.floor(meseIndice0 / 12);
  const meseTarget0 = ((meseIndice0 % 12) + 12) % 12; // 0-based
  // Date.UTC(anno, meseTarget0+1, 0) e' il giorno 0 del mese successivo,
  // cioe' l'ultimo giorno del mese target — nessun overflow possibile.
  return Math.round((Date.UTC(annoTarget, meseTarget0 + 1, 0) - Date.UTC(1899, 11, 30)) / MS_PER_DAY);
}

/** YEARFRAC 30/360 US, valida SOLO per giorni 1-28 su entrambe le date (vedi commento in testa al file). */
function yearfracAtteso(a: { anno: number; mese: number; giorno: number }, b: { anno: number; mese: number; giorno: number }): number {
  return ((b.anno - a.anno) * 360 + (b.mese - a.mese) * 30 + (b.giorno - a.giorno)) / 360;
}

const STILE_INPUT_DATA: CellStyle = { fontColor: MODEL_COLORS.input, numFmt: DEFAULT_FORMATS.data };
const STILE_RISULTATO_DATA: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: DEFAULT_FORMATS.data };
// YEARFRAC restituisce una frazione (es. 1,5), non una data: formato numerico a 2 decimali,
// mai il formato data — altrimenti "1,5" verrebbe mostrato come un giorno di gennaio 1900.
const STILE_RISULTATO_NUM: CellStyle = { fontColor: MODEL_COLORS.formula, numFmt: '0.00' };

export default defineTemplate({
  id: 'M0F-09-FUNZIONIDATA',
  module: 'M0-F',
  title: 'Le date sono numeri, anche quando si spostano',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['xl.date-functions'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Giorno SEMPRE 1-28: e' la scelta che rende YEARFRAC ed EDATE calcolabili
    // in JS puro con la certezza di coincidere col motore vero (vedi commento in testa).
    const anno = r.int(2023, 2027);
    const mese = r.int(1, 12);
    const giorno = r.int(1, 28);

    const mesiEomonth = r.int(2, 7);
    const mesiEdate = r.int(1, 9);

    // Seconda data, per YEARFRAC: 6-18 mesi dopo la prima, giorno ancora 1-28.
    const mesiYearfracDelta = r.int(6, 18);
    const meseIdx0 = mese - 1 + mesiYearfracDelta;
    const annoFine = anno + Math.floor(meseIdx0 / 12);
    const meseFine = (((meseIdx0 % 12) + 12) % 12) + 1;
    const giornoFine = r.int(1, 28);

    const attesoEomonth = eomonthAtteso(anno, mese, mesiEomonth);
    const attesoEdate = edateAtteso(anno, mese, giorno, mesiEdate);
    const attesoYearfrac = yearfracAtteso(
      { anno, mese, giorno },
      { anno: annoFine, mese: meseFine, giorno: giornoFine },
    );

    const tasks = [
      {
        id: 'T1',
        prompt:
          "In B6 trova l'ultimo giorno del mese, " + mesiEomonth + " mesi dopo la data di riferimento " +
          "(B2): usa EOMONTH(data, mesi). Non ti serve sapere quanti giorni ha quel mese: e' esattamente " +
          "il problema che EOMONTH risolve da solo.",
        targetCell: 'Model!B6',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'mustUseFunction' as const, functions: ['EOMONTH'] },
          { kind: 'mustReference' as const, cells: ['B2'] },
          {
            kind: 'value' as const,
            expected: attesoEomonth,
            message:
              "Non torna l'ultimo giorno del mese. EOMONTH(B2," + mesiEomonth + ") deve puntare a B2, non a un numero riscritto a mano.",
          },
        ],
        skills: ['xl.date-functions'],
        minKeystrokes: 14,
      },
      {
        id: 'T2',
        prompt:
          'In B9 trova la data esatta, ' + mesiEdate + ' mesi dopo B2 (stesso giorno del mese, non ' +
          "l'ultimo): usa EDATE(data, mesi). E' la differenza con EOMONTH: EDATE conserva il giorno, " +
          "EOMONTH lo ignora e ti da' sempre il 30 o il 31 (o il 28/29 di febbraio).",
        targetCell: 'Model!B9',
        check: [
          { kind: 'mustBeFormula' as const },
          { kind: 'mustUseFunction' as const, functions: ['EDATE'] },
          { kind: 'mustReference' as const, cells: ['B2'] },
          {
            kind: 'value' as const,
            expected: attesoEdate,
            message:
              "Non torna la data. EDATE(B2," + mesiEdate + ") deve mantenere lo stesso giorno del mese di B2, spostato di " + mesiEdate + " mesi.",
          },
        ],
        skills: ['xl.date-functions'],
        minKeystrokes: 14,
      },
      (() => {
        const base = taskFormula({
          id: 'T3',
          prompt:
            'In B13 calcola la frazione di anno fra la data di riferimento (B2) e la seconda data (B12): ' +
            'YEARFRAC(inizio, fine). E cosi che si annualizza un periodo che non dura esattamente 12 mesi — ' +
            'utile ogni volta che serve calendarizzare un LTM o uno stub period.',
          target: 'Model!B13',
          atteso: attesoYearfrac,
          referenzia: ['B2', 'B12'],
          senzaLiteral: [],
          skills: ['xl.date-functions'],
          minKeystrokes: 16,
        });
        // taskFormula non prevede mustUseFunction: lo si aggiunge in coda, stesso
        // pattern di spread usato in m0f/06-formati-avanzati.ts per i check extra.
        return { ...base, check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['YEARFRAC'] }] };
      })(),
    ];

    return {
      templateId: 'M0F-09-FUNZIONIDATA',
      seed: rng.seed,
      brief: [
        '## Le date sono numeri, anche quando si spostano',
        '',
        "Lo sai gia': una data in Excel e' un numero, il conteggio dei giorni dal 1 gennaio 1900. Le tre",
        "funzioni di questo livello lavorano su quel numero, ma restituiscono ancora un numero-data,",
        "quindi vanno lette con lo stesso formato `gg/mm/aaaa` — il vestito cambia, il contenuto no.",
        '',
        '- **EOMONTH(data, mesi)** — l\'ultimo giorno del mese, N mesi dopo (o prima, con un numero',
        '  negativo). Non importa quanti giorni ha quel mese: EOMONTH lo sa gia\'.',
        '- **EDATE(data, mesi)** — la stessa identica data, N mesi dopo. Il giorno del mese non cambia,',
        '  solo il mese (e l\'eventuale anno).',
        '- **YEARFRAC(inizio, fine)** — la frazione di anno fra due date. Un periodo di 6 mesi da 0,5,',
        '  uno di 18 mesi da 1,5: e\' cosi\' che si annualizza un dato che copre un periodo non standard.',
        '',
        `La data di riferimento (B2) e' costruita con \`=DATE(${anno},${mese},${giorno})\`, non scritta a`,
        'mano: e\' la stessa cosa che fai tu quando componi una data da tre numeri separati invece di',
        'digitarla per intero.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Funzioni data'], { style: STILE_TITOLO }),
            blocco('A2', [['Data di riferimento']], { style: STILE_ETICHETTA }),
            blocco('B2', [[`=DATE(${anno},${mese},${giorno})`]], { style: STILE_INPUT_DATA }),

            blocco('A5', [[`Ultimo giorno del mese, ${mesiEomonth} mesi dopo`]], { style: STILE_ETICHETTA }),
            [{ ref: 'B6', content: null, locked: false, style: STILE_RISULTATO_DATA }],
            blocco('A8', [[`Stessa data, ${mesiEdate} mesi dopo`]], { style: STILE_ETICHETTA }),
            [{ ref: 'B9', content: null, locked: false, style: STILE_RISULTATO_DATA }],

            blocco('A11', [['Seconda data (per YEARFRAC)']], { style: STILE_ETICHETTA }),
            blocco('B12', [[`=DATE(${annoFine},${meseFine},${giornoFine})`]], { style: STILE_INPUT_DATA }),
            blocco('A13', [['Frazione di anno fra B2 e B12']], { style: STILE_ETICHETTA }),
            [{ ref: 'B13', content: null, locked: false, style: STILE_RISULTATO_NUM }],
          ],
          { colWidths: { A: 260, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', `EOMONTH(B2,${mesiEomonth}) in B6.`, 8, 'T1'),
        hint('H2', `EDATE(B2,${mesiEdate}) in B9.`, 8, 'T2'),
        hint('H3', 'YEARFRAC(B2,B12) in B13.', 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: 'Model!B6',
    };
  },
});
