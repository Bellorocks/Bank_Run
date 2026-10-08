/**
 * M0-F · 02 — La matrice a due variabili (Data Table 2 vie, in attesa del motore).
 *
 * NOTA DI IMPLEMENTAZIONE, stesso limite di M0B-06-NAMEDRANGES: HyperFormula non
 * espone la Data Table di Excel (ne' a una ne' a due vie — vedi `GridSession` in
 * `src/game/session.ts`, nessun comando la implementa), quindi non esiste un modo
 * per registrare "cella di input riga" / "cella di input colonna" ne' un `Check`
 * che le verifichi. Il livello insegna il CONCETTO con gli strumenti che il
 * motore ha davvero: una matrice di formule esplicite, una per cella, con lo
 * stesso ancoraggio misto di M0A-05-ANCORAGGI (il prerequisito) esteso a due
 * dimensioni invece che a una riga sola. Il brief spiega cosa farebbe la vera
 * Data Table 2 vie e perche' il risultato — a schermo — e' identico.
 *
 * Perche' proprio WACC × g: e' la sensitivity table che chiude ogni DCF vero
 * (anticipa M7, skill `dcf.sensitivity`), il primo posto dove un IC vero smette
 * di fidarsi di un solo numero. Qui il "valore implicito" e' la perpetuita' di
 * Gordon semplificata, V = FCF×(1+g)/(WACC−g): basta a mostrare la stessa cosa
 * che mostrerebbe un DCF completo, senza costruire lo stack di sconto (fuori
 * scope per M0-F, arriva in M7).
 *
 * Geometria fissa, nessuno shuffle: righe (WACC) e colonne (g) sono sempre
 * ordinate crescenti dalla stessa posizione, quindi gli indirizzi letterali
 * usati nei task (C6, G10, E8...) sono legittimi — non dipendono dal seed,
 * cambiano solo i NUMERI dentro le celle. Non c'e' inserimento/eliminazione di
 * righe o colonne: i due bug noti del progetto non si applicano qui.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';
import type { Task } from '../../types';

/** Assunzione unica in valuta: bordo tutto intorno, come la casella-nome di M0B-06. */
const STILE_ASSUNZIONE_EUR: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '#,##0" €"',
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

/** WACC e g: percentuale a due decimali — la griglia si muove a passi di 25/50 bps. */
const STILE_ASSUNZIONE_PCT: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '0.00%',
};

const N = 5;
const WACC_STEP = 0.005; // 50 bps fra una riga e la successiva
const G_STEP = 0.0025; // 25 bps fra una colonna e la successiva

export default defineTemplate({
  id: 'M0F-02-DATATABLE2',
  module: 'M0-F',
  title: 'La matrice a due variabili',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 420,
  skills: ['xl.data-table', 'xl.anchoring', 'xl.row-consistency'],
  prerequisites: ['M0A-05-ANCORAGGI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const fcfTerminale = roundTo(triangular(r, 3_000_000, 6_000_000, 12_000_000), 100_000);
    const waccBase = roundTo(triangular(r, 0.085, 0.10, 0.125), 0.0025);
    const gBase = roundTo(triangular(r, 0.018, 0.024, 0.032), 0.0025);

    // Righe: WACC crescente dall'alto in basso. Colonne: g crescente da sinistra a destra.
    const waccValues = Array.from({ length: N }, (_, i) => roundTo(waccBase + (i - 2) * WACC_STEP, 0.0001));
    const gValues = Array.from({ length: N }, (_, j) => roundTo(gBase + (j - 2) * G_STEP, 0.0001));

    // Garanzia di sicurezza: il denominatore WACC−g deve restare positivo su
    // TUTTA la griglia, angolo peggiore incluso (WACC minimo, g massimo). I range
    // dei due triangular sopra lo garantiscono per costruzione (margine minimo
    // ~3,8 punti percentuali), ma un assert costa nulla e documenta l'invariante.
    const minDenom = waccValues[0] - gValues[N - 1];
    if (minDenom < 0.02) {
      throw new Error(`M0F-02-DATATABLE2: denominatore troppo vicino a zero (${minDenom})`);
    }

    const valoreAt = (i: number, j: number): number =>
      (fcfTerminale * (1 + gValues[j])) / (waccValues[i] - gValues[j]);

    const colLettera = (j: number): string => String.fromCharCode(67 + j); // C, D, E, F, G
    const rigaMatrice = (i: number): number => 6 + i; // 6..10

    const CASO_BASE_I = 2;
    const CASO_BASE_J = 2;
    const cellaCasoBase = `${colLettera(CASO_BASE_J)}${rigaMatrice(CASO_BASE_I)}`; // E8

    const primaCella = `C${rigaMatrice(0)}`; // C6
    const ultimaCella = `${colLettera(N - 1)}${rigaMatrice(N - 1)}`; // G10
    const rangeMatrice = `Model!C${rigaMatrice(0)}:${colLettera(N - 1)}${rigaMatrice(N - 1)}`;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${primaCella} costruisci il valore implicito per la prima combinazione della griglia: ` +
        `FCF terminale per (1 + g), diviso (WACC − g). Il FCF sta nella casella riquadrata in C2 — ` +
        'non e\' una cella come le altre: e\' l\'unico numero che OGNI cella della matrice deve guardare, ' +
        'quindi va bloccato su riga e colonna con $. Il WACC di questa riga sta in B6, il g di questa ' +
        'colonna in C5: scrivi la formula in modo che tu possa copiarla su tutta la griglia C6:G10 senza ' +
        'toccarla mai piu\'.',
      target: `Model!${primaCella}`,
      atteso: valoreAt(0, 0),
      referenzia: ['C2', 'B6', 'C5'],
      ancoraggio: '$C$2',
      senzaLiteral: [1],
      skills: ['xl.data-table', 'xl.anchoring'],
      minKeystrokes: 24,
    });

    const t2: Task = {
      id: 'T2',
      prompt:
        `Riempi tutta la matrice ${rangeMatrice.replace('Model!', '')} copiando quella formula in ogni ` +
        'direzione. Stessa formula, stessi tre ancoraggi, nessun ritocco cella per cella: e\' cosi\' che ' +
        'una vera Data Table 2 vie si comporterebbe da sola, e qui la ricostruisci a mano.',
      targetCell: rangeMatrice,
      check: [
        { kind: 'consistentRow' as const, range: rangeMatrice },
        { kind: 'noError' as const },
      ],
      skills: ['xl.row-consistency'],
      minKeystrokes: 10,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        `Controlla ${ultimaCella}, l'angolo in basso a destra: WACC piu' alto, g piu' alto. Se un ` +
        'ancoraggio e\' sbagliato e\' li\' che smette di nascondersi — al centro della griglia un errore ' +
        'produce spesso un numero plausibile ma falso, agli estremi no.',
      targetCell: `Model!${ultimaCella}`,
      check: [
        { kind: 'mustBeFormula' as const },
        {
          kind: 'value' as const,
          expected: valoreAt(N - 1, N - 1),
          message:
            'L\'angolo in basso a destra non torna: e\' li\' che un $ dimenticato o messo nel posto ' +
            'sbagliato si vede. Al centro della matrice lo stesso errore puo\' produrre un numero che ' +
            'sembra credibile.',
        },
      ],
      skills: ['xl.anchoring'],
      minKeystrokes: 0,
    };

    const t4 = taskFormula({
      id: 'T4',
      prompt:
        `In C12 riporta il valore del caso base — WACC ${pct(waccValues[CASO_BASE_I], 2)}, ` +
        `g ${pct(gValues[CASO_BASE_J], 2)} — leggendolo dalla matrice appena costruita, con un semplice ` +
        `riferimento a ${cellaCasoBase}. Non ricalcolarlo: e\' esattamente cosi\' che si legge l'incrocio ` +
        'di una vera Data Table 2 vie in un comitato — si punta il dito sulla cella, non si riscrive la formula.',
      target: 'Model!C12',
      atteso: valoreAt(CASO_BASE_I, CASO_BASE_J),
      referenzia: [cellaCasoBase],
      senzaLiteral: [],
      skills: ['xl.data-table'],
      minKeystrokes: 6,
    });

    const tasks: Task[] = [t1, t2, t3, t4];

    const areaMatrice: string[] = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        areaMatrice.push(`${colLettera(j)}${rigaMatrice(i)}`);
      }
    }

    return {
      templateId: 'M0F-02-DATATABLE2',
      seed: rng.seed,
      brief: [
        '## Una griglia di what-if, non un solo numero',
        '',
        'In Excel vero esiste **Dati > Analisi di simulazione > Tabella dati**, la versione a due',
        'variabili: scrivi UNA formula nell\'angolo in alto a sinistra di una griglia vuota, elenchi',
        'i valori di un primo parametro lungo la riga sopra e di un secondo lungo la colonna a',
        'sinistra, dichiari a Excel quali sono le due "celle di input" (una per la riga, una per la',
        'colonna) — ed Excel calcola da solo ogni incrocio, sostituendo quei due valori nella formula',
        'e incollando il risultato in ogni cella della griglia con una formula-matrice `{=TABLE(...)}`.',
        'Cambi un\'assunzione a monte, tutta la griglia si ricalcola insieme, senza che tu tocchi una',
        'sola cella della matrice.',
        '',
        '*(Questo trainer non genera ancora la Data Table vera dentro il foglio — e\' un lavoro futuro',
        'sul motore di gioco, la stessa nota gia\' vista per i named range. L\'esercizio comunque allena',
        'esattamente la disciplina che la farebbe funzionare: una formula sola, con tre ancoraggi',
        'diversi, copiata su tutta la griglia — la stessa idea di M0A-05-ANCORAGGI, ma ora in due',
        'direzioni insieme invece che in una riga sola.)*',
        '',
        '## Il caso',
        '',
        `Il target genera un FCF normalizzato dell'ultimo anno esplicito di **${eur(fcfTerminale)}**.`,
        'Prima di portarlo in comitato, il desk vuole vedere quanto e\' sensibile il valore implicito a',
        'due assunzioni che nessuno conosce con certezza: il **WACC** (il costo del capitale usato per',
        'scontare) e il **g** (la crescita perpetua oltre l\'orizzonte esplicito). E\' esattamente la',
        'tabella WACC × g che chiude ogni DCF vero — la rivedrai, costruita per intero, in un modulo',
        'piu\' avanti.',
        '',
        `Il valore implicito per ogni combinazione e\' la perpetuita' di Gordon: **FCF × (1 + g) /`,
        '(WACC − g)**. La regola che tiene in piedi la formula: **WACC deve sempre restare maggiore di',
        'g**, altrimenti il denominatore si azzera o diventa negativo e il numero smette di avere',
        'senso — guardando la griglia, nota comunque quanto il valore SALE in fretta quando WACC si',
        'avvicina a g: e\' il motivo per cui nessun DCF vero si fida di un unico punto.',
        '',
        `WACC va da ${pct(waccValues[0], 2)} a ${pct(waccValues[N - 1], 2)} a passi di 50 punti base,`,
        `lungo le righe. g va da ${pct(gValues[0], 2)} a ${pct(gValues[N - 1], 2)} a passi di 25 punti`,
        'base, lungo le colonne. Il FCF sta in una casella sola, riquadrata: e\' il numero che ogni',
        'cella della matrice deve guardare, mai un altro punto del foglio.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Sensitivity WACC × g — valore implicito'], { style: STILE_TITOLO }),
            colonna('A2', ['FCF terminale normalizzato'], { style: STILE_ETICHETTA }),
            [{ ref: 'C2', content: fcfTerminale, style: STILE_ASSUNZIONE_EUR, locked: true }],

            riga('A5', ['WACC ↓  \\  g →'], { style: STILE_ETICHETTA }),
            riga('C5', gValues, { style: STILE_ASSUNZIONE_PCT }),
            colonna('B6', waccValues, { style: STILE_ASSUNZIONE_PCT }),

            colonna('A12', ['Valore del caso base'], { style: STILE_ETICHETTA }),

            areaLibera([...areaMatrice, 'C12']),
          ],
          {
            colWidths: { A: 210, B: 90, C: 120, D: 120, E: 120, F: 120, G: 120 },
            frozenRows: 5,
            frozenCols: 2,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `Scrivi =$C$2*(1+C5)/(B6-C5), poi torna su ciascun riferimento con F2 e F4: C2 fisso su ` +
            'riga e colonna, B6 fisso solo sulla colonna (deve scendere ma non scivolare a destra), ' +
            'C5 fisso solo sulla riga (deve scorrere a destra ma non scendere).',
          15,
          'T1',
        ),
        hint('H2', `Copia ${primaCella}, seleziona ${rangeMatrice.replace('Model!', '')}, incolla (o Ctrl+D poi Ctrl+R).`, 10, 'T2'),
        hint(
          'H3',
          'Se WACC scivola a destra invece di scendere, o g scende invece di scorrere a destra, i ' +
            'numeri agli estremi della griglia esplodono o si azzerano in modo evidente.',
          10,
          'T3',
        ),
        hint('H4', `=${cellaCasoBase}, e basta: nessun ricalcolo, solo il riferimento alla cella giusta.`, 6, 'T4'),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${primaCella}`,
    };
  },
});
